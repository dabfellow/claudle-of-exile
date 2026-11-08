import { describe, expect, it } from 'vitest';
import { freshAccount } from '../src/engine/account';
import { newGame } from '../src/engine/state';
import type { AccountState } from '../src/engine/types';
import { CloudSaveStore, LocalSaveStore, moveCharacters, type CharacterRow, type CharacterTable } from '../src/platform/saves';

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

/** In-memory stand-in for the Supabase `characters` table; like the server, it stamps `updated_at` on every write. */
class MemoryTable implements CharacterTable {
  rows = new Map<string, CharacterRow>();
  down = false;
  /** the next write lands, but its reply never arrives */
  loseReply = false;
  upserts = 0;
  private n = 0;
  private check() {
    if (this.down) throw new Error('network down');
  }
  private write(row: CharacterRow): string {
    this.upserts++;
    const stamp = `v${++this.n}`;
    this.rows.set(row.id, { ...structuredClone(row), updated_at: stamp });
    if (this.loseReply) {
      this.loseReply = false;
      throw new Error('reply lost');
    }
    return stamp;
  }
  async list() {
    this.check();
    return [...this.rows.values()].map((r) => ({ id: r.id, summary: r.summary }));
  }
  async get(id: string) {
    this.check();
    const r = this.rows.get(id);
    return r ? { save: r.save, summary: r.summary, updated_at: r.updated_at } : null;
  }
  async head(id: string) {
    this.check();
    const r = this.rows.get(id);
    return r ? { stamp: r.updated_at!, summary: r.summary } : null;
  }
  async upsert(row: CharacterRow) {
    this.check();
    return this.write(row);
  }
  /** the version match never succeeds, as if the server compared stamps in another format */
  brokenMatch = false;
  async replace(row: CharacterRow, stamp: string) {
    this.check();
    if (this.brokenMatch || this.rows.get(row.id)?.updated_at !== stamp) return null;
    return this.write(row);
  }
  async remove(id: string) {
    this.check();
    this.rows.delete(id);
  }
}

const store = () => {
  const table = new MemoryTable();
  const cache = new LocalSaveStore(new MemoryStorage(), 'cloud-u1', false);
  return { table, cache, cloud: new CloudSaveStore(table, cache, 'u1') };
};

describe('cloud saves', () => {
  it('saves to the table and lists from it', async () => {
    const { table, cloud } = store();
    const s = newGame(1, { name: 'Ann', classId: 'mage' });
    await cloud.save(s);
    expect(table.rows.get(s.character.id)?.name).toBe('Ann');
    expect((await cloud.list()).map((c) => c.name)).toEqual(['Ann']);
    expect((await cloud.load(s.character.id))?.character.classId).toBe('mage');
    expect(cloud.status).toBe('synced');
  });

  it('keeps playing offline and pushes the newer local copy later', async () => {
    const { table, cloud } = store();
    const s = newGame(1, { name: 'Bo', classId: 'ranger' });
    await cloud.save(s);
    table.down = true;
    s.clock = 999;
    s.lastSaved += 10_000;
    await cloud.save(s);
    expect(cloud.status).toBe('offline');
    expect((await cloud.list()).map((c) => c.name)).toEqual(['Bo']);
    table.down = false;
    const loaded = await cloud.load(s.character.id);
    expect(loaded?.clock).toBe(999);
    await new Promise((r) => setTimeout(r, 0));
    expect((table.rows.get(s.character.id)?.save as { clock: number }).clock).toBe(999);
  });

  it('prefers the cloud copy when it is newer (played on another device)', async () => {
    const { table, cache, cloud } = store();
    const s = newGame(1, { name: 'Cy', classId: 'warrior' });
    await cloud.save(s);
    const other = structuredClone(s);
    other.clock = 5000;
    other.lastSaved += 60_000;
    const row = table.rows.get(s.character.id)!;
    row.save = JSON.parse(JSON.stringify(other));
    const loaded = await cloud.load(s.character.id);
    expect(loaded?.clock).toBe(5000);
    expect((await cache.load(s.character.id))?.clock).toBe(5000);
  });

  it('collapses overlapping saves into the latest one', async () => {
    const { table, cloud } = store();
    const s = newGame(1, { name: 'Di', classId: 'mage' });
    const a = cloud.save(s);
    s.clock = 1;
    void cloud.save(s);
    s.clock = 2;
    void cloud.save(s);
    await a;
    await new Promise((r) => setTimeout(r, 0));
    expect(table.upserts).toBe(2);
    expect((table.rows.get(s.character.id)?.save as { clock: number }).clock).toBe(2);
  });

  it('keeps the account in a reserved row that never shows up as a character', async () => {
    const { table, cloud } = store();
    await cloud.save(newGame(1, { name: 'Ann', classId: 'mage' }));
    const a = freshAccount();
    a.hideout.forge = 3;
    await cloud.saveAccount(a);
    expect(table.rows.size).toBe(2);
    expect((await cloud.list()).map((c) => c.name)).toEqual(['Ann']);
    expect((await cloud.loadAccount())?.hideout.forge).toBe(3);
  });

  it('takes the newer account from another device, keeping every unlock, and pushes a newer local one up', async () => {
    const { table, cache, cloud } = store();
    const a = freshAccount();
    a.rev = 1;
    await cloud.saveAccount(a);
    const row = [...table.rows.values()][0];
    const elsewhere = structuredClone(a);
    elsewhere.rev = 2;
    elsewhere.stash[0] = [];
    elsewhere.hideout.bench = 3;
    row.save = JSON.parse(JSON.stringify(elsewhere));
    a.hideout.forge = 4;
    await cache.saveAccount(a);
    const loaded = await cloud.loadAccount();
    expect(loaded?.rev).toBe(2);
    expect(loaded?.hideout).toMatchObject({ bench: 3, forge: 4 });

    table.down = true;
    loaded!.rev = 3;
    await cloud.saveAccount(loaded!);
    expect(cloud.status).toBe('offline');
    table.down = false;
    await cloud.loadAccount();
    await new Promise((r) => setTimeout(r, 0));
    expect(([...table.rows.values()][0].save as AccountState).rev).toBe(3);
  });

  it('still saves to the cloud when browser storage is full', async () => {
    const table = new MemoryTable();
    const storage = new MemoryStorage();
    const cache = new LocalSaveStore(storage, 'cloud-u1', false);
    const cloud = new CloudSaveStore(table, cache, 'u1');
    const s = newGame(1, { name: 'Fay', classId: 'mage' });
    await cloud.save(s);
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError');
    };
    s.clock = 777;
    s.lastSaved += 5_000;
    await expect(cloud.save(s)).resolves.toBeUndefined();
    expect((table.rows.get(s.character.id)?.save as { clock: number }).clock).toBe(777);
    expect(cloud.status).toBe('synced');
    const a = freshAccount();
    a.hideout.forge = 2;
    await cloud.saveAccount(a);
    expect([...table.rows.values()].some((r) => (r.save as AccountState).hideout?.forge === 2)).toBe(true);
  });

  it('a full browser storage rejects a local save instead of throwing', async () => {
    const storage = new MemoryStorage();
    const local = new LocalSaveStore(storage, 'guest-1', false);
    storage.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError');
    };
    let thrown = false;
    let p: Promise<void> | undefined;
    try {
      p = local.save(newGame(1, { name: 'Gil', classId: 'warrior' }));
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(false);
    await expect(p).rejects.toThrow();
    await expect(local.saveAccount(freshAccount())).rejects.toThrow();
  });

  describe('two devices', () => {
    const devices = async () => {
      const table = new MemoryTable();
      const device = () => {
        const cache = new LocalSaveStore(new MemoryStorage(), 'cloud-u1', false);
        return { cache, cloud: new CloudSaveStore(table, cache, 'u1') };
      };
      const a = device();
      const b = device();
      const s = newGame(1, { name: 'Hal', classId: 'ranger' });
      await a.cloud.save(s);
      return { table, a, b, id: s.character.id };
    };
    const clockIn = (table: MemoryTable, id: string) => (table.rows.get(id)?.save as { clock: number }).clock;

    it('a stale device cannot overwrite newer progress, even with a newer timestamp', async () => {
      const { table, a, b, id } = await devices();
      const onA = (await a.cloud.load(id))!;
      const onB = (await b.cloud.load(id))!;
      onB.clock = 7_200_000; // two hours played on B
      onB.lastSaved += 60_000;
      await b.cloud.save(onB);
      const refused: string[] = [];
      a.cloud.onConflict = (cid) => refused.push(cid);
      onA.clock = 1_000; // A wakes from the morning, stamped later than B
      onA.lastSaved += 120_000;
      await a.cloud.save(onA);
      expect(clockIn(table, id)).toBe(7_200_000);
      expect(a.cloud.status).toBe('offline');
      expect(refused).toEqual([id]);
      // later saves from that session stay refused
      onA.lastSaved += 1_000;
      await a.cloud.save(onA);
      expect(clockIn(table, id)).toBe(7_200_000);
    });

    it('reopening on the stale device takes the cloud copy and keeps its own as a backup', async () => {
      const { table, a, b, id } = await devices();
      const onA = (await a.cloud.load(id))!;
      const onB = (await b.cloud.load(id))!;
      onB.clock = 7_200_000;
      onB.lastSaved += 60_000;
      await b.cloud.save(onB);
      onA.clock = 1_000;
      onA.lastSaved += 120_000;
      await a.cloud.save(onA);
      const reopened = await a.cloud.load(id);
      expect(reopened?.clock).toBe(7_200_000);
      expect(JSON.parse(a.cache.conflictCopy(id)!).clock).toBe(1_000);
      // and A can save normally again from the copy it now holds
      reopened!.clock += 10;
      reopened!.lastSaved += 1_000;
      await a.cloud.save(reopened!);
      expect(clockIn(table, id)).toBe(7_200_010);
      expect(a.cloud.status).toBe('synced');
    });

    it('takes turns cleanly: each device picks up where the other left off', async () => {
      const { table, a, b, id } = await devices();
      const onB = (await b.cloud.load(id))!;
      onB.clock = 500;
      onB.lastSaved += 1_000;
      await b.cloud.save(onB);
      const onA = (await a.cloud.load(id))!;
      expect(onA.clock).toBe(500);
      onA.clock = 900;
      onA.lastSaved += 1_000;
      await a.cloud.save(onA);
      expect(clockIn(table, id)).toBe(900);
      expect((await b.cloud.load(id))?.clock).toBe(900);
    });

    it('does not write blind over a cloud copy it never loaded', async () => {
      const { table, b, id } = await devices();
      const stale = newGame(1, { id, name: 'Hal', classId: 'ranger' });
      stale.lastSaved = Date.now() + 1e9;
      await b.cloud.save(stale);
      expect(table.rows.get(id)?.save).not.toEqual(JSON.parse(JSON.stringify({ ...stale, account: undefined })));
      expect(b.cloud.status).toBe('offline');
    });

    it('keeps saving if the version match itself is broken', async () => {
      const { table, a, id } = await devices();
      const s = (await a.cloud.load(id))!;
      table.brokenMatch = true;
      s.clock = 30;
      s.lastSaved += 1_000;
      await a.cloud.save(s);
      expect(clockIn(table, id)).toBe(30);
      expect(a.cloud.status).toBe('synced');
    });

    it('a save whose reply was lost does not block the next one', async () => {
      const { table, a, id } = await devices();
      const s = (await a.cloud.load(id))!;
      s.clock = 10;
      s.lastSaved += 1_000;
      table.loseReply = true;
      await a.cloud.save(s);
      expect(a.cloud.status).toBe('offline');
      s.clock = 20;
      s.lastSaved += 1_000;
      await a.cloud.save(s);
      expect(clockIn(table, id)).toBe(20);
      expect(a.cloud.status).toBe('synced');
    });
  });

  it('moves guest characters onto an account, keeping names unique', async () => {
    const storage = new MemoryStorage();
    const guest = new LocalSaveStore(storage, 'guest-1', false);
    const { cloud } = store();
    await cloud.save(newGame(1, { name: 'Ann', classId: 'mage' }));
    await guest.save(newGame(2, { name: 'Ann', classId: 'warrior' }));
    await guest.save(newGame(3, { name: 'Rowan', classId: 'ranger' }));
    const moved = await moveCharacters(guest, cloud, ['Ann']);
    expect(moved).toBe(2);
    expect(await guest.list()).toHaveLength(0);
    expect((await cloud.list()).map((c) => c.name).sort()).toEqual(['Ann', 'Ann 2', 'Rowan']);
  });
});

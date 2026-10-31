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

/** In-memory stand-in for the Supabase `characters` table. */
class MemoryTable implements CharacterTable {
  rows = new Map<string, CharacterRow>();
  down = false;
  upserts = 0;
  private check() {
    if (this.down) throw new Error('network down');
  }
  async list() {
    this.check();
    return [...this.rows.values()].map((r) => ({ id: r.id, summary: r.summary }));
  }
  async get(id: string) {
    this.check();
    const r = this.rows.get(id);
    return r ? { save: r.save } : null;
  }
  async upsert(row: CharacterRow) {
    this.check();
    this.upserts++;
    this.rows.set(row.id, structuredClone(row));
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
    s.bank.gold = 999;
    s.lastSaved += 10_000;
    await cloud.save(s);
    expect(cloud.status).toBe('offline');
    expect((await cloud.list()).map((c) => c.name)).toEqual(['Bo']);
    table.down = false;
    const loaded = await cloud.load(s.character.id);
    expect(loaded?.bank.gold).toBe(999);
    await new Promise((r) => setTimeout(r, 0));
    expect((table.rows.get(s.character.id)?.save as { bank: { gold: number } }).bank.gold).toBe(999);
  });

  it('prefers the cloud copy when it is newer (played on another device)', async () => {
    const { table, cache, cloud } = store();
    const s = newGame(1, { name: 'Cy', classId: 'warrior' });
    await cloud.save(s);
    const other = structuredClone(s);
    other.bank.gold = 5000;
    other.lastSaved += 60_000;
    const row = table.rows.get(s.character.id)!;
    row.save = JSON.parse(JSON.stringify(other));
    const loaded = await cloud.load(s.character.id);
    expect(loaded?.bank.gold).toBe(5000);
    expect((await cache.load(s.character.id))?.bank.gold).toBe(5000);
  });

  it('collapses overlapping saves into the latest one', async () => {
    const { table, cloud } = store();
    const s = newGame(1, { name: 'Di', classId: 'mage' });
    const a = cloud.save(s);
    s.bank.gold = 1;
    void cloud.save(s);
    s.bank.gold = 2;
    void cloud.save(s);
    await a;
    await new Promise((r) => setTimeout(r, 0));
    expect(table.upserts).toBe(2);
    expect((table.rows.get(s.character.id)?.save as { bank: { gold: number } }).bank.gold).toBe(2);
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

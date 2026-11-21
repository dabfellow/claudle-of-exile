import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/platform/supabase', () => ({ getSupabase: () => null }));
import { makeCtx } from '../src/engine/context';
import { seeded } from '../src/engine/rng';
import { startSkillAction } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import type { GameState } from '../src/engine/types';
import { setMarketStandIn, type MarketApi } from '../src/platform/market';
import { CloudSaveStore, LocalSaveStore, MemorySaveStore, type CharacterRow, type CharacterTable, type SaveStore } from '../src/platform/saves';

/** The game store itself (not just the save stores under it): what the player's screen does when saving goes wrong. */

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

/** Stands in for the Supabase table: stamps a new version on every write, like the server. */
class MemoryTable implements CharacterTable {
  rows = new Map<string, CharacterRow>();
  private n = 0;
  private write(row: CharacterRow): string {
    const stamp = `v${++this.n}`;
    this.rows.set(row.id, { ...structuredClone(row), updated_at: stamp });
    return stamp;
  }
  /** another device saves the character */
  otherDeviceSaves(id: string) {
    const row = this.rows.get(id)!;
    this.write({ ...row, summary: { ...row.summary, savedBy: 'another-device' } });
  }
  async list() {
    return [...this.rows.values()].map((r) => ({ id: r.id, summary: r.summary }));
  }
  async get(id: string) {
    return this.rows.get(id) ?? null;
  }
  async head(id: string) {
    const r = this.rows.get(id);
    return r ? { stamp: r.updated_at!, summary: r.summary } : null;
  }
  async upsert(row: CharacterRow) {
    return this.write(row);
  }
  async replace(row: CharacterRow, stamp: string) {
    return this.rows.get(row.id)?.updated_at === stamp ? this.write(row) : null;
  }
  async remove(id: string) {
    this.rows.delete(id);
  }
}

type Internals = {
  saves: SaveStore | null;
  watchCloud(cloud: CloudSaveStore): void;
  bury(s: GameState): Promise<void>;
  stopLoop(): void;
};

const settle = (ms = 30) => new Promise((r) => setTimeout(r, ms));

async function loadGame() {
  const { game } = await import('../src/game');
  return { game, internals: game as unknown as Internals };
}

function stubBrowser() {
  vi.stubGlobal('localStorage', new MemoryStorage());
  vi.stubGlobal('sessionStorage', new MemoryStorage());
  vi.stubGlobal('window', { addEventListener: vi.fn() });
}

// the whole game loads here once, which can take a while when every test file runs together
beforeAll(async () => {
  stubBrowser();
  await loadGame();
}, 60_000);

beforeEach(async () => {
  stubBrowser();
  const { game } = await loadGame();
  game.notice = null;
  game.fallen = null;
});

afterEach(async () => {
  const { game, internals } = await loadGame();
  internals.stopLoop();
  game.screen = 'select';
  game.notice = null;
  game.fallen = null;
  setMarketStandIn(null);
  vi.unstubAllGlobals();
});

describe('a device whose cloud saves are refused', () => {
  async function playing(challenge?: { hardcore: boolean }) {
    const { game, internals } = await loadGame();
    const table = new MemoryTable();
    const cloud = new CloudSaveStore(table, new LocalSaveStore(localStorage, 'cloud-u1', false), 'u1');
    internals.watchCloud(cloud);
    internals.saves = cloud;
    game.account = { id: 'u1', provider: 'google', displayName: 'Tester' };
    const s = newGame(1, { name: 'Idler', classId: 'warrior', challenge });
    await cloud.save(s);
    game.state = s;
    game.realm = s.account;
    game.screen = 'game';
    return { game, internals, table, s };
  }

  it('stops playing and says why, instead of running on with progress that can never be saved', async () => {
    const { game, table, s } = await playing();
    table.otherDeviceSaves(s.character.id);
    game.save();
    await settle();
    expect(game.screen).toBe('select');
    expect(game.notice).toContain('Idler');
    expect(game.notice).toContain('another device');
  });

  it('keeps playing when nobody else has saved', async () => {
    const { game } = await playing();
    game.save();
    await settle();
    expect(game.screen).toBe('game');
    expect(game.notice).toBeNull();
  });

  it('a Hardcore death on the refused device leaves the real character alone', async () => {
    const { game, internals, table, s } = await playing({ hardcore: true });
    table.otherDeviceSaves(s.character.id);
    s.fallen = { zoneId: null, offline: false };
    await internals.bury(s);
    expect(table.rows.has(s.character.id)).toBe(true);
    expect(game.screen).toBe('select');
    expect(game.fallen).toBeNull();
    expect(game.notice).toContain("doesn't count");
  });

  it('a Hardcore death on the device that holds the newest save still deletes the character', async () => {
    const { game, internals, table, s } = await playing({ hardcore: true });
    s.fallen = { zoneId: null, offline: false };
    await internals.bury(s);
    expect(table.rows.has(s.character.id)).toBe(false);
    expect(game.screen).toBe('fallen');
  });
});

describe('deliveries collected while catching up on time away', () => {
  it('are added once the catch-up is done, not dropped', async () => {
    const { game, internals } = await loadGame();
    const saves = new MemorySaveStore();
    const s = newGame(1, { name: 'Away', classId: 'warrior' });
    s.bossesDefeated.push('sanctum');
    expect(startSkillAction(s, makeCtx(seeded(1)), 'mine_copper')).toBeNull();
    s.lastSaved = Date.now() - 8 * 3600_000;
    await saves.save(s);
    await saves.saveAccount(s.account);

    let waiting = [{ currency: 'chaos', amount: 5, item: null, note: 'Admin: sorry' }];
    let repliedMidCatchUp = false;
    const market: MarketApi = {
      browse: async () => [],
      list: async () => {},
      buy: async () => {},
      bid: async () => {},
      cancel: async () => {},
      opDone: async () => false,
      collect: async () => {
        // the reply lands between two catch-up slices, as a browser's network callback does
        await new Promise<void>((resolve) => {
          const off = game.subscribeCatchUp(() => {
            off();
            resolve();
          });
          setTimeout(() => {
            off();
            resolve();
          }, 500);
        });
        const rows = waiting;
        waiting = []; // like the server: handed over once
        if (rows.length) repliedMidCatchUp = game.catchUpProgress() !== null;
        return rows;
      },
    };
    setMarketStandIn(market);

    internals.saves = saves;
    game.account = { id: 'u1', provider: 'google', displayName: 'Tester' };
    game.realm = (await saves.loadAccount())!;
    await game.refreshCharacters();
    const before = game.state.storage.bank.chaos ?? 0;

    await game.enter(s.character.id);
    for (let i = 0; i < 2000 && game.catchUpProgress() !== null; i++) await settle(10);
    await settle(100);

    expect(repliedMidCatchUp).toBe(true);
    expect(game.state.storage.bank.chaos ?? 0).toBe(before + 5);
  }, 60_000);
});

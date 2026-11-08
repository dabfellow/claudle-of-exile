import { describe, expect, it } from 'vitest';
import { type Ctx } from '../src/engine/context';
import { benchCraft, benchCraftReason } from '../src/engine/crafting';
import { allMods, createItem } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import type { Item } from '../src/engine/types';
import { BENCH_CRAFTS, STATIONS } from '../src/data/hideout';

/** Hard Boss trophies (Marrow Shards, Choir Glass, Black Pearl, Throne Ash, Crownless Sigil) feed high-tier crafts and upgrades. */
const TROPHIES = ['marrow_shard', 'choir_glass', 'black_pearl', 'throne_ash', 'crownless_sigil'];
const ctx = (): Ctx => ({ rng: seeded(5), now: 0, emit: () => {} });

function sword(s: ReturnType<typeof newGame>, c: Ctx): Item {
  let item = createItem(s, 'steel_broadsword', 80, 'magic', c.rng);
  while (item.prefixes.length) item = createItem(s, 'steel_broadsword', 80, 'magic', c.rng);
  s.inventory.push(item);
  return item;
}

describe('Hard Boss trophies', () => {
  it('every trophy has a bench craft and a station upgrade that uses it', () => {
    for (const id of TROPHIES) {
      expect(BENCH_CRAFTS.some((b) => b.cost[id]), `${id} bench craft`).toBe(true);
      expect(STATIONS.some((st) => st.levels.some((l) => l.cost[id])), `${id} station upgrade`).toBe(true);
    }
  });

  it('a Marrow Shard crafts a high-tier physical modifier and is spent', () => {
    const s = newGame(1, { name: 'Crafter', classId: 'warrior' });
    const c = ctx();
    s.account.hideout.bench = 6;
    s.account.bank.gold = 100_000;
    s.account.bank.arcane_dust = 5000;
    const item = sword(s, c);
    expect(benchCraftReason(s, 'bc_boss_phys', item.uid)).toBe('Not enough materials');
    s.account.bank.marrow_shard = 1;
    expect(benchCraft(s, c, 'bc_boss_phys', item.uid)).toBeNull();
    expect(allMods(item).find((m) => m.crafted)).toMatchObject({ affixId: 'added_phys', tier: 5 });
    expect(s.account.bank.marrow_shard ?? 0).toBe(0);
  });

  it('the Crownless Sigil craft needs Bench level 7', () => {
    const s = newGame(1, { name: 'Crafter', classId: 'warrior' });
    const c = ctx();
    s.account.hideout.bench = 6;
    s.account.bank.crownless_sigil = 1;
    const item = sword(s, c);
    expect(benchCraftReason(s, 'bc_boss_crit_multi', item.uid)).toMatch(/level 7/);
  });
});

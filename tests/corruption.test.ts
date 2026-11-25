import { describe, expect, it } from 'vitest';
import { affixDef } from '../src/data/affixes';
import { VALOR_ORB } from '../src/data/corruption';
import { applyOrb, benchCraftReason, removeCraftedReason, restoreReason, whetstoneReason } from '../src/engine/crafting';
import { makeCtx } from '../src/engine/context';
import { runeReason } from '../src/engine/runes';
import { ALL_RUNES } from '../src/data/runes';
import { addFixedMod, createItem, tierLabel } from '../src/engine/items';
import { newGame } from '../src/engine/state';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { deriveStats, itemStats } from '../src/engine/stats';
import { woodGrowthStep } from '../src/engine/woodcrafting';
import { BENCH_CRAFTS } from '../src/data/hideout';
import { zoneDef } from '../src/data/zones';
import { makeMonster } from '../src/engine/combat';
import { rollLoot } from '../src/engine/loot';
import { addMaps, startMap } from '../src/engine/maps';

function setup() {
  const s = newGame(1);
  const item = createItem(s, 'iron_ring', 84, 'normal', seeded(1));
  item.rarity = 'magic';
  const top = affixDef('flat_life').tiers.length - 1;
  addFixedMod(item, 'flat_life', top, seeded(2));
  s.inventory.push(item);
  s.storage.bank[VALOR_ORB] = 2;
  return { s, item, top };
}

function rolls(...values: number[]) {
  return makeCtx({ next: () => values.shift() ?? 0 });
}

describe('Valor Orb corruption', () => {
  it('rolls Valor once on the final Map boss and skips earlier bosses in the same fight', () => {
    const s = newGame(1);
    addMaps(s, 1, 1);
    expect(startMap(s, makeCtx(seeded(5)), 1, 'mudflats')).toBeNull();
    const zone = zoneDef(s.combat!.zoneId);
    const first = makeMonster(zone.boss, true, 1);
    const last = makeMonster(zone.boss, true, 2);
    first.life = 0;
    s.combat!.monsters = [first, last];
    rollLoot(s, rolls(), first, zone, deriveStats(s));
    expect(s.storage.bank[VALOR_ORB]).toBeUndefined();
    last.life = 0;
    rollLoot(s, rolls(), last, zone, deriveStats(s));
    expect(s.storage.bank[VALOR_ORB]).toBe(1);
  });

  it('upgrades Tier 1 to Corruption Tier 0 and preserves the result on reload', () => {
    const { s, item, top } = setup();
    const max = affixDef('flat_life').tiers[top].ranges[0][1];
    expect(applyOrb(s, rolls(0, 0, 0, 0.99999), VALOR_ORB, item.uid)).toBeNull();
    expect(item.corrupted).toBe(true);
    expect(item.prefixes[0].values).toEqual([max * 5]);
    expect(tierLabel(item.prefixes[0])).toBe('T0');
    expect(itemStats(item).life).toBe(max * 5);
    expect(deserialize(serialize(s)).inventory.find((entry) => entry.uid === item.uid)).toEqual(item);
  });

  it('adds a corruption implicit in the good category, even to a Normal base', () => {
    const { s, item } = setup();
    item.rarity = 'normal';
    item.prefixes = [];
    applyOrb(s, rolls(0.32, 0), VALOR_ORB, item.uid);
    expect(item.corruptionImplicit).toEqual({ id: 'gems', value: 1 });
    expect(itemStats(item).corruptionGemLevels).toBe(1);
  });

  it('lowers tiers, removes a modifier, or removes the base implicits in the bad category', () => {
    for (const outcome of [0.25, 0.45, 0.95]) {
      const { s, item, top } = setup();
      expect(applyOrb(s, rolls(1 / 3, outcome), VALOR_ORB, item.uid)).toBeNull();
      expect(item.corrupted).toBe(true);
      if (outcome === 0.25) expect(item.prefixes[0].tier).toBe(top - 1);
      if (outcome === 0.45) expect(item.prefixes).toHaveLength(0);
      if (outcome === 0.95) expect(item.lostBaseImplicits).toBe(true);
    }
  });

  it('can destroy the item or replace it with a corrupted Normal base', () => {
    const destroyed = setup();
    applyOrb(destroyed.s, rolls(0.5, 0), VALOR_ORB, destroyed.item.uid);
    expect(destroyed.s.inventory).not.toContain(destroyed.item);
    const transformed = setup();
    applyOrb(transformed.s, rolls(0.5, 0.65, 0), VALOR_ORB, transformed.item.uid);
    const newItem = transformed.s.inventory.find((item) => item.uid === transformed.item.uid)!;
    expect(newItem.baseId).not.toBe(transformed.item.baseId);
    expect(newItem).toMatchObject({ rarity: 'normal', corrupted: true, prefixes: [], suffixes: [] });
  });

  it('locks a no-stat-change result against every tested modification and freezes Living growth', () => {
    const { s, item } = setup();
    item.living = { growth: 1, ms: 0 };
    const before = structuredClone(item);
    expect(applyOrb(s, rolls(2 / 3), VALOR_ORB, item.uid)).toBeNull();
    expect(item).toEqual({ ...before, corrupted: true });
    const blocked = /Corrupted/;
    expect(applyOrb(s, rolls(0), VALOR_ORB, item.uid)).toMatch(blocked);
    expect(applyOrb(s, rolls(0), 'divine', item.uid)).toMatch(blocked);
    expect(restoreReason(s, item.uid)).toMatch(blocked);
    expect(whetstoneReason(s, item.uid, 'flat_life')).toMatch(blocked);
    expect(benchCraftReason(s, BENCH_CRAFTS[0].id, item.uid)).toMatch(blocked);
    expect(removeCraftedReason(s, item.uid)).toMatch(blocked);
    expect(runeReason(s, ALL_RUNES[0].id, item.uid)).toMatch(blocked);
    s.equipment.ring1 = item;
    woodGrowthStep(s, 7_200_000);
    expect(item.living).toEqual(before.living);
    expect(s.storage.bank[VALOR_ORB]).toBe(1);
  });
});

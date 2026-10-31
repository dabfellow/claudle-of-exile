import { describe, expect, it } from 'vitest';
import { AUTO_CRAFT_BENCH_LEVEL } from '../src/data/hideout';
import { affixDef } from '../src/data/affixes';
import { BASES } from '../src/data/bases';
import { modBias } from '../src/data/craftMats';
import { actionDef } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
import { applyEssence, applyOrb, essenceReason, orbReason, salvage } from '../src/engine/crafting';
import { ruleMet, startCraftUntil } from '../src/engine/craftUntil';
import { equip } from '../src/engine/equipment';
import { sellItems } from '../src/engine/hideout';
import { allMods, createItem, rerollMods, spawnWeight } from '../src/engine/items';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionIntervalMs, fossilHit, setSmithCatalyst, skillStep, startSkillAction } from '../src/engine/skills';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, Item } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';

const ctx = (seed = 1) => makeCtx(seeded(seed));

function player(): GameState {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.unlockedZones = ['mudflats', 'brinecaves', 'ashwood'];
  return s;
}

/** Run a skilling action `times` times in one step. */
function run(s: GameState, actionId: string, times: number, seed = 1) {
  const c = ctx(seed);
  expect(startSkillAction(s, c, actionId)).toBeNull();
  const d = deriveStats(s);
  skillStep(s, c, actionIntervalMs(s, actionDef(actionId), d) * times + 1, d);
}

function ring(s: GameState, ilvl = 20, rarity: Item['rarity'] = 'normal'): Item {
  const item = createItem(s, 'iron_ring', ilvl, rarity, seeded(9));
  s.inventory.push(item);
  return item;
}

const has = (item: Item, groups: string[]) => allMods(item).some((m) => groups.includes(affixDef(m.affixId).group));

describe('fossils', () => {
  it('block their banned groups and favour their own', () => {
    const s = player();
    const item = ring(s, 20, 'magic');
    const rng = seeded(4);
    let fire = 0;
    let plainFire = 0;
    for (let i = 0; i < 500; i++) {
      rerollMods(item, rng, modBias('scorched_fossil'));
      expect(has(item, ['added_cold', 'cold_res'])).toBe(false);
      if (has(item, ['added_fire', 'fire_res'])) fire++;
      rerollMods(item, rng);
      if (has(item, ['added_fire', 'fire_res'])) plainFire++;
    }
    expect(fire).toBeGreaterThan(plainFire * 2);
  });

  it('are spent with mod-rolling orbs and refused with others', () => {
    const s = player();
    const item = ring(s);
    Object.assign(s.bank, { transmute: 2, scour: 1, scorched_fossil: 1 });
    expect(applyOrb(s, ctx(), 'transmute', item.uid, 'scorched_fossil')).toBeNull();
    expect(s.bank.transmute).toBe(1);
    expect(s.bank.scorched_fossil).toBe(0);
    expect(orbReason(s, 'scour', item.uid, 'scorched_fossil')).toBe("Fossils don't work with this orb");
  });
});

describe('essences', () => {
  it('always force their modifier at their tier', () => {
    const s = player();
    const item = ring(s, 10);
    s.bank.essence_embers_2 = 20;
    for (let i = 0; i < 20; i++) {
      expect(applyEssence(s, ctx(i), 'essence_embers_2', item.uid)).toBeNull();
      expect(item.rarity).toBe('magic');
      expect(item.suffixes.some((m) => m.affixId === 'fire_res' && m.tier === 1)).toBe(true);
    }
  });

  it('are refused on low item level or a base that cannot roll the modifier', () => {
    const s = player();
    s.bank.essence_embers_2 = 1;
    s.bank.essence_haste_2 = 1;
    expect(essenceReason(s, 'essence_embers_2', ring(s, 5).uid)).toMatch(/item level 8/);
    const base = BASES.find((b) => spawnWeight(affixDef('attack_speed'), b) === 0)!;
    const other = createItem(s, base.id, 20, 'normal', seeded(1));
    s.inventory.push(other);
    expect(essenceReason(s, 'essence_haste_2', other.uid)).toBe('Cannot roll on this item type');
  });
});

/** a character whose Crafting Bench can auto-craft */
function crafter() {
  const s = player();
  s.account.hideout.bench = AUTO_CRAFT_BENCH_LEVEL;
  return s;
}

describe('auto-crafting', () => {
  it('needs Crafting Bench level 5', () => {
    const s = player();
    const item = ring(s, 20, 'magic');
    s.bank.alteration = 10;
    expect(startCraftUntil(s, ctx(1), item.uid, { orb: 'alteration' }, { kind: 'has', affixId: 'fire_res' })).toMatch(/Bench level 5/);
  });

  it('spends orbs until the rule matches, then stops', () => {
    const s = crafter();
    const item = ring(s, 20, 'magic');
    s.bank.alteration = 2000;
    const c = ctx(3);
    expect(startCraftUntil(s, c, item.uid, { orb: 'alteration' }, { kind: 'has', affixId: 'fire_res' })).toBeNull();
    for (let i = 0; i < 4000 && s.action; i++) tick(s, c, 1500);
    expect(s.action).toBeNull();
    expect(ruleMet(item, { kind: 'has', affixId: 'fire_res' })).toBe(true);
    expect(s.bank.alteration).toBeLessThan(2000);
  });

  it('stops when the orbs run out', () => {
    const s = crafter();
    const item = ring(s, 20, 'magic');
    s.bank.alteration = 3;
    const c = ctx(1);
    // a magic item has one suffix, so it can never have two resistances
    startCraftUntil(s, c, item.uid, { orb: 'alteration' }, { kind: 'twoOf', affixIds: ['fire_res', 'cold_res'] });
    tick(s, c, 1500 * 10);
    expect(s.action).toBeNull();
    expect(s.bank.alteration).toBe(0);
  });

  it('keeps going offline and reports the result', () => {
    const s = crafter();
    const item = ring(s, 20, 'magic');
    s.bank.alteration = 2000;
    s.bank.scorched_fossil = 2000;
    const c = ctx(5);
    startCraftUntil(s, c, item.uid, { orb: 'alteration', fossil: 'scorched_fossil' }, { kind: 'has', affixId: 'fire_res' });
    const sum = simulateOffline(s, c, 60 * 60_000);
    expect(sum.crafted).toMatch(/Fire Resistance/);
    expect(ruleMet(item, { kind: 'has', affixId: 'fire_res' })).toBe(true);
  });

  it('locks the item while it works', () => {
    const s = crafter();
    const item = ring(s, 20, 'magic');
    s.bank.alteration = 10;
    const c = ctx(1);
    startCraftUntil(s, c, item.uid, { orb: 'alteration' }, { kind: 'twoOf', affixIds: ['fire_res', 'cold_res'] });
    salvage(s, c, [item.uid]);
    sellItems(s, c, [item.uid]);
    expect(s.inventory).toContain(item);
    expect(equip(s, c, item.uid)).toBe('Being crafted');
  });

  it('Patient Crafter sometimes keeps the orb', () => {
    const s = crafter();
    s.skillPassives = ['core_overtime'];
    const item = ring(s, 20, 'magic');
    s.bank.alteration = 200;
    const c = ctx(2);
    startCraftUntil(s, c, item.uid, { orb: 'alteration' }, { kind: 'twoOf', affixIds: ['fire_res', 'cold_res'] });
    let steps = 0;
    for (let i = 0; i < 1000 && s.action?.kind === 'craft'; i++) {
      steps = s.action.steps;
      tick(s, c, 1500);
    }
    expect(steps).toBeGreaterThan(200);
  });
});

describe('smithing catalysts', () => {
  it('Resin raises item level but never past the campaign cap', () => {
    const s = player();
    s.bank = { ...s.bank, copper_ore: 100, rough_gem: 100, ash_resin: 5 };
    setSmithCatalyst(s, { resin: 'ash_resin' });
    run(s, 'smith_iron_ring', 1);
    expect(s.inventory.at(-1)!.ilvl).toBe(3);
    expect(s.bank.ash_resin).toBe(4);

    s.skills.smithing = xpForLevel(30);
    run(s, 'smith_iron_ring', 1);
    expect(s.inventory.at(-1)!.ilvl).toBe(10); // Ashen Woods tops out at 10
  });

  it('a Fossil is only used when the base comes out Magic', () => {
    const s = player();
    s.bank = { ...s.bank, copper_ore: 100, rough_gem: 100, scorched_fossil: 5 };
    setSmithCatalyst(s, { fossil: 'scorched_fossil' });
    run(s, 'smith_iron_ring', 3);
    expect(s.bank.scorched_fossil).toBe(5);
    s.skillPassives = ['smithing_ks']; // Grandmaster Smith: always Magic
    run(s, 'smith_iron_ring', 3);
    expect(s.bank.scorched_fossil).toBe(2);
  });

  it('repeat until stops on a Fossil modifier', () => {
    const s = player();
    s.skills.smithing = xpForLevel(20);
    s.skillPassives = ['smithing_ks'];
    s.bank = { ...s.bank, copper_ore: 10000, rough_gem: 10000, scorched_fossil: 1000 };
    setSmithCatalyst(s, { fossil: 'scorched_fossil', until: true, salvageMisses: true });
    run(s, 'smith_iron_ring', 500);
    expect(s.action).toBeNull();
    expect(s.inventory).toHaveLength(1);
    expect(fossilHit(s.inventory[0], 'scorched_fossil')).toBe(true);
  });
});

describe('gathering and alchemy', () => {
  it('alternate nodes give base material half the time, plus their secondary', () => {
    const s = player();
    s.skills.mining = xpForLevel(5);
    run(s, 'mine_scorched', 400);
    expect(s.bank.copper_ore).toBeGreaterThan(150);
    expect(s.bank.copper_ore).toBeLessThan(250);
    expect(s.bank.scorched_fossil).toBeGreaterThan(10);
  });

  it('every gathering action can drop its orb shard', () => {
    const s = player();
    run(s, 'mine_copper', 1000);
    expect(s.bank.aug_shard).toBeGreaterThan(5);
    expect(s.bank.aug_shard).toBeLessThan(40);
  });

  it('Fossil Hunter finds more Fossils', () => {
    const plain = player();
    const hunter = player();
    hunter.skillPassives = ['mining_n1'];
    for (const s of [plain, hunter]) {
      s.skills.mining = xpForLevel(5);
      run(s, 'mine_scorched', 1000, 7);
    }
    expect(hunter.bank.scorched_fossil).toBeGreaterThan(plain.bank.scorched_fossil);
  });

  it('Distiller turns some Lesser Essences into Greater', () => {
    const s = player();
    s.skillPassives = ['harvesting_n0'];
    run(s, 'herb_sun', 3000);
    expect(s.bank.essence_vitality_2).toBeGreaterThan(0);
  });

  it('batch recipes cost 8.5×, or 7.5× with Bulk Brewer', () => {
    expect(actionDef('orb_transmute_x10').inputs).toEqual({ arcane_dust: 26, sunpetal: 17 });
    const s = player();
    s.skillPassives = ['alchemy_n0'];
    s.bank = { ...s.bank, arcane_dust: 100, sunpetal: 100 };
    run(s, 'orb_transmute_x10', 1);
    expect(s.bank.arcane_dust).toBe(100 - 23);
    expect(s.bank.sunpetal).toBe(100 - 15);
    expect(s.bank.transmute).toBeGreaterThanOrEqual(10);
  });

  it('fuses 20 shards into an orb', () => {
    const s = player();
    s.bank.alt_shard = 40;
    run(s, 'fuse_alt_shard', 2);
    expect(s.bank.alt_shard).toBe(0);
    expect(s.bank.alteration).toBe(2);
  });
});

describe('save', () => {
  it('fills the catalyst slot on older saves', () => {
    const s = player();
    const raw = JSON.parse(serialize(s));
    delete raw.smithCatalyst;
    expect(deserialize(JSON.stringify(raw)).smithCatalyst).toEqual({ fossil: null, resin: null, until: false, salvageMisses: false });
  });
});

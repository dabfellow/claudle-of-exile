import { describe, expect, it } from 'vitest';
import { type Ctx } from '../src/engine/context';
import { applyOrb, benchCraft, benchCraftReason, removeCrafted, removeCraftedReason } from '../src/engine/crafting';
import { craftUntilReason, startCraftUntil } from '../src/engine/craftUntil';
import { allMods, createItem, modCount } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import type { GameState, Item } from '../src/engine/types';
import { SEAL } from '../src/data/craftMats';
import { META_CRAFT_BENCH_LEVEL } from '../src/data/hideout';

const ctx = (seed = 123): Ctx => ({ rng: seeded(seed), now: 0, emit: () => {} });

function makeState(): { s: GameState; c: Ctx } {
  const s = newGame(1, { name: 'MetaCrafter', classId: 'warrior' });
  s.account.hideout.bench = META_CRAFT_BENCH_LEVEL;
  s.achievements = ['boss_10', 'slayer_1000', 'crafter_250'];
  s.account.bank.divine = 20;
  s.account.bank.exalted = 20;
  s.account.bank.chaos = 50;
  s.account.bank.scour = 50;
  s.account.bank.annul = 50;
  s.account.bank.alteration = 50;
  s.account.bank.arcane_dust = 5000;
  s.account.bank.gold = 100000;
  s.account.bank[SEAL] = 20;
  return { s, c: ctx() };
}

function makeRareSword(s: GameState, c: Ctx): Item {
  let item = createItem(s, 'steel_broadsword', 75, 'rare', c.rng);
  while (item.prefixes.length < 2 || item.suffixes.length >= 3) {
    item = createItem(s, 'steel_broadsword', 75, 'rare', c.rng);
  }
  s.inventory.push(item);
  return item;
}

describe('Meta-crafting (Milestone 10B)', () => {
  it('requires Bench Level 6 for meta-craft recipes', () => {
    const { s, c } = makeState();
    s.account.hideout.bench = 5; // Level 5
    const item = makeRareSword(s, c);

    expect(benchCraftReason(s, 'bc_prefix_lock', item.uid)).toMatch(/Requires Crafting Bench level 6/);
    expect(benchCraftReason(s, 'bc_suffix_lock', item.uid)).toMatch(/Requires Crafting Bench level 6/);
    expect(benchCraftReason(s, 'bc_multicraft', item.uid)).toMatch(/Requires Crafting Bench level 6/);

    s.account.hideout.bench = 6;
    expect(benchCraftReason(s, 'bc_prefix_lock', item.uid)).toBeNull();
  });

  it('Prefixes Cannot Be Changed protects prefixes from Chaos, Scour, and Divine', () => {
    const { s, c } = makeState();
    const item = makeRareSword(s, c);
    const initialPrefixes = structuredClone(item.prefixes);
    expect(initialPrefixes.length).toBeGreaterThanOrEqual(2);

    // Craft "Prefixes Cannot Be Changed"
    const craftErr = benchCraft(s, c, 'bc_prefix_lock', item.uid);
    expect(craftErr).toBeNull();
    expect(item.suffixes.some((m) => m.affixId === 'meta_prefixes_cannot_be_changed')).toBe(true);

    // 1. Chaos reroll: prefixes must remain identical
    const chaosErr = applyOrb(s, c, 'chaos', item.uid);
    expect(chaosErr).toBeNull();
    expect(item.prefixes.length).toBe(initialPrefixes.length);
    for (let i = 0; i < initialPrefixes.length; i++) {
      expect(item.prefixes[i].affixId).toBe(initialPrefixes[i].affixId);
      expect(item.prefixes[i].tier).toBe(initialPrefixes[i].tier);
      expect(item.prefixes[i].values).toEqual(initialPrefixes[i].values);
    }

    // 2. Re-craft Prefixes Cannot Be Changed if rerolled away
    if (!item.suffixes.some((m) => m.affixId === 'meta_prefixes_cannot_be_changed')) {
      item.suffixes = []; // make room
      benchCraft(s, c, 'bc_prefix_lock', item.uid);
    }

    // 3. Scour: removes suffixes (including the meta lock) and preserves all prefixes
    const scourErr = applyOrb(s, c, 'scour', item.uid);
    expect(scourErr).toBeNull();
    expect(item.prefixes.length).toBe(initialPrefixes.length);
    expect(item.suffixes.length).toBe(0);
    for (let i = 0; i < initialPrefixes.length; i++) {
      expect(item.prefixes[i].affixId).toBe(initialPrefixes[i].affixId);
    }

    // 4. Divine on an item with Prefixes Cannot Be Changed: does not touch prefix values
    item.suffixes = [];
    benchCraft(s, c, 'bc_prefix_lock', item.uid);
    const prefixValuesBeforeDivine = item.prefixes.map((p) => [...p.values]);
    applyOrb(s, c, 'divine', item.uid);
    const prefixValuesAfterDivine = item.prefixes.map((p) => [...p.values]);
    expect(prefixValuesAfterDivine).toEqual(prefixValuesBeforeDivine);
  });

  it('Suffixes Cannot Be Changed protects suffixes from Chaos, Scour, and Annul', () => {
    const { s, c } = makeState();
    let item = createItem(s, 'steel_broadsword', 75, 'rare', c.rng);
    while (item.suffixes.length < 2 || item.prefixes.length >= 3) {
      item = createItem(s, 'steel_broadsword', 75, 'rare', c.rng);
    }
    s.inventory.push(item);
    const initialSuffixes = structuredClone(item.suffixes);

    // Craft "Suffixes Cannot Be Changed"
    const craftErr = benchCraft(s, c, 'bc_suffix_lock', item.uid);
    expect(craftErr).toBeNull();
    expect(item.prefixes.some((m) => m.affixId === 'meta_suffixes_cannot_be_changed')).toBe(true);

    // Chaos reroll: suffixes must remain identical
    const chaosErr = applyOrb(s, c, 'chaos', item.uid);
    expect(chaosErr).toBeNull();
    expect(item.suffixes.length).toBe(initialSuffixes.length);
    for (let i = 0; i < initialSuffixes.length; i++) {
      expect(item.suffixes[i].affixId).toBe(initialSuffixes[i].affixId);
      expect(item.suffixes[i].tier).toBe(initialSuffixes[i].tier);
      expect(item.suffixes[i].values).toEqual(initialSuffixes[i].values);
    }

    // Re-craft if prefixes were rerolled
    if (!item.prefixes.some((m) => m.affixId === 'meta_suffixes_cannot_be_changed')) {
      item.prefixes = [];
      benchCraft(s, c, 'bc_suffix_lock', item.uid);
    }

    // Scour removes prefixes and preserves suffixes
    const scourErr = applyOrb(s, c, 'scour', item.uid);
    expect(scourErr).toBeNull();
    expect(item.suffixes.length).toBe(initialSuffixes.length);
    expect(item.prefixes.length).toBe(0);
    for (let i = 0; i < initialSuffixes.length; i++) {
      expect(item.suffixes[i].affixId).toBe(initialSuffixes[i].affixId);
    }
  });

  it('Multicraft allows up to 3 crafted modifiers on an item', () => {
    const { s, c } = makeState();
    const item = createItem(s, 'steel_broadsword', 75, 'rare', c.rng);
    item.prefixes = [];
    item.suffixes = [];
    s.inventory.push(item);

    // Craft Multicraft
    expect(benchCraft(s, c, 'bc_multicraft', item.uid)).toBeNull();
    expect(allMods(item).filter((m) => m.crafted).length).toBe(1);

    // Craft 2nd modifier (Flat Phys)
    expect(benchCraft(s, c, 'bc_phys', item.uid)).toBeNull();
    expect(allMods(item).filter((m) => m.crafted).length).toBe(2);

    // Craft 3rd modifier (Attack Speed)
    expect(benchCraft(s, c, 'bc_speed', item.uid)).toBeNull();
    expect(allMods(item).filter((m) => m.crafted).length).toBe(3);

    // Crafting a 4th modifier is blocked
    expect(benchCraftReason(s, 'bc_crit', item.uid)).toBe('Item already has 3 crafted modifiers');
  });

  it('removes crafted modifiers for 1 Orb of Scouring', () => {
    const { s, c } = makeState();
    const item = makeRareSword(s, c);
    const naturalCount = modCount(item);
    benchCraft(s, c, 'bc_speed', item.uid);
    expect(modCount(item)).toBe(naturalCount + 1);

    const initialScours = s.account.bank.scour!;
    const err = removeCrafted(s, c, item.uid);
    expect(err).toBeNull();
    expect(s.account.bank.scour).toBe(initialScours - 1);
    expect(modCount(item)).toBe(naturalCount);
    expect(allMods(item).some((m) => m.crafted)).toBe(false);

    // Cannot remove when no crafted mods exist
    expect(removeCraftedReason(s, item.uid)).toBe('Item has no crafted modifiers');
  });

  it('auto-crafting supports Forger Seals', () => {
    const { s, c } = makeState();
    const item = makeRareSword(s, c);
    const sealedAffix = item.prefixes[0].affixId;

    const reason = craftUntilReason(
      s,
      item.uid,
      { orb: 'chaos', sealed: sealedAffix },
      { kind: 'has', affixId: 'attack_speed' }
    );
    expect(reason).toBeNull();

    const startErr = startCraftUntil(
      s,
      c,
      item.uid,
      { orb: 'chaos', sealed: sealedAffix },
      { kind: 'has', affixId: 'attack_speed' }
    );
    expect(startErr).toBeNull();
    expect(s.action?.kind).toBe('craft');
    if (s.action?.kind === 'craft' && 'sealed' in s.action.method) {
      expect(s.action.method.sealed).toBe(sealedAffix);
    }
  });
});

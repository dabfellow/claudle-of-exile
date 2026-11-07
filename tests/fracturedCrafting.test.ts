import { describe, expect, it } from 'vitest';
import type { Ctx } from '../src/engine/context';
import { applyEssence, applyOrb, orbReason, restoreImpression, takeImpression, whetstoneReason } from '../src/engine/crafting';
import { allMods, createItem, modCount } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import type { GameState, Item } from '../src/engine/types';
import { WAX } from '../src/data/craftMats';
import { WHETSTONE } from '../src/data/expedition';

const ctx = (seed = 42): Ctx => ({ rng: seeded(seed), now: 0, emit: () => {} });

function makeState(): { s: GameState; c: Ctx } {
  const s = newGame(1, { name: 'Crafter', classId: 'warrior' });
  s.account.bank.fractured = 10;
  s.account.bank.chaos = 50;
  s.account.bank.scour = 50;
  s.account.bank.annul = 50;
  s.account.bank.alteration = 50;
  s.account.bank.augment = 50;
  s.account.bank.regal = 50;
  s.account.bank[WAX] = 10;
  s.account.bank[WHETSTONE] = 10;
  s.account.bank.essence_haste_2 = 10;
  return { s, c: ctx() };
}

/** Creates a 4-or-more-mod rare sword in inventory */
function makeRareWith4Mods(s: GameState, c: Ctx): Item {
  let item = createItem(s, 'steel_broadsword', 75, 'rare', c.rng);
  while (modCount(item) < 4) {
    item = createItem(s, 'steel_broadsword', 75, 'rare', c.rng);
  }
  s.inventory.push(item);
  return item;
}

describe('Fractured crafting (Milestone 10A)', () => {
  it('validates Fractured Orb targets', () => {
    const { s, c } = makeState();
    const normal = createItem(s, 'steel_broadsword', 75, 'normal', c.rng);
    const magic = createItem(s, 'steel_broadsword', 75, 'magic', c.rng);
    s.inventory.push(normal, magic);

    expect(orbReason(s, 'fractured', normal.uid)).toBe('Item must be Rare');
    expect(orbReason(s, 'fractured', magic.uid)).toBe('Item must be Rare');

    const rare4 = makeRareWith4Mods(s, c);
    expect(orbReason(s, 'fractured', rare4.uid)).toBeNull();

    // Sealing is disallowed on Fractured Orbs
    expect(orbReason(s, 'fractured', rare4.uid, null, allMods(rare4)[0].affixId)).toMatch(/Seal doesn't work/);
  });

  it('fractures a random modifier on a rare item', () => {
    const { s, c } = makeState();
    const item = makeRareWith4Mods(s, c);
    const originalCount = modCount(item);
    const initialOrbs = s.account.bank.fractured!;

    const err = applyOrb(s, c, 'fractured', item.uid);
    expect(err).toBeNull();
    expect(s.account.bank.fractured).toBe(initialOrbs - 1);

    expect(item.fractured).toBeDefined();
    const fracturedMods = allMods(item).filter((m) => m.fractured);
    expect(fracturedMods.length).toBe(1);
    expect(fracturedMods[0].affixId).toBe(item.fractured);
    expect(modCount(item)).toBe(originalCount);

    // Applying another Fractured Orb fails
    expect(orbReason(s, 'fractured', item.uid)).toBe('Item already has a fractured modifier');
  });

  it('scouring a fractured rare produces a 1-mod magic item', () => {
    const { s, c } = makeState();
    const item = makeRareWith4Mods(s, c);
    applyOrb(s, c, 'fractured', item.uid);

    const fracturedAffix = item.fractured!;
    expect(fracturedAffix).toBeDefined();

    // Scour the item
    const scourErr = applyOrb(s, c, 'scour', item.uid);
    expect(scourErr).toBeNull();

    // Now it is a 1-mod magic item
    expect(item.rarity).toBe('magic');
    expect(item.name).toBeNull();
    expect(modCount(item)).toBe(1);
    expect(allMods(item)[0].affixId).toBe(fracturedAffix);
    expect(allMods(item)[0].fractured).toBe(true);
    expect(item.fractured).toBe(fracturedAffix);

    // Scouring again fails because only the fractured mod remains
    expect(orbReason(s, 'scour', item.uid)).toBe('Cannot scour: only the fractured modifier remains');
  });

  it('annulment never removes fractured modifiers', () => {
    const { s, c } = makeState();
    const item = makeRareWith4Mods(s, c);
    applyOrb(s, c, 'fractured', item.uid);

    const fracturedAffix = item.fractured!;

    // Annul until only 1 mod is left
    while (modCount(item) > 1) {
      const err = applyOrb(s, c, 'annul', item.uid);
      expect(err).toBeNull();
      expect(allMods(item).some((m) => m.affixId === fracturedAffix && m.fractured)).toBe(true);
    }

    // When only the fractured mod remains, annulment is blocked
    expect(modCount(item)).toBe(1);
    expect(orbReason(s, 'annul', item.uid)).toBe('Cannot annul: only fractured modifiers remain');
  });

  it('chaos rerolling preserves the fractured modifier', () => {
    const { s, c } = makeState();
    const item = makeRareWith4Mods(s, c);
    applyOrb(s, c, 'fractured', item.uid);

    const fracturedAffix = item.fractured!;
    const originalTier = allMods(item).find((m) => m.affixId === fracturedAffix)!.tier;

    // Reroll with Chaos multiple times
    for (let i = 0; i < 5; i++) {
      const err = applyOrb(s, c, 'chaos', item.uid);
      expect(err).toBeNull();
      expect(item.rarity).toBe('rare');
      const frac = allMods(item).find((m) => m.affixId === fracturedAffix);
      expect(frac).toBeDefined();
      expect(frac!.fractured).toBe(true);
      expect(frac!.tier).toBe(originalTier);
      expect(modCount(item)).toBeGreaterThanOrEqual(4);
    }
  });

  it('alteration on a scoured fractured item preserves the fractured modifier', () => {
    const { s, c } = makeState();
    const item = makeRareWith4Mods(s, c);
    applyOrb(s, c, 'fractured', item.uid);
    applyOrb(s, c, 'scour', item.uid);

    const fracturedAffix = item.fractured!;
    expect(item.rarity).toBe('magic');

    // Reroll with Alteration
    for (let i = 0; i < 5; i++) {
      const err = applyOrb(s, c, 'alteration', item.uid);
      expect(err).toBeNull();
      expect(item.rarity).toBe('magic');
      const frac = allMods(item).find((m) => m.affixId === fracturedAffix);
      expect(frac).toBeDefined();
      expect(frac!.fractured).toBe(true);
      expect(modCount(item)).toBeGreaterThanOrEqual(1);
      expect(modCount(item)).toBeLessThanOrEqual(2);
    }
  });

  it('whetstone rejects honing a fractured modifier', () => {
    const { s, c } = makeState();
    const item = makeRareWith4Mods(s, c);
    applyOrb(s, c, 'fractured', item.uid);

    const fracturedAffix = item.fractured!;
    expect(whetstoneReason(s, item.uid, fracturedAffix)).toBe('Cannot hone a fractured modifier');
  });

  it('locksmiths wax preserves and restores fractured status', () => {
    const { s, c } = makeState();
    const item = makeRareWith4Mods(s, c);
    applyOrb(s, c, 'fractured', item.uid);

    const fracturedAffix = item.fractured!;
    expect(takeImpression(s, c, item.uid)).toBeNull();

    // Reroll item with Chaos
    applyOrb(s, c, 'chaos', item.uid);

    // Restore impression
    expect(restoreImpression(s, c, item.uid)).toBeNull();
    expect(item.fractured).toBe(fracturedAffix);
    const frac = allMods(item).find((m) => m.affixId === fracturedAffix);
    expect(frac).toBeDefined();
    expect(frac!.fractured).toBe(true);
  });

  it('essence preserves fractured modifiers on magic items', () => {
    const { s, c } = makeState();
    const item = makeRareWith4Mods(s, c);
    applyOrb(s, c, 'fractured', item.uid);
    applyOrb(s, c, 'scour', item.uid);

    const fracturedAffix = item.fractured!;
    expect(item.rarity).toBe('magic');

    // Apply Greater Essence of Haste
    const err = applyEssence(s, c, 'essence_haste_2', item.uid);
    // If the fractured mod was already a suffix or in the same group, it cannot fit on a magic item
    if (fracturedAffix === 'attack_speed') {
      expect(err).toMatch(/modifier group/);
    } else if (allMods(item).some((m) => m.fractured && m.affixId.includes('speed') || m.affixId === 'accuracy' || m.affixId === 'crit_chance' || m.affixId === 'crit_multi')) {
      // Suffix collision
      expect(err).toMatch(/No room for another suffix/);
    } else {
      expect(err).toBeNull();
      expect(allMods(item).some((m) => m.affixId === fracturedAffix && m.fractured)).toBe(true);
      expect(allMods(item).some((m) => m.affixId === 'attack_speed')).toBe(true);
    }
  });
});

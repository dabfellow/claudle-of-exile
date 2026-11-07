import { describe, expect, it } from 'vitest';
import { affixDef } from '../src/data/affixes';
import { FORGE_ILVL, MAP_ILVL, MAP_RARITY, STATIONS } from '../src/data/hideout';
import { makeCtx } from '../src/engine/context';
import { applyOrb, benchCraft, benchCraftReason, orbReason } from '../src/engine/crafting';
import { stationLevel, stationPerks, upgradeStation } from '../src/engine/hideout';
import { createItem, eligibleAffixes, modCount, openKinds, tierLabel } from '../src/engine/items';
import { canStartUberBoss, sextantSlots, startUberBoss } from '../src/engine/maps';
import { seeded } from '../src/engine/rng';
import { smithIlvlCap } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { setStashAffinity, stashItems } from '../src/engine/storage';
import type { GameState, Item } from '../src/engine/types';

function makeState(): { s: GameState; c: ReturnType<typeof makeCtx> } {
  const s = newGame(1);
  const c = makeCtx(seeded(42));
  s.account.campaignDone = true;
  s.achievements = ['boss_10', 'slayer_1000', 'crafter_250', 'unique_find', 'bench_10'];
  // Fill bank with materials for testing
  for (const st of STATIONS) {
    for (const lvl of st.levels) {
      for (const id of Object.keys(lvl.cost)) s.account.bank[id] = 1e7;
    }
  }
  s.account.bank.alchemy = 100;
  s.account.bank.divine = 100;
  s.account.bank.exalted = 100;
  s.account.bank.chaos = 100;
  s.account.bank.scour = 100;
  s.account.bank.arcane_dust = 10000;
  s.account.bank.exile_doom_sigil = 10;
  s.account.bank.architect_doom_sigil = 10;
  s.account.bank.void_sigil = 10;
  s.account.bank.uber_key_1 = 5;
  s.account.bank.uber_key_2 = 5;
  s.account.bank.uber_key_3 = 5;
  return { s, c };
}

function makeRareWith6Mods(s: GameState, c: ReturnType<typeof makeCtx>): Item {
  const item = createItem(s, 'steel_broadsword', 85, 'normal', c.rng);
  s.inventory.push(item);
  applyOrb(s, c, 'alchemy', item.uid);
  let safety = 0;
  while (modCount(item) < 6 && safety < 20) {
    safety++;
    applyOrb(s, c, 'exalted', item.uid);
  }
  return item;
}

describe('Phase 3: Endgame Hideout Station Upgrades', () => {
  it('Map Device upgrades to Level 5 and Level 6 with proper perks and 4th Sextant slot', () => {
    const { s, c } = makeState();
    s.account.hideout.map_device = 4;
    expect(stationLevel(s, 'map_device')).toBe(4);

    // Upgrade to L5
    expect(upgradeStation(s, c, 'map_device')).toBeNull();
    expect(stationLevel(s, 'map_device')).toBe(5);
    expect(MAP_RARITY[4]).toBe(50);
    expect(MAP_ILVL[4]).toBe(2);
    expect(sextantSlots(s)).toBe(4);
    expect(stationPerks(s, 'map_device')).toContain('4th Sextant slot unlocked permanently');

    // Upgrade to L6 (Pinnacle Conduit)
    expect(upgradeStation(s, c, 'map_device')).toBeNull();
    expect(stationLevel(s, 'map_device')).toBe(6);
    expect(stationPerks(s, 'map_device')).toContain('Pinnacle Conduit: +15% Map Boss extra Map/Key drop, Sextant +2 base charges');
  });

  it('Stash upgrades to Level 5 and Level 6 granting Dedicated Map Tab and +2 free pages', () => {
    const { s, c } = makeState();
    s.account.hideout.stash = 4;
    const pagesBefore = s.account.stash.length;

    // Upgrade to L5
    expect(upgradeStation(s, c, 'stash')).toBeNull();
    expect(stationLevel(s, 'stash')).toBe(5);
    expect(stationPerks(s, 'stash')).toContain('Dedicated Map Storage Tab');

    // Upgrade to L6
    expect(upgradeStation(s, c, 'stash')).toBeNull();
    expect(stationLevel(s, 'stash')).toBe(6);
    expect(s.account.stash.length).toBe(pagesBefore + 2);
  });

  it('Forge upgrades to Level 5 unlocking Pinnacle Metallurgy (ilvl 84 cap and +8 ilvl bonus)', () => {
    const { s, c } = makeState();
    s.account.hideout.forge = 4;
    expect(upgradeStation(s, c, 'forge')).toBeNull();
    expect(stationLevel(s, 'forge')).toBe(5);
    expect(FORGE_ILVL[4]).toBe(8);
    expect(smithIlvlCap(s)).toBeGreaterThanOrEqual(84);
    expect(stationPerks(s, 'forge')).toContain('Pinnacle Metallurgy: 10% chance for Tier 1 modifier pre-installed');
  });

  it('Watchtower upgrades to Level 5 unlocking Autonomous Offline Mapping and 36h cap', () => {
    const { s, c } = makeState();
    s.account.hideout.watchtower = 4;
    expect(upgradeStation(s, c, 'watchtower')).toBeNull();
    expect(stationLevel(s, 'watchtower')).toBe(5);
    expect(s.account.automation.offlineHours).toBe(36);
    expect(stationPerks(s, 'watchtower')).toContain('Autonomous Offline Mapping');
  });

  it('Trophy Altar provides realm-wide defensive and offensive bonuses', () => {
    const { s, c } = makeState();
    s.account.hideout.trophy_altar = 1;
    const d1 = deriveStats(s);
    expect(stationPerks(s, 'trophy_altar')).toContain('+3% Armour and Evasion realm-wide');

    // Upgrade to L2 (+5% mana regen)
    expect(upgradeStation(s, c, 'trophy_altar')).toBeNull();
    expect(stationLevel(s, 'trophy_altar')).toBe(2);

    // Upgrade to L3 (+4% all res)
    expect(upgradeStation(s, c, 'trophy_altar')).toBeNull();
    expect(stationLevel(s, 'trophy_altar')).toBe(3);
    const d3 = deriveStats(s);
    expect(d3.res.fire).toBe(d1.res.fire + 4);

    // Upgrade to L4 (+10% rarity)
    expect(upgradeStation(s, c, 'trophy_altar')).toBeNull();
    expect(stationLevel(s, 'trophy_altar')).toBe(4);
    const d4 = deriveStats(s);
    expect(d4.itemRarity).toBe(d3.itemRarity + 10);
  });

  it('Stash Affinities routes items to specifically tagged tabs', () => {
    const { s, c } = makeState();
    while (s.account.stash.length < 3) s.account.stash.push([]);

    // Tag page 1 for maps, page 2 for gear
    setStashAffinity(s, 1, 'maps');
    setStashAffinity(s, 2, 'gear');

    const sword = createItem(s, 'steel_broadsword', 50, 'normal', c.rng);
    const map = createItem(s, 'map_t1', 66, 'normal', c.rng);
    s.inventory.push(sword, map);

    // Stash items
    stashItems(s, c, [sword.uid, map.uid]);

    // Sword should be routed to page 2 (gear affinity)
    expect(s.account.stash[2].some((i) => i.uid === sword.uid)).toBe(true);
    // Map should be routed to page 1 (maps affinity)
    expect(s.account.stash[1].some((i) => i.uid === map.uid)).toBe(true);
  });
});

describe('Phase 4: Pinnacle Crafting & Doom Sigils', () => {
  it("Exile's Doom Sigil elevates a Tier 1 modifier to Tier 0 Doom tier", () => {
    const { s, c } = makeState();
    const item = makeRareWith6Mods(s, c);

    // Ensure at least one mod is T1 (last tier index)
    const p0 = item.prefixes[0];
    const def = affixDef(p0.affixId);
    p0.tier = def.tiers.length - 1;
    const oldValues = [...p0.values];

    expect(orbReason(s, 'exile_doom_sigil', item.uid)).toBeNull();
    applyOrb(s, c, 'exile_doom_sigil', item.uid);

    expect(item.elevated).toBe(p0.affixId);
    expect(p0.elevated).toBe(true);
    expect(tierLabel(p0)).toBe('T0');
    expect(p0.values[0]).toBeGreaterThanOrEqual(oldValues[0]);

    // An item can only have one elevated modifier
    expect(orbReason(s, 'exile_doom_sigil', item.uid)).toBe('Item already has an elevated Tier 0 modifier');
  });

  it("Architect's Doom Sigil imbues a rare item with a Doom Implicit", () => {
    const { s, c } = makeState();
    const item = makeRareWith6Mods(s, c);

    expect(item.doomImplicit).toBeUndefined();
    expect(orbReason(s, 'architect_doom_sigil', item.uid)).toBeNull();
    applyOrb(s, c, 'architect_doom_sigil', item.uid);

    expect(item.doomImplicit).toBeDefined();
    expect(typeof item.doomImplicit).toBe('string');

    // Cannot apply a second Doom implicit
    expect(orbReason(s, 'architect_doom_sigil', item.uid)).toBe('Item already has a Doom Implicit');
  });

  it('Void Sigil unlocks the 7th modifier slot and allows adding a 7th affix via Exalted Orb', () => {
    const { s, c } = makeState();
    const item = makeRareWith6Mods(s, c);
    expect(modCount(item)).toBe(6);

    // Cannot exalt a standard 6-mod item
    expect(orbReason(s, 'exalted', item.uid)).toBe('No room for another modifier');

    // Unlock Void Slot
    expect(orbReason(s, 'void_sigil', item.uid)).toBeNull();
    applyOrb(s, c, 'void_sigil', item.uid);
    expect(item.voidSlot).toBe(true);

    // Now Exalted Orb has room for the 7th modifier
    expect(openKinds(item).length).toBeGreaterThan(0);
    expect(orbReason(s, 'exalted', item.uid)).toBeNull();
    applyOrb(s, c, 'exalted', item.uid);
    expect(modCount(item)).toBe(7);

    // Full at 7 mods
    expect(orbReason(s, 'exalted', item.uid)).toBe('No room for another modifier');
  });

  it('Mod Isolation crafts at Bench Level 7 block Attack or Caster modifiers from rolling', () => {
    const { s, c } = makeState();
    s.account.hideout.bench = 7;

    const item = createItem(s, 'steel_broadsword', 80, 'rare', c.rng);
    item.prefixes = [];
    item.suffixes = [];
    s.inventory.push(item);

    // Craft Cannot roll Attack Modifiers
    expect(benchCraftReason(s, 'bc_cannot_roll_attack', item.uid)).toBeNull();
    benchCraft(s, c, 'bc_cannot_roll_attack', item.uid);
    expect(item.suffixes.some((m) => m.affixId === 'meta_cannot_roll_attack')).toBe(true);

    // Eligible prefixes should now exclude attack modifiers (e.g. added_phys, inc_phys)
    const eligible = eligibleAffixes(item, 'prefix');
    expect(eligible.some((a) => a.id === 'added_phys')).toBe(false);
    expect(eligible.some((a) => a.id === 'inc_phys')).toBe(false);
  });

  it('Uber Boss portals require their keys and consume them upon entry', () => {
    const { s, c } = makeState();
    expect(canStartUberBoss(s, 1)).toBeNull();
    expect(canStartUberBoss(s, 2)).toBeNull();
    expect(canStartUberBoss(s, 3)).toBeNull();

    // Start fight 1
    const keysBefore = s.account.bank.uber_key_1;
    expect(startUberBoss(s, c, 1)).toBeNull();
    expect(s.account.bank.uber_key_1).toBe(keysBefore - 1);
    expect(s.combat?.zoneId).toBe('uber_first_exile');
  });
});

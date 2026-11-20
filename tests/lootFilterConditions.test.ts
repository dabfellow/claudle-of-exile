import { describe, expect, it } from 'vitest';
import { bagCap } from '../src/engine/storage';
import { affixDef } from '../src/data/affixes';
import { GROUND_CAP } from '../src/data/hideout';
import { makeCtx } from '../src/engine/context';
import { createItem, createUnique } from '../src/engine/items';
import { placeItem } from '../src/engine/loot';
import {
  describeRule,
  evaluateLootFilter,
  exportLootFilterCode,
  importLootFilterCode,
  ruleMatchesItem,
  type LootFilterRule,
} from '../src/engine/lootFilter';
import { mergeOffline, simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import type { GameEvent, Item, RolledMod } from '../src/engine/types';

/** A mod at display tier `t` (1 = strongest). */
const mod = (affixId: string, t = 1): RolledMod => ({ affixId, tier: Math.max(0, affixDef(affixId).tiers.length - t), values: [10] });
const rule = (patch: Partial<LootFilterRule>): LootFilterRule => ({ id: 'r', name: 'Rule', enabled: true, action: 'highlight', ...patch });

function rareBody(): Item {
  const s = newGame(1);
  const item = createItem(s, 'mithril_plate', 80, 'rare', seeded(5));
  item.prefixes = [mod('flat_life', 2)];
  item.suffixes = [mod('fire_res', 1), mod('cold_res', 4)];
  delete item.fractured;
  return item;
}

describe('full loot-filter conditions', () => {
  it('matches base types, required level, rarity and slot', () => {
    const item = rareBody();
    expect(ruleMatchesItem(rule({ baseIds: ['mithril_plate'] }), item)).toBe(true);
    expect(ruleMatchesItem(rule({ baseIds: ['plate_vest', 'chainmail'] }), item)).toBe(false);
    expect(ruleMatchesItem(rule({ minReqLevel: 30, maxReqLevel: 40 }), item)).toBe(true); // Mithril Plate needs level 32
    expect(ruleMatchesItem(rule({ minReqLevel: 33 }), item)).toBe(false);
    expect(ruleMatchesItem(rule({ slots: ['body'], rarities: ['rare'] }), item)).toBe(true);
    expect(ruleMatchesItem(rule({ slots: ['ring'] }), item)).toBe(false);
  });

  it('matches "must have" modifier groups: any, all, at least N, with a minimum tier', () => {
    const item = rareBody(); // Life T2, Fire res T1, Cold res T4
    const res = ['fire_res', 'cold_res', 'light_res'];
    expect(ruleMatchesItem(rule({ modGroups: [{ ids: res, mode: 'any' }] }), item)).toBe(true);
    expect(ruleMatchesItem(rule({ modGroups: [{ ids: res, mode: 'all' }] }), item)).toBe(false);
    expect(ruleMatchesItem(rule({ modGroups: [{ ids: res, mode: 'count', count: 2 }] }), item)).toBe(true);
    expect(ruleMatchesItem(rule({ modGroups: [{ ids: res, mode: 'count', count: 3 }] }), item)).toBe(false);
    // Only the T1 fire res counts at "T3 or better".
    expect(ruleMatchesItem(rule({ modGroups: [{ ids: res, mode: 'count', count: 2, tier: 3 }] }), item)).toBe(false);
    expect(ruleMatchesItem(rule({ modGroups: [{ ids: res, mode: 'count', count: 1, tier: 3 }] }), item)).toBe(true);
    // Several groups must all match: Life AND 2 of the resistances.
    const both = rule({ modGroups: [{ ids: ['flat_life'], mode: 'any' }, { ids: res, mode: 'count', count: 2 }] });
    expect(ruleMatchesItem(both, item)).toBe(true);
    expect(ruleMatchesItem({ ...both, modGroups: [{ ids: ['flat_life'], mode: 'any', tier: 1 }, { ids: res, mode: 'count', count: 2 }] }, item)).toBe(false);
  });

  it('matches prefix, suffix and total modifier counts', () => {
    const item = rareBody(); // 1 prefix, 2 suffixes
    expect(ruleMatchesItem(rule({ minPrefixes: 1, maxPrefixes: 1, minSuffixes: 2 }), item)).toBe(true);
    expect(ruleMatchesItem(rule({ minPrefixes: 2 }), item)).toBe(false);
    expect(ruleMatchesItem(rule({ maxSuffixes: 1 }), item)).toBe(false);
    expect(ruleMatchesItem(rule({ minMods: 3, maxMods: 3 }), item)).toBe(true);
    expect(ruleMatchesItem(rule({ minMods: 4 }), item)).toBe(false);
  });

  it('requires or forbids item flags such as fractured', () => {
    const item = rareBody();
    expect(ruleMatchesItem(rule({ flags: { fractured: true } }), item)).toBe(false);
    expect(ruleMatchesItem(rule({ flags: { fractured: false } }), item)).toBe(true);
    item.suffixes[0] = { ...item.suffixes[0], fractured: true };
    item.fractured = 'fire_res';
    expect(ruleMatchesItem(rule({ flags: { fractured: true } }), item)).toBe(true);
    expect(ruleMatchesItem(rule({ flags: { crafted: true } }), item)).toBe(false);
    item.prefixes[0] = { ...item.prefixes[0], crafted: true };
    expect(ruleMatchesItem(rule({ flags: { crafted: true, fractured: true } }), item)).toBe(true);
  });

  it('keeps item tier, weapon family, defence type and value conditions working', () => {
    const s = newGame(1);
    const sword = createItem(s, 'steel_longsword', 40, 'magic', seeded(8), undefined, 3);
    expect(ruleMatchesItem(rule({ weaponFamilies: ['sword'], minItemTier: 2, maxItemTier: 3 }), sword)).toBe(true);
    expect(ruleMatchesItem(rule({ weaponFamilies: ['axe'] }), sword)).toBe(false);
    expect(ruleMatchesItem(rule({ maxItemTier: 2 }), sword)).toBe(false);
    const body = rareBody();
    expect(ruleMatchesItem(rule({ armourDefences: ['str'] }), body)).toBe(true);
    expect(ruleMatchesItem(rule({ armourDefences: ['dex'] }), body)).toBe(false);
  });

  it('describes a rule in plain words', () => {
    const text = describeRule(rule({
      rarities: ['rare'], slots: ['body'], minIlvl: 75,
      modGroups: [{ ids: ['flat_life'], mode: 'any' }, { ids: ['fire_res', 'cold_res', 'light_res'], mode: 'count', count: 2 }],
    }));
    expect(text).toBe('Rare body armour, ilvl 75+, has maximum Life AND 2 of Fire Resistance/Cold Resistance/Lightning Resistance → Highlight');
    expect(describeRule(rule({ baseIds: ['iron_ring'], action: 'hide', flags: { fractured: false } }))).toBe('Iron Ring, not fractured → Hide');
  });
});

describe('hidden drops are left behind', () => {
  const hideNormals = (s: ReturnType<typeof newGame>) => {
    s.settings.lootFilter!.rules = [{ id: 'hide', name: 'Hide normals', enabled: true, rarities: ['normal'], action: 'hide' }];
  };

  it('never reaches the ground, takes no room there and gives no dust', () => {
    const s = newGame(1);
    hideNormals(s);
    // a full inventory, so kept drops spill onto the (full) ground pile
    s.inventory = Array.from({ length: bagCap(s) }, (_, i) => createItem(s, 'rusted_sword', 10, 'magic', seeded(500 + i)));
    s.ground = Array.from({ length: GROUND_CAP }, (_, i) => ({ ...createItem(s, 'rusted_sword', 10, 'magic', seeded(i)) }));
    const oldest = s.ground[0].uid;
    const dust = s.account.bank.arcane_dust ?? 0;
    const events: GameEvent[] = [];
    const ctx = makeCtx(seeded(1), 0, events);
    placeItem(s, ctx, createItem(s, 'rusted_sword', 10, 'normal', seeded(99)));
    expect(s.ground).toHaveLength(GROUND_CAP);
    expect(s.ground[0].uid).toBe(oldest); // nothing pushed off the full pile
    expect(s.account.bank.arcane_dust ?? 0).toBe(dust);
    expect(s.lifetime.hiddenByFilter).toBe(1);
    expect(events).toContainEqual(expect.objectContaining({ t: 'loot', hidden: true }));

    placeItem(s, ctx, createItem(s, 'rusted_sword', 10, 'magic', seeded(100)));
    expect(s.ground.at(-1)!.rarity).toBe('magic'); // shown drops still land as before
  });

  it('applies the same way to time-away loot', () => {
    const s = newGame(1);
    hideNormals(s);
    const ctx = { ...makeCtx(seeded(2)), offline: true };
    const dust = s.account.bank.arcane_dust ?? 0;
    placeItem(s, ctx, createItem(s, 'rusted_sword', 10, 'normal', seeded(3)));
    expect(s.offlineHaul).toHaveLength(0);
    expect(s.ground).toHaveLength(0);
    expect(s.account.bank.arcane_dust ?? 0).toBe(dust);
    expect(ctx.events).toContainEqual(expect.objectContaining({ t: 'loot', hidden: true }));
  });

  it('keeps the time-away "hidden" count when two catch-ups are merged', () => {
    const base = simulateOffline(newGame(1), makeCtx(seeded(12)), 0);
    expect(mergeOffline({ ...base, hiddenItems: 3 }, { ...base, hiddenItems: 4 }).hiddenItems).toBe(7);
    expect(mergeOffline(base, { ...base, hiddenItems: 2 }).hiddenItems).toBe(2);
  });

  it('presets hide the same way', () => {
    const s = newGame(1);
    s.settings.lootFilter!.overrides.normal_gear = 'hide';
    placeItem(s, makeCtx(seeded(4)), createItem(s, 'rusted_sword', 10, 'normal', seeded(5)));
    expect(s.inventory).toHaveLength(0);
  });

  it('never hides uniques', () => {
    const s = newGame(1);
    s.settings.lootFilter!.rules = [{ id: 'all', name: 'Hide all', enabled: true, action: 'hide' }];
    const unique = createUnique(s, 'bloodthirst', 20, seeded(6));
    expect(evaluateLootFilter(s, unique).visible).toBe(true);
    placeItem(s, makeCtx(seeded(7)), unique);
    expect(s.inventory).toHaveLength(1);
  });

  it('keeps drops an auto-salvage rule matches until salvage is unlocked', () => {
    const s = newGame(1);
    s.settings.lootFilter!.rules = [{ id: 'sal', name: 'Salvage rares', enabled: true, rarities: ['rare'], action: 'auto_salvage' }];
    const dust = s.account.bank.arcane_dust ?? 0;
    placeItem(s, makeCtx(seeded(8)), createItem(s, 'rusted_sword', 10, 'rare', seeded(9)));
    expect(s.inventory).toHaveLength(1);
    expect(s.account.bank.arcane_dust ?? 0).toBe(dust);
  });
});

describe('older filters keep working', () => {
  it('moves a saved "any of these modifiers" rule into a must-have group on load, matching the same items', () => {
    const s = newGame(1);
    const old = { id: 'old', name: 'Life gear', enabled: true, modIds: ['flat_life'], action: 'highlight', highlightColor: '#56ccf2' } as LootFilterRule;
    s.settings.lootFilter!.rules = [old, { id: 'plain', name: 'Plain', enabled: true, rarities: ['magic'], action: 'show' }];
    const item = rareBody();
    expect(ruleMatchesItem(old, item)).toBe(true);

    const loaded = deserialize(serialize(s));
    const [first, second] = loaded.settings.lootFilter!.rules;
    expect(first.modIds).toBeUndefined();
    expect(first.modGroups).toEqual([{ ids: ['flat_life'], mode: 'any' }]);
    expect(ruleMatchesItem(first, item)).toBe(true);
    expect(second).toMatchObject({ id: 'plain', rarities: ['magic'] });
  });

  it('imports version-1 share codes made before the full filter', () => {
    const v1 = 'POI-LF1:' + btoa(JSON.stringify({ v: 1, rules: [{ id: 'a', name: 'Old', enabled: true, modIds: ['fire_res', 'cold_res'], minIlvl: 60, action: 'sound' }] }));
    const result = importLootFilterCode(v1);
    expect(result).toEqual({ ok: true, rules: [{ id: 'a', name: 'Old', enabled: true, modGroups: [{ ids: ['fire_res', 'cold_res'], mode: 'any' }], minIlvl: 60, action: 'sound' }] });
  });

  it('round-trips every new condition through a share code and rejects bad ones', () => {
    const full: LootFilterRule = rule({
      baseIds: ['mithril_plate', 'iron_ring'], rarities: ['rare'], slots: ['body', 'ring'], minIlvl: 70, maxIlvl: 90, minReqLevel: 20, maxReqLevel: 60,
      modGroups: [{ ids: ['flat_life'], mode: 'any', tier: 2 }, { ids: ['fire_res', 'cold_res', 'light_res'], mode: 'count', count: 2 }],
      minPrefixes: 1, maxPrefixes: 3, minSuffixes: 2, maxSuffixes: 3, minMods: 3, maxMods: 6, flags: { fractured: false, crafted: true },
      minItemTier: 2, maxItemTier: 5, weaponFamilies: ['sword'], armourDefences: ['str'], matchClass: true, highlightColor: '#bb6bd9',
    });
    const s = newGame(1);
    s.settings.lootFilter!.rules = [full];
    expect(importLootFilterCode(exportLootFilterCode(s.settings.lootFilter!))).toEqual({ ok: true, rules: [full] });

    const code = (rules: unknown[]) => 'POI-LF1:' + btoa(JSON.stringify({ v: 2, rules }));
    expect(importLootFilterCode(code([{ id: 'x', name: 'x', action: 'show', baseIds: ['not_a_base'] }]))).toMatchObject({ ok: false, error: expect.stringContaining('base types') });
    expect(importLootFilterCode(code([{ id: 'x', name: 'x', action: 'show', modGroups: [{ ids: ['flat_life'], mode: 'most' }] }]))).toMatchObject({ ok: false, error: expect.stringContaining('modifier group') });
    expect(importLootFilterCode(code([{ id: 'x', name: 'x', action: 'show', flags: { cursed: true } }]))).toMatchObject({ ok: false, error: expect.stringContaining('item flags') });
    expect(importLootFilterCode(code([{ id: 'x', name: 'x', action: 'show', minMods: 5, maxMods: 2 }]))).toMatchObject({ ok: false, error: expect.stringContaining('minimum above') });
  });

  it('keeps gear already sitting on the ground from before the change', () => {
    const s = newGame(1);
    s.ground = [createItem(s, 'rusted_sword', 10, 'normal', seeded(11))];
    s.settings.lootFilter!.overrides.normal_gear = 'hide';
    const loaded = deserialize(serialize(s));
    expect(loaded.ground).toHaveLength(1);
  });
});

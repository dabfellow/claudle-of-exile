import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/state';
import { makeCtx } from '../src/engine/context';
import { seeded } from '../src/engine/rng';
import { createItem, createUnique } from '../src/engine/items';
import { placeItem } from '../src/engine/loot';
import {
  defaultLootFilters,
  saveLootFilter,
  setActiveLootFilter,
  deleteLootFilter,
  shouldSalvageByFilter,
  type CustomLootFilter,
} from '../src/engine/lootFilter';

const ctx = (seed = 1) => makeCtx(seeded(seed));

describe('custom loot filter engine', () => {
  it('default filters are defined and contain sensible presets', () => {
    const defaults = defaultLootFilters();
    expect(defaults.length).toBeGreaterThanOrEqual(3);
    expect(defaults.some((f) => f.id === 'class_gear_only')).toBe(true);
    expect(defaults.some((f) => f.id === 'endgame_rares')).toBe(true);
    expect(defaults.some((f) => f.id === 'salvage_junk')).toBe(true);
  });

  it('keeps matching items when in keep mode, and salvages non-matching', () => {
    const s = newGame(1, { name: 'W', classId: 'warrior' });
    const c = ctx();

    const customFilter: CustomLootFilter = {
      id: 'swords_only',
      name: 'Swords Only',
      mode: 'keep',
      rules: [
        {
          id: 'r1',
          slots: ['weapon'],
          weaponFamilies: ['sword'],
        },
      ],
    };

    const sword = createItem(s, 'rusted_sword', 1, 'rare', c.rng);
    const bow = createItem(s, 'short_bow', 1, 'rare', c.rng);

    expect(shouldSalvageByFilter(customFilter, sword, s.character.classId)).toBe(false);
    expect(shouldSalvageByFilter(customFilter, bow, s.character.classId)).toBe(true);
  });

  it('salvages matching items when in salvage mode, and keeps non-matching', () => {
    const s = newGame(1, { name: 'W', classId: 'warrior' });
    const c = ctx();

    const salvageFilter: CustomLootFilter = {
      id: 'salvage_normal_gear',
      name: 'Salvage Normal Items',
      mode: 'salvage',
      rules: [
        {
          id: 'r1',
          rarities: ['normal'],
        },
      ],
    };

    const normalItem = createItem(s, 'rusted_sword', 1, 'normal', c.rng);
    const rareItem = createItem(s, 'rusted_sword', 1, 'rare', c.rng);

    expect(shouldSalvageByFilter(salvageFilter, normalItem, s.character.classId)).toBe(true);
    expect(shouldSalvageByFilter(salvageFilter, rareItem, s.character.classId)).toBe(false);
  });

  it('never auto-salvages unique items under any custom filter rule', () => {
    const s = newGame(1, { name: 'W', classId: 'warrior' });
    const c = ctx();

    const aggressiveFilter: CustomLootFilter = {
      id: 'salvage_all',
      name: 'Salvage All',
      mode: 'salvage',
      rules: [{ id: 'r1' }], // matches everything
    };

    const uniqueItem = createUnique(s, 'castaways_kerchief', 1, c.rng);
    expect(shouldSalvageByFilter(aggressiveFilter, uniqueItem, s.character.classId)).toBe(false);

    // Also in placeItem
    s.settings.activeLootFilterId = 'salvage_all';
    s.settings.customLootFilters = [aggressiveFilter];
    s.account.bank.arcane_dust = 0;
    s.ground = [];

    placeItem(s, c, uniqueItem);
    expect(s.ground).toContain(uniqueItem);
    expect(s.account.bank.arcane_dust).toBe(0);
  });

  it('filters by item tier and min item level', () => {
    const s = newGame(1, { name: 'W', classId: 'warrior' });
    const c = ctx();

    const tierFilter: CustomLootFilter = {
      id: 'high_tier_only',
      name: 'T4+ Only',
      mode: 'keep',
      rules: [
        {
          id: 'r1',
          minTier: 4,
        },
      ],
    };

    const t2Item = createItem(s, 'rusted_sword', 10, 'rare', c.rng, undefined, 2);
    const t4Item = createItem(s, 'rusted_sword', 10, 'rare', c.rng, undefined, 4);

    expect(shouldSalvageByFilter(tierFilter, t2Item, s.character.classId)).toBe(true);
    expect(shouldSalvageByFilter(tierFilter, t4Item, s.character.classId)).toBe(false);
  });

  it('swaps active custom loot filter easily and manages saved filters', () => {
    const s = newGame(1, { name: 'W', classId: 'warrior' });
    expect(s.settings.customLootFilters?.length).toBeGreaterThan(0);
    expect(s.settings.activeLootFilterId).toBeNull();

    setActiveLootFilter(s, 'class_gear_only');
    expect(s.settings.activeLootFilterId).toBe('class_gear_only');

    const myFilter: CustomLootFilter = {
      id: 'my_custom_1',
      name: 'Speed Farm',
      mode: 'keep',
      rules: [{ id: 'r1', minTier: 3 }],
    };

    saveLootFilter(s, myFilter);
    expect(s.settings.customLootFilters?.some((f) => f.id === 'my_custom_1')).toBe(true);

    setActiveLootFilter(s, 'my_custom_1');
    expect(s.settings.activeLootFilterId).toBe('my_custom_1');

    deleteLootFilter(s, 'my_custom_1');
    expect(s.settings.customLootFilters?.some((f) => f.id === 'my_custom_1')).toBe(false);
    expect(s.settings.activeLootFilterId).toBeNull();
  });

  it('placeItem auto-salvages non-matching items into Arcane Dust when active', () => {
    const s = newGame(1, { name: 'W', classId: 'warrior' });
    const c = ctx();

    const filter: CustomLootFilter = {
      id: 'keep_rare_only',
      name: 'Keep Rare Only',
      mode: 'keep',
      rules: [{ id: 'r1', rarities: ['rare'] }],
    };

    saveLootFilter(s, filter);
    setActiveLootFilter(s, 'keep_rare_only');

    s.account.bank.arcane_dust = 0;
    s.ground = [];

    const magicItem = createItem(s, 'rusted_sword', 1, 'magic', c.rng);
    placeItem(s, c, magicItem);

    expect(s.ground).toHaveLength(0);
    expect(s.account.bank.arcane_dust).toBeGreaterThan(0);

    const rareItem = createItem(s, 'rusted_sword', 1, 'rare', c.rng);
    placeItem(s, c, rareItem);

    expect(s.ground).toContain(rareItem);
  });
});

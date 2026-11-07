import { baseDef, WeaponFamily } from '../data/bases';
import { itemMatchesClass } from './items';
import type { GameState, Item, ItemSlotType, Rarity } from './types';

export type ArmourDefenceType = 'str' | 'dex' | 'int' | 'str_dex' | 'str_int' | 'dex_int';

export interface LootFilterRule {
  id: string;
  name?: string;
  /** Slots this rule applies to. If empty or undefined, applies to all slots. */
  slots?: ItemSlotType[];
  /** Rarities this rule applies to. If empty or undefined, applies to all rarities. */
  rarities?: Rarity[];
  /** Minimum item tier (1-5). */
  minTier?: 1 | 2 | 3 | 4 | 5;
  /** Minimum item level (1-100). */
  minIlvl?: number;
  /** Allowed weapon families for weapons. If empty, any. */
  weaponFamilies?: WeaponFamily[];
  /** Allowed defence types for armour/shields. If empty, any. */
  armourDefences?: ArmourDefenceType[];
  /** Must match active character's class defences & weapons */
  matchClass?: boolean;
}

export interface CustomLootFilter {
  id: string;
  name: string;
  /**
   * Action when an item matches any rule:
   * 'keep': If it matches, keep it. Items that don't match any rule are auto-salvaged.
   * 'salvage': If it matches, auto-salvage it. Items that don't match are kept.
   */
  mode: 'keep' | 'salvage';
  rules: LootFilterRule[];
}

export const ARMOUR_DEFENCE_LABELS: Record<ArmourDefenceType, string> = {
  str: 'Armour (STR)',
  dex: 'Evasion (DEX)',
  int: 'Energy Shield (INT)',
  str_dex: 'Armour / Evasion',
  str_int: 'Armour / ES',
  dex_int: 'Evasion / ES',
};

export const ALL_ITEM_SLOTS: ItemSlotType[] = [
  'weapon', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring',
];

export const ALL_WEAPON_FAMILIES: WeaponFamily[] = [
  'sword', 'axe', 'mace', 'dagger', 'bow', 'sceptre', 'wand', 'staff',
];

export const ALL_ARMOUR_DEFENCES: ArmourDefenceType[] = [
  'str', 'dex', 'int', 'str_dex', 'str_int', 'dex_int',
];

export function getArmourDefenceType(tags: string[]): ArmourDefenceType | null {
  const set = new Set(tags);
  if (set.has('str_dex_armour')) return 'str_dex';
  if (set.has('str_int_armour')) return 'str_int';
  if (set.has('dex_int_armour')) return 'dex_int';
  if (set.has('str_armour') || set.has('str_shield')) return 'str';
  if (set.has('dex_armour') || set.has('dex_shield')) return 'dex';
  if (set.has('int_armour') || set.has('int_shield')) return 'int';
  return null;
}

export function ruleMatchesItem(rule: LootFilterRule, item: Item, classId: string): boolean {
  const base = baseDef(item.baseId);

  // Slot check
  if (rule.slots && rule.slots.length > 0 && !rule.slots.includes(base.slot)) {
    return false;
  }

  // Rarity check
  if (rule.rarities && rule.rarities.length > 0 && !rule.rarities.includes(item.rarity)) {
    return false;
  }

  // Tier check
  if (rule.minTier && (item.itemTier ?? 1) < rule.minTier) {
    return false;
  }

  // Ilvl check
  if (rule.minIlvl && item.ilvl < rule.minIlvl) {
    return false;
  }

  // Weapon family check (only checked if item is a weapon)
  if (base.slot === 'weapon' && rule.weaponFamilies && rule.weaponFamilies.length > 0) {
    if (!base.family || !rule.weaponFamilies.includes(base.family)) {
      return false;
    }
  }

  // Armour defence check (only checked if item has armour defence tags)
  if (rule.armourDefences && rule.armourDefences.length > 0) {
    const defType = getArmourDefenceType(base.tags);
    if (defType && !rule.armourDefences.includes(defType)) {
      return false;
    }
  }

  // Class match check
  if (rule.matchClass && !itemMatchesClass(classId, item)) {
    return false;
  }

  return true;
}

/**
 * Evaluates whether an item should be auto-salvaged by custom loot filter.
 * Returns true if the item should be salvaged, false if kept.
 */
export function shouldSalvageByFilter(filter: CustomLootFilter, item: Item, classId: string): boolean {
  if (item.rarity === 'unique') return false; // Uniques are never auto-salvaged by filter
  if (!filter.rules || filter.rules.length === 0) return false;

  const matchesAny = filter.rules.some((rule) => ruleMatchesItem(rule, item, classId));

  if (filter.mode === 'keep') {
    // Mode 'keep': if it matches any rule, keep it (do NOT salvage). If no rules match, salvage it.
    return !matchesAny;
  } else {
    // Mode 'salvage': if it matches any rule, salvage it.
    return matchesAny;
  }
}

/** Default preset filters available for players */
export function defaultLootFilters(): CustomLootFilter[] {
  return [
    {
      id: 'class_gear_only',
      name: 'Class Gear Only',
      mode: 'keep',
      rules: [
        {
          id: 'r1',
          name: 'Class Weapons & Defences',
          matchClass: true,
        },
        {
          id: 'r2',
          name: 'Jewellery (All Classes)',
          slots: ['amulet', 'ring', 'belt'],
        },
      ],
    },
    {
      id: 'endgame_rares',
      name: 'Endgame Rares (T3+)',
      mode: 'keep',
      rules: [
        {
          id: 'r1',
          name: 'High Tier Rares',
          rarities: ['rare'],
          minTier: 3,
        },
        {
          id: 'r2',
          name: 'High Item Level Bases (75+)',
          minIlvl: 75,
        },
        {
          id: 'r3',
          name: 'Jewellery',
          slots: ['amulet', 'ring', 'belt'],
          rarities: ['rare'],
        },
      ],
    },
    {
      id: 'salvage_junk',
      name: 'Salvage Normal & Magic Weapons',
      mode: 'salvage',
      rules: [
        {
          id: 'r1',
          name: 'Normal & Magic Weapons',
          slots: ['weapon'],
          rarities: ['normal', 'magic'],
        },
      ],
    },
  ];
}

/** Ensure loot filters list and active filter state exist on GameState */
export function settleLootFilters(s: GameState): void {
  if (!s.settings.customLootFilters || s.settings.customLootFilters.length === 0) {
    s.settings.customLootFilters = defaultLootFilters();
  }
}

export function saveLootFilter(s: GameState, filter: CustomLootFilter): void {
  settleLootFilters(s);
  const filters = s.settings.customLootFilters!;
  const idx = filters.findIndex((f) => f.id === filter.id);
  if (idx >= 0) {
    filters[idx] = filter;
  } else {
    filters.push(filter);
  }
}

export function deleteLootFilter(s: GameState, filterId: string): void {
  settleLootFilters(s);
  s.settings.customLootFilters = s.settings.customLootFilters!.filter((f) => f.id !== filterId);
  if (s.settings.activeLootFilterId === filterId) {
    s.settings.activeLootFilterId = null;
  }
}

export function setActiveLootFilter(s: GameState, filterId: string | null): void {
  s.settings.activeLootFilterId = filterId;
}

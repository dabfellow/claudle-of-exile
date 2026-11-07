import type { StatKey, Tag } from '../engine/types';

export interface AffixTier {
  ilvl: number;
  /** one [min, max] range per stat */
  ranges: [number, number][];
}

export interface AffixDef {
  id: string;
  kind: 'prefix' | 'suffix';
  /** two mods from the same group can't share an item */
  group: string;
  /** name fragment used for magic item names */
  label: string;
  /** "{0}" / "{1}" are replaced with the rolled values */
  text: string;
  stats: StatKey[];
  weights: Partial<Record<Tag, number>>;
  tiers: AffixTier[];
  /** only appears on uniques, never rolls */
  uniqueOnly?: boolean;
  /** only appears on crafting bench, never rolls */
  benchOnly?: boolean;
  /** every stat takes the first rolled value ("X% increased Armour and Evasion") */
  linked?: boolean;
}

/** item level each tier unlocks at */
export const ILVLS = [1, 8, 16, 25, 35, 45, 55, 68, 80];

/** Build tiers from a list of ranges, one per ilvl breakpoint. */
function single(ranges: [number, number][]): AffixTier[] {
  return ranges.map((r, i) => ({ ilvl: ILVLS[i], ranges: [r] }));
}

/** Build tiers for "Adds X to Y" mods from [minLo, minHi, maxLo, maxHi] tuples. */
function flat(ranges: [number, number, number, number][]): AffixTier[] {
  return ranges.map((r, i) => ({
    ilvl: ILVLS[i],
    ranges: [
      [r[0], r[1]],
      [r[2], r[3]],
    ],
  }));
}

const ARMOUR_ALL: Partial<Record<Tag, number>> = { helmet: 100, body: 100, gloves: 100, boots: 100, shield: 100 };
/** Resistances roll a bit less on armour, so they don't crowd out every other suffix there. */
const RES: Partial<Record<Tag, number>> = { helmet: 40, body: 40, gloves: 40, boots: 40, shield: 40, belt: 80, ring: 80, amulet: 80 };
/** Global % defence and damage mods: jewellery only (armour and weapons roll the local versions). */
const JEWELLERY = (ring: number, amulet: number, belt: number): Partial<Record<Tag, number>> => ({ ring, amulet, belt });
/** Ailment mods: jewellery only. */
const AILMENT = JEWELLERY(40, 40, 40);
const AILMENT_CHANCE = JEWELLERY(40, 30, 30);
/** Hybrid defence mods: more common on their hybrid bases than either single-defence mod (100). */
const HYBRID = 150;

/** Shared tier ranges for mods that scale alike. */
const LOCAL_DEF_PCT: [number, number][] = [[10, 18], [19, 28], [29, 40], [41, 54], [55, 70], [71, 90], [91, 105], [106, 120], [121, 135]];
const HYBRID_DEF_PCT: [number, number][] = [[8, 15], [16, 24], [25, 35], [36, 48], [49, 62], [63, 80], [81, 94], [95, 108], [109, 122]];
const GLOBAL_DEF_PCT: [number, number][] = [[4, 6], [7, 9], [10, 12], [13, 15], [16, 18], [19, 21], [22, 24], [25, 27], [28, 30]];
const FLAT_DEF: [number, number][] = [[6, 12], [13, 28], [29, 50], [51, 80], [81, 120], [121, 170], [171, 230], [231, 300], [301, 380]];
const FLAT_HYBRID_DEF: [number, number][] = [[4, 8], [9, 18], [19, 32], [33, 50], [51, 75], [76, 105], [106, 140], [141, 185], [186, 235]];
const FLAT_HYBRID_ES: [number, number, number, number][] = [
  [4, 8, 2, 5], [9, 18, 5, 10], [19, 32, 10, 16], [33, 50, 16, 23], [51, 75, 23, 31], [76, 105, 32, 42], [106, 140, 43, 54], [141, 185, 55, 67], [186, 235, 68, 82],
];
const ELEMENT_PCT: [number, number][] = [[8, 12], [13, 18], [19, 26], [27, 35], [36, 45], [46, 58], [59, 72], [73, 88], [89, 105]];
const AILMENT_PCT: [number, number][] = [[10, 14], [15, 20], [21, 27], [28, 35], [36, 44], [45, 54], [55, 65], [66, 77], [78, 90]];
const AILMENT_CHANCE_PCT: [number, number][] = [[3, 5], [6, 8], [9, 11], [12, 14], [15, 17], [18, 20], [21, 23], [24, 26], [27, 30]];
const LEECH: [number, number][] = [[5, 6], [7, 8], [9, 10], [11, 13], [14, 16], [17, 19], [20, 23], [24, 26], [27, 30]];
const RES_TIERS: [number, number][] = [[6, 11], [12, 17], [18, 23], [24, 29], [30, 35], [36, 42], [43, 47], [48, 52], [53, 58]];
const ATTR: [number, number][] = [[5, 9], [10, 15], [16, 21], [22, 27], [28, 34], [35, 42], [43, 49], [50, 56], [57, 64]];
const SPEED: [number, number][] = [[3, 4], [5, 7], [8, 10], [11, 13], [14, 16], [17, 20], [21, 23], [24, 26], [27, 30]];
const CRIT_MULTI: [number, number][] = [[8, 12], [13, 17], [18, 22], [23, 28], [29, 34], [35, 40], [41, 46], [47, 52], [53, 58]];
const SMALL_PCT: [number, number][] = [[2, 3], [4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15], [16, 17], [18, 20]];
const THIRTY: [number, number][] = [[3, 5], [6, 8], [9, 11], [12, 14], [15, 17], [18, 20], [21, 23], [24, 26], [27, 30]];

export const AFFIXES: AffixDef[] = [
  // ---------- prefixes: attack damage ----------
  {
    // local on weapons (adds to the weapon's own damage), global on rings, gloves and amulets
    id: 'added_phys', kind: 'prefix', group: 'added_phys', label: 'Glinting', text: 'Adds {0} to {1} Physical Damage',
    stats: ['physMin', 'physMax'], weights: { attack_weapon: 100, ring: 60, gloves: 50, amulet: 40 },
    // raised 50% across the board (2026-11-02), so attackers' weapons pull their weight early and late
    tiers: flat([[2, 3, 5, 8], [3, 6, 9, 14], [6, 11, 15, 23], [9, 15, 24, 35], [14, 21, 36, 50], [18, 29, 48, 68], [24, 36, 63, 87], [30, 45, 81, 111], [38, 56, 102, 138]]),
  },
  {
    id: 'inc_phys', kind: 'prefix', group: 'inc_phys', label: 'Heavy', text: '{0}% increased Physical Damage',
    stats: ['localPhysPct'], weights: { attack_weapon: 100 },
    // raised most at the bottom (about +50%) and the top (about +20%) on 2026-11-02, a little less in between
    tiers: single([[25, 35], [36, 52], [53, 75], [76, 100], [101, 128], [129, 160], [161, 195], [196, 240], [241, 290]]),
  },
  {
    id: 'inc_phys_global', kind: 'prefix', group: 'inc_phys_global', label: 'Brutal', text: '{0}% increased global Physical Damage',
    stats: ['physPct'], weights: JEWELLERY(40, 60, 30),
    tiers: single([[5, 8], [9, 12], [13, 16], [17, 20], [21, 24], [25, 28], [29, 32], [33, 36], [37, 40]]),
  },
  {
    id: 'added_fire', kind: 'prefix', group: 'added_fire', label: 'Heated', text: 'Adds {0} to {1} Fire Damage',
    stats: ['fireMin', 'fireMax'], weights: { attack_weapon: 80, ring: 50, amulet: 40, gloves: 30 },
    tiers: flat([[1, 2, 3, 4], [3, 5, 6, 9], [5, 8, 11, 16], [8, 12, 18, 26], [12, 17, 27, 38], [16, 23, 38, 52], [21, 29, 50, 68], [27, 37, 64, 86], [34, 46, 80, 108]]),
  },
  {
    id: 'added_cold', kind: 'prefix', group: 'added_cold', label: 'Frosted', text: 'Adds {0} to {1} Cold Damage',
    stats: ['coldMin', 'coldMax'], weights: { attack_weapon: 80, ring: 50, amulet: 40, gloves: 30 },
    tiers: flat([[1, 2, 3, 4], [3, 4, 6, 8], [5, 7, 10, 15], [7, 11, 16, 24], [11, 16, 25, 35], [15, 21, 35, 48], [19, 27, 46, 62], [24, 33, 59, 79], [30, 41, 74, 99]]),
  },
  {
    id: 'added_light', kind: 'prefix', group: 'added_light', label: 'Sparking', text: 'Adds {0} to {1} Lightning Damage',
    stats: ['lightMin', 'lightMax'], weights: { attack_weapon: 80, ring: 50, amulet: 40, gloves: 30 },
    tiers: flat([[1, 1, 4, 6], [1, 2, 8, 12], [2, 3, 15, 22], [3, 4, 24, 35], [4, 6, 36, 52], [5, 8, 50, 70], [6, 10, 66, 92], [8, 12, 84, 116], [10, 15, 104, 144]]),
  },
  {
    id: 'inc_elem', kind: 'prefix', group: 'inc_elem', label: 'Prismatic', text: '{0}% increased Elemental Damage',
    stats: ['elemPct'], weights: { attack_weapon: 60, caster_weapon: 60, amulet: 60, ring: 40 },
    tiers: single([[24, 36], [39, 54], [57, 78], [81, 105], [108, 135], [138, 174], [175, 210], [211, 249], [250, 294]]),
  },

  // ---------- prefixes: spell damage ----------
  {
    id: 'spell_damage', kind: 'prefix', group: 'spell_damage', label: 'Runic', text: '{0}% increased Spell Damage',
    stats: ['spellPct'], weights: { caster_weapon: 100, amulet: 50, ring: 30 },
    // top tiers trimmed (2026-11-02): about 10% less at item level 45, rising to 35% less at 80
    tiers: single([[10, 19], [20, 29], [30, 44], [45, 59], [60, 79], [72, 89], [80, 95], [84, 101], [94, 110]]),
  },
  {
    // unlike "Adds X Fire Damage", these count in full for spells (no 70% added-damage effectiveness).
    // Top tiers trimmed like Spell Damage's (2026-11-02), as late wands made spells outrun everything
    id: 'spell_fire', kind: 'prefix', group: 'spell_fire', label: 'Smouldering', text: 'Adds {0} to {1} Fire Damage to Spells',
    stats: ['spellFireMin', 'spellFireMax'], weights: { caster_weapon: 80, ring: 40, amulet: 40 },
    tiers: flat([[1, 2, 2, 4], [2, 4, 5, 8], [4, 6, 9, 14], [6, 10, 15, 22], [10, 14, 23, 32], [12, 17, 29, 40], [14, 19, 34, 46], [15, 22, 38, 51], [18, 25, 44, 59]]),
  },
  {
    id: 'spell_cold', kind: 'prefix', group: 'spell_cold', label: 'Wintry', text: 'Adds {0} to {1} Cold Damage to Spells',
    stats: ['spellColdMin', 'spellColdMax'], weights: { caster_weapon: 80, ring: 40, amulet: 40 },
    tiers: flat([[1, 2, 2, 3], [2, 3, 5, 7], [4, 6, 8, 12], [6, 9, 13, 20], [9, 13, 21, 29], [11, 15, 26, 36], [13, 18, 30, 42], [14, 20, 34, 46], [16, 22, 40, 53]]),
  },
  {
    id: 'spell_light', kind: 'prefix', group: 'spell_light', label: 'Crackling', text: 'Adds {0} to {1} Lightning Damage to Spells',
    stats: ['spellLightMin', 'spellLightMax'], weights: { caster_weapon: 80, ring: 40, amulet: 40 },
    tiers: flat([[1, 1, 3, 5], [1, 2, 7, 10], [2, 3, 12, 18], [2, 4, 20, 29], [3, 5, 30, 43], [4, 6, 37, 52], [4, 6, 43, 61], [5, 7, 48, 67], [5, 8, 56, 78]]),
  },
  {
    id: 'added_chaos', kind: 'prefix', group: 'added_chaos', label: 'Tainted', text: 'Adds {0} to {1} Chaos Damage to Attacks',
    stats: ['chaosMin', 'chaosMax'], weights: { attack_weapon: 50, ring: 30, amulet: 25, gloves: 20 },
    tiers: flat([[1, 2, 3, 4], [3, 5, 6, 9], [5, 8, 11, 16], [8, 12, 18, 26], [12, 17, 27, 38], [16, 23, 38, 52], [21, 29, 50, 68], [27, 37, 64, 86], [34, 46, 80, 108]]),
  },
  {
    id: 'inc_chaos', kind: 'prefix', group: 'inc_chaos', label: 'Blighted', text: '{0}% increased Chaos Damage',
    stats: ['chaosPct'], weights: { attack_weapon: 30, amulet: 25, ring: 25 }, tiers: single(ELEMENT_PCT),
  },
  {
    id: 'inc_fire', kind: 'prefix', group: 'inc_fire', label: 'Blazing', text: '{0}% increased Fire Damage',
    stats: ['firePct'], weights: { caster_weapon: 60, attack_weapon: 30, amulet: 40, ring: 40 }, tiers: single(ELEMENT_PCT),
  },
  {
    id: 'inc_cold', kind: 'prefix', group: 'inc_cold', label: 'Glacial', text: '{0}% increased Cold Damage',
    stats: ['coldPct'], weights: { caster_weapon: 60, attack_weapon: 30, amulet: 40, ring: 40 }, tiers: single(ELEMENT_PCT),
  },
  {
    id: 'inc_light', kind: 'prefix', group: 'inc_light', label: 'Thundering', text: '{0}% increased Lightning Damage',
    stats: ['lightPct'], weights: { caster_weapon: 60, attack_weapon: 30, amulet: 40, ring: 40 }, tiers: single(ELEMENT_PCT),
  },

  // ---------- prefixes: ailments (jewellery only) ----------
  { id: 'inc_bleed', kind: 'prefix', group: 'inc_bleed', label: 'Lacerating', text: '{0}% increased Bleed Damage', stats: ['bleedPct'], weights: AILMENT, tiers: single(AILMENT_PCT) },
  { id: 'inc_poison', kind: 'prefix', group: 'inc_poison', label: 'Venomous', text: '{0}% increased Poison Damage', stats: ['poisonPct'], weights: AILMENT, tiers: single(AILMENT_PCT) },
  { id: 'inc_ignite', kind: 'prefix', group: 'inc_ignite', label: 'Searing', text: '{0}% increased Burn and Ignite Damage', stats: ['ignitePct'], weights: AILMENT, tiers: single(AILMENT_PCT) },
  {
    id: 'inc_ailment', kind: 'prefix', group: 'inc_ailment', label: 'Festering', text: '{0}% increased damage with Bleed, Poison, Burn and Ignite',
    stats: ['ailmentPct'], weights: JEWELLERY(20, 40, 30),
    tiers: single([[6, 9], [10, 13], [14, 18], [19, 23], [24, 29], [30, 35], [36, 42], [43, 49], [50, 57]]),
  },

  // ---------- prefixes: life and mana ----------
  {
    id: 'flat_life', kind: 'prefix', group: 'flat_life', label: 'Healthy', text: '+{0} to maximum Life',
    stats: ['life'], weights: { ...ARMOUR_ALL, belt: 120, amulet: 80, ring: 80 },
    tiers: single([[5, 10], [11, 20], [21, 32], [33, 46], [47, 62], [63, 80], [81, 100], [101, 122], [123, 145]]),
  },
  {
    id: 'inc_life', kind: 'prefix', group: 'inc_life', label: 'Vigorous', text: '{0}% increased maximum Life',
    stats: ['lifePct'], weights: { body: 60, belt: 60, amulet: 40 },
    tiers: single([[3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 15], [16, 17], [18, 19], [20, 22]]),
  },
  {
    id: 'flat_mana', kind: 'prefix', group: 'flat_mana', label: 'Beryl', text: '+{0} to maximum Mana',
    stats: ['mana'], weights: { ring: 100, amulet: 100, caster_weapon: 80, helmet: 60, belt: 40, attack_weapon: 20 },
    tiers: single([[10, 19], [20, 29], [30, 39], [40, 54], [55, 69], [70, 89], [90, 109], [110, 134], [135, 160]]),
  },
  {
    id: 'inc_mana', kind: 'prefix', group: 'inc_mana', label: 'Azure', text: '{0}% increased maximum Mana',
    stats: ['manaPct'], weights: { amulet: 50, caster_weapon: 40, ring: 30, int_armour: 30 },
    tiers: single([[5, 7], [8, 10], [11, 13], [14, 16], [17, 19], [20, 22], [23, 25], [26, 28], [29, 32]]),
  },
  {
    id: 'es_and_mana', kind: 'prefix', group: 'es_and_mana', label: 'Mystic', text: '+{0} to maximum Energy Shield and +{1} to maximum Mana',
    stats: ['energyShield', 'mana'], weights: { int_armour: 60, amulet: 40, caster_weapon: 40, ring: 30 },
    tiers: flat([[3, 6, 5, 10], [7, 12, 11, 18], [13, 19, 19, 27], [20, 28, 28, 38], [29, 38, 39, 50], [39, 50, 51, 64], [51, 63, 65, 80], [64, 78, 81, 98], [79, 95, 99, 118]]),
  },

  // ---------- prefixes: defences ----------
  // On armour pieces and shields, flat and % defences are local: they change only that piece's own value.
  // Rings, amulets and belts roll the "global" versions, which scale every piece.
  {
    id: 'flat_armour', kind: 'prefix', group: 'flat_armour', label: 'Lacquered', text: '+{0} to Armour',
    stats: ['armour'], weights: { str_armour: 100, belt: 60 }, tiers: single(FLAT_DEF),
  },
  {
    id: 'inc_armour', kind: 'prefix', group: 'inc_armour', label: 'Reinforced', text: '{0}% increased Armour',
    stats: ['localArmourPct'], weights: { str_armour: 100 }, tiers: single(LOCAL_DEF_PCT),
  },
  {
    id: 'inc_armour_global', kind: 'prefix', group: 'inc_armour_global', label: 'Bulwark', text: '{0}% increased global Armour',
    stats: ['armourPct'], weights: JEWELLERY(30, 40, 50), tiers: single(GLOBAL_DEF_PCT),
  },
  {
    id: 'flat_evasion', kind: 'prefix', group: 'flat_evasion', label: 'Agile', text: '+{0} to Evasion Rating',
    stats: ['evasion'], weights: { dex_armour: 100, ring: 30 }, tiers: single(FLAT_DEF),
  },
  {
    id: 'inc_evasion', kind: 'prefix', group: 'inc_evasion', label: 'Shadowy', text: '{0}% increased Evasion Rating',
    stats: ['localEvasionPct'], weights: { dex_armour: 100 }, tiers: single(LOCAL_DEF_PCT),
  },
  {
    id: 'inc_evasion_global', kind: 'prefix', group: 'inc_evasion_global', label: 'Elusive', text: '{0}% increased global Evasion Rating',
    stats: ['evasionPct'], weights: JEWELLERY(40, 40, 30), tiers: single(GLOBAL_DEF_PCT),
  },
  {
    id: 'flat_es', kind: 'prefix', group: 'flat_es', label: 'Shimmering', text: '+{0} to maximum Energy Shield',
    stats: ['energyShield'], weights: { int_armour: 100, amulet: 40, ring: 30, belt: 20 },
    tiers: single([[4, 8], [9, 16], [17, 26], [27, 38], [39, 52], [53, 70], [71, 90], [91, 112], [113, 136]]),
  },
  {
    id: 'inc_es', kind: 'prefix', group: 'inc_es', label: 'Glowing', text: '{0}% increased Energy Shield',
    stats: ['localEsPct'], weights: { int_armour: 100 }, tiers: single(LOCAL_DEF_PCT),
  },
  {
    id: 'inc_es_global', kind: 'prefix', group: 'inc_es_global', label: 'Radiant', text: '{0}% increased global Energy Shield',
    stats: ['energyShieldPct'], weights: JEWELLERY(30, 50, 30), tiers: single(GLOBAL_DEF_PCT),
  },
  // hybrid defences: local, and only on hybrid bases
  {
    id: 'inc_armour_evasion', kind: 'prefix', group: 'inc_armour_evasion', label: 'Scaled', text: '{0}% increased Armour and Evasion',
    stats: ['localArmourPct', 'localEvasionPct'], linked: true, weights: { str_dex_armour: HYBRID }, tiers: single(HYBRID_DEF_PCT),
  },
  {
    id: 'inc_armour_es', kind: 'prefix', group: 'inc_armour_es', label: 'Blessed', text: '{0}% increased Armour and Energy Shield',
    stats: ['localArmourPct', 'localEsPct'], linked: true, weights: { str_int_armour: HYBRID }, tiers: single(HYBRID_DEF_PCT),
  },
  {
    id: 'inc_evasion_es', kind: 'prefix', group: 'inc_evasion_es', label: 'Veiled', text: '{0}% increased Evasion and Energy Shield',
    stats: ['localEvasionPct', 'localEsPct'], linked: true, weights: { dex_int_armour: HYBRID }, tiers: single(HYBRID_DEF_PCT),
  },
  {
    id: 'flat_armour_evasion', kind: 'prefix', group: 'flat_armour_evasion', label: 'Studded', text: '+{0} to Armour and Evasion Rating',
    stats: ['armour', 'evasion'], linked: true, weights: { str_dex_armour: HYBRID }, tiers: single(FLAT_HYBRID_DEF),
  },
  {
    id: 'flat_armour_es', kind: 'prefix', group: 'flat_armour_es', label: 'Consecrated', text: '+{0} to Armour and +{1} to maximum Energy Shield',
    stats: ['armour', 'energyShield'], weights: { str_int_armour: HYBRID }, tiers: flat(FLAT_HYBRID_ES),
  },
  {
    id: 'flat_evasion_es', kind: 'prefix', group: 'flat_evasion_es', label: 'Shrouded', text: '+{0} to Evasion Rating and +{1} to maximum Energy Shield',
    stats: ['evasion', 'energyShield'], weights: { dex_int_armour: HYBRID }, tiers: flat(FLAT_HYBRID_ES),
  },

  // ---------- prefixes: utility ----------
  {
    id: 'flask_effect', kind: 'prefix', group: 'flask_effect', label: "Alchemist's", text: '{0}% increased Flask Effect',
    stats: ['flaskEffect'], weights: { belt: 80 },
    tiers: single([[4, 7], [8, 11], [12, 15], [16, 20], [21, 25], [26, 30], [31, 35], [36, 40], [41, 45]]),
  },
  {
    id: 'item_rarity', kind: 'prefix', group: 'item_rarity', label: "Plunderer's", text: '{0}% increased Rarity of Items found',
    stats: ['itemRarity'], weights: { helmet: 60, boots: 60, ring: 60, amulet: 60 },
    tiers: single([[24, 40], [44, 60], [64, 80], [84, 100], [104, 120], [124, 144], [145, 165], [166, 188], [189, 212]]),
  },
  {
    id: 'melee_damage', kind: 'prefix', group: 'melee_damage', label: 'Brawling', text: '{0}% increased Melee Damage',
    stats: ['meleePct'], weights: { attack_weapon: 55, gloves: 45, belt: 30 }, tiers: single(ELEMENT_PCT),
  },
  {
    id: 'projectile_damage', kind: 'prefix', group: 'projectile_damage', label: 'Ballistic', text: '{0}% increased Projectile Damage',
    stats: ['projectilePct'], weights: { attack_weapon: 45, gloves: 40, amulet: 35 }, tiers: single(ELEMENT_PCT),
  },
  {
    id: 'minion_damage', kind: 'prefix', group: 'minion_damage', label: 'Commanding', text: '{0}% increased Minion Damage',
    stats: ['minionPct'], weights: { caster_weapon: 55, helmet: 55, amulet: 45 }, tiers: single(ELEMENT_PCT),
  },
  {
    id: 'minion_life', kind: 'prefix', group: 'minion_life', label: 'Shepherding', text: '{0}% increased Minion maximum Life',
    stats: ['minionLifePct'], weights: { helmet: 55, shield: 45, amulet: 35 }, tiers: single(ELEMENT_PCT),
  },
  {
    id: 'life_flask_recovery', kind: 'prefix', group: 'life_flask_recovery', label: "Surgeon's", text: '{0}% increased Life Flask Recovery',
    stats: ['lifeFlaskRecovery'], weights: { belt: 70 }, tiers: single(THIRTY),
  },
  {
    id: 'mana_flask_recovery', kind: 'prefix', group: 'mana_flask_recovery', label: "Scholar's", text: '{0}% increased Mana Flask Recovery',
    stats: ['manaFlaskRecovery'], weights: { belt: 70 }, tiers: single(THIRTY),
  },

  // ---------- suffixes: attack ----------
  {
    id: 'attack_speed', kind: 'suffix', group: 'attack_speed', label: 'of Skill', text: '{0}% increased Attack Speed',
    stats: ['attackSpeedPct'], weights: { attack_weapon: 100, gloves: 60, ring: 30 }, tiers: single(SPEED),
  },
  {
    id: 'crit_chance', kind: 'suffix', group: 'crit_chance', label: 'of Needling', text: '{0}% increased Critical Strike Chance',
    stats: ['critChancePct'], weights: { attack_weapon: 100, amulet: 80, ring: 30 },
    tiers: single([[10, 14], [15, 19], [20, 24], [25, 29], [30, 34], [35, 40], [41, 47], [48, 54], [55, 62]]),
  },
  {
    id: 'crit_multi', kind: 'suffix', group: 'crit_multi', label: 'of Ire', text: '+{0}% to Critical Strike Multiplier',
    stats: ['critMulti'], weights: { attack_weapon: 100, amulet: 80, ring: 40, gloves: 30 }, tiers: single(CRIT_MULTI),
  },
  {
    id: 'accuracy', kind: 'suffix', group: 'accuracy', label: 'of Calm', text: '+{0} to Accuracy Rating',
    stats: ['accuracy'], weights: { attack_weapon: 60, gloves: 60, ring: 40, helmet: 30 },
    tiers: single([[5, 15], [16, 40], [41, 80], [81, 130], [131, 200], [201, 300], [301, 400], [401, 520], [521, 650]]),
  },
  {
    // was "% of Attack Damage Leeched as Life"; now the physical part of any hit, attack or spell
    id: 'life_leech', kind: 'suffix', group: 'life_leech', label: 'of the Leech', text: '{0}% of Physical Damage Leeched as Life',
    stats: ['physLeech'], weights: { attack_weapon: 60, ring: 40, amulet: 40, gloves: 30 }, tiers: single(LEECH),
  },
  {
    id: 'elem_leech', kind: 'suffix', group: 'elem_leech', label: 'of the Lamprey', text: '{0}% of Elemental Damage Leeched as Life',
    stats: ['elemLeech'], weights: { caster_weapon: 60, attack_weapon: 40, ring: 40, amulet: 40, gloves: 30 }, tiers: single(LEECH),
  },

  // ---------- suffixes: spells ----------
  {
    id: 'cast_speed', kind: 'suffix', group: 'cast_speed', label: 'of Talent', text: '{0}% increased Cast Speed',
    stats: ['castSpeedPct'], weights: { caster_weapon: 100, amulet: 40, ring: 30 }, tiers: single(SPEED),
  },
  {
    id: 'spell_crit', kind: 'suffix', group: 'spell_crit', label: 'of Menace', text: '{0}% increased Critical Strike Chance with Spells',
    stats: ['spellCritPct'], weights: { caster_weapon: 100, amulet: 50, ring: 20 },
    tiers: single([[20, 29], [30, 39], [40, 49], [50, 59], [60, 69], [70, 79], [80, 89], [90, 99], [100, 115]]),
  },
  {
    id: 'spell_crit_multi', kind: 'suffix', group: 'spell_crit_multi', label: 'of Destruction', text: '+{0}% to Critical Strike Multiplier with Spells',
    stats: ['spellCritMulti'], weights: { caster_weapon: 80, amulet: 50, ring: 30 }, tiers: single(CRIT_MULTI),
  },
  {
    id: 'mana_cost', kind: 'suffix', group: 'mana_cost', label: 'of Thrift', text: '{0}% reduced Mana Cost of Skills',
    stats: ['manaCostReduction'], weights: { caster_weapon: 50, amulet: 40, ring: 40, helmet: 20 }, tiers: single(SMALL_PCT),
  },
  {
    id: 'mana_as_es', kind: 'suffix', group: 'mana_as_es', label: 'of the Ward', text: 'Gain {0}% of maximum Mana as extra maximum Energy Shield',
    stats: ['manaAsEs'], weights: { amulet: 40, int_armour: 30, caster_weapon: 30 }, tiers: single(SMALL_PCT),
  },
  {
    id: 'spell_block', kind: 'suffix', group: 'spell_block', label: 'of Abjuration', text: '{0}% chance to Block Spells',
    stats: ['spellBlock'], weights: { shield: 60, caster_weapon: 30, amulet: 20 },
    tiers: single([[2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 12]]),
  },
  {
    id: 'mana_regen', kind: 'suffix', group: 'mana_regen', label: 'of Excitement', text: '{0}% increased Mana Regeneration Rate',
    stats: ['manaRegenPct'], weights: { ring: 80, amulet: 80, caster_weapon: 60, helmet: 40 },
    tiers: single([[10, 19], [20, 29], [30, 39], [40, 49], [50, 59], [60, 69], [70, 79], [80, 89], [90, 100]]),
  },
  {
    id: 'mana_regen_flat', kind: 'suffix', group: 'mana_regen_flat', label: 'of Clarity', text: 'Regenerate {0} Mana per second',
    stats: ['manaRegenFlat'], weights: { ring: 80, amulet: 80, caster_weapon: 50, helmet: 40, belt: 30 },
    tiers: single([[1, 2], [2, 3], [3, 5], [5, 7], [7, 10], [10, 14], [14, 18], [18, 23], [23, 29]]),
  },
  {
    id: 'es_recharge', kind: 'suffix', group: 'es_recharge', label: 'of Renewal', text: '{0}% faster Energy Shield Recharge',
    stats: ['esRechargePct'], weights: { int_armour: 40, amulet: 40, belt: 40 },
    tiers: single([[8, 12], [13, 18], [19, 25], [26, 33], [34, 42], [43, 52], [53, 62], [63, 72], [73, 85]]),
  },

  // ---------- suffixes: ailments (jewellery only) ----------
  {
    id: 'ailment_duration', kind: 'suffix', group: 'ailment_duration', label: 'of Lingering', text: '{0}% longer Bleed, Poison, Burn and Ignite',
    stats: ['ailmentDuration'], weights: JEWELLERY(30, 40, 40),
    tiers: single([[5, 7], [8, 10], [11, 13], [14, 16], [17, 19], [20, 22], [23, 25], [26, 28], [29, 32]]),
  },
  { id: 'bleed_chance', kind: 'suffix', group: 'bleed_chance', label: 'of Rending', text: 'Attacks have {0}% chance to cause Bleeding', stats: ['bleedOnHit'], weights: AILMENT_CHANCE, tiers: single(AILMENT_CHANCE_PCT) },
  { id: 'poison_chance', kind: 'suffix', group: 'poison_chance', label: 'of the Asp', text: 'Hits have {0}% chance to Poison', stats: ['poisonOnHit'], weights: AILMENT_CHANCE, tiers: single(AILMENT_CHANCE_PCT) },
  { id: 'ignite_chance', kind: 'suffix', group: 'ignite_chance', label: 'of Kindling', text: 'Fire Damage has {0}% chance to Burn', stats: ['burnChance'], weights: AILMENT_CHANCE, tiers: single(AILMENT_CHANCE_PCT) },
  { id: 'chill_chance', kind: 'suffix', group: 'chill_chance', label: 'of Rime', text: 'Cold Damage has {0}% chance to Chill', stats: ['chillChance'], weights: AILMENT_CHANCE, tiers: single(AILMENT_CHANCE_PCT) },
  { id: 'shock_chance', kind: 'suffix', group: 'shock_chance', label: 'of Static', text: 'Lightning Damage has {0}% chance to Shock', stats: ['shockChance'], weights: AILMENT_CHANCE, tiers: single(AILMENT_CHANCE_PCT) },

  // ---------- suffixes: defence and sustain ----------
  { id: 'fire_res', kind: 'suffix', group: 'fire_res', label: 'of the Whelpling', text: '+{0}% to Fire Resistance', stats: ['fireRes'], weights: RES, tiers: single(RES_TIERS) },
  { id: 'cold_res', kind: 'suffix', group: 'cold_res', label: 'of the Seal', text: '+{0}% to Cold Resistance', stats: ['coldRes'], weights: RES, tiers: single(RES_TIERS) },
  { id: 'light_res', kind: 'suffix', group: 'light_res', label: 'of the Cloud', text: '+{0}% to Lightning Resistance', stats: ['lightRes'], weights: RES, tiers: single(RES_TIERS) },
  {
    id: 'all_res', kind: 'suffix', group: 'all_res', label: 'of the Crystal', text: '+{0}% to all Elemental Resistances',
    stats: ['allRes'], weights: { ring: 40, amulet: 40 },
    tiers: single([[3, 5], [6, 8], [9, 11], [12, 14], [15, 16], [17, 18], [19, 20], [21, 22], [23, 25]]),
  },
  {
    id: 'elem_taken', kind: 'suffix', group: 'elem_taken', label: 'of Grounding', text: '{0}% reduced Elemental Damage taken',
    stats: ['elemTakenReduction'], weights: { body: 40, shield: 40 },
    tiers: single([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]]),
  },
  {
    id: 'life_regen', kind: 'suffix', group: 'life_regen', label: 'of the Newt', text: 'Regenerate {0} Life per second',
    stats: ['lifeRegen'], weights: { helmet: 60, body: 60, gloves: 60, boots: 60, shield: 60, belt: 60, ring: 60, amulet: 60 },
    tiers: single([[1, 1], [1, 2], [2, 4], [4, 6], [6, 8], [8, 12], [12, 15], [15, 19], [19, 24]]),
  },
  {
    id: 'movement_speed', kind: 'suffix', group: 'movement_speed', label: 'of Haste', text: '{0}% increased Movement Speed',
    stats: ['moveSpeedPct'], weights: { boots: 100 }, tiers: single(SPEED),
  },
  {
    id: 'chaos_res', kind: 'suffix', group: 'chaos_res', label: 'of the Antidote', text: '+{0}% to Chaos Resistance',
    stats: ['chaosRes'], weights: { helmet: 30, body: 30, gloves: 30, boots: 30, shield: 30, belt: 60, ring: 60, amulet: 60 },
    tiers: single([[4, 7], [8, 11], [12, 15], [16, 19], [20, 23], [24, 27], [28, 31], [32, 35], [36, 40]]),
  },
  {
    id: 'block_chance', kind: 'suffix', group: 'block_chance', label: 'of Deflection', text: '{0}% chance to Block hits',
    stats: ['blockChance'], weights: { shield: 70 }, tiers: single([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]]),
  },
  {
    id: 'life_regen_pct', kind: 'suffix', group: 'life_regen_pct', label: 'of Mending', text: 'Regenerate {0}% of Life per second',
    stats: ['lifeRegenPct'], weights: { body: 35, shield: 35, belt: 45 },
    tiers: single([[1, 1], [1, 1], [1, 1], [1, 2], [1, 2], [2, 2], [2, 3], [3, 3], [3, 4]]),
  },
  {
    id: 'mana_leech', kind: 'suffix', group: 'mana_leech', label: 'of Drinking', text: '{0}% of Damage Leeched as Mana',
    stats: ['manaLeech'], weights: { attack_weapon: 35, ring: 25, amulet: 25 },
    tiers: single([[1, 1], [1, 2], [2, 2], [2, 3], [3, 3], [3, 4], [4, 4], [4, 5], [5, 6]]),
  },
  {
    id: 'cooldown_recovery', kind: 'suffix', group: 'cooldown_recovery', label: 'of Readiness', text: '{0}% increased Cooldown Recovery Rate',
    stats: ['cooldownRecovery'], weights: { boots: 35, belt: 45 }, tiers: single(SMALL_PCT),
  },
  {
    id: 'guard_duration', kind: 'suffix', group: 'guard_duration', label: 'of Shelter', text: '{0}% increased Guard Skill Duration',
    stats: ['guardDuration'], weights: { body: 40, shield: 50, belt: 30 }, tiers: single(THIRTY),
  },
  {
    id: 'skill_duration', kind: 'suffix', group: 'skill_duration', label: 'of Persistence', text: '{0}% increased Skill Effect Duration',
    stats: ['skillDuration'], weights: { helmet: 35, boots: 35, amulet: 45 }, tiers: single(THIRTY),
  },
  {
    id: 'stun_chance', kind: 'suffix', group: 'stun_chance', label: 'of Impact', text: '+{0}% chance to Stun on hit',
    stats: ['stunChance'], weights: { attack_weapon: 45, gloves: 30 }, tiers: single(THIRTY),
  },
  {
    id: 'stun_duration', kind: 'suffix', group: 'stun_duration', label: 'of Stunning', text: '{0}% increased Stun Duration',
    stats: ['stunDuration'], weights: { attack_weapon: 40, gloves: 30, belt: 25 }, tiers: single(ELEMENT_PCT),
  },
  {
    id: 'bleed_duration', kind: 'suffix', group: 'ailment_duration', label: 'of Hemorrhage', text: '{0}% longer Bleeding',
    stats: ['bleedDuration'], weights: { attack_weapon: 35, gloves: 25, ring: 25 }, tiers: single(ELEMENT_PCT),
  },
  {
    id: 'poison_duration', kind: 'suffix', group: 'ailment_duration', label: 'of Venom', text: '{0}% longer Poison',
    stats: ['poisonDuration'], weights: { attack_weapon: 30, gloves: 25, ring: 25 }, tiers: single(ELEMENT_PCT),
  },
  {
    id: 'ignite_duration', kind: 'suffix', group: 'ailment_duration', label: 'of Immolation', text: '{0}% longer Burn and Ignite',
    stats: ['igniteDuration'], weights: { caster_weapon: 30, gloves: 25, ring: 25 }, tiers: single(ELEMENT_PCT),
  },
  {
    id: 'minion_speed', kind: 'suffix', group: 'minion_speed', label: 'of the Pack', text: '{0}% increased Minion Attack and Cast Speed',
    stats: ['minionSpeedPct'], weights: { caster_weapon: 45, helmet: 45, amulet: 35 }, tiers: single(SPEED),
  },
  {
    id: 'utility_flask_duration', kind: 'suffix', group: 'utility_flask_duration', label: 'of Distillation', text: '{0}% increased Utility Flask Duration',
    stats: ['utilityFlaskDuration'], weights: { belt: 70 }, tiers: single(THIRTY),
  },

  // ---------- suffixes: attributes ----------
  // PoE-style: armour and weapons roll only their own attributes, and not often; jewellery rolls any
  {
    id: 'strength', kind: 'suffix', group: 'strength', label: 'of the Brute', text: '+{0} to Strength',
    stats: ['str'], weights: { str_armour: 25, str_weapon: 25, belt: 100, amulet: 80, ring: 80 }, tiers: single(ATTR),
  },
  {
    id: 'dexterity', kind: 'suffix', group: 'dexterity', label: 'of the Fox', text: '+{0} to Dexterity',
    stats: ['dex'], weights: { dex_armour: 25, dex_weapon: 25, amulet: 80, ring: 80 }, tiers: single(ATTR),
  },
  {
    id: 'intelligence', kind: 'suffix', group: 'intelligence', label: 'of the Prodigy', text: '+{0} to Intelligence',
    stats: ['int'], weights: { int_armour: 25, int_weapon: 25, amulet: 80, ring: 80 }, tiers: single(ATTR),
  },
  {
    id: 'all_attributes', kind: 'suffix', group: 'all_attributes', label: 'of the Sky', text: '+{0} to all Attributes',
    stats: ['allAttr'], weights: { amulet: 50 }, tiers: single(THIRTY),
  },

  // ---------- suffixes: utility ----------
  {
    id: 'char_xp', kind: 'suffix', group: 'char_xp', label: 'of Learning', text: '{0}% increased Experience gained',
    stats: ['charXp'], weights: { helmet: 60, amulet: 60 }, tiers: single(THIRTY),
  },
  {
    id: 'skill_speed', kind: 'suffix', group: 'skill_speed', label: 'of Industry', text: '{0}% increased Gathering and Crafting Speed',
    stats: ['skillSpeed'], weights: { gloves: 60, boots: 60, amulet: 40 },
    tiers: single([[3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 15], [16, 17], [18, 19], [20, 22]]),
  },
  {
    // retired from the pool (char_xp replaced it); kept so existing items still read
    id: 'skill_xp', kind: 'suffix', group: 'skill_xp', label: 'of Study', text: '{0}% increased Skill Experience',
    stats: ['skillXp'], weights: {},
    tiers: single([[3, 5], [6, 8], [9, 11], [12, 14], [15, 17], [18, 20]]),
  },
  {
    id: 'flask_charges', kind: 'suffix', group: 'flask_charges', label: 'of Refilling', text: '{0}% increased Flask Charges gained',
    stats: ['flaskCharges'], weights: { belt: 100 },
    tiers: single([[10, 15], [16, 22], [23, 30], [31, 38], [39, 46], [47, 55], [56, 63], [64, 71], [72, 80]]),
  },

  // ---------- unique-only ----------
  {
    id: 'u_life_leech', kind: 'suffix', group: 'u_life_leech', label: '', text: '{0}% of Damage Leeched as Life', uniqueOnly: true,
    stats: ['lifeLeech'], weights: {}, tiers: [],
  },
  {
    id: 'u_mana_leech', kind: 'suffix', group: 'u_mana_leech', label: '', text: '{0}% of Damage Leeched as Mana', uniqueOnly: true,
    stats: ['manaLeech'], weights: {}, tiers: [],
  },
  {
    id: 'u_life_more', kind: 'prefix', group: 'u_life_more', label: '', text: '{0}% more maximum Life', uniqueOnly: true,
    stats: ['lifeMore'], weights: {}, tiers: [],
  },
  {
    id: 'u_armour_more', kind: 'prefix', group: 'u_armour_more', label: '', text: '{0}% more Armour', uniqueOnly: true,
    stats: ['armourMore'], weights: {}, tiers: [],
  },
  {
    id: 'u_speed_more', kind: 'suffix', group: 'u_speed_more', label: '', text: '{0}% more Attack Speed', uniqueOnly: true,
    stats: ['attackSpeedMore'], weights: {}, tiers: [],
  },
  {
    id: 'u_regen_pct', kind: 'suffix', group: 'u_regen_pct', label: '', text: 'Regenerate {0}% of Life per second', uniqueOnly: true,
    stats: ['lifeRegenPct'], weights: {}, tiers: [],
  },
  U('u_block', 'suffix', '{0}% chance to Block hits', 'blockChance'),
  U('u_cast_speed', 'suffix', '{0}% increased Cast Speed', 'castSpeedPct'),
  U('u_poison_pct', 'suffix', '{0}% increased Poison Damage', 'poisonPct'),
  U('u_life_flask_recovery', 'suffix', '{0}% increased Life Flask Recovery', 'lifeFlaskRecovery'),
  U('u_slam_reduction', 'suffix', '{0}% reduced Damage taken from Boss Slams', 'slamReduction'),
  U('u_after_guard_damage', 'suffix', '{0}% increased Damage while a Guard Skill is active', 'afterGuardDamage'),
  U('u_chill_on_hit', 'suffix', 'Hits always Chill enemies', 'chillOnHit'),
  U('u_repeat_more', 'suffix', 'Skills that Repeat deal {0}% more Damage', 'repeatMore'),

  // class-mechanic knobs (docs/GAME.md): only the class with that mechanic uses them
  U('u_rage_max', 'prefix', '+{0} to maximum Rage', 'rageMax'),
  U('u_rage_effect', 'prefix', '{0}% increased effect of Rage', 'rageEffect'),
  U('u_rage_decay', 'suffix', 'Rage decays {0}% slower', 'rageDecay'),
  U('u_rage_regen', 'suffix', 'Regenerate {0}% of Life per second per Rage', 'rageRegen'),
  U('u_rage_on_hit_taken', 'suffix', 'Gain {0} Rage when you are hit', 'rageOnHitTaken'),
  U('u_riposte_pct', 'prefix', '{0}% increased Riposte damage', 'ripostePct'),
  U('u_riposte_cooldown', 'suffix', '{0}% faster Riposte recovery', 'riposteCooldown'),
  U('u_riposte_heal', 'suffix', 'Ripostes restore {0}% of Life', 'riposteHeal'),
  U('u_riposte_crit', 'suffix', '{0}% increased Critical Strike Chance with Ripostes', 'riposteCrit'),
  U('u_riposte_bleed', 'suffix', 'Ripostes always cause Bleeding', 'riposteBleed'),
  U('u_momentum_max', 'prefix', '+{0} to maximum Momentum', 'momentumMax'),
  U('u_momentum_effect', 'prefix', '{0}% increased effect of Momentum', 'momentumEffect'),
  U('u_momentum_retain', 'suffix', 'Taking a hit removes 1 less Momentum (minimum 1)', 'momentumRetain'),
  U('u_momentum_evasion', 'suffix', '{0}% increased Evasion Rating per Momentum', 'momentumEvasion'),
  U('u_malice_max', 'prefix', '+{0} to Malice meter size', 'maliceMax'),
  U('u_coup_pct', 'prefix', '{0}% increased Coup de Grâce damage', 'coupPct'),
  U('u_malice_crit_keep', 'suffix', 'Critical strikes leave {0} Malice instead of emptying the meter', 'maliceCritKeep'),
  U('u_coup_ailment', 'suffix', 'Coup de Grâce also Poisons and Ignites', 'coupAilment'),
  U('u_malice_on_hit_taken', 'suffix', 'Gain {0} Malice when you are hit', 'maliceOnHitTaken'),
  U('u_malice_on_hit', 'prefix', 'Gain +{0} extra Malice per hit', 'maliceOnHit'),
  U('u_mana_power', 'prefix', '+{0}% to the Mana is Power bonus', 'manaPower'),
  U('u_mana_power_full', 'suffix', 'Recent Mana spending counts {0}% more toward Mana is Power', 'manaPowerFull'),
  U('u_fervor_pct', 'suffix', '{0}% faster Fervor', 'fervorPct'),
  U('u_nova_pct', 'prefix', '{0}% increased holy nova damage', 'novaPct'),
  U('u_nova_heal', 'suffix', '{0}% increased holy nova healing', 'novaHeal'),
  U('u_nova_es', 'suffix', 'The holy nova restores {0}% of Energy Shield', 'novaEs'),

  // skill modifiers (docs/GAME.md ★): each tweaks one named skill gem
  U('u_pummel_hits', 'suffix', 'Pummel strikes {0} additional time', 'pummelHits'),
  U('u_barrage_arrows', 'suffix', 'Barrage fires {0} additional arrow', 'barrageArrows'),
  U('u_parry_blocks', 'suffix', 'Parry blocks {0} additional hit', 'parryBlocks'),
  U('u_hammer_convert', 'suffix', 'Judgement Hammer converts an additional {0}% of physical damage to lightning', 'hammerConvert'),
  U('u_meditate_es', 'suffix', 'Meditate also restores {0}% of Energy Shield', 'meditateEs'),
  U('u_infernal_spread', 'suffix', "Infernal Blow's ignites spread to {0} other enemy", 'infernalSpread'),

  // general, boss, pinnacle & cycle unique mechanics
  U('u_clinging_hull', 'suffix', 'The Clinging Hull: Savage hits grant 50% more Armour and +20% Cold Resistance for 4s (-15% Movement Speed)', 'clingingHull'),
  U('u_gold_find', 'suffix', '{0}% increased Gold found from Monsters', 'goldFind'),
  U('u_crit_gold_scale', 'suffix', 'Tithe of the Road: +1% to Critical Strike Multiplier per 10,000 Gold held in Bank (up to +50%)', 'critGoldScale'),
  U('u_sloth_pyre', 'suffix', "Sloth's Revenge: Ignites burn 40% slower, deal {0}% more total Damage, and spread on expiration", 'slothPyre'),
  U('u_phys_can_shock', 'suffix', 'Falling Star: Your Physical Damage can Shock as if it were Lightning Damage', 'physCanShock'),
  U('u_no_elem_damage', 'suffix', 'Deal no Elemental Damage', 'noElemDamage'),
  U('u_unblinking_flare', 'suffix', 'Gaze of the Unblinking: Critical spell hits against Burning enemies trigger an Unblinking Flare for {0}% of spell damage', 'unblinkingFlare'),
  U('u_cannot_evade', 'suffix', 'You cannot Evade hits', 'cannotEvade'),
  U('u_flask_reel', 'suffix', 'Cast and Reel: Using a Utility Flask pulls enemies into melee range and snares them for 2s', 'flaskReel'),
  U('u_unwritten_notable', 'suffix', 'The Unwritten Path: Allocates 1 random Ascendancy Notable from outside your class', 'unwrittenNotable'),
  U('u_blueprint_ruin', 'suffix', 'Blueprint of Ruin: Every 4th spell cast repeats twice at 0 Mana cost and grants +10% Spell Block for 4s', 'blueprintRuin'),
  U('u_void_touch', 'suffix', 'Touch of the Void: Gain {0}% of Physical and Elemental Damage as extra Chaos Damage against Ailing enemies; Hits Wither enemies (+20% Chaos Damage taken)', 'voidTouch'),
  U('u_tectonic_rupture', 'suffix', 'Tectonic Rupture: Slam skills crack enemy Armour and cause Physical Damage to bypass {0}% of physical mitigation', 'tectonicRupture'),
  U('u_mirror_twin', 'suffix', 'Mirrored Edge: Ripostes strike a second time for {0}% of damage', 'mirrorTwin'),
  U('u_exile_echo', 'suffix', 'First Path: Every 5th skill use triggers a Mirrored Echo for {0}% damage', 'exileEcho'),
  U('u_armour_vs_elem', 'suffix', 'Armour also applies to {0}% of Elemental Damage taken', 'armourVsElem'),
  U('u_void_gaze', 'suffix', 'Void Gaze: Enemies in ring 1 deal {0}% less Chaos and Elemental Damage', 'voidGaze'),
  U('u_briar_thorns', 'suffix', 'Sanctum Thorns: Holy Novas cause Bleeding and inflict {0}% increased Physical Damage taken for 4s', 'briarThorns'),
  U('u_nova_shock', 'suffix', 'Holy Novas always Shock enemies', 'novaShock'),
  U('u_coup_cull', 'suffix', 'Coup de Grâce executes non-boss enemies below {0}% Life', 'coupCull'),
  U('u_corposant_surge', 'suffix', 'Holy Novas deal {0}% more Damage while on full Energy Shield', 'corposantSurge'),
  U('u_slack_tide_refund', 'suffix', 'Killing an enemy with Coup de Grâce restores {0} Malice', 'slackTideRefund'),
  U('u_leviathan_mend', 'suffix', 'Recover {0}% of Life when hit while at 5 or more Rage', 'leviathanMend'),
  U('u_kings_stride', 'suffix', 'While at 5 or more Momentum, you are immune to Burning, Chilled, and Stormwater ground', 'kingsStride'),
  U('u_mana_cost_red', 'suffix', '{0}% reduced Mana Cost of Skills', 'manaCostReduction'),
  U('u_char_xp', 'suffix', '{0}% increased Character Experience gained', 'charXp'),
  U('u_ailment_pct', 'prefix', '{0}% increased Ailment Damage', 'ailmentPct'),
  U('u_ailment_dur', 'suffix', '{0}% increased Ailment Duration', 'ailmentDuration'),

  // 12 Ascendancy BIS unique modifiers
  U('u_ravager_frenzy', 'suffix', 'Ravager: During a Rampage, melee hits deal {0}% more Damage and restore 2% of Life', 'ravagerFrenzy'),
  U('u_anvil_retaliate', 'suffix', "Anvil: Armour retaliation deals {0}% more Damage and Crushes enemies (+20% Physical Damage taken)", 'anvilRetaliate'),
  U('u_longshot_snipe', 'suffix', "Longshot: Range bonus applies at all rings, and Last Arrow refunds {0}% of Momentum", 'longshotSnipe'),
  U('u_falconer_twin', 'suffix', 'Falconer: Your hawk strikes twice on every swoop and deals {0}% more Damage', 'falconerTwin'),
  U('u_wellspring_cascade', 'suffix', 'Wellspring: Surges consume only half of Overflow and grant {0}% more Spell Damage', 'wellspringCascade'),
  U('u_alchemist_volatile', 'suffix', 'Alchemist: Flask bursts deal {0}% more Damage and have a 50% chance to not consume Charges', 'alchemistVolatile'),
  U('u_matador_grace', 'suffix', 'Matador: Evades grant +2 Streak instead of +1, and Ripostes deal +{0}% more Damage per Streak', 'matadorGrace'),
  U('u_vanguard_phalanx', 'suffix', 'Vanguard: Block Ripostes deal {0}% more Damage and restore 3% of Life and Energy Shield', 'vanguardPhalanx'),
  U('u_flagellant_martyr', 'suffix', 'Flagellant: Self-damage cannot reduce you below 35% Life; deal {0}% more Damage while below 60% Life', 'flagellantMartyr'),
  U('u_lightkeeper_prism', 'suffix', 'Lightkeeper: Store +1 additional Holy Nova, and each stored Nova grants {0}% more Elemental Damage', 'lightkeeperPrism'),
  U('u_headsman_guillotine', 'suffix', "Headsman: Coup de Grâce refunds 50% of Malice against Bosses and executes enemies below {0}% Life", 'headsmanGuillotine'),
  U('u_plaguewright_fester', 'suffix', "Plaguewright: Coup de Grâce ailment burst deals {0}% more Damage and re-applies burst ailments at 50% duration", 'plaguewrightFester'),

  // Ascendancy BIS unique modifier aliases
  U('u_asc_ravager', 'suffix', 'Ravager: During a Rampage, melee hits deal {0}% more Damage and restore 2% of Life', 'ravagerFrenzy'),
  U('u_asc_anvil', 'suffix', "Anvil: Armour retaliation deals {0}% more Damage and Crushes enemies (+20% Physical Damage taken)", 'anvilRetaliate'),
  U('u_asc_longshot', 'suffix', "Longshot: Range bonus applies at all rings, and Last Arrow refunds {0}% of Momentum", 'longshotSnipe'),
  U('u_asc_falconer', 'suffix', 'Falconer: Your hawk strikes twice on every swoop and deals {0}% more Damage', 'falconerTwin'),
  U('u_asc_wellspring', 'suffix', 'Wellspring: Surges consume only half of Overflow and grant {0}% more Spell Damage', 'wellspringCascade'),
  U('u_asc_alchemist', 'suffix', 'Alchemist: Flask bursts deal {0}% more Damage and have a 50% chance to not consume Charges', 'alchemistVolatile'),
  U('u_asc_matador', 'suffix', 'Matador: Evades grant +2 Streak instead of +1, and Ripostes deal +{0}% more Damage per Streak', 'matadorGrace'),
  U('u_asc_vanguard', 'suffix', 'Vanguard: Block Ripostes deal {0}% more Damage and restore 3% of Life and Energy Shield', 'vanguardPhalanx'),
  U('u_asc_flagellant', 'suffix', 'Flagellant: Self-damage cannot reduce you below 35% Life; deal {0}% more Damage while below 60% Life', 'flagellantMartyr'),
  U('u_asc_lightkeeper', 'suffix', 'Lightkeeper: Store +1 additional Holy Nova, and each stored Nova grants {0}% more Elemental Damage', 'lightkeeperPrism'),
  U('u_asc_headsman', 'suffix', "Headsman: Coup de Grâce refunds 50% of Malice against Bosses and executes enemies below {0}% Life", 'headsmanGuillotine'),
  U('u_asc_plaguewright', 'suffix', "Plaguewright: Coup de Grâce ailment burst deals {0}% more Damage and re-applies burst ailments at 50% duration", 'plaguewrightFester'),

  // Life skill unique modifiers
  U('u_input_save', 'suffix', '{0}% chance to preserve Crafting Inputs', 'inputSave'),
  U('u_offline_speed', 'suffix', '{0}% faster Offline Skilling', 'offlineSpeed'),
  U('u_mining_speed', 'prefix', '{0}% faster Mining', 'miningSpeed'),
  U('u_gem_chance', 'suffix', '{0}% increased Rough Gem chance from Mining', 'gemChance'),
  U('u_fossil_chance', 'suffix', '{0}% increased Fossil chance from Mining', 'fossilChance'),
  U('u_motherlode', 'suffix', 'Motherlode: Ore yields from Mining are doubled', 'motherlode'),
  U('u_woodcutting_speed', 'prefix', '{0}% faster Woodcutting', 'woodcuttingSpeed'),
  U('u_birds_nest', 'suffix', '{0}% chance to find a Herb while chopping logs', 'birdsNest'),
  U('u_resin_chance', 'suffix', '{0}% increased Resin chance from Woodcutting', 'resinChance'),
  U('u_resin_ilvl', 'suffix', 'Resin grants +{0} extra Item Level when Smithing', 'resinIlvl'),
  U('u_heartwood', 'suffix', 'Heartwood: Chopping logs also yields Arcane Dust', 'heartwood'),
  U('u_harvesting_speed', 'prefix', '{0}% faster Foraging', 'harvestingSpeed'),
  U('u_distiller', 'suffix', '{0}% chance for found Lesser Essences to upgrade to Greater', 'distiller'),
  U('u_rare_blooms', 'suffix', '{0}% chance to also find a next-tier Herb when Foraging', 'rareBlooms'),
  U('u_greenhouse', 'suffix', 'Greenhouse: Your last Foraging spot grows at +{0}% speed in the background', 'greenhouse'),
  U('u_smithing_speed', 'prefix', '{0}% faster Smithing', 'smithingSpeed'),
  U('u_steady_temper', 'suffix', '{0}% chance to preserve Fossils when Smithing', 'steadyTemper'),
  U('u_smith_magic', 'suffix', '{0}% chance for smithed bases to roll Magic', 'smithMagic'),
  U('u_alchemy_speed', 'prefix', '{0}% faster Alchemy', 'alchemySpeed'),
  U('u_quality_brews', 'suffix', '{0}% chance for brewed Flasks to come out Magic', 'qualityBrews'),
  U('u_transmuter', 'suffix', '{0}% chance for crafted Orbs to come out one tier higher', 'transmuter'),
  U('u_thieving_speed', 'prefix', '{0}% faster Thieving', 'thievingSpeed'),
  U('u_marker_chance', 'suffix', '{0}% increased Rogue Marker find chance', 'markerChance'),
  U('u_alert_reduce', 'suffix', 'Heist rooms generate {0}% less Alert', 'alertReduce'),
  U('u_archaeology_speed', 'prefix', '{0}% faster Archaeology', 'archaeologySpeed'),
  U('u_artifact_chance', 'suffix', '{0}% increased Expedition Artifact find chance', 'artifactChance'),
  U('u_ware_discount', 'suffix', 'Expedition vendors charge {0}% less', 'wareDiscount'),
  U('u_gemcutting_speed', 'prefix', '{0}% faster Gemcutting', 'gemcuttingSpeed'),
  U('u_gemcutting_xp', 'suffix', '{0}% increased Gemcutting Experience', 'gemcuttingXp'),
  U('u_gem_dust_save', 'suffix', 'Gemcutting recipes use {0}% less Arcane Dust', 'gemDustSave'),
  U('u_runecarving_speed', 'prefix', '{0}% faster Rune-carving', 'runecarvingSpeed'),
  U('u_second_stroke', 'suffix', '{0}% chance to carve a second Rune for free', 'secondStroke'),
  U('u_deep_cuts', 'suffix', 'Socketed Runes are {0}% stronger', 'deepCuts'),
  U('u_cooking_speed', 'prefix', '{0}% faster Cooking', 'cookingSpeed'),
  U('u_second_helping', 'suffix', '{0}% chance to cook a second Meal for free', 'secondHelping'),
  U('u_slow_simmer', 'suffix', 'Cooked Meals last {0}% longer', 'slowSimmer'),
  U('u_cartography_speed', 'prefix', '{0}% faster Cartography', 'cartographySpeed'),
  U('u_second_copy', 'suffix', '{0}% chance to draw a second Map or Sextant for free', 'secondCopy'),
  U('u_map_find', 'suffix', '{0}% increased Map drop chance', 'mapFind'),

  // Life skill yield/rare/double/quality/save/extra affixes
  U('u_mining_yield', 'suffix', '+{0}% increased Rough Gem chance from Mining', 'gemChance'),
  U('u_mining_rare', 'suffix', '+{0}% increased Fossil chance from Mining', 'fossilChance'),
  U('u_mining_double', 'suffix', 'Motherlode: Ore yields from Mining are doubled', 'motherlode'),
  U('u_woodcutting_yield', 'suffix', '+{0}% increased Resin chance from Woodcutting', 'resinChance'),
  U('u_woodcutting_rare', 'suffix', '{0}% chance to find a Herb while chopping logs', 'birdsNest'),
  U('u_woodcutting_double', 'suffix', 'Heartwood: Chopping logs also yields Arcane Dust', 'heartwood'),
  U('u_harvesting_yield', 'suffix', '{0}% chance to also find a next-tier Herb when Foraging', 'rareBlooms'),
  U('u_harvesting_rare', 'suffix', '{0}% chance for found Lesser Essences to upgrade to Greater', 'distiller'),
  U('u_harvesting_double', 'suffix', 'Greenhouse: Your last Foraging spot grows at +{0}% speed in the background', 'greenhouse'),
  U('u_thieving_yield', 'suffix', '+{0}% increased Rogue Marker find chance', 'markerChance'),
  U('u_thieving_rare', 'suffix', 'Heist rooms generate {0}% less Alert', 'alertReduce'),
  U('u_thieving_double', 'suffix', 'Clean Getaway: Failing a Heist room keeps half your loot', 'cleanGetaway'),
  U('u_archaeology_yield', 'suffix', '+{0}% increased Expedition Artifact find chance', 'artifactChance'),
  U('u_archaeology_rare', 'suffix', 'Expedition vendors charge {0}% less', 'wareDiscount'),
  U('u_archaeology_double', 'suffix', 'Deep Survey: Dig sites uncover an extra relic chest', 'deepSurvey'),
  U('u_smithing_save', 'suffix', '{0}% chance to preserve Fossils when Smithing', 'steadyTemper'),
  U('u_smithing_quality', 'suffix', '{0}% chance for smithed bases to roll Magic', 'smithMagic'),
  U('u_smithing_extra', 'suffix', '{0}% chance to preserve Crafting Inputs', 'inputSave'),
  U('u_alchemy_save', 'suffix', '{0}% chance to preserve Crafting Inputs', 'inputSave'),
  U('u_alchemy_quality', 'suffix', '{0}% chance for brewed Flasks to come out Magic', 'qualityBrews'),
  U('u_alchemy_extra', 'suffix', '{0}% chance for crafted Orbs to come out one tier higher', 'transmuter'),
  U('u_gemcutting_quality', 'suffix', '+{0}% increased Gemcutting Experience', 'gemcuttingXp'),
  U('u_gemcutting_save', 'suffix', 'Gemcutting recipes use {0}% less Arcane Dust', 'gemDustSave'),
  U('u_gemcutting_extra', 'suffix', 'Master Cutter: Cut gems gain +1 starting level', 'masterCutter'),
  U('u_runecarving_quality', 'suffix', 'Socketed Runes are {0}% stronger', 'deepCuts'),
  U('u_runecarving_save', 'suffix', '{0}% chance to preserve Crafting Inputs', 'inputSave'),
  U('u_runecarving_extra', 'suffix', '{0}% chance to carve a second Rune for free', 'secondStroke'),
  U('u_cooking_quality', 'suffix', 'Cooked Meals last {0}% longer', 'slowSimmer'),
  U('u_cooking_save', 'suffix', '{0}% chance to preserve Crafting Inputs', 'inputSave'),
  U('u_cooking_extra', 'suffix', '{0}% chance to cook a second Meal for free', 'secondHelping'),
  U('u_cartography_quality', 'suffix', '+{0}% increased Map drop chance', 'mapFind'),
  U('u_cartography_rare', 'suffix', '+{0}% increased Map drop chance', 'mapFind'),
  U('u_cartography_double', 'suffix', '{0}% chance to draw a second Map or Sextant for free', 'secondCopy'),
  U('u_cartography_save', 'suffix', '{0}% chance to preserve Crafting Inputs', 'inputSave'),
  U('u_cartography_extra', 'suffix', '{0}% chance to draw a second Map or Sextant for free', 'secondCopy'),

  // Artisan set universal affixes
  U('u_all_rare', 'suffix', '+{0}% faster Offline Skilling', 'offlineSpeed'),
  U('u_all_quality', 'suffix', '+{0}% faster Offline Skilling', 'offlineSpeed'),
  U('u_all_yield', 'suffix', '{0}% chance to preserve Crafting Inputs', 'inputSave'),
  U('u_all_extra', 'suffix', '{0}% chance to cook a second Meal or draw a second Map for free', 'secondHelping'),
  U('u_all_save', 'suffix', '{0}% chance to preserve Crafting Inputs', 'inputSave'),
  U('u_all_double', 'suffix', '{0}% chance to carve a second Rune for free', 'secondStroke'),

  // meta-crafting modifiers (docs/POST_CAMPAIGN_CRAFTING_AND_HIDEOUT.md)
  M('meta_prefixes_cannot_be_changed', 'suffix', 'meta_prefix_lock', 'Prefixes Cannot Be Changed'),
  M('meta_suffixes_cannot_be_changed', 'prefix', 'meta_suffix_lock', 'Suffixes Cannot Be Changed'),
  M('meta_multicraft', 'suffix', 'meta_multicraft', 'Can have up to 3 Crafted Modifiers'),
  M('meta_cannot_roll_attack', 'suffix', 'meta_attack_lock', 'Cannot roll Attack Modifiers'),
  M('meta_cannot_roll_caster', 'prefix', 'meta_caster_lock', 'Cannot roll Caster Modifiers'),
];

/** A bench-only meta mod that never rolls naturally. */
function M(id: string, kind: AffixDef['kind'], group: string, text: string): AffixDef {
  return { id, kind, group, label: '', text, benchOnly: true, stats: [], weights: {}, tiers: [{ ilvl: 1, ranges: [] }] };
}

/** A unique-only mod that sets a single stat. */
function U(id: string, kind: AffixDef['kind'], text: string, stat: StatKey): AffixDef {
  return { id, kind, group: id, label: '', text, uniqueOnly: true, stats: [stat], weights: {}, tiers: [] };
}

const BY_ID: Record<string, AffixDef> = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));

export function affixDef(id: string): AffixDef {
  const a = BY_ID[id];
  if (!a) throw new Error(`Unknown affix ${id}`);
  return a;
}

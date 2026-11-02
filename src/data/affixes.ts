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
    tiers: flat([[1, 2, 3, 5], [2, 4, 6, 9], [4, 7, 10, 15], [6, 10, 16, 23], [9, 14, 24, 33], [12, 19, 32, 45], [16, 24, 42, 58], [20, 30, 54, 74], [25, 37, 68, 92]]),
  },
  {
    id: 'inc_phys', kind: 'prefix', group: 'inc_phys', label: 'Heavy', text: '{0}% increased Physical Damage',
    stats: ['localPhysPct'], weights: { attack_weapon: 100 },
    tiers: single([[15, 24], [25, 39], [40, 59], [60, 84], [85, 109], [110, 139], [140, 169], [170, 199], [200, 239]]),
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
    tiers: single([[10, 19], [20, 29], [30, 44], [45, 59], [60, 79], [80, 99], [100, 119], [120, 144], [145, 170]]),
  },
  {
    // unlike "Adds X Fire Damage", these count in full for spells (no 70% added-damage effectiveness)
    id: 'spell_fire', kind: 'prefix', group: 'spell_fire', label: 'Smouldering', text: 'Adds {0} to {1} Fire Damage to Spells',
    stats: ['spellFireMin', 'spellFireMax'], weights: { caster_weapon: 80, ring: 40, amulet: 40 },
    tiers: flat([[1, 2, 2, 4], [2, 4, 5, 8], [4, 6, 9, 14], [6, 10, 15, 22], [10, 14, 23, 32], [13, 19, 32, 44], [17, 24, 42, 57], [22, 31, 54, 73], [28, 38, 67, 91]]),
  },
  {
    id: 'spell_cold', kind: 'prefix', group: 'spell_cold', label: 'Wintry', text: 'Adds {0} to {1} Cold Damage to Spells',
    stats: ['spellColdMin', 'spellColdMax'], weights: { caster_weapon: 80, ring: 40, amulet: 40 },
    tiers: flat([[1, 2, 2, 3], [2, 3, 5, 7], [4, 6, 8, 12], [6, 9, 13, 20], [9, 13, 21, 29], [12, 17, 29, 40], [16, 22, 38, 52], [20, 28, 49, 66], [25, 34, 61, 82]]),
  },
  {
    id: 'spell_light', kind: 'prefix', group: 'spell_light', label: 'Crackling', text: 'Adds {0} to {1} Lightning Damage to Spells',
    stats: ['spellLightMin', 'spellLightMax'], weights: { caster_weapon: 80, ring: 40, amulet: 40 },
    tiers: flat([[1, 1, 3, 5], [1, 2, 7, 10], [2, 3, 12, 18], [2, 4, 20, 29], [3, 5, 30, 43], [4, 7, 41, 58], [5, 8, 54, 76], [7, 10, 69, 96], [8, 12, 86, 120]]),
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

  // class-mechanic knobs (docs/design/CLASSES.md): only the class with that mechanic uses them
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
  U('u_momentum_retain', 'suffix', 'Taking a hit removes {0}% less Momentum', 'momentumRetain'),
  U('u_momentum_evasion', 'suffix', '{0}% increased Evasion Rating per Momentum', 'momentumEvasion'),
  U('u_malice_max', 'prefix', '+{0} to Malice meter size', 'maliceMax'),
  U('u_coup_pct', 'prefix', '{0}% increased Coup de Grâce damage', 'coupPct'),
  U('u_malice_crit_keep', 'suffix', 'Critical strikes leave {0} Malice instead of emptying the meter', 'maliceCritKeep'),
  U('u_coup_ailment', 'suffix', 'Coup de Grâce also Poisons and Ignites', 'coupAilment'),
  U('u_malice_on_hit_taken', 'suffix', 'Gain {0} Malice when you are hit', 'maliceOnHitTaken'),
  U('u_mana_power', 'prefix', '+{0}% to the Mana is Power bonus', 'manaPower'),
  U('u_mana_power_full', 'suffix', 'Mana within {0}% of full counts as full for Mana is Power', 'manaPowerFull'),
  U('u_fervor_pct', 'suffix', '{0}% faster Fervor', 'fervorPct'),
  U('u_nova_pct', 'prefix', '{0}% increased holy nova damage', 'novaPct'),
  U('u_nova_heal', 'suffix', '{0}% increased holy nova healing', 'novaHeal'),
  U('u_nova_es', 'suffix', 'The holy nova restores {0}% of Energy Shield', 'novaEs'),

  // skill modifiers (docs/design/SKILLS_AND_UNIQUES.md ★): each tweaks one named skill gem
  U('u_pummel_hits', 'suffix', 'Pummel strikes {0} additional time', 'pummelHits'),
  U('u_barrage_arrows', 'suffix', 'Barrage fires {0} additional arrow', 'barrageArrows'),
  U('u_parry_blocks', 'suffix', 'Parry blocks {0} additional hit', 'parryBlocks'),
  U('u_hammer_convert', 'suffix', 'Judgement Hammer converts an additional {0}% of physical damage to lightning', 'hammerConvert'),
  U('u_meditate_es', 'suffix', 'Meditate also restores {0}% of Energy Shield', 'meditateEs'),
  U('u_infernal_spread', 'suffix', "Infernal Blow's ignites spread to {0} other enemy", 'infernalSpread'),
];

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

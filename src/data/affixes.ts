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
}

const ILVLS = [1, 8, 16, 25, 35, 45];

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

export const AFFIXES: AffixDef[] = [
  // ---------- prefixes ----------
  {
    id: 'added_phys', kind: 'prefix', group: 'added_phys', label: 'Glinting', text: 'Adds {0} to {1} Physical Damage',
    stats: ['physMin', 'physMax'], weights: { weapon: 100, ring: 60, gloves: 50, amulet: 40 },
    tiers: flat([[1, 2, 3, 5], [2, 4, 6, 9], [4, 7, 10, 15], [6, 10, 16, 23], [9, 14, 24, 33], [12, 19, 32, 45]]),
  },
  {
    id: 'inc_phys', kind: 'prefix', group: 'inc_phys', label: 'Heavy', text: '{0}% increased Physical Damage',
    stats: ['physPct'], weights: { weapon: 100 },
    tiers: single([[15, 24], [25, 39], [40, 59], [60, 84], [85, 109], [110, 139]]),
  },
  {
    id: 'added_fire', kind: 'prefix', group: 'added_fire', label: 'Heated', text: 'Adds {0} to {1} Fire Damage',
    stats: ['fireMin', 'fireMax'], weights: { weapon: 80, ring: 50, amulet: 40, gloves: 30 },
    tiers: flat([[1, 2, 3, 4], [3, 5, 6, 9], [5, 8, 11, 16], [8, 12, 18, 26], [12, 17, 27, 38], [16, 23, 38, 52]]),
  },
  {
    id: 'added_cold', kind: 'prefix', group: 'added_cold', label: 'Frosted', text: 'Adds {0} to {1} Cold Damage',
    stats: ['coldMin', 'coldMax'], weights: { weapon: 80, ring: 50, amulet: 40, gloves: 30 },
    tiers: flat([[1, 2, 3, 4], [3, 4, 6, 8], [5, 7, 10, 15], [7, 11, 16, 24], [11, 16, 25, 35], [15, 21, 35, 48]]),
  },
  {
    id: 'added_light', kind: 'prefix', group: 'added_light', label: 'Sparking', text: 'Adds {0} to {1} Lightning Damage',
    stats: ['lightMin', 'lightMax'], weights: { weapon: 80, ring: 50, amulet: 40, gloves: 30 },
    tiers: flat([[1, 1, 4, 6], [1, 2, 8, 12], [2, 3, 15, 22], [3, 4, 24, 35], [4, 6, 36, 52], [5, 8, 50, 70]]),
  },
  {
    id: 'inc_elem', kind: 'prefix', group: 'inc_elem', label: 'Prismatic', text: '{0}% increased Elemental Damage',
    stats: ['elemPct'], weights: { weapon: 60, amulet: 60, ring: 40 },
    tiers: single([[8, 12], [13, 18], [19, 26], [27, 35], [36, 45], [46, 58]]),
  },
  {
    id: 'flat_life', kind: 'prefix', group: 'flat_life', label: 'Healthy', text: '+{0} to maximum Life',
    stats: ['life'], weights: { ...ARMOUR_ALL, belt: 120, amulet: 80, ring: 80 },
    tiers: single([[5, 10], [11, 20], [21, 32], [33, 46], [47, 62], [63, 80]]),
  },
  {
    id: 'inc_life', kind: 'prefix', group: 'inc_life', label: 'Vigorous', text: '{0}% increased maximum Life',
    stats: ['lifePct'], weights: { body: 60, belt: 60, amulet: 40 },
    tiers: single([[3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 15]]),
  },
  {
    id: 'flat_armour', kind: 'prefix', group: 'flat_armour', label: 'Lacquered', text: '+{0} to Armour',
    stats: ['armour'], weights: { str_armour: 100, belt: 60, shield: 60 },
    tiers: single([[6, 12], [13, 28], [29, 50], [51, 80], [81, 120], [121, 170]]),
  },
  {
    id: 'inc_armour', kind: 'prefix', group: 'inc_armour', label: 'Reinforced', text: '{0}% increased Armour',
    stats: ['armourPct'], weights: { str_armour: 100, shield: 80 },
    tiers: single([[10, 18], [19, 28], [29, 40], [41, 54], [55, 70], [71, 90]]),
  },
  {
    id: 'flat_evasion', kind: 'prefix', group: 'flat_evasion', label: 'Agile', text: '+{0} to Evasion Rating',
    stats: ['evasion'], weights: { dex_armour: 100, ring: 30 },
    tiers: single([[6, 12], [13, 28], [29, 50], [51, 80], [81, 120], [121, 170]]),
  },
  {
    id: 'inc_evasion', kind: 'prefix', group: 'inc_evasion', label: 'Shadowy', text: '{0}% increased Evasion Rating',
    stats: ['evasionPct'], weights: { dex_armour: 100 },
    tiers: single([[10, 18], [19, 28], [29, 40], [41, 54], [55, 70], [71, 90]]),
  },
  {
    id: 'flat_es', kind: 'prefix', group: 'flat_es', label: 'Shimmering', text: '+{0} to maximum Energy Shield',
    stats: ['energyShield'], weights: { int_armour: 100, amulet: 40, ring: 30, belt: 20 },
    tiers: single([[4, 8], [9, 16], [17, 26], [27, 38], [39, 52], [53, 70]]),
  },
  {
    id: 'inc_es', kind: 'prefix', group: 'inc_es', label: 'Glowing', text: '{0}% increased Energy Shield',
    stats: ['energyShieldPct'], weights: { int_armour: 100 },
    tiers: single([[10, 18], [19, 28], [29, 40], [41, 54], [55, 70], [71, 90]]),
  },
  {
    id: 'flat_mana', kind: 'prefix', group: 'flat_mana', label: 'Beryl', text: '+{0} to maximum Mana',
    stats: ['mana'], weights: { ring: 100, amulet: 100, helmet: 60, belt: 40, weapon: 30 },
    tiers: single([[10, 19], [20, 29], [30, 39], [40, 54], [55, 69], [70, 89]]),
  },
  {
    id: 'flask_effect', kind: 'prefix', group: 'flask_effect', label: "Alchemist's", text: '{0}% increased Flask Effect',
    stats: ['flaskEffect'], weights: { belt: 80 },
    tiers: single([[4, 7], [8, 11], [12, 15], [16, 20], [21, 25], [26, 30]]),
  },

  // ---------- suffixes ----------
  {
    id: 'attack_speed', kind: 'suffix', group: 'attack_speed', label: 'of Skill', text: '{0}% increased Attack Speed',
    stats: ['attackSpeedPct'], weights: { weapon: 100, gloves: 60, ring: 30 },
    tiers: single([[3, 4], [5, 7], [8, 10], [11, 13], [14, 16], [17, 20]]),
  },
  {
    id: 'crit_chance', kind: 'suffix', group: 'crit_chance', label: 'of Needling', text: '{0}% increased Critical Strike Chance',
    stats: ['critChancePct'], weights: { weapon: 100, amulet: 80, ring: 30 },
    tiers: single([[10, 14], [15, 19], [20, 24], [25, 29], [30, 34], [35, 40]]),
  },
  {
    id: 'crit_multi', kind: 'suffix', group: 'crit_multi', label: 'of Ire', text: '+{0}% to Critical Strike Multiplier',
    stats: ['critMulti'], weights: { weapon: 100, amulet: 80, ring: 40, gloves: 30 },
    tiers: single([[8, 12], [13, 17], [18, 22], [23, 28], [29, 34], [35, 40]]),
  },
  {
    id: 'fire_res', kind: 'suffix', group: 'fire_res', label: 'of the Whelpling', text: '+{0}% to Fire Resistance',
    stats: ['fireRes'], weights: { ...ARMOUR_ALL, belt: 100, ring: 100, amulet: 100 },
    tiers: single([[6, 11], [12, 17], [18, 23], [24, 29], [30, 35], [36, 42]]),
  },
  {
    id: 'cold_res', kind: 'suffix', group: 'cold_res', label: 'of the Seal', text: '+{0}% to Cold Resistance',
    stats: ['coldRes'], weights: { ...ARMOUR_ALL, belt: 100, ring: 100, amulet: 100 },
    tiers: single([[6, 11], [12, 17], [18, 23], [24, 29], [30, 35], [36, 42]]),
  },
  {
    id: 'light_res', kind: 'suffix', group: 'light_res', label: 'of the Cloud', text: '+{0}% to Lightning Resistance',
    stats: ['lightRes'], weights: { ...ARMOUR_ALL, belt: 100, ring: 100, amulet: 100 },
    tiers: single([[6, 11], [12, 17], [18, 23], [24, 29], [30, 35], [36, 42]]),
  },
  {
    id: 'all_res', kind: 'suffix', group: 'all_res', label: 'of the Crystal', text: '+{0}% to all Elemental Resistances',
    stats: ['allRes'], weights: { ring: 40, amulet: 40 },
    tiers: single([[3, 5], [6, 8], [9, 11], [12, 14], [15, 16], [17, 18]]),
  },
  {
    id: 'life_regen', kind: 'suffix', group: 'life_regen', label: 'of the Newt', text: 'Regenerate {0} Life per second',
    stats: ['lifeRegen'], weights: { ...ARMOUR_ALL, belt: 60, ring: 60, amulet: 60 },
    tiers: single([[1, 2], [2, 4], [4, 7], [7, 11], [11, 16], [16, 24]]),
  },
  {
    id: 'life_leech', kind: 'suffix', group: 'life_leech', label: 'of the Leech', text: '{0}% of Attack Damage Leeched as Life',
    stats: ['lifeLeech'], weights: { weapon: 60, ring: 40, amulet: 40, gloves: 30 },
    tiers: single([[1, 1], [1, 2], [2, 2], [2, 3], [3, 3], [3, 4]]),
  },
  {
    id: 'item_rarity', kind: 'suffix', group: 'item_rarity', label: 'of Plunder', text: '{0}% increased Rarity of Items found',
    stats: ['itemRarity'], weights: { helmet: 60, boots: 60, ring: 60, amulet: 60 },
    tiers: single([[6, 10], [11, 15], [16, 20], [21, 25], [26, 30], [31, 36]]),
  },
  {
    id: 'skill_speed', kind: 'suffix', group: 'skill_speed', label: 'of Industry', text: '{0}% increased Gathering and Crafting Speed',
    stats: ['skillSpeed'], weights: { gloves: 60, boots: 60, amulet: 40 },
    tiers: single([[3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 15]]),
  },
  {
    id: 'skill_xp', kind: 'suffix', group: 'skill_xp', label: 'of Learning', text: '{0}% increased Skill Experience',
    stats: ['skillXp'], weights: { helmet: 60, amulet: 60 },
    tiers: single([[3, 5], [6, 8], [9, 11], [12, 14], [15, 17], [18, 20]]),
  },
  {
    id: 'flask_charges', kind: 'suffix', group: 'flask_charges', label: 'of Refilling', text: '{0}% increased Flask Charges gained',
    stats: ['flaskCharges'], weights: { belt: 100 },
    tiers: single([[10, 15], [16, 22], [23, 30], [31, 38], [39, 46], [47, 55]]),
  },
  {
    id: 'strength', kind: 'suffix', group: 'strength', label: 'of the Brute', text: '+{0} to Strength',
    stats: ['str'], weights: { str_armour: 80, belt: 100, amulet: 80, ring: 80, gloves: 40, weapon: 40 },
    tiers: single([[5, 9], [10, 15], [16, 21], [22, 27], [28, 34], [35, 42]]),
  },
  {
    id: 'dexterity', kind: 'suffix', group: 'dexterity', label: 'of the Fox', text: '+{0} to Dexterity',
    stats: ['dex'], weights: { dex_armour: 80, amulet: 80, ring: 80, gloves: 60, boots: 40, weapon: 40 },
    tiers: single([[5, 9], [10, 15], [16, 21], [22, 27], [28, 34], [35, 42]]),
  },
  {
    id: 'intelligence', kind: 'suffix', group: 'intelligence', label: 'of the Prodigy', text: '+{0} to Intelligence',
    stats: ['int'], weights: { int_armour: 80, amulet: 80, ring: 80, helmet: 60, weapon: 40 },
    tiers: single([[5, 9], [10, 15], [16, 21], [22, 27], [28, 34], [35, 42]]),
  },
  {
    id: 'es_recharge', kind: 'suffix', group: 'es_recharge', label: 'of Renewal', text: '{0}% faster Energy Shield Recharge',
    stats: ['esRechargePct'], weights: { int_armour: 40, amulet: 40, belt: 40 },
    tiers: single([[8, 12], [13, 18], [19, 25], [26, 33], [34, 42], [43, 52]]),
  },
  {
    id: 'all_attributes', kind: 'suffix', group: 'all_attributes', label: 'of the Sky', text: '+{0} to all Attributes',
    stats: ['allAttr'], weights: { amulet: 50 },
    tiers: single([[3, 5], [6, 8], [9, 11], [12, 14], [15, 17], [18, 20]]),
  },
  {
    id: 'mana_regen', kind: 'suffix', group: 'mana_regen', label: 'of Excitement', text: '{0}% increased Mana Regeneration Rate',
    stats: ['manaRegenPct'], weights: { ring: 80, amulet: 80, weapon: 50, helmet: 40 },
    tiers: single([[10, 19], [20, 29], [30, 39], [40, 49], [50, 59], [60, 69]]),
  },
  {
    id: 'mana_regen_flat', kind: 'suffix', group: 'mana_regen_flat', label: 'of Clarity', text: 'Regenerate {0} Mana per second',
    stats: ['manaRegenFlat'], weights: { ring: 80, amulet: 80, helmet: 40, weapon: 40, belt: 30 },
    tiers: single([[1, 2], [2, 3], [3, 5], [5, 7], [7, 10], [10, 14]]),
  },
  {
    id: 'accuracy', kind: 'suffix', group: 'accuracy', label: 'of Calm', text: '+{0} to Accuracy Rating',
    stats: ['accuracy'], weights: { weapon: 60, gloves: 60, ring: 40, helmet: 30 },
    tiers: single([[5, 15], [16, 40], [41, 80], [81, 130], [131, 200], [201, 300]]),
  },

  // ---------- unique-only ----------
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

  // class-mechanic knobs (docs/CLASSES.md): only the class with that mechanic uses them
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

  // skill modifiers (docs/NEW_UNIQUES.md ★): each tweaks one named skill gem
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

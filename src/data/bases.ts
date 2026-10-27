import type { ItemSlotType, StatKey, Tag } from '../engine/types';
import { describeStat } from './statText';

export interface Implicit {
  stat: StatKey;
  value: number;
  text: string;
}

export interface BaseDef {
  id: string;
  name: string;
  slot: ItemSlotType;
  /** combat level needed to equip, and the item level needed for it to drop */
  reqLevel: number;
  tags: Tag[];
  phys?: [number, number];
  /** weapons: % attack speed the weapon adds to every attack (light blades are quicker than axes) */
  speed?: number;
  crit?: number;
  armour?: number;
  evasion?: number;
  energyShield?: number;
  implicits?: Implicit[];
  /** weapons: which family it belongs to (sets its attributes and built-in mod) */
  family?: WeaponFamily;
  /** takes the offhand slot too */
  twoHanded?: boolean;
}

export type WeaponFamily = 'mace' | 'axe' | 'sword' | 'dagger' | 'bow' | 'sceptre' | 'wand' | 'staff';

export type Attribute = 'str' | 'dex' | 'int';

/** Bases from this level up carry a bonus built-in mod (docs/GEAR.md). */
export const IMPLICIT_LEVEL = 40;

/** A bonus implicit's value at level 40 and at level 60. */
type ImplicitRange = [stat: StatKey, lo: number, hi: number];

function bonusImplicit([stat, lo, hi]: ImplicitRange, lvl: number): Implicit {
  const value = Math.round(lo + ((hi - lo) * Math.min(1, (lvl - IMPLICIT_LEVEL) / 20)));
  return { stat, value, text: describeStat(stat, value) };
}

interface FamilyDef {
  name: string;
  attrs: Attribute[];
  /** the built-in mod, scaled by the base's level */
  implicits: (lvl: number) => Implicit[];
  /** a second built-in mod on bases of level 40+ */
  bonus?: ImplicitRange;
  twoHanded?: boolean;
}

/** Each weapon family asks for the same attributes and carries one built-in mod that defines it. */
export const WEAPON_FAMILIES: Record<WeaponFamily, FamilyDef> = {
  mace: {
    name: 'Mace', attrs: ['str'], bonus: ['physPct', 10, 20],
    implicits: (l) => {
      const v = 10 + Math.floor(l / 4);
      return [{ stat: 'stunChance', value: v, text: `+${v}% chance to Stun on hit` }];
    },
  },
  axe: {
    name: 'Axe', attrs: ['str', 'dex'], bonus: ['bleedPct', 15, 30],
    implicits: (l) => {
      const v = 20 + Math.floor(l / 2);
      return [{ stat: 'bleedOnHit', value: v, text: `Attacks have ${v}% chance to cause Bleeding` }];
    },
  },
  sword: {
    name: 'Sword', attrs: ['str', 'dex'], bonus: ['attackSpeedPct', 4, 8],
    implicits: (l) => {
      const v = 30 + 4 * l;
      return [{ stat: 'accuracy', value: v, text: `+${v} to Accuracy Rating` }];
    },
  },
  dagger: {
    name: 'Dagger', attrs: ['dex', 'int'], bonus: ['critMulti', 10, 20],
    implicits: (l) => {
      const v = 20 + Math.floor(l / 2);
      return [{ stat: 'critChancePct', value: v, text: `${v}% increased Critical Strike Chance` }];
    },
  },
  bow: {
    name: 'Bow', attrs: ['dex'], twoHanded: true, bonus: ['critMulti', 10, 20],
    implicits: (l) => {
      const v = 15 + Math.floor(l / 2);
      return [{ stat: 'projectilePct', value: v, text: `${v}% increased Projectile Damage` }];
    },
  },
  sceptre: {
    name: 'Sceptre', attrs: ['str', 'int'], bonus: ['spellPct', 10, 20],
    implicits: (l) => {
      const v = 15 + Math.floor(l / 2);
      return [{ stat: 'elemPct', value: v, text: `${v}% increased Elemental Damage` }];
    },
  },
  wand: {
    name: 'Wand', attrs: ['int'], bonus: ['castSpeedPct', 5, 10],
    implicits: (l) => {
      const v = 30 + l;
      return [{ stat: 'spellPct', value: v, text: `${v}% increased Spell Damage` }];
    },
  },
  staff: {
    name: 'Staff', attrs: ['int'], twoHanded: true, bonus: ['mana', 30, 60],
    implicits: (l) => {
      const v = 60 + 2 * l;
      const b = 8 + Math.floor(l / 5);
      return [
        { stat: 'spellPct', value: v, text: `${v}% increased Spell Damage` },
        { stat: 'blockChance', value: b, text: `${b}% chance to Block hits` },
      ];
    },
  },
};

const W = (id: string, name: string, family: WeaponFamily, reqLevel: number, phys: [number, number], speed: number, crit: number): BaseDef => {
  const fam = WEAPON_FAMILIES[family];
  return {
    id, name, slot: 'weapon', reqLevel, tags: ['weapon'], phys, speed, crit, family,
    implicits: [...fam.implicits(reqLevel), ...(fam.bonus && reqLevel >= IMPLICIT_LEVEL ? [bonusImplicit(fam.bonus, reqLevel)] : [])],
    ...(fam.twoHanded ? { twoHanded: true } : {}),
  };
};

type ArmourType = 'str' | 'dex' | 'int' | 'str_dex' | 'str_int' | 'dex_int';
type ArmourSlot = 'helmet' | 'body' | 'gloves' | 'boots' | 'offhand';

/** The bonus implicit an armour piece of level 40+ carries, by armour type and slot. Hybrids get a
 * little less than pure bases, since they already carry two defences. */
const ARMOUR_BONUS: Record<ArmourType, Record<ArmourSlot, ImplicitRange>> = {
  str: { helmet: ['life', 25, 45], body: ['lifePct', 5, 9], gloves: ['physPct', 8, 16], boots: ['lifeRegen', 3, 7], offhand: ['allRes', 4, 8] },
  dex: { helmet: ['accuracy', 80, 160], body: ['evasionPct', 10, 20], gloves: ['attackSpeedPct', 4, 8], boots: ['dex', 10, 20], offhand: ['critChancePct', 10, 20] },
  int: { helmet: ['mana', 20, 40], body: ['energyShieldPct', 10, 20], gloves: ['castSpeedPct', 4, 8], boots: ['manaRegenPct', 15, 30], offhand: ['spellPct', 8, 16] },
  str_dex: { helmet: ['life', 20, 35], body: ['lifePct', 4, 7], gloves: ['attackSpeedPct', 3, 6], boots: ['accuracy', 60, 120], offhand: ['blockChance', 2, 4] },
  str_int: { helmet: ['mana', 15, 30], body: ['allRes', 6, 10], gloves: ['elemPct', 8, 14], boots: ['lifeRegen', 2, 5], offhand: ['spellPct', 6, 12] },
  dex_int: { helmet: ['critChancePct', 8, 15], body: ['energyShieldPct', 8, 15], gloves: ['critMulti', 8, 15], boots: ['manaRegenPct', 10, 20], offhand: ['castSpeedPct', 3, 6] },
};

const A = (
  id: string,
  name: string,
  slot: ArmourSlot,
  reqLevel: number,
  type: ArmourType,
  value: number,
): BaseDef => {
  const attrs = type.split('_') as Attribute[];
  // hybrids carry `value` of armour/evasion each (roughly 60% of a pure base of the same level), and
  // half of it as energy shield, since pure int bases carry about half the number of the others
  const es = attrs.length > 1 ? Math.round(value / 2) : value;
  return {
    id,
    name,
    slot,
    reqLevel,
    tags: [slot === 'offhand' ? 'shield' : slot, 'armour', ...attrs.map((a) => `${a}_armour` as const)],
    ...(attrs.includes('str') ? { armour: value } : {}),
    ...(attrs.includes('dex') ? { evasion: value } : {}),
    ...(attrs.includes('int') ? { energyShield: es } : {}),
    ...(reqLevel >= IMPLICIT_LEVEL ? { implicits: [bonusImplicit(ARMOUR_BONUS[type][slot], reqLevel)] } : {}),
  };
};

const J = (id: string, name: string, slot: 'belt' | 'amulet' | 'ring', reqLevel: number, implicits: Implicit[]): BaseDef => ({
  id, name, slot, reqLevel, tags: slot === 'belt' ? ['belt'] : [slot, 'jewellery'], implicits,
});

export const BASES: BaseDef[] = [
  W('rusted_sword', 'Rusted Sword', 'sword', 1, [4, 10], 20, 5),
  W('iron_blade', 'Iron Blade', 'sword', 8, [7, 16], 20, 5),
  W('steel_longsword', 'Steel Longsword', 'sword', 16, [14, 28], 20, 5),
  W('steel_broadsword', 'Steel Broadsword', 'sword', 24, [17, 36], 15, 5),
  W('mithril_sabre', 'Mithril Sabre', 'sword', 34, [26, 52], 30, 6),
  W('gladiator_sword', "Gladiator's Sword", 'sword', 41, [31, 62], 20, 6),
  W('corsair_cutlass', 'Corsair Cutlass', 'sword', 48, [36, 71], 25, 6),
  W('bladedancer_sabre', 'Bladedancer Sabre', 'sword', 54, [40, 80], 30, 6),
  W('dragonfang_sword', 'Dragonfang Sword', 'sword', 60, [44, 89], 20, 7),

  W('whittled_dagger', 'Whittled Dagger', 'dagger', 1, [3, 9], 35, 7),
  W('skinning_knife', 'Skinning Knife', 'dagger', 7, [5, 16], 30, 7),
  W('glinting_dagger', 'Glinting Dagger', 'dagger', 14, [6, 24], 25, 8),
  W('stiletto', 'Stiletto', 'dagger', 21, [9, 32], 30, 8),
  W('shadow_kris', 'Shadow Kris', 'dagger', 28, [12, 40], 30, 9),
  W('nightshade_dirk', 'Nightshade Dirk', 'dagger', 35, [15, 49], 30, 9),
  W('wraith_blade', 'Wraith Blade', 'dagger', 43, [18, 59], 30, 9),
  W('umbral_dagger', 'Umbral Dagger', 'dagger', 51, [21, 69], 35, 9),
  W('voidfang_dagger', 'Voidfang Dagger', 'dagger', 60, [24, 81], 30, 10),

  W('rusty_hatchet', 'Rusty Hatchet', 'axe', 1, [5, 11], 5, 5),
  W('felling_axe', 'Felling Axe', 'axe', 10, [12, 24], 0, 5),
  W('war_axe', 'Bearded War Axe', 'axe', 18, [16, 34], 0, 5),
  W('double_axe', 'Double Axe', 'axe', 25, [23, 45], 5, 5),
  W('reaver_axe', 'Reaver Axe', 'axe', 32, [28, 56], 5, 5),
  W('headsman_axe', "Headsman's Axe", 'axe', 39, [33, 67], 0, 5),
  W('butcher_axe', 'Butcher Axe', 'axe', 46, [39, 78], 5, 5),
  W('ravager_axe', 'Ravager Axe', 'axe', 53, [45, 89], 5, 6),
  W('dragonbone_axe', 'Dragonbone Axe', 'axe', 60, [50, 101], 5, 6),

  W('oak_club', 'Oak Club', 'mace', 1, [5, 12], 0, 5),
  W('spiked_mace', 'Spiked Mace', 'mace', 12, [12, 26], 0, 5),
  W('flanged_mace', 'Flanged Mace', 'mace', 19, [19, 37], 0, 5),
  W('war_hammer', 'Iron War Hammer', 'mace', 26, [24, 48], -5, 5),
  W('morning_star', 'Morning Star', 'mace', 33, [29, 59], 5, 5),
  W('warlord_mace', "Warlord's Mace", 'mace', 40, [35, 70], 0, 5),
  W('dreadsteel_hammer', 'Dreadsteel Hammer', 'mace', 47, [41, 81], -5, 6),
  W('champion_flail', "Champion's Flail", 'mace', 54, [47, 93], 5, 6),
  W('sunforged_hammer', 'Sunforged Hammer', 'mace', 60, [52, 103], 0, 6),

  W('short_bow', 'Short Bow', 'bow', 1, [4, 13], 20, 6),
  W('hunting_bow', 'Hunting Bow', 'bow', 8, [9, 26], 15, 6),
  W('ash_longbow', 'Ash Longbow', 'bow', 16, [13, 39], 10, 6),
  W('composite_bow', 'Composite Bow', 'bow', 23, [18, 52], 10, 6),
  W('yew_recurve', 'Yew Recurve', 'bow', 30, [23, 65], 15, 7),
  W('bonehunter_bow', 'Bonehunter Bow', 'bow', 37, [28, 78], 15, 7),
  W('hawkfeather_bow', 'Hawkfeather Bow', 'bow', 44, [32, 92], 20, 7),
  W('thornwarden_longbow', 'Thornwarden Longbow', 'bow', 52, [38, 108], 10, 7),
  W('manticore_greatbow', 'Manticore Greatbow', 'bow', 60, [44, 124], 15, 8),

  W('bone_sceptre', 'Bone Sceptre', 'sceptre', 6, [5, 12], 10, 6),
  W('iron_sceptre', 'Iron Sceptre', 'sceptre', 15, [10, 21], 10, 6),
  W('crystal_sceptre', 'Crystal Sceptre', 'sceptre', 24, [14, 30], 10, 6),
  W('inquisitor_sceptre', "Inquisitor's Sceptre", 'sceptre', 32, [18, 38], 10, 6),
  W('paladin_sceptre', 'Paladin Sceptre', 'sceptre', 40, [22, 47], 10, 7),
  W('zealot_sceptre', "Zealot's Sceptre", 'sceptre', 47, [25, 54], 10, 7),
  W('hallowed_sceptre', 'Hallowed Sceptre', 'sceptre', 54, [29, 62], 10, 7),
  W('archon_sceptre', 'Archon Sceptre', 'sceptre', 60, [32, 69], 10, 8),

  W('driftwood_wand', 'Driftwood Wand', 'wand', 1, [1, 4], 15, 6),
  W('bone_wand', 'Bone Wand', 'wand', 7, [3, 7], 15, 6),
  W('coral_wand', 'Coral Wand', 'wand', 14, [4, 10], 15, 7),
  W('quartz_wand', 'Quartz Wand', 'wand', 22, [6, 14], 15, 7),
  W('void_wand', 'Void Wand', 'wand', 30, [8, 18], 15, 7),
  W('stargazer_wand', 'Stargazer Wand', 'wand', 37, [10, 22], 15, 7),
  W('raven_wand', 'Raven Wand', 'wand', 44, [11, 25], 15, 7),
  W('hierophant_wand', "Hierophant's Wand", 'wand', 52, [13, 30], 15, 8),
  W('seraph_wand', 'Seraph Wand', 'wand', 60, [15, 34], 15, 8),

  W('gnarled_staff', 'Gnarled Staff', 'staff', 4, [6, 14], 0, 6),
  W('oak_quarterstaff', 'Oak Quarterstaff', 'staff', 16, [12, 26], 0, 6),
  W('storm_staff', 'Storm Staff', 'staff', 28, [18, 40], 0, 7),
  W('stargazer_staff', 'Stargazer Staff', 'staff', 38, [24, 52], 0, 7),
  W('raven_staff', 'Raven Staff', 'staff', 48, [29, 65], 0, 7),
  W('seraph_staff', 'Seraph Staff', 'staff', 60, [36, 81], 0, 8),

  A('plank_shield', 'Splintered Shield', 'offhand', 1, 'str', 14),
  A('banded_shield', 'Banded Round Shield', 'offhand', 8, 'str', 42),
  A('kite_shield', 'Iron Kite Shield', 'offhand', 16, 'str', 70),
  A('heater_shield', 'Steel Heater', 'offhand', 24, 'str', 120),
  A('tower_shield', 'Mithril Tower Shield', 'offhand', 32, 'str', 170),
  A('warlord_pavise', "Warlord's Pavise", 'offhand', 40, 'str', 220),
  A('dreadsteel_tower', 'Dreadsteel Tower Shield', 'offhand', 47, 'str', 270),
  A('champion_aegis', "Champion's Aegis", 'offhand', 54, 'str', 320),
  A('sunforged_bulwark', 'Sunforged Bulwark', 'offhand', 60, 'str', 370),
  A('buckler', 'Goathide Buckler', 'offhand', 8, 'dex', 30),
  A('hide_targe', 'Hide Targe', 'offhand', 16, 'dex', 72),
  A('wolfpelt_targe', 'Wolfpelt Targe', 'offhand', 24, 'dex', 120),
  A('spiked_buckler', 'Spiked Buckler', 'offhand', 32, 'dex', 170),
  A('bonehunter_buckler', 'Bonehunter Buckler', 'offhand', 40, 'dex', 220),
  A('hawkfeather_buckler', 'Hawkfeather Buckler', 'offhand', 47, 'dex', 270),
  A('thornwarden_targe', 'Thornwarden Targe', 'offhand', 54, 'dex', 320),
  A('manticore_buckler', 'Manticore Buckler', 'offhand', 60, 'dex', 370),
  A('spirit_shield', 'Driftwood Spirit Shield', 'offhand', 6, 'int', 12),
  A('bone_spirit_shield', 'Bone Spirit Shield', 'offhand', 14, 'int', 23),
  A('runic_ward', 'Runic Ward', 'offhand', 22, 'int', 36),
  A('magus_ward', 'Magus Ward', 'offhand', 32, 'int', 57),
  A('stargazer_ward', 'Stargazer Ward', 'offhand', 40, 'int', 74),
  A('raven_spirit_shield', 'Raven Spirit Shield', 'offhand', 47, 'int', 91),
  A('hierophant_ward', "Hierophant's Ward", 'offhand', 54, 'int', 110),
  A('seraph_ward', 'Seraph Ward', 'offhand', 60, 'int', 125),
  // hybrid tiers to level 60 (docs/GEAR.md)
  A('studded_round_shield', 'Studded Round Shield', 'offhand', 12, 'str_dex', 36),
  A('wyrmscale_shield', 'Wyrmscale Shield', 'offhand', 24, 'str_dex', 73),
  A('gladiator_buckler', "Gladiator's Buckler", 'offhand', 36, 'str_dex', 115),
  A('corsair_shield', 'Corsair Shield', 'offhand', 44, 'str_dex', 150),
  A('bladedancer_shield', 'Bladedancer Shield', 'offhand', 52, 'str_dex', 185),
  A('dragonscale_shield', 'Dragonscale Shield', 'offhand', 60, 'str_dex', 220),
  A('chaplain_shield', "Chaplain's Shield", 'offhand', 12, 'str_int', 36),
  A('templar_kite_shield', 'Templar Kite Shield', 'offhand', 24, 'str_int', 73),
  A('paladin_shield', 'Paladin Shield', 'offhand', 36, 'str_int', 115),
  A('zealot_aegis', "Zealot's Aegis", 'offhand', 44, 'str_int', 150),
  A('hallowed_shield', 'Hallowed Shield', 'offhand', 52, 'str_int', 185),
  A('archon_aegis', 'Archon Aegis', 'offhand', 60, 'str_int', 220),
  A('wayfarer_buckler', "Wayfarer's Buckler", 'offhand', 12, 'dex_int', 36),
  A('duskweave_ward', 'Duskweave Ward', 'offhand', 24, 'dex_int', 73),
  A('nightshade_ward', 'Nightshade Ward', 'offhand', 36, 'dex_int', 115),
  A('wraith_shield', 'Wraith Shield', 'offhand', 44, 'dex_int', 150),
  A('umbral_ward', 'Umbral Ward', 'offhand', 52, 'dex_int', 185),
  A('voidwalker_ward', 'Voidwalker Ward', 'offhand', 60, 'dex_int', 220),

  A('iron_hat', 'Iron Hat', 'helmet', 1, 'str', 10),
  A('leather_cap', 'Leather Cap', 'helmet', 1, 'dex', 10),
  A('soldier_helm', 'Soldier Helmet', 'helmet', 16, 'str', 48),
  A('hunter_hood', 'Hunter Hood', 'helmet', 16, 'dex', 48),
  A('great_helm', 'Mithril Great Helm', 'helmet', 32, 'str', 115),
  A('shadow_mask', 'Shadow Mask', 'helmet', 32, 'dex', 115),
  // pure tiers to level 60 (docs/GEAR.md): str, dex, int at 8, 24, 40, 47, 54, 60
  A('blackened_sallet', 'Blackened Sallet', 'helmet', 8, 'str', 28),
  A('knight_helm', 'Knight Helm', 'helmet', 24, 'str', 83),
  A('warlord_helm', "Warlord's Helm", 'helmet', 40, 'str', 150),
  A('dreadsteel_helm', 'Dreadsteel Helm', 'helmet', 47, 'str', 185),
  A('champion_helm', "Champion's Helm", 'helmet', 54, 'str', 220),
  A('sunforged_helm', 'Sunforged Helm', 'helmet', 60, 'str', 250),
  A('woodsman_hood', "Woodsman's Hood", 'helmet', 8, 'dex', 28),
  A('wolfpelt_hood', 'Wolfpelt Hood', 'helmet', 24, 'dex', 83),
  A('bonehunter_mask', 'Bonehunter Mask', 'helmet', 40, 'dex', 150),
  A('hawkfeather_mask', 'Hawkfeather Mask', 'helmet', 47, 'dex', 185),
  A('thornwarden_mask', 'Thornwarden Mask', 'helmet', 54, 'dex', 220),
  A('manticore_mask', 'Manticore Mask', 'helmet', 60, 'dex', 250),
  A('acolyte_hood', "Acolyte's Hood", 'helmet', 8, 'int', 14),
  A('magus_hat', 'Magus Hat', 'helmet', 24, 'int', 40),
  A('stargazer_hat', 'Stargazer Hat', 'helmet', 40, 'int', 72),
  A('raven_cowl', 'Raven Cowl', 'helmet', 47, 'int', 88),
  A('hierophant_mitre', "Hierophant's Mitre", 'helmet', 54, 'int', 105),
  A('seraph_circlet', 'Seraph Circlet', 'helmet', 60, 'int', 120),
  A('riveted_coif', 'Riveted Coif', 'helmet', 8, 'str_dex', 17),
  A('wyrmscale_helm', 'Wyrmscale Helm', 'helmet', 24, 'str_dex', 49),
  A('linen_hood', 'Linen Hood', 'helmet', 1, 'int', 6),
  A('conjurer_hat', 'Conjurer Hat', 'helmet', 16, 'int', 24),
  A('arcanist_cowl', "Arcanist's Cowl", 'helmet', 32, 'int', 55),
  A('chaplain_helm', "Chaplain's Helm", 'helmet', 8, 'str_int', 17),
  A('templar_crown', 'Templar Crown', 'helmet', 24, 'str_int', 49),
  A('wayfarer_hood', "Wayfarer's Hood", 'helmet', 8, 'dex_int', 17),
  A('duskweave_cowl', 'Duskweave Cowl', 'helmet', 24, 'dex_int', 49),
  // hybrid tiers to level 60 (docs/GEAR.md)
  A('ringmail_coif', 'Ringmail Coif', 'helmet', 16, 'str_dex', 32),
  A('lamellar_helm', 'Lamellar Helm', 'helmet', 32, 'str_dex', 69),
  A('gladiator_helm', "Gladiator's Helm", 'helmet', 40, 'str_dex', 90),
  A('corsair_helm', 'Corsair Helm', 'helmet', 47, 'str_dex', 110),
  A('bladedancer_helm', 'Bladedancer Helm', 'helmet', 54, 'str_dex', 130),
  A('dragonscale_helm', 'Dragonscale Helm', 'helmet', 60, 'str_dex', 150),
  A('crusader_helm', 'Crusader Helm', 'helmet', 16, 'str_int', 32),
  A('inquisitor_helm', "Inquisitor's Helm", 'helmet', 32, 'str_int', 69),
  A('paladin_crown', 'Paladin Crown', 'helmet', 40, 'str_int', 90),
  A('zealot_helm', "Zealot's Helm", 'helmet', 47, 'str_int', 110),
  A('hallowed_crown', 'Hallowed Crown', 'helmet', 54, 'str_int', 130),
  A('archon_crown', 'Archon Crown', 'helmet', 60, 'str_int', 150),
  A('shade_hood', 'Shade Hood', 'helmet', 16, 'dex_int', 32),
  A('phantom_mask', 'Phantom Mask', 'helmet', 32, 'dex_int', 69),
  A('nightshade_cowl', 'Nightshade Cowl', 'helmet', 40, 'dex_int', 90),
  A('wraith_hood', 'Wraith Hood', 'helmet', 47, 'dex_int', 110),
  A('umbral_mask', 'Umbral Mask', 'helmet', 54, 'dex_int', 130),
  A('voidwalker_cowl', 'Voidwalker Cowl', 'helmet', 60, 'dex_int', 150),

  A('plate_vest', 'Plate Vest', 'body', 1, 'str', 22),
  A('shabby_jerkin', 'Shabby Jerkin', 'body', 1, 'dex', 22),
  A('chainmail', 'Chainmail Hauberk', 'body', 16, 'str', 110),
  A('scale_leather', 'Scale Leather', 'body', 16, 'dex', 110),
  A('mithril_plate', 'Mithril Plate', 'body', 32, 'str', 270),
  A('assassin_garb', "Assassin's Garb", 'body', 32, 'dex', 270),
  A('blackened_cuirass', 'Blackened Cuirass', 'body', 8, 'str', 67),
  A('knight_cuirass', "Knight's Cuirass", 'body', 24, 'str', 195),
  A('warlord_plate', "Warlord's Plate", 'body', 40, 'str', 355),
  A('dreadsteel_plate', 'Dreadsteel Plate', 'body', 47, 'str', 430),
  A('champion_plate', "Champion's Plate", 'body', 54, 'str', 510),
  A('sunforged_plate', 'Sunforged Plate', 'body', 60, 'str', 585),
  A('woodsman_jerkin', "Woodsman's Jerkin", 'body', 8, 'dex', 67),
  A('wolfpelt_coat', 'Wolfpelt Coat', 'body', 24, 'dex', 195),
  A('bonehunter_hide', 'Bonehunter Hide', 'body', 40, 'dex', 355),
  A('hawkfeather_vest', 'Hawkfeather Vest', 'body', 47, 'dex', 430),
  A('thornwarden_garb', 'Thornwarden Garb', 'body', 54, 'dex', 510),
  A('manticore_hide', 'Manticore Hide', 'body', 60, 'dex', 585),
  A('acolyte_robe', "Acolyte's Robe", 'body', 8, 'int', 28),
  A('magus_robe', 'Magus Robe', 'body', 24, 'int', 83),
  A('stargazer_robe', 'Stargazer Robe', 'body', 40, 'int', 150),
  A('raven_vestment', 'Raven Vestment', 'body', 47, 'int', 185),
  A('hierophant_vestment', "Hierophant's Vestment", 'body', 54, 'int', 220),
  A('seraph_raiment', 'Seraph Raiment', 'body', 60, 'int', 250),
  A('studded_brigandine', 'Studded Brigandine', 'body', 8, 'str_dex', 38),
  A('wyrmscale_hauberk', 'Wyrmscale Hauberk', 'body', 24, 'str_dex', 114),
  A('simple_robe', 'Simple Robe', 'body', 1, 'int', 12),
  A('silken_vestment', 'Silken Vestment', 'body', 16, 'int', 50),
  A('arcanist_robe', "Arcanist's Robe", 'body', 32, 'int', 115),
  A('chaplain_tabard', "Chaplain's Tabard", 'body', 8, 'str_int', 38),
  A('templar_plate', 'Templar Plate', 'body', 24, 'str_int', 114),
  A('wayfarer_coat', "Wayfarer's Coat", 'body', 8, 'dex_int', 38),
  A('duskweave_raiment', 'Duskweave Raiment', 'body', 24, 'dex_int', 114),
  A('ringmail_hauberk', 'Ringmail Hauberk', 'body', 16, 'str_dex', 75),
  A('lamellar_armour', 'Lamellar Armour', 'body', 32, 'str_dex', 160),
  A('gladiator_plate', "Gladiator's Plate", 'body', 40, 'str_dex', 210),
  A('corsair_coat', 'Corsair Coat', 'body', 47, 'str_dex', 260),
  A('bladedancer_brigandine', 'Bladedancer Brigandine', 'body', 54, 'str_dex', 305),
  A('dragonscale_hauberk', 'Dragonscale Hauberk', 'body', 60, 'str_dex', 350),
  A('crusader_chainmail', 'Crusader Chainmail', 'body', 16, 'str_int', 75),
  A('inquisitor_mail', "Inquisitor's Mail", 'body', 32, 'str_int', 160),
  A('paladin_plate', 'Paladin Plate', 'body', 40, 'str_int', 210),
  A('zealot_hauberk', "Zealot's Hauberk", 'body', 47, 'str_int', 260),
  A('hallowed_plate', 'Hallowed Plate', 'body', 54, 'str_int', 305),
  A('archon_regalia', 'Archon Regalia', 'body', 60, 'str_int', 350),
  A('shade_garb', 'Shade Garb', 'body', 16, 'dex_int', 75),
  A('phantom_coat', 'Phantom Coat', 'body', 32, 'dex_int', 160),
  A('nightshade_raiment', 'Nightshade Raiment', 'body', 40, 'dex_int', 210),
  A('wraith_wrap', 'Wraith Wrap', 'body', 47, 'dex_int', 260),
  A('umbral_leathers', 'Umbral Leathers', 'body', 54, 'dex_int', 305),
  A('voidwalker_vestment', 'Voidwalker Vestment', 'body', 60, 'dex_int', 350),

  A('iron_gauntlets', 'Iron Gauntlets', 'gloves', 1, 'str', 8),
  A('rawhide_gloves', 'Rawhide Gloves', 'gloves', 1, 'dex', 8),
  A('steel_gauntlets', 'Steel Gauntlets', 'gloves', 20, 'str', 45),
  A('stealth_gloves', 'Stealth Gloves', 'gloves', 20, 'dex', 45),
  // pure tiers to level 60, staggered from helmets and body armour: 8, 28, 36, 44, 52, 60
  A('blackened_gauntlets', 'Blackened Gauntlets', 'gloves', 8, 'str', 19),
  A('knight_gauntlets', "Knight's Gauntlets", 'gloves', 28, 'str', 65),
  A('warlord_gauntlets', "Warlord's Gauntlets", 'gloves', 36, 'str', 88),
  A('dreadsteel_gauntlets', 'Dreadsteel Gauntlets', 'gloves', 44, 'str', 110),
  A('champion_gauntlets', "Champion's Gauntlets", 'gloves', 52, 'str', 140),
  A('sunforged_gauntlets', 'Sunforged Gauntlets', 'gloves', 60, 'str', 165),
  A('woodsman_gloves', "Woodsman's Gloves", 'gloves', 8, 'dex', 19),
  A('wolfpelt_gloves', 'Wolfpelt Gloves', 'gloves', 28, 'dex', 65),
  A('bonehunter_gloves', 'Bonehunter Gloves', 'gloves', 36, 'dex', 88),
  A('hawkfeather_gloves', 'Hawkfeather Gloves', 'gloves', 44, 'dex', 110),
  A('thornwarden_gloves', 'Thornwarden Gloves', 'gloves', 52, 'dex', 140),
  A('manticore_grips', 'Manticore Grips', 'gloves', 60, 'dex', 165),
  A('acolyte_gloves', "Acolyte's Gloves", 'gloves', 8, 'int', 9),
  A('magus_gloves', 'Magus Gloves', 'gloves', 28, 'int', 32),
  A('stargazer_gloves', 'Stargazer Gloves', 'gloves', 36, 'int', 43),
  A('raven_gloves', 'Raven Gloves', 'gloves', 44, 'int', 55),
  A('hierophant_gloves', "Hierophant's Gloves", 'gloves', 52, 'int', 68),
  A('seraph_gloves', 'Seraph Gloves', 'gloves', 60, 'int', 81),
  A('studded_bracers', 'Studded Bracers', 'gloves', 12, 'str_dex', 18),
  A('wyrmscale_gauntlets', 'Wyrmscale Gauntlets', 'gloves', 30, 'str_dex', 39),
  A('wool_gloves', 'Wool Gloves', 'gloves', 1, 'int', 5),
  A('silk_gloves', 'Silk Gloves', 'gloves', 20, 'int', 22),
  A('chaplain_gloves', "Chaplain's Gloves", 'gloves', 12, 'str_int', 18),
  A('templar_gauntlets', 'Templar Gauntlets', 'gloves', 30, 'str_int', 39),
  A('wayfarer_wraps', "Wayfarer's Wraps", 'gloves', 12, 'dex_int', 18),
  A('duskweave_gloves', 'Duskweave Gloves', 'gloves', 30, 'dex_int', 39),
  A('ringmail_gloves', 'Ringmail Gloves', 'gloves', 20, 'str_dex', 27),
  A('gladiator_gauntlets', "Gladiator's Gauntlets", 'gloves', 37, 'str_dex', 55),
  A('corsair_gloves', 'Corsair Gloves', 'gloves', 44, 'str_dex', 67),
  A('bladedancer_gloves', 'Bladedancer Gloves', 'gloves', 52, 'str_dex', 83),
  A('dragonscale_gauntlets', 'Dragonscale Gauntlets', 'gloves', 60, 'str_dex', 99),
  A('crusader_gloves', 'Crusader Gloves', 'gloves', 20, 'str_int', 27),
  A('paladin_gauntlets', 'Paladin Gauntlets', 'gloves', 37, 'str_int', 55),
  A('zealot_gloves', "Zealot's Gloves", 'gloves', 44, 'str_int', 67),
  A('hallowed_gauntlets', 'Hallowed Gauntlets', 'gloves', 52, 'str_int', 83),
  A('archon_gauntlets', 'Archon Gauntlets', 'gloves', 60, 'str_int', 99),
  A('shade_wraps', 'Shade Wraps', 'gloves', 20, 'dex_int', 27),
  A('nightshade_gloves', 'Nightshade Gloves', 'gloves', 37, 'dex_int', 55),
  A('wraith_wraps', 'Wraith Wraps', 'gloves', 44, 'dex_int', 67),
  A('umbral_gloves', 'Umbral Gloves', 'gloves', 52, 'dex_int', 83),
  A('voidwalker_gloves', 'Voidwalker Gloves', 'gloves', 60, 'dex_int', 99),

  A('iron_greaves', 'Iron Greaves', 'boots', 1, 'str', 8),
  A('leather_boots', 'Leather Boots', 'boots', 1, 'dex', 8),
  A('steel_greaves', 'Steel Greaves', 'boots', 20, 'str', 45),
  A('shagreen_boots', 'Shagreen Boots', 'boots', 20, 'dex', 45),
  A('blackened_greaves', 'Blackened Greaves', 'boots', 8, 'str', 19),
  A('knight_sabatons', "Knight's Sabatons", 'boots', 28, 'str', 65),
  A('warlord_greaves', "Warlord's Greaves", 'boots', 36, 'str', 88),
  A('dreadsteel_greaves', 'Dreadsteel Greaves', 'boots', 44, 'str', 110),
  A('champion_sabatons', "Champion's Sabatons", 'boots', 52, 'str', 140),
  A('sunforged_greaves', 'Sunforged Greaves', 'boots', 60, 'str', 165),
  A('woodsman_boots', "Woodsman's Boots", 'boots', 8, 'dex', 19),
  A('wolfpelt_boots', 'Wolfpelt Boots', 'boots', 28, 'dex', 65),
  A('bonehunter_boots', 'Bonehunter Boots', 'boots', 36, 'dex', 88),
  A('hawkfeather_boots', 'Hawkfeather Boots', 'boots', 44, 'dex', 110),
  A('thornwarden_boots', 'Thornwarden Boots', 'boots', 52, 'dex', 140),
  A('manticore_boots', 'Manticore Boots', 'boots', 60, 'dex', 165),
  A('acolyte_slippers', "Acolyte's Slippers", 'boots', 8, 'int', 9),
  A('magus_slippers', 'Magus Slippers', 'boots', 28, 'int', 32),
  A('stargazer_slippers', 'Stargazer Slippers', 'boots', 36, 'int', 43),
  A('raven_slippers', 'Raven Slippers', 'boots', 44, 'int', 55),
  A('hierophant_slippers', "Hierophant's Slippers", 'boots', 52, 'int', 68),
  A('seraph_sandals', 'Seraph Sandals', 'boots', 60, 'int', 81),
  A('studded_boots', 'Studded Boots', 'boots', 12, 'str_dex', 18),
  A('wyrmscale_boots', 'Wyrmscale Boots', 'boots', 30, 'str_dex', 39),
  A('wool_shoes', 'Wool Shoes', 'boots', 1, 'int', 5),
  A('silk_slippers', 'Silk Slippers', 'boots', 20, 'int', 22),
  A('chaplain_boots', "Chaplain's Boots", 'boots', 12, 'str_int', 18),
  A('templar_sabatons', 'Templar Sabatons', 'boots', 30, 'str_int', 39),
  A('wayfarer_boots', "Wayfarer's Boots", 'boots', 12, 'dex_int', 18),
  A('duskweave_boots', 'Duskweave Boots', 'boots', 30, 'dex_int', 39),
  A('ringmail_boots', 'Ringmail Boots', 'boots', 20, 'str_dex', 27),
  A('gladiator_greaves', "Gladiator's Greaves", 'boots', 37, 'str_dex', 55),
  A('corsair_boots', 'Corsair Boots', 'boots', 44, 'str_dex', 67),
  A('bladedancer_boots', 'Bladedancer Boots', 'boots', 52, 'str_dex', 83),
  A('dragonscale_boots', 'Dragonscale Boots', 'boots', 60, 'str_dex', 99),
  A('crusader_boots', 'Crusader Boots', 'boots', 20, 'str_int', 27),
  A('paladin_sabatons', 'Paladin Sabatons', 'boots', 37, 'str_int', 55),
  A('zealot_boots', "Zealot's Boots", 'boots', 44, 'str_int', 67),
  A('hallowed_sabatons', 'Hallowed Sabatons', 'boots', 52, 'str_int', 83),
  A('archon_greaves', 'Archon Greaves', 'boots', 60, 'str_int', 99),
  A('shade_boots', 'Shade Boots', 'boots', 20, 'dex_int', 27),
  A('nightshade_boots', 'Nightshade Boots', 'boots', 37, 'dex_int', 55),
  A('wraith_boots', 'Wraith Boots', 'boots', 44, 'dex_int', 67),
  A('umbral_boots', 'Umbral Boots', 'boots', 52, 'dex_int', 83),
  A('voidwalker_boots', 'Voidwalker Boots', 'boots', 60, 'dex_int', 99),

  J('chain_belt', 'Chain Belt', 'belt', 1, [{ stat: 'life', value: 12, text: '+12 to maximum Life' }]),
  J('leather_belt', 'Leather Belt', 'belt', 12, [{ stat: 'life', value: 30, text: '+30 to maximum Life' }]),
  J('heavy_belt', 'Heavy Belt', 'belt', 26, [{ stat: 'armour', value: 80, text: '+80 to Armour' }]),

  J('coral_amulet', 'Coral Amulet', 'amulet', 1, [{ stat: 'lifeRegen', value: 2, text: 'Regenerate 2 Life per second' }]),
  J('amber_amulet', 'Amber Amulet', 'amulet', 10, [{ stat: 'physPct', value: 15, text: '15% increased Physical Damage' }]),
  J('jade_amulet', 'Jade Amulet', 'amulet', 10, [{ stat: 'evasionPct', value: 15, text: '15% increased Evasion Rating' }]),
  J('onyx_amulet', 'Onyx Amulet', 'amulet', 24, [{ stat: 'allRes', value: 10, text: '+10% to all Elemental Resistances' }]),

  J('iron_ring', 'Iron Ring', 'ring', 1, [
    { stat: 'physMin', value: 1, text: 'Adds 1 to 4 Physical Damage' },
    { stat: 'physMax', value: 4, text: '' },
  ]),
  J('ruby_ring', 'Ruby Ring', 'ring', 8, [{ stat: 'fireRes', value: 25, text: '+25% to Fire Resistance' }]),
  J('sapphire_ring', 'Sapphire Ring', 'ring', 8, [{ stat: 'coldRes', value: 25, text: '+25% to Cold Resistance' }]),
  J('topaz_ring', 'Topaz Ring', 'ring', 8, [{ stat: 'lightRes', value: 25, text: '+25% to Lightning Resistance' }]),
  J('diamond_ring', 'Diamond Ring', 'ring', 24, [{ stat: 'critChancePct', value: 25, text: '25% increased Critical Strike Chance' }]),
];

const BY_ID: Record<string, BaseDef> = Object.fromEntries(BASES.map((b) => [b.id, b]));

/** Attribute requirements to equip a base. Weapons follow their family; armour pieces follow their
 * str/dex/int tags (hybrids ask for both). Single-attribute items ask for more of one stat. */
export function attributeReq(b: BaseDef): Partial<Record<Attribute, number>> {
  const attrs: Attribute[] = b.family
    ? WEAPON_FAMILIES[b.family].attrs
    : (['str', 'dex', 'int'] as const).filter((a) => b.tags.includes(`${a}_armour`));
  const each = attrs.length === 1 ? Math.floor(6 + 1.6 * b.reqLevel) : Math.floor(4 + 1.0 * b.reqLevel);
  return Object.fromEntries(attrs.map((a) => [a, each]));
}

export function baseDef(id: string): BaseDef {
  const b = BY_ID[id];
  if (!b) throw new Error(`Unknown base ${id}`);
  return b;
}

export interface UniqueDef {
  id: string;
  name: string;
  baseId: string;
  mods: { affixId: string; values: number[] }[];
  flavour: string;
}

export const UNIQUES: UniqueDef[] = [
  {
    id: 'miners_lament', name: "Miner's Lament", baseId: 'iron_hat', flavour: 'The vein runs deeper than the grave.',
    mods: [
      { affixId: 'flat_life', values: [25] },
      { affixId: 'skill_speed', values: [15] },
      { affixId: 'skill_xp', values: [12] },
    ],
  },
  {
    id: 'bloodthirst', name: 'Bloodthirst', baseId: 'rusted_sword', flavour: 'It remembers every throat.',
    mods: [
      { affixId: 'added_phys', values: [5, 12] },
      { affixId: 'attack_speed', values: [15] },
      { affixId: 'life_leech', values: [4] },
    ],
  },
  {
    id: 'emberheart', name: 'Emberheart', baseId: 'plate_vest', flavour: 'A hearth that never cools.',
    mods: [
      { affixId: 'flat_life', values: [45] },
      { affixId: 'added_fire', values: [4, 9] },
      { affixId: 'fire_res', values: [45] },
    ],
  },
  {
    id: 'windstep', name: 'Windstep', baseId: 'leather_boots', flavour: 'Never where the blade falls.',
    mods: [
      { affixId: 'inc_evasion', values: [60] },
      { affixId: 'item_rarity', values: [30] },
      { affixId: 'skill_speed', values: [10] },
    ],
  },
  {
    id: 'alchemists_band', name: "Alchemist's Band", baseId: 'iron_ring', flavour: 'Every drop, a second chance.',
    mods: [
      { affixId: 'flask_effect', values: [40] },
      { affixId: 'flask_charges', values: [40] },
      { affixId: 'u_regen_pct', values: [1] },
    ],
  },
  {
    id: 'iron_bulwark', name: 'The Iron Bulwark', baseId: 'kite_shield', flavour: 'Let them break upon me.',
    mods: [
      { affixId: 'u_armour_more', values: [40] },
      { affixId: 'flat_life', values: [60] },
      { affixId: 'u_speed_more', values: [-10] },
    ],
  },
  {
    id: 'starforged_edge', name: 'Starforged Edge', baseId: 'mithril_sabre', flavour: 'Cut from a falling star.',
    mods: [
      { affixId: 'added_phys', values: [30, 62] },
      { affixId: 'crit_chance', values: [40] },
      { affixId: 'crit_multi', values: [45] },
    ],
  },
  {
    id: 'titans_girth', name: "Titan's Girth", baseId: 'heavy_belt', flavour: 'Mountains bow to no one.',
    mods: [
      { affixId: 'u_life_more', values: [15] },
      { affixId: 'all_res', values: [15] },
      { affixId: 'flask_charges', values: [30] },
    ],
  },

  // ---------- class-mechanic uniques (docs/NEW_UNIQUES.md) ----------
  // skill tweaks marked ★ in the doc wait for the new skills to exist
  {
    id: 'tavern_brawler', name: 'Tavern Brawler', baseId: 'oak_club', flavour: 'Last one standing buys the round.',
    mods: [
      { affixId: 'added_phys', values: [3, 7] },
      { affixId: 'attack_speed', values: [8] },
      { affixId: 'u_rage_max', values: [5] },
      { affixId: 'u_pummel_hits', values: [1] },
    ],
  },
  {
    id: 'thornquill', name: 'Thornquill', baseId: 'ash_longbow', flavour: "Plucked from something that didn't want to give it up.",
    mods: [
      { affixId: 'added_phys', values: [6, 15] },
      { affixId: 'attack_speed', values: [12] },
      { affixId: 'u_momentum_max', values: [4] },
      { affixId: 'u_barrage_arrows', values: [1] },
    ],
  },
  {
    id: 'wellspring', name: 'Wellspring', baseId: 'gnarled_staff', flavour: 'Draw deep; the well remembers.',
    mods: [
      { affixId: 'flat_mana', values: [40] },
      { affixId: 'mana_regen', values: [40] },
      { affixId: 'u_mana_power_full', values: [10] },
    ],
  },
  {
    id: 'rebuttal', name: 'Rebuttal', baseId: 'iron_blade', flavour: 'Every argument has an answer.',
    mods: [
      { affixId: 'added_phys', values: [4, 9] },
      { affixId: 'u_riposte_pct', values: [40] },
      { affixId: 'u_riposte_cooldown', values: [25] },
      { affixId: 'u_parry_blocks', values: [1] },
    ],
  },
  {
    id: 'ninth_psalm', name: 'The Ninth Psalm', baseId: 'crystal_sceptre', flavour: 'The eight before it were mercy.',
    mods: [
      { affixId: 'added_light', values: [4, 22] },
      { affixId: 'u_nova_pct', values: [50] },
      { affixId: 'u_fervor_pct', values: [20] },
      { affixId: 'u_hammer_convert', values: [60] },
    ],
  },
  {
    id: 'last_breath', name: 'Last Breath', baseId: 'shadow_kris', flavour: 'Spend it wisely.',
    mods: [
      { affixId: 'added_phys', values: [8, 20] },
      { affixId: 'u_malice_max', values: [-3] },
      { affixId: 'u_coup_pct', values: [60] },
    ],
  },
  {
    id: 'second_guess', name: 'The Second Guess', baseId: 'buckler', flavour: 'Doubt is a shield, if you hold it right.',
    mods: [
      { affixId: 'inc_evasion', values: [40] },
      { affixId: 'u_block', values: [8] },
      { affixId: 'u_riposte_heal', values: [2] },
    ],
  },
  {
    id: 'bellwether', name: 'Bellwether', baseId: 'kite_shield', flavour: 'It rings before the storm, and after.',
    mods: [
      { affixId: 'flat_life', values: [50] },
      { affixId: 'all_res', values: [10] },
      { affixId: 'u_block', values: [8] },
      { affixId: 'u_fervor_pct', values: [25] },
    ],
  },
  {
    id: 'old_grudge', name: 'The Old Grudge', baseId: 'tower_shield', flavour: 'Forgive nothing. Forget nothing.',
    mods: [
      { affixId: 'u_armour_more', values: [25] },
      { affixId: 'flat_life', values: [70] },
      { affixId: 'u_rage_on_hit_taken', values: [2] },
      { affixId: 'u_rage_regen', values: [0.1] },
    ],
  },
  {
    id: 'castaways_kerchief', name: "Castaway's Kerchief", baseId: 'linen_hood', flavour: 'All you came ashore with.',
    mods: [
      { affixId: 'all_attributes', values: [8] },
      { affixId: 'item_rarity', values: [15] },
      { affixId: 'life_regen', values: [2] },
    ],
  },
  {
    id: 'lookouts_hood', name: "Lookout's Hood", baseId: 'hunter_hood', flavour: 'First to see it, first to move.',
    mods: [
      { affixId: 'flat_life', values: [40] },
      { affixId: 'accuracy', values: [120] },
      { affixId: 'light_res', values: [25] },
      { affixId: 'u_momentum_retain', values: [30] },
    ],
  },
  {
    id: 'mask_of_the_patient', name: 'Mask of the Patient', baseId: 'duskweave_cowl', flavour: 'It does not blink. It waits.',
    mods: [
      { affixId: 'inc_es', values: [40] },
      { affixId: 'inc_evasion', values: [40] },
      { affixId: 'crit_chance', values: [-50] },
      { affixId: 'u_malice_on_hit_taken', values: [2] },
    ],
  },
  {
    id: 'stormhide', name: 'Stormhide', baseId: 'studded_brigandine', flavour: 'Tanned from something that bit back.',
    mods: [
      { affixId: 'flat_life', values: [35] },
      { affixId: 'inc_armour', values: [40] },
      { affixId: 'inc_evasion', values: [40] },
      { affixId: 'u_riposte_bleed', values: [1] },
    ],
  },
  {
    id: 'robe_of_still_waters', name: 'Robe of Still Waters', baseId: 'silken_vestment', flavour: 'Calm water runs the deepest.',
    mods: [
      { affixId: 'inc_es', values: [50] },
      { affixId: 'mana_regen', values: [30] },
      { affixId: 'es_recharge', values: [30] },
      { affixId: 'u_meditate_es', values: [20] },
    ],
  },
  {
    id: 'penitents_plate', name: "Penitent's Plate", baseId: 'templar_plate', flavour: 'Every dent a confession.',
    mods: [
      { affixId: 'flat_life', values: [50] },
      { affixId: 'inc_es', values: [40] },
      { affixId: 'all_res', values: [12] },
      { affixId: 'u_nova_es', values: [10] },
    ],
  },
  {
    id: 'quickfingers', name: 'Quickfingers', baseId: 'rawhide_gloves', flavour: 'Faster than the eye, faster than the knife.',
    mods: [
      { affixId: 'added_phys', values: [1, 4] },
      { affixId: 'attack_speed', values: [10] },
      { affixId: 'dexterity', values: [10] },
      { affixId: 'u_momentum_effect', values: [20] },
    ],
  },
  {
    id: 'needleworkers_wraps', name: "Needleworker's Wraps", baseId: 'wayfarer_wraps', flavour: 'A thousand stitches, one cut.',
    mods: [
      { affixId: 'u_cast_speed', values: [10] },
      { affixId: 'u_poison_pct', values: [20] },
      { affixId: 'u_coup_ailment', values: [1] },
    ],
  },
  {
    id: 'knuckledusters', name: 'Knuckledusters', baseId: 'steel_gauntlets', flavour: 'The knuckles do the talking.',
    mods: [
      { affixId: 'flat_armour', values: [60] },
      { affixId: 'attack_speed', values: [10] },
      { affixId: 'u_rage_effect', values: [25] },
    ],
  },
  {
    id: 'slippers_of_the_tide', name: 'Slippers of the Tide', baseId: 'wool_shoes', flavour: 'Soft steps, full tides.',
    mods: [
      { affixId: 'flat_mana', values: [25] },
      { affixId: 'inc_es', values: [30] },
      { affixId: 'cold_res', values: [20] },
      { affixId: 'u_mana_power', values: [5] },
    ],
  },
  {
    id: 'sidestep', name: 'Sidestep', baseId: 'studded_boots', flavour: 'Not there. Then right there.',
    mods: [
      { affixId: 'flat_life', values: [30] },
      { affixId: 'inc_evasion', values: [40] },
      { affixId: 'u_block', values: [5] },
      { affixId: 'u_riposte_crit', values: [50] },
    ],
  },
  {
    id: 'windchaser', name: 'Windchaser', baseId: 'shagreen_boots', flavour: "The wind doesn't stop to fight.",
    mods: [
      { affixId: 'inc_evasion', values: [60] },
      { affixId: 'light_res', values: [30] },
      { affixId: 'u_momentum_max', values: [3] },
      { affixId: 'u_momentum_evasion', values: [3] },
    ],
  },
  {
    id: 'fishermans_knot', name: "Fisherman's Knot", baseId: 'chain_belt', flavour: 'Tied tight against the tide.',
    mods: [
      { affixId: 'flat_life', values: [15] },
      { affixId: 'flask_charges', values: [25] },
      { affixId: 'item_rarity', values: [10] },
    ],
  },
  {
    id: 'herbalists_sash', name: "Herbalist's Sash", baseId: 'leather_belt', flavour: "Pockets full of tomorrow's cures.",
    mods: [
      { affixId: 'u_life_flask_recovery', values: [30] },
      { affixId: 'skill_speed', values: [10] },
      { affixId: 'skill_xp', values: [10] },
    ],
  },
  {
    id: 'brawlers_buckle', name: "Brawler's Buckle", baseId: 'heavy_belt', flavour: 'Still swinging at closing time.',
    mods: [
      { affixId: 'flat_life', values: [60] },
      { affixId: 'strength', values: [20] },
      { affixId: 'u_rage_decay', values: [50] },
    ],
  },
  {
    id: 'ember_of_faith', name: 'Ember of Faith', baseId: 'amber_amulet', flavour: 'A spark kept close to the heart.',
    mods: [
      { affixId: 'added_fire', values: [3, 7] },
      { affixId: 'fire_res', values: [25] },
      { affixId: 'u_nova_heal', values: [30] },
      { affixId: 'u_infernal_spread', values: [1] },
    ],
  },
  {
    id: 'gulls_eye', name: "Gull's Eye", baseId: 'jade_amulet', flavour: 'It sees the glint from miles away.',
    mods: [
      { affixId: 'accuracy', values: [80] },
      { affixId: 'crit_chance', values: [20] },
      { affixId: 'item_rarity', values: [15] },
    ],
  },
  {
    id: 'hollow_locket', name: 'The Hollow Locket', baseId: 'onyx_amulet', flavour: 'Something was kept in here. Something hungry.',
    mods: [
      { affixId: 'crit_multi', values: [25] },
      { affixId: 'dexterity', values: [15] },
      { affixId: 'u_malice_crit_keep', values: [5] },
    ],
  },
  {
    id: 'barnacle_band', name: 'Barnacle Band', baseId: 'iron_ring', flavour: 'It clung on. So will you.',
    mods: [
      { affixId: 'flat_armour', values: [25] },
      { affixId: 'life_regen', values: [2] },
      { affixId: 'cold_res', values: [15] },
    ],
  },
  {
    id: 'brimming_band', name: 'Brimming Band', baseId: 'sapphire_ring', flavour: 'Full to the brim, never spilling.',
    mods: [
      { affixId: 'flat_mana', values: [30] },
      { affixId: 'mana_regen', values: [25] },
      { affixId: 'u_mana_power', values: [5] },
    ],
  },
  {
    id: 'twin_oaths', name: 'Twin Oaths', baseId: 'diamond_ring', flavour: 'Sworn twice, broken never.',
    mods: [
      { affixId: 'dexterity', values: [15] },
      { affixId: 'u_riposte_pct', values: [25] },
      { affixId: 'u_riposte_cooldown', values: [30] },
    ],
  },

  // ---------- Act 2 (docs/ACT2.md) ----------
  {
    id: 'sunmane_pelt', name: 'Sunmane Pelt', baseId: 'wyrmscale_hauberk', flavour: 'Still warm.',
    mods: [
      { affixId: 'flat_life', values: [70] },
      { affixId: 'inc_armour', values: [50] },
      { affixId: 'fire_res', values: [40] },
      { affixId: 'u_rage_on_hit_taken', values: [1] },
    ],
  },
  {
    id: 'mirage_veil', name: 'Mirage Veil', baseId: 'duskweave_cowl', flavour: 'What it hides was never there.',
    mods: [
      { affixId: 'inc_evasion', values: [60] },
      { affixId: 'flat_es', values: [35] },
      { affixId: 'all_res', values: [10] },
      { affixId: 'u_malice_on_hit_taken', values: [1] },
    ],
  },
  {
    id: 'khans_tithe', name: "Khan's Tithe", baseId: 'diamond_ring', flavour: 'Every road pays.',
    mods: [
      { affixId: 'added_phys', values: [5, 11] },
      { affixId: 'crit_chance', values: [20] },
      { affixId: 'item_rarity', values: [25] },
    ],
  },
  {
    id: 'kurgan_crown', name: 'The Kurgan Crown', baseId: 'templar_crown', flavour: 'The dead keep their kings.',
    mods: [
      { affixId: 'flat_life', values: [50] },
      { affixId: 'flat_es', values: [30] },
      { affixId: 'cold_res', values: [40] },
      { affixId: 'u_fervor_pct', values: [20] },
    ],
  },
  {
    id: 'stormrider_greaves', name: 'Stormrider Greaves', baseId: 'wyrmscale_boots', flavour: 'Ride ahead of the thunder.',
    mods: [
      { affixId: 'flat_evasion', values: [110] },
      { affixId: 'light_res', values: [40] },
      { affixId: 'u_momentum_effect', values: [20] },
      { affixId: 'u_momentum_retain', values: [25] },
    ],
  },
  {
    id: 'pyre_heart', name: 'Heart of the Pyre', baseId: 'onyx_amulet', flavour: 'It beats.',
    mods: [
      { affixId: 'added_fire', values: [10, 20] },
      { affixId: 'inc_elem', values: [25] },
      { affixId: 'u_cast_speed', values: [10] },
    ],
  },
];

export function uniqueDef(id: string): UniqueDef {
  const u = UNIQUES.find((x) => x.id === id);
  if (!u) throw new Error(`Unknown unique ${id}`);
  return u;
}

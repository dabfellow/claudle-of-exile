import type { ItemSlotType, StatKey, Tag } from '../engine/types';

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

interface FamilyDef {
  name: string;
  attrs: Attribute[];
  /** the built-in mod, scaled by the base's level */
  implicits: (lvl: number) => Implicit[];
  twoHanded?: boolean;
}

/** Each weapon family asks for the same attributes and carries one built-in mod that defines it. */
export const WEAPON_FAMILIES: Record<WeaponFamily, FamilyDef> = {
  mace: {
    name: 'Mace', attrs: ['str'],
    implicits: (l) => {
      const v = 10 + Math.floor(l / 4);
      return [{ stat: 'stunChance', value: v, text: `+${v}% chance to Stun on hit` }];
    },
  },
  axe: {
    name: 'Axe', attrs: ['str', 'dex'],
    implicits: (l) => {
      const v = 20 + Math.floor(l / 2);
      return [{ stat: 'bleedOnHit', value: v, text: `Attacks have ${v}% chance to cause Bleeding` }];
    },
  },
  sword: {
    name: 'Sword', attrs: ['str', 'dex'],
    implicits: (l) => {
      const v = 30 + 4 * l;
      return [{ stat: 'accuracy', value: v, text: `+${v} to Accuracy Rating` }];
    },
  },
  dagger: {
    name: 'Dagger', attrs: ['dex', 'int'],
    implicits: (l) => {
      const v = 20 + Math.floor(l / 2);
      return [{ stat: 'critChancePct', value: v, text: `${v}% increased Critical Strike Chance` }];
    },
  },
  bow: {
    name: 'Bow', attrs: ['dex'], twoHanded: true,
    implicits: (l) => {
      const v = 15 + Math.floor(l / 2);
      return [{ stat: 'projectilePct', value: v, text: `${v}% increased Projectile Damage` }];
    },
  },
  sceptre: {
    name: 'Sceptre', attrs: ['str', 'int'],
    implicits: (l) => {
      const v = 15 + Math.floor(l / 2);
      return [{ stat: 'elemPct', value: v, text: `${v}% increased Elemental Damage` }];
    },
  },
  wand: {
    name: 'Wand', attrs: ['int'],
    implicits: (l) => {
      const v = 30 + l;
      return [{ stat: 'spellPct', value: v, text: `${v}% increased Spell Damage` }];
    },
  },
  staff: {
    name: 'Staff', attrs: ['int'], twoHanded: true,
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

const W = (id: string, name: string, family: WeaponFamily, reqLevel: number, phys: [number, number], speed: number, crit: number): BaseDef => ({
  id, name, slot: 'weapon', reqLevel, tags: ['weapon'], phys, speed, crit, family,
  implicits: WEAPON_FAMILIES[family].implicits(reqLevel),
  ...(WEAPON_FAMILIES[family].twoHanded ? { twoHanded: true } : {}),
});

type ArmourType = 'str' | 'dex' | 'int' | 'str_dex' | 'str_int' | 'dex_int';

const A = (
  id: string,
  name: string,
  slot: 'helmet' | 'body' | 'gloves' | 'boots' | 'offhand',
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
  };
};

const J = (id: string, name: string, slot: 'belt' | 'amulet' | 'ring', reqLevel: number, implicits: Implicit[]): BaseDef => ({
  id, name, slot, reqLevel, tags: slot === 'belt' ? ['belt'] : [slot, 'jewellery'], implicits,
});

export const BASES: BaseDef[] = [
  W('rusted_sword', 'Rusted Sword', 'sword', 1, [4, 10], 20, 5),
  W('iron_blade', 'Iron Blade', 'sword', 8, [7, 16], 20, 5),
  W('steel_broadsword', 'Steel Broadsword', 'sword', 24, [17, 36], 15, 5),
  W('mithril_sabre', 'Mithril Sabre', 'sword', 34, [26, 52], 30, 6),

  W('whittled_dagger', 'Whittled Dagger', 'dagger', 1, [3, 9], 35, 7),
  W('glinting_dagger', 'Glinting Dagger', 'dagger', 14, [6, 24], 25, 8),
  W('shadow_kris', 'Shadow Kris', 'dagger', 28, [12, 40], 30, 9),

  W('rusty_hatchet', 'Rusty Hatchet', 'axe', 1, [5, 11], 5, 5),
  W('war_axe', 'Bearded War Axe', 'axe', 18, [16, 34], 0, 5),
  W('reaver_axe', 'Reaver Axe', 'axe', 32, [28, 56], 5, 5),

  W('oak_club', 'Oak Club', 'mace', 1, [5, 12], 0, 5),
  W('spiked_mace', 'Spiked Mace', 'mace', 12, [12, 26], 0, 5),
  W('war_hammer', 'Iron War Hammer', 'mace', 26, [24, 48], -5, 5),

  W('short_bow', 'Short Bow', 'bow', 1, [4, 13], 20, 6),
  W('ash_longbow', 'Ash Longbow', 'bow', 16, [13, 39], 10, 6),
  W('yew_recurve', 'Yew Recurve', 'bow', 30, [23, 65], 15, 7),

  W('bone_sceptre', 'Bone Sceptre', 'sceptre', 6, [5, 12], 10, 6),
  W('crystal_sceptre', 'Crystal Sceptre', 'sceptre', 24, [14, 30], 10, 6),

  W('driftwood_wand', 'Driftwood Wand', 'wand', 1, [1, 4], 15, 6),
  W('coral_wand', 'Coral Wand', 'wand', 14, [4, 10], 15, 7),
  W('void_wand', 'Void Wand', 'wand', 30, [8, 18], 15, 7),

  W('gnarled_staff', 'Gnarled Staff', 'staff', 4, [6, 14], 0, 6),
  W('storm_staff', 'Storm Staff', 'staff', 28, [18, 40], 0, 7),

  A('plank_shield', 'Splintered Shield', 'offhand', 1, 'str', 14),
  A('buckler', 'Goathide Buckler', 'offhand', 8, 'dex', 30),
  A('kite_shield', 'Iron Kite Shield', 'offhand', 16, 'str', 70),
  A('tower_shield', 'Mithril Tower Shield', 'offhand', 32, 'str', 170),
  A('spirit_shield', 'Driftwood Spirit Shield', 'offhand', 6, 'int', 12),
  A('runic_ward', 'Runic Ward', 'offhand', 22, 'int', 36),

  A('iron_hat', 'Iron Hat', 'helmet', 1, 'str', 10),
  A('leather_cap', 'Leather Cap', 'helmet', 1, 'dex', 10),
  A('soldier_helm', 'Soldier Helmet', 'helmet', 16, 'str', 48),
  A('hunter_hood', 'Hunter Hood', 'helmet', 16, 'dex', 48),
  A('great_helm', 'Mithril Great Helm', 'helmet', 32, 'str', 115),
  A('shadow_mask', 'Shadow Mask', 'helmet', 32, 'dex', 115),
  A('riveted_coif', 'Riveted Coif', 'helmet', 8, 'str_dex', 17),
  A('wyrmscale_helm', 'Wyrmscale Helm', 'helmet', 24, 'str_dex', 49),
  A('linen_hood', 'Linen Hood', 'helmet', 1, 'int', 6),
  A('conjurer_hat', 'Conjurer Hat', 'helmet', 16, 'int', 24),
  A('arcanist_cowl', "Arcanist's Cowl", 'helmet', 32, 'int', 55),
  A('chaplain_helm', "Chaplain's Helm", 'helmet', 8, 'str_int', 17),
  A('templar_crown', 'Templar Crown', 'helmet', 24, 'str_int', 49),
  A('wayfarer_hood', "Wayfarer's Hood", 'helmet', 8, 'dex_int', 17),
  A('duskweave_cowl', 'Duskweave Cowl', 'helmet', 24, 'dex_int', 49),

  A('plate_vest', 'Plate Vest', 'body', 1, 'str', 22),
  A('shabby_jerkin', 'Shabby Jerkin', 'body', 1, 'dex', 22),
  A('chainmail', 'Chainmail Hauberk', 'body', 16, 'str', 110),
  A('scale_leather', 'Scale Leather', 'body', 16, 'dex', 110),
  A('mithril_plate', 'Mithril Plate', 'body', 32, 'str', 270),
  A('assassin_garb', "Assassin's Garb", 'body', 32, 'dex', 270),
  A('studded_brigandine', 'Studded Brigandine', 'body', 8, 'str_dex', 38),
  A('wyrmscale_hauberk', 'Wyrmscale Hauberk', 'body', 24, 'str_dex', 114),
  A('simple_robe', 'Simple Robe', 'body', 1, 'int', 12),
  A('silken_vestment', 'Silken Vestment', 'body', 16, 'int', 50),
  A('arcanist_robe', "Arcanist's Robe", 'body', 32, 'int', 115),
  A('chaplain_tabard', "Chaplain's Tabard", 'body', 8, 'str_int', 38),
  A('templar_plate', 'Templar Plate', 'body', 24, 'str_int', 114),
  A('wayfarer_coat', "Wayfarer's Coat", 'body', 8, 'dex_int', 38),
  A('duskweave_raiment', 'Duskweave Raiment', 'body', 24, 'dex_int', 114),

  A('iron_gauntlets', 'Iron Gauntlets', 'gloves', 1, 'str', 8),
  A('rawhide_gloves', 'Rawhide Gloves', 'gloves', 1, 'dex', 8),
  A('steel_gauntlets', 'Steel Gauntlets', 'gloves', 20, 'str', 45),
  A('stealth_gloves', 'Stealth Gloves', 'gloves', 20, 'dex', 45),
  A('studded_bracers', 'Studded Bracers', 'gloves', 12, 'str_dex', 18),
  A('wyrmscale_gauntlets', 'Wyrmscale Gauntlets', 'gloves', 30, 'str_dex', 39),
  A('wool_gloves', 'Wool Gloves', 'gloves', 1, 'int', 5),
  A('silk_gloves', 'Silk Gloves', 'gloves', 20, 'int', 22),
  A('chaplain_gloves', "Chaplain's Gloves", 'gloves', 12, 'str_int', 18),
  A('templar_gauntlets', 'Templar Gauntlets', 'gloves', 30, 'str_int', 39),
  A('wayfarer_wraps', "Wayfarer's Wraps", 'gloves', 12, 'dex_int', 18),
  A('duskweave_gloves', 'Duskweave Gloves', 'gloves', 30, 'dex_int', 39),

  A('iron_greaves', 'Iron Greaves', 'boots', 1, 'str', 8),
  A('leather_boots', 'Leather Boots', 'boots', 1, 'dex', 8),
  A('steel_greaves', 'Steel Greaves', 'boots', 20, 'str', 45),
  A('shagreen_boots', 'Shagreen Boots', 'boots', 20, 'dex', 45),
  A('studded_boots', 'Studded Boots', 'boots', 12, 'str_dex', 18),
  A('wyrmscale_boots', 'Wyrmscale Boots', 'boots', 30, 'str_dex', 39),
  A('wool_shoes', 'Wool Shoes', 'boots', 1, 'int', 5),
  A('silk_slippers', 'Silk Slippers', 'boots', 20, 'int', 22),
  A('chaplain_boots', "Chaplain's Boots", 'boots', 12, 'str_int', 18),
  A('templar_sabatons', 'Templar Sabatons', 'boots', 30, 'str_int', 39),
  A('wayfarer_boots', "Wayfarer's Boots", 'boots', 12, 'dex_int', 18),
  A('duskweave_boots', 'Duskweave Boots', 'boots', 30, 'dex_int', 39),

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
];

export function uniqueDef(id: string): UniqueDef {
  const u = UNIQUES.find((x) => x.id === id);
  if (!u) throw new Error(`Unknown unique ${id}`);
  return u;
}

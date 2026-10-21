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
  aps?: number;
  crit?: number;
  armour?: number;
  evasion?: number;
  implicits?: Implicit[];
}

const W = (id: string, name: string, reqLevel: number, phys: [number, number], aps: number, crit: number): BaseDef => ({
  id, name, slot: 'weapon', reqLevel, tags: ['weapon'], phys, aps, crit,
});

const A = (
  id: string,
  name: string,
  slot: 'helmet' | 'body' | 'gloves' | 'boots' | 'offhand',
  reqLevel: number,
  type: 'str' | 'dex',
  value: number,
): BaseDef => ({
  id,
  name,
  slot,
  reqLevel,
  tags: [slot === 'offhand' ? 'shield' : slot, 'armour', type === 'str' ? 'str_armour' : 'dex_armour'],
  ...(type === 'str' ? { armour: value } : { evasion: value }),
});

const J = (id: string, name: string, slot: 'belt' | 'amulet' | 'ring', reqLevel: number, implicits: Implicit[]): BaseDef => ({
  id, name, slot, reqLevel, tags: slot === 'belt' ? ['belt'] : [slot, 'jewellery'], implicits,
});

export const BASES: BaseDef[] = [
  W('rusted_sword', 'Rusted Sword', 1, [4, 10], 1.45, 5),
  W('whittled_dagger', 'Whittled Dagger', 1, [3, 9], 1.6, 7),
  {
    ...W('driftwood_wand', 'Driftwood Wand', 1, [1, 4], 1.4, 6),
    implicits: [
      { stat: 'lightMin', value: 1, text: 'Adds 1 to 9 Lightning Damage' },
      { stat: 'lightMax', value: 9, text: '' },
    ],
  },
  W('iron_blade', 'Iron Blade', 8, [7, 16], 1.45, 5),
  W('glinting_dagger', 'Glinting Dagger', 14, [6, 24], 1.5, 8),
  W('war_axe', 'Bearded War Axe', 18, [16, 34], 1.2, 5),
  W('steel_broadsword', 'Steel Broadsword', 24, [17, 36], 1.4, 5),
  W('mithril_sabre', 'Mithril Sabre', 34, [26, 52], 1.55, 6),

  A('plank_shield', 'Splintered Shield', 'offhand', 1, 'str', 14),
  A('buckler', 'Goathide Buckler', 'offhand', 8, 'dex', 30),
  A('kite_shield', 'Iron Kite Shield', 'offhand', 16, 'str', 70),
  A('tower_shield', 'Mithril Tower Shield', 'offhand', 32, 'str', 170),

  A('iron_hat', 'Iron Hat', 'helmet', 1, 'str', 10),
  A('leather_cap', 'Leather Cap', 'helmet', 1, 'dex', 10),
  A('soldier_helm', 'Soldier Helmet', 'helmet', 16, 'str', 48),
  A('hunter_hood', 'Hunter Hood', 'helmet', 16, 'dex', 48),
  A('great_helm', 'Mithril Great Helm', 'helmet', 32, 'str', 115),
  A('shadow_mask', 'Shadow Mask', 'helmet', 32, 'dex', 115),

  A('plate_vest', 'Plate Vest', 'body', 1, 'str', 22),
  A('shabby_jerkin', 'Shabby Jerkin', 'body', 1, 'dex', 22),
  A('chainmail', 'Chainmail Hauberk', 'body', 16, 'str', 110),
  A('scale_leather', 'Scale Leather', 'body', 16, 'dex', 110),
  A('mithril_plate', 'Mithril Plate', 'body', 32, 'str', 270),
  A('assassin_garb', "Assassin's Garb", 'body', 32, 'dex', 270),

  A('iron_gauntlets', 'Iron Gauntlets', 'gloves', 1, 'str', 8),
  A('rawhide_gloves', 'Rawhide Gloves', 'gloves', 1, 'dex', 8),
  A('steel_gauntlets', 'Steel Gauntlets', 'gloves', 20, 'str', 45),
  A('stealth_gloves', 'Stealth Gloves', 'gloves', 20, 'dex', 45),

  A('iron_greaves', 'Iron Greaves', 'boots', 1, 'str', 8),
  A('leather_boots', 'Leather Boots', 'boots', 1, 'dex', 8),
  A('steel_greaves', 'Steel Greaves', 'boots', 20, 'str', 45),
  A('shagreen_boots', 'Shagreen Boots', 'boots', 20, 'dex', 45),

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
];

export function uniqueDef(id: string): UniqueDef {
  const u = UNIQUES.find((x) => x.id === id);
  if (!u) throw new Error(`Unknown unique ${id}`);
  return u;
}

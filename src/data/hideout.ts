export type StationId = 'stash' | 'forge' | 'alchemy_table' | 'bench' | 'vendor' | 'map_device';

export interface StationLevel {
  cost: Record<string, number>;
  /** human readable effect at this level */
  effect: string;
}

export interface StationDef {
  id: StationId;
  name: string;
  desc: string;
  color: string;
  /** index 0 = level 1 (built from the start, cost ignored) */
  levels: StationLevel[];
  /** page the station opens */
  page: string;
}

export const STATIONS: StationDef[] = [
  {
    id: 'map_device', name: 'Map Device', page: 'combat', color: '#8a7ad8',
    desc: 'Opens portals to the wilds. Upgrades attune it to richer loot.',
    levels: [
      { cost: {}, effect: 'Open portals to unlocked zones' },
      { cost: { gold: 400, rough_gem: 3 }, effect: '+10% Item Rarity' },
      { cost: { gold: 1500, rough_gem: 8, iron_ore: 40 }, effect: '+20% Item Rarity' },
      { cost: { gold: 5000, rough_gem: 20, mithril_ore: 60 }, effect: '+35% Item Rarity, +1 item level on drops' },
    ],
  },
  {
    id: 'stash', name: 'Stash', page: 'stash', color: '#c9a227',
    desc: 'Your hoard. Upgrades add room for items.',
    levels: [
      { cost: {}, effect: '40 inventory slots' },
      { cost: { gold: 200, ash_log: 40 }, effect: '60 inventory slots' },
      { cost: { gold: 800, oak_log: 60, iron_ore: 30 }, effect: '90 inventory slots' },
      { cost: { gold: 3000, yew_log: 80, mithril_ore: 40 }, effect: '130 inventory slots' },
    ],
  },
  {
    id: 'forge', name: 'Forge', page: 'smithing', color: '#d07a3a',
    desc: 'Where bases are hammered out. Upgrades raise the item level of smithed gear.',
    levels: [
      { cost: {}, effect: 'Smith bases at your Smithing level' },
      { cost: { gold: 250, copper_ore: 60 }, effect: '+3 item level, +5% Smithing speed' },
      { cost: { gold: 1200, iron_ore: 80, oak_log: 40 }, effect: '+6 item level, +10% Smithing speed' },
      { cost: { gold: 4000, mithril_ore: 80, yew_log: 40 }, effect: '+10 item level, +20% Smithing speed' },
    ],
  },
  {
    id: 'alchemy_table', name: 'Alchemy Table', page: 'alchemy', color: '#9b6dde',
    desc: 'Bubbling retorts. Upgrades sometimes yield extra output.',
    levels: [
      { cost: {}, effect: 'Brew flasks and transmute dust' },
      { cost: { gold: 250, sunpetal: 50 }, effect: '10% chance for double output' },
      { cost: { gold: 1200, frostleaf: 60, rough_gem: 4 }, effect: '20% chance for double output' },
      { cost: { gold: 4000, emberroot: 80, voidbloom: 20 }, effect: '30% chance for double output, +10% Alchemy speed' },
    ],
  },
  {
    id: 'bench', name: 'Crafting Bench', page: 'bench', color: '#5fa8d3',
    desc: 'Apply orbs, salvage, and add a crafted modifier of your choosing.',
    levels: [
      { cost: {}, effect: 'Apply currency, salvage items' },
      { cost: { gold: 300, arcane_dust: 40 }, effect: 'Bench crafts: Life & Resistances' },
      { cost: { gold: 1500, arcane_dust: 120, rough_gem: 6 }, effect: 'More bench recipes (each also needs its achievement)' },
      { cost: { gold: 5000, arcane_dust: 300, rough_gem: 15 }, effect: 'Top-tier bench recipes (each also needs its achievement)' },
    ],
  },
  {
    id: 'vendor', name: "Trader's Stall", page: 'vendor', color: '#6fae4a',
    desc: 'A wandering merchant set up shop. Upgrades bring better wares.',
    levels: [
      { cost: {}, effect: '6 offers, refreshes every 10 min' },
      { cost: { gold: 300 }, effect: '8 offers, magic items in stock' },
      { cost: { gold: 1500, rough_gem: 5 }, effect: '10 offers, rare items in stock' },
      { cost: { gold: 6000, rough_gem: 15 }, effect: '12 offers, rarer currency in stock' },
    ],
  },
];

export function stationDef(id: StationId): StationDef {
  return STATIONS.find((s) => s.id === id)!;
}

export const STASH_CAPACITY = [40, 60, 90, 130];
export const FORGE_ILVL = [0, 3, 6, 10];
export const FORGE_SPEED = [0, 5, 10, 20];
export const ALCH_DOUBLE = [0, 0.1, 0.2, 0.3];
export const ALCH_SPEED = [0, 0, 0, 10];
export const MAP_RARITY = [0, 10, 20, 35];
export const MAP_ILVL = [0, 0, 0, 1];
export const VENDOR_SLOTS = [6, 8, 10, 12];
export const VENDOR_REFRESH_MS = 10 * 60 * 1000;
/** Craft until…: time per orb or Essence spent. */
export const CRAFT_STEP_MS = 1500;

export interface BenchCraft {
  id: string;
  benchLevel: number;
  /** achievement that unlocks this recipe (on top of the bench level) */
  achievement?: string;
  affixId: string;
  /** tier index of the affix to craft */
  tier: number;
  cost: Record<string, number>;
}

export const BENCH_CRAFTS: BenchCraft[] = [
  { id: 'bc_life', benchLevel: 2, affixId: 'flat_life', tier: 1, cost: { gold: 60, arcane_dust: 8 } },
  { id: 'bc_fire', benchLevel: 2, affixId: 'fire_res', tier: 1, cost: { gold: 50, arcane_dust: 6 } },
  { id: 'bc_cold', benchLevel: 2, affixId: 'cold_res', tier: 1, cost: { gold: 50, arcane_dust: 6 } },
  { id: 'bc_light', benchLevel: 2, affixId: 'light_res', tier: 1, cost: { gold: 50, arcane_dust: 6 } },
  { id: 'bc_mana', benchLevel: 2, achievement: 'salvager_50', affixId: 'flat_mana', tier: 1, cost: { gold: 60, arcane_dust: 8 } },
  { id: 'bc_speed', benchLevel: 3, achievement: 'slayer_1000', affixId: 'attack_speed', tier: 2, cost: { gold: 200, arcane_dust: 20 } },
  { id: 'bc_phys', benchLevel: 3, achievement: 'boss_10', affixId: 'added_phys', tier: 2, cost: { gold: 200, arcane_dust: 20 } },
  { id: 'bc_armour', benchLevel: 3, achievement: 'crafter_25', affixId: 'inc_armour', tier: 2, cost: { gold: 150, arcane_dust: 15 } },
  { id: 'bc_evasion', benchLevel: 3, achievement: 'crafter_25', affixId: 'inc_evasion', tier: 2, cost: { gold: 150, arcane_dust: 15 } },
  { id: 'bc_flask_charges', benchLevel: 3, achievement: 'flask_100', affixId: 'flask_charges', tier: 2, cost: { gold: 150, arcane_dust: 15 } },
  { id: 'bc_skill_speed', benchLevel: 3, achievement: 'total_50', affixId: 'skill_speed', tier: 2, cost: { gold: 150, arcane_dust: 15 } },
  { id: 'bc_str', benchLevel: 3, achievement: 'smith_100', affixId: 'strength', tier: 2, cost: { gold: 120, arcane_dust: 12 } },
  { id: 'bc_dex', benchLevel: 3, achievement: 'smith_100', affixId: 'dexterity', tier: 2, cost: { gold: 120, arcane_dust: 12 } },
  { id: 'bc_int', benchLevel: 3, achievement: 'smith_100', affixId: 'intelligence', tier: 2, cost: { gold: 120, arcane_dust: 12 } },
  { id: 'bc_accuracy', benchLevel: 3, achievement: 'level_25', affixId: 'accuracy', tier: 2, cost: { gold: 150, arcane_dust: 15 } },
  { id: 'bc_crit', benchLevel: 4, achievement: 'crafter_250', affixId: 'crit_chance', tier: 3, cost: { gold: 500, arcane_dust: 40 } },
  { id: 'bc_multi', benchLevel: 4, achievement: 'crafter_250', affixId: 'crit_multi', tier: 3, cost: { gold: 500, arcane_dust: 40 } },
  { id: 'bc_rarity', benchLevel: 4, achievement: 'unique_find', affixId: 'item_rarity', tier: 2, cost: { gold: 400, arcane_dust: 35 } },
  { id: 'bc_elem', benchLevel: 4, achievement: 'bench_10', affixId: 'inc_elem', tier: 3, cost: { gold: 500, arcane_dust: 40 } },
];

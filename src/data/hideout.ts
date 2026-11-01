import type { RuleUnlock } from './gems';

export type StationId = 'stash' | 'forge' | 'alchemy_table' | 'bench' | 'vendor' | 'map_device' | 'war_table' | 'watchtower';

/** What a station level adds to the automation unlocks for good. */
export interface StationGrant {
  rules?: RuleUnlock[];
  /** rule slots per skill */
  ruleSlots?: number;
  offlineHours?: number;
}

export interface StationLevel {
  cost: Record<string, number>;
  /** human readable effect at this level */
  effect: string;
  grants?: StationGrant;
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
    id: 'map_device', name: 'Map Device', page: 'maps', color: '#8a7ad8',
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
    desc: 'Your hoard. Each upgrade carves out a free stash page.',
    levels: [
      { cost: {}, effect: '3 stash pages' },
      { cost: { gold: 2000, ash_log: 300, copper_ore: 150 }, effect: '+1 free stash page' },
      { cost: { gold: 10000, oak_log: 400, iron_ore: 250 }, effect: '+1 free stash page' },
      { cost: { gold: 40000, yew_log: 400, mithril_ore: 250 }, effect: '+1 free stash page' },
    ],
  },
  {
    id: 'forge', name: 'Forge', page: 'smithing', color: '#d07a3a',
    desc: 'Where bases are hammered out. Each upgrade opens the next tier of bases to smith.',
    levels: [
      { cost: {}, effect: 'Smith copper-tier bases (level 1–9)' },
      { cost: { gold: 3000, copper_ore: 500, ash_log: 250 }, effect: 'Smith iron-tier bases (level 10–21)' },
      { cost: { gold: 15000, iron_ore: 700, oak_log: 350 }, effect: 'Smith mithril-tier bases (level 22+)' },
      { cost: { gold: 60000, mithril_ore: 600, yew_log: 300, rough_gem: 25 }, effect: 'Masterwork: smithed bases +5 item level' },
    ],
  },
  {
    id: 'alchemy_table', name: 'Alchemy Table', page: 'alchemy', color: '#9b6dde',
    desc: 'Bubbling retorts. Each upgrade opens the next tier of recipes.',
    levels: [
      { cost: {}, effect: 'Brew recipes below Alchemy level 10' },
      { cost: { gold: 3000, sunpetal: 400, ash_log: 150 }, effect: 'Brew recipes up to Alchemy level 19' },
      { cost: { gold: 15000, frostleaf: 500, rough_gem: 10 }, effect: 'Brew every recipe' },
      { cost: { gold: 60000, emberroot: 500, voidbloom: 100 }, effect: '20% chance of double output' },
    ],
  },
  {
    id: 'bench', name: 'Crafting Bench', page: 'bench', color: '#5fa8d3',
    desc: 'Orbs work on gear anywhere. Build the bench to salvage gear and add a crafted modifier of your choosing.',
    levels: [
      { cost: {}, effect: 'Not built: use orbs on your gear' },
      { cost: { gold: 1500, ash_log: 200, copper_ore: 200 }, effect: 'Built: salvage gear, Life & Resistance crafts' },
      { cost: { gold: 8000, arcane_dust: 400, rough_gem: 10 }, effect: 'More bench recipes (each also needs its achievement), and gear sets can switch on their own' },
      { cost: { gold: 30000, arcane_dust: 1200, rough_gem: 25 }, effect: 'Top-tier bench recipes (each also needs its achievement)' },
      { cost: { gold: 100000, arcane_dust: 3000, rough_gem: 60 }, effect: 'Auto-crafting: spend orbs until a modifier rolls, even offline' },
    ],
  },
  {
    id: 'vendor', name: 'Town Market', page: 'vendor', color: '#6fae4a',
    desc: 'Your standing with the town merchants. Upgrades bring more stock to every shop, restocked faster.',
    levels: [
      { cost: {}, effect: '4 wares per shop, restock every 10 min' },
      { cost: { gold: 5000, oak_log: 100 }, effect: '5 per shop, every 8 min, rare gear' },
      { cost: { gold: 20000, iron_ore: 200, rough_gem: 10 }, effect: '6 per shop, every 6 min, rarer currency' },
      { cost: { gold: 80000, mithril_ore: 150, rough_gem: 30 }, effect: '8 per shop, every 4 min, better-rolled gear' },
    ],
  },
  {
    id: 'war_table', name: 'War Table', page: 'skills', color: '#c8553d',
    desc: 'Where you plan fights ahead of time. Upgrades teach your skills new rules, for good.',
    levels: [
      { cost: {}, effect: 'Simple rules, 1 rule slot per skill' },
      { cost: { gold: 1500, ash_log: 150, copper_ore: 150 }, effect: 'Vitals rules: when life or mana is below, or Frostbite builds', grants: { rules: ['vitals'] } },
      { cost: { gold: 6000, oak_log: 1200, iron_ore: 1200 }, effect: 'Status rules, and a 2nd rule slot per skill', grants: { rules: ['status'], ruleSlots: 2 } },
      { cost: { gold: 8000, oak_log: 1500, iron_ore: 1500, rough_gem: 15 }, effect: 'Ground rules: react to the ground under you', grants: { rules: ['ground'] } },
      { cost: { gold: 12000, oak_log: 1500, iron_ore: 1500, rough_gem: 25 }, effect: 'Wind-up rules: bosses can now be fought offline', grants: { rules: ['windups'] } },
      { cost: { gold: 16000, oak_log: 2000, iron_ore: 2000, rough_gem: 40 }, effect: "Aim rules: a skill's rule can send it at chained martyrs", grants: { rules: ['aim'] } },
      { cost: { gold: 80000, yew_log: 4000, mithril_ore: 4000, rough_gem: 100 }, effect: 'A 3rd rule slot per skill', grants: { ruleSlots: 3 } },
    ],
  },
  {
    id: 'watchtower', name: 'Watchtower', page: 'hideout', color: '#7f9bb3',
    desc: 'Someone to keep watch while you sleep. Upgrades keep the game running for longer while you are away.',
    levels: [
      { cost: {}, effect: 'Up to 8 hours of offline progress' },
      { cost: { gold: 4000, ash_log: 300, copper_ore: 300 }, effect: 'Up to 12 hours offline', grants: { offlineHours: 12 } },
      { cost: { gold: 25000, oak_log: 4000, iron_ore: 4000 }, effect: 'Up to 16 hours offline', grants: { offlineHours: 16 } },
      { cost: { gold: 200000, yew_log: 8000, mithril_ore: 8000, rough_gem: 200 }, effect: 'Up to 24 hours offline', grants: { offlineHours: 24 } },
    ],
  },
];

export function stationDef(id: StationId): StationDef {
  return STATIONS.find((s) => s.id === id)!;
}

/** Gear storage: see docs/design/TOWN.md. */
export const BAG_SIZE = 60;
export const GROUND_CAP = 50;
export const OFFLINE_HAUL_CAP = 200;
export const STASH_PAGE_SIZE = 80;
export const STASH_START_PAGES = 3;
/** Gold for the first bought page; each later one costs PAGE_GROWTH times more. */
export const STASH_PAGE_PRICE = 1000;
export const STASH_PAGE_GROWTH = 2.5;
/** item levels the Forge adds to smithed bases, per level (Masterwork at the top) */
export const FORGE_ILVL = [0, 0, 0, 5];
export const ALCH_DOUBLE = [0, 0, 0, 0.2];
/** the Crafting Bench level that counts as built (salvaging and bench crafts) */
export const BENCH_BUILT_LEVEL = 2;
export const MAP_RARITY = [0, 10, 20, 35];
export const MAP_ILVL = [0, 0, 0, 1];
/** wares per Town shop, and minutes between free restocks, per Town Market level */
export const SHOP_SLOTS = [4, 5, 6, 8];
export const SHOP_REFRESH_MIN = [10, 8, 6, 4];
/** Auto-crafting: time per orb or Essence spent. */
export const AUTO_CRAFT_BENCH_LEVEL = 5;
export const CRAFT_STEP_MS = 1500;
/** The Crafting Bench level that lets a gear set go on by itself when an activity starts. Sets themselves are free. */
export const GEAR_SWITCH_BENCH_LEVEL = 3;

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

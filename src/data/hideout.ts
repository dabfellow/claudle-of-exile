import type { RuleUnlock } from './gems';

export type StationId = 'stash' | 'forge' | 'alchemy_table' | 'bench' | 'vendor' | 'map_device' | 'war_table' | 'quartermaster' | 'watchtower' | 'trophy_altar' | 'rune_board';

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
      { cost: { gold: 400, copper_bar: 8, ash_plank: 8 }, effect: 'Atlas of the Realm unlocked, +10% Item Rarity' },
      { cost: { gold: 1500, iron_bar: 20, oak_plank: 15, rough_gem: 4 }, effect: '+20% Item Rarity' },
      { cost: { gold: 5000, mithril_bar: 30, yew_plank: 20, rough_gem: 10, boss_trophy: 5 }, effect: '+35% Item Rarity, +1 item level on drops' },
      { cost: { gold: 25000, mithril_bar: 40, yew_plank: 20, rough_gem: 15, boss_trophy: 6 }, effect: '+50% Item Rarity, +2 item level on drops, 4th Sextant slot unlocked permanently' },
      { cost: { gold: 75000, mithril_bar: 80, yew_plank: 40, rough_gem: 30, boss_trophy: 15, throne_ash: 3, crownless_sigil: 1 }, effect: 'Pinnacle Conduit: 15% chance for Map Bosses to drop an extra Map or Key; Sextant modifiers gain +2 base charges' },
      { cost: { gold: 150000, mithril_bar: 120, yew_plank: 60, rough_gem: 40, boss_trophy: 20, throne_ash: 4, crownless_sigil: 2 }, effect: 'Void Influx: +65% Item Rarity, +3 item level on drops, Sextant modifiers gain +5 base charges' },
      { cost: { gold: 300000, mithril_bar: 150, yew_plank: 80, rough_gem: 50, crownless_sigil: 2, exile_doom_sigil: 2, architect_doom_sigil: 1 }, effect: 'Doomed Attunement: +80% Item Rarity, +4 item level on drops, +25% Doomed Map drop chance from Tier 8–10 Map Bosses' },
      { cost: { gold: 500000, mithril_bar: 200, yew_plank: 100, rough_gem: 60, void_sigil: 3, divine: 10 }, effect: 'Apex Riftgate: +100% Item Rarity, +5 item level on drops, Map Bosses have 15% chance to drop a random Uber Key' },
    ],
  },
  {
    id: 'stash', name: 'Stash', page: 'stash', color: '#c9a227',
    desc: 'Your hoard. Each upgrade carves out free stash pages and makes bought tabs cheaper.',
    levels: [
      { cost: {}, effect: '3 stash pages' },
      { cost: { gold: 1500, ash_plank: 40, copper_bar: 25 }, effect: '+1 free stash page' },
      { cost: { gold: 6000, oak_plank: 50, iron_bar: 35, boss_trophy: 2 }, effect: '+1 free stash page' },
      { cost: { gold: 18000, yew_plank: 60, mithril_bar: 40, boss_trophy: 5 }, effect: '+1 free stash page' },
      { cost: { gold: 20000, yew_plank: 60, mithril_bar: 40, boss_trophy: 5 }, effect: 'Dedicated Map Storage Tab' },
      { cost: { gold: 60000, yew_plank: 100, mithril_bar: 80, boss_trophy: 10 }, effect: '+2 free stash pages (8 free total)' },
      { cost: { gold: 100000, yew_plank: 120, mithril_bar: 100, boss_trophy: 15, marrow_shard: 4 }, effect: 'Ground-Loot Storage: expands ground loot capacity to 100 and offline haul to 300' },
      { cost: { gold: 250000, yew_plank: 150, mithril_bar: 120, boss_trophy: 20, crownless_sigil: 3, exile_doom_sigil: 1 }, effect: '+2 free stash pages (10 free total), expands offline haul capacity to 400' },
      { cost: { gold: 500000, yew_plank: 200, mithril_bar: 150, void_sigil: 2, divine: 10 }, effect: '+3 free stash pages (13 free total), expands ground loot capacity to 150 and offline haul to 500' },
    ],
  },
  {
    id: 'forge', name: 'Forge', page: 'smithing', color: '#d07a3a',
    desc: 'Where bases are hammered out. Each upgrade opens the next tier of bases and improves smithed gear tiers.',
    levels: [
      { cost: {}, effect: 'Smith copper-tier bases (level 1–9)' },
      { cost: { gold: 1500, copper_bar: 50, ash_plank: 25 }, effect: 'Smith iron-tier bases (level 10–21)' },
      { cost: { gold: 7000, iron_bar: 70, oak_plank: 35, boss_trophy: 2 }, effect: 'Smith mithril-tier bases (level 22+)' },
      { cost: { gold: 22000, mithril_bar: 80, yew_plank: 40, rough_gem: 12, boss_trophy: 6 }, effect: 'Masterwork: smithed bases +5 item level' },
      { cost: { gold: 35000, mithril_bar: 100, yew_plank: 50, boss_trophy: 8, marrow_shard: 5 }, effect: 'Pinnacle Metallurgy: smithed bases +8 item level (up to ilvl 84); 10% chance to roll a random Tier 1 modifier' },
      { cost: { gold: 80000, mithril_bar: 120, yew_plank: 60, boss_trophy: 20, marrow_shard: 5 }, effect: "Artificer's Temper: smithed bases +10 item level (up to ilvl 86); 35% chance to roll Tier 2+ gear" },
      { cost: { gold: 220000, mithril_bar: 160, yew_plank: 80, throne_ash: 4, crownless_sigil: 2 }, effect: 'Sovereign Smelting: smithed bases +12 item level (up to ilvl 88); 50% chance for Tier 2+ gear (25% Tier 3+), 15% chance for a random Tier 1 modifier' },
      { cost: { gold: 500000, mithril_bar: 200, yew_plank: 100, exile_doom_sigil: 2, architect_doom_sigil: 2, void_sigil: 1 }, effect: 'Doom-Forged Crucible: smithed bases +14 item level (up to ilvl 90); 65% chance for Tier 2+ gear (35% Tier 3+, 15% Tier 4+, 5% Tier 5), 25% chance for a random Tier 1 modifier' },
    ],
  },
  {
    id: 'alchemy_table', name: 'Alchemy Table', page: 'alchemy', color: '#9b6dde',
    desc: 'Bubbling retorts. Each upgrade opens the next tier of recipes and amplifies laboratory yield.',
    levels: [
      { cost: {}, effect: 'Brew recipes below Alchemy level 10' },
      { cost: { gold: 1500, sunpetal: 150, ash_plank: 20 }, effect: 'Brew recipes up to Alchemy level 19' },
      { cost: { gold: 7000, frostleaf: 200, rough_gem: 6, boss_trophy: 2 }, effect: 'Brew every recipe' },
      { cost: { gold: 22000, emberroot: 180, voidbloom: 40, boss_trophy: 6 }, effect: '20% chance of double output' },
      { cost: { gold: 35000, voidbloom: 200, rough_gem: 20, boss_trophy: 8, black_pearl: 5 }, effect: 'Elixirs and Distillation: 30% chance of double output, and 3:1 orb conversion at the table' },
      { cost: { gold: 80000, voidbloom: 220, rough_gem: 30, choir_glass: 5 }, effect: 'Quintessence Distillation: 40% chance of double output' },
      { cost: { gold: 220000, voidbloom: 250, rough_gem: 40, black_pearl: 5, crownless_sigil: 2 }, effect: 'Transmutative Mastery: 50% chance of double output; 15% chance for brewed potions and catalysts to refund all ingredients' },
      { cost: { gold: 500000, voidbloom: 300, rough_gem: 50, void_sigil: 2, divine: 5 }, effect: 'Philosopher\'s Crucible: 60% chance of double output; 10% chance for orbs crafted to elevate one tier up (up to Divine)' },
    ],
  },
  {
    id: 'bench', name: 'Crafting Bench', page: 'bench', color: '#5fa8d3',
    desc: 'Orbs work on gear anywhere. Build the bench to salvage gear and add a crafted modifier of your choosing.',
    levels: [
      { cost: {}, effect: 'Not built: use orbs on your gear' },
      { cost: { gold: 1500, ash_plank: 30, copper_bar: 30 }, effect: 'Built: salvage gear, Life & Resistance crafts' },
      { cost: { gold: 6000, arcane_dust: 250, iron_bar: 25, rough_gem: 5, boss_trophy: 2 }, effect: 'More bench recipes, and gear sets can switch on their own' },
      { cost: { gold: 18000, arcane_dust: 600, mithril_bar: 35, rough_gem: 12, boss_trophy: 5 }, effect: 'Top-tier bench recipes' },
      { cost: { gold: 50000, arcane_dust: 1200, mithril_bar: 70, rough_gem: 25, boss_trophy: 10 }, effect: 'Auto-crafting: spend orbs until a modifier rolls, even offline' },
      { cost: { gold: 100000, arcane_dust: 2500, mithril_bar: 100, rough_gem: 40, boss_trophy: 15 }, effect: 'Meta-crafting: Lock Prefixes, Lock Suffixes, and Multicraft' },
      { cost: { gold: 120000, arcane_dust: 3500, mithril_bar: 120, rough_gem: 50, boss_trophy: 20, choir_glass: 3, crownless_sigil: 1 }, effect: 'Pinnacle Crafting: Doom Sigils, Cannot roll Attack / Caster Modifiers' },
      { cost: { gold: 180000, arcane_dust: 4000, mithril_bar: 150, rough_gem: 60, boss_trophy: 25, crownless_sigil: 3 }, effect: 'Master Artisan: 25% reduced Arcane Dust and gold crafting costs across all bench crafts; unlocks Tier 6 bench crafts' },
      { cost: { gold: 350000, arcane_dust: 6000, mithril_bar: 180, rough_gem: 80, exile_doom_sigil: 2, architect_doom_sigil: 2 }, effect: 'Transcendent Artificer: allows 2 crafted modifiers without Multicraft; unlocks the Exile and Architect crafts' },
      { cost: { gold: 750000, arcane_dust: 10000, mithril_bar: 250, rough_gem: 100, void_sigil: 3, divine: 5 }, effect: 'Omnipotent Crucible: unlocks removing individual crafted modifiers freely, and Void bench crafts' },
    ],
  },
  {
    id: 'vendor', name: 'Town Market', page: 'vendor', color: '#6fae4a',
    desc: 'Your standing with the town merchants. Upgrades bring more stock to the gear shops, restocked faster.',
    levels: [
      { cost: {}, effect: '4 wares per shop, restock every 10 min' },
      { cost: { gold: 3000, oak_plank: 20 }, effect: '5 per shop, every 8 min, rare gear' },
      { cost: { gold: 10000, iron_bar: 35, rough_gem: 5, boss_trophy: 2 }, effect: '6 per shop, every 6 min, rarer currency' },
      { cost: { gold: 30000, mithril_bar: 45, rough_gem: 15, boss_trophy: 6 }, effect: '8 per shop, every 4 min, better-rolled gear' },
      { cost: { gold: 75000, mithril_bar: 80, rough_gem: 30, boss_trophy: 10, black_pearl: 4 }, effect: 'Merchant Prince: 10 wares per shop, restock every 3 min, chance for Tier 2+ gear in shops' },
      { cost: { gold: 200000, mithril_bar: 120, rough_gem: 40, boss_trophy: 15, crownless_sigil: 2, exile_doom_sigil: 1 }, effect: 'Black Market Syndicate: 12 wares per shop, restock every 2 min; shops can stock Divine and Exalted Orbs' },
      { cost: { gold: 450000, mithril_bar: 160, rough_gem: 60, boss_trophy: 20, void_sigil: 2, divine: 5 }, effect: 'Emperor\'s Grand Bazaar: 15 wares per shop, restock every 1 min; high chance for Tier 3+ gear' },
    ],
  },
  {
    id: 'war_table', name: 'War Table', page: 'skills', color: '#c8553d',
    desc: 'Where you plan fights ahead of time. Essential survival rules are free; upgrades add advanced tactics and loot automation.',
    levels: [
      { cost: {}, effect: 'Vitals, wind-up and ground rules; 2 rule slots per skill' },
      { cost: { gold: 750, ash_plank: 15, copper_bar: 15 }, effect: 'Status rules', grants: { rules: ['status'] } },
      { cost: { gold: 2000, oak_plank: 25, iron_bar: 25 }, effect: "Aim rules: a skill's rule can send it at special targets", grants: { rules: ['aim'] } },
      { cost: { gold: 4000, oak_plank: 40, iron_bar: 40, rough_gem: 4 }, effect: 'A 3rd rule slot per skill', grants: { ruleSlots: 3 } },
    ],
  },
  {
    id: 'quartermaster', name: 'Quartermaster', page: 'hideout', color: '#d6a84b',
    desc: 'Controls what dropped gear is shown, highlighted or salvaged. Open the station to build layered loot filters.',
    levels: [
      { cost: {}, effect: 'Level-scaled loot presets, category overrides and shareable custom rules' },
      { cost: { gold: 7000, oak_plank: 60, iron_bar: 60, rough_gem: 6 }, effect: 'Auto-salvage Normal drops' },
      { cost: { gold: 12000, oak_plank: 80, iron_bar: 80, rough_gem: 8, boss_trophy: 3 }, effect: 'Auto-salvage Magic drops' },
      { cost: { gold: 30000, yew_plank: 150, mithril_bar: 150, rough_gem: 20, boss_trophy: 8 }, effect: 'Auto-salvage Rare drops' },
    ],
  },
  {
    id: 'watchtower', name: 'Watchtower', page: 'hideout', color: '#7f9bb3',
    desc: 'Someone to keep watch while you sleep. Upgrades keep the game running for longer while you are away.',
    levels: [
      { cost: {}, effect: 'Up to 8 hours of offline progress' },
      { cost: { gold: 2000, ash_plank: 50, copper_bar: 50 }, effect: 'Up to 12 hours offline', grants: { offlineHours: 12 } },
      { cost: { gold: 10000, oak_plank: 120, iron_bar: 120, boss_trophy: 3 }, effect: 'Up to 16 hours offline', grants: { offlineHours: 16 } },
      { cost: { gold: 50000, yew_plank: 250, mithril_bar: 250, rough_gem: 30, boss_trophy: 10 }, effect: 'Up to 24 hours offline', grants: { offlineHours: 24 } },
      { cost: { gold: 80000, yew_plank: 300, mithril_bar: 300, rough_gem: 35, boss_trophy: 15, black_pearl: 3 }, effect: 'Autonomous Offline Mapping: up to 36 hours offline', grants: { offlineHours: 36 } },
      { cost: { gold: 150000, yew_plank: 400, mithril_bar: 400, rough_gem: 40, boss_trophy: 20, throne_ash: 4, crownless_sigil: 2 }, effect: 'Vigil of the Horizon: up to 48 hours offline', grants: { offlineHours: 48 } },
      { cost: { gold: 350000, yew_plank: 500, mithril_bar: 500, rough_gem: 50, boss_trophy: 25, crownless_sigil: 2, exile_doom_sigil: 2 }, effect: 'Starlight Sentinel: up to 60 hours offline', grants: { offlineHours: 60 } },
      { cost: { gold: 600000, yew_plank: 600, mithril_bar: 600, rough_gem: 60, boss_trophy: 30, void_sigil: 2, divine: 5 }, effect: 'Eternal Bastion: up to 72 hours offline', grants: { offlineHours: 72 } },
    ],
  },
  {
    id: 'trophy_altar', name: 'Trophy Altar', page: 'hideout', color: '#d4af37',
    desc: 'A monument to your greatest triumphs. Displays earned boss trophies and sigils to grant realm-wide bonuses.',
    levels: [
      { cost: {}, effect: 'Displays boss trophies; +3% Armour and Evasion realm-wide' },
      { cost: { gold: 15000, mithril_bar: 30, yew_plank: 30, boss_trophy: 5 }, effect: '+5% increased Mana regeneration rate' },
      { cost: { gold: 45000, mithril_bar: 60, yew_plank: 60, rough_gem: 20, boss_trophy: 10 }, effect: '+4% all Elemental Resistances' },
      { cost: { gold: 90000, mithril_bar: 100, yew_plank: 100, rough_gem: 40, boss_trophy: 20, marrow_shard: 3, choir_glass: 3, black_pearl: 3, throne_ash: 3 }, effect: '+10% increased Map Boss drop rates and high-tier modifier rolls' },
      { cost: { gold: 150000, mithril_bar: 120, yew_plank: 120, rough_gem: 50, boss_trophy: 25, crownless_sigil: 3 }, effect: 'Monolith of the Fallen: +6% all Attributes and +5% Armour/Evasion realm-wide' },
      { cost: { gold: 350000, mithril_bar: 150, yew_plank: 150, rough_gem: 60, boss_trophy: 30, exile_doom_sigil: 2, architect_doom_sigil: 2 }, effect: 'Shrine of the Void: +5% Maximum Life realm-wide' },
      { cost: { gold: 750000, mithril_bar: 200, yew_plank: 200, rough_gem: 80, boss_trophy: 40, void_sigil: 3, divine: 5 }, effect: 'Hall of the Immortals: +6% all Elemental Resistances and +15% Item Rarity realm-wide' },
    ],
  },
  {
    id: 'rune_board', name: 'Rune Board', page: 'skills', color: '#4fc1e8',
    desc: 'Ancient stone tablets where carved runes are attuned. Upgrades empower resonance and awaken dormant runic words.',
    levels: [
      { cost: {}, effect: 'Inscribe carved runes into gear; +5% resonance per matching piece' },
      { cost: { gold: 5000, oak_plank: 30, iron_bar: 30, rough_gem: 10, boss_trophy: 2 }, effect: '+7% resonance per matching piece; runes carved have 10% chance to not consume flavour materials' },
      { cost: { gold: 25000, yew_plank: 60, mithril_bar: 50, rough_gem: 20, boss_trophy: 6, marrow_shard: 2 }, effect: '+15% increased effect for all carved runes; +10% resonance per matching piece' },
      { cost: { gold: 90000, yew_plank: 100, mithril_bar: 80, rough_gem: 30, boss_trophy: 12, choir_glass: 3, black_pearl: 3 }, effect: '+25% increased effect for all carved runes; +2% all Elemental Resistances while wearing 3+ runes' },
      { cost: { gold: 250000, yew_plank: 150, mithril_bar: 120, rough_gem: 40, boss_trophy: 20, throne_ash: 2, crownless_sigil: 2 }, effect: '+40% increased effect for all carved runes; +15% resonance per matching piece' },
      { cost: { gold: 600000, yew_plank: 200, mithril_bar: 160, rough_gem: 60, exile_doom_sigil: 2, void_sigil: 2, divine: 5 }, effect: 'Apex Transcendence: +60% increased effect for all carved runes; +5% all Elemental Resistances realm-wide' },
    ],
  },
];

export function stationDef(id: StationId): StationDef {
  return STATIONS.find((s) => s.id === id)!;
}

/** Gear storage: see docs/GAME.md. */
export const BAG_SIZE = 60;
export const GROUND_CAP = 50;
export const OFFLINE_HAUL_CAP = 200;
export const STASH_PAGE_SIZE = 80;
export const STASH_START_PAGES = 3;
/** Gold for the first bought page; each later one costs PAGE_GROWTH times more. */
export const STASH_PAGE_PRICE = 1000;
export const STASH_PAGE_GROWTH = 2.5;
/** item levels the Forge adds to smithed bases, per level (Masterwork at the top) */
export const FORGE_ILVL = [0, 0, 0, 5, 8, 10, 12, 14];
export const ALCH_DOUBLE = [0, 0, 0, 0.2, 0.3, 0.4, 0.5, 0.6];
/** the Crafting Bench level that counts as built (salvaging and bench crafts) */
export const BENCH_BUILT_LEVEL = 2;
export const MAP_DEVICE_ATLAS_LEVEL = 2;
export const MAP_DEVICE_SEXTANT_SLOTS = [1, 2, 2, 3, 4, 4, 4, 4, 4];
export const MAP_RARITY = [0, 10, 20, 35, 50, 65, 80, 100, 120];
export const MAP_ILVL = [0, 0, 0, 1, 2, 3, 4, 5, 6];
/** wares per Town shop, and minutes between free restocks, per Town Market level */
export const SHOP_SLOTS = [4, 5, 6, 8, 10, 12, 15];
export const SHOP_REFRESH_MIN = [10, 8, 6, 4, 3, 2, 1];
export const STASH_FREE_PAGES = [3, 4, 5, 6, 6, 8, 8, 10, 13];

export function groundCap(stashLvl: number): number {
  return stashLvl >= 9 ? 150 : stashLvl >= 7 ? 100 : GROUND_CAP;
}

export function offlineHaulCap(stashLvl: number): number {
  return stashLvl >= 9 ? 500 : stashLvl >= 8 ? 400 : stashLvl >= 7 ? 300 : OFFLINE_HAUL_CAP;
}

/** Auto-crafting: time per orb or Essence spent. */
export const AUTO_CRAFT_BENCH_LEVEL = 5;
export const META_CRAFT_BENCH_LEVEL = 6;
export const PINNACLE_CRAFT_BENCH_LEVEL = 7;
export const MASTER_ARTISAN_BENCH_LEVEL = 8;
export const TRANSCENDENT_BENCH_LEVEL = 9;
export const OMNIPOTENT_BENCH_LEVEL = 10;
export const CRAFT_STEP_MS = 1500;
/** The Crafting Bench level that lets a gear set go on by itself when an activity starts. Sets themselves are free. */
export const GEAR_SWITCH_BENCH_LEVEL = 3;
/** Quartermaster tiers that allow each loot rarity to be auto-salvaged. */
export const AUTO_SALVAGE_QUARTERMASTER_LEVEL: Record<'normal' | 'magic' | 'rare', number> = { normal: 2, magic: 3, rare: 4 };

export interface BenchCraft {
  id: string;
  /** the Bench level alone unlocks a recipe */
  benchLevel: number;
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
  { id: 'bc_mana', benchLevel: 2, affixId: 'flat_mana', tier: 1, cost: { gold: 60, arcane_dust: 8 } },
  { id: 'bc_speed', benchLevel: 3, affixId: 'attack_speed', tier: 2, cost: { gold: 200, arcane_dust: 20 } },
  { id: 'bc_phys', benchLevel: 3, affixId: 'added_phys', tier: 2, cost: { gold: 200, arcane_dust: 20 } },
  { id: 'bc_armour', benchLevel: 3, affixId: 'inc_armour', tier: 2, cost: { gold: 150, arcane_dust: 15 } },
  { id: 'bc_evasion', benchLevel: 3, affixId: 'inc_evasion', tier: 2, cost: { gold: 150, arcane_dust: 15 } },
  { id: 'bc_flask_charges', benchLevel: 3, affixId: 'flask_charges', tier: 2, cost: { gold: 150, arcane_dust: 15 } },
  { id: 'bc_skill_speed', benchLevel: 3, affixId: 'skill_speed', tier: 2, cost: { gold: 150, arcane_dust: 15 } },
  { id: 'bc_str', benchLevel: 3, affixId: 'strength', tier: 2, cost: { gold: 120, arcane_dust: 12 } },
  { id: 'bc_dex', benchLevel: 3, affixId: 'dexterity', tier: 2, cost: { gold: 120, arcane_dust: 12 } },
  { id: 'bc_int', benchLevel: 3, affixId: 'intelligence', tier: 2, cost: { gold: 120, arcane_dust: 12 } },
  { id: 'bc_accuracy', benchLevel: 3, affixId: 'accuracy', tier: 2, cost: { gold: 150, arcane_dust: 15 } },
  { id: 'bc_crit', benchLevel: 4, affixId: 'crit_chance', tier: 3, cost: { gold: 500, arcane_dust: 40 } },
  { id: 'bc_multi', benchLevel: 4, affixId: 'crit_multi', tier: 3, cost: { gold: 500, arcane_dust: 40 } },
  { id: 'bc_rarity', benchLevel: 4, affixId: 'item_rarity', tier: 2, cost: { gold: 400, arcane_dust: 35 } },
  { id: 'bc_elem', benchLevel: 4, affixId: 'inc_elem', tier: 3, cost: { gold: 500, arcane_dust: 40 } },
  { id: 'bc_prefix_lock', benchLevel: 6, affixId: 'meta_prefixes_cannot_be_changed', tier: 0, cost: { divine: 2, arcane_dust: 500 } },
  { id: 'bc_suffix_lock', benchLevel: 6, affixId: 'meta_suffixes_cannot_be_changed', tier: 0, cost: { divine: 2, arcane_dust: 500 } },
  { id: 'bc_multicraft', benchLevel: 6, affixId: 'meta_multicraft', tier: 0, cost: { exalted: 2, arcane_dust: 400 } },
  { id: 'bc_cannot_roll_attack', benchLevel: 7, affixId: 'meta_cannot_roll_attack', tier: 0, cost: { divine: 1, arcane_dust: 1000 } },
  { id: 'bc_cannot_roll_caster', benchLevel: 7, affixId: 'meta_cannot_roll_caster', tier: 0, cost: { divine: 1, arcane_dust: 1000 } },
  // Hard Boss trophies: high-tier crafts, one per boss's theme (the trophy's own description says which)
  { id: 'bc_boss_phys', benchLevel: 6, affixId: 'added_phys', tier: 5, cost: { marrow_shard: 1, arcane_dust: 300, gold: 5000 } },
  { id: 'bc_boss_spell', benchLevel: 6, affixId: 'spell_damage', tier: 5, cost: { choir_glass: 1, arcane_dust: 300, gold: 5000 } },
  { id: 'bc_boss_cast_speed', benchLevel: 6, affixId: 'cast_speed', tier: 4, cost: { choir_glass: 1, arcane_dust: 300, gold: 5000 } },
  { id: 'bc_boss_attack_speed', benchLevel: 6, affixId: 'attack_speed', tier: 4, cost: { black_pearl: 1, arcane_dust: 300, gold: 5000 } },
  { id: 'bc_boss_cold', benchLevel: 6, affixId: 'added_cold', tier: 5, cost: { black_pearl: 1, arcane_dust: 300, gold: 5000 } },
  { id: 'bc_boss_elem', benchLevel: 6, affixId: 'inc_elem', tier: 5, cost: { throne_ash: 1, arcane_dust: 300, gold: 5000 } },
  { id: 'bc_boss_crit_multi', benchLevel: 7, affixId: 'crit_multi', tier: 5, cost: { crownless_sigil: 1, arcane_dust: 600, gold: 10000 } },
  // Bench Level 8 (Master Artisan)
  { id: 'bc_life_high', benchLevel: 8, affixId: 'flat_life', tier: 5, cost: { marrow_shard: 2, arcane_dust: 800, gold: 12000 } },
  { id: 'bc_all_res_high', benchLevel: 8, affixId: 'all_res', tier: 5, cost: { throne_ash: 2, arcane_dust: 800, gold: 12000 } },
  { id: 'bc_crit_multi_high', benchLevel: 8, affixId: 'crit_multi', tier: 5, cost: { crownless_sigil: 2, arcane_dust: 800, gold: 15000 } },
  // Bench Level 9 (Transcendent Artificer)
  { id: 'bc_exile_phys', benchLevel: 9, affixId: 'inc_phys', tier: 6, cost: { exile_doom_sigil: 1, arcane_dust: 1200, gold: 25000 } },
  { id: 'bc_exile_elem', benchLevel: 9, affixId: 'inc_elem', tier: 6, cost: { architect_doom_sigil: 1, arcane_dust: 1200, gold: 25000 } },
  // Bench Level 10 (Omnipotent Crucible)
  { id: 'bc_void_speed', benchLevel: 10, affixId: 'skill_speed', tier: 6, cost: { void_sigil: 1, arcane_dust: 2000, gold: 50000 } },
];

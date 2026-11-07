import type { GroundKind } from '../engine/types';
import { EXTRA_ZONES, ZONES, zoneDef, type BossMechanic, type MonsterDef, type ZoneDef } from './zones';

/**
 * The Maps endgame (docs/GAME.md, docs/MILESTONES.md): ten plain tiers (levels 66–84), permanent tier-group danger and
 * reward identities, Sextants, the realm-shared Atlas tree and Doomed Maps I–V. Each run borrows a campaign area's
 * visuals, monsters and boss mechanics at random.
 */

export type MapTierMod = 'none' | 'elite' | 'twin' | 'ground' | 'enrage' | 'pinnacle';

export interface MapTier {
  tier: number;
  /** monster level; the boss is one higher */
  level: number;
  /** monster packs before the map boss */
  packs: number;
  /** drop table tier (data/drops.ts) */
  dropTier: number;
  /** multipliers on its monsters' life and damage */
  lifeScale: number;
  dmgScale: number;
  /** permanent tier-group identity */
  mod: MapTierMod;
  modName: string;
  modDesc: string;
  rewardDesc: string;
}

/** Permanent danger stats for tier-group modifiers. */
export const TIER_MOD_RULES = {
  elitePacks: 2,
  eliteLife: 4,
  eliteDamage: 1.5,
  eliteXp: 3,
  eliteLoot: 1.6,
  twinStatScale: 0.6,
  enrageSpeed: 1.3,
  enrageDamage: 1.4,
  bossGroundEveryMs: 8000,
  bossGroundDurationMs: 6000,
  bossGroundDps: 0.18,
} as const;

/** Tier-locked unique pools (T1+, T3+, T5+, T7+, T9+, T10). Any tier group drops its own pool plus lower map pools. */
export const MAP_UNIQUE_POOLS: { minTier: number; label: string; uniques: string[] }[] = [
  { minTier: 1, label: 'Map Tier 1+', uniques: ['castaways_kerchief', 'bloodthirst', 'miners_lament', 'windstep', 'alchemists_band', 'iron_bulwark', 'titans_girth', 'tavern_brawler', 'quickfingers', 'slippers_of_the_tide', 'second_guess', 'bellwether', 'herbalists_sash', 'brawlers_buckle', 'barnacle_band', 'fishermans_knot'] },
  { minTier: 3, label: 'Map Tier 3+', uniques: ['emberheart', 'stormhide', 'knuckledusters', 'thornquill', 'wellspring', 'rebuttal', 'ninth_psalm', 'gulls_eye', 'ember_of_faith', 'lookouts_hood', 'robe_of_still_waters', 'penitents_plate', 'sidestep', 'windchaser', 'needleworkers_wraps', 'brimming_band'] },
  { minTier: 5, label: 'Map Tier 5+', uniques: ['stormrider_greaves', 'unblinking_tome', 'briar_key', 'sunmane_pelt', 'mirage_veil', 'khans_tithe', 'kurgan_crown', 'pyre_heart', 'mask_of_the_patient', 'twin_oaths', 'hollow_locket', 'last_breath'] },
  { minTier: 7, label: 'Map Tier 7+', uniques: ['heart_of_winter', 'giants_knuckle', 'bosuns_oath', 'leviathan_hide', 'martyrs_shroud', 'pilgrims_road', 'saints_shard', 'confession_hood', 'halo_of_wrath', 'chainbreaker', 'rimewalkers', 'frostgrip', 'crown_of_the_hollow', 'wolfmother_pelt'] },
  { minTier: 9, label: 'Map Tier 9+', uniques: ['deckwalkers', 'tide_crown', 'corposant', 'harpoons_answer'] },
  { minTier: 10, label: 'Map Tier 10', uniques: ['oathbreaker', 'kingsmarch', 'last_decree', 'crownbreaker_mask', 'hand_of_the_regent', 'regents_mantle', 'starforged_edge'] },
];

export function mapTierUniques(tier: number): string[] {
  return MAP_UNIQUE_POOLS.filter((p) => tier >= p.minTier).flatMap((p) => p.uniques);
}

export const MAP_TIERS: MapTier[] = [
  {
    tier: 1, level: 66, packs: 10, dropTier: 18, lifeScale: 0.9, dmgScale: 0.82,
    mod: 'none', modName: 'Baseline', modDesc: 'Standard map run with no permanent modifier.', rewardDesc: 'General drops',
  },
  {
    tier: 2, level: 68, packs: 15, dropTier: 19, lifeScale: 0.95, dmgScale: 0.85,
    mod: 'none', modName: 'Baseline', modDesc: 'Standard map run with no permanent modifier.', rewardDesc: 'General drops',
  },
  {
    tier: 3, level: 70, packs: 20, dropTier: 20, lifeScale: 1.0, dmgScale: 0.88,
    mod: 'elite', modName: 'Elite packs', modDesc: '2 of the run’s packs are elite (4× Life, 1.5× Damage, 3× XP, 60% more drops).', rewardDesc: 'Reliable Chaos Orbs',
  },
  {
    tier: 4, level: 72, packs: 25, dropTier: 21, lifeScale: 1.05, dmgScale: 0.91,
    mod: 'elite', modName: 'Elite packs', modDesc: '2 of the run’s packs are elite (4× Life, 1.5× Damage, 3× XP, 60% more drops).', rewardDesc: 'Reliable Chaos Orbs',
  },
  {
    tier: 5, level: 74, packs: 30, dropTier: 22, lifeScale: 1.1, dmgScale: 0.95,
    mod: 'twin', modName: 'Twin boss', modDesc: 'The boss spawns a lieutenant at 60% stats; they share a Life pool.', rewardDesc: 'Tier 5–6 unique pool',
  },
  {
    tier: 6, level: 76, packs: 35, dropTier: 23, lifeScale: 1.15, dmgScale: 0.99,
    mod: 'twin', modName: 'Twin boss', modDesc: 'The boss spawns a lieutenant at 60% stats; they share a Life pool.', rewardDesc: 'Tier 5–6 unique pool',
  },
  {
    tier: 7, level: 78, packs: 40, dropTier: 24, lifeScale: 1.2, dmgScale: 1.03,
    mod: 'ground', modName: 'Dangerous ground', modDesc: 'Unholy, burning or frozen ground covers part of the arena during the boss fight.', rewardDesc: 'Tier 7–8 unique pool & Regal emphasis',
  },
  {
    tier: 8, level: 80, packs: 45, dropTier: 25, lifeScale: 1.25, dmgScale: 1.07,
    mod: 'ground', modName: 'Dangerous ground', modDesc: 'Unholy, burning or frozen ground covers part of the arena during the boss fight.', rewardDesc: 'Tier 7–8 unique pool & Regal emphasis',
  },
  {
    tier: 9, level: 82, packs: 50, dropTier: 26, lifeScale: 1.3, dmgScale: 1.11,
    mod: 'enrage', modName: 'Enraged', modDesc: 'All monsters start permanently enraged (30% faster, 40% more damage).', rewardDesc: 'Exalted Orb emphasis',
  },
  {
    tier: 10, level: 84, packs: 55, dropTier: 27, lifeScale: 1.35, dmgScale: 1.15,
    mod: 'pinnacle', modName: 'Pinnacle', modDesc: 'Elite packs, twin boss and permanent enrage all at once.', rewardDesc: 'Tier 10 uniques & strong Divine rates',
  },
];

/** Act 6's item level bonus, kept so map drops roll higher than the campaign's. */
const MAP_ILVL_BONUS = 14;

/** Legacy theme compatibility shim for any callers inspecting old theme metadata. */
export interface MapTheme {
  id: string;
  name: string;
  desc: string;
  favours: string;
  from: string;
  bossName: string;
}

/** How often maps and Sextants drop. */
export const MAP_DROPS = {
  inMapKill: 0.015,
  inMapBoss: 0.4,
  campaignKill: 0.004,
  campaignBoss: 0.1,
  /** first kill of each level 60+ campaign boss has a 50% chance to drop a Tier 1 map */
  campaignFirstBoss: 0.5,
  /** campaign monsters below this level never drop maps */
  campaignMinLevel: 60,
  /** beating the Last King tops your realm up to at least this many maps */
  kingTopUp: 5,
  /** chance a map found in a run is one tier higher */
  tierUp: 0.15,
  /** Sextant drop chances inside maps */
  sextantKill: 0.004,
  sextantBoss: 0.18,
  /** Doomed Map drop chance from T8–T10 bosses once the Atlas unlock is allocated */
  doomedBoss: 0.12,
  /** Fractured Orb drop chances inside Doomed Maps */
  fracturedKill: 0.008,
  fracturedBoss: 0.25,
};

// ---------------- Sextants ----------------

export type SextantTier = 'apprentice' | 'journeyman' | 'master';

export interface SextantDef {
  id: string;
  tier: SextantTier;
  name: string;
  minMapTier: number;
  desc: string;
}

export const SEXTANTS: SextantDef[] = [
  { id: 'sextant_apprentice', tier: 'apprentice', name: 'Apprentice Sextant', minMapTier: 1, desc: 'Rolls a modifier on a Map Device slot for 6 map runs (Tier 1+).' },
  { id: 'sextant_journeyman', tier: 'journeyman', name: 'Journeyman Sextant', minMapTier: 5, desc: 'Rolls a stronger modifier on a Map Device slot for 6 map runs (Tier 5+).' },
  { id: 'sextant_master', tier: 'master', name: 'Master Sextant', minMapTier: 8, desc: 'Rolls a high-tier modifier on a Map Device slot for 6 map runs (Tier 8+).' },
];

export const SEXTANT_BASE_CHARGES = 6;
/** Map Device Sextant slots by Map Device station level (1..4); Atlas Surveying notable adds a 4th. */
export const MAP_DEVICE_SEXTANT_SLOTS = [1, 2, 2, 3, 4, 4];

export interface SextantMod {
  id: string;
  name: string;
  tier: SextantTier;
  minMapTier: number;
  kind: 'danger' | 'reward' | 'both' | 'hunting';
  desc: string;
  extraPacks?: number;
  currencyPct?: number;
  rarityPct?: number;
  mapFindPct?: number;
  monsterLifeMult?: number;
  monsterDmgMult?: number;
  bossExtraItems?: number;
  bossCurrencyRolls?: number;
  arenaGround?: GroundKind;
  bossEchoes?: [BossMechanic, BossMechanic];
  hunt?: 'fossil' | 'unique' | 'key';
}

export const SEXTANT_MODS: SextantMod[] = [
  // Apprentice (Tier 1+)
  {
    id: 'sex_packs', name: 'Crowded Roads', tier: 'apprentice', minMapTier: 1, kind: 'reward',
    desc: '+1 monster pack per map; +15% map drop chance.',
    extraPacks: 1, mapFindPct: 15,
  },
  {
    id: 'sex_pockets', name: 'Heavy Pouches', tier: 'apprentice', minMapTier: 1, kind: 'reward',
    desc: 'Monsters drop 25% more currency.',
    currencyPct: 25,
  },
  {
    id: 'sex_iron_blood', name: 'Iron & Gold', tier: 'apprentice', minMapTier: 1, kind: 'both',
    desc: 'Monsters have 30% more Life; +30% Item Rarity.',
    monsterLifeMult: 1.3, rarityPct: 30,
  },
  {
    id: 'sex_fossils', name: 'Bone Seam', tier: 'apprentice', minMapTier: 1, kind: 'hunting',
    desc: 'Monsters have a 5% chance to drop a Fossil, and map bosses drop 1–3 Fossils.',
    hunt: 'fossil',
  },
  // Journeyman (Tier 5+)
  {
    id: 'sex_bounty_packs', name: 'Rich Caravan', tier: 'journeyman', minMapTier: 5, kind: 'reward',
    desc: '+2 monster packs per map; monsters drop 35% more currency.',
    extraPacks: 2, currencyPct: 35,
  },
  {
    id: 'sex_boss_hoard', name: 'Gilded Sanctum', tier: 'journeyman', minMapTier: 5, kind: 'reward',
    desc: 'Map bosses drop 1 extra equipment item and roll 2 extra currency drops.',
    bossExtraItems: 1, bossCurrencyRolls: 2,
  },
  {
    id: 'sex_savagery', name: 'Blood Tribute', tier: 'journeyman', minMapTier: 5, kind: 'both',
    desc: 'Monsters deal 35% more damage; +40% Item Rarity and +25% currency drops.',
    monsterDmgMult: 1.35, rarityPct: 40, currencyPct: 25,
  },
  {
    id: 'sex_unholy_ground', name: 'Desecrated Soil', tier: 'journeyman', minMapTier: 5, kind: 'danger',
    desc: 'Unholy ground covers the arena during the boss fight; +35% map drop chance.',
    arenaGround: 'unholy', mapFindPct: 35,
  },
  {
    id: 'sex_relics', name: 'Relic Trail', tier: 'journeyman', minMapTier: 5, kind: 'hunting',
    desc: 'Map bosses have a 20% chance to drop a Maps unique item.',
    hunt: 'unique',
  },
  // Master (Tier 8+)
  {
    id: 'sex_royal_treasury', name: 'Royal Treasury', tier: 'master', minMapTier: 8, kind: 'reward',
    desc: 'Monsters drop 50% more currency; +2 monster packs per map.',
    currencyPct: 50, extraPacks: 2,
  },
  {
    id: 'sex_echoing_vault', name: 'Echoing Vault', tier: 'master', minMapTier: 8, kind: 'both',
    desc: 'Map bosses gain an Echoes pair (Martyrs & Channel); bosses drop +2 items and +3 currency rolls.',
    bossEchoes: ['martyrs', 'channel'], bossExtraItems: 2, bossCurrencyRolls: 3,
  },
  {
    id: 'sex_warlords_toll', name: "Warlord's Toll", tier: 'master', minMapTier: 8, kind: 'both',
    desc: 'Monsters have 40% more Life and deal 25% more damage; +60% Item Rarity and +40% map drop chance.',
    monsterLifeMult: 1.4, monsterDmgMult: 1.25, rarityPct: 60, mapFindPct: 40,
  },
  {
    id: 'sex_key_hunt', name: 'Sign of the Warden', tier: 'master', minMapTier: 8, kind: 'hunting',
    desc: 'Map bosses have a 25% chance to drop a Hard Boss key.',
    hunt: 'key',
  },
];

export const HARD_BOSS_KEYS = ['marrow_key', 'bell_key', 'abyssal_key', 'regent_key'] as const;
export const UBER_KEYS = ['uber_key_1', 'uber_key_2', 'uber_key_3'] as const;

export function sextantDef(id: string): SextantDef {
  const d = SEXTANTS.find((s) => s.id === id || s.tier === id);
  if (!d) throw new Error(`Unknown sextant ${id}`);
  return d;
}

export function sextantMod(id: string): SextantMod {
  const m = SEXTANT_MODS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown sextant mod ${id}`);
  return m;
}

// ---------------- The Atlas Tree ----------------

export type AtlasWing = 'sustain' | 'bounty' | 'surveying' | 'peril';

export interface AtlasNode {
  id: string;
  wing: AtlasWing;
  name: string;
  desc: string;
  /** position in the 1280x1280 Atlas canvas */
  x: number;
  y: number;
  notable?: boolean;
  keystone?: boolean;
  /** allocating any one connected previous node opens this node */
  requires?: string[];
  /** minimum total Atlas points earned (or allocated) required */
  minPoints?: number;
  bonuses?: AtlasNodeBonuses;
}

export interface AtlasNodeBonuses {
  mapFindPct?: number;
  tierUpBonus?: number;
  bossExtraMapChance?: number;
  currencyPct?: number;
  rarityPct?: number;
  bossExtraItems?: number;
  bossCurrencyRolls?: number;
  sextantCharges?: number;
  sextantRewardEffectPct?: number;
  extraPacks?: number;
  monsterLifeMore?: number;
  monsterDamageMore?: number;
  monsterXpDropMore?: number;
}

export const ATLAS_DOOMED_POINTS = 20;
export const ATLAS_POINT_CAP = 70;
export const ATLAS_DOOMED_CLEAR_POINTS = 2;
export const ATLAS_HARD_BOSS_CLEAR_POINTS = 3;
export const ATLAS_UBER_BOSS_CLEAR_POINTS = 5;

const LEGACY_ATLAS_NODES: Array<{
  id: string;
  wing: AtlasWing;
  name: string;
  desc: string;
  notable?: boolean;
  keystone?: boolean;
  minPoints?: number;
  requires?: string;
}> = [
  // Sustain wing (5)
  { id: 'sustain_1', wing: 'sustain', name: 'Wayfinder I', desc: '10% increased map drop chance.' },
  { id: 'sustain_2', wing: 'sustain', name: 'Wayfinder II', desc: '10% increased map drop chance.', requires: 'sustain_1' },
  { id: 'sustain_3', wing: 'sustain', name: 'Ascending Roads', desc: '+5% chance for maps found in a run to be 1 tier higher.', requires: 'sustain_2' },
  { id: 'sustain_4', wing: 'sustain', name: 'Wayfinder III', desc: '15% increased map drop chance.', requires: 'sustain_3' },
  { id: 'sustain_notable', wing: 'sustain', name: "Cartographer's Horizon", notable: true, desc: 'Map bosses have a 25% chance to drop an additional map; +5% tier-up chance.', requires: 'sustain_4' },

  // Bounty wing (5)
  { id: 'bounty_1', wing: 'bounty', name: 'Prospector I', desc: '10% increased currency drop rate in maps.' },
  { id: 'bounty_2', wing: 'bounty', name: 'Gilded Eye I', desc: '+15% Item Rarity in maps.', requires: 'bounty_1' },
  { id: 'bounty_3', wing: 'bounty', name: 'Prospector II', desc: '15% increased currency drop rate in maps.', requires: 'bounty_2' },
  { id: 'bounty_4', wing: 'bounty', name: 'Gilded Eye II', desc: '+20% Item Rarity in maps.', requires: 'bounty_3' },
  { id: 'bounty_notable', wing: 'bounty', name: 'Sovereign Spoils', notable: true, desc: 'Map bosses drop 1 extra item and roll 2 additional currency drops.', requires: 'bounty_4' },

  // Surveying wing (5)
  { id: 'survey_1', wing: 'surveying', name: 'Enduring Ink I', desc: 'Sextants applied to the Map Device last +1 map run.' },
  { id: 'survey_2', wing: 'surveying', name: 'Calibrated Lens I', desc: '15% increased effect of Sextant reward modifiers.', requires: 'survey_1' },
  { id: 'survey_3', wing: 'surveying', name: 'Enduring Ink II', desc: 'Sextants applied to the Map Device last +1 map run.', requires: 'survey_2' },
  { id: 'survey_4', wing: 'surveying', name: 'Calibrated Lens II', desc: '20% increased effect of Sextant reward modifiers.', requires: 'survey_3' },
  { id: 'survey_notable', wing: 'surveying', name: 'Fourth Astrolabe', notable: true, desc: '+1 Sextant slot on the Map Device.', requires: 'survey_4' },

  // Peril wing (5)
  { id: 'peril_1', wing: 'peril', name: 'Hardened Foes', desc: 'Map monsters have 15% more Life and grant 15% more XP and drops.' },
  { id: 'peril_2', wing: 'peril', name: 'Cruel Stakes', desc: 'Map monsters deal 10% more damage; +20% Item Rarity in maps.', requires: 'peril_1' },
  { id: 'peril_3', wing: 'peril', name: 'Swarming Gates', desc: '+1 monster pack per map; map monsters deal 10% more damage.', requires: 'peril_2' },
  { id: 'peril_notable', wing: 'peril', name: 'Unbroken Path', keystone: true, desc: 'Maps are not lost on death (the map is refunded to your supply), but map monsters deal 30% more damage.', requires: 'peril_3' },
  { id: 'atlas_doomed', wing: 'peril', name: 'Doomed Horizon', keystone: true, minPoints: ATLAS_DOOMED_POINTS, desc: 'Requires 20 Atlas points earned. Tier 8–10 map bosses can drop Doomed Maps (I–V).' },
];

const ATLAS_CENTER = 640;
const ATLAS_DIRECTIONS: Record<AtlasWing, readonly [number, number]> = {
  sustain: [-1, 0],
  bounty: [1, 0],
  surveying: [0, -1],
  peril: [0, 1],
};

const ATLAS_WORDS: Record<AtlasWing, readonly string[]> = {
  sustain: ['Trail', 'Road', 'Route', 'Passage', 'Path', 'Crossing', 'Causeway', 'Compass', 'Bearing'],
  bounty: ['Cache', 'Coffer', 'Trove', 'Hoard', 'Prize', 'Tribute', 'Fortune', 'Relic', 'Spoils'],
  surveying: ['Lens', 'Ink', 'Measure', 'Astrolabe', 'Survey', 'Chart', 'Orbit', 'Compass', 'Sextant'],
  peril: ['Trial', 'Hazard', 'Gauntlet', 'Ruin', 'Threat', 'Onslaught', 'Siege', 'Calamity', 'Doom'],
};

const ATLAS_PREFIXES: Record<AtlasWing, readonly string[]> = {
  sustain: ['Wayfarer', 'Cartographer', 'Pathfinder', 'Voyager', 'Horizon'],
  bounty: ['Prospector', 'Gilded', 'Sovereign', 'Opulent', 'Treasure'],
  surveying: ['Measured', 'Calibrated', 'Enduring', 'Celestial', 'Astral'],
  peril: ['Hardened', 'Cruel', 'Swarming', 'Unbroken', 'Doomed'],
};

const LEGACY_DETAILS = Object.fromEntries(LEGACY_ATLAS_NODES.map(({ requires: _requires, ...node }) => [node.id, node]));

const SPECIAL_ATLAS_NODES: Record<string, Partial<AtlasNode>> = {
  ...LEGACY_DETAILS,
  sustain_1: { ...LEGACY_DETAILS.sustain_1, bonuses: { mapFindPct: 10 } },
  sustain_2: { ...LEGACY_DETAILS.sustain_2, bonuses: { mapFindPct: 10 } },
  sustain_3: { ...LEGACY_DETAILS.sustain_3, bonuses: { tierUpBonus: 0.05 } },
  sustain_4: { ...LEGACY_DETAILS.sustain_4, bonuses: { mapFindPct: 15 } },
  sustain_notable: { ...LEGACY_DETAILS.sustain_notable, bonuses: { bossExtraMapChance: 0.25, tierUpBonus: 0.05 } },
  bounty_1: { ...LEGACY_DETAILS.bounty_1, bonuses: { currencyPct: 10 } },
  bounty_2: { ...LEGACY_DETAILS.bounty_2, bonuses: { rarityPct: 15 } },
  bounty_3: { ...LEGACY_DETAILS.bounty_3, bonuses: { currencyPct: 15 } },
  bounty_4: { ...LEGACY_DETAILS.bounty_4, bonuses: { rarityPct: 20 } },
  bounty_notable: { ...LEGACY_DETAILS.bounty_notable, bonuses: { bossExtraItems: 1, bossCurrencyRolls: 2 } },
  survey_1: { ...LEGACY_DETAILS.survey_1, bonuses: { sextantCharges: 1 } },
  survey_2: { ...LEGACY_DETAILS.survey_2, bonuses: { sextantRewardEffectPct: 15 } },
  survey_3: { ...LEGACY_DETAILS.survey_3, bonuses: { sextantCharges: 1 } },
  survey_4: { ...LEGACY_DETAILS.survey_4, bonuses: { sextantRewardEffectPct: 20 } },
  peril_1: { ...LEGACY_DETAILS.peril_1, bonuses: { monsterLifeMore: 15, monsterXpDropMore: 15 } },
  peril_2: { ...LEGACY_DETAILS.peril_2, bonuses: { monsterDamageMore: 10, rarityPct: 20 } },
  peril_3: { ...LEGACY_DETAILS.peril_3, bonuses: { extraPacks: 1, monsterDamageMore: 10 } },
  peril_notable: { ...LEGACY_DETAILS.peril_notable, bonuses: { monsterDamageMore: 30 } },
};

function atlasNodeId(wing: AtlasWing, depth: number, lane: number): string {
  const spine = wing === 'surveying' ? 'survey' : wing;
  if (wing === 'peril' && depth === 5 && lane === 2) return 'atlas_doomed';
  if (lane === 0) return depth === 5 ? `${spine}_notable` : `${spine}_${depth}`;
  return `${spine}_${depth}_${lane < 0 ? 'l' : 'r'}${Math.abs(lane)}`;
}

function defaultAtlasDetails(wing: AtlasWing, depth: number, lane: number): Pick<AtlasNode, 'name' | 'desc' | 'bonuses'> {
  const word = ATLAS_WORDS[wing][lane + depth - 1] ?? ATLAS_WORDS[wing][Math.abs(lane)];
  const name = `${ATLAS_PREFIXES[wing][depth - 1]} ${word}`;
  if (wing === 'sustain') return depth % 3 === 0
    ? { name, desc: '+2% chance for maps found in a run to be 1 tier higher.', bonuses: { tierUpBonus: 0.02 } }
    : { name, desc: '4% increased map drop chance.', bonuses: { mapFindPct: 4 } };
  if (wing === 'bounty') return (depth + lane) % 2 === 0
    ? { name, desc: '5% increased currency drop rate in maps.', bonuses: { currencyPct: 5 } }
    : { name, desc: '+8% Item Rarity in maps.', bonuses: { rarityPct: 8 } };
  if (wing === 'surveying') return (depth + lane) % 3 === 0
    ? { name, desc: 'Sextants applied to the Map Device last +1 map run.', bonuses: { sextantCharges: 1 } }
    : { name, desc: '5% increased effect of Sextant reward modifiers.', bonuses: { sextantRewardEffectPct: 5 } };
  return (depth + lane) % 2 === 0
    ? { name, desc: 'Map monsters have 4% more Life and grant 4% more XP and drops.', bonuses: { monsterLifeMore: 4, monsterXpDropMore: 4 } }
    : { name, desc: 'Map monsters deal 3% more damage; +8% Item Rarity in maps.', bonuses: { monsterDamageMore: 3, rarityPct: 8 } };
}

function buildAtlasWing(wing: AtlasWing): AtlasNode[] {
  const [dx, dy] = ATLAS_DIRECTIONS[wing];
  const px = -dy;
  const py = dx;
  const nodes: AtlasNode[] = [];
  for (let depth = 1; depth <= 5; depth += 1) {
    for (let lane = -(depth - 1); lane <= depth - 1; lane += 1) {
      const id = atlasNodeId(wing, depth, lane);
      const radius = 84 + depth * 92;
      const requires = depth === 1
        ? undefined
        : [lane - 1, lane, lane + 1]
          .filter((parentLane) => Math.abs(parentLane) <= depth - 2)
          .map((parentLane) => atlasNodeId(wing, depth - 1, parentLane));
      const details = defaultAtlasDetails(wing, depth, lane);
      nodes.push({
        id,
        wing,
        ...details,
        x: ATLAS_CENTER + dx * radius + px * lane * 52,
        y: ATLAS_CENTER + dy * radius + py * lane * 52,
        requires,
        ...(SPECIAL_ATLAS_NODES[id] ?? {}),
      });
    }
  }
  return nodes;
}

/** Four connected 25-node wings: exactly 100 spendable Atlas nodes. */
export const ATLAS_NODES: AtlasNode[] = (['sustain', 'bounty', 'surveying', 'peril'] as AtlasWing[]).flatMap(buildAtlasWing);

export function atlasNode(id: string): AtlasNode {
  const n = ATLAS_NODES.find((x) => x.id === id);
  if (!n) throw new Error(`Unknown Atlas node ${id}`);
  return n;
}

// ---------------- Normal Map Modifiers ----------------

export interface NormalMapModDef {
  id: string;
  name: string;
  desc: string;
  dangerDesc: string;
  rewardDesc: string;
  monsterLifeMult?: number;
  monsterDmgMult?: number;
  extraPacks?: number;
  currencyPct?: number;
  rarityPct?: number;
  mapFindPct?: number;
}

export const NORMAL_MAP_MODS: NormalMapModDef[] = [
  {
    id: 'furious_foes',
    name: 'Furious Foes',
    desc: 'Monsters deal 25% more Damage (+25% Item Rarity, +20% Currency)',
    dangerDesc: '25% more monster damage',
    rewardDesc: '+25% Item Rarity, +20% Currency',
    monsterDmgMult: 1.25,
    rarityPct: 25,
    currencyPct: 20,
  },
  {
    id: 'titan_blood',
    name: 'Titan Blood',
    desc: 'Monsters have 40% more Life (+30% Item Rarity, +20% Currency)',
    dangerDesc: '40% more monster Life',
    rewardDesc: '+30% Item Rarity, +20% Currency',
    monsterLifeMult: 1.4,
    rarityPct: 30,
    currencyPct: 20,
  },
  {
    id: 'swarming_masses',
    name: 'Swarming Masses',
    desc: '+5 monster packs per map (+30% Map drop chance)',
    dangerDesc: '+5 monster packs',
    rewardDesc: '+30% Map drop chance',
    extraPacks: 5,
    mapFindPct: 30,
  },
  {
    id: 'bountiful_hoard',
    name: 'Bountiful Hoard',
    desc: 'Monsters drop 45% more Currency and 35% more Items; monsters deal 15% more Damage',
    dangerDesc: '15% more monster damage',
    rewardDesc: '+45% Currency, +35% Item Rarity',
    monsterDmgMult: 1.15,
    currencyPct: 45,
    rarityPct: 35,
  },
  {
    id: 'deadly_haste',
    name: 'Deadly Haste',
    desc: 'Monsters attack and move 25% faster; monsters deal 20% more Damage (+35% Currency, +25% Map drop chance)',
    dangerDesc: '25% faster monsters, 20% more damage',
    rewardDesc: '+35% Currency, +25% Map drop chance',
    monsterDmgMult: 1.2,
    currencyPct: 35,
    mapFindPct: 25,
  },
  {
    id: 'ironclad_guard',
    name: 'Ironclad Guard',
    desc: 'Monsters take 25% less damage (33% more effective Life) (+25% Item Rarity, +25% Currency)',
    dangerDesc: 'Monsters take 25% less damage',
    rewardDesc: '+25% Item Rarity, +25% Currency',
    monsterLifeMult: 1.33,
    rarityPct: 25,
    currencyPct: 25,
  },
  {
    id: 'unstable_surge',
    name: 'Unstable Surge',
    desc: 'Monsters deal 35% more Damage; monsters have 20% less Life (+40% Item Rarity, +40% Currency)',
    dangerDesc: '35% more monster damage',
    rewardDesc: '+40% Item Rarity, +40% Currency',
    monsterDmgMult: 1.35,
    monsterLifeMult: 0.8,
    rarityPct: 40,
    currencyPct: 40,
  },
  {
    id: 'gilded_cartography',
    name: 'Gilded Cartography',
    desc: '+50% Map drop chance and +30% Currency; monsters have 25% more Life and deal 15% more Damage',
    dangerDesc: '25% more Life, 15% more damage',
    rewardDesc: '+50% Map drop chance, +30% Currency',
    monsterLifeMult: 1.25,
    monsterDmgMult: 1.15,
    mapFindPct: 50,
    currencyPct: 30,
  },
];

export function normalMapModDef(id: string): NormalMapModDef | undefined {
  return NORMAL_MAP_MODS.find((m) => m.id === id);
}

// ---------------- Doomed Maps I–V ----------------

export type DoomedModId =
  | 'preassembled_adds'
  | 'revenant_packs'
  | 'drained_belts'
  | 'unending_enrage'
  | 'hulking_surge'
  | 'searing_aftermath'
  | 'warded_threshold';

export interface DoomedModDef {
  id: DoomedModId;
  name: string;
  desc: string;
}

export const DOOMED_MODS: DoomedModDef[] = [
  { id: 'preassembled_adds', name: 'Pre-assembled adds', desc: 'The area boss arrives with 3 extra adds already summoned.' },
  { id: 'revenant_packs', name: 'Revenant packs', desc: 'Monsters in every third pack revive once at 30% Life when killed.' },
  { id: 'drained_belts', name: 'Drained belts', desc: 'Flasks are not refilled at the start of the run.' },
  { id: 'unending_enrage', name: 'Unending enrage', desc: 'The boss enrages permanently at 75% Life.' },
  { id: 'hulking_surge', name: 'Hulking surge', desc: 'Every fourth pack is a Hulking pack.' },
  { id: 'searing_aftermath', name: 'Searing aftermath', desc: 'The arena floor ignites for 4 seconds after each pack is cleared.' },
  { id: 'warded_threshold', name: 'Warded threshold', desc: 'The boss gains a 6-second damage immunity ward when it first drops below 60% Life.' },
];

export function doomedModDef(id: DoomedModId): DoomedModDef {
  const m = DOOMED_MODS.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown Doomed mod ${id}`);
  return m;
}

export interface DoomedTier {
  tier: number;
  name: string;
  level: number;
  packs: number;
  mods: [number, number];
  modCount: [number, number];
  keyChance: number;
  dropTier: number;
  lifeScale: number;
  dmgScale: number;
}

export const DOOMED_TIERS: DoomedTier[] = [
  { tier: 1, name: 'Doomed Map I', level: 86, packs: 65, mods: [2, 2], modCount: [2, 2], keyChance: 0.10, dropTier: 28, lifeScale: 1.55, dmgScale: 1.32 },
  { tier: 2, name: 'Doomed Map II', level: 88, packs: 70, mods: [2, 3], modCount: [2, 3], keyChance: 0.15, dropTier: 28, lifeScale: 1.65, dmgScale: 1.38 },
  { tier: 3, name: 'Doomed Map III', level: 90, packs: 80, mods: [3, 3], modCount: [3, 3], keyChance: 0.20, dropTier: 28, lifeScale: 1.75, dmgScale: 1.44 },
  { tier: 4, name: 'Doomed Map IV', level: 92, packs: 90, mods: [3, 4], modCount: [3, 4], keyChance: 0.25, dropTier: 28, lifeScale: 1.85, dmgScale: 1.50 },
  { tier: 5, name: 'Doomed Map V', level: 94, packs: 100, mods: [4, 4], modCount: [4, 4], keyChance: 0.35, dropTier: 28, lifeScale: 1.95, dmgScale: 1.56 },
];

export function doomedTier(tier: number): DoomedTier {
  const t = DOOMED_TIERS.find((x) => x.tier === tier);
  if (!t) throw new Error(`Unknown Doomed tier ${tier}`);
  return t;
}

/** maps come at you faster than the campaign: a run should take a minute or three */
const MAP_SPAWN_EVERY_MS = 5000;

/** Plain map stock key (`map_t1` .. `map_t10`). */
export function mapId(tier: number): string {
  return `map_t${tier}`;
}

/** Doomed map stock key (`doomed_t1` .. `doomed_t5`). */
export function doomedId(tier: number): string {
  return `doomed_t${tier}`;
}

/**
 * Zone id for a map run. With no area or a legacy theme id, returns `map_t${tier}`;
 * with a campaign area id, returns `map_${areaId}_t${tier}` so combat uses that area's visuals and monsters.
 */
export function mapZoneId(tier: number, areaId?: string): string {
  if (areaId && ZONES.some((z) => z.id === areaId)) return `map_${areaId}_t${tier}`;
  return `map_t${tier}`;
}

export function doomedZoneId(tier: number, areaId?: string): string {
  if (areaId && ZONES.some((z) => z.id === areaId)) return `map_doomed_${areaId}_t${tier}`;
  return `map_doomed_t${tier}`;
}

/** Is this bank-style id a map rather than a material? */
export function isMapId(id: string): boolean {
  return id.startsWith('map_') || id.startsWith('doomed_t');
}

/** Extract the plain tier (1..10) from any map id (`map_t1`, `map_barrows_t1`, `map_mudflats_t1`), or null. */
export function parseMapTier(id: string): number | null {
  const m = /^map_(?:[a-z0-9]+_)?t(\d+)$/.exec(id);
  if (!m) return null;
  const tier = Number(m[1]);
  return MAP_TIERS.some((t) => t.tier === tier) ? tier : null;
}

export function parseDoomedTier(id: string): number | null {
  const m = /^(?:map_)?doomed_(?:[a-z0-9]+_)?t(\d+)$/.exec(id);
  if (!m) return null;
  const tier = Number(m[1]);
  return DOOMED_TIERS.some((t) => t.tier === tier) ? tier : null;
}

export function mapTier(tier: number): MapTier {
  const t = MAP_TIERS.find((x) => x.tier === tier);
  if (!t) throw new Error(`Unknown map tier ${tier}`);
  return t;
}

export function hasMap(tier: number, areaOrTheme?: string): boolean {
  if (!MAP_TIERS.some((t) => t.tier === tier)) return false;
  if (!areaOrTheme) return true;
  return ZONES.some((z) => z.id === areaOrTheme) || areaOrTheme === 'plain';
}

function scaled(m: MonsterDef, lifeScale: number, dmgScale: number, level: number): MonsterDef {
  return { ...m, level, lifeMult: (m.lifeMult ?? 1) * lifeScale, dmgMult: (m.dmgMult ?? 1) * dmgScale };
}

function scaleBossMechanics(mechanics: BossMechanic[] | undefined, tierNum: number): BossMechanic[] {
  const base = (mechanics ?? ['slam']).filter((k) => k !== 'scorch');
  const maxExtras = tierNum <= 2 ? 2 : tierNum <= 5 ? 3 : base.length;
  const others = base.filter((k) => k !== 'slam');
  const filtered = tierNum <= 2 && others.includes('ward') ? others.filter((k) => k !== 'nova') : others;
  return ['slam', ...filtered.slice(0, maxExtras)];
}

function buildMapZone(id: string, name: string, desc: string, tierNum: number, dropTier: number, level: number, packs: number, lifeScale: number, dmgScale: number, area: ZoneDef, extraUniques: string[]): ZoneDef {
  return {
    ...area,
    id,
    name,
    desc,
    art: area.art ?? area.id,
    act: Math.min(area.act, 2),
    packSize: [2, 3],
    tier: dropTier,
    ilvlBonus: MAP_ILVL_BONUS,
    levelRange: [level, level + 1],
    monsters: area.monsters.map((m) => scaled(m, lifeScale, dmgScale, level)),
    boss: {
      ...scaled(area.boss, lifeScale, dmgScale, level + 1),
      lifeMult: lifeScale,
      dmgMult: dmgScale,
      mechanics: scaleBossMechanics(area.boss.mechanics, tierNum),
      echoes: undefined,
    },
    actBoss: false,
    bossEvery: packs,
    spawnEveryMs: MAP_SPAWN_EVERY_MS,
    uniques: [...new Set([...area.uniques, ...extraUniques])],
    requires: { after: [] },
  };
}

for (const tier of MAP_TIERS) {
  const defaultArea = zoneDef(tier.tier % 2 === 1 ? 'kurgans' : 'plateau');
  const uniques = mapTierUniques(tier.tier);
  EXTRA_ZONES.push(
    buildMapZone(
      mapId(tier.tier),
      `Map Tier ${tier.tier}`,
      tier.modDesc,
      tier.tier,
      tier.dropTier,
      tier.level,
      tier.packs,
      tier.lifeScale,
      tier.dmgScale,
      defaultArea,
      uniques,
    ),
  );
  for (const area of ZONES) {
    EXTRA_ZONES.push(
      buildMapZone(
        mapZoneId(tier.tier, area.id),
        `Map Tier ${tier.tier}: ${area.name}`,
        tier.modDesc,
        tier.tier,
        tier.dropTier,
        tier.level,
        tier.packs,
        tier.lifeScale,
        tier.dmgScale,
        area,
        uniques,
      ),
    );
  }
}

for (const dTier of DOOMED_TIERS) {
  const defaultArea = zoneDef('shatteredthrone');
  const uniques = mapTierUniques(10);
  EXTRA_ZONES.push(
    buildMapZone(
      doomedZoneId(dTier.tier),
      dTier.name,
      'A Doomed Map with stacked realm-warping modifiers.',
      10,
      dTier.dropTier,
      dTier.level,
      dTier.packs,
      dTier.lifeScale,
      dTier.dmgScale,
      defaultArea,
      uniques,
    ),
  );
  for (const area of ZONES) {
    EXTRA_ZONES.push(
      buildMapZone(
        doomedZoneId(dTier.tier, area.id),
        `${dTier.name}: ${area.name}`,
        'A Doomed Map with stacked realm-warping modifiers.',
        10,
        dTier.dropTier,
        dTier.level,
        dTier.packs,
        dTier.lifeScale,
        dTier.dmgScale,
        area,
        uniques,
      ),
    );
  }
}

export type HardBossId = 'ossuar' | 'mother_vael' | 'undertow' | 'twin_regents' | 'crownless';

export interface HardBossDef {
  id: HardBossId;
  zoneId: string;
  name: string;
  arenaName: string;
  level: number;
  keyId: string;
  keyName: string;
  trophyId: string;
  trophyName: string;
  uniqueId: string;
  mechanicSummary: string;
  ruleHint: string;
}

export const HARD_BOSSES: HardBossDef[] = [
  {
    id: 'ossuar',
    zoneId: 'hard_ossuar',
    name: 'Ossuar, the Hollow Mountain',
    arenaName: 'The Split Quarry',
    level: 72,
    keyId: 'marrow_key',
    keyName: 'Marrow Key',
    trophyId: 'marrow_shard',
    trophyName: 'Marrow Shards',
    uniqueId: 'faultline',
    mechanicSummary: 'Plated Carapace (65% less damage taken) until you shatter a Cracked Fault weak point to expose him.',
    ruleHint: 'Aim a skill at Weak points (Aim rules) or use area skills; manual click extends exposure to 14s.',
  },
  {
    id: 'mother_vael',
    zoneId: 'hard_mother_vael',
    name: 'Mother Vael, the Last Choir',
    arenaName: 'The Belfry of Echoes',
    level: 75,
    keyId: 'bell_key',
    keyName: 'Bell Key',
    trophyId: 'choir_glass',
    trophyName: 'Choir Glass',
    uniqueId: 'last_hymn',
    mechanicSummary: 'Summons Choir Singers (Mending, Wall, Haste) that heal, shield and haste her until silenced.',
    ruleHint: 'Aim a skill at Choir adds (prioritises Mending -> Wall -> Haste) or use area/chain skills.',
  },
  {
    id: 'undertow',
    zoneId: 'hard_undertow',
    name: 'The Undertow',
    arenaName: 'The Drowned Trench',
    level: 78,
    keyId: 'abyssal_key',
    keyName: 'Abyssal Key',
    trophyId: 'black_pearl',
    trophyName: 'Black Pearl',
    uniqueId: 'riptide',
    mechanicSummary: 'Builds cold Tide stacks that slow your pace; channels Deep Call which clears Tide when broken.',
    ruleHint: 'Set an interrupt/stun or burst skill to When an enemy channels (or deal 10% max life during channel).',
  },
  {
    id: 'twin_regents',
    zoneId: 'hard_twin_regents',
    name: 'The Twin Regents (Sol & Luna)',
    arenaName: 'The Divided Dais',
    level: 82,
    keyId: 'regent_key',
    keyName: 'Joined Regent Key',
    trophyId: 'throne_ash',
    trophyName: 'Throne Ash',
    uniqueId: 'twinned_crown',
    mechanicSummary: 'Dual Fire & Cold bosses; every 16s one raises an 80% Guard while the other attacks, and they share life if unbalanced.',
    ruleHint: 'Skills automatically switch to the unguarded Regent; balanced Fire & Cold resistances keep you safe.',
  },
  {
    id: 'crownless',
    zoneId: 'hard_crownless',
    name: 'The Crownless',
    arenaName: 'The Unwritten Hall',
    level: 86,
    keyId: 'crownless_key',
    keyName: 'Crownless Key',
    trophyId: 'crownless_sigil',
    trophyName: 'Crownless Sigil',
    uniqueId: 'the_unwritten',
    mechanicSummary: 'Three-phase pinnacle hard boss shifting element and encounter moment at 100% (Weak point), 66% (Choir) and 33% (Channel).',
    ruleHint: 'Combines Weak point aim, Choir aim and Channel interrupt across three elemental phases.',
  },
];

export const HARD_BOSS_ZONES: ZoneDef[] = [
  {
    id: 'hard_ossuar',
    name: 'The Split Quarry',
    desc: 'Where the Hollow Mountain sleeps beneath plates of ancient bone and stone.',
    art: 'bonequarry',
    color: '#b8a890',
    act: 4,
    packSize: [1, 1],
    tier: 23,
    ilvlBonus: 14,
    levelRange: [72, 72],
    monsters: zoneDef('bonequarry').monsters.map((m) => scaled(m, 1.1, 1.0, 72)),
    boss: {
      id: 'boss_ossuar',
      name: 'Ossuar, the Hollow Mountain',
      level: 72,
      dmgType: 'phys',
      lifeMult: 1.8,
      dmgMult: 1.35,
      basic: { name: 'Tectonic Fist', kind: 'attack', ms: 2600 },
      slam: { name: 'Faultline Crush', kind: 'attack', ms: 3400 },
      mechanics: ['slam', 'plating', 'enrage'],
    },
    actBoss: false,
    bossEvery: 0,
    spawnEveryMs: 8000,
    uniques: ['faultline', 'giants_knuckle', 'titans_girth'],
    requires: { after: [] },
  },
  {
    id: 'hard_mother_vael',
    name: 'The Belfry of Echoes',
    desc: 'High under the bronze bells, Mother Vael conducts a choir that does not breathe.',
    art: 'choirloft',
    color: '#f2d14c',
    act: 3,
    packSize: [1, 1],
    tier: 24,
    ilvlBonus: 14,
    levelRange: [75, 75],
    monsters: zoneDef('choirloft').monsters.map((m) => scaled(m, 1.15, 1.05, 75)),
    boss: {
      id: 'boss_mother_vael',
      name: 'Mother Vael, the Last Choir',
      level: 75,
      dmgType: 'light',
      lifeMult: 1.85,
      dmgMult: 1.4,
      basic: { name: 'Resonant Toll', kind: 'spell', ms: 2500 },
      slam: { name: 'Bronze Clapper', kind: 'attack', ms: 3300 },
      nova: { name: 'Vesper Burst', kind: 'spell', ms: 3600 },
      mechanics: ['slam', 'nova', 'choir', 'scorch'],
      novaType: 'light',
    },
    actBoss: false,
    bossEvery: 0,
    spawnEveryMs: 8000,
    uniques: ['last_hymn', 'halo_of_wrath', 'saints_shard'],
    requires: { after: [] },
  },
  {
    id: 'hard_undertow',
    name: 'The Drowned Trench',
    desc: 'At the bottom of the black current, the water pulls everything back down.',
    art: 'voicetrench',
    color: '#5f8f9e',
    act: 5,
    packSize: [1, 1],
    tier: 25,
    ilvlBonus: 14,
    levelRange: [78, 78],
    monsters: zoneDef('voicetrench').monsters.map((m) => scaled(m, 1.2, 1.1, 78)),
    boss: {
      id: 'boss_undertow',
      name: 'The Undertow',
      level: 78,
      dmgType: 'cold',
      lifeMult: 1.95,
      dmgMult: 1.45,
      basic: { name: 'Crushing Current', kind: 'attack', ms: 2400 },
      slam: { name: 'Abyssal Drag', kind: 'attack', ms: 3200 },
      nova: { name: 'Freezing Swell', kind: 'spell', ms: 3600 },
      channel: { name: 'Deep Call', kind: 'spell', ms: 5600 },
      mechanics: ['slam', 'nova', 'channel', 'tide'],
      novaType: 'cold',
      rime: true,
    },
    actBoss: false,
    bossEvery: 0,
    spawnEveryMs: 8000,
    uniques: ['riptide', 'tide_crown', 'leviathan_hide'],
    requires: { after: [] },
  },
  {
    id: 'hard_twin_regents',
    name: 'The Divided Dais',
    desc: 'Two thrones, two elements, and one unbroken pact.',
    art: 'sunderedhall',
    color: '#e2603f',
    act: 6,
    packSize: [1, 1],
    tier: 26,
    ilvlBonus: 14,
    levelRange: [82, 82],
    monsters: zoneDef('sunderedhall').monsters.map((m) => scaled(m, 1.25, 1.12, 82)),
    boss: {
      id: 'boss_twin_regents',
      name: 'Regent Sol',
      level: 82,
      dmgType: 'fire',
      lifeMult: 1.45,
      dmgMult: 1.35,
      basic: { name: 'Solar Decree', kind: 'attack', ms: 2300 },
      slam: { name: 'Sovereign Cleave', kind: 'attack', ms: 3100 },
      nova: { name: 'Dual Eclipse', kind: 'spell', ms: 3500 },
      mechanics: ['slam', 'nova', 'regents', 'scorch'],
      novaType: 'cold',
    },
    actBoss: false,
    bossEvery: 0,
    spawnEveryMs: 8000,
    uniques: ['twinned_crown', 'hand_of_the_regent', 'regents_mantle'],
    requires: { after: [] },
  },
  {
    id: 'hard_crownless',
    name: 'The Unwritten Hall',
    desc: 'Beyond the Ninth Stair stands the one who refused the crown and outlived the line.',
    art: 'shatteredthrone',
    color: '#d8c070',
    act: 6,
    packSize: [1, 1],
    tier: 27,
    ilvlBonus: 14,
    levelRange: [86, 86],
    monsters: zoneDef('shatteredthrone').monsters.map((m) => scaled(m, 1.35, 1.18, 86)),
    boss: {
      id: 'boss_crownless',
      name: 'The Crownless',
      level: 86,
      dmgType: 'fire',
      lifeMult: 2.15,
      dmgMult: 1.55,
      basic: { name: 'Unwritten Strike', kind: 'attack', ms: 2200 },
      slam: { name: 'Shatter the Line', kind: 'attack', ms: 3000 },
      nova: { name: 'Triune Storm', kind: 'spell', ms: 3400 },
      channel: { name: 'Deep Call', kind: 'spell', ms: 5200 },
      mechanics: ['slam', 'nova', 'crownless', 'plating', 'choir', 'channel', 'enrage'],
      novaType: 'light',
    },
    actBoss: false,
    bossEvery: 0,
    spawnEveryMs: 8000,
    uniques: ['the_unwritten', 'oathbreaker', 'last_decree', 'crownbreaker_mask'],
    requires: { after: [] },
  },
];

export interface UberBossDef {
  tier: 1 | 2 | 3;
  zoneId: string;
  name: string;
  arenaName: string;
  level: number;
  keyId: 'uber_key_1' | 'uber_key_2' | 'uber_key_3';
  keyName: string;
  sigilId: 'exile_doom_sigil' | 'architect_doom_sigil' | 'void_sigil';
  sigilName: string;
  sigilDesc: string;
  uniques: string[];
  mechanicSummary: string;
}

export const UBER_BOSSES: UberBossDef[] = [
  {
    tier: 1,
    zoneId: 'uber_first_exile',
    name: 'The First Exile',
    arenaName: "The First Exile's Crucible",
    level: 91,
    keyId: 'uber_key_1',
    keyName: 'Uber Key I: The Mirror',
    sigilId: 'exile_doom_sigil',
    sigilName: "Exile's Doom Sigil",
    sigilDesc: 'Elevates one Tier 1 modifier on a rare item to Tier 0 Doom Tier (+25% above T1 max).',
    uniques: ['mirrors_edge', 'exiles_covenant'],
    mechanicSummary: 'Mirror Stance adapts every 12s to your skill type (melee, projectile or spell), pairing heavy slams and novas.',
  },
  {
    tier: 2,
    zoneId: 'uber_architect_ruin',
    name: 'The Architect of Ruin',
    arenaName: 'The Ruined Sanctum',
    level: 94,
    keyId: 'uber_key_2',
    keyName: 'Uber Key II: The Ruin',
    sigilId: 'architect_doom_sigil',
    sigilName: "Architect's Doom Sigil",
    sigilDesc: 'Imbues a rare item with a powerful Doom Implicit modifier.',
    uniques: ['architects_compass', 'ruinforged_mantle'],
    mechanicSummary: 'Sixfold Ruin cycles through all six campaign boss signatures as his life falls across six thresholds.',
  },
  {
    tier: 3,
    zoneId: 'uber_void_sovereign',
    name: 'The Void Sovereign',
    arenaName: 'The Void Throne',
    level: 97,
    keyId: 'uber_key_3',
    keyName: 'Uber Key III: The Void',
    sigilId: 'void_sigil',
    sigilName: 'Void Sigil',
    sigilDesc: 'Unlocks a 7th modifier slot on a rare item.',
    uniques: ['void_crown', 'sovereigns_grasp'],
    mechanicSummary: 'Chaos damage & Void Carapace (60% less damage taken) that shatters at 15 hit/Doom buildup into a 10s vulnerability window.',
  },
];

export const UBER_BOSS_ZONES: ZoneDef[] = [
  {
    id: 'uber_first_exile',
    name: "The First Exile's Crucible",
    desc: 'The shadow of the First Exile lingers at the edge of the realm.',
    art: 'shatteredthrone',
    color: '#d0569b',
    act: 6,
    packSize: [1, 1],
    tier: 28,
    ilvlBonus: 18,
    levelRange: [90, 91],
    monsters: zoneDef('shatteredthrone').monsters.map((m) => scaled(m, 1.5, 1.3, 90)),
    boss: {
      id: 'boss_first_exile',
      name: 'The First Exile',
      level: 91,
      dmgType: 'phys',
      lifeMult: 2.2,
      dmgMult: 1.65,
      basic: { name: 'Mirrored Edge', kind: 'attack', ms: 1800 },
      slam: { name: 'Shattered Reflection', kind: 'attack', ms: 2900 },
      nova: { name: 'Exile’s Reckoning', kind: 'spell', ms: 3400 },
      mechanics: ['slam', 'nova', 'mirror', 'enrage'],
      novaType: 'phys',
    },
    actBoss: true,
    bossEvery: 0,
    spawnEveryMs: 8000,
    uniques: ['mirrors_edge', 'exiles_covenant', 'starforged_edge', 'crownbreaker_mask'],
    requires: { after: [] },
  },
  {
    id: 'uber_architect_ruin',
    name: 'The Ruined Sanctum',
    desc: 'The ancient builder whose designs unravelled reality.',
    art: 'sunderedhall',
    color: '#e85a4f',
    act: 6,
    packSize: [1, 1],
    tier: 28,
    ilvlBonus: 19,
    levelRange: [93, 94],
    monsters: zoneDef('sunderedhall').monsters.map((m) => scaled(m, 1.6, 1.35, 93)),
    boss: {
      id: 'boss_architect_ruin',
      name: 'The Architect of Ruin',
      level: 94,
      dmgType: 'fire',
      lifeMult: 2.5,
      dmgMult: 1.75,
      basic: { name: 'Draft of Ruin', kind: 'spell', ms: 1800 },
      slam: { name: 'Keystone Collapse', kind: 'attack', ms: 2800 },
      nova: { name: 'Cataclysmic Blueprint', kind: 'spell', ms: 3400 },
      channel: { name: 'Unmaking the Foundation', kind: 'spell', ms: 5200 },
      mechanics: ['slam', 'nova', 'ruin_cycle', 'ward', 'scorch', 'martyrs', 'frostbite', 'channel', 'enrage'],
      novaType: 'light',
    },
    actBoss: true,
    bossEvery: 0,
    spawnEveryMs: 8000,
    uniques: ['architects_compass', 'ruinforged_mantle', 'hand_of_the_regent', 'regents_mantle'],
    requires: { after: [] },
  },
  {
    id: 'uber_void_sovereign',
    name: 'The Void Throne',
    desc: 'The absolute ruler of the nothingness beyond the stars.',
    art: 'shatteredthrone',
    color: '#9b6dde',
    act: 6,
    packSize: [1, 1],
    tier: 28,
    ilvlBonus: 20,
    levelRange: [96, 97],
    monsters: zoneDef('shatteredthrone').monsters.map((m) => scaled(m, 1.7, 1.4, 96)),
    boss: {
      id: 'boss_void_sovereign',
      name: 'The Void Sovereign',
      level: 97,
      dmgType: 'chaos',
      lifeMult: 2.8,
      dmgMult: 1.85,
      basic: { name: 'Null Verdict', kind: 'spell', ms: 1700 },
      slam: { name: 'Horizon Crush', kind: 'attack', ms: 2800 },
      nova: { name: 'Singularity Pulse', kind: 'spell', ms: 3300 },
      mechanics: ['slam', 'nova', 'void_shield', 'enrage'],
      novaType: 'chaos',
      slamType: 'chaos',
      groundKind: 'unholy',
    },
    actBoss: true,
    bossEvery: 0,
    spawnEveryMs: 8000,
    uniques: ['void_crown', 'sovereigns_grasp', 'last_decree', 'oathbreaker'],
    requires: { after: [] },
  },
];

for (const z of [...HARD_BOSS_ZONES, ...UBER_BOSS_ZONES]) {
  EXTRA_ZONES.push(z);
}

export function isHardBossZone(zoneId: string): boolean {
  return HARD_BOSS_ZONES.some((z) => z.id === zoneId);
}

export function isUberBossZone(zoneId: string): boolean {
  return UBER_BOSS_ZONES.some((z) => z.id === zoneId);
}

export function isKeyedBossZone(zoneId: string): boolean {
  return isHardBossZone(zoneId) || isUberBossZone(zoneId);
}

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

/** Tier-locked unique pools (T5+, T7+, T10). Any tier group drops its own pool plus lower map pools. */
export const MAP_UNIQUE_POOLS: { minTier: number; label: string; uniques: string[] }[] = [
  { minTier: 5, label: 'Map Tier 5+', uniques: ['stormrider_greaves', 'unblinking_tome', 'briar_key'] },
  { minTier: 7, label: 'Map Tier 7+', uniques: ['heart_of_winter', 'giants_knuckle', 'bosuns_oath', 'leviathan_hide'] },
  { minTier: 10, label: 'Map Tier 10', uniques: ['oathbreaker', 'kingsmarch', 'last_decree', 'crownbreaker_mask', 'hand_of_the_regent', 'regents_mantle', 'starforged_edge'] },
];

export function mapTierUniques(tier: number): string[] {
  return MAP_UNIQUE_POOLS.filter((p) => tier >= p.minTier).flatMap((p) => p.uniques);
}

export const MAP_TIERS: MapTier[] = [
  {
    tier: 1, level: 66, packs: 6, dropTier: 18, lifeScale: 0.9, dmgScale: 0.82,
    mod: 'none', modName: 'Baseline', modDesc: 'Standard map run with no permanent modifier.', rewardDesc: 'General drops',
  },
  {
    tier: 2, level: 68, packs: 7, dropTier: 19, lifeScale: 0.95, dmgScale: 0.85,
    mod: 'none', modName: 'Baseline', modDesc: 'Standard map run with no permanent modifier.', rewardDesc: 'General drops',
  },
  {
    tier: 3, level: 70, packs: 8, dropTier: 20, lifeScale: 1.0, dmgScale: 0.88,
    mod: 'elite', modName: 'Elite packs', modDesc: '2 of the run’s packs are elite (4× Life, 1.5× Damage, 3× XP, 60% more drops).', rewardDesc: 'Reliable Chaos Orbs',
  },
  {
    tier: 4, level: 72, packs: 8, dropTier: 21, lifeScale: 1.05, dmgScale: 0.91,
    mod: 'elite', modName: 'Elite packs', modDesc: '2 of the run’s packs are elite (4× Life, 1.5× Damage, 3× XP, 60% more drops).', rewardDesc: 'Reliable Chaos Orbs',
  },
  {
    tier: 5, level: 74, packs: 9, dropTier: 22, lifeScale: 1.1, dmgScale: 0.95,
    mod: 'twin', modName: 'Twin boss', modDesc: 'The boss spawns a lieutenant at 60% stats; they share a Life pool.', rewardDesc: 'Tier 5–6 unique pool',
  },
  {
    tier: 6, level: 76, packs: 9, dropTier: 23, lifeScale: 1.15, dmgScale: 0.99,
    mod: 'twin', modName: 'Twin boss', modDesc: 'The boss spawns a lieutenant at 60% stats; they share a Life pool.', rewardDesc: 'Tier 5–6 unique pool',
  },
  {
    tier: 7, level: 78, packs: 10, dropTier: 24, lifeScale: 1.2, dmgScale: 1.03,
    mod: 'ground', modName: 'Dangerous ground', modDesc: 'Unholy, burning or frozen ground covers part of the arena during the boss fight.', rewardDesc: 'Tier 7–8 unique pool & Regal emphasis',
  },
  {
    tier: 8, level: 80, packs: 10, dropTier: 25, lifeScale: 1.25, dmgScale: 1.07,
    mod: 'ground', modName: 'Dangerous ground', modDesc: 'Unholy, burning or frozen ground covers part of the arena during the boss fight.', rewardDesc: 'Tier 7–8 unique pool & Regal emphasis',
  },
  {
    tier: 9, level: 82, packs: 11, dropTier: 26, lifeScale: 1.3, dmgScale: 1.11,
    mod: 'enrage', modName: 'Enraged', modDesc: 'All monsters start permanently enraged (30% faster, 40% more damage).', rewardDesc: 'Exalted Orb emphasis',
  },
  {
    tier: 10, level: 84, packs: 12, dropTier: 27, lifeScale: 1.35, dmgScale: 1.15,
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
export const MAP_DEVICE_SEXTANT_SLOTS = [1, 2, 2, 3];

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
  notable?: boolean;
  keystone?: boolean;
  /** previous node in the wing required to allocate this one */
  requires?: string;
  /** minimum total Atlas points earned (or allocated) required */
  minPoints?: number;
}

export const ATLAS_DOOMED_POINTS = 20;

export const ATLAS_NODES: AtlasNode[] = [
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

export function atlasNode(id: string): AtlasNode {
  const n = ATLAS_NODES.find((x) => x.id === id);
  if (!n) throw new Error(`Unknown Atlas node ${id}`);
  return n;
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
  { tier: 1, name: 'Doomed Map I', level: 86, packs: 14, mods: [2, 2], modCount: [2, 2], keyChance: 0.10, dropTier: 28, lifeScale: 1.55, dmgScale: 1.32 },
  { tier: 2, name: 'Doomed Map II', level: 88, packs: 15, mods: [2, 3], modCount: [2, 3], keyChance: 0.15, dropTier: 28, lifeScale: 1.65, dmgScale: 1.38 },
  { tier: 3, name: 'Doomed Map III', level: 90, packs: 15, mods: [3, 3], modCount: [3, 3], keyChance: 0.20, dropTier: 28, lifeScale: 1.75, dmgScale: 1.44 },
  { tier: 4, name: 'Doomed Map IV', level: 92, packs: 16, mods: [3, 4], modCount: [3, 4], keyChance: 0.25, dropTier: 28, lifeScale: 1.85, dmgScale: 1.50 },
  { tier: 5, name: 'Doomed Map V', level: 94, packs: 16, mods: [4, 4], modCount: [4, 4], keyChance: 0.35, dropTier: 28, lifeScale: 1.95, dmgScale: 1.56 },
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

import type { SkillAction } from './skills';
import { FIBRE_CHANCE, fibreForPatch } from './tailoring';

export type MutationTier = 'magic' | 'rare' | 'unique' | 'legendary';
export type StrainRarity = 'normal' | MutationTier;

export const STRAIN_RARITY_ORDER: readonly StrainRarity[] = ['normal', 'magic', 'rare', 'unique', 'legendary'];
export const RARITY_LABEL: Record<StrainRarity, string> = {
  normal: 'Normal',
  magic: 'Magic',
  rare: 'Rare',
  unique: 'Unique',
  legendary: 'Legendary',
};

export interface PlantSpecies {
  id: string;
  name: string;
  level: number;
  intervalMs: number;
  xp: number;
  growMs: number;
  herb: string;
  color: string;
  essences: string[];
  hybrid?: boolean;
  parents?: readonly [string, string];
  uniqueMutation?: string;
}

export interface PlantMutation {
  id: string;
  name: string;
  tier: MutationTier;
  weight: number;
  effect: string;
  hybridOnly?: string;
}

const MIN = 60_000;
const HOUR = 60 * MIN;

export const BASE_SPECIES: readonly PlantSpecies[] = [
  { id: 'sunpetal', name: 'Sunpetal', level: 1, intervalMs: 3000, xp: 7, growMs: 30 * MIN, herb: 'sunpetal', color: '#f2c94c', essences: ['essence_vitality_1'] },
  { id: 'frostleaf', name: 'Frostleaf', level: 12, intervalMs: 3500, xp: 16, growMs: 45 * MIN, herb: 'frostleaf', color: '#7fc8f8', essences: ['essence_frost_2', 'essence_vitality_2'] },
  { id: 'emberroot', name: 'Emberroot', level: 25, intervalMs: 4000, xp: 32, growMs: 1 * HOUR, herb: 'emberroot', color: '#e2603f', essences: ['essence_embers_2', 'essence_storm_2'] },
  { id: 'voidbloom', name: 'Voidbloom', level: 40, intervalMs: 5000, xp: 55, growMs: 90 * MIN, herb: 'voidbloom', color: '#9b6dde', essences: ['essence_haste_2'] },
  { id: 'moon_bloom', name: 'Moon Bloom', level: 45, intervalMs: 6000, xp: 60, growMs: 2 * HOUR, herb: 'moon_bloom', color: '#b3d7fa', essences: [] },
  { id: 'thornvine', name: 'Thornvine', level: 52, intervalMs: 6500, xp: 70, growMs: 3 * HOUR, herb: 'thornvine', color: '#8f5a4a', essences: ['essence_embers_2'] },
  { id: 'star_bloom', name: 'Star Bloom', level: 60, intervalMs: 7000, xp: 80, growMs: 3 * HOUR, herb: 'star_bloom', color: '#d4a9ff', essences: [] },
  { id: 'glimmermoss', name: 'Glimmermoss', level: 68, intervalMs: 7500, xp: 95, growMs: 4 * HOUR, herb: 'glimmermoss', color: '#64d8b4', essences: ['essence_storm_2'] },
  { id: 'wraithlily', name: 'Wraithlily', level: 84, intervalMs: 8000, xp: 115, growMs: 6 * HOUR, herb: 'wraithlily', color: '#c4b8e8', essences: ['essence_haste_2'] },
];

export const HYBRID_SPECIES: readonly PlantSpecies[] = [
  { id: 'eclipse_bloom', name: 'Eclipse Bloom', level: 80, intervalMs: 0, xp: 0, growMs: 4 * HOUR, herb: 'eclipse_bloom', color: '#7a6ad8', essences: [], hybrid: true, parents: ['moon_bloom', 'star_bloom'], uniqueMutation: 'umbral' },
  { id: 'sunfire_lily', name: 'Sunfire Lily', level: 80, intervalMs: 0, xp: 0, growMs: 3 * HOUR, herb: 'sunfire_lily', color: '#ff8a3d', essences: [], hybrid: true, parents: ['sunpetal', 'emberroot'], uniqueMutation: 'blazing' },
  { id: 'rimeshade', name: 'Rimeshade', level: 80, intervalMs: 0, xp: 0, growMs: 3 * HOUR, herb: 'rimeshade', color: '#6da2e0', essences: [], hybrid: true, parents: ['frostleaf', 'voidbloom'], uniqueMutation: 'stillwater' },
  { id: 'cinderthorn', name: 'Cinderthorn', level: 80, intervalMs: 0, xp: 0, growMs: 4 * HOUR, herb: 'cinderthorn', color: '#c44b38', essences: [], hybrid: true, parents: ['emberroot', 'thornvine'], uniqueMutation: 'barbed' },
  { id: 'starmoss', name: 'Starmoss', level: 80, intervalMs: 0, xp: 0, growMs: 5 * HOUR, herb: 'starmoss', color: '#9cf0d8', essences: [], hybrid: true, parents: ['glimmermoss', 'star_bloom'], uniqueMutation: 'starlit' },
  { id: 'soulflower', name: 'Soulflower', level: 80, intervalMs: 0, xp: 0, growMs: 6 * HOUR, herb: 'soulflower', color: '#e6d8ff', essences: [], hybrid: true, parents: ['wraithlily', 'eclipse_bloom'], uniqueMutation: 'undying' },
];

export const ALL_SPECIES: readonly PlantSpecies[] = [...BASE_SPECIES, ...HYBRID_SPECIES];

export const SHARED_MUTATIONS: readonly PlantMutation[] = [
  { id: 'bountiful', name: 'Bountiful', tier: 'magic', weight: 100, effect: '+1 herb per Greenhouse harvest' },
  { id: 'vivid', name: 'Vivid', tier: 'magic', weight: 100, effect: '+10% infusion strength in Alchemy' },
  { id: 'quickroot', name: 'Quickroot', tier: 'magic', weight: 100, effect: 'Grows 20% faster' },
  { id: 'hardy', name: 'Hardy', tier: 'magic', weight: 100, effect: '+10 points to inheritance chance' },
  { id: 'fragrant', name: 'Fragrant', tier: 'magic', weight: 100, effect: 'Essence chance +25% when harvested' },
  { id: 'overflowing', name: 'Overflowing', tier: 'rare', weight: 10, effect: '+3 herbs per harvest' },
  { id: 'radiant', name: 'Radiant', tier: 'rare', weight: 10, effect: '+30% infusion strength' },
  { id: 'twin_headed', name: 'Twin-headed', tier: 'rare', weight: 10, effect: '+1 seed per harvest' },
  { id: 'deep_rooted', name: 'Deep-rooted', tier: 'rare', weight: 10, effect: 'Stabilises in 2 fewer generations' },
  { id: 'lucent', name: 'Lucent', tier: 'rare', weight: 10, effect: 'Essence chance +50%, essences one grade higher' },
  { id: 'celestial', name: 'Celestial', tier: 'legendary', weight: 1, effect: '+75% infusion strength' },
  { id: 'everbloom', name: 'Everbloom', tier: 'legendary', weight: 1, effect: 'Plot replants itself after harvest at no seed cost' },
  { id: 'prismatic', name: 'Prismatic', tier: 'legendary', weight: 1, effect: 'Counts as any species for Alchemy infusion recipes' },
];

export const HYBRID_MUTATIONS: readonly PlantMutation[] = [
  { id: 'umbral', name: 'Umbral', tier: 'unique', weight: 10, effect: '+50% infusion duration', hybridOnly: 'eclipse_bloom' },
  { id: 'blazing', name: 'Blazing', tier: 'unique', weight: 10, effect: 'Infusions also deal fire on use', hybridOnly: 'sunfire_lily' },
  { id: 'stillwater', name: 'Stillwater', tier: 'unique', weight: 10, effect: '+1 flask charge from infusions', hybridOnly: 'rimeshade' },
  { id: 'barbed', name: 'Barbed', tier: 'unique', weight: 10, effect: 'Infusions add a thorns effect', hybridOnly: 'cinderthorn' },
  { id: 'starlit', name: 'Starlit', tier: 'unique', weight: 10, effect: 'Infusions scale with Astrology level', hybridOnly: 'starmoss' },
  { id: 'undying', name: 'Undying', tier: 'unique', weight: 10, effect: 'One infusion effect persists after the flask ends', hybridOnly: 'soulflower' },
];

export const ALL_MUTATIONS: readonly PlantMutation[] = [...SHARED_MUTATIONS, ...HYBRID_MUTATIONS];
export const MUTATION_BY_ID = new Map(ALL_MUTATIONS.map((m) => [m.id, m]));
export const SPECIES_BY_ID = new Map(ALL_SPECIES.map((sp) => [sp.id, sp]));
export const BASE_SPECIES_INDEX = new Map(BASE_SPECIES.map((sp, i) => [sp.id, i]));

export const HERBARIUM_PERKS = [
  { entries: 10, label: '+1 Greenhouse plot' },
  { entries: 25, label: '+5 points to inheritance chance' },
  { entries: 50, label: '+10% Greenhouse grow speed' },
  { entries: 100, label: '+1 Greenhouse plot' },
  { entries: 200, label: '+10% Greenhouse grow speed' },
] as const;

export const STABILISATION_PERKS = [
  { points: 1, label: '+5% new mutation chance' },
  { points: 3, label: '+10% Greenhouse grow speed' },
  { points: 6, label: '+1 offspring seed per cross' },
  { points: 10, label: '+10 points to inheritance chance' },
  { points: 15, label: '+10% Greenhouse grow speed' },
  { points: 25, label: '+1 mutation slot roll on crosses' },
] as const;

export const PLOT_UNLOCK_LEVELS = [5, 20, 35, 50, 65, 80, 95] as const;

/** Kept for legacy code / migration lookups. */
export const HERBS = BASE_SPECIES.slice(0, 4).map((sp) => ({
  id: sp.id,
  action: `forage_${sp.id}`,
  name: sp.name,
  level: sp.level,
  ms: sp.intervalMs,
  xp: sp.xp,
  color: sp.color,
  essences: sp.essences,
  use: 'Alchemy flasks and Greenhouse breeding.',
}));

export interface ForagingSource {
  plant: string;
  mode: 'wild' | 'ordinary' | 'abundant' | 'concentrated' | 'bloom';
  essences?: string[];
}

export const seedId = (plant: string) => `seed_${plant}`;

export function speciesDef(id: string): PlantSpecies | undefined {
  return SPECIES_BY_ID.get(id);
}

export function mutationDef(id: string): PlantMutation | undefined {
  return MUTATION_BY_ID.get(id);
}

export function hybridForParents(a: string, b: string): PlantSpecies | undefined {
  return HYBRID_SPECIES.find((h) => h.parents && ((h.parents[0] === a && h.parents[1] === b) || (h.parents[0] === b && h.parents[1] === a)));
}

export function foragingSource(a: SkillAction): ForagingSource | undefined {
  if (a.foraging) return a.foraging;
  if (a.id.startsWith('forage_')) {
    const sp = SPECIES_BY_ID.get(a.id.slice(7));
    if (sp) return { plant: sp.id, mode: 'wild', essences: sp.essences };
  }
  return undefined;
}

/** Nine wild base-species patches. Raw XP goes through the existing single 0.3 scaling pass. */
export const FORAGING_ACTIONS: SkillAction[] = BASE_SPECIES.map((sp): SkillAction => ({
  id: `forage_${sp.id}`,
  skill: 'harvesting',
  name: `${sp.name} Patch`,
  level: sp.level,
  intervalMs: sp.intervalMs,
  xp: sp.xp,
  color: sp.color,
  outputs: { [sp.herb]: 1 },
  bonus: [
    ...sp.essences.map((id) => ({ id, chance: +(0.02 / sp.essences.length).toFixed(4), qty: 1 })),
    // fibre for Tailoring turns up alongside the herb
    { id: fibreForPatch(sp.level), chance: FIBRE_CHANCE, qty: 1 },
  ],
  foraging: { plant: sp.id, mode: 'wild', essences: sp.essences },
}));

import type { StatKey } from '../engine/types';
import type { MaterialDef } from './materials';
import { FISHING_MEAL } from './fishing';

/**
 * Cooking, Act 5's skill (docs/GAME.md): gathered plants become flask ingredients for Alchemy's strongest
 * brews, and meals. A meal fills your one meal slot and its clock only runs while you fight.
 */
export const COOKING_GATE = { zone: 'blackharbor', label: 'Act 5' };

/** How long one meal lasts, in time spent fighting. */
export const MEAL_MS = 30 * 60 * 1000;

export type MealCategory = 'survival' | 'resources' | 'damage' | 'gathering' | 'production';

export interface MealDef {
  id: string;
  name: string;
  color: string;
  value: number;
  stats: Partial<Record<StatKey, number>>;
  /** flavour, shown in the Pantry */
  desc: string;
  durationMs?: number;
  category?: MealCategory;
  skillingTarget?: 'gathering' | 'production';
  protected?: boolean;
}

export const MEALS: MealDef[] = [
  { id: 'meal_porridge', name: 'Sunpetal Porridge', color: '#f2c94c', value: 20, stats: { lifePct: 8 }, desc: 'Plain, hot and filling. 8% increased maximum Life for 30 min of combat.', category: 'survival' },
  { id: 'meal_broth', name: 'Frostleaf Broth', color: '#7fc8f8', value: 30, stats: { manaPct: 12 }, desc: 'Clears the head. 12% increased maximum Mana for 30 min of combat.', category: 'resources' },
  { id: 'meal_hash', name: "Forager's Hash", color: '#a8b860', value: 50, stats: { itemRarity: 15 }, desc: 'You start noticing things on the ground. 15% increased Item Rarity for 30 min of combat.', category: 'gathering' },
  { id: 'meal_gatherer', name: "Gatherer's Ration", color: '#68b04d', value: 40, stats: { gatheringSpeed: 5 }, desc: 'Dried fruit and salted roots. 5% increased Gathering & Thieving speed for 30 min of active work.', category: 'gathering', skillingTarget: 'gathering' },
  { id: 'meal_chilli', name: 'Emberroot Chilli', color: '#e2603f', value: 80, stats: { physPct: 12, elemPct: 12 }, desc: 'It starts a fight in your stomach, and you finish it elsewhere. 12% increased Physical & Elemental Damage for 30 min of combat.', category: 'damage' },
  { id: 'meal_artisan', name: "Artisan's Lunch", color: '#c28546', value: 60, stats: { productionSpeed: 5 }, desc: 'Hearty bread and roasted seeds. 5% increased Production speed for 30 min of active work.', category: 'production', skillingTarget: 'production' },
  { id: 'meal_chowder', name: 'Stormwatch Chowder', color: '#d8c070', value: 120, stats: { fireRes: 14, lightRes: 14 }, desc: 'What deck crews eat before a storm. +14% Fire and Lightning Resistance for 30 min of combat.', category: 'survival' },
  { id: 'meal_roast', name: 'Slow Root Roast', color: '#b0603a', value: 150, stats: { lifeRegenPct: 0.6 }, desc: 'It keeps working long after the plate is clean. Regenerates 0.6% Life per second for 30 min of combat.', category: 'survival' },
  { id: 'meal_curry', name: 'Voidbloom Curry', color: '#9b6dde', value: 220, stats: { attackSpeedPct: 8, castSpeedPct: 8 }, desc: 'Time passes a little slower for you than for them. 8% increased Attack & Cast Speed for 30 min of combat.', category: 'damage' },
  { id: 'meal_table', name: "Captain's Table", color: '#e0a640', value: 400, stats: { lifePct: 8, allRes: 8, physPct: 8, elemPct: 8 }, desc: 'A little of everything, served on the last good plate. 8% Life, all Res, Phys & Elem Damage for 30 min of combat.', category: 'damage' },
  { id: 'meal_moon_signature', name: 'Moonfall Consommé', color: '#82aaff', value: 300, stats: { manaPct: 16, castSpeedPct: 10 }, desc: 'Delicate broth infused with Moon Bloom. 16% increased maximum Mana and 10% increased Cast Speed for 60 min of combat.', durationMs: 60 * 60 * 1000, category: 'resources', protected: true },
  { id: 'meal_star_signature', name: 'Starlight Banquet', color: '#ffd700', value: 450, stats: { lifePct: 12, allRes: 12 }, desc: 'Rare roasted roots and Star Bloom glaze. 12% increased maximum Life and 12% all Elemental Resistances for 60 min of combat.', durationMs: 60 * 60 * 1000, category: 'survival', protected: true },
  { id: 'feast_artisans', name: "Grand Artisan's Feast", color: '#e08a4a', value: 500, stats: { productionSpeed: 8 }, desc: 'A lavish spread for the master workshop. 8% increased Production speed for 60 min of active work.', durationMs: 60 * 60 * 1000, category: 'production', skillingTarget: 'production', protected: true },
  { id: 'feast_wayfarers', name: "Wayfarer's Feast", color: '#e2603f', value: 500, stats: { lifePct: 12, allRes: 8 }, desc: 'Substantial banquet provisions for seasoned explorers. 12% increased maximum Life and 8% all Elemental Resistances for 60 min of combat.', durationMs: 60 * 60 * 1000, category: 'survival', protected: true },
];

const MEAL_BY_ID: Record<string, MealDef> = Object.fromEntries(MEALS.map((m) => [m.id, m]));

const CROWNFIRE_FEAST: MealDef = {
  id: FISHING_MEAL, name: 'Crownfire Feast', color: '#f3bd72', value: 0, durationMs: 900_000, protected: true,
  stats: { lifePct: 50, physPct: 100, elemPct: 100, chaosPct: 100, attackSpeedPct: 35, castSpeedPct: 35 },
  desc: 'For 15 minutes in combat, 50% increased maximum Life, 100% increased damage and 35% increased Attack and Cast Speed.',
};

export function mealDef(id: string): MealDef {
  if (id === FISHING_MEAL) return CROWNFIRE_FEAST;
  const m = MEAL_BY_ID[id];
  if (!m) throw new Error(`Unknown meal ${id}`);
  return m;
}

/** Flask ingredients: each one is what its Alchemy recipe needs, and nothing else makes them. */
export const INGREDIENTS: MaterialDef[] = [
  { id: 'frost_extract', name: 'Frostleaf Extract', kind: 'ingredient', color: '#7fc8f8', value: 60, desc: 'Boiled right down. Brews Sacred Mana Flasks.' },
  { id: 'ember_reduction', name: 'Emberroot Reduction', kind: 'ingredient', color: '#e2603f', value: 120, desc: 'Thick enough to stand a spoon in. Brews Sacred Life Flasks.' },
  { id: 'void_distillate', name: 'Voidbloom Distillate', kind: 'ingredient', color: '#9b6dde', value: 200, desc: 'It stains the pot for good. Brews Sulphur Flasks.' },
];

export const COOKING_MATERIALS: MaterialDef[] = [
  ...MEALS.map((m): MaterialDef => ({ id: m.id, name: m.name, kind: 'food', color: m.color, value: m.value, desc: m.desc })),
  ...INGREDIENTS,
  { id: 'binding_stock', name: 'Binding Stock', kind: 'ingredient', color: '#c29d62', value: 0, desc: 'A rich culinary reduction of Moon Bloom and herbs. Project material for future assemblies; not edible.' },
];

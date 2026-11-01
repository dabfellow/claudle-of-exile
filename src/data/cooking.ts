import type { StatKey } from '../engine/types';
import type { MaterialDef } from './materials';

/**
 * Cooking, Act 5's skill (docs/design/COOKING.md): gathered plants become flask ingredients for Alchemy's strongest
 * brews, and meals. A meal fills your one meal slot and its clock only runs while you fight.
 */
export const COOKING_GATE = { zone: 'blackharbor', label: 'Act 5' };

/** How long one meal lasts, in time spent fighting. */
export const MEAL_MS = 30 * 60 * 1000;

export interface MealDef {
  id: string;
  name: string;
  color: string;
  value: number;
  stats: Partial<Record<StatKey, number>>;
  /** flavour, shown in the Pantry */
  desc: string;
}

export const MEALS: MealDef[] = [
  { id: 'meal_porridge', name: 'Sunpetal Porridge', color: '#f2c94c', value: 20, stats: { lifePct: 8 }, desc: 'Plain, hot and filling.' },
  { id: 'meal_broth', name: 'Frostleaf Broth', color: '#7fc8f8', value: 30, stats: { manaPct: 12 }, desc: 'Clears the head.' },
  { id: 'meal_hash', name: "Forager's Hash", color: '#a8b860', value: 50, stats: { itemRarity: 15 }, desc: 'You start noticing things on the ground.' },
  { id: 'meal_chilli', name: 'Emberroot Chilli', color: '#e2603f', value: 80, stats: { physPct: 12, elemPct: 12 }, desc: 'It starts a fight in your stomach, and you finish it elsewhere.' },
  { id: 'meal_chowder', name: 'Stormwatch Chowder', color: '#d8c070', value: 120, stats: { fireRes: 14, lightRes: 14 }, desc: 'What deck crews eat before a storm.' },
  { id: 'meal_roast', name: 'Slow Root Roast', color: '#b0603a', value: 150, stats: { lifeRegenPct: 0.6 }, desc: 'It keeps working long after the plate is clean.' },
  { id: 'meal_curry', name: 'Voidbloom Curry', color: '#9b6dde', value: 220, stats: { attackSpeedPct: 8, castSpeedPct: 8 }, desc: 'Time passes a little slower for you than for them.' },
  { id: 'meal_table', name: "Captain's Table", color: '#e0a640', value: 400, stats: { lifePct: 8, allRes: 8, physPct: 8, elemPct: 8 }, desc: 'A little of everything, served on the last good plate.' },
];

const MEAL_BY_ID: Record<string, MealDef> = Object.fromEntries(MEALS.map((m) => [m.id, m]));

export function mealDef(id: string): MealDef {
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
];

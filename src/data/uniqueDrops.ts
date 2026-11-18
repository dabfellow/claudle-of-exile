/**
 * Ordinary uniques share one world-drop pool. Their base requirement is also their
 * drop level, so a unique starts appearing when that base can naturally drop.
 * Trophy and achievement rewards deliberately stay outside this pool.
 */
import { ACHIEVEMENTS } from './achievements';
import { baseDef, UNIQUES, type UniqueDef } from './bases';
import { HARD_BOSSES, UBER_BOSSES, UNIQUE_MAPS } from './maps';

const EXCLUSIVE_UNIQUE_IDS = new Set([
  ...ACHIEVEMENTS.flatMap((achievement) => achievement.unique ? [achievement.unique] : []),
  ...HARD_BOSSES.map((boss) => boss.uniqueId),
  ...UBER_BOSSES.flatMap((boss) => boss.uniques),
  'old_covenant',
]);

export function uniqueDropLevel(unique: UniqueDef): number {
  return baseDef(unique.baseId).reqLevel;
}

export function isWorldDropUnique(unique: UniqueDef): boolean {
  return !unique.projectSource && !EXCLUSIVE_UNIQUE_IDS.has(unique.id);
}

/** Weighted drops: items have varying rarities in the world pool. */
export function worldDropUniques(itemLevel: number): (UniqueDef & { weight: number })[] {
  const all = UNIQUES.filter((unique) => isWorldDropUnique(unique) && uniqueDropLevel(unique) <= itemLevel);
  // Default weight 100, use defined weight if available
  return all.map(u => ({ ...u, weight: u.weight ?? 100 }));
}

/** The crafted destination cannot substitute for the older maps' trophy encounters. */
export function encounterWorldDropUniques(itemLevel: number, uniqueMapId?: string): (UniqueDef & { weight: number })[] {
  const pool = worldDropUniques(itemLevel);
  if (uniqueMapId !== 'umap_artisans_reliquary') return pool;
  const trophies = new Set(UNIQUE_MAPS.filter((m) => !m.craftedOnly).flatMap((m) => m.uniques));
  return pool.filter((u) => !trophies.has(u.id));
}

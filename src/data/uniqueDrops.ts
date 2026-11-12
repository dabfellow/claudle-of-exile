/**
 * Ordinary uniques share one world-drop pool. Their base requirement is also their
 * drop level, so a unique starts appearing when that base can naturally drop.
 * Trophy and achievement rewards deliberately stay outside this pool.
 */
import { ACHIEVEMENTS } from './achievements';
import { baseDef, UNIQUES, type UniqueDef } from './bases';
import { HARD_BOSSES, UBER_BOSSES } from './maps';

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
  return !EXCLUSIVE_UNIQUE_IDS.has(unique.id);
}

/** Equal weights: rarity changes the chance to roll a unique, not which eligible unique wins. */
export function worldDropUniques(itemLevel: number): UniqueDef[] {
  return UNIQUES.filter((unique) => isWorldDropUnique(unique) && uniqueDropLevel(unique) <= itemLevel);
}

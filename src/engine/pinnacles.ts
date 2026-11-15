import type { GameState } from './types';

/**
 * The three pinnacle chase uniques (docs/SKILLING_OVERHAUL_SPEC.md §6). Each has exactly one explicit effect.
 * Their rules live here so every caller reads the same item state.
 */
export const SECOND_HERESY = 'the_second_heresy';
export const WORLDHEART = 'worldheart';
export const SUM_OF_ALL = 'the_sum_of_all_things';
export const SUM_AFFIX = 'u_sum_of_all';
export const SUM_ROLL: [number, number] = [1, 200];

/** Worldheart: 30% less damage taken, applied once to an incoming hit or damage over time. */
export const WORLDHEART_TAKEN = 0.7;

/** The most Forbidden keystones any loadout can hold: the base one plus The Second Heresy's. */
export const MAX_FORBIDDEN_ALLOWANCE = 2;

export function wearsUnique(s: Pick<GameState, 'equipment'>, uniqueId: string): boolean {
  return Object.values(s.equipment ?? {}).some((item) => item?.uniqueId === uniqueId);
}

/** One Forbidden keystone, plus one while any copy of The Second Heresy is worn. Two copies still allow two. */
export function forbiddenAllowance(s: Pick<GameState, 'equipment'>): number {
  return 1 + (wearsUnique(s, SECOND_HERESY) ? 1 : 0);
}

/** The worn Sum of All Things' rolled integer (1–200), or 0. Only the amulet slot can hold it, so it counts once. */
export function sumOfAllRoll(s: Pick<GameState, 'equipment'>): number {
  const amulet = s.equipment?.amulet;
  if (amulet?.uniqueId !== SUM_OF_ALL) return 0;
  const value = [...amulet.prefixes, ...amulet.suffixes].find((m) => m.affixId === SUM_AFFIX)?.values[0] ?? 0;
  return Number.isFinite(value) ? Math.max(0, Math.min(SUM_ROLL[1], Math.round(value))) : 0;
}

/** The Sum of All Things' damage multiplier for the wearer's damage: 1 + roll/100. */
export function sumOfAllMultiplier(s: Pick<GameState, 'equipment'>): number {
  return 1 + sumOfAllRoll(s) / 100;
}

import type { GameState } from './types';
import { charLevelForXp, xpToReach } from './xp';

/** Character level (stored as the 'combat' xp track). */
export function characterLevel(s: GameState): number {
  return charLevelForXp(s.skills.combat);
}

/** Fraction of the xp toward the next level that a death costs. */
export const DEATH_XP_PENALTY = 0.05;

/** Lose part of the progress toward the next level, never dropping below the current level. */
export function applyDeathPenalty(s: GameState): number {
  const lvl = characterLevel(s);
  const floor = xpToReach('combat', lvl);
  const next = xpToReach('combat', lvl + 1);
  const loss = Math.min(s.skills.combat - floor, Math.round((next - floor) * DEATH_XP_PENALTY));
  s.skills.combat -= Math.max(0, loss);
  return Math.max(0, loss);
}

/**
 * Monster xp multiplier for fighting far below (or above) your level, like PoE:
 * a safe zone of 3 + level/16, then a steep falloff.
 */
export function xpLevelMultiplier(playerLevel: number, monsterLevel: number): number {
  const safe = 3 + Math.floor(playerLevel / 16);
  const excess = Math.max(0, Math.abs(playerLevel - monsterLevel) - safe);
  if (excess === 0) return 1;
  return Math.max(0.01, Math.pow(1 / (1 + 0.25 * excess * excess), 1.2));
}

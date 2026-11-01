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

/** Share of xp lost per level above an area's range. */
const OVERLEVEL_XP_PENALTY = [0.1, 0.2, 0.4, 0.5, 0.8];

/** Past the end of that list, each further level loses this much more, down to no xp at all. */
const OVERLEVEL_XP_RAMP = 0.01;

/** Share of xp gained per level below an area's range; the last entry is the most you can get. */
const UNDERLEVEL_XP_BONUS = [0.1, 0.2];

/**
 * Kill xp multiplier for your level against an area's range, like PoE. It's what stops a long offline
 * run outlevelling the campaign: past the top of the range, xp falls away toward nothing.
 */
export function areaXpMultiplier(playerLevel: number, [min, max]: [number, number]): number {
  if (playerLevel > max) {
    const over = playerLevel - max;
    const steps = OVERLEVEL_XP_PENALTY.length;
    const penalty = OVERLEVEL_XP_PENALTY[over - 1] ?? OVERLEVEL_XP_PENALTY[steps - 1] + (over - steps) * OVERLEVEL_XP_RAMP;
    return Math.max(0, 1 - penalty);
  }
  if (playerLevel < min) return 1 + UNDERLEVEL_XP_BONUS[Math.min(min - playerLevel, UNDERLEVEL_XP_BONUS.length) - 1];
  return 1;
}

/** The area multiplier as players read it; empty when xp is normal. */
export function areaXpLabel(playerLevel: number, range: [number, number]): string {
  const mult = areaXpMultiplier(playerLevel, range);
  if (mult === 1) return '';
  if (mult === 0) return 'No XP';
  const pct = Math.round((mult - 1) * 100);
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% XP`;
}

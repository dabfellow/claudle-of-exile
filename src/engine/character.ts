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

/** Two grace levels, then a quadratic curve from 10% at three to 70% at ten, rounded to whole percentages. */
export const OVERLEVEL_XP_PENALTY = [0, 0, ...Array.from({ length: 8 }, (_, i) => Math.round(10 + 60 * (i / 7) ** 2) / 100)];

/** Distance below the area's lower level; +5% at three, +20% at five, linear between and capped thereafter. */
export const UNDERLEVEL_XP_BONUS = [0, 0, 0.05, 0.125, 0.2];

/**
 * Kill XP multiplier against an area's range: a two-level grace band either side, then capped
 * bonuses for harder areas and penalties for easier ones. Shared by live and offline kills.
 */
export function areaXpMultiplier(playerLevel: number, [min, max]: [number, number]): number {
  if (playerLevel > max) {
    const over = playerLevel - max;
    return 1 - OVERLEVEL_XP_PENALTY[Math.min(over, OVERLEVEL_XP_PENALTY.length) - 1];
  }
  if (playerLevel < min) return 1 + UNDERLEVEL_XP_BONUS[Math.min(min - playerLevel, UNDERLEVEL_XP_BONUS.length) - 1];
  return 1;
}

/** The area multiplier as players read it; empty when xp is normal. */
export function areaXpLabel(playerLevel: number, range: [number, number]): string {
  const mult = areaXpMultiplier(playerLevel, range);
  if (mult === 1) return '';
  if (mult === 0) return 'No XP';
  const pct = +((mult - 1) * 100).toFixed(1);
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% XP`;
}

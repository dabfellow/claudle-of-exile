import type { SkillId } from './types';

/** A levelling curve: table[L] = total xp required to reach level L. */
interface Curve {
  max: number;
  table: number[];
}

function buildCurve(max: number, totalFor: (level: number) => number): Curve {
  const table = [0, 0];
  for (let l = 2; l <= max; l++) table.push(Math.floor(totalFor(l)));
  return { max, table };
}

/** Gathering/production skills: the RuneScape/Melvor curve to 99. */
const SKILL_CURVE: Curve = (() => {
  let points = 0;
  const totals = [0, 0];
  for (let l = 1; l < 99; l++) {
    points += Math.floor(l + 300 * Math.pow(2, l / 7));
    totals.push(Math.floor(points / 4));
  }
  return buildCurve(99, (l) => totals[l]);
})();

/**
 * Character level: cubic curve to 100. Tuned so Act 1 (~level 15) takes about a day
 * of active play and level 100 takes months.
 */
const CHAR_CURVE: Curve = buildCurve(100, (l) => 36 * Math.pow(l - 1, 3) + 100 * (l - 1));

function curveFor(skill: SkillId): Curve {
  return skill === 'combat' ? CHAR_CURVE : SKILL_CURVE;
}

function level(c: Curve, xp: number): number {
  let l = 1;
  while (l < c.max && xp >= c.table[l + 1]) l++;
  return l;
}

/** Level for an xp total on a skill's curve ('combat' is the character level). */
export function levelOf(skill: SkillId, xp: number): number {
  return level(curveFor(skill), xp);
}

/** Total xp needed to reach `lvl` on a skill's curve. */
export function xpToReach(skill: SkillId, lvl: number): number {
  const c = curveFor(skill);
  return c.table[Math.min(Math.max(lvl, 1), c.max)];
}

/** 0..1 progress towards the next level. */
export function progressOf(skill: SkillId, xp: number): number {
  const c = curveFor(skill);
  const l = level(c, xp);
  if (l >= c.max) return 1;
  return (xp - c.table[l]) / (c.table[l + 1] - c.table[l]);
}

export function maxLevelOf(skill: SkillId): number {
  return curveFor(skill).max;
}

// Gathering/production curve shorthands.
export const MAX_LEVEL = SKILL_CURVE.max;
export const xpForLevel = (lvl: number) => xpToReach('mining', lvl);
export const levelForXp = (xp: number) => levelOf('mining', xp);
export const levelProgress = (xp: number) => progressOf('mining', xp);

// Character level shorthands.
export const MAX_CHAR_LEVEL = CHAR_CURVE.max;
export const charXpForLevel = (lvl: number) => xpToReach('combat', lvl);
export const charLevelForXp = (xp: number) => levelOf('combat', xp);

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

/** Xp an hour at a character level: about 3,300 kills at that level's kill xp, as measured in the sim. */
const charXpPerHour = (l: number) => 2640 * (5 + 3 * l);

/** Hours of play from the previous stop to each level, up from level 20. */
const PREVIOUS_CHAR_PACE: [level: number, hours: number][] = [[40, 3], [65, 6], [80, 12], [95, 20], [99, 20]];

function buildCharCurve(pace: [level: number, hours: number][]): Curve {
  const totals = [0, 0];
  for (let l = 2; l <= 20; l++) totals.push(18 * Math.pow(l - 1, 3) + 50 * (l - 1));
  let from = 20;
  for (const [to, hours] of pace) {
    for (let l = from; l < to; l++) totals.push(totals[l] + (charXpPerHour(l) * hours) / (to - from));
    from = to;
  }
  totals.push(totals[99] * 2);
  return buildCurve(100, (l) => totals[l]);
}

const PREVIOUS_CHAR_CURVE = buildCharCurve(PREVIOUS_CHAR_PACE);

/**
 * Scale the whole previous curve evenly so every part of levelling slows down without changing its shape.
 * 99 remains halfway to 100 in xp (docs/DEVELOPMENT.md).
 */
const CHAR_CURVE: Curve = (() => {
  const table = PREVIOUS_CHAR_CURVE.table.map((xp) => Math.floor(xp * 3.4));
  table[100] = table[99] * 2;
  return { max: 100, table };
})();

/** The character curve before 0.2.13, for saves written on it. */
const OLD_CHAR_XP = (l: number) => 36 * Math.pow(l - 1, 3) + 100 * (l - 1);

function remapCharacterXp(xp: number, fromXp: (level: number) => number, to: Curve): number {
  let l = 1;
  while (l < 100 && xp >= fromXp(l + 1)) l++;
  if (l >= 100) return to.table[100];
  const part = (xp - fromXp(l)) / (fromXp(l + 1) - fromXp(l));
  return to.table[l] + part * (to.table[l + 1] - to.table[l]);
}

/** Xp from the pre-0.2.13 cubic curve, moved to the same level and progress on the current curve. */
export const charXpFromOldCurve = (xp: number): number => remapCharacterXp(xp, OLD_CHAR_XP, CHAR_CURVE);

/** The same old-curve conversion as migration 24 originally performed, before the late-game rebalance. */
export const charXpFromOldCurveV24 = (xp: number): number => remapCharacterXp(xp, OLD_CHAR_XP, PREVIOUS_CHAR_CURVE);

/** Preserve level and progress for characters saved on the previous character curve. */
export const charXpFromPreviousCurve = (xp: number): number => remapCharacterXp(xp, (l) => PREVIOUS_CHAR_CURVE.table[l], CHAR_CURVE);

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
export const xpForLevel = (lvl: number) => xpToReach('mining', lvl);
export const levelForXp = (xp: number) => levelOf('mining', xp);

// Character level shorthands.
export const charXpForLevel = (lvl: number) => xpToReach('combat', lvl);
export const charLevelForXp = (xp: number) => levelOf('combat', xp);

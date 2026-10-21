export const MAX_LEVEL = 99;

/** XP_TABLE[L] = total xp required to reach level L (RuneScape curve). */
const XP_TABLE: number[] = (() => {
  const t = [0, 0];
  let points = 0;
  for (let l = 1; l < MAX_LEVEL; l++) {
    points += Math.floor(l + 300 * Math.pow(2, l / 7));
    t.push(Math.floor(points / 4));
  }
  return t;
})();

export function xpForLevel(level: number): number {
  return XP_TABLE[Math.min(Math.max(level, 1), MAX_LEVEL)];
}

export function levelForXp(xp: number): number {
  let l = 1;
  while (l < MAX_LEVEL && xp >= XP_TABLE[l + 1]) l++;
  return l;
}

/** 0..1 progress towards the next level. */
export function levelProgress(xp: number): number {
  const l = levelForXp(xp);
  if (l >= MAX_LEVEL) return 1;
  return (xp - XP_TABLE[l]) / (XP_TABLE[l + 1] - XP_TABLE[l]);
}

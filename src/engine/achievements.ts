import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../data/achievements';
import { addBank } from './bank';
import { characterLevel } from './character';
import { createUnique } from './items';
import type { Ctx } from './context';
import type { GameState } from './types';

/** Complete any achievements whose goal has been reached, granting their rewards once. */
export function checkAchievements(s: GameState, ctx: Ctx): string[] {
  const done = new Set(s.achievements);
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (done.has(a.id) || a.progress(s) < a.target) continue;
    s.achievements.push(a.id);
    for (const [id, qty] of Object.entries(a.reward ?? {})) addBank(s, id, qty);
    if (a.unique) s.inventory.push(createUnique(s, a.unique, characterLevel(s))); // can go over the bag's size, but nothing is lost
    ctx.emit({ t: 'achievement', id: a.id });
    fresh.push(a.id);
  }
  return fresh;
}

export function hasAchievement(s: GameState, id: string): boolean {
  return s.achievements.includes(id);
}

export function achievementProgress(s: GameState, id: string): { value: number; target: number; done: boolean } {
  const a = ACHIEVEMENT_BY_ID[id];
  const done = hasAchievement(s, id);
  return { value: done ? a.target : Math.min(a.target, a.progress(s)), target: a.target, done };
}

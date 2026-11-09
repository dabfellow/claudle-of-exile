import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID, hasRealmPerk, perkTotals, type AchievementDef } from '../data/achievements';
import { ensureStashPages } from './account';
import { addBank } from './bank';
import { characterLevel } from './character';
import { createUnique } from './items';
import { makeCtx, type Ctx } from './context';
import { settlePassivePoints } from './passives';
import { seeded } from './rng';
import type { GameState } from './types';

/**
 * Add the realm rewards (Atlas points, stash tabs) of this character's achievements that the realm doesn't have yet.
 * The stash and Atlas are shared, so each such reward lands once, the first time any character in the realm earns it.
 * Safe to run any number of times. Returns the achievements whose realm reward was added.
 */
export function settleRealmRewards(s: GameState): AchievementDef[] {
  const a = s.account;
  const had = new Set(a.achievementRewards ?? []);
  const added = s.achievements.map((id) => ACHIEVEMENT_BY_ID[id]).filter((d) => d && hasRealmPerk(d) && !had.has(d.id));
  if (!added.length) return [];
  a.achievementRewards = [...had, ...added.map((d) => d.id)];
  ensureStashPages(a);
  return added;
}

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
  if (fresh.length) {
    for (const a of settleRealmRewards(s)) {
      const text = perkText(a.perks ?? {}).filter((t) => t.includes('realm')).join(', ');
      if (text) ctx.emit({ t: 'info', text: `${a.name}: ${text}`, tone: 'good' });
    }
    if (fresh.some((id) => ACHIEVEMENT_BY_ID[id].perks?.passivePoints)) settlePassivePoints(s);
  }
  return fresh;
}

/**
 * When a character loads: grant every achievement it already meets (new ones added since it last played), with
 * rewards, and add any realm reward its earlier achievements are owed. Quiet: the caller sums it up in one message.
 */
export function settleAchievements(s: GameState): string[] {
  const fresh = checkAchievements(s, makeCtx(seeded(1)));
  settleRealmRewards(s);
  settlePassivePoints(s);
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

/** A perk set in words, one line each: realm rewards say so. */
export function perkText(p: NonNullable<AchievementDef['perks']>): string[] {
  const n = (v: number, one: string, many = `${one}s`) => `+${v} ${v === 1 ? one : many}`;
  return [
    ...(p.passivePoints ? [n(p.passivePoints, 'Passive point')] : []),
    ...(p.offlineHours ? [n(p.offlineHours, 'offline hour')] : []),
    ...(p.atlasPoints ? [`${n(p.atlasPoints, 'Atlas point')} for the realm`] : []),
    ...(p.stashTabs ? [`${n(p.stashTabs, 'stash tab')} for the realm`] : []),
  ];
}

/** Everything this character's achievements add up to, for the Achievements page. */
export function earnedPerks(s: GameState) {
  return perkTotals(s.achievements);
}

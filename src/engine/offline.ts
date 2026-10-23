import type { Ctx } from './context';
import { tick } from './state';
import { withTutorial } from './tutorial';
import type { GameEvent, GameState, SkillId } from './types';

export const MAX_OFFLINE_MS = 12 * 60 * 60 * 1000;
export const MIN_OFFLINE_MS = 60 * 1000;

export interface OfflineSummary {
  ms: number;
  xp: Partial<Record<SkillId, number>>;
  levels: Partial<Record<SkillId, number>>;
  materials: Record<string, number>;
  items: number;
  gems: number;
  kills: number;
  died: boolean;
  stoppedReason: string | null;
}

/** Run the simulation for time spent away, collecting a summary instead of live events. */
export function simulateOffline(s: GameState, ctx: Ctx, elapsedMs: number): OfflineSummary {
  const ms = Math.min(elapsedMs, MAX_OFFLINE_MS);
  const sum: OfflineSummary = { ms, xp: {}, levels: {}, materials: {}, items: 0, gems: 0, kills: 0, died: false, stoppedReason: null };
  const bankBefore = { ...s.bank };
  const quiet: Ctx = withTutorial({
    ...ctx,
    offline: true,
    emit(e: GameEvent) {
      if (e.t === 'xp') sum.xp[e.skill] = (sum.xp[e.skill] ?? 0) + e.amount;
      else if (e.t === 'levelup') sum.levels[e.skill] = e.level;
      else if (e.t === 'loot' && e.item && !e.salvaged) sum.items++;
      else if (e.t === 'loot' && (e.gemId || e.supportId)) sum.gems++;
      else if (e.t === 'kill') sum.kills++;
      else if (e.t === 'death') sum.died = true;
      else if (e.t === 'info' && e.tone === 'warn') sum.stoppedReason = e.text;
    },
  }, () => s);
  let left = ms;
  while (left > 0 && s.action) {
    const chunk = Math.min(1000, left);
    tick(s, quiet, chunk);
    left -= chunk;
  }
  // the rest of the time just lets the clock (vendor timer, regen) advance
  if (left > 0) tick(s, quiet, Math.min(left, 60_000));
  s.clock += Math.max(0, left - 60_000);
  for (const [id, n] of Object.entries(s.bank)) {
    const delta = n - (bankBefore[id] ?? 0);
    if (delta !== 0) sum.materials[id] = delta;
  }
  return sum;
}

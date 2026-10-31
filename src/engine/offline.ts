import { offlineCapMs } from './automation';
import { clearBossFight } from './combat';
import type { Ctx } from './context';
import { tick } from './state';
import { withTutorial } from './tutorial';
import type { GameEvent, GameState, SkillId } from './types';

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
  /** how far into the time away you died; combat stayed stopped from then on */
  diedAfterMs: number | null;
  stoppedReason: string | null;
  /** a boss was ready, but bosses can't be fought offline without wind-up rules */
  bossWaiting: string | null;
  /** Craft until… finished while you were away */
  crafted: string | null;
}

/** Run the simulation for time spent away, collecting a summary instead of live events. */
export function simulateOffline(s: GameState, ctx: Ctx, elapsedMs: number): OfflineSummary {
  const ms = Math.min(elapsedMs, offlineCapMs(s));
  const sum: OfflineSummary = { ms, xp: {}, levels: {}, materials: {}, items: 0, gems: 0, kills: 0, died: false, diedAfterMs: null, stoppedReason: null, bossWaiting: null, crafted: null };
  const bankBefore = { ...s.bank };
  let left = ms;
  const quiet: Ctx = withTutorial({
    ...ctx,
    offline: true,
    emit(e: GameEvent) {
      if (e.t === 'xp') sum.xp[e.skill] = (sum.xp[e.skill] ?? 0) + e.amount;
      else if (e.t === 'levelup') sum.levels[e.skill] = e.level;
      else if (e.t === 'loot' && e.item && !e.salvaged) sum.items++;
      else if (e.t === 'loot' && (e.gemId || e.supportId)) sum.gems++;
      else if (e.t === 'kill') sum.kills++;
      else if (e.t === 'death') {
        sum.died = true;
        sum.diedAfterMs = ms - left;
      }
      else if (e.t === 'bossWaiting') sum.bossWaiting = e.name;
      else if (e.t === 'craftDone') sum.crafted = e.text;
      else if (e.t === 'info' && e.tone === 'warn') sum.stoppedReason = e.text;
    },
  }, () => s);
  clearBossFight(s);
  // a greenhouse keeps growing after combat stops or a job runs out
  while (left > 0 && (s.action || s.greenhouse)) {
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

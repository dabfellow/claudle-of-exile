import { offlineCapMs } from './automation';
import { activeEvents, eventBoost } from '../data/events';
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
  /** map runs finished while you were away, and maps found on them */
  mapRuns: number;
  mapsFound: number;
  /** maps Cartography drew while you were away */
  mapsDrawn: number;
  /** Heist jobs finished while you were away, and how many of them tripped an alarm */
  heists: number;
  heistAlarms: number;
  /** Logbook finds made while you were away, and standing orders filled */
  finds: number;
  traded: number;
}

/** Run the simulation for time spent away, collecting a summary instead of live events. */
export function simulateOffline(s: GameState, ctx: Ctx, elapsedMs: number): OfflineSummary {
  const ms = Math.min(elapsedMs, offlineCapMs(s));
  const sum: OfflineSummary = { ms, xp: {}, levels: {}, materials: {}, items: 0, gems: 0, kills: 0, died: false, diedAfterMs: null, stoppedReason: null, bossWaiting: null, crafted: null, mapRuns: 0, mapsFound: 0, mapsDrawn: 0, heists: 0, heistAlarms: 0, finds: 0, traded: 0 };
  const mapsBefore = { ...s.maps.tally };
  const drawnBefore = s.lifetime.mapsDrawn;
  const heistsBefore = { ...s.heist.tally };
  const expeditionBefore = { ...s.expedition.tally };
  const bankBefore = { ...s.account.bank };
  let left = ms;
  const quietCtx: Ctx = {
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
  };
  const quiet: Ctx = withTutorial(quietCtx, () => s);
  const boundaries = (ctx.eventRows ?? []).flatMap((row) => [row.starts_at, row.ends_at])
    .filter((value): value is string => !!value).map(Date.parse).filter(Number.isFinite).sort((a, b) => a - b);
  let eventUntil = -Infinity;
  const nextChunk = (limit: number) => {
    const now = ctx.now - left;
    quietCtx.now = now;
    if (ctx.eventRows && now >= eventUntil) {
      quietCtx.event = eventBoost(activeEvents(ctx.eventRows, now));
      eventUntil = boundaries.find((at) => at > now) ?? Infinity;
    }
    return Math.min(limit, left, eventUntil > now ? eventUntil - now : Infinity);
  };
  clearBossFight(s);
  // a press from before you left doesn't get to spend Life past what rules would
  if (s.combat) s.combat.queued = null;
  // a greenhouse keeps growing after combat stops or a job runs out
  while (left > 0 && (s.action || s.greenhouse)) {
    const chunk = nextChunk(1000);
    tick(s, quiet, chunk);
    left -= chunk;
  }
  // the rest of the time just lets the clock (vendor timer, regen) advance
  let idle = Math.min(left, 60_000);
  while (idle > 0) {
    const chunk = nextChunk(idle);
    tick(s, quiet, chunk);
    idle -= chunk; left -= chunk;
  }
  s.clock += left;
  sum.mapRuns = s.maps.tally.runs - mapsBefore.runs;
  sum.mapsFound = s.maps.tally.mapsFound - mapsBefore.mapsFound;
  sum.mapsDrawn = s.lifetime.mapsDrawn - drawnBefore;
  sum.heists = s.heist.tally.jobs - heistsBefore.jobs;
  sum.heistAlarms = s.heist.tally.alarms - heistsBefore.alarms;
  sum.finds = s.expedition.tally.finds - expeditionBefore.finds;
  sum.traded = s.expedition.tally.traded - expeditionBefore.traded;
  for (const [id, n] of Object.entries(s.account.bank)) {
    const delta = n - (bankBefore[id] ?? 0);
    if (delta !== 0) sum.materials[id] = delta;
  }
  return sum;
}

import { offlineCapMs } from './automation';
import { activeEvents, eventBoost, eventChangeTimes } from '../data/events';
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
  /** Nominal non-combat practice earned by mastery band while away. */
  mastery: Record<string, number>;
  /** Logbook finds made while you were away, and standing orders filled */
  finds: number;
  traded: number;
}

/** Run the simulation for time spent away, collecting a summary instead of live events. */
export function simulateOffline(s: GameState, ctx: Ctx, elapsedMs: number): OfflineSummary {
  const run = startOffline(s, ctx, elapsedMs);
  while (!run.step(Infinity));
  return run.summary;
}

/**
 * A catch-up that can be run a slice at a time, so a long absence doesn't freeze the page.
 * It makes exactly the same ticks in the same order as one long run, however it's sliced.
 */
export interface OfflineRun {
  /** game time being caught up, after the offline cap */
  readonly ms: number;
  /** how much of it is done, 0 to 1 */
  readonly progress: number;
  readonly done: boolean;
  /** Simulate for up to `budgetMs` of real time; true once it's finished. */
  step(budgetMs: number): boolean;
  /** the result; complete once step() has returned true */
  readonly summary: OfflineSummary;
}

/** Fold a later catch-up into one still on screen, so a short second absence doesn't replace the long first one. */
export function mergeOffline(into: OfflineSummary, more: OfflineSummary): OfflineSummary {
  const add = <K extends string>(a: Partial<Record<K, number>>, b: Partial<Record<K, number>>) => {
    const out = { ...a };
    for (const [k, n] of Object.entries(b) as [K, number][]) out[k] = (out[k] ?? 0) + n;
    return out;
  };
  return {
    ms: into.ms + more.ms,
    xp: add(into.xp, more.xp),
    levels: { ...into.levels, ...more.levels },
    materials: add(into.materials, more.materials) as Record<string, number>,
    items: into.items + more.items,
    gems: into.gems + more.gems,
    kills: into.kills + more.kills,
    died: into.died || more.died,
    diedAfterMs: into.died ? into.diedAfterMs : more.died ? into.ms + (more.diedAfterMs ?? 0) : null,
    stoppedReason: more.stoppedReason ?? into.stoppedReason,
    bossWaiting: more.bossWaiting ?? into.bossWaiting,
    crafted: more.crafted ?? into.crafted,
    mapRuns: into.mapRuns + more.mapRuns,
    mapsFound: into.mapsFound + more.mapsFound,
    mapsDrawn: into.mapsDrawn + more.mapsDrawn,
    heists: into.heists + more.heists,
    heistAlarms: into.heistAlarms + more.heistAlarms,
    mastery: add(into.mastery, more.mastery) as Record<string, number>,
    finds: into.finds + more.finds,
    traded: into.traded + more.traded,
  };
}

/** how many ticks run between looks at the clock while slicing */
const CLOCK_CHECK_EVERY = 8;

export function startOffline(s: GameState, ctx: Ctx, elapsedMs: number): OfflineRun {
  const ms = Math.min(elapsedMs, offlineCapMs(s));
  const sum: OfflineSummary = { ms, xp: {}, levels: {}, materials: {}, items: 0, gems: 0, kills: 0, died: false, diedAfterMs: null, stoppedReason: null, bossWaiting: null, crafted: null, mapRuns: 0, mapsFound: 0, mapsDrawn: 0, heists: 0, heistAlarms: 0, mastery: {}, finds: 0, traded: 0 };
  const mapsBefore = { ...s.maps.tally };
  const drawnBefore = s.lifetime.mapsDrawn;
  const heistsBefore = { ...s.heist.tally };
  const masteryBefore = { ...s.skillingMastery };
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
  // taken now, so a slice that runs later still sees the clock and events as they were when you came back
  const backAt = ctx.now;
  const eventRows = ctx.eventRows;
  // holidays and weekend events start and stop on their own, so the slices are cut there too
  const boundaries = eventRows ? eventChangeTimes(eventRows, backAt - ms, backAt) : [];
  let eventUntil = -Infinity;
  const nextChunk = (limit: number) => {
    const now = backAt - left;
    quietCtx.now = now;
    if (eventRows && now >= eventUntil) {
      quietCtx.event = eventBoost(activeEvents(eventRows, now));
      eventUntil = boundaries.find((at) => at > now) ?? Infinity;
    }
    return Math.min(limit, left, eventUntil > now ? eventUntil - now : Infinity);
  };
  clearBossFight(s);
  // a press from before you left doesn't get to spend Life past what rules would
  if (s.combat) s.combat.queued = null;

  // 'active': a job, a fight or a greenhouse runs; 'idle': up to a minute more for the clock (vendor timer, regen)
  let phase: 'active' | 'idle' | 'done' = 'active';
  let idle = 0;
  /** One tick of the catch-up; false when there's nothing left to tick. */
  const tickOnce = (): boolean => {
    if (phase === 'active') {
      // a greenhouse keeps growing after combat stops or a job runs out
      if (left > 0 && (s.action || s.greenhouse)) {
        const chunk = nextChunk(1000);
        tick(s, quiet, chunk);
        left -= chunk;
        return true;
      }
      phase = 'idle';
      idle = Math.min(left, 60_000);
    }
    if (phase === 'idle') {
      if (idle > 0) {
        const chunk = nextChunk(idle);
        tick(s, quiet, chunk);
        idle -= chunk;
        left -= chunk;
        return true;
      }
      finish();
    }
    return false;
  };

  const finish = () => {
    phase = 'done';
    s.clock += left;
    sum.mapRuns = s.maps.tally.runs - mapsBefore.runs;
    sum.mapsFound = s.maps.tally.mapsFound - mapsBefore.mapsFound;
    sum.mapsDrawn = s.lifetime.mapsDrawn - drawnBefore;
    sum.heists = s.heist.tally.jobs - heistsBefore.jobs;
    sum.heistAlarms = s.heist.tally.alarms - heistsBefore.alarms;
    for (const [id, practice] of Object.entries(s.skillingMastery)) {
      const gained = practice - (masteryBefore[id] ?? 0);
      if (gained > 0) sum.mastery[id] = gained;
    }
    sum.finds = s.expedition.tally.finds - expeditionBefore.finds;
    sum.traded = s.expedition.tally.traded - expeditionBefore.traded;
    for (const [id, n] of Object.entries(s.account.bank)) {
      const delta = n - (bankBefore[id] ?? 0);
      if (delta !== 0) sum.materials[id] = delta;
    }
  };

  return {
    ms,
    get progress() {
      return phase === 'done' || ms <= 0 ? 1 : Math.min(1, (ms - left) / ms);
    },
    get done() {
      return phase === 'done';
    },
    step(budgetMs: number): boolean {
      if (phase === 'done') return true;
      if (budgetMs === Infinity) {
        while (tickOnce());
        return true;
      }
      const until = performance.now() + budgetMs;
      for (let n = 1; tickOnce(); n++) {
        if (n % CLOCK_CHECK_EVERY === 0 && performance.now() >= until) return false;
      }
      return true;
    },
    summary: sum,
  };
}

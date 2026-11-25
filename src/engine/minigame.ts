import { actionDef } from '../data/skills';
import type { Ctx } from './context';
import { totalMasteryLevels } from './skillingMastery';
import type { GameState, SkillId } from './types';

/**
 * Skilling mini-games: playing fills Focus, which speeds up the running action on top of the
 * normal idle rate. It can only ever add speed, and it never runs offline.
 */
export const MAX_FOCUS_SPEED = 0.45;
/** Focus past full: adds no speed, but buys this much drain time before speed starts to fall (5 s for most skills). */
const FOCUS_OVERFLOW = 0.5;
const FOCUS_HIT = 0.25;
const FOCUS_WEAK = 0.05;
const FOCUS_MISS = 0.1;
const FOCUS_DRAIN_PER_SEC = 0.1;
/** Thieving holds Focus much longer (~28.6 s at peak, ~57 s total) so waiting out glances feels rewarding. */
export const THIEVING_FOCUS_OVERFLOW = 1.0;
export const THIEVING_FOCUS_DRAIN_PER_SEC = 0.035;

export function focusOverflowCap(skill?: SkillId | null): number {
  return skill === 'thieving' ? THIEVING_FOCUS_OVERFLOW : FOCUS_OVERFLOW;
}

export function focusDrainPerSec(skill?: SkillId | null): number {
  return skill === 'thieving' ? THIEVING_FOCUS_DRAIN_PER_SEC : FOCUS_DRAIN_PER_SEC;
}

/** Mining: an early release under this much charge does nothing; the sweet spot is this wide. */
export const CHARGE_MIN = 0.5;
export const CHARGE_ZONE_WIDTH = 0.12;

/**
 * The double zone: a small gold zone inside each game's bright one. Landing in it gives twice a
 * clean hit's Focus. (It used to double the next finish; an old waiting flag is still paid out once.)
 */
export const DOUBLE_SHARE = 1 / 3;

/** Smithing: how far off the beat a strike can land and still count. */
const STRIKE_DOUBLE_MS = 45;
const STRIKE_HIT_MS = 120;
const STRIKE_WEAK_MS = 260;

/** Cartography: the survey grid, and how many soundings you get to find the landmark. */
export const SURVEY_COLS = 7;
export const SURVEY_ROWS = 4;
export const SURVEY_SOUNDINGS = 5;
/** Finding it in this many soundings or fewer is a double. */
export const SURVEY_DOUBLE = 3;

/**
 * Astrology: how far the focus ring can sit from the hidden sharpest point (0–1) and still count.
 * Up to the hit limit is a hit, and its middle third (a third of the band either side of the target) is the double.
 */
export const FOCUS_DOUBLE_OFFSET = 0.03;
export const FOCUS_HIT_OFFSET = 0.09;
export const FOCUS_WEAK_OFFSET = 0.15;

/** Archaeology: a soil grid over a find. Brushing a fragile crack chips the find. */
export const BRUSH_COLS = 4;
export const BRUSH_ROWS = 3;
export const BRUSH_FIND_MIN = 3;
export const BRUSH_FIND_MAX = 4;
export const BRUSH_CRACKS_MIN = 2;
export const BRUSH_CRACKS_MAX = 3;

/** How a brushed find came out, by the cracks chipped: clean is a double, one chip a hit, two weak, three or more a miss. */
export function brushResult(chips: number): SwingResult {
  return chips <= 0 ? 'double' : chips === 1 ? 'hit' : chips === 2 ? 'weak' : 'miss';
}

export interface BrushPatch {
  /** squares the find covers */
  find: number[];
  /** fragile cracks, on squares next to the find */
  cracks: number[];
}

/**
 * A new patch: the find is a connected blob of 3–4 squares, and the cracks are on squares touching it.
 * `crackCut` is how many cracks the codex takes off; there is always at least one.
 */
export function brushPatch(rng: { next(): number }, crackCut = 0): BrushPatch {
  const tiles = BRUSH_COLS * BRUSH_ROWS;
  const touching = (t: number, diagonal: boolean): number[] => {
    const x = t % BRUSH_COLS;
    const y = Math.floor(t / BRUSH_COLS);
    const out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (!diagonal && dx && dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < BRUSH_COLS && ny >= 0 && ny < BRUSH_ROWS) out.push(ny * BRUSH_COLS + nx);
      }
    }
    return out;
  };
  const size = BRUSH_FIND_MIN + Math.floor(rng.next() * (BRUSH_FIND_MAX - BRUSH_FIND_MIN + 1));
  const find = [Math.floor(rng.next() * tiles)];
  while (find.length < size) {
    const edge = [...new Set(find.flatMap((t) => touching(t, false)))].filter((t) => !find.includes(t));
    find.push(edge[Math.floor(rng.next() * edge.length)]);
  }
  const near = [...new Set(find.flatMap((t) => touching(t, true)))].filter((t) => !find.includes(t));
  const want = Math.max(1, BRUSH_CRACKS_MIN + Math.floor(rng.next() * (BRUSH_CRACKS_MAX - BRUSH_CRACKS_MIN + 1)) - crackCut);
  const cracks: number[] = [];
  while (cracks.length < Math.min(want, near.length)) {
    const t = near.splice(Math.floor(rng.next() * near.length), 1)[0];
    cracks.push(t);
  }
  return { find: find.sort((a, b) => a - b), cracks: cracks.sort((a, b) => a - b) };
}

/** Chips so far: the cracks that have been brushed. */
export function brushChips(patch: BrushPatch, brushed: ReadonlySet<number>): number {
  return patch.cracks.filter((t) => brushed.has(t)).length;
}

/** The attempt ends when every square over the find is brushed. */
export function brushDone(patch: BrushPatch, brushed: ReadonlySet<number>): boolean {
  return patch.find.every((t) => brushed.has(t));
}

const MANUAL_SKILLS: SkillId[] = ['mining', 'woodcutting', 'harvesting', 'thieving', 'agility', 'archaeology', 'smelting', 'smithing', 'woodcrafting', 'tailoring', 'sawmilling', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'cartography', 'astrology'];

export type SwingResult = 'double' | 'hit' | 'weak' | 'miss';

export function angleResult(errorDeg: number): SwingResult {
  if (!Number.isFinite(errorDeg)) return 'miss';
  const error = Math.abs(((errorDeg + 180) % 360 + 360) % 360 - 180);
  return error <= 3 ? 'double' : error <= 9 ? 'hit' : error <= 18 ? 'weak' : 'miss';
}

export function gemTurnMs(level: number): number {
  return 2400 - 800 * (Math.max(1, Math.min(99, level)) - 1) / 98;
}

export function fertiliseWindowMs(speciesIndex: number): number {
  return Math.max(900, 1600 - 100 * Math.max(0, speciesIndex));
}

export function fertiliseResult(tapMs: number | null, windowMs: number, wrongPlant: boolean): SwingResult {
  if (wrongPlant || tapMs === null || !Number.isFinite(tapMs) || tapMs < 0) return 'miss';
  if (tapMs <= windowMs * 0.3) return 'double';
  if (tapMs <= windowMs) return 'hit';
  return tapMs <= windowMs + 300 ? 'weak' : 'miss';
}

export function pourResult(error: number, spilled: boolean): SwingResult {
  if (spilled || !Number.isFinite(error)) return 'miss';
  const e = Math.abs(error);
  return e <= 0.02 ? 'double' : e <= 0.06 ? 'hit' : e <= 0.12 ? 'weak' : 'miss';
}

export function sightingResult(errX: number, errY: number): SwingResult {
  if (!Number.isFinite(errX) || !Number.isFinite(errY)) return 'miss';
  const e = Math.max(Math.abs(errX), Math.abs(errY));
  return e <= 0.06 ? 'double' : e <= 0.14 ? 'hit' : e <= 0.24 ? 'weak' : 'miss';
}

export function curveResult(avgDeviation: number, completed: boolean): SwingResult {
  if (!completed || !Number.isFinite(avgDeviation)) return 'miss';
  if (avgDeviation <= 0.03) return 'double';
  if (avgDeviation <= 0.09) return 'hit';
  return avgDeviation <= 0.15 ? 'weak' : 'miss';
}

export function braceResult(correct: boolean, answeredMs: number, timerMs: number): SwingResult {
  if (!correct || answeredMs < 0 || answeredMs > timerMs + 1000) return 'miss';
  if (answeredMs <= timerMs / 3) return 'double';
  return answeredMs <= timerMs ? 'hit' : 'weak';
}

export function bellowsResult(goldShare: number, bandShare: number): SwingResult {
  if (goldShare >= 0.5) return 'double';
  if (bandShare >= 0.6) return 'hit';
  return bandShare >= 0.3 ? 'weak' : 'miss';
}

export function hasMinigame(skill: SkillId): boolean {
  return MANUAL_SKILLS.includes(skill);
}

/** Where the double zone starts inside a zone `width` wide that starts at `zone`: the middle third. */
export function doubleZoneStart(zone: number, width: number): number {
  return zone + (width * (1 - DOUBLE_SHARE)) / 2;
}

/** Is `at` inside the double zone of a zone `width` wide starting at `zone`? */
export function inDoubleZone(at: number, zone: number, width: number): boolean {
  const start = doubleZoneStart(zone, width);
  return at >= start && at <= start + width * DOUBLE_SHARE;
}

/** How a released swing landed, or null when it was let go too early to count. */
export function chargeResult(charge: number, zone: number): SwingResult | null {
  if (charge >= zone + CHARGE_ZONE_WIDTH) return 'miss';
  if (charge >= zone) return inDoubleZone(charge, zone, CHARGE_ZONE_WIDTH) ? 'double' : 'hit';
  return charge >= CHARGE_MIN ? 'weak' : null;
}

/** How a strike landed against the beat. */
export function strikeResult(offMs: number): SwingResult {
  const off = Math.abs(offMs);
  return off <= STRIKE_DOUBLE_MS ? 'double' : off <= STRIKE_HIT_MS ? 'hit' : off <= STRIKE_WEAK_MS ? 'weak' : 'miss';
}

/** The lift (Thieving marks): window the target's back is turned, shrinking with mark level. */
export const LIFT_WINDOW_BASE_MS = 1400;
export const LIFT_WINDOW_STEP_MS = 50;
export const LIFT_WINDOW_MIN_MS = 800;
/** A tap this long after the window ends, as they turn back, is weak. */
export const LIFT_WEAK_GRACE_MS = 250;
/** Each attention cycle runs a random length in this range. */
export const LIFT_CYCLE_MIN_MS = 2500;
export const LIFT_CYCLE_MAX_MS = 4000;

/** How long the back is turned for a mark of this level. */
export function liftWindowMs(markLevel: number): number {
  return Math.max(LIFT_WINDOW_MIN_MS, LIFT_WINDOW_BASE_MS - LIFT_WINDOW_STEP_MS * Math.floor(markLevel / 10));
}

/** How a lift landed against the window the target's back was turned. */
export function liftResult(tapMs: number, windowStartMs: number, windowEndMs: number): SwingResult {
  if (tapMs < windowStartMs) return 'miss';
  if (tapMs <= windowEndMs) {
    const len = windowEndMs - windowStartMs;
    const third = len * DOUBLE_SHARE;
    const dStart = windowStartMs + (len - third) / 2;
    return tapMs >= dStart && tapMs <= dStart + third ? 'double' : 'hit';
  }
  return tapMs <= windowEndMs + LIFT_WEAK_GRACE_MS ? 'weak' : 'miss';
}

/** Street marks spam-click thresholds per attention-away window. */
export const LIFT_CLICKS_HIT = 4;
export const LIFT_CLICKS_DOUBLE = 8;

/** Score a street-mark spam-click window: getting caught misses; 2–3 weak, 4–7 hit, 8+ double. */
export function liftSpamResult(clicks: number, caught: boolean): SwingResult | null {
  if (caught) return 'miss';
  if (clicks >= LIFT_CLICKS_DOUBLE) return 'double';
  if (clicks >= LIFT_CLICKS_HIT) return 'hit';
  if (clicks >= 2) return 'weak';
  return null;
}

/** How a locked telescope focus landed: `offset` is how far the ring sits from the sharpest point. */
export function focusResult(offset: number): SwingResult {
  const off = Math.abs(offset);
  return off <= FOCUS_DOUBLE_OFFSET ? 'double' : off <= FOCUS_HIT_OFFSET ? 'hit' : off <= FOCUS_WEAK_OFFSET ? 'weak' : 'miss';
}

/**
 * Woodcutting, split the log: how far off the middle the two halves are, in percentage points of the log's mass.
 * This game's own bands replace the middle-third double rule (owner's call, docs/WOODCUTTING_GIANTS.md).
 */
export const SPLIT_DOUBLE_OFF = 3;
export const SPLIT_HIT_OFF = 7;
export const SPLIT_WEAK_OFF = 15;
/** Samples along a log's length in its mass profile. */
export const LOG_SAMPLES = 60;

/** `leftShare` is the left half's share of the log's mass, 0 to 100. */
export function splitResult(leftShare: number): SwingResult {
  const off = Math.abs(leftShare - 50);
  return off <= SPLIT_DOUBLE_OFF ? 'double' : off <= SPLIT_HIT_OFF ? 'hit' : off <= SPLIT_WEAK_OFF ? 'weak' : 'miss';
}

export type LogKind = 'trunk' | 'limb' | 'heart';

/**
 * A log's mass along its length, as `LOG_SAMPLES` thicknesses. A trunk round is plain with a slight taper, a limb log
 * has one branch knob, a heart log two irregular knobs; `extraKnobs` (Twisted grain) adds more. `rand` is any 0-1 source.
 */
export function logProfile(kind: LogKind, rand: () => number, extraKnobs = 0): number[] {
  const base = 10;
  const taper = (rand() - 0.5) * 3;
  const profile = Array.from({ length: LOG_SAMPLES }, (_, i) => base + taper * (i / (LOG_SAMPLES - 1) - 0.5));
  const knobs = (kind === 'limb' ? 1 : kind === 'heart' ? 2 : 0) + extraKnobs;
  for (let k = 0; k < knobs; k++) {
    const at = 4 + rand() * (LOG_SAMPLES - 8);
    const width = 2.5 + rand() * 3.5;
    const height = (kind === 'heart' ? 4 : 5) + rand() * 7;
    for (let i = 0; i < LOG_SAMPLES; i++) profile[i] += height * Math.exp(-((i - at) ** 2) / (2 * width * width));
  }
  return profile;
}

/**
 * A log picture's mass along its length: for each pixel column, how much of it is solid (alpha, 0 to 255, row-major
 * RGBA as from `getImageData`). Branches and bumps count where they stick out, so the split is judged on what you see.
 */
export function columnProfile(rgba: ArrayLike<number>, width: number, height: number): number[] {
  const out = new Array<number>(width).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) out[x] += rgba[(y * width + x) * 4 + 3] / 255;
  }
  return out;
}

/** The part of a log profile you see: mirrored if the picture is flipped, with a share trimmed off each end. */
export function logWindow(profile: number[], flip: boolean, trimLeft: number, trimRight: number): number[] {
  const p = flip ? [...profile].reverse() : profile;
  const from = Math.round(p.length * trimLeft);
  const to = Math.round(p.length * (1 - trimRight));
  return p.slice(from, Math.max(from + 1, to));
}

/** The left share of a log's mass, 0 to 100, when it is cut `at` of the way along it (0 to 1). */
export function massShare(profile: number[], at: number): number {
  const total = profile.reduce((a, b) => a + b, 0);
  if (total <= 0) return 50;
  const cut = Math.min(1, Math.max(0, at)) * profile.length;
  const whole = Math.floor(cut);
  let left = 0;
  for (let i = 0; i < whole && i < profile.length; i++) left += profile[i];
  if (whole < profile.length) left += profile[whole] * (cut - whole);
  return (left / total) * 100;
}

/** The point along the log, 0 to 1, where the two halves weigh the same. */
export function balancePoint(profile: number[]): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (massShare(profile, mid) < 50) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Steps between two tiles of the survey grid: what a sounding shows. */
export function surveyDistance(a: number, b: number): number {
  return Math.abs((a % SURVEY_COLS) - (b % SURVEY_COLS)) + Math.abs(Math.floor(a / SURVEY_COLS) - Math.floor(b / SURVEY_COLS));
}

/** How a survey ended after `taken` soundings, or null while it's still going. A quick find is a double; the last sounding is only a weak find. */
export function surveyResult(found: boolean, taken: number): SwingResult | null {
  if (found) return taken <= SURVEY_DOUBLE ? 'double' : taken < SURVEY_SOUNDINGS ? 'hit' : 'weak';
  return taken >= SURVEY_SOUNDINGS ? 'miss' : null;
}

/** The action a mini-game can feed right now, or null. A Heist job is Thieving. */
function manualAction(s: GameState) {
  const a = s.action;
  if (a?.kind === 'heist') return a;
  return a?.kind === 'skill' && hasMinigame(actionDef(a.actionId).skill) ? a : null;
}

export function currentMinigameSkill(s: GameState): SkillId | null {
  const a = s.action;
  if (a?.kind === 'heist') return 'thieving';
  if (a?.kind === 'skill') {
    const sk = actionDef(a.actionId).skill;
    if (hasMinigame(sk)) return sk;
  }
  return null;
}

export function focusOf(s: GameState): number {
  return Math.min(1, manualAction(s)?.focus ?? 0);
}

/** How full the overflow bar is, 0–1. */
export function overflowOf(s: GameState): number {
  const cap = focusOverflowCap(currentMinigameSkill(s));
  return Math.max(0, (manualAction(s)?.focus ?? 0) - 1) / cap;
}

/** Seconds of full-speed Focus overflow remaining. */
export function focusHoldSeconds(s: GameState, skill?: SkillId | null): number {
  const rate = focusDrainPerSec(skill ?? currentMinigameSkill(s));
  return Math.max(0, (manualAction(s)?.focus ?? 0) - 1) / rate;
}

/** Total seconds until Focus drains back to idle. */
export function focusRemainingSeconds(s: GameState, skill?: SkillId | null): number {
  const rate = focusDrainPerSec(skill ?? currentMinigameSkill(s));
  return (manualAction(s)?.focus ?? 0) / rate;
}

/**
 * Maximum focus speed bonus for the given skill (or current running manual action).
 * Base is 45% (0.45); each mastery level earned across all things in that skill adds +0.01% (+0.0001).
 */
export function maxFocusSpeed(s: GameState, skill?: SkillId | null): number {
  const targetSkill = skill ?? currentMinigameSkill(s);
  const masteryBonus = targetSkill ? totalMasteryLevels(s, targetSkill) * 0.0001 : 0;
  return MAX_FOCUS_SPEED + masteryBonus;
}

/** Multiplies skilling progress: 1 with no Focus, never lower. */
export function focusMult(s: GameState, skill?: SkillId | null): number {
  return 1 + focusOf(s) * maxFocusSpeed(s, skill);
}

export function minigameSwing(s: GameState, result: SwingResult): void {
  const a = manualAction(s);
  if (!a) return;
  const cap = focusOverflowCap(currentMinigameSkill(s));
  // a double (the gold crit) is worth twice a clean hit's Focus
  const change = result === 'double' ? 2 * FOCUS_HIT : result === 'hit' ? FOCUS_HIT : result === 'weak' ? FOCUS_WEAK : -FOCUS_MISS;
  a.focus = Math.min(1 + cap, Math.max(0, (a.focus ?? 0) + change));
}

/** Is a double waiting on the running action? */
export function doubleReady(s: GameState): boolean {
  return !!manualAction(s)?.double;
}

/** Use up the waiting double as the action finishes: true when this finish pays out twice. Never offline. */
export function takeDouble(s: GameState, ctx: Ctx): boolean {
  const a = manualAction(s);
  if (!a?.double) return false;
  a.double = false;
  return !ctx.offline;
}

/** Focus drains while you're here, and is gone once you're away. */
export function focusStep(s: GameState, ctx: Ctx, dt: number): void {
  const a = manualAction(s);
  if (!a?.focus) return;
  const rate = focusDrainPerSec(currentMinigameSkill(s));
  a.focus = ctx.offline ? 0 : Math.max(0, a.focus - (rate * dt) / 1000);
}

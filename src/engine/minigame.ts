import { actionDef } from '../data/skills';
import type { Ctx } from './context';
import { totalMasteryLevels } from './skillingMastery';
import type { GameState, SkillId } from './types';

/**
 * Skilling mini-games: playing fills Focus, which speeds up the running action on top of the
 * normal idle rate. It can only ever add speed, and it never runs offline.
 */
export const MAX_FOCUS_SPEED = 0.45;
/** Focus past full: adds no speed, but buys this much drain time before speed starts to fall (5 s). */
const FOCUS_OVERFLOW = 0.5;
const FOCUS_HIT = 0.25;
const FOCUS_WEAK = 0.05;
const FOCUS_MISS = 0.1;
const FOCUS_DRAIN_PER_SEC = 0.1;

/** Mining: an early release under this much charge does nothing; the sweet spot is this wide. */
export const CHARGE_MIN = 0.5;
export const CHARGE_ZONE_WIDTH = 0.12;

/**
 * The double zone: a small gold zone inside each game's bright one. Landing in it counts as a
 * clean hit and also doubles what the running action makes the next time it finishes.
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

const MANUAL_SKILLS: SkillId[] = ['mining', 'woodcutting', 'harvesting', 'thieving', 'agility', 'archaeology', 'smelting', 'smithing', 'woodcrafting', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'cartography', 'astrology'];

export type SwingResult = 'double' | 'hit' | 'weak' | 'miss';

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
  return Math.max(0, (manualAction(s)?.focus ?? 0) - 1) / FOCUS_OVERFLOW;
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
  const change = result === 'hit' || result === 'double' ? FOCUS_HIT : result === 'weak' ? FOCUS_WEAK : -FOCUS_MISS;
  a.focus = Math.min(1 + FOCUS_OVERFLOW, Math.max(0, (a.focus ?? 0) + change));
  // one double waits for the next finish: more doubles before it lands don't stack
  if (result === 'double') a.double = true;
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
  a.focus = ctx.offline ? 0 : Math.max(0, a.focus - (FOCUS_DRAIN_PER_SEC * dt) / 1000);
}

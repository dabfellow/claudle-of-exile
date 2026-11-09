import { actionDef } from '../data/skills';
import type { Ctx } from './context';
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

const MANUAL_SKILLS: SkillId[] = ['mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology', 'smithing', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'cartography'];

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

export function focusOf(s: GameState): number {
  return Math.min(1, manualAction(s)?.focus ?? 0);
}

/** How full the overflow bar is, 0–1. */
export function overflowOf(s: GameState): number {
  return Math.max(0, (manualAction(s)?.focus ?? 0) - 1) / FOCUS_OVERFLOW;
}

/** Multiplies skilling progress: 1 with no Focus, never lower. */
export function focusMult(s: GameState): number {
  return 1 + focusOf(s) * MAX_FOCUS_SPEED;
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

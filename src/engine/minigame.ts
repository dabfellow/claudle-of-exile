import { actionDef } from '../data/skills';
import type { Ctx } from './context';
import type { GameState, SkillId } from './types';

/**
 * Skilling mini-games: playing fills Focus, which speeds up the running action on top of the
 * normal idle rate. It can only ever add speed, and it never runs offline.
 */
export const MAX_FOCUS_SPEED = 0.3;
const FOCUS_HIT = 0.25;
const FOCUS_WEAK = 0.1;
const FOCUS_MISS = 0.1;
const FOCUS_DRAIN_PER_SEC = 0.1;

/** Mining: an early release under this much charge does nothing; the sweet spot is this wide. */
export const CHARGE_MIN = 0.5;
export const CHARGE_ZONE_WIDTH = 0.12;

const MANUAL_SKILLS: SkillId[] = ['mining', 'woodcutting', 'harvesting'];

export type SwingResult = 'hit' | 'weak' | 'miss';

export function hasMinigame(skill: SkillId): boolean {
  return MANUAL_SKILLS.includes(skill);
}

/** How a released swing landed, or null when it was let go too early to count. */
export function chargeResult(charge: number, zone: number): SwingResult | null {
  if (charge >= zone + CHARGE_ZONE_WIDTH) return 'miss';
  if (charge >= zone) return 'hit';
  return charge >= CHARGE_MIN ? 'weak' : null;
}

/** The skill action a mini-game can feed right now, or null. */
function manualAction(s: GameState) {
  const a = s.action;
  return a?.kind === 'skill' && hasMinigame(actionDef(a.actionId).skill) ? a : null;
}

export function focusOf(s: GameState): number {
  return manualAction(s)?.focus ?? 0;
}

/** Multiplies skilling progress: 1 with no Focus, never lower. */
export function focusMult(s: GameState): number {
  return 1 + focusOf(s) * MAX_FOCUS_SPEED;
}

export function minigameSwing(s: GameState, result: SwingResult): void {
  const a = manualAction(s);
  if (!a) return;
  const change = result === 'hit' ? FOCUS_HIT : result === 'weak' ? FOCUS_WEAK : -FOCUS_MISS;
  a.focus = Math.min(1, Math.max(0, (a.focus ?? 0) + change));
}

/** Focus drains while you're here, and is gone once you're away. */
export function focusStep(s: GameState, ctx: Ctx, dt: number): void {
  const a = manualAction(s);
  if (!a?.focus) return;
  a.focus = ctx.offline ? 0 : Math.max(0, a.focus - (FOCUS_DRAIN_PER_SEC * dt) / 1000);
}

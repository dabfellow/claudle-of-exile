import type { MasterySpec } from '../data/skillingMastery';
import type { Rng } from './rng';
import type { GameState } from './types';

export const MASTERY_CAP = 120 * 60 * 60;
export const MASTERY_MAX_LEVEL = 100;
export const MASTERY_SPEED_MAX = 20;
export const MASTERY_YIELD_MAX = 0.15;
export const MASTERY_CONSERVE_MAX = 0.15;

export function masteryPractice(s: GameState, id: string): number {
  const value = s.skillingMastery[id];
  return Number.isFinite(value) && value > 0 ? Math.min(MASTERY_CAP, value) : 0;
}

export function masteryProgress(s: GameState, id: string): number {
  return Math.sqrt(masteryPractice(s, id) / MASTERY_CAP);
}

export function masteryLevelFromPractice(practice: number): number {
  const p = Math.sqrt(Math.max(0, Math.min(MASTERY_CAP, Number.isFinite(practice) ? practice : 0)) / MASTERY_CAP);
  return Math.min(MASTERY_MAX_LEVEL, 1 + Math.floor(99 * p));
}

export function masteryLevel(s: GameState, id: string): number {
  return masteryLevelFromPractice(masteryPractice(s, id));
}

export function masteryThreshold(level: number): number {
  const l = Math.max(1, Math.min(MASTERY_MAX_LEVEL, Math.floor(level)));
  return MASTERY_CAP * ((l - 1) / 99) ** 2;
}

export function masterySpeed(s: GameState, mastery?: MasterySpec): number {
  return mastery ? MASTERY_SPEED_MAX * masteryProgress(s, mastery.id) : 0;
}

export function masteryYield(s: GameState, mastery?: MasterySpec): number {
  return mastery?.profile === 'gathering' ? MASTERY_YIELD_MAX * masteryProgress(s, mastery.id) : 0;
}

export function masteryConservation(s: GameState, mastery?: MasterySpec): number {
  return mastery?.profile === 'production' ? MASTERY_CONSERVE_MAX * masteryProgress(s, mastery.id) : 0;
}

/** Credit nominal work once, clamped at 120 hours. Returns practice actually added. */
export function grantMasteryPractice(s: GameState, mastery: MasterySpec | undefined, seconds: number): number {
  if (!mastery || !Number.isFinite(seconds) || seconds <= 0) return 0;
  const before = masteryPractice(s, mastery.id);
  const after = Math.min(MASTERY_CAP, before + seconds);
  s.skillingMastery[mastery.id] = after;
  return after - before;
}

export function stochasticRound(rng: Rng, value: number): number {
  const safe = Math.max(0, Number.isFinite(value) ? value : 0);
  const whole = Math.floor(safe);
  const fraction = safe - whole;
  return whole + (fraction > 0 && rng.next() < fraction ? 1 : 0);
}

/** Clamp malformed values while preserving unknown stable ids as inactive data. */
export function settleSkillingMastery(s: GameState): void {
  if (!s.skillingMastery || typeof s.skillingMastery !== 'object' || Array.isArray(s.skillingMastery)) s.skillingMastery = {};
  for (const [id, value] of Object.entries(s.skillingMastery)) {
    s.skillingMastery[id] = Number.isFinite(value) && value > 0 ? Math.min(MASTERY_CAP, value) : 0;
  }
}

import { findMasterySpecById, type MasteryMilestone, type MasterySpec, type MilestoneLevel } from '../data/skillingMastery';
import type { Rng } from './rng';
import type { GameState } from './types';

export const MASTERY_CAP = 120 * 60 * 60;
export const MASTERY_MAX_LEVEL = 100;
export const MASTERY_SPEED_MAX = 10;
export const MASTERY_YIELD_MAX = 0.10;
export const MASTERY_CONSERVE_MAX = 0.10;

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

export function taskMilestones(mastery?: MasterySpec): MasteryMilestone[] {
  return mastery?.milestones ?? [];
}

export function unlockedMilestones(s: GameState, mastery?: MasterySpec): MasteryMilestone[] {
  if (!mastery) return [];
  const lvl = masteryLevel(s, mastery.id);
  return (mastery.milestones ?? []).filter((m) => lvl >= m.level);
}

export function hasMilestone(s: GameState, mastery: MasterySpec | undefined, level: MilestoneLevel): boolean {
  if (!mastery) return false;
  return masteryLevel(s, mastery.id) >= level;
}

export interface GlobalMasteryBonuses {
  speed: number;
  find: number;
  conserve: number;
  extra: Record<string, number>;
}

export function globalMasteryBonuses(s: GameState, skill: string): GlobalMasteryBonuses {
  const res: GlobalMasteryBonuses = { speed: 0, find: 0, conserve: 0, extra: {} };
  if (!s.skillingMastery || typeof s.skillingMastery !== 'object') return res;
  for (const [id, practice] of Object.entries(s.skillingMastery)) {
    const lvl = masteryLevelFromPractice(practice);
    if (lvl < 75) continue;
    const spec = findMasterySpecById(id);
    if (!spec || spec.skill !== skill) continue;
    for (const m of spec.milestones) {
      if (m.scope === 'global' && lvl >= m.level) {
        if (m.kind === 'global_speed') res.speed += m.value;
        else if (m.kind === 'global_find') res.find += m.value;
        else if (m.kind === 'global_conserve') res.conserve += m.value;
        else res.extra[m.kind] = (res.extra[m.kind] ?? 0) + m.value;
      }
    }
  }
  return res;
}

export function masterySpeed(s: GameState, mastery?: MasterySpec): number {
  if (!mastery) return 0;
  const base = MASTERY_SPEED_MAX * masteryProgress(s, mastery.id);
  const taskSpeed = unlockedMilestones(s, mastery).filter((m) => m.kind === 'action_speed').reduce((acc, m) => acc + m.value, 0);
  const global = mastery.skill ? globalMasteryBonuses(s, mastery.skill).speed : 0;
  return base + taskSpeed + global;
}

export function masteryYield(s: GameState, mastery?: MasterySpec): number {
  if (!mastery) return 0;
  const base = mastery.profile === 'gathering' ? MASTERY_YIELD_MAX * masteryProgress(s, mastery.id) : 0;
  const global = mastery.skill ? globalMasteryBonuses(s, mastery.skill).find : 0;
  return base + global;
}

export function masteryConservation(s: GameState, mastery?: MasterySpec): number {
  if (!mastery) return 0;
  const base = mastery.profile === 'production' ? MASTERY_CONSERVE_MAX * masteryProgress(s, mastery.id) : 0;
  const global = mastery.skill ? globalMasteryBonuses(s, mastery.skill).conserve : 0;
  return base + global;
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

/** Sum of all mastery levels earned (practice > 0) across all things in a specific skill. */
export function totalMasteryLevels(s: GameState, skill: string): number {
  if (!s.skillingMastery || typeof s.skillingMastery !== 'object') return 0;
  let total = 0;
  for (const [id, practice] of Object.entries(s.skillingMastery)) {
    if (!Number.isFinite(practice) || practice <= 0) continue;
    const spec = findMasterySpecById(id);
    if (!spec || spec.skill !== skill) continue;
    total += masteryLevelFromPractice(practice);
  }
  return total;
}

/** Clamp malformed values while preserving unknown stable ids as inactive data. */
export function settleSkillingMastery(s: GameState): void {
  if (!s.skillingMastery || typeof s.skillingMastery !== 'object' || Array.isArray(s.skillingMastery)) s.skillingMastery = {};
  for (const [id, value] of Object.entries(s.skillingMastery)) {
    s.skillingMastery[id] = Number.isFinite(value) && value > 0 ? Math.min(MASTERY_CAP, value) : 0;
  }
}

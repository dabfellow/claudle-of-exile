import { COOKING_GATE, MEAL_MS, mealDef } from '../data/cooking';
import { describeStat } from '../data/statText';
import type { Ctx } from './context';
import { skillTreeStats } from './skillTree';
import type { GameState, StatKey } from './types';

/** Head Chef: how much stronger meals are. */
export const HEAD_CHEF_MORE = 30;

export function cookingOpen(s: GameState): boolean {
  return s.unlockedZones.includes(COOKING_GATE.zone);
}

/** How long a meal lasts for this character, in time spent fighting. */
export function mealLength(s: GameState): number {
  return MEAL_MS * (1 + (skillTreeStats(s).slowSimmer ?? 0) / 100);
}

/** A dish's stats for this character, with Head Chef applied. */
export function dishStats(s: GameState, id: string): Partial<Record<StatKey, number>> {
  const mult = skillTreeStats(s).headChef ? 1 + HEAD_CHEF_MORE / 100 : 1;
  return Object.fromEntries(Object.entries(mealDef(id).stats).map(([k, v]) => [k, Math.round(v * mult * 100) / 100]));
}

/** What the meal you've eaten gives right now. */
export function mealStats(s: GameState): Partial<Record<StatKey, number>> {
  return s.meal ? dishStats(s, s.meal.id) : {};
}

export function mealEffectText(s: GameState, id: string): string {
  return Object.entries(dishStats(s, id)).map(([k, v]) => describeStat(k as StatKey, v)).join(', ');
}

export function mealReason(s: GameState, id: string): string | null {
  if ((s.bank[id] ?? 0) < 1) return `You have no ${mealDef(id).name}`;
  if (s.meal?.id === id) return 'You are already full of that';
  return null;
}

function serve(s: GameState, id: string, leftover = 0): void {
  s.bank[id] -= 1;
  s.lifetime.mealsEaten += 1;
  s.meal = { id, remainingMs: mealLength(s) + leftover };
}

/** Eat a dish from the bank. One meal at a time: a different dish replaces what's left of the last. */
export function eatMeal(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = mealReason(s, id);
  if (reason) return reason;
  serve(s, id);
  ctx.emit({ t: 'info', text: `You eat the ${mealDef(id).name}`, tone: 'good' });
  return null;
}

/** The clock runs while you fight, offline too, and Keep eating serves the next one so a long night stays fed. */
export function mealStep(s: GameState, ctx: Ctx, dt: number): void {
  if (!s.meal) return;
  s.meal.remainingMs -= dt;
  if (s.meal.remainingMs > 0) return;
  const { id, remainingMs } = s.meal;
  if (s.keepEating && (s.bank[id] ?? 0) > 0) {
    serve(s, id, remainingMs);
    return;
  }
  s.meal = null;
  ctx.emit({ t: 'info', text: `The ${mealDef(id).name} wore off` });
}

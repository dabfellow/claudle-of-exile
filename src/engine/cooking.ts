import { INGREDIENTS, MEAL_MS, mealDef, MEALS } from '../data/cooking';
import { ACTIONS, actionDef, type SkillAction } from '../data/skills';
import { describeStat } from '../data/statText';
import type { Ctx } from './context';
import { globalMasteryBonuses, unlockedMilestones } from './skillingMastery';
import { skillTreeStats } from './skillTree';
import type { GameState, SkillId, StatKey } from './types';

/** Head Chef: how much stronger meals are. */
export const HEAD_CHEF_MORE = 30;

export const GATHERING_SKILLS: SkillId[] = ['mining', 'woodcutting', 'harvesting', 'thieving', 'archaeology'];
export const PRODUCTION_SKILLS: SkillId[] = ['smelting', 'smithing', 'woodcrafting', 'alchemy', 'gemcutting', 'runecarving', 'cooking', 'cartography'];

export function cookingOpen(_s: GameState): boolean {
  return true;
}

/** How long a meal lasts for this character. Base duration varies by dish (30m ordinary, 60m signature/feast). */
export function mealLength(s: GameState, id?: string): number {
  const mealId = id ?? s.meal?.id;
  const base = (mealId ? mealDef(mealId).durationMs : undefined) ?? MEAL_MS;
  let masteryBonusPct = 0;
  if (mealId) {
    const act = ACTIONS.find((a) => a.outputs && a.outputs[mealId]);
    if (act?.mastery) {
      for (const m of unlockedMilestones(s, act.mastery)) {
        if (m.kind === 'meal_duration') masteryBonusPct += m.value;
      }
    }
  }
  masteryBonusPct += globalMasteryBonuses(s, 'cooking').extra.meal_duration ?? 0;
  return base * (1 + (skillTreeStats(s).slowSimmer ?? 0 + masteryBonusPct) / 100);
}

/** Total duration supported by the player's current bank supply of this dish plus remaining active time. */
export function mealSupplySupportedMs(s: GameState, id: string): number {
  const inBank = s.storage.bank[id] ?? 0;
  const currentLeft = s.meal?.id === id ? Math.max(0, s.meal.remainingMs) : 0;
  return currentLeft + inBank * mealLength(s, id);
}

export function formatDurationMs(ms: number): string {
  const totalMins = Math.round(ms / 60_000);
  if (totalMins < 60) return `${totalMins}m`;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/** Whether the active meal's duration clock is running right now. */
export function isMealClockRunning(s: GameState): boolean {
  if (!s.meal) return false;
  const def = mealDef(s.meal.id);
  if (!def.skillingTarget) {
    return Boolean(s.combat);
  }
  if (def.skillingTarget === 'gathering') {
    if (s.action?.kind === 'skill') {
      const skill = actionDef(s.action.actionId).skill;
      return GATHERING_SKILLS.includes(skill);
    }
    if (s.action?.kind === 'heist') return true;
    if (s.action?.kind === 'project') {
      const proj = s.professionProgress.activeProject?.project;
      return proj ? GATHERING_SKILLS.includes(proj.skill) : false;
    }
    return false;
  }
  if (def.skillingTarget === 'production') {
    if (s.action?.kind === 'skill') {
      const skill = actionDef(s.action.actionId).skill;
      return PRODUCTION_SKILLS.includes(skill);
    }
    if (s.action?.kind === 'project') {
      const proj = s.professionProgress.activeProject?.project;
      return proj ? PRODUCTION_SKILLS.includes(proj.skill) : false;
    }
    return false;
  }
  return false;
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
  if ((s.storage.bank[id] ?? 0) < 1) return `You have no ${mealDef(id).name}`;
  if (s.meal?.id === id) return 'You are already full of that';
  return null;
}

function serve(s: GameState, id: string, leftover = 0): void {
  s.storage.bank[id] -= 1;
  s.lifetime.mealsEaten += 1;
  s.meal = { id, remainingMs: mealLength(s, id) + leftover };
}

/** Eat a dish from the bank. One meal at a time: a different dish replaces what's left of the last. */
export function eatMeal(s: GameState, ctx: Ctx, id: string): string | null {
  const reason = mealReason(s, id);
  if (reason) return reason;
  serve(s, id);
  ctx.emit({ t: 'info', text: `You eat the ${mealDef(id).name}`, tone: 'good' });
  return null;
}

/** The clock runs while you fight or do relevant active skilling, and Keep eating serves the next one on expiry. */
export function mealStep(s: GameState, ctx: Ctx, dt: number): void {
  if (!s.meal) return;
  s.meal.remainingMs -= dt;
  if (s.meal.remainingMs > 0) return;
  const { id, remainingMs } = s.meal;
  if (s.keepEating && (s.storage.bank[id] ?? 0) > 0) {
    serve(s, id, remainingMs);
    return;
  }
  s.meal = null;
  ctx.emit({ t: 'info', text: `The ${mealDef(id).name} wore off` });
}

export const COOKING_CATEGORIES: { id: string; label: string }[] = [
  { id: 'survival', label: 'Survival Meals' },
  { id: 'resources', label: 'Resource Meals' },
  { id: 'damage', label: 'Damage Meals' },
  { id: 'gathering', label: 'Gathering Food' },
  { id: 'production', label: 'Production Food' },
  { id: 'reagents', label: 'Reagents & Ingredients' },
];

export function cookingCategory(a: SkillAction): string {
  const outId = Object.keys(a.outputs ?? a.protectedOutputs ?? {})[0];
  if (!outId) return 'reagents';
  if (outId === 'binding_stock' || INGREDIENTS.some((i) => i.id === outId)) return 'reagents';
  const meal = MEALS.find((m) => m.id === outId);
  return meal?.category ?? 'survival';
}

export function cookingPreview(s: GameState, a: SkillAction): string[] {
  if (a.skill !== 'cooking') return [];
  const outId = Object.keys(a.outputs ?? a.protectedOutputs ?? {})[0];
  if (!outId) return [];
  const lines: string[] = [];

  if (outId === 'binding_stock') {
    lines.push('Special reagent: project material for future assemblies; not edible.');
    lines.push('Protected output: 1:1 guaranteed yield; cannot be conserved, refunded or duplicated.');
    const inBank = s.storage.bank[outId] ?? 0;
    if (inBank > 0) lines.push(`Stock: ${inBank} in bank.`);
    return lines;
  }

  const ing = INGREDIENTS.find((i) => i.id === outId);
  if (ing) {
    lines.push(`Flask ingredient: ${ing.desc}`);
    const inBank = s.storage.bank[outId] ?? 0;
    if (inBank > 0) lines.push(`Stock: ${inBank} in bank.`);
    return lines;
  }

  const meal = MEALS.find((m) => m.id === outId);
  if (!meal) return lines;

  const targetLabel = meal.skillingTarget === 'gathering'
    ? 'relevant active gathering & thieving work'
    : meal.skillingTarget === 'production'
    ? 'relevant active production work'
    : 'time spent fighting';
  const durMs = mealLength(s, meal.id);
  const supplyMs = mealSupplySupportedMs(s, meal.id);
  const inBank = s.storage.bank[meal.id] ?? 0;
  const catLabel = meal.category ? meal.category[0].toUpperCase() + meal.category.slice(1) : 'Consumable';

  lines.push(`[${catLabel}] Effect: ${mealEffectText(s, meal.id)}.`);
  lines.push(`Duration: ${formatDurationMs(durMs)} of ${targetLabel}.`);
  lines.push(`Re-eating: fills your one meal slot. When 'Keep eating' is enabled, 1 meal is eaten on expiry and stops when bank stock is empty.`);
  lines.push(`Pantry stock: ${inBank} on hand (${formatDurationMs(supplyMs)} supply).`);
  if (meal.protected) {
    lines.push('Protected dish: 1:1 guaranteed yield; cannot be conserved or doubled.');
  }

  return lines;
}

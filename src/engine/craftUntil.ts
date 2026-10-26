import { affixDef } from '../data/affixes';
import { essenceDef, fossilDef } from '../data/craftMats';
import { AUTO_CRAFT_BENCH_LEVEL, CRAFT_STEP_MS } from '../data/hideout';
import { stationLevel } from './hideout';
import { currencyDef } from '../data/materials';
import type { Ctx } from './context';
import { applyEssence, applyOrb, essenceReason, findItem, orbReason } from './crafting';
import { allMods, itemName } from './items';
import { chance } from './rng';
import { skillTreeStats } from './skillTree';
import type { CraftMethod, GameState, Item, StopRule } from './types';

/**
 * Auto-crafting, formerly "Craft until…" (docs/SKILLING_REWORK.md §4): an idle activity at the Crafting Bench
 * (level 5) that spends one orb or Essence per step on an inventory item until a stop rule matches or the materials run out.
 */
export function ruleMet(item: Item, rule: StopRule): boolean {
  const mods = allMods(item);
  if (rule.kind === 'has') return mods.some((m) => m.affixId === rule.affixId && m.tier >= (rule.minTier ?? 0));
  return mods.filter((m) => rule.affixIds.includes(m.affixId)).length >= 2;
}

function stepReason(s: GameState, uid: number, method: CraftMethod): string | null {
  return 'essence' in method ? essenceReason(s, method.essence, uid) : orbReason(s, method.orb, uid, method.fossil);
}

export function methodName(method: CraftMethod): string {
  if ('essence' in method) return essenceDef(method.essence)?.name ?? method.essence;
  const orb = currencyDef(method.orb).name;
  return method.fossil ? `${orb} + ${fossilDef(method.fossil)?.name}` : orb;
}

/** A modifier's text with its numbers blanked, e.g. "+#% to Fire Resistance". */
export function affixName(affixId: string): string {
  return affixDef(affixId).text.replace(/\{\d\}/g, '#');
}

export function ruleText(rule: StopRule): string {
  if (rule.kind === 'twoOf') return `2 of ${rule.affixIds.map(affixName).join(', ')}`;
  const a = affixDef(rule.affixId);
  return rule.minTier ? `${affixName(a.id)} at T${a.tiers.length - rule.minTier} or better` : affixName(a.id);
}

export function craftUntilReason(s: GameState, uid: number, method: CraftMethod, rule: StopRule): string | null {
  if (stationLevel(s, 'bench') < AUTO_CRAFT_BENCH_LEVEL) return `Needs Crafting Bench level ${AUTO_CRAFT_BENCH_LEVEL}`;
  const item = findItem(s, uid);
  if (!item || Object.values(s.equipment).includes(item)) return 'Pick an item from your inventory or stash';
  if (rule.kind === 'twoOf' && rule.affixIds.length < 2) return 'Pick at least two modifiers';
  if (ruleMet(item, rule)) return 'Already matches';
  return stepReason(s, uid, method);
}

export function startCraftUntil(s: GameState, ctx: Ctx, uid: number, method: CraftMethod, rule: StopRule): string | null {
  const reason = craftUntilReason(s, uid, method, rule);
  if (reason) {
    ctx.emit({ t: 'info', text: reason, tone: 'warn' });
    return reason;
  }
  s.combat = null;
  s.action = { kind: 'craft', uid, method, rule, progress: 0, steps: 0 };
  return null;
}

/** One crafting step: spend the orb or Essence, then stop if the rule matches. */
function craftOnce(s: GameState, ctx: Ctx): void {
  if (s.action?.kind !== 'craft') return;
  const { uid, method, rule } = s.action;
  const item = findItem(s, uid);
  const blocker = item ? stepReason(s, uid, method) : 'Item is gone';
  if (blocker) {
    ctx.emit({ t: 'info', text: `Craft until: ${blocker}. Stopped.`, tone: 'warn' });
    s.action = null;
    return;
  }
  const refund = 'orb' in method && chance(ctx.rng, (skillTreeStats(s).patientCrafter ?? 0) / 100);
  if ('essence' in method) applyEssence(s, ctx, method.essence, uid);
  else applyOrb(s, ctx, method.orb, uid, method.fossil);
  if (refund && 'orb' in method) s.bank[method.orb] += 1;
  s.action.steps += 1;
  if (ruleMet(item!, rule)) {
    const steps = s.action.steps;
    s.action = null;
    ctx.emit({ t: 'craftDone', text: `${itemName(item!)} hit ${ruleText(rule)} after ${steps} step${steps === 1 ? '' : 's'}`, uid });
  }
}

export function craftStep(s: GameState, ctx: Ctx, dt: number): void {
  if (s.action?.kind !== 'craft') return;
  s.action.progress += dt;
  while (s.action?.kind === 'craft' && s.action.progress >= CRAFT_STEP_MS) {
    s.action.progress -= CRAFT_STEP_MS;
    craftOnce(s, ctx);
  }
}

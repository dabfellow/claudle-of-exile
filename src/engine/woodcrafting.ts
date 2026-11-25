import { JIG_TIERS, WOOD_FAMILIES, woodFamily, type Jig, type WoodFamily } from '../data/woodcrafting';
import { actionDef, isTunedSkill, type SkillAction } from '../data/skills';
import type { Implicit } from '../data/bases';
import { canAfford, payCost } from './bank';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import type { ModBias } from './items';
import { chance, pick } from './rng';
import { startSkillAction } from './skills';
import { stashedItems } from './storage';
import type { GameState, Item } from './types';
import { levelOf } from './xp';

export interface WoodTuning { id: string; name: string; family: WoodFamily; dials: number[] }
export interface WoodPlan { dials?: number[]; living?: 'legend_heartwood' | 'world_tree_heart' }
export interface WoodcraftingState {
  tunings: WoodTuning[];
  active: Partial<Record<WoodFamily, string>>;
  jigs: Record<Jig, number>;
  stats: { balanced: number };
  rack: number[];
}

export const freshWoodcrafting = (): WoodcraftingState => ({
  tunings: [], active: {}, jigs: { bow: 0, lathe: 0, form: 0 }, stats: { balanced: 0 }, rack: [],
});

const woodLevel = (s: GameState) => levelOf('woodcrafting', s.skills.woodcrafting);
const tailorLevel = (s: GameState) => levelOf('tailoring', s.skills.tailoring ?? 0);
/** The Robe form is Tailoring's jig; the bow jig and staff lathe stay Woodcrafting's. */
export const jigSkill = (jig: Jig): 'woodcrafting' | 'tailoring' => jig === 'form' ? 'tailoring' : 'woodcrafting';
const jigLevel = (s: GameState, jig: Jig) => jigSkill(jig) === 'tailoring' ? tailorLevel(s) : woodLevel(s);
const HOUR = 3_600_000;

export function woodDialRange(s: GameState, family: WoodFamily, index: number): number {
  const tier = s.woodcrafting.jigs[WOOD_FAMILIES[family].jig];
  const fromJig = Number(tier >= 1) + Number(tier >= 3) + Number(tier >= 2 && index === 1);
  // cloth and leather dials are shared by Tailoring's armour and Woodcrafting's bucklers and spirit shields
  const level = family === 'cloth' || family === 'leather' ? Math.max(woodLevel(s), tailorLevel(s)) : woodLevel(s);
  return Math.min(6, (level >= 40 ? 3 : 2) + fromJig);
}

export function woodDialIndices(a: SkillAction, living: boolean): number[] {
  const indices = [0];
  // oak and deeper wood (planks or sawn parts) opens the second dial
  if (a.inputs && Object.keys(a.inputs).some((id) => /_(plank|bow_stave|wand_blank|staff_shaft)$/.test(id) && !id.startsWith('ash_'))) indices.push(1);
  if (living) indices.push(2);
  return indices;
}

function constrain(s: GameState, family: WoodFamily, dials: readonly number[]): number[] {
  return Array.from({ length: 3 }, (_, index) => {
    const range = woodDialRange(s, family, index);
    const value = dials[index] ?? 0;
    return Number.isFinite(value) ? Math.max(-range, Math.min(range, Math.trunc(value))) : 0;
  });
}

export function recipeDials(s: GameState, a: SkillAction, dials: readonly number[], living: boolean): number[] {
  const allowed = woodDialIndices(a, living);
  return constrain(s, woodFamily(a.baseId!), dials).map((value, index) => allowed.includes(index) ? value : 0);
}

export function activeWoodTuning(s: GameState, family: WoodFamily): WoodTuning | undefined {
  return s.woodcrafting.tunings.find(({ id }) => id === s.woodcrafting.active[family]);
}

export function woodTuningSlots(s: GameState, family: WoodFamily): number {
  return s.woodcrafting.jigs[WOOD_FAMILIES[family].jig] >= 2 ? 3 : 2;
}

export function saveWoodTuning(s: GameState, family: WoodFamily, name: string, dials: number[]): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const state = s.woodcrafting;
  if (state.tunings.filter((t) => t.family === family).length >= woodTuningSlots(s, family)) return 'This family has no tuning slots left';
  let serial = 1;
  while (state.tunings.some((t) => t.id === `${family}-${serial}`)) serial++;
  const id = `${family}-${serial}`;
  state.tunings.push({ id, name: name.trim().slice(0, 50) || `Tuning ${serial}`, family, dials: constrain(s, family, dials) });
  state.active[family] = id;
  return null;
}

export function chooseWoodTuning(s: GameState, family: WoodFamily, id: string): void {
  if (s.woodcrafting.tunings.some((t) => t.family === family && t.id === id)) s.woodcrafting.active[family] = id;
  else delete s.woodcrafting.active[family];
}

export function removeWoodTuning(s: GameState, tuning: WoodTuning): void {
  s.woodcrafting.tunings = s.woodcrafting.tunings.filter((t) => t.id !== tuning.id);
  if (s.woodcrafting.active[tuning.family] === tuning.id) delete s.woodcrafting.active[tuning.family];
}

export function jigUpgrade(s: GameState, jig: Jig) {
  const next = JIG_TIERS[s.woodcrafting.jigs[jig]];
  if (!next) return null;
  const cost = { [next.material]: next.count };
  const blocker = isClassic(s) ? CLASSIC_BLOCK : jigLevel(s, jig) < next.level ? `Requires ${jigSkill(jig) === 'tailoring' ? 'Tailoring' : 'Woodcrafting'} level ${next.level}`
    : canAfford(s, cost) ? null : 'Missing planks';
  return { ...next, cost, blocker };
}

export function buildWoodJig(s: GameState, jig: Jig): string | null {
  const next = jigUpgrade(s, jig);
  if (!next) return 'Jig is fully upgraded';
  if (next.blocker) return next.blocker;
  payCost(s, next.cost);
  s.woodcrafting.jigs[jig]++;
  return null;
}

export function startWoodcraft(s: GameState, ctx: Ctx, a: SkillAction, plan: WoodPlan): string | null {
  if (!isTunedSkill(a.skill)) return 'Choose a Woodcrafting or Tailoring recipe';
  if (plan.living && a.skill !== 'woodcrafting') return 'Living wood is carved at the Woodcrafting bench';
  if (plan.living && (!a.baseId || woodLevel(s) < 80)) return 'Living wood requires Woodcrafting level 80';
  if (plan.living && !canAfford(s, { ...a.inputs, [plan.living]: 1 })) return 'Missing materials';
  const blocked = startSkillAction(s, ctx, a.id);
  if (!blocked && a.baseId && s.action?.kind === 'skill') s.action.woodPlan = { ...plan, dials: plan.dials?.slice(0, 3) };
  return blocked;
}

export function runningWoodPlan(s: GameState, a: SkillAction): WoodPlan | undefined {
  return isTunedSkill(a.skill) && a.baseId && s.action?.kind === 'skill' && s.action.actionId === a.id ? s.action.woodPlan : undefined;
}

export function woodCraftDials(s: GameState, ctx: Ctx, a: SkillAction): number[] {
  if (!isTunedSkill(a.skill) || !a.baseId) return [];
  const plan = runningWoodPlan(s, a);
  const manual = ctx.offline ? undefined : plan?.dials;
  const chosen = manual ?? activeWoodTuning(s, woodFamily(a.baseId))?.dials ?? [];
  if (plan) delete plan.dials;
  return recipeDials(s, a, chosen, !!plan?.living);
}

export function woodBias(base: string, positions: readonly number[], bias?: ModBias): ModBias | undefined {
  if (!positions.some(Boolean)) return bias;
  const result = { ...bias };
  WOOD_FAMILIES[woodFamily(base)].dials.forEach(({ sides }, index) => {
    const position = positions[index] ?? 0;
    if (!position) return;
    for (const group of sides[position > 0 ? 1 : 0].groups) {
      result[group] = (result[group] ?? 1) * (1 + 0.5 * Math.abs(position));
    }
  });
  return result;
}

export function woodImplicits(item: Pick<Item, 'baseId' | 'dials' | 'living' | 'balanced'>): Implicit[] {
  if (!item.dials?.some(Boolean)) return [];
  const growth = item.living?.growth ?? 0;
  return WOOD_FAMILIES[woodFamily(item.baseId)].dials.flatMap(({ sides }, index) => {
    const position = item.dials![index] ?? 0;
    if (!position) return [];
    const gain = position > 0 ? 1 : 0;
    const amount = 4 * Math.abs(position);
    return sides.flatMap(({ stat, label }, side): Implicit[] => {
      if (side !== gain && item.balanced === index) return [];
      const value = side === gain ? Number((amount * (1 + 0.05 * growth)).toFixed(2)) : -amount;
      return [{ stat, value, text: `${value > 0 ? '+' : ''}${value}% ${label}` }];
    });
  });
}

export function finishWoodcraft(s: GameState, ctx: Ctx, item: Item, dials: number[], living: boolean): void {
  if (dials.some(Boolean) || living) item.dials = [...dials];
  if (living) item.living = { growth: 0, ms: 0 };
  const tuned = dials.flatMap((value, index) => value ? [index] : []);
  if (tuned.length && chance(ctx.rng, 1 / 400)) {
    item.balanced = pick(ctx.rng, tuned);
    s.woodcrafting.stats.balanced++;
    if (!ctx.offline) ctx.emit({ t: 'info', tone: 'good', text: 'A perfectly balanced piece came off the workbench.' });
  }
}

export function woodGrowthStep(s: GameState, elapsed: number): boolean {
  let changed = false;
  for (const item of Object.values(s.equipment)) {
    const living = item?.living;
    if (item?.corrupted || !living || living.growth >= 10) continue;
    const total = (living.ms ?? 0) + elapsed;
    const grow = Math.floor(total / HOUR);
    living.ms = total % HOUR;
    if (grow) {
      living.growth = Math.min(10, living.growth + grow);
      changed = true;
    }
  }
  return changed;
}

export function retuneLivingWood(s: GameState, uid: number, dials: number[]): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const item = [...s.inventory, ...Object.values(s.equipment)].find((i) => i?.uid === uid);
  if (!item?.living) return 'Choose a Living piece you are carrying or wearing';
  if (item.corrupted) return 'Corrupted gear cannot be modified';
  const a = actionDef(`smith_${item.baseId}`);
  const next = recipeDials(s, a, dials, true);
  if (next.every((value, index) => value === (item.dials?.[index] ?? 0))) return 'Adjust a dial first';
  item.dials = next;
  const grownMs = (item.living.growth * HOUR + (item.living.ms ?? 0)) / 2;
  item.living.growth = Math.floor(grownMs / HOUR);
  item.living.ms = grownMs % HOUR;
  return null;
}

export function woodRackItems(s: GameState): Item[] {
  const pending = new Set(s.woodcrafting.rack);
  return [...s.inventory, ...stashedItems(s), ...Object.values(s.equipment)].filter((item): item is Item => !!item && pending.has(item.uid));
}

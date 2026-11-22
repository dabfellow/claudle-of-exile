import { CUT_FACETS, NAMED_CUTS, facetFamilies, facetGem, type CutFacet, type NamedCut } from '../data/gemFacets';
import type { SkillAction } from '../data/skills';
import { addBank, hasItem, resolveRecipeCost } from './bank';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import { isGemEquipped } from './gemcutting';
import { ROUGH_TYPES, roughType, STAR_ROUGH, type RoughGem } from './roughGems';
import type { GameState, SkillGemInstance, SupportGemInstance } from './types';
import { levelOf } from './xp';

export interface CutSetup { rough?: RoughGem; named?: NamedCut; draft?: CutFacet[] }
export interface CutPlan { id: string; name: string; kind: string; facets: CutFacet[] }
type CutGem = SkillGemInstance | SupportGemInstance;
export interface GemcuttingState {
  plans: CutPlan[];
  active: Record<string, string>;
  quickFacets?: Record<string, CutFacet[]>;
  catalogue: string[];
  tray: number[];
}

export const freshGemcutting = (): GemcuttingState => ({ plans: [], active: {}, quickFacets: {}, catalogue: [], tray: [] });
export const planKind = (a: SkillAction) => a.batchOf ?? a.id;
export const cutPlanSlots = (s: GameState) => s.gemcutting.catalogue.length >= 10 ? 4 : 3;
export const catalogueSpeed = (s: GameState) => s.gemcutting.catalogue.length >= 200 ? 10 : 0;

export function cutSlots(s: GameState, id: RoughGem): { normal: number; wild: number } {
  const carats = roughType(id)?.carats ?? 2;
  return { normal: carats === 1 && s.gemcutting.catalogue.length >= 25 ? 2 : carats, wild: id === STAR_ROUGH ? 1 : 0 };
}

export function runningCut(s: GameState, a: SkillAction): CutSetup | undefined {
  return a.skill === 'gemcutting' && s.action?.kind === 'skill' && s.action.actionId === a.id ? s.action.cut : undefined;
}

/** Reserve a whole recipe from one stack; old jobs automatically select the first size that fits. */
export function roughForCut(s: GameState, a: SkillAction, setup?: CutSetup | null): RoughGem | undefined {
  const count = setup?.named ? 12 * (a.batch ?? 1) : a.inputs?.rough_gem;
  if (!count) return undefined;
  if (setup?.rough) return roughType(setup.rough) && hasItem(s, setup.rough, count) ? setup.rough : undefined;
  return ROUGH_TYPES.find(({ id }) => id !== STAR_ROUGH && hasItem(s, id, count))?.id;
}

export function cutCost(s: GameState, a: SkillAction, nominal: Record<string, number>, setup: CutSetup | null | undefined, rough?: RoughGem) {
  const { rough_gem: count, ...cost } = nominal;
  if (s.gemcutting.catalogue.length >= 50 && cost.arcane_dust >= 10) cost.arcane_dust = Math.ceil(cost.arcane_dust * 0.9);
  if (!rough) return resolveRecipeCost(s, nominal.rough_gem ? { ...cost, rough_gem: nominal.rough_gem } : cost);
  const resolved = resolveRecipeCost(s, cost);
  const paid = setup?.named ? 12 * (a.batch ?? 1) : (count ?? 0);
  if (!resolved || !hasItem(s, rough, paid)) return null;
  return { ...resolved, ...(paid ? { [rough]: paid } : {}) };
}

export function cutBlocker(s: GameState, a: SkillAction, setup?: CutSetup | null): string | null {
  const named = setup?.named;
  if (named) {
    if (!Object.hasOwn(NAMED_CUTS, named) || !a.gem) return 'Choose a gem recipe for the named cut';
    const def = NAMED_CUTS[named];
    if (levelOf('gemcutting', s.skills.gemcutting) < def.level) return `Requires Gemcutting level ${def.level}`;
    if (a.batchOf) return 'Named cuts use a single recipe';
    if (named === 'crown') {
      const g = a.gem;
      const exact = g.exactId && facetGem(g.exactId);
      if (g.kind === 'skill' || (g.kind === 'family' && !['defence', 'damage_support'].includes(g.family ?? '')) || (exact && 'role' in exact)) {
        return 'Crown Cut requires a support gem recipe';
      }
    }
    if (!setup?.rough || (roughType(setup.rough)?.carats ?? 0) < 4) return 'Choose Huge or Giant rough for this cut';
  }
  const rough = roughForCut(s, a, setup);
  if (a.inputs?.rough_gem && !rough) return setup?.rough ? 'Missing materials of the selected rough size' : 'Missing materials';
  if (!cutCost(s, a, a.inputs ?? {}, setup, rough)) return 'Missing materials';
  return null;
}

export function activeCutPlan(s: GameState, a: SkillAction): CutPlan | undefined {
  return s.gemcutting.plans.find(({ id }) => id === s.gemcutting.active[planKind(a)]);
}

export function chooseCutPlan(s: GameState, kind: string, id: string): void {
  if (s.gemcutting.plans.some((plan) => plan.id === id && plan.kind === kind)) s.gemcutting.active[kind] = id;
  else delete s.gemcutting.active[kind];
}

export function saveCutPlan(s: GameState, a: SkillAction, name: string, facets: CutFacet[]): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (!a.gem) return 'Choose a gem recipe';
  if (s.gemcutting.plans.length >= cutPlanSlots(s)) return 'No free cut plan slots';
  const kind = planKind(a);
  let serial = 1;
  while (s.gemcutting.plans.some((plan) => plan.id === `cut-plan-${serial}`)) serial++;
  const id = `cut-plan-${serial}`;
  s.gemcutting.plans.push({ id, kind, name: name.trim().slice(0, 50) || `Cut plan ${serial}`, facets: facets.slice(0, 5) });
  chooseCutPlan(s, kind, id);
  return null;
}

export function quickFacetsFor(s: GameState, a: SkillAction): CutFacet[] {
  return s.gemcutting.quickFacets?.[planKind(a)] ?? [];
}

export function setQuickFacets(s: GameState, a: SkillAction, facets: readonly CutFacet[]): void {
  const kind = planKind(a);
  s.gemcutting.quickFacets ??= {};
  const cleaned = facets.filter((f): f is CutFacet => Object.hasOwn(CUT_FACETS, f)).slice(0, 5);
  if (cleaned.length) s.gemcutting.quickFacets[kind] = cleaned;
  else delete s.gemcutting.quickFacets[kind];
  delete s.gemcutting.active[kind];
}

export function removeCutPlan(s: GameState, plan: CutPlan): void {
  s.gemcutting.plans = s.gemcutting.plans.filter(({ id }) => id !== plan.id);
  if (s.gemcutting.active[plan.kind] === plan.id) delete s.gemcutting.active[plan.kind];
}

export function applyCutFacets(s: GameState, gemId: string, rough: RoughGem, want: readonly CutFacet[], named?: NamedCut): string[] {
  const actual = facetGem(gemId);
  if (!actual) return [];
  const families = facetFamilies(actual);
  const limits = cutSlots(s, rough);
  const facets: string[] = [];
  let normal = 0;
  let wild = 0;
  for (const id of want) {
    if (!Object.hasOwn(CUT_FACETS, id)) continue;
    const facet = CUT_FACETS[id];
    if (facets.filter((prior) => prior === id).length >= facet.max) continue;
    const fits = facet.family === 'shared' || families.includes(facet.family);
    if (fits && normal < limits.normal) normal++;
    else if (wild < limits.wild) wild++;
    else continue;
    facets.push(id);
  }
  if (named && (named !== 'crown' || !('role' in actual))) facets.push(NAMED_CUTS[named].facet);
  return facets;
}

export function finishFacetedGem(s: GameState, ctx: Ctx, a: SkillAction, gem: CutGem, rough: RoughGem,
  draft: CutFacet[] | undefined, named?: NamedCut): void {
  const id = 'gemId' in gem ? gem.gemId : gem.supportId;
  const want = draft ?? activeCutPlan(s, a)?.facets ?? quickFacetsFor(s, a);
  gem.facets = applyCutFacets(s, id, rough, want, named);
  gem.rough = rough;
  const entry = `${id}|${[...gem.facets].sort().join(',')}`;
  if (!s.gemcutting.catalogue.includes(entry)) s.gemcutting.catalogue.push(entry);
  if (ctx.offline) s.gemcutting.tray.push(gem.uid);
}

export function cutTray(s: GameState): CutGem[] {
  const uids = new Set(s.gemcutting.tray);
  return [...s.storage.gems, ...s.storage.supportGems, ...s.skillBar.filter((gem): gem is SkillGemInstance => !!gem)]
    .filter((gem) => uids.has(gem.uid));
}

export function recutGem(s: GameState, uid: number): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (isGemEquipped(s, uid)) return 'Unsocket this gem first';
  const gem = [...s.storage.gems, ...s.storage.supportGems].find((g) => g.uid === uid);
  if (!gem?.facets?.length) return 'Choose a faceted gem from your gem bag';
  const carats = roughType(gem.rough)?.carats ?? 1;
  const smaller = ROUGH_TYPES.find((rough) => rough.carats === carats - 1);
  gem.facets = [];
  delete gem.rough;
  if (smaller) addBank(s, smaller.id, 1);
  return null;
}

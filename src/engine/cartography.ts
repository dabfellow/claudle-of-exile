import { MASTER_UPGRADE_MAPS, UPGRADE_MAPS } from '../data/cartography';
import type { SkillAction } from '../data/skills';
import { addMaps, mapsHeld, sextantCharges } from './maps';
import { skillTreeStats } from './skillTree';
import type { GameState } from './types';
import type { Ctx } from './context';
import { awardProtectedProgress } from './professions';
import { chance } from './rng';
import { SEXTANTS, SEXTANT_MODS } from '../data/maps';

export function cartographyOpen(_s: GameState): boolean {
  return true;
}

export function cartographyDone(s: GameState, ctx: Ctx, a: SkillAction): void {
  if (a.skill !== 'cartography' || a.protectedOutputs) return;
  const n = (s.professionProgress.counters['cartography.survey'] ?? 0) + 1;
  s.professionProgress.counters['cartography.survey'] = n;
  if (n % 30 === 0) awardProtectedProgress(s, ctx, 'chart_survey_fragment', 1);
  if (chance(ctx.rng, .01)) awardProtectedProgress(s, ctx, 'chart_survey_fragment', 1);
}

export function cartographyPreview(s: GameState, a: SkillAction): string[] {
  if (a.skill !== 'cartography') return [];
  const sex = SEXTANTS.find((x) => a.outputs?.[x.id]);
  const supply = a.inputs ? Math.min(...Object.entries(a.inputs).map(([id, n]) => Math.floor((s.account.bank[id] ?? 0) / n)), a.chart?.upgrade ? Math.floor(mapsHeld(s, a.chart.tier - 1) / upgradeCost(s, a)) : Infinity) : 0;
  return [`Supplies cover ${supply} completion(s)${a.chart ? ` and ${supply * a.chart.qty} maps before yield bonuses` : ''}.`,
    ...(a.chart?.upgrade ? [`Uses ${upgradeCost(s, a)} Tier ${a.chart.tier - 1} maps per completion. Full map cost is never conserved.`] : []),
    ...(sex ? [sex.desc, `Six base charges; your current Map Device and Atlas give ${sextantCharges(s)} charges. Roll pool:`, ...SEXTANT_MODS.filter((m) => m.tier === sex.tier).map((m) => `${m.name}: ${m.desc}`)] : []),
    `Survey fragment in ${30 - (s.professionProgress.counters['cartography.survey'] ?? 0) % 30} ordinary completions, plus 1% extra. A folio counts once for fragments and five times for work. Manual copies never add fragment progress. Maps wait for campaign Map Device access.`];
}

/** Maps of the tier below this recipe uses up: none for a drawing. */
export function upgradeCost(s: GameState, a: SkillAction): number {
  if (!a.chart?.upgrade) return 0;
  return skillTreeStats(s).masterCartographer ? MASTER_UPGRADE_MAPS : UPGRADE_MAPS;
}

/** Does this recipe have the lower maps it needs? */
export function hasChartMaps(s: GameState, a: SkillAction): boolean {
  return !a.chart?.upgrade || mapsHeld(s, a.chart.tier - 1) >= upgradeCost(s, a);
}

/** The finished map goes into the Map Device's own stock. `paid` is false when Steady Hands saved the inputs. */
export function chartDone(s: GameState, a: SkillAction, mult: number, _paid: boolean, outputs: Record<string, number>): void {
  const { tier, qty } = a.chart!;
  if (a.chart!.upgrade) addMaps(s, tier - 1, -upgradeCost(s, a));
  const made = qty * mult;
  outputs[addMaps(s, tier, made)] = made;
  s.lifetime.mapsDrawn += made;
}

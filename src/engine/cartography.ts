import {
  LOST_PLACES,
  MASTER_UPGRADE_MAPS,
  UPGRADE_MAPS,
  type SpecialMapKind,
} from '../data/cartography';
import { SEXTANTS, SEXTANT_MODS } from '../data/maps';
import type { SkillAction } from '../data/skills';
import { addBank } from './bank';
import type { Ctx } from './context';
import { accountUid } from './items';
import { addMaps, mapsHeld, sextantCharges } from './maps';
import { awardProtectedProgress } from './professions';
import { chance, pick, rInt } from './rng';
import { skillTreeStats } from './skillTree';
import type { GameState } from './types';

export interface SpecialMapItem {
  uid: number;
  kind: SpecialMapKind;
  tier: number;
  lostId?: string;
}

export interface CartographyState {
  atlas: string[];
  specialMaps: SpecialMapItem[];
  awayMaps: { kind: SpecialMapKind; tier: number; count: number }[];
}

export const freshCartography = (): CartographyState => ({
  atlas: [],
  specialMaps: [],
  awayMaps: [],
});

export function cartographyOpen(_s: GameState): boolean {
  return true;
}

export function atlasSpecialPerks(s: GameState) {
  const n = s.cartography.atlas.length;
  return {
    bossScrapMult: n >= 5 ? 1.2 : 1,
    vaultRollsMult: n >= 15 ? 1.25 : 1,
    guardianScrapMult: n >= 25 ? 1.2 : 1,
    lostChartMult: n >= 35 ? 1.5 : 1,
  };
}

export function cartographyDone(s: GameState, ctx: Ctx, a: SkillAction): void {
  if (a.skill !== 'cartography' || a.protectedOutputs) return;
  const n = (s.professionProgress.counters['cartography.survey'] ?? 0) + 1;
  s.professionProgress.counters['cartography.survey'] = n;
  if (n % 30 === 0) awardProtectedProgress(s, ctx, 'chart_survey_fragment', 1);
  if (chance(ctx.rng, 0.01)) awardProtectedProgress(s, ctx, 'chart_survey_fragment', 1);
}

export function cartographyPreview(s: GameState, a: SkillAction): string[] {
  if (a.skill !== 'cartography') return [];
  const sex = SEXTANTS.find((x) => a.outputs?.[x.id]);
  const mapSupply = a.chart?.upgrade
    ? Math.floor(mapsHeld(s, a.chart.tier - 1) / upgradeCost(s, a))
    : a.specialMap?.needsPlainTier
      ? mapsHeld(s, a.specialMap.needsPlainTier)
      : Infinity;
  const inputSupply = a.inputs
    ? Math.min(...Object.entries(a.inputs).map(([id, n]) => Math.floor((s.storage.bank[id] ?? 0) / n)), mapSupply)
    : mapSupply;
  return [
    `Supplies cover ${Number.isFinite(inputSupply) ? inputSupply : 0} completion(s)${a.chart ? ` and ${inputSupply * a.chart.qty} maps before yield bonuses` : ''}.`,
    ...(a.protectedOutputs ? ['Protected component: full listed costs; no manual double or input conservation.'] : []),
    ...(a.chart?.upgrade ? [`Uses ${upgradeCost(s, a)} Tier ${a.chart.tier - 1} maps per completion. Full map cost is never conserved.`] : []),
    ...(a.specialMap?.needsPlainTier ? [`Uses 1 plain Tier ${a.specialMap.needsPlainTier} map from your map supply.`] : []),
    ...(sex ? [sex.desc, `Six base charges; your current Map Device and Atlas give ${sextantCharges(s)} charges. Roll pool:`, ...SEXTANT_MODS.filter((m) => m.tier === sex.tier).map((m) => `${m.name}: ${m.desc}`)] : []),
  ];
}

export function upgradeCost(s: GameState, a: SkillAction): number {
  if (!a.chart?.upgrade) return 0;
  return skillTreeStats(s).masterCartographer ? MASTER_UPGRADE_MAPS : UPGRADE_MAPS;
}

export function hasChartMaps(s: GameState, a: SkillAction): boolean {
  if (a.chart?.upgrade) return mapsHeld(s, a.chart.tier - 1) >= upgradeCost(s, a);
  if (a.specialMap?.needsPlainTier) return mapsHeld(s, a.specialMap.needsPlainTier) >= 1;
  return true;
}

export function chartDone(s: GameState, a: SkillAction, mult: number, _paid: boolean, outputs: Record<string, number>): void {
  const { tier, qty } = a.chart!;
  if (a.chart!.upgrade) addMaps(s, tier - 1, -upgradeCost(s, a));
  const made = qty * mult;
  outputs[addMaps(s, tier, made)] = made;
  s.lifetime.mapsDrawn += made;
}

export function specialMapDone(s: GameState, ctx: Ctx, a: SkillAction, mult: number): SpecialMapItem[] {
  const spec = a.specialMap;
  if (!spec) return [];
  if (spec.needsPlainTier) addMaps(s, spec.needsPlainTier, -1);
  const created: SpecialMapItem[] = [];
  for (let i = 0; i < mult; i++) {
    const item: SpecialMapItem = {
      uid: accountUid(s),
      kind: spec.kind,
      tier: spec.tier,
      ...(spec.kind === 'lost' ? { lostId: pick(ctx.rng, [...LOST_PLACES]).id } : {}),
    };
    s.cartography.specialMaps.push(item);
    created.push(item);
  }
  const atlasKey = `${spec.kind}:${spec.tier}`;
  if (!s.cartography.atlas.includes(atlasKey)) s.cartography.atlas.push(atlasKey);
  if (ctx.offline) {
    const row = s.cartography.awayMaps.find((r) => r.kind === spec.kind && r.tier === spec.tier);
    if (row) row.count += mult;
    else s.cartography.awayMaps.push({ kind: spec.kind, tier: spec.tier, count: mult });
  }
  s.lifetime.mapsDrawn += mult;
  return created;
}

/** Drop scraps from ordinary map rare monsters and map bosses. */
export function rollMapRareScraps(s: GameState, ctx: Ctx): Record<string, number> {
  const perks = atlasSpecialPerks(s);
  const drops: Record<string, number> = {};
  if (chance(ctx.rng, 0.03 * perks.bossScrapMult)) {
    addBank(s, 'boss_scrap', 1);
    drops.boss_scrap = 1;
  }
  if (chance(ctx.rng, 0.02)) {
    addBank(s, 'vault_scrap', 1);
    drops.vault_scrap = 1;
  }
  return drops;
}

export function rollMapBossScraps(s: GameState, ctx: Ctx): Record<string, number> {
  const perks = atlasSpecialPerks(s);
  const base = rInt(ctx.rng, 1, 2);
  const extra = perks.bossScrapMult > 1 && chance(ctx.rng, perks.bossScrapMult - 1) ? 1 : 0;
  const qty = base + extra;
  addBank(s, 'boss_scrap', qty);
  return { boss_scrap: qty };
}

export function migrateCartographyScraps(raw: Record<string, unknown>): void {
  raw.cartography ??= freshCartography();
  const storage = raw.storage as { bank?: Record<string, number> } | undefined;
  if (storage?.bank?.chart_survey_fragment) {
    storage.bank.boss_scrap = (storage.bank.boss_scrap ?? 0) + storage.bank.chart_survey_fragment;
  }
  const mastery = raw.skillingMastery as Record<string, number> | undefined;
  if (mastery?.['task.chart_t1'] !== undefined) {
    mastery['task.special_boss_t1'] = Math.max(mastery['task.special_boss_t1'] ?? 0, mastery['task.chart_t1']);
    delete mastery['task.chart_t1'];
  }
  const act = raw.action as { kind?: string; actionId?: string } | null | undefined;
  if (act?.kind === 'skill' && act.actionId === 'chart_t1') {
    raw.action = null;
  }
}

export function settleCartography(s: GameState): void {
  s.cartography ??= freshCartography();
}

import { foragingSource, HERBS, seedId } from '../data/foraging';
import { actionsFor, type SkillAction } from '../data/skills';
import { materialDef } from '../data/materials';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import { awardProtectedProgress, recordDiscovery } from './professions';
import { chance } from './rng';
import { skillTreeStats } from './skillTree';
import { levelOf } from './xp';
import type { GameState } from './types';

/** Once per completed cycle, independent of ordinary yield/manual doubles. */
export function foragingDone(s: GameState, ctx: Ctx, a: SkillAction, foreground: boolean): void {
  const source = foragingSource(a);
  if (!source) return;
  const c = s.professionProgress.counters;
  if (source.mode !== 'abundant') {
    const key = `foraging.seed.${source.plant}`;
    c[key] = (c[key] ?? 0) + 1;
    if (!s.professionProgress.discoveries[seedId(source.plant)] && (c[key] >= 100 || (foreground && chance(ctx.rng, 0.01)))) recordDiscovery(s, ctx, seedId(source.plant));
  }
  if (source.essences) {
    const key = `foraging.essence.${a.id}`;
    const n = c[key] = (c[key] ?? 0) + 1;
    if (n % 12 === 0) awardProtectedProgress(s, ctx, source.essences[(n / 12 - 1) % source.essences.length], 1);
  }
  if (source.mode === 'bloom') {
    const key = `foraging.bloom.${source.plant}`;
    const n = c[key] = (c[key] ?? 0) + 1;
    const qty = (n % 60 === 0 ? 1 : 0) + (chance(ctx.rng, 0.01) ? 1 : 0);
    if (qty) awardProtectedProgress(s, ctx, source.plant, qty);
  }
}

export function foragingAccessHint(s: GameState, a: SkillAction): string | null {
  if (s.professionProgress.legacyAccess[a.id]) return null;
  if (a.accomplishments?.includes('harvesting_work_100')) {
    const work = s.professionProgress.work.harvesting ?? 0;
    if (work < 100 && !s.professionProgress.legacyAccess.harvesting_work_100) {
      return `Complete Foraging work ${work}/100 times`;
    }
  }
  return null;
}

export function greenhousePlantReason(s: GameState, a: SkillAction): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  if (s.fallen) return 'This character has fallen';
  if (!skillTreeStats(s).greenhouse) return 'Allocate the Greenhouse keystone in the Foraging tree';
  const source = foragingSource(a);
  if (!source) return 'Choose a Foraging plant';
  if (levelOf('harvesting', s.skills.harvesting) < a.level) return `Requires Foraging level ${a.level}`;
  if (!s.professionProgress.discoveries[seedId(source.plant)]) return 'Discover this plant’s seed by Foraging first';
  return null;
}

export function plantGreenhouse(s: GameState, actionId: string): string | null {
  const a = actionsFor('harvesting').find((a) => a.id === actionId);
  if (!a) return 'Choose a Foraging plant';
  const reason = greenhousePlantReason(s, a);
  if (reason) return reason;
  // Re-selecting the same plant must not erase its partial background cycle.
  if (s.greenhouse?.actionId !== actionId) s.greenhouse = { actionId, progress: 0 };
  return null;
}

export function foragingPreview(s: GameState, a: SkillAction): string[] {
  const source = foragingSource(a);
  if (!source) return [];
  const c = s.professionProgress.counters;
  const left = (key: string, n: number) => n - ((c[key] ?? 0) % n);
  const lines = [HERBS.find((h) => h.id === source.plant)?.use ?? 'Protected blooms for later Alchemy distillates, signature meals and nature projects. Those recipes are not available yet. Grown and foraged blooms are the same material.'];
  if (source.mode === 'abundant') lines.push('Herb supply: 2 herbs in 1.5× ordinary time. No essence, bloom or seed progress.');
  else lines.push(`${s.professionProgress.discoveries[seedId(source.plant)] ? 'Seed learned' : `Seed discovery: ${Math.min(100, c[`foraging.seed.${source.plant}`] ?? 0)}/100 completions; 1% early chance per foreground cycle`}. Ordinary and concentrated sources share seed progress; bonuses never add cycles.`);
  if (source.essences) lines.push(`Guaranteed essence every 12 cycles (next in ${left(`foraging.essence.${a.id}`, 12)}): ${source.essences.map((id) => materialDef(id).name).join(' / ')}${source.essences.length > 1 ? ', alternating' : ''}. For Rune-carving and Cooking flask ingredients. Protected from yield and manual doubles.`);
  if (source.mode === 'bloom') lines.push(`One ${materialDef(source.plant).name} every 60 cycles (next in ${left(`foraging.bloom.${source.plant}`, 60)}), plus 1% extra per cycle. Protected from yield/manual doubles. Greenhouse shares this bounded counter at its slower rate.`);
  lines.push('Unlimited material storage. Choose each use in Alchemy, Cooking or Rune-carving yourself.');
  return lines;
}

/** Phase-47 saves predate seed choices too; run once without resetting plant or progress. */
export function settleForagingSeeds(s: GameState): void {
  const c = s.professionProgress.counters;
  if (c['foraging.seedsMigrated']) return;
  if (s.greenhouse) {
    const a = actionsFor('harvesting').find((a) => a.id === s.greenhouse!.actionId);
    const plant = a && foragingSource(a)?.plant;
    if (plant) s.professionProgress.discoveries[seedId(plant)] = true;
  }
  c['foraging.seedsMigrated'] = 1;
}

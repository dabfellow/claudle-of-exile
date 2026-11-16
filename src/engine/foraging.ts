import { foragingSource, seedId } from '../data/foraging';
import { actionsFor, type SkillAction } from '../data/skills';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import { recordDiscovery } from './professions';
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
}

export function foragingAccessHint(_s: GameState, _a: SkillAction): string | null {
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

export function foragingPreview(_s: GameState, _a: SkillAction): string[] {
  return [];
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

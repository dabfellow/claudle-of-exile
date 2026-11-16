import type { SkillAction } from '../data/skills';
import type { Ctx } from './context';
import type { GameState } from './types';

export function miningDone(_s: GameState, _ctx: Ctx, _a: SkillAction): Record<string, number> {
  return {};
}

export function miningPreview(_s: { professionProgress: { counters: Record<string, number> } }, _a: SkillAction): string[] {
  return [];
}

export function miningAccessHint(_s: GameState, _a: SkillAction): string | null {
  return null;
}

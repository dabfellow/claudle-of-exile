import type { SkillAction } from '../data/skills';
import type { Ctx } from './context';
import type { GameState } from './types';

export function woodcuttingDone(_s: GameState, _ctx: Ctx, _a: SkillAction): Record<string, number> {
  return {};
}

export function woodcuttingAccessHint(_s: GameState, _a: SkillAction): string | null {
  return null;
}

export function woodcuttingPreview(_s: { professionProgress: { counters: Record<string, number> } }, _a: SkillAction): string[] {
  return [];
}

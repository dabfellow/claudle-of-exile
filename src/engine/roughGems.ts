import { DELVE_ROUGH_SIZES } from '../data/delve';
import type { Ctx } from './context';
import type { Rng } from './rng';
import type { GameState } from './types';

export const STAR_ROUGH = 'rough_gem_star';
export const ROUGH_TYPES = [...DELVE_ROUGH_SIZES, { id: STAR_ROUGH, carats: 3, name: 'Star Stone' }] as const;
export type RoughGem = (typeof ROUGH_TYPES)[number]['id'];

export function roughType(id: string | undefined) {
  return ROUGH_TYPES.find((rough) => rough.id === id);
}

export function rollRough(rng: Rng, bonus = 0, cavern = false, starChance = 0.001): RoughGem {
  const roll = rng.next();
  if (roll >= 1 - starChance && starChance > 0) return STAR_ROUGH;
  const share = roll / (1 - starChance);
  const carats = share < 0.30 ? 1 : share < 0.80 ? 2 : share < 0.98 ? 3 : 4;
  return DELVE_ROUGH_SIZES[Math.min(cavern ? 5 : 4, carats + bonus) - 1].id;
}

export function starStoneChance(s: GameState): number {
  return (s.gemcutting.catalogue.length >= 100 ? 1.5 : 1) / 1000;
}

export function roughDropBundle(s: GameState, ctx: Ctx, qty: number, bonus = 0, cavern = false): Record<string, number> {
  const drops: Record<string, number> = {};
  const starChance = starStoneChance(s);
  for (let i = 0; i < qty; i++) {
    const id = rollRough(ctx.rng, bonus, cavern, starChance);
    drops[id] = (drops[id] ?? 0) + 1;
  }
  return drops;
}

import { COLLECTIBLE_ODDS, collectibleFor } from '../data/collectibles';
import { chance } from './rng';
import type { Ctx } from './context';
import type { GameState, SkillId } from './types';

/**
 * How much the skilling tree's Curious core node multiplies the find chance. The Skilling tree revamp reads its stat
 * here; until that node exists this is 1.
 */
export function collectibleChanceMult(_s: GameState): number {
  return 1;
}

/**
 * The one call a skill makes per completed action in a zone (offline too). 1 in 2,000 to find that zone's hidden
 * collectible if it has not been found yet. Returns true when it was just found.
 */
export function rollCollectible(s: GameState, ctx: Ctx, skill: SkillId, zone: string): boolean {
  const def = collectibleFor(skill, zone);
  if (!def || s.collectibles.includes(def.id)) return false;
  if (!chance(ctx.rng, (1 / COLLECTIBLE_ODDS) * collectibleChanceMult(s))) return false;
  s.collectibles.push(def.id);
  ctx.emit({ t: 'collectible', id: def.id, name: def.name });
  return true;
}

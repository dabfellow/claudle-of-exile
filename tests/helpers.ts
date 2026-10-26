import type { GameState } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';

/**
 * A character far enough along to use any gem (they have level requirements) and with the Crafting Bench
 * built (salvaging needs it). Most engine tests want this rather than a fresh level 1.
 */
export function veteran(s: GameState, level = 30): GameState {
  s.skills.combat = charXpForLevel(level);
  s.hideout.bench = Math.max(2, s.hideout.bench ?? 1);
  return s;
}

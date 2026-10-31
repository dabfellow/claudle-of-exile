import { BASES, baseDef } from '../src/data/bases';
import { activeGemDef } from '../src/data/gems';
import { createItem } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';

/**
 * A character far enough along to use any gem (they have level requirements) and with the Crafting Bench
 * built (salvaging needs it). Most engine tests want this rather than a fresh level 1.
 */
export function veteran(s: GameState, level = 40): GameState {
  s.skills.combat = charXpForLevel(level);
  s.account.hideout.bench = Math.max(2, s.account.hideout.bench ?? 1);
  return s;
}

/** Put a weapon the skill can be used with in the main hand (the lowest of its first family), unless the current one already fits. */
export function armFor(s: GameState, gemId: string): GameState {
  const need = activeGemDef(gemId).weapons;
  const have = s.equipment.weapon ? baseDef(s.equipment.weapon.baseId).family : undefined;
  if (!need || (have && need.includes(have))) return s;
  const base = BASES.filter((b) => b.family === need[0]).sort((a, b) => a.reqLevel - b.reqLevel)[0];
  s.equipment.weapon = createItem(s, base.id, 1, 'normal', seeded(1));
  if (base.twoHanded) s.equipment.offhand = undefined;
  return s;
}

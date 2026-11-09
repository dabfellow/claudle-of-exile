import { actionsFor } from '../data/skills';
import { actionPlaceNeeded } from '../engine/skills';
import type { GameState, SkillId } from '../engine/types';

/**
 * Where you have to get to before a life skill opens, or null once it's open. A skill is locked while every one of
 * its activities waits on an area, as Cooking and Cartography do; Fishing is "coming soon" instead, so it's never
 * locked here.
 */
export function skillLock(s: GameState, skill: SkillId): string | null {
  const actions = actionsFor(skill).filter((a) => !a.soon);
  if (!actions.length) return null;
  if (actions.some((a) => !actionPlaceNeeded(s, a))) return null;
  const first = [...actions].sort((a, b) => a.level - b.level)[0];
  return actionPlaceNeeded(s, first);
}

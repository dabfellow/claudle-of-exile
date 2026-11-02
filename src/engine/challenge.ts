import { materialDef } from '../data/materials';
import type { ChallengeFlags, CharacterInfo, GameState, Realm } from './types';

/**
 * Challenge modes (docs/design/GDD.md §11): three toggles chosen at creation, in any mix, and fixed from then on.
 * A character's toggles pick its realm, which is the set of hideout, stash and unlocks it uses.
 */

export const STANDARD_REALM: Realm = 'standard';
const SSF_PREFIX = 'ssf-';

/** Hardcore and Classic each trade in a realm of their own; every Solo Self-Found character is a realm of one. */
export function realmFor(challenge: ChallengeFlags | undefined, characterId: string): Realm {
  if (challenge?.ssf) return `${SSF_PREFIX}${characterId}`;
  return [challenge?.hardcore && 'hardcore', challenge?.classic && 'classic'].filter(Boolean).join('-') || STANDARD_REALM;
}

export const realmOf = (c: CharacterInfo): Realm => realmFor(c.challenge, c.id);
export const soloRealm = (realm: Realm): boolean => realm.startsWith(SSF_PREFIX);

export const isHardcore = (s: GameState): boolean => !!s.character.challenge?.hardcore;
export const isSolo = (s: GameState): boolean => !!s.character.challenge?.ssf;
export const isClassic = (s: GameState): boolean => !!s.character.challenge?.classic;

/** "Hardcore SSF Classic", or '' for a normal character. */
export function challengeName(c: ChallengeFlags | undefined): string {
  return [c?.hardcore && 'Hardcore', c?.ssf && 'SSF', c?.classic && 'Classic'].filter(Boolean).join(' ');
}

/** What a Classic character is told when it reaches for a skill. */
export const CLASSIC_BLOCK = 'Classic characters only fight';

/** Classic can't gather, so these parts of a hideout cost are paid in gold, at this many times what they'd sell for. */
const CLASSIC_GOLD_RATE = 5;
const GATHERED = new Set(['ore', 'log', 'herb', 'gem']);

export function classicCost(cost: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(cost)) {
    const mat = materialDef(id);
    if (GATHERED.has(mat.kind)) out.gold = (out.gold ?? 0) + n * mat.value * CLASSIC_GOLD_RATE;
    else out[id] = (out[id] ?? 0) + n;
  }
  return out;
}

/** A hideout cost as this character pays it. */
export function hideoutCost(s: GameState, cost: Record<string, number>): Record<string, number> {
  return isClassic(s) ? classicCost(cost) : cost;
}

/** Bench recipes gated behind skilling achievements are open to Classic from the start, since it can't earn them. */
const SKILLING_ACHIEVEMENTS = new Set(['total_50', 'smith_100']);

export function recipeUnlocked(s: GameState, achievement: string | undefined): boolean {
  return !achievement || s.achievements.includes(achievement) || (isClassic(s) && SKILLING_ACHIEVEMENTS.has(achievement));
}

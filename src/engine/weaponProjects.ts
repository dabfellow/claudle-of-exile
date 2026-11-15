import { runeDef } from '../data/runes';
import type { SkillAction } from '../data/skills';
import type { Ctx } from './context';
import { awardProtectedProgress } from './professions';
import { chance } from './rng';
import type { GameState } from './types';

/** One fragment-work step per completed grade2+ ordinary rune, never per bonus copy. */
export function weaponComponentProgress(s: GameState, ctx: Ctx, a: SkillAction): void {
  if (a.skill !== 'runecarving' || a.protectedOutputs) return;
  const id = Object.keys(a.outputs ?? {}).find((key) => runeDef(key));
  if (!id || runeDef(id)!.grade.grade < 2) return;
  const n = (s.professionProgress.counters['runes.inscription'] ?? 0) + 1;
  s.professionProgress.counters['runes.inscription'] = n;
  if (n % 20 === 0) awardProtectedProgress(s, ctx, 'inscription_fragment', 1);
  if (chance(ctx.rng, .01)) awardProtectedProgress(s, ctx, 'inscription_fragment', 1);
}

export function weaponComponentPreview(s: GameState, a: SkillAction): string[] {
  if (a.id === 'cut_exceptional') return ['Mining crystal deposits guarantee one Crystal Shard every 30 completions. Ten shards and five Rough Gems make one Exceptional Crystal. Full listed inputs, one protected output; no doubled or conserved ingredients. Used by Winter’s Pyre.'];
  if (a.id === 'prepare_return_inscription') return ['Ten Inscription Fragments and one separately carved Keen grade 3 rune make one protected Return Inscription. No double/conservation. Two inscriptions are used by The Homecoming.'];
  const rune = Object.keys(a.outputs ?? {}).map(runeDef).find(Boolean);
  if (a.skill !== 'runecarving' || !rune || rune.grade.grade < 2) return [];
  return [`Inscription Fragment in ${20 - (s.professionProgress.counters['runes.inscription'] ?? 0) % 20} completed grade 2+ runes, plus 1% extra. Bonus copies do not advance fragments. Ten fragments and a Keen grade 3 rune make one Return Inscription for The Homecoming.`];
}

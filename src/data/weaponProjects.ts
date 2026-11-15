import type { SkillAction } from './skills';

/** The specified component routes required by the three finished weapon projects. */
export const WEAPON_COMPONENT_ACTIONS: SkillAction[] = [
  { id: 'cut_exceptional', name: 'Cut Exceptional Crystal', skill: 'gemcutting', level: 60, intervalMs: 60_000, xp: 400,
    inputs: { crystal_shard: 10, rough_gem: 5 }, protectedOutputs: { exceptional_crystal: 1 }, color: '#d0569b' },
  { id: 'prepare_return_inscription', name: 'Prepare Return Inscription', skill: 'runecarving', level: 65, intervalMs: 60_000, xp: 400,
    inputs: { inscription_fragment: 10, rune_keen_3: 1 }, protectedOutputs: { return_inscription: 1 }, color: '#6fa8ff' },
];

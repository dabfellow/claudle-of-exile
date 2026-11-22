import type { SkillAction } from './skills';

/** The specified component routes required by the three finished weapon projects. */
export const WEAPON_COMPONENT_ACTIONS: SkillAction[] = [
  { id: 'cut_exceptional', name: 'Cut Exceptional Crystal', skill: 'gemcutting', level: 60, intervalMs: 60_000, xp: 400,
    inputs: { crystal_shard: 10, rough_gem: 5 }, protectedOutputs: { exceptional_crystal: 1 }, color: '#d0569b' },
  { id: 'prepare_return_inscription', name: 'Prepare Return Inscription', skill: 'cartography', level: 65, intervalMs: 60_000, xp: 400,
    inputs: { inscription_fragment: 10, copper_bar_flawless: 5 }, protectedOutputs: { return_inscription: 1 }, color: '#6fa8ff' },
  { id: 'prepare_choir_inscription', name: 'Prepare Choir Inscription', skill: 'cartography', level: 70, intervalMs: 60_000, xp: 450,
    inputs: { inscription_fragment: 10, iron_bar_flawless: 5 }, protectedOutputs: { choir_inscription: 1 }, color: '#d6453d' },
  { id: 'prepare_circuit_inscription', name: 'Prepare Circuit Inscription', skill: 'cartography', level: 70, intervalMs: 60_000, xp: 450,
    inputs: { inscription_fragment: 10, mithril_bar_flawless: 5 }, protectedOutputs: { circuit_inscription: 1 }, color: '#f2d14c' },
  { id: 'inscribe_convergence', name: 'Inscribe Convergence', skill: 'cartography', level: 90, intervalMs: 120_000, xp: 800,
    inputs: { inscription_fragment: 5, star_bar_flawless: 5 }, protectedOutputs: { convergence_inscription: 1 }, color: '#9b8e7e' },
];

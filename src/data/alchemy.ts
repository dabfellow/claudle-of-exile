import type { SkillAction } from './skills';

export const ALCHEMY_EXPANSION_ACTIONS: SkillAction[] = [
  {
    id: 'brew_mana_medium',
    skill: 'alchemy',
    name: 'Medium Mana Flask',
    level: 15,
    intervalMs: 5000,
    xp: 35,
    inputs: { frostleaf: 6, oak_log: 3 },
    flaskId: 'mana_medium',
    color: '#3d6fd6',
  },
  {
    id: 'prepare_glass',
    skill: 'alchemy',
    name: 'Prepare Glass Reagent',
    level: 40,
    intervalMs: 20000,
    xp: 150,
    inputs: { rough_gem: 3, sunpetal: 10 },
    protectedOutputs: { prepared_glass: 1 },
    color: '#e8d4a0',
  },
  {
    id: 'distill_moon',
    skill: 'alchemy',
    name: 'Distill Moon Essence',
    level: 50,
    intervalMs: 30000,
    xp: 200,
    inputs: { moon_bloom: 2, frostleaf: 10 },
    protectedOutputs: { moon_distillate: 1 },
    color: '#b3d7fa',
  },
  {
    id: 'distill_star',
    skill: 'alchemy',
    name: 'Distill Star Essence',
    level: 65,
    intervalMs: 30000,
    xp: 300,
    inputs: { star_bloom: 2, voidbloom: 10 },
    protectedOutputs: { star_distillate: 1 },
    color: '#d4a9ff',
  },
];

export type AlchemyCategory = 'life' | 'mana' | 'defence' | 'utility' | 'reagents' | 'currency';

export const ALCHEMY_CATEGORIES: { id: AlchemyCategory; label: string }[] = [
  { id: 'life', label: 'Life Flasks' },
  { id: 'mana', label: 'Mana Flasks' },
  { id: 'defence', label: 'Defence Flasks' },
  { id: 'utility', label: 'Utility Flasks' },
  { id: 'reagents', label: 'Special Reagents' },
  { id: 'currency', label: 'Currency' },
];

export function alchemyCategory(a: SkillAction): AlchemyCategory {
  if (a.flaskId) {
    if (['life_small', 'life_medium', 'life_grand', 'life_sacred'].includes(a.flaskId)) return 'life';
    if (['mana_small', 'mana_medium', 'mana_sacred'].includes(a.flaskId)) return 'mana';
    if (['granite', 'ruby', 'amethyst'].includes(a.flaskId)) return 'defence';
    return 'utility';
  }
  if (a.protectedOutputs) return 'reagents';
  return 'currency';
}

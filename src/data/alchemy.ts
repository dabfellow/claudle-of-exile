import type { SkillAction } from './skills';

export interface InfusionDef {
  id: string;
  name: string;
  herb: string;
  level: number;
  effect: string;
  /** 'life_mana' restricts to life/mana flasks */
  flaskKinds?: readonly ('life' | 'mana' | 'utility')[];
  grandOnly?: boolean;
  /** Giga-rare mutation that unlocks this unique infusion */
  rareMutation?: 'celestial' | 'everbloom' | 'prismatic';
}

export const INFUSIONS: readonly InfusionDef[] = [
  { id: 'cleansing', name: 'Cleansing', herb: 'sunpetal', level: 1, effect: 'Removes bleeding and poison on use, and grants 2s immunity' },
  { id: 'instant', name: 'Instant', herb: 'sunpetal', level: 1, effect: 'Life and mana recovery is instant but 30% smaller', flaskKinds: ['life', 'mana'] },
  { id: 'frostguard', name: 'Frostguard', herb: 'frostleaf', level: 12, effect: '+10% cold resistance and no freeze during the effect' },
  { id: 'onslaught', name: 'Onslaught', herb: 'emberroot', level: 25, effect: '+8% attack, cast and movement speed during the effect' },
  { id: 'kindled', name: 'Kindled', herb: 'emberroot', level: 25, effect: '+1 flask charge per 10 crits' },
  { id: 'phasing', name: 'Phasing', herb: 'voidbloom', level: 40, effect: '+10% evasion during the effect' },
  { id: 'clarity', name: 'Clarity', herb: 'moon_bloom', level: 45, effect: '+20% mana regeneration during the effect' },
  { id: 'barbed', name: 'Barbed', herb: 'thornvine', level: 52, effect: 'Reflects 10% of physical damage taken during the effect' },
  { id: 'starlit', name: 'Starlit', herb: 'star_bloom', level: 60, effect: '+6% damage during the effect' },
  { id: 'lingering', name: 'Lingering', herb: 'glimmermoss', level: 68, effect: '+20% effect duration' },
  // Grand-only (Lv 85)
  { id: 'last_breath', name: 'Last Breath', herb: 'wraithlily', level: 85, effect: 'Uses itself when life falls below 35%', grandOnly: true },
  { id: 'overflow', name: 'Overflow', herb: 'wraithlily', level: 85, effect: 'Recovery past full becomes a shield worth 20% of it', grandOnly: true },
  { id: 'echo', name: 'Echo', herb: 'star_bloom', level: 85, effect: "Using it also triggers your next flask's effect at 30%", grandOnly: true },
  // Giga-rare (unlocked by brewing with a giga-rare mutated strain)
  { id: 'starfall', name: 'Starfall', herb: 'sunpetal', level: 1, effect: '+10% damage and +10% all resistances during the effect', rareMutation: 'celestial' },
  { id: 'evergreen', name: 'Evergreen', herb: 'sunpetal', level: 1, effect: 'The flask regains 1 charge every 5s in combat', rareMutation: 'everbloom' },
  { id: 'prism', name: 'Prism', herb: 'sunpetal', level: 1, effect: 'Also gives the infusions of your other equipped flasks at 25%', rareMutation: 'prismatic' },
];

export const INFUSION_BY_ID = new Map(INFUSIONS.map((i) => [i.id, i]));
export const INFUSION_BREW_MS = 10 * 60_000;
export const INFUSION_BREW_HERBS = 20;
export const INFUSION_BREW_XP = 200;
export const MAX_INFUSION_RANK = 10;

export function infusionDef(id: string): InfusionDef | undefined {
  return INFUSION_BY_ID.get(id);
}

export const ALCHEMY_EXPANSION_ACTIONS: SkillAction[] = [
  {
    id: 'brew_infusion',
    skill: 'alchemy',
    name: 'Brew Infusion',
    level: 1,
    intervalMs: INFUSION_BREW_MS,
    xp: INFUSION_BREW_XP,
    color: '#9b6dde',
  },
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
  // Level 80 Grand flask recipes (3x normal inputs + 10 Flawless bars of any metal, paid via engine helper)
  { id: 'grand_life_sacred', skill: 'alchemy', name: 'Grand Sacred Life Flask', level: 80, intervalMs: 21000, xp: 420, inputs: { emberroot: 27, yew_log: 9 }, flaskId: 'life_sacred', grandFlask: true, color: '#e0584f' },
  { id: 'grand_mana_sacred', skill: 'alchemy', name: 'Grand Sacred Mana Flask', level: 80, intervalMs: 18000, xp: 330, inputs: { frostleaf: 27, yew_log: 6 }, flaskId: 'mana_sacred', grandFlask: true, color: '#4f82e8' },
  { id: 'grand_granite', skill: 'alchemy', name: 'Grand Granite Flask', level: 80, intervalMs: 15000, xp: 240, inputs: { frostleaf: 15, iron_ore: 9 }, flaskId: 'granite', grandFlask: true, color: '#9b8e7e' },
  { id: 'grand_quicksilver', skill: 'alchemy', name: 'Grand Quicksilver Flask', level: 80, intervalMs: 15000, xp: 240, inputs: { emberroot: 15, oak_log: 9 }, flaskId: 'quicksilver', grandFlask: true, color: '#c9d3dc' },
  { id: 'grand_diamond', skill: 'alchemy', name: 'Grand Diamond Flask', level: 80, intervalMs: 18000, xp: 270, inputs: { voidbloom: 18, rough_gem: 6 }, flaskId: 'diamond', grandFlask: true, color: '#bfe3ff' },
  { id: 'grand_ruby', skill: 'alchemy', name: 'Grand Ruby Flask', level: 80, intervalMs: 15000, xp: 240, inputs: { emberroot: 15, copper_ore: 9 }, flaskId: 'ruby', grandFlask: true, color: '#ff6a5a' },
  { id: 'grand_amethyst', skill: 'alchemy', name: 'Grand Amethyst Flask', level: 80, intervalMs: 15000, xp: 240, inputs: { voidbloom: 15, rough_gem: 3 }, flaskId: 'amethyst', grandFlask: true, color: '#a36bdc' },
  { id: 'grand_sulphur', skill: 'alchemy', name: 'Grand Sulphur Flask', level: 80, intervalMs: 21000, xp: 510, inputs: { voidbloom: 27, rough_gem: 9 }, flaskId: 'sulphur', grandFlask: true, color: '#d8c94a' },
];

export type AlchemyCategory = 'life' | 'mana' | 'defence' | 'utility' | 'grand' | 'reagents' | 'currency';

export const ALCHEMY_CATEGORIES: { id: AlchemyCategory; label: string }[] = [
  { id: 'life', label: 'Life Flasks' },
  { id: 'mana', label: 'Mana Flasks' },
  { id: 'defence', label: 'Defence Flasks' },
  { id: 'utility', label: 'Utility Flasks' },
  { id: 'grand', label: 'Grand Flasks' },
  { id: 'reagents', label: 'Special Reagents' },
  { id: 'currency', label: 'Currency' },
];

export function alchemyCategory(a: SkillAction): AlchemyCategory {
  if (a.grandFlask) return 'grand';
  if (a.flaskId) {
    if (['life_small', 'life_medium', 'life_grand', 'life_sacred'].includes(a.flaskId)) return 'life';
    if (['mana_small', 'mana_medium', 'mana_sacred'].includes(a.flaskId)) return 'mana';
    if (['granite', 'ruby', 'amethyst'].includes(a.flaskId)) return 'defence';
    return 'utility';
  }
  if (a.protectedOutputs) return 'reagents';
  return 'currency';
}

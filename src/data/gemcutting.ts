import { ACTIVE_GEMS, gemReqLevel, SUPPORT_GEMS, type ActiveGemDef, type SupportGemDef } from './gems';
import type { SkillAction } from './skills';

export type GemFamily = 'attack' | 'elemental' | 'summon' | 'defence' | 'damage_support';

export const GEM_FAMILY_NAMES: Record<GemFamily, string> = {
  attack: 'Attack Gems',
  elemental: 'Elemental Spell Gems',
  summon: 'Summoning Gems',
  defence: 'Defensive Support Gems',
  damage_support: 'Damage Support Gems',
};

export const DEFENCE_SUPPORTS = new Set<string>([
  'life_leech',
  'mana_leech',
  'pilgrims_measure',
  'beggars_cup',
  'alms_of_the_mind',
  'frozen_will',
  'thaw',
  'stone_pulse',
  'salt_thirst',
  'ebb',
  'undertow_of_thought',
  'tribute_of_iron',
  'blood_tax',
  'imperial_vintage',
  'reinforced',
  'eternal_ward',
  'void_ward',
]);

/** Returns the static definitions in a gem family pool before Gemcutting level filtering. */
export function staticFamilyPool(family: GemFamily): (ActiveGemDef | SupportGemDef)[] {
  switch (family) {
    case 'attack':
      return ACTIVE_GEMS.filter((g) => g.tags.includes('attack'));
    case 'elemental':
      return ACTIVE_GEMS.filter((g) => g.tags.includes('spell') && g.effect?.type && ['fire', 'cold', 'light'].includes(g.effect.type));
    case 'summon':
      return ACTIVE_GEMS.filter((g) => g.tags.includes('minion') || g.tags.includes('totem'));
    case 'defence':
      return SUPPORT_GEMS.filter((g) => !g.signatureFor && DEFENCE_SUPPORTS.has(g.id));
    case 'damage_support':
      return SUPPORT_GEMS.filter((g) => !g.signatureFor && !DEFENCE_SUPPORTS.has(g.id));
  }
}

export type GemcuttingCategory = 'general' | 'family' | 'exact_skill' | 'exact_support' | 'crystals';

export const GEMCUTTING_CATEGORIES: { id: GemcuttingCategory; label: string; desc: string }[] = [
  { id: 'general', label: 'General & Recycling', desc: 'Random cuts by gem kind, plus gem recycling for Arcane Dust.' },
  { id: 'family', label: 'Targeted Family Cuts', desc: 'Target broad families of attacks, elemental spells, minions, or defence.' },
  { id: 'exact_skill', label: 'Exact Skill Gems', desc: 'Cut an exact active skill gem of your choice.' },
  { id: 'exact_support', label: 'Exact Support Gems', desc: 'Cut an exact support or signature gem of your choice.' },
  { id: 'crystals', label: 'Crystals & Keys', desc: 'Cut and polish exceptional crystals and realm keys.' },
];

export function gemcuttingCategory(a: SkillAction): GemcuttingCategory {
  if (a.id === 'cut_skill' || a.id === 'cut_support' || a.id === 'cut_signature' || a.id === 'recycle_gem') return 'general';
  if (a.id.startsWith('cut_family_')) return 'family';
  if (a.id.startsWith('cut_exact_')) {
    const isAct = ACTIVE_GEMS.some((g) => g.id === a.gem?.exactId);
    return isAct ? 'exact_skill' : 'exact_support';
  }
  if (a.id === 'cut_exceptional' || a.id === 'polish_exceptional' || a.id === 'cut_expansion' || a.id === 'cut_bell_key') return 'crystals';
  return 'general';
}

const FAMILY_ACTIONS: SkillAction[] = [
  {
    id: 'cut_family_attack',
    skill: 'gemcutting',
    name: 'Attack Gems',
    level: 15,
    intervalMs: 30000,
    xp: 120,
    inputs: { rough_gem: 6, arcane_dust: 50 },
    gem: { kind: 'family', family: 'attack' },
    color: '#d85848',
  },
  {
    id: 'cut_family_elemental',
    skill: 'gemcutting',
    name: 'Elemental Spell Gems',
    level: 15,
    intervalMs: 30000,
    xp: 120,
    inputs: { rough_gem: 6, arcane_dust: 50 },
    gem: { kind: 'family', family: 'elemental' },
    color: '#4aa0e0',
  },
  {
    id: 'cut_family_summon',
    skill: 'gemcutting',
    name: 'Summoning Gems',
    level: 15,
    intervalMs: 30000,
    xp: 120,
    inputs: { rough_gem: 6, arcane_dust: 50 },
    gem: { kind: 'family', family: 'summon' },
    color: '#9060d0',
  },
  {
    id: 'cut_family_defence',
    skill: 'gemcutting',
    name: 'Defensive Support Gems',
    level: 15,
    intervalMs: 30000,
    xp: 120,
    inputs: { rough_gem: 6, arcane_dust: 50 },
    gem: { kind: 'family', family: 'defence' },
    color: '#68b04d',
  },
  {
    id: 'cut_family_damage_support',
    skill: 'gemcutting',
    name: 'Damage Support Gems',
    level: 15,
    intervalMs: 30000,
    xp: 120,
    inputs: { rough_gem: 6, arcane_dust: 50 },
    gem: { kind: 'family', family: 'damage_support' },
    color: '#e08830',
  },
];

const EXACT_ACTIONS: SkillAction[] = [
  ...ACTIVE_GEMS.map((g): SkillAction => ({
    id: `cut_exact_${g.id}`,
    skill: 'gemcutting',
    name: g.name,
    level: Math.max(20, gemReqLevel(g.id)),
    intervalMs: 60000,
    xp: 200,
    inputs: { rough_gem: 12, arcane_dust: 100 },
    gem: { kind: 'exact', exactId: g.id },
    color: g.attr === 'str' ? '#e05848' : g.attr === 'dex' ? '#58c060' : '#4fa0e0',
  })),
  ...SUPPORT_GEMS.map((g): SkillAction => {
    const isSig = !!g.signatureFor;
    return {
      id: `cut_exact_${g.id}`,
      skill: 'gemcutting',
      name: g.name,
      level: Math.max(20, gemReqLevel(g.id) + (isSig ? 5 : 0)),
      intervalMs: 60000,
      xp: 200,
      inputs: { rough_gem: 12, arcane_dust: 100 },
      gem: { kind: 'exact', exactId: g.id },
      color: isSig ? '#e0a640' : g.attr === 'str' ? '#e05848' : g.attr === 'dex' ? '#58c060' : '#4fa0e0',
    };
  }),
];

export const GEMCUTTING_EXPANSION_ACTIONS: SkillAction[] = [
  {
    id: 'recycle_gem',
    skill: 'gemcutting',
    name: 'Recycle Gem',
    level: 1,
    intervalMs: 5000,
    xp: 0,
    color: '#a0a0b0',
  },
  ...FAMILY_ACTIONS,
  ...EXACT_ACTIONS,
  {
    id: 'cut_exceptional',
    skill: 'gemcutting',
    name: 'Cut Exceptional Crystal',
    level: 60,
    intervalMs: 60000,
    xp: 400,
    inputs: { crystal_shard: 10, rough_gem: 5 },
    protectedOutputs: { exceptional_crystal: 1 },
    color: '#d0569b',
  },
  {
    id: 'polish_exceptional',
    skill: 'gemcutting',
    name: 'Polish Convergence Crystal',
    level: 85,
    intervalMs: 120000,
    xp: 800,
    inputs: { exceptional_crystal: 1, arcane_dust: 50 },
    protectedOutputs: { convergence_crystal: 1 },
    color: '#4fc1a6',
  },
];

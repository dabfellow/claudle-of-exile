import type { SkillAction } from './skills';

export const MINING_FOSSILS = ['scorched_fossil', 'frigid_fossil', 'metallic_fossil', 'serrated_fossil', 'dense_fossil'];
export const MINING_METALS = [
  { id: 'copper', name: 'Copper', level: 1, ms: 3000, xp: 7, color: '#c8743f' },
  { id: 'iron', name: 'Iron', level: 15, ms: 3500, xp: 18, color: '#9aa3ad' },
  { id: 'mithril', name: 'Mithril', level: 30, ms: 4000, xp: 38, color: '#6fc3d8' },
  { id: 'adamant', name: 'Adamant', level: 45, ms: 5000, xp: 60, color: '#8ca8c0' },
  { id: 'star', name: 'Star', level: 60, ms: 6000, xp: 80, color: '#e1c46d' },
  { id: 'void', name: 'Void', level: 75, ms: 7000, xp: 100, color: '#9b6dde' },
  { id: 'world', name: 'World', level: 90, ms: 8000, xp: 120, color: '#6ed5a9' },
];
export interface MiningDeposit {
  metal: string;
  mode: 'ordinary' | 'rich' | 'crystal' | 'fossil';
}

/** XP here is raw, before skills.ts applies its existing 0.3 scale once. */
export const MINING_ACTIONS: SkillAction[] = MINING_METALS.slice(1).flatMap((m, index) => {
  const accomplishments = [`prospect_${m.id}`];
  const base = { skill: 'mining' as const, level: m.level, color: m.color, accomplishments };
  const ordinary: SkillAction[] = index >= 2 ? [{
    ...base, id: `mine_${m.id}`, name: `${m.name} Vein`, intervalMs: m.ms, xp: m.xp,
    outputs: { [`${m.id}_ore`]: 1 }, mining: { metal: m.id, mode: 'ordinary' },
  }] : [];
  return [...ordinary, ...(['rich', 'crystal', 'fossil'] as const).map((mode): SkillAction => ({
    ...base, id: `mine_${mode}_${m.id}`, name: `${m.name} ${mode === 'rich' ? 'Rich Deposit' : mode === 'crystal' ? 'Crystal Deposit' : 'Fossil Deposit'}`,
    intervalMs: m.ms * (mode === 'crystal' ? 2 : 1.5), xp: m.xp * (mode === 'crystal' ? 2 : 1.5),
    outputs: mode === 'rich' ? { [`${m.id}_ore`]: 2 } : mode === 'crystal' ? { rough_gem: 1 } : {},
    mining: { metal: m.id, mode },
  }))];
});

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
  const tier = index + 1; // 1 = iron, 2 = mithril, 3 = adamant, 4 = star, 5 = void, 6 = world
  const base = { skill: 'mining' as const, level: m.level, color: m.color };
  const fragments = [
    ...(tier >= 2 ? [{ id: 'mineral_fragment', chance: 0.025, qty: 1 }] : []),
    ...(tier >= 3 ? [{ id: 'stone_fragment', chance: 0.025, qty: 1 }] : []),
  ];
  const ordinary: SkillAction[] = index >= 2 ? [{
    ...base, id: `mine_${m.id}`, name: `${m.name} Vein`, intervalMs: m.ms, xp: m.xp,
    outputs: { [`${m.id}_ore`]: 1 }, bonus: fragments.length ? fragments : undefined, mining: { metal: m.id, mode: 'ordinary' },
  }] : [];
  return [...ordinary, ...(['rich', 'crystal', 'fossil'] as const).map((mode): SkillAction => {
    let outputs: Record<string, number> = {};
    let outputChance: number | undefined = undefined;
    let bonus: { id: string; chance: number; qty: number }[] | undefined = undefined;

    if (mode === 'rich') {
      outputs = { [`${m.id}_ore`]: 2 };
    } else if (mode === 'crystal') {
      outputs = { rough_gem: 1 };
      bonus = [
        { id: `${m.id}_ore`, chance: 0.5, qty: 1 },
        { id: 'crystal_shard', chance: 0.04, qty: 1 },
        ...fragments,
      ];
    } else if (mode === 'fossil') {
      outputs = { [`${m.id}_ore`]: 1 };
      outputChance = 0.5;
      bonus = [
        ...MINING_FOSSILS.map((id) => ({ id, chance: 0.0167, qty: 1 })),
        ...fragments,
      ];
    }

    return {
      ...base,
      id: `mine_${mode}_${m.id}`,
      name: `${m.name} ${mode === 'rich' ? 'Rich Deposit' : mode === 'crystal' ? 'Crystal Deposit' : 'Fossil Deposit'}`,
      intervalMs: m.ms * (mode === 'crystal' ? 2 : 1.5),
      xp: m.xp * (mode === 'crystal' ? 2 : 1.5),
      outputs,
      outputChance,
      bonus,
      mining: { metal: m.id, mode },
    };
  })];
});

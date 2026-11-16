import type { SkillAction } from './skills';

export const WOODS = [
  { id: 'ash', name: 'Ash', level: 1, ms: 3000, xp: 7, color: '#b89a72' },
  { id: 'oak', name: 'Oak', level: 15, ms: 3500, xp: 18, color: '#8a6338' },
  { id: 'yew', name: 'Yew', level: 30, ms: 4000, xp: 38, color: '#6b3d2c' },
  { id: 'ironwood', name: 'Ironwood', level: 45, ms: 5000, xp: 60, color: '#8ca8a0' },
  { id: 'ancient', name: 'Ancient', level: 60, ms: 6000, xp: 80, color: '#c49b60' },
  { id: 'spirit', name: 'Spirit', level: 75, ms: 7000, xp: 100, color: '#a5bdf0' },
  { id: 'worldwood', name: 'Worldwood', level: 90, ms: 8000, xp: 120, color: '#6ed5a9' },
];
export interface WoodcuttingSource { wood: string; mode: 'ordinary' | 'resin' | 'heartwood' }

/** Raw XP; the action registry applies its existing 0.3 scale once. */
export const WOODCUTTING_ACTIONS: SkillAction[] = [
  ...WOODS.flatMap((w, i): SkillAction[] => {
    const base = { skill: 'woodcutting' as const, level: w.level, color: w.color };
    return [
      ...(i >= 3 ? [{ ...base, id: `cut_${w.id}`, name: `${w.name} Tree`, intervalMs: w.ms, xp: w.xp,
        outputs: { [`${w.id}_log`]: 1 }, woodcutting: { wood: w.id, mode: 'ordinary' as const } }] : []),
      { ...base, id: `cut_resin_${w.id}`, name: `${w.name} Resin Stand`, intervalMs: w.ms * 1.5, xp: w.xp * 1.5,
        outputs: {}, woodcutting: { wood: w.id, mode: 'resin' } },
      ...(i >= 3 ? [{ ...base, id: `mill_${w.id}`, name: `Cut ${w.name} Planks`, intervalMs: w.ms, xp: [8, 12, 16, 20][i - 3] / 0.3,
        inputs: { [`${w.id}_log`]: 5 }, outputs: { [`${w.id}_plank`]: 1 } }] : []),
    ];
  }),
  { id: 'cut_heartwood', skill: 'woodcutting', name: 'Ancient Heartwood Survey', level: 30, intervalMs: 8000, xp: 40,
    color: '#c49b60', outputs: {}, woodcutting: { wood: 'yew', mode: 'heartwood' } },
  { id: 'mill_heartwood', skill: 'woodcutting', name: 'Refine Ancient Heartwood', level: 30, intervalMs: 30000, xp: 100,
    color: '#c49b60', inputs: { heartwood_fragment: 20 }, protectedOutputs: { ancient_heartwood: 1 } },
];

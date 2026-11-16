import type { SkillAction } from './skills';

export const HERBS = [
  { id: 'sunpetal', action: 'herb_sun', name: 'Sunpetal', level: 1, ms: 3000, xp: 7, color: '#f2c94c', essences: ['essence_vitality_1'], use: 'Recovery flasks, meals and Alchemy Table upgrades.' },
  { id: 'frostleaf', action: 'herb_frost', name: 'Frostleaf', level: 12, ms: 3500, xp: 16, color: '#7fc8f8', essences: ['essence_frost_2', 'essence_vitality_2'], use: 'Mana and protection brews, meals and Alchemy Table upgrades.' },
  { id: 'emberroot', action: 'herb_ember', name: 'Emberroot', level: 25, ms: 4000, xp: 32, color: '#e2603f', essences: ['essence_embers_2', 'essence_storm_2'], use: 'Damage and life brews, hearty meals and flask ingredients.' },
  { id: 'voidbloom', action: 'herb_void', name: 'Voidbloom', level: 40, ms: 5000, xp: 55, color: '#9b6dde', essences: ['essence_haste_2'], use: 'Utility and high-tier brewing, advanced meals and flask ingredients.' },
];
export interface ForagingSource {
  plant: string;
  mode: 'ordinary' | 'abundant' | 'concentrated' | 'bloom';
  essences?: string[];
}
export const seedId = (plant: string) => `seed_${plant}`;

/** Existing spot outputs, probabilities, intervals and mastery IDs stay intact. */
export function foragingSource(a: SkillAction): ForagingSource | undefined {
  if (a.foraging) return a.foraging;
  const herb = HERBS.find((h) => h.action === a.id);
  if (herb) return { plant: herb.id, mode: 'ordinary' };
  if (a.id === 'herb_emberbloom') return { plant: 'sunpetal', mode: 'ordinary', essences: ['essence_storm_1', 'essence_embers_1'] };
  if (a.id === 'herb_windreed') return { plant: 'frostleaf', mode: 'ordinary' };
  return undefined;
}

/** Raw XP goes through the existing single 0.3 scaling pass. */
export const FORAGING_ACTIONS: SkillAction[] = [
  ...HERBS.flatMap((h): SkillAction[] => [
    { id: `herb_abundant_${h.id}`, skill: 'harvesting', name: `Abundant ${h.name} Patch`, level: h.level, intervalMs: h.ms * 1.5, xp: h.xp * 1.5, color: h.color,
      outputs: { [h.id]: 2 }, foraging: { plant: h.id, mode: 'abundant' } },
    { id: `herb_concentrated_${h.id}`, skill: 'harvesting', name: `Concentrated ${h.name} Patch`, level: h.level + 5, intervalMs: h.ms * 2, xp: h.xp * 2, color: h.color,
      outputs: { [h.id]: 1 }, foraging: { plant: h.id, mode: 'concentrated', essences: h.essences } },
  ]),
  ...([{ plant: 'moon_bloom', id: 'herb_moon', name: 'Moon Bloom', level: 45, ms: 6000, xp: 18, herb: 'frostleaf', color: '#b3d7fa' },
    { plant: 'star_bloom', id: 'herb_star', name: 'Star Bloom', level: 60, ms: 7000, xp: 24, herb: 'voidbloom', color: '#d4a9ff' }]).map((b): SkillAction => ({
      id: b.id, skill: 'harvesting', name: `${b.name} Patch`, level: b.level, intervalMs: b.ms, xp: b.xp / 0.3, color: b.color,
      outputs: { [b.herb]: 1 }, foraging: { plant: b.plant, mode: 'bloom' },
    })),
];

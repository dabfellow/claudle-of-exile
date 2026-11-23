import { MINING_METALS } from './mining';
import type { SkillAction } from './skills';

export const WORLDROOT_DEPTH = 300;
export const DELVE_SECURITY = 200;
export const DELVE_RUBBLE_PER_WORK = 2;
export const DELVE_FOCUS_HOLD_MS = 65_000;

export const DELVE_BANDS = MINING_METALS.map((metal, index) => ({
  ...metal,
  firstLayer: Math.max(1, index * 45),
  ore: `${metal.id}_ore`,
  masteryAction: `delve_${metal.id}`,
}));

export function delveBand(layer: number) {
  return DELVE_BANDS[Math.min(DELVE_BANDS.length - 1, Math.max(0, Math.floor(layer / 45)))];
}

export const DELVE_TRAITS = [
  { id: 'rich', name: 'Rich', icon: '◆', chance: 0.2, from: 1, hint: 'Twice as much ore' },
  { id: 'crystal', name: 'Crystal-bearing', icon: '✧', chance: 0.12, from: 1, hint: 'Rough gems and crystal shards' },
  { id: 'fossil', name: 'Fossil bed', icon: '◎', chance: 0.12, from: 1, hint: 'Fossils and less frequent ore' },
  { id: 'flooded', name: 'Flooded', icon: '≈', chance: 0.10, from: 1, hint: 'Slower work without a Pump Station' },
  { id: 'unstable', name: 'Unstable', icon: 'ϟ', chance: 0.10, from: 1, hint: 'More cave-ins. A breakthrough can open a cavern with bonus ore and rough gems. Deep caverns may also hold rare Heartstone.' },
  { id: 'motherlode', name: 'Motherlode', icon: '✦', chance: 0.002, from: 20, hint: 'Triple ore, extra fragments and rough gems' },
] as const;

export type DelveTrait = (typeof DELVE_TRAITS)[number]['id'];
export type DelveHazard = 'cave-in' | 'flood' | 'gas';
export type DelveMode = 'work' | 'push';

export const DELVE_INSTALLATIONS = {
  flood: { id: 'pump', name: 'Pump Station', security: 30, warning: 'Dripping', fix: 'Pump' },
  gas: { id: 'vent', name: 'Ventilation Shaft', security: 45, warning: 'Hiss', fix: 'Vent' },
  'cave-in': { id: 'bolts', name: 'Rock Bolts', security: 60, warning: 'Creaking', fix: 'Prop' },
} as const;

export type DelveInstallationType = (typeof DELVE_INSTALLATIONS)[DelveHazard]['id'];

export const DELVE_HAZARDS: DelveHazard[] = ['cave-in', 'flood', 'gas'];

/** The standard two-carat rough retains the pre-overhaul item id. */
export const DELVE_ROUGH_SIZES = [
  { id: 'rough_gem_small', carats: 1, name: 'Small Rough Gem' },
  { id: 'rough_gem', carats: 2, name: 'Rough Gem' },
  { id: 'rough_gem_large', carats: 3, name: 'Large Rough Gem' },
  { id: 'rough_gem_huge', carats: 4, name: 'Huge Rough Gem' },
  { id: 'rough_gem_giant', carats: 5, name: 'Giant Rough Gem' },
] as const;

export const DELVE_PICKS = [
  { name: "Prospector's Pick", layer: 1, perk: 'Copper tier' },
  { name: 'Iron Pick', layer: 45, perk: 'Braces cost four rubble each' },
  { name: 'Mithril Pick', layer: 90, perk: 'One extra second to brace hazards' },
  { name: 'Adamant Pick', layer: 135, perk: 'See the next layer’s traits' },
  { name: 'Star Pick', layer: 180, perk: 'Breakthroughs need one fewer brace' },
  { name: 'Void Pick', layer: 225, perk: 'Hazards are 20% less likely' },
  { name: 'World Pick', layer: 270, perk: 'Twice the chance to discover a cavern' },
  { name: 'Heartstone Pick', layer: 300, perk: 'Pushing takes 25% less time' },
] as const;

export const DELVE_ACTIONS: SkillAction[] = [
  { id: 'delve_work', skill: 'mining', name: 'Work the Delve', level: 1, intervalMs: 3000, xp: 7, color: '#c8743f' },
  { id: 'delve_push', skill: 'mining', name: 'Push the Dig Face', level: 1, intervalMs: 40800, xp: 21, color: '#c8743f' },
  ...DELVE_BANDS.map((band): SkillAction => ({
    id: band.masteryAction, skill: 'mining', name: `${band.name} Layers`, level: band.level,
    intervalMs: band.ms, xp: band.xp, outputs: { [band.ore]: 1 }, color: band.color,
  })),
];

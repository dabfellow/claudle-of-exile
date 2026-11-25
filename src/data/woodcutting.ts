import type { GiantPart, GiantSize, LodgeId } from '../engine/types';
import type { SkillAction } from './skills';

/** The forest regions: one wood each. A region is a Woodcutting level band and a collectible zone. */
export const WOODS = [
  { id: 'ash', name: 'Ash', region: 'Ash woods', level: 1, ms: 3000, xp: 7, color: '#b89a72' },
  { id: 'oak', name: 'Oak', region: 'Oak woods', level: 15, ms: 3500, xp: 18, color: '#8a6338' },
  { id: 'yew', name: 'Yew', region: 'Yew woods', level: 30, ms: 4000, xp: 38, color: '#6b3d2c' },
  { id: 'ironwood', name: 'Ironwood', region: 'Ironwood', level: 45, ms: 5000, xp: 60, color: '#8ca8a0' },
  { id: 'ancient', name: 'Ancient', region: 'Ancient woods', level: 60, ms: 6000, xp: 80, color: '#c49b60' },
  { id: 'spirit', name: 'Spirit', region: 'Spirit woods', level: 75, ms: 7000, xp: 100, color: '#a5bdf0' },
  { id: 'worldwood', name: 'Worldwood', region: 'Worldwood grove', level: 90, ms: 8000, xp: 120, color: '#6ed5a9' },
];
export const REGIONS = WOODS;

export function woodDef(id: string) {
  return WOODS.find((w) => w.id === id) ?? WOODS[0];
}

/** What a Woodcutting action is. `giant` cuts the current giant of that wood's region; `sawmill` needs the lodge. */
export interface WoodcuttingSource { wood: string; mode: 'giant' | 'sawmill' }

export const GIANT_PARTS: GiantPart[] = ['crown', 'limbs', 'trunk', 'heart'];
export const PART_NAMES: Record<GiantPart, string> = { crown: 'Crown', limbs: 'Limbs', trunk: 'Trunk', heart: 'Heart' };
export const PART_HINT: Record<GiantPart, string> = {
  crown: 'Resin and twigs. Can be worked any time.',
  limbs: 'Ordinary logs. Can be worked any time.',
  trunk: 'The most timber. When it goes the giant falls.',
  heart: 'Heartwood. Only reachable after the fall.',
};

/** Base HP at Small size, per part. A cut takes 1 off. */
export const BASE_HP: Record<GiantPart, number> = { crown: 10, limbs: 20, trunk: 20, heart: 5 };
/** Size multiplies every part's HP. */
export const SIZE_MULT: Record<GiantSize, number> = { small: 3, medium: 8, large: 20, legend: 200, worldtree: 400 };
export const SIZE_NAMES: Record<GiantSize, string> = { small: 'Small', medium: 'Medium', large: 'Large', legend: 'Legendary', worldtree: 'World Tree' };
/** Size weights for a new giant (legends and the World Tree are never rolled this way). */
export const SIZE_WEIGHTS: { size: GiantSize; weight: number }[] = [{ size: 'small', weight: 40 }, { size: 'medium', weight: 40 }, { size: 'large', weight: 20 }];

/** Yield per cut. */
export const CROWN_RESIN_CHANCE = 0.3;
export const CROWN_LOG_CHANCE = 0.3;
export const TRUNK_BONUS_LOG_CHANCE = 0.5;
export const HEART_FRAGMENT_CHANCE = 0.25;
/** XP on the fall is this many times the region's XP per cut. */
export const FALL_XP_MULT = 10;
export const LEGEND_FALL_XP_MULT = 100;

export const QUIRK_CHANCE = 0.15;
export const MAX_QUIRKS = 2;
/**
 * Region familiarity: every giant felled in a region makes its special giants (quirks and legends) a little more
 * common there, up to double after FAMILIARITY_CAP giants.
 */
export const FAMILIARITY_STEP = 0.02;
export const FAMILIARITY_CAP = 50;
export interface QuirkDef { id: string; name: string; adjective: string; desc: string }
export const QUIRKS: QuirkDef[] = [
  { id: 'resin', name: 'Resin-weeping', adjective: 'Resin-weeping', desc: 'Crown resin chance x3.' },
  { id: 'hollow', name: 'Hollow heart', adjective: 'Hollow-hearted', desc: 'Trunk HP x0.7, heart HP x0.5.' },
  { id: 'lightning', name: 'Lightning-struck', adjective: 'Lightning-struck', desc: 'No crown; trunk yields +25%.' },
  { id: 'twisted', name: 'Twisted grain', adjective: 'Twisted', desc: 'Limb yield x1.5; its logs come in odder lengths, harder to split evenly.' },
  { id: 'towering', name: 'Towering', adjective: 'Towering', desc: 'All HP, yields and XP x1.5.' },
  { id: 'burled', name: 'Burled', adjective: 'Burled', desc: 'Heart HP x2, heartwood fragment chance x2.' },
];
export function quirkDef(id: string): QuirkDef {
  return QUIRKS.find((q) => q.id === id) ?? QUIRKS[0];
}

/** Named legendary giants. They show up from Woodcutting level 80, in these regions only. */
export const LEGEND_MIN_LEVEL = 80;
export const LEGEND_CHANCE = 0.02;
export interface LegendDef { id: string; name: string; region: string; desc: string }
export const LEGENDS: LegendDef[] = [
  { id: 'grandmother_oak', name: 'Grandmother Oak', region: 'ancient', desc: 'An oak so old the villages grew up in her shade and forgot her name.' },
  { id: 'elder_spirit_willow', name: 'The Elder Spirit-Willow', region: 'spirit', desc: 'A weeping willow older than the kingdom. Its branches hum when no wind blows.' },
  { id: 'worldwood_sentinel', name: 'The Worldwood Sentinel', region: 'worldwood', desc: 'A grey-barked guardian at the edge of the grove. Nothing has ever grown near it.' },
  { id: 'stormcrowned_yew', name: 'The Stormcrowned Yew', region: 'ancient', desc: 'A yew that holds a storm in its crown and releases it only for the brave.' },
];
export function legendDef(id: string): LegendDef | undefined {
  return LEGENDS.find((l) => l.id === id);
}
export const LEGEND_HEART_MIN = 3;
export const LEGEND_HEART_MAX = 5;
export const WORLD_TREE_SEED_CHANCE = 0.01;
export const WORLD_TREE_GROWTH_MS = 120 * 24 * 3600 * 1000;
export const WORLD_TREE_HEARTWOOD = 10;

/** The lodge: built from your own logs and planks. */
export interface LodgeTier { level: number; cost: Record<string, number>; effect: string }
export interface LodgeDef { id: LodgeId; name: string; desc: string; tiers: LodgeTier[] }
export const LODGE: LodgeDef[] = [
  {
    id: 'scoutTower', name: 'Lookout Tower', desc: 'Spots the unusual giants in whichever woods you are working.',
    tiers: [
      { level: 20, cost: { oak_log: 200 }, effect: 'Special giants (Resin-weeping, Burled and the rest) turn up 1.5 times as often.' },
      { level: 70, cost: { ancient_log: 500 }, effect: 'Legendary giants turn up 1.5 times as often.' },
    ],
  },
  {
    id: 'dryingShed', name: 'Drying Shed', desc: 'Seasons the wood from neat splits.',
    tiers: [
      { level: 30, cost: { yew_log: 300 }, effect: 'A double split also gives +1 log.' },
      { level: 60, cost: { ancient_log: 300 }, effect: 'A normal hit also gives +1 log, 25% of the time.' },
    ],
  },
  {
    id: 'whetstone', name: 'Whetstone', desc: 'Keeps your axe edge keen between swings.',
    tiers: [
      { level: 1, cost: { ash_log: 60 }, effect: 'Cuts 3% faster.' },
      { level: 25, cost: { oak_log: 250 }, effect: 'Cuts 6% faster.' },
      { level: 50, cost: { ironwood_log: 350 }, effect: 'Cuts 9% faster.' },
    ],
  },
  {
    id: 'sapBuckets', name: 'Sap Buckets', desc: 'Hung under the crown to catch what weeps from it.',
    tiers: [
      { level: 8, cost: { ash_log: 120 }, effect: 'Crown resin chance +10%.' },
      { level: 35, cost: { yew_log: 250, ash_resin: 10 }, effect: 'Crown resin chance +20%.' },
      { level: 65, cost: { ancient_log: 300, yew_resin: 20 }, effect: 'Crown resin chance +30%.' },
    ],
  },
  {
    id: 'logRack', name: 'Log Rack', desc: 'Stacks trunk timber neatly so less of it is wasted.',
    tiers: [
      { level: 12, cost: { ash_log: 200 }, effect: 'Trunk cuts have a 5% chance of an extra log.' },
      { level: 40, cost: { yew_log: 300 }, effect: 'Trunk cuts have a 10% chance of an extra log.' },
      { level: 75, cost: { spirit_log: 300 }, effect: 'Trunk cuts have a 15% chance of an extra log.' },
    ],
  },
  {
    id: 'heartChisel', name: 'Heart Chisel', desc: 'Fine tools for working heartwood out cleanly.',
    tiers: [
      { level: 18, cost: { oak_log: 150, heartwood_fragment: 10 }, effect: 'Heartwood fragments turn up 10% more often.' },
      { level: 45, cost: { ironwood_log: 250, heartwood_fragment: 30 }, effect: 'Heartwood fragments turn up 20% more often.' },
      { level: 80, cost: { spirit_log: 250, heartwood_fragment: 80 }, effect: 'Heartwood fragments turn up 30% more often.' },
    ],
  },
];
/** The Trophy Wall uses a cost based on the first legend felled. */
export const TROPHY_WALL: LodgeDef = {
  id: 'trophyWall', name: 'Trophy Wall', desc: 'Shows the legends you have felled. Needed to plant a World Tree seed.',
  tiers: [{ level: 1, cost: {}, effect: 'Displays felled legends with date and yields.' }],
};
/** Per tier of each small lodge bonus. */
export const WHETSTONE_SPEED = 3;
export const SAP_BUCKET_RESIN = 10;
export const LOG_RACK_CHANCE = 0.05;
export const HEART_CHISEL_MULT = 0.1;
export function lodgeDef(id: LodgeId): LodgeDef {
  return id === 'trophyWall' ? TROPHY_WALL : LODGE.find((l) => l.id === id)!;
}
export const TROPHY_WALL_PLANKS = 100;

/**
 * Sawmill recipes. They belong to Woodcrafting (owner's call, 2026-11-22): sawing gives Woodcrafting XP and is done at
 * the Woodcrafting bench's Sawmill tab; the ids stay `mill_*` so mastery and saves carry over.
 */
const sawmillAction = (id: string, name: string, wood: string, level: number, intervalMs: number, xp: number, color: string, extra: Partial<SkillAction>): SkillAction => ({
  id, skill: 'woodcrafting', name, level, intervalMs, xp, color, woodcutting: { wood, mode: 'sawmill' }, ...extra,
});

/** Raw XP; the action registry applies its existing 0.3 scale once. */
export const WOODCUTTING_ACTIONS: SkillAction[] = [
  // one cutting action per region: the part and the giant are state, not actions
  ...WOODS.map((w): SkillAction => ({
    id: `giant_${w.id}`, skill: 'woodcutting', name: `${w.region}`, level: w.level, intervalMs: w.ms, xp: w.xp,
    outputs: { [`${w.id}_log`]: 1 }, color: w.color, woodcutting: { wood: w.id, mode: 'giant' },
  })),
  sawmillAction('mill_ash', 'Cut Ash Planks', 'ash', 1, 3000, 8, '#b89a72', { inputs: { ash_log: 5 }, outputs: { ash_plank: 1 } }),
  sawmillAction('mill_oak', 'Cut Oak Planks', 'oak', 15, 3500, 20, '#8a6338', { inputs: { oak_log: 5 }, outputs: { oak_plank: 1 }, area: 'ashwood' }),
  sawmillAction('mill_yew', 'Cut Yew Planks', 'yew', 30, 4000, 42, '#6b3d2c', { inputs: { yew_log: 5 }, outputs: { yew_plank: 1 }, area: 'shipgrave' }),
  ...WOODS.slice(3).map((w, i) => sawmillAction(`mill_${w.id}`, `Cut ${w.name} Planks`, w.id, w.level, w.ms, [8, 12, 16, 20][i] / 0.3, w.color, {
    inputs: { [`${w.id}_log`]: 5 }, outputs: { [`${w.id}_plank`]: 1 },
  })),
  sawmillAction('mill_heartwood', 'Refine Ancient Heartwood', 'ancient', 30, 30000, 100, '#c49b60', { inputs: { heartwood_fragment: 20 }, protectedOutputs: { ancient_heartwood: 1 } }),
];

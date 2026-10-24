import type { SkillId } from '../engine/types';
import type { MaterialDef } from './materials';

/**
 * Crafting materials from life skills (docs/SKILLING_REWORK.md): Fossils bias which mods roll,
 * Essences force one mod, Resin raises the item level of smithed bases, shards fuse into orbs.
 */
export interface FossilDef {
  id: string;
  name: string;
  color: string;
  /** affix groups made more likely, and by how much */
  more: string[];
  mult: number;
  /** affix groups that can't roll at all */
  block: string[];
  desc: string;
}

const DEFENCES = ['flat_armour', 'inc_armour', 'flat_evasion', 'inc_evasion', 'flat_es', 'inc_es'];

export const FOSSILS: FossilDef[] = [
  { id: 'scorched_fossil', name: 'Scorched Fossil', color: '#e2603f', more: ['added_fire', 'fire_res'], mult: 5, block: ['added_cold', 'cold_res'], desc: 'More fire modifiers, no cold modifiers' },
  { id: 'frigid_fossil', name: 'Frigid Fossil', color: '#7fc8f8', more: ['added_cold', 'cold_res'], mult: 5, block: ['added_fire', 'fire_res'], desc: 'More cold modifiers, no fire modifiers' },
  { id: 'metallic_fossil', name: 'Metallic Fossil', color: '#f2d14c', more: ['added_light', 'light_res'], mult: 5, block: ['added_phys', 'inc_phys'], desc: 'More lightning modifiers, no physical modifiers' },
  { id: 'dense_fossil', name: 'Dense Fossil', color: '#9b8e7e', more: DEFENCES, mult: 4, block: ['added_phys', 'added_fire', 'added_cold', 'added_light'], desc: 'More defence modifiers, no added damage' },
  { id: 'serrated_fossil', name: 'Serrated Fossil', color: '#c9c9d3', more: ['added_phys', 'inc_phys', 'attack_speed', 'crit_chance', 'crit_multi'], mult: 3, block: DEFENCES, desc: 'More attack modifiers, no defence modifiers' },
];

export interface EssenceDef {
  id: string;
  name: string;
  color: string;
  affixId: string;
  /** affix tier index the mod is forced at (0 = the item level 1 tier, 1 = the item level 8 tier) */
  tier: number;
  /** the greater essence a Distiller can turn this one into */
  upgrade?: string;
}

const essence = (key: string, label: string, color: string, affixId: string, tier: 0 | 1): EssenceDef => ({
  id: `essence_${key}_${tier + 1}`,
  name: `${tier === 0 ? 'Lesser' : 'Greater'} Essence of ${label}`,
  color,
  affixId,
  tier,
  upgrade: tier === 0 ? `essence_${key}_2` : undefined,
});

export const ESSENCES: EssenceDef[] = [
  essence('vitality', 'Vitality', '#d6453d', 'flat_life', 0),
  essence('embers', 'Embers', '#e2603f', 'fire_res', 0),
  essence('frost', 'Frost', '#7fc8f8', 'cold_res', 0),
  essence('storm', 'Storm', '#f2d14c', 'light_res', 0),
  essence('vitality', 'Vitality', '#d6453d', 'flat_life', 1),
  essence('embers', 'Embers', '#e2603f', 'fire_res', 1),
  essence('frost', 'Frost', '#7fc8f8', 'cold_res', 1),
  essence('storm', 'Storm', '#f2d14c', 'light_res', 1),
  essence('haste', 'Haste', '#6fae4a', 'attack_speed', 1),
];

export interface ResinDef {
  id: string;
  name: string;
  color: string;
  /** item levels added to a smithed base (still capped by campaign progress) */
  ilvl: number;
}

export const RESINS: ResinDef[] = [
  { id: 'ash_resin', name: 'Ash Resin', color: '#d9b15a', ilvl: 2 },
  { id: 'oak_resin', name: 'Oak Resin', color: '#b07a2c', ilvl: 4 },
];

/** Every gathering action has a small chance at its skill's orb shard; Alchemy fuses them. */
export const SHARD_FOR: Partial<Record<SkillId, string>> = {
  mining: 'aug_shard',
  woodcutting: 'trans_shard',
  harvesting: 'alt_shard',
};
export const SHARD_ORB: Record<string, string> = { aug_shard: 'augment', trans_shard: 'transmute', alt_shard: 'alteration' };
export const SHARD_CHANCE = 0.02;
export const SHARDS_PER_ORB = 20;

/** Act bosses drop a few Fossils or Essences. */
export const BOSS_CRAFT_MAT = { chance: 0.5, qty: [1, 2] as [number, number] };

export const CRAFT_MATERIALS: MaterialDef[] = [
  ...FOSSILS.map((f): MaterialDef => ({ id: f.id, name: f.name, kind: 'fossil', color: f.color, value: 15, desc: `${f.desc}. Use with an orb or when smithing.` })),
  ...ESSENCES.map((e): MaterialDef => ({ id: e.id, name: e.name, kind: 'essence', color: e.color, value: e.tier ? 20 : 8, desc: 'Makes an item Magic with one guaranteed modifier.' })),
  ...RESINS.map((r): MaterialDef => ({ id: r.id, name: r.name, kind: 'resin', color: r.color, value: r.ilvl * 3, desc: `+${r.ilvl} item level on a smithed base (capped by campaign progress).` })),
  { id: 'aug_shard', name: 'Augmentation Shard', kind: 'shard', color: '#5f8de0', value: 0, desc: `${SHARDS_PER_ORB} fuse into an Orb of Augmentation.` },
  { id: 'trans_shard', name: 'Transmutation Shard', kind: 'shard', color: '#7fb2ff', value: 0, desc: `${SHARDS_PER_ORB} fuse into an Orb of Transmutation.` },
  { id: 'alt_shard', name: 'Alteration Shard', kind: 'shard', color: '#9fd2ff', value: 0, desc: `${SHARDS_PER_ORB} fuse into an Orb of Alteration.` },
];

const FOSSIL_BY_ID: Record<string, FossilDef> = Object.fromEntries(FOSSILS.map((f) => [f.id, f]));
const ESSENCE_BY_ID: Record<string, EssenceDef> = Object.fromEntries(ESSENCES.map((e) => [e.id, e]));
const RESIN_BY_ID: Record<string, ResinDef> = Object.fromEntries(RESINS.map((r) => [r.id, r]));

export const fossilDef = (id: string): FossilDef | undefined => FOSSIL_BY_ID[id];
export const essenceDef = (id: string): EssenceDef | undefined => ESSENCE_BY_ID[id];
export const resinDef = (id: string): ResinDef | undefined => RESIN_BY_ID[id];

/** Spawn-weight multipliers by affix group for a roll made with this fossil. */
export function modBias(fossilId: string): Record<string, number> {
  const f = FOSSIL_BY_ID[fossilId];
  const bias: Record<string, number> = {};
  for (const g of f.more) bias[g] = f.mult;
  for (const g of f.block) bias[g] = 0;
  return bias;
}

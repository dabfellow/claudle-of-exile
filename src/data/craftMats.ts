import type { SkillId } from '../engine/types';
import type { MaterialDef } from './materials';

/**
 * Crafting materials from life skills (docs/GAME.md): Fossils bias which mods roll,
 * Essences force one mod, Resin raises the item level of smithed bases, shards fuse into orbs.
 * Contraband from Heist (docs/GAME.md) protects a craft instead of steering it.
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

const DEFENCES = [
  'flat_armour', 'inc_armour', 'inc_armour_global', 'flat_evasion', 'inc_evasion', 'inc_evasion_global', 'flat_es', 'inc_es', 'inc_es_global',
  'inc_armour_evasion', 'inc_armour_es', 'inc_evasion_es', 'flat_armour_evasion', 'flat_armour_es', 'flat_evasion_es', 'es_and_mana',
];
const ADDED = ['added_phys', 'added_fire', 'added_cold', 'added_light', 'spell_fire', 'spell_cold', 'spell_light'];

export const FOSSILS: FossilDef[] = [
  { id: 'scorched_fossil', name: 'Scorched Fossil', color: '#e2603f', more: ['added_fire', 'spell_fire', 'inc_fire', 'fire_res'], mult: 5, block: ['added_cold', 'spell_cold', 'inc_cold', 'cold_res'], desc: 'More fire modifiers, no cold modifiers' },
  { id: 'frigid_fossil', name: 'Frigid Fossil', color: '#7fc8f8', more: ['added_cold', 'spell_cold', 'inc_cold', 'cold_res'], mult: 5, block: ['added_fire', 'spell_fire', 'inc_fire', 'fire_res'], desc: 'More cold modifiers, no fire modifiers' },
  { id: 'metallic_fossil', name: 'Metallic Fossil', color: '#f2d14c', more: ['added_light', 'spell_light', 'inc_light', 'light_res'], mult: 5, block: ['added_phys', 'inc_phys', 'inc_phys_global'], desc: 'More lightning modifiers, no physical modifiers' },
  { id: 'dense_fossil', name: 'Dense Fossil', color: '#9b8e7e', more: DEFENCES, mult: 4, block: ADDED, desc: 'More defence modifiers, no added damage' },
  { id: 'serrated_fossil', name: 'Serrated Fossil', color: '#c9c9d3', more: ['added_phys', 'inc_phys', 'inc_phys_global', 'attack_speed', 'crit_chance', 'crit_multi'], mult: 3, block: DEFENCES, desc: 'More attack modifiers, no defence modifiers' },
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

/** Thieving's currency, and the two crafting materials only Heist makes in quantity. */
export const MARKER = 'rogues_marker';
export const SEAL = 'forgers_seal';
export const WAX = 'locksmiths_wax';
/** Combat can find Contraband too, rarely, from Act 2 on: skilling is the faster route, never the only one. */
export const CONTRABAND_DROP = { bossChance: 0.12, killChance: 0.0006, firstAct: 2 };

export const CRAFT_MATERIALS: MaterialDef[] = [
  ...FOSSILS.map((f): MaterialDef => ({ id: f.id, name: f.name, kind: 'fossil', color: f.color, value: 15, desc: `${f.desc}. Use with an orb or when smithing.` })),
  ...ESSENCES.map((e): MaterialDef => ({ id: e.id, name: e.name, kind: 'essence', color: e.color, value: e.tier ? 20 : 8, desc: 'Makes an item Magic with one guaranteed modifier.' })),
  ...RESINS.map((r): MaterialDef => ({ id: r.id, name: r.name, kind: 'resin', color: r.color, value: r.ilvl * 3, desc: `+${r.ilvl} item level on a smithed base (capped by campaign progress).` })),
  { id: 'aug_shard', name: 'Augmentation Shard', kind: 'shard', color: '#5f8de0', value: 0, desc: `${SHARDS_PER_ORB} fuse into an Orb of Augmentation.` },
  { id: 'trans_shard', name: 'Transmutation Shard', kind: 'shard', color: '#7fb2ff', value: 0, desc: `${SHARDS_PER_ORB} fuse into an Orb of Transmutation.` },
  { id: 'alt_shard', name: 'Alteration Shard', kind: 'shard', color: '#9fd2ff', value: 0, desc: `${SHARDS_PER_ORB} fuse into an Orb of Alteration.` },
  { id: MARKER, name: "Rogue's Marker", kind: 'contraband', color: '#c9a35a', value: 1, desc: 'Pays for Heist jobs and rogues. Earned by Thieving.' },
  { id: SEAL, name: "Forger's Seal", kind: 'contraband', color: '#b5473c', value: 60, desc: 'Spent with an Alteration, Chaos, Annulment or Divine: one modifier you pick is left alone.' },
  { id: WAX, name: "Locksmith's Wax", kind: 'contraband', color: '#d9c48a', value: 90, desc: 'Takes an impression of an item. Restore it any time to put the item back as it was.' },
  { id: 'fractured_orb', name: 'Fractured Orb', kind: 'trophy', color: '#c08bff', value: 600, desc: 'Dropped in Doomed Maps. Used for top-end fracturing crafts.' },
  { id: 'marrow_key', name: 'Marrow Key', kind: 'trophy', color: '#b8a890', value: 400, desc: 'Opens the Map Device portal to Ossuar.' },
  { id: 'bell_key', name: 'Bell Key', kind: 'trophy', color: '#f2d14c', value: 400, desc: 'Opens the Map Device portal to Mother Vael.' },
  { id: 'abyssal_key', name: 'Abyssal Key', kind: 'trophy', color: '#5f8f9e', value: 400, desc: 'Opens the Map Device portal to The Undertow.' },
  { id: 'regent_key', name: 'Joined Regent Key', kind: 'trophy', color: '#e2603f', value: 400, desc: 'Opens the Map Device portal to the Twin Regents.' },
  { id: 'crownless_key', name: 'Crownless Key', kind: 'trophy', color: '#d8c070', value: 1200, desc: 'Forged from all four Hard Boss keys or shards. Opens the Map Device portal to The Crownless.' },
  { id: 'marrow_shard', name: 'Marrow Shards', kind: 'trophy', color: '#b8a890', value: 500, desc: 'Dropped by Ossuar, the Hollow Mountain. Used for high-tier station upgrades and physical crafts.' },
  { id: 'choir_glass', name: 'Choir Glass', kind: 'trophy', color: '#f2d14c', value: 500, desc: 'Dropped by Mother Vael, the Last Choir. Used for high-tier station upgrades and caster crafts.' },
  { id: 'black_pearl', name: 'Black Pearl', kind: 'trophy', color: '#5f8f9e', value: 500, desc: 'Dropped by The Undertow. Used for high-tier station upgrades and speed/cold crafts.' },
  { id: 'throne_ash', name: 'Throne Ash', kind: 'trophy', color: '#e2603f', value: 500, desc: 'Dropped by The Twin Regents. Used for high-tier station upgrades and elemental/attack crafts.' },
  { id: 'crownless_sigil', name: 'Crownless Sigil', kind: 'trophy', color: '#d8c070', value: 1500, desc: 'Dropped by The Crownless. Used for pinnacle hideout upgrades and crafts.' },
  { id: 'uber_key_1', name: 'Uber Key I: The Mirror', kind: 'trophy', color: '#d0569b', value: 1000, desc: 'Dropped by Doomed Map bosses. Opens the portal to The First Exile.' },
  { id: 'uber_key_2', name: 'Uber Key II: The Ruin', kind: 'trophy', color: '#e85a4f', value: 1000, desc: 'Dropped by Doomed Map bosses. Opens the portal to The Architect of Ruin.' },
  { id: 'uber_key_3', name: 'Uber Key III: The Void', kind: 'trophy', color: '#9b6dde', value: 1000, desc: 'Dropped by Doomed Map bosses. Opens the portal to The Void Sovereign.' },
  { id: 'exile_doom_sigil', name: "Exile's Doom Sigil", kind: 'trophy', color: '#e8c25a', value: 2000, desc: 'Dropped by The First Exile. Elevates one Tier 1 modifier on a rare item to Tier 0 Doom Tier.' },
  { id: 'architect_doom_sigil', name: "Architect's Doom Sigil", kind: 'trophy', color: '#e85a4f', value: 2000, desc: 'Dropped by The Architect of Ruin. Imbues a rare item with a Doom Implicit modifier.' },
  { id: 'void_sigil', name: 'Void Sigil', kind: 'trophy', color: '#9b6dde', value: 2000, desc: 'Dropped by The Void Sovereign. Unlocks a 7th modifier slot on a rare item.' },
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

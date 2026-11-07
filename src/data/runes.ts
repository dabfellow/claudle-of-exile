import type { StatKey } from '../engine/types';
import type { MaterialDef } from './materials';
import { describeStat } from './statText';

/**
 * Rune-carving, Act 3's skill (docs/GAME.md): carve a rune from gathered materials, then inscribe it in a
 * piece of gear's one rune slot. The same rune means something different on a weapon, on armour and on jewellery.
 */
export type RuneReading = 'weapon' | 'armour' | 'jewellery';

export const RUNE_READINGS: { id: RuneReading; label: string }[] = [
  { id: 'weapon', label: 'Weapon' },
  { id: 'armour', label: 'Armour' },
  { id: 'jewellery', label: 'Jewellery' },
];

export interface RuneFamilyDef {
  id: string;
  name: string;
  color: string;
  /** what each reading gives, and its value at each grade */
  reads: Record<RuneReading, { stat: StatKey; values: [number, number, number, number] }>;
  /** the old material that gives the rune its nature: `low` for the first two grades, `high` for the last two */
  flavour: { low: string; high: string };
}

export const RUNE_FAMILIES: RuneFamilyDef[] = [
  {
    id: 'ember', name: 'Ember', color: '#e2603f',
    reads: {
      weapon: { stat: 'firePct', values: [8, 12, 18, 26] },
      armour: { stat: 'fireRes', values: [5, 8, 12, 16] },
      jewellery: { stat: 'highLifeElem', values: [5, 8, 12, 16] },
    },
    flavour: { low: 'essence_embers_1', high: 'scorched_fossil' },
  },
  {
    id: 'rime', name: 'Rime', color: '#7fc8f8',
    reads: {
      weapon: { stat: 'coldPct', values: [8, 12, 18, 26] },
      armour: { stat: 'coldRes', values: [5, 8, 12, 16] },
      jewellery: { stat: 'chillOnHit', values: [3, 5, 7, 10] },
    },
    flavour: { low: 'frigid_fossil', high: 'essence_frost_2' },
  },
  {
    id: 'storm', name: 'Storm', color: '#f2d14c',
    reads: {
      weapon: { stat: 'lightPct', values: [8, 12, 18, 26] },
      armour: { stat: 'lightRes', values: [5, 8, 12, 16] },
      jewellery: { stat: 'physAsLight', values: [2, 3, 4, 6] },
    },
    flavour: { low: 'essence_storm_1', high: 'metallic_fossil' },
  },
  {
    id: 'stone', name: 'Stone', color: '#9b8e7e',
    reads: {
      weapon: { stat: 'stunChance', values: [3, 5, 7, 10] },
      armour: { stat: 'slamReduction', values: [2, 3, 4, 6] },
      jewellery: { stat: 'armourVsElem', values: [2, 3, 5, 7] },
    },
    flavour: { low: 'ash_resin', high: 'dense_fossil' },
  },
  {
    id: 'blood', name: 'Blood', color: '#d6453d',
    reads: {
      weapon: { stat: 'overkillHeal', values: [1, 2, 3, 5] },
      armour: { stat: 'life', values: [8, 14, 22, 32] },
      jewellery: { stat: 'lifeRegenPct', values: [0.1, 0.15, 0.2, 0.3] },
    },
    flavour: { low: 'essence_vitality_1', high: 'essence_vitality_2' },
  },
  {
    id: 'keen', name: 'Keen', color: '#c9c9d3',
    reads: {
      weapon: { stat: 'lowLifeDamage', values: [4, 6, 9, 14] },
      armour: { stat: 'evadeHeal', values: [0.3, 0.5, 0.7, 1] },
      jewellery: { stat: 'critFullLife', values: [6, 10, 14, 20] },
    },
    flavour: { low: 'oak_resin', high: 'serrated_fossil' },
  },
];

export interface RuneGradeDef {
  grade: number;
  name: string;
  /** Rune-carving level of the first family; each family after it comes two levels later */
  level: number;
  /** an item must be at least this level to hold the rune */
  ilvl: number;
  intervalMs: number;
  xp: number;
  /** everything but the flavour material */
  inputs: Record<string, number>;
  /** how many of the flavour material */
  flavour: number;
}

export const RUNE_GRADES: RuneGradeDef[] = [
  { grade: 1, name: 'Scratched', level: 1, ilvl: 1, intervalMs: 15000, xp: 30, inputs: { copper_ore: 20, ash_log: 10 }, flavour: 1 },
  { grade: 2, name: 'Carved', level: 15, ilvl: 20, intervalMs: 20000, xp: 90, inputs: { iron_ore: 20, oak_log: 10, sunpetal: 10 }, flavour: 1 },
  { grade: 3, name: 'Deep', level: 30, ilvl: 32, intervalMs: 25000, xp: 180, inputs: { mithril_ore: 20, emberroot: 10, rough_gem: 2 }, flavour: 2 },
  { grade: 4, name: 'Sainted', level: 45, ilvl: 45, intervalMs: 30000, xp: 300, inputs: { mithril_ore: 40, yew_log: 20, voidbloom: 10, rough_gem: 4 }, flavour: 3 },
];

export interface RuneDef {
  id: string;
  name: string;
  family: RuneFamilyDef;
  grade: RuneGradeDef;
}

export const RUNES: RuneDef[] = RUNE_GRADES.flatMap((grade) =>
  RUNE_FAMILIES.map((family) => ({ id: `rune_${family.id}_${grade.grade}`, name: `${grade.name} ${family.name} Rune`, family, grade })),
);

const RUNE_BY_ID: Record<string, RuneDef> = Object.fromEntries(RUNES.map((r) => [r.id, r]));

export const runeDef = (id: string): RuneDef | undefined => RUNE_BY_ID[id];

/** What this rune gives in this reading, before Resonance and Deep Cuts. */
export function runeEffect(rune: RuneDef, reading: RuneReading): { stat: StatKey; value: number } {
  const r = rune.family.reads[reading];
  return { stat: r.stat, value: r.values[rune.grade.grade - 1] };
}

/** Rune-carving opens at the first area of Act 3, which isn't named here so the skill doesn't depend on its data. */
export const RUNE_GATE = { zone: 'pilgrimgate', label: 'Act 3' };

/** Each other equipped piece with a rune of the same family makes this one this much stronger. */
export const RESONANCE_PER_PIECE = 0.05;

/** Combat finds the two lowest grades, rarely, from Act 3 on: the skill is the faster route, never the only one. */
export const RUNE_DROP = { bossChance: 0.2, killChance: 0.0005, firstAct: 3, maxGrade: 2 };

export const RUNE_MATERIALS: MaterialDef[] = RUNES.map((r) => ({
  id: r.id,
  name: r.name,
  kind: 'rune',
  color: r.family.color,
  value: 20 * r.grade.grade ** 2,
  desc: `${RUNE_READINGS.map((x) => {
    const e = runeEffect(r, x.id);
    return `${x.label}: ${describeStat(e.stat, e.value)}`;
  }).join('. ')}.`,
}));

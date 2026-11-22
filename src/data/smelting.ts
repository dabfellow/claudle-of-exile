import type { MaterialDef } from './materials';
import { MINING_METALS } from './mining';
import type { SkillAction } from './skills';

export const BAR_GRADES = ['crude', 'refined', 'pure', 'flawless'] as const;
export type BarGrade = typeof BAR_GRADES[number];
export type BarGradePreference = 'lowest' | BarGrade;
export const BAR_GRADE_NAMES: Record<BarGrade, string> = {
  crude: 'Crude', refined: 'Refined', pure: 'Pure', flawless: 'Flawless',
};
const GRADE_VALUES: Record<BarGrade, number> = { crude: -1, refined: 0, pure: 1, flawless: 2 };

export function barId(metal: string, grade: BarGrade): string {
  return `${metal}_bar${grade === 'refined' ? '' : `_${grade}`}`;
}

const BAR_IDS = Object.fromEntries(MINING_METALS.flatMap(({ id: metal }) =>
  BAR_GRADES.map((grade) => [barId(metal, grade), { metal, grade }]),
)) as Record<string, { metal: string; grade: BarGrade } | undefined>;

export function barGradeOf(id: string) {
  return BAR_IDS[id];
}

export function barPurityBonus(inputsUsed: Record<string, number>): number {
  let score = 0;
  let bars = 0;
  for (const [id, count] of Object.entries(inputsUsed)) {
    const grade = barGradeOf(id)?.grade;
    if (!grade) continue;
    score += GRADE_VALUES[grade] * count;
    bars += count;
  }
  return bars ? score / bars : 0;
}

export function recipeStock(bank: Readonly<Record<string, number>>, id: string): number {
  const bar = barGradeOf(id);
  if (bar?.grade !== 'refined') return bank[id] ?? 0;
  return BAR_GRADES.reduce((total, grade) => total + (bank[barId(bar.metal, grade)] ?? 0), 0);
}

/** Resolve a recipe's flexible bars into exact debits. Reserve specific grades before using substitutes. */
export function resolveBarCost(
  bank: Readonly<Record<string, number>>,
  cost: Readonly<Record<string, number>>,
  preference: BarGradePreference = 'lowest',
): Record<string, number> | null {
  const used: Record<string, number> = {};
  const flexible: { metal: string; count: number }[] = [];
  for (const [id, count] of Object.entries(cost)) {
    if (count === 0) continue;
    const bar = barGradeOf(id);
    if (bar?.grade === 'refined') flexible.push({ metal: bar.metal, count });
    else if ((bank[id] ?? 0) < count) return null;
    else used[id] = count;
  }

  const grades = preference === 'lowest' ? BAR_GRADES : [preference, ...BAR_GRADES.filter((grade) => grade !== preference)];
  for (const { metal, count } of flexible) {
    let remaining = count;
    for (const grade of grades) {
      const id = barId(metal, grade);
      const reserved = used[id] ?? 0;
      const take = Math.min(remaining, Math.max(0, (bank[id] ?? 0) - reserved));
      if (take) used[id] = reserved + take;
      remaining -= take;
      if (!remaining) break;
    }
    if (remaining) return null;
  }
  return used;
}

export const FURNACE_FUELS = ['charcoal', 'coke', 'starcoal'] as const;
export const FURNACE_FLUXES = ['crushed_stone', 'bone_ash', 'crystal_flux'] as const;
export type FurnaceSupply = typeof FURNACE_FUELS[number] | typeof FURNACE_FLUXES[number];
export const FURNACE_PARTS = ['firebrick', 'bellows', 'crucible', 'flue'] as const;
export type FurnacePart = typeof FURNACE_PARTS[number];
export const FURNACE_PART_LEVELS = [15, 35, 55, 75] as const;
export const FURNACE_PART_METALS = ['iron', 'mithril', 'adamant', 'star'] as const;
export const FURNACE_PART_NAMES: Record<FurnacePart, string> = {
  firebrick: 'Firebrick lining', bellows: 'Bellows', crucible: 'Crucible', flue: 'Flue',
};
export const FURNACE_PART_EFFECTS: Record<FurnacePart, string> = {
  firebrick: '8% shorter bar cycles per tier.',
  bellows: '10% wider target band per tier.',
  crucible: 'One extra bar per tier. Each extra bar uses 5 more ore and multiplies cycle time by 1.5.',
  flue: 'One more point of purity per tier.',
};

export type MasterAlloyId = 'kingsbronze' | 'moonsilver' | 'dragonsteel' | 'voidglass';

interface MasterAlloyDef {
  id: MasterAlloyId;
  name: string;
  level: number;
  inputs: Record<string, number>;
  signature: string;
  color: string;
}

export const MASTER_ALLOYS: MasterAlloyDef[] = [
  { id: 'kingsbronze', name: 'Kingsbronze', level: 80, inputs: { copper_bar_flawless: 10, iron_bar_flawless: 5, world_bar_flawless: 1 }, signature: '+20% item rarity and room for one extra crafted mod', color: '#e9b26b' },
  { id: 'moonsilver', name: 'Moonsilver', level: 85, inputs: { mithril_bar_flawless: 5, star_bar_flawless: 5 }, signature: '+8% maximum energy shield and +8% maximum mana', color: '#afc8ea' },
  { id: 'dragonsteel', name: 'Dragonsteel', level: 90, inputs: { adamant_bar_flawless: 5, star_bar_flawless: 5, void_bar_flawless: 2 }, signature: '12% of physical damage added as fire', color: '#e78562' },
  { id: 'voidglass', name: 'Voidglass', level: 95, inputs: { void_bar_flawless: 5, world_bar_flawless: 5 }, signature: '+15% chaos resistance and 10% of damage added as chaos', color: '#bd9ee9' },
];

export function masterAlloyFor(itemId: string): { id: MasterAlloyId; living: boolean } | undefined {
  const living = itemId.startsWith('living_');
  const alloy = MASTER_ALLOYS.find(({ id }) => itemId === (living ? `living_${id}` : id));
  return alloy ? { id: alloy.id, living } : undefined;
}

const SUPPLY_MATERIALS: MaterialDef[] = [
  { id: 'charcoal', name: 'Charcoal', kind: 'component', color: '#847a70', value: 0 },
  { id: 'coke', name: 'Coke', kind: 'component', color: '#655f60', value: 0 },
  { id: 'starcoal', name: 'Starcoal', kind: 'component', color: '#e1ac61', value: 0 },
  { id: 'crushed_stone', name: 'Crushed Stone', kind: 'component', color: '#b7a28d', value: 0 },
  { id: 'bone_ash', name: 'Bone Ash', kind: 'component', color: '#d8cbbb', value: 0 },
  { id: 'crystal_flux', name: 'Crystal Flux', kind: 'component', color: '#c995ed', value: 0 },
];

export const FURNACE_MATERIALS: MaterialDef[] = [
  ...MINING_METALS.flatMap((metal, index) => BAR_GRADES.filter((grade) => grade !== 'refined').map((grade): MaterialDef => ({
    id: barId(metal.id, grade), name: `${BAR_GRADE_NAMES[grade]} ${metal.name} Bar`, kind: 'component',
    color: metal.color, value: index < 3 ? [10, 25, 60][index] : 0,
    desc: 'Uses the same recipes as a Refined bar. Its grade affects equipment rolls.',
  }))),
  ...SUPPLY_MATERIALS,
  { id: 'living_metal', name: 'Living Metal', kind: 'component', color: '#f3c98d', value: 0, desc: 'A rare furnace find at purity 8 or higher. Adds a second signature to a Master alloy.' },
  ...MASTER_ALLOYS.flatMap((alloy): MaterialDef[] => [
    { id: alloy.id, name: alloy.name, kind: 'component', color: alloy.color, value: 0, desc: alloy.signature },
    { id: `living_${alloy.id}`, name: `Living ${alloy.name}`, kind: 'component', color: alloy.color, value: 0, desc: `${alloy.signature}. A second signature is revealed when Forged.` },
  ]),
];

function prepare(id: string, name: string, level: number, inputs: Record<string, number>, supply: FurnaceSupply, count = 1): SkillAction {
  return {
    id, name, level, skill: 'smelting', intervalMs: 4_000 + level * 100, xp: 8 + level,
    inputs, outputs: { [supply]: count }, color: '#d6b67b',
  };
}

export const FURNACE_PREPARATIONS: SkillAction[] = [
  prepare('furnace_charcoal_splinters', 'Burn Charcoal from Splinters', 1, { splinters: 10 }, 'charcoal'),
  prepare('furnace_charcoal_logs', 'Burn Charcoal from Logs', 1, { ash_log: 5 }, 'charcoal'),
  prepare('furnace_coke', 'Make Coke', 30, { charcoal: 4, rubble: 2 }, 'coke'),
  prepare('furnace_starcoal', 'Make Starcoal', 60, { coke: 5, star_ore: 1 }, 'starcoal'),
  prepare('furnace_crushed_stone', 'Crush Rubble', 1, { rubble: 5 }, 'crushed_stone'),
  prepare('furnace_bone_ash', 'Make Bone Ash', 30, { scorched_fossil: 1 }, 'bone_ash', 5),
  prepare('furnace_crystal_flux', 'Make Crystal Flux', 60, { crystal_shard: 1 }, 'crystal_flux', 5),
];

export const MASTER_ALLOY_ACTIONS: SkillAction[] = MASTER_ALLOYS.flatMap((alloy) => [false, true].map((living): SkillAction => {
  const output = living ? `living_${alloy.id}` : alloy.id;
  return {
    id: `alloy_master_${output}`, skill: 'smelting', name: `Make ${living ? 'Living ' : ''}${alloy.name}`,
    level: alloy.level, intervalMs: 600_000, xp: 1_200, inputs: living ? { ...alloy.inputs, living_metal: 1 } : { ...alloy.inputs },
    protectedOutputs: { [output]: 1 }, color: alloy.color,
  };
}));

export const FURNACE_ACTIONS = [...FURNACE_PREPARATIONS, ...MASTER_ALLOY_ACTIONS];

export function smeltMetal(actionId: string) {
  return MINING_METALS.find(({ id }) => actionId === `smelt_${id}`);
}

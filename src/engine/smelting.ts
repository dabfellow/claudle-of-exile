import { MINING_FOSSILS, MINING_METALS } from '../data/mining';
import {
  barId, BAR_GRADES, FURNACE_FLUXES, FURNACE_FUELS, FURNACE_PART_LEVELS, FURNACE_PART_METALS,
  FURNACE_PARTS, resolveBarCost, smeltMetal, type BarGrade, type BarGradePreference,
  type FurnacePart, type FurnaceSupply,
} from '../data/smelting';
import type { SkillAction } from '../data/skills';
import { WOODS } from '../data/woodcutting';
import { addBank, hasItem, payResolvedCost } from './bank';
import type { Ctx } from './context';
import { chance } from './rng';
import type { GameState } from './types';
import { levelOf } from './xp';

const BARS_PER_SUPPLY = 5;
const PART_COST = 50;
const LIVING_METAL_CHANCE = 1 / 2000;
const LIVING_METAL_MIN_PURITY = 8;

type Fuel = typeof FURNACE_FUELS[number];
type Flux = typeof FURNACE_FLUXES[number];

export interface SmeltingState {
  fuel: Fuel | null;
  flux: Flux | null;
  /** Credit already purchased from each supply. Swapping slots leaves unused credit alone. */
  charges: Partial<Record<FurnaceSupply, number>>;
  parts: Record<FurnacePart, number>;
  stats: { flawless: number; living: number };
  barGrade: BarGradePreference;
  showSupplyHint: boolean;
}

export function initialSmelting(): SmeltingState {
  return {
    fuel: null, flux: null, charges: {},
    parts: { firebrick: 0, bellows: 0, crucible: 0, flue: 0 },
    stats: { flawless: 0, living: 0 },
    barGrade: 'lowest', showSupplyHint: true,
  };
}

export function smeltingBlocker(s: GameState, a: SkillAction): string | null {
  if (!a.id.startsWith('alloy_master_')) return null;
  return FURNACE_PARTS.filter((part) => s.smelting.parts[part] >= FURNACE_PART_LEVELS.length).length < 2
    ? 'Needs two Tier 4 furnace parts'
    : null;
}

export function furnaceBatchSize(s: GameState, a?: SkillAction): number {
  return (a?.batch ?? 1) + s.smelting.parts.crucible;
}

export function smeltingInterval(s: GameState, a: SkillAction): number {
  if (!smeltMetal(a.batchOf ?? a.id)) return 1;
  return (1 - 0.08 * s.smelting.parts.firebrick) * 1.5 ** s.smelting.parts.crucible;
}

function flexibleCost(bank: Record<string, number>, ids: readonly string[], amount: number): Record<string, number> {
  const paid: Record<string, number> = {};
  let remaining = amount;
  for (const id of ids) {
    const take = Math.min(remaining, bank[id] ?? 0);
    if (take > 0) paid[id] = take;
    remaining -= take;
    if (!remaining) break;
  }
  if (remaining > 0) paid[ids[0]] = (paid[ids[0]] ?? 0) + remaining;
  return paid;
}

/** Recipe cost before allocating bar grades. Crucible work always requires its extra ore. */
export function smeltingCost(s: GameState, a: SkillAction, cost: Record<string, number>): Record<string, number> {
  const id = a.batchOf ?? a.id;
  const metal = smeltMetal(id);
  if (metal && s.smelting.parts.crucible > 0) {
    const ore = `${metal.id}_ore`;
    return { ...cost, [ore]: (cost[ore] ?? 0) + 5 * s.smelting.parts.crucible };
  }
  if (id === 'furnace_charcoal_logs') return flexibleCost(s.storage.bank, WOODS.map(({ id }) => `${id}_log`), cost.ash_log ?? 0);
  if (id === 'furnace_bone_ash') return flexibleCost(s.storage.bank, MINING_FOSSILS, cost.scorched_fossil ?? 0);
  return cost;
}

export function furnacePartUpgrade(s: GameState, part: FurnacePart) {
  const current = s.smelting.parts[part];
  const metal = FURNACE_PART_METALS[current];
  if (!metal) return null;
  const cost = { [barId(metal, 'refined')]: PART_COST };
  const level = FURNACE_PART_LEVELS[current];
  const paid = resolveBarCost(s.storage.bank, cost, s.smelting.barGrade);
  const blocker = levelOf('smelting', s.skills.smelting) < level ? `Requires Smelting level ${level}`
    : paid ? null : 'Missing materials';
  return { cost, blocker, paid };
}

export function improveFurnacePart(s: GameState, part: FurnacePart): string | null {
  const upgrade = furnacePartUpgrade(s, part);
  if (!upgrade) return 'Part is already fully upgraded';
  if (upgrade.blocker) return upgrade.blocker;
  payResolvedCost(s, upgrade.paid!);
  s.smelting.parts[part]++;
  return null;
}

function supplyTier(s: GameState, supply: FurnaceSupply | null, choices: readonly FurnaceSupply[]): number {
  if (!supply || (!(s.smelting.charges[supply] ?? 0) && !hasItem(s, supply, 1))) return 0;
  return choices.indexOf(supply) + 1;
}

export function purityScore(s: GameState): number {
  return Math.min(14, s.smelting.parts.flue + Math.floor(levelOf('smelting', s.skills.smelting) / 20)
    + supplyTier(s, s.smelting.fuel, FURNACE_FUELS) + supplyTier(s, s.smelting.flux, FURNACE_FLUXES));
}

/** Percentage points for each outcome. */
export function purityOdds(score: number): Record<BarGrade, number> {
  const p = Math.max(0, Math.min(14, score));
  const crude = Math.max(5, 40 - 5 * p);
  const pure = Math.min(40, 3 * p);
  const flawless = Math.min(15, p * p / 12);
  return { crude, refined: 100 - crude - pure - flawless, pure, flawless };
}

function rollGrade(score: number, roll: number): BarGrade {
  const odds = purityOdds(score);
  let cutoff = 0;
  for (const grade of BAR_GRADES) {
    cutoff += odds[grade];
    if (roll * 100 < cutoff) return grade;
  }
  return 'flawless';
}

function burnSupply(s: GameState, supply: FurnaceSupply | null): void {
  if (!supply) return;
  const credit = s.smelting.charges[supply] ?? 0;
  if (credit > 0) s.smelting.charges[supply] = credit - 1;
  else if (hasItem(s, supply, 1)) {
    s.storage.bank[supply]--;
    s.smelting.charges[supply] = BARS_PER_SUPPLY - 1;
  }
}

/** Actual bar cycles consume furnace supplies. Bonus copies keep the grade of a bar from that cycle. */
export function finishSmelt(
  s: GameState, ctx: Ctx, a: SkillAction, baseCount: number, focusDouble: boolean,
): Record<string, number> | null {
  const metal = smeltMetal(a.batchOf ?? a.id);
  if (!metal) return null;
  const outputs: Record<string, number> = {};
  const give = (id: string, count: number) => {
    const added = addBank(s, id, count);
    if (added > 0) outputs[id] = (outputs[id] ?? 0) + added;
    return added;
  };
  const batch = furnaceBatchSize(s, a);
  const extra = Math.max(0, baseCount - (a.batch ?? 1));
  let bestScore = 0;
  for (let i = 0; i < batch; i++) {
    const score = purityScore(s);
    bestScore = Math.max(bestScore, score);
    const grade = rollGrade(score, ctx.rng.next());
    const count = (focusDouble && !ctx.offline ? 2 : 1) + (i === 0 ? extra : 0);
    const added = give(barId(metal.id, grade), count);
    if (grade === 'flawless') s.smelting.stats.flawless += added;
    burnSupply(s, s.smelting.fuel);
    burnSupply(s, s.smelting.flux);
  }
  if (bestScore >= LIVING_METAL_MIN_PURITY && chance(ctx.rng, LIVING_METAL_CHANCE)) {
    const added = give('living_metal', 1);
    s.smelting.stats.living += added;
    if (added) ctx.emit({ t: 'info', text: 'Living Metal formed in the furnace.', tone: 'good' });
  }
  return outputs;
}

export function bellowsBandWidth(metal: string, tier: number): number {
  const index = MINING_METALS.findIndex(({ id }) => id === metal);
  const base = 0.25 - 0.13 * (Math.max(0, index) / (MINING_METALS.length - 1));
  return base * (1 + 0.10 * tier);
}

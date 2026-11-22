import type { GameState } from './types';
import type { Ctx } from './context';
import { isCurrency, isMaterial } from '../data/materials';
import { recipeStock, resolveBarCost } from '../data/smelting';
import { DELVE_ROUGH_SIZES } from '../data/delve';

export const MATERIAL_CAP = 5_000;

export function materialRoom(s: GameState, id: string): number {
  return id !== 'gold' && isMaterial(id) && !isCurrency(id)
    ? Math.max(0, MATERIAL_CAP - (s.storage.bank[id] ?? 0))
    : Infinity;
}

/** Integer material conservation realizes fractional event costs without creating fractional orbs. */
export function payCraftCost(s: GameState, ctx: Ctx, cost: Record<string, number>): void {
  const mult = Math.max(0.5, Math.min(1, ctx.event?.craftingCost ?? 1));
  const discounted: Record<string, number> = {};
  for (const [id, qty] of Object.entries(cost)) {
    const expected = qty * mult;
    discounted[id] = Math.floor(expected) + (expected % 1 > 0 && ctx.rng.next() < expected % 1 ? 1 : 0);
  }
  payCost(s, discounted);
}

export function hasItem(s: GameState, id: string, qty: number): boolean {
  return (s.storage.bank[id] ?? 0) >= qty;
}

export function canAfford(s: GameState, cost: Record<string, number>): boolean {
  return resolveRecipeCost(s, cost) !== null;
}

export function resolveRecipeCost(s: GameState, cost: Record<string, number>): Record<string, number> | null {
  const bank = s.storage.bank;
  if (!cost.rough_gem) return resolveBarCost(bank, cost, s.smelting?.barGrade);
  const { rough_gem: requested, ...resolved } = cost;
  let remaining = requested;
  for (const { id } of DELVE_ROUGH_SIZES) {
    const reserved = resolved[id] ?? 0;
    const used = Math.min(remaining, Math.max(0, (bank[id] ?? 0) - reserved));
    if (used) resolved[id] = reserved + used;
    remaining -= used;
    if (!remaining) return resolveBarCost(bank, resolved, s.smelting?.barGrade);
  }
  return null;
}

export function recipeMaterialCount(bank: Readonly<Record<string, number>>, id: string): number {
  if (id !== 'rough_gem') return recipeStock(bank, id);
  return DELVE_ROUGH_SIZES.reduce((count, size) => count + (bank[size.id] ?? 0), 0);
}

export function payResolvedCost(s: GameState, cost: Record<string, number>): void {
  for (const [id, n] of Object.entries(cost)) s.storage.bank[id] = (s.storage.bank[id] ?? 0) - n;
}

export function payCost(s: GameState, cost: Record<string, number>): void {
  const resolved = resolveRecipeCost(s, cost);
  if (resolved) payResolvedCost(s, resolved);
}

export function addBank(s: GameState, id: string, qty: number): number {
  const added = Math.min(qty, materialRoom(s, id));
  if (added) s.storage.bank[id] = (s.storage.bank[id] ?? 0) + added;
  return added;
}

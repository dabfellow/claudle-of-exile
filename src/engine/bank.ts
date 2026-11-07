import type { GameState } from './types';
import type { Ctx } from './context';

/** Integer material conservation realizes fractional event costs without creating fractional orbs. */
export function payCraftCost(s: GameState, ctx: Ctx, cost: Record<string, number>): void {
  const mult = Math.max(0.5, Math.min(1, ctx.event?.craftingCost ?? 1));
  for (const [id, qty] of Object.entries(cost)) {
    const expected = qty * mult;
    const used = Math.floor(expected) + (expected % 1 > 0 && ctx.rng.next() < expected % 1 ? 1 : 0);
    s.account.bank[id] = (s.account.bank[id] ?? 0) - used;
  }
}

export function hasItem(s: GameState, id: string, qty: number): boolean {
  return (s.account.bank[id] ?? 0) >= qty;
}

export function canAfford(s: GameState, cost: Record<string, number>): boolean {
  return Object.entries(cost).every(([id, n]) => hasItem(s, id, n));
}

export function payCost(s: GameState, cost: Record<string, number>): void {
  for (const [id, n] of Object.entries(cost)) s.account.bank[id] = (s.account.bank[id] ?? 0) - n;
}

export function addBank(s: GameState, id: string, qty: number): void {
  s.account.bank[id] = (s.account.bank[id] ?? 0) + qty;
}

import type { GameState } from './types';

export function hasItem(s: GameState, id: string, qty: number): boolean {
  return (s.bank[id] ?? 0) >= qty;
}

export function canAfford(s: GameState, cost: Record<string, number>): boolean {
  return Object.entries(cost).every(([id, n]) => hasItem(s, id, n));
}

export function payCost(s: GameState, cost: Record<string, number>): void {
  for (const [id, n] of Object.entries(cost)) s.bank[id] = (s.bank[id] ?? 0) - n;
}

export function addBank(s: GameState, id: string, qty: number): void {
  s.bank[id] = (s.bank[id] ?? 0) + qty;
}

import type { GameState } from './types';

/** How many currencies can sit in the top bar at once. */
export const MAX_PINNED_CURRENCIES = 5;

/** The currencies pinned to the top bar, in the order they were pinned. None by default. */
export function pinnedCurrencies(s: GameState): string[] {
  return s.settings.pinnedCurrencies ?? [];
}

/** Pin a currency to the top bar, or unpin it. Returns why it can't be pinned, or null. */
export function toggleCurrencyPin(s: GameState, id: string): string | null {
  const pins = pinnedCurrencies(s);
  if (pins.includes(id)) {
    s.settings.pinnedCurrencies = pins.filter((p) => p !== id);
    return null;
  }
  if (pins.length >= MAX_PINNED_CURRENCIES) return `The top bar holds ${MAX_PINNED_CURRENCIES} currencies: unpin one first`;
  s.settings.pinnedCurrencies = [...pins, id];
  return null;
}

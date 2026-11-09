import { isSolo } from '../engine/challenge';
import type { GameState } from '../engine/types';
import { game } from '../game';
import { MARKET_OPEN, marketApi } from '../platform/market';

/**
 * While the Player Market is closed (MARKET_OPEN), it only stays in the sidebar for a player who still has something
 * on it: a listing up, an auction they're winning, or a step waiting on the server. This asks the server once per
 * account and realm, and again after a cancel.
 */
const known = { key: '', onMarket: 0 };

const keyNow = () => `${game.account?.id ?? ''}:${game.realm.realm}`;

export async function refreshMarketLeftovers(): Promise<void> {
  const key = keyNow();
  const access = game.marketAccess;
  if (access === 'guest' || access === 'solo') return;
  const api = marketApi(game.realm.realm);
  if (!api) return;
  try {
    const [mine, bids] = await Promise.all([api.browse({ scope: 'mine' }), api.browse({ scope: 'bids' })]);
    if (known.key !== key) return;
    const n = mine.length + bids.length;
    if (n !== known.onMarket) {
      known.onMarket = n;
      game.notify();
    }
  } catch {
    // the market can't be reached: try again next session
  }
}

/** Whether the sidebar lists the market. */
export function marketInNav(s: GameState): boolean {
  if (MARKET_OPEN) return !isSolo(s);
  const key = keyNow();
  if (known.key !== key) {
    known.key = key;
    known.onMarket = 0;
    void refreshMarketLeftovers();
  }
  return known.onMarket > 0 || (s.account.marketHolds?.length ?? 0) > 0;
}

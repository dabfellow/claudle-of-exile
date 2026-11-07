import { uniqueDef } from '../data/bases';
import { STASH_PAGE_SIZE } from '../data/hideout';
import { CURRENCIES } from '../data/materials';
import { seeUnique } from './account';
import { addBank } from './bank';
import { takeOwned } from './storage';
import type { GameState, Item, MarketHold } from './types';

/**
 * The player's side of the Player Market (docs/GAME.md). The server holds listings and money, but the browser
 * owns the save, so anything sent to the server is taken from the player first and kept as a hold. If the reply is lost,
 * the hold is still there, and the server is asked whether that step finished.
 */

export const MARKET_CUT_PCT = 10;
export const MARKET_MAX_PRICE = 1e12;
export const MARKET_MAX_LISTINGS = 20;
export const MARKET_UNLOCK_BOSS = 'sanctum';

/** What the seller gets: the market's cut is rounded down. */
export function saleProceeds(price: number): number {
  return price - Math.floor((price * MARKET_CUT_PCT) / 100);
}

/** The lowest bid that counts. The same sum as the server's market_min_bid. */
export function minBid(price: number, highBid: number | null): number {
  return highBid === null ? price : highBid + Math.max(1, Math.ceil(highBid * 0.05));
}

export function marketHold(s: GameState, op: string): MarketHold | undefined {
  return s.account.marketHolds?.find((h) => h.op === op);
}

function addHold(s: GameState, hold: MarketHold): void {
  (s.account.marketHolds ??= []).push(hold);
}

/** Take an item out of the bag or stash to list it. Returns why it can't be, if it can't. */
export function holdItem(s: GameState, op: string, uid: number): string | null {
  if (!op || marketHold(s, op)) return 'That market request is already pending or invalid';
  const [item] = takeOwned(s, [uid]);
  if (!item) return 'That item is being crafted or has gone';
  if (item.uniqueId && uniqueDef(item.uniqueId).noTrade) {
    s.inventory.push(item);
    return "That item can't be traded";
  }
  addHold(s, { op, item });
  return null;
}

/** Take a price out of the bank. Returns why it can't be, if it can't. */
export function holdPayment(s: GameState, op: string, currency: string, amount: number): string | null {
  if (!op || marketHold(s, op)) return 'That market request is already pending or invalid';
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > MARKET_MAX_PRICE) return 'That price is invalid';
  if (currency !== 'gold' && !CURRENCIES.some((c) => c.id === currency)) return 'That currency cannot be traded';
  if (!Number.isFinite(s.account.bank[currency] ?? 0)) return 'That balance is invalid';
  if ((s.account.bank[currency] ?? 0) < amount) return `You can't afford that`;
  s.account.bank[currency] -= amount;
  addHold(s, { op, currency, amount });
  return null;
}

/** Put an item in the Uniques tab, or the first stash page with room, or the overflow, so a market item is never lost to a full stash. */
function shelve(s: GameState, item: Item): void {
  const a = s.account;
  item.uid = a.nextUid++;
  if (item.rarity === 'unique') {
    a.uniqueStash.push(item);
    seeUnique(a, item);
  } else (a.stash.find((p) => p.length < STASH_PAGE_SIZE) ?? a.overflow).push(item);
}

/** The server answered. A step it refused gives back what was held. */
export function releaseHold(s: GameState, op: string, refund: boolean): void {
  const hold = marketHold(s, op);
  if (!hold) return;
  s.account.marketHolds = s.account.marketHolds!.filter((h) => h !== hold);
  if (!refund) return;
  if (hold.item) shelve(s, hold.item);
  if (hold.currency) addBank(s, hold.currency, hold.amount!);
}

export interface MarketDelivery {
  currency: string | null;
  amount: number | null;
  item: Item | null;
  note: string;
}

/** Bring what the market was keeping into the account. */
export function receiveDeliveries(s: GameState, rows: MarketDelivery[]): void {
  for (const row of rows) {
    if (row.currency && row.amount) addBank(s, row.currency, row.amount);
    if (row.item) shelve(s, row.item);
  }
}

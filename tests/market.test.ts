import { describe, expect, it } from 'vitest';
import { STASH_PAGE_SIZE } from '../src/data/hideout';
import { BASES } from '../src/data/bases';
import { mergeAccounts } from '../src/engine/account';
import { holdItem, holdPayment, marketHold, minBid, receiveDeliveries, releaseHold, saleProceeds } from '../src/engine/market';
import { newGame } from '../src/engine/state';
import type { GameState, Item } from '../src/engine/types';

const item = (s: GameState): Item => ({ uid: s.account.nextUid++, baseId: BASES[0].id, ilvl: 5, rarity: 'normal', name: null, prefixes: [], suffixes: [] });

function withItem() {
  const s = newGame(1);
  const it = item(s);
  s.inventory.push(it);
  return { s, it };
}

describe('holding things for the market', () => {
  it('takes the item at once and keeps it safe until the server answers', () => {
    const { s, it } = withItem();
    expect(holdItem(s, 'a', it.uid)).toBeNull();
    expect(s.inventory).not.toContainEqual(it);
    expect(marketHold(s, 'a')?.item).toEqual(it);
  });

  it('gives the item back if the server refuses, and forgets it if the server agrees', () => {
    const { s, it } = withItem();
    holdItem(s, 'a', it.uid);
    releaseHold(s, 'a', true);
    expect(s.account.stash.flat().map((i) => i.baseId)).toEqual([it.baseId]);
    expect(s.account.marketHolds).toEqual([]);

    const again = item(s);
    s.inventory.push(again);
    holdItem(s, 'b', again.uid);
    releaseHold(s, 'b', false);
    expect(s.account.stash.flat()).toHaveLength(1);
  });

  it('never gives a hold back twice', () => {
    const s = newGame(1);
    s.account.bank.gold = 100;
    holdPayment(s, 'a', 'gold', 60);
    releaseHold(s, 'a', true);
    releaseHold(s, 'a', true);
    expect(s.account.bank.gold).toBe(100);
  });

  it('refuses a price you cannot pay and takes nothing', () => {
    const s = newGame(1);
    s.account.bank.gold = 10;
    expect(holdPayment(s, 'a', 'gold', 60)).toBeTruthy();
    expect(s.account.bank.gold).toBe(10);
    expect(s.account.marketHolds ?? []).toEqual([]);
  });

  it('can pay in orbs', () => {
    const s = newGame(1);
    s.account.bank.chaos = 5;
    holdPayment(s, 'a', 'chaos', 3);
    expect(s.account.bank.chaos).toBe(2);
    releaseHold(s, 'a', true);
    expect(s.account.bank.chaos).toBe(5);
  });

  it('keeps holds from two tabs apart', () => {
    const s = newGame(1);
    const base = structuredClone(s.account);
    const theirs = structuredClone(s.account);
    theirs.marketHolds = [{ op: 'theirs', currency: 'gold', amount: 5 }];
    s.account.marketHolds = [{ op: 'mine', currency: 'gold', amount: 5 }];
    mergeAccounts(s.account, base, theirs);
    expect(s.account.marketHolds.map((h) => h.op).sort()).toEqual(['mine', 'theirs']);
  });

  it('does not bring back a hold this tab released', () => {
    const s = newGame(1);
    const held = [{ op: 'old', currency: 'gold', amount: 5 }];
    const base = { ...structuredClone(s.account), marketHolds: held };
    const theirs = { ...structuredClone(s.account), marketHolds: held };
    s.account.marketHolds = [];
    mergeAccounts(s.account, base, theirs);
    expect(s.account.marketHolds).toEqual([]);
  });
});

describe('collecting from the market', () => {
  it('adds money and shelves items with a fresh id', () => {
    const s = newGame(1);
    s.account.bank.gold = 0;
    const { uid: _, ...sold } = item(s);
    const before = s.account.nextUid;
    receiveDeliveries(s, [
      { currency: 'gold', amount: 900, item: null, note: 'Sold' },
      { currency: null, amount: null, item: sold as Item, note: 'Bought' },
    ]);
    expect(s.account.bank.gold).toBe(900);
    expect(s.account.stash.flat()[0].uid).toBe(before);
  });

  it('never loses an item to a full stash', () => {
    const s = newGame(1);
    s.account.stash = s.account.stash.map(() => Array.from({ length: STASH_PAGE_SIZE }, () => item(s)));
    receiveDeliveries(s, [{ currency: null, amount: null, item: item(s), note: 'Bought' }]);
    expect(s.account.overflow).toHaveLength(1);
  });
});

describe('market sums', () => {
  it('rounds the cut down', () => {
    expect(saleProceeds(1000)).toBe(900);
    expect(saleProceeds(9)).toBe(9);
    expect(saleProceeds(19)).toBe(18);
  });

  it('asks for the opening price, then 5% more and at least 1', () => {
    expect(minBid(100, null)).toBe(100);
    expect(minBid(100, 1000)).toBe(1050);
    expect(minBid(1, 1)).toBe(2);
    expect(minBid(1, 21)).toBe(23);
  });
});

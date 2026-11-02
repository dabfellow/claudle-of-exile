import { itemName } from '../engine/items';
import { saleProceeds, type MarketDelivery } from '../engine/market';
import type { Item } from '../engine/types';
import type { MarketApi, MarketFilters, MarketListing, MarketMode } from '../platform/market';

/** A pretend market in memory, for playtesting the page. Dev builds only; the real rules are in docs/ops/market.sql. */
export function fakeMarket(seed: Item[]): MarketApi & { sellOut(id: number): void } {
  let nextId = 1;
  const done = new Set<string>();
  const inbox: MarketDelivery[] = [];
  const rows: (MarketListing & { seller: string })[] = [];
  const add = (seller: string, item: Item, mode: MarketMode, currency: string, price: number) =>
    rows.push({
      id: nextId++,
      seller,
      item,
      item_name: itemName(item),
      mode,
      currency,
      price,
      high_bid: null,
      ends_at: new Date(Date.now() + (mode === 'buy' ? 7 * 24 : 24) * 3_600_000).toISOString(),
      mine: seller === 'me',
      winning: false,
    });
  seed.forEach((item, i) => add('other', item, i % 2 ? 'auction' : 'buy', i % 3 === 2 ? 'chaos' : 'gold', 500 * (i + 1)));
  const refuse = (message: string) => Object.assign(new Error(message), { code: 'P0001' });
  const find = (id: number) => {
    const l = rows.find((r) => r.id === id);
    if (!l) throw refuse('That listing is gone');
    return l;
  };
  const drop = (l: MarketListing) => rows.splice(rows.findIndex((r) => r.id === l.id), 1);

  return {
    async browse(f: MarketFilters) {
      return rows
        .filter((l) => (f.scope === 'mine' ? l.mine : f.scope === 'bids' ? l.winning : true))
        .filter((l) => !f.text || l.item_name.toLowerCase().includes(f.text.toLowerCase()))
        .filter((l) => !f.rarity || l.item.rarity === f.rarity)
        .filter((l) => !f.mode || l.mode === f.mode)
        .filter((l) => !f.currency || l.currency === f.currency)
        .slice(f.offset ?? 0, (f.offset ?? 0) + 60);
    },
    async list(op, item, mode, currency, price) {
      add('me', item, mode, currency, price);
      done.add(op);
    },
    async buy(op, id) {
      const l = find(id);
      drop(l);
      inbox.push({ currency: null, amount: null, item: l.item, note: `Bought ${l.item_name}` });
      done.add(op);
    },
    async bid(op, id, _currency, amount) {
      const l = find(id);
      l.high_bid = amount;
      l.winning = true;
      done.add(op);
    },
    async cancel(id) {
      const l = find(id);
      drop(l);
      inbox.push({ currency: null, amount: null, item: l.item, note: `Cancelled: ${l.item_name}` });
    },
    async collect() {
      return inbox.splice(0);
    },
    async opDone(op) {
      return done.has(op);
    },
    /** Someone buys your listing while you watch. */
    sellOut(id) {
      const l = find(id);
      drop(l);
      inbox.push({ currency: l.currency, amount: saleProceeds(l.price), item: null, note: `Sold ${l.item_name}` });
    },
  };
}

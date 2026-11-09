import { useCallback, useEffect, useState } from 'react';
import { BASES, uniqueDef } from '../../data/bases';
import { CURRENCIES, currencyDef } from '../../data/materials';
import { MARKET_CUT_PCT, MARKET_MAX_LISTINGS, MARKET_MAX_PRICE, minBid, saleProceeds } from '../../engine/market';
import { stashedItems } from '../../engine/storage';
import type { GameState, Item, ItemSlotType, Rarity } from '../../engine/types';
import { game, useGame } from '../../game';
import { errorText } from '../../platform/feedback';
import { MARKET_OPEN, marketApi, type MarketFilters, type MarketListing, type MarketMode, type MarketScope } from '../../platform/market';
import { refreshMarketLeftovers } from '../marketWindDown';
import { Badge, EmptyState, fmt, fmtTime, MatIcon, PageHeader, Tabs, Tooltip } from '../components/common';
import { Orb } from '../components/Icon';
import { ItemTiles } from '../components/Inventory';
import { ItemIcon, ItemTip } from '../components/ItemView';

const PAGE = 60;
const SLOTS: ItemSlotType[] = ['weapon', 'offhand', 'helmet', 'body', 'gloves', 'boots', 'belt', 'amulet', 'ring'];
const RARITIES: Rarity[] = ['normal', 'magic', 'rare', 'unique'];
const title = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}`;
const money = (id: string) => (id === 'gold' ? 'Gold' : currencyDef(id).name);

/** A listing from an older or newer build can name a base this one doesn't have. */
const known = (l: MarketListing) => BASES.some((b) => b.id === l.item.baseId);

function Price({ currency, amount }: { currency: string; amount: number }) {
  return (
    <span className="price-tag" title={money(currency)}>
      {currency === 'gold' ? <MatIcon id="gold" size={14} /> : <Orb color={currencyDef(currency).color} size={14} />} {fmt(amount)}
      {currency !== 'gold' && ` ${currencyDef(currency).short}`}
    </span>
  );
}

function ListingCard({ s, l, access, onDone }: { s: GameState; l: MarketListing; access: typeof game.marketAccess; onDone: () => void }) {
  const lowest = minBid(l.price, l.high_bid);
  const [bid, setBid] = useState(String(lowest));
  const [busy, setBusy] = useState(false);
  const left = new Date(l.ends_at).getTime() - Date.now();
  const have = s.account.bank[l.currency] ?? 0;
  const amount = l.mode === 'buy' ? l.price : Math.floor(Number(bid));

  const run = async (step: () => Promise<string | null>) => {
    setBusy(true);
    const why = await step();
    setBusy(false);
    if (why) game.pushToast(why, 'warn');
    onDone();
  };

  const canPay = access === 'open' && !l.mine && !busy && have >= amount;
  return (
    <div className={`offer-card rar-${l.item.rarity}`}>
      <Tooltip content={<ItemTip item={l.item} state={s} />}>
        <div className="offer-art">
          <span className={`offer-icon rar-${l.item.rarity}`}>
            <ItemIcon item={l.item} size={30} />
          </span>
        </div>
      </Tooltip>
      <div className="offer-text">
        <b className={`rarity-${l.item.rarity}`}>{l.item_name}</b>
        <span className="offer-kind">
          {l.mode === 'auction' ? (l.high_bid === null ? 'Auction, no bids' : 'Auction, highest bid') : 'Buy now'} · {fmtTime(Math.max(0, left))} left
        </span>
      </div>
      <Price currency={l.currency} amount={l.high_bid ?? l.price} />
      {l.mine ? (
        <button className="btn sm" disabled={busy || l.high_bid !== null} title={l.high_bid !== null ? 'An auction with a bid has to run to the end' : ''} onClick={() => run(() => game.marketCancel(l.id))}>
          Cancel
        </button>
      ) : l.winning ? (
        <Badge tone="success">Winning</Badge>
      ) : l.mode === 'buy' ? (
        <button className={`btn sm ${canPay ? 'primary' : ''}`} disabled={!canPay} title={have < amount ? 'Not enough' : ''} onClick={() => run(() => game.marketBuy(l.id, l.currency, l.price))}>
          Buy
        </button>
      ) : (
        <span className="row" style={{ gap: 4 }}>
          <input className="input market-bid" type="number" min={lowest} value={bid} aria-label="Your bid" onChange={(e) => setBid(e.target.value)} />
          <button className={`btn sm ${canPay && amount >= lowest ? 'primary' : ''}`} disabled={!canPay || amount < lowest} onClick={() => run(() => game.marketBid(l.id, l.currency, amount))}>
            Bid
          </button>
        </span>
      )}
    </div>
  );
}

/** Loads a page of listings, and refreshes on request. */
function useListings(filters: MarketFilters) {
  const key = JSON.stringify(filters);
  const [rows, setRows] = useState<MarketListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(PAGE);
  const load = useCallback(async () => {
    const api = marketApi(game.realm.realm);
    if (!api) return setError('Online features are not configured');
    try {
      const f = JSON.parse(key) as MarketFilters;
      const pages = await Promise.all(Array.from({ length: count / PAGE }, (_, i) => api.browse({ ...f, offset: i * PAGE })));
      setRows(pages.flat().filter(known));
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  }, [key, count]);
  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);
  return { rows, error, load, more: rows?.length === count ? () => setCount(count + PAGE) : null };
}

function Listings({ s, rows, error, load, empty }: { s: GameState; rows: MarketListing[] | null; error: string | null; load: () => void; empty: string }) {
  if (error) return <div className="card muted">The market can't be reached right now. Try again in a moment.</div>;
  if (!rows) return <p className="dim">Loading…</p>;
  if (!rows.length) return <EmptyState small title="Nothing here">{empty}</EmptyState>;
  return (
    <div className="shelf-goods">
      {rows.map((l) => (
        <ListingCard key={`${l.id}-${l.high_bid}`} s={s} l={l} access={game.marketAccess} onDone={load} />
      ))}
    </div>
  );
}

function BrowseTab({ s }: { s: GameState }) {
  const [text, setText] = useState('');
  const [slot, setSlot] = useState('');
  const [rarity, setRarity] = useState('');
  const [mode, setMode] = useState<MarketMode | ''>('');
  const [currency, setCurrency] = useState('');
  const { rows, error, load, more } = useListings({ text, slot, rarity, currency, mode: mode || undefined });
  return (
    <>
      <div className="market-filters">
        <input className="input" placeholder="Search by name" aria-label="Search by name" value={text} onChange={(e) => setText(e.target.value)} />
        <select className="input" aria-label="Slot" value={slot} onChange={(e) => setSlot(e.target.value)}>
          <option value="">Any slot</option>
          {SLOTS.map((x) => (
            <option key={x} value={x}>{title(x)}</option>
          ))}
        </select>
        <select className="input" aria-label="Rarity" value={rarity} onChange={(e) => setRarity(e.target.value)}>
          <option value="">Any rarity</option>
          {RARITIES.map((x) => (
            <option key={x} value={x}>{title(x)}</option>
          ))}
        </select>
        <select className="input" aria-label="How it sells" value={mode} onChange={(e) => setMode(e.target.value as MarketMode | '')}>
          <option value="">Buy now and auctions</option>
          <option value="buy">Buy now</option>
          <option value="auction">Auctions</option>
        </select>
        <select className="input" aria-label="Priced in" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="">Any price</option>
          {['gold', ...CURRENCIES.map((c) => c.id)].map((id) => (
            <option key={id} value={id}>{money(id)}</option>
          ))}
        </select>
        <button className="btn sm" onClick={() => void load()}>Refresh</button>
      </div>
      <Listings s={s} rows={rows} error={error} load={() => void load()} empty="No listings match that search." />
      {more && <button className="btn sm" onClick={more}>Show more</button>}
    </>
  );
}

function SellTab({ s }: { s: GameState }) {
  const [item, setItem] = useState<Item | null>(null);
  const [mode, setMode] = useState<MarketMode>('buy');
  const [currency, setCurrency] = useState('gold');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const value = Math.floor(Number(price));
  const valid = value >= 1 && value <= MARKET_MAX_PRICE;

  const list = async () => {
    if (!item) return;
    setBusy(true);
    const why = await game.marketList(item.uid, mode, currency, value);
    setBusy(false);
    if (why) return game.pushToast(why, 'warn');
    game.pushToast('Listed on the market', 'good');
    setItem(null);
    setPrice('');
  };

  return (
    <div className="card">
      <div className="card-title">Pick something to sell</div>
      <ItemTiles s={s} items={[...s.inventory, ...stashedItems(s)].filter((i) => !(i.uniqueId && uniqueDef(i.uniqueId).noTrade)).reverse()} selected={(i) => i.uid === item?.uid} onClick={setItem} empty="Your bag and stash have no gear." />
      {item && (
        <div className="market-sell">
          <Tabs
            compact
            tabs={[
              { id: 'buy', label: 'Buy now' },
              { id: 'auction', label: 'Auction' },
            ]}
            value={mode}
            onChange={setMode}
          />
          <select className="input" aria-label="Price in" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {['gold', ...CURRENCIES.map((c) => c.id)].map((id) => (
              <option key={id} value={id}>{money(id)}</option>
            ))}
          </select>
          <input className="input" type="number" min={1} placeholder={mode === 'buy' ? 'Price' : 'Lowest first bid'} aria-label="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
          <button className="btn sm primary" disabled={!valid || busy} onClick={() => void list()}>
            List it
          </button>
          <span className="dim small">
            {valid ? `You'd get ${fmt(saleProceeds(value))} after the market's ${MARKET_CUT_PCT}% cut. ` : ''}
            {mode === 'buy' ? 'Stays up for 7 days.' : 'Runs for 24 hours; the highest bid wins.'} The item is held by the market until then.
          </span>
        </div>
      )}
    </div>
  );
}

function ScopeSection({ s, scope, heading, empty }: { s: GameState; scope: MarketScope; heading: string; empty: string }) {
  const { rows, error, load, more } = useListings({ scope });
  return (
    <div className="card">
      <div className="card-title">
        {heading}
        {scope === 'mine' && rows && MARKET_OPEN && <span className="dim small"> · {rows.length} of {MARKET_MAX_LISTINGS}</span>}
      </div>
      <Listings
        s={s}
        rows={rows}
        error={error}
        load={() => {
          void load();
          // the sidebar drops the closing market once nothing of yours is left on it
          void refreshMarketLeftovers();
        }}
        empty={empty}
      />
      {more && <button className="btn sm" onClick={more}>Show more</button>}
    </div>
  );
}

/**
 * The market while it's closed (MARKET_OPEN): nothing to browse, sell or bid on, only a way to get back what's still
 * there. Deliveries also arrive by themselves each time a character loads.
 */
function MarketClosing({ s }: { s: GameState }) {
  const access = game.marketAccess;
  const holds = s.account.marketHolds?.length ?? 0;
  const [busy, setBusy] = useState(false);
  const collect = async () => {
    setBusy(true);
    // a delivery adds to the bank or gives an item a new id, so either moving means something arrived
    const before = JSON.stringify(s.account.bank) + s.account.nextUid;
    await game.marketSync();
    setBusy(false);
    if (JSON.stringify(game.state.account.bank) + game.state.account.nextUid === before) game.pushToast('Nothing is waiting for you right now', 'info');
    void refreshMarketLeftovers();
  };
  return (
    <div className="page">
      <PageHeader title="Player Market" kicker="Closed">
        The Player Market is closed for now. Nothing of yours is lost: collect anything waiting for you and take down your listings here. Auctions that already
        have a bid run to their end, and the item or your refund arrives the same way.
      </PageHeader>
      {access === 'guest' ? (
        <div className="card muted">Sign in to the account you traded on to collect what the market is holding for you.</div>
      ) : (
        <>
          <div className="card">
            <div className="card-title">
              Waiting for you
              <span className="grow" />
              <button className="btn sm primary" disabled={busy} onClick={() => void collect()}>
                {busy ? 'Collecting…' : 'Collect deliveries'}
              </button>
            </div>
            <p className="muted small" style={{ margin: 0 }}>
              Gold from sales, refunds, items from cancelled or ended listings, and auctions you won. They go to your bank and stash, and are also collected for
              you whenever you load a character in this realm.
            </p>
            {holds > 0 && (
              <p className="dim small" style={{ marginBottom: 0 }}>
                {holds} market {holds === 1 ? 'step is' : 'steps are'} still waiting on the server. {holds === 1 ? 'It settles' : 'They settle'} by itself, and anything
                that didn't go through comes back to you.
              </p>
            )}
          </div>
          <ScopeSection s={s} scope="mine" heading="Your listings" empty="You have nothing up for sale." />
          <ScopeSection s={s} scope="bids" heading="Auctions you're winning" empty="You aren't winning any auctions." />
        </>
      )}
    </div>
  );
}

/** Other players' gear, and your own up for sale. Separate from the Town Market station, which runs the NPC shops. */
export function MarketPage() {
  const s = useGame();
  const access = game.marketAccess;
  const [tab, setTab] = useState<'browse' | 'sell' | 'mine'>('browse');
  useEffect(() => void game.marketSync(), []);
  if (access === 'solo') return <div className="page card muted">Solo Self-Found characters can't use the Player Market.</div>;
  if (!MARKET_OPEN) return <MarketClosing s={s} />;
  return (
    <div className="page">
      <PageHeader
        title="Player Market"
        kicker="Trade gear with other exiles"
        actions={
          <span className="gold-amount">
            <MatIcon id="gold" size={18} /> {fmt(s.account.bank.gold ?? 0)}
          </span>
        }
      />
      {access === 'guest' && <div className="card muted">Sign in to use the market. You can look around, but only accounts can list or buy.</div>}
      {access === 'locked' && <div className="card muted">Clear Act 1 to trade here. You can look around until then.</div>}
      {access === 'open' ? (
        <Tabs
          tabs={[
            { id: 'browse', label: 'Browse' },
            { id: 'sell', label: 'Sell' },
            { id: 'mine', label: 'My listings & bids' },
          ]}
          value={tab}
          onChange={setTab}
        />
      ) : null}
      {(access !== 'open' || tab === 'browse') && <BrowseTab s={s} />}
      {access === 'open' && tab === 'sell' && <SellTab s={s} />}
      {access === 'open' && tab === 'mine' && (
        <>
          <ScopeSection s={s} scope="mine" heading="Your listings" empty="You have nothing up for sale." />
          <ScopeSection s={s} scope="bids" heading="Auctions you're winning" empty="You aren't winning any auctions." />
        </>
      )}
      <div className="dim small">Money from sales lands in your market wallet and comes to you the next time you log in or open this page.</div>
    </div>
  );
}

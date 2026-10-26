import { useState } from 'react';
import { activeGemDef, supportGemDef } from '../../data/gems';
import { currencyDef, MATERIALS, materialDef } from '../../data/materials';
import { flaskName, flaskValue, sellFlasks } from '../../engine/flasks';
import { buyOffer, offerName, rerollCost, rerollVendor, sellItems, sellMaterial, stationLevel } from '../../engine/hideout';
import { sellValue } from '../../engine/items';
import type { GameState, Rarity, VendorOffer } from '../../engine/types';
import { game, useGame } from '../../game';
import { Art, EmptyState, fmt, fmtTime, GameIcon, MatIcon, PixelArt, Tabs, Tooltip } from '../components/common';
import { FlaskIcon, FlaskTip } from '../components/FlaskView';
import { GemIcon, GemTip, SupportTip } from '../components/GemView';
import { Orb } from '../components/Icon';
import { ItemTiles } from '../components/Inventory';
import { bagFull, stashedItems } from '../../engine/storage';
import { ItemIcon, ItemTip } from '../components/ItemView';

const TRADER_NAME = 'Varro the Peddler';

const KIND_LABEL: Record<VendorOffer['kind'], string> = {
  item: 'Equipment',
  flask: 'Flask',
  currency: 'Currency',
  gem: 'Skill gem',
  support: 'Support gem',
};

function OfferIcon({ o }: { o: VendorOffer }) {
  if (o.item)
    return (
      <span className={`offer-icon rar-${o.item.rarity}`}>
        <ItemIcon item={o.item} size={30} />
      </span>
    );
  if (o.flask) return <FlaskIcon f={o.flask} size={40} />;
  if (o.gemId) return <GemIcon def={activeGemDef(o.gemId)} size={40} />;
  if (o.supportId) return <GemIcon def={supportGemDef(o.supportId)} size={36} support />;
  const def = currencyDef(o.currencyId!);
  return <Orb color={def.color} size={34} glow />;
}

function offerTip(s: GameState, o: VendorOffer) {
  if (o.item) return <ItemTip item={o.item} state={s} />;
  if (o.flask) return <FlaskTip f={o.flask} />;
  if (o.gemId) return <GemTip state={s} def={activeGemDef(o.gemId)} />;
  if (o.supportId) return <SupportTip supportId={o.supportId} />;
  const def = currencyDef(o.currencyId!);
  return (
    <div className="tip">
      <div className="tip-title" style={{ color: 'var(--currency)' }}>
        {def.name}
      </div>
      <div>{def.desc}</div>
    </div>
  );
}

/** Rarity tint for the offer card (items by rarity, gems blue, orbs currency-gold). */
function rarityClass(o: VendorOffer): string {
  if (o.item) return `rar-${o.item.rarity}`;
  if (o.flask) return o.flask.rarity === 'magic' ? 'rar-magic' : 'rar-normal';
  if (o.gemId || o.supportId) return 'rar-gem';
  return 'rar-currency';
}

function nameClass(o: VendorOffer): string {
  if (o.item) return `rarity-${o.item.rarity}`;
  if (o.flask?.rarity === 'magic' || o.gemId || o.supportId) return 'magic-text';
  if (o.currencyId) return 'currency-text';
  return '';
}

/** The stall's shelves, top to bottom; each offer kind sits on one. */
const SHELVES: { label: string; kinds: VendorOffer['kind'][] }[] = [
  { label: 'Arms & armour', kinds: ['item'] },
  { label: 'Gems', kinds: ['gem', 'support'] },
  { label: 'Flasks & orbs', kinds: ['flask', 'currency'] },
];

function OfferCard({ s, o, gold }: { s: GameState; o: VendorOffer; gold: number }) {
  const afford = gold >= o.price;
  const full = o.kind === 'item' && bagFull(s);
  return (
    <Tooltip content={offerTip(s, o)}>
      <div className={`offer-card ${rarityClass(o)} ${afford ? '' : 'poor'}`}>
        <div className="offer-art">
          <OfferIcon o={o} />
        </div>
        <div className="offer-text">
          <b className={nameClass(o)}>{offerName(o)}</b>
          <span className="offer-kind">{o.item ? `${o.item.rarity[0].toUpperCase()}${o.item.rarity.slice(1)} ${KIND_LABEL[o.kind].toLowerCase()}` : KIND_LABEL[o.kind]}</span>
        </div>
        <span className={`price-tag ${afford ? '' : 'short'}`}>
          <MatIcon id="gold" size={14} /> {fmt(o.price)}
        </span>
        <button
          className={`btn sm ${afford && !full ? 'primary' : ''}`}
          disabled={!afford || full}
          title={full ? 'Inventory full' : afford ? '' : 'Not enough gold'}
          onClick={() => game.act((st, ctx) => buyOffer(st, ctx, o.id))}
        >
          {full ? 'Bag full' : afford ? 'Buy' : 'Too costly'}
        </button>
      </div>
    </Tooltip>
  );
}

function BuyTab({ s }: { s: GameState }) {
  const gold = s.bank.gold ?? 0;
  const cost = rerollCost(s);
  return (
    <>
      <div className="shop-bar">
        <span className="muted small">
          New stock in <b className="num">{fmtTime(Math.max(0, s.vendor.refreshAt - s.clock))}</b>
        </span>
        <span className="spacer" />
        <button className="btn sm" disabled={gold < cost} onClick={() => game.act((st, ctx) => rerollVendor(st, ctx))}>
          <GameIcon name="clock" size={12} /> Restock now · {fmt(cost)} gold
        </button>
        {(s.vendor.rerolls ?? 0) > 0 && <span className="dim small">Price doubles each restock until the next free one</span>}
      </div>
      {s.vendor.stock.length === 0 ? (
        <div className="card">
          <EmptyState icon={<PixelArt name="stall" alt="" scale={2} />} title="Sold out">
            “Come back when the tide brings more.”
          </EmptyState>
        </div>
      ) : (
        <div className="stall">
          {SHELVES.map((shelf) => {
            const goods = s.vendor.stock.filter((o) => shelf.kinds.includes(o.kind));
            if (!goods.length) return null;
            return (
              <section key={shelf.label} className="shelf">
                <div className="shelf-label">{shelf.label}</div>
                <div className="shelf-goods">
                  {goods.map((o) => (
                    <OfferCard key={o.id} s={s} o={o} gold={gold} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function SellTab({ s }: { s: GameState }) {
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [flasks, setFlasks] = useState<Set<number>>(new Set());
  const [withStash, setWithStash] = useState(false);
  const pool = withStash ? [...s.inventory, ...stashedItems(s)] : s.inventory;
  const toggle = (set: Set<number>, uid: number, apply: (n: Set<number>) => void) => {
    const n = new Set(set);
    if (n.has(uid)) n.delete(uid);
    else n.add(uid);
    apply(n);
  };
  const pickedGold = pool.filter((i) => picked.has(i.uid)).reduce((a, i) => a + sellValue(i), 0);
  const flaskGold = s.flaskStash.filter((f) => flasks.has(f.uid)).reduce((a, f) => a + flaskValue(f), 0);
  const byRarity = (r: Rarity) => pool.filter((i) => i.rarity === r);
  const mats = MATERIALS.filter((m) => m.kind !== 'gold' && (s.bank[m.id] ?? 0) > 0);

  return (
    <>
      <div className="card">
        <div className="card-title">
          Items
          <span className="grow" />
          <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={withStash}
              onChange={(e) => {
                setWithStash(e.target.checked);
                setPicked(new Set());
              }}
            />
            Show stash too
          </label>
        </div>
        <div className="row wrap" style={{ marginBottom: 10 }}>
          {(['normal', 'magic', 'rare'] as Rarity[]).map((r) => {
            const list = byRarity(r);
            return (
              <button key={r} className="btn sm" disabled={!list.length} onClick={() => setPicked(new Set(list.map((i) => i.uid)))}>
                Select all {r} ({list.length})
              </button>
            );
          })}
          <span className="spacer" />
          {picked.size > 0 && (
            <button className="btn sm ghost" onClick={() => setPicked(new Set())}>
              Clear
            </button>
          )}
          <button
            className="btn sm primary"
            disabled={!picked.size}
            onClick={() => {
              game.act((st, ctx) => sellItems(st, ctx, [...picked]));
              setPicked(new Set());
            }}
          >
            Sell {picked.size} for {fmt(pickedGold)} gold
          </button>
        </div>
        {pool.length === 0 ? (
          <EmptyState small title="Nothing to sell">
            {withStash ? 'Your bag and stash have no gear.' : 'Your bag is empty. Tick "Show stash too" to sell stashed gear.'}
          </EmptyState>
        ) : (
          <ItemTiles s={s} items={[...pool].reverse()} selected={(i) => picked.has(i.uid)} onClick={(i) => toggle(picked, i.uid, setPicked)} />
        )}
        <div className="dim small" style={{ marginTop: 10 }}>
          Sell filters and auto-sell rules are planned for a later update.
        </div>
      </div>

      {s.flaskStash.length > 0 && (
        <div className="card">
          <div className="card-title">
            Spare flasks
            <span className="grow" />
            <button
              className="btn sm primary"
              disabled={!flasks.size}
              onClick={() => {
                game.act((st, ctx) => sellFlasks(st, ctx, [...flasks]));
                setFlasks(new Set());
              }}
            >
              Sell {flasks.size} for {fmt(flaskGold)} gold
            </button>
          </div>
          <div className="gem-bag">
            {s.flaskStash.map((f) => (
              <Tooltip key={f.uid} content={<FlaskTip f={f} />}>
                <button className={`gem-card ${flasks.has(f.uid) ? 'selected' : ''}`} onClick={() => toggle(flasks, f.uid, setFlasks)}>
                  <FlaskIcon f={f} size={28} />
                  <span>
                    <b className={f.rarity === 'magic' ? 'magic-text' : ''}>{flaskName(f)}</b>
                    <span className="dim"> · {flaskValue(f)}g</span>
                  </span>
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Materials</div>
        {mats.length === 0 && (
          <EmptyState small title="No materials">
            Gather or loot materials to sell them here.
          </EmptyState>
        )}
        <div className="material-grid">
          {mats.map((m) => (
            <div key={m.id} className="material-tile sell">
              <Art src={`materials/${m.id}.png`} alt={m.name} size={34} fallback={<MatIcon id={m.id} size={20} />} />
              <span className="material-name">
                {m.name}
                <span className="price" style={{ fontSize: 'var(--fs-xs)', marginLeft: 6 }}>
                  {m.value}g
                </span>
              </span>
              <b className="num">{fmt(s.bank[m.id] ?? 0)}</b>
              <div className="row" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
                <button className="btn sm" onClick={() => game.act((st, ctx) => sellMaterial(st, ctx, m.id, 10, m.value))}>
                  Sell 10
                </button>
                <button className="btn sm ghost" onClick={() => game.act((st, ctx) => sellMaterial(st, ctx, m.id, st.bank[m.id] ?? 0, m.value))}>
                  All
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export function TraderPage() {
  const s = useGame();
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const lvl = stationLevel(s, 'vendor');
  return (
    <div className="page">
      <div className="card npc-panel shopfront">
        <div className="awning" aria-hidden />
        <div className="npc-portrait">
          <Art src="portraits/trader.png" alt={TRADER_NAME} className="portrait-img" fallback={<GameIcon name="vendor" size={56} color="var(--accent-2)" />} />
        </div>
        <div className="npc-text">
          <span className="page-kicker">Trader's Stall · level {lvl}</span>
          <h1>{TRADER_NAME}</h1>
        </div>
        <div className="npc-aside">
          <span className="label">Your gold</span>
          <span className="gold-amount">
            <MatIcon id="gold" size={22} /> {fmt(s.bank.gold ?? 0)}
          </span>
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'buy', label: 'Buy', count: s.vendor.stock.length },
          { id: 'sell', label: 'Sell', count: s.inventory.length },
        ]}
      />
      {tab === 'buy' ? <BuyTab s={s} /> : <SellTab s={s} />}
      <div className="dim small">
        Prices in {materialDef('gold').name.toLowerCase()}. Upgrade the stall in your hideout for more and better stock.
      </div>
    </div>
  );
}

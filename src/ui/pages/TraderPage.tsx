import { useState } from 'react';
import { activeGemDef, gemReqLevel, supportGemDef, type GemAttr } from '../../data/gems';
import { supportReason } from '../../engine/gems';
import { GemFilters, GemKindChips, kindMatches, nameHas, type GemKind } from '../components/GemFilters';
import { currencyDef, MATERIALS } from '../../data/materials';
import { characterLevel } from '../../engine/character';
import { flaskName, flaskValue, sellFlasks } from '../../engine/flasks';
import { buyGem, buyOffer, gemShopOffers, nextGemShopArea, offerName, rerollCost, rerollVendor, sellItems, sellMaterial, stationLevel } from '../../engine/hideout';
import { itemName, sellValue } from '../../engine/items';
import { defaultSlot, equipReason } from '../../engine/equipment';
import type { EquipSlot, GameState, Item, Rarity, ShopId, VendorOffer } from '../../engine/types';
import '../round2-session3.css';
import { baseDef } from '../../data/bases';
import { game, useGame } from '../../game';
import { Art, EmptyState, fmt, fmtTime, GameIcon, MatIcon, PixelArt, Tabs, Tooltip } from '../components/common';
import { FlaskIcon, FlaskTip } from '../components/FlaskView';
import { GemIcon, GemTip, SupportTip } from '../components/GemView';
import { Orb } from '../components/Icon';
import { ItemTiles } from '../components/Inventory';
import { bagFull, stashedItems } from '../../engine/storage';
import { ItemIcon, ItemTip } from '../components/ItemView';

/** The three Town shops: who runs each one and how its wares are shelved. */
const SHOPS: { id: ShopId; name: string; keeper: string; blurb: string; portrait?: string; icon: string; shelves: { label: string; match: (o: VendorOffer) => boolean }[] }[] = [
  {
    id: 'magic',
    name: 'Magic shop',
    keeper: 'Ilsa the Curio-seller',
    blurb: 'Wands, staves, sceptres and jewellery, flasks and orbs.',
    icon: 'gems',
    shelves: [
      { label: 'Wands, staves & sceptres', match: (o) => !!o.item && baseDef(o.item.baseId).slot === 'weapon' },
      { label: 'Rings, amulets & belts', match: (o) => !!o.item && baseDef(o.item.baseId).slot !== 'weapon' },
      { label: 'Flasks', match: (o) => o.kind === 'flask' },
      { label: 'Orbs', match: (o) => o.kind === 'currency' },
    ],
  },
  {
    id: 'armour',
    name: 'Weapon & Armour shop',
    keeper: 'Varro the Armourer',
    blurb: 'Blades, bows, maces and shields; helmets, body armour, gloves and boots.',
    portrait: 'portraits/trader.png',
    icon: 'equipment',
    shelves: [
      { label: 'Weapons', match: (o) => !!o.item && baseDef(o.item.baseId).slot === 'weapon' },
      { label: 'Shields & off hands', match: (o) => !!o.item && baseDef(o.item.baseId).slot === 'offhand' },
      { label: 'Armour', match: (o) => !!o.item && !['weapon', 'offhand'].includes(baseDef(o.item.baseId).slot) },
    ],
  },
  {
    id: 'gems',
    name: 'Gem shop',
    keeper: 'The Gemwright',
    blurb: 'Every skill and support gem from the areas you’ve opened, and it never sells out. Each new area brings a few more; completing the campaign adds the Maps gems.',
    icon: 'gemcutting',
    shelves: [
      { label: 'Skill gems', match: (o) => o.kind === 'gem' },
      { label: 'Support gems', match: (o) => o.kind === 'support' },
    ],
  },
];

const SLOT_NAME: Record<string, string> = {
  weapon: 'weapon',
  offhand: 'off hand',
  helmet: 'helmet',
  body: 'body armour',
  gloves: 'gloves',
  boots: 'boots',
  belt: 'belt',
  amulet: 'amulet',
  ring: 'ring',
};
const slotLabel = (item: Item) => {
  try {
    return SLOT_NAME[baseDef(item.baseId).slot] ?? 'equipment';
  } catch {
    return 'equipment';
  }
};

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

/** What you wear where a shop item would go, so you can weigh it up before buying. */
function WornNow({ s, item }: { s: GameState; item: Item }) {
  let slot: EquipSlot;
  try {
    slot = defaultSlot(s, item);
  } catch {
    return null;
  }
  const worn = s.equipment[slot];
  const why = equipReason(s, item);
  return (
    <span className="r2-offer-worn">
      {why ? (
        <span className="r2-offer-warn">{why}</span>
      ) : worn ? (
        <Tooltip content={<ItemTip item={worn} state={s} />}>
          <span>
            Wearing <b className={`rarity-${worn.rarity}`}>{itemName(worn)}</b>
          </span>
        </Tooltip>
      ) : (
        <span className="r2-offer-good">Slot empty: an easy upgrade</span>
      )}
    </span>
  );
}

/** For a gem: how many you already have, and for a support, which skills on your bar it would fit. */
function GemOwned({ s, o }: { s: GameState; o: VendorOffer }) {
  if (o.gemId) {
    const n = s.account.gems.filter((g) => g.gemId === o.gemId).length + s.skillBar.filter((g) => g?.gemId === o.gemId).length;
    return <span className="r2-offer-worn">{n ? `You have ${n}` : <span className="r2-offer-good">New to you</span>}</span>;
  }
  const n = s.account.supportGems.filter((g) => g.supportId === o.supportId).length + s.skillBar.reduce((a, g) => a + (g?.supports.filter((x) => x?.supportId === o.supportId).length ?? 0), 0);
  const fits = s.skillBar.flatMap((b, i) => (b && !supportReason(b, o.supportId!) ? [i] : []));
  return (
    <span className="r2-offer-worn">
      {n ? `You have ${n}` : 'New to you'} · {fits.length ? `fits ${fits.map((i) => activeGemDef(s.skillBar[i]!.gemId).name).join(', ')}` : 'fits nothing on your bar'}
    </span>
  );
}

function OfferCard({ s, o, gold }: { s: GameState; o: VendorOffer; gold: number }) {
  const afford = gold >= o.price;
  const full = o.kind === 'item' && bagFull(s);
  const gem = o.gemId ?? o.supportId;
  const needLevel = gem && gemReqLevel(gem) > characterLevel(s) ? gemReqLevel(gem) : 0;
  return (
    <Tooltip content={offerTip(s, o)}>
      <div className={`offer-card ${rarityClass(o)} ${afford ? '' : 'poor'}`}>
        <div className="offer-art">
          <OfferIcon o={o} />
        </div>
        <div className="offer-text">
          <b className={nameClass(o)}>{offerName(o)}</b>
          <span className="offer-kind">
            {o.item ? `${o.item.rarity[0].toUpperCase()}${o.item.rarity.slice(1)} ${slotLabel(o.item)} · item level ${o.item.ilvl}` : KIND_LABEL[o.kind]}
          </span>
          {o.item && <WornNow s={s} item={o.item} />}
          {gem && <GemOwned s={s} o={o} />}
        </div>
        <span className="r2-offer-price">
          <span className={`price-tag ${afford ? '' : 'short'}`}>
            <MatIcon id="gold" size={14} /> {fmt(o.price)}
          </span>
          {!afford && <span className="r2-offer-short">{fmt(o.price - gold)} short</span>}
        </span>
        <button
          className={`btn sm ${afford && !full && !needLevel ? 'primary' : ''}`}
          disabled={!afford || full || !!needLevel}
          title={needLevel ? `Needs character level ${needLevel}` : full ? 'Inventory full' : afford ? '' : 'Not enough gold'}
          onClick={() => game.act((st, ctx) => (gem ? buyGem(st, ctx, gem) : buyOffer(st, ctx, o.id)))}
        >
          {needLevel ? `Level ${needLevel}` : full ? 'Bag full' : afford ? 'Buy' : 'Too costly'}
        </button>
      </div>
    </Tooltip>
  );
}

/** The Gem shop's shelf is fixed; the other two sell from the restocking stock. */
function shopWares(s: GameState, shop: ShopId): VendorOffer[] {
  return shop === 'gems' ? gemShopOffers(s) : s.vendor.stock.filter((o) => o.shop === shop);
}

function ShopTab({ s, shop }: { s: GameState; shop: (typeof SHOPS)[number] }) {
  const gold = s.account.bank.gold ?? 0;
  const cost = rerollCost(s);
  const wares = shopWares(s, shop.id);
  const next = shop.id === 'gems' ? nextGemShopArea(s) : null;
  return (
    <>
      {shop.id === 'gems' ? (
        <div className="shop-bar">
          <span className="muted small">
            {next ? (
              <>
                <b className="num">{next.count}</b> more gem{next.count === 1 ? '' : 's'} arrive when {next.zone.name} opens
              </>
            ) : (
              'Every gem from the open acts is on the shelf.'
            )}
          </span>
        </div>
      ) : (
        <div className="shop-bar">
          <span className="muted small">
            New stock in <b className="num">{fmtTime(Math.max(0, s.vendor.refreshAt - s.clock))}</b>
          </span>
          <span className="spacer" />
          <button className="btn sm" disabled={gold < cost} onClick={() => game.act((st, ctx) => rerollVendor(st, ctx))}>
            <GameIcon name="clock" size={12} /> Restock gear shops · {fmt(cost)} gold
          </button>
          {(s.vendor.rerolls ?? 0) > 0 && <span className="dim small">Price doubles each restock until the next free one</span>}
        </div>
      )}
      {wares.length === 0 ? (
        <div className="card">
          <EmptyState icon={<PixelArt name="stall" alt="" scale={2} />} title="Sold out">
            “Come back when the tide brings more.”
          </EmptyState>
        </div>
      ) : shop.id === 'gems' ? (
        <GemStall s={s} wares={wares} gold={gold} />
      ) : (
        <div className="stall">
          {shop.shelves.map((shelf) => {
            const goods = wares.filter(shelf.match);
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

/** The Gem shop's wares: a tab each for skill and support gems, with the same filters as the Skills page. */
function GemStall({ s, wares, gold }: { s: GameState; wares: VendorOffer[]; gold: number }) {
  const [tab, setTab] = useState<'gem' | 'support'>('gem');
  const [search, setSearch] = useState('');
  const [attr, setAttr] = useState<GemAttr | null>(null);
  const [kind, setKind] = useState<GemKind>('all');
  const [fits, setFits] = useState(false);
  const fitsBar = (supportId: string) => s.skillBar.some((b) => b && !supportReason(b, supportId));
  const shelf = wares.filter((o) => o.kind === tab);
  const goods = shelf.filter((o) => {
    if (o.gemId) {
      const def = activeGemDef(o.gemId);
      return kindMatches(def, kind) && (!attr || def.attr === attr) && nameHas(def.name, search);
    }
    const def = supportGemDef(o.supportId!);
    return (!attr || def.attr === attr) && (!fits || fitsBar(o.supportId!)) && nameHas(def.name, search);
  });
  return (
    <div className="card">
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'gem', label: 'Skill gems', count: wares.filter((o) => o.kind === 'gem').length },
          { id: 'support', label: 'Support gems', count: wares.filter((o) => o.kind === 'support').length },
        ]}
      />
      <GemFilters search={search} setSearch={setSearch} attr={attr} setAttr={setAttr}>
        {tab === 'gem' ? (
          <GemKindChips kind={kind} setKind={setKind} />
        ) : (
          <div className="gem-chips">
            <button className={`gem-chip ${fits ? 'active' : ''}`} onClick={() => setFits(!fits)} title="Only supports that fit a skill on your bar">
              Fits my skills
            </button>
          </div>
        )}
      </GemFilters>
      {shelf.length === 0 && <div className="dim small">None in stock right now.</div>}
      {shelf.length > 0 && goods.length === 0 && <div className="dim small">No gems match these filters.</div>}
      {goods.length > 0 && (
        <div className="shelf-goods">
          {goods.map((o) => (
            <OfferCard key={o.id} s={s} o={o} gold={gold} />
          ))}
        </div>
      )}
    </div>
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
  const flaskGold = s.account.flaskStash.filter((f) => flasks.has(f.uid)).reduce((a, f) => a + flaskValue(f), 0);
  const byRarity = (r: Rarity) => pool.filter((i) => i.rarity === r);
  const mats = MATERIALS.filter((m) => m.kind !== 'gold' && (s.account.bank[m.id] ?? 0) > 0);

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

      {s.account.flaskStash.length > 0 && (
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
            {s.account.flaskStash.map((f) => (
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
              <b className="num">{fmt(s.account.bank[m.id] ?? 0)}</b>
              <div className="row" style={{ gridColumn: '1 / -1', justifyContent: 'flex-end' }}>
                <button className="btn sm" onClick={() => game.act((st, ctx) => sellMaterial(st, ctx, m.id, 10, m.value))}>
                  Sell 10
                </button>
                <button className="btn sm ghost" onClick={() => game.act((st, ctx) => sellMaterial(st, ctx, m.id, st.account.bank[m.id] ?? 0, m.value))}>
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

/** The Town: three shops and a place to sell, with one shared restock timer (the Town Market station speeds it up). */
export function TraderPage() {
  const s = useGame();
  const [tab, setTab] = useState<ShopId | 'sell'>('magic');
  const lvl = stationLevel(s, 'vendor');
  const shop = SHOPS.find((x) => x.id === tab);
  return (
    <div className="page r2-shop">
      <div className="card npc-panel shopfront">
        <div className="awning" aria-hidden />
        <div className="npc-portrait">
          {shop?.portrait ? (
            <Art src={shop.portrait} alt={shop.keeper} className="portrait-img" fallback={<GameIcon name={shop.icon} size={56} color="var(--accent-2)" />} />
          ) : (
            <GameIcon name={shop?.icon ?? 'vendor'} size={56} color="var(--accent-2)" />
          )}
        </div>
        <div className="npc-text">
          <span className="page-kicker">Town · Market level {lvl}</span>
          <h1>{shop ? shop.name : 'Sell your wares'}</h1>
          <div className="muted small">{shop ? `${shop.keeper}. ${shop.blurb}` : 'Any shop will buy gear, flasks and materials.'}</div>
        </div>
        <div className="npc-aside">
          <span className="label">Your gold</span>
          <span className="gold-amount">
            <MatIcon id="gold" size={22} /> {fmt(s.account.bank.gold ?? 0)}
          </span>
        </div>
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          ...SHOPS.map((x) => ({ id: x.id, label: x.name, count: shopWares(s, x.id).length })),
          { id: 'sell' as const, label: 'Sell', count: s.inventory.length },
        ]}
      />
      {shop ? <ShopTab s={s} shop={shop} /> : <SellTab s={s} />}
      <div className="dim small">Prices in gold. Upgrade the Town Market in your Hideout for more stock and faster restocks in the gear shops, and signature supports in the Gem shop.</div>
    </div>
  );
}

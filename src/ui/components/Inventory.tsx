import { useState, type ReactNode } from 'react';
import { baseDef } from '../../data/bases';
import { BAG_SIZE } from '../../data/hideout';
import { BENCH_UNBUILT, benchBuilt, salvage } from '../../engine/crafting';
import { equipReason } from '../../engine/equipment';
import { itemName } from '../../engine/items';
import { inGearSet } from '../../engine/loadouts';
import type { GameState, Item, Rarity } from '../../engine/types';
import { game } from '../../game';
import { Tooltip } from './common';
import { ItemIcon, ItemTip, pinItem } from './ItemView';
import { openItemMenu } from './ItemMenu';

export type SortKey = 'recent' | 'rarity' | 'slot';
const RARITY_ORDER: Record<Rarity, number> = { unique: 0, rare: 1, magic: 2, normal: 3 };

export function sortItems(items: Item[], key: SortKey): Item[] {
  const list = [...items];
  if (key === 'recent') return list.reverse();
  if (key === 'rarity') return list.sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || b.ilvl - a.ilvl);
  return list.sort((a, b) => baseDef(a.baseId).slot.localeCompare(baseDef(b.baseId).slot));
}

function slotLabel(item: Item): string {
  const slot = baseDef(item.baseId).slot;
  return slot === 'body' ? 'Body armour' : slot[0].toUpperCase() + slot.slice(1);
}

/** One item as a tile: icon, base name in its rarity colour (uniques keep their own name), slot and item level. */
export function ItemTile({
  item,
  s,
  onClick,
  selected,
  marked,
}: {
  item: Item;
  s: GameState;
  onClick?: () => void;
  selected?: boolean;
  marked?: boolean;
}) {
  const locked = equipReason(s, item) !== null;
  return (
    <Tooltip content={<ItemTip item={item} state={s} />}>
      <button
        className={`item-tile rar-${item.rarity} ${selected ? 'selected' : ''} ${marked ? 'marked' : ''} ${locked ? 'cant-equip' : ''}`}
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          pinItem(item);
        }}
      >
        <span className="item-tile-icon">
          <ItemIcon item={item} size={34} />
        </span>
        {inGearSet(s, item.uid) && <span className="item-tile-set" title="In a gear set: bulk salvage skips it">Set</span>}
        <span className={`item-tile-name rarity-${item.rarity}`}>
          {item.rarity === 'unique' ? itemName(item) : baseDef(item.baseId).name}
        </span>
        <span className="item-tile-meta">
          {slotLabel(item)} · i{item.ilvl}
        </span>
      </button>
    </Tooltip>
  );
}

/**
 * Items as a grid of tiles. With `slots`, the grid always has that many cells (empty ones padded in),
 * so a page looks the same at 3 items as at 30 and never grows.
 */
export function ItemTiles({
  s,
  items,
  onClick,
  selected,
  marked,
  empty,
  slots,
}: {
  s: GameState;
  items: Item[];
  onClick?: (item: Item) => void;
  selected?: (item: Item) => boolean;
  marked?: (item: Item) => boolean;
  empty?: ReactNode;
  slots?: number;
}) {
  if (!items.length && !slots) return <div className="item-tiles-empty dim small">{empty ?? 'Nothing here.'}</div>;
  const pad = slots ? Math.max(0, slots - items.length) : 0;
  return (
    <div className={`item-tiles ${slots ? `fixed slots-${slots}` : ''}`}>
      {items.map((item) => (
        <ItemTile key={item.uid} item={item} s={s} selected={selected?.(item)} marked={marked?.(item)} onClick={() => onClick?.(item)} />
      ))}
      {Array.from({ length: pad }, (_, i) => (
        <span key={`empty-${i}`} className="item-tile empty" />
      ))}
    </div>
  );
}

/** Bag pages hold 30 each: two for the 60-slot bag. */
export const BAG_PAGE = 30;

export function PageTabs({ count, page, setPage, fill }: { count: number; page: number; setPage: (n: number) => void; fill?: (i: number) => string }) {
  if (count < 2) return null;
  return (
    <div className="stash-pages">
      {Array.from({ length: count }, (_, i) => (
        <button key={i} className={`stash-page-tab ${i === page ? 'active' : ''}`} onClick={() => setPage(i)} title={fill?.(i)}>
          {i + 1}
        </button>
      ))}
    </div>
  );
}

export function SortTabs({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  return (
    <div className="tabs">
      {(['recent', 'rarity', 'slot'] as SortKey[]).map((k) => (
        <button key={k} className={`tab ${value === k ? 'active' : ''}`} onClick={() => onChange(k)}>
          {k[0].toUpperCase() + k.slice(1)}
        </button>
      ))}
    </div>
  );
}

/**
 * For gear outside the bag card: pick a rarity and click it again to salvage it (uniques ask once more).
 * Like the bag card, it leaves runed gear and gear in a set alone.
 */
export function SalvageByRarity({ s, items, onSalvage }: { s: GameState; items: Item[]; onSalvage: (uids: number[]) => void }) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState<{ rarity: Rarity; clicks: number } | null>(null);
  const list = (r: Rarity) => items.filter((i) => i.rarity === r && !i.rune && !inGearSet(s, i.uid)).map((i) => i.uid);
  const done = () => {
    setArmed(null);
    setOpen(false);
  };
  const click = (r: Rarity) => {
    const clicks = armed?.rarity === r ? armed.clicks + 1 : 1;
    if (clicks < (r === 'unique' ? 3 : 2)) return setArmed({ rarity: r, clicks });
    onSalvage(list(r));
    done();
  };
  const label = (r: Rarity) => {
    const n = list(r).length;
    if (armed?.rarity !== r) return `All ${r} (${n})`;
    return armed.clicks === 2 ? 'Sure? Click to salvage' : `Salvage ${n} ${r}?`;
  };
  if (!open) {
    return (
      <button className="btn sm" disabled={!items.length || !benchBuilt(s)} title={benchBuilt(s) ? '' : BENCH_UNBUILT} onClick={() => setOpen(true)}>
        Salvage by rarity…
      </button>
    );
  }
  return (
    <>
      {(['normal', 'magic', 'rare', 'unique'] as Rarity[]).map((r) => (
        <button key={r} className={`btn sm salvage-rarity rar-${r} ${armed?.rarity === r ? 'armed' : ''}`} disabled={!list(r).length} onClick={() => click(r)}>
          {label(r)}
        </button>
      ))}
      <button className="btn sm ghost" onClick={done}>
        Cancel
      </button>
    </>
  );
}

/**
 * The bag card: sorting, salvage mode, and click-to-equip (or a custom handler).
 * `items` defaults to the bag; the Crafting Bench passes bag + stash.
 */
export function Inventory({
  s,
  onPick,
  selected,
  title = 'Inventory',
  items = s.inventory,
  cap = BAG_SIZE,
  hint,
  actions,
}: {
  s: GameState;
  onPick?: (item: Item) => void;
  selected?: number | null;
  title?: string;
  items?: Item[];
  cap?: number | null;
  hint?: string;
  actions?: ReactNode;
}) {
  const [sort, setSort] = useState<SortKey>('recent');
  const [page, setPage] = useState(0);
  const [salvageMode, setSalvageMode] = useState(false);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  /** clicks so far on a rarity button: 1 selects them all, the next salvages (uniques ask once more) */
  const [armed, setArmed] = useState<{ rarity: Rarity; clicks: number } | null>(null);
  const sorted = sortItems(items, sort);
  const pages = Math.max(1, Math.ceil((cap ?? 0) / BAG_PAGE), Math.ceil(items.length / BAG_PAGE));
  const shownPage = Math.min(page, pages - 1);
  const pageItems = sorted.slice(shownPage * BAG_PAGE, (shownPage + 1) * BAG_PAGE);
  const markedUniques = items.some((i) => marked.has(i.uid) && i.rarity === 'unique');
  const [confirmMarked, setConfirmMarked] = useState(false);

  const done = () => {
    setMarked(new Set());
    setArmed(null);
    setConfirmMarked(false);
    setSalvageMode(false);
  };
  const salvageNow = (uids: number[]) => {
    game.act((st, ctx) => salvage(st, ctx, uids));
    done();
  };
  const clickRarity = (r: Rarity) => {
    // a rune or a gear set is a deliberate choice, so bulk salvage leaves that gear alone; click it to salvage it
    const list = items.filter((i) => i.rarity === r && !i.rune && !inGearSet(s, i.uid)).map((i) => i.uid);
    const clicks = armed?.rarity === r ? armed.clicks + 1 : 1;
    if (clicks === 1) {
      setMarked(new Set(list));
      setArmed({ rarity: r, clicks });
      setConfirmMarked(false);
    } else if (r === 'unique' && clicks === 2) setArmed({ rarity: r, clicks });
    else salvageNow(list);
  };
  const rarityLabel = (r: Rarity) => {
    const n = items.filter((i) => i.rarity === r && !i.rune && !inGearSet(s, i.uid)).length;
    const name = r[0].toUpperCase() + r.slice(1);
    if (armed?.rarity !== r) return `All ${r} (${n})`;
    if (r === 'unique' && armed.clicks === 1) return `Salvage ${n} unique?`;
    if (r === 'unique') return 'Sure? Click to salvage';
    return `Salvage ${n} ${name.toLowerCase()}`;
  };

  const click = (item: Item) => {
    if (salvageMode) {
      const next = new Set(marked);
      if (next.has(item.uid)) next.delete(item.uid);
      else next.add(item.uid);
      setMarked(next);
      setArmed(null);
      setConfirmMarked(false);
    } else if (onPick) onPick(item);
    else openItemMenu(item.uid);
  };

  return (
    <div className="card">
      <div className="card-title">
        {title}
        {cap != null && (
          <span className={`muted num ${items.length >= cap ? 'bad' : ''}`} style={{ fontFamily: 'var(--font)', fontSize: 12 }}>
            {items.length}/{cap}
          </span>
        )}
        <PageTabs
          count={pages}
          page={shownPage}
          setPage={setPage}
          fill={(i) => `${Math.max(0, Math.min(BAG_PAGE, items.length - i * BAG_PAGE))}/${BAG_PAGE}`}
        />
        <span className="grow" />
        <SortTabs value={sort} onChange={setSort} />
      </div>
      <div className="row wrap" style={{ marginBottom: 10 }}>
        {!salvageMode ? (
          <>
            <span className="dim" style={{ fontSize: 12 }}>
              {hint ?? (onPick ? 'Click an item to select it.' : 'Click an item for Equip, Stash, Salvage · hover to compare · right-click to pin')}
            </span>
            <span className="spacer" />
            {actions}
            <button className="btn sm" onClick={() => setSalvageMode(true)} disabled={!items.length || !benchBuilt(s)} title={benchBuilt(s) ? '' : BENCH_UNBUILT}>
              Salvage…
            </button>
          </>
        ) : (
          <>
            <span className="warn" style={{ fontSize: 12 }}>
              Click items, or a rarity twice, to salvage into Arcane Dust
            </span>
            <span className="spacer" />
            {(['normal', 'magic', 'rare', 'unique'] as Rarity[]).map((r) => (
              <button
                key={r}
                className={`btn sm salvage-rarity rar-${r} ${armed?.rarity === r ? 'armed' : ''}`}
                disabled={!items.some((i) => i.rarity === r)}
                onClick={() => clickRarity(r)}
              >
                {rarityLabel(r)}
              </button>
            ))}
            <button
              className="btn sm danger"
              disabled={!marked.size}
              onClick={() => {
                if (markedUniques && !confirmMarked) setConfirmMarked(true);
                else salvageNow([...marked]);
              }}
            >
              {markedUniques && confirmMarked ? 'Includes uniques. Sure?' : `Salvage ${marked.size} selected`}
            </button>
            <button className="btn sm ghost" onClick={done}>
              Cancel
            </button>
          </>
        )}
      </div>
      <ItemTiles
        s={s}
        items={pageItems}
        slots={BAG_PAGE}
        selected={(item) => selected === item.uid || (salvageMode && marked.has(item.uid))}
        onClick={click}
      />
      {!items.length && <div className="dim small item-tiles-note">Your bag is empty. Pick up loot from the ground in combat.</div>}
    </div>
  );
}

import { useState, type ReactNode } from 'react';
import { baseDef } from '../../data/bases';
import { BAG_SIZE } from '../../data/hideout';
import { salvage } from '../../engine/crafting';
import { equip, equipReason } from '../../engine/equipment';
import { itemName } from '../../engine/items';
import type { GameState, Item, Rarity } from '../../engine/types';
import { game } from '../../game';
import { Tooltip } from './common';
import { ItemIcon, ItemTip, pinItem, upgradeScore } from './ItemView';

export type SortKey = 'recent' | 'rarity' | 'slot' | 'upgrade';
const RARITY_ORDER: Record<Rarity, number> = { unique: 0, rare: 1, magic: 2, normal: 3 };

export function sortItems(s: GameState, items: Item[], key: SortKey): Item[] {
  const list = [...items];
  if (key === 'recent') return list.reverse();
  if (key === 'rarity') return list.sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || b.ilvl - a.ilvl);
  if (key === 'slot') return list.sort((a, b) => baseDef(a.baseId).slot.localeCompare(baseDef(b.baseId).slot));
  return list.sort((a, b) => upgradeScore(s, b) - upgradeScore(s, a));
}

function slotLabel(item: Item): string {
  const slot = baseDef(item.baseId).slot;
  return slot === 'body' ? 'Body armour' : slot[0].toUpperCase() + slot.slice(1);
}

/** One item as a tile: icon, name in its rarity colour, slot and item level, ▲ when it beats what's worn. */
export function ItemTile({
  item,
  s,
  onClick,
  selected,
  marked,
  showUpgrade,
}: {
  item: Item;
  s: GameState;
  onClick?: () => void;
  selected?: boolean;
  marked?: boolean;
  showUpgrade?: boolean;
}) {
  const better = showUpgrade && upgradeScore(s, item) > 0.5;
  return (
    <Tooltip content={<ItemTip item={item} state={s} />}>
      <button
        className={`item-tile rar-${item.rarity} ${selected ? 'selected' : ''} ${marked ? 'marked' : ''}`}
        onClick={onClick}
        onContextMenu={(e) => {
          e.preventDefault();
          pinItem(item);
        }}
      >
        <span className="item-tile-icon">
          <ItemIcon item={item} size={34} />
        </span>
        {better && <span className="item-tile-up" title="Upgrade">▲</span>}
        <span className={`item-tile-name rarity-${item.rarity}`}>{itemName(item)}</span>
        <span className="item-tile-meta">
          {slotLabel(item)} · i{item.ilvl}
        </span>
      </button>
    </Tooltip>
  );
}

export function ItemTiles({
  s,
  items,
  onClick,
  selected,
  marked,
  showUpgrade,
  empty,
}: {
  s: GameState;
  items: Item[];
  onClick?: (item: Item) => void;
  selected?: (item: Item) => boolean;
  marked?: (item: Item) => boolean;
  showUpgrade?: boolean;
  empty?: ReactNode;
}) {
  if (!items.length) return <div className="item-tiles-empty dim small">{empty ?? 'Nothing here.'}</div>;
  return (
    <div className="item-tiles">
      {items.map((item) => (
        <ItemTile key={item.uid} item={item} s={s} selected={selected?.(item)} marked={marked?.(item)} showUpgrade={showUpgrade} onClick={() => onClick?.(item)} />
      ))}
    </div>
  );
}

export function SortTabs({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
  return (
    <div className="tabs">
      {(['recent', 'rarity', 'slot', 'upgrade'] as SortKey[]).map((k) => (
        <button key={k} className={`tab ${value === k ? 'active' : ''}`} onClick={() => onChange(k)}>
          {k[0].toUpperCase() + k.slice(1)}
        </button>
      ))}
    </div>
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
  const [salvageMode, setSalvageMode] = useState(false);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const sorted = sortItems(s, items, sort);

  const click = (item: Item) => {
    if (salvageMode) {
      const next = new Set(marked);
      if (next.has(item.uid)) next.delete(item.uid);
      else next.add(item.uid);
      setMarked(next);
    } else if (onPick) onPick(item);
    else {
      const reason = equipReason(s, item);
      game.act((st, ctx) => reason ?? equip(st, ctx, item.uid));
    }
  };
  const markWhere = (f: (i: Item) => boolean) => setMarked(new Set(items.filter(f).map((i) => i.uid)));

  return (
    <div className="card">
      <div className="card-title">
        {title}
        {cap != null && (
          <span className={`muted num ${items.length >= cap ? 'bad' : ''}`} style={{ fontFamily: 'var(--font)', fontSize: 12 }}>
            {items.length}/{cap}
          </span>
        )}
        <span className="grow" />
        <SortTabs value={sort} onChange={setSort} />
      </div>
      <div className="row wrap" style={{ marginBottom: 10 }}>
        {!salvageMode ? (
          <>
            <span className="dim" style={{ fontSize: 12 }}>
              {hint ?? (onPick ? 'Click an item to select it.' : 'Click to equip · ▲ upgrade · right-click to pin')}
            </span>
            <span className="spacer" />
            {actions}
            <button className="btn sm" onClick={() => setSalvageMode(true)} disabled={!items.length}>
              Salvage…
            </button>
          </>
        ) : (
          <>
            <span className="warn" style={{ fontSize: 12 }}>
              Select items to salvage into Arcane Dust
            </span>
            <span className="spacer" />
            <button className="btn sm" onClick={() => markWhere((i) => i.rarity === 'normal')}>
              All normal
            </button>
            <button className="btn sm" onClick={() => markWhere((i) => i.rarity === 'normal' || i.rarity === 'magic')}>
              Normal + magic
            </button>
            <button
              className="btn sm danger"
              disabled={!marked.size}
              onClick={() => {
                game.act((st, ctx) => salvage(st, ctx, [...marked]));
                setMarked(new Set());
                setSalvageMode(false);
              }}
            >
              Salvage {marked.size}
            </button>
            <button
              className="btn sm ghost"
              onClick={() => {
                setSalvageMode(false);
                setMarked(new Set());
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
      <ItemTiles
        s={s}
        items={sorted}
        showUpgrade={!onPick && !salvageMode}
        selected={(item) => selected === item.uid || (salvageMode && marked.has(item.uid))}
        onClick={click}
        empty="Your bag is empty. Pick up loot from the ground in combat."
      />
    </div>
  );
}

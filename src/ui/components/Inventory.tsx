import { useState } from 'react';
import { baseDef } from '../../data/bases';
import { salvage } from '../../engine/crafting';
import { equip, equipReason } from '../../engine/equipment';
import { inventoryCapacity } from '../../engine/hideout';
import type { GameState, Item, Rarity } from '../../engine/types';
import { game } from '../../game';
import { ItemCell, upgradeScore } from './ItemView';

export type SortKey = 'recent' | 'rarity' | 'slot' | 'upgrade';
const RARITY_ORDER: Record<Rarity, number> = { unique: 0, rare: 1, magic: 2, normal: 3 };

export function sortItems(s: GameState, items: Item[], key: SortKey): Item[] {
  const list = [...items];
  if (key === 'recent') return list.reverse();
  if (key === 'rarity') return list.sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || b.ilvl - a.ilvl);
  if (key === 'slot') return list.sort((a, b) => baseDef(a.baseId).slot.localeCompare(baseDef(b.baseId).slot));
  return list.sort((a, b) => upgradeScore(s, b) - upgradeScore(s, a));
}

/** A checkered grid with one cell per inventory slot, empty ones included. */
export function ItemGrid({
  s,
  items,
  capacity,
  onClick,
  selected,
  showUpgrade,
}: {
  s: GameState;
  items: Item[];
  capacity: number;
  onClick?: (item: Item) => void;
  selected?: (item: Item) => boolean;
  showUpgrade?: boolean;
}) {
  const empty = Math.max(0, capacity - items.length);
  return (
    <div className="item-grid">
      {items.map((item) => (
        <ItemCell key={item.uid} item={item} state={s} selected={selected?.(item)} showUpgrade={showUpgrade} onClick={() => onClick?.(item)} />
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <div key={`e${i}`} className="grid-cell" />
      ))}
    </div>
  );
}

/** The inventory card: sorting, salvage mode, and click-to-equip (or a custom pick handler). */
export function Inventory({
  s,
  onPick,
  selected,
  title = 'Inventory',
}: {
  s: GameState;
  onPick?: (item: Item) => void;
  selected?: number | null;
  title?: string;
}) {
  const [sort, setSort] = useState<SortKey>('recent');
  const [salvageMode, setSalvageMode] = useState(false);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const items = sortItems(s, s.inventory, sort);
  const cap = inventoryCapacity(s);

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
  const markWhere = (f: (i: Item) => boolean) => setMarked(new Set(s.inventory.filter(f).map((i) => i.uid)));

  return (
    <div className="card">
      <div className="card-title">
        {title}
        <span className={`muted num ${s.inventory.length >= cap ? 'bad' : ''}`} style={{ fontFamily: 'var(--font)', fontSize: 12 }}>
          {s.inventory.length}/{cap}
        </span>
        <span className="grow" />
        <div className="tabs">
          {(['recent', 'rarity', 'slot', 'upgrade'] as SortKey[]).map((k) => (
            <button key={k} className={`tab ${sort === k ? 'active' : ''}`} onClick={() => setSort(k)}>
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="row wrap" style={{ marginBottom: 10 }}>
        {!salvageMode ? (
          <>
            <span className="dim" style={{ fontSize: 12 }}>
              {onPick ? 'Click an item to select it.' : 'Click to equip · ▲ upgrade · right-click to pin'}
            </span>
            <span className="spacer" />
            <button className="btn sm" onClick={() => setSalvageMode(true)} disabled={!s.inventory.length}>
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
      <ItemGrid
        s={s}
        items={items}
        capacity={cap}
        showUpgrade={!onPick && !salvageMode}
        selected={(item) => selected === item.uid || (salvageMode && marked.has(item.uid))}
        onClick={click}
      />
    </div>
  );
}

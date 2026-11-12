import { baseDef, UNIQUES, type UniqueDef } from '../../data/bases';
import { uniqueDropsIn, uniqueSections } from '../../data/uniqueList';
import type { GameState, Item } from '../../engine/types';
import { Tooltip } from './common';
import { ItemTile } from './Inventory';
import { openItemMenu } from './ItemMenu';
import { ItemIcon } from './ItemView';

/** The generator's section names, as players see them. */
const SECTION_LABEL: Record<string, string> = { 'Maps only': 'Maps', 'Achievement rewards': 'Achievements', 'No drop source yet': 'Other' };

/**
 * The Uniques tab: a fixed spot for every unique in the game, by the act that first drops it. A stashed unique sits in
 * its spot (with a count when there are copies); the rest show greyed out with where they drop.
 */
export function UniqueShelf({ s }: { s: GameState }) {
  const shelved = new Map<string, Item[]>();
  for (const i of s.account.uniqueStash) if (i.uniqueId) shelved.set(i.uniqueId, [...(shelved.get(i.uniqueId) ?? []), i]);
  const carried = new Map<string, string>();
  for (const i of s.inventory) if (i.uniqueId) carried.set(i.uniqueId, 'In your bag');
  for (const i of Object.values(s.equipment)) if (i?.uniqueId) carried.set(i.uniqueId, 'Worn by this character');
  const seen = new Set(s.account.uniquesSeen);
  const found = UNIQUES.filter((u) => seen.has(u.id) || shelved.has(u.id) || carried.has(u.id)).length;
  return (
    <div className="card stash-panel">
      <div className="dim small" style={{ marginBottom: 10 }}>
        Found <b className="num">{found}</b> of {UNIQUES.length} uniques. Every unique you stash lands in its own spot here, with no limit on room. Click one for Equip, To bag, Salvage.
      </div>
      {uniqueSections().map(([title, uniques]) => {
        if (!uniques.length) return null;
        const have = uniques.filter((u) => shelved.has(u.id)).length;
        return (
          <div key={title} className="currency-group">
            <div className="section-label">
              {SECTION_LABEL[title] ?? title} <span className="dim">· {have}/{uniques.length}</span>
            </div>
            <div className="item-tiles unique-shelf">
              {uniques.map((u) => (
                <UniqueSpot key={u.id} s={s} u={u} items={shelved.get(u.id) ?? []} status={carried.get(u.id) ?? (seen.has(u.id) ? 'Found before' : 'Not found yet')} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UniqueSpot({ s, u, items, status }: { s: GameState; u: UniqueDef; items: Item[]; status: string }) {
  if (items.length) {
    return (
      <div className="unique-spot">
        <ItemTile item={items[0]} s={s} onClick={() => openItemMenu(items[0].uid)} />
        {items.length > 1 && (
          <span className="unique-spot-count num" title={`${items.length} copies: take one out to reach the next`}>
            ×{items.length}
          </span>
        )}
      </div>
    );
  }
  const base = baseDef(u.baseId);
  const drops = uniqueDropsIn(u);
  return (
    <Tooltip
      content={
        <div className="tip">
          <div className="tip-title rarity-unique">{u.name}</div>
          <div className="muted">{base.name}</div>
          <div className="dim small" style={{ fontStyle: 'italic' }}>
            {u.flavour}
          </div>
          <div className="small" style={{ marginTop: 4 }}>
            {drops.length ? `${drops.every((d) => d.endsWith('(Achievement)')) ? 'Reward for' : 'Found from'} ${drops.join(', ')}` : 'No source yet'}
          </div>
          <div className="dim small">{status}</div>
        </div>
      }
    >
      <div className="item-tile rar-unique unique-spot-missing">
        <span className="item-tile-icon">
          <ItemIcon item={{ baseId: u.baseId, uniqueId: u.id } as Item} size={34} />
        </span>
        <span className="item-tile-name rarity-unique">{u.name}</span>
        <span className="item-tile-meta">{status}</span>
      </div>
    </Tooltip>
  );
}

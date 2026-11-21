import { useState, type ReactNode } from 'react';
import { flaskDef } from '../../data/flasks';
import { activeGemDef, supportGemDef } from '../../data/gems';
import { mapStockName } from '../../data/maps';
import { isMaterial, materialDef } from '../../data/materials';
import { materialRoom } from '../../engine/bank';
import { guildGear, type GuildTransfer } from '../../engine/guildStash';
import { itemName } from '../../engine/items';
import { useGame } from '../../game';
import { EmptyState, fmt, GameIcon, MatIcon, PageHeader, Tabs } from '../components/common';
import { FlaskIcon, FlaskTip } from '../components/FlaskView';
import { GemIcon, GemTip, SupportTip } from '../components/GemView';
import { GuildItemTransfer, GuildStackTransfer } from '../components/GuildTransferActions';
import { Icon } from '../components/Icon';
import { ItemIcon, ItemTip } from '../components/ItemView';
import type { Page } from '../Layout';
import '../inventory-screen.css';

const CATEGORIES = [
  { id: 'gear', label: 'Gear' }, { id: 'uniques', label: 'Uniques' }, { id: 'bank', label: 'Materials & currency' },
  { id: 'gems', label: 'Gems' }, { id: 'flaskStash', label: 'Flasks' }, { id: 'maps', label: 'Maps' },
] as const;
export type GuildStashCategory = typeof CATEGORIES[number]['id'];
type Entry = {
  name: string;
  icon: ReactNode;
  detail?: ReactNode;
} & (Omit<Extract<GuildTransfer, { uid: number }>, 'direction'> | {
  kind: 'bank' | 'maps';
  id: string;
  count: number;
  max: number;
});

function entryKey(entry: Entry): string {
  return `${entry.kind}:${'uid' in entry ? entry.uid : entry.id}`;
}

export function GuildStashPage({ go, initialCategory }: { go: (page: Page) => void; initialCategory: GuildStashCategory }) {
  const s = useGame();
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const { bank, maps, gems, supportGems, flaskStash } = s.account;
  let entries: Entry[];
  switch (category) {
    case 'gear':
    case 'uniques':
      entries = guildGear(s).filter((item) => (item.rarity === 'unique') === (category === 'uniques')).map((item) => ({
        kind: 'gear', uid: item.uid, name: itemName(item), icon: <ItemIcon item={item} size={34} />,
        detail: <ItemTip item={item} state={s} pinned />,
      }));
      break;
    case 'gems':
      entries = [
        ...gems.map((gem): Entry => {
          const def = activeGemDef(gem.gemId);
          return { kind: 'gems', uid: gem.uid, name: `${def.name} · Lv ${gem.level}`, icon: <GemIcon def={def} size={30} />, detail: <GemTip gem={gem} state={s} /> };
        }),
        ...supportGems.map((gem): Entry => {
          const def = supportGemDef(gem.supportId);
          return { kind: 'supportGems', uid: gem.uid, name: def.name, icon: <GemIcon def={def} size={30} support />, detail: <SupportTip supportId={gem.supportId} /> };
        }),
      ];
      break;
    case 'flaskStash':
      entries = flaskStash.map((flask) => ({
        kind: 'flaskStash', uid: flask.uid, name: flaskDef(flask.flaskId).name, icon: <FlaskIcon f={flask} size={32} />,
        detail: <FlaskTip f={flask} pinned />,
      }));
      break;
    case 'bank':
    case 'maps':
      entries = Object.entries(category === 'bank' ? bank : maps ?? {}).filter(([, count]) => count > 0).map(([id, count]) => ({
        kind: category, id, count,
        name: category === 'maps' ? mapStockName(id) : isMaterial(id) ? materialDef(id).name : id,
        icon: category === 'maps' ? <GameIcon name="map" size={28} /> : isMaterial(id) && <MatIcon id={id} size={30} />,
        max: category === 'bank' ? Math.min(count, materialRoom(s, id)) : count,
      }));
      break;
  }
  const query = search.trim().toLowerCase();
  const shown = entries.filter((entry) => entry.name.toLowerCase().includes(query)).sort((a, b) => a.name.localeCompare(b.name));
  const picked = shown.find((entry) => entryKey(entry) === selected);

  return (
    <div className="page guild-stash-page">
      <PageHeader title="Guild Stash" actions={<button className="btn sm" onClick={() => go('equipment')}>Inventory</button>}>
        Shared by your characters in this realm. Send items here from your inventory and withdraw them on another character.
      </PageHeader>
      <div className="guild-stash-layout">
        <div className="card guild-stash-browser">
          <Tabs tabs={[...CATEGORIES]} value={category} onChange={(next) => {
            setCategory(next);
            setSelected(null);
          }} />
          <input className="input" type="search" value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder="Search Guild Stash" aria-label="Search Guild Stash" />
          {shown.length ? (
            <div className="guild-stash-items">
              {shown.map((entry) => {
                const key = entryKey(entry);
                return (
                  <button type="button" key={key} className="material-tile" aria-pressed={selected === key} onClick={() => setSelected(selected === key ? null : key)}>
                    <span className="guild-stash-icon" aria-hidden="true">{entry.icon}</span>
                    <span className="material-name">{entry.name}</span>
                    {'count' in entry && <b className="num">{fmt(entry.count)}</b>}
                  </button>
                );
              })}
            </div>
          ) : <EmptyState small>{query ? 'No items match your search.' : 'Nothing in this tab.'}</EmptyState>}
        </div>
        {picked && <button type="button" className="guild-stash-backdrop" aria-label="Close item details" onClick={() => setSelected(null)} />}
        <aside className={`card guild-stash-detail${picked ? ' picked' : ''}`} aria-label="Item details">
          {picked ? (
            <>
              <button type="button" className="btn sm ghost guild-stash-close" aria-label="Close" onClick={() => setSelected(null)}><Icon name="close" size={12} /></button>
              {picked.detail ?? <div className="card-title">{picked.icon} {picked.name}</div>}
              {'uid' in picked ? (
                <GuildItemTransfer key={entryKey(picked)} move={{ direction: 'withdraw', kind: picked.kind, uid: picked.uid }} />
              ) : (
                <GuildStackTransfer key={entryKey(picked)} direction="withdraw" kind={picked.kind} id={picked.id} max={picked.max} />
              )}
            </>
          ) : <EmptyState small>Select an item to withdraw it.</EmptyState>}
        </aside>
      </div>
    </div>
  );
}

import { useState, type ReactNode } from 'react';
import { flaskDef } from '../../data/flasks';
import { activeGemDef, supportGemDef } from '../../data/gems';
import { mapStockName } from '../../data/maps';
import { isMaterial, materialDef } from '../../data/materials';
import { materialRoom } from '../../engine/bank';
import { guildGear, type GuildTransfer } from '../../engine/guildStash';
import { itemName } from '../../engine/items';
import type { Item } from '../../engine/types';
import { useGame } from '../../game';
import { EmptyState, fmt, GameIcon, MatIcon, PageHeader, Tabs } from '../components/common';
import { FlaskIcon, FlaskTip } from '../components/FlaskView';
import { GemIcon, GemTip, SupportTip } from '../components/GemView';
import { GuildItemTransfer, GuildStackTransfer } from '../components/GuildTransferActions';
import { Icon } from '../components/Icon';
import { ItemTile } from '../components/Inventory';
import { ItemIcon, ItemTip } from '../components/ItemView';
import type { Page } from '../Layout';
import '../inventory-screen.css';
import './guild-vault.css';

const CATEGORIES = [
  { id: 'gear', label: 'Gear' }, { id: 'uniques', label: 'Uniques' }, { id: 'bank', label: 'Materials & currency' },
  { id: 'gems', label: 'Gems' }, { id: 'flaskStash', label: 'Flasks' }, { id: 'maps', label: 'Maps' },
] as const;
export type GuildStashCategory = typeof CATEGORIES[number]['id'];
type Entry = {
  name: string;
  icon: ReactNode;
  detail?: ReactNode;
  /** gear only: drawn with the Inventory's own item tile */
  item?: Item;
} & (Omit<Extract<GuildTransfer, { uid: number }>, 'direction'> | {
  kind: 'bank' | 'maps';
  id: string;
  count: number;
  max: number;
});

/** Empty slots padded into the vault grid, so a sparse tab still reads as a stash page. */
const VAULT_SLOTS = 60;

const KIND_LABEL: Record<Entry['kind'], string> = {
  gear: 'Equipment', gems: 'Skill gem', supportGems: 'Support gem', flaskStash: 'Flask', bank: 'Material', maps: 'Map',
};

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
        detail: <ItemTip item={item} state={s} pinned />, item,
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
  const tabLabel = CATEGORIES.find((c) => c.id === category)?.label ?? '';
  const toggle = (key: string) => setSelected(selected === key ? null : key);
  const pad = Math.max(0, VAULT_SLOTS - shown.length);

  return (
    <div className="page guild-stash-page guild-vault">
      <PageHeader title="Guild Stash" actions={<button className="btn sm" onClick={() => go('equipment')}>Inventory</button>}>
        Shared by your characters in this realm. Send items here from your inventory and withdraw them on another character.
      </PageHeader>
      <div className="gv-layout">
        <section className="card gv-browser" aria-label="Guild Vault">
          <header className="gv-browser-head">
            <span className="gv-emblem" aria-hidden="true"><GameIcon name="stash" size={22} /></span>
            <div className="gv-browser-title">
              <span className="gv-kicker">The Guild Vault</span>
              <h2>{tabLabel}</h2>
            </div>
            <span className="gv-capacity num" title="Items shown in this tab">
              <b>{fmt(shown.length)}</b>{query ? ` of ${fmt(entries.length)}` : ''} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </header>
          <Tabs tabs={[...CATEGORIES]} value={category} onChange={(next) => {
            setCategory(next);
            setSelected(null);
          }} />
          <input className="input gv-search" type="search" value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder="Search Guild Stash" aria-label="Search Guild Stash" />
          {shown.length ? (
            <div className="gv-grid" role="list">
              {shown.map((entry) => {
                const key = entryKey(entry);
                const isPicked = selected === key;
                return (
                  <span role="listitem" key={key} className="gv-slot">
                    {entry.item ? (
                      <ItemTile item={entry.item} s={s} compact selected={isPicked} onClick={() => toggle(key)} />
                    ) : (
                      <button
                        type="button"
                        className={`item-tile compact gv-cell${isPicked ? ' selected' : ''}`}
                        aria-pressed={isPicked}
                        aria-label={'count' in entry ? `${entry.name}, ${fmt(entry.count)}` : entry.name}
                        title={entry.name}
                        onClick={() => toggle(key)}
                      >
                        <span className="item-tile-icon" aria-hidden="true">{entry.icon}</span>
                        {'count' in entry && <span className="gv-stack num">{fmt(entry.count)}</span>}
                      </button>
                    )}
                  </span>
                );
              })}
              {Array.from({ length: pad }, (_, i) => <span key={`empty-${i}`} className="gv-slot gv-empty" aria-hidden="true" />)}
            </div>
          ) : <EmptyState small>{query ? 'No items match your search.' : 'Nothing in this tab.'}</EmptyState>}
        </section>
        <aside className={`card gv-inspector${picked ? ' picked' : ''}`} aria-label="Item details">
          <span className="gv-rivet tl" aria-hidden="true" /><span className="gv-rivet tr" aria-hidden="true" />
          <span className="gv-rivet bl" aria-hidden="true" /><span className="gv-rivet br" aria-hidden="true" />
          {picked ? (
            <>
              <header className="gv-inspector-head">
                <span className="gv-inspector-socket" aria-hidden="true">{picked.icon}</span>
                <div className="gv-inspector-title">
                  <span className="gv-kicker">{KIND_LABEL[picked.kind]}</span>
                  <h3>{picked.name}</h3>
                  {'count' in picked && <span className="gv-held num">{fmt(picked.count)} in the vault</span>}
                </div>
                <button type="button" className="btn sm ghost gv-close" aria-label="Close" onClick={() => setSelected(null)}><Icon name="close" size={12} /></button>
              </header>
              {picked.detail && <div className="gv-inspector-body">{picked.detail}</div>}
              <div className="gv-tray">
                {'uid' in picked ? (
                  <GuildItemTransfer key={entryKey(picked)} move={{ direction: 'withdraw', kind: picked.kind, uid: picked.uid }} />
                ) : (
                  <GuildStackTransfer key={entryKey(picked)} direction="withdraw" kind={picked.kind} id={picked.id} max={picked.max} />
                )}
              </div>
            </>
          ) : (
            <div className="gv-inspector-idle">
              <span className="gv-inspector-socket idle" aria-hidden="true"><GameIcon name="stash" size={26} /></span>
              <p>Select an item to withdraw it.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

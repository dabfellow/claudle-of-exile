import { useState } from 'react';
import { activeGemDef, supportGemDef } from '../../data/gems';
import { flaskDef } from '../../data/flasks';
import { isMaterial, materialDef } from '../../data/materials';
import { DOOMED_TIERS, parseDoomedTier, parseMapTier, UNIQUE_MAPS } from '../../data/maps';
import { materialRoom } from '../../engine/bank';
import { guildGear, type GuildDirection } from '../../engine/guildStash';
import { itemName } from '../../engine/items';
import { stashedItems } from '../../engine/storage';
import type { GameState } from '../../engine/types';
import { game } from '../../game';
import { EmptyState, fmt, Tabs } from './common';

const CATEGORIES = [
  { id: 'bank', label: 'Materials & currency' }, { id: 'gear', label: 'Gear' },
  { id: 'gems', label: 'Gems' }, { id: 'flaskStash', label: 'Flasks' }, { id: 'maps', label: 'Maps' },
] as const;
type Category = typeof CATEGORIES[number]['id'];
type UniqueRow = { kind: 'gear' | 'gems' | 'supportGems' | 'flaskStash'; uid: number; name: string };

function stackName(kind: 'bank' | 'maps', id: string): string {
  if (kind === 'bank') return isMaterial(id) ? materialDef(id).name : id;
  const unique = UNIQUE_MAPS.find((map) => map.id === id);
  if (unique) return unique.name;
  const doomed = parseDoomedTier(id);
  if (doomed) return DOOMED_TIERS[doomed - 1].name;
  const tier = parseMapTier(id);
  return tier ? `Tier ${tier} Map` : id;
}

export function GuildStashPanel({ s }: { s: GameState }) {
  const [direction, setDirection] = useState<GuildDirection>('withdraw');
  const [category, setCategory] = useState<Category>('bank');
  const [search, setSearch] = useState('');
  const deposit = direction === 'deposit';
  const holdings = deposit ? s.storage : s.account;
  const button = deposit ? 'Deposit' : 'Withdraw';
  const hit = (name: string) => name.toLowerCase().includes(search.trim().toLowerCase());
  const stackKind = category === 'bank' || category === 'maps' ? category : null;
  let items: UniqueRow[] = [];
  if (category === 'gear') {
    const gear = deposit ? [...s.inventory, ...stashedItems(s)] : guildGear(s);
    items = gear.map((item) => ({ kind: 'gear', uid: item.uid, name: itemName(item) }));
  } else if (category === 'gems') {
    items = [
      ...holdings.gems.map((gem): UniqueRow => ({ kind: 'gems', uid: gem.uid, name: `${activeGemDef(gem.gemId).name} · L${gem.level}` })),
      ...holdings.supportGems.map((gem): UniqueRow => ({ kind: 'supportGems', uid: gem.uid, name: supportGemDef(gem.supportId).name })),
    ];
  } else if (category === 'flaskStash') {
    items = holdings.flaskStash.map((flask) => ({ kind: 'flaskStash', uid: flask.uid, name: flaskDef(flask.flaskId).name }));
  }
  items = items.filter((item) => hit(item.name)).sort((a, b) => a.name.localeCompare(b.name));
  const stacks = stackKind && Object.entries(stackKind === 'bank' ? holdings.bank : (deposit ? s.maps.stock : s.account.maps ?? {}))
    .filter(([id, count]) => count > 0 && hit(stackName(stackKind, id)))
    .sort(([a], [b]) => stackName(stackKind, a).localeCompare(stackName(stackKind, b)));

  return <div className="guild-stash">
    <Tabs tabs={[{ id: 'withdraw', label: 'Withdraw from Guild Stash' }, { id: 'deposit', label: 'Deposit from character' }]} value={direction} onChange={setDirection} />
    <Tabs tabs={[...CATEGORIES]} value={category} onChange={setCategory} />
    <input className="input" type="search" value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder="Search items" aria-label="Search Guild Stash transfers" />
    {stackKind && stacks ? stacks.map(([id, count]) => {
      const name = stackName(stackKind, id);
      const max = !deposit && stackKind === 'bank' ? Math.min(count, materialRoom(s, id)) : count;
      return <form className="guild-stash-row" key={`${direction}:${stackKind}:${id}`} onSubmit={(e) => {
        e.preventDefault();
        const quantity = Number(new FormData(e.currentTarget).get('quantity'));
        game.moveGuildStock({ direction, kind: stackKind, id, quantity });
      }}>
        <span>{name} <span className="muted">×{fmt(count)}</span></span>
        {max > 0 ? <>
          <input className="input sm" name="quantity" type="number" min={1} max={max} defaultValue={1} required aria-label={`${name} quantity`} />
          <button className="btn small" type="submit">{button}</button>
          <button className="btn small" type="button" aria-label={`${button} max ${name}`} onClick={() => game.moveGuildStock({ direction, kind: stackKind, id, quantity: max })}>Max</button>
        </> : <span className="muted">Character stack full</span>}
      </form>;
    }) : items.map(({ kind, uid, name }) => <div className="guild-stash-row" key={`${kind}:${uid}`}>
      <span>{name}</span>
      <button className="btn small" onClick={() => game.moveGuildStock({ direction, kind, uid })} aria-label={`${button} ${name}`}>{button}</button>
    </div>)}
    {!items.length && !stacks?.length && <EmptyState>No items to {deposit ? 'deposit' : 'withdraw'}.</EmptyState>}
  </div>;
}

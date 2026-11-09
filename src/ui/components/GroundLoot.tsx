import { useState } from 'react';
import { BAG_SIZE, groundCap, offlineHaulCap } from '../../data/hideout';
import { BENCH_UNBUILT, benchBuilt } from '../../engine/crafting';
import { groundAtRisk, pickUp, salvagePile, type Pile } from '../../engine/storage';
import { evaluateLootFilter } from '../../engine/lootFilter';
import type { GameState } from '../../engine/types';
import { game } from '../../game';
import { ItemTiles, SalvageByRarity } from './Inventory';
import { openItemMenu } from './ItemMenu';

const PILES: Record<Pile, { title: string; hint: (cap: number) => string; empty: string }> = {
  ground: {
    title: 'On the ground',
    hint: (cap) => `Newest first. Past ${cap}, the oldest drop is lost. Stays when you leave an area; die twice without picking it up and it is lost.`,
    empty: 'Gear that drops shows up here for you to pick up.',
  },
  offlineHaul: {
    title: 'Found while you were away',
    hint: () => 'Newest first. Stays until you pick it up or salvage it.',
    empty: '',
  },
};

/** A pile of dropped gear: click to pick up into the bag. */
export function LootPile({ s, pile }: { s: GameState; pile: Pile }) {
  const info = PILES[pile];
  const stashLvl = s.account.hideout.stash ?? 1;
  const cap = pile === 'ground' ? groundCap(stashLvl) : offlineHaulCap(stashLvl);
  const allItems = [...s[pile]].reverse();
  const items = allItems.filter((item) => evaluateLootFilter(s, item).visible);
  const hidden = allItems.length - items.length;
  const take = (uids: number[]) => game.act((st, ctx) => void pickUp(st, ctx, pile, uids));
  const bagFull = s.inventory.length >= BAG_SIZE;
  const atRisk = pile === 'ground' ? groundAtRisk(s) : 0;
  const noBench = pile === 'ground' && !benchBuilt(s);
  const hasUniques = items.some((i) => i.rarity === 'unique');
  const [confirmUniques, setConfirmUniques] = useState(false);
  const salvageAll = () => {
    if (hasUniques && !confirmUniques) return setConfirmUniques(true);
    setConfirmUniques(false);
    game.act((st, ctx) => void salvagePile(st, ctx, pile));
  };
  return (
    <div className="card">
      <div className="card-title">
        {info.title}
        <span className="muted num" style={{ fontFamily: 'var(--font)', fontSize: 12 }}>
          {items.length}/{cap}
        </span>
        <span className="grow" />
        <span className={`card-hint num ${bagFull ? 'bad' : ''}`}>
          Bag {s.inventory.length}/{BAG_SIZE}
        </span>
      </div>
      <div className="row wrap" style={{ marginBottom: 10 }}>
        <span className="dim small">{info.hint(cap)}</span>
        {hidden > 0 && <span className="dim small">{hidden} hidden by your Quartermaster filter</span>}
        {atRisk > 0 && <span className="bad small">{atRisk} lost if you die again</span>}
        <span className="spacer" />
        <button className="btn sm primary" disabled={!items.length || bagFull} onClick={() => take(items.map((i) => i.uid))}>
          Pick up all
        </button>
        <button
          className="btn sm ghost"
          disabled={!items.length || noBench}
          title={noBench ? BENCH_UNBUILT : ''}
          onClick={salvageAll}
          onMouseLeave={() => setConfirmUniques(false)}
        >
          {hasUniques && confirmUniques ? 'Includes uniques. Sure?' : pile === 'ground' ? 'Salvage all' : 'Salvage the rest'}
        </button>
        <SalvageByRarity s={s} items={items} onSalvage={(uids) => game.act((st, ctx) => void salvagePile(st, ctx, pile, uids))} />
      </div>
      <ItemTiles s={s} items={items} onClick={(i) => openItemMenu(i.uid)} empty={info.empty} />
    </div>
  );
}

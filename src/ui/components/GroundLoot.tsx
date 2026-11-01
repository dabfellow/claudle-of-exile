import { useState } from 'react';
import { BAG_SIZE, GROUND_CAP, OFFLINE_HAUL_CAP } from '../../data/hideout';
import { BENCH_UNBUILT, benchBuilt } from '../../engine/crafting';
import { groundAtRisk, pickUp, salvagePile, type Pile } from '../../engine/storage';
import type { GameState } from '../../engine/types';
import { game } from '../../game';
import { ItemTiles, SalvageByRarity } from './Inventory';
import { upgradeScore } from './ItemView';
import { openItemMenu } from './ItemMenu';

const PILES: Record<Pile, { title: string; cap: number; hint: string; empty: string }> = {
  ground: {
    title: 'On the ground',
    cap: GROUND_CAP,
    hint: 'Newest first. Past 50, the oldest drop is lost. Stays when you leave an area; die twice without picking it up and it is lost.',
    empty: 'Gear that drops shows up here for you to pick up.',
  },
  offlineHaul: {
    title: 'Found while you were away',
    cap: OFFLINE_HAUL_CAP,
    hint: 'Newest first. Stays until you pick it up or salvage it.',
    empty: '',
  },
};

/** A pile of dropped gear: click to pick up into the bag. */
export function LootPile({ s, pile }: { s: GameState; pile: Pile }) {
  const info = PILES[pile];
  const items = [...s[pile]].reverse();
  const upgrades = items.filter((i) => upgradeScore(s, i) > 0.5);
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
          {items.length}/{info.cap}
        </span>
        <span className="grow" />
        <span className={`card-hint num ${bagFull ? 'bad' : ''}`}>
          Bag {s.inventory.length}/{BAG_SIZE}
        </span>
      </div>
      <div className="row wrap" style={{ marginBottom: 10 }}>
        <span className="dim small">{info.hint}</span>
        {atRisk > 0 && <span className="bad small">{atRisk} lost if you die again</span>}
        <span className="spacer" />
        <button className="btn sm" disabled={!upgrades.length || bagFull} onClick={() => take(upgrades.map((i) => i.uid))}>
          Pick up upgrades ({upgrades.length})
        </button>
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
      <ItemTiles s={s} items={items} showUpgrade onClick={(i) => openItemMenu(i.uid)} empty={info.empty} />
    </div>
  );
}

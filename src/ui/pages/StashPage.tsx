import { useState, type ReactNode } from 'react';
import { activeGemDef, supportGemDef } from '../../data/gems';
import { currencyDef, MATERIALS, materialDef } from '../../data/materials';
import { STASH_PAGE_SIZE } from '../../data/hideout';
import { challengeName, isSolo } from '../../engine/challenge';
import { wearFlask } from '../../engine/combat';
import { salvage } from '../../engine/crafting';
import { clearableGems, clearLevelOneGems } from '../../engine/gems';
import { sortFigure, sortItems, type SortKey } from '../../engine/itemSort';
import { buyStashPage, setStashAffinity, settleOverflow, stashedItems, stashItems, stashPagePrice, stashPageRoom, takeFromStash } from '../../engine/storage';
import { game } from '../../game';
import type { GameState, StashAffinity } from '../../engine/types';
import { useGame } from '../../game';
import { Art, CurrencyAmount, EmptyState, fmt, MatIcon, PageHeader, Tabs, Tooltip, type TabDef } from '../components/common';
import { FlaskShelf } from '../components/FlaskView';
import { GemIcon, GemTip, SupportTip } from '../components/GemView';
import { Orb, Swatch } from '../components/Icon';
import { Inventory, ItemTiles, SalvageByRarity, StashSort } from '../components/Inventory';
import { PaperDoll } from '../components/PaperDoll';
import { UniqueShelf } from '../components/UniqueShelf';
import type { Page } from '../Layout';
import { openItemMenu } from '../components/ItemMenu';

type Tab = 'gear' | 'uniques' | 'currency' | 'materials' | 'gems' | 'flasks';

/** The currency tab has a fixed place for every orb, like a real stash tab. */
const CURRENCY_LAYOUT: { label: string; ids: string[] }[] = [
  { label: 'Basic', ids: ['transmute', 'augment', 'alteration', 'scour', 'regret'] },
  { label: 'Rare', ids: ['regal', 'alchemy', 'chaos', 'annul'] },
  { label: 'Precious', ids: ['exalted', 'divine', 'fractured', 'expansion', 'instill'] },
];

const MATERIAL_GROUPS: { label: string; kinds: string[] }[] = [
  { label: 'Ores & Gems', kinds: ['ore', 'gem'] },
  { label: 'Bars & Planks', kinds: ['component'] },
  { label: 'Logs', kinds: ['log'] },
  { label: 'Herbs', kinds: ['herb'] },
  { label: 'Boss Trophies & Sigils', kinds: ['trophy'] },
  { label: 'Fossils', kinds: ['fossil'] },
  { label: 'Essences', kinds: ['essence'] },
  { label: 'Resin & Shards', kinds: ['resin', 'shard'] },
  { label: 'Contraband', kinds: ['contraband'] },
  { label: 'Artifacts', kinds: ['artifact'] },
  { label: 'Runes', kinds: ['rune'] },
  { label: 'Meals & Ingredients', kinds: ['food', 'ingredient'] },
  { label: 'Vellum & Ink', kinds: ['chart'] },
  { label: 'Other', kinds: ['dust'] },
];

function CurrencySlot({ s, id }: { s: GameState; id: string }) {
  const def = currencyDef(id);
  const n = s.account.bank[id] ?? 0;
  return (
    <Tooltip
      content={
        <div className="tip">
          <div className="tip-title" style={{ color: 'var(--currency)' }}>
            {def.name}
          </div>
          <div>{def.desc}</div>
          <div className="dim small" style={{ marginTop: 4 }}>
            Worth about {def.value} gold to the trader
          </div>
        </div>
      }
    >
      <div className={`currency-slot ${n > 0 ? '' : 'none'}`} style={{ ['--orb' as string]: def.color }}>
        <Orb color={def.color} size={40} glow={n > 0} />
        <span className="currency-count num">{fmt(n)}</span>
        <span className="currency-name">{def.short}</span>
      </div>
    </Tooltip>
  );
}

function MaterialTile({ s, id }: { s: GameState; id: string }) {
  const def = materialDef(id);
  const n = s.account.bank[id] ?? 0;
  return (
    <Tooltip
      content={
        <div className="tip">
          <div className="tip-title">{def.name}</div>
          {def.desc && <div className="muted">{def.desc}</div>}
          <div className="dim small">{def.value} gold each at the trader</div>
        </div>
      }
    >
      <div className={`material-tile ${n > 0 ? '' : 'none'}`}>
        <Art src={`materials/${id}.png`} alt={def.name} size={44} fallback={<Swatch color={def.color} size={26} />} />
        <span className="material-name">{def.name}</span>
        <b className="num">{fmt(n)}</b>
      </div>
    </Tooltip>
  );
}

export function StashPage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const [tab, setTab] = useState<Tab>('gear');
  const [page, setPage] = useState(0);
  const here = Math.min(page, s.account.stash.length - 1);
  const tabs: TabDef<Tab>[] = [
    { id: 'gear', label: 'Gear', count: stashedItems(s).length - s.account.uniqueStash.length },
    { id: 'uniques', label: 'Uniques', count: s.account.uniqueStash.length },
    { id: 'currency', label: 'Currency' },
    { id: 'materials', label: 'Materials' },
    { id: 'gems', label: 'Gems', count: s.account.gems.length + s.account.supportGems.length },
    { id: 'flasks', label: 'Flasks', count: s.account.flaskStash.length },
  ];
  const isChallenge = !!challengeName(s.character.challenge);
  const clearable = clearableGems(s).length;
  return (
    <div className="page">
      <PageHeader title="Stash" actions={<CurrencyAmount id="gold" amount={s.account.bank.gold ?? 0} label="gold" />}>
        {isSolo(s) ? 'Every tab here, and your gold, belongs to this character alone.' : `Every tab here, and your gold, is shared by all your ${isChallenge ? `${challengeName(s.character.challenge)} ` : ''}characters.`} Your skill bar and belt stay with this character.
      </PageHeader>
      <div className="stash-top">
        <div className="card doll-card">
          <PaperDoll s={s} onItem={(_, it) => openItemMenu(it.uid)} onFlask={() => setTab('flasks')} onEmptyFlask={() => setTab('flasks')} emptyFlaskTitle="Click to pick from your spare flasks" />
        </div>
        <Inventory
          s={s}
          stashSorts
          hint="Click an item for Equip, Stash, Salvage. Stash all fills the page below."
          actions={
            <button className="btn sm" disabled={!s.inventory.length} onClick={() => game.act((st, ctx) => void stashItems(st, ctx, st.inventory.map((i) => i.uid), here))}>
              Stash all
            </button>
          }
        />
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {/* every tab sits in the same cell, so the panel is always as tall as the tallest and switching never jumps */}
      <div className="stash-views">
        <StashTab on={tab === 'gear'}>
          <Overflow s={s} />
          <GearPages s={s} page={here} setPage={setPage} />
        </StashTab>

        <StashTab on={tab === 'uniques'}>
          <UniqueShelf s={s} />
        </StashTab>

        <StashTab on={tab === 'currency'}>
          <div className="card stash-panel">
            {CURRENCY_LAYOUT.map((g) => (
              <div key={g.label} className="currency-group">
                <div className="section-label">{g.label}</div>
                <div className="currency-row">
                  {g.ids.map((id) => (
                    <CurrencySlot key={id} s={s} id={id} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </StashTab>

        <StashTab on={tab === 'materials'}>
          <div className="card stash-panel">
            {MATERIAL_GROUPS.map((g) => (
              <div key={g.label} className="currency-group">
                <div className="section-label">{g.label}</div>
                <div className="material-grid">
                  {MATERIALS.filter((m) => g.kinds.includes(m.kind)).map((m) => (
                    <MaterialTile key={m.id} s={s} id={m.id} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </StashTab>

        <StashTab on={tab === 'gems'}>
          <div className="card stash-panel">
            <div className="row">
              <div className="section-label" style={{ margin: 0 }}>
                On your skill bar
              </div>
              <span className="spacer" />
              <button className="btn sm" onClick={() => go('skills')}>
                Manage skills
              </button>
            </div>
            <div className="gem-bag">
              {s.skillBar.filter(Boolean).map((g) => (
                <Tooltip key={g!.uid} content={<GemTip gem={g} state={s} />}>
                  <div className="gem-card">
                    <GemIcon def={activeGemDef(g!.gemId)} size={30} />
                    <span>
                      <b>{activeGemDef(g!.gemId).name}</b> <span className="dim">Lv {g!.level}</span>
                    </span>
                  </div>
                </Tooltip>
              ))}
            </div>
            <div className="row">
              <div className="section-label" style={{ margin: 0 }}>
                Spare skill gems ({s.account.gems.length})
              </div>
              <span className="spacer" />
              <button
                className="btn sm"
                disabled={!clearable}
                title="Throws away spare level 1 skill gems. Supports in them go back to your loose supports. Gems with Expansion sockets or in a saved skill set stay."
                onClick={() => {
                  if (confirm(`Throw away ${clearable} spare level 1 skill gem${clearable === 1 ? '' : 's'}? The Gem shop sells them all again.`)) game.act((st) => void clearLevelOneGems(st));
                }}
              >
                Clear all Lv 1 ({clearable})
              </button>
            </div>
            {s.account.gems.length === 0 && <EmptyState small>No spare skill gems. Buy them at the Gem shop.</EmptyState>}
            <div className="gem-bag">
              {s.account.gems.map((g) => (
                <Tooltip key={g.uid} content={<GemTip gem={g} state={s} />}>
                  <div className="gem-card">
                    <GemIcon def={activeGemDef(g.gemId)} size={30} />
                    <span>
                      <b>{activeGemDef(g.gemId).name}</b> <span className="dim">Lv {g.level}</span>
                    </span>
                  </div>
                </Tooltip>
              ))}
            </div>
            <div className="section-label">Support gems ({s.account.supportGems.length})</div>
            {s.account.supportGems.length === 0 && <EmptyState small>No loose support gems. Buy them at the Gem shop or cut them with Gemcutting.</EmptyState>}
            <div className="gem-bag">
              {s.account.supportGems.map((g) => (
                <Tooltip key={g.uid} content={<SupportTip supportId={g.supportId} />}>
                  <div className="gem-card">
                    <GemIcon def={supportGemDef(g.supportId)} size={26} support />
                    <b>{supportGemDef(g.supportId).name}</b>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        </StashTab>

        <StashTab on={tab === 'flasks'}>
          <div className="card stash-panel">
            <div className="row">
              <span className="dim small">Spare flasks. Click one to put it on your belt; craft and enchant them at the Crafting Bench.</span>
              <span className="spacer" />
              <button className="btn sm" onClick={() => go('bench')}>
                Open Crafting Bench
              </button>
            </div>
            {s.account.flaskStash.length === 0 && <EmptyState small>No spare flasks. Brew them with Alchemy or loot them.</EmptyState>}
            <FlaskShelf flasks={s.account.flaskStash} onPick={(f) => game.act((st) => wearFlask(st, f.uid))} />
          </div>
        </StashTab>
      </div>
    </div>
  );
}

/** One Stash tab. Hidden tabs keep their space (see .stash-views) but can't be seen, hovered or tabbed to. */
function StashTab({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <div className={`stash-view ${on ? '' : 'off'}`} aria-hidden={!on}>
      {children}
    </div>
  );
}

const salvageGear = (uids: number[]) => game.act((st, ctx) => void salvage(st, ctx, uids));

/** Items that didn't fit when characters' stashes were merged. Nothing here is lost: take it out or move it in as room appears. */
function Overflow({ s }: { s: GameState }) {
  const items = s.account.overflow;
  if (!items.length) return null;
  const room = s.account.stash.some((_, i) => stashPageRoom(s, i) > 0);
  return (
    <div className="card stash-panel" style={{ marginBottom: 12 }}>
      <div className="row wrap" style={{ marginBottom: 10 }}>
        <div>
          <b className="warn">Stash overflow · {items.length}</b>
          <div className="dim small">These didn't fit when your characters' stashes were merged. They're safe here, and nothing new can be added.</div>
        </div>
        <span className="spacer" />
        <SalvageByRarity s={s} items={items} onSalvage={salvageGear} />
        <button className="btn sm" disabled={!room} title={room ? undefined : 'Your stash pages are full'} onClick={() => game.act((st) => void settleOverflow(st))}>
          Move to stash pages
        </button>
      </div>
      <ItemTiles s={s} items={items} slots={items.length} onClick={(i) => openItemMenu(i.uid)} />
    </div>
  );
}

const AFFINITIES: { id: StashAffinity | ''; label: string }[] = [
  { id: '', label: 'None' },
  { id: 'gear', label: 'Gear' },
  { id: 'maps', label: 'Maps' },
  { id: 'currency', label: 'Currency' },
  { id: 'gems', label: 'Gems' },
  { id: 'flasks', label: 'Flasks' },
  { id: 'contraband', label: 'Contraband' },
];

/** The stash's gear pages: pick a page, click an item to take it back to the bag. */
function GearPages({ s, page, setPage }: { s: GameState; page: number; setPage: (n: number) => void }) {
  const [sort, setSort] = useState<SortKey>('recent');
  const price = stashPagePrice(s);
  const pages = s.account.stash;
  const items = pages[page] ?? [];
  const currentAffinity = s.account.stashAffinities?.[page] ?? '';
  return (
    <div className="card stash-panel">
      <div className="card-title">
        <div className="stash-pages">
          {pages.map((p, i) => {
            const aff = s.account.stashAffinities?.[i];
            return (
              <button key={i} className={`stash-page-tab ${i === page ? 'active' : ''}`} onClick={() => setPage(i)} title={`${p.length}/${STASH_PAGE_SIZE}${aff ? ` · Affinity: ${aff}` : ''}`}>
                {i + 1}
                {aff && <span className="aff-dot" title={`Affinity: ${aff}`}>★</span>}
                {p.length >= STASH_PAGE_SIZE && <span className="bad"> ●</span>}
              </button>
            );
          })}
          <button className="stash-page-tab buy" disabled={(s.account.bank.gold ?? 0) < price} title={`Buy stash page ${pages.length + 1}`} onClick={() => game.act((st, ctx) => buyStashPage(st, ctx))}>
            + <MatIcon id="gold" size={12} /> {fmt(price)}
          </button>
        </div>
        <span className="grow" />
        <label className="dim small row" style={{ gap: 6, alignItems: 'center' }}>
          <span>Affinity</span>
          <select
            className="input sm"
            value={currentAffinity}
            onChange={(e) => {
              const val = e.target.value as StashAffinity | '';
              game.act((st) => setStashAffinity(st, page, val ? val : null));
            }}
          >
            {AFFINITIES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <StashSort value={sort} onChange={setSort} />
      </div>
      <div className="row wrap" style={{ marginBottom: 10 }}>
        <span className="dim small">
          Page {page + 1} ·{' '}
          <span className="num">
            {items.length}/{STASH_PAGE_SIZE}
          </span>{' '}
          · click an item for Equip, To bag, Salvage
        </span>
        <span className="spacer" />
        <SalvageByRarity s={s} items={items} onSalvage={salvageGear} />
        <button
          className="btn sm"
          disabled={!items.length}
          onClick={() =>
            game.act(
              (st, ctx) =>
                void takeFromStash(
                  st,
                  ctx,
                  (st.account.stash[page] ?? []).map((i) => i.uid),
                ),
            )
          }
        >
          Take all
        </button>
      </div>
      <ItemTiles s={s} items={sortItems(items, sort, s)} slots={STASH_PAGE_SIZE} figure={(i) => sortFigure(i, sort)} onClick={(i) => openItemMenu(i.uid)} />
    </div>
  );
}

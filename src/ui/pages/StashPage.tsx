import { useState, type ReactNode } from 'react';
import { baseDef } from '../../data/bases';
import { activeGemDef, supportGemDef } from '../../data/gems';
import { allMods, describeMod, itemName } from '../../engine/items';
import { currencyDef, MATERIALS, materialDef } from '../../data/materials';
import { STASH_PAGE_SIZE } from '../../data/hideout';
import { challengeName, isSolo } from '../../engine/challenge';
import { wearFlask } from '../../engine/combat';
import { salvage } from '../../engine/crafting';
import { clearableGems, clearLevelOneGems } from '../../engine/gems';
import { sortFigure, sortItems, type SortKey } from '../../engine/itemSort';
import { buyStashPage, setStashAffinity, settleOverflow, stashedItems, stashItems, stashPagePrice, stashPageRoom, takeFromStash } from '../../engine/storage';
import { game } from '../../game';
import type { GameState, Item, Rarity, StashAffinity } from '../../engine/types';
import '../round2-session3.css';
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
  const [gemSearch, setGemSearch] = useState('');
  const gemHit = (name: string) => name.toLowerCase().includes(gemSearch.trim().toLowerCase());
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
          <MaterialsPanel s={s} />
        </StashTab>

        <StashTab on={tab === 'gems'}>
          <div className="card stash-panel">
            <div className="row wrap">
              <div className="section-label" style={{ margin: 0 }}>
                On your skill bar
              </div>
              <span className="spacer" />
              <input className="input sm r2-stash-gem-search" type="search" placeholder="Search gems" aria-label="Search gems" value={gemSearch} onChange={(e) => setGemSearch(e.target.value)} />
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
              {s.account.gems.filter((g) => gemHit(activeGemDef(g.gemId).name)).map((g) => (
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
              {s.account.supportGems.filter((g) => gemHit(supportGemDef(g.supportId).name)).map((g) => (
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

/** Every material by family, with a search and a switch to hide the ones you have none of. */
function MaterialsPanel({ s }: { s: GameState }) {
  const [search, setSearch] = useState('');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [group, setGroup] = useState('');
  const q = search.trim().toLowerCase();
  const groups = MATERIAL_GROUPS.filter((g) => !group || g.label === group)
    .map((g) => ({
      ...g,
      list: MATERIALS.filter((m) => g.kinds.includes(m.kind) && (!ownedOnly || (s.account.bank[m.id] ?? 0) > 0) && (!q || m.name.toLowerCase().includes(q))),
    }))
    .filter((g) => g.list.length);
  return (
    <div className="card stash-panel">
      <div className="r2-stash-filters">
        <input className="input" type="search" placeholder="Search materials" aria-label="Search materials" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input sm" aria-label="Kind" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Every kind</option>
          {MATERIAL_GROUPS.map((g) => (
            <option key={g.label} value={g.label}>
              {g.label}
            </option>
          ))}
        </select>
        <button className={`gem-chip ${ownedOnly ? 'active' : ''}`} aria-pressed={ownedOnly} onClick={() => setOwnedOnly(!ownedOnly)}>
          Only ones I have
        </button>
      </div>
      {!groups.length && <EmptyState small>No materials match.</EmptyState>}
      {groups.map((g) => (
        <div key={g.label} className="currency-group">
          <div className="section-label">{g.label}</div>
          <div className="material-grid">
            {g.list.map((m) => (
              <MaterialTile key={m.id} s={s} id={m.id} />
            ))}
          </div>
        </div>
      ))}
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

const SLOT_FILTERS: { id: string; label: string }[] = [
  { id: '', label: 'Any slot' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'offhand', label: 'Off hands' },
  { id: 'helmet', label: 'Helmets' },
  { id: 'body', label: 'Body armour' },
  { id: 'gloves', label: 'Gloves' },
  { id: 'boots', label: 'Boots' },
  { id: 'belt', label: 'Belts' },
  { id: 'amulet', label: 'Amulets' },
  { id: 'ring', label: 'Rings' },
];
const GEAR_RARITIES: Rarity[] = ['normal', 'magic', 'rare'];

/** Everything a search can hit on an item: its name, its base and every modifier line. */
function itemText(item: Item): string {
  let base = '';
  try {
    base = baseDef(item.baseId).name;
  } catch {
    // a base from a newer build: the name still matches
  }
  return [itemName(item), base, ...allMods(item).map((m) => describeMod(m))].join('\n').toLowerCase();
}

/** The stash's gear pages: pick a page, click an item to take it back to the bag. */
function GearPages({ s, page, setPage }: { s: GameState; page: number; setPage: (n: number) => void }) {
  const [sort, setSort] = useState<SortKey>('recent');
  const [search, setSearch] = useState('');
  const [slot, setSlot] = useState('');
  const [rarity, setRarity] = useState<Rarity | null>(null);
  const [everyPage, setEveryPage] = useState(true);
  const price = stashPagePrice(s);
  const pages = s.account.stash;
  const items = pages[page] ?? [];
  const currentAffinity = s.account.stashAffinities?.[page] ?? '';
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtering = words.length > 0 || !!slot || !!rarity;
  const matches = (i: Item) => {
    if (rarity && i.rarity !== rarity) return false;
    if (slot) {
      try {
        if (baseDef(i.baseId).slot !== slot) return false;
      } catch {
        return false;
      }
    }
    if (!words.length) return true;
    const text = itemText(i);
    return words.every((w) => text.includes(w));
  };
  const pageOf = new Map<number, number>();
  pages.forEach((p, n) => p.forEach((i) => pageOf.set(i.uid, n)));
  const shown = !filtering ? items : (everyPage ? pages.flat() : items).filter(matches);
  const perPage = filtering ? pages.map((p) => p.filter(matches).length) : [];
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
      <div className="r2-stash-filters">
        <input className="input" type="search" placeholder="Search names and modifiers" aria-label="Search names and modifiers" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input sm" aria-label="Slot" value={slot} onChange={(e) => setSlot(e.target.value)}>
          {SLOT_FILTERS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
        <div className="gem-chips" role="group" aria-label="Rarity">
          {GEAR_RARITIES.map((r) => (
            <button key={r} className={`gem-chip ${rarity === r ? 'active' : ''}`} aria-pressed={rarity === r} onClick={() => setRarity(rarity === r ? null : r)}>
              <span style={{ color: `var(--${r})` }}>{r[0].toUpperCase() + r.slice(1)}</span>
            </button>
          ))}
        </div>
        {filtering && (
          <>
            <div className="gem-chips" role="group" aria-label="Where to look">
              <button className={`gem-chip ${everyPage ? 'active' : ''}`} onClick={() => setEveryPage(true)}>
                Every page
              </button>
              <button className={`gem-chip ${everyPage ? '' : 'active'}`} onClick={() => setEveryPage(false)}>
                This page
              </button>
            </div>
            <button
              className="btn sm ghost"
              onClick={() => {
                setSearch('');
                setSlot('');
                setRarity(null);
              }}
            >
              Clear
            </button>
          </>
        )}
      </div>
      {filtering && (
        <div className="r2-stash-hits dim small">
          {shown.length} {shown.length === 1 ? 'match' : 'matches'}
          {everyPage ? ' across your stash' : ` on page ${page + 1}`}
          {everyPage &&
            perPage.some((n) => n > 0) &&
            perPage.map((n, i) =>
              n ? (
                <button key={i} className={`stash-page-tab ${i === page ? 'active' : ''}`} title={`Go to page ${i + 1}`} onClick={() => setPage(i)}>
                  Page {i + 1} · {n}
                </button>
              ) : null,
            )}
        </div>
      )}
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
      {filtering ? (
        <ItemTiles
          s={s}
          items={sortItems(shown, sort, s)}
          empty="Nothing in your stash matches."
          // across pages, each tile says which page it sits on
          figure={(i) => (everyPage ? `p${(pageOf.get(i.uid) ?? 0) + 1}` : sortFigure(i, sort))}
          onClick={(i) => openItemMenu(i.uid)}
        />
      ) : (
        <ItemTiles s={s} items={sortItems(items, sort, s)} slots={STASH_PAGE_SIZE} figure={(i) => sortFigure(i, sort)} onClick={(i) => openItemMenu(i.uid)} />
      )}
    </div>
  );
}

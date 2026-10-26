import { useState } from 'react';
import { activeGemDef, supportGemDef } from '../../data/gems';
import { currencyDef, MATERIALS, materialDef } from '../../data/materials';
import { flaskName } from '../../engine/flasks';
import { STASH_PAGE_SIZE } from '../../data/hideout';
import { buyStashPage, stashedItems, stashItems, stashPagePrice, takeFromStash } from '../../engine/storage';
import { game } from '../../game';
import type { GameState } from '../../engine/types';
import { useGame } from '../../game';
import { Art, CurrencyAmount, EmptyState, fmt, MatIcon, PageHeader, Tabs, Tooltip, type TabDef } from '../components/common';
import { FlaskIcon, FlaskTip, pinFlask } from '../components/FlaskView';
import { GemIcon, GemTip, SupportTip } from '../components/GemView';
import { Orb, Swatch } from '../components/Icon';
import { Inventory, ItemTiles, sortItems, SortTabs, type SortKey } from '../components/Inventory';
import { PaperDoll } from '../components/PaperDoll';
import type { Page } from '../Layout';
import { openItemMenu } from '../components/ItemMenu';

type Tab = 'gear' | 'currency' | 'materials' | 'gems' | 'flasks';

/** The currency tab has a fixed place for every orb, like a real stash tab. */
const CURRENCY_LAYOUT: { label: string; ids: string[] }[] = [
  { label: 'Basic', ids: ['transmute', 'augment', 'alteration', 'scour', 'regret'] },
  { label: 'Rare', ids: ['regal', 'alchemy', 'chaos', 'annul'] },
  { label: 'Precious', ids: ['exalted', 'divine', 'expansion', 'instill'] },
];

const MATERIAL_GROUPS: { label: string; kinds: string[] }[] = [
  { label: 'Ores & Gems', kinds: ['ore', 'gem'] },
  { label: 'Logs', kinds: ['log'] },
  { label: 'Herbs', kinds: ['herb'] },
  { label: 'Fossils', kinds: ['fossil'] },
  { label: 'Essences', kinds: ['essence'] },
  { label: 'Resin & Shards', kinds: ['resin', 'shard'] },
  { label: 'Other', kinds: ['dust'] },
];

function CurrencySlot({ s, id }: { s: GameState; id: string }) {
  const def = currencyDef(id);
  const n = s.bank[id] ?? 0;
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
  const n = s.bank[id] ?? 0;
  return (
    <Tooltip
      content={
        <div className="tip">
          <div className="tip-title">{def.name}</div>
          {def.desc && <div className="muted">{def.desc}</div>}
          <div className="dim small">
            {def.value} gold each at the trader
          </div>
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
  const here = Math.min(page, s.stash.length - 1);
  const tabs: TabDef<Tab>[] = [
    { id: 'gear', label: 'Gear', count: stashedItems(s).length },
    { id: 'currency', label: 'Currency' },
    { id: 'materials', label: 'Materials' },
    { id: 'gems', label: 'Gems', count: s.gems.length + s.supportGems.length },
    { id: 'flasks', label: 'Flasks', count: s.flaskStash.length },
  ];
  return (
    <div className="page">
      <PageHeader title="Stash" actions={<CurrencyAmount id="gold" amount={s.bank.gold ?? 0} label="gold" />}>
        Everything you've gathered, brewed and looted.
      </PageHeader>
      <div className="stash-top">
        <div className="card doll-card">
          <PaperDoll s={s} onItem={(_, it) => openItemMenu(it.uid)} onFlask={() => undefined} emptyFlaskTitle="Equip flasks at the Crafting Bench" />
        </div>
        <Inventory
          s={s}
          hint="Click an item for Equip, Stash, Salvage. Stash all fills the page below."
          actions={
            <button className="btn sm" disabled={!s.inventory.length} onClick={() => game.act((st, ctx) => void stashItems(st, ctx, st.inventory.map((i) => i.uid), here))}>
              Stash all
            </button>
          }
        />
      </div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'gear' && <GearPages s={s} page={here} setPage={setPage} />}

      {tab === 'currency' && (
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
      )}

      {tab === 'materials' && (
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
      )}


      {tab === 'gems' && (
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
          <div className="section-label">Spare skill gems ({s.gems.length})</div>
          {s.gems.length === 0 && <EmptyState small>No spare skill gems. They drop from monsters, especially bosses.</EmptyState>}
          <div className="gem-bag">
            {s.gems.map((g) => (
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
          <div className="section-label">Support gems ({s.supportGems.length})</div>
          {s.supportGems.length === 0 && <EmptyState small>No loose support gems. Cut them with Gemcutting or find them on monsters.</EmptyState>}
          <div className="gem-bag">
            {s.supportGems.map((g) => (
              <Tooltip key={g.uid} content={<SupportTip supportId={g.supportId} />}>
                <div className="gem-card">
                  <GemIcon def={supportGemDef(g.supportId)} size={26} support />
                  <b>{supportGemDef(g.supportId).name}</b>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {tab === 'flasks' && (
        <div className="card stash-panel">
          <div className="row">
            <span className="dim small">
              Spare flasks. Equip, craft and enchant them at the Crafting Bench.
            </span>
            <span className="spacer" />
            <button className="btn sm" onClick={() => go('bench')}>
              Open Crafting Bench
            </button>
          </div>
          {s.flaskStash.length === 0 && <EmptyState small>No spare flasks. Brew them with Alchemy or loot them.</EmptyState>}
          <div className="gem-bag">
            {s.flaskStash.map((f) => (
              <Tooltip key={f.uid} content={<FlaskTip f={f} />}>
                <div className="gem-card" onContextMenu={(e) => (e.preventDefault(), pinFlask(f))}>
                  <FlaskIcon f={f} size={30} />
                  <b className={f.rarity === 'magic' ? 'magic-text' : ''}>{flaskName(f)}</b>
                </div>
              </Tooltip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** The stash's gear pages: pick a page, click an item to take it back to the bag. */
function GearPages({ s, page, setPage }: { s: GameState; page: number; setPage: (n: number) => void }) {
  const [sort, setSort] = useState<SortKey>('recent');
  const price = stashPagePrice(s);
  const items = s.stash[page] ?? [];
  return (
    <div className="card stash-panel">
      <div className="card-title">
        <div className="stash-pages">
          {s.stash.map((p, i) => (
            <button key={i} className={`stash-page-tab ${i === page ? 'active' : ''}`} onClick={() => setPage(i)} title={`${p.length}/${STASH_PAGE_SIZE}`}>
              {i + 1}
              {p.length >= STASH_PAGE_SIZE && <span className="bad"> ●</span>}
            </button>
          ))}
          <button
            className="stash-page-tab buy"
            disabled={(s.bank.gold ?? 0) < price}
            title={`Buy stash page ${s.stash.length + 1}`}
            onClick={() => game.act((st, ctx) => buyStashPage(st, ctx))}
          >
            + <MatIcon id="gold" size={12} /> {fmt(price)}
          </button>
        </div>
        <span className="grow" />
        <SortTabs value={sort} onChange={setSort} />
      </div>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="dim small">
          Page {page + 1} · <span className="num">{items.length}/{STASH_PAGE_SIZE}</span> · click an item for Equip, To bag, Salvage
        </span>
        <span className="spacer" />
        <button className="btn sm" disabled={!items.length} onClick={() => game.act((st, ctx) => void takeFromStash(st, ctx, (st.stash[page] ?? []).map((i) => i.uid)))}>
          Take all
        </button>
      </div>
      <ItemTiles s={s} items={sortItems(s, items, sort)} showUpgrade onClick={(i) => openItemMenu(i.uid)} empty="This page is empty. Use Stash all, or click a bag item and Send to stash." />
    </div>
  );
}

import { useState } from 'react';
import { activeGemDef, supportGemDef } from '../../data/gems';
import { currencyDef, MATERIALS, materialDef } from '../../data/materials';
import { flaskName } from '../../engine/flasks';
import type { GameState } from '../../engine/types';
import { useGame } from '../../game';
import { Art, CurrencyAmount, EmptyState, fmt, PageHeader, Tabs, Tooltip, type TabDef } from '../components/common';
import { FlaskIcon, FlaskTip, pinFlask } from '../components/FlaskView';
import { GemIcon, GemTip, SupportTip } from '../components/GemView';
import { Orb, Swatch } from '../components/Icon';
import { Inventory } from '../components/Inventory';
import type { Page } from '../Layout';

type Tab = 'currency' | 'materials' | 'items' | 'gems' | 'flasks';

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
        <Art src={`currency/${id}.png`} alt={def.name} size={52} fallback={<Orb color={def.color} size={40} glow={n > 0} />} />
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
  const [tab, setTab] = useState<Tab>('currency');
  const tabs: TabDef<Tab>[] = [
    { id: 'currency', label: 'Currency' },
    { id: 'materials', label: 'Materials' },
    { id: 'items', label: 'Items', count: s.inventory.length },
    { id: 'gems', label: 'Gems', count: s.gems.length + s.supportGems.length },
    { id: 'flasks', label: 'Flasks', count: s.flaskStash.length },
  ];
  return (
    <div className="page">
      <PageHeader title="Stash" actions={<CurrencyAmount id="gold" amount={s.bank.gold ?? 0} label="gold" />}>
        Everything you've gathered, brewed and looted.
      </PageHeader>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />

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

      {tab === 'items' && <Inventory s={s} title="Items" />}

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

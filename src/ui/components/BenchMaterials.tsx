import type { ReactNode } from 'react';
import { ESSENCES, FOSSILS, RESINS, SEAL, WAX } from '../../data/craftMats';
import { WHETSTONE } from '../../data/expedition';
import { materialDef } from '../../data/materials';
import { RUNES } from '../../data/runes';
import type { GameState } from '../../engine/types';
import { fmt, MatIcon } from './common';

/** The crafting materials the bench uses, by where they come from, so the bench can show what you own of each. */
export const BENCH_MATERIAL_GROUPS: { id: string; label: string; source: string; ids: string[] }[] = [
  { id: 'dust', label: 'Arcane Dust', source: 'Salvage gear here at the bench', ids: ['arcane_dust'] },
  { id: 'fossils', label: 'Fossils', source: 'Mining and act bosses', ids: FOSSILS.map((f) => f.id) },
  { id: 'essences', label: 'Essences', source: 'Foraging and act bosses', ids: ESSENCES.map((e) => e.id) },
  { id: 'runes', label: 'Runes', source: 'Rune-carving', ids: RUNES.map((r) => r.id) },
  { id: 'contraband', label: 'Seals & Wax', source: 'Thieving Heists, rarely combat', ids: [SEAL, WAX] },
  { id: 'whetstones', label: 'Whetstones', source: 'Archaeology', ids: [WHETSTONE] },
  { id: 'resins', label: 'Resins', source: 'Woodcutting, used when Smithing', ids: RESINS.map((r) => r.id) },
  { id: 'shards', label: 'Orb shards', source: 'Gathering skills; Alchemy fuses them into orbs', ids: ['trans_shard', 'aug_shard', 'alt_shard'] },
];

const owned = (s: GameState, id: string) => s.account.bank[id] ?? 0;

/** One line per material family: what you hold in total, and where more comes from. Click to jump to them. */
export function BenchMaterialSummary({ s, onOpen }: { s: GameState; onOpen?: (group: string) => void }) {
  return (
    <div className="card r2-mat-summary">
      <div className="card-title">
        Your crafting materials
        <span className="grow" />
        <span className="card-hint">Hover one to see where more comes from</span>
      </div>
      <div className="r2-mat-summary-list">
        {BENCH_MATERIAL_GROUPS.map((g) => {
          const total = g.ids.reduce((n, id) => n + owned(s, id), 0);
          const kinds = g.ids.filter((id) => owned(s, id) > 0).length;
          const icon = g.ids.find((id) => owned(s, id) > 0) ?? g.ids[0];
          return (
            <button
              key={g.id}
              className={`r2-mat-chip ${total ? '' : 'none'}`}
              title={`${g.label}: ${g.source}`}
              onClick={onOpen ? () => onOpen(g.id) : undefined}
              disabled={!onOpen}
            >
              <MatIcon id={icon} size={16} />
              <span className="r2-mat-name">{g.label}</span>
              <b className="num">{fmt(total)}</b>
              {g.ids.length > 1 && total > 0 && <span className="dim small">{kinds} kinds</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The materials of one family: the ones you hold as buttons (rendered by the caller), then the rest, greyed, with
 * where they come from, so you can see what exists before you have it.
 */
export function MaterialChoices({ s, ids, source, render }: { s: GameState; ids: string[]; source: string; render: (id: string, count: number) => ReactNode }) {
  const have = ids.filter((id) => owned(s, id) > 0);
  const missing = ids.filter((id) => owned(s, id) <= 0);
  return (
    <>
      {have.length > 0 ? (
        <div className="fossil-chips" style={{ marginTop: 4 }}>
          {have.map((id) => render(id, owned(s, id)))}
        </div>
      ) : (
        <div className="dim small">None yet. They come from {source}.</div>
      )}
      {missing.length > 0 && have.length > 0 && (
        <details className="r2-mat-missing">
          <summary className="dim small">
            Not owned yet ({missing.length}) · from {source}
          </summary>
          <div className="fossil-chips">
            {missing.map((id) => (
              <span key={id} className="r2-mat-chip none" title={materialDef(id).desc ?? materialDef(id).name}>
                <MatIcon id={id} size={12} />
                <span className="r2-mat-name">{materialDef(id).name}</span>
                <b className="num">0</b>
              </span>
            ))}
          </div>
        </details>
      )}
    </>
  );
}

/** A recipe's cost as owned / needed, red where you're short. */
export function CostHave({ cost, have }: { cost: Record<string, number>; have: Record<string, number> }) {
  return (
    <div className="r2-cost">
      {Object.entries(cost).map(([id, n]) => {
        const got = have[id] ?? 0;
        return (
          <span key={id} className={`r2-cost-item ${got < n ? 'short' : ''}`} title={`${materialDef(id).name}: you have ${fmt(got)}, this needs ${fmt(n)}`}>
            <MatIcon id={id} size={12} />
            <span className="r2-mat-name">{materialDef(id).name}</span>
            <span className="num">
              <b>{fmt(got)}</b>/{fmt(n)}
            </span>
          </span>
        );
      })}
    </div>
  );
}

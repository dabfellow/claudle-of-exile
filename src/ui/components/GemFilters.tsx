import type { ReactNode } from 'react';
import type { ActiveGemDef, GemAttr } from '../../data/gems';

export type GemKind = 'all' | 'attack' | 'spell' | 'area' | 'utility';
export const GEM_KINDS: { id: GemKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'attack', label: 'Attacks' },
  { id: 'spell', label: 'Spells' },
  { id: 'area', label: 'Area' },
  { id: 'utility', label: 'Guards & buffs' },
];
const ATTRS: { id: GemAttr; label: string }[] = [
  { id: 'str', label: 'Str' },
  { id: 'dex', label: 'Dex' },
  { id: 'int', label: 'Int' },
];

export function kindMatches(def: ActiveGemDef, kind: GemKind): boolean {
  if (kind === 'all') return true;
  if (kind === 'utility') return def.role === 'guard' || def.role === 'buff' || def.role === 'curse' || def.role === 'sustain';
  return def.tags.includes(kind);
}

/** Whether a gem's name holds the search text. */
export const nameHas = (name: string, search: string) => name.toLowerCase().includes(search.trim().toLowerCase());

/** Search box and attribute chips, plus whatever else a gem list filters by. */
export function GemFilters({
  search,
  setSearch,
  attr,
  setAttr,
  children,
}: {
  search: string;
  setSearch: (v: string) => void;
  attr: GemAttr | null;
  setAttr: (a: GemAttr | null) => void;
  children?: ReactNode;
}) {
  return (
    <div className="gem-filters">
      <input className="input gem-search" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="gem-chips">
        {ATTRS.map((a) => (
          <button key={a.id} className={`gem-chip attr-${a.id} ${attr === a.id ? 'active' : ''}`} onClick={() => setAttr(attr === a.id ? null : a.id)}>
            {a.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}

/** The skill-type chips that sit inside GemFilters. */
export function GemKindChips({ kind, setKind }: { kind: GemKind; setKind: (k: GemKind) => void }) {
  return (
    <div className="gem-chips">
      {GEM_KINDS.map((k) => (
        <button key={k.id} className={`gem-chip ${kind === k.id ? 'active' : ''}`} onClick={() => setKind(k.id)}>
          {k.label}
        </button>
      ))}
    </div>
  );
}

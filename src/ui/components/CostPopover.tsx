import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ESSENCES, FOSSILS } from '../../data/craftMats';
import { materialDef } from '../../data/materials';
import { ACTIONS, SKILLS } from '../../data/skills';
import { fmt, MatIcon } from './common';
import type { Page } from '../Layout';

interface Source {
  label: string;
  detail?: string;
  page: Page;
}

const FOSSIL_IDS = new Set(FOSSILS.map((f) => f.id));
const ESSENCE_IDS = new Set(ESSENCES.map((e) => e.id));

/** Where a material can be got, each with the page that gets it. */
export function materialSources(id: string): Source[] {
  const out: Source[] = [];
  for (const a of ACTIONS) {
    if (a.soon || a.batchOf) continue;
    const made = a.outputs?.[id];
    const bonus = a.bonus?.find((b) => b.id === id);
    if (!made && !bonus) continue;
    out.push({
      label: `${SKILLS[a.skill].name}: ${a.name}`,
      detail: `Lv ${a.level}${bonus && !made ? ` · ${Math.round(bonus.chance * 100)}% chance` : ''}`,
      page: a.skill,
    });
  }
  if (id === 'gold') out.push({ label: 'Monster drops', page: 'campaign' }, { label: "Selling at the Trader's Stall", page: 'vendor' });
  if (id === 'arcane_dust') out.push({ label: 'Salvaging gear', detail: 'Stash or Equipment', page: 'stash' });
  if (FOSSIL_IDS.has(id) || ESSENCE_IDS.has(id)) out.push({ label: 'Area bosses', detail: 'about half of boss kills', page: 'campaign' });
  const kind = materialDef(id).kind;
  if (kind === 'currency') out.push({ label: 'Monster drops', page: 'campaign' }, { label: "Trader's Stall stock", page: 'vendor' });
  if (!out.length) out.push({ label: 'Monster drops', page: 'campaign' });
  return out;
}

/**
 * A cost hidden behind a chip: hover to see what you need and what you have; right-click to keep it open.
 * Inside, hover a material for where to get it (right-click keeps that open too) and click a source to go there.
 */
export function CostPopover({ cost, have, go }: { cost: Record<string, number>; have: Record<string, number>; go: (p: Page) => void }) {
  const [hover, setHover] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hoverMat, setHoverMat] = useState<string | null>(null);
  const [lockedMat, setLockedMat] = useState<string | null>(null);
  const [flip, setFlip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!locked) return;
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setLocked(false);
        setLockedMat(null);
      }
    };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [locked]);

  const open = hover || locked;

  // the sources fly out to the right of the panel, or to the left when there's no room
  useLayoutEffect(() => {
    const r = panelRef.current?.getBoundingClientRect();
    if (r) setFlip(r.right + 320 > window.innerWidth);
  }, [open]);

  const entries = Object.entries(cost);
  const missing = entries.filter(([id, n]) => (have[id] ?? 0) < n).length;
  const shownMat = lockedMat ?? hoverMat;

  return (
    <div
      ref={ref}
      className={`cost-pop ${open ? 'open' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setHoverMat(null);
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        setLocked((l) => !l);
        if (locked) setLockedMat(null);
      }}
    >
      <span className={`cost-chip ${missing ? 'short' : 'ready'}`}>
        {missing ? `Missing ${missing} of ${entries.length}` : 'All materials ready'}
        <span className="cost-chip-caret">▾</span>
      </span>
      {open && (
        <div ref={panelRef} className={`cost-panel ${flip ? 'flip' : ''}`} role="dialog">
          <div className="cost-panel-head">
            <span>Upgrade cost</span>
            <span className="dim">{locked ? 'locked · right-click to close' : 'right-click to lock'}</span>
          </div>
          {entries.map(([id, n]) => {
            const got = have[id] ?? 0;
            const ok = got >= n;
            return (
              <div
                key={id}
                className={`cost-row ${shownMat === id ? 'active' : ''}`}
                onMouseEnter={() => setHoverMat(id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLocked(true);
                  setLockedMat((m) => (m === id ? null : id));
                }}
              >
                <div className="cost-row-main">
                  <MatIcon id={id} size={16} />
                  <span className="cost-row-name">{materialDef(id).name}</span>
                  <span className={`num ${ok ? 'good' : 'bad'}`}>
                    {fmt(got)} / {fmt(n)}
                  </span>
                  <span className={ok ? 'good' : 'bad'}>{ok ? '✓' : '✗'}</span>
                </div>
                {shownMat === id && (
                  <div className="cost-sources">
                    <div className="cost-sources-box">
                      <div className="cost-sources-head">Where to get {materialDef(id).name}</div>
                      {materialSources(id).map((src) => (
                        <button key={src.label} className="cost-source" onClick={() => go(src.page)}>
                          <span>{src.label}</span>
                          {src.detail && <span className="dim">{src.detail}</span>}
                          <span className="cost-source-go">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

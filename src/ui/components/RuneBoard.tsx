import { RESONANCE_PER_PIECE, RUNE_FAMILIES, RUNE_GRADES, RUNE_READINGS, RUNES, runeEffect } from '../../data/runes';
import { describeStat } from '../../data/statText';
import { itemName } from '../../engine/items';
import { itemRune, runeMult, runesOpen, runeText } from '../../engine/runes';
import type { Item } from '../../engine/types';
import { useGame } from '../../game';
import { MatIcon } from './common';

/** What each family does in each reading, at the best grade you've carved or can see next. */
function RuneTable({ grade }: { grade: number }) {
  return (
    <div className="card">
      <div className="card-title">
        What runes do
        <span className="grow" />
        <span className="card-hint">{RUNE_GRADES[grade - 1].name} grade shown</span>
      </div>
      <div className="rune-table">
        <span />
        {RUNE_READINGS.map((x) => (
          <span key={x.id} className="section-label">
            {x.label}
          </span>
        ))}
        {RUNE_FAMILIES.map((f) => {
          const rune = RUNES.find((r) => r.family === f && r.grade.grade === grade)!;
          return [
            <b key={f.id} style={{ color: f.color }}>
              {f.name}
            </b>,
            ...RUNE_READINGS.map((x) => {
              const e = runeEffect(rune, x.id);
              return (
                <span key={`${f.id}-${x.id}`} className="small">
                  {describeStat(e.stat, e.value)}
                </span>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}

/** Rune-carving's own panel: which runes you're wearing, and what each family means on each kind of gear. */
export function RuneBoard() {
  const s = useGame();
  if (!runesOpen(s)) return <div className="callout skill-note">The rite of carving is kept behind the walls of the City of Saints. Reach Act 3 to start.</div>;
  const worn = Object.values(s.equipment).filter((i): i is Item => !!i);
  const inscribed = worn.filter((i) => itemRune(i));
  const best = Math.max(1, ...RUNES.filter((r) => s.bank[r.id] || inscribed.some((i) => itemRune(i) === r)).map((r) => r.grade.grade));
  return (
    <>
      <div className="callout skill-note">
        Inscribe runes at the Crafting Bench. Every piece of gear has one rune slot, uniques too. No orb touches it. Each other piece wearing the same family makes a rune <b>{Math.round(RESONANCE_PER_PIECE * 100)}%</b> stronger.
      </div>
      <div className="card">
        <div className="card-title">
          Runes you're wearing
          <span className="grow" />
          <span className="card-hint">
            {inscribed.length} of {worn.length} slots filled
          </span>
        </div>
        {inscribed.length === 0 && <div className="dim small">None yet.</div>}
        {inscribed.map((item) => {
          const rune = itemRune(item)!;
          return (
            <div key={item.uid} className="row wrap" style={{ gap: 6 }}>
              <MatIcon id={rune.id} size={12} />
              <span className={`rar-${item.rarity}`} style={{ color: 'var(--rar)' }}>
                {itemName(item)}
              </span>
              <span style={{ color: rune.family.color }}>{runeText(rune, item, runeMult(s, rune.family.id))}</span>
            </div>
          );
        })}
      </div>
      <RuneTable grade={best} />
    </>
  );
}

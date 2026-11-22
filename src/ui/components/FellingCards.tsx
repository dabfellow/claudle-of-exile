import { LEGENDS, PART_NAMES, GIANT_PARTS, SIZE_NAMES, woodDef } from '../../data/woodcutting';
import { dismissCards, giantName } from '../../engine/woodcutting';
import type { FellingCard } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, fmt } from './common';
import { QuirkChips, yieldWords } from './GiantView';
import './giants.css';

/** A small picture of the giant: a trunk and a crown in its wood's colour, bigger for bigger giants, a gold star for legends. */
function CardPicture({ card }: { card: FellingCard }) {
  const w = woodDef(card.region);
  const scale = { small: 0.6, medium: 0.75, large: 0.9, legend: 1, worldtree: 1 }[card.size];
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <g transform={`translate(32 60) scale(${scale}) translate(-32 -60)`}>
        <rect x="28" y="30" width="8" height="30" fill={w.color} />
        <ellipse cx="32" cy="22" rx="20" ry="16" fill="var(--success)" fillOpacity="0.8" />
        <circle cx="32" cy="46" r="3" fill="var(--accent)" />
      </g>
      {(card.legendId || card.worldTree) && <polygon points="54,4 56.5,10 63,10.5 58,14.5 59.5,21 54,17.5 48.5,21 50,14.5 45,10.5 51.5,10" fill="var(--rare)" />}
    </svg>
  );
}

function Card({ card }: { card: FellingCard }) {
  const legend = !!card.legendId || !!card.worldTree;
  const lines = GIANT_PARTS.map((p) => ({ p, words: yieldWords(card.yields[p]) })).filter((x) => x.words);
  return (
    <div className={`felling-card ${legend ? 'legend' : ''}`}>
      <CardPicture card={card} />
      <div>
        <h3>{giantName(card)}</h3>
        <div className="giant-chips">
          <Badge>{SIZE_NAMES[card.size]}</Badge>
          <Badge>{woodDef(card.region).region}</Badge>
          {legend && <Badge tone="gold">Legend</Badge>}
          <QuirkChips g={card} />
        </div>
        {lines.map(({ p, words }) => <p key={p}><b>{PART_NAMES[p]}:</b> {words}</p>)}
        {card.splinters > 0 && <p className="muted">Splinters made: {fmt(card.splinters)}</p>}
        {card.movedOn && <p className="muted">You moved on before the heart was done.</p>}
        {card.legendId && <p className="muted small">{LEGENDS.find((l) => l.id === card.legendId)?.desc}</p>}
      </div>
    </div>
  );
}

/** One card per giant that came down while you were away. Shown after the time-away summary. */
export function FellingCards() {
  const s = useGame();
  const cards = s.giant?.pendingCards ?? [];
  if (!cards.length || game.offline) return null;
  const sorted = [...cards].sort((a, b) => Number(!!b.legendId || !!b.worldTree) - Number(!!a.legendId || !!a.worldTree));
  return (
    <div className="modal-backdrop">
      <div className="card modal felling-modal" role="dialog" aria-label="Giants felled while you were away">
        <div className="away-kicker">The Woodcutter Returns</div>
        <h2>{cards.length === 1 ? 'A giant came down' : `${cards.length} giants came down`}</h2>
        <div className="felling-cards">
          {sorted.map((c) => <Card key={c.id} card={c} />)}
        </div>
        <button className="btn primary" onClick={() => game.act((st) => dismissCards(st))}>Continue</button>
      </div>
    </div>
  );
}

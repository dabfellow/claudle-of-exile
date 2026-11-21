import { CONSTELLATIONS, GILDED_STARDUST, STAR_SKILL_SPEED, starCost, STARDUST, STARS_PER_CONSTELLATION, type Constellation } from '../../data/astrology';
import { SKILLS } from '../../data/skills';
import { describeStat, describeStats } from '../../data/statText';
import { astrologyStats, lightStar, lightStarReason, starsLit, totalStarsLit } from '../../engine/astrology';
import type { GameState } from '../../engine/types';
import { levelOf } from '../../engine/xp';
import { game, useGame } from '../../game';
import { fmt, MatIcon } from './common';
import './star-chart.css';

function costText(cost: Record<string, number>): string {
  return Object.entries(cost)
    .map(([id, n]) => `${fmt(n)} ${id === STARDUST ? 'Stardust' : 'Gilded Stardust'}`)
    .join(' + ');
}

function Sky({ cst, lit }: { cst: Constellation; lit: number }) {
  const pts = cst.stars;
  return (
    <svg className="star-sky" viewBox="0 0 100 60" aria-hidden>
      {pts.slice(1, lit).map((p, i) => (
        <line key={i} x1={pts[i][0]} y1={pts[i][1]} x2={p[0]} y2={p[1]} className="star-line" style={{ stroke: cst.color }} />
      ))}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i < lit ? 3 : 1.8} className={i < lit ? 'star-lit' : 'star-dim'} style={i < lit ? { fill: cst.color } : undefined} />
      ))}
    </svg>
  );
}

function ConstellationCard({ s, cst }: { s: GameState; cst: Constellation }) {
  const lit = starsLit(s, cst.id);
  const level = levelOf('astrology', s.skills.astrology ?? 0);
  const locked = level < cst.level;
  const done = lit >= STARS_PER_CONSTELLATION;
  const reason = lightStarReason(s, cst);
  const skillName = cst.skill ? SKILLS[cst.skill].name : 'every profession';
  return (
    <div className={`star-card ${locked ? 'locked' : ''} ${done ? 'done' : ''}`} style={{ ['--cst' as string]: cst.color }}>
      <div className="star-card-head">
        <b>{cst.name}</b>
        <span className="dim num">{locked ? `Lv ${cst.level}` : `${lit}/${STARS_PER_CONSTELLATION}`}</span>
      </div>
      <Sky cst={cst} lit={lit} />
      <p className="muted star-lore">{cst.lore}</p>
      <ul className="star-bonus">
        <li>Each star: <b>{STAR_SKILL_SPEED}%</b> faster {skillName}</li>
        <li>Each star: {describeStat(cst.stat, cst.perStar)}</li>
        {lit > 0 && <li className="dim">Now: {lit * STAR_SKILL_SPEED}% faster {skillName}, {describeStat(cst.stat, lit * cst.perStar)}</li>}
      </ul>
      {!done && (
        <button className="btn sm" disabled={!!reason} title={reason ?? ''} onClick={() => game.act((st, ctx) => void lightStar(st, ctx, cst.id))}>
          {locked ? `Requires Astrology ${cst.level}` : `Light star ${lit + 1} · ${costText(starCost(cst, lit + 1))}`}
        </button>
      )}
    </div>
  );
}

/** Astrology's Star Chart: spend Stardust on each constellation's five stars. */
export function StarChart() {
  const s = useGame();
  const total = totalStarsLit(s);
  return (
    <div className="star-chart">
      <div className="callout skill-note star-summary">
        <span><MatIcon id={STARDUST} size={18} /> <b className="num">{fmt(s.storage.bank[STARDUST] ?? 0)}</b> Stardust</span>
        <span><MatIcon id={GILDED_STARDUST} size={18} /> <b className="num">{fmt(s.storage.bank[GILDED_STARDUST] ?? 0)}</b> Gilded</span>
        <span>Stars lit <b className="num">{total}/{CONSTELLATIONS.length * STARS_PER_CONSTELLATION}</b></span>
        {total > 0 && <span className="dim">{describeStats(astrologyStats(s)).join(' · ')}</span>}
      </div>
      <div className="star-grid">
        {CONSTELLATIONS.map((cst) => <ConstellationCard key={cst.id} s={s} cst={cst} />)}
      </div>
    </div>
  );
}

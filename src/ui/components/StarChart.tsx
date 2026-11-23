import { useState } from 'react';
import {
  BINARY_PARTNER, chartLayout, fallenKind, GILDED_STARDUST, MAX_GILDED_RANK, MAX_RANK, rankXp, REGIONS, regionDef, researchNeeded, skillLabel, STARDUST, starDef, STARS,
  type SkyRegion, type StarDef, type StarFamily,
} from '../../data/astrology';
import { actionDef } from '../../data/skills';
import {
  adjacentSlots, astrologyBlocker, astrologyLevel, chartReport, chartSlots, clearSlot, isUnlocked, placeStar, planClear, planPlace, rankUpCost, researchPoints,
  starRank, starXp, unlockedInRegion, type ChartEntry,
} from '../../engine/astrology';
import { actionBlocker, actionIntervalMs, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { EmptyState, fmt, GameIcon, MatIcon, ProgressBar } from './common';
import { LockedBadge, SkillIntro } from './SkillHelp';
import './star-chart.css';

const num = (v: number) => Number(v.toFixed(2));
const familyLabel: Record<StarFamily, string> = {
  skill: 'Profession', combat: 'Combat', wealth: 'Wealth', skilling: 'Skilling', conditional: 'Conditional',
};

function StarGlyph({ className }: { className?: string }) {
  return (
    <g className={className} aria-hidden="true">
      <circle r="3.6" className="astro-glow" />
      <path className="astro-ray" d="M0 -4.6 Q.65 -.65 3.55 0 Q.65 .65 0 4.6 Q-.65 .65 -3.55 0 Q-.65 -.65 0 -4.6Z" />
      <path className="astro-flare" d="M-1.8 -1.8 0 -.6 1.8 -1.8 .6 0 1.8 1.8 0 .6 -1.8 1.8 -.6 0Z" />
      <circle r=".65" fill="#fff8e9" />
    </g>
  );
}

/** One line of the buff, e.g. `+1.5% Mining yield`. `key` is an effect key from the chart report. */
export function effectText(key: string, v: number): string {
  const [kind, skill] = key.split(':');
  const n = num(v);
  if (kind === 'yield') return `+${n}% ${skillLabel(skill as never)} yield`;
  if (kind === 'speed') return `+${n}% ${skillLabel(skill as never)} speed`;
  const text: Record<string, string> = {
    life: 'maximum life', allRes: 'all resistances', wardRes: 'all resistances', damage: 'damage', attackCast: 'attack and cast speed', defences: 'armour and evasion',
    moveSpeed: 'movement speed', gold: 'gold found', rarity: 'item rarity', currency: 'currency drops', maps: 'map drops', xp: 'skill XP',
    offline: 'offline skilling speed', collectible: 'collectible chance', purity: 'Smelting purity odds', mutation: 'Foraging mutation chance',
    yieldAll: "to every gathering skill's yield", speedAll: "to every production skill's speed",
  };
  return `+${n}% ${text[key] ?? key}`;
}

/** What a star does at its current rank. */
function starEffectNow(star: StarDef, rank: number): string {
  if (star.wonder === 'binary') return `+${rank}% skill XP; fills two adjacent slots`;
  if (star.wonder) return star.desc;
  return `${star.desc.replace(/^\+[\d.]+/, `+${num(star.value * rank)}`)}`;
}

function costText(cost: Record<string, number>): string {
  return Object.entries(cost).map(([id, n]) => `${fmt(n)} ${id === STARDUST ? 'Stardust' : 'Gilded Stardust'}`).join(' + ');
}

function Wallet({ s }: { s: GameState }) {
  return (
    <div className="callout skill-note star-summary">
      <span><MatIcon id={STARDUST} size={18} /> <b className="num">{fmt(s.storage.bank[STARDUST] ?? 0)}</b> Stardust</span>
      <span><MatIcon id={GILDED_STARDUST} size={18} /> <b className="num">{fmt(s.storage.bank[GILDED_STARDUST] ?? 0)}</b> Gilded</span>
      <span className="dim">Stars unlocked <b className="num">{Object.keys(s.astrology.stars).length}/{STARS.length}</b></span>
    </div>
  );
}

// ---------- Chart ----------

type Pending = { kind: 'place'; slot: number; id: string; partner?: number; cost: number } | { kind: 'clear'; slot: number; cost: number };

function ChartTab({ s, onTab }: { s: GameState; onTab?: (next: string) => void }) {
  const slots = chartSlots(s);
  const layout = chartLayout(slots.length);
  const report = chartReport(s);
  const [picked, setPicked] = useState<string | null>(null);
  const [pairFirst, setPairFirst] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stardust = s.storage.bank[STARDUST] ?? 0;

  const nameOf = (id: string | null): string => {
    if (!id) return 'Empty';
    if (id === BINARY_PARTNER) return starDef('binary')!.name;
    const f = s.astrology.fallen.find((x) => x.uid === id);
    return f ? fallenKind(f.effect)?.name ?? 'Fallen star' : starDef(id)?.name ?? id;
  };
  const colorOf = (id: string | null): string => {
    const star = id ? starDef(id === BINARY_PARTNER ? 'binary' : id) : undefined;
    return (star && regionDef(star.region)?.color) || '#f2d27a';
  };

  const reset = () => { setPicked(null); setPairFirst(null); setPending(null); setError(null); };
  const apply = (p: Pending) => {
    const msg = game.act((st, ctx) => (p.kind === 'place' ? placeStar(st, ctx, p.slot, p.id, p.partner) : clearSlot(st, ctx, p.slot)));
    reset();
    if (msg) setError(msg);
  };
  const propose = (p: { kind: 'place'; slot: number; id: string; partner?: number } | { kind: 'clear'; slot: number }) => {
    const plan = p.kind === 'place' ? planPlace(s, p.slot, p.id, p.partner) : planClear(s, p.slot);
    if (typeof plan === 'string') { setError(plan); setPairFirst(null); return; }
    const full: Pending = { ...p, cost: plan.cost };
    if (plan.cost === 0) apply(full);
    else { setPending(full); setError(null); }
  };

  const onSlot = (i: number) => {
    setError(null);
    if (picked) {
      if (picked === 'binary') {
        if (pairFirst === null) { setPairFirst(i); return; }
        if (i === pairFirst) { setPairFirst(null); return; }
        propose({ kind: 'place', slot: pairFirst, id: 'binary', partner: i });
        return;
      }
      propose({ kind: 'place', slot: i, id: picked });
      return;
    }
    if (slots[i]) propose({ kind: 'clear', slot: i });
  };

  const tray: { id: string; name: string; sub: string; family: string; rank?: number; placed: number }[] = [
    ...STARS.filter((x) => isUnlocked(s, x.id)).map((x) => ({ id: x.id, name: x.name, sub: starEffectNow(x, starRank(s, x.id)), family: x.family ? familyLabel[x.family] : 'Wonder', rank: starRank(s, x.id), placed: slots.indexOf(x.id) })),
    ...s.astrology.fallen.map((f) => ({ id: f.uid, name: fallenKind(f.effect)?.name ?? 'Fallen star', sub: fallenKind(f.effect)?.desc(f.value) ?? '', family: 'Fallen · matches any family', placed: slots.indexOf(f.uid) })),
  ];
  const noStarsYet = tray.length === 0;
  const near = pairFirst !== null ? adjacentSlots(slots.length, pairFirst) : [];
  const totals = Object.entries(report.totals).filter(([, v]) => v > 0);

  return (
    <div className="star-chart">
      {noStarsYet && (
        <div className="card star-first-step" role="region" aria-label="First step in Astrology">
          <EmptyState
            icon={<GameIcon name="astrology" size={28} />}
            title="Start in Research to unlock your first star"
            action={onTab ? <button className="btn sm primary" onClick={() => onTab('research')}>Go to Research</button> : undefined}
          >
            You don't have any unlocked stars or fallen stars yet. Open the <b>Research</b> tab above and study a sky region (such as Dawn Verge) to gather Stardust and unlock stars to chart here.
          </EmptyState>
        </div>
      )}
      {s.astrology.chartNotice && (
        <div className="callout skill-note">
          Astrology changed: your old constellations became sky regions, and their stars were unlocked and ranked for you. Your constellation starts empty. Pick a star below, then a slot, to chart it. The first fill of each slot is free.
          {' '}<button className="btn sm ghost" onClick={() => game.act((st) => { st.astrology.chartNotice = false; })}>Got it</button>
        </div>
      )}
      <Wallet s={s} />
      <div className="card star-night">
        <div className="card-title">Your constellation <span className="grow" /><span className="card-hint">{slots.filter(Boolean).length} / {slots.length} slots filled</span></div>
        <svg className={`star-sky star-night-sky ${slots.length > 8 ? 'dense' : ''}`} viewBox={`0 -3 100 ${Math.max(...layout.points.map(([, y]) => y)) + 15}`} role="group" aria-label="Constellation chart">
          <g className="astro-chart-grid" aria-hidden="true">
            <circle cx="50" cy="19" r="10" />
            <circle cx="50" cy="19" r="20" />
            <circle cx="50" cy="19" r="31" />
            <path d="M4 19H96 M50 0V63 M12 0L88 54 M88 0L12 54" />
          </g>
          {report.lines.map(({ a, b, active, matching }) => {
            const [x1, y1] = layout.points[a];
            const [x2, y2] = layout.points[b];
            return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} className={`star-line ${active ? (matching ? 'matching' : 'active') : 'possible'}`} />;
          })}
          {layout.points.map(([x, y], i) => {
            const id = slots[i];
            const isNear = near.includes(i);
            const live = pairFirst === i;
            return (
              <g
                key={i}
                transform={`translate(${x} ${y})`}
                style={{ color: colorOf(id) }}
                className={`star-slot ${id ? 'filled' : ''} ${picked && !id ? 'open' : ''} ${isNear ? 'near' : ''} ${live ? 'live' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={id ? `Slot ${i + 1}: ${nameOf(id)}` : `Slot ${i + 1}: empty`}
                onClick={() => onSlot(i)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSlot(i); } }}
              >
                <circle r="5.5" className="star-hit" />
                <circle r="4.45" className="astro-socket" />
                {id
                  ? <StarGlyph className="astro-star" />
                  : <path className="astro-empty" d="M0 -2.8 2.8 0 0 2.8 -2.8 0Z M-1 0H1 M0 -1V1" />}
                <text y="8" className="star-label" textAnchor={x < 16 ? 'start' : x > 84 ? 'end' : 'middle'}>{id ? nameOf(id) : 'Empty slot'}</text>
              </g>
            );
          })}
        </svg>
        <p className="astro-link-note"><b>+{num(report.lineBonus * 100)}% effect per matching link.</b> Connect stars of the same family to make a gold link.</p>
        {(pairFirst !== null || pending || error) && (
          <div className="star-action">
            {pairFirst !== null && !pending && <span>Pick the slot next to it for the Binary Pair's second half.</span>}
            {pending?.kind === 'place' && <span>Chart <b>{nameOf(pending.id)}</b> in slot {pending.slot + 1}: <b className="num">{costText({ [STARDUST]: pending.cost })}</b> to recharge.</span>}
            {pending?.kind === 'clear' && <span>Clear <b>{nameOf(slots[pending.slot])}</b> from slot {pending.slot + 1}: <b className="num">{costText({ [STARDUST]: pending.cost })}</b>.</span>}
            {error && <span className="bad">{error}</span>}
            <span className="grow" />
            {pending && <button className="btn sm primary" disabled={stardust < pending.cost} title={stardust < pending.cost ? 'Not enough Stardust' : ''} onClick={() => apply(pending)}>Confirm</button>}
            <button className="btn sm ghost" onClick={reset}>Cancel</button>
          </div>
        )}
        {!picked && !pending && !error && <p className="muted star-hint">Pick an uncharted star below, then an empty slot to place it for free. Moving or removing charted stars costs Stardust.</p>}
        {picked && !pending && pairFirst === null && <p className="muted star-hint">Now pick a slot for {nameOf(picked)}.</p>}
      </div>

      <div className="card">
        <div className="card-title">Stars you can chart</div>
        {tray.length === 0 && <p className="muted">No stars yet. Head to the <b>Research</b> tab to unlock your first star.</p>}
        <div className="star-tray">
          {tray.map((t) => (
            <button
              key={t.id}
              className={`star-chip ${picked === t.id ? 'picked' : ''} ${t.placed >= 0 ? 'placed' : ''}`}
              aria-pressed={picked === t.id}
              onClick={() => { setPicked(picked === t.id ? null : t.id); setPairFirst(null); setPending(null); setError(null); }}
            >
              <svg className="star-chip-glyph" viewBox="-6 -6 12 12" style={{ color: colorOf(t.id) }} aria-hidden="true"><StarGlyph /></svg>
              <span className="star-chip-copy">
                <b>{t.name}</b>
                <span className="star-chip-tag">{t.family}{t.rank !== undefined && ` · Rank ${t.rank}`}{t.placed >= 0 && ` · Slot ${t.placed + 1}`}</span>
                <span className="star-chip-sub">{t.sub}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Your buff</div>
        {totals.length === 0 ? <p className="muted">Nothing charted yet.</p> : (
          <ul className="star-bonus">{totals.map(([k, v]) => <li key={k}>{effectText(k, v)}</li>)}</ul>
        )}
        {report.entries.some((e) => e) && (
          <ul className="star-entries">
            {report.entries.filter((e): e is ChartEntry => !!e).map((e) => (
              <li key={e.slot} className={e.working ? '' : 'idle'}>
                <b>{e.name}</b>
                {e.multiplier !== 1 && <span className="dim num"> ×{num(e.multiplier)}</span>}
                {!e.working && <span className="dim"> · idle: its condition isn't met by an active line</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------- Research ----------

function useRun(actionId: string) {
  const s = useGame();
  return s.action?.kind === 'skill' && s.action.actionId === actionId;
}

function RunButton({ actionId, label }: { actionId: string; label: string }) {
  const s = useGame();
  const running = useRun(actionId);
  const blocker = actionBlocker(s, actionDef(actionId));
  if (running) return <button className="btn sm" onClick={() => game.act((st) => stopAction(st))}>Stop</button>;
  return (
    <button className={`btn sm ${blocker ? '' : 'primary'}`} disabled={!!blocker} title={blocker ?? ''} onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, actionId))}>
      {label}
    </button>
  );
}

const regionPlots: Record<string, [number, number][]> = {
  lantern: [[24, 33], [45, 17], [64, 28], [84, 13]],
  sower: [[22, 15], [39, 31], [61, 35], [82, 23]],
  buried_king: [[19, 31], [37, 13], [57, 32], [80, 17]],
  anvil: [[23, 17], [76, 17], [61, 36], [43, 36]],
  alembic: [[28, 15], [43, 21], [58, 35], [80, 25]],
  scribe: [[18, 34], [38, 23], [61, 26], [81, 12]],
  wanderer: [[19, 26], [49, 12], [80, 23], [53, 37]],
};

function RegionPlate({ region, discovered, locked }: { region: SkyRegion; discovered: boolean[]; locked: boolean }) {
  const points = regionPlots[region.id] ?? [[50, 25]];
  return (
    <svg className={`astro-plate ${region.deep ? 'deep' : ''}`} viewBox="0 0 100 50" aria-hidden="true">
      <g className="astro-chart-grid">
        <circle cx="50" cy="25" r="21" />
        <circle cx="50" cy="25" r="16" />
        <path d="M5 25H95 M50 2V48 M15 10L85 40 M85 10L15 40" />
      </g>
      {points.slice(1).map(([x, y], i) => (
        <line key={i} x1={points[i][0]} y1={points[i][1]} x2={x} y2={y} className={`star-line ${discovered[i] && discovered[i + 1] ? 'active' : 'possible'}`} />
      ))}
      {points.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {discovered[i] ? <StarGlyph /> : <circle r={locked ? 1 : 1.55} className="astro-undiscovered" />}
        </g>
      ))}
    </svg>
  );
}

function RegionCard({ s, r }: { s: GameState; r: SkyRegion }) {
  const level = astrologyLevel(s);
  const locked = level < r.level;
  const points = researchPoints(s, r.id);
  const id = `research_${r.id}`;
  const a = actionDef(id);
  const d = deriveStats(s);
  const discovered = r.stars.map((x) => isUnlocked(s, x));
  const nextIdx = discovered.indexOf(false);
  const next = nextIdx >= 0 ? researchNeeded(r, nextIdx) : null;
  const running = s.action?.kind === 'skill' && s.action.actionId === id;
  return (
    <div className={`card star-region ${locked ? 'locked' : ''} ${running ? 'running' : ''}`} style={{ ['--cst' as string]: r.color }}>
      <div className="star-card-head">
        <b>{r.name}</b>
        {locked
          ? <LockedBadge level={r.level} reason={`Requires Astrology level ${r.level}`} />
          : <span className="dim num">{r.deep ? 'Deep sky' : `${unlockedInRegion(s, r.id)}/${r.stars.length} stars`}</span>}
      </div>
      <RegionPlate region={r} discovered={discovered} locked={locked} />
      <p className="muted star-lore">{r.lore}</p>
      {!locked && (
        <>
          <div className="astro-research-progress">
            <span>{next ? `Next discovery: ${starDef(r.stars[nextIdx])!.name}` : 'All stars discovered'}</span>
            <ProgressBar value={next ? Math.min(1, points / next) : 1} color={r.color} label={next ? `${fmt(points)} / ${fmt(next)} research` : `${fmt(points)} research`} />
          </div>
          <ul className="astro-discoveries" aria-label="Stars in this region">
            {r.stars.map((x, i) => (
              <li key={x}>
                <span className={discovered[i] ? 'astro-found' : 'dim'}><span aria-hidden="true">{discovered[i] ? '✦' : '◇'}</span> {starDef(x)!.name}</span>
                <span className="dim">{discovered[i] ? 'Found' : `${fmt(researchNeeded(r, i))} research`}</span>
              </li>
            ))}
          </ul>
          <div className="astro-region-footer">
            <span className="dim num small">{(actionIntervalMs(s, a, d) / 1000).toFixed(1)}s · {r.dust} Stardust · {a.xp} XP</span>
            <RunButton actionId={id} label="Research" />
          </div>
        </>
      )}
    </div>
  );
}

function ResearchTab({ s }: { s: GameState }) {
  const seen = REGIONS.filter((r) => !r.deep);
  const deep = REGIONS.filter((r) => r.deep);
  return (
    <div className="star-chart">
      <SkillIntro step="Research">
        Study a sky region to earn research and Stardust. Each discovery adds a star to your charting collection.
      </SkillIntro>
      <Wallet s={s} />
      <div className="star-grid">{seen.map((r) => <RegionCard key={r.id} s={s} r={r} />)}</div>
      <div className="card-title" style={{ marginTop: 14 }}>Deep sky</div>
      <div className="star-grid">{deep.map((r) => <RegionCard key={r.id} s={s} r={r} />)}</div>
    </div>
  );
}

// ---------- Watch ----------

function WatchRow({ s, star }: { s: GameState; star: StarDef }) {
  const region = regionDef(star.region)!;
  const unlocked = isUnlocked(s, star.id);
  const rank = starRank(s, star.id);
  const xp = starXp(s, star.id);
  const top = rank >= MAX_GILDED_RANK;
  const need = top ? 0 : rankXp(rank + 1);
  const a = actionDef(`watch_${star.id}`);
  const wait = unlocked ? astrologyBlocker(s, a) : null;
  return (
    <div className={`star-watch ${unlocked ? '' : 'locked'}`} style={{ ['--cst' as string]: region.color }}>
      <div className="star-watch-main">
        <b>{star.name}</b>
        <span className="dim small">{unlocked ? starEffectNow(star, rank) : `Unlocks in ${region.name}`}</span>
      </div>
      {unlocked && (
        <>
          <div className="star-watch-bar">
            <span className="dim num small">Rank {rank}{rank > MAX_RANK ? ' · gilded' : ''}</span>
            <ProgressBar value={top ? 1 : xp / need} color={region.color} label={top ? 'Top rank' : `${fmt(xp)} / ${fmt(need)} XP`} />
            {!top && xp >= need && <span className="dim small">Ready to rank up: costs {costText(rankUpCost(rank))}</span>}
          </div>
          {wait && <span className="dim small star-wait">{wait}</span>}
          <RunButton actionId={a.id} label="Watch" />
        </>
      )}
    </div>
  );
}

function WatchTab({ s }: { s: GameState }) {
  return (
    <div className="star-chart">
      <SkillIntro step="Watch">
        Watch unlocked stars to gain Star XP, raise their rank, and earn Gilded Stardust.
      </SkillIntro>
      <Wallet s={s} />
      <div className="callout skill-note">
        Watch one star at a time. Each look gives it 1 star XP. Ranks 2 to 10 cost {costText(rankUpCost(1))} to start, and ranks 11 to 15 also need 1 Gilded Stardust. Now and then, a watched sky drops a fallen star.
      </div>
      {REGIONS.map((r) => (
        <div key={r.id} className="star-watch-group">
          <div className="card-title" style={{ color: r.color }}>{r.name}</div>
          {r.stars.map((x) => <WatchRow key={x} s={s} star={starDef(x)!} />)}
        </div>
      ))}
    </div>
  );
}

// ---------- Fallen ----------

function FallenTab({ s }: { s: GameState }) {
  const slots = chartSlots(s);
  return (
    <div className="star-chart">
      <SkillIntro step="Fallen Stars">
        Rare Fallen Stars found while watching can fill any node on your Constellation.
      </SkillIntro>
      <Wallet s={s} />
      <div className="card">
        <div className="card-title">Fallen stars</div>
        {s.astrology.fallen.length === 0 ? (
          <EmptyState small icon={<GameIcon name="astrology" size={24} />} title="No Fallen Stars yet">
            A very rare meteorite can fall while you watch a star. It becomes a one-of-a-kind star with an effect research can't give.
          </EmptyState>
        ) : (
          <ul className="star-entries">
            {s.astrology.fallen.map((f) => (
              <li key={f.uid}>
                <b>{fallenKind(f.effect)?.name ?? 'Fallen star'}</b> <span className="dim">{fallenKind(f.effect)?.desc(f.value)}</span>
                {slots.includes(f.uid) && <span className="dim"> · in slot {slots.indexOf(f.uid) + 1}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="muted star-hint">A fallen star has no family: it matches any star it is linked to. It doesn't rank up.</p>
      </div>
      {s.astrology.log.length > 0 && (
        <div className="card">
          <div className="card-title">Observation log</div>
          <ul className="star-entries">{[...s.astrology.log].reverse().slice(0, 30).map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

/** Astrology's screen below the skill header: the night-sky Chart, then Research, Watch and Fallen. */
export function Observatory({ tab, onTab }: { tab: string; onTab?: (next: string) => void }) {
  const s = useGame();
  if (tab === 'research') return <ResearchTab s={s} />;
  if (tab === 'watch') return <WatchTab s={s} />;
  if (tab === 'fallen') return <FallenTab s={s} />;
  return <ChartTab s={s} onTab={onTab} />;
}

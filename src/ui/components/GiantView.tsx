import type { KeyboardEvent, ReactNode } from 'react';
import { collectibleFor } from '../../data/collectibles';
import { materialDef } from '../../data/materials';
import {
  GIANT_PARTS, LEGENDS, LODGE, PART_HINT, PART_NAMES, quirkDef, SIZE_NAMES, WOODS, WORLD_TREE_GROWTH_MS, woodDef, type LodgeDef,
} from '../../data/woodcutting';
import { startSkillAction, stopAction } from '../../engine/skills';
import {
  autoPick, buildLodge, chooseByOrder, fellingTime, giantName, isGiantActionId, isLegend, lodgeBlocker, lodgeTierOf, moveOn, nextLodgeTier,
  nextPart, offerWorldTree, partWorkable, pickGiant, plantBlocker, plantWorldTree, scoutCount, scoutRegion, setGiantOrder, setGiantPart,
  totalHp, totalMaxHp, unlockedRegions, woodcuttingLevel, worldTreeGrowth, worldTreeReady,
} from '../../engine/woodcutting';
import type { Giant, GiantPart, GiantPref, GameState, LodgeId } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, fmt, MatIcon, ProgressBar } from './common';
import { SkillMinigame } from './SkillMinigame';
import './giants.css';

export type GiantTab = 'giant' | 'scouting' | 'lodge' | 'regions' | 'trophies';

export const GIANT_TABS: { id: GiantTab; label: string }[] = [
  { id: 'giant', label: 'Giant' },
  { id: 'scouting', label: 'Scouting' },
  { id: 'lodge', label: 'Lodge' },
  { id: 'regions', label: 'Regions' },
  { id: 'trophies', label: 'Trophies' },
];

export function isGiantTab(tab: string): tab is GiantTab {
  return GIANT_TABS.some((t) => t.id === tab);
}

function duration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${Math.max(1, min)} min`;
  const h = min / 60;
  return h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days`;
}

const PREF_LABEL: Record<GiantPref, string> = {
  resin: 'Most resin (Resin-weeping, then Large)',
  heart: 'Biggest heart (Burled, then Large)',
  fast: 'Fastest (Small, Hollow heart)',
  region: 'Largest from the chosen region',
};

/** Short names for what a part gave: "52 resin", "140 logs", "3 heartwood". */
export function yieldWords(yields: Record<string, number>): string {
  return Object.entries(yields)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => {
      const name = id.endsWith('_resin') ? 'resin' : id.endsWith('_log') ? 'logs' : id === 'heartwood_fragment' ? 'heartwood' : materialDef(id).name.toLowerCase();
      return `${fmt(n)} ${name}`;
    })
    .join(', ');
}

export function QuirkChips({ g }: { g: Pick<Giant, 'quirks'> }) {
  return (
    <>
      {g.quirks.map((q) => <Badge key={q} tone="gold" title={quirkDef(q).desc}>{quirkDef(q).name}</Badge>)}
    </>
  );
}

function GiantChips({ g }: { g: Giant }) {
  return (
    <div className="giant-chips">
      <Badge>{SIZE_NAMES[g.size]}</Badge>
      <Badge tone="neutral">{woodDef(g.region).region}</Badge>
      {isLegend(g) && <Badge tone="gold">Legend</Badge>}
      <QuirkChips g={g} />
    </div>
  );
}

/** The running giant action, if one is going. */
function runningPart(s: GameState): GiantPart | null | undefined {
  const a = s.action;
  return a?.kind === 'skill' && isGiantActionId(a.actionId) ? a.part ?? null : undefined;
}

/** Fell the current giant, working a part (or the next one in the order). */
function fell(part?: GiantPart) {
  game.act((st, ctx) => {
    const g = st.giant.current;
    if (!g) return 'No giant to fell';
    const running = runningPart(st) !== undefined;
    if (!running) {
      const err = startSkillAction(st, ctx, `giant_${g.region}`);
      if (err) return err;
    }
    const target = part ?? nextPart(st, g);
    return target ? setGiantPart(st, target) : null;
  });
}

/** The giant drawn from the side: crown, limbs, trunk and heart, each tappable. After the fall it lies down. */
function GiantScene({ g, active }: { g: Giant; active: GiantPart | null | undefined }) {
  const frac = (p: GiantPart) => (g.parts[p].max > 0 ? g.parts[p].hp / g.parts[p].max : 0);
  const cls = (p: GiantPart) => `giant-part ${p} ${active === p ? 'active' : ''} ${g.parts[p].hp <= 0 ? 'done' : ''} ${p === 'heart' && !g.fallen ? 'locked' : ''}`;
  const opacity = (p: GiantPart) => (g.parts[p].hp <= 0 ? 0.12 : 0.3 + 0.7 * frac(p));
  const onKey = (p: GiantPart) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fell(p);
    }
  };
  const part = (p: GiantPart, label: string, children: ReactNode) => (
    <g className={cls(p)} role="button" tabIndex={0} aria-label={`${label}: ${g.parts[p].hp} of ${g.parts[p].max}`} onClick={() => fell(p)} onKeyDown={onKey(p)}>
      <title>{`${PART_NAMES[p]}: ${g.parts[p].hp}/${g.parts[p].max}`}</title>
      <g fillOpacity={opacity(p)}>{children}</g>
    </g>
  );
  const body = (
    <>
      {part('trunk', 'Trunk', <polygon className="shape" points="164,200 196,200 190,90 170,90" />)}
      {part('limbs', 'Limbs', (
        <>
          <polygon className="shape" points="172,135 120,108 116,118 172,150" />
          <polygon className="shape" points="188,125 244,98 248,108 188,142" />
          <polygon className="shape" points="176,170 138,160 136,168 176,182" />
        </>
      ))}
      {g.parts.crown.max > 0 && part('crown', 'Crown', (
        <>
          <ellipse className="shape" cx="180" cy="62" rx="46" ry="34" />
          <ellipse className="shape" cx="140" cy="84" rx="26" ry="20" />
          <ellipse className="shape" cx="222" cy="80" rx="26" ry="20" />
        </>
      ))}
      {part('heart', 'Heart', (
        <>
          <circle className="shape" cx="180" cy="150" r={g.fallen ? 14 : 11} />
          {g.fallen && <circle className="giant-ring" cx="180" cy="150" r="7" />}
        </>
      ))}
    </>
  );
  return (
    <svg className="giant-scene" viewBox="0 0 360 220" role="group" aria-label={`${giantName(g)}, ${g.fallen ? 'fallen' : 'standing'}`} style={{ ['--giant' as string]: woodDef(g.region).color }}>
      <line className="giant-ground" x1="10" x2="350" y1="200" y2="200" />
      {g.fallen ? <g transform="translate(-100 0) rotate(90 180 200)">{body}</g> : body}
      {g.parts.crown.max === 0 && <text x="180" y="40" textAnchor="middle" fill="var(--muted)" fontSize="12">No crown: lightning took it</text>}
    </svg>
  );
}

function GiantTab({ s, go }: { s: GameState; go: (tab: GiantTab) => void }) {
  const g = s.giant.current;
  const running = runningPart(s);
  if (!g) {
    return (
      <div className="card">
        <div className="card-title">No giant standing</div>
        <p className="muted">
          {s.giant.options.length ? 'The scouts found some giants. Pick one to fell.' : 'The scouts are out. A giant will be offered in a moment.'}
        </p>
        <div className="giant-actions">
          <button className="btn primary" onClick={() => go('scouting')}>Open Scouting</button>
          {s.giant.options.length > 0 && <button className="btn" onClick={() => game.act((st) => autoPick(st))}>Auto-pick</button>}
        </div>
      </div>
    );
  }
  const left = totalHp(g);
  const max = totalMaxHp(g);
  const w = woodDef(g.region);
  const locked = woodcuttingLevel(s) < w.level;
  return (
    <div className="giant-layout">
      <div className="card">
        <div className="giant-head">
          <h2>{giantName(g)}</h2>
          <GiantChips g={g} />
          <span className="grow" />
          <span className="dim small num">{duration(fellingTime(g))} left</span>
        </div>
        <GiantScene g={g} active={running ?? undefined} />
        <ProgressBar value={max > 0 ? 1 - left / max : 1} color={w.color} label={`${fmt(max - left)} / ${fmt(max)} cuts`} />
        <div className="giant-tiles">
          {GIANT_PARTS.map((p) => {
            const part = g.parts[p];
            if (part.max === 0) return null;
            const blocked = p === 'heart' && !g.fallen;
            const gave = yieldWords(g.yields[p]);
            return (
              <button key={p} className={`giant-tile ${running === p ? 'active' : ''}`} disabled={!partWorkable(g, p) || locked} onClick={() => fell(p)} title={PART_HINT[p]}>
                <b>{PART_NAMES[p]}</b>
                <span className="num small">{blocked ? 'Locked until the fall' : `${fmt(part.hp)} / ${fmt(part.max)}`}</span>
                <ProgressBar value={part.max > 0 ? part.hp / part.max : 0} color={w.color} />
                <span className="yield">{gave || PART_HINT[p]}</span>
              </button>
            );
          })}
        </div>
        <div className="giant-actions">
          {running === undefined ? (
            <button className="btn primary" disabled={locked} onClick={() => fell()}>Start felling</button>
          ) : (
            <button className="btn" onClick={() => game.act((st) => stopAction(st))}>Stop</button>
          )}
          <div className="giant-seg" role="group" aria-label="Part order">
            <button className={`gem-chip ${s.giant.order.partOrder === 'full' ? 'active' : ''}`} onClick={() => game.act((st) => setGiantOrder(st, { partOrder: 'full' }))} title="Crown, then limbs, then trunk, then heart">Crown to heart</button>
            <button className={`gem-chip ${s.giant.order.partOrder === 'rush' ? 'active' : ''}`} onClick={() => game.act((st) => setGiantOrder(st, { partOrder: 'rush' }))} title="Skip the crown and limbs: trunk, then heart">Rush the heart</button>
          </div>
          {g.fallen && <button className="btn" onClick={() => game.act((st, ctx) => moveOn(st, ctx))} title="Leave the rest of the heart and take the next giant">Move on</button>}
        </div>
        <p className="muted giant-note small">
          {g.fallen
            ? `The giant is down${g.splinters ? `: ${fmt(g.splinters)} splinters from what was left on it` : ''}. Work the heart, or move on.`
            : 'Crown and limbs can be worked any time. When the trunk goes the giant falls, anything left on the crown and limbs shatters into splinters, and the heart opens up.'}
        </p>
        {locked && <p className="bad small">Requires Woodcutting level {w.level}.</p>}
      </div>
      <div>
        {running !== undefined ? (
          <SkillMinigame skill="woodcutting" />
        ) : (
          <div className="card">
            <div className="card-title">The splitting block</div>
            <p className="muted small">Start felling to open the block. Splitting logs evenly builds Focus, which speeds the felling up. Nothing here has a timer.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OptionCard({ s, g, index }: { s: GameState; g: Giant; index: number }) {
  const blocker = s.giant.current ? 'Finish the current giant first' : woodcuttingLevel(s) < woodDef(g.region).level ? `Requires level ${woodDef(g.region).level}` : null;
  return (
    <div className={`giant-card ${isLegend(g) ? 'legend' : ''}`}>
      <h3>{giantName(g)}</h3>
      <GiantChips g={g} />
      <span className="dim small">{fmt(totalMaxHp(g))} cuts, about {duration(fellingTime(g))}</span>
      <button className="btn sm primary" disabled={!!blocker} title={blocker ?? undefined} onClick={() => game.act((st) => {
        const err = pickGiant(st, index);
        if (!err && st.action === null) fell();
        return err;
      })}>Fell this one</button>
    </div>
  );
}

function ScoutingTab({ s }: { s: GameState }) {
  const o = s.giant.order;
  const level = woodcuttingLevel(s);
  const region = scoutRegion(s);
  const pick = chooseByOrder(s.giant.options, o);
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="card">
        <div className="card-title">Scouted giants</div>
        {s.giant.options.length === 0 ? (
          <p className="muted">
            {s.giant.current
              ? `The scouts are out in the ${woodDef(region).region}. When ${giantName(s.giant.current)} is down, ${scoutCount(s)} giants are offered here.`
              : 'The scouts are out. Giants are offered here when one is ready.'}
          </p>
        ) : (
          <div className="giant-grid">
            {s.giant.options.map((g, i) => <OptionCard key={g.id} s={s} g={g} index={i} />)}
          </div>
        )}
        {s.giant.options.length > 0 && (
          <div className="giant-actions">
            <button className="btn" disabled={!!s.giant.current} onClick={() => game.act((st) => {
              const err = autoPick(st);
              if (!err && st.action === null) fell();
              return err;
            })}>Auto-pick{pick >= 0 ? `: ${giantName(s.giant.options[pick])}` : ''}</button>
          </div>
        )}
      </div>
      <div className="card">
        <div className="card-title">Scouting target and standing order</div>
        <div className="giant-form">
          <label>Send scouts to
            <select className="input" value={o.region} onChange={(e) => game.act((st) => setGiantOrder(st, { region: e.target.value }))}>
              <option value="auto">Highest unlocked ({woodDef(region).region})</option>
              {unlockedRegions(level).map((w) => <option key={w.id} value={w.id}>{w.region}</option>)}
            </select>
          </label>
          <label>When a giant falls, take
            <select className="input" value={o.pref} onChange={(e) => game.act((st) => setGiantOrder(st, { pref: e.target.value as GiantPref }))}>
              {(Object.keys(PREF_LABEL) as GiantPref[]).map((p) => <option key={p} value={p}>{PREF_LABEL[p]}</option>)}
            </select>
          </label>
          <label><input type="checkbox" checked={o.alwaysLegend} onChange={(e) => game.act((st) => setGiantOrder(st, { alwaysLegend: e.target.checked }))} /> Always take a legend</label>
          <label><input type="checkbox" checked={o.auto} onChange={(e) => game.act((st) => setGiantOrder(st, { auto: e.target.checked }))} /> Pick for me when a giant falls</label>
        </div>
        <p className="muted small giant-note">
          The standing order is used whenever a giant comes down while you are away, and whenever it comes down while you are here if the last box is ticked. The return screen lists which giants were picked.
          {level >= 80 ? ' Legendary giants can turn up in the Ancient, Spirit and Worldwood regions.' : ' From Woodcutting level 80, legendary giants can turn up deep in the forest.'}
        </p>
      </div>
    </div>
  );
}

function CostRow({ s, cost }: { s: GameState; cost: Record<string, number> }) {
  const entries = Object.entries(cost);
  if (!entries.length) return <span className="dim small">No cost</span>;
  return (
    <div className="giant-cost">
      {entries.map(([id, n]) => {
        const have = s.storage.bank[id] ?? 0;
        return (
          <span key={id} className={have < n ? 'short' : ''}>
            <MatIcon id={id} size={12} /> {materialDef(id).name} {fmt(Math.min(have, n))}/{fmt(n)}
          </span>
        );
      })}
    </div>
  );
}

function LodgeCard({ s, def }: { s: GameState; def: LodgeDef }) {
  const tier = lodgeTierOf(s, def.id);
  const next = nextLodgeTier(s, def.id);
  const blocker = lodgeBlocker(s, def.id as LodgeId);
  return (
    <div className="giant-card">
      <h3>{def.name} <span className="dim small num">{tier}/{def.tiers.length}</span></h3>
      <span className="muted small">{def.desc}</span>
      {def.tiers.slice(0, tier).map((t, i) => <span key={i} className="small good">Built: {t.effect}</span>)}
      {next ? (
        <>
          <span className="small">Next: {next.effect}</span>
          <span className="dim small">Needs Woodcutting level {next.level}</span>
          <CostRow s={s} cost={next.cost} />
          <button className="btn sm primary" disabled={!!blocker} title={blocker ?? undefined} onClick={() => game.act((st, ctx) => buildLodge(st, ctx, def.id))}>
            {blocker && blocker !== 'Missing materials' ? blocker : `Build${def.tiers.length > 1 ? ` tier ${next.tier}` : ''}`}
          </button>
        </>
      ) : <Badge tone="success">Fully built</Badge>}
    </div>
  );
}

function WorldTreeCard({ s }: { s: GameState }) {
  const wt = s.giant.worldTree;
  const now = Date.now();
  const growth = worldTreeGrowth(s, now);
  const ready = worldTreeReady(s, now);
  const blocker = plantBlocker(s);
  const daysLeft = wt ? Math.max(0, Math.ceil(((1 - growth) * WORLD_TREE_GROWTH_MS) / 86400000)) : 0;
  return (
    <div className="card">
      <div className="card-title">World Tree <span className="grow" /><span className="card-hint">{s.storage.bank.world_tree_seed ?? 0} seeds</span></div>
      {wt ? (
        <>
          <ProgressBar value={growth} color="var(--success)" label={ready ? 'Fully grown' : `${Math.floor(growth * 100)}%, about ${daysLeft} days to go`} />
          {ready && (
            <div className="giant-actions">
              <button className="btn primary" onClick={() => game.act((st, ctx) => offerWorldTree(st, ctx))}>Offer it to the scouts</button>
            </div>
          )}
          <p className="muted small giant-note">It grows for 120 real days, offline included. Grown, it is a personal legend with the best parts in the game.</p>
        </>
      ) : (
        <>
          <p className="muted small">A very rare seed drops from legendary giants. Plant it here (needs the Trophy Wall) and it grows over 120 days into your own giant.</p>
          <button className="btn sm primary" disabled={!!blocker} title={blocker ?? undefined} onClick={() => game.act((st, ctx) => plantWorldTree(st, ctx))}>{blocker ?? 'Plant the seed'}</button>
        </>
      )}
    </div>
  );
}

function LodgeTab({ s }: { s: GameState }) {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="card">
        <div className="card-title">The woodcutter&apos;s lodge</div>
        <p className="muted small">A camp at the forest&apos;s edge, built from your own timber. Bigger buildings need wood from deeper regions.</p>
        <div className="giant-grid">
          {LODGE.map((def) => <LodgeCard key={def.id} s={s} def={def} />)}
        </div>
      </div>
      <WorldTreeCard s={s} />
    </div>
  );
}

function RegionsTab({ s }: { s: GameState }) {
  const level = woodcuttingLevel(s);
  const target = scoutRegion(s);
  return (
    <div className="card">
      <div className="card-title">Forest regions</div>
      <div className="giant-grid">
        {WOODS.map((w) => {
          const open = level >= w.level;
          const find = collectibleFor('woodcutting', w.id);
          const found = !!find && s.collectibles.includes(find.id);
          return (
            <div key={w.id} className="giant-card">
              <h3 style={{ color: open ? w.color : undefined }}>{w.region}</h3>
              <span className="small">{w.name} logs and resin. Level {w.level}.</span>
              <span className="dim small num">{(w.ms / 1000).toFixed(1)} s per cut, {w.xp} xp (raw)</span>
              <span className="dim small">Hidden find: {found ? find!.name : '???'}</span>
              {open ? (
                target === w.id
                  ? <Badge tone="success">Scouts sent here</Badge>
                  : <button className="btn sm" onClick={() => game.act((st) => setGiantOrder(st, { region: w.id }))}>Send scouts here</button>
              ) : <Badge tone="locked">Level {w.level}</Badge>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrophiesTab({ s }: { s: GameState }) {
  const wall = s.giant.lodge.trophyWall >= 1;
  return (
    <div className="card">
      <div className="card-title">Trophy Wall</div>
      {!wall && <p className="muted">{s.giant.legends.length ? 'Build the Trophy Wall in the Lodge to display your legends.' : 'Fell a legendary giant to build a Trophy Wall.'}</p>}
      <div className="giant-grid">
        {LEGENDS.map((l) => {
          const log = s.giant.legendLog[l.id];
          const felled = s.giant.legends.includes(l.id);
          return (
            <div key={l.id} className={`giant-card ${felled ? 'legend' : ''}`}>
              <h3>{felled ? l.name : '???'}</h3>
              <span className="dim small">{woodDef(l.region).region}</span>
              {felled && wall ? (
                <>
                  <span className="muted small">{l.desc}</span>
                  {log && <span className="small">Felled {new Date(log.at).toLocaleDateString()}: {yieldWords(log.yields)}</span>}
                </>
              ) : <span className="muted small">{felled ? 'Hidden until the wall is built.' : 'Not felled yet.'}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The Woodcutting screen's content for one of its tabs. */
export function GiantView({ tab, go }: { tab: GiantTab; go: (tab: GiantTab) => void }) {
  const s = useGame();
  switch (tab) {
    case 'scouting': return <ScoutingTab s={s} />;
    case 'lodge': return <LodgeTab s={s} />;
    case 'regions': return <RegionsTab s={s} />;
    case 'trophies': return <TrophiesTab s={s} />;
    default: return <GiantTab s={s} go={go} />;
  }
}

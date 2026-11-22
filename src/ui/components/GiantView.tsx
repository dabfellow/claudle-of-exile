import { collectibleFor } from '../../data/collectibles';
import { materialDef } from '../../data/materials';
import {
  GIANT_PARTS, LEGENDS, LODGE, PART_NAMES, quirkDef, SIZE_NAMES, WOODS, WORLD_TREE_GROWTH_MS, woodDef, type LodgeDef,
} from '../../data/woodcutting';
import { startSkillAction, stopAction } from '../../engine/skills';
import {
  buildLodge, chooseRegion, familiarityMult, felledIn, fellingTime, fellWorldTree, giantName, isGiantActionId, isLegend,
  lodgeBlocker, lodgeTierOf, moveOn, nextLodgeTier, nextPart, partWorkable, plantBlocker, plantWorldTree, quirkChanceMult,
  setGiantPart, targetRegion, totalHp, totalMaxHp, woodcuttingLevel, worldTreeGrowth, worldTreeReady,
} from '../../engine/woodcutting';
import type { Giant, GiantPart, GameState, LodgeId } from '../../engine/types';
import { game, useGame } from '../../game';
import { TREE_ART } from '../assets';
import { Badge, fmt, MatIcon, ProgressBar } from './common';
import { LockedBadge, SkillIntro } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import { SplitIdle } from './minigames';
import './giants.css';

export type GiantTab = 'giant' | 'lodge' | 'trophies';

export const GIANT_TABS: { id: GiantTab; label: string }[] = [
  { id: 'giant', label: 'Forest' },
  { id: 'lodge', label: 'Lodge' },
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

/** What each part gives, as the material it drops and what that is for. */
const PART_INFO: Record<GiantPart, { mat: (wood: string) => string; drops: string; use: string }> = {
  crown: { mat: (w) => `${w}_resin`, drops: 'Resin, some logs', use: 'Resin raises item level at the forge and bench' },
  limbs: { mat: (w) => `${w}_log`, drops: 'Logs', use: 'Logs become planks at Woodcrafting' },
  trunk: { mat: (w) => `${w}_log`, drops: 'Lots of logs', use: 'Cut through it and the giant falls' },
  heart: { mat: () => 'heartwood_fragment', drops: 'Heartwood', use: 'Opens once the giant is down' },
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

/** The running giant action, if one is going. */
function runningPart(s: GameState): GiantPart | null | undefined {
  const a = s.action;
  return a?.kind === 'skill' && isGiantActionId(a.actionId) ? a.part ?? null : undefined;
}

/** Fell the current giant, working a part (or the next one in the order). */
function fell(part?: GiantPart) {
  game.act((st, ctx) => {
    const g = st.giant.current;
    if (!g) return 'No giant standing';
    if (runningPart(st) === undefined) {
      const err = startSkillAction(st, ctx, `giant_${g.region}`);
      if (err) return err;
    }
    const target = part ?? nextPart(st, g);
    return target ? setGiantPart(st, target) : null;
  });
}

/** Every woods, with the one you are cutting in lit. Tap another to go cut there. */
function RegionStrip({ s }: { s: GameState }) {
  const level = woodcuttingLevel(s);
  const here = s.giant.current?.worldTree ? null : targetRegion(s);
  return (
    <nav className="forest-regions" aria-label="Choose which woods to cut in">
      {WOODS.map((w) => {
        const open = level >= w.level;
        const active = here === w.id;
        const felled = felledIn(s, w.id);
        const bonus = Math.round((familiarityMult(s, w.id) - 1) * 100);
        const waiting = s.giant.waiting?.[w.id];
        const find = collectibleFor('woodcutting', w.id);
        const found = !!find && s.collectibles.includes(find.id);
        return (
          <button
            key={w.id}
            type="button"
            className={`forest-region ${active ? 'active' : ''} ${open ? '' : 'locked'}`}
            style={{ ['--wood-c' as string]: w.color }}
            disabled={!open || active}
            aria-pressed={active}
            title={open
              ? `${w.region}: ${w.name} logs and resin. ${felled} giants felled here, so special giants are ${bonus}% more common.${found ? ` Found here: ${find!.name}.` : ''}`
              : `Unlocks at Woodcutting level ${w.level}`}
            onClick={() => game.act((st, ctx) => chooseRegion(st, ctx, w.id))}
          >
            <img src={TREE_ART[w.id] ?? TREE_ART.ash} alt="" className="forest-region-art" draggable={false} />
            <span className="forest-region-text">
              <b>{w.region}</b>
              {!open ? (
                <span className="dim small">Level {w.level}</span>
              ) : active ? (
                <span className="small forest-region-here">Cutting here</span>
              ) : waiting ? (
                <span className="small">{giantName(waiting)} waiting</span>
              ) : (
                <span className="dim small">{felled ? `${fmt(felled)} felled` : 'Not cut yet'}</span>
              )}
              {open && bonus > 0 && <span className="small forest-region-bonus">Special +{bonus}%</span>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/** A part of the giant, pinned on the tree where it is: tap to chop it. */
function PartPin({ g, p, active, locked }: { g: Giant; p: GiantPart; active: boolean; locked: boolean }) {
  const part = g.parts[p];
  const info = PART_INFO[p];
  if (part.max === 0) {
    return (
      <div className={`giant-pin ${p} gone`}>
        <div className="giant-pin-head"><b>{PART_NAMES[p]}</b><span className="dim small">Struck off</span></div>
        <span className="dim small">Lightning took this tree&apos;s crown.</span>
      </div>
    );
  }
  const shut = p === 'heart' && !g.fallen;
  const done = part.hp <= 0;
  const gave = yieldWords(g.yields[p]);
  const cls = ['giant-pin', p, active ? 'active' : '', done ? 'done' : '', shut ? 'shut' : ''].filter(Boolean).join(' ');
  return (
    <button
      type="button"
      className={cls}
      disabled={!partWorkable(g, p) || locked}
      onClick={() => fell(p)}
      aria-label={`${PART_NAMES[p]}: ${shut ? 'opens when the giant falls' : `${part.hp} of ${part.max} cuts left`}. Drops ${info.drops}.`}
    >
      <div className="giant-pin-head">
        <MatIcon id={info.mat(g.region)} size={14} />
        <b>{PART_NAMES[p]}</b>
        <span className="grow" />
        {active ? <Badge tone="gold" live>Chopping</Badge>
          : done ? <Badge tone="success">Done</Badge>
          : shut ? <span className="dim small">After the fall</span>
          : <span className="num small dim">{fmt(part.hp)} left</span>}
      </div>
      <ProgressBar value={part.max > 0 ? part.hp / part.max : 0} color={p === 'heart' ? 'var(--accent-2)' : woodDef(g.region).color} />
      <div className="giant-pin-drop">{info.drops}</div>
      <div className="giant-pin-use">{shut ? 'Opens once the giant is down' : gave ? `Got ${gave}` : info.use}</div>
    </button>
  );
}

/** The giant up close: the tree in its clearing with each part pinned where it grows. */
function GiantStage({ g, active, locked }: { g: Giant; active: GiantPart | null | undefined; locked: boolean }) {
  const w = woodDef(g.region);
  return (
    <div
      className={`giant-stage ${g.fallen ? 'fallen' : ''} ${isLegend(g) ? 'legend' : ''}`}
      style={{ ['--giant' as string]: w.color }}
      role="group"
      aria-label={`${giantName(g)}, ${g.fallen ? 'down' : 'standing'}`}
    >
      <div className="giant-stage-sky" aria-hidden="true" />
      <img src={TREE_ART[g.region] ?? TREE_ART.ash} alt="" className={`giant-stage-tree ${g.fallen ? 'fallen' : ''}`} draggable={false} />
      {GIANT_PARTS.map((p) => <span key={p} className={`giant-mark ${p} ${active === p ? 'active' : ''}`} aria-hidden="true" />)}
      <div className="giant-stage-ground" aria-hidden="true" />
      {g.fallen && <div className="giant-stage-banner">Timber! The heart is open</div>}
      <div className="giant-pins">
        {GIANT_PARTS.map((p) => <PartPin key={p} g={g} p={p} active={active === p} locked={locked} />)}
      </div>
    </div>
  );
}

/** Everything this giant has given so far. */
function Tally({ g }: { g: Giant }) {
  const total: Record<string, number> = {};
  for (const p of GIANT_PARTS) for (const [id, n] of Object.entries(g.yields[p])) total[id] = (total[id] ?? 0) + n;
  if (g.splinters) total.splinters = g.splinters;
  const rows = Object.entries(total).filter(([, n]) => n > 0);
  return (
    <div className="card forest-tally">
      <div className="card-title">From this giant</div>
      {rows.length ? (
        <ul className="forest-tally-list">
          {rows.map(([id, n]) => (
            <li key={id}><MatIcon id={id} size={16} /><span>{materialDef(id).name}</span><b className="num">{fmt(n)}</b></li>
          ))}
        </ul>
      ) : <p className="dim small">Nothing yet. Every cut drops something from the part you are chopping.</p>}
    </div>
  );
}

function ForestTab({ s }: { s: GameState }) {
  const g = s.giant.current;
  const running = runningPart(s);
  if (!g) return <RegionStrip s={s} />;
  const left = totalHp(g);
  const max = totalMaxHp(g);
  const w = woodDef(g.region);
  const locked = woodcuttingLevel(s) < w.level;
  const special = Math.round((quirkChanceMult(s, g.region) - 1) * 100);
  return (
    <div className="forest">
      <RegionStrip s={s} />
      <div className="forest-main">
        <section className="card forest-scene">
          <header className="forest-head">
            <div className="forest-title">
              <h2>{giantName(g)}</h2>
              <div className="giant-chips">
                <Badge>{SIZE_NAMES[g.size]}</Badge>
                {isLegend(g) && <Badge tone="gold">Legend</Badge>}
                <QuirkChips g={g} />
              </div>
            </div>
            <span className="grow" />
            <span className="dim small num">about {duration(fellingTime(g))} to go</span>
            {running === undefined ? (
              <button className="btn primary forest-go" disabled={locked} onClick={() => fell()}>Start felling</button>
            ) : (
              <button className="btn forest-go" onClick={() => game.act((st) => stopAction(st))}>Stop</button>
            )}
          </header>
          <GiantStage g={g} active={running ?? undefined} locked={locked} />
          <ProgressBar value={max > 0 ? 1 - left / max : 1} color={w.color} label={`${fmt(max - left)} / ${fmt(max)} cuts`} />
          <div className="forest-foot">
            <p className="muted small">
              {g.fallen
                ? `The giant is down${g.splinters ? `, and ${fmt(g.splinters)} splinters came off what was left on it` : ''}. Chop the Heart for heartwood, or move on to the next giant.`
                : 'Tap a part to chop it. Cutting through the Trunk brings the giant down: anything left on the Crown and Limbs breaks into splinters, and the Heart opens.'}
            </p>
            {g.fallen && <button className="btn" onClick={() => game.act((st, ctx) => moveOn(st, ctx))}>Next giant</button>}
          </div>
          {locked && <p className="bad small">Requires Woodcutting level {w.level}.</p>}
        </section>
        <aside className="forest-side">
          {running !== undefined ? (
            <SkillMinigame skill="woodcutting" />
          ) : (
            <div className="card forest-block-idle">
              <div className="card-title">Chopping block</div>
              <SplitIdle />
              <p className="muted small">Split logs while you fell: an even split builds Focus, which speeds the felling up and can double a cut.</p>
              <button className="btn primary" disabled={locked} onClick={() => fell()}>Start felling</button>
            </div>
          )}
          <Tally g={g} />
          <p className="dim small forest-special">
            Special giants{special > 0 ? ` are ${special}% more common here` : ' turn up now and then'}: the more you fell in one woods, the more often they appear.
          </p>
        </aside>
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
  const levelLocked = !!next && woodcuttingLevel(s) < next.level;
  const legendLocked = def.id === 'trophyWall' && !!next && !s.giant.legends.length;
  return (
    <div className={`giant-card ${levelLocked || legendLocked ? 'locked' : ''}`}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{def.name} <span className="dim small num">{tier}/{def.tiers.length}</span></h3>
        {levelLocked ? (
          <LockedBadge level={next.level} />
        ) : legendLocked ? (
          <LockedBadge reason="Fell a legend first" />
        ) : null}
      </div>
      <span className="muted small">{def.desc}</span>
      {def.tiers.slice(0, tier).map((t, i) => <span key={i} className="small good">Built: {t.effect}</span>)}
      {next ? (
        <>
          <span className="small">Next: {next.effect}</span>
          <span className="dim small">Needs Woodcutting level {next.level}</span>
          <CostRow s={s} cost={next.cost} />
          <button
            className="btn sm primary"
            disabled={!!blocker}
            title={blocker ?? undefined}
            onClick={() => game.act((st, ctx) => buildLodge(st, ctx, def.id))}
          >
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
              <button className="btn primary" disabled={!!s.giant.current?.worldTree} onClick={() => game.act((st, ctx) => fellWorldTree(st, ctx))}>Fell your World Tree</button>
            </div>
          )}
          <p className="muted small giant-note">It grows for 120 real days, offline included. Grown, it is a personal legend with the best parts in the game. The giant you were on waits for you.</p>
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
      <SkillIntro step="Woodcutter's Lodge">
        Build lasting Woodcutting upgrades from your own timber: a <b>Lookout Tower</b> for more special giants, a <b>Drying Shed</b> for bonus logs, and the <b>Trophy Wall</b> for your legends.
      </SkillIntro>
      <div className="card">
        <div className="card-title">The woodcutter&apos;s lodge</div>
        <p className="muted small">A camp at the forest&apos;s edge, built from your own timber. Bigger buildings need wood from deeper woods.</p>
        <div className="giant-grid">
          {LODGE.map((def) => <LodgeCard key={def.id} s={s} def={def} />)}
        </div>
      </div>
      <WorldTreeCard s={s} />
    </div>
  );
}

function TrophiesTab({ s }: { s: GameState }) {
  const wall = s.giant.lodge.trophyWall >= 1;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <SkillIntro step="Legendary Trophies">
        Named legendary giants stand in the deepest woods from Woodcutting level 80. Fell one and it goes up on your Trophy Wall.
      </SkillIntro>
      <div className="card">
        <div className="card-title">
          Trophy Wall
          <span className="grow" />
          {wall ? <Badge tone="success">Wall built</Badge> : <LockedBadge reason="Build Trophy Wall in Lodge" />}
        </div>
        {!wall && (
          <p className="muted small">
            {s.giant.legends.length ? 'Build the Trophy Wall in the Lodge to display your felled legends.' : 'Fell a legendary giant (level 80+, in the deep woods) to unlock the Trophy Wall in the Lodge.'}
          </p>
        )}
        <div className="giant-grid">
          {LEGENDS.map((l) => {
            const log = s.giant.legendLog[l.id];
            const felled = s.giant.legends.includes(l.id);
            return (
              <div key={l.id} className={`giant-card ${felled ? 'legend' : 'locked'}`}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>{felled ? l.name : '???'}</h3>
                  {!felled && <LockedBadge reason="Not felled yet" />}
                </div>
                <span className="dim small">{woodDef(l.region).region} · Lv 80+</span>
                {felled && wall ? (
                  <>
                    <span className="muted small">{l.desc}</span>
                    {log && <span className="small">Felled {new Date(log.at).toLocaleDateString()}: {yieldWords(log.yields)}</span>}
                  </>
                ) : (
                  <span className="muted small">{felled ? 'Hidden until the Trophy Wall is built in the Lodge.' : `Cut in the ${woodDef(l.region).region} and this legend may turn up.`}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The Woodcutting screen's content for one of its tabs. */
export function GiantView({ tab }: { tab: GiantTab; go?: (tab: GiantTab) => void }) {
  const s = useGame();
  switch (tab) {
    case 'lodge': return <LodgeTab s={s} />;
    case 'trophies': return <TrophiesTab s={s} />;
    default: return <ForestTab s={s} />;
  }
}

import { useEffect, useRef, useState } from 'react';
import { collectibleFor } from '../../data/collectibles';
import { materialDef } from '../../data/materials';
import {
  GIANT_PARTS, LEGENDS, LODGE, PART_NAMES, quirkDef, SIZE_NAMES, TROPHY_WALL, WOODS, WORLD_TREE_GROWTH_MS, woodDef, type LodgeDef,
} from '../../data/woodcutting';
import { actionDef } from '../../data/skills';
import { masteryLevel } from '../../engine/skillingMastery';
import { actionIntervalMs, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import { MasteryProgress } from './MasteryProgress';
import {
  buildLodge, chooseRegion, familiarityMult, felledIn, fellingTime, fellWorldTree, giantName, isGiantActionId, isLegend,
  lodgeBlocker, lodgeTierOf, moveOn, nextLodgeTier, nextPart, partWorkable, plantBlocker, plantWorldTree, quirkChanceMult,
  setGiantPart, targetRegion, totalHp, totalMaxHp, woodcuttingLevel, worldTreeGrowth, worldTreeReady,
} from '../../engine/woodcutting';
import type { Giant, GiantPart, GameState, LodgeId } from '../../engine/types';
import { game, useGame } from '../../game';
import { TREE_ART } from '../assets';
import { Badge, fmt, MatIcon, ProgressBar } from './common';
import { SkillMinigame } from './SkillMinigame';
import { SplitIdle } from './SplitLog';
import CORE_ART from '../../assets/items/pixel/a-275.png';
import LOOKOUT_FRAME from '../../assets/woodcutting/lodge/cainos-lookout-frame.png';
import LOOKOUT_ROOF from '../../assets/woodcutting/lodge/cainos-lookout-roof.png';
import DRYING_AWNING from '../../assets/woodcutting/lodge/cainos-drying-awning.png';
import DRYING_RACK from '../../assets/woodcutting/lodge/cainos-drying-rack.png';
import GRINDSTONE_WHEEL from '../../assets/woodcutting/lodge/cainos-grindstone-wheel.png';
import SAP_BUCKET from '../../assets/woodcutting/lodge/cainos-sap-bucket.png';
import LOG_RACK from '../../assets/woodcutting/lodge/cainos-log-rack.png';
import LOG_STACK from '../../assets/woodcutting/lodge/cainos-log-stack.png';
import LOOSE_LOG from '../../assets/woodcutting/lodge/cainos-loose-log.png';
import CHISEL_BENCH from '../../assets/woodcutting/lodge/cainos-chisel-bench.png';
import CHISEL_TOOL from '../../assets/woodcutting/lodge/cainos-chisel-tool.png';
import WORLD_TREE_STUMP from '../../assets/woodcutting/lodge/cainos-world-tree-stump.png';
import WORLD_TREE from '../../assets/woodcutting/lodge/cainos-world-tree.png';
import './woodcutters-lodge.css';
import './giants.css';

export type GiantTab = 'giant' | 'lodge';

export const GIANT_TABS: { id: GiantTab; label: string }[] = [
  { id: 'giant', label: 'Forest' },
  { id: 'lodge', label: 'Lodge' },
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
              {open && <span className="dim small">Mastery {masteryLevel(s, `task.giant_${w.id}`)}</span>}
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
      {g.fallen && (
        <div
          className={`giant-core ${g.parts.heart.hp <= 0 ? 'spent' : ''}`}
          style={{ ['--core-art' as string]: `url("${CORE_ART}")` }}
          aria-hidden="true"
        >
          <span className="giant-core-glow" />
          <img src={CORE_ART} alt="" draggable={false} />
          <span className="giant-core-tint" />
          <span className="giant-core-eye" />
        </div>
      )}
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

/** The cut in progress: which part, and how far through this swing. */
function CutBar({ s }: { s: GameState }) {
  const a = s.action?.kind === 'skill' && isGiantActionId(s.action.actionId) ? s.action : null;
  if (!a) {
    return <div className="forest-cutbar idle"><span className="dim small">Not felling. Press Start felling, or tap a part of the tree.</span></div>;
  }
  const interval = actionIntervalMs(s, actionDef(a.actionId), deriveStats(s));
  const left = Math.max(0, (interval - a.progress) / 1000);
  return (
    <div className="forest-cutbar">
      <span className="small"><b>Chopping the {a.part ? PART_NAMES[a.part] : 'giant'}</b></span>
      <ProgressBar value={a.progress / interval} color="var(--success)" smooth />
      <span className="dim small num">{left.toFixed(1)}s</span>
    </div>
  );
}

/** Mastery in the woods you are cutting: its level, what it gives now, and the perks to come. */
function WoodsMastery({ s, region }: { s: GameState; region: string }) {
  const spec = actionDef(`giant_${region}`).mastery;
  if (!spec) return null;
  const level = masteryLevel(s, spec.id);
  return (
    <div className="card forest-mastery">
      <div className="card-title">{woodDef(region).region} mastery <span className="grow" /><span className="num">{level} / 100</span></div>
      <MasteryProgress s={s} mastery={spec} />
      <ul className="forest-mastery-perks">
        {spec.milestones.map((m) => (
          <li key={m.id} className={level >= m.level ? 'on' : ''}>
            <span className="num">{m.level}</span>
            <span><b>{m.name}</b> <span className="dim">{m.desc}</span></span>
          </li>
        ))}
      </ul>
      <p className="dim small">Mastery grows with time spent cutting in these woods, and each woods has its own.</p>
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
          <CutBar s={s} />
          <GiantStage g={g} active={running ?? undefined} locked={locked} />
          <ProgressBar value={max > 0 ? 1 - left / max : 1} color={w.color} label={`Whole giant: ${fmt(max - left)} / ${fmt(max)} cuts`} />
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
              <p className="muted small">Logs land here while you fell. Split them evenly to build Focus, which speeds the felling up and can double a cut.</p>
            </div>
          )}
          <Tally g={g} />
          <WoodsMastery s={s} region={g.region} />
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

const LODGE_UPGRADES = [...LODGE, TROPHY_WALL];
type LodgeStationId = LodgeId | 'worldTree';

function LodgeStationArt({ id, tier }: { id: LodgeStationId; tier: number }) {
  switch (id) {
    case 'scoutTower':
      return <><img className="lookout-frame" src={LOOKOUT_FRAME} alt="" />{tier > 0 && <img className="lookout-roof" src={LOOKOUT_ROOF} alt="" />}</>;
    case 'dryingShed':
      return <><img className="drying-rack" src={DRYING_RACK} alt="" /><img className="drying-awning" src={DRYING_AWNING} alt="" />{tier > 0 && <img className="drying-logs" src={LOG_STACK} alt="" />}</>;
    case 'whetstone':
      return <><img className="grindstone-stand" src={LOOKOUT_FRAME} alt="" /><img className="grindstone-wheel" src={GRINDSTONE_WHEEL} alt="" /></>;
    case 'sapBuckets':
      return <>{Array.from({ length: Math.min(3, tier + 1) }, (_, i) => <img className="sap-bucket" key={i} src={SAP_BUCKET} alt="" />)}</>;
    case 'logRack':
      return <><img className="log-rack" src={LOG_RACK} alt="" /><img className="rack-logs" src={tier ? LOG_STACK : LOOSE_LOG} alt="" /></>;
    case 'heartChisel':
      return <><img className="chisel-bench" src={CHISEL_BENCH} alt="" />{tier > 0 && <img className="chisel-tool" src={CHISEL_TOOL} alt="" />}</>;
    case 'worldTree':
      return <img className={tier ? 'world-tree' : 'world-tree-stump'} src={tier ? WORLD_TREE : WORLD_TREE_STUMP} alt="" />;
    default:
      return null;
  }
}

function LodgeStation({ id, name, tier, selected, available, onSelect }: {
  id: LodgeStationId;
  name: string;
  tier: number;
  selected: boolean;
  available?: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={`lodge-station station-${id}`} data-tier={tier}
      aria-expanded={selected} aria-controls="lodge-station-details" onClick={onSelect}>
      {id !== 'trophyWall' && (
        <span className="lodge-station-art" aria-hidden="true"><LodgeStationArt id={id} tier={tier} /></span>
      )}
      <span className="lodge-station-name">{name}</span>
      {available && <span className="lodge-up-arrow" title="Upgrade available"><span aria-hidden="true">↑</span><span className="lodge-sr-only">Upgrade available</span></span>}
    </button>
  );
}

function LodgeUpgradeDetails({ s, def }: { s: GameState; def: LodgeDef }) {
  const tier = lodgeTierOf(s, def.id);
  const next = nextLodgeTier(s, def.id);
  const blocker = lodgeBlocker(s, def.id);
  const legendLocked = def.id === 'trophyWall' && !!next && !s.giant.legends.length;
  return (
    <>
      <div className="lodge-detail-title">
        <h3>{def.name}</h3>
        <span className="muted small num">{def.tiers.length === 1 ? 'Unbuilt' : `Level ${tier} / ${def.tiers.length}`}</span>
      </div>
      <span className="muted small">{def.desc}</span>
      <div className="lodge-effects">
        {def.tiers.slice(0, tier).map((t) => <span key={t.level} className="small good">Built: {t.effect}</span>)}
      </div>
      {next ? (
        <div className="lodge-upgrade-action">
          <div className="lodge-effects">
            <span className="small">{next.effect}</span>
            {!legendLocked && <CostRow s={s} cost={next.cost} />}
            {blocker && <span className="muted small">{blocker}</span>}
          </div>
          <button
            className="btn sm primary"
            disabled={!!blocker}
            onClick={() => game.act((st, ctx) => buildLodge(st, ctx, def.id))}
          >
            {def.id === 'trophyWall' ? 'Build Trophy Wall' : `Build level ${next.tier}`}
          </button>
        </div>
      ) : <Badge tone="success">Fully built</Badge>}
    </>
  );
}

function WorldTreeDetails({ s }: { s: GameState }) {
  const wt = s.giant.worldTree;
  const now = Date.now();
  const growth = worldTreeGrowth(s, now);
  const ready = worldTreeReady(s, now);
  const blocker = plantBlocker(s);
  const daysLeft = wt ? Math.max(0, Math.ceil(((1 - growth) * WORLD_TREE_GROWTH_MS) / 86400000)) : 0;
  return (
    <>
      <div className="lodge-detail-title"><h3>World Tree</h3><span className="muted small">{s.storage.bank.world_tree_seed ?? 0} seeds</span></div>
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
          <span className="muted small">A rare seed from legendary giants grows here over 120 days. Planting requires the Trophy Wall.</span>
          <button className="btn sm primary" disabled={!!blocker} title={blocker ?? undefined} onClick={() => game.act((st, ctx) => plantWorldTree(st, ctx))}>{blocker ?? 'Plant the seed'}</button>
        </>
      )}
    </>
  );
}

function LodgeTab({ s }: { s: GameState }) {
  const [selected, select] = useState<LodgeStationId | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const selectedUpgrade = LODGE_UPGRADES.find((def) => def.id === selected);
  const wall = lodgeTierOf(s, TROPHY_WALL.id) > 0;
  const built = LODGE_UPGRADES.reduce((n, def) => n + lodgeTierOf(s, def.id), 0);
  const total = LODGE_UPGRADES.reduce((n, def) => n + def.tiers.length, 0);
  useEffect(() => {
    if (selected) detailsRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selected]);
  const choose = (id: LodgeStationId) => select((current) => current === id ? null : id);
  return (
    <section className="woodcutters-lodge" aria-labelledby="lodge-title">
      <header className="lodge-header">
        <div className="lodge-window" aria-hidden="true" />
        <div className="lodge-heading">
          <h2 id="lodge-title">Woodcutter&apos;s Lodge</h2>
          <ProgressBar value={built / total} color="#d5a665" label={`${built} / ${total} upgrade levels built`} />
        </div>
      </header>
      <div className="lodge-workshop" role="group" aria-label="Lodge stations">
        {LODGE_UPGRADES.map((def) => (
          <LodgeStation key={def.id} id={def.id} name={def.name} tier={lodgeTierOf(s, def.id)}
            selected={selected === def.id} available={!lodgeBlocker(s, def.id)} onSelect={() => choose(def.id)} />
        ))}
        <LodgeStation id="worldTree" name="World Tree" tier={worldTreeReady(s, Date.now()) ? 2 : Number(!!s.giant.worldTree)}
          selected={selected === 'worldTree'} onSelect={() => choose('worldTree')} />
      </div>
      <div id="lodge-station-details" className="lodge-station-details" ref={detailsRef} hidden={!selected}>
        {selected === 'worldTree' && <WorldTreeDetails s={s} />}
        {selected === 'trophyWall' && wall
          ? <TrophyWall s={s} />
          : selectedUpgrade && <LodgeUpgradeDetails s={s} def={selectedUpgrade} />}
      </div>
    </section>
  );
}

function TrophyWall({ s }: { s: GameState }) {
  return (
    <section className="lodge-trophy-wall" aria-labelledby="lodge-trophy-title">
      <div className="lodge-detail-title">
        <h3 id="lodge-trophy-title">Trophy Wall</h3>
        <span className="muted small num">{LEGENDS.filter((l) => s.giant.legends.includes(l.id)).length} / {LEGENDS.length} legends felled</span>
      </div>
      <div className="lodge-mounts">
        {LEGENDS.map((l) => {
          const log = s.giant.legendLog[l.id];
          const felled = s.giant.legends.includes(l.id);
          return (
            <article key={l.id} className={`lodge-trophy ${felled ? 'mounted' : ''}`}>
              <h4 className="lodge-nameplate">{felled ? l.name : 'Empty placard'}</h4>
              <span className="muted small">{woodDef(l.region).region} · Lv 80+</span>
              {felled && (
                <>
                  <span className="muted small">{l.desc}</span>
                  {log && <span className="small">Felled {new Date(log.at).toLocaleDateString()} · {yieldWords(log.yields)}</span>}
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** The Woodcutting screen's content for one of its tabs. */
export function GiantView({ tab }: { tab: GiantTab }) {
  const s = useGame();
  switch (tab) {
    case 'lodge': return <LodgeTab s={s} />;
    default: return <ForestTab s={s} />;
  }
}

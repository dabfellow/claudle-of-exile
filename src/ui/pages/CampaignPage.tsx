import { trialAt } from '../../engine/ascendancy';
import { uniqueDef } from '../../data/bases';
import { areaCurrency, bossGatherMats, bossTable } from '../../data/drops';
import { materialDef } from '../../data/materials';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ACT_MAPS, smoothPath, WORLD_MAP, type MapPoint } from '../../data/campaignMap';
import { LABEL_SIDE, labelLines, ZONE_POS } from '../../data/continent';
import { actBossZone, actOpen, ACTS, bossesNeeded, isSideArea, MECHANIC_INFO, roadsInto, ZONES, zoneDef, zonesInAct, type ZoneDef } from '../../data/zones';
import { FINAL_ACT } from '../../engine/hideout';
import { bossesBeatenInAct, zoneLockText } from '../../engine/progress';
import { areaXpLabel, characterLevel } from '../../engine/character';
import { BOSS_RESPAWN_MS, bossIsNext, canBossFarm, startCombat, toggleBossFarm } from '../../engine/combat';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { ActTerrain, WorldTerrain } from '../components/CampaignTerrain';
import { anyArtUrl, Badge, EmptyState, GameIcon, MatIcon, PageHeader, ProgressBar, sceneStyle } from '../components/common';
import type { Page } from '../Layout';
import '../round2-session2.css';

/** How risky an area looks for your current level. */
function danger(s: GameState, z: ZoneDef): { label: string; cls: string } {
  const gap = z.levelRange[0] - characterLevel(s);
  if (gap <= -4) return { label: 'Easy', cls: 'good' };
  if (gap <= 0) return { label: 'Fair', cls: '' };
  if (gap <= 4) return { label: 'Risky', cls: 'warn' };
  return { label: 'Deadly', cls: 'bad' };
}

/** The rarest orbs an area can drop, its uniques, and what its boss always gives. */
function DropPreview({ z }: { z: ZoneDef }) {
  const boss = bossTable(z.tier);
  const orbs = Object.entries(areaCurrency(z))
    .sort((a, b) => a[1] - b[1])
    .slice(0, 4)
    .map(([id]) => id);
  return (
    <div className="area-drops">
      <span className="dim">Notable drops</span>
      <div className="row wrap" style={{ gap: 6 }}>
        {orbs.map((id) => (
          <span key={id} className="io-item" title={materialDef(id).name}>
            <MatIcon id={id} /> {materialDef(id).name}
          </span>
        ))}
        {z.uniques.map((id) => (
          <span key={id} className="io-item unique-name" title="Unique item">
            {uniqueDef(id).name}
          </span>
        ))}
      </div>
      <span className="dim">
        First boss kill: {boss.guaranteed.map((g) => `${g.qty}× ${materialDef(g.id).name}`).join(', ')} (then {Math.round(boss.repeatChance * 100)}% per kill)
      </span>
      <span className="dim">Boss kills can also drop {bossGatherMats(z.boss.level).map((id) => materialDef(id).name).join(', ')}</span>
    </div>
  );
}

/** The boss's mechanics, each with how to answer it. */
function BossMechanics({ z }: { z: ZoneDef }) {
  return (
    <div className="row wrap" style={{ gap: 4 }}>
      {(z.boss.mechanics ?? ['slam']).map((k) => (
        <span key={k} className={`chip mechanic ${k}`} title={MECHANIC_INFO[k].tip}>
          {MECHANIC_INFO[k].name}
          {z.boss.echoes?.some((p) => p.includes(k)) ? ' (echo)' : ''}
        </span>
      ))}
    </div>
  );
}

function AreaCard({ s, z, go }: { s: GameState; z: ZoneDef; go: (p: Page) => void }) {
  const unlocked = s.unlockedZones.includes(z.id);
  const here = s.combat?.zoneId === z.id;
  const kills = s.zoneKills[z.id] ?? 0;
  const risk = danger(s, z);
  const areaXp = areaXpLabel(characterLevel(s), z.levelRange);
  const n = zonesInAct(z.act).indexOf(z) + 1;
  const beaten = s.bossesDefeated.includes(z.id);
  const farming = here && !!s.combat?.bossFarm;
  const trial = trialAt(s, z.id);
  return (
    <div className={`card area ${here ? 'current' : ''} ${unlocked ? '' : 'locked'} ${z.actBoss ? 'act-boss' : ''}`} style={{ ['--zone' as string]: z.color }}>
      <div className={`area-banner ${anyArtUrl(`zones/${z.id}`) ? 'has-art' : ''}`} style={sceneStyle(`zones/${z.id}`)}>
        <span className="area-tier">{z.actBoss ? 'Act boss' : isSideArea(z) ? 'Side area' : `Area ${n}`}</span>
        {here && (
          <Badge tone="success" live>
            You are here
          </Badge>
        )}
        {beaten && !here && <Badge tone="gold">Cleared</Badge>}
        {!unlocked && (
          <Badge tone="locked">
            <GameIcon name="lock" size={11} /> Locked
          </Badge>
        )}
      </div>
      <div className="row">
        <h3>{z.name}</h3>
        <span className="spacer" />
        <span className="nav-badge">
          Lv {z.levelRange[0]}–{z.levelRange[1]}
        </span>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        {unlocked ? z.desc : zoneLockText(s, z)}
      </p>
      {unlocked && (
        <>
          <div className="area-facts">
            <span>
              <GameIcon name="skull" size={12} /> Packs of {z.packSize[0]}–{z.packSize[1]}
            </span>
            <span>
              <GameIcon name="target" size={12} /> {z.actBoss ? 'Act boss' : 'Boss'}: {z.boss.name} (Lv {z.boss.level})
            </span>
            <span className={risk.cls}>
              <GameIcon name="bolt" size={12} /> {risk.label} for your level
            </span>
            {areaXp && <span>{areaXp} at your level</span>}
          </div>
          <BossMechanics z={z} />
          {trial && (
            <div className="small">
              <b>Ascendancy trial {trial.n}:</b>{' '}
              {s.ascendancy.trials >= trial.n ? 'passed.' : `your first win over ${z.boss.name} gives ${trial.points} ascendancy points. ${trial.result}`}
            </div>
          )}
          <DropPreview z={z} />
          <ProgressBar value={Math.min(1, kills / z.bossEvery)} color={bossIsNext(s, z.id) ? 'var(--life-2)' : z.color} />
          <div className="dim small">
            {bossIsNext(s, z.id) ? `${z.boss.name} awaits` : `${kills}/${z.bossEvery} kills until the boss`}
          </div>
          <button
            className={`btn ${here ? '' : 'primary'}`}
            data-tut={`zone-${z.id}`}
            onClick={() => {
              if (!here) game.act((st, ctx) => startCombat(st, ctx, z.id));
              go('combat');
            }}
          >
            {here ? 'Return to fight' : 'Travel here'}
          </button>
          {canBossFarm(s, z.id) && (
            <button
              className="btn"
              title={`Fight only ${z.boss.name}, who comes back ${BOSS_RESPAWN_MS / 1000} seconds after each kill`}
              onClick={() => {
                game.act((st, ctx) => {
                  if (!here && startCombat(st, ctx, z.id)) return;
                  toggleBossFarm(st);
                });
                if (!farming) go('combat');
              }}
            >
              {farming ? 'Stop boss farm' : 'Boss farm'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** The act you're fighting in, else the furthest act you've reached. */
function currentAct(s: GameState): number {
  if (s.combat) return zoneDef(s.combat.zoneId).act;
  return Math.max(1, ...ZONES.filter((z) => s.unlockedZones.includes(z.id) && actOpen(z.act)).map((z) => z.act));
}

/** The area to show first in an act: where you're fighting, else the furthest one you've opened. */
function defaultZone(s: GameState, act: number): string {
  const zones = zonesInAct(act);
  if (s.combat && zoneDef(s.combat.zoneId).act === act) return s.combat.zoneId;
  return [...zones].reverse().find((z) => s.unlockedZones.includes(z.id))?.id ?? zones[0]?.id ?? '';
}

function zoneState(s: GameState, z: ZoneDef): 'current' | 'cleared' | 'open' | 'locked' {
  if (s.combat?.zoneId === z.id) return 'current';
  if (s.bossesDefeated.includes(z.id)) return 'cleared';
  return s.unlockedZones.includes(z.id) ? 'open' : 'locked';
}

function actProgress(s: GameState, act: number): { cleared: number; total: number; done: boolean } {
  const zones = zonesInAct(act);
  const boss = actBossZone(act);
  return { cleared: zones.filter((z) => s.bossesDefeated.includes(z.id)).length, total: zones.length, done: !!boss && s.bossesDefeated.includes(boss.id) };
}

/** Places a marker at a point given in percent of its picture. */
const at = ([x, y]: MapPoint): CSSProperties => ({ left: `${x}%`, top: `${y}%` });

// ---------- level 1: the world ----------

/** Every act on one zoomed-out map, joined by the rough trail the campaign takes. Pick an act to go in. */
function WorldMap({ s, onOpen }: { s: GameState; onOpen: (act: number) => void }) {
  const cur = currentAct(s);
  const here = s.combat ? ZONE_POS[s.combat.zoneId] : undefined;
  return (
    <div className="card cmap-card">
      <div className="cmap-world" style={{ aspectRatio: WORLD_MAP.aspect }}>
        {WORLD_MAP.image ? <img className="ct-svg" src={WORLD_MAP.image} alt="" /> : <WorldTerrain isOpen={actOpen} selected={cur} onPick={onOpen} here={here} />}
        <svg className="cmap-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path className="cmap-trail-under" d={smoothPath(WORLD_MAP.trail)} />
          <path className="cmap-trail" d={smoothPath(WORLD_MAP.trail)} />
        </svg>
        {ACTS.map((a) => {
          const pos = WORLD_MAP.labels[a.n];
          if (!pos) return null;
          const open = actOpen(a.n);
          const pr = actProgress(s, a.n);
          return (
            <button key={a.n} className={`cmap-act-label ${open ? '' : 'locked'} ${a.n === cur ? 'current' : ''} ${pr.done ? 'done' : ''}`} style={at(pos)} disabled={!open} onClick={() => onOpen(a.n)} title={open ? `Open Act ${a.n}: ${a.name}` : `Act ${a.n} isn't open yet`}>
              <small>
                Act {a.n}
                {pr.done && ' ✓'}
              </small>
              <b>{open ? a.name.replace(/^The /, '') : '???'}</b>
              {open && pr.total > 0 && (
                <span className="cmap-act-label-progress num">
                  {pr.cleared}/{pr.total}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The same acts as a list: big tap targets, with progress and where you are. */
function ActList({ s, onOpen }: { s: GameState; onOpen: (act: number) => void }) {
  const cur = currentAct(s);
  return (
    <div className="cmap-acts">
      {ACTS.map((a) => {
        const open = actOpen(a.n);
        const pr = actProgress(s, a.n);
        const reached = zonesInAct(a.n).some((z) => s.unlockedZones.includes(z.id));
        return (
          <button key={a.n} className={`card cmap-act-card ${open ? '' : 'locked'} ${a.n === cur ? 'current' : ''}`} disabled={!open} onClick={() => onOpen(a.n)}>
            <span className="cmap-act-num num">{a.n}</span>
            <span className="cmap-act-body">
              <b>{open ? a.name : 'Coming soon'}</b>
              {open && pr.total > 0 && <ProgressBar value={pr.cleared / pr.total} color={pr.done ? 'var(--success)' : undefined} />}
              <span className="dim small">
                {!open ? 'Not open yet' : pr.done ? 'Complete' : reached ? `${pr.cleared} of ${pr.total} bosses beaten` : 'Not reached yet'}
                {open && !a.open && ' · preview'}
              </span>
            </span>
            {a.n === cur && s.combat && (
              <Badge tone="success" live>
                Here
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------- level 2: one act ----------

const nodeKind = (z: ZoneDef) => (z.actBoss ? 'is-boss' : isSideArea(z) ? 'is-side' : 'is-main');

/** One act up close: its landscape, the roads its bosses open (with their bends), and every area on them. */
function ActCloseUp({ s, act, selected, onSelect }: { s: GameState; act: number; selected: string; onSelect: (id: string) => void }) {
  const data = ACT_MAPS[act];
  const scroller = useRef<HTMLDivElement>(null);
  const keepClear = useMemo(() => (data ? [...Object.values(data.zones), ...Object.values(data.roads).flat(), ...data.entries.map((e) => e.at)] : []), [data]);
  // on a phone, the map is wider than the screen: start with the chosen area in view
  useEffect(() => {
    const box = scroller.current;
    const node = box?.querySelector<HTMLElement>('.cmap-node.selected');
    if (box && node && box.scrollWidth > box.clientWidth) box.scrollLeft = node.offsetLeft - box.clientWidth / 2;
  }, [act]);
  if (!data) return null;
  const zones = zonesInAct(act).filter((z) => data.zones[z.id]);
  const unlocked = (id: string) => s.unlockedZones.includes(id);
  const roads = zones.flatMap((z) =>
    roadsInto(z)
      .filter((from) => data.zones[from])
      .map((from) => ({
        key: `${from}>${z.id}`,
        d: smoothPath([data.zones[from], ...(data.roads[`${from}>${z.id}`] ?? []), data.zones[z.id]]),
        walked: unlocked(z.id) && s.bossesDefeated.includes(from),
        side: isSideArea(z),
      })),
  );
  const entries = data.entries
    .filter((e) => data.zones[e.to])
    .map((e) => ({ key: `${e.from}>${e.to}`, d: smoothPath([e.at, data.zones[e.to]]), walked: unlocked(e.to), side: false }));
  // dense acts get a wider map that scrolls sideways on narrow screens
  const minWidth = zones.length > 12 ? 620 : zones.length > 9 ? 520 : 0;
  return (
    <div className="cmap-act-scroll" ref={scroller}>
      <div className="cmap-act" style={{ aspectRatio: data.aspect, minWidth: minWidth || undefined, ['--aspect' as string]: data.aspect }}>
        {data.image ? <img className="ct-svg" src={data.image} alt="" /> : <ActTerrain act={act} keepClear={keepClear} />}
        <svg className="cmap-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {[...entries, ...roads].map((r) => (
            <g key={r.key} className={`cmap-road ${r.walked ? 'walked' : ''} ${r.side ? 'side' : ''}`}>
              <path className="cmap-road-under" d={r.d} />
              <path className="cmap-road-line" d={r.d} />
            </g>
          ))}
        </svg>
        {zones.map((z) => {
          const state = zoneState(s, z);
          const need = bossesNeeded(z) - bossesBeatenInAct(s, act);
          const trial = trialAt(s, z.id);
          const trialOpen = !!trial && s.ascendancy.trials < trial.n;
          return (
            <button
              key={z.id}
              className={`cmap-node ${state} ${nodeKind(z)} ${z.id === selected ? 'selected' : ''}`}
              style={{ ...at(data.zones[z.id]), ['--zone' as string]: z.color }}
              onClick={() => onSelect(z.id)}
              title={unlocked(z.id) ? z.name : `${z.name}: ${zoneLockText(s, z)}`}
              aria-label={z.name}
            >
              <span className="cmap-node-dot">
                {need > 0 ? <b className="num">{need}</b> : z.actBoss ? <GameIcon name="skull" size={13} /> : state === 'cleared' ? '✓' : null}
              </span>
              {trialOpen && (
                <span className="cmap-node-trial" title={`Ascendancy trial ${trial!.n}`}>
                  <GameIcon name="trophy" size={10} />
                </span>
              )}
              <span className={`cmap-node-name ${LABEL_SIDE[z.id] ?? 'below'}`}>
                {labelLines(z.name).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** What the marks on an act's map mean. */
function ActLegend() {
  return (
    <div className="cmap-legend dim small">
      <span>
        <i className="cmap-key current" /> You are here
      </span>
      <span>
        <i className="cmap-key cleared" /> Boss beaten
      </span>
      <span>
        <i className="cmap-key open" /> Open
      </span>
      <span>
        <i className="cmap-key locked" /> Locked
      </span>
      <span>
        <i className="cmap-key gate">3</i> Bosses needed first
      </span>
      <span>
        <GameIcon name="trophy" size={11} /> Trial
      </span>
    </div>
  );
}

export function CampaignPage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  // nothing to choose between until a second act opens, so a new character goes straight into Act 1
  const reachedActs = new Set(ZONES.filter((z) => s.unlockedZones.includes(z.id) && actOpen(z.act)).map((z) => z.act)).size;
  const [act, setAct] = useState<number | null>(() => (reachedActs <= 1 ? currentAct(s) : null));
  const [zoneId, setZoneId] = useState(() => defaultZone(s, currentAct(s)));
  const openAct = (n: number) => {
    setAct(n);
    setZoneId(defaultZone(s, n));
  };

  if (act === null) {
    return (
      <div className="page">
        <PageHeader title="Campaign">The road the campaign takes across the continent. Pick an act to see its areas up close.</PageHeader>
        <WorldMap s={s} onOpen={openAct} />
        <ActList s={s} onOpen={openAct} />
      </div>
    );
  }

  const current = ACTS.find((a) => a.n === act)!;
  const open = actOpen(act);
  const zones = zonesInAct(act);
  const { cleared, done } = actProgress(s, act);
  const next = ACTS.find((a) => a.n === act + 1);
  const zone = zones.find((z) => z.id === zoneId);
  return (
    <div className="page">
      <PageHeader title="Campaign">Each boss opens the roads ahead. From Act 3 they fork, and each act boss waits until you've beaten most of its act's bosses, so which ones you skip is up to you.</PageHeader>
      <div className="cmap-act-head">
        <button className="btn sm" onClick={() => setAct(null)}>
          ← World map
        </button>
        <h2>
          <small>Act {current.n}</small> {current.name}
        </h2>
        {open && !current.open && <Badge tone="locked">Preview</Badge>}
        <span className="grow" />
        {zones.length > 0 && (
          <span className="cmap-act-progress">
            <ProgressBar value={cleared / zones.length} color={done ? 'var(--success)' : undefined} />
            <span className="dim small num">
              {cleared}/{zones.length} bosses defeated
            </span>
          </span>
        )}
      </div>
      {done && (
        <div className="card act-complete">
          <h3>Act {current.n} complete</h3>
          <p className="muted" style={{ margin: 0 }}>
            {current.outro}{' '}
            {current.n === FINAL_ACT
              ? 'The campaign is over: the Map Device is open, and the Exile can be created.'
              : next && actOpen(next.n)
                ? `Act ${next.n}, ${next.name}, is open.`
                : `Act ${current.n + 1} arrives in a future update — until then, farm these areas for better gear, push your skills and fill your stash.`}
          </p>
          {next && actOpen(next.n) && (
            <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => openAct(next.n)}>
              On to Act {next.n}
            </button>
          )}
        </div>
      )}
      {!open || zones.length === 0 ? (
        <div className="card">
          <EmptyState icon={<GameIcon name="lock" size={32} color="var(--dim)" />} title="Coming soon">
            This act isn't open yet. Finish Act {current.n - 1} when it arrives.
          </EmptyState>
        </div>
      ) : (
        <div className="act-layout">
          <div className="card cmap-card">
            <ActCloseUp s={s} act={act} selected={zoneId} onSelect={setZoneId} />
            <ActLegend />
          </div>
          {zone && <AreaCard s={s} z={zone} go={go} />}
        </div>
      )}
    </div>
  );
}

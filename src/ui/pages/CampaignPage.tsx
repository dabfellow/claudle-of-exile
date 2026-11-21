import { trialAt } from '../../engine/ascendancy';
import { uniqueDef } from '../../data/bases';
import { areaCurrency, bossGatherMats, bossTable } from '../../data/drops';
import { materialDef } from '../../data/materials';
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ACT_MAPS, smoothPath, VEYRATH_FRONTIERS, VEYRATH_REGIONS, WORLD_MAP, type MapPoint } from '../../data/campaignMap';
import { CAMPAIGN_GEAR_CHECKS } from '../../data/campaignGearChecks';
import { labelLines } from '../../data/continent';
import { actBossZone, actOpen, ACTS, bossesNeeded, isSideArea, MECHANIC_INFO, roadsInto, ZONES, zoneDef, zonesInAct, type ZoneDef } from '../../data/zones';
import { FINAL_ACT } from '../../engine/hideout';
import { campaignQuestView } from '../../engine/campaignQuests';
import { bossesBeatenInAct, zoneLockText } from '../../engine/progress';
import { areaXpLabel, characterLevel } from '../../engine/character';
import { BOSS_RESPAWN_MS, bossIsNext, canBossFarm, startCombat, toggleBossFarm } from '../../engine/combat';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { ActTerrain, WorldTerrain } from '../components/CampaignTerrain';
import { Badge, EmptyState, GameIcon, MatIcon, PageHeader, ProgressBar, zoneBackdrop } from '../components/common';
import type { Page } from '../Layout';
import '../round2-session2.css';
import '../components/veyrath-atlas.css';
import { CampaignJournal } from '../components/CampaignJournal';
import { actRevealed } from '../campaignExploration';

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
  const backdrop = zoneBackdrop(z);
  const unlocked = s.unlockedZones.includes(z.id);
  const here = s.combat?.zoneId === z.id;
  const kills = s.zoneKills[z.id] ?? 0;
  const risk = danger(s, z);
  const areaXp = areaXpLabel(characterLevel(s), z.levelRange);
  const n = zonesInAct(z.act).indexOf(z) + 1;
  const beaten = s.bossesDefeated.includes(z.id);
  const farming = here && !!s.combat?.bossFarm;
  const trial = trialAt(s, z.id);
  const pack = CAMPAIGN_GEAR_CHECKS[z.id];
  return (
    <div className={`card area ${here ? 'current' : ''} ${unlocked ? '' : 'locked'} ${z.actBoss ? 'act-boss' : ''}`} style={{ ['--zone' as string]: z.color }}>
      <div className={`area-banner${backdrop ? ' has-art' : ''}`} style={backdrop ? { ['--scene-art' as string]: `url(${backdrop})` } : undefined}>
        <span className="area-tier">{z.actBoss ? 'Act boss' : isSideArea(z) ? 'Side zone' : `Zone ${n}`}</span>
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
          {pack && (
            <div className="small">
              <b className={pack.major ? 'bad' : undefined}>{pack.major ? 'Gear check' : 'Dangerous pack'} · {pack.name}</b>
              <div className="muted">{pack.warning}</div>
              <ul className="muted" style={{ margin: 0, paddingInlineStart: '1em' }}>
                {pack.counters.map((counter) => <li key={counter.tip}>{counter.tip}</li>)}
              </ul>
            </div>
          )}
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

/** The atlas itself is the act picker: each outlined geographic region is a keyboard-accessible target. */
export function WorldMap({ s, onOpen }: { s: GameState; onOpen: (act: number) => void }) {
  const cur = currentAct(s);
  const fogId = useId().replace(/:/g, '');
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <section className="veyrath-atlas" aria-label="Veyrath world map">
    <div className="card cmap-card cmap-world-scroll">
      <div className="cmap-world" style={{ aspectRatio: WORLD_MAP.aspect }}>
        {WORLD_MAP.image ? <img className="ct-svg" src={WORLD_MAP.image} alt="Veyrath atlas showing Brinewick, Greyford, Harrowgate, Cairnwatch and Caer Veyr" /> : <WorldTerrain isOpen={actOpen} selected={cur} onPick={onOpen} />}
        <svg className="cmap-overlay veyrath-regions" viewBox="0 0 100 100" preserveAspectRatio="none" role="group" aria-label="World map regions">
          <defs>
            <filter id={fogId} x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur in="SourceAlpha" stdDeviation=".3" result="fogEdge" />
              <feTurbulence type="fractalNoise" baseFrequency=".28 .38" numOctaves="3" seed="12" result="clouds" />
              <feColorMatrix in="clouds" type="matrix" values=".06 .06 .06 0 .19  .06 .06 .06 0 .21  .06 .06 .06 0 .21  0 0 0 0 1" />
              <feComposite in2="fogEdge" operator="in" />
            </filter>
          </defs>
          <g className="veyrath-fog" aria-hidden="true">
            {VEYRATH_REGIONS.map((region) => <path key={region.act} d={region.d}
              className={actRevealed(s, region.act) ? 'is-revealed' : ''}
              filter={`url(#${fogId})`} />)}
          </g>
          <g className="veyrath-region-highlight" aria-hidden="true">
            {VEYRATH_REGIONS.map((region) => <path key={region.act} d={region.d}
              className={hovered === region.act ? 'is-hovered' : ''} />)}
          </g>
          <g className="veyrath-frontiers" aria-hidden="true">
            {VEYRATH_FRONTIERS.map((border, index) => <g key={index} className={border.acts.includes(hovered ?? cur) ? 'is-current' : ''}>
              <path className="frontier-ink" d={border.d} />
            </g>)}
          </g>
          {VEYRATH_REGIONS.map((region) => {
            const chapter = ACTS.find((a) => a.n === region.act)!;
            const open = actRevealed(s, region.act);
            return <path key={region.act} d={region.d}
              className={`veyrath-territory ${open ? '' : 'is-locked'}`}
              role="button" tabIndex={0} aria-label={`Act ${region.act}: ${chapter.name}${open ? '' : ' — unexplored, finish the previous act'}`} aria-disabled={!open}
              onMouseEnter={() => setHovered(region.act)} onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(region.act)} onBlur={() => setHovered(null)}
              onClick={() => { if (open) onOpen(region.act); }}
              onKeyDown={(event) => {
                if (open && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onOpen(region.act); }
              }}>
              <title>{`${chapter.name} — ${region.place}${open ? '' : ' — finish the previous act to reveal'}`}</title>
            </path>;
          })}
        </svg>
        {ACTS.map((chapter) => {
          const pos = WORLD_MAP.labels[chapter.n];
          if (!pos) return null;
          const open = actRevealed(s, chapter.n);
          return <button key={chapter.n} className={`veyrath-ribbon ${chapter.n === cur ? 'is-current' : ''} ${chapter.n === 7 ? 'is-sea' : ''} ${hovered === chapter.n ? 'is-hovered' : ''} ${open ? '' : 'is-locked'}`}
            style={{ ...at(pos), ['--ribbon-turn' as string]: `${chapter.n % 2 ? -1 : 1}deg` }}
            data-tut={`act-${chapter.n}`}
            aria-disabled={!open} aria-label={`Act ${chapter.n}: ${chapter.name}${open ? '' : ' — unexplored'}`}
            title={open ? `Explore Act ${chapter.n}` : `Finish Act ${chapter.n - 1} to reveal this region`}
            onClick={() => { if (open) onOpen(chapter.n); }}
            onMouseEnter={() => setHovered(chapter.n)} onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(chapter.n)} onBlur={() => setHovered(null)}>
            <svg className="veyrath-ribbon-paper" viewBox="0 0 200 76" preserveAspectRatio="none" aria-hidden="true">
              <path className="ribbon-tails" d="M23 18 L3 15 L10 35 L2 55 L24 58 Z M177 18 L197 15 L190 35 L198 55 L176 58 Z" />
              <path className="ribbon-face" d="M18 10 Q100 5 183 11 L180 64 Q101 59 20 65 Z" />
              <path className="ribbon-folds" d="M18 10 L23 18 L20 65 L24 58 M183 11 L177 18 L180 64 L176 58 M27 15 Q100 11 174 16 M29 59 Q100 54 171 59" />
            </svg>
            <span className="veyrath-ribbon-name">{chapter.name}</span>
            <small>Act {chapter.n}{open ? '' : ' · Unexplored'}</small>
          </button>;
        })}
      </div>
    </div>
    </section>
  );
}

// ---------- level 2: one act ----------

const nodeKind = (z: ZoneDef) => (z.actBoss ? 'is-boss' : isSideArea(z) ? 'is-side' : 'is-main');

/** One act up close: its landscape, the roads its bosses open (with their bends), and every area on them. */
function ActCloseUp({ s, act, selected, questTarget, onSelect }: { s: GameState; act: number; selected: string; questTarget: { zoneId: string } | null; onSelect: (id: string) => void }) {
  const data = ACT_MAPS[act];
  const scroller = useRef<HTMLDivElement>(null);
  const questNode = useRef<HTMLButtonElement>(null);
  const keepClear = useMemo(() => (data ? [...Object.values(data.zones), ...Object.values(data.roads).flat(), ...data.entries.map((e) => e.at)] : []), [data]);
  // on a phone, the map is wider than the screen: start with the chosen area in view
  useEffect(() => {
    const box = scroller.current;
    const node = box?.querySelector<HTMLElement>('.cmap-node.selected');
    if (box && node && box.scrollWidth > box.clientWidth) box.scrollLeft = node.offsetLeft - box.clientWidth / 2;
  }, [act]);
  useEffect(() => {
    if (!questTarget) return;
    const frame = requestAnimationFrame(() => {
      questNode.current?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [questTarget]);
  if (!data) return null;
  const zones = zonesInAct(act).filter((z) => data.zones[z.id]);
  const unlocked = (id: string) => s.unlockedZones.includes(id);
  const roads = data.traces ? [] : zones.flatMap((z) =>
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
  const tracedRoads = data.traces?.map((trace, index) => ({
    key: `trace-${index}`, d: trace.d, side: false,
    walked: trace.routes.some((route) => {
      const [from, to] = route.split('>');
      return unlocked(to) && s.bossesDefeated.includes(from);
    }),
  }));
  // dense acts get a wider map that scrolls sideways on narrow screens
  const minWidth = zones.length > 12 ? 620 : zones.length > 9 ? 520 : zones.length > 6 ? 480 : 360;
  return (
    <div className="cmap-act-scroll" ref={scroller}>
      <div className="cmap-act" style={{ aspectRatio: data.aspect, minWidth: minWidth || undefined, ['--aspect' as string]: data.aspect }}>
        {data.image ? <img className="ct-svg" src={data.image} alt="" /> : <ActTerrain act={act} keepClear={keepClear} />}
        <svg className="cmap-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {(tracedRoads ?? [...entries, ...roads]).map((r) => (
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
          const isQuestTarget = questTarget?.zoneId === z.id;
          return (
            <button
              key={z.id}
              ref={isQuestTarget ? questNode : undefined}
              className={`cmap-node ${state} ${nodeKind(z)} ${z.id === selected ? 'selected' : ''}${isQuestTarget ? ' quest-target' : ''}`}
              style={{ ...at(data.zones[z.id]), ['--zone' as string]: z.color }}
              onClick={() => onSelect(z.id)}
              title={unlocked(z.id) ? z.name : `${z.name}: ${zoneLockText(s, z)}`}
              aria-label={z.name}
              aria-description={isQuestTarget ? 'Current quest objective' : undefined}
            >
              {isQuestTarget && <span className="cmap-quest-marker" aria-hidden="true" />}
              <span className="cmap-node-dot">
                {need > 0 ? <b className="num">{need}</b> : z.actBoss ? <GameIcon name="skull" size={13} /> : state === 'cleared' ? '✓' : null}
              </span>
              {trialOpen && (
                <span className="cmap-node-trial" title={`Ascendancy trial ${trial!.n}`}>
                  <GameIcon name="trophy" size={10} />
                </span>
              )}
              <span className="cmap-node-name above">
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

export function CampaignPage({ go, initialQuestZone }: { go: (p: Page) => void; initialQuestZone: string | null }) {
  const s = useGame();
  const storageKey = `coe-world-map:${s.character.id}`;
  const [questTarget, setQuestTarget] = useState(() => initialQuestZone ? { zoneId: initialQuestZone } : null);
  const [selection, setSelection] = useState<{ act: number | null; zoneId: string }>(() => {
    if (initialQuestZone) return { act: zoneDef(initialQuestZone).act, zoneId: initialQuestZone };
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (saved && (saved.act === null || ACTS.some((a) => a.n === saved.act && actRevealed(s, a.n)))) {
        const zone = ZONES.find((z) => z.id === saved.zoneId && (saved.act === null || z.act === saved.act));
        return { act: saved.act, zoneId: zone?.id ?? defaultZone(s, saved.act ?? currentAct(s)) };
      }
    } catch { /* Map preferences must never prevent a character from loading. */ }
    return { act: null, zoneId: defaultZone(s, currentAct(s)) };
  });
  const { act, zoneId } = selection;
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(selection)); } catch { /* Storage may be unavailable or full. */ }
  }, [storageKey, selection]);
  const setZoneId = (id: string) => {
    setQuestTarget((target) => target?.zoneId === id ? target : null);
    setSelection((previous) => ({ ...previous, zoneId: id }));
  };
  const openAct = (n: number) => {
    if (!actRevealed(s, n)) return;
    setQuestTarget(null);
    setSelection({ act: n, zoneId: defaultZone(s, n) });
  };
  const showQuestZone = (id: string) => {
    const questAct = zoneDef(id).act;
    if (!actRevealed(s, questAct)) return;
    setSelection({ act: questAct, zoneId: id });
    setQuestTarget({ zoneId: id });
  };

  if (act === null) {
    return (
      <div className="page wide world-map-page">
        <WorldMap s={s} onOpen={openAct} />
      </div>
    );
  }

  const current = ACTS.find((a) => a.n === act)!;
  const open = actOpen(act);
  const zones = zonesInAct(act);
  const { cleared, done } = actProgress(s, act);
  const next = ACTS.find((a) => a.n === act + 1);
  const zone = zones.find((z) => z.id === zoneId);
  const activeQuestTarget = questTarget && campaignQuestView(s).steps.some(({ current, step }) => current && step.zoneId === questTarget.zoneId)
    ? questTarget : null;
  return (
    <div className="page">
      <PageHeader title="World Map" />
      <div className="cmap-act-head">
        <button className="btn sm" onClick={() => { setQuestTarget(null); setSelection((previous) => ({ ...previous, act: null })); }}>
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
                : `Act ${current.n + 1} arrives in a future update — until then, farm these zones for better gear, push your skills and fill your stash.`}
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
            <ActCloseUp s={s} act={act} selected={zoneId} questTarget={activeQuestTarget} onSelect={setZoneId} />
            <ActLegend />
          </div>
          {zone && <AreaCard s={s} z={zone} go={go} />}
        </div>
      )}
      <CampaignJournal chapter={act} onSelectZone={showQuestZone} />
    </div>
  );
}

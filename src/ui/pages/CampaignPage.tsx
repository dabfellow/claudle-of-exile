import { uniqueDef } from '../../data/bases';
import { bossTable, dropTable } from '../../data/drops';
import { materialDef } from '../../data/materials';
import { useState } from 'react';
import { ACT_REGIONS, actRegion, CONTINENT_SIZE, regionPath, regionViewBox, ZONE_POS } from '../../data/continent';
import { actOpen, ACTS, bossesNeeded, MECHANIC_INFO, roadsInto, ZONES, zoneDef, zonesInAct, type ZoneDef } from '../../data/zones';
import { zoneLockText } from '../../engine/progress';
import { characterLevel } from '../../engine/character';
import { bossIsNext, startCombat } from '../../engine/combat';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { anyArtUrl, Badge, EmptyState, GameIcon, MatIcon, PageHeader, ProgressBar, sceneStyle } from '../components/common';
import type { Page } from '../Layout';

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
  const table = dropTable(z.tier);
  const boss = bossTable(z.tier);
  const orbs = Object.entries(table.currency)
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
  const n = zonesInAct(z.act).indexOf(z) + 1;
  const beaten = s.bossesDefeated.includes(z.id);
  return (
    <div className={`card area ${here ? 'current' : ''} ${unlocked ? '' : 'locked'} ${z.actBoss ? 'act-boss' : ''}`} style={{ ['--zone' as string]: z.color }}>
      <div className={`area-banner ${anyArtUrl(`zones/${z.id}`) ? 'has-art' : ''}`} style={sceneStyle(`zones/${z.id}`)}>
        <span className="area-tier">{z.actBoss ? 'Act boss' : `Area ${n}`}</span>
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
          </div>
          <BossMechanics z={z} />
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

/** The whole continent: one region per act. Open acts can be picked. */
function ContinentMap({ s, act, onPick }: { s: GameState; act: number; onPick: (n: number) => void }) {
  const hereZone = s.combat ? ZONE_POS[s.combat.zoneId] : undefined;
  return (
    <svg className="continent" viewBox={`0 0 ${CONTINENT_SIZE.w} ${CONTINENT_SIZE.h}`} role="img" aria-label="Map of the continent">
      <defs>
        <pattern id="sea-waves" width="40" height="18" patternUnits="userSpaceOnUse">
          <path d="M0 9 q10 -6 20 0 t20 0" fill="none" stroke="var(--line)" strokeWidth="1" opacity="0.5" />
        </pattern>
      </defs>
      <rect className="continent-sea" width={CONTINENT_SIZE.w} height={CONTINENT_SIZE.h} />
      <rect width={CONTINENT_SIZE.w} height={CONTINENT_SIZE.h} fill="url(#sea-waves)" />
      {ACT_REGIONS.map((r) => {
        const a = ACTS.find((x) => x.n === r.act)!;
        const open = actOpen(r.act);
        return (
          <g
            key={r.act}
            className={`continent-region ${open ? 'open' : 'locked'} ${r.act === act ? 'selected' : ''}`}
            onClick={() => open && onPick(r.act)}
            role={open ? 'button' : undefined}
          >
            <title>{open ? `Act ${a.n}: ${a.name}` : `Act ${a.n}: ${a.name} (not open yet)`}</title>
            <path d={regionPath(r)} />
            <text x={r.label[0]} y={r.label[1] - 14} className="continent-act">
              ACT {a.n}
            </text>
            <text x={r.label[0]} y={r.label[1] + 6} className="continent-name">
              {open ? a.name : '???'}
            </text>
          </g>
        );
      })}
      {ZONES.filter((z) => actOpen(z.act) && ZONE_POS[z.id]).map((z) => {
        const [x, y] = ZONE_POS[z.id];
        return <circle key={z.id} className={`continent-dot ${zoneState(s, z)}`} cx={x} cy={y} r={4} />;
      })}
      {hereZone && <circle className="continent-here" cx={hereZone[0]} cy={hereZone[1]} r={9} />}
    </svg>
  );
}

/** One act up close: its areas as linked points, opened in order by their bosses. */
function ActMap({ s, act, selected, onSelect }: { s: GameState; act: number; selected: string; onSelect: (id: string) => void }) {
  const region = actRegion(act);
  if (!region) return null;
  const zones = zonesInAct(act).filter((z) => ZONE_POS[z.id]);
  return (
    <svg className="act-map" viewBox={regionViewBox(region)} role="img" aria-label={`Areas of Act ${act}`}>
      <rect className="continent-sea" x={-100} y={-100} width={CONTINENT_SIZE.w + 200} height={CONTINENT_SIZE.h + 200} />
      {ACT_REGIONS.map((r) => (
        <path key={r.act} d={regionPath(r)} className={`act-map-region ${r.act === act ? 'this' : ''}`} />
      ))}
      {zones.flatMap((z) =>
        roadsInto(z)
          .filter((from) => ZONE_POS[from])
          .map((from) => {
            const [x1, y1] = ZONE_POS[from];
            const [x2, y2] = ZONE_POS[z.id];
            return <line key={`${from}-${z.id}`} className={`act-road ${s.unlockedZones.includes(z.id) ? 'walked' : ''}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
          }),
      )}
      {zones.map((z) => {
        const [x, y] = ZONE_POS[z.id];
        return (
          <g
            key={z.id}
            className={`act-node ${zoneState(s, z)} ${z.id === selected ? 'selected' : ''}`}
            transform={`translate(${x} ${y})`}
            onClick={() => onSelect(z.id)}
            role="button"
            style={{ ['--zone' as string]: z.color }}
          >
            <title>{s.unlockedZones.includes(z.id) ? z.name : `${z.name}: ${zoneLockText(s, z)}`}</title>
            <circle className="act-node-ring" r={z.actBoss ? 13 : 11} />
            <circle className="act-node-core" r={z.actBoss ? 8 : 6.5} />
            {bossesNeeded(z) > 0 && (
              <text y={3.5} className="act-node-gate">
                {bossesNeeded(z)}
              </text>
            )}
            <text y={z.actBoss ? 25 : 22} className="act-node-name">
              {z.name.replace(/^The /, '')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CampaignPage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const [act, setAct] = useState(() => currentAct(s));
  const [zoneId, setZoneId] = useState(() => defaultZone(s, currentAct(s)));
  const pickAct = (n: number) => {
    setAct(n);
    setZoneId(defaultZone(s, n));
  };
  const current = ACTS.find((a) => a.n === act)!;
  const open = actOpen(act);
  const zones = zonesInAct(act);
  const cleared = zones.filter((z) => s.bossesDefeated.includes(z.id)).length;
  const done = zones.length > 0 && cleared === zones.length;
  const next = ACTS.find((a) => a.n === act + 1);
  const zone = zones.find((z) => z.id === zoneId);
  return (
    <div className="page">
      <PageHeader title="Campaign">Pick an act on the map, then an area. Each boss opens the road to the next.</PageHeader>
      <div className="card continent-card">
        <ContinentMap s={s} act={act} onPick={pickAct} />
      </div>
      <div className="section-head" style={{ margin: 0 }}>
        <h2>
          Act {current.n}: {current.name}
        </h2>
        {open && !current.open && <Badge tone="locked">Preview</Badge>}
        {zones.length > 0 && <ProgressBar value={cleared / zones.length} color={done ? 'var(--success)' : undefined} />}
        {zones.length > 0 && (
          <span className="dim small num">
            {cleared}/{zones.length} bosses defeated
          </span>
        )}
      </div>
      {done && (
        <div className="card act-complete">
          <h3>Act {current.n} complete</h3>
          <p className="muted" style={{ margin: 0 }}>
            {current.outro}{' '}
            {next && actOpen(next.n)
              ? `Act ${next.n}, ${next.name}, is open.`
              : `Act ${current.n + 1} arrives in a future update — until then, farm these areas for better gear, push your skills and fill your stash.`}
          </p>
          {next && actOpen(next.n) && (
            <button className="btn primary" style={{ alignSelf: 'flex-start' }} onClick={() => pickAct(next.n)}>
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
          <div className="card act-map-card">
            <ActMap s={s} act={act} selected={zoneId} onSelect={setZoneId} />
          </div>
          {zone && <AreaCard s={s} z={zone} go={go} />}
        </div>
      )}
    </div>
  );
}

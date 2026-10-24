import { uniqueDef } from '../../data/bases';
import { bossTable, dropTable } from '../../data/drops';
import { materialDef } from '../../data/materials';
import { useState } from 'react';
import { ACTS, MECHANIC_INFO, zonesInAct, type ZoneDef } from '../../data/zones';
import { characterLevel } from '../../engine/character';
import { bossIsNext, startCombat } from '../../engine/combat';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { artUrl, Badge, EmptyState, MatIcon, PageHeader, ProgressBar, sceneStyle, Tabs } from '../components/common';
import { Icon } from '../components/Icon';
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
      <div className={`area-banner ${artUrl(`zones/${z.id}`) ? 'has-art' : ''}`} style={sceneStyle(`zones/${z.id}`)}>
        <span className="area-tier">{z.actBoss ? 'Act boss' : `Area ${n}`}</span>
        {here && (
          <Badge tone="success" live>
            You are here
          </Badge>
        )}
        {beaten && !here && <Badge tone="gold">Cleared</Badge>}
        {!unlocked && (
          <Badge tone="locked">
            <Icon name="lock" size={11} /> Locked
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
        {unlocked ? z.desc : 'Defeat the previous area’s boss to unlock.'}
      </p>
      {unlocked && (
        <>
          <div className="area-facts">
            <span>
              <Icon name="skull" size={12} /> Packs of {z.packSize[0]}–{z.packSize[1]}
            </span>
            <span>
              <Icon name="target" size={12} /> {z.actBoss ? 'Act boss' : 'Boss'}: {z.boss.name} (Lv {z.boss.level})
            </span>
            <span className={risk.cls}>
              <Icon name="bolt" size={12} /> {risk.label} for your level
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

export function CampaignPage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const [act, setAct] = useState(1);
  const current = ACTS.find((a) => a.n === act)!;
  const zones = zonesInAct(act);
  const cleared = zones.filter((z) => s.bossesDefeated.includes(z.id)).length;
  const done = zones.length > 0 && cleared === zones.length;
  return (
    <div className="page">
      <PageHeader title="Campaign">Choose where to fight. Each area's boss unlocks the next one.</PageHeader>
      <Tabs
        value={String(act)}
        onChange={(id) => id !== 'maps' && setAct(Number(id))}
        tabs={[
          ...ACTS.map((a) => ({ id: String(a.n), label: a.open ? `Act ${a.n}` : <>Act {a.n} <Icon name="lock" size={12} /></> })),
          { id: 'maps', label: <>Maps <Icon name="lock" size={12} /></>, disabled: true, title: 'Unlocks after Act 6' },
        ]}
      />
      <div className="section-head" style={{ margin: 0 }}>
        <h2>
          Act {current.n}: {current.name}
        </h2>
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
            The Drowned Queen has fallen. Act {current.n + 1} arrives in a future update — until then, farm the coast for better gear, push your skills and fill your stash.
          </p>
        </div>
      )}
      {!current.open || zones.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Icon name="lock" size={32} color="var(--dim)" />} title="Coming soon">
            This act isn't open yet. Finish Act {current.n - 1} when it arrives.
          </EmptyState>
        </div>
      ) : (
        <div className="area-grid">
          {zones.map((z) => (
            <AreaCard key={z.id} s={s} z={z} go={go} />
          ))}
        </div>
      )}
    </div>
  );
}

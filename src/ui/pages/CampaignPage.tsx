import { useState } from 'react';
import { ZONES, type ZoneDef } from '../../data/zones';
import { characterLevel } from '../../engine/character';
import { bossIsNext, startCombat } from '../../engine/combat';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { ProgressBar } from '../components/common';
import { Icon } from '../components/Icon';
import type { Page } from '../Layout';

const ACTS = [
  { n: 1, name: 'The Drowned Coast', zones: ZONES.map((z) => z.id) },
  { n: 2, name: 'The Burning Steppe', zones: [] as string[] },
  { n: 3, name: 'The City of Saints', zones: [] },
  { n: 4, name: 'The Hollow Peaks', zones: [] },
  { n: 5, name: 'The Sunless Sea', zones: [] },
  { n: 6, name: 'The Shattered Throne', zones: [] },
];

/** How risky an area looks for your current level. */
function danger(s: GameState, z: ZoneDef): { label: string; cls: string } {
  const gap = z.levelRange[0] - characterLevel(s);
  if (gap <= -4) return { label: 'Easy', cls: 'good' };
  if (gap <= 0) return { label: 'Fair', cls: '' };
  if (gap <= 4) return { label: 'Risky', cls: 'warn' };
  return { label: 'Deadly', cls: 'bad' };
}

function AreaCard({ s, z, go }: { s: GameState; z: ZoneDef; go: (p: Page) => void }) {
  const unlocked = s.unlockedZones.includes(z.id);
  const here = s.combat?.zoneId === z.id;
  const kills = s.zoneKills[z.id] ?? 0;
  const risk = danger(s, z);
  return (
    <div className={`card area ${here ? 'current' : ''} ${unlocked ? '' : 'locked'}`} style={{ ['--zone' as string]: z.color }}>
      <div className="area-banner">
        <span className="area-tier">Area {z.tier}</span>
        {here && <span className="chip good">You are here</span>}
      </div>
      <div className="row">
        <h3 style={{ fontSize: 17 }}>{z.name}</h3>
        <span className="spacer" />
        <span className="nav-badge">
          Lv {z.levelRange[0]}–{z.levelRange[1]}
        </span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
        {unlocked ? z.desc : 'Defeat the previous area’s boss to unlock.'}
      </p>
      {unlocked && (
        <>
          <div className="area-facts">
            <span>
              <Icon name="skull" size={12} /> Packs of {z.packSize[0]}–{z.packSize[1]}
            </span>
            <span>
              <Icon name="target" size={12} /> Boss: {z.boss.name} (Lv {z.boss.level})
            </span>
            <span className={risk.cls}>
              <Icon name="bolt" size={12} /> {risk.label} for your level
            </span>
          </div>
          <ProgressBar value={Math.min(1, kills / z.bossEvery)} color={bossIsNext(s, z.id) ? 'var(--life-2)' : z.color} />
          <div className="dim" style={{ fontSize: 11 }}>
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
  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Campaign</h1>
          <p>Choose where to fight. Each area's boss unlocks the next one.</p>
        </div>
      </div>
      <div className="tabs" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        {ACTS.map((a) => (
          <button key={a.n} className={`tab ${act === a.n ? 'active' : ''}`} onClick={() => setAct(a.n)}>
            Act {a.n}
            {a.zones.length === 0 && ' 🔒'}
          </button>
        ))}
        <button className="tab" disabled title="Unlocks after Act 6">
          Maps 🔒
        </button>
      </div>
      <div className="row">
        <h2 style={{ fontSize: 20 }}>
          Act {current.n}: {current.name}
        </h2>
      </div>
      {current.zones.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Icon name="map" size={36} color="var(--dim)" />
          <h3 style={{ marginTop: 10 }}>Coming soon</h3>
          <p className="muted">This act isn't open yet. Finish Act {current.n - 1} when it arrives.</p>
        </div>
      ) : (
        <div className="area-grid">
          {current.zones.map((id) => (
            <AreaCard key={id} s={s} z={ZONES.find((z) => z.id === id)!} go={go} />
          ))}
        </div>
      )}
    </div>
  );
}

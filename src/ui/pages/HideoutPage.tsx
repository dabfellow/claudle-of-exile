import { useMemo } from 'react';
import { STATIONS, type StationId } from '../../data/hideout';
import { SKILLS } from '../../data/skills';
import { canAfford } from '../../engine/bank';
import { nextUpgradeCost, stationLevel, upgradeStation } from '../../engine/hideout';
import { pointsLeft } from '../../engine/passives';
import { deriveStats } from '../../engine/stats';
import { SKILL_IDS } from '../../engine/types';
import { levelForXp, levelProgress } from '../../engine/xp';
import { game, useGame } from '../../game';
import { Cost, fmt, ProgressBar } from '../components/common';
import { Icon } from '../components/Icon';
import type { Page } from '../Layout';

const STATION_ICON: Record<StationId, string> = {
  map_device: 'map',
  stash: 'stash',
  forge: 'forge',
  alchemy_table: 'alchemy',
  bench: 'bench',
  vendor: 'vendor',
};

export function Embers() {
  const embers = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${(i * 53) % 100}%`,
        delay: `${(i * 0.7) % 6}s`,
        dur: `${5 + ((i * 1.3) % 5)}s`,
        drift: `${((i * 37) % 60) - 30}px`,
      })),
    [],
  );
  return (
    <div className="embers">
      {embers.map((e, i) => (
        <span key={i} className="ember" style={{ left: e.left, animationDelay: e.delay, animationDuration: e.dur, ['--drift' as string]: e.drift }} />
      ))}
    </div>
  );
}

export function HideoutPage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const d = deriveStats(s, []);
  const points = pointsLeft(s);

  return (
    <div className="page">
      <div className="card hideout-scene">
        <Embers />
        <div className="page-head" style={{ position: 'relative', marginBottom: 20 }}>
          <div className="grow">
            <h1>Your Hideout</h1>
            <p>A quiet cave above the Mud Flats. Every station you upgrade makes the next expedition easier.</p>
          </div>
          <div className="row wrap">
            <span className="chip">
              <Icon name="heart" size={13} color="var(--life-2)" /> {fmt(d.maxLife)} life
            </span>
            <span className="chip">
              <Icon name="bolt" size={13} color="var(--accent-2)" /> {d.dps.toFixed(1)} dps
            </span>
            {points > 0 && (
              <button className="btn sm primary" onClick={() => go('tree')}>
                {points} passive point{points > 1 ? 's' : ''} to spend
              </button>
            )}
          </div>
        </div>

        <div className="stations">
          {STATIONS.map((st) => {
            const lvl = stationLevel(s, st.id);
            const cost = nextUpgradeCost(s, st.id);
            const affordable = cost ? canAfford(s, cost) : false;
            return (
              <div key={st.id} className="card station" style={{ ['--station' as string]: st.color }} onClick={() => go(st.page as Page)}>
                <div className="row" style={{ gap: 12 }}>
                  <div className="station-icon">
                    <Icon name={STATION_ICON[st.id]} size={26} color={st.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{st.name}</div>
                    <div className="pips" style={{ marginTop: 5 }}>
                      {st.levels.map((_, i) => (
                        <span key={i} className={`pip ${i < lvl ? 'on' : ''}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {st.desc}
                </div>
                <div style={{ fontSize: 12.5 }}>
                  <span className="dim">Now: </span>
                  {st.levels[lvl - 1].effect}
                </div>
                {cost ? (
                  <div className="grid" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ fontSize: 12.5 }}>
                      <span className="dim">Next: </span>
                      <span className="good">{st.levels[lvl].effect}</span>
                    </div>
                    <Cost cost={cost} have={s.bank} />
                    <button className={`btn sm ${affordable ? 'primary' : ''}`} disabled={!affordable} onClick={() => game.act((g, ctx) => upgradeStation(g, ctx, st.id))}>
                      Upgrade to level {lvl + 1}
                    </button>
                  </div>
                ) : (
                  <div className="good" style={{ fontSize: 12.5 }}>
                    Fully upgraded
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Skills</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
          {SKILL_IDS.map((id) => (
            <button key={id} className="mat" style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'stretch', gap: 6 }} onClick={() => go(id)}>
              <div className="row">
                <Icon name={id} size={16} color={SKILLS[id].color} />
                <b>{SKILLS[id].name}</b>
                <span className="spacer" />
                <span className="level-num" style={{ fontSize: 20 }}>
                  {levelForXp(s.skills[id])}
                </span>
              </div>
              <ProgressBar value={levelProgress(s.skills[id])} color={SKILLS[id].color} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

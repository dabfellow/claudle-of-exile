import { useMemo } from 'react';
import { STATIONS, type StationId } from '../../data/hideout';
import { actionDef, SKILLS } from '../../data/skills';
import { canAfford } from '../../engine/bank';
import { nextUpgradeCost, stationLevel, upgradeStation } from '../../engine/hideout';
import { pointsLeft } from '../../engine/passives';
import { deriveStats } from '../../engine/stats';
import { SKILL_IDS } from '../../engine/types';
import { levelOf, progressOf } from '../../engine/xp';
import { game, useGame } from '../../game';
import { Art, artUrl, Badge, Cost, fmt, PageHeader, ProgressBar, sceneStyle } from '../components/common';
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

  const training = s.action?.kind === 'skill' ? actionDef(s.action.actionId).skill : s.action?.kind === 'combat' ? 'combat' : null;

  return (
    <div className="page">
      <div className="card hideout-scene" style={sceneStyle('scenes/hideout')}>
        <Embers />
        <div style={{ position: 'relative', marginBottom: 'var(--s-5)' }}>
          <PageHeader
            title="Your Hideout"
            actions={
              <>
                <span className="chip">
                  <Icon name="heart" size={14} color="var(--life-2)" /> <b>{fmt(d.maxLife)}</b> <span className="dim">life</span>
                </span>
                <span className="chip">
                  <Icon name="bolt" size={14} color="var(--accent-2)" /> <b>{d.dps.toFixed(1)}</b> <span className="dim">dps</span>
                </span>
                {points > 0 && (
                  <button className="btn sm primary" onClick={() => go('tree')}>
                    {points} passive point{points > 1 ? 's' : ''} to spend
                  </button>
                )}
              </>
            }
          >
            A quiet cave above the Mud Flats. Every station you upgrade makes the next expedition easier.
          </PageHeader>
        </div>

        <div className="card-grid stations">
          {STATIONS.map((st) => {
            const lvl = stationLevel(s, st.id);
            const cost = nextUpgradeCost(s, st.id);
            const affordable = cost ? canAfford(s, cost) : false;
            const hasArt = !!artUrl(`stations/${st.id}`);
            return (
              <div key={st.id} className={`card station ${hasArt ? 'has-art' : ''}`} style={{ ['--station' as string]: st.color }} onClick={() => go(st.page as Page)}>
                <Art src={`stations/${st.id}`} alt={st.name} className="station-art" fallback={null} />
                <div className="station-head">
                  {!hasArt && (
                    <div className="station-icon">
                      <Icon name={STATION_ICON[st.id]} size={24} color={st.color} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="station-name">{st.name}</div>
                    <div className="row" style={{ marginTop: 5 }}>
                      <div className="pips">
                        {st.levels.map((_, i) => (
                          <span key={i} className={`pip ${i < lvl ? 'on' : ''}`} />
                        ))}
                      </div>
                      <span className="dim small num">
                        Level {lvl}/{st.levels.length}
                      </span>
                    </div>
                  </div>
                  {!cost && <Badge tone="gold">Max</Badge>}
                </div>
                <p className="station-desc">{st.desc}</p>
                <div className="benefits">
                  <div className="benefit">
                    <span>Now</span>
                    <span>{st.levels[lvl - 1].effect}</span>
                  </div>
                  {cost && (
                    <div className="benefit next">
                      <span>Next</span>
                      <span>{st.levels[lvl].effect}</span>
                    </div>
                  )}
                </div>
                {cost ? (
                  <div className="station-upgrade" onClick={(e) => e.stopPropagation()}>
                    <Cost cost={cost} have={s.bank} />
                    <button className={`btn sm block ${affordable ? 'primary' : ''}`} disabled={!affordable} onClick={() => game.act((g, ctx) => upgradeStation(g, ctx, st.id))}>
                      {affordable ? `Upgrade to level ${lvl + 1}` : 'Not enough materials'}
                    </button>
                  </div>
                ) : (
                  <div className="station-upgrade good small">Fully upgraded</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Skills</div>
        <div className="card-grid" style={{ ['--card-min' as string]: '170px' }}>
          {SKILL_IDS.map((id) => (
            <button key={id} className={`skill-tile ${training === id ? 'running' : ''}`} onClick={() => go(id)}>
              <div className="row">
                <Icon name={id} size={16} color={SKILLS[id].color} />
                <b>{SKILLS[id].name}</b>
                <span className="spacer" />
                <span className="level-num">{levelOf(id, s.skills[id])}</span>
              </div>
              <ProgressBar value={progressOf(id, s.skills[id])} color={SKILLS[id].color} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

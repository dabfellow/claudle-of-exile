import { useMemo } from 'react';
import { STATIONS, type StationId } from '../../data/hideout';
import { actionDef, SKILLS } from '../../data/skills';
import { canAfford } from '../../engine/bank';
import { nextUpgradeCost, stationLevel, upgradeStation } from '../../engine/hideout';
import { pointsLeft } from '../../engine/passives';
import { SKILL_IDS } from '../../engine/types';
import { levelOf, maxLevelOf, progressOf, xpToReach } from '../../engine/xp';
import { game, useGame } from '../../game';
import { Art, artUrl, Badge, Cost, fmt, GameIcon, ProgressBar, sceneStyle, Tooltip } from '../components/common';
import type { Page } from '../Layout';
import { Crest } from '../screens/Screens';
import { classDef } from '../../data/classes';

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
  const points = pointsLeft(s);

  const training = s.action?.kind === 'skill' ? actionDef(s.action.actionId).skill : s.action?.kind === 'combat' ? 'combat' : null;

  return (
    <div className="page">
      <div className="card hideout-scene" style={sceneStyle('scenes/hideout')}>
        <Embers />
        <div className="hideout-head">
          <h1>Hideout</h1>
          <p>A quiet cave above the Mud Flats. Every station you upgrade makes the next expedition easier.</p>
          {points > 0 && (
            <button className="btn sm primary" onClick={() => go('tree')}>
              {points} passive point{points > 1 ? 's' : ''} to spend
            </button>
          )}
        </div>

        <div className="card-grid stations">
          {STATIONS.map((st) => {
            const lvl = stationLevel(s, st.id);
            const cost = nextUpgradeCost(s, st.id);
            const affordable = cost ? canAfford(s, cost) : false;
            const hasArt = !!artUrl(`stations/${st.id}`);
            return (
              <div key={st.id} className={`card station ${hasArt ? 'has-art' : ''} ${cost ? '' : 'maxed'}`} style={{ ['--station' as string]: st.color }} title={st.desc} onClick={() => go(st.page as Page)}>
                {hasArt && <Art src={`stations/${st.id}`} alt={st.name} className="station-art" fallback={null} />}
                <div className="station-head">
                  {!hasArt && (
                    <div className="station-icon">
                      <Art src={`stations/${st.id}`} alt={st.name} size={40} fallback={<GameIcon name={STATION_ICON[st.id]} size={24} color={st.color} />} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row">
                      <span className="station-name">{st.name}</span>
                      <span className="spacer" />
                      {cost ? (
                        <span className="station-lvl num">
                          {lvl}
                          <small>/{st.levels.length}</small>
                        </span>
                      ) : (
                        <Badge tone="gold">Max</Badge>
                      )}
                    </div>
                    <div className="pips">
                      {st.levels.map((_, i) => (
                        <span key={i} className={`pip ${i < lvl ? 'on' : ''}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="station-effect">{st.levels[lvl - 1].effect}</div>
                {cost && (
                  <div className="station-next">
                    <span className="station-next-tag">Lv {lvl + 1}</span> {st.levels[lvl].effect}
                  </div>
                )}
                {cost && (
                  <div className="station-upgrade" onClick={(e) => e.stopPropagation()}>
                    <Cost cost={cost} have={s.bank} />
                    <button className={`btn sm ${affordable ? 'primary' : ''}`} disabled={!affordable} title={affordable ? '' : 'Not enough materials'} onClick={() => game.act((g, ctx) => upgradeStation(g, ctx, st.id))}>
                      Upgrade
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <CharacterBanner training={training === 'combat'} onClick={() => go('combat')} />

      <div className="card">
        <div className="card-title">Skills</div>
        <div className="skill-grid">
          {SKILL_IDS.filter((id) => id !== 'combat').map((id) => {
            const xp = s.skills[id];
            const lvl = levelOf(id, xp);
            const maxed = lvl >= maxLevelOf(id);
            const floor = xpToReach(id, lvl);
            const span = xpToReach(id, lvl + 1) - floor;
            const into = Math.floor(xp - floor);
            const progress = progressOf(id, xp);
            return (
              <Tooltip
                key={id}
                content={
                  <div className="tip">
                    <div className="tip-title">{SKILLS[id].name}</div>
                    {maxed ? (
                      <div className="num">{fmt(Math.floor(xp))} XP · max level</div>
                    ) : (
                      <>
                        <div className="num">
                          {fmt(into)} / {fmt(span)} XP to level {lvl + 1}
                        </div>
                        <div className="dim small num">{fmt(Math.floor(xp))} total XP</div>
                      </>
                    )}
                  </div>
                }
              >
                <button className={`skill-tile ${training === id ? 'running' : ''}`} style={{ ['--skill' as string]: SKILLS[id].color }} onClick={() => go(id)}>
                  <span className="skill-tile-icon">
                    <GameIcon name={id} size={20} color={SKILLS[id].color} />
                  </span>
                  <span className="skill-tile-body">
                    <span className="row">
                      <b className="skill-tile-name">{SKILLS[id].name}</b>
                      {training === id && <Badge tone="success" live>Training</Badge>}
                      <span className="spacer" />
                      <span className="level-num">
                        <small>Lv</small>
                        {lvl}
                      </span>
                    </span>
                    <ProgressBar value={progress} color={SKILLS[id].color} smooth className="skill-tile-bar" />
                    <span className="skill-tile-meta dim small num">{maxed ? 'Max level' : `${Math.floor(progress * 100)}% to level ${lvl + 1}`}</span>
                  </span>
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The character's own level, set apart from the trade skills. */
function CharacterBanner({ training, onClick }: { training: boolean; onClick: () => void }) {
  const s = useGame();
  const xp = s.skills.combat;
  const lvl = levelOf('combat', xp);
  const floor = xpToReach('combat', lvl);
  const span = xpToReach('combat', lvl + 1) - floor;
  const progress = progressOf('combat', xp);
  const c = classDef(s.character.classId);
  return (
    <button className={`card char-banner ${training ? 'running' : ''}`} style={{ ['--class' as string]: c.color }} onClick={onClick}>
      <Crest classId={s.character.classId} size={72} />
      <span className="char-banner-body">
        <span className="char-banner-kicker">{c.name}</span>
        <span className="char-banner-name">{s.character.name}</span>
        <ProgressBar value={progress} color="linear-gradient(90deg, var(--accent), var(--accent-2))" smooth size="md" label={`${fmt(Math.floor(xp - floor))} / ${fmt(span)} XP`} />
        <span className="dim small num">
          {Math.floor(progress * 100)}% to level {lvl + 1}
          {training && ' · fighting now'}
        </span>
      </span>
      <span className="char-banner-level">
        <small>Level</small>
        <b className="num">{lvl}</b>
      </span>
    </button>
  );
}

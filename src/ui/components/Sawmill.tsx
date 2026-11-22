import { useState } from 'react';
import { materialDef } from '../../data/materials';
import { actionsFor } from '../../data/skills';
import { recipeMaterialCount } from '../../engine/bank';
import { masteryLevel } from '../../engine/skillingMastery';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import { game, useGame } from '../../game';
import { Cost, fmt, MatIcon, ProgressBar } from './common';
import { MasteryProgress } from './MasteryProgress';
import { LockedBadge, SkillIntro } from './SkillHelp';
import './giants.css';

/** Woodcrafting's Sawmill: saw logs into planks, and refine heartwood fragments. */
export function Sawmill() {
  const s = useGame();
  const [showLocked, setShowLocked] = useState(false);
  const level = skillLevel(s, 'woodcrafting');
  const d = deriveStats(s);
  const runningAction = s.action?.kind === 'skill' ? s.action : null;

  const all = actionsFor('woodcrafting').filter(
    (a) => a.woodcutting?.mode === 'sawmill' && (!a.batchMastery || masteryLevel(s, `task.${a.batchOf}`) >= a.batchMastery),
  );
  const open = all.filter((a) => a.level <= level);
  const locked = all.filter((a) => a.level > level);
  const shownLocked = showLocked ? locked : locked.slice(0, 2);

  return (
    <div className="sawmill-view">
      <SkillIntro step="Saw logs into planks">
        Logs from Woodcutting become <b>planks</b> for your bench, your jigs and the Hideout. Heartwood fragments refine into <b>Ancient Heartwood</b>.
      </SkillIntro>
      <div className="sawmill-grid">
        {[...open, ...shownLocked].map((a) => {
          const [outputId, outputQty] = Object.entries(a.outputs ?? a.protectedOutputs ?? {})[0] ?? ['ash_plank', 1];
          const levelLocked = a.level > level;
          const blocker = actionBlocker(s, a);
          const active = runningAction?.actionId === a.id;
          const interval = actionIntervalMs(s, a, d);
          return (
            <article key={a.id} className={`card sawmill-card ${active ? 'running' : ''} ${levelLocked ? 'locked' : ''}`} data-tut={`action-${a.id}`}>
              <div className="sawmill-card-head">
                <div className="sawmill-card-icon"><MatIcon id={outputId} size={22} /></div>
                <div className="sawmill-card-title">
                  <b>{a.name}</b>
                  <span className="dim small num">Makes {fmt(outputQty)} {materialDef(outputId).name} · {(interval / 1000).toFixed(1)}s</span>
                </div>
                {levelLocked ? (
                  <LockedBadge level={a.level} reason={`Requires Woodcrafting level ${a.level}`} />
                ) : active ? (
                  <button type="button" className="btn sm" onClick={() => game.act(stopAction)}>Stop</button>
                ) : (
                  <button
                    type="button"
                    className={`btn sm ${blocker ? '' : 'primary'}`}
                    disabled={!!blocker}
                    title={blocker ?? undefined}
                    onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, a.id))}
                  >
                    {blocker === 'Missing materials' ? 'Need logs' : blocker ? 'Locked' : 'Saw'}
                  </button>
                )}
              </div>
              {a.inputs && (
                <div className="sawmill-inputs">
                  <Cost cost={a.inputs} have={s.storage.bank} />
                  <span className="dim small num">
                    You have {Object.keys(a.inputs).map((id) => `${fmt(recipeMaterialCount(s.storage.bank, id))} ${materialDef(id).name}`).join(' · ')}
                  </span>
                </div>
              )}
              {active && runningAction && <ProgressBar value={runningAction.progress / interval} color={a.color} />}
              {!levelLocked && <MasteryProgress s={s} mastery={a.mastery} compact />}
            </article>
          );
        })}
      </div>
      {locked.length > 2 && (
        <button type="button" className="btn sm ghost" onClick={() => setShowLocked((v) => !v)}>
          {showLocked ? 'Hide locked' : `Show ${locked.length - 2} more locked`}
        </button>
      )}
    </div>
  );
}

import type { MasterySpec } from '../../data/skillingMastery';
import { materialDef } from '../../data/materials';
import { ACTIONS } from '../../data/skills';
import {
  MASTERY_CONSERVE_MAX,
  MASTERY_MAX_LEVEL,
  MASTERY_SPEED_MAX,
  MASTERY_YIELD_MAX,
  masteryLevel,
  masteryPractice,
  masteryProgress,
  masteryThreshold,
  unlockedMilestones,
} from '../../engine/skillingMastery';
import type { GameState } from '../../engine/types';
import { fmt, ProgressBar, Tooltip } from './common';

const pct = (n: number) => `${n.toFixed(1).replace(/\.0$/, '')}%`;

export function MasteryTip({ s, mastery }: { s: GameState; mastery: MasterySpec }) {
  const level = masteryLevel(s, mastery.id);
  const practice = masteryPractice(s, mastery.id);
  const progress = masteryProgress(s, mastery.id);
  const start = masteryThreshold(level);
  const end = level >= MASTERY_MAX_LEVEL ? start : masteryThreshold(level + 1);
  const within = level >= MASTERY_MAX_LEVEL ? 1 : (practice - start) / Math.max(1, end - start);
  const isMax = level >= MASTERY_MAX_LEVEL;

  const speedPct = pct(MASTERY_SPEED_MAX * progress);
  const yieldPct = mastery.profile === 'gathering' ? pct(MASTERY_YIELD_MAX * 100 * progress) : null;
  const conservePct = mastery.profile === 'production' ? pct(MASTERY_CONSERVE_MAX * 100 * progress) : null;

  return (
    <div className="tip mastery-tip">
      <div className="mastery-tip-head">
        <div>
          <div className="mastery-tip-title">{mastery.name}</div>
          <div className="dim small">
            {isMax
              ? 'Max Level Reached'
              : `${fmt(Math.floor(practice - start))} / ${fmt(Math.floor(end - start))} practice (${pct(within * 100)})`}
          </div>
        </div>
        <div className="mastery-tip-level">
          Lv {level} <span className="dim">/ {MASTERY_MAX_LEVEL}</span>
        </div>
      </div>

      <div className="mastery-tip-section">
        <div className="mastery-tip-heading">Baseline Bonuses (Lv {level})</div>
        <div className="mastery-tip-bonuses">
          <div className="mastery-tip-bonus-line">
            <span style={{ color: 'var(--accent-2)', fontWeight: 600 }}>+{speedPct}</span> action speed
          </div>
          {yieldPct && (
            <div className="mastery-tip-bonus-line">
              <span style={{ color: 'var(--accent-2)', fontWeight: 600 }}>+{yieldPct}</span> ordinary yield
            </div>
          )}
          {conservePct && (
            <div className="mastery-tip-bonus-line">
              <span style={{ color: 'var(--accent-2)', fontWeight: 600 }}>+{conservePct}</span> ordinary input conservation
            </div>
          )}
        </div>
        {mastery.profile === 'production' && mastery.ordinaryInputs && mastery.ordinaryInputs.length > 0 && (
          <div className="dim small" style={{ marginTop: 2, paddingLeft: 6 }}>
            Eligible inputs: {mastery.ordinaryInputs.map((id) => materialDef(id).name).join(', ')}
          </div>
        )}
      </div>

      {ACTIONS.filter((a) => a.batchMastery && a.mastery?.id === mastery.id).map((a) => (
        <div key={a.id} className="mastery-tip-section">
          <div className="mastery-tip-heading">Mastery {a.batchMastery} Reward</div>
          <div className={`mastery-tip-milestone ${level >= a.batchMastery! ? 'unlocked' : 'locked'}`}>
            <b>{a.name}</b> · {level >= a.batchMastery! ? 'Unlocked' : 'Locked'}
            <div className="mastery-tip-milestone-desc">Unlocks a {a.batch}× batch craft with full costs and the single craft’s mastery rate.</div>
          </div>
        </div>
      ))}

      {(mastery.milestones?.length ?? 0) > 0 && (
        <div className="mastery-tip-section">
          <div className="mastery-tip-heading">Milestone Perks</div>
          <div className="mastery-tip-milestones">
            {mastery.milestones.map((m) => {
              const active = level >= m.level;
              return (
                <div
                  key={m.id}
                  className={`mastery-tip-milestone ${active ? 'unlocked' : 'locked'} ${m.scope === 'global' ? 'global' : ''}`}
                >
                  <div className="mastery-tip-milestone-top">
                    <span className={`mastery-pip ${active ? 'unlocked' : ''} ${m.scope === 'global' ? 'global' : ''}`}>
                      {m.level}
                    </span>
                    <span className="mastery-tip-milestone-name">{m.name}</span>
                    <span className={`mastery-tip-scope ${m.scope}`}>
                      {m.scope === 'global' ? 'Global' : 'Task'}
                    </span>
                    <span className="spacer" />
                    <span className={`mastery-tip-status ${active ? 'unlocked' : 'locked'}`}>
                      {active ? '✦ Unlocked' : 'Locked'}
                    </span>
                  </div>
                  <div className="mastery-tip-milestone-desc">{m.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function MasteryProgress({ s, mastery, compact = false }: { s: GameState; mastery: MasterySpec | undefined; compact?: boolean }) {
  if (!mastery) return null;
  const level = masteryLevel(s, mastery.id);
  const practice = masteryPractice(s, mastery.id);
  const progress = masteryProgress(s, mastery.id);
  const start = masteryThreshold(level);
  const end = level >= MASTERY_MAX_LEVEL ? start : masteryThreshold(level + 1);
  const within = level >= MASTERY_MAX_LEVEL ? 1 : (practice - start) / Math.max(1, end - start);
  const unlocked = unlockedMilestones(s, mastery);
  const bonuses = [
    `${pct(MASTERY_SPEED_MAX * progress)} action speed`,
    mastery.profile === 'gathering' ? `${pct(MASTERY_YIELD_MAX * 100 * progress)} ordinary yield` : null,
    mastery.profile === 'production' ? `${pct(MASTERY_CONSERVE_MAX * 100 * progress)} ordinary conservation` : null,
  ].filter(Boolean).join(', ');

  return (
    <Tooltip content={<MasteryTip s={s} mastery={mastery} />} style={{ display: 'block', width: '100%' }}>
      <div className={`skilling-mastery ${compact ? 'compact' : ''}`}>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="skilling-mastery-label">Mastery {level}</span>
          {mastery.milestones?.length > 0 && (
            <div className="mastery-milestone-pips">
              {mastery.milestones.map((m) => {
                const active = level >= m.level;
                return (
                  <span
                    key={m.id}
                    className={`mastery-pip ${active ? 'unlocked' : ''} ${m.scope === 'global' ? 'global' : ''}`}
                  >
                    {m.level}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <ProgressBar value={within} color="var(--accent-2)" />
        {!compact && (
          <>
            <span className="dim small">{mastery.name} · {bonuses}</span>
            {unlocked.length > 0 && (
              <div className="mastery-active-perks">
                {unlocked.map((m) => (
                  <span key={m.id}>
                    ✦ {m.name}
                  </span>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Tooltip>
  );
}

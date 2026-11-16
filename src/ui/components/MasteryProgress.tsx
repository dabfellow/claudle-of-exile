import type { MasterySpec } from '../../data/skillingMastery';
import { materialDef } from '../../data/materials';
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
import { ProgressBar } from './common';

const pct = (n: number) => `${n.toFixed(1).replace(/\.0$/, '')}%`;

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
  const protectedText = mastery.profile === 'production' && mastery.ordinaryInputs?.length
    ? ` Eligible ingredients: ${mastery.ordinaryInputs.map((id) => materialDef(id).name).join(', ')}.`
    : '';
  const milestoneDescriptions = (mastery.milestones ?? []).map((m) => `[Lv ${m.level} ${m.name}]: ${m.desc}`).join(' | ');
  const title = `${mastery.name} (Lv ${level}). Baseline: ${bonuses}.${protectedText} Milestones: ${milestoneDescriptions}`;

  return (
    <div className={`skilling-mastery ${compact ? 'compact' : ''}`} title={title}>
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
                  title={`Lv ${m.level} ${m.name} (${m.scope === 'global' ? 'Global Perk' : 'Task Perk'}): ${m.desc}`}
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
                <span key={m.id} title={m.desc}>
                  ✦ {m.name}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

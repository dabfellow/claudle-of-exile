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
  const bonuses = [
    `${pct(MASTERY_SPEED_MAX * progress)} action speed`,
    mastery.profile === 'gathering' ? `${pct(MASTERY_YIELD_MAX * 100 * progress)} expected ordinary yield` : null,
    mastery.profile === 'production' ? `${pct(MASTERY_CONSERVE_MAX * 100 * progress)} expected ordinary ingredient conservation` : null,
  ].filter(Boolean).join(', ');
  const protectedText = mastery.profile === 'production' && mastery.ordinaryInputs?.length
    ? ` Eligible ingredients: ${mastery.ordinaryInputs.map((id) => materialDef(id).name).join(', ')}.`
    : '';
  const title = `${mastery.name}. Mastery practice is nominal completed work, separate from skill XP. Current bonuses: ${bonuses}.${protectedText} Rare finds, valuable components, item quality and unlocks are never improved by mastery.`;
  return (
    <div className={`skilling-mastery ${compact ? 'compact' : ''}`} title={title}>
      <span className="skilling-mastery-label">Mastery {level}</span>
      <ProgressBar value={within} color="var(--accent-2)" />
      {!compact && <span className="dim small">{mastery.name} · {bonuses}</span>}
    </div>
  );
}

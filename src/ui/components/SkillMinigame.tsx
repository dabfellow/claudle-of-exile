import { useState } from 'react';
import { actionDef, SKILLS } from '../../data/skills';
import { focusMult, focusOf, hasMinigame, MAX_FOCUS_SPEED, minigameSwing, overflowOf, type SwingResult } from '../../engine/minigame';
import type { GameState, SkillId } from '../../engine/types';
import { game, useGame } from '../../game';
import { ProgressBar } from './common';
import { SkillGame } from './minigames';

const HOW_TO: Partial<Record<SkillId, string>> = {
  mining: 'Hold to charge your pick, then release in the bright band. Too long and it overcharges.',
  woodcutting: 'Swing while the marker is in the bright band.',
  harvesting: 'Click herbs as they pop up, before they wilt.',
  thieving: 'Watch the pins light up, then click them back in the same order.',
  archaeology: 'Brush the soil off the find, and keep the brush away from cracked stones.',
  smithing: 'Strike the anvil just as the ring lands on it.',
  alchemy: 'Hold to heat and let go to cool. Keep the needle in the bright band.',
  gemcutting: 'Cut the facets in order, 1 to 3, before the stone settles.',
  runecarving: 'Drag from the circle along the whole stroke without leaving the line.',
};

const RESULT_TEXT: Record<SwingResult, string> = { hit: 'Clean hit', weak: 'Weak hit', miss: 'Miss' };

function runningSkill(s: GameState): SkillId | null {
  if (s.action?.kind === 'heist') return 'thieving';
  return s.action?.kind === 'skill' ? actionDef(s.action.actionId).skill : null;
}

/** The manual side of a skill: play it for Focus, or leave it running. */
export function SkillMinigame({ skill }: { skill: SkillId }) {
  const s = useGame();
  const [result, setResult] = useState<{ id: number; r: SwingResult } | null>(null);
  if (!hasMinigame(skill)) return null;
  if (runningSkill(s) !== skill) return <div className="callout skill-note">Start an activity and play it by hand to work up to {Math.round(MAX_FOCUS_SPEED * 100)}% faster than leaving it to idle.</div>;

  const onSwing = (r: SwingResult) => {
    game.act((st) => minigameSwing(st, r));
    setResult({ id: Math.random(), r });
  };
  const color = SKILLS[skill].color;
  const matId = s.action?.kind === 'skill' ? Object.keys(actionDef(s.action.actionId).outputs ?? {})[0] : undefined;
  return (
    <div className="card minigame">
      <div className="card-title">
        Focus
        <span className="grow" />
        <span className="card-hint">{HOW_TO[skill]}</span>
      </div>
      <SkillGame skill={skill} matId={matId} onSwing={onSwing} />
      <div className="row minigame-foot">
        <div className="minigame-bars grow">
          <ProgressBar value={focusOf(s)} color={color} />
          <ProgressBar value={overflowOf(s)} color="var(--accent)" className="minigame-overflow" />
        </div>
        <span className="num small">+{Math.round((focusMult(s) - 1) * 100)}% speed</span>
        {result && (
          <span key={result.id} className={`minigame-result ${result.r}`}>
            {RESULT_TEXT[result.r]}
          </span>
        )}
      </div>
    </div>
  );
}

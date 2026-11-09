import { useState } from 'react';
import { actionDef, SKILLS } from '../../data/skills';
import { doubleReady, focusMult, focusOf, hasMinigame, MAX_FOCUS_SPEED, minigameSwing, overflowOf, type SwingResult } from '../../engine/minigame';
import type { GameState, SkillId } from '../../engine/types';
import { game, useGame } from '../../game';
import { ProgressBar } from './common';
import { SkillGame } from './minigames';

const HOW_TO: Partial<Record<SkillId, string>> = {
  mining: 'Hold to charge your pick, then release in the bright band, or its gold middle for a double. Too long and it overcharges.',
  woodcutting: 'Swing while the marker is in the bright band, or its gold middle for a double.',
  harvesting: 'Tap herbs as they pop up, before they wilt. Pick one while it glows gold for a double.',
  thieving: 'Watch the pins light up, then tap them back in the same order. Finish while the timer is in the gold for a double.',
  archaeology: 'Brush the soil off the find, and keep the brush away from cracked stones. Clear it while the timer is in the gold for a double.',
  smithing: 'Strike the anvil just as the ring lands on it. Dead on is a double.',
  alchemy: 'Hold to heat and let go to cool. Keep the marker in the bright band, mostly in its gold middle for a double.',
  gemcutting: 'Cut the facets in order, 1 to 3, before the stone settles. Finish while the timer is in the gold for a double.',
  runecarving: 'Drag from the circle along the whole stroke without leaving the line. Hug the gold middle for a double.',
  cooking: 'Three pots are heating up. Stir each one in the bright band, or its gold middle for a double, before it boils over.',
  cartography: 'A landmark is hidden in the fog. Each sounding shows how many steps away it is: find it within 5, or within 3 for a double.',
};

/** Said once under every game: what gold means. */
const DOUBLE_HINT = 'Gold is the double zone: hit it and this action makes twice as much next time it finishes.';

const RESULT_TEXT: Record<SwingResult, string> = { double: 'Double!', hit: 'Clean hit', weak: 'Weak hit', miss: 'Miss' };

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
        <span className={`minigame-double ${doubleReady(s) ? 'ready' : ''}`} title={DOUBLE_HINT}>
          ×2
        </span>
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

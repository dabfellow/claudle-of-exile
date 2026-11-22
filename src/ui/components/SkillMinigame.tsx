import { useState } from 'react';
import { actionDef, SKILLS } from '../../data/skills';
import { doubleReady, focusMult, focusOf, hasMinigame, maxFocusSpeed, minigameSwing, overflowOf, type SwingResult } from '../../engine/minigame';
import { splitSwing } from '../../engine/woodcutting';
import type { GameState, SkillId } from '../../engine/types';
import { game, useGame } from '../../game';
import { ProgressBar } from './common';
import { SkillGame } from './minigames';

const HOW_TO: Partial<Record<SkillId, string>> = {
  woodcutting: 'Split the log: tap where the axe lands. Within 3% of an even split is a double, within 7% a hit, within 15% weak.',
  harvesting: 'Tap herbs as they pop up, before they wilt. Pick one while it glows gold for a double.',
  thieving: 'Marks: tap while the target\'s back is turned, in the middle of that window for a double. Heist rooms: watch the pins light up, then tap them back in order.',
  agility: 'Jump while the marker is in the bright band, or its gold middle for a double.',
  archaeology: 'Tap the soil to brush the find free. Squares marked with a hairline are fragile and chip the find: a clean find is a double, one chip a hit, two weak, three a miss.',
  woodcrafting: 'Trace the marked line from start to finish in four seconds. A close trace earns a double.',
  alchemy: 'Hold to heat and let go to cool. Keep the marker in the bright band, mostly in its gold middle for a double.',
  gemcutting: 'Tap when the turning facet line meets the fixed guide. An exact cut earns a double.',
  runecarving: 'Drag from the circle along the whole stroke without leaving the line. Hug the gold middle for a double.',
  cooking: 'Three pots are heating up. Stir each one in the bright band, or its gold middle for a double, before it boils over.',
  astrology: 'Turn the focus ring until the star is as sharp as you can get it, then let go. Spot on is a double.',
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
  if (skill === 'mining' || skill === 'smelting' || skill === 'smithing') return null;
  if (!hasMinigame(skill)) return null;
  if (runningSkill(s) !== skill) return null;

  const onSwing = (r: SwingResult) => {
    game.act((st, ctx) => (skill === 'woodcutting' ? splitSwing(st, ctx, r) : minigameSwing(st, r)));
    setResult({ id: Math.random(), r });
  };
  const color = SKILLS[skill].color;
  const action = s.action?.kind === 'skill' ? actionDef(s.action.actionId) : undefined;
  const matId = Object.keys(action?.outputs ?? {})[0];
  return (
    <div className="card minigame">
      <div className="card-title">
        Focus
        <span className="grow" />
        <span className="card-hint">{HOW_TO[skill]}</span>
      </div>
      <SkillGame skill={skill} matId={matId} markLevel={skill === 'thieving' && s.action?.kind === 'skill' ? actionDef(s.action.actionId).level : undefined} onSwing={onSwing} />
      <div className="row minigame-foot">
        <div className="minigame-bars grow">
          <ProgressBar value={focusOf(s)} color={color} />
          <ProgressBar value={overflowOf(s)} color="var(--accent)" className="minigame-overflow" />
        </div>
        {(skill !== 'woodcrafting' || !action?.purpose) && <span className={`minigame-double ${doubleReady(s) ? 'ready' : ''}`} title={DOUBLE_HINT}>
          ×2
        </span>}
        <span
          className="num small"
          title={`Max focus speed: +${(maxFocusSpeed(s, skill) * 100).toFixed(2).replace(/\.?0+$/, '')}% (+0.01% per mastery level in ${SKILLS[skill].name})`}
        >
          +{Math.round((focusMult(s, skill) - 1) * 100)}% speed
        </span>
        {result && (
          <span key={result.id} className={`minigame-result ${result.r}`}>
            {RESULT_TEXT[result.r]}
          </span>
        )}
      </div>
    </div>
  );
}

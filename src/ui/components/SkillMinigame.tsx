import { useState } from 'react';
import { actionDef, SKILLS } from '../../data/skills';
import { focusHoldSeconds, focusMult, focusOf, focusRemainingSeconds, hasMinigame, maxFocusSpeed, minigameSwing, overflowOf, type SwingResult } from '../../engine/minigame';
import { splitSwing } from '../../engine/woodcutting';
import type { GameState, SkillId } from '../../engine/types';
import { game, useGame } from '../../game';
import { ProgressBar } from './common';
import { SkillGame } from './minigames';
import { WoodcarvingGame } from './WoodcarvingGame';

const HOW_TO: Partial<Record<SkillId, string>> = {
  woodcutting: 'Swing the axe down to split each log into two halves that weigh the same. Within 3% of even is a double, 7% a hit, 15% weak.',
  harvesting: 'Tap lit soil beds quickly to fertilise them before they fade. Tap while glowing gold for a double.',
  thieving: 'Marks: tap rapidly while their back is turned to fill Focus; long flurries give double Focus — pause when they look back! Focus speed holds for nearly a minute. Heist rooms: tap the lit pins in order.',
  agility: 'Jump while the marker is in the bright band, or its gold middle for a double.',
  archaeology: 'Brush soil squares to uncover the find. Avoid hairline cracks: 0 chips is a double, 1 a hit, 2 weak, 3+ a miss.',
  woodcrafting: 'Follow the grain in one continuous stroke. An intact shaving earns double Focus.',
  alchemy: 'Hold to pour into the vial and release right on the target line. Dead on is a double.',
  gemcutting: 'Tap when the turning facet line meets the fixed guide. An exact cut earns a double.',
  runecarving: 'Drag from the circle along the whole stroke without leaving the line. Hug the gold middle for a double.',
  cooking: 'Three pots are heating up. Stir each one in the bright band, or its gold middle for a double, before it boils over.',
  astrology: 'Turn the brass ring until the star in the centre sharpens, then release to lock focus.',
  cartography: 'Tap when the vertical line crosses the landmark, then tap when the horizontal line crosses it. Hitting the gold centre earns a double.',
};

/** Said once under every game: what gold means. */
const DOUBLE_HINT = 'Gold is the double zone: hit it for twice the Focus.';

const RESULT_TEXT: Record<SwingResult, string> = { double: 'Double!', hit: 'Clean hit', weak: 'Weak hit', miss: 'Miss' };

function runningSkill(s: GameState): SkillId | null {
  if (s.action?.kind === 'heist') return 'thieving';
  return s.action?.kind === 'skill' ? actionDef(s.action.actionId).skill : null;
}

/** The manual side of a skill: play it for Focus, or leave it running. */
export function SkillMinigame({ skill, portrait, targetName, showBlank }: { skill: SkillId; portrait?: string; targetName?: string; showBlank?: boolean }) {
  const s = useGame();
  const [result, setResult] = useState<{ id: number; r: SwingResult } | null>(null);
  if (skill === 'mining' || skill === 'smelting' || skill === 'smithing') return null;
  if (!hasMinigame(skill)) return null;
  if (runningSkill(s) !== skill) return skill === 'woodcrafting' && showBlank ? <WoodcarvingGame /> : null;

  const onSwing = (r: SwingResult) => {
    game.act((st, ctx) => (skill === 'woodcutting' ? splitSwing(st, ctx, r) : minigameSwing(st, r)));
    setResult({ id: Math.random(), r });
  };
  const color = SKILLS[skill].color;
  const action = s.action?.kind === 'skill' ? actionDef(s.action.actionId) : undefined;
  const matId = Object.keys(action?.outputs ?? {})[0];
  const hold = skill === 'thieving' ? focusHoldSeconds(s, skill) : 0;
  const rem = skill === 'thieving' ? focusRemainingSeconds(s, skill) : 0;
  const timerText = skill === 'thieving' && rem > 0
    ? (hold > 0.5 ? `${Math.ceil(hold)}s full · ${Math.ceil(rem)}s left` : `${Math.ceil(rem)}s left`)
    : null;
  return (
    <div className={skill === 'woodcrafting' ? 'card minigame woodcarving-focus' : 'card minigame'}>
      <div className="card-title">
        {skill === 'woodcrafting' ? 'One Long Curl' : 'Focus'}
        <span className="grow" />
        <span className="card-hint">{HOW_TO[skill]}</span>
      </div>
      {skill === 'woodcrafting' ? <WoodcarvingGame key={action?.id} onSwing={onSwing} /> : <SkillGame
        skill={skill}
        matId={matId}
        markLevel={skill === 'thieving' && s.action?.kind === 'skill' ? actionDef(s.action.actionId).level : undefined}
        portrait={portrait}
        targetName={targetName}
        onSwing={onSwing}
      />}
      <div className="row minigame-foot">
        <div className="minigame-bars grow">
          <ProgressBar value={focusOf(s)} color={color} />
          <ProgressBar value={overflowOf(s)} color="var(--accent)" className="minigame-overflow" />
        </div>
        <span
          className="num small"
          title={`${DOUBLE_HINT} Max focus speed: +${(maxFocusSpeed(s, skill) * 100).toFixed(2).replace(/\.?0+$/, '')}% (+0.01% per mastery level in ${SKILLS[skill].name})`}
        >
          +{Math.round((focusMult(s, skill) - 1) * 100)}% speed
        </span>
        {timerText && (
          <span className="num small minigame-timer" title="Full-speed Focus hold and total time remaining">
            {timerText}
          </span>
        )}
        {result && (
          <span key={result.id} className={`minigame-result ${result.r}`}>
            {RESULT_TEXT[result.r]}
          </span>
        )}
      </div>
    </div>
  );
}

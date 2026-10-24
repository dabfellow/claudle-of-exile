import { useEffect } from 'react';
import { GUIDE_NAME, TUTORIAL_STEPS } from '../../data/tutorial';
import { currentStep, skipTutorial } from '../../engine/tutorial';
import { game, useGame } from '../../game';
import { ProgressBar, Art, GameIcon } from './common';

/** Pulses every element whose data-tut id the current step wants highlighted. */
function useHighlights(ids: string[], enabled: boolean) {
  const key = ids.join(' ');
  useEffect(() => {
    if (!enabled) return;
    const els = document.querySelectorAll<HTMLElement | SVGElement>('[data-tut]');
    els.forEach((el) => el.classList.toggle('tut-hint', ids.includes(el.dataset.tut ?? '')));
  });
  useEffect(
    () => () => {
      if (enabled) document.querySelectorAll('.tut-hint').forEach((el) => el.classList.remove('tut-hint'));
    },
    [key, enabled],
  );
}

export function QuestTracker({ floating }: { floating?: boolean }) {
  const s = useGame();
  const step = game.showIntro ? null : currentStep(s);
  // both copies render (feed + floating for narrow screens); only the feed copy drives highlights
  useHighlights(step ? step.highlight : [], !floating);
  if (!step) return null;
  const index = s.tutorial.step;

  return (
    <div className={`quest ${floating ? 'floating' : ''}`} key={index}>
      <div className="row" style={{ gap: 10 }}>
        <span className="quest-portrait">
          <Art src="portraits/brannoc" alt={GUIDE_NAME} cover fallback={<GameIcon name="map" size={16} color="var(--accent-2)" />} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="quest-step">
            Quest {index + 1} / {TUTORIAL_STEPS.length}
          </div>
          <div className="quest-title">{step.title}</div>
        </div>
        <button
          className="btn ghost sm"
          title="Skip the tutorial"
          onClick={() => {
            if (confirm('Skip the rest of the tutorial? You will miss its rewards.')) game.act((st) => skipTutorial(st));
          }}
        >
          Skip
        </button>
      </div>
      <p className="quest-npc">
        <b>{GUIDE_NAME}:</b> “{step.npc}”
      </p>
      <div className="quest-objective">
        <span>{step.objective}</span>
        {step.target > 1 && (
          <span className="num muted">
            {s.tutorial.progress}/{step.target}
          </span>
        )}
      </div>
      {step.target > 1 && <ProgressBar value={s.tutorial.progress / step.target} color="var(--accent)" smooth />}
      {step.rewardText && <div className="quest-reward">Reward: {step.rewardText}</div>}
    </div>
  );
}

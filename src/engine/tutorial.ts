import { TUTORIAL_STEPS, type TutorialStep } from '../data/tutorial';
import { addBank } from './bank';
import type { Ctx } from './context';
import type { GameEvent, GameState } from './types';

export function currentStep(s: GameState): TutorialStep | null {
  if (s.tutorial.done) return null;
  return TUTORIAL_STEPS[s.tutorial.step] ?? null;
}

function complete(s: GameState, ctx: Ctx, step: TutorialStep): void {
  for (const [id, n] of Object.entries(step.reward)) addBank(s, id, n);
  const finished = s.tutorial.step;
  s.tutorial.step += 1;
  s.tutorial.progress = 0;
  passSettled(s);
  if (s.tutorial.step >= TUTORIAL_STEPS.length) s.tutorial.done = true;
  ctx.emit({ t: 'tutorialStep', step: finished, done: s.tutorial.done });
}

/** Steps with nothing left to do are passed over without their rewards. */
function passSettled(s: GameState): void {
  while (currentStep(s)?.done?.(s)) {
    s.tutorial.step += 1;
    s.tutorial.progress = 0;
  }
}

function advance(s: GameState, ctx: Ctx, amount: number): void {
  const step = currentStep(s);
  if (!step || amount <= 0) return;
  s.tutorial.progress = Math.min(step.target, s.tutorial.progress + amount);
  if (s.tutorial.progress >= step.target) complete(s, ctx, step);
}

export function tutorialEvent(s: GameState, ctx: Ctx, e: GameEvent): void {
  const step = currentStep(s);
  if (!step?.match) return;
  advance(s, ctx, step.match(e, s));
}

export function tutorialPage(s: GameState, ctx: Ctx, page: string): void {
  passSettled(s); // the account may have built the bench on another character since this one last played
  const step = currentStep(s);
  if (step?.visitPage === page) advance(s, ctx, 1);
}

export function skipTutorial(s: GameState): void {
  s.tutorial.done = true;
  s.tutorial.skipped = true;
}

/** Wrap a ctx so every emitted event also drives the tutorial. */
export function withTutorial(ctx: Ctx, getState: () => GameState): Ctx {
  const wrapped: Ctx = {
    get rng() {
      return ctx.rng;
    },
    get now() {
      return ctx.now;
    },
    get offline() {
      return ctx.offline;
    },
    emit(e) {
      ctx.emit(e);
      tutorialEvent(getState(), wrapped, e);
    },
  };
  return wrapped;
}

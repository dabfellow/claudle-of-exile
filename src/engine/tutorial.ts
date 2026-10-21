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
  s.tutorial.step += 1;
  s.tutorial.progress = 0;
  if (s.tutorial.step >= TUTORIAL_STEPS.length) s.tutorial.done = true;
  ctx.emit({ t: 'tutorialStep', step: s.tutorial.step - 1, done: s.tutorial.done });
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
  advance(s, ctx, step.match(e));
}

export function tutorialPage(s: GameState, ctx: Ctx, page: string): void {
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
    emit(e) {
      ctx.emit(e);
      tutorialEvent(getState(), wrapped, e);
    },
  };
  return wrapped;
}

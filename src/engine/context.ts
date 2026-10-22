import type { GameEvent } from './types';
import type { Rng } from './rng';

/** Everything the engine needs from the outside world. */
export interface Ctx {
  rng: Rng;
  emit(e: GameEvent): void;
  /** wall-clock time in ms (Date.now() in the app, fixed in tests) */
  now: number;
  /** true while simulating time spent away */
  offline?: boolean;
}

export function makeCtx(rng: Rng, now = 0, sink: GameEvent[] = []): Ctx & { events: GameEvent[] } {
  return { rng, now, events: sink, emit: (e) => sink.push(e) };
}

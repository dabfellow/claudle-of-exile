import { actOpen, ZONES } from '../data/zones';
import type { GameState } from '../engine/types';

/** Existing campaign unlocks are the saved exploration record, including older characters. */
export function actRevealed(s: GameState, act: number): boolean {
  const reached = Math.max(1, ...ZONES.filter((zone) =>
    s.unlockedZones.includes(zone.id) || s.bossesDefeated.includes(zone.id)).map((zone) => zone.act));
  return actOpen(act) && act <= reached;
}

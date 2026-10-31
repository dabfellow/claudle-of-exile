import elvenDawn from '../assets/music/elven-dawn.ogg?url';
import emberlight from '../assets/music/emberlight.ogg?url';
import silverbrook from '../assets/music/silverbrook.ogg?url';
import throneOfStorms from '../assets/music/throne-of-storms.ogg?url';
import type { GameState } from '../engine/types';
import type { Track } from '../platform/music';
import { zoneDef } from './zones';

export type MusicCue = 'hideout' | 'act1' | 'act2' | 'boss';

/** `?url` keeps the audio out of the JS: the bundle holds only these paths. Gains bring each track to about -28 dB. */
export const MUSIC_TRACKS: Record<MusicCue, Track> = {
  hideout: { url: elvenDawn, gain: 1 },
  act1: { url: silverbrook, gain: 0.72 },
  act2: { url: emberlight, gain: 1 },
  boss: { url: throneOfStorms, gain: 0.8 },
};

export function bossOnField(s: GameState): boolean {
  return !!s.combat?.monsters.some((m) => m.isBoss && m.life > 0);
}

/** What should be playing. Acts past 2 and maps from them share the Act 2 track until they get their own. */
export function musicCue(s: GameState, inGame: boolean): MusicCue {
  if (!inGame || !s.combat) return 'hideout';
  if (bossOnField(s)) return 'boss';
  return zoneDef(s.combat.zoneId).act === 1 ? 'act1' : 'act2';
}

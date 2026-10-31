import { useState } from 'react';
import { bossOnField, musicCue, MUSIC_TRACKS, type MusicCue } from '../data/music';
import { game } from '../game';
import { loadMusicPrefs, MusicPlayer, saveMusicPrefs, type MusicPrefs } from '../platform/music';

/** stays on the boss track this long after a kill, so a boss farm doesn't swap tracks every fight */
const BOSS_LINGER_MS = 8000;

export const music = new MusicPlayer<MusicCue>(MUSIC_TRACKS, (url) => new Audio(url), loadMusicPrefs(localStorage));

export function startMusic() {
  let bossSeen = 0;
  const update = () => {
    const inGame = game.screen === 'game';
    if (inGame && bossOnField(game.state)) bossSeen = Date.now();
    const lingering = inGame && !!game.state.combat && Date.now() - bossSeen < BOSS_LINGER_MS;
    music.play(lingering ? 'boss' : musicCue(game.state, inGame));
  };
  game.subscribe(update);
  update();
  const unlock = () => music.unlock();
  window.addEventListener('pointerup', unlock, true);
  window.addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', () => music.setHidden(document.hidden));
  music.setHidden(document.hidden);
}

/** the music settings, saved on this device rather than in the character's save */
export function useMusicPrefs(): [MusicPrefs, (next: MusicPrefs) => void] {
  const [prefs, setPrefs] = useState(music.prefs);
  return [
    prefs,
    (next) => {
      setPrefs(next);
      music.setPrefs(next);
      saveMusicPrefs(localStorage, next);
    },
  ];
}

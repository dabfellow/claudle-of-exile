import { useState } from 'react';
import { bossOnField, musicCue, MUSIC_TRACKS, type MusicCue } from '../data/music';
import { game } from '../game';
import { loadMusicPrefs, MusicPlayer, saveMusicPrefs, type MusicPrefs } from '../platform/music';

/** stays on the boss track this long after a kill, so a boss farm doesn't swap tracks every fight */
const BOSS_LINGER_MS = 8000;

export const music = new MusicPlayer<MusicCue>(MUSIC_TRACKS, (url) => new Audio(url), loadMusicPrefs(localStorage));

/** The loot-filter chime follows the same volume and mute settings as the rest of the game. */
function playLootFilterSound() {
  const { volume, muted } = music.prefs;
  if (muted || volume <= 0) return;
  try {
    const AudioCtx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const audio = new AudioCtx();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.setValueAtTime(740, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1100, audio.currentTime + 0.12);
    gain.gain.setValueAtTime(0.08 * volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001 * volume, audio.currentTime + 0.22);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.22);
    oscillator.addEventListener('ended', () => void audio.close());
  } catch {
    // Sound is optional on browsers that block Web Audio.
  }
}

export function startMusic() {
  let bossSeen = 0;
  const update = () => {
    const inGame = game.screen === 'game';
    if (inGame && bossOnField(game.state)) bossSeen = Date.now();
    const lingering = inGame && !!game.state.combat && Date.now() - bossSeen < BOSS_LINGER_MS;
    music.play(lingering ? 'boss' : musicCue(game.state, inGame));
  };
  game.subscribe(update);
  game.onGameEvent((event) => {
    if (event.t === 'loot' && event.filterSound) playLootFilterSound();
  });
  update();
  const unlock = () => music.unlock();
  window.addEventListener('pointerup', unlock, true);
  window.addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', () => music.setHidden(document.hidden));
  music.setHidden(document.hidden);
}

const prefListeners = new Set<(prefs: MusicPrefs) => void>();

export function subscribeMusicPrefs(fn: (prefs: MusicPrefs) => void): () => void {
  prefListeners.add(fn);
  return () => { prefListeners.delete(fn); };
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
      for (const fn of prefListeners) fn(next);
    },
  ];
}

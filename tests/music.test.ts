import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bossOnField, musicCue } from '../src/data/music';
import { ZONES } from '../src/data/zones';
import type { GameState } from '../src/engine/types';
import { DEFAULT_MUSIC, FADE_MS, loadMusicPrefs, MusicPlayer, saveMusicPrefs, type AudioLike } from '../src/platform/music';

class FakeAudio implements AudioLike {
  loop = false;
  volume = 1;
  preload = '';
  paused = true;
  refuse = false;
  constructor(public url: string) {}
  play() {
    if (this.refuse) return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

const TRACKS = { calm: { url: 'calm.ogg', gain: 1 }, loud: { url: 'loud.ogg', gain: 0.5 } };

function setup(prefs = { volume: 0.5, muted: false }) {
  const made: FakeAudio[] = [];
  const player = new MusicPlayer<keyof typeof TRACKS>(TRACKS, (url) => {
    const a = new FakeAudio(url);
    made.push(a);
    return a;
  }, prefs);
  const audio = (url: string) => made.find((a) => a.url === url);
  return { player, made, audio };
}

describe('music player', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it('loads nothing until the first input', () => {
    const { player, made, audio } = setup();
    player.play('calm');
    expect(made).toEqual([]);
    player.unlock();
    expect(audio('calm.ogg')).toMatchObject({ paused: false, loop: true });
  });

  it('fades in to the player volume times the track gain', () => {
    const { player, audio } = setup();
    player.play('loud');
    player.unlock();
    expect(audio('loud.ogg')!.volume).toBe(0);
    vi.advanceTimersByTime(FADE_MS + 100);
    expect(audio('loud.ogg')!.volume).toBeCloseTo(0.25);
  });

  it('crossfades between tracks and stops the old one', () => {
    const { player, audio } = setup();
    player.play('calm');
    player.unlock();
    vi.advanceTimersByTime(FADE_MS + 100);
    player.play('loud');
    vi.advanceTimersByTime(FADE_MS / 2);
    const [calm, loud] = [audio('calm.ogg')!, audio('loud.ogg')!];
    expect(calm.paused || loud.paused).toBe(false);
    expect(calm.volume).toBeGreaterThan(0);
    expect(loud.volume).toBeGreaterThan(0);
    vi.advanceTimersByTime(FADE_MS);
    expect(calm).toMatchObject({ paused: true, volume: 0 });
    expect(loud.paused).toBe(false);
  });

  it('pauses while hidden and picks up the latest track on return', () => {
    const { player, audio } = setup();
    player.play('calm');
    player.unlock();
    vi.advanceTimersByTime(FADE_MS + 100);
    player.setHidden(true);
    expect(audio('calm.ogg')!.paused).toBe(true);
    player.play('loud');
    expect(audio('loud.ogg')).toBeUndefined();
    player.setHidden(false);
    expect(audio('loud.ogg')!.paused).toBe(false);
  });

  it('mute and zero volume stop playback, and changes apply at once', () => {
    const { player, audio } = setup();
    player.play('calm');
    player.unlock();
    vi.advanceTimersByTime(FADE_MS + 100);
    player.setPrefs({ volume: 0.2, muted: false });
    expect(audio('calm.ogg')!.volume).toBeCloseTo(0.2);
    player.setPrefs({ volume: 0.2, muted: true });
    expect(audio('calm.ogg')!.paused).toBe(true);
    player.setPrefs({ volume: 0, muted: false });
    expect(audio('calm.ogg')!.paused).toBe(true);
    player.setPrefs({ volume: 0.3, muted: false });
    expect(audio('calm.ogg')!.paused).toBe(false);
  });

  it('a refused start waits for the next input', async () => {
    const refused = new FakeAudio('calm.ogg');
    refused.refuse = true;
    const p = new MusicPlayer<keyof typeof TRACKS>(TRACKS, () => refused, { volume: 1, muted: false });
    p.play('calm');
    p.unlock();
    await vi.advanceTimersByTimeAsync(0);
    refused.refuse = false;
    p.unlock();
    expect(refused.paused).toBe(false);
  });
});

describe('music prefs', () => {
  const store = (raw: string | null) => ({ getItem: () => raw });

  it('defaults to a modest volume, unmuted', () => {
    expect(loadMusicPrefs(store(null))).toEqual(DEFAULT_MUSIC);
    expect(DEFAULT_MUSIC.volume).toBeLessThan(0.5);
  });

  it('survives junk and clamps volume', () => {
    expect(loadMusicPrefs(store('not json'))).toEqual(DEFAULT_MUSIC);
    expect(loadMusicPrefs(store('{"volume":7,"muted":true}'))).toEqual({ volume: 1, muted: true });
  });

  it('round-trips, and a refusing store does not throw', () => {
    let saved = '';
    saveMusicPrefs({ setItem: (_k, v) => void (saved = v) }, { volume: 0.25, muted: true });
    expect(loadMusicPrefs(store(saved))).toEqual({ volume: 0.25, muted: true });
    expect(() => saveMusicPrefs({ setItem: () => { throw new Error('full'); } }, DEFAULT_MUSIC)).not.toThrow();
  });
});

describe('music cues', () => {
  const zone = (act: number) => ZONES.find((z) => z.act === act)!.id;
  const inZone = (act: number, monsters: { isBoss: boolean; life: number }[] = []) => ({ combat: { zoneId: zone(act), monsters } }) as unknown as GameState;

  it('plays the hideout track outside fights and before a character is loaded', () => {
    expect(musicCue({ combat: null } as GameState, true)).toBe('hideout');
    expect(musicCue(inZone(1), false)).toBe('hideout');
  });

  it('follows the act', () => {
    expect(musicCue(inZone(1), true)).toBe('act1');
    expect(musicCue(inZone(2), true)).toBe('act2');
  });

  it('switches to the boss track only while a boss lives', () => {
    expect(musicCue(inZone(1, [{ isBoss: true, life: 10 }]), true)).toBe('boss');
    expect(musicCue(inZone(1, [{ isBoss: true, life: 0 }, { isBoss: false, life: 5 }]), true)).toBe('act1');
    expect(bossOnField({ combat: null } as GameState)).toBe(false);
  });
});

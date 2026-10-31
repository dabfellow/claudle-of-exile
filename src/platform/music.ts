/**
 * Background music: one streamed <audio> element per track, created the first time that track is
 * needed, so nothing downloads until music can actually be heard. Knows nothing about the game;
 * src/ui/music.ts tells it which track should be playing.
 */

/** the slice of HTMLAudioElement the player uses, so tests can stand in for it */
export interface AudioLike {
  loop: boolean;
  volume: number;
  preload: string;
  paused: boolean;
  play(): Promise<void>;
  pause(): void;
}

export interface Track {
  url: string;
  /** evens the tracks out: measured loudness differs by a few dB */
  gain: number;
}

export interface MusicPrefs {
  volume: number;
  muted: boolean;
}

export const DEFAULT_MUSIC: MusicPrefs = { volume: 0.4, muted: false };
const PREFS_KEY = 'coe-music';
export const FADE_MS = 2500;
const FADE_TICK_MS = 50;

export function loadMusicPrefs(store: Pick<Storage, 'getItem'>): MusicPrefs {
  try {
    const raw = JSON.parse(store.getItem(PREFS_KEY) ?? '{}') as Partial<MusicPrefs>;
    const volume = typeof raw.volume === 'number' ? Math.min(1, Math.max(0, raw.volume)) : DEFAULT_MUSIC.volume;
    return { volume, muted: raw.muted === true };
  } catch {
    return { ...DEFAULT_MUSIC };
  }
}

export function saveMusicPrefs(store: Pick<Storage, 'setItem'>, prefs: MusicPrefs) {
  try {
    store.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // private windows can refuse storage; the setting just lasts this visit
  }
}

interface Channel {
  audio: AudioLike;
  track: Track;
  /** 0–1 through its fade, before the player's volume is applied */
  level: number;
}

export class MusicPlayer<Id extends string = string> {
  private channels = new Map<Id, Channel>();
  private current: Id | null = null;
  private unlocked = false;
  private hidden = false;
  private fade: ReturnType<typeof setInterval> | null = null;

  constructor(
    private tracks: Record<Id, Track>,
    private makeAudio: (url: string) => AudioLike,
    public prefs: MusicPrefs,
  ) {}

  /** browsers refuse sound until the player has done something; call on every input until it sticks */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.sync();
  }

  play(id: Id) {
    if (id === this.current) return;
    this.current = id;
    this.sync();
  }

  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.sync();
  }

  setPrefs(prefs: MusicPrefs) {
    this.prefs = prefs;
    this.applyVolumes();
    this.sync();
  }

  private get audible() {
    return this.unlocked && !this.hidden && !this.prefs.muted && this.prefs.volume > 0;
  }

  private sync() {
    if (!this.audible || this.current === null) {
      for (const c of this.channels.values()) c.audio.pause();
      this.stopFade();
      return;
    }
    const wanted = this.channel(this.current);
    // the very first track fades in too, so sound never starts at full volume on a click
    for (const c of this.channels.values()) if (c === wanted || c.level > 0) this.start(c);
    this.applyVolumes();
    this.fade ??= setInterval(() => this.tick(), FADE_TICK_MS);
  }

  private channel(id: Id): Channel {
    let c = this.channels.get(id);
    if (!c) {
      const audio = this.makeAudio(this.tracks[id].url);
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0;
      c = { audio, track: this.tracks[id], level: 0 };
      this.channels.set(id, c);
    }
    return c;
  }

  private start(c: Channel) {
    if (!c.audio.paused) return;
    c.audio.play().catch((err: unknown) => {
      // a refused start waits for the next input; a track that can't load just stays silent
      if (err instanceof Error && err.name === 'NotAllowedError') {
        this.unlocked = false;
        c.level = 0;
      }
    });
  }

  private tick() {
    const step = FADE_TICK_MS / FADE_MS;
    let settled = true;
    for (const [id, c] of this.channels) {
      const target = id === this.current ? 1 : 0;
      c.level = target > c.level ? Math.min(target, c.level + step) : Math.max(target, c.level - step);
      if (c.level !== target) settled = false;
      else if (target === 0) c.audio.pause();
    }
    this.applyVolumes();
    if (settled) this.stopFade();
  }

  private applyVolumes() {
    for (const c of this.channels.values()) c.audio.volume = Math.min(1, c.level * c.track.gain * this.prefs.volume);
  }

  private stopFade() {
    if (this.fade !== null) clearInterval(this.fade);
    this.fade = null;
  }
}

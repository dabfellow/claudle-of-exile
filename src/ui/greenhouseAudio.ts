/**
 * Procedural Web Audio soundscape and tactile SFX for the Greenhouse conservatory:
 * gentle rain/mist pattering on overhead glass panes, humid conservatory breeze,
 * occasional leaf condensation droplets, and tactile potting/harvesting cues.
 * Respects global music mute/volume settings and a per-device greenhouse toggle.
 */
import { music, subscribeMusicPrefs } from './music';

const AMBIENCE_PREFS_KEY = 'coe-greenhouse-audio';

interface SoundEngine {
  ctx: AudioContext;
  master: GainNode;
  sources: AudioScheduledSourceNode[];
  dropletTimer: ReturnType<typeof setTimeout> | null;
  unsubPrefs: () => void;
  onVis: () => void;
  onUnlock: () => void;
}

let mountCount = 0;
let engine: SoundEngine | null = null;
let sfxCtx: AudioContext | null = null;

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  return window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;
}

export function isGreenhouseAmbienceEnabled(): boolean {
  try {
    return localStorage.getItem(AMBIENCE_PREFS_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setGreenhouseAmbienceEnabled(on: boolean): void {
  try {
    localStorage.setItem(AMBIENCE_PREFS_KEY, on ? 'on' : 'off');
  } catch {
    // Private browsing may disallow localStorage writes; toggle still applies in-session.
  }
  refreshGreenhouseAmbience();
}

function targetAmbienceGain(): number {
  if (mountCount <= 0 || !isGreenhouseAmbienceEnabled()) return 0;
  if (typeof document !== 'undefined' && document.hidden) return 0;
  if (music.prefs.muted || music.prefs.volume <= 0) return 0;
  return Math.min(0.24, music.prefs.volume * 0.24);
}

/** Generate a 6-second seamless stereo pink-noise buffer (Paul Kellet's 7-pole approximation). */
function createPinkNoiseBuffer(ctx: AudioContext, seconds = 6): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    // Warm up filter state so loop boundary has minimal transient step
    for (let i = -2048; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.085;
      b6 = white * 0.115926;
      if (i >= 0) data[i] = sample;
    }
    // Cross-fade first/last 256 samples for clickless looping
    const fade = Math.min(256, Math.floor(length / 4));
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      const a = data[i];
      const b = data[length - fade + i];
      data[i] = a * t + b * (1 - t);
    }
  }
  return buffer;
}

function scheduleNextDroplet(eng: SoundEngine): void {
  if (eng.dropletTimer !== null) clearTimeout(eng.dropletTimer);
  const delayMs = 2200 + Math.random() * 3000;
  eng.dropletTimer = setTimeout(() => {
    eng.dropletTimer = null;
    if (engine !== eng) return;
    if (targetAmbienceGain() > 0 && eng.ctx.state === 'running') {
      playDropletPlink(eng.ctx, eng.master);
    }
    scheduleNextDroplet(eng);
  }, delayMs);
}

function playDropletPlink(ctx: AudioContext, dest: AudioNode): void {
  try {
    const t = ctx.currentTime + 0.02;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const pan = ctx.createStereoPanner();
    const startHz = 580 + Math.random() * 360;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startHz, t);
    osc.frequency.exponentialRampToValueAtTime(startHz + 220, t + 0.05);
    pan.pan.setValueAtTime(Math.random() * 1.3 - 0.65, t);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.055, t + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(pan).connect(env).connect(dest);
    osc.start(t);
    osc.stop(t + 0.13);
  } catch {
    // Ignore transient scheduling errors on teardown
  }
}

function syncGain(eng: SoundEngine, fadeSeconds = 1.2): void {
  try {
    const target = targetAmbienceGain();
    const now = eng.ctx.currentTime;
    eng.master.gain.cancelScheduledValues(now);
    eng.master.gain.setValueAtTime(eng.master.gain.value, now);
    eng.master.gain.linearRampToValueAtTime(target, now + fadeSeconds);
    if (target > 0 && eng.ctx.state === 'suspended') {
      void eng.ctx.resume().catch(() => {});
    }
  } catch {
    // Safe fallback if Web Audio graph is closing
  }
}

function startEngine(): void {
  if (engine) {
    syncGain(engine, 1.0);
    return;
  }
  const Ctor = getAudioContextCtor();
  if (!Ctor) return;
  try {
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.connect(ctx.destination);

    const pinkBuffer = createPinkNoiseBuffer(ctx, 6);
    const sources: AudioScheduledSourceNode[] = [];

    // Layer 1: Gentle rain & mist pattering on glass panes
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = pinkBuffer;
    rainSrc.loop = true;
    const rainBand = ctx.createBiquadFilter();
    rainBand.type = 'bandpass';
    rainBand.frequency.setValueAtTime(920, ctx.currentTime);
    rainBand.Q.setValueAtTime(0.65, ctx.currentTime);
    const rainLow = ctx.createBiquadFilter();
    rainLow.type = 'lowpass';
    rainLow.frequency.setValueAtTime(2600, ctx.currentTime);
    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.82, ctx.currentTime);

    const rainLfo = ctx.createOscillator();
    rainLfo.frequency.setValueAtTime(0.07, ctx.currentTime);
    const rainLfoDepth = ctx.createGain();
    rainLfoDepth.gain.setValueAtTime(240, ctx.currentTime);
    rainLfo.connect(rainLfoDepth).connect(rainBand.frequency);

    rainSrc.connect(rainBand).connect(rainLow).connect(rainGain).connect(master);
    rainSrc.start();
    rainLfo.start();
    sources.push(rainSrc, rainLfo);

    // Layer 2: Warm humid conservatory airflow
    const breezeSrc = ctx.createBufferSource();
    breezeSrc.buffer = pinkBuffer;
    breezeSrc.loop = true;
    const breezeBand = ctx.createBiquadFilter();
    breezeBand.type = 'bandpass';
    breezeBand.frequency.setValueAtTime(260, ctx.currentTime);
    breezeBand.Q.setValueAtTime(1.1, ctx.currentTime);
    const breezeGain = ctx.createGain();
    breezeGain.gain.setValueAtTime(0.28, ctx.currentTime);

    const breezeLfo = ctx.createOscillator();
    breezeLfo.frequency.setValueAtTime(0.09, ctx.currentTime);
    const breezeLfoDepth = ctx.createGain();
    breezeLfoDepth.gain.setValueAtTime(45, ctx.currentTime);
    breezeLfo.connect(breezeLfoDepth).connect(breezeBand.frequency);

    breezeSrc.connect(breezeBand).connect(breezeGain).connect(master);
    // Offset loop point slightly so layers stay decorrelated
    breezeSrc.start(0, 2.3);
    breezeLfo.start();
    sources.push(breezeSrc, breezeLfo);

    const eng: SoundEngine = {
      ctx,
      master,
      sources,
      dropletTimer: null,
      unsubPrefs: () => {},
      onVis: () => {
        if (engine === eng) syncGain(eng, 0.45);
      },
      onUnlock: () => {
        if (engine !== eng) return;
        if (targetAmbienceGain() > 0 && eng.ctx.state === 'suspended') {
          void eng.ctx.resume().then(() => {
            if (engine === eng) syncGain(eng, 1.0);
          }).catch(() => {});
        }
      },
    };
    eng.unsubPrefs = subscribeMusicPrefs(() => {
      if (engine === eng) syncGain(eng, 0.35);
    });
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', eng.onVis);
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerup', eng.onUnlock, true);
      window.addEventListener('keydown', eng.onUnlock, true);
    }

    engine = eng;
    scheduleNextDroplet(eng);
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => {
        if (engine === eng) syncGain(eng, 1.2);
      }).catch(() => {});
    } else {
      syncGain(eng, 1.2);
    }
  } catch {
    // Web Audio unavailable — fail silently
  }
}

function stopEngine(): void {
  const eng = engine;
  if (!eng) return;
  engine = null;
  if (eng.dropletTimer !== null) clearTimeout(eng.dropletTimer);
  eng.unsubPrefs();
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', eng.onVis);
  if (typeof window !== 'undefined') {
    window.removeEventListener('pointerup', eng.onUnlock, true);
    window.removeEventListener('keydown', eng.onUnlock, true);
  }
  try {
    const now = eng.ctx.currentTime;
    eng.master.gain.cancelScheduledValues(now);
    eng.master.gain.setValueAtTime(eng.master.gain.value, now);
    eng.master.gain.linearRampToValueAtTime(0, now + 0.45);
    setTimeout(() => {
      for (const s of eng.sources) {
        try { s.stop(); } catch { /* ignore */ }
      }
      void eng.ctx.close().catch(() => {});
    }, 500);
  } catch {
    void eng.ctx.close().catch(() => {});
  }
}

export function refreshGreenhouseAmbience(): void {
  if (mountCount <= 0) {
    stopEngine();
    return;
  }
  if (!engine) startEngine();
  else syncGain(engine, 0.45);
}

/** Start (ref-counted) greenhouse ambience on Greenhouse tab mount. */
export function enterGreenhouseAmbience(): void {
  mountCount++;
  if (!engine) startEngine();
  else syncGain(engine, 0.9);
}

/** Leave greenhouse ambience on Greenhouse tab unmount. */
export function leaveGreenhouseAmbience(): void {
  mountCount = Math.max(0, mountCount - 1);
  if (mountCount === 0) stopEngine();
}

function getSfxContext(): { ctx: AudioContext; scale: number } | null {
  if (music.prefs.muted || music.prefs.volume <= 0) return null;
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  try {
    if (!sfxCtx || sfxCtx.state === 'closed') sfxCtx = new Ctor();
    if (sfxCtx.state === 'suspended') void sfxCtx.resume().catch(() => {});
    return { ctx: sfxCtx, scale: Math.min(1, Math.max(0.15, music.prefs.volume)) };
  } catch {
    return null;
  }
}

function makeShortNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Soft terracotta tap when selecting a seed tile on the potting bench. */
export function playSeedSelectSound(): void {
  const sfx = getSfxContext();
  if (!sfx) return;
  try {
    const { ctx, scale } = sfx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.035);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.07 * scale, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    osc.connect(env).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  } catch { /* ignore */ }
}

/** Warm earthy soil pat, gentle mist spritz, and rooted chord cue when planting. */
export function playPlantSound(): void {
  const sfx = getSfxContext();
  if (!sfx) return;
  try {
    const { ctx, scale } = sfx;
    const t = ctx.currentTime;
    const noise = makeShortNoiseBuffer(ctx, 0.18);

    // Earthy pat
    const patSrc = ctx.createBufferSource();
    patSrc.buffer = noise;
    const patFilter = ctx.createBiquadFilter();
    patFilter.type = 'lowpass';
    patFilter.frequency.setValueAtTime(380, t);
    const patEnv = ctx.createGain();
    patEnv.gain.setValueAtTime(0.001, t);
    patEnv.gain.exponentialRampToValueAtTime(0.16 * scale, t + 0.015);
    patEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);
    patSrc.connect(patFilter).connect(patEnv).connect(ctx.destination);
    patSrc.start(t);
    patSrc.stop(t + 0.1);

    // Light water mist spritz
    const mistSrc = ctx.createBufferSource();
    mistSrc.buffer = noise;
    const mistFilter = ctx.createBiquadFilter();
    mistFilter.type = 'bandpass';
    mistFilter.frequency.setValueAtTime(3100, t);
    mistFilter.Q.setValueAtTime(1.4, t);
    const mistEnv = ctx.createGain();
    mistEnv.gain.setValueAtTime(0.0001, t + 0.03);
    mistEnv.gain.exponentialRampToValueAtTime(0.075 * scale, t + 0.06);
    mistEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    mistSrc.connect(mistFilter).connect(mistEnv).connect(ctx.destination);
    mistSrc.start(t + 0.02);
    mistSrc.stop(t + 0.18);

    // Warm root tone (C4)
    const osc = ctx.createOscillator();
    const oscEnv = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(261.63, t);
    oscEnv.gain.setValueAtTime(0.0001, t);
    oscEnv.gain.exponentialRampToValueAtTime(0.075 * scale, t + 0.02);
    oscEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(oscEnv).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.17);
  } catch { /* ignore */ }
}

/** Crisp snip + warm botanical arpeggio (with extra shimmer when special/cross/stabilised). */
export function playHarvestSound(special = false): void {
  const sfx = getSfxContext();
  if (!sfx) return;
  try {
    const { ctx, scale } = sfx;
    const t = ctx.currentTime;

    // Crisp snip
    const snipSrc = ctx.createBufferSource();
    snipSrc.buffer = makeShortNoiseBuffer(ctx, 0.035);
    const snipFilter = ctx.createBiquadFilter();
    snipFilter.type = 'highpass';
    snipFilter.frequency.setValueAtTime(2200, t);
    const snipEnv = ctx.createGain();
    snipEnv.gain.setValueAtTime(0.0001, t);
    snipEnv.gain.exponentialRampToValueAtTime(0.085 * scale, t + 0.004);
    snipEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    snipSrc.connect(snipFilter).connect(snipEnv).connect(ctx.destination);
    snipSrc.start(t);
    snipSrc.stop(t + 0.032);

    // Warm botanical arpeggio (C5, E5, G5 [+ B5, C6 shimmer])
    const notes = special ? [523.25, 659.25, 783.99, 987.77, 1046.5] : [523.25, 659.25, 783.99];
    notes.forEach((hz, idx) => {
      const start = t + 0.015 + idx * 0.055;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = idx >= 3 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(hz, start);
      env.gain.setValueAtTime(0.0001, start);
      env.gain.exponentialRampToValueAtTime(0.075 * scale, start + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
      osc.connect(env).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch { /* ignore */ }
}

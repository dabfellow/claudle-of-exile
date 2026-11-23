import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  angleResult,
  gemTurnMs,
  curveResult,
  fertiliseResult,
  fertiliseWindowMs,
  pourResult,
  sightingResult,
  BRUSH_COLS,
  BRUSH_ROWS,
  brushChips,
  brushDone,
  brushPatch,
  brushResult,
  CHARGE_ZONE_WIDTH,
  chargeResult,
  focusResult,
  DOUBLE_SHARE,
  doubleZoneStart,
  inDoubleZone,
  LIFT_CLICKS_DOUBLE,
  LIFT_CLICKS_HIT,
  liftSpamResult,
  type SwingResult,
} from '../../engine/minigame';
import type { SkillId } from '../../engine/types';
import { SplitGame } from './SplitLog';
import { brushCrackCut } from '../../engine/deciphering';
import { useGame } from '../../game';
import { levelOf } from '../../engine/xp';
import { Art, GameIcon } from './common';
import './star-chart.css';
import '../archaeology.css';
import './giants.css';
import './minigames-overhaul.css';

const SWEEP_MS = 1200;
const WOOD_ZONE = 0.18;
/** Astrology: the telescope. The blur grows by this many pixels per 1.0 of focus ring away from the sharpest point; holding an arrow turns the ring this fast. */
const TELESCOPE_BLUR_PX = 80;
const TELESCOPE_TURN_PER_SEC = 0.5;
const PINS = 4;
const LOCK_LENGTH = 3;
const PIN_SHOW_MS = 380;
const LOCK_PATIENCE_MS = 3000;
const LOCK_NEXT_MS = 250;
const STROKE_W = 300;
const STROKE_H = 120;
const STROKE_STEP = 5;
const STROKE_REACH = 16;
const STROKE_AHEAD = 30;
/** Rune-carving: keep this close to the line for this much of the stroke for a double. */
const STROKE_CORE = 6;
const STROKE_CORE_SHARE = 2 / 3;
const POTS = 3;
const POT_ZONE = 0.76;
/** The sequence games (lock, gem, dig): finishing within this share of the time allowed is a double. */
const QUICK_SHARE = 0.4;

type OnSwing = (r: SwingResult) => void;

const random = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

/** Run `fn(dtMs)` every animation frame, always the latest `fn`. */
function useFrame(fn: (dt: number) => void) {
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => {
    let id = 0;
    let last = performance.now();
    const step = (now: number) => {
      latest.current(now - last);
      last = now;
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, []);
}

/** Space plays the game, unless you're typing somewhere. */
function useSpace(down: () => void, up?: () => void) {
  const latest = useRef({ down, up });
  latest.current = { down, up };
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && e.target.matches('input, textarea, select');
    const onDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || typing(e)) return;
      e.preventDefault();
      if (!e.repeat) latest.current.down();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || typing(e)) return;
      e.preventDefault();
      latest.current.up?.();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);
}

/** A bright zone on a bar, with its gold double zone in the middle. Positions are 0–1. */
function Zone({ at, width }: { at: number; width: number }) {
  return (
    <>
      <span className="mini-zone" style={{ left: `${at * 100}%`, width: `${width * 100}%` }} />
      <span className="mini-double" style={{ left: `${doubleZoneStart(at, width) * 100}%`, width: `${width * DOUBLE_SHARE * 100}%` }} />
    </>
  );
}

/** Time left on a lock, stone or plot. It drains from the right: finish while its end is still in the gold for a double. */
function Patience({ ms }: { ms: number }) {
  return (
    <span className="mini-patience" aria-hidden>
      <span className="mini-patience-double" style={{ width: `${QUICK_SHARE * 100}%` }} />
      <span className="mini-patience-left" style={{ animationDuration: `${ms}ms` }} />
    </span>
  );
}

/** Finished soon enough after `since` for a double? */
const quick = (since: number, ms: number) => performance.now() - since <= ms * QUICK_SHARE;

/** A marker sweeps the bar: swing while it's in the band. */
function WoodcuttingGame({ onSwing }: { onSwing: OnSwing }) {
  const newZone = () => random(0.1, 0.72);
  const [zone, setZone] = useState(newZone);
  const marker = useRef<HTMLDivElement>(null);
  const swing = useRef({ t: 0, pos: 0 });

  // no wait between swings: each miss costs Focus, so mashing earns nothing
  const chop = () => {
    const sw = swing.current;
    const inZone = sw.pos >= zone && sw.pos <= zone + WOOD_ZONE;
    if (inZone) setZone(newZone());
    onSwing(!inZone ? 'miss' : inDoubleZone(sw.pos, zone, WOOD_ZONE) ? 'double' : 'hit');
  };

  useFrame((dt) => {
    const sw = swing.current;
    sw.t += dt;
    sw.pos = 1 - Math.abs(((sw.t / SWEEP_MS) % 2) - 1);
    if (marker.current) marker.current.style.left = `${sw.pos * 100}%`;
  });
  useSpace(chop);

  return (
      <div className="mini-woodcutting">
        <button className="mini-bar" aria-label="Swing your axe" onPointerDown={chop}>
          <Zone at={zone} width={WOOD_ZONE} />
          <div className="mini-marker" ref={marker} />
        </button>
        <button className="btn mini-swing" onPointerDown={chop} onKeyDown={(e) => { if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); chop(); } }}>Swing</button>
      </div>
  );
}


import { BASE_SPECIES_INDEX } from '../../data/foraging';

type ForagePhase = 'gold' | 'green' | 'late';
interface ForageBed {
  cell: number;
  born: number;
  id: number;
  phase: ForagePhase;
}

/** 3×3 garden soil beds: tap lit sprouts quickly to fertilise them; golden blooms earn a double. */
export function ForagingGame({ onSwing }: { matId?: string; onSwing: OnSwing }) {
  const s = useGame();
  const speciesId = s.action?.kind === 'skill' && s.action.actionId.startsWith('forage_') ? s.action.actionId.slice(7) : 'sunpetal';
  const spIndex = BASE_SPECIES_INDEX.get(speciesId) ?? 0;
  const windowMs = fertiliseWindowMs(spIndex);
  const [lit, setLit] = useState<ForageBed[]>([]);
  const [flash, setFlash] = useState<Record<number, { id: number; kind: 'double' | 'hit' | 'miss' }>>({});
  const litRef = useRef<ForageBed[]>([]);
  const onSwingRef = useRef(onSwing);
  onSwingRef.current = onSwing;
  const uidRef = useRef(0);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spawnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const scheduleSpawnRef = useRef<(delay: number) => void>(() => {});

  const setBeds = (next: ForageBed[]) => {
    litRef.current = next;
    setLit(next);
  };

  useEffect(() => {
    let alive = true;
    const clearScheduled = () => {
      if (fadeTimer.current) { clearTimeout(fadeTimer.current); fadeTimer.current = null; }
      if (spawnTimer.current) { clearTimeout(spawnTimer.current); spawnTimer.current = null; }
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    };
    const spawn = () => {
      if (!alive) return;
      const count = spIndex >= 6 && Math.random() < 0.2 ? 2 : 1;
      const cells: number[] = [];
      while (cells.length < count) {
        const c = Math.floor(Math.random() * 9);
        if (!cells.includes(c)) cells.push(c);
      }
      const born = performance.now();
      setBeds(cells.map((cell) => ({ cell, born, id: ++uidRef.current, phase: 'gold' })));
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      fadeTimer.current = setTimeout(() => {
        fadeTimer.current = null;
        if (!alive) return;
        if (litRef.current.length > 0) {
          onSwingRef.current('miss');
          setBeds([]);
        }
        scheduleSpawn(320);
      }, windowMs + 300);
    };
    const scheduleSpawn = (delay: number) => {
      if (!alive) return;
      if (spawnTimer.current) clearTimeout(spawnTimer.current);
      spawnTimer.current = setTimeout(() => {
        spawnTimer.current = null;
        spawn();
      }, delay);
    };
    scheduleSpawnRef.current = scheduleSpawn;
    spawn();
    return () => {
      alive = false;
      scheduleSpawnRef.current = () => {};
      clearScheduled();
    };
  }, [spIndex, windowMs]);

  useFrame(() => {
    const cur = litRef.current;
    if (cur.length === 0) return;
    const now = performance.now();
    let changed = false;
    const updated = cur.map((item) => {
      const elapsed = now - item.born;
      const nextPhase: ForagePhase = elapsed <= windowMs * 0.3 ? 'gold' : elapsed <= windowMs ? 'green' : 'late';
      if (nextPhase !== item.phase) {
        changed = true;
        return { ...item, phase: nextPhase };
      }
      return item;
    });
    if (changed) setBeds(updated);
  });

  const triggerFlash = (cell: number, kind: 'double' | 'hit' | 'miss') => {
    const id = ++uidRef.current;
    setFlash((prev) => ({ ...prev, [cell]: { id, kind } }));
    const t = setTimeout(() => {
      timers.current.delete(t);
      setFlash((prev) => {
        if (prev[cell]?.id !== id) return prev;
        const copy = { ...prev };
        delete copy[cell];
        return copy;
      });
    }, 260);
    timers.current.add(t);
  };

  const tap = (cell: number) => {
    const hit = litRef.current.find((x) => x.cell === cell);
    if (!hit) {
      onSwingRef.current(fertiliseResult(null, windowMs, true));
      triggerFlash(cell, 'miss');
      return;
    }
    const elapsed = performance.now() - hit.born;
    const res = fertiliseResult(elapsed, windowMs, false);
    onSwingRef.current(res);
    triggerFlash(cell, res === 'double' ? 'double' : res === 'miss' ? 'miss' : 'hit');
    const remaining = litRef.current.filter((x) => x.cell !== cell);
    setBeds(remaining);
    if (remaining.length === 0) {
      if (fadeTimer.current) { clearTimeout(fadeTimer.current); fadeTimer.current = null; }
      scheduleSpawnRef.current(280);
    }
  };

  return (
    <div className="forage-bed-grid" role="group" aria-label="Fertilise lit soil beds">
      {Array.from({ length: 9 }, (_, cell) => {
        const active = lit.find((x) => x.cell === cell);
        const f = flash[cell];
        const cls = [
          'forage-bed',
          active ? 'lit' : '',
          active?.phase === 'gold' ? 'gold' : '',
          active?.phase === 'late' ? 'late' : '',
          !active && f ? `flash-${f.kind}` : '',
        ].filter(Boolean).join(' ');
        const label = active ? (active.phase === 'gold' ? 'Gold!' : active.phase === 'late' ? 'Hurry!' : 'Fertilise!') : 'Soil';
        return (
          <button
            key={cell}
            type="button"
            className={cls}
            aria-label={active ? `${label} plot ${cell + 1}` : `Dormant soil plot ${cell + 1}`}
            onPointerDown={(e) => {
              if (e.pointerType === 'mouse' && e.button !== 0) return;
              tap(cell);
            }}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                e.preventDefault();
                tap(cell);
              }
            }}
          >
            {active ? (
              <>
                <svg className="forage-bed-icon" viewBox="0 0 32 32" aria-hidden>
                  <ellipse cx="16" cy="27" rx="10" ry="3" fill="rgba(0,0,0,0.45)" />
                  <path d="M16 26 V13" stroke={active.phase === 'gold' ? '#ffe588' : '#8ce892'} strokeWidth="2.4" strokeLinecap="round" />
                  <path d="M16 18 C11 17 8 13 9 9 C13 9 16 12 16 18 Z" fill={active.phase === 'gold' ? '#ffcf3a' : '#74d67c'} />
                  <path d="M16 15 C21 14 24 10 23 6 C19 6 16 9 16 15 Z" fill={active.phase === 'gold' ? '#ffe799' : '#9af09f'} />
                  {active.phase === 'gold' && <circle cx="16" cy="7" r="2" fill="#fff8d6" />}
                </svg>
                <span className="forage-bed-label">{label}</span>
                <span key={active.id} className="forage-bed-timer" style={{ animationDuration: `${windowMs}ms` }} aria-hidden />
              </>
            ) : (
              <>
                <svg className="forage-bed-icon" viewBox="0 0 32 32" aria-hidden>
                  <path d="M5 24 Q16 16 27 24 Z" fill="#3b2d20" stroke="#53402e" strokeWidth="1" />
                  <circle cx="16" cy="19" r="1.7" fill="#5e4b36" />
                </svg>
                <span className="forage-bed-sub">Dormant</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Idle 3×3 soil beds matching `ForagingGame` geometry so clicking any bed starts foraging with zero layout jump. */
export function ForagingBedsIdle({
  onStart,
  disabled,
  speciesName,
}: {
  onStart: () => void;
  disabled?: boolean;
  speciesName: string;
}) {
  return (
    <div className="forage-bed-grid idle" role="group" aria-label={`Garden beds for ${speciesName}`}>
      {Array.from({ length: 9 }, (_, cell) => (
        <button
          key={cell}
          type="button"
          className="forage-bed idle"
          disabled={disabled}
          title={disabled ? `${speciesName} is locked` : `Start foraging ${speciesName}`}
          aria-label={disabled ? `${speciesName} bed ${cell + 1} (locked)` : `Start foraging ${speciesName} from bed ${cell + 1}`}
          onClick={onStart}
        >
          <svg className="forage-bed-icon" viewBox="0 0 32 32" aria-hidden>
            <path d="M5 24 Q16 16 27 24 Z" fill="#3b2d20" stroke="#5a4633" strokeWidth="1" />
            <path d="M16 21 V15" stroke="#6ea568" strokeWidth="1.8" strokeLinecap="round" opacity="0.72" />
            <path d="M16 17 C13.5 16 12 14 12.5 12 C14.5 12 16 14 16 17 Z" fill="#70b46c" opacity="0.78" />
          </svg>
          <span className="forage-bed-sub">{disabled ? 'Locked' : 'Tap to forage'}</span>
        </button>
      ))}
    </div>
  );
}

const TELESCOPE_LOCK_TEXT: Record<SwingResult, string> = {
  double: 'Double! ×2 — Razor sharp',
  hit: 'Locked — Sharp focus',
  weak: 'Locked — Slightly hazy',
  miss: 'Locked — Out of focus',
};

/** Turn the telescope's focus ring and release to record the observation. */
function TelescopeGame({ onSwing }: { onSwing: OnSwing }) {
  const newTarget = (avoid: number) => {
    let t = random(0.12, 0.88);
    for (let i = 0; i < 8 && Math.abs(t - avoid) < 0.16; i++) t = random(0.12, 0.88);
    return t;
  };
  const ring = useRef(0.5);
  const target = useRef(newTarget(0.5));
  const turning = useRef(0);
  const turnPointer = useRef<number | null>(null);
  const sliderDrag = useRef<number | null>(null);
  const ringDrag = useRef<{ pointerId: number; lastAngle: number | null; start: number } | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<HTMLDivElement>(null);
  const onSwingRef = useRef(onSwing);
  onSwingRef.current = onSwing;
  const [pos, setPos] = useState(0.5);
  const [feedback, setFeedback] = useState<{ id: number; r: SwingResult } | null>(null);

  const move = (to: number) => {
    const clamped = Math.min(1, Math.max(0, to));
    ring.current = clamped;
    setPos(clamped);
  };

  const lock = () => {
    const r = focusResult(ring.current - target.current);
    onSwingRef.current(r);
    setFeedback({ id: Math.random(), r });
    target.current = newTarget(ring.current);
    turning.current = 0;
    turnPointer.current = null;
    sliderDrag.current = null;
    ringDrag.current = null;
  };

  const fromSliderPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = track.current?.getBoundingClientRect();
    if (box && box.width > 0) move((e.clientX - box.left) / box.width);
  };

  const angleFromCenter = (e: ReactPointerEvent<HTMLDivElement>): number | null => {
    const box = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    return Math.hypot(dx, dy) < 8 ? null : Math.atan2(dy, dx);
  };

  useEffect(() => {
    const el = scopeRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = Math.max(-0.04, Math.min(0.04, -e.deltaY * 0.00028));
      if (step !== 0) move(ring.current + step);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLElement && e.target.matches('input, textarea, select');
    const onKeyDown = (e: KeyboardEvent) => {
      if (typing(e) || turnPointer.current !== null || sliderDrag.current !== null || ringDrag.current) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); turning.current = -1; }
      else if (e.key === 'ArrowRight') { e.preventDefault(); turning.current = 1; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (turnPointer.current !== null) return;
      if ((e.key === 'ArrowLeft' && turning.current === -1) || (e.key === 'ArrowRight' && turning.current === 1)) lock();
    };
    const onBlur = () => { turning.current = 0; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useFrame((dt) => {
    if (turning.current) move(ring.current + (turning.current * TELESCOPE_TURN_PER_SEC * dt) / 1000);
  });
  useSpace(lock);

  const turnButton = (direction: -1 | 1) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (!e.isPrimary || e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      turnPointer.current = e.pointerId;
      turning.current = direction;
    },
    onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (turnPointer.current === e.pointerId && turning.current) lock();
    },
    onLostPointerCapture: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (turnPointer.current !== e.pointerId) return;
      turnPointer.current = null;
      turning.current = 0;
    },
    onClick: (e: ReactMouseEvent<HTMLButtonElement>) => {
      if (e.detail !== 0) return;
      move(ring.current + direction * 0.015);
      lock();
    },
  });

  const blur = Math.abs(pos - target.current) * TELESCOPE_BLUR_PX;
  return (
    <div className="mini-patch mini-sky mini-telescope">
      <div
        ref={scopeRef}
        className="telescope-scope-box"
        tabIndex={0}
        role="application"
        aria-label="Telescope optical scope. Turn the ring until the star is sharp, then release to lock focus."
        onPointerDown={(e) => {
          if (!e.isPrimary || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          ringDrag.current = { pointerId: e.pointerId, lastAngle: angleFromCenter(e), start: ring.current };
        }}
        onPointerMove={(e) => {
          const drag = ringDrag.current;
          if (!drag || e.pointerId !== drag.pointerId) return;
          const angle = angleFromCenter(e);
          if (angle === null) return;
          if (drag.lastAngle === null) {
            drag.lastAngle = angle;
            return;
          }
          let delta = angle - drag.lastAngle;
          if (delta > Math.PI) delta -= Math.PI * 2;
          if (delta < -Math.PI) delta += Math.PI * 2;
          drag.lastAngle = angle;
          move(ring.current + delta / (Math.PI * 2));
        }}
          onPointerUp={(e) => {
            const drag = ringDrag.current;
            if (drag?.pointerId === e.pointerId && Math.abs(drag.start - ring.current) > 0.001) lock();
          }}
          onLostPointerCapture={(e) => { if (ringDrag.current?.pointerId === e.pointerId) ringDrag.current = null; }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.repeat) {
            e.preventDefault();
            lock();
          }
        }}
      >
        <span className="telescope-index" aria-hidden />
        <div className="telescope-outer-ring" style={{ transform: `rotate(${(pos * 360).toFixed(2)}deg)` }} aria-hidden />
        <div className="telescope-inner-ring" style={{ transform: `rotate(${(-pos * 180).toFixed(2)}deg)` }} aria-hidden />
        <div className="telescope-eyepiece" aria-hidden>
          <div className="telescope-reticle">
            <span className="telescope-reticle-circle" />
          </div>
          <span className="telescope-center-star" style={{ filter: `blur(${blur.toFixed(1)}px)` }}>
            <svg viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="22" fill="#a9b8ff" opacity="0.22" />
              <circle cx="32" cy="32" r="13" fill="#dce6ff" opacity="0.45" />
              <path d="M32 3 L34.2 29.8 L61 32 L34.2 34.2 L32 61 L29.8 34.2 L3 32 L29.8 29.8 Z" fill="#ffffff" opacity="0.95" />
              <path d="M32 14 L35.5 28.5 L50 32 L35.5 35.5 L32 50 L28.5 35.5 L14 32 L28.5 28.5 Z" fill="#fff7d6" opacity="0.72" />
              <circle cx="32" cy="32" r="4.5" fill="#ffffff" />
            </svg>
          </span>
        </div>
      </div>
      <div className="telescope-controls">
        <button
          type="button"
          className="btn sm"
          aria-label="Turn the focus ring down"
          {...turnButton(-1)}
        >
          ◀
        </button>
        <div
          ref={track}
          className="telescope-ring"
          role="slider"
          tabIndex={0}
          aria-label="Fine focus dial"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos * 100)}
          onPointerDown={(e) => {
            if (!e.isPrimary || e.button !== 0) return;
            sliderDrag.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            fromSliderPointer(e);
          }}
          onPointerMove={(e) => { if (sliderDrag.current === e.pointerId) fromSliderPointer(e); }}
          onPointerUp={(e) => {
            if (sliderDrag.current !== e.pointerId) return;
            fromSliderPointer(e);
            lock();
          }}
          onLostPointerCapture={(e) => { if (sliderDrag.current === e.pointerId) sliderDrag.current = null; }}
        >
          <span className="telescope-knob" style={{ left: `${pos * 100}%` }} />
        </div>
        <button
          type="button"
          className="btn sm"
          aria-label="Turn the focus ring up"
          {...turnButton(1)}
        >
          ▶
        </button>
        <button type="button" className="btn sm ghost" onClick={lock} title="Use after adjusting with the scroll wheel">Lock Focus</button>
      </div>
      <div className="telescope-status" aria-live="polite">
        {feedback
          ? <span key={feedback.id} className={`telescope-lock-msg ${feedback.r}`}>{TELESCOPE_LOCK_TEXT[feedback.r]}</span>
          : <span>Release the ring or dial when the star is sharp. If you scroll to focus, press Space or Lock Focus.</span>}
      </div>
    </div>
  );
}

/** Three pots heat at their own pace: stir each in the band. One left to boil over just starts again. */
function CookingGame({ onSwing }: { onSwing: OnSwing }) {
  const newPot = () => ({ heat: random(0, 0.3), ms: random(2200, 3400) });
  const pots = useRef([...Array(POTS)].map(newPot));
  const fills = useRef<(HTMLDivElement | null)[]>([]);

  const stir = (i: number) => {
    const result = chargeResult(pots.current[i].heat, POT_ZONE);
    if (!result) return;
    pots.current[i] = newPot();
    onSwing(result);
  };

  useFrame((dt) => {
    pots.current.forEach((p, i) => {
      p.heat += dt / p.ms;
      if (p.heat >= 1) pots.current[i] = newPot();
      const fill = fills.current[i];
      if (fill) fill.style.width = `${pots.current[i].heat * 100}%`;
    });
  });

  return (
    <div className="mini-pots">
      {[...Array(POTS).keys()].map((i) => (
        <button key={i} className="mini-bar" aria-label={`Stir pot ${i + 1}`} onPointerDown={() => stir(i)}>
          <Zone at={POT_ZONE} width={CHARGE_ZONE_WIDTH} />
          <div className="mini-fill" ref={(el) => void (fills.current[i] = el)} />
        </button>
      ))}
    </div>
  );
}

const SIGHTING_TEXT: Record<SwingResult, string> = {
  double: 'Double Sighting! ×2',
  hit: 'Hit! +50% Focus',
  weak: 'Weak Sighting',
  miss: 'Missed landmark',
};

/** Take a sighting: tap when the vertical line crosses the landmark, then when the horizontal line crosses it. */
function CartographyGame({ onSwing }: { onSwing: OnSwing }) {
  const newTarget = () => ({ x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.6 });
  const [target, setTarget] = useState(newTarget);
  const [phase, setPhase] = useState<'x' | 'y' | 'result'>('x');
  const [lockedX, setLockedX] = useState<number | null>(null);
  const [lockedY, setLockedY] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<SwingResult | null>(null);
  const tRef = useRef(0);
  const posRef = useRef(0.5);
  const lockedXRef = useRef(0.5);
  const phaseRef = useRef<'x' | 'y' | 'result'>('x');
  const lineVRef = useRef<HTMLSpanElement>(null);
  const lineHRef = useRef<HTMLSpanElement>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSwingRef = useRef(onSwing);
  onSwingRef.current = onSwing;

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  useFrame((dt) => {
    if (phaseRef.current === 'result') return;
    tRef.current += dt;
    const p = 0.5 + 0.48 * Math.sin(tRef.current / 740);
    posRef.current = p;
    if (phaseRef.current === 'x' && lineVRef.current) lineVRef.current.style.left = `${p * 100}%`;
    if (phaseRef.current === 'y' && lineHRef.current) lineHRef.current.style.top = `${p * 100}%`;
  });

  const tap = () => {
    if (phaseRef.current === 'result') return;
    if (phaseRef.current === 'x') {
      lockedXRef.current = posRef.current;
      setLockedX(posRef.current);
      phaseRef.current = 'y';
      setPhase('y');
      tRef.current = 0;
      posRef.current = 0.5;
    } else {
      const lx = lockedXRef.current;
      const ly = posRef.current;
      const res = sightingResult(lx - target.x, ly - target.y);
      setLockedY(ly);
      setLastResult(res);
      phaseRef.current = 'result';
      setPhase('result');
      if (res === 'hit' || res === 'double') onSwingRef.current('hit');
      onSwingRef.current(res);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => {
        resetTimer.current = null;
        setTarget(newTarget());
        setLockedX(null);
        setLockedY(null);
        setLastResult(null);
        tRef.current = 0;
        posRef.current = 0.5;
        phaseRef.current = 'x';
        setPhase('x');
      }, 480);
    }
  };
  useSpace(tap);

  return (
    <div className="carto-sighting-wrap">
      <button
        type="button"
        className="carto-sighting"
        aria-label={phase === 'x' ? 'Lock vertical sighting' : phase === 'y' ? 'Lock horizontal sighting' : 'Sighting locked'}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          tap();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.repeat) {
            e.preventDefault();
            tap();
          }
        }}
      >
        <span className="carto-zone-hit" style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }} aria-hidden />
        <span className="carto-zone-double" style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }} aria-hidden />
        <span className="carto-landmark" style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }} aria-hidden />
        {phase === 'x' && <span ref={lineVRef} className="carto-line-v" style={{ left: '50%' }} aria-hidden />}
        {(phase === 'y' || phase === 'result') && lockedX !== null && (
          <span className="carto-line-v locked" style={{ left: `${lockedX * 100}%` }} aria-hidden />
        )}
        {phase === 'y' && <span ref={lineHRef} className="carto-line-h" style={{ top: '50%' }} aria-hidden />}
        {phase === 'result' && lockedY !== null && (
          <span className="carto-line-h locked" style={{ top: `${lockedY * 100}%` }} aria-hidden />
        )}
      </button>
      <div className={`carto-status ${lastResult ?? ''}`} aria-live="polite">
        {phase === 'result' && lastResult
          ? SIGHTING_TEXT[lastResult]
          : phase === 'x'
            ? '1/2 · Tap as vertical line crosses landmark'
            : '2/2 · Tap as horizontal line crosses landmark'}
      </div>
    </div>
  );
}

/** A lock shows its pin order, then you click it back. Quick hands count double. */
function ThievingGame({ onSwing }: { onSwing: OnSwing }) {
  const newOrder = () => [...Array(PINS).keys()].sort(() => Math.random() - 0.5).slice(0, LOCK_LENGTH);
  const [lock, setLock] = useState(() => ({ id: 0, order: newOrder() }));
  const [lit, setLit] = useState<number | null>(null);
  const [picked, setPicked] = useState(0);
  const [picking, setPicking] = useState(false);
  const pickFrom = useRef(0);

  useEffect(() => {
    const nextLock = () => setLock((l) => ({ id: l.id + 1, order: newOrder() }));
    let shown = 0;
    let wait: ReturnType<typeof setTimeout>;
    setPicked(0);
    setPicking(false);
    const show = () => {
      if (shown === lock.order.length) {
        setLit(null);
        setPicking(true);
        pickFrom.current = performance.now();
        wait = setTimeout(nextLock, LOCK_PATIENCE_MS);
        return;
      }
      setLit(lock.order[shown++]);
      wait = setTimeout(show, PIN_SHOW_MS);
    };
    wait = setTimeout(show, LOCK_NEXT_MS);
    return () => clearTimeout(wait);
  }, [lock]);

  const pick = (pin: number) => {
    if (!picking) return;
    if (pin !== lock.order[picked]) {
      onSwing('miss');
      setLock((l) => ({ id: l.id + 1, order: newOrder() }));
      return;
    }
    if (picked + 1 < lock.order.length) {
      setPicked(picked + 1);
      return;
    }
    // watching takes half the time, so a whole lock is worth two swings
    onSwing(quick(pickFrom.current, LOCK_PATIENCE_MS) ? 'double' : 'hit');
    onSwing('hit');
    setLock((l) => ({ id: l.id + 1, order: newOrder() }));
  };

  return (
    <div className="mini-timed">
      <div className={`mini-lock ${picking ? 'picking' : ''}`}>
        {[...Array(PINS).keys()].map((pin) => (
          <button key={pin} className={`mini-pin ${lit === pin ? 'lit' : ''} ${lock.order.slice(0, picked).includes(pin) ? 'set' : ''}`} aria-label={`Pin ${pin + 1}`} onPointerDown={() => pick(pin)} onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); pick(pin); } }} />
        ))}
      </div>
      {picking ? <Patience key={lock.id} ms={LOCK_PATIENCE_MS} /> : <span className="mini-patience idle" aria-hidden />}
    </div>
  );
}

type LiftPhase = 'away' | 'glancing' | 'watching';

const LIFT_BADGE: Record<LiftPhase, string> = {
  away: 'LIFT NOW! (spam click)',
  glancing: 'TURNING BACK!',
  watching: 'WATCHING — STOP',
};

/**
 * Street marks: tap rapidly while their back is turned; stop when they glance back or watch!
 * Starts immediately in the open window and awards partial 2–3 click snags when they start turning.
 */
function LiftGame({ markLevel, portrait, targetName, onSwing }: { markLevel: number; portrait?: string; targetName?: string; onSwing: OnSwing }) {
  const markLevelRef = useRef(markLevel);
  markLevelRef.current = markLevel;
  const onSwingRef = useRef(onSwing);
  onSwingRef.current = onSwing;

  const durationFor = (next: LiftPhase) => {
    if (next === 'away') {
      const min = Math.max(1350, 1600 - Math.floor(markLevelRef.current * 2.5));
      const max = Math.max(2400, 3500 - markLevelRef.current * 10);
      return random(min, max);
    }
    if (next === 'glancing') return random(460, 720);
    return random(650, 1550);
  };

  const stateRef = useRef({
    phase: 'away' as LiftPhase,
    startedAt: performance.now(),
    duration: durationFor('away'),
    clicks: 0,
    total: 0,
    glanced: false,
  });
  const uidRef = useRef(0);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const [phase, setPhase] = useState<LiftPhase>('away');
  const [clicks, setClicks] = useState(0);
  const [total, setTotal] = useState(0);
  const [caughtFlash, setCaughtFlash] = useState(false);
  const [popups, setPopups] = useState<{ id: number; x: number; y: number }[]>([]);
  const [alert, setAlert] = useState<{ id: number; kind: 'double' | 'hit' | 'glancing' | 'caught'; text: string } | null>(null);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  useEffect(() => {
    const st = stateRef.current;
    st.phase = 'away';
    st.startedAt = performance.now();
    st.duration = durationFor('away');
    st.clicks = 0;
    st.glanced = false;
    setPhase('away');
    setClicks(0);
    setAlert(null);
  }, [markLevel]);

  useFrame(() => {
    const st = stateRef.current;
    const now = performance.now();
    if (now - st.startedAt < st.duration) return;
    const next: LiftPhase = st.phase === 'watching' ? 'away' : st.phase === 'away' ? 'glancing' : 'watching';
    st.phase = next;
    st.startedAt = now;
    st.duration = durationFor(next);
    if (next === 'away') {
      st.clicks = 0;
      st.glanced = false;
      setClicks(0);
      setAlert(null);
    } else if (next === 'glancing') {
      if (st.clicks > 0 && st.clicks < LIFT_CLICKS_HIT) {
        const partial = liftSpamResult(st.clicks, false);
        if (partial) {
          onSwingRef.current(partial);
          setAlert({ id: ++uidRef.current, kind: 'hit', text: 'Quick snag · +5% Focus' });
        }
      }
      st.glanced = false;
    }
    setPhase(next);
  });

  const tap = () => {
    const st = stateRef.current;
    if (st.phase === 'away') {
      st.clicks += 1;
      st.total += 1;
      setClicks(st.clicks);
      setTotal(st.total);
      const popId = ++uidRef.current;
      setPopups((prev) => [...prev.slice(-7), { id: popId, x: random(28, 72), y: random(20, 56) }]);
      const t = setTimeout(() => {
        timers.current.delete(t);
        setPopups((prev) => prev.filter((p) => p.id !== popId));
      }, 560);
      timers.current.add(t);

      if (st.clicks % LIFT_CLICKS_HIT === 0) {
        const res = st.clicks % LIFT_CLICKS_DOUBLE === 0 ? 'double' : 'hit';
        onSwingRef.current(res);
        setAlert({
          id: ++uidRef.current,
          kind: res,
          text: res === 'double' ? 'Double Lift! ×2' : 'Hit! Focus +25%',
        });
      }
      return;
    }

    if (st.phase === 'glancing') {
      if (!st.glanced) {
        st.glanced = true;
        onSwingRef.current('weak');
        setAlert({ id: ++uidRef.current, kind: 'glancing', text: 'Close call — glancing back!' });
      }
      return;
    }

    // watching -> caught!
    st.clicks = 0;
    st.total = 0;
    setClicks(0);
    setTotal(0);
    onSwingRef.current(liftSpamResult(0, true)!);
    setAlert({ id: ++uidRef.current, kind: 'caught', text: 'Caught!' });
    setCaughtFlash(true);
    const t = setTimeout(() => {
      timers.current.delete(t);
      setCaughtFlash(false);
    }, 280);
    timers.current.add(t);
  };
  useSpace(tap);

  const headDeg = phase === 'away' ? 180 : phase === 'glancing' ? 88 : 0;
  const coneColor = phase === 'away' ? '#7fd696' : phase === 'glancing' ? '#e5a94c' : '#d6685e';
  const cycleClicks = clicks === 0 ? 0 : ((clicks - 1) % LIFT_CLICKS_DOUBLE) + 1;
  const progressText = cycleClicks >= LIFT_CLICKS_DOUBLE
    ? `${LIFT_CLICKS_DOUBLE}/${LIFT_CLICKS_DOUBLE} Double!`
    : cycleClicks >= LIFT_CLICKS_HIT
      ? `${cycleClicks}/${LIFT_CLICKS_DOUBLE} for Double`
      : `${cycleClicks}/${LIFT_CLICKS_HIT}`;

  return (
    <div
      className={`lift-arena ${phase} ${caughtFlash ? 'caught-flash' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Pickpocket mark: tap rapidly while looking away, stop when watching"
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        tap();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.repeat) {
          e.preventDefault();
          tap();
        }
      }}
    >
      <span className={`lift-badge ${phase}`}>{LIFT_BADGE[phase]}</span>
      <div className="lift-gaze-wrap">
        <svg className="lift-gaze-svg" viewBox="0 0 110 110" aria-hidden>
          <circle cx="55" cy="55" r="46" fill="none" stroke={coneColor} strokeOpacity="0.32" strokeWidth="2" strokeDasharray={phase === 'away' ? '5 4' : undefined} />
          <g className="lift-head-group" style={{ transform: `rotate(${headDeg}deg)` }}>
            <path d="M55,55 L27,92 A46,46 0 0 0 83,92 Z" fill={coneColor} opacity="0.3" />
            {portrait ? (
              <circle cx="55" cy="94" r="3.4" fill={phase === 'watching' ? '#ff7c70' : coneColor} />
            ) : (
              <>
                <circle cx="55" cy="55" r="18" fill="#1e222b" stroke={coneColor} strokeWidth="2.8" />
                <circle cx="49" cy="61" r="2.3" fill={phase === 'watching' ? '#ff7c70' : coneColor} />
                <circle cx="61" cy="61" r="2.3" fill={phase === 'watching' ? '#ff7c70' : coneColor} />
                <path d="M55,73 L50,67 L60,67 Z" fill={coneColor} opacity="0.85" />
              </>
            )}
          </g>
        </svg>
        {portrait && (
          <span className={`lift-portrait-token ${phase}`} aria-hidden>
            <Art src={portrait} alt={targetName ?? ''} size={38} fallback={<GameIcon name="thieving" size={20} />} />
          </span>
        )}
        {popups.map((p) => (
          <span key={p.id} className="lift-pop" style={{ left: `${p.x}%`, top: `${p.y}%` }} aria-hidden>+1</span>
        ))}
      </div>
      <div className="lift-progress-row">
        <div className="lift-pips" aria-hidden>
          {Array.from({ length: LIFT_CLICKS_DOUBLE }, (_, i) => (
            <span key={i} className="lift-pip-wrap" style={{ display: 'inline-flex', alignItems: 'center' }}>
              {i === LIFT_CLICKS_HIT && <span className="lift-pip-divider" />}
              <span className={`lift-pip ${i < LIFT_CLICKS_HIT ? 'hit' : 'double'} ${i < cycleClicks ? 'on' : ''}`} />
            </span>
          ))}
        </div>
        <span className="lift-count-text num">{progressText}</span>
        <span className="lift-streak num">Streak: {total}</span>
      </div>
      <div className={`lift-feedback ${alert?.kind ?? ''}`} aria-live="polite">
        {alert ? <span key={alert.id}>{alert.text}</span> : (phase === 'away' ? 'Tap or press Space while back is turned!' : 'Hands off until they turn away')}
      </div>
    </div>
  );
}

/** Always-present idle alley stage matching `LiftGame` geometry so clicking starts pickpocketing immediately. */
export function LiftGameIdle({
  targetName,
  portrait,
  locked,
  onStart,
}: {
  targetName: string;
  portrait?: string;
  locked?: boolean;
  onStart: () => void;
}) {
  return (
    <button
      type="button"
      className="lift-arena idle"
      disabled={locked}
      title={locked ? `${targetName} is locked` : `Start pickpocketing ${targetName}`}
      aria-label={locked ? `${targetName} (locked)` : `Start pickpocketing ${targetName}`}
      onClick={onStart}
    >
      <span className="lift-badge idle">{locked ? 'Target Locked' : 'Lantern Alley · Ready'}</span>
      <div className="lift-gaze-wrap">
        <svg className="lift-gaze-svg" viewBox="0 0 110 110" aria-hidden>
          <circle cx="55" cy="55" r="46" fill="none" stroke="#c9a35a" strokeOpacity="0.32" strokeWidth="2" strokeDasharray="5 4" />
          <path d="M55,55 L27,18 A46,46 0 0 1 83,18 Z" fill="#c9a35a" opacity="0.16" />
          {!portrait && (
            <>
              <circle cx="55" cy="55" r="18" fill="#1e222b" stroke="#c9a35a" strokeWidth="2.4" />
              <circle cx="49" cy="49" r="2.2" fill="#c9a35a" />
              <circle cx="61" cy="49" r="2.2" fill="#c9a35a" />
            </>
          )}
        </svg>
        {portrait && (
          <span className="lift-portrait-token idle" aria-hidden>
            <Art src={portrait} alt="" size={38} fallback={<GameIcon name="thieving" size={20} />} />
          </span>
        )}
      </div>
      <div className="lift-feedback idle">
        {locked ? `Reach the required level to work ${targetName}` : `Click or press Pickpocket to start working ${targetName}`}
      </div>
    </button>
  );
}

/** Tap soil squares to brush them away and free the find. Brushing a fragile crack chips it: clean is a double. */
function ArchaeologyGame({ onSwing }: { onSwing: OnSwing }) {
  const s = useGame();
  const cut = brushCrackCut(s.archaeology);
  const newPatch = () => {
    const patch = brushPatch({ next: Math.random }, cut);
    // the find shows through as a faint silhouette over 75% of its squares
    const shown = new Set([...patch.find].sort(() => Math.random() - 0.5).slice(0, Math.ceil(patch.find.length * 0.75)));
    return { id: Math.random(), patch, shown };
  };
  const [round, setRound] = useState(newPatch);
  const [brushed, setBrushed] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const brush = (n: number) => {
    if (finished || brushed.has(n)) return;
    const next = new Set(brushed).add(n);
    setBrushed(next);
    if (!brushDone(round.patch, next)) return;
    setFinished(true);
    const res = brushResult(brushChips(round.patch, next));
    if (res === 'double' || res === 'hit') onSwing('hit');
    onSwing(res);
    resetTimer.current = setTimeout(() => {
      resetTimer.current = null;
      setRound(newPatch());
      setBrushed(new Set());
      setFinished(false);
    }, 280);
  };

  const chips = brushChips(round.patch, brushed);
  return (
    <div className="mini-brush-wrap">
      <div className="mini-brush" style={{ gridTemplateColumns: `repeat(${BRUSH_COLS}, minmax(0, 1fr))` }} role="group" aria-label="Soil over a find">
        {[...Array(BRUSH_COLS * BRUSH_ROWS).keys()].map((n) => {
          const isFind = round.patch.find.includes(n);
          const isCrack = round.patch.cracks.includes(n);
          const open = brushed.has(n);
          const cls = ['mini-brush-tile', open ? 'open' : 'soil', open && isFind ? 'find' : '', !open && isFind && round.shown.has(n) ? 'ghost' : '', isCrack ? 'crack' : '', open && isCrack ? 'chipped' : ''].filter(Boolean).join(' ');
          return (
            <button key={n} type="button" className={cls} onClick={() => brush(n)} aria-label={open ? (isFind ? 'Brushed find' : isCrack ? 'Chipped crack' : 'Bare earth') : 'Soil'}>
              {open && isFind && <span aria-hidden>◆</span>}
              {open && isCrack && <span aria-hidden>✕</span>}
              {!open && isFind && round.shown.has(n) && <span aria-hidden>◇</span>}
              {!open && isCrack && <span aria-hidden>╱</span>}
            </button>
          );
        })}
      </div>
      <div className="mini-brush-chips" aria-label={`${chips} chips`}>
        <span>Chips {chips}</span>
        {[0, 1, 2].map((i) => <span key={i} className={`mini-brush-pip ${i < chips ? 'used' : ''}`} />)}
        <span className="dim small">0 is a double</span>
      </div>
    </div>
  );
}

/** Hold to pour the infusion and release at the marked target line. */
function AlchemyGame({ onSwing }: { onSwing: OnSwing }) {
  const [target, setTarget] = useState(() => 0.5 + Math.random() * 0.35);
  const [level, setLevel] = useState(0);
  const pouring = useRef(false);
  const levelRef = useRef(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  const reset = () => {
    pouring.current = false;
    levelRef.current = 0;
    setLevel(0);
    setTarget(0.5 + Math.random() * 0.35);
  };

  useFrame((dt) => {
    if (!pouring.current) return;
    const next = levelRef.current + (dt / 1800);
    if (next > 1) {
      onSwing(pourResult(1, true));
      reset();
      return;
    }
    levelRef.current = next;
    setLevel(next);
  });

  const startPour = () => { pouring.current = true; };
  const stopPour = () => {
    if (!pouring.current) return;
    onSwing(pourResult(levelRef.current - targetRef.current, false));
    reset();
  };
  useSpace(startPour, stopPour);

  return (
    <div className="alchemy-pour-wrap">
      <div className="alchemy-vial" aria-label="Infusion vial">
        <span className="alchemy-liquid" style={{ height: `${Math.min(100, level * 100)}%` }} />
        <span className="alchemy-target" style={{ bottom: `${target * 100}%` }} />
      </div>
      <button
        type="button"
        className="btn primary"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startPour(); }}
        onPointerUp={stopPour}
        onPointerCancel={stopPour}
      >
        Hold to pour
      </button>
    </div>
  );
}

/** Tap as the spinning facet line meets the fixed guide. */
function GemcuttingGame({ onSwing }: { onSwing: OnSwing }) {
  const s = useGame();
  const turn = gemTurnMs(levelOf('gemcutting', s.skills.gemcutting));
  const start = useRef(performance.now());
  const face = useRef<HTMLSpanElement>(null);
  const angle = () => ((performance.now() - start.current) % turn) * 360 / turn;
  useFrame(() => { if (face.current) face.current.style.transform = `rotate(${angle()}deg)`; });
  const cut = () => onSwing(angleResult(angle()));
  return <button className="lapidary-dop" type="button" onClick={cut} aria-label="Cut at the guide">
    <span className="lapidary-guide" aria-hidden="true" />
    <span className="lapidary-rotor" ref={face} aria-hidden="true"><span /></span>
    <span>Cut at the guide</span>
  </button>;
}

type Point = [number, number];

/** A jagged line across the stone, as points about STROKE_STEP apart. */
function newStroke(): Point[] {
  const corners: Point[] = [[24, random(24, 96)], [random(90, 120), random(16, 104)], [random(180, 210), random(16, 104)], [276, random(24, 96)]];
  const points: Point[] = [];
  corners.slice(1).forEach(([x, y], i) => {
    const [fromX, fromY] = corners[i];
    const steps = Math.ceil(Math.hypot(x - fromX, y - fromY) / STROKE_STEP);
    for (let n = 0; n < steps; n++) points.push([fromX + ((x - fromX) * n) / steps, fromY + ((y - fromY) * n) / steps]);
  });
  points.push(corners[corners.length - 1]);
  return points;
}

/** Drag along the rune's stroke without leaving the line. Hugging its gold middle is a double. */
function RuneGame({ onSwing }: { onSwing: OnSwing }) {
  const [stroke, setStroke] = useState(newStroke);
  const [carved, setCarved] = useState(0);
  const carving = useRef(false);
  const steadiness = useRef({ close: 0, all: 0 });
  const line = (points: Point[]) => points.map((p) => p.join(',')).join(' ');

  const toStone = (e: ReactPointerEvent<SVGSVGElement>): Point => {
    const box = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - box.left) / box.width) * STROKE_W, ((e.clientY - box.top) / box.height) * STROKE_H];
  };
  const finish = (r: SwingResult) => {
    carving.current = false;
    setCarved(0);
    setStroke(newStroke());
    onSwing(r);
  };
  const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const stop = () => {
    carving.current = false;
    setCarved(0);
  };

  return (
    <svg
      className="mini-rune"
      viewBox={`0 0 ${STROKE_W} ${STROKE_H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trace the rune's stroke"
      onPointerDown={(e) => {
        if (distance(toStone(e), stroke[0]) > STROKE_REACH * 1.5) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        carving.current = true;
        steadiness.current = { close: 0, all: 0 };
        setCarved(0);
      }}
      onPointerMove={(e) => {
        if (!carving.current) return;
        const at = toStone(e);
        let best = -1;
        let bestDistance = STROKE_REACH;
        for (let i = Math.max(0, carved - 6); i <= Math.min(stroke.length - 1, carved + STROKE_AHEAD); i++) {
          const gap = distance(at, stroke[i]);
          if (gap <= bestDistance) {
            best = i;
            bestDistance = gap;
          }
        }
        if (best < 0) return finish('miss');
        const st = steadiness.current;
        st.all += 1;
        if (bestDistance <= STROKE_CORE) st.close += 1;
        if (best === stroke.length - 1) finish(st.close >= st.all * STROKE_CORE_SHARE ? 'double' : 'hit');
        else setCarved(Math.max(carved, best));
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
    >
      <polyline className="mini-rune-line" points={line(stroke)} />
      <polyline className="mini-rune-core" points={line(stroke)} />
      <polyline className="mini-rune-cut" points={line(stroke.slice(0, carved + 1))} />
      <polyline className="mini-rune-start" points={line([stroke[0], stroke[0]])} />
    </svg>
  );
}

const CURVE_POINTS = [0.51, 0.63, 0.62, 0.48, 0.35, 0.43, 0.58, 0.62, 0.51] as const;
const CURVE_TIME = 4000;

function curveY(x: number): number {
  const point = Math.max(0, Math.min(1, x)) * (CURVE_POINTS.length - 1);
  const index = Math.min(CURVE_POINTS.length - 2, Math.floor(point));
  return CURVE_POINTS[index] + (CURVE_POINTS[index + 1] - CURVE_POINTS[index]) * (point - index);
}

function CurveGame({ onSwing }: { onSwing: OnSwing }) {
  const drag = useRef<{ pointer: number; start: number; x: number; y: number; distance: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(4);
  const finish = (complete: boolean) => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    onSwing(curveResult(current.distance / Math.max(0.01, current.x), complete && performance.now() - current.start <= CURVE_TIME));
    setProgress(0);
    setRemaining(4);
  };
  useFrame(() => {
    if (!drag.current) return;
    const left = CURVE_TIME - (performance.now() - drag.current.start);
    if (left <= 0) finish(false);
    else setRemaining(Math.ceil(left / 100) / 10);
  });
  const locate = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.08) / 0.84)), y: (event.clientY - rect.top) / rect.height };
  };
  const points = CURVE_POINTS.map((y, index) => `${8 + 84 * index / (CURVE_POINTS.length - 1)},${y * 40}`).join(' ');
  return <div className="wood-curve">
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" role="img" aria-label="Drawknife path. Drag the marked line from the left circle to the right circle."
      style={{ width: '100%', height: 128, touchAction: 'none' }}
      onPointerDown={(event) => {
        const point = locate(event);
        if (drag.current || point.x > 0.05 || Math.abs(point.y - curveY(0)) > 0.14) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointer: event.pointerId, start: performance.now(), x: 0, y: point.y, distance: 0 };
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || event.pointerId !== current.pointer) return;
        const { x, y } = locate(event);
        const dx = x - current.x;
        if (dx <= 0) return;
        const samples = Math.max(1, Math.ceil(dx * 100));
        for (let sample = 1; sample <= samples; sample++) {
          const fraction = sample / samples;
          current.distance += Math.abs(current.y + (y - current.y) * fraction - curveY(current.x + dx * fraction)) * dx / samples;
        }
        current.x = x;
        current.y = y;
        setProgress(x);
      }}
      onPointerUp={(event) => {
        if (event.pointerId === drag.current?.pointer) finish(drag.current.x >= 0.94 && Math.abs(locate(event).y - curveY(1)) <= 0.14);
      }}
      onPointerCancel={() => finish(false)}
      onLostPointerCapture={() => finish(false)}
    >
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      <circle cx="8" cy={curveY(0) * 40} r="2.4" fill="var(--accent)" />
      <circle cx="92" cy={curveY(1) * 40} r="2.4" fill="none" stroke="var(--accent)" />
      {progress > 0 && <circle cx={8 + 84 * progress} cy={40 * curveY(progress)} r="1.4" fill="white" />}
    </svg>
    <div className="row small"><span>Start</span><span className="spacer" /><span>{remaining.toFixed(1)}s</span><span className="spacer" /><span>Finish</span></div>
  </div>;
}

/** The game for a skill. `matId` is what the running action gathers. */
export function SkillGame({ skill, matId, markLevel, portrait, targetName, onSwing }: { skill: SkillId; matId?: string; /** set while a Thieving mark (not a Heist room) runs */ markLevel?: number; portrait?: string; targetName?: string; onSwing: OnSwing }) {
  switch (skill) {
    case 'woodcutting':
      return <SplitGame onSwing={onSwing} />;
    case 'harvesting':
      return <ForagingGame matId={matId} onSwing={onSwing} />;
    case 'thieving':
      return markLevel !== undefined ? <LiftGame markLevel={markLevel} portrait={portrait} targetName={targetName} onSwing={onSwing} /> : <ThievingGame onSwing={onSwing} />;
    case 'agility':
      return <WoodcuttingGame onSwing={onSwing} />;
    case 'archaeology':
      return <ArchaeologyGame onSwing={onSwing} />;
    case 'woodcrafting':
      return <CurveGame onSwing={onSwing} />;
    case 'alchemy':
      return <AlchemyGame onSwing={onSwing} />;
    case 'gemcutting':
      return <GemcuttingGame onSwing={onSwing} />;
    case 'runecarving':
      return <RuneGame onSwing={onSwing} />;
    case 'cooking':
      return <CookingGame onSwing={onSwing} />;
    case 'cartography':
      return <CartographyGame onSwing={onSwing} />;
    case 'astrology':
      return <TelescopeGame onSwing={onSwing} />;
    default:
      return null;
  }
}

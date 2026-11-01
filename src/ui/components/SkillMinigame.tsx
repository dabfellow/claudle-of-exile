import { useEffect, useRef, useState } from 'react';
import { actionDef, SKILLS } from '../../data/skills';
import { CHARGE_ZONE_WIDTH, chargeResult, focusMult, focusOf, hasMinigame, MAX_FOCUS_SPEED, minigameSwing, type SwingResult } from '../../engine/minigame';
import type { SkillId } from '../../engine/types';
import { game, useGame } from '../../game';
import { MatIcon, ProgressBar } from './common';

const CHARGE_MS = 1100;
const SWEEP_MS = 1200;
const REST_MS = 400;
const WOOD_ZONE = 0.18;
const HERB_EVERY_MS = 1500;
const HERB_LIFE_MS = 2200;
const HERBS_MAX = 3;

const HOW_TO: Partial<Record<SkillId, string>> = {
  mining: 'Hold to charge your pick, then release in the bright band. Too long and it overcharges.',
  woodcutting: 'Swing while the marker is in the bright band.',
  harvesting: 'Click herbs as they pop up, before they wilt.',
};

const RESULT_TEXT: Record<SwingResult, string> = { hit: 'Clean hit', weak: 'Weak hit', miss: 'Miss' };

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

/** Hold to charge, release in the band. */
function MiningGame({ onSwing }: { onSwing: (r: SwingResult) => void }) {
  const newZone = () => random(0.68, 0.84);
  const [zone, setZone] = useState(newZone);
  const fill = useRef<HTMLDivElement>(null);
  const swing = useRef({ charging: false, charge: 0, restUntil: 0 });

  const start = () => {
    if (performance.now() < swing.current.restUntil) return;
    swing.current.charging = true;
    swing.current.charge = 0;
  };
  const release = () => {
    const sw = swing.current;
    if (!sw.charging) return;
    sw.charging = false;
    const result = chargeResult(sw.charge, zone);
    if (!result) {
      sw.charge = 0;
      return;
    }
    sw.restUntil = performance.now() + REST_MS;
    setZone(newZone());
    onSwing(result);
  };

  useFrame((dt) => {
    const sw = swing.current;
    if (sw.charging) {
      sw.charge = Math.min(1, sw.charge + dt / CHARGE_MS);
      if (sw.charge >= 1) release();
    } else if (performance.now() >= sw.restUntil) sw.charge = 0;
    if (fill.current) fill.current.style.width = `${sw.charge * 100}%`;
  });
  useSpace(start, release);

  return (
    <button
      className="mini-bar"
      aria-label="Hold to charge your pick"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <span className="mini-zone" style={{ left: `${zone * 100}%`, width: `${CHARGE_ZONE_WIDTH * 100}%` }} />
      <div className="mini-fill" ref={fill} />
    </button>
  );
}

/** A marker sweeps the bar: swing while it's in the band. */
function WoodcuttingGame({ onSwing }: { onSwing: (r: SwingResult) => void }) {
  const newZone = () => random(0.1, 0.72);
  const [zone, setZone] = useState(newZone);
  const marker = useRef<HTMLDivElement>(null);
  const swing = useRef({ t: 0, pos: 0, restUntil: 0 });

  const chop = () => {
    const sw = swing.current;
    if (performance.now() < sw.restUntil) return;
    sw.restUntil = performance.now() + REST_MS;
    const inZone = sw.pos >= zone && sw.pos <= zone + WOOD_ZONE;
    if (inZone) setZone(newZone());
    onSwing(inZone ? 'hit' : 'miss');
  };

  useFrame((dt) => {
    const sw = swing.current;
    sw.t += dt;
    sw.pos = 1 - Math.abs(((sw.t / SWEEP_MS) % 2) - 1);
    if (marker.current) marker.current.style.left = `${sw.pos * 100}%`;
  });
  useSpace(chop);

  return (
    <button className="mini-bar" aria-label="Swing your axe" onPointerDown={chop}>
      <span className="mini-zone" style={{ left: `${zone * 100}%`, width: `${WOOD_ZONE * 100}%` }} />
      <div className="mini-marker" ref={marker} />
    </button>
  );
}

interface Herb {
  id: number;
  x: number;
  y: number;
}

/** Herbs pop up around the patch and wilt if you leave them. */
function ForagingGame({ matId, onSwing }: { matId?: string; onSwing: (r: SwingResult) => void }) {
  const [herbs, setHerbs] = useState<Herb[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const grow = () => {
      const id = nextId.current++;
      setHerbs((list) => (list.length >= HERBS_MAX ? list : [...list, { id, x: random(4, 92), y: random(8, 72) }]));
      const wilt = setTimeout(() => {
        timers.delete(wilt);
        setHerbs((list) => list.filter((h) => h.id !== id));
      }, HERB_LIFE_MS);
      timers.add(wilt);
    };
    grow();
    const growth = setInterval(grow, HERB_EVERY_MS);
    return () => {
      clearInterval(growth);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="mini-patch">
      {herbs.map((h) => (
        <button
          key={h.id}
          className="mini-herb"
          aria-label="Pick herb"
          style={{ left: `${h.x}%`, top: `${h.y}%`, animationDuration: `${HERB_LIFE_MS}ms` }}
          onPointerDown={() => {
            setHerbs((list) => list.filter((x) => x.id !== h.id));
            onSwing('hit');
          }}
        >
          {matId && <MatIcon id={matId} size={22} />}
        </button>
      ))}
    </div>
  );
}

/** The manual side of a gathering skill: play it for Focus, or leave it running. */
export function SkillMinigame({ skill }: { skill: SkillId }) {
  const s = useGame();
  const [result, setResult] = useState<{ id: number; r: SwingResult } | null>(null);
  if (!hasMinigame(skill)) return null;
  const action = s.action?.kind === 'skill' ? actionDef(s.action.actionId) : null;
  if (action?.skill !== skill) return <div className="callout skill-note">Start an activity and play it by hand to work up to {Math.round(MAX_FOCUS_SPEED * 100)}% faster than leaving it to idle.</div>;

  const onSwing = (r: SwingResult) => {
    game.act((st) => minigameSwing(st, r));
    setResult({ id: Math.random(), r });
  };
  const color = SKILLS[skill].color;
  return (
    <div className="card minigame">
      <div className="card-title">
        Focus
        <span className="grow" />
        <span className="card-hint">{HOW_TO[skill]}</span>
      </div>
      {skill === 'mining' && <MiningGame onSwing={onSwing} />}
      {skill === 'woodcutting' && <WoodcuttingGame onSwing={onSwing} />}
      {skill === 'harvesting' && <ForagingGame matId={Object.keys(action.outputs ?? {})[0]} onSwing={onSwing} />}
      <div className="row minigame-foot">
        <ProgressBar value={focusOf(s)} color={color} className="grow" />
        <span className="num small">+{Math.round((focusMult(s) - 1) * 100)}% speed</span>
        {result && (
          <span key={result.id} className={`minigame-result ${result.r}`}>
            {RESULT_TEXT[result.r]}
          </span>
        )}
      </div>
    </div>
  );
}

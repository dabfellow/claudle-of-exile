import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  CHARGE_ZONE_WIDTH,
  chargeResult,
  DOUBLE_SHARE,
  doubleZoneStart,
  inDoubleZone,
  strikeResult,
  surveyDistance,
  surveyResult,
  SURVEY_COLS,
  SURVEY_DOUBLE,
  SURVEY_ROWS,
  SURVEY_SOUNDINGS,
  type SwingResult,
} from '../../engine/minigame';
import type { SkillId } from '../../engine/types';
import { MatIcon } from './common';

const CHARGE_MS = 1100;
const SWEEP_MS = 1200;
const LANDED_MS = 400;
const WOOD_ZONE = 0.18;
/** Foraging: herbs grow a little faster than they wilt, and are in bloom (gold) for part of their life. */
const HERB_EVERY_MS = 1300;
const HERB_LIFE_MS = 3400;
const HERB_BLOOM_FROM = 0.3;
const HERB_BLOOM_TO = 0.55;
const HERBS_MAX = 3;
const PINS = 4;
const LOCK_LENGTH = 3;
const PIN_SHOW_MS = 380;
const LOCK_PATIENCE_MS = 3000;
const LOCK_NEXT_MS = 250;
const RING_MS = 1250;
const RING_LATE_MS = 300;
const HEAT_RISE_PER_SEC = 0.7;
const HEAT_FALL_PER_SEC = 0.55;
const HEAT_BAND = 0.26;
const HEAT_HOLD_MS = 1250;
const FACETS = 3;
const STONE_SETTLES_MS = 5200;
const PLOT_TILES = 15;
const PLOT_CRACKS = 4;
const PLOT_PATIENCE_MS = 7000;
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
const SURVEY_PATIENCE_MS = 15000;
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

/** Hold to charge, release in the band. */
function MiningGame({ onSwing }: { onSwing: OnSwing }) {
  const newZone = () => random(0.68, 0.84);
  const [zone, setZone] = useState(newZone);
  const fill = useRef<HTMLDivElement>(null);
  const swing = useRef({ charging: false, charge: 0, shownUntil: 0 });

  const start = () => {
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
    sw.shownUntil = performance.now() + LANDED_MS;
    setZone(newZone());
    onSwing(result);
  };

  useFrame((dt) => {
    const sw = swing.current;
    if (sw.charging) {
      sw.charge = Math.min(1, sw.charge + dt / CHARGE_MS);
      if (sw.charge >= 1) release();
    } else if (performance.now() >= sw.shownUntil) sw.charge = 0;
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
      <Zone at={zone} width={CHARGE_ZONE_WIDTH} />
      <div className="mini-fill" ref={fill} />
    </button>
  );
}

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
    <button className="mini-bar" aria-label="Swing your axe" onPointerDown={chop}>
      <Zone at={zone} width={WOOD_ZONE} />
      <div className="mini-marker" ref={marker} />
    </button>
  );
}

interface Herb {
  id: number;
  x: number;
  y: number;
  born: number;
}

/** Herbs pop up around the patch and wilt if you leave them. Picked in bloom, they count double. */
function ForagingGame({ matId, onSwing }: { matId?: string; onSwing: OnSwing }) {
  const [herbs, setHerbs] = useState<Herb[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const grow = () => {
      const id = nextId.current++;
      setHerbs((list) => (list.length >= HERBS_MAX ? list : [...list, { id, x: random(2, 78), y: random(5, 52), born: performance.now() }]));
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

  const pick = (h: Herb) => {
    setHerbs((list) => list.filter((x) => x.id !== h.id));
    const age = (performance.now() - h.born) / HERB_LIFE_MS;
    onSwing(age >= HERB_BLOOM_FROM && age <= HERB_BLOOM_TO ? 'double' : 'hit');
  };

  return (
    <div className="mini-patch">
      {herbs.map((h) => (
        <button
          key={h.id}
          className="mini-herb"
          aria-label="Pick herb"
          style={{ left: `${h.x}%`, top: `${h.y}%`, animationDuration: `${HERB_LIFE_MS}ms` }}
          onPointerDown={() => pick(h)}
        >
          {matId && <MatIcon id={matId} size={26} />}
        </button>
      ))}
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

/** Sound the fog for a hidden landmark: every sounding shows how many steps off it is. Found within three is a double. */
function CartographyGame({ onSwing }: { onSwing: OnSwing }) {
  const tiles = SURVEY_COLS * SURVEY_ROWS;
  const newSurvey = () => ({ id: Math.random(), landmark: Math.floor(Math.random() * tiles) });
  const [survey, setSurvey] = useState(newSurvey);
  const [soundings, setSoundings] = useState<number[]>([]);

  const next = () => {
    setSurvey(newSurvey());
    setSoundings([]);
  };

  useEffect(() => {
    const giveUp = setTimeout(next, SURVEY_PATIENCE_MS);
    return () => clearTimeout(giveUp);
  }, [survey]);

  const sound = (tile: number) => {
    if (soundings.includes(tile)) return;
    const taken = [...soundings, tile];
    const result = surveyResult(tile === survey.landmark, taken.length);
    if (!result) {
      setSoundings(taken);
      return;
    }
    onSwing(result);
    // a survey takes a few seconds of thought, so a clean one is worth two swings
    if (result === 'hit' || result === 'double') onSwing('hit');
    next();
  };

  return (
    <div className="mini-survey-wrap">
      <div className="mini-survey" style={{ gridTemplateColumns: `repeat(${SURVEY_COLS}, minmax(0, 1fr))` }}>
        {[...Array(tiles).keys()].map((tile) => (
          <button key={tile} className={`mini-sounding ${soundings.includes(tile) ? 'sounded' : ''}`} aria-label={`Sound tile ${tile + 1}`} onPointerDown={() => sound(tile)}>
            {soundings.includes(tile) ? surveyDistance(tile, survey.landmark) : ''}
          </button>
        ))}
      </div>
      <div className="mini-soundings" aria-label={`${soundings.length} of ${SURVEY_SOUNDINGS} soundings used`}>
        {[...Array(SURVEY_SOUNDINGS).keys()].map((i) => (
          <span key={i} className={`mini-sounding-pip ${i < SURVEY_DOUBLE ? 'double' : ''} ${i < soundings.length ? 'used' : ''}`} />
        ))}
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
          <button key={pin} className={`mini-pin ${lit === pin ? 'lit' : ''} ${lock.order.slice(0, picked).includes(pin) ? 'set' : ''}`} aria-label={`Pin ${pin + 1}`} onPointerDown={() => pick(pin)} />
        ))}
      </div>
      {picking ? <Patience key={lock.id} ms={LOCK_PATIENCE_MS} /> : <span className="mini-patience idle" aria-hidden />}
    </div>
  );
}

/** Drag across the plot to brush the soil away. Clearing it finds the piece; touching a cracked stone breaks it. */
function ArchaeologyGame({ onSwing }: { onSwing: OnSwing }) {
  const newPlot = () => ({ id: Math.random(), at: performance.now(), cracked: new Set([...Array(PLOT_TILES).keys()].sort(() => Math.random() - 0.5).slice(0, PLOT_CRACKS)) });
  const [plot, setPlot] = useState(newPlot);
  const [brushed, setBrushed] = useState<Set<number>>(new Set());
  const held = useRef(false);

  const next = () => {
    setPlot(newPlot());
    setBrushed(new Set());
  };

  useEffect(() => {
    const giveUp = setTimeout(next, PLOT_PATIENCE_MS);
    return () => clearTimeout(giveUp);
  }, [plot]);

  const brush = (x: number, y: number) => {
    const tile = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-tile]');
    if (!held.current || !tile) return;
    const n = Number(tile.dataset.tile);
    if (brushed.has(n)) return;
    if (plot.cracked.has(n)) {
      held.current = false;
      onSwing('miss');
      next();
      return;
    }
    const done = new Set(brushed).add(n);
    setBrushed(done);
    if (done.size < PLOT_TILES - PLOT_CRACKS) return;
    // a plot takes a few seconds to clear, so it's worth two swings
    held.current = false;
    onSwing(quick(plot.at, PLOT_PATIENCE_MS) ? 'double' : 'hit');
    onSwing('hit');
    next();
  };

  return (
    <div className="mini-timed">
      <div
        className="mini-plot"
        onPointerDown={(e) => {
          // a touch captures the pointer to whatever it landed on: let go so the drag reaches every tile
          (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
          held.current = true;
          brush(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => brush(e.clientX, e.clientY)}
        onPointerUp={() => (held.current = false)}
        onPointerLeave={() => (held.current = false)}
      >
        {[...Array(PLOT_TILES).keys()].map((n) => (
          <span key={n} data-tile={n} className={`mini-tile ${plot.cracked.has(n) ? 'cracked' : ''} ${brushed.has(n) ? 'brushed' : ''}`} />
        ))}
      </div>
      <Patience key={plot.id} ms={PLOT_PATIENCE_MS} />
    </div>
  );
}

/** A ring closes on the anvil: strike as it lands. Dead on is a double. */
function SmithingGame({ onSwing }: { onSwing: OnSwing }) {
  const ring = useRef<HTMLSpanElement>(null);
  const beat = useRef(0);

  const strike = () => {
    onSwing(strikeResult(beat.current - RING_MS));
    beat.current = 0;
  };

  useFrame((dt) => {
    beat.current += dt;
    if (beat.current > RING_MS + RING_LATE_MS) beat.current = 0;
    if (ring.current) ring.current.style.transform = `scale(${1 + 2.2 * Math.max(0, 1 - beat.current / RING_MS)})`;
  });
  useSpace(strike);

  return (
    <button className="mini-anvil" aria-label="Strike the anvil" onPointerDown={strike}>
      <span className="mini-strike" />
      <span className="mini-strike-double" />
      <span className="mini-ring" ref={ring} />
    </button>
  );
}

/** Hold to heat, let go to cool, and keep the needle in a band that drifts along the bar. Mostly in its gold middle is a double. */
function AlchemyGame({ onSwing }: { onSwing: OnSwing }) {
  const needle = useRef<HTMLSpanElement>(null);
  const band = useRef<HTMLSpanElement>(null);
  const core = useRef<HTMLSpanElement>(null);
  const steady = useRef<HTMLSpanElement>(null);
  const brew = useRef({ heating: false, heat: 0.4, t: 0, held: 0, inCore: 0 });

  const heat = () => {
    brew.current.heating = true;
  };
  const cool = () => {
    brew.current.heating = false;
  };

  useFrame((dt) => {
    const b = brew.current;
    b.t += dt;
    b.heat = Math.min(1, Math.max(0, b.heat + ((b.heating ? HEAT_RISE_PER_SEC : -HEAT_FALL_PER_SEC) * dt) / 1000));
    const low = 0.37 + 0.33 * Math.sin(b.t / 1900) * Math.cos(b.t / 4300);
    if (b.heat >= low && b.heat <= low + HEAT_BAND) {
      b.held += dt;
      if (inDoubleZone(b.heat, low, HEAT_BAND)) b.inCore += dt;
    } else {
      b.held = 0;
      b.inCore = 0;
    }
    if (b.held >= HEAT_HOLD_MS) {
      onSwing(b.inCore >= HEAT_HOLD_MS / 2 ? 'double' : 'hit');
      b.held = 0;
      b.inCore = 0;
    }
    if (needle.current) needle.current.style.left = `${b.heat * 100}%`;
    if (band.current) {
      band.current.style.left = `${low * 100}%`;
      band.current.style.width = `${HEAT_BAND * 100}%`;
    }
    if (core.current) {
      core.current.style.left = `${doubleZoneStart(low, HEAT_BAND) * 100}%`;
      core.current.style.width = `${HEAT_BAND * DOUBLE_SHARE * 100}%`;
    }
    if (steady.current) {
      steady.current.style.width = `${(b.held / HEAT_HOLD_MS) * 100}%`;
      steady.current.classList.toggle('double', b.inCore >= HEAT_HOLD_MS / 2);
    }
  });
  useSpace(heat, cool);

  return (
    <button
      className="mini-heat"
      aria-label="Hold to heat the brew"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        heat();
      }}
      onPointerUp={cool}
      onPointerCancel={cool}
    >
      <span className="mini-tube">
        <span className="mini-tube-band" ref={band} />
        <span className="mini-double" ref={core} />
        <span className="mini-needle" ref={needle} />
      </span>
      <span className="mini-steady" ref={steady} />
    </button>
  );
}

/** Three numbered facets: cut them in order before the stone settles. Quick cuts count double. */
function GemcuttingGame({ onSwing }: { onSwing: OnSwing }) {
  const newStone = () => {
    const spots = [...Array(FACETS).keys()].map((i) => ({ x: 4 + (i * 80) / FACETS + random(0, 12), y: random(6, 44) }));
    const shuffled = [...spots].sort(() => Math.random() - 0.5);
    return { id: Math.random(), at: performance.now(), facets: shuffled };
  };
  const [stone, setStone] = useState(newStone);
  const [cut, setCut] = useState(0);

  useEffect(() => {
    setCut(0);
    const settle = setTimeout(() => setStone(newStone()), STONE_SETTLES_MS);
    return () => clearTimeout(settle);
  }, [stone]);

  const choose = (facet: number) => {
    if (facet !== cut) {
      onSwing('miss');
      setStone(newStone());
    } else if (facet + 1 < FACETS) setCut(facet + 1);
    else {
      onSwing(quick(stone.at, STONE_SETTLES_MS) ? 'double' : 'hit');
      setStone(newStone());
    }
  };

  return (
    <div className="mini-timed">
      <div className="mini-stone">
        {stone.facets.map((f, i) => (
          <button key={i} className={`mini-facet ${i < cut ? 'cut' : ''}`} style={{ left: `${f.x}%`, top: `${f.y}%` }} disabled={i < cut} onPointerDown={() => choose(i)}>
            {i + 1}
          </button>
        ))}
      </div>
      <Patience key={stone.id} ms={STONE_SETTLES_MS} />
    </div>
  );
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

/** The game for a skill. `matId` is what the running action gathers. */
export function SkillGame({ skill, matId, onSwing }: { skill: SkillId; matId?: string; onSwing: OnSwing }) {
  switch (skill) {
    case 'mining':
      return <MiningGame onSwing={onSwing} />;
    case 'woodcutting':
      return <WoodcuttingGame onSwing={onSwing} />;
    case 'harvesting':
      return <ForagingGame matId={matId} onSwing={onSwing} />;
    case 'thieving':
      return <ThievingGame onSwing={onSwing} />;
    case 'archaeology':
      return <ArchaeologyGame onSwing={onSwing} />;
    case 'smithing':
      return <SmithingGame onSwing={onSwing} />;
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
    default:
      return null;
  }
}

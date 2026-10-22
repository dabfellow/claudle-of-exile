import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { isCurrency, materialDef } from '../../data/materials';
import { Orb, Swatch } from './Icon';

export function ProgressBar({
  value,
  color = 'var(--accent)',
  size,
  label,
  smooth,
  ghost,
  className = '',
}: {
  value: number;
  color?: string;
  size?: 'md' | 'lg';
  label?: ReactNode;
  smooth?: boolean;
  /** show a trailing "damage taken" ghost segment */
  ghost?: boolean;
  className?: string;
}) {
  const pct = `${Math.max(0, Math.min(1, value)) * 100}%`;
  return (
    <div className={`bar ${size ?? ''} ${className}`}>
      {ghost && <div className="bar-ghost" style={{ width: pct }} />}
      <div className={`bar-fill ${smooth ? 'smooth' : ''}`} style={{ width: pct, background: color }} />
      {label !== undefined && <div className="bar-label">{label}</div>}
    </div>
  );
}

export function fmt(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}k`;
  return Math.floor(n).toLocaleString();
}

export function fmtTime(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** A material/currency glyph. */
export function MatIcon({ id, size = 14 }: { id: string; size?: number }) {
  const def = materialDef(id);
  if (isCurrency(id) || id === 'gold') return <Orb color={def.color} size={size} />;
  return <Swatch color={def.color} size={size * 0.8} />;
}

export function Cost({ cost, have }: { cost: Record<string, number>; have: Record<string, number> }) {
  return (
    <div className="io">
      {Object.entries(cost).map(([id, n]) => (
        <span key={id} className={`io-item ${(have[id] ?? 0) < n ? 'missing' : ''}`} title={materialDef(id).name}>
          <MatIcon id={id} size={12} />
          <span className="num">
            {fmt(n)} {materialDef(id).name}
          </span>
        </span>
      ))}
    </div>
  );
}

// ---------- Alt key ----------

let altDown = false;
const altListeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  const set = (v: boolean) => {
    if (altDown === v) return;
    altDown = v;
    altListeners.forEach((l) => l());
  };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Alt') {
      e.preventDefault(); // stop the browser menu bar from grabbing focus
      set(true);
    }
  });
  window.addEventListener('keyup', (e) => e.key === 'Alt' && set(false));
  window.addEventListener('blur', () => set(false));
}

/** True while the Alt key is held anywhere on the page. */
export function useAltKey(): boolean {
  return useSyncExternalStore(
    (fn) => {
      altListeners.add(fn);
      return () => altListeners.delete(fn);
    },
    () => altDown,
  );
}

/**
 * Hover tooltip rendered in a fixed layer that follows the cursor.
 * Holding Alt keeps it open where it is, even after the cursor leaves.
 */
export function Tooltip({
  content,
  children,
  style,
  svg,
}: {
  content: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  /** wrap in an SVG <g> instead of a <span> (for use inside <svg>) */
  svg?: boolean;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [hovering, setHovering] = useState(false);
  const alt = useAltKey();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // when Alt is released after the cursor left, close it
  useEffect(() => {
    if (!alt && !hovering && pos) setPos(null);
  }, [alt, hovering, pos]);

  useEffect(() => {
    if (pos && ref.current) {
      const r = ref.current.getBoundingClientRect();
      if (r.width !== size.w || r.height !== size.h) setSize({ w: r.width, h: r.height });
    }
  });

  let left = 0;
  let top = 0;
  if (pos) {
    left = pos.x + 16;
    top = pos.y + 16;
    if (left + size.w > window.innerWidth - 8) left = pos.x - size.w - 12;
    if (top + size.h > window.innerHeight - 8) top = Math.max(8, window.innerHeight - size.h - 8);
  }

  const frozen = alt && !hovering;
  const layer =
    pos &&
    createPortal(
      <div className={`tooltip-layer ${frozen ? 'frozen' : ''}`} style={{ left, top }} ref={ref}>
        {content}
      </div>,
      document.body,
    );
  const handlers = {
    onMouseMove: (e: React.MouseEvent) => {
      setHovering(true);
      // with Alt held the tooltip stays put so you can read it
      if (!altDown || !pos) setPos({ x: e.clientX, y: e.clientY });
    },
    onMouseLeave: () => {
      setHovering(false);
      if (!altDown) setPos(null);
    },
  };
  if (svg) {
    return (
      <g {...handlers}>
        {children}
        {layer}
      </g>
    );
  }
  return (
    <span style={{ display: 'contents', ...style }} {...handlers}>
      {children}
      {layer}
    </span>
  );
}

// ---------- pinned tooltips ----------

export interface Pin {
  key: string;
  title: string;
  render: () => ReactNode;
}

let pins: Pin[] = [];
const pinListeners = new Set<() => void>();
const MAX_PINS = 4;

function emitPins() {
  pinListeners.forEach((l) => l());
}

/** Pin a tooltip to the compare dock (or unpin it if it's already there). */
export function togglePin(pin: Pin): void {
  pins = pins.some((p) => p.key === pin.key) ? pins.filter((p) => p.key !== pin.key) : [...pins, pin].slice(-MAX_PINS);
  emitPins();
}

export function unpin(key: string): void {
  pins = pins.filter((p) => p.key !== key);
  emitPins();
}

export function clearPins(): void {
  pins = [];
  emitPins();
}

export function usePins(): Pin[] {
  return useSyncExternalStore(
    (fn) => {
      pinListeners.add(fn);
      return () => pinListeners.delete(fn);
    },
    () => pins,
  );
}

/** The row of pinned tooltips along the bottom of the screen. */
export function PinDock() {
  const list = usePins();
  if (!list.length) return null;
  return (
    <div className="pin-dock">
      <div className="pin-dock-head">
        <span>Pinned · right-click an item to pin or unpin</span>
        <button className="btn sm ghost" onClick={clearPins}>
          Clear
        </button>
      </div>
      <div className="pin-row">
        {list.map((p) => (
          <div key={p.key} className="pin">
            <button className="pin-close" title="Unpin" onClick={() => unpin(p.key)}>
              ×
            </button>
            {p.render()}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A picture from public/art if it exists, otherwise the fallback (styled placeholder). */
const missingArt = new Set<string>();
export function Art({ src, alt, fallback, className, size }: { src: string; alt: string; fallback: ReactNode; className?: string; size?: number }) {
  const [failed, setFailed] = useState(missingArt.has(src));
  if (failed) return <>{fallback}</>;
  return (
    <img
      className={`art ${className ?? ''}`}
      src={`/art/${src}`}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      onError={() => {
        missingArt.add(src);
        setFailed(true);
      }}
    />
  );
}

/** Briefly true after `key` changes — used to retrigger CSS animations. */
export function usePulse(key: unknown, ms = 300): boolean {
  const [on, setOn] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setOn(true);
    const t = setTimeout(() => setOn(false), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return on;
}

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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

/** Hover tooltip rendered in a fixed layer that follows the cursor. */
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
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

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

  const layer =
    pos &&
    createPortal(
      <div className="tooltip-layer" style={{ left, top }} ref={ref}>
        {content}
      </div>,
      document.body,
    );
  const handlers = {
    onMouseMove: (e: React.MouseEvent) => setPos({ x: e.clientX, y: e.clientY }),
    onMouseLeave: () => setPos(null),
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

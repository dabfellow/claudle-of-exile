import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
// loads before styles.css (main.tsx imports the app first), so its overrides start with `html` to win ties
import '../round2-session1.css';
import { createPortal } from 'react-dom';
import { isCurrency, materialDef } from '../../data/materials';
import { GAME_ICONS, KIBYRA, packArtIsPixel, packArtUrl } from '../assets';
import { Icon, Orb, Swatch } from './Icon';

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
  const isOverfill = value > 1;
  const basePct = `${Math.max(0, Math.min(1, value)) * 100}%`;
  const overfillRatio = value > 1 ? value - 1 : 0;
  const rawPct = Math.min(1, overfillRatio > 1 ? (overfillRatio % 1 || 1) : overfillRatio) * 100;
  const overfillPct = `${Math.round(rawPct * 100) / 100}%`;
  const multiplier = value >= 2 ? Math.floor(value) : undefined;
  return (
    <div className={`bar ${size ?? ''} ${label !== undefined ? 'labelled' : ''} ${isOverfill ? 'overfill' : ''} ${className}`}>
      {ghost && <div className="bar-ghost" style={{ width: basePct }} />}
      <div className={`bar-fill ${smooth ? 'smooth' : ''}`} style={{ width: basePct, background: color }} />
      {isOverfill && <div className="bar-overfill" style={{ width: overfillPct }} />}
      {label !== undefined && (
        <div className="bar-label">
          {label}
          {multiplier !== undefined && <span className="bar-multiplier">{`×${multiplier}`}</span>}
        </div>
      )}
      {label === undefined && multiplier !== undefined && (
        <div className="bar-label">
          <span className="bar-multiplier">{`×${multiplier}`}</span>
        </div>
      )}
    </div>
  );
}

// ---------- Ashen Codex building blocks (docs/DEVELOPMENT.md) ----------

/** The title block every page starts with. */
export function PageHeader({ title, kicker, children, actions }: { title: ReactNode; kicker?: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="grow">
        {kicker && <span className="page-kicker">{kicker}</span>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export interface TabDef<T extends string> {
  id: T;
  label: ReactNode;
  count?: number;
  /** highlight the count (e.g. unspent points) */
  hot?: boolean;
  disabled?: boolean;
  title?: string;
}

/** One tab style everywhere; `compact` is the small segmented variant for sorts and filters. */
export function Tabs<T extends string>({ tabs, value, onChange, compact }: { tabs: TabDef<T>[]; value: T; onChange: (id: T) => void; compact?: boolean }) {
  return (
    <div className={`tabs ${compact ? 'compact' : ''}`} role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab ${value === t.id ? 'active' : ''}`} disabled={t.disabled} title={t.title} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count !== undefined && <span className={`nav-badge ${t.hot ? 'hot' : ''}`}>{t.hot ? `+${t.count}` : t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export type Tone = 'neutral' | 'gold' | 'success' | 'danger' | 'warn' | 'locked';

/** Status pill: Active, Locked, Complete, Missing materials… */
export function Badge({ tone = 'neutral', live, children, title }: { tone?: Tone; live?: boolean; children: ReactNode; title?: string }) {
  return (
    <span className={`badge ${tone} ${live ? 'live' : ''}`} title={title}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, children, action, small }: { icon?: ReactNode; title?: ReactNode; children?: ReactNode; action?: ReactNode; small?: boolean }) {
  return (
    <div className={`empty ${small ? 'sm' : ''}`}>
      {icon}
      {title && <div className="empty-title">{title}</div>}
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: 'var(--s-2)' }}>{action}</div>}
    </div>
  );
}

/** A currency/material amount: icon, tabular number, optional name. */
export function CurrencyAmount({ id, amount, label }: { id: string; amount: number; label?: ReactNode }) {
  return (
    <span className="chip" title={materialDef(id).name}>
      <MatIcon id={id} size={14} />
      <b>{fmt(amount)}</b>
      {label !== undefined && <span className="dim">{label}</span>}
    </span>
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
const ORB_KINDS = new Set(['fossil', 'essence', 'resin', 'shard', 'contraband', 'rune', 'artifact']);

export function MatIcon({ id, size = 14 }: { id: string; size?: number }) {
  const def = materialDef(id);
  // orbs and crafting materials are flat coloured orbs; only gathered materials get pictures
  if (isCurrency(id) || id === 'gold' || ORB_KINDS.has(def.kind)) return <Orb color={def.color} size={size} />;
  const key = `materials/${id}`;
  const art = artUrl(key) ?? packArtUrl(key);
  if (art) return <img className="art mat-art" src={art} alt={def.name} width={size + 4} height={size + 4} draggable={false} />;
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

/** How long a finger has to rest on something before its tooltip shows. */
export const HOLD_MS = 450;
/** A finger that drifts further than this is scrolling, not holding. */
const HOLD_SLOP_PX = 10;
const TIP_GAP = 10;
const TIP_MARGIN = 8;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The screen box of what a tooltip is attached to. A display: contents wrapper has no box of its own, so it's the union of its children's. */
function anchorBox(el: Element | null): Box | null {
  if (!el) return null;
  const parts = getComputedStyle(el).display === 'contents' ? Array.from(el.children) : [el];
  let box: Box | null = null;
  for (const part of parts) {
    const r = part.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    box = box
      ? { left: Math.min(box.left, r.left), top: Math.min(box.top, r.top), right: Math.max(box.right, r.right), bottom: Math.max(box.bottom, r.bottom) }
      : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  }
  return box;
}

/**
 * Where a tooltip of size w × h goes: beside the thing it explains, never over it, and always on screen.
 * With a mouse it tries the right, then the left, then below and above; for a finger, above first, where the hand isn't.
 */
export function placeTip(a: Box, w: number, h: number, touch: boolean, vw = window.innerWidth, vh = window.innerHeight): { left: number; top: number } {
  const clampX = (x: number) => Math.max(TIP_MARGIN, Math.min(x, vw - w - TIP_MARGIN));
  const clampY = (y: number) => Math.max(TIP_MARGIN, Math.min(y, vh - h - TIP_MARGIN));
  const sides = {
    right: { room: vw - TIP_MARGIN - (a.right + TIP_GAP), need: w, at: () => ({ left: a.right + TIP_GAP, top: clampY(a.top) }) },
    left: { room: a.left - TIP_GAP - TIP_MARGIN, need: w, at: () => ({ left: a.left - TIP_GAP - w, top: clampY(a.top) }) },
    below: { room: vh - TIP_MARGIN - (a.bottom + TIP_GAP), need: h, at: () => ({ left: clampX(a.left), top: a.bottom + TIP_GAP }) },
    above: { room: a.top - TIP_GAP - TIP_MARGIN, need: h, at: () => ({ left: clampX(a.left), top: a.top - TIP_GAP - h }) },
  };
  const order: (keyof typeof sides)[] = touch ? ['above', 'below', 'right', 'left'] : ['right', 'left', 'below', 'above'];
  for (const side of order) if (sides[side].room >= sides[side].need) return sides[side].at();
  // nowhere it fits whole: the side with the most room, kept on screen
  const best = order.reduce((b, side) => (sides[side].room / sides[side].need > sides[b].room / sides[b].need ? side : b));
  const p = sides[best].at();
  return { left: clampX(p.left), top: clampY(p.top) };
}

/** The one tooltip a finger is holding open, so pressing another closes it. */
let closeTouchTip: (() => void) | null = null;

/**
 * Tooltip rendered in a fixed layer beside what it's attached to.
 * Mouse: shows on hover; holding Alt keeps it open where it is, even after the cursor leaves.
 * Touch: press and hold to show it (the tap doesn't count as a click then); the next touch anywhere closes it.
 * A plain tap does what the thing normally does, without a tooltip.
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
  const [open, setOpen] = useState<null | 'mouse' | 'touch'>(null);
  const [hovering, setHovering] = useState(false);
  const alt = useAltKey();
  const wrapRef = useRef<HTMLElement & SVGGElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const hold = useRef<{ timer: number; x: number; y: number } | null>(null);
  /** a hold just opened the tooltip: the click that follows the finger lifting isn't a click */
  const swallowClick = useRef(false);

  // when Alt is released after the cursor left, close it
  useEffect(() => {
    if (open === 'mouse' && !alt && !hovering) setOpen(null);
  }, [alt, hovering, open]);

  // sit beside the anchor; measured before paint, and again whenever the content or the anchor moves
  useLayoutEffect(() => {
    if (!open) {
      if (place) setPlace(null);
      return;
    }
    const a = anchorBox(wrapRef.current);
    const r = layerRef.current?.getBoundingClientRect();
    if (!a || !r) return;
    const p = placeTip(a, r.width, r.height, open === 'touch');
    if (!place || Math.abs(p.left - place.left) > 0.5 || Math.abs(p.top - place.top) > 0.5) setPlace(p);
  });

  // a touch tooltip closes on the next touch anywhere; a mouse one when the page scrolls under it
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    if (open === 'touch') {
      closeTouchTip?.();
      closeTouchTip = close;
      // the finger that opened it is still down: listen from the next press on
      const onDown = () => close();
      const t = window.setTimeout(() => window.addEventListener('pointerdown', onDown, true), 0);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener('pointerdown', onDown, true);
        if (closeTouchTip === close) closeTouchTip = null;
      };
    }
    const onScroll = () => {
      if (!altDown) close();
    };
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [open]);

  useEffect(() => () => void (hold.current && window.clearTimeout(hold.current.timer)), []);

  const cancelHold = () => {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = null;
  };

  const frozen = alt && !hovering && open === 'mouse';
  const layer =
    open &&
    createPortal(
      <div
        className={`tooltip-layer ${frozen ? 'frozen' : ''} ${open === 'touch' ? 'touch' : ''}`}
        style={place ? { left: place.left, top: place.top } : { left: 0, top: 0, visibility: 'hidden' }}
        ref={layerRef}
      >
        {content}
      </div>,
      document.body,
    );
  const handlers = {
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') {
        const h = hold.current;
        if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > HOLD_SLOP_PX) cancelHold();
        return;
      }
      if (!hovering) setHovering(true);
      if (open !== 'mouse') setOpen('mouse');
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      setHovering(false);
      if (!altDown && open === 'mouse') setOpen(null);
    },
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      swallowClick.current = false;
      cancelHold();
      const timer = window.setTimeout(() => {
        hold.current = null;
        swallowClick.current = true;
        setOpen('touch');
      }, HOLD_MS);
      hold.current = { timer, x: e.clientX, y: e.clientY };
    },
    onPointerUp: cancelHold,
    onPointerCancel: cancelHold,
    onClickCapture: (e: React.MouseEvent) => {
      if (!swallowClick.current) return;
      swallowClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    // a long press is the tooltip, not the right-click menu (pin, item actions) it would be on some phones
    onContextMenuCapture: (e: React.MouseEvent) => {
      if (!hold.current && open !== 'touch') return;
      e.preventDefault();
      e.stopPropagation();
    },
  };
  if (svg) {
    return (
      <g ref={wrapRef} className="tip-anchor" {...handlers}>
        {children}
        {layer}
      </g>
    );
  }
  return (
    <span ref={wrapRef} className="tip-anchor" style={{ display: 'contents', ...style }} {...handlers}>
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

/** Every image in src/assets/art, found at build time, keyed by its path without extension (`currency/chaos`). */
const ART_FILES: Record<string, string> = {};
for (const [path, url] of Object.entries(import.meta.glob('../../assets/art/**/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }))) {
  const key = path.replace('../../assets/art/', '').replace(/\.[a-z]+$/, '');
  // the optimised .webp from `npm run art` wins over a raw drop-in
  if (!ART_FILES[key] || path.endsWith('.webp')) ART_FILES[key] = url as string;
}

/** URL of a piece of art, or undefined if it hasn't been added yet. */
export function artUrl(key: string): string | undefined {
  return ART_FILES[key.replace(/\.[a-z]+$/, '')];
}

/** Generated art if it exists, otherwise asset-pack art (src/ui/assets.ts). */
export function anyArtUrl(key: string): string | undefined {
  return artUrl(key) ?? packArtUrl(key);
}

/** Background style for a scene/backdrop, or nothing when the art isn't there yet. */
export function sceneStyle(key: string): CSSProperties | undefined {
  const url = anyArtUrl(key);
  return url ? ({ ['--scene-art' as string]: `url(${url})` } as CSSProperties) : undefined;
}

/** A picture from src/assets/art if it exists, then asset-pack art (src/ui/assets.ts), otherwise the fallback (styled placeholder). */
export function Art({ src, alt, fallback, className, size, cover }: { src: string; alt: string; fallback: ReactNode; className?: string; size?: number; cover?: boolean }) {
  const own = artUrl(src);
  const url = own ?? packArtUrl(src);
  if (!url) return <>{fallback}</>;
  return (
    <img
      className={`art ${cover ? 'cover' : ''} ${!own ? 'pack-art' : ''} ${!own && packArtIsPixel(src) ? 'crisp' : ''} ${className ?? ''}`}
      src={url}
      alt={alt}
      width={cover ? undefined : size}
      height={cover ? undefined : size}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}

/** A game-icons.net silhouette tinted like the stroke icons, or the stroke icon when there's no silhouette for `name`. */
export function GameIcon({ name, size = 18, color = 'currentColor', style }: { name: string; size?: number; color?: string; style?: CSSProperties }) {
  const url = GAME_ICONS[name];
  if (!url) return <Icon name={name} size={size} color={color} style={style} />;
  return <span className="game-icon" aria-hidden style={{ width: size, height: size, background: color, ['--icon' as string]: `url(${url})`, ...style }} />;
}

/** One of the few Kibyra pixel-art touches, drawn crisp at its native 32px (or 2×). */
export function PixelArt({ name, alt, scale = 1 }: { name: keyof typeof KIBYRA; alt: string; scale?: 1 | 2 }) {
  return <img className="art pixel-art" src={KIBYRA[name]} alt={alt} width={32 * scale} height={32 * scale} loading="lazy" draggable={false} />;
}

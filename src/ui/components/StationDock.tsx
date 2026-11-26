import type { CSSProperties, ReactNode } from 'react';
import { fmt } from './common';
import './station-hero.css';

/** One socket in an illustrated station banner's right-hand material dock. */
export interface StationDockItem {
  key: string;
  /** Icon element. Give pixel-art sprites the `station-pixel` class so they stay sharp when upscaled. */
  icon: ReactNode;
  label: string;
  value: number | string;
  /** Full value for the hover title, when `value` is abbreviated. */
  title?: string;
  /** Greys the socket out, e.g. for a material you have none of yet. */
  dim?: boolean;
}

const glyphs = import.meta.glob<string>('../../../public/assets/stations/icon-*.svg', { eager: true, import: 'default', query: '?url&no-inline' });

/** Names of the game-icons.net glyphs in public/assets/stations (credited in its CREDITS.md). */
export type StationGlyphName = 'buzzsaw' | 'greenhouse' | 'herbs' | 'pump' | 'rock-bolt' | 'seed' | 'trophy' | 'vent-fan' | (string & {});

/** A station icon drawn in the current text colour, so each page can tint it (iron, brass, gold…). */
export function StationGlyph({ name, size = 24, className }: { name: StationGlyphName; size?: number; className?: string }) {
  const url = glyphs[`../../../public/assets/stations/icon-${name}.svg`];
  return <span className={`station-glyph${className ? ` ${className}` : ''}`} aria-hidden="true"
    style={{ width: size, height: size, ['--station-glyph' as string]: `url(${url})` }} />;
}

/**
 * Docked material sockets on the right of an illustrated station banner
 * (`.station-hero`). The rim colour comes from `--station-rim` set by the page,
 * so mining reads iron, the sawmill timber, the greenhouse brass and so on.
 */
export function StationDock({ label, items, style, className }: { label: string; items: StationDockItem[]; style?: CSSProperties; className?: string }) {
  if (!items.length) return null;
  const cols = Math.min(items.length, 4);
  return <ul
    className={`station-dock station-dock-${cols}${className ? ` ${className}` : ''}`}
    aria-label={label}
    style={{ ['--station-dock-cols' as string]: cols, ...style }}
  >
    {items.map((item) => (
      <li key={item.key} title={item.title} className={item.dim ? 'is-dim' : undefined}>
        <span className="station-socket" aria-hidden="true">{item.icon}</span>
        <span className="station-dock-label">{item.label}</span>
        <b className="num">{typeof item.value === 'number' ? fmt(item.value) : item.value}</b>
      </li>
    ))}
  </ul>;
}

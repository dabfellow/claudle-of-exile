import type { CSSProperties } from 'react';

/** Simple stroke icons on a 24×24 grid. */
const PATHS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5M10 20v-5h4v5',
  combat: 'M5 19 15.5 8.5M15.5 8.5 19 5l.5 3.5-3.5 3.5M5 19l-1.5 1.5M7 17l-2.5-2.5M19 19 8.5 8.5M8.5 8.5 5 5l-.5 3.5 3.5 3.5M19 19l1.5 1.5M17 17l2.5-2.5',
  tree: 'M12 4v4M12 16v4M4 12h4M16 12h4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM6 6l2.5 2.5M18 6l-2.5 2.5M6 18l2.5-2.5M18 18l-2.5-2.5',
  mining: 'M4 20 14 10M14 10l-2-2c3-3 6-4 9-3-1 3-1.5 5-3.5 7l-1.5-.5M12 8c-2-1-5-1-7 0 1.5.5 3 1.5 4 3',
  woodcutting: 'M5 20 15 10M13 6l5 5 2-2c0-3-2-5-5-5l-2 2ZM13 6l-1.5 1.5M18 11l-1.5 1.5',
  harvesting: 'M12 21V11M12 11c0-4 3-7 7-7 0 4-3 7-7 7ZM12 14c0-3-2.5-5.5-6-5.5 0 3.5 2.5 5.5 6 5.5Z',
  fishing: 'M15 3v10a4 4 0 0 1-8 0v-2l-2 2M15 3l2 2M15 3 4 21',
  smithing: 'M4 10h11l-1 3H8l-1 3M7 16h7M9 16v4M14 16v4M6 20h11M15 10c2 0 4-1 5-3M4 10V7h6v3',
  alchemy: 'M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 14h9',
  gemcutting: 'M7 4h10l4 5-9 11L3 9l4-5ZM3 9h18M9.5 4 8 9l4 11 4-11-1.5-5',
  equipment: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z',
  bench: 'M3 10h18M5 10v10M19 10v10M8 10V6h8v4M10 14h4',
  stash: 'M4 8h16v12H4zM4 8l2-4h12l2 4M10 12h4',
  vendor: 'M4 9h16l-1-4H5L4 9ZM5 9v11h14V9M9 20v-6h6v6M4 9c0 1.5 1.3 2.5 2.7 2.5S9.3 10.5 9.3 9c0 1.5 1.3 2.5 2.7 2.5S14.7 10.5 14.7 9c0 1.5 1.3 2.5 2.6 2.5S20 10.5 20 9',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM19 12l2-1-1-3-2.2.3-1.3-1.3L16.8 4l-3-1-1 2h-1.6l-1-2-3 1 .3 2.2L6.2 7.5 4 7.2l-1 3 2 1v1.6l-2 1 1 3 2.2-.3 1.3 1.3L7.2 20l3 1 1-2h1.6l1 2 3-1-.3-2.2 1.3-1.3 2.2.3 1-3-2-1V12Z',
  map: 'M12 3a6 6 0 0 1 6 6c0 4.5-6 12-6 12S6 13.5 6 9a6 6 0 0 1 6-6ZM12 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  forge: 'M4 20h16M6 20v-6h12v6M8 14c0-3 2-4 2-7 2 1 3 3 3 5 1-1 1-2 1-3 2 2 2 3.5 2 5',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z',
  skull: 'M12 3a7 7 0 0 0-7 7c0 2.5 1.2 4 2.5 5v3h9v-3c1.3-1 2.5-2.5 2.5-5a7 7 0 0 0-7-7ZM9 11h.01M15 11h.01M10 18v3M14 18v3',
  coin: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.7 2.5 1.7c0 2.3-5 1.3-5 3.8 0 1 1 1.5 2.5 1.5s2.5-.5 2.5-1.5',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  target: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 11.5v1',
  bolt: 'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5c0 3 1.5 4.5 3 5M16 6h3c0 3-1.5 4.5-3 5M12 13v4M8.5 20h7M10 17h4v3h-4z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5.5 11h13v9h-13zM12 14.5v2',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM12 8v4l3 2',
  // item slots
  weapon: 'M5 19 16 8M16 8l2-4 2 2-4 2M7 15l2 2M4 20l1.5-1.5',
  offhand: 'M12 3 5 5.5V11c0 5 3 8 7 10 4-2 7-5 7-10V5.5L12 3ZM12 7v10M8 11h8',
  helmet: 'M5 15a7 7 0 0 1 14 0v3H5v-3ZM12 8v-3M5 15h14M9 18v-3M15 18v-3',
  body: 'M8 4 4 7l2 4 2-1v10h8V10l2 1 2-4-4-3c-1 1.5-2.5 2-4 2S9 5.5 8 4Z',
  gloves: 'M8 20v-6L6 10V6.5a1 1 0 0 1 2 0V10M8 9V4.5a1 1 0 0 1 2 0V9M10 9V4a1 1 0 0 1 2 0v5M12 9V5a1 1 0 0 1 2 0v6l2-2a1 1 0 0 1 1.5 1.4L14 15v5H8Z',
  boots: 'M7 4h5v9l6 3a2 2 0 0 1 1 2v2H6V4.5',
  belt: 'M3 10h18v4H3zM10 9h4v6h-4z',
  amulet: 'M6 4c0 5 3 8 6 9 3-1 6-4 6-9M12 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  ring: 'M12 8a6 6 0 1 0 0 12 6 6 0 0 0 0-12ZM12 8l-2-3h4l-2 3',
};

export function Icon({
  name,
  size = 18,
  color = 'currentColor',
  stroke = 1.7,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  stroke?: number;
  style?: CSSProperties;
}) {
  const d = PATHS[name] ?? PATHS.target;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Orb({ color, size = 18, glow = false }: { color: string; size?: number; glow?: boolean }) {
  return (
    <span
      className="orb"
      style={{
        width: size,
        height: size,
        background: color,
        borderColor: `color-mix(in srgb, ${color} 45%, #000)`,
        ['--glow' as string]: glow ? color : 'transparent',
      }}
    />
  );
}

export function Swatch({ color, size = 12 }: { color: string; size?: number }) {
  return <span className="swatch" style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 50%, #000))` }} />;
}

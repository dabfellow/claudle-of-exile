import { useMemo } from 'react';
import { ACT_REGIONS, actMapPoint, CONTINENT_SIZE, regionPath, type ActRegion } from '../../data/continent';

/**
 * The drawn fantasy map under the Campaign page's markers: the continent's act regions as inked land with
 * each act's own terrain (forest and marsh, steppe, city, peaks, sea, ruins). There's no painted top-down map in
 * the asset packs, so this stands in for one; data/campaignMap.ts can swap in a painting per map.
 */

type Pt = [number, number];

interface Theme {
  land: string;
  /** glyphs drawn on this act's land, with how often each one comes up */
  glyphs: [string, number][];
}

const THEMES: Record<number, Theme> = {
  1: { land: '#3c4232', glyphs: [['pine', 0.45], ['reeds', 0.4], ['rock', 0.15]] },
  2: { land: '#4f3e25', glyphs: [['grass', 0.45], ['dune', 0.4], ['ember', 0.15]] },
  3: { land: '#48423a', glyphs: [['house', 0.55], ['spire', 0.25], ['grass', 0.2]] },
  4: { land: '#3a4049', glyphs: [['peak', 0.75], ['pine', 0.25]] },
  5: { land: '#1d3340', glyphs: [['wave', 0.75], ['isle', 0.25]] },
  6: { land: '#3c3041', glyphs: [['ruin', 0.55], ['crack', 0.3], ['spire', 0.15]] },
};

function inside([x, y]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** a repeatable 0..1 from a few numbers */
function rand(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pick(glyphs: [string, number][], r: number): string {
  let acc = 0;
  for (const [id, w] of glyphs) {
    acc += w;
    if (r <= acc) return id;
  }
  return glyphs[glyphs.length - 1][0];
}

/** Glyphs scattered over a region on a jittered grid, kept off anything `clear` says to keep clear. */
function scatter(act: number, poly: Pt[], step: number, clear?: (p: Pt) => boolean): { id: string; x: number; y: number; flip: boolean }[] {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const out: { id: string; x: number; y: number; flip: boolean }[] = [];
  const theme = THEMES[act];
  for (let gy = Math.min(...ys); gy < Math.max(...ys); gy += step) {
    for (let gx = Math.min(...xs); gx < Math.max(...xs); gx += step) {
      const r1 = rand(Math.round(gx), Math.round(gy), act);
      const r2 = rand(Math.round(gy), Math.round(gx), act + 7);
      const p: Pt = [gx + (r1 - 0.5) * step * 0.9, gy + (r2 - 0.5) * step * 0.9];
      if (!inside(p, poly) || (clear && clear(p))) continue;
      // a margin off the coast so glyphs don't sit on the line
      if (!inside([p[0] + step * 0.3, p[1]], poly) || !inside([p[0] - step * 0.3, p[1]], poly) || !inside([p[0], p[1] + step * 0.3], poly)) continue;
      if (rand(Math.round(gx * 3), Math.round(gy * 3), act) < 0.22) continue;
      out.push({ id: pick(theme.glyphs, rand(Math.round(gx * 7), Math.round(gy * 5), act)), x: p[0], y: p[1], flip: r1 > 0.5 });
    }
  }
  return out;
}

/** The shapes behind each glyph, in a box about 20 units across centred on 0,0. */
function GlyphDefs({ prefix }: { prefix: string }) {
  return (
    <>
      <symbol id={`${prefix}pine`} overflow="visible">
        <path className="ct-ink-fill" d="M0 -9 L5 -1 L2.5 -1 L7 6 L-7 6 L-2.5 -1 L-5 -1 Z" />
        <path className="ct-ink" d="M0 6 V9" />
      </symbol>
      <symbol id={`${prefix}reeds`} overflow="visible">
        <path className="ct-ink" d="M-5 5 Q-4 -1 -6 -6 M0 5 Q0 -3 1 -8 M5 5 Q4 0 6 -4 M-8 6 H8" />
      </symbol>
      <symbol id={`${prefix}rock`} overflow="visible">
        <path className="ct-ink-fill" d="M-6 4 L-3 -2 L2 -3 L6 4 Z" />
      </symbol>
      <symbol id={`${prefix}grass`} overflow="visible">
        <path className="ct-ink" d="M-7 4 L-4 -3 L-2 4 M0 4 L2 -5 L4 4 M5 4 L7 -1 L8 4" />
      </symbol>
      <symbol id={`${prefix}dune`} overflow="visible">
        <path className="ct-ink" d="M-10 4 Q-3 -4 4 2 Q7 0 10 4" />
      </symbol>
      <symbol id={`${prefix}ember`} overflow="visible">
        <path className="ct-ember" d="M0 -6 Q4 -1 2 3 Q0 6 -2 3 Q-4 -1 0 -6 Z" />
      </symbol>
      <symbol id={`${prefix}house`} overflow="visible">
        <path className="ct-ink-fill" d="M-8 6 V0 L-4.5 -4 L-1 0 V6 Z M1 6 V-2 H7 V6 Z M2 -2 L4 -6 L6 -2 Z" />
      </symbol>
      <symbol id={`${prefix}spire`} overflow="visible">
        <path className="ct-ink-fill" d="M-2.5 7 V-3 L0 -11 L2.5 -3 V7 Z" />
      </symbol>
      <symbol id={`${prefix}peak`} overflow="visible">
        <path className="ct-peak" d="M-11 7 L-2 -9 L3 -1 L5.5 -4 L12 7 Z" />
        <path className="ct-snow" d="M-2 -9 L-5 -3.5 L-2.5 -5 L-0.5 -3.5 L1 -4.5 Z" />
        <path className="ct-ink" d="M-2 -9 L1 7" />
      </symbol>
      <symbol id={`${prefix}wave`} overflow="visible">
        <path className="ct-wave" d="M-9 0 q4.5 -4 9 0 t9 0" />
      </symbol>
      <symbol id={`${prefix}isle`} overflow="visible">
        <path className="ct-isle" d="M-8 2 Q-6 -4 0 -3 Q7 -4 8 2 Q2 5 -8 2 Z" />
      </symbol>
      <symbol id={`${prefix}ruin`} overflow="visible">
        <path className="ct-ink-fill" d="M-7 7 V-3 L-5 -6 L-3 -2 V7 Z M0 7 V-9 L2 -6 L4 -10 V7 Z" />
      </symbol>
      <symbol id={`${prefix}crack`} overflow="visible">
        <path className="ct-crack" d="M-9 -3 L-3 0 L-1 -4 L4 2 L9 0" />
      </symbol>
    </>
  );
}

/** Shared paint: the sea, its waves and a paper grain. */
function SeaDefs({ prefix }: { prefix: string }) {
  return (
    <>
      <pattern id={`${prefix}waves`} width="44" height="22" patternUnits="userSpaceOnUse">
        <path d="M0 11 q11 -7 22 0 t22 0" fill="none" stroke="#5d7f88" strokeWidth="1" opacity="0.35" />
      </pattern>
      <radialGradient id={`${prefix}vignette`} cx="50%" cy="50%" r="75%">
        <stop offset="55%" stopColor="#000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
      </radialGradient>
      <filter id={`${prefix}grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="4" result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.75  0 0 0 0 0.55  0 0 0 0.5 0" />
        <feComposite in2="SourceGraphic" operator="in" />
      </filter>
      <pattern id={`${prefix}fog`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <rect width="10" height="10" fill="#15181c" />
        <path d="M0 0 V10" stroke="#262a30" strokeWidth="3" />
      </pattern>
    </>
  );
}

/** The world map: every act's region, with the locked ones under fog. Regions are clickable. */
export function WorldTerrain({ isOpen, selected, onPick, here }: { isOpen: (act: number) => boolean; selected?: number; onPick: (act: number) => void; here?: Pt }) {
  const p = 'ctw-';
  const glyphs = useMemo(() => ACT_REGIONS.map((r) => ({ act: r.act, list: scatter(r.act, r.points, 30) })), []);
  return (
    <svg className="ct-svg" viewBox={`0 0 ${CONTINENT_SIZE.w} ${CONTINENT_SIZE.h}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <SeaDefs prefix={p} />
        <GlyphDefs prefix={p} />
      </defs>
      <rect className="ct-sea" width={CONTINENT_SIZE.w} height={CONTINENT_SIZE.h} />
      <rect width={CONTINENT_SIZE.w} height={CONTINENT_SIZE.h} fill={`url(#${p}waves)`} />
      {/* shallows and coastline under the land, so only the outer edge shows */}
      {ACT_REGIONS.map((r) => (
        <path key={`s${r.act}`} className="ct-shallows" d={regionPath(r)} />
      ))}
      {ACT_REGIONS.map((r) => (
        <path key={`c${r.act}`} className="ct-coast" d={regionPath(r)} />
      ))}
      {ACT_REGIONS.map((r) => {
        const open = isOpen(r.act);
        return (
          <g key={r.act} className={`ct-region ${open ? 'open' : 'locked'} ${selected === r.act ? 'selected' : ''}`} onClick={() => open && onPick(r.act)}>
            <path d={regionPath(r)} fill={open ? THEMES[r.act].land : `url(#${p}fog)`} className="ct-land" />
            {open &&
              glyphs
                .find((g) => g.act === r.act)!
                .list.map((g, i) => <use key={i} href={`#${p}${g.id}`} x={g.x} y={g.y} transform={g.flip ? `translate(${2 * g.x} 0) scale(-1 1)` : undefined} />)}
            <path d={regionPath(r)} className="ct-border" />
          </g>
        );
      })}
      <rect width={CONTINENT_SIZE.w} height={CONTINENT_SIZE.h} filter={`url(#${p}grain)`} opacity="0.12" pointerEvents="none" />
      <rect width={CONTINENT_SIZE.w} height={CONTINENT_SIZE.h} fill={`url(#${p}vignette)`} pointerEvents="none" />
      <Compass x={CONTINENT_SIZE.w - 70} y={CONTINENT_SIZE.h - 80} r={34} />
      {here && <circle className="ct-here" cx={here[0]} cy={here[1]} r={9} />}
    </svg>
  );
}

/** A plain compass rose for the corner of the map. */
function Compass({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g className="ct-compass" transform={`translate(${x} ${y})`} pointerEvents="none">
      <circle r={r} />
      <path d={`M0 ${-r - 6} L5 0 L0 ${r + 6} L-5 0 Z M${-r - 6} 0 L0 5 L${r + 6} 0 L0 -5 Z`} />
      <text y={-r - 10} textAnchor="middle">
        N
      </text>
    </g>
  );
}

/** The box an act's close-up shows, in the continent's (stretched) units: the same box data/campaignMap.ts measures in. */
export function actFrame(r: ActRegion, pad = 30): { x: number; y: number; w: number; h: number } {
  const pts = r.points.map((p) => actMapPoint(r, p));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}

/**
 * One act up close: its region inked in detail with the neighbours dimmed round it. `keepClear` holds points
 * (in percent of the frame) that glyphs should stay off: the areas and the road bends.
 */
export function ActTerrain({ act, keepClear }: { act: number; keepClear: Pt[] }) {
  const p = `cta${act}-`;
  const region = ACT_REGIONS.find((r) => r.act === act)!;
  const f = actFrame(region);
  const stretched = (r: ActRegion): Pt[] => r.points.map((pt) => actMapPoint(region, pt));
  const glyphs = useMemo(() => {
    const clear = keepClear.map(([x, y]): Pt => [f.x + (x / 100) * f.w, f.y + (y / 100) * f.h]);
    const room = Math.max(f.w, f.h) * 0.045;
    return scatter(act, stretched(region), Math.max(f.w, f.h) / 26, (pt) => clear.some((c) => Math.hypot(c[0] - pt[0], c[1] - pt[1]) < room));
    // the frame only changes with the act
  }, [act, keepClear]);
  const scale = Math.max(f.w, f.h) / 340;
  const path = (r: ActRegion) => `M${stretched(r).map(([x, y]) => `${x} ${y}`).join(' L')} Z`;
  return (
    <svg className="ct-svg" viewBox={`${f.x} ${f.y} ${f.w} ${f.h}`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <SeaDefs prefix={p} />
        <GlyphDefs prefix={p} />
      </defs>
      <rect className="ct-sea" x={f.x} y={f.y} width={f.w} height={f.h} />
      <rect x={f.x} y={f.y} width={f.w} height={f.h} fill={`url(#${p}waves)`} />
      {ACT_REGIONS.map((r) => (
        <path key={`s${r.act}`} className="ct-shallows" d={path(r)} />
      ))}
      {ACT_REGIONS.map((r) => (
        <path key={`c${r.act}`} className="ct-coast" d={path(r)} />
      ))}
      {ACT_REGIONS.filter((r) => r.act !== act).map((r) => (
        <path key={r.act} d={path(r)} fill={THEMES[r.act].land} className="ct-land neighbour" />
      ))}
      <path d={path(region)} fill={THEMES[act].land} className="ct-land" />
      {glyphs.map((g, i) => (
        <use key={i} href={`#${p}${g.id}`} transform={`translate(${g.x} ${g.y}) scale(${g.flip ? -scale : scale} ${scale})`} />
      ))}
      <path d={path(region)} className="ct-border this" />
      <rect x={f.x} y={f.y} width={f.w} height={f.h} filter={`url(#${p}grain)`} opacity="0.12" pointerEvents="none" />
      <rect x={f.x} y={f.y} width={f.w} height={f.h} fill={`url(#${p}vignette)`} pointerEvents="none" />
    </svg>
  );
}

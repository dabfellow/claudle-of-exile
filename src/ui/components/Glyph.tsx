import { glyphMask, scriptDef, type ScriptId } from '../../data/deciphering';

const LATTICE = [4, 12, 20];
const FROST = [
  'M4 10 Q4 4 10 4', 'M14 4 Q20 4 20 10', 'M20 14 Q20 20 14 20', 'M10 20 Q4 20 4 14',
  'M9 12 Q9 9 12 9', 'M12 9 Q15 9 15 12', 'M15 12 Q15 15 12 15', 'M12 15 Q9 15 9 12',
];
const NEST_SIZE = [10, 6.5, 3];

function bits(mask: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => i).filter((i) => (mask >> i) & 1);
}

/** The drawing of one glyph. Each script has its own style: blocks, ruled lines, frost curls or nested shapes. */
export function GlyphShape({ script, glyph }: { script: ScriptId; glyph: string }) {
  const mask = glyphMask(script, glyph);
  const style = scriptDef(script).style;
  let shapes: JSX.Element[] = [];
  if (style === 'blocky') {
    shapes = bits(mask, 9).map((i) => <rect key={i} x={3 + (i % 3) * 6} y={3 + Math.floor(i / 3) * 6} width={6} height={6} />);
  } else if (style === 'ruled') {
    shapes = bits(mask, 12).map((i) => {
      // 0-5 are horizontal edges of the lattice, 6-11 vertical ones
      const horizontal = i < 6;
      const r = horizontal ? Math.floor(i / 2) : i % 2;
      const c = horizontal ? i % 2 : Math.floor((i - 6) / 2);
      return horizontal
        ? <line key={i} x1={LATTICE[c]} y1={LATTICE[r]} x2={LATTICE[c + 1]} y2={LATTICE[r]} />
        : <line key={i} x1={LATTICE[c]} y1={LATTICE[r]} x2={LATTICE[c]} y2={LATTICE[r + 1]} />;
    });
  } else if (style === 'frost') {
    shapes = bits(mask, 8).map((i) => <path key={i} d={FROST[i]} fill="none" />);
  } else {
    shapes = bits(mask, 9).map((i) => {
      const level = Math.floor(i / 3);
      const r = NEST_SIZE[level];
      const kind = i % 3;
      if (kind === 0) return <rect key={i} x={12 - r} y={12 - r} width={r * 2} height={r * 2} fill="none" />;
      if (kind === 1) return <circle key={i} cx={12} cy={12} r={r} fill="none" />;
      return <polygon key={i} points={`12,${12 - r * 1.2} ${12 + r * 1.2},12 12,${12 + r * 1.2} ${12 - r * 1.2},12`} fill="none" />;
    });
  }
  return (
    <svg viewBox="0 0 24 24" className={`glyph-shape ${style}`} aria-hidden>
      {shapes}
    </svg>
  );
}

/** A glyph as a tile, optionally tappable. */
export function GlyphTile({
  script, glyph, size = 44, selected, cracked, label, onClick, children,
}: {
  script: ScriptId;
  glyph: string;
  size?: number;
  selected?: boolean;
  cracked?: boolean;
  label?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const style = { width: size, height: size, ['--script' as string]: scriptDef(script).color };
  const cls = `glyph-tile ${selected ? 'selected' : ''} ${cracked ? 'cracked' : ''}`;
  const name = label ?? `${scriptDef(script).name} glyph ${Number(glyph.slice(1)) + 1}`;
  if (!onClick) {
    return (
      <span className={cls} style={style} role="img" aria-label={name}>
        <GlyphShape script={script} glyph={glyph} />
        {children}
      </span>
    );
  }
  return (
    <button type="button" className={cls} style={style} onClick={onClick} aria-label={name} aria-pressed={!!selected}>
      <GlyphShape script={script} glyph={glyph} />
      {children}
    </button>
  );
}

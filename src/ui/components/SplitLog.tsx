import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { columnProfile, logWindow, massShare, splitResult, type SwingResult } from '../../engine/minigame';
import { useGame } from '../../game';
import logArt from '../../assets/woodcutting/split-log.png';
import axeArt from '../../assets/ui/decorations/axe.png';

/*
 * Woodcutting's chopping block (docs/WOODCUTTING_GIANTS.md). A log lies on the block, drawn from real art
 * ("Wood log" by EyAxeMan, CC0) and mirrored, flipped and trimmed so each one balances somewhere new. The axe is the
 * game's own axe icon. The split is judged on the picture itself: each pixel column of the log weighs what is solid
 * in it, so the branch and the bumps count toward their side.
 */

const VB_W = 360;
const VB_H = 250;
const BLOCK_TOP = 200;
const IMG_W = 300;
const ART_W = 640;
const ART_H = 291;
/** The branch takes up about the top 38% of the picture; flipped upside down, the log rests on its body, not the branch. */
const BRANCH_DEPTH = 0.38;
const STRIKE_MS = 120;
const NEXT_MS = 750;

/** The axe icon is 32px; its blade edge's middle is here, and turning it by STRIKE_ANGLE points the edge straight down. */
const AXE_EDGE = { x: 24.5, y: 16.5 };
const AXE_SCALE = 3.6;
const STRIKE_ANGLE = 58;
const READY_ANGLE = 30;

interface LogShape { cols: number[]; top: number[]; bottom: number[] }
let shape: LogShape | null = null;
let loading: Promise<LogShape> | null = null;

/** Reads the log picture once: how solid each column is, and where its top and bottom edges are. */
function loadShape(): Promise<LogShape> {
  if (shape) return Promise.resolve(shape);
  loading ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      if (!g) return reject(new Error('no canvas'));
      g.drawImage(img, 0, 0);
      const { data, width, height } = g.getImageData(0, 0, img.width, img.height);
      const top = new Array<number>(width).fill(1);
      const bottom = new Array<number>(width).fill(0);
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          if (data[(y * width + x) * 4 + 3] > 120) {
            top[x] = Math.min(top[x], y / height);
            bottom[x] = Math.max(bottom[x], y / height);
          }
        }
      }
      shape = { cols: columnProfile(data, width, height), top, bottom };
      resolve(shape);
    };
    img.onerror = reject;
    img.src = logArt;
  });
  return loading;
}

interface Variant { flip: boolean; upside: boolean; trimL: number; trimR: number; squash: number }

function newVariant(twisted: boolean): Variant {
  const trim = twisted ? 0.34 : 0.22;
  return {
    flip: Math.random() < 0.5,
    upside: Math.random() < 0.35,
    trimL: Math.random() * trim,
    trimR: Math.random() * trim,
    squash: 0.85 + Math.random() * 0.25,
  };
}

/** Where a variant sits on the block, in view units. */
function layout(v: Variant) {
  const imgH = (IMG_W * ART_H / ART_W) * v.squash;
  const visW = IMG_W * (1 - v.trimL - v.trimR);
  const visX0 = (VB_W - visW) / 2;
  const imgX = visX0 - v.trimL * IMG_W;
  const imgY = v.upside ? BLOCK_TOP - imgH * (1 - BRANCH_DEPTH) : BLOCK_TOP - imgH;
  return { imgH, visW, visX0, imgX, imgY };
}

/** The log's top edge, in view units, `at` (0 to 1) across what you see. */
function topAt(v: Variant, at: number): number {
  const { imgH, imgY } = layout(v);
  if (!shape) return imgY + imgH * 0.35;
  const shown = v.trimL + Math.min(1, Math.max(0, at)) * (1 - v.trimL - v.trimR);
  const col = Math.min(ART_W - 1, Math.max(0, Math.round((v.flip ? 1 - shown : shown) * (ART_W - 1))));
  const frac = v.upside ? 1 - shape.bottom[col] : shape.top[col];
  return imgY + frac * imgH;
}

function LogPicture({ v, from, to, id }: { v: Variant; from: number; to: number; id: string }) {
  const { imgH, visW, visX0, imgX, imgY } = layout(v);
  return (
    <>
      <clipPath id={id}><rect x={visX0 + from * visW} y="0" width={(to - from) * visW} height={VB_H} /></clipPath>
      <g clipPath={`url(#${id})`}>
        <g transform={`translate(${imgX + IMG_W / 2} ${imgY + imgH / 2}) scale(${v.flip ? -1 : 1} ${v.upside ? -1 : 1}) translate(${-IMG_W / 2} ${-imgH / 2})`}>
          <image href={logArt} width={IMG_W} height={imgH} preserveAspectRatio="none" />
        </g>
      </g>
    </>
  );
}

function Block() {
  return (
    <g aria-hidden="true">
      <ellipse className="split-shadow" cx={VB_W / 2} cy={BLOCK_TOP + 2} rx="150" ry="8" />
      <rect className="split-block" x="20" y={BLOCK_TOP} width={VB_W - 40} height={VB_H - BLOCK_TOP - 8} rx="4" />
      <path className="split-block-grain" d={`M34 ${BLOCK_TOP + 14} H${VB_W - 40} M50 ${BLOCK_TOP + 28} H${VB_W - 70}`} />
    </g>
  );
}

function Axe({ x, y, angle, moving }: { x: number; y: number; angle: number; moving?: boolean }) {
  return (
    <g className="split-axe" style={{ transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`, transitionDuration: moving ? `${STRIKE_MS}ms` : undefined }}>
      <g transform={`scale(${AXE_SCALE}) translate(${-AXE_EDGE.x} ${-AXE_EDGE.y})`}>
        <image href={axeArt} width="32" height="32" className="split-axe-art" />
      </g>
    </g>
  );
}

/** Split the log: aim the axe along it and tap. No timer. */
export function SplitGame({ onSwing }: { onSwing: (r: SwingResult) => void }) {
  const s = useGame();
  const twisted = !!s.giant.current?.quirks.includes('twisted');
  const [ready, setReady] = useState(!!shape);
  const [v, setV] = useState(() => newVariant(twisted));
  const [phase, setPhase] = useState<'ready' | 'strike' | 'split'>('ready');
  const [cut, setCut] = useState<{ at: number; left: number; n: number } | null>(null);
  const [aim, setAim] = useState(0.5);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => { void loadShape().then(() => setReady(true)); }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const profile = ready && shape ? logWindow(shape.cols, v.flip, v.trimL, v.trimR) : [1];
  const { visW, visX0 } = layout(v);
  const xAt = (at: number) => visX0 + at * visW;

  const chop = (at: number) => {
    if (phase !== 'ready' || !ready) return;
    const left = massShare(profile, at);
    setCut({ at, left, n: Math.random() });
    setPhase('strike');
    timers.current.push(setTimeout(() => {
      setPhase('split');
      onSwing(splitResult(left));
    }, STRIKE_MS));
    timers.current.push(setTimeout(() => {
      setCut(null);
      setPhase('ready');
      setV(newVariant(twisted));
    }, STRIKE_MS + NEXT_MS));
  };
  const across = (e: ReactPointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, ((e.clientX - box.left) / box.width * VB_W - visX0) / visW));
  };

  const at = cut?.at ?? aim;
  let peak = BLOCK_TOP;
  for (let i = 0; i <= 20; i++) peak = Math.min(peak, topAt(v, i / 20));
  const landY = topAt(v, at);
  const off = cut ? Math.abs(cut.left - 50) : 0;
  const grade = cut ? splitResult(cut.left) : '';
  const axeY = phase === 'ready' ? Math.max(30, peak - 26) : phase === 'strike' ? landY : landY + 6;

  return (
    <div className="mini-split">
      <svg
        className={`mini-split-log ${phase}`}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="button"
        tabIndex={0}
        aria-label="Split the log: move the axe along the log and tap to swing, or use the arrow keys and Enter"
        onPointerMove={(e) => { if (phase === 'ready') setAim(across(e)); }}
        onPointerDown={(e) => { if (phase !== 'ready') return; const a = across(e); setAim(a); chop(a); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); setAim((a) => Math.max(0, a - 0.01)); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); setAim((a) => Math.min(1, a + 0.01)); }
          else if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); chop(aim); }
        }}
      >
        <Block />
        {phase === 'split' && cut ? (
          <>
            <g className="split-half left" style={{ transformOrigin: `${visX0}px ${BLOCK_TOP}px` }}>
              <LogPicture v={v} from={0} to={cut.at} id={`split-l-${cut.n}`} />
            </g>
            <g className="split-half right" style={{ transformOrigin: `${visX0 + visW}px ${BLOCK_TOP}px` }}>
              <LogPicture v={v} from={cut.at} to={1} id={`split-r-${cut.n}`} />
            </g>
            {[...Array(7)].map((_, i) => (
              <rect
                key={`${cut.n}-${i}`}
                className="split-chip"
                x={xAt(cut.at) - 2}
                y={landY}
                width="5"
                height="3"
                style={{ ['--dx' as string]: `${(i % 2 ? 1 : -1) * (12 + i * 8)}px`, ['--dy' as string]: `${-16 - (i * 9) % 26}px` }}
              />
            ))}
            <text className={`mini-split-pct ${grade}`} x={Math.max(26, visX0 - 6)} y={BLOCK_TOP + 30} textAnchor="middle">{Math.round(cut.left)}%</text>
            <text className={`mini-split-pct ${grade}`} x={Math.min(VB_W - 26, visX0 + visW + 6)} y={BLOCK_TOP + 30} textAnchor="middle">{Math.round(100 - cut.left)}%</text>
          </>
        ) : (
          <>
            <LogPicture v={v} from={0} to={1} id="split-whole" />
            {phase === 'ready' && <line className="mini-split-aim" x1={xAt(aim)} x2={xAt(aim)} y1={axeY + 6} y2={BLOCK_TOP} />}
          </>
        )}
        <Axe x={xAt(at)} y={axeY} angle={phase === 'ready' ? READY_ANGLE : STRIKE_ANGLE} moving={phase === 'strike'} />
      </svg>
      {phase === 'split' && cut ? (
        <div className={`mini-split-foot mini-split-verdict ${grade}`}>
          {off <= 3 ? 'Perfect split!' : off <= 7 ? 'Clean split' : off <= 15 ? 'Lopsided' : 'Glanced off'}
        </div>
      ) : (
        <div className="mini-split-foot dim small">Line the axe up so both halves weigh the same. The branch counts toward its side.</div>
      )}
    </div>
  );
}

/** The chopping block while you are not felling: a log waiting, and the axe resting on the block. */
export function SplitIdle() {
  const v: Variant = { flip: false, upside: false, trimL: 0.05, trimR: 0.05, squash: 1 };
  return (
    <svg className="mini-split-log idle" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true">
      <Block />
      <LogPicture v={v} from={0} to={1} id="split-idle" />
      <Axe x={VB_W - 46} y={BLOCK_TOP + 4} angle={100} />
    </svg>
  );
}

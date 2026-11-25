import { useEffect, useRef, type CSSProperties } from 'react';
import anvilSprite from '../../assets/smelting/anvil.png';
import benchSprite from '../../assets/woodcutting/lodge/cainos-chisel-bench.png';
import bucketSprite from '../../assets/woodcutting/lodge/cainos-sap-bucket.png';
import grindSprite from '../../assets/woodcutting/lodge/cainos-grindstone-wheel.png';
import './forge-smithy.css';

/* The Forging backdrop: a blacksmith's shop with tools on the wall, the anvil
   in the middle and a stone hearth of live coals along the bottom. The coals
   and sparks are drawn on canvases; everything else is plain DOM. */

type Tool = 'hammer' | 'sledge' | 'tongs' | 'file' | 'shoe';

const TOOL_BOX: Record<Tool, string> = {
  hammer: '0 0 12 18', sledge: '0 0 14 22', tongs: '0 0 8 26', file: '0 0 4 20', shoe: '0 0 12 12',
};

function ToolArt({ tool }: { tool: Tool }) {
  switch (tool) {
    case 'hammer': return <>
      <rect x="1" y="0" width="10" height="4" fill="#7f858d" /><rect x="1" y="0" width="10" height="1" fill="#b5bbc2" /><rect x="10" y="0" width="1" height="4" fill="#4d5157" />
      <rect x="5" y="4" width="2" height="14" fill="#6b4423" /><rect x="6" y="4" width="1" height="14" fill="#4a2e17" />
    </>;
    case 'sledge': return <>
      <rect x="0" y="0" width="14" height="6" fill="#6a7078" /><rect x="0" y="0" width="14" height="1" fill="#a7adb4" /><rect x="13" y="0" width="1" height="6" fill="#40444a" />
      <rect x="6" y="6" width="2" height="16" fill="#6b4423" /><rect x="7" y="6" width="1" height="16" fill="#4a2e17" />
    </>;
    case 'tongs': return <>
      <rect x="1" y="0" width="2" height="5" fill="#575c63" /><rect x="5" y="0" width="2" height="5" fill="#575c63" />
      <rect x="2" y="5" width="4" height="2" fill="#6f747b" />
      <rect x="2" y="7" width="1" height="19" fill="#4a4e54" /><rect x="5" y="7" width="1" height="19" fill="#4a4e54" />
      <rect x="1" y="24" width="2" height="2" fill="#3a3d42" /><rect x="5" y="24" width="2" height="2" fill="#3a3d42" />
    </>;
    case 'file': return <>
      <rect x="1" y="0" width="2" height="13" fill="#8a9098" /><rect x="1" y="0" width="1" height="13" fill="#b5bbc2" />
      <rect x="0" y="13" width="4" height="7" fill="#7a4e28" /><rect x="3" y="13" width="1" height="7" fill="#4a2e17" />
    </>;
    case 'shoe': return <>
      <rect x="1" y="3" width="2" height="9" fill="#7b8088" /><rect x="9" y="3" width="2" height="9" fill="#5d6168" />
      <rect x="3" y="0" width="6" height="2" fill="#959aa1" /><rect x="2" y="1" width="2" height="3" fill="#868b92" /><rect x="8" y="1" width="2" height="3" fill="#6a6f76" />
      <rect x="1" y="7" width="1" height="1" fill="#2c2f33" /><rect x="10" y="7" width="1" height="1" fill="#2c2f33" />
    </>;
  }
}

/** Where each tool hangs, in % of the scene and cqw sizes. */
const TOOLS: { tool: Tool; style: CSSProperties }[] = [
  { tool: 'hammer', style: { left: '12%', top: '5.7cqw', width: '5cqw', height: '8cqw' } },
  { tool: 'tongs', style: { left: '33%', top: '5.7cqw', width: '3cqw', height: '10cqw' } },
  { tool: 'shoe', style: { left: '64%', top: '5.7cqw', width: '4cqw', height: '7cqw' } },
  { tool: 'hammer', style: { left: '7%', top: '19.5cqw', width: '6cqw', height: '9cqw' } },
  { tool: 'tongs', style: { left: '15%', top: '19.5cqw', width: '3.4cqw', height: '11cqw' } },
  { tool: 'tongs', style: { left: '21%', top: '19.5cqw', width: '3.4cqw', height: '11cqw', transform: 'rotate(6deg)' } },
  { tool: 'file', style: { left: '27.5%', top: '19.5cqw', width: '1.8cqw', height: '9cqw' } },
  { tool: 'sledge', style: { left: '32%', top: '19.5cqw', width: '7cqw', height: '11cqw' } },
  { tool: 'shoe', style: { right: '24%', top: '11.3cqw', width: '4cqw', height: '4cqw' } },
  { tool: 'shoe', style: { right: '16%', top: '11.3cqw', width: '4cqw', height: '4cqw' } },
  { tool: 'shoe', style: { right: '8%', top: '11.3cqw', width: '4cqw', height: '4cqw' } },
];

// ---------- coal colours ----------
function rgb(c: string): number[] { return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); }
function mix(a: string, b: string, k: number): string {
  k = Math.max(0, Math.min(1, k));
  const x = rgb(a), y = rgb(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`;
}
/** cold charcoal -> dull red -> orange -> yellow-white */
function heatCol(k: number): string {
  if (k < .33) return mix('#140d0b', '#6e1c0a', k / .33);
  if (k < .66) return mix('#6e1c0a', '#f06a1e', (k - .33) / .33);
  return mix('#f06a1e', '#ffe9a0', (k - .66) / .34);
}

interface Lump { x: number; y: number; r: number; pts: [number, number][]; base: number; ph: number; sp: number; fleck: boolean }
interface Stone { x: number; y: number; w: number; h: number; tone: number; front: boolean }
interface Tongue { x: number; y: number; vy: number; w: number; ph: number; life: number }
interface Spark { x: number; y: number; vx: number; vy: number; g: number; life: number; decay: number; r: number; hot: boolean }

const PIXEL_W = 220; // coal canvas is drawn this wide, then scaled up with hard edges

export function ForgeSmithy({ lit }: { lit: boolean }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const coalRef = useRef<HTMLCanvasElement>(null);
  const sparkRef = useRef<HTMLCanvasElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const litRef = useRef(lit);
  litRef.current = lit;
  const repaintRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const scene = sceneRef.current, coal = coalRef.current, spark = sparkRef.current;
    if (!scene || !coal || !spark) return;
    const cctx = coal.getContext('2d'), sctx = spark.getContext('2d');
    if (!cctx || !sctx) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let W = 0, H = 0, u = 1, lumps: Lump[] = [], stones: Stone[] = [], tongues: Tongue[] = [];
    let sw = 0, sh = 0, sparks: Spark[] = [];
    let heat = litRef.current ? 1 : .42, lastCoal = 0, lastStrike = 0, raf = 0;

    const build = () => {
      const cw = coal.clientWidth || 480, ch = coal.clientHeight || 110;
      W = PIXEL_W; H = Math.max(10, Math.round(W * ch / cw)); u = W / PIXEL_W;
      coal.width = W; coal.height = H;
      const top = H * .5, bottom = H * .84, rows = 5;
      lumps = [];
      for (let r = 0; r < rows; r++) {
        const y = top + (bottom - top) * (r / (rows - 1));
        const rad0 = (2.6 + r * 1.05) * u;
        for (let x = -rad0 + Math.random() * rad0; x < W + rad0; x += rad0 * (1.05 + Math.random() * .7)) {
          const rad = rad0 * (.55 + Math.random());
          const hump = r === 0 ? Math.sin(x / W * 9 + 1.3) * 2.5 * u + Math.sin(x / W * 23) * 1.5 * u : 0;
          const n = 5 + Math.floor(Math.random() * 4);
          const pts: [number, number][] = [];
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + Math.random() * .4;
            pts.push([Math.cos(a) * rad * (.72 + Math.random() * .38), Math.sin(a) * rad * (.6 + Math.random() * .3)]);
          }
          const dx = x / W - .5;
          lumps.push({
            x, y: y + hump + (Math.random() - .5) * rad0 * .9, r: rad, pts,
            base: Math.min(1, (.12 + .88 * Math.exp(-dx * dx / .035)) * (r === rows - 1 ? .6 : 1) * (.55 + Math.random() * .6)),
            ph: Math.random() * 6.28, sp: .0006 + Math.random() * .0016, fleck: Math.random() < .55,
          });
        }
      }
      lumps.sort((p, q) => p.y - q.y);
      // the hearth's stone lip: two courses of blocks
      stones = [];
      const lipTop = H * .74, course = (H - lipTop) / 2;
      for (let c = 0; c < 2; c++) {
        for (let x = c ? -14 * u : 0; x < W;) {
          const w = (20 + Math.random() * 12) * u;
          stones.push({ x, y: lipTop + c * course, w, h: course, tone: Math.random(), front: c === 0 });
          x += w;
        }
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sw = scene.clientWidth; sh = scene.clientHeight;
      spark.width = Math.round(sw * dpr); spark.height = Math.round(sh * dpr);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const poly = (l: Lump, s: number, ox: number, oy: number) => {
      cctx.beginPath();
      l.pts.forEach(([px, py], i) => { const X = l.x + ox + px * s, Y = l.y + oy + py * s; if (i) cctx.lineTo(X, Y); else cctx.moveTo(X, Y); });
      cctx.closePath();
    };

    const drawCoals = (t: number) => {
      heat += ((litRef.current ? 1 : .42) - heat) * (still ? 1 : .05);
      cctx.clearRect(0, 0, W, H);
      const top = H * .5;
      const flick = still ? 1 : .92 + .08 * Math.sin(t * .004) * Math.sin(t * .0023 + 1);
      // glow showing between the lumps
      const g = cctx.createRadialGradient(W / 2, H * .95, 0, W / 2, H * .95, W * .5);
      g.addColorStop(0, heatCol(Math.min(1, .95 * heat * flick)));
      g.addColorStop(.35, heatCol(.6 * heat * flick));
      g.addColorStop(.75, heatCol(.25 * heat));
      g.addColorStop(1, '#0d0806');
      cctx.fillStyle = g;
      cctx.fillRect(0, top + u, W, H);
      // flame tongues licking up through the gaps
      if (!still && Math.random() < (litRef.current ? 1.6 : .35) * heat) {
        const r3 = Math.random() + Math.random() + Math.random() - 1.5;
        tongues.push({ x: W * (.5 + r3 * .45), y: top + Math.random() * 6 * u, vy: (.35 + Math.random() * .5) * u, w: (1.5 + Math.random() * 2) * u, ph: Math.random() * 6, life: 1 });
      }
      tongues = tongues.filter((f) => {
        f.y -= f.vy; f.life -= .045; f.x += Math.sin(t * .006 + f.ph) * .25 * u;
        if (f.life <= 0) return false;
        cctx.globalAlpha = Math.min(1, f.life * 1.4) * .9;
        cctx.fillStyle = f.life > .7 ? '#fff1b8' : f.life > .45 ? '#ffb347' : f.life > .2 ? '#f0602a' : '#8a2a10';
        const fw = Math.max(u, f.w * f.life);
        cctx.fillRect(f.x - fw / 2, f.y, fw, fw * 1.6);
        return true;
      });
      cctx.globalAlpha = 1;
      // the coal lumps, back to front
      for (const l of lumps) {
        const k = l.base * heat * (.78 + .22 * Math.sin(t * l.sp + l.ph));
        poly(l, 1, 0, 0);
        cctx.fillStyle = mix('#120b09', '#3a140a', k);
        cctx.fill();
        cctx.lineWidth = Math.max(1, .9 * u);
        cctx.strokeStyle = heatCol(Math.min(.8, k * .9));
        cctx.stroke();
        if (k > .3) {
          poly(l, .58, -l.r * .08, l.r * .1);
          cctx.fillStyle = heatCol(Math.min(1, (k - .3) * 1.35));
          cctx.globalAlpha = .85;
          cctx.fill();
          cctx.globalAlpha = 1;
        }
        if (l.fleck) {
          cctx.fillStyle = mix('#2a211d', '#4a2a1c', k * .5);
          const s = Math.max(1, l.r * .45);
          cctx.fillRect(l.x - l.r * .35, l.y - l.r * .5, s, Math.max(1, s * .45));
        }
      }
      // stone lip in front, its top edge catching the glow
      for (const s of stones) {
        cctx.fillStyle = mix('#241c18', '#3a2f28', s.tone);
        cctx.fillRect(s.x, s.y, s.w, s.h);
        cctx.fillStyle = '#0e0a08';
        cctx.fillRect(s.x, s.y, Math.max(1, u), s.h);
        cctx.fillRect(s.x, s.y + s.h - Math.max(1, u), s.w, Math.max(1, u));
        if (s.front) {
          cctx.fillStyle = heatCol(.45 + .4 * heat * flick);
          cctx.globalAlpha = .55 + .35 * heat;
          cctx.fillRect(s.x, s.y, s.w, Math.max(1, 1.4 * u));
          cctx.globalAlpha = .25 * heat;
          cctx.fillRect(s.x, s.y + 1.4 * u, s.w, s.h * .35);
          cctx.globalAlpha = 1;
        }
      }
    };

    /** Sparks fly off the hot bar on each hammer blow. */
    const strike = () => {
      const bar = barRef.current, flash = flashRef.current;
      if (!bar) return;
      const sr = scene.getBoundingClientRect(), br = bar.getBoundingClientRect();
      const cx = br.left - sr.left + br.width * .55, cy = br.top - sr.top;
      if (flash) { flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on'); }
      for (let i = 0; i < 22; i++) {
        const a = -Math.PI / 2 + (Math.random() - .5) * 2.6, v = 1.5 + Math.random() * 3.5;
        sparks.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .12, life: 1, decay: .02 + Math.random() * .02, r: .7 + Math.random() * 1.2, hot: true });
      }
    };

    const drawSparks = (t: number) => {
      sctx.clearRect(0, 0, sw, sh);
      if (Math.random() < (litRef.current ? .45 : .12)) {
        sparks.push({ x: sw * (.1 + Math.random() * .8), y: sh - coal.clientHeight * (.45 + Math.random() * .15), vx: (Math.random() - .5) * .3, vy: -(.25 + Math.random() * .6) * (litRef.current ? 1.3 : .7), g: 0, life: 1, decay: .004 + Math.random() * .006, r: .8 + Math.random() * 1.4, hot: false });
      }
      if (litRef.current && t - lastStrike > 1150) { lastStrike = t; strike(); }
      sparks = sparks.filter((p) => {
        p.x += p.vx + (p.hot ? 0 : Math.sin(t / 600 + p.y / 30) * .2); p.y += p.vy; p.vy += p.g;
        p.life -= p.decay;
        if (p.life <= 0 || p.y > sh + 5) return false;
        sctx.globalAlpha = p.life;
        sctx.fillStyle = p.hot ? '#ffe7a3' : p.life > .5 ? '#ffb15c' : '#ff6a1f';
        sctx.beginPath(); sctx.arc(p.x, p.y, p.r, 0, 6.283); sctx.fill();
        return true;
      });
      sctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      if (t - lastCoal > 70) { lastCoal = t; drawCoals(t); }
      drawSparks(t);
      raf = requestAnimationFrame(loop);
    };

    build();
    const ro = new ResizeObserver(() => { build(); if (still) drawCoals(0); });
    ro.observe(scene);
    if (still) { drawCoals(0); repaintRef.current = () => drawCoals(0); } else raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); repaintRef.current = null; };
  }, []);

  // with motion off nothing animates, so repaint the coals when forging starts or stops
  useEffect(() => { repaintRef.current?.(); }, [lit]);

  return (
    <div ref={sceneRef} className={`smithy${lit ? ' smithy-lit' : ''}`} aria-hidden="true">
      <div className="smithy-wall" /><div className="smithy-stone" />
      <div className="smithy-beam" />
      <div className="smithy-rack" />
      {TOOLS.map(({ tool, style }, i) => (
        <svg key={i} className="smithy-tool" style={style} viewBox={TOOL_BOX[tool]} shapeRendering="crispEdges" preserveAspectRatio="none">
          <ToolArt tool={tool} />
        </svg>
      ))}
      <div className="smithy-bars"><i /><i /><i /></div>
      <div className="smithy-shelf" />
      <div className="smithy-floor" />
      <img className="smithy-bench" src={benchSprite} alt="" />
      <div className="smithy-coalheap" />
      <img className="smithy-bucket" src={bucketSprite} alt="" />
      <img className="smithy-grind" src={grindSprite} alt="" />
      <div className="smithy-anvil">
        <img src={anvilSprite} alt="" />
        <div className="smithy-stump" />
        <div ref={barRef} className="smithy-bar" />
        <div ref={flashRef} className="smithy-flash" />
      </div>
      <canvas ref={coalRef} className="smithy-coals" />
      <div className="smithy-uplight" /><div className="smithy-vignette" />
      <canvas ref={sparkRef} className="smithy-sparks" />
    </div>
  );
}

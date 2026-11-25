import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { SwingResult } from '../../engine/minigame';
import './woodcarving.css';

const WIDTH = 600;
const HEIGHT = 224;
const START = 78;
const END = 522;
const CUT_LENGTH = END - START;
const READY = 'Start at the brass mark. Pull right, riding the pale grain through each bend.';

function grainAt(x: number) {
  const along = (x - START) / CUT_LENGTH;
  return 110 - 22 * Math.sin(along * Math.PI * 4) * Math.sin(along * Math.PI);
}

function depthTolerance(x: number) {
  return 19 - 4 * Math.abs(Math.sin((x - START) / CUT_LENGTH * Math.PI * 2));
}

interface Point { x: number; y: number }
interface Stroke { input: number | 'keys'; point: Point; shaving: Point[] }

function drawBench(ctx: CanvasRenderingContext2D, shaving: Point[], cutting: boolean, bladeDepth: number | null) {
  const path = (color: string, width: number, points: Point[]) => {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const { x, y } of points.slice(1)) ctx.lineTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  const fill = (color: string, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  };
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  fill('#160f0c', 35, 73, 530, 97, 11);
  const timber = ctx.createLinearGradient(0, 62, 0, 163);
  timber.addColorStop(0, '#cf9c5a');
  timber.addColorStop(.24, '#9f6235');
  timber.addColorStop(.73, '#8b4d2a');
  timber.addColorStop(1, '#542d1b');
  ctx.fillStyle = timber;
  ctx.beginPath();
  ctx.roundRect(35, 62, 530, 100, 11);
  ctx.fill();

  ctx.save();
  ctx.clip();
  for (let row = 0; row < 19; row++) {
    const points = Array.from({ length: 55 }, (_, i) => {
      const x = 30 + i * 10;
      return { x, y: 66 + row * 5 + 4 * Math.sin(i / 5 + row * .44) + 2 * Math.sin(i / 2 + row) };
    });
    path(row % 3 === 0 ? '#48251365' : '#f5c78132', row % 3 === 0 ? 1.8 : .9, points);
  }
  ctx.restore();

  const guide = Array.from({ length: 112 }, (_, i) => {
    const x = START + i * 4;
    return { x, y: grainAt(x) };
  });
  path('#f3c07973', 23, guide);
  ctx.setLineDash([4, 7]);
  path('#ffe2a7', 1.8, guide);
  ctx.setLineDash([]);
  path('#4f2d20', 6, shaving);
  path('#ffd282', 3, shaving.map(({ x, y }) => ({ x, y: y - 2 })));

  for (const x of [44, 532]) {
    fill('#1f1b17', x - 5, 44, 33, 133, 6);
    fill('#4c4940', x, 45, 23, 113, 4);
    fill('#787163', x + 3, 48, 17, 21, 3);
    fill('#39352e', x + 3, 140, 17, 15, 3);
    fill('#25201b', x + 8, 53, 8, 8, 4);
    fill('#ad8755', x + 8, 145, 8, 6, 3);
  }

  const tip = shaving.at(-1) ?? { x: START, y: grainAt(START) };
  if (shaving.length > 1) {
    const radius = Math.min(27, 4 + (tip.x - START) / 13);
    const curl = Array.from({ length: 60 }, (_, index) => {
      const t = index / 59;
      const angle = Math.PI / 2 + t * Math.PI * (1.2 + radius / 10);
      const r = radius * (1 - t * .85);
      return { x: tip.x + Math.cos(angle) * r, y: tip.y - radius + Math.sin(angle) * r };
    });
    path('#432417', 8, curl);
    path('#c17f44', 5, curl);
    path('#ffe2a3', 2, curl);
  }
  if (cutting || !shaving.length) {
    ctx.save();
    ctx.translate(tip.x, bladeDepth ?? tip.y);
    ctx.rotate(-.42);
    fill('#271913', -42, -8, 44, 14, 6);
    fill('#754329', -40, -7, 31, 9, 4);
    fill('#e5be78', -10, -9, 11, 15, 2);
    fill('#d5d2c2', 0, -7, 14, 10, 2);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(START, grainAt(START), 13, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffdd95';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

export function WoodcarvingGame({ onSwing }: { onSwing?: (result: SwingResult) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<Stroke | null>(null);
  const [shaving, setShaving] = useState<Point[]>([]);
  const [cutting, setCutting] = useState(false);
  const [bladeDepth, setBladeDepth] = useState<number | null>(null);
  const [message, setMessage] = useState(READY);
  const length = Math.round(((shaving.at(-1)?.x ?? START) - START) / CUT_LENGTH * 100);

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    drawBench(ctx, shaving, cutting, bladeDepth);
  }, [shaving, cutting, bladeDepth]);

  function begin(input: Stroke['input']) {
    const point = { x: START, y: grainAt(START) };
    stroke.current = { input, point, shaving: [point] };
    setShaving([point]);
    setCutting(true);
    setBladeDepth(input === 'keys' ? point.y : null);
    setMessage('Keep the edge inside the pale grain.');
  }

  function finish(run: Stroke, complete: boolean, reason: string) {
    const fraction = (run.shaving[run.shaving.length - 1].x - START) / CUT_LENGTH;
    stroke.current = null;
    setShaving([...run.shaving]);
    setCutting(false);
    setBladeDepth(null);
    setMessage(complete ? 'One intact shaving.' : reason);
    if (complete) onSwing?.('double');
    else if (fraction >= .6) onSwing?.('hit');
    else if (fraction >= .25) onSwing?.('weak');
    else if (fraction > 0) onSwing?.('miss');
  }

  function advance(run: Stroke, point: Point) {
    const previous = run.point;
    run.point = point;
    const lastCut = run.shaving[run.shaving.length - 1].x;
    const target = Math.min(point.x, END);
    if (target <= lastCut) return;

    // Check between pointer samples so a fast swipe must still follow the bends.
    const steps = Math.ceil((target - lastCut) / 4);
    for (let step = 1; step <= steps; step++) {
      const x = lastCut + (target - lastCut) * step / steps;
      const y = previous.y + (point.y - previous.y) * (x - previous.x) / (point.x - previous.x);
      if (Math.abs(y - grainAt(x)) > depthTolerance(x)) {
        finish(run, false, y > grainAt(x) ? 'The blade dug in and split the curl.' : 'The blade lifted and the curl broke.');
        return;
      }
      run.shaving.push({ x, y });
    }
    if (target === END) finish(run, true, '');
    else setShaving([...run.shaving]);
  }

  function pointerPoint(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * WIDTH, y: (event.clientY - rect.top) / rect.height * HEIGHT };
  }

  function endPointer(event: PointerEvent<HTMLCanvasElement>, cancelled = false) {
    const run = stroke.current;
    if (run?.input !== event.pointerId) return;
    if (cancelled) {
      stroke.current = null;
      setShaving([]);
      setCutting(false);
      setMessage(READY);
      return;
    }
    advance(run, pointerPoint(event));
    if (stroke.current === run) finish(run, false, 'You lifted the blade. Start at the brass mark to try again.');
  }

  function onKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat && !stroke.current) begin('keys');
      return;
    }
    const run = stroke.current;
    if (run?.input !== 'keys') return;
    if (event.key === 'Escape') {
      finish(run, false, 'You lifted the blade. Press Enter to try again.');
      return;
    }
    const { x, y } = run.point;
    const adjustDepth = (offset: number) => {
      const depth = Math.max(65, Math.min(155, y + offset));
      advance(run, { x, y: depth });
      setBladeDepth(depth);
    };
    switch (event.key) {
      case 'ArrowUp': event.preventDefault(); adjustDepth(-6); break;
      case 'ArrowDown': event.preventDefault(); adjustDepth(6); break;
      case 'ArrowRight': event.preventDefault(); advance(run, { x: x + 10, y }); break;
    }
  }

  return <div className="woodcarving">
    <canvas ref={canvas} width={WIDTH * 2} height={HEIGHT * 2}
      aria-label={onSwing ? 'Carving blank. Press Enter to start, Right to cut, Up and Down to adjust depth, Escape to lift the blade.' : 'Wooden blank held by two bench clamps'}
      tabIndex={onSwing ? 0 : undefined}
      className={onSwing ? 'woodcarving-playable' : undefined}
      onPointerDown={onSwing && ((event) => {
        if (!event.isPrimary || event.button !== 0 || stroke.current) return;
        const point = pointerPoint(event);
        if (Math.hypot(point.x - START, point.y - grainAt(START)) > 27) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        begin(event.pointerId);
      })}
      onPointerMove={onSwing && ((event) => {
        const run = stroke.current;
        if (run?.input === event.pointerId) advance(run, pointerPoint(event));
      })}
      onPointerUp={onSwing && ((event) => endPointer(event))}
      onPointerCancel={onSwing && ((event) => endPointer(event, true))}
      onLostPointerCapture={onSwing && ((event) => endPointer(event, true))}
      onKeyDown={onSwing && onKeyDown}
      onBlur={onSwing && (() => {
        const run = stroke.current;
        if (run?.input === 'keys') finish(run, false, 'You lifted the blade. Press Enter to try again.');
      })} />
    {onSwing && <>
      <div className="woodcarving-status"><span role="status">{message}</span><b className="num">{length}% shaving</b></div>
      <div className="woodcarving-keys">Enter to start · Right to cut · Up and Down to set depth · Esc to lift</div>
    </>}
  </div>;
}

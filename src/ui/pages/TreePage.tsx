import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ASCENDANCY_NODE_BY_ID,
  ascendanciesOf,
  SWITCH_MATERIAL_COST,
  TRIAL_SEAL,
  type AscendancyDef,
  type AscendancyId,
  type AscendancyNode,
} from '../../data/ascendancies';
import { classDef } from '../../data/classes';
import { CLASS_SECTORS, MECHANIC_INFO, PASSIVE_BY_ID, PASSIVE_NODES, REGION_NAMES, type PassiveNode, type TreeRegion } from '../../data/passiveTree';
import { SKILL_TREE_BY_ID, SKILL_TREE_NODES, SKILL_TREE_START, type SkillTreeNode } from '../../data/skillTree';
import { SKILLS } from '../../data/skills';
import { describeStats } from '../../data/statText';
import {
  allocateAscNode,
  ascendancyPointsLeft,
  ascNodeReason,
  canAscend,
  chooseAscendancy,
  chooseReason,
  currentAscendancy,
  refundAscNode,
  refundAscReason,
  switchAscendancy,
  switchCost,
  switchReason,
} from '../../engine/ascendancy';
import { ruleLockReason } from '../../engine/automation';
import { allocate, allocateReason, changeMastery, pointsLeft, refund, refundReason, startNode, totalPoints } from '../../engine/passives';
import { allocateSkillNode, refundSkillNode, refundSkillNodeReason, skillNodeReason, skillPointsLeft, skillTreePoints } from '../../engine/skillTree';
import { deriveStats, passiveStats, type Derived } from '../../engine/stats';
import type { GameState, NovaRelease, SkillId, TargetOrder, TargetPriority } from '../../engine/types';
import { game, useGame } from '../../game';
import { PageHeader, Tabs } from '../components/common';
import { ORDERS, PRIORITIES } from './CombatPage';

const REGION_COLOR: Record<TreeRegion, string> = {
  str: '#d0574a',
  dex: '#5fbf6a',
  int: '#5f8de0',
  duelist: '#d39a4a',
  shadow: '#5fb8b0',
  templar: '#c98fd6',
  center: '#c9b37a',
  forbidden: '#ff3d6e',
};

const BRANCH_COLOR: Record<string, string> = {
  core: '#d2a659',
  mining: '#c8743f',
  woodcutting: '#6fae4a',
  harvesting: '#d9b84a',
  thieving: '#c9a35a',
  archaeology: '#b0784a',
  fishing: '#4fa3d9',
  smithing: '#b8b8c8',
  alchemy: '#9b6dde',
  runecarving: '#6fa8ff',
  cooking: '#e08a4a',
};

// ---------- a pannable, zoomable tree canvas shared by both trees ----------

interface CanvasNode {
  id: string;
  x: number;
  y: number;
  links: string[];
}

interface CanvasLabel {
  text: string;
  x: number;
  y: number;
  color: string;
  size?: number;
}

type View = { x: number; y: number; k: number };

function TreeCanvas<N extends CanvasNode>({
  nodes,
  byId,
  size,
  version,
  focus,
  maxZoom = 2.6,
  isOn,
  canTake,
  matches,
  renderNode,
  tip,
  onClick,
  labels,
  names,
  tutId,
}: {
  nodes: N[];
  byId: Record<string, N>;
  size: number;
  /** changes whenever anything drawn changes; the node layer is only rebuilt then */
  version: string;
  /** where the view opens and what "Home" returns to */
  focus?: View;
  maxZoom?: number;
  isOn: (id: string) => boolean;
  canTake: (id: string) => boolean;
  matches: Set<string> | null;
  renderNode: (n: N, on: boolean, can: boolean) => ReactNode;
  tip: (n: N) => ReactNode;
  onClick: (n: N) => void;
  labels?: CanvasLabel[];
  /** labels that only show once zoomed in (node names) */
  names?: CanvasLabel[];
  /** tutorial highlight id for a node, if any */
  tutId?: (id: string) => string | undefined;
}) {
  const home = focus ?? { x: 0, y: 0, k: 1 };
  const [view, setView] = useState<View>(home);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; unit: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;
  const clamp = (k: number) => Math.min(maxZoom, Math.max(0.8, k));

  /** zoom by `f`, keeping the point under the cursor (or the centre) still */
  const zoomAt = (f: number, clientX?: number, clientY?: number) =>
    setView((v) => {
      const k = clamp(v.k * f);
      const r = wrap.current?.getBoundingClientRect();
      if (!r || clientX === undefined || clientY === undefined) return { ...v, k };
      const unit = size / Math.min(r.width, r.height);
      const cx = (clientX - r.left - r.width / 2) * unit;
      const cy = (clientY - r.top - r.height / 2) * unit;
      return { k, x: v.x + cx / k - cx / v.k, y: v.y + cy / k - cy / v.k };
    });

  // a native listener so the wheel zooms the tree instead of scrolling the page
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const layer = useMemo(() => {
    const links: [N, N][] = [];
    for (const n of nodes) for (const l of n.links) if (n.id < l) links.push([n, byId[l]]);
    return (
      <>
        {links.map(([a, b]) => {
          const on = isOn(a.id) && isOn(b.id);
          const can = !on && ((isOn(a.id) && canTake(b.id)) || (isOn(b.id) && canTake(a.id)));
          return <line key={`${a.id}-${b.id}`} className={`tree-link ${on ? 'on' : can ? 'can' : ''}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
        })}
        {nodes.map((n) => {
          const on = isOn(n.id);
          const can = canTake(n.id);
          const dim = matches && !matches.has(n.id);
          return (
            <g
              key={n.id}
              data-tut={tutId?.(n.id)}
              className={`tree-node ${on ? 'on' : ''} ${can ? 'can' : ''} ${matches?.has(n.id) ? 'match' : ''}`}
              transform={`translate(${n.x} ${n.y})`}
              style={{ opacity: dim ? 0.25 : 1 }}
              onMouseMove={(e) => setHover({ id: n.id, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHover((h) => (h?.id === n.id ? null : h))}
              onClick={() => !drag.current?.moved && clickRef.current(n)}
            >
              {renderNode(n, on, can)}
            </g>
          );
        })}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` stands in for everything drawn
  }, [version, nodes, byId]);

  const showNames = view.k >= maxZoom * 0.55;
  const nameLayer = useMemo(
    () =>
      showNames &&
      names?.map((l) => (
        <text key={`${l.text}@${l.x},${l.y}`} className="tree-name" x={l.x} y={l.y} textAnchor="middle" fill={l.color} fontSize={l.size ?? 15}>
          {l.text}
        </text>
      )),
    [showNames, names],
  );

  const hovered = hover && byId[hover.id];
  return (
    <div
      className="tree-wrap"
      ref={wrap}
      onPointerDown={(e) => {
        const r = wrap.current!.getBoundingClientRect();
        drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false, unit: size / Math.min(r.width, r.height) };
      }}
      onPointerMove={(e) => {
        const dr = drag.current;
        if (!dr) return;
        const dx = e.clientX - dr.x;
        const dy = e.clientY - dr.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) dr.moved = true;
        if (dr.moved) {
          setHover(null);
          setView((v) => ({ ...v, x: dr.vx + (dx * dr.unit) / v.k, y: dr.vy + (dy * dr.unit) / v.k }));
        }
      }}
      onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
      onPointerLeave={() => {
        drag.current = null;
        setHover(null);
      }}
    >
      <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
        <g transform={`scale(${view.k}) translate(${view.x} ${view.y})`}>
          {labels?.map((l) => (
            <text key={l.text} x={l.x} y={l.y} textAnchor="middle" dominantBaseline="middle" fill={l.color} opacity={0.5} fontFamily="Cinzel, serif" fontSize={l.size ?? 24} letterSpacing={5}>
              {l.text}
            </text>
          ))}
          {layer}
          {nameLayer}
        </g>
      </svg>
      {hovered &&
        createPortal(
          <div className="tooltip-layer" style={tipPosition(hover.x, hover.y)}>
            {tip(hovered)}
          </div>,
          document.body,
        )}
      <div className="tree-controls">
        <button className="btn sm" onClick={() => zoomAt(1.25)}>
          +
        </button>
        <button className="btn sm" onClick={() => zoomAt(1 / 1.25)}>
          −
        </button>
        {focus && (
          <button className="btn sm" onClick={() => setView(home)}>
            Home
          </button>
        )}
        <button className="btn sm" onClick={() => setView({ x: 0, y: 0, k: 1 })}>
          {focus ? 'Whole tree' : 'Reset'}
        </button>
      </div>
      <div className="tree-legend">Drag to pan · scroll to zoom · click to allocate</div>
    </div>
  );
}

/** keep the tooltip on screen: flip left of the cursor in the right half, up in the bottom half */
function tipPosition(x: number, y: number): CSSProperties {
  const right = x > window.innerWidth / 2;
  const bottom = y > window.innerHeight * 0.6;
  return {
    left: right ? undefined : x + 16,
    right: right ? window.innerWidth - x + 12 : undefined,
    top: bottom ? undefined : y + 16,
    bottom: bottom ? window.innerHeight - y + 12 : undefined,
  };
}

// ---------- shapes ----------

function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${Math.round(r * Math.cos(a))},${Math.round(r * Math.sin(a))}`;
  }).join(' ');
}

function NodeShape(props: { kind: string; color: string; on: boolean; can: boolean; mine?: boolean; mech?: boolean }) {
  const r = { keystone: 30, notable: 22, mastery: 0, start: 0, core: 0, travel: 12, small: 15 }[props.kind] ?? 15;
  // class-mechanic nodes out on the rim glow in their class colour, so the long road out reads as worth it
  if (!props.mech || !r) return <BaseShape {...props} />;
  return (
    <>
      <circle className="mech-glow" r={r * 2.1} style={{ ['--region' as string]: props.color }} />
      <circle r={r} fill="none" stroke={props.color} strokeWidth={3} opacity={props.on ? 1 : 0.85} />
      <BaseShape {...props} />
    </>
  );
}

function BaseShape({ kind, color, on, can, mine = true }: { kind: string; color: string; on: boolean; can: boolean; mine?: boolean }) {
  const stroke = on ? 'var(--accent-2)' : can ? '#b89a62' : '#4a5060';
  const fill = on ? `color-mix(in srgb, ${color} 55%, #2a2010)` : '#1c1f28';
  const style = { fill, stroke, strokeWidth: 3, ['--region' as string]: color };
  switch (kind) {
    case 'keystone':
      return (
        <>
          <circle className="halo" r={32} style={{ ['--region' as string]: color }} />
          <rect className="body" x={-22} y={-22} width={44} height={44} rx={7} transform="rotate(45)" style={style} />
          <circle r={9} fill={on ? color : '#2a2e38'} />
        </>
      );
    case 'notable':
      return (
        <>
          <circle className="halo" r={24} style={{ ['--region' as string]: color }} />
          <circle className="body" r={17} style={style} />
          <circle r={8} fill={on ? color : '#2a2e38'} />
        </>
      );
    case 'mastery':
      return (
        <>
          <circle className="halo" r={20} style={{ ['--region' as string]: 'var(--accent)' }} />
          <polygon className="body" points={hexPoints(15)} style={{ ...style, fill: on ? 'color-mix(in srgb, var(--accent) 45%, #2a2010)' : '#1c1f28' }} />
          <polygon points={hexPoints(6)} fill={on ? 'var(--accent-2)' : '#3a3f4c'} />
        </>
      );
    case 'start':
    case 'core':
      return <circle className="body" r={24} style={{ ...style, fill: mine ? `color-mix(in srgb, ${color} 40%, #1c1f28)` : '#15171c', opacity: mine ? 1 : 0.35 }} />;
    case 'travel':
      return <circle className="body" r={8} style={style} />;
    default:
      return <circle className="body" r={11} style={style} />;
  }
}

// ---------- character tree ----------

function CharacterNodeTip({ s, n }: { s: GameState; n: PassiveNode }) {
  const allocated = s.passives.includes(n.id);
  if (n.kind === 'start') {
    return <div className="tip">{n.id === startNode(s) ? `${n.name} start — your starting point` : `${n.name} start (another class)`}</div>;
  }
  const reason = allocated ? refundReason(s, n.id) : allocateReason(s, n.id);
  const before = deriveStats(s, []);
  const next = allocated ? s.passives.filter((x) => x !== n.id) : [...s.passives, n.id];
  const after = n.kind === 'mastery' ? before : deriveStats({ ...s, passives: next }, []);
  const chosen = n.kind === 'mastery' ? s.masteries[n.id] : undefined;
  return (
    <div className="tip" style={{ minWidth: 240, maxWidth: 320 }}>
      <div className="tip-title" style={{ color: n.kind === 'keystone' ? 'var(--unique)' : n.kind === 'notable' || n.kind === 'mastery' ? 'var(--accent-2)' : 'var(--text)' }}>
        {n.name}
        <span className="dim" style={{ fontWeight: 400, marginLeft: 6, fontSize: 'var(--fs-xs)' }}>
          {n.kind} · {REGION_NAMES[n.region]}
        </span>
      </div>
      {n.mechanic && (
        <div className="small" style={{ color: REGION_COLOR[n.region], marginBottom: 4 }}>
          {MECHANIC_INFO[n.mechanic].cls} mechanic · only affects characters with {MECHANIC_INFO[n.mechanic].name}
        </div>
      )}
      {n.kind === 'mastery' ? (
        <div className="mastery-tip">
          {n.options!.map((o, i) => (
            <div key={i} className={`mod ${chosen === i ? 'chosen' : ''}`}>
              {chosen === i ? '◆ ' : '◇ '}
              {o.label}
            </div>
          ))}
          <div className="dim" style={{ fontSize: 'var(--fs-xs)', marginTop: 4 }}>
            {allocated ? 'Click to change your pick (1 Orb of Regret) or refund.' : 'Click to choose one bonus.'}
          </div>
        </div>
      ) : (
        <>
          {(n.desc ? [n.desc] : describeStats(n.stats)).map((l) => (
            <div key={l} className="mod">
              {l}
            </div>
          ))}
          <StatDeltas before={before} after={after} />
        </>
      )}
      <div className={reason ? 'warn' : 'good'} style={{ marginTop: 6, fontSize: 'var(--fs-xs)' }}>
        {n.kind === 'mastery' && !allocated && !reason
          ? 'Click to pick a bonus'
          : (reason ?? (allocated ? 'Click to refund (1 Orb of Regret)' : 'Click to allocate'))}
      </div>
    </div>
  );
}

const SUMMARY: [string, (d: Derived) => number, (n: number) => string][] = [
  ['Life', (d) => d.maxLife, (n) => n.toFixed(0)],
  ['Mana', (d) => d.maxMana, (n) => n.toFixed(0)],
  ['Energy Shield', (d) => d.maxEs, (n) => n.toFixed(0)],
  ['DPS', (d) => d.dps, (n) => n.toFixed(1)],
  ['Armour', (d) => d.armour, (n) => n.toFixed(0)],
  ['Evasion', (d) => d.evasion, (n) => n.toFixed(0)],
];

function StatDeltas({ before, after }: { before: Derived; after: Derived }) {
  const rows = SUMMARY.map(([label, f, fm]) => ({ label, delta: f(after) - f(before), fm })).filter((r) => Math.abs(r.delta) >= 0.05);
  if (!rows.length) return null;
  return (
    <div className="delta-list" style={{ marginTop: 6 }}>
      {rows.map((r) => (
        <span key={r.label} style={{ display: 'contents' }}>
          <span className="muted">{r.label}</span>
          <span className={r.delta > 0 ? 'good' : 'bad'}>
            {r.delta > 0 ? '+' : '−'}
            {r.fm(Math.abs(r.delta))}
          </span>
        </span>
      ))}
    </div>
  );
}

function MasteryPicker({ s, n, onClose }: { s: GameState; n: PassiveNode; onClose: () => void }) {
  const allocated = s.passives.includes(n.id);
  const chosen = s.masteries[n.id];
  const regret = s.bank.regret ?? 0;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-title">
          {n.name}
          <span className="grow" />
          <button className="btn sm ghost" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="muted" style={{ marginTop: 0, fontSize: 'var(--fs-sm)' }}>
          {allocated ? `Changing your pick costs 1 Orb of Regret (you have ${regret}).` : 'Pick one bonus. You can change it later for an Orb of Regret.'}
        </p>
        <div className="grid" style={{ gap: 8 }}>
          {n.options!.map((o, i) => (
            <button
              key={i}
              className={`mastery-option ${chosen === i ? 'chosen' : ''}`}
              disabled={chosen === i || (allocated && regret < 1)}
              onClick={() => {
                const err = game.act((st, ctx) => (allocated ? changeMastery(st, ctx, n.id, i) : allocate(st, ctx, n.id, i)));
                if (!err) onClose();
              }}
            >
              <span className="mastery-mark">{chosen === i ? '◆' : '◇'}</span>
              {o.label}
            </button>
          ))}
        </div>
        {allocated && (
          <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
            <button
              className="btn sm danger"
              disabled={!!refundReason(s, n.id)}
              title={refundReason(s, n.id) ?? ''}
              onClick={() => {
                game.act((st, ctx) => refund(st, ctx, n.id));
                onClose();
              }}
            >
              Refund mastery (1 Orb of Regret)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function searchMatches(query: string, nodes: { id: string; name: string; text: string[] }[]): Set<string> | null {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;
  return new Set(nodes.filter((n) => n.name.toLowerCase().includes(q) || n.text.some((t) => t.toLowerCase().includes(q))).map((n) => n.id));
}

const CHAR_TREE_SIZE = 5700;
const CHAR_TREE_ZOOM = 5;

const CHAR_LABELS: CanvasLabel[] = [
  ...CLASS_SECTORS.map((c) => {
    const a = (c.angle * Math.PI) / 180;
    return { text: c.name.toUpperCase(), x: Math.round(2120 * Math.cos(a)), y: Math.round(2120 * Math.sin(a)), color: REGION_COLOR[c.key], size: 64 };
  }),
  { text: 'CROSSING', x: 0, y: 0, color: REGION_COLOR.center, size: 30 },
];

/** names under notables, keystones and class starts once zoomed in */
const CHAR_NAMES: CanvasLabel[] = PASSIVE_NODES.filter((n) => n.kind === 'notable' || n.kind === 'keystone' || n.kind === 'start').map((n) => ({
  text: n.name,
  x: n.x,
  y: n.y + (n.kind === 'keystone' ? 50 : n.kind === 'start' ? 44 : 36),
  color: n.kind === 'keystone' ? 'var(--unique)' : n.kind === 'start' ? REGION_COLOR[n.region] : 'var(--accent-2)',
  size: n.kind === 'notable' ? 14 : 18,
}));

function CharacterTree({ s }: { s: GameState }) {
  const [query, setQuery] = useState('');
  const [picker, setPicker] = useState<PassiveNode | null>(null);
  const myStart = startNode(s);
  const allocated = new Set(s.passives);
  const isOn = (id: string) => id === myStart || allocated.has(id);
  const canTake = (id: string) => !isOn(id) && allocateReason(s, id) === null;
  const searchable = useMemo(
    () => PASSIVE_NODES.map((n) => ({ id: n.id, name: n.name, text: n.options ? n.options.map((o) => o.label) : n.desc ? [n.desc] : describeStats(n.stats) })),
    [],
  );
  const matches = searchMatches(query, searchable);
  const totals = describeStats(Object.fromEntries(Object.entries(passiveStats(s.passives, s.masteries)).filter(([, v]) => v)));

  const click = (n: PassiveNode) => {
    if (n.kind === 'start') return;
    if (n.kind === 'mastery' && (allocated.has(n.id) || canTake(n.id))) return setPicker(n);
    if (allocated.has(n.id)) game.act((st, ctx) => refund(st, ctx, n.id));
    else game.act((st, ctx) => allocate(st, ctx, n.id));
  };

  return (
    <>
      <div className="row wrap">
        <span className={`chip ${pointsLeft(s) > 0 ? 'good' : ''}`} style={{ fontSize: 14 }}>
          {pointsLeft(s)} / {totalPoints(s)} points left
        </span>
        <span className="chip">{s.bank.regret ?? 0} Orbs of Regret</span>
        <span className="spacer" />
        <input className="input tree-search" placeholder="Search nodes (e.g. armour, poison)" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <TreeCanvas
        nodes={PASSIVE_NODES}
        byId={PASSIVE_BY_ID}
        size={CHAR_TREE_SIZE}
        maxZoom={CHAR_TREE_ZOOM}
        version={`${myStart}|${s.passives.join(',')}|${pointsLeft(s)}|${query}`}
        focus={{ x: -PASSIVE_BY_ID[myStart].x, y: -PASSIVE_BY_ID[myStart].y, k: 3 }}
        names={CHAR_NAMES}
        isOn={isOn}
        canTake={canTake}
        matches={matches}
        labels={CHAR_LABELS}
        renderNode={(n, on, can) => <NodeShape kind={n.kind} color={REGION_COLOR[n.region]} on={on} can={can} mine={n.id === myStart} mech={!!n.mechanic} />}
        tip={(n) => <CharacterNodeTip s={s} n={n} />}
        onClick={click}
        tutId={(id) => (s.passives.length === 0 && canTake(id) ? 'tree-start' : undefined)}
      />
      <div className="tree-key">
        <span>
          <svg width="18" height="18" viewBox="-12 -12 24 24">
            <circle r="9" fill="#1c1f28" stroke="#4a5060" strokeWidth="3" />
          </svg>
          Small
        </span>
        <span>
          <svg width="22" height="22" viewBox="-14 -14 28 28">
            <circle r="12" fill="#1c1f28" stroke="#4a5060" strokeWidth="3" />
          </svg>
          Notable
        </span>
        <span>
          <svg width="22" height="22" viewBox="-14 -14 28 28">
            <polygon points={hexPoints(11)} fill="#1c1f28" stroke="var(--accent)" strokeWidth="3" />
          </svg>
          Mastery (pick 1 of 3)
        </span>
        <span>
          <svg width="24" height="24" viewBox="-16 -16 32 32">
            <rect x="-10" y="-10" width="20" height="20" rx="4" transform="rotate(45)" fill="#1c1f28" stroke="#4a5060" strokeWidth="3" />
          </svg>
          Keystone
        </span>
        <span>
          <svg width="22" height="22" viewBox="-14 -14 28 28">
            <circle r="12" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeDasharray="4 3" />
            <circle r="7" fill="#1c1f28" stroke="#4a5060" strokeWidth="2.5" />
          </svg>
          Class mechanic (Rage, Momentum, …)
        </span>
      </div>
      <div className="card">
        <div className="card-title">Bonuses from your tree</div>
        {totals.length === 0 ? (
          <div className="dim">Nothing allocated yet. Start next to your class.</div>
        ) : (
          <div className="tree-totals">
            {totals.map((l) => (
              <span key={l} className="mod">
                {l}
              </span>
            ))}
          </div>
        )}
      </div>
      {picker && <MasteryPicker s={s} n={picker} onClose={() => setPicker(null)} />}
    </>
  );
}

// ---------- skilling tree ----------

function SkillNodeTip({ s, n }: { s: GameState; n: SkillTreeNode }) {
  if (n.id === SKILL_TREE_START) return <div className="tip">{n.desc}</div>;
  const allocated = s.skillPassives.includes(n.id);
  const reason = allocated ? refundSkillNodeReason(s, n.id) : skillNodeReason(s, n.id);
  return (
    <div className="tip" style={{ minWidth: 220 }}>
      <div className="tip-title" style={{ color: n.kind === 'keystone' ? 'var(--unique)' : n.kind === 'notable' ? 'var(--accent-2)' : 'var(--text)' }}>
        {n.name}
        <span className="dim" style={{ fontWeight: 400, marginLeft: 6, fontSize: 'var(--fs-xs)' }}>
          {n.kind} · {n.branch === 'core' ? 'Core' : SKILLS[n.branch].name}
        </span>
      </div>
      <div className="mod">{n.desc}</div>
      {n.req && (
        <div className="dim small">
          Requires {SKILLS[n.req.skill].name} level {n.req.level}
        </div>
      )}
      <div className={reason ? 'warn' : 'good'} style={{ marginTop: 6, fontSize: 'var(--fs-xs)' }}>
        {reason ?? (allocated ? 'Click to refund (1 Orb of Regret)' : 'Click to learn')}
      </div>
    </div>
  );
}

/** Branch names just past each keystone. */
const SKILL_LABELS = SKILL_TREE_NODES.filter((n) => n.kind === 'keystone' && n.branch !== 'core').map((n) => ({
  text: (SKILLS[n.branch as SkillId].name + (SKILLS[n.branch as SkillId].soon ? ' (soon)' : '')).toUpperCase(),
  x: Math.round(n.x * 1.16),
  y: Math.round(n.y * 1.16),
  color: BRANCH_COLOR[n.branch],
}));

function SkillingTree({ s }: { s: GameState }) {
  const allocated = new Set(s.skillPassives);
  const isOn = (id: string) => id === SKILL_TREE_START || allocated.has(id);
  const canTake = (id: string) => !isOn(id) && skillNodeReason(s, id) === null;
  return (
    <>
      <div className="row wrap">
        <span className={`chip ${skillPointsLeft(s) > 0 ? 'good' : ''}`} style={{ fontSize: 14 }}>
          {skillPointsLeft(s)} / {skillTreePoints(s)} points left
        </span>
        <span className="chip">{s.bank.regret ?? 0} Orbs of Regret</span>
        <span className="dim" style={{ fontSize: 12 }}>
          1 point per 5 total levels in Mining, Woodcutting, Foraging, Thieving, Archaeology, Smithing, Alchemy, Gemcutting and Rune-carving.
        </span>
      </div>
      <TreeCanvas
        nodes={SKILL_TREE_NODES}
        byId={SKILL_TREE_BY_ID}
        size={1100}
        version={`${s.skillPassives.join(',')}|${skillPointsLeft(s)}|${JSON.stringify(s.skills)}`}
        isOn={isOn}
        canTake={canTake}
        matches={null}
        labels={SKILL_LABELS}
        renderNode={(n, on, can) => <NodeShape kind={n.kind} color={BRANCH_COLOR[n.branch]} on={on} can={can} />}
        tip={(n) => <SkillNodeTip s={s} n={n} />}
        onClick={(n) => {
          if (n.id === SKILL_TREE_START) return;
          if (allocated.has(n.id)) game.act((st, ctx) => refundSkillNode(st, ctx, n.id));
          else game.act((st, ctx) => allocateSkillNode(st, ctx, n.id));
        }}
      />
    </>
  );
}

// ---------- ascendancy ----------

/** One ascendancy written out in full, for reading before you commit to it. */
function AscendancyCard({ a, action }: { a: AscendancyDef; action: ReactNode }) {
  const color = classDef(a.classId).color;
  return (
    <div className="card" style={{ flex: '1 1 300px' }}>
      <div className="card-title" style={{ color }}>
        {a.name}
      </div>
      <div className="dim" style={{ fontStyle: 'italic', marginBottom: 6 }}>
        “{a.quote}”
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 'var(--fs-sm)' }}>
        {a.plays}
      </p>
      <div className="small" style={{ color: 'var(--accent-2)' }}>
        The rule
      </div>
      <div className="mod">{a.gate.desc}</div>
      <div className="small" style={{ color: 'var(--accent-2)', marginTop: 8 }}>
        Notables
      </div>
      {a.notables.map((n) => (
        <div key={n.id} className="mod">
          <b>{n.name}:</b> {n.desc}
        </div>
      ))}
      <div className="dim small">{TRIAL_SEAL[2]}</div>
      <div className="small" style={{ color: 'var(--unique)', marginTop: 8 }}>
        Capstone
      </div>
      <div className="mod">
        <b>{a.capstone.name}:</b> {a.capstone.desc}
      </div>
      <div className="dim small">{TRIAL_SEAL[3]}</div>
      <div style={{ marginTop: 12 }}>{action}</div>
    </div>
  );
}

function AscendancyChoice({ s }: { s: GameState }) {
  const [picked, setPicked] = useState<AscendancyDef | null>(null);
  return (
    <>
      <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
        You have passed the first trial. Read both, then choose: the gate is free and works the moment you pick. You can switch later, for a Divine Orb and an Orb of Regret per node.
      </p>
      <div className="row wrap" style={{ alignItems: 'stretch' }}>
        {ascendanciesOf(s.character.classId).map((a) => (
          <AscendancyCard
            key={a.id}
            a={a}
            action={
              <button className="btn" disabled={!!chooseReason(s, a.id)} onClick={() => setPicked(a)}>
                Choose {a.name}
              </button>
            }
          />
        ))}
      </div>
      {picked && (
        <div className="modal-backdrop" onClick={() => setPicked(null)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-title">Choose {picked.name}?</div>
            <p className="muted" style={{ marginTop: 0, fontSize: 'var(--fs-sm)' }}>
              {picked.gate.desc}
            </p>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn sm ghost" onClick={() => setPicked(null)}>
                Not yet
              </button>
              <button className="btn sm" onClick={() => game.act((st, ctx) => chooseAscendancy(st, ctx, picked.id))}>
                Ascend
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AscNodeTip({ s, n }: { s: GameState; n: AscendancyNode }) {
  const allocated = s.ascendancy.nodes.includes(n.id);
  const reason = n.kind === 'gate' ? null : allocated ? refundAscReason(s, n.id) : ascNodeReason(s, n.id);
  return (
    <div className="tip" style={{ minWidth: 240, maxWidth: 320 }}>
      <div className="tip-title" style={{ color: n.kind === 'capstone' ? 'var(--unique)' : n.kind === 'small' ? 'var(--text)' : 'var(--accent-2)' }}>
        {n.name}
        <span className="dim" style={{ fontWeight: 400, marginLeft: 6, fontSize: 'var(--fs-xs)' }}>
          {n.kind}
        </span>
      </div>
      {(n.desc ? [n.desc] : describeStats(n.stats)).map((l) => (
        <div key={l} className="mod">
          {l}
        </div>
      ))}
      <div className={reason ? 'warn' : 'good'} style={{ marginTop: 6, fontSize: 'var(--fs-xs)' }}>
        {n.kind === 'gate' ? 'Free with your ascendancy' : (reason ?? (allocated ? 'Click to refund (1 Orb of Regret)' : 'Click to allocate'))}
      </div>
    </div>
  );
}

const ASC_SHAPE: Record<AscendancyNode['kind'], string> = { gate: 'start', small: 'small', notable: 'notable', capstone: 'keystone' };

const RELEASES: { id: NovaRelease; label: string; rule?: 'enemyCasting' | 'lifeBelow' }[] = [
  { id: 'full', label: 'When all 3 are stored' },
  { id: 'windup', label: 'On a boss wind-up, else at 3', rule: 'enemyCasting' },
  { id: 'lifeLow', label: 'When life is below half', rule: 'lifeBelow' },
  { id: 'manual', label: 'Only when I click' },
];

function AscendancySettings({ s, a }: { s: GameState; a: AscendancyDef }) {
  if (a.id === 'falconer') {
    const hawk = s.ascendancy.hawk;
    return (
      <div className="row wrap">
        <span className="muted">Your hawk goes for</span>
        <select className="input sm" value={hawk.priority} onChange={(e) => game.act((st) => void (st.ascendancy.hawk = { ...st.ascendancy.hawk, priority: e.target.value as TargetPriority }))}>
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select className="input sm" value={hawk.order} onChange={(e) => game.act((st) => void (st.ascendancy.hawk = { ...st.ascendancy.hawk, order: e.target.value as TargetOrder }))}>
          {ORDERS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (a.id === 'lightkeeper') {
    return (
      <div className="row wrap">
        <span className="muted">Release stored novas</span>
        <select className="input sm" value={s.ascendancy.release} onChange={(e) => game.act((st) => void (st.ascendancy.release = e.target.value as NovaRelease))}>
          {RELEASES.map((r) => (
            <option key={r.id} value={r.id} disabled={!!(r.rule && ruleLockReason(s, r.rule))}>
              {r.label}
              {r.rule && ruleLockReason(s, r.rule) ? ` (${ruleLockReason(s, r.rule)})` : ''}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return null;
}

function AscendancyTree({ s, a }: { s: GameState; a: AscendancyDef }) {
  const allocated = new Set(s.ascendancy.nodes);
  const color = classDef(a.classId).color;
  const isOn = (id: string) => id === a.gate.id || allocated.has(id);
  const canTake = (id: string) => !isOn(id) && ascNodeReason(s, id) === null;
  const other = ascendanciesOf(a.classId).find((x) => x.id !== a.id)!;
  const cost = switchCost(s);
  const names = useMemo(
    () => a.nodes.filter((n) => n.kind !== 'small').map((n) => ({ text: n.name, x: n.x, y: n.y + (n.kind === 'capstone' ? 56 : 44), color: n.kind === 'capstone' ? 'var(--unique)' : 'var(--accent-2)', size: 17 })),
    [a],
  );
  return (
    <>
      <div className="row wrap">
        <span className={`chip ${ascendancyPointsLeft(s) > 0 ? 'good' : ''}`} style={{ fontSize: 14 }}>
          {ascendancyPointsLeft(s)} / {s.ascendancy.points} ascendancy points left
        </span>
        <span className="chip">{s.bank.regret ?? 0} Orbs of Regret</span>
        <span className="chip">{s.bank.divine ?? 0} Divine Orbs</span>
        <span className="spacer" />
        <AscendancySettings s={s} a={a} />
      </div>
      <TreeCanvas
        nodes={a.nodes}
        byId={ASCENDANCY_NODE_BY_ID}
        size={900}
        maxZoom={1.6}
        version={`${a.id}|${s.ascendancy.nodes.join(',')}|${ascendancyPointsLeft(s)}|${s.ascendancy.trials}`}
        names={names}
        isOn={isOn}
        canTake={canTake}
        matches={null}
        renderNode={(n, on, can) => (
          <g opacity={s.ascendancy.trials < n.trial ? 0.45 : 1}>
            <NodeShape kind={ASC_SHAPE[n.kind]} color={color} on={on} can={can} />
          </g>
        )}
        tip={(n) => <AscNodeTip s={s} n={n} />}
        onClick={(n) => {
          if (n.kind === 'gate') return;
          if (allocated.has(n.id)) game.act((st, ctx) => refundAscNode(st, ctx, n.id));
          else game.act((st, ctx) => allocateAscNode(st, ctx, n.id));
        }}
      />
      <AscendancyCard
        a={other}
        action={
          <button className="btn sm" disabled={!!switchReason(s, other.id)} title={switchReason(s, other.id) ?? ''} onClick={() => game.act((st, ctx) => switchAscendancy(st, ctx, other.id as AscendancyId))}>
            Switch to {other.name} ({SWITCH_MATERIAL_COST} Divine Orb{cost.regret ? ` + ${cost.regret} Orb${cost.regret === 1 ? '' : 's'} of Regret` : ''})
          </button>
        }
      />
    </>
  );
}

function AscendancyPane({ s }: { s: GameState }) {
  const a = currentAscendancy(s);
  return a ? <AscendancyTree s={s} a={a} /> : <AscendancyChoice s={s} />;
}

const TREE_HEADERS = {
  character: 'Character tree: combat power. Points from character levels.',
  skilling: 'Skilling tree: gathering and production. Points from total skill levels.',
  ascendancy: 'Ascendancy: its own points, from trials and bosses from Act 3 on.',
};

export function TreePage() {
  const s = useGame();
  const [picked, setTab] = useState<keyof typeof TREE_HEADERS>('character');
  const ascends = canAscend(s);
  const tab = picked === 'ascendancy' && !ascends ? 'character' : picked;
  const ascBadge = !s.ascendancy.id ? 1 : ascendancyPointsLeft(s);
  return (
    <div className="page wide">
      <PageHeader title="Passive Trees">{TREE_HEADERS[tab]}</PageHeader>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'character', label: 'Character', count: pointsLeft(s) > 0 ? pointsLeft(s) : undefined, hot: true },
          { id: 'skilling', label: 'Skilling', count: skillPointsLeft(s) > 0 ? skillPointsLeft(s) : undefined, hot: true },
          ...(ascends ? [{ id: 'ascendancy' as const, label: 'Ascendancy', count: ascBadge > 0 ? ascBadge : undefined, hot: true }] : []),
        ]}
      />
      {tab === 'character' ? <CharacterTree s={s} /> : tab === 'skilling' ? <SkillingTree s={s} /> : <AscendancyPane s={s} />}
    </div>
  );
}

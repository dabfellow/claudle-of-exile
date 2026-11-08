import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ASCENDANCY_NODE_BY_ID,
  ascendanciesOf,
  SWITCH_MATERIAL_COST,
  ASCENDANCY_MAX_POINTS,
  TRIALS,
  type AscendancyDef,
  type AscendancyId,
  type AscendancyNode,
} from '../../data/ascendancies';
import { classDef } from '../../data/classes';
import { CLASS_SECTORS, PASSIVE_BY_ID, PASSIVE_NODES, REGION_NAMES, type PassiveNode, type TreeRegion } from '../../data/passiveTree';
import { SKILL_TREE_BY_ID, SKILL_TREE_NODES, SKILL_TREE_START, type SkillTreeNode } from '../../data/skillTree';
import { SKILLS } from '../../data/skills';
import { describeStats } from '../../data/statText';
import { ZONES } from '../../data/zones';
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
import { isClassic } from '../../engine/challenge';
import { applyGearSet, applySkillSet } from '../../engine/loadouts';
import {
  allocate,
  allocateReason,
  changeMastery,
  isCosmicGateway,
  isDoomed,
  pairedGateway,
  passiveNodeCost,
  pointsLeft,
  refund,
  refundReason,
  settlePassivePoints,
  startNode,
} from '../../engine/passives';
import { allocateSkillNode, refundSkillNode, refundSkillNodeReason, skillNodeReason, skillPointsLeft, skillTreePoints } from '../../engine/skillTree';
import { deriveStats, passiveStats, type Derived } from '../../engine/stats';
import type { GameState, NovaRelease, PassiveProfile, SkillId, TargetOrder, TargetPriority } from '../../engine/types';
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
  gemcutting: '#4fc1a6',
  smithing: '#b8b8c8',
  alchemy: '#9b6dde',
  runecarving: '#6fa8ff',
  cooking: '#e08a4a',
  cartography: '#8a7ad8',
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; unit: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;
  const clamp = (k: number) => Math.min(maxZoom, Math.max(0.4, k));

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

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

  const zoomAtRef = useRef(zoomAt);
  zoomAtRef.current = zoomAt;

  // Native wheel listener on the canvas wrapper
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAtRef.current(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const layer = useMemo(() => {
    const links: [N, N][] = [];
    for (const n of nodes) for (const l of n.links) if (n.id < l && byId[l]) links.push([n, byId[l]]);
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
          const isMatched = matches?.has(n.id);
          const dim = matches !== null && !isMatched;
          return (
            <g
              key={n.id}
              data-tut={tutId?.(n.id)}
              className={`tree-node ${on ? 'on' : ''} ${can ? 'can' : ''} ${isMatched ? 'match' : ''}`}
              transform={`translate(${n.x} ${n.y})`}
              style={{
                opacity: dim ? 0.18 : 1,
                filter: dim ? 'grayscale(80%) brightness(0.6)' : undefined,
              }}
              onMouseMove={(e) => {
                if (drag.current?.moved) return;
                setHover({ id: n.id, x: e.clientX, y: e.clientY });
              }}
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
  }, [version, nodes, byId, matches]);

  // Names show up once zoomed in to at least 1.8x, and dynamically scale to stay clear and readable
  const showNames = view.k >= 1.8;
  const unit = wrap.current ? size / Math.min(wrap.current.clientWidth || 800, wrap.current.clientHeight || 760) : size / 760;
  const nameLayer = useMemo(
    () =>
      showNames &&
      names?.map((l) => {
        // Target an on-screen readable size (13-16px) across any zoom factor
        const targetScreenPx = l.size ?? 14;
        const fontSvgSize = Math.max(12, Math.round((targetScreenPx * unit) / view.k));
        const strokeSvgWidth = Math.max(2, Math.round((3 * unit) / view.k));
        const offsetY = Math.round((28 * unit) / view.k);
        return (
          <text
            key={`${l.text}@${l.x},${l.y}`}
            className="tree-name"
            x={l.x}
            y={l.y + offsetY}
            textAnchor="middle"
            fill={l.color}
            fontSize={fontSvgSize}
            strokeWidth={strokeSvgWidth}
          >
            {l.text}
          </text>
        );
      }),
    [showNames, names, view.k, unit],
  );

  const hovered = hover && byId[hover.id];
  return (
    <div
      className={`tree-wrap ${isFullscreen ? 'is-fullscreen' : ''}`}
      ref={wrap}
      onPointerDown={(e) => {
        // If clicking on control buttons, don't drag the tree
        if ((e.target as HTMLElement).closest('.tree-controls')) return;
        try {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
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
      onPointerUp={(e) => {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        setTimeout(() => (drag.current = null), 0);
      }}
      onPointerCancel={(e) => {
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        drag.current = null;
        setHover(null);
      }}
      onPointerLeave={() => {
        if (!drag.current) setHover(null);
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
        <button className="btn sm" onClick={() => zoomAt(1.25)} title="Zoom in">
          +
        </button>
        <button className="btn sm" onClick={() => zoomAt(1 / 1.25)} title="Zoom out">
          −
        </button>
        {focus && (
          <button className="btn sm" onClick={() => setView(home)} title="Center on your starting location">
            Home
          </button>
        )}
        <button className="btn sm" onClick={() => setView({ x: 0, y: 0, k: 1 })} title="View whole tree">
          {focus ? 'Whole tree' : 'Reset'}
        </button>
        <button
          className={`btn sm ${isFullscreen ? 'primary' : 'ghost'}`}
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Expand to Fullscreen'}
        >
          {isFullscreen ? '⤓ Exit Fullscreen' : '⤢ Fullscreen'}
        </button>
      </div>
      <div className="tree-legend">Drag to pan · scroll to zoom · click to allocate {isFullscreen && '· Esc to exit fullscreen'}</div>
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

function starPoints(numPoints: number, innerR: number, outerR: number): string {
  const points: string[] = [];
  const step = Math.PI / numPoints;
  for (let i = 0; i < 2 * numPoints; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = i * step - Math.PI / 2;
    points.push(`${Math.round(r * Math.cos(a))},${Math.round(r * Math.sin(a))}`);
  }
  return points.join(' ');
}

function GatewayShape({ on, can }: { on: boolean; can: boolean }) {
  return (
    <g className={`gateway-node ${on ? 'on' : ''} ${can ? 'can' : ''}`}>
      <circle className="gateway-pulse-outer" r={32} />
      <circle className="gateway-pulse-inner" r={24} />
      <circle className="gateway-bg body" r={20} />
      <circle className="gateway-ring" r={20} />
      <circle className="gateway-inner-ring" r={14} />
      <circle className="gateway-core" r={8} />
      <circle className="gateway-dot" r={3} />
    </g>
  );
}

function DoomedShape({ on, can }: { on: boolean; can: boolean }) {
  return (
    <g className={`doomed-node ${on ? 'on' : ''} ${can ? 'can' : ''}`}>
      <polygon className="doomed-aura" points="0,-32 32,0 0,32 -32,0" />
      <polygon className="doomed-diamond body" points="0,-24 24,0 0,24 -24,0" />
      <polygon className="doomed-inner-diamond" points="0,-16 16,0 0,16 -16,0" />
      <path
        className="doomed-skull"
        d="M -6,-7 C -6,-12 6,-12 6,-7 C 6,-4 5,-2 4,-1 L 4,3 L -4,3 L -4,-1 C -5,-2 -6,-4 -6,-7 Z M -4,-7 A 1.5 1.5 0 1 0 -1,-7 A 1.5 1.5 0 1 0 -4,-7 M 1,-7 A 1.5 1.5 0 1 0 4,-7 A 1.5 1.5 0 1 0 1,-7"
      />
      <g className="doomed-warning-badge" transform="translate(0, -36)">
        <rect x={-52} y={-10} width={104} height={18} rx={4} />
        <text x={0} y={2.5} textAnchor="middle">
          ⚠ PERMANENT DEBUFF
        </text>
      </g>
    </g>
  );
}

function CelestialStarShape({ on, can }: { on: boolean; can: boolean }) {
  return (
    <g className={`celestial-star-node ${on ? 'on' : ''} ${can ? 'can' : ''}`}>
      <circle className="celestial-halo" r={42} />
      <circle className="celestial-inner-halo" r={32} />
      <polygon className="celestial-star-outer body" points={starPoints(8, 18, 38)} />
      <polygon className="celestial-star-inner" points={starPoints(8, 10, 24)} />
      <circle className="celestial-core" r={8} />
      <circle className="celestial-spark" r={3} />
    </g>
  );
}

function MasterySocketShape({ on, can }: { on: boolean; can: boolean }) {
  return (
    <g className={`mastery-socket-node ${on ? 'on' : ''} ${can ? 'can' : ''}`}>
      <circle className="mastery-halo" r={22} />
      <polygon className="mastery-hex-outer body" points={hexPoints(17)} />
      <polygon className="mastery-hex-inner" points={hexPoints(11)} />
      <polygon className="mastery-gem" points={hexPoints(6)} />
    </g>
  );
}

function NodeShape(props: { kind: string; color: string; on: boolean; can: boolean; mine?: boolean }) {
  return <BaseShape {...props} />;
}

function PassiveNodeShape({ node, color, on, can, mine }: { node: PassiveNode; color: string; on: boolean; can: boolean; mine?: boolean }) {
  if (isCosmicGateway(node)) {
    return <GatewayShape on={on} can={can} />;
  }
  if (isDoomed(node)) {
    return <DoomedShape on={on} can={can} />;
  }
  if (node.kind === 'keystone' && node.region === 'forbidden') {
    return <CelestialStarShape on={on} can={can} />;
  }
  if (node.kind === 'mastery') {
    return <MasterySocketShape on={on} can={can} />;
  }
  return <BaseShape kind={node.kind} color={color} on={on} can={can} mine={mine} />;
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
      return <circle className="body" r={24} style={{ ...style, fill: mine ? `color-mix(in srgb, ${color} 40%, #1c1f28)` : on ? fill : '#15171c', opacity: mine || on || can ? 1 : 0.35 }} />;
    case 'travel':
      return <circle className="body" r={8} style={style} />;
    default:
      return <circle className="body" r={11} style={style} />;
  }
}

// ---------- character tree ----------

const DOOMED_DEBUFFS: Record<string, string> = {
  doomed_blood_toll: '-25% Maximum Life',
  doomed_brittle_bones: 'Take 20% increased Physical Damage',
  doomed_glass_veil: 'Armour is set to 0',
  doomed_withered_veins: 'Flasks recover 0 Life or Mana',
  doomed_shattered_mind: 'Skills cost 100% more Mana',
  doomed_broken_covenant: '-30% All Elemental Resistances',
};

function doomedDebuffText(n: PassiveNode): string {
  if ((n as { debuff?: string }).debuff) return (n as { debuff?: string }).debuff!;
  if (DOOMED_DEBUFFS[n.id]) return DOOMED_DEBUFFS[n.id];
  for (const [key, val] of Object.entries(n.stats)) {
    if (key.startsWith('doomed')) {
      const name = key.replace('doomed', '').replace(/([A-Z])/g, ' $1').trim();
      return `Permanent penalty: ${name} (${val})`;
    }
  }
  return 'Permanent penalty to build defense/offense';
}

function CharacterNodeTip({ s, n }: { s: GameState; n: PassiveNode }) {
  const allocated = s.passives.includes(n.id);
  // an Exile can walk through other classes' starts, so those get the normal node tip
  if (n.kind === 'start' && (n.id === startNode(s) || s.character.classId !== 'exile')) {
    return <div className="tip">{n.id === startNode(s) ? `${n.name} start — your starting point` : `${n.name} start (another class)`}</div>;
  }
  const reason = allocated ? refundReason(s, n.id) : allocateReason(s, n.id);
  const before = deriveStats(s, []);
  const next = allocated ? s.passives.filter((x) => x !== n.id) : [...s.passives, n.id];
  const after = n.kind === 'mastery' ? before : deriveStats({ ...s, passives: next }, []);
  const chosen = n.kind === 'mastery' ? s.masteries[n.id] : undefined;

  // 1. Cosmic Gateway
  if (isCosmicGateway(n)) {
    const pairId = pairedGateway(n.id) ?? (n as { pairId?: string }).pairId;
    const pairNode = pairId ? PASSIVE_BY_ID[pairId] : undefined;
    const destName = pairNode?.name ?? (pairId ? pairId.replace('gateway_', 'Gateway ').toUpperCase() : 'Paired Gateway');
    return (
      <div className="tip gateway-tip" style={{ minWidth: 260, maxWidth: 340 }}>
        <div className="tip-title" style={{ color: '#00f0ff' }}>
          🌌 {n.name}
          <span className="dim" style={{ fontWeight: 400, marginLeft: 6, fontSize: 'var(--fs-xs)' }}>
            Cosmic Gateway
          </span>
        </div>
        <div className="gateway-conduit-box">
          <div className="gateway-dest-label">Destination:</div>
          <div className="gateway-dest-name">⇄ {destName}</div>
        </div>
        <div className="mod">
          Bypasses physical tree distance. Both sides connect when activated.
        </div>
        <div className={allocated ? 'good' : 'conduit-prompt'} style={{ marginTop: 8, fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
          {allocated ? `Conduit Active · Linked to ${destName}` : (reason ?? 'Activate Conduit (3 Travel Pts)')}
        </div>
      </div>
    );
  }

  // 2. Doomed Gate
  if (isDoomed(n)) {
    const debuff = doomedDebuffText(n);
    return (
      <div className="tip doomed-tip" style={{ minWidth: 260, maxWidth: 340 }}>
        <div className="tip-title" style={{ color: '#ff3b56' }}>
          ☠ {n.name}
          <span className="dim" style={{ fontWeight: 400, marginLeft: 6, fontSize: 'var(--fs-xs)' }}>
            Doomed Gate
          </span>
        </div>
        <div className="doomed-warning-box">
          <div className="doomed-warning-title">⚠ PERMANENT DEBUFF</div>
          <div className="doomed-warning-text">{debuff}</div>
        </div>
        {n.desc && <div className="mod">{n.desc}</div>}
        <StatDeltas before={before} after={after} />
        <div className={reason ? 'warn' : allocated ? 'warn' : 'good'} style={{ marginTop: 6, fontSize: 'var(--fs-xs)' }}>
          {reason ?? (allocated ? 'Click to refund (1 Orb of Regret)' : 'Click to breach Doomed Gate')}
        </div>
      </div>
    );
  }

  // 3. Celestial Forbidden Keystone
  if (n.kind === 'keystone' && n.region === 'forbidden') {
    return (
      <div className="tip celestial-tip" style={{ minWidth: 260, maxWidth: 340 }}>
        <div className="tip-title" style={{ color: '#ff66b2' }}>
          ✧ {n.name}
          <span className="dim" style={{ fontWeight: 400, marginLeft: 6, fontSize: 'var(--fs-xs)' }}>
            Celestial Forbidden Keystone
          </span>
        </div>
        {n.desc && <div className="mod celestial-desc">{n.desc}</div>}
        <StatDeltas before={before} after={after} />
        <div className={reason ? 'warn' : 'good'} style={{ marginTop: 6, fontSize: 'var(--fs-xs)' }}>
          {reason ?? (allocated ? 'Click to refund (1 Orb of Regret)' : 'Click to allocate (15 Passive Points)')}
        </div>
      </div>
    );
  }

  // 4. Mastery
  if (n.kind === 'mastery') {
    return (
      <div className="tip mastery-tip" style={{ minWidth: 260, maxWidth: 340 }}>
        <div className="tip-title" style={{ color: '#c084fc' }}>
          ⬡ {n.name}
          <span className="dim" style={{ fontWeight: 400, marginLeft: 6, fontSize: 'var(--fs-xs)' }}>
            Mastery Socket
          </span>
        </div>
        <div className="mastery-tip">
          {n.options!.map((o, i) => (
            <div key={i} className={`mod ${chosen === i ? 'chosen' : ''}`}>
              {chosen === i ? '◆ ' : '◇ '}
              {o.label}
            </div>
          ))}
          <div className="dim" style={{ fontSize: 'var(--fs-xs)', marginTop: 4 }}>
            {allocated ? 'Click to change your pick (1 Orb of Regret) or refund.' : 'Click to choose one bonus (1 Mastery Point).'}
          </div>
        </div>
        <div className={reason ? 'warn' : 'good'} style={{ marginTop: 6, fontSize: 'var(--fs-xs)' }}>
          {n.kind === 'mastery' && !allocated && !reason
            ? 'Click to pick a bonus'
            : (reason ?? (allocated ? 'Click to refund (1 Orb of Regret)' : 'Click to allocate'))}
        </div>
      </div>
    );
  }

  return (
    <div className="tip" style={{ minWidth: 240, maxWidth: 320 }}>
      <div className="tip-title" style={{ color: n.kind === 'keystone' ? 'var(--unique)' : n.kind === 'notable' ? 'var(--accent-2)' : 'var(--text)' }}>
        {n.name}
        <span className="dim" style={{ fontWeight: 400, marginLeft: 6, fontSize: 'var(--fs-xs)' }}>
          {n.kind} · {REGION_NAMES[n.region]}
        </span>
      </div>
      {(n.desc ? [n.desc] : describeStats(n.stats)).map((l) => (
        <div key={l} className="mod">
          {l}
        </div>
      ))}
      <StatDeltas before={before} after={after} />
      <div className={reason ? 'warn' : 'good'} style={{ marginTop: 6, fontSize: 'var(--fs-xs)' }}>
        {reason ?? (allocated ? 'Click to refund (1 Orb of Regret)' : 'Click to allocate')}
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
  const regret = s.account.bank.regret ?? 0;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal mastery-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="card-title">
          <span style={{ color: '#c084fc', marginRight: 6 }}>⬡</span>
          {n.name}
          <span className="grow" />
          <button className="btn sm ghost" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="muted" style={{ marginTop: 0, fontSize: 'var(--fs-sm)' }}>
          {allocated ? `Changing your pick costs 1 Orb of Regret (you have ${regret}).` : 'Pick one mastery bonus for 1 Mastery Point. You can change it later for an Orb of Regret.'}
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
              <span>{o.label}</span>
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

function ProfileSettingsModal({
  s,
  profile,
  onSave,
  onClose,
}: {
  s: GameState;
  profile: PassiveProfile;
  onSave: (updated: PassiveProfile) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [crossLinkGear, setCrossLinkGear] = useState(profile.crossLinkGear ?? false);
  const [linkedGearId, setLinkedGearId] = useState<number | null>(profile.linkedGearId ?? null);
  const [crossLinkSkills, setCrossLinkSkills] = useState(profile.crossLinkSkills ?? false);
  const [linkedSkillId, setLinkedSkillId] = useState<number | null>(profile.linkedSkillId ?? null);
  const [crossLinkAtlas, setCrossLinkAtlas] = useState(profile.crossLinkAtlas ?? false);
  const [linkedAtlas, setLinkedAtlas] = useState<string | null>(profile.linkedAtlas ?? 'Atlas Bossing');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal profile-settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="card-title">
          Profile Settings: {profile.name}
          <span className="grow" />
          <button className="btn sm ghost" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="grid" style={{ gap: 14, marginTop: 10 }}>
          <div>
            <label className="small muted" style={{ display: 'block', marginBottom: 4 }}>
              Profile Name
            </label>
            <input
              className="input wide"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Profile 1, Bossing Crit, Map Clear"
            />
          </div>

          <div className="profile-crosslink-section">
            <div className="small" style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>
              Cross-linked Loadouts
            </div>

            <div className="crosslink-row" style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
              <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={crossLinkGear}
                  onChange={(e) => setCrossLinkGear(e.target.checked)}
                />
                <span>Link Gear Set</span>
              </label>
              {crossLinkGear && (
                <select
                  className="input sm"
                  value={linkedGearId ?? ''}
                  onChange={(e) => setLinkedGearId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">(Select Gear Set)</option>
                  {s.loadouts.gear.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                  {s.loadouts.gear.length === 0 && <option value="" disabled>No gear sets saved yet</option>}
                </select>
              )}
            </div>

            <div className="crosslink-row" style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
              <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={crossLinkSkills}
                  onChange={(e) => setCrossLinkSkills(e.target.checked)}
                />
                <span>Link Skill Bar</span>
              </label>
              {crossLinkSkills && (
                <select
                  className="input sm"
                  value={linkedSkillId ?? ''}
                  onChange={(e) => setLinkedSkillId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">(Select Skill Loadout)</option>
                  {s.loadouts.skills.map((sk) => (
                    <option key={sk.id} value={sk.id}>
                      {sk.name}
                    </option>
                  ))}
                  {s.loadouts.skills.length === 0 && <option value="" disabled>No skill loadouts saved yet</option>}
                </select>
              )}
            </div>

            <div className="crosslink-row" style={{ display: 'grid', gap: 6 }}>
              <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={crossLinkAtlas}
                  onChange={(e) => setCrossLinkAtlas(e.target.checked)}
                />
                <span>Link Atlas Strategy</span>
              </label>
              {crossLinkAtlas && (
                <select
                  className="input sm"
                  value={linkedAtlas ?? ''}
                  onChange={(e) => setLinkedAtlas(e.target.value || null)}
                >
                  <option value="Atlas Bossing">Atlas Bossing</option>
                  <option value="Atlas Mapping">Atlas Mapping</option>
                  <option value="Atlas Sustain">Atlas Sustain</option>
                  <option value="Atlas Peril">Atlas Peril (Doomed)</option>
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 20, justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn sm ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn sm"
            onClick={() => {
              onSave({
                ...profile,
                name: name.trim() || profile.name,
                crossLinkGear,
                linkedGearId: crossLinkGear ? linkedGearId : null,
                crossLinkSkills,
                linkedSkillId: crossLinkSkills ? linkedSkillId : null,
                crossLinkAtlas,
                linkedAtlas: crossLinkAtlas ? linkedAtlas : null,
              });
              onClose();
            }}
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function searchMatches(query: string, nodes: { id: string; name: string; text: string[]; kind?: string; region?: string }[]): Set<string> | null {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return null;
  return new Set(
    nodes
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          (n.kind && n.kind.toLowerCase().includes(q)) ||
          (n.region && n.region.toLowerCase().includes(q)) ||
          n.text.some((t) => t.toLowerCase().includes(q))
      )
      .map((n) => n.id)
  );
}

const CHAR_TREE_SIZE = 12000;
const CHAR_TREE_ZOOM = 24;

const CHAR_LABELS: CanvasLabel[] = [
  ...CLASS_SECTORS.map((c) => {
    const a = (c.angle * Math.PI) / 180;
    return { text: c.name.toUpperCase(), x: Math.round(2120 * Math.cos(a)), y: Math.round(2120 * Math.sin(a)), color: REGION_COLOR[c.key], size: 160 };
  }),
  // just above the Exile's centre start, inside the ring
  { text: 'CROSSING', x: 0, y: -110, color: REGION_COLOR.center, size: 80 },
];

/** names under notables, keystones and class starts once zoomed in */
const CHAR_NAMES: CanvasLabel[] = PASSIVE_NODES.filter((n) => n.kind === 'notable' || n.kind === 'keystone' || n.kind === 'start').map((n) => ({
  text: n.name,
  x: n.x,
  y: n.y + (n.kind === 'keystone' ? 50 : n.kind === 'start' ? 44 : 36),
  color: n.kind === 'keystone' ? 'var(--unique)' : n.kind === 'start' ? REGION_COLOR[n.region] : 'var(--accent-2)',
  size: n.kind === 'keystone' ? 16 : n.kind === 'start' ? 15 : 14,
}));

function isProfileUnlocked(id: number, s: GameState): boolean {
  if (id === 1) return true;
  if (id === 2) return ZONES.some((z) => z.act >= 5 && s.unlockedZones.includes(z.id));
  if (id === 3) {
    return Boolean(
      (s.account.atlas?.cleared && s.account.atlas.cleared.some((t) => t >= 5)) ||
      (s.maps?.run && s.maps.run.tier >= 5) ||
      (s.account.maps && Object.keys(s.account.maps).some((k) => parseInt(k.replace(/\D/g, ''), 10) >= 5)) ||
      (s.maps?.stock && Object.keys(s.maps.stock).some((k) => parseInt(k.replace(/\D/g, ''), 10) >= 5))
    );
  }
  return false;
}

function CharacterTree({ s }: { s: GameState }) {
  const [query, setQuery] = useState('');
  const [picker, setPicker] = useState<PassiveNode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refundMode, setRefundMode] = useState(false);

  const initialProfiles = useMemo((): PassiveProfile[] => {
    if (s.settings?.passiveProfiles && s.settings.passiveProfiles.length === 3) {
      return s.settings.passiveProfiles;
    }
    return [
      {
        id: 1,
        name: 'Profile 1',
        passives: [...s.passives],
        masteries: { ...s.masteries },
        linkedGearId: s.loadouts.gear[0]?.id ?? null,
        linkedSkillId: s.loadouts.skills[0]?.id ?? null,
        linkedAtlas: 'Atlas Bossing',
        crossLinkGear: true,
        crossLinkSkills: false,
        crossLinkAtlas: true,
      },
      {
        id: 2,
        name: 'Profile 2',
        passives: [],
        masteries: {},
        linkedGearId: s.loadouts.gear[1]?.id ?? null,
        linkedSkillId: s.loadouts.skills[1]?.id ?? null,
        linkedAtlas: 'Atlas Mapping',
        crossLinkGear: false,
        crossLinkSkills: false,
        crossLinkAtlas: false,
      },
      {
        id: 3,
        name: 'Profile 3',
        passives: [],
        masteries: {},
        linkedGearId: null,
        linkedSkillId: null,
        linkedAtlas: null,
        crossLinkGear: false,
        crossLinkSkills: false,
        crossLinkAtlas: false,
      },
    ];
  }, [s.settings?.passiveProfiles, s.passives, s.masteries, s.loadouts.gear, s.loadouts.skills]);

  const [profiles, setProfiles] = useState<PassiveProfile[]>(initialProfiles);
  const activeProfileId = s.settings?.activePassiveProfileId ?? 1;
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  const switchProfile = (targetId: number) => {
    if (targetId === activeProfileId) return;
    if (!isProfileUnlocked(targetId, s)) {
      const lockMsg = targetId === 2 ? 'Profile 2 unlocks in Act 5!' : 'Profile 3 unlocks at Tier 5 Maps!';
      game.act((_, ctx) => ctx.emit({ t: 'info', text: lockMsg }));
      return;
    }
    game.act((st, ctx) => {
      st.settings ??= {} as GameState['settings'];
      st.settings.passiveProfiles ??= profiles;
      // 1. Save current passives into current profile
      const updatedProfiles = (st.settings.passiveProfiles ?? profiles).map((p) =>
        p.id === activeProfileId ? { ...p, passives: [...st.passives], masteries: { ...st.masteries } } : p
      );
      const target = updatedProfiles.find((p) => p.id === targetId);
      if (!target) return;
      // 2. Load target profile passives (or copy current if target was never set)
      if (target.passives.length > 0) {
        st.passives = [...target.passives];
        st.masteries = { ...target.masteries };
      } else {
        target.passives = [...st.passives];
        target.masteries = { ...st.masteries };
      }
      settlePassivePoints(st);
      st.settings.activePassiveProfileId = targetId;
      st.settings.passiveProfiles = updatedProfiles;

      // 3. Cross-linking
      if (target.crossLinkGear && target.linkedGearId != null) {
        applyGearSet(st, ctx, target.linkedGearId);
      }
      if (target.crossLinkSkills && target.linkedSkillId != null) {
        applySkillSet(st, target.linkedSkillId);
      }

      setProfiles(updatedProfiles);
      ctx.emit({ t: 'info', text: `Switched to ${target.name}`, tone: 'good' });
    });
  };

  const handleSaveProfile = (updated: PassiveProfile) => {
    game.act((st) => {
      st.settings ??= {} as GameState['settings'];
      const list = (st.settings.passiveProfiles ?? profiles).map((p) => (p.id === updated.id ? updated : p));
      st.settings.passiveProfiles = list;
      setProfiles(list);
    });
  };

  const linkedBadges = useMemo(() => {
    const parts: string[] = [];
    if (activeProfile.crossLinkGear && activeProfile.linkedGearId != null) {
      const gearName = s.loadouts.gear.find((g) => g.id === activeProfile.linkedGearId)?.name ?? 'Gear 1';
      parts.push(gearName);
    }
    if (activeProfile.crossLinkSkills && activeProfile.linkedSkillId != null) {
      const skillName = s.loadouts.skills.find((sk) => sk.id === activeProfile.linkedSkillId)?.name ?? 'Skills 1';
      parts.push(skillName);
    }
    if (activeProfile.crossLinkAtlas && activeProfile.linkedAtlas) {
      parts.push(activeProfile.linkedAtlas);
    }
    return parts;
  }, [activeProfile, s.loadouts.gear, s.loadouts.skills]);

  // Point calculations
  settlePassivePoints(s);
  const spent = useMemo(() => {
    const sp = { travel: 0, passive: 0, mastery: 0 };
    for (const id of s.passives) {
      const node = PASSIVE_BY_ID[id];
      if (!node) continue;
      const price = passiveNodeCost(node);
      if (price.pool === 'travelPoints') sp.travel += price.cost;
      else if (price.pool === 'masteryPoints') sp.mastery += price.cost;
      else sp.passive += price.cost;
    }
    return sp;
  }, [s.passives]);

  const totalTravel = s.travelPoints + spent.travel;
  const totalPassive = s.passivePoints + spent.passive;
  const totalMastery = s.masteryPoints + spent.mastery;

  const myStart = startNode(s);
  const allocated = new Set(s.passives);
  const isOn = (id: string) => id === myStart || allocated.has(id);
  const canTake = (id: string) => !isOn(id) && allocateReason(s, id) === null;

  const searchable = useMemo(
    () =>
      PASSIVE_NODES.map((n) => {
        const texts: string[] = [];
        if (n.options) texts.push(...n.options.map((o) => o.label));
        if (n.desc) texts.push(n.desc);
        texts.push(...describeStats(n.stats));
        if (isDoomed(n)) texts.push(doomedDebuffText(n), 'doomed', 'debuff');
        if (isCosmicGateway(n)) texts.push('cosmic gateway', 'portal', 'conduit');
        if (n.region === 'forbidden') texts.push('forbidden', 'celestial');
        return { id: n.id, name: n.name, kind: n.kind, region: REGION_NAMES[n.region], text: texts };
      }),
    [],
  );
  const matches = searchMatches(query, searchable);
  const totals = describeStats(Object.fromEntries(Object.entries(passiveStats(s.passives, s.masteries)).filter(([, v]) => v)));

  const click = (n: PassiveNode) => {
    if (n.kind === 'start' && (n.id === myStart || s.character.classId !== 'exile')) return;
    if (refundMode) {
      if (allocated.has(n.id)) {
        game.act((st, ctx) => refund(st, ctx, n.id));
      } else {
        game.act((_, ctx) => ctx.emit({ t: 'info', text: `${n.name} is not allocated` }));
      }
      return;
    }
    if (n.kind === 'mastery' && (allocated.has(n.id) || canTake(n.id))) return setPicker(n);
    if (allocated.has(n.id)) game.act((st, ctx) => refund(st, ctx, n.id));
    else game.act((st, ctx) => allocate(st, ctx, n.id));
  };

  return (
    <>
      <div className="tree-top-bar">
        {/* Row 1: Profile Manager & Active Linked Loadout Badges */}
        <div className="tree-profile-row">
          <div className="tree-profile-tabs">
            {[1, 2, 3].map((num) => {
              const prof = profiles.find((p) => p.id === num) ?? { id: num, name: `Profile ${num}` };
              const unlocked = isProfileUnlocked(num, s);
              const isActive = num === activeProfileId;
              return (
                <button
                  key={num}
                  className={`tree-profile-tab ${isActive ? 'active' : ''} ${!unlocked ? 'locked' : ''}`}
                  onClick={() => switchProfile(num)}
                  title={!unlocked ? (num === 2 ? 'Unlocks at Act 5' : 'Unlocks at Tier 5 Maps') : `Switch to ${prof.name}`}
                >
                  {prof.name}
                  {!unlocked && <span className="tree-lock-icon">🔒</span>}
                </button>
              );
            })}
          </div>

          <button
            className="btn sm ghost tree-settings-btn"
            onClick={() => setSettingsOpen(true)}
            title="Profile settings and cross-linking"
          >
            ⚙ Settings
          </button>

          <span className="spacer" />

          {linkedBadges.length > 0 ? (
            <span
              className="chip linked-badge"
              onClick={() => setSettingsOpen(true)}
              title="Click to edit profile loadout links"
              style={{ cursor: 'pointer' }}
            >
              Linked: {linkedBadges.join(', ')}
            </span>
          ) : (
            <span
              className="chip dim linked-badge-empty"
              onClick={() => setSettingsOpen(true)}
              title="Click to configure loadout linking"
              style={{ cursor: 'pointer' }}
            >
              + Link Loadouts
            </span>
          )}
        </div>

        {/* Row 2: Point Trackers & Search & Controls */}
        <div className="tree-currency-row">
          <span className="chip chip-point-cyan" title="Used for travel attribute roads and Cosmic Gateways">
            Travel Points: {s.travelPoints} / {totalTravel}
          </span>
          <span className="chip chip-point-gold" title="Used for small passives, notables, keystones, and doomed gates">
            Passive Points: {s.passivePoints} / {totalPassive}
          </span>
          <span className="chip chip-point-purple" title="Used for cluster mastery sockets">
            Mastery Points: {s.masteryPoints} / {totalMastery}
          </span>

          <span className="chip chip-regret">{s.account.bank.regret ?? 0} Orbs of Regret</span>

          <button
            className={`btn sm ${refundMode ? 'danger active btn-refund-toggle' : 'ghost btn-refund-toggle'}`}
            onClick={() => setRefundMode(!refundMode)}
            title={refundMode ? 'Click to exit refund mode' : 'Click to enter refund mode: click allocated nodes to refund them'}
          >
            {refundMode ? '✓ Refund Mode Active' : 'Refund'}
          </button>

          <span className="spacer" />

          <div className="row" style={{ gap: 4 }}>
            <input
              className="input tree-search"
              placeholder="Search nodes (e.g. armour, poison, gateway)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="btn sm ghost" onClick={() => setQuery('')}>
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <TreeCanvas
        nodes={PASSIVE_NODES}
        byId={PASSIVE_BY_ID}
        size={CHAR_TREE_SIZE}
        maxZoom={CHAR_TREE_ZOOM}
        version={`${myStart}|${s.passives.join(',')}|${s.travelPoints}|${s.passivePoints}|${s.masteryPoints}|${query}`}
        focus={{ x: -PASSIVE_BY_ID[myStart].x, y: -PASSIVE_BY_ID[myStart].y, k: 3 }}
        names={CHAR_NAMES}
        isOn={isOn}
        canTake={canTake}
        matches={matches}
        labels={CHAR_LABELS}
        renderNode={(n, on, can) => <PassiveNodeShape node={n} color={REGION_COLOR[n.region]} on={on} can={can} mine={n.id === myStart} />}
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
            <polygon points={hexPoints(11)} fill="#1c1f28" stroke="#a855f7" strokeWidth="2.5" />
          </svg>
          Mastery Socket
        </span>
        <span>
          <svg width="24" height="24" viewBox="-16 -16 32 32">
            <rect x="-10" y="-10" width="20" height="20" rx="4" transform="rotate(45)" fill="#1c1f28" stroke="#4a5060" strokeWidth="3" />
          </svg>
          Keystone
        </span>
        <span>
          <svg width="24" height="24" viewBox="-16 -16 32 32">
            <circle r="12" fill="#031525" stroke="#00f0ff" strokeWidth="2" strokeDasharray="3 3" />
            <circle r="5" fill="#00f0ff" />
          </svg>
          Cosmic Gateway
        </span>
        <span>
          <svg width="24" height="24" viewBox="-16 -16 32 32">
            <polygon points="0,-12 12,0 0,12 -12,0" fill="#1c0508" stroke="#ff2a4b" strokeWidth="2" />
          </svg>
          Doomed Gate
        </span>
        <span>
          <svg width="24" height="24" viewBox="-16 -16 32 32">
            <polygon points={starPoints(8, 6, 13)} fill="#1f0815" stroke="#ff3d9a" strokeWidth="2" />
          </svg>
          Celestial Keystone
        </span>
        <span>
          <svg width="22" height="22" viewBox="-14 -14 28 28">
            <circle r="12" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeDasharray="4 3" />
            <circle r="7" fill="#1c1f28" stroke="#4a5060" strokeWidth="2.5" />
          </svg>
          Class mechanic
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
      {settingsOpen && <ProfileSettingsModal s={s} profile={activeProfile} onSave={handleSaveProfile} onClose={() => setSettingsOpen(false)} />}
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
        <span className="chip">{s.account.bank.regret ?? 0} Orbs of Regret</span>
        <span className="dim" style={{ fontSize: 12 }}>
          1 point per 10 total levels across all 11 life skills, up to 36 points. Specialise: the whole tree cannot be filled.
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
        {a.name} paths
      </div>
      {a.signatureNotables.map((n) => (
        <div key={n.id} className="mod">
          <b>{n.name}:</b> {n.desc}
        </div>
      ))}
      <div className="small" style={{ color: 'var(--accent-2)', marginTop: 8 }}>
        Class mechanic paths
      </div>
      {a.mechanicNotables.map((n) => (
        <div key={n.id} className="mod">
          <b>{n.name}:</b> {n.desc}
        </div>
      ))}
      <div className="small" style={{ color: 'var(--unique)', marginTop: 8 }}>
        Capstones
      </div>
      {a.capstones.map((n) => (
        <div key={n.id} className="mod">
          <b>{n.name}:</b> {n.desc}
        </div>
      ))}
      <div className="dim small">Every path is visible as soon as you ascend. Either capstone can follow any two notables; later trials only add points.</div>
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
        <span className="chip">{s.account.bank.regret ?? 0} Orbs of Regret</span>
        <span className="chip">{s.account.bank.divine ?? 0} Divine Orbs</span>
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
          <NodeShape kind={ASC_SHAPE[n.kind]} color={color} on={on} can={can} />
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

/** Where every point comes from. No trial locks individual nodes. */
function TrialList({ s }: { s: GameState }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <h3 style={{ margin: 0 }}>Trials</h3>
      <p className="muted small" style={{ margin: '4px 0' }}>
        Ascendancy points come only from passing a trial, once each. The first trial opens every node. All four trials give {ASCENDANCY_MAX_POINTS} points, supporting a normal build of any three notables and either capstone. There is no hard node-count limit.
      </p>
      {TRIALS.map((t) => {
        return (
          <div key={t.n} className={`small ${s.ascendancy.trials >= t.n ? '' : 'muted'}`}>
            <b>
              Trial {t.n}, {t.name} ({t.place}):
            </b>{' '}
            {s.ascendancy.trials >= t.n ? 'passed.' : 'not passed yet.'} {t.points} points. {t.result}
          </div>
        );
      })}
    </div>
  );
}

function AscendancyPane({ s }: { s: GameState }) {
  const a = currentAscendancy(s);
  return (
    <>
      <TrialList s={s} />
      {a ? <AscendancyTree s={s} a={a} /> : <AscendancyChoice s={s} />}
    </>
  );
}

const TREE_HEADERS = {
  character: 'Character tree: combat power. Points from character levels.',
  skilling: 'Skilling tree: gathering and production. Points from total skill levels.',
  ascendancy: 'Ascendancy: its own points, from passing trials.',
};

export function TreePage() {
  const s = useGame();
  const [picked, setTab] = useState<keyof typeof TREE_HEADERS>('character');
  const ascends = canAscend(s);
  const classic = isClassic(s);
  const tab = (picked === 'ascendancy' && !ascends) || (picked === 'skilling' && classic) ? 'character' : picked;
  const ascBadge = !s.ascendancy.id ? 1 : ascendancyPointsLeft(s);
  return (
    <div className="page wide">
      <PageHeader title="Passive Trees">{TREE_HEADERS[tab]}</PageHeader>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'character', label: 'Character', count: pointsLeft(s) > 0 ? pointsLeft(s) : undefined, hot: true },
          ...(classic ? [] : [{ id: 'skilling' as const, label: 'Skilling', count: skillPointsLeft(s) > 0 ? skillPointsLeft(s) : undefined, hot: true }]),
          ...(ascends ? [{ id: 'ascendancy' as const, label: 'Ascendancy', count: ascBadge > 0 ? ascBadge : undefined, hot: true }] : []),
        ]}
      />
      {tab === 'character' ? <CharacterTree s={s} /> : tab === 'skilling' ? <SkillingTree s={s} /> : <AscendancyPane s={s} />}
    </div>
  );
}

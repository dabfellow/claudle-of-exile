import { useMemo, useRef, useState, type ReactNode } from 'react';
import { PASSIVE_BY_ID, PASSIVE_NODES, REGION_NAMES, type PassiveNode, type TreeRegion } from '../../data/passiveTree';
import { SKILL_TREE_BY_ID, SKILL_TREE_NODES, SKILL_TREE_START, type SkillTreeNode } from '../../data/skillTree';
import { SKILLS } from '../../data/skills';
import { describeStats } from '../../data/statText';
import { allocate, allocateReason, changeMastery, pointsLeft, refund, refundReason, startNode, totalPoints } from '../../engine/passives';
import { allocateSkillNode, refundSkillNode, refundSkillNodeReason, skillNodeReason, skillPointsLeft, skillTreePoints } from '../../engine/skillTree';
import { deriveStats, passiveStats, type Derived } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { Tooltip } from '../components/common';

const REGION_COLOR: Record<TreeRegion, string> = {
  str: '#d0574a',
  dex: '#5fbf6a',
  int: '#5f8de0',
  duelist: '#d39a4a',
  shadow: '#5fb8b0',
  templar: '#c98fd6',
};

const BRANCH_COLOR: Record<string, string> = {
  core: '#d2a659',
  mining: '#c8743f',
  woodcutting: '#6fae4a',
  harvesting: '#d9b84a',
  smithing: '#b8b8c8',
  alchemy: '#9b6dde',
};

// ---------- a pannable, zoomable tree canvas shared by both trees ----------

interface CanvasNode {
  id: string;
  x: number;
  y: number;
  links: string[];
}

function TreeCanvas<N extends CanvasNode>({
  nodes,
  byId,
  size,
  isOn,
  canTake,
  matches,
  renderNode,
  tip,
  onClick,
  labels,
  tutId,
}: {
  nodes: N[];
  byId: Record<string, N>;
  size: number;
  isOn: (id: string) => boolean;
  canTake: (id: string) => boolean;
  matches: Set<string> | null;
  renderNode: (n: N, on: boolean, can: boolean) => ReactNode;
  tip: (n: N) => ReactNode;
  onClick: (n: N) => void;
  labels?: { text: string; x: number; y: number; color: string }[];
  /** tutorial highlight id for a node, if any */
  tutId?: (id: string) => string | undefined;
}) {
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; unit: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const links = useMemo(() => {
    const out: [N, N][] = [];
    for (const n of nodes) for (const l of n.links) if (n.id < l) out.push([n, byId[l]]);
    return out;
  }, [nodes, byId]);
  const zoom = (f: number) => setView((v) => ({ ...v, k: Math.min(2.6, Math.max(0.4, v.k * f)) }));

  return (
    <div
      className="tree-wrap"
      ref={wrap}
      onWheel={(e) => zoom(e.deltaY < 0 ? 1.12 : 0.89)}
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
        if (dr.moved) setView((v) => ({ ...v, x: dr.vx + (dx * dr.unit) / v.k, y: dr.vy + (dy * dr.unit) / v.k }));
      }}
      onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
      onPointerLeave={() => (drag.current = null)}
    >
      <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} preserveAspectRatio="xMidYMid meet">
        <g transform={`scale(${view.k}) translate(${view.x} ${view.y})`}>
          {labels?.map((l) => (
            <text key={l.text} x={l.x} y={l.y} textAnchor="middle" fill={l.color} opacity={0.5} fontFamily="Cinzel, serif" fontSize={24} letterSpacing={5}>
              {l.text}
            </text>
          ))}
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
              <Tooltip svg key={n.id} content={tip(n)}>
                <g
                  data-tut={tutId?.(n.id)}
                  className={`tree-node ${on ? 'on' : ''} ${can ? 'can' : ''} ${matches?.has(n.id) ? 'match' : ''}`}
                  transform={`translate(${n.x} ${n.y})`}
                  style={{ opacity: dim ? 0.25 : 1 }}
                  onClick={() => !drag.current?.moved && onClick(n)}
                >
                  {renderNode(n, on, can)}
                </g>
              </Tooltip>
            );
          })}
        </g>
      </svg>
      <div className="tree-controls">
        <button className="btn sm" onClick={() => zoom(1.2)}>
          +
        </button>
        <button className="btn sm" onClick={() => zoom(1 / 1.2)}>
          −
        </button>
        <button className="btn sm" onClick={() => setView({ x: 0, y: 0, k: 1 })}>
          Reset
        </button>
      </div>
      <div className="tree-legend">Drag to pan · scroll to zoom · click to allocate</div>
    </div>
  );
}

// ---------- shapes ----------

function hexPoints(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${Math.round(r * Math.cos(a))},${Math.round(r * Math.sin(a))}`;
  }).join(' ');
}

function NodeShape({ kind, color, on, can, mine = true }: { kind: string; color: string; on: boolean; can: boolean; mine?: boolean }) {
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
        <span className="dim" style={{ fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
          {n.kind} · {REGION_NAMES[n.region]}
        </span>
      </div>
      {n.kind === 'mastery' ? (
        <div className="mastery-tip">
          {n.options!.map((o, i) => (
            <div key={i} className={`mod ${chosen === i ? 'chosen' : ''}`}>
              {chosen === i ? '◆ ' : '◇ '}
              {o.label}
            </div>
          ))}
          <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
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
      <div className={reason ? 'warn' : 'good'} style={{ marginTop: 6, fontSize: 11.5 }}>
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
        <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>
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

const CHAR_LABELS = [
  { text: 'STRENGTH', x: 0, y: -745, color: REGION_COLOR.str },
  { text: 'DEXTERITY', x: 610, y: 400, color: REGION_COLOR.dex },
  { text: 'INTELLIGENCE', x: -610, y: 400, color: REGION_COLOR.int },
];

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
        size={1640}
        isOn={isOn}
        canTake={canTake}
        matches={matches}
        labels={CHAR_LABELS}
        renderNode={(n, on, can) => <NodeShape kind={n.kind} color={REGION_COLOR[n.region]} on={on} can={can} mine={n.id === myStart} />}
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
        <span className="dim" style={{ fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
          {n.kind} · {n.branch === 'core' ? 'Core' : SKILLS[n.branch].name}
        </span>
      </div>
      <div className="mod">{n.desc}</div>
      {n.req && (
        <div className="dim" style={{ fontSize: 11 }}>
          Requires {SKILLS[n.req.skill].name} level {n.req.level}
        </div>
      )}
      <div className={reason ? 'warn' : 'good'} style={{ marginTop: 6, fontSize: 11.5 }}>
        {reason ?? (allocated ? 'Click to refund (1 Orb of Regret)' : 'Click to learn')}
      </div>
    </div>
  );
}

const SKILL_LABELS = [
  { text: 'MINING', x: 0, y: -480, color: BRANCH_COLOR.mining },
  { text: 'WOODCUTTING', x: 470, y: -150, color: BRANCH_COLOR.woodcutting },
  { text: 'HARVESTING', x: 290, y: 430, color: BRANCH_COLOR.harvesting },
  { text: 'SMITHING', x: -290, y: 430, color: BRANCH_COLOR.smithing },
  { text: 'ALCHEMY', x: -470, y: -150, color: BRANCH_COLOR.alchemy },
];

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
          1 point per 5 total levels in Mining, Woodcutting, Harvesting, Smithing and Alchemy.
        </span>
      </div>
      <TreeCanvas
        nodes={SKILL_TREE_NODES}
        byId={SKILL_TREE_BY_ID}
        size={1100}
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

export function TreePage() {
  const s = useGame();
  const [tab, setTab] = useState<'character' | 'skilling'>('character');
  return (
    <div className="page wide">
      <div className="page-head">
        <div className="grow">
          <h1>Passive Trees</h1>
          <p>
            {tab === 'character'
              ? 'Character tree: combat power. Points from character levels.'
              : 'Skilling tree: gathering and production. Points from total skill levels.'}
          </p>
        </div>
      </div>
      <div className="stash-tabs">
        <button className={`stash-tab ${tab === 'character' ? 'active' : ''}`} onClick={() => setTab('character')}>
          Character {pointsLeft(s) > 0 && <span className="nav-badge hot">+{pointsLeft(s)}</span>}
        </button>
        <button className={`stash-tab ${tab === 'skilling' ? 'active' : ''}`} onClick={() => setTab('skilling')}>
          Skilling {skillPointsLeft(s) > 0 && <span className="nav-badge hot">+{skillPointsLeft(s)}</span>}
        </button>
      </div>
      {tab === 'character' ? <CharacterTree s={s} /> : <SkillingTree s={s} />}
    </div>
  );
}

import { useMemo, useRef, useState } from 'react';
import { PASSIVE_BY_ID, PASSIVE_NODES, type PassiveNode } from '../../data/passiveTree';
import { allocate, allocateReason, pointsLeft, refund, refundReason, startNode, totalPoints } from '../../engine/passives';
import { deriveStats, type Derived } from '../../engine/stats';
import type { StatKey } from '../../engine/types';
import { game, useGame } from '../../game';
import { Tooltip } from '../components/common';

const REGION_COLOR: Record<PassiveNode['region'], string> = {
  start: '#d2a659',
  str: '#d0574a',
  dex: '#5fbf6a',
  int: '#5f8de0',
  bridge: '#c9a227',
};

const STAT_TEXT: Partial<Record<StatKey, (v: number) => string>> = {
  life: (v) => `+${v} to maximum Life`,
  lifePct: (v) => `${v}% increased maximum Life`,
  lifeMore: (v) => `${Math.abs(v)}% ${v > 0 ? 'more' : 'less'} maximum Life`,
  lifeRegen: (v) => `Regenerate ${v} Life per second`,
  armour: (v) => `+${v} to Armour`,
  armourPct: (v) => `${v}% increased Armour`,
  armourMore: (v) => `${v}% more Armour`,
  evasionPct: (v) => `${v}% increased Evasion Rating`,
  physPct: (v) => `${v}% increased Physical Damage`,
  elemPct: (v) => `${v}% increased Elemental Damage`,
  attackSpeedPct: (v) => `${v}% increased Attack Speed`,
  attackSpeedMore: (v) => `${Math.abs(v)}% ${v > 0 ? 'more' : 'less'} Attack Speed`,
  critChancePct: (v) => `${v}% increased Critical Strike Chance`,
  critMulti: (v) => `+${v}% to Critical Strike Multiplier`,
  allRes: (v) => `+${v}% to all Elemental Resistances`,
  flaskEffect: (v) => `${v}% increased Flask Effect`,
  flaskCharges: (v) => `${v}% increased Flask Charges gained`,
  skillSpeed: (v) => `${v}% increased Gathering and Crafting Speed`,
  skillXp: (v) => `${v}% increased Skill Experience`,
  str: (v) => `+${v} to Strength`,
  dex: (v) => `+${v} to Dexterity`,
  int: (v) => `+${v} to Intelligence`,
  allAttr: (v) => `+${v} to all Attributes`,
  mana: (v) => `+${v} to maximum Mana`,
  manaRegenPct: (v) => `${v}% increased Mana Regeneration Rate`,
  accuracy: (v) => `+${v} to Accuracy Rating`,
};

export function nodeLines(n: PassiveNode): string[] {
  return Object.entries(n.stats).map(([k, v]) => STAT_TEXT[k as StatKey]?.(v ?? 0) ?? `${k}: ${v}`);
}

const SUMMARY: [string, (d: Derived) => number, (n: number) => string][] = [
  ['Life', (d) => d.maxLife, (n) => n.toFixed(0)],
  ['DPS', (d) => d.dps, (n) => n.toFixed(1)],
  ['Armour', (d) => d.armour, (n) => n.toFixed(0)],
  ['Evasion', (d) => d.evasion, (n) => n.toFixed(0)],
  ['Regen', (d) => d.lifeRegen, (n) => n.toFixed(1)],
];

function NodeTip({ n, allocated }: { n: PassiveNode; allocated: boolean }) {
  const s = game.state;
  const before = deriveStats(s, []);
  const next = allocated ? s.passives.filter((x) => x !== n.id) : [...s.passives, n.id];
  const after = deriveStats({ ...s, passives: next }, []);
  const reason = allocated ? refundReason(s, n.id) : allocateReason(s, n.id);
  return (
    <div className="tip" style={{ minWidth: 220 }}>
      <div className="tip-title" style={{ color: n.kind === 'keystone' ? 'var(--unique)' : n.kind === 'notable' ? 'var(--accent-2)' : 'var(--text)' }}>
        {n.name}
        <span className="dim" style={{ fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
          {n.kind}
        </span>
      </div>
      {nodeLines(n).map((l) => (
        <div key={l} className="mod">
          {l}
        </div>
      ))}
      <div className="delta-list" style={{ marginTop: 6 }}>
        {SUMMARY.map(([label, f, fm]) => {
          const delta = f(after) - f(before);
          if (Math.abs(delta) < 0.05) return null;
          return (
            <span key={label} style={{ display: 'contents' }}>
              <span className="muted">{label}</span>
              <span className={delta > 0 ? 'good' : 'bad'}>
                {delta > 0 ? '+' : '−'}
                {fm(Math.abs(delta))}
              </span>
            </span>
          );
        })}
      </div>
      <div className={reason ? 'warn' : 'good'} style={{ marginTop: 6, fontSize: 11.5 }}>
        {reason ?? (allocated ? 'Click to refund (costs 1 Orb of Regret)' : 'Click to allocate')}
      </div>
    </div>
  );
}

const RADIUS = { start: 26, small: 11, notable: 18, keystone: 26 };

const REGION_LABELS = [
  { text: 'STRENGTH', x: 0, y: -600, color: REGION_COLOR.str },
  { text: 'DEXTERITY', x: 470, y: 330, color: REGION_COLOR.dex },
  { text: 'INTELLIGENCE', x: -450, y: 330, color: REGION_COLOR.int },
];

export function TreePage() {
  const s = useGame();
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; unit: number } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const allocated = new Set(s.passives);
  const links = useMemo(() => {
    const out: [PassiveNode, PassiveNode][] = [];
    for (const n of PASSIVE_NODES) for (const l of n.links) if (n.id < l) out.push([n, PASSIVE_BY_ID[l]]);
    return out;
  }, []);
  const myStart = startNode(s);
  const isOn = (id: string) => id === myStart || allocated.has(id);
  const canTake = (id: string) => !isOn(id) && allocateReason(s, id) === null;
  const left = pointsLeft(s);

  const onWheel = (e: React.WheelEvent) => {
    const k = Math.min(2.2, Math.max(0.45, view.k * (e.deltaY < 0 ? 1.12 : 0.89)));
    setView((v) => ({ ...v, k }));
  };

  const click = (n: PassiveNode) => {
    if (drag.current?.moved || n.kind === 'start') return;
    if (allocated.has(n.id)) {
      game.act((st, ctx) => refund(st, ctx, n.id));
    } else game.act((st, ctx) => allocate(st, ctx, n.id));
  };

  const W = 1300;
  return (
    <div className="page">
      <div className="page-head">
        <div className="grow">
          <h1>Passive Tree</h1>
          <p>Strength (life, armour, physical) · Dexterity (speed, evasion, crits) · Intelligence (elemental, flasks, crafting).</p>
        </div>
        <span className={`chip ${left > 0 ? 'good' : ''}`} style={{ fontSize: 14 }}>
          {left} / {totalPoints(s)} points left
        </span>
        <span className="chip">{s.bank.regret ?? 0} Orbs of Regret</span>
      </div>
      <div
        className="tree-wrap"
        onWheel={onWheel}
        ref={wrap}
        onPointerDown={(e) => {
          const r = wrap.current!.getBoundingClientRect();
          // viewBox units per screen pixel
          const unit = W / Math.min(r.width, r.height);
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false, unit };
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
        <svg viewBox={`${-W / 2} ${-W / 2} ${W} ${W}`} preserveAspectRatio="xMidYMid meet">
          <g transform={`scale(${view.k}) translate(${view.x} ${view.y})`}>
            {[150, 270, 380, 480, 560].map((r) => (
              <circle key={r} r={r} fill="none" stroke="#1d2029" strokeWidth={1} />
            ))}
            {REGION_LABELS.map((l) => (
              <text key={l.text} x={l.x} y={l.y} textAnchor="middle" fill={l.color} opacity={0.55} fontFamily="Cinzel, serif" fontSize={26} letterSpacing={6}>
                {l.text}
              </text>
            ))}
            {links.map(([a, b]) => {
              const on = isOn(a.id) && isOn(b.id);
              const can = !on && ((isOn(a.id) && canTake(b.id)) || (isOn(b.id) && canTake(a.id)));
              return <line key={`${a.id}-${b.id}`} className={`tree-link ${on ? 'on' : can ? 'can' : ''}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
            })}
            {PASSIVE_NODES.map((n) => {
              const on = isOn(n.id);
              const can = canTake(n.id);
              const r = RADIUS[n.kind];
              return (
                <Tooltip
                  svg
                  key={n.id}
                  content={
                    n.kind === 'start' ? (
                      <div className="tip">{n.id === myStart ? `${n.name} start — your starting point` : `${n.name} start (another class)`}</div>
                    ) : (
                      <NodeTip n={n} allocated={allocated.has(n.id)} />
                    )
                  }
                >
                  <g
                    data-tut={can && s.passives.length === 0 ? 'tree-start' : undefined}
                    className={`tree-node ${on ? 'on' : ''} ${can ? 'can' : ''}`}
                    transform={`translate(${n.x} ${n.y})`}
                    style={{ ['--region' as string]: REGION_COLOR[n.region], opacity: n.kind === 'start' && n.id !== myStart ? 0.3 : 1 }}
                    onClick={() => click(n)}
                  >
                    <circle className="halo" r={r + 6} />
                    {n.kind === 'keystone' ? (
                      <rect className="body" x={-r} y={-r} width={r * 2} height={r * 2} rx={6} transform="rotate(45)" style={{ fill: on ? undefined : '#1c1f28', stroke: on ? 'var(--accent-2)' : can ? '#b89a62' : '#4a5060', strokeWidth: 3 }} />
                    ) : (
                      <circle className="body" r={r} />
                    )}
                    {n.kind !== 'small' && <circle r={r * 0.45} fill={on ? REGION_COLOR[n.region] : '#2a2e38'} />}
                  </g>
                </Tooltip>
              );
            })}
          </g>
        </svg>
        <div className="tree-controls">
          <button className="btn sm" onClick={() => setView((v) => ({ ...v, k: Math.min(2.2, v.k * 1.2) }))}>
            +
          </button>
          <button className="btn sm" onClick={() => setView((v) => ({ ...v, k: Math.max(0.45, v.k / 1.2) }))}>
            −
          </button>
          <button className="btn sm" onClick={() => setView({ x: 0, y: 0, k: 1 })}>
            Reset
          </button>
        </div>
        <div className="tree-legend">Drag to pan · scroll to zoom · click to allocate</div>
      </div>
      <div className="card">
        <div className="card-title">Allocated</div>
        {s.passives.length === 0 ? (
          <div className="dim">Nothing yet. Start next to the centre.</div>
        ) : (
          <div className="row wrap">
            {s.passives.map((id) => (
              <span key={id} className="chip" style={{ borderColor: REGION_COLOR[PASSIVE_BY_ID[id].region] }}>
                {PASSIVE_BY_ID[id].name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

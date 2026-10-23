import { useCallback, useState } from 'react';
import { baseDef } from '../../data/bases';
import { flaskDef } from '../../data/flasks';
import { ACTIVE_GEMS, SUPPORT_GEMS } from '../../data/gems';
import { materialDef } from '../../data/materials';
import { actionsFor, SKILLS, type SkillAction } from '../../data/skills';
import { zoneDef } from '../../data/zones';
import { actionBlocker, actionIntervalMs, skillLevel, smithIlvl, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameEvent, SkillId } from '../../engine/types';
import { progressOf, xpToReach } from '../../engine/xp';
import { game, useGame, useGameEvent } from '../../game';
import { Cost, fmt, MatIcon, ProgressBar } from '../components/common';
import { GemIcon } from '../components/GemView';
import { Icon, Orb, Swatch } from '../components/Icon';

const START_LABEL: Record<SkillId, string> = {
  combat: 'Fight',
  mining: 'Mine',
  woodcutting: 'Chop',
  harvesting: 'Harvest',
  smithing: 'Smith',
  alchemy: 'Brew',
  gemcutting: 'Cut',
};

const ATTR_NAME = { str: 'Strength', dex: 'Dexterity', int: 'Intelligence' } as const;

function outputName(id: string): string {
  const gem = ACTIVE_GEMS.find((g) => g.id === id) ?? SUPPORT_GEMS.find((g) => g.id === id);
  if (gem) return gem.name;
  try {
    return materialDef(id).name;
  } catch {
    return flaskDef(id).name;
  }
}

/** What a gemcutting recipe can produce, e.g. "random Strength support (1 of 4)". */
function gemOutputText(gem: NonNullable<SkillAction['gem']>): string {
  if (gem.kind === 'signature') return 'Signature support for a skill you own';
  const pool = gem.kind === 'skill' ? ACTIVE_GEMS.filter((g) => g.attr === gem.attr) : SUPPORT_GEMS.filter((g) => !g.signatureFor && g.attr === gem.attr);
  return `Random ${ATTR_NAME[gem.attr!]} ${gem.kind} gem (1 of ${pool.length})`;
}

function OutputChips({ a }: { a: SkillAction }) {
  return (
    <div className="io">
      {Object.entries(a.outputs ?? {}).map(([id, n]) => (
        <span key={id} className="io-item">
          <MatIcon id={id} size={12} />
          {n} {materialDef(id).name}
        </span>
      ))}
      {a.baseId && (
        <span className="io-item">
          <Icon name={baseDef(a.baseId).slot} size={12} /> {baseDef(a.baseId).name}
        </span>
      )}
      {a.flaskId && (
        <span className="io-item">
          <Orb color={flaskDef(a.flaskId).color} size={11} /> {flaskDef(a.flaskId).name}
        </span>
      )}
      {a.gem && (
        <span className="io-item">
          <Icon name="gemcutting" size={12} color={a.color} /> {gemOutputText(a.gem)}
        </span>
      )}
      {a.bonus?.map((b) => (
        <span key={b.id} className="io-item dim">
          <MatIcon id={b.id} size={12} />
          {Math.round(b.chance * 100)}% {materialDef(b.id).name}
        </span>
      ))}
    </div>
  );
}

function ActionCard({ a, level }: { a: SkillAction; level: number }) {
  const s = useGame();
  const d = deriveStats(s);
  const running = s.action?.kind === 'skill' && s.action.actionId === a.id;
  const areaLocked = !!a.area && !s.unlockedZones.includes(a.area);
  const locked = level < a.level || areaLocked;
  const interval = actionIntervalMs(s, a, d);
  const blocker = actionBlocker(s, a);
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);

  const onEvent = useCallback(
    (e: GameEvent) => {
      if (e.t === 'produce' && running) {
        const first = Object.entries(e.outputs)[0];
        const text = first ? `+${first[1]} ${outputName(first[0])}` : '+1';
        const id = Math.random();
        setPops((p) => [...p.slice(-3), { id, text }]);
        setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1100);
      }
    },
    [running],
  );
  useGameEvent(onEvent);

  return (
    <div data-tut={`action-${a.id}`} className={`card action-card ${running ? 'running' : ''} ${locked ? 'locked' : ''}`}>
      {pops.map((p) => (
        <span key={p.id} className="pop">
          {p.text} · +{Math.round(a.xp * (1 + d.skillXp / 100))}xp
        </span>
      ))}
      <div className="action-top">
        <div className="action-art">
          {a.baseId ? (
            <Icon name={baseDef(a.baseId).slot} size={24} color={a.color} />
          ) : a.gem?.attr ? (
            <GemIcon def={{ name: a.name, attr: a.gem.attr }} size={28} support={a.gem.kind === 'support'} />
          ) : a.gem ? (
            <Icon name="gemcutting" size={24} color={a.color} />
          ) : a.flaskId || a.outputs?.transmute !== undefined || a.skill === 'alchemy' ? (
            <Orb color={a.color} size={24} glow={running} />
          ) : (
            <Swatch color={a.color} size={20} />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="action-name">{a.name}</div>
          <div className="action-meta">
            <span>{areaLocked ? `Reach ${zoneDef(a.area!).name}` : level < a.level ? `Requires level ${a.level}` : `Lv ${a.level}`}</span>
            <span>
              <Icon name="clock" size={11} /> {(interval / 1000).toFixed(1)}s
            </span>
            <span>{a.xp} xp</span>
          </div>
        </div>
      </div>
      {a.inputs && <Cost cost={a.inputs} have={s.bank} />}
      <OutputChips a={a} />
      {running && s.action?.kind === 'skill' && <ProgressBar value={s.action.progress / interval} color={SKILLS[a.skill].color} />}
      {!locked &&
        (running ? (
          <button className="btn" onClick={() => game.act((st) => stopAction(st))}>
            Stop
          </button>
        ) : (
          <button className="btn primary" disabled={!!blocker} title={blocker ?? ''} onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, a.id))}>
            {blocker === 'Missing materials' ? 'Missing materials' : START_LABEL[a.skill]}
          </button>
        ))}
    </div>
  );
}

export function SkillPage({ skill }: { skill: SkillId }) {
  const s = useGame();
  const def = SKILLS[skill];
  const level = skillLevel(s, skill);
  const xp = s.skills[skill];
  const next = xpToReach(skill, level + 1);
  const actions = actionsFor(skill);
  const [filter, setFilter] = useState<'all' | 'available'>('all');
  const shown = filter === 'all' ? actions : actions.filter((a) => a.level <= level);

  return (
    <div className="page">
      <div className="card skill-hero">
        <div className="skill-hero-icon" style={{ borderColor: def.color }}>
          <Icon name={skill} size={32} color={def.color} />
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--fs-xl)' }}>{def.name}</h1>
          <div className="muted">{def.desc}</div>
        </div>
        <div className="xp">
          <div className="row">
            <span className="level-num">{level}</span>
            <span className="spacer" />
            <span className="muted num">
              {fmt(xp)} / {fmt(next)} xp
            </span>
          </div>
          <ProgressBar value={progressOf(skill, xp)} color={def.color} size="md" smooth />
        </div>
      </div>
      {skill === 'smithing' && (
        <div className="muted">
          Smithed bases are item level <b style={{ color: 'var(--accent-2)' }}>{smithIlvl(s)}</b> — higher item level unlocks better modifier tiers when crafting.
        </div>
      )}
      {skill === 'alchemy' && <div className="muted">Salvage unwanted items at the Crafting Bench for Arcane Dust, then transmute it into orbs here.</div>}
      {skill === 'gemcutting' && (
        <div className="muted">
          Rough Gems come from Mining (and the Glimmering Geode). Cut gems go to your gem bag on the Skills page. You have <b style={{ color: 'var(--accent-2)' }}>{fmt(s.bank.rough_gem ?? 0)}</b> Rough Gems.
        </div>
      )}
      {actions.length > 8 && (
        <div className="tabs" style={{ alignSelf: 'flex-start' }}>
          <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All
          </button>
          <button className={`tab ${filter === 'available' ? 'active' : ''}`} onClick={() => setFilter('available')}>
            Unlocked
          </button>
        </div>
      )}
      <div className="grid cards">
        {shown.map((a) => (
          <ActionCard key={a.id} a={a} level={level} />
        ))}
      </div>
    </div>
  );
}

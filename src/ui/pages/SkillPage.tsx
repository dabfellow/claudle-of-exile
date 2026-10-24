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
import { maxLevelOf, progressOf, xpToReach } from '../../engine/xp';
import { game, useGame, useGameEvent } from '../../game';
import { Badge, fmt, MatIcon, ProgressBar, Tabs } from '../components/common';
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

/** What an activity produces, as rows that line up with the ingredient list. */
function OutputRows({ a }: { a: SkillAction }) {
  return (
    <ul className="ingredients outputs">
      {Object.entries(a.outputs ?? {}).map(([id, n]) => (
        <li key={id}>
          <MatIcon id={id} size={12} />
          <span className="ing-name">{materialDef(id).name}</span>
          <span className="ing-qty num">×{n}</span>
        </li>
      ))}
      {a.baseId && (
        <li>
          <Icon name={baseDef(a.baseId).slot} size={13} />
          <span className="ing-name">{baseDef(a.baseId).name}</span>
          <span className="ing-qty num">×1</span>
        </li>
      )}
      {a.flaskId && (
        <li>
          <Orb color={flaskDef(a.flaskId).color} size={11} />
          <span className="ing-name">{flaskDef(a.flaskId).name}</span>
          <span className="ing-qty num">×1</span>
        </li>
      )}
      {a.gem && (
        <li>
          <Icon name="gemcutting" size={13} color={a.color} />
          <span className="ing-name">{gemOutputText(a.gem)}</span>
          <span className="ing-qty num">×1</span>
        </li>
      )}
      {a.bonus?.map((b) => (
        <li key={b.id} className="bonus">
          <MatIcon id={b.id} size={12} />
          <span className="ing-name">{materialDef(b.id).name}</span>
          <span className="ing-qty num">{Math.round(b.chance * 100)}% chance</span>
        </li>
      ))}
    </ul>
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

  const missing = blocker === 'Missing materials';
  const lockText = areaLocked ? `Reach ${zoneDef(a.area!).name} to unlock` : `Unlocks at ${SKILLS[a.skill].name} level ${a.level}`;

  return (
    <div
      data-tut={`action-${a.id}`}
      className={`card action-card ${a.inputs ? 'recipe' : 'gather'} ${running ? 'running' : ''} ${locked ? 'locked' : ''} ${missing ? 'missing' : ''}`}
    >
      {pops.map((p) => (
        <span key={p.id} className="pop">
          {p.text} · +{Math.round(a.xp * (1 + d.skillXp / 100))}xp
        </span>
      ))}
      <div className="action-top">
        <div className="action-art">
          {locked ? (
            <Icon name="lock" size={20} color="var(--dim)" />
          ) : a.baseId ? (
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
        <div className="action-title">
          <div className="action-name" title={a.name}>
            {a.name}
          </div>
          {(running || locked) && (
            <div className="action-status">
              {running ? (
                <Badge tone="success" live>
                  Active
                </Badge>
              ) : (
                <Badge tone="locked">Locked</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="action-meta">
        <span title="Required level">Lv {a.level}</span>
        <span title="Time per action">
          <Icon name="clock" size={12} /> {(interval / 1000).toFixed(1)}s
        </span>
        <span title="Experience per action">{a.xp} XP</span>
      </div>

      <div className="action-section">
        <div className="io-label">Produces</div>
        <OutputRows a={a} />
      </div>

      {a.inputs && (
        <div className="action-section">
          <div className="io-label">Requires</div>
          <Ingredients cost={a.inputs} have={s.bank} />
        </div>
      )}

      <div className="action-foot">
        {locked ? (
          <>
            <div className="lock-note">
              <Icon name="lock" size={12} /> {lockText}
              {!areaLocked && <span className="num"> (you're {level})</span>}
            </div>
            <button className="btn block" disabled>
              Locked
            </button>
          </>
        ) : running ? (
          <>
            {s.action?.kind === 'skill' && <ProgressBar value={s.action.progress / interval} color="var(--success)" size="md" />}
            <button className="btn block" onClick={() => game.act((st) => stopAction(st))}>
              Stop
            </button>
          </>
        ) : (
          <button
            className={`btn block ${blocker ? '' : 'primary'}`}
            disabled={!!blocker}
            title={blocker ?? ''}
            onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, a.id))}
          >
            {blocker ?? START_LABEL[a.skill]}
          </button>
        )}
      </div>
    </div>
  );
}

/** Ingredient rows: owned / required, muted green when you have enough, muted red when short. */
function Ingredients({ cost, have }: { cost: Record<string, number>; have: Record<string, number> }) {
  return (
    <ul className="ingredients">
      {Object.entries(cost).map(([id, n]) => {
        const owned = have[id] ?? 0;
        return (
          <li key={id} className={owned >= n ? 'ok' : 'short'}>
            <MatIcon id={id} size={12} />
            <span className="ing-name">{materialDef(id).name}</span>
            <span className="ing-qty num">
              <b>{fmt(owned)}</b> / {fmt(n)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The XP header every gathering and production skill page shares. */
function SkillHeader({ skill }: { skill: SkillId }) {
  const s = useGame();
  const def = SKILLS[skill];
  const level = skillLevel(s, skill);
  const xp = s.skills[skill];
  const next = xpToReach(skill, level + 1);
  const maxed = level >= maxLevelOf(skill);
  const rate = game.xpPerHour(skill);
  return (
    <div className="card skill-hero" style={{ ['--skill' as string]: def.color }}>
      <div className="skill-hero-icon">
        <Icon name={skill} size={32} color={def.color} />
      </div>
      <div className="skill-hero-text" style={{ minWidth: 0 }}>
        <span className="page-kicker">{def.group === 'gathering' ? 'Gathering skill' : 'Production skill'}</span>
        <h1>{def.name}</h1>
        <p>{def.desc}</p>
      </div>
      <div className="xp">
        <div className="row">
          <span className="level-num">
            <small>Level</small>
            {level}
          </span>
          <span className="spacer" />
          {rate > 0 && <Badge tone="success">{fmt(rate)} XP/h</Badge>}
        </div>
        <ProgressBar value={maxed ? 1 : progressOf(skill, xp)} color={def.color} size="md" smooth />
        <div className="xp-meta num">
          <span>{fmt(xp)} XP total</span>
          <span className="spacer" />
          <span>{maxed ? 'Max level' : `${fmt(next - xp)} XP to level ${level + 1}`}</span>
        </div>
      </div>
    </div>
  );
}

export function SkillPage({ skill }: { skill: SkillId }) {
  const s = useGame();
  const level = skillLevel(s, skill);
  const actions = actionsFor(skill);
  const [filter, setFilter] = useState<'all' | 'available'>('all');
  const shown = filter === 'all' ? actions : actions.filter((a) => a.level <= level);
  const unlocked = actions.filter((a) => a.level <= level && (!a.area || s.unlockedZones.includes(a.area))).length;

  return (
    <div className="page">
      <SkillHeader skill={skill} />
      {skill === 'smithing' && (
        <div className="callout skill-note">
          Smithed bases are item level <b>{smithIlvl(s)}</b> — higher item level unlocks better modifier tiers when crafting.
        </div>
      )}
      {skill === 'alchemy' && <div className="callout skill-note">Salvage unwanted items at the Crafting Bench for Arcane Dust, then transmute it into orbs here.</div>}
      {skill === 'gemcutting' && (
        <div className="callout skill-note">
          Rough Gems come from Mining (and the Glimmering Geode). Cut gems go to your gem bag on the Skills page. You have <b>{fmt(s.bank.rough_gem ?? 0)}</b> Rough Gems.
        </div>
      )}
      <section>
        <div className="section-head">
          <h3>Activities</h3>
          <span className="dim small">
            {unlocked} of {actions.length} unlocked
          </span>
          <span className="spacer" />
          {actions.length > 8 && (
            <Tabs
              compact
              value={filter}
              onChange={setFilter}
              tabs={[
                { id: 'all', label: 'All' },
                { id: 'available', label: 'Unlocked' },
              ]}
            />
          )}
        </div>
        <div className={`card-grid action-grid ${actions.some((a) => a.inputs) ? 'recipes' : 'gathering'}`}>
          {shown.map((a) => (
            <ActionCard key={a.id} a={a} level={level} />
          ))}
        </div>
      </section>
    </div>
  );
}

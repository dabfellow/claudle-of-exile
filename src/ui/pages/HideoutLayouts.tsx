import { useState, type ReactNode } from 'react';
import { classDef } from '../../data/classes';
import { STATIONS, type StationDef, type StationId } from '../../data/hideout';
import { materialDef } from '../../data/materials';
import { actionDef, actionsFor, SKILLS, type SkillAction } from '../../data/skills';
import { canAfford } from '../../engine/bank';
import { nextUpgradeCost, stationLevel, upgradeStation } from '../../engine/hideout';
import { pointsLeft } from '../../engine/passives';
import { SKILL_IDS, type GameState, type SkillId } from '../../engine/types';
import { levelOf, maxLevelOf, progressOf, xpToReach } from '../../engine/xp';
import { game, useGame } from '../../game';
import { Badge, fmt, GameIcon, MatIcon, ProgressBar, sceneStyle, Tooltip } from '../components/common';
import { CostPopover } from '../components/CostPopover';
import type { Page } from '../Layout';
import { Crest } from '../screens/Screens';

// Three layouts for the Hideout, picked with a switcher on the page while you choose one.
// A: compact rows like the skilling pages · B: one ledger table · C: stations as markers on the scene.

export const STATION_ICON: Record<StationId, string> = {
  map_device: 'map',
  stash: 'stash',
  forge: 'forge',
  alchemy_table: 'alchemy',
  bench: 'bench',
  vendor: 'vendor',
};

/** The lowest-level action this skill hasn't reached yet. */
export function nextUnlock(skill: SkillId, lvl: number): SkillAction | null {
  return (
    actionsFor(skill)
      .filter((a) => !a.soon && !a.batchOf && a.level > lvl)
      .sort((a, b) => a.level - b.level)[0] ?? null
  );
}

/** What's being trained right now: a skill, the character (fighting), or nothing. */
export function trainingNow(s: GameState): SkillId | null {
  if (s.action?.kind === 'skill') return actionDef(s.action.actionId).skill;
  return s.action?.kind === 'combat' ? 'combat' : null;
}

interface StationInfo {
  st: StationDef;
  lvl: number;
  cost: Record<string, number> | null;
  affordable: boolean;
  now: string;
  next: string | null;
}

function stationInfo(s: GameState): StationInfo[] {
  return STATIONS.map((st) => {
    const lvl = stationLevel(s, st.id);
    const cost = nextUpgradeCost(s, st.id);
    return { st, lvl, cost, affordable: cost ? canAfford(s, cost) : false, now: st.levels[lvl - 1].effect, next: cost ? st.levels[lvl].effect : null };
  });
}

interface SkillInfo {
  id: SkillId;
  lvl: number;
  progress: number;
  maxed: boolean;
  next: SkillAction | null;
  into: number;
  span: number;
}

function skillInfo(s: GameState): SkillInfo[] {
  return SKILL_IDS.filter((id) => id !== 'combat').map((id) => {
    const xp = s.skills[id];
    const lvl = levelOf(id, xp);
    const floor = xpToReach(id, lvl);
    return {
      id,
      lvl,
      progress: progressOf(id, xp),
      maxed: lvl >= maxLevelOf(id),
      next: nextUnlock(id, lvl),
      into: Math.floor(xp - floor),
      span: xpToReach(id, lvl + 1) - floor,
    };
  });
}

const upgrade = (id: StationId) => game.act((g, ctx) => upgradeStation(g, ctx, id));

function UpgradeButton({ info }: { info: StationInfo }) {
  if (!info.cost) return <Badge tone="gold">Max</Badge>;
  return (
    <button
      className={`btn sm ${info.affordable ? 'primary' : ''}`}
      disabled={!info.affordable}
      title={info.affordable ? `Upgrade to level ${info.lvl + 1}` : 'Not enough materials'}
      onClick={(e) => {
        e.stopPropagation();
        upgrade(info.st.id);
      }}
    >
      Upgrade
    </button>
  );
}

function Pips({ lvl, max }: { lvl: number; max: number }) {
  return (
    <span className="pips">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`pip ${i < lvl ? 'on' : ''}`} />
      ))}
    </span>
  );
}

/** Each material as "have / need", red where you're short. */
function HaveNeed({ cost, have }: { cost: Record<string, number>; have: Record<string, number> }) {
  return (
    <span className="hx-haveneed">
      {Object.entries(cost).map(([id, n]) => {
        const got = have[id] ?? 0;
        return (
          <span key={id} className={`hx-mat ${got >= n ? 'ok' : 'short'}`} title={materialDef(id).name}>
            <MatIcon id={id} size={14} />
            <span className="num">
              {fmt(got)}/{fmt(n)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

function SkillTip({ k }: { k: SkillInfo }) {
  return (
    <div className="tip">
      <div className="tip-title">{SKILLS[k.id].name}</div>
      <div className="num">{k.maxed ? 'Max level' : `${fmt(k.into)} / ${fmt(k.span)} XP to level ${k.lvl + 1}`}</div>
      {k.next && (
        <div className="dim small">
          Next unlock: {k.next.name} at Lv {k.next.level}
        </div>
      )}
    </div>
  );
}

/** The character's own level, set apart from the trade skills. `compact` is one slim strip. */
export function CharacterBanner({ training, onClick, compact }: { training: boolean; onClick: () => void; compact?: boolean }) {
  const s = useGame();
  const xp = s.skills.combat;
  const lvl = levelOf('combat', xp);
  const floor = xpToReach('combat', lvl);
  const span = xpToReach('combat', lvl + 1) - floor;
  const progress = progressOf('combat', xp);
  const c = classDef(s.character.classId);
  return (
    <button className={`card char-banner ${compact ? 'compact' : ''} ${training ? 'running' : ''}`} style={{ ['--class' as string]: c.color }} onClick={onClick}>
      <Crest classId={s.character.classId} size={compact ? 44 : 72} />
      <span className="char-banner-body">
        <span className="char-banner-kicker">{c.name}</span>
        <span className="char-banner-name">{s.character.name}</span>
        <ProgressBar value={progress} color="linear-gradient(90deg, var(--accent), var(--accent-2))" smooth size="md" label={`${fmt(Math.floor(xp - floor))} / ${fmt(span)} XP`} />
        {!compact && (
          <span className="dim small num">
            {Math.floor(progress * 100)}% to level {lvl + 1}
            {training && ' · fighting now'}
          </span>
        )}
      </span>
      <span className="char-banner-level">
        <small>Level</small>
        <b className="num">{lvl}</b>
      </span>
    </button>
  );
}

function PointsButton({ go }: { go: (p: Page) => void }) {
  const points = pointsLeft(useGame());
  if (points <= 0) return null;
  return (
    <button className="btn sm primary" onClick={() => go('tree')}>
      {points} passive point{points > 1 ? 's' : ''} to spend
    </button>
  );
}

function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="tier-head hx-section-head">
      <span className="tier-name">{title}</span>
      <span className="tier-rule" />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- A: compact rows

function StationRow({ info, go }: { info: StationInfo; go: (p: Page) => void }) {
  const s = useGame();
  const [open, setOpen] = useState(false);
  const { st, lvl, cost } = info;
  return (
    <div className={`card action-card hx-row ${open ? 'open' : ''} ${info.affordable ? 'ready' : ''}`} style={{ ['--station' as string]: st.color }}>
      <div className="action-head">
        <button className="action-toggle" onClick={() => setOpen(!open)} aria-expanded={open} title={st.desc}>
          <span className="action-art">
            <GameIcon name={STATION_ICON[st.id]} size={20} color={st.color} />
          </span>
          <span className="action-title">
            <span className="action-name">
              {st.name} <span className="hx-lvl num">Lv {lvl}/{st.levels.length}</span>
            </span>
            <span className="action-meta">{info.now}</span>
          </span>
          <span className="action-chevron" aria-hidden>
            ▸
          </span>
        </button>
        <UpgradeButton info={info} />
      </div>
      {open && (
        <div className="action-body">
          {info.next && (
            <div className="action-section">
              <div className="io-label">Next · Lv {lvl + 1}</div>
              <div className="small">{info.next}</div>
            </div>
          )}
          {cost && (
            <div className="action-section hx-row-cost">
              <HaveNeed cost={cost} have={s.bank} />
              <CostPopover cost={cost} have={s.bank} go={go} />
            </div>
          )}
          <button className="btn sm ghost hx-open" onClick={() => go(st.page as Page)}>
            Open {st.name} →
          </button>
        </div>
      )}
    </div>
  );
}

function SkillRow({ k, running, go }: { k: SkillInfo; running: boolean; go: (p: Page) => void }) {
  const soon = SKILLS[k.id].soon;
  return (
    <Tooltip content={<SkillTip k={k} />}>
      <button className={`card action-card hx-row hx-skill ${running ? 'running' : ''}`} style={{ ['--skill' as string]: SKILLS[k.id].color }} onClick={() => go(k.id)}>
        <span className="action-head">
          <span className="action-toggle as-row">
            <span className="action-art">
              <GameIcon name={k.id} size={20} color={SKILLS[k.id].color} />
            </span>
            <span className="action-title">
              <span className="action-name">
                {SKILLS[k.id].name} {running && <Badge tone="success" live>Training</Badge>}
              </span>
              <span className="action-meta num">
                {soon ? <span>Coming soon</span> : k.next ? <span>Next: {k.next.name} at Lv {k.next.level}</span> : <span>Everything unlocked</span>}
              </span>
            </span>
            <span className="hx-skill-lvl num">{k.lvl}</span>
          </span>
        </span>
        <ProgressBar value={k.progress} color={SKILLS[k.id].color} smooth className="action-progress hx-thin" />
      </button>
    </Tooltip>
  );
}

export function HideoutRows({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const training = trainingNow(s);
  const skills = skillInfo(s);
  return (
    <div className="hx-a">
      <div className="hx-top">
        <CharacterBanner compact training={training === 'combat'} onClick={() => go('combat')} />
        <PointsButton go={go} />
      </div>
      <section>
        <SectionHead title="Stations" />
        <div className="hx-grid">
          {stationInfo(s).map((info) => (
            <StationRow key={info.st.id} info={info} go={go} />
          ))}
        </div>
      </section>
      {(['gathering', 'production'] as const).map((group) => (
        <section key={group}>
          <SectionHead title={group === 'gathering' ? 'Gathering' : 'Production'} />
          <div className="hx-grid">
            {skills
              .filter((k) => SKILLS[k.id].group === group)
              .map((k) => (
                <SkillRow key={k.id} k={k} running={training === k.id} go={go} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- B: ledger

/** A ring with the level in the middle: one trade skill. */
function SkillDial({ k, running, go }: { k: SkillInfo; running: boolean; go: (p: Page) => void }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const color = SKILLS[k.id].color;
  return (
    <Tooltip content={<SkillTip k={k} />}>
      <button className={`hx-dial ${running ? 'running' : ''}`} style={{ ['--skill' as string]: color }} onClick={() => go(k.id)}>
        <svg viewBox="0 0 64 64" className="hx-dial-ring" aria-hidden>
          <circle cx="32" cy="32" r={r} className="hx-dial-track" />
          <circle cx="32" cy="32" r={r} className="hx-dial-fill" strokeDasharray={`${c * k.progress} ${c}`} transform="rotate(-90 32 32)" />
        </svg>
        <span className="hx-dial-center">
          <GameIcon name={k.id} size={16} color={color} />
          <b className="num">{k.lvl}</b>
        </span>
        <span className="hx-dial-name">{SKILLS[k.id].name}</span>
        <span className="hx-dial-next dim">{SKILLS[k.id].soon ? 'Coming soon' : k.next ? `${k.next.name} · ${k.next.level}` : 'All unlocked'}</span>
      </button>
    </Tooltip>
  );
}

export function HideoutLedger({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const training = trainingNow(s);
  const skills = skillInfo(s);
  return (
    <div className="hx-b">
      <div className="hx-top">
        <CharacterBanner compact training={training === 'combat'} onClick={() => go('combat')} />
        <PointsButton go={go} />
      </div>
      <div className="card hx-ledger">
        <div className="hx-ledger-row head">
          <span>Station</span>
          <span>Level</span>
          <span>Now</span>
          <span>Next level</span>
          <span>Cost (have / need)</span>
          <span />
        </div>
        {stationInfo(s).map((info) => (
          <div key={info.st.id} className={`hx-ledger-row ${info.affordable ? 'ready' : ''}`} style={{ ['--station' as string]: info.st.color }} onClick={() => go(info.st.page as Page)} title={`${info.st.desc} Click to open.`}>
            <span className="hx-ledger-name">
              <span className="hx-ledger-icon">
                <GameIcon name={STATION_ICON[info.st.id]} size={18} color={info.st.color} />
              </span>
              <b>{info.st.name}</b>
            </span>
            <span className="hx-ledger-level">
              <b className="num">{info.lvl}</b>
              <Pips lvl={info.lvl} max={info.st.levels.length} />
            </span>
            <span className="small">{info.now}</span>
            <span className="small muted">{info.next ?? '—'}</span>
            <span onClick={(e) => e.stopPropagation()}>{info.cost ? <HaveNeed cost={info.cost} have={s.bank} /> : <span className="dim small">Fully upgraded</span>}</span>
            <span className="hx-ledger-act">
              <UpgradeButton info={info} />
            </span>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="hx-dials-wrap">
          {(['gathering', 'production'] as const).map((group) => (
            <div key={group} className="hx-dial-group">
              <div className="io-label">{group === 'gathering' ? 'Gathering' : 'Production'}</div>
              <div className="hx-dials">
                {skills
                  .filter((k) => SKILLS[k.id].group === group)
                  .map((k) => (
                    <SkillDial key={k.id} k={k} running={training === k.id} go={go} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- C: scene

/** Where each station stands in the hideout picture, as % of the scene. */
const STATION_SPOT: Record<StationId, { x: number; y: number }> = {
  map_device: { x: 50, y: 30 },
  vendor: { x: 17, y: 38 },
  stash: { x: 30, y: 70 },
  forge: { x: 82, y: 42 },
  alchemy_table: { x: 66, y: 74 },
  bench: { x: 48, y: 62 },
};

export function HideoutScene({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const training = trainingNow(s);
  const stations = stationInfo(s);
  const [picked, setPicked] = useState<StationId>(() => (stations.find((x) => x.affordable) ?? stations[0]).st.id);
  const sel = stations.find((x) => x.st.id === picked) ?? stations[0];
  return (
    <div className="hx-c">
      <div className="card hideout-scene hx-scene" style={sceneStyle('scenes/hideout')}>
        <div className="hx-scene-field">
          <div className="hx-scene-char">
            <CharacterBanner compact training={training === 'combat'} onClick={() => go('combat')} />
            <PointsButton go={go} />
          </div>
          {stations.map((info) => {
            const spot = STATION_SPOT[info.st.id];
            return (
              <button
                key={info.st.id}
                className={`hx-spot ${picked === info.st.id ? 'active' : ''} ${info.affordable ? 'ready' : ''}`}
                style={{ left: `${spot.x}%`, top: `${spot.y}%`, ['--station' as string]: info.st.color }}
                onClick={() => setPicked(info.st.id)}
                title={info.st.desc}
              >
                <span className="hx-spot-icon">
                  <GameIcon name={STATION_ICON[info.st.id]} size={26} color={info.st.color} />
                  <span className="hx-spot-lvl num">{info.lvl}</span>
                </span>
                <span className="hx-spot-name">{info.st.name}</span>
                {info.affordable && <span className="hx-spot-up">▲</span>}
              </button>
            );
          })}
        </div>
        <aside className="hx-panel" style={{ ['--station' as string]: sel.st.color }}>
          <div className="hx-panel-head">
            <span className="hx-ledger-icon">
              <GameIcon name={STATION_ICON[sel.st.id]} size={22} color={sel.st.color} />
            </span>
            <div>
              <div className="hx-panel-name">{sel.st.name}</div>
              <div className="row" style={{ gap: 8 }}>
                <span className="dim small num">
                  Level {sel.lvl} of {sel.st.levels.length}
                </span>
                <Pips lvl={sel.lvl} max={sel.st.levels.length} />
              </div>
            </div>
          </div>
          <p className="dim small">{sel.st.desc}</p>
          <div className="io-label">Now</div>
          <div className="small">{sel.now}</div>
          {sel.next && (
            <>
              <div className="io-label">Next · Lv {sel.lvl + 1}</div>
              <div className="small">{sel.next}</div>
            </>
          )}
          {sel.cost && (
            <>
              <div className="io-label">Cost</div>
              <HaveNeed cost={sel.cost} have={s.bank} />
              <CostPopover cost={sel.cost} have={s.bank} go={go} />
            </>
          )}
          <div className="hx-panel-actions">
            <UpgradeButton info={sel} />
            <button className="btn sm" onClick={() => go(sel.st.page as Page)}>
              Open →
            </button>
          </div>
        </aside>
      </div>
      <div className="hx-chips">
        {skillInfo(s).map((k) => (
          <Tooltip key={k.id} content={<SkillTip k={k} />}>
            <button className={`hx-chip ${training === k.id ? 'running' : ''}`} style={{ ['--skill' as string]: SKILLS[k.id].color }} onClick={() => go(k.id)}>
              <GameIcon name={k.id} size={16} color={SKILLS[k.id].color} />
              <span className="hx-chip-name">{SKILLS[k.id].name}</span>
              <b className="num">{k.lvl}</b>
              <span className="hx-chip-bar" style={{ width: `${k.progress * 100}%` }} />
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

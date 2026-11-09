import { useMemo, type ReactNode } from 'react';
import { classDef } from '../../data/classes';
import { heistJob } from '../../data/heist';
import { STATIONS, type StationDef, type StationId } from '../../data/hideout';
import { materialDef } from '../../data/materials';
import { actionDef, actionsFor, SKILLS, type SkillAction } from '../../data/skills';
import { zoneDef } from '../../data/zones';
import { canAfford } from '../../engine/bank';
import { hideoutCost, isClassic, isSolo } from '../../engine/challenge';
import { skillSummary } from '../../engine/gems';
import { nextUpgradeCost, stationLevel, stationLockReason, stationPerks, upgradeStation } from '../../engine/hideout';
import { pointsLeft } from '../../engine/passives';
import { actionIntervalMs } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import { cartographyOpen } from '../../engine/cartography';
import { SKILL_IDS, type GameState, type SkillId } from '../../engine/types';
import { levelOf, maxLevelOf, progressOf, xpToReach } from '../../engine/xp';
import { game, useGame } from '../../game';
import { Badge, Cost, fmt, fmtTime, GameIcon, MatIcon, ProgressBar, sceneStyle, Tooltip } from '../components/common';
import { Fold } from '../components/Fold';
import { EventsCard } from '../components/EventCalendar';
import { openItemMenu } from '../components/ItemMenu';
import { materialSources } from '../components/materialSources';
import { PaperDoll } from '../components/PaperDoll';
import { LootFilterManager } from '../components/LootFilterManager';
import type { Page } from '../Layout';
import { Crest } from '../screens/Screens';
import '../round2-session2.css';

const STATION_ICON: Record<StationId, string> = {
  map_device: 'map',
  stash: 'stash',
  forge: 'forge',
  alchemy_table: 'alchemy',
  bench: 'bench',
  vendor: 'vendor',
  war_table: 'combat',
  quartermaster: 'stash',
  watchtower: 'clock',
  trophy_altar: 'trophy',
  rune_board: 'runecarving',
};

export function Embers() {
  const embers = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${(i * 53) % 100}%`,
        delay: `${(i * 0.7) % 6}s`,
        dur: `${5 + ((i * 1.3) % 5)}s`,
        drift: `${((i * 37) % 60) - 30}px`,
      })),
    [],
  );
  return (
    <div className="embers">
      {embers.map((e, i) => (
        <span key={i} className="ember" style={{ left: e.left, animationDelay: e.delay, animationDuration: e.dur, ['--drift' as string]: e.drift }} />
      ))}
    </div>
  );
}

/** The lowest-level action this skill hasn't reached yet. */
function nextUnlock(skill: SkillId, lvl: number): SkillAction | null {
  return (
    actionsFor(skill)
      .filter((a) => !a.soon && !a.batchOf && a.level > lvl)
      .sort((a, b) => a.level - b.level)[0] ?? null
  );
}

/** What's being trained right now: a skill, the character (fighting), or nothing. */
function trainingNow(s: GameState): SkillId | null {
  if (s.action?.kind === 'skill') return actionDef(s.action.actionId).skill;
  if (s.action?.kind === 'heist') return 'thieving';
  return s.action?.kind === 'combat' ? 'combat' : null;
}

/** The life skills shown at home, in the game's own order. */
function lifeSkills(s: GameState, group: 'gathering' | 'production'): SkillId[] {
  return SKILL_IDS.filter((id) => id !== 'combat' && SKILLS[id].group === group && (id !== 'cartography' || cartographyOpen(s)));
}

/**
 * The Hideout is home: who you are up top (with your vitals), your stats, gear and life skills side by side,
 * then the station upgrades, with a bar of shortcuts pinned along the bottom.
 */
export function HideoutPage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const training = trainingNow(s);
  const classic = isClassic(s);
  return (
    <div className="page hideout">
      <div className="card hideout-scene hideout-hero" style={sceneStyle('scenes/hideout')}>
        <Embers />
        <CharacterBanner training={training === 'combat'} onClick={() => go('combat')} />
      </div>
      <div className={`home-top ${classic ? 'no-skills' : ''}`}>
        <StatsCard go={go} />
        <GearCard go={go} />
        {!classic && <LifeSkillsCard go={go} training={training} />}
      </div>
      <StationLedger go={go} />
      <EventsCard />
      <GoToBar go={go} />
    </div>
  );
}

/** The character's own level, set apart from the trade skills, with the numbers that keep you alive. */
function CharacterBanner({ training, onClick }: { training: boolean; onClick: () => void }) {
  const s = useGame();
  const xp = s.skills.combat;
  const lvl = levelOf('combat', xp);
  const floor = xpToReach('combat', lvl);
  const span = xpToReach('combat', lvl + 1) - floor;
  const progress = progressOf('combat', xp);
  const c = classDef(s.character.classId);
  const d = deriveStats(s, []);
  const res = (n: number) => <b className={n >= 75 ? 'good' : n < 0 ? 'bad' : ''}>{n}%</b>;
  return (
    <button className={`card char-banner ${training ? 'running' : ''}`} style={{ ['--class' as string]: c.color }} onClick={onClick}>
      <Crest classId={s.character.classId} size={72} />
      <span className="char-banner-body">
        <span className="char-banner-kicker">{c.name}</span>
        <span className="char-banner-name">{s.character.name}</span>
        <ProgressBar value={progress} color="linear-gradient(90deg, var(--accent), var(--accent-2))" smooth size="md" label={`${fmt(Math.floor(xp - floor))} / ${fmt(span)} XP`} />
        <span className="dim small num">
          {Math.floor(progress * 100)}% to level {lvl + 1}
          {training && ' · fighting now'}
        </span>
      </span>
      <span className="char-banner-level">
        <small>Level</small>
        <b className="num">{lvl}</b>
      </span>
      <span className="char-vitals" aria-label="Vitals and defences">
        <span className="char-vital life" title="Maximum Life">
          <small>Life</small>
          <b className="num">{fmt(d.maxLife)}</b>
        </span>
        {d.maxEs > 0 && (
          <span className="char-vital es" title="Maximum Energy Shield">
            <small>Energy Shield</small>
            <b className="num">{fmt(d.maxEs)}</b>
          </span>
        )}
        <span className="char-vital mana" title="Maximum Mana">
          <small>Mana</small>
          <b className="num">{fmt(d.maxMana)}</b>
        </span>
        <span className="char-vital" title="Armour">
          <small>Armour</small>
          <b className="num">{fmt(d.armour)}</b>
        </span>
        <span className="char-vital" title="Evasion">
          <small>Evasion</small>
          <b className="num">{fmt(d.evasion)}</b>
        </span>
        <span className="char-vital res" title="Fire, Cold and Lightning resistance (75% is the cap)">
          <small>Resists</small>
          <span className="num">
            <span style={{ color: 'var(--fire)' }}>{res(d.res.fire)}</span> <span style={{ color: 'var(--cold)' }}>{res(d.res.cold)}</span> <span style={{ color: 'var(--light)' }}>{res(d.res.light)}</span>
          </span>
        </span>
      </span>
    </button>
  );
}

function OpenButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="btn sm ghost" onClick={onClick}>
      Open →
    </button>
  );
}

// ---------- stats ----------

function StatsCard({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const d = deriveStats(s, []);
  // your strongest skill on the bar, or the Default Attack
  const best = Math.max(d.dps, ...s.skillBar.map((g) => (g ? skillSummary(d, g).perSecond : 0)));
  const res = (n: number) => <span className={n >= 75 ? 'good' : n < 0 ? 'bad' : ''}>{n}%</span>;
  const rows: [string, ReactNode][] = [
    ['Life', <span style={{ color: 'var(--life-2)' }}>{fmt(d.maxLife)}</span>],
    ...(d.maxEs > 0 ? ([['Energy Shield', <span style={{ color: 'var(--es-2, var(--es))' }}>{fmt(d.maxEs)}</span>]] as [string, ReactNode][]) : []),
    ['Mana', <span style={{ color: 'var(--mana-2)' }}>{fmt(d.maxMana)}</span>],
    ['Best skill DPS', <b>{fmt(Math.round(best))}</b>],
    ['Armour', fmt(d.armour)],
    ['Evasion', fmt(d.evasion)],
    ['Crit chance', `${d.critChance.toFixed(1)}%`],
  ];
  return (
    <Fold id="home-character" title="Character" className="home-card" actions={<OpenButton onClick={() => go('equipment')} />}>
      <div className="home-stats">
        {rows.map(([label, value]) => (
          <div key={label} className="home-stat">
            <span className="muted">{label}</span>
            <span className="num">{value}</span>
          </div>
        ))}
        <div className="home-stat">
          <span className="muted">Resistances</span>
          <span className="num home-res">
            <span style={{ color: 'var(--fire)' }}>F</span> {res(d.res.fire)} <span style={{ color: 'var(--cold)' }}>C</span> {res(d.res.cold)}{' '}
            <span style={{ color: 'var(--light)' }}>L</span> {res(d.res.light)}
          </span>
        </div>
        <div className="home-stat">
          <span className="muted">Attributes</span>
          <span className="num home-res">
            <span style={{ color: 'var(--str)' }}>{d.attributes.str}</span> / <span style={{ color: 'var(--dex)' }}>{d.attributes.dex}</span> /{' '}
            <span style={{ color: 'var(--int)' }}>{d.attributes.int}</span>
          </span>
        </div>
      </div>
    </Fold>
  );
}

// ---------- gear ----------

/** The same paper doll as the Equipment page; a worn item opens its menu, empty slots and flasks open that page. */
function GearCard({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  return (
    <Fold id="home-equipment" title="Equipment" className="home-card home-doll" actions={<OpenButton onClick={() => go('equipment')} />}>
      <PaperDoll s={s} onItem={(_, it) => openItemMenu(it.uid)} onEmpty={() => go('equipment')} onFlask={() => go('equipment')} />
    </Fold>
  );
}

// ---------- life skills ----------

/** What's running right now, if it's a life skill: its name, the skill it trains and how far along it is. */
function NowRunning({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const d = deriveStats(s);
  let skill: SkillId | null = null;
  let title = '';
  let sub = '';
  let progress = 0;
  if (s.action?.kind === 'skill') {
    const a = actionDef(s.action.actionId);
    const interval = actionIntervalMs(s, a, d);
    skill = a.skill;
    title = `${SKILLS[a.skill].verb}: ${a.name}`;
    sub = `${fmtTime(Math.max(0, interval - s.action.progress))} left`;
    progress = s.action.progress / interval;
  } else if (s.action?.kind === 'heist') {
    skill = 'thieving';
    title = `Heist: ${heistJob(s.action.jobId).name}`;
    sub = `Room ${s.action.room} of ${s.action.lastRoom}`;
  }
  if (!skill) {
    const elsewhere = s.action?.kind === 'combat' && s.combat ? `You're fighting in ${zoneDef(s.combat.zoneId).name}.` : s.action?.kind === 'craft' ? "You're crafting at the bench." : "You're idle.";
    return (
      <div className="hl-now idle">
        <GameIcon name="clock" size={16} color="var(--dim)" />
        <span>
          <b>No life skill running.</b> <span className="dim">{elsewhere} Pick a skill below to start one.</span>
        </span>
      </div>
    );
  }
  const color = SKILLS[skill].color;
  const lvl = levelOf(skill, s.skills[skill]);
  return (
    <button className="hl-now" style={{ ['--skill' as string]: color }} onClick={() => go(skill!)}>
      <span className="hl-now-icon">
        <GameIcon name={skill} size={20} color={color} />
      </span>
      <span className="hl-now-body">
        <span className="hl-now-kicker">
          Running now · {SKILLS[skill].name} {lvl}
        </span>
        <b>{title}</b>
        <ProgressBar value={progress} color={color} smooth />
        <span className="dim small num">{sub}</span>
      </span>
    </button>
  );
}

/** One life skill as a row: level, progress to the next, and the next thing it unlocks. */
function SkillRow({ id, s, running, go }: { id: SkillId; s: GameState; running: boolean; go: (p: Page) => void }) {
  const xp = s.skills[id];
  const lvl = levelOf(id, xp);
  const floor = xpToReach(id, lvl);
  const progress = progressOf(id, xp);
  const maxed = lvl >= maxLevelOf(id);
  const next = nextUnlock(id, lvl);
  const color = SKILLS[id].color;
  return (
    <Tooltip
      content={
        <div className="tip">
          <div className="tip-title">{SKILLS[id].name}</div>
          <div className="num">{maxed ? 'Max level' : `${fmt(Math.floor(xp - floor))} / ${fmt(xpToReach(id, lvl + 1) - floor)} XP to level ${lvl + 1}`}</div>
          {next && (
            <div className="dim small">
              Next unlock: {next.name} at Lv {next.level}
            </div>
          )}
        </div>
      }
    >
      <button className={`hl-skill ${running ? 'running' : ''} ${SKILLS[id].soon ? 'is-soon' : ''}`} style={{ ['--skill' as string]: color }} onClick={() => go(id)}>
        <GameIcon name={id} size={16} color={color} />
        <span className="hl-skill-name">{SKILLS[id].name}</span>
        <b className="hl-skill-lvl num">{lvl}</b>
        <span className="hl-skill-bar">
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </span>
        <span className="hl-skill-next dim">{SKILLS[id].soon ? 'Coming soon' : next ? `${next.name} · Lv ${next.level}` : 'All unlocked'}</span>
      </button>
    </Tooltip>
  );
}

function LifeSkillsCard({ go, training }: { go: (p: Page) => void; training: SkillId | null }) {
  const s = useGame();
  return (
    <Fold id="home-skills" title="Life skills" className="home-card home-skills">
      <NowRunning go={go} />
      {(['gathering', 'production'] as const).map((group) => (
        <div key={group} className="hl-group">
          <div className="io-label">{group === 'gathering' ? 'Gathering' : 'Production'}</div>
          <div className="hl-skills">
            {lifeSkills(s, group).map((id) => (
              <SkillRow key={id} id={id} s={s} running={training === id} go={go} />
            ))}
          </div>
        </div>
      ))}
    </Fold>
  );
}

// ---------- where to go ----------

/** Shortcuts to every page you use from home, pinned along the bottom of the page. */
function GoToBar({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const points = pointsLeft(s);
  const loot = s.ground.length + s.offlineHaul.length;
  const links: { page: Page; label: string; short: string; icon: string; badge?: ReactNode }[] = [
    { page: 'combat', label: 'Combat', short: 'Combat', icon: 'combat', badge: loot > 0 ? <span className="nav-badge loot">{loot}</span> : undefined },
    { page: 'campaign', label: 'Campaign', short: 'Acts', icon: 'campaign' },
    { page: 'stash', label: 'Stash', short: 'Stash', icon: 'stash', badge: s.inventory.length > 0 ? <span className="nav-badge">{s.inventory.length}</span> : undefined },
    { page: 'equipment', label: 'Equipment', short: 'Gear', icon: 'equipment' },
    { page: 'skills', label: 'Skills', short: 'Skills', icon: 'gems' },
    { page: 'tree', label: 'Passive Tree', short: 'Tree', icon: 'tree', badge: points > 0 ? <span className="nav-badge hot">+{points}</span> : undefined },
    { page: 'bench', label: 'Crafting Bench', short: 'Bench', icon: 'bench' },
    { page: 'vendor', label: 'Town', short: 'Town', icon: 'vendor' },
  ];
  return (
    <nav className="home-goto" aria-label="Go to">
      {links.map((l) => (
        <button key={l.page} className="home-goto-btn" onClick={() => go(l.page)} title={l.label}>
          <span className="home-goto-icon">
            <GameIcon name={l.icon} size={18} />
            {l.badge}
          </span>
          <span className="home-goto-label long">{l.label}</span>
          <span className="home-goto-label short">{l.short}</span>
        </button>
      ))}
    </nav>
  );
}

// ---------- stations ----------

function Pips({ lvl, max }: { lvl: number; max: number }) {
  return (
    <span className="pips">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`pip ${i < lvl ? 'on' : ''}`} />
      ))}
    </span>
  );
}

/** Each material as "have / need", red where you're short. Hover for where to get it; click to go to the first place. */
function HaveNeed({ cost, have, go }: { cost: Record<string, number>; have: Record<string, number>; go: (p: Page) => void }) {
  return (
    <span className="hx-haveneed">
      {Object.entries(cost).map(([id, n]) => {
        const got = have[id] ?? 0;
        const sources = materialSources(id);
        return (
          <Tooltip
            key={id}
            content={
              <div className="tip">
                <div className="tip-title">{materialDef(id).name}</div>
                <div className="num small">
                  {fmt(got)} / {fmt(n)} {got >= n ? '· ready' : `· ${fmt(n - got)} short`}
                </div>
                <div className="io-label" style={{ marginTop: 6 }}>
                  Where to get it
                </div>
                {sources.map((src) => (
                  <div key={src.label} className="small">
                    {src.label}
                    {src.detail && <span className="dim"> · {src.detail}</span>}
                  </div>
                ))}
                <div className="dim small" style={{ marginTop: 6 }}>
                  Click to go to {sources[0].label.split(':')[0]}
                </div>
              </div>
            }
          >
            <button className={`hx-mat ${got >= n ? 'ok' : 'short'}`} onClick={() => go(sources[0].page)}>
              <MatIcon id={id} size={14} />
              <span className="num">
                {fmt(got)}/{fmt(n)}
              </span>
            </button>
          </Tooltip>
        );
      })}
    </span>
  );
}

type TierState = 'done' | 'next' | 'later';

/** One step of a station's ladder. Later tiers show their cost on hover. */
function Tier({ n, effect, cost, state, have }: { n: number; effect: string; cost: Record<string, number>; state: TierState; have: Record<string, number> }) {
  const later = state === 'later' && Object.keys(cost).length > 0;
  return (
    <li className={`hx-tier ${state}`}>
      <span className="hx-tier-mark num">{state === 'done' ? '✓' : n}</span>
      <div className="hx-tier-body">
        {later ? (
          <Tooltip
            content={
              <div className="tip">
                <div className="tip-title">Level {n} cost</div>
                <Cost cost={cost} have={have} />
              </div>
            }
          >
            <span>{effect}</span>
          </Tooltip>
        ) : (
          <span>{effect}</span>
        )}
      </div>
    </li>
  );
}

/** How many of a cost's materials you're still short of. */
function shortBy(cost: Record<string, number>, have: Record<string, number>): number {
  return Object.entries(cost).filter(([id, n]) => (have[id] ?? 0) < n).length;
}

/**
 * A station: what it gives you now, then the next upgrade on its own with its cost and button,
 * and the whole ladder folded away underneath.
 */
function StationCard({ st, go }: { st: StationDef; go: (p: Page) => void }) {
  const s = useGame();
  const lvl = stationLevel(s, st.id);
  const locked = stationLockReason(s, st.id);
  const cost = nextUpgradeCost(s, st.id);
  const affordable = !locked && !!cost && canAfford(s, cost);
  const hasPage = !locked && st.page !== 'hideout';
  const next = st.levels[lvl];
  const short = cost ? shortBy(cost, s.account.bank) : 0;
  return (
    <div className={`card hx-station ${affordable ? 'ready' : ''} ${locked ? 'locked' : ''} ${!cost && !locked ? 'maxed' : ''}`} style={{ ['--station' as string]: st.color }}>
      <div className="hx-station-head" title={st.desc}>
        <span className="hx-station-icon">
          <GameIcon name={STATION_ICON[st.id]} size={18} color={locked ? 'var(--dim)' : st.color} />
        </span>
        <span className="hx-station-title">
          <b>{st.name}</b>
          <span className="hx-station-level">
            <span className="dim small num">
              Level {lvl} of {st.levels.length}
            </span>
            <Pips lvl={lvl} max={st.levels.length} />
          </span>
        </span>
        <span className="grow" />
        {affordable && <Badge tone="success">Ready</Badge>}
        {!cost && !locked && <Badge tone="gold">Max</Badge>}
        {hasPage && (
          <button className="btn sm ghost" onClick={() => go(st.page as Page)}>
            Open →
          </button>
        )}
      </div>
      {locked ? (
        <div className="hx-have">
          <div className="io-label">
            <GameIcon name="lock" size={11} /> Locked
          </div>
          <div className="dim small">{locked}</div>
        </div>
      ) : (
        <div className="hx-have">
          <div className="io-label">You have</div>
          <div className="hx-perks">
            {stationPerks(s, st.id).map((p) => (
              <span key={p} className="hx-perk">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
      {!locked && cost && next && (
        <div className={`hx-next ${affordable ? 'ready' : ''}`}>
          <div className="hx-next-head">
            <span className="io-label">Next · Level {lvl + 1}</span>
            <span className="grow" />
            <span className={`small ${affordable ? 'good' : 'dim'}`}>{affordable ? 'You can afford this' : `Short of ${short} material${short === 1 ? '' : 's'}`}</span>
          </div>
          <div className="hx-next-effect">{next.effect}</div>
          <div className="hx-next-buy">
            <HaveNeed cost={cost} have={s.account.bank} go={go} />
            <button data-tut={`upgrade-${st.id}`} className={`btn sm ${affordable ? 'primary' : ''}`} disabled={!affordable} title={affordable ? `Upgrade to level ${lvl + 1}` : 'Not enough materials'} onClick={() => game.act((g, ctx) => upgradeStation(g, ctx, st.id))}>
              Upgrade
            </button>
          </div>
        </div>
      )}
      <details className="hx-ladder">
        <summary>
          All {st.levels.length} levels <span className="dim">· hover a later one for its cost</span>
        </summary>
        <ol className="hx-tiers">
          {st.levels.map((tier, i) => {
            const state: TierState = locked || i > lvl ? 'later' : i < lvl ? 'done' : 'next';
            return <Tier key={i} n={i + 1} effect={tier.effect} cost={hideoutCost(s, tier.cost)} state={state} have={s.account.bank} />;
          })}
        </ol>
      </details>
      {st.id === 'quartermaster' && (
        <details className="quartermaster-station">
          <summary>Open loot filters</summary>
          <LootFilterManager s={s} />
        </details>
      )}
    </div>
  );
}

function StationLedger({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const classic = isClassic(s);
  const stations = STATIONS.filter((st) => !classic || (st.id !== 'forge' && st.id !== 'alchemy_table' && st.id !== 'rune_board'));
  const ready = stations.filter((st) => {
    const cost = nextUpgradeCost(s, st.id);
    return !stationLockReason(s, st.id) && !!cost && canAfford(s, cost);
  }).length;
  return (
    <Fold
      id="home-upgrades"
      title={
        <>
          Upgrades {ready > 0 && <Badge tone="success">{ready} ready</Badge>}
        </>
      }
      className="hx-stations-wrap"
    >
      <div className="dim small hx-stations-note">Stations and their unlocks {isSolo(s) ? "are this character's alone" : 'are shared by all your characters in this mode'}. Each card shows what the station gives you now and its next upgrade.</div>
      <div className="hx-stations">
        {stations.map((st) => (
          <StationCard key={st.id} st={st} go={go} />
        ))}
      </div>
    </Fold>
  );
}

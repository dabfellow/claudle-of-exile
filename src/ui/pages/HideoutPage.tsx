import { useMemo, type ReactNode } from 'react';
import { classDef } from '../../data/classes';
import { STATIONS, type StationDef, type StationId } from '../../data/hideout';
import { materialDef } from '../../data/materials';
import { actionDef, actionsFor, SKILLS, type SkillAction } from '../../data/skills';
import { canAfford } from '../../engine/bank';
import { skillSummary } from '../../engine/gems';
import { nextUpgradeCost, stationLevel, stationLockReason, stationPerks, upgradeStation } from '../../engine/hideout';
import { pointsLeft } from '../../engine/passives';
import { deriveStats } from '../../engine/stats';
import { cartographyOpen } from '../../engine/cartography';
import { SKILL_IDS, type GameState, type SkillId } from '../../engine/types';
import { levelOf, maxLevelOf, progressOf, xpToReach } from '../../engine/xp';
import { game, useGame } from '../../game';
import { Badge, Cost, fmt, GameIcon, MatIcon, ProgressBar, sceneStyle, Tooltip } from '../components/common';
import { openItemMenu } from '../components/ItemMenu';
import { materialSources } from '../components/materialSources';
import { PaperDoll } from '../components/PaperDoll';
import type { Page } from '../Layout';
import { Crest } from '../screens/Screens';

const STATION_ICON: Record<StationId, string> = {
  map_device: 'map',
  stash: 'stash',
  forge: 'forge',
  alchemy_table: 'alchemy',
  bench: 'bench',
  vendor: 'vendor',
  war_table: 'combat',
  watchtower: 'clock',
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
  return s.action?.kind === 'combat' ? 'combat' : null;
}

/** The Hideout is home: who you are and what you wear up top, where to go next, then the stations and skills. */
export function HideoutPage({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const training = trainingNow(s);
  return (
    <div className="page hideout">
      <div className="card hideout-scene hideout-hero" style={sceneStyle('scenes/hideout')}>
        <Embers />
        <CharacterBanner training={training === 'combat'} onClick={() => go('combat')} />
      </div>
      <div className="home-top">
        <StatsCard go={go} />
        <GearCard go={go} />
        <QuickNav go={go} />
      </div>
      <StationLedger go={go} />
      <SkillDials go={go} training={training} />
    </div>
  );
}

/** The character's own level, set apart from the trade skills. */
function CharacterBanner({ training, onClick }: { training: boolean; onClick: () => void }) {
  const s = useGame();
  const xp = s.skills.combat;
  const lvl = levelOf('combat', xp);
  const floor = xpToReach('combat', lvl);
  const span = xpToReach('combat', lvl + 1) - floor;
  const progress = progressOf('combat', xp);
  const c = classDef(s.character.classId);
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
    </button>
  );
}

function HomeCard({ title, onOpen, children, className = '' }: { title: string; onOpen?: () => void; children: ReactNode; className?: string }) {
  return (
    <div className={`card home-card ${className}`}>
      <div className="card-title">
        {title}
        <span className="grow" />
        {onOpen && (
          <button className="btn sm ghost" onClick={onOpen}>
            Open →
          </button>
        )}
      </div>
      {children}
    </div>
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
    <HomeCard title="Character" onOpen={() => go('equipment')}>
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
    </HomeCard>
  );
}

// ---------- gear ----------

/** The same paper doll as the Equipment page; a worn item opens its menu, empty slots and flasks open that page. */
function GearCard({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  return (
    <HomeCard title="Equipment" onOpen={() => go('equipment')} className="home-doll">
      <PaperDoll s={s} onItem={(_, it) => openItemMenu(it.uid)} onEmpty={() => go('equipment')} onFlask={() => go('equipment')} />
    </HomeCard>
  );
}

// ---------- where to go ----------

function QuickNav({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const points = pointsLeft(s);
  const loot = s.ground.length + s.offlineHaul.length;
  const links: { page: Page; label: string; icon: string; badge?: ReactNode }[] = [
    { page: 'stash', label: 'Stash', icon: 'stash', badge: <span className="nav-badge">{s.inventory.length}</span> },
    { page: 'vendor', label: 'Town', icon: 'vendor' },
    { page: 'equipment', label: 'Equipment', icon: 'equipment' },
    { page: 'bench', label: 'Crafting Bench', icon: 'bench' },
    { page: 'skills', label: 'Skills', icon: 'gems' },
    { page: 'tree', label: 'Passive Tree', icon: 'tree', badge: points > 0 ? <span className="nav-badge hot">+{points}</span> : undefined },
    { page: 'campaign', label: 'Campaign', icon: 'campaign' },
    { page: 'combat', label: 'Combat', icon: 'combat', badge: loot > 0 ? <span className="nav-badge loot">{loot}</span> : undefined },
  ];
  return (
    <HomeCard title="Go to" className="home-nav-card">
      <div className="home-nav">
        {links.map((l) => (
          <button key={l.page} className="home-nav-btn" onClick={() => go(l.page)}>
            <GameIcon name={l.icon} size={18} />
            <span>{l.label}</span>
            {l.badge}
          </button>
        ))}
      </div>
    </HomeCard>
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
function Tier({ n, effect, cost, state, have, children }: { n: number; effect: string; cost: Record<string, number>; state: TierState; have: Record<string, number>; children?: ReactNode }) {
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
        {children}
      </div>
    </li>
  );
}

function StationCard({ st, go }: { st: StationDef; go: (p: Page) => void }) {
  const s = useGame();
  const lvl = stationLevel(s, st.id);
  const locked = stationLockReason(s, st.id);
  const cost = nextUpgradeCost(s, st.id);
  const affordable = !locked && !!cost && canAfford(s, cost);
  const hasPage = !locked && st.page !== 'hideout';
  return (
    <div className={`card hx-station ${affordable ? 'ready' : ''} ${locked ? 'locked' : ''}`} style={{ ['--station' as string]: st.color }}>
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
        {!cost && <Badge tone="gold">Max</Badge>}
        {hasPage && (
          <button className="btn sm ghost" onClick={() => go(st.page as Page)}>
            Open →
          </button>
        )}
      </div>
      <div className="hx-have">
        <div className="io-label">{locked ? 'Locked' : 'You have'}</div>
        {locked ? (
          <div className="dim small">{locked}</div>
        ) : (
          <div className="hx-perks">
            {stationPerks(s, st.id).map((p) => (
              <span key={p} className="hx-perk">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>
      <ol className="hx-tiers">
        {st.levels.map((tier, i) => {
          const state: TierState = locked || i > lvl ? 'later' : i < lvl ? 'done' : 'next';
          return (
            <Tier key={i} n={i + 1} effect={tier.effect} cost={tier.cost} state={state} have={s.account.bank}>
              {state === 'next' && (
                <div className="hx-tier-buy">
                  <HaveNeed cost={tier.cost} have={s.account.bank} go={go} />
                  <button className={`btn sm ${affordable ? 'primary' : ''}`} disabled={!affordable} title={affordable ? `Upgrade to level ${lvl + 1}` : 'Not enough materials'} onClick={() => game.act((g, ctx) => upgradeStation(g, ctx, st.id))}>
                    Upgrade
                  </button>
                </div>
              )}
            </Tier>
          );
        })}
      </ol>
    </div>
  );
}

function StationLedger({ go }: { go: (p: Page) => void }) {
  return (
    <div className="hx-stations-wrap">
      <div className="dim small">Stations and their unlocks are shared by all your characters. Hover a later tier to see its cost.</div>
      <div className="hx-stations">
        {STATIONS.map((st) => (
          <StationCard key={st.id} st={st} go={go} />
        ))}
      </div>
    </div>
  );
}

// ---------- skills ----------

function SkillDials({ go, training }: { go: (p: Page) => void; training: SkillId | null }) {
  const s = useGame();
  return (
    <div className="card">
      <div className="hx-dials-wrap">
        {(['gathering', 'production'] as const).map((group) => (
          <div key={group} className="hx-dial-group">
            <div className="io-label">{group === 'gathering' ? 'Gathering' : 'Production'}</div>
            <div className="hx-dials">
              {SKILL_IDS.filter((id) => id !== 'combat' && SKILLS[id].group === group && (id !== 'cartography' || cartographyOpen(s))).map((id) => (
                <SkillDial key={id} id={id} s={s} running={training === id} go={go} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A ring with the level in the middle: one trade skill. */
function SkillDial({ id, s, running, go }: { id: SkillId; s: GameState; running: boolean; go: (p: Page) => void }) {
  const xp = s.skills[id];
  const lvl = levelOf(id, xp);
  const floor = xpToReach(id, lvl);
  const progress = progressOf(id, xp);
  const maxed = lvl >= maxLevelOf(id);
  const next = nextUnlock(id, lvl);
  const r = 26;
  const c = 2 * Math.PI * r;
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
      <button className={`hx-dial ${running ? 'running' : ''}`} style={{ ['--skill' as string]: color }} onClick={() => go(id)}>
        <svg viewBox="0 0 64 64" className="hx-dial-ring" aria-hidden>
          <circle cx="32" cy="32" r={r} className="hx-dial-track" />
          <circle cx="32" cy="32" r={r} className="hx-dial-fill" strokeDasharray={`${c * progress} ${c}`} transform="rotate(-90 32 32)" />
        </svg>
        <span className="hx-dial-center">
          <GameIcon name={id} size={16} color={color} />
          <b className="num">{lvl}</b>
        </span>
        <span className="hx-dial-name">{SKILLS[id].name}</span>
        <span className="hx-dial-next dim">{SKILLS[id].soon ? 'Coming soon' : next ? `${next.name} · ${next.level}` : 'All unlocked'}</span>
      </button>
    </Tooltip>
  );
}

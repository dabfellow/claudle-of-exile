import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { classDef } from '../data/classes';
import { CRAFT_STEP_MS } from '../data/hideout';
import { heistJob } from '../data/heist';
import { isMaterial, materialDef } from '../data/materials';
import { actionDef, SKILLS } from '../data/skills';
import { zoneDef } from '../data/zones';
import { queueSkill, retreat, useFlask } from '../engine/combat';
import { findItem } from '../engine/crafting';
import { methodName } from '../engine/craftUntil';
import { alarmChance, roomMs } from '../engine/heist';
import { ascendancyPointsLeft, canAscend, choiceWaiting } from '../engine/ascendancy';
import { pointsLeft } from '../engine/passives';
import { actionIntervalMs, stopAction } from '../engine/skills';
import { deriveStats } from '../engine/stats';
import type { GameState, SkillId } from '../engine/types';
import { characterLevel } from '../engine/character';
import { levelOf, maxLevelOf, progressOf, xpToReach } from '../engine/xp';
import type { GameEvent } from '../engine/types';
import { game, useGame, useGameEvent, type LootLine } from '../game';
import { activeGemDef, supportGemDef } from '../data/gems';
import { itemName } from '../engine/items';
import { GemIcon } from './components/GemView';
import { ItemIcon, ItemTip } from './components/ItemView';
import { SKILL_KEYS } from './pages/SkillGemsPage';
import { fmt, fmtTime, GameIcon, MatIcon, ProgressBar, Tooltip } from './components/common';
import { PinnedCurrencies } from './components/CurrencyPins';
import { RubbingsCard } from './components/ScholarsDesk';
import { DelveReplay, MineActivity } from './components/DelveView';
import { IngotRack } from './components/FurnaceView';
import { ForgeRack } from './components/AnvilView';
import { WoodRack } from './components/WoodBench';
import { GemTray } from './components/LapidaryBench';
import { SeedPackets } from './components/ForagingBench';
import { AwayVials } from './components/AlchemyBench';
import { AwayMaps } from './components/CartographyBoard';
import { clearArrivals } from '../engine/deciphering';
import { QuestTracker } from './components/QuestTracker';
import { ChallengeTag, Crest } from './screens/Screens';
import { APP_VERSION } from '../platform/errors';
import { isClassic } from '../engine/challenge';
import { MARKET_OPEN } from '../platform/market';
import { marketInNav } from './marketWindDown';
import { skillLock } from './skillLock';
import { fishingOpen } from '../engine/fishing';
import { stationLockReason } from '../engine/hideout';
import { greenhousePlotCount } from '../engine/foraging';
import { professionProgressLabel } from '../engine/professions';
import { ReportButton } from './components/ReportButton';

export type Page =
  | 'hideout'
  | 'combat'
  | 'campaign'
  | 'quests'
  | 'maps'
  | 'skills'
  | 'tree'
  | 'equipment'
  | 'guild-stash'
  | 'bench'
  | 'stash'
  | 'vendor'
  | 'market'
  | 'achievements'
  | 'settings'
  | 'admin'
  | 'upcoming'
  | 'greenhouse'
  | SkillId;

interface NavEntry {
  page: Page;
  label: string;
  icon: string;
  skill?: SkillId;
}

const NAV: { label: string; items: NavEntry[] }[] = [
  // Hideout on its own at the top, then one group per kind of thing you came to do
  {
    label: '',
    items: [{ page: 'hideout', label: 'Hideout', icon: 'home' }],
  },
  {
    label: 'Adventure',
    items: [
      { page: 'combat', label: 'Combat', icon: 'combat', skill: 'combat' },
      { page: 'campaign', label: 'World Map', icon: 'campaign' },
      { page: 'quests', label: 'Quests', icon: 'target' },
      { page: 'maps', label: 'Map Device', icon: 'map' },
      { page: 'vendor', label: 'Town', icon: 'vendor' },
      // closed for 1.0: listed only while you still have something on it (see marketWindDown)
      { page: 'market', label: MARKET_OPEN ? 'Player Market' : 'Market (closing)', icon: 'vendor' },
    ],
  },
  {
    label: 'Character',
    items: [
      { page: 'equipment', label: 'Inventory', icon: 'stash' },
      { page: 'guild-stash', label: 'Guild Stash', icon: 'stash' },
      { page: 'skills', label: 'Skills', icon: 'gems' },
      { page: 'tree', label: 'Passive Tree', icon: 'tree' },
    ],
  },
  {
    label: 'Gathering',
    items: [
      { page: 'mining', label: 'Mining', icon: 'mining', skill: 'mining' },
      { page: 'woodcutting', label: 'Woodcutting', icon: 'woodcutting', skill: 'woodcutting' },
      { page: 'harvesting', label: 'Foraging', icon: 'harvesting', skill: 'harvesting' },
      { page: 'thieving', label: 'Thieving', icon: 'thieving', skill: 'thieving' },
      { page: 'archaeology', label: 'Archaeology', icon: 'archaeology', skill: 'archaeology' },
      { page: 'astrology', label: 'Astrology', icon: 'astrology', skill: 'astrology' },
      { page: 'fishing', label: 'Fishing', icon: 'fishing', skill: 'fishing' },
    ],
  },
  {
    // Production: anything that needs setup or waiting. Gathering above is set-and-forget.
    label: 'Production',
    items: [
      { page: 'greenhouse', label: 'Greenhouse', icon: 'harvesting' },
      { page: 'smelting', label: 'Smelting', icon: 'smelting', skill: 'smelting' },
      { page: 'smithing', label: 'Forging', icon: 'smithing', skill: 'smithing' },
      { page: 'sawmilling', label: 'Sawmilling', icon: 'sawmilling', skill: 'sawmilling' },
      { page: 'woodcrafting', label: 'Woodcrafting', icon: 'woodcrafting', skill: 'woodcrafting' },
      { page: 'tailoring', label: 'Tailoring', icon: 'tailoring', skill: 'tailoring' },
      { page: 'alchemy', label: 'Alchemy', icon: 'alchemy', skill: 'alchemy' },
      { page: 'gemcutting', label: 'Gemcutting', icon: 'gemcutting', skill: 'gemcutting' },
      { page: 'cartography', label: 'Cartography', icon: 'cartography', skill: 'cartography' },
    ],
  },
  {
    label: 'Progress',
    items: [
      { page: 'achievements', label: 'Achievements', icon: 'trophy' },
      { page: 'upcoming', label: 'Coming soon', icon: 'lock' },
    ],
  },
];

function activeSkill(s: GameState): SkillId | null {
  if (s.action?.kind === 'project') return s.professionProgress.activeProject?.project.skill ?? null;
  if (s.action?.kind === 'skill') return actionDef(s.action.actionId).skill;
  if (s.action?.kind === 'combat') return 'combat';
  if (s.action?.kind === 'heist') return 'thieving';
  return null;
}

function Ring({ value, color }: { value: number; color: string }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg className="nav-ring" viewBox="0 0 34 34">
      <circle cx="17" cy="17" r={r} fill="none" stroke={color} strokeWidth="2" strokeDasharray={`${c * value} ${c}`} transform="rotate(-90 17 17)" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

export function Sidebar({ page, go }: { page: Page; go: (p: Page) => void }) {
  const s = useGame();
  const active = activeSkill(s);
  const now = Date.now();
  const harvestReady = s.foraging.plots.some((plot) => plot && plot.readyAt <= now);
  const points = pointsLeft(s) + (choiceWaiting(s) ? 1 : canAscend(s) ? Math.max(0, ascendancyPointsLeft(s)) : 0);
  return (
    <nav className="sidebar">
      <div className="brand">
        <span className="brand-title">Path of Idle</span>
        <span className="brand-sub">an idle exile's tale</span>
        <span className="brand-version">v{APP_VERSION}</span>
      </div>
      {NAV.filter((g) => !isClassic(s) || (g.label !== 'Gathering' && g.label !== 'Production')).map((g) => (
        <div className={`nav-group ${g.label ? '' : 'unlabelled'}`} key={g.label || 'top'}>
          {g.label && <div className="nav-label">{g.label}</div>}
          {g.items.filter((it) => it.page !== 'market' || marketInNav(s)).map((it) => {
            const lvl = it.skill ? levelOf(it.skill, s.skills[it.skill]) : null;
            const skillRequirement = it.skill && it.skill !== 'combat' ? skillLock(s, it.skill) : null;
            const lockReason = it.page === 'maps'
              ? stationLockReason(s, 'map_device')
              : it.page === 'greenhouse'
                ? greenhousePlotCount(s) === 0 && 'Unlocks at Foraging level 5'
                : skillRequirement && `Unlocks at ${skillRequirement}`;
            const isActive = it.skill && it.skill === active;
            const color = it.skill ? SKILLS[it.skill].color : 'var(--muted)';
            return (
              <button key={it.page} data-tut={`nav-${it.page}`} className={`nav-item ${page === it.page ? 'active' : ''}`} onClick={() => go(it.page)}>
                <span className="nav-icon">
                  <GameIcon name={it.icon} size={16} color={isActive ? color : undefined} />
                  {isActive && it.skill && <Ring value={progressOf(it.skill, s.skills[it.skill])} color={color} />}
                </span>
                <span className="nav-name">{it.label}</span>
                {isActive && <span className="nav-active-dot" />}
                {it.skill === 'fishing' && fishingOpen(s) ? null : it.skill && SKILLS[it.skill].soon ? (
                  <span className="nav-badge">Soon</span>
                ) : lockReason ? (
                  <span className="nav-badge" title={lockReason} aria-label={lockReason}>
                    <GameIcon name="lock" size={10} />
                  </span>
                ) : (
                  lvl !== null && <span className="nav-badge">{lvl}</span>
                )}
                {it.page === 'tree' && points > 0 && <span className="nav-badge hot">+{points}</span>}
                {it.page === 'equipment' && <span className="nav-badge" title="Items in your inventory">{s.inventory.length}</span>}
                {it.page === 'combat' && s.ground.length + s.offlineHaul.length > 0 && <span className="nav-badge loot" title="Loot waiting to be picked up">{s.ground.length + s.offlineHaul.length}</span>}
                {it.page === 'greenhouse' && harvestReady && (
                  <span className="nav-badge hot" role="img" title="Greenhouse plants ready to harvest" aria-label="Greenhouse plants ready to harvest">!</span>
                )}
                {it.page === 'achievements' && <span className="nav-badge">{s.achievements.length}</span>}
              </button>
            );
          })}
        </div>
      ))}
      <div className="sidebar-foot">
        <div className="char-foot">
          <Crest classId={s.character.classId} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="char-foot-name">{s.character.name}</div>
            <div className="dim small">
              Lv {characterLevel(s)} {classDef(s.character.classId).name}
            </div>
            <ChallengeTag challenge={s.character.challenge} />
          </div>
          <button className="btn ghost sm" title="Switch character" onClick={() => game.exit()}>
            Switch
          </button>
        </div>
        <button className="nav-item nav-switch-mobile" title="Switch character" onClick={() => game.exit()}>
          <span className="nav-icon">
            <Crest classId={s.character.classId} size={22} />
          </span>
          <span className="nav-name">Switch character</span>
        </button>
        <a className="nav-item" href="/path-of-idle/wiki/" target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
          <span className="nav-icon">
            <GameIcon name="book" size={16} />
          </span>
          <span className="nav-name">Wiki</span>
        </a>
        <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => go('settings')}>
          <span className="nav-icon">
            <GameIcon name="settings" size={16} />
          </span>
          <span className="nav-name">Settings</span>
        </button>
        <ReportButton page={page} />
        {game.isAdmin && (
          <button className={`nav-item ${page === 'admin' ? 'active' : ''}`} onClick={() => go('admin')}>
            <span className="nav-icon">
              <GameIcon name="lock" size={16} />
            </span>
            <span className="nav-name">Admin</span>
          </button>
        )}
        {/* phones hide the brand block, so the version (which tells you a refresh picked up the new build) goes here */}
        <span className="nav-version-mobile">v{APP_VERSION}</span>
      </div>
    </nav>
  );
}

export function TopBar({ go }: { go: (p: Page) => void }) {
  const s = useGame();
  const d = deriveStats(s);
  let title = 'Idle in the hideout';
  let sub = 'Pick an activity to begin';
  let progress = 0;
  let color = 'var(--dim)';
  let target: Page = 'hideout';

  if (s.action?.kind === 'skill') {
    const a = actionDef(s.action.actionId);
    const sk = SKILLS[a.skill];
    const interval = actionIntervalMs(s, a, d);
    title = `${sk.verb}: ${a.name}`;
    sub = `${fmtTime(interval - s.action.progress)} left`;
    progress = s.action.progress / interval;
    color = sk.color;
    target = a.skill;
  } else if (s.action?.kind === 'project' && s.professionProgress.activeProject) {
    const run = s.professionProgress.activeProject;
    title = `Project: ${run.project.name}`;
    sub = run.stopReason ?? `${fmtTime(run.project.durationMs - run.elapsedMs)} base work left`;
    progress = run.elapsedMs / run.project.durationMs;
    target = run.project.skill;
    color = SKILLS[run.project.skill].color;
  } else if (s.action?.kind === 'craft') {
    const item = findItem(s, s.action.uid);
    title = `Crafting: ${item ? itemName(item) : 'item'}`;
    sub = `${methodName(s.action.method)} · ${s.action.steps} step${s.action.steps === 1 ? '' : 's'}`;
    progress = s.action.progress / CRAFT_STEP_MS;
    color = 'var(--currency)';
    target = 'bench';
  } else if (s.action?.kind === 'heist') {
    const job = heistJob(s.action.jobId);
    title = `Heist: ${job.name}`;
    sub = `Room ${s.action.room} of ${s.action.lastRoom} · ${Math.round(alarmChance(s, job, s.action.room) * 100)}% alarm`;
    progress = s.action.progress / roomMs(s, job, d);
    color = SKILLS.thieving.color;
    target = 'thieving';
  } else if (s.action?.kind === 'combat' && s.combat) {
    const z = zoneDef(s.combat.zoneId);
    const pack = s.combat.monsters;
    const alive = pack.filter((m) => m.life > 0);
    const total = pack.reduce((a, m) => a + m.maxLife, 0);
    const left = alive.reduce((a, m) => a + Math.max(0, m.life), 0);
    title = `Fighting in ${z.name}`;
    sub = alive.length ? (alive.length === 1 ? alive[0].name : `${alive.length} enemies`) : 'Searching…';
    progress = total ? 1 - left / total : 0;
    color = 'var(--life)';
    target = 'combat';
  }

  return (
    <header className="topbar">
      <div className={`activity ${s.action ? 'on' : ''}`} role="button" tabIndex={0} onClick={() => go(target)} onKeyDown={(e) => e.key === 'Enter' && go(target)}>
        <span className="nav-icon" style={{ width: 36, height: 36 }}>
          <GameIcon name={target === 'hideout' ? 'home' : target} size={18} color={color} />
        </span>
        <div className="activity-text">
          <div className="activity-title">
            {title}
            <small>{sub}</small>
          </div>
          <ProgressBar value={progress} color={color} />
        </div>
        {s.action && (
          <button
            className="btn sm ghost"
            onClick={(e) => {
              e.stopPropagation();
              game.act((st) => (st.action?.kind === 'combat' ? retreat(st) : stopAction(st)));
            }}
          >
            Stop
          </button>
        )}
      </div>
      <div className="char-plate">
        <Crest classId={s.character.classId} size={38} />
        <div className="char-plate-body">
          <div className="char-plate-name">
            <b>{s.character.name}</b>
            <span className="dim">
              Lv {characterLevel(s)} {classDef(s.character.classId).name}
            </span>
          </div>
          <div className="topbar-life">
            {d.maxEs > 0 && (
              <span title={`Energy Shield ${fmt(s.es)} / ${fmt(d.maxEs)}`}>
                <ProgressBar value={s.es / d.maxEs} color="linear-gradient(90deg, var(--es), var(--es-2))" className="thin" />
              </span>
            )}
            <span title="Life">
              <ProgressBar value={s.life / d.maxLife} color="linear-gradient(90deg, var(--life), var(--life-2))" size="md" label={`${fmt(s.life)} / ${fmt(d.maxLife)}`} />
            </span>
            <span title={`Mana ${fmt(s.mana)} / ${fmt(d.maxMana)}`}>
              <ProgressBar value={d.maxMana ? s.mana / d.maxMana : 0} color="linear-gradient(90deg, var(--mana), var(--mana-2))" className="thin" />
            </span>
          </div>
        </div>
      </div>
      {/* only what you pinned from the Stash's Currency tab; the box stays so the character plate keeps the middle */}
      <div className="topbar-pins">
        <PinnedCurrencies s={s} />
      </div>
    </header>
  );
}

/** The always-on character XP bar, plus a slim bar for whatever skill is training. */
export function XpBar() {
  const s = useGame();
  const lvl = characterLevel(s);
  const xp = s.skills.combat;
  const floor = xpToReach('combat', lvl);
  const next = xpToReach('combat', lvl + 1);
  const pct = progressOf('combat', xp);
  const rate = game.xpPerHour('combat');
  const training = s.action?.kind === 'skill' ? actionDef(s.action.actionId).skill : s.action?.kind === 'heist' ? 'thieving' : s.action?.kind === 'project' ? s.professionProgress.activeProject?.project.skill ?? null : null;
  const [pops, setPops] = useState<{ id: number; text: string; x: number }[]>([]);
  const [pulse, setPulse] = useState(0);
  const [levelUp, setLevelUp] = useState(0);

  const onEvent = useCallback((e: GameEvent) => {
    if (e.t === 'xp' && e.skill === 'combat' && e.amount >= 1) {
      const id = Math.random();
      setPops((p) => [...p.slice(-4), { id, text: `+${Math.round(e.amount)} XP`, x: 20 + Math.random() * 60 }]);
      setPulse((n) => n + 1);
      setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1200);
    }
    if (e.t === 'levelup' && e.skill === 'combat') setLevelUp((n) => n + 1);
  }, []);
  useGameEvent(onEvent);

  return (
    <footer className="xpbar">
      {levelUp > 0 && <div key={levelUp} className="xp-levelup" />}
      <span className="xp-level">Level {lvl}</span>
      <div className={`xp-track ${pulse ? (pulse % 2 ? 'gain-a' : 'gain-b') : ''}`} title={`${fmt(xp - floor)} / ${fmt(next - floor)} XP to level ${lvl + 1}`}>
        <div className="xp-fill" style={{ width: `${pct * 100}%` }} />
        <div className="xp-ticks" />
        <div className="xp-label">
          {(pct * 100).toFixed(1)}% · {fmt(xp - floor)} / {fmt(next - floor)} XP
        </div>
      </div>
      {pops.map((p) => (
        <span key={p.id} className="xp-pop" style={{ left: `${p.x}%` }}>
          {p.text}
        </span>
      ))}
      <span className="xp-rate">{rate > 0 ? `${fmt(rate)} XP/h` : 'idle'}</span>
      {training && (
        <div className="xp-skill" title={`${SKILLS[training].name} ${(progressOf(training, s.skills[training]) * 100).toFixed(1)}%`}>
          <GameIcon name={training} size={14} color={SKILLS[training].color} />
          <span>
            {SKILLS[training].name} {levelOf(training, s.skills[training])}
          </span>
          <ProgressBar value={progressOf(training, s.skills[training])} color={SKILLS[training].color} />
          <span className="num">{fmt(game.xpPerHour(training))}/h</span>
        </div>
      )}
    </footer>
  );
}

function ago(at: number, now: number): string {
  const s = Math.round((now - at) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

type FeedTab = 'activity' | 'combat' | 'loot';

function LootRow({ l }: { l: LootLine }) {
  const s = game.state;
  if (l.item) {
    return (
      <Tooltip content={<ItemTip item={l.item} state={s} />}>
        <li className={`feed-item loot rar-${l.item.rarity} ${l.item.rarity}`} style={{ opacity: l.salvaged ? 0.5 : 1 }}>
          <ItemIcon item={l.item} size={14} />
          <span style={{ color: 'var(--rar)' }}>{itemName(l.item)}</span>
          {l.salvaged && <span className="dim"> · salvaged</span>}
        </li>
      </Tooltip>
    );
  }
  if (l.gemId) {
    const def = activeGemDef(l.gemId);
    return (
      <li className="feed-item loot magic">
        <GemIcon def={def} size={16} /> {def.name} <span className="dim">· skill gem</span>
      </li>
    );
  }
  if (l.supportId) {
    const def = supportGemDef(l.supportId);
    return (
      <li className="feed-item loot magic">
        <GemIcon def={def} size={14} support /> {def.name} <span className="dim">· support</span>
      </li>
    );
  }
  // a drop this build has no name for must not take the whole game down with it
  if (!isMaterial(l.currencyId!)) return <li className="feed-item loot">{l.currencyId}</li>;
  return (
    <li className="feed-item loot">
      <MatIcon id={l.currencyId!} size={13} /> <span style={{ color: 'var(--currency)' }}>{materialDef(l.currencyId!).name}</span>
    </li>
  );
}

export function Feed() {
  const s = useGame();
  const [tab, setTab] = useState<FeedTab>(() => {
    try {
      return (localStorage.getItem('coe-feed-tab') as FeedTab) || 'activity';
    } catch {
      return 'activity';
    }
  });
  const pick = (t: FeedTab) => {
    setTab(t);
    try {
      localStorage.setItem('coe-feed-tab', t);
    } catch {
      /* ignore */
    }
  };
  const now = Date.now();
  return (
    <aside className="feed">
      <QuestTracker />
      <div className="feed-tabs">
        {(['activity', 'combat', 'loot'] as FeedTab[]).map((t) => (
          <button key={t} className={`feed-tab ${tab === t ? 'active' : ''}`} onClick={() => pick(t)}>
            {t === 'activity' ? 'Activity' : t === 'combat' ? 'Combat log' : 'Loot'}
          </button>
        ))}
      </div>
      <ul className="feed-list">
        {tab === 'activity' && (
          <>
            <MineActivity delve={s.delve} />
            {game.feed.length === 0 && s.delve.log.length === 0 && s.delve.replay.length === 0 && (
              <li className="dim feed-empty">Level-ups, notable drops and events appear here.</li>
            )}
            {game.feed.map((f, i) => (
              <li key={f.id} className={`feed-item ${f.tone}`} style={{ opacity: Math.max(0.35, 1 - i * 0.04) }}>
                {f.text}
                <time>{ago(f.at, now)}</time>
              </li>
            ))}
          </>
        )}
        {tab === 'combat' && (
          <>
            {game.combatLog.length === 0 && <li className="dim feed-empty">Kills, boss wind-ups, interrupts and flasks appear here.</li>}
            {game.combatLog.map((l, i) => (
              <li key={l.id} className={`feed-item compact ${l.tone}`} style={{ opacity: Math.max(0.4, 1 - i * 0.02) }}>
                {l.text}
              </li>
            ))}
          </>
        )}
        {tab === 'loot' && (
          <>
            {game.lootLog.length === 0 && <li className="dim feed-empty">Everything you pick up appears here.</li>}
            {game.lootLog.map((l) => (
              <LootRow key={l.id} l={l} />
            ))}
          </>
        )}
      </ul>
    </aside>
  );
}

/** Level-ups, unlocks and warnings, tucked in a corner (the top of a phone screen). Click one to clear it. */
export function Toasts() {
  useGame();
  return (
    <div className="toasts" aria-live="polite">
      {game.toasts.map((t) => (
        <button key={t.id} type="button" className={`toast ${t.tone}`} title="Dismiss" onClick={() => game.dismissToast(t.id)}>
          <span className="toast-text">{t.text}</span>
          <span className="toast-x" aria-hidden>
            ×
          </span>
        </button>
      ))}
    </div>
  );
}

/** "12 hours", "1 hour 20 minutes", "5 minutes" */
function awayLabel(ms: number): string {
  const m = Math.floor(ms / 60_000);
  const h = Math.floor(m / 60);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  if (h === 0) return plural(m, 'minute');
  return m % 60 ? `${plural(h, 'hour')} ${plural(m % 60, 'minute')}` : plural(h, 'hour');
}

/** While a long absence is simulated in slices: how far it's got. Nothing can be changed until it's done. */
function CatchUp({ progress }: { progress: number }) {
  return (
    <div className="modal-backdrop catch-up">
      <div className="card modal away" role="status" aria-live="polite">
        <div className="away-head">
          <div className="away-kicker">The Exile Returns</div>
          <h2>Catching up on your time away</h2>
          <div className="muted">Playing out everything that happened while you were gone…</div>
        </div>
        <ProgressBar value={progress} size="md" color="var(--accent)" label={`${Math.floor(progress * 100)}%`} />
      </div>
    </div>
  );
}

export function OfflineModal({ onOpenDesk }: { onOpenDesk?: () => void }) {
  const state = useGame();
  const catchUp = useSyncExternalStore(game.subscribeCatchUp, () => game.catchUpProgress());
  if (catchUp !== null) return <CatchUp progress={catchUp} />;
  const sum = game.offline;
  if (!sum) return null;
  const xp = Object.entries(sum.xp).filter(([, n]) => (n ?? 0) > 0) as [SkillId, number][];
  // gold first, then everything else gained; materials spent crafting aren't spoils
  const mats = Object.entries(sum.materials)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => (a === 'gold' ? -1 : b === 'gold' ? 1 : 0));
  const fought = sum.kills > 0 || sum.died;
  const spoils = mats.length > 0 || sum.items > 0 || sum.gems > 0 || (sum.hiddenItems ?? 0) > 0;
  return (
    <div className="modal-backdrop" onClick={() => game.dismissOffline()}>
      <div className="card modal away" onClick={(e) => e.stopPropagation()}>
        <div className="away-head">
          <div className="away-kicker">The Exile Returns</div>
          <h2>While You Were Away</h2>
          <div className="muted">{awayLabel(sum.ms)} of adventure</div>
        </div>

        <DelveReplay />
        <IngotRack outputs={sum.smeltingOutputs ?? {}} />
        <ForgeRack />
        <WoodRack />
        <GemTray />
        <SeedPackets />
        <AwayVials />
        <AwayMaps />

        {xp.map(([sk, gained]) => {
          const total = game.state.skills[sk] ?? 0;
          const lvl = levelOf(sk, total);
          const pct = progressOf(sk, total);
          const maxed = lvl >= maxLevelOf(sk);
          return (
            <div key={sk} className="away-xp">
              <div className="row">
                <b>{sk === 'combat' ? 'Experience Gained' : `${SKILLS[sk].name} Experience`}</b>
                <span className="spacer" />
                <b className="good num">+{fmt(gained)} XP</b>
              </div>
              <div className="away-track">
                <div className="away-fill" style={{ width: `${pct * 100}%`, background: sk === 'combat' ? undefined : SKILLS[sk].color }} />
              </div>
              <div className="row away-sub">
                <span>
                  Level {lvl}
                  {sum.levels[sk] && <span className="good"> — level up!</span>}
                </span>
                <span className="spacer" />
                <span>{maxed ? 'Max level' : `${Math.floor(pct * 100)}% to Level ${lvl + 1}`}</span>
              </div>
            </div>
          );
        })}

        {fought && (
          <div className="away-stats">
            <div className="away-stat">
              <GameIcon name="combat" size={18} color="var(--accent)" />
              <b className="num">{fmt(sum.kills)}</b>
              <span>Monsters Slain</span>
            </div>
            <div className="away-stat">
              <GameIcon name="skull" size={18} color="var(--bad)" />
              <b className="num">{sum.died ? 1 : 0}</b>
              <span>Deaths</span>
            </div>
          </div>
        )}

        {spoils && (
          <>
            <div className="away-divider" />
            <div className="away-section">{fought ? 'Spoils of Battle' : 'Net storage gains'}</div>
            <div className="away-spoils">
              {mats.map(([id, n]) => (
                <div key={id} className="away-spoil">
                  <MatIcon id={id} size={18} />
                  <b className="num">+{fmt(n)}</b>
                  <span>{materialDef(id).name}</span>
                </div>
              ))}
              {sum.items > 0 && (
                <div className="away-spoil">
                  <GameIcon name="stash" size={20} color="var(--accent)" />
                  <b className="num">{sum.items}</b>
                  <span>Items Found</span>
                  <span className="dim small">in your bag or waiting on the Combat page</span>
                </div>
              )}
              {(sum.hiddenItems ?? 0) > 0 && (
                <div className="away-spoil">
                  <GameIcon name="stash" size={20} color="var(--dim)" />
                  <b className="num">{sum.hiddenItems}</b>
                  <span>Hidden</span>
                  <span className="dim small">by your loot filter, not kept</span>
                </div>
              )}
              {sum.gems > 0 && (
                <div className="away-spoil">
                  <GameIcon name="gemcutting" size={20} color="var(--magic)" />
                  <b className="num">{sum.gems}</b>
                  <span>Gems Found</span>
                </div>
              )}
            </div>
          </>
        )}

        {(sum.observations?.length ?? 0) > 0 && <div className="away-alert">
          <b>Observation log</b>
          {sum.observations!.map((o, i) => <p key={i}>{o.bold ? <b>{o.text}</b> : o.text}</p>)}
        </div>}
        {Object.keys(sum.masteryProcs ?? {}).length > 0 && <div className="away-alert">
          <b>Thematic Mastery Triggers</b>
          {Object.entries(sum.masteryProcs ?? {}).map(([name, count]) => <p key={name}>✦ {name}: {count} trigger{count === 1 ? '' : 's'}</p>)}
        </div>}
        {Object.keys(sum.ordinaryOutput ?? {}).length > 0 && <div className="away-alert">
          <b>Ordinary production · before spending</b>
          {Object.entries(sum.ordinaryOutput ?? {}).map(([id, n]) => <p key={id}>{id.replaceAll('_', ' ')}: +{fmt(n)}</p>)}
        </div>}
        {Object.keys(sum.protectedProgress ?? {}).length > 0 && <div className="away-alert">
          <b>Protected progress</b>
          {Object.entries(sum.protectedProgress ?? {}).map(([id, n]) => <p key={id}>{materialDef(id).name}: +{fmt(n)}</p>)}
        </div>}
        {(sum.discoveries?.length ?? 0) > 0 && <div className="away-alert"><b>Discoveries</b><p>{sum.discoveries!.map(professionProgressLabel).join(', ')}</p></div>}
        {Object.keys(sum.projects ?? {}).length > 0 && <div className="away-alert"><b>Completed projects</b>{Object.entries(sum.projects ?? {}).map(([id, n]) => <p key={id}>{professionProgressLabel(id)} ×{n}</p>)}</div>}
        {Object.keys(sum.projectWork ?? {}).length > 0 && <div className="away-alert"><b>Project work</b>{Object.entries(sum.projectWork ?? {}).map(([id, n]) => <p key={id}>{professionProgressLabel(id)}: {Math.round(n / 1000)}s base work</p>)}</div>}
        {Object.values(sum.materials).some((n) => n < 0) && <div className="away-alert"><b>Net materials spent</b>{Object.entries(sum.materials).filter(([, n]) => n < 0).map(([id, n]) => <p key={id}>{materialDef(id).name}: {fmt(n)}</p>)}</div>}
        {sum.died && (
          <div className="away-alert bad">
            <div className="row">
              <GameIcon name="skull" size={16} />
              <b>Slain in Combat</b>
            </div>
            <p>
              You fell {(sum.diedAfterMs ?? 0) < 60_000 ? 'moments' : awayLabel(sum.diedAfterMs ?? 0)} after leaving and returned to the hideout. Combat stopped there until you came back.
            </p>
          </div>
        )}
        {sum.stoppedReason && (
          <div className="away-alert warn">
            <div className="row">
              <GameIcon name="clock" size={16} />
              <b>Work Halted</b>
            </div>
            <p>{sum.stoppedReason}</p>
          </div>
        )}
        {sum.bossWaiting && (
          <div className="away-alert warn">
            <div className="row">
              <GameIcon name="forge" size={16} />
              <b>An Unfinished Battle</b>
            </div>
            <p>{sum.bossWaiting} awaits. Challenge it on the Combat page. Bosses can only be fought while you're away with Auto-challenge on and wind-up rules from the War Table.</p>
          </div>
        )}
        {sum.mapRuns > 0 && (
          <div className="away-alert">
            <div className="row">
              <GameIcon name="map" size={16} />
              <b>Maps Cleared</b>
            </div>
            <p>{sum.mapRuns} map run{sum.mapRuns === 1 ? '' : 's'} finished, {sum.mapsFound} new map{sum.mapsFound === 1 ? '' : 's'} found.</p>
          </div>
        )}
        {sum.mapsDrawn > 0 && (
          <div className="away-alert">
            <div className="row">
              <GameIcon name="cartography" size={16} />
              <b>Maps Drawn</b>
            </div>
            <p>{sum.mapsDrawn} map{sum.mapsDrawn === 1 ? '' : 's'} drawn and put in the case.</p>
          </div>
        )}
        {sum.heists > 0 && (
          <div className="away-alert">
            <div className="row">
              <GameIcon name="thieving" size={16} />
              <b>Heists Run</b>
            </div>
            <p>{sum.heists} job{sum.heists === 1 ? '' : 's'} done{sum.heistAlarms ? `, ${sum.heistAlarms} of them cut short by an alarm` : ', every one clean'}.</p>
          </div>
        )}
        {Object.keys(sum.mastery).length > 0 && (
          <div className="away-alert">
            <div className="row">
              <GameIcon name="tree" size={16} />
              <b>Mastery Practice</b>
            </div>
            <p>{Math.round(Object.values(sum.mastery).reduce((total, seconds) => total + seconds, 0) / 60)} minutes of nominal work across {Object.keys(sum.mastery).length} master{Object.keys(sum.mastery).length === 1 ? 'y' : 'ies'}.</p>
          </div>
        )}
        {(sum.finds > 0 || sum.traded > 0) && (
          <div className="away-alert">
            <div className="row">
              <GameIcon name="archaeology" size={16} />
              <b>Expedition</b>
            </div>
            <p>
              {sum.finds > 0 && `${sum.finds} new find${sum.finds === 1 ? '' : 's'} in the Logbook. `}
              {sum.traded > 0 && `${sum.traded} purchase${sum.traded === 1 ? '' : 's'} on standing orders.`}
            </p>
          </div>
        )}
        <RubbingsCard s={state} openLabel="Open the desk" onOpen={() => { game.act((st) => clearArrivals(st)); game.dismissOffline(); onOpenDesk?.(); }} />
        {sum.crafted && (
          <div className="away-alert">
            <div className="row">
              <GameIcon name="bench" size={16} />
              <b>Craft Complete</b>
            </div>
            <p>{sum.crafted}</p>
          </div>
        )}

        <button className="btn primary away-continue" onClick={() => game.dismissOffline()}>
          Continue Adventure →
        </button>
      </div>
    </div>
  );
}

/** Number keys 1-5 drink flasks while in combat. */
/** Keys 1–4 drink flasks (1 Life, 1 Mana, 2 Utility) and Q–Y cast skill-bar slots while in combat. */
export function useFlaskHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey || !game.state.combat) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4) {
        if (!game.state.flaskSlots[n - 1]) return;
        const err = game.act((s, ctx) => useFlask(s, ctx, n - 1));
        if (!err) e.preventDefault();
        return;
      }
      const slot = SKILL_KEYS.indexOf(e.key.toUpperCase());
      if (slot >= 0 && game.state.skillBar[slot]) {
        game.act((s) => queueSkill(s, slot));
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/** The Hideout is home: every time a character loads, you start there. */
export function usePage(): [Page, (p: Page) => void] {
  const [page, setPage] = useState<Page>('hideout');
  return [page, setPage];
}


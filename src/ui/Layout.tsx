import { useCallback, useEffect, useState } from 'react';
import { classDef } from '../data/classes';
import { materialDef } from '../data/materials';
import { actionDef, SKILLS } from '../data/skills';
import { zoneDef } from '../data/zones';
import { queueSkill, retreat, useFlask } from '../engine/combat';
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
import { CurrencyAmount, fmt, fmtTime, MatIcon, ProgressBar, Tooltip } from './components/common';
import { Icon } from './components/Icon';
import { QuestTracker } from './components/QuestTracker';
import { Crest } from './screens/Screens';

export type Page =
  | 'hideout'
  | 'combat'
  | 'campaign'
  | 'skills'
  | 'tree'
  | 'equipment'
  | 'bench'
  | 'stash'
  | 'vendor'
  | 'achievements'
  | 'settings'
  | SkillId;

interface NavEntry {
  page: Page;
  label: string;
  icon: string;
  skill?: SkillId;
}

const NAV: { label: string; items: NavEntry[] }[] = [
  {
    label: 'Town',
    items: [
      { page: 'hideout', label: 'Hideout', icon: 'home' },
      { page: 'vendor', label: "Trader's Stall", icon: 'vendor' },
      { page: 'stash', label: 'Stash', icon: 'stash' },
      { page: 'achievements', label: 'Achievements', icon: 'trophy' },
    ],
  },
  {
    label: 'Character',
    items: [
      { page: 'campaign', label: 'Campaign', icon: 'map' },
      { page: 'combat', label: 'Combat', icon: 'combat', skill: 'combat' },
      { page: 'skills', label: 'Skills', icon: 'bolt' },
      { page: 'equipment', label: 'Equipment', icon: 'equipment' },
      { page: 'tree', label: 'Passive Tree', icon: 'tree' },
      { page: 'bench', label: 'Crafting Bench', icon: 'bench' },
    ],
  },
  {
    label: 'Gathering',
    items: [
      { page: 'mining', label: 'Mining', icon: 'mining', skill: 'mining' },
      { page: 'woodcutting', label: 'Woodcutting', icon: 'woodcutting', skill: 'woodcutting' },
      { page: 'harvesting', label: 'Harvesting', icon: 'harvesting', skill: 'harvesting' },
    ],
  },
  {
    label: 'Production',
    items: [
      { page: 'smithing', label: 'Smithing', icon: 'smithing', skill: 'smithing' },
      { page: 'alchemy', label: 'Alchemy', icon: 'alchemy', skill: 'alchemy' },
      { page: 'gemcutting', label: 'Gemcutting', icon: 'gemcutting', skill: 'gemcutting' },
    ],
  },
];

function activeSkill(s: GameState): SkillId | null {
  if (s.action?.kind === 'skill') return actionDef(s.action.actionId).skill;
  if (s.action?.kind === 'combat') return 'combat';
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
  const points = pointsLeft(s);
  return (
    <nav className="sidebar">
      <div className="brand">
        <span className="brand-title">Path of Idle</span>
        <span className="brand-sub">an idle exile's tale</span>
      </div>
      {NAV.map((g) => (
        <div className="nav-group" key={g.label}>
          <div className="nav-label">{g.label}</div>
          {g.items.map((it) => {
            const lvl = it.skill ? levelOf(it.skill, s.skills[it.skill]) : null;
            const isActive = it.skill && it.skill === active;
            const color = it.skill ? SKILLS[it.skill].color : 'var(--muted)';
            return (
              <button key={it.page} data-tut={`nav-${it.page}`} className={`nav-item ${page === it.page ? 'active' : ''}`} onClick={() => go(it.page)}>
                <span className="nav-icon">
                  <Icon name={it.icon} size={16} color={isActive ? color : undefined} />
                  {isActive && it.skill && <Ring value={progressOf(it.skill, s.skills[it.skill])} color={color} />}
                </span>
                <span className="nav-name">{it.label}</span>
                {isActive && <span className="nav-active-dot" />}
                {lvl !== null && <span className="nav-badge">{lvl}</span>}
                {it.page === 'tree' && points > 0 && <span className="nav-badge hot">+{points}</span>}
                {it.page === 'stash' && <span className="nav-badge">{s.inventory.length}</span>}
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
          </div>
          <button className="btn ghost sm" title="Switch character" onClick={() => game.exit()}>
            Switch
          </button>
        </div>
        <button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => go('settings')}>
          <span className="nav-icon">
            <Icon name="settings" size={16} />
          </span>
          <span className="nav-name">Settings</span>
        </button>
      </div>
    </nav>
  );
}

const STRIP = ['gold', 'chaos', 'exalted', 'divine'];

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
          <Icon name={target === 'hideout' ? 'home' : target} size={18} color={color} />
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
      <div className="topbar-life">
        <span title="Life">
          <ProgressBar value={s.life / d.maxLife} color="linear-gradient(90deg, var(--life), var(--life-2))" size="md" label={`${fmt(s.life)} / ${fmt(d.maxLife)}`} />
        </span>
        <span title={`Mana ${fmt(s.mana)} / ${fmt(d.maxMana)}`}>
          <ProgressBar value={d.maxMana ? s.mana / d.maxMana : 0} color="linear-gradient(90deg, var(--mana), var(--mana-2))" className="thin" />
        </span>
      </div>
      <div className="currency-strip">
        {STRIP.map((id) => (
          <CurrencyAmount key={id} id={id} amount={s.bank[id] ?? 0} label={id === 'gold' ? 'gold' : materialDef(id).name.split(' ')[0]} />
        ))}
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
  const training = s.action?.kind === 'skill' ? actionDef(s.action.actionId).skill : null;
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
          <Icon name={training} size={14} color={SKILLS[training].color} />
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
  return (
    <li className="feed-item loot">
      <MatIcon id={l.currencyId!} size={13} /> <span style={{ color: 'var(--currency)' }}>{materialDef(l.currencyId!).name}</span>
    </li>
  );
}

export function Feed() {
  useGame();
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
            {game.feed.length === 0 && <li className="dim feed-empty">Level-ups, notable drops and events appear here.</li>}
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

export function Toasts() {
  useGame();
  return (
    <div className="toasts">
      {game.toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          {t.text}
        </div>
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

export function OfflineModal() {
  useGame();
  const sum = game.offline;
  if (!sum) return null;
  const xp = Object.entries(sum.xp).filter(([, n]) => (n ?? 0) > 0) as [SkillId, number][];
  // gold first, then everything else gained; materials spent crafting aren't spoils
  const mats = Object.entries(sum.materials)
    .filter(([, n]) => n > 0)
    .sort(([a], [b]) => (a === 'gold' ? -1 : b === 'gold' ? 1 : 0));
  const fought = sum.kills > 0 || sum.died;
  const spoils = mats.length > 0 || sum.items > 0 || sum.gems > 0;
  return (
    <div className="modal-backdrop" onClick={() => game.dismissOffline()}>
      <div className="card modal away" onClick={(e) => e.stopPropagation()}>
        <div className="away-head">
          <div className="away-kicker">The Exile Returns</div>
          <h2>While You Were Away</h2>
          <div className="muted">{awayLabel(sum.ms)} of adventure</div>
        </div>

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
              <Icon name="combat" size={18} color="var(--accent)" />
              <b className="num">{fmt(sum.kills)}</b>
              <span>Monsters Slain</span>
            </div>
            <div className="away-stat">
              <Icon name="skull" size={18} color="var(--bad)" />
              <b className="num">{sum.died ? 1 : 0}</b>
              <span>Deaths</span>
            </div>
          </div>
        )}

        {spoils && (
          <>
            <div className="away-divider" />
            <div className="away-section">{fought ? 'Spoils of Battle' : 'Spoils'}</div>
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
                  <Icon name="stash" size={20} color="var(--accent)" />
                  <b className="num">{sum.items}</b>
                  <span>Items Found</span>
                </div>
              )}
              {sum.gems > 0 && (
                <div className="away-spoil">
                  <Icon name="gemcutting" size={20} color="var(--magic)" />
                  <b className="num">{sum.gems}</b>
                  <span>Gems Found</span>
                </div>
              )}
            </div>
          </>
        )}

        {sum.died && (
          <div className="away-alert bad">
            <div className="row">
              <Icon name="skull" size={16} />
              <b>Slain in Combat</b>
            </div>
            <p>Your journey ended in death. You have returned to the hideout.</p>
          </div>
        )}
        {sum.stoppedReason && (
          <div className="away-alert warn">
            <div className="row">
              <Icon name="clock" size={16} />
              <b>Work Halted</b>
            </div>
            <p>{sum.stoppedReason}</p>
          </div>
        )}
        {sum.bossWaiting && (
          <div className="away-alert warn">
            <div className="row">
              <Icon name="forge" size={16} />
              <b>An Unfinished Battle</b>
            </div>
            <p>{sum.bossWaiting} awaits. This foe must be challenged in person.</p>
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
/** Keys 1–5 drink flasks and Q–Y cast skill-bar slots while in combat. */
export function useFlaskHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey || !game.state.combat) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5) {
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

export function usePage(): [Page, (p: Page) => void] {
  const [page, setPage] = useState<Page>(() => {
    try {
      return (localStorage.getItem('coe-page') as Page) || 'hideout';
    } catch {
      return 'hideout';
    }
  });
  const go = (p: Page) => {
    setPage(p);
    try {
      localStorage.setItem('coe-page', p);
    } catch {
      /* ignore */
    }
  };
  return [page, go];
}


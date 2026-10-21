import { useEffect, useState } from 'react';
import { classDef } from '../data/classes';
import { materialDef } from '../data/materials';
import { actionDef, SKILLS } from '../data/skills';
import { zoneDef } from '../data/zones';
import { retreat, useFlask } from '../engine/combat';
import { pointsLeft } from '../engine/passives';
import { actionIntervalMs, stopAction } from '../engine/skills';
import { deriveStats } from '../engine/stats';
import type { GameState, SkillId } from '../engine/types';
import { levelForXp, levelProgress } from '../engine/xp';
import { game, useGame } from '../game';
import { fmt, fmtTime, MatIcon, ProgressBar } from './components/common';
import { Icon } from './components/Icon';
import { QuestTracker } from './components/QuestTracker';
import { Crest } from './screens/Screens';

export type Page =
  | 'hideout'
  | 'combat'
  | 'tree'
  | 'equipment'
  | 'bench'
  | 'stash'
  | 'vendor'
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
    ],
  },
  {
    label: 'Character',
    items: [
      { page: 'combat', label: 'Combat', icon: 'combat', skill: 'combat' },
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
        <span className="brand-title">Claudle of Exile</span>
        <span className="brand-sub">an idle exile's tale</span>
      </div>
      {NAV.map((g) => (
        <div className="nav-group" key={g.label}>
          <div className="nav-label">{g.label}</div>
          {g.items.map((it) => {
            const lvl = it.skill ? levelForXp(s.skills[it.skill]) : null;
            const isActive = it.skill && it.skill === active;
            const color = it.skill ? SKILLS[it.skill].color : 'var(--muted)';
            return (
              <button key={it.page} data-tut={`nav-${it.page}`} className={`nav-item ${page === it.page ? 'active' : ''}`} onClick={() => go(it.page)}>
                <span className="nav-icon">
                  <Icon name={it.icon} size={16} color={isActive ? color : undefined} />
                  {isActive && it.skill && <Ring value={levelProgress(s.skills[it.skill])} color={color} />}
                </span>
                <span className="nav-name">{it.label}</span>
                {isActive && <span className="nav-active-dot" />}
                {lvl !== null && <span className="nav-badge">{lvl}</span>}
                {it.page === 'tree' && points > 0 && <span className="nav-badge hot">+{points}</span>}
                {it.page === 'stash' && <span className="nav-badge">{s.inventory.length}</span>}
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
            <div className="dim" style={{ fontSize: 11 }}>
              Lv {levelForXp(s.skills.combat)} {classDef(s.character.classId).name}
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
    const mon = s.combat.monster;
    title = `Fighting in ${z.name}`;
    sub = mon ? `${mon.name} · ${fmt(Math.max(0, mon.life))}/${fmt(mon.maxLife)}` : 'Searching…';
    progress = mon ? 1 - Math.max(0, mon.life) / mon.maxLife : 0;
    color = 'var(--life)';
    target = 'combat';
  }

  return (
    <header className="topbar">
      <div className="activity" onClick={() => go(target)} style={{ cursor: 'pointer' }}>
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
      <div className="topbar-life" title="Life">
        <ProgressBar value={s.life / d.maxLife} color="linear-gradient(90deg, var(--life), var(--life-2))" size="md" label={`${fmt(s.life)} / ${fmt(d.maxLife)}`} />
      </div>
      <div className="currency-strip">
        {STRIP.map((id) => (
          <span className="chip" key={id} title={materialDef(id).name}>
            <MatIcon id={id} size={14} />
            {fmt(s.bank[id] ?? 0)}
            <span className="dim">{id === 'gold' ? 'gold' : materialDef(id).name.split(' ')[0]}</span>
          </span>
        ))}
      </div>
    </header>
  );
}

function ago(at: number, now: number): string {
  const s = Math.round((now - at) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

export function Feed() {
  useGame();
  const now = Date.now();
  return (
    <aside className="feed">
      <QuestTracker />
      <div className="feed-head">Activity</div>
      <ul className="feed-list">
        {game.feed.length === 0 && <li className="dim" style={{ padding: 10, fontSize: 12 }}>Level-ups, notable drops and events appear here.</li>}
        {game.feed.map((f, i) => (
          <li key={f.id} className={`feed-item ${f.tone}`} style={{ opacity: Math.max(0.35, 1 - i * 0.04) }}>
            {f.text}
            <time>{ago(f.at, now)}</time>
          </li>
        ))}
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

export function OfflineModal() {
  useGame();
  const sum = game.offline;
  if (!sum) return null;
  const mats = Object.entries(sum.materials).filter(([, n]) => n > 0);
  return (
    <div className="modal-backdrop" onClick={() => game.dismissOffline()}>
      <div className="card modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-title">
          <Icon name="clock" size={18} color="var(--accent)" />
          While you were away
          <span className="grow" />
          <span className="muted" style={{ fontFamily: 'var(--font)', fontSize: 13 }}>
            {fmtTime(sum.ms)}
          </span>
        </div>
        <div className="grid" style={{ gap: 10 }}>
          {Object.entries(sum.xp).map(([sk, xp]) => (
            <div key={sk} className="row">
              <Icon name={sk} size={16} color={SKILLS[sk as SkillId].color} />
              <b>{SKILLS[sk as SkillId].name}</b>
              <span className="spacer" />
              <span className="good num">+{fmt(xp ?? 0)} xp</span>
              {sum.levels[sk as SkillId] && <span className="nav-badge hot">Lv {sum.levels[sk as SkillId]}</span>}
            </div>
          ))}
          {sum.kills > 0 && (
            <div className="row">
              <Icon name="skull" size={16} />
              Monsters slain <span className="spacer" />
              <b className="num">{sum.kills}</b>
            </div>
          )}
          {sum.items > 0 && (
            <div className="row">
              <Icon name="stash" size={16} />
              Items found <span className="spacer" />
              <b className="num">{sum.items}</b>
            </div>
          )}
          {mats.length > 0 && (
            <div className="io">
              {mats.map(([id, n]) => (
                <span key={id} className="io-item">
                  <MatIcon id={id} size={12} />+{fmt(n)} {materialDef(id).name}
                </span>
              ))}
            </div>
          )}
          {sum.died && <div className="bad">You were slain and returned to the hideout.</div>}
          {sum.stoppedReason && <div className="warn">{sum.stoppedReason}</div>}
        </div>
        <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={() => game.dismissOffline()}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

/** Number keys 1-5 drink flasks while in combat. */
export function useFlaskHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 5 && game.state.combat) {
        const f = game.state.flaskSlots[n - 1];
        if (!f) return;
        const err = game.act((s, ctx) => useFlask(s, ctx, n - 1));
        if (!err) e.preventDefault();
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


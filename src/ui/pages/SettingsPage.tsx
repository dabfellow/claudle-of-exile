import { useState } from 'react';
import { exportSave, importSave } from '../../engine/save';
import { newGame } from '../../engine/state';
import { game, useGame } from '../../game';
import { isCloudAccount } from '../../platform/accounts';
import { cloudConfigured } from '../../platform/supabase';
import { fmt, PageHeader, Tabs } from '../components/common';
import { FeedbackCard } from '../components/FeedbackCard';
import { useMusicPrefs } from '../music';
import { AccountBadge, leaveAccount } from '../screens/Screens';
import '../round2-session3.css';

type SettingsTab = 'game' | 'loot' | 'display' | 'sound' | 'account' | 'feedback';

const TAB_KEY = 'poi-settings-tab';

/** The tab Settings opens on: unread replies from the developer first, then wherever you were last. */
function startTab(): SettingsTab {
  if (!game.sandbox && game.adminMail.some((m) => !m.read_at)) return 'feedback';
  try {
    const saved = localStorage.getItem(TAB_KEY) as SettingsTab | null;
    if (saved && ['game', 'loot', 'display', 'sound', 'account', 'feedback'].includes(saved)) return saved;
  } catch {
    // storage blocked: just open on Game
  }
  return 'game';
}

export function SettingsPage() {
  const s = useGame();
  const [tab, setTabState] = useState<SettingsTab>(startTab);
  const setTab = (next: SettingsTab) => {
    setTabState(next);
    try {
      localStorage.setItem(TAB_KEY, next);
    } catch {
      // not remembered, which is fine
    }
  };
  const unread = game.sandbox ? 0 : game.adminMail.filter((m) => !m.read_at).length;
  return (
    <div className="page r2-settings">
      <PageHeader title="Settings" />
      <div className="r2-settings-tabs">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'game', label: 'Game' },
            { id: 'loot', label: 'Loot filters' },
            { id: 'display', label: 'Display' },
            { id: 'sound', label: 'Sound' },
            { id: 'account', label: 'Account' },
            ...(cloudConfigured() ? [{ id: 'feedback' as const, label: 'Feedback', count: unread || undefined, hot: unread > 0 }] : []),
          ]}
        />
      </div>
      {tab === 'game' && <GameTab />}
      {tab === 'loot' && <LootTab />}
      {tab === 'display' && (
        <div className="card">
          <div className="card-title">Display</div>
          <label className="chip" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={s.settings.reducedMotion} onChange={(e) => game.act((st) => void (st.settings.reducedMotion = e.target.checked))} />
            Reduce motion
          </label>
          <p className="dim small" style={{ marginBottom: 0 }}>
            Calms the game's animations, for comfort or a slower device.
          </p>
        </div>
      )}
      {tab === 'sound' && <SoundTab />}
      {tab === 'account' && <AccountTab />}
      {tab === 'feedback' && <FeedbackCard />}
    </div>
  );
}

function GameTab() {
  const s = useGame();
  const [text, setText] = useState('');
  const [exported, setExported] = useState('');
  const demo = game.account?.provider === 'demo';
  return (
    <>
      {!demo && (
        <div className="card">
          <div className="card-title">Save data</div>
          <p className="muted" style={{ marginTop: 0 }}>
            The game saves automatically every 10 seconds in this browser.
          </p>
          <div className="row wrap">
            <button className="btn" onClick={() => game.save()}>
              Save now
            </button>
            <button
              className="btn"
              onClick={() => {
                const str = exportSave(game.state);
                setExported(str);
                navigator.clipboard?.writeText(str).then(
                  () => game.pushToast('Save copied to clipboard', 'good'),
                  () => undefined,
                );
              }}
            >
              Export
            </button>
            <button
              className="btn danger"
              onClick={() => {
                const c = s.character;
                if (confirm(`Reset ${c.name} back to level 1? The Hideout and shared stash stay. This cannot be undone.`))
                  void game.replace(newGame(Date.now(), { id: c.id, name: c.name, classId: c.classId, startNode: c.startNode, challenge: c.challenge }, s.account));
              }}
            >
              Reset character
            </button>
          </div>
          {exported && <textarea className="input textarea" readOnly value={exported} rows={3} onFocus={(e) => e.target.select()} />}
          <div className="section-label" style={{ marginTop: 16 }}>
            Import
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Paste an exported save" className="input textarea" />
          <button
            className="btn"
            disabled={!text.trim()}
            style={{ marginTop: 8 }}
            onClick={() => {
              try {
                void game.replace(importSave(text));
                setText('');
                game.pushToast('Save imported', 'good');
              } catch {
                game.pushToast('That save string is invalid', 'bad');
              }
            }}
          >
            Import save
          </button>
        </div>
      )}
      {demo && (
        <div className="card">
          <div className="card-title">Save data</div>
          <p className="muted" style={{ margin: 0 }}>
            The demo isn't saved. Create an account from the title screen to keep a character.
          </p>
        </div>
      )}
      <div className="card">
        <div className="card-title">Lifetime</div>
        <div className="row wrap" style={{ gap: 18 }}>
          <span className="muted">
            Kills <b>{fmt(s.lifetime.kills)}</b>
          </span>
          <span className="muted">
            Bosses <b>{s.lifetime.bossKills}</b>
          </span>
          <span className="muted">
            Deaths <b>{s.lifetime.deaths}</b>
          </span>
          <span className="muted">
            Items looted <b>{fmt(s.lifetime.itemsLooted)}</b>
          </span>
          <span className="muted">
            Orbs used <b>{fmt(s.lifetime.orbsUsed)}</b>
          </span>
        </div>
      </div>
    </>
  );
}

function LootTab() {
  return (
    <div className="card">
      <div className="card-title">Loot filters moved to the Quartermaster</div>
      <p className="muted" style={{ marginTop: 0 }}>
        Open the Quartermaster station in your Hideout to choose a level-scaled preset, add category overrides, build ordered custom rules, or paste a shared filter code.
      </p>
      <span className="chip">Hideout → Quartermaster → Open loot filters</span>
    </div>
  );
}

function SoundTab() {
  const [music, setMusic] = useMusicPrefs();
  return (
    <div className="card">
      <div className="card-title">Sound</div>
      <div className="row wrap">
        <label className="muted row" style={{ cursor: 'pointer' }}>
          Music
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(music.volume * 100)}
            aria-label="Music volume"
            style={{ accentColor: 'var(--accent)', width: 180, maxWidth: '50vw' }}
            onChange={(e) => setMusic({ ...music, volume: Number(e.target.value) / 100 })}
          />
          <b>{Math.round(music.volume * 100)}%</b>
        </label>
        <label className="chip" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={music.muted} onChange={(e) => setMusic({ ...music, muted: e.target.checked })} />
          Mute
        </label>
      </div>
      <p className="dim small" style={{ marginBottom: 0 }}>
        Saved on this device.
      </p>
    </div>
  );
}

function AccountTab() {
  const demo = game.account?.provider === 'demo';
  return (
    <>
      <div className="card">
        <div className="card-title">Account</div>
        <div className="row wrap" style={{ gap: 8 }}>
          <AccountBadge />
          <span className="spacer" />
          <button className="btn sm" onClick={() => game.exit()}>
            Switch character
          </button>
          <button className="btn sm ghost" onClick={leaveAccount}>
            {isCloudAccount(game.account) ? 'Sign out' : 'Back to title'}
          </button>
        </div>
        {game.account?.provider === 'guest' && (
          <p className="dim small" style={{ marginBottom: 0 }}>
            Playing as a guest: progress is saved in this browser only. Use an account from the title screen to save to the cloud — you can bring your guest
            characters with you.
          </p>
        )}
        {demo && (
          <p className="dim small" style={{ marginBottom: 0 }}>
            Playing the demo: nothing is saved, and your progress is lost when you close or refresh this tab. Create an account to keep this character.
          </p>
        )}
      </div>
      <div className="card">
        <div className="card-title">About</div>
        <p className="muted" style={{ marginTop: 0 }}>
          <b>Path of Idle</b> features six complete acts from the Mud Flats to the cathedral of Oriath, ten themed map tiers, doomed maps, twelve character
          ascendancies, and the endgame Map Device. Progress continues while you are away.
        </p>
        <p className="dim small" style={{ marginBottom: 0 }}>
          <b>Privacy:</b> the demo isn't saved anywhere, and guest saves stay in this browser. With an account, our sign-in service (Supabase) stores your
          email and player name (Google or Discord also share your name and avatar), and we store your character saves there so you can play anywhere.
          That's all: no ads, no analytics, no tracking. Signing out keeps your cloud saves. Feedback and reviews you send are stored there too, and if the
          game crashes, an error report (what went wrong, your browser and game version, never your name or email) goes to our error tracker, Sentry.
        </p>
        <p className="dim small" style={{ marginBottom: 0 }}>
          <b>Support:</b> questions, or want your account and saves deleted? Email <a href="mailto:support@dabfellow.party">support@dabfellow.party</a>.
        </p>
      </div>
    </>
  );
}

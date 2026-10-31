import { useState } from 'react';
import { exportSave, importSave } from '../../engine/save';
import { newGame } from '../../engine/state';
import type { Rarity } from '../../engine/types';
import { game, useGame } from '../../game';
import { fmt, PageHeader } from '../components/common';
import { FeedbackCard } from '../components/FeedbackCard';
import { AccountBadge } from '../screens/Screens';

export function SettingsPage() {
  const s = useGame();
  const [text, setText] = useState('');
  const [exported, setExported] = useState('');
  return (
    <div className="page">
      <PageHeader title="Settings" />
      <div className="card">
        <div className="card-title">Account</div>
        <div className="row wrap">
          <AccountBadge />
          <span className="spacer" />
          <button className="btn sm" onClick={() => game.signOut()}>
            {game.account?.provider === 'guest' ? 'Back to title' : 'Sign out'}
          </button>
        </div>
        {game.account?.provider === 'guest' && (
          <p className="dim small" style={{ marginBottom: 0 }}>
            Playing as a guest: progress is saved in this browser only. Sign in with Google or Discord from the title screen to save to the cloud — you can
            bring your guest characters with you.
          </p>
        )}
      </div>
      <div className="card">
        <div className="card-title">About</div>
        <p className="muted" style={{ marginTop: 0 }}>
          <b>Act 1: The Drowned Coast</b> has eight areas from the Mud Flats to the Drowned Sanctum, ending with Ysolde, the Drowned Queen. Expect
          roughly a day of play to finish it. <b>Act 2: The Burning Steppe</b> has eight more, from the Cinder Road to the Burning Throne, ending with
          Azhar, the Fallen Sun.
        </p>
        <p className="muted">
          <b>Coming next:</b> Acts 3–6, each with new areas, gathering tiers, items and skills; then maps for the endgame, ascendancy classes, loot
          filters and the story. Your characters carry over.
        </p>
        <p className="dim small" style={{ marginBottom: 0 }}>
          <b>Privacy:</b> guest saves stay in this browser. If you sign in with Google or Discord, they share your name, email and avatar with our
          sign-in service (Supabase), and we store your character saves there so you can play anywhere. That's all: no ads, no analytics, no
          tracking. Signing out keeps your cloud saves. Feedback and reviews you send are stored there too, and if the game crashes, an error
          report (what went wrong, your browser and game version, never your name or email) goes to our error tracker, Sentry.
        </p>
        <p className="dim small" style={{ marginBottom: 0 }}>
          <b>Support:</b> questions, or want your account and saves deleted? Email{' '}
          <a href="mailto:support@dabfellow.party">support@dabfellow.party</a>.
        </p>
      </div>
      <FeedbackCard />
      <div className="card">
        <div className="card-title">Loot filter</div>
        <p className="muted" style={{ marginTop: 0 }}>
          Automatically salvage dropped items of these rarities into Arcane Dust. Uniques are always kept.
        </p>
        <div className="row wrap">
          {(['normal', 'magic', 'rare'] as Rarity[]).map((r) => (
            <label key={r} className="chip" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={s.settings.autoSalvage[r]}
                onChange={(e) => game.act((st) => void (st.settings.autoSalvage[r] = e.target.checked))}
              />
              <span style={{ color: `var(--${r})` }}>{r[0].toUpperCase() + r.slice(1)}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-title">Display</div>
        <label className="chip" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={s.settings.reducedMotion} onChange={(e) => game.act((st) => void (st.settings.reducedMotion = e.target.checked))} />
          Reduce motion
        </label>
      </div>
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
              if (confirm(`Reset ${c.name} back to level 1? This cannot be undone.`)) game.replace(newGame(Date.now(), { id: c.id, name: c.name, classId: c.classId }));
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
              game.replace(importSave(text));
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
    </div>
  );
}

import { Art, sceneStyle } from '../components/common';
import { useState } from 'react';
import { CLASSES, classDef, startClass, type ClassId } from '../../data/classes';
import { baseDef } from '../../data/bases';
import { activeGemDef } from '../../data/gems';
import { GUIDE_NAME } from '../../data/tutorial';
import { game, useGame } from '../../game';
import type { CharacterSummary } from '../../platform/saves';
import { Icon } from '../components/Icon';
import { Embers } from '../pages/HideoutPage';

function ago(ms: number): string {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

export function Crest({ classId, size = 56 }: { classId: ClassId; size?: number }) {
  const c = classDef(classId);
  return (
    <span className="crest" style={{ width: size, height: size, ['--class' as string]: c.color }}>
      <Art src={`portraits/class_${classId}`} alt={c.name} cover fallback={<Icon name={c.icon} size={size * 0.5} color={c.color} stroke={1.8} />} />
    </span>
  );
}

function ScreenShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="screen" style={sceneStyle('scenes/title')}>
      <Embers />
      <div className={`screen-inner ${wide ? 'wide' : ''}`}>
        <div className="screen-brand">
          <span className="brand-title" style={{ fontSize: 40 }}>
            Path of Idle
          </span>
          <span className="brand-sub">an idle exile's tale</span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function TitleScreen() {
  useGame();
  const [pending, setPending] = useState<string | null>(null);
  const online = game.accounts.isAvailable('google');
  const oauth = (provider: 'google' | 'discord') => {
    setPending(provider);
    void game.signIn(provider).finally(() => setPending(null));
  };
  return (
    <ScreenShell>
      <div className="card title-card">
        <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
          Gather, forge and fight your way up from the Mud Flats. Progress continues while you're away.
        </p>
        <button className="btn primary lg" onClick={() => game.signIn('guest')}>
          Play as Guest
        </button>
        <div className="divider">
          <span>or sign in to save to the cloud and play anywhere</span>
        </div>
        <button className="btn lg" disabled={!online || !!pending} onClick={() => oauth('google')}>
          <span className="provider g">G</span> {pending === 'google' ? 'Opening Google…' : 'Sign in with Google'}
          {!online && <span className="soon">offline</span>}
        </button>
        <button className="btn lg" disabled={!online || !!pending} onClick={() => oauth('discord')}>
          <span className="provider d">D</span> {pending === 'discord' ? 'Opening Discord…' : 'Sign in with Discord'}
          {!online && <span className="soon">offline</span>}
        </button>
        <p className="dim" style={{ fontSize: 'var(--fs-xs)', margin: 0, textAlign: 'center' }}>
          Guest progress stays in this browser. Sign in later and you can move your guest characters to your account.
        </p>
        <p className="dim" style={{ fontSize: 'var(--fs-xs)', margin: 0, textAlign: 'center' }}>
          Signing in shares your name, email and avatar from Google or Discord, and stores your character saves. No ads, no tracking.
        </p>
      </div>
    </ScreenShell>
  );
}

const SYNC_LABEL = { synced: 'Saved to cloud', saving: 'Saving…', offline: 'Offline — saving locally' } as const;

export function AccountBadge() {
  useGame();
  const a = game.account;
  if (!a) return null;
  return (
    <span className="account-badge" title={a.email ?? a.displayName}>
      {a.provider !== 'guest' && <span className={`provider ${a.provider === 'google' ? 'g' : 'd'}`}>{a.provider === 'google' ? 'G' : 'D'}</span>}
      <span>{a.displayName}</span>
      {game.sync && <span className={`sync ${game.sync}`}>{SYNC_LABEL[game.sync]}</span>}
    </span>
  );
}

function CharacterCard({ c }: { c: CharacterSummary }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const cls = classDef(c.classId);
  return (
    <div className="card char-card" style={{ ['--class' as string]: cls.color }}>
      <div className="row" style={{ gap: 14 }}>
        <Crest classId={c.classId} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="char-name">{c.name}</div>
          <div className="muted" style={{ fontSize: 'var(--fs-sm)' }}>
            Level {c.combatLevel} {cls.name} · Total level {c.totalLevel}
          </div>
          <div className="dim small">Last played {ago(c.lastPlayed)}</div>
        </div>
        {!confirming && (
          <>
            <button className="btn ghost sm" title="Delete character" onClick={() => setConfirming(true)}>
              <Icon name="close" size={14} />
            </button>
            <button className="btn primary" onClick={() => game.enter(c.id)}>
              Play
            </button>
          </>
        )}
      </div>
      {confirming && (
        <div className="row wrap" style={{ marginTop: 12 }}>
          <span className="warn" style={{ fontSize: 'var(--fs-sm)' }}>
            Type <b>{c.name}</b> to delete forever:
          </span>
          <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus style={{ flex: 1, minWidth: 120 }} />
          <button className="btn danger sm" disabled={typed !== c.name} onClick={() => game.removeCharacter(c.id)}>
            Delete
          </button>
          <button
            className="btn ghost sm"
            onClick={() => {
              setConfirming(false);
              setTyped('');
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export function CharacterSelect() {
  useGame();
  return (
    <ScreenShell>
      <div className="grid" style={{ gap: 12 }}>
        <div className="row wrap">
          <h2 style={{ fontSize: 20 }}>Choose your exile</h2>
          <span className="spacer" />
          <AccountBadge />
          <button className="btn ghost sm" onClick={() => game.signOut()}>
            {game.account?.provider === 'guest' ? 'Title' : 'Sign out'}
          </button>
        </div>
        {game.guestCharacters.length > 0 && (
          <div className="card guest-banner">
            <div>
              <b>
                {game.guestCharacters.length} guest character{game.guestCharacters.length === 1 ? '' : 's'} on this browser
              </b>
              <div className="dim" style={{ fontSize: 12 }}>
                {game.guestCharacters.map((c) => c.name).join(', ')} — move them to your account to keep them in the cloud.
              </div>
            </div>
            <button className="btn primary sm" onClick={() => game.adoptGuestCharacters()}>
              Move to my account
            </button>
          </div>
        )}
        {game.characters.length === 0 && game.guestCharacters.length > 0 && (
          <div className="dim" style={{ textAlign: 'center', fontSize: 'var(--fs-sm)' }}>
            No characters on this account yet.
          </div>
        )}
        {game.characters.map((c) => (
          <CharacterCard key={c.id} c={c} />
        ))}
        <button className="btn lg new-char" onClick={() => game.setScreen('create')}>
          <Icon name="plus" size={16} /> New Character
        </button>
      </div>
    </ScreenShell>
  );
}

const NAME_RE = /^[A-Za-z][A-Za-z '-]{1,15}$/;

export function CharacterCreate() {
  useGame();
  const [classId, setClassId] = useState<ClassId>('warrior');
  const [exileStart, setExileStart] = useState('class_str');
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const error = !trimmed
    ? null
    : !NAME_RE.test(trimmed)
      ? '2–16 letters; spaces, hyphens and apostrophes allowed'
      : game.nameTaken(trimmed)
        ? 'You already have a character with that name'
        : null;
  const valid = !!trimmed && !error;
  const cls = classDef(classId);
  const begin = () => game.create(trimmed, classId, classId === 'exile' ? exileStart : undefined);

  return (
    <ScreenShell wide>
      <div className="row">
        <h2 style={{ fontSize: 20 }}>Create a character</h2>
        <span className="spacer" />
        {game.characters.length > 0 && (
          <button className="btn ghost sm" onClick={() => game.setScreen('select')}>
            Back
          </button>
        )}
      </div>
      <div className="class-grid">
        {CLASSES.map((c) => {
          const locked = c.challenge && !game.exileUnlocked;
          return (
          <button
            key={c.id}
            className={`card class-card ${classId === c.id ? 'chosen' : ''} ${locked ? 'locked' : ''}`}
            style={{ ['--class' as string]: c.color }}
            disabled={locked}
            onClick={() => setClassId(c.id)}
          >
            <Art src={`portraits/class_${c.id}`} alt={c.name} className="class-art" fallback={<Crest classId={c.id} size={64} />} />
            <div className="class-name">{c.name}</div>
            <div className="class-attr">{c.challenge ? 'Challenge class' : c.attribute}</div>
            <div className="class-tag">{c.tagline}</div>
            {locked && (
              <div className="warn" style={{ fontSize: 'var(--fs-sm)' }}>
                <Icon name="lock" size={12} /> Clear Act 1 with any character to unlock
              </div>
            )}
            <p className="muted" style={{ fontSize: 'var(--fs-sm)', margin: 0 }}>
              {c.desc}
            </p>
            <div className="class-attrs">
              <span title="Strength">
                <b style={{ color: 'var(--str)' }}>{c.baseAttributes.str}</b> Str
              </span>
              <span title="Dexterity">
                <b style={{ color: 'var(--dex)' }}>{c.baseAttributes.dex}</b> Dex
              </span>
              <span title="Intelligence">
                <b style={{ color: 'var(--int)' }}>{c.baseAttributes.int}</b> Int
              </span>
            </div>
            <div className="class-section">
              <div className="section-label">Class mechanic</div>
              <div className="mod" style={{ fontSize: 'var(--fs-sm)' }}>
                {c.mechanicText}
              </div>
            </div>
            <div className="class-section">
              <div className="section-label">Class bonus</div>
              {c.bonusText.length ? (
                c.bonusText.map((b) => (
                  <div key={b} className="mod" style={{ fontSize: 'var(--fs-sm)' }}>
                    {b}
                  </div>
                ))
              ) : (
                <div className="dim" style={{ fontSize: 'var(--fs-sm)' }}>
                  None
                </div>
              )}
            </div>
            <div className="class-section">
              <div className="section-label">Starting gear</div>
              <div className="io" style={{ justifyContent: 'center' }}>
                {Object.values(c.kit).map((id) => (
                  <span key={id} className="io-item">
                    <Icon name={baseDef(id).slot} size={12} /> {baseDef(id).name}
                  </span>
                ))}
              </div>
            </div>
          </button>
          );
        })}
      </div>
      {classId === 'exile' && (
        <div className="card">
          <div className="section-label" style={{ marginBottom: 8 }}>
            Start on the passive tree as
          </div>
          <div className="row wrap" style={{ gap: 8 }}>
            {CLASSES.filter((c) => !c.challenge).map((c) => (
              <button
                key={c.id}
                className={`btn sm ${exileStart === c.startNode ? 'primary' : ''}`}
                title={`Starter gems: ${c.starterGems.map((g) => activeGemDef(g).name).join(', ')}`}
                onClick={() => setExileStart(c.startNode)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="dim small" style={{ marginTop: 6 }}>
            You begin at the {startClass('exile', exileStart).name}'s tree start with their two starter gems. Nothing else carries over.
          </div>
        </div>
      )}
      <div className="card create-bar" style={{ ['--class' as string]: cls.color }}>
        <Crest classId={classId} size={44} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            className="input lg"
            placeholder={`Name your ${cls.name.toLowerCase()}`}
            value={name}
            maxLength={16}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && valid && begin()}
          />
          <div className={error ? 'warn' : 'dim'} style={{ fontSize: 'var(--fs-xs)', marginTop: 4, minHeight: 16 }}>
            {error ?? 'This is the name the world will forget.'}
          </div>
        </div>
        <button className="btn primary lg" disabled={!valid} onClick={begin}>
          Begin
        </button>
      </div>
    </ScreenShell>
  );
}

export function IntroModal() {
  const s = useGame();
  if (!game.showIntro) return null;
  const cls = classDef(s.character.classId);
  return (
    <div className="modal-backdrop">
      <div className="card modal intro" style={{ ['--class' as string]: cls.color }}>
        <Crest classId={cls.id} size={72} />
        <h2 style={{ fontSize: 24 }}>{s.character.name}</h2>
        <p className="muted" style={{ margin: 0 }}>
          Cast out from the empire with nothing but a {baseDef(cls.kit.weapon!).name.toLowerCase()}, you wake on the cold sand of the Mud Flats. A hunched figure
          is waiting by a fire in the cliffs above.
        </p>
        <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--accent-2)' }}>
          "Another one. Come up out of the tide, {cls.name.toLowerCase()}, before the drowned find you. Name's {GUIDE_NAME}. I'll show you how to survive here."
        </p>
        <button className="btn primary lg" onClick={() => game.dismissIntro()}>
          Follow {GUIDE_NAME}
        </button>
      </div>
    </div>
  );
}

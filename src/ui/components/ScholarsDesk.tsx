import { useState } from 'react';
import {
  CHAPTERS, chapterNeed, CODEX_TIERS, EARLY_SCRIPTS, FIRST_SCRIPT_GATE, INSCRIPTION_CHANCE, meaningDef, SCRIPTS, SECRET_CHAPTERS, SECRET_DATA,
  type ChapterReward, type ScriptDef, type ScriptId,
} from '../../data/deciphering';
import { isChamberAction, ROSETTA_STONE, SITES, siteOfAction } from '../../data/expedition';
import { actionDef } from '../../data/skills';
import {
  clearArrivals, codexDigSpeed, codexTier, crackedCount, firstScriptHintSource, firstScriptOpen, glyphOf, meaningName, readInscription, revealThreshold, seenMeanings, setGuess,
  trueMeaning, useRosetta, type ReadResult,
} from '../../engine/deciphering';
import { actionIntervalMs, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import { glyphIds } from '../../data/deciphering';
import type { GameState, Inscription } from '../../engine/types';
import { game, useGame } from '../../game';
import { MatIcon, ProgressBar } from './common';
import { GlyphTile } from './Glyph';
import { HelpTip, SkillIntro } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import '../archaeology.css';

export function rewardText(r: ChapterReward): string {
  switch (r.kind) {
    case 'data': return `${r.amount} Ancient Data`;
    case 'passport': return `Expedition Passport: ${SITES.find((x) => x.id === r.site)?.name ?? r.site}`;
    case 'chamber': return `Hidden chamber at ${SITES.find((x) => x.id === r.site)?.name ?? r.site}`;
    case 'stock': return 'A better shelf at their merchant';
    case 'forms': return `${r.forms.length > 1 ? 'Relic forms' : 'A relic form'} at the Relic Forge${r.title ? ` and the title "${r.title}"` : ''}`;
  }
}

function Meaning({ id, size = 'md' }: { id: string; size?: 'sm' | 'md' }) {
  const m = meaningDef(id);
  return (
    <span className={`meaning ${size}`}>
      <span className="meaning-icon" aria-hidden>{m.icon}</span>
      <span className="meaning-name">{m.name}</span>
    </span>
  );
}

// ---------- the return card ----------

/** The pile of rubbings that came in while you were away or digging, and the glyphs that revealed themselves. */
export function RubbingsCard({ s, onOpen, openLabel = 'Open the desk' }: { s: GameState; onOpen: () => void; openLabel?: string }) {
  const arr = s.archaeology.arrivals;
  const total = Object.values(arr.inscriptions).reduce((a, b) => a + b, 0);
  if (!total && !arr.revealed.length) return null;
  return (
    <div className="rubbings-card">
      <div className="dig-kicker">A stack of new inscriptions</div>
      {total > 0 && (
        <p className="rubbings-line">
          {SCRIPTS.filter((x) => arr.inscriptions[x.id]).map((x) => `${arr.inscriptions[x.id]} ${x.name}`).join(', ')}
          {' '}· <b className="num">{arr.hints}</b> new picture hint{arr.hints === 1 ? '' : 's'}
        </p>
      )}
      {arr.revealed.slice(-8).map((r, i) => (
        <p key={`${r.culture}${r.glyph}${i}`} className="rubbings-note">
          <GlyphTile script={r.culture as ScriptId} glyph={r.glyph} size={22} cracked />
          The meaning came to you: it means {meaningName(trueMeaning(s.archaeology, r.culture as ScriptId, r.glyph))}.
        </p>
      ))}
      <button className="btn sm primary" onClick={onOpen}>{openLabel}</button>
    </div>
  );
}

// ---------- the desk ----------

function HintRow({ s, ins }: { s: GameState; ins: Inscription }) {
  const a = s.archaeology;
  if (!ins.hints.length) return <p className="dim small">No picture hints on this one.</p>;
  return (
    <div className="hint-row" aria-label="Picture hints">
      {ins.hints.map((h, i) => {
        if (ins.culture !== 'first') return <Meaning key={`${h}${i}`} id={h} />;
        // the First Script's hints are glyphs of the earlier scripts, readable only with what you've learned
        const from = firstScriptHintSource(a, h);
        if (!from) return <Meaning key={`${h}${i}`} id={h} />;
        return (
          <span key={`${h}${i}`} className={`hint-glyph ${from.cracked ? 'known' : 'unknown'}`}>
            <GlyphTile script={from.script} glyph={from.glyph} size={36} cracked={from.cracked} label={`${from.cracked ? 'Cracked' : 'Uncracked'} glyph of the ${SCRIPTS.find((x) => x.id === from.script)!.name}`} />
            <span className="small dim">{SCRIPTS.find((x) => x.id === from.script)!.name}</span>
          </span>
        );
      })}
    </div>
  );
}

function Picker({ s, ins, glyph, onDone }: { s: GameState; ins: Inscription; glyph: string; onDone: () => void }) {
  const a = s.archaeology;
  const seen = seenMeanings(a, ins.culture);
  const current = glyphOf(a, ins.culture, glyph).guess;
  const pick = (m: string | null) => {
    game.act((st) => setGuess(st, ins.culture, glyph, m));
    onDone();
  };
  return (
    <div className="picker" role="group" aria-label="Pick a meaning">
      <div className="small dim">Pictures seen so far for this script. Tap one to pencil it in.</div>
      <div className="picker-grid">
        {seen.map((m) => (
          <button key={m} type="button" className={`picker-opt ${current === m ? 'on' : ''}`} onClick={() => pick(m)} aria-pressed={current === m}>
            <Meaning id={m} size="sm" />
          </button>
        ))}
        <button type="button" className={`picker-opt ${!current ? 'on' : ''}`} onClick={() => pick(null)} aria-pressed={!current}>?</button>
      </div>
      {!seen.length && <div className="small dim">No pictures seen yet. Hints arrive with new inscriptions.</div>}
    </div>
  );
}

function Inscriptions({ s }: { s: GameState }) {
  const a = s.archaeology;
  const [index, setIndex] = useState(0);
  const [picking, setPicking] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; r: ReadResult; script: ScriptId } | null>(null);
  const list = a.inscriptions;
  const i = Math.min(index, Math.max(0, list.length - 1));
  const ins = list[i];
  if (!ins) {
    return (
      <div className="desk-paper empty">
        {result?.r.translated && <p className="read-result good">Translated. +{SCRIPTS.find((x) => x.id === result.script)!.data} Ancient Data</p>}
        <p>No inscriptions to read. Dig, and rubbings turn up now and then: about 1 dig in {Math.round(1 / INSCRIPTION_CHANCE)}.</p>
        <p className="dim small">Each find carries glyphs and a few picture hints. Match them up, press Read, and see how many you got right.</p>
      </div>
    );
  }
  const def = SCRIPTS.find((x) => x.id === ins.culture)!;
  const read = () => {
    let r: ReadResult | null = null;
    game.act((st, ctx) => { r = readInscription(st, ctx, ins.id); });
    if (r) {
      setResult({ id: ins.id, r, script: ins.culture });
      setPicking(null);
    }
  };
  const shown = result && result.id === ins.id ? result.r : null;
  return (
    <div className="desk-paper" style={{ ['--script' as string]: def.color }}>
      <div className="desk-paper-head">
        <button className="btn sm ghost" disabled={i <= 0} onClick={() => { setIndex(i - 1); setPicking(null); }} aria-label="Previous inscription">‹</button>
        <div className="grow">
          <div className="dig-kicker">{def.name} · inscription {i + 1} of {list.length}</div>
        </div>
        <button className="btn sm ghost" disabled={i >= list.length - 1} onClick={() => { setIndex(i + 1); setPicking(null); }} aria-label="Next inscription">›</button>
      </div>
      {result?.r.translated && result.id !== ins.id && <p className="read-result good">Translated. +{SCRIPTS.find((x) => x.id === result.script)!.data} Ancient Data</p>}
      <div className="inscription-row">
        {ins.glyphs.map((g) => {
          const st = glyphOf(a, ins.culture, g);
          const meaning = st.guess;
          return (
            <div key={g} className={`inscription-glyph ${st.cracked ? 'done' : ''}`}>
              <GlyphTile script={ins.culture} glyph={g} size={64} selected={picking === g} cracked={st.cracked}
                onClick={st.cracked ? undefined : () => setPicking(picking === g ? null : g)}
                label={`${def.name} glyph ${Number(g.slice(1)) + 1}${meaning ? `, pencilled as ${meaningName(meaning)}` : ', no guess yet'}${st.cracked ? ', cracked' : ''}`} />
              <span className="glyph-guess">{meaning ? <Meaning id={meaning} size="sm" /> : <span className="dim">?</span>}</span>
              {st.cracked && <span className="glyph-check small">cracked</span>}
            </div>
          );
        })}
      </div>
      <div className="hints">
        <div className="small dim">Picture hints. They don't say which glyph is which.</div>
        <HintRow s={s} ins={ins} />
      </div>
      {picking && <Picker s={s} ins={ins} glyph={picking} onDone={() => setPicking(null)} />}
      <div className="read-bar">
        <button className="btn primary" onClick={read}>Read</button>
        {shown && (
          <span className={`read-result ${shown.translated ? 'good' : ''}`} role="status">
            {shown.translated ? 'Translated!' : `${shown.right} of ${shown.total} glyphs right`}
          </span>
        )}
      </div>
    </div>
  );
}

function DigStatusPanel({ s }: { s: GameState }) {
  const runningSiteAction = s.action?.kind === 'skill' && siteOfAction(s.action.actionId) ? actionDef(s.action.actionId) : null;
  const runningSite = runningSiteAction ? siteOfAction(runningSiteAction.id) : null;
  const anyArchAction = s.action?.kind === 'skill' && actionDef(s.action.actionId).skill === 'archaeology' ? actionDef(s.action.actionId) : null;
  const activeAction = runningSiteAction ?? anyArchAction;
  const interval = activeAction ? actionIntervalMs(s, activeAction, deriveStats(s)) : 0;
  const speed = codexDigSpeed(s);
  const rosettas = s.storage.bank[ROSETTA_STONE] ?? 0;

  return (
    <aside className="dig-side-panel">
      <div className="dig-kicker">Active dig & focus</div>
      {activeAction ? (
        <>
          <div className="dig-active-head">
            <div>
              <b>{runningSite ? runningSite.name : activeAction.name}</b>
              {runningSiteAction && isChamberAction(runningSiteAction.id) && (
                <div className="small dim">Hidden chamber</div>
              )}
            </div>
            <button className="btn sm ghost" onClick={() => game.act((st) => stopAction(st))}>
              Stop
            </button>
          </div>
          <ProgressBar
            value={s.action?.kind === 'skill' && interval > 0 ? s.action.progress / interval : 0}
            color="var(--success)"
            className="action-progress dig-progress"
          />
          <div className="small dim">
            Every {(interval / 1000).toFixed(1)}s{speed ? ` · ${speed}% faster from your codex` : ''}.
          </div>
          <SkillMinigame skill="archaeology" />
        </>
      ) : (
        <div className="dig-idle-note">
          <p className="small">No dig running right now.</p>
          <p className="small dim">
            Choose a site on the <b>Expedition Trail</b> below and click <b>Dig</b>. Active dig progress and the Focus brushing minigame appear right here.
          </p>
        </div>
      )}
      {rosettas > 0 && (
        <div className="row" style={{ gap: 6, alignItems: 'center', marginTop: 4 }}>
          <button className="btn sm" onClick={() => game.act((st, ctx) => useRosetta(st, ctx))}>
            Use a Rosetta Stone <span className="num">×{rosettas}</span>
          </button>
          <HelpTip tip="Consumes 1 Rosetta Stone to reveal glyphs across all scripts and open a culture's secret chapter once you are 3 chapters in." />
        </div>
      )}
    </aside>
  );
}

export function DeskView() {
  const s = useGame();
  const a = s.archaeology;
  return (
    <section className="expedition desk">
      <SkillIntro step="Start here: Dig a site below → read rubbings here">
        Dig at the sites below for Artifacts and stone Inscriptions, then match glyphs to picture hints on the Scholar's Desk to crack scripts and unlock the trail
      </SkillIntro>
      <div className="expedition-banner">
        <div>
          <div className="dig-kicker">The Hollow Peaks</div>
          <h3 className="expedition-title">The Scholar's Desk</h3>
          {a.title && <div className="dig-kicker">{a.title}</div>}
        </div>
        <div className="expedition-stats">
          {SCRIPTS.map((x) => (
            <div key={x.id} className="exp-stat" style={{ ['--script' as string]: x.color }}>
              <span className="exp-stat-label">{x.name}</span>
              <b className="num">{crackedCount(a, x.id)}/{x.glyphs} glyphs</b>
            </div>
          ))}
          <div className="exp-stat">
            <span className="exp-stat-label">Stack</span>
            <b className="num">{a.inscriptions.length}</b>
          </div>
        </div>
      </div>
      <RubbingsCard s={s} onOpen={() => game.act((st) => clearArrivals(st))} />
      <div className="desk-layout">
        <Inscriptions s={s} />
        <DigStatusPanel s={s} />
      </div>
    </section>
  );
}

// ---------- the codex ----------

function CodexPage({ s, script }: { s: GameState; script: ScriptDef }) {
  const a = s.archaeology;
  const cracked = crackedCount(a, script.id);
  const tier = codexTier(a, script.id);
  const need = revealThreshold(a);
  return (
    <div className="card codex-page" style={{ ['--script' as string]: script.color }}>
      <div className="card-title">
        {script.name}
        <span className="grow" />
        <span className="num dim">{cracked}/{script.glyphs} cracked</span>
      </div>
      {script.id === 'first' && !firstScriptOpen(a) && (
        <p className="lock-note small">Its inscriptions appear once the Giants, Surveyors and Rimebound are each past chapter {FIRST_SCRIPT_GATE}.</p>
      )}
      <div className="codex-grid">
        {glyphIds(script.id).map((g) => {
          const st = glyphOf(a, script.id, g);
          return (
            <div key={g} className={`codex-cell ${st.cracked ? 'done' : ''}`}>
              <GlyphTile script={script.id} glyph={g} size={40} cracked={st.cracked} />
              {st.cracked ? <Meaning id={trueMeaning(a, script.id, g)} size="sm" /> : (
                <>
                  <span className="dim small">{st.guess ? meaningName(st.guess) : '?'}</span>
                  <ProgressBar value={Math.min(1, st.evidence / need)} color={script.color} className="evidence-bar" label={`${st.evidence} of ${need} evidence`} />
                </>
              )}
            </div>
          );
        })}
      </div>
      <ul className="codex-perks">
        {CODEX_TIERS.map((t, i) => (
          <li key={t.share} className={i < tier ? 'on' : ''}>
            <span className="num">{t.share * 100}%</span> {t.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CodexView() {
  const s = useGame();
  return (
    <section>
      <SkillIntro step="Glyph Dictionary">
        Your dictionary of translated glyphs across 4 lost cultures — cracking glyphs permanently speeds up digging and yields
      </SkillIntro>
      <div className="section-head">
        <h3>Codex</h3>
        <span className="dim small">
          Every glyph that reaches {revealThreshold(s.archaeology)} evidence reveals itself. Perks stack across scripts.{' '}
          <HelpTip tip="Each time you press Read on an inscription at the Scholar's Desk, every correct glyph gains 1 evidence toward revealing its true meaning permanently." />
        </span>
      </div>
      <div className="card-grid" style={{ ['--card-min' as string]: '320px', gap: 8 }}>
        {SCRIPTS.map((x) => <CodexPage key={x.id} s={s} script={x} />)}
      </div>
    </section>
  );
}

// ---------- the story ----------

function StoryCard({ s, script }: { s: GameState; script: ScriptDef }) {
  const a = s.archaeology;
  const done = a.chapters[script.id] ?? 0;
  const next = CHAPTERS[script.id].find((c) => c.n === done + 1);
  const gated = script.id === 'first' && !firstScriptOpen(a);
  return (
    <div className="card chapters-card" style={{ ['--script' as string]: script.color }}>
      <div className="card-title">
        {script.name}
        <span className="grow" />
        <span className="num dim">chapter {done} of {script.chapters}</span>
      </div>
      {gated && <p className="lock-note small">Locked until the Giants, Surveyors and Rimebound are each past chapter {FIRST_SCRIPT_GATE}.</p>}
      <ol className="chapter-list">
        {CHAPTERS[script.id].map((c) => (
          <li key={c.n} className={c.n <= done ? 'done' : c.n === done + 1 ? 'next' : 'later'}>
            <b>{c.n <= done ? c.title : `Chapter ${c.n}`}</b>
            {c.n <= done && (
              <>
                {c.lore.map((l) => <p key={l} className="chapter-lore">{l}</p>)}
                <span className="small dim">Reward: {rewardText(c.reward)}</span>
              </>
            )}
            {c.n === done + 1 && !gated && (
              <>
                <ProgressBar value={Math.min(1, (a.sinceChapter[script.id] ?? 0) / chapterNeed(c.n))} color={script.color} className="chapter-progress" />
                <span className="small dim num">{a.sinceChapter[script.id] ?? 0} of {chapterNeed(c.n)} translated · Reward: {rewardText(c.reward)}</span>
              </>
            )}
          </li>
        ))}
      </ol>
      {!next && <p className="small dim">Every chapter translated.</p>}
      {a.secret[script.id] && (
        <div className="secret-chapter">
          <b>Secret: {SECRET_CHAPTERS[script.id].title}</b>
          {SECRET_CHAPTERS[script.id].lore.map((l) => <p key={l} className="chapter-lore">{l}</p>)}
          <span className="small dim">+{SECRET_DATA} Ancient Data and a glow on these relics</span>
        </div>
      )}
    </div>
  );
}

export function ChaptersView() {
  const s = useGame();
  return (
    <section>
      <SkillIntro step="Story Progression">
        Translating inscriptions completes story chapters, unlocking new Dig Sites, hidden chambers, merchant stock & Relic Forge forms
      </SkillIntro>
      <div className="section-head">
        <h3>Chapters</h3>
        <span className="dim small">Each chapter needs more translated inscriptions than the one before. Rewards open the trail.</span>
      </div>
      <div className="card-grid" style={{ ['--card-min' as string]: '320px', gap: 8 }}>
        {[...EARLY_SCRIPTS, 'first' as ScriptId].map((id) => <StoryCard key={id} s={s} script={SCRIPTS.find((x) => x.id === id)!} />)}
      </div>
      <p className="small dim">
        <MatIcon id={ROSETTA_STONE} size={12} /> A Rosetta Stone, found very rarely at the Imperial Adit, the Hollow Heart or the Sealed Reliquary, cracks glyphs in every script and opens a culture's secret chapter once you are three chapters in.
      </p>
    </section>
  );
}

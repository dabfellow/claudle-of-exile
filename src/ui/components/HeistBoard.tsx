import { MARKER } from '../../data/craftMats';
import { GEAR, HEIST_JOBS, heistJob, type HeistJob } from '../../data/heist';
import { ROGUES, SPECIALTIES, rogueLevelXp, talentPoints, type Rogue } from '../../data/rogues';
import { activeCrew, chooseTactic, learnTalent, matchesRoom, roomRevealed, roomSpecialty, scoutRoom, tacticReason, trainReason, trainRogue, vaultProfile } from '../../engine/rogues';
import { useState } from 'react';
import { materialDef } from '../../data/materials';
import { alarmChance, alarmKeeps, bestMark, cleanChance, crewSlots, heistGearTargetPool, jobBlocker, jobCost, jobExit, roomMs, setJobExit, setJobGearTarget, startHeist, stopHeistRepeat, toggleCrew, type HeistGearCategory } from '../../engine/heist';
import { stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, fmt, fmtTime, MatIcon, ProgressBar } from './common';
import { MasteryProgress } from './MasteryProgress';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const takeName = (id: string) => (id === GEAR ? 'Stolen rare gear' : materialDef(id).name);

/** The job under way: which room, what's in the bag, and how to get out of it. */
function JobRunning({ s }: { s: GameState }) {
  const a = s.action;
  if (a?.kind !== 'heist') return null;
  const job = heistJob(a.jobId);
  const interval = roomMs(s, job, deriveStats(s));
  return (
    <div className="card">
      <div className="card-title">
        {job.name}
        <span className="grow" />
        <span className="card-hint">{s.heist.auto ? 'Repeats, casing for Markers between runs' : 'Last run'}</span>
      </div>
      <p>
        Room <b className="num">{a.room}</b> of <b className="num">{a.lastRoom}</b> · <b className="num">{pct(alarmChance(s, job, a.room))}</b> chance of an alarm · an alarm keeps {pct(alarmKeeps(s))} of the take
      </p>
      <ProgressBar value={a.progress / interval} color="var(--success)" />
      <div className="callout" style={{ marginTop: 8 }}>
        <b>{roomRevealed(s) ? roomSpecialty(job, a.room) : 'Unscouted room'}</b>
        {!roomRevealed(s) && <button className="btn sm" title="Adds up to 3 seconds; Threat Reveal reduces this time" onClick={() => game.act(scoutRoom)}>Scout room</button>}
        {a.tactic ? <p className="small">{a.tactic === 'bypass' ? 'Bypass: skip safely; room loot left behind, vault retained.' : 'Greed: bonus loot, +15 percentage points of alarm risk.'}</p> : roomRevealed(s) && (
          <>
            <p className="dim small">Continue normally, or spend a matching rogue’s ability. Each rogue has one use per heist. Bypass skips safely and leaves room loot; Greed adds 50% room gold and drop chance with +15 percentage points alarm risk.</p>
            {activeCrew(s).filter((id) => matchesRoom(s, id, roomSpecialty(job, a.room))).map((id) => (
              <div key={id} className="row wrap small" style={{ marginTop: 4 }}>
                <span>{ROGUES.find((r) => r.id === id)?.name}</span>
                {(['bypass', 'greed'] as const).map((tactic) => {
                  const reason = tacticReason(s, id, tactic, job);
                  return <button key={tactic} className="btn sm" title={reason ?? ''} disabled={!!reason} onClick={() => game.act((st) => chooseTactic(st, id, tactic, job))}>{tactic === 'bypass' ? 'Bypass' : 'Greed'}</button>;
                })}
              </div>
            ))}
            {!activeCrew(s).some((id) => matchesRoom(s, id, roomSpecialty(job, a.room))) && <p className="dim small">No matching specialty in this crew.</p>}
          </>
        )}
      </div>
      <div className="row wrap" style={{ marginTop: 8 }}>
        <span className="dim small">Take so far:</span>
        {Object.entries(a.take).length ? (
          Object.entries(a.take).map(([id, n]) => (
            <span key={id} className="small">
              {id !== GEAR && <MatIcon id={id} size={12} />} {takeName(id)} <span className="num">×{fmt(n)}</span>
            </span>
          ))
        ) : (
          <span className="dim small">nothing yet</span>
        )}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        {s.heist.auto && (
          <button className="btn sm" onClick={() => game.act((st) => stopHeistRepeat(st))}>
            Stop after this job
          </button>
        )}
        <button className="btn sm danger" title="The Markers stay spent and the take is left behind" onClick={() => game.act((st) => stopAction(st))}>
          Abandon
        </button>
      </div>
    </div>
  );
}

function JobCard({ s, job }: { s: GameState; job: HeistJob }) {
  const blocker = jobBlocker(s, job);
  const exit = jobExit(s, job);
  const running = (s.action?.kind === 'heist' && s.action.jobId === job.id) || s.heist.auto === job.id;
  const cost = jobCost(s, job);
  const short = (s.account.bank[MARKER] ?? 0) < cost;
  const setExit = (room: number) => game.act((st) => setJobExit(st, job.id, room));
  const pay = job.vault.map((d) => takeName(d.id));
  const hasGear = job.drops.some((d) => d.id === GEAR) || job.vault.some((d) => d.id === GEAR);
  const gearPool = hasGear ? heistGearTargetPool(s, job) : null;
  const setGearTarget = (cat: HeistGearCategory) => game.act((st) => setJobGearTarget(st, job.id, cat));
  const cleanMilestone = s.professionProgress.discoveries[`heist_clean_${job.id}`];
  const profile = vaultProfile(job);
  const crewReady = s.heist.crew.length === 3;

  return (
    <div className={`card action-card ${running ? 'running' : ''} ${blocker ? 'locked' : ''}`}>
      <div className="row">
        <b>{job.name}</b>
        <span className="spacer" />
        {cleanMilestone && <Badge tone="success">Clean Exit</Badge>}
        <Badge tone="neutral">{job.favours}</Badge>
      </div>
      <p className="dim small">{job.desc}</p>
      <div className="row wrap small"><Badge tone="neutral">{profile.layout}</Badge><span>Tier {profile.tier} · Threat {profile.threat} · {job.rooms} rooms</span></div>
      <MasteryProgress s={s} mastery={job.mastery} compact />
      {blocker ? (
        <p className="lock-note small">{blocker}</p>
      ) : (
        <>
          <div className="row wrap small">
            <span className="num">{job.rooms} rooms</span>
            <span className="dim">·</span>
            <span className="num">{fmtTime(job.roomMs)} each</span>
            <span className="dim">·</span>
            <span>
              <MatIcon id={MARKER} size={12} /> <span className="num">{cost}</span> Markers
            </span>
          </div>
          <div className="row wrap small" style={{ marginTop: 6 }}>
            <span>Walk out after room</span>
            <button className="btn sm ghost" disabled={exit <= 1} onClick={() => setExit(exit - 1)} aria-label="One room fewer">−</button>
            <b className="num">{exit}</b>
            <button className="btn sm ghost" disabled={exit >= job.rooms} onClick={() => setExit(exit + 1)} aria-label="One room more">+</button>
            <span className="dim">
              {pct(cleanChance(s, job, exit))} clean · alarm keeps {pct(alarmKeeps(s))}{exit >= job.rooms ? ` · vault: ${pay.join(', ')}` : ' · no vault'}
            </span>
          </div>
          {gearPool && (
            <div className="row wrap small" style={{ marginTop: 6, gap: 4, alignItems: 'center' }}>
              <span className="dim">Target:</span>
              {(['all', 'weapon', 'armour', 'jewellery'] as const).map((cat) => (
                <button
                  key={cat}
                  className={`btn sm ${gearPool.category === cat ? 'selected' : 'ghost'}`}
                  style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                  onClick={() => setGearTarget(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
              <span className="dim" style={{ fontSize: '0.75rem' }}>
                ({gearPool.bases.length} bases, ilvl {gearPool.ilvl})
              </span>
            </div>
          )}
          {job.id === 'occult_treasury' && (
            <div className="small dim" style={{ marginTop: 6, fontSize: '0.75rem', lineHeight: 1.3 }}>
              Treasury Fragments: 1 per completed room (+4 on clean vault). Oath Fragments: 1 on clean vault, 1 every 12 rooms ({(s.professionProgress?.counters?.['thieving.treasury_rooms'] ?? 0) % 12}/12). Clean vault rolls 0.5% Borrowed Tomorrow jackpot.
            </div>
          )}
          <div className="row" style={{ marginTop: 8 }}>
            {running ? (
              <button className="btn sm" onClick={() => game.act((st) => stopAction(st))}>
                Stop
              </button>
            ) : (
              <button className="btn sm primary" disabled={!crewReady} title={!crewReady ? 'Select three available rogues' : short ? 'You will lift purses until you can pay' : ''} onClick={() => game.act((st, ctx) => startHeist(st, ctx, job.id))}>
                {!crewReady ? 'Select a crew of 3' : short ? 'Case the job' : 'Run on repeat'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RogueCard({ s, rogue }: { s: GameState; rogue: Rogue }) {
  const [specialty, setSpecialty] = useState(SPECIALTIES.find((x) => x !== rogue.primary)!);
  const r = s.heist.roster?.[rogue.id];
  if (!r) return null;
  const onCrew = s.heist.crew.includes(rogue.id);
  const running = s.action?.kind === 'heist';
  const reason = trainReason(s, rogue.id, specialty);
  return (
    <div className="mat" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
      <span className="row">
        <b>{rogue.name} · {rogue.class}</b>
        <span className="spacer" />
        <Badge tone={onCrew ? 'success' : 'neutral'}>Lv {r.level}</Badge>
      </span>
      <span className="dim small">
        <b>{rogue.primary}</b><br />Bonus: {rogue.secondary.join(' · ')}
      </span>
      <span className="small dim">Field Mastery: {r.xp}/{rogueLevelXp(r.level)} XP · +{Math.min(10, r.level) * 2}% matching room success · 25 XP per completed room</span>
      <ProgressBar value={r.level === 100 ? 1 : r.xp / rogueLevelXp(r.level)} color="var(--success)" />
      <span className="row">
          <button disabled={running || !!r.training} className={`btn sm ${onCrew ? 'selected' : ''}`} onClick={() => game.act((st) => toggleCrew(st, rogue.id))}>
            {onCrew ? 'On the crew' : 'Bring along'}
          </button>
      </span>
      {r.mastered.length > 0 && <span className="small">Mentored: {r.mastered.join(', ')}</span>}
      {r.training ? <p className="small">Training {r.training.specialty}: unavailable for {r.training.remaining} more completed heists.</p> : <>
        <label className="small">Mentor specialty<select aria-label={`${rogue.name} mentor specialty`} value={specialty} onChange={(e) => setSpecialty(e.target.value)}>{SPECIALTIES.filter((x) => x !== rogue.primary).map((x) => <option key={x}>{x}</option>)}</select></label>
        <button className="btn sm" disabled={!!reason} title={reason ?? 'Unavailable for two completed heists'} onClick={() => game.act((st) => trainRogue(st, rogue.id, specialty))}>Mentor training · 5,000 gold</button>
      </>}
      <details>
        <summary className="small">Talent tree · {r.talents.length}/10 · {talentPoints(r)} points available</summary>
        <p className="dim small">One point every five levels after Lv 10; first at Lv 15. Learn in order.</p>
        {rogue.talentTree.map((node) => <div key={node.id} style={{ marginTop: 6 }}>
          <button className={`btn sm ${r.talents.includes(node.id) ? 'selected' : ''}`} disabled={running || node.id !== r.talents.length + 1 || talentPoints(r) < 1} onClick={() => game.act((st) => learnTalent(st, rogue.id, node.id))}>{r.talents.includes(node.id) ? '✓ ' : ''}{node.name}</button>
          <div className="dim small">Tier {node.tier} · {node.effect}</div>
        </div>)}
      </details>
    </div>
  );
}

/** Thieving's other half: pick a job and how deep to go, set a crew, and let it repeat. */
export function HeistBoard({ view = 'all' }: { view?: 'all' | 'jobs' | 'crew' }) {
  const s = useGame();
  const { tally } = s.heist;
  const open = HEIST_JOBS.filter((j) => !jobBlocker(s, j));
  const next = HEIST_JOBS.find((j) => jobBlocker(s, j));
  const shown = next ? [...open, next] : open;
  const mark = bestMark(s);
  const casing = !!s.heist.auto && s.action?.kind === 'skill';
  return (
    <>
      {view !== 'crew' && (
        <div className="callout skill-note">
          Marks pay gold and Rogue's Markers (including 1 guaranteed Marker every 10 mark completions). Markers set up Heists: each room is richer and riskier, and the vault is in the last one. If short on Markers, repeats safely case the job on the best mark until funded. You have <b className="num">{fmt(s.account.bank[MARKER] ?? 0)}</b> Markers.
          {((s.account.bank.treasury_fragment ?? 0) > 0 || (s.account.bank.oath_fragment ?? 0) > 0) && (
            <div style={{ marginTop: 4 }}>
              Treasury reserves: <b className="num">{fmt(s.account.bank.treasury_fragment ?? 0)}</b> Treasury Fragments · <b className="num">{fmt(s.account.bank.oath_fragment ?? 0)}</b> Oath Fragments
            </div>
          )}
        </div>
      )}
      {view !== 'crew' && casing && mark && (
        <div className="callout skill-note">
          Casing {heistJob(s.heist.auto!).name}: lifting purses until you have <b className="num">{jobCost(s, heistJob(s.heist.auto!))}</b> Markers, then the job starts on its own.
        </div>
      )}
      {view !== 'crew' && <JobRunning s={s} />}
      {(view === 'all' || view === 'jobs') && (
        <section>
          <div className="section-head">
            <h3>Heists</h3>
            <span className="dim small">
              {tally.jobs} done · {tally.alarms} alarms
            </span>
          </div>
          <div className="action-grid">
            {shown.map((j) => (
              <JobCard key={j.id} s={s} job={j} />
            ))}
          </div>
        </section>
      )}
      {(view === 'all' || view === 'crew') && (
        <section>
          <div className="section-head">
            <h3>Crew</h3>
            <span className="dim small">
              {s.heist.crew.length} of {crewSlots(s)} places · 12 specialists
            </span>
          </div>
          <p className="small dim">Crew build: {s.heist.crew.map((id) => ROGUES.find((r) => r.id === id)?.primary).join(' · ')}. Selecting a fourth rogue replaces the first. Crew and talents stay fixed during a heist.</p>
          <div className="card-grid" style={{ ['--card-min' as string]: '220px', gap: 8 }}>
            {ROGUES.map((r) => (
              <RogueCard key={r.id} s={s} rogue={r} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

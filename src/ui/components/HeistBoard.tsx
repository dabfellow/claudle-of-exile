import { useState } from 'react';
import { MARKER } from '../../data/craftMats';
import { GEAR, HEIST_JOBS, type HeistJob } from '../../data/heist';
import { ROGUES, SPECIALTIES, rogueLevelXp, talentPoints, type Rogue } from '../../data/rogues';
import { materialDef } from '../../data/materials';
import { activeCrew, chooseTactic, learnTalent, matchesRoom, roomRevealed, roomSpecialty, scoutRoom, tacticReason, trainReason, trainRogue, vaultProfile } from '../../engine/rogues';
import { alarmChance, alarmKeeps, cleanChance, crewSlots, heistGearTargetPool, jobBlocker, jobCost, jobExit, roomMs, setJobExit, setJobGearTarget, startHeist, stopHeistRepeat, toggleCrew, type HeistGearCategory } from '../../engine/heist';
import { masteryLevel } from '../../engine/skillingMastery';
import { stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { Art, fmt, fmtTime, GameIcon, MatIcon, ProgressBar, Tooltip } from './common';
import { MasteryProgress, MasteryTip } from './MasteryProgress';
import { SkillMinigame } from './SkillMinigame';
import './thieving-ledger.css';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const takeName = (id: string) => (id === GEAR ? 'Stolen rare gear' : materialDef(id).name);

// Existing asset-pack art only, washed grey by the ledger's portrait style.
const ROGUE_PORTRAITS: Record<string, string> = {
  infiltrator: 'monsters/vaultthief', locksmith: 'monsters/gunner', lookout: 'monsters/informant',
  saboteur: 'monsters/powdermonkey', grifter: 'monsters/hexmerchant', bruiser: 'monsters/brute',
  shadow: 'monsters/stalker', tracker: 'monsters/outrider', pickpocket: 'monsters/lamplighter',
  hacker: 'monsters/indexer', acrobat: 'monsters/edgeskater', vigilante: 'monsters/bailiff',
};

function Portrait({ src, icon, large = false }: { src?: string; icon: string; large?: boolean }) {
  const fallback = <GameIcon name={icon} size={large ? 32 : 20} />;
  return <span className={`thief-portrait ${large ? 'large' : ''}`}>{src ? <Art src={src} alt="" size={large ? 64 : 36} fallback={fallback} /> : fallback}</span>;
}

/** A job is pictured by the prize in its vault. */
function JobPortrait({ job, large = false }: { job: HeistJob; large?: boolean }) {
  const prize = job.vault.find((d) => d.id !== GEAR && d.id !== 'gold')?.id ?? job.vault.find((d) => d.id !== GEAR)?.id;
  return <span className={`thief-portrait job ${large ? 'large' : ''}`}>{prize ? <MatIcon id={prize} size={large ? 40 : 22} /> : <GameIcon name="thieving" size={large ? 32 : 20} />}</span>;
}

function NextPerk({ s, mastery }: { s: GameState; mastery: HeistJob['mastery'] }) {
  if (!mastery) return null;
  const level = masteryLevel(s, mastery.id);
  const next = mastery.milestones.find((m) => m.level > level);
  return <Tooltip content={<MasteryTip s={s} mastery={mastery} />}><span className="thief-next-perk">{next ? `Next: ${next.name} · Mastery ${next.level}` : 'All mastery milestones unlocked'}</span></Tooltip>;
}

/** The job under way, inside its dossier: which room, what's in the bag, and how to get out of it. */
function JobRunning({ s, job }: { s: GameState; job: HeistJob }) {
  const a = s.action;
  if (a?.kind !== 'heist' || a.jobId !== job.id) return null;
  const interval = roomMs(s, job, deriveStats(s));
  const specialty = roomSpecialty(job, a.room);
  const matching = activeCrew(s).filter((id) => matchesRoom(s, id, specialty));
  return (
    <div className="thief-dossier-section">
      <h3>On the job</h3>
      <div className="thief-attempt"><span>Room <b className="num">{a.room}</b> of <b className="num">{a.lastRoom}</b> · {pct(alarmChance(s, job, a.room))} alarm chance</span><span className="num">{(a.progress / 1000).toFixed(1)} / {(interval / 1000).toFixed(1)}s</span></div>
      <ProgressBar value={a.progress / interval} color="#88682f" />
      <div className="thief-room">
        <div className="row"><b>{roomRevealed(s) ? specialty : 'Unscouted room'}</b><span className="spacer" />
          {!roomRevealed(s) && <button className="btn sm" title="Adds up to 3 seconds; Threat Reveal reduces this time" onClick={() => game.act(scoutRoom)}>Scout room</button>}
        </div>
        {a.tactic ? <p>{a.tactic === 'bypass' ? 'Bypass: skip safely; room loot left behind, vault retained.' : 'Greed: bonus loot, +15 percentage points of alarm risk.'}</p> : roomRevealed(s) && <>
          <p>Continue normally, or spend a matching rogue’s ability (one use each per heist). Bypass skips safely and leaves room loot; Greed adds 50% room gold and drop chance for +15 points of alarm risk.</p>
          {matching.map((id) => (
            <div key={id} className="row wrap thief-tactic">
              <span>{ROGUES.find((r) => r.id === id)?.name}</span><span className="spacer" />
              {(['bypass', 'greed'] as const).map((tactic) => {
                const reason = tacticReason(s, id, tactic, job);
                return <button key={tactic} className="btn sm" title={reason ?? ''} disabled={!!reason} onClick={() => game.act((st) => chooseTactic(st, id, tactic, job))}>{tactic === 'bypass' ? 'Bypass' : 'Greed'}</button>;
              })}
            </div>
          ))}
          {!matching.length && <p>No matching specialty in this crew.</p>}
        </>}
      </div>
      <div className="thief-reward"><b>Take so far</b><span className="spacer" />
        {Object.entries(a.take).length ? Object.entries(a.take).map(([id, n]) => <span key={id} className="num">{id !== GEAR && <MatIcon id={id} size={14} />} {takeName(id)} ×{fmt(n)}</span>) : <span className="num">nothing yet</span>}
      </div>
      <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
        {s.heist.auto && <button className="btn sm" onClick={() => game.act((st) => stopHeistRepeat(st))}>Stop after this job</button>}
        <button className="btn sm danger" title="The Markers stay spent and the take is left behind" onClick={() => game.act((st) => stopAction(st))}>Abandon</button>
      </div>
    </div>
  );
}

function JobDossier({ s, job }: { s: GameState; job: HeistJob }) {
  const blocker = jobBlocker(s, job);
  const exit = jobExit(s, job);
  const onJob = s.action?.kind === 'heist' && s.action.jobId === job.id;
  const casing = s.heist.auto === job.id && s.action?.kind === 'skill';
  const repeating = onJob || s.heist.auto === job.id;
  const cost = jobCost(s, job);
  const short = (s.storage.bank[MARKER] ?? 0) < cost;
  const profile = vaultProfile(job);
  const crewReady = s.heist.crew.length === 3;
  const gearPool = job.drops.some((d) => d.id === GEAR) || job.vault.some((d) => d.id === GEAR) ? heistGearTargetPool(s, job) : null;
  const setExit = (room: number) => game.act((st) => setJobExit(st, job.id, room));
  const setGearTarget = (cat: HeistGearCategory) => game.act((st) => setJobGearTarget(st, job.id, cat));

  return (
    <section className="thief-dossier" aria-label={`${job.name} dossier`}>
      <div className="thief-paper-clip" aria-hidden />
      <div className="thief-dossier-heading">
        <JobPortrait job={job} large />
        <div>
          <span className="thief-dossier-kicker">Heist · Lv {job.level} · {profile.layout}{s.professionProgress.discoveries[`heist_clean_${job.id}`] ? ' · Clean exit' : ''}</span>
          <h2>{job.name}</h2>
          <span className="num">{job.rooms} rooms · {fmtTime(job.roomMs)} each · Threat {profile.threat}</span>
        </div>
      </div>
      <p className="thief-dossier-desc">{job.desc}</p>

      <div className="thief-rewards">
        <h3>Vault</h3>
        {job.vault.map((d) => <div className="thief-reward" key={d.id}>{d.id !== GEAR && <MatIcon id={d.id} size={20} />}<b>{takeName(d.id)}</b><span className="spacer" /><span className="num">×{fmt(d.qty)}{d.chance < 1 && ` · ${pct(d.chance)}`}</span></div>)}
        <h3 style={{ marginTop: 14 }}>Each room</h3>
        <div className="thief-reward"><MatIcon id="gold" size={20} /><b>Gold</b><span className="spacer" /><span className="num">{job.gold} × room number</span></div>
        {job.drops.map((d) => <div className="thief-reward" key={d.id}>{d.id !== GEAR && <MatIcon id={d.id} size={20} />}<b>{takeName(d.id)}</b><span className="spacer" /><span className="num">×{d.qty} · {+(d.chance * 100).toFixed(1)}% × room number</span></div>)}
        {job.id === 'occult_treasury' && <p className="thief-reward-note">Treasury Fragments: 1 per completed room (+4 on a clean vault). Oath Fragments: 1 on a clean vault, 1 every 12 rooms ({(s.professionProgress?.counters?.['thieving.treasury_rooms'] ?? 0) % 12}/12). A clean vault rolls a 0.5% Borrowed Tomorrow jackpot.</p>}
      </div>

      {onJob ? <JobRunning s={s} job={job} /> : (
        <div className="thief-dossier-action">
          {blocker ? <p className="thief-blocker"><GameIcon name="lock" size={14} /> {blocker}</p> : <>
            <div className="thief-plan">
              <span>Walk out after room</span>
              <button className="btn sm ghost" disabled={exit <= 1} onClick={() => setExit(exit - 1)} aria-label="One room fewer">−</button>
              <b className="num">{exit}</b>
              <button className="btn sm ghost" disabled={exit >= job.rooms} onClick={() => setExit(exit + 1)} aria-label="One room more">+</button>
              <span className="spacer" />
              <span className="num">{pct(cleanChance(s, job, exit))} clean · {exit >= job.rooms ? 'vault' : 'no vault'}</span>
            </div>
            <p className="thief-reward-note" style={{ marginTop: 4 }}>An alarm keeps {pct(alarmKeeps(s))} of the take.</p>
            {gearPool && <div className="thief-plan">
              <span>Gear target</span>
              {(['all', 'weapon', 'armour', 'jewellery'] as const).map((cat) => <button key={cat} className={`btn sm ${gearPool.category === cat ? 'selected' : 'ghost'}`} onClick={() => setGearTarget(cat)}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</button>)}
              <span className="num">{gearPool.bases.length} bases · ilvl {gearPool.ilvl}</span>
            </div>}
            <div className="thief-attempt"><span><MatIcon id={MARKER} size={14} /> {cost} Markers to set up</span><span className="num">you have {fmt(s.storage.bank[MARKER] ?? 0)}</span></div>
            {repeating ? <button className="btn thief-pickpocket" onClick={() => game.act((st) => stopAction(st))}>Stop</button>
              : <button className="btn thief-pickpocket" disabled={!crewReady} title={!crewReady ? 'Pick three rogues on the Rogue Crew tab' : short ? 'You will lift purses until you can pay' : ''} onClick={() => game.act((st, ctx) => startHeist(st, ctx, job.id))}>
                <GameIcon name="thieving" size={17} /> {!crewReady ? 'Pick a crew of 3 first' : short ? 'Case the job' : 'Run on repeat'}
              </button>}
            {casing && <p className="thief-reward-note">Casing: lifting purses until you have {cost} Markers, then the job starts on its own.</p>}
          </>}
        </div>
      )}

      <div className="thief-dossier-mastery"><MasteryProgress s={s} mastery={job.mastery} compact /><NextPerk s={s} mastery={job.mastery} /></div>
      {(onJob || casing) && <div className="thief-focus"><SkillMinigame skill="thieving" /></div>}
    </section>
  );
}

function HeistLedger() {
  const s = useGame();
  const runningId = s.action?.kind === 'heist' ? s.action.jobId : s.heist.auto || null;
  const open = HEIST_JOBS.filter((j) => !jobBlocker(s, j));
  const [selectedId, setSelectedId] = useState(() => runningId ?? open.at(-1)?.id ?? HEIST_JOBS[0].id);
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const job = HEIST_JOBS.find((j) => j.id === selectedId) ?? HEIST_JOBS[0];
  const shown = onlyUnlocked ? open : HEIST_JOBS;
  const { tally } = s.heist;

  return <div className="thief-workspace">
    <section className="card thief-ledger" aria-label="Heist ledger">
      <div className="thief-ledger-title"><h2>Heist Operations</h2><span className="dim small num">{tally.jobs} done · {tally.alarms} alarms</span><button className="btn sm ghost" onClick={() => setOnlyUnlocked((v) => !v)}>{onlyUnlocked ? 'Show all' : 'Unlocked only'}</button></div>
      <div className="thief-group">
        <div className="thief-columns" aria-hidden><span>Job</span><span>Level</span><span>Rooms</span><span>Cost</span><span>Mastery</span></div>
        {shown.map((j) => {
          const reason = jobBlocker(s, j);
          return <button key={j.id} className={`thief-target ${job.id === j.id ? 'selected' : ''} ${reason ? 'locked' : ''}`} aria-pressed={job.id === j.id} title={reason ?? `View ${j.name}`} onClick={() => setSelectedId(j.id)}>
            <span className="thief-target-name"><JobPortrait job={j} /><span><b>{j.name}</b>{runningId === j.id ? <small className="thief-working">{s.action?.kind === 'heist' ? `On the job · room ${s.action.room}` : 'Casing the job'}</small> : <small className="thief-sub">{j.favours}</small>}</span>{reason && <GameIcon name="lock" size={12} />}</span>
            <span className="num thief-cell" data-label="Level">{j.level}</span>
            <span className="num thief-cell" data-label="Rooms">{j.rooms}</span>
            <span className="num thief-cell" data-label="Cost">{jobCost(s, j)}</span>
            <span className="num thief-cell thief-mastery-number" data-label="Mastery">{j.mastery ? masteryLevel(s, j.mastery.id) : '—'}</span>
          </button>;
        })}
        {!shown.length && <p className="dim small">No unlocked heists yet.</p>}
      </div>
      <div className="thief-marker-note">
        <div className="row"><MatIcon id={MARKER} size={18} /><b>Rogue’s Markers</b><span className="spacer" /><span className="num">{fmt(s.storage.bank[MARKER] ?? 0)}</span></div>
        <p>Marks pay Markers, and Markers set up Heists. Each room is richer and riskier than the last, and the vault is in the final room. Short on Markers, a repeating job cases itself on your best mark until it is funded.</p>
        {((s.storage.bank.treasury_fragment ?? 0) > 0 || (s.storage.bank.oath_fragment ?? 0) > 0) && <p>Treasury Fragments: {fmt(s.storage.bank.treasury_fragment ?? 0)} · Oath Fragments: {fmt(s.storage.bank.oath_fragment ?? 0)}</p>}
      </div>
    </section>
    <JobDossier s={s} job={job} />
  </div>;
}

function RogueDossier({ s, rogue }: { s: GameState; rogue: Rogue }) {
  const [specialty, setSpecialty] = useState(SPECIALTIES.find((x) => x !== rogue.primary)!);
  const r = s.heist.roster?.[rogue.id];
  if (!r) return null;
  const onCrew = s.heist.crew.includes(rogue.id);
  const running = s.action?.kind === 'heist';
  const reason = trainReason(s, rogue.id, specialty);
  return (
    <section className="thief-dossier" aria-label={`${rogue.name} dossier`}>
      <div className="thief-paper-clip" aria-hidden />
      <div className="thief-dossier-heading">
        <Portrait src={ROGUE_PORTRAITS[rogue.id]} icon="thieving" large />
        <div>
          <span className="thief-dossier-kicker">Rogue · {rogue.class}{onCrew ? ' · On the crew' : ''}</span>
          <h2>{rogue.name}</h2>
          <span className="num">Lv {r.level} · {r.talents.length}/10 talents</span>
        </div>
      </div>
      <div className="thief-rewards">
        <h3>Specialties</h3>
        <div className="thief-reward"><b>{rogue.primary}</b><span className="spacer" /><span className="num">Primary</span></div>
        {rogue.secondary.map((x) => <div className="thief-reward" key={x}><span>{x}</span><span className="spacer" /><span className="num">Bonus</span></div>)}
        {r.mastered.length > 0 && <div className="thief-reward"><span>Mentored: {r.mastered.join(', ')}</span></div>}
        <p className="thief-reward-note">+{Math.min(10, r.level) * 2}% success in matching rooms. 25 field XP per completed room.</p>
      </div>
      <div className="thief-dossier-action">
        <button className="btn thief-pickpocket" disabled={running || !!r.training} title={running ? 'The crew is fixed during a heist' : r.training ? 'In training' : ''} onClick={() => game.act((st) => toggleCrew(st, rogue.id))}>
          {onCrew ? 'Leave behind' : 'Bring along'}
        </button>
        <div className="thief-attempt"><span>Field mastery</span><span className="num">{r.level === 100 ? 'Max' : `${fmt(r.xp)} / ${fmt(rogueLevelXp(r.level))} XP`}</span></div>
        <ProgressBar value={r.level === 100 ? 1 : r.xp / rogueLevelXp(r.level)} color="#88682f" />
      </div>
      <div className="thief-dossier-section">
        <h3>Mentor training</h3>
        {r.training ? <p className="thief-reward-note">Training {r.training.specialty}: away for {r.training.remaining} more completed heists.</p> : <div className="thief-plan">
          <select aria-label={`${rogue.name} mentor specialty`} value={specialty} onChange={(e) => setSpecialty(e.target.value)}>{SPECIALTIES.filter((x) => x !== rogue.primary).map((x) => <option key={x}>{x}</option>)}</select>
          <span className="spacer" />
          <button className="btn sm" disabled={!!reason} title={reason ?? 'Away for two completed heists'} onClick={() => game.act((st) => trainRogue(st, rogue.id, specialty))}>Train · 5,000 gold</button>
        </div>}
      </div>
      <div className="thief-dossier-section">
        <h3>Talents · {talentPoints(r)} {talentPoints(r) === 1 ? 'point' : 'points'} to spend</h3>
        <p className="thief-reward-note" style={{ marginTop: 0 }}>One point every five levels after Lv 10, the first at Lv 15. Learn them in order.</p>
        {rogue.talentTree.map((node) => {
          const learned = r.talents.includes(node.id);
          const learnable = !running && node.id === r.talents.length + 1 && talentPoints(r) >= 1;
          return <div key={node.id} className={`thief-talent ${learned ? 'learned' : ''}`}>
            <span className="num">{node.id}</span>
            <span><b>{node.name}</b><small>Tier {node.tier} · {node.effect}</small></span>
            {learned ? <span className="num">✓</span> : <button className="btn sm" disabled={!learnable} onClick={() => game.act((st) => learnTalent(st, rogue.id, node.id))}>Learn</button>}
          </div>;
        })}
      </div>
    </section>
  );
}

function CrewLedger() {
  const s = useGame();
  const [selectedId, setSelectedId] = useState(() => s.heist.crew[0] ?? ROGUES[0].id);
  const rogue = ROGUES.find((r) => r.id === selectedId) ?? ROGUES[0];
  const crewSet = (onCrew: boolean) => ROGUES.filter((r) => s.heist.crew.includes(r.id) === onCrew);
  const row = (r: Rogue) => {
    const p = s.heist.roster?.[r.id];
    const onCrew = s.heist.crew.includes(r.id);
    return <button key={r.id} className={`thief-target crew ${rogue.id === r.id ? 'selected' : ''}`} aria-pressed={rogue.id === r.id} title={`View ${r.name}`} onClick={() => setSelectedId(r.id)}>
      <span className="thief-target-name"><Portrait src={ROGUE_PORTRAITS[r.id]} icon="thieving" /><span><b>{r.name} · {r.class}</b>{p?.training ? <small className="thief-sub">Training {p.training.specialty}</small> : onCrew ? <small className="thief-working">On the crew</small> : <small className="thief-sub">{r.primary}</small>}</span></span>
      <span className="num thief-cell" data-label="Level">{p?.level ?? 1}</span>
      <span className="num thief-cell" data-label="Talents">{p ? `${p.talents.length}/10` : '—'}</span>
      <span className="num thief-cell thief-mastery-number" data-label="Points">{p ? talentPoints(p) : 0}</span>
    </button>;
  };
  return <div className="thief-workspace">
    <section className="card thief-ledger" aria-label="Rogue crew ledger">
      <div className="thief-ledger-title"><h2>Rogue Crew</h2><span className="dim small num">{s.heist.crew.length} of {crewSlots(s)} places</span></div>
      <div className="thief-group">
        <div className="thief-group-heading" role="heading" aria-level={3}><b>On the crew</b><span className="spacer" /><span className="num">{s.heist.crew.length}/{crewSlots(s)}</span></div>
        <div className="thief-columns crew" aria-hidden><span>Rogue</span><span>Level</span><span>Talents</span><span>Points</span></div>
        {crewSet(true).map(row)}
        {!s.heist.crew.length && <p className="dim small">Nobody yet. Pick a rogue and choose Bring along.</p>}
      </div>
      <div className="thief-group">
        <div className="thief-group-heading" role="heading" aria-level={3}><b>Available</b><span className="spacer" /><span className="num">{crewSet(false).length}</span></div>
        {crewSet(false).map(row)}
      </div>
      <div className="thief-marker-note">
        <p>A heist needs three rogues. Bringing along a fourth sends the first one home. The crew and their talents stay fixed while a heist is under way.</p>
      </div>
    </section>
    <RogueDossier key={rogue.id} s={s} rogue={rogue} />
  </div>;
}

/** Thieving's other half: the heist ledger and the crew ledger, each beside a dossier. */
export function HeistBoard({ view }: { view: 'jobs' | 'crew' }) {
  return view === 'crew' ? <CrewLedger /> : <HeistLedger />;
}

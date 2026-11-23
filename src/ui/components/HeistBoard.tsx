import { useState } from 'react';
import { GEAR, HEIST_JOBS, PREP_CAP, prepBoard, prepDef, type HeistJob } from '../../data/heist';
import { actionsFor } from '../../data/skills';
import { ROGUES, SPECIALTIES, rogueLevelXp, talentPoints, type Rogue } from '../../data/rogues';
import { materialDef } from '../../data/materials';
import { activeCrew, chooseTactic, learnTalent, matchesRoom, roomRevealed, roomSpecialty, scoutRoom, tacticReason, trainReason, trainRogue, vaultProfile } from '../../engine/rogues';
import { alarmChance, alarmKeeps, canStartJob, cleanChance, crewSlots, heistGearTargetPool, jobBlocker, jobExit, prepChance, prepHeld, prepKindsHeld, roomMs, setJobExit, setJobGearTarget, setPlannedJob, startHeist, stopHeistRepeat, toggleCrew, type HeistGearCategory } from '../../engine/heist';
import { masteryLevel } from '../../engine/skillingMastery';
import { startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { Art, Badge, EmptyState, fmt, fmtTime, GameIcon, MatIcon, ProgressBar, Tooltip } from './common';
import { HelpTip, LockedBadge, SkillIntro } from './SkillHelp';
import { MasteryProgress, MasteryTip } from './MasteryProgress';
import { SkillMinigame } from './SkillMinigame';
import './thieving-ledger.css';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const takeName = (id: string) => (id === GEAR ? 'Stolen rare gear' : materialDef(id).name);
const PREP_MONOGRAM: Record<string, string> = { key: 'K', ledger: 'L', patrol: 'P', uniform: 'U', plan: 'F' };
const TALENT_TIERS: Record<number, string> = { 1: 'Tier 1 · Expertise', 5: 'Tier 2 · Greed Mastery', 10: 'Tier 3 · Signature' };

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
        <button className="btn sm danger" title="The prep stays spent and the take is left behind" onClick={() => game.act((st) => stopAction(st))}>Abandon</button>
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
  const startBlock = canStartJob(s, job.id);
  const board = prepBoard(job.id);
  const held = prepHeld(s, job.id);
  const planned = s.heist.planned === job.id;
  const workingMark = s.action?.kind === 'skill' ? s.action.actionId : null;
  const profile = vaultProfile(job);
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

      {(() => {
        const activePrep = s.action?.kind === 'heist' && s.action.jobId === job.id ? (s.action.prep ?? []) : null;
        const hasLedger = activePrep ? activePrep.includes('ledger') : (held.ledger ?? 0) > 0;
        const hasKey = activePrep ? activePrep.includes('key') : (held.key ?? 0) > 0;
        const currentRoom = onJob && s.action?.kind === 'heist' ? s.action.room : 0;
        const nodes: { roomNumber: number; label: string; kind: 'room' | 'hidden' | 'vault' }[] = [];
        for (let r = 1; r < job.rooms; r++) nodes.push({ roomNumber: r, label: `R${r}`, kind: 'room' });
        if (hasLedger) nodes.push({ roomNumber: job.rooms, label: 'Hidden', kind: 'hidden' });
        nodes.push({ roomNumber: job.rooms + (hasLedger ? 1 : 0), label: 'Vault', kind: 'vault' });
        return (
          <div className="thief-blueprint" aria-label="Vault blueprint corridor">
            <div className="thief-blueprint-head">
              <span>Vault Blueprint</span>
              <span className="num small">{nodes.length} stages{hasKey ? ' · Vault keyed' : ''}</span>
            </div>
            <div className="thief-blueprint-track">
              {nodes.map((node, idx) => {
                const cleared = onJob && node.roomNumber < currentRoom;
                const active = onJob && node.roomNumber === currentRoom;
                const isExit = exit >= job.rooms ? node.kind === 'vault' : node.roomNumber === exit;
                return (
                  <div className="thief-blueprint-step" key={`${node.kind}:${node.roomNumber}`}>
                    {idx > 0 && <span className={`thief-blueprint-link ${cleared || active ? 'lit' : ''}`} aria-hidden />}
                    <span className={`thief-blueprint-node ${node.kind} ${cleared ? 'cleared' : ''} ${active ? 'active' : ''}`}>
                      <b>{node.label}</b>
                      {node.kind === 'vault' && hasKey && <small className="thief-bp-key">Key</small>}
                      {isExit && <small className="thief-bp-exit">Exit</small>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="thief-rewards">
        <h3>Vault</h3>
        {job.vault.map((d) => <div className="thief-reward" key={d.id}>{d.id !== GEAR && <MatIcon id={d.id} size={20} />}<b>{takeName(d.id)}</b><span className="spacer" /><span className="num">×{fmt(d.qty)}{d.chance < 1 && ` · ${pct(d.chance)}`}</span></div>)}
        <h3 style={{ marginTop: 14 }}>Each room</h3>
        <div className="thief-reward"><MatIcon id="gold" size={20} /><b>Gold</b><span className="spacer" /><span className="num">{job.gold} × room number</span></div>
        {job.drops.map((d) => <div className="thief-reward" key={d.id}>{d.id !== GEAR && <MatIcon id={d.id} size={20} />}<b>{takeName(d.id)}</b><span className="spacer" /><span className="num">×{d.qty} · {+(d.chance * 100).toFixed(1)}% × room number</span></div>)}
        {job.id === 'occult_treasury' && <p className="thief-reward-note">Treasury Fragments: 1 per completed room (+4 on a clean vault). Oath Fragments: 1 on a clean vault, 1 every 12 rooms ({(s.professionProgress?.counters?.['thieving.treasury_rooms'] ?? 0) % 12}/12). A clean vault rolls a 0.5% Borrowed Tomorrow jackpot.</p>}
      </div>

      {!blocker && board.items.length > 0 && <div className="thief-rewards thief-prep" aria-label="Prep board">
        <div className="thief-prep-head">
          <h3>Prep board</h3>
          <HelpTip tip="Street Marks drop prep items for jobs whose level you meet. Plan a job to mark helpful Street Marks, then hold the minimum items to start. Each run consumes 1 of each held item for its bonus." />
          <span className="spacer" />
          <button className={`btn sm ${planned ? 'selected' : 'ghost'}`} aria-pressed={planned} title="Marks that can give prep for this job get a badge" onClick={() => game.act((st) => { setPlannedJob(st, planned ? null : job.id); })}>{planned ? 'Planned job' : 'Plan this job'}</button>
        </div>
        <p className="thief-reward-note">Hold {board.min} different items to start. Each run uses one of each you hold, up to {PREP_CAP} stored.</p>
        {board.items.map((e) => {
          const def = prepDef(e.kind);
          const mark = actionsFor('thieving').find((a) => a.id === e.mark);
          const n = held[e.kind] ?? 0;
          const working = workingMark === e.mark;
          const dropPct = +(prepChance(s, e.mark) * 100).toFixed(1);
          return <div className="thief-prep-item" key={e.kind}>
            <span className="thief-prep-monogram" aria-hidden>{PREP_MONOGRAM[e.kind] ?? '?'}</span>
            <div className="thief-prep-text">
              <span className="thief-prep-name">
                <b>{def.name}</b>
                <HelpTip tip={`${def.effect} Drops from ${mark?.name ?? e.mark} (${dropPct}% per completion, max ${PREP_CAP} stored). One is consumed per run.`} />
              </span>
              <small>{def.effect}</small>
              <small>From {mark?.name ?? e.mark} ({dropPct}%)</small>
            </div>
            <span className="thief-prep-held-wrap" title="Held">
              <span className="thief-prep-pips" aria-hidden>
                {Array.from({ length: PREP_CAP }, (_, i) => <span key={i} className={`thief-prep-pip ${i < n ? 'on' : ''}`} />)}
              </span>
              <span className="num thief-prep-held">{n}/{PREP_CAP}</span>
            </span>
            <button className="btn sm" disabled={!mark || working} onClick={() => game.act((st, ctx) => { startSkillAction(st, ctx, e.mark); })}>{working ? 'Working' : 'Work this mark'}</button>
          </div>;
        })}
      </div>}

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
            {repeating ? <button className="btn thief-pickpocket" onClick={() => game.act((st) => stopAction(st))}>Stop</button>
              : <button className="btn thief-pickpocket" disabled={!!startBlock} title={startBlock ?? ''} onClick={() => game.act((st, ctx) => startHeist(st, ctx, job.id))}>
                <GameIcon name="thieving" size={17} /> {startBlock ?? 'Start job'}
              </button>}
            {casing && <p className="thief-reward-note">Casing: working street marks for prep, then the job starts on its own.</p>}
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
  const nextLocked = HEIST_JOBS.find((j) => !!jobBlocker(s, j));
  const [selectedId, setSelectedId] = useState(() => runningId ?? open.at(-1)?.id ?? HEIST_JOBS[0].id);
  const [onlyUnlocked, setOnlyUnlocked] = useState(true);
  const job = HEIST_JOBS.find((j) => j.id === selectedId) ?? HEIST_JOBS[0];
  const shown = onlyUnlocked ? [...open, ...(nextLocked ? [nextLocked] : [])] : HEIST_JOBS;
  const { tally } = s.heist;
  const unlockedCount = s.heist.unlockedRogues?.length ?? 0;
  const crewCount = activeCrew(s).length;

  return <>
    <SkillIntro
      step="How Heists work"
      action={unlockedCount < 3
        ? <Badge tone="warn">Recruits: {unlockedCount}/3</Badge>
        : crewCount !== 3
          ? <Badge tone="warn">Crew: {crewCount}/3</Badge>
          : <Badge tone="success">Crew ready: 3/3</Badge>}
    >
      Plan a job → find Prep items on Street Marks → run the Heist with a 3-rogue crew
    </SkillIntro>
    <div className="thief-workspace">
    <section className="card thief-ledger" aria-label="Heist ledger">
      <div className="thief-ledger-title"><h2>Heist Operations</h2><span className="dim small num">{tally.jobs} done · {tally.alarms} alarms</span><button className="btn sm ghost" onClick={() => setOnlyUnlocked((v) => !v)}>{onlyUnlocked ? `Show all (${HEIST_JOBS.length})` : 'Unlocked only'}</button></div>
      <div className="thief-group">
        <div className="thief-columns" aria-hidden><span>Job</span><span>Level</span><span>Rooms</span><span>Prep</span><span>Mastery</span></div>
        {shown.map((j) => {
          const reason = jobBlocker(s, j);
          return <button key={j.id} className={`thief-target ${job.id === j.id ? 'selected' : ''} ${reason ? 'locked' : ''}`} aria-pressed={job.id === j.id} title={reason ?? `View ${j.name}`} onClick={() => setSelectedId(j.id)}>
            <span className="thief-target-name"><JobPortrait job={j} /><span><b>{j.name}</b>{runningId === j.id ? <small className="thief-working">{s.action?.kind === 'heist' ? `On the job · room ${s.action.room}` : 'Casing the job'}</small> : <small className="thief-sub">{j.favours}</small>}</span>{reason && <LockedBadge level={j.level} reason={reason} />}</span>
            <span className="num thief-cell" data-label="Level">{j.level}</span>
            <span className="num thief-cell" data-label="Rooms">{j.rooms}</span>
            <span className="num thief-cell thief-prep-cell" data-label="Prep">
              <span className="thief-prep-pips" aria-hidden>
                {Array.from({ length: prepBoard(j.id).min }, (_, idx) => (
                  <span key={idx} className={`thief-prep-pip ${idx < prepKindsHeld(s, j.id) ? 'on' : ''}`} />
                ))}
              </span>
              <span>{prepKindsHeld(s, j.id)}/{prepBoard(j.id).min}</span>
            </span>
            <span className="num thief-cell thief-mastery-number" data-label="Mastery">{j.mastery ? masteryLevel(s, j.mastery.id) : '—'}</span>
          </button>;
        })}
        {!shown.length && <p className="dim small">No unlocked heists yet.</p>}
      </div>
      <div className="thief-marker-note">
        <p>Street marks sometimes turn up prep, and prep sets up Heists. Each room is richer and riskier than the last, and the vault is in the final room. Short on prep, a repeating job works the marks that supply it until you can start.</p>
        {((s.storage.bank.treasury_fragment ?? 0) > 0 || (s.storage.bank.oath_fragment ?? 0) > 0) && <p>Treasury Fragments: {fmt(s.storage.bank.treasury_fragment ?? 0)} · Oath Fragments: {fmt(s.storage.bank.oath_fragment ?? 0)}</p>}
      </div>
    </section>
    <JobDossier s={s} job={job} />
  </div>
  </>;
}

function RogueDossier({ s, rogue }: { s: GameState; rogue: Rogue }) {
  const r = s.heist.roster?.[rogue.id];
  const availableSpecialties = SPECIALTIES.filter((x) => x !== rogue.primary && !(r?.mastered ?? []).includes(x));
  const [specialty, setSpecialty] = useState(availableSpecialties[0] ?? '');
  if (!r) return null;
  const chosenSpecialty = availableSpecialties.includes(specialty) ? specialty : (availableSpecialties[0] ?? '');
  const onCrew = s.heist.crew.includes(rogue.id);
  const running = s.action?.kind === 'heist';
  const reason = chosenSpecialty ? trainReason(s, rogue.id, chosenSpecialty) : 'All room specialties mastered';
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
        <div className="thief-prep-head" style={{ marginBottom: 12 }}>
          <h3>Mentor training</h3>
          <HelpTip tip="Pay 5,000 gold to teach this rogue an extra room specialty. They step off the active crew for 2 completed heists (even if an alarm sounds) and keep the mastery permanently." />
        </div>
        {r.training ? (
          <p className="thief-reward-note">Training {r.training.specialty}: away for {r.training.remaining} more completed heists.</p>
        ) : availableSpecialties.length === 0 ? (
          <p className="thief-reward-note">All room specialties mastered.</p>
        ) : (
          <div className="thief-mentor-wrap">
            <div className="thief-mentor-pills" role="radiogroup" aria-label={`${rogue.name} mentor specialty`}>
              {availableSpecialties.map((x) => (
                <button
                  key={x}
                  type="button"
                  role="radio"
                  aria-checked={chosenSpecialty === x}
                  className={`btn sm ${chosenSpecialty === x ? 'selected' : 'ghost'}`}
                  onClick={() => setSpecialty(x)}
                >
                  {x}
                </button>
              ))}
            </div>
            <div className="thief-plan" style={{ marginTop: 8, marginBottom: 0 }}>
              <span className="spacer" />
              <button className="btn sm" disabled={!!reason} title={reason ?? 'Away for two completed heists'} onClick={() => game.act((st) => trainRogue(st, rogue.id, chosenSpecialty))}>Train {chosenSpecialty} · 5,000 gold</button>
            </div>
          </div>
        )}
      </div>
      <div className="thief-dossier-section">
        <h3>Talents · {talentPoints(r)} {talentPoints(r) === 1 ? 'point' : 'points'} to spend</h3>
        <p className="thief-reward-note" style={{ marginTop: 0 }}>One point every five levels after Lv 10, the first at Lv 15. Learn them in order.</p>
        {rogue.talentTree.map((node) => {
          const learned = r.talents.includes(node.id);
          const learnable = !running && node.id === r.talents.length + 1 && talentPoints(r) >= 1;
          const tierHeader = TALENT_TIERS[node.id];
          return <div key={node.id}>
            {tierHeader && <div className="thief-talent-tier">{tierHeader}</div>}
            <div className={`thief-talent ${learned ? 'learned' : ''}`}>
              <span className="num">{node.id}</span>
              <span><b>{node.name}</b><small>Tier {node.tier} · {node.effect}</small></span>
              {learned ? <span className="num">✓</span> : <button className="btn sm" disabled={!learnable} onClick={() => game.act((st) => learnTalent(st, rogue.id, node.id))}>Learn</button>}
            </div>
          </div>;
        })}
      </div>
    </section>
  );
}

function CrewLedger() {
  const s = useGame();
  const unlockedIds = s.heist.unlockedRogues ?? [];
  const unlockedRogues = ROGUES.filter((r) => unlockedIds.includes(r.id));
  const [selectedId, setSelectedId] = useState(() => s.heist.crew[0] ?? unlockedRogues[0]?.id ?? '');
  const rogue = unlockedRogues.find((r) => r.id === selectedId) ?? unlockedRogues.find((r) => s.heist.crew.includes(r.id)) ?? unlockedRogues[0] ?? null;
  const crewSet = (onCrew: boolean) => unlockedRogues.filter((r) => s.heist.crew.includes(r.id) === onCrew);
  const row = (r: Rogue) => {
    const p = s.heist.roster?.[r.id];
    const onCrew = s.heist.crew.includes(r.id);
    return <button key={r.id} className={`thief-target crew ${rogue?.id === r.id ? 'selected' : ''}`} aria-pressed={rogue?.id === r.id} title={`View ${r.name}`} onClick={() => setSelectedId(r.id)}>
      <span className="thief-target-name"><Portrait src={ROGUE_PORTRAITS[r.id]} icon="thieving" /><span><b>{r.name} · {r.class}</b>{p?.training ? <small className="thief-sub">Training {p.training.specialty}</small> : onCrew ? <small className="thief-working">On the crew</small> : <small className="thief-sub">{r.primary}</small>}</span></span>
      <span className="num thief-cell" data-label="Level">{p?.level ?? 1}</span>
      <span className="num thief-cell" data-label="Talents">{p ? `${p.talents.length}/10` : '—'}</span>
      <span className="num thief-cell thief-mastery-number" data-label="Points">{p ? talentPoints(p) : 0}</span>
    </button>;
  };
  return <>
    <SkillIntro
      step="Recruit & assign 3 rogues"
      action={<Badge tone={unlockedRogues.length >= 3 ? 'success' : 'neutral'}>Recruited {unlockedRogues.length} / {ROGUES.length}</Badge>}
    >
      Work Street Marks to discover rogue contacts, then click Bring along to put 3 on your crew
    </SkillIntro>
    {unlockedRogues.length === 0 ? (
      <div className="thief-workspace single">
        <section className="card thief-ledger" aria-label="Rogue crew ledger">
          <div className="thief-ledger-title">
            <h2>Rogue Crew</h2>
            <span className="dim small num">Recruited 0 / {ROGUES.length} · 0 of {crewSlots(s)} on crew</span>
          </div>
          <EmptyState icon={<GameIcon name="thieving" size={28} />} title="No contacts yet">
            Work Street Marks to discover rogue contacts looking for work. Your first 3 recruits are guaranteed within 3, 7, and 12 Street Mark completions — then return here and click Bring along to form a 3-rogue Heist crew.
          </EmptyState>
        </section>
      </div>
    ) : (
      <>
        <section className="card thief-safehouse" aria-label="Active heist crew">
          <div className="thief-safehouse-head">
            <h3>Safehouse Bench</h3>
            <span className="dim small num">{s.heist.crew.length}/{crewSlots(s)} slots filled</span>
          </div>
          <div className="thief-safehouse-slots">
            {[0, 1, 2].map((slotIdx) => {
              const slotId = s.heist.crew[slotIdx];
              const slotRogue = slotId ? ROGUES.find((r) => r.id === slotId) : undefined;
              const rp = slotRogue ? s.heist.roster?.[slotRogue.id] : undefined;
              if (!slotRogue) {
                return <div key={slotIdx} className="thief-safehouse-slot empty">
                  <GameIcon name="thieving" size={18} color="var(--dim)" />
                  <span>Open Slot</span>
                </div>;
              }
              return <button
                key={slotRogue.id}
                type="button"
                className={`thief-safehouse-slot filled ${rogue?.id === slotRogue.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(slotRogue.id)}
              >
                <Portrait src={ROGUE_PORTRAITS[slotRogue.id]} icon="thieving" />
                <span>
                  <b>{slotRogue.name}</b>
                  <small>{slotRogue.class} · Lv {rp?.level ?? 1}</small>
                </span>
              </button>;
            })}
          </div>
        </section>
        <div className="thief-workspace">
          <section className="card thief-ledger" aria-label="Rogue crew ledger">
          <div className="thief-ledger-title">
            <h2>Rogue Crew</h2>
            <span className="dim small num">Recruited {unlockedRogues.length} / {ROGUES.length} · {s.heist.crew.length}/{crewSlots(s)} on crew</span>
          </div>
          <div className="thief-group">
            <div className="thief-group-heading" role="heading" aria-level={3}><b>On the crew</b><span className="spacer" /><span className="num">{s.heist.crew.length}/{crewSlots(s)}</span></div>
            <div className="thief-columns crew" aria-hidden><span>Rogue</span><span>Level</span><span>Talents</span><span>Points</span></div>
            {crewSet(true).map(row)}
            {!s.heist.crew.length && <p className="dim small">Nobody yet. Pick a recruited rogue and choose Bring along.</p>}
          </div>
          <div className="thief-group">
            <div className="thief-group-heading" role="heading" aria-level={3}><b>Available</b><span className="spacer" /><span className="num">{crewSet(false).length}</span></div>
            {crewSet(false).map(row)}
            {!crewSet(false).length && <p className="dim small">All recruited contacts are currently on your crew.</p>}
          </div>
          <div className="thief-marker-note">
            {unlockedRogues.length < 3 && <p>Recruit {3 - unlockedRogues.length} more {3 - unlockedRogues.length === 1 ? 'rogue' : 'rogues'} on Street Marks to fill your 3-rogue Heist crew.</p>}
            <p>A heist needs three rogues. Bringing along a fourth sends the first one home. The crew and their talents stay fixed while a heist is under way.</p>
          </div>
        </section>
        {rogue && <RogueDossier key={rogue.id} s={s} rogue={rogue} />}
      </div>
      </>
    )}
  </>;
}

/** Thieving's other half: the heist ledger and the crew ledger, each beside a dossier. */
export function HeistBoard({ view }: { view: 'jobs' | 'crew' }) {
  return view === 'crew' ? <CrewLedger /> : <HeistLedger />;
}

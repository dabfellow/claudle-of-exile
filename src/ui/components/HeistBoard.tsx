import { MARKER } from '../../data/craftMats';
import { GEAR, HEIST_JOBS, heistJob, MAX_ROGUE_RANK, rogueRankCost, ROGUES, type HeistJob, type RogueDef } from '../../data/heist';
import { materialDef } from '../../data/materials';
import { zoneDef } from '../../data/zones';
import { alarmChance, alarmKeeps, bestMark, cleanChance, crewSlots, jobBlocker, jobCost, jobExit, rankUpRogue, rogueReason, roomMs, setJobExit, startHeist, stopHeistRepeat, toggleCrew } from '../../engine/heist';
import { stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import type { GameState } from '../../engine/types';
import { game, useGame } from '../../game';
import { Badge, Cost, fmt, fmtTime, MatIcon, ProgressBar } from './common';

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
  const short = (s.bank[MARKER] ?? 0) < cost;
  const setExit = (room: number) => game.act((st) => setJobExit(st, job.id, room));
  const pay = job.vault.map((d) => takeName(d.id));
  return (
    <div className={`card action-card ${running ? 'running' : ''} ${blocker ? 'locked' : ''}`}>
      <div className="row">
        <b>{job.name}</b>
        <span className="spacer" />
        <Badge tone="neutral">{job.favours}</Badge>
      </div>
      <p className="dim small">{job.desc}</p>
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
              {pct(cleanChance(s, job, exit))} clean{exit >= job.rooms ? ` · vault: ${pay.join(', ')}` : ' · no vault'}
            </span>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            {running ? (
              <button className="btn sm" onClick={() => game.act((st) => stopAction(st))}>
                Stop
              </button>
            ) : (
              <button className="btn sm primary" title={short ? 'You will lift purses until you can pay' : ''} onClick={() => game.act((st, ctx) => startHeist(st, ctx, job.id))}>
                {short ? 'Case the job' : 'Run on repeat'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function RogueCard({ s, rogue }: { s: GameState; rogue: RogueDef }) {
  const rank = s.heist.rogues[rogue.id] ?? 0;
  const onCrew = s.heist.crew.includes(rogue.id);
  const reason = rogueReason(s, rogue.id);
  const effect = Math.round(rogue.perRank * 100);
  return (
    <div className="mat" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
      <span className="row">
        <b>{rogue.name}</b>
        <span className="spacer" />
        {rank > 0 && <Badge tone={onCrew ? 'success' : 'neutral'}>Rank {rank}</Badge>}
      </span>
      <span className="dim small">
        {effect}% {rogue.effect} per rank{rank ? ` (${effect * rank}% now)` : ''}
      </span>
      {rank < MAX_ROGUE_RANK && <Cost cost={rogueRankCost(rank + 1)} have={s.bank} />}
      <span className="row">
        {rank < MAX_ROGUE_RANK && (
          <button className="btn sm" disabled={!!reason} title={reason ?? ''} onClick={() => game.act((st, ctx) => rankUpRogue(st, ctx, rogue.id))}>
            {rank ? 'Train' : 'Hire'}
          </button>
        )}
        {rank > 0 && (
          <button className={`btn sm ${onCrew ? 'selected' : ''}`} onClick={() => game.act((st) => toggleCrew(st, rogue.id))}>
            {onCrew ? 'On the crew' : 'Bring along'}
          </button>
        )}
      </span>
    </div>
  );
}

/** Thieving's other half: pick a job and how deep to go, set a crew, and let it repeat. */
export function HeistBoard() {
  const s = useGame();
  const { tally } = s.heist;
  const open = HEIST_JOBS.filter((j) => !jobBlocker(s, j));
  const next = HEIST_JOBS.find((j) => jobBlocker(s, j));
  const shown = next ? [...open, next] : open;
  const mark = bestMark(s);
  const casing = !!s.heist.auto && s.action?.kind === 'skill';
  if (!s.unlockedZones.includes(HEIST_JOBS[0].area)) {
    return <div className="callout skill-note">The Khanate's roads start at {zoneDef(HEIST_JOBS[0].area).name}, in Act 2. Reach them to start thieving.</div>;
  }
  return (
    <>
      <div className="callout skill-note">
        Marks pay gold and Rogue's Markers. Markers set up Heists: each room is richer and riskier, and the vault is in the last one. You have <b className="num">{fmt(s.bank[MARKER] ?? 0)}</b> Markers.
      </div>
      {casing && mark && (
        <div className="callout skill-note">
          Casing {heistJob(s.heist.auto!).name}: lifting purses until you have <b className="num">{jobCost(s, heistJob(s.heist.auto!))}</b> Markers, then the job starts on its own.
        </div>
      )}
      <JobRunning s={s} />
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
      <section>
        <div className="section-head">
          <h3>Crew</h3>
          <span className="dim small">
            {s.heist.crew.length} of {crewSlots(s)} places · paid in Markers and gold
          </span>
        </div>
        <div className="card-grid" style={{ ['--card-min' as string]: '220px', gap: 8 }}>
          {ROGUES.map((r) => (
            <RogueCard key={r.id} s={s} rogue={r} />
          ))}
        </div>
      </section>
    </>
  );
}

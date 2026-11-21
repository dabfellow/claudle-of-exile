import { useState } from 'react';
import { MARKER } from '../../data/craftMats';
import { materialDef } from '../../data/materials';
import { actionsFor, type SkillAction } from '../../data/skills';
import { markerBoost } from '../../engine/heist';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { masteryLevel } from '../../engine/skillingMastery';
import { skillTreeStats } from '../../engine/skillTree';
import { deriveStats } from '../../engine/stats';
import { maxLevelOf, progressOf, xpToReach } from '../../engine/xp';
import { game, useGame } from '../../game';
import { Art, fmt, GameIcon, MatIcon, ProgressBar, Tooltip } from './common';
import { MasteryProgress, MasteryTip } from './MasteryProgress';
import { SkillMinigame } from './SkillMinigame';
import './thieving-ledger.css';

const MARKS = actionsFor('thieving');
// Reuse the existing small asset-pack portraits; the ledger needs no generated artwork.
const PORTRAITS: Record<string, string> = {
  mark_peddler: 'portraits/trader', mark_hauler: 'monsters/brute',
  mark_runner: 'monsters/stalker', mark_outrider: 'monsters/outrider',
  mark_factor: 'portraits/trader', mark_quartermaster: 'monsters/gunner',
  mark_warden: 'monsters/priest', mark_collector: 'monsters/vosk',
  mark_acolyte: 'monsters/zealot', mark_steward: 'monsters/stormcaller',
};
const GROUPS = [
  { name: 'Street Targets', actions: MARKS.filter((a) => a.level <= 16) },
  { name: 'Civic & Wealthy', actions: MARKS.filter((a) => a.level > 16 && a.level <= 40) },
  { name: 'Underworld Figures', actions: MARKS.filter((a) => a.level > 40) },
];

function TargetPortrait({ a, large = false }: { a: SkillAction; large?: boolean }) {
  return <span className={`thief-portrait ${large ? 'large' : ''}`}>
    <Art src={PORTRAITS[a.id] ?? `portraits/${a.id}`} alt="" size={large ? 64 : 36} fallback={<GameIcon name="thieving" size={large ? 32 : 20} />} />
  </span>;
}

export function ThievingHeader() {
  const s = useGame();
  const level = skillLevel(s, 'thieving');
  const maxed = level >= maxLevelOf('thieving');
  const xp = s.skills.thieving;
  const rate = game.xpPerHour('thieving');
  return <header className="card thief-header">
    <span className="thief-emblem"><GameIcon name="thieving" size={28} color="var(--gold)" /></span>
    <div className="thief-heading"><h1>Thieving</h1><span>The Underworld Ledger</span></div>
    <div className="thief-xp">
      <div className="row"><span>Level <b className="num">{level}</b> / {maxLevelOf('thieving')}</span><span className="spacer" /><span className="num small">{fmt(xp)} XP</span></div>
      <ProgressBar value={maxed ? 1 : progressOf('thieving', xp)} color="var(--gold)" smooth />
      <div className="row small"><span>{maxed ? 'Max level' : `${fmt(xpToReach('thieving', level + 1) - xp)} to level ${level + 1}`}</span><span className="spacer" /><span className="num">{fmt(rate)} XP/h</span></div>
    </div>
    <div className="thief-marker-total"><MatIcon id={MARKER} size={26} /><div><b className="num">{fmt(s.storage.bank[MARKER] ?? 0)}</b><span>Rogue’s Markers</span></div></div>
  </header>;
}

/** Browsing a dossier never changes the running action; Pickpocket is the explicit start. */
export function ThievingLedger() {
  const s = useGame();
  const skillActionId = s.action?.kind === 'skill' ? s.action.actionId : null;
  const activeId = MARKS.some((a) => a.id === skillActionId) ? skillActionId : null;
  const [selectedId, setSelectedId] = useState(() => activeId ?? MARKS[0].id);
  const [onlyUnlocked, setOnlyUnlocked] = useState(false);
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});
  const a = MARKS.find((mark) => mark.id === selectedId) ?? MARKS[0];
  const d = deriveStats(s);
  const tree = skillTreeStats(s);
  const interval = actionIntervalMs(s, a, d);
  const xpFor = (mark: SkillAction) => +(mark.xp * (1 + (d.skillXp + (tree.skillXp ?? 0)) / 100)).toFixed(1);
  const blocker = actionBlocker(s, a);
  const running = activeId === a.id;
  const completions = s.professionProgress.counters['thieving.markers'] ?? 0;
  const untilMarker = 10 - completions % 10;
  const selectedGroup = GROUPS.find((g) => g.actions.includes(a))!;

  return <div className="thief-workspace">
    <section className="card thief-ledger" aria-label="Street mark ledger">
      <div className="thief-ledger-title"><h2>Street Marks</h2><button className="btn sm ghost" onClick={() => setOnlyUnlocked((v) => !v)}>{onlyUnlocked ? 'Show all' : 'Unlocked only'}</button></div>
      {GROUPS.map((group, i) => {
        const available = group.actions.filter((mark) => !actionBlocker(s, mark));
        const shown = onlyUnlocked ? available : group.actions;
        const expanded = groupOverrides[group.name] ?? (i === 0 || group === selectedGroup);
        return <div className="thief-group" key={group.name}>
          <button className="thief-group-heading" aria-expanded={expanded} onClick={() => setGroupOverrides((prev) => ({ ...prev, [group.name]: !expanded }))}>
            <span aria-hidden>{expanded ? '▾' : '▸'}</span><b>{group.name}</b><span className="thief-level-range">Lv {group.actions[0].level}–{group.actions.at(-1)!.level}</span><span className="spacer" /><span className="num">{available.length}/{group.actions.length}</span>
          </button>
          {expanded && <>
            {shown.length ? <>
              <div className="thief-columns" aria-hidden><span>Target</span><span>Level</span><span>Time</span><span>XP</span><span>Mastery</span></div>
              {shown.map((mark) => {
                const reason = actionBlocker(s, mark);
                const active = activeId === mark.id;
                return <button key={mark.id} data-tut={`action-${mark.id}`} className={`thief-target ${a.id === mark.id ? 'selected' : ''} ${reason ? 'locked' : ''}`} aria-pressed={a.id === mark.id} title={reason ?? `View ${mark.name}`} onClick={() => setSelectedId(mark.id)}>
                  <span className="thief-target-name"><TargetPortrait a={mark} /><span><b>{mark.name}</b>{active && <small className="thief-working">Working the mark</small>}</span>{reason && <GameIcon name="lock" size={12} />}</span>
                  <span className="num thief-cell" data-label="Level">{mark.level}</span>
                  <span className="num thief-cell" data-label="Time">{(actionIntervalMs(s, mark, d) / 1000).toFixed(1)}s</span>
                  <span className="num thief-cell" data-label="XP">{xpFor(mark)}</span>
                  <span className="num thief-cell thief-mastery-number" data-label="Mastery">{mark.mastery ? masteryLevel(s, mark.mastery.id) : '—'}</span>
                </button>;
              })}
            </> : <p className="dim small">No unlocked targets in this group.</p>}
          </>}
        </div>;
      })}
      <div className="thief-marker-note">
        <div className="row"><MatIcon id={MARKER} size={18} /><b>Guaranteed Marker</b><span className="spacer" /><span className="num">{untilMarker} {untilMarker === 1 ? 'lift' : 'lifts'} away</span></div>
        <ProgressBar value={(completions % 10) / 10} color="var(--gold)" />
        <p>Every mark pays gold and can yield Markers. Every 10 lifts guarantees an extra Marker for Heists.</p>
        {((s.storage.bank.treasury_fragment ?? 0) > 0 || (s.storage.bank.oath_fragment ?? 0) > 0) && <p>Treasury Fragments: {fmt(s.storage.bank.treasury_fragment ?? 0)} · Oath Fragments: {fmt(s.storage.bank.oath_fragment ?? 0)}</p>}
      </div>
    </section>

    <section className="thief-dossier" aria-label={`${a.name} dossier`}>
      <div className="thief-paper-clip" aria-hidden />
      <div className="thief-dossier-heading"><TargetPortrait a={a} large /><div><span className="thief-dossier-kicker">Street mark · Lv {a.level}</span><h2>{a.name}</h2><span className="num">{(interval / 1000).toFixed(1)}s per attempt · {xpFor(a)} XP</span></div></div>
      <div className="thief-rewards"><h3>Rewards per lift</h3>
        {Object.entries(a.outputs ?? {}).map(([id, n]) => <div className="thief-reward" key={id}><MatIcon id={id} size={20} /><b>{materialDef(id).name}</b><span className="spacer" /><span className="num">{n} base{a.outputChance !== undefined && ` · ${a.outputChance * 100}% chance`}</span></div>)}
        {a.bonus?.map((bonus) => <div className="thief-reward" key={bonus.id}><MatIcon id={bonus.id} size={20} /><b>{materialDef(bonus.id).name}</b><span className="spacer" /><span className="num">×{bonus.qty} · {+(Math.min(1, bonus.chance * (bonus.id === MARKER ? 1 + markerBoost(s) / 100 : 1)) * 100).toFixed(2)}%</span></div>)}
        <p className="thief-reward-note">Base gold before mastery and Focus bonuses. Guaranteed Markers are additional.</p>
      </div>
      <div className="thief-dossier-action">
        {blocker && <p className="thief-blocker"><GameIcon name="lock" size={14} /> {blocker}</p>}
        {running ? <button className="btn thief-pickpocket" onClick={() => game.act((st) => stopAction(st))}>Stop pickpocketing</button> : <button className="btn thief-pickpocket" disabled={!!blocker} title={blocker ?? ''} onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, a.id))}><GameIcon name="thieving" size={17} /> Pickpocket</button>}
        <div className="thief-attempt"><span>{running ? 'Attempt in progress' : 'Ready when you are'}</span><span className="num">{running && s.action?.kind === 'skill' ? `${(s.action.progress / 1000).toFixed(1)} / ` : ''}{(interval / 1000).toFixed(1)}s</span></div>
        <ProgressBar value={running && s.action?.kind === 'skill' ? s.action.progress / interval : 0} color="#88682f" />
        {activeId && !running && <button className="thief-return" onClick={() => setSelectedId(activeId)}>Working: {MARKS.find((mark) => mark.id === activeId)!.name} · View active mark</button>}
      </div>
      <div className="thief-dossier-mastery"><MasteryProgress s={s} mastery={a.mastery} compact />
        {a.mastery && (() => {
          const mastery = a.mastery;
          const level = masteryLevel(s, mastery.id);
          const next = mastery.milestones.find((m) => m.level > level);
          return <Tooltip content={<MasteryTip s={s} mastery={mastery} />}><span className="thief-next-perk">{next ? `Next: ${next.name} · Mastery ${next.level}` : 'All mastery milestones unlocked'}</span></Tooltip>;
        })()}
      </div>
      {running && <div className="thief-focus"><SkillMinigame skill="thieving" /></div>}
    </section>
  </div>;
}

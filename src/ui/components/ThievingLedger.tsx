import { useCallback, useEffect, useState } from 'react';
import { COLLECTIBLES } from '../../data/collectibles';
import { HEIST_JOBS, PREP_CAP, PREP_DOUBLE_MARKS, prepBoard, prepDef } from '../../data/heist';
import { materialDef } from '../../data/materials';
import { actionsFor, type SkillAction } from '../../data/skills';
import { crewSlots, jobBlocker, prepChance, prepHeld, prepKindsHeld } from '../../engine/heist';
import { activeCrew } from '../../engine/rogues';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { masteryLevel } from '../../engine/skillingMastery';
import { skillTreeStats } from '../../engine/skillTree';
import { deriveStats } from '../../engine/stats';
import type { GameEvent } from '../../engine/types';
import { maxLevelOf, progressOf, xpToReach } from '../../engine/xp';
import { game, useGame, useGameEvent } from '../../game';
import { Art, Badge, fmt, GameIcon, MatIcon, ProgressBar, Tooltip } from './common';
import { LockedBadge, SkillIntro } from './SkillHelp';
import { MasteryProgress, MasteryTip } from './MasteryProgress';
import { LiftGameIdle } from './minigames';
import { SkillMinigame } from './SkillMinigame';
import { StationDock, type StationDockItem } from './StationDock';
import './thieving-ledger.css';
import './skill-station-banners.css';

const MARKS = actionsFor('thieving');
const THIEVING_KEEPSAKES = COLLECTIBLES.filter((c) => c.skill === 'thieving');
// Reuse the existing small asset-pack portraits; the ledger needs no generated artwork.
const PORTRAITS: Record<string, string> = {
  mark_peddler: 'portraits/trader', mark_hauler: 'monsters/brute',
  mark_runner: 'monsters/stalker', mark_outrider: 'monsters/outrider',
  mark_factor: 'portraits/trader', mark_quartermaster: 'monsters/gunner',
  mark_warden: 'monsters/priest', mark_collector: 'monsters/vosk',
  mark_acolyte: 'monsters/zealot', mark_steward: 'monsters/stormcaller',
  mark_assayer: 'monsters/assayer', mark_broker: 'monsters/hexmerchant',
  mark_mintmaster: 'monsters/mintmaster', mark_chamberlain: 'monsters/chamberlain',
  mark_archivist: 'monsters/vaultwarden',
};
const GROUPS = [
  { name: 'Street Targets', actions: MARKS.filter((a) => a.level <= 16) },
  { name: 'Civic & Wealthy', actions: MARKS.filter((a) => a.level > 16 && a.level <= 35) },
  { name: 'Underworld Figures', actions: MARKS.filter((a) => a.level > 35 && a.level <= 60) },
  { name: 'High Court & Vaults', actions: MARKS.filter((a) => a.level > 60) },
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
  const notice = s.heist.notice;
  const planned = s.heist.planned ? HEIST_JOBS.find((j) => j.id === s.heist.planned) : undefined;
  const unlockedCount = s.heist.unlockedRogues?.length ?? 0;
  const crewCount = activeCrew(s).length;
  const keepsakeFound = THIEVING_KEEPSAKES.filter((c) => s.collectibles.includes(c.id)).length;
  useEffect(() => {
    if (!notice) return;
    // read and clear in one step, so a second run of this effect can't show it again
    let text: string | undefined;
    game.act((st) => { text = st.heist.notice; delete st.heist.notice; });
    if (text) game.pushToast(text, 'good');
  }, [notice]);
  const gold = s.storage.bank.gold ?? 0;
  const ink = 'var(--station-ink)';
  const dock: StationDockItem[] = [
    {
      key: 'job', icon: <GameIcon name="target" size={24} color={ink} />, label: planned ? planned.name : 'Heist',
      value: planned ? `${prepKindsHeld(s, planned.id)}/${prepBoard(planned.id).min}` : 'None', dim: !planned,
      title: planned ? `${planned.name}: ${prepKindsHeld(s, planned.id)} of the ${prepBoard(planned.id).min} kinds of prep it needs` : 'No heist planned · pick one on Heist Operations',
    },
    {
      key: 'crew', icon: <GameIcon name="skull" size={24} color={ink} />, label: unlockedCount >= 3 ? 'Crew' : 'Recruits',
      value: unlockedCount >= 3 ? `${crewCount}/${crewSlots(s)}` : `${unlockedCount}/3`, dim: unlockedCount === 0,
      title: unlockedCount >= 3 ? `${crewCount} of ${crewSlots(s)} crew slots filled` : `${unlockedCount} of 3 rogues recruited`,
    },
    {
      key: 'keepsakes', icon: <GameIcon name="trophy" size={24} color={ink} />, label: 'Keepsakes',
      value: `${keepsakeFound}/${THIEVING_KEEPSAKES.length}`, dim: keepsakeFound === 0,
      title: `${keepsakeFound} of ${THIEVING_KEEPSAKES.length} thieving keepsakes found`,
    },
    {
      key: 'gold', icon: <GameIcon name="purse" size={24} color={ink} />, label: 'Gold', value: gold,
      title: `${gold.toLocaleString()} gold in the purse`,
    },
  ];
  return <header className="card profession-header station-hero thief-hero">
    <div className="profession-header-icon"><GameIcon name="thieving" size={32} color="var(--gold)" /></div>
    <div className="profession-header-text" style={{ minWidth: 0 }}>
      <h1>Thieving</h1>
      <p>The Underworld Ledger</p>
    </div>
    <div className="xp">
      <div className="row">
        <span className="level-num"><small>Level</small>{level}</span>
        <span className="spacer" />
        {rate > 0 && <Badge tone="success">{fmt(rate)} XP/h</Badge>}
      </div>
      <ProgressBar value={maxed ? 1 : progressOf('thieving', xp)} color="var(--gold)" size="md" smooth />
      <div className="xp-meta num">
        <span>{fmt(xp)} XP total</span>
        <span className="spacer" />
        <span>{maxed ? 'Max level' : `${fmt(xpToReach('thieving', level + 1) - xp)} XP to level ${level + 1}`}</span>
      </div>
    </div>
    <StationDock label="The ledger" items={dock} className="skill-station-dock" />
  </header>;
}

/** Browsing a dossier never changes the running action; Pickpocket is the explicit start. */
export function ThievingLedger() {
  const s = useGame();
  const skillActionId = s.action?.kind === 'skill' ? s.action.actionId : null;
  const activeId = MARKS.some((a) => a.id === skillActionId) ? skillActionId : null;
  const [selectedId, setSelectedId] = useState(() => activeId ?? MARKS[0].id);
  const [onlyUnlocked, setOnlyUnlocked] = useState(true);
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});
  const [pops, setPops] = useState<{ id: number; text: string }[]>([]);
  const a = MARKS.find((mark) => mark.id === selectedId) ?? MARKS[0];
  const level = skillLevel(s, 'thieving');
  const d = deriveStats(s);
  const tree = skillTreeStats(s);
  const interval = actionIntervalMs(s, a, d);
  const xpFor = (mark: SkillAction) => +(mark.xp * (1 + (d.skillXp + (tree.skillXp ?? 0)) / 100)).toFixed(1);
  const blocker = actionBlocker(s, a);
  const running = activeId === a.id;
  const selectedGroup = GROUPS.find((g) => g.actions.includes(a))!;
  const planned = s.heist.planned ? HEIST_JOBS.find((j) => j.id === s.heist.planned && !jobBlocker(s, j)) : undefined;
  const prepGiven = (markId: string) => planned ? prepBoard(planned.id).items.filter((e) => e.mark === markId).map((e) => prepDef(e.kind).name) : [];
  const nextLockedId = MARKS.find((mark) => !!actionBlocker(s, mark))?.id;
  const unlockedCount = s.heist.unlockedRogues?.length ?? 0;
  const marksTotal = s.professionProgress.counters['thieving.markers'] ?? 0;
  const nextRecruitAt = unlockedCount === 0 ? 3 : unlockedCount === 1 ? 7 : 12;
  const keepsakeFound = THIEVING_KEEPSAKES.filter((c) => s.collectibles.includes(c.id)).length;
  const prepPct = +(prepChance(s, a.id) * 100).toFixed(1);
  const isDoublePrep = PREP_DOUBLE_MARKS.includes(a.id);
  const intelRows = HEIST_JOBS
    .filter((j) => level >= j.level)
    .flatMap((j) => prepBoard(j.id).items.filter((e) => e.mark === a.id).map((e) => ({ job: j, entry: e })));

  const onEvent = useCallback((e: GameEvent) => {
    if (e.t === 'produce' && running) {
      const parts = Object.entries(e.outputs).slice(0, 2).map(([id, n]) => `+${fmt(n)} ${materialDef(id).name}`);
      const text = parts.length ? parts.join(' · ') : '+1';
      const id = Math.random();
      setPops((prev) => [...prev.slice(-3), { id, text }]);
      setTimeout(() => setPops((prev) => prev.filter((x) => x.id !== id)), 1100);
    }
  }, [running]);
  useGameEvent(onEvent);

  return <>
    <SkillIntro
      step="Start here: Pick a Street Mark and click Pickpocket"
      action={unlockedCount < 3 ? <Badge tone="neutral">Recruits: {unlockedCount}/3</Badge> : undefined}
    >
      Pickpocket targets for gold, Heist prep items, and rogues looking for work
    </SkillIntro>
    <div className="thief-workspace">
    <section className="card thief-ledger" aria-label="Street mark ledger">
      <div className="thief-ledger-title"><h2>Street Marks</h2><button className="btn sm ghost" onClick={() => setOnlyUnlocked((v) => !v)}>{onlyUnlocked ? 'Show all' : 'Unlocked only'}</button></div>
      {GROUPS.map((group, i) => {
        const available = group.actions.filter((mark) => !actionBlocker(s, mark));
        const shown = onlyUnlocked ? group.actions.filter((mark) => !actionBlocker(s, mark) || mark.id === nextLockedId) : group.actions;
        const expanded = groupOverrides[group.name] ?? (i === 0 || (group === selectedGroup && !onlyUnlocked) || shown.length > 0);
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
                  <span className="thief-target-name"><TargetPortrait a={mark} /><span><b>{mark.name}</b>{active && <small className="thief-working">Working the mark</small>}{prepGiven(mark.id).length > 0 && <small className="thief-prep-badge" title={`Can give prep for ${planned!.name}: ${prepGiven(mark.id).join(', ')}`}>Prep: {prepGiven(mark.id).join(', ')}</small>}</span>{reason && <LockedBadge level={mark.level} reason={reason} />}</span>
                  <span className="num thief-cell" data-label="Level">{mark.level}</span>
                  <span className="num thief-cell" data-label="Time">{(actionIntervalMs(s, mark, d) / 1000).toFixed(1)}s</span>
                  <span className="num thief-cell" data-label="XP">{xpFor(mark)}</span>
                  <span className="num thief-cell thief-mastery-number" data-label="Mastery">{mark.mastery ? masteryLevel(s, mark.mastery.id) : '—'}</span>
                </button>;
              })}
            </> : <p className="dim small">No unlocked targets in this group yet.</p>}
          </>}
        </div>;
      })}
      <details className="thief-keepsakes">
        <summary>
          <span>Stolen Keepsakes</span>
          <span className="spacer" />
          <span className="num">{keepsakeFound}/{THIEVING_KEEPSAKES.length}</span>
        </summary>
        <div className="thief-keepsakes-grid">
          {THIEVING_KEEPSAKES.map((c) => {
            const have = s.collectibles.includes(c.id);
            return <div key={c.id} className={`thief-keepsake-item ${have ? 'found' : ''}`}>
              <b>{have ? c.name : '???'}</b>
              <p>{have ? c.flavour : c.zoneName}</p>
            </div>;
          })}
        </div>
      </details>
      <div className="thief-marker-note">
        <p>Every mark pays gold, and can turn up prep items (keys, ledgers, schedules) for the Heists. Plan a job on the Heists tab to see which marks help.</p>
        {((s.storage.bank.treasury_fragment ?? 0) > 0 || (s.storage.bank.oath_fragment ?? 0) > 0) && <p>Treasury Fragments: {fmt(s.storage.bank.treasury_fragment ?? 0)} · Oath Fragments: {fmt(s.storage.bank.oath_fragment ?? 0)}</p>}
      </div>
    </section>

    <section className="thief-dossier" aria-label={`${a.name} dossier`}>
      <div className="thief-paper-clip" aria-hidden />
      {running && <span className="thief-wax-seal" aria-label="Currently active">Active</span>}
      <div className="thief-dossier-heading"><TargetPortrait a={a} large /><div><span className="thief-dossier-kicker">Street mark · Lv {a.level}</span><h2>{a.name}</h2><span className="num">{(interval / 1000).toFixed(1)}s per attempt · {xpFor(a)} XP</span></div></div>
      <div className="thief-rewards"><h3>Rewards per lift</h3>
        {Object.entries(a.outputs ?? {}).map(([id, n]) => <div className="thief-reward" key={id}><MatIcon id={id} size={20} /><b>{materialDef(id).name}</b><span className="spacer" /><span className="num">{n} base{a.outputChance !== undefined && ` · ${a.outputChance * 100}% chance`}</span></div>)}
        {a.bonus?.map((bonus) => <div className="thief-reward" key={bonus.id}><MatIcon id={bonus.id} size={20} /><b>{materialDef(bonus.id).name}</b><span className="spacer" /><span className="num">×{bonus.qty} · {+(Math.min(1, bonus.chance) * 100).toFixed(2)}%</span></div>)}
        <p className="thief-reward-note">Base gold before mastery and Focus bonuses. Prep for planned Heists and rogue recruits can drop too.</p>
      </div>
      <div className="thief-casing-intel">
        <div className="thief-casing-head">
          <h3>Casing Intel</h3>
          {isDoublePrep && <span className="thief-double-pill">2× prep</span>}
          <span className="spacer" />
          <span className="num small">{prepPct}% chance</span>
        </div>
        {intelRows.length > 0 ? (
          <div className="thief-intel-list">
            {intelRows.map(({ job, entry }) => {
              const held = prepHeld(s, job.id)[entry.kind] ?? 0;
              return <div className="thief-intel-row" key={`${job.id}:${entry.kind}`}>
                <span><b>{prepDef(entry.kind).name}</b> · {job.name}</span>
                <span className="num">{held}/{PREP_CAP}</span>
              </div>;
            })}
          </div>
        ) : (
          <p className="thief-reward-note" style={{ marginTop: 4 }}>Unlock more Heist operations to turn up job prep from this mark.</p>
        )}
      </div>
      {unlockedCount < 3 && (
        <div className="thief-recruit-progress">
          <div className="row small">
            <span>Next rogue contact ({unlockedCount + 1}/3)</span>
            <span className="spacer" />
            <span className="num">{Math.min(marksTotal, nextRecruitAt)} / {nextRecruitAt} lifts</span>
          </div>
          <ProgressBar value={Math.min(1, marksTotal / nextRecruitAt)} color="#88682f" />
        </div>
      )}
      <div className="thief-dossier-action">
        {pops.map((p) => <span key={p.id} className="thief-pop num" aria-hidden>{p.text}</span>)}
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
      <div className="thief-focus thief-alley-stage">
        {running
          ? <SkillMinigame skill="thieving" portrait={PORTRAITS[a.id]} targetName={a.name} />
          : <LiftGameIdle targetName={a.name} portrait={PORTRAITS[a.id]} locked={!!blocker} onStart={() => { if (!blocker) game.act((st, ctx) => startSkillAction(st, ctx, a.id)); }} />}
      </div>
    </section>
  </div>
  </>;
}

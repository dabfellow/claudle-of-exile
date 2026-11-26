import { useState, type CSSProperties } from 'react';
import { materialDef } from '../../data/materials';
import { actionsFor, type SkillAction } from '../../data/skills';
import { woodDef } from '../../data/woodcutting';
import { recipeMaterialCount } from '../../engine/bank';
import { masteryLevel } from '../../engine/skillingMastery';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import { game, useGame } from '../../game';
import { fmt, MatIcon, ProgressBar } from './common';
import { MasteryProgress } from './MasteryProgress';
import { LockedBadge, SkillIntro } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import './giants.css';
import './sawmill-station.css';

const PART_SUFFIXES = ['_bow_stave', '_wand_blank', '_staff_shaft'];
const outputOf = (a: SkillAction) => Object.keys(a.outputs ?? a.protectedOutputs ?? {})[0] ?? 'ash_plank';
const GROUPS: { id: string; label: string; blurb: string; test: (a: SkillAction) => boolean }[] = [
  { id: 'planks', label: 'Planks', blurb: 'For your bench, jigs, Tailoring and the Hideout.', test: (a) => outputOf(a).endsWith('_plank') },
  { id: 'parts', label: 'Weapon parts', blurb: 'Every bow needs a bow stave, every wand a wand blank and every staff a staff shaft, in the wood of its tier.', test: (a) => PART_SUFFIXES.some((suffix) => outputOf(a).endsWith(suffix)) },
  { id: 'heartwood', label: 'Heartwood', blurb: 'Refine heartwood fragments from giants into Ancient Heartwood.', test: (a) => !!a.protectedOutputs },
];
const FILTERS = [{ id: 'all', label: 'All' }, { id: 'planks', label: 'Planks' }, { id: 'parts', label: 'Weapon Parts' }, { id: 'heartwood', label: 'Heartwood' }] as const;
type Filter = (typeof FILTERS)[number]['id'];

const groupOf = (a: SkillAction) => GROUPS.find((g) => g.test(a));
const tierStyle = (a: SkillAction) => ({ '--saw-tier': woodDef(a.woodcutting?.wood ?? 'ash').color }) as CSSProperties;
/** Wood-species accent on the left edge of each index row, keyed by the recipe's wood (heartwood refines into Ancient). */
const SPECIES_ACCENT: Record<string, string> = {
  ash: '#d6cbb8', oak: '#b47b44', yew: '#a84a3e', ironwood: '#64748b', ancient: '#d4a347', spirit: '#2dd4bf',
};
const rowStyle = (a: SkillAction) => {
  const wood = a.woodcutting?.wood ?? 'ash';
  return { ...tierStyle(a), '--saw-species': SPECIES_ACCENT[wood] ?? woodDef(wood).color } as CSSProperties;
};

/** The Sawbench Carriage: the selected recipe's log → blade → output, its mastery and the Saw button. */
function SawCarriage({ a, onShowRunning }: { a: SkillAction; onShowRunning?: () => void }) {
  const s = useGame();
  const level = skillLevel(s, 'sawmilling');
  const d = deriveStats(s);
  const runningAction = s.action?.kind === 'skill' ? s.action : null;
  const [outputId, outputQty] = Object.entries(a.outputs ?? a.protectedOutputs ?? {})[0] ?? ['ash_plank', 1];
  const levelLocked = a.level > level;
  const blocker = actionBlocker(s, a);
  const active = runningAction?.actionId === a.id;
  const interval = actionIntervalMs(s, a, d);
  const wood = woodDef(a.woodcutting?.wood ?? 'ash');
  const label = levelLocked ? `Requires Sawmilling level ${a.level}` : active ? 'Stop' : blocker === 'Missing materials' ? 'Need wood' : blocker ? 'Locked' : 'Saw';

  return (
    <section className={`sawmill-panel sawmill-carriage ${active ? 'running' : ''} ${levelLocked ? 'locked' : ''}`} style={tierStyle(a)} aria-label="The Sawbench Carriage">
      <h2>The Sawbench Carriage</h2>
      <div className="sawmill-carriage-head">
        <h3>{a.name}</h3>
        <span className="sawmill-wood-tag">{wood.name}</span>
        <span className="spacer" />
        {levelLocked ? <LockedBadge level={a.level} reason={`Requires Sawmilling level ${a.level}`} /> : <span className="small muted">Lv {a.level}</span>}
      </div>
      <p className="sawmill-description">{groupOf(a)?.blurb}</p>

      <div className="sawmill-process">
        <ul className="sawmill-inputs" aria-label="Logs in">
          {Object.entries(a.inputs ?? {}).map(([id, need]) => {
            const owned = recipeMaterialCount(s.storage.bank, id);
            return (
              <li key={id} className={owned < need ? 'short' : ''}>
                <span className="sawmill-socket station-pixel"><MatIcon id={id} size={30} /></span>
                <span className="sawmill-socket-name">{materialDef(id).name}</span>
                <span className="sawmill-quantity num" title="Owned / required">{fmt(owned)} / {fmt(need)}</span>
              </li>
            );
          })}
        </ul>
        <span className="sawmill-arrow" aria-hidden="true">➔</span>
        <div className="sawmill-stage" aria-hidden="true">
          <span className="sawmill-blade-wrap">
            <span className="sawmill-blade" />
            <span className="sawmill-blade-hub" />
          </span>
          <span className="sawmill-log"><span className="sawmill-log-bark" /><span className="sawmill-log-cut" /></span>
          <span className="sawmill-bed" />
          <span className="sawmill-rail" />
        </div>
        <span className="sawmill-arrow" aria-hidden="true">➔</span>
        <div className="sawmill-output">
          <span className="sawmill-socket sawmill-socket-out station-pixel"><MatIcon id={outputId} size={44} /><b className="num">×{fmt(outputQty)}</b></span>
          <span className="sawmill-socket-name">{materialDef(outputId).name}</span>
          <span className="sawmill-quantity num">Owned {fmt(recipeMaterialCount(s.storage.bank, outputId))}</span>
        </div>
      </div>

      {!levelLocked && <div className="sawmill-mastery"><MasteryProgress s={s} mastery={a.mastery} compact /></div>}

      <div className="sawmill-readout num">
        <span>Time <b>{(interval / 1000).toFixed(1)}s</b></span>
        <span aria-hidden="true">·</span>
        <span>XP <b>{fmt(a.xp)}</b></span>
        <span aria-hidden="true">·</span>
        <span>Makes <b>{fmt(outputQty)} {materialDef(outputId).name}</b></span>
      </div>

      <div className="sawmill-saw-control" data-tut={`action-${a.id}`}>
        {levelLocked ? (
          <button type="button" className="btn sawmill-saw-button" disabled title={`Requires Sawmilling level ${a.level}`}>
            <span>{label}</span>
          </button>
        ) : active ? (
          <button type="button" className="btn sawmill-saw-button active" onClick={() => game.act(stopAction)}>
            <span>{label}</span>
          </button>
        ) : (
          <button
            type="button"
            className={`btn sawmill-saw-button ${blocker ? '' : 'primary'}`}
            disabled={!!blocker}
            title={blocker ?? undefined}
            onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, a.id))}
          >
            <span>{label}</span>
          </button>
        )}
        {active && runningAction && <ProgressBar value={runningAction.progress / interval} color={a.color} className="sawmill-saw-progress" />}
      </div>
      {onShowRunning && <button type="button" className="btn sm sawmill-return" onClick={onShowRunning}>View active cut</button>}
    </section>
  );
}

/** Sawmilling: saw logs into planks and weapon parts, and refine heartwood fragments. */
export function Sawmill() {
  const s = useGame();
  const [showLocked, setShowLocked] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [selection, select] = useState<string | null>(null);
  const level = skillLevel(s, 'sawmilling');
  const all = actionsFor('sawmilling').filter((a) => !a.batchMastery || masteryLevel(s, `task.${a.batchOf}`) >= a.batchMastery);
  const lockedTotal = all.filter((a) => a.level > level).length;
  const skillActionId = s.action?.kind === 'skill' ? s.action.actionId : null;
  const runningId = skillActionId && all.some((a) => a.id === skillActionId) ? skillActionId : null;

  // Same visibility as before: every open recipe, plus one locked teaser per group unless all locked recipes are shown.
  const visible = GROUPS.filter((g) => filter === 'all' || g.id === filter).flatMap((group) => {
    const list = all.filter(group.test).sort((x, y) => x.level - y.level);
    const open = list.filter((a) => a.level <= level);
    const locked = list.filter((a) => a.level > level);
    return [...open, ...(showLocked ? locked : locked.slice(0, 1))];
  });
  const selected = visible.find((a) => a.id === selection) ?? visible.find((a) => a.id === runningId) ?? visible.find((a) => a.level <= level) ?? visible[0];
  const showRunning = runningId && selected?.id !== runningId ? () => { setFilter('all'); select(runningId); } : undefined;

  return (
    <div className="sawmill-view sawmill-station">
      <SkillIntro step="Saw logs into planks and parts">
        Logs from Woodcutting become <b>planks</b>, and the <b>bow staves</b>, <b>wand blanks</b> and <b>staff shafts</b> that Woodcrafting needs for every bow, wand and staff.
      </SkillIntro>
      <SkillMinigame skill="sawmilling" />
      <div className="sawmill-split">
        <section className="sawmill-panel sawmill-index" aria-label="Timber and Cut Index">
          <h2>Timber &amp; Cut Index</h2>
          <div className="sawmill-filters" role="group" aria-label="Recipe category">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className="sawmill-pill" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
          {lockedTotal > 0 && (
            <label className="sawmill-show-locked">
              <input type="checkbox" checked={showLocked} onChange={(e) => setShowLocked(e.target.checked)} />
              Show locked ({lockedTotal})
            </label>
          )}
          <div className="sawmill-rows">
            {visible.map((a) => {
              const out = outputOf(a);
              const locked = a.level > level;
              return (
                <button key={a.id} type="button" className={`sawmill-row ${locked ? 'locked' : ''}`} style={rowStyle(a)}
                  aria-pressed={selected?.id === a.id} onClick={() => select(a.id)}>
                  <span className="sawmill-row-icon"><MatIcon id={out} size={26} /></span>
                  <span className="sawmill-row-text">
                    <strong>{a.name}</strong>
                    <small className="num">{locked ? `Unlocks at Lv ${a.level}` : `Lv ${a.level}`} · Owned {fmt(recipeMaterialCount(s.storage.bank, out))}</small>
                  </span>
                  {runningId === a.id && <span className="sawmill-running">Sawing</span>}
                </button>
              );
            })}
            {!visible.length && <p className="small muted">No recipes here yet.</p>}
          </div>
        </section>
        {selected && <SawCarriage a={selected} onShowRunning={showRunning} />}
      </div>
    </div>
  );
}

export function SawmillPage() {
  return (
    <section className="wood-bench">
      <Sawmill />
    </section>
  );
}

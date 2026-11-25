import { useState } from 'react';
import { materialDef } from '../../data/materials';
import { actionsFor, type SkillAction } from '../../data/skills';
import { recipeMaterialCount } from '../../engine/bank';
import { masteryLevel } from '../../engine/skillingMastery';
import { actionBlocker, actionIntervalMs, skillLevel, startSkillAction, stopAction } from '../../engine/skills';
import { deriveStats } from '../../engine/stats';
import { game, useGame } from '../../game';
import { Cost, fmt, MatIcon, ProgressBar } from './common';
import { MasteryProgress } from './MasteryProgress';
import { LockedBadge, SkillIntro } from './SkillHelp';
import { SkillMinigame } from './SkillMinigame';
import './giants.css';

const PART_SUFFIXES = ['_bow_stave', '_wand_blank', '_staff_shaft'];
const outputOf = (a: SkillAction) => Object.keys(a.outputs ?? a.protectedOutputs ?? {})[0] ?? 'ash_plank';
const GROUPS: { id: string; label: string; blurb: string; test: (a: SkillAction) => boolean }[] = [
  { id: 'planks', label: 'Planks', blurb: 'For your bench, jigs, Tailoring and the Hideout.', test: (a) => outputOf(a).endsWith('_plank') },
  { id: 'parts', label: 'Weapon parts', blurb: 'Every bow needs a bow stave, every wand a wand blank and every staff a staff shaft, in the wood of its tier.', test: (a) => PART_SUFFIXES.some((suffix) => outputOf(a).endsWith(suffix)) },
  { id: 'heartwood', label: 'Heartwood', blurb: 'Refine heartwood fragments from giants into Ancient Heartwood.', test: (a) => !!a.protectedOutputs },
];

function SawCard({ a }: { a: SkillAction }) {
  const s = useGame();
  const level = skillLevel(s, 'sawmilling');
  const d = deriveStats(s);
  const runningAction = s.action?.kind === 'skill' ? s.action : null;
  const [outputId, outputQty] = Object.entries(a.outputs ?? a.protectedOutputs ?? {})[0] ?? ['ash_plank', 1];
  const levelLocked = a.level > level;
  const blocker = actionBlocker(s, a);
  const active = runningAction?.actionId === a.id;
  const interval = actionIntervalMs(s, a, d);
  return (
    <article className={`card sawmill-card ${active ? 'running' : ''} ${levelLocked ? 'locked' : ''}`} data-tut={`action-${a.id}`}>
      <div className="sawmill-card-head">
        <div className="sawmill-card-icon"><MatIcon id={outputId} size={22} /></div>
        <div className="sawmill-card-title">
          <b>{a.name}</b>
          <span className="dim small num">Makes {fmt(outputQty)} {materialDef(outputId).name} · {(interval / 1000).toFixed(1)}s</span>
        </div>
        {levelLocked ? (
          <LockedBadge level={a.level} reason={`Requires Sawmilling level ${a.level}`} />
        ) : active ? (
          <button type="button" className="btn sm" onClick={() => game.act(stopAction)}>Stop</button>
        ) : (
          <button
            type="button"
            className={`btn sm ${blocker ? '' : 'primary'}`}
            disabled={!!blocker}
            title={blocker ?? undefined}
            onClick={() => game.act((st, ctx) => startSkillAction(st, ctx, a.id))}
          >
            {blocker === 'Missing materials' ? 'Need wood' : blocker ? 'Locked' : 'Saw'}
          </button>
        )}
      </div>
      {a.inputs && (
        <div className="sawmill-inputs">
          <Cost cost={a.inputs} have={s.storage.bank} />
          <span className="dim small num">
            You have {Object.keys(a.inputs).map((id) => `${fmt(recipeMaterialCount(s.storage.bank, id))} ${materialDef(id).name}`).join(' · ')}
          </span>
        </div>
      )}
      {active && runningAction && <ProgressBar value={runningAction.progress / interval} color={a.color} />}
      {!levelLocked && <MasteryProgress s={s} mastery={a.mastery} compact />}
    </article>
  );
}

/** Sawmilling: saw logs into planks and weapon parts, and refine heartwood fragments. */
export function Sawmill() {
  const s = useGame();
  const [showLocked, setShowLocked] = useState(false);
  const level = skillLevel(s, 'sawmilling');
  const all = actionsFor('sawmilling').filter((a) => !a.batchMastery || masteryLevel(s, `task.${a.batchOf}`) >= a.batchMastery);
  const lockedTotal = all.filter((a) => a.level > level).length;

  return (
    <div className="sawmill-view">
      <SkillIntro step="Saw logs into planks and parts">
        Logs from Woodcutting become <b>planks</b>, and the <b>bow staves</b>, <b>wand blanks</b> and <b>staff shafts</b> that Woodcrafting needs for every bow, wand and staff.
      </SkillIntro>
      <SkillMinigame skill="sawmilling" />
      {GROUPS.map((group) => {
        const list = all.filter(group.test);
        const open = list.filter((a) => a.level <= level);
        const locked = list.filter((a) => a.level > level);
        const shown = [...open, ...(showLocked ? locked : locked.slice(0, 1))];
        if (!shown.length) return null;
        return (
          <section key={group.id} className="sawmill-group">
            <h3>{group.label}</h3>
            <p className="dim small">{group.blurb}</p>
            <div className="sawmill-grid">
              {shown.map((a) => <SawCard key={a.id} a={a} />)}
            </div>
          </section>
        );
      })}
      {lockedTotal > 0 && (
        <button type="button" className="btn sm ghost" onClick={() => setShowLocked((v) => !v)}>
          {showLocked ? 'Hide locked' : 'Show all locked recipes'}
        </button>
      )}
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

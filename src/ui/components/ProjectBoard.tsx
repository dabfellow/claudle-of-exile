import { useState } from 'react';
import { PROFESSION_PROJECTS } from '../../data/professionProjects';
import { materialDef } from '../../data/materials';
import { baseDef } from '../../data/bases';
import { uniqueMapDef } from '../../data/maps';
import { cancelProject, projectPreview, resumeProject, startProject } from '../../engine/professions';
import type { SkillId } from '../../engine/types';
import { game, useGame } from '../../game';
import { ProgressBar } from './common';
import { MasteryProgress } from './MasteryProgress';

export function ProjectBoard({ skill, go }: { skill: SkillId; go?: (skill: SkillId) => void }) {
  const s = useGame();
  const [repeats, setRepeats] = useState(1);
  const projects = PROFESSION_PROJECTS.filter((p) => p.skill === skill);
  const run = s.professionProgress.activeProject;
  if (!projects.length && run?.project.skill !== skill) return null;
  return <section className="card">
    <h3>Projects</h3>
    <p className="muted small">Inputs are set aside in full when you start. Projects use your activity slot. Stop pauses work; cancel returns inputs and discards progress. Protected rewards cannot double or conserve inputs.</p>
    {run?.project.skill === skill && <div className="callout">
      <b>{run.project.name}</b> · {Math.ceil(Math.max(0, run.project.durationMs - run.elapsedMs) / 1000)}s base work left · {run.remaining} run(s) remaining
      <ProgressBar value={run.elapsedMs / run.project.durationMs} />
      <p>{run.status === 'return' ? 'Cancelled: original base waiting for inventory space' : run.stopReason ?? (s.action?.kind === 'project' ? 'Working' : 'Paused')}</p>
      <p className="small">Reserved: {Object.entries(run.escrow).map(([id, n]) => `${n} ${materialDef(id).name}`).join(', ')}{run.item ? ` · original ${baseDef(run.item.baseId).name}` : ''}</p>
      <button className="btn sm" disabled={run.status === 'return'} onClick={() => game.act((st) => resumeProject(st))}>Resume</button>{' '}
      <button className="btn sm" onClick={() => game.act((st) => cancelProject(st))}>{run.status === 'return' ? 'Collect original base' : 'Cancel and return inputs'}</button>
    </div>}
    {projects.map((p) => {
      const preview = projectPreview(s, p.id);
      const reason = preview.reason;
      const supply = Math.min(...Object.entries(p.inputs).map(([id, n]) => Math.floor((s.account.bank[id] ?? 0) / n)));
      return <div key={p.id} className="callout">
        <b>{p.name}</b> · Level {p.level} · {p.durationMs / 1000}s · {p.xp} XP
        <MasteryProgress s={s} mastery={{ id: `task.project_${p.id}`, name: p.name, profile: 'project' }} />
        <p>{p.use}</p>
        {preview.notes?.map((n) => <p key={n} className="warn small">{n}</p>)}
        <p>Cost per run: {Object.entries(p.inputs).map(([id, n]) => `${n} ${materialDef(id).name}`).join(', ')}. Supplies cover {supply} run(s).</p>
        <p>Produces: {p.reward.category === 'progress' ? Object.entries(p.reward.materials).map(([id, n]) => `${n} ${materialDef(id).name}`).join(', ') : p.reward.category === 'chart' ? uniqueMapDef(p.reward.id).name : p.reward.name ?? baseDef(p.reward.baseId).name}. {p.reward.category === 'equipment' ? 'Full inventory pauses delivery with inputs reserved.' : 'Materials and maps use shared storage with no slot limit.'} Stops after the selected runs, or when inputs run out.</p>
        <p className="small">Sources: {p.sources.map((source) => <button className="btn sm ghost" key={source.label} onClick={() => go?.(source.skill)}>{source.label}</button>)} · Completed: {s.professionProgress.projects[p.id]?.completed ?? 0}{p.discovery && s.professionProgress.discoveries[p.discovery] ? ' · Discovered' : ''}</p>
        {p.repeatable && <label>Runs <input aria-label={`${p.name} runs`} type="number" min={1} max={100} value={repeats} onChange={(e) => setRepeats(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} /></label>}{' '}
        <button className="btn sm primary" disabled={!!reason} title={reason ?? ''} onClick={() => game.act((st, ctx) => startProject(st, ctx, p.id, repeats))}>Start project</button>
        {reason && <p className="small muted">{reason}</p>}
      </div>;
    })}
  </section>;
}

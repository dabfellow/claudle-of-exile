import { campaignQuestAction, campaignQuestView } from '../../engine/campaignQuests';
import { zoneDef } from '../../data/zones';
import { game, useGame } from '../../game';
import { Badge, ProgressBar } from './common';
import './campaign-journal.css';

/** Main story lives beside the map; it never replaces the onboarding tutorial. */
export function CampaignJournal({ chapter, onSelectZone }: { chapter?: number; onSelectZone?: (zoneId: string) => void }) {
  const s = useGame();
  const view = campaignQuestView(s, chapter);
  const current = view.steps.find((entry) => entry.current);
  const completed = view.steps.filter((entry) => entry.complete);

  return (
    <section className="card campaign-journal" aria-label="Campaign journal">
      <div className="campaign-journal-heading">
        <div>
          <span className="dim small">Main story · Act {view.chapter.act}</span>
          <h3>{view.chapter.title}</h3>
        </div>
        <Badge tone={view.complete ? 'success' : 'neutral'}>{view.complete ? 'Complete' : `${completed.length}/${view.steps.length}`}</Badge>
      </div>
      <ProgressBar value={completed.length / view.steps.length} />
      {view.complete ? (
        <p className="muted">{view.chapter.conclusion}</p>
      ) : view.locked ? (
        <p className="muted">Continue the earlier chapters to uncover this part of the story.</p>
      ) : current ? (
        <div className="campaign-journal-current" key={current.step.id}>
          <h4>{current.step.title}</h4>
          <p className="campaign-journal-dialogue">{current.step.speaker && <strong>{current.step.speaker}: </strong>}{current.step.text}</p>
          <p className="campaign-journal-objective">{current.step.objective}</p>
          <div className="campaign-journal-actions">
            {current.step.kind === 'interaction' ? (
              <button className="btn primary" disabled={!current.available} title={current.available ? undefined : 'Reach this area before continuing.'} onClick={() => game.act((st) => campaignQuestAction(st, current.step.id))}>
                {current.step.action}
              </button>
            ) : <span className="dim small">Clear {zoneDef(current.step.zoneId).name} to continue.</span>}
            {onSelectZone && <button className="btn sm" onClick={() => onSelectZone(current.step.zoneId)}>Show {zoneDef(current.step.zoneId).name}</button>}
          </div>
          {!current.available && <p className="dim small">Reach {zoneDef(current.step.zoneId).name} first.</p>}
        </div>
      ) : null}
      {completed.length > 0 && (
        <details className="campaign-journal-record">
          <summary>Story so far · {completed.length} completed</summary>
          <ol>{completed.map(({ step }) => <li key={step.id}><strong>{step.title}</strong><p>{step.text}</p></li>)}</ol>
        </details>
      )}
    </section>
  );
}

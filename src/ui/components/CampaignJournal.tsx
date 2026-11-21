import { campaignQuestAction, campaignQuestView } from '../../engine/campaignQuests';
import type { CampaignQuestStep } from '../../data/campaignQuests';
import { bossTable } from '../../data/drops';
import { materialDef } from '../../data/materials';
import { zoneDef } from '../../data/zones';
import { game, useGame } from '../../game';
import { actRevealed } from '../campaignExploration';
import { Badge, MatIcon, PageHeader, ProgressBar } from './common';
import './campaign-journal.css';

function QuestReward({ step }: { step: CampaignQuestStep }) {
  const drops = step.kind === 'clear' ? bossTable(zoneDef(step.zoneId).tier).guaranteed : null;
  return (
    <div className="campaign-journal-reward">
      <strong>Reward</strong>
      {drops ? (
        <div className="row wrap" style={{ gap: 6 }}>
          {[{ id: 'boss_trophy', qty: 1 }, ...drops].map(({ id, qty }) => (
            <span className="io-item" key={id}><MatIcon id={id} /> {qty}× {materialDef(id).name}</span>
          ))}
        </div>
      ) : <span className="muted">Story progression</span>}
    </div>
  );
}

/** Main story lives beside the map; it never replaces the onboarding tutorial. */
export function CampaignJournal({ chapter, onSelectZone, showRewards = false }: { chapter?: number; onSelectZone: (zoneId: string) => void; showRewards?: boolean }) {
  const s = useGame();
  const view = campaignQuestView(s, chapter);
  const current = view.steps.find((entry) => entry.current);
  const completed = view.steps.filter((entry) => entry.complete);
  const zone = current ? zoneDef(current.step.zoneId) : null;

  const journal = (
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
      ) : current && zone ? (
        <div className="campaign-journal-current" key={current.step.id}>
          <h4>{current.step.title}</h4>
          <p className="campaign-journal-dialogue">{current.step.speaker && <strong>{current.step.speaker}: </strong>}{current.step.text}</p>
          <p className="campaign-journal-objective">{showRewards && <strong>Objective<br /></strong>}{current.step.objective}</p>
          {showRewards && <QuestReward step={current.step} />}
          <div className="campaign-journal-actions">
            {current.step.kind === 'interaction' ? (
              <button className="btn primary" disabled={!current.available} title={current.available ? undefined : 'Reach this zone before continuing.'} onClick={() => game.act((st) => campaignQuestAction(st, current.step.id))}>
                {current.step.action}
              </button>
            ) : <span className="dim small">Clear {zone.name} to continue.</span>}
            <button className="btn sm" disabled={!actRevealed(s, zone.act)} onClick={() => onSelectZone(zone.id)}>Show {zone.name}</button>
          </div>
          {!current.available && <p className="dim small">Reach {zone.name} first.</p>}
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
  return showRewards ? <div className="page quests-page"><PageHeader title="Quests" />{journal}</div> : journal;
}

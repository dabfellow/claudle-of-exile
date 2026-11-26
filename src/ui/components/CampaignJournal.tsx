import { campaignQuestAction, campaignQuestView } from '../../engine/campaignQuests';
import type { CampaignQuestStep } from '../../data/campaignQuests';
import { bossTable } from '../../data/drops';
import { materialDef } from '../../data/materials';
import { zoneDef } from '../../data/zones';
import { game, useGame } from '../../game';
import { actRevealed } from '../campaignExploration';
import { Badge, GameIcon, MatIcon, PageHeader, ProgressBar } from './common';
import './campaign-journal.css';

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
          <p className="campaign-journal-objective">{current.step.objective}</p>
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
  if (!showRewards) return journal;

  const status = view.complete ? 'completed' : view.locked ? 'sealed' : 'active';
  return (
    <div className="page quests-page chronicle-page">
      <PageHeader title="Quests" kicker="Hideout Chronicle" />
      <section className="campaign-journal chronicle" aria-label="Campaign journal">
        <header className="chronicle-banner">
          <span className="chronicle-banner-emblem" aria-hidden="true"><GameIcon name="campaign" size={26} /></span>
          <div className="chronicle-banner-text">
            <span className="chronicle-kicker">Main story · Act {view.chapter.act}</span>
            <h2>{view.chapter.title}</h2>
            <div className="chronicle-banner-progress">
              <ProgressBar value={completed.length / view.steps.length} />
              <span className="num">{completed.length}/{view.steps.length} steps</span>
            </div>
          </div>
          <WaxSeal status={status} />
        </header>
        <div className="chronicle-board">
          <article className="chronicle-plaque">
            {view.complete ? (
              <>
                <span className="chronicle-plaque-kicker">Chapter concluded</span>
                <h3>{view.chapter.title}</h3>
                <p className="chronicle-dialogue">{view.chapter.conclusion}</p>
              </>
            ) : view.locked ? (
              <>
                <span className="chronicle-plaque-kicker">Sealed chapter</span>
                <p className="chronicle-dialogue">Continue the earlier chapters to uncover this part of the story.</p>
              </>
            ) : current && zone ? (
              <div className="chronicle-current" key={current.step.id}>
                <span className="chronicle-plaque-kicker">Active bounty · {zone.name}</span>
                <h3>{current.step.title}</h3>
                <p className="chronicle-dialogue">{current.step.speaker && <strong>{current.step.speaker}: </strong>}{current.step.text}</p>
                <div className="chronicle-objective">
                  <span className="chronicle-section-title">Objective</span>
                  <p>{current.step.objective}</p>
                </div>
                <QuestRewardSockets step={current.step} />
                <div className="chronicle-actions">
                  {current.step.kind === 'interaction' ? (
                    <button className="btn primary chronicle-act" disabled={!current.available} title={current.available ? undefined : 'Reach this zone before continuing.'} onClick={() => game.act((st) => campaignQuestAction(st, current.step.id))}>
                      {current.step.action}
                    </button>
                  ) : <span className="chronicle-hint">Clear {zone.name} to continue.</span>}
                  <button className="btn sm chronicle-map" disabled={!actRevealed(s, zone.act)} onClick={() => onSelectZone(zone.id)}>
                    <GameIcon name="map" size={14} /> Show {zone.name}
                  </button>
                </div>
                {!current.available && <p className="chronicle-hint">Reach {zone.name} first.</p>}
              </div>
            ) : null}
          </article>
          <aside className="chronicle-slate" aria-label="Chapter steps">
            <span className="chronicle-section-title">Bounty board</span>
            <ol className="chronicle-steps">
              {view.steps.map(({ step, complete, current: isCurrent }) => (
                <li key={step.id} className={complete ? 'complete' : isCurrent ? 'current' : 'upcoming'}>
                  <span className="chronicle-step-mark" aria-hidden="true">{complete ? '✓' : isCurrent ? '!' : ''}</span>
                  <span className="chronicle-step-text">
                    {complete || isCurrent ? <b>{step.title}</b> : <b className="dim">Unrevealed</b>}
                    {(complete || isCurrent) && <small>{step.objective}</small>}
                  </span>
                  <span className="sr-only">{complete ? 'Completed' : isCurrent ? 'Active' : 'Not yet revealed'}</span>
                </li>
              ))}
            </ol>
            {completed.length > 0 && (
              <details className="campaign-journal-record chronicle-record">
                <summary>Story so far · {completed.length} completed</summary>
                <ol>{completed.map(({ step }) => <li key={step.id}><strong>{step.title}</strong><p>{step.text}</p></li>)}</ol>
              </details>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

const SEAL_LABEL = { active: 'Active', completed: 'Completed', sealed: 'Sealed' } as const;

/** A coloured wax seal stamped on the chronicle: red while active, green once done, grey while locked. */
function WaxSeal({ status }: { status: keyof typeof SEAL_LABEL }) {
  return (
    <span className={`chronicle-seal ${status}`} role="status">
      <span className="chronicle-seal-wax" aria-hidden="true" />
      <span className="chronicle-seal-label">{SEAL_LABEL[status]}</span>
    </span>
  );
}

/** The Quests page's reward line, as socketed icons: the boss trophy and guaranteed boss drops, or story progression. */
function QuestRewardSockets({ step }: { step: CampaignQuestStep }) {
  const drops = step.kind === 'clear' ? bossTable(zoneDef(step.zoneId).tier).guaranteed : null;
  return (
    <div className="chronicle-rewards">
      <span className="chronicle-section-title">Reward</span>
      <div className="chronicle-sockets">
        {drops ? (
          [{ id: 'boss_trophy', qty: 1 }, ...drops].map(({ id, qty }) => (
            <span className="chronicle-socket" key={id} title={materialDef(id).name}>
              <span className="chronicle-socket-gem"><MatIcon id={id} size={26} /><b className="num">{qty}</b></span>
              <span className="chronicle-socket-name">{materialDef(id).name}</span>
            </span>
          ))
        ) : (
          <span className="chronicle-socket story">
            <span className="chronicle-socket-gem"><GameIcon name="campaign" size={22} /></span>
            <span className="chronicle-socket-name">Story progression</span>
          </span>
        )}
      </div>
    </div>
  );
}

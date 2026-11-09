import type { TimedEvent } from '../../data/events';
import { game, useGame } from '../../game';
import { Badge } from './common';

/** "3 days", "1d 4h", "5h 20m", "12m": how long until a moment, at a glance. */
export function fmtUntil(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60000));
  const hours = Math.floor(minutes / 60), days = Math.floor(hours / 24);
  if (days >= 2) return `${days} days`;
  if (days === 1) return hours % 24 ? `1d ${hours % 24}h` : '1 day';
  if (hours >= 1) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

/** In the player's own timezone, with the time: a holiday that starts at midnight UTC is Wednesday evening in the Americas. */
const dateText = (at: number) => new Date(at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** When it starts, in how long and on what date, and how long it runs. */
function when(t: TimedEvent, now: number): string {
  if (t.start === null) return '';
  const length = t.end === null ? '' : ` · runs ${fmtUntil(t.end - t.start)}`;
  return `starts in ${fmtUntil(t.start - now)} (${dateText(t.start)})${length}`;
}

/** How many coming events the Hideout lists. */
const SHOWN = 4;

/** On now and coming up, for the Hideout. */
export function EventsCard() {
  useGame();
  const now = Date.now();
  const { live, upcoming } = game.eventCalendar(now);
  return (
    <div className="card events-card">
      <div className="card-title">Events</div>
      {live.length > 0 && (
        <ul className="events-list">
          {live.map((t) => (
            <li key={t.event.id} className="events-live">
              <b>{t.event.name}</b> <Badge tone="success" live>On now</Badge>
              <div className="dim small">{t.event.blurb}{t.end !== null ? ` · ends in ${fmtUntil(t.end - now)}` : ''}</div>
            </li>
          ))}
        </ul>
      )}
      {live.length === 0 && <p className="dim small">No event is running right now.</p>}
      {upcoming.length > 0 && (
        <>
          <div className="events-sub dim small">Coming up</div>
          <ul className="events-list">
            {upcoming.slice(0, SHOWN).map((t) => (
              <li key={t.event.id}>
                <b>{t.event.name}</b>
                <div className="dim small">{t.event.blurb} · {when(t, now)}</div>
              </li>
            ))}
          </ul>
        </>
      )}
      {live.length > 1 && <p className="dim small">Events running together add up: two Double XP events give triple XP.</p>}
    </div>
  );
}

/** The banner hints at an event this close to starting. */
export const SOON_MS = 3 * 24 * 60 * 60 * 1000;

import { useCallback, useEffect, useState } from 'react';
import { classDef, type ClassId } from '../../data/classes';
import { EVENTS, type EventRow, type LiveEvent } from '../../data/events';
import { game, useGame } from '../../game';
import { errorReportingConfigured, sentryIssuesUrl } from '../../platform/errors';
import {
  adminStats,
  errorText,
  listFeedback,
  listReviews,
  setFeedbackStatus,
  type AdminStats,
  type FeedbackRow,
  type FeedbackStatus,
  type ReviewRow,
} from '../../platform/feedback';
import { Badge, EmptyState, PageHeader, Tabs } from '../components/common';
import { Stars } from '../components/FeedbackCard';

type Tab = 'overview' | 'events' | 'feedback' | 'reviews' | 'errors';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Only reachable when the account is in the `admins` table; the database refuses everyone else anyway. */
export function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    setError(null);
    adminStats().then(setStats, (e) => setError(errorText(e)));
  }, []);
  useEffect(loadStats, [loadStats]);

  return (
    <div className="page">
      <PageHeader title="Admin" kicker="Players, feedback and errors" actions={<button className="btn sm" onClick={loadStats}>Refresh</button>} />
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'events', label: 'Events' },
          { id: 'feedback', label: 'Feedback', count: stats?.feedback_open, hot: !!stats?.feedback_open },
          { id: 'reviews', label: 'Reviews', count: stats?.reviews.count },
          { id: 'errors', label: 'Errors' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {error && (
        <div className="card">
          <b>Couldn't load admin data:</b> <span className="muted">{error}</span>
          <p className="dim small">Run the SQL in docs/ops/SETUP.md and add your account to the admins table.</p>
        </div>
      )}
      {tab === 'overview' && !error && <Overview stats={stats} />}
      {tab === 'events' && <EventsTab />}
      {tab === 'feedback' && <FeedbackTab onChange={loadStats} />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'errors' && <ErrorsTab />}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat-value">{value}</div>
      <div className="admin-stat-label">{label}</div>
      {sub && <div className="dim small">{sub}</div>}
    </div>
  );
}

/** Horizontal bars for a small count breakdown. */
function Bars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  if (!rows.length) return <p className="dim small">No data yet.</p>;
  return (
    <div className="admin-bars">
      {rows.map(([label, n]) => (
        <div key={label} className="admin-bar-row">
          <span className="admin-bar-label">{label}</span>
          <span className="admin-bar-track">
            <span className="admin-bar-fill" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <span className="admin-bar-n">{n}</span>
        </div>
      ))}
    </div>
  );
}

function Overview({ stats }: { stats: AdminStats | null }) {
  if (!stats) return <p className="dim">Loading…</p>;
  const classes = Object.entries(stats.by_class)
    .map(([id, n]) => [classDef(id as ClassId).name, n] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  const levels = Object.entries(stats.by_level)
    .map(([b, n]) => [Number(b), n] as [number, number])
    .sort((a, b) => a[0] - b[0])
    .map(([b, n]) => [`${Math.max(1, b)}–${b + 4}`, n] as [string, number]);
  return (
    <>
      <div className="admin-stats">
        <Stat label="Accounts" value={stats.accounts} sub={`+${stats.new_accounts_week} this week`} />
        <Stat label="Players with a character" value={stats.players} />
        <Stat label="Characters" value={stats.characters} />
        <Stat label="Active today" value={stats.active_day} sub={`${stats.active_week} this week`} />
        <Stat label="Act 1 clears" value={stats.act1_clears} />
        <Stat label="Average review" value={stats.reviews.avg ? `${stats.reviews.avg}★` : '—'} sub={`${stats.reviews.count} reviews`} />
      </div>
      <div className="admin-two">
        <div className="card">
          <div className="card-title">Characters by class</div>
          <Bars rows={classes} />
        </div>
        <div className="card">
          <div className="card-title">Characters by level</div>
          <Bars rows={levels} />
        </div>
      </div>
      <p className="dim small">Accounts only: demos aren't saved, and older guest saves stay in the browser.</p>
    </>
  );
}

const STATUS_TONE: Record<FeedbackStatus, 'warn' | 'neutral' | 'success'> = { new: 'warn', read: 'neutral', resolved: 'success' };

function FeedbackTab({ onChange }: { onChange: () => void }) {
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('new');
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const load = useCallback(() => {
    setRows(null);
    listFeedback(filter).then(setRows, () => setRows([]));
  }, [filter]);
  useEffect(load, [load]);

  const mark = async (row: FeedbackRow, status: FeedbackStatus) => {
    await setFeedbackStatus(row.id, status);
    load();
    onChange();
  };

  return (
    <>
      <Tabs
        compact
        tabs={[
          { id: 'new', label: 'New' },
          { id: 'read', label: 'Read' },
          { id: 'resolved', label: 'Resolved' },
          { id: 'all', label: 'All' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {!rows ? (
        <p className="dim">Loading…</p>
      ) : !rows.length ? (
        <EmptyState small title="Nothing here">No {filter === 'all' ? '' : filter} feedback.</EmptyState>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="card admin-feedback">
            <div className="row wrap">
              <Badge tone={r.kind === 'bug' ? 'danger' : r.kind === 'idea' ? 'gold' : 'neutral'}>{r.kind}</Badge>
              <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              <span className="dim small">{when(r.created_at)}</span>
              <span className="spacer" />
              {r.status !== 'read' && (
                <button className="btn ghost sm" onClick={() => mark(r, 'read')}>
                  Mark read
                </button>
              )}
              {r.status !== 'resolved' && (
                <button className="btn sm" onClick={() => mark(r, 'resolved')}>
                  Resolve
                </button>
              )}
              {r.status === 'resolved' && (
                <button className="btn ghost sm" onClick={() => mark(r, 'new')}>
                  Reopen
                </button>
              )}
            </div>
            <p className="admin-message">{r.message}</p>
            <div className="dim small">
              v{r.context.version}
              {r.context.classId && ` · ${classDef(r.context.classId as ClassId).name} lv ${r.context.level}`}
              {r.context.zone && ` · ${r.context.zone}`}
              {r.user_id ? ' · signed in' : ' · guest'}
            </div>
          </div>
        ))
      )}
    </>
  );
}

function ReviewsTab() {
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  useEffect(() => {
    listReviews().then(setRows, () => setRows([]));
  }, []);
  if (!rows) return <p className="dim">Loading…</p>;
  if (!rows.length) return <EmptyState small title="No reviews yet" />;
  const counts = [5, 4, 3, 2, 1].map((n) => [`${n}★`, rows.filter((r) => r.stars === n).length] as [string, number]);
  return (
    <>
      <div className="card">
        <div className="card-title">Ratings</div>
        <Bars rows={counts} />
      </div>
      {rows.map((r) => (
        <div key={r.user_id} className="card">
          <div className="row wrap">
            <Stars value={r.stars} size={16} />
            <b>{r.display_name || 'Player'}</b>
            <span className="spacer" />
            <span className="dim small">{when(r.updated_at)}</span>
          </div>
          {r.comment && <p className="admin-message">{r.comment}</p>}
        </div>
      ))}
    </>
  );
}

/** A stored time as a date picker wants it, in the admin's own time zone. */
function toPicker(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

const fromPicker = (value: string) => (value ? new Date(value).toISOString() : null);

/** One event: on or off by hand, or between two times. */
function EventControl({ event }: { event: LiveEvent }) {
  const row = game.eventRows.find((r) => r.id === event.id);
  const [start, setStart] = useState(toPicker(row?.starts_at));
  const [end, setEnd] = useState(toPicker(row?.ends_at));
  const [error, setError] = useState<string | null>(null);
  const enabled = !!row?.enabled;
  const live = game.liveEvents.includes(event);
  const stored = { id: event.id, enabled, starts_at: row?.starts_at ?? null, ends_at: row?.ends_at ?? null };
  const save = (next: EventRow) => {
    setError(null);
    game.saveEvent(next).catch((e) => setError(`Couldn't change it: ${errorText(e)}. If the table is missing, run the events SQL in docs/ops/SETUP.md.`));
  };
  const schedule = () => {
    if (!start) return setError('Pick a start time');
    if (end && end <= start) return setError('The end has to be after the start');
    save({ ...stored, starts_at: fromPicker(start), ends_at: fromPicker(end) });
  };
  const clear = () => {
    setStart('');
    setEnd('');
    save({ ...stored, starts_at: null, ends_at: null });
  };
  return (
    <div className="admin-event">
      <div className="row wrap">
        <b>{event.name}</b>
        <span className="muted small">{event.blurb}</span>
        {live && <Badge>Live</Badge>}
        <span className="spacer" />
        <button className={`btn sm ${enabled ? '' : 'primary'}`} onClick={() => save({ ...stored, enabled: !enabled })}>
          {enabled ? 'Turn off' : 'Turn on'}
        </button>
      </div>
      <div className="row wrap">
        <label className="dim small">
          Starts <input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="dim small">
          Ends <input className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <button className="btn sm" onClick={schedule}>
          Save schedule
        </button>
        <button className="btn sm ghost" disabled={!stored.starts_at && !start && !end} onClick={clear}>
          Clear
        </button>
      </div>
      {error && <p className="warn small">{error}</p>}
    </div>
  );
}

/** Runs limited-time events for everyone, by hand or on a schedule. */
function EventsTab() {
  useGame();
  useEffect(() => void game.refreshEvents(), []);
  return (
    <div className="card">
      <div className="card-title">Limited-time events</div>
      <p className="dim small" style={{ marginTop: 0 }}>
        Turn on runs an event until you turn it off. A schedule starts and ends it by itself, in your time zone; leave Ends empty to run it until you clear it. Events running together use the best
        bonus of each kind. Open games pick up a change within 5 minutes.
      </p>
      {EVENTS.map((e) => {
        const row = game.eventRows.find((r) => r.id === e.id);
        return <EventControl key={`${e.id} ${row?.starts_at} ${row?.ends_at}`} event={e} />;
      })}
    </div>
  );
}

function ErrorsTab() {
  return (
    <div className="card">
      <div className="card-title">Crash reports (Sentry)</div>
      {errorReportingConfigured() ? (
        <>
          <p className="muted" style={{ marginTop: 0 }}>
            Errors from players' browsers are grouped by cause in Sentry, with how often they happen, which build and which browser. Mark them resolved
            or ignored there; a resolved error that comes back in a new build reopens by itself.
          </p>
          <a className="btn" href={sentryIssuesUrl()} target="_blank" rel="noreferrer">
            Open issues in Sentry
          </a>
        </>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          Not set up yet: add <code>VITE_SENTRY_DSN</code> to <code>.env.local</code> and redeploy (docs/ops/SETUP.md).
        </p>
      )}
    </div>
  );
}

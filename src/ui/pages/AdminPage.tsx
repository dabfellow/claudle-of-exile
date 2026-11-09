import { useCallback, useEffect, useState } from 'react';
import { classDef, type ClassId } from '../../data/classes';
import { classBreakdown, findPlayers, levelBreakdown, type PlayerRow } from '../../platform/admin';
import { marketRules } from '../../data/marketRules';
import { fmt, fmtTime } from '../components/common';
import { PageErrorBoundary } from '../components/PageErrorBoundary';
import '../round2-session3.css';
import { PlayerInspector } from '../components/AdminOperations';
import { AdminFeedback } from '../components/AdminFeedback';
import { AdminEvents } from '../components/AdminEvents';
import { APP_VERSION, errorReportingConfigured, sentryIssuesUrl } from '../../platform/errors';
import { marketAdminBan, marketAdminList, marketAdminRemove, marketRulesVersion, uploadMarketRules, type MarketAdminRow } from '../../platform/market';
import {
  adminStats,
  errorText,
  listReviews,
  type AdminStats,
  type ReviewRow,
} from '../../platform/feedback';
import { Badge, EmptyState, PageHeader, Tabs } from '../components/common';
import { Stars } from '../components/FeedbackCard';

type Tab = 'players' | 'overview' | 'events' | 'market' | 'feedback' | 'reviews' | 'errors';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Only reachable when the account is in the `admins` table; the database refuses everyone else anyway. */
export function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [inspectId, setInspectId] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(() => {
    setError(null);
    adminStats().then(setStats, (e) => setError(errorText(e)));
  }, []);
  useEffect(() => { loadStats(); const timer = setInterval(loadStats, 30000); return () => clearInterval(timer); }, [loadStats]);

  return (
    <div className="page">
      <PageHeader title="Admin" kicker="Players, feedback and errors" actions={<button className="btn sm" onClick={loadStats}>Refresh</button>} />
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'players', label: 'Players' },
          { id: 'events', label: 'Events' },
          { id: 'market', label: 'Market' },
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
          <p className="dim small">Apply docs/ops/admin.sql after the setup and market SQL, and add your account to the admins table.</p>
        </div>
      )}
      {/* a crash in one tab shows its message here instead of blanking the game */}
      <PageErrorBoundary key={tab} where={`admin:${tab}`}>
        {tab === 'overview' && !error && <Overview stats={stats} onInspect={(id) => { setInspectId(id); setTab('players'); }} onTab={setTab} />}
        {tab === 'events' && <AdminEvents />}
        {tab === 'players' && <PlayerInspector initialId={inspectId} />}
        {tab === 'market' && <MarketTab />}
        {tab === 'feedback' && <AdminFeedback onChange={loadStats} onInspect={(id) => { setInspectId(id); setTab('players'); }} />}
        {tab === 'reviews' && <ReviewsTab />}
        {tab === 'errors' && <ErrorsTab />}
      </PageErrorBoundary>
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

/** The overview's extra figures, from the 2026-11-09 admin.sql: missing on a database that hasn't run it yet. */
type OverviewStats = AdminStats & {
  by_realm?: Record<string, number>;
  last_seen?: { day: number; week: number; month: number; older: number };
  signups_by_day?: { day: string; count: number }[];
  playtime_hours?: number;
  median_level?: number | null;
  feedback_week?: number;
};

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '—');
const realmName = (id: string) => ({ standard: 'Standard', hardcore: 'Hardcore', classic: 'Classic', 'hardcore-classic': 'Hardcore Classic' })[id] ?? (id.startsWith('ssf') ? 'Solo Self-Found' : id);

/** The latest cloud saves, newest first: who's playing right now and where. */
function RecentPlayers({ onInspect }: { onInspect: (id: string) => void }) {
  const [rows, setRows] = useState<PlayerRow[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    findPlayers('', 0).then((r) => setRows(r.slice(0, 12)), (e) => setError(errorText(e)));
  }, []);
  return (
    <div className="card">
      <div className="card-title">
        Latest saves
        <span className="grow" />
        <span className="card-hint">Newest first · click a name to inspect</span>
      </div>
      {error && <p className="warn small">{error}</p>}
      {!rows && !error && <p className="dim small">Loading…</p>}
      {rows && !rows.length && <p className="dim small">No cloud characters yet.</p>}
      {rows && rows.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Character</th>
                <th>Build</th>
                <th>Realm</th>
                <th>Where</th>
                <th>Played</th>
                <th>Saved</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button className="linklike" onClick={() => onInspect(row.id)}>
                      <b>{row.name}</b>
                    </button>
                    {row.deleted && <span className="warn small"> · deleted</span>}
                  </td>
                  <td>
                    {row.class_id} · lv {num(row.summary?.combatLevel) || '?'}
                  </td>
                  <td>{realmName(row.summary?.realm ?? 'standard')}</td>
                  <td>{row.zone || 'Town'}</td>
                  <td>{fmtTime(num(row.playtime_ms))}</td>
                  <td>{when(row.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Overview({ stats, onInspect, onTab }: { stats: OverviewStats | null; onInspect: (id: string) => void; onTab: (t: Tab) => void }) {
  if (!stats) return <p className="dim">Loading…</p>;
  const classes = classBreakdown(stats.by_class ?? {}).map(([id, n]) => [
    ['warrior','duelist','ranger','shadow','mage','templar','exile'].includes(id) ? classDef(id as ClassId).name : id, n,
  ] as [string, number]);
  const levels = levelBreakdown(stats.by_level ?? {});
  const chars = num(stats.characters);
  const funnel = [['Created', chars], ...(stats.funnel ?? []).map((r) => [`Act ${r.act}`, num(r.count)]), ['Maps T1+', num(stats.maps)]] as [string, number][];
  const seen = stats.last_seen;
  const signups = stats.signups_by_day ?? [];
  return (
    <>
      <div className="admin-stats">
        <Stat label="Accounts" value={fmt(num(stats.accounts))} sub={`+${num(stats.new_accounts_week)} this week`} />
        <Stat label="Players with a character" value={fmt(num(stats.players))} sub={`${pct(num(stats.players), num(stats.accounts))} of accounts`} />
        <Stat label="Characters" value={fmt(chars)} sub={stats.median_level != null ? `median level ${Math.round(num(stats.median_level))}` : undefined} />
        <Stat label="Active today" value={fmt(num(stats.active_day))} sub={`${num(stats.active_week)} this week · ${pct(num(stats.active_week), num(stats.players))} of players`} />
        {stats.playtime_hours != null && <Stat label="Time played" value={`${fmt(num(stats.playtime_hours))} h`} sub="simulated, all characters" />}
        <button className="admin-stat linklike" onClick={() => onTab('feedback')} title="Open the feedback inbox">
          <div className="admin-stat-value">{num(stats.feedback_open)}</div>
          <div className="admin-stat-label">Unread feedback</div>
          {stats.feedback_week != null && <div className="dim small">{num(stats.feedback_week)} sent this week</div>}
        </button>
        <Stat label="Average review" value={stats.reviews?.avg ? `${stats.reviews.avg}★` : '—'} sub={`${num(stats.reviews?.count)} reviews`} />
      </div>
      <div className="card"><div className="card-title">Campaign progression</div>
        <div className="admin-funnel">{funnel.map(([label, n]) => <div key={label}><b>{fmt(n)}</b><span>{label}</span><span className="dim small">{label === 'Created' ? '' : pct(n, chars)}</span></div>)}</div>
        <p className="dim small">Current cloud characters and their recorded milestones; percentages are of all characters.</p>
      </div>
      {(seen || signups.length > 0) && (
        <div className="admin-two">
          {seen && (
            <div className="card"><div className="card-title">Players by last save</div>
              <Bars rows={[['Today', num(seen.day)], ['1–7 days ago', num(seen.week)], ['8–30 days ago', num(seen.month)], ['Longer', num(seen.older)]]} />
              <p className="dim small">Each player counted once, by their most recent cloud save.</p>
            </div>
          )}
          {signups.length > 0 && (
            <div className="card"><div className="card-title">New accounts, last 14 days</div>
              <Bars rows={signups.map((d) => [new Date(d.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), num(d.count)] as [string, number])} />
            </div>
          )}
        </div>
      )}
      {!seen && <p className="dim small">Run the updated docs/ops/admin.sql for last-seen, sign-up, realm and playtime figures here.</p>}
      <RecentPlayers onInspect={onInspect} />
      {stats.by_realm && Object.keys(stats.by_realm).length > 0 && (
        <div className="card"><div className="card-title">Characters by realm</div>
          <Bars rows={Object.entries(stats.by_realm).map(([id, n]) => [realmName(id), num(n)] as [string, number]).sort((a, b) => b[1] - a[1])} />
        </div>
      )}
      <div className="admin-two">
        <div className="card"><div className="card-title">Top death zones</div><Bars rows={Object.entries(stats.death_zones ?? {}).sort((a,b) => b[1]-a[1])} /><p className="dim small">Locations are recorded from this update onward; old saves only contain total deaths.</p></div>
        <div className="card"><div className="card-title">Anonymous demo counters (last 30 days)</div><Bars rows={[
          ['Demo started',stats.demos?.demo_started ?? 0],['Act 1 boss beaten',stats.demos?.demo_act1_boss_killed ?? 0],['Converted to account',stats.demos?.demo_converted_to_account ?? 0],
        ]} /><p className="dim small">Approximate session counters, not unique people or a matched retention cohort. Do Not Track is respected. Guest saves remain local.</p></div>
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
    </>
  );
}

/** Keeps the server's item rules in step with the game, and takes bad listings or traders down. */
function MarketTab() {
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [rows, setRows] = useState<MarketAdminRow[] | null>(null);
  const [rules, setRules] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    marketRulesVersion().then(setRules, (e) => setError(errorText(e)));
    marketAdminList(filter).then(setRows, (e) => setError(errorText(e)));
  }, [filter]);
  useEffect(load, [load]);

  const act = (step: Promise<void>) => step.then(load, (e) => setError(errorText(e)));
  const upload = () => act(uploadMarketRules(APP_VERSION, marketRules()));

  return (
    <>
      {error && (
        <div className="card">
          <b>Market problem:</b> <span className="muted">{error}</span>
          <p className="dim small">If the market isn't set up yet, run docs/ops/market.sql in Supabase first.</p>
        </div>
      )}
      <div className="card">
        <div className="card-title">
          Item rules
          <span className="grow" />
          <button className="btn sm primary" onClick={() => void upload()}>
            Upload from this build
          </button>
        </div>
        <p className="small">
          {rules ? `The server is checking items against ${rules}. This build is ${APP_VERSION}.` : 'No rules uploaded yet, so nothing can be listed.'}
        </p>
        <p className="dim small">Upload again whenever a release changes modifiers, bases, uniques or runes. Until then, items using the new ones can't be listed.</p>
      </div>
      <Tabs
        compact
        tabs={[
          { id: 'active', label: 'Up for sale' },
          { id: 'all', label: 'All' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {!rows ? (
        <p className="dim">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState small title="No listings" />
      ) : (
        rows.map((l) => (
          <div key={l.id} className="card row wrap">
            <b className={`rarity-${l.item.rarity}`}>{l.item_name}</b>
            <span className="muted small">
              {l.mode === 'buy' ? 'Buy now' : 'Auction'} · {l.high_bid ?? l.price} {l.currency} · {when(l.created_at)}
            </span>
            <Badge tone={l.status === 'active' ? 'success' : 'neutral'}>{l.status}</Badge>
            {l.seller_banned && <Badge tone="warn">Seller banned</Badge>}
            <span className="spacer" />
            {l.status === 'active' && (
              <button className="btn sm" onClick={() => void act(marketAdminRemove(l.id))}>
                Remove
              </button>
            )}
            <button className="btn sm ghost" onClick={() => void act(marketAdminBan(l.seller, !l.seller_banned))}>
              {l.seller_banned ? 'Unban seller' : 'Ban seller'}
            </button>
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

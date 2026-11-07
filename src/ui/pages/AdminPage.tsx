import { useCallback, useEffect, useState } from 'react';
import { classDef, type ClassId } from '../../data/classes';
import { classBreakdown, levelBreakdown } from '../../platform/admin';
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
      {tab === 'overview' && !error && <Overview stats={stats} />}
      {tab === 'events' && <AdminEvents />}
      {tab === 'players' && <PlayerInspector initialId={inspectId} />}
      {tab === 'market' && <MarketTab />}
      {tab === 'feedback' && <AdminFeedback onChange={loadStats} onInspect={(id) => { setInspectId(id); setTab('players'); }} />}
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
  const classes = classBreakdown(stats.by_class).map(([id, n]) => [
    ['warrior','duelist','ranger','shadow','mage','templar','exile'].includes(id) ? classDef(id as ClassId).name : id, n,
  ] as [string, number]);
  const levels = levelBreakdown(stats.by_level);
  return (
    <>
      <div className="card"><div className="card-title">Campaign progression</div>
        <div className="admin-funnel">{[['Created',stats.characters],...(stats.funnel ?? []).map((r) => [`Act ${r.act}`,r.count]),['Maps T1+',stats.maps ?? 0]].map(([label,n]) => <div key={label}><b>{n}</b><span>{label}</span></div>)}</div>
        <p className="dim small">Current cloud characters and their recorded milestones.</p>
      </div>
      <div className="admin-stats">
        <Stat label="Accounts" value={stats.accounts} sub={`+${stats.new_accounts_week} this week`} />
        <Stat label="Players with a character" value={stats.players} />
        <Stat label="Characters" value={stats.characters} />
        <Stat label="Active today" value={stats.active_day} sub={`${stats.active_week} this week`} />
        <Stat label="Average review" value={stats.reviews.avg ? `${stats.reviews.avg}★` : '—'} sub={`${stats.reviews.count} reviews`} />
      </div>
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
  const upload = async () => {
    const { marketRules } = await import('../../data/marketRules');
    await act(uploadMarketRules(APP_VERSION, marketRules()));
  };

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

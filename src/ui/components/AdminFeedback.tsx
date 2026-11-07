import { useCallback, useEffect, useState } from 'react';
import { adminFeedback, resolveBefore } from '../../platform/admin';
import { errorText, setFeedbackStatus, type FeedbackRow, type FeedbackStatus } from '../../platform/feedback';
import { AdminMessage, SnapshotView } from './AdminOperations';
import { Badge, Tabs } from './common';
import { game } from '../../game';

const textValue = (value: unknown, fallback = 'unknown') => typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;

export function AdminFeedback({ onChange, onInspect }: { onChange: () => void; onInspect: (id: string) => void }) {
  const [status, setStatus] = useState<FeedbackStatus | 'all'>('new');
  const [kind, setKind] = useState('all');
  const [version, setVersion] = useState('all');
  const [versions, setVersions] = useState<string[]>([]);
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [error, setError] = useState('');
  const [before, setBefore] = useState('0.4.0');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    setError(''); setRows(null);
    adminFeedback(status, kind, version).then(setRows, (e) => setError(errorText(e)));
  }, [status, kind, version]);
  useEffect(load, [load]);
  useEffect(() => { void adminFeedback('all', 'all', 'all').then((all) => setVersions([...new Set(all.map((r) => textValue(r.context?.version)))].sort().reverse()), () => undefined); }, []);
  const mark = async (id: number, next: FeedbackStatus) => {
    try { await setFeedbackStatus(id, next); load(); onChange(); } catch (e) { setError(errorText(e)); }
  };
  const bulk = async () => {
    setBusy(true); setError('');
    try { const count = await resolveBefore(before); game.pushToast(`${count} older reports resolved`, 'good'); load(); onChange(); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };
  return <>
    <Tabs compact tabs={['new','read','resolved','all'].map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) }))} value={status} onChange={(id) => setStatus(id as FeedbackStatus | 'all')} />
    <div className="card row wrap">
      <label>Type <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>{['all','bug','idea','other'].map((id) => <option key={id}>{id}</option>)}</select></label>
      <label>Version <select className="input" value={version} onChange={(e) => setVersion(e.target.value)}><option value="all">All versions</option>{versions.map((v) => <option key={v}>{v}</option>)}</select></label>
      <label>Resolve before <input className="input" value={before} onChange={(e) => setBefore(e.target.value)} aria-label="Version cutoff" /></label>
      <button className="btn sm" disabled={busy || !/^\d+\.\d+\.\d+$/.test(before)} onClick={() => void bulk()}>Resolve all before v{before}</button>
    </div>
    {error && <p className="warn">{error}</p>}
    {!rows && !error && <p className="dim">Loading reports…</p>}
    {rows?.length === 0 && <p className="dim">No matching reports.</p>}
    {rows?.map((row) => {
      const context = row.context ?? { version: 'unknown' };
      const snapshot = context.snapshot && typeof context.snapshot === 'object' ? context.snapshot : null;
      return <div key={row.id} className="card admin-feedback">
        <div className="row wrap"><Badge tone={row.kind === 'bug' ? 'danger' : 'neutral'}>{row.kind}</Badge><Badge>{row.status}</Badge><span className="dim small">{new Date(row.created_at).toLocaleString()}</span><span className="spacer" />
          {row.status !== 'read' && <button className="btn sm ghost" onClick={() => void mark(row.id, 'read')}>Mark read</button>}
          <button className="btn sm" onClick={() => void mark(row.id, row.status === 'resolved' ? 'new' : 'resolved')}>{row.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>
        </div>
        <p className="admin-message">{row.message}</p>
        <p className="small">{row.email || row.account_name || (row.user_id ? row.user_id : 'Anonymous guest')}{context.characterName ? ` · ${textValue(context.characterName, 'Character')}` : ''}</p>
        <p className="dim small">v{textValue(context.version)} · {textValue(context.classId, 'No character')} {context.level ? `lv ${textValue(context.level)}` : ''} · {textValue(context.zone, 'Town')} · {textValue(context.realm, 'standard')}</p>
        {row.user_id && <button className="btn sm" onClick={() => onInspect(row.verified_character_id || `user:${row.user_id}`)}>{row.verified_character_id ? 'Inspect current cloud save' : "Find this player's characters"}</button>}
        {snapshot ? <SnapshotView snapshot={snapshot} /> : <p className="dim small">No historical build snapshot was attached to this report.</p>}
        {row.user_id ? <AdminMessage user={row.user_id} realm={typeof context.realm === 'string' ? context.realm : 'standard'} feedback={row.id} onSent={() => { load(); onChange(); }} /> : <p className="dim small">Replies and compensation require a signed-in recipient.</p>}
      </div>;
    })}
    <p className="dim small">Up to 200 matching reports. The report snapshot is historical; the inspector shows the latest cloud save.</p>
  </>;
}

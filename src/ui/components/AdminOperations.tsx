import { useEffect, useState } from 'react';
import { BASES, UNIQUES } from '../../data/bases';
import { CURRENCIES } from '../../data/materials';
import { game } from '../../game';
import { createItem, createUnique } from '../../engine/items';
import { seeded } from '../../engine/rng';
import { newGame } from '../../engine/state';
import type { GameState } from '../../engine/types';
import { compensationHint, compensationItem, findPlayers, inspectPlayer, restoreBackup, sendAdminMessage, type FeedbackSnapshot, type Inspection, type PlayerRow } from '../../platform/admin';
import { errorText } from '../../platform/feedback';
import { marketRulesVersion, uploadMarketRules } from '../../platform/market';
import { APP_VERSION } from '../../platform/errors';
import { marketRules } from '../../data/marketRules';
import { fmt, fmtTime } from './common';

const when = (value: string) => new Date(value).toLocaleString();

function JsonView({ value, label }: { value: unknown; label: string }) {
  const [open, setOpen] = useState(false);
  return <details className="admin-snapshot" onToggle={(e) => setOpen(e.currentTarget.open)}><summary>{label}</summary>{open && <pre>{JSON.stringify(value, null, 2)}</pre>}</details>;
}

export function SnapshotView({ snapshot }: { snapshot: FeedbackSnapshot }) {
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  return <details className="admin-snapshot" onToggle={(e) => setOpen(e.currentTarget.open)}><summary>View report snapshot {snapshot.truncated ? '(partial)' : ''}</summary>{open && <>
    {snapshot.state && <>
      <p>{typeof snapshot.state.character?.name === 'string' ? snapshot.state.character.name : 'Character'} · posture {typeof snapshot.state.settings?.posture === 'string' ? snapshot.state.settings.posture : 'legacy'} · {Array.isArray(snapshot.state.passives) ? snapshot.state.passives.length : 0} passive nodes</p>
      <button className="btn sm" onClick={() => { try { game.startSandbox(snapshot.state, snapshot.state?.account); } catch (e) { setError(errorText(e)); } }}>Open in temporary admin sandbox</button>
      <JsonView label="Gear, priority, supports and rules" value={{ equipment: snapshot.state.equipment, skillBar: snapshot.state.skillBar, passives: snapshot.state.passives, masteries: snapshot.state.masteries, ascendancy: snapshot.state.ascendancy }} />
    </>}
    <ol>{Array.isArray(snapshot.log) && snapshot.log.filter((line) => typeof line === 'string').slice(0, 10).map((line, i) => <li key={i}>{line}</li>)}</ol>
    <JsonView label="Full snapshot JSON" value={snapshot} />
    {error && <p className="warn">{error}</p>}
  </>}</details>;
}

export function AdminMessage({ user, realm, feedback, onSent }: { user: string; realm: string; feedback?: number; onSent?: () => void }) {
  const [message, setMessage] = useState('');
  const [currency, setCurrency] = useState('');
  const [amount, setAmount] = useState(100);
  const [item, setItem] = useState('');
  const [ilvl, setIlvl] = useState(10);
  const [resolve, setResolve] = useState(!!feedback);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [op, setOp] = useState(() => crypto.randomUUID());
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<string | null | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (!open) return;
    marketRulesVersion().then(setRules, () => setRules(null));
  }, [open]);
  const upload = async () => {
    setUploading(true); setError('');
    try {
      await uploadMarketRules(APP_VERSION, marketRules());
      setRules(APP_VERSION);
      game.pushToast('Item rules uploaded from this build', 'good');
    } catch (e) { setError(errorText(e)); }
    finally { setUploading(false); }
  };
  const send = async () => {
    setBusy(true); setError('');
    try {
      const s = newGame();
      const made = item.startsWith('unique:') ? createUnique(s, item.slice(7), ilvl) : item ? createItem(s, item, ilvl, 'normal', seeded(Date.now())) : undefined;
      await sendAdminMessage({ op, user, realm, message, feedback, resolve, currency: currency || undefined, amount: currency ? amount : undefined, item: made && compensationItem(made) });
      setMessage(''); setCurrency(''); setItem(''); setOp(crypto.randomUUID());
      game.pushToast('Message and any compensation queued for the player', 'good'); onSent?.();
    } catch (e) {
      const text = errorText(e);
      const hint = compensationHint(text);
      setError(hint ? `${text}. ${hint}` : text);
    }
    finally { setBusy(false); }
  };
  return <details className="admin-message-form" onToggle={(e) => setOpen(e.currentTarget.open)}><summary>Reply / grant compensation</summary>{open && <>
    <p className="dim small">Recipient {user} · realm {realm}. All actions are recorded. Gifts are checked against the server's item rules.</p>
    <p className="small row wrap" style={{ gap: 8 }}>
      <span className={rules === APP_VERSION ? 'dim' : 'warn'}>
        {rules === undefined ? 'Checking the server item rules…' : rules ? `Server item rules: ${rules} · this build ${APP_VERSION}` : 'The server has no item rules yet, so item gifts will be refused.'}
      </span>
      {rules !== undefined && rules !== APP_VERSION && <button className="btn sm" disabled={uploading} onClick={() => void upload()}>{uploading ? 'Uploading…' : 'Upload item rules'}</button>}
    </p>
    <textarea className="input textarea" maxLength={2000} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message to the player / reason for compensation" />
    <div className="row wrap">
      <label>Currency <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="">No currency gift</option><option value="gold">Gold</option>{CURRENCIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {currency && <label>Amount <input className="input" type="number" min={1} max={1000000} step={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>}
      <label>Item <select className="input" value={item} onChange={(e) => setItem(e.target.value)}><option value="">No item gift</option><optgroup label="Normal bases">{BASES.filter((b) => !b.retired).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</optgroup><optgroup label="Unique items">{UNIQUES.map((u) => <option key={u.id} value={`unique:${u.id}`}>{u.name}</option>)}</optgroup></select></label>
      {item && <label>Item level <input className="input" type="number" min={1} max={200} value={ilvl} onChange={(e) => setIlvl(Number(e.target.value))} /></label>}
    </div>
    {feedback && <label><input type="checkbox" checked={resolve} onChange={(e) => setResolve(e.target.checked)} /> Resolve report with this reply</label>}
    <button className="btn" disabled={busy || !message.trim() || (!!currency && (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000)) || (!!item && (!Number.isSafeInteger(ilvl) || ilvl < 1 || ilvl > 200))} onClick={() => void send()}>{busy ? 'Sending…' : 'Send message / compensation'}</button>
    {error && <p className="warn">{error}</p>}
    <p className="dim small">The player gets the message under Settings → Feedback, with a Collect button for anything sent. Outside Solo Self-Found, a character in that realm also collects it by itself the next time it loads.</p>
  </>}</details>;
}

/** The save at a glance, read defensively: old or odd saves just show less. */
function SaveSummary({ detail }: { detail: Inspection }) {
  const save = (detail.character.save ?? {}) as Partial<GameState>;
  const sum = detail.character.summary ?? ({} as Inspection['character']['summary']);
  const bank = (detail.account?.bank ?? save.account?.bank ?? {}) as Record<string, number>;
  const life = (save.lifetime ?? {}) as Partial<GameState['lifetime']>;
  const bosses = Array.isArray(save.bossesDefeated) ? save.bossesDefeated : [];
  const acts = ['sanctum', 'burningthrone', 'highaltar', 'giantsthrone', 'maelstrom', 'shatteredthrone'].filter((b) => bosses.includes(b)).length;
  const gear = save.equipment ? Object.values(save.equipment).filter(Boolean).length : 0;
  const skills = Array.isArray(save.skillBar) ? save.skillBar.filter(Boolean).length : 0;
  const n = (v: unknown) => fmt(Number(v) || 0);
  const facts: [string, string][] = [
    ['Class · level', `${sum.classId ?? detail.character.save?.character?.classId ?? '?'} · ${sum.combatLevel ?? '?'}`],
    ['Skill levels total', String(sum.totalLevel ?? '?')],
    ['Campaign', `${acts}/6 act bosses${sum.mapsStarted ? ' · in Maps' : ''}`],
    ['Fighting in', save.combat && typeof save.combat === 'object' && 'zoneId' in save.combat ? String((save.combat as { zoneId: unknown }).zoneId) : 'Town'],
    ['Simulated time', fmtTime(Number(save.clock) || 0)],
    ['Kills · deaths', `${n(life.kills)} · ${n(life.deaths)}`],
    ['Gold', n(bank.gold)],
    ['Chaos · Divine · Exalt', `${n(bank.chaos)} · ${n(bank.divine)} · ${n(bank.exalted)}`],
    ['Worn · skills', `${gear} items · ${skills} skills`],
    ['Passives', String(Array.isArray(save.passives) ? save.passives.length : '?')],
  ];
  return (
    <div className="r2-admin-summary">
      {facts.map(([k, v]) => (
        <div key={k}>
          <span>{k}</span>
          {v}
        </div>
      ))}
    </div>
  );
}

export function PlayerInspector({ initialId }: { initialId?: string }) {
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [selected, setSelected] = useState(initialId?.startsWith('user:') ? '' : initialId ?? '');
  const [detail, setDetail] = useState<Inspection | null>(null);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoreOps] = useState(() => new Map<number, string>());
  useEffect(() => {
    if (initialId?.startsWith('user:')) { setSearch(initialId.slice(5)); setOffset(0); setSelected(''); }
    else if (initialId) setSelected(initialId);
  }, [initialId]);
  useEffect(() => {
    let current = true;
    const timeout = setTimeout(() => { setError(''); findPlayers(search, offset).then((data) => { if (current) setRows(data); }, (e) => { if (current) setError(errorText(e)); }); }, 250);
    return () => { current = false; clearTimeout(timeout); };
  }, [search, offset, refresh]);
  useEffect(() => {
    setDetail(null);
    if (!selected) return;
    let current = true;
    inspectPlayer(selected).then((data) => { if (current) setDetail(data); }, (e) => { if (current) setError(errorText(e)); });
    return () => { current = false; };
  }, [selected, refresh]);
  const recover = async (id: number) => {
    setBusy(true); setError('');
    try {
      if (!restoreOps.has(id)) restoreOps.set(id, crypto.randomUUID());
      const restored = await restoreBackup(id, restoreOps.get(id)!, reason);
      game.pushToast(`Recovered character created: ${restored}`, 'good');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };
  return <>
    <div className="card"><div className="card-title">Player / character lookup</div>
      <input className="input" aria-label="Search players" placeholder="Name, email, account ID or character ID" value={search} onChange={(e) => { setSearch(e.target.value); setOffset(0); }} />
      <button className="btn sm" onClick={() => setRefresh((n) => n + 1)}>Refresh lookup / save</button>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Player / character</th><th>Build</th><th>Realm</th><th>Progress</th><th>Zone</th><th>Simulated time</th><th>Last cloud save</th><th /></tr></thead><tbody>
        {rows.map((row) => <tr key={row.id}>
          <td><b>{row.name}</b>{row.deleted && <span className="warn small"> · deleted</span>}<br /><span className="dim small">{row.email || row.user_id}</span></td>
          <td>{row.class_id} · lv {typeof row.summary?.combatLevel === 'number' ? row.summary.combatLevel : '?'}{typeof row.summary?.totalLevel === 'number' && <><br /><span className="dim small">skills {row.summary.totalLevel}</span></>}</td>
          <td>{row.summary?.realm ?? 'standard'}</td>
          <td>{row.acts != null ? `${row.acts}/6 acts` : row.summary?.act1Cleared ? 'Act 1 done' : 'Act 1'}{row.summary?.mapsStarted ? ' · maps' : ''}{row.deaths != null && <><br /><span className="dim small">{fmt(Number(row.deaths))} deaths</span></>}</td>
          <td>{row.zone || 'Town'}</td><td>{fmtTime(Number(row.playtime_ms))}</td><td>{when(row.updated_at)}</td>
          <td><button className="btn sm" onClick={() => setSelected(row.id)}>Inspect</button></td></tr>)}
      </tbody></table></div>
      {!rows.length && <p className="dim">No matching characters.</p>}
      <div className="row"><button className="btn sm" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</button><span>{offset + 1}–{offset + rows.length}</span><button className="btn sm" disabled={rows.length < 50} onClick={() => setOffset(offset + 50)}>Next</button></div>
    </div>
    {error && <p className="warn">{error}</p>}
    {detail && <div className="card"><div className="card-title">{detail.character.name} · {detail.email || detail.character.user_id}</div>
      {detail.deleted && <p className="warn">Deleted character — showing its latest retained backup.</p>}
      <p className="dim small">{detail.character.id} · realm {detail.character.summary?.realm ?? 'standard'} · saved {when(detail.character.updated_at)}</p>
      <SaveSummary detail={detail} />
      <button className="btn" onClick={() => { try { game.startSandbox(detail.character.save, detail.account); } catch (e) { setError(errorText(e)); } }}>Open save in temporary sandbox</button>
      <JsonView label="View save JSON" value={detail} />
      <AdminMessage key={detail.character.user_id + (detail.character.summary.realm ?? 'standard')} user={detail.character.user_id} realm={detail.character.summary.realm ?? 'standard'} />
      <h3>Restore points</h3><p className="dim small">A restore creates a separate character; it does not overwrite an open game or roll back the shared stash. Backups begin after the database update is installed.</p>
      <input className="input" placeholder="Recovery reason (required for the audit log)" value={reason} maxLength={2000} onChange={(e) => setReason(e.target.value)} />
      {detail.backups.map((backup) => <div className="row wrap" key={backup.id}><span>{when(backup.created_at)} · lv {backup.summary?.combatLevel ?? '?'}</span><button className="btn sm" disabled={busy || !reason.trim()} onClick={() => void recover(backup.id)}>Restore as new character</button></div>)}
      {!detail.backups.length && <p className="dim small">No recorded backups for this character yet.</p>}
      <span className="dim small">{fmt(detail.backups.length)} restore points available</span>
    </div>}
  </>;
}

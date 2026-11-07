import { useEffect, useState } from 'react';
import { EVENT_TARGETS, eventFromRow, eventStatus, type EventRow, type EventTarget } from '../../data/events';
import { game, useGame } from '../../game';
import { errorText } from '../../platform/feedback';
import { Badge, fmtTime } from './common';

const dateValue = (iso: string | null) => iso ? new Date(Date.parse(iso) - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
const isoValue = (value: string) => value ? new Date(value).toISOString() : null;

function EventEditor({ row }: { row: EventRow }) {
  const definition = eventFromRow(row);
  const [start, setStart] = useState(dateValue(row.starts_at));
  const [end, setEnd] = useState(dateValue(row.ends_at));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const status = eventStatus(row, Date.now());
  const save = async (next: EventRow) => {
    setBusy(true); setError('');
    try { await game.saveEvent(next); } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };
  const countdown = status === 'Live' && row.ends_at ? `ends in ${fmtTime(Math.max(0, Date.parse(row.ends_at) - Date.now()))}`
    : status === 'Scheduled' && row.starts_at ? `starts in ${fmtTime(Math.max(0, Date.parse(row.starts_at) - Date.now()))}` : '';
  return <div className="admin-event">
    <div className="row wrap"><b>{definition?.name ?? row.name ?? row.id}</b><Badge tone={status === 'Live' ? 'success' : status === 'Scheduled' ? 'warn' : 'neutral'}>{status}</Badge><span className="dim small">{countdown}</span><span className="spacer" />
      <button className={`btn sm ${status === 'Live' ? 'danger' : 'primary'}`} disabled={busy} onClick={() => {
        const now = Date.now();
        void save({ ...row, enabled: status !== 'Live', starts_at: status === 'Live' ? row.starts_at ?? new Date(now - 1).toISOString() : new Date(now).toISOString(), ends_at: status === 'Live' ? new Date(now).toISOString() : null });
      }}>{status === 'Live' ? 'Stop event' : 'Start now'}</button>
    </div>
    <p className="dim small">{definition?.blurb}{definition?.banner ? ` · Banner: ${definition.banner}` : ''}</p>
    <div className="row wrap"><label>Starts <input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label><label>Ends <input className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      <button className="btn sm" disabled={busy || !start || (!!end && end <= start)} onClick={() => void save({ ...row, enabled: false, starts_at: isoValue(start), ends_at: isoValue(end) })}>Save schedule</button>
    </div>
    {error && <p className="warn">{error}</p>}
  </div>;
}

export function AdminEvents() {
  useGame();
  useEffect(() => void game.refreshEvents(), []);
  const [name, setName] = useState('');
  const [target, setTarget] = useState<EventTarget>('combatXp');
  const [multiplier, setMultiplier] = useState(2);
  const [banner, setBanner] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = game.eventRows;
  const create = async () => {
    setBusy(true); setError('');
    try {
      await game.saveEvent({ id: `custom-${crypto.randomUUID()}`, name: name.trim(), target, multiplier: target === 'broadcast' ? 1 : multiplier,
        banner: banner.trim(), blurb: target === 'craftingCost' ? `${Math.round((1 - multiplier) * 100)}% average material savings on item crafting` : null, enabled: false, starts_at: null, ends_at: null });
      setName(''); setBanner('');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };
  return <div className="card"><div className="card-title">Live events and broadcasts</div>
    <p className="dim small">Create an inactive event, then start it or set its dates. Times use your local timezone. Games refresh within five minutes; matching bonuses use the strongest value.</p>
    <div className="admin-event-builder">
      <label>Name <input className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Target <select className="input" value={target} onChange={(e) => { const next = e.target.value as EventTarget; setTarget(next); setMultiplier(next === 'craftingCost' ? 0.5 : 2); }}>{Object.entries(EVENT_TARGETS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {target !== 'broadcast' && <label>Multiplier <input className="input" type="number" min={target === 'craftingCost' ? 0.5 : 1.25} max={target === 'craftingCost' ? 1 : 3} step={0.05} value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} /></label>}
      <label>Global banner <input className="input" maxLength={500} value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="Optional announcement shown in game" /></label>
      <button className="btn" disabled={busy || !name.trim() || !Number.isFinite(multiplier) || multiplier < (target === 'craftingCost' ? 0.5 : 1.25) || multiplier > (target === 'craftingCost' ? 1 : 3)} onClick={() => void create()}>Create event</button>
    </div>
    {target === 'craftingCost' && <p className="dim small">Fractional costs conserve whole crafting materials probabilistically. Players still need the base cost to start; includes Orbs, Essences, Wax, Whetstones and bench crafts.</p>}
    {error && <p className="warn">{error}</p>}
    {rows.map((row) => <EventEditor key={`${row.id}:${row.starts_at}:${row.ends_at}:${row.enabled}`} row={row} />)}
  </div>;
}

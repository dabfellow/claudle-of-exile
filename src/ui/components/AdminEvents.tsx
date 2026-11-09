import { useEffect, useState } from 'react';
import { EVENT_TARGETS, eventBoost, eventDef, eventFromRow, eventStatus, HOLIDAYS, holidayWindowAt, isHoliday, nextHolidayWindow, weekendFrom, type EventBoost, type EventRow, type EventTarget } from '../../data/events';
import { game, useGame } from '../../game';
import { errorText } from '../../platform/feedback';
import { Badge } from './common';
import { fmtUntil } from './EventCalendar';

const dateValue = (iso: string | null) => iso ? new Date(Date.parse(iso) - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
const isoValue = (value: string) => value ? new Date(value).toISOString() : null;
const local = (at: number) => new Date(at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const blank = (id: string): EventRow => ({ id, enabled: false, starts_at: null, ends_at: null });

/** "XP ×3 · Loot ×2": the combined bonus of everything running now. */
function boostText(boost: EventBoost | null): string {
  if (!boost) return 'No bonuses running.';
  const parts: string[] = [];
  if (boost.xp > 1) parts.push(`All XP ×${+boost.xp.toFixed(2)}`);
  if (boost.loot > 1) parts.push(`Loot rolls ×${+boost.loot.toFixed(2)}`);
  for (const key of ['combatXp', 'gatheringXp', 'gatheringSpeed', 'currencyDrops', 'vendorSpeed'] as const) {
    const value = boost[key];
    if (value !== undefined && value > 1) parts.push(`${EVENT_TARGETS[key]} ×${+value.toFixed(2)}`);
  }
  if (boost.craftingCost !== undefined && boost.craftingCost < 1) parts.push(`Crafting cost ×${+boost.craftingCost.toFixed(2)}`);
  return parts.length ? parts.join(' · ') : 'Announcements only.';
}

function EventEditor({ row }: { row: EventRow }) {
  const definition = eventFromRow(row);
  const holiday = isHoliday(row.id);
  const [start, setStart] = useState(dateValue(row.starts_at));
  const [end, setEnd] = useState(dateValue(row.ends_at));
  const [weekends, setWeekends] = useState(!!row.weekends);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const now = Date.now();
  const status = eventStatus(row, now);
  const calendar = game.eventCalendar(now);
  const timed = [...calendar.live, ...calendar.upcoming].find((t) => t.event.id === row.id);
  const save = async (next: EventRow) => {
    setBusy(true); setError('');
    try { await game.saveEvent(next); } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };
  const countdown = status === 'Live' && timed?.end != null ? `ends in ${fmtUntil(timed.end - now)}`
    : status === 'Scheduled' && timed?.start != null ? `starts in ${fmtUntil(timed.start - now)} (${local(timed.start)})` : '';
  const stop = () => {
    // a holiday inside its own dates would start straight back up, so stopping it also switches it off
    const autoLive = holiday && !row.holiday_off && !!holidayWindowAt(row.id, now);
    void save({ ...row, enabled: false, starts_at: row.starts_at ?? new Date(now - 1).toISOString(), ends_at: new Date(now).toISOString(), ...(autoLive ? { holiday_off: true } : {}) });
  };
  const thisWeekend = () => {
    const w = weekendFrom(now);
    setStart(dateValue(new Date(Math.max(w.start, now)).toISOString()));
    setEnd(dateValue(new Date(w.end).toISOString()));
  };
  const next = holiday ? holidayWindowAt(row.id, now) ?? nextHolidayWindow(row.id, now) : null;
  return <div className="admin-event">
    <div className="row wrap"><b>{definition?.name ?? row.name ?? row.id}</b><Badge tone={status === 'Live' ? 'success' : status === 'Scheduled' ? 'warn' : 'neutral'}>{status}</Badge><span className="dim small">{countdown}</span><span className="spacer" />
      {holiday && <button className={`btn sm ${row.holiday_off ? '' : 'ghost'}`} disabled={busy} title="Whether this holiday starts by itself on its dates every year"
        onClick={() => void save({ ...row, holiday_off: !row.holiday_off })}>{row.holiday_off ? 'Automatic: off · turn on' : 'Automatic: on · turn off'}</button>}
      <button className={`btn sm ${status === 'Live' ? 'danger' : 'primary'}`} disabled={busy} onClick={() => status === 'Live' ? stop()
        : void save({ ...row, enabled: true, starts_at: new Date(now).toISOString(), ends_at: null, weekends: false })}>{status === 'Live' ? 'Stop event' : 'Start now'}</button>
    </div>
    <p className="dim small">{definition?.blurb}{definition?.banner ? ` · Banner: ${definition.banner}` : ''}
      {next && ` · Holiday dates: ${local(next.start)} to ${local(next.end)}${row.holiday_off ? ' (switched off)' : ''}`}
      {row.weekends && ' · Weekends only'}</p>
    <div className="row wrap"><label>Starts <input className="input" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label><label>Ends <input className="input" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      <label className="row" title="Runs Friday 18:00 to Monday 06:00 UTC, every weekend between the start and end"><input type="checkbox" checked={weekends} onChange={(e) => setWeekends(e.target.checked)} /> Weekends only</label>
      <button className="btn sm" disabled={busy} onClick={thisWeekend}>This weekend</button>
      <button className="btn sm" disabled={busy || !start || (!!end && end <= start)} onClick={() => void save({ ...row, enabled: false, starts_at: isoValue(start), ends_at: isoValue(end), weekends })}>Save schedule</button>
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
  const rowFor = (id: string) => rows.find((r) => r.id === id) ?? blank(id);
  const holidays = Object.keys(HOLIDAYS).map(rowFor);
  const others = [rowFor('double_xp'), ...rows.filter((r) => r.id !== 'double_xp' && !isHoliday(r.id) && (eventDef(r.id) || r.target))];
  const create = async () => {
    setBusy(true); setError('');
    try {
      await game.saveEvent({ id: `custom-${crypto.randomUUID()}`, name: name.trim(), target, multiplier: target === 'broadcast' ? 1 : multiplier,
        banner: banner.trim(), blurb: target === 'craftingCost' ? `${Math.round((1 - multiplier) * 100)}% average material savings on item crafting` : null, enabled: false, starts_at: null, ends_at: null });
      setName(''); setBanner('');
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };
  const editor = (row: EventRow) => <EventEditor key={`${row.id}:${row.starts_at}:${row.ends_at}:${row.enabled}:${row.weekends}:${row.holiday_off}`} row={row} />;
  return <>
    <div className="card"><div className="card-title">Running now</div>
      <p className="small"><b>{game.liveEvents.map((e) => e.name).join(', ') || 'Nothing'}</b></p>
      <p className="dim small">{boostText(eventBoost(game.liveEvents))}</p>
      <p className="dim small">Events running together add their bonuses: two +100% XP events give +200% (triple XP). Crafting savings add up to at most half off.</p>
    </div>
    <div className="card"><div className="card-title">Holidays</div>
      <p className="dim small">Holidays start and end by themselves on their dates each year (midnight UTC). Switch one off to skip it until you switch it back on. You can still start one by hand or give it extra dates.</p>
      {holidays.map(editor)}
    </div>
    <div className="card"><div className="card-title">Live events and broadcasts</div>
      <p className="dim small">Create an inactive event, then start it or set its dates. Times use your local timezone. Games refresh within five minutes. Tick "Weekends only" to run it every weekend between its start and end (leave the end empty for every weekend).</p>
      <div className="admin-event-builder">
        <label>Name <input className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Target <select className="input" value={target} onChange={(e) => { const next = e.target.value as EventTarget; setTarget(next); setMultiplier(next === 'craftingCost' ? 0.5 : 2); }}>{Object.entries(EVENT_TARGETS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        {target !== 'broadcast' && <label>Multiplier <input className="input" type="number" min={target === 'craftingCost' ? 0.5 : 1.25} max={target === 'craftingCost' ? 1 : 3} step={0.05} value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} /></label>}
        <label>Global banner <input className="input" maxLength={500} value={banner} onChange={(e) => setBanner(e.target.value)} placeholder="Optional announcement shown in game" /></label>
        <button className="btn" disabled={busy || !name.trim() || !Number.isFinite(multiplier) || multiplier < (target === 'craftingCost' ? 0.5 : 1.25) || multiplier > (target === 'craftingCost' ? 1 : 3)} onClick={() => void create()}>Create event</button>
      </div>
      {target === 'craftingCost' && <p className="dim small">Fractional costs conserve whole crafting materials probabilistically. Players still need the base cost to start; includes Orbs, Essences, Wax, Whetstones and bench crafts.</p>}
      {error && <p className="warn">{error}</p>}
      {others.map(editor)}
    </div>
  </>;
}

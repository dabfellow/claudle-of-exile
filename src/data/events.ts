/** A limited-time event. Admins run one from the Admin page; it is never saved on a character. */
export interface LiveEvent {
  id: string;
  name: string;
  blurb: string;
  /** multiplies all XP gained */
  xp: number;
  /** how many times each monster's drops are rolled */
  loot: number;
  combatXp?: number;
  gatheringXp?: number;
  gatheringSpeed?: number;
  currencyDrops?: number;
  vendorSpeed?: number;
  craftingCost?: number;
  banner?: string;
}

export const EVENT_TARGETS = {
  xp: 'All XP', combatXp: 'Combat and gem XP', gatheringXp: 'Life-skill XP', gatheringSpeed: 'Life-skill speed',
  currencyDrops: 'Currency orb drops', vendorSpeed: 'Vendor restock speed', craftingCost: 'Crafting material cost', loot: 'Monster loot rolls', broadcast: 'Announcement only',
} as const;
export type EventTarget = keyof typeof EVENT_TARGETS;

const DOUBLE_ALL = { blurb: 'Double XP and double loot drops', xp: 2, loot: 2 };

export const EVENTS: LiveEvent[] = [
  { id: 'double_xp', name: 'Double XP', blurb: 'Double XP', xp: 2, loot: 1 },
  { id: 'new_year', name: 'New Year', ...DOUBLE_ALL },
  { id: 'valentines', name: "Valentine's Day", ...DOUBLE_ALL },
  { id: 'easter', name: 'Easter', ...DOUBLE_ALL },
  { id: 'summer', name: 'Summer', ...DOUBLE_ALL },
  { id: 'halloween', name: 'Halloween', ...DOUBLE_ALL },
  { id: 'thanksgiving', name: 'Thanksgiving', ...DOUBLE_ALL },
  { id: 'christmas', name: 'Christmas', ...DOUBLE_ALL },
];

export function eventDef(id: string | null | undefined): LiveEvent | null {
  return EVENTS.find((e) => e.id === id) ?? null;
}

// ---------- the holiday calendar ----------

/** A stretch of time, in milliseconds: from `start` up to (not including) `end`. */
export interface EventWindow { start: number; end: number }

const DAY = 24 * 60 * 60 * 1000;
const day = (year: number, month: number, date: number) => Date.UTC(year, month - 1, date);

/** Easter Sunday (Western churches), by the anonymous Gregorian method. */
export function easterSunday(year: number): number {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), date = ((h + l - 7 * m + 114) % 31) + 1;
  return day(year, month, date);
}

/** US Thanksgiving: the fourth Thursday of November. */
export function thanksgivingDay(year: number): number {
  const first = new Date(day(year, 11, 1)).getUTCDay();
  return day(year, 11, 1 + ((4 - first + 7) % 7) + 21);
}

/**
 * When each holiday runs in a given year. Days start at midnight UTC, the same moment for every player.
 * New Year belongs to the year it starts in (31 Dec), so it runs into the next.
 */
export const HOLIDAYS: Record<string, (year: number) => EventWindow> = {
  new_year: (y) => ({ start: day(y, 12, 31), end: day(y + 1, 1, 3) }),
  valentines: (y) => ({ start: day(y, 2, 13), end: day(y, 2, 16) }),
  // Good Friday to Easter Monday
  easter: (y) => ({ start: easterSunday(y) - 2 * DAY, end: easterSunday(y) + 2 * DAY }),
  // the week of the June solstice
  summer: (y) => ({ start: day(y, 6, 20), end: day(y, 6, 27) }),
  halloween: (y) => ({ start: day(y, 10, 29), end: day(y, 11, 2) }),
  // Thursday to Sunday
  thanksgiving: (y) => ({ start: thanksgivingDay(y), end: thanksgivingDay(y) + 4 * DAY }),
  christmas: (y) => ({ start: day(y, 12, 23), end: day(y, 12, 27) }),
};

export const isHoliday = (id: string) => Object.prototype.hasOwnProperty.call(HOLIDAYS, id);

/** The holiday's window running at `now`, if any. */
export function holidayWindowAt(id: string, now: number): EventWindow | null {
  if (!isHoliday(id)) return null;
  const year = new Date(now).getUTCFullYear();
  for (const y of [year - 1, year]) {
    const w = HOLIDAYS[id](y);
    if (now >= w.start && now < w.end) return w;
  }
  return null;
}

/** The holiday's next window that starts after `now`. */
export function nextHolidayWindow(id: string, now: number): EventWindow | null {
  if (!isHoliday(id)) return null;
  const year = new Date(now).getUTCFullYear();
  for (const y of [year - 1, year, year + 1]) {
    const w = HOLIDAYS[id](y);
    if (w.start > now) return w;
  }
  return null;
}

/** Weekend events run from Friday 18:00 to Monday 06:00 UTC, so every timezone gets its whole weekend. */
const WEEKEND_START = 5 * DAY + 18 * 60 * 60 * 1000;
const WEEKEND_LENGTH = 2 * DAY + 12 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
/** 4 Jan 1970 was a Sunday; weeks are counted from there. */
const SUNDAY = 3 * DAY;

/** The weekend running at `now`, or the next one. */
export function weekendFrom(now: number): EventWindow {
  const weekStart = now - (((now - SUNDAY) % WEEK) + WEEK) % WEEK;
  for (const start of [weekStart - WEEK + WEEKEND_START, weekStart + WEEKEND_START, weekStart + WEEK + WEEKEND_START]) {
    if (now < start + WEEKEND_LENGTH) return { start, end: start + WEEKEND_LENGTH };
  }
  throw new Error('unreachable');
}

// ---------- the live_events table ----------

/** One row of the `live_events` table: switched on by hand, or between its two times. */
export interface EventRow {
  id: string;
  enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  name?: string | null;
  target?: EventTarget | null;
  multiplier?: number | null;
  banner?: string | null;
  blurb?: string | null;
  /** a holiday the admin has switched off: it won't start by itself (needs docs/ops/events.sql) */
  holiday_off?: boolean | null;
  /** runs only on weekends inside its start and end (needs docs/ops/events.sql) */
  weekends?: boolean | null;
}

const time = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

/** Whether the row's own switch and dates have it running, ignoring weekends and holidays. */
function switchedOn(row: EventRow, now: number): boolean {
  const start = time(row.starts_at), end = time(row.ends_at);
  if (Number.isFinite(end) && now >= end) return false;
  if (Number.isFinite(start)) return now >= start;
  return row.enabled;
}

/** When the row, as set by hand, is running at `now`, and until when (null: until switched off). */
function manualWindowAt(row: EventRow, now: number): { end: number | null } | null {
  if (!switchedOn(row, now)) return null;
  const end = time(row.ends_at);
  if (!row.weekends) return { end: Number.isFinite(end) ? end : null };
  const weekend = weekendFrom(now);
  if (now < weekend.start) return null;
  return { end: Number.isFinite(end) ? Math.min(end, weekend.end) : weekend.end };
}

/** The next time the row, as set by hand, starts after `now`. */
function nextManualWindow(row: EventRow, now: number): { start: number; end: number | null } | null {
  const start = time(row.starts_at), end = time(row.ends_at);
  if (Number.isFinite(end) && end <= now) return null;
  if (!row.weekends) {
    return Number.isFinite(start) && start > now ? { start, end: Number.isFinite(end) ? end : null } : null;
  }
  if (!Number.isFinite(start) && !row.enabled) return null;
  const from = Number.isFinite(start) && start > now ? start : now;
  let weekend = weekendFrom(from);
  let begins = Math.max(weekend.start, from);
  // a weekend already running at `now` isn't next; one running when a future start begins is
  if (begins <= now) { weekend = weekendFrom(weekend.end); begins = weekend.start; }
  if (Number.isFinite(end) && begins >= end) return null;
  return { start: begins, end: Number.isFinite(end) ? Math.min(end, weekend.end) : weekend.end };
}

export interface TimedEvent { event: LiveEvent; start: number | null; end: number | null }

/** One row's own running window at `now`, holiday included. */
function rowLiveAt(id: string, row: EventRow | undefined, now: number): { start: number | null; end: number | null } | null {
  const manual = row ? manualWindowAt(row, now) : null;
  const holiday = row?.holiday_off ? null : holidayWindowAt(id, now);
  if (!manual && !holiday) return null;
  if (!manual) return holiday;
  if (!holiday) return { start: null, end: manual.end };
  return { start: holiday.start, end: manual.end === null ? null : Math.max(manual.end, holiday.end) };
}

/** Every event id the calendar knows: the table's rows and all the holidays. */
function calendarIds(rows: EventRow[]): string[] {
  return [...new Set([...rows.map((r) => r.id), ...Object.keys(HOLIDAYS)])];
}

/** What is running now (with when it ends) and what is coming up next (soonest first). */
export function eventCalendar(rows: EventRow[], now: number): { live: TimedEvent[]; upcoming: TimedEvent[] } {
  const live: TimedEvent[] = [], upcoming: TimedEvent[] = [];
  for (const id of calendarIds(rows)) {
    const row = rows.find((r) => r.id === id);
    const event = row ? eventFromRow(row) : eventDef(id);
    if (!event) continue;
    const running = rowLiveAt(id, row, now);
    if (running) { live.push({ event, ...running }); continue; }
    const holiday = row?.holiday_off ? null : nextHolidayWindow(id, now);
    const manual = row ? nextManualWindow(row, now) : null;
    const next = [holiday, manual].filter((w): w is { start: number; end: number | null } => !!w).sort((a, b) => a.start - b.start)[0];
    if (next) upcoming.push({ event, start: next.start, end: next.end });
  }
  upcoming.sort((a, b) => a.start! - b.start!);
  return { live, upcoming };
}

export function activeEvents(rows: EventRow[], now: number): LiveEvent[] {
  return eventCalendar(rows, now).live.map((t) => t.event);
}

/** Every moment between `from` and `to` when an event might start or stop, so offline time can be cut there. */
export function eventChangeTimes(rows: EventRow[], from: number, to: number): number[] {
  const times = rows.flatMap((row) => [time(row.starts_at), time(row.ends_at)]);
  for (const id of Object.keys(HOLIDAYS)) {
    for (let y = new Date(from).getUTCFullYear() - 1; y <= new Date(to).getUTCFullYear(); y++) times.push(HOLIDAYS[id](y).start, HOLIDAYS[id](y).end);
  }
  if (rows.some((r) => r.weekends)) {
    for (let w = weekendFrom(from); w.start < to; w = weekendFrom(w.end)) times.push(w.start, w.end);
  }
  return [...new Set(times.filter((t) => Number.isFinite(t) && t > from && t <= to))].sort((a, b) => a - b);
}

export function eventFromRow(row: EventRow): LiveEvent | null {
  if (!row.target) {
    const preset = eventDef(row.id);
    return preset ? { ...preset, banner: row.banner ?? undefined } : null;
  }
  const mult = Number(row.multiplier);
  if (!Object.prototype.hasOwnProperty.call(EVENT_TARGETS, row.target) || !row.name?.trim() || !Number.isFinite(mult) || mult < 0.5 || mult > 3) return null;
  if (row.target !== 'craftingCost' && row.target !== 'broadcast' && mult < 1) return null;
  if (row.target === 'craftingCost' && mult > 1) return null;
  return { id: row.id, name: row.name, blurb: row.blurb || (row.target === 'broadcast' ? 'Announcement' : `${EVENT_TARGETS[row.target]} ×${mult}`),
    xp: 1, loot: 1, ...(row.target === 'broadcast' ? {} : { [row.target]: mult }), banner: row.banner ?? undefined };
}

export function eventStatus(row: EventRow, now: number): 'Live' | 'Scheduled' | 'Inactive' {
  const { live, upcoming } = eventCalendar([row], now);
  if (live.some((t) => t.event.id === row.id)) return 'Live';
  return upcoming.some((t) => t.event.id === row.id) ? 'Scheduled' : 'Inactive';
}

export type EventBoost = Omit<LiveEvent, 'id' | 'name' | 'blurb' | 'banner'>;

/** The cheapest crafting can get, however many cost events overlap. */
export const MIN_CRAFTING_COST = 0.5;

/**
 * Events running together add their bonuses: two +100% XP events give +200% (×3), not ×4.
 * A narrower bonus already includes the broad one (combat XP counts All XP, currency drops count loot rolls),
 * because the game uses whichever of the two is bigger.
 */
export function eventBoost(events: LiveEvent[]): EventBoost | null {
  if (!events.length) return null;
  const extra = (key: keyof EventBoost) => events.reduce((sum, e) => sum + Math.max(0, (e[key] ?? 1) - 1), 0);
  const has = (key: keyof EventBoost) => events.some((e) => e[key] !== undefined);
  const boost: EventBoost = { xp: 1 + extra('xp'), loot: 1 + extra('loot') };
  if (has('combatXp')) boost.combatXp = boost.xp + extra('combatXp');
  if (has('gatheringXp')) boost.gatheringXp = boost.xp + extra('gatheringXp');
  if (has('currencyDrops')) boost.currencyDrops = boost.loot + extra('currencyDrops');
  if (has('gatheringSpeed')) boost.gatheringSpeed = 1 + extra('gatheringSpeed');
  if (has('vendorSpeed')) boost.vendorSpeed = 1 + extra('vendorSpeed');
  if (has('craftingCost')) {
    const saved = events.reduce((sum, e) => sum + Math.max(0, 1 - (e.craftingCost ?? 1)), 0);
    boost.craftingCost = Math.max(MIN_CRAFTING_COST, 1 - saved);
  }
  return boost;
}

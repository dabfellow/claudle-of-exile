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
}

function scheduled(row: EventRow, now: number): boolean {
  if (!row.starts_at) return false;
  return now >= Date.parse(row.starts_at) && (!row.ends_at || now < Date.parse(row.ends_at));
}

export function activeEvents(rows: EventRow[], now: number): LiveEvent[] {
  return rows.filter((r) => ((r.enabled && (!r.starts_at || now >= Date.parse(r.starts_at))) || scheduled(r, now)) && (!r.ends_at || now < Date.parse(r.ends_at)))
    .map(eventFromRow).filter((e): e is LiveEvent => !!e);
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
  if (activeEvents([row], now).length) return 'Live';
  return row.starts_at && Date.parse(row.starts_at) > now && (!row.ends_at || Date.parse(row.ends_at) > Date.parse(row.starts_at)) ? 'Scheduled' : 'Inactive';
}

export type EventBoost = Omit<LiveEvent, 'id' | 'name' | 'blurb' | 'banner'>;

/** Events running together use the best of each bonus; they don't stack. */
export function eventBoost(events: LiveEvent[]): EventBoost | null {
  if (!events.length) return null;
  const boost: EventBoost = { xp: Math.max(1, ...events.map((e) => e.xp)), loot: Math.max(1, ...events.map((e) => e.loot)) };
  for (const key of ['combatXp','gatheringXp','gatheringSpeed','currencyDrops','vendorSpeed'] as const) {
    if (events.some((e) => e[key] !== undefined)) boost[key] = Math.max(1, ...events.map((e) => e[key] ?? 1));
  }
  if (events.some((e) => e.craftingCost !== undefined)) boost.craftingCost = Math.min(1, ...events.map((e) => e.craftingCost ?? 1));
  return boost;
}

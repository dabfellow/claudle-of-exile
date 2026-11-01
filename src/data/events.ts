/** A limited-time event. Admins run one from the Admin page; it is never saved on a character. */
export interface LiveEvent {
  id: string;
  name: string;
  blurb: string;
  /** multiplies all XP gained */
  xp: number;
  /** how many times each monster's drops are rolled */
  loot: number;
}

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
}

function scheduled(row: EventRow, now: number): boolean {
  if (!row.starts_at) return false;
  return now >= Date.parse(row.starts_at) && (!row.ends_at || now < Date.parse(row.ends_at));
}

export function activeEvents(rows: EventRow[], now: number): LiveEvent[] {
  return EVENTS.filter((e) => rows.some((r) => r.id === e.id && (r.enabled || scheduled(r, now))));
}

export type EventBoost = Pick<LiveEvent, 'xp' | 'loot'>;

/** Events running together use the best of each bonus; they don't stack. */
export function eventBoost(events: LiveEvent[]): EventBoost | null {
  if (!events.length) return null;
  return { xp: Math.max(...events.map((e) => e.xp)), loot: Math.max(...events.map((e) => e.loot)) };
}

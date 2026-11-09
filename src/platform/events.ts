import type { EventRow } from '../data/events';
import { getSupabase } from './supabase';

/** Every event's switch and schedule, or null if they couldn't be read. */
export async function fetchEventRows(): Promise<EventRow[] | null> {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.from('live_events').select('*');
  return error ? null : (data as EventRow[]);
}

/** Columns added by docs/ops/events.sql; an older table doesn't have them. */
const NEW_COLUMNS = ['holiday_off', 'weekends'] as const;

export const EVENTS_SQL_NEEDED = 'Holiday switches and weekend events need the events table update first: run docs/ops/events.sql in Supabase.';

const missingColumn = (error: { message?: string; code?: string }) =>
  error.code === 'PGRST204' || /holiday_off|weekends/.test(error.message ?? '');

/** Row-level security lets only admins change it. Works with the older table as long as the new switches aren't used. */
export async function saveEventRow(row: EventRow): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error('Online accounts are not configured');
  let { data, error } = await client.from('live_events').upsert(row).select('id');
  if (error && missingColumn(error)) {
    if (NEW_COLUMNS.some((key) => row[key])) throw new Error(EVENTS_SQL_NEEDED);
    const old: EventRow = { ...row };
    for (const key of NEW_COLUMNS) delete old[key];
    ({ data, error } = await client.from('live_events').upsert(old).select('id'));
  }
  if (error) throw error;
  if (!data?.length) throw new Error('Nothing was changed');
}

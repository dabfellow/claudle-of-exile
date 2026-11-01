import type { EventRow } from '../data/events';
import { getSupabase } from './supabase';

/** Every event's switch and schedule, or null if they couldn't be read. */
export async function fetchEventRows(): Promise<EventRow[] | null> {
  const client = getSupabase();
  if (!client) return [];
  const { data, error } = await client.from('live_events').select('id, enabled, starts_at, ends_at');
  return error ? null : (data as EventRow[]);
}

/** Row-level security lets only admins change it. */
export async function saveEventRow(row: EventRow): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error('Online accounts are not configured');
  const { data, error } = await client.from('live_events').upsert(row).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Nothing was changed');
}

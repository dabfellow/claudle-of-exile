import { getSupabase } from './supabase';

/** Which event is running. No connection or no table means none. */
export async function fetchLiveEvent(): Promise<string | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data, error } = await client.from('live_event').select('event_id').eq('id', 1).maybeSingle();
  return error ? null : ((data?.event_id as string | null | undefined) ?? null);
}

/** Row-level security lets only admins change it. */
export async function setLiveEvent(id: string | null): Promise<void> {
  const client = getSupabase();
  if (!client) throw new Error('Online accounts are not configured');
  const { data, error } = await client.from('live_event').update({ event_id: id }).eq('id', 1).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Nothing was changed');
}

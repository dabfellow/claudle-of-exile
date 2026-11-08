import type { SupabaseClient } from '@supabase/supabase-js';
import type { CharacterRow, CharacterSummary, CharacterTable } from './saves';

/**
 * The `characters` table (see docs/ops/SETUP.md). Row-level security limits every query to the signed-in player.
 * `updated_at` is stamped by the server on every write (docs/ops/admin.sql), so it serves as the row's version.
 */
export function supabaseCharacters(client: SupabaseClient): CharacterTable {
  const table = () => client.from('characters');
  return {
    async list() {
      const { data, error } = await table().select('id, summary');
      if (error) throw error;
      return (data ?? []) as { id: string; summary: CharacterSummary }[];
    },
    async get(id) {
      const { data, error } = await table().select('save, summary, updated_at').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as { save: unknown; summary: CharacterSummary; updated_at: string } | null;
    },
    async head(id) {
      const { data, error } = await table().select('summary, updated_at').eq('id', id).maybeSingle();
      if (error) throw error;
      const row = data as { summary: CharacterSummary; updated_at: string } | null;
      return row ? { stamp: row.updated_at, summary: row.summary } : null;
    },
    async upsert(row: CharacterRow) {
      const { data, error } = await table().upsert(row).select('updated_at').single();
      if (error) throw error;
      return (data as { updated_at: string }).updated_at;
    },
    async replace(row: CharacterRow, stamp: string) {
      const { id, ...fields } = row;
      // only matches while nobody else has written since `stamp`: a refused write updates no rows
      const { data, error } = await table().update(fields).eq('id', id).eq('updated_at', stamp).select('updated_at');
      if (error) throw error;
      return (data as { updated_at: string }[] | null)?.[0]?.updated_at ?? null;
    },
    async remove(id) {
      const { error } = await table().delete().eq('id', id);
      if (error) throw error;
    },
  };
}

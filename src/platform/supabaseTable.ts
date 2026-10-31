import type { SupabaseClient } from '@supabase/supabase-js';
import type { CharacterRow, CharacterSummary, CharacterTable } from './saves';

/** The `characters` table (see docs/ops/SETUP.md). Row-level security limits every query to the signed-in player. */
export function supabaseCharacters(client: SupabaseClient): CharacterTable {
  const table = () => client.from('characters');
  return {
    async list() {
      const { data, error } = await table().select('id, summary');
      if (error) throw error;
      return (data ?? []) as { id: string; summary: CharacterSummary }[];
    },
    async get(id) {
      const { data, error } = await table().select('save').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as { save: unknown } | null;
    },
    async upsert(row: CharacterRow) {
      const { error } = await table().upsert(row);
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await table().delete().eq('id', id);
      if (error) throw error;
    },
  };
}

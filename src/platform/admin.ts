import { getSupabase } from './supabase';
import type { FeedbackRow } from './feedback';
import type { CharacterSummary } from './saves';
import type { GameState, Item } from '../engine/types';
import { freshAccount } from '../engine/account';
import { deserialize, serialize } from '../engine/save';

export async function adminCall<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const db = getSupabase();
  if (!db) throw new Error('Online accounts are not configured');
  const { data, error } = await db.rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export interface PlayerRow {
  id: string; user_id: string; name: string; class_id: string; email: string | null;
  summary: CharacterSummary; updated_at: string; zone: string | null; playtime_ms: number;
  deleted?: boolean;
}
export interface Inspection {
  character: { id: string; user_id: string; name: string; save: GameState; summary: CharacterSummary; updated_at: string };
  email: string | null; account: GameState['account'] | null;
  deleted?: boolean;
  backups: { id: number; created_at: string; summary: CharacterSummary }[];
}
export const findPlayers = (search: string, offset = 0) => adminCall<PlayerRow[]>('admin_players', { p_search: search, p_offset: offset });
export const inspectPlayer = (id: string) => adminCall<Inspection>('admin_inspect', { p_id: id });
export const restoreBackup = (id: number, op: string, reason: string) => adminCall<string>('admin_restore', { p_backup: id, p_op: op, p_reason: reason });
export const resolveBefore = (version: string) => adminCall<number>('admin_resolve_before', { p_version: version });
export const adminFeedback = (status: string, kind: string, version: string) => adminCall<FeedbackRow[]>('admin_feedback', { p_status: status, p_kind: kind, p_version: version });
export const sendAdminMessage = (args: { op: string; user: string; realm: string; message: string; feedback?: number; resolve?: boolean; currency?: string; amount?: number; item?: Item }) =>
  adminCall<void>('admin_message', { p_op: args.op, p_user: args.user, p_realm: args.realm, p_message: args.message,
    p_feedback: args.feedback ?? null, p_resolve: args.resolve ?? false, p_currency: args.currency ?? null, p_amount: args.amount ?? null, p_item: args.item ?? null });

export interface AdminMail { id: string; realm: string; message: string; compensation: boolean; created_at: string; read_at: string | null }
export async function readAdminMail(): Promise<AdminMail[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data, error } = await db.from('admin_mail').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as AdminMail[];
}
export async function markAdminMail(id: string): Promise<void> {
  const db = getSupabase();
  if (!db) return;
  const { error } = await db.from('admin_mail').update({ read_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export interface FeedbackSnapshot { state?: GameState; log: string[]; truncated?: boolean }
/** A detached game-only snapshot: no auth client, cookies, browser storage, stash or email. */
export function feedbackSnapshot(s: GameState, log: string[] = []): FeedbackSnapshot {
  const state = JSON.parse(serialize(s)) as GameState;
  state.account = { ...freshAccount(), hideout: structuredClone(s.account.hideout), automation: structuredClone(s.account.automation), bank: structuredClone(s.account.bank),
    campaignDone: s.account.campaignDone, exileUnlocked: s.account.exileUnlocked };
  state.inventory = []; state.ground = []; state.offlineHaul = [];
  const snapshot: FeedbackSnapshot = { state, log: log.slice(0, 10).map((line) => line.slice(0, 500)) };
  if (new TextEncoder().encode(JSON.stringify(snapshot)).length > 196608) {
    state.combat = null; state.vendor.stock = []; state.loadouts = structuredClone(s.loadouts);
    snapshot.truncated = true;
    if (new TextEncoder().encode(JSON.stringify(snapshot)).length > 196608) delete snapshot.state;
  }
  return snapshot;
}

/** Sandbox copies get a fresh identity and account, and must use a memory-only store. */
export function sandboxState(save: unknown, account?: GameState['account'] | null): GameState {
  const state = deserialize(JSON.stringify(save));
  if (account) state.account = structuredClone(account);
  state.character.id = `sandbox-${crypto.randomUUID()}`;
  state.character.name = `${state.character.name} [sandbox]`;
  if (state.fallen) { delete state.fallen; state.action = null; state.combat = null; state.life = Math.max(1, state.life); }
  state.lastSaved = Date.now();
  return state;
}

export function classBreakdown(input: Record<string, number>): [string, number][] {
  const counts = new Map<string, number>();
  for (const [key, value] of Object.entries(input)) {
    const id = key.trim().toLowerCase();
    if (id !== 'account') counts.set(id, (counts.get(id) ?? 0) + value);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}
export function levelBreakdown(input: Record<string, number>): [string, number][] {
  const max = Math.min(100, Math.max(0, ...Object.keys(input).map(Number).filter(Number.isFinite)));
  return Array.from({ length: Math.floor(max / 5) + 1 }, (_, i) => [i === 20 ? '100' : `${Math.max(1, i * 5)}–${i * 5 + 4}`, input[String(i * 5)] ?? 0]);
}

/** Anonymous, best-effort counters, deduplicated per tab/session on the server; no email/IP payload. */
export async function recordDemo(event: 'demo_started' | 'demo_act1_boss_killed' | 'demo_converted_to_account'): Promise<void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.doNotTrack === '1') return;
    let session = sessionStorage.getItem('poi-demo-counter');
    if (!session) { session = crypto.randomUUID(); sessionStorage.setItem('poi-demo-counter', session); }
    await getSupabase()?.rpc('record_demo', { p_session: session, p_event: event });
  } catch { /* telemetry never interrupts play or account creation */ }
}

import { characterLevel } from '../engine/character';
import type { GameState } from '../engine/types';
import { APP_VERSION } from './errors';
import { getSupabase } from './supabase';

/**
 * Player feedback, star reviews and the admin page's data (tables in docs/ops/SETUP.md).
 * Row-level security does the gatekeeping: players can only write, admins can read.
 */

export type FeedbackKind = 'bug' | 'idea' | 'other';
export type FeedbackStatus = 'new' | 'read' | 'resolved';

export const FEEDBACK_MAX = 2000;
export const REVIEW_MAX = 1000;

export interface FeedbackRow {
  id: number;
  user_id: string | null;
  kind: FeedbackKind;
  message: string;
  context: FeedbackContext;
  status: FeedbackStatus;
  created_at: string;
}

export interface ReviewRow {
  user_id: string;
  stars: number;
  comment: string;
  display_name: string | null;
  updated_at: string;
}

/** What a feedback note carries besides the text: enough to reproduce a bug, nothing personal. */
export interface FeedbackContext {
  version: string;
  classId?: string;
  level?: number;
  zone?: string | null;
  page?: string;
  userAgent?: string;
}

export function feedbackContext(s: GameState | null, page?: string): FeedbackContext {
  return {
    version: APP_VERSION,
    classId: s?.character.classId,
    level: s ? characterLevel(s) : undefined,
    zone: s?.combat?.zoneId ?? null,
    page,
    userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent.slice(0, 200),
  };
}

/** Supabase errors are plain objects with a message, not Error instances. */
export function errorText(err: unknown, fallback = 'Something went wrong'): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message) return err.message;
  return typeof err === 'string' && err ? err : fallback;
}

function db() {
  const client = getSupabase();
  if (!client) throw new Error('Online features are not configured');
  return client;
}

export async function sendFeedback(kind: FeedbackKind, message: string, context: FeedbackContext): Promise<void> {
  const text = message.trim().slice(0, FEEDBACK_MAX);
  if (!text) throw new Error('Write something first');
  const { error } = await db().from('feedback').insert({ kind, message: text, context });
  if (error) throw error;
}

/** The signed-in player's own review, if they've left one. */
export async function myReview(userId: string): Promise<ReviewRow | null> {
  const { data, error } = await db().from('reviews').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as ReviewRow | null;
}

/** One review per account; sending again replaces it. */
export async function saveReview(userId: string, stars: number, comment: string, displayName: string): Promise<void> {
  const row = {
    user_id: userId,
    stars: Math.max(1, Math.min(5, Math.round(stars))),
    comment: comment.trim().slice(0, REVIEW_MAX),
    display_name: displayName.slice(0, 40),
    updated_at: new Date().toISOString(),
  };
  const { error } = await db().from('reviews').upsert(row);
  if (error) throw error;
}

// ---------- admin ----------

export async function checkAdmin(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  const { data, error } = await client.rpc('is_admin');
  return !error && data === true;
}

export interface AdminStats {
  accounts: number;
  new_accounts_week: number;
  players: number;
  characters: number;
  active_day: number;
  active_week: number;
  act1_clears: number;
  by_class: Record<string, number>;
  by_level: Record<string, number>;
  feedback_open: number;
  reviews: { count: number; avg: number | null };
}

export async function adminStats(): Promise<AdminStats> {
  const { data, error } = await db().rpc('admin_stats');
  if (error) throw error;
  if (!data) throw new Error('Not an admin');
  return data as AdminStats;
}

export async function listFeedback(status: FeedbackStatus | 'all'): Promise<FeedbackRow[]> {
  let q = db().from('feedback').select('*').order('created_at', { ascending: false }).limit(200);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as FeedbackRow[];
}

export async function setFeedbackStatus(id: number, status: FeedbackStatus): Promise<void> {
  const { error } = await db().from('feedback').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function listReviews(): Promise<ReviewRow[]> {
  const { data, error } = await db().from('reviews').select('*').order('updated_at', { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as ReviewRow[];
}

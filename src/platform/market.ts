import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketDelivery } from '../engine/market';
import type { Item } from '../engine/types';
import { getSupabase } from './supabase';

/** The Player Market's server calls (docs/ops/market.sql). Every step is one all-or-nothing function there. */

export type MarketMode = 'buy' | 'auction';
export type MarketScope = 'all' | 'mine' | 'bids';

export interface MarketFilters {
  scope?: MarketScope;
  text?: string;
  slot?: string;
  rarity?: string;
  currency?: string;
  mode?: MarketMode;
  offset?: number;
}

export interface MarketListing {
  id: number;
  item: Item;
  item_name: string;
  mode: MarketMode;
  currency: string;
  price: number;
  high_bid: number | null;
  ends_at: string;
  mine: boolean | null;
  winning: boolean | null;
}

export interface MarketApi {
  browse(f: MarketFilters): Promise<MarketListing[]>;
  list(op: string, item: Item, mode: MarketMode, currency: string, price: number): Promise<void>;
  buy(op: string, id: number, currency: string, amount: number): Promise<void>;
  bid(op: string, id: number, currency: string, amount: number): Promise<void>;
  cancel(id: number): Promise<void>;
  collect(): Promise<MarketDelivery[]>;
  opDone(op: string): Promise<boolean>;
}

export interface MarketAdminRow extends Omit<MarketListing, 'mine' | 'winning'> {
  seller: string;
  status: string;
  created_at: string;
  seller_banned: boolean;
}

/** The server said no and nothing happened, as opposed to no reply at all: only a reply carries a code. */
export function isRefusal(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && !!err.code;
}

function supabaseMarket(client: SupabaseClient): MarketApi {
  const call = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw error;
    return data as T;
  };
  return {
    browse: (f) =>
      call('market_browse', {
        p_scope: f.scope ?? 'all',
        p_text: f.text || null,
        p_slot: f.slot || null,
        p_rarity: f.rarity || null,
        p_currency: f.currency || null,
        p_mode: f.mode || null,
        p_offset: f.offset ?? 0,
      }),
    list: (op, item, mode, currency, price) => call('market_list', { p_op: op, p_item: item, p_mode: mode, p_currency: currency, p_price: price }),
    buy: (op, id, currency, amount) => call('market_buy', { p_op: op, p_id: id, p_currency: currency, p_amount: amount }),
    bid: (op, id, currency, amount) => call('market_bid', { p_op: op, p_id: id, p_currency: currency, p_amount: amount }),
    cancel: (id) => call('market_cancel', { p_id: id }),
    collect: () => call('market_collect'),
    opDone: (op) => call('market_op_done', { p_op: op }),
  };
}

let standIn: MarketApi | null = null;

/** Dev builds only: a pretend market for playtesting without the real server. */
export function setMarketStandIn(api: MarketApi | null): void {
  standIn = api;
}

export const marketStandIn = () => standIn;

export function marketApi(): MarketApi | null {
  if (standIn) return standIn;
  const client = getSupabase();
  return client ? supabaseMarket(client) : null;
}

// ---------- admin ----------

function db() {
  const client = getSupabase();
  if (!client) throw new Error('Online features are not configured');
  return client;
}

async function adminCall<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

export const marketRulesVersion = () => adminCall<string | null>('market_rules_version');
export const uploadMarketRules = (version: string, rules: unknown) => adminCall<void>('market_set_rules', { p_version: version, p_rules: rules });
export const marketAdminList = (status: string) => adminCall<MarketAdminRow[]>('market_admin_list', { p_status: status });
export const marketAdminRemove = (id: number) => adminCall<void>('market_admin_remove', { p_id: id });
export const marketAdminBan = (user: string, banned: boolean) => adminCall<void>('market_admin_ban', { p_user: user, p_banned: banned });

import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { marketRules } from '../src/data/marketRules';
import { BASES, UNIQUES } from '../src/data/bases';
import { createItem, createUnique } from '../src/engine/items';
import { newGame } from '../src/engine/state';
import { seeded } from '../src/engine/rng';
import type { Item } from '../src/engine/types';

/** The real docs/ops/market.sql on a throwaway database, with just enough of Supabase around it. */
const ALICE = '00000000-0000-0000-0000-00000000000a';
const BOB = '00000000-0000-0000-0000-00000000000b';
const CARA = '00000000-0000-0000-0000-00000000000c';
const NEWBIE = '00000000-0000-0000-0000-00000000000d';
const ADMIN = '00000000-0000-0000-0000-00000000000e';

const SUPABASE = `
  create role anon; create role authenticated;
  create schema auth;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
  -- as on Supabase: new functions and tables are open to both roles until something says otherwise
  alter default privileges in schema public grant all on functions to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  create table public.characters (id text primary key, user_id uuid not null, summary jsonb not null);
  alter table public.characters enable row level security;
  create table public.admins (user_id uuid primary key);
  create function public.is_admin() returns boolean language sql stable security definer set search_path = public
    as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
`;

let db: PGlite;

/** Run as a player: `null` is a guest. */
async function as<T = unknown>(who: string | null, sql: string, params: unknown[] = []): Promise<T> {
  await db.exec(`set role ${who ? 'authenticated' : 'anon'}; select set_config('test.uid', '${who ?? ''}', false);`);
  try {
    const res = await db.query<Record<string, T>>(sql, params);
    return Object.values(res.rows[0] ?? {})[0];
  } finally {
    await db.exec('reset role');
  }
}

let opCount = 0;
const op = () => `00000000-0000-4000-8000-${String(++opCount).padStart(12, '0')}`;

const list = (who: string | null, item: unknown, mode = 'buy', currency = 'gold', price = 1000) =>
  as<number>(who, 'select market_list($1, $2, $3, $4, $5)', [op(), JSON.stringify(item), mode, currency, price]);
const buy = (who: string, id: number, price = 1000, currency = 'gold') => as(who, 'select market_buy($1, $2, $3, $4)', [op(), id, currency, price]);
const bid = (who: string, id: number, amount: number) => as(who, 'select market_bid($1, $2, $3, $4)', [op(), id, 'gold', amount]);
const collect = (who: string) =>
  as<{ currency: string | null; amount: number | null; item: Item | null; note: string }[]>(who, 'select market_collect()');
const browse = (who: string | null, scope = 'all') =>
  as<{ id: number; mine: boolean; winning: boolean; high_bid: number | null }[]>(who, 'select market_browse($1)', [scope]);
/** Wind a listing's clock forward. Run as the database owner: no player could do this. */
const endsIn = (id: number, sql: string) => db.query(`update market_listings set ends_at = now() + interval '${sql}' where id = $1`, [id]);

const RING = BASES.find((b) => b.slot === 'ring')!.id;
const plainRing = (): Item => ({ uid: 7, baseId: RING, ilvl: 10, rarity: 'normal', name: null, prefixes: [], suffixes: [] });

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE);
  await db.exec(readFileSync('docs/ops/market.sql', 'utf8'));
  for (const id of [ALICE, BOB, CARA, NEWBIE, ADMIN]) await db.query('insert into auth.users values ($1)', [id]);
  for (const id of [ALICE, BOB, CARA, ADMIN]) await db.query(`insert into characters values ($1, $2, '{"act1Cleared":true}')`, [`c-${id}`, id]);
  await db.query(`insert into characters values ('c-new', $1, '{"act1Cleared":false}')`, [NEWBIE]);
  await db.query('insert into admins values ($1)', [ADMIN]);
  await as(ADMIN, 'select market_set_rules($1, $2)', ['test', JSON.stringify(marketRules())]);
}, 60_000);

beforeEach(async () => {
  await db.exec('truncate market_listings, market_inbox, market_ops, market_bans');
});

describe('who can trade', () => {
  it('lets a guest look but not touch', async () => {
    await list(ALICE, plainRing());
    expect(await browse(null)).toHaveLength(1);
    await expect(list(null, plainRing())).rejects.toThrow();
    await expect(as(null, 'select market_collect()')).rejects.toThrow();
  });

  it('keeps players who have not cleared Act 1 out', async () => {
    await expect(list(NEWBIE, plainRing())).rejects.toThrow('Clear Act 1');
  });

  it('never lets a player run the inner steps or read the tables', async () => {
    await expect(as(BOB, `select market_send($1, 'gold', 999, null, 'free money')`, [BOB])).rejects.toThrow('permission denied');
    await expect(as(BOB, 'select market_settle()')).rejects.toThrow('permission denied');
    expect(await as(BOB, 'select count(*)::int from market_inbox')).toBe(0);
    await expect(as(BOB, 'select market_set_rules($1, $2)', ['x', '{}'])).rejects.toThrow('Admins only');
    await expect(as(BOB, 'select market_admin_list()')).rejects.toThrow('Admins only');
    await expect(as(BOB, 'select market_admin_ban($1, true)', [ALICE])).rejects.toThrow('Admins only');
  });
});

describe('buy now', () => {
  it('pays the seller less 10% and gives the buyer the item', async () => {
    const id = await list(ALICE, plainRing());
    await buy(BOB, id, 1000);
    expect((await collect(ALICE)).map((r) => [r.currency, r.amount])).toEqual([['gold', 900]]);
    const got = await collect(BOB);
    expect(got).toHaveLength(1);
    expect(got[0].item?.baseId).toBe('iron_ring');
    expect(await browse(BOB)).toHaveLength(0);
  });

  it('rounds the cut down, so a 9 gold sale pays all 9', async () => {
    const id = await list(ALICE, plainRing(), 'buy', 'gold', 9);
    await buy(BOB, id, 9);
    expect((await collect(ALICE))[0].amount).toBe(9);
  });

  it('takes orbs as a price, but not a material', async () => {
    const id = await list(ALICE, plainRing(), 'buy', 'chaos', 10);
    await buy(BOB, id, 10, 'chaos');
    expect((await collect(ALICE))[0]).toMatchObject({ currency: 'chaos', amount: 9 });
    await expect(list(ALICE, plainRing(), 'buy', 'iron_ore', 10)).rejects.toThrow("can't be used as a price");
  });

  it('sells to only one buyer', async () => {
    const id = await list(ALICE, plainRing());
    await buy(BOB, id);
    await expect(buy(CARA, id)).rejects.toThrow('gone');
    expect(await collect(CARA)).toEqual([]);
  });

  it('refuses a stale price and your own listing', async () => {
    const id = await list(ALICE, plainRing());
    await expect(buy(BOB, id, 1)).rejects.toThrow("doesn't match");
    await expect(buy(ALICE, id)).rejects.toThrow('your own');
  });

  it('caps listings at 20', async () => {
    for (let i = 0; i < 20; i++) await list(ALICE, plainRing());
    await expect(list(ALICE, plainRing())).rejects.toThrow('20 listings');
  });

  it('returns an unsold item after its time is up', async () => {
    const id = await list(ALICE, plainRing());
    await endsIn(id, '-1 minute');
    expect((await collect(ALICE)).map((r) => r.item?.baseId)).toEqual(['iron_ring']);
    await expect(buy(BOB, id)).rejects.toThrow('gone');
  });

  it('lasts 7 days', async () => {
    const id = await list(ALICE, plainRing());
    const hours = (await db.query<{ h: number }>(`select extract(epoch from ends_at - now()) / 3600 as h from market_listings where id = $1`, [id])).rows[0].h;
    expect(Math.round(Number(hours))).toBe(168);
  });

  it('can be cancelled, returning the item', async () => {
    const id = await list(ALICE, plainRing());
    await expect(as(BOB, 'select market_cancel($1)', [id])).rejects.toThrow("isn't your");
    await as(ALICE, 'select market_cancel($1)', [id]);
    expect((await collect(ALICE)).map((r) => r.item?.baseId)).toEqual(['iron_ring']);
  });
});

describe('auctions', () => {
  it('refunds the outbid player and sells to the highest bid at the end', async () => {
    const id = await list(ALICE, plainRing(), 'auction');
    await bid(BOB, id, 1000);
    await bid(CARA, id, 2000);
    expect((await collect(BOB)).map((r) => r.amount)).toEqual([1000]);
    await endsIn(id, '-1 minute');
    expect((await collect(ALICE)).map((r) => r.amount)).toEqual([1800]);
    expect((await collect(CARA)).map((r) => r.item?.baseId)).toEqual(['iron_ring']);
  });

  it('needs the opening price, then 5% more', async () => {
    const id = await list(ALICE, plainRing(), 'auction');
    await expect(bid(BOB, id, 999)).rejects.toThrow('lowest bid is now 1000');
    await bid(BOB, id, 1000);
    await expect(bid(CARA, id, 1049)).rejects.toThrow('lowest bid is now 1050');
    await bid(CARA, id, 1050);
  });

  it('stops you outbidding yourself or bidding on your own item', async () => {
    const id = await list(ALICE, plainRing(), 'auction');
    await bid(BOB, id, 1000);
    await expect(bid(BOB, id, 2000)).rejects.toThrow('already the highest');
    await expect(bid(ALICE, id, 2000)).rejects.toThrow('your own');
  });

  it('adds 5 minutes to a bid in the last 5 minutes, and not before', async () => {
    const id = await list(ALICE, plainRing(), 'auction');
    const left = async () => Number((await db.query<{ m: number }>(`select extract(epoch from ends_at - now()) / 60 as m from market_listings where id = $1`, [id])).rows[0].m);
    expect(Math.round(await left())).toBe(24 * 60);
    await endsIn(id, '2 minutes');
    await bid(BOB, id, 1000);
    expect(Math.round(await left())).toBe(7);
    await endsIn(id, '1 hour');
    await bid(CARA, id, 2000);
    expect(Math.round(await left())).toBe(60);
  });

  it('returns an auction with no bids, and cannot be cancelled once bid on', async () => {
    const id = await list(ALICE, plainRing(), 'auction');
    await bid(BOB, id, 1000);
    await expect(as(ALICE, 'select market_cancel($1)', [id])).rejects.toThrow("can't be cancelled");
    const quiet = await list(ALICE, plainRing(), 'auction');
    await endsIn(quiet, '-1 minute');
    expect((await collect(ALICE)).map((r) => r.item?.baseId)).toEqual(['iron_ring']);
  });

  it('shows a bidder what they are winning', async () => {
    const id = await list(ALICE, plainRing(), 'auction');
    await bid(BOB, id, 1000);
    expect(await browse(BOB, 'bids')).toMatchObject([{ id, winning: true, high_bid: 1000 }]);
    expect(await browse(ALICE, 'mine')).toMatchObject([{ id, mine: true }]);
  });
});

describe('a lost reply', () => {
  it('records a finished step and not a refused one', async () => {
    const id = await list(ALICE, plainRing());
    const good = op();
    await as(BOB, 'select market_buy($1, $2, $3, $4)', [good, id, 'gold', 1000]);
    expect(await as(BOB, 'select market_op_done($1)', [good])).toBe(true);
    const bad = op();
    await expect(as(CARA, 'select market_buy($1, $2, $3, $4)', [bad, id, 'gold', 1000])).rejects.toThrow();
    expect(await as(CARA, 'select market_op_done($1)', [bad])).toBe(false);
  });

  it('never runs one request twice', async () => {
    const same = op();
    const args = [same, JSON.stringify(plainRing()), 'buy', 'gold', 10];
    await as(ALICE, 'select market_list($1, $2, $3, $4, $5)', args);
    await expect(as(ALICE, 'select market_list($1, $2, $3, $4, $5)', args)).rejects.toThrow('already ran');
    expect(await browse(ALICE)).toHaveLength(1);
  });
});

describe('the sanity check', () => {
  const s = newGame(1);
  const rng = seeded(1234);

  it('accepts everything the game can really make', async () => {
    for (let n = 0; n < 150; n++) {
      const base = BASES[n % BASES.length];
      const item = createItem(s, base.id, 1 + (n % 85), n % 2 ? 'rare' : 'magic', rng);
      const problem = (await db.query<{ p: string | null }>('select market_item_problem($1) as p', [JSON.stringify(item)])).rows[0].p;
      expect(problem, JSON.stringify(item)).toBeNull();
    }
  }, 60_000);

  it('accepts every unique', async () => {
    for (const u of UNIQUES.filter((x) => !x.noTrade)) {
      const problem = (await db.query<{ p: string | null }>('select market_item_problem($1) as p', [JSON.stringify(createUnique(s, u.id, 50))])).rows[0].p;
      expect(problem, u.id).toBeNull();
    }
  }, 60_000);

  it('refuses a no-trade unique', async () => {
    const problem = (await db.query<{ p: string | null }>('select market_item_problem($1) as p', [JSON.stringify(createUnique(s, 'old_covenant', 1))])).rows[0].p;
    expect(problem).not.toBeNull();
  }, 60_000);

  const rare = () => {
    let item = createItem(s, RING, 85, 'rare', rng);
    while (!item.prefixes.length && !item.suffixes.length) item = createItem(s, item.baseId, 85, 'rare', rng);
    return item;
  };
  const firstMod = (i: Item) => i.prefixes[0] ?? i.suffixes[0];

  it.each<[string, RegExp, (i: Item) => void]>([
    ['a made-up base', /unknown item base/, (i) => (i.baseId = 'legendary_pants')],
    ['a value past its range', /out of range/, (i) => (firstMod(i).values[0] = 99999)],
    ['a made-up modifier', /unknown modifier/, (i) => (firstMod(i).affixId = 'infinite_power')],
    ['too many modifiers', /too many/, (i) => (i.rarity = 'magic')],
    ['modifiers on a normal item', /too many/, (i) => (i.rarity = 'normal')],
    ['a fake unique', /unknown unique/, (i) => ((i.rarity = 'unique'), (i.uniqueId = 'god_ring'))],
    ['a tier above the item level', /above the item level/, (i) => (i.ilvl = 1)],
    ['a rude name', /bad name/, (i) => (i.name = '<b>buy gold</b>')],
    ['an extra field', /unknown item field/, (i) => ((i as unknown as Record<string, number>).power = 9000)],
    ['a tier that does not exist', /bad modifier tier/, (i) => (firstMod(i).tier = 50)],
  ])('refuses %s', async (_, why, spoil) => {
    const item = rare();
    spoil(item);
    await expect(list(ALICE, item)).rejects.toThrow(why);
  });

  it('checks a stored impression too', async () => {
    const item = rare();
    item.impression = { rarity: 'rare', name: 'Doom Band', prefixes: [{ affixId: 'infinite_power', tier: 0, values: [1] }], suffixes: [] };
    await expect(list(ALICE, item)).rejects.toThrow('unknown modifier');
  });

  it('refuses edited values on a unique', async () => {
    const u = createUnique(s, UNIQUES[0].id, 50);
    u.prefixes[0].values[0] += 1;
    await expect(list(ALICE, u)).rejects.toThrow('do not match');
  });

  it('allows a bench craft below the item level, once', async () => {
    const item: Item = { uid: 1, baseId: RING, ilvl: 1, rarity: 'magic', name: null, prefixes: [{ affixId: 'flat_life', tier: 1, values: [marketRules().affixes.flat_life.tiers[1].ranges[0][0]], crafted: true }], suffixes: [] };
    await list(ALICE, item);
  });
});

describe('admin tools', () => {
  it('removes a listing, returning the item and the bid', async () => {
    const id = await list(ALICE, plainRing(), 'auction');
    await bid(BOB, id, 1000);
    await as(ADMIN, 'select market_admin_remove($1)', [id]);
    expect((await collect(ALICE)).map((r) => r.item?.baseId)).toEqual(['iron_ring']);
    expect((await collect(BOB)).map((r) => r.amount)).toEqual([1000]);
    expect(await browse(BOB)).toEqual([]);
  });

  it('bans a player from trading but still lets them collect and cancel', async () => {
    const id = await list(ALICE, plainRing());
    await as(ADMIN, 'select market_admin_ban($1, true)', [ALICE]);
    await expect(list(ALICE, plainRing())).rejects.toThrow('banned');
    await as(ALICE, 'select market_cancel($1)', [id]);
    expect(await collect(ALICE)).toHaveLength(1);
    await as(ADMIN, 'select market_admin_ban($1, false)', [ALICE]);
    await list(ALICE, plainRing());
  });

  it('shows the seller to an admin but not to players', async () => {
    await list(ALICE, plainRing());
    const rows = await as<{ seller: string }[]>(ADMIN, 'select market_admin_list()');
    expect(rows[0].seller).toBe(ALICE);
    expect(JSON.stringify(await browse(BOB))).not.toContain(ALICE);
  });
});

import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ALICE = '00000000-0000-0000-0000-00000000000a';
const BOB = '00000000-0000-0000-0000-00000000000b';
const ADMIN = '00000000-0000-0000-0000-00000000000e';
let db: PGlite;

async function as(who: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`set role ${who ? 'authenticated' : 'anon'}`);
  try {
    await db.query("select set_config('test.uid', $1, false)", [who ?? '']);
    return await db.query(sql, params);
  } finally { await db.exec('reset role'); }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    grant usage on schema auth, public to anon, authenticated;
    create table auth.users (id uuid primary key, created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;
  `);
  const setup = readFileSync('docs/ops/SETUP.md', 'utf8');
  const blocks = [...setup.matchAll(/```sql\r?\n([\s\S]*?)```/g)].map((match) => match[1]);
  // Execute the actual setup policies, not a rewritten approximation of their intended behavior.
  for (const block of blocks.filter((sql) => /create table public\.(characters|admins|live_events)\b/.test(sql))) await db.exec(block);
  for (const uid of [ALICE, BOB, ADMIN]) await db.query('insert into auth.users (id) values ($1)', [uid]);
  await db.query('insert into admins values ($1)', [ADMIN]);
  for (const uid of [ALICE, BOB]) {
    await db.query("insert into characters (id,user_id,name,class_id,summary,save) values ($1,$2,'Test','mage','{}','{}')", [uid, uid]);
  }
}, 60_000);

afterAll(async () => { await db?.close(); });

describe('account and admin policies from the setup runbook', () => {
  it('isolates cloud saves between players and rejects forged ownership', async () => {
    expect((await as(null, 'select * from characters')).rows).toEqual([]);
    expect((await as(ALICE, 'select id from characters')).rows).toEqual([{ id: ALICE }]);
    expect((await as(ALICE, 'delete from characters where id = $1 returning id', [BOB])).rows).toEqual([]);
    await expect(as(ALICE, "insert into characters (id,user_id,name,class_id,summary,save) values ('forged',$1,'Test','mage','{}','{}')", [BOB])).rejects.toThrow('row-level security');
    expect((await as(BOB, 'select id from characters')).rows).toEqual([{ id: BOB }]);
  });

  it('prevents self-promotion and keeps admin reports private', async () => {
    await expect(as(ALICE, 'insert into admins values ($1)', [ALICE])).rejects.toThrow('row-level security');
    expect((await as(ALICE, 'select admin_stats() as report')).rows).toEqual([{ report: null }]);
    expect((await as(null, 'select is_admin() as admin')).rows).toEqual([{ admin: false }]);
    expect((await as(ADMIN, 'select admin_stats() as report')).rows[0]).toHaveProperty('report.accounts', 3);
  });

  it('keeps feedback private and prevents forged authors and event edits', async () => {
    await as(ALICE, "insert into feedback (kind,message) values ('bug','Test')");
    expect((await as(BOB, 'select * from feedback')).rows).toEqual([]);
    expect((await as(ADMIN, 'select message from feedback')).rows).toEqual([{ message: 'Test' }]);
    await expect(as(ALICE, "insert into feedback (user_id,kind,message) values ($1,'bug','Forged')", [BOB])).rejects.toThrow('row-level security');
    await expect(as(ALICE, "insert into live_events (id,enabled) values ('forged',true)")).rejects.toThrow('row-level security');
  });
});

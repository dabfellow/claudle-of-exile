import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it } from 'vitest';
import { fillAccount, freshAccount } from '../src/engine/account';
import { MATERIAL_CAP } from '../src/engine/bank';
import { makeCtx } from '../src/engine/context';
import { transferGuild } from '../src/engine/guildStash';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { startSkillAction } from '../src/engine/skills';
import { newGame, tick } from '../src/engine/state';

const ctx = () => makeCtx(seeded(1));

describe('personal supplies and Guild Stash', () => {
  it('keeps the miner and woodcutter working while the dagger crafter runs out of personal inputs', () => {
    const realm = freshAccount();
    const miner = newGame(1, { name: 'Miner', classId: 'warrior' }, realm);
    const cutter = newGame(2, { name: 'Woodcutter', classId: 'warrior' }, realm);
    const crafter = newGame(3, { name: 'Crafter', classId: 'shadow' }, realm);
    const c = ctx();
    expect(startSkillAction(miner, c, 'mine_copper')).toBeNull();
    expect(startSkillAction(cutter, c, 'cut_ash')).toBeNull();
    expect(startSkillAction(crafter, c, 'smith_whittled_dagger')).toBeTruthy();
    tick(miner, c, 120_000);
    simulateOffline(cutter, c, 120_000);
    expect(realm.bank).toEqual({});

    for (const [character, id, quantity] of [[miner, 'copper_ore', 15], [cutter, 'ash_log', 5]] as const) {
      expect(transferGuild(character, { direction: 'deposit', kind: 'bank', id, quantity })).toBeNull();
      expect(crafter.storage.bank[id]).toBeUndefined();
      expect(transferGuild(crafter, { direction: 'withdraw', kind: 'bank', id, quantity })).toBeNull();
    }
    expect(startSkillAction(crafter, c, 'smelt_copper')).toBeNull();
    tick(crafter, c, 10_000);
    expect(startSkillAction(crafter, c, 'mill_ash')).toBeNull();
    tick(crafter, c, 4_000);
    expect(startSkillAction(crafter, c, 'smith_whittled_dagger')).toBeNull();
    simulateOffline(crafter, c, 60_000);
    expect(crafter.inventory.filter((item) => item.baseId === 'whittled_dagger')).toHaveLength(1);
    expect(crafter.action).toBeNull();
    expect(miner.action?.kind).toBe('skill');
    expect(cutter.action?.kind).toBe('skill');
  });

  it('keeps XP and other drops when an offline material stack is full', () => {
    const miner = newGame(1);
    const uncapped = newGame(1);
    const c = ctx();
    const comparison = ctx();
    miner.storage.bank.copper_ore = MATERIAL_CAP - 1;
    expect(startSkillAction(miner, c, 'mine_copper')).toBeNull();
    expect(startSkillAction(uncapped, comparison, 'mine_copper')).toBeNull();
    const summary = simulateOffline(miner, c, 12 * 60_000);
    const baseline = simulateOffline(uncapped, comparison, 12 * 60_000);
    expect(miner.storage.bank.copper_ore).toBe(MATERIAL_CAP);
    expect(summary.materials.copper_ore).toBe(1);
    expect(miner.storage.bank.rough_gem).toBeGreaterThan(0);
    expect(summary.xp.mining).toBeGreaterThan(0);
    expect(summary.xp.mining).toBe(baseline.xp.mining);
    expect(summary.materials.rough_gem).toBe(baseline.materials.rough_gem);
    expect(miner.account.bank.copper_ore).toBeUndefined();
  });

  it('preserves existing shared balances once and enforces the cap on withdrawals', () => {
    const realm = fillAccount({ ...freshAccount(), bank: { ash_log: 8_000 }, maps: { map_t1: 7 } });
    const old = JSON.parse(serialize(newGame(1)));
    old.version = 50;
    delete old.storage;
    old.maps.stock = { map_t1: 7 };
    const loaded = deserialize(JSON.stringify(old));
    loaded.account = realm;
    expect(loaded.maps.stock).toEqual({});
    expect(loaded.storage.bank).toEqual({});
    expect(transferGuild(loaded, { direction: 'withdraw', kind: 'bank', id: 'ash_log', quantity: 5_001 })).toBeTruthy();
    expect(transferGuild(loaded, { direction: 'withdraw', kind: 'bank', id: 'ash_log', quantity: 5_000 })).toBeNull();
    expect(realm.bank.ash_log).toBe(3_000);
    expect(deserialize(serialize(loaded)).storage.bank.ash_log).toBe(5_000);
    expect(realm.maps).toEqual({ map_t1: 7 });
  });
});

it('writes both cloud saves together and preserves the Guild Stash against an earlier ordinary save', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql as $$ select '00000000-0000-0000-0000-000000000001'::uuid $$;
      create table public.characters (id text primary key, user_id uuid not null, name text not null,
        class_id text not null, summary jsonb not null, save jsonb not null, updated_at timestamptz default now());
      create function stamp() returns trigger language plpgsql as $$ begin new.updated_at := clock_timestamp(); return new; end $$;
      create trigger stamp before update on public.characters for each row execute function stamp();
      alter table public.characters enable row level security;
      create policy own on public.characters using (user_id = auth.uid());
      grant usage on schema auth to authenticated;
      grant select, insert, update on public.characters to authenticated;
    `);
    const migration = readFileSync('docs/ops/guild-stash.sql', 'utf8');
    await db.exec(migration);
    await db.exec(migration);
    const realmId = 'account:standard:00000000-0000-0000-0000-000000000001';
    await db.query(`insert into characters values
      ('crafter', auth.uid(), 'Crafter', 'shadow', '{"realm":"standard"}', '{"character":{"id":"crafter"}}', '2026-11-20'),
      ($1, auth.uid(), 'Account', 'account', '{}', '{"realm":"standard","rev":1,"bank":{"ash_log":10}}', '2026-11-20')`, [realmId]);
    const personal = { id: 'crafter', name: 'Crafter', class_id: 'shadow', summary: { realm: 'standard' }, save: { character: { id: 'crafter' }, storage: { bank: { ash_log: 10 } } } };
    const guild = { id: realmId, summary: {}, save: { realm: 'standard', rev: 2, guildRev: 1, bank: {} } };
    await db.exec('set role authenticated');
    const move = (characterStamp: string) => db.query<{ written: Date | null }>(
      "select save_guild_stash_transfer($1, $2, $3, '2026-11-20') as written", [JSON.stringify(personal), characterStamp, JSON.stringify(guild)]);
    expect((await move('2026-11-19')).rows[0].written).toBeNull();
    expect((await move('2026-11-20')).rows[0].written).toBeTruthy();
    expect((await move('2026-11-20')).rows[0].written).toBeNull();
    await db.query(`update characters set save = '{"realm":"standard","rev":2,"bank":{"ash_log":10}}' where id = $1`, [realmId]);
    const { rows } = await db.query<{ save: unknown }>('select save from characters order by id');
    expect(rows.map(({ save }) => save)).toEqual([{ realm: 'standard', rev: 3, guildRev: 1, bank: {} }, personal.save]);
  } finally {
    await db.close();
  }
}, 15_000);

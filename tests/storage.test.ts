import { describe, expect, it } from 'vitest';
import { settleCharacter } from '../src/engine/account';
import { BAG_SIZE, GROUND_CAP, OFFLINE_HAUL_CAP, STASH_PAGE_SIZE } from '../src/data/hideout';
import { retreat, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { salvage } from '../src/engine/crafting';
import { sellItems } from '../src/engine/hideout';
import { createItem } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { buyStashPage, dropItem, groundAtRisk, groundOnDeath, pickUp, salvagePile, stashItems, stashPagePrice, takeFromStash } from '../src/engine/storage';
import type { GameState, Item } from '../src/engine/types';
import { veteran } from './helpers';

const ctx = (offline = false) => ({ ...makeCtx(seeded(1)), offline });
const sword = (s: GameState): Item => createItem(s, 'rusted_sword', 1, 'normal', seeded(s.nextUid));

describe('gear storage', () => {
  it('drops land on the ground, newest kept, oldest pushed out past the cap', () => {
    const s = newGame(1);
    const items = Array.from({ length: GROUND_CAP + 5 }, () => sword(s));
    for (const i of items) dropItem(s, ctx(), i);
    expect(s.ground).toHaveLength(GROUND_CAP);
    expect(s.ground[0]).toBe(items[5]);
    expect(s.inventory).toHaveLength(0);
  });

  it('offline drops go to the haul, with its own bigger cap', () => {
    const s = newGame(1);
    for (let i = 0; i < OFFLINE_HAUL_CAP + 3; i++) dropItem(s, ctx(true), sword(s));
    expect(s.offlineHaul).toHaveLength(OFFLINE_HAUL_CAP);
    expect(s.ground).toHaveLength(0);
  });

  it('salvages the whole ground pile into dust', () => {
    const s = newGame(1);
    s.ground.push(sword(s), sword(s));
    s.bank.arcane_dust = 0;
    expect(salvagePile(s, ctx(), 'ground')).toBeGreaterThan(0);
    expect(s.ground).toHaveLength(0);
    expect(groundAtRisk(s)).toBe(0);
    expect(s.lifetime.salvaged).toBe(2);
    expect(s.bank.arcane_dust).toBeGreaterThan(0);
  });

  it('salvages only the given items from a pile', () => {
    const s = newGame(1);
    const a = sword(s);
    const b = sword(s);
    s.ground.push(a, b);
    salvagePile(s, ctx(), 'ground', [a.uid]);
    expect(s.ground).toEqual([b]);
    expect(s.lifetime.salvaged).toBe(1);
  });

  it('picks up into the bag until it is full', () => {
    const s = newGame(1);
    for (let i = 0; i < BAG_SIZE - 1; i++) s.inventory.push(sword(s));
    const a = sword(s);
    const b = sword(s);
    s.ground.push(a, b);
    expect(pickUp(s, ctx(), 'ground', [a.uid, b.uid])).toBe(1);
    expect(s.ground).toEqual([b]);
  });

  it('the ground stays when you enter an area or leave combat', () => {
    const s = newGame(1);
    s.ground.push(sword(s));
    startCombat(s, ctx(), 'mudflats');
    expect(s.ground).toHaveLength(1);
    retreat(s);
    expect(s.ground).toHaveLength(1);
  });

  it('a second death loses what the first one left unclaimed, not newer drops', () => {
    const s = newGame(1);
    const old = sword(s);
    const claimed = sword(s);
    s.ground.push(old, claimed);
    expect(groundOnDeath(s)).toBe(0);
    expect(groundAtRisk(s)).toBe(2);
    pickUp(s, ctx(), 'ground', [claimed.uid]);
    const fresh = sword(s);
    s.ground.push(fresh);
    expect(groundAtRisk(s)).toBe(1);
    expect(groundOnDeath(s)).toBe(1);
    expect(s.ground).toEqual([fresh]);
    expect(groundAtRisk(s)).toBe(1);
    expect(s.inventory).toContain(claimed);
  });

  it('moves gear between bag and stash pages, spilling to the next page', () => {
    const s = newGame(1);
    for (let i = 0; i < STASH_PAGE_SIZE; i++) s.account.stash[0].push(sword(s));
    const a = sword(s);
    s.inventory.push(a);
    expect(stashItems(s, ctx(), [a.uid], 0)).toBe(1);
    expect(s.account.stash[1]).toContain(a);
    expect(takeFromStash(s, ctx(), [a.uid])).toBe(1);
    expect(s.inventory).toContain(a);
  });

  it('sells and salvages from the stash too', () => {
    const s = veteran(newGame(1));
    const a = sword(s);
    const b = sword(s);
    s.account.stash[2].push(a, b);
    expect(sellItems(s, ctx(), [a.uid])).toBeGreaterThan(0);
    expect(salvage(s, ctx(), [b.uid])).toBeGreaterThan(0);
    expect(s.account.stash[2]).toHaveLength(0);
  });

  it('stash pages cost more each time', () => {
    const s = newGame(1);
    s.bank.gold = 10_000;
    expect(stashPagePrice(s)).toBe(1000);
    expect(buyStashPage(s, ctx())).toBeNull();
    expect(s.account.stash).toHaveLength(4);
    expect(stashPagePrice(s)).toBe(2500);
  });

  it('old saves keep 60 items in the bag and move the rest to the stash', () => {
    const s = newGame(1);
    for (let i = 0; i < 100; i++) s.inventory.push(sword(s));
    const raw = JSON.parse(serialize(s));
    raw.version = 13;
    delete raw.stash;
    delete raw.ground;
    delete raw.offlineHaul;
    const loaded = deserialize(JSON.stringify(raw));
    settleCharacter(loaded, loaded.account);
    expect(loaded.inventory).toHaveLength(BAG_SIZE);
    expect(loaded.account.stash[0]).toHaveLength(40);
    expect(loaded.account.stash).toHaveLength(3);
  });
});

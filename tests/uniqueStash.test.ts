import { describe, expect, it } from 'vitest';
import { fillAccount, mergeAccounts, reconcileAccounts } from '../src/engine/account';
import { makeCtx } from '../src/engine/context';
import { locateItem, moveToBag, moveToStash } from '../src/engine/itemActions';
import { createItem, createUnique } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { stashedItems, stashItems, takeOwned } from '../src/engine/storage';
import type { AccountState } from '../src/engine/types';

const ctx = () => makeCtx(seeded(1));
const copy = (a: AccountState) => JSON.parse(JSON.stringify(a)) as AccountState;

describe('the Uniques tab', () => {
  it('stashing a unique files it in the Uniques tab and marks it found; other gear still goes to a page', () => {
    const s = newGame(1);
    const u = createUnique(s, 'miners_lament', 5);
    const sword = createItem(s, 'rusted_sword', 1, 'normal', seeded(2));
    s.inventory.push(u, sword);
    expect(stashItems(s, ctx(), [u.uid, sword.uid])).toBe(2);
    expect(s.account.uniqueStash.map((i) => i.uniqueId)).toEqual(['miners_lament']);
    expect(s.account.stash.flat()).toHaveLength(1);
    expect(s.account.uniquesSeen).toContain('miners_lament');
    expect(locateItem(s, u.uid)?.at).toBe('uniques');
    expect(stashedItems(s)).toHaveLength(2);
  });

  it('a unique goes to the tab even when every gear page is full, and comes back to the bag', () => {
    const s = newGame(1);
    for (const page of s.account.stash) while (page.length < 80) page.push(createItem(s, 'rusted_sword', 1, 'normal', seeded(page.length)));
    const u = createUnique(s, 'miners_lament', 5);
    s.equipment.helmet = u;
    expect(moveToStash(s, ctx(), u.uid)).toBeNull();
    expect(s.equipment.helmet).toBeUndefined();
    expect(s.account.uniqueStash).toHaveLength(1);
    expect(moveToBag(s, ctx(), s.account.uniqueStash[0].uid)).toBeNull();
    expect(s.account.uniqueStash).toHaveLength(0);
    expect(s.inventory.some((i) => i.uniqueId === 'miners_lament')).toBe(true);
  });

  it('selling or salvaging takes a unique out of the tab', () => {
    const s = newGame(1);
    const u = createUnique(s, 'miners_lament', 5);
    s.inventory.push(u);
    stashItems(s, ctx(), [u.uid]);
    const uid = s.account.uniqueStash[0].uid;
    expect(takeOwned(s, [uid])).toHaveLength(1);
    expect(s.account.uniqueStash).toHaveLength(0);
    expect(s.account.uniquesSeen).toContain('miners_lament');
  });

  it('an old account moves its stashed uniques off the gear pages and out of the overflow', () => {
    const s = newGame(1);
    const old = copy(s.account) as Partial<AccountState>;
    delete old.uniqueStash;
    delete old.uniquesSeen;
    old.stash![0].push(createUnique(s, 'miners_lament', 5), createItem(s, 'rusted_sword', 1, 'normal', seeded(2)));
    old.overflow!.push(createUnique(s, 'miners_lament', 5));
    const a = fillAccount(old as AccountState);
    expect(a.uniqueStash).toHaveLength(2);
    expect(a.stash[0]).toHaveLength(1);
    expect(a.overflow).toHaveLength(0);
    expect(a.uniquesSeen).toEqual(['miners_lament']);
  });

  it('two devices syncing never copy a unique, even from a copy saved before the tab', () => {
    const s = newGame(1);
    const u = createUnique(s, 'miners_lament', 5);
    u.uid = s.account.nextUid++;
    s.account.stash[0].push(u);
    const base = copy(s.account) as Partial<AccountState>;
    delete base.uniqueStash;
    delete base.uniquesSeen;
    const theirs = fillAccount(copy(s.account));
    const mine = fillAccount(copy(s.account));
    mergeAccounts(mine, base as AccountState, theirs);
    expect(mine.uniqueStash).toHaveLength(1);
    expect(mine.stash.flat()).toHaveLength(0);
  });

  it('a tab or device still on the old version, saving after this one, does not empty the Uniques tab', () => {
    const s = newGame(1);
    const u = createUnique(s, 'miners_lament', 5);
    s.inventory.push(u);
    stashItems(s, ctx(), [u.uid]);
    const sword = createItem(s, 'rusted_sword', 1, 'normal', seeded(2));
    sword.uid = s.account.nextUid++;
    // the old version saves its own copy: it never heard of the tab, but did stash a sword
    const old = copy(s.account) as Partial<AccountState>;
    delete old.uniqueStash;
    delete old.uniquesSeen;
    old.stash![0].push(sword);
    old.rev = (old.rev ?? 0) + 1;

    const mine = s.account;
    mergeAccounts(mine, copy(s.account), fillAccount(copy(old as AccountState)));
    expect(mine.uniqueStash.map((i) => i.uniqueId)).toEqual(['miners_lament']);
    expect(mine.stash[0].some((i) => i.uid === sword.uid)).toBe(true);

    const synced = reconcileAccounts(fillAccount(copy(old as AccountState)), copy(s.account));
    expect(synced.uniqueStash.map((i) => i.uniqueId)).toEqual(['miners_lament']);
  });
});

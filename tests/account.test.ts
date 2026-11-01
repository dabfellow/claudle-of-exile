import { describe, expect, it } from 'vitest';
import { STASH_PAGE_SIZE } from '../src/data/hideout';
import { ACCOUNT_UID_BASE, freshAccount, reconcileAccounts, settleCharacter } from '../src/engine/account';
import { bossesOffline, grantUnlocks, offlineCapMs } from '../src/engine/automation';
import { makeCtx } from '../src/engine/context';
import { campaignComplete, FINAL_ACT, stationLevel } from '../src/engine/hideout';
import { locateItem, moveToBag, moveToStash } from '../src/engine/itemActions';
import { createItem } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { deserialize, exportSave, importSave, serialize } from '../src/engine/save';
import { newGame, SAVE_VERSION, tick } from '../src/engine/state';
import { settleOverflow, stashItems, takeFromStash, takeOwned } from '../src/engine/storage';
import type { GameState } from '../src/engine/types';
import { actBossZone } from '../src/data/zones';
import { LocalSaveStore, MemorySaveStore, moveCharacters } from '../src/platform/saves';

const ctx = () => makeCtx(seeded(1));
const sword = (s: GameState) => createItem(s, 'rusted_sword', 1, 'normal', seeded(s.nextUid));

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

/** A character as version 20 saved it, with its hideout, unlocks and stash on the character. */
function v20(s: GameState, parts: { hideout?: Record<string, number>; rules?: string[]; slots?: number; hours?: number; stash?: GameState['account']['stash'] } = {}): string {
  const raw = JSON.parse(serialize(s));
  raw.version = 20;
  raw.hideout = { ...s.account.hideout, ...parts.hideout };
  raw.automation = { rules: parts.rules ?? [], ruleSlots: parts.slots ?? 1, offlineHours: parts.hours ?? 8 };
  raw.stash = parts.stash ?? [[], [], []];
  return JSON.stringify(raw);
}

describe('sharing', () => {
  it('a second character starts with the account unlocks, its own skills and the shared stash', () => {
    const first = newGame(1, { name: 'Ann', classId: 'warrior' });
    first.skills.mining = 5000;
    first.account.hideout.war_table = 4;
    grantUnlocks(first, { rules: ['vitals', 'status', 'windups'], ruleSlots: 2, offlineHours: 12 });
    const blade = sword(first);
    first.inventory.push(blade);
    stashItems(first, ctx(), [blade.uid]);

    const second = newGame(2, { name: 'Bo', classId: 'mage' }, first.account);
    expect(stationLevel(second, 'war_table')).toBe(4);
    expect(bossesOffline(second)).toBe(true);
    expect(offlineCapMs(second)).toBe(12 * 3_600_000);
    expect(second.skills.mining).toBe(0);
    expect(second.bossesDefeated).toEqual([]);
    expect(takeFromStash(second, ctx(), [blade.uid])).toBe(1);
    expect(second.inventory.some((i) => i.uid === blade.uid)).toBe(true);
    expect(first.account.stash.flat()).toHaveLength(0);
  });

  it("a character's save leaves the account out", () => {
    const s = newGame(1);
    s.account.hideout.forge = 3;
    const raw = JSON.parse(serialize(s));
    expect(raw.account).toBeUndefined();
    expect(deserialize(serialize(s)).account.hideout.forge).toBe(1);
  });

  it("items never clash with another character's uids, however they got to the stash", () => {
    const a = newGame(1, { name: 'Ann', classId: 'warrior' });
    const b = newGame(1, { name: 'Bo', classId: 'warrior' }, a.account);
    const mine = sword(a);
    const theirs = sword(b);
    expect(mine.uid).toBe(theirs.uid);
    a.inventory.push(mine);
    b.inventory.push(theirs);
    stashItems(a, ctx(), [mine.uid]);
    expect(mine.uid).toBeGreaterThanOrEqual(ACCOUNT_UID_BASE);
    expect(locateItem(b, theirs.uid)?.at).toBe('bag');
    expect(locateItem(b, mine.uid)?.at).toBe('stash');
    moveToStash(b, ctx(), theirs.uid);
    expect(theirs.uid).not.toBe(mine.uid);
    // taking it out and putting it back doesn't need a new uid
    const kept = mine.uid;
    moveToBag(b, ctx(), kept);
    moveToStash(b, ctx(), kept);
    expect(mine.uid).toBe(kept);
  });
});

describe('migrating to the account', () => {
  const settle = (json: string, a = freshAccount()) => {
    const s = deserialize(json);
    return { s, a, merged: settleCharacter(s, a) };
  };

  it('is the current version, and leaves a lone character exactly as it was', () => {
    expect(SAVE_VERSION).toBe(25);
    const s = newGame(1);
    const item = sword(s);
    const { a, s: loaded } = settle(v20(s, { hideout: { stash: 2, bench: 3 }, rules: ['vitals'], slots: 2, hours: 12, stash: [[], [item], [], []] }));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.unmerged).toBeUndefined();
    expect(a.hideout.bench).toBe(3);
    expect(a.automation).toEqual({ rules: ['vitals'], ruleSlots: 2, offlineHours: 12 });
    expect(a.stash.map((p) => p.length)).toEqual([0, 1, 0, 0]);
    expect(a.overflow).toEqual([]);
  });

  it('takes the highest of everything across characters and keeps every item', () => {
    const one = newGame(1, { name: 'Ann', classId: 'warrior' });
    const two = newGame(2, { name: 'Bo', classId: 'mage' });
    const a = freshAccount();
    settle(v20(one, { hideout: { forge: 4, war_table: 2 }, rules: ['vitals'], hours: 12, stash: [[sword(one)], [], []] }), a);
    settle(v20(two, { hideout: { forge: 2, war_table: 3, watchtower: 3 }, rules: ['status'], slots: 2, hours: 16, stash: [[sword(two)], [], []] }), a);
    expect(a.hideout).toMatchObject({ forge: 4, war_table: 3, watchtower: 3 });
    expect(a.automation).toEqual({ rules: ['vitals', 'status'], ruleSlots: 2, offlineHours: 16 });
    expect(a.stash[0]).toHaveLength(2);
    const uids = a.stash.flat().map((i) => i.uid);
    expect(new Set(uids).size).toBe(2);
    expect(a.absorbed).toHaveLength(2);
  });

  it('keeps pages paid for on each character, counts free pages once, and overflows the rest', () => {
    const full = (s: GameState) => Array.from({ length: STASH_PAGE_SIZE }, () => sword(s));
    const one = newGame(1, { name: 'Ann', classId: 'warrior' });
    const two = newGame(2, { name: 'Bo', classId: 'mage' });
    const a = freshAccount();
    // Ann: a free page and a bought one. Bo: three full pages, and one bought
    settle(v20(one, { hideout: { stash: 2 }, stash: [full(one), full(one), full(one), full(one), full(one)] }), a);
    expect(a.stash).toHaveLength(5);
    settle(v20(two, { stash: [full(two), full(two), full(two), []] }), a);
    expect(a.stash).toHaveLength(6);
    expect(a.stash.flat()).toHaveLength(6 * STASH_PAGE_SIZE);
    expect(a.overflow).toHaveLength(2 * STASH_PAGE_SIZE);

    // overflow can be taken out, salvaged, and moved in once there's room, but nothing is lost
    const s = newGame(3, { name: 'Cy', classId: 'mage' }, a);
    const spilled = a.overflow[0];
    expect(locateItem(s, spilled.uid)?.at).toBe('overflow');
    expect(takeFromStash(s, ctx(), [spilled.uid])).toBe(1);
    expect(takeOwned(s, [a.overflow[0].uid])).toHaveLength(1);
    a.stash[0].splice(0, 3);
    expect(settleOverflow(s)).toBe(3);
    expect(a.overflow).toHaveLength(2 * STASH_PAGE_SIZE - 5);
  });

  it('counts a character once, even when the merge is cut short and runs again', () => {
    const s = newGame(1);
    const json = v20(s, { stash: [[sword(s)], [], []] });
    const a = freshAccount();
    settle(json, a);
    const again = settle(json, a);
    expect(again.merged).toBe(false);
    expect(again.s.unmerged).toBeUndefined();
    expect(a.stash.flat()).toHaveLength(1);
  });

  it('keeps an auto-craft running on a stashed item', () => {
    const s = newGame(1);
    const item = sword(s);
    const old = item.uid;
    s.action = { kind: 'craft', uid: old, method: { orb: 'chaos' }, rule: { kind: 'has', affixId: 'flat_life' }, progress: 0, steps: 0 };
    const { s: loaded, a } = settle(v20(s, { stash: [[item], [], []] }));
    expect(loaded.action).toMatchObject({ uid: a.stash[0][0].uid });
    expect(a.stash[0][0].uid).not.toBe(old);
  });

  it('keeps the Exile for anyone who earned it under the old rule', () => {
    const cleared = newGame(1);
    cleared.bossesDefeated = ['sanctum'];
    expect(settle(v20(cleared)).a.exileUnlocked).toBe(true);
    const exile = newGame(2, { name: 'Ex', classId: 'exile', startNode: 'class_int' });
    const { a, s } = settle(v20(exile));
    expect(a.exileUnlocked).toBe(true);
    expect(s.character.startNode).toBe(exile.character.startNode);
    expect(settle(v20(newGame(3))).a.exileUnlocked).toBe(false);
  });
});

describe('the Exile unlock', () => {
  it('comes from finishing the campaign, not Act 1', () => {
    const s = newGame(1);
    s.bossesDefeated = ['sanctum'];
    tick(s, ctx(), 50);
    expect(s.account.exileUnlocked).toBe(false);
    const finalBoss = actBossZone(FINAL_ACT);
    if (finalBoss) {
      s.bossesDefeated.push(finalBoss.id);
      expect(campaignComplete(s)).toBe(true);
      tick(s, ctx(), 50);
      expect(s.account.exileUnlocked).toBe(true);
    }
  });
});

describe('exports', () => {
  it('carry the stash to a new account, and re-importing on the same account copies nothing', () => {
    const s = newGame(1);
    const item = sword(s);
    s.inventory.push(item);
    stashItems(s, ctx(), [item.uid]);
    s.account.hideout.forge = 3;
    const text = exportSave(s);

    const elsewhere = freshAccount();
    expect(settleCharacter(importSave(text), elsewhere)).toBe(true);
    expect(elsewhere.stash.flat()).toHaveLength(1);
    expect(elsewhere.hideout.forge).toBe(3);

    expect(settleCharacter(importSave(text), s.account)).toBe(false);
    expect(s.account.stash.flat()).toHaveLength(1);
  });
});

describe('stores', () => {
  it('keep the account beside the characters, and saving a character never touches it', async () => {
    const store = new LocalSaveStore(new MemoryStorage(), 'guest-1', false);
    expect(await store.loadAccount()).toBeNull();
    const a = freshAccount();
    a.hideout.forge = 2;
    await store.saveAccount(a);
    await store.save(newGame(1));
    expect((await store.loadAccount())?.hideout.forge).toBe(2);
  });

  it('marks a save settled only once it has handed over', async () => {
    const store = new MemorySaveStore();
    const s = deserialize(v20(newGame(1)));
    await store.save(s);
    expect((await store.list())[0].settled).toBe(false);
    settleCharacter(s, freshAccount());
    await store.save(s);
    expect((await store.list())[0].settled).toBe(true);
  });

  it('moving guests brings their stash and unlocks, once', async () => {
    const guest = new MemorySaveStore();
    const account = new MemorySaveStore();
    const s = newGame(1, { name: 'Ann', classId: 'mage' });
    s.account.hideout.forge = 3;
    s.account.stash[0].push(sword(s));
    await guest.save(s);
    await guest.saveAccount(s.account);
    const mine = freshAccount();
    mine.hideout.bench = 4;
    await account.saveAccount(mine);

    expect(await moveCharacters(guest, account, [])).toBe(1);
    const merged = (await account.loadAccount())!;
    expect(merged.hideout).toMatchObject({ forge: 3, bench: 4 });
    expect(merged.stash.flat()).toHaveLength(1);
    expect(await guest.loadAccount()).toBeNull();
  });

  it('two copies of an account keep the newer stash and every unlock', () => {
    const older = freshAccount();
    older.hideout.forge = 4;
    older.automation.offlineHours = 16;
    const newer = freshAccount();
    newer.rev = 5;
    newer.hideout.bench = 3;
    const merged = reconcileAccounts(newer, older);
    expect(merged.hideout).toMatchObject({ forge: 4, bench: 3 });
    expect(merged.automation.offlineHours).toBe(16);
  });
});

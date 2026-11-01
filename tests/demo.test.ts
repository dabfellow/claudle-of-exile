import type { User } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { freshAccount, settleCharacter } from '../src/engine/account';
import { createItem } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { SAVE_KEY, serialize, serializeBundle } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { AppAccounts, isCloudAccount, toAccount } from '../src/platform/accounts';
import { adoptDemo, hasGuestProgress, LocalSaveStore, MemorySaveStore } from '../src/platform/saves';

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

const user = (provider: string, meta: Record<string, unknown> = {}) =>
  ({ id: 'u1', email: 'a@b.c', app_metadata: { provider }, user_metadata: meta }) as unknown as User;

describe('demo accounts', () => {
  it('start without writing anything to browser storage', async () => {
    const storage = new MemoryStorage();
    const account = await new AppAccounts(storage, null).signIn('demo');
    expect(account?.provider).toBe('demo');
    expect(isCloudAccount(account)).toBe(false);
    expect(storage.length).toBe(0);
  });

  it("aren't remembered after a reload", async () => {
    const storage = new MemoryStorage();
    await new AppAccounts(storage, null).signIn('demo');
    expect(await new AppAccounts(storage, null).init()).toBeNull();
  });
});

describe('MemorySaveStore', () => {
  it('saves, lists, loads and removes without sharing state', async () => {
    const store = new MemorySaveStore();
    const s = newGame(1, { name: 'Ann', classId: 'mage' });
    await store.save(s);
    s.character.name = 'Changed';
    expect((await store.list()).map((c) => c.name)).toEqual(['Ann']);
    expect((await store.load(s.character.id))?.character.name).toBe('Ann');
    await store.remove(s.character.id);
    expect(await store.list()).toEqual([]);
  });
});

describe('guest progress', () => {
  it('is false for a guest with no characters', async () => {
    expect(await hasGuestProgress(new MemoryStorage(), undefined)).toBe(false);
    expect(await hasGuestProgress(new MemoryStorage(), 'guest-1')).toBe(false);
  });

  it('is true once a guest has a character', async () => {
    const storage = new MemoryStorage();
    await new LocalSaveStore(storage, 'guest-1', false).save(newGame(1, { name: 'Ann', classId: 'mage' }));
    expect(await hasGuestProgress(storage, 'guest-1')).toBe(true);
  });

  it('counts the pre-characters single save', async () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, serialize(newGame(1, { name: 'Old', classId: 'mage' })));
    expect(await hasGuestProgress(storage, undefined)).toBe(true);
  });
});

describe('email accounts', () => {
  it('are labelled email and show their player name', () => {
    const account = toAccount(user('email', { full_name: 'Ann' }));
    expect(account.provider).toBe('email');
    expect(account.displayName).toBe('Ann');
    expect(isCloudAccount(account)).toBe(true);
  });

  it('leave Google and Discord labels alone', () => {
    expect(toAccount(user('google')).provider).toBe('google');
    expect(toAccount(user('discord')).provider).toBe('discord');
  });
});

describe('adopting a demo', () => {
  it('moves the character onto the account with its progress', async () => {
    const account = new MemorySaveStore();
    const s = newGame(1, { name: 'Ann', classId: 'mage' });
    s.lifetime.kills = 42;
    const id = await adoptDemo(serialize(s), account);
    expect(id).toBe(s.character.id);
    expect((await account.load(id))?.lifetime.kills).toBe(42);
  });

  it('brings the demo hideout and stash along with the character', async () => {
    const account = new MemorySaveStore();
    const s = newGame(1, { name: 'Ann', classId: 'mage' });
    s.account.hideout.bench = 3;
    s.account.stash[1].push(createItem(s, 'rusted_sword', 1, 'normal', seeded(1)));
    const id = await adoptDemo(serializeBundle(s), account);
    const adopted = (await account.load(id))!;
    const mine = freshAccount();
    expect((await account.list())[0].handedOver).toBe(false);
    expect(settleCharacter(adopted, mine)).toBe(true);
    expect(mine.hideout.bench).toBe(3);
    expect(mine.stash[1]).toHaveLength(1);
  });

  it('renames on a clash so the existing character survives', async () => {
    const account = new MemorySaveStore();
    const existing = newGame(1, { name: 'Ann', classId: 'mage' });
    await account.save(existing);
    await adoptDemo(serialize(newGame(2, { name: 'ann', classId: 'warrior' })), account);
    expect((await account.list()).map((c) => c.name).sort()).toEqual(['Ann', 'ann 2']);
  });
});

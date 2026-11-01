import { describe, expect, it } from 'vitest';
import { CLASSES } from '../src/data/classes';
import { actionsFor } from '../src/data/skills';
import { TUTORIAL_STEPS } from '../src/data/tutorial';
import { makeCtx } from '../src/engine/context';
import { allocate, allocateReason } from '../src/engine/passives';
import { seeded } from '../src/engine/rng';
import { deserialize, SAVE_KEY, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { currentStep, skipTutorial, tutorialPage, withTutorial } from '../src/engine/tutorial';
import type { GameEvent, GameState } from '../src/engine/types';
import { LocalAccounts } from '../src/platform/accounts';
import { LocalSaveStore } from '../src/platform/saves';

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

describe('classes', () => {
  it('each class gets its kit, bonus and own tree start', () => {
    for (const c of CLASSES) {
      const s = newGame(1, { name: 'T', classId: c.id });
      expect(Object.values(s.equipment).map((i) => i!.baseId).sort()).toEqual(Object.values(c.kit).sort());
      const raw = deriveStats(s).raw;
      for (const [k, v] of Object.entries(c.bonus)) expect(raw[k as keyof typeof raw]).toBeGreaterThanOrEqual(v!);
      s.skills.combat = 1e5; // well past the levels needed for the first nodes
      const own = `${c.region}_hub`;
      const other = CLASSES.find((o) => o.region !== c.region)!;
      expect(allocateReason(s, `${other.region}_hub`)).toMatch(/connect/);
      expect(allocate(s, makeCtx(seeded(1)), own)).toBeNull();
    }
  });
});

describe('tutorial', () => {
  const run = (s: GameState, events: GameEvent[]) => {
    const base = makeCtx(seeded(1));
    const ctx = withTutorial(base, () => s);
    events.forEach((e) => ctx.emit(e));
    return base.events;
  };

  it('advances only on matching events and grants rewards once', () => {
    const s = newGame(1);
    const c = withTutorial(makeCtx(seeded(1)), () => s);
    run(s, [{ t: 'kill', name: 'x', boss: false }]);
    expect(s.tutorial.step).toBe(0);
    tutorialPage(s, c, 'mining');
    expect(s.tutorial.step).toBe(0);
    tutorialPage(s, c, 'campaign');
    expect(s.tutorial.step).toBe(1);
    run(s, [{ t: 'combatStart', zoneId: 'mudflats' }]);
    expect(currentStep(s)?.id).toBe('slay');
    const gold = s.account.bank.gold;
    run(s, [
      { t: 'kill', name: 'a', boss: false },
      { t: 'kill', name: 'b', boss: false },
    ]);
    expect(s.tutorial.progress).toBe(2);
    expect(s.account.bank.gold).toBe(gold);
    const evs = run(s, [
      { t: 'kill', name: 'c', boss: false },
      { t: 'kill', name: 'd', boss: false },
    ]);
    expect(s.account.bank.gold).toBe(gold + 20);
    expect(currentStep(s)?.id).toBe('flask');
    expect(evs.filter((e) => e.t === 'tutorialStep')).toHaveLength(1);
    // auto-used flasks don't count
    run(s, [{ t: 'flask', slot: 0, flaskId: 'life_small', auto: true }]);
    expect(currentStep(s)?.id).toBe('flask');
  });

  it('counts mined ore and finishes after the boss', () => {
    const s = newGame(1);
    s.tutorial.step = TUTORIAL_STEPS.findIndex((x) => x.id === 'mine');
    run(s, [{ t: 'produce', skill: 'mining', outputs: { copper_ore: 1 } }]);
    expect(s.tutorial.progress).toBe(1);
    run(s, [{ t: 'produce', skill: 'woodcutting', outputs: { ash_log: 1 } }]);
    expect(s.tutorial.progress).toBe(1);
    s.tutorial.step = TUTORIAL_STEPS.length - 1;
    run(s, [{ t: 'kill', name: 'Bloated Gorger', boss: true }]);
    expect(s.tutorial.done).toBe(true);
    expect(s.account.bank.regal).toBe(1);
  });

  it('life flask, then mana flask: each step wants its own kind', () => {
    const s = newGame(1);
    s.tutorial.step = TUTORIAL_STEPS.findIndex((x) => x.id === 'flask');
    run(s, [{ t: 'flask', slot: 1, flaskId: 'mana_small', auto: false }]);
    expect(currentStep(s)?.id).toBe('flask');
    run(s, [{ t: 'flask', slot: 0, flaskId: 'life_small', auto: false }]);
    expect(currentStep(s)?.id).toBe('mana_flask');
    run(s, [{ t: 'flask', slot: 0, flaskId: 'life_small', auto: false }]);
    expect(currentStep(s)?.id).toBe('mana_flask');
    run(s, [{ t: 'flask', slot: 1, flaskId: 'mana_small', auto: false }]);
    expect(currentStep(s)?.id).toBe('mine');
  });

  it('the tutorial gives enough to smith the cheapest item', () => {
    const mine = TUTORIAL_STEPS.find((x) => x.id === 'mine')!;
    const inputs = actionsFor('smithing')
      .filter((a) => !a.inputs!.rough_gem && a.level <= 1)
      .map((a) => a.inputs!);
    expect(inputs.some((i) => (i.copper_ore ?? 0) <= mine.target && (i.ash_log ?? 0) <= (mine.reward.ash_log ?? 0))).toBe(true);
  });

  it('saves mid-tutorial keep their step when the Mana Flask step is added', () => {
    const s = newGame(1);
    s.tutorial.step = 4; // the old Mine step
    const old = JSON.parse(serialize(s));
    old.version = 15;
    expect(currentStep(deserialize(JSON.stringify(old)))?.id).toBe('mine');
    old.tutorial.step = 3; // the flask step stays put
    expect(currentStep(deserialize(JSON.stringify(old)))?.id).toBe('flask');
  });

  it('can be skipped', () => {
    const s = newGame(1);
    skipTutorial(s);
    expect(currentStep(s)).toBeNull();
    expect(s.tutorial.skipped).toBe(true);
  });
});

describe('saves & accounts', () => {
  it('guest accounts persist their id', async () => {
    const storage = new MemoryStorage();
    const a = new LocalAccounts(storage);
    expect(a.current()).toBeNull();
    const acc = await a.signIn('guest');
    expect((await new LocalAccounts(storage).signIn('guest')).id).toBe(acc.id);
    await expect(a.signIn('google')).rejects.toThrow(/not set up/);
  });

  it('stores characters separately and lists them', async () => {
    const storage = new MemoryStorage();
    const store = new LocalSaveStore(storage, 'acc');
    const a = newGame(1, { name: 'Ann', classId: 'mage' });
    const b = newGame(2, { name: 'Bo', classId: 'ranger' });
    await store.save(a);
    await store.save(b);
    a.clock = 999;
    await store.save(a);
    const list = await store.list();
    expect(list.map((c) => c.name).sort()).toEqual(['Ann', 'Bo']);
    expect((await store.load(a.character.id))?.clock).toBe(999);
    await store.remove(b.character.id);
    expect(await store.list()).toHaveLength(1);
    expect(await store.load(b.character.id)).toBeNull();
  });

  it('imports the legacy single save as a character', async () => {
    const storage = new MemoryStorage();
    const old = newGame(1) as unknown as Record<string, unknown>;
    delete old.character;
    delete old.tutorial;
    old.version = 1;
    old.passives = ['str_1_0'];
    storage.setItem(SAVE_KEY, serialize(old as unknown as GameState));
    const store = new LocalSaveStore(storage, 'acc');
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Exile');
    const s = (await store.load('legacy'))!;
    expect(s.passives).toEqual([]);
    expect(s.tutorial.done).toBe(true);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });
});

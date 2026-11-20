import { describe, expect, it } from 'vitest';
import { CLASSES } from '../src/data/classes';
import { TUTORIAL_STEPS } from '../src/data/tutorial';
import { makeCtx } from '../src/engine/context';
import { equip } from '../src/engine/equipment';
import { setRule } from '../src/engine/gems';
import { pickUp } from '../src/engine/storage';
import { createItem } from '../src/engine/items';
import { allocate, allocateReason } from '../src/engine/passives';
import { seeded } from '../src/engine/rng';
import { deserialize, SAVE_KEY, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { currentStep, skipTutorial, tutorialCheck, tutorialPage, withTutorial } from '../src/engine/tutorial';
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
    expect(currentStep(s)?.id).toBe('use_skill');
    expect(evs.filter((e) => e.t === 'tutorialStep')).toHaveLength(1);
    // the Default Attack isn't a skill from the bar
    run(s, [{ t: 'skill', slot: -1, gemId: 'default', manual: false }]);
    expect(currentStep(s)?.id).toBe('use_skill');
    run(s, [{ t: 'skill', slot: 0, gemId: 'heavy_strike', manual: true }]);
    expect(currentStep(s)?.id).toBe('flask');
    // auto-used flasks don't count
    run(s, [{ t: 'flask', slot: 0, flaskId: 'life_small', auto: true }]);
    expect(currentStep(s)?.id).toBe('flask');
  });

  it('teaches combat only: no skilling, crafting or Hideout steps', () => {
    expect(TUTORIAL_STEPS.map((x) => x.id)).toEqual(['visit_combat', 'enter_zone', 'slay', 'use_skill', 'flask', 'mana_flask', 'automate', 'pickup', 'equip', 'passive', 'boss']);
    for (const step of TUTORIAL_STEPS) expect(step.visitPage ?? 'campaign').toBe('campaign');
  });

  it('finishes after the boss', () => {
    const s = newGame(1);
    s.tutorial.step = TUTORIAL_STEPS.length - 1;
    run(s, [{ t: 'kill', name: 'Bloated Gorger', boss: true }]);
    expect(s.tutorial.done).toBe(true);
    expect(s.account.bank.regal).toBe(1);
  });

  it('giving a skill a rule finishes the Automate step, paid', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.tutorial.step = TUTORIAL_STEPS.findIndex((x) => x.id === 'automate');
    const ctx = withTutorial(makeCtx(seeded(1)), () => s);
    const augs = s.account.bank.augment ?? 0;
    tutorialCheck(s, ctx);
    expect(currentStep(s)?.id).toBe('automate'); // every skill still waits for a click
    expect(setRule(s, 0, 0, { when: 'always' })).toBeNull();
    tutorialCheck(s, ctx);
    expect(currentStep(s)?.id).toBe('pickup');
    expect(s.account.bank.augment).toBe(augs + 2);
  });

  it('picking loot up off the ground finishes the Pick Up step', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.tutorial.step = TUTORIAL_STEPS.findIndex((x) => x.id === 'pickup');
    const ctx = withTutorial(makeCtx(seeded(1)), () => s);
    const boots = createItem(s, 'leather_boots', 1, 'normal', seeded(2));
    s.ground.push(boots);
    tutorialCheck(s, ctx);
    expect(currentStep(s)?.id).toBe('pickup'); // still on the ground
    expect(pickUp(s, ctx, 'ground', [boots.uid])).toBe(1);
    tutorialCheck(s, ctx);
    expect(currentStep(s)?.id).toBe('equip');
  });

  it('equipping anything found finishes the gear step', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.tutorial.step = TUTORIAL_STEPS.findIndex((x) => x.id === 'equip');
    const boots = createItem(s, 'leather_boots', 1, 'normal', seeded(2));
    s.inventory.push(boots);
    const gold = s.account.bank.gold ?? 0;
    equip(s, withTutorial(makeCtx(seeded(1)), () => s), boots.uid);
    expect(currentStep(s)?.id).toBe('passive');
    expect(s.account.bank.gold).toBe(gold + 50);
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
    expect(currentStep(s)?.id).toBe('automate');
  });

  it('saves mid-tutorial move to the combat step covering the same ground', () => {
    const old = JSON.parse(serialize(newGame(1)));
    old.version = 49;
    // the old order: 0 World Map, 1 Mud Flats, 2 Slay, 3 Life Flask, 4 Mana Flask, 5 Mine, 6 Smith, 7 Transmute,
    // 8 Equip, 9 Hideout, 10 Bench, 11 Salvage, 12 Passive, 13 Boss
    const expected = ['visit_combat', 'enter_zone', 'slay', 'flask', 'mana_flask', 'automate', 'automate', 'automate', 'equip', 'passive', 'passive', 'passive', 'passive', 'boss'];
    // (old Equip lands on Equip: those players already had a weapon in the bag)
    expected.forEach((id, oldStep) => {
      old.tutorial.step = oldStep;
      old.tutorial.progress = 7;
      const s = deserialize(JSON.stringify(old));
      expect(currentStep(s)?.id).toBe(id);
      if (oldStep >= 3) expect(s.tutorial.progress).toBe(0);
    });
    old.tutorial.step = 2;
    expect(deserialize(JSON.stringify(old)).tutorial.progress).toBe(7); // Slay keeps its kills
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

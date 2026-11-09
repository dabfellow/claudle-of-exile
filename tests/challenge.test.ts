import { describe, expect, it } from 'vitest';
import { STATIONS } from '../src/data/hideout';
import { ACTIONS } from '../src/data/skills';
import { HEIST_JOBS } from '../src/data/heist';
import { freshAccount } from '../src/engine/account';
import { CLASSIC_BLOCK, challengeName, classicCost, realmFor, soloRealm } from '../src/engine/challenge';
import { zoneDef } from '../src/data/zones';
import { makeMonster, startCombat } from '../src/engine/combat';
import type { Ctx } from '../src/engine/context';
import { jobBlocker } from '../src/engine/heist';
import { nextUpgradeCost, upgradeStation } from '../src/engine/hideout';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { startSkillAction } from '../src/engine/skills';
import { newGame, tick } from '../src/engine/state';
import { currentStep, tutorialPage } from '../src/engine/tutorial';
import { TUTORIAL_STEPS } from '../src/data/tutorial';
import type { ChallengeFlags, GameEvent, GameState } from '../src/engine/types';
import { LocalSaveStore, MemorySaveStore, moveCharacters, summarize } from '../src/platform/saves';

const ctxFor = (events: GameEvent[] = []): Ctx => ({ rng: seeded(1), now: 0, emit: (e) => events.push(e) });
const made = (challenge: ChallengeFlags, id = 'c1') => newGame(1, { id, name: 'Test', classId: 'warrior', challenge }, freshAccount(realmFor(challenge, id)));

/** Put a character in a fight it can't win. */
function losing(s: GameState, ctx: Ctx) {
  expect(startCombat(s, ctx, 'mudflats')).toBeNull();
  s.flaskSlots = s.flaskSlots.map(() => null);
  s.life = 1;
  s.settings.autoFlee = false;
  s.combat!.monsters = [makeMonster(zoneDef('mudflats').boss, true, 99)];
}

const fightOn = (s: GameState, ctx: Ctx) => {
  for (let i = 0; i < 2000 && s.combat; i++) tick(s, ctx, 50);
};

const memoryStorage = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => m.set(k, v), removeItem: (k: string) => m.delete(k) } as unknown as Storage;
};

describe('realms', () => {
  it('gives every mix of toggles the right home', () => {
    expect(realmFor({}, 'c1')).toBe('standard');
    expect(realmFor({ hardcore: true }, 'c1')).toBe('hardcore');
    expect(realmFor({ classic: true }, 'c1')).toBe('classic');
    expect(realmFor({ hardcore: true, classic: true }, 'c1')).toBe('hardcore-classic');
    for (const c of [{ ssf: true }, { ssf: true, hardcore: true }, { ssf: true, classic: true }, { ssf: true, hardcore: true, classic: true }]) {
      expect(soloRealm(realmFor(c, 'c1'))).toBe(true);
      expect(realmFor(c, 'c1')).not.toBe(realmFor(c, 'c2'));
    }
  });

  it('names a mix', () => {
    expect(challengeName({ hardcore: true, ssf: true, classic: true })).toBe('Hardcore SSF Classic');
    expect(challengeName({})).toBe('');
  });

  it('leaves a normal character looking as it always did', () => {
    expect(made({}).character.challenge).toBeUndefined();
    expect(summarize(made({})).realm).toBe('standard');
  });

  it('keeps each stash apart in storage', async () => {
    const store = new LocalSaveStore(memoryStorage(), 'realm-test', false);
    for (const realm of ['standard', 'hardcore', 'ssf-a', 'ssf-b']) {
      const a = freshAccount(realm);
      a.bank.gold = realm.length;
      await store.saveAccount(a);
    }
    expect((await store.loadAccount('ssf-a'))?.realm).toBe('ssf-a');
    expect((await store.loadAccount('hardcore'))?.bank.gold).toBe(8);
    expect((await store.loadAccount())?.realm).toBe('standard');
    await store.removeAccount('ssf-a');
    expect(await store.loadAccount('ssf-a')).toBeNull();
    expect(await store.loadAccount('ssf-b')).not.toBeNull();
  });

  it('moves every realm when characters change store, each into its own account', async () => {
    const from = new MemorySaveStore();
    const to = new MemorySaveStore();
    const hc = made({ hardcore: true }, 'hc');
    const solo = made({ ssf: true }, 'solo');
    await from.save(hc);
    await from.save(solo);
    await from.saveAccount(hc.account);
    await from.saveAccount(solo.account);
    expect(await moveCharacters(from, to, [])).toBe(2);
    expect((await to.loadAccount('hardcore'))?.bank.gold).toBe(hc.account.bank.gold);
    expect((await to.loadAccount(realmFor({ ssf: true }, 'solo')))?.bank.gold).toBe(solo.account.bank.gold);
    expect(await to.loadAccount()).toBeNull();
  });
});

describe('Hardcore', () => {
  it('ends the character on death, with no respawn', () => {
    const s = made({ hardcore: true });
    const events: GameEvent[] = [];
    const ctx = ctxFor(events);
    losing(s, ctx);
    fightOn(s, ctx);
    expect(s.fallen).toEqual({ zoneId: 'mudflats', offline: false });
    expect(s.combat).toBeNull();
    expect(s.action).toBeNull();
    expect(events.some((e) => e.t === 'death')).toBe(true);
    const clock = s.clock;
    tick(s, ctx, 1000);
    expect(s.clock).toBe(clock);
  });

  it('dies for good while offline too', () => {
    const s = made({ hardcore: true });
    const ctx = ctxFor();
    losing(s, ctx);
    const sum = simulateOffline(s, ctx, 3_600_000);
    expect(sum.died).toBe(true);
    expect(s.fallen?.offline).toBe(true);
  });

  it('leaves everyone else respawning as before', () => {
    const s = made({ ssf: true, classic: true });
    const ctx = ctxFor();
    losing(s, ctx);
    fightOn(s, ctx);
    expect(s.fallen).toBeUndefined();
    expect(s.lifetime.deaths).toBe(1);
  });
});

describe('Classic', () => {
  const classic = () => made({ classic: true });

  it('blocks every skill and heist, and nothing else', () => {
    const s = classic();
    for (const a of ACTIONS) expect(startSkillAction(s, ctxFor(), a.id)).toBe(CLASSIC_BLOCK);
    for (const j of HEIST_JOBS) expect(jobBlocker(s, j)).toBe(CLASSIC_BLOCK);
    expect(startCombat(s, ctxFor(), 'mudflats')).toBeNull();
    expect(startSkillAction(made({}), ctxFor(), 'mine_copper')).toBeNull();
  });

  it('pays gathered materials in gold, and can buy every station with no skilling', () => {
    expect(classicCost({ gold: 100, copper_ore: 10, arcane_dust: 5 })).toEqual({ gold: 200, arcane_dust: 5 });
    const s = classic();
    // endgame tiers also want boss drops (sigils, Divine Orbs), which Classic can't convert; the rest is gold
    for (const st of STATIONS) for (const l of st.levels.slice(0, 5)) expect(Object.keys(classicCost(l.cost)).every((id) => id === 'gold' || id === 'arcane_dust' || id === 'marrow_shard')).toBe(true);
    s.account.bank.gold = 1e7;
    s.account.bank.copper_ore = 0;
    s.account.bank.ash_log = 0;
    expect(nextUpgradeCost(s, 'bench')).toEqual({ gold: 4500 });
    expect(upgradeStation(s, ctxFor(), 'bench')).toBeNull();
    expect(s.account.hideout.bench).toBe(2);
  });

  it('skips the tutorial steps that need skilling and pays the bench step in gold', () => {
    const s = classic();
    const ctx = ctxFor();
    s.tutorial.step = TUTORIAL_STEPS.findIndex((t) => t.id === 'mine');
    tutorialPage(s, ctx, 'nowhere');
    expect(currentStep(s)?.id).toBe('transmute');
    s.tutorial.step = TUTORIAL_STEPS.findIndex((t) => t.id === 'hideout');
    const gold = s.account.bank.gold;
    tutorialPage(s, ctx, 'hideout');
    expect(s.account.bank.gold).toBe(gold + 4500);
    expect(s.account.bank.copper_ore ?? 0).toBe(0);
  });
});

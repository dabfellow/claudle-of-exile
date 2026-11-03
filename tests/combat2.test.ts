import { describe, expect, it } from 'vitest';
import { activeGemDef } from '../src/data/gems';
import { zoneDef } from '../src/data/zones';
import { aliveMonsters, chooseSkill, combatStep, DPS_WINDOW_MS, liveDps, makeMonster, queueSkill, ruleAllows, ruleContext, skillIsActive, startCombat } from '../src/engine/combat';
import { unlockEverything } from '../src/engine/automation';
import { makeCtx } from '../src/engine/context';
import {
  createSkillGem,
  createSupportGem,
  chainFalloff,
  gemAttrReq,
  gemChains,
  gemLevelReq,
  gemXpForLevel,
  MIN_COOLDOWN_MS,
  grantGemXp,
  placeOnBar,
  removeFromBar,
  skillNumbers,
  socketSupport,
  spellGrowth,
  supportReason,
  supportSlots,
} from '../src/engine/gems';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame, SAVE_VERSION, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';
import { veteran, armFor } from './helpers';

const ctx = (seed = 1) => makeCtx(seeded(seed));

/** A character in combat facing a hand-built pack, with the given skill bar. */
function arena(gems: string[], pack: MonsterInstance[], classId: 'warrior' | 'ranger' | 'mage' = 'warrior') {
  const s = newGame(1, { name: 'T', classId });
  s.skills.combat = charXpForLevel(20);
  s.skillBar = s.skillBar.map(() => null);
  unlockEverything(s);
  // gems start Manual only; these fights want each skill on its suggested rule
  gems.forEach((id, i) => (s.skillBar[i] = { ...createSkillGem(s, id), rules: [{ ...activeGemDef(id).defaultRule }] }));
  gems.forEach((id) => armFor(s, id));
  const c = ctx();
  startCombat(s, c, 'mudflats');
  s.combat!.monsters = pack;
  // a hand-built pack fights alone: no new waves walk in
  s.combat!.spawnMs = 1e12;
  s.life = deriveStats(s).maxLife;
  s.mana = deriveStats(s).maxMana;
  return { s, c };
}

const dummy = (life = 10_000, level = 5) => {
  const m = makeMonster({ ...zoneDef('mudflats').monsters[0], level }, false, Math.floor(Math.random() * 1e9));
  m.life = m.maxLife = life;
  m.attackMs = 1e9; // never attacks
  return m;
};

function run(s: GameState, c: ReturnType<typeof ctx>, ms: number) {
  for (let t = 0; t < ms && s.combat; t += 50) combatStep(s, c, 50, deriveStats(s));
}

describe('skill gems', () => {
  it('starter classes come with their skills on the bar', () => {
    expect(newGame(1, { name: 'a', classId: 'warrior' }).skillBar.map((g) => g?.gemId)).toEqual(['heavy_strike', 'ground_slam', 'iron_guard', undefined, undefined, undefined].map((x) => x ?? undefined));
    expect(newGame(1, { name: 'a', classId: 'mage' }).skillBar[0]?.gemId).toBe('frost_needle');
  });

  it('gem levels follow character level and unlock support sockets', () => {
    const s = newGame(1);
    const gem = s.skillBar[0]!;
    grantGemXp(s, ctx(), gemXpForLevel(10));
    // a level 1 character can't level a gem past level 1, and xp stops banking at the next level
    expect(gem.level).toBe(1);
    expect(gem.xp).toBe(gemXpForLevel(2));
    s.skills.combat = charXpForLevel(gemLevelReq('heavy_strike', 10));
    grantGemXp(s, ctx(), gemXpForLevel(10), { str: 999, dex: 999, int: 999 });
    expect(gem.level).toBe(10);
    expect(supportSlots(gem)).toBe(3);
  });

  it('skill gems need their attribute: they stop levelling short of it and stay off the bar', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    const strike = s.skillBar[0]!; // Heavy Strike, a Strength gem
    s.skills.combat = charXpForLevel(gemLevelReq('heavy_strike', 10));
    grantGemXp(s, ctx(), gemXpForLevel(10), { str: gemAttrReq('heavy_strike', 4), dex: 0, int: 0 });
    expect(strike.level).toBe(4);
    expect(gemAttrReq('heavy_strike', 1)).toBeLessThanOrEqual(8); // every class can use any level-1 gem
    veteran(s, 60); // past a level 10 Lacerate's level requirement, so only its Dexterity stops it
    const lacerate = createSkillGem(s, 'lacerate', 10);
    s.account.gems.push(lacerate);
    expect(placeOnBar(s, lacerate.uid, 3)).toMatch(/Requires \d+ Dexterity/);
    expect(s.skillBar[3]).toBeNull();
  });

  it('supports only fit matching skills, signatures only their own', () => {
    const s = veteran(newGame(1));
    const strike = s.skillBar[0]!;
    const guard = s.skillBar[1]!;
    expect(supportReason(strike, 'multistrike')).toBeNull();
    expect(supportReason(strike, 'spell_echo')).toMatch(/support/);
    expect(supportReason(strike, 'shattering_blow')).toBeNull();
    expect(supportReason(guard, 'shattering_blow')).toMatch(/Only fits Heavy Strike/);
    const sup = createSupportGem(s, 'multistrike');
    s.account.supportGems.push(sup);
    expect(socketSupport(s, strike.uid, sup.uid, 0)).toBeNull();
    expect(strike.supports[0]?.supportId).toBe('multistrike');
    expect(s.account.supportGems).toHaveLength(0);
  });

  it('supports raise mana cost and change numbers', () => {
    const s = veteran(newGame(1));
    const strike = s.skillBar[0]!;
    const d = deriveStats(s);
    const before = skillNumbers(d, strike);
    strike.supports[0] = createSupportGem(s, 'faster_attacks');
    const after = skillNumbers(d, strike);
    expect(after.manaCost).toBeGreaterThan(before.manaCost);
    expect(after.actionMs).toBeLessThan(before.actionMs);
  });

  it('bar slots can be filled, swapped and emptied', () => {
    const s = veteran(newGame(1));
    const extra = createSkillGem(s, 'war_cry');
    s.account.gems.push(extra);
    expect(placeOnBar(s, extra.uid, 2)).toBeNull();
    expect(s.skillBar[2]?.gemId).toBe('war_cry');
    placeOnBar(s, extra.uid, 0);
    expect(s.skillBar[0]?.gemId).toBe('war_cry');
    expect(s.skillBar[2]?.gemId).toBe('heavy_strike');
    removeFromBar(s, 0);
    expect(s.skillBar[0]).toBeNull();
    expect(s.account.gems.some((g) => g.gemId === 'war_cry')).toBe(true);
  });
});

describe('tactics', () => {
  it('new skill gems start Manual only', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    expect(createSkillGem(s, 'heavy_strike').rules).toEqual([{ when: 'manual' }]);
    expect(s.skillBar.filter(Boolean).every((g) => g!.rules[0].when === 'manual')).toBe(true);
  });


  it('rules read the fight', () => {
    const { s } = arena(['heavy_strike'], [dummy(), dummy(), dummy()]);
    const rc = ruleContext(s, deriveStats(s));
    expect(rc.enemies).toBe(3);
    expect(ruleAllows({ when: 'enemiesAtLeast', value: 3 }, rc, false)).toBe(true);
    expect(ruleAllows({ when: 'enemiesAtLeast', value: 4 }, rc, false)).toBe(false);
    expect(ruleAllows({ when: 'manual' }, rc, false)).toBe(false);
    expect(ruleAllows({ when: 'notActive' }, rc, true)).toBe(false);
  });

  it('slot order is priority; out-of-mana skills fall back to a default attack', () => {
    const { s } = arena(['ground_slam', 'heavy_strike'], [dummy(), dummy(), dummy()]);
    const d = deriveStats(s);
    expect(chooseSkill(s, d).nums.def.id).toBe('ground_slam');
    s.combat!.monsters = [dummy()];
    expect(chooseSkill(s, d).nums.def.id).toBe('heavy_strike');
    s.mana = 0;
    expect(chooseSkill(s, d).nums.def.id).toBe('default_attack');
  });

  it('manual casts jump the queue', () => {
    const { s } = arena(['heavy_strike', 'war_cry'], [dummy()]);
    s.skillBar[1]!.rules = [{ when: 'manual' }];
    const d = deriveStats(s);
    expect(chooseSkill(s, d).nums.def.id).toBe('heavy_strike');
    expect(queueSkill(s, 1)).toBeNull();
    expect(chooseSkill(s, d).nums.def.id).toBe('war_cry');
  });
});

describe('DPS meter', () => {
  const lost = (s: GameState) => s.combat!.monsters.reduce((a, m) => a + m.maxLife - m.life, 0);

  it('counts every monster hit, for skills as well as the default attack', () => {
    const { s, c } = arena(['ground_slam'], [dummy(), dummy(), dummy()]);
    run(s, c, DPS_WINDOW_MS);
    expect(lost(s)).toBeGreaterThan(0);
    expect(liveDps(s.combat!)).toBeCloseTo(lost(s) / 2);
  });

  it('keeps counting through kills', () => {
    const { s, c } = arena(['ground_slam'], Array.from({ length: 6 }, () => dummy(5)));
    s.settings.autoFlee = false;
    s.combat!.monsters.forEach((m) => (m.cell = 0));
    let dealt = 0;
    for (let i = 0; i < 5; i++) {
      run(s, c, DPS_WINDOW_MS);
      dealt += s.combat!.dealt[0];
    }
    const dead = 6 - aliveMonsters(s.combat!).length;
    expect(dead).toBeGreaterThan(0);
    expect(dealt).toBeGreaterThanOrEqual(5 * dead);
  });

  it('counts damage over time', () => {
    const { s, c } = arena([], [dummy()]);
    const mon = s.combat!.monsters[0];
    mon.cell = 0;
    mon.dots = [{ kind: 'poison', dps: 100, remainingMs: 2000, dealt: 0, gemId: 'default_attack' }];
    s.combat!.actionMs = 1e9;
    run(s, c, 2000);
    expect(s.combat!.dealt.reduce((a, n) => a + n, 0)).toBeCloseTo(200, 0);
  });

  it('holds a 2 second average until the next window ends', () => {
    const { s, c } = arena([], [dummy(1e9)]);
    s.combat!.dealt = [5000];
    s.combat!.actionMs = 1e9;
    run(s, c, 1000);
    expect(liveDps(s.combat!)).toBe(0);
    run(s, c, 1000);
    expect(liveDps(s.combat!)).toBe(2500);
    run(s, c, 1950);
    expect(liveDps(s.combat!)).toBe(2500);
    run(s, c, 50);
    expect(liveDps(s.combat!)).toBe(0);
    expect(s.combat!.dealt).toHaveLength(2);
  });

  it('starts from nothing for a fight saved before it', () => {
    const { s } = arena([], [dummy()]);
    const raw = JSON.parse(serialize(s));
    raw.version = 23;
    delete raw.combat.dealt;
    delete raw.combat.dealtMs;
    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.combat!.dealt).toEqual([0]);
    expect(loaded.combat!.dealtMs).toBe(0);
  });
});

describe('combat 2.0', () => {
  it('area skills hit the whole pack, single-target only the first', () => {
    const slam = arena(['ground_slam'], [dummy(), dummy(), dummy()]);
    slam.s.skillBar[0]!.rules = [{ when: 'always' }];
    run(slam.s, slam.c, 3000);
    expect(slam.s.combat!.monsters.every((m) => m.life < m.maxLife)).toBe(true);

    const strike = arena(['heavy_strike'], [dummy(), dummy(), dummy()]);
    run(strike.s, strike.c, 3000);
    const hurt = strike.s.combat!.monsters.filter((m) => m.life < m.maxLife);
    expect(hurt).toHaveLength(1);
  });

  it('spark chains to other enemies', () => {
    const { s, c } = arena(['spark'], [dummy(), dummy(), dummy()], 'mage');
    run(s, c, 2000);
    expect(s.combat!.monsters.every((m) => m.life < m.maxLife)).toBe(true);
  });

  it('Quick Slash stacks its buff to 5, then steps aside for the big blow', () => {
    const { s, c } = arena(['quick_slash', 'heavy_strike'], [dummy(1e7)]);
    s.combat!.monsters[0].cell = 0; // already in reach
    const stacks = () => s.combat!.buffs.find((b) => b.id === 'quick_slash')?.stacks ?? 0;
    s.combat!.actionMs = 0;
    run(s, c, 100);
    expect(stacks()).toBe(1);
    expect(skillIsActive(s.combat!, 'quick_slash')).toBe(false);
    run(s, c, 8000);
    expect(stacks()).toBe(5);
    expect(skillIsActive(s.combat!, 'quick_slash')).toBe(true);
    expect(c.events.some((e) => e.t === 'skill' && e.gemId === 'heavy_strike')).toBe(true);
  });

  it('Rending Cut leaves normal monsters alone by default, and on a boss stacks increased physical damage taken, up to 5', () => {
    const { s, c } = arena(['rending_cut'], [dummy(1e7)]);
    const mon = s.combat!.monsters[0];
    mon.cell = 0;
    s.combat!.actionMs = 0;
    run(s, c, 3000);
    expect(mon.rend).toBeUndefined();
    mon.isBoss = true;
    s.combat!.actionMs = 0;
    run(s, c, 100);
    expect(mon.rend?.stacks).toBe(1);
    run(s, c, 12_000);
    expect(mon.rend?.stacks).toBe(5);
    expect(mon.rend!.stacks * mon.rend!.pctPerStack).toBe(30);
    s.combat!.actionMs = 1e12; // stop cutting, and it wears off
    run(s, c, 7000);
    expect(mon.rend).toBeUndefined();
  });

  it('spells take the turn like attacks: Spark is cast, not fired on top of an attack', () => {
    const { s, c } = arena(['spark'], [dummy()], 'mage');
    s.combat!.actionMs = 0;
    s.combat!.monsters[0].cell = 0; // already in reach
    combatStep(s, c, 50, deriveStats(s));
    expect(s.combat!.using).toBe('spark');
    expect(s.combat!.actionMs).toBeGreaterThan(0);
  });

  it('spells grow 12% a gem level at first, tapering to 8% by level 20', () => {
    expect(spellGrowth(1)).toBe(1);
    expect(spellGrowth(2)).toBeCloseTo(1.12);
    expect(spellGrowth(20) - spellGrowth(19)).toBeCloseTo(0.08);
    expect(spellGrowth(20)).toBeCloseTo(2.9);
  });

  it('each chain hop deals 15% less than the last, never under 20% of the full hit', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 9].map(chainFalloff)).toEqual([1, 0.85, 0.7, 0.55, 0.4, 0.25, 0.2, 0.2]);
    // Spark at gem level 19 reaches 5 enemies, about 3.5 full hits between them
    expect([0, 1, 2, 3, 4].reduce((a, hop) => a + chainFalloff(hop), 0)).toBeCloseTo(3.5);
  });

  it('Spark chains further as the gem levels: 2, then 3 at 7, 4 at 13 and 5 at 19', () => {
    const spark = activeGemDef('spark');
    expect([1, 6, 7, 12, 13, 18, 19, 20].map((l) => gemChains(spark, l))).toEqual([2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('no cooldown ever goes below the 0.1 s minimum', () => {
    const { s } = arena(['shock_nova', 'heavy_strike'], [dummy()], 'mage');
    const d = deriveStats(s);
    d.raw.cooldownRecovery = 1e6;
    expect(skillNumbers(d, s.skillBar[0]).cooldownMs).toBe(MIN_COOLDOWN_MS);
    d.raw.cooldownRecovery = -100; // a zero or negative recovery speed must not make it 0 or negative either
    expect(skillNumbers(d, s.skillBar[0]).cooldownMs).toBeGreaterThanOrEqual(MIN_COOLDOWN_MS);
    d.raw.cooldownRecovery = 0;
    d.raw.overclock = 1;
    expect(skillNumbers(d, s.skillBar[0]).cooldownMs).toBe(MIN_COOLDOWN_MS);
    expect(skillNumbers(d, s.skillBar[1]).cooldownMs).toBe(MIN_COOLDOWN_MS);
  });

  it('big wind-up spells keep a cast time', () => {
    expect(activeGemDef('fireball').timeMs).toBeGreaterThan(0);
    expect(activeGemDef('glacial_lance').timeMs).toBeGreaterThan(0);
  });

  it('skills spend mana', () => {
    const { s, c } = arena(['heavy_strike'], [dummy()]);
    let spent = false;
    for (let t = 0; t < 4000 && !spent; t += 50) {
      const before = s.mana;
      const seen = c.events.length;
      combatStep(s, c, 50, deriveStats(s));
      if (c.events.slice(seen).some((e) => e.t === 'skill')) spent = s.mana < before;
    }
    expect(spent).toBe(true);
  });

  it('ailments deal damage over time', () => {
    const { s, c } = arena(['lacerate'], [dummy()], 'ranger');
    veteran(s); // Lacerate is a late gem
    s.skillBar[0]!.rules = [{ when: 'always' }];
    run(s, c, 1500);
    const mon = s.combat!.monsters[0];
    expect(mon.dots.some((x) => x.kind === 'bleed')).toBe(true);
    const lifeAfterHit = mon.life;
    s.skillBar[0] = null; // stop hitting, just let it bleed
    s.combat!.actionMs = 1e9;
    run(s, c, 1000);
    expect(mon.life).toBeLessThan(lifeAfterHit);
  });

  it('a guard blocks a boss slam, and without it the slam lands', () => {
    const boss = () => {
      const b = makeMonster(zoneDef('mudflats').boss, true, 99);
      b.life = b.maxLife = 1e6;
      b.attackMs = 1e9;
      b.timers.slam = 0;
      return b;
    };
    // run just past this boss's own wind-up
    const windUp = boss().casts.slam.ms + 400;
    const guarded = arena(['iron_guard'], [boss()]);
    run(guarded.s, guarded.c, windUp);
    expect(guarded.c.events.some((e) => e.t === 'hit' && e.target === 'player' && e.blocked)).toBe(true);

    const open = arena([], [boss()]);
    const life = open.s.life;
    run(open.s, open.c, windUp);
    expect(open.s.life).toBeLessThan(life);
  });

  it('energy shield takes hits before life and recharges after a pause', () => {
    const hitter = dummy(1e6, 20);
    hitter.attackMs = 300;
    const { s, c } = arena([], [hitter], 'mage');
    s.equipment.body = { uid: 9999, baseId: 'arcanist_robe', ilvl: 32, rarity: 'normal', name: null, prefixes: [], suffixes: [] };
    const d = deriveStats(s);
    expect(d.maxEs).toBeGreaterThan(115);
    s.life = d.maxLife;
    s.es = d.maxEs;
    run(s, c, 1500);
    const hits = c.events.filter((e) => e.t === 'hit' && e.target === 'player' && !e.evaded);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((e) => e.t === 'hit' && e.es)).toBe(true);
    expect(s.es).toBeLessThan(d.maxEs);

    // no more hits: nothing comes back during the delay, then it recharges
    const quiet = dummy();
    s.combat!.monsters = [quiet];
    s.es = 0;
    s.combat!.esDelayMs = 2000;
    run(s, c, 1500);
    expect(s.es).toBe(0);
    run(s, c, 1500);
    expect(s.es).toBeGreaterThan(0);
  });

  it('War Cry interrupts a wind-up', () => {
    const b = makeMonster(zoneDef('mudflats').boss, true, 99);
    b.life = b.maxLife = 1e6;
    b.attackMs = 1e9;
    b.timers.slam = 0;
    const { s, c } = arena(['war_cry'], [b]);
    run(s, c, 2600);
    expect(c.events.some((e) => e.t === 'interrupt')).toBe(true);
    expect(c.events.some((e) => e.t === 'hit' && e.target === 'player' && e.amount > 0)).toBe(false);
  });

  it('packs spawn in the zone size range and each kill counts', () => {
    const s = newGame(1);
    const c = ctx();
    startCombat(s, c, 'mudflats');
    tick(s, c, 1000);
    // the first wave can lose a member to the opening hit before we look
    const killed = s.zoneKills.mudflats ?? 0;
    const n = s.combat!.monsters.length;
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n + killed).toBeLessThanOrEqual(3);
    for (const m of s.combat!.monsters) m.life = 0;
    tick(s, c, 50);
    expect(s.zoneKills.mudflats).toBe(killed + n);
    expect(aliveMonsters(s.combat!)).toHaveLength(0);
  });

  it('bosses arrive with adds', () => {
    const s = newGame(1);
    const c = ctx();
    s.settings.autoBoss = true;
    s.zoneKills.mudflats = 99;
    startCombat(s, c, 'mudflats');
    tick(s, c, 1000);
    expect(s.combat!.monsters.filter((m) => m.isBoss)).toHaveLength(1);
    expect(s.combat!.monsters.length).toBe(3);
  });

  it('v3 saves get starter gems and drop out of fights', () => {
    const old = newGame(1, { name: 'Old', classId: 'mage' }) as unknown as Record<string, unknown>;
    delete old.skillBar;
    delete old.gems;
    delete old.supportGems;
    old.version = 3;
    old.action = { kind: 'combat', zoneId: 'mudflats' };
    old.combat = { zoneId: 'mudflats', monster: null };
    const s = deserialize(JSON.stringify(old));
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.skillBar[0]?.gemId).toBe('frost_needle');
    expect(s.combat).toBeNull();
    expect(s.action).toBeNull();
  });
});

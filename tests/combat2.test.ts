import { describe, expect, it } from 'vitest';
import { activeGemDef } from '../src/data/gems';
import { zoneDef } from '../src/data/zones';
import { aliveMonsters, chooseSkill, combatStep, makeMonster, queueSkill, ruleAllows, ruleContext, startCombat } from '../src/engine/combat';
import { unlockEverything } from '../src/engine/automation';
import { makeCtx } from '../src/engine/context';
import {
  createSkillGem,
  createSupportGem,
  gemAttrReq,
  gemLevelReq,
  gemXpForLevel,
  MIN_COOLDOWN_MS,
  grantGemXp,
  placeOnBar,
  removeFromBar,
  skillNumbers,
  socketSupport,
  supportReason,
  supportSlots,
} from '../src/engine/gems';
import { seeded } from '../src/engine/rng';
import { deserialize } from '../src/engine/save';
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
    expect(newGame(1, { name: 'a', classId: 'warrior' }).skillBar.map((g) => g?.gemId)).toEqual(['heavy_strike', 'iron_guard', undefined, undefined, undefined, undefined].map((x) => x ?? undefined));
    expect(newGame(1, { name: 'a', classId: 'mage' }).skillBar[0]?.gemId).toBe('spark');
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
    s.gems.push(lacerate);
    expect(placeOnBar(s, lacerate.uid, 2)).toMatch(/Requires \d+ Dexterity/);
    expect(s.skillBar[2]).toBeNull();
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
    s.supportGems.push(sup);
    expect(socketSupport(s, strike.uid, sup.uid, 0)).toBeNull();
    expect(strike.supports[0]?.supportId).toBe('multistrike');
    expect(s.supportGems).toHaveLength(0);
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
    s.gems.push(extra);
    expect(placeOnBar(s, extra.uid, 2)).toBeNull();
    expect(s.skillBar[2]?.gemId).toBe('war_cry');
    placeOnBar(s, extra.uid, 0);
    expect(s.skillBar[0]?.gemId).toBe('war_cry');
    expect(s.skillBar[2]?.gemId).toBe('heavy_strike');
    removeFromBar(s, 0);
    expect(s.skillBar[0]).toBeNull();
    expect(s.gems.some((g) => g.gemId === 'war_cry')).toBe(true);
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

  it('instant spells fire without using the turn: Spark, then straight into an attack', () => {
    const { s, c } = arena(['spark'], [dummy()], 'mage');
    expect(activeGemDef('spark').timeMs).toBe(0);
    s.combat!.actionMs = 0;
    s.combat!.monsters[0].cell = 0; // already in reach
    combatStep(s, c, 50, deriveStats(s));
    expect(s.combat!.cooldowns[0]).toBeGreaterThan(0);
    expect(s.combat!.using).toBe('default_attack');
    expect(s.combat!.actionMs).toBeGreaterThan(0);
  });

  it('no cooldown ever goes below the 0.1 s minimum', () => {
    const { s } = arena(['spark', 'heavy_strike'], [dummy()], 'mage');
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
    expect(s.skillBar[0]?.gemId).toBe('spark');
    expect(s.combat).toBeNull();
    expect(s.action).toBeNull();
  });
});

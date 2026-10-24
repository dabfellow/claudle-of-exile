import { describe, expect, it } from 'vitest';
import { zoneDef } from '../src/data/zones';
import { aliveMonsters, chooseSkill, combatStep, makeMonster, queueSkill, ruleAllows, ruleContext, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import {
  createSkillGem,
  createSupportGem,
  gemLevelReq,
  gemXpForLevel,
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

const ctx = (seed = 1) => makeCtx(seeded(seed));

/** A character in combat facing a hand-built pack, with the given skill bar. */
function arena(gems: string[], pack: MonsterInstance[], classId: 'warrior' | 'ranger' | 'mage' = 'warrior') {
  const s = newGame(1, { name: 'T', classId });
  s.skills.combat = charXpForLevel(20);
  s.skillBar = s.skillBar.map(() => null);
  gems.forEach((id, i) => (s.skillBar[i] = createSkillGem(s, id)));
  const c = ctx();
  startCombat(s, c, 'mudflats');
  s.combat!.monsters = pack;
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
    s.skills.combat = charXpForLevel(gemLevelReq(10));
    grantGemXp(s, ctx(), gemXpForLevel(10));
    expect(gem.level).toBe(10);
    expect(supportSlots(gem)).toBe(3);
  });

  it('supports only fit matching skills, signatures only their own', () => {
    const s = newGame(1);
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
    const s = newGame(1);
    const strike = s.skillBar[0]!;
    const d = deriveStats(s);
    const before = skillNumbers(d, strike);
    strike.supports[0] = createSupportGem(s, 'faster_attacks');
    const after = skillNumbers(d, strike);
    expect(after.manaCost).toBeGreaterThan(before.manaCost);
    expect(after.actionMs).toBeLessThan(before.actionMs);
  });

  it('bar slots can be filled, swapped and emptied', () => {
    const s = newGame(1);
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
    s.skillBar[1]!.rule = { when: 'manual' };
    const d = deriveStats(s);
    expect(chooseSkill(s, d).nums.def.id).toBe('heavy_strike');
    expect(queueSkill(s, 1)).toBeNull();
    expect(chooseSkill(s, d).nums.def.id).toBe('war_cry');
  });
});

describe('combat 2.0', () => {
  it('area skills hit the whole pack, single-target only the first', () => {
    const slam = arena(['ground_slam'], [dummy(), dummy(), dummy()]);
    slam.s.skillBar[0]!.rule = { when: 'always' };
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
    s.skillBar[0]!.rule = { when: 'always' };
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
    const n = s.combat!.monsters.length;
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(3);
    for (const m of s.combat!.monsters) m.life = 0;
    tick(s, c, 50);
    expect(s.zoneKills.mudflats).toBe(n);
    expect(aliveMonsters(s.combat!)).toHaveLength(0);
  });

  it('bosses arrive with adds', () => {
    const s = newGame(1);
    const c = ctx();
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

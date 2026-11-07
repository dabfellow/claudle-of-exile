import { describe, expect, it } from 'vitest';
import { activeGemDef, gemAct, gemAttrMult, gemReqLevel, SUPPORT_GEMS, supportGemDef } from '../src/data/gems';
import { ZONES, zoneDef } from '../src/data/zones';
import { unlockEverything } from '../src/engine/automation';
import { army, combatStep, makeMonster, startCombat, TRIGGER_COOLDOWN_MS } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, createSupportGem, supportFits } from '../src/engine/gems';
import { gemArrived } from '../src/engine/progress';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { armFor, trainingDummy, veteran } from './helpers';

const BATCH = ['worldbreaker', 'last_legion', 'death_warrant', 'gale_of_knives', 'royal_decree', 'eye_of_the_storm'];
const SUPPORTS = ['reprisal', 'succession', 'imperial_reach', 'goaded', 'eternal_ward', 'funeral_rites', 'crowned_storm'];

type Rule = 'always' | 'manual';

interface Opts {
  supports?: string[];
  pack?: number;
  rule?: Rule;
  classId?: 'warrior' | 'mage';
  extra?: { gem: string; rule?: Rule; supports?: string[] }[];
}

/** One skill on the bar against dummies that stand still and never attack unless told to. */
function arena(gem: string, opts: Opts = {}) {
  const s = veteran(newGame(1, { name: 't', classId: opts.classId ?? 'warrior' }), 70);
  s.skillBar = s.skillBar.map(() => null);
  const g = createSkillGem(s, gem);
  g.rules = [{ when: opts.rule ?? 'always' }];
  g.extraSlots = 1;
  g.supports = (opts.supports ?? []).map((id) => createSupportGem(s, id));
  s.skillBar[0] = g;
  (opts.extra ?? []).forEach((x, i) => {
    const e = createSkillGem(s, x.gem);
    e.rules = [{ when: x.rule ?? 'manual' }];
    e.supports = (x.supports ?? []).map((id) => createSupportGem(s, id));
    s.skillBar[i + 1] = e;
  });
  armFor(s, gem);
  unlockEverything(s);
  s.unlockedZones = ['mudflats', 'cinderroad'];
  s.settings.autoFlee = false;
  const ctx = makeCtx(seeded(7));
  startCombat(s, ctx, 'cinderroad');
  const monsters: MonsterInstance[] = [];
  for (let i = 0; i < (opts.pack ?? 1); i++) {
    const m = trainingDummy(makeMonster(zoneDef('cinderroad').monsters[0], false, i + 1));
    m.life = m.maxLife = 1e7;
    m.attackMs = 1e9;
    m.cell = i;
    monsters.push(m);
  }
  s.combat!.monsters = monsters;
  s.combat!.spawnMs = 1e12;
  const d = deriveStats(s);
  s.life = d.maxLife;
  s.mana = d.maxMana;
  return { s, ctx, dummy: monsters[0], monsters, d };
}

function run(s: GameState, ctx: ReturnType<typeof makeCtx>, ms: number, until?: () => boolean) {
  for (let t = 0; t < ms && s.combat && !until?.(); t += 50) combatStep(s, ctx, 50, deriveStats(s));
}

const uses = (ctx: ReturnType<typeof makeCtx>, gemId: string) => ctx.events.filter((e) => e.t === 'skill' && e.gemId === gemId).length;
const lost = (m: MonsterInstance) => m.maxLife - m.life;
/** Make a dummy swing at you every so often, hard enough to notice. */
const swing = (m: MonsterInstance, ms = 500, damage = 200) => {
  m.attackMs = ms;
  m.damage = damage;
};
/** Stop the first skill firing again, once it's done what the test wanted. */
const hold = (s: GameState) => {
  s.skillBar[0]!.rules = [{ when: 'manual' }];
};

describe('the last empire batch', () => {
  it('arrives with Act 6, in its level range, and its signatures with it', () => {
    for (const id of [...BATCH, ...SUPPORTS]) {
      expect(gemAct(id), id).toBe(6);
      expect(gemReqLevel(id), id).toBeGreaterThanOrEqual(58);
      expect(gemReqLevel(id), id).toBeLessThanOrEqual(65);
    }
    for (const id of BATCH) expect(gemAct(SUPPORT_GEMS.find((x) => x.signatureFor === id)!.id), id).toBe(6);
  });

  it('is two skills per attribute, each asking a committed build, each with a signature that fits only it', () => {
    for (const attr of ['str', 'dex', 'int']) expect(BATCH.filter((id) => activeGemDef(id).attr === attr), attr).toHaveLength(2);
    for (const id of BATCH) {
      expect(gemAttrMult(id), id).toBeGreaterThan(1);
      const sigs = SUPPORT_GEMS.filter((x) => x.signatureFor === id);
      expect(sigs, id).toHaveLength(1);
      expect(supportFits(sigs[0], activeGemDef(id))).toBe(true);
      expect(supportFits(sigs[0], activeGemDef('heavy_strike'))).toBe(false);
    }
  });

  it('nothing here can turn up before Act 6, even at a high level', () => {
    const s = veteran(newGame(1), 70);
    s.unlockedZones = ['mudflats', 'cinderroad'];
    for (const id of [...BATCH, ...SUPPORTS]) expect(gemArrived(s, id), id).toBe(false);
    const act6 = { ...ZONES[0], id: 'test_act6', act: 6 };
    ZONES.push(act6);
    s.unlockedZones = [...s.unlockedZones, act6.id];
    for (const id of [...BATCH, ...SUPPORTS]) expect(gemArrived(s, id), id).toBe(true);
    ZONES.pop();
  });

  it('supports fit the tags they say', () => {
    const fits = (sup: string, gem: string) => supportFits(supportGemDef(sup), activeGemDef(gem));
    expect(fits('goaded', 'worldbreaker')).toBe(true);
    expect(fits('goaded', 'pummel')).toBe(false);
    expect(fits('eternal_ward', 'eye_of_the_storm')).toBe(true);
    expect(fits('eternal_ward', 'frost_ward')).toBe(true);
    expect(fits('funeral_rites', 'last_legion')).toBe(true);
    expect(fits('crowned_storm', 'thunderhead')).toBe(true);
    for (const sup of ['reprisal', 'succession']) {
      expect(fits(sup, 'spark')).toBe(true);
      for (const gem of ['worldbreaker', 'last_legion', 'gale_of_knives']) expect(fits(sup, gem), `${sup} ${gem}`).toBe(false);
    }
    expect(fits('imperial_reach', 'heavy_strike')).toBe(true);
    expect(fits('imperial_reach', 'thunderhead')).toBe(false);
    expect(fits('stormfront', 'eye_of_the_storm')).toBe(false);
  });
});

describe('Worldbreaker', () => {
  it('adds the damage taken during the wind-up to the blow', () => {
    const calm = arena('worldbreaker');
    run(calm.s, calm.ctx, 12000, () => lost(calm.dummy) > 0);
    const angry = arena('worldbreaker', { pack: 2 });
    swing(angry.monsters[1], 300, 400);
    angry.s.combat!.shield = angry.s.combat!.shieldMax = 1e6;
    run(angry.s, angry.ctx, 12000, () => lost(angry.dummy) > 0);
    expect(lost(calm.dummy)).toBeGreaterThan(0);
    expect(lost(angry.dummy)).toBeGreaterThan(lost(calm.dummy) * 1.2);
  });

  it('counts what a shield soaks, and hits everything within 2 rings', () => {
    const a = arena('worldbreaker', { pack: 3 });
    swing(a.monsters[1], 300, 400);
    a.s.combat!.shield = a.s.combat!.shieldMax = 1e6;
    run(a.s, a.ctx, 2000);
    expect(a.s.combat!.windup?.stored ?? 0).toBeGreaterThan(0);
    run(a.s, a.ctx, 12000, () => lost(a.monsters[2]) > 0);
    expect(lost(a.monsters[0])).toBeGreaterThan(0);
    expect(lost(a.monsters[2])).toBeGreaterThan(0);
  });

  it('Unmoved takes less from each hit but stores it all', () => {
    const plain = arena('worldbreaker');
    const braced = arena('worldbreaker', { supports: ['unmoved'] });
    for (const a of [plain, braced]) {
      swing(a.dummy, 300, 40);
      run(a.s, a.ctx, 1000);
    }
    expect(braced.s.life).toBeGreaterThan(plain.s.life);
    expect(braced.s.combat!.windup!.stored).toBeGreaterThanOrEqual(plain.s.combat!.windup!.stored! * 0.9);
  });

  it('Goaded lands the blow sooner the more you are hit', () => {
    const timeToLand = (supports: string[]) => {
      const a = arena('worldbreaker', { supports });
      swing(a.dummy, 300, 50);
      let t = 0;
      while (!lost(a.dummy) && t < 20000) {
        combatStep(a.s, a.ctx, 50, deriveStats(a.s));
        t += 50;
      }
      return t;
    };
    expect(timeToLand(['goaded'])).toBeLessThan(timeToLand([]) * 0.75);
  });
});

describe('The Last Legion', () => {
  it('a legionary takes a share of each hit that lands on you', () => {
    const a = arena('last_legion');
    run(a.s, a.ctx, 4000, () => army(a.s.combat!).length >= 4);
    expect(army(a.s.combat!)).toHaveLength(4);
    const before = army(a.s.combat!).reduce((n, x) => n + x.life, 0);
    swing(a.dummy, 100, 1000);
    const life = a.s.life;
    run(a.s, a.ctx, 500, () => a.s.life < life);
    expect(a.s.life).toBeLessThan(life);
    expect(army(a.s.combat!).reduce((n, x) => n + x.life, 0)).toBeLessThan(before);
  });

  it('Dying Oath leaves a shield, and Funeral Rites a last strike, when one falls', () => {
    const a = arena('last_legion', { supports: ['dying_oath', 'funeral_rites'] });
    run(a.s, a.ctx, 4000, () => army(a.s.combat!).length >= 4);
    hold(a.s);
    const c = a.s.combat!;
    c.shield = c.shieldMax = 0;
    const x = army(c)[0];
    x.attackMs = 1e9;
    for (const y of army(c)) y.attackMs = 1e9;
    x.cell = a.dummy.cell === 1 ? 0 : 1;
    const hurt = lost(a.dummy);
    x.life = 0;
    run(a.s, a.ctx, 50);
    expect(c.shield).toBeGreaterThan(0);
    expect(army(c)).toHaveLength(3);
    expect(lost(a.dummy)).toBeGreaterThan(hurt);
  });
});

describe('Death Warrant', () => {
  it('half of what the target took lands again when the curse ends', () => {
    const a = arena('death_warrant');
    run(a.s, a.ctx, 500, () => !!a.dummy.curse);
    hold(a.s);
    a.dummy.curse!.warrant = 50;
    a.dummy.curse!.owed = 1000;
    a.dummy.curse!.remainingMs = 40;
    const before = a.dummy.life;
    run(a.s, a.ctx, 100, () => !a.dummy.curse);
    expect(a.dummy.curse).toBeUndefined();
    expect(before - a.dummy.life).toBe(500);
  });

  it('counts damage from anything, ailments included', () => {
    const a = arena('death_warrant');
    run(a.s, a.ctx, 500, () => !!a.dummy.curse);
    hold(a.s);
    a.dummy.dots.push({ kind: 'bleed', dps: 1000, remainingMs: 2000, durationMs: 2000, dealt: 0, gemId: 'gash' });
    run(a.s, a.ctx, 1000);
    expect(a.dummy.curse!.owed).toBeGreaterThan(500);
  });

  it('a debt falls on the nearest enemy if the debtor dies, and Collective Guilt spreads it', () => {
    const a = arena('death_warrant', { pack: 4, supports: ['collective_guilt'] });
    run(a.s, a.ctx, 500, () => a.monsters.some((m) => m.curse));
    hold(a.s);
    const debtor = a.monsters.find((m) => m.curse)!;
    debtor.curse!.owed = 10000;
    debtor.life = 0;
    run(a.s, a.ctx, 100);
    const paid = a.monsters.filter((m) => m !== debtor && lost(m) > 0);
    expect(paid.length).toBeGreaterThanOrEqual(2);
  });

  it('recasting collects the debt first', () => {
    const a = arena('death_warrant');
    run(a.s, a.ctx, 500, () => !!a.dummy.curse);
    a.dummy.curse!.warrant = 50;
    a.dummy.curse!.owed = 2000;
    a.dummy.curse!.remainingMs = 1e6;
    const before = a.dummy.life;
    a.s.combat!.cooldowns[0] = 0;
    a.s.combat!.actionMs = 0;
    run(a.s, a.ctx, 500, () => a.dummy.life < before);
    expect(before - a.dummy.life).toBeGreaterThanOrEqual(1000);
  });
});

describe('Gale of Knives', () => {
  it('stays around you and strikes on every attack as well as on its timer', () => {
    const a = arena('gale_of_knives', { extra: [{ gem: 'twin_strike', rule: 'always' }] });
    run(a.s, a.ctx, 2000, () => !!a.s.combat!.storms?.length);
    const st = a.s.combat!.storms![0];
    expect(st.cells).toContain(a.dummy.cell);
    st.pulseMs = 1e9;
    hold(a.s);
    const hits = () => a.ctx.events.filter((e) => e.t === 'hit' && e.target === 'monster').length;
    const before = hits();
    const swings = uses(a.ctx, 'twin_strike');
    run(a.s, a.ctx, 6000, () => uses(a.ctx, 'twin_strike') > swings);
    // two strikes of the skill, plus the storm answering
    expect(hits() - before).toBeGreaterThanOrEqual(1);
    expect(uses(a.ctx, 'twin_strike')).toBeGreaterThan(swings);
  });

  it('Reaping Wind keeps it going on a kill', () => {
    const a = arena('gale_of_knives', { supports: ['reaping_wind'], pack: 2 });
    run(a.s, a.ctx, 2000, () => !!a.s.combat!.storms?.length);
    const st = a.s.combat!.storms![0];
    a.monsters[1].life = 1;
    st.pulseMs = 0;
    const left = st.remainingMs;
    combatStep(a.s, a.ctx, 50, deriveStats(a.s));
    expect(st.remainingMs).toBeGreaterThan(left + 500);
  });
});

describe('Royal Decree', () => {
  const opts = { classId: 'mage' as const, extra: [{ gem: 'spark' }, { gem: 'meteor' }, { gem: 'arcane_surge' }] };

  it('fires the ready damage spells on the bar for free, heavy ones with no wind-up, and starts their cooldowns', () => {
    const a = arena('royal_decree', opts);
    const c = a.s.combat!;
    run(a.s, a.ctx, 400, () => uses(a.ctx, 'royal_decree') > 0);
    expect(uses(a.ctx, 'royal_decree')).toBe(1);
    expect(uses(a.ctx, 'spark')).toBe(1);
    expect(uses(a.ctx, 'meteor')).toBe(1);
    expect(uses(a.ctx, 'arcane_surge')).toBe(0);
    expect(c.cooldowns[1]).toBeGreaterThan(0);
    expect(c.cooldowns[2]).toBeGreaterThan(0);
    expect(c.windup).toBeUndefined();
    expect(c.decreeMult).toBeUndefined();
  });

  it('leaves spells on cooldown alone, unless Absolute Power says otherwise', () => {
    for (const [supports, expected] of [[[], 0], [['absolute_power'], 1]] as const) {
      const a = arena('royal_decree', { ...opts, supports: [...supports] });
      a.s.combat!.cooldowns[1] = 1e6;
      run(a.s, a.ctx, 400, () => uses(a.ctx, 'royal_decree') > 0);
      expect(uses(a.ctx, 'spark')).toBe(expected);
    }
  });
});

describe('Eye of the Storm', () => {
  it('raises a shield and a storm, and the storm ends with the shield', () => {
    const a = arena('eye_of_the_storm', { classId: 'mage' });
    run(a.s, a.ctx, 200, () => !!a.s.combat!.storms?.length);
    const c = a.s.combat!;
    expect(c.shield).toBeGreaterThan(0);
    expect(c.storms).toHaveLength(1);
    hold(a.s);
    run(a.s, a.ctx, 500);
    expect(lost(a.dummy)).toBeGreaterThan(0);
    c.shield = 0;
    run(a.s, a.ctx, 100);
    expect(c.storms).toHaveLength(0);
  });

  it('strikes harder the more shield is left', () => {
    const strike = (shield: number) => {
      const a = arena('eye_of_the_storm', { classId: 'mage' });
      run(a.s, a.ctx, 200, () => !!a.s.combat!.storms?.length);
      hold(a.s);
      a.s.combat!.shield = a.s.combat!.shieldMax = shield;
      const was = lost(a.dummy);
      run(a.s, a.ctx, 3000);
      return lost(a.dummy) - was;
    };
    expect(strike(100000)).toBeGreaterThan(strike(1) * 2);
  });

  it('Eyewall gives shield back on a strike', () => {
    const a = arena('eye_of_the_storm', { classId: 'mage', supports: ['eyewall'] });
    run(a.s, a.ctx, 200, () => !!a.s.combat!.storms?.length);
    hold(a.s);
    const c = a.s.combat!;
    c.shield = c.shieldMax * 0.5;
    const was = c.shield;
    run(a.s, a.ctx, 1500);
    expect(c.shield).toBeGreaterThan(was);
  });
});

describe('rule-bending supports', () => {
  it('Reprisal ignores the rules and fires when a hit lands, at most once a second', () => {
    const a = arena('heavy_strike', { supports: ['reprisal'] });
    run(a.s, a.ctx, 500);
    expect(uses(a.ctx, 'heavy_strike')).toBe(0);
    swing(a.dummy, 100, 10);
    run(a.s, a.ctx, 2500);
    const n = uses(a.ctx, 'heavy_strike');
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThanOrEqual(1 + Math.ceil(2500 / TRIGGER_COOLDOWN_MS));
  });

  it('Succession fires on a kill, and not otherwise', () => {
    const a = arena('spark', { classId: 'mage', supports: ['succession'], pack: 3 });
    run(a.s, a.ctx, 500);
    expect(uses(a.ctx, 'spark')).toBe(0);
    a.monsters[2].life = 0;
    run(a.s, a.ctx, 100, () => uses(a.ctx, 'spark') > 0);
    expect(uses(a.ctx, 'spark')).toBe(1);
  });

  it('a trigger leaves a wind-up alone', () => {
    const a = arena('titans_blow', { extra: [{ gem: 'heavy_strike', supports: ['reprisal'] }] });
    swing(a.dummy, 200, 10);
    run(a.s, a.ctx, 1000);
    expect(uses(a.ctx, 'heavy_strike')).toBeGreaterThan(0);
    expect(a.s.combat!.windup).toBeDefined();
    expect(a.s.combat!.using).toBe('titans_blow');
  });

  it('Imperial Reach hits the whole field', () => {
    const a = arena('frost_needle', { classId: 'mage', pack: 6, supports: ['imperial_reach'] });
    a.monsters[5].cell = 12;
    run(a.s, a.ctx, 600, () => a.monsters.every((m) => lost(m) > 0));
    expect(a.monsters.every((m) => lost(m) > 0)).toBe(true);
  });

  it('Eternal Ward keeps the shield past its timer, and an ordinary shield still ends', () => {
    const lasting = arena('bulwark', { supports: ['eternal_ward'] });
    const plain = arena('bulwark');
    for (const a of [lasting, plain]) {
      run(a.s, a.ctx, 2000, () => a.s.combat!.shield > 0);
      hold(a.s);
      run(a.s, a.ctx, 8000);
    }
    expect(lasting.s.combat!.shield).toBeGreaterThan(0);
    expect(plain.s.combat!.shield).toBe(0);
  });

  it('Crowned Storm brings a storm around you, whatever it landed on', () => {
    const a = arena('thunderhead', { classId: 'mage', supports: ['crowned_storm'] });
    a.dummy.cell = 12;
    run(a.s, a.ctx, 500, () => !!a.s.combat!.storms?.length);
    const cells = a.s.combat!.storms![0].cells;
    expect(cells).toContain(0);
    expect(cells).toContain(1);
    expect(cells).not.toContain(12);
  });
});

describe('saves', () => {
  it('a blow being stored comes through a save', () => {
    const a = arena('worldbreaker');
    swing(a.dummy, 300, 100);
    run(a.s, a.ctx, 1500);
    expect(a.s.combat!.windup?.stored).toBeGreaterThan(0);
    const back = deserialize(serialize(a.s));
    expect(back.combat?.windup?.stored).toBe(a.s.combat!.windup!.stored);
  });
});

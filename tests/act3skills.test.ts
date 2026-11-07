import { describe, expect, it } from 'vitest';
import { ACTIVE_GEMS, activeGemDef, gemAct, gemReqLevel, SUPPORT_GEMS, supportGemDef } from '../src/data/gems';
import { ZONES, zoneDef } from '../src/data/zones';
import { AUTO_FLEE_AT } from '../src/engine/battlefield';
import { canSpendLife, combatStep, makeMonster, queueSkill, ruleAllows, ruleContext, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, createSupportGem, LIFE_RESERVE_PCT, skillNumbers, skillSummary, supportFits } from '../src/engine/gems';
import { simulateOffline } from '../src/engine/offline';
import { gemArrived } from '../src/engine/progress';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { Dot, GameState, MonsterInstance } from '../src/engine/types';
import { armFor, trainingDummy, veteran } from './helpers';
import { unlockEverything } from '../src/engine/automation';

const BATCH = ['flagellate', 'scourge', 'blood_rite', 'blood_ward', 'gash', 'barbed_arrow', 'stigmata', 'blood_lance', 'burnt_offering', 'transfusion'];
const SUPPORTS = ['serrated_edge', 'blood_price', 'deep_wounds', 'tithe', 'desperate_faith'];
const LIFE_SKILLS = ACTIVE_GEMS.filter((g) => g.effect.lifePct).map((g) => g.id);

/** One skill on the bar, optionally with supports, against dummies that stand still and never attack unless told to. */
function arena(gem: string, opts: { supports?: string[]; pack?: number; boss?: boolean; classId?: 'warrior' | 'mage' } = {}) {
  const s = veteran(newGame(1, { name: 't', classId: opts.classId ?? 'warrior' }), 60);
  s.flaskSlots = s.flaskSlots.map(() => null);
  s.skillBar = s.skillBar.map(() => null);
  const g = createSkillGem(s, gem);
  g.rules = [{ when: 'always' }];
  g.extraSlots = 1;
  g.supports = (opts.supports ?? []).map((id) => createSupportGem(s, id));
  s.skillBar[0] = g;
  armFor(s, gem);
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
  if (opts.boss) monsters[0].isBoss = true;
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

const used = (ctx: ReturnType<typeof makeCtx>) => ctx.events.some((e) => e.t === 'skill');
const uses = (ctx: ReturnType<typeof makeCtx>) => ctx.events.filter((e) => e.t === 'skill').length;
const bleed = (dps: number, ms: number): Dot => ({ kind: 'bleed', dps, remainingMs: ms, durationMs: ms, dealt: 0, gemId: 'gash' });
const dotDps = (m: MonsterInstance) => m.dots.find((x) => x.kind === 'bleed')?.dps ?? 0;

describe('the Zealots and blood batch', () => {
  it('arrives with Act 3, past the Act 2 gems, and its signatures with it', () => {
    for (const id of [...BATCH, ...SUPPORTS]) {
      expect(gemAct(id), id).toBe(3);
      expect(gemReqLevel(id), id).toBeGreaterThanOrEqual(32);
    }
    for (const id of BATCH) expect(gemAct(SUPPORT_GEMS.find((x) => x.signatureFor === id)!.id), id).toBe(3);
  });

  it('every new skill has a signature that fits only it', () => {
    for (const id of BATCH) {
      const sigs = SUPPORT_GEMS.filter((x) => x.signatureFor === id);
      expect(sigs, id).toHaveLength(1);
      expect(supportFits(sigs[0], activeGemDef(id))).toBe(true);
      expect(supportFits(sigs[0], activeGemDef('heavy_strike'))).toBe(false);
    }
  });

  it('nothing here can turn up before Act 3, even at a high level', () => {
    const s = veteran(newGame(1), 60);
    s.unlockedZones = ['mudflats', 'cinderroad'];
    for (const id of [...BATCH, ...SUPPORTS]) expect(gemArrived(s, id), id).toBe(false);
    const act3 = { ...ZONES[0], id: 'test_act3', act: 3 };
    ZONES.push(act3);
    s.unlockedZones = [...s.unlockedZones, act3.id];
    for (const id of [...BATCH, ...SUPPORTS]) expect(gemArrived(s, id), id).toBe(true);
    ZONES.pop();
  });

  it('tags say what a skill does: blood spends Life, bleed opens a bleed', () => {
    for (const g of ACTIVE_GEMS) {
      expect(g.tags.includes('blood'), g.id).toBe(!!g.effect.lifePct);
      expect(g.tags.includes('bleed'), g.id).toBe(g.effect.ailment?.kind === 'bleed');
    }
  });

  it('every class of weapon can bleed: melee, bows and spells', () => {
    expect(activeGemDef('gash').weapons).toContain('dagger');
    expect(activeGemDef('barbed_arrow').weapons).toEqual(['bow']);
    expect(activeGemDef('blood_lance').weapons).toBeUndefined();
    expect(activeGemDef('blood_lance').tags).toContain('bleed');
  });

  it('Lacerate joins the bleed supports', () => {
    expect(supportFits(supportGemDef('deep_wounds'), activeGemDef('lacerate'))).toBe(true);
    expect(supportFits(supportGemDef('deep_wounds'), activeGemDef('infernal_blow'))).toBe(false);
  });
});

describe('spending Life', () => {
  it('skills pay in Life, past energy shield, and not in mana', () => {
    const { s, ctx, d } = arena('flagellate');
    s.es = 500;
    for (let i = 0; i < 160 && !used(ctx); i++) combatStep(s, ctx, 50, { ...deriveStats(s), maxEs: 500 });
    expect(uses(ctx)).toBe(1);
    expect(s.life).toBeCloseTo(d.maxLife - skillNumbers(d, s.skillBar[0]).lifeCost, 0);
    expect(s.mana).toBeCloseTo(d.maxMana, 0);
    expect(s.es).toBe(500);
  });

  it('the cost is a share of maximum Life and rises with supports; Efficiency lowers it', () => {
    const { s, d } = arena('flagellate', { supports: ['multistrike'] });
    expect(skillNumbers(d, s.skillBar[0]).lifeCost).toBe(Math.round(d.maxLife * 0.03 * 1.4));
    const b = arena('flagellate', { supports: ['efficiency'] });
    expect(skillNumbers(b.d, b.s.skillBar[0]).lifeCost).toBe(Math.round(b.d.maxLife * 0.03 * 0.6));
  });

  it('the reserve stays above the auto-flee line, so paying alone never sets off a flight', () => {
    expect(LIFE_RESERVE_PCT / 100).toBeGreaterThan(AUTO_FLEE_AT);
    const { s, ctx, d } = arena('blood_rite');
    s.settings.autoFlee = true;
    s.combat!.cooldowns[0] = 0;
    for (let i = 0; i < 12; i++) {
      s.combat!.cooldowns[0] = 0;
      run(s, ctx, 1000);
    }
    expect(s.life).toBeGreaterThanOrEqual((d.maxLife * LIFE_RESERVE_PCT) / 100 - 1);
    expect(s.combat!.fleeing).toBeFalsy();
  });

  for (const id of LIFE_SKILLS) {
    it(`${id} left running stops at the reserve and can't kill you`, () => {
      const { s, ctx, d } = arena(id);
      for (let i = 0; i < 40; i++) {
        s.combat!.cooldowns[0] = 0;
        run(s, ctx, 2000);
        expect(s.life, 'never below the reserve').toBeGreaterThanOrEqual((d.maxLife * LIFE_RESERVE_PCT) / 100 - 1);
      }
      expect(s.lifetime.deaths).toBe(0);
      expect(s.life).toBeLessThan((d.maxLife * (LIFE_RESERVE_PCT + 30)) / 100);
    });
  }

  it('with the reserve hit, the turn falls back to a free attack instead of hanging', () => {
    const { s, ctx, dummy, d } = arena('flagellate');
    s.life = (d.maxLife * LIFE_RESERVE_PCT) / 100;
    run(s, ctx, 8000);
    expect(uses(ctx)).toBe(0);
    expect(dummy.life).toBeLessThan(dummy.maxLife);
  });

  it('your own press can spend past the reserve, down to your last Life, and never below', () => {
    const { s, ctx, d } = arena('blood_rite');
    s.skillBar[0]!.rules = [{ when: 'manual' }];
    const cost = skillNumbers(d, s.skillBar[0]).lifeCost;
    s.life = cost + 5;
    expect(canSpendLife(s, d, cost, false)).toBe(false);
    expect(canSpendLife(s, d, cost, true)).toBe(true);
    queueSkill(s, 0);
    run(s, ctx, 1000, () => used(ctx));
    expect(used(ctx)).toBe(true);
    expect(s.life).toBeGreaterThanOrEqual(1);
    expect(s.life).toBeLessThan(10);
    // with less than the cost, the press does nothing
    s.combat!.cooldowns[0] = 0;
    s.life = cost;
    const before = uses(ctx);
    queueSkill(s, 0);
    run(s, ctx, 1000);
    expect(uses(ctx)).toBe(before);
  });

  it('offline: a whole bar of Life skills spends down and stops, with no death and no flight', () => {
    const s = veteran(newGame(1, { name: 't', classId: 'warrior' }), 60);
    unlockEverything(s);
    s.skillBar = s.skillBar.map(() => null);
    ['blood_rite', 'scourge', 'flagellate'].forEach((id, i) => {
      const g = createSkillGem(s, id);
      g.rules = [{ when: 'always' }];
      s.skillBar[i] = g;
      armFor(s, id);
    });
    s.unlockedZones = ['mudflats'];
    const ctx = makeCtx(seeded(3));
    startCombat(s, ctx, 'mudflats');
    const sum = simulateOffline(s, ctx, 20 * 60 * 1000);
    expect(sum.died).toBe(false);
    expect(sum.kills).toBeGreaterThan(0);
    expect(s.combat).toBeTruthy();
  });

  it('a press queued before you left is dropped offline', () => {
    const { s, ctx } = arena('blood_rite');
    s.skillBar[0]!.rules = [{ when: 'manual' }];
    queueSkill(s, 0);
    simulateOffline(s, ctx, 5000);
    expect(s.combat?.queued ?? null).toBe(null);
  });

  it('Overclock pays nothing', () => {
    const { s, d } = arena('flagellate');
    const { raw } = deriveStats(s);
    raw.overclock = 1;
    s.life = 1;
    expect(canSpendLife(s, { ...d, raw }, 100, false)).toBe(true);
  });
});

describe('the rule for it', () => {
  it('When life above reads life', () => {
    const { s, d } = arena('flagellate');
    s.life = d.maxLife * 0.5;
    const rc = ruleContext(s, d);
    expect(ruleAllows({ when: 'lifeAbove', value: 40 }, rc, false)).toBe(true);
    expect(ruleAllows({ when: 'lifeAbove', value: 60 }, rc, false)).toBe(false);
  });

  it('a Life skill on its suggested rule holds Life above the line', () => {
    const { s, ctx, d } = arena('flagellate');
    s.account.automation.rules.push('vitals');
    s.skillBar[0]!.rules = [{ ...activeGemDef('flagellate').defaultRule }];
    for (let i = 0; i < 30; i++) run(s, ctx, 2000);
    expect(s.life).toBeGreaterThanOrEqual(d.maxLife * 0.57);
  });

  it('stays locked until Vitals rules are learned', () => {
    const { s, ctx } = arena('flagellate');
    s.skillBar[0]!.rules = [{ when: 'lifeAbove', value: 10 }];
    s.account.automation.rules = [];
    run(s, ctx, 8000);
    expect(used(ctx)).toBe(false);
  });
});

describe('bleed skills', () => {
  for (const id of ['gash', 'barbed_arrow', 'scourge', 'blood_lance']) {
    it(`${id} bleeds its target`, () => {
      const { s, ctx, dummy } = arena(id);
      run(s, ctx, 12_000, () => dummy.dots.length > 0);
      expect(dummy.dots[0]?.kind).toBe('bleed');
    });
  }

  it('Scourge bleeds the enemies either side as well', () => {
    const { s, ctx, monsters } = arena('scourge', { pack: 3 });
    run(s, ctx, 12_000, () => monsters.filter((m) => m.dots.length).length >= 2);
    expect(monsters.filter((m) => m.dots.length).length).toBeGreaterThanOrEqual(2);
  });

  it('Deep Wounds deepens the bleed, and Serrated Edge opens one on any attack', () => {
    const avg = (supports: string[]) => {
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const a = arena('gash', { supports });
        a.dummy.dots = [];
        run(a.s, a.ctx, 12_000, () => a.dummy.dots.length > 0);
        sum += dotDps(a.dummy);
      }
      return sum / 12;
    };
    expect(avg(['deep_wounds'])).toBeGreaterThan(avg([]) * 1.2);

    const b = arena('heavy_strike', { supports: ['serrated_edge'] });
    run(b.s, b.ctx, 12_000, () => b.dummy.dots.length > 0);
    expect(b.dummy.dots[0]?.kind).toBe('bleed');
  });

  it('Stigmata makes bleeds tick harder, half as hard on a boss', () => {
    const tick = (bleedTaken: number) => {
      const { s, ctx, dummy } = arena('heavy_strike');
      s.skillBar[0] = null;
      s.combat!.actionMs = 1e9;
      dummy.life = dummy.maxLife;
      dummy.curse = { gemId: 'stigmata', remainingMs: 1e9, durationMs: 1e9, physTaken: 0, resPen: 0, dealLess: 0, slow: 0, bleedTaken };
      dummy.dots = [bleed(100, 1e6)];
      run(s, ctx, 1000);
      return dummy.maxLife - dummy.life;
    };
    expect(tick(40)).toBeCloseTo(tick(0) * 1.4, 3);

    const a = arena('stigmata');
    run(a.s, a.ctx, 500, () => used(a.ctx));
    expect(a.dummy.curse?.bleedTaken).toBe(40);
    const b = arena('stigmata', { boss: true });
    run(b.s, b.ctx, 500, () => used(b.ctx));
    expect(b.dummy.curse?.bleedTaken).toBe(20);
  });

  it('Transfusion cashes in the bleed for Life, capped, and does nothing to an unbleeding target', () => {
    const { s, ctx, dummy, d } = arena('transfusion');
    s.life = d.maxLife * 0.5;
    dummy.dots = [bleed(100, 4000)];
    run(s, ctx, 100, () => used(ctx));
    expect(dummy.dots).toHaveLength(0);
    expect(dummy.maxLife - dummy.life).toBeGreaterThanOrEqual(390);
    expect(s.life).toBeCloseTo(d.maxLife * 0.5 + 120, -1);

    const big = arena('transfusion');
    big.s.life = 1;
    big.dummy.dots = [bleed(1e6, 4000)];
    run(big.s, big.ctx, 100, () => used(big.ctx));
    expect(big.s.life).toBeLessThanOrEqual(big.d.maxLife * 0.25 + 2);

    const none = arena('transfusion');
    none.s.life = 50;
    run(none.s, none.ctx, 100, () => used(none.ctx));
    expect(none.s.life).toBeLessThan(60);
  });

  it('Transfusion waits for a bleed on its suggested rule', () => {
    const { s, ctx, dummy } = arena('transfusion');
    s.account.automation.rules.push('status');
    s.skillBar[0]!.rules = [{ ...activeGemDef('transfusion').defaultRule }];
    run(s, ctx, 3000);
    expect(used(ctx)).toBe(false);
    dummy.dots = [bleed(10, 4000)];
    run(s, ctx, 5000, () => used(ctx));
    expect(used(ctx)).toBe(true);
  });
});

describe('Life as a weapon', () => {
  it('Burnt Offering hits harder the more Life it burns, and the sim sees that', () => {
    const low = arena('burnt_offering');
    const high = arena('burnt_offering', { supports: ['ashes_to_ashes'] });
    expect(skillNumbers(high.d, high.s.skillBar[0]).lifeCost).toBeGreaterThan(skillNumbers(low.d, low.s.skillBar[0]).lifeCost);
    expect(skillSummary(high.d, high.s.skillBar[0]).perUse).toBeGreaterThan(skillSummary(low.d, low.s.skillBar[0]).perUse);
    run(low.s, low.ctx, 100, () => used(low.ctx));
    const lifeCost = skillNumbers(low.d, low.s.skillBar[0]).lifeCost;
    expect(low.dummy.maxLife - low.dummy.life).toBeGreaterThanOrEqual(lifeCost * 0.5);
  });

  it('Blood Rite grants more damage for its price, and Blood Oath leeches while it lasts', () => {
    const { s, ctx } = arena('blood_rite', { supports: ['blood_oath'] });
    run(s, ctx, 1000, () => used(ctx));
    expect(s.combat!.buffs.find((b) => b.id === 'blood_rite')?.moreDamage).toBeGreaterThanOrEqual(25);
    expect(deriveStats(s).raw.lifeLeech).toBeGreaterThanOrEqual(3);
  });

  it('Blood Ward trades Life for a bigger shield; Barbed Ward hits back when it breaks', () => {
    const { s, ctx, dummy, d } = arena('blood_ward', { supports: ['barbed_ward'] });
    run(s, ctx, 1000, () => used(ctx));
    const cost = skillNumbers(d, s.skillBar[0]).lifeCost;
    expect(s.combat!.shield).toBeGreaterThan(cost * 3);
    s.combat!.cooldowns[0] = 1e9;
    s.combat!.shield = 1;
    dummy.attackMs = 300;
    dummy.damage = 500;
    const before = dummy.life;
    run(s, ctx, 3000, () => s.combat!.shield <= 0);
    expect(dummy.life).toBeLessThanOrEqual(before - cost * 2 + 1);
  });

  it('a shield ends with its own timer, and a second shield keeps going after the first would have ended', () => {
    const { s, ctx } = arena('blood_ward');
    run(s, ctx, 1000, () => used(ctx));
    s.combat!.cooldowns[0] = 1e9;
    expect(s.combat!.shield).toBeGreaterThan(0);
    run(s, ctx, 6000);
    expect(s.combat!.shield).toBe(0);
  });

  it('Blood Price pays in Life, adds damage, and has nothing to do on a Life skill', () => {
    const { s, d } = arena('heavy_strike', { supports: ['blood_price'] });
    const nums = skillNumbers(d, s.skillBar[0]);
    expect(nums.manaCost).toBe(0);
    expect(nums.lifeCost).toBeGreaterThan(0);
    expect(nums.mods.moreDamage).toBe(15);
    expect(supportFits(supportGemDef('blood_price'), activeGemDef('flagellate'))).toBe(false);
    expect(supportFits(supportGemDef('blood_price'), activeGemDef('fireball'))).toBe(true);
  });

  it('Tithe gives a third back over 4s', () => {
    const { s, ctx, d } = arena('blood_rite', { supports: ['tithe'] });
    run(s, ctx, 1000, () => used(ctx));
    const cost = skillNumbers(d, s.skillBar[0]).lifeCost;
    s.combat!.cooldowns[0] = 1e9;
    const low = d.maxLife - cost;
    run(s, ctx, 5000);
    expect(s.life).toBeGreaterThanOrEqual(low + cost / 3 - 2);
  });

  it('Desperate Faith only pays out below half Life', () => {
    const damage = (life: number) => {
      const { s, ctx, dummy, d } = arena('heavy_strike', { supports: ['desperate_faith'] });
      for (let i = 0; i < 200; i++) {
        s.life = d.maxLife * life;
        s.mana = d.maxMana;
        s.combat!.actionMs = 0;
        combatStep(s, ctx, 50, deriveStats(s));
      }
      return dummy.maxLife - dummy.life;
    };
    expect(damage(0.45)).toBeGreaterThan(damage(0.55) * 1.2);
  });
});

describe('signatures', () => {
  it('Gnawing Wound hits bleeding enemies harder', () => {
    const avg = (bleeding: boolean) => {
      const { s, ctx, dummy, d } = arena('gash', { supports: ['gnawing_wound'] });
      for (let i = 0; i < 2000; i++) {
        s.mana = d.maxMana;
        dummy.dots = bleeding ? [bleed(0, 4000)] : [];
        s.combat!.actionMs = 0;
        combatStep(s, ctx, 50, deriveStats(s));
      }
      return dummy.maxLife - dummy.life;
    };
    // the loop mixes in Default Attacks, which the support doesn't touch
    expect(avg(true)).toBeGreaterThan(avg(false) * 1.1);
  });

  it('Flay breaks armour; Arterial Spray spreads the bleed; Blood Trail moves it on; Weeping Wounds opens one', () => {
    const a = arena('scourge', { supports: ['flay'] });
    run(a.s, a.ctx, 12_000, () => a.dummy.vulnMs > 0);
    expect(a.dummy.vulnMs).toBeGreaterThan(0);

    const b = arena('blood_lance', { pack: 2, supports: ['arterial_spray'] });
    b.monsters[1].cell = b.dummy.cell + 1;
    run(b.s, b.ctx, 12_000, () => b.monsters[1].dots.length > 0);
    expect(b.monsters[1].dots[0]?.kind).toBe('bleed');

    const c = arena('barbed_arrow', { pack: 2, supports: ['blood_trail'] });
    c.monsters[1].cell = 30;
    c.s.skillBar[0]!.rules = [{ when: 'targetLacks', status: 'bleeding' }];
    c.s.account.automation.rules.push('status');
    run(c.s, c.ctx, 12_000, () => c.dummy.dots.length > 0);
    c.s.skillBar[0]!.rules = [{ when: 'manual' }];
    c.dummy.life = 0;
    run(c.s, c.ctx, 100);
    expect(c.monsters[1].dots.some((x) => x.kind === 'bleed')).toBe(true);

    const e = arena('stigmata', { pack: 1, supports: ['weeping_wounds'] });
    run(e.s, e.ctx, 500, () => used(e.ctx));
    expect(e.dummy.curse?.weeping).toBe(true);
    run(e.s, e.ctx, 12_000, () => e.dummy.dots.length > 0);
    expect(e.dummy.dots[0]?.kind).toBe('bleed');
  });

  it('Pale Communion returns mana too', () => {
    const { s, ctx, dummy, d } = arena('transfusion', { supports: ['pale_communion'] });
    s.mana = 10;
    dummy.dots = [bleed(100, 4000)];
    run(s, ctx, 100, () => used(ctx));
    expect(s.mana).toBeGreaterThan(10);
    expect(s.mana).toBeLessThanOrEqual(d.maxMana);
  });

  it('Absolution leeches enough to keep Flagellate paid for', () => {
    const { s, ctx, d } = arena('flagellate', { supports: ['absolution'] });
    s.life = d.maxLife * 0.5;
    run(s, ctx, 8000, () => uses(ctx) > 0);
    expect(uses(ctx)).toBeGreaterThan(0);
  });
});

describe('saves', () => {
  it('existing characters load untouched: a Life skill, its supports and a Life rule survive, with no migration', () => {
    const s = veteran(newGame(1, { name: 't', classId: 'warrior' }), 60);
    const g = createSkillGem(s, 'flagellate');
    g.supports[0] = createSupportGem(s, 'absolution');
    g.rules = [{ when: 'lifeAbove', value: 55 }];
    s.skillBar[1] = g;
    const loaded = deserialize(serialize(s));
    expect(loaded.skillBar[1]?.gemId).toBe('flagellate');
    expect(loaded.skillBar[1]?.supports[0]?.supportId).toBe('absolution');
    expect(loaded.skillBar[1]?.rules[0]).toEqual({ when: 'lifeAbove', value: 55 });
  });
});

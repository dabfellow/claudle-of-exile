import { describe, expect, it } from 'vitest';
import { ACTIVE_GEMS, activeGemDef, gemAct, gemReqLevel, SUPPORT_GEMS, supportGemDef } from '../src/data/gems';
import { ZONES, zoneDef } from '../src/data/zones';
import { unlockEverything } from '../src/engine/automation';
import { combatStep, makeMonster, queueSkill, staggerMax, startCombat, STAGGER_FULL, STAGGER_GROWTH, WINDUP_CARRY } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, createSupportGem, skillNumbers, skillSummary, supportFits } from '../src/engine/gems';
import { simulateOffline } from '../src/engine/offline';
import { gemArrived } from '../src/engine/progress';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { armFor, veteran } from './helpers';

const BATCH = ['titans_blow', 'avalanche', 'bulwark', 'shield_crush', 'mountain_stance', 'siege_shot', 'blackjack', 'meteor', 'sacred_aegis', 'burden'];
const SUPPORTS = ['crushing_weight', 'ponderous', 'shockwave', 'reinforced', 'follow_through'];

interface Opts {
  supports?: string[];
  pack?: number;
  boss?: boolean;
  classId?: 'warrior' | 'mage';
  extra?: { gem: string; rule: 'always' | 'enemyCasting' | 'manual'; supports?: string[] }[];
}

/** One skill on the bar, optionally with supports, against dummies that stand still and never attack unless told to. */
function arena(gem: string, opts: Opts = {}) {
  const s = veteran(newGame(1, { name: 't', classId: opts.classId ?? 'warrior' }), 60);
  s.skillBar = s.skillBar.map(() => null);
  const g = createSkillGem(s, gem);
  g.rules = [{ when: 'always' }];
  g.extraSlots = 1;
  g.supports = (opts.supports ?? []).map((id) => createSupportGem(s, id));
  s.skillBar[0] = g;
  (opts.extra ?? []).forEach((x, i) => {
    const e = createSkillGem(s, x.gem);
    e.rules = [{ when: x.rule }];
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
    const m = makeMonster(zoneDef('cinderroad').monsters[0], false, i + 1);
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

const hits = (ctx: ReturnType<typeof makeCtx>, uid: number) => ctx.events.filter((e) => e.t === 'hit' && e.target === 'monster' && e.monsterUid === uid && e.amount > 0).length;
const uses = (ctx: ReturnType<typeof makeCtx>, gemId?: string) => ctx.events.filter((e) => e.t === 'skill' && (!gemId || e.gemId === gemId)).length;
const lost = (m: MonsterInstance) => m.maxLife - m.life;

describe('the Giants and weight batch', () => {
  it('arrives with Act 4, past the Act 3 gems, and its signatures with it', () => {
    for (const id of [...BATCH, ...SUPPORTS]) {
      expect(gemAct(id), id).toBe(4);
      expect(gemReqLevel(id), id).toBeGreaterThanOrEqual(40);
    }
    for (const id of BATCH) expect(gemAct(SUPPORT_GEMS.find((x) => x.signatureFor === id)!.id), id).toBe(4);
  });

  it('every new skill has a signature that fits only it', () => {
    for (const id of BATCH) {
      const sigs = SUPPORT_GEMS.filter((x) => x.signatureFor === id);
      expect(sigs, id).toHaveLength(1);
      expect(supportFits(sigs[0], activeGemDef(id))).toBe(true);
      expect(supportFits(sigs[0], activeGemDef('heavy_strike'))).toBe(false);
    }
  });

  it('nothing here can turn up before Act 4, even at a high level', () => {
    const s = veteran(newGame(1), 60);
    s.unlockedZones = ['mudflats', 'cinderroad'];
    for (const id of [...BATCH, ...SUPPORTS]) expect(gemArrived(s, id), id).toBe(false);
    const act4 = { ...ZONES[0], id: 'test_act4', act: 4 };
    ZONES.push(act4);
    s.unlockedZones = [...s.unlockedZones, act4.id];
    for (const id of [...BATCH, ...SUPPORTS]) expect(gemArrived(s, id), id).toBe(true);
    ZONES.pop();
  });

  it('tags say what a skill does: shield raises one, and every heavy skill is slow', () => {
    for (const g of ACTIVE_GEMS) {
      expect(g.tags.includes('shield'), g.id).toBe(!!g.effect.shieldPct);
      if (g.tags.includes('heavy')) expect(g.timeMs, g.id).toBeGreaterThanOrEqual(4800);
    }
  });

  it('heavy supports fit heavy skills only, and Reinforced fits every shield', () => {
    for (const id of ['ponderous', 'shockwave', 'follow_through']) {
      expect(supportFits(supportGemDef(id), activeGemDef('titans_blow')), id).toBe(true);
      expect(supportFits(supportGemDef(id), activeGemDef('meteor')), id).toBe(true);
      expect(supportFits(supportGemDef(id), activeGemDef('heavy_strike')), id).toBe(false);
    }
    for (const id of ['frost_ward', 'blood_ward', 'bulwark', 'sacred_aegis']) expect(supportFits(supportGemDef('reinforced'), activeGemDef(id)), id).toBe(true);
    expect(supportFits(supportGemDef('reinforced'), activeGemDef('parry'))).toBe(false);
    expect(supportFits(supportGemDef('crushing_weight'), activeGemDef('barrage'))).toBe(true);
  });

  it('a huge hit beats its Act 3 peers per second, on paper, and hits far harder per use', () => {
    const { s, d } = arena('titans_blow');
    const blow = skillSummary(d, s.skillBar[0]);
    const flag = skillSummary(d, createSkillGem(s, 'flagellate'));
    const strike = skillSummary(d, createSkillGem(s, 'heavy_strike'));
    expect(blow.perSecond).toBeGreaterThan(flag.perSecond);
    expect(blow.perUse).toBeGreaterThan(strike.perUse * 2);
  });
});

describe('wind-ups', () => {
  it('pays at the start and lands at the end', () => {
    const { s, ctx, dummy, d } = arena('titans_blow');
    const nums = skillNumbers(d, s.skillBar[0]);
    run(s, ctx, 100);
    expect(uses(ctx)).toBe(1);
    expect(s.combat!.windup).toBeTruthy();
    expect(s.mana).toBeLessThan(d.maxMana);
    expect(lost(dummy)).toBe(0);
    run(s, ctx, nums.actionMs - 200);
    expect(lost(dummy)).toBe(0);
    run(s, ctx, 300);
    expect(lost(dummy)).toBeGreaterThan(0);
    expect(uses(ctx)).toBe(2); // straight into the next one: no recovery after the hit
  });

  it("can't miss, however poor your accuracy", () => {
    const { s, ctx, dummy } = arena('titans_blow');
    const low = (x: ReturnType<typeof deriveStats>) => ({ ...x, accuracy: 1 });
    for (let t = 0; t < 40000; t += 50) combatStep(s, ctx, 50, low(deriveStats(s)));
    expect(ctx.events.some((e) => e.t === 'hit' && e.target === 'monster' && e.evaded)).toBe(false);
    expect(hits(ctx, dummy.uid)).toBeGreaterThan(2);
  });

  it('turns on the next enemy when its target dies mid wind-up', () => {
    const { s, ctx, monsters: [a, b] } = arena('titans_blow', { pack: 2 });
    run(s, ctx, 100);
    s.combat!.windup!.targetUid = a.uid;
    a.life = -1;
    run(s, ctx, 8000, () => lost(b) > 0);
    expect(lost(b)).toBeGreaterThan(0);
    expect(uses(ctx)).toBe(2); // the first blow, paid once, then the next wind-up
  });

  it('holds the blow when the field empties, and lands it on the next pack without paying again', () => {
    const { s, ctx, dummy } = arena('titans_blow');
    run(s, ctx, 100);
    dummy.life = -1;
    run(s, ctx, 12000);
    expect(s.combat!.monsters).toHaveLength(0);
    expect(s.combat!.windup).toBeTruthy();
    expect(s.combat!.actionMs).toBe(0);
    const next = makeMonster(zoneDef('cinderroad').monsters[0], false, 9);
    next.life = next.maxLife = 1e7;
    next.attackMs = 1e9;
    next.cell = 0;
    s.combat!.monsters = [next];
    run(s, ctx, 100);
    expect(lost(next)).toBeGreaterThan(0);
    expect(uses(ctx)).toBe(2); // the held one, then the next wind-up
  });

  it('closes in with a held blow when what is left stands out of reach', () => {
    const { s, ctx, monsters: [a, b] } = arena('titans_blow', { pack: 2 });
    run(s, ctx, 100);
    a.life = -1;
    b.cell = 18;
    b.stepMs = 1e9;
    run(s, ctx, 9000, () => lost(b) > 0);
    expect(lost(b)).toBeGreaterThan(0);
    expect(ctx.events.some((e) => e.t === 'closeIn')).toBe(true);
  });

  it('a kill makes the next wind-up half as long', () => {
    const { s, ctx, monsters: [a], d } = arena('titans_blow', { pack: 2 });
    const full = skillNumbers(d, s.skillBar[0]).actionMs;
    a.life = 1;
    run(s, ctx, full + 200, () => uses(ctx) === 2);
    expect(s.combat!.actionTotal).toBeCloseTo(full * WINDUP_CARRY, 0);
    expect(s.combat!.windupCarry).toBeUndefined();
  });

  it('Long Draw all but skips the next wind-up after a kill', () => {
    const { s, ctx, monsters: [a], d } = arena('siege_shot', { pack: 2, supports: ['long_draw'] });
    const full = skillNumbers(d, s.skillBar[0]).actionMs;
    a.life = 1;
    run(s, ctx, full + 200, () => uses(ctx) === 2);
    expect(s.combat!.actionTotal).toBeLessThan(full * 0.2);
  });

  it('a guard breaks in on its rule, and the blow waits for it', () => {
    const { s, ctx, dummy } = arena('titans_blow', { boss: true, extra: [{ gem: 'bulwark', rule: 'enemyCasting' }] });
    run(s, ctx, 1000);
    const before = s.combat!.actionMs;
    dummy.casting = dummy.castTotal = 3000;
    run(s, ctx, 50);
    expect(uses(ctx, 'bulwark')).toBe(1);
    expect(s.combat!.shield).toBeGreaterThan(0);
    expect(s.combat!.actionMs).toBeGreaterThan(before);
    expect(s.combat!.using).toBe('titans_blow');
    expect(s.combat!.windup).toBeTruthy();
  });

  it('a pressed guard breaks in too; other skills wait for the blow', () => {
    const { s, ctx } = arena('titans_blow', { extra: [{ gem: 'bulwark', rule: 'manual' }, { gem: 'shield_crush', rule: 'manual' }] });
    run(s, ctx, 200);
    queueSkill(s, 2);
    run(s, ctx, 200);
    expect(uses(ctx, 'shield_crush')).toBe(0);
    s.combat!.queued = 1;
    run(s, ctx, 100);
    expect(uses(ctx, 'bulwark')).toBe(1);
  });

  it('losing the gem from the bar drops the blow rather than sticking', () => {
    const { s, ctx, dummy } = arena('titans_blow');
    run(s, ctx, 100);
    s.skillBar[0] = null;
    run(s, ctx, 8000);
    expect(s.combat!.windup).toBeUndefined();
    expect(hits(ctx, dummy.uid)).toBeGreaterThan(0); // the Default Attack took over
  });

  it('a save taken mid wind-up carries on', () => {
    const { s, ctx, dummy } = arena('titans_blow');
    run(s, ctx, 100);
    const back = deserialize(serialize(s));
    if (back.combat) {
      expect(back.combat.windup).toBeTruthy();
      run(back, ctx, 8000);
      expect(lost(back.combat.monsters[0])).toBeGreaterThan(0);
    } else expect(lost(dummy)).toBe(0);
  });

  it('runs offline with no hands: it keeps hitting and never gets stuck', () => {
    const { s, ctx, dummy } = arena('titans_blow');
    const before = s.life;
    simulateOffline(s, ctx, 60000);
    expect(lost(dummy)).toBeGreaterThan(0);
    expect(s.life).toBeGreaterThan(0);
    expect(before).toBeGreaterThan(0);
  });

  it('gives Rage for the weight of the hit', () => {
    const { s, ctx, dummy } = arena('titans_blow');
    run(s, ctx, 9000, () => lost(dummy) > 0);
    expect(s.combat!.mech).toBe(4);
  });
});

describe('stuns on bosses', () => {
  it('a big stun on a normal enemy is long, on a boss still short', () => {
    const big = arena('titans_blow');
    run(big.s, big.ctx, 9000, () => lost(big.dummy) > 0);
    expect(big.dummy.stunMs).toBeGreaterThan(1500);
    const boss = arena('titans_blow', { boss: true });
    run(boss.s, boss.ctx, 9000, () => lost(boss.dummy) > 0);
    expect(boss.dummy.stunMs).toBeLessThanOrEqual(600);
    expect(boss.dummy.stagger).toBe(25);
  });

  it('a full Stagger is a long stun that costs the boss its wind-up', () => {
    const { s, ctx, dummy } = arena('titans_blow', { boss: true });
    dummy.mechanics = ['slam'];
    dummy.timers.slam = 1e9;
    dummy.stagger = 99;
    dummy.casting = dummy.castTotal = 20000;
    dummy.castKind = 'slam';
    run(s, ctx, 9000, () => lost(dummy) > 0);
    expect(dummy.stunMs).toBeGreaterThanOrEqual(1400);
    expect(dummy.casting).toBe(-1);
    expect(dummy.stagger).toBe(0);
    expect(dummy.timers.slam).toBeGreaterThan(0);
    expect(ctx.events.some((e) => e.t === 'interrupt')).toBe(true);
  });

  it('each Stagger takes more than the last, so a boss can never be stun-locked', () => {
    const { s, ctx, dummy } = arena('titans_blow', { boss: true, supports: ['crushing_weight', 'multistrike', 'faster_attacks'] });
    expect(staggerMax(dummy)).toBe(STAGGER_FULL);
    let stunned = 0;
    const total = 180000;
    for (let t = 0; t < total; t += 50) {
      combatStep(s, ctx, 50, deriveStats(s));
      if (dummy.stunMs > 0) stunned += 50;
    }
    expect(dummy.staggers).toBeGreaterThan(1);
    expect(staggerMax(dummy)).toBeCloseTo(STAGGER_FULL * STAGGER_GROWTH ** dummy.staggers!);
    expect(stunned / total).toBeLessThan(0.25);
  });

  it('other stuns fill it a little, and Crushing Weight more', () => {
    const plain = arena('heavy_strike', { boss: true });
    const with_ = arena('heavy_strike', { boss: true, supports: ['crushing_weight'] });
    run(plain.s, plain.ctx, 90000);
    run(with_.s, with_.ctx, 90000);
    const filled = (m: MonsterInstance) => (m.staggers ?? 0) * 1000 + (m.stagger ?? 0);
    expect(filled(plain.dummy)).toBeGreaterThan(0);
    expect(filled(with_.dummy)).toBeGreaterThan(filled(plain.dummy));
  });

  it('Burden fills Stagger faster, at half effect on a boss', () => {
    const { s, ctx, dummy } = arena('titans_blow', { boss: true, extra: [{ gem: 'burden', rule: 'always' }] });
    run(s, ctx, 9000, () => lost(dummy) > 0);
    expect(dummy.curse?.stunTaken).toBeCloseTo(20);
    expect(dummy.stagger).toBeCloseTo(30);
  });

  it('a chained boss takes no Stagger', () => {
    const { s, ctx, dummy } = arena('titans_blow', { boss: true });
    dummy.chained = true;
    run(s, ctx, 9000);
    expect(dummy.stagger ?? 0).toBe(0);
  });
});

describe('shields', () => {
  const guard = (gem: string, supports: string[] = [], classId?: 'warrior' | 'mage') => {
    const a = arena(gem, { supports, classId });
    a.dummy.attackMs = 300;
    a.dummy.damage = 20;
    return a;
  };

  it('Bulwark raises a shield and goes down with its buff', () => {
    const { s, ctx, d } = arena('bulwark');
    run(s, ctx, 100);
    expect(s.combat!.shield).toBeCloseTo(d.maxLife * 0.45);
    run(s, ctx, 7000);
    expect(s.combat!.shield).toBe(0);
  });

  it('Reinforced makes it 30% bigger', () => {
    const { s, ctx, d } = arena('bulwark', { supports: ['reinforced'] });
    run(s, ctx, 100);
    expect(s.combat!.shield).toBeCloseTo(d.maxLife * 0.45 * 1.3);
  });

  it('Sacred Aegis counts energy shield too', () => {
    const { s, ctx } = arena('sacred_aegis');
    const d = { ...deriveStats(s), maxLife: 1000, maxEs: 500 };
    combatStep(s, ctx, 50, d);
    expect(s.combat!.shield).toBeCloseTo(1500 * 0.3);
  });

  it('Shield Crush adds half the shield without spending it, Battering Ram spends all of it', () => {
    const hitWith = (supports: string[], shield: number) => {
      const a = arena('shield_crush', { supports });
      a.s.combat!.shield = shield;
      a.s.combat!.shieldMax = shield;
      a.dummy.res = { fire: 0, cold: 0, light: 0, chaos: 0 };
      run(a.s, a.ctx, 4000, () => lost(a.dummy) > 0);
      return { dealt: lost(a.dummy), left: a.s.combat!.shield };
    };
    const none = hitWith([], 0);
    const half = hitWith([], 100000);
    const ram = hitWith(['battering_ram'], 100000);
    expect(half.dealt).toBeGreaterThan(none.dealt + 30000);
    expect(half.left).toBe(100000);
    expect(ram.dealt).toBeGreaterThan(half.dealt * 1.5);
    expect(ram.left).toBe(0);
  });

  it('Recoil stuns what stands in melee range when the shield breaks', () => {
    const { s, ctx, dummy } = guard('bulwark', ['recoil']);
    run(s, ctx, 100);
    dummy.stunMs = 0;
    s.combat!.shield = 1;
    dummy.damage = 500;
    run(s, ctx, 1000, () => dummy.stunMs > 0);
    expect(dummy.stunMs).toBeGreaterThan(1000);
  });

  it('Radiance strikes every enemy when the shield breaks', () => {
    const { s, ctx, dummy } = guard('sacred_aegis', ['radiance']);
    run(s, ctx, 100);
    const stored = s.combat!.radiance!;
    expect(stored).toBeGreaterThan(0);
    s.combat!.shield = 1;
    dummy.damage = 500;
    const struck = () => ctx.events.find((e) => e.t === 'hit' && e.target === 'monster' && e.dmgType === 'light');
    run(s, ctx, 1000, () => !!struck());
    expect(struck()).toMatchObject({ amount: Math.round(stored) });
  });
});

describe('the rest of the batch', () => {
  it('Mountain Stance trades speed for 30% more damage', () => {
    const { s, ctx, d } = arena('mountain_stance');
    run(s, ctx, 700);
    const buff = s.combat!.buffs.find((b) => b.id === 'mountain_stance')!;
    expect(buff.moreDamage).toBe(30);
    expect(deriveStats(s).attackSpeed).toBeLessThan(d.attackSpeed);
    expect(deriveStats(s).raw.stunDuration).toBe(d.raw.stunDuration);
  });

  it('Immovable lengthens stuns while the stance holds', () => {
    const { s, ctx, d } = arena('mountain_stance', { supports: ['immovable'] });
    run(s, ctx, 700);
    expect(deriveStats(s).raw.stunDuration).toBe(d.raw.stunDuration + 50);
  });

  it('Blackjack hits stunned enemies 60% harder, and Cheap Shot crits them', () => {
    const avg = (stunned: boolean, supports: string[] = []) => {
      const a = arena('blackjack', { supports });
      a.dummy.res = { fire: 0, cold: 0, light: 0, chaos: 0 };
      const d = { ...deriveStats(a.s), accuracy: 1e6 };
      for (let t = 0; t < 60000; t += 50) {
        if (stunned) a.dummy.stunMs = 1000;
        else a.dummy.stunMs = 0;
        combatStep(a.s, a.ctx, 50, d);
      }
      return { per: lost(a.dummy) / hits(a.ctx, a.dummy.uid), crits: a.ctx.events.filter((e) => e.t === 'hit' && e.target === 'monster' && e.crit).length, hits: hits(a.ctx, a.dummy.uid) };
    };
    const plain = avg(false);
    const stunned = avg(true);
    expect(stunned.per / plain.per).toBeGreaterThan(1.3);
    const cheap = avg(true, ['cheap_shot']);
    expect(cheap.crits).toBe(cheap.hits);
  });

  it('Meteor lands on the target and its neighbours, and Cataclysm leaves burning ground', () => {
    const { s, ctx, monsters } = arena('meteor', { pack: 2, supports: ['cataclysm'], classId: 'mage' });
    monsters[1].cell = 1;
    run(s, ctx, 9000, () => lost(monsters[0]) > 0);
    expect(lost(monsters[0])).toBeGreaterThan(0);
    expect(s.combat!.ground.some((g) => g.kind === 'burning')).toBe(true);
  });

  it('Avalanche reaches two rings and stuns for longer with Buried Alive', () => {
    const near = arena('avalanche', { supports: ['buried_alive'] });
    for (let t = 0; t < 120000 && !(near.dummy.stunMs > 2000); t += 50) combatStep(near.s, near.ctx, 50, deriveStats(near.s));
    expect(near.dummy.stunMs).toBeGreaterThan(2000);
  });

  it('Ponderous hits harder and slower, and Follow Through carries the spare damage on', () => {
    const slow = arena('titans_blow', { supports: ['ponderous'] });
    const base = arena('titans_blow');
    expect(skillNumbers(slow.d, slow.s.skillBar[0]).actionMs).toBeCloseTo(skillNumbers(base.d, base.s.skillBar[0]).actionMs * 1.25);
    expect(skillSummary(slow.d, slow.s.skillBar[0]).perUse).toBeCloseTo(skillSummary(base.d, base.s.skillBar[0]).perUse * 1.4);

    const { s, ctx, monsters: [a, b] } = arena('titans_blow', { pack: 2, supports: ['follow_through'] });
    a.life = a.maxLife = 1;
    run(s, ctx, 9000, () => a.life <= 0);
    expect(lost(b)).toBeGreaterThan(0);
  });

  it('Shockwave shakes the nearest other enemies for 30%', () => {
    const { s, ctx, monsters: [a, b] } = arena('titans_blow', { pack: 2, supports: ['shockwave'] });
    a.res = b.res = { fire: 0, cold: 0, light: 0, chaos: 0 };
    run(s, ctx, 9000, () => lost(a) > 0);
    expect(lost(b) / lost(a)).toBeGreaterThan(0.2);
    expect(lost(b) / lost(a)).toBeLessThan(0.4);
  });
});

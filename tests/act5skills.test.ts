import { describe, expect, it } from 'vitest';
import { ACTIVE_GEMS, activeGemDef, gemAct, gemReqLevel, SUPPORT_GEMS, supportGemDef } from '../src/data/gems';
import { zoneDef } from '../src/data/zones';
import { cellRing, MINION_CAP, MINION_LEASH, minionInWay, pullCloser } from '../src/engine/battlefield';
import { army, combatStep, makeMonster, MINION_REST_REGEN, ruleAllows, ruleContext, skillIsActive, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, createSupportGem, minionStats, skillNumbers, skillSummary, stormStats, supportFits } from '../src/engine/gems';
import { simulateOffline } from '../src/engine/offline';
import { gemArrived } from '../src/engine/progress';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, Minion, MonsterInstance } from '../src/engine/types';
import { armFor, veteran } from './helpers';

const BATCH = ['drowned_thralls', 'barnacle_brute', 'riptide', 'drowned_bell', 'boarding_party', 'harpoon', 'squall', 'tidecallers', 'thunderhead', 'whirlpool', 'leviathan'];
const SUPPORTS = ['savage_crew', 'hardened_crew', 'full_muster', 'gale_force', 'stormfront'];
const SUMMONS = ACTIVE_GEMS.filter((g) => g.effect.minion).map((g) => g.id);
const STORMS = ACTIVE_GEMS.filter((g) => g.effect.storm).map((g) => g.id);

/** Skills on the bar on Whenever ready, with supports on the first, against dummies that never attack unless told to. */
function arena(gems: string[], opts: { supports?: string[]; pack?: number; cells?: number[] } = {}) {
  const s = veteran(newGame(1, { name: 't', classId: 'warrior' }), 70);
  s.skillBar = s.skillBar.map(() => null);
  gems.forEach((id, i) => {
    const g = createSkillGem(s, id);
    g.rules = [{ when: 'always' }];
    g.extraSlots = 1;
    if (i === 0) g.supports = (opts.supports ?? []).map((sup) => createSupportGem(s, sup));
    s.skillBar[i] = g;
    armFor(s, id);
  });
  s.unlockedZones = ['mudflats', 'cinderroad'];
  s.settings.autoFlee = false;
  const ctx = makeCtx(seeded(7));
  startCombat(s, ctx, 'cinderroad');
  const monsters: MonsterInstance[] = [];
  for (let i = 0; i < (opts.pack ?? 1); i++) {
    const m = makeMonster(zoneDef('cinderroad').monsters[0], false, 1000 + i);
    m.life = m.maxLife = 1e7;
    m.attackMs = 1e9;
    m.cell = opts.cells?.[i] ?? 11 + i;
    monsters.push(m);
  }
  s.combat!.monsters = monsters;
  s.combat!.spawnMs = 1e12;
  const d = deriveStats(s);
  s.life = d.maxLife;
  s.mana = d.maxMana;
  return { s, ctx, dummy: monsters[0], monsters, d, c: s.combat! };
}

function run(s: GameState, ctx: ReturnType<typeof makeCtx>, ms: number, until?: () => boolean) {
  for (let t = 0; t < ms && s.combat && !until?.(); t += 50) combatStep(s, ctx, 50, deriveStats(s));
}

const damaged = (m: MonsterInstance) => m.life < m.maxLife;
/** Keep the player's own attacks and closing in out of it, so a test sees only the minion or the storm. */
const handsOff = (s: GameState) => {
  s.combat!.actionMs = 1e12;
};

function summon(gem: string, opts: { supports?: string[]; pack?: number; cells?: number[] } = {}) {
  const a = arena([gem], opts);
  run(a.s, a.ctx, 8000, () => army(a.c).length > 0);
  return a;
}

function fakeMinion(cell: number, over: Partial<Minion> = {}): Minion {
  return { uid: 500 + cell, gemId: 'drowned_thralls', name: 'x', art: 'ghoul', cell, life: 100, maxLife: 100, max: 3, reach: 1, attackMs: 1e9, stepMs: 1e9, ...over };
}

describe('the Tides and summons batch', () => {
  it('arrives with Act 5, and its signatures with it', () => {
    for (const id of [...BATCH, ...SUPPORTS]) {
      expect(gemAct(id), id).toBe(5);
      expect(gemReqLevel(id), id).toBeGreaterThanOrEqual(50);
    }
    for (const id of BATCH) expect(gemAct(SUPPORT_GEMS.find((x) => x.signatureFor === id)!.id), id).toBe(5);
  });

  it('every new skill has a signature that fits only it', () => {
    for (const id of BATCH) {
      const sigs = SUPPORT_GEMS.filter((x) => x.signatureFor === id);
      expect(sigs, id).toHaveLength(1);
      expect(supportFits(sigs[0], activeGemDef(id))).toBe(true);
      expect(supportFits(sigs[0], activeGemDef('heavy_strike'))).toBe(false);
    }
  });

  it("can't turn up before Act 5, even at a high level", () => {
    const s = veteran(newGame(1), 70);
    for (const id of [...BATCH, ...SUPPORTS]) expect(gemArrived(s, id), id).toBe(false);
  });

  it('each attribute gets something: a summon for all three, storms for dex and int', () => {
    for (const attr of ['str', 'dex', 'int'] as const) expect(ACTIVE_GEMS.some((g) => g.attr === attr && g.effect.minion), attr).toBe(true);
    expect(activeGemDef('squall').attr).toBe('dex');
    expect(activeGemDef('thunderhead').attr).toBe('int');
  });

  it('tags say what a skill does, so the supports for it fit', () => {
    for (const g of ACTIVE_GEMS) {
      expect(g.tags.includes('minion'), g.id).toBe(!!g.effect.minion);
      expect(g.tags.includes('storm'), g.id).toBe(!!g.effect.storm);
    }
    for (const id of SUMMONS) expect(supportFits(supportGemDef('savage_crew'), activeGemDef(id)), id).toBe(true);
    // a storm tied to a shield can't be doubled: there's one shield at a time
    for (const id of STORMS) expect(supportFits(supportGemDef('stormfront'), activeGemDef(id)), id).toBe(!activeGemDef(id).effect.shieldPct);
    expect(supportFits(supportGemDef('savage_crew'), activeGemDef('thunderhead'))).toBe(false);
    expect(supportFits(supportGemDef('stormfront'), activeGemDef('drowned_thralls'))).toBe(false);
  });

  it("tooltips count a minion's and a storm's damage by how often it strikes", () => {
    const { s, d } = arena(['drowned_thralls', 'thunderhead']);
    const thralls = skillSummary(d, s.skillBar[0]);
    expect(thralls.perSecond).toBeCloseTo((thralls.perUse * 3) / 2, 3);
    const cloud = skillSummary(d, s.skillBar[1]);
    expect(cloud.perSecond).toBeCloseTo(cloud.perUse / 1.5, 3);
  });
});

describe('minions', () => {
  it('a summon calls its minions onto free hexes, and they take a hex', () => {
    const { c, dummy } = summon('drowned_thralls');
    expect(army(c)).toHaveLength(3);
    const cells = new Set([...army(c).map((x) => x.cell), dummy.cell]);
    expect(cells.size).toBe(4);
  });

  it('fighters walk out and hit, and the damage is dealt through the skill', () => {
    const { s, ctx, dummy } = summon('drowned_thralls', { cells: [17] });
    run(s, ctx, 15000, () => damaged(dummy));
    expect(damaged(dummy)).toBe(true);
  });

  it('no minion ever stands on a gate, so none blocks an arrival', () => {
    const { s, ctx, c } = summon('drowned_thralls', { cells: [24] });
    handsOff(s);
    for (let t = 0; t < 8000; t += 50) {
      combatStep(s, ctx, 50, deriveStats(s));
      for (const x of army(c)) expect(cellRing(x.cell)).toBeLessThanOrEqual(MINION_LEASH);
    }
  });

  it('ranged minions stay close and shoot across the field', () => {
    const { s, ctx, c, dummy } = summon('boarding_party', { cells: [24] });
    run(s, ctx, 6000, () => damaged(dummy));
    expect(damaged(dummy)).toBe(true);
    for (const x of army(c)) expect(cellRing(x.cell)).toBeLessThanOrEqual(2);
  });

  it('they stay between packs, rest, and walk home', () => {
    const { s, ctx, c } = summon('drowned_thralls', { cells: [17] });
    const count = army(c).length;
    c.monsters = [];
    army(c)[0].life = army(c)[0].maxLife / 2;
    const before = army(c)[0].life;
    run(s, ctx, 1000);
    expect(army(c)).toHaveLength(count);
    expect(army(c)[0].life).toBeCloseTo(before + army(c)[0].maxLife * MINION_REST_REGEN, 0);
    run(s, ctx, 6000);
    for (const x of army(c)) expect(cellRing(x.cell)).toBe(2);
  });

  it('they go when you leave the area, or take their gem off the bar', () => {
    const a = summon('drowned_thralls');
    startCombat(a.s, a.ctx, 'mudflats');
    expect(army(a.s.combat!)).toHaveLength(0);
    const b = summon('drowned_thralls');
    b.s.skillBar[0] = null;
    run(b.s, b.ctx, 3000);
    expect(army(b.c)).toHaveLength(0);
  });

  it('the rule "its effect is not active" keeps the crew topped up, and stops once it is', () => {
    const { s, ctx, c } = summon('drowned_thralls');
    const rc = () => ruleContext(s, deriveStats(s));
    expect(skillIsActive(c, 'drowned_thralls')).toBe(true);
    expect(ruleAllows({ when: 'notActive' }, rc(), skillIsActive(c, 'drowned_thralls'))).toBe(false);
    army(c).pop();
    expect(skillIsActive(c, 'drowned_thralls')).toBe(false);
    run(s, ctx, 8000, () => army(c).length === 3);
    expect(army(c)).toHaveLength(3);
  });

  it('every gem together stays under the cap', () => {
    const { s, ctx, c } = arena(['drowned_thralls', 'boarding_party', 'tidecallers'], { supports: ['full_muster'] });
    for (const g of s.skillBar) if (g) g.rules = [{ when: 'notActive' }];
    let most = 0;
    for (let t = 0; t < 30000; t += 50) {
      combatStep(s, ctx, 50, deriveStats(s));
      most = Math.max(most, army(c).length);
    }
    expect(most).toBe(MINION_CAP);
  });

  it('monsters beside a minion stop and fight it; a melee monster on you stays on you', () => {
    const m = makeMonster(zoneDef('cinderroad').monsters[0], false, 1);
    m.cell = 5;
    expect(minionInWay(m, [fakeMinion(1)])?.cell).toBe(1);
    m.cell = 1;
    expect(minionInWay(m, [fakeMinion(5)])).toBeUndefined();
    expect(minionInWay(m, [fakeMinion(5, { taunts: true })])?.cell).toBe(5);
  });

  it('a monster takes its swing at the minion, through your defences', () => {
    const { s, ctx, c, dummy } = summon('drowned_thralls');
    handsOff(s);
    const x = army(c)[0];
    c.minions = [x];
    dummy.attackMs = 200;
    dummy.damage = 50;
    dummy.cell = 5;
    x.cell = 4;
    x.stepMs = 1e9;
    const before = s.life;
    const life = x.life;
    run(s, ctx, 1000);
    expect(x.life).toBeLessThan(life);
    expect(s.life).toBe(before);
    expect(ctx.events.some((e) => e.t === 'hit' && e.target === 'minion')).toBe(true);
  });

  it('a fallen minion leaves, and the gem can call another', () => {
    const { s, ctx, c } = summon('drowned_thralls');
    army(c)[0].life = 0;
    run(s, ctx, 100);
    expect(army(c)).toHaveLength(2);
    run(s, ctx, 8000, () => army(c).length === 3);
    expect(army(c)).toHaveLength(3);
  });

  it("the Brute pulls a caster's spell off you", () => {
    const { c } = summon('barnacle_brute');
    const brute = army(c)[0];
    expect(brute.taunts).toBe(true);
    const m = makeMonster(zoneDef('cinderroad').monsters[0], false, 1);
    m.attackKind = 'spell';
    m.cell = 24;
    brute.cell = 13;
    expect(minionInWay(m, army(c))).toBe(brute);
  });

  it('a temporary minion leaves on time', () => {
    const { s, ctx, c } = arena(['leviathan']);
    run(s, ctx, 8000, () => army(c).length > 0);
    expect(army(c)).toHaveLength(1);
    s.skillBar[0]!.rules = [{ when: 'manual' }];
    run(s, ctx, 13900);
    expect(army(c)).toHaveLength(1);
    run(s, ctx, 300);
    expect(army(c)).toHaveLength(0);
  });

  it('you can run at a monster past your own minions: they trade places', () => {
    const m = makeMonster(zoneDef('cinderroad').monsters[0], false, 1);
    m.cell = 5;
    const before = m.cell;
    const allIn = [0, 1, 2, 3].map((c) => fakeMinion(c));
    expect(pullCloser([m], m, allIn)).toBe(true);
    expect(cellRing(m.cell)).toBe(1);
    expect(allIn.some((y) => y.cell === before)).toBe(true);
  });

  it("minions don't touch martyrs or a chained boss", () => {
    const { s, ctx, dummy, monsters } = summon('boarding_party', { pack: 2, cells: [6, 8] });
    dummy.martyr = true;
    monsters[1].chained = true;
    run(s, ctx, 5000);
    expect(damaged(dummy)).toBe(false);
    expect(damaged(monsters[1])).toBe(false);
  });

  it("a minion's hit doesn't spend what you saved for your own next attack", () => {
    const { s, ctx, c, dummy } = summon('boarding_party', { cells: [6] });
    c.ambush = true;
    handsOff(s);
    run(s, ctx, 6000, () => damaged(dummy));
    expect(damaged(dummy)).toBe(true);
    expect(c.ambush).toBe(true);
  });

  it('their hits fill your class meter, like any hit of yours', () => {
    const { s, ctx, c, dummy } = summon('boarding_party', { cells: [6] });
    run(s, ctx, 6000, () => damaged(dummy));
    expect(c.mech).toBeGreaterThan(0);
  });
});

describe('scaling and supports', () => {
  it('attack minions grow with your weapon, spell minions with your spell damage, and both with gem level', () => {
    const a = arena(['drowned_thralls', 'tidecallers']);
    const base = skillSummary(a.d, a.s.skillBar[0]).perUse;
    const cold = skillSummary(a.d, a.s.skillBar[1]).perUse;
    a.s.skillBar[0]!.level = 10;
    a.s.skillBar[1]!.level = 10;
    expect(skillSummary(a.d, a.s.skillBar[0]).perUse).toBeGreaterThan(base * 1.4);
    expect(skillSummary(a.d, a.s.skillBar[1]).perUse).toBeGreaterThan(cold * 1.9);
  });

  it('Savage Crew, Hardened Crew and Full Muster do what they say', () => {
    const plain = arena(['drowned_thralls']);
    const stacked = arena(['drowned_thralls'], { supports: ['hardened_crew', 'full_muster'] });
    const n = (a: typeof plain) => minionStats(a.d, skillNumbers(a.d, a.s.skillBar[0]));
    expect(n(stacked).count).toBe(n(plain).count + 1);
    expect(n(stacked).life).toBeCloseTo(n(plain).life * 1.5, -1);
    const savage = arena(['drowned_thralls'], { supports: ['savage_crew'] });
    expect(skillSummary(savage.d, savage.s.skillBar[0]).perUse).toBeCloseTo(skillSummary(plain.d, plain.s.skillBar[0]).perUse * 1.3, 0);
  });

  it('Drowned Bell speeds the crew up and hits harder', () => {
    const { s, ctx, c } = arena(['drowned_bell']);
    run(s, ctx, 2000, () => c.buffs.length > 0);
    const r = deriveStats(s).raw;
    expect(r.minionPct).toBe(40);
    expect(r.minionSpeedPct).toBe(20);
  });

  it('Deep Toll mends the crew', () => {
    const { s, ctx, c } = arena(['drowned_thralls', 'drowned_bell']);
    s.skillBar[0]!.rules = [{ when: 'always' }];
    s.skillBar[1]!.rules = [{ when: 'manual' }];
    s.skillBar[1]!.supports = [createSupportGem(s, 'deep_toll')];
    run(s, ctx, 8000, () => army(c).length > 0);
    s.skillBar[1]!.rules = [{ when: 'always' }];
    const x = army(c)[0];
    x.life = 1;
    run(s, ctx, 3000, () => c.buffs.length > 0);
    expect(x.life).toBeCloseTo(1 + x.maxLife * 0.3, -1);
  });

  it('Crusted Hide toughens the Brute', () => {
    const { c } = summon('barnacle_brute', { supports: ['crusted_hide'] });
    expect(army(c)[0].tough).toBe(40);
  });

  it('Press Gang heals the crew on a kill, Abyssal Hunger extends the Leviathan', () => {
    const a = summon('drowned_thralls', { supports: ['press_gang'], cells: [12] });
    const x = army(a.c)[0];
    a.dummy.life = 1;
    x.life = 1;
    run(a.s, a.ctx, 8000, () => a.dummy.life <= 0);
    expect(x.life).toBeGreaterThan(1);
    const b = summon('leviathan', { supports: ['abyssal_hunger'], cells: [12] });
    const lev = army(b.c)[0];
    const left = lev.remainingMs!;
    b.dummy.life = 1;
    run(b.s, b.ctx, 8000, () => b.dummy.life <= 0);
    expect(lev.remainingMs!).toBeGreaterThan(left - 6000 + 2000 - 1);
  });

  it('Broadside chains their shots', () => {
    const { s, ctx, monsters } = summon('boarding_party', { supports: ['broadside'], pack: 3, cells: [6, 7, 8] });
    run(s, ctx, 6000, () => monsters.every(damaged));
    expect(monsters.every(damaged)).toBe(true);
  });

  it('Multistrike repeats a thrall\'s blow, and Faster Attacks speeds it', () => {
    const plain = arena(['drowned_thralls']);
    const fast = arena(['drowned_thralls'], { supports: ['faster_attacks'] });
    const at = (a: typeof plain) => minionStats(a.d, skillNumbers(a.d, a.s.skillBar[0])).attackMs;
    expect(at(fast)).toBeCloseTo(at(plain) / 1.25, 3);
    expect(supportFits(supportGemDef('multistrike'), activeGemDef('drowned_thralls'))).toBe(true);
    expect(supportFits(supportGemDef('spell_echo'), activeGemDef('tidecallers'))).toBe(true);
  });
});

describe('storms', () => {
  it('stay on the field after the skill, and hit what stands inside again and again', () => {
    const { s, ctx, c, dummy } = arena(['thunderhead']);
    run(s, ctx, 5000, () => (c.storms?.length ?? 0) > 0);
    expect(c.storms).toHaveLength(1);
    s.skillBar[0]!.rules = [{ when: 'manual' }];
    handsOff(s);
    dummy.moveMs = dummy.stepMs = 1e9;
    const hits = () => ctx.events.filter((e) => e.t === 'hit' && e.target === 'monster' && e.monsterUid === dummy.uid).length;
    run(s, ctx, 6100);
    expect(hits()).toBeGreaterThanOrEqual(4);
  });

  it('hit what walks in afterwards, and spare what walks out', () => {
    const { s, ctx, c, dummy } = arena(['thunderhead']);
    run(s, ctx, 300, () => (c.storms?.length ?? 0) > 0);
    s.skillBar[0]!.rules = [{ when: 'manual' }];
    const st = c.storms![0];
    handsOff(s);
    dummy.moveMs = dummy.stepMs = 1e9;
    dummy.cell = 24;
    run(s, ctx, 200);
    const out = dummy.life;
    run(s, ctx, 3000);
    expect(dummy.life).toBe(out);
    dummy.cell = st.center;
    run(s, ctx, 2000);
    expect(dummy.life).toBeLessThan(out);
  });

  it('blow out on time, keep to the gem\'s limit, and Stormfront raises it', () => {
    const { s, ctx, c } = arena(['thunderhead']);
    run(s, ctx, 16500);
    expect(c.storms!.length).toBe(1);
    s.skillBar[0]!.rules = [{ when: 'manual' }];
    run(s, ctx, 10100);
    expect(c.storms).toHaveLength(0);
    const two = arena(['thunderhead'], { supports: ['stormfront'] });
    run(two.s, two.ctx, 9500);
    expect(two.c.storms).toHaveLength(2);
    expect(stormStats(skillNumbers(two.d, two.s.skillBar[0])).max).toBe(2);
  });

  it('Lingering stretches a storm, Gale Force quickens it', () => {
    const plain = arena(['squall']);
    const long = arena(['squall'], { supports: ['lingering', 'gale_force'] });
    const n = (a: typeof plain) => stormStats(skillNumbers(a.d, a.s.skillBar[0]));
    expect(n(long).durationMs).toBe(n(plain).durationMs * 1.5);
    expect(n(long).everyMs).toBeCloseTo(n(plain).everyMs / 1.3, 3);
  });

  it('a Squall wanders after the nearest enemy', () => {
    const { s, ctx, c, dummy } = arena(['squall'], { cells: [24] });
    run(s, ctx, 3000, () => (c.storms?.length ?? 0) > 0);
    handsOff(s);
    dummy.moveMs = dummy.stepMs = 1e9;
    const st = c.storms![0];
    dummy.cell = 11;
    run(s, ctx, 4000);
    expect(st.center).toBe(11);
  });

  it('a Whirlpool draws what stands in it toward the centre, and chills it', () => {
    const { s, ctx, c, monsters } = arena(['whirlpool'], { pack: 2, cells: [15, 17] });
    for (const m of monsters) m.moveMs = m.stepMs = 1e9;
    run(s, ctx, 300, () => (c.storms?.length ?? 0) > 0);
    s.skillBar[0]!.rules = [{ when: 'manual' }];
    const st = c.storms![0];
    const other = monsters.find((m) => m.cell !== st.center)!;
    run(s, ctx, 4000);
    expect(other.cell === st.center || other.chillMs > 0).toBe(true);
    expect(other.chillMs).toBeGreaterThan(0);
  });
});

describe('Harpoon and Riptide', () => {
  it('drag what they hit toward you; bosses stand their ground', () => {
    const { s, ctx, dummy } = arena(['harpoon'], { cells: [11] });
    const ring = cellRing(dummy.cell);
    run(s, ctx, 4000, () => cellRing(dummy.cell) < ring);
    expect(cellRing(dummy.cell)).toBeLessThan(ring);
    const b = arena(['harpoon'], { cells: [11] });
    b.dummy.isBoss = true;
    run(b.s, b.ctx, 4000, () => damaged(b.dummy));
    expect(cellRing(b.dummy.cell)).toBe(ring);
  });

  it('Reel In brings it all the way, Drag Under stuns', () => {
    const { s, ctx, dummy } = arena(['harpoon'], { supports: ['reel_in'], cells: [11] });
    run(s, ctx, 4000, () => damaged(dummy));
    expect(cellRing(dummy.cell)).toBe(1);
    const r = arena(['riptide'], { supports: ['drag_under'], cells: [5] });
    run(r.s, r.ctx, 6000, () => damaged(r.dummy));
    expect(r.dummy.stunMs).toBeGreaterThan(0);
  });
});

describe('idling', () => {
  it('a summoner keeps fighting offline: rules top up the crew, and kills come in', () => {
    const s = veteran(newGame(1, { name: 't', classId: 'warrior' }), 70);
    s.skillBar = s.skillBar.map(() => null);
    for (const [i, id] of ['drowned_thralls', 'barnacle_brute', 'squall'].entries()) {
      const g = createSkillGem(s, id);
      g.rules = [{ when: 'notActive' }];
      s.skillBar[i] = g;
    }
    s.unlockedZones = ['mudflats', 'cinderroad'];
    const ctx = makeCtx(seeded(3));
    startCombat(s, ctx, 'mudflats');
    const sum = simulateOffline(s, ctx, 10 * 60 * 1000);
    expect(sum.kills).toBeGreaterThan(2);
    expect(sum.died).toBe(false);
    expect(army(s.combat!).length).toBeGreaterThan(0);
  });

  it('minions and storms survive a save and carry on', () => {
    const { s, ctx, c } = summon('drowned_thralls');
    expect(c).toBeTruthy();
    const loaded = deserialize(serialize(s));
    expect(army(loaded.combat!)).toHaveLength(3);
    tick(loaded, ctx, 1000);
    expect(army(loaded.combat!)).toHaveLength(3);
  });

  it('a save from before minions has neither list, and fights on', () => {
    const { s, ctx } = arena(['heavy_strike']);
    delete s.combat!.minions;
    delete s.combat!.storms;
    const loaded = deserialize(serialize(s));
    expect(() => tick(loaded, ctx, 1000)).not.toThrow();
    expect(army(loaded.combat!)).toEqual([]);
  });
});

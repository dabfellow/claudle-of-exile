import { describe, expect, it } from 'vitest';
import type { ClassId } from '../src/data/classes';
import { CLASSES } from '../src/data/classes';
import { PASSIVE_NODES } from '../src/data/passiveTree';
import { zoneDef } from '../src/data/zones';
import { combatStep, makeMonster, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, MIN_COOLDOWN_MS } from '../src/engine/gems';
import { mechanicOf, meterMax } from '../src/engine/mechanics';
import { startNode } from '../src/engine/passives';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameEvent, GameState } from '../src/engine/types';

/** A character in a fight against one durable dummy that never attacks (unless told to). */
function arena(classId: ClassId, gem = 'heavy_strike', passives: string[] = []) {
  const s = newGame(1, { name: 't', classId });
  s.passives.push(...passives);
  s.skillBar = s.skillBar.map(() => null);
  s.skillBar[0] = createSkillGem(s, gem);
  s.skillBar[0].rule = { when: 'always' };
  s.settings.autoFlee = false;
  const ctx = makeCtx(seeded(7));
  startCombat(s, ctx, 'mudflats');
  const dummy = makeMonster(zoneDef('mudflats').monsters[0], false, 1);
  dummy.life = dummy.maxLife = 1e7;
  dummy.attackMs = 1e9;
  s.combat!.monsters = [dummy];
  s.combat!.spawnMs = 1e12; // no new waves
  s.life = deriveStats(s).maxLife;
  s.mana = deriveStats(s).maxMana;
  return { s, ctx, dummy };
}

function run(s: GameState, ctx: ReturnType<typeof makeCtx>, ms: number, until?: () => boolean) {
  for (let t = 0; t < ms && s.combat && !until?.(); t += 50) combatStep(s, ctx, 50, deriveStats(s));
}

const hits = (events: GameEvent[]) => events.filter((e): e is Extract<GameEvent, { t: 'hit' }> => e.t === 'hit' && e.target === 'monster' && !e.dot && !e.evaded);

describe('classes', () => {
  it('there are six, each with its own mechanic and tree start, plus the Exile', () => {
    const six = CLASSES.filter((c) => !c.challenge);
    expect(six.map((c) => c.id).sort()).toEqual(['duelist', 'mage', 'ranger', 'shadow', 'templar', 'warrior']);
    expect(new Set(six.map((c) => c.mechanic)).size).toBe(6);
    expect(new Set(six.map((c) => c.startNode)).size).toBe(6);
    expect(CLASSES.find((c) => c.id === 'exile')?.mechanic).toBeNull();
  });

  it('an Exile starts at the picked tree start with that class’s gems, a Rusted Sword and nothing else', () => {
    const s = newGame(1, { name: 't', classId: 'exile', startNode: 'class_dexint' });
    expect(startNode(s)).toBe('class_dexint');
    expect(s.skillBar.filter(Boolean).map((g) => g!.gemId)).toEqual(['poison_dart', 'spark']);
    expect(Object.keys(s.equipment)).toEqual(['weapon']);
    expect(s.equipment.weapon?.baseId).toBe('rusted_sword');
    const d = deriveStats(s);
    expect([d.raw.str, d.raw.dex, d.raw.int]).toEqual([10, 10, 10]);
    expect(meterMax(mechanicOf(s), d.raw)).toBe(0);
  });

  it('an Exile with no start picked falls back to the Warrior start', () => {
    const s = newGame(1, { name: 't', classId: 'exile' });
    expect(startNode(s)).toBe('class_str');
    expect(newGame(1, { name: 't', classId: 'warrior', startNode: 'class_int' }).character.startNode).toBeUndefined();
  });

  it('an Exile fights normally with no meter', () => {
    const { s, ctx, dummy } = arena('exile');
    run(s, ctx, 5000);
    expect(dummy.life).toBeLessThan(dummy.maxLife);
    expect(s.combat?.mech ?? 0).toBe(0);
  });
});

describe('class mechanics', () => {
  it('Rage builds on hits, adds attack damage and armour, and decays between packs', () => {
    const { s, ctx } = arena('warrior');
    const armour0 = deriveStats(s).armour;
    run(s, ctx, 120_000, () => s.combat!.mech >= 20);
    const c = s.combat!;
    expect(c.mech).toBe(meterMax('rage', deriveStats(s).raw));
    expect(deriveStats(s).armour).toBeGreaterThan(armour0);
    c.monsters = [];
    c.spawnMs = 1e9;
    run(s, ctx, 3000);
    expect(c.mech).toBeLessThan(20);
  });

  it('Momentum builds on attacks for attack speed and is halved by a hit', () => {
    const { s, ctx, dummy } = arena('ranger', 'twin_strike');
    const speed0 = deriveStats(s).attackSpeed;
    run(s, ctx, 60_000, () => s.combat!.mech >= 10);
    const c = s.combat!;
    expect(c.mech).toBe(10);
    expect(deriveStats(s).attackSpeed).toBeGreaterThan(speed0 * 1.25);
    dummy.attackMs = 100;
    dummy.damage = 1;
    s.combat!.evadeMs = 0;
    const before = c.mech;
    run(s, ctx, 3000, () => c.mech < before);
    expect(c.mech).toBeLessThanOrEqual(Math.floor(before / 2) + 1);
  });

  it('Mana is Power: a full tank hits harder than an empty one', () => {
    const full = arena('mage', 'spark');
    const empty = arena('mage', 'spark');
    empty.s.mana = 6; // just enough for a cast or two, then regen only
    run(full.s, full.ctx, 10_000, () => hits(full.ctx.events).length > 0);
    run(empty.s, empty.ctx, 10_000, () => hits(empty.ctx.events).length > 0);
    const first = (e: GameEvent[]) => hits(e)[0]?.amount ?? 0;
    expect(first(full.ctx.events)).toBeGreaterThan(first(empty.ctx.events));
  });

  it('Riposte counter-attacks when the Duelist blocks or evades', () => {
    const { s, ctx, dummy } = arena('duelist');
    s.skillBar = s.skillBar.map(() => null); // no skills: only default attacks and ripostes
    dummy.attackMs = 300;
    dummy.damage = 1;
    s.combat!.evadeMs = 1e9; // evade everything
    run(s, ctx, 6000);
    const evades = ctx.events.filter((e) => e.t === 'hit' && e.target === 'player' && e.evaded).length;
    const ours = hits(ctx.events).length;
    expect(evades).toBeGreaterThan(3);
    // ripostes answer the evades on top of the default attacks
    expect(ours).toBeGreaterThan(evades * 0.5);
  });

  it('Martyr: taking hits fills Fervor, which releases a holy nova that heals and strikes', () => {
    const { s, ctx, dummy } = arena('templar');
    dummy.attackMs = 200;
    dummy.damage = 30;
    run(s, ctx, 15_000, () => ctx.events.some((e) => e.t === 'info' && e.text.includes('holy nova')));
    expect(ctx.events.some((e) => e.t === 'info' && e.text.includes('holy nova'))).toBe(true);
    expect(hits(ctx.events).some((e) => e.dmgType === 'light')).toBe(true);
  });

  it('Malice fills on non-crits and lands a Coup de Grâce Mega Crit when full', () => {
    const { s, ctx } = arena('shadow', 'heavy_strike', ['duelist_ks']); // Steady Hand: never crit, so every hit fills
    s.skillBar[0] = null; // Default Attack only, so every hit is compared like for like
    run(s, ctx, 200_000, () => hits(ctx.events).some((e) => e.mega));
    const all = hits(ctx.events);
    const mega = all.find((e) => e.mega);
    expect(mega).toBeTruthy();
    const normal = all.filter((e) => !e.mega).map((e) => e.amount);
    expect(mega!.amount).toBeGreaterThan(Math.max(...normal) * 2);
  });

  it('the "class meter full" tactic waits for a full meter', () => {
    const { s, ctx } = arena('warrior', 'heavy_strike');
    s.skillBar[1] = createSkillGem(s, 'ground_slam');
    s.skillBar[1].rule = { when: 'meterFull' };
    s.skillBar[0] = null;
    run(s, ctx, 2000);
    expect(ctx.events.some((e) => e.t === 'skill' && e.gemId === 'ground_slam')).toBe(false);
    run(s, ctx, 200_000, () => ctx.events.some((e) => e.t === 'skill' && e.gemId === 'ground_slam'));
    expect(ctx.events.some((e) => e.t === 'skill' && e.gemId === 'ground_slam')).toBe(true);
  });
});

describe('forbidden keystones', () => {
  it("Knife's Edge: life is 1, every hit lands as a 400% Mega Crit that ignores crit multiplier", () => {
    const base = arena('warrior');
    const edge = arena('warrior', 'heavy_strike', ['forbidden_knifes_edge']);
    expect(deriveStats(edge.s).maxLife).toBe(1);
    run(edge.s, edge.ctx, 30_000, () => hits(edge.ctx.events).length >= 4);
    const h = hits(edge.ctx.events);
    expect(h.length).toBeGreaterThan(2);
    expect(h.every((e) => e.mega)).toBe(true);
    // more crit multiplier changes nothing
    const multi = arena('warrior', 'heavy_strike', ['forbidden_knifes_edge']);
    multi.s.passives.push('dex_ks0'); // Glass Edge: +80% crit multiplier
    run(multi.s, multi.ctx, 30_000, () => hits(multi.ctx.events).length >= 4);
    const avg = (e: GameEvent[]) => hits(e).reduce((a, x) => a + x.amount, 0) / hits(e).length;
    expect(avg(multi.ctx.events)).toBeCloseTo(avg(edge.ctx.events), -1);
    expect(base.s.passives).not.toContain('forbidden_knifes_edge');
  });

  it('an attack with no cooldown on top of the bar still lets a buff below it fire, and falls back to a default attack once mana runs out', () => {
    const { s, ctx } = arena('warrior', 'heavy_strike');
    s.skillBar[1] = createSkillGem(s, 'war_cry');
    s.skillBar[1].rule = { when: 'always' };
    run(s, ctx, 60_000);
    const used = (id: string) => ctx.events.filter((e) => e.t === 'skill' && e.gemId === id).length;
    expect(used('war_cry')).toBeGreaterThan(0);
    expect(used('heavy_strike')).toBeGreaterThan(1);
    // the buff went first even though the attack sits above it
    expect(ctx.events.find((e) => e.t === 'skill' && e.gemId !== 'default_attack')).toMatchObject({ gemId: 'war_cry' });
    // no regen in a fight: once the mana is gone it's free default attacks (which emit no skill event)
    expect(used('heavy_strike')).toBeLessThan(deriveStats(s).maxMana);
    expect(hits(ctx.events).length).toBeGreaterThan(used('heavy_strike') + used('war_cry'));
  });

  it('faster Cooldowns shortens the cooldown a skill starts in a fight', () => {
    const fast = PASSIVE_NODES.find((n) => n.kind !== 'keystone' && (n.stats?.cooldownRecovery ?? 0) > 0)!;
    const used = (passives: string[]) => {
      const { s, ctx } = arena('warrior', 'ground_slam', passives);
      run(s, ctx, 20_000, () => s.combat!.cooldowns[0] > 0);
      return s.combat!.cooldowns[0];
    };
    expect(fast).toBeTruthy();
    expect(used([fast.id])).toBeLessThan(used([]));
  });

  it('Overclock: no mana costs and minimum cooldowns, but you overheat and stop acting', () => {
    const { s, ctx } = arena('warrior', 'war_cry', ['forbidden_overclock']);
    s.mana = 0;
    run(s, ctx, 7000);
    const cries = ctx.events.filter((e) => e.t === 'skill' && e.gemId === 'war_cry').length;
    expect(cries).toBeGreaterThan(3);
    expect(s.combat!.cooldowns[0]).toBeLessThanOrEqual(MIN_COOLDOWN_MS);
    run(s, ctx, 2000, () => s.combat!.overheatMs > 0);
    expect(s.combat!.overheatMs).toBeGreaterThan(0);
    const seen = ctx.events.length;
    run(s, ctx, 1500);
    expect(ctx.events.slice(seen).some((e) => e.t === 'skill')).toBe(false);
  });

  it("Eternal Hunger: can't die while fed, dies when it starves", () => {
    const { s, ctx, dummy } = arena('warrior', 'heavy_strike', ['forbidden_eternal_hunger']);
    dummy.attackMs = 100;
    dummy.damage = 1e5;
    run(s, ctx, 3000);
    expect(s.combat).not.toBeNull();
    expect(s.life).toBeGreaterThanOrEqual(1);
    run(s, ctx, 5000);
    expect(s.lifetime.deaths).toBe(1);
  });
});

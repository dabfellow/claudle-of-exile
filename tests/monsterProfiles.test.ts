import { describe, expect, it } from 'vitest';
import '../src/data/maps';
import { EXTRA_ZONES, MARTYR, ZONES, zoneDef } from '../src/data/zones';
import { MONSTER_PROFILES } from '../src/data/monsterProfiles';
import { combatStep, damageMonster, makeMonster, makeMonsterRarity, monsterAilments, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { monsterBasicDps, monsterMitigation, monsterReferenceEhp, monsterReferenceTaken, rechargeMonsterEs } from '../src/engine/monsters';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats, ES_RECHARGE_DELAY_MS, hitChance } from '../src/engine/stats';

describe('monster identities with conserved reference budgets', () => {
  it('preserves effective pools and basic damage for every campaign and map monster, including bosses and packed copies', () => {
    const seen = new Set<string>();
    for (const zone of [...ZONES, ...EXTRA_ZONES]) {
      for (const [def, boss] of [...zone.monsters.map((def) => [def, false] as const), [zone.boss, true] as const]) {
        for (const scale of [1, 0.5]) {
          const m = makeMonster(def, boss, 1, scale);
          const old = { ...m, armour: 0, evasion: undefined, blockChance: 0, spellBlockChance: 0, maxEs: 0, maxLife: m.budget!.life };
          const oldEhp = old.maxLife / monsterReferenceTaken(old);
          expect(monsterReferenceEhp(m), `${zone.id}/${def.id} EHP`).toBeCloseTo(oldEhp, 7);
          const oldDps = m.budget!.damage * 1000 / m.budget!.attackMs;
          expect(monsterBasicDps(m), `${zone.id}/${def.id} DPS`).toBeCloseTo(oldDps, 7);
          expect(m.damage).toBe(m.budget!.damage); // Existing boss mechanics keep their old hit budget.
          seen.add(m.archetype!);
        }
      }
    }
    expect(seen.size).toBeGreaterThanOrEqual(8);
  });

  it('makes ice golems slow, heavy cold hitters and spiders rapid, lower-Life poison attackers', () => {
    const golem = makeMonster(zoneDef('screefields').monsters.find((m) => m.id === 'screegolem')!, false);
    const spider = makeMonster(zoneDef('icevault').monsters.find((m) => m.id === 'icespider')!, false);
    expect(golem.archetype).toBe('ice_golem');
    expect(golem.dmgType).toBe('cold');
    expect(golem.attackMs).toBeGreaterThan(6000);
    expect(spider.archetype).toBe('venom');
    expect(spider.attackMs).toBeLessThan(1500);
    expect(spider.attackAilment).toBe('poison');
    expect(spider.dmgType).toBe('chaos');
    expect(golem.damage * golem.basicDamageMult!).toBeGreaterThan(spider.damage * spider.basicDamageMult!);
    expect(golem.maxLife).toBeGreaterThan(spider.maxLife);
  });

  it('uses player Armour and attack accuracy rules, and caps resistances', () => {
    const def = zoneDef('mudflats').monsters[0];
    const guard = makeMonster({ ...def, level: 40, archetype: 'armoured' }, false);
    const nimble = makeMonster({ ...def, level: 40, archetype: 'duelist' }, false);
    expect(monsterMitigation(guard, 10, 'phys') / 10).toBeLessThan(monsterMitigation(guard, 1000, 'phys') / 1000);
    expect(hitChance(200, 40, nimble.evasion)).toBeLessThan(hitChance(200, 40, guard.evasion));
    guard.res.fire = 200;
    expect(monsterMitigation(guard, 100, 'fire')).toBe(25);
    expect(monsterMitigation(guard, 100, 'fire', 160)).toBe(60);
    expect(monsterMitigation(guard, 100, 'phys', 0, true)).toBe(100);
  });

  it('absorbs hits with ES, lets chaos bypass it and delays recharge', () => {
    const s = newGame(1);
    const mon = makeMonster({ ...zoneDef('mudflats').monsters[0], level: 40, archetype: 'spectral' }, false);
    const life = mon.life;
    const shield = mon.es!;
    damageMonster(s, mon, shield / 2);
    expect(mon.life).toBe(life);
    expect(mon.es).toBeCloseTo(shield / 2);
    damageMonster(s, mon, 10, false, 1);
    expect(mon.life).toBeCloseTo(life - 10);
    expect(mon.es).toBeCloseTo(shield / 2);
    rechargeMonsterEs(mon, ES_RECHARGE_DELAY_MS);
    expect(mon.es).toBeCloseTo(shield / 2);
    rechargeMonsterEs(mon, 500);
    expect(mon.es).toBeCloseTo(shield / 2 + mon.maxEs! * mon.esRechargePct! / 100 / 2);
  });

  it('scales both Life and ES on rarity upgrades instead of granting free shielding', () => {
    const mon = makeMonster({ ...zoneDef('mudflats').monsters[0], level: 40, archetype: 'spectral' }, false);
    const life = mon.maxLife;
    const shield = mon.maxEs!;
    makeMonsterRarity(mon, 'magic', seeded(2), ['stalwart']);
    expect(mon.maxLife).toBeCloseTo(life * 2.5 * 1.7);
    expect(mon.maxEs).toBeCloseTo(shield * 2.5 * 1.7);
    expect(mon.life).toBe(mon.maxLife);
    expect(mon.es).toBe(mon.maxEs);
  });

  it('preserves the original budget increases from resistance, speed and damage modifiers together', () => {
    const mon = makeMonster({ ...zoneDef('mudflats').monsters[0], level: 40, archetype: 'armoured' }, false);
    makeMonsterRarity(mon, 'rare', seeded(2), ['resistant', 'frenzied', 'deadly']);
    const old = { ...mon, armour: 0, evasion: undefined, blockChance: 0, spellBlockChance: 0, maxEs: 0, maxLife: mon.budget!.life };
    expect(monsterReferenceEhp(mon)).toBeCloseTo(monsterReferenceEhp(old), 7);
    expect(monsterBasicDps(mon)).toBeCloseTo(mon.budget!.damage * 1000 / mon.budget!.attackMs, 7);
  });

  it('keeps encounter martyrs plain and new profile fields optional for older runtimes', () => {
    const mon = makeMonster(MARTYR, false);
    expect(mon.archetype).toBeUndefined();
    const s = newGame(1);
    const life = mon.life;
    damageMonster(s, mon, 1);
    expect(mon.life).toBe(life - 1);
    expect(Object.keys(MONSTER_PROFILES)).toHaveLength(9);
  });

  it('round-trips partially depleted monster shields and player poison through a save', () => {
    const s = newGame(1);
    startCombat(s, makeCtx(seeded(3)), 'mudflats');
    const mon = makeMonster({ ...zoneDef('mudflats').monsters[0], archetype: 'spectral' }, false);
    s.combat!.monsters = [mon];
    damageMonster(s, mon, mon.es! / 2);
    s.combat!.playerDots = [{ kind: 'poison', dps: 3, durationMs: 4000, remainingMs: 2500, dealt: 4.5, gemId: 'spider' }];
    const saved = deserialize(serialize(s));
    expect(saved).not.toBeNull();
    expect(saved!.combat!.monsters[0]).toEqual(mon);
    expect(saved!.combat!.playerDots).toEqual(s.combat!.playerDots);
  });
});

describe('monster-inflicted ailments', () => {
  const arena = () => {
    const s = newGame(1);
    const ctx = makeCtx(seeded(5));
    startCombat(s, ctx, 'mudflats');
    s.combat!.monsters = [];
    s.combat!.spawnMs = 1e12;
    s.flaskSlots = s.flaskSlots.map(() => null);
    s.settings.autoFlee = false;
    s.life = 1000;
    s.es = 100;
    const d = { ...deriveStats(s), maxLife: 1000, maxEs: 100, lifeRegen: 0, esRecharge: 0 };
    return { s, ctx, d };
  };

  it('spends the reserved poison budget over time, bypassing ES without applying resistance twice', () => {
    const { s, ctx, d } = arena();
    const mon = makeMonster({ ...zoneDef('mudflats').monsters[0], archetype: 'venom' }, false);
    monsterAilments(s, d, mon, 60, 'chaos');
    expect(s.combat!.playerDots).toHaveLength(1);
    combatStep(s, ctx, 4000, d);
    expect(s.life).toBeCloseTo(980); // 60 × 0.25 / 0.75
    expect(s.es).toBe(100);
    expect(s.combat!.playerDots).toHaveLength(0);
    const logged = ctx.events.filter((e) => e.t === 'hit' && e.target === 'player' && e.dot);
    expect(logged.reduce((sum, e) => sum + (e.t === 'hit' ? e.amount : 0), 0)).toBe(20);
  });

  it('pools fire into Ignite without adding or discarding the remaining damage budget', () => {
    const { s, ctx, d } = arena();
    const mon = makeMonster({ ...zoneDef('mudflats').monsters[0], dmgType: 'fire', archetype: 'caster' }, false);
    // Each hit reserves 300 burn damage: two hits cross the 400-point threshold.
    monsterAilments(s, d, mon, 1700, 'fire');
    monsterAilments(s, d, mon, 1700, 'fire');
    expect(s.combat!.playerDots!.map((dot) => dot.kind)).toEqual(['ignite']);
    const budget = () => s.combat!.playerDots!.reduce((sum, dot) => sum + dot.dps * dot.remainingMs / 1000, 0);
    expect(budget()).toBeCloseTo(600);
    // A further threshold transfers existing Ignite as well as the new burn.
    monsterAilments(s, d, mon, 1700, 'fire');
    monsterAilments(s, d, mon, 1700, 'fire');
    expect(budget()).toBeCloseTo(1200);
    s.life = d.maxLife = 2000;
    s.es = 0;
    combatStep(s, ctx, 6000, d);
    expect(s.life).toBeCloseTo(800);
  });

  it('cold and lightning build Chill/Freeze and Shock, and those ailments expire', () => {
    const { s, ctx, d } = arena();
    const mon = makeMonster(zoneDef('mudflats').monsters[0], false);
    monsterAilments(s, d, mon, 450, 'cold');
    monsterAilments(s, d, mon, 100, 'light');
    expect(s.combat!.playerChillMs).toBeGreaterThan(0);
    expect(s.combat!.frozenMs).toBeGreaterThan(0);
    expect(s.combat!.playerShockMs).toBeGreaterThan(0);
    combatStep(s, ctx, 5000, d);
    expect(s.combat!.playerChillMs).toBe(0);
    expect(s.combat!.playerShockMs).toBe(0);
  });
});

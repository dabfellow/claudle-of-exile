import { describe, expect, it } from 'vitest';
import { zoneDef } from '../src/data/zones';
import { combatStep, makeMonster, startCombat, tickDebt } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem } from '../src/engine/gems';
import { allMods, createUnique } from '../src/engine/items';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';

/** Phases 15–16 merged onto Phase 17: Worldheart, Debt of Stone, The Buried Grudge and The Sum of All Things together. */

const context = () => makeCtx({ next: () => 0.5 });

function arena(opts: { gem?: string; worldheart?: boolean; debt?: boolean; grudge?: boolean; sum?: number; pack?: number } = {}) {
  const s = newGame(1, { name: 'Pairing arena', classId: 'warrior' });
  const c = context();
  s.skills.combat = charXpForLevel(90);
  s.unlockedZones = ['mudflats'];
  s.skillBar.fill(null);
  if (opts.gem) {
    const g = createSkillGem(s, opts.gem);
    g.rules = [{ when: 'always' }];
    s.skillBar[0] = g;
  }
  if (opts.worldheart) s.equipment.belt = createUnique(s, 'worldheart', 90, c.rng);
  if (opts.debt) s.equipment.body = createUnique(s, 'debt_of_stone', 80, c.rng);
  if (opts.grudge) s.equipment.offhand = createUnique(s, 'the_buried_grudge', 80, c.rng);
  if (opts.sum !== undefined) {
    const amulet = createUnique(s, 'the_sum_of_all_things', 90, c.rng);
    allMods(amulet)[0].values = [opts.sum];
    s.equipment.amulet = amulet;
  }
  s.settings.autoFlee = false;
  startCombat(s, c, 'mudflats');
  s.combat!.buffs.push({ id: 'arena', source: 'skill', durationMs: 1e9, remainingMs: 1e9, stats: { str: 200, dex: 200, int: 200, accuracy: 10000, manaRegenPct: 1000 } });
  s.combat!.monsters = Array.from({ length: opts.pack ?? 1 }, (_, i) => {
    const m = makeMonster(zoneDef('mudflats').monsters[0], false, i + 10);
    m.life = m.maxLife = 1e7;
    m.armour = m.evasion = m.es = m.maxEs = 0;
    m.blockChance = m.spellBlockChance = 0;
    m.attackMs = 1e9;
    m.cell = i;
    m.res = { fire: 0, cold: 0, light: 0, chaos: 0 };
    m.attackAilment = undefined;
    m.dotShare = 0;
    return m;
  });
  s.combat!.spawnMs = 1e12;
  s.mana = deriveStats(s).maxMana;
  s.life = deriveStats(s).maxLife;
  return { s, c, mon: s.combat!.monsters[0] };
}

function step(s: GameState, c: ReturnType<typeof context>, ms: number) {
  for (let t = 0; t < ms; t += 50) combatStep(s, c, Math.min(50, ms - t), deriveStats(s));
}

/** One unblocked monster hit; returns the first Debt tranche. */
function debtHit(worldheart: boolean) {
  const { s, c, mon } = arena({ debt: true, worldheart });
  s.debtQueue = [];
  s.combat!.evadeMs = 0;
  s.combat!.blocks = 0;
  mon.damage = 400;
  mon.attackMs = 50;
  mon.attackTimer = 50;
  step(s, c, 100);
  return { s, c, tranche: s.debtQueue![0] };
}

/** One fully blocked monster hit; returns the stored Grudge charge. */
function grudgeBlock(worldheart: boolean) {
  const { s, c, mon } = arena({ grudge: true, worldheart });
  s.buriedGrudgeCharge = 0;
  s.combat!.blocks = 5;
  mon.damage = 400;
  mon.attackMs = 50;
  mon.attackTimer = 50;
  step(s, c, 100);
  return s.buriedGrudgeCharge ?? 0;
}

describe('Worldheart with Debt of Stone', () => {
  it('Debt defers half of the already-reduced hit', () => {
    const plain = debtHit(false).tranche, heart = debtHit(true).tranche;
    expect(plain.totalAmount).toBeGreaterThan(0);
    expect(heart.totalAmount / plain.totalAmount).toBeCloseTo(0.7, 1);
  });

  it('deferred ticks are not reduced by Worldheart a second time', () => {
    const { s, c } = debtHit(true);
    const before = s.life, owed = (s.debtQueue ?? []).reduce((a, t) => a + t.perMs * Math.min(t.remainingMs, 1000), 0);
    tickDebt(s, c, 1000, deriveStats(s));
    expect(before - s.life).toBeCloseTo(owed, 4);
  });
});

describe('Worldheart with The Buried Grudge', () => {
  it('stores prevented damage from the hit after Worldheart, once', () => {
    const plain = grudgeBlock(false), heart = grudgeBlock(true);
    expect(plain).toBeGreaterThan(0);
    expect(heart / plain).toBeCloseTo(0.7, 1);
  });
});

describe('The Sum of All Things with The Buried Grudge', () => {
  function slamDamage(charge: number, sum?: number) {
    const { s, c } = arena({ gem: 'ground_slam', grudge: true, sum, pack: 2 });
    s.buriedGrudgeCharge = charge;
    step(s, c, 300);
    expect(s.buriedGrudgeCharge).toBe(0);
    return s.combat!.monsters.reduce((a, m) => a + (m.maxLife - m.life), 0);
  }

  it('multiplies the shockwave exactly once', () => {
    const shockwave = slamDamage(1000) - slamDamage(0);
    const doubled = slamDamage(1000, 100) - slamDamage(0, 100);
    expect(shockwave).toBeGreaterThan(0);
    expect(doubled / shockwave).toBeCloseTo(2, 2);
  });
});

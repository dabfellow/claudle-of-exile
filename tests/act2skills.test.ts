import { describe, expect, it } from 'vitest';
import { ACTIVE_GEMS, SUPPORT_GEMS, activeGemDef, gemAct, gemReqLevel, supportGemDef } from '../src/data/gems';
import { zoneDef } from '../src/data/zones';
import { PLAYER_SPOT, cellRing } from '../src/engine/battlefield';
import { combatStep, CURSE_BOSS_EFFECT, makeMonster, monsterStatuses, skillIsActive, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, createSupportGem, skillNumbers, supportFits } from '../src/engine/gems';
import { refreshVendor } from '../src/engine/hideout';
import { dropGem } from '../src/engine/loot';
import { gemArrived, reachedAct } from '../src/engine/progress';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame, SAVE_VERSION } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { armFor, veteran } from './helpers';

const BATCH = ['cavalry_charge', 'raiding_leap', 'parting_shot', 'ember_dash', 'tailwind', 'arcane_surge', 'vulnerability', 'hobble', 'elemental_weakness', 'enfeeble'];
const ACT_2_ZONES = ['mudflats', 'cinderroad'];

/** One skill on the bar, optionally with supports, against dummies that stand still and never attack unless told to. */
function arena(gem: string, opts: { supports?: string[]; pack?: number; boss?: boolean } = {}) {
  const s = veteran(newGame(1, { name: 't', classId: 'warrior' }));
  s.skillBar = s.skillBar.map(() => null);
  const g = createSkillGem(s, gem);
  g.rules = [{ when: 'always' }];
  g.extraSlots = 1;
  g.supports = (opts.supports ?? []).map((id) => createSupportGem(s, id));
  s.skillBar[0] = g;
  armFor(s, gem);
  s.unlockedZones = [...ACT_2_ZONES];
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
  s.life = deriveStats(s).maxLife;
  s.mana = deriveStats(s).maxMana;
  return { s, ctx, dummy: monsters[0], monsters };
}

function run(s: GameState, ctx: ReturnType<typeof makeCtx>, ms: number, until?: () => boolean) {
  for (let t = 0; t < ms && s.combat && !until?.(); t += 50) combatStep(s, ctx, 50, deriveStats(s));
}

const used = (ctx: ReturnType<typeof makeCtx>) => ctx.events.some((e) => e.t === 'skill');

describe('gems tied to acts', () => {
  it('splits the pool: Act 1 keeps skills up to level 12, the level 16 skills join Act 2, level 32 and up waits for Act 3, level 40 and up for Act 4, level 50 and up for Act 5, level 58 and up for Act 6', () => {
    for (const g of ACTIVE_GEMS) {
      if (gemReqLevel(g.id) <= 12) expect(gemAct(g.id), g.id).toBe(1);
      else if (gemReqLevel(g.id) < 32) expect(gemAct(g.id), g.id).toBe(2);
      else if (gemReqLevel(g.id) >= 58) expect(gemAct(g.id), g.id).toBe(6);
      else if (gemReqLevel(g.id) >= 50) expect(gemAct(g.id), g.id).toBe(5);
      else if (gemReqLevel(g.id) >= 40) expect(gemAct(g.id), g.id).toBe(4);
      else expect(gemAct(g.id), g.id).toBe(3);
    }
  });

  it('a signature support arrives with its skill', () => {
    for (const g of SUPPORT_GEMS.filter((x) => x.signatureFor)) expect(gemAct(g.id), g.id).toBe(gemAct(g.signatureFor!));
  });

  it('the act comes from the areas open, not the level', () => {
    const s = veteran(newGame(1));
    expect(reachedAct(s)).toBe(1);
    expect(gemArrived(s, 'backstab')).toBe(false);
    s.unlockedZones = ACT_2_ZONES;
    expect(reachedAct(s)).toBe(2);
    expect(gemArrived(s, 'backstab')).toBe(true);
    expect(gemArrived(s, 'lacerate')).toBe(false);
  });

  it('a gem from a later act never drops, even for a high-level character', () => {
    const s = veteran(newGame(1), 60);
    const ctx = makeCtx(seeded(3));
    for (let i = 0; i < 600; i++) dropGem(s, ctx, 60);
    for (const g of s.gems) expect(gemAct(g.gemId), g.gemId).toBe(1);
    for (const g of s.supportGems) expect(gemAct(g.supportId), g.supportId).toBe(1);
  });

  it('reaching Act 2 opens its batch to drops', () => {
    const s = veteran(newGame(1), 60);
    s.unlockedZones = ACT_2_ZONES;
    const ctx = makeCtx(seeded(3));
    for (let i = 0; i < 600; i++) dropGem(s, ctx, 60);
    expect(s.gems.some((g) => BATCH.includes(g.gemId))).toBe(true);
    expect(s.gems.some((g) => g.gemId === 'lacerate')).toBe(false);
  });

  it('the Gem shop stocks what has arrived, the newest act heaviest', () => {
    const count = (zones: string[]) => {
      const s = veteran(newGame(1), 60);
      s.unlockedZones = zones;
      let batch = 0;
      for (let i = 0; i < 100; i++) {
        refreshVendor(s, seeded(i));
        batch += s.vendor.stock.filter((o) => o.gemId && gemAct(o.gemId) === 2).length;
        expect(s.vendor.stock.some((o) => o.gemId === 'lacerate')).toBe(false);
      }
      return batch;
    };
    expect(count(['mudflats'])).toBe(0);
    // 13 of the 33 skills that have arrived are Act 2's, at three times the weight
    expect(count(ACT_2_ZONES)).toBeGreaterThan(100);
  });

  it('beating the act boss puts the new batch on sale at once', () => {
    const { s, ctx, dummy } = arena('heavy_strike');
    s.combat!.zoneId = 'sanctum';
    s.unlockedZones = ['mudflats', 'sanctum'];
    s.bossesDefeated = zoneDef('cinderroad').requires?.after ?? ['sanctum'];
    s.bossesDefeated = s.bossesDefeated.filter((z) => z !== 'sanctum');
    s.vendor.refreshAt = 1e12;
    dummy.isBoss = true;
    dummy.life = 1;
    run(s, ctx, 8000, () => reachedAct(s) === 2);
    expect(reachedAct(s)).toBe(2);
    expect(s.vendor.refreshAt).toBe(0);
    expect(ctx.events.some((e) => e.t === 'info' && /Act 2/.test(e.text))).toBe(true);
  });

  it('existing characters keep everything: no migration, later-act gems stay usable and socketed', () => {
    const s = veteran(newGame(1, { name: 't', classId: 'duelist' }), 45);
    const lace = createSkillGem(s, 'lacerate', 3);
    lace.supports[0] = createSupportGem(s, 'hemorrhage');
    s.skillBar[1] = lace;
    const backstab = createSkillGem(s, 'backstab');
    s.gems.push(backstab);
    s.supportGems.push(createSupportGem(s, 'verdict'));
    expect(reachedAct(s)).toBe(1);

    const loaded = deserialize(serialize(s));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.skillBar[1]!.gemId).toBe('lacerate');
    expect(loaded.skillBar[1]!.level).toBe(3);
    expect(loaded.skillBar[1]!.supports[0]?.supportId).toBe('hemorrhage');
    expect(loaded.gems.some((g) => g.gemId === 'backstab')).toBe(true);
    expect(loaded.supportGems.some((g) => g.supportId === 'verdict')).toBe(true);
    expect(skillNumbers(deriveStats(loaded), loaded.skillBar[1]).mods.specials.has('hemorrhage')).toBe(true);
  });
});

describe('Riders and raiders', () => {
  it('every new skill has a signature that fits only it, level 20 or higher', () => {
    for (const id of BATCH) {
      const sigs = SUPPORT_GEMS.filter((x) => x.signatureFor === id);
      expect(sigs, id).toHaveLength(1);
      expect(supportFits(sigs[0], activeGemDef(id))).toBe(true);
      expect(gemReqLevel(id)).toBeGreaterThanOrEqual(20);
    }
  });

  it('every class has a way out of the ground: melee, bows and spells', () => {
    expect(activeGemDef('cavalry_charge').weapons).toContain('mace');
    expect(activeGemDef('raiding_leap').weapons).toContain('dagger');
    expect(activeGemDef('parting_shot').weapons).toEqual(['bow']);
    expect(activeGemDef('ember_dash').weapons).toBeUndefined();
  });

  it('Dexterity and Intelligence now have buffs', () => {
    expect(ACTIVE_GEMS.filter((g) => g.role === 'buff').map((g) => g.attr)).toEqual(expect.arrayContaining(['dex', 'int']));
  });

  for (const id of ['cavalry_charge', 'raiding_leap', 'parting_shot', 'ember_dash']) {
    it(`${id} steps out of what's under you`, () => {
      const { s, ctx } = arena(id);
      s.combat!.ground.push({ cell: PLAYER_SPOT, kind: 'burning', dps: 5, remainingMs: 6000, durationMs: 6000 }, { cell: 20, kind: 'burning', dps: 5, remainingMs: 6000, durationMs: 6000 });
      run(s, ctx, 3000, () => used(ctx));
      expect(s.combat!.ground.some((g) => g.cell === PLAYER_SPOT)).toBe(false);
      expect(s.combat!.ground.some((g) => g.cell === 20)).toBe(true);
    });
  }

  it('a charge reaches the far edge and drags the target into melee range, but not a boss', () => {
    const a = arena('cavalry_charge');
    a.dummy.cell = a.dummy.cell + 30;
    expect(cellRing(a.dummy.cell)).toBeGreaterThan(1);
    run(a.s, a.ctx, 3000, () => used(a.ctx));
    expect(cellRing(a.dummy.cell)).toBe(1);

    const b = arena('raiding_leap', { boss: true });
    b.dummy.cell = 12;
    const ring = cellRing(b.dummy.cell);
    run(b.s, b.ctx, 3000, () => used(b.ctx));
    expect(cellRing(b.dummy.cell)).toBe(ring);
  });

  it('Ember Dash leaves the line burning, twice as hot with Ember Trail', () => {
    const burn = (supports: string[]) => {
      const a = arena('ember_dash', { supports });
      run(a.s, a.ctx, 500, () => used(a.ctx));
      return a.s.combat!.ground.filter((g) => g.cell !== PLAYER_SPOT);
    };
    expect(burn([]).length).toBeGreaterThan(1);
    expect(burn(['ember_trail'])[0].dps).toBeGreaterThan(burn([])[0].dps * 1.5);
  });

  it('Surefoot: for 3s nothing under you hurts', () => {
    const { s, ctx } = arena('raiding_leap', { supports: ['surefoot'] });
    run(s, ctx, 3000, () => used(ctx));
    const life = s.life;
    s.combat!.ground.push({ cell: PLAYER_SPOT, kind: 'burning', dps: 500, remainingMs: 6000, durationMs: 6000 });
    run(s, ctx, 1000);
    expect(s.life).toBe(life);
    run(s, ctx, 2500);
    expect(s.life).toBeLessThan(life);
  });

  it('Tailwind burns out hazards under you twice as fast, and Gale Rider speeds cooldowns', () => {
    const a = arena('tailwind', { supports: ['gale_rider'] });
    run(a.s, a.ctx, 2000, () => used(a.ctx));
    a.s.combat!.ground.push({ cell: PLAYER_SPOT, kind: 'burning', dps: 0, remainingMs: 2000, durationMs: 2000 });
    run(a.s, a.ctx, 1100);
    expect(a.s.combat!.ground).toHaveLength(0);
    expect(deriveStats(a.s).raw.cooldownRecovery).toBeGreaterThanOrEqual(25);
  });

  it('Arcane Surge raises spell damage, Overflow lowers costs', () => {
    const { s, ctx } = arena('arcane_surge', { supports: ['overflow'] });
    run(s, ctx, 1000, () => used(ctx));
    const r = deriveStats(s).raw;
    expect(r.spellPct).toBeGreaterThanOrEqual(30);
    expect(r.manaCostReduction).toBeGreaterThanOrEqual(25);
  });

  it('Fresh Horses shortens a cooldown, Deep Hex deepens a curse', () => {
    const a = arena('cavalry_charge', { supports: ['fresh_horses'] });
    expect(skillNumbers(deriveStats(a.s), a.s.skillBar[0]).cooldownMs).toBeCloseTo(5250, -1);
    const b = arena('enfeeble', { supports: ['deep_hex'] });
    run(b.s, b.ctx, 500, () => used(b.ctx));
    expect(b.dummy.curse!.dealLess).toBeCloseTo(25 * 1.3, 5);
  });
});

describe('curses', () => {
  it('land on the target and its neighbours, show as a status and count as active', () => {
    const { s, ctx, dummy, monsters } = arena('vulnerability', { pack: 4 });
    monsters[3].cell = 30;
    run(s, ctx, 500, () => used(ctx));
    expect(dummy.curse?.gemId).toBe('vulnerability');
    expect(monsterStatuses(dummy).has('cursed')).toBe(true);
    expect(skillIsActive(s.combat!, 'vulnerability')).toBe(true);
    expect(monsters[3].curse).toBeUndefined();
  });

  it('wear off, and an enemy carries only one', () => {
    const { s, ctx, dummy } = arena('hobble');
    run(s, ctx, 500, () => used(ctx));
    s.combat!.cooldowns[0] = 1e9;
    run(s, ctx, 9000);
    expect(dummy.curse).toBeUndefined();

    dummy.curse = { gemId: 'enfeeble', remainingMs: 8000, durationMs: 8000, physTaken: 0, resPen: 0, dealLess: 25, slow: 0 };
    s.combat!.cooldowns[0] = 0;
    run(s, ctx, 5000, () => dummy.curse?.gemId === 'hobble');
    expect(dummy.curse?.gemId).toBe('hobble');
    expect(dummy.curse?.dealLess).toBe(0);
  });

  it('bosses take half the effect, and Wide Hex reaches the whole field', () => {
    const a = arena('elemental_weakness', { boss: true });
    run(a.s, a.ctx, 500, () => used(a.ctx));
    expect(a.dummy.curse!.resPen).toBeCloseTo(30 * CURSE_BOSS_EFFECT, 5);

    const b = arena('enfeeble', { pack: 3, supports: ['wide_hex'] });
    b.monsters[2].cell = 30;
    run(b.s, b.ctx, 500, () => used(b.ctx));
    expect(b.monsters.every((m) => m.curse)).toBe(true);
  });

  it('Vulnerability makes physical hits land harder, Elemental Weakness elemental ones', () => {
    const avg = (curse: Partial<MonsterInstance['curse']> | null, gem: string) => {
      const { s, ctx, dummy } = arena(gem);
      if (curse) dummy.curse = { gemId: 'x', remainingMs: 1e9, durationMs: 1e9, physTaken: 0, resPen: 0, dealLess: 0, slow: 0, ...curse };
      run(s, ctx, 20_000);
      return dummy.maxLife - dummy.life;
    };
    expect(avg({ physTaken: 30 }, 'heavy_strike')).toBeGreaterThan(avg(null, 'heavy_strike') * 1.15);
    expect(avg({ resPen: 30 }, 'ember_dash')).toBeGreaterThan(avg(null, 'ember_dash') * 1.15);
  });

  it('Enfeeble softens hits, Hobble slows attacks', () => {
    const damageTaken = (curse: Partial<MonsterInstance['curse']> | null) => {
      const { s, ctx, dummy } = arena('heavy_strike');
      s.skillBar[0] = null;
      s.equipment = {};
      dummy.attackMs = 1000;
      dummy.damage = 20;
      dummy.dmgType = 'fire';
      if (curse) dummy.curse = { gemId: 'x', remainingMs: 1e9, durationMs: 1e9, physTaken: 0, resPen: 0, dealLess: 0, slow: 0, ...curse };
      const hits = ctx.events;
      run(s, ctx, 20_000);
      return hits.filter((e) => e.t === 'hit' && e.target === 'player').reduce((sum, e) => sum + (e.t === 'hit' ? e.amount : 0), 0);
    };
    const plain = damageTaken(null);
    expect(damageTaken({ dealLess: 25 })).toBeLessThan(plain * 0.9);
    expect(damageTaken({ slow: 25 })).toBeLessThan(plain * 0.9);
  });

  it('signatures: Cracked Hide breaks armour, Snare stops the target, Contagion jumps, Wither Will heals', () => {
    const a = arena('vulnerability', { supports: ['cracked_hide'] });
    run(a.s, a.ctx, 500, () => used(a.ctx));
    expect(a.dummy.vulnMs).toBeGreaterThan(7000);

    const b = arena('hobble', { supports: ['snare'] });
    run(b.s, b.ctx, 100, () => used(b.ctx));
    expect(b.dummy.stunMs).toBeGreaterThan(0);

    const c = arena('elemental_weakness', { pack: 2, supports: ['contagion'] });
    c.monsters[1].cell = 30;
    run(c.s, c.ctx, 500, () => used(c.ctx));
    c.s.combat!.cooldowns[0] = 1e9;
    expect(c.monsters[1].curse).toBeUndefined();
    c.dummy.life = 0;
    run(c.s, c.ctx, 100);
    expect(c.monsters[1].curse?.gemId).toBe('elemental_weakness');

    const d = arena('enfeeble', { pack: 2, supports: ['wither_will'] });
    d.monsters[1].cell = 30;
    run(d.s, d.ctx, 500, () => used(d.ctx));
    d.s.life = 10;
    d.dummy.life = 0;
    run(d.s, d.ctx, 100);
    expect(d.s.life).toBeGreaterThan(10);
  });

  it('supports for curses and movement fit only those', () => {
    expect(supportFits(supportGemDef('deep_hex'), activeGemDef('hobble'))).toBe(true);
    expect(supportFits(supportGemDef('deep_hex'), activeGemDef('heavy_strike'))).toBe(false);
    expect(supportFits(supportGemDef('surefoot'), activeGemDef('ember_dash'))).toBe(true);
    expect(supportFits(supportGemDef('surefoot'), activeGemDef('tailwind'))).toBe(false);
    expect(supportFits(supportGemDef('spell_echo'), activeGemDef('enfeeble'))).toBe(false);
  });
});

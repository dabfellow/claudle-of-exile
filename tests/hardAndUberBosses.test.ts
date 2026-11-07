import { describe, expect, it } from 'vitest';
import { HARD_BOSSES, UBER_BOSSES } from '../src/data/maps';
import { BOSS_KEY_CRAFTS } from '../src/data/skills';
import { zoneDef } from '../src/data/zones';
import { bossLeftToRules, unlockEverything } from '../src/engine/automation';
import { combatStep, lockTarget, targetOrder } from '../src/engine/combat';
import type { Ctx } from '../src/engine/context';
import { atlasPointsEarned, canStartHardBoss, canStartUberBoss, devKit, startHardBoss, startUberBoss } from '../src/engine/maps';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';

const makeCtx = (seed = 1): Ctx => ({ rng: seeded(seed), now: 0, emit: () => {} });

function unlockEndgame(s = newGame(1)) {
  const ctx = makeCtx(1);
  devKit(s, ctx, 90);
  if (!s.bossesDefeated.includes('shatteredthrone')) s.bossesDefeated.push('shatteredthrone');
  s.account.hideout.map_device = 1;
  return s;
}

describe('Milestone 9: Hard Bosses & Uber Layer', () => {
  it('defines 5 Hard Bosses, 3 Uber Bosses, and boss key crafting recipes', () => {
    expect(HARD_BOSSES).toHaveLength(5);
    expect(UBER_BOSSES).toHaveLength(3);
    expect(BOSS_KEY_CRAFTS.map((a) => a.id)).toEqual([
      'smith_marrow_key',
      'cut_bell_key',
      'brew_abyssal_key',
      'carve_regent_key',
      'smith_crownless_key',
      'smith_crownless_key_shards',
    ]);
  });

  it('consumes a Hard Boss key to open the arena and returns to hideout after killing the boss', () => {
    const s = unlockEndgame();
    const ctx = makeCtx(42);
    expect(canStartHardBoss(s, 'ossuar')).toMatch(/Requires 1/);

    s.account.bank.marrow_key = 1;
    expect(canStartHardBoss(s, 'ossuar')).toBeNull();
    expect(startHardBoss(s, ctx, 'ossuar')).toBeNull();
    expect(s.account.bank.marrow_key ?? 0).toBe(0);
    expect(s.combat?.zoneId).toBe('hard_ossuar');

    const d = deriveStats(s);
    // Advance until boss spawns
    for (let i = 0; i < 25 && !s.combat?.monsters.some((m) => m.isBoss); i++) {
      combatStep(s, ctx, 100, d);
    }
    const boss = s.combat?.monsters.find((m) => m.isBoss);
    expect(boss).toBeDefined();
    expect(boss?.name).toBe('Ossuar, the Hollow Mountain');
    expect(boss?.plated).toBe(true);

    // Kill the boss and verify guaranteed trophy + first-kill unique + arena exit
    boss!.life = 0;
    combatStep(s, ctx, 50, d);
    expect(s.combat).toBeNull();
    expect(s.bossesDefeated).toContain('hard_ossuar');
    expect(s.account.bank.marrow_shard).toBe(1);
    expect(atlasPointsEarned(s)).toBe(3);
    const allItems = [...s.inventory, ...(s.ground ?? [])];
    expect(allItems.some((it) => it.uniqueId === 'faultline')).toBe(true);
  });

  it('handles Ossuar bone plating and Cracked Fault weak point mechanics', () => {
    const s = unlockEndgame();
    const ctx = makeCtx(7);
    s.account.bank.marrow_key = 1;
    startHardBoss(s, ctx, 'ossuar');
    const d = deriveStats(s);
    for (let i = 0; i < 20 && !s.combat?.monsters.some((m) => m.isBoss); i++) {
      combatStep(s, ctx, 100, d);
    }
    const boss = s.combat!.monsters.find((m) => m.isBoss)!;
    expect(boss.plated).toBe(true);

    // Step past initial plating timer (5000ms) so Cracked Fault spawns
    for (let i = 0; i < 60 && !s.combat?.monsters.some((m) => m.weakPoint); i++) {
      s.life = d.maxLife;
      combatStep(s, ctx, 100, d);
    }
    const wp = s.combat!.monsters.find((m) => m.weakPoint);
    expect(wp).toBeDefined();

    // Verify weakPoint aim prioritizes the Cracked Fault
    const aimed = targetOrder(s, 'weakPoint');
    expect(aimed[0]?.uid).toBe(wp!.uid);

    // Lock target for manual bonus and shatter the Cracked Fault
    lockTarget(s, wp!.uid);
    wp!.life = 0;
    combatStep(s, ctx, 50, d);
    expect(boss.plated).toBe(false);
    expect(boss.platingBreakMs).toBeGreaterThan(10000);
    expect(boss.vulnMs).toBeGreaterThan(0);
  });

  it('handles Mother Vael Choir of Vael wave spawning, priority targeting, and scattering', () => {
    const s = unlockEndgame();
    const ctx = makeCtx(11);
    s.account.bank.bell_key = 1;
    startHardBoss(s, ctx, 'mother_vael');
    const d = deriveStats(s);
    for (let i = 0; i < 20 && !s.combat?.monsters.some((m) => m.isBoss); i++) {
      combatStep(s, ctx, 100, d);
    }

    // Advance until Choir wave spawns (6000ms initial timer)
    for (let i = 0; i < 70 && !s.combat?.monsters.some((m) => m.choir); i++) {
      s.life = d.maxLife;
      combatStep(s, ctx, 100, d);
    }
    const singers = s.combat!.monsters.filter((m) => m.choir);
    expect(singers.length).toBeGreaterThanOrEqual(2);

    // Verify 'choir' aim orders Mending Singer first
    const ordered = targetOrder(s, 'choir');
    expect(ordered[0]?.choir).toBe('mending');

    // Killing one singer scatters the rest of the Choir wave
    ordered[0]!.life = 0;
    combatStep(s, ctx, 50, d);
    expect(s.combat!.monsters.filter((m) => m.choir && m.life > 0)).toHaveLength(0);
  });

  it('handles Twin Regents dual-boss spawning, Royal Guard target switching, and completion only after both die', () => {
    const s = unlockEndgame();
    const ctx = makeCtx(19);
    s.account.bank.regent_key = 1;
    startHardBoss(s, ctx, 'twin_regents');
    const d = deriveStats(s);
    for (let i = 0; i < 20 && !s.combat?.monsters.some((m) => m.isBoss); i++) {
      combatStep(s, ctx, 100, d);
    }
    const bosses = s.combat!.monsters.filter((m) => m.isBoss);
    expect(bosses).toHaveLength(2);
    const [solis, luna] = bosses;
    expect(solis.name).toContain('Regent Sol');
    expect(luna.name).toContain('Regent Luna');

    // Put Solis under Royal Guard and verify targetOrder prioritizes unguarded Luna
    solis.guardedMs = 7000;
    s.settings.targeting = { priority: 'boss', order: 'closest' };
    const order = targetOrder(s);
    expect(order[0]?.uid).toBe(luna.uid);

    // Kill Solis first: arena should stay open while Luna lives
    solis.life = 0;
    combatStep(s, ctx, 50, d);
    expect(s.combat).not.toBeNull();
    expect(s.account.bank.throne_ash ?? 0).toBe(0);

    // Kill Luna: arena completes and drops Throne Ash + Twinned Crown
    luna.life = 0;
    combatStep(s, ctx, 50, d);
    expect(s.combat).toBeNull();
    expect(s.account.bank.throne_ash).toBe(1);
    const allItems = [...s.inventory, ...(s.ground ?? [])];
    expect(allItems.some((it) => it.uniqueId === 'twinned_crown')).toBe(true);
  });

  it('handles The Crownless 3-phase transitions', () => {
    const s = unlockEndgame();
    const ctx = makeCtx(23);
    s.account.bank.crownless_key = 1;
    startHardBoss(s, ctx, 'crownless');
    const d = deriveStats(s);
    for (let i = 0; i < 20 && !s.combat?.monsters.some((m) => m.isBoss); i++) {
      combatStep(s, ctx, 100, d);
    }
    const boss = s.combat!.monsters.find((m) => m.isBoss)!;
    expect(boss.crownlessPhase).toBe(1);
    expect(boss.plated).toBe(true);

    // Drop to 60% life -> Phase 2 (Choir of Vael)
    boss.life = Math.round(boss.maxLife * 0.6);
    s.life = d.maxLife;
    combatStep(s, ctx, 100, d);
    expect(boss.crownlessPhase).toBe(2);
    expect(boss.plated).toBe(false);
    expect(s.combat!.monsters.some((m) => m.choir)).toBe(true);

    // Drop to 30% life -> Phase 3 (Abyssal Undertow)
    boss.life = Math.round(boss.maxLife * 0.3);
    s.life = d.maxLife;
    combatStep(s, ctx, 100, d);
    expect(boss.crownlessPhase).toBe(3);
    expect(s.combat!.monsters.some((m) => m.choir)).toBe(false);
  });

  it('handles Uber Bosses (First Exile, Architect of Ruin, Void Sovereign) and guaranteed Doom Sigil drops', () => {
    const s = unlockEndgame();
    const ctx = makeCtx(99);
    expect(canStartUberBoss(s, 'uber_void_sovereign')).toMatch(/Requires 1/);

    s.account.bank.uber_key_3 = 1;
    expect(startUberBoss(s, ctx, 'uber_void_sovereign')).toBeNull();
    expect(s.account.bank.uber_key_3 ?? 0).toBe(0);

    const d = deriveStats(s);
    for (let i = 0; i < 20 && !s.combat?.monsters.some((m) => m.isBoss); i++) {
      combatStep(s, ctx, 100, d);
    }
    const boss = s.combat!.monsters.find((m) => m.isBoss)!;
    expect(boss.voidShielded).toBe(true);
    expect(boss.voidBuildup).toBe(0);

    // Kill Void Sovereign and verify Void Doom Sigil + exclusive unique
    boss.life = 0;
    combatStep(s, ctx, 50, d);
    expect(s.combat).toBeNull();
    expect(s.account.bank.void_sigil).toBe(1);
    expect(atlasPointsEarned(s)).toBe(5);
    const allItems = [...s.inventory, ...(s.ground ?? [])];
    expect(allItems.some((it) => it.uniqueId === 'void_crown' || it.uniqueId === 'sovereigns_grasp')).toBe(true);
  });

  it('verifies bossLeftToRules checks weakPoint and choir aims for Hard Bosses', () => {
    const s = unlockEndgame();
    unlockEverything(s);
    s.skillBar.fill(null);
    s.skillBar[0] = {
      uid: 1,
      gemId: 'parry',
      level: 1,
      xp: 0,
      extraSlots: 0,
      priority: 'normal',
      supports: [],
      rules: [{ when: 'enemyCasting' }],
    };
    s.skillBar[1] = {
      uid: 2,
      gemId: 'twin_strike',
      level: 1,
      xp: 0,
      extraSlots: 0,
      priority: 'normal',
      supports: [],
      rules: [{ when: 'always', aim: 'weakPoint' }],
    };
    expect(bossLeftToRules(s, zoneDef('hard_ossuar'))).toBe(true);
    expect(bossLeftToRules(s, zoneDef('hard_mother_vael'))).toBe(false);

    s.skillBar[1]!.rules[0]!.aim = 'choir';
    expect(bossLeftToRules(s, zoneDef('hard_mother_vael'))).toBe(true);
  });
});

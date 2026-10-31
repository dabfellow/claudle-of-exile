import { describe, expect, it } from 'vitest';
import { RULE_LABELS, type TacticRule } from '../src/data/gems';
import { stationDef } from '../src/data/hideout';
import { ZONES, zoneDef } from '../src/data/zones';
import { alignWarTable, freshAccount, reconcileAccounts } from '../src/engine/account';
import { GROUND_IN_PLAY, ruleLockReason, ruleUnlockLevel, unlockEverything } from '../src/engine/automation';
import { GROUND, PLAYER_SPOT } from '../src/engine/battlefield';
import { chooseSkill, combatStep, makeMonster, queueSkill, ruleAllows, ruleContext, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, setRule } from '../src/engine/gems';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, GroundKind, MonsterInstance } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';
import { armFor } from './helpers';

const ctx = (seed = 1) => makeCtx(seeded(seed));
const WATCH_BURNING: TacticRule = { when: 'onGround', ground: 'burning' };

function fighter(gems: string[]): GameState {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.tutorial.done = true;
  s.settings.autoFlee = false;
  s.skills.combat = charXpForLevel(30);
  s.skillBar = s.skillBar.map(() => null);
  gems.forEach((id, i) => (s.skillBar[i] = { ...createSkillGem(s, id), rules: [{ when: 'always' }] }));
  gems.forEach((id) => armFor(s, id));
  unlockEverything(s);
  s.flaskSlots = s.flaskSlots.map(() => null);
  s.life = deriveStats(s).maxLife;
  s.mana = deriveStats(s).maxMana;
  return s;
}

const burn = (s: GameState, kind: GroundKind = 'burning', cell = PLAYER_SPOT) =>
  s.combat!.ground.push({ cell, kind, dps: 1, remainingMs: 6000, durationMs: 6000 });

function inFight(s: GameState) {
  s.unlockedZones.push('cinderroad');
  startCombat(s, ctx(), 'cinderroad');
  const m = makeMonster({ ...zoneDef('cinderroad').monsters[0] }, false, 1);
  m.maxLife = m.life = 1e7;
  m.cell = 1;
  s.combat!.monsters = [m];
  s.combat!.spawnMs = 1e12;
}

describe('the ground rule', () => {
  it('passes only on the kind it watches, under the player', () => {
    const s = fighter(['heavy_strike']);
    inFight(s);
    const passes = (r: TacticRule) => ruleAllows(r, ruleContext(s, deriveStats(s)), false);
    expect(passes(WATCH_BURNING)).toBe(false);
    burn(s, 'burning', 3); // the player's own ground out on the field doesn't count
    expect(passes(WATCH_BURNING)).toBe(false);
    burn(s, 'chilled');
    expect(passes(WATCH_BURNING)).toBe(false);
    expect(passes({ when: 'onGround', ground: 'chilled' })).toBe(true);
    burn(s, 'burning');
    expect(passes(WATCH_BURNING)).toBe(true);
    expect(passes({ when: 'onGround' })).toBe(false);
  });

  it('waits for the War Table, and locked it never fires', () => {
    const s = newGame(1);
    expect(ruleLockReason(s, 'onGround')).toMatch(`Ground rules: War Table level ${ruleUnlockLevel('ground')}`);
    expect(setRule(s, 0, 0, WATCH_BURNING)).toMatch(/War Table/);

    const locked = fighter(['iron_guard']);
    locked.account.automation.rules = locked.account.automation.rules.filter((r) => r !== 'ground');
    locked.skillBar[0]!.rules = [WATCH_BURNING];
    inFight(locked);
    burn(locked);
    expect(chooseSkill(locked, deriveStats(locked)).slot).toBe(-1);
  });

  it('sends a skill off only once something is under you', () => {
    const s = fighter(['iron_guard', 'heavy_strike']);
    s.skillBar[0]!.rules = [WATCH_BURNING];
    s.skillBar[1]!.rules = [{ when: 'always' }];
    inFight(s);
    expect(chooseSkill(s, deriveStats(s)).nums.def.id).toBe('heavy_strike');
    burn(s);
    expect(chooseSkill(s, deriveStats(s)).nums.def.id).toBe('iron_guard');
  });

  it("offers every kind of ground, and only what something lays can be watched", () => {
    expect(RULE_LABELS.onGround.ground).toBe(true);
    const kinds = Object.keys(GROUND) as GroundKind[];
    expect(kinds).toContain('burning');
    expect(GROUND_IN_PLAY.has('burning')).toBe(true);
    // Sister Glass and Qara charge the ground, Morvane and the Horse-Lord chill it
    expect(GROUND_IN_PLAY.has('shocked')).toBe(true);
    expect(GROUND_IN_PLAY.has('chilled')).toBe(true);
    // nothing lays caustic ground yet
    expect(GROUND_IN_PLAY.has('caustic')).toBe(ZONES.some((z) => [...z.monsters, z.boss].some((m) => m.dmgType === 'phys' && m.basic.ground)));
  });
});

describe('stepping out', () => {
  it("a guard leaves the ground under you behind, but not your own out on the field", () => {
    const s = fighter(['iron_guard']);
    inFight(s);
    burn(s);
    burn(s, 'burning', 3);
    expect(queueSkill(s, 0)).toBeNull();
    s.combat!.actionMs = 0;
    combatStep(s, ctx(), 50, deriveStats(s));
    expect(s.combat!.ground.filter((g) => g.cell === PLAYER_SPOT)).toHaveLength(0);
    expect(s.combat!.ground.filter((g) => g.cell === 3)).toHaveLength(1);
  });

  it('an attack does not', () => {
    const s = fighter(['heavy_strike']);
    inFight(s);
    burn(s);
    s.combat!.actionMs = 0;
    combatStep(s, ctx(), 50, deriveStats(s));
    expect(s.combat!.ground.some((g) => g.cell === PLAYER_SPOT)).toBe(true);
  });
});

/** Hard, slow and alone, so the fight is all about the scorch: how long does this character last against it? */
function againstScorch(rules: TacticRule[]): { died: boolean; survivedMs: number; lifeLeft: number } {
  const s = fighter(['iron_guard', 'heavy_strike']);
  s.skillBar[0]!.rules = rules;
  s.unlockedZones.push('cinderroad');
  const c = ctx(7);
  startCombat(s, c, 'cinderroad');
  const zone = zoneDef('cinderroad');
  const boss: MonsterInstance = makeMonster({ ...zone.boss, mechanics: ['scorch'] }, true, 99);
  boss.life = boss.maxLife = 1e9;
  boss.attackMs = 1e12;
  boss.damage = deriveStats(s).maxLife * 0.4; // a scorch left alone takes about half your life, and nothing here heals
  boss.cell = 1;
  s.combat!.monsters = [boss];
  s.combat!.spawnMs = 1e12;
  s.zoneKills.cinderroad = zone.bossEvery;
  const sum = simulateOffline(s, c, 10 * 60_000);
  return { died: sum.died, survivedMs: sum.diedAfterMs ?? sum.ms, lifeLeft: s.life };
}

describe('Scorched earth', { timeout: 30_000 }, () => {
  it('a guard on a ground rule outlasts the same guard without one, offline', () => {
    const without = againstScorch([{ when: 'bossOnly' }, { when: 'lifeBelow', value: 0 }]);
    const withRule = againstScorch([WATCH_BURNING]);
    expect(without.died).toBe(true);
    expect(withRule.survivedMs).toBeGreaterThan(without.survivedMs * 2);
  });
});

describe('War Table', () => {
  const windupsAt = () => ruleUnlockLevel('windups');
  const groundAt = () => ruleUnlockLevel('ground');
  const account = (level: number, rules: ('vitals' | 'status' | 'windups' | 'ground')[], ruleSlots: number) => {
    const a = freshAccount();
    a.hideout.war_table = level;
    a.automation = { rules, ruleSlots, offlineHours: 8 };
    return a;
  };

  it('teaches ground rules before wind-ups, so bosses left offline can have them', () => {
    expect(groundAt()).toBeLessThan(windupsAt());
    expect(stationDef('war_table').levels[groundAt() - 1].effect).toMatch(/Ground rules/);
  });

  it('moves an account that bought wind-ups before the new level up to where wind-ups now sit', () => {
    const a = account(4, ['vitals', 'status', 'windups'], 2);
    alignWarTable(a);
    expect(a.hideout.war_table).toBe(windupsAt());
    expect(a.automation.rules).toContain('ground');
    expect(a.automation.ruleSlots).toBe(2);
    alignWarTable(a);
    expect(a.hideout.war_table).toBe(windupsAt());
  });

  it('moves the third rule slot too', () => {
    const a = account(5, ['vitals', 'status', 'windups'], 3);
    alignWarTable(a);
    expect(a.hideout.war_table).toBe(stationDef('war_table').levels.length);
  });

  it('leaves an account below the new level alone', () => {
    const a = account(2, ['vitals'], 1);
    alignWarTable(a);
    expect(a.hideout.war_table).toBe(2);
    expect(a.automation.rules).toEqual(['vitals']);
    const fresh = freshAccount();
    alignWarTable(fresh);
    expect(fresh.hideout.war_table).toBe(1);
  });

  it('survives a stale copy from another device', () => {
    const fresh = account(windupsAt(), ['vitals', 'status', 'ground', 'windups'], 2);
    const merged = reconcileAccounts(fresh, account(4, ['vitals', 'status', 'windups'], 2));
    expect(merged.hideout.war_table).toBe(windupsAt());
  });
});

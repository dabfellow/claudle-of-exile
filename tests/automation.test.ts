import { describe, expect, it } from 'vitest';
import { activeGemDef } from '../src/data/gems';
import { STATIONS, stationDef } from '../src/data/hideout';
import { SKILL_TREE_NODES } from '../src/data/skillTree';
import { zoneDef } from '../src/data/zones';
import { settleCharacter } from '../src/engine/account';
import { bossesOffline, castOrder, offlineCapMs, ruleLockReason, ruleSlots, suggestedRule, unlockEverything } from '../src/engine/automation';
import { chooseSkill, makeMonster, queueSkill, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, removeRule, setPriority, setRule } from '../src/engine/gems';
import { upgradeStation } from '../src/engine/hideout';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { startSkillAction } from '../src/engine/skills';
import { newGame, SAVE_VERSION } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';
import { armFor } from './helpers';

const ctx = (seed = 1) => makeCtx(seeded(seed));

/** Enough of everything for a station's next levels, paid for the real way. */
function upgradeTo(s: GameState, id: 'war_table' | 'watchtower', level: number) {
  for (const l of stationDef(id).levels.slice(s.account.hideout[id], level)) {
    for (const [mat, n] of Object.entries(l.cost)) s.bank[mat] = (s.bank[mat] ?? 0) + n;
    expect(upgradeStation(s, ctx(), id)).toBeNull();
  }
}

function fighter(gems: string[]) {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.tutorial.done = true;
  s.skills.combat = charXpForLevel(30);
  s.skillBar = s.skillBar.map(() => null);
  gems.forEach((id, i) => (s.skillBar[i] = { ...createSkillGem(s, id), rules: [{ when: 'always' }] }));
  gems.forEach((id) => armFor(s, id));
  s.life = deriveStats(s).maxLife;
  s.mana = deriveStats(s).maxMana;
  return s;
}

function inFight(s: GameState, pack: MonsterInstance[]) {
  startCombat(s, ctx(), 'mudflats');
  s.combat!.monsters = pack;
  s.combat!.spawnMs = 1e12;
}

const dummy = () => {
  const m = makeMonster({ ...zoneDef('mudflats').monsters[0], level: 5 }, false, 1);
  m.maxLife = m.life = 1e6;
  m.cell = 1;
  return m;
};

describe('rule locks', () => {
  it('simple rules are free; reactive rules wait for the War Table', () => {
    const s = newGame(1);
    for (const when of ['always', 'manual', 'bossOnly', 'enemiesAtLeast', 'notActive', 'manaAbove', 'targetLifeAbove', 'meterFull'] as const) {
      expect(ruleLockReason(s, when)).toBeNull();
    }
    for (const when of ['lifeBelow', 'manaBelow', 'targetHas', 'targetLacks', 'enemyCasting'] as const) {
      expect(ruleLockReason(s, when)).toMatch(/War Table/);
    }
    expect(setRule(s, 0, 0, { when: 'enemyCasting' })).toMatch(/War Table level 4/);
    expect(s.skillBar[0]!.rules).toEqual([{ when: 'manual' }]);
    expect(setRule(s, 0, 0, { when: 'always' })).toBeNull();
  });

  it('War Table levels open rule groups in order', () => {
    const s = newGame(1);
    upgradeTo(s, 'war_table', 2);
    expect(ruleLockReason(s, 'lifeBelow')).toBeNull();
    expect(ruleLockReason(s, 'targetHas')).not.toBeNull();
    upgradeTo(s, 'war_table', 3);
    expect(ruleLockReason(s, 'targetHas')).toBeNull();
    expect(bossesOffline(s)).toBe(false);
  });

  it('a locked rule kept from an old save never fires, but the skill can still be cast by hand', () => {
    const s = fighter(['iron_guard']);
    s.skillBar[0]!.rules = [{ when: 'lifeBelow', value: 100 }];
    s.life = 1;
    inFight(s, [dummy()]);
    expect(chooseSkill(s, deriveStats(s)).slot).toBe(-1);
    expect(queueSkill(s, 0)).toBeNull();
    expect(chooseSkill(s, deriveStats(s)).slot).toBe(0);
    s.account.automation.rules.push('vitals');
    expect(chooseSkill(s, deriveStats(s)).slot).toBe(0);
  });

  it('the suggested rule falls back to Whenever ready while it is locked', () => {
    const s = newGame(1);
    const guard = activeGemDef('iron_guard');
    expect(guard.defaultRule.when).toBe('enemyCasting');
    expect(suggestedRule(s, guard)).toEqual({ when: 'always' });
    unlockEverything(s);
    expect(suggestedRule(s, guard)).toEqual(guard.defaultRule);
  });
});

describe('rule slots', () => {
  it('start at one, and every rule in a slot has to pass', () => {
    const s = fighter(['heavy_strike']);
    expect(ruleSlots(s)).toBe(1);
    expect(setRule(s, 0, 1, { when: 'bossOnly' })).toMatch(/No free rule slot/);
    upgradeTo(s, 'war_table', 3);
    expect(ruleSlots(s)).toBe(2);
    expect(setRule(s, 0, 1, { when: 'bossOnly' })).toBeNull();
    inFight(s, [dummy()]);
    expect(chooseSkill(s, deriveStats(s)).slot).toBe(-1);
    removeRule(s, 0, 1);
    expect(chooseSkill(s, deriveStats(s)).slot).toBe(0);
    removeRule(s, 0, 0);
    expect(s.skillBar[0]!.rules).toHaveLength(1);
  });

  it('Manual only stands alone', () => {
    const s = fighter(['heavy_strike']);
    unlockEverything(s);
    setRule(s, 0, 1, { when: 'bossOnly' });
    setRule(s, 0, 0, { when: 'manual' });
    expect(s.skillBar[0]!.rules).toEqual([{ when: 'manual' }]);
  });
});

describe('cast order', () => {
  it('by default: cooldown skills, then attacks, each by slot', () => {
    const s = fighter(['heavy_strike', 'iron_guard', 'twin_strike', 'ground_slam']);
    expect(castOrder(s)).toEqual([1, 3, 0, 2]);
  });

  it('priority moves a skill past that split', () => {
    const s = fighter(['heavy_strike', 'iron_guard']);
    setPriority(s, 0, 'high');
    expect(castOrder(s)).toEqual([0, 1]);
    setPriority(s, 0, 'normal');
    setPriority(s, 1, 'low');
    expect(castOrder(s)).toEqual([0, 1]);
    inFight(s, [dummy()]);
    expect(chooseSkill(s, deriveStats(s)).slot).toBe(0);
  });
});

describe('unlocks', () => {
  it('are one-way, and the highest grant holds', () => {
    const s = newGame(1);
    upgradeTo(s, 'war_table', 5);
    upgradeTo(s, 'watchtower', 4);
    expect(s.account.automation).toEqual({ rules: ['vitals', 'status', 'windups'], ruleSlots: 3, offlineHours: 24 });
    s.account.hideout.war_table = 1;
    const back = s;
    expect(back.account.automation.ruleSlots).toBe(3);
    expect(bossesOffline(back)).toBe(true);
  });

  it('every grant is reachable from a station', () => {
    const s = newGame(1);
    unlockEverything(s);
    expect(STATIONS.filter((st) => st.levels.some((l) => l.grants)).map((st) => st.id)).toEqual(['war_table', 'watchtower']);
    expect(s.account.automation.rules).toHaveLength(3);
  });
});

describe('offline rules', { timeout: 30_000 }, () => {
  it('caps at 8 hours and the Watchtower raises it to 24', () => {
    const s = newGame(1);
    expect(offlineCapMs(s)).toBe(8 * 3_600_000);
    const hours = [8];
    for (let lvl = 2; lvl <= stationDef('watchtower').levels.length; lvl++) {
      const cost = stationDef('watchtower').levels[lvl - 1].cost;
      for (const [mat, n] of Object.entries(cost)) s.bank[mat] = n;
      upgradeStation(s, ctx(), 'watchtower');
      hours.push(s.account.automation.offlineHours);
    }
    expect(hours).toEqual([8, 12, 16, 24]);
    expect(simulateOffline(newGame(1), ctx(), 48 * 3_600_000).ms).toBe(8 * 3_600_000);
  });

  it('offline skilling stays at full speed for the whole cap', () => {
    const s = newGame(1);
    const c = ctx();
    startSkillAction(s, c, 'cut_ash');
    expect(simulateOffline(s, c, 8 * 3_600_000).materials.ash_log).toBe(8 * 1200);
  });

  const strong = () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.tutorial.done = true;
    s.skills.combat = charXpForLevel(30);
    for (const g of s.skillBar) if (g) g.rules = [{ when: 'always' }];
    return s;
  };

  it("a fresh character can't idle any boss, new or already beaten", () => {
    for (const beaten of [[], ['mudflats']]) {
      const s = strong();
      s.bossesDefeated = beaten;
      const c = ctx();
      startCombat(s, c, 'mudflats');
      const sum = simulateOffline(s, c, 30 * 60_000);
      expect(sum.kills).toBeGreaterThan(zoneDef('mudflats').bossEvery);
      expect(s.lifetime.bossKills).toBe(0);
      expect(sum.bossWaiting).toBe(zoneDef('mudflats').boss.name);
    }
  });

  it('a boss on the field when you leave waits for your return', () => {
    const s = strong();
    const c = ctx();
    startCombat(s, c, 'mudflats');
    s.zoneKills.mudflats = zoneDef('mudflats').bossEvery;
    s.combat!.monsters = [makeMonster(zoneDef('mudflats').boss, true, 99)];
    simulateOffline(s, c, 10 * 60_000);
    expect(s.lifetime.bossKills).toBe(0);
    expect(s.zoneKills.mudflats).toBeGreaterThanOrEqual(zoneDef('mudflats').bossEvery);
  });

  it('with wind-up rules earned, a strong build beats a new boss offline', () => {
    // this build wins the fight about two times in five, so one seed would only be testing its luck
    const won = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((seed) => {
      const s = strong();
      s.settings.autoBoss = true;
      upgradeTo(s, 'war_table', 4);
      const c = ctx(seed);
      startCombat(s, c, 'mudflats');
      simulateOffline(s, c, 30 * 60_000);
      return s.bossesDefeated.includes('mudflats');
    });
    expect(won).toBe(true);
  });

  it('dying stops combat until you return, while a greenhouse keeps growing', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.tutorial.done = true;
    s.settings.autoFlee = false;
    s.equipment = {};
    s.flaskSlots = s.flaskSlots.map(() => null);
    const keystone = SKILL_TREE_NODES.find((n) => n.stats?.greenhouse)!;
    s.skillPassives = [keystone.id];
    s.greenhouse = { actionId: 'herb_sun', progress: 0 };
    s.unlockedZones.push('sanctum');
    const c = ctx();
    expect(startCombat(s, c, 'sanctum')).toBeNull();
    const sum = simulateOffline(s, c, 2 * 3_600_000);
    expect(sum.died).toBe(true);
    expect(sum.diedAfterMs).toBeLessThan(3_600_000);
    expect(s.lifetime.deaths).toBe(1);
    expect(s.action).toBeNull();
    expect(s.combat).toBeNull();
    expect(sum.materials.sunpetal).toBeGreaterThan(10);
  });
});

describe('save migration', () => {
  it('a v19 save keeps its rules, starts locked and loses nothing', () => {
    const s = newGame(1);
    s.gems.push(createSkillGem(s, 'spark'));
    const old = JSON.parse(serialize(s));
    old.version = 19;
    const { war_table: _w, watchtower: _t, ...hideout } = s.account.hideout;
    old.hideout = hideout;
    for (const g of [...old.skillBar, ...old.gems]) {
      if (!g) continue;
      delete g.rules;
      delete g.priority;
      g.rule = { when: 'enemyCasting' };
    }
    const loaded = deserialize(JSON.stringify(old));
    expect(loaded.version).toBe(SAVE_VERSION);
    const gem = loaded.skillBar[0]!;
    expect(gem.rules).toEqual([{ when: 'enemyCasting' }]);
    expect(gem.priority).toBe('normal');
    expect('rule' in gem).toBe(false);
    expect(loaded.gems[0].rules).toEqual([{ when: 'enemyCasting' }]);
    settleCharacter(loaded, loaded.account);
    expect(loaded.account.automation).toEqual({ rules: [], ruleSlots: 1, offlineHours: 8 });
    expect(loaded.account.hideout.war_table).toBe(1);
    expect(loaded.account.hideout.watchtower).toBe(1);
  });
});

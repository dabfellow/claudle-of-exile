import { afterEach, describe, expect, it } from 'vitest';
import { ACHIEVEMENT_BY_ID } from '../src/data/achievements';
import { BASES, uniqueDef } from '../src/data/bases';
import { ZONE_POS } from '../src/data/continent';
import { BOSS_TABLES, bossTable, DROP_TABLES, dropTable } from '../src/data/drops';
import type { TacticRule } from '../src/data/gems';
import { ACT_PREVIEW, ACTS, actBossZone, actOpen, BOSS_MARTYR_COUNT, nextZones, zoneDef, zonesInAct, type ZoneDef } from '../src/data/zones';
import { GROUND_IN_PLAY, ruleLockReason, ruleUnlockLevel, skillAim, unlockEverything } from '../src/engine/automation';
import { chooseSkill, combatStep, focusTarget, lockTarget, makeMonster, retreat, ruleContext, skillTarget, startCombat, targetOrder } from '../src/engine/combat';
import { EDGE_CELLS, FRONT_CELL } from '../src/engine/battlefield';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, setAim, setRule, skillNumbers } from '../src/engine/gems';
import { createItem, droppableBases } from '../src/engine/items';
import { rollLoot } from '../src/engine/loot';
import { simulateOffline } from '../src/engine/offline';
import { openReachedZones } from '../src/engine/progress';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';

const ctx = (seed = 1) => makeCtx(seeded(seed));
const act = () => zonesInAct(3);
const AIM: TacticRule = { when: 'always', aim: 'martyrs' };
const PLAIN: TacticRule = { when: 'always' };
const ZONE = 'almsquarter';

/** A level 45 fighter with every unlock, standing in an Act 3 area with its boss ready. */
function fighter(gems: string[], rules: TacticRule[] = [PLAIN]): GameState {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.tutorial.done = true;
  s.settings.autoFlee = false;
  s.settings.autoBoss = true;
  s.skills.combat = charXpForLevel(45);
  s.skillBar = s.skillBar.map(() => null);
  gems.forEach((id, i) => (s.skillBar[i] = { ...createSkillGem(s, id), rules }));
  s.equipment.weapon = createItem(s, 'warlord_mace', 45, 'normal', seeded(1));
  unlockEverything(s);
  s.flaskSlots = s.flaskSlots.map(() => null);
  s.unlockedZones = act().map((z) => z.id);
  s.life = deriveStats(s).maxLife;
  s.mana = deriveStats(s).maxMana;
  return s;
}

/** Boss and two martyrs, alone on the field. */
function chained(s: GameState, zone = ZONE): { boss: MonsterInstance; martyrs: () => MonsterInstance[]; c: ReturnType<typeof ctx> } {
  const c = ctx();
  startCombat(s, c, zone);
  const boss = makeMonster(zoneDef(zone).boss, true, 9);
  boss.attackMs = 1e12;
  boss.mechanics = boss.mechanics.filter((k) => k === 'martyrs');
  s.combat!.monsters = [boss];
  s.combat!.spawnMs = 1e12;
  s.combat!.actionMs = 1e12;
  combatStep(s, c, 50, deriveStats(s));
  return { boss, martyrs: () => s.combat!.monsters.filter((m) => m.martyr), c };
}

/** Runs with the area's monsters doing next to nothing: these fights are about who can be finished, not who survives them. */
function harmless<T>(zone: string, run: () => T): T {
  const z = zoneDef(zone);
  const fighters = [...z.monsters, z.boss];
  const mults = fighters.map((m) => m.dmgMult);
  fighters.forEach((m) => (m.dmgMult = 0));
  const out = run();
  fighters.forEach((m, i) => (m.dmgMult = mults[i]));
  return out;
}

/** Fight the area's real boss to the end. */
function bossFight(s: GameState, zone = ZONE, minutes = 30) {
  return harmless(zone, () => {
    const c = ctx(3);
    s.zoneKills[zone] = zoneDef(zone).bossEvery;
    startCombat(s, c, zone);
    const end = minutes * 60_000;
    let boss: MonsterInstance | undefined;
    for (let t = 0; t < end && s.combat; t += 50) {
      s.life = deriveStats(s).maxLife;
      s.mana = deriveStats(s).maxMana;
      combatStep(s, c, 50, deriveStats(s));
      boss ??= s.combat?.monsters.find((m) => m.isBoss);
      if (c.events.some((e) => e.t === 'kill' && e.boss)) return { won: true, boss, ms: t };
    }
    return { won: false, boss, ms: end };
  });
}

/** Back to how Act 3 was before release, for the tests about opening it. */
function closeAct3() {
  ACTS[2].open = false;
  ACTS[2].preview = true;
}

afterEach(() => {
  ACTS[2].open = true;
  ACTS[2].preview = false;
  ACT_PREVIEW.enabled = true;
});

describe('Act 3 layout', () => {
  it('has ten areas at monster levels 33 to 41, ending in its act boss', () => {
    const zones = act();
    expect(zones).toHaveLength(10);
    expect(zones.at(-1)).toBe(actBossZone(3));
    expect(zones[0].id).toBe('pilgrimgate');
    const levels = zones.flatMap((z) => z.monsters.map((m) => m.level));
    expect(Math.min(...levels)).toBe(33);
    expect(Math.max(...levels)).toBe(41);
    for (let i = 1; i < zones.length; i++) {
      expect(zones[i].levelRange[0]).toBeGreaterThanOrEqual(zones[i - 1].levelRange[0]);
      expect(zones[i].boss.level).toBeGreaterThanOrEqual(zones[i - 1].boss.level);
      expect(zones[i].tier).toBeGreaterThanOrEqual(zones[i - 1].tier);
    }
    for (const z of zones) for (const m of z.monsters) {
      expect(m.level).toBeGreaterThanOrEqual(z.levelRange[0]);
      expect(m.level).toBeLessThanOrEqual(z.levelRange[1]);
    }
    expect(zones.at(-1)!.boss.level).toBeGreaterThan(zoneDef('burningthrone').boss.level);
  });

  it('follows the Burning Throne and every area sits on the map', () => {
    expect(nextZones('burningthrone')[0]?.id).toBe('pilgrimgate');
    const zones = act();
    expect(nextZones(zones.at(-1)!.id)[0]?.id).toBe('hollowpass');
    for (const z of zones) expect(ZONE_POS[z.id]).toBeTruthy();
  });

  it('the Pilgrim Gate has a plain boss, and martyrs hold most of the rest', () => {
    expect(zoneDef('pilgrimgate').boss.mechanics).not.toContain('martyrs');
    expect(act().filter((z) => z.boss.mechanics!.includes('martyrs')).length).toBeGreaterThanOrEqual(8);
    expect(actBossZone(3)!.boss.mechanics).toHaveLength(7);
  });

  it('lightning leads, on trash and in the bosses', () => {
    const trash = act().flatMap((z) => z.monsters);
    const count = (t: string) => trash.filter((m) => m.dmgType === t).length;
    expect(count('light')).toBeGreaterThan(count('fire') + count('cold'));
    expect(count('light')).toBeGreaterThanOrEqual(count('phys'));
    const bosses = act().map((z) => z.boss);
    const blasts = bosses.filter((b) => b.mechanics!.some((k) => k === 'nova' || k === 'scorch'));
    expect(blasts.filter((b) => (b.novaType ?? b.dmgType) === 'light')).toHaveLength(blasts.length);
    expect(GROUND_IN_PLAY.has('shocked')).toBe(true);
  });

  it('every unique it drops exists, and the six new ones have a home', () => {
    const drops = new Set(act().flatMap((z) => z.uniques));
    for (const id of drops) expect(uniqueDef(id)).toBeTruthy();
    for (const id of ['martyrs_shroud', 'pilgrims_road', 'saints_shard', 'confession_hood', 'halo_of_wrath', 'chainbreaker']) expect(drops).toContain(id);
  });

  it('has drop tables for its deeper tiers', () => {
    for (const z of act()) {
      expect(DROP_TABLES[z.tier]).toBeTruthy();
      expect(BOSS_TABLES[z.tier]).toBeTruthy();
    }
    expect(dropTable(9).rarity.rare).toBeGreaterThan(dropTable(7).rarity.rare);
    expect(bossTable(9).guaranteed.map((g) => g.id)).toContain('divine');
  });

  it('reaches bases of about level 45 by the act boss, and none past it', () => {
    const z = actBossZone(3)!;
    const top = z.boss.level + z.ilvlBonus!;
    expect(top).toBe(45);
    const levels = droppableBases(top).map((b) => b.reqLevel);
    expect(Math.max(...levels)).toBeGreaterThanOrEqual(44);
    expect(Math.max(...levels)).toBeLessThanOrEqual(45);
    expect(BASES.some((b) => b.reqLevel > 45)).toBe(true);
    // Act 2 is left alone
    expect(zoneDef('burningthrone').ilvlBonus).toBeUndefined();
  });

  it('rolls items at the bonus level', () => {
    const s = fighter(['heavy_strike']);
    const z = zoneDef('highaltar');
    const mon = makeMonster(z.boss, true, 9);
    rollLoot(s, ctx(), mon, z, deriveStats(s));
    const items = [...s.ground, ...s.inventory];
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) expect(i.ilvl).toBe(45);
  });
});

describe('opening Act 3', () => {
  const beatAct2 = () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.unlockedZones = zonesInAct(2).map((z) => z.id);
    s.bossesDefeated = zonesInAct(2).map((z) => z.id);
    return s;
  };

  it('before release, stays closed to players, and plays in dev builds, tests and the sim', () => {
    closeAct3();
    expect(actOpen(3)).toBe(true);
    ACT_PREVIEW.enabled = false;
    expect(actOpen(3)).toBe(false);
    expect(nextZones('burningthrone')).toEqual([]);
  });

  it("won't reach a player's save, or let a preview save travel there", () => {
    closeAct3();
    ACT_PREVIEW.enabled = false;
    const s = beatAct2();
    openReachedZones(s);
    expect(s.unlockedZones).not.toContain('pilgrimgate');
    s.unlockedZones.push('pilgrimgate');
    expect(startCombat(s, ctx(), 'pilgrimgate')).toBeTruthy();
  });

  it('opens the gate on load once it is out', () => {
    expect(deserialize(serialize(beatAct2())).unlockedZones).toContain('pilgrimgate');
  });

  it('counts its achievements only for Act 3', () => {
    const s = beatAct2();
    expect(ACHIEVEMENT_BY_ID.act_3.progress(s)).toBe(0);
    s.bossesDefeated.push(...act().map((z) => z.id));
    expect(ACHIEVEMENT_BY_ID.act_3.progress(s)).toBe(1);
    expect(ACHIEVEMENT_BY_ID.conqueror_3.progress(s)).toBe(10);
  });
});

describe('martyrs', () => {
  it('chains two martyrs as the fight opens, and the boss takes nothing while they live', () => {
    const s = fighter(['heavy_strike']);
    const { boss, martyrs } = chained(s);
    expect(martyrs()).toHaveLength(BOSS_MARTYR_COUNT);
    expect(boss.chained).toBe(true);
    for (const m of martyrs()) {
      expect(m.level).toBe(boss.level);
      expect(m.maxLife).toBeLessThan(boss.maxLife);
    }
  });

  it('skills go for the boss, and a chained boss shrugs off the hit', () => {
    const s = fighter(['heavy_strike']);
    const { boss, c } = chained(s);
    s.combat!.actionMs = 0;
    for (let t = 0; t < 30_000; t += 50) combatStep(s, c, 50, deriveStats(s));
    expect(boss.life).toBe(boss.maxLife);
    expect(c.events.some((e) => e.t === 'hit' && e.target === 'monster' && e.monsterUid === boss.uid && e.blocked)).toBe(true);
  });

  it('nobody targets a martyr by accident, so area skills and ailments pass it by', () => {
    const s = fighter(['ground_slam', 'heavy_strike']);
    s.skillBar[0]!.rules = [{ when: 'always' }];
    const { boss, martyrs, c } = chained(s);
    expect(targetOrder(s).some((m) => m.martyr)).toBe(false);
    expect(focusTarget(s)).toBe(boss);
    // an arc aimed at the boss, with a martyr right beside it
    const lives = martyrs().map((m) => m.life);
    martyrs()[0].cell = boss.cell + 1;
    s.combat!.actionMs = 0;
    martyrs()[0].dots.push({ kind: 'bleed', dps: 1e6, remainingMs: 5000, durationMs: 5000, dealt: 0, gemId: 'x' });
    s.combat!.ground.push({ cell: martyrs()[1].cell, kind: 'burning', dps: 1e6, remainingMs: 5000, durationMs: 5000 });
    for (let t = 0; t < 8000; t += 50) combatStep(s, c, 50, deriveStats(s));
    expect(martyrs().map((m) => m.life)).toEqual(lives);
  });

  it('clicking a martyr strikes it, and the last one breaks the chains', () => {
    const s = fighter(['heavy_strike']);
    const { boss, martyrs, c } = chained(s);
    for (const m of [...martyrs()]) {
      lockTarget(s, m.uid);
      m.life = 1;
      m.cell = 0;
      s.combat!.actionMs = 0;
      for (let t = 0; t < 8000 && m.life > 0; t += 50) combatStep(s, c, 50, deriveStats(s));
      if (martyrs().length) expect(boss.chained).toBe(true);
    }
    expect(martyrs()).toHaveLength(0);
    expect(boss.chained).toBeUndefined();
    expect(c.events.some((e) => e.t === 'bossPhase' && e.text.includes('loses its martyrs'))).toBe(true);
  });

  it('a martyr stands still, never attacks, and gives no kill or loot', () => {
    const s = fighter(['heavy_strike']);
    const { martyrs, c } = chained(s);
    const [m] = martyrs();
    const cell = m.cell;
    const life = s.life;
    const kills = s.lifetime.kills;
    for (let t = 0; t < 10_000; t += 50) combatStep(s, c, 50, deriveStats(s));
    expect(m.cell).toBe(cell);
    expect(s.life).toBe(life);
    m.life = 0;
    combatStep(s, c, 50, deriveStats(s));
    expect(s.lifetime.kills).toBe(kills);
  });

  it('chains two more at half life, once', () => {
    const s = fighter(['heavy_strike']);
    const { boss, martyrs, c } = chained(s);
    for (const m of martyrs()) m.life = 0;
    combatStep(s, c, 50, deriveStats(s));
    expect(boss.chained).toBeUndefined();
    boss.life = boss.maxLife * 0.49;
    combatStep(s, c, 50, deriveStats(s));
    expect(boss.chained).toBe(true);
    expect(martyrs()).toHaveLength(BOSS_MARTYR_COUNT);
    for (const m of martyrs()) m.life = 0;
    combatStep(s, c, 50, deriveStats(s));
    boss.life = boss.maxLife * 0.1;
    combatStep(s, c, 50, deriveStats(s));
    expect(martyrs()).toHaveLength(0);
  });

  it('adds are still called in around the martyrs', () => {
    const s = fighter(['heavy_strike']);
    const { boss, martyrs, c } = chained(s);
    boss.mechanics.push('summon');
    boss.timers.summon = 10;
    s.combat!.actionMs = 1e12;
    combatStep(s, c, 50, deriveStats(s));
    expect(martyrs()).toHaveLength(BOSS_MARTYR_COUNT);
    expect(s.combat!.monsters.filter((m) => !m.isBoss && !m.martyr)).toHaveLength(2);
    expect(ruleContext(s, deriveStats(s)).enemies).toBe(3);
  });
});

describe('aim rules', () => {
  it('wait for the War Table, between wind-ups and the third rule slot', () => {
    const s = newGame(1);
    expect(ruleUnlockLevel('aim')).toBe(ruleUnlockLevel('windups') + 1);
    expect(setRule(s, 0, 0, AIM)).toMatch(`Aim rules: War Table level ${ruleUnlockLevel('aim')}`);
    expect(setAim(s, 0, 'martyrs')).toMatch(/War Table/);
    expect(setAim(s, 0, undefined)).toBeNull();
    expect(ruleLockReason(s, 'always')).toBeNull();
  });

  it('a locked aim, kept from an old save, is ignored', () => {
    const s = fighter(['heavy_strike'], [AIM]);
    expect(skillAim(s, s.skillBar[0]!)).toBe('martyrs');
    s.account.automation.rules = s.account.automation.rules.filter((r) => r !== 'aim');
    expect(skillAim(s, s.skillBar[0]!)).toBeUndefined();
  });

  it('stays on the rule through a save, and survives the rule changing', () => {
    const s = fighter(['heavy_strike']);
    expect(setAim(s, 0, 'martyrs')).toBeNull();
    expect(s.skillBar[0]!.rules[0].aim).toBe('martyrs');
    const loaded = deserialize(serialize(s));
    expect(loaded.skillBar[0]!.rules[0].aim).toBe('martyrs');
  });

  it('sends the skill at a martyr while one lives, then back to the usual target', () => {
    const s = fighter(['heavy_strike'], [AIM]);
    const { boss, martyrs } = chained(s);
    const nums = skillNumbers(deriveStats(s), s.skillBar[0]);
    expect(skillTarget(s, deriveStats(s), nums, 'martyrs')!.mon.martyr).toBe(true);
    expect(skillTarget(s, deriveStats(s), nums)!.mon).toBe(boss);
    s.combat!.monsters = s.combat!.monsters.filter((m) => !m.martyr);
    expect(skillTarget(s, deriveStats(s), nums, 'martyrs')!.mon).toBe(boss);
    expect(martyrs()).toHaveLength(0);
  });

  it('a clicked monster still beats the rule', () => {
    const s = fighter(['heavy_strike'], [AIM]);
    const { boss } = chained(s);
    lockTarget(s, boss.uid);
    const nums = skillNumbers(deriveStats(s), s.skillBar[0]);
    expect(skillTarget(s, deriveStats(s), nums, 'martyrs')!.mon).toBe(boss);
  });

  it('melee reaches a martyr from anywhere, even walled in by the boss and its adds', () => {
    const s = fighter(['heavy_strike'], [AIM]);
    const { boss, martyrs } = chained(s);
    boss.cell = FRONT_CELL;
    martyrs()[0].cell = EDGE_CELLS[0];
    martyrs()[1].cell = EDGE_CELLS[1];
    const choice = chooseSkill(s, deriveStats(s));
    expect(choice.slot).toBe(0);
    expect(choice.closeIn).toBeFalsy();
    expect(martyrs()).toContain(choice.target);
  });

  it('without an aim, skills clear the adds before wasting time on a chained boss', () => {
    const s = fighter(['heavy_strike']);
    const { boss } = chained(s);
    boss.cell = FRONT_CELL;
    const add = makeMonster(zoneDef(ZONE).monsters[0], false, 77);
    add.cell = FRONT_CELL + 1;
    s.combat!.monsters.push(add);
    expect(targetOrder(s)[0]).toBe(add);
    expect(targetOrder(s).at(-1)).toBe(boss);
  });
});

describe('a martyr boss, by rule alone', { timeout: 60_000 }, () => {
  it('falls to a skill that aims at martyrs', () => {
    const fight = bossFight(fighter(['heavy_strike'], [AIM]));
    expect(fight.won).toBe(true);
  });

  it("can't be beaten without one: it never loses a point of life", () => {
    const fight = bossFight(fighter(['heavy_strike', 'ground_slam']));
    expect(fight.won).toBe(false);
    expect(fight.boss!.life).toBe(fight.boss!.maxLife);
    expect(fight.boss!.chained).toBe(true);
  });

  it('the Pilgrim Gate needs no aim at all', () => {
    expect(bossFight(fighter(['heavy_strike']), 'pilgrimgate').won).toBe(true);
  });

  it('the rule gets past both waves on the act boss too', () => {
    const fight = bossFight(fighter(['heavy_strike'], [AIM]), 'highaltar', 60);
    expect(fight.won).toBe(true);
  });
});

describe('a martyr boss, offline', { timeout: 60_000 }, () => {
  /** An hour away, a minute at a time, so a slow fighter doesn't wear down. */
  function away(rules: TacticRule[]) {
    return harmless(ZONE, () => {
      const s = fighter(['heavy_strike'], rules);
      s.zoneKills[ZONE] = zoneDef(ZONE).bossEvery;
      const c = ctx(5);
      startCombat(s, c, ZONE);
      let kills = 0;
      let bossWaiting: string | null = null;
      for (let minute = 0; minute < 60 && !s.bossesDefeated.includes(ZONE); minute++) {
        s.life = deriveStats(s).maxLife;
        const sum = simulateOffline(s, c, 60_000);
        kills += sum.kills;
        bossWaiting ??= sum.bossWaiting;
      }
      return { s, kills, bossWaiting };
    });
  }

  it('comes out and falls when a rule aims at its martyrs', () => {
    expect(away([AIM]).s.bossesDefeated).toContain(ZONE);
  });

  it('stays in hiding without one, so the hours go on trash', () => {
    const { s, kills, bossWaiting } = away([PLAIN]);
    expect(s.bossesDefeated).not.toContain(ZONE);
    expect(bossWaiting).toBe(zoneDef(ZONE).boss.name);
    expect(kills).toBeGreaterThan(0);
  });

  it('a fight left without the rule goes back into hiding', () => {
    const s = fighter(['heavy_strike']);
    chained(s);
    expect(s.combat!.monsters.some((m) => m.isBoss)).toBe(true);
    simulateOffline(s, ctx(5), 60_000);
    expect(s.combat?.monsters.some((m) => m.martyr)).toBeFalsy();
    retreat(s);
  });
});

const mechanicZones = (): ZoneDef[] => act().filter((z) => z.boss.mechanics!.includes('martyrs'));

describe('every martyr boss', { timeout: 120_000 }, () => {
  it('can be beaten by the aim rule', () => {
    for (const z of mechanicZones()) expect(bossFight(fighter(['heavy_strike'], [AIM]), z.id, 60).won, z.id).toBe(true);
  });
});

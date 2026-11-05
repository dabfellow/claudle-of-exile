import { afterEach, describe, expect, it } from 'vitest';
import { ASCENDANCY_BY_ID, ASCENDANCY_MAX_POINTS, TRIALS } from '../src/data/ascendancies';
import { droppableBases } from '../src/engine/items';
import { UNIQUES } from '../src/data/bases';
import { ZONE_POS } from '../src/data/continent';
import { BOSS_TABLES, DROP_TABLES } from '../src/data/drops';
import { RULE_LABELS, type TacticRule } from '../src/data/gems';
import { STATIONS } from '../src/data/hideout';
import {
  ACT_PREVIEW,
  ACTS,
  actBossZone,
  actOpen,
  BOSS_FROSTBITE_CLEANSE,
  BOSS_FROSTBITE_EVERY_MS,
  BOSS_FROSTBITE_FREEZE_MS,
  BOSS_FROSTBITE_INSTILL_AT,
  BOSS_FROSTBITE_MAX,
  nextZones,
  ZONES,
  zoneDef,
  zonesInAct,
} from '../src/data/zones';
import { allocateAscNode, chooseAscendancy, onBossFirstKill } from '../src/engine/ascendancy';
import { bossLeftToRules, GROUND_IN_PLAY, ruleLockReason, unlockEverything } from '../src/engine/automation';
import { GROUND, groundFor, layGround, PLAYER_SPOT } from '../src/engine/battlefield';
import { combatStep, makeMonster, queueSkill, ruleAllows, ruleContext, startCombat, useFlask, type RuleContext } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { newFlask } from '../src/engine/flasks';
import { createItem } from '../src/engine/items';
import { createSkillGem } from '../src/engine/gems';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';

const ctx = (seed = 1) => makeCtx(seeded(seed));
const act = () => zonesInAct(4);
const ZONE = 'screefields';
const AT_SIX: TacticRule = { when: 'frostbite', value: 6 };
const ALWAYS: TacticRule = { when: 'always' };
const MANUAL: TacticRule = { when: 'manual' };

/** A fighter with every unlock, standing in an Act 4 area. Each gem brings its own rules. */
function fighter(gems: [string, TacticRule[]][], level = 48): GameState {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.tutorial.done = true;
  s.settings.autoFlee = false;
  s.settings.autoBoss = true;
  s.skills.combat = charXpForLevel(level);
  s.skillBar = s.skillBar.map(() => null);
  gems.forEach(([id, rules], i) => (s.skillBar[i] = { ...createSkillGem(s, id), rules }));
  s.equipment.weapon = createItem(s, 'dreadsteel_hammer', 50, 'normal', seeded(1));
  s.equipment.body = createItem(s, 'dreadsteel_plate', 50, 'normal', seeded(2));
  s.equipment.helmet = createItem(s, 'dreadsteel_helm', 50, 'normal', seeded(3));
  unlockEverything(s);
  s.flaskSlots = s.flaskSlots.map(() => null);
  s.unlockedZones = act().map((z) => z.id);
  s.life = deriveStats(s).maxLife;
  s.mana = deriveStats(s).maxMana;
  return s;
}

/** The area's boss alone on the field, with only Frostbite left to it and no way to act unless `act` is set. */
function frostFight(s: GameState, zone = ZONE, acting = false): { boss: MonsterInstance; c: ReturnType<typeof ctx> } {
  const c = ctx();
  startCombat(s, c, zone);
  const boss = makeMonster(zoneDef(zone).boss, true, 9);
  boss.attackMs = 1e12;
  boss.life = boss.maxLife = 1e9;
  boss.mechanics = ['frostbite'];
  s.combat!.monsters = [boss];
  s.combat!.spawnMs = 1e12;
  if (!acting) s.combat!.actionMs = 1e12;
  return { boss, c };
}

function run(s: GameState, c: ReturnType<typeof ctx>, ms: number): void {
  for (let t = 0; t < ms && s.combat; t += 50) combatStep(s, c, 50, deriveStats(s));
}

/**
 * A whole fight against the area's real boss, every mechanic on. A bare test fighter has no tree and no resistances, so
 * the area hits it at an eighth of its strength, about what a geared character takes. Returns how long it lasted and how often it froze.
 */
function realFight(s: GameState, zone: string, seed: number, minutes = 5) {
  const z = zoneDef(zone);
  const fighters = [...z.monsters, z.boss];
  const mults = fighters.map((m) => m.dmgMult ?? 1);
  fighters.forEach((m, i) => (m.dmgMult = mults[i] * 0.12));
  const c = ctx(seed);
  s.zoneKills[zone] = z.bossEvery;
  startCombat(s, c, zone);
  let ms = 0;
  for (; ms < minutes * 60_000 && s.combat; ms += 50) {
    combatStep(s, c, 50, deriveStats(s));
    if (c.events.some((e) => e.t === 'death' || (e.t === 'kill' && e.boss))) break;
  }
  fighters.forEach((m, i) => (m.dmgMult = mults[i]));
  return { ms, freezes: c.events.filter((e) => e.t === 'bossPhase' && e.text.includes('freezes you')).length };
}

afterEach(() => {
  ACT_PREVIEW.enabled = true;
});

describe('Act 4 layout', () => {
  it('has twelve areas at monster levels 41 to 49, ending in its act boss', () => {
    const zones = act();
    expect(zones).toHaveLength(12);
    expect(zones.at(-1)).toBe(actBossZone(4));
    expect(zones[0].id).toBe('hollowpass');
    expect(zones.at(-1)!.id).toBe('giantsthrone');
    const levels = zones.flatMap((z) => z.monsters.map((m) => m.level));
    expect(Math.min(...levels)).toBe(41);
    expect(Math.max(...levels)).toBe(49);
    for (let i = 1; i < zones.length; i++) {
      expect(zones[i].levelRange[0]).toBeGreaterThanOrEqual(zones[i - 1].levelRange[0]);
      expect(zones[i].boss.level).toBeGreaterThanOrEqual(zones[i - 1].boss.level);
      expect(zones[i].tier).toBeGreaterThanOrEqual(zones[i - 1].tier);
    }
    for (const z of zones) for (const m of z.monsters) {
      expect(m.level).toBeGreaterThanOrEqual(z.levelRange[0]);
      expect(m.level).toBeLessThanOrEqual(z.levelRange[1]);
    }
  });

  it('follows the High Altar, and every area sits on the map inside the northern range', () => {
    expect(nextZones('highaltar')[0]?.id).toBe('hollowpass');
    const zones = act();
    for (const z of zones) {
      const pos = ZONE_POS[z.id];
      expect(pos, z.id).toBeTruthy();
      expect(pos[1]).toBeLessThan(250);
    }
  });

  it('no monster id clashes with another act', () => {
    const ids = ZONES.flatMap((z) => [...z.monsters, z.boss]).map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is large and few: small waves of big monsters, with some quick beasts among them', () => {
    const zones = act();
    for (const z of zones) expect(z.packSize[1]).toBeLessThanOrEqual(2);
    const lifeOf = (acts: number) => {
      const list = zonesInAct(acts).flatMap((z) => z.monsters);
      return list.reduce((a, m) => a + (m.lifeMult ?? 1), 0) / list.length;
    };
    expect(lifeOf(4)).toBeGreaterThan(lifeOf(3) + 0.3);
    expect(zones.flatMap((z) => z.monsters).some((m) => m.moveMs === 600)).toBe(true);
    expect(zones.reduce((a, z) => a + z.monsters.filter((m) => m.moveMs === 1800).length, 0)).toBeGreaterThanOrEqual(14);
  });

  it('every tier has its drop tables', () => {
    for (const z of act()) {
      expect(DROP_TABLES[z.tier], z.id).toBeTruthy();
      expect(BOSS_TABLES[z.tier], z.id).toBeTruthy();
    }
    expect(act().at(-1)!.tier).toBe(11);
  });

  it('bases reach the mid-50s by the act boss, on the way to 80 at the end of Act 6', () => {
    const z = zoneDef('giantsthrone');
    const ilvl = z.boss.level + (z.ilvlBonus ?? 0);
    expect(ilvl).toBe(57);
    expect(Math.max(...droppableBases(ilvl).map((b) => b.reqLevel))).toBeGreaterThan(50);
    expect(Math.max(...droppableBases(ilvl).map((b) => b.reqLevel))).toBeLessThan(60);
    const first = zoneDef('hollowpass');
    expect(first.boss.level + (first.ilvlBonus ?? 0)).toBeGreaterThan(zoneDef('highaltar').boss.level + (zoneDef('highaltar').ilvlBonus ?? 0));
  });
});

describe('cold is the check', () => {
  it('leads the trash', () => {
    const list = act().flatMap((z) => z.monsters);
    const count = (t: string) => list.filter((m) => m.dmgType === t).length;
    expect(count('cold')).toBeGreaterThan(count('phys'));
    expect(count('fire')).toBe(0);
    expect(count('light')).toBe(0);
  });

  it("every boss's nova and ground is cold", () => {
    for (const z of act()) {
      const b = z.boss;
      expect(b.novaType ?? b.dmgType, z.id).toBe('cold');
    }
  });
});

describe('the Act 4 uniques', () => {
  const NEW = ['giants_knuckle', 'rimewalkers', 'heart_of_winter', 'frostgrip', 'crown_of_the_hollow', 'wolfmother_pelt'];

  it('are six, each with cold resistance, all dropping in the act', () => {
    const drops = new Set(act().flatMap((z) => z.uniques));
    for (const id of NEW) {
      const u = UNIQUES.find((x) => x.id === id);
      expect(u, id).toBeTruthy();
      expect(u!.mods.some((m) => m.affixId === 'cold_res'), id).toBe(true);
      expect(drops.has(id), id).toBe(true);
    }
    for (const z of act()) for (const id of z.uniques) expect(UNIQUES.some((u) => u.id === id), id).toBe(true);
  });
});

describe('staying closed', () => {
  it('is open to players', () => {
    expect(ACTS[3].open).toBe(true);
    ACT_PREVIEW.enabled = false;
    expect(actOpen(4)).toBe(true);
    expect(nextZones('highaltar').map((z) => z.id)).toContain('hollowpass');
  });

  it("the Frostbite rule's act stays out of the list until Act 4 opens", () => {
    expect(RULE_LABELS.frostbite.act).toBe(4);
  });
});

describe('Frostbite', () => {
  it('stacks build through the fight, and each one slows you', () => {
    const s = fighter([['heavy_strike', [ALWAYS]]]);
    const { c } = frostFight(s);
    run(s, c, BOSS_FROSTBITE_EVERY_MS * 3 + 100);
    expect(s.combat!.frostbite).toBe(3);

    const paced = (stacks: number) => {
      const f = fighter([['heavy_strike', [ALWAYS]]]);
      const { c: x } = frostFight(f);
      f.combat!.frostbite = stacks;
      f.combat!.actionMs = 1000;
      combatStep(f, x, 100, deriveStats(f));
      return 1000 - f.combat!.actionMs;
    };
    expect(paced(0)).toBeCloseTo(100);
    expect(paced(5)).toBeCloseTo(80);
  });

  it('freezes you solid at the cap: a cold shatter, then no actions until it thaws', () => {
    const s = fighter([['heavy_strike', [ALWAYS]]]);
    const { boss, c } = frostFight(s, ZONE, true);
    s.combat!.frostbite = BOSS_FROSTBITE_MAX - 1;
    boss.timers.frostbite = 50;
    const before = s.life;
    combatStep(s, c, 50, deriveStats(s));
    expect(s.combat!.frozenMs).toBe(BOSS_FROSTBITE_FREEZE_MS);
    expect(s.combat!.frostbite).toBe(0);
    expect(s.life).toBeLessThan(before);
    expect(c.events.some((e) => e.t === 'bossPhase' && e.text.includes('freezes you'))).toBe(true);

    s.combat!.actionMs = 0;
    const hurt = boss.life;
    run(s, c, BOSS_FROSTBITE_FREEZE_MS - 100);
    expect(boss.life).toBe(hurt);
    expect(s.combat!.frostbite).toBe(0);
    run(s, c, 2000);
    expect(s.combat!.frozenMs).toBe(0);
    expect(boss.life).toBeLessThan(hurt);
  });

  it('a guard shakes stacks off, by hand', () => {
    const s = fighter([['iron_guard', [MANUAL]]]);
    const { c } = frostFight(s, ZONE, true);
    s.combat!.frostbite = 8;
    s.combat!.actionMs = 0;
    expect(queueSkill(s, 0)).toBeNull();
    combatStep(s, c, 50, deriveStats(s));
    expect(s.combat!.frostbite).toBe(8 - BOSS_FROSTBITE_CLEANSE);
  });

  it('a movement skill does too', () => {
    const s = fighter([['cavalry_charge', [MANUAL]]]);
    s.skillBar[0]!.level = 1;
    const { c } = frostFight(s, ZONE, true);
    s.combat!.frostbite = 7;
    s.combat!.actionMs = 0;
    queueSkill(s, 0);
    run(s, c, 500);
    expect(s.combat!.frostbite).toBeLessThanOrEqual(7 - BOSS_FROSTBITE_CLEANSE + 1);
  });

  it('a flask clears them all and breaks the ice', () => {
    const s = fighter([['heavy_strike', [ALWAYS]]]);
    const { c } = frostFight(s);
    const f = newFlask(s, 'life_grand', 40);
    f.charges = 40;
    s.flaskSlots[0] = f;
    s.combat!.frostbite = 8;
    s.combat!.frozenMs = 2000;
    expect(useFlask(s, c, 0)).toBeNull();
    expect(s.combat!.frostbite).toBe(0);
    expect(s.combat!.frozenMs).toBe(0);
  });

  it('a rule fires at a stack count, and not before', () => {
    const base: RuleContext = ruleContext(fighter([['iron_guard', [AT_SIX]]]), deriveStats(fighter([['iron_guard', [AT_SIX]]])));
    expect(ruleAllows(AT_SIX, { ...base, frostbite: 5 }, false)).toBe(false);
    expect(ruleAllows(AT_SIX, { ...base, frostbite: 6 }, false)).toBe(true);
    expect(ruleAllows({ when: 'frostbite' }, { ...base, frostbite: 0 }, false)).toBe(false);

    // it waits for the swing in hand, then the guard goes off and the stacks drop
    const s = fighter([['iron_guard', [AT_SIX]]]);
    const { c } = frostFight(s, ZONE, true);
    run(s, c, BOSS_FROSTBITE_EVERY_MS * 5);
    expect(s.combat!.cooldowns[0]).toBe(0);
    let most = 0;
    for (let t = 0; t < 60_000; t += 50) {
      run(s, c, 50);
      most = Math.max(most, s.combat!.frostbite ?? 0);
    }
    expect(most).toBeGreaterThanOrEqual(6);
    expect(most).toBeLessThan(BOSS_FROSTBITE_MAX);
    expect(c.events.some((e) => e.t === 'bossPhase' && e.text.includes('freezes you'))).toBe(false);
  });

  it('comes with Vitals rules, so an old War Table already has it', () => {
    expect(RULE_LABELS.frostbite.unlock).toBe('vitals');
    const s = fighter([['iron_guard', [AT_SIX]]]);
    s.account.automation.rules = [];
    expect(ruleLockReason(s, 'frostbite')).toContain('Vitals');
    expect(STATIONS.find((x) => x.id === 'war_table')!.levels.find((l) => l.grants?.rules?.includes('vitals'))!.effect).toContain('Frostbite');
  });

  it('an Instilled flask drinks itself at its stack count', () => {
    const s = fighter([['heavy_strike', [ALWAYS]]]);
    const { c } = frostFight(s);
    const f = newFlask(s, 'life_grand', 40);
    f.charges = 40;
    f.instill = 'frostbite';
    s.flaskSlots[0] = f;
    s.combat!.frostbite = BOSS_FROSTBITE_INSTILL_AT - 1;
    combatStep(s, c, 50, deriveStats(s));
    expect(c.events.some((e) => e.t === 'flask')).toBe(false);
    s.combat!.frostbite = BOSS_FROSTBITE_INSTILL_AT;
    combatStep(s, c, 50, deriveStats(s));
    expect(c.events.some((e) => e.t === 'flask' && e.auto)).toBe(true);
    expect(s.combat!.frostbite).toBe(0);
  });

  it('stops with the boss that brought it', () => {
    const s = fighter([['heavy_strike', [ALWAYS]]]);
    const { boss, c } = frostFight(s);
    s.combat!.frostbite = 7;
    boss.life = 0;
    combatStep(s, c, 50, deriveStats(s));
    expect(s.combat!.frostbite).toBe(0);
  });

  it('a character with the rule survives better than one without', { timeout: 120_000 }, () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const fights = (rules: TacticRule[]) => seeds.map((seed) => realFight(fighter([['heavy_strike', [ALWAYS]], ['iron_guard', rules]]), 'hangingglacier', seed));
    const withRule = fights([{ when: 'frostbite', value: 4 }]);
    const without = fights([MANUAL]);
    const freezes = (r: ReturnType<typeof fights>) => r.reduce((n, x) => n + x.freezes, 0);
    expect(freezes(withRule)).toBeLessThan(freezes(without) * 0.7);
    seeds.forEach((_, i) => expect(withRule[i].ms, `seed ${i + 1}`).toBeGreaterThan(without[i].ms));
  });
});

describe('Frostbite offline', { timeout: 60_000 }, () => {
  it('a Frostbite boss stays in hiding without an answer', () => {
    const z = zoneDef(ZONE);
    expect(bossLeftToRules(fighter([['iron_guard', [MANUAL]]]), z)).toBe(false);
    expect(bossLeftToRules(fighter([['heavy_strike', [AT_SIX]]]), z)).toBe(false);
  });

  it('comes out for a cleansing skill on the rule, or a flask Instilled for it', () => {
    const z = zoneDef(ZONE);
    expect(bossLeftToRules(fighter([['iron_guard', [AT_SIX]]]), z)).toBe(true);
    const s = fighter([['heavy_strike', [ALWAYS]]]);
    const f = newFlask(s, 'life_grand', 40);
    f.instill = 'frostbite';
    s.flaskSlots[0] = f;
    expect(bossLeftToRules(s, z)).toBe(true);
  });

  it('a boss without Frostbite needs nothing new', () => {
    expect(bossLeftToRules(fighter([['iron_guard', [MANUAL]]]), zoneDef('hollowpass'))).toBe(true);
  });

  it('the rule keeps working while you are away', () => {
    const s = fighter([['heavy_strike', [ALWAYS]], ['iron_guard', [{ when: 'frostbite', value: 4 }]]]);
    const { c } = frostFight(s, ZONE, true);
    const sum = simulateOffline(s, c, 60_000);
    expect(sum.died).toBe(false);
    expect(c.events.some((e) => e.t === 'bossPhase')).toBe(false);
    expect(s.combat!.frostbite ?? 0).toBeLessThan(BOSS_FROSTBITE_MAX);
    expect(s.combat!.frozenMs ?? 0).toBe(0);
  });

  it('a fight left without an answer goes back into hiding', () => {
    const s = fighter([['heavy_strike', [ALWAYS]]]);
    const { c } = frostFight(s);
    simulateOffline(s, c, 60_000);
    expect(s.combat?.monsters.some((m) => m.isBoss)).toBeFalsy();
  });
});

describe('Frozen ground', () => {
  it('is its own kind, laid by the peaks, and rules can pick it', () => {
    expect(GROUND.frozen.type).toBe('cold');
    expect(GROUND_IN_PLAY.has('frozen')).toBe(true);
    expect(GROUND_IN_PLAY.has('chilled')).toBe(true);
    expect(groundFor('cold')).toBe('chilled');
    expect(groundFor('cold', true)).toBe('frozen');
    expect(groundFor('fire', true)).toBe('burning');
    const z = zoneDef('hangingglacier');
    expect(makeMonster(z.boss, true, 1).rime).toBe(true);
    expect(act().every((a) => a.boss.rime)).toBe(true);
  });

  it('a boss from an earlier act keeps Chilled ground, so old rules mean what they did', () => {
    expect(makeMonster(zoneDef('crypt').boss, true, 1).rime).toBeFalsy();
  });

  it('a rule on it fires, a rule on Chilled ground does not', () => {
    const s = fighter([['iron_guard', [{ when: 'onGround', ground: 'frozen' }]], ['heavy_strike', [ALWAYS]]]);
    const { c } = frostFight(s, ZONE, true);
    layGround(s.combat!.ground, PLAYER_SPOT, 'frozen', 0, 5000);
    const rc = ruleContext(s, deriveStats(s));
    expect(ruleAllows({ when: 'onGround', ground: 'frozen' }, rc, false)).toBe(true);
    expect(ruleAllows({ when: 'onGround', ground: 'chilled' }, rc, false)).toBe(false);
    s.combat!.actionMs = 0;
    combatStep(s, c, 50, deriveStats(s));
    expect(s.combat!.ground.some((g) => g.cell === PLAYER_SPOT)).toBe(false);
  });

  it('slows harder than Chilled ground and doubles Frostbite', () => {
    const paced = (kind: 'chilled' | 'frozen') => {
      const f = fighter([['heavy_strike', [ALWAYS]]]);
      const { c } = frostFight(f);
      layGround(f.combat!.ground, PLAYER_SPOT, kind, 0, 5000);
      f.combat!.actionMs = 1000;
      combatStep(f, c, 100, deriveStats(f));
      return 1000 - f.combat!.actionMs;
    };
    expect(paced('chilled')).toBeCloseTo(75);
    expect(paced('frozen')).toBeCloseTo(60);

    const s = fighter([['heavy_strike', [ALWAYS]]]);
    const { c } = frostFight(s);
    layGround(s.combat!.ground, PLAYER_SPOT, 'frozen', 0, 60_000);
    run(s, c, BOSS_FROSTBITE_EVERY_MS * 2 + 100);
    expect(s.combat!.frostbite).toBe(4);
  });
});

describe('the second trial', () => {
  const ascended = () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    const c = ctx();
    onBossFirstKill(s, c, 'pilgrimgate');
    chooseAscendancy(s, c, 'ravager');
    return { s, c };
  };

  it('stands on the last stage, giving 2 points', () => {
    expect(TRIALS.find((t) => t.n === 2)).toMatchObject({ zoneId: 'giantsthrone', points: 2 });
  });

  it('other Act 4 bosses give nothing', () => {
    const { s, c } = ascended();
    expect(s.ascendancy.points).toBe(2);
    onBossFirstKill(s, c, 'hollowpass');
    expect(s.ascendancy.points).toBe(2);
    expect(s.ascendancy.trials).toBe(1);
  });

  it('adds points on the Giants’ Throne without gating any nodes', () => {
    const { s, c } = ascended();
    s.ascendancy.points = ASCENDANCY_MAX_POINTS;
    const a = ASCENDANCY_BY_ID.ravager;
    expect(allocateAscNode(s, c, 'ravager_bloodlust_1')).toBeNull();
    expect(allocateAscNode(s, c, 'ravager_bloodlust')).toBeNull();
    expect(allocateAscNode(s, c, 'ravager_trample_1')).toBeNull();
    expect(allocateAscNode(s, c, 'ravager_trample')).toBeNull();
    expect(allocateAscNode(s, c, 'ravager_bridge')).toBeNull();
    expect(allocateAscNode(s, c, 'ravager_bridge_2')).toBeNull();
    expect(allocateAscNode(s, c, a.capstone.id)).toBeNull();

    const earned = ascended();
    onBossFirstKill(earned.s, earned.c, 'giantsthrone');
    expect(earned.s.ascendancy.trials).toBe(2);
    expect(earned.s.ascendancy.points).toBe(4);
  });

  it('passes once', () => {
    const { s, c } = ascended();
    onBossFirstKill(s, c, 'giantsthrone');
    expect(s.ascendancy.points).toBe(4);
    onBossFirstKill(s, c, 'giantsthrone');
    expect(s.ascendancy.points).toBe(4);
  });
});

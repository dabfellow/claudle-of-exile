import { afterEach, describe, expect, it } from 'vitest';
import { ACHIEVEMENT_BY_ID } from '../src/data/achievements';
import { ASCENDANCY_BY_ID, TRIALS } from '../src/data/ascendancies';
import { UNIQUES, uniqueDef } from '../src/data/bases';
import { ZONE_POS, actRegion } from '../src/data/continent';
import { BOSS_TABLES, DROP_TABLES, bossTable, dropTable } from '../src/data/drops';
import type { TacticRule } from '../src/data/gems';
import { MAP_DROPS } from '../src/data/maps';
import { ACT_PREVIEW, ACTS, actBossZone, actOpen, echoMechanics, echoTips, nextZones, zoneDef, zonesInAct, type BossMechanic, type ZoneDef } from '../src/data/zones';
import { absorbAccount } from '../src/engine/account';
import { checkAchievements } from '../src/engine/achievements';
import { allocateAscNode, onBossFirstKill } from '../src/engine/ascendancy';
import { bossLeftToRules, GROUND_IN_PLAY, rulesBreakChannels, unlockEverything } from '../src/engine/automation';
import { GROUND, PLAYER_SPOT, UNHOLY_RECOVERY } from '../src/engine/battlefield';
import { combatStep, makeMonster, ruleAllows, ruleContext, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem } from '../src/engine/gems';
import { campaignComplete, FINAL_ACT, stationLockReason } from '../src/engine/hideout';
import { createItem, droppableBases } from '../src/engine/items';
import { mapsOpen, MAPS_PREVIEW, rollMapDrops } from '../src/engine/maps';
import { seeded } from '../src/engine/rng';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';
import { trainingDummy } from './helpers';

const ctx = (seed = 1) => makeCtx(seeded(seed));
const act = () => zonesInAct(6);
const PLAIN: TacticRule = { when: 'always' };
const AIM: TacticRule = { when: 'always', aim: 'martyrs' };
const ON_CHANNEL: TacticRule = { when: 'enemyChannels' };
const ON_FROSTBITE: TacticRule = { when: 'frostbite', value: 5 };
const ELEMENTS = ['fire', 'cold', 'light'];
const SIGNATURE: BossMechanic[] = ['scorch', 'martyrs', 'frostbite', 'channel'];

/** A level 60 fighter with every unlock, standing in Act 6. Each gem names its rule. */
function fighter(gems: [string, TacticRule][]): GameState {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.tutorial.done = true;
  s.settings.autoFlee = false;
  s.settings.autoBoss = true;
  s.skills.combat = charXpForLevel(60);
  s.skillBar = s.skillBar.map(() => null);
  gems.forEach(([id, rule], i) => (s.skillBar[i] = { ...createSkillGem(s, id), rules: [rule] }));
  s.equipment.weapon = createItem(s, 'warlord_mace', 45, 'normal', seeded(1));
  unlockEverything(s);
  s.flaskSlots = s.flaskSlots.map(() => null);
  s.unlockedZones = act().map((z) => z.id);
  s.life = deriveStats(s).maxLife;
  s.mana = deriveStats(s).maxMana;
  return s;
}

/** The boss alone on the field, nothing walking in. */
function bossFight(s: GameState, zone: string, life?: number): { boss: MonsterInstance; c: ReturnType<typeof ctx> } {
  const c = ctx();
  startCombat(s, c, zone);
  const boss = makeMonster(zoneDef(zone).boss, true, 1);
  if (life) {
    // This abbreviated encounter scales the whole pool, including its profile's shield.
    const scale = life / boss.maxLife;
    boss.es = (boss.es ?? 0) * scale;
    boss.maxEs = (boss.maxEs ?? 0) * scale;
    boss.maxLife = boss.life = life;
  }
  s.combat!.monsters = [boss];
  s.combat!.spawnMs = 1e12;
  s.combat!.gates = s.combat!.gates!.map(() => 1e12);
  return { boss, c };
}

function run(s: GameState, c: ReturnType<typeof ctx>, ms: number): void {
  const d = deriveStats(s);
  for (let t = 0; t < ms && s.combat && s.life > 0; t += 100) combatStep(s, c, 100, d);
}

/** The rules that leave this boss's mechanics answered. */
function answers(z: ZoneDef): [string, TacticRule][] {
  const has = (k: BossMechanic) => !!z.boss.mechanics?.includes(k);
  return [
    ...(has('channel') ? [['war_cry', ON_CHANNEL] as [string, TacticRule]] : []),
    ...(has('frostbite') ? [['iron_guard', ON_FROSTBITE] as [string, TacticRule]] : []),
    ['heavy_strike', has('martyrs') ? AIM : PLAIN],
  ];
}

describe('Act 6: The Shattered Throne', () => {
  afterEach(() => {
    ACT_PREVIEW.enabled = true;
  });

  it('has 18 stages at monster levels 57 to 65, with boss levels climbing to 66', () => {
    expect(act()).toHaveLength(18);
    expect(act()[0].id).toBe('exilesgate');
    for (const z of act()) {
      for (const m of z.monsters) {
        expect(m.level).toBeGreaterThanOrEqual(57);
        expect(m.level).toBeLessThanOrEqual(65);
      }
    }
    const bosses = act().map((z) => z.boss.level);
    expect(bosses).toEqual([...bosses].sort((a, b) => a - b));
    expect(bosses[0]).toBe(58);
    expect(bosses.at(-1)).toBe(66);
    expect(actBossZone(6)?.id).toBe('shatteredthrone');
  });

  it("follows Act 5's last area, and every area sits on the map inside the act's region", () => {
    expect(zoneDef('exilesgate').requires?.after).toEqual(['maelstrom']);
    expect(nextZones('maelstrom').map((z) => z.id)).toContain('exilesgate');
    const region = actRegion(6)!.points;
    const inside = ([x, y]: [number, number]) => {
      let hit = false;
      for (let i = 0, j = region.length - 1; i < region.length; j = i++) {
        const [xi, yi] = region[i];
        const [xj, yj] = region[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    };
    expect(act().filter((z) => !ZONE_POS[z.id] || !inside(ZONE_POS[z.id])).map((z) => z.id)).toEqual([]);
  });

  it('is open to players', () => {
    expect(ACTS.find((a) => a.n === 6)!.open).toBe(true);
    ACT_PREVIEW.enabled = false;
    expect(actOpen(6)).toBe(true);
    expect(nextZones('maelstrom').map((z) => z.id)).toContain('exilesgate');
  });

  it('needs all three resistances, on trash and in each boss', () => {
    const count = (t: string) => act().flatMap((z) => z.monsters).filter((m) => m.dmgType === t).length;
    for (const t of ELEMENTS) expect(count(t)).toBeGreaterThanOrEqual(20);
    expect(count('phys')).toBeLessThan(10);
    for (const z of act()) {
      expect([z.boss.dmgType, z.boss.slamType, z.boss.novaType].sort(), z.id).toEqual([...ELEMENTS].sort());
    }
  });

  it('slams in the element the boss names', () => {
    const s = fighter([]);
    const { boss, c } = bossFight(s, 'exilesgate');
    boss.mechanics = ['slam'];
    boss.timers.slam = 0;
    boss.chained = undefined;
    run(s, c, 3400);
    expect(c.events.some((e) => e.t === 'hit' && e.target === 'player' && e.dmgType === 'light')).toBe(true);
  });

  it('has drop tables for its tiers, richer than the last act', () => {
    for (const z of act()) {
      expect(dropTable(z.tier)).toBe(DROP_TABLES[z.tier]);
      expect(bossTable(z.tier)).toBe(BOSS_TABLES[z.tier]);
    }
    expect(DROP_TABLES[15].currencyChance).toBeGreaterThan(DROP_TABLES[14].currencyChance);
    expect(DROP_TABLES[17].rarity.rare).toBeGreaterThan(DROP_TABLES[15].rarity.rare);
    expect(BOSS_TABLES[17].guaranteed.length).toBeGreaterThan(0);
  });

  it('reaches bases of level 80 by the act boss, starting past where Act 5 stops', () => {
    const z = actBossZone(6)!;
    const top = z.boss.level + z.ilvlBonus!;
    expect(top).toBe(80);
    expect(Math.max(...droppableBases(top).map((b) => b.reqLevel))).toBe(80);
    const first = act()[0];
    expect(first.monsters[0].level + first.ilvlBonus!).toBeGreaterThan(68);
  });

  it('its uniques exist, and the six new ones have a home, all three resistances and a wearable base', () => {
    for (const z of act()) for (const id of z.uniques) expect(uniqueDef(id)).toBeDefined();
    const fresh = ['oathbreaker', 'kingsmarch', 'last_decree', 'crownbreaker_mask', 'hand_of_the_regent', 'regents_mantle'];
    expect(fresh.filter((id) => !UNIQUES.some((u) => u.id === id))).toEqual([]);
    expect(fresh.filter((id) => !act().some((z) => z.uniques.includes(id)))).toEqual([]);
    for (const id of fresh) expect(uniqueDef(id).mods.some((m) => m.affixId === 'all_res')).toBe(true);
    expect(fresh.every((id) => actBossZone(6)!.uniques.includes(id))).toBe(true);
  });

  it('has its achievements', () => {
    expect(ACHIEVEMENT_BY_ID.act_6.act).toBe(6);
    expect(ACHIEVEMENT_BY_ID.conqueror_6.target).toBe(18);
    const s = fighter([]);
    s.bossesDefeated.push('shatteredthrone');
    expect(ACHIEVEMENT_BY_ID.act_6.progress(s)).toBe(1);
  });

  it('has an outro that leaves something on the throne', () => {
    expect(ACTS.find((a) => a.n === 6)!.outro).toMatch(/never wore a crown/);
  });
});

describe('Echoes', () => {
  it('every boss brings back mechanics two at a time, and they count as its mechanics', () => {
    for (const z of act()) {
      expect(z.boss.echoes?.length, z.id).toBeGreaterThan(0);
      for (const pair of z.boss.echoes!) {
        expect(new Set(pair).size).toBe(2);
        for (const k of pair) expect(z.boss.mechanics).toContain(k);
      }
    }
  });

  it('every pairing of the signature mechanics turns up', () => {
    const seen = new Set(act().flatMap((z) => z.boss.echoes!).map((p) => [...p].sort().join('+')));
    for (const a of SIGNATURE) {
      for (const b of SIGNATURE) if (a < b) expect(seen, `${a}+${b}`).toContain(`${a}+${b}`);
    }
  });

  it('only the pair at hand is in force', () => {
    const king = zoneDef('shatteredthrone').boss;
    expect(echoMechanics(king, 0)).toEqual(expect.arrayContaining(['scorch', 'martyrs', 'slam']));
    expect(echoMechanics(king, 0)).not.toContain('channel');
    expect(echoMechanics(king, 1)).toEqual(expect.arrayContaining(['frostbite', 'channel']));
    expect(echoMechanics(king, 1)).not.toContain('martyrs');
    expect(makeMonster(king, true).mechanics).toEqual(echoMechanics(king, 0));
    expect(echoMechanics(zoneDef('blackharbor').boss, 0)).toEqual(zoneDef('blackharbor').boss.mechanics);
  });

  it('the last king moves on as his life falls, and his chains return in the last phase', () => {
    const s = fighter([]);
    const { boss, c } = bossFight(s, 'shatteredthrone', 1e6);
    boss.mechanics = boss.mechanics.filter((k) => k !== 'slam' && k !== 'nova' && k !== 'summon');
    boss.chained = undefined;
    boss.martyrWaves = 1;
    boss.life = boss.maxLife * 0.6;
    s.life = 1e7;
    run(s, c, 200);
    expect(boss.echoPhase).toBe(1);
    expect(boss.mechanics).toContain('channel');
    expect(boss.mechanics).not.toContain('martyrs');
    expect(c.events.some((e) => e.t === 'bossPhase' && e.text.includes('brings back'))).toBe(true);
    boss.casting = -1;
    boss.life = boss.maxLife * 0.2;
    run(s, c, 200);
    expect(boss.echoPhase).toBe(2);
    expect(boss.mechanics).toContain('martyrs');
    expect(boss.chained).toBe(true);
    expect(s.combat!.monsters.filter((m) => m.martyr)).toHaveLength(2);
  });

  it('Frostbite stops with its phase', () => {
    const s = fighter([]);
    const { boss, c } = bossFight(s, 'shatteredthrone', 1e6);
    boss.mechanics = ['frostbite'];
    boss.echoPhase = 1;
    s.combat!.frostbite = 4;
    boss.life = boss.maxLife * 0.2;
    boss.martyrWaves = 2;
    s.life = 1e7;
    run(s, c, 200);
    expect(boss.echoPhase).toBe(2);
    expect(s.combat!.frostbite).toBe(0);
  });

  it('a stun cannot break a channel on a chained boss, and an interrupt can', () => {
    const stun = fighter([['heavy_strike', ON_CHANNEL]]);
    const wall = fighter([['war_cry', ON_CHANNEL]]);
    expect(rulesBreakChannels(stun)).toBe(true);
    expect(rulesBreakChannels(stun, true)).toBe(false);
    expect(rulesBreakChannels(wall, true)).toBe(true);
    expect(bossLeftToRules(fighter([['heavy_strike', { ...ON_CHANNEL, aim: 'martyrs' }]]), zoneDef('burnedarchive'))).toBe(false);

    const { boss, c } = bossFight(wall, 'burnedarchive', 1e7);
    boss.mechanics = ['channel', 'martyrs'];
    boss.chained = true;
    boss.martyrWaves = 2;
    boss.timers.channel = 0;
    wall.life = 1e7;
    run(wall, c, 1500);
    expect(c.events.some((e) => e.t === 'interrupt')).toBe(true);
    expect(boss.surges ?? 0).toBe(0);
  });

  describe('every boss, by rule', () => {
    it('stays in hiding offline until each thing it brings is answered, and no sooner', () => {
      for (const z of act()) {
        const full = answers(z);
        expect(bossLeftToRules(fighter(full), z), z.id).toBe(true);
        for (const gem of full) {
          if (gem[1] === PLAIN) continue;
          const without = full.map((g): [string, TacticRule] => (g === gem ? [g[0], PLAIN] : g));
          expect(bossLeftToRules(fighter(without), z), `${z.id} without ${gem[0]}`).toBe(false);
        }
      }
    });

    it('can be finished: no pairing leaves the fight stuck', () => {
      for (const z of act()) {
        const s = fighter(answers(z));
        const { boss, c } = bossFight(s, z.id, 2000);
        // Isolate mechanic pairings from the deliberately undergeared fighter's damage matchup.
        trainingDummy(boss);
        boss.damage = 1;
        const d = deriveStats(s);
        for (let t = 0; t < 300_000 && s.combat && boss.life > 0; t += 100) {
          s.life = d.maxLife;
          s.mana = d.maxMana;
          for (const m of s.combat.monsters) if (m.martyr) m.life = Math.min(m.life, 1);
          combatStep(s, c, 100, d);
        }
        expect(boss.life, z.id).toBeLessThanOrEqual(0);
      }
    });
  });

  it('warns where a pairing changes the answer', () => {
    expect(echoTips(zoneDef('burnedarchive').boss).join()).toMatch(/interrupt/);
    expect(echoTips(zoneDef('dryaqueduct').boss).join()).toMatch(/Frostbite/);
    expect(echoTips(zoneDef('shatteredthrone').boss).length).toBe(2);
    expect(echoTips(zoneDef('kingsroad').boss)).toEqual([]);
  });
});

describe('unholy ground', () => {
  /** Standing on it, nothing else going on. */
  function onUnholy(setup?: (s: GameState) => void) {
    const s = fighter([]);
    setup?.(s);
    const { boss, c } = bossFight(s, 'kingsmint', 1e7);
    boss.mechanics = [];
    boss.chained = undefined;
    boss.stunMs = 1e9;
    boss.damage = 0;
    s.combat!.ground = [{ cell: PLAYER_SPOT, kind: 'unholy', dps: 200, remainingMs: 8000, durationMs: 8000 }];
    return { s, c };
  }

  it('is in play, laid by casters and bosses alike, and a ground rule can watch it', () => {
    expect(GROUND_IN_PLAY.has('unholy')).toBe(true);
    expect(makeMonster(zoneDef('exilesgate').monsters[3], false).groundKind).toBe('unholy');
    expect(makeMonster(zoneDef('exilesgate').boss, true).groundKind).toBe('unholy');
    const { s, c } = onUnholy();
    run(s, c, 100);
    expect(ruleAllows({ when: 'onGround', ground: 'unholy' }, ruleContext(s, deriveStats(s)), false)).toBe(true);
    expect(GROUND.unholy.name).toBe('Unholy ground');
  });

  it('deals whichever element you resist least', () => {
    const weakest = (res: Record<string, number>) => {
      const { s, c } = onUnholy();
      const d = deriveStats(s);
      Object.assign(d.res, res);
      s.life = 1e7;
      const before = s.life;
      for (let t = 0; t < 1200; t += 100) combatStep(s, c, 100, d);
      return { lost: before - s.life, hit: c.events.find((e) => e.t === 'hit' && e.target === 'player') };
    };
    const lowCold = weakest({ fire: 75, cold: 0, light: 75 });
    expect(lowCold.hit).toMatchObject({ dmgType: 'cold' });
    const lowLight = weakest({ fire: 75, cold: 75, light: -20 });
    expect(lowLight.hit).toMatchObject({ dmgType: 'light' });
    expect(lowLight.lost).toBeGreaterThan(lowCold.lost);
    const capped = weakest({ fire: 75, cold: 75, light: 75 });
    expect(capped.lost).toBeLessThan(lowCold.lost);
  });

  it('halves flask healing and regeneration, and only while you stand on it', () => {
    const healed = (ground: boolean) => {
      const { s, c } = onUnholy();
      if (!ground) s.combat!.ground = [];
      else s.combat!.groundProofMs = 0;
      s.combat!.ground.forEach((g) => (g.dps = 0));
      s.life = 100;
      s.combat!.heals = [{ perMs: 0.1, remainingMs: 1000, resource: 'life' }] as never;
      run(s, c, 1000);
      return s.life - 100;
    };
    expect(healed(true)).toBeCloseTo(healed(false) * UNHOLY_RECOVERY, -1);
  });

  it('is left behind by stepping out, like any other ground', () => {
    const s = fighter([['smoke_step', PLAIN]]);
    const { c } = bossFight(s, 'kingsmint', 1e7);
    s.combat!.ground = [{ cell: PLAYER_SPOT, kind: 'unholy', dps: 1, remainingMs: 8000, durationMs: 8000 }];
    run(s, c, 2000);
    expect(s.combat!.ground.filter((g) => g.cell === PLAYER_SPOT)).toEqual([]);
  });
});

describe('the third trial', () => {
  const ascended = () => {
    const s = fighter([]);
    const c = ctx();
    s.ascendancy.id = 'ravager';
    s.ascendancy.trials = 2;
    s.ascendancy.points = 4;
    return { s, c };
  };

  it('stands on the first stage, giving 3 points', () => {
    expect(TRIALS.find((t) => t.n === 3)).toMatchObject({ zoneId: act()[0].id, points: 3 });
  });

  it('is the first trial that gives enough points to reach a capstone', () => {
    const { s, c } = ascended();
    const a = ASCENDANCY_BY_ID.ravager;
    s.ascendancy.nodes = ['ravager_bloodlust_1', 'ravager_bloodlust', 'ravager_trample_1', 'ravager_trample'];
    expect(allocateAscNode(s, c, 'ravager_bridge')).toBe('No points left');
    onBossFirstKill(s, c, 'exilesgate');
    expect(s.ascendancy.trials).toBe(3);
    expect(s.ascendancy.points).toBe(7);
    expect(allocateAscNode(s, c, 'ravager_bridge')).toBeNull();
    expect(allocateAscNode(s, c, 'ravager_bridge_2')).toBeNull();
    expect(allocateAscNode(s, c, a.capstone.id)).toBeNull();
    expect(c.events.some((e) => e.t === 'trialPassed' && e.n === 3)).toBe(true);
  });

  it('other Act 6 bosses give nothing', () => {
    const { s, c } = ascended();
    onBossFirstKill(s, c, 'kingsroad');
    expect(s.ascendancy.points).toBe(4);
    expect(s.ascendancy.trials).toBe(2);
  });
});

describe('the ending', () => {
  afterEach(() => {
    ACTS[5].open = true;
    ACTS[5].preview = false;
    ACT_PREVIEW.enabled = true;
    MAPS_PREVIEW.enabled = true;
  });
  const beaten = () => {
    const s = fighter([]);
    s.bossesDefeated.push(actBossZone(FINAL_ACT)!.id);
    return s;
  };
  const closed = () => {
    ACTS[5].open = false;
    ACTS[5].preview = true;
    ACT_PREVIEW.enabled = false;
    MAPS_PREVIEW.enabled = false;
  };

  it('beating the Last King opens the Map Device and the Exile for the account', () => {
    const s = beaten();
    expect(s.account.exileUnlocked).toBe(false);
    MAPS_PREVIEW.enabled = false;
    const c = ctx();
    tick(s, c, 50);
    expect(s.account.exileUnlocked).toBe(true);
    expect(s.account.campaignDone).toBe(true);
    expect(stationLockReason(s, 'map_device')).toBeNull();
    expect(mapsOpen(s)).toBe(true);
    expect(c.events.some((e) => e.t === 'info' && e.text.includes('Map Device wakes') && e.text.includes('Exile'))).toBe(true);
  });

  it('is said once', () => {
    const s = beaten();
    const c = ctx();
    tick(s, c, 50);
    tick(s, c, 50);
    expect(c.events.filter((e) => e.t === 'info' && e.text.includes('Map Device wakes'))).toHaveLength(1);
  });

  it("can't happen while the act is closed, even from a preview save", () => {
    closed();
    const s = beaten();
    tick(s, ctx(), 50);
    expect(campaignComplete(s)).toBe(false);
    expect(s.account.exileUnlocked).toBe(false);
    expect(s.account.campaignDone).toBeFalsy();
    expect(stationLockReason(s, 'map_device')).toMatch(/Act 6/);
    expect(mapsOpen(s)).toBe(false);
  });

  it('an account flag from a preview build opens nothing while the act is closed either', () => {
    closed();
    const s = fighter([]);
    s.account.campaignDone = true;
    expect(campaignComplete(s)).toBe(false);
    expect(mapsOpen(s)).toBe(false);
  });

  it("holds for the account's other characters", () => {
    const first = beaten();
    tick(first, ctx(), 50);
    const alt = fighter([]);
    alt.account = first.account;
    expect(alt.bossesDefeated).not.toContain('shatteredthrone');
    expect(campaignComplete(alt)).toBe(true);
    expect(stationLockReason(alt, 'map_device')).toBeNull();
  });

  it('still fires for an old account that already held the Exile', () => {
    const s = beaten();
    s.account.exileUnlocked = true;
    const c = ctx();
    tick(s, c, 50);
    expect(s.account.campaignDone).toBe(true);
    expect(c.events.find((e) => e.t === 'info' && e.text.includes('Map Device wakes'))).toMatchObject({ text: 'Campaign complete: the Map Device wakes' });
  });

  it('carries over when accounts are folded together', () => {
    const a = fighter([]).account;
    absorbAccount(a, { campaignDone: true, exileUnlocked: true, stash: [] });
    expect(a.campaignDone).toBe(true);
  });

  it('maps start dropping once the campaign is beaten, and not before', () => {
    closed();
    const s = fighter([]);
    const mon = makeMonster({ ...zoneDef('kingsmint').boss, level: MAP_DROPS.campaignMinLevel }, true);
    const held = () => Object.values(s.maps.stock).reduce((a, n) => a + n, 0);
    for (let i = 0; i < 200; i++) rollMapDrops(s, ctx(i), mon);
    expect(held()).toBe(0);
    ACT_PREVIEW.enabled = true;
    s.account.campaignDone = true;
    for (let i = 0; i < 200; i++) rollMapDrops(s, ctx(i), mon);
    expect(held()).toBeGreaterThan(0);
  });
});

describe('Unbroken: all six acts without ever dying', () => {
  /** Fell the Last King, having died this many times on the way. */
  function kingFalls(deaths: number): GameState {
    const s = fighter([['heavy_strike', PLAIN]]);
    s.lifetime.deaths = deaths;
    const { boss, c } = bossFight(s, 'shatteredthrone');
    boss.mechanics = [];
    boss.chained = undefined;
    boss.martyrWaves = 2;
    boss.life = 1;
    s.life = 1e7;
    run(s, c, 3000);
    expect(s.bossesDefeated).toContain('shatteredthrone');
    checkAchievements(s, c);
    return s;
  }

  it('hands over The Unbroken Temper when the king falls to a character that has never died', () => {
    const s = kingFalls(0);
    expect(s.achievements).toContain('act_6_deathless');
    expect(s.inventory.some((i) => i.uniqueId === 'unbroken_temper')).toBe(true);
    expect(uniqueDef('unbroken_temper').noTrade).toBe(true);
  });

  it('any death on the character rules it out', () => {
    const s = kingFalls(1);
    expect(s.achievements).not.toContain('act_6_deathless');
    expect(s.inventory.some((i) => i.uniqueId === 'unbroken_temper')).toBe(false);
  });
});

describe('Unbroken for characters already past Act 6', () => {
  it('a character that beat the Last King before 0.3.19 and has never died earns it on load', () => {
    const s = fighter([]);
    s.bossesDefeated.push('shatteredthrone');
    const c = ctx();
    checkAchievements(s, c);
    expect(s.achievements).toContain('act_6_deathless');
    expect(s.inventory.filter((i) => i.uniqueId === 'unbroken_temper')).toHaveLength(1);
    checkAchievements(s, c);
    expect(s.inventory.filter((i) => i.uniqueId === 'unbroken_temper')).toHaveLength(1);
  });

  it('one that has died does not', () => {
    const s = fighter([]);
    s.bossesDefeated.push('shatteredthrone');
    s.lifetime.deaths = 1;
    checkAchievements(s, ctx());
    expect(s.achievements).not.toContain('act_6_deathless');
  });
});

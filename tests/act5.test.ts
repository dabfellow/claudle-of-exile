import { afterEach, describe, expect, it } from 'vitest';
import { UNIQUES, uniqueDef } from '../src/data/bases';
import { ZONE_POS, actRegion } from '../src/data/continent';
import { BOSS_TABLES, DROP_TABLES, bossTable, dropTable } from '../src/data/drops';
import { RULE_LABELS, type TacticRule } from '../src/data/gems';
import { ACT_PREVIEW, ACTS, actBossZone, actOpen, BOSS_CHANNEL_EVERY_MS, BOSS_CHANNEL_LAND_MULT, nextZones, roadsInto, zoneDef, zonesInAct } from '../src/data/zones';
import { bossLeftToRules, GROUND_IN_PLAY, rulesBreakChannels, unlockEverything } from '../src/engine/automation';
import { CHILLED_GROUND_SLOW, GROUND, PLAYER_SPOT, STORMWATER_COOLDOWN } from '../src/engine/battlefield';
import { channelPulse, chooseSkill, combatStep, makeMonster, queueSkill, ruleAllows, ruleContext, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem } from '../src/engine/gems';
import { droppableBases, createItem } from '../src/engine/items';
import { simulateOffline } from '../src/engine/offline';
import { zoneLockText } from '../src/engine/progress';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';

const ctx = (seed = 1) => makeCtx(seeded(seed));
const act = () => zonesInAct(5);
const ZONE = 'wreckline';
const ON_CHANNEL: TacticRule = { when: 'enemyChannels' };
const ON_WINDUP: TacticRule = { when: 'enemyCasting' };
const PLAIN: TacticRule = { when: 'always' };

/** A level 55 fighter with every unlock, standing in an Act 5 area. Each gem names its rule. */
function fighter(gems: [string, TacticRule][]): GameState {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.tutorial.done = true;
  s.settings.autoFlee = false;
  s.settings.autoBoss = true;
  s.skills.combat = charXpForLevel(55);
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

/** The boss alone on the field, about to channel, and doing nothing else. */
function channeler(s: GameState, zone = ZONE, life = 1e7): { boss: MonsterInstance; c: ReturnType<typeof ctx> } {
  const c = ctx();
  startCombat(s, c, zone);
  const boss = makeMonster(zoneDef(zone).boss, true, 1);
  boss.mechanics = ['channel'];
  boss.maxLife = boss.life = life;
  boss.timers.channel = 0;
  s.combat!.monsters = [boss];
  s.combat!.spawnMs = 1e12;
  return { boss, c };
}

function run(s: GameState, c: ReturnType<typeof ctx>, ms: number): void {
  const d = deriveStats(s);
  for (let t = 0; t < ms && s.combat && s.life > 0; t += 100) combatStep(s, c, 100, d);
}

const passes = (s: GameState, rule: TacticRule) => ruleAllows(rule, ruleContext(s, deriveStats(s)), false);

describe('Act 5: The Sunless Sea', () => {
  afterEach(() => {
    ACT_PREVIEW.enabled = true;
  });

  it('has 14 stages at monster levels 49 to 57, with boss levels climbing to 58', () => {
    expect(act()).toHaveLength(14);
    expect(act()[0].id).toBe('blackharbor');
    for (const z of act()) {
      for (const m of z.monsters) {
        expect(m.level).toBeGreaterThanOrEqual(49);
        expect(m.level).toBeLessThanOrEqual(57);
      }
    }
    const bosses = act().map((z) => z.boss.level);
    expect(bosses).toEqual([...bosses].sort((a, b) => a - b));
    expect(bosses[0]).toBe(50);
    expect(bosses.at(-1)).toBe(58);
    expect(actBossZone(5)?.id).toBe('maelstrom');
  });

  it("follows Act 4's last area with one entry, and every area sits on the map inside the act's region", () => {
    expect(roadsInto(act()[0])).toEqual(['giantsthrone']);
    expect(nextZones('highaltar').map((z) => z.id)).not.toContain('blackharbor');
    const region = actRegion(5)!.points;
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

  it('its locked card reads, with or without the area on the road in', () => {
    expect(zoneLockText(newGame(1, { name: 'T', classId: 'warrior' }), act()[0])).toMatch(/to unlock/);
  });

  it('is open to players', () => {
    expect(ACTS.find((a) => a.n === 5)!.open).toBe(true);
    ACT_PREVIEW.enabled = false;
    expect(actOpen(5)).toBe(true);
    expect(nextZones('giantsthrone').map((z) => z.id)).toContain('blackharbor');
  });

  it('needs fire and lightning together, on trash and in each boss', () => {
    const trash = act().flatMap((z) => z.monsters);
    const count = (t: string) => trash.filter((m) => m.dmgType === t).length;
    expect(count('fire')).toBeGreaterThan(count('phys'));
    expect(count('light')).toBeGreaterThan(count('phys'));
    expect(count('cold')).toBeLessThan(count('phys') / 2);
    expect(Math.abs(count('fire') - count('light'))).toBeLessThanOrEqual(3);
    for (const z of act()) {
      const pair = [z.boss.dmgType, z.boss.novaType ?? z.boss.dmgType];
      if (z.boss.mechanics!.some((k) => k === 'nova' || k === 'scorch')) expect([...pair].sort()).toEqual(['fire', 'light']);
    }
  });

  it('channels from the second stage on, on most bosses, and the act boss has every mechanic', () => {
    expect(zoneDef('blackharbor').boss.mechanics).not.toContain('channel');
    expect(zoneDef('wreckline').boss.mechanics).toContain('channel');
    expect(act().filter((z) => z.boss.mechanics!.includes('channel')).length).toBeGreaterThanOrEqual(11);
    expect([...actBossZone(5)!.boss.mechanics!].sort()).toEqual(['channel', 'enrage', 'martyrs', 'nova', 'scorch', 'slam', 'summon', 'ward']);
    // a channel is long: longer than any slam or nova in the act
    for (const z of act()) if (z.boss.channel) expect(z.boss.channel.ms).toBeGreaterThan(Math.max(z.boss.slam?.ms ?? 0, z.boss.nova?.ms ?? 0));
  });

  it('every unique it drops exists, and the six new ones have a home and both resistances', () => {
    const drops = new Set(act().flatMap((z) => z.uniques));
    for (const id of drops) expect(uniqueDef(id)).toBeTruthy();
    for (const id of ['leviathan_hide', 'deckwalkers', 'bosuns_oath', 'tide_crown', 'corposant', 'harpoons_answer']) {
      expect(drops).toContain(id);
      const mods = UNIQUES.find((u) => u.id === id)!.mods.map((m) => m.affixId);
      expect(mods).toEqual(expect.arrayContaining(['fire_res', 'light_res']));
    }
  });

  it('has drop tables for its tiers, richer than the last act', () => {
    for (const z of act()) {
      expect(DROP_TABLES[z.tier]).toBeTruthy();
      expect(BOSS_TABLES[z.tier]).toBeTruthy();
    }
    expect(dropTable(12).rarity.rare).toBeGreaterThan(dropTable(9).rarity.rare);
    expect(dropTable(14).rarity.rare).toBeGreaterThan(dropTable(12).rarity.rare);
    expect(bossTable(14).guaranteed.find((g) => g.id === 'divine')!.qty).toBeGreaterThan(bossTable(9).guaranteed.find((g) => g.id === 'divine')!.qty);
  });

  it('reaches bases of about level 68 by the act boss, and none past it', () => {
    const z = actBossZone(5)!;
    const top = z.boss.level + z.ilvlBonus!;
    expect(top).toBe(68);
    const levels = droppableBases(top).map((b) => b.reqLevel);
    expect(Math.max(...levels)).toBe(68);
    expect(droppableBases(act()[0].monsters[0].level + act()[0].ilvlBonus!).some((b) => b.reqLevel >= 54)).toBe(true);
  });
});

describe('storm-tossed water', () => {
  it('is in play, laid by storm casters and storm bosses alike, and a ground rule can watch it', () => {
    expect(GROUND_IN_PLAY.has('stormwater')).toBe(true);
    const s = fighter([['heavy_strike', PLAIN]]);
    const c = ctx();
    startCombat(s, c, 'squallbanks');
    const caster = makeMonster(zoneDef('squallbanks').monsters[3], false, 2);
    expect(caster.groundKind).toBe('stormwater');
    caster.life = caster.maxLife = 1e7;
    caster.cell = 1;
    caster.attackTimer = caster.attackMs;
    s.combat!.monsters = [caster];
    s.combat!.spawnMs = 1e12;
    s.skillBar = s.skillBar.map(() => null);
    run(s, c, 200);
    const under = s.combat!.ground.filter((g) => g.cell === PLAYER_SPOT);
    expect(under.map((g) => g.kind)).toEqual(['stormwater']);
    expect(passes(s, { when: 'onGround', ground: 'stormwater' })).toBe(true);
    expect(GROUND.stormwater.type).toBe('light');
  });

  it('lets cooldowns run slower, and nothing else does', () => {
    const cooled = (kind: 'stormwater' | 'burning') => {
      const s = fighter([['war_cry', { when: 'manual' }]]);
      const { c } = channeler(s);
      s.combat!.monsters[0].mechanics = [];
      s.combat!.cooldowns[0] = 5000;
      s.combat!.ground.push({ cell: PLAYER_SPOT, kind, dps: 0, remainingMs: 99999, durationMs: 99999 });
      run(s, c, 1000);
      return 5000 - s.combat!.cooldowns[0];
    };
    expect(cooled('burning')).toBeCloseTo(1000, -1);
    expect(cooled('stormwater')).toBeCloseTo(1000 * STORMWATER_COOLDOWN, -1);
    expect(STORMWATER_COOLDOWN).not.toBe(CHILLED_GROUND_SLOW);
  });
});

describe('channels', () => {
  it('starts as a long cast the UI and events can tell from a slam', () => {
    const s = fighter([['heavy_strike', { when: 'manual' }]]);
    const { boss, c } = channeler(s);
    run(s, c, 200);
    expect(boss.castKind).toBe('channel');
    expect(boss.castTotal).toBe(zoneDef(ZONE).boss.channel!.ms);
    expect(c.events.some((e) => e.t === 'bossCast' && e.kind === 'channel')).toBe(true);
  });

  it('a rule tells a channel from a slam', () => {
    expect(RULE_LABELS.enemyChannels.unlock).toBe('windups');
    const s = fighter([['heavy_strike', { when: 'manual' }]]);
    const { boss, c } = channeler(s);
    run(s, c, 200);
    expect(passes(s, ON_CHANNEL)).toBe(true);
    expect(passes(s, ON_WINDUP)).toBe(false);
    boss.castKind = 'slam';
    expect(passes(s, ON_CHANNEL)).toBe(false);
    expect(passes(s, ON_WINDUP)).toBe(true);
    boss.casting = -1;
    boss.castKind = null;
    expect(passes(s, ON_CHANNEL)).toBe(false);
    expect(passes(s, ON_WINDUP)).toBe(false);
  });

  it('grows: its pulses hit harder as it goes, then it lands hardest of all and the boss grows stronger', () => {
    expect(channelPulse(1)).toBeGreaterThan(channelPulse(0) * 4);
    expect(BOSS_CHANNEL_LAND_MULT).toBeGreaterThan(channelPulse(1) * 4);
    const s = fighter([['heavy_strike', { when: 'manual' }]]);
    const { boss, c } = channeler(s);
    const d = deriveStats(s);
    const hits: number[] = [];
    for (let t = 0; t < 7000; t += 100) {
      s.life = d.maxLife;
      combatStep(s, c, 100, d);
      if (s.life < d.maxLife) hits.push(d.maxLife - s.life);
    }
    expect(hits.length).toBeGreaterThanOrEqual(5);
    expect(hits[hits.length - 2]).toBeGreaterThan(hits[0] * 2);
    expect(hits.at(-1)).toBeGreaterThan(hits[hits.length - 2] * 2);
    expect(boss.surges).toBe(1);
    expect(boss.timers.channel).toBeGreaterThan(BOSS_CHANNEL_EVERY_MS * 0.9);
  });

  it('an interrupt breaks it, by hand: the boss staggers and nothing lands', () => {
    const s = fighter([['war_cry', { when: 'manual' }]]);
    const { boss, c } = channeler(s);
    run(s, c, 200);
    expect(queueSkill(s, 0)).toBeNull();
    run(s, c, 2000);
    expect(boss.castKind).toBeNull();
    expect(boss.surges ?? 0).toBe(0);
    expect(boss.timers.channel).toBeGreaterThan(BOSS_CHANNEL_EVERY_MS * 0.8);
    expect(c.events.some((e) => e.t === 'interrupt')).toBe(true);
    expect(c.events.some((e) => e.t === 'bossPhase' && e.text.includes('staggers'))).toBe(true);
  });

  it('any stun or freeze breaks it, whatever it came from', () => {
    for (const hit of ['stunMs', 'frozenMs'] as const) {
      const s = fighter([['heavy_strike', { when: 'manual' }]]);
      const { boss, c } = channeler(s);
      run(s, c, 200);
      boss[hit] = 400;
      run(s, c, 200);
      expect(boss.casting).toBe(-1);
      expect(boss.surges ?? 0).toBe(0);
    }
  });

  it('a rule on a channel fires when one starts and not on a slam, keeping the interrupt for it', () => {
    const s = fighter([['war_cry', ON_CHANNEL]]);
    const { boss, c } = channeler(s);
    expect(chooseSkill(s, deriveStats(s)).slot).toBe(-1);
    boss.casting = boss.castTotal = 3000;
    boss.castKind = 'slam';
    expect(chooseSkill(s, deriveStats(s)).slot).toBe(-1);
    boss.casting = -1;
    boss.castKind = null;
    run(s, c, 1500);
    expect(boss.casting).toBe(-1);
    expect(boss.surges ?? 0).toBe(0);
    expect(s.combat!.cooldowns[0]).toBeGreaterThan(0);
  });

  it('a character with the rule does better than one on a wind-up rule, in the same fight', () => {
    const fight = (rule: TacticRule) => {
      const s = fighter([['war_cry', rule]]);
      // a sword, as a mace's own stun chance would break channels with no rule at all
      s.equipment.weapon = createItem(s, 'bladedancer_sabre', 54, 'normal', seeded(1));
      const { boss, c } = channeler(s);
      boss.timers.channel = BOSS_CHANNEL_EVERY_MS * 0.1;
      const d = deriveStats(s);
      let lost = 0;
      for (let t = 0; t < 70_000; t += 100) {
        s.life = d.maxLife; // kept alive, so both runs last the same 70 s
        combatStep(s, c, 100, d);
        lost += d.maxLife - s.life;
      }
      return { surges: boss.surges ?? 0, lost };
    };
    const ruled = fight(ON_CHANNEL);
    const plain = fight(ON_WINDUP);
    expect(ruled.surges).toBe(0);
    expect(plain.surges).toBeGreaterThanOrEqual(2);
    expect(ruled.lost).toBeLessThan(plain.lost * 0.6);
  });

  describe('offline', () => {
    /** Soft monsters, as a bare level 55 fighter can't be expected to win: this is about who gets to fight, not balance. */
    function away(gems: [string, TacticRule][]) {
      const zone = zoneDef(ZONE);
      const defs = [zone.boss, ...zone.monsters];
      const saved = defs.map((m) => [m.lifeMult, m.dmgMult]);
      defs.forEach((m) => {
        m.lifeMult = 0.02;
        m.dmgMult = 0.05;
      });
      try {
        const s = fighter(gems);
        s.zoneKills[ZONE] = zone.bossEvery;
        const c = ctx(7);
        startCombat(s, c, ZONE);
        const sum = simulateOffline(s, c, 20 * 60_000);
        return { s, bossWaiting: sum.bossWaiting };
      } finally {
        defs.forEach((m, i) => ([m.lifeMult, m.dmgMult] = saved[i]));
      }
    }

    it('a boss that channels only comes out if a rule can break it', () => {
      const none = fighter([['heavy_strike', PLAIN]]);
      expect(rulesBreakChannels(none)).toBe(false);
      expect(bossLeftToRules(none, zoneDef(ZONE))).toBe(false);
      expect(bossLeftToRules(none, zoneDef('blackharbor'))).toBe(true);
      // firing on a channel isn't enough: the skill has to be able to break it
      expect(rulesBreakChannels(fighter([['iron_guard', ON_CHANNEL]]))).toBe(false);
      expect(rulesBreakChannels(fighter([['war_cry', ON_CHANNEL]]))).toBe(true);
      expect(rulesBreakChannels(fighter([['heavy_strike', ON_CHANNEL]]))).toBe(true);
      expect(rulesBreakChannels(fighter([['war_cry', ON_WINDUP]]))).toBe(false);
      const unlearned = fighter([['war_cry', ON_CHANNEL]]);
      unlearned.account.automation.rules = unlearned.account.automation.rules.filter((r) => r !== 'windups');
      expect(rulesBreakChannels(unlearned)).toBe(false);
    });

    it('with the rule the boss falls while you are away, and without it the boss stays in hiding', () => {
      expect(away([['war_cry', ON_CHANNEL], ['heavy_strike', PLAIN]]).s.bossesDefeated).toContain(ZONE);
      const without = away([['war_cry', ON_WINDUP], ['heavy_strike', PLAIN]]);
      expect(without.s.bossesDefeated).not.toContain(ZONE);
      expect(without.bossWaiting).toBeTruthy();
    });
  });
});

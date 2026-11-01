import { describe, expect, it } from 'vitest';
import { BOSS_GATHER_DROP, bossGatherMats, STARTER_DROPS } from '../src/data/drops';
import { materialDef } from '../src/data/materials';
import { zoneDef } from '../src/data/zones';
import { baseDef } from '../src/data/bases';
import { aliveMonsters, BOSS_RESPAWN_MS, challengeBoss, combatStep, makeMonster, startCombat, toggleBossFarm } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createItem } from '../src/engine/items';
import { rollLoot } from '../src/engine/loot';
import { seeded } from '../src/engine/rng';
import { deriveStats } from '../src/engine/stats';
import { newGame } from '../src/engine/state';
import { charXpForLevel } from '../src/engine/xp';

const ctx = () => makeCtx(seeded(7));
const hasBoss = (s: ReturnType<typeof newGame>) => s.combat!.monsters.some((m) => m.isBoss);

/** A character who kills anything quickly and can't be hurt by the first area. */
function strong() {
  const s = newGame(1);
  s.tutorial.done = true;
  s.skills.combat = charXpForLevel(30);
  return s;
}

function run(s: ReturnType<typeof newGame>, c: ReturnType<typeof ctx>, ms: number) {
  for (let t = 0; t < ms && s.combat; t += 50) {
    for (const m of aliveMonsters(s.combat)) if (!m.isBoss) m.life = 0;
    combatStep(s, c, 50, deriveStats(s));
  }
}

describe('challenging a boss', () => {
  it('a ready boss waits, and the area keeps being farmed', () => {
    const s = strong();
    const c = ctx();
    s.zoneKills.mudflats = zoneDef('mudflats').bossEvery;
    startCombat(s, c, 'mudflats');
    const before = s.zoneKills.mudflats;
    run(s, c, 120_000);
    expect(s.combat).not.toBeNull();
    expect(hasBoss(s)).toBe(false);
    expect(s.zoneKills.mudflats).toBeGreaterThan(before);
    expect(s.lifetime.deaths).toBe(0);
  });

  it('comes once challenged', () => {
    const s = strong();
    const c = ctx();
    s.zoneKills.mudflats = zoneDef('mudflats').bossEvery;
    startCombat(s, c, 'mudflats');
    challengeBoss(s);
    run(s, c, 10_000);
    expect(hasBoss(s)).toBe(true);
    expect(s.combat!.challenged).toBe(false);
  });

  it("can't be challenged before enough kills", () => {
    const s = strong();
    const c = ctx();
    startCombat(s, c, 'mudflats');
    challengeBoss(s);
    expect(s.combat!.challenged).toBeFalsy();
  });

  it('Auto-challenge sends it in on its own', () => {
    const s = strong();
    const c = ctx();
    s.settings.autoBoss = true;
    s.zoneKills.mudflats = zoneDef('mudflats').bossEvery;
    startCombat(s, c, 'mudflats');
    run(s, c, 10_000);
    expect(hasBoss(s)).toBe(true);
  });
});

describe('boss farm', () => {
  const farming = (offline = false) => {
    const s = strong();
    const c = { ...ctx(), offline };
    s.settings.autoFlee = false;
    s.bossesDefeated.push('mudflats');
    startCombat(s, c, 'mudflats');
    toggleBossFarm(s);
    return { s, c };
  };
  const step = (s: ReturnType<typeof newGame>, c: ReturnType<typeof ctx>, ms: number) => {
    for (let t = 0; t < ms; t += 50) combatStep(s, c, 50, deriveStats(s));
  };

  it("needs the area's boss beaten, and no map", () => {
    const s = strong();
    const c = ctx();
    startCombat(s, c, 'mudflats');
    toggleBossFarm(s);
    expect(s.combat!.bossFarm).toBeFalsy();
  });

  it('brings the boss back 5 seconds after each kill, and nothing else', () => {
    const { s, c } = farming();
    step(s, c, BOSS_RESPAWN_MS - 200);
    expect(s.combat!.monsters).toHaveLength(0);
    step(s, c, 300);
    expect(hasBoss(s)).toBe(true);
    const kills = s.lifetime.bossKills;
    s.combat!.monsters = s.combat!.monsters.filter((m) => m.isBoss);
    s.combat!.monsters[0].life = 0;
    while (s.lifetime.bossKills === kills) step(s, c, 50);
    let gap = 0;
    while (!hasBoss(s) && gap < 10_000) {
      expect(s.combat!.monsters).toHaveLength(0);
      step(s, c, 50);
      gap += 50;
    }
    expect(gap).toBeGreaterThanOrEqual(BOSS_RESPAWN_MS - 50);
    expect(gap).toBeLessThanOrEqual(BOSS_RESPAWN_MS + 50);
  });

  it('holds the timer while fleeing', () => {
    const { s, c } = farming();
    s.settings.movement = 'flee';
    step(s, c, BOSS_RESPAWN_MS * 2);
    expect(s.combat!.monsters).toHaveLength(0);
  });

  it('offline without wind-up rules, keeps to trash', () => {
    const { s, c } = farming(true);
    run(s, c, 30_000);
    expect(hasBoss(s)).toBe(false);
    expect(s.lifetime.kills).toBeGreaterThan(0);
  });

  it('stopping sends the area back to normal', () => {
    const { s, c } = farming();
    toggleBossFarm(s);
    run(s, c, 30_000);
    expect(hasBoss(s)).toBe(false);
    expect(s.lifetime.kills).toBeGreaterThan(0);
  });
});

describe('boss gathering drops', () => {
  it("drops a little of the mats for the boss's level", () => {
    const s = strong();
    const c = ctx();
    startCombat(s, c, 'mudflats');
    const zone = zoneDef('mudflats');
    const boss = makeMonster(zone.boss, true, 1);
    s.bossesDefeated.push('mudflats');
    const mats = bossGatherMats(boss.level);
    const kills = 200;
    for (let i = 0; i < kills; i++) rollLoot(s, c, boss, zone, deriveStats(s));
    const got = mats.reduce((n, id) => n + (s.bank[id] ?? 0), 0);
    expect(got).toBeGreaterThan(kills * 0.6);
    expect(got).toBeLessThan(kills * 1.5);
  });

  it('moves up with boss level', () => {
    expect(bossGatherMats(1)).toContain('copper_ore');
    expect(bossGatherMats(20)).toContain('iron_ore');
    expect(bossGatherMats(35)).toContain('emberroot');
    expect(bossGatherMats(50)).toContain('voidbloom');
    for (const b of BOSS_GATHER_DROP.bands) for (const id of b.mats) expect(materialDef(id).name).toBeTruthy();
  });
});

describe('starter drops', () => {
  it('a new character gets gear for each main slot and a couple of each basic orb before the first boss', () => {
    const s = newGame(1);
    const c = ctx();
    startCombat(s, c, 'mudflats');
    const zone = zoneDef('mudflats');
    const d = deriveStats(s);
    const orbs = { transmute: s.bank.transmute ?? 0, alteration: s.bank.alteration ?? 0 };
    const drop = makeMonster(zone.monsters[0], false, 1);
    for (let kill = 1; kill < zone.bossEvery; kill++) {
      s.lifetime.kills = kill;
      rollLoot(s, c, drop, zone, d);
    }
    const slots = new Set(s.ground.map((i) => baseDef(i.baseId).slot));
    for (const slot of ['weapon', 'gloves', 'boots', 'body', 'helmet']) expect(slots).toContain(slot);
    expect((s.bank.transmute ?? 0) - orbs.transmute).toBeGreaterThanOrEqual(2);
    expect((s.bank.alteration ?? 0) - orbs.alteration).toBeGreaterThanOrEqual(2);
  });

  it('are all over before the first boss can come', () => {
    expect(Math.max(...Object.keys(STARTER_DROPS).map(Number))).toBeLessThan(zoneDef('mudflats').bossEvery);
  });
});

describe('dying', () => {
  it('leaves what dropped on the ground, once', () => {
    const s = newGame(1);
    const c = ctx();
    startCombat(s, c, 'mudflats');
    s.ground.push(createItem(s, 'rusted_sword', 1, 'normal', seeded(1)));
    s.life = 1;
    s.combat!.monsters = [makeMonster(zoneDef('mudflats').boss, true, 99)];
    for (let i = 0; i < 4000 && s.combat; i++) combatStep(s, c, 50, deriveStats(s));
    expect(s.lifetime.deaths).toBe(1);
    expect(s.ground).toHaveLength(1);
  });
});

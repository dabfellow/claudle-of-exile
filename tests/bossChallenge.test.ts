import { describe, expect, it } from 'vitest';
import { STARTER_DROPS } from '../src/data/drops';
import { zoneDef } from '../src/data/zones';
import { baseDef } from '../src/data/bases';
import { aliveMonsters, challengeBoss, combatStep, makeMonster, startCombat } from '../src/engine/combat';
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

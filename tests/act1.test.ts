import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_BY_ID } from '../src/data/achievements';
import { actionsFor } from '../src/data/skills';
import { uniqueDef } from '../src/data/bases';
import { ACT_PREVIEW, BOSS_WARD_PCT, nextZone, ZONES, zoneDef, zonesInAct, type MonsterDef } from '../src/data/zones';
import { aliveMonsters, combatStep, makeMonster, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem } from '../src/engine/gems';
import { seeded } from '../src/engine/rng';
import { simulateOffline } from '../src/engine/offline';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { charXpForLevel } from '../src/engine/xp';

const ctx = (seed = 1) => makeCtx(seeded(seed));

function arena(gems: string[], pack: MonsterInstance[], zoneId = 'mudflats') {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.skills.combat = charXpForLevel(20);
  s.skillBar = s.skillBar.map(() => null);
  gems.forEach((id, i) => (s.skillBar[i] = createSkillGem(s, id)));
  s.unlockedZones = ZONES.map((z) => z.id);
  const c = ctx();
  startCombat(s, c, zoneId);
  s.combat!.monsters = pack;
  // a hand-built pack fights alone: no new waves walk in
  s.combat!.spawnMs = 1e12;
  s.combat!.actionMs = gems.length ? 0 : 1e12;
  s.life = deriveStats(s).maxLife;
  return { s, c };
}

function run(s: GameState, c: ReturnType<typeof ctx>, ms: number) {
  for (let t = 0; t < ms && s.combat; t += 50) combatStep(s, c, 50, deriveStats(s));
}

/** A tough boss with the given mechanics that never auto-attacks. */
function testBoss(mechanics: MonsterDef['mechanics'], extra: Partial<MonsterDef> = {}) {
  const b = makeMonster({ ...zoneDef('sanctum').boss, mechanics, ...extra }, true, 99);
  b.life = b.maxLife = 1e6;
  b.attackMs = 1e12;
  return b;
}

describe('Act 1 layout', () => {
  it('has eight areas ending in the act boss, with rising levels', () => {
    const act = zonesInAct(1);
    expect(act).toHaveLength(8);
    expect(act.at(-1)!.actBoss).toBe(true);
    for (const n of new Set(ZONES.map((z) => z.act))) expect(zonesInAct(n).filter((z) => z.actBoss)).toHaveLength(1);
    for (let i = 1; i < act.length; i++) {
      expect(act[i].levelRange[0]).toBeGreaterThanOrEqual(act[i - 1].levelRange[0]);
      expect(act[i].boss.level).toBeGreaterThan(act[i - 1].boss.level);
    }
  });

  it('each boss unlocks the next area, and the act boss opens Act 2 only once it is out', () => {
    const act = zonesInAct(1);
    for (let i = 0; i < act.length - 1; i++) expect(nextZone(act[i].id)?.id).toBe(act[i + 1].id);
    expect(nextZone('sanctum')?.id).toBe('cinderroad');
    ACT_PREVIEW.enabled = false;
    try {
      expect(nextZone('sanctum')).toBeUndefined();
    } finally {
      ACT_PREVIEW.enabled = true;
    }
  });

  it('every gated action, unique and monster id points at real data', () => {
    for (const a of ['mining', 'woodcutting', 'harvesting', 'alchemy', 'gemcutting'] as const)
      for (const x of actionsFor(a)) if (x.area) expect(() => zoneDef(x.area!)).not.toThrow();
    for (const z of ZONES) for (const u of z.uniques) expect(uniqueDef(u)).toBeTruthy();
    const ids = ZONES.flatMap((z) => [...z.monsters, z.boss].map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('later bosses stack more mechanics', () => {
    const counts = zonesInAct(1).map((z) => z.boss.mechanics?.length ?? 1);
    expect(counts[0]).toBe(1);
    expect(counts.at(-1)).toBe(5);
  });
});

describe('boss mechanics', () => {
  it('a nova goes through Iron Guard blocks', () => {
    const b = testBoss(['nova']);
    b.timers.nova = 0;
    const { s, c } = arena(['iron_guard'], [b], 'sanctum');
    const life = s.life;
    run(s, c, b.casts.nova.ms + 400);
    expect(c.events.some((e) => e.t === 'bossCast' && e.kind === 'nova')).toBe(true);
    expect(c.events.some((e) => e.t === 'hit' && e.target === 'player' && e.blocked)).toBe(false);
    expect(s.life).toBeLessThan(life);
  });

  it('enrage triggers below 35% life and speeds up attacks', () => {
    const b = testBoss(['enrage']);
    b.life = b.maxLife * 0.3;
    const { s, c } = arena([], [b], 'sanctum');
    run(s, c, 100);
    expect(b.enraged).toBe(true);
    expect(c.events.some((e) => e.t === 'bossPhase')).toBe(true);
  });

  it('summon tops the fight back up with adds in front of the boss', () => {
    const b = testBoss(['summon']);
    b.timers.summon = 0;
    const { s, c } = arena([], [b], 'sanctum');
    run(s, c, 100);
    const alive = aliveMonsters(s.combat!);
    expect(alive).toHaveLength(3);
    expect(alive.at(-1)!.isBoss).toBe(true);
  });

  it('a ward absorbs damage, and heals the boss if it is not broken in time', () => {
    const b = testBoss(['ward']);
    b.life = b.maxLife * 0.6;
    const { s, c } = arena([], [b], 'sanctum');
    run(s, c, 100);
    expect(b.ward).toBeCloseTo(b.maxLife * BOSS_WARD_PCT);
    const before = b.life;
    run(s, c, 9000);
    expect(b.ward).toBe(0);
    expect(b.life).toBeGreaterThan(before);
    expect(b.wardsUsed).toBe(1);
  });

  it('killing the act boss completes the act and earns the achievement', () => {
    const { s, c } = arena(['heavy_strike'], [makeMonster(zoneDef('sanctum').boss, true, 99)], 'sanctum');
    s.combat!.monsters[0].life = 1;
    run(s, c, 3000);
    expect(s.bossesDefeated).toContain('sanctum');
    expect(c.events.some((e) => e.t === 'actComplete' && e.act === 1)).toBe(true);
    expect(ACHIEVEMENT_BY_ID.act_1.progress(s)).toBe(1);
  });

  it('adds killed during a boss fight do not count toward the next boss', () => {
    const add = makeMonster(zoneDef('mudflats').monsters[0], false, 5);
    add.life = 1;
    const { s, c } = arena(['heavy_strike'], [add, testBoss(['slam'])]);
    run(s, c, 2000);
    expect(add.dead).toBe(true);
    expect(s.zoneKills.mudflats ?? 0).toBe(0);
  });

  it('a fight in progress survives a save round-trip', () => {
    const { s } = arena([], [testBoss(['slam', 'nova', 'summon', 'enrage', 'ward'])], 'sanctum');
    const back = deserialize(serialize(s));
    expect(back.combat!.monsters[0].mechanics).toHaveLength(5);
  });
});

describe('save v8', () => {
  it('players who reached the Molten Forge land in the Ship Graveyard', () => {
    const old = newGame(1) as unknown as Record<string, unknown>;
    old.version = 7;
    old.unlockedZones = ['mudflats', 'ashwood', 'crypt', 'forge'];
    old.bossesDefeated = ['mudflats', 'ashwood', 'crypt'];
    old.zoneKills = { forge: 4, crypt: 3 };
    old.action = { kind: 'combat', zoneId: 'forge' };
    const s = deserialize(JSON.stringify(old));
    expect(s.unlockedZones.at(-1)).toBe('shipgrave');
    expect(s.bossesDefeated).toHaveLength(5);
    expect(s.zoneKills).toEqual({ crypt: 3 });
    expect(s.action).toBeNull();
    expect(s.combat).toBeNull();
  });
});

describe('offline progress and bosses', () => {
  const strong = () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.tutorial.done = true;
    s.skills.combat = charXpForLevel(30);
    return s;
  };

  it("never fights a boss you haven't beaten, so it can't unlock areas while you're away", () => {
    const s = strong();
    const c = ctx();
    startCombat(s, c, 'mudflats');
    const sum = simulateOffline(s, c, 30 * 60_000);
    expect(sum.kills).toBeGreaterThan(zoneDef('mudflats').bossEvery);
    expect(s.bossesDefeated).toEqual([]);
    expect(s.unlockedZones).toEqual(['mudflats']);
    expect(sum.bossWaiting).toBe(zoneDef('mudflats').boss.name);
  });

  it('farms bosses you have already beaten', () => {
    const s = strong();
    s.bossesDefeated = ['mudflats'];
    const c = ctx();
    startCombat(s, c, 'mudflats');
    const before = s.lifetime.bossKills;
    const sum = simulateOffline(s, c, 30 * 60_000);
    expect(s.lifetime.bossKills).toBeGreaterThan(before);
    expect(sum.bossWaiting).toBeNull();
  });
});

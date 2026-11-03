import { describe, expect, it } from 'vitest';
import { zoneDef, ZONES } from '../src/data/zones';
import { combatStep, HULKING, makeMonster, monsterXp, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem } from '../src/engine/gems';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { armFor, veteran } from './helpers';

/** Fight in an area for a while and count the Hulking monsters that walked in. */
function hulksIn(zoneId: string): number {
  const s = veteran(newGame(1, { name: 't', classId: 'warrior' }), 70);
  s.unlockedZones = ZONES.map((z) => z.id);
  const ctx = makeCtx(seeded(3));
  startCombat(s, ctx, zoneId);
  const seen = new Set<number>();
  for (let t = 0; t < 600_000 && s.combat; t += 250) {
    for (const m of s.combat.monsters) {
      if (m.hulking) seen.add(m.uid);
      // keep the field turning over, and the fight going
      m.life = Math.min(m.life, 1);
      m.damage = 0;
    }
    combatStep(s, ctx, 250, deriveStats(s));
  }
  return seen.size;
}

function hitWith(gem: string, hulking: boolean): number {
  const s: GameState = veteran(newGame(1, { name: 't', classId: 'warrior' }), 40);
  s.skillBar = s.skillBar.map(() => null);
  s.skillBar[0] = { ...createSkillGem(s, gem), rules: [{ when: 'always' }] };
  armFor(s, gem);
  const ctx = makeCtx(seeded(1));
  startCombat(s, ctx, zoneDef('mudflats').id);
  const m = makeMonster({ ...zoneDef('mudflats').monsters[0], level: 40 }, false, 99);
  m.life = m.maxLife = 1e9;
  m.attackMs = 1e9;
  m.cell = 0;
  m.hulking = hulking;
  s.combat!.monsters = [m];
  s.combat!.spawnMs = 1e12;
  s.combat!.actionMs = 0;
  for (let t = 0; t < 20_000; t += 50) combatStep(s, ctx, 50, deriveStats(s));
  return 1e9 - m.life;
}

describe('Hulking monsters', () => {
  it('turn up from Act 3 on, never before', () => {
    expect(hulksIn(ZONES.find((z) => z.act === 1)!.id)).toBe(0);
    expect(hulksIn(ZONES.find((z) => z.act === 3)!.id)).toBeGreaterThan(0);
  });

  it('are worth more xp', () => {
    const m = makeMonster(zoneDef('mudflats').monsters[0], false, 1);
    const plain = monsterXp(m);
    m.hulking = true;
    expect(monsterXp(m) / plain).toBeCloseTo(HULKING.xp, 0);
  });

  it('shrug off area hits, but not single-target ones', () => {
    expect(hitWith('ground_slam', true) / hitWith('ground_slam', false)).toBeCloseTo(HULKING.areaTaken, 1);
    expect(hitWith('heavy_strike', true) / hitWith('heavy_strike', false)).toBeCloseTo(1, 1);
  });
});

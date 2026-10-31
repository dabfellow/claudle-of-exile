import { afterEach, describe, expect, it } from 'vitest';
import { ACHIEVEMENT_BY_ID } from '../src/data/achievements';
import { uniqueDef } from '../src/data/bases';
import { BOSS_TABLES, bossTable, DROP_TABLES, dropTable } from '../src/data/drops';
import { ACT_PREVIEW, ACTS, actBossZone, actOpen, BOSS_SCORCH_EVERY_MS, BOSS_SCORCH_MS, nextZones, ZONES, zoneDef, zonesInAct } from '../src/data/zones';
import { PLAYER_SPOT } from '../src/engine/battlefield';
import { combatStep, makeMonster, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { smithIlvlCap } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { charXpForLevel } from '../src/engine/xp';

const ctx = (seed = 1) => makeCtx(seeded(seed));

/** A character who has just beaten Ysolde, from before Act 2 existed. */
function act1Done() {
  const s = newGame(1, { name: 'T', classId: 'warrior' });
  s.skills.combat = charXpForLevel(22);
  s.unlockedZones = zonesInAct(1).map((z) => z.id);
  s.bossesDefeated = zonesInAct(1).map((z) => z.id);
  return s;
}

/** Puts Act 2 back behind the preview gate, the way an unreleased act sits. */
function closeAct2() {
  ACTS[1].open = false;
  ACTS[1].preview = true;
  ACT_PREVIEW.enabled = false;
}

afterEach(() => {
  ACTS[1].open = true;
  ACTS[1].preview = false;
  ACT_PREVIEW.enabled = true;
});

describe('Act 2 layout', () => {
  it('has eight areas after Act 1, ending in its act boss', () => {
    const act = zonesInAct(2);
    expect(act).toHaveLength(8);
    expect(act.at(-1)).toBe(actBossZone(2));
    expect(act[0].levelRange[0]).toBeGreaterThanOrEqual(zonesInAct(1).at(-1)!.levelRange[0]);
    for (let i = 1; i < act.length; i++) {
      expect(act[i].levelRange[0]).toBeGreaterThanOrEqual(act[i - 1].levelRange[0]);
      expect(act[i].boss.level).toBeGreaterThan(act[i - 1].boss.level);
      expect(act[i].tier).toBeGreaterThanOrEqual(act[i - 1].tier);
    }
    // its bosses outclass Ysolde by the end
    expect(act.at(-1)!.boss.level).toBeGreaterThan(zoneDef('sanctum').boss.level);
  });

  it('chains area to area, and the act boss unlocks nothing yet', () => {
    const act = zonesInAct(2);
    for (let i = 0; i < act.length - 1; i++) expect(nextZones(act[i].id)[0]?.id).toBe(act[i + 1].id);
    expect(nextZones(act.at(-1)!.id)).toEqual([]);
  });

  it('every boss has three to six mechanics, rising to all six', () => {
    const counts = zonesInAct(2).map((z) => z.boss.mechanics!.length);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(3);
    expect(counts.at(-1)).toBe(6);
  });

  it('every unique it drops exists, and the Act 2 uniques waiting for a zone have one', () => {
    const drops = new Set(zonesInAct(2).flatMap((z) => z.uniques));
    for (const id of drops) expect(uniqueDef(id)).toBeTruthy();
    for (const id of ['last_breath', 'old_grudge', 'brawlers_buckle', 'starforged_edge']) expect(drops).toContain(id);
  });

  it('has drop tables for its deeper tiers', () => {
    for (const z of zonesInAct(2)) {
      expect(DROP_TABLES[z.tier]).toBeTruthy();
      expect(BOSS_TABLES[z.tier]).toBeTruthy();
    }
    expect(dropTable(7).rarity.rare).toBeGreaterThan(dropTable(5).rarity.rare);
    expect(bossTable(7).guaranteed.map((g) => g.id)).toContain('divine');
  });
});

describe('scorch', () => {
  it("sets the ground under the player in the boss's element on a timer", () => {
    const s = act1Done();
    s.unlockedZones.push('cinderroad');
    const c = ctx();
    startCombat(s, c, 'cinderroad');
    const b = makeMonster({ ...zoneDef('cinderroad').boss, mechanics: ['scorch'] }, true, 9);
    b.life = b.maxLife = 1e7;
    b.attackMs = 1e12;
    s.combat!.monsters = [b];
    s.combat!.spawnMs = 1e12;
    s.combat!.actionMs = 1e12;
    for (let t = 0; t < BOSS_SCORCH_EVERY_MS && !s.combat!.ground.length; t += 50) {
      s.life = deriveStats(s).maxLife;
      combatStep(s, c, 50, deriveStats(s));
    }
    const g = s.combat!.ground.find((x) => x.cell === PLAYER_SPOT);
    expect(g?.kind).toBe('burning'); // Khorun's scorch is fire
    expect(g!.durationMs).toBe(BOSS_SCORCH_MS);
    expect(c.events.some((e) => e.t === 'bossPhase' && e.text.includes('scorches'))).toBe(true);
  });
});

describe('opening an act', () => {
  it('is live for everyone, and a preview act stays hidden outside previews', () => {
    expect(actOpen(1)).toBe(true);
    expect(actOpen(3)).toBe(false);
    ACT_PREVIEW.enabled = false;
    expect(actOpen(2)).toBe(true);
    closeAct2();
    expect(actOpen(2)).toBe(false);
  });

  it('unlocks the first area on load for saves that beat Ysolde before Act 2 existed', () => {
    const loaded = deserialize(serialize(act1Done()));
    expect(loaded.unlockedZones).toContain('cinderroad');
    expect(loaded.unlockedZones).not.toContain('saltflats');
  });

  it("leaves those saves alone while the act isn't out, and won't travel there", () => {
    closeAct2();
    const loaded = deserialize(serialize(act1Done()));
    expect(loaded.unlockedZones).not.toContain('cinderroad');
    // a save from a preview build that already holds the area
    loaded.unlockedZones.push('cinderroad');
    expect(startCombat(loaded, ctx(), 'cinderroad')).toBeTruthy();
    expect(smithIlvlCap(loaded)).toBe(zoneDef('sanctum').levelRange[1]);
  });

  it('beating Ysolde opens the Cinder Road', () => {
    const s = act1Done();
    s.bossesDefeated = s.bossesDefeated.filter((id) => id !== 'sanctum');
    const c = ctx();
    startCombat(s, c, 'sanctum');
    const ysolde = makeMonster(zoneDef('sanctum').boss, true, 9);
    ysolde.life = 0;
    s.combat!.monsters = [ysolde];
    s.combat!.spawnMs = 1e12;
    combatStep(s, c, 50, deriveStats(s));
    expect(s.unlockedZones).toContain('cinderroad');
    expect(c.events.some((e) => e.t === 'actComplete' && e.act === 1)).toBe(true);
  });
});

describe('Act 2 achievements', () => {
  it('Conqueror of the Coast still means Act 1 only', () => {
    const s = act1Done();
    expect(ACHIEVEMENT_BY_ID.conqueror.progress(s)).toBe(ACHIEVEMENT_BY_ID.conqueror.target);
    expect(ACHIEVEMENT_BY_ID.conqueror_2.progress(s)).toBe(0);
  });

  it('completing Act 2 counts once the act boss falls', () => {
    const s = act1Done();
    s.bossesDefeated.push(...zonesInAct(2).map((z) => z.id));
    expect(ACHIEVEMENT_BY_ID.act_2.progress(s)).toBe(1);
    expect(ACHIEVEMENT_BY_ID.conqueror_2.progress(s)).toBe(zonesInAct(2).length);
  });

  it('monster ids stay unique across acts', () => {
    const ids = ZONES.flatMap((z) => [...z.monsters, z.boss].map((m) => m.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

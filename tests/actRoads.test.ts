import { describe, expect, it } from 'vitest';
import { ZONE_POS } from '../src/data/continent';
import { ACT_MAPS } from '../src/data/campaignMap';
import { actBossZone, bossesNeeded, isSideArea, nextZones, roadsInto, ZONES, zonesInAct, type ZoneDef } from '../src/data/zones';
import { openReachedZones } from '../src/engine/progress';
import { newGame } from '../src/engine/state';
import type { GameState } from '../src/engine/types';

const BRANCHING = [4, 5, 6, 7];

/** A character from before the roads forked, with the first `upTo` bosses beaten in campaign order. */
function linearSave(upTo: number): GameState {
  const s = newGame();
  s.bossesDefeated = ZONES.slice(0, upTo).map((z) => z.id);
  s.unlockedZones = ZONES.slice(0, upTo + 1).map((z) => z.id);
  return s;
}

/** Keep beating whatever's open, leaving out `skip`, until nothing new opens. */
function walk(s: GameState, skip: (z: ZoneDef) => boolean = () => false): void {
  for (;;) {
    const next = ZONES.find((z) => s.unlockedZones.includes(z.id) && !s.bossesDefeated.includes(z.id) && !skip(z));
    if (!next) return;
    s.bossesDefeated.push(next.id);
    openReachedZones(s);
  }
}

describe('the roads through the seven acts', () => {
  it('leaves the first three acts straight', () => {
    for (const act of [1, 2, 3]) for (const z of zonesInAct(act)) expect(nextZones(z.id)).toHaveLength(1);
  });

  it.each(BRANCHING)('Act %i forks, rejoins and has side areas', (act) => {
    const zones = zonesInAct(act);
    expect(zones.some((z) => nextZones(z.id).filter((n) => n.act === act).length > 1)).toBe(true);
    expect(zones.some((z) => roadsInto(z).length > 1)).toBe(true);
    expect(zones.filter(isSideArea).length).toBeGreaterThan(0);
  });

  it.each(BRANCHING)('Act %i boss needs most of the act, and never every side area', (act) => {
    const boss = actBossZone(act)!;
    const others = zonesInAct(act).length - 1;
    expect(bossesNeeded(boss)).toBeLessThan(others);
    expect(bossesNeeded(boss)).toBeGreaterThanOrEqual(Math.ceil(others * 0.7));
    const skipped = zonesInAct(act).filter(isSideArea).slice(0, others - bossesNeeded(boss));
    const s = linearSave(ZONES.indexOf(zonesInAct(act)[0]));
    walk(s, (z) => skipped.includes(z) || z === boss);
    expect(s.unlockedZones).toContain(boss.id);
  });

  it('every save from before the fork keeps its areas and can still finish the campaign', () => {
    for (let upTo = 0; upTo < ZONES.length; upTo++) {
      const s = linearSave(upTo);
      const had = [...s.unlockedZones];
      openReachedZones(s);
      expect(s.unlockedZones).toEqual(expect.arrayContaining(had));
      walk(s);
      expect(s.bossesDefeated).toHaveLength(ZONES.length);
    }
  });
});

describe('the act maps', () => {
  it.each([1, 2, 3, 4, 5, 6, 7])('Act %i has separated selectable markers on its painted plate', (act) => {
    // Only the selected/hovered marker's label is shown. Measure actual painted-map
    // positions rather than the obsolete procedural terrain's label geometry.
    const zones = zonesInAct(act);
    const width = zones.length > 12 ? 620 : zones.length > 9 ? 520 : 480;
    const height = width / ACT_MAPS[act].aspect;
    for (const a of zones) for (const b of zones) {
      if (a.id >= b.id) continue;
      const [ax, ay] = ACT_MAPS[act].zones[a.id];
      const [bx, by] = ACT_MAPS[act].zones[b.id];
      expect(Math.hypot((ax - bx) * width / 100, (ay - by) * height / 100), `${a.id} overlaps ${b.id}`).toBeGreaterThan(30);
    }
  });

  it('roads do not cross each other', () => {
    const cross = (a: number[], b: number[]) => {
      const d = (p: number[], q: number[], r: number[]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
      const [p1, p2, p3, p4] = [a.slice(0, 2), a.slice(2), b.slice(0, 2), b.slice(2)];
      return d(p1, p2, p3) * d(p1, p2, p4) < 0 && d(p3, p4, p1) * d(p3, p4, p2) < 0;
    };
    for (const act of BRANCHING) {
      const roads = zonesInAct(act).flatMap((z) => roadsInto(z).filter((f) => zonesInAct(act).some((x) => x.id === f)).map((f) => [...ZONE_POS[f], ...ZONE_POS[z.id]]));
      for (const a of roads) for (const b of roads) expect(cross(a, b)).toBe(false);
    }
  });
});

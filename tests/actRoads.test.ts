import { describe, expect, it } from 'vitest';
import { actMapPoint, actRegion, LABEL_LINE_HEIGHT, LABEL_SIDE, labelAnchor, labelLines, ZONE_POS } from '../src/data/continent';
import { actBossZone, bossesNeeded, isSideArea, nextZones, roadsInto, ZONES, zonesInAct, type ZoneDef } from '../src/data/zones';
import { openReachedZones } from '../src/engine/progress';
import { newGame } from '../src/engine/state';
import type { GameState } from '../src/engine/types';

const BRANCHING = [3, 4, 5, 6];

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

describe('the roads through Acts 3 to 6', () => {
  it('leaves Acts 1 and 2 straight', () => {
    for (const act of [1, 2]) for (const z of zonesInAct(act)) expect(nextZones(z.id)).toHaveLength(1);
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
  const CHAR = 5.2; // of a 9px semi-bold label, a little over the widest it runs
  interface Box { l: number; r: number; t: number; b: number }

  const nodeRadius = (z: ZoneDef) => (z.actBoss ? 13 : isSideArea(z) ? 9 : 11);
  const placed = (act: number) => {
    const region = actRegion(act)!;
    return zonesInAct(act).map((z) => {
      const [x, y] = actMapPoint(region, ZONE_POS[z.id]);
      const lines = labelLines(z.name);
      const a = labelAnchor(LABEL_SIDE[z.id] ?? 'below', nodeRadius(z), lines.length);
      const w = Math.max(...lines.map((l) => l.length)) * CHAR;
      const l = x + a.x - (a.anchor === 'middle' ? w / 2 : a.anchor === 'end' ? w : 0);
      const t = y + a.y - 8;
      return { z, x, y, label: { l, r: l + w, t, b: t + lines.length * LABEL_LINE_HEIGHT } as Box };
    });
  };
  const hit = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const crosses = (x1: number, y1: number, x2: number, y2: number, b: Box) => {
    for (let i = 0; i <= 40; i++) {
      const x = x1 + ((x2 - x1) * i) / 40;
      const y = y1 + ((y2 - y1) * i) / 40;
      if (x > b.l && x < b.r && y > b.t && y < b.b) return true;
    }
    return false;
  };

  it.each(BRANCHING)('Act %i labels miss each other, every point and every road', (act) => {
    const all = placed(act);
    const problems: string[] = [];
    for (const a of all) {
      for (const b of all) {
        if (a.z.id < b.z.id && hit(a.label, b.label)) problems.push(`${a.z.id} on ${b.z.id}`);
        const r = nodeRadius(b.z);
        if (a !== b && hit(a.label, { l: b.x - r, r: b.x + r, t: b.y - r, b: b.y + r })) problems.push(`${a.z.id} on point ${b.z.id}`);
        for (const from of roadsInto(b.z)) {
          const start = all.find((c) => c.z.id === from);
          if (start && crosses(start.x, start.y, b.x, b.y, a.label)) problems.push(`${from}-${b.z.id} through ${a.z.id}`);
        }
      }
    }
    expect(problems).toEqual([]);
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

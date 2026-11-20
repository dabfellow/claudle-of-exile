import { describe, expect, it } from 'vitest';
import { ACT_MAPS, smoothPath, WORLD_MAP } from '../src/data/campaignMap';
import { ACTS, roadsInto, zonesInAct } from '../src/data/zones';
import { WORLD_MAP_SIZE, WORLD_ROAD_NODES, WORLD_ROADS, WORLD_SEA_ROUTES, WORLD_SEA_STOPS, worldRoadPath } from '../src/data/worldMapRoads';

const inPicture = ([x, y]: [number, number]) => x >= 0 && x <= 100 && y >= 0 && y <= 100;

describe('campaign map data', () => {
  it('puts every act on the world map, inside the picture', () => {
    for (const a of ACTS) expect(WORLD_MAP.labels[a.n] && inPicture(WORLD_MAP.labels[a.n])).toBeTruthy();
  });

  it('traces roads inside the original painting and joins every branch into one network', () => {
    const neighbours = new Map<string, Set<string>>();
    for (const road of [...WORLD_ROADS, ...WORLD_SEA_ROUTES]) {
      const start = WORLD_ROAD_NODES[road.from];
      const end = WORLD_ROAD_NODES[road.to];
      expect(start, road.from).toBeDefined();
      expect(end, road.to).toBeDefined();
      for (const [x, y] of [start, ...road.via, end]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(WORLD_MAP_SIZE[0]);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(WORLD_MAP_SIZE[1]);
      }
      const path = worldRoadPath(road);
      expect(path.startsWith(`M${start.join(' ')}`)).toBe(true);
      expect(path.endsWith(`L${end.join(' ')}`)).toBe(true);
      for (const [a, b] of [[road.from, road.to], [road.to, road.from]]) {
        if (!neighbours.has(a)) neighbours.set(a, new Set());
        neighbours.get(a)!.add(b);
      }
    }
    const visited = new Set<string>();
    const pending = ['coastStart'];
    while (pending.length) {
      const id = pending.pop()!;
      if (visited.has(id)) continue;
      visited.add(id);
      pending.push(...neighbours.get(id) ?? []);
    }
    expect([...visited].sort()).toEqual(Object.keys(WORLD_ROAD_NODES).sort());
    for (const fork of ['plainsFork', 'quarryFork', 'riverFork', 'lakeFork', 'harbourFork', 'bridgeFork', 'villageFork']) {
      expect(neighbours.get(fork)!.size, fork).toBeGreaterThanOrEqual(3);
    }
    for (const stop of WORLD_SEA_STOPS) {
      expect(WORLD_SEA_ROUTES.some((road) => road.from === stop || road.to === stop), stop).toBe(true);
    }
  });

  it('gives every area of every act a spot on its close-up', () => {
    for (const a of ACTS) {
      const map = ACT_MAPS[a.n];
      expect(map, `Act ${a.n}`).toBeTruthy();
      const missing = zonesInAct(a.n).filter((z) => !map.zones[z.id] || !inPicture(map.zones[z.id]));
      expect(missing.map((z) => z.id)).toEqual([]);
    }
  });

  it('only bends roads that exist, and keeps every bend inside the picture', () => {
    for (const a of ACTS) {
      const map = ACT_MAPS[a.n];
      const real = new Set(zonesInAct(a.n).flatMap((z) => roadsInto(z).map((from) => `${from}>${z.id}`)));
      for (const [key, bends] of Object.entries(map.roads)) {
        expect(real.has(key), `Act ${a.n}: ${key}`).toBe(true);
        expect(bends.every(inPicture)).toBe(true);
      }
      for (const e of map.entries) expect(map.zones[e.to] && inPicture(e.at)).toBeTruthy();
    }
  });

  it('draws a curve through every point it is given', () => {
    const d = smoothPath([[0, 0], [50, 20], [100, 0]]);
    expect(d.startsWith('M0 0')).toBe(true);
    expect(d).toContain(' 50 20');
    expect(d.endsWith('100 0')).toBe(true);
  });

  it.each(ACTS.map((act) => act.n))('connects every Act %i journey through its shared hand-traced network', (act) => {
    const map = ACT_MAPS[act];
    const traces = map.traces!;
    const realRoutes = zonesInAct(act).flatMap((zone) => roadsInto(zone).map((from) => `${from}>${zone.id}`));
    for (const trace of traces) {
      expect(trace.routes.length).toBeGreaterThan(0);
      expect(trace.routes.every((route) => realRoutes.includes(route))).toBe(true);
      expect(trace.d).not.toMatch(/[CQ]/);
    }
    for (const route of realRoutes) {
      const neighbours = new Map<string, Set<string>>();
      for (const trace of traces.filter((trace) => trace.routes.includes(route))) {
        const points = [...trace.d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((match) => `${match[1]},${match[2]}`);
        for (let i = 1; i < points.length; i++) {
          for (const [a, b] of [[points[i - 1], points[i]], [points[i], points[i - 1]]]) {
            if (!neighbours.has(a)) neighbours.set(a, new Set());
            neighbours.get(a)!.add(b);
          }
        }
      }
      const [from, to] = route.split('>');
      const visited = new Set<string>();
      const start = map.zones[from] ?? map.entries.find((entry) => entry.from === from && entry.to === to)?.at;
      expect(start, route).toBeDefined();
      const pending = [start!.join(',')];
      while (pending.length) {
        const at = pending.pop()!;
        if (visited.has(at)) continue;
        visited.add(at);
        pending.push(...neighbours.get(at) ?? []);
      }
      expect(visited.has(map.zones[to].join(',')), route).toBe(true);
    }
  });

  it.each(ACTS.map((act) => act.n))('keeps Act %i road sections free of crossings and duplicate strokes', (act) => {
    const segments = ACT_MAPS[act].traces!.flatMap((trace) => {
      const points = [...trace.d.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
      return points.slice(1).map((end, i) => ({ a: points[i], b: end }));
    });
    const strokes = segments.map(({ a, b }) => [a.join(','), b.join(',')].sort().join(':'));
    expect(new Set(strokes).size).toBe(strokes.length);
    // Check strict intersections; intentional junctions at common endpoints are allowed.
    const side = (a: number[], b: number[], c: number[]) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
      const p = segments[i], q = segments[j];
      const crosses = side(p.a, p.b, q.a) * side(p.a, p.b, q.b) < -1e-8 &&
        side(q.a, q.b, p.a) * side(q.a, q.b, p.b) < -1e-8;
      expect(crosses, `Act ${act}: ${JSON.stringify([p, q])}`).toBe(false);
    }
  });
});

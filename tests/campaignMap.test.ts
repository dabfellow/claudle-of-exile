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
});

import { describe, expect, it } from 'vitest';
import { ACT_MAPS, smoothPath, WORLD_MAP } from '../src/data/campaignMap';
import { ACTS, roadsInto, zonesInAct } from '../src/data/zones';

const inPicture = ([x, y]: [number, number]) => x >= 0 && x <= 100 && y >= 0 && y <= 100;

describe('campaign map data', () => {
  it('puts every act on the world map, inside the picture', () => {
    for (const a of ACTS) expect(WORLD_MAP.labels[a.n] && inPicture(WORLD_MAP.labels[a.n])).toBeTruthy();
    expect(WORLD_MAP.trail.every(inPicture)).toBe(true);
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

import { describe, expect, it } from 'vitest';
import { UNIQUES } from '../src/data/bases';
import { ZONES, zonesInAct } from '../src/data/zones';
import { packArtUrl } from '../src/ui/assets';

describe('pack art', () => {
  it('every monster and boss has art, so none falls back to the skull', () => {
    const missing = ZONES.flatMap((z) => [...z.monsters, z.boss]).filter((m) => !packArtUrl(`monsters/${m.id}`));
    expect(missing.map((m) => m.id)).toEqual([]);
  });

  it('no two Act 2 monsters share a picture', () => {
    const urls = zonesInAct(2).flatMap((z) => [...z.monsters, z.boss]).map((m) => packArtUrl(`monsters/${m.id}`));
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('the Act 2 uniques have their own art', () => {
    const ids = ['sunmane_pelt', 'mirage_veil', 'khans_tithe', 'kurgan_crown', 'stormrider_greaves', 'pyre_heart'];
    expect(ids.filter((id) => !UNIQUES.some((u) => u.id === id))).toEqual([]);
    expect(ids.filter((id) => !packArtUrl(`uniques/${id}`))).toEqual([]);
  });
});

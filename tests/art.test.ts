import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { UNIQUES } from '../src/data/bases';
import { MARTYR, ZONES, zoneDef, zonesInAct } from '../src/data/zones';
import { packArtUrl, terrainArt } from '../src/ui/assets';

describe('pack art', () => {
  it('every monster and boss has art, so none falls back to the skull', () => {
    const missing = ZONES.flatMap((z) => [...z.monsters, z.boss]).filter((m) => !packArtUrl(`monsters/${m.id}`));
    expect(missing.map((m) => m.id)).toEqual([]);
  });

  it('no two Act 2 monsters share a picture', () => {
    const urls = zonesInAct(2).flatMap((z) => [...z.monsters, z.boss]).map((m) => packArtUrl(`monsters/${m.id}`));
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('no two Act 3 monsters share a picture, martyrs included', () => {
    const ids = [...zonesInAct(3).flatMap((z) => [...z.monsters, z.boss]), MARTYR].map((m) => m.id);
    const urls = ids.map((id) => packArtUrl(`monsters/${id}`));
    expect(urls.filter((u) => !u)).toEqual([]);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('every campaign zone has a terrain backdrop on disk', () => {
    const missing = ZONES.filter((zone) => {
      const backdrop = packArtUrl(`zones/${zone.id}`);
      return !backdrop || !existsSync(new URL(backdrop));
    });
    expect(missing.map((zone) => zone.id)).toEqual([]);
  });

  it('uses a cave variant when available and falls back to the base cave', () => {
    const cave = zoneDef('brinecaves');
    const caveBackdrop = terrainArt({ ...cave, terrainVariant: undefined });
    expect(caveBackdrop).toContain('terrain-cave.webp');
    expect(terrainArt(cave)).toContain('terrain-cave-bandits.webp');
    expect(terrainArt(zoneDef('icevault'))).toContain('terrain-cave-spiders.webp');
    expect(terrainArt({ ...cave, terrainVariant: 'unillustrated' })).toBe(caveBackdrop);
  });

  it('no two Act 4 monsters share a picture', () => {
    const urls = zonesInAct(4).flatMap((z) => [...z.monsters, z.boss]).map((m) => packArtUrl(`monsters/${m.id}`));
    expect(urls.filter((u) => !u)).toEqual([]);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('the Act 4 uniques have their own art', () => {
    const ids = ['giants_knuckle', 'rimewalkers', 'heart_of_winter', 'frostgrip', 'crown_of_the_hollow', 'wolfmother_pelt'];
    expect(ids.filter((id) => !UNIQUES.some((u) => u.id === id))).toEqual([]);
    expect(ids.filter((id) => !packArtUrl(`uniques/${id}`))).toEqual([]);
  });

  it('the Act 3 uniques have their own art', () => {
    const ids = ['martyrs_shroud', 'pilgrims_road', 'saints_shard', 'confession_hood', 'halo_of_wrath', 'chainbreaker'];
    expect(ids.filter((id) => !UNIQUES.some((u) => u.id === id))).toEqual([]);
    expect(ids.filter((id) => !packArtUrl(`uniques/${id}`))).toEqual([]);
  });

  it('no two Act 6 monsters share a picture, and its uniques have art', () => {
    const ids = zonesInAct(6).flatMap((z) => [...z.monsters, z.boss]).map((m) => m.id);
    const urls = ids.map((id) => packArtUrl(`monsters/${id}`));
    expect(urls.filter((u) => !u)).toEqual([]);
    expect(new Set(urls).size).toBe(urls.length);
    const uniques = ['oathbreaker', 'kingsmarch', 'last_decree', 'crownbreaker_mask', 'hand_of_the_regent', 'regents_mantle'];
    expect(uniques.filter((id) => !packArtUrl(`uniques/${id}`))).toEqual([]);
  });

  it('no two Act 5 monsters share a picture, and its uniques have art', () => {
    const ids = zonesInAct(5).flatMap((z) => [...z.monsters, z.boss]).map((m) => m.id);
    const urls = ids.map((id) => packArtUrl(`monsters/${id}`));
    expect(urls.filter((u) => !u)).toEqual([]);
    expect(new Set(urls).size).toBe(urls.length);
    const uniques = ['leviathan_hide', 'deckwalkers', 'bosuns_oath', 'tide_crown', 'corposant', 'harpoons_answer'];
    expect(uniques.filter((id) => !packArtUrl(`uniques/${id}`))).toEqual([]);
  });

  it('the Act 2 uniques have their own art', () => {
    const ids = ['sunmane_pelt', 'mirage_veil', 'khans_tithe', 'kurgan_crown', 'stormrider_greaves', 'pyre_heart'];
    expect(ids.filter((id) => !UNIQUES.some((u) => u.id === id))).toEqual([]);
    expect(ids.filter((id) => !packArtUrl(`uniques/${id}`))).toEqual([]);
  });
});

import { EXTRA_ZONES, zoneDef, type MonsterDef, type ZoneDef } from './zones';

/**
 * The Maps preview (docs/MILESTONES.md milestone 5): one tier, two themes, every number a knob. A map is a ZoneDef that
 * isn't on the campaign road, so combat runs it like any area; engine/maps.ts holds what a run adds on top.
 */

export interface MapTier {
  tier: number;
  /** monster level; the boss is one higher */
  level: number;
  /** monster packs before the map boss */
  packs: number;
  /** drop table tier (data/drops.ts) */
  dropTier: number;
  /** multipliers on its monsters' life and damage */
  lifeScale: number;
  dmgScale: number;
}

/** What a theme favours, on top of the drop table. */
export type ThemeDrop =
  | { kind: 'fossil'; killChance: number; bossQty: [number, number] }
  | { kind: 'unique'; uniqueId: string; killChance: number; bossChance: number };

export interface MapTheme {
  id: string;
  name: string;
  desc: string;
  /** shown on the Map Device */
  favours: string;
  /** the campaign area whose monsters and art this map borrows */
  from: string;
  bossName: string;
  drop: ThemeDrop;
  /** what Cartography spends on top of vellum and ink to draw this theme */
  drawWith: Record<string, number>;
}

export const MAP_TIERS: MapTier[] = [
  { tier: 1, level: 28, packs: 6, dropTier: 7, lifeScale: 0.35, dmgScale: 0.5 },
  { tier: 2, level: 31, packs: 7, dropTier: 8, lifeScale: 0.42, dmgScale: 0.58 },
  { tier: 3, level: 34, packs: 8, dropTier: 9, lifeScale: 0.5, dmgScale: 0.66 },
];

export const MAP_THEMES: MapTheme[] = [
  {
    id: 'barrows', name: 'Bone Barrows', from: 'kurgans', bossName: 'The Barrow King',
    desc: 'Grave mounds dug so deep they broke into something older. The walls are all ribs and teeth.',
    favours: 'Fossils',
    drop: { kind: 'fossil', killChance: 0.05, bossQty: [1, 3] },
    drawWith: { dense_fossil: 1 },
  },
  {
    id: 'stormvault', name: 'Storm Vault', from: 'plateau', bossName: 'Qara the Unhorsed',
    desc: 'A sealed hall on the high plateau where the storm riders laid up their dead and their war gear.',
    favours: 'Stormrider Greaves',
    drop: { kind: 'unique', uniqueId: 'stormrider_greaves', killChance: 0.002, bossChance: 0.2 },
    drawWith: { essence_storm_2: 1 },
  },
];

/** How often maps drop. A run should find a bit under one map, so a supply drains unless you top it up. */
export const MAP_DROPS = {
  inMapKill: 0.015,
  inMapBoss: 0.4,
  campaignKill: 0.004,
  campaignBoss: 0.1,
  /** campaign monsters below this level never drop maps */
  campaignMinLevel: 24,
  /** chance a map found in a run is one tier higher, so the top tiers never need Cartography */
  tierUp: 0.15,
};

/** maps come at you faster than the campaign: a run should take a minute or three */
const MAP_SPAWN_EVERY_MS = 5000;

export function mapZoneId(tier: number, themeId: string): string {
  return `map_${themeId}_t${tier}`;
}

/** Is this bank-style id a map rather than a material? */
export function isMapId(id: string): boolean {
  return id.startsWith('map_');
}

export function mapTheme(id: string): MapTheme {
  const t = MAP_THEMES.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown map theme ${id}`);
  return t;
}

export function mapTier(tier: number): MapTier {
  const t = MAP_TIERS.find((x) => x.tier === tier);
  if (!t) throw new Error(`Unknown map tier ${tier}`);
  return t;
}

export function hasMap(tier: number, themeId: string): boolean {
  return MAP_TIERS.some((t) => t.tier === tier) && MAP_THEMES.some((t) => t.id === themeId);
}

function scaled(m: MonsterDef, tier: MapTier, level: number): MonsterDef {
  return { ...m, level, lifeMult: (m.lifeMult ?? 1) * tier.lifeScale, dmgMult: (m.dmgMult ?? 1) * tier.dmgScale };
}

function mapZone(tier: MapTier, theme: MapTheme): ZoneDef {
  const area = zoneDef(theme.from);
  return {
    ...area,
    id: mapZoneId(tier.tier, theme.id),
    name: theme.name,
    desc: theme.desc,
    art: area.id,
    tier: tier.dropTier,
    levelRange: [tier.level, tier.level + 1],
    monsters: area.monsters.map((m) => scaled(m, tier, tier.level)),
    boss: { ...scaled(area.boss, tier, tier.level + 1), name: theme.bossName },
    actBoss: false,
    bossEvery: tier.packs,
    spawnEveryMs: MAP_SPAWN_EVERY_MS,
    uniques: [],
    requires: { after: [] },
  };
}

for (const tier of MAP_TIERS) for (const theme of MAP_THEMES) EXTRA_ZONES.push(mapZone(tier, theme));

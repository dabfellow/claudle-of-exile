import type { MaterialDef } from './materials';
import { zonesInAct } from './zones';

/**
 * Cartography, Act 6's skill (docs/design/CARTOGRAPHY.md): the second route to maps. Drops give you whatever turns up;
 * a drawn map is the theme you picked, and folios make enough of them for a long offline grind. Drawn maps go straight
 * into the same stock the Map Device runs from.
 */
export const CARTOGRAPHY_GATE = { zone: zonesInAct(6)[0]?.id ?? 'act6_not_built', label: 'Act 6' };

/** How many maps of the tier below one upgrade uses, and with Master Cartographer. */
export const UPGRADE_MAPS = 3;
export const MASTER_UPGRADE_MAPS = 2;

/** A folio: this many tier 1 maps of one theme at once, for FOLIO_COST times the materials. */
export const FOLIO_SIZE = 5;
export const FOLIO_COST = 4;
export const FOLIO_LEVEL = 32;

/** Each theme's recipe opens this many levels after the theme before it. */
export const THEME_LEVEL_STEP = 3;

export interface ChartTier {
  tier: number;
  level: number;
  intervalMs: number;
  xp: number;
  inputs: Record<string, number>;
}

/** Tier 1 is drawn from nothing; every tier above upgrades the one below. Each also takes its theme's `drawWith`. */
export const CHART_TIERS: ChartTier[] = [
  { tier: 1, level: 10, intervalMs: 12000, xp: 60, inputs: { vellum: 4, gall_ink: 2 } },
  { tier: 2, level: 25, intervalMs: 16000, xp: 130, inputs: { fine_vellum: 3, gall_ink: 2 } },
  { tier: 3, level: 40, intervalMs: 20000, xp: 240, inputs: { fine_vellum: 6, sepia_ink: 3 } },
];

export const CHART_MATERIALS: MaterialDef[] = [
  { id: 'vellum', name: 'Vellum', kind: 'chart', color: '#d8c8a0', value: 12, desc: 'Scraped thin and pressed flat. Every map starts here.' },
  { id: 'gall_ink', name: 'Gall Ink', kind: 'chart', color: '#46506a', value: 15, desc: 'Black, and it bites into the page.' },
  { id: 'fine_vellum', name: 'Fine Vellum', kind: 'chart', color: '#f0e4c4', value: 45, desc: 'Takes a line fine enough for a higher tier of map.' },
  { id: 'sepia_ink', name: 'Sepia Ink', kind: 'chart', color: '#8a5a34', value: 60, desc: 'It stays dark long after the place it shows has gone.' },
];

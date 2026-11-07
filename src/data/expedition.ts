import type { MaterialDef } from './materials';

/**
 * Expedition (docs/GAME.md): Archaeology digs sites in the Hollow Peaks for Artifacts, which three merchants
 * take for currency. A site never runs out and never goes wrong: each one pays better the deeper you've worked it, and
 * what you find down there earns the standing that opens a merchant's better shelves.
 */

/** A dig needs no zone data: Archaeology waits for Act 4's first area, named only by id. */
export const EXPEDITION_GATE = { zone: 'hollowpass', label: 'Act 4' };

export type CultureId = 'giant' | 'surveyor' | 'rime';

export interface CultureDef {
  id: CultureId;
  name: string;
  /** the Artifact this people left behind */
  artifact: string;
  artifactName: string;
  color: string;
  merchant: string;
  /** what the merchant deals in, on the Merchants panel */
  deals: string;
}

export const CULTURES: CultureDef[] = [
  { id: 'giant', name: 'The Giants', artifact: 'giant_tally', artifactName: 'Giant Tally-bone', color: '#c9b58a', merchant: 'Sigrun Bone-reader', deals: 'Orbs' },
  { id: 'surveyor', name: "The Empire's Surveyors", artifact: 'survey_brass', artifactName: "Surveyor's Brass", color: '#d0a040', merchant: 'Cassia, Last of the Survey', deals: 'Crafting materials of your choosing' },
  { id: 'rime', name: 'The Rimebound', artifact: 'rime_idol', artifactName: 'Rime Idol', color: '#8fd0e8', merchant: 'The Keeper in the Ice', deals: 'Undoing, and the Whetstone' },
];

export interface SiteDef {
  /** also the id of its dig action */
  id: string;
  name: string;
  desc: string;
  culture: CultureId;
  /** Archaeology level needed */
  level: number;
  intervalMs: number;
  xp: number;
  /** Artifacts an hour on the top stratum, before anything speeds it up */
  rate: number;
  color: string;
  /** one thing at the bottom of each stratum, in digging order */
  finds: [string, string, string];
}

export const SITES: SiteDef[] = [
  {
    id: 'dig_cairn', name: "Giant's Cairn", culture: 'giant', level: 1, intervalMs: 3000, xp: 7, rate: 300, color: '#c9b58a',
    desc: 'A heap of stones as tall as a chapel. It was a small grave, to the people who built it.',
    finds: ['A Thumb Bone', 'The Tally of Kills', 'A Child-sized Crown'],
  },
  {
    id: 'dig_cutting', name: "Surveyors' Cutting", culture: 'surveyor', level: 12, intervalMs: 3500, xp: 15, rate: 350, color: '#d0a040',
    desc: 'A straight trench through a glacier, cut by an empire that wanted to know what the mountains were worth.',
    finds: ['A Brass Sighting Rod', 'The Field Ledger', 'An Order to Withdraw'],
  },
  {
    id: 'dig_barrow', name: 'Rime Barrow', culture: 'rime', level: 24, intervalMs: 4000, xp: 25, rate: 400, color: '#8fd0e8',
    desc: 'The Rimebound gave their dead to the ice and took small idols in trade. The ice has kept its side of it.',
    finds: ['A Frozen Offering', 'The Unmelting Knife', 'A Face in the Ice'],
  },
  {
    id: 'dig_colossus', name: 'The Fallen Colossus', culture: 'giant', level: 40, intervalMs: 4500, xp: 36, rate: 500, color: '#a89878',
    desc: 'What everyone took for a ridge has a ribcage. You dig in through the side.',
    finds: ['A Rib Tally', 'The Spear in the Spine', 'The Heart-Stone'],
  },
  {
    id: 'dig_adit', name: 'The Imperial Adit', culture: 'surveyor', level: 55, intervalMs: 5000, xp: 46, rate: 600, color: '#b88a3a',
    desc: 'The Survey went deeper than its orders said. The last ledger entries are in a different hand.',
    finds: ['A Sealed Dispatch', 'The Deep Ledger', "The Last King's Writ"],
  },
  {
    id: 'dig_heart', name: 'The Hollow Heart', culture: 'rime', level: 70, intervalMs: 5000, xp: 52, rate: 700, color: '#a8c8f8',
    desc: 'The peaks are called hollow because something was taken out of them. This is where it was.',
    finds: ['A Shard of Old Winter', 'The Rimebound Oath', 'What the Ice Was For'],
  },
];

/** Hours of digging at a site's base speed to reach each find, so a slow site isn't a longer one. */
export const FIND_HOURS = [4, 16, 48];
/** Each find you've passed at a site makes it pay this much more. */
export const STRATUM_YIELD = 0.25;
export const STRATA = ['Topsoil', 'Packed Scree', 'Old Ice', 'Bedrock'];
/** Standing with a people is one per find on their sites. */
export const MAX_STANDING = FIND_HOURS.length * 2;

const HOUR = 3_600_000;

/** Total digs at this site to reach each find. */
export function findDigs(site: SiteDef): number[] {
  return FIND_HOURS.map((h) => Math.round((h * HOUR) / site.intervalMs));
}

/** Chance a dig turns up an Artifact on the top stratum. */
export function digChance(site: SiteDef): number {
  return (site.rate * site.intervalMs) / HOUR;
}

export function siteOf(id: string): SiteDef | undefined {
  return SITES.find((x) => x.id === id);
}

export function cultureDef(id: CultureId): CultureDef {
  return CULTURES.find((c) => c.id === id)!;
}

/** Raises one modifier a tier: sold only by the Keeper, with a rare drop so nothing here needs the skill. */
export const WHETSTONE = 'ancient_whetstone';
export const WHETSTONE_DROP = { bossChance: 0.08, killChance: 0.0003, firstAct: 4 };

export interface WareDef {
  id: string;
  culture: CultureId;
  /** material or currency sold */
  item: string;
  /** how many one purchase gives */
  qty: number;
  /** Artifacts for one purchase off a full shelf */
  cost: number;
  /** purchases a full shelf holds */
  shelf: number;
  /** time to put one back */
  restockMs: number;
  /** standing with this people needed */
  standing: number;
}

const ware = (culture: CultureId, item: string, cost: number, shelf: number, restockHours: number, standing: number, qty = 1): WareDef => ({
  id: `${culture}_${item}`, culture, item, qty, cost, shelf, restockMs: restockHours * HOUR, standing,
});

/** Exalted, Divine and Annulment stay combat-only: nobody up here will part with one. */
export const WARES: WareDef[] = [
  ware('giant', 'alteration', 60, 10, 1, 0, 10),
  ware('giant', 'regal', 40, 24, 1 / 3, 0),
  ware('giant', 'alchemy', 55, 12, 1, 1),
  ware('giant', 'chaos', 120, 12, 2, 2),
  ware('giant', 'instill', 600, 2, 24, 4),
  ware('giant', 'expansion', 750, 2, 24, 5),

  ware('surveyor', 'scorched_fossil', 40, 10, 1, 0),
  ware('surveyor', 'frigid_fossil', 40, 10, 1, 0),
  ware('surveyor', 'metallic_fossil', 40, 10, 1, 0),
  ware('surveyor', 'dense_fossil', 40, 10, 1, 1),
  ware('surveyor', 'serrated_fossil', 40, 10, 1, 1),
  ware('surveyor', 'essence_vitality_2', 50, 10, 1, 2),
  ware('surveyor', 'essence_frost_2', 50, 10, 1, 2),
  ware('surveyor', 'essence_haste_2', 50, 10, 1, 2),
  ware('surveyor', 'forgers_seal', 180, 8, 3, 3),
  ware('surveyor', 'locksmiths_wax', 270, 6, 4, 4),

  ware('rime', 'scour', 120, 8, 2, 0, 5),
  ware('rime', 'regret', 90, 8, 2, 0, 3),
  ware('rime', 'rough_gem', 200, 8, 2, 1, 5),
  ware('rime', WHETSTONE, 450, 4, 6, 1),
];

export function wareDef(id: string): WareDef {
  const w = WARES.find((x) => x.id === id);
  if (!w) throw new Error(`Unknown ware ${id}`);
  return w;
}

export function hasWare(id: string): boolean {
  return WARES.some((w) => w.id === id);
}

export const EXPEDITION_MATERIALS: MaterialDef[] = [
  ...CULTURES.map((c): MaterialDef => ({ id: c.artifact, name: c.artifactName, kind: 'artifact', color: c.color, value: 1, desc: `${c.merchant} trades these for goods. Dug up by Archaeology.` })),
  { id: WHETSTONE, name: 'Ancient Whetstone', kind: 'artifact', color: '#a8c8f8', value: 150, desc: 'Raises one modifier you pick by one tier, as far as the item level allows. One per item.' },
];

/**
 * The continent the campaign crosses (Campaign page). Every act is one region of it, PoE-style, and its
 * areas are points inside that region joined by the roads their bosses open.
 * Coordinates share one 1000 × 640 frame.
 */
export const CONTINENT_SIZE = { w: 1000, h: 640 };

export interface ActRegion {
  act: number;
  /** outline, clockwise */
  points: [number, number][];
  /** where the act's name sits */
  label: [number, number];
  /** the close-up map draws it this many times taller than the continent does, to give its labels room */
  stretch?: number;
}

export const ACT_REGIONS: ActRegion[] = [
  {
    act: 1, // the Drowned Coast: the west shore
    points: [[120, 140], [260, 120], [300, 250], [290, 400], [330, 560], [220, 580], [130, 520], [70, 420], [100, 330], [80, 230]],
    label: [185, 470],
  },
  {
    act: 2, // the Burning Steppe: the open middle
    points: [[300, 250], [520, 230], [600, 330], [580, 470], [470, 560], [330, 560], [290, 400]],
    label: [445, 345],
  },
  {
    act: 3, // the City of Saints: far to the south
    points: [[470, 560], [580, 470], [760, 440], [830, 520], [760, 600], [600, 610]],
    label: [700, 525],
    stretch: 1.6,
  },
  {
    act: 4, // the Hollow Peaks: the northern range
    points: [[260, 120], [420, 60], [600, 70], [645, 190], [520, 230], [300, 250]],
    label: [455, 150],
    stretch: 1.5,
  },
  {
    act: 5, // the Sunless Sea: the eastern shore
    points: [[520, 230], [645, 190], [825, 230], [900, 320], [860, 420], [760, 440], [580, 470], [600, 330]],
    label: [730, 320],
  },
  {
    act: 6, // the Shattered Throne: the far north-east
    points: [[600, 70], [680, 35], [800, 30], [935, 105], [910, 165], [825, 230], [645, 190]],
    label: [745, 55],
    stretch: 1.6,
  },
];

/** Each area's spot on the continent. */
export const ZONE_POS: Record<string, [number, number]> = {
  // Act 1 climbs the coast from the mud flats to the Drowned Sanctum by the steppe road
  mudflats: [190, 530],
  brinecaves: [115, 450],
  ashwood: [190, 400],
  blackreed: [130, 330],
  crypt: [215, 290],
  shipgrave: [140, 230],
  stormcliffs: [195, 165],
  sanctum: [265, 230],
  // Act 2 runs east across the steppe, then south toward the city of saints
  cinderroad: [340, 300],
  saltflats: [420, 280],
  blackgrass: [500, 300],
  caravan: [540, 380],
  kurgans: [450, 380],
  plateau: [370, 440],
  pyretemple: [450, 500],
  burningthrone: [540, 470],
  // Act 3 goes in through the gate, by the quarter or the yard to the foundry, then by the hall or the stair to the altar
  pilgrimgate: [530, 550],
  almsquarter: [590, 510],
  scourgeyard: [590, 580],
  reliquary: [640, 475],
  bellfoundry: [650, 545],
  inquisition: [705, 495],
  penitentstair: [705, 580],
  choirloft: [760, 585],
  saintswalk: [750, 530],
  highaltar: [800, 490],
  // Act 4 climbs the northern range from the steppe's edge by a low road and a high road, which meet below the throne
  hollowpass: [318, 190],
  screefields: [375, 135],
  howlingfells: [385, 205],
  glasslake: [445, 125],
  bonequarry: [450, 205],
  icevault: [450, 82],
  mammothroad: [515, 195],
  hangingglacier: [515, 115],
  steading: [580, 170],
  longhall: [612, 120],
  kingsstair: [565, 88],
  giantsthrone: [505, 62],
  // Act 5 sails island to island round the sea, then spirals in to the eye of the maelstrom
  blackharbor: [600, 240],
  wreckline: [665, 225],
  cinderkey: [655, 275],
  squallbanks: [730, 260],
  lampgulf: [785, 240],
  drownedfleet: [810, 295],
  brimstone: [860, 345],
  hollowreef: [775, 345],
  thunderhead: [790, 410],
  leviathanrib: [850, 400],
  blackcurrent: [690, 425],
  voicetrench: [630, 375],
  lightless: [717, 365],
  maelstrom: [670, 325],
  // Act 6 comes in by the gate you were driven out of, along the south of the empire, back through the capital, then up to the throne
  exilesgate: [655, 172],
  kingsroad: [705, 190],
  tithefields: [755, 175],
  fortobedience: [760, 210],
  bannerfield: [815, 195],
  assizes: [872, 175],
  lowercity: [820, 140],
  dryaqueduct: [765, 112],
  kingsmint: [765, 145],
  hanginggardens: [705, 130],
  burnedarchive: [650, 130],
  longfracture: [640, 90],
  driftingquarter: [690, 58],
  kingsreach: [700, 92],
  sunderedhall: [755, 65],
  hallofcrowns: [805, 48],
  ninthstair: [825, 85],
  shatteredthrone: [890, 110],
};

export function actRegion(act: number): ActRegion | undefined {
  return ACT_REGIONS.find((r) => r.act === act);
}

/** SVG path for a region's outline. */
export function regionPath(r: ActRegion): string {
  return `M${r.points.map(([x, y]) => `${x} ${y}`).join(' L')} Z`;
}

/** Where a continent point sits on an act's close-up map, stretched down from the region's top edge. */
export function actMapPoint(r: ActRegion, [x, y]: [number, number]): [number, number] {
  const top = Math.min(...r.points.map((p) => p[1]));
  return [x, top + (y - top) * (r.stretch ?? 1)];
}

/** The region's bounding box on its close-up map, padded, as an SVG viewBox. */
export function regionViewBox(r: ActRegion, pad = 30): string {
  const pts = r.points.map((p) => actMapPoint(r, p));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return `${x} ${y} ${Math.max(...xs) + pad - x} ${Math.max(...ys) + pad - y}`;
}

export type LabelSide = 'below' | 'above' | 'left' | 'right';

/** Labels sit below their point unless a road or a neighbour is in the way. */
export const LABEL_SIDE: Record<string, LabelSide> = {
  almsquarter: 'left', reliquary: 'above', bellfoundry: 'left', inquisition: 'above', saintswalk: 'right', highaltar: 'above',
  screefields: 'above', icevault: 'above', longhall: 'above', kingsstair: 'above',
  lampgulf: 'above', drownedfleet: 'right', brimstone: 'right', hollowreef: 'left', voicetrench: 'left', lightless: 'left', maelstrom: 'right',
  lowercity: 'right', dryaqueduct: 'above', longfracture: 'left', driftingquarter: 'above', sunderedhall: 'above',
};

export const LABEL_LINE_HEIGHT = 10;

/** An area's name for the close-up map: no "The", and on two lines when it's long. */
export function labelLines(name: string): string[] {
  const short = name.replace(/^The /, '');
  const words = short.split(' ');
  if (short.length <= 10 || words.length === 1) return [short];
  const breaks = words.slice(1).map((_, i) => [words.slice(0, i + 1).join(' '), words.slice(i + 1).join(' ')]);
  return breaks.reduce((a, b) => (Math.max(a[0].length, a[1].length) <= Math.max(b[0].length, b[1].length) ? a : b));
}

/** Where a label's first line goes, relative to its point of radius r, and how it aligns. */
export function labelAnchor(side: LabelSide, r: number, lines: number): { x: number; y: number; anchor: 'middle' | 'start' | 'end' } {
  const gap = r + 4;
  const block = (lines - 1) * LABEL_LINE_HEIGHT;
  if (side === 'above') return { x: 0, y: -gap - block, anchor: 'middle' };
  if (side === 'left') return { x: -gap, y: 3 - block / 2, anchor: 'end' };
  if (side === 'right') return { x: gap, y: 3 - block / 2, anchor: 'start' };
  return { x: 0, y: gap + 8, anchor: 'middle' };
}

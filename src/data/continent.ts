/**
 * The continent the campaign crosses (Campaign page). Every act is one region of it, PoE-style, and its
 * areas are points inside that region joined by the order their bosses open them.
 * Coordinates share one 1000 × 640 frame.
 */
export const CONTINENT_SIZE = { w: 1000, h: 640 };

export interface ActRegion {
  act: number;
  /** outline, clockwise */
  points: [number, number][];
  /** where the act's name sits */
  label: [number, number];
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
  },
  {
    act: 4, // the Hollow Peaks: the northern range
    points: [[260, 120], [420, 60], [600, 70], [640, 160], [520, 230], [300, 250]],
    label: [455, 150],
  },
  {
    act: 5, // the Sunless Sea: the eastern shore
    points: [[520, 230], [640, 160], [820, 200], [900, 320], [860, 420], [760, 440], [580, 470], [600, 330]],
    label: [730, 320],
  },
  {
    act: 6, // the Shattered Throne: the far north-east
    points: [[600, 70], [780, 60], [900, 130], [820, 200], [640, 160]],
    label: [760, 125],
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
  // Act 3 goes in through the gate and winds round the city to the High Altar at its heart
  pilgrimgate: [575, 520],
  almsquarter: [630, 490],
  scourgeyard: [680, 485],
  reliquary: [750, 462],
  bellfoundry: [795, 515],
  inquisition: [750, 560],
  penitentstair: [695, 572],
  choirloft: [620, 595],
  saintswalk: [580, 565],
  highaltar: [640, 540],
  // Act 5 sails island to island round the sea, then spirals in to the eye of the maelstrom
  blackharbor: [600, 215],
  wreckline: [650, 195],
  cinderkey: [705, 205],
  squallbanks: [765, 225],
  lampgulf: [815, 255],
  drownedfleet: [855, 310],
  brimstone: [835, 365],
  hollowreef: [785, 385],
  thunderhead: [725, 410],
  leviathanrib: [665, 425],
  blackcurrent: [620, 395],
  voicetrench: [640, 335],
  lightless: [675, 290],
  maelstrom: [730, 285],
};

export function actRegion(act: number): ActRegion | undefined {
  return ACT_REGIONS.find((r) => r.act === act);
}

/** SVG path for a region's outline. */
export function regionPath(r: ActRegion): string {
  return `M${r.points.map(([x, y]) => `${x} ${y}`).join(' L')} Z`;
}

/** The region's bounding box, padded, as an SVG viewBox. */
export function regionViewBox(r: ActRegion, pad = 30): string {
  const xs = r.points.map((p) => p[0]);
  const ys = r.points.map((p) => p[1]);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return `${x} ${y} ${Math.max(...xs) + pad - x} ${Math.max(...ys) + pad - y}`;
}

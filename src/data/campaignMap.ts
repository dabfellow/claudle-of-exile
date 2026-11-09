/**
 * Where things sit on the Campaign page's maps. This is the one file to edit to move a line or a label so it
 * fits the art.
 *
 * Every point is [x, y] in percent of its picture: [0, 0] is the top-left corner, [100, 100] the bottom-right.
 *
 * - WORLD_MAP is the zoomed-out map of every act: where each act's name sits and the rough trail between them.
 * - ACT_MAPS has one close-up per act: where each area sits, the bends in each road between two areas
 *   (keyed 'from>to', drawn as a smooth curve through the bends), and where roads from the act before come in.
 *
 * There's no painted top-down map art in the asset packs yet, so the pictures are drawn by the game from the
 * continent outline in data/continent.ts. To use a painting instead, drop the file in src/assets/maps/, set
 * `image` (as in the example below) and set `aspect` to the picture's width ÷ height, then nudge the points
 * here until the line follows the roads in the picture:
 *   image: new URL('../assets/maps/act1.webp', import.meta.url).href,
 */

export type MapPoint = [number, number];

export interface WorldMapData {
  /** width ÷ height of the picture */
  aspect: number;
  /** a painted map to show instead of the drawn one */
  image?: string;
  /** where each act's name sits */
  labels: Record<number, MapPoint>;
  /** the rough trail the campaign takes, start to finish */
  trail: MapPoint[];
}

export interface ActMapData {
  /** width ÷ height of the picture */
  aspect: number;
  /** a painted landscape to show instead of the drawn one */
  image?: string;
  /** where each area's marker sits */
  zones: Record<string, MapPoint>;
  /** extra bends in the road between two areas, keyed 'from>to'; a road with none is drawn straight */
  roads: Record<string, MapPoint[]>;
  /** roads coming in from the act before: drawn from `at` (usually an edge) to the area `to` */
  entries: { from: string; to: string; at: MapPoint }[];
}

export const WORLD_MAP: WorldMapData = {
  aspect: 1000 / 640,
  labels: {
    1: [18.5, 73.4],
    2: [44.5, 53.9],
    3: [70, 82],
    4: [45.5, 23.4],
    5: [73, 50],
    6: [74.5, 8.6],
  },
  trail: [
    // Act 1: up the coast from the Mud Flats to the Drowned Sanctum
    [19, 82.8], [13, 51.6], [26.5, 35.9],
    // Act 2: across the steppe to the Burning Throne
    [34, 46.9], [45, 59.4], [54, 73.4],
    // Act 3: through the city to the High Altar
    [53, 85.9], [65, 85.2], [80, 76.6],
    // the long road north to the peaks
    [58, 52], [36, 38],
    // Act 4: up the range to the Giant's Throne
    [31.8, 29.7], [44.5, 19.5], [50.5, 9.7],
    // Act 5: down to the harbour and round the sea to the Maelstrom
    [60, 37.5], [71.7, 57], [67, 50.8],
    // Act 6: in by the Exile's Gate, up to the Shattered Throne
    [65.5, 26.9], [76.5, 22.7], [89, 17.2],
  ],
};

export const ACT_MAPS: Record<number, ActMapData> = {
  1: {
    // The Drowned Coast
    aspect: 0.615,
    zones: {
      mudflats: [46.9, 84.6],
      brinecaves: [23.4, 69.2],
      ashwood: [46.9, 59.6],
      blackreed: [28.1, 46.2],
      crypt: [54.7, 38.5],
      shipgrave: [31.3, 26.9],
      stormcliffs: [48.4, 14.4],
      sanctum: [70.3, 26.9],
    },
    roads: {
      'mudflats>brinecaves': [[40.9, 77.9], [29.8, 74.8]],
      'brinecaves>ashwood': [[30.2, 64.6], [40.1, 63.3]],
      'ashwood>blackreed': [[42.3, 53.9], [33.1, 51]],
      'blackreed>crypt': [[36.3, 42], [46.8, 41.7]],
      'crypt>shipgrave': [[44.8, 35.7], [39.6, 30]],
      'shipgrave>stormcliffs': [[35.4, 21.6], [43.9, 18.9]],
      'stormcliffs>sanctum': [[57.9, 17.6], [62.4, 23.5]],
    },
    entries: [],
  },
  2: {
    // The Burning Steppe
    aspect: 0.949,
    zones: {
      cinderroad: [21.6, 25.6],
      saltflats: [43.2, 20.5],
      blackgrass: [64.9, 25.6],
      caravan: [75.7, 46.2],
      kurgans: [51.4, 46.2],
      plateau: [29.7, 61.5],
      pyretemple: [51.4, 76.9],
      burningthrone: [75.7, 69.2],
    },
    roads: {
      'cinderroad>saltflats': [[28.7, 22], [36.6, 23.1]],
      'saltflats>blackgrass': [[51.3, 20.5], [57.7, 24.9]],
      'blackgrass>caravan': [[70.6, 31.9], [71.2, 40.1]],
      'caravan>kurgans': [[67.2, 48.2], [59.1, 45.1]],
      'kurgans>plateau': [[45.2, 53.4], [35.9, 55.7]],
      'plateau>pyretemple': [[38.8, 65.1], [43.7, 72.9]],
      'pyretemple>burningthrone': [[60.6, 76.3], [67.5, 70.7]],
    },
    entries: [{ from: 'sanctum', to: 'cinderroad', at: [1.4, 7.7] }],
  },
  3: {
    // The City of Saints
    aspect: 1.265,
    zones: {
      pilgrimgate: [21.4, 62],
      almsquarter: [35.7, 42.8],
      scourgeyard: [35.7, 76.5],
      reliquary: [47.6, 25.9],
      bellfoundry: [50, 59.6],
      inquisition: [63.1, 35.5],
      penitentstair: [63.1, 76.5],
      choirloft: [76.2, 78.9],
      saintswalk: [73.8, 52.4],
      highaltar: [85.7, 33.1],
    },
    roads: {
      'pilgrimgate>almsquarter': [[27.8, 56.9], [30.5, 48.1]],
      'pilgrimgate>scourgeyard': [[27.5, 65.5], [30.6, 72.7]],
      'almsquarter>reliquary': [[38.7, 35.5], [44.4, 32]],
      'almsquarter>bellfoundry': [[41.9, 47], [44.8, 55.1]],
      'scourgeyard>bellfoundry': [[41.9, 72.2], [44.8, 64.2]],
      'bellfoundry>inquisition': [[56.3, 52.7], [58, 42.5]],
      'bellfoundry>penitentstair': [[53.4, 67], [59.5, 70.4]],
      'penitentstair>choirloft': [[67.5, 78.8], [72.1, 77.4]],
      'inquisition>saintswalk': [[68, 40.2], [69.8, 47.6]],
      'penitentstair>saintswalk': [[65.1, 66.9], [71.2, 60.7]],
      'saintswalk>highaltar': [[76.6, 44.3], [82.6, 40]],
    },
    entries: [{ from: 'burningthrone', to: 'pilgrimgate', at: [8, 10] }],
  },
  4: {
    // The Hollow Peaks
    aspect: 1.29,
    zones: {
      hollowpass: [19.8, 65.2],
      screefields: [32.6, 41.3],
      howlingfells: [34.8, 71.7],
      glasslake: [48.3, 37],
      bonequarry: [49.4, 71.7],
      icevault: [49.4, 18.3],
      mammothroad: [64, 67.4],
      hangingglacier: [64, 32.6],
      steading: [78.7, 56.5],
      longhall: [85.8, 34.8],
      kingsstair: [75.3, 20.9],
      giantsthrone: [61.8, 9.6],
    },
    roads: {
      'hollowpass>screefields': [[22.6, 55.4], [29.3, 49.7]],
      'hollowpass>howlingfells': [[24.6, 69.2], [30.2, 68.8]],
      'screefields>glasslake': [[38.4, 41.6], [43.1, 37.4]],
      'howlingfells>bonequarry': [[39.9, 73.4], [44.8, 70.9]],
      'glasslake>icevault': [[50, 30.5], [48.4, 24.2]],
      'bonequarry>mammothroad': [[54.2, 68.5], [59.5, 69.6]],
      'glasslake>hangingglacier': [[54.1, 37.3], [58.9, 33.1]],
      'mammothroad>steading': [[69.9, 65.3], [73.6, 59.2]],
      'steading>longhall': [[82.7, 49.7], [82.8, 41.3]],
      'hangingglacier>kingsstair': [[68.8, 29.8], [71.3, 24]],
      'steading>kingsstair': [[80, 43.7], [75.1, 32.5]],
      'kingsstair>giantsthrone': [[69.8, 18.5], [66.5, 12.4]],
    },
    entries: [{ from: 'highaltar', to: 'hollowpass', at: [2, 88] }],
  },
  5: {
    // The Sunless Sea
    aspect: 1.294,
    zones: {
      blackharbor: [25, 23.5],
      wreckline: [39.8, 19.1],
      cinderkey: [37.5, 33.8],
      squallbanks: [54.5, 29.4],
      lampgulf: [67, 23.5],
      drownedfleet: [72.7, 39.7],
      brimstone: [84.1, 54.4],
      hollowreef: [64.8, 54.4],
      thunderhead: [68.2, 73.5],
      leviathanrib: [81.8, 70.6],
      blackcurrent: [45.5, 77.9],
      voicetrench: [31.8, 63.2],
      lightless: [51.6, 60.3],
      maelstrom: [40.9, 48.5],
    },
    roads: {
      'blackharbor>wreckline': [[29.9, 20.3], [35.2, 21.4]],
      'blackharbor>cinderkey': [[30.1, 25.7], [33.1, 31.3]],
      'wreckline>squallbanks': [[45.7, 21], [49.5, 27]],
      'cinderkey>squallbanks': [[43.2, 30.3], [49.2, 31.8]],
      'squallbanks>lampgulf': [[58.5, 25.9], [63.2, 26.1]],
      'squallbanks>drownedfleet': [[60.2, 35.1], [67.3, 35.4]],
      'drownedfleet>brimstone': [[75.7, 46.2], [81, 49]],
      'drownedfleet>hollowreef': [[68.9, 43.9], [67.8, 50.2]],
      'brimstone>thunderhead': [[79.9, 63], [72.6, 66.5]],
      'hollowreef>thunderhead': [[67.3, 60.7], [66.4, 67.6]],
      'thunderhead>leviathanrib': [[72.8, 70.9], [77.6, 72.3]],
      'thunderhead>blackcurrent': [[59.9, 72.4], [52.9, 77.9]],
      'blackcurrent>voicetrench': [[41.7, 71.2], [35.7, 68.7]],
      'blackcurrent>lightless': [[46.4, 71.1], [50.2, 66.3]],
      'voicetrench>maelstrom': [[36, 59.1], [37.5, 52.7]],
      'lightless>maelstrom': [[47, 57.4], [44.7, 51.7]],
    },
    entries: [{ from: 'giantsthrone', to: 'blackharbor', at: [3.4, 0] }],
  },
  6: {
    // The Shattered Throne
    aspect: 1.039,
    zones: {
      exilesgate: [21.5, 67.7],
      kingsroad: [34.2, 75.3],
      tithefields: [46.8, 68.9],
      fortobedience: [48.1, 83.7],
      bannerfield: [62, 77.4],
      assizes: [76.5, 68.9],
      lowercity: [63.3, 54.2],
      dryaqueduct: [49.4, 42.4],
      kingsmint: [49.4, 56.3],
      hanginggardens: [34.2, 50],
      burnedarchive: [20.3, 50],
      longfracture: [17.7, 33.2],
      driftingquarter: [30.4, 19.7],
      kingsreach: [32.9, 34],
      sunderedhall: [46.8, 22.6],
      hallofcrowns: [59.5, 15.5],
      ninthstair: [64.6, 31.1],
      shatteredthrone: [81, 41.6],
    },
    roads: {
      'exilesgate>kingsroad': [[26.6, 69.2], [29.8, 73.4]],
      'kingsroad>tithefields': [[38.1, 71.9], [43.1, 71.6]],
      'kingsroad>fortobedience': [[39.8, 76.9], [43.3, 81.6]],
      'tithefields>bannerfield': [[52.9, 70.5], [56.8, 75.4]],
      'fortobedience>bannerfield': [[52.4, 80.2], [57.8, 80]],
      'bannerfield>assizes': [[67.8, 75.8], [71.5, 71]],
      'bannerfield>lowercity': [[64.5, 69.4], [61.9, 61.6]],
      'lowercity>dryaqueduct': [[57.4, 51.4], [54.3, 45.5]],
      'lowercity>kingsmint': [[58.2, 53.6], [53.9, 56.3]],
      'dryaqueduct>hanginggardens': [[44.7, 46.5], [38.7, 46.9]],
      'kingsmint>hanginggardens': [[44.6, 52.7], [38.8, 52.7]],
      'hanginggardens>burnedarchive': [[29.3, 48.7], [24.7, 50.7]],
      'hanginggardens>longfracture': [[29.9, 42.6], [22.3, 39.3]],
      'longfracture>driftingquarter': [[21, 27.3], [26.9, 24.6]],
      'longfracture>kingsreach': [[23.1, 32], [28, 34.4]],
      'driftingquarter>sunderedhall': [[35.9, 22.3], [41.7, 20.9]],
      'kingsreach>sunderedhall': [[38.8, 31.3], [41.9, 25.6]],
      'sunderedhall>hallofcrowns': [[50.6, 18.9], [55.8, 18.4]],
      'sunderedhall>ninthstair': [[53.8, 23.9], [58.5, 29.2]],
      'ninthstair>shatteredthrone': [[69.4, 36.3], [76.2, 37.4]],
    },
    entries: [{ from: 'maelstrom', to: 'exilesgate', at: [25.3, 100] }],
  },
};

/** A smooth SVG path through points (in the same units as the points), passing through every one of them. */
export function smoothPath(pts: MapPoint[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0][0]} ${pts[0][1]} L${pts[1][0]} ${pts[1][1]}`;
  // Catmull-Rom, as cubic Béziers
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: MapPoint = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: MapPoint = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${round(c1[0])} ${round(c1[1])} ${round(c2[0])} ${round(c2[1])} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const round = (n: number) => Math.round(n * 100) / 100;

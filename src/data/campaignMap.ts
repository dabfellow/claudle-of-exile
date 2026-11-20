/**
 * Where labels and act areas sit on the Campaign page's maps. World-road traces live in worldMapRoads.ts.
 *
 * Labels and act close-up points use percentages. World roads are traced in original image pixels
 * in worldMapRoads.ts so that their shared forks sit precisely on the painting.
 *
 * - WORLD_MAP is the zoomed-out map of every act: the painting and each act's name.
 * - ACT_MAPS has one close-up per act: where each area sits, the bends in each road between two areas
 *   (keyed 'from>to', drawn as a smooth curve through the bends), and where roads from the act before come in.
 *
 * The world uses the Ashen Codex painting; act close-ups are drawn from data/continent.ts.
 * To use a painting for a close-up, drop the file in src/assets/maps/, set
 * `image` (as in the example below) and set `aspect` to the picture's width ÷ height, then nudge the points
 * here until the line follows the roads in the picture:
 *   image: new URL('../assets/maps/act1.webp', import.meta.url).href,
 */

import { CHAPTER_ENTRIES, CHAPTER_TRACES } from './campaignRoutes';

export type MapPoint = [number, number];

export interface WorldMapData {
  /** width ÷ height of the picture */
  aspect: number;
  /** a painted map to show instead of the drawn one */
  image?: string;
  /** where each act's name sits */
  labels: Record<number, MapPoint>;
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
  /** Hand-traced shared road sections. Several progression links may travel the same stretch. */
  traces?: { d: string; routes: string[] }[];
  /** roads coming in from the act before: drawn from `at` (usually an edge) to the area `to` */
  entries: { from: string; to: string; at: MapPoint }[];
}

export const WORLD_MAP: WorldMapData = {
  aspect: 1536 / 1024,
  image: new URL('../assets/maps/veyrath-world-bound-sea.webp', import.meta.url).href,
  labels: {
    1: [16, 63],
    2: [15, 47],
    3: [35, 44],
    4: [51, 86],
    5: [43, 20],
    6: [77, 21],
    7: [87, 39],
  },
};

const LEGACY_ACT_MAPS: Record<number, ActMapData> = {
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

/** Invisible geographic hit areas. The artwork's coastline and the shared ink frontiers below define the visible territories. */
export const VEYRATH_REGIONS = [
  { act: 1, place: 'Brinewick and the Wreck Coast', d: 'M7 59 Q12 58 16 57 Q20 57 23 59 Q27 59 30 61 C32 65 27 66 27 68 C26 70 21 70 22 73 C20 76 20 78 23 79 C26 81 24 83 27 86 L28 89 L25 88 23 90 20 87 18 86 15 85 12 82 10 78 7 76 5 71 3 67 6 64 Z' },
  { act: 2, place: 'The supply roads and Wayfarer’s Post', d: 'M9 42 C15 43 18 40 22 39 C23 42 21 45 22 48 C24 50 29 49 30 52 Q32 56 30 61 Q27 59 23 59 Q20 57 16 57 Q12 58 7 59 L8 56 6 53 7 50 5 48 Z' },
  { act: 3, place: 'Greyford and the expedition depots', d: 'M22 39 Q30 38 35 40 Q40 39 44 41 C43 44 47 46 45 49 C44 52 46 54 44 56 C39 57 35 59 30 61 Q32 56 30 52 C29 49 24 50 22 48 C21 45 23 42 22 39 Z' },
  { act: 4, place: 'Harrowgate and the road to Eastmere', d: 'M44 41 Q51 45 59 41 L60 44 57 47 59 50 60 53 62 57 61 62 62 65 60 68 58 70 60 73 65 71 69 65 75 63 80 63 83 65 88 65 94 62 97 63 97 67 95 70 94 74 90 75 86 79 80 81 76 84 69 87 65 90 58 92 51 95 45 93 39 95 33 92 28 89 27 86 C24 83 26 81 23 79 C20 78 20 76 22 73 C21 70 26 70 27 68 C27 66 32 65 30 61 C35 59 39 57 44 56 C46 54 44 52 45 49 C47 46 43 44 44 41 Z' },
  { act: 5, place: 'The northern passes and Cairnwatch Institute', d: 'M3 30 L8 23 14 17 20 13 27 7 35 4 43 5 48 9 56 9 62 13 66 16 C65 20 68 22 66 25 C64 28 68 31 65 33 Q63 36 64 38 L61 41 59 41 Q51 45 44 41 Q40 39 35 40 Q30 38 22 39 C18 40 15 43 9 42 L6 40 8 37 4 35 Z' },
  { act: 6, place: 'Caer Veyr, its growing grounds and harbour', d: 'M66 16 L72 15 78 16 83 17 88 20 86 23 84 25 89 25 91 28 94 28 93 32 88 34 86 36 82 35 78 37 74 35 71 37 68 35 64 38 Q63 36 65 33 C68 31 64 28 66 25 C68 22 65 20 66 16 Z' },
  // Below the capital, not an offshore province: use the painting's existing underground callout.
  { act: 7, place: 'The First Seal beneath Caer Veyr', d: 'M85 36 Q89 35 97 36 L97 42 Q90 43 85 41 Z' },
];

/** Shared inland borders and coastal closures form enclosed territories in the atlas's ink palette. */
export const VEYRATH_FRONTIERS = [
  { acts: [1, 2], d: 'M7 59 Q9 58.7 11 58 Q14 57.8 16 57 Q18 56.8 20 57.8 L21.5 58.1 Q22 59 23 59 Q26 58.8 28 60 L30 61' },
  { acts: [1, 4], d: 'M30 61 C32 65 27 66 27 68 C26 70 21 70 22 73 C20 76 20 78 23 79 C26 81 24 83 27 86 L28 89' },
  { acts: [2, 3], d: 'M22 39 C23 42 21 45 22 48 C24 50 29 49 30 52 Q32 56 30 61' },
  { acts: [3, 4], d: 'M44 41 C43 44 47 46 45 49 C44 52 46 54 44 56 C39 57 35 59 30 61' },
  { acts: [2, 3, 4, 5], d: 'M9 42 C15 43 18 40 22 39 Q25 38.2 28 39.1 L30 38.7 Q33 40.2 35 40 Q38 39.2 40 40 L44 41 Q47 43.5 50 43 Q53 42 55 42.4 L59 41' },
  { acts: [5, 6], d: 'M66 16 C65 20 68 22 66 25 C64 28 68 31 65 33 Q63 36 64 38' },
  // Trace the coastal edge back to each inland junction so no claim ends in an open line.
  { acts: [1], d: 'M28 89 L27.2 88.2 26 88.5 25.4 87.5 24.3 87.7 23.7 86.9 22.4 87.2 21.8 86.1 20.4 86.2 19.8 85.3 18.5 85.5 17.8 84.4 16.5 84.6 15.5 83.5 14.1 83.2 14.7 82.3 13.4 81.6 12.7 80.3 11.4 80.1 10.7 78.8 9.5 78.2 9.9 77.2 8.7 76.7 8.4 75.4 7.3 74.6 7.8 73.3 6.5 72.3 7.1 71.2 6 70.4 5.4 69.1 6.1 68.5 5 67.8 5.8 66.7 4.7 65.9 5.7 64.6 5.2 63.8 6.4 62.7 6 61.5 7.1 60.4 7 59' },
  { acts: [2], d: 'M7 59 L7.5 57.8 8.8 57.3 8.2 56.4 9.2 55.5 8.2 54.9 8.8 53.7 7.6 52.8 8.5 51.6 7.1 51.1 7.5 49.7 6.5 49 7.3 47.8 6.7 46.8 8 46.2 7.6 45 8.7 44.3 8.2 43.1 9 42' },
  { acts: [4], d: 'M59 41 L59.7 42.2 58.7 43.2 60 44 58.8 45.1 59.2 46.2 57.5 47.2 58.4 48.5 57.9 49.4 59 50.2 58.6 51.5 60 53 59.3 54.1 60.4 55.2 60 56.4 61.5 57.2 60.7 58.5 61.5 60.1 60.5 61.5 61.4 62.3 60.6 63.7 61.6 65 60.5 66.2 60.8 67.1 59.6 68.1 59.8 69.2 58 70 58.4 71.5 59.7 72.2 60 73 61.5 72 63.4 72.4 65 71 66.2 71.2 67.5 68.9 69 65 71 64.4 72.5 65 75 63 77 63.6 80 63 81.6 64.1 83 65 85 64.4 86.7 65.5 88 65 90 63.9 92 64.2 94 62 95.3 63 97 63 96.2 64.6 97 65.7 96 67.3 95.2 67.1 95 70 93.8 70.3 94 72 92.8 72.8 92 74.2 90 75 88.3 75.4 87.5 77 86 79 84.2 78.9 83.6 80.3 80 81 78.4 82.7 76 84 74.3 84.5 73 86 69 87 68.1 88.2 66.8 88.1 65 90 63.2 90 62 91.3 60 91.2 58 92 55.8 93.6 54 93.2 51 95 49.5 94 47.5 94.5 45 93 43.8 94.1 42.2 93.8 39 95 37.6 94 35.9 94.2 33 92 31.5 91.4 30.5 90.2 28 89' },
  { acts: [5], d: 'M59 41 L60.5 40.8 61.4 40 62.6 40.1 62.2 39.3 64 38 M66 16 L64.8 14.9 63.5 15.1 62 13 60.3 13.4 59.1 12 57.4 12.1 56 9 54.4 9.7 52.7 9 50.7 9.8 48 9 46.5 7.5 45.2 7.8 43 5 41.7 5.7 39.6 4.6 37.8 5 35 4 33.5 5.1 31.6 5.2 30.3 6.6 28.8 6.3 27 7 25.7 9 24.4 8.7 23 10.8 21.1 11.2 20 13 18.7 13.1 17.2 15 15.4 15.3 14 17 12.3 17.5 11.7 19.2 10.4 19.3 10.1 21.2 8 23 8.5 24.1 6.7 25 7 26.8 5.5 27.4 5.9 28.6 3 30 4.5 31.4 4 33 5.5 33.8 4 35 5.8 35.7 5.7 37 8 37 7 38.3 6 40 7.6 40.6 9 42' },
  { acts: [6], d: 'M64 38 L65.4 37 66.6 37.4 68 35 69.4 35.7 71 37 72.5 35.4 74 35 76 36.6 78 37 80 35.5 82 35 83.4 35.8 84.7 35.1 86 36 87.2 34.5 88 34 89.5 34.2 90.5 33 91.7 33.4 93 32 92 31.3 93.5 30.2 93 29.4 94 28 92 28.3 91 28 89.6 26.6 89 25 87.2 25.5 86 24.7 84 25 84.8 23.8 86 23 85.4 21.5 88 20 86.1 19.6 85 18.4 83 17 81.7 17.6 80 16.3 78 16 76.4 16.5 74.8 15.4 72 15 70.8 16.1 69 15.6 67.4 16.5 66 16' },
  // An engraved enclosure around the underground entrance, not a surface claim in the sea.
  { acts: [7], d: 'M85.8 39.1 C85.8 37.8 86.5 37.1 87.4 37.2 C88.4 37.1 89 38 89 39.1 C89 40.4 88.3 41 87.4 41 C86.4 41 85.8 40.3 85.8 39.1 Z' },
];

/** Owner-approved placeholder paintings; keep the structural redraw pilot separate. */
const ACT_IMAGES: Record<number, string> = {
  1: new URL('../assets/maps/veyrath-act-1.webp', import.meta.url).href,
  2: new URL('../assets/maps/veyrath-act-2.webp', import.meta.url).href,
  3: new URL('../assets/maps/veyrath-act-3.webp', import.meta.url).href,
  4: new URL('../assets/maps/veyrath-act-4.webp', import.meta.url).href,
  5: new URL('../assets/maps/veyrath-act-5.webp', import.meta.url).href,
  6: new URL('../assets/maps/veyrath-act-6.webp', import.meta.url).href,
  7: new URL('../assets/maps/veyrath-act-7.webp', import.meta.url).href,
};

/** Keep established save IDs and branching roads while regrouping the journey into seven chapters. */
function chapterMap(act: number, source: number, ids?: string[]): ActMapData {
  const old = LEGACY_ACT_MAPS[source];
  const zones = Object.fromEntries(Object.entries(old.zones).filter(([id]) => !ids || ids.includes(id)));
  return {
    aspect: 1.5,
    image: ACT_IMAGES[act],
    zones,
    roads: Object.fromEntries(Object.entries(old.roads).filter(([key]) => key.split('>').every((id) => id in zones))),
    entries: old.entries.filter((entry) => entry.to in zones),
  };
}

export const ACT_MAPS: Record<number, ActMapData> = {
  1: chapterMap(1, 1),
  2: chapterMap(2, 2, ['cinderroad', 'saltflats', 'blackgrass', 'caravan']),
  3: chapterMap(3, 2, ['kurgans', 'plateau', 'pyretemple', 'burningthrone']),
  4: chapterMap(4, 3),
  5: chapterMap(5, 4),
  6: chapterMap(6, 5),
  7: chapterMap(7, 6),
};
ACT_MAPS[1].zones = { mudflats: [57, 88], brinecaves: [17, 88], ashwood: [47, 55], blackreed: [27, 27], crypt: [79, 50], shipgrave: [16, 18], stormcliffs: [88, 36], sanctum: [85, 16] };
ACT_MAPS[1].roads = {};
// Act 1: trace the painted shoreline, village approach, bridge and ridge paths explicitly.
// Journeys that return along the same road share its stroke, rather than making parallel shortcuts.
ACT_MAPS[1].traces = [
  { // Brinewick Shore to the cliff-path junction above the caves.
    d: 'M57 88 L55 86.5 L52 85 L49.5 82.5 L47 80.5 L44 79 L41 77.5 L38 76.5 L34 75.5 L30 75 L27 76',
    routes: ['mudflats>brinecaves'],
  },
  { // Cave approach stays on the cliff shelf, outside the harbour.
    d: 'M27 76 L29 77 L31 78 L32 80 L30 81.5 L27 82.5 L24 83 L21 84.5 L19 86 L17 88',
    routes: ['mudflats>brinecaves', 'brinecaves>ashwood'],
  },
  { // The village's eastern approach joins the coast to its northern road.
    d: 'M27 76 L29 73 L31 70.5 L32 68 L32 65.5 L30 63 L28.5 61',
    routes: ['brinecaves>ashwood'],
  },
  { // Follow the river-side track north to the woodland-road junction.
    d: 'M28.5 61 L28.5 58 L30 55.5 L33 53 L35 51 L37 50',
    routes: ['brinecaves>ashwood'],
  },
  { // One bridge crossing and one woodland road, reused by the later trips.
    d: 'M30 47 L32 47.5 L35 49 L37 50',
    routes: ['ashwood>blackreed', 'blackreed>crypt', 'crypt>shipgrave', 'shipgrave>stormcliffs'],
  },
  {
    d: 'M37 50 L40 49.5 L43 48 L46 47',
    routes: ['brinecaves>ashwood', 'ashwood>blackreed', 'blackreed>crypt', 'crypt>shipgrave', 'shipgrave>stormcliffs'],
  },
  { // Short footpath under the trees to the Ashwood clearing.
    d: 'M46 47 L45 49 L44.5 51 L45.5 53 L47 55',
    routes: ['brinecaves>ashwood', 'ashwood>blackreed'],
  },
  { // West of the bridge the track skirts the marsh, avoiding the river.
    d: 'M30 47 L27 47.5 L25 47 L23 45.5 L23 43.5 L21.5 41 L20 39 L18 37 L16.5 34 L17 31',
    routes: ['ashwood>blackreed', 'blackreed>crypt', 'crypt>shipgrave', 'shipgrave>stormcliffs'],
  },
  { // Reeds reached from their dry western edge.
    d: 'M17 31 L19.5 30 L22 29.5 L24.5 28 L27 27',
    routes: ['ashwood>blackreed', 'blackreed>crypt'],
  },
  { // The wreck beach branches from that same coastal track.
    d: 'M17 31 L15.5 29 L15 27 L16 25 L18 23 L19 21 L18 19.5 L16 18',
    routes: ['crypt>shipgrave', 'shipgrave>stormcliffs'],
  },
  { // Woodland road bends around the large trees toward the eastern ridge.
    d: 'M46 47 L48 45 L49 43 L52 41.5 L55 41 L58 41.5 L61 41 L63 40',
    routes: ['blackreed>crypt', 'crypt>shipgrave', 'shipgrave>stormcliffs'],
  },
  { // Descend the existing switchback to the burial ground entrance.
    d: 'M63 40 L63.5 42 L62.5 44 L61.5 46 L61.5 48 L63 50 L66 51 L70 51.5 L74 52 L77 52 L79 50',
    routes: ['blackreed>crypt', 'crypt>shipgrave'],
  },
  { // Climb the ridge track, meeting the cliff spur at a single junction.
    d: 'M63 40 L66 39 L68.5 37.5 L69.5 35 L71 33 L73.5 32 L75 30.5 L77 30',
    routes: ['shipgrave>stormcliffs'],
  },
  {
    d: 'M77 30 L79 31 L81 32.5 L83 33 L85 34 L88 36',
    routes: ['shipgrave>stormcliffs', 'stormcliffs>sanctum'],
  },
  { // Final climb follows the tower approach rather than cutting across the cliff.
    d: 'M77 30 L76 28 L76.5 26.5 L78.5 25 L80 23 L80.5 21 L82 19 L84 18 L85 16',
    routes: ['stormcliffs>sanctum'],
  },
];
ACT_MAPS[2].zones = { cinderroad: [12, 83], saltflats: [25, 70], tithefields: [17, 46], fortobedience: [35, 48], blackgrass: [49, 62], bannerfield: [58, 39], assizes: [74, 45], caravan: [85, 20] };
ACT_MAPS[2].roads = {};
ACT_MAPS[2].entries = [{ from: 'sanctum', to: 'cinderroad', at: [4, 92] }];
ACT_MAPS[3].zones = { kurgans: [12, 83], lowercity: [31, 77], dryaqueduct: [47, 64], plateau: [20, 28], wreckline: [40, 33], cinderkey: [57, 48], pyretemple: [74, 22], burningthrone: [82, 64] };
ACT_MAPS[3].roads = {};
ACT_MAPS[3].entries = [{ from: 'caravan', to: 'kurgans', at: [4, 83] }];
ACT_MAPS[4].zones = { pilgrimgate: [16, 79], almsquarter: [24, 30], scourgeyard: [31, 69], reliquary: [49, 19], bellfoundry: [53, 48], inquisition: [65, 25], penitentstair: [60, 69], choirloft: [81, 77], saintswalk: [79, 44], highaltar: [81, 24] };
ACT_MAPS[5].zones = { hollowpass: [18, 77], screefields: [31, 62], howlingfells: [29, 85], glasslake: [43, 19], bonequarry: [46, 74], icevault: [20, 34], mammothroad: [62, 62], hangingglacier: [28, 16], steading: [72, 54], longhall: [69, 34], kingsstair: [65, 20], giantsthrone: [81, 22] };
ACT_MAPS[6].zones = { blackharbor: [20, 71], squallbanks: [43, 51], lampgulf: [31, 25], drownedfleet: [53, 58], brimstone: [70, 54], hollowreef: [52, 78], thunderhead: [70, 37], leviathanrib: [84, 40], blackcurrent: [59, 26], voicetrench: [60, 13], lightless: [78, 17], maelstrom: [82, 66] };
ACT_MAPS[7].zones = { exilesgate: [12, 86], kingsroad: [20, 77], kingsmint: [61, 67], hanginggardens: [44, 42], burnedarchive: [16, 40], longfracture: [51, 29], driftingquarter: [35, 16], kingsreach: [65, 37], sunderedhall: [67, 54], hallofcrowns: [81, 58], ninthstair: [72, 17], shatteredthrone: [86, 25] };
// Old illustration bends belong to the previous paintings, not the new regional plates.
for (const act of [4, 5, 6, 7]) ACT_MAPS[act].roads = {};
for (const act of [2, 3, 4, 5, 6, 7]) {
  ACT_MAPS[act].traces = CHAPTER_TRACES[act];
  ACT_MAPS[act].entries = CHAPTER_ENTRIES[act];
}

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

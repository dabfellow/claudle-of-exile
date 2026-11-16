import type { MapPoint } from './campaignMap';

/** Hand-traced on the 1536 × 1024 painting, following the owner's route sketch.
 * These are illustration coordinates, not progression prerequisites. Shared endpoints
 * form actual forks: never draw a second return lane beside the same road.
 */
export const WORLD_MAP_SIZE: MapPoint = [1536, 1024];

export const WORLD_ROAD_NODES: Record<string, MapPoint> = {
  coastStart: [50, 330],
  coastFork: [170, 557],
  cryptJoin: [211, 666],
  marshExit: [408, 728],
  villageFork: [696, 880],
  banditCamp: [600, 836],
  bridgeFork: [839, 837],
  cityGate: [927, 852],
  caravanFork: [599, 686],
  caravanEastFork: [679, 708],
  coastalLookout: [809, 690],
  plateauLookout: [548, 718],
  plainsFork: [425, 393],
  hillRuin: [403, 232],
  quarryFork: [517, 374],
  summitTemple: [757, 80],
  riverFork: [689, 360],
  lakeFork: [749, 343],
  lakeShore: [705, 297],
  harbourFork: [792, 481],
  harbour: [910, 437],
  seaApproach: [836, 524],
  capitalGate: [1175, 321],
  goldDistrict: [1338, 160],
  drownedFleet: [941, 575],
  brimstoneIsle: [1268, 509],
  leviathanRib: [1071, 626],
  maelstrom: [1388, 675],
};

export interface WorldRoad {
  from: string;
  to: string;
  via: MapPoint[];
}

export const WORLD_ROADS: WorldRoad[] = [
  {
    from: 'coastStart', to: 'coastFork',
    via: [[57, 321], [67, 312], [95, 302], [132, 295], [173, 289], [215, 285],
      [233, 286], [241, 291], [245, 302], [245, 318], [252, 331], [270, 348],
      [280, 363], [285, 379], [284, 389], [278, 394], [248, 408], [229, 429],
      [205, 441], [184, 456], [164, 477], [155, 500], [154, 522], [161, 542]],
  },
  {
    from: 'coastFork', to: 'cryptJoin',
    via: [[173, 568], [163, 579], [140, 585], [129, 594], [125, 607],
      [130, 626], [145, 646], [171, 659]],
  },
  {
    // The other side of the crypt approach rejoins the same road, rather than running back beside it.
    from: 'coastFork', to: 'cryptJoin',
    via: [[192, 572], [216, 578], [259, 581], [292, 582], [323, 591],
      [344, 605], [351, 622], [349, 636], [335, 647], [315, 654], [281, 659], [244, 664]],
  },
  {
    from: 'cryptJoin', to: 'marshExit',
    via: [[203, 679], [198, 694], [207, 708], [228, 718], [260, 726],
      [300, 736], [334, 742], [375, 740], [395, 734]],
  },
  {
    from: 'marshExit', to: 'villageFork',
    via: [[422, 741], [430, 751], [426, 764], [410, 775], [401, 792],
      [399, 817], [394, 835], [407, 847], [432, 862], [453, 885], [469, 901],
      [506, 914], [537, 930], [556, 947], [581, 958], [607, 961], [637, 956],
      [667, 945], [687, 930], [697, 910], [702, 894]],
  },
  {
    from: 'banditCamp', to: 'villageFork',
    via: [[620, 842], [644, 851], [668, 862], [685, 873]],
  },
  {
    from: 'villageFork', to: 'bridgeFork',
    via: [[700, 873], [711, 865], [738, 854], [779, 847], [809, 841]],
  },
  {
    from: 'bridgeFork', to: 'cityGate',
    via: [[864, 833], [885, 834], [908, 842]],
  },
  {
    from: 'caravanFork', to: 'caravanEastFork',
    via: [[615, 691], [632, 697], [652, 701]],
  },
  {
    from: 'caravanEastFork', to: 'bridgeFork',
    via: [[696, 719], [706, 738], [728, 751], [745, 772], [767, 787],
      [788, 797], [815, 815]],
  },
  {
    from: 'caravanEastFork', to: 'coastalLookout',
    via: [[687, 703], [696, 695], [706, 695], [716, 697], [729, 691],
      [751, 695], [769, 698], [781, 690], [795, 692]],
  },
  {
    from: 'caravanFork', to: 'plateauLookout',
    via: [[585, 695], [574, 699], [563, 711], [548, 714]],
  },
  {
    from: 'plainsFork', to: 'caravanFork',
    via: [[414, 406], [400, 422], [390, 435], [384, 452], [385, 467],
      [402, 475], [428, 481], [458, 485], [490, 486], [523, 486], [561, 488],
      [598, 491], [625, 495], [650, 500], [674, 509], [694, 514], [707, 521],
      [712, 531], [705, 541], [681, 545], [651, 545], [618, 541], [588, 537],
      [560, 536], [544, 540], [532, 546], [528, 557], [532, 568], [544, 579],
      [563, 590], [583, 603], [591, 615], [585, 621], [560, 622], [541, 624],
      [526, 631], [523, 641], [534, 654], [547, 666], [571, 677]],
  },
  {
    from: 'plainsFork', to: 'hillRuin',
    via: [[435, 380], [440, 368], [440, 359], [435, 352], [426, 341],
      [410, 332], [387, 320], [366, 312], [359, 306], [362, 296], [374, 285],
      [391, 277], [413, 269], [429, 264], [430, 256], [423, 246]],
  },
  {
    from: 'plainsFork', to: 'quarryFork',
    via: [[444, 384], [469, 378], [496, 375]],
  },
  {
    from: 'quarryFork', to: 'riverFork',
    via: [[542, 369], [562, 365], [584, 365], [598, 364], [611, 360],
      [637, 360], [659, 360]],
  },
  {
    from: 'quarryFork', to: 'summitTemple',
    via: [[536, 361], [551, 347], [561, 332], [565, 315], [571, 301],
      [571, 287], [584, 279], [606, 272], [630, 269], [649, 262], [662, 255],
      [663, 244], [662, 234], [668, 225], [685, 216], [705, 208], [725, 202],
      [730, 196], [728, 186], [724, 179], [733, 169], [754, 159], [766, 146],
      [768, 140], [760, 128], [757, 117], [763, 110], [761, 94]],
  },
  {
    from: 'riverFork', to: 'lakeFork',
    via: [[706, 356], [730, 350]],
  },
  {
    from: 'lakeFork', to: 'lakeShore',
    via: [[735, 345], [727, 341], [727, 325], [727, 315], [719, 306]],
  },
  {
    from: 'riverFork', to: 'harbourFork',
    via: [[695, 368], [698, 376], [717, 390], [735, 403], [751, 406],
      [770, 417], [782, 434], [786, 449], [786, 469]],
  },
  {
    from: 'harbourFork', to: 'harbour',
    via: [[806, 463], [823, 454], [842, 448], [860, 441], [880, 436], [898, 440]],
  },
  {
    from: 'harbourFork', to: 'seaApproach',
    via: [[807, 493], [821, 505]],
  },
  {
    from: 'lakeFork', to: 'capitalGate',
    via: [[762, 339], [775, 335], [799, 328], [825, 324], [844, 326],
      [863, 318], [887, 313], [912, 310], [939, 312], [963, 310], [978, 300],
      [994, 292], [1012, 300], [1033, 310], [1062, 315], [1095, 319],
      [1127, 317], [1153, 319]],
  },
  {
    from: 'capitalGate', to: 'goldDistrict',
    via: [[1187, 310], [1194, 295], [1207, 280], [1211, 271], [1205, 264],
      [1187, 261], [1171, 256], [1178, 244], [1193, 229], [1214, 219],
      [1235, 212], [1228, 206], [1208, 200], [1189, 198], [1206, 188],
      [1224, 179], [1242, 177], [1272, 180], [1291, 181], [1309, 187],
      [1332, 199], [1347, 196], [1357, 190], [1352, 182], [1342, 174], [1337, 167]],
  },
];

/** Sailing lanes use the open water between the painted landmarks. */
export const WORLD_SEA_ROUTES: WorldRoad[] = [
  { from: 'harbour', to: 'drownedFleet', via: [[933, 448], [952, 465], [977, 488], [990, 514], [980, 539], [959, 558]] },
  { from: 'seaApproach', to: 'drownedFleet', via: [[860, 531], [884, 543], [912, 560]] },
  { from: 'drownedFleet', to: 'brimstoneIsle', via: [[972, 553], [1005, 531], [1047, 515], [1094, 501], [1146, 492], [1198, 492], [1236, 498]] },
  { from: 'drownedFleet', to: 'leviathanRib', via: [[964, 597], [991, 614], [1026, 624], [1050, 627]] },
  { from: 'leviathanRib', to: 'maelstrom', via: [[1092, 645], [1126, 662], [1175, 675], [1230, 687], [1286, 693], [1338, 690], [1370, 682]] },
];

export const WORLD_SEA_STOPS = ['drownedFleet', 'brimstoneIsle', 'leviathanRib', 'maelstrom'] as const;

/** Straight interpolation preserves the traced pixels; spline smoothing can cut corners off the road. */
export function worldRoadPath(road: WorldRoad): string {
  const points = [WORLD_ROAD_NODES[road.from], ...road.via, WORLD_ROAD_NODES[road.to]];
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
}

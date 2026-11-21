export type FishMove = 'rest' | 'left' | 'right' | 'dive';
export type FishingBait = 'worm' | 'lure' | 'chum';
export type FishingRig = 'balanced' | 'flexible' | 'heavy' | 'tideglass';
export type FishingBoat = 'skiff' | 'cutter' | 'trawler';

export const BOATS = {
  skiff: { name: 'Battered Skiff', hull: 4, level: 1 },
  cutter: { name: 'Saltmere Cutter', hull: 5, level: 3 },
  trawler: { name: 'Storm Trawler', hull: 6, level: 5 },
} satisfies Record<FishingBoat, { name: string; hull: number; level: number }>;

export const LINES = {
  braided: { name: 'Braided line', tension: 1, pull: 1, level: 0 },
  elastic: { name: 'Elastic line', tension: .83, pull: .92, level: 1 },
  wire: { name: 'Steel leader', tension: 1.15, pull: 1.22, level: 2 },
};

export const REELS = {
  hand: { name: 'Hand reel', speed: 1, level: 0 },
  geared: { name: 'Geared reel', speed: 1.15, level: 2 },
};

export type FishingLine = keyof typeof LINES;
export type FishingReel = keyof typeof REELS;

export const BAITS = {
  worm: 'Sandworm', lure: 'Flash Lure', chum: 'Storm Chum',
} satisfies Record<FishingBait, string>;

export const RIGS = {
  balanced: { name: 'Dock Rod', tip: 'An even rod for any water.', tension: 1, pull: 1 },
  flexible: { name: 'Willow Rod', tip: 'A flexible rod that softens sideways runs.', tension: 0.72, pull: 0.88 },
  heavy: { name: 'Wreck Winch', tip: 'A stiff rod that hauls harder during deep dives.', tension: 1.12, pull: 1.38 },
  tideglass: { name: 'Tideglass Rig', tip: 'Absorbs runs and pulls harder. Its reel saves you from two snaps per fish.', tension: 0.68, pull: 1.55 },
} satisfies Record<FishingRig, { name: string; tip: string; tension: number; pull: number }>;

interface Fish {
  name: string;
  pattern: readonly FishMove[];
  strength: number;
  value: number;
}

interface Water {
  name: string;
  deep: boolean;
  fish: Fish;
  alternate: Fish;
  legend: Fish & { final: readonly FishMove[]; bait: FishingBait; rumor: string; prize: string };
}

export const FISHING_WATERS: readonly Water[] = [
  {
    name: 'Mudflat Shallows', deep: false,
    fish: { name: 'Mudskipper', pattern: ['rest', 'left', 'rest'], strength: 0.65, value: 4 },
    alternate: { name: 'Copper Flounder', pattern: ['right', 'rest', 'left'], strength: 0.85, value: 6 },
    legend: { name: 'Old Boot', pattern: ['left', 'rest', 'right'], final: ['right', 'left', 'dive', 'rest'], strength: 1.1, value: 15, bait: 'worm', rumor: 'A sandworm past the second shoal draws the oldest thief in the mud.', prize: 'Breakwater Reel · Automatically saves the first snap in every fight.' },
  },
  {
    name: 'Brinecave Pool', deep: false,
    fish: { name: 'Blind Brinefish', pattern: ['dive', 'rest', 'dive'], strength: 0.9, value: 6 },
    alternate: { name: 'Cave Lantern', pattern: ['dive', 'right', 'rest'], strength: 1, value: 8 },
    legend: { name: 'The Blind Bell', pattern: ['dive', 'rest', 'left'], final: ['dive', 'dive', 'right', 'rest'], strength: 1.25, value: 22, bait: 'lure', rumor: 'Flash a lure at the mouth of the innermost cave. Listen for a bell.', prize: 'Ironwood Keel · Every ship starts with two extra hull.' },
  },
  {
    name: 'Blackreed Creek', deep: true,
    fish: { name: 'Reed Eel', pattern: ['left', 'right', 'rest'], strength: 1, value: 8 },
    alternate: { name: 'Glass Pike', pattern: ['right', 'left', 'dive', 'rest'], strength: 1.1, value: 11 },
    legend: { name: 'The Reed Crown', pattern: ['left', 'right', 'rest'], final: ['right', 'left', 'right', 'dive', 'rest'], strength: 1.35, value: 30, bait: 'worm', rumor: 'The crown moves at dusk. Take a sandworm beyond the last reeds.', prize: 'Crownfire Feast · A formidable combat meal from the smokehouse.' },
  },
  {
    name: 'Shipgrave Wreck', deep: true,
    fish: { name: 'Drowned Grouper', pattern: ['dive', 'left', 'rest'], strength: 1.12, value: 11 },
    alternate: { name: 'Keeljaw', pattern: ['dive', 'dive', 'right', 'rest'], strength: 1.22, value: 14 },
    legend: { name: 'The Anchor That Swam', pattern: ['dive', 'right', 'dive', 'rest'], final: ['left', 'dive', 'right', 'dive', 'rest'], strength: 1.5, value: 38, bait: 'chum', rumor: 'The lowest hull stirs at dusk. It remembers the smell of storm chum.', prize: 'Tideglass Rig · Absorbs sharp runs, hauls faster and catches two snaps.' },
  },
  {
    name: 'Stormcliff Surf', deep: true,
    fish: { name: 'Thunder Marlin', pattern: ['right', 'dive', 'left', 'rest'], strength: 1.25, value: 15 },
    alternate: { name: 'Squall Ray', pattern: ['left', 'dive', 'right', 'dive', 'rest'], strength: 1.32, value: 18 },
    legend: { name: 'The Tide Below Thunder', pattern: ['left', 'right', 'dive', 'rest'], final: ['dive', 'right', 'left', 'dive', 'dive', 'rest'], strength: 1.65, value: 55, bait: 'chum', rumor: 'Follow the lightning to the outermost water at dusk and cast storm chum.', prize: 'Bottomless Tide · A utility flask that refills itself during combat.' },
  },
];

export const FISHING_FLASK = 'u_flask_bottomless_tide';
export const FISHING_MEAL = 'meal_crownfire';

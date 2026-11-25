// Alchemy lab art. Sources and licences are in src/assets/CREDITS.md ("Alchemy lab").

export type BrewColor = 'red' | 'blue' | 'green' | 'orange' | 'yellow' | 'purple' | 'grey' | 'clear';

const url = (file: string) => new URL(`../assets/alchemy/${file}`, import.meta.url).href;

export const LAB_BACKDROP = url('lab-teniers.webp');

const BOTTLE: Record<BrewColor, string> = {
  red: url('bottle-red.png'),
  blue: url('bottle-blue.png'),
  green: url('bottle-green.png'),
  orange: url('bottle-orange.png'),
  yellow: url('bottle-yellow.png'),
  purple: url('bottle-purple.png'),
  grey: url('bottle-grey.png'),
  clear: url('bottle-clear.png'),
};

const TUBE: Record<BrewColor, string> = {
  red: url('tube-red.png'),
  blue: url('tube-blue.png'),
  green: url('tube-green.png'),
  orange: url('tube-orange.png'),
  yellow: url('tube-yellow.png'),
  purple: url('tube-purple.png'),
  grey: url('tube-dark.png'),
  clear: url('tube-white.png'),
};

const CAULDRON = {
  empty: url('cauldron-empty.png'),
  red: url('cauldron-red.png'),
  blue: url('cauldron-blue.png'),
  green: url('cauldron-green.png'),
  orange: url('cauldron-orange.png'),
  purple: url('cauldron-purple.png'),
};

/** The liquid colour used for each infusion's vial and cauldron. */
const INFUSION_COLOR: Record<string, BrewColor> = {
  cleansing: 'green',
  instant: 'red',
  frostguard: 'blue',
  onslaught: 'orange',
  kindled: 'orange',
  phasing: 'purple',
  clarity: 'clear',
  barbed: 'green',
  starlit: 'yellow',
  lingering: 'grey',
  last_breath: 'red',
  overflow: 'blue',
  echo: 'purple',
  starfall: 'yellow',
  evergreen: 'green',
  prism: 'clear',
};

/** Flask recipes by kind, so the cauldron matches what's brewing. */
export function recipeColor(flaskId?: string, color?: string): BrewColor {
  if (flaskId?.startsWith('life')) return 'red';
  if (flaskId?.startsWith('mana')) return 'blue';
  if (flaskId === 'amethyst') return 'purple';
  if (flaskId === 'sulphur') return 'yellow';
  if (flaskId === 'ruby') return 'red';
  if (flaskId === 'quicksilver' || flaskId === 'diamond' || flaskId === 'granite') return 'clear';
  if (color) return hexToBrew(color);
  return 'green';
}

function hexToBrew(hex: string): BrewColor {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max - min < 40) return max > 160 ? 'clear' : 'grey';
  if (max === r) return g > 150 ? (g > 190 ? 'yellow' : 'orange') : b > 150 ? 'purple' : 'red';
  if (max === g) return 'green';
  return r > 130 ? 'purple' : 'blue';
}

export const infusionColor = (id: string): BrewColor => INFUSION_COLOR[id] ?? 'green';
export const bottleArt = (c: BrewColor) => BOTTLE[c];
export const tubeArt = (c: BrewColor) => TUBE[c];
export function cauldronArt(c: BrewColor | null): string {
  if (!c) return CAULDRON.empty;
  if (c === 'yellow') return CAULDRON.orange;
  if (c === 'grey' || c === 'clear') return CAULDRON.blue;
  return CAULDRON[c];
}

/** CSS colour for glows and steam over the cauldron. */
export const BREW_GLOW: Record<BrewColor, string> = {
  red: '#e0584f',
  blue: '#5aa8f0',
  green: '#9be564',
  orange: '#f0a050',
  yellow: '#f0d050',
  purple: '#a77bf0',
  grey: '#b8b8c0',
  clear: '#cfe8ff',
};

/**
 * Archaeology: Deciphering the lost peoples (docs/ARCHAEOLOGY_DECIPHERING.md).
 * Every culture wrote in its own script. Digs turn up inscriptions; the player works out what the glyphs mean,
 * and each translated inscription moves that people's story on a chapter.
 */

export type ScriptId = 'giant' | 'surveyor' | 'rime' | 'first';
export type GlyphStyle = 'blocky' | 'ruled' | 'frost' | 'nested';

export interface ScriptDef {
  id: ScriptId;
  name: string;
  /** glyphs in the script */
  glyphs: number;
  /** glyphs in one inscription */
  length: number;
  /** picture hints shown with each inscription, before codex perks */
  hints: number;
  /** story chapters, not counting the secret one */
  chapters: number;
  /** Ancient Data for each translated inscription */
  data: number;
  style: GlyphStyle;
  color: string;
  /** the dig sites whose finds are written in it */
  sites: string[];
}

export const SCRIPTS: ScriptDef[] = [
  { id: 'giant', name: 'Giants', glyphs: 12, length: 3, hints: 2, chapters: 5, data: 5, style: 'blocky', color: '#c9b58a', sites: ['dig_cairn', 'dig_colossus'] },
  { id: 'surveyor', name: 'Surveyors', glyphs: 16, length: 4, hints: 2, chapters: 6, data: 8, style: 'ruled', color: '#d0a040', sites: ['dig_cutting', 'dig_adit'] },
  { id: 'rime', name: 'Rimebound', glyphs: 20, length: 5, hints: 3, chapters: 7, data: 12, style: 'frost', color: '#8fd0e8', sites: ['dig_barrow', 'dig_heart'] },
  { id: 'first', name: 'First Script', glyphs: 24, length: 6, hints: 3, chapters: 8, data: 20, style: 'nested', color: '#e0b25c', sites: ['dig_reliquary'] },
];

export const SCRIPT_IDS: ScriptId[] = SCRIPTS.map((x) => x.id);
/** The three scripts the First Script grew out of. */
export const EARLY_SCRIPTS: ScriptId[] = ['giant', 'surveyor', 'rime'];

export function scriptDef(id: string): ScriptDef {
  const d = SCRIPTS.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown script ${id}`);
  return d;
}

/** The script a dig site's inscriptions are written in. */
export function scriptOfSite(siteId: string): ScriptId {
  return SCRIPTS.find((x) => x.sites.includes(siteId))?.id ?? 'giant';
}

export function glyphIds(script: ScriptId): string[] {
  return Array.from({ length: scriptDef(script).glyphs }, (_, i) => `g${i}`);
}

// ---------- meanings ----------

export interface MeaningDef {
  id: string;
  name: string;
  /** the picture hint */
  icon: string;
}

export const MEANINGS: MeaningDef[] = [
  { id: 'sun', name: 'Sun', icon: '☀️' },
  { id: 'moon', name: 'Moon', icon: '🌙' },
  { id: 'king', name: 'King', icon: '🤴' },
  { id: 'river', name: 'River', icon: '🏞️' },
  { id: 'stone', name: 'Stone', icon: '🪨' },
  { id: 'fire', name: 'Fire', icon: '🔥' },
  { id: 'ice', name: 'Ice', icon: '🧊' },
  { id: 'death', name: 'Death', icon: '💀' },
  { id: 'war', name: 'War', icon: '⚔️' },
  { id: 'giant', name: 'Giant', icon: '🗿' },
  { id: 'home', name: 'Home', icon: '🏠' },
  { id: 'road', name: 'Road', icon: '🛤️' },
  { id: 'gold', name: 'Gold', icon: '🪙' },
  { id: 'star', name: 'Star', icon: '⭐' },
  { id: 'beast', name: 'Beast', icon: '🐺' },
  { id: 'tree', name: 'Tree', icon: '🌲' },
  { id: 'sea', name: 'Sea', icon: '🌊' },
  { id: 'crown', name: 'Crown', icon: '👑' },
  { id: 'blood', name: 'Blood', icon: '🩸' },
  { id: 'bone', name: 'Bone', icon: '🦴' },
  { id: 'wind', name: 'Wind', icon: '🌬️' },
  { id: 'mountain', name: 'Mountain', icon: '⛰️' },
  { id: 'gate', name: 'Gate', icon: '🚪' },
  { id: 'oath', name: 'Oath', icon: '🤝' },
];

export function meaningDef(id: string): MeaningDef {
  return MEANINGS.find((m) => m.id === id) ?? { id, name: id, icon: '?' };
}

// ---------- tuning ----------

/** Chance a dig turns up an inscription, and how much a hidden chamber multiplies it. */
export const INSCRIPTION_CHANCE = 0.04;
export const CHAMBER_INSCRIPTION_MULT = 2;
/** Evidence that makes a glyph reveal itself, and the lowest the codex can bring that. */
export const REVEAL_EVIDENCE = 12;
export const REVEAL_MIN = 4;
/** Untranslated inscriptions kept. */
export const INSCRIPTION_CAP = 200;
/** An uncracked glyph is this many times as likely to be on a new inscription as a cracked one. */
export const UNCRACKED_WEIGHT = 3;
/** Rosetta stones: chance a dig finds one, at which sites, and what one does. */
export const ROSETTA_CHANCE = 1 / 5000;
export const ROSETTA_SITES = ['dig_adit', 'dig_heart', 'dig_reliquary'];
export const ROSETTA_GLYPHS = 3;
export const ROSETTA_MIN_CHAPTER = 3;
export const SECRET_DATA = 250;
/** Chapters a people must finish before the First Script's inscriptions begin to appear. */
export const FIRST_SCRIPT_GATE = 4;
/** The title the First Script's last chapter gives. */
export const FIRST_TITLE = 'Reader of the First Script';

/** Chapter `n` (1-based) needs this many translated inscriptions since the last chapter. */
export function chapterNeed(n: number): number {
  return 3 + n;
}

// ---------- chapters ----------

export type ChapterReward =
  | { kind: 'data'; amount: number }
  | { kind: 'passport'; site: string }
  | { kind: 'chamber'; site: string }
  | { kind: 'stock' }
  | { kind: 'forms'; forms: string[]; title?: string };

export interface ChapterDef {
  n: number;
  title: string;
  lore: string[];
  reward: ChapterReward;
}

const ch = (n: number, title: string, reward: ChapterReward, ...lore: string[]): ChapterDef => ({ n, title, lore, reward });
const data = (amount: number): ChapterReward => ({ kind: 'data', amount });
const passport = (site: string): ChapterReward => ({ kind: 'passport', site });
const chamber = (site: string): ChapterReward => ({ kind: 'chamber', site });
const stock: ChapterReward = { kind: 'stock' };

export const CHAPTERS: Record<ScriptId, ChapterDef[]> = {
  giant: [
    ch(1, 'The Tally', data(50), 'The giants counted everything in notches on bone.', 'The first rows are only kills, and they are very proud of every one.'),
    ch(2, 'The Small Folk', passport('dig_cutting'), 'They call us the small ones, and they do not mean it unkindly.', 'A road is cut north, towards a glacier where the small folk came to measure.'),
    ch(3, 'A Grave for a King', chamber('dig_cairn'), 'The Cairn was one king\'s grave, and he asked to be buried small.', 'Below the stones there is a room he did not ask for.'),
    ch(4, 'The Spine of the World', passport('dig_adit'), 'A giant lay down to die and the ridge grew over him.', 'The Survey dug at the dead and found something that was not a bone. A tunnel is marked.'),
    ch(5, 'What the Giants Kept', { kind: 'forms', forms: ['small_kings_bulwark', 'crown_of_the_cairn'] }, 'They kept a shield for a king and a crown for his child.', 'Neither was ever meant to be worn by anyone who could still be hurt.'),
  ],
  surveyor: [
    ch(1, 'The Field Ledger', stock, 'The Survey wrote down what it found, in the same hand every day.', 'The merchants of the Survey remember the hand. They open a better shelf for those who can read it.'),
    ch(2, 'Cold Measures', passport('dig_barrow'), 'A mountain\'s worth is its ore, minus the cost of the cold.', 'The cold had a price the Survey had not counted. A barrow lies to the west.'),
    ch(3, 'The Straight Cut', chamber('dig_cutting'), 'The Cutting was meant to be a road.', 'The surveyor who drew it left a store of papers behind a false wall.'),
    ch(4, 'Orders Withdrawn', passport('dig_heart'), 'A rider came with an order to withdraw. Half the Survey left.', 'The other half followed the ice down towards the Hollow Heart.'),
    ch(5, 'A Different Hand', data(200), 'The ledgers change hands near the end.', 'The new hand writes in a tongue the Survey never taught.'),
    ch(6, 'The Last Entry', { kind: 'forms', forms: ['last_survey_aegis', 'surveyor_generals_regalia'] }, 'The final line is not a measurement. It is a name, and the order to forget it.', 'Aegis and regalia were struck for the one who kept it.'),
  ],
  rime: [
    ch(1, 'The Offering', stock, 'The Rimebound gave their dead to the ice and took small idols in return.', 'Their trader keeps a shelf of idols for anyone who can say what they are.'),
    ch(2, 'Gifts to the Ice', passport('dig_colossus'), 'The ice keeps its side of every bargain, forever.', 'One bargain was struck with a giant, and the ridge still carries the rib marks.'),
    ch(3, 'The Face Below', chamber('dig_barrow'), 'Every barrow has a face under it, looking up.', 'One of them is a door.'),
    ch(4, 'Three Locks', passport('dig_reliquary'), 'Three peoples feared the same thing and agreed on nothing else.', 'Each cut a lock in their own hand. The Rimebound cut the last.'),
    ch(5, 'The Oath of Winter', data(300), 'To break your word is to be given back to the ice.', 'The oath is older than the Rimebound. They only learned to say it.'),
    ch(6, 'What the Ice Was For', data(300), 'The peaks were hollowed out to hide one thing.', 'The ice was brought to keep it cold, and to keep it company.'),
    ch(7, 'The Last Winter', { kind: 'forms', forms: ['rimebound_oathmail', 'face_in_the_ice'] }, 'The last winter was the one they chose.', 'They left a mail coat and a face, in case anyone came to ask.'),
  ],
  first: [
    ch(1, 'Mother Tongue', data(300), 'Every script you have read grew out of this one.', 'It is plainer than they were, and more afraid.'),
    ch(2, 'Roots', data(300), 'Giants took the shapes, the Survey took the lines and the Rimebound took the curls.', 'Nobody took the meaning.'),
    ch(3, 'The Sealed Door', chamber('dig_reliquary'), 'The door has three locks and a fourth thing no one mentions.', 'Behind the door there is a second door.'),
    ch(4, 'Three Hands', data(500), 'Three peoples carved their lock in the same hour.', 'Their carvers each wrote the same short sentence, in their own hand.'),
    ch(5, 'The Shared Fear', data(400), 'The fear was not of death. It was of being remembered wrongly.', 'So they wrote it down, in a script no one else would learn.'),
    ch(6, 'The Thing Beneath', data(400), 'It was not a monster. It was an answer.', 'They buried it because the question had been a mistake.'),
    ch(7, 'Why They Agreed', data(400), 'The giants asked for nothing and the Survey asked for nothing and the Rimebound asked for nothing.', 'For once that was enough.'),
    ch(8, 'The First Word', { kind: 'forms', forms: ['heart_of_the_peaks'], title: FIRST_TITLE }, 'The first word is a name, and it is yours.', 'Whoever reads this was always going to be the one who did.'),
  ],
};

export interface SecretChapter {
  title: string;
  lore: string[];
}

/** Opened once per culture by a Rosetta stone: a lore page, 250 Ancient Data and a glow on that people's relics. */
export const SECRET_CHAPTERS: Record<ScriptId, SecretChapter> = {
  giant: { title: 'The Giant Who Stood Up', lore: ['One giant refused to lie down, and the ridge was built around him.', 'He is still standing, in the rib-cage of the colossus, and he is listening.'] },
  surveyor: { title: 'The Survey That Was Never Sent', lore: ['A report went north that was never read. It said the mountains were not worth mining.', 'It was true, and the Empire could not afford it.'] },
  rime: { title: 'The Song Under the Ice', lore: ['The Rimebound had a song they were forbidden to sing above ground.', 'The words are the same three, repeated. The Rosetta stone says what they are.'] },
  first: { title: 'The Fourth Lock', lore: ['The reliquary has a fourth lock, and no one carved it.', 'It was opened from the inside, before the door was ever shut.'] },
};

export function chapterDef(script: ScriptId, n: number): ChapterDef | undefined {
  return CHAPTERS[script].find((c) => c.n === n);
}

/** Which script and chapter hands out a site's Expedition Passport, if any. */
export function passportChapter(siteId: string): { script: ScriptId; n: number } | null {
  for (const script of SCRIPT_IDS) {
    const c = CHAPTERS[script].find((x) => x.reward.kind === 'passport' && x.reward.site === siteId);
    if (c) return { script, n: c.n };
  }
  return null;
}

/** The chapter that unlocks a relic form, if any. */
export function formChapter(formId: string): { script: ScriptId; n: number } | null {
  for (const script of SCRIPT_IDS) {
    const c = CHAPTERS[script].find((x) => x.reward.kind === 'forms' && x.reward.forms.includes(formId));
    if (c) return { script, n: c.n };
  }
  return null;
}

// ---------- the codex ----------

export interface CodexTier {
  share: number;
  text: string;
}

/** Every 25% of a script's glyphs cracked gives a perk; perks stack across scripts. */
export const CODEX_TIERS: CodexTier[] = [
  { share: 0.25, text: '+5% dig speed' },
  { share: 0.5, text: '+1 picture hint on this script\'s inscriptions' },
  { share: 0.75, text: '1 fewer fragile crack when brushing' },
  { share: 1, text: 'Glyphs reveal themselves 2 evidence sooner, for every culture' },
];
export const CODEX_DIG_SPEED = 5;
export const CODEX_REVEAL_CUT = 2;

// ---------- glyph shapes ----------

/** A small deterministic generator, so a script's glyph drawings never change. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const popcount = (n: number): number => {
  let c = 0;
  for (let x = n; x; x >>= 1) c += x & 1;
  return c;
};

/** How many drawable features each style picks from, and how many it draws at a time. */
const FEATURES: Record<GlyphStyle, { count: number; min: number; max: number }> = {
  blocky: { count: 9, min: 3, max: 5 },
  ruled: { count: 12, min: 3, max: 5 },
  frost: { count: 8, min: 3, max: 4 },
  nested: { count: 9, min: 2, max: 3 },
};

const maskCache = new Map<GlyphStyle, number[]>();

/**
 * One feature mask per glyph, each different: the shapes are drawn from the mask by the glyph component.
 * Nested glyphs use three levels of three shapes each, so their 9 features are 3 groups of 3 (at most one per group).
 */
export function glyphMasks(style: GlyphStyle): number[] {
  const hit = maskCache.get(style);
  if (hit) return hit;
  const { count, min, max } = FEATURES[style];
  const all: number[] = [];
  for (let m = 1; m < 1 << count; m++) {
    const c = popcount(m);
    if (c < min || c > max) continue;
    if (style === 'nested') {
      // at most one shape per level: bits 0-2 level 0, 3-5 level 1, 6-8 level 2
      const levels = [m & 7, (m >> 3) & 7, (m >> 6) & 7];
      if (levels.some((l) => popcount(l) > 1)) continue;
    }
    all.push(m);
  }
  const rnd = mulberry(style.length * 7919 + count * 31);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  maskCache.set(style, all);
  return all;
}

export function glyphMask(script: ScriptId, glyph: string): number {
  const masks = glyphMasks(scriptDef(script).style);
  return masks[Number(glyph.slice(1)) % masks.length];
}

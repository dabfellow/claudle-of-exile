import {
  CHAMBER_INSCRIPTION_MULT, CHAPTERS, chapterDef, chapterNeed, CODEX_DIG_SPEED, CODEX_REVEAL_CUT, EARLY_SCRIPTS, FIRST_SCRIPT_GATE, glyphIds, INSCRIPTION_CAP, INSCRIPTION_CHANCE,
  MEANINGS, passportChapter, REVEAL_EVIDENCE, REVEAL_MIN, ROSETTA_GLYPHS, ROSETTA_MIN_CHAPTER, scriptDef, SCRIPT_IDS, SCRIPTS, SECRET_DATA, UNCRACKED_WEIGHT,
  type ChapterReward, type ScriptId,
} from '../data/deciphering';
import { ANCIENT_DATA, ROSETTA_STONE, SEALED_RELIC, TRAIL } from '../data/expedition';
import { RELIC_FORMS } from '../data/relics';
import { addBank, hasItem, payCost } from './bank';
import type { Ctx } from './context';
import { pickWeighted, seeded, type Rng } from './rng';
import type { ArchaeologyState, GameState, GlyphState, Inscription } from './types';

// ---------- state ----------

export function newArchaeologyState(seed: number = Math.floor(Math.random() * 0x7fffffff)): ArchaeologyState {
  const a: ArchaeologyState = {
    seed, glyphs: {}, cracks: {}, inscriptions: [], nextId: 1, chapters: {}, sinceChapter: {}, translated: {}, secret: {}, chambers: [], forms: [],
    newSince: 0, arrivals: { inscriptions: {}, hints: 0, revealed: [] },
  };
  ensureArchaeology(a);
  return a;
}

/** Fills in anything a load left out: every script's glyph table and counters. */
export function ensureArchaeology(a: ArchaeologyState): void {
  a.glyphs ??= {};
  a.cracks ??= {};
  a.inscriptions ??= [];
  a.nextId ??= 1;
  a.chapters ??= {};
  a.sinceChapter ??= {};
  a.translated ??= {};
  a.secret ??= {};
  a.chambers ??= [];
  a.forms ??= [];
  a.newSince ??= 0;
  a.arrivals ??= { inscriptions: {}, hints: 0, revealed: [] };
  for (const sc of SCRIPTS) {
    const table = (a.glyphs[sc.id] ??= {});
    for (const g of glyphIds(sc.id)) table[g] ??= { cracked: false, evidence: 0 };
    a.cracks[sc.id] = glyphIds(sc.id).filter((g) => table[g].cracked).length;
    a.chapters[sc.id] ??= 0;
    a.sinceChapter[sc.id] ??= 0;
    a.translated[sc.id] ??= 0;
    a.secret[sc.id] ??= false;
  }
}

// ---------- true meanings ----------

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const meaningCache = new Map<string, string[]>();

/** The true meaning of every glyph of a script, by glyph number. Fixed by the character's seed. */
export function scriptMeanings(seed: number, script: ScriptId): string[] {
  const key = `${seed}:${script}`;
  const hit = meaningCache.get(key);
  if (hit) return hit;
  const rng = seeded((seed ^ hashString(script)) >>> 0);
  const ids = MEANINGS.map((m) => m.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const out = ids.slice(0, scriptDef(script).glyphs);
  if (meaningCache.size > 64) meaningCache.clear();
  meaningCache.set(key, out);
  return out;
}

export function trueMeaning(a: ArchaeologyState, script: ScriptId, glyph: string): string {
  return scriptMeanings(a.seed, script)[Number(glyph.slice(1))];
}

export function glyphOf(a: ArchaeologyState, script: ScriptId, glyph: string): GlyphState {
  return ((a.glyphs[script] ??= {})[glyph] ??= { cracked: false, evidence: 0 });
}

// ---------- the codex ----------

export function crackedCount(a: ArchaeologyState, script: ScriptId): number {
  return a.cracks[script] ?? 0;
}

export function crackedShare(a: ArchaeologyState, script: ScriptId): number {
  return crackedCount(a, script) / scriptDef(script).glyphs;
}

/** Perks earned from a script's codex page, 0 to 4. */
export function codexTier(a: ArchaeologyState, script: ScriptId): number {
  const share = crackedShare(a, script);
  return [0.25, 0.5, 0.75, 1].filter((x) => share >= x - 1e-9).length;
}

/** Percent faster digs, across every script's page. */
export function codexDigSpeed(s: GameState): number {
  return SCRIPT_IDS.filter((id) => codexTier(s.archaeology, id) >= 1).length * CODEX_DIG_SPEED;
}

/** Fragile cracks a brushing patch loses. */
export function brushCrackCut(a: ArchaeologyState): number {
  return SCRIPT_IDS.filter((id) => codexTier(a, id) >= 3).length;
}

/** Evidence a glyph needs to reveal itself. */
export function revealThreshold(a: ArchaeologyState): number {
  const full = SCRIPT_IDS.filter((id) => codexTier(a, id) >= 4).length;
  return Math.max(REVEAL_MIN, REVEAL_EVIDENCE - full * CODEX_REVEAL_CUT);
}

/** Picture hints on this script's new inscriptions: the script's own, plus a perk hint, never more than length - 1. */
export function hintCount(a: ArchaeologyState, script: ScriptId): number {
  const def = scriptDef(script);
  return Math.min(def.length - 1, def.hints + (codexTier(a, script) >= 2 ? 1 : 0));
}

/** A merchant's better shelf for finishing a people's first chapter. */
export function stockBonus(s: GameState, culture: string): number {
  return (culture === 'surveyor' || culture === 'rime') && (s.archaeology.chapters[culture] ?? 0) >= 1 ? 1 : 0;
}

// ---------- who can write what ----------

/** The First Script only shows up once all three earlier peoples' fourth chapter is done. */
export function firstScriptOpen(a: ArchaeologyState): boolean {
  return EARLY_SCRIPTS.every((id) => (a.chapters[id] ?? 0) >= FIRST_SCRIPT_GATE);
}

export function inscriptionChance(a: ArchaeologyState, siteId: string, chamber: boolean): number {
  const script = SCRIPTS.find((x) => x.sites.includes(siteId));
  if (!script) return 0;
  if (script.id === 'first' && !firstScriptOpen(a)) return 0;
  return INSCRIPTION_CHANCE * (chamber ? CHAMBER_INSCRIPTION_MULT : 1);
}

/** Meanings the player has seen for a script: from picture hints so far, or cracked. The First Script reads through the others. */
export function seenMeanings(a: ArchaeologyState, script: ScriptId): string[] {
  const seen = new Set<string>();
  const add = (sc: ScriptId) => {
    for (const g of glyphIds(sc)) {
      const st = glyphOf(a, sc, g);
      if (st.cracked || st.evidence > 0) seen.add(trueMeaning(a, sc, g));
    }
  };
  add(script);
  if (script === 'first') {
    for (const sc of EARLY_SCRIPTS) for (const g of glyphIds(sc)) if (glyphOf(a, sc, g).cracked) seen.add(trueMeaning(a, sc, g));
  }
  return MEANINGS.filter((m) => seen.has(m.id)).map((m) => m.id);
}

/** In the First Script a picture hint is a glyph of an earlier script with that meaning; null when none of them has one. */
export function firstScriptHintSource(a: ArchaeologyState, meaning: string): { script: ScriptId; glyph: string; cracked: boolean } | null {
  let fallback: { script: ScriptId; glyph: string; cracked: boolean } | null = null;
  for (const sc of EARLY_SCRIPTS) {
    const g = glyphIds(sc).find((id) => trueMeaning(a, sc, id) === meaning);
    if (!g) continue;
    const cracked = glyphOf(a, sc, g).cracked;
    if (cracked) return { script: sc, glyph: g, cracked };
    fallback ??= { script: sc, glyph: g, cracked };
  }
  return fallback;
}

// ---------- making inscriptions ----------

function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A new rubbing for the stack. The glyphs lean towards ones not cracked yet; the picture hints are the true meanings
 * of some of them, shuffled so they don't say which glyph is which, and each one counts as evidence for its glyph.
 */
export function makeInscription(a: ArchaeologyState, rng: Rng, script: ScriptId): Inscription {
  const def = scriptDef(script);
  const left = glyphIds(script);
  const glyphs: string[] = [];
  for (let i = 0; i < def.length; i++) {
    const g = pickWeighted(rng, left, (id) => (glyphOf(a, script, id).cracked ? 1 : UNCRACKED_WEIGHT))!;
    glyphs.push(g);
    left.splice(left.indexOf(g), 1);
  }
  const hinted = shuffle(glyphs, rng).slice(0, hintCount(a, script));
  for (const g of hinted) glyphOf(a, script, g).evidence += 1;
  const hints = shuffle(hinted.map((g) => trueMeaning(a, script, g)), rng);
  const ins: Inscription = { id: `i${a.nextId++}`, culture: script, glyphs, hints };
  a.inscriptions.push(ins);
  if (a.inscriptions.length > INSCRIPTION_CAP) a.inscriptions.splice(0, a.inscriptions.length - INSCRIPTION_CAP);
  a.newSince += 1;
  a.arrivals.inscriptions[script] = (a.arrivals.inscriptions[script] ?? 0) + 1;
  a.arrivals.hints += hints.length;
  return ins;
}

/** Cracks a glyph for good: its meaning is pencilled in and fixed. */
function crack(a: ArchaeologyState, ctx: Ctx | null, script: ScriptId, glyph: string, revealed: boolean): void {
  const st = glyphOf(a, script, glyph);
  if (st.cracked) return;
  st.cracked = true;
  a.cracks[script] = (a.cracks[script] ?? 0) + 1;
  st.guess = trueMeaning(a, script, glyph);
  if (!revealed) return;
  a.arrivals.revealed.push({ culture: script, glyph });
  if (a.arrivals.revealed.length > 60) a.arrivals.revealed.shift();
  ctx?.emit({ t: 'info', text: `${scriptDef(script).name}: the meaning of a glyph came to you`, tone: 'good' });
}

// ---------- translating ----------

function applyReward(s: GameState, ctx: Ctx | null, script: ScriptId, n: number, reward: ChapterReward): void {
  const a = s.archaeology;
  const say = (text: string) => ctx?.emit({ t: 'info', text, tone: 'good' });
  switch (reward.kind) {
    case 'data':
      addBank(s, ANCIENT_DATA, reward.amount);
      say(`${scriptDef(script).name} chapter ${n}: ${reward.amount} Ancient Data`);
      break;
    case 'passport':
      (s.expedition.passports ??= {})[reward.site] = true;
      say(`${scriptDef(script).name} chapter ${n}: an Expedition Passport for a new site`);
      break;
    case 'chamber':
      if (!a.chambers.includes(reward.site)) a.chambers.push(reward.site);
      say(`${scriptDef(script).name} chapter ${n}: a hidden chamber opens`);
      break;
    case 'stock':
      say(`${scriptDef(script).name} chapter ${n}: their merchant opens a better shelf`);
      break;
    case 'forms':
      for (const f of reward.forms) if (!a.forms.includes(f)) a.forms.push(f);
      if (reward.title) a.title = reward.title;
      say(`${scriptDef(script).name} chapter ${n}: ${reward.forms.length > 1 ? 'new relic forms' : 'a new relic form'} at the Relic Forge`);
      break;
  }
}

/** Gives every chapter reward up to `n` that an old save never earned the new way. Passports and chambers are idempotent. */
export function grantChaptersUpTo(s: GameState, script: ScriptId, n: number): void {
  for (const c of CHAPTERS[script]) if (c.n <= n) applyReward(s, null, script, c.n, c.reward);
}

function advanceChapters(s: GameState, ctx: Ctx | null, script: ScriptId): void {
  const a = s.archaeology;
  const max = scriptDef(script).chapters;
  while (a.chapters[script] < max) {
    const n = a.chapters[script] + 1;
    const need = chapterNeed(n);
    if (a.sinceChapter[script] < need) break;
    a.sinceChapter[script] -= need;
    a.chapters[script] = n;
    const def = chapterDef(script, n)!;
    ctx?.emit({ t: 'info', text: `${scriptDef(script).name}: "${def.title}" translated`, tone: 'good' });
    applyReward(s, ctx, script, n, def.reward);
  }
  if (a.chapters[script] >= max) a.sinceChapter[script] = 0;
}

/** An inscription whose every glyph is cracked is read: it leaves the stack, pays Ancient Data and counts to the next chapter. */
function finishInscription(s: GameState, ctx: Ctx | null, ins: Inscription): void {
  const a = s.archaeology;
  a.inscriptions = a.inscriptions.filter((x) => x.id !== ins.id);
  a.translated[ins.culture] += 1;
  a.sinceChapter[ins.culture] += 1;
  addBank(s, ANCIENT_DATA, scriptDef(ins.culture).data);
  advanceChapters(s, ctx, ins.culture);
}

/**
 * Lets evidence and finished glyphs settle: a glyph with enough evidence reveals itself, and any inscription whose glyphs
 * are all cracked is translated. One can set off the other, so it repeats until nothing changes.
 */
export function settleDeciphering(s: GameState, ctx: Ctx | null): void {
  const a = s.archaeology;
  for (let guard = 0; guard < 400; guard++) {
    let changed = false;
    const need = revealThreshold(a);
    for (const sc of SCRIPT_IDS) {
      for (const g of glyphIds(sc)) {
        const st = glyphOf(a, sc, g);
        if (!st.cracked && st.evidence >= need) {
          crack(a, ctx, sc, g, true);
          changed = true;
        }
      }
    }
    const done = a.inscriptions.find((ins) => ins.glyphs.every((g) => glyphOf(a, ins.culture, g).cracked));
    if (done) {
      finishInscription(s, ctx, done);
      changed = true;
    }
    if (!changed) return;
  }
}

/** A dig finished at a site: maybe a rubbing for the stack. */
export function digInscription(s: GameState, ctx: Ctx, siteId: string, chamber: boolean): Inscription | null {
  const a = s.archaeology;
  const p = inscriptionChance(a, siteId, chamber);
  if (!p || ctx.rng.next() >= p) return null;
  const script = SCRIPTS.find((x) => x.sites.includes(siteId))!.id;
  const ins = makeInscription(a, ctx.rng, script);
  settleDeciphering(s, ctx);
  return ins;
}

// ---------- the puzzle ----------

/** Pencils a meaning against a glyph (null clears it). Cracked glyphs are fixed. */
export function setGuess(s: GameState, script: ScriptId, glyph: string, meaning: string | null): string | null {
  const st = glyphOf(s.archaeology, script, glyph);
  if (st.cracked) return 'That glyph is already cracked';
  if (meaning === null) delete st.guess;
  else if (!MEANINGS.some((m) => m.id === meaning)) return 'Unknown picture';
  else st.guess = meaning;
  return null;
}

export interface ReadResult {
  right: number;
  total: number;
  translated: boolean;
}

/** How many of an inscription's glyphs are pencilled in right, without saying which. Every one right translates it. */
export function readInscription(s: GameState, ctx: Ctx, id: string): ReadResult | null {
  const a = s.archaeology;
  const ins = a.inscriptions.find((x) => x.id === id);
  if (!ins) return null;
  const right = ins.glyphs.filter((g) => glyphOf(a, ins.culture, g).guess === trueMeaning(a, ins.culture, g)).length;
  const result: ReadResult = { right, total: ins.glyphs.length, translated: right === ins.glyphs.length };
  if (!result.translated) return result;
  for (const g of ins.glyphs) crack(a, ctx, ins.culture, g, false);
  finishInscription(s, ctx, ins);
  ctx.emit({ t: 'info', text: `${scriptDef(ins.culture).name}: inscription translated. +${scriptDef(ins.culture).data} Ancient Data`, tone: 'good' });
  settleDeciphering(s, ctx);
  return result;
}

// ---------- Rosetta stones ----------

export function useRosetta(s: GameState, ctx: Ctx): string | null {
  const a = s.archaeology;
  if (!hasItem(s, ROSETTA_STONE, 1)) return 'Needs a Rosetta Stone';
  payCost(s, { [ROSETTA_STONE]: 1 });
  for (const sc of SCRIPT_IDS) {
    const uncracked = glyphIds(sc).filter((g) => !glyphOf(a, sc, g).cracked);
    for (const g of shuffle(uncracked, ctx.rng).slice(0, ROSETTA_GLYPHS)) crack(a, ctx, sc, g, true);
    if (!a.secret[sc] && a.chapters[sc] >= ROSETTA_MIN_CHAPTER) {
      a.secret[sc] = true;
      addBank(s, ANCIENT_DATA, SECRET_DATA);
      ctx.emit({ t: 'info', text: `${scriptDef(sc).name}: a secret chapter opens. +${SECRET_DATA} Ancient Data`, tone: 'good' });
    }
  }
  ctx.emit({ t: 'info', text: 'The Rosetta Stone cracks glyphs in every script', tone: 'good' });
  settleDeciphering(s, ctx);
  return null;
}

// ---------- the desk ----------

/** The player has looked at what came in: the return card clears. */
export function clearArrivals(s: GameState): void {
  const a = s.archaeology;
  a.newSince = 0;
  a.arrivals = { inscriptions: {}, hints: 0, revealed: [] };
}

export function relicFormUnlocked(s: GameState, formId: string): boolean {
  return s.archaeology.forms.includes(formId);
}

export function unlockedForms(s: GameState) {
  return RELIC_FORMS.filter((f) => relicFormUnlocked(s, f.id));
}

/** What changed on the desk between two looks at `arrivals`, for the time-away summary. */
export function arrivalsSince(before: ArchaeologyState['arrivals'], after: ArchaeologyState['arrivals']): ArchaeologyState['arrivals'] {
  const inscriptions: Record<string, number> = {};
  for (const [k, n] of Object.entries(after.inscriptions)) {
    const d = n - (before.inscriptions[k] ?? 0);
    if (d > 0) inscriptions[k] = d;
  }
  const seen = new Set(before.revealed.map((r) => `${r.culture}:${r.glyph}`));
  return {
    inscriptions,
    hints: Math.max(0, after.hints - before.hints),
    revealed: after.revealed.filter((r) => !seen.has(`${r.culture}:${r.glyph}`)),
  };
}

/** The player-facing label for a glyph's meaning, for return notes. */
export function meaningName(id: string): string {
  return MEANINGS.find((m) => m.id === id)?.name ?? id;
}

// ---------- converting an old save ----------

interface OldExpedition {
  dug?: Record<string, number>;
  passports?: Record<string, true>;
  clues?: Record<string, number>;
  forge?: unknown;
  relicsRestored?: number;
  [key: string]: unknown;
}

/**
 * Archaeology before Deciphering had Surface, Buried and Bedrock layers, Commitment, cave-ins and Clue Fragments.
 * Those go. Chapters are set to the lowest values that match the sites already open, with the rewards on the way
 * (passports and chambers included), every owned Clue Fragment becomes 3 inscriptions, and everything else stays.
 */
export function convertLegacyArchaeology(raw: Record<string, unknown>, seed: number = Math.floor(Math.random() * 0x7fffffff)): void {
  const e = (raw.expedition ??= {}) as OldExpedition;
  const storage = (raw.storage ??= {}) as { bank?: Record<string, number> };
  const bank = (storage.bank ??= {});
  const progress = raw.professionProgress as { legacyAccess?: Record<string, true> } | undefined;
  const a = newArchaeologyState(seed);
  const dug = e.dug ?? {};
  const open = (siteId: string) => !!(e.passports?.[siteId] || (dug[siteId] ?? 0) > 0 || progress?.legacyAccess?.[siteId]);

  // chapters that match the open sites
  for (const siteId of TRAIL) {
    const from = passportChapter(siteId);
    if (from && open(siteId)) a.chapters[from.script] = Math.max(a.chapters[from.script], from.n);
  }
  // every relic form was open to anyone who held a Sealed Relic
  const hadRelics = (dug.dig_reliquary ?? 0) > 0 || (bank[SEALED_RELIC] ?? 0) > 0 || !!e.forge || (e.relicsRestored ?? 0) > 0;
  if (hadRelics) for (const f of RELIC_FORMS) a.forms.push(f.id);
  const passports = (e.passports ??= {});
  for (const script of SCRIPT_IDS) {
    for (const c of CHAPTERS[script]) {
      if (c.n > a.chapters[script]) break;
      const r = c.reward;
      // Ancient Data is never added: the balance stays exactly as it was
      if (r.kind === 'passport') passports[r.site] = true;
      else if (r.kind === 'chamber') a.chambers.push(r.site);
      else if (r.kind === 'forms') {
        for (const f of r.forms) a.forms.push(f);
        if (r.title) a.title = r.title;
      }
    }
  }
  a.forms = [...new Set(a.forms)];
  a.chambers = [...new Set(a.chambers)];

  // every Clue Fragment is three rubbings of its site's script
  const rng = seeded((seed ^ 0x51ed) >>> 0);
  for (const [siteId, n] of Object.entries(e.clues ?? {})) {
    const script = SCRIPTS.find((x) => x.sites.includes(siteId))?.id;
    if (!script || script === 'first') continue;
    for (let i = 0; i < n * 3; i++) makeInscription(a, rng, script);
  }
  a.newSince = 0;
  a.arrivals = { inscriptions: {}, hints: 0, revealed: [] };

  for (const k of ['layer', 'clues', 'clueMs', 'commit', 'caveIns']) delete e[k];
  raw.archaeology = a;
}

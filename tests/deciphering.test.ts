import { describe, expect, it } from 'vitest';
import {
  CHAPTERS, chapterNeed, glyphIds, INSCRIPTION_CHANCE, REVEAL_EVIDENCE, ROSETTA_GLYPHS, SCRIPT_IDS, SCRIPTS, SECRET_DATA, scriptDef, type ScriptId,
} from '../src/data/deciphering';
import { ANCIENT_DATA, chamberActionId, ROSETTA_STONE, SEALED_RELIC } from '../src/data/expedition';
import { actionDef } from '../src/data/skills';
import type { Ctx } from '../src/engine/context';
import {
  arrivalsSince, brushCrackCut, clearArrivals, codexDigSpeed, crackedCount, ensureArchaeology, firstScriptOpen, glyphOf, hintCount, inscriptionChance, makeInscription,
  readInscription, revealThreshold, scriptMeanings, seenMeanings, setGuess, settleDeciphering, trueMeaning, useRosetta,
} from '../src/engine/deciphering';
import { hasPassport, standing } from '../src/engine/expedition';
import { BRUSH_COLS, BRUSH_ROWS, brushChips, brushDone, brushPatch, brushResult } from '../src/engine/minigame';
import { seeded, type Rng } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { actionBlocker, actionIntervalMs, skillStep, startSkillAction } from '../src/engine/skills';
import { newGame, SAVE_VERSION } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';
import { xpForLevel } from '../src/engine/xp';

const ctx = (): Ctx => ({ now: 0, rng: seeded(5), emit: () => {} });
const fixed = (v: number): Ctx => ({ now: 0, rng: { next: () => v } as Rng, emit: () => {} });

function scholar(): GameState {
  const s = newGame(1, { name: 'Scholar', classId: 'warrior' });
  s.skills.archaeology = xpForLevel(99);
  return s;
}

/** Cracks the first `n` glyphs of a script, the way a long run of evidence would. */
function crackFirst(s: GameState, script: ScriptId, n: number): void {
  glyphIds(script).slice(0, n).forEach((g) => { glyphOf(s.archaeology, script, g).cracked = true; });
  ensureArchaeology(s.archaeology);
}

function crackAll(s: GameState, script: ScriptId): void {
  crackFirst(s, script, scriptDef(script).glyphs);
}

describe('glyph meanings', () => {
  it('give every glyph one meaning of the shared set, fixed by the character seed', () => {
    for (const sc of SCRIPTS) {
      const m = scriptMeanings(42, sc.id);
      expect(m).toHaveLength(sc.glyphs);
      expect(new Set(m).size).toBe(sc.glyphs);
      expect(scriptMeanings(42, sc.id)).toEqual(m);
    }
    expect(scriptMeanings(42, 'giant')).not.toEqual(scriptMeanings(43, 'giant'));
    expect(scriptMeanings(42, 'giant').slice(0, 4)).not.toEqual(scriptMeanings(42, 'rime').slice(0, 4));
  });

  it('stay the same through a save and load', () => {
    const s = scholar();
    const back = deserialize(serialize(s));
    for (const sc of SCRIPT_IDS) for (const g of glyphIds(sc)) expect(trueMeaning(back.archaeology, sc, g)).toBe(trueMeaning(s.archaeology, sc, g));
    expect(back.archaeology).toEqual(s.archaeology);
  });
});

describe('inscriptions', () => {
  it('follow each script\'s length and hint counts', () => {
    const s = scholar();
    for (const sc of SCRIPTS) {
      const ins = makeInscription(s.archaeology, seeded(3), sc.id);
      expect(ins.culture).toBe(sc.id);
      expect(ins.glyphs).toHaveLength(sc.length);
      expect(new Set(ins.glyphs).size).toBe(sc.length);
      expect(ins.hints).toHaveLength(sc.hints);
      // every hint is the true meaning of one of its own glyphs
      const meanings = ins.glyphs.map((g) => trueMeaning(s.archaeology, sc.id, g));
      for (const h of ins.hints) expect(meanings).toContain(h);
    }
  });

  it('lean towards glyphs that are not cracked yet', () => {
    const s = scholar();
    crackFirst(s, 'rime', 10);
    let fresh = 0;
    let total = 0;
    const rng = seeded(11);
    for (let i = 0; i < 300; i++) {
      for (const g of makeInscription(s.archaeology, rng, 'rime').glyphs) {
        total += 1;
        if (!glyphOf(s.archaeology, 'rime', g).cracked) fresh += 1;
      }
    }
    expect(fresh / total).toBeGreaterThan(0.65);
  });

  it('keep at most 200 in the stack, dropping the oldest', () => {
    const s = scholar();
    const rng = seeded(2);
    const first = makeInscription(s.archaeology, rng, 'giant');
    for (let i = 0; i < 210; i++) makeInscription(s.archaeology, rng, 'giant');
    expect(s.archaeology.inscriptions).toHaveLength(200);
    expect(s.archaeology.inscriptions.some((x) => x.id === first.id)).toBe(false);
  });

  it('come from digs, 4% of the time, and twice as often from a hidden chamber', () => {
    const s = scholar();
    expect(inscriptionChance(s.archaeology, 'dig_cairn', false)).toBe(INSCRIPTION_CHANCE);
    expect(inscriptionChance(s.archaeology, 'dig_cairn', true)).toBe(INSCRIPTION_CHANCE * 2);
    startSkillAction(s, fixed(0.999), 'dig_cairn');
    if (s.action?.kind !== 'skill') throw new Error('not digging');
    const dig = (c: Ctx) => {
      if (s.action?.kind !== 'skill') throw new Error('not digging');
      s.action.progress = actionIntervalMs(s, actionDef('dig_cairn'), deriveStats(s));
      skillStep(s, c, 0, deriveStats(s));
    };
    dig(fixed(0.999));
    expect(s.archaeology.inscriptions).toHaveLength(0);
    dig(fixed(0.01));
    expect(s.archaeology.inscriptions).toHaveLength(1);
    expect(s.archaeology.inscriptions[0].culture).toBe('giant');
    expect(s.archaeology.newSince).toBe(1);
    expect(s.archaeology.arrivals.inscriptions.giant).toBe(1);
  });

  it('turn up offline too, and the return card counts them and their hints', () => {
    const s = scholar();
    const before = structuredClone(s.archaeology.arrivals);
    const rng = seeded(8);
    makeInscription(s.archaeology, rng, 'giant');
    makeInscription(s.archaeology, rng, 'rime');
    const since = arrivalsSince(before, s.archaeology.arrivals);
    expect(since.inscriptions).toEqual({ giant: 1, rime: 1 });
    expect(since.hints).toBe(scriptDef('giant').hints + scriptDef('rime').hints);
    clearArrivals(s);
    expect(s.archaeology.newSince).toBe(0);
    expect(s.archaeology.arrivals.inscriptions).toEqual({});
  });
});

describe('evidence and auto-reveal', () => {
  it('counts 1 evidence for each glyph whose picture is among the hints', () => {
    const s = scholar();
    const ins = makeInscription(s.archaeology, seeded(4), 'surveyor');
    const hinted = ins.glyphs.filter((g) => ins.hints.includes(trueMeaning(s.archaeology, 'surveyor', g)));
    expect(hinted).toHaveLength(ins.hints.length);
    for (const g of glyphIds('surveyor')) expect(glyphOf(s.archaeology, 'surveyor', g).evidence).toBe(hinted.includes(g) ? 1 : 0);
  });

  it('reveals a glyph at 12 evidence and not before', () => {
    const s = scholar();
    const g = 'g3';
    glyphOf(s.archaeology, 'giant', g).evidence = REVEAL_EVIDENCE - 1;
    settleDeciphering(s, ctx());
    expect(glyphOf(s.archaeology, 'giant', g).cracked).toBe(false);
    glyphOf(s.archaeology, 'giant', g).evidence = REVEAL_EVIDENCE;
    const told: string[] = [];
    settleDeciphering(s, { ...ctx(), emit: (e) => { if (e.t === 'info') told.push(e.text); } });
    const st = glyphOf(s.archaeology, 'giant', g);
    expect(st.cracked).toBe(true);
    expect(st.guess).toBe(trueMeaning(s.archaeology, 'giant', g));
    expect(s.archaeology.arrivals.revealed).toEqual([{ culture: 'giant', glyph: g }]);
    expect(told.some((t) => /meaning of a glyph came to you/.test(t))).toBe(true);
    expect(crackedCount(s.archaeology, 'giant')).toBe(1);
  });

  it('reveals through new inscriptions as the hints pile up', () => {
    const s = scholar();
    const rng = seeded(21);
    for (let i = 0; i < 400; i++) {
      makeInscription(s.archaeology, rng, 'giant');
      settleDeciphering(s, null);
    }
    expect(crackedCount(s.archaeology, 'giant')).toBe(12);
  });

  it('only pictures already seen are offered for a script', () => {
    const s = scholar();
    expect(seenMeanings(s.archaeology, 'giant')).toEqual([]);
    const ins = makeInscription(s.archaeology, seeded(9), 'giant');
    expect(seenMeanings(s.archaeology, 'giant').sort()).toEqual([...ins.hints].sort());
  });
});

describe('the puzzle', () => {
  function oneInscription(s: GameState) {
    const a = s.archaeology;
    a.inscriptions.push({ id: 'i1', culture: 'giant', glyphs: ['g0', 'g1', 'g2'], hints: [trueMeaning(a, 'giant', 'g0'), trueMeaning(a, 'giant', 'g1')] });
    return a.inscriptions[0];
  }

  it('says how many glyphs are right without saying which', () => {
    const s = scholar();
    const ins = oneInscription(s);
    expect(readInscription(s, ctx(), ins.id)).toEqual({ right: 0, total: 3, translated: false });
    setGuess(s, 'giant', 'g0', trueMeaning(s.archaeology, 'giant', 'g0'));
    setGuess(s, 'giant', 'g1', 'sun' === trueMeaning(s.archaeology, 'giant', 'g1') ? 'moon' : 'sun');
    expect(readInscription(s, ctx(), ins.id)).toEqual({ right: 1, total: 3, translated: false });
    expect(s.archaeology.inscriptions).toHaveLength(1);
  });

  it('translates when every glyph is right: they become cracked and fixed, and it pays Ancient Data', () => {
    const s = scholar();
    const ins = oneInscription(s);
    for (const g of ins.glyphs) setGuess(s, 'giant', g, trueMeaning(s.archaeology, 'giant', g));
    expect(readInscription(s, ctx(), ins.id)).toEqual({ right: 3, total: 3, translated: true });
    expect(s.archaeology.inscriptions).toHaveLength(0);
    for (const g of ins.glyphs) expect(glyphOf(s.archaeology, 'giant', g).cracked).toBe(true);
    expect(s.storage.bank[ANCIENT_DATA]).toBe(scriptDef('giant').data);
    expect(s.archaeology.translated.giant).toBe(1);
    expect(s.archaeology.sinceChapter.giant).toBe(1);
    // cracked glyphs can't be re-pencilled
    expect(setGuess(s, 'giant', 'g0', 'sun')).toMatch(/already cracked/);
  });

  it('fills cracked glyphs into every other inscription, translating any that are now complete', () => {
    const s = scholar();
    const a = s.archaeology;
    a.inscriptions.push({ id: 'i1', culture: 'giant', glyphs: ['g0', 'g1', 'g2'], hints: [] });
    a.inscriptions.push({ id: 'i2', culture: 'giant', glyphs: ['g1', 'g2', 'g0'], hints: [] });
    a.inscriptions.push({ id: 'i3', culture: 'giant', glyphs: ['g0', 'g5', 'g6'], hints: [] });
    for (const g of ['g0', 'g1', 'g2']) setGuess(s, 'giant', g, trueMeaning(a, 'giant', g));
    readInscription(s, ctx(), 'i1');
    expect(a.inscriptions.map((x) => x.id)).toEqual(['i3']);
    expect(a.translated.giant).toBe(2);
    expect(s.storage.bank[ANCIENT_DATA]).toBe(2 * scriptDef('giant').data);
  });
});

describe('story chapters', () => {
  /** A script with every glyph cracked: each new inscription translates on arrival. */
  function translate(s: GameState, script: ScriptId, n: number): void {
    crackAll(s, script);
    const rng = seeded(31);
    for (let i = 0; i < n; i++) {
      makeInscription(s.archaeology, rng, script);
      settleDeciphering(s, null);
    }
  }

  it('need 3 + n translated inscriptions each, counted since the last chapter', () => {
    const s = scholar();
    translate(s, 'giant', chapterNeed(1) - 1);
    expect(s.archaeology.chapters.giant).toBe(0);
    translate(s, 'giant', 1);
    expect(s.archaeology.chapters.giant).toBe(1);
    expect(s.archaeology.sinceChapter.giant).toBe(0);
    expect(chapterNeed(2)).toBe(5);
    translate(s, 'giant', 4);
    expect(s.archaeology.chapters.giant).toBe(1);
    translate(s, 'giant', 1);
    expect(s.archaeology.chapters.giant).toBe(2);
  });

  it('give the Giants\' rewards in order: Ancient Data, passports, a chamber, then the first relic forms', () => {
    const s = scholar();
    translate(s, 'giant', chapterNeed(1));
    expect(s.storage.bank[ANCIENT_DATA]).toBe(50 + 4 * 5);
    expect(hasPassport(s, 'dig_cutting')).toBe(false);
    translate(s, 'giant', chapterNeed(2));
    expect(hasPassport(s, 'dig_cutting')).toBe(true);
    expect(actionBlocker(s, actionDef('dig_cutting'))).toBeNull();
    expect(s.archaeology.chambers).toEqual([]);
    translate(s, 'giant', chapterNeed(3));
    expect(s.archaeology.chambers).toEqual(['dig_cairn']);
    expect(hasPassport(s, 'dig_adit')).toBe(false);
    translate(s, 'giant', chapterNeed(4));
    expect(hasPassport(s, 'dig_adit')).toBe(true);
    expect(s.archaeology.forms).toEqual([]);
    translate(s, 'giant', chapterNeed(5));
    expect(s.archaeology.chapters.giant).toBe(5);
    expect(s.archaeology.forms).toEqual(['small_kings_bulwark', 'crown_of_the_cairn']);
    // nothing further to earn: the count stays at zero
    translate(s, 'giant', 3);
    expect(s.archaeology.chapters.giant).toBe(5);
    expect(s.archaeology.sinceChapter.giant).toBe(0);
  });

  it('hand out the other peoples\' passports, a better shelf and the title', () => {
    const s = scholar();
    expect(standing(s, 'surveyor')).toBe(0);
    translate(s, 'surveyor', chapterNeed(1));
    expect(standing(s, 'surveyor')).toBe(1);
    translate(s, 'surveyor', chapterNeed(2));
    expect(hasPassport(s, 'dig_barrow')).toBe(true);
    translate(s, 'rime', chapterNeed(1) + chapterNeed(2));
    expect(hasPassport(s, 'dig_colossus')).toBe(true);
    // chapters between the fourth and the last pay 100 x k Ancient Data
    const dataBefore = s.storage.bank[ANCIENT_DATA];
    translate(s, 'surveyor', chapterNeed(3) + chapterNeed(4));
    expect(hasPassport(s, 'dig_heart')).toBe(true);
    const gained = s.storage.bank[ANCIENT_DATA] - dataBefore;
    translate(s, 'surveyor', chapterNeed(5));
    expect(s.storage.bank[ANCIENT_DATA] - dataBefore - gained).toBe(200 + chapterNeed(5) * scriptDef('surveyor').data);
    s.archaeology.chapters.first = 7;
    s.archaeology.sinceChapter.first = 0;
    translate(s, 'first', chapterNeed(8));
    expect(s.archaeology.forms).toContain('heart_of_the_peaks');
    expect(s.archaeology.title).toBe('Reader of the First Script');
  });

  it('has the chapter table the design lists', () => {
    expect(SCRIPTS.map((x) => CHAPTERS[x.id].length)).toEqual([5, 6, 7, 8]);
    for (const sc of SCRIPTS) for (const c of CHAPTERS[sc.id]) expect(c.lore.length).toBeGreaterThanOrEqual(2);
  });

  it('opens a hidden chamber as a second dig with double the inscriptions', () => {
    const s = scholar();
    const chamber = actionDef(chamberActionId('dig_cairn'));
    expect(actionBlocker(s, chamber)).toBeTruthy();
    s.archaeology.chambers.push('dig_cairn');
    expect(actionBlocker(s, chamber)).toBeNull();
    expect(chamber.outputs).toEqual(actionDef('dig_cairn').outputs);
    expect(chamber.outputChance).toBe(actionDef('dig_cairn').outputChance);
    expect(startSkillAction(s, ctx(), chamber.id)).toBeNull();
    if (s.action?.kind !== 'skill') throw new Error('not digging');
    s.action.progress = actionIntervalMs(s, chamber, deriveStats(s));
    skillStep(s, fixed(0.05), 0, deriveStats(s));
    // 0.05 misses a plain dig's 4% but lands inside the chamber's 8%
    expect(s.archaeology.inscriptions).toHaveLength(1);
    expect(s.expedition.dug.dig_cairn).toBe(1);
  });
});

describe('the First Script', () => {
  it('shows no inscriptions until all three earlier peoples are past chapter 4', () => {
    const s = scholar();
    const a = s.archaeology;
    expect(firstScriptOpen(a)).toBe(false);
    expect(inscriptionChance(a, 'dig_reliquary', false)).toBe(0);
    a.chapters.giant = 4;
    a.chapters.surveyor = 4;
    expect(firstScriptOpen(a)).toBe(false);
    a.chapters.rime = 3;
    expect(inscriptionChance(a, 'dig_reliquary', false)).toBe(0);
    a.chapters.rime = 4;
    expect(firstScriptOpen(a)).toBe(true);
    expect(inscriptionChance(a, 'dig_reliquary', false)).toBe(INSCRIPTION_CHANCE);
  });

  it('writes its picture hints with glyphs of the other scripts, readable only once cracked', () => {
    const s = scholar();
    const a = s.archaeology;
    for (const sc of ['giant', 'surveyor', 'rime'] as const) a.chapters[sc] = 4;
    // the meanings of the three earlier scripts are the pictures the First Script is read through
    expect(seenMeanings(a, 'first')).toEqual([]);
    crackFirst(s, 'giant', 4);
    const known = glyphIds('giant').slice(0, 4).map((g) => trueMeaning(a, 'giant', g));
    for (const m of known) expect(seenMeanings(a, 'first')).toContain(m);
    const ins = makeInscription(a, seeded(6), 'first');
    expect(ins.glyphs).toHaveLength(6);
    expect(ins.hints).toHaveLength(3);
  });
});

describe('Rosetta stones', () => {
  it('crack 3 glyphs in every script and open each secret chapter once, if it is at chapter 3', () => {
    const s = scholar();
    s.archaeology.chapters.giant = 3;
    s.archaeology.chapters.rime = 2;
    expect(useRosetta(s, ctx())).toMatch(/Rosetta/);
    s.storage.bank[ROSETTA_STONE] = 2;
    expect(useRosetta(s, ctx())).toBeNull();
    for (const sc of SCRIPTS) expect(crackedCount(s.archaeology, sc.id)).toBe(ROSETTA_GLYPHS);
    expect(s.archaeology.secret).toEqual({ giant: true, surveyor: false, rime: false, first: false });
    expect(s.storage.bank[ANCIENT_DATA]).toBe(SECRET_DATA);
    expect(s.storage.bank[ROSETTA_STONE]).toBe(1);
    expect(useRosetta(s, ctx())).toBeNull();
    expect(s.storage.bank[ANCIENT_DATA]).toBe(SECRET_DATA);
    for (const sc of SCRIPTS) expect(crackedCount(s.archaeology, sc.id)).toBe(ROSETTA_GLYPHS * 2);
  });

  it('only turn up as digs at the Adit, the Heart and the Reliquary', () => {
    const s = scholar();
    s.expedition.passports = { dig_cutting: true, dig_adit: true };
    startSkillAction(s, fixed(0), 'dig_adit');
    if (s.action?.kind !== 'skill') throw new Error('not digging');
    s.action.progress = actionIntervalMs(s, actionDef('dig_adit'), deriveStats(s));
    skillStep(s, fixed(0), 0, deriveStats(s));
    expect(s.storage.bank[ROSETTA_STONE]).toBe(1);
    const t = scholar();
    startSkillAction(t, fixed(0), 'dig_cairn');
    if (t.action?.kind !== 'skill') throw new Error('not digging');
    t.action.progress = actionIntervalMs(t, actionDef('dig_cairn'), deriveStats(t));
    skillStep(t, fixed(0), 0, deriveStats(t));
    expect(t.storage.bank[ROSETTA_STONE] ?? 0).toBe(0);
  });
});

describe('the codex', () => {
  it('gives a perk at every 25% of a script, stacking across scripts', () => {
    const s = scholar();
    const a = s.archaeology;
    const slow = actionIntervalMs(s, actionDef('dig_cairn'), deriveStats(s));
    expect(codexDigSpeed(s)).toBe(0);
    crackFirst(s, 'giant', 3);
    expect(codexDigSpeed(s)).toBe(5);
    expect(actionIntervalMs(s, actionDef('dig_cairn'), deriveStats(s))).toBeCloseTo(slow / 1.05);
    crackFirst(s, 'surveyor', 4);
    expect(codexDigSpeed(s)).toBe(10);

    // 50%: one more picture hint, never more than length - 1
    expect(hintCount(a, 'surveyor')).toBe(2);
    crackFirst(s, 'surveyor', 8);
    expect(hintCount(a, 'surveyor')).toBe(3);
    crackFirst(s, 'giant', 6);
    expect(hintCount(a, 'giant')).toBe(2);
    expect(makeInscription(a, seeded(1), 'surveyor').hints).toHaveLength(3);

    // 75%: one fewer fragile crack in brushing
    expect(brushCrackCut(a)).toBe(0);
    crackFirst(s, 'surveyor', 12);
    expect(brushCrackCut(a)).toBe(1);

    // 100%: glyphs reveal 2 evidence sooner, for every culture
    expect(revealThreshold(a)).toBe(REVEAL_EVIDENCE);
    crackAll(s, 'giant');
    expect(revealThreshold(a)).toBe(REVEAL_EVIDENCE - 2);
    crackAll(s, 'surveyor');
    expect(revealThreshold(a)).toBe(REVEAL_EVIDENCE - 4);
    glyphOf(a, 'rime', 'g0').evidence = REVEAL_EVIDENCE - 4;
    settleDeciphering(s, null);
    expect(glyphOf(a, 'rime', 'g0').cracked).toBe(true);
  });
});

describe('brushing the find free', () => {
  it('scores the cracks chipped: clean double, one hit, two weak, three or more a miss', () => {
    expect(brushResult(0)).toBe('double');
    expect(brushResult(1)).toBe('hit');
    expect(brushResult(2)).toBe('weak');
    expect(brushResult(3)).toBe('miss');
    expect(brushResult(5)).toBe('miss');
  });

  it('lays out a 4 by 3 patch with a 3 to 4 square find and 2 to 3 cracks beside it', () => {
    const rng = seeded(17);
    for (let i = 0; i < 200; i++) {
      const p = brushPatch(rng);
      expect(p.find.length).toBeGreaterThanOrEqual(3);
      expect(p.find.length).toBeLessThanOrEqual(4);
      expect(p.cracks.length).toBeGreaterThanOrEqual(2);
      expect(p.cracks.length).toBeLessThanOrEqual(3);
      for (const t of [...p.find, ...p.cracks]) expect(t).toBeLessThan(BRUSH_COLS * BRUSH_ROWS);
      expect(p.cracks.some((t) => p.find.includes(t))).toBe(false);
      const near = (a: number, b: number) => Math.abs((a % BRUSH_COLS) - (b % BRUSH_COLS)) <= 1 && Math.abs(Math.floor(a / BRUSH_COLS) - Math.floor(b / BRUSH_COLS)) <= 1;
      for (const c of p.cracks) expect(p.find.some((f) => near(c, f))).toBe(true);
      // the find is one piece
      const seen = new Set([p.find[0]]);
      for (let k = 0; k < p.find.length; k++) for (const t of p.find) if ([...seen].some((u) => Math.abs(u - t) === 1 && Math.floor(u / BRUSH_COLS) === Math.floor(t / BRUSH_COLS) || Math.abs(u - t) === BRUSH_COLS)) seen.add(t);
      expect(seen.size).toBe(p.find.length);
    }
  });

  it('takes the codex\'s cracks off, but never the last one', () => {
    const rng = seeded(3);
    for (let i = 0; i < 50; i++) {
      expect(brushPatch(rng, 1).cracks.length).toBeLessThanOrEqual(2);
      expect(brushPatch(rng, 9).cracks).toHaveLength(1);
    }
  });

  it('ends when the whole find is brushed, counting only cracks hit', () => {
    const p = { find: [1, 2, 3, 4, 5], cracks: [0, 6, 7] };
    expect(brushDone(p, new Set([1, 2, 3, 4]))).toBe(false);
    expect(brushDone(p, new Set([1, 2, 3, 4, 5]))).toBe(true);
    expect(brushChips(p, new Set([1, 2, 3, 4, 5]))).toBe(0);
    expect(brushChips(p, new Set([1, 2, 3, 4, 5, 6, 7]))).toBe(2);
  });
});

describe('migration from the layered Archaeology', () => {
  function oldSave(expedition: Record<string, unknown>, bank: Record<string, number> = {}): string {
    const s = scholar();
    const raw = JSON.parse(serialize(s));
    raw.version = 51;
    delete raw.archaeology;
    raw.expedition = {
      dug: {}, shelves: {}, orders: {}, tally: { finds: 0, traded: 0 }, layer: { dig_cairn: 2 }, commit: { key: 'dig_cairn:2', ms: 3_600_000 }, caveIns: 4, relicsRestored: 0, trailSchema: 1,
      ...expedition,
    };
    raw.storage.bank = { ...raw.storage.bank, ...bank };
    return JSON.stringify(raw);
  }

  it('keeps a Barrow save open at the right chapters and turns 2 Clue Fragments into 6 inscriptions', () => {
    const json = oldSave({
      dug: { dig_cairn: 400, dig_cutting: 300, dig_barrow: 50 },
      passports: { dig_cutting: true, dig_barrow: true },
      clues: { dig_barrow: 2 },
    }, { [ANCIENT_DATA]: 77, giant_tally: 9 });
    const s = deserialize(json);
    expect(s.version).toBe(SAVE_VERSION);
    // an open Barrow means Surveyors chapter 2 and the Giants' chapter 2 for the Cutting
    expect(s.archaeology.chapters).toEqual({ giant: 2, surveyor: 2, rime: 0, first: 0 });
    expect(hasPassport(s, 'dig_cutting')).toBe(true);
    expect(hasPassport(s, 'dig_barrow')).toBe(true);
    expect(hasPassport(s, 'dig_colossus')).toBe(false);
    expect(s.archaeology.inscriptions).toHaveLength(6);
    expect(s.archaeology.inscriptions.every((i) => i.culture === 'rime')).toBe(true);
    // the old layer system is gone, everything else is as it was
    expect(s.expedition).not.toHaveProperty('layer');
    expect(s.expedition).not.toHaveProperty('commit');
    expect(s.expedition).not.toHaveProperty('caveIns');
    expect(s.expedition).not.toHaveProperty('clues');
    expect(s.expedition.dug).toEqual({ dig_cairn: 400, dig_cutting: 300, dig_barrow: 50 });
    expect(s.storage.bank[ANCIENT_DATA]).toBe(77);
    expect(s.storage.bank.giant_tally).toBe(9);
    expect(s.archaeology.forms).toEqual([]);
    expect(s.archaeology.chambers).toEqual([]);
    // and it loads again without changing
    const again = deserialize(serialize(s));
    expect(again.archaeology).toEqual(s.archaeology);
  });

  it('leaves a brand-new Archaeology character at the start, and keeps the relic forms of anyone who held a Sealed Relic', () => {
    const fresh = deserialize(oldSave({}));
    expect(fresh.archaeology.chapters).toEqual({ giant: 0, surveyor: 0, rime: 0, first: 0 });
    expect(fresh.archaeology.inscriptions).toEqual([]);
    const relic = deserialize(oldSave({ dug: { dig_reliquary: 10 }, passports: { dig_cutting: true, dig_barrow: true, dig_colossus: true, dig_adit: true, dig_heart: true, dig_reliquary: true } }, { [SEALED_RELIC]: 1 }));
    expect(relic.archaeology.forms).toHaveLength(7);
    expect(relic.archaeology.chapters.rime).toBe(4);
  });

  it('gives each character a different script, but never changes it afterwards', () => {
    const a = deserialize(oldSave({}));
    const b = deserialize(oldSave({}));
    expect(a.archaeology.seed).not.toBe(b.archaeology.seed);
    expect(deserialize(serialize(a)).archaeology.seed).toBe(a.archaeology.seed);
  });
});

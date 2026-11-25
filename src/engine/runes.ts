import { baseDef } from '../data/bases';
import { RESONANCE_PER_PIECE, RUNE_FAMILIES, RUNE_GRADES, runeDef, runeEffect, type RuneDef, type RuneReading } from '../data/runes';
import type { SkillAction } from '../data/skills';
import { describeStat } from '../data/statText';
import { hasItem } from './bank';
import type { Ctx } from './context';
import { findItem, isCraftLocked } from './crafting';
import { itemName } from './items';
import { hasAccomplishment } from './professions';
import { skillTreeStats } from './skillTree';
import type { GameState, Item, StatKey } from './types';

/** Manufacturing and the default Rune Board are independent of campaign access. */
export function runesOpen(_s: GameState): boolean {
  return true;
}

/** How a rune reads on this item. */
export function readingOf(item: Item): RuneReading {
  const slot = baseDef(item.baseId).slot;
  if (slot === 'weapon') return 'weapon';
  return slot === 'ring' || slot === 'amulet' || slot === 'belt' ? 'jewellery' : 'armour';
}

/** The item's rune, if it has one the game still knows. */
export function itemRune(item: Item): RuneDef | undefined {
  return item.rune ? runeDef(item.rune) : undefined;
}

function worn(s: GameState): Item[] {
  return Object.values(s.equipment).filter((i): i is Item => !!i);
}

/** Resonance and Deep Cuts: how much of its written value a family's runes give right now. */
export function runeMult(s: GameState, family: string): number {
  const t = skillTreeStats(s);
  const runeBoardLvl = s.account.hideout.rune_board ?? 1;
  const pieces = worn(s).filter((i) => itemRune(i)?.family.id === family).length;
  const baseResonance = runeBoardLvl >= 5 ? 0.15 : runeBoardLvl >= 3 ? 0.1 : runeBoardLvl >= 2 ? 0.07 : RESONANCE_PER_PIECE;
  const perPiece = baseResonance * (t.livingScript ? 2 : 1);
  const boardBonusPct = runeBoardLvl >= 6 ? 60 : runeBoardLvl >= 5 ? 40 : runeBoardLvl >= 4 ? 25 : runeBoardLvl >= 3 ? 15 : 0;
  return (1 + Math.max(0, pieces - 1) * perPiece) * (1 + (t.deepCuts ?? 0) / 100) * (1 + boardBonusPct / 100);
}

/** What every rune on your gear adds. Kept apart from an item's mods: a rune is never local, and no orb reads it. */
export function runeStats(s: GameState): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  const runes = worn(s).map(itemRune).filter(Boolean);
  for (const item of worn(s)) {
    const rune = itemRune(item);
    if (!rune) continue;
    const e = runeEffect(rune, readingOf(item));
    out[e.stat] = (out[e.stat] ?? 0) + e.value * runeMult(s, rune.family.id);
  }
  const runeBoardLvl = s.account.hideout.rune_board ?? 1;
  if (runeBoardLvl >= 4 && runes.length >= 3) {
    out.allRes = (out.allRes ?? 0) + 2;
  }
  if (runeBoardLvl >= 6) {
    out.allRes = (out.allRes ?? 0) + 5;
  }
  return out;
}

/** The rune's line on an item, at its written value. */
export function runeText(rune: RuneDef, item: Item, mult = 1): string {
  const e = runeEffect(rune, readingOf(item));
  return describeStat(e.stat, Math.round(e.value * mult * 100) / 100);
}

export function runeReason(s: GameState, runeId: string, uid: number): string | null {
  const rune = runeDef(runeId);
  const item = findItem(s, uid);
  if (!rune) return 'Unknown rune';
  if (!item) return 'Select an item';
  if (item.corrupted) return 'Corrupted gear cannot be modified';
  if (!hasItem(s, runeId, 1)) return 'You have none';
  if (isCraftLocked(s, uid)) return 'Item is being auto-crafted';
  if (item.ilvl < rune.grade.ilvl) return `Requires item level ${rune.grade.ilvl}`;
  if (item.rune === runeId) return 'Already inscribed';
  return null;
}

/** Cut a rune into the item's slot. A rune already there is destroyed; everything else on the item stays as it is. */
export function inscribeRune(s: GameState, ctx: Ctx, runeId: string, uid: number): string | null {
  const reason = runeReason(s, runeId, uid);
  if (reason) return reason;
  const item = findItem(s, uid)!;
  item.rune = runeId;
  s.storage.bank[runeId] -= 1;
  ctx.emit({ t: 'craft', text: `${runeDef(runeId)!.name} → ${itemName(item)}`, uid });
  return null;
}

export function runecarvingDone(s: GameState, _ctx: Ctx, a: SkillAction): void {
  if (a.skill !== 'runecarving') return;
  const m = /^carve_rune_([^_]+)_(\d+)$/.exec(a.batchOf ?? a.id);
  if (m) {
    const [, family, grade] = m;
    const key = `rune.${family}.${grade}`;
    s.professionProgress.counters[key] = (s.professionProgress.counters[key] ?? 0) + (a.batchMastery ? a.batch! : 1);
  }
}

export function runecarvingAccessHint(s: GameState, a: SkillAction): string | null {
  if (a.skill !== 'runecarving' || !a.accomplishments?.length) return null;
  for (const acc of a.accomplishments) {
    if (hasAccomplishment(s, acc)) continue;
    const runeMatch = /^rune_(\w+)_grade_(\d+)_practice$/.exec(acc);
    if (runeMatch) {
      const [, family, gradeStr] = runeMatch;
      const grade = Number(gradeStr);
      const gName = RUNE_GRADES.find((g) => g.grade === grade)?.name ?? `Grade ${grade}`;
      const fName = RUNE_FAMILIES.find((f) => f.id === family)?.name ?? family;
      const done = s.professionProgress.counters[`rune.${family}.${grade}`] ?? 0;
      return `Requires 10 ${gName} ${fName} rune carves (${done}/10)`;
    }
  }
  return null;
}

export function runeInscriptionPreview(s: GameState, runeId: string, item: Item | null): string[] {
  const rune = runeDef(runeId);
  if (!rune) return ['Unknown rune.'];
  if (!item) {
    return [
      `${rune.name} (${rune.family.name} family)`,
      `Requires item level ${rune.grade.ilvl}.`,
      'Select an item to view slot effect and resonance preview.',
    ];
  }
  const reading = readingOf(item);
  const effect = runeEffect(rune, reading);
  const currentRune = itemRune(item);
  const lines: string[] = [];

  const readingLabel = reading === 'weapon' ? 'Weapon slot' : reading === 'jewellery' ? 'Jewellery slot' : 'Armour slot';
  lines.push(`${readingLabel}: ${describeStat(effect.stat, effect.value)} (base effect).`);

  if (item.ilvl < rune.grade.ilvl) {
    lines.push(`Requires item level ${rune.grade.ilvl} (item is ilvl ${item.ilvl} — too low).`);
  } else {
    lines.push(`Item level check: ilvl ${item.ilvl} satisfies requirement (minimum ilvl ${rune.grade.ilvl}).`);
  }

  if (currentRune) {
    if (currentRune.id === rune.id) {
      lines.push(`Already inscribed: this item already holds ${currentRune.name}.`);
    } else {
      lines.push(`Replacing existing rune: ${currentRune.name} will be destroyed. All item modifiers, rarity, and identity are preserved.`);
    }
  } else {
    lines.push('One rune slot: fills empty socket. All item modifiers, rarity, and identity are preserved.');
  }

  const isWorn = Object.values(s.equipment).some((i) => i?.uid === item.uid);
  const newFamily = rune.family.id;
  const wornItems = Object.values(s.equipment).filter((i): i is Item => !!i);
  let piecesWithFamily = wornItems.filter((i) => {
    if (isWorn && i.uid === item.uid) return true;
    return itemRune(i)?.family.id === newFamily;
  }).length;
  if (!isWorn) {
    piecesWithFamily += 1;
  }
  const runeBoardLvl = s.account.hideout.rune_board ?? 1;
  const baseRes = runeBoardLvl >= 5 ? 0.15 : runeBoardLvl >= 3 ? 0.1 : runeBoardLvl >= 2 ? 0.07 : RESONANCE_PER_PIECE;
  const t = skillTreeStats(s);
  const perPiece = baseRes * (t.livingScript ? 2 : 1);
  const boardBonusPct = runeBoardLvl >= 6 ? 60 : runeBoardLvl >= 5 ? 40 : runeBoardLvl >= 4 ? 25 : runeBoardLvl >= 3 ? 15 : 0;
  const projectedMult = (1 + Math.max(0, piecesWithFamily - 1) * perPiece) * (1 + (t.deepCuts ?? 0) / 100) * (1 + boardBonusPct / 100);
  const scaledValue = Math.round(effect.value * projectedMult * 100) / 100;
  lines.push(`Resonance preview: ${describeStat(effect.stat, scaledValue)} (${Math.round(projectedMult * 100)}% potency with ${piecesWithFamily} worn ${rune.family.name} rune${piecesWithFamily === 1 ? '' : 's'}).`);

  return lines;
}

export type RunecarvingCategory = 'grade_1' | 'grade_2' | 'grade_3' | 'grade_4' | 'inscriptions';

export const RUNECARVING_CATEGORIES: { id: RunecarvingCategory; label: string; desc: string }[] = [
  { id: 'grade_1', label: 'Grade 1 · Scratched', desc: 'Entry runes for early gear sockets.' },
  { id: 'grade_2', label: 'Grade 2 · Carved', desc: 'Carved runes requiring Grade 1 practice.' },
  { id: 'grade_3', label: 'Grade 3 · Deep', desc: 'Deep runes requiring Grade 2 practice.' },
  { id: 'grade_4', label: 'Grade 4 · Sainted', desc: 'Sainted runes requiring Grade 3 practice.' },
  { id: 'inscriptions', label: 'Inscriptions & Keys', desc: 'Specialized inscription components and realm keys.' },
];

export function runecarvingCategory(a: SkillAction): RunecarvingCategory {
  const runeId = Object.keys(a.outputs ?? {}).find((k) => runeDef(k));
  if (runeId) {
    const r = runeDef(runeId)!;
    if (r.grade.grade === 1) return 'grade_1';
    if (r.grade.grade === 2) return 'grade_2';
    if (r.grade.grade === 3) return 'grade_3';
    if (r.grade.grade === 4) return 'grade_4';
  }
  return 'inscriptions';
}

export function runecarvingPreview(s: GameState, a: SkillAction): string[] {
  if (a.skill !== 'runecarving') return [];
  const lines: string[] = [];

  if (a.id === 'prepare_return_inscription') {
    lines.push('Ten Inscription Fragments and one separately carved Keen grade 3 rune make one protected Return Inscription.');
    lines.push('Protected component: full listed costs; no yield doubling or tree input conservation. Two are used in The Homecoming project.');
    return lines;
  }
  if (a.id === 'prepare_choir_inscription') {
    lines.push('Ten Inscription Fragments and one separately carved Blood grade 3 rune make one protected Choir Inscription.');
    lines.push('Protected component: full listed costs; no yield doubling or tree input conservation. Stock for future profession projects.');
    return lines;
  }
  if (a.id === 'prepare_circuit_inscription') {
    lines.push('Ten Inscription Fragments and one separately carved Storm grade 3 rune make one protected Circuit Inscription.');
    lines.push('Protected component: full listed costs; no yield doubling or tree input conservation. Stock for future profession projects.');
    return lines;
  }
  if (a.id === 'inscribe_convergence') {
    lines.push('Five Inscription Fragments and one separately carved Stone grade 4 rune make one protected Convergence Inscription.');
    lines.push('Protected component: full listed costs; no yield doubling or tree input conservation. Component for the Sum of All Things pinnacle project.');
    return lines;
  }
  if (a.id === 'carve_regent_key') {
    lines.push('Fuses scorched and frigid fossils with arcane dust into a joined Regent Key for high-tier Cartography.');
    return lines;
  }

  const runeId = Object.keys(a.outputs ?? {}).find((k) => runeDef(k));
  if (!runeId) return [];
  const rune = runeDef(runeId)!;
  lines.push(`Carves 1 ${rune.name} (${rune.family.name} family, Grade ${rune.grade.grade}). Requires item level ${rune.grade.ilvl} to inscribe.`);
  lines.push(
    `Slot effects: Weapon: ${describeStat(runeEffect(rune, 'weapon').stat, runeEffect(rune, 'weapon').value)} · ` +
    `Armour: ${describeStat(runeEffect(rune, 'armour').stat, runeEffect(rune, 'armour').value)} · ` +
    `Jewellery: ${describeStat(runeEffect(rune, 'jewellery').stat, runeEffect(rune, 'jewellery').value)}.`
  );

  if (rune.grade.grade >= 2) {
    const prevGrade = rune.grade.grade - 1;
    const gName = RUNE_GRADES.find((g) => g.grade === prevGrade)?.name ?? `Grade ${prevGrade}`;
    const done = s.professionProgress.counters[`rune.${rune.family.id}.${prevGrade}`] ?? 0;
    const unlocked = hasAccomplishment(s, `rune_${rune.family.id}_grade_${prevGrade}_practice`);
    lines.push(`Requires 10 ${gName} ${rune.family.name} rune carves (${Math.min(10, done)}/10)${unlocked ? ' — Unlocked' : ''}.`);

    const fragCycles = 20 - ((s.professionProgress.counters['runes.inscription'] ?? 0) % 20);
    lines.push(`Inscription Fragment progress: 1 in ${fragCycles} completed grade 2+ carves (+1% extra chance).`);
  }

  return lines;
}

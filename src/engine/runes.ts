import { baseDef } from '../data/bases';
import { RESONANCE_PER_PIECE, RUNE_GATE, runeDef, runeEffect, type RuneDef, type RuneReading } from '../data/runes';
import { describeStat } from '../data/statText';
import { hasItem } from './bank';
import type { Ctx } from './context';
import { findItem, isCraftLocked } from './crafting';
import { itemName } from './items';
import { skillTreeStats } from './skillTree';
import type { GameState, Item, StatKey } from './types';

/** The skill opens with the first area of Act 3. */
export function runesOpen(s: GameState): boolean {
  return s.unlockedZones.includes(RUNE_GATE.zone);
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
  const pieces = worn(s).filter((i) => itemRune(i)?.family.id === family).length;
  const perPiece = RESONANCE_PER_PIECE * (t.livingScript ? 2 : 1);
  return (1 + Math.max(0, pieces - 1) * perPiece) * (1 + (t.deepCuts ?? 0) / 100);
}

/** What every rune on your gear adds. Kept apart from an item's mods: a rune is never local, and no orb reads it. */
export function runeStats(s: GameState): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  for (const item of worn(s)) {
    const rune = itemRune(item);
    if (!rune) continue;
    const e = runeEffect(rune, readingOf(item));
    out[e.stat] = (out[e.stat] ?? 0) + e.value * runeMult(s, rune.family.id);
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
  s.bank[runeId] -= 1;
  ctx.emit({ t: 'craft', text: `${runeDef(runeId)!.name} → ${itemName(item)}`, uid });
  return null;
}

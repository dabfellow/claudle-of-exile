/**
 * The running list of unique items, docs/UNIQUES.md, rendered from the game data.
 * `npm run uniques` rewrites the file; tests/uniques.test.ts fails if it has gone stale.
 */
import { ACHIEVEMENT_BY_ID } from './achievements';
import { baseDef, UNIQUES, type UniqueDef } from './bases';
import { HARD_BOSSES, UBER_BOSSES, UNIQUE_MAPS } from './maps';
import { isWorldDropUnique, uniqueDropLevel } from './uniqueDrops';
import { describeUniqueModDef } from '../engine/items';

export const UNIQUE_LIST_PATH = 'docs/UNIQUES.md';

const modLines = (u: UniqueDef) => u.mods.map(describeUniqueModDef);
const formatMods = (u: UniqueDef) => modLines(u).map((line) => `• ${line}`).join('<br>');

/** A unique's world-drop level and any special reward source. */
export function uniqueDropsIn(u: UniqueDef): string[] {
  const world = isWorldDropUnique(u) ? [`World drop (level ${uniqueDropLevel(u)}+)`] : [];
  const hard = HARD_BOSSES.filter((b) => b.uniqueId === u.id).map((b) => `${b.name} (Hard Boss)`);
  const uber = UBER_BOSSES.filter((b) => b.uniques.includes(u.id)).map((b) => `${b.name} (Uber Boss)`);
  const uniqueMaps = UNIQUE_MAPS.filter((m) => m.uniques.includes(u.id)).map((m) => `${m.name} (Unique Map)`);
  return [...world, ...hard, ...uber, ...uniqueMaps, ...achievementSources(u)];
}

/** Achievements that hand this unique over. */
function achievementSources(u: UniqueDef): string[] {
  return Object.values(ACHIEVEMENT_BY_ID).filter((a) => a.unique === u.id).map((a) => `${a.name} (Achievement)`);
}

function row(u: UniqueDef): string {
  const base = baseDef(u.baseId);
  const cells = [`**${u.name}**<br>*${u.flavour}*`, base.slot, `${base.name} (${base.reqLevel})`, formatMods(u), uniqueDropsIn(u).join(', ') || '—'];
  return `| ${cells.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`;
}

function table(uniques: UniqueDef[]): string[] {
  return ['| Unique | Slot | Base (req. level) | Mods | Drops in |', '| --- | --- | --- | --- | --- |', ...uniques.map(row)];
}

/** World drops appear in level order; trophy and achievement uniques stay separate. */
export function uniqueSections(): [string, UniqueDef[]][] {
  const byLevel = (a: UniqueDef, b: UniqueDef) => uniqueDropLevel(a) - uniqueDropLevel(b) || a.name.localeCompare(b.name);
  const sorted = [...UNIQUES].sort(byLevel);
  const fromBoss = (u: UniqueDef) => HARD_BOSSES.some((b) => b.uniqueId === u.id) || UBER_BOSSES.some((b) => b.uniques.includes(u.id));
  return [
    ['World drops', sorted.filter(isWorldDropUnique)],
    ['Boss trophies', sorted.filter(fromBoss)],
    ['Achievement rewards', sorted.filter((u) => !fromBoss(u) && achievementSources(u).length)],
    ['No drop source yet', sorted.filter((u) => !isWorldDropUnique(u) && !fromBoss(u) && !achievementSources(u).length)],
  ];
}

export function renderUniqueList(): string {
  const sections = uniqueSections();
  const lines = [
    '# Unique items',
    '',
    'Generated from the game data; run `npm run uniques` after changing a unique, instead of editing this file.',
    '',
    `${UNIQUES.length} uniques, with ordinary items listed by world-drop level.`,
  ];
  for (const [title, uniques] of sections) {
    if (uniques.length) lines.push('', `## ${title} (${uniques.length})`, '', ...table(uniques));
  }
  return lines.join('\n') + '\n';
}

/**
 * The running list of unique items, docs/UNIQUES.md, rendered from the game data.
 * `npm run uniques` rewrites the file; tests/uniques.test.ts fails if it has gone stale.
 */
import { ACHIEVEMENT_BY_ID } from './achievements';
import { baseDef, UNIQUES, type UniqueDef } from './bases';
import { HARD_BOSSES, MAP_UNIQUE_POOLS, UBER_BOSSES } from './maps';
import { ACTS, ZONES } from './zones';
import { describeUniqueModDef } from '../engine/items';

export const UNIQUE_LIST_PATH = 'docs/UNIQUES.md';

const modLines = (u: UniqueDef) => u.mods.map(describeUniqueModDef);
const formatMods = (u: UniqueDef) => modLines(u).map((line) => `• ${line}`).join('<br>');

/** Every place a unique drops: its areas, then its Maps tier pool, then Hard/Uber bosses. */
export function uniqueDropsIn(u: UniqueDef): string[] {
  const zones = ZONES.filter((z) => z.uniques.includes(u.id)).map((z) => `${z.name} (Act ${z.act})`);
  const maps = MAP_UNIQUE_POOLS.filter((p) => p.uniques.includes(u.id)).map((p) => `${p.label} (Maps)`);
  const hard = HARD_BOSSES.filter((b) => b.uniqueId === u.id).map((b) => `${b.name} (Hard Boss)`);
  const uber = UBER_BOSSES.filter((b) => b.uniques.includes(u.id)).map((b) => `${b.name} (Uber Boss)`);
  return [...zones, ...maps, ...hard, ...uber, ...achievementSources(u)];
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

/** Each unique's first act, by the zones that drop it; undefined if no zone does. */
export function firstAct(u: UniqueDef): number | undefined {
  const acts = ZONES.filter((z) => z.uniques.includes(u.id)).map((z) => z.act);
  return acts.length ? Math.min(...acts) : undefined;
}

/** Every unique under the first act that drops it, in level order, then the Maps/Pinnacle ones and those with no source. */
export function uniqueSections(): [string, UniqueDef[]][] {
  const byLevel = (a: UniqueDef, b: UniqueDef) => baseDef(a.baseId).reqLevel - baseDef(b.baseId).reqLevel || a.name.localeCompare(b.name);
  const sorted = [...UNIQUES].sort(byLevel);
  const fromMaps = (u: UniqueDef) =>
    MAP_UNIQUE_POOLS.some((p) => p.uniques.includes(u.id)) ||
    HARD_BOSSES.some((b) => b.uniqueId === u.id) ||
    UBER_BOSSES.some((b) => b.uniques.includes(u.id));
  return [
    ...ACTS.map((a): [string, UniqueDef[]] => [`Act ${a.n}: ${a.name}`, sorted.filter((u) => firstAct(u) === a.n)]),
    ['Maps only', sorted.filter((u) => firstAct(u) === undefined && fromMaps(u))],
    ['Achievement rewards', sorted.filter((u) => firstAct(u) === undefined && !fromMaps(u) && achievementSources(u).length)],
    ['No drop source yet', sorted.filter((u) => firstAct(u) === undefined && !fromMaps(u) && !achievementSources(u).length)],
  ];
}

export function renderUniqueList(): string {
  const sections = uniqueSections();
  const lines = [
    '# Unique items',
    '',
    'Generated from the game data; run `npm run uniques` after changing a unique, instead of editing this file.',
    '',
    `${UNIQUES.length} uniques, each under the first act that drops it.`,
  ];
  for (const [title, uniques] of sections) {
    if (uniques.length) lines.push('', `## ${title} (${uniques.length})`, '', ...table(uniques));
  }
  return lines.join('\n') + '\n';
}

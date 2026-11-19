import { CONSTELLATIONS, constellationDef, STAR_SKILL_SPEED, starCost, STARS_PER_CONSTELLATION, type Constellation } from '../data/astrology';
import { canAfford, payCost } from './bank';
import { CLASSIC_BLOCK, isClassic } from './challenge';
import type { Ctx } from './context';
import type { GameState, SkillId, StatKey } from './types';
import { levelOf } from './xp';

/** Stars lit in one constellation, 0–5. */
export function starsLit(s: GameState, id: string): number {
  return Math.min(STARS_PER_CONSTELLATION, s.astrology?.stars?.[id] ?? 0);
}

export function totalStarsLit(s: GameState): number {
  return CONSTELLATIONS.reduce((a, cst) => a + starsLit(s, cst.id), 0);
}

/** Why the next star of a constellation can't be lit, or null when it can. */
export function lightStarReason(s: GameState, cst: Constellation): string | null {
  if (isClassic(s)) return CLASSIC_BLOCK;
  const lit = starsLit(s, cst.id);
  if (lit >= STARS_PER_CONSTELLATION) return 'Every star is lit';
  if (levelOf('astrology', s.skills.astrology ?? 0) < cst.level) return `Requires Astrology level ${cst.level}`;
  if (!canAfford(s, starCost(cst, lit + 1))) return 'Not enough Stardust';
  return null;
}

export function lightStar(s: GameState, ctx: Ctx, id: string): string | null {
  const cst = constellationDef(id);
  if (!cst) return 'Unknown constellation';
  const reason = lightStarReason(s, cst);
  if (reason) return reason;
  const n = starsLit(s, id) + 1;
  payCost(s, starCost(cst, n));
  s.astrology.stars[id] = n;
  ctx.emit({ t: 'info', text: n === STARS_PER_CONSTELLATION ? `${cst.name} shines in full` : `Lit star ${n} of ${cst.name}`, tone: 'good' });
  return null;
}

/** Profession speed from lit stars, in percent. The Unclosed Eye counts for every profession. */
export function astrologySpeed(s: GameState, skill: SkillId): number {
  let pct = 0;
  for (const cst of CONSTELLATIONS) {
    if (cst.skill === skill || (!cst.skill && skill !== 'combat')) pct += starsLit(s, cst.id) * STAR_SKILL_SPEED;
  }
  return pct;
}

/** Combat stats from every lit star. */
export function astrologyStats(s: GameState): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  for (const cst of CONSTELLATIONS) {
    const n = starsLit(s, cst.id);
    if (n) out[cst.stat] = (out[cst.stat] ?? 0) + n * cst.perStar;
  }
  return out;
}

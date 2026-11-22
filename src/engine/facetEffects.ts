import type { SupportMods } from '../data/gems';
import type { SkillGemInstance, SupportGemInstance } from './types';

export function countFacet(gem: SkillGemInstance | SupportGemInstance | null | undefined, id: string): number {
  return gem?.facets?.reduce((count, facet) => count + Number(facet === id), 0) ?? 0;
}

/** Fractional effects scale normally. Counts remain whole, and mana multipliers scale around 1. */
export function facetedSupportMods(base: SupportMods, support: SupportGemInstance): SupportMods {
  if (!support.facets?.length) return base;
  const effect = 1 + countFacet(support, 'sovereign') * 0.25 + countFacet(support, 'bulwark') * 0.08;
  const keen = 1 + countFacet(support, 'keen') * 0.05;
  const scaled = { ...base };
  for (const [key, value] of Object.entries(base)) {
    if (typeof value !== 'number') continue;
    const name = key as keyof SupportMods;
    let amount = value * effect;
    if (name === 'manaMult' || name === 'repeatDamage') {
      const neutral = name === 'manaMult' ? 1 : 100;
      amount = Math.max(0, neutral + (value - neutral) * effect);
    } else if (['moreDamage', 'morePhys', 'moreElem', 'moreBleed', 'lowLifeMore'].includes(name)) {
      amount *= keen;
    } else if (['repeats', 'chains', 'minionCount', 'stormCount'].includes(name)) {
      amount = Math.round(amount);
    }
    Object.assign(scaled, { [name]: amount });
  }
  if (base.extra) scaled.extra = { ...base.extra, pct: base.extra.pct * effect * keen };
  scaled.moreDamage = (scaled.moreDamage ?? 0) + countFacet(support, 'twin') * 4 + countFacet(support, 'heartfire') * 15;
  scaled.manaMult = (scaled.manaMult ?? 1) * manaFacets(support) * (1 - countFacet(support, 'steady') * 0.05);
  scaled.durationPct = (scaled.durationPct ?? 0) + countFacet(support, 'lasting') * 15;
  scaled.castSpeed = (scaled.castSpeed ?? 0) + countFacet(support, 'quickcast') * 8;
  return scaled;
}

export function facetLevels(gem: SkillGemInstance | SupportGemInstance | null): number {
  return countFacet(gem, 'clarity') + 2 * countFacet(gem, 'radiant');
}

export function manaFacets(gem: SkillGemInstance | SupportGemInstance | null): number {
  return (1 - countFacet(gem, 'economy') * 0.08) * (1 + countFacet(gem, 'heartfire') * 0.10);
}

export function gemXpMultiplier(gem: SkillGemInstance): number {
  return 1 + (countFacet(gem, 'polish') + gem.supports.reduce((count, sup) => count + countFacet(sup, 'polish'), 0)) * 0.10;
}

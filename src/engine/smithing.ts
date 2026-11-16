import { affixDef } from '../data/affixes';
import { baseDef } from '../data/bases';
import { SMITH_COMPONENT_USES } from '../data/smithing';
import type { SkillAction } from '../data/skills';
import { createItem, eligibleAffixes, addFixedMod, spawnWeight, rareName } from './items';
import { pickWeighted, rInt, type Rng } from './rng';
import { hasMilestone } from './skillingMastery';
import type { GameState, Item } from './types';

/** The same tier/minima are used by both the preview and actual delivery. */
export function purposeGuarantees(a: SkillAction, ilvl: number) {
  const strength = Math.max(baseDef(a.baseId!).reqLevel, ilvl - 10);
  return a.purpose!.guarantees.map((id) => {
    const affix = affixDef(id);
    const tier = affix.tiers.reduce((best, t, i) => t.ilvl <= strength ? i : best, 0);
    const ranges = affix.tiers[tier].ranges.map(([lo, hi]) => [Math.ceil((lo + hi) / 2), hi] as const);
    return { affix, tier, ranges };
  });
}

export function createPurposeItem(s: GameState, a: SkillAction, ilvl: number, rng: Rng): Item {
  const item = createItem(s, a.baseId!, ilvl, 'normal', rng);
  item.rarity = 'rare';
  const mastersEdge = hasMilestone(s, a.mastery, 50);
  const masterArmorer = hasMilestone(s, a.mastery, 100);
  if (masterArmorer) item.itemTier = 2;
  for (const { affix, tier, ranges } of purposeGuarantees(a, ilvl)) {
    item[affix.kind === 'prefix' ? 'prefixes' : 'suffixes'].push({
      affixId: affix.id, tier, values: ranges.map(([lo, hi]) => mastersEdge ? hi : rInt(rng, lo, hi)),
    });
  }
  // One further prefix and suffix, using ordinary weights and tier-window probabilities.
  for (const kind of ['prefix', 'suffix'] as const) {
    if (item[kind === 'prefix' ? 'prefixes' : 'suffixes'].length >= 3) continue;
    const affix = pickWeighted(rng, eligibleAffixes(item, kind), (f) => spawnWeight(f, baseDef(item.baseId)));
    if (!affix) continue;
    const tiers = affix.tiers.map((t, i) => ({ t, i })).filter(({ t }) => t.ilvl <= ilvl).slice(-5);
    const tier = pickWeighted(rng, tiers, ({ i }) => Math.pow(0.7, i))!;
    addFixedMod(item, affix.id, tier.i, rng);
  }
  item.name = rareName(item, rng);
  return item;
}

export function smithingPreview(a: SkillAction, ilvl: number): string[] {
  if (!a.purpose) return SMITH_COMPONENT_USES[a.id] ? [SMITH_COMPONENT_USES[a.id]] : [];
  return [
    `One rare, item level ${ilvl}, four modifiers. Stops after one; kept regardless of salvage settings. Resin and fossil slots are not used.`,
    ...purposeGuarantees(a, ilvl).map(({ affix, ranges }) => `Guaranteed minimum: ${affix.text.replace(/\{(\d+)\}/g, (_, i) => String(ranges[Number(i)][0]))}`),
    'Plus one compatible prefix and suffix with ordinary rolls and distinct modifier groups. Character level and attributes are still required to equip.',
  ];
}

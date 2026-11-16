import type { SkillAction } from './skills';

export const MASTERY_BATCH_TIERS = [
  { size: 5, mastery: 15, time: 2 },
  { size: 50, mastery: 90, time: 10 },
] as const;

/** Ordinary repeatable production only; equipment, maps, keys and protected progress keep their pacing. */
export function supportsMasteryBatch(a: SkillAction): boolean {
  return !!a.inputs && !a.batchOf && !a.soon && !a.baseId && !a.chart && !a.protectedOutputs
    && !a.discovery && !a.outputChance && !a.bonus?.length
    && ['smithing', 'alchemy', 'cooking', 'gemcutting', 'runecarving', 'cartography', 'woodcutting'].includes(a.skill)
    && (!!a.gem || !!a.flaskId || Object.keys(a.outputs ?? {}).length > 0)
    && !Object.keys(a.outputs ?? {}).some((id) => /key|sigil|seal|fragment|artifact|chart/.test(id));
}

export function masteryBatches(a: SkillAction): SkillAction[] {
  if (!supportsMasteryBatch(a)) return [];
  return MASTERY_BATCH_TIERS.map((tier) => ({
    ...a,
    id: `${a.id}_x${tier.size}`,
    name: `${a.name} ×${tier.size}`,
    batch: tier.size,
    batchOf: a.id,
    batchMastery: tier.mastery,
    intervalMs: a.intervalMs * tier.time,
    xp: a.xp * tier.size,
    inputs: Object.fromEntries(Object.entries(a.inputs!).map(([id, n]) => [id, n * tier.size])),
    outputs: a.outputs && Object.fromEntries(Object.entries(a.outputs).map(([id, n]) => [id, n * tier.size])),
  }));
}

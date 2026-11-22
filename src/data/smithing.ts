import { affixDef } from './affixes';
import { baseDef, obtainable } from './bases';
import { MINING_METALS } from './mining';
import type { SkillAction } from './skills';

export interface SmithPurpose { id: string; guarantees: [string, string] }

/** Expand only bases on which both promised modifiers can actually roll. */
export function purposeRecipes(cheap: SkillAction[]): SkillAction[] {
  return cheap.flatMap((a) => {
    const b = baseDef(a.baseId!);
    if (!obtainable(b)) return [];
    const has = (tag: typeof b.tags[number]) => b.tags.includes(tag);
    const jewellery = ['ring', 'amulet', 'belt'].includes(b.slot);
    const defence = has('str_armour') && has('dex_armour') ? 'inc_armour_evasion'
      : has('str_armour') && has('int_armour') ? 'inc_armour_es'
      : has('dex_armour') && has('int_armour') ? 'inc_evasion_es'
      : has('str_armour') ? 'inc_armour' : has('dex_armour') ? 'inc_evasion' : 'inc_es';
    const purposes: SmithPurpose[] = [];
    if (has('attack_weapon')) purposes.push({ id: 'physical', guarantees: ['added_phys', 'inc_phys'] });
    if (has('armour') && defence !== 'inc_es') purposes.push({ id: 'protection', guarantees: ['flat_life', defence] });
    if (has('armour') || jewellery) for (const element of ['fire', 'cold', 'light']) purposes.push({ id: `resistance_${element}`, guarantees: ['flat_life', `${element}_res`] });
    if (has('caster_weapon')) purposes.push({ id: 'resource', guarantees: ['flat_mana', 'spell_damage'] });
    else if (has('int_armour')) purposes.push({ id: 'resource', guarantees: ['es_and_mana', defence] });
    else if (jewellery) purposes.push({ id: 'resource', guarantees: ['flat_mana', 'mana_regen'] });
    const inputs = Object.fromEntries(Object.entries(a.inputs!).map(([id, n]) => [id, n * 2]));
    return purposes.filter((p) => p.guarantees.every((id) => {
      const affix = affixDef(id);
      return !affix.benchOnly && !affix.uniqueOnly && b.tags.some((tag) => (affix.weights[tag] ?? 0) > 0);
    })).map((purpose): SkillAction => ({
      id: `purpose_${purpose.id}_${b.id}`, skill: a.skill, baseId: b.id, purpose,
      name: `${({ physical: 'Physical', protection: 'Protection', resource: 'Resource', resistance_fire: 'Fire resistance', resistance_cold: 'Cold resistance', resistance_light: 'Lightning resistance' } as Record<string, string>)[purpose.id]} · ${b.name}`,
      level: a.level, intervalMs: 60_000 + 2000 * b.reqLevel, xp: (18 + 1.8 * b.reqLevel) / 0.3,
      inputs: { ...inputs }, color: a.skill === 'woodcrafting' ? '#9c7a4c' : '#d6b67b',
    }));
  });
}

/** Raw XP is scaled once by skills.ts, matching the existing refinement ladder. */
export const SMITH_COMPONENTS: SkillAction[] = [
  ...MINING_METALS.slice(3).map((m): SkillAction => ({
    id: `smelt_${m.id}`, skill: 'smelting', name: `Smelt ${m.name} Bars`, level: m.level,
    intervalMs: m.ms, xp: [8, 12, 16, 20][(m.level - 45) / 15] / 0.3,
    inputs: { [`${m.id}_ore`]: 5 }, outputs: { [`${m.id}_bar`]: 1 }, color: m.color,
  })),
  ...([
    ['alloy_tempered', 'Tempered Alloy', 15, 2, 15, 18, { iron_bar: 2, copper_bar: 1 }, 'tempered_alloy', 'smelting' as const],
    ['alloy_wound', 'Wound Alloy', 60, 3, 60, 120, { mithril_bar: 5, copper_bar: 2, mineral_fragment: 10, heartstone: 1 }, 'wound_alloy', 'smelting' as const],
    ['alloy_stone', 'Stone Alloy', 70, 3, 60, 150, { adamant_bar: 5, iron_bar: 2, stone_fragment: 10, heartstone: 1 }, 'stone_alloy', 'smelting' as const],
    ['frame_heartwood', 'Heartwood Frame', 45, 3, 60, 90, { ancient_heartwood: 1, yew_plank: 5 }, 'heartwood_frame', 'woodcrafting' as const],
    ['frame_convergence', 'Convergence Frame', 85, 3, 120, 300, { wound_alloy: 1, stone_alloy: 1, ancient_heartwood: 1 }, 'convergence_frame', 'woodcrafting' as const],
  ] as [string, string, number, number, number, number, Record<string, number>, string, 'smelting' | 'woodcrafting'][]).map(([id, name, level, forge, seconds, xp, inputs, output, skill]): SkillAction => ({
    id, name: `Make ${name}`, skill, level, forge, intervalMs: seconds * 1000, xp: xp / 0.3,
    inputs, protectedOutputs: { [output]: 1 }, color: skill === 'woodcrafting' ? '#9c7a4c' : '#d6b67b',
  })),
];

export const SMITH_COMPONENT_USES: Record<string, string> = {
  alloy_tempered: 'Protected alloy used by Woundmaker and The Homecoming, with further defensive projects planned.',
  alloy_wound: 'Protected alloy for Convergence Frames and the Woundmaker project.',
  alloy_stone: 'Protected alloy for Convergence Frames and later Debt of Stone projects.',
  frame_heartwood: "Protected frame for Winter’s Pyre and The Homecoming, with further defensive projects planned. Ordinary purpose gear needs only ore, bars and wood.",
  frame_convergence: 'Protected frame for the later Sum of All Things project; no unfinished unique recipe is available.',
};

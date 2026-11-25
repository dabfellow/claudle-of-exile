import { baseDef, obtainable, type BaseDef, type Implicit } from './bases';
import { MINING_METALS } from './mining';
import type { SkillAction } from './skills';
import type { MasterAlloyId } from './smelting';
import { describeStat } from './statText';
import type { StatKey } from '../engine/types';

export type ForgeStageId = 'shape' | 'temper' | 'form' | 'finish' | 'signature';
export type ForgeElement = 'fire' | 'cold' | 'light';

/** Practice that unlocks a stage option: forge `count` pieces using any of `ids` at `stage` (any option there when `ids` is left out). */
export interface ForgeUnlock {
  stage: ForgeStageId;
  ids?: readonly string[];
  count: number;
}

export interface ForgeChoice {
  id: string;
  name: string;
  /** The Forging level the option also needs. */
  level: number;
  effect: string;
  weights?: Readonly<Record<string, number>>;
  otherWeight?: number;
  unlock?: ForgeUnlock;
}

export interface ForgeStage {
  id: ForgeStageId;
  label: string;
  choices: readonly ForgeChoice[];
}

const weight = (n: number, ...groups: string[]): Record<string, number> => Object.fromEntries(groups.map((group) => [group, n]));
const physical = ['added_phys', 'inc_phys', 'inc_phys_global'];
const crit = ['crit_chance', 'crit_multi', 'spell_crit', 'spell_crit_multi'];
const res = ['fire_res', 'cold_res', 'light_res', 'chaos_res', 'all_res'];
const life = ['flat_life', 'inc_life'];
const mana = ['flat_mana', 'inc_mana', 'mana_regen', 'mana_regen_flat', 'es_and_mana'];
const armour = ['flat_armour', 'inc_armour', 'inc_armour_global', 'flat_armour_es', 'inc_armour_es', 'flat_armour_evasion', 'inc_armour_evasion'];
const evasion = ['flat_evasion', 'inc_evasion', 'inc_evasion_global', 'flat_evasion_es', 'inc_evasion_es', 'flat_armour_evasion', 'inc_armour_evasion'];

function choice(id: string, name: string, level: number, effect: string, weights?: Record<string, number>, otherWeight?: number): ForgeChoice {
  return { id, name, level, effect, weights, otherWeight };
}

/** Stage options open up by practice, with a level floor, instead of by level alone. */
function needs(option: ForgeChoice, count: number, stage: ForgeStageId, ids?: string[]): ForgeChoice {
  return { ...option, unlock: { stage, ids, count } };
}

const weaponShape = [
  choice('heavy', 'Heavy', 1, 'Triple the weight of physical damage mods.', weight(3, ...physical)),
  choice('light', 'Light', 1, 'Triple the weight of attack speed and critical mods.', weight(3, 'attack_speed', ...crit)),
  needs(choice('balanced', 'Balanced', 10, 'Double the weight of accuracy and raise other weights by 30%.', weight(2, 'accuracy'), 1.3), 20, 'shape'),
];
const armourShape = [
  choice('plated', 'Plated', 1, 'Triple the weight of armour mods.', weight(3, ...armour)),
  choice('light', 'Light', 1, 'Triple the weight of evasion mods.', weight(3, ...evasion)),
  needs(choice('scaled', 'Scaled', 10, 'Double the weight of hybrid armour and evasion mods.', weight(2, 'flat_armour_evasion', 'inc_armour_evasion')), 20, 'shape'),
];
const jewelleryShape = [
  choice('band', 'Band', 1, 'Triple the weight of life and mana mods.', weight(3, ...life, ...mana)),
  choice('signet', 'Signet', 1, 'Triple the weight of attribute mods.', weight(3, 'strength', 'dexterity', 'intelligence', 'all_attributes')),
  needs(choice('twisted', 'Twisted', 10, 'Triple the weight of resistance mods.', weight(3, ...res)), 20, 'shape'),
];

const tempered = (option: ForgeChoice) => needs(option, 15, 'temper');
const edged = (option: ForgeChoice) => needs(option, 30, 'form');
const weaponEdge = [
  tempered(choice('keen', 'Keen', 8, 'Triple the weight of critical mods.', weight(3, ...crit))),
  tempered(choice('serrated', 'Serrated', 8, 'Double the weight of physical damage and bleeding mods.', weight(2, ...physical, 'inc_bleed', 'bleed_chance', 'damage_vs_bleeding'))),
  edged(choice('sturdy', 'Sturdy', 20, 'Double the weight of life and leech mods.', weight(2, ...life, 'life_leech', 'mana_leech', 'elem_leech'))),
];
const reinforced = tempered(choice('reinforced', 'Reinforced', 8, 'Triple the weight of life mods.', weight(3, ...life)));
const spiked = edged(choice('spiked', 'Spiked', 20, 'Triple the weight of thorns and reflected damage mods.', weight(3, 'forge_thorns')));
const jewellerySetting = [
  tempered(choice('closed', 'Closed', 8, 'Double the weight of resistance mods.', weight(2, ...res))),
  tempered(choice('clawed', 'Clawed', 8, 'Double the weight of critical mods.', weight(2, ...crit))),
  edged(choice('open', 'Open', 20, 'Triple the weight of rarity and gold mods.', weight(3, 'item_rarity', 'forge_gold'))),
];

const deep = needs(choice('deep', 'Deep', 3, 'Raise the lowest possible modifier tier by one.'), 8, 'shape');
const quick = needs(choice('quick', 'Quick', 3, 'Forge 30% faster.'), 8, 'shape');
const oiled = (option: ForgeChoice) => needs(option, 25, 'temper', ['deep', 'quick']);
const weaponOil = oiled(choice('oil', 'Oil quench', 20, 'Triple the weight of elemental damage mods.', weight(3,
  'added_fire', 'added_cold', 'added_light', 'inc_elem', 'spell_fire', 'spell_cold', 'spell_light', 'inc_fire', 'inc_cold', 'inc_light')));
const armourOil = oiled(choice('oil', 'Oil quench', 20, 'Triple the weight of resistance mods.', weight(3, ...res)));
const finish = [
  needs(choice('etched', 'Etched', 30, 'Add 10% item quality.'), 40, 'form'),
  needs(choice('gilded', 'Gilded', 45, 'Roll one additional modifier.'), 50, 'finish', ['etched']),
  needs(choice('blued', 'Blued', 45, 'Double the weight of resistance mods.', weight(2, ...res)), 50, 'finish', ['etched']),
];

/** The levels each option needed before practice unlocks. Saves from then keep what they had. */
export const FORGE_OLD_LEVELS: Readonly<Record<string, number>> = {
  'shape:balanced': 20, 'shape:scaled': 20, 'shape:twisted': 20,
  'temper:deep': 10, 'temper:quick': 10, 'temper:oil': 40,
  'form:keen': 15, 'form:serrated': 15, 'form:reinforced': 15, 'form:smooth': 15, 'form:closed': 15, 'form:clawed': 15,
  'form:sturdy': 30, 'form:spiked': 30, 'form:open': 30,
  'finish:etched': 50, 'finish:gilded': 60, 'finish:blued': 70,
};
const signature = [
  choice('amplified', 'Amplified', 80, 'Increase the alloy signature values by 50%.'),
  choice('twin', 'Twin-forged', 80, 'Roll one additional modifier.'),
  choice('ancestral', 'Ancestral', 80, 'Add two item levels, even above the Forge limit.'),
];

export function forgeTrinket(base: BaseDef): boolean {
  return base.tags.includes('jewellery');
}

export function forgeStages(base: BaseDef, master = false): ForgeStage[] {
  const weapon = base.slot === 'weapon';
  const jewellery = forgeTrinket(base);
  const shield = base.slot === 'offhand';
  const smooth = tempered(shield
    ? choice('smooth', 'Smooth', 8, 'Triple the weight of block mods.', weight(3, 'block_chance', 'spell_block'))
    : choice('smooth', 'Smooth', 8, 'Double the weight of life regeneration mods.', weight(2, 'life_regen', 'life_regen_pct')));
  return [
    { id: 'shape', label: 'Shape', choices: weapon ? weaponShape : jewellery ? jewelleryShape : armourShape },
    { id: 'temper', label: 'Temper', choices: [deep, quick, weapon ? weaponOil : armourOil] },
    { id: 'form', label: weapon ? 'Edge' : jewellery ? 'Setting' : 'Rim', choices: weapon ? weaponEdge : jewellery ? jewellerySetting : [reinforced, smooth, spiked] },
    { id: 'finish', label: 'Finish', choices: finish },
    ...(master ? [{ id: 'signature' as const, label: 'Signature', choices: signature }] : []),
  ];
}

export function masterFormLevel(base: BaseDef): number {
  if (base.slot === 'weapon') return base.twoHanded ? 85 : 80;
  return forgeTrinket(base) ? 92 : 88;
}

export const FORGE_CHAPTERS = [
  ['sword', 'One-handed swords'], ['axe', 'One-handed axes'], ['mace', 'One-handed maces'], ['twohand', 'Two-handed weapons'],
  ['offhand', 'Shields'], ['helmet', 'Helmets'], ['body', 'Body armour'], ['gloves', 'Gloves'], ['boots', 'Boots'],
  ['ring', 'Rings'], ['amulet', 'Amulets'], ['belt', 'Belts'],
] as const;
export type ForgeChapter = typeof FORGE_CHAPTERS[number][0];
export const FORGE_CHAPTER_SIZE = 10;

export function forgeChapter(base: BaseDef): ForgeChapter | undefined {
  if (base.slot !== 'weapon') return base.slot;
  if (base.twoHanded) return 'twohand';
  if (base.family === 'sword' || base.family === 'axe' || base.family === 'mace') return base.family;
  return undefined;
}

export const STAGED_FORGE_PREFIX = 'staged_forge_';

/** Authored before the common XP scaling and task mastery are applied. */
export function stagedForgeActions(cheap: SkillAction[]): SkillAction[] {
  return cheap.filter((a) => {
    if (!a.baseId) return false;
    const base = baseDef(a.baseId);
    return obtainable(base) && (a.skill === 'smithing' || base.slot === 'weapon');
  }).map((a) => {
    const base = baseDef(a.baseId!);
    return {
      ...a, skill: 'smithing', id: STAGED_FORGE_PREFIX + base.id, name: `Shape ${base.name}`, intervalMs: 60_000 + 2000 * base.reqLevel,
      xp: (18 + 1.8 * base.reqLevel) / 0.3,
      inputs: Object.fromEntries(Object.entries(a.inputs ?? {}).map(([id, qty]) => [id, qty * 2])),
    };
  });
}

/** Copper starts at 900 ms and World metal ends at 550 ms. */
export function forgeBeatMs(action?: SkillAction): number {
  const metal = Object.keys(action?.inputs ?? {}).find((id) => id.endsWith('_bar'));
  const index = Math.max(0, MINING_METALS.findIndex((m) => `${m.id}_bar` === metal));
  return 900 - index * 350 / (MINING_METALS.length - 1);
}

export interface ForgeSignature {
  id: MasterAlloyId;
  multiplier: number;
}

interface WeaponSignatureEffect {
  name: string;
  stat: StatKey;
  value: number;
}

export const WEAPON_ALLOY_SIGNATURES: Record<MasterAlloyId, readonly [WeaponSignatureEffect, WeaponSignatureEffect]> = {
  kingsbronze: [
    { name: 'Keen Crown', stat: 'critChancePct', value: 18 },
    { name: 'Crownstrike', stat: 'critMulti', value: 12 },
  ],
  moonsilver: [
    { name: 'Moonflow', stat: 'castSpeedPct', value: 8 },
    { name: 'Silver Current', stat: 'manaRegenPct', value: 18 },
  ],
  dragonsteel: [
    { name: 'Dragonfire', stat: 'firePct', value: 18 },
    { name: 'Blood Temper', stat: 'bleedPct', value: 18 },
  ],
  voidglass: [
    { name: 'Void Echo', stat: 'chaosPct', value: 18 },
    { name: 'Glass Venom', stat: 'poisonPct', value: 18 },
  ],
};

export interface WeaponMasterySignature {
  alloy: MasterAlloyId;
  effect: 0 | 1;
}

export function weaponAlloySignatureText(effect: WeaponSignatureEffect): string {
  return `${effect.name} · ${describeStat(effect.stat, effect.value)}`;
}

type SignatureStats = readonly (readonly [StatKey, number])[];
const signatureStats: Record<MasterAlloyId, SignatureStats> = {
  kingsbronze: [['itemRarity', 20]],
  moonsilver: [['energyShieldPct', 8], ['manaPct', 8]],
  dragonsteel: [['physAsFire', 12]],
  voidglass: [['chaosRes', 15], ['damageAsChaos', 10]],
};

export function forgeImplicits(item: { forgeSignatures?: ForgeSignature[]; weaponMasterySignature?: WeaponMasterySignature }): Implicit[] {
  const implicits = (item.forgeSignatures ?? []).flatMap(({ id, multiplier }) =>
    (signatureStats[id] ?? []).map(([stat, value]) => {
      const scaled = value * multiplier;
      const text = stat === 'damageAsChaos' ? `Gain ${scaled}% of Damage as extra Chaos Damage`
        : stat === 'physAsFire' ? `Gain ${scaled}% of Physical Damage as extra Fire Damage`
        : describeStat(stat, scaled);
      return { stat, value: scaled, text };
    }),
  );
  const signature = item.weaponMasterySignature;
  const effect = signature && WEAPON_ALLOY_SIGNATURES[signature.alloy]?.[signature.effect];
  if (effect) implicits.push({ stat: effect.stat, value: effect.value, text: weaponAlloySignatureText(effect) });
  return implicits;
}

export function hasKingsbronze(item: { forgeSignatures?: ForgeSignature[] }): boolean {
  return item.forgeSignatures?.some(({ id }) => id === 'kingsbronze') ?? false;
}

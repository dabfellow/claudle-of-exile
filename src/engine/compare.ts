import { baseDef } from '../data/bases';
import { activeGemDef, BASE_ATTACK_MS, DEFAULT_ATTACK } from '../data/gems';
import { monsterDamage } from '../data/zones';
import { defaultSlot } from './equipment';
import { gemAttrReason, gemWeaponReason, skillSummary } from './gems';
import { armourReduction, deriveStats, evadeChance, hitChance, itemDefences, itemStats, weaponPhys, type Derived } from './stats';
import type { EquipSlot, GameState, Item } from './types';

export interface CompareRow {
  label: string;
  before: number;
  after: number;
  digits?: number;
  unit?: string;
  /** shown in place of the two numbers, as a damage range is */
  text?: [string, string];
}

export interface CompareSkill {
  name: string;
  /** damage per second */
  before: number;
  after: number;
  /** why the skill stops working with this item on */
  blocked?: string;
}

export interface GearComparison {
  slot: EquipSlot;
  worn: Item | null;
  /** a two-hander and an off-hand push each other out */
  alsoRemoves: Item | null;
  /** the two items' own numbers */
  base: CompareRow[];
  skills: CompareSkill[];
  /** what changes on the character, only where something does */
  character: CompareRow[];
}

type Figure = Omit<CompareRow, 'before' | 'after'> & { value: number; shown?: string };

/** A weapon's listed Weapon DPS; 0 for anything else. */
export function weaponDps(item: Item): number {
  return itemFigures(item).find((f) => f.label === 'Weapon DPS')?.value ?? 0;
}

/** One item's own numbers, the ones printed at the top of its tooltip. */
function itemFigures(item: Item | null): Figure[] {
  if (!item) return [];
  const base = baseDef(item.baseId);
  const st = itemStats(item);
  const out: Figure[] = [];
  if (base.slot === 'weapon' && base.phys) {
    const [lo, hi] = weaponPhys(item);
    const phys = (lo + hi) / 2;
    const elem = ((st.fireMin ?? 0) + (st.fireMax ?? 0) + (st.coldMin ?? 0) + (st.coldMax ?? 0) + (st.lightMin ?? 0) + (st.lightMax ?? 0) + (st.chaosMin ?? 0) + (st.chaosMax ?? 0)) / 2;
    const perSecond = (1000 * (1 + (base.speed ?? 0) / 100)) / BASE_ATTACK_MS;
    out.push({ label: 'Physical Damage', value: phys, digits: 1, shown: `${lo}–${hi}` });
    if (elem) out.push({ label: 'Added Damage', value: elem, digits: 1 });
    out.push({ label: 'Attacks per Second', value: perSecond, digits: 2 });
    out.push({ label: 'Base Crit', value: base.crit ?? 5, digits: 1, unit: '%' });
    out.push({ label: 'Weapon DPS', value: (phys + elem) * perSecond, digits: 1 });
  }
  if (base.tags.includes('armour')) {
    const def = itemDefences(item);
    if (def.armour) out.push({ label: 'Armour', value: def.armour });
    if (def.evasion) out.push({ label: 'Evasion', value: def.evasion });
    if (def.energyShield) out.push({ label: 'Energy Shield', value: def.energyShield });
  }
  if (st.blockChance) out.push({ label: 'Block', value: st.blockChance, unit: '%' });
  return out;
}

function compareFigures(worn: Item | null, item: Item): CompareRow[] {
  const was = itemFigures(worn);
  const now = itemFigures(item);
  const labels = [...new Set([...now, ...was].map((f) => f.label))];
  return labels.map((label) => {
    const a = was.find((f) => f.label === label);
    const b = now.find((f) => f.label === label);
    const { digits, unit } = (b ?? a)!;
    const row: CompareRow = { label, before: a?.value ?? 0, after: b?.value ?? 0, digits, unit };
    if (a?.shown || b?.shown) row.text = [a?.shown ?? '–', b?.shown ?? '–'];
    return row;
  });
}

/** Every damage skill on the bar, or the default attack with an empty bar. */
function compareSkills(s: GameState, before: Derived, after: Derived): CompareSkill[] {
  const bar = s.skillBar.filter((g) => g && skillSummary(before, g).perUse > 0);
  if (!bar.length) return [{ name: DEFAULT_ATTACK.name, before: skillSummary(before, null).perSecond, after: skillSummary(after, null).perSecond }];
  return bar.map((gem) => {
    const blocked = gemWeaponReason(gem!.gemId, after.weaponFamily) ?? gemAttrReason(after.attributes, gem!);
    const usable = !gemWeaponReason(gem!.gemId, before.weaponFamily) && !gemAttrReason(before.attributes, gem!);
    return {
      name: activeGemDef(gem!.gemId).name,
      before: usable ? skillSummary(before, gem).perSecond : 0,
      after: skillSummary(after, gem).perSecond,
      blocked: blocked ?? undefined,
    };
  });
}

/** What changes on the character, read against monsters of your own level. */
function compareCharacter(before: Derived, after: Derived): CompareRow[] {
  const level = before.combatLevel;
  const rows: (Omit<CompareRow, 'before' | 'after'> & { get: (d: Derived) => number })[] = [
    { label: 'Max Life', get: (d) => d.maxLife },
    { label: 'Max Mana', get: (d) => d.maxMana },
    { label: 'Energy Shield', get: (d) => d.maxEs },
    { label: 'Armour', get: (d) => d.armour },
    { label: 'Physical Hit Reduced', get: (d) => armourReduction(d.armour, monsterDamage(level)) * 100, digits: 1, unit: '%' },
    { label: 'Evasion', get: (d) => d.evasion },
    { label: 'Chance to Evade', get: (d) => evadeChance(d.evasion, level) * 100, digits: 1, unit: '%' },
    { label: 'Block', get: (d) => Math.min(75, d.raw.blockChance), unit: '%' },
    { label: 'Fire Res', get: (d) => d.res.fire, unit: '%' },
    { label: 'Cold Res', get: (d) => d.res.cold, unit: '%' },
    { label: 'Lightning Res', get: (d) => d.res.light, unit: '%' },
    { label: 'Life Regen', get: (d) => d.lifeRegen, digits: 1 },
    { label: 'Strength', get: (d) => d.attributes.str },
    { label: 'Dexterity', get: (d) => d.attributes.dex },
    { label: 'Intelligence', get: (d) => d.attributes.int },
    { label: 'Chance to Hit', get: (d) => hitChance(d.accuracy, level) * 100, digits: 1, unit: '%' },
    { label: 'Crit Chance', get: (d) => d.critChance, digits: 1, unit: '%' },
    { label: 'Item Rarity', get: (d) => d.itemRarity, unit: '%' },
    { label: 'Skill Speed', get: (d) => d.skillSpeed, unit: '%' },
  ];
  return rows
    .map(({ get, ...r }) => ({ ...r, before: get(before), after: get(after) }))
    .filter((r) => Math.abs(r.after - r.before) > 0.05);
}

/** What changes if `item` goes into its slot. Null for something already worn. */
export function compareItem(s: GameState, item: Item, into?: EquipSlot): GearComparison | null {
  if (Object.values(s.equipment).some((e) => e?.uid === item.uid)) return null;
  const slot = into ?? defaultSlot(s, item);
  const worn = s.equipment[slot] ?? null;
  const mainHand = s.equipment.weapon ? baseDef(s.equipment.weapon.baseId) : null;
  // the same clash equip() settles
  const clash: EquipSlot | null = slot === 'weapon' && baseDef(item.baseId).twoHanded && s.equipment.offhand ? 'offhand' : slot === 'offhand' && mainHand?.twoHanded ? 'weapon' : null;
  const equipment = { ...s.equipment, [slot]: item };
  if (clash) delete equipment[clash];
  const before = deriveStats(s, []);
  const after = deriveStats({ ...s, equipment }, []);
  return {
    slot,
    worn,
    alsoRemoves: clash ? s.equipment[clash] ?? null : null,
    base: compareFigures(worn, item),
    skills: compareSkills(s, before, after),
    character: compareCharacter(before, after),
  };
}

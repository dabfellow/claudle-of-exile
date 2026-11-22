import type { StatKey } from '../engine/types';
import { baseDef } from './bases';

export type WoodFamily = 'bow' | 'staff' | 'wand' | 'cloth' | 'leather';
export type Jig = 'bow' | 'lathe' | 'form';
type Side = { label: string; stat: StatKey; groups: string[] };
type Dial = { name: string; sides: [Side, Side] };

const side = (label: string, stat: StatKey, ...groups: string[]): Side => ({ label, stat, groups });
const dial = (name: string, left: Side, right: Side): Dial => ({ name, sides: [left, right] });
const balance = dial('Balance', side('Spell damage', 'spellPct', 'spell_damage'), side('Cast speed', 'castSpeedPct', 'cast_speed'));
const padding = dial('Padding', side('Life', 'lifePct', 'flat_life'), side('Mana', 'manaPct', 'flat_mana'));
const channel = dial('Channel', side('Mana regeneration', 'manaRegenPct', 'mana_regen'), side('Maximum mana', 'manaPct', 'flat_mana'));
const crit = side('Critical chance', 'critChancePct', 'crit_chance', 'spell_crit_chance');

export const WOOD_FAMILIES: Record<WoodFamily, { name: string; jig: Jig; dials: [Dial, Dial, Dial] }> = {
  bow: { name: 'Bows', jig: 'bow', dials: [
    dial('Draw weight', side('Physical damage', 'localPhysPct', 'inc_phys', 'added_phys'), side('Attack speed', 'attackSpeedPct', 'attack_speed')),
    dial('Flex', crit, side('Accuracy', 'woodAccuracyPct', 'accuracy')),
    dial('Fletching', side('Elemental damage', 'elemPct', 'elem_attack', 'added_fire', 'added_cold', 'added_light'), side('Projectile speed', 'woodProjectileSpeed', 'attack_speed')),
  ] },
  staff: { name: 'Staves', jig: 'lathe', dials: [
    balance, dial('Heft', side('Block chance', 'blockChance', 'block'), side('Energy shield', 'energyShieldPct', 'inc_es', 'flat_es')), channel,
  ] },
  wand: { name: 'Wands', jig: 'lathe', dials: [
    balance, dial('Spark', crit, side('Critical multiplier', 'critMulti', 'crit_multi')), channel,
  ] },
  cloth: { name: 'Cloth', jig: 'form', dials: [
    dial('Cut', side('Energy shield', 'energyShieldPct', 'inc_es', 'flat_es'), side('Evasion', 'evasionPct', 'inc_evasion', 'flat_evasion')),
    padding, dial('Weave', side('Elemental resistances', 'allRes', 'fire_res', 'cold_res', 'light_res', 'all_res'), side('Movement speed', 'moveSpeedPct', 'move_speed')),
  ] },
  leather: { name: 'Leather', jig: 'form', dials: [
    dial('Cut', side('Evasion', 'evasionPct', 'inc_evasion', 'flat_evasion'), side('Armour', 'armourPct', 'inc_armour', 'flat_armour')),
    padding, dial('Stitching', side('Life regeneration', 'lifeRegenPct', 'life_regen'), side('Maximum life', 'lifePct', 'flat_life')),
  ] },
};

export const JIGS: Record<Jig, string> = { bow: 'Bow jig', lathe: 'Staff lathe', form: 'Robe form' };
export const JIG_TIERS = [
  { level: 20, material: 'oak_plank', count: 100 },
  { level: 50, material: 'ironwood_plank', count: 200 },
  { level: 75, material: 'spirit_plank', count: 300 },
] as const;

export function woodFamily(id: string): WoodFamily {
  const base = baseDef(id);
  if (base.family === 'bow' || (base.slot === 'offhand' && base.id.includes('quiver'))) return 'bow';
  if (base.family === 'staff' || base.family === 'wand') return base.family;
  return base.tags.includes('int_armour') ? 'cloth' : 'leather';
}

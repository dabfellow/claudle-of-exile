import { describe, expect, it } from 'vitest';
import { attributeReq, BASES, baseDef, WEAPON_FAMILIES, type WeaponFamily } from '../src/data/bases';
import { makeCtx } from '../src/engine/context';
import { equip } from '../src/engine/equipment';
import { gemWeaponReason } from '../src/engine/gems';
import { createItem } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { charXpForLevel } from '../src/engine/xp';

const ctx = (seed = 1) => makeCtx(seeded(seed));

describe('weapon families', () => {
  it('gives every weapon base a family, its attributes and its built-in mod', () => {
    const weapons = BASES.filter((b) => b.slot === 'weapon');
    for (const b of weapons) {
      expect(b.family, b.id).toBeDefined();
      const fam = WEAPON_FAMILIES[b.family!];
      expect(Object.keys(attributeReq(b)).sort()).toEqual([...fam.attrs].sort());
      expect(b.implicits?.length, b.id).toBeGreaterThan(0);
    }
    const families = new Set(weapons.map((b) => b.family));
    for (const f of Object.keys(WEAPON_FAMILIES) as WeaponFamily[]) expect(families.has(f), f).toBe(true);
  });

  it('only staves and bows are two-handed', () => {
    for (const b of BASES.filter((x) => x.slot === 'weapon')) expect(!!b.twoHanded, b.id).toBe(b.family === 'staff' || b.family === 'bow');
  });

  it('bows make attacks ranged; wands add spell damage', () => {
    const s = newGame(1, { name: 'T', classId: 'ranger' });
    s.equipment.weapon = createItem(s, 'short_bow', 1, 'normal', seeded(1));
    expect(deriveStats(s, []).ranged).toBe(true);
    expect(deriveStats(s, []).raw.projectilePct).toBeGreaterThan(0);
    s.equipment.weapon = createItem(s, 'driftwood_wand', 1, 'normal', seeded(1));
    expect(deriveStats(s, []).ranged).toBe(false);
    expect(deriveStats(s, []).raw.spellPct).toBe(31);
  });

  it('a staff pushes the offhand out, and an offhand pushes the staff out', () => {
    const s = newGame(1, { name: 'T', classId: 'mage' });
    s.skills.combat = charXpForLevel(10);
    const shield = createItem(s, 'plank_shield', 1, 'normal', seeded(2));
    s.inventory.push(shield);
    expect(equip(s, ctx(), shield.uid)).toBeNull();

    const staff = createItem(s, 'gnarled_staff', 4, 'normal', seeded(3));
    s.inventory.push(staff);
    expect(equip(s, ctx(), staff.uid)).toBeNull();
    expect(s.equipment.weapon?.uid).toBe(staff.uid);
    expect(s.equipment.offhand).toBeUndefined();
    expect(s.inventory.some((i) => i.uid === shield.uid)).toBe(true);
    expect(deriveStats(s, []).raw.blockChance).toBe(baseDef('gnarled_staff').implicits![1].value);

    expect(equip(s, ctx(), shield.uid)).toBeNull();
    expect(s.equipment.offhand?.uid).toBe(shield.uid);
    expect(s.equipment.weapon).toBeUndefined();
  });

  it('spells need a wand, staff or sceptre; curses work with anything', () => {
    for (const f of ['wand', 'staff', 'sceptre'] as const) expect(gemWeaponReason('spark', f), f).toBeNull();
    for (const f of ['dagger', 'sword', 'mace', 'axe', 'bow', null] as const) expect(gemWeaponReason('spark', f), f ?? 'unarmed').toBe('Needs a Wand, Staff or Sceptre');
    expect(gemWeaponReason('frost_ward', 'mace')).toBe('Needs a Wand, Staff or Sceptre');
    expect(gemWeaponReason('enfeeble', 'dagger')).toBeNull();
    expect(gemWeaponReason('enfeeble', null)).toBeNull();
  });

  it('daggers roll no caster mods; sceptres roll both', () => {
    const tags = (id: string) => baseDef(id).tags;
    expect(tags('whittled_dagger')).toContain('attack_weapon');
    expect(tags('whittled_dagger')).not.toContain('caster_weapon');
    const sceptre = BASES.find((b) => b.family === 'sceptre')!;
    expect(sceptre.tags).toEqual(expect.arrayContaining(['attack_weapon', 'caster_weapon']));
  });
});

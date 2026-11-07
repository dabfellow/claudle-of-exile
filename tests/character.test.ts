import { describe, expect, it } from 'vitest';
import { ACTIVE_GEMS, type GemTag } from '../src/data/gems';
import { equipFrom, moveToStash, salvageAny } from '../src/engine/itemActions';
import { zoneDef } from '../src/data/zones';
import { openReachedZones, zoneLockText } from '../src/engine/progress';
import { areaXpLabel, areaXpMultiplier } from '../src/engine/character';
import { makeCtx } from '../src/engine/context';
import { equip, slotsFor } from '../src/engine/equipment';
import { createItem } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { charXpForLevel } from '../src/engine/xp';
import { veteran } from './helpers';

const ctx = (seed = 1) => makeCtx(seeded(seed));

describe('xp for your level against the area', () => {
  const range: [number, number] = [10, 13];

  it('is normal throughout the range and within two levels either side', () => {
    for (const level of [8, 9, 10, 11, 12, 13, 14, 15]) expect(areaXpMultiplier(level, range)).toBe(1);
  });

  it('curves the penalty more steeply each level against easier areas and never below 30% XP', () => {
    const over = [3, 4, 5, 6, 7, 8, 9, 10, 25, 100].map((gap) => areaXpMultiplier(range[1] + gap, range));
    [0.9, 0.89, 0.85, 0.79, 0.7, 0.59, 0.46, 0.3, 0.3, 0.3].forEach((want, i) => expect(over[i]).toBeCloseTo(want, 6));
    const losses = over.slice(0, 7).map((mult, i) => mult - over[i + 1]);
    for (let i = 1; i < losses.length; i++) expect(losses[i]).toBeGreaterThan(losses[i - 1]);
  });

  it('pays 5% extra against areas three levels harder, reaching the 20% cap at five', () => {
    expect(areaXpMultiplier(7, range)).toBeCloseTo(1.05, 6);
    expect(areaXpMultiplier(6, range)).toBeCloseTo(1.125, 6);
    expect(areaXpMultiplier(5, range)).toBeCloseTo(1.2, 6);
    expect(areaXpMultiplier(1, range)).toBeCloseTo(1.2, 6);
  });

  it('labels the change for players', () => {
    expect(areaXpLabel(11, range)).toBe('');
    expect(areaXpLabel(8, range)).toBe('');
    expect(areaXpLabel(15, range)).toBe('');
    expect(areaXpLabel(7, range)).toBe('+5% XP');
    expect(areaXpLabel(6, range)).toBe('+12.5% XP');
    expect(areaXpLabel(5, range)).toBe('+20% XP');
    expect(areaXpLabel(16, range)).toBe('−10% XP');
    expect(areaXpLabel(18, range)).toBe('−15% XP');
    expect(areaXpLabel(21, range)).toBe('−41% XP');
    expect(areaXpLabel(38, range)).toBe('−70% XP');
  });
});

describe('hands and fingers', () => {
  it('a one-handed weapon fits either hand; a shield only the off hand; there are four ring fingers', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    expect(slotsFor(createItem(s, 'rusted_sword', 1, 'normal', seeded(1)))).toEqual(['weapon', 'offhand']);
    expect(slotsFor(createItem(s, 'plank_shield', 1, 'normal', seeded(1)))).toEqual(['offhand']);
    expect(slotsFor(createItem(s, 'gnarled_staff', 4, 'normal', seeded(1)))).toEqual(['weapon']);
    expect(slotsFor(createItem(s, 'iron_ring', 1, 'normal', seeded(1)))).toHaveLength(4);
  });

  it('dual wielding averages the two weapons for damage but swings at the main hand speed; a plain click still replaces the main hand', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.skills.combat = charXpForLevel(10);
    const single = deriveStats(s, []);
    const second = createItem(s, 'whittled_dagger', 1, 'normal', seeded(2));
    s.inventory.push(second);
    expect(equip(s, ctx(), second.uid, 'offhand')).toBeNull();
    const dual = deriveStats(s, []);
    expect(dual.dualWield).toBe(true);
    // sword 4–10 and dagger 3–9 average to 3.5–9.5 before increases
    expect(dual.hit.phys[0] + dual.hit.phys[1]).toBeLessThanOrEqual(single.hit.phys[0] + single.hit.phys[1]);
    // the off-hand dagger's speed doesn't count: you swing at the main hand's pace
    expect(dual.attackSpeed).toBeCloseTo(single.attackSpeed, 6);

    const third = createItem(s, 'rusted_sword', 1, 'normal', seeded(3));
    s.inventory.push(third);
    expect(equip(s, ctx(), third.uid)).toBeNull();
    expect(s.equipment.weapon?.uid).toBe(third.uid);
    expect(s.equipment.offhand?.uid).toBe(second.uid);
  });

  it('rings fill all four fingers before replacing one', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    const rings = [1, 2, 3, 4, 5].map((n) => createItem(s, 'iron_ring', 1, 'normal', seeded(n)));
    s.inventory.push(...rings);
    for (const r of rings.slice(0, 4)) expect(equip(s, ctx(), r.uid)).toBeNull();
    expect([s.equipment.ring1, s.equipment.ring2, s.equipment.ring3, s.equipment.ring4].map((r) => r?.uid)).toEqual(rings.slice(0, 4).map((r) => r.uid));
    expect(equip(s, ctx(), rings[4].uid)).toBeNull();
    expect(s.equipment.ring1?.uid).toBe(rings[4].uid);
  });
});

describe('recovery', () => {
  it('nobody regenerates life or mana in a fight without gear or passives for it', () => {
    const s = newGame(1, { name: 'T', classId: 'mage' });
    s.equipment = {};
    const d = deriveStats(s, []);
    expect(d.lifeRegen).toBe(0);
    expect(d.manaRegen).toBe(0);
  });

  it('increased mana regeneration scales flat mana regeneration', () => {
    const s = newGame(1, { name: 'T', classId: 'mage' });
    s.equipment = {};
    s.passives = [];
    const ring = createItem(s, 'iron_ring', 1, 'normal', seeded(1));
    ring.rarity = 'magic';
    ring.suffixes = [{ affixId: 'mana_regen_flat', tier: 0, values: [4] }];
    s.equipment.ring1 = ring;
    expect(deriveStats(s, []).manaRegen).toBe(4);
    ring.prefixes = [];
    s.equipment.ring2 = { ...ring, uid: ring.uid + 1, suffixes: [{ affixId: 'mana_regen', tier: 0, values: [50] }] };
    expect(deriveStats(s, []).manaRegen).toBe(6);
  });

  it('a new character starts with a life flask and a mana flask', () => {
    const s = newGame(1);
    expect(s.flaskSlots.slice(0, 2).map((f) => f?.flaskId)).toEqual(['life_small', 'mana_small']);
  });
});

describe('save', () => {
  it('refunds the character tree for the mechanic-node overhaul', () => {
    const s = newGame(1, { name: 'T', classId: 'warrior' });
    s.version = 33;
    s.passives = ['t_class_str_crossing_str_1'];
    expect(deserialize(serialize(s)).passives).toEqual([]);
  });
});

describe('area unlocks', () => {
  it('one boss can open several areas, and an area can wait for a number of boss kills', () => {
    const brine = zoneDef('brinecaves');
    const ash = zoneDef('ashwood');
    const reed = zoneDef('blackreed');
    const saved = [brine.requires, ash.requires, reed.requires];
    try {
      // the Mud Flats boss opens both caves and woods; the marsh needs any 3 Act 1 bosses
      brine.requires = { after: ['mudflats'] };
      ash.requires = { after: ['mudflats'] };
      reed.requires = { after: ['brinecaves', 'ashwood'], bosses: 3 };
      const s = newGame(1);
      s.bossesDefeated = ['mudflats'];
      openReachedZones(s);
      expect(s.unlockedZones).toEqual(expect.arrayContaining(['brinecaves', 'ashwood']));
      expect(s.unlockedZones).not.toContain('blackreed');
      expect(zoneLockText(s, reed)).toMatch(/2 more Act 1 bosses/);
      s.bossesDefeated.push('ashwood');
      openReachedZones(s);
      expect(s.unlockedZones).not.toContain('blackreed');
      s.bossesDefeated.push('brinecaves');
      openReachedZones(s);
      expect(s.unlockedZones).toContain('blackreed');
    } finally {
      [brine.requires, ash.requires, reed.requires] = saved;
    }
  });
});

describe('item menu actions', () => {
  it('equips, stashes and salvages from wherever the item is', () => {
    const s = veteran(newGame(1, { name: 'T', classId: 'warrior' }));
    const c = ctx();
    const ring = createItem(s, 'iron_ring', 1, 'normal', seeded(4));
    s.ground.push(ring);
    // a full bag doesn't stop equipping straight off the ground
    while (s.inventory.length < 60) s.inventory.push(createItem(s, 'iron_ring', 1, 'normal', seeded(s.inventory.length + 10)));
    expect(equipFrom(s, c, ring.uid)).toBeNull();
    expect(s.equipment.ring1?.uid).toBe(ring.uid);
    expect(s.inventory).toHaveLength(60);
    // worn gear straight into the stash
    expect(moveToStash(s, c, ring.uid)).toBeNull();
    expect(s.equipment.ring1).toBeUndefined();
    expect(s.account.stash[0].some((i) => i.uid === ring.uid)).toBe(true);
    // salvage from the floor
    const junk = createItem(s, 'iron_ring', 1, 'normal', seeded(99));
    s.ground.push(junk);
    const dust = s.account.bank.arcane_dust ?? 0;
    expect(salvageAny(s, c, junk.uid)).toBeNull();
    expect(s.ground).toHaveLength(0);
    expect(s.account.bank.arcane_dust).toBeGreaterThan(dust);
  });
});

describe('cooldowns', () => {
  it('attacks and main spells have none (mana limits them); guards, buffs, other spells, heavy slams, storms, movement, summon and drain skills keep theirs', () => {
    for (const g of ACTIVE_GEMS) {
      const t = (tag: GemTag) => g.tags.includes(tag);
      const freeAttack = t('attack') && !t('movement') && !t('minion') && !t('totem') && !t('sustain') && !(t('heavy') && t('area')) && !t('storm') && !t('warcry');
      const freeSpell = t('spell') && g.role === 'main';
      expect(g.cooldownMs === 0, g.id).toBe(freeAttack || freeSpell);
    }
  });
});

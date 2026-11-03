import { describe, expect, it } from 'vitest';
import { baseDef, BASES } from '../src/data/bases';
import { refreshVendor } from '../src/engine/hideout';
import { createItem, droppableBases } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { charXpForLevel } from '../src/engine/xp';

describe('retired bases', () => {
  const retired = BASES.filter((b) => b.retired).map((b) => b.id);

  it('the Bone and Quartz Wands are retired', () => {
    expect(retired).toEqual(['bone_wand', 'quartz_wand']);
  });

  it('never drop and never stock the shops', () => {
    expect(droppableBases(100).some((b) => b.retired)).toBe(false);
    const s = newGame(1, { name: 't', classId: 'mage' });
    s.skills.combat = charXpForLevel(40);
    for (let i = 0; i < 50; i++) {
      refreshVendor(s, seeded(i));
      expect(s.vendor.stock.filter((o) => o.item && retired.includes(o.item.baseId))).toEqual([]);
    }
  });

  it('one already owned still loads, equips and counts', () => {
    const s = newGame(1, { name: 't', classId: 'mage' });
    s.skills.combat = charXpForLevel(25);
    s.equipment.weapon = createItem(s, 'quartz_wand', 25, 'rare', seeded(1));
    const back = deserialize(serialize(s));
    expect(baseDef(back.equipment.weapon!.baseId).name).toBe('Quartz Wand');
    expect(deriveStats(back).weaponFamily).toBe('wand');
  });
});

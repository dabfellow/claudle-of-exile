import { describe, expect, it } from 'vitest';
import { createItem } from '../src/engine/items';
import { recipeMaterialCount, payCost } from '../src/engine/bank';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { itemStats } from '../src/engine/stats';

describe('workshop materials and gear across existing systems', () => {
  it('spends sized rough in old recipes without consuming the same piece twice', () => {
    const s = newGame(1);
    const bank = s.storage.bank;
    bank.rough_gem_large = 2;
    bank.rough_gem_giant = 2;
    expect(recipeMaterialCount(bank, 'rough_gem')).toBe(4);
    payCost(s, { rough_gem: 2, rough_gem_large: 1 });
    expect(bank.rough_gem_large).toBe(0);
    expect(bank.rough_gem_giant).toBe(1);
  });

  it('applies jewellery quality to rolled modifiers without changing the bench modifier or alloy signature', () => {
    const s = newGame(1);
    const item = createItem(s, 'diamond_ring', 70, 'normal', seeded(1));
    item.quality = 20;
    item.prefixes = [{ affixId: 'flat_life', tier: 2, values: [50] }];
    item.suffixes = [{ affixId: 'fire_res', tier: 1, values: [20], crafted: true }];
    item.forgeSignatures = [{ id: 'moonsilver', multiplier: 1 }];
    expect(itemStats(item)).toMatchObject({ life: 60, fireRes: 20, manaPct: 8, energyShieldPct: 8 });
  });
});

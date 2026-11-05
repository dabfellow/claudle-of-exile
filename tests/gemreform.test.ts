import { describe, expect, it } from 'vitest';
import { UNIQUES } from '../src/data/bases';
import { ACTIVE_GEMS, gemAct, SUPPORT_GEMS } from '../src/data/gems';
import { marketRules } from '../src/data/marketRules';
import { ZONES } from '../src/data/zones';
import { giveKeepsake } from '../src/engine/account';
import { holdItem } from '../src/engine/market';
import { createUnique } from '../src/engine/items';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';

const ATTRS = ['str', 'dex', 'int'] as const;
const ACTS = [1, 2, 3, 4, 5, 6];
const inCell = (act: number, attr: string) => ACTIVE_GEMS.filter((g) => gemAct(g.id) === act && g.attr === attr);
const covers = (act: number, attr: string, stat: 'lifeLeech' | 'manaLeech') =>
  SUPPORT_GEMS.some((g) => !g.signatureFor && g.mods[stat] && gemAct(g.id) <= act && (act <= 2 || (g.attr === attr && gemAct(g.id) === act)));

describe('the skill reform', () => {
  it.each(ACTS.flatMap((act) => ATTRS.map((attr) => [act, attr] as const)))('Act %i %s has every job', (act, attr) => {
    const gems = inCell(act, attr);
    const hits = gems.filter((g) => g.tags.includes('hit') && !g.effect.minion);
    expect(hits.some((g) => g.tags.includes('area')), 'area').toBe(true);
    expect(hits.some((g) => g.effect.targets === 'single' && !g.effect.leechLife && !g.effect.leechMana), 'single target').toBe(true);
    expect(gems.some((g) => g.role === 'guard'), 'guard').toBe(true);
    const lifeSkill = gems.some((g) => g.effect.leechLife || g.effect.consumeBleed);
    const manaSkill = gems.some((g) => g.effect.leechMana);
    expect(lifeSkill || covers(act, attr, 'lifeLeech'), 'life').toBe(true);
    expect(manaSkill || covers(act, attr, 'manaLeech'), 'mana').toBe(true);
  });

  it('no drain returns both life and mana', () => {
    for (const g of ACTIVE_GEMS) expect(!!(g.effect.leechLife && g.effect.leechMana), g.id).toBe(false);
  });

  it('keeps leech very weak until Acts 3-4', () => {
    for (const g of ACTIVE_GEMS.filter((x) => gemAct(x.id) <= 2)) {
      expect((g.effect.leechLife ?? 0) + (g.effect.leechMana ?? 0), g.id).toBeLessThanOrEqual(3);
    }
  });

  it('puts the leech supports on a steep mana cost', () => {
    for (const g of SUPPORT_GEMS.filter((x) => !x.signatureFor && (x.mods.lifeLeech || x.mods.manaLeech))) expect(g.mods.manaMult, g.id).toBe(1.8);
  });
});

describe('The Old Covenant', () => {
  const oldSave = () => {
    const raw = JSON.parse(serialize(newGame(1, { name: 't', classId: 'mage' })));
    raw.version = 32;
    return JSON.stringify(raw);
  };
  const rings = (s: ReturnType<typeof newGame>) => s.inventory.filter((i) => i.uniqueId === 'old_covenant').length;

  it('reaches a character from an older save exactly once', () => {
    const s = deserialize(oldSave());
    expect(giveKeepsake(s)).toBe(true);
    expect(rings(s)).toBe(1);
    expect(giveKeepsake(s)).toBe(false);
    const again = deserialize(serialize(s));
    expect(giveKeepsake(again)).toBe(false);
    expect(rings(again)).toBe(1);
  });

  it('never reaches a new character', () => {
    const s = deserialize(serialize(newGame(1, { name: 't', classId: 'mage' })));
    expect(giveKeepsake(s)).toBe(false);
    expect(rings(s)).toBe(0);
  });

  it('leeches life and mana, and has no drop source', () => {
    const s = newGame(1, { name: 't', classId: 'mage' });
    s.equipment.ring1 = createUnique(s, 'old_covenant', 1);
    expect(deriveStats(s).raw.lifeLeech).toBeGreaterThanOrEqual(3);
    expect(deriveStats(s).raw.manaLeech).toBe(2);
    expect(ZONES.some((z) => z.uniques.includes('old_covenant'))).toBe(false);
  });

  it("can't be listed on the market", () => {
    const s = newGame(1, { name: 't', classId: 'mage' });
    const ring = createUnique(s, 'old_covenant', 1);
    s.inventory.push(ring);
    expect(holdItem(s, 'op', ring.uid)).toBe("That item can't be traded");
    expect(rings(s)).toBe(1);
    expect(marketRules().uniques.old_covenant).toBeUndefined();
    expect(UNIQUES.filter((u) => u.noTrade).map((u) => u.id)).toEqual(['old_covenant', 'unbroken_temper']);
  });
});

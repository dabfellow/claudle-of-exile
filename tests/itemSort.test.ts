import { describe, expect, it } from 'vitest';
import { BASES } from '../src/data/bases';
import { weaponDps } from '../src/engine/compare';
import { equipReason } from '../src/engine/equipment';
import { createItem } from '../src/engine/items';
import { itemDefence, sortFigure, sortItems } from '../src/engine/itemSort';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import type { GameState, Item } from '../src/engine/types';

const make = (s: GameState, baseId: string, ilvl = 1): Item => createItem(s, baseId, ilvl, 'normal', seeded(s.nextUid));
const weapons = BASES.filter((b) => b.slot === 'weapon' && b.phys);
const armours = BASES.filter((b) => b.tags.includes('armour') && (b.armour ?? 0) > 0);
const lowest = (list: typeof BASES) => [...list].sort((a, b) => a.reqLevel - b.reqLevel)[0];
const highest = (list: typeof BASES) => [...list].sort((a, b) => b.reqLevel - a.reqLevel)[0];

describe('stash sorting', () => {
  it('item level puts the highest first, equal items newest first', () => {
    const s = newGame(1);
    const base = lowest(weapons).id;
    const [low, high, older, newer] = [make(s, base, 5), make(s, base, 50), make(s, base, 20), make(s, base, 20)];
    expect(sortItems([low, high, older, newer], 'ilvl', s)).toEqual([high, newer, older, low]);
  });

  it('can equip puts what this character can wear first', () => {
    const s = newGame(1);
    const locked = make(s, highest(weapons).id);
    const usable = make(s, lowest(weapons).id);
    expect(equipReason(s, locked)).not.toBeNull();
    expect(equipReason(s, usable)).toBeNull();
    expect(sortItems([locked, usable], 'equip', s)).toEqual([usable, locked]);
  });

  it('weapon DPS goes by the listed figure, with everything else after', () => {
    const s = newGame(1);
    const strong = make(s, highest(weapons).id);
    const weak = make(s, lowest(weapons).id);
    const armour = make(s, lowest(armours).id);
    expect(weaponDps(strong)).toBeGreaterThan(weaponDps(weak));
    expect(sortItems([armour, weak, strong], 'dps', s)).toEqual([strong, weak, armour]);
    expect(sortFigure(strong, 'dps')).toBe(`${weaponDps(strong).toFixed(1)} DPS`);
    expect(sortFigure(armour, 'dps')).toBeNull();
  });

  it('defence adds up the armour piece and leaves weapons last', () => {
    const s = newGame(1);
    const strong = make(s, highest(armours).id);
    const weak = make(s, lowest(armours).id);
    const weapon = make(s, lowest(weapons).id);
    expect(itemDefence(strong)).toBeGreaterThan(itemDefence(weak));
    expect(itemDefence(weapon)).toBe(0);
    expect(sortItems([weapon, weak, strong], 'defence', s)).toEqual([strong, weak, weapon]);
  });

  it('never changes the list it was given', () => {
    const s = newGame(1);
    const items = [make(s, lowest(weapons).id, 1), make(s, lowest(weapons).id, 9)];
    const before = [...items];
    sortItems(items, 'ilvl', s);
    expect(items).toEqual(before);
  });
});

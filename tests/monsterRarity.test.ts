import { describe, expect, it } from 'vitest';
import { affixDef } from '../src/data/affixes';
import { BASES } from '../src/data/bases';
import { monsterMod } from '../src/data/monsterMods';
import { zoneDef } from '../src/data/zones';
import { makeMonster, makeMonsterRarity, monsterXp } from '../src/engine/combat';
import { spawnWeight } from '../src/engine/items';
import { seeded } from '../src/engine/rng';

describe('monster rarity', () => {
  it('gives a magic pack one shared visible modifier and better rewards', () => {
    const a = makeMonster(zoneDef('mudflats').monsters[0], false);
    const b = makeMonster(zoneDef('mudflats').monsters[1], false);
    const plainLife = a.maxLife;
    const plainXp = monsterXp(a);
    makeMonsterRarity(a, 'magic', seeded(1), ['stalwart']);
    makeMonsterRarity(b, 'magic', seeded(2), ['stalwart']);
    expect(a.rarity).toBe('magic');
    expect(a.mods).toEqual(['stalwart']);
    expect(b.mods).toEqual(a.mods);
    expect(a.maxLife).toBe(Math.round(plainLife * 2.5 * 1.7));
    expect(monsterXp(a)).toBeGreaterThanOrEqual(plainXp * 3.5);
    expect(monsterXp(a)).toBeLessThanOrEqual(plainXp * 3.5 + 1);
    expect(a.lootMult).toBe(2);
  });

  it('gives rares three non-conflicting modifiers and a larger reward', () => {
    const def = { ...zoneDef('mudflats').monsters[0], level: 40 };
    const rare = makeMonster(def, false);
    makeMonsterRarity(rare, 'rare', seeded(7));
    expect(rare.mods).toHaveLength(3);
    expect(new Set(rare.mods.map((id) => monsterMod(id).group)).size).toBe(3);
    expect(rare.xpMult).toBe(8.5);
    expect(rare.lootMult).toBe(4);
  });

  it('marks bosses as unique rarity with their mechanics', () => {
    const boss = makeMonster(zoneDef('mudflats').boss, true);
    expect(boss.isBoss).toBe(true);
    expect(boss.rarity).toBe('unique');
    expect(boss.mechanics.length).toBeGreaterThan(0);
  });
});

describe('gear modifier pools', () => {
  it('keeps movement speed on boots only', () => {
    const movement = affixDef('movement_speed');
    const eligible = BASES.filter((base) => spawnWeight(movement, base) > 0);
    expect(eligible.length).toBeGreaterThan(0);
    expect(eligible.every((base) => base.slot === 'boots')).toBe(true);
  });

  it('keeps spell modifiers off pure attack weapons', () => {
    const spell = affixDef('spell_damage');
    const attackOnly = BASES.filter((base) => base.tags.includes('attack_weapon') && !base.tags.includes('caster_weapon'));
    expect(attackOnly.length).toBeGreaterThan(0);
    expect(attackOnly.every((base) => spawnWeight(spell, base) === 0)).toBe(true);
  });
});

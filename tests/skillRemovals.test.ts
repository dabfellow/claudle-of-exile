import { describe, expect, it } from 'vitest';
import { PROFESSION_PROJECTS } from '../src/data/professionProjects';
import { actionsFor } from '../src/data/skills';
import { createItem } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { xpToReach } from '../src/engine/xp';

describe('Skill removals (Agility, Cooking, Rune-carving)', () => {
  it('removes Agility, Cooking and Rune-carving actions and feast projects', () => {
    expect(actionsFor('agility')).toHaveLength(0);
    expect(actionsFor('cooking')).toHaveLength(0);
    expect(actionsFor('runecarving')).toHaveLength(0);
    expect(PROFESSION_PROJECTS.some((p) => p.id.startsWith('project_feast_'))).toBe(false);
  });

  it('migrates v63 saves: clears removed XP/meals/runes, converts extracts 3:1, preserves inscription fragments, refunds feast project', () => {
    const s = newGame(1);
    s.skills.agility = xpToReach('agility', 50);
    s.skills.cooking = xpToReach('cooking', 40);
    s.skills.runecarving = xpToReach('runecarving', 60);
    s.storage.bank.frost_extract = 4;
    s.storage.bank.ember_reduction = 2;
    s.storage.bank.void_distillate = 3;
    s.storage.bank.rune_keen_3 = 5;
    s.storage.bank.inscription_fragment = 9;
    const sword = createItem(s, 'felling_axe', 20, 'rare', seeded(1));
    sword.rune = 'rune_keen_3';
    s.inventory.push(sword);

    const raw = JSON.parse(serialize(s));
    raw.version = 63;
    raw.meal = { id: 'meal_porridge', remainingMs: 60_000 };
    raw.professionProgress.activeProject = {
      project: { id: 'project_feast_artisans', inputs: { star_bloom: 2, moon_bloom: 2 } },
      progress: 1000,
    };

    const loaded = deserialize(JSON.stringify(raw));
    expect(loaded.skills.agility).toBe(0);
    expect(loaded.skills.cooking).toBe(0);
    expect(loaded.skills.runecarving).toBe(0);
    expect(loaded.meal).toBeNull();
    expect(loaded.storage.bank.frost_extract).toBeUndefined();
    expect(loaded.storage.bank.frostleaf).toBe(12);
    expect(loaded.storage.bank.emberroot).toBe(6);
    expect(loaded.storage.bank.voidbloom).toBe(9);
    expect(loaded.storage.bank.rune_keen_3).toBeUndefined();
    expect(loaded.storage.bank.inscription_fragment).toBe(9);
    expect(loaded.inventory.find((i) => i.uid === sword.uid)?.rune).toBeUndefined();
    expect(loaded.professionProgress.activeProject).toBeNull();
    expect(loaded.storage.bank.star_bloom).toBe(2);
    expect(loaded.storage.bank.moon_bloom).toBe(2);
  });
});

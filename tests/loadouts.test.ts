import { describe, expect, it } from 'vitest';
import { BAG_SIZE } from '../src/data/hideout';
import { startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, createSupportGem, socketSupport } from '../src/engine/gems';
import { upgradeStation } from '../src/engine/hideout';
import { createItem } from '../src/engine/items';
import {
  applyGearSet,
  applySkillSet,
  autoSwitchGear,
  deleteGearSet,
  gearSetWorn,
  gearSwitchUnlocked,
  inGearSet,
  saveGearSet,
  saveSkillSet,
  setAutoGear,
  skillSetActive,
} from '../src/engine/loadouts';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { startSkillAction } from '../src/engine/skills';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { stashItems } from '../src/engine/storage';
import type { GameState, Item } from '../src/engine/types';
import { actionsFor } from '../src/data/skills';
import { veteran } from './helpers';

const ctx = makeCtx(seeded(1));
const fresh = () => veteran(newGame(1));
const sword = (s: GameState): Item => createItem(s, 'rusted_sword', 1, 'normal', seeded(s.nextUid));
const lastSet = (s: GameState) => s.loadouts.gear.at(-1)!;

/** Saves the worn gear as a set, then puts a different sword in the main hand. */
function wearingOther(s: GameState) {
  saveGearSet(s, 'Combat');
  const old = s.equipment.weapon!;
  const other = sword(s);
  s.equipment.weapon = other;
  s.inventory.push(old);
  return { set: lastSet(s), old, other };
}

describe('gear sets', () => {
  it('puts a saved set back on and bags what comes off', () => {
    const s = fresh();
    const { set, old, other } = wearingOther(s);
    expect(gearSetWorn(s, set)).toBe(false);
    expect(applyGearSet(s, ctx, set.id)).toBeNull();
    expect(s.equipment.weapon).toBe(old);
    expect(s.inventory).toContain(other);
    expect(gearSetWorn(s, set)).toBe(true);
  });

  it('wears gear from the stash, following its new uid', () => {
    const s = fresh();
    const { set, old } = wearingOther(s);
    const before = old.uid;
    stashItems(s, ctx, [old.uid]);
    expect(old.uid).not.toBe(before);
    expect(set.items.weapon).toBe(old.uid);
    expect(applyGearSet(s, ctx, set.id)).toBeNull();
    expect(s.equipment.weapon).toBe(old);
  });

  it('moves a worn piece between hands and fingers', () => {
    const s = fresh();
    const a = createItem(s, 'iron_ring', 1, 'normal', seeded(2));
    const b = createItem(s, 'iron_ring', 1, 'normal', seeded(3));
    s.equipment.ring1 = a;
    s.equipment.ring2 = b;
    saveGearSet(s, 'Rings');
    s.equipment.ring1 = b;
    s.equipment.ring2 = a;
    expect(applyGearSet(s, ctx, lastSet(s).id)).toBeNull();
    expect(s.equipment.ring1).toBe(a);
    expect(s.equipment.ring2).toBe(b);
    expect(s.inventory).toHaveLength(0);
  });

  it('takes off slots the set leaves empty', () => {
    const s = fresh();
    delete s.equipment.weapon;
    saveGearSet(s, 'Bare hands');
    const blade = sword(s);
    s.equipment.weapon = blade;
    expect(applyGearSet(s, ctx, lastSet(s).id)).toBeNull();
    expect(s.equipment.weapon).toBeUndefined();
    expect(s.inventory).toContain(blade);
  });

  it('spills into the stash rather than losing gear when the bag is full', () => {
    const s = fresh();
    delete s.equipment.weapon;
    saveGearSet(s, 'Bare hands');
    const blade = sword(s);
    s.equipment.weapon = blade;
    while (s.inventory.length < BAG_SIZE) s.inventory.push(sword(s));
    applyGearSet(s, ctx, lastSet(s).id);
    expect(s.account.stash.flat()).toContain(blade);
    expect(s.inventory).toHaveLength(BAG_SIZE);
  });

  it('says so when a piece is gone, and wears the rest', () => {
    const s = fresh();
    const { set, old } = wearingOther(s);
    s.inventory = s.inventory.filter((i) => i !== old);
    expect(applyGearSet(s, ctx, set.id)).toMatch(/1 piece left off/);
  });

  it('keeps life at the same share of its maximum', () => {
    const s = fresh();
    const { set, old } = wearingOther(s);
    old.prefixes.push({ affixId: 'flat_life', tier: 0, values: [100] });
    const before = deriveStats(s).maxLife;
    s.life = before / 2;
    applyGearSet(s, ctx, set.id);
    const after = deriveStats(s).maxLife;
    expect(after).toBeGreaterThan(before);
    expect(s.life).toBeCloseTo(after / 2);
  });

  it('marks set gear so bulk salvage can skip it', () => {
    const s = fresh();
    saveGearSet(s, 'Combat');
    expect(inGearSet(s, s.equipment.weapon!.uid)).toBe(true);
    expect(inGearSet(s, sword(s).uid)).toBe(false);
  });

  it('is saved with the character', () => {
    const s = fresh();
    saveGearSet(s, 'Combat');
    expect(deserialize(serialize(s)).loadouts.gear[0].name).toBe('Combat');
  });

  it('old saves load with no sets', () => {
    const raw = JSON.parse(serialize(fresh()));
    delete raw.loadouts;
    expect(deserialize(JSON.stringify(raw)).loadouts.gear).toEqual([]);
  });
});

describe('skill loadouts', () => {
  it('restores the bar with its rules, priority and supports', () => {
    const s = fresh();
    const gem = s.skillBar[0]!;
    const sup = createSupportGem(s, 'added_fire');
    s.account.supportGems.push(sup);
    const socketed = !socketSupport(s, gem.uid, sup.uid, 0);
    gem.rules = [{ when: 'always' }];
    gem.priority = 'high';
    saveSkillSet(s, 'Bossing');
    const set = s.loadouts.skills[0];

    const other = createSkillGem(s, gem.gemId);
    s.skillBar[0] = other;
    s.account.gems.push(gem);
    gem.rules = [{ when: 'manual' }];
    gem.priority = 'low';
    if (socketed) {
      gem.supports[0] = null;
      s.account.supportGems.push(sup);
    }
    expect(skillSetActive(s, set)).toBe(false);

    expect(applySkillSet(s, set.id)).toBeNull();
    expect(s.skillBar[0]).toBe(gem);
    expect(s.account.gems).toContain(other);
    expect(gem.rules).toEqual([{ when: 'always' }]);
    expect(gem.priority).toBe('high');
    if (socketed) expect(gem.supports[0]).toBe(sup);
    expect(skillSetActive(s, set)).toBe(true);
  });

  it('keeps a cooldown with its gem when the slots change', () => {
    const s = fresh();
    saveSkillSet(s, 'A');
    const set = s.loadouts.skills[0];
    startCombat(s, ctx, 'mudflats');
    const [a, b] = s.skillBar;
    s.skillBar[0] = b;
    s.skillBar[1] = a;
    s.combat!.cooldowns[1] = 5000; // a, sitting in slot 1
    s.combat!.cooldowns[0] = 0;
    applySkillSet(s, set.id);
    expect(s.combat!.cooldowns[0]).toBe(5000);
  });

  it('never leaves a gem in two places', () => {
    const s = fresh();
    saveSkillSet(s, 'A');
    s.account.gems.push(createSkillGem(s, s.skillBar[0]!.gemId));
    s.account.gems.push(s.skillBar[1]!);
    s.skillBar[1] = null;
    applySkillSet(s, s.loadouts.skills[0].id);
    const uids = [...s.account.gems, ...s.skillBar].filter(Boolean).map((g) => g!.uid);
    expect(new Set(uids).size).toBe(uids.length);
  });
});

describe('auto-switching gear', () => {
  const chop = () => actionsFor('woodcutting')[0].id;
  const unlocked = () => {
    const s = fresh();
    s.account.hideout.bench = 3;
    return s;
  };

  it('needs the Crafting Bench upgrade, and the sets themselves do not', () => {
    const s = newGame(1);
    expect(gearSwitchUnlocked(s)).toBe(false);
    saveGearSet(s, 'Free');
    expect(s.loadouts.gear).toHaveLength(1);
    expect(setAutoGear(s, 'woodcutting', lastSet(s).id)).toMatch(/Crafting Bench level 3/);
    Object.assign(s.account.bank, {
      gold: 1e6,
      ash_plank: 1e4,
      copper_bar: 1e4,
      iron_bar: 1e4,
      arcane_dust: 1e4,
      rough_gem: 100,
      boss_trophy: 100,
    });
    upgradeStation(s, ctx, 'bench');
    expect(gearSwitchUnlocked(s)).toBe(false);
    upgradeStation(s, ctx, 'bench');
    expect(gearSwitchUnlocked(s)).toBe(true);
    expect(setAutoGear(s, 'woodcutting', lastSet(s).id)).toBeNull();
  });

  it('puts the set on when the activity starts', () => {
    const s = unlocked();
    const { set, old } = wearingOther(s);
    setAutoGear(s, 'combat', set.id);
    startCombat(s, ctx, 'mudflats');
    tick(s, ctx, 50);
    expect(s.equipment.weapon).toBe(old);
  });

  it('works for skilling, by the skill the action belongs to', () => {
    const s = unlocked();
    const { set, old } = wearingOther(s);
    setAutoGear(s, 'woodcutting', set.id);
    startSkillAction(s, ctx, chop());
    tick(s, ctx, 50);
    expect(s.equipment.weapon).toBe(old);
  });

  it('stays out of the way of a swap made by hand mid-activity', () => {
    const s = unlocked();
    const { set, other } = wearingOther(s);
    setAutoGear(s, 'combat', set.id);
    startCombat(s, ctx, 'mudflats');
    autoSwitchGear(s, ctx);
    s.inventory = s.inventory.filter((i) => i !== other);
    s.inventory.push(s.equipment.weapon!);
    s.equipment.weapon = other;
    autoSwitchGear(s, ctx);
    expect(s.equipment.weapon).toBe(other);
  });

  it('does nothing while the bench is below the level, even with a choice left over', () => {
    const s = unlocked();
    const { set, other } = wearingOther(s);
    setAutoGear(s, 'combat', set.id);
    s.account.hideout.bench = 2;
    startCombat(s, ctx, 'mudflats');
    autoSwitchGear(s, ctx);
    expect(s.equipment.weapon).toBe(other);
  });

  it('forgets a deleted set', () => {
    const s = unlocked();
    saveGearSet(s, 'Gone');
    setAutoGear(s, 'combat', lastSet(s).id);
    deleteGearSet(s, lastSet(s).id);
    expect(s.loadouts.auto.combat).toBeUndefined();
  });
});

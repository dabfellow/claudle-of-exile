import { describe, expect, it } from 'vitest';
import { settleCharacter } from '../src/engine/account';
import { affixDef } from '../src/data/affixes';
import { attributeReq, BASES, baseDef } from '../src/data/bases';
import { PASSIVE_BY_ID, PASSIVE_NODES } from '../src/data/passiveTree';
import { makeCtx } from '../src/engine/context';
import { applyOrb, benchCraft, ORBS, salvage } from '../src/engine/crafting';
import { combatStep, makeMonster, mitigate, startCombat, useFlask } from '../src/engine/combat';
import { enchantFlask } from '../src/engine/flasks';
import { equip } from '../src/engine/equipment';
import { refreshVendor, stationLockReason, upgradeStation } from '../src/engine/hideout';
import { gemReqLevel } from '../src/data/gems';
import { createSkillGem, placeOnBar } from '../src/engine/gems';
import { stashPagePrice } from '../src/engine/storage';
import { addRandomMod, allMods, createItem, eligibleAffixes, maxAffixes, sellValue } from '../src/engine/items';
import { simulateOffline } from '../src/engine/offline';
import { allocate, allocateReason, refundReason } from '../src/engine/passives';
import { seeded } from '../src/engine/rng';
import { deserialize, exportSave, importSave, serialize } from '../src/engine/save';
import { actionBlocker, startSkillAction } from '../src/engine/skills';
import { newGame, SAVE_VERSION, tick } from '../src/engine/state';
import { armourReduction, deriveStats, ES_RECHARGE_DELAY_MS, ES_RECHARGE_PCT, evadeChance } from '../src/engine/stats';
import type { Item } from '../src/engine/types';
import { charLevelForXp, charXpForLevel, charXpFromOldCurve, levelForXp, xpForLevel } from '../src/engine/xp';
import { monsterDamage, zoneDef } from '../src/data/zones';
import { actionsFor } from '../src/data/skills';

const ctx = (seed = 1) => makeCtx(seeded(seed));

describe('xp curve', () => {
  it('matches the classic thresholds', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(83);
    expect(xpForLevel(99)).toBe(13034431);
    expect(levelForXp(82)).toBe(1);
    expect(levelForXp(83)).toBe(2);
  });

  it('character level uses its own longer curve', () => {
    expect(charXpForLevel(2)).toBe(231);
    expect(charLevelForXp(charXpForLevel(15))).toBe(15);
    expect(charXpForLevel(100)).toBeCloseTo(charXpForLevel(99) * 2, -1);
    expect(charXpForLevel(80)).toBe(35415936);
    expect(charXpForLevel(100)).toBe(272073792);
  });

  it('every character level costs at least as much as the one before', () => {
    for (let l = 2; l < 100; l++) {
      expect(charXpForLevel(l + 1) - charXpForLevel(l)).toBeGreaterThanOrEqual(charXpForLevel(l) - charXpForLevel(l - 1));
    }
  });

  it('old character xp keeps its level and progress on the new curve', () => {
    const old = (l: number) => 36 * Math.pow(l - 1, 3) + 100 * (l - 1);
    expect(charXpFromOldCurve(0)).toBe(0);
    expect(charXpFromOldCurve(old(42))).toBe(charXpForLevel(42));
    expect(charXpFromOldCurve((old(42) + old(43)) / 2)).toBeCloseTo((charXpForLevel(42) + charXpForLevel(43)) / 2, 0);
    expect(charXpFromOldCurve(old(100) + 5000)).toBe(charXpForLevel(100));
  });

  it('keeps a level 99 character at level 99 when the character curve changes', () => {
    const s = newGame(1);
    s.version = 45;
    s.skills.combat = 40010852;
    const loaded = deserialize(serialize(s));
    expect(loaded.skills.combat).toBe(charXpForLevel(99));
    expect(charLevelForXp(loaded.skills.combat)).toBe(99);
  });
});

describe('affix rolling', () => {
  it('respects rarity caps, groups and item level', () => {
    const s = newGame(1);
    const rng = seeded(42);
    for (let n = 0; n < 300; n++) {
      const base = BASES[n % BASES.length];
      const ilvl = 1 + (n % 50);
      const item = createItem(s, base.id, ilvl, n % 2 ? 'rare' : 'magic', rng);
      const max = maxAffixes(item.rarity);
      expect(item.prefixes.length).toBeLessThanOrEqual(max);
      expect(item.suffixes.length).toBeLessThanOrEqual(max);
      const groups = allMods(item).map((m) => affixDef(m.affixId).group);
      expect(new Set(groups).size).toBe(groups.length);
      for (const m of allMods(item)) {
        const a = affixDef(m.affixId);
        expect(a.tiers[m.tier].ilvl).toBeLessThanOrEqual(ilvl);
        expect(a.weights).toSatisfy((w: Record<string, number>) => base.tags.some((t) => (w[t] ?? 0) > 0));
      }
    }
  });

  it('never puts weapon-only mods on boots', () => {
    const s = newGame(1);
    const boots = createItem(s, 'leather_boots', 50, 'normal', seeded(1));
    const ids = [...eligibleAffixes(boots, 'prefix'), ...eligibleAffixes(boots, 'suffix')].map((a) => a.id);
    expect(ids).not.toContain('inc_phys');
    expect(ids).not.toContain('attack_speed');
  });
});

describe('hybrid armour bases', () => {
  it('carry both defences, both attribute requirements and both mod pools', () => {
    const coif = baseDef('riveted_coif');
    expect([coif.armour, coif.evasion, coif.energyShield]).toEqual([17, 17, undefined]);
    expect(attributeReq(coif)).toEqual({ str: 12, dex: 12 });

    const templar = baseDef('templar_plate');
    expect([templar.armour, templar.evasion, templar.energyShield]).toEqual([114, undefined, 57]);
    expect(attributeReq(templar)).toEqual({ str: 28, int: 28 });

    const dusk = baseDef('duskweave_boots');
    expect([dusk.armour, dusk.evasion, dusk.energyShield]).toEqual([undefined, 39, 20]);
    const boots: Item = { uid: 1, baseId: 'duskweave_boots', ilvl: 40, rarity: 'rare', name: null, prefixes: [], suffixes: [] };
    const pool = [...eligibleAffixes(boots, 'prefix'), ...eligibleAffixes(boots, 'suffix')];
    const stats = new Set(pool.flatMap((a) => a.stats));
    expect(stats.has('evasion') && stats.has('energyShield')).toBe(true);
    expect(stats.has('armour')).toBe(false);
  });
});

describe('currency', () => {
  const fresh = (rarity: Item['rarity']) => {
    const s = newGame(1);
    const item = createItem(s, 'iron_blade', 30, rarity, seeded(3));
    s.inventory.push(item);
    s.account.bank = { transmute: 5, augment: 5, alteration: 5, regal: 5, alchemy: 5, chaos: 5, exalted: 5, annul: 5, scour: 5, divine: 5 };
    return { s, item };
  };

  it('transmute only works on normal items', () => {
    const { s, item } = fresh('normal');
    expect(applyOrb(s, ctx(), 'transmute', item.uid)).toBeNull();
    expect(item.rarity).toBe('magic');
    expect(applyOrb(s, ctx(), 'transmute', item.uid)).toMatch(/Normal/);
  });

  it('regal upgrades magic to rare with an extra mod', () => {
    const { s, item } = fresh('magic');
    const before = allMods(item).length;
    expect(applyOrb(s, ctx(), 'regal', item.uid)).toBeNull();
    expect(item.rarity).toBe('rare');
    expect(allMods(item).length).toBe(before + 1);
    expect(item.name).toBeTruthy();
  });

  it('exalted fails on a full rare', () => {
    const { item } = fresh('rare');
    const rng = seeded(9);
    while (addRandomMod(item, rng));
    expect(ORBS.exalted.canApply(item)).toMatch(/room/);
  });

  it('scour then alchemy, annul removes exactly one mod', () => {
    const { s, item } = fresh('rare');
    expect(applyOrb(s, ctx(), 'scour', item.uid)).toBeNull();
    expect(item.rarity).toBe('normal');
    expect(allMods(item)).toHaveLength(0);
    expect(applyOrb(s, ctx(), 'alchemy', item.uid)).toBeNull();
    const n = allMods(item).length;
    expect(n).toBeGreaterThanOrEqual(4);
    expect(applyOrb(s, ctx(), 'annul', item.uid)).toBeNull();
    expect(allMods(item).length).toBe(n - 1);
    expect(s.account.bank.annul).toBe(4);
  });

  it('bench crafts one crafted mod at most', () => {
    const { s, item } = fresh('magic');
    item.prefixes = [];
    item.suffixes = [];
    s.account.hideout.bench = 2;
    s.account.bank.gold = 1000;
    s.account.bank.arcane_dust = 100;
    expect(benchCraft(s, ctx(), 'bc_life', item.uid)).toMatch(/Cannot be crafted|room/);
    const ring = createItem(s, 'iron_ring', 10, 'magic', seeded(5));
    ring.prefixes = [];
    ring.suffixes = [];
    s.inventory.push(ring);
    expect(benchCraft(s, ctx(), 'bc_life', ring.uid)).toBeNull();
    expect(benchCraft(s, ctx(), 'bc_fire', ring.uid)).toMatch(/crafted/);
  });
});

describe('ticking', () => {
  it('many small ticks equal one large catch-up', () => {
    const a = newGame(7);
    const b = newGame(7);
    const ca = ctx(11);
    const cb = ctx(11);
    startSkillAction(a, ca, 'mine_copper');
    startSkillAction(b, cb, 'mine_copper');
    for (let i = 0; i < 1200; i++) tick(a, ca, 50);
    tick(b, cb, 60_000);
    expect(a.account.bank.copper_ore).toBe(b.account.bank.copper_ore);
    expect(a.skills.mining).toBe(b.skills.mining);
    expect(a.account.bank.copper_ore).toBe(20);
  });

  it('production stops when inputs run out', () => {
    const s = newGame(1);
    s.account.bank.sunpetal = 5;
    s.account.bank.ash_log = 2;
    const c = ctx();
    expect(startSkillAction(s, c, 'brew_life_small')).toBeNull();
    tick(s, c, 20_000);
    expect(s.action).toBeNull();
    expect(s.account.flaskStash).toHaveLength(1);
  });
});

describe('combat', () => {
  it('armour reduces big hits less than small ones', () => {
    expect(armourReduction(500, 10)).toBeGreaterThan(armourReduction(500, 200));
    expect(armourReduction(200, 100)).toBe(0.5);
    expect(armourReduction(1e9, 1)).toBe(0.9);
  });

  it('evasion and energy shield provide meaningful layered defence', () => {
    expect(evadeChance(1e9, 1)).toBe(0.85);
    expect(ES_RECHARGE_PCT).toBe(30);
    expect(ES_RECHARGE_DELAY_MS).toBe(1000);
  });

  it('monster damage ramps after level 20 without changing the early campaign', () => {
    const oldCurve = (level: number) => Math.round((1 + Math.pow(level, 1.15)) * 1.15);
    expect(monsterDamage(20)).toBe(oldCurve(20));
    expect(monsterDamage(65)).toBeGreaterThan(oldCurve(65) * 2);
  });

  it('resistances mitigate elemental damage', () => {
    const s = newGame(1);
    const d = deriveStats(s);
    d.res.fire = 50;
    expect(mitigate(d, 100, 'fire')).toBe(50);
  });

  it('dying returns you to the hideout', () => {
    const s = newGame(1);
    const c = ctx();
    startCombat(s, c, 'mudflats');
    s.combat!.monsters = [makeMonster({ ...zoneDef('mudflats').boss, level: 80 }, true)];
    s.life = 1;
    for (let i = 0; i < 200 && s.combat; i++) combatStep(s, c, 50, deriveStats(s));
    expect(s.combat).toBeNull();
    expect(s.action).toBeNull();
    expect(s.lifetime.deaths).toBe(1);
  });

  it('flasks spend charges and refill on kills', () => {
    const s = newGame(1);
    const c = ctx();
    startCombat(s, c, 'mudflats');
    const f = s.flaskSlots[0]!;
    const max = f.charges;
    expect(useFlask(s, c, 0)).toBeNull();
    expect(f.charges).toBe(max - 7);
    const rat = makeMonster(zoneDef('mudflats').monsters[0], false);
    rat.life = 1;
    s.combat!.monsters = [rat];
    s.combat!.actionMs = 0;
    s.skillBar = s.skillBar.map(() => null); // default attack only, so the hit can't be a guard skill
    combatStep(s, c, 50, deriveStats(s));
    expect(f.charges).toBe(max - 6);
  });

  it('instilled flasks only trigger on their condition', () => {
    const s = newGame(1);
    const c = ctx();
    s.account.bank.instill = 1;
    expect(enchantFlask(s, c, s.flaskSlots[0]!.uid, 'lowLife')).toBeNull();
    startCombat(s, c, 'mudflats');
    const d = deriveStats(s);
    s.life = d.maxLife;
    combatStep(s, c, 50, d);
    expect(c.events.some((e) => e.t === 'flask')).toBe(false);
    s.life = d.maxLife * 0.3;
    combatStep(s, c, 50, d);
    expect(c.events.some((e) => e.t === 'flask' && e.auto)).toBe(true);
  });

  it('a fresh character can idle zone 1 trash until the boss appears', () => {
    for (const seed of [1, 2, 3]) {
      const s = newGame(seed);
      s.account.hideout.war_table = 2;
      const c = ctx(seed);
      startCombat(s, c, 'mudflats');
      for (let t = 0; t < 10 * 60_000 && s.combat; t += 1000) tick(s, c, 1000);
      expect(s.lifetime.kills).toBeGreaterThanOrEqual(zoneDef('mudflats').bossEvery);
    }
  }, 15_000);

  it('dying to a boss resets the boss counter', () => {
    const s = newGame(1);
    const c = ctx();
    s.settings.autoBoss = true;
    s.account.hideout.war_table = 8;
    s.zoneKills.mudflats = 15;
    startCombat(s, c, 'mudflats');
    s.life = 1;
    for (let i = 0; i < 2000 && s.combat; i++) combatStep(s, c, 50, deriveStats(s));
    expect(s.zoneKills.mudflats).toBe(0);
  });
});

describe('passive tree', () => {
  it('is fully connected to the start', () => {
    const seen = new Set(['class_str']);
    const q = ['class_str'];
    // other class starts can't be walked through, but every other node must be reachable via bridges
    const skip = (id: string) => PASSIVE_BY_ID[id].kind === 'start';
    while (q.length) for (const l of PASSIVE_BY_ID[q.pop()!].links) if (!seen.has(l) && !skip(l)) (seen.add(l), q.push(l));
    expect(seen.size).toBe(PASSIVE_NODES.length - (PASSIVE_NODES.filter((n) => n.kind === 'start').length - 1));
  });

  it('only allocates adjacent nodes and blocks orphaning refunds', () => {
    const s = newGame(1);
    s.skills.combat = charXpForLevel(10);
    const next = PASSIVE_BY_ID.str_hub.links.find((l) => l !== 'class_str')!;
    expect(allocateReason(s, next)).toMatch(/connect/);
    expect(allocate(s, ctx(), 'str_hub')).toBeNull();
    expect(allocate(s, ctx(), next)).toBeNull();
    s.account.bank.regret = 1;
    expect(refundReason(s, 'str_hub')).toMatch(/disconnect/);
    expect(refundReason(s, next)).toBeNull();
  });

  it('feeds stats into derived character stats', () => {
    const s = newGame(1);
    s.skills.combat = charXpForLevel(5);
    const before = deriveStats(s);
    allocate(s, ctx(), 'str_hub'); // +4 Strength
    const after = deriveStats(s);
    expect(after.attributes.str).toBe(before.attributes.str + 4);
    expect(after.maxLife).toBe(before.maxLife + 2); // 2 Strength = 1 life
  });
});

describe('hideout', () => {
  it('upgrades consume materials; a Stash upgrade adds a free page that gets bought pages 10% cheaper', () => {
    const s = newGame(1);
    const c = ctx();
    expect(upgradeStation(s, c, 'stash')).toMatch(/materials/);
    const price = stashPagePrice(s);
    const pages = s.account.stash.length;
    s.account.bank.gold = 2500;
    s.account.bank.ash_plank = 40;
    s.account.bank.copper_bar = 25;
    expect(upgradeStation(s, c, 'stash')).toBeNull();
    expect(s.account.bank.ash_plank).toBe(0);
    expect(s.account.stash.length).toBe(pages + 1);
    expect(stashPagePrice(s)).toBe(Math.round(price * 0.9));
  });

  it('the Map Device stays locked until Act 6, and production stations gate recipe tiers', () => {
    const s = newGame(1);
    const c = ctx();
    expect(stationLockReason(s, 'map_device')).toMatch(/Act 6/);
    s.account.bank.gold = 1e6;
    s.account.bank.rough_gem = 1e3;
    expect(upgradeStation(s, c, 'map_device')).toMatch(/Act 6/);
    s.skills.smithing = 1e9;
    const ironBase = actionsFor('smithing').find((a) => a.baseId && baseDef(a.baseId).reqLevel >= 10 && baseDef(a.baseId).reqLevel < 22)!;
    for (const id of Object.keys(ironBase.inputs!)) s.account.bank[id] = 1e4;
    expect(actionBlocker(s, ironBase)).toMatch(/Forge level 2/);
    s.account.hideout.forge = 2;
    expect(actionBlocker(s, ironBase)).toBeNull();
  });
});

describe('town and gems', () => {
  it('stocks the two gear shops with level-appropriate wares, priced well above their worth', () => {
    const s = newGame(1);
    s.skills.combat = charXpForLevel(8);
    refreshVendor(s, seeded(3));
    for (const shop of ['magic', 'armour'] as const) expect(s.vendor.stock.filter((o) => o.shop === shop)).toHaveLength(4);
    expect(s.vendor.stock.some((o) => o.shop === 'gems')).toBe(false);
    for (const o of s.vendor.stock) {
      if (o.item) {
        expect(o.item.rarity === 'magic' || o.item.rarity === 'rare').toBe(true);
        expect(o.price).toBeGreaterThan(sellValue(o.item) * 4);
      }
      if (o.item && o.shop === 'magic') expect(['ring', 'amulet', 'belt', 'weapon']).toContain(baseDef(o.item.baseId).slot);
    }
  });

  it('gems have level requirements: too low and they stay off the bar', () => {
    const s = newGame(1);
    const lace = createSkillGem(s, 'lacerate');
    s.account.gems.push(lace);
    expect(gemReqLevel('lacerate')).toBeGreaterThan(1);
    expect(placeOnBar(s, lace.uid, 2)).toMatch(/Requires level/);
  });

  it('salvaging needs the Crafting Bench built; orbs work without it', () => {
    const s = newGame(1);
    s.account.hideout.bench = 1;
    const c = ctx();
    const item = createItem(s, 'rusted_sword', 5, 'normal', seeded(2));
    s.inventory.push(item);
    expect(salvage(s, c, [item.uid])).toBe(0);
    expect(s.inventory).toContain(item);
    s.account.bank.transmute = 1;
    expect(applyOrb(s, c, 'transmute', item.uid)).toBeNull();
  });

  it('an old save gets fresh Town stock, its Stash pages, and keeps a working bench', () => {
    const s = newGame(1);
    const old = JSON.parse(serialize(s));
    old.version = 16;
    old.hideout = { ...s.account.hideout, stash: 3, bench: 1 };
    old.stash = [[], [], []];
    old.vendor = { stock: [{ id: 1, kind: 'gem', gemId: 'spark', price: 10 }], refreshAt: 1e12 };
    const loaded = deserialize(JSON.stringify(old));
    expect(loaded.vendor.stock).toEqual([]);
    settleCharacter(loaded, loaded.account);
    expect(loaded.account.stash.length).toBe(s.account.stash.length + 2);
    expect(loaded.account.hideout.bench).toBe(2);
  });
});

describe('equipment', () => {
  it('enforces level requirements', () => {
    const s = newGame(1);
    const sabre = createItem(s, 'mithril_sabre', 40, 'normal', seeded(1));
    s.inventory.push(sabre);
    expect(equip(s, ctx(), sabre.uid)).toMatch(/Requires level 34/);
    s.skills.combat = charXpForLevel(40);
    // a fresh Warrior (20 Str / 12 Dex) can't meet a sabre's 38/38
    expect(equip(s, ctx(), sabre.uid)).toMatch(/Requires 38 (Strength|Dexterity)/);
    const ring = createItem(s, 'iron_ring', 40, 'rare', seeded(2));
    ring.prefixes = [];
    ring.suffixes = [
      { affixId: 'strength', tier: 5, values: [40] },
      { affixId: 'dexterity', tier: 5, values: [40] },
    ];
    s.inventory.push(ring);
    expect(equip(s, ctx(), ring.uid)).toBeNull();
    expect(equip(s, ctx(), sabre.uid)).toBeNull();
    expect(s.equipment.weapon?.uid).toBe(sabre.uid);
    expect(s.inventory.some((i) => i.baseId === 'rusted_sword')).toBe(true);
  });
});

describe('save', () => {
  it('round-trips and survives export/import', () => {
    const s = newGame(1);
    s.account.bank.chaos = 3;
    // the account travels separately in a save, and folded in with an export
    const { account: _, ...character } = s;
    expect(deserialize(serialize(s))).toMatchObject(character);
    expect(importSave(exportSave(s))).toMatchObject(character);
  });

  it('migrates a version 0 save with missing fields', () => {
    const s = newGame(1) as unknown as Record<string, unknown>;
    delete s.lifetime;
    delete s.settings;
    delete s.character;
    delete s.tutorial;
    s.version = 0;
    const loaded = deserialize(JSON.stringify(s));
    expect(loaded.lifetime.kills).toBe(0);
    expect(loaded.settings.autoSalvage.normal).toBe(false);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.character.name).toBe('Exile');
    expect(loaded.tutorial.done).toBe(true);
  });

  it('offline progress gathers resources', () => {
    const s = newGame(1);
    const c = ctx();
    startSkillAction(s, c, 'cut_ash');
    const sum = simulateOffline(s, c, 60 * 60_000);
    // Mastery earned during the hour modestly raises ordinary log yield and speed.
    expect(sum.materials.ash_log).toBe(1224);
    expect(sum.levels.woodcutting).toBeGreaterThan(10);
  });
});

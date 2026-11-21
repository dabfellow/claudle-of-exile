import { describe, expect, it } from 'vitest';
import { actionDef } from '../src/data/skills';
import { runeDef, runeEffect } from '../src/data/runes';
import { professionProject } from '../src/data/professionProjects';
import { newGame, tick } from '../src/engine/state';
import { createItem } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { actionBlocker, skillStep, startSkillAction } from '../src/engine/skills';
import { startProject } from '../src/engine/professions';
import { inscribeRune, runecarvingPreview, runeInscriptionPreview, runeMult, runeReason, runeStats } from '../src/engine/runes';
import { hasAccomplishment, settleProfessionProgress } from '../src/engine/professions';
import { deriveStats } from '../src/engine/stats';
import { simulateOffline } from '../src/engine/offline';
import { xpForLevel } from '../src/engine/xp';
import { deserialize, serialize } from '../src/engine/save';
import type { Ctx } from '../src/engine/context';
import type { GameState } from '../src/engine/types';

const reload = (s: GameState): GameState => {
  const account = structuredClone(s.account);
  const reloaded = deserialize(serialize(s));
  reloaded.account = account;
  return reloaded;
};

const ctx = (now = 0): Ctx => ({ rng: seeded(123), emit: () => {}, now });

function funded(level = 90): GameState {
  const s = newGame(1);
  s.skills.runecarving = xpForLevel(level);
  s.skills.woodcutting = xpForLevel(level);
  s.skills.gemcutting = xpForLevel(level);
  s.skills.smithing = xpForLevel(level);
  s.account.hideout.bench = 5;
  s.account.hideout.rune_board = 2;
  // Stock abundant materials
  s.storage.bank = {
    copper_ore: 1000,
    iron_ore: 1000,
    mithril_ore: 1000,
    ash_log: 1000,
    oak_log: 1000,
    yew_log: 1000,
    sunpetal: 1000,
    frostleaf: 1000,
    emberroot: 1000,
    voidbloom: 1000,
    rough_gem: 1000,
    essence_embers_1: 100,
    frigid_fossil: 100,
    essence_storm_1: 100,
    ash_resin: 100,
    essence_vitality_1: 100,
    oak_resin: 100,
    scorched_fossil: 100,
    essence_frost_2: 100,
    metallic_fossil: 100,
    dense_fossil: 100,
    essence_vitality_2: 100,
    serrated_fossil: 100,
    inscription_fragment: 50,
    heartwood_fragment: 50,
    exceptional_crystal: 10,
    rune_stone_3: 10,
    rune_storm_3: 10,
    rune_keen_3: 10,
    rune_blood_3: 10,
    rune_stone_4: 10,
  };
  return s;
}

describe('Phase 10 — Rune-carving accomplishment progression', () => {
  it('opens Grade 1 runes at base level + family index * 2 without prior practice', () => {
    const s = newGame(1);
    s.storage.bank = { copper_ore: 50, ash_log: 50, essence_embers_1: 10 };
    // Ember family is index 0 -> level 1
    const ember1 = actionDef('carve_rune_ember_1');
    expect(ember1.level).toBe(1);
    expect(ember1.accomplishments).toBeUndefined();
    expect(actionBlocker(s, ember1)).toBeNull();

    // Stone family is index 3 -> level 1 + 3 * 2 = 7
    const stone1 = actionDef('carve_rune_stone_1');
    expect(stone1.level).toBe(7);
    expect(stone1.accomplishments).toBeUndefined();
    expect(actionBlocker(s, stone1)).toBe('Requires Rune-carving level 7');
  });

  it('gates Grade 2, 3, and 4 on 10 completed crafts of the previous grade of that family', () => {
    const s = funded(50);
    const ember2 = actionDef('carve_rune_ember_2');
    expect(ember2.accomplishments).toEqual(['rune_ember_grade_1_practice']);
    expect(actionBlocker(s, ember2)).toBe('Requires 10 Scratched Ember rune carves (0/10)');

    // Complete 9 Grade 1 crafts
    for (let i = 0; i < 9; i++) {
      startSkillAction(s, ctx(), 'carve_rune_ember_1');
      skillStep(s, ctx(), 15001, deriveStats(s));
    }
    expect(s.professionProgress.counters['rune.ember.1']).toBe(9);
    expect(hasAccomplishment(s, 'rune_ember_grade_1_practice')).toBe(false);
    expect(actionBlocker(s, ember2)).toBe('Requires 10 Scratched Ember rune carves (9/10)');

    // 10th craft unlocks Grade 2
    startSkillAction(s, ctx(), 'carve_rune_ember_1');
    skillStep(s, ctx(), 15001, deriveStats(s));
    expect(s.professionProgress.counters['rune.ember.1']).toBe(10);
    expect(hasAccomplishment(s, 'rune_ember_grade_1_practice')).toBe(true);
    expect(actionBlocker(s, ember2)).toBeNull();

    // Grade 3 remains blocked until 10 Grade 2 crafts are done
    const ember3 = actionDef('carve_rune_ember_3');
    expect(actionBlocker(s, ember3)).toBe('Requires 10 Carved Ember rune carves (0/10)');

    for (let i = 0; i < 10; i++) {
      startSkillAction(s, ctx(), 'carve_rune_ember_2');
      skillStep(s, ctx(), 20001, deriveStats(s));
    }
    expect(s.professionProgress.counters['rune.ember.2']).toBe(10);
    expect(hasAccomplishment(s, 'rune_ember_grade_2_practice')).toBe(true);
    expect(actionBlocker(s, ember3)).toBeNull();

    // Grade 4 remains blocked until 10 Grade 3 crafts are done
    const ember4 = actionDef('carve_rune_ember_4');
    expect(actionBlocker(s, ember4)).toBe('Requires 10 Deep Ember rune carves (0/10)');
    for (let i = 0; i < 10; i++) {
      startSkillAction(s, ctx(), 'carve_rune_ember_3');
      skillStep(s, ctx(), 25001, deriveStats(s));
    }
    expect(s.professionProgress.counters['rune.ember.3']).toBe(10);
    expect(hasAccomplishment(s, 'rune_ember_grade_3_practice')).toBe(true);
    expect(actionBlocker(s, ember4)).toBeNull();
  });

  it('counts completed crafts nominally once despite double-yield modifiers', () => {
    const s = funded(50);
    expect(s.professionProgress.counters['rune.blood.1'] ?? 0).toBe(0);

    startSkillAction(s, ctx(), 'carve_rune_blood_1');
    s.action = { kind: 'skill', actionId: 'carve_rune_blood_1', progress: 0, double: true };
    // Run one cycle
    skillStep(s, ctx(), 15001, deriveStats(s));

    // Player got 2 runes from manual double, but counter incremented by exactly 1
    expect(s.storage.bank.rune_blood_1).toBe(2);
    expect(s.professionProgress.counters['rune.blood.1']).toBe(1);
  });

  it('grandfathers existing access from skill level or carried runes via settleProfessionProgress', () => {
    const s = newGame(1);
    s.skills.runecarving = xpForLevel(50); // Level 50 is above grade 4 base level (45)
    expect(s.professionProgress.legacyAccess.runecarving_grade_4).toBeUndefined();

    settleProfessionProgress(s, true);

    expect(s.professionProgress.legacyAccess.runecarving_grade_4).toBe(true);
    // Grade 4 requires rune_<family>_grade_3_practice which checks runecarving_grade_4
    expect(hasAccomplishment(s, 'rune_ember_grade_3_practice')).toBe(true);
    expect(hasAccomplishment(s, 'rune_stone_grade_3_practice')).toBe(true);
  });
});

describe('Phase 10 — Inscription fragment generation', () => {
  it('does not generate inscription fragments from Grade 1 carves', () => {
    const s = funded(20);
    s.professionProgress.counters['runes.inscription'] = 0;
    s.storage.bank.inscription_fragment = 0;

    for (let i = 0; i < 25; i++) {
      startSkillAction(s, ctx(), 'carve_rune_ember_1');
      skillStep(s, ctx(), 15001, deriveStats(s));
    }

    expect(s.professionProgress.counters['runes.inscription'] ?? 0).toBe(0);
    expect(s.storage.bank.inscription_fragment ?? 0).toBe(0);
  });

  it('generates an Inscription Fragment every 20 completed Grade 2+ ordinary carves', () => {
    const s = funded(50);
    s.professionProgress.counters['rune.stone.1'] = 10;
    s.professionProgress.counters['runes.inscription'] = 0;
    s.storage.bank.inscription_fragment = 0;

    // Run 19 Grade 2 carves
    for (let i = 0; i < 19; i++) {
      startSkillAction(s, ctx(), 'carve_rune_stone_2');
      skillStep(s, ctx(), 20001, deriveStats(s));
    }
    expect(s.professionProgress.counters['runes.inscription']).toBe(19);
    const fragmentsAfter19 = s.storage.bank.inscription_fragment ?? 0;

    // 20th carve guarantees 1 fragment
    startSkillAction(s, ctx(), 'carve_rune_stone_2');
    skillStep(s, ctx(), 20001, deriveStats(s));
    expect(s.professionProgress.counters['runes.inscription']).toBe(20);
    expect((s.storage.bank.inscription_fragment ?? 0) - fragmentsAfter19).toBeGreaterThanOrEqual(1);
  });
});

describe('Phase 10 — Future inscription components', () => {
  it('defines the four future inscription actions with exact costs, XP, and protected outputs', () => {
    const ret = actionDef('prepare_return_inscription');
    expect(ret.level).toBe(65);
    expect(ret.intervalMs).toBe(60000);
    expect(ret.xp).toBe(36); // 120 raw scaled by 0.3 SKILL_XP_SCALE
    expect(ret.inputs).toEqual({ inscription_fragment: 10, rune_keen_3: 1 });
    expect(ret.protectedOutputs).toEqual({ return_inscription: 1 });

    const choir = actionDef('prepare_choir_inscription');
    expect(choir.level).toBe(70);
    expect(choir.intervalMs).toBe(60000);
    expect(choir.xp).toBe(45); // 150 raw scaled by 0.3
    expect(choir.inputs).toEqual({ inscription_fragment: 10, rune_blood_3: 1 });
    expect(choir.protectedOutputs).toEqual({ choir_inscription: 1 });

    const circuit = actionDef('prepare_circuit_inscription');
    expect(circuit.level).toBe(70);
    expect(circuit.intervalMs).toBe(60000);
    expect(circuit.xp).toBe(45); // 150 raw scaled by 0.3
    expect(circuit.inputs).toEqual({ inscription_fragment: 10, rune_storm_3: 1 });
    expect(circuit.protectedOutputs).toEqual({ circuit_inscription: 1 });

    const conv = actionDef('inscribe_convergence');
    expect(conv.level).toBe(90);
    expect(conv.intervalMs).toBe(120000);
    expect(conv.xp).toBe(90); // 300 raw scaled by 0.3
    expect(conv.inputs).toEqual({ inscription_fragment: 5, rune_stone_4: 1 });
    expect(conv.protectedOutputs).toEqual({ convergence_inscription: 1 });
  });

  it('crafts future inscriptions with exact inputs and protects against conservation/doubling', () => {
    const s = funded(90);
    // Tree conservation and doubling modifiers
    s.skillPassives.push('runecarving_n0'); // Second Stroke
    s.storage.bank.return_inscription = 0;
    const initialFrag = s.storage.bank.inscription_fragment!;
    const initialRune = s.storage.bank.rune_keen_3!;

    startSkillAction(s, ctx(), 'prepare_return_inscription');
    skillStep(s, ctx(), 60001, deriveStats(s));

    expect(s.storage.bank.return_inscription).toBe(1);
    expect(s.storage.bank.inscription_fragment).toBe(initialFrag - 10);
    expect(s.storage.bank.rune_keen_3).toBe(initialRune - 1);
  });
});

describe('Phase 10 — Signature rune projects and resonance', () => {
  it('defines signature_wayfarer and signature_channel projects correctly', () => {
    const wayfarer = professionProject('signature_wayfarer')!;
    expect(wayfarer).toBeDefined();
    expect(wayfarer.skill).toBe('runecarving');
    expect(wayfarer.level).toBe(55);
    expect(wayfarer.accomplishments).toEqual(['rune_stone_grade_3_practice']);
    expect(wayfarer.durationMs).toBe(1_800_000);
    expect(wayfarer.xp).toBe(360);
    expect(wayfarer.inputs).toEqual({ inscription_fragment: 10, rune_stone_3: 1, heartwood_fragment: 5 });
    expect(wayfarer.reward).toEqual({ category: 'progress', materials: { rune_signature_wayfarer: 1 } });

    const channel = professionProject('signature_channel')!;
    expect(channel).toBeDefined();
    expect(channel.skill).toBe('runecarving');
    expect(channel.level).toBe(65);
    expect(channel.accomplishments).toEqual(['rune_storm_grade_3_practice']);
    expect(channel.durationMs).toBe(1_800_000);
    expect(channel.xp).toBe(480);
    expect(channel.inputs).toEqual({ inscription_fragment: 10, rune_storm_3: 1, exceptional_crystal: 1 });
    expect(channel.reward).toEqual({ category: 'progress', materials: { rune_signature_channel: 1 } });
  });

  it('completes signature projects and awards the signature runes into the bank', () => {
    const s = funded(70);
    s.professionProgress.counters['rune.stone.3'] = 10;
    s.professionProgress.counters['rune.storm.3'] = 10;

    expect(startProject(s, ctx(), 'signature_wayfarer')).toBeNull();
    // Advance project by 30 minutes
    const c = ctx();
    for (let i = 0; i < 1800; i++) tick(s, c, 1000);

    expect(s.storage.bank.rune_signature_wayfarer).toBe(1);
    expect(s.professionProgress.projects.signature_wayfarer?.completed).toBe(1);

    expect(startProject(s, ctx(), 'signature_channel')).toBeNull();
    for (let i = 0; i < 1800; i++) tick(s, c, 1000);

    expect(s.storage.bank.rune_signature_channel).toBe(1);
    expect(s.professionProgress.projects.signature_channel?.completed).toBe(1);
  });

  it('verifies slot readings for Wayfarer’s Rune and Channeler’s Rune', () => {
    const wayfarer = runeDef('rune_signature_wayfarer')!;
    expect(wayfarer).toBeDefined();
    expect(wayfarer.family.id).toBe('stone');
    expect(wayfarer.grade.ilvl).toBe(45);
    expect(runeEffect(wayfarer, 'weapon')).toEqual({ stat: 'gatheringSpeed', value: 6 });
    expect(runeEffect(wayfarer, 'armour')).toEqual({ stat: 'allRes', value: 4 });
    expect(runeEffect(wayfarer, 'jewellery')).toEqual({ stat: 'manaPct', value: 6 });

    const channel = runeDef('rune_signature_channel')!;
    expect(channel).toBeDefined();
    expect(channel.family.id).toBe('storm');
    expect(channel.grade.ilvl).toBe(45);
    expect(runeEffect(channel, 'weapon')).toEqual({ stat: 'castSpeedPct', value: 8 });
    expect(runeEffect(channel, 'armour')).toEqual({ stat: 'energyShieldPct', value: 8 });
    expect(runeEffect(channel, 'jewellery')).toEqual({ stat: 'manaRegenPct', value: 10 });
  });

  it('scales signature rune values by family resonance when worn alongside family runes', () => {
    const s = funded(80);
    s.account.hideout.rune_board = 1; // 5% per piece
    const weapon = createItem(s, 'corsair_cutlass', 50, 'rare', seeded(1));
    const chest = createItem(s, 'plate_vest', 50, 'rare', seeded(2));
    const ring = createItem(s, 'iron_ring', 50, 'rare', seeded(3));

    s.inventory.push(weapon, chest, ring);
    s.storage.bank.rune_signature_wayfarer = 1;
    s.storage.bank.rune_stone_1 = 2;

    expect(inscribeRune(s, ctx(), 'rune_signature_wayfarer', weapon.uid)).toBeNull();
    expect(inscribeRune(s, ctx(), 'rune_stone_1', chest.uid)).toBeNull();
    expect(inscribeRune(s, ctx(), 'rune_stone_1', ring.uid)).toBeNull();

    s.inventory = [];
    s.equipment.weapon = weapon;
    s.equipment.body = chest;
    s.equipment.ring1 = ring;

    // 3 stone pieces worn -> (pieces - 1) * 5% = 10% resonance boost
    expect(runeMult(s, 'stone')).toBeCloseTo(1.10);
    const stats = runeStats(s);
    // Wayfarer on weapon gives 6 gatheringSpeed * 1.10 = 6.6
    expect(stats.gatheringSpeed).toBeCloseTo(6.6);
  });
});

describe('Phase 10 — One rune slot, replacements, and item level checks', () => {
  it('enforces item level requirement (ilvl 45 for signature runes)', () => {
    const s = funded(70);
    const lowGear = createItem(s, 'short_bow', 40, 'rare', seeded(1)); // ilvl 40 < 45
    const highGear = createItem(s, 'short_bow', 50, 'rare', seeded(2)); // ilvl 50 >= 45
    s.inventory.push(lowGear, highGear);
    s.storage.bank.rune_signature_wayfarer = 2;

    expect(runeReason(s, 'rune_signature_wayfarer', lowGear.uid)).toBe('Requires item level 45');
    expect(runeReason(s, 'rune_signature_wayfarer', highGear.uid)).toBeNull();

    expect(inscribeRune(s, ctx(), 'rune_signature_wayfarer', lowGear.uid)).toBe('Requires item level 45');
    expect(inscribeRune(s, ctx(), 'rune_signature_wayfarer', highGear.uid)).toBeNull();
    expect(highGear.rune).toBe('rune_signature_wayfarer');
  });

  it('replaces and destroys the previous rune while preserving item base, UID, rarity, and affixes', () => {
    const s = funded(70);
    const item = createItem(s, 'plate_vest', 50, 'rare', seeded(1));
    s.inventory.push(item);
    s.storage.bank.rune_stone_1 = 1;
    s.storage.bank.rune_signature_wayfarer = 1;

    inscribeRune(s, ctx(), 'rune_stone_1', item.uid);
    expect(item.rune).toBe('rune_stone_1');
    const uidBefore = item.uid;
    const prefixesBefore = structuredClone(item.prefixes);
    const suffixesBefore = structuredClone(item.suffixes);

    // Replace with Wayfarer's rune
    inscribeRune(s, ctx(), 'rune_signature_wayfarer', item.uid);
    expect(item.rune).toBe('rune_signature_wayfarer');
    expect(item.uid).toBe(uidBefore);
    expect(item.prefixes).toEqual(prefixesBefore);
    expect(item.suffixes).toEqual(suffixesBefore);
    // Destroyed rune_stone_1 is not refunded
    expect(s.storage.bank.rune_stone_1 ?? 0).toBe(0);
  });
});

describe('Phase 10 — UI previews', () => {
  it('provides comprehensive inscription preview lines before payment', () => {
    const s = funded(70);
    const chest = createItem(s, 'plate_vest', 50, 'rare', seeded(1));
    chest.rune = 'rune_ember_1'; // holds an existing rune
    s.equipment.body = chest;

    const preview = runeInscriptionPreview(s, 'rune_signature_wayfarer', chest);
    expect(preview.some((line) => line.includes('Armour slot: +4% to all Elemental Resistances'))).toBe(true);
    expect(preview.some((line) => line.includes('ilvl 50 satisfies requirement'))).toBe(true);
    expect(preview.some((line) => line.includes('Replacing existing rune'))).toBe(true);
    expect(preview.some((line) => line.includes('Resonance preview'))).toBe(true);
  });

  it('provides readable runecarving preview lines for ordinary runes and future inscriptions', () => {
    const s = funded(70);
    const ember3 = actionDef('carve_rune_ember_3');
    const previewEmber = runecarvingPreview(s, ember3);
    expect(previewEmber.some((l) => l.includes('Deep Ember Rune'))).toBe(true);
    expect(previewEmber.some((l) => l.includes('Requires 10 Carved Ember rune carves'))).toBe(true);
    expect(previewEmber.some((l) => l.includes('Inscription Fragment progress'))).toBe(true);

    const ret = actionDef('prepare_return_inscription');
    const previewRet = runecarvingPreview(s, ret);
    expect(previewRet.some((l) => l.includes('Return Inscription'))).toBe(true);
    expect(previewRet.some((l) => l.includes('The Homecoming'))).toBe(true);
  });
});

describe('Phase 10 — 8-hour live vs offline catch-up parity', () => {
  it('advances rune carving and inscription fragments identically over 8 hours online and offline', () => {
    const live = funded(70);
    live.professionProgress.counters['rune.stone.1'] = 10;
    live.professionProgress.counters['runes.inscription'] = 0;
    startSkillAction(live, ctx(), 'carve_rune_stone_2');

    const away = reload(live);

    const elapsedMs = 8 * 3600 * 1000;
    // Simulate away
    const summary = simulateOffline(away, ctx(), elapsedMs);

    // Simulate live in 1000ms steps
    const liveCtx = ctx();
    for (let t = 0; t < elapsedMs; t += 1000) {
      tick(live, liveCtx, 1000);
    }

    expect(away.storage.bank.rune_stone_2).toBe(live.storage.bank.rune_stone_2);
    expect(away.storage.bank.inscription_fragment).toBe(live.storage.bank.inscription_fragment);
    expect(Math.abs(away.skills.runecarving - live.skills.runecarving)).toBeLessThanOrEqual(actionDef('carve_rune_stone_2').xp + 0.1);
    expect(away.professionProgress.counters['rune.stone.2']).toBe(live.professionProgress.counters['rune.stone.2']);
    expect(away.professionProgress.counters['runes.inscription']).toBe(live.professionProgress.counters['runes.inscription']);
    expect(summary.xp.runecarving).toBeGreaterThan(0);
  });
});

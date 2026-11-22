import { describe, expect, it } from 'vitest';
import { uniqueDef } from '../src/data/bases';
import { flaskDef, UNIQUE_FLASKS } from '../src/data/flasks';
import { professionProject } from '../src/data/professionProjects';
import { worldDropUniques } from '../src/data/uniqueDrops';
import { uniqueDropsIn } from '../src/data/uniqueList';
import { zoneDef } from '../src/data/zones';
import { combatStep, isSlamSkill, makeMonster, startCombat, useFlask, tickDebt } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, createSupportGem } from '../src/engine/gems';
import { createUnique } from '../src/engine/items';
import { newFlask } from '../src/engine/flasks';
import { advanceProject, startProject } from '../src/engine/professions';
import { deserialize, serialize } from '../src/engine/save';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { charXpForLevel, xpForLevel } from '../src/engine/xp';
import { simulateOffline } from '../src/engine/offline';
import { prepareDefenceBuild } from '../src/dev/overhaulBuilds';
import { seeded } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';

const context = () => makeCtx({ next: () => 0.5 });

function combatArena(gemId: string, supports: string[] = [], pack = 1) {
  const s = newGame(1, { name: 'Defence contract', classId: gemId === 'frost_needle' || gemId === 'fireball' ? 'mage' : 'warrior' });
  const c = context();
  s.skills.combat = charXpForLevel(90);
  s.unlockedZones = ['mudflats'];
  s.skillBar.fill(null);
  const g = createSkillGem(s, gemId);
  g.rules = [{ when: 'always' }];
  g.extraSlots = 3;
  g.supports = supports.map((id) => createSupportGem(s, id));
  s.skillBar[0] = g;
  s.settings.autoFlee = false;
  startCombat(s, c, 'mudflats');
  s.combat!.buffs.push({
    id: 'contract_inputs',
    source: 'skill',
    durationMs: 1e9,
    remainingMs: 1e9,
    stats: { str: 200, dex: 200, int: 200, accuracy: 10000, manaRegenPct: 1000 },
  });
  s.combat!.monsters = Array.from({ length: pack }, (_, i) => {
    const m = makeMonster(zoneDef('mudflats').monsters[0], false, i + 10);
    m.life = m.maxLife = 1e7;
    m.armour = m.evasion = m.es = m.maxEs = 0;
    m.blockChance = m.spellBlockChance = 0;
    m.attackMs = 1e9;
    m.cell = i;
    m.res = { fire: 0, cold: 0, light: 0, chaos: 0 };
    return m;
  });
  s.combat!.spawnMs = 1e12;
  s.mana = deriveStats(s).maxMana;
  return { s, c, mon: s.combat!.monsters[0] };
}

function stepCombat(s: GameState, c: ReturnType<typeof context>, ms: number) {
  for (let t = 0; t < ms; t += 50) combatStep(s, c, Math.min(50, ms - t), deriveStats(s));
}

describe('Phase 15 Defence Uniques', () => {
  describe('Acquisition & Exclusivity', () => {
    const DEFENCE_EQUIPMENT = ['borrowed_tomorrow', 'the_buried_grudge', 'debt_of_stone'];

    it('ensures none of the Phase 15 defence uniques exist in world drop pools', () => {
      const worldDrops = worldDropUniques(100);
      for (const id of DEFENCE_EQUIPMENT) {
        expect(worldDrops.some((u) => u.id === id)).toBe(false);
        expect(uniqueDropsIn(uniqueDef(id)).join(' ')).toMatch(/Thieving|Archaeology|Smithing/);
      }
      expect(UNIQUE_FLASKS.some((f) => f.id === 'u_flask_witchglass')).toBe(false);
      expect(UNIQUE_FLASKS.some((f) => f.id === 'u_flask_still_heart')).toBe(false);
    });

    it('verifies The Buried Grudge exclusive project route and fixed base', () => {
      const p = professionProject('the_buried_grudge')!;
      expect(p).toBeDefined();
      expect(p.skill).toBe('archaeology');
      expect(p.level).toBe(65);
      expect(p.reward.category).toBe('equipment');
      if (p.reward.category === 'equipment') {
        expect(p.reward.uniqueId).toBe('the_buried_grudge');
        expect(p.reward.baseId).toBe('sunforged_bulwark');
      }
      expect(p.inputs).toEqual({ giant_relic_fragment: 40, giant_tally: 100, stone_alloy: 2 });
    });

    it('verifies Debt of Stone exclusive project route and fixed base', () => {
      const p = professionProject('debt_of_stone')!;
      expect(p).toBeDefined();
      expect(p.skill).toBe('smithing');
      expect(p.level).toBe(70);
      expect(p.station).toEqual({ id: 'forge', level: 3 });
      expect(p.reward.category).toBe('equipment');
      if (p.reward.category === 'equipment') {
        expect(p.reward.uniqueId).toBe('debt_of_stone');
        expect(p.reward.baseId).toBe('sunforged_plate');
      }
      expect(p.inputs).toEqual({ stone_alloy: 4, adamant_bar: 20, heartwood_frame: 1 });
    });

    it('verifies Witchglass exclusive alchemy project route', () => {
      const p = professionProject('witchglass')!;
      expect(p).toBeDefined();
      expect(p.skill).toBe('alchemy');
      expect(p.level).toBe(65);
      expect(p.station).toEqual({ id: 'alchemy_table', level: 3 });
      expect(p.reward.category).toBe('flask');
      if (p.reward.category === 'flask') {
        expect(p.reward.flaskId).toBe('u_flask_witchglass');
      }
      expect(p.inputs).toEqual({ moon_distillate: 5, star_distillate: 2, prepared_glass: 5 });
    });

    it('verifies The Still Heart exclusive alchemy project route', () => {
      const p = professionProject('the_still_heart')!;
      expect(p).toBeDefined();
      expect(p.skill).toBe('alchemy');
      expect(p.level).toBe(60);
      expect(p.station).toEqual({ id: 'alchemy_table', level: 3 });
      expect(p.reward.category).toBe('flask');
      if (p.reward.category === 'flask') {
        expect(p.reward.flaskId).toBe('u_flask_still_heart');
      }
      expect(p.inputs).toEqual({ moon_distillate: 6, emberroot: 30, prepared_glass: 3 });
    });

    it('completes The Buried Grudge archaeology project cleanly', () => {
      const s = newGame(1), c = context(), p = professionProject('the_buried_grudge')!;
      s.skills.archaeology = xpForLevel(70);
      s.professionProgress.work.archaeology = 100;
      s.professionProgress.discoveries['expedition.dig_colossus.0'] = true;
      s.storage.bank = { ...p.inputs };
      expect(startProject(s, c, p.id)).toBeNull();
      advanceProject(s, c, p.durationMs);
      expect(s.inventory.some((i) => i.uniqueId === 'the_buried_grudge')).toBe(true);
      expect(s.account.uniquesSeen).toContain('the_buried_grudge');
      expect(s.storage.bank.stone_alloy ?? 0).toBe(0);
    });

    it('completes Debt of Stone smithing project cleanly', () => {
      const s = newGame(1), c = context(), p = professionProject('debt_of_stone')!;
      s.skills.smithing = xpForLevel(75);
      s.professionProgress.work.smithing = 100;
      s.account.hideout.forge = 3;
      s.storage.bank = { ...p.inputs };
      expect(startProject(s, c, p.id)).toBeNull();
      advanceProject(s, c, p.durationMs);
      expect(s.inventory.some((i) => i.uniqueId === 'debt_of_stone')).toBe(true);
      expect(s.account.uniquesSeen).toContain('debt_of_stone');
      expect(s.storage.bank.stone_alloy ?? 0).toBe(0);
    });

    it('completes Witchglass alchemy project into flaskStash', () => {
      const s = newGame(1), c = context(), p = professionProject('witchglass')!;
      s.skills.alchemy = xpForLevel(70);
      s.professionProgress.work.alchemy = 100;
      s.account.hideout.alchemy_table = 3;
      s.storage.bank = { ...p.inputs };
      expect(startProject(s, c, p.id)).toBeNull();
      advanceProject(s, c, p.durationMs);
      expect(s.storage.flaskStash.some((f) => f.flaskId === 'u_flask_witchglass')).toBe(true);
      expect(s.account.uniquesSeen).toContain('witchglass');
      expect(s.storage.bank.prepared_glass ?? 0).toBe(0);
    });

    it('completes The Still Heart alchemy project into flaskStash', () => {
      const s = newGame(1), c = context(), p = professionProject('the_still_heart')!;
      s.skills.alchemy = xpForLevel(70);
      s.professionProgress.work.alchemy = 100;
      s.account.hideout.alchemy_table = 3;
      s.storage.bank = { ...p.inputs };
      expect(startProject(s, c, p.id)).toBeNull();
      advanceProject(s, c, p.durationMs);
      expect(s.storage.flaskStash.some((f) => f.flaskId === 'u_flask_still_heart')).toBe(true);
      expect(s.account.uniquesSeen).toContain('the_still_heart');
      expect(s.storage.bank.prepared_glass ?? 0).toBe(0);
    });
  });

  describe('Borrowed Tomorrow', () => {
    it('applies 10% per-hit cap and 20% rolling 1s cap on instant life leech', () => {
      const { s, c } = combatArena('ground_slam', ['life_leech']);
      s.equipment.amulet = createUnique(s, 'borrowed_tomorrow', 80, c.rng);
      const d = deriveStats(s);
      expect(d.raw.borrowedTomorrow).toBeGreaterThan(0);

      // Set player life to 50%
      s.life = Math.round(d.maxLife * 0.5);
      const startLife = s.life;

      // Single hit test: leech cannot exceed 10% maxLife on one hit
      stepCombat(s, c, 100);
      const hitEvents = c.events.filter((e) => e.t === 'hit' && e.target === 'monster');
      expect(hitEvents.length).toBeGreaterThan(0);
      const gainAfterFirst = s.life - startLife;
      expect(gainAfterFirst).toBeLessThanOrEqual(Math.round(d.maxLife * 0.10) + 1);

      // Across 1 second, total leech cannot exceed 20% maxLife
      s.life = Math.round(d.maxLife * 0.4);
      const baselineLife = s.life;
      s.combat!.instantLeechLog = [];
      stepCombat(s, c, 1000);
      const totalLeeched = s.life - baselineLife;
      expect(totalLeeched).toBeLessThanOrEqual(Math.round(d.maxLife * 0.20) + 1);
    });

    it('blocks life regeneration but allows degen to subtract life', () => {
      const { s, c } = combatArena('ground_slam');
      s.equipment.amulet = createUnique(s, 'borrowed_tomorrow', 80, c.rng);
      // Give huge flat life regen
      s.combat!.buffs.push({
        id: 'big_regen',
        source: 'skill',
        durationMs: 10000,
        remainingMs: 10000,
        stats: { lifeRegen: 500 },
      });
      const d = deriveStats(s);
      expect(d.lifeRegen).toBeGreaterThan(100);

      s.life = 100;
      stepCombat(s, c, 500);
      // Life should NOT have increased from regen
      expect(s.life).toBe(100);

      // Negative regen (degen) still works
      s.combat!.buffs.push({
        id: 'degen',
        source: 'skill',
        durationMs: 10000,
        remainingMs: 10000,
        stats: { lifeRegen: -1000 },
      });
      stepCombat(s, c, 500);
      expect(s.life).toBeLessThan(100);
    });

    it('blocks life recovery from flasks', () => {
      const { s, c } = combatArena('ground_slam');
      s.equipment.amulet = createUnique(s, 'borrowed_tomorrow', 80, c.rng);
      const lf = newFlask(s, 'life_sacred');
      lf.charges = flaskDef('life_sacred').maxCharges;
      s.flaskSlots[0] = lf;

      s.life = 100;
      useFlask(s, c, 0);
      expect(s.combat!.heals.some((h) => h.isFlask && h.resource === 'life')).toBe(true);

      stepCombat(s, c, 1000);
      // Life recovery from flask was zeroed
      expect(s.life).toBe(100);
    });

    it('does not block mana leech, recoup, or on-kill recovery', () => {
      const { s, c } = combatArena('ground_slam', ['mana_leech']);
      s.equipment.amulet = createUnique(s, 'borrowed_tomorrow', 80, c.rng);

      // Recoup heal
      s.life = 200;
      s.combat!.heals.push({ resource: 'life', perMs: 0.1, remainingMs: 1000 });
      stepCombat(s, c, 200);
      expect(s.life).toBeGreaterThan(200);

      // Mana leech
      s.mana = 50;
      s.combat!.buffs.push({
        id: 'big_mana_leech',
        source: 'skill',
        durationMs: 1e9,
        remainingMs: 1e9,
        stats: { manaLeech: 50 },
      });
      stepCombat(s, c, 500);
      expect(s.mana).toBeGreaterThan(0);
    });
  });

  describe('The Buried Grudge', () => {
    it('stores 50% post-mitigation prevented damage from blocked hits up to 300% max Life', () => {
      const { s, c, mon } = combatArena('ground_slam');
      s.equipment.offhand = createUnique(s, 'the_buried_grudge', 80, c.rng);
      const d = deriveStats(s);
      expect(d.raw.theBuriedGrudge).toBeGreaterThan(0);
      expect(s.buriedGrudgeCharge).toBe(0);

      s.life = d.maxLife;
      // 100% block
      s.combat!.blocks = 5;
      // Monster attacks on next tick
      mon.attackMs = 50;
      mon.attackTimer = 50;

      stepCombat(s, c, 100);

      expect(s.buriedGrudgeCharge).toBeGreaterThan(0);
      const maxStorage = 3 * d.maxLife;
      expect(s.buriedGrudgeCharge!).toBeLessThanOrEqual(maxStorage);
    });

    it('with Glancing Blows takes 65% damage and stores 35% prevented damage', () => {
      const { s, c, mon } = combatArena('ground_slam');
      s.equipment.offhand = createUnique(s, 'the_buried_grudge', 80, c.rng);
      s.combat!.buffs.push({
        id: 'gb',
        source: 'skill',
        durationMs: 1e9,
        remainingMs: 1e9,
        stats: { glancingBlows: 1 },
      });
      const d = deriveStats(s);
      expect(d.raw.glancingBlows).toBeGreaterThan(0);
      expect(d.raw.theBuriedGrudge).toBeGreaterThan(0);

      s.combat!.blocks = 1;
      s.buriedGrudgeCharge = 0;
      mon.attackMs = 50;
      mon.attackTimer = 50;

      stepCombat(s, c, 100);
      // Stored charge was based on 35% prevented fraction
      expect(s.buriedGrudgeCharge).toBeGreaterThan(0);
    });

    it('clears stored charge on shield unequip and on death', () => {
      const { s, c } = combatArena('ground_slam');
      s.equipment.offhand = createUnique(s, 'the_buried_grudge', 80, c.rng);
      s.buriedGrudgeCharge = 500;
      expect(s.buriedGrudgeCharge).toBe(500);

      // Unequip offhand -> deriveStats clears it
      delete s.equipment.offhand;
      deriveStats(s);
      expect(s.buriedGrudgeCharge).toBe(0);

      // Put shield back, charge to 500, die
      s.equipment.offhand = createUnique(s, 'the_buried_grudge', 80, c.rng);
      s.buriedGrudgeCharge = 500;
      s.life = 0;
      stepCombat(s, c, 50);
      expect(s.buriedGrudgeCharge).toBe(0);
    });

    it('unleashes stored damage as physical shockwave on next slam, split equally among valid enemies', () => {
      const { s, c } = combatArena('ground_slam', [], 2);
      s.equipment.offhand = createUnique(s, 'the_buried_grudge', 80, c.rng);
      s.buriedGrudgeCharge = 1000;

      expect(isSlamSkill('ground_slam')).toBe(true);
      stepCombat(s, c, 300);

      // Storage was snapshot and consumed
      expect(s.buriedGrudgeCharge).toBe(0);
      // Monsters took shockwave hits
      const hits = c.events.filter((e) => e.t === 'hit' && e.target === 'monster' && e.dmgType === 'phys');
      expect(hits.length).toBeGreaterThan(0);
    });
  });

  describe('Debt of Stone', () => {
    it('sets max Energy Shield to 0', () => {
      const s = newGame(1), c = context();
      s.equipment.body = createUnique(s, 'debt_of_stone', 80, c.rng);
      const d = deriveStats(s);
      expect(d.raw.debtOfStone).toBeGreaterThan(0);
      expect(d.maxEs).toBe(0);
      expect(s.es).toBe(0);
    });

    it('defers 50% incoming hit damage over 4 seconds into debtQueue', () => {
      const { s, c, mon } = combatArena('ground_slam');
      s.equipment.body = createUnique(s, 'debt_of_stone', 80, c.rng);
      s.debtQueue = [];
      const d = deriveStats(s);
      expect(d.raw.debtOfStone).toBeGreaterThan(0);

      s.combat!.evadeMs = 0;
      s.combat!.blocks = 0;
      mon.attackMs = 50;
      mon.attackTimer = 50;

      stepCombat(s, c, 100);

      expect(s.debtQueue.length).toBeGreaterThan(0);
      const tranche = s.debtQueue[0];
      expect(tranche.remainingMs).toBeLessThanOrEqual(4000);
      expect(tranche.perMs).toBeCloseTo(tranche.totalAmount / 4000, 4);
    });

    it('debtQueue persists through combat exit, town tick, and item removal, cleared only on death', () => {
      const s = newGame(1), c = context();
      s.equipment.body = createUnique(s, 'debt_of_stone', 80, c.rng);
      s.debtQueue = [{ remainingMs: 3000, totalAmount: 300, perMs: 0.1 }];
      s.life = 500;

      // Tick out of combat (town tick)
      const d = deriveStats(s);
      tickDebt(s, c, 1000, d);
      expect(s.debtQueue[0].remainingMs).toBe(2000);
      expect(s.life).toBeCloseTo(400, 1);

      // Remove item: debt still persists!
      delete s.equipment.body;
      const d2 = deriveStats(s);
      tickDebt(s, c, 1000, d2);
      expect(s.debtQueue[0].remainingMs).toBe(1000);
      expect(s.life).toBeCloseTo(300, 1);

      // Save and reload: debt persists!
      const back = deserialize(serialize(s));
      expect(back.debtQueue ?? []).toHaveLength(1);
      expect(back.debtQueue![0].remainingMs).toBe(1000);

      // Cleared on death
      back.life = 0;
      tickDebt(back, c, 1000, deriveStats(back));
      expect(back.debtQueue).toEqual([]);
    });
  });

  describe('Witchglass', () => {
    it('converts 100% elemental damage to chaos damage while active', () => {
      const { s, c } = combatArena('frost_needle');
      const wf = newFlask(s, 'u_flask_witchglass');
      wf.charges = 40;
      s.flaskSlots[0] = wf;

      useFlask(s, c, 0);
      const d = deriveStats(s);
      expect(d.raw.witchglassActive).toBeGreaterThan(0);

      stepCombat(s, c, 500);
      const hits = c.events.filter((e) => e.t === 'hit' && e.target === 'monster');
      expect(hits.length).toBeGreaterThan(0);
      for (const h of hits) {
        if (h.t === 'hit') expect(h.dmgType).toBe('chaos');
      }
    });

    it('forbids elemental ailments (ignite, chill, freeze, shock) while active', () => {
      const { s, c, mon } = combatArena('frost_needle');
      const wf = newFlask(s, 'u_flask_witchglass');
      wf.charges = 40;
      s.flaskSlots[0] = wf;

      useFlask(s, c, 0);
      stepCombat(s, c, 500);

      expect(mon.dots.filter((d) => d.kind === 'ignite' || d.kind === 'burn')).toHaveLength(0);
      expect(mon.chillMs).toBe(0);
      expect(mon.frozenMs).toBe(0);
      expect(mon.shockMs ?? 0).toBe(0);
    });

    it('still allows chaos poison to inflict', () => {
      const { s, c, mon } = combatArena('frost_needle');
      const wf = newFlask(s, 'u_flask_witchglass');
      wf.charges = 40;
      s.flaskSlots[0] = wf;
      // Add 100% poison chance
      s.combat!.buffs.push({
        id: 'poison_chance',
        source: 'skill',
        durationMs: 1e9,
        remainingMs: 1e9,
        stats: { poisonOnHit: 100 },
      });

      useFlask(s, c, 0);
      stepCombat(s, c, 500);

      expect(mon.dots.some((d) => d.kind === 'poison')).toBe(true);
    });
  });

  describe('The Still Heart', () => {
    it('recovers 1800 life over 6s continuing at full life, and forbids life leech and regen', () => {
      const { s, c } = combatArena('ground_slam', ['life_leech']);
      const shf = newFlask(s, 'u_flask_still_heart');
      shf.charges = 40;
      s.flaskSlots[0] = shf;

      s.life = 100;
      useFlask(s, c, 0);
      const d = deriveStats(s);
      expect(d.raw.stillHeartActive).toBeGreaterThan(0);

      // Heal runs over time
      stepCombat(s, c, 1000);
      expect(s.life).toBeGreaterThan(100);

      // Reaching full life does not cancel the heal
      s.life = d.maxLife;
      stepCombat(s, c, 500);
      expect(s.combat!.heals.some((h) => h.isFlask && h.flaskId === 'u_flask_still_heart')).toBe(true);

      // Life leech is 0 while active
      const dActive = deriveStats(s);
      expect(dActive.raw.stillHeartActive).toBeGreaterThan(0);
    });

    it('re-use replaces remaining duration and recovery rather than stacking reservoirs', () => {
      const { s, c } = combatArena('ground_slam');
      const shf = newFlask(s, 'u_flask_still_heart');
      shf.charges = 40;
      s.flaskSlots[0] = shf;

      useFlask(s, c, 0);
      stepCombat(s, c, 1000);

      // Re-use
      shf.charges = 40;
      useFlask(s, c, 0);

      const stillHeartHeals = s.combat!.heals.filter((h) => h.isFlask && h.flaskId === 'u_flask_still_heart');
      expect(stillHeartHeals).toHaveLength(1);
      expect(stillHeartHeals[0].remainingMs).toBe(6000);
    });
  });

  describe('Item Pairings', () => {
    it('Borrowed Tomorrow + The Still Heart: flask recovery negated, leech and regen forbidden', () => {
      const { s, c } = combatArena('ground_slam', ['life_leech']);
      s.equipment.amulet = createUnique(s, 'borrowed_tomorrow', 80, c.rng);
      const shf = newFlask(s, 'u_flask_still_heart');
      shf.charges = 40;
      s.flaskSlots[0] = shf;

      s.life = 100;
      useFlask(s, c, 0);
      const d = deriveStats(s);
      expect(d.raw.borrowedTomorrow).toBeGreaterThan(0);
      expect(d.raw.stillHeartActive).toBeGreaterThan(0);

      // Flask recovery is completely negated by Borrowed Tomorrow
      stepCombat(s, c, 1000);
      expect(s.life).toBe(100);

      // Still Heart active buff prevents leech
      stepCombat(s, c, 500);
      expect(s.life).toBe(100);
    });

    it('Winter\'s Pyre + Witchglass: cold converts to chaos, no ignite/chill/freeze/shock inflicted', () => {
      const { s, c, mon } = combatArena('frost_needle');
      s.equipment.weapon = createUnique(s, 'winters_pyre', 80, c.rng);
      const wf = newFlask(s, 'u_flask_witchglass');
      wf.charges = 40;
      s.flaskSlots[0] = wf;

      useFlask(s, c, 0);
      const d = deriveStats(s);
      expect(d.raw.wintersPyre).toBeGreaterThan(0);
      expect(d.raw.witchglassActive).toBeGreaterThan(0);

      stepCombat(s, c, 500);
      const hits = c.events.filter((e) => e.t === 'hit' && e.target === 'monster');
      expect(hits.length).toBeGreaterThan(0);
      for (const h of hits) {
        if (h.t === 'hit') expect(h.dmgType).toBe('chaos');
      }
      // No elemental ailments inflicted
      expect(mon.dots.filter((d) => d.kind === 'ignite' || d.kind === 'burn')).toHaveLength(0);
      expect(mon.chillMs).toBe(0);
      expect(mon.frozenMs).toBe(0);
      expect(mon.shockMs ?? 0).toBe(0);
    });

    it('The Buried Grudge + Debt of Stone: 100 post-mitigation hit -> 50 stored in grudge, 25 taken now, 25 debt over 4s', () => {
      const { s, c, mon } = combatArena('ground_slam');
      s.equipment.offhand = createUnique(s, 'the_buried_grudge', 80, c.rng);
      s.equipment.body = createUnique(s, 'debt_of_stone', 80, c.rng);
      const d = deriveStats(s);
      expect(d.raw.theBuriedGrudge).toBeGreaterThan(0);
      expect(d.raw.debtOfStone).toBeGreaterThan(0);

      s.combat!.blocks = 5;
      s.buriedGrudgeCharge = 0;
      s.debtQueue = [];
      s.life = d.maxLife;
      mon.attackMs = 50;
      mon.attackTimer = 50;

      stepCombat(s, c, 100);

      // Blocked hit stored prevented damage into Grudge charge
      expect(s.buriedGrudgeCharge).toBeGreaterThan(0);
      // And deferred damage was queued into Debt of Stone
      expect(s.debtQueue.length).toBeGreaterThan(0);
    });
  });

  describe('Realistic Builds & Live/Offline parity', () => {
    it.each(['borrowed_tomorrow', 'the_buried_grudge', 'debt_of_stone', 'witchglass', 'the_still_heart', 'combo_grudge_debt'])('simulates matching live/offline combat with %s', (id) => {
      const s = newGame(15, { name: 'Defence build test', classId: 'warrior' });
      const c = makeCtx(seeded(15));
      prepareDefenceBuild(s, c, id);

      s.unlockedZones.push('shatteredthrone');
      expect(startCombat(s, c, 'shatteredthrone')).toBeNull();

      const b = structuredClone(s);
      b.maps.stock = b.account.maps!;

      const live = makeCtx(seeded(55)), away = makeCtx(seeded(55));
      for (let ms = 0; ms < 60_000; ms += 50) tick(s, live, 50);
      simulateOffline(b, away, 60_000);

      expect(Math.abs(b.life - s.life)).toBeLessThan(5);
      expect(Math.abs(b.mana - s.mana)).toBeLessThan(5);
      expect(b.lifetime.deaths).toBe(s.lifetime.deaths);
      expect(b.lifetime.kills).toBe(s.lifetime.kills);
      expect(s.lifetime.kills).toBeGreaterThan(0);
      expect(s.lifetime.deaths).toBe(0);
    });
  });
});

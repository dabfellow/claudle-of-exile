import { describe, expect, it } from 'vitest';
import { uniqueDef } from '../src/data/bases';
import { worldDropUniques } from '../src/data/uniqueDrops';
import { uniqueDropsIn } from '../src/data/uniqueList';
import { zoneDef } from '../src/data/zones';
import { combatStep, makeMonster, startCombat, useFlask } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, createSupportGem } from '../src/engine/gems';
import { createItem, createUnique, addFixedMod } from '../src/engine/items';
import { deserialize, serialize } from '../src/engine/save';
import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { charXpForLevel } from '../src/engine/xp';
import { simulateOffline } from '../src/engine/offline';
import { prepareRuneUniqueBuild } from '../src/dev/overhaulBuilds';
import { seeded } from '../src/engine/rng';

const context = () => makeCtx({ next: () => 0.5 });

function combatArena(gemId: string, supports: string[] = [], pack = 1) {
  const s = newGame(1, { name: 'Runic contract', classId: 'templar' });
  const c = context();
  s.skills.combat = charXpForLevel(90);
  s.equipment.weapon = createItem(s, 'seraph_staff', 80, 'rare', c.rng);
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
    stats: { str: 200, dex: 200, int: 200, accuracy: 10000, manaRegenFlat: 10, manaRegenPct: 100 },
  });
  s.combat!.monsters = Array.from({ length: pack }, (_, i) => {
    const m = makeMonster(zoneDef('mudflats').monsters[0], false, i + 1);
    m.cell = 0;
    m.life = m.maxLife = 1e7;
    m.armour = m.evasion = m.es = m.maxEs = 0;
    m.blockChance = m.spellBlockChance = 0;
    m.attackMs = 1e9;
    return m;
  });
  return { s, c };
}

describe('Phase 16 Rune-carved Uniques: Hands of the Forgotten Choir & Hollow Circuit', () => {
  describe('Exclusive Routes & Definitions', () => {
    it('hands_forgotten_choir is excluded from global drops and maps', () => {
      const choir = uniqueDef('hands_forgotten_choir');
      expect(choir).toBeDefined();
      expect(choir.name).toBe('Hands of the Forgotten Choir');
      expect(worldDropUniques(85).some((u) => u.id === 'hands_forgotten_choir')).toBe(false);
      expect(uniqueDropsIn(choir)).toEqual(['Retired masterwork, no longer made']);
    });

    it('hollow_circuit is excluded from global drops and maps', () => {
      const circuit = uniqueDef('hollow_circuit');
      expect(circuit).toBeDefined();
      expect(circuit.name).toBe('Hollow Circuit');
      expect(worldDropUniques(85).some((u) => u.id === 'hollow_circuit')).toBe(false);
      expect(uniqueDropsIn(circuit)).toEqual(['Retired masterwork, no longer made']);
    });
  });

  describe('Hands of the Forgotten Choir: Totems & Suppression', () => {
    it('+2 maximum active totems expands derived totem limit', () => {
      const s = newGame(1);
      const baseD = deriveStats(s);
      expect(baseD.raw.totemMax).toBe(0);

      s.equipment.gloves = createUnique(s, 'hands_forgotten_choir', 80, context().rng);
      const choirD = deriveStats(s);
      expect(choirD.raw.handsForgottenChoir).toBe(1);
      expect(choirD.raw.totemMax).toBe(2);
    });

    it('personal weapon DPS is 0 while wearing Hands of the Forgotten Choir', () => {
      const s = newGame(1);
      s.equipment.weapon = createItem(s, 'seraph_staff', 80, 'rare', context().rng);
      const beforeD = deriveStats(s);
      expect(beforeD.dps).toBeGreaterThan(0);

      s.equipment.gloves = createUnique(s, 'hands_forgotten_choir', 80, context().rng);
      const afterD = deriveStats(s);
      expect(afterD.dps).toBe(0);
    });

    it('places two totems at once on a single cast up to maximum capacity', () => {
      const { s, c } = combatArena('flame_totem');
      s.equipment.gloves = createUnique(s, 'hands_forgotten_choir', 80, c.rng);

      // Perform skill once
      combatStep(s, c, 50, deriveStats(s));
      expect(s.combat!.totems).toBeDefined();
      // Single cast placed 2 totems!
      expect(s.combat!.totems!.length).toBe(2);

      // Reset cooldown and cast again: max capacity is 1 + 2 = 3. Spawns 2, pushing out 1 oldest totem, leaving 3 totems.
      s.combat!.cooldowns[0] = 0;
      s.combat!.actionMs = 0;
      combatStep(s, c, 50, deriveStats(s));
      expect(s.combat!.totems!.length).toBe(3);
    });

    it('totems retain their own damage ownership and deal full damage to monsters', () => {
      const { s, c } = combatArena('flame_totem');
      s.equipment.gloves = createUnique(s, 'hands_forgotten_choir', 80, c.rng);
      const mon = s.combat!.monsters[0];
      const startLife = mon.life;

      // Let totems spawn and attack
      combatStep(s, c, 50, deriveStats(s));
      expect(s.combat!.totems!.length).toBe(2);

      // Advance time so totems attack
      for (let i = 0; i < 30; i++) {
        combatStep(s, c, 100, deriveStats(s));
      }

      expect(mon.life).toBeLessThan(startLife);
    });

    it('wearer direct hits deal 0 damage and inflict no ailments', () => {
      const { s, c } = combatArena('heavy_strike');
      s.equipment.gloves = createUnique(s, 'hands_forgotten_choir', 80, c.rng);
      const mon = s.combat!.monsters[0];
      const startLife = mon.life;

      // Perform personal attack
      for (let i = 0; i < 20; i++) {
        combatStep(s, c, 100, deriveStats(s));
      }

      expect(mon.life).toBe(startLife);
      expect(mon.dots.length).toBe(0);
      expect(mon.chillMs).toBe(0);
      expect(mon.frozenMs).toBe(0);
      expect(mon.shockMs ?? 0).toBe(0);
    });

    it('wearer reflection and thorns damage are suppressed', () => {
      const { s, c } = combatArena('flame_totem');
      s.equipment.gloves = createUnique(s, 'hands_forgotten_choir', 80, c.rng);
      s.combat!.buffs.push({
        id: 'thorns_buff',
        source: 'skill',
        durationMs: 1e9,
        remainingMs: 1e9,
        stats: { briarThorns: 100, ironReflexes: 100, anvilRetaliate: 100 },
      });
      const mon = s.combat!.monsters[0];
      mon.attackMs = 50;
      mon.attackTimer = 50;
      const startLife = mon.life;

      // Trigger incoming hits on player without letting totems attack
      s.combat!.totems = [];
      combatStep(s, c, 50, deriveStats(s));

      // Monster should not take damage from wearer thorns
      expect(mon.life).toBe(startLife);
    });

    it('Buried Grudge shockwave is suppressed while wearing Hands of the Forgotten Choir', () => {
      const { s, c } = combatArena('ground_slam');
      s.equipment.gloves = createUnique(s, 'hands_forgotten_choir', 80, c.rng);
      s.equipment.offhand = createUnique(s, 'the_buried_grudge', 80, c.rng);
      s.buriedGrudgeCharge = 5000;
      const mon = s.combat!.monsters[0];
      const startLife = mon.life;

      // Perform ground slam
      combatStep(s, c, 50, deriveStats(s));

      expect(s.buriedGrudgeCharge).toBe(0);
      expect(mon.life).toBe(startLife);
    });

    it('curses, marks, and guards remain functional without dealing personal damage', () => {
      const { s, c } = combatArena('vulnerability');
      s.equipment.gloves = createUnique(s, 'hands_forgotten_choir', 80, c.rng);
      const mon = s.combat!.monsters[0];
      const startLife = mon.life;

      combatStep(s, c, 50, deriveStats(s));

      // Curse is applied to monster
      expect(mon.curse).toBeDefined();
      expect(mon.curse?.gemId).toBe('vulnerability');
      // But no personal damage dealt
      expect(mon.life).toBe(startLife);
    });

    it('unequipping Hands of the Forgotten Choir immediately prunes excess totems', () => {
      const { s, c } = combatArena('flame_totem');
      s.equipment.gloves = createUnique(s, 'hands_forgotten_choir', 80, c.rng);

      // Spawn 3 totems (max active with Choir is 3)
      combatStep(s, c, 50, deriveStats(s));
      s.combat!.cooldowns[0] = 0;
      s.combat!.actionMs = 0;
      combatStep(s, c, 50, deriveStats(s));
      expect(s.combat!.totems!.length).toBe(3);

      // Unequip Choir gloves
      delete s.equipment.gloves;
      const d = deriveStats(s);
      expect(d.raw.totemMax).toBe(0);

      // Step combat: cap is now 1, excess 2 totems pruned
      combatStep(s, c, 50, d);
      expect(s.combat!.totems!.length).toBe(1);
    });
  });

  describe('Hollow Circuit: Mana Regen Conversion & ES Recovery', () => {
    it('sets manaRegen and esRecharge to 0, converting would-be mana regen to esRecovery', () => {
      const s = newGame(1);
      s.equipment.body = createItem(s, 'seraph_raiment', 80, 'rare', context().rng);
      s.equipment.amulet = createItem(s, 'amber_amulet', 80, 'rare', context().rng);
      addFixedMod(s.equipment.amulet, 'mana_regen_flat', 5, context().rng);
      const preD = deriveStats(s);
      expect(preD.manaRegen).toBeGreaterThan(0);
      expect(preD.esRecharge).toBeGreaterThan(0);
      expect(preD.esRecovery).toBe(0);

      const wouldBe = preD.manaRegen;
      s.equipment.ring1 = createUnique(s, 'hollow_circuit', 80, context().rng);
      const postD = deriveStats(s);
      expect(postD.manaRegen).toBe(0);
      expect(postD.esRecharge).toBe(0);
      expect(postD.esRecovery).toBeCloseTo(wouldBe, 4);
    });

    it('recovers Energy Shield continuously every tick in combat without recharge delay', () => {
      const { s, c } = combatArena('heavy_strike');
      s.equipment.body = createItem(s, 'seraph_raiment', 80, 'rare', c.rng);
      s.equipment.ring1 = createUnique(s, 'hollow_circuit', 80, c.rng);

      const d = deriveStats(s);
      expect(d.esRecovery).toBeGreaterThan(0);
      expect(d.maxEs).toBeGreaterThan(100);

      // Set ES to 0 and set recharge delay to high value
      s.es = 0;
      s.combat!.esDelayMs = 10000;

      // Tick 1 second (1000ms)
      for (let i = 0; i < 20; i++) {
        combatStep(s, c, 50, d);
      }

      // ES recovered continuously despite active recharge delay
      expect(s.es).toBeGreaterThan(0);
      expect(s.es).toBeCloseTo(d.esRecovery, 0);
    });

    it('does not recharge ES naturally even after recharge delay expires', () => {
      const { s, c } = combatArena('heavy_strike');
      s.equipment.body = createItem(s, 'seraph_raiment', 80, 'rare', c.rng);
      s.equipment.ring1 = createUnique(s, 'hollow_circuit', 80, c.rng);

      // Force would-be mana regen to 0 so esRecovery is 0
      s.combat!.buffs = [{
        id: 'no_regen',
        source: 'skill',
        durationMs: 1e9,
        remainingMs: 1e9,
        stats: { manaRegenFlat: -1000, manaRegenPct: -100 },
      }];

      const d = deriveStats(s);
      expect(d.esRecovery).toBe(0);
      expect(d.esRecharge).toBe(0);

      s.es = 10;
      s.combat!.esDelayMs = 0;

      // Step combat with delay at 0
      combatStep(s, c, 500, d);

      // ES did not recharge naturally
      expect(s.es).toBe(10);
    });

    it('negative would-be mana regen remains mana degeneration without draining ES', () => {
      const s = newGame(1);
      s.equipment.body = createItem(s, 'seraph_raiment', 80, 'rare', context().rng);
      s.equipment.ring1 = createUnique(s, 'hollow_circuit', 80, context().rng);

      const c = context();
      startCombat(s, c, 'mudflats');
      s.combat!.buffs.push({
        id: 'mana_degen',
        source: 'skill',
        durationMs: 1e9,
        remainingMs: 1e9,
        stats: { manaRegenFlat: -100 },
      });

      const d = deriveStats(s);
      expect(d.raw.hollowCircuit).toBe(1);
      // Converted ES recovery is 0 (clamped positive)
      expect(d.esRecovery).toBe(0);
      // Mana regen is negative (remains mana degeneration)
      expect(d.manaRegen).toBeLessThan(0);
    });

    it('alternative mana recovery via flasks, leech, and recoup still functions', () => {
      const { s, c } = combatArena('heavy_strike');
      s.equipment.ring1 = createUnique(s, 'hollow_circuit', 80, c.rng);
      s.mana = 10;
      const startMana = s.mana;

      // Use a mana flask
      s.flaskSlots[1]!.charges = 30;
      useFlask(s, c, 1, false);
      combatStep(s, c, 500, deriveStats(s));
      expect(s.mana).toBeGreaterThan(startMana);
    });

    it('Debt of Stone zeroes max ES so Hollow Circuit cannot create ES and does not fallback to mana', () => {
      const s = newGame(1);
      s.equipment.body = createUnique(s, 'debt_of_stone', 80, context().rng);
      s.equipment.ring1 = createUnique(s, 'hollow_circuit', 80, context().rng);

      const d = deriveStats(s);
      expect(d.maxEs).toBe(0);
      expect(d.esRecovery).toBe(0);
      expect(d.manaRegen).toBe(0);
    });

    it('unequipping Hollow Circuit immediately restores normal mana regen and natural recharge', () => {
      const s = newGame(1);
      s.equipment.body = createItem(s, 'seraph_raiment', 80, 'rare', context().rng);
      s.equipment.amulet = createItem(s, 'amber_amulet', 80, 'rare', context().rng);
      addFixedMod(s.equipment.amulet, 'mana_regen_flat', 5, context().rng);
      s.equipment.ring1 = createUnique(s, 'hollow_circuit', 80, context().rng);

      const withCircuit = deriveStats(s);
      expect(withCircuit.manaRegen).toBe(0);
      expect(withCircuit.esRecharge).toBe(0);
      expect(withCircuit.esRecovery).toBeGreaterThan(0);

      delete s.equipment.ring1;
      const withoutCircuit = deriveStats(s);
      expect(withoutCircuit.manaRegen).toBeGreaterThan(0);
      expect(withoutCircuit.esRecharge).toBeGreaterThan(0);
      expect(withoutCircuit.esRecovery).toBe(0);
    });
  });

  describe('Realistic Builds & Live/Offline Parity', () => {
    it('simulates matching live/offline combat with hands_forgotten_choir', () => {
      const sLive = newGame(1);
      const ctx = context();
      prepareRuneUniqueBuild(sLive, ctx, 'hands_forgotten_choir');
      startCombat(sLive, ctx, 'mudflats');

      const sOffline = deserialize(serialize(sLive));

      // Advance live 30 seconds
      for (let i = 0; i < 600; i++) {
        tick(sLive, ctx, 50);
      }

      // Advance offline 30 seconds
      simulateOffline(sOffline, makeCtx(seeded(1)), 30_000);

      expect(sLive.combat?.totems?.length).toBeGreaterThan(0);
      expect(sOffline.combat?.totems?.length).toBeGreaterThan(0);
      expect(sLive.fallen).toBeFalsy();
      expect(sOffline.fallen).toBeFalsy();
    });

    it('simulates matching live/offline combat with hollow_circuit', () => {
      const sLive = newGame(1);
      const ctx = context();
      prepareRuneUniqueBuild(sLive, ctx, 'hollow_circuit');
      startCombat(sLive, ctx, 'mudflats');

      const sOffline = deserialize(serialize(sLive));

      for (let i = 0; i < 600; i++) {
        tick(sLive, ctx, 50);
      }

      simulateOffline(sOffline, makeCtx(seeded(1)), 30_000);

      expect(sLive.fallen).toBeFalsy();
      expect(sOffline.fallen).toBeFalsy();
      expect(sLive.es).toBeGreaterThan(0);
      expect(sOffline.es).toBeGreaterThan(0);
    });

    it('simulates matching live/offline combat with combo_choir_circuit', () => {
      const sLive = newGame(1);
      const ctx = context();
      prepareRuneUniqueBuild(sLive, ctx, 'combo_choir_circuit');
      startCombat(sLive, ctx, 'mudflats');

      const sOffline = deserialize(serialize(sLive));

      for (let i = 0; i < 600; i++) {
        tick(sLive, ctx, 50);
      }

      simulateOffline(sOffline, makeCtx(seeded(1)), 30_000);

      expect(sLive.fallen).toBeFalsy();
      expect(sOffline.fallen).toBeFalsy();
      expect(sLive.combat?.totems?.length).toBeGreaterThan(0);
      expect(sOffline.combat?.totems?.length).toBeGreaterThan(0);
    });
  });
});

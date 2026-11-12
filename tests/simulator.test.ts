import { describe, expect, it } from 'vitest';
import { CLASSES } from '../src/data/classes';
import { DROP_TABLES, BOSS_TABLES } from '../src/data/drops';
import { createSimulation, defaultConfig, prepareCharacter, applyRates, LIVE_RATES } from '../src/simulator/model';

describe('desktop balance simulator', () => {
  it.each(CLASSES)('runs $name through the real engine without replacing fixed gear', ({ id }) => {
    const config = { ...defaultConfig(), classId: id, upgradeGear: false, autoTree: false, autoSkills: false };
    const sim = createSimulation(config, 'test');
    const gear = structuredClone(sim.report.state.equipment);
    for (let i = 0; i < 600; i++) sim.step();
    expect(sim.report.simulatedMs).toBe(600_000);
    expect(sim.report.kills).toBeGreaterThan(0);
    expect(sim.report.state.equipment).toEqual(gear);
    expect(sim.report.state.character.classId).toBe(id);
  });
  it('replays the same decisions and random rolls with the same seed', () => {
    const config = { ...defaultConfig(), autoTree: false };
    const run = () => { const sim = createSimulation(config, 'test'); for (let i = 0; i < 180; i++) sim.step(); return sim.report; };
    const a = run(), b = run();
    expect(a.state).toEqual(b.state);
    expect(a.currency).toEqual(b.currency);
  });
  it('can disable combat XP while still fighting and earning drops', () => {
    const sim = createSimulation({ ...defaultConfig(), autoTree: false, rates: { ...LIVE_RATES, xp: 0 } }, 'test');
    for (let i = 0; i < 180; i++) sim.step();
    expect(sim.report.kills).toBeGreaterThan(0);
    expect(sim.report.xp).toBe(0);
  });
  it('rejects non-finite run settings before starting a worker', () => {
    expect(() => prepareCharacter({ ...defaultConfig(), hours: Infinity })).toThrow();
    expect(() => prepareCharacter({ ...defaultConfig(), seed: NaN })).toThrow();
  });
  it('applies rarity and unique experiments to the source tables only in its own process', () => {
    const drops = structuredClone(DROP_TABLES), bosses = structuredClone(BOSS_TABLES);
    try {
      applyRates({ ...LIVE_RATES, magic: 2, rare: 3, unique: 0 });
      expect(DROP_TABLES[1].rarity.magic).toBe(drops[1].rarity.magic * 2);
      expect(BOSS_TABLES[1].rarity.rare).toBe(bosses[1].rarity.rare * 3);
      expect(DROP_TABLES[1].uniqueChance).toBe(0);
    } finally { Object.assign(DROP_TABLES, drops); Object.assign(BOSS_TABLES, bosses); }
  });
});

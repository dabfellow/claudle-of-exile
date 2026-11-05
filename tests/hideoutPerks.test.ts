import { describe, expect, it } from 'vitest';
import { STATIONS } from '../src/data/hideout';
import { makeCtx } from '../src/engine/context';
import { stationPerks, upgradeStation } from '../src/engine/hideout';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';

const fresh = () => {
  const s = newGame(1);
  for (const station of STATIONS) {
    for (const level of station.levels) {
      for (const id of Object.keys(level.cost)) s.account.bank[id] = 1e7;
    }
  }
  return s;
};

describe('stationPerks', () => {
  it('adds stash pages up, and notes the bought ones', () => {
    const s = fresh();
    upgradeStation(s, makeCtx(seeded(1)), 'stash');
    expect(stationPerks(s, 'stash')).toEqual(['4 stash pages']);
    s.account.stash.push([]);
    expect(stationPerks(s, 'stash')).toEqual(['5 stash pages (1 bought)']);
  });

  it('lists every rule earned at the War Table, not just the latest', () => {
    const s = fresh();
    const ctx = makeCtx(seeded(1));
    upgradeStation(s, ctx, 'war_table');
    upgradeStation(s, ctx, 'war_table');
    expect(stationPerks(s, 'war_table')).toEqual(['Rules: Simple, Vitals, Wind-up, Ground, Status, Aim', '2 rule slots per skill']);
  });

  it('counts only bench recipes you can actually craft', () => {
    const s = fresh();
    expect(stationPerks(s, 'bench')).toEqual(['Use orbs on your gear']);
    upgradeStation(s, makeCtx(seeded(1)), 'bench');
    expect(stationPerks(s, 'bench')).toContain('4 of 19 bench recipes');
    s.achievements.push('salvager_50');
    expect(stationPerks(s, 'bench')).toContain('5 of 19 bench recipes');
  });

  it('replaces the Town Market numbers and keeps its stock perks', () => {
    const s = fresh();
    const ctx = makeCtx(seeded(1));
    upgradeStation(s, ctx, 'vendor');
    upgradeStation(s, ctx, 'vendor');
    expect(stationPerks(s, 'vendor')).toEqual(['6 wares per shop', 'Restock every 6 min', 'Rare gear in shops', 'Rarer currency']);
  });
});

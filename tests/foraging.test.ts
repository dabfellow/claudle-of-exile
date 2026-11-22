import { describe, expect, it } from 'vitest';
import { actionsFor } from '../src/data/skills';
import { makeCtx } from '../src/engine/context';
import { simulateOffline } from '../src/engine/offline';
import { seeded } from '../src/engine/rng';
import { startSkillAction } from '../src/engine/skills';
import { newGame, tick } from '../src/engine/state';

describe('Foraging wild patches', () => {
  it('exposes all nine base species patches and maintains live/offline parity', () => {
    const patches = actionsFor('harvesting');
    expect(patches.map((p) => p.id)).toEqual([
      'forage_sunpetal',
      'forage_frostleaf',
      'forage_emberroot',
      'forage_voidbloom',
      'forage_moon_bloom',
      'forage_thornvine',
      'forage_star_bloom',
      'forage_glimmermoss',
      'forage_wraithlily',
    ]);

    const live = newGame(7);
    const away = newGame(7);
    expect(startSkillAction(live, makeCtx(seeded(1)), 'forage_sunpetal')).toBeNull();
    expect(startSkillAction(away, makeCtx(seeded(1)), 'forage_sunpetal')).toBeNull();
    tick(live, makeCtx(seeded(2)), 30_000);
    simulateOffline(away, makeCtx(seeded(2)), 30_000);
    expect(away.storage.bank.sunpetal).toBe(live.storage.bank.sunpetal);
    expect(away.skills.harvesting).toBe(live.skills.harvesting);
  });
});

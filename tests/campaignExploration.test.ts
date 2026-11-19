import { describe, expect, it } from 'vitest';
import { ACTS, zonesInAct } from '../src/data/zones';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { actRevealed } from '../src/ui/campaignExploration';

describe('world map exploration', () => {
  it('starts on the coast and reveals successive acts from saved campaign unlocks', () => {
    const s = newGame(1);
    expect(ACTS.filter((act) => actRevealed(s, act.n)).map((act) => act.n)).toEqual([1]);
    for (let act = 2; act <= 7; act++) {
      s.unlockedZones.push(zonesInAct(act)[0].id);
      const loaded = deserialize(serialize(s));
      expect(ACTS.filter((chapter) => actRevealed(loaded, chapter.n)).map((chapter) => chapter.n))
        .toEqual(Array.from({ length: act }, (_, i) => i + 1));
    }
  });

  it('recognizes earlier exploration and the legacy finale without revealing a new character on the same account', () => {
    const s = newGame(2);
    s.bossesDefeated = [zonesInAct(5)[0].id];
    expect(actRevealed(s, 4)).toBe(true);
    expect(actRevealed(s, 5)).toBe(true);
    expect(actRevealed(s, 6)).toBe(false);
    s.account.campaignDone = true;
    s.bossesDefeated = [];
    expect(actRevealed(s, 2)).toBe(false);
    s.bossesDefeated = ['shatteredthrone'];
    expect(ACTS.every((act) => actRevealed(s, act.n))).toBe(true);
    expect(actRevealed(s, 8)).toBe(false);
  });
});

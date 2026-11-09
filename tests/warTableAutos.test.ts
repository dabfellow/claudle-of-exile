import { describe, expect, it } from 'vitest';
import { nextZones } from '../src/data/zones';
import { fillAccount, freshAccount } from '../src/engine/account';
import { autoNextZoneStep, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { autoChallengeUnlocked, autoFleeUnlocked, autoNextZoneUnlocked } from '../src/engine/hideout';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';

describe('War Table auto options', () => {
  it('sell auto flee first, then auto challenge, then auto next zone', () => {
    const s = newGame(1);
    expect([autoFleeUnlocked(s), autoChallengeUnlocked(s), autoNextZoneUnlocked(s)]).toEqual([false, false, false]);
    s.account.hideout.war_table = 2;
    expect([autoFleeUnlocked(s), autoChallengeUnlocked(s), autoNextZoneUnlocked(s)]).toEqual([true, false, false]);
    s.account.hideout.war_table = 4;
    expect([autoFleeUnlocked(s), autoChallengeUnlocked(s), autoNextZoneUnlocked(s)]).toEqual([true, true, false]);
    s.account.hideout.war_table = 6;
    expect(autoNextZoneUnlocked(s)).toBe(true);
  });

  it('are kept by players from before they were sold, but not given to new ones', () => {
    const old = freshAccount();
    delete old.hideout.war_table_tiers;
    fillAccount(old);
    expect(old.autosKept).toBe(true);
    const s = newGame(1);
    s.account = old;
    expect([autoFleeUnlocked(s), autoChallengeUnlocked(s), autoNextZoneUnlocked(s)]).toEqual([true, true, false]);
    expect(fillAccount(freshAccount()).autosKept).toBeUndefined();
  });

  it('auto next zone moves on once the boss is down and the next area is open, and only when switched on', () => {
    const s = newGame(1);
    const c = makeCtx(seeded(1));
    const next = nextZones('mudflats')[0];
    s.unlockedZones.push(next.id);
    s.bossesDefeated.push('mudflats');
    startCombat(s, c, 'mudflats');
    s.combat!.monsters = [];
    s.account.hideout.war_table = 6;
    autoNextZoneStep(s, c);
    expect(s.combat!.zoneId).toBe('mudflats');
    s.settings.autoNextZone = true;
    s.combat!.fleeing = true;
    autoNextZoneStep(s, c);
    expect(s.combat!.zoneId).toBe('mudflats');
    s.combat!.fleeing = false;
    autoNextZoneStep(s, c);
    expect(s.combat!.zoneId).toBe(next.id);
  });

  it('auto next zone waits while the boss is still up, and while locked', () => {
    const s = newGame(1);
    const c = makeCtx(seeded(1));
    s.unlockedZones.push(nextZones('mudflats')[0].id);
    startCombat(s, c, 'mudflats');
    s.combat!.monsters = [];
    s.settings.autoNextZone = true;
    s.account.hideout.war_table = 6;
    autoNextZoneStep(s, c);
    expect(s.combat!.zoneId).toBe('mudflats');
    s.bossesDefeated.push('mudflats');
    s.account.hideout.war_table = 5;
    autoNextZoneStep(s, c);
    expect(s.combat!.zoneId).toBe('mudflats');
  });
});

import { describe, expect, it } from 'vitest';
import { eventDef, type LiveEvent } from '../src/data/events';
import { zoneDef } from '../src/data/zones';
import { makeMonster } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { grantGemXp } from '../src/engine/gems';
import { rollLoot } from '../src/engine/loot';
import { seeded } from '../src/engine/rng';
import { serialize } from '../src/engine/save';
import { grantXp } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';

const halloween = eventDef('halloween');
const ctx = (event: LiveEvent | null) => ({ ...makeCtx(seeded(3)), event });
const player = () => newGame(1, { name: 'T', classId: 'warrior' });

describe('limited-time events', () => {
  it('double XP, for skills and gems alike', () => {
    const s = player();
    const gem = s.skillBar.find(Boolean)!;
    const before = gem.xp;
    grantXp(s, ctx(halloween), 'mining', 100);
    grantGemXp(s, ctx(halloween), 10);
    expect(s.skills.mining).toBe(200);
    expect(gem.xp - before).toBe(20);
  });

  it("rolls a monster's drops twice, and only while it runs", () => {
    const z = zoneDef('mudflats');
    const gold = (event: LiveEvent | null) => {
      const s = player();
      s.bank.gold = 0;
      const c = ctx(event);
      for (let i = 0; i < 500; i++) rollLoot(s, c, makeMonster(z.monsters[0], false, i), z, deriveStats(s));
      return s.bank.gold;
    };
    expect(gold(halloween)).toBeGreaterThan(gold(null) * 1.7);
  });

  it('is never saved on a character', () => {
    const s = player();
    grantXp(s, ctx(halloween), 'mining', 100);
    expect(serialize(s)).not.toContain('halloween');
  });

  it('an unknown event id means no event', () => {
    expect(eventDef('retired_event')).toBeNull();
    expect(eventDef(null)).toBeNull();
  });
});

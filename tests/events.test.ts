import { describe, expect, it } from 'vitest';
import { activeEvents, eventBoost, eventDef, type EventBoost, type EventRow } from '../src/data/events';
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
const ctx = (event: EventBoost | null) => ({ ...makeCtx(seeded(3)), event });
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
    const gold = (event: EventBoost | null) => {
      const s = player();
      s.account.bank.gold = 0;
      const c = ctx(event);
      for (let i = 0; i < 500; i++) rollLoot(s, c, makeMonster(z.monsters[0], false, i), z, deriveStats(s));
      return s.account.bank.gold;
    };
    expect(gold(halloween)).toBeGreaterThan(gold(null) * 1.7);
  });

  it('is never saved on a character', () => {
    const s = player();
    grantXp(s, ctx(halloween), 'mining', 100);
    expect(serialize(s)).not.toContain('halloween');
  });

  const row = (patch: Partial<EventRow>): EventRow => ({ id: 'christmas', enabled: false, starts_at: null, ends_at: null, ...patch });
  const at = (iso: string) => Date.parse(iso);

  it('runs by hand until turned off', () => {
    expect(activeEvents([row({ enabled: true })], 0).map((e) => e.id)).toEqual(['christmas']);
    expect(activeEvents([row({})], 0)).toEqual([]);
  });

  it('starts and ends on its schedule', () => {
    const rows = [row({ starts_at: '2026-12-24T00:00:00Z', ends_at: '2026-12-26T00:00:00Z' })];
    expect(activeEvents(rows, at('2026-12-23T23:59:59Z'))).toEqual([]);
    expect(activeEvents(rows, at('2026-12-24T00:00:00Z'))).toHaveLength(1);
    expect(activeEvents(rows, at('2026-12-26T00:00:00Z'))).toEqual([]);
  });

  it('a schedule with no end runs until it is cleared', () => {
    expect(activeEvents([row({ starts_at: '2026-12-24T00:00:00Z' })], at('2030-01-01T00:00:00Z'))).toHaveLength(1);
  });

  it('Double XP leaves drops alone', () => {
    expect(eventBoost([eventDef('double_xp')!])).toEqual({ xp: 2, loot: 1 });
  });

  it('events running together use the best of each bonus without stacking', () => {
    expect(eventBoost([eventDef('double_xp')!, eventDef('christmas')!])).toEqual({ xp: 2, loot: 2 });
    expect(eventBoost([])).toBeNull();
  });

  it('an unknown event id means no event', () => {
    expect(eventDef('retired_event')).toBeNull();
    expect(eventDef(null)).toBeNull();
    expect(activeEvents([row({ id: 'retired_event', enabled: true })], 0)).toEqual([]);
  });
});

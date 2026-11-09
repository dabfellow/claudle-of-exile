import { describe, expect, it } from 'vitest';
import { activeEvents, easterSunday, eventBoost, eventCalendar, eventChangeTimes, eventDef, eventFromRow, eventStatus, HOLIDAYS, thanksgivingDay, weekendFrom, type EventBoost, type EventRow, type LiveEvent } from '../src/data/events';
import { zoneDef } from '../src/data/zones';
import { makeMonster } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { grantGemXp } from '../src/engine/gems';
import { rollLoot } from '../src/engine/loot';
import { seeded } from '../src/engine/rng';
import { serialize } from '../src/engine/save';
import { grantXp, startSkillAction } from '../src/engine/skills';
import { newGame, tick } from '../src/engine/state';
import { payCraftCost } from '../src/engine/bank';
import { simulateOffline } from '../src/engine/offline';
import { CURRENCIES } from '../src/data/materials';
import { deriveStats } from '../src/engine/stats';

const halloween = eventDef('halloween');
const ctx = (event: EventBoost | null) => ({ ...makeCtx(seeded(3)), event });
const player = () => newGame(1, { name: 'T', classId: 'warrior' });

describe('limited-time events', () => {
  it('supports custom scheduled modifiers and distinguishes Live, Scheduled and Inactive',()=>{
    const row:EventRow={id:'custom-orbs',name:'Orb weekend',target:'currencyDrops',multiplier:1.25,banner:'More orbs!',enabled:false,starts_at:'2026-11-06T00:00:00Z',ends_at:'2026-11-07T00:00:00Z'};
    expect(eventStatus(row,Date.parse('2026-11-05T00:00:00Z'))).toBe('Scheduled');
    const live=activeEvents([row],Date.parse('2026-11-06T12:00:00Z'));
    expect(live[0]).toMatchObject({name:'Orb weekend',currencyDrops:1.25,banner:'More orbs!'});
    expect(eventStatus(row,Date.parse('2026-11-06T12:00:00Z'))).toBe('Live');
    expect(eventStatus(row,Date.parse('2026-11-08T00:00:00Z'))).toBe('Inactive');
  });
  it('uses the larger of All XP and a skill-specific XP boost',()=>{
    const s=player();const c=ctx({xp:2,loot:1,combatXp:3,gatheringXp:1.25});
    grantXp(s,c,'mining',100);grantXp(s,c,'combat',100);
    expect(s.skills.mining).toBe(200);expect(s.skills.combat).toBe(300);
  });
  it('increases gathering output and vendor refresh speed without advancing the game clock faster',()=>{
    const plain=player(),fast=player();const a=ctx(null),b=ctx({xp:1,loot:1,gatheringSpeed:2,vendorSpeed:2});
    startSkillAction(plain,a,'mine_copper');startSkillAction(fast,b,'mine_copper');
    const deadline=plain.vendor.refreshAt;
    tick(plain,a,30000);tick(fast,b,30000);
    expect(fast.clock).toBe(plain.clock);expect(fast.account.bank.copper_ore).toBe(plain.account.bank.copper_ore*2);
    expect(fast.vendor.refreshAt).toBe(deadline-30000);
  });
  it('conserves whole crafting materials at fractional cost without fractional balances',()=>{
    const s=player();s.account.bank.alteration=100;
    payCraftCost(s,ctx({xp:1,loot:1,craftingCost:0.5}),{alteration:100});
    expect(s.account.bank.alteration).toBe(50);
    const c=ctx({xp:1,loot:1,craftingCost:0.5});
    for(let i=0;i<20;i++)payCraftCost(s,c,{alteration:1});
    expect(Number.isInteger(s.account.bank.alteration)).toBe(true);expect(s.account.bank.alteration).toBeGreaterThan(30);
  });
  it('samples fractional loot rolls rather than rounding a 25% bonus up to double loot',()=>{
    const z=zoneDef('mudflats');
    const gold=(mult:number)=>{const s=player();s.account.bank.gold=0;const c=ctx({xp:1,loot:mult});const d=deriveStats(s);for(let i=0;i<1000;i++)rollLoot(s,c,makeMonster(z.monsters[0],false),z,d);return s.account.bank.gold;};
    const ratio=gold(1.25)/gold(1);expect(ratio).toBeGreaterThan(1.15);expect(ratio).toBeLessThan(1.4);
  });
  it('boosts currency orbs without also multiplying Gold or item drops',()=>{
    const z=zoneDef('mudflats');
    const drops=(mult:number)=>{const s=player();s.account.bank.gold=0;for(const currency of CURRENCIES)s.account.bank[currency.id]=0;const c=ctx({xp:1,loot:1,currencyDrops:mult});const d=deriveStats(s);for(let i=0;i<500;i++)rollLoot(s,c,makeMonster(z.monsters[0],false),z,d);return {gold:s.account.bank.gold,orbs:CURRENCIES.reduce((sum,currency)=>sum+(s.account.bank[currency.id]??0),0),items:c.events.filter((e)=>e.t==='loot'&&e.item).length};};
    const plain=drops(1),boost=drops(3);
    expect(plain.orbs).toBeGreaterThan(0);expect(boost.orbs).toBe(plain.orbs*3);expect(boost.gold).toBe(plain.gold);expect(boost.items).toBe(plain.items);
  });
  it('does not apply a currently active event to the whole offline interval',()=>{
    const plain=player(),scheduled=player();const a=ctx(null);
    // an ordinary Tuesday, away from every holiday
    const back=Date.parse('2026-03-10T12:00:00Z');
    const b={...ctx({xp:2,loot:1}),now:back,eventRows:[{id:'custom-xp',name:'Brief XP',target:'gatheringXp' as const,multiplier:2,enabled:false,starts_at:new Date(back-30000).toISOString(),ends_at:new Date(back).toISOString()}]};
    startSkillAction(plain,a,'mine_copper');startSkillAction(scheduled,b,'mine_copper');
    simulateOffline(plain,a,60000);simulateOffline(scheduled,b,60000);
    expect(scheduled.skills.mining).toBeGreaterThan(plain.skills.mining);
    expect(scheduled.skills.mining).toBeLessThan(plain.skills.mining*2);
    expect(scheduled.account.bank.copper_ore).toBe(plain.account.bank.copper_ore);
  });
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

  const row = (patch: Partial<EventRow>): EventRow => ({ id: 'double_xp', enabled: false, starts_at: null, ends_at: null, ...patch });
  const at = (iso: string) => Date.parse(iso);
  const ids = (rows: EventRow[], iso: string) => activeEvents(rows, at(iso)).map((e) => e.id).sort();
  // a Tuesday in March: no holiday runs then
  const QUIET = at('2026-03-10T12:00:00Z');

  it('runs by hand until turned off', () => {
    expect(activeEvents([row({ enabled: true })], QUIET).map((e) => e.id)).toEqual(['double_xp']);
    expect(activeEvents([row({})], QUIET)).toEqual([]);
  });

  it('starts and ends on its schedule', () => {
    const rows = [row({ starts_at: '2026-03-04T00:00:00Z', ends_at: '2026-03-06T00:00:00Z' })];
    expect(ids(rows, '2026-03-03T23:59:59Z')).toEqual([]);
    expect(ids(rows, '2026-03-04T00:00:00Z')).toEqual(['double_xp']);
    expect(ids(rows, '2026-03-06T00:00:00Z')).toEqual([]);
  });

  it('a schedule with no end runs until it is cleared', () => {
    expect(ids([row({ starts_at: '2026-03-04T00:00:00Z' })], '2030-03-05T00:00:00Z')).toEqual(['double_xp']);
  });

  it('Double XP leaves drops alone', () => {
    expect(eventBoost([eventDef('double_xp')!])).toEqual({ xp: 2, loot: 1 });
  });

  it('an unknown event id means no event', () => {
    expect(eventDef('retired_event')).toBeNull();
    expect(eventDef(null)).toBeNull();
    expect(activeEvents([row({ id: 'retired_event', enabled: true })], QUIET)).toEqual([]);
  });
});

describe('holiday calendar', () => {
  const at = (iso: string) => Date.parse(iso);
  const ids = (rows: EventRow[], iso: string) => activeEvents(rows, at(iso)).map((e) => e.id).sort();
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  it('works out Easter Sunday for many years', () => {
    const known: Record<number, string> = { 2019: '2019-04-21', 2024: '2024-03-31', 2025: '2025-04-20', 2026: '2026-04-05', 2027: '2027-03-28',
      2028: '2028-04-16', 2029: '2029-04-01', 2030: '2030-04-21', 2035: '2035-03-25', 2038: '2038-04-25' };
    for (const [year, date] of Object.entries(known)) expect(iso(easterSunday(Number(year)))).toBe(date);
  });

  it('works out Thanksgiving (fourth Thursday of November) for many years', () => {
    const known: Record<number, string> = { 2024: '2024-11-28', 2025: '2025-11-27', 2026: '2026-11-26', 2027: '2027-11-25', 2028: '2028-11-23', 2029: '2029-11-22', 2030: '2030-11-28' };
    for (const [year, date] of Object.entries(known)) {
      expect(iso(thanksgivingDay(Number(year)))).toBe(date);
      expect(new Date(thanksgivingDay(Number(year))).getUTCDay()).toBe(4);
    }
  });

  it('runs Easter from Good Friday through Easter Monday', () => {
    expect(HOLIDAYS.easter(2027)).toEqual({ start: at('2027-03-26T00:00:00Z'), end: at('2027-03-30T00:00:00Z') });
    expect(ids([], '2027-03-25T23:59:59Z')).toEqual([]);
    expect(ids([], '2027-03-29T23:59:59Z')).toEqual(['easter']);
    expect(ids([], '2027-03-30T00:00:00Z')).toEqual([]);
  });

  it('switches holidays on by themselves, with an empty table', () => {
    expect(ids([], '2026-12-25T12:00:00Z')).toEqual(['christmas']);
    expect(ids([], '2028-11-24T12:00:00Z')).toEqual(['thanksgiving']);
    expect(ids([], '2026-10-31T23:00:00Z')).toEqual(['halloween']);
    expect(ids([], '2027-02-14T08:00:00Z')).toEqual(['valentines']);
    expect(ids([], '2026-06-21T08:00:00Z')).toEqual(['summer']);
    expect(ids([], '2026-12-27T00:00:00Z')).toEqual([]);
  });

  it('runs New Year across the turn of the year', () => {
    for (const year of [2026, 2027, 2030]) {
      expect(ids([], `${year}-12-31T00:00:00Z`)).toEqual(['new_year']);
      expect(ids([], `${year + 1}-01-01T00:00:00Z`)).toEqual(['new_year']);
      expect(ids([], `${year + 1}-01-02T23:59:59Z`)).toEqual(['new_year']);
      expect(ids([], `${year + 1}-01-03T00:00:00Z`)).toEqual([]);
    }
  });

  it('a holiday switched off in Admin stays off, but can still be started by hand', () => {
    const off: EventRow = { id: 'christmas', enabled: false, starts_at: null, ends_at: null, holiday_off: true };
    expect(ids([off], '2026-12-25T12:00:00Z')).toEqual([]);
    expect(ids([{ ...off, enabled: true }], '2026-12-25T12:00:00Z')).toEqual(['christmas']);
    expect(eventCalendar([off], at('2026-12-01T00:00:00Z')).upcoming.map((t) => t.event.id)).not.toContain('christmas');
  });

  it('shows what is on now with its end, and what comes next', () => {
    const cal = eventCalendar([], at('2026-11-09T12:00:00Z'));
    expect(cal.live).toEqual([]);
    expect(cal.upcoming[0]).toMatchObject({ event: { id: 'thanksgiving' }, start: at('2026-11-26T00:00:00Z'), end: at('2026-11-30T00:00:00Z') });
    expect(cal.upcoming.map((t) => t.event.id).slice(0, 3)).toEqual(['thanksgiving', 'christmas', 'new_year']);
    const xmas = eventCalendar([], at('2026-12-24T00:00:00Z'));
    expect(xmas.live).toMatchObject([{ event: { id: 'christmas' }, end: at('2026-12-27T00:00:00Z') }]);
  });

  it('lists a scheduled admin event among what comes next', () => {
    const custom: EventRow = { id: 'custom-1', name: 'Mining rush', target: 'gatheringSpeed', multiplier: 2, enabled: false, starts_at: '2026-11-12T18:00:00Z', ends_at: '2026-11-13T18:00:00Z' };
    expect(eventCalendar([custom], at('2026-11-09T12:00:00Z')).upcoming[0]).toMatchObject({ event: { name: 'Mining rush' }, start: at('2026-11-12T18:00:00Z') });
  });
});

describe('weekend events', () => {
  const at = (iso: string) => Date.parse(iso);
  const weekend: EventRow = { id: 'double_xp', enabled: true, starts_at: null, ends_at: null, weekends: true };

  it('runs from Friday 18:00 to Monday 06:00 UTC', () => {
    // 13 Nov 2026 is a Friday
    expect(activeEvents([weekend], at('2026-11-13T17:59:00Z'))).toEqual([]);
    expect(activeEvents([weekend], at('2026-11-13T18:00:00Z'))).toHaveLength(1);
    expect(activeEvents([weekend], at('2026-11-15T12:00:00Z'))).toHaveLength(1);
    expect(activeEvents([weekend], at('2026-11-16T05:59:00Z'))).toHaveLength(1);
    expect(activeEvents([weekend], at('2026-11-16T06:00:00Z'))).toEqual([]);
    expect(activeEvents([weekend], at('2026-11-18T12:00:00Z'))).toEqual([]);
    expect(weekendFrom(at('2026-11-18T12:00:00Z'))).toEqual({ start: at('2026-11-20T18:00:00Z'), end: at('2026-11-23T06:00:00Z') });
  });

  it('only runs on weekends inside its own dates, and says when the next one starts', () => {
    const december: EventRow = { ...weekend, enabled: false, starts_at: '2026-12-01T00:00:00Z', ends_at: '2027-01-01T00:00:00Z' };
    const on = (iso: string) => activeEvents([december], at(iso)).some((e) => e.id === 'double_xp');
    expect(on('2026-11-28T12:00:00Z')).toBe(false);
    expect(on('2026-12-05T12:00:00Z')).toBe(true);
    expect(on('2026-12-09T12:00:00Z')).toBe(false);
    expect(on('2027-01-02T12:00:00Z')).toBe(false);
    const next = eventCalendar([december], at('2026-11-20T12:00:00Z')).upcoming.find((t) => t.event.id === 'double_xp');
    expect(next).toMatchObject({ start: at('2026-12-04T18:00:00Z'), end: at('2026-12-07T06:00:00Z') });
    const live = eventCalendar([december], at('2026-12-05T12:00:00Z')).live.find((t) => t.event.id === 'double_xp');
    expect(live?.end).toBe(at('2026-12-07T06:00:00Z'));
  });

  it('cuts offline time where holidays and weekends start and stop', () => {
    const times = eventChangeTimes([weekend], at('2026-12-22T00:00:00Z'), at('2026-12-28T00:00:00Z'));
    expect(times).toContain(at('2026-12-23T00:00:00Z'));
    expect(times).toContain(at('2026-12-27T00:00:00Z'));
    expect(times).toContain(at('2026-12-25T18:00:00Z'));
  });
});

describe('stacking events', () => {
  const xpEvent = (id: string, mult: number): LiveEvent => eventFromRow({ id, name: id, target: 'xp', multiplier: mult, enabled: true, starts_at: null, ends_at: null })!;

  it('adds bonuses together instead of multiplying them', () => {
    expect(eventBoost([eventDef('double_xp')!, xpEvent('custom-xp', 2)])).toEqual({ xp: 3, loot: 1 });
    expect(eventBoost([eventDef('double_xp')!, eventDef('christmas')!])).toEqual({ xp: 3, loot: 2 });
    expect(eventBoost([eventDef('double_xp')!, xpEvent('a', 1.5), xpEvent('b', 1.25)])).toEqual({ xp: 2.75, loot: 1 });
    expect(eventBoost([])).toBeNull();
  });

  it('a narrow bonus counts the broad one running beside it', () => {
    const combat = eventFromRow({ id: 'c', name: 'Combat', target: 'combatXp', multiplier: 2, enabled: true, starts_at: null, ends_at: null })!;
    const orbs = eventFromRow({ id: 'o', name: 'Orbs', target: 'currencyDrops', multiplier: 2, enabled: true, starts_at: null, ends_at: null })!;
    expect(eventBoost([eventDef('christmas')!, combat, orbs])).toMatchObject({ xp: 2, loot: 2, combatXp: 3, currencyDrops: 3 });
  });

  it('crafting savings add up to at most half off', () => {
    const cost = (mult: number, id = 'k') => eventFromRow({ id, name: id, target: 'craftingCost', multiplier: mult, enabled: true, starts_at: null, ends_at: null })!;
    expect(eventBoost([cost(0.8, 'a'), cost(0.8, 'b')])?.craftingCost).toBeCloseTo(0.6);
    expect(eventBoost([cost(0.5, 'a'), cost(0.5, 'b')])?.craftingCost).toBe(0.5);
  });

  it('two Double XP events running together give triple XP in game', () => {
    const rows: EventRow[] = [
      { id: 'double_xp', enabled: true, starts_at: null, ends_at: null },
      { id: 'custom-xp', name: 'Bonus XP', target: 'xp', multiplier: 2, enabled: true, starts_at: null, ends_at: null },
    ];
    const s = player();
    grantXp(s, ctx(eventBoost(activeEvents(rows, Date.parse('2026-03-10T12:00:00Z')))), 'mining', 100);
    expect(s.skills.mining).toBe(300);
  });

  it('a holiday and a hand-started event stack, and the same event never counts twice', () => {
    const rows: EventRow[] = [{ id: 'double_xp', enabled: true, starts_at: null, ends_at: null }, { id: 'christmas', enabled: true, starts_at: null, ends_at: null }];
    const live = activeEvents(rows, Date.parse('2026-12-25T12:00:00Z'));
    expect(live.map((e) => e.id).sort()).toEqual(['christmas', 'double_xp']);
    expect(eventBoost(live)).toEqual({ xp: 3, loot: 2 });
  });
});

import { describe, expect, it } from 'vitest';
import { activeEvents, eventBoost, eventDef, eventStatus, type EventBoost, type EventRow } from '../src/data/events';
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
  it('uses the best applicable XP boost rather than multiplying overlapping events',()=>{
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
    const plain=player(),scheduled=player();const a=ctx(null),b={...ctx({xp:2,loot:1}),now:60000,eventRows:[{id:'custom-xp',name:'Brief XP',target:'gatheringXp' as const,multiplier:2,enabled:false,starts_at:new Date(30000).toISOString(),ends_at:new Date(60000).toISOString()}]};
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

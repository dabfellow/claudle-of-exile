import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ZONES } from '../src/data/zones';
import { marketRules } from '../src/data/marketRules';
import { newGame } from '../src/engine/state';
import { serialize } from '../src/engine/save';
import { summarize } from '../src/platform/saves';
import { BASES, UNIQUES } from '../src/data/bases';
import { createItem, createUnique } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { compensationItem } from '../src/platform/admin';

const ALICE='00000000-0000-0000-0000-00000000000a';
const BOB='00000000-0000-0000-0000-00000000000b';
const ADMIN='00000000-0000-0000-0000-00000000000e';
let db: PGlite;
let sequence=0;
const op=()=>`00000000-0000-4000-8000-${String(++sequence).padStart(12,'0')}`;
async function as<T=unknown>(who: string|null, sql: string, args: unknown[]=[]): Promise<T> {
  await db.exec(`set role ${who ? 'authenticated' : 'anon'}`);
  try {
    await db.query("select set_config('test.uid',$1,false)",[who??'']);
    const result=await db.query<Record<string,T>>(sql,args);
    return Object.values(result.rows[0]??{})[0];
  } finally { await db.exec('reset role'); }
}

beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    grant usage on schema auth,public to anon,authenticated;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    alter default privileges in schema public grant all on tables to anon,authenticated;
    alter default privileges in schema public grant all on functions to anon,authenticated;`);
  const setup=readFileSync('docs/ops/SETUP.md','utf8');
  for(const match of setup.matchAll(/```sql\r?\n([\s\S]*?)```/g)) {
    if(/create table public\.(characters|admins|live_events)\b/.test(match[1])) await db.exec(match[1]);
  }
  await db.exec(readFileSync('docs/ops/market.sql','utf8'));
  const migration=readFileSync('docs/ops/admin.sql','utf8');
  await db.exec(migration); await db.exec(migration);
  for(const uid of [ALICE,BOB,ADMIN]) await db.query('insert into auth.users(id,email) values($1,$2)',[uid,`${uid.slice(-1)}@example.test`]);
  await db.query('insert into admins values($1)',[ADMIN]);
  await as(ADMIN,'select market_set_rules($1,$2)',['test',JSON.stringify(marketRules())]);
},60000);
afterAll(async()=>{await db?.close();});

beforeEach(async()=>{
  await db.exec('truncate characters,admin_mail,admin_audit,admin_save_backups,demo_counters,feedback,market_inbox,market_listings,market_ops,live_events cascade');
  for(const [uid,id,classId] of [[ALICE,'alice','Warrior'],[BOB,'bob','warrior']]) {
    const s=newGame(1,{id,name:id,classId:'warrior'});
    s.bossesDefeated=ZONES.filter((z)=>z.actBoss).map((z)=>z.id);
    s.clock=100000; s.lifetime.deathZones={mudflats:2};
    await db.query('insert into characters(id,user_id,name,class_id,summary,save) values($1,$2,$3,$4,$5,$6)',[id,uid,id,classId,JSON.stringify(summarize(s)),serialize(s)]);
  }
});

describe('admin operations privilege boundary',()=>{
  it('rejects players/guests on inspector, backups, mail, bulk actions and diagnostics',async()=>{
    for(const user of [null,ALICE]) {
      for(const sql of ["select admin_players()","select admin_inspect('bob')","select admin_overview()","select admin_feedback()","select admin_resolve_before('0.4.0')"])
        await expect(as(user,sql)).rejects.toThrow();
      await expect(as(user,'select admin_restore(1,$1,$2)',[op(),'Rescue'])).rejects.toThrow();
      await expect(as(user,'select admin_message($1,$2,$3,$4)',[op(),BOB,'standard','Forged'])).rejects.toThrow();
      await expect(as(user,'select * from admin_save_backups')).rejects.toThrow();
      await expect(as(user,'select * from admin_audit')).rejects.toThrow();
    }
  });

  it('normalizes classes, excludes account rows and derives all six actual act clears',async()=>{
    await db.query("insert into characters(id,user_id,name,class_id,summary,save) values('account:standard:test',$1,'account','account','{}','{}')",[ALICE]);
    const stats=await as<{characters:number;by_class:Record<string,number>;funnel:{act:number;count:number}[];death_zones:Record<string,number>}>(ADMIN,'select admin_overview()');
    expect(stats.characters).toBe(2); expect(stats.by_class).toEqual({warrior:2});
    expect(stats.funnel).toEqual([1,2,3,4,5,6].map((act)=>({act,count:2})));
    expect(stats.death_zones).toEqual({mudflats:4});
    const more=await as<{by_realm:Record<string,number>;last_seen:{day:number};signups_by_day:unknown[];playtime_hours:number}>(ADMIN,'select admin_overview()');
    expect(more.by_realm).toEqual({standard:2}); expect(more.last_seen.day).toBe(2); expect(more.signups_by_day).toHaveLength(14);
    expect(Number(more.playtime_hours)).toBeGreaterThan(0);
    const rows=await as<{acts:number;deaths:number}[]>(ADMIN,'select admin_players()');
    expect(rows.every((r)=>Number(r.acts)===6)).toBe(true);
  });

  it('searches names and email, and tolerates malformed client diagnostic numbers',async()=>{
    await db.query("update characters set updated_at='2099-01-01',save=jsonb_set(save,'{clock}','\"not a number\"'),summary=jsonb_set(summary,'{combatLevel}','\"bad\"') where id='alice'");
    const rows=await as<{id:string;playtime_ms:number}[]>(ADMIN,'select admin_players($1)',['a@example.test']);
    expect(rows).toHaveLength(1); expect(rows[0].id).toBe('alice'); expect(Number(rows[0].playtime_ms)).toBe(0);
    expect((await db.query<{real:boolean}>("select updated_at<now()+interval '1 minute' as real from characters where id='alice'")).rows[0].real).toBe(true);
    await expect(as(ADMIN,'select admin_overview()')).resolves.toBeTruthy();
  });

  it('captures a pre-update save, restores a separate copy and makes retries idempotent',async()=>{
    await db.query("update characters set save=jsonb_set(save,'{clock}','200000') where id='alice'");
    const info=await as<{backups:{id:number}[]}>(ADMIN,"select admin_inspect('alice')");
    expect(info.backups).toHaveLength(1);
    const request=op();
    const id=await as<string>(ADMIN,'select admin_restore($1,$2,$3)',[info.backups[0].id,request,'Recover lost progress']);
    expect(await as(ADMIN,'select admin_restore($1,$2,$3)',[info.backups[0].id,request,'Recover lost progress'])).toBe(id);
    const rows=await db.query<{id:string;save:{clock:number;character:{id:string}}}>('select id,save from characters where user_id=$1 order by id',[ALICE]);
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows.find((r)=>r.id==='alice')?.save.clock).toBe(200000);
    expect(rows.rows.find((r)=>r.id===id)?.save).toMatchObject({clock:100000,character:{id},combat:null,action:null});
    expect((await db.query('select * from admin_audit')).rows).toHaveLength(1);
  });

  it('retains ten spaced restore points and does not back up every autosave',async()=>{
    for(let i=0;i<15;i++) {
      await db.exec("update admin_save_backups set created_at=created_at-interval '6 minutes'");
      await db.query("update characters set save=jsonb_set(save,'{clock}',$1::jsonb) where id='alice'",[String(200000+i)]);
    }
    expect((await db.query('select * from admin_save_backups')).rows).toHaveLength(10);
    await db.exec("update characters set save=jsonb_set(save,'{clock}','300000') where id='alice'");
    expect((await db.query('select * from admin_save_backups')).rows).toHaveLength(10);
  });

  it('keeps deleted characters searchable and recovers the last save before deletion',async()=>{
    await db.exec("update characters set save=jsonb_set(save,'{clock}','250000') where id='alice'");
    await db.query("update characters set save=save||$1::jsonb where id='alice'",[JSON.stringify({fallen:{zoneId:'mudflats',offline:false},life:-100,maps:{stock:{},run:{tier:1},auto:{tier:1,theme:'barrows'},tally:{runs:0,clearMs:0,mapsFound:0,favoured:0}}})]);
    await db.exec("delete from characters where id='alice'");
    const rows=await as<{id:string;deleted:boolean;playtime_ms:number}[]>(ADMIN,"select admin_players('alice')");
    expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({id:'alice',deleted:true});expect(Number(rows[0].playtime_ms)).toBe(250000);
    const detail=await as<{deleted:boolean;character:{save:{clock:number}};backups:{id:number}[]}>(ADMIN,"select admin_inspect('alice')");
    expect(detail.deleted).toBe(true);expect(detail.character.save.clock).toBe(250000);
    const stats=await as<{death_zones:Record<string,number>}>(ADMIN,'select admin_overview()');
    expect(stats.death_zones.mudflats).toBe(4); // includes Alice's retained deleted save
    const id=await as<string>(ADMIN,'select admin_restore($1,$2,$3)',[detail.backups[0].id,op(),'Restore deleted character']);
    const recovered=(await db.query<{save:{life:number;fallen?:unknown;maps:{run:unknown;auto:unknown}}}>('select save from characters where id=$1',[id])).rows[0].save;
    expect(recovered.fallen).toBeUndefined();expect(recovered.life).toBe(1);expect(recovered.maps).toMatchObject({run:null,auto:null});
  });

  it('does not prevent account deletion with a new backup referencing the deleted account',async()=>{
    await db.exec('begin');
    try {
      await db.query('delete from auth.users where id=$1',[BOB]);
      expect((await db.query('select id from characters where user_id=$1',[BOB])).rows).toEqual([]);
      expect((await db.query('select id from admin_save_backups where user_id=$1',[BOB])).rows).toEqual([]);
    } finally { await db.exec('rollback'); }
  });

  it('accepts bounded diagnostic snapshots, links only the reporter’s character and protects event writes',async()=>{
    await as(ALICE,"insert into feedback(kind,message,context) values('bug','Build report',$1)",[JSON.stringify({version:'0.4.2',characterId:'bob',snapshot:{log:[],state:'diagnostic '.repeat(500)}})]);
    const feedback=await as<{verified_character_id:string|null}[]>(ADMIN,'select admin_feedback()');
    expect(feedback[0].verified_character_id).toBeNull();
    await expect(as(ALICE,"insert into live_events(id,name,target,multiplier,enabled) values('forged','Forged','xp',3,true)")).rejects.toThrow('row-level security');
    await as(ADMIN,"insert into live_events(id,name,target,multiplier,enabled) values('custom','Mining weekend','gatheringSpeed',2,true)");
    expect((await db.query("select * from admin_audit where action='event'")).rows).toHaveLength(1);
    await expect(as(ADMIN,"update live_events set target='craftingCost',multiplier=3 where id='custom'")).rejects.toThrow('admin_event_modifier');
    await expect(as(ALICE,"insert into feedback(kind,message,context) values('bug','Too large',$1)",[JSON.stringify({data:'x'.repeat(300000)})])).rejects.toThrow();
  });

  it('delivers replies and compensation once, in the chosen realm, without exposing another inbox',async()=>{
    const request=op();
    const args=[request,ALICE,'standard','Thanks for reporting this',100];
    const send="select admin_message($1,$2,$3,$4,p_currency=>'gold',p_amount=>$5)";
    await as(ADMIN,send,args); await as(ADMIN,send,args);
    expect((await as<unknown[]>(ALICE,'select jsonb_agg(to_jsonb(m)) from admin_mail m')).length).toBe(1);
    expect(await as(BOB,'select count(*)::int from admin_mail')).toBe(0);
    await expect(as(ALICE,"update admin_mail set message='Forged'")).rejects.toThrow('permission denied');
    const deliveries=await as<{amount:number}[]>(ALICE,"select market_collect('standard')");
    expect(deliveries).toHaveLength(1); expect(deliveries[0].amount).toBe(100);
    expect(await as(ALICE,"select market_collect('standard')")).toEqual([]);
  });

  it('rejects forged reply recipients and invalid compensation atomically',async()=>{
    const inserted=await db.query<{id:number}>("insert into feedback(user_id,kind,message) values($1,'bug','Help') returning id",[ALICE]);
    await expect(as(ADMIN,'select admin_message($1,$2,$3,$4,$5)',[op(),BOB,'standard','Wrong player',inserted.rows[0].id])).rejects.toThrow('recipient');
    await expect(as(ADMIN,"select admin_message($1,$2,'standard','Bad amount',p_currency=>'gold',p_amount=>-1)",[op(),ALICE])).rejects.toThrow('Compensation');
    expect((await db.query('select * from admin_mail')).rows).toEqual([]);
    expect((await db.query('select * from market_inbox')).rows).toEqual([]);
  });

  it('lets admins replace a no-trade unique without making that unique market-tradeable',async()=>{
    const unique=UNIQUES.find((u)=>u.noTrade)!;
    const gift=createUnique(newGame(),unique.id,80);
    await as(ADMIN,"select admin_message($1,$2,'standard','Replace lost reward',p_item=>$3)",[op(),ALICE,JSON.stringify(gift)]);
    const deliveries=await as<{item:{uniqueId:string}}[]>(ALICE,"select market_collect('standard')");
    expect(deliveries[0].item.uniqueId).toBe(unique.id);
    await expect(as(ALICE,"select market_list($1,$2,'buy','gold',100)",[op(),JSON.stringify(gift)])).rejects.toThrow();
  });

  it('delivers a compensation item made from any base the admin picker offers',async()=>{
    // stripped the way the Admin page sends it, so a database from before tiered loot accepts it too
    expect(Object.keys(compensationItem(createItem(newGame(),BASES[0].id,80,'normal',seeded(1))))).not.toContain('itemTier');
    for(const base of BASES.filter((b)=>!b.retired)) {
      const gift=compensationItem(createItem(newGame(),base.id,80,'normal',seeded(1)));
      await as(ADMIN,"select admin_message($1,$2,'standard','Replace lost item',p_item=>$3)",[op(),ALICE,JSON.stringify(gift)]);
    }
    for(const unique of UNIQUES) {
      const gift=createUnique(newGame(),unique.id,80,seeded(2));
      await as(ADMIN,"select admin_message($1,$2,'standard','Replace lost unique',p_item=>$3)",[op(),ALICE,JSON.stringify(gift)]);
    }
    const deliveries=await as<{item:{baseId:string}}[]>(ALICE,"select market_collect('standard')");
    expect(deliveries.length).toBe(BASES.filter((b)=>!b.retired).length+UNIQUES.length);
  },60000);

  it('filters reports and bulk resolves by numeric version without swallowing unknown versions',async()=>{
    for(const version of ['0.3.9','0.3.20','0.4.0','dev','999999999999999999999.0.0']) await db.query("insert into feedback(user_id,kind,message,context) values($1,'bug','Test',$2)",[ALICE,JSON.stringify({version})]);
    expect(await as(ADMIN,"select admin_resolve_before('0.4.0')")).toBe(2);
    const rows=await as<{context:{version:string};email:string}[]>(ADMIN,"select admin_feedback('new','bug','0.4.0')");
    expect(rows).toHaveLength(1); expect(rows[0].email).toBe('a@example.test');
  });

  it('deduplicates anonymous demo events and refuses arbitrary payloads',async()=>{
    const session=op();
    await as(null,"select record_demo($1,'demo_started')",[session]); await as(null,"select record_demo($1,'demo_started')",[session]);
    expect((await db.query('select * from demo_counters')).rows).toHaveLength(1);
    await expect(as(null,"select record_demo($1,'email')",[session])).rejects.toThrow('Invalid demo');
    await expect(as(null,'select * from demo_counters')).rejects.toThrow('permission denied');
  });
});

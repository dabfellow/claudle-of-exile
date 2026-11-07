import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../src/platform/supabase',()=>({getSupabase:()=>null}));
import { classBreakdown, feedbackSnapshot, levelBreakdown, sandboxState } from '../src/platform/admin';
import { feedbackContext } from '../src/platform/feedback';
import { newGame } from '../src/engine/state';
import { serialize } from '../src/engine/save';
import { LocalSaveStore, MemorySaveStore, type SaveStore } from '../src/platform/saves';

afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});

describe('admin diagnostics and reproduction',()=>{
  it('merges legacy class casing without turning unknown classes into Warrior',()=>{
    expect(classBreakdown({Warrior:12,warrior:7,' MAGE ':2,account:1,unknown:1})).toEqual([['warrior',19],['mage',2],['unknown',1]]);
  });
  it('keeps empty histogram buckets between the youngest and oldest characters',()=>{
    const rows=levelBreakdown({'15':2,'25':1,'70':1});
    expect(rows).toHaveLength(15);
    expect(rows[4]).toEqual(['20–24',0]); expect(rows[10]).toEqual(['50–54',0]); expect(rows[14]).toEqual(['70–74',1]);
  });
  it('captures a detached build snapshot with ten log lines and no shared stash or browser credentials',()=>{
    const s=newGame(1,{name:'Report character',classId:'templar'});
    s.settings.posture='kiter';s.passives=['test-node'];
    s.account.bank.gold=123;
    s.account.stash[0].push({uid:123,baseId:'rusted_sword',ilvl:1,rarity:'normal',name:'Private stash item',prefixes:[],suffixes:[]});
    const before=serialize(s);
    const context=feedbackContext(s,'settings',Array.from({length:20},(_,i)=>`Log ${i}`));
    expect(context.characterName).toBe('Report character');
    expect(context.snapshot?.state).toMatchObject({settings:{posture:'kiter'},passives:['test-node'],account:{bank:{gold:123}}});
    expect(context.snapshot?.log).toHaveLength(10);
    expect(JSON.stringify(context)).not.toContain('Private stash item');
    expect(serialize(s)).toBe(before);
    context.snapshot!.state!.skills.combat=999;
    expect(s.skills.combat).not.toBe(999);
  });
  it('bounds extreme reports without preventing feedback submission',()=>{
    const s=newGame(1);
    s.passives=Array.from({length:100000},()=> 'oversized');
    const snapshot=feedbackSnapshot(s);
    expect(snapshot.truncated).toBe(true); expect(snapshot.state).toBeUndefined();
    expect(new TextEncoder().encode(JSON.stringify(snapshot)).length).toBeLessThan(196608);
  });
  it('gives sandbox copies a fresh identity while leaving the inspected state unchanged',()=>{
    const s=newGame(1,{name:'Original',classId:'mage'});
    const copy=sandboxState(JSON.parse(serialize(s)),s.account);
    expect(copy.character.id).not.toBe(s.character.id);
    expect(copy.character.name).toContain('[sandbox]');
    copy.account.bank.gold=999;
    expect(s.account.bank.gold).not.toBe(999);
  });

  it('runs the actual sandbox through a memory store and returns to the original without uploading sandbox changes',async()=>{
    vi.useFakeTimers();
    const values=new Map<string,string>();
    const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);},clear:()=>values.clear(),key:()=>null,get length(){return values.size;}};
    vi.stubGlobal('localStorage',storage);vi.stubGlobal('window',{addEventListener:vi.fn()});
    const {game}=await import('../src/game');
    const original=newGame(1,{name:'Admin original',classId:'mage'});
    const saves=new LocalSaveStore(storage,'sandbox-test',false);
    const upload=vi.spyOn(saves,'save');
    const internals=game as unknown as {saves:SaveStore|null};
    internals.saves=saves;game.state=original;game.realm=original.account;game.screen='game';game.isAdmin=true;
    const target=newGame(1,{name:'Target',classId:'warrior'});
    game.startSandbox(JSON.parse(serialize(target)),target.account);
    expect(internals.saves).toBeInstanceOf(MemorySaveStore);
    const before=upload.mock.calls.length;
    expect(game.marketAccess).toBe('solo');
    game.state.account.bank.gold=999999;
    game.save();vi.advanceTimersByTime(15000);game.save();
    expect(upload.mock.calls).toHaveLength(before);
    expect(original.account.bank.gold).not.toBe(999999);
    await game.exit();
    expect(game.state).toBe(original);expect(internals.saves).toBe(saves);expect(game.sandbox).toBe(false);
    await game.exit();
  });
});

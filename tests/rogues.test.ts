import { describe, expect, it } from 'vitest';
import { ROGUES, talentPoints } from '../src/data/rogues';
import { heistJob, prepBoard, prepId } from '../src/data/heist';
import { newGame } from '../src/engine/state';
import { alarmChance, heistStep, settleHeist, startHeist, stopHeistRepeat, toggleCrew } from '../src/engine/heist';
import { chooseTactic, finishTraining, grantRogueXp, learnTalent, roomRevealed, roomSpecialty, scoutRoom, trainRogue, vaultProfile } from '../src/engine/rogues';
import { deriveStats } from '../src/engine/stats';
import { serialize, deserialize } from '../src/engine/save';
import type { Ctx } from '../src/engine/context';

const safe: Ctx = { rng: { next: () => 0.999 }, now: 0, emit: () => {} };
const job = heistJob('cinder_toll');
function setup() {
  const s = newGame(1, { name: 'Rogue test', classId: 'ranger' });
  for (const e of prepBoard(job.id).items.filter((x) => x.kind !== 'ledger').slice(0, 2)) s.heist.prep[prepId(job.id, e.kind)] = 3;
  s.storage.bank.gold = 20000;
  s.heist.unlockedRogues = ROGUES.map((r) => r.id);
  s.heist.crew = ['bruiser', 'locksmith', 'lookout'];
  return s;
}
function run() {
  const s = setup();
  expect(startHeist(s, safe, job.id)).toBeNull();
  stopHeistRepeat(s);
  return s;
}
function clear(s: ReturnType<typeof setup>, ctx = safe) {
  if (s.action?.kind !== 'heist') throw Error('No heist');
  s.action.progress = 1e9;
  heistStep(s, ctx, 1, deriveStats(s));
}

describe('tactical rogue roster', () => {
  it('offers twelve independent rogues and three crew slots from the start', () => {
    const s = setup();
    expect(ROGUES).toHaveLength(12);
    expect(Object.keys(s.heist.roster!)).toHaveLength(12);
    expect(ROGUES.every((r) => r.talentTree.length === 10)).toBe(true);
    toggleCrew(s, 'shadow');
    expect(s.heist.crew).toEqual(['locksmith', 'lookout', 'shadow']);
    toggleCrew(s, 'shadow');
    expect(startHeist(s, safe, job.id)).toMatch(/Assign 3 rogues/);
  });
  it('locks crew, talents and mentor training while a job is running', () => {
    const s = run();
    expect(toggleCrew(s, 'shadow')).toMatch(/Finish/);
    expect(learnTalent(s, 'lookout', 1)).toMatch(/Finish/);
    expect(trainRogue(s, 'lookout', 'Vault Access')).toMatch(/Finish/);
    expect(s.action?.kind === 'heist' && s.action.crew).toEqual(s.heist.crew);
  });
  it('awards room XP only to the current crew, retaining XP overflow', () => {
    const s = run();
    s.heist.roster!.bruiser.xp = 90;
    clear(s);
    expect(s.heist.roster!.bruiser).toMatchObject({ level: 2, xp: 15 });
    expect(s.heist.roster!.shadow.xp).toBe(0);
    expect(s.heist.roster!.locksmith.xp).toBe(25);
  });
  it('caps field success at level ten and earns ten talent points from levels 15 to 60', () => {
    const s = setup();
    const r = s.heist.roster!.lookout;
    r.level = 14;
    expect(talentPoints(r)).toBe(0);
    r.level = 15;
    expect(talentPoints(r)).toBe(1);
    expect(learnTalent(s, 'lookout', 2)).toMatch(/preceding/);
    expect(learnTalent(s, 'lookout', 1)).toBeNull();
    expect(learnTalent(s, 'lookout', 2)).toMatch(/point/);
    r.level = 100;
    expect(talentPoints(r)).toBe(9);
    for (let n = 2; n <= 10; n++) expect(learnTalent(s, 'lookout', n)).toBeNull();
    expect(talentPoints(r)).toBe(0);
  });
  it('charges once and teaches an unmastered specialty after two finished heists', () => {
    const s = setup();
    expect(trainRogue(s, 'bruiser', 'Vault Access')).toBeNull();
    expect(s.storage.bank.gold).toBe(15000);
    expect(s.heist.crew).not.toContain('bruiser');
    expect(toggleCrew(s, 'bruiser')).toMatch(/Unavailable/);
    expect(trainRogue(s, 'bruiser', 'Threat Reveal')).toMatch(/Already/);
    toggleCrew(s, 'shadow');
    for (let n = 0; n < 2; n++) {
      expect(startHeist(s, safe, job.id)).toBeNull();
      stopHeistRepeat(s);
      for (let room = 0; room < 3; room++) clear(s);
      if (n === 0) expect(s.heist.roster!.bruiser.training?.remaining).toBe(1);
    }
    expect(s.heist.roster!.bruiser.mastered).toContain('Vault Access');
    expect(s.heist.roster!.bruiser.training).toBeUndefined();
    expect(trainRogue(s, 'bruiser', 'Vault Access')).toMatch(/mastered/);
  });
  it('rejects unaffordable training and the primary specialty without spending gold', () => {
    const s = setup();
    expect(trainRogue(s, 'bruiser', 'Guard Distraction')).toMatch(/mastered/);
    s.storage.bank.gold = 4999;
    expect(trainRogue(s, 'bruiser', 'Vault Access')).toMatch(/5,000/);
    expect(s.storage.bank.gold).toBe(4999);
  });
  it('scouts once and spends a matching ability to safely bypass without ordinary loot', () => {
    const s = run();
    expect(roomSpecialty(job, 1)).toBe('Guard Distraction');
    expect(chooseTactic(s, 'bruiser', 'bypass', job)).toMatch(/Scout/);
    scoutRoom(s);
    const before = s.action?.kind === 'heist' && s.action.progress;
    scoutRoom(s);
    expect(s.action?.kind === 'heist' && s.action.progress).toBe(before);
    expect(chooseTactic(s, 'locksmith', 'bypass', job)).toMatch(/matching/);
    expect(chooseTactic(s, 'bruiser', 'bypass', job)).toBeNull();
    expect(alarmChance(s, job, 1)).toBe(0);
    heistStep(s, safe, 1, deriveStats(s));
    expect(s.action?.kind === 'heist' && s.action.room).toBe(2);
    expect(s.action?.kind === 'heist' && s.action.take).toEqual({});
    expect(s.heist.roster!.bruiser.xp).toBe(25);
    expect(s.action?.kind === 'heist' && s.action.spent).toContain('bruiser');
  });
  it('greed grants extra loot and alarm risk, with Lucky Pockets increasing its gold', () => {
    const plain = run(), greedy = run();
    scoutRoom(greedy);
    greedy.heist.roster!.bruiser.talents = [1, 2, 3, 4, 5];
    const baseline = alarmChance(greedy, job, 1);
    expect(chooseTactic(greedy, 'bruiser', 'greed', job)).toBeNull();
    expect(alarmChance(greedy, job, 1)).toBeCloseTo(baseline + 0.15);
    expect(chooseTactic(greedy, 'bruiser', 'bypass', job)).toMatch(/already/);
    clear(plain); clear(greedy);
    const gold = (s: typeof plain) => s.action?.kind === 'heist' ? s.action.take.gold : 0;
    expect(gold(greedy)).toBeGreaterThan(gold(plain));
  });
  it('prevents ability reuse across rooms and resets it on a new heist', () => {
    const s = run();
    s.heist.roster!.bruiser.mastered.push('Threat Reveal');
    scoutRoom(s); chooseTactic(s, 'bruiser', 'greed', job); clear(s);
    scoutRoom(s);
    expect(chooseTactic(s, 'bruiser', 'greed', job)).toMatch(/spent/);
    clear(s); clear(s);
    startHeist(s, safe, job.id);
    expect(s.action?.kind === 'heist' && s.action.spent).toEqual([]);
  });
  it('Omni-Reveal scouts each new room and matching signatures keep their ability', () => {
    const s = run();
    s.heist.roster!.lookout.talents = [1,2,3,4,5,6,7,8,9,10];
    s.heist.roster!.bruiser.talents = [1,2,3,4,5,6,7,8,9,10];
    expect(roomRevealed(s)).toBe(true);
    expect(chooseTactic(s, 'bruiser', 'bypass', job)).toBeNull();
    expect(s.action?.kind === 'heist' && s.action.spent).toEqual([]);
    clear(s);
    expect(roomRevealed(s)).toBe(true);
  });
  it('training completes on alarms, and abandoning does not advance training', () => {
    const s = setup();
    trainRogue(s, 'shadow', 'Vault Access');
    startHeist(s, safe, job.id); stopHeistRepeat(s);
    clear(s, { ...safe, rng: { next: () => 0 } });
    expect(s.heist.roster!.shadow.training?.remaining).toBe(1);
    startHeist(s, safe, job.id);
    s.action = null;
    expect(s.heist.roster!.shadow.training?.remaining).toBe(1);
    finishTraining(s);
    expect(s.heist.roster!.shadow.mastered).toContain('Vault Access');
  });
  it('migrates paid legacy ranks and retired classes, retaining the run and take', () => {
    const s = run();
    delete s.heist.roster;
    s.heist.rogues = { fence: 5, cutpurse: 3, lookout: 2 };
    s.heist.crew = ['fence', 'cutpurse', 'lookout'];
    if (s.action?.kind === 'heist') { delete s.action.crew; s.action.take.gold = 42; }
    settleHeist(s);
    expect(s.heist.crew).toEqual(['grifter', 'pickpocket', 'lookout']);
    expect(s.heist.roster!.grifter.level).toBe(10);
    expect(s.heist.roster!.pickpocket.level).toBe(6);
    expect(s.action?.kind === 'heist' && s.action.take.gold).toBe(42);
  });
  it('saves training, talents, room choices and an intentionally incomplete crew', () => {
    const s = run();
    scoutRoom(s); chooseTactic(s, 'bruiser', 'greed', job);
    const loaded = deserialize(serialize(s));
    expect(loaded.action).toEqual(s.action);
    loaded.action = null;
    trainRogue(loaded, 'shadow', 'Vault Access');
    toggleCrew(loaded, 'lookout');
    expect(deserialize(serialize(loaded)).heist).toEqual(loaded.heist);
  });
  it('has three layouts and increasing profile threat', () => {
    expect(vaultProfile(job).layout).toBe('Guard-Heavy');
    expect(vaultProfile(heistJob('salt_tithe')).layout).toBe('Trap-Heavy');
    expect(vaultProfile(heistJob('forgers_den')).layout).toBe('Loot-Rich');
    expect(vaultProfile(heistJob('khans_tribute')).threat).toBeGreaterThan(vaultProfile(job).threat);
  });
  it('never changes shared definitions when awarding experience', () => {
    const s = setup();
    grantRogueXp(s);
    expect(ROGUES.find((r) => r.id === 'bruiser')!.xp).toBe(0);
    expect(setup().heist.roster!.bruiser.xp).toBe(0);
  });
});

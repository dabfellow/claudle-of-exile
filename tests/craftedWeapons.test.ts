import { describe, expect, it } from 'vitest';
import { baseDef, uniqueDef } from '../src/data/bases';
import { professionProject } from '../src/data/professionProjects';
import { actionDef } from '../src/data/skills';
import { worldDropUniques } from '../src/data/uniqueDrops';
import { uniqueDropsIn } from '../src/data/uniqueList';
import { zoneDef } from '../src/data/zones';
import { combatStep, makeMonster, releaseNovas, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, createSupportGem } from '../src/engine/gems';
import { createUnique, createItem } from '../src/engine/items';
import { advanceProject, completeProject, settleProfessionProgress, startProject } from '../src/engine/professions';
import { deserialize, serialize } from '../src/engine/save';
import { skillStep, startSkillAction, actionIntervalMs } from '../src/engine/skills';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import { charXpForLevel, xpForLevel } from '../src/engine/xp';
import { orbReason } from '../src/engine/crafting';
import { simulateOffline } from '../src/engine/offline';
import { prepareWeaponBuild } from '../src/dev/overhaulBuilds';
import { equip } from '../src/engine/equipment';
import { seeded } from '../src/engine/rng';
import { tick } from '../src/engine/state';
import type { GameState } from '../src/engine/types';

const context = () => makeCtx({ next: () => .5 });
function arena(unique: string, gemId: string, supports: string[] = [], pack = 1) {
  const s = newGame(1, { name: 'Weapon contract', classId: gemId === 'frost_needle' || gemId === 'fireball' ? 'mage' : 'warrior' });
  const c = context(); s.skills.combat = charXpForLevel(90); s.unlockedZones = ['mudflats'];
  s.skillBar.fill(null);
  const g = createSkillGem(s, gemId); g.rules = [{ when: 'always' }]; g.extraSlots = 3;
  g.supports = supports.map((id) => createSupportGem(s, id)); s.skillBar[0] = g;
  s.equipment.weapon = createUnique(s, unique, 80, c.rng); delete s.equipment.offhand;
  s.settings.autoFlee = false;
  startCombat(s, c, 'mudflats');
  s.combat!.buffs.push({ id: 'contract_inputs', source: 'skill', durationMs: 1e9, remainingMs: 1e9, stats: { str: 200, dex: 200, int: 200, accuracy: 10000, manaRegenPct: 1000 } });
  s.combat!.monsters = Array.from({ length: pack }, (_, i) => {
    const m = makeMonster(zoneDef('mudflats').monsters[0], false, i + 10);
    m.life = m.maxLife = 1e9; m.armour = m.evasion = m.es = m.maxEs = 0;
    m.blockChance = m.spellBlockChance = 0; m.attackMs = 1e9; m.cell = i;
    m.res = { fire: 0, cold: 0, light: 0, chaos: 0 }; return m;
  });
  s.combat!.spawnMs = 1e12;
  s.mana = deriveStats(s).maxMana;
  return { s, c, mon: s.combat!.monsters[0] };
}
const hits = (c: ReturnType<typeof context>) => c.events.filter((e) => e.t === 'hit' && e.target === 'monster' && !e.dot && e.amount > 0);
function step(s: GameState, c: ReturnType<typeof context>, ms: number) {
  for (let t = 0; t < ms; t += 50) combatStep(s, c, Math.min(50, ms - t), deriveStats(s));
}
function firstHit(s: GameState, c: ReturnType<typeof context>) {
  for (let t = 0; t < 10000 && !hits(c).length; t += 50) step(s, c, 50);
  expect(hits(c).length).toBeGreaterThan(0);
}

describe('Phase 14 crafted weapons', () => {
  it('keeps a finished unique reserved through full storage and reload, then delivers once', () => {
    const s = newGame(1), c = context(), p = professionProject('woundmaker')!;
    s.skills.smithing = xpForLevel(90); s.professionProgress.work.smithing = 100; s.account.hideout.forge = 3;
    s.account.bank = { ...p.inputs };
    for (let i = 0; i < 100; i++) s.inventory.push(createItem(s, 'rusted_sword', 1, 'normal', c.rng));
    expect(startProject(s, c, p.id)).toBeNull(); advanceProject(s, c, p.durationMs);
    expect(s.professionProgress.activeProject!.status).toBe('ready');
    expect(s.inventory.some((i) => i.uniqueId === p.id)).toBe(false);
    const back = deserialize(serialize(s)); back.account = structuredClone(s.account);
    back.inventory.pop(); advanceProject(back, c, 0);
    expect(back.inventory.filter((i) => i.uniqueId === p.id)).toHaveLength(1);
    expect(back.account.uniquesSeen.filter((id) => id === p.id)).toHaveLength(1);
    expect(back.professionProgress.activeProject).toBeUndefined();
    expect(back.account.bank.wound_alloy).toBe(0);
  });
  it.each(['woundmaker', 'winters_pyre', 'the_homecoming'])('uses actually crafted %s in a legal build with matching live/offline combat', (id) => {
    const s = newGame(9, { name: 'Realistic project build', classId: id === 'winters_pyre' ? 'mage' : id === 'the_homecoming' ? 'ranger' : 'duelist' });
    const c = makeCtx(seeded(9)), p = professionProject(id)!;
    prepareWeaponBuild(s, c, id);
    s.skills.smithing = xpForLevel(90); s.professionProgress.work.smithing = 100; s.account.hideout.forge = 3;
    s.account.bank = { ...p.inputs };
    expect(startProject(s, c, id)).toBeNull(); advanceProject(s, c, p.durationMs);
    expect(equip(s, c, s.inventory.at(-1)!.uid, 'weapon')).toBeNull();
    s.unlockedZones.push('shatteredthrone'); expect(startCombat(s, c, 'shatteredthrone')).toBeNull();
    const b = structuredClone(s); b.maps.stock = b.account.maps!;
    const live = makeCtx(seeded(41)), away = makeCtx(seeded(41));
    for (let ms = 0; ms < 60_000; ms += 50) tick(s, live, 50);
    simulateOffline(b, away, 60_000);
    expect(b.life).toBeCloseTo(s.life, 5); expect(b.mana).toBeCloseTo(s.mana, 5);
    expect(b.lifetime.deaths).toBe(s.lifetime.deaths);
    expect(b.lifetime.kills).toBe(s.lifetime.kills);
    expect(s.lifetime.kills).toBeGreaterThan(0);
    expect(s.lifetime.deaths, JSON.stringify({ resists: deriveStats(s).res, events: live.events.slice(-6) })).toBe(0);
  });
  it.each(['woundmaker', 'winters_pyre', 'the_homecoming'])('delivers %s at exact cost, fixed and exclusive, once online/offline', (id) => {
    for (const offline of [false, true]) {
      const s = newGame(1), c = context(), p = professionProject(id)!;
      s.skills.smithing = xpForLevel(90); s.professionProgress.work.smithing = 100; s.account.hideout.forge = 3;
      s.account.bank = { ...p.inputs, divine: 1 };
      expect(startProject(s, c, id)).toBeNull();
      const run = s.professionProgress.activeProject!.runId;
      if (offline) simulateOffline(s, c, p.durationMs); else advanceProject(s, c, p.durationMs);
      const item = s.inventory.at(-1)!;
      expect(item.uniqueId).toBe(id); expect(item.ilvl).toBe(80);
      expect(baseDef(item.baseId).reqLevel).toBe(60);
      for (const key of Object.keys(p.inputs)) expect(s.account.bank[key]).toBe(0);
      expect(completeProject(s, c, run)).toMatch(/settled/);
      expect(orbReason(s, 'divine', item.uid)).toMatch(/fixed/);
      expect(worldDropUniques(100).some((u) => u.id === id)).toBe(false);
      expect(uniqueDropsIn(uniqueDef(id)).join(' ')).toMatch(/Smithing/);
      expect(s.skills.combat).toBe(0);
    }
  });

  it('makes the required crystal and inscription from bounded sources without conservation or duplicate output', () => {
    const s = newGame(1), c = context();
    s.skills.gemcutting = s.skills.runecarving = xpForLevel(90);
    settleProfessionProgress(s, true);
    s.account.bank = { crystal_shard: 10, rough_gem: 5 };
    expect(startSkillAction(s, c, 'cut_exceptional')).toBeNull();
    skillStep(s, c, 120_000, deriveStats(s)); expect(s.account.bank.exceptional_crystal).toBe(1);
    const rune = actionDef('carve_rune_keen_2');
    s.account.bank = Object.fromEntries(Object.entries(rune.inputs!).map(([id, n]) => [id, n * 200]));
    expect(startSkillAction(s, c, rune.id)).toBeNull();
    for (let i = 0; i < 200; i++) skillStep(s, c, actionIntervalMs(s, rune, deriveStats(s)), deriveStats(s));
    expect(s.account.bank.inscription_fragment).toBe(10);
    const keen3 = actionDef('carve_rune_keen_3'); Object.assign(s.account.bank, keen3.inputs);
    expect(startSkillAction(s, c, keen3.id)).toBeNull(); skillStep(s, c, keen3.intervalMs, deriveStats(s));
    expect(startSkillAction(s, c, 'prepare_return_inscription')).toBeNull(); skillStep(s, c, 120_000, deriveStats(s));
    expect(s.account.bank.return_inscription).toBe(1); expect(s.account.bank.inscription_fragment).toBe(0);
  });

  it('Woundmaker preserves pre-penalty bleed damage, suppresses forced/mega critical strikes and applies one bleed per hit', () => {
    const a = arena('woundmaker', 'rend', ['serrated_edge']);
    a.s.combat!.buffs[0].stats!.knifesEdge = 1; a.s.combat!.asc.sureCrit = true;
    firstHit(a.s, a.c);
    expect(hits(a.c).every((e) => e.t === 'hit' && !e.crit && !e.mega)).toBe(true);
    expect(a.mon.dots.filter((x) => x.kind === 'bleed')).toHaveLength(1);
    const b = arena('woundmaker', 'rend', ['serrated_edge']);
    b.s.equipment.weapon!.suffixes = []; b.s.combat!.buffs[0].stats!.steadyHand = 1;
    firstHit(b.s, b.c);
    expect(a.mon.dots[0].dps).toBeCloseTo(b.mon.dots[0].dps, 3);
    const damage = (c: ReturnType<typeof context>) => { const e = hits(c)[0]; return e.t === 'hit' ? e.amount : 0; };
    expect(damage(a.c)).toBeCloseTo(damage(b.c) * .4, 0);
    const nova = arena('woundmaker', 'rend'), ordinaryNova = arena('woundmaker', 'rend');
    ordinaryNova.s.equipment.weapon!.suffixes = [];
    for (const x of [nova, ordinaryNova]) {
      x.s.combat!.asc.novas = 1; x.s.combat!.asc.novaDamage = 1000;
      releaseNovas(x.s, x.c);
    }
    expect(damage(nova.c)).toBeCloseTo(damage(ordinaryNova.c) * .4);
  });

  it('caps at eight bleeds, keeps individual expiry and refreshes the oldest weakest tie', () => {
    const { s, c, mon } = arena('woundmaker', 'rend');
    s.combat!.buffs[0].stats!.bleedDuration = 2000;
    step(s, c, 40_000);
    expect(mon.dots.filter((x) => x.kind === 'bleed')).toHaveLength(8);
    const oldest = mon.dots.reduce((a, b) => a.remainingMs < b.remainingMs ? a : b);
    expect(oldest.remainingMs).toBeLessThan(mon.dots.at(-1)!.durationMs!);
    // A weaker incoming wound must never replace a stronger stored one.
    for (const dot of mon.dots) dot.dps = 1e12;
    const durations = mon.dots.map((x) => x.remainingMs);
    s.combat!.actionMs = 0; step(s, c, 50);
    expect(mon.dots.map((x) => x.remainingMs)).toEqual(durations.map((x) => x - 50));
  });

  it('Pyre ignites from cold with normal chance and scales the source/ignite once while suppressing elemental hits and chill', () => {
    const burn = (coldPct = 0, firePct = 0, ignitePct = 0) => {
      const x = arena('winters_pyre', 'frost_needle');
      Object.assign(x.s.combat!.buffs[0].stats!, { burnChance: 100, coldPct, firePct, ignitePct, spellFireMin: 10000, spellFireMax: 10000, spellLightMin: 10000, spellLightMax: 10000 });
      firstHit(x.s, x.c); return x;
    };
    const plain = burn(), fire = burn(0, 1000), cold = burn(100), ignite = burn(0, 0, 100);
    const dps = (x: typeof plain) => x.mon.dots.find((d) => d.kind === 'ignite')!.dps;
    expect(plain.mon.dots[0].coldSource).toBe(true);
    expect(plain.mon.chillMs).toBe(0); expect(plain.mon.frozenMs).toBe(0);
    expect(hits(plain.c).every((e) => e.t === 'hit' && e.dmgType === 'cold')).toBe(true);
    expect(dps(fire)).toBe(dps(plain)); expect(dps(ignite)).toBeCloseTo(dps(plain) * 2);
    expect(dps(cold) / dps(plain)).toBeCloseTo(deriveStats(cold.s).typeMult.cold / deriveStats(plain.s).typeMult.cold);
    const noChance = arena('winters_pyre', 'frost_needle'); firstHit(noChance.s, noChance.c);
    expect(noChance.mon.dots).toHaveLength(0);
    const fireOnly = arena('winters_pyre', 'fireball'); step(fireOnly.s, fireOnly.c, 5000);
    expect(hits(fireOnly.c).every((e) => e.t === 'hit' && e.dmgType !== 'fire' && e.dmgType !== 'light')).toBe(true);
    expect(fireOnly.mon.dots).toHaveLength(0); // A fallback staff attack may still deal physical damage.
    const nova = arena('winters_pyre', 'frost_needle');
    nova.s.combat!.asc.novas = 1; nova.s.combat!.asc.novaDamage = 1000;
    releaseNovas(nova.s, nova.c);
    expect(hits(nova.c)).toHaveLength(0); // Triggered lightning obeys the same prohibition.
  });

  it('Homecoming overrides Barrage/Volley/extra arrows, returns at500ms, and pays/casts only once', () => {
    const { s, c } = arena('the_homecoming', 'barrage', ['volley_fire']);
    s.combat!.buffs[0].stats!.dyingSunProj = 5; s.combat!.buffs[0].stats!.barrageArrows = 5;
    firstHit(s, c); expect(hits(c)).toHaveLength(1);
    expect(s.combat!.pendingArrows).toHaveLength(1);
    const mana = s.mana, uses = c.events.filter((e) => e.t === 'skill').length;
    s.combat!.actionMs = 1e9;
    step(s, c, 450); expect(hits(c)).toHaveLength(1);
    step(s, c, 50); expect(hits(c)).toHaveLength(2);
    expect(c.events.filter((e) => e.t === 'skill')).toHaveLength(uses);
    expect(s.mana).toBeGreaterThanOrEqual(mana);
    step(s, c, 1000); expect(hits(c)).toHaveLength(2);
  });

  it('Homecoming preserves snapshot/path across save-load, skips absent targets and keeps ordinary bows unchanged', () => {
    const { s, c, mon } = arena('the_homecoming', 'barrage', ['chain'], 2);
    firstHit(s, c);
    expect(s.combat!.pendingArrows![0].targetUids).toEqual([11, 10]);
    const account = structuredClone(s.account), loaded = deserialize(serialize(s)); loaded.account = account;
    loaded.combat!.actionMs = 1e9;
    delete loaded.equipment.weapon;
    loaded.combat!.monsters = loaded.combat!.monsters.filter((m) => m.uid !== mon.uid);
    step(loaded, c, 500);
    expect(hits(c).filter((e) => e.t === 'hit' && e.monsterUid === mon.uid)).toHaveLength(1);
    expect(hits(c).filter((e) => e.t === 'hit' && e.monsterUid === 11)).toHaveLength(2);
    const ordinary = arena('the_homecoming', 'barrage', ['volley_fire']); ordinary.s.equipment.weapon!.suffixes = [];
    firstHit(ordinary.s, ordinary.c);
    expect(hits(ordinary.c).length).toBeGreaterThan(1);
    expect(ordinary.s.combat!.pendingArrows ?? []).toHaveLength(0);
  });

  it('rolls the return leg hit and crit at impact instead of reusing the outbound result', () => {
    const { s, c, mon } = arena('the_homecoming', 'barrage');
    firstHit(s, c); const outbound = hits(c)[0]; expect(outbound.t === 'hit' && outbound.crit).toBe(false);
    s.combat!.actionMs = 1e9;
    c.rng.next = () => 0;
    step(s, c, 500);
    const last = hits(c).at(-1)!;
    expect(last.t === 'hit' && last.crit).toBe(true);
    expect(mon.life).toBeLessThan(mon.maxLife);
    const missed = arena('the_homecoming', 'barrage');
    firstHit(missed.s, missed.c); missed.s.combat!.actionMs = 1e9;
    missed.mon.evasion = 1e9; missed.c.rng.next = () => .99;
    step(missed.s, missed.c, 500);
    expect(hits(missed.c)).toHaveLength(1);
    expect(missed.c.events.some((e) => e.t === 'hit' && e.evaded)).toBe(true);
  });
});

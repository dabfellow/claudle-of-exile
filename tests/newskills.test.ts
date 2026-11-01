import { describe, expect, it } from 'vitest';
import type { ClassId } from '../src/data/classes';
import { ACTIVE_GEMS, SUPPORT_GEMS, activeGemDef, type TargetStatus } from '../src/data/gems';
import { zoneDef } from '../src/data/zones';
import { combatStep, makeMonster, ruleAllows, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, createSupportGem, skillSummary, supportFits } from '../src/engine/gems';
import { createUnique } from '../src/engine/items';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameEvent, GameState, GroundKind, MonsterInstance } from '../src/engine/types';
import { veteran, armFor } from './helpers';

const NEW = [
  'pummel', 'berserk', 'parry', 'judgement_hammer', 'infernal_blow',
  'barrage', 'rain_of_arrows', 'feint', 'backstab', 'ice_shot',
  'glacial_lance', 'meditate', 'shock_nova', 'consecrate', 'frost_needle',
];

/** One skill on the bar (optionally with its signature) against durable dummies that never attack unless told to. */
function arena(gem: string, opts: { cls?: ClassId; signature?: boolean; pack?: number } = {}) {
  const s = veteran(newGame(1, { name: 't', classId: opts.cls ?? 'warrior' }));
  s.skillBar = s.skillBar.map(() => null);
  const g = createSkillGem(s, gem);
  g.rules = [{ when: 'always' }];
  if (opts.signature) g.supports[0] = createSupportGem(s, SUPPORT_GEMS.find((x) => x.signatureFor === gem)!.id);
  s.skillBar[0] = g;
  armFor(s, gem);
  s.settings.autoFlee = false;
  const ctx = makeCtx(seeded(7));
  startCombat(s, ctx, 'mudflats');
  const dummies: MonsterInstance[] = [];
  for (let i = 0; i < (opts.pack ?? 1); i++) {
    const m = makeMonster(zoneDef('mudflats').monsters[0], false, i + 1);
    m.life = m.maxLife = 1e7;
    m.attackMs = 1e9;
    m.cell = i;
    dummies.push(m);
  }
  s.combat!.monsters = dummies;
  s.combat!.spawnMs = 1e12;
  s.life = deriveStats(s).maxLife;
  s.mana = deriveStats(s).maxMana;
  return { s, ctx, dummy: dummies[0], dummies };
}

function run(s: GameState, ctx: ReturnType<typeof makeCtx>, ms: number, until?: () => boolean) {
  for (let t = 0; t < ms && s.combat && !until?.(); t += 50) combatStep(s, ctx, 50, deriveStats(s));
}

const monsterHits = (events: GameEvent[]) =>
  events.filter((e): e is Extract<GameEvent, { t: 'hit' }> => e.t === 'hit' && e.target === 'monster' && !e.dot);

/** Hit events (landed or missed) of the first use of slot 0. */
function firstUse(events: GameEvent[]) {
  const start = events.findIndex((e) => e.t === 'skill');
  const next = events.findIndex((e, i) => i > start && e.t === 'skill');
  return monsterHits(events.slice(start + 1, next < 0 ? undefined : next));
}

describe('new skill gems', () => {
  it('adds 5 actives per attribute, each with a signature that fits only it', () => {
    for (const id of NEW) {
      const def = activeGemDef(id);
      const sigs = SUPPORT_GEMS.filter((x) => x.signatureFor === id);
      expect(sigs, id).toHaveLength(1);
      expect(supportFits(sigs[0], def)).toBe(true);
      expect(supportFits(sigs[0], activeGemDef('heavy_strike'))).toBe(false);
    }
    for (const [attr, n] of [['str', 15], ['dex', 16], ['int', 16]] as const) expect(ACTIVE_GEMS.filter((g) => g.attr === attr)).toHaveLength(n);
  });

  it('Pummel strikes three times per use, four with Tavern Brawler', () => {
    const a = arena('pummel');
    run(a.s, a.ctx, 10_000, () => a.ctx.events.filter((e) => e.t === 'skill').length >= 2);
    expect(firstUse(a.ctx.events)).toHaveLength(3);

    const b = arena('pummel');
    b.s.equipment.weapon = createUnique(b.s, 'tavern_brawler', 1);
    run(b.s, b.ctx, 10_000, () => b.ctx.events.filter((e) => e.t === 'skill').length >= 2);
    expect(firstUse(b.ctx.events)).toHaveLength(4);
  });

  it('multi-hit skills fill Rage once per hit', () => {
    const { s, ctx } = arena('pummel', { cls: 'warrior' });
    run(s, ctx, 10_000, () => ctx.events.some((e) => e.t === 'skill'));
    const landed = monsterHits(ctx.events).filter((e) => !e.evaded).length;
    expect(s.combat!.mech).toBe(landed);
  });

  it('Rain of Arrows gives Momentum for every enemy struck', () => {
    const { s, ctx } = arena('rain_of_arrows', { cls: 'ranger', pack: 4 });
    s.skillBar[0]!.rules = [{ when: 'always' }];
    run(s, ctx, 10_000, () => ctx.events.some((e) => e.t === 'skill'));
    const landed = monsterHits(ctx.events).filter((e) => !e.evaded).length;
    expect(landed).toBeGreaterThanOrEqual(1);
    expect(s.combat!.mech).toBe(Math.min(10, landed));
  });

  it('Judgement Hammer converts physical damage to lightning; The Ninth Psalm makes it all lightning', () => {
    const { s } = arena('judgement_hammer');
    const d = deriveStats(s);
    const gem = s.skillBar[0]!;
    expect(skillSummary(d, gem).perUse).toBeGreaterThan(0);
    const { s: s2, ctx: ctx2 } = arena('judgement_hammer');
    s2.equipment.weapon = createUnique(s2, 'ninth_psalm', 24);
    run(s2, ctx2, 20_000, () => monsterHits(ctx2.events).some((e) => !e.evaded));
    expect(monsterHits(ctx2.events).find((e) => !e.evaded)?.dmgType).toBe('light');
  });

  it('Ice Shot and Glacial Lance chill; Permafrost freezes an already-chilled target', () => {
    const a = arena('ice_shot');
    run(a.s, a.ctx, 20_000, () => a.dummy.chillMs > 0);
    expect(a.dummy.chillMs).toBeGreaterThan(0);

    const b = arena('glacial_lance', { cls: 'mage', signature: true });
    b.dummy.chillMs = 5000;
    run(b.s, b.ctx, 10_000, () => b.dummy.frozenMs > 0);
    expect(b.dummy.frozenMs).toBeGreaterThan(0);
  });

  it('Backstab deals more against an ailing enemy', () => {
    const avgFirst = (ailing: boolean) => {
      let total = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const { s, ctx, dummy } = arena('backstab', { cls: 'ranger' });
        ctx.rng = seeded(seed);
        s.skillBar[0]!.rules = [{ when: 'always' }];
        if (ailing) dummy.dots.push({ kind: 'poison', dps: 0, remainingMs: 1e9, dealt: 0, gemId: 'x' });
        run(s, ctx, 10_000, () => ctx.events.some((e) => e.t === 'skill'));
        total += monsterHits(ctx.events).reduce((a, e) => a + e.amount, 0);
      }
      return total;
    };
    expect(avgFirst(true)).toBeGreaterThan(avgFirst(false) * 1.3);
  });

  it('Meditate restores mana and has a "mana below" tactic', () => {
    const { s, ctx } = arena('meditate', { cls: 'mage' });
    const max = deriveStats(s).maxMana;
    s.mana = 0;
    run(s, ctx, 3000, () => ctx.events.some((e) => e.t === 'skill'));
    expect(s.mana).toBeGreaterThanOrEqual(max * 0.3 - 1);
    expect(activeGemDef('meditate').defaultRule.when).toBe('manaBelow');
    const rc = { lifePct: 100, manaPct: 20, enemies: 1, targetLifePct: 100, casting: false, channeling: false, boss: false, meterFull: false, targetStatus: new Set<TargetStatus>(), ground: new Set<GroundKind>() };
    expect(ruleAllows({ when: 'manaBelow', value: 30 }, rc, false)).toBe(true);
    expect(ruleAllows({ when: 'manaBelow', value: 30 }, { ...rc, manaPct: 50 }, false)).toBe(false);
    // target status rules
    const bleeding = { ...rc, targetStatus: new Set<TargetStatus>(['bleeding']) };
    expect(ruleAllows({ when: 'targetHas', status: 'bleeding' }, bleeding, false)).toBe(true);
    expect(ruleAllows({ when: 'targetHas', status: 'poisoned' }, bleeding, false)).toBe(false);
    expect(ruleAllows({ when: 'targetLacks', status: 'bleeding' }, bleeding, false)).toBe(false);
    expect(ruleAllows({ when: 'targetLacks', status: 'poisoned' }, bleeding, false)).toBe(true);
  });

  it('Berserk speeds attacks and drains life, but never kills by itself', () => {
    const { s, ctx } = arena('berserk');
    s.skillBar[0]!.rules = [{ when: 'always' }];
    run(s, ctx, 1000, () => s.combat!.buffs.some((b) => b.id === 'berserk'));
    expect(deriveStats(s).raw.attackSpeedPct).toBeGreaterThanOrEqual(30);
    s.life = 2;
    run(s, ctx, 5000);
    expect(s.combat).not.toBeNull();
    expect(s.life).toBeGreaterThanOrEqual(1);
  });

  it('Parry blocks two hits (three with Rebuttal) and Counterweight stores damage for the next attack', () => {
    const { s, ctx, dummy } = arena('parry', { signature: true });
    run(s, ctx, 2000, () => s.combat!.blocks > 0);
    expect(s.combat!.blocks).toBe(2);
    dummy.attackMs = 200;
    run(s, ctx, 600, () => s.combat!.blocks === 0);
    expect(s.combat!.counterweightMore).toBeGreaterThan(0);

    const r = arena('parry');
    r.s.equipment.weapon = createUnique(r.s, 'rebuttal', 8);
    run(r.s, r.ctx, 2000, () => r.s.combat!.blocks > 0);
    expect(r.s.combat!.blocks).toBe(3);
  });

  it('Shock Nova hits the whole pack and Static Field leaves them shocked', () => {
    const { s, ctx, dummies } = arena('shock_nova', { cls: 'mage', signature: true, pack: 3 });
    run(s, ctx, 10_000, () => ctx.events.some((e) => e.t === 'skill'));
    for (const m of dummies) expect(m.life).toBeLessThan(m.maxLife);
    for (const m of dummies) expect(m.shockMs).toBeGreaterThan(0);
  });

  it('Pyre: an ignited enemy explodes over the pack when it dies', () => {
    const { s, ctx, dummies } = arena('infernal_blow', { signature: true, pack: 2 });
    run(s, ctx, 20_000, () => dummies[0].dots.some((x) => x.pyre));
    const other = dummies[1];
    const before = other.life;
    dummies[0].life = 0;
    run(s, ctx, 50);
    expect(other.life).toBeLessThanOrEqual(before - dummies[0].maxLife * 0.1 * 0.5);
  });

  it("Needleworker's Wraps: Coup de Grâce also poisons and ignites", () => {
    const { s, ctx, dummy } = arena('frost_needle', { cls: 'shadow' });
    s.equipment.gloves = createUnique(s, 'needleworkers_wraps', 12);
    s.combat!.mech = 15;
    run(s, ctx, 10_000, () => ctx.events.some((e) => e.t === 'hit' && e.mega));
    const kinds = dummy.dots.map((x) => x.kind);
    expect(kinds).toContain('poison');
    expect(kinds).toContain('ignite');
  });

  it('Consecrate with Holy Ground regenerates life and energy shield', () => {
    const { s, ctx } = arena('consecrate', { cls: 'templar', signature: true });
    s.skillBar[0]!.rules = [{ when: 'always' }];
    run(s, ctx, 3000, () => s.combat!.buffs.some((b) => b.id === 'consecrate'));
    const buff = s.combat!.buffs.find((b) => b.id === 'consecrate')!;
    expect(buff.regenPct).toBe(2);
    expect(buff.esRegenPct).toBe(1);
  });
});

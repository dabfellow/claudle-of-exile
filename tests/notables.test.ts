import { describe, expect, it } from 'vitest';
import type { ClassId } from '../src/data/classes';
import { PASSIVE_NODES } from '../src/data/passiveTree';
import { zoneDef } from '../src/data/zones';
import { combatStep, makeMonster, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, skillNumbers } from '../src/engine/gems';
import { seeded } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { Buff, GameState, StatKey } from '../src/engine/types';
import { armFor, veteran } from './helpers';

/** The id of the tree notable carrying this stat (rule-changers are one of a kind). */
const nodeWith = (stat: StatKey) => PASSIVE_NODES.find((n) => (n.stats[stat] ?? 0) !== 0)!.id;
const gear = (stats: Partial<Record<StatKey, number>>): Buff => ({ id: 'test', source: 'skill', remainingMs: 1e9, durationMs: 1e9, stats });

function arena(classId: ClassId, gems: string[], passives: string[] = []) {
  const s = veteran(newGame(1, { name: 't', classId }), 70);
  s.flaskSlots = s.flaskSlots.map(() => null);
  s.passives.push(...passives);
  s.skillBar = s.skillBar.map(() => null);
  gems.forEach((g, i) => {
    s.skillBar[i] = createSkillGem(s, g);
    armFor(s, g);
    s.skillBar[i]!.rules = [{ when: 'always' }];
  });
  s.settings.autoFlee = false;
  const ctx = makeCtx(seeded(7));
  startCombat(s, ctx, 'mudflats');
  const dummy = makeMonster(zoneDef('mudflats').monsters[0], false, 1);
  dummy.life = dummy.maxLife = 1e7;
  dummy.attackMs = 1e9;
  s.combat!.monsters = [dummy];
  s.combat!.spawnMs = 1e12;
  s.life = deriveStats(s).maxLife;
  s.mana = deriveStats(s).maxMana;
  return { s, ctx, dummy };
}

function run(s: GameState, ctx: ReturnType<typeof makeCtx>, ms: number, until?: () => boolean, buffs?: Buff[]) {
  for (let t = 0; t < ms && s.combat && !until?.(); t += 50) {
    s.mana = 1e6;
    combatStep(s, ctx, 50, deriveStats(s, buffs));
  }
}

describe('notable pass: the tree is in budget', () => {
  const notables = PASSIVE_NODES.filter((n) => n.kind === 'notable' && n.region !== 'center');
  const rules: StatKey[] = ['armourVsDot', 'warcryLinger', 'bleedStacks', 'steelTempest', 'ricochet', 'markPersist', 'extraCurse', 'minionRevive', 'stormExtra', 'doomHalf', 'totemTaunt', 'resOvercap', 'rupture', 'accuracyCrit', 'venomVolley', 'witherDot', 'esSteady', 'holyRetort'];
  const mechanics: StatKey[] = ['rageMax', 'ripostePct', 'momentumMax', 'maliceMax', 'manaPower', 'fervorPct'];

  it('has 18 rule-changers, one class-mechanic notable per region and few "more" multipliers', () => {
    expect(notables.filter((n) => rules.some((k) => n.stats[k]))).toHaveLength(18);
    const mech = notables.filter((n) => mechanics.some((k) => n.stats[k]));
    expect(mech).toHaveLength(6);
    expect(new Set(mech.map((n) => n.region)).size).toBe(6);
    expect(mech.length / PASSIVE_NODES.length).toBeLessThan(0.05);
    const more = notables.filter((n) => Object.keys(n.stats).some((k) => /^more[A-Z]/.test(k) || /More$/.test(k)));
    expect(more.length / notables.length).toBeLessThanOrEqual(0.05);
  });

  it('gives each region its own notables beyond the shared basics', () => {
    const names = (r: string) => new Set(notables.filter((n) => n.region === r).map((n) => n.name));
    const str = names('str');
    const int = names('int');
    const shared = [...str].filter((x) => int.has(x)).length;
    expect(shared).toBeLessThan(str.size / 3);
  });
});

describe('rule-changing notables', () => {
  it('Beyond the Veil raises a resistance cap by 1% per 5% over it, up to 5%', () => {
    const s = newGame(1);
    expect(deriveStats(s, [gear({ fireRes: 85 })]).res.fire).toBe(75);
    s.passives.push(nodeWith('resOvercap'));
    expect(deriveStats(s, [gear({ fireRes: 85 })]).res.fire).toBe(77);
    expect(deriveStats(s, [gear({ fireRes: 200 })]).res.fire).toBe(80);
  });

  it('Eye of the Tempest keeps one more storm of each kind', () => {
    const s = veteran(newGame(1, { name: 'm', classId: 'mage' }), 70);
    const gem = createSkillGem(s, 'thunderhead');
    const before = skillNumbers(deriveStats(s), gem).mods.stormCount;
    s.passives.push(nodeWith('stormExtra'));
    expect(skillNumbers(deriveStats(s), gem).mods.stormCount).toBe(before + 1);
  });

  it('Crimson Flood lets two bleeds run on one enemy', () => {
    const bleeds = (passives: string[]) => {
      const { s, ctx, dummy } = arena('duelist', ['heavy_strike'], passives);
      let most = 0;
      run(s, ctx, 30_000, () => {
        most = Math.max(most, dummy.dots.filter((x) => x.kind === 'bleed').length);
        return most >= 2;
      }, [gear({ bleedOnHit: 100 })]);
      return most;
    };
    expect(bleeds([])).toBe(1);
    expect(bleeds([nodeWith('bleedStacks')])).toBe(2);
  });

  it('Inevitable halves Doom after a burst instead of emptying it', () => {
    const { s, ctx, dummy } = arena('mage', ['doom_bolt'], [nodeWith('doomHalf')]);
    let prev = 0;
    let after = -1;
    run(s, ctx, 60_000, () => {
      const now = dummy.doom ?? 0;
      if (prev >= 15 && now < prev - 4) after = now;
      prev = now;
      return after >= 0;
    });
    expect(after).toBeGreaterThanOrEqual(9);
  });

  it('Ancestral Bond keeps two totems up, and they taunt', () => {
    const { s, ctx } = arena('templar', ['war_totem'], [nodeWith('totemTaunt')]);
    run(s, ctx, 20_000, () => (s.combat!.totems?.length ?? 0) >= 2);
    expect(s.combat!.totems).toHaveLength(2);
    expect(s.combat!.totems!.every((t) => (t.tauntMs ?? 0) > 0)).toBe(true);
  });

  it("Warlord's Call holds a Warcry while the pack stands", () => {
    const buffLeft = (passives: string[]) => {
      const { s, ctx } = arena('warrior', ['battle_cry'], passives);
      run(s, ctx, 2000, () => s.combat!.buffs.some((b) => b.warcry));
      s.skillBar[0] = null;
      run(s, ctx, 8000);
      return s.combat!.buffs.some((b) => b.warcry);
    };
    expect(buffLeft([])).toBe(false);
    expect(buffLeft([nodeWith('warcryLinger')])).toBe(true);
  });

  it('Twin Hexes keeps the first curse working under a second one', () => {
    const { s, ctx, dummy } = arena('shadow', ['vulnerability', 'enfeeble'], [nodeWith('extraCurse')]);
    run(s, ctx, 20_000, () => dummy.curse?.gemId === 'enfeeble' && dummy.curse.physTaken > 0);
    expect(dummy.curse?.dealLess).toBeGreaterThan(0);
    expect(dummy.curse?.physTaken).toBeGreaterThan(0);
  });

  it('Withering Touch stacks Wither while your poison runs', () => {
    const { s, ctx, dummy } = arena('shadow', ['heavy_strike'], [nodeWith('witherDot')]);
    run(s, ctx, 15_000, () => (dummy.wither ?? 0) >= 3, [gear({ poisonOnHit: 100 })]);
    expect(dummy.wither).toBeGreaterThanOrEqual(3);
  });

  it('Rupture: a stun on a bleeding enemy deals the bleed at once', () => {
    const stunned = (passives: string[]) => {
      const { s, ctx, dummy } = arena('warrior', ['heavy_strike'], passives);
      dummy.dots.push({ kind: 'bleed', dps: 100, remainingMs: 60_000, durationMs: 60_000, dealt: 0, gemId: 'test' });
      run(s, ctx, 10_000, () => dummy.stunMs > 0, [gear({ stunChance: 100 })]);
      return { bleeding: dummy.dots.some((x) => x.kind === 'bleed'), lost: 1e7 - dummy.life };
    };
    const plain = stunned([]);
    const torn = stunned([nodeWith('rupture')]);
    expect(plain.bleeding).toBe(true);
    expect(torn.bleeding).toBe(false);
    // the remaining minute of a 100-per-second bleed landed at once
    expect(torn.lost - plain.lost).toBeGreaterThan(5000);
  });

  it('Unbroken Ward recharges Energy Shield at half speed while being hit', () => {
    const recharged = (passives: string[]) => {
      const { s, ctx } = arena('mage', [], passives);
      const buffs = [gear({ energyShield: 500 })];
      s.es = 0;
      s.combat!.esDelayMs = 1e9;
      run(s, ctx, 1000, undefined, buffs);
      return s.es;
    };
    expect(recharged([])).toBe(0);
    expect(recharged([nodeWith('esSteady')])).toBeGreaterThan(0);
  });
});

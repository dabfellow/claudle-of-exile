import { describe, expect, it } from 'vitest';
import type { ClassId } from '../src/data/classes';
import { zoneDef } from '../src/data/zones';
import { unlockEverything } from '../src/engine/automation';
import { combatStep, makeMonster, startCombat } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, createSupportGem } from '../src/engine/gems';
import { seeded } from '../src/engine/rng';
import { deriveStats } from '../src/engine/stats';
import { newGame } from '../src/engine/state';
import type { GameState, MonsterInstance } from '../src/engine/types';
import { armFor, veteran } from './helpers';

/**
 * The Maps support specials (src/data/gems.ts `special`): each one changes what its skill does.
 * Every fight here is a level 85 character against tough dummies that don't attack.
 */
function arena(gemId: string, supports: string[] = [], opts: { pack?: number; classId?: ClassId; life?: number } = {}) {
  // signature supports need their skill's level + 6 (up to 82)
  const s = veteran(newGame(1, { name: 't', classId: opts.classId ?? 'warrior' }), 85);
  s.skillBar = s.skillBar.map(() => null);
  const g = createSkillGem(s, gemId);
  g.rules = [{ when: 'always' }];
  g.extraSlots = 3;
  g.supports = supports.map((id) => createSupportGem(s, id));
  s.skillBar[0] = g;
  armFor(s, gemId);
  unlockEverything(s);
  s.unlockedZones = ['mudflats', 'cinderroad'];
  s.settings.autoFlee = false;
  const ctx = makeCtx(seeded(7));
  startCombat(s, ctx, 'cinderroad');
  const monsters: MonsterInstance[] = [];
  for (let i = 0; i < (opts.pack ?? 1); i++) {
    const m = makeMonster(zoneDef('cinderroad').monsters[0], false, i + 1);
    m.life = m.maxLife = opts.life ?? 1_000_000;
    m.attackMs = 1e9;
    m.cell = i;
    m.res = { fire: 0, cold: 0, light: 0, chaos: 0 };
    monsters.push(m);
  }
  s.combat!.monsters = monsters;
  s.combat!.spawnMs = 1e12;
  const d = deriveStats(s);
  s.life = d.maxLife;
  s.mana = d.maxMana;
  return { s, ctx, dummy: monsters[0], monsters };
}

function run(s: GameState, ctx: ReturnType<typeof makeCtx>, ms: number, until?: () => boolean) {
  for (let t = 0; t < ms && s.combat && !until?.(); t += 50) combatStep(s, ctx, 50, deriveStats(s));
}

const used = (ctx: ReturnType<typeof makeCtx>, gemId: string) => ctx.events.filter((e) => e.t === 'skill' && e.gemId === gemId).length;
const firstUse = (s: GameState, ctx: ReturnType<typeof makeCtx>, gemId: string) => run(s, ctx, 5000, () => used(ctx, gemId) >= 1);

describe('Exertion: the powered version', () => {
  it('an Exerted Gut Punch hits harder and reaches the nearest second enemy', () => {
    const plain = arena('gut_punch', [], { pack: 2 });
    firstUse(plain.s, plain.ctx, 'gut_punch');
    const exerted = arena('gut_punch', [], { pack: 2 });
    exerted.s.combat!.exertion = 5;
    firstUse(exerted.s, exerted.ctx, 'gut_punch');
    expect(plain.monsters[1].life).toBe(plain.monsters[1].maxLife);
    expect(exerted.monsters[1].life).toBeLessThan(exerted.monsters[1].maxLife);
    const taken = (m: MonsterInstance) => m.maxLife - m.life;
    expect(taken(exerted.dummy)).toBeGreaterThan(taken(plain.dummy) * 1.4);
  });

  it('Charged Strike Exerted hits every enemy', () => {
    const { s, ctx, monsters } = arena('charged_strike', [], { pack: 3 });
    s.combat!.exertion = 5;
    firstUse(s, ctx, 'charged_strike');
    expect(monsters.every((m) => m.life < m.maxLife)).toBe(true);
  });

  it('Overcharge keeps 2 Exertion after the Exerted use', () => {
    const { s, ctx } = arena('charged_strike', ['overcharge']);
    s.combat!.exertion = 5;
    firstUse(s, ctx, 'charged_strike');
    // 2 kept, plus the hit's own Exertion
    expect(s.combat!.exertion).toBe(3);
  });

  it('Hasty Exertion adds one more Exertion per hit', () => {
    const { s, ctx } = arena('rend', ['hasty_exertion']);
    firstUse(s, ctx, 'rend');
    expect(s.combat!.exertion).toBe(2);
  });

  it('Hair Trigger: a crit fills Exertion, then waits a second', () => {
    const { s, ctx } = arena('rend', ['hair_trigger']);
    s.combat!.asc.sureCrit = true;
    firstUse(s, ctx, 'rend');
    expect(s.combat!.exertion).toBe(5);
    expect(s.combat!.hairTriggerMs).toBeGreaterThan(0);
  });

  it('Violent Release hits every other enemy for half', () => {
    const { s, ctx, monsters } = arena('rend', ['violent_release'], { pack: 3 });
    s.combat!.exertion = 5;
    firstUse(s, ctx, 'rend');
    expect(monsters.every((m) => m.life < m.maxLife)).toBe(true);
  });

  it('Soul Drain heals 8% Life on an Exerted Soul Rip', () => {
    const { s, ctx } = arena('soul_rip', ['dark_drain'], { classId: 'mage' });
    const max = deriveStats(s).maxLife;
    s.life = max * 0.5;
    s.combat!.exertion = 5;
    firstUse(s, ctx, 'soul_rip');
    expect(s.life).toBeGreaterThanOrEqual(max * 0.57);
  });

  it('Exerted Momentum grants Momentum to a Ranger', () => {
    const { s, ctx } = arena('rend', ['exerted_momentum'], { classId: 'ranger' });
    s.combat!.exertion = 5;
    firstUse(s, ctx, 'rend');
    expect(s.combat!.mech).toBeGreaterThanOrEqual(3);
  });

  it('Hemorrhage: an Exerted Rend bleeds everything next to its target', () => {
    const { s, ctx, monsters } = arena('rend', ['deep_hemorrhage'], { pack: 2 });
    monsters[1].cell = 1;
    s.combat!.exertion = 5;
    firstUse(s, ctx, 'rend');
    expect(monsters[1].dots.some((x) => x.kind === 'bleed')).toBe(true);
  });

  it('Cascading Force: an Exerted kill gives 2 Exertion', () => {
    const { s, ctx } = arena('charged_strike', ['cascading_force'], { life: 1 });
    s.combat!.exertion = 5;
    firstUse(s, ctx, 'charged_strike');
    expect(s.combat!.exertion).toBeGreaterThanOrEqual(2);
  });
});

describe('Doom supports', () => {
  it('Doom Accelerant adds one more Doom per hit', () => {
    const { s, ctx, dummy } = arena('doom_bolt', ['doom_accelerant'], { classId: 'mage' });
    firstUse(s, ctx, 'doom_bolt');
    expect(dummy.doom).toBe(3);
  });

  it('Endless Dread lets Doom climb past 20 and bursts harder at 30', () => {
    const { s, ctx, dummy } = arena('doom_bolt', ['endless_dread'], { classId: 'mage' });
    dummy.doom = 19;
    firstUse(s, ctx, 'doom_bolt');
    expect(dummy.doom).toBe(21);
  });

  it('Doom Echo: a burst also hits every other enemy', () => {
    const { s, ctx, dummy, monsters } = arena('doom_bolt', ['doom_echo'], { classId: 'mage', pack: 3 });
    dummy.doom = 19;
    s.skillBar[0]!.rules = [{ when: 'always' }];
    firstUse(s, ctx, 'doom_bolt');
    expect(dummy.doom).toBe(0);
    expect(monsters.slice(1).every((m) => m.life < m.maxLife)).toBe(true);
  });

  it('Mass Doom: every enemy gains Doom', () => {
    const { s, ctx, monsters } = arena('doom_bolt', ['mass_doom'], { classId: 'mage', pack: 3 });
    firstUse(s, ctx, 'doom_bolt');
    expect(monsters.every((m) => (m.doom ?? 0) >= 1)).toBe(true);
  });

  it('Cursed Blow: Doom Strike adds one more Doom', () => {
    const { s, ctx, dummy } = arena('doom_strike', ['cursed_blow']);
    firstUse(s, ctx, 'doom_strike');
    expect(dummy.doom).toBe(3);
  });

  it('Chain Doom: an Exerted Void Wave adds 2 Doom', () => {
    const { s, ctx, dummy } = arena('void_wave', ['chain_doom'], { classId: 'mage' });
    s.combat!.exertion = 5;
    firstUse(s, ctx, 'void_wave');
    expect(dummy.doom).toBe(2);
  });

  it('Dark Leech: Void Pact eats Doom for Energy Shield', () => {
    const { s, ctx, dummy } = arena('void_pact', ['dark_leech'], { classId: 'mage' });
    dummy.doom = 15;
    s.es = 0;
    firstUse(s, ctx, 'void_pact');
    expect(dummy.doom).toBe(0);
    expect(s.es).toBeGreaterThan(0);
  });

  it('Doom Haste slows Doom fading', () => {
    const plain = arena('entropy', [], { classId: 'mage' });
    const slow = arena('entropy', ['doom_haste'], { classId: 'mage' });
    for (const a of [plain, slow]) {
      a.s.skillBar[0]!.rules = [{ when: 'manual' }];
      a.dummy.doom = 10;
      a.dummy.doomDecayMs = 0;
      run(a.s, a.ctx, 8000);
    }
    expect(slow.dummy.doom!).toBeGreaterThan(plain.dummy.doom!);
  });
});

describe('Mark supports', () => {
  const mark = (specials: string[], stacks = 4, maxStacks = 5) => ({ kind: 'brand_of_ruin', stacks, maxStacks, remainingMs: 6000, burst: { damage: [80, 120] as [number, number], type: 'chaos' as const }, specials });

  it('Corrosion: the burst strips chaos resistance for a while', () => {
    const { s, ctx, dummy } = arena('doom_bolt', [], { classId: 'mage' });
    dummy.mark = mark(['corrosion']);
    firstUse(s, ctx, 'doom_bolt');
    expect(dummy.mark).toBeUndefined();
    expect(dummy.chaosShred).toBe(20);
    expect(dummy.chaosShredMs).toBeGreaterThan(0);
  });

  it('Execute: a cursed target bursts at 3 stacks and a weakened one dies', () => {
    const { s, ctx, dummy } = arena('doom_bolt', [], { classId: 'mage' });
    dummy.mark = mark(['execute_mark'], 2, 4);
    dummy.curse = { gemId: 'marked_for_death', remainingMs: 8000, durationMs: 8000, physTaken: 0, resPen: 0, dealLess: 0, slow: 0 };
    dummy.life = dummy.maxLife * 0.15;
    firstUse(s, ctx, 'doom_bolt');
    expect(dummy.life).toBeLessThanOrEqual(0);
  });

  it('Spreading Brand: the nearest unmarked enemy inherits the mark with 2 stacks', () => {
    const { s, ctx, dummy, monsters } = arena('doom_bolt', [], { classId: 'mage', pack: 2 });
    dummy.mark = mark(['spreading_brand']);
    firstUse(s, ctx, 'doom_bolt');
    expect(monsters[1].mark?.stacks).toBe(2);
  });

  it('Flash Point: the burst ignites', () => {
    const { s, ctx, dummy } = arena('doom_bolt', [], { classId: 'mage' });
    dummy.mark = mark(['flashpoint']);
    firstUse(s, ctx, 'doom_bolt');
    expect(dummy.dots.some((x) => x.kind === 'ignite')).toBe(true);
  });
});

describe('Warcry supports', () => {
  it('Powerful Voice counts every enemy twice', () => {
    const plain = arena('battle_cry', [], { pack: 2 });
    const loud = arena('battle_cry', ['powerful_voice'], { pack: 2 });
    for (const a of [plain, loud]) firstUse(a.s, a.ctx, 'battle_cry');
    const more = (a: typeof plain) => a.s.combat!.buffs.find((b) => b.id === 'battle_cry')!.moreDamage!;
    expect(more(loud)).toBeGreaterThan(more(plain));
  });

  it('War Drum fills Rage for each enemy near you', () => {
    const { s, ctx } = arena('battle_cry', ['war_drum'], { pack: 2 });
    firstUse(s, ctx, 'battle_cry');
    expect(s.combat!.mech).toBeGreaterThanOrEqual(16);
  });

  it("Pack Rush adds Evasion to Hunter's Call", () => {
    const { s, ctx } = arena('hunters_call', ['pack_rush']);
    firstUse(s, ctx, 'hunters_call');
    expect(s.combat!.buffs.find((b) => b.id === 'hunters_call')?.stats?.evasionPct).toBe(20);
  });

  it('Void Voice: hits can poison while Dark Howl lasts', () => {
    const { s, ctx } = arena('dark_howl', ['void_voice']);
    firstUse(s, ctx, 'dark_howl');
    expect(s.combat!.buffs.find((b) => b.id === 'dark_howl')?.poisonChance).toBe(20);
  });

  it('Carnage: a kill bursts onto the nearest enemy', () => {
    const { s, ctx, dummy, monsters } = arena('death_rattle', ['carnage'], { pack: 2 });
    firstUse(s, ctx, 'death_rattle');
    dummy.life = 0;
    run(s, ctx, 100);
    expect(monsters[1].life).toBeLessThan(monsters[1].maxLife);
  });

  it('Primal Force: the stun also weakens', () => {
    const { s, ctx, dummy } = arena('primal_roar', ['primal_force']);
    // the stun is a 50% roll on a long cooldown: keep the cooldown clear until one lands
    run(s, ctx, 30_000, () => {
      s.combat!.cooldowns[0] = 0;
      return dummy.stunMs > 0;
    });
    expect(dummy.stunMs).toBeGreaterThan(0);
    expect(dummy.weakenMs).toBeGreaterThan(0);
  });

  it('Rally the Fallen heals more with recent kills', () => {
    const { s, ctx } = arena('rallying_cry', ['rally_the_fallen']);
    const max = deriveStats(s).maxLife;
    s.life = max * 0.5;
    s.combat!.corpses = 10;
    firstUse(s, ctx, 'rallying_cry');
    // 5% from the cry with one enemy, 10% from the corpses
    expect(s.life).toBeGreaterThanOrEqual(max * 0.64);
  });

  it('Forebears: Ancestors deal extra fire damage', () => {
    const plain = arena('ancestral_call');
    const fire = arena('ancestral_call', ['forebears']);
    for (const a of [plain, fire]) run(a.s, a.ctx, 6000);
    expect(fire.dummy.maxLife - fire.dummy.life).toBeGreaterThan(plain.dummy.maxLife - plain.dummy.life);
  });
});

describe('Totem supports', () => {
  const placed = (s: GameState) => (s.combat?.totems?.length ?? 0) > 0;

  it('Venom Totem poisons twice per hit', () => {
    const { s, ctx, dummy } = arena('shadow_totem', ['venom_totem']);
    s.skillBar[0]!.rules = [{ when: 'always' }];
    run(s, ctx, 3000, () => placed(s));
    s.skillBar[0]!.rules = [{ when: 'manual' }];
    dummy.dots = [];
    run(s, ctx, 2500, () => dummy.dots.length > 0);
    expect(dummy.dots.filter((x) => x.kind === 'poison').length).toBe(2);
  });

  it('Corruptor strips chaos resistance', () => {
    const { s, ctx, dummy } = arena('chaos_totem', ['corruptor'], { classId: 'mage' });
    run(s, ctx, 3000, () => placed(s));
    run(s, ctx, 2500, () => (dummy.chaosShredMs ?? 0) > 0);
    expect(dummy.chaosShred).toBe(15);
  });

  it('Blizzard Totem explodes when it ends', () => {
    const { s, ctx, dummy } = arena('ice_totem', ['blizzard_totem'], { classId: 'mage' });
    run(s, ctx, 3000, () => placed(s));
    s.skillBar[0]!.rules = [{ when: 'manual' }];
    s.combat!.totems![0].remainingMs = 10;
    s.combat!.totems![0].nextAttackMs = 1e9;
    const before = dummy.life;
    run(s, ctx, 100);
    expect(dummy.life).toBeLessThan(before);
    expect(dummy.chillMs).toBeGreaterThan(0);
  });

  it('Cascading Totems raises one replacement', () => {
    const { s, ctx } = arena('flame_totem', ['cascading_totems'], { classId: 'mage' });
    run(s, ctx, 3000, () => placed(s));
    s.skillBar[0]!.rules = [{ when: 'manual' }];
    s.combat!.totems![0].remainingMs = 10;
    run(s, ctx, 100);
    expect(s.combat!.totems).toHaveLength(1);
    expect(s.combat!.totems![0].replacement).toBe(true);
    s.combat!.totems![0].remainingMs = 10;
    run(s, ctx, 100);
    expect(s.combat!.totems).toHaveLength(0);
  });

  it('Totem Vanguard takes hits in your place while it taunts', () => {
    const { s, ctx, dummy } = arena('flame_totem', ['totem_vanguard'], { classId: 'mage' });
    run(s, ctx, 3000, () => placed(s));
    const totem = s.combat!.totems![0];
    expect(totem.tauntMs).toBeGreaterThan(0);
    dummy.attackMs = 300;
    dummy.cell = 0;
    const life = s.life;
    run(s, ctx, 1500);
    expect(s.life).toBe(life);
    expect(totem.life).toBeLessThan(totem.maxLife);
  });

  it('Long Siege hits a second enemy', () => {
    const { s, ctx, monsters } = arena('siege_totem', ['long_siege'], { pack: 2 });
    run(s, ctx, 3000, () => placed(s));
    s.skillBar[0]!.rules = [{ when: 'manual' }];
    const before = monsters[1].life;
    run(s, ctx, 4500);
    expect(monsters[1].life).toBeLessThan(before);
  });

  it('Pyre Totem leaves burning ground', () => {
    const { s, ctx } = arena('flame_totem', ['pyre_totem'], { classId: 'mage' });
    run(s, ctx, 3000, () => placed(s));
    run(s, ctx, 2000, () => s.combat!.ground.some((g) => g.kind === 'burning'));
    expect(s.combat!.ground.some((g) => g.kind === 'burning')).toBe(true);
  });
});

describe('General supports', () => {
  it('Chaos Infusion turns 40% of a hit into chaos', () => {
    const { s, ctx, dummy } = arena('fireball', ['chaos_infusion'], { classId: 'mage' });
    dummy.res.chaos = 75;
    const plain = arena('fireball', [], { classId: 'mage' });
    plain.dummy.res.chaos = 75;
    firstUse(s, ctx, 'fireball');
    firstUse(plain.s, plain.ctx, 'fireball');
    // the chaos part is resisted, so the infused hit lands lighter
    expect(dummy.maxLife - dummy.life).toBeLessThan(plain.dummy.maxLife - plain.dummy.life);
  });

  it('Void Touch: a full-Mana spell is all chaos', () => {
    const { s, ctx, dummy } = arena('fireball', ['void_touch'], { classId: 'mage' });
    dummy.res.chaos = 75;
    dummy.res.fire = -100;
    const plain = arena('fireball', [], { classId: 'mage' });
    plain.dummy.res.fire = -100;
    firstUse(s, ctx, 'fireball');
    firstUse(plain.s, plain.ctx, 'fireball');
    expect(dummy.maxLife - dummy.life).toBeLessThan((plain.dummy.maxLife - plain.dummy.life) / 2);
  });

  it('Slaughter: kills stack more damage', () => {
    const { s, ctx } = arena('heavy_strike', ['slaughter'], { life: 1, pack: 2 });
    run(s, ctx, 5000, () => s.combat!.buffs.some((b) => b.id === 'slaughter'));
    expect(s.combat!.buffs.find((b) => b.id === 'slaughter')?.moreDamage).toBeGreaterThanOrEqual(2);
  });

  it('Blind Fury uses the skill faster under half Life', () => {
    const calm = arena('heavy_strike', ['blind_fury']);
    const fury = arena('heavy_strike', ['blind_fury']);
    const max = deriveStats(fury.s).maxLife;
    fury.s.life = max * 0.4;
    run(calm.s, calm.ctx, 10_000);
    for (let t = 0; t < 10_000; t += 50) {
      fury.s.life = max * 0.4;
      combatStep(fury.s, fury.ctx, 50, deriveStats(fury.s));
    }
    expect(used(fury.ctx, 'heavy_strike')).toBeGreaterThan(used(calm.ctx, 'heavy_strike') * 1.3);
  });
});

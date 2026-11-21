import { describe, expect, it } from 'vitest';
import { affixDef } from '../src/data/affixes';
import { CAMPAIGN_GEAR_CHECKS, gearCheckAdvice } from '../src/data/campaignGearChecks';
import { flaskDef } from '../src/data/flasks';
import { gemAct, gemReqLevel } from '../src/data/gems';
import { mapZoneId } from '../src/data/maps';
import { ZONES, zoneDef } from '../src/data/zones';
import { ruleLockReason } from '../src/engine/automation';
import { FRONT_CELL, monsterGround } from '../src/engine/battlefield';
import { chooseSkill, combatStep, enterZone, makeMonster } from '../src/engine/combat';
import { makeCtx } from '../src/engine/context';
import { createSkillGem, setRule } from '../src/engine/gems';
import { createItem, droppableBases, eligibleAffixes } from '../src/engine/items';
import { monsterBasicDps } from '../src/engine/monsters';
import { gemShopZone } from '../src/engine/progress';
import { seeded } from '../src/engine/rng';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameState } from '../src/engine/types';

function spawnNextPack(s: GameState, ctx: ReturnType<typeof makeCtx>) {
  const c = s.combat!;
  c.monsters = [];
  c.spawnMs = 1;
  combatStep(s, ctx, 50, deriveStats(s));
  return c.monsters;
}

describe('campaign gear check packs', () => {
  it('spawns three authored checks per act with one stronger check late on its route', () => {
    for (let act = 1; act <= 7; act++) {
      const zones = ZONES.filter((z) => z.act === act);
      const checks = zones.filter((z) => CAMPAIGN_GEAR_CHECKS[z.id]);
      expect(checks).toHaveLength(3);
      const major = checks.filter((z) => CAMPAIGN_GEAR_CHECKS[z.id]?.major);
      expect(major).toHaveLength(1);
      expect(zones.indexOf(major[0])).toBeGreaterThanOrEqual(zones.length - 2);
      expect(major[0].actBoss || zones.at(-1)?.requires?.after?.join() === major[0].id).toBe(true);
      for (const zone of checks) {
        const check = CAMPAIGN_GEAR_CHECKS[zone.id]!;
        const base = zone.monsters.find((m) => m.id === check.monsterId);
        expect(base, zone.id).toBeDefined();
        const s = newGame(9);
        const ctx = makeCtx(seeded(9));
        enterZone(s, ctx, zone.id);
        const pack = spawnNextPack(s, ctx);
        const leader = pack[0];
        expect(leader.name, zone.id).toBe(check.name);
        expect(leader.rarity).toBe('normal');
        expect(leader.hulking).toBeFalsy();
        expect(leader.gearCheckWarning).toBe(gearCheckAdvice(check));
        expect(monsterBasicDps(leader)).toBeCloseTo(monsterBasicDps(makeMonster(base!, false, 0, leader.scale)) * (check.pressure ?? 1));
        expect(makeMonster(base!, false).gearCheckWarning).toBeUndefined();
      }
    }
  });

  it('offers up to three obtainable counters per pack, with gear mods and rules for every general check', () => {
    const s = newGame(1);
    const rng = seeded(1);
    for (const [index, zone] of ZONES.entries()) {
      const check = CAMPAIGN_GEAR_CHECKS[zone.id];
      if (!check) continue;
      const earliestLevel = zone.levelRange[0];
      const earlierDropLevel = Math.min(earliestLevel, ZONES[index - 1].levelRange[1]);
      const bases = droppableBases(earlierDropLevel);
      expect(check.counters.length, zone.id).toBeGreaterThan(0);
      expect(check.counters.length, zone.id).toBeLessThanOrEqual(3);
      if (!check.major) {
        expect(check.counters.some((counter) => counter.affix), zone.id).toBe(true);
        expect(check.counters.some((counter) => counter.rule), zone.id).toBe(true);
      }
      for (const counter of check.counters) {
        if (counter.affix) {
          const affix = affixDef(counter.affix);
          expect(bases.some((base) => {
            const item = createItem(s, base.id, earlierDropLevel, 'normal', rng);
            return eligibleAffixes(item, affix.kind).some((option) => option.id === affix.id);
          }), `${zone.id}: ${counter.affix}`).toBe(true);
        }
        if (counter.flask) expect(flaskDef(counter.flask).dropLevel).toBeLessThanOrEqual(earlierDropLevel);
        if (counter.rule) {
          expect(ruleLockReason(s, counter.rule.when), zone.id).toBeNull();
          expect(counter.gems?.length, zone.id).toBeGreaterThan(0);
          for (const id of counter.gems ?? []) {
            expect(gemAct(id), id).toBeLessThanOrEqual(zone.act);
            expect(gemReqLevel(id), id).toBeLessThanOrEqual(earliestLevel);
            const shopZone = gemShopZone(id);
            expect(shopZone, id).toBeDefined();
            expect(ZONES.indexOf(shopZone!), id).toBeLessThan(index);
          }
          if (counter.rule.when === 'onGround') {
            const base = zone.monsters.find((m) => m.id === check.monsterId)!;
            expect(check.ground ?? base.basic.ground).toBe(true);
            expect(monsterGround(base, check.damageType ?? base.dmgType)).toBe(counter.rule.ground);
          }
        }
      }
    }
  });

  it('lets a starter guard reserve its cast for a living dangerous pack leader', () => {
    const s = newGame(1);
    const ctx = makeCtx(seeded(1));
    enterZone(s, ctx, 'ashwood');
    s.skillBar.fill(null);
    s.skillBar[0] = createSkillGem(s, 'iron_guard');
    expect(setRule(s, 0, 0, { when: 'dangerousPack' })).toBeNull();
    expect(chooseSkill(s, deriveStats(s)).slot).not.toBe(0);
    const pack = spawnNextPack(s, ctx);
    expect(pack[0].gearCheckWarning).toBeTruthy();
    expect(s.combat!.using).toBe('iron_guard');
    pack[0].life = 0;
    s.combat!.cooldowns[0] = 0;
    expect(chooseSkill(s, deriveStats(s)).slot).not.toBe(0);
  });

  it('keeps the cadence through a save and uses it offline, without adding leaders to Maps', () => {
    const s = newGame(4);
    const ctx = makeCtx(seeded(4));
    enterZone(s, ctx, 'icevault');
    expect(spawnNextPack(s, ctx)[0].name).toBe('Rime Warden');
    const saved = deserialize(serialize(s))!;
    expect(saved.combat!.monsters[0].res.cold).toBe(60);
    expect(saved.combat!.monsters[0].name).toBe('Rime Warden');
    ctx.offline = true;
    expect(spawnNextPack(saved, ctx).some((m) => m.gearCheckWarning)).toBe(false);
    expect(spawnNextPack(saved, ctx).some((m) => m.gearCheckWarning)).toBe(false);
    expect(spawnNextPack(saved, ctx)[0].name).toBe('Rime Warden');

    const map = zoneDef(mapZoneId(1, 'icevault'));
    expect(map.monsters.some((m) => m.id === 'hoarfrost')).toBe(true);
    enterZone(saved, ctx, map.id);
    expect(spawnNextPack(saved, ctx).some((m) => m.gearCheckWarning)).toBe(false);
    expect(saved.combat!.campaignPacks).toBeUndefined();
  });

  it.each([
    { area: 'stormcliffs', type: 'phys', ailment: 'bleed' },
    { area: 'caravan', type: 'phys' },
    { area: 'pyretemple', type: 'fire', ailment: 'ignite' },
    { area: 'highaltar', type: 'chaos', ailment: 'poison' },
    { area: 'kingsstair', type: 'cold', ailment: 'chill' },
    { area: 'maelstrom', type: 'light', ailment: 'shock' },
    { area: 'ninthstair', type: 'chaos' },
  ] as const)('$area deals less damage to a character with the suggested defense', ({ area, type, ...expected }) => {
    const takeAttack = (prepared: boolean) => {
      const s = newGame(3);
      const ctx = makeCtx(seeded(3));
      enterZone(s, ctx, area);
      const [leader] = spawnNextPack(s, ctx);
      const c = s.combat!;
      c.monsters = [leader];
      c.spawnMs = c.actionMs = 60000;
      leader.cell = FRONT_CELL;
      leader.attackTimer = leader.attackMs;
      s.settings.autoFlee = false;
      s.flaskSlots = s.flaskSlots.map(() => null);
      s.life = 1000;
      s.es = 0;
      const stats = deriveStats(s);
      stats.maxLife = s.life;
      stats.evasion = 0;
      stats.armour = type === 'phys' && prepared ? 400 : 0;
      if (type !== 'phys') stats.res[type] = prepared ? 50 : 0;
      combatStep(s, ctx, 50, stats);
      const ailment = 'ailment' in expected ? expected.ailment : undefined;
      if (ailment === 'chill') expect(c.playerChillMs).toBeGreaterThan(0);
      else if (ailment === 'shock') expect(c.playerShockMs).toBeGreaterThan(0);
      else if (ailment) expect(c.playerDots?.some((dot) => dot.kind === ailment)).toBe(true);
      return 1000 - s.life + (c.playerDots ?? []).reduce((sum, dot) => sum + dot.dps * dot.remainingMs / 1000, 0);
    };
    expect(takeAttack(false)).toBeGreaterThan(takeAttack(true));
  });
});

/**
 * The game states behind the playtest scenarios, kept free of the browser so the balance sim can load them too
 * (`npm run sim -- --scenario act3Boss`). The browser side, and presets that need it, are in scenarios.ts.
 */
import type { ClassId } from '../data/classes';
import { BAG_SIZE } from '../data/hideout';
import { BASES, baseDef } from '../data/bases';
import { CURRENCIES, MATERIALS } from '../data/materials';
import { ZONES, type ZoneDef } from '../data/zones';
import { challengeBoss, startCombat } from '../engine/combat';
import type { Ctx } from '../engine/context';
import { createItem } from '../engine/items';
import { seeded } from '../engine/rng';
import { deriveStats } from '../engine/stats';
import type { ChallengeFlags, EquipSlot, GameState, ItemSlotType } from '../engine/types';
import { charXpForLevel } from '../engine/xp';

export interface Setup {
  classId?: ClassId;
  /** defaults to the top of the zone's level range, or 1 with no zone */
  level?: number;
  /** area to fight in; every area before it counts as cleared */
  zone?: string;
  /** go straight to the area's boss */
  boss?: boolean;
  /** keep the tutorial running */
  tutorial?: boolean;
  challenge?: ChallengeFlags;
  /** anything else the scenario needs, after gearing up */
  prepare?: (s: GameState) => void;
}

const actBoss = (act: number): ZoneDef => ZONES.find((z) => z.act === act && z.actBoss)!;

export const PRESETS: Record<string, Setup> = {
  /** a brand new character, tutorial and all */
  fresh: { tutorial: true },
  midAct1: { classId: 'ranger', zone: 'ashwood' },
  act1Boss: { classId: 'warrior', zone: actBoss(1).id, boss: true },
  act3Boss: { classId: 'mage', zone: actBoss(3).id, boss: true },
  act6Boss: { classId: 'duelist', zone: actBoss(6).id, boss: true },
  /** all three challenge modes at once, in a fight it can lose */
  hardcoreSsfClassic: { classId: 'warrior', zone: actBoss(3).id, level: 1, challenge: { hardcore: true, ssf: true, classic: true } },
  /** a full bag of rares, for salvage, stash and overflow */
  fullInventory: {
    level: 30,
    prepare: (s) => {
      const rng = seeded(1);
      const bases = BASES.filter((b) => b.reqLevel <= 30);
      for (let i = s.inventory.length; i < BAG_SIZE; i++) {
        s.inventory.push(createItem(s, bases[i % bases.length].id, 30, 'rare', rng));
      }
    },
  },
  /** plenty of every currency and material, for crafting and hideout upgrades */
  rich: {
    level: 40,
    prepare: (s) => {
      for (const { id } of [...CURRENCIES, ...MATERIALS]) s.account.bank[id] = 9999;
    },
  },
};

const slotFor = (slot: ItemSlotType): EquipSlot => (slot === 'ring' ? 'ring1' : slot);

/** The best plain base for each slot at this level; the weapon stays in the class's starting family. */
function gearUp(s: GameState, level: number) {
  const rng = seeded(level);
  const weapon = s.equipment.weapon && baseDef(s.equipment.weapon.baseId);
  const family = (tags: string[]) => tags.slice().sort().join();
  const best = new Map<ItemSlotType, (typeof BASES)[number]>();
  for (const base of BASES) {
    if (base.reqLevel > level || base.retired) continue;
    if (base.slot === 'weapon' && weapon && family(base.tags) !== family(weapon.tags)) continue;
    if (base.reqLevel >= (best.get(base.slot)?.reqLevel ?? 0)) best.set(base.slot, base);
  }
  for (const [slot, base] of best) s.equipment[slotFor(slot)] = createItem(s, base.id, level, 'rare', rng);
}

/** The setup's area, or undefined without one. */
export function setupZone(setup: Setup): ZoneDef | undefined {
  const zone = setup.zone ? ZONES.find((z) => z.id === setup.zone) : undefined;
  if (setup.zone && !zone) throw new Error(`No area called ${setup.zone}`);
  return zone;
}

export const setupLevel = (setup: Setup) => setup.level ?? setupZone(setup)?.levelRange[1] ?? 1;

/** Turn a new character into the setup's: level, areas cleared, gear, then into the fight. */
export function applySetup(s: GameState, ctx: Ctx, setup: Setup) {
  const zone = setupZone(setup);
  const level = setupLevel(setup);
  if (!setup.tutorial) s.tutorial = { ...s.tutorial, done: true, skipped: true };
  s.skills.combat = charXpForLevel(level);
  if (zone) {
    const index = ZONES.indexOf(zone);
    s.unlockedZones = ZONES.slice(0, index + 1).map((z) => z.id);
    s.bossesDefeated = ZONES.slice(0, index).map((z) => z.id);
  }
  if (level > 1) gearUp(s, level);
  setup.prepare?.(s);
  const stats = deriveStats(s, []);
  s.life = stats.maxLife;
  s.mana = stats.maxMana;
  if (zone) {
    if (setup.boss) s.zoneKills[zone.id] = zone.bossEvery;
    const blocked = startCombat(s, ctx, zone.id);
    if (blocked) throw new Error(blocked);
    if (setup.boss) {
      challengeBoss(s);
      // it comes once the field is clear
      s.combat!.monsters = [];
    }
  }
}

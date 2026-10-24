import { classDef, type ClassId } from '../data/classes';
import { flaskDef, FLASK_SLOTS } from '../data/flasks';
import { SKILL_BAR_SLOTS } from '../data/gems';
import { newFlask } from './flasks';
import { createSkillGem } from './gems';
import type { Ctx } from './context';
import { checkAchievements } from './achievements';
import { combatStep } from './combat';
import { refreshVendor, vendorTick } from './hideout';
import { createItem } from './items';
import { seeded } from './rng';
import { craftStep } from './craftUntil';
import { greenhouseStep, skillStep } from './skills';
import { deriveStats } from './stats';
import type { EquipSlot, GameState } from './types';

export const SAVE_VERSION = 13;
export const STEP_MS = 50;
/** out of combat, life refills this fraction of max per second */
export const TOWN_REGEN = 0.25;

export interface NewCharacter {
  name: string;
  classId: ClassId;
  id?: string;
}

export function newCharacterId(): string {
  return `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function newGame(seed = Date.now(), who: NewCharacter = { name: 'Exile', classId: 'warrior' }): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    character: { id: who.id ?? newCharacterId(), name: who.name, classId: who.classId, createdAt: Date.now() },
    tutorial: { step: 0, progress: 0, done: false, skipped: false },
    nextUid: 1,
    skills: { combat: 0, mining: 0, woodcutting: 0, harvesting: 0, smithing: 0, alchemy: 0, gemcutting: 0 },
    bank: { gold: 25, transmute: 3, augment: 2, arcane_dust: 6 },
    inventory: [],
    equipment: {},
    flaskSlots: Array(FLASK_SLOTS).fill(null),
    flaskStash: [],
    skillBar: Array(SKILL_BAR_SLOTS).fill(null),
    gems: [],
    supportGems: [],
    action: null,
    life: 60,
    mana: 30,
    es: 0,
    combat: null,
    zoneKills: {},
    unlockedZones: ['mudflats'],
    passives: [],
    masteries: {},
    skillPassives: [],
    achievements: [],
    bossesDefeated: [],
    greenhouse: null,
    smithCatalyst: { fossil: null, resin: null, until: false, salvageMisses: false },
    hideout: { map_device: 1, stash: 1, forge: 1, alchemy_table: 1, bench: 1, vendor: 1 },
    vendor: { stock: [], refreshAt: 0 },
    settings: { autoSalvage: { normal: false, magic: false, rare: false, unique: false }, reducedMotion: false, movement: 'walk', autoFlee: true },
    lifetime: {
      kills: 0, bossKills: 0, deaths: 0, itemsLooted: 0, orbsUsed: 0, salvaged: 0, flasksDrunk: 0,
      flasksBrewed: 0, itemsSmithed: 0, gathered: 0, benchCrafts: 0, raresFound: 0, uniquesFound: 0,
    },
    clock: 0,
    lastSaved: Date.now(),
  };
  const rng = seeded(seed);
  for (const [slot, baseId] of Object.entries(classDef(who.classId).kit)) {
    s.equipment[slot as EquipSlot] = createItem(s, baseId, 1, 'normal', rng);
  }
  for (const slot of [0, 1]) {
    const f = newFlask(s, 'life_small');
    f.charges = flaskDef('life_small').maxCharges;
    s.flaskSlots[slot] = f;
  }
  giveStarterGems(s);
  refreshVendor(s, rng);
  return s;
}

/** Put the class's starting skills on the bar. */
export function giveStarterGems(s: GameState): void {
  classDef(s.character.classId).starterGems.forEach((id, i) => (s.skillBar[i] = createSkillGem(s, id)));
}

/** Advance the simulation by dtMs using fixed sub-steps. */
export function tick(s: GameState, ctx: Ctx, dtMs: number): void {
  let d = deriveStats(s);
  let remaining = dtMs;
  while (remaining > 0) {
    const step = Math.min(STEP_MS, remaining);
    remaining -= step;
    s.clock += step;
    if (s.action?.kind === 'skill') skillStep(s, ctx, step, d);
    if (s.action?.kind === 'craft') craftStep(s, ctx, step);
    greenhouseStep(s, ctx, step, d);
    if (s.combat) {
      if (combatStep(s, ctx, step, d)) d = deriveStats(s);
    } else {
      s.life = Math.min(d.maxLife, s.life + d.maxLife * TOWN_REGEN * (step / 1000));
      s.mana = Math.min(d.maxMana, s.mana + d.maxMana * TOWN_REGEN * (step / 1000));
      s.es = Math.min(d.maxEs, s.es + d.maxEs * TOWN_REGEN * (step / 1000));
    }
  }
  if (s.life > d.maxLife) s.life = d.maxLife;
  if (s.mana > d.maxMana) s.mana = d.maxMana;
  if (s.es > d.maxEs) s.es = d.maxEs;
  vendorTick(s, ctx.rng);
  checkAchievements(s, ctx);
}

import { classDef, startClass, type ClassId } from '../data/classes';
import { flaskDef, FLASK_SLOTS } from '../data/flasks';
import { EXILE_START } from '../data/passiveTree';
import { freshAccount } from './account';
import { addBank } from './bank';
import { newAscendancyState } from './ascendancy';
import { SKILL_BAR_SLOTS } from '../data/gems';
import { newFlask } from './flasks';
import { createSkillGem } from './gems';
import type { Ctx } from './context';
import { checkAchievements } from './achievements';
import { mealStep } from './cooking';
import { combatStep } from './combat';
import { fillOrders, newExpeditionState } from './expedition';
import { heistAutoStep, heistStep, newHeistState } from './heist';
import { checkCampaignDone, refreshVendor, vendorTick } from './hideout';
import { createItem } from './items';
import { autoSwitchGear, newLoadouts } from './loadouts';
import { mapStep, newMapState } from './maps';
import { seeded } from './rng';
import { craftStep } from './craftUntil';
import { greenhouseStep, skillStep } from './skills';
import { deriveStats } from './stats';
import { defaultLayeredLootFilter, defaultLootFilters } from './lootFilter';
import { challengeName } from './challenge';
export { enterZone } from './combat';
export { challengeName };
import type { AccountState, ChallengeFlags, EquipSlot, GameState } from './types';

export const SAVE_VERSION = 45;
export const STEP_MS = 50;
/** out of combat, life refills this fraction of max per second */
export const TOWN_REGEN = 0.25;

export interface NewCharacter {
  name: string;
  classId: ClassId;
  /** Exile only: which class's tree start to begin from */
  startNode?: string;
  id?: string;
  challenge?: ChallengeFlags;
}

const STARTING_BANK = { gold: 25, transmute: 3, augment: 2, arcane_dust: 6 };

export function newCharacterId(): string {
  return `c${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function newGame(seed = Date.now(), who: NewCharacter = { name: 'Exile', classId: 'warrior' }, account: AccountState = freshAccount()): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    account,
    character: {
      id: who.id ?? newCharacterId(),
      name: who.name,
      classId: who.classId,
      ...(who.classId === 'exile' && { startNode: who.startNode === EXILE_START ? EXILE_START : startClass('exile', who.startNode).startNode }),
      ...(who.challenge && challengeName(who.challenge) && { challenge: who.challenge }),
      createdAt: Date.now(),
    },
    tutorial: { step: 0, progress: 0, done: false, skipped: false },
    nextUid: 1,
    skills: { combat: 0, mining: 0, woodcutting: 0, harvesting: 0, thieving: 0, archaeology: 0, smithing: 0, alchemy: 0, gemcutting: 0, runecarving: 0, cooking: 0, cartography: 0, fishing: 0 },
    skillingMastery: {},
    inventory: [],
    ground: [],
    offlineHaul: [],
    equipment: {},
    flaskSlots: Array(FLASK_SLOTS).fill(null),
    skillBar: Array(SKILL_BAR_SLOTS).fill(null),
    loadouts: newLoadouts(),
    action: null,
    life: 60,
    mana: 30,
    es: 0,
    combat: null,
    zoneKills: {},
    unlockedZones: ['mudflats'],
    travelPoints: 2,
    passivePoints: 1,
    masteryPoints: 0,
    passivePointLevel: 1,
    passiveQuestPoints: 0,
    passives: [],
    masteries: {},
    characterTreeOverhaul: 2,
    ascendancy: newAscendancyState(),
    skillPassives: [],
    passiveProfiles: [{ id: 'profile_1', name: 'Profile 1', passives: [], masteries: {} }],
    activePassiveProfile: 'profile_1',
    atlasProfiles: [{ id: 'profile_1', name: 'Profile 1', passives: [], masteries: {} }],
    activeAtlasProfile: 'profile_1',
    skillingProfiles: [{ id: 'profile_1', name: 'Profile 1', passives: [], masteries: {} }],
    activeSkillingProfile: 'profile_1',
    campaign: { act: 1 },
    achievements: [],
    bossesDefeated: [],
    greenhouse: null,
    meal: null,
    keepEating: true,
    smithCatalyst: { fossil: null, resin: null, until: false, salvageMisses: false, salvageFull: false, salvageAll: false },
    maps: newMapState((account.maps ??= {})),
    heist: newHeistState(),
    expedition: newExpeditionState(),
    vendor: { stock: [], refreshAt: 0 },
    settings: {
      autoSalvage: { normal: false, magic: false, rare: false, unique: false },
      filterOffClassLoot: false,
      activeLootFilterId: null,
      customLootFilters: defaultLootFilters(),
      lootFilter: defaultLayeredLootFilter(),
      reducedMotion: false,
      movement: 'walk',
      posture: 'brawler',
      autoFlee: true,
      autoBoss: false,
      targeting: { priority: 'none', order: 'closest' },
    },
    lifetime: {
      kills: 0, bossKills: 0, deaths: 0, itemsLooted: 0, orbsUsed: 0, salvaged: 0, flasksDrunk: 0,
      flasksBrewed: 0, mealsEaten: 0, mapsDrawn: 0, itemsSmithed: 0, gathered: 0, benchCrafts: 0, raresFound: 0, uniquesFound: 0,
      rareKills: 0, doomedBest: 0, uniqueMaps: [],
    },
    clock: 0,
    lastSaved: Date.now(),
  };
  // every new character adds its starting kit to the shared tabs
  for (const [id, n] of Object.entries(STARTING_BANK)) addBank(s, id, n);
  const rng = seeded(seed);
  const exileWeapon = who.classId === 'exile' ? startClass('exile', who.startNode).exileWeapon : undefined;
  for (const [slot, baseId] of Object.entries({ ...classDef(who.classId).kit, ...(exileWeapon && { weapon: exileWeapon }) })) {
    s.equipment[slot as EquipSlot] = createItem(s, baseId, 1, 'normal', rng);
  }
  // a life and a mana flask: nobody regenerates in a fight, so these are all the recovery you start with
  ['life_small', 'mana_small'].forEach((id, slot) => {
    const f = newFlask(s, id);
    f.charges = flaskDef(id).maxCharges;
    s.flaskSlots[slot] = f;
  });
  giveStarterGems(s);
  refreshVendor(s, rng);
  return s;
}

/** Put the class's starting skills on the bar (an Exile gets those of the start it picked). */
export function giveStarterGems(s: GameState): void {
  startClass(s.character.classId, s.character.startNode).starterGems.forEach((id, i) => (s.skillBar[i] = createSkillGem(s, id)));
}

/** Advance the simulation by dtMs using fixed sub-steps. */
export function tick(s: GameState, ctx: Ctx, dtMs: number): void {
  if (s.fallen) return;
  autoSwitchGear(s, ctx);
  let d = deriveStats(s);
  let remaining = dtMs;
  while (remaining > 0) {
    const step = Math.min(STEP_MS, remaining);
    remaining -= step;
    s.clock += step;
    if (s.action?.kind === 'skill') skillStep(s, ctx, step, d);
    if (s.action?.kind === 'craft') craftStep(s, ctx, step);
    if (s.action?.kind === 'heist') heistStep(s, ctx, step, d);
    heistAutoStep(s);
    greenhouseStep(s, ctx, step, d);
    if (s.combat) {
      mealStep(s, ctx, step);
      if (combatStep(s, ctx, step, d)) d = deriveStats(s);
      if (s.fallen) return;
    } else {
      s.life = Math.min(d.maxLife, s.life + d.maxLife * TOWN_REGEN * (step / 1000));
      s.mana = Math.min(d.maxMana, s.mana + d.maxMana * TOWN_REGEN * (step / 1000));
      s.es = Math.min(d.maxEs, s.es + d.maxEs * TOWN_REGEN * (step / 1000));
    }
    mapStep(s, ctx);
  }
  if (s.life > d.maxLife) s.life = d.maxLife;
  if (s.mana > d.maxMana) s.mana = d.maxMana;
  if (s.es > d.maxEs) s.es = d.maxEs;
  fillOrders(s, ctx);
  vendorTick(s, ctx.rng, dtMs, ctx.event?.vendorSpeed ?? 1);
  checkAchievements(s, ctx);
  checkCampaignDone(s, ctx);
}

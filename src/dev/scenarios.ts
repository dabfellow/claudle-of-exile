/**
 * Ready-made game states for checking changes in the browser, on a throwaway demo character.
 * Dev builds only (see main.tsx). From the console or the /playtest skill:
 *   await scenario()                    lists the presets
 *   await scenario('act3Boss')          loads one
 *   await scenario({ classId: 'mage', level: 60, zone: 'crypt', boss: true })
 * The presets themselves are in presets.ts, which the balance sim shares.
 */
import { BASES } from '../data/bases';
import { DOOMED_TIERS, SEXTANTS, UNIQUE_MAPS } from '../data/maps';
import { ZONES } from '../data/zones';
import { addBank } from '../engine/bank';
import { FINAL_ACT } from '../engine/hideout';
import { addDoomedMaps, addUniqueMaps, grantBossKeys, grantMaps } from '../engine/maps';
import { ACTIVE_GEMS, SUPPORT_GEMS } from '../data/gems';
import { CURRENCIES, MATERIALS } from '../data/materials';
import { grantSeed, makeStrainKey, plantPlot } from '../engine/foraging';
import { createSkillGem, createSupportGem } from '../engine/gems';
import { enableFishingPlaytest } from '../engine/fishing';
import { addFixedMod, createItem } from '../engine/items';
import { seeded } from '../engine/rng';
import { MARKET_UNLOCK_BOSS } from '../engine/market';
import { game } from '../game';
import { setMarketStandIn } from '../platform/market';
import { fakeMarket } from './fakeMarket';
import { xpForLevel } from '../engine/xp';
import { applySetup, PRESETS as SHARED, setupLevel, setupZone, type Setup } from './presets';

/** Ordinary attribute jewellery a campaign build can keep while replacing an outdated weapon. */
function smithingAttributes(s: Parameters<NonNullable<Setup['prepare']>>[0]) {
  const rng = seeded(8);
  const item = createItem(s, 'coral_amulet', 20, 'normal', rng);
  item.rarity = 'rare';
  for (const id of ['strength', 'dexterity', 'intelligence']) addFixedMod(item, id, 1, { next: () => 0.999999 });
  addFixedMod(item, 'flat_life', 1, rng);
  s.equipment.amulet = item;
}

const PRESETS: Record<string, Setup> = {
  ...SHARED,
  fishing: {
    classId: 'ranger', level: 100,
    prepare: (s) => {
      s.action = null;
      s.combat = null;
      enableFishingPlaytest(s);
    },
  },
  thievingStarter: {
    classId: 'shadow', level: 1,
    prepare: (s) => {
      s.combat = null; s.action = null;
      s.skills.thieving = 0;
      s.storage.bank.gold = 0;
      s.storage.bank.rogues_marker = 13;
      s.professionProgress.counters['thieving.markers'] = 3;
    },
  },
  rogueRoster: {
    classId: 'ranger', level: 60, zone: 'caravan',
    prepare: (s) => {
      s.combat = null; s.action = null;
      s.skills.thieving = xpForLevel(60);
      s.storage.bank.gold = 100000;
      s.storage.bank.rogues_marker = 1000;
      s.heist.crew = ['bruiser', 'locksmith', 'lookout'];
      for (const rogue of Object.values(s.heist.roster!)) rogue.level = 60;
    },
  },
  foragingStarter: {
    classId: 'ranger', level: 1, zone: 'mudflats',
    prepare: (s) => { s.skills.combat = 0; s.skills.harvesting = 0; s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.storage.bank = {}; },
  },
  foragingGreenhouse: {
    classId: 'ranger', level: 1, zone: 'mudflats',
    prepare: (s) => {
      s.skills.combat = 0; s.skills.harvesting = xpForLevel(90); s.skills.alchemy = xpForLevel(30); s.skills.cooking = xpForLevel(30);
      s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.storage.bank = {}; s.account.hideout.alchemy_table = 3;
      s.skillPassives = ['skill_core', 'core_2', 'harvesting_s0', 'harvesting_s1', 'harvesting_s2', 'harvesting_n0', 'harvesting_ks'];
      s.professionProgress.work.harvesting = 100;
      s.professionProgress.counters['foraging.seed.moon_bloom'] = 99;
      s.professionProgress.counters['foraging.bloom.moon_bloom'] = 59;

      const now = Date.now();
      const readyStrain = makeStrainKey('sunpetal', ['bountiful', 'lucent']);
      const quickStrain = makeStrainKey('frostleaf', ['quickroot']);
      const emberStrain = makeStrainKey('emberroot', ['bountiful', 'lucent']);
      const legendaryStrain = makeStrainKey('voidbloom', ['celestial']);
      const uniqueStrain = makeStrainKey('eclipse_bloom', ['umbral']);
      const chaseStrain = makeStrainKey('moon_bloom', ['radiant', 'vivid', 'deep_rooted']);
      const crossLeft = makeStrainKey('moon_bloom', ['radiant']);
      const crossRight = makeStrainKey('star_bloom', ['celestial']);
      const stableStrain = makeStrainKey('sunpetal', ['everbloom']);

      grantSeed(s, 'sunpetal', 4, now, false);
      grantSeed(s, readyStrain, 1, now, false);
      grantSeed(s, quickStrain, 3, now, false);
      grantSeed(s, emberStrain, 3, now, false);
      grantSeed(s, legendaryStrain, 1, now, false);
      grantSeed(s, uniqueStrain, 1, now, false);
      grantSeed(s, chaseStrain, 2, now, false);
      grantSeed(s, crossLeft, 2, now, false);
      grantSeed(s, crossRight, 2, now, false);
      grantSeed(s, stableStrain, 1, now, false);
      s.foraging.strains[stableStrain] = { generation: 5, stable: true, firstSeen: now };
      s.foraging.strainHerbs[emberStrain] = 14;
      s.foraging.strainHerbs[legendaryStrain] = 20;

      plantPlot(s, 0, [readyStrain], now);
      if (s.foraging.plots[0]) {
        const dur0 = s.foraging.plots[0].readyAt - s.foraging.plots[0].plantedAt;
        s.foraging.plots[0].plantedAt = now - dur0 - 1000;
        s.foraging.plots[0].readyAt = now - 1000;
      }

      plantPlot(s, 1, [quickStrain], now);
      if (s.foraging.plots[1]) {
        const elapsed = Math.round((s.foraging.plots[1].readyAt - s.foraging.plots[1].plantedAt) * 0.55);
        s.foraging.plots[1].plantedAt -= elapsed;
        s.foraging.plots[1].readyAt -= elapsed;
      }

      plantPlot(s, 2, [crossLeft, crossRight], now);
      if (s.foraging.plots[2]) {
        const elapsed = Math.round((s.foraging.plots[2].readyAt - s.foraging.plots[2].plantedAt) * 0.65);
        s.foraging.plots[2].plantedAt -= elapsed;
        s.foraging.plots[2].readyAt -= elapsed;
      }
    },
  },
  smithingMelee: {
    classId: 'warrior', level: 20, zone: 'crypt',
    prepare: (s) => {
      s.combat = null; s.action = null; s.skills.smithing = xpForLevel(18);
      s.skills.mining = xpForLevel(15); s.skills.woodcutting = xpForLevel(15);
      s.account.hideout.forge = 2; s.storage.bank = {}; s.inventory = [];
      s.equipment.weapon = createItem(s, 'felling_axe', 10, 'normal', seeded(3));
      smithingAttributes(s);
      s.storage.bank = { iron_ore: 42, oak_log: 18, iron_bar: 2, oak_plank: 1 };
    },
  },
  smithingBow: {
    classId: 'ranger', level: 20, zone: 'crypt',
    prepare: (s) => {
      s.combat = null; s.action = null; s.skills.smithing = xpForLevel(16);
      s.skills.mining = xpForLevel(15); s.skills.woodcutting = xpForLevel(15);
      s.account.hideout.forge = 2; s.storage.bank = {}; s.inventory = [];
      s.equipment.weapon = createItem(s, 'hunting_bow', 8, 'normal', seeded(3));
      smithingAttributes(s);
      s.storage.bank = { iron_ore: 42, oak_log: 18, iron_bar: 2, oak_plank: 1 };
    },
  },
  smithingCaster: {
    classId: 'mage', level: 20, zone: 'crypt',
    prepare: (s) => {
      s.combat = null; s.action = null; s.skills.smithing = xpForLevel(15);
      s.skills.mining = xpForLevel(15); s.skills.woodcutting = xpForLevel(15);
      s.account.hideout.forge = 2; s.storage.bank = {}; s.inventory = [];
      s.equipment.weapon = createItem(s, 'bone_wand', 7, 'normal', seeded(3));
      smithingAttributes(s);
      s.storage.bank = { iron_ore: 42, oak_log: 18, iron_bar: 2, oak_plank: 1 };
    },
  },
  smithingNoncombat: {
    level: 1,
    prepare: (s) => {
      s.combat = null; s.action = null; s.skills.combat = 0;
      s.skills.smithing = xpForLevel(90); s.skills.mining = xpForLevel(90); s.skills.woodcutting = xpForLevel(90);
      s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.account.hideout.forge = 3;
      s.professionProgress.work.smithing = 60; s.professionProgress.work.woodcutting = 100;
      s.storage.bank = { copper_bar: 10, iron_bar: 10, ash_plank: 5, oak_plank: 5 };
      s.inventory = [];
    },
  },
  woodcuttingStarter: {
    level: 1,
    prepare: (s) => { s.skills.combat = 0; s.skills.woodcutting = 0; s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.storage.bank = {}; },
  },
  woodcuttingAdvanced: {
    level: 1,
    prepare: (s) => {
      s.skills.combat = 0; s.skills.woodcutting = xpForLevel(90); s.skills.smithing = xpForLevel(15);
      s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.professionProgress.work.woodcutting = 100;
      for (const wood of ['ironwood', 'ancient', 'spirit', 'worldwood']) s.professionProgress.discoveries[`wood_${wood}_survey`] = true;
      s.storage.bank = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };
      s.professionProgress.counters['wood.heartwood.survey'] = 29;
      s.professionProgress.counters['wood.cycles.cut_resin_oak'] = 4;
    },
  },
  miningStarter: {
    level: 1,
    prepare: (s) => { s.skills.combat = 0; s.skills.mining = 0; s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.storage.bank = {}; },
  },
  miningAdvanced: {
    level: 1,
    prepare: (s) => {
      s.skills.combat = 0; s.skills.mining = xpForLevel(90); s.skills.smithing = xpForLevel(30); s.skills.runecarving = xpForLevel(30);
      s.unlockedZones = ['mudflats']; s.bossesDefeated = [];
      s.professionProgress.work.mining = 100;
      for (const metal of ['iron', 'mithril', 'adamant', 'star', 'void', 'world']) s.professionProgress.discoveries[`prospect_${metal}`] = true;
      s.storage.bank = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };
      s.professionProgress.counters['mining.fossils'] = 11;
      s.professionProgress.counters['mining.crystal_shard'] = 29;
      s.professionProgress.counters['mining.mineral_fragment'] = 59;
      s.professionProgress.counters['mining.stone_fragment'] = 59;
    },
  },
  /** the campaign beaten, with maps of every kind, Sextants and boss keys to open them with */
  maps: {
    classId: 'duelist',
    level: 80,
    prepare: (s) => {
      s.unlockedZones = ZONES.filter((z) => z.act <= FINAL_ACT).map((z) => z.id);
      s.bossesDefeated = [...s.unlockedZones];
      grantMaps(s, 3);
      for (const sex of SEXTANTS) addBank(s, sex.id, 4);
      for (const d of DOOMED_TIERS) addDoomedMaps(s, d.tier, 1);
      for (const u of UNIQUE_MAPS) addUniqueMaps(s, u.id, 1);
      grantBossKeys(s, 1);
      addBank(s, 'chaos', 60);
      s.account.hideout.map_device = 4;
    },
  },
  /** a full gem bag and a stocked stash and bank, for the Skills, Stash, Bench and Town pages */
  wellStocked: {
    classId: 'ranger',
    level: 45,
    prepare: (s) => {
      const rng = seeded(7);
      for (const g of ACTIVE_GEMS.slice(0, 18)) s.storage.gems.push(createSkillGem(s, g.id, 1 + Math.floor(rng.next() * 12)));
      for (const g of SUPPORT_GEMS.filter((x) => !x.signatureFor).slice(0, 24)) s.storage.supportGems.push(createSupportGem(s, g.id));
      const bases = BASES.filter((b) => b.reqLevel <= 45 && !b.retired);
      const rarities = ['normal', 'magic', 'rare', 'rare'] as const;
      if (!s.storage.stash.length) s.storage.stash.push([]);
      for (let i = 0; i < 40; i++) {
        const item = createItem(s, bases[(i * 7) % bases.length].id, 20 + (i % 25), rarities[i % 4], rng);
        item.uid = s.account.nextUid++;
        s.storage.stash[0].push(item);
      }
      for (let i = 0; i < 12; i++) s.inventory.push(createItem(s, bases[(i * 11) % bases.length].id, 40, rarities[(i + 1) % 4], rng));
      for (const c of CURRENCIES) s.storage.bank[c.id] = 3 + Math.floor(rng.next() * 40);
      for (const m of MATERIALS.slice(0, 30)) s.storage.bank[m.id] = Math.floor(rng.next() * 200);
      s.storage.bank.gold = 25_000;
    },
  },
  /** signed in as far as the Player Market can tell, against a pretend server */
  market: {
    level: 30,
    prepare: (s) => {
      const rng = seeded(2);
      const bases = BASES.filter((b) => b.reqLevel <= 30);
      for (let i = 0; i < 6; i++) s.inventory.push(createItem(s, bases[i * 5].id, 30, 'rare', rng));
      s.storage.bank.gold = 50_000;
      s.storage.bank.chaos = 50;
      s.bossesDefeated.push(MARKET_UNLOCK_BOSS);
      const others = bases.slice(0, 8).map((b) => createItem(s, b.id, 30, 'rare', rng));
      const fake = fakeMarket(others);
      setMarketStandIn(fake);
      (window as unknown as { fakeMarket: typeof fake }).fakeMarket = fake;
    },
  },
};

async function load(setup: Setup) {
  const zone = setupZone(setup);
  const level = setupLevel(setup);

  if (game.screen === 'game') await game.exit();
  if (!game.account) await game.signIn('demo');
  await game.create('Playtest', setup.classId ?? 'warrior', undefined, setup.challenge);
  game.dismissIntro();

  game.act((s, ctx) => applySetup(s, ctx, setup));
  game.notify();
  return { level, classId: setup.classId ?? 'warrior', zone: zone?.id ?? null };
}

export async function scenario(which?: string | Setup) {
  if (which === undefined) return Object.keys(PRESETS);
  if (typeof which !== 'string') return load(which);
  if (!PRESETS[which]) throw new Error(`No scenario called ${which}. Try: ${Object.keys(PRESETS).join(', ')}`);
  return load(PRESETS[which]);
}

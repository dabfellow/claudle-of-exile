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
import { createSkillGem, createSupportGem } from '../engine/gems';
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
  foragingStarter: {
    classId: 'ranger', level: 1, zone: 'mudflats',
    prepare: (s) => { s.skills.combat = 0; s.skills.harvesting = 0; s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.account.bank = {}; },
  },
  foragingGreenhouse: {
    classId: 'ranger', level: 1, zone: 'mudflats',
    prepare: (s) => {
      s.skills.combat = 0; s.skills.harvesting = xpForLevel(90); s.skills.alchemy = xpForLevel(30); s.skills.cooking = xpForLevel(30);
      s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.account.bank = {}; s.account.hideout.alchemy_table = 3;
      s.skillPassives = ['skill_core', 'core_2', 'harvesting_s0', 'harvesting_s1', 'harvesting_s2', 'harvesting_n0', 'harvesting_ks'];
      s.professionProgress.work.harvesting = 100;
      s.professionProgress.counters['foraging.seed.moon_bloom'] = 99;
      s.professionProgress.counters['foraging.bloom.moon_bloom'] = 59;
    },
  },
  smithingMelee: {
    classId: 'warrior', level: 20, zone: 'crypt',
    prepare: (s) => {
      s.combat = null; s.action = null; s.skills.smithing = xpForLevel(18);
      s.skills.mining = xpForLevel(15); s.skills.woodcutting = xpForLevel(15);
      s.account.hideout.forge = 2; s.account.bank = {}; s.inventory = [];
      s.equipment.weapon = createItem(s, 'felling_axe', 10, 'normal', seeded(3));
      smithingAttributes(s);
      s.account.bank = { iron_ore: 42, oak_log: 18, iron_bar: 2, oak_plank: 1 };
    },
  },
  smithingBow: {
    classId: 'ranger', level: 20, zone: 'crypt',
    prepare: (s) => {
      s.combat = null; s.action = null; s.skills.smithing = xpForLevel(16);
      s.skills.mining = xpForLevel(15); s.skills.woodcutting = xpForLevel(15);
      s.account.hideout.forge = 2; s.account.bank = {}; s.inventory = [];
      s.equipment.weapon = createItem(s, 'hunting_bow', 8, 'normal', seeded(3));
      smithingAttributes(s);
      s.account.bank = { iron_ore: 42, oak_log: 18, iron_bar: 2, oak_plank: 1 };
    },
  },
  smithingCaster: {
    classId: 'mage', level: 20, zone: 'crypt',
    prepare: (s) => {
      s.combat = null; s.action = null; s.skills.smithing = xpForLevel(15);
      s.skills.mining = xpForLevel(15); s.skills.woodcutting = xpForLevel(15);
      s.account.hideout.forge = 2; s.account.bank = {}; s.inventory = [];
      s.equipment.weapon = createItem(s, 'bone_wand', 7, 'normal', seeded(3));
      smithingAttributes(s);
      s.account.bank = { iron_ore: 42, oak_log: 18, iron_bar: 2, oak_plank: 1 };
    },
  },
  smithingNoncombat: {
    level: 1,
    prepare: (s) => {
      s.combat = null; s.action = null; s.skills.combat = 0;
      s.skills.smithing = xpForLevel(90); s.skills.mining = xpForLevel(90); s.skills.woodcutting = xpForLevel(90);
      s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.account.hideout.forge = 3;
      s.professionProgress.work.smithing = 60; s.professionProgress.work.woodcutting = 100;
      s.account.bank = { copper_bar: 10, iron_bar: 10, ash_plank: 5, oak_plank: 5 };
      s.inventory = [];
    },
  },
  woodcuttingStarter: {
    level: 1,
    prepare: (s) => { s.skills.combat = 0; s.skills.woodcutting = 0; s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.account.bank = {}; },
  },
  woodcuttingAdvanced: {
    level: 1,
    prepare: (s) => {
      s.skills.combat = 0; s.skills.woodcutting = xpForLevel(90); s.skills.smithing = xpForLevel(15);
      s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.professionProgress.work.woodcutting = 100;
      for (const wood of ['ironwood', 'ancient', 'spirit', 'worldwood']) s.professionProgress.discoveries[`wood_${wood}_survey`] = true;
      s.account.bank = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };
      s.professionProgress.counters['wood.heartwood.survey'] = 29;
      s.professionProgress.counters['wood.cycles.cut_resin_oak'] = 4;
    },
  },
  miningStarter: {
    level: 1,
    prepare: (s) => { s.skills.combat = 0; s.skills.mining = 0; s.unlockedZones = ['mudflats']; s.bossesDefeated = []; s.account.bank = {}; },
  },
  miningAdvanced: {
    level: 1,
    prepare: (s) => {
      s.skills.combat = 0; s.skills.mining = xpForLevel(90); s.skills.smithing = xpForLevel(30); s.skills.runecarving = xpForLevel(30);
      s.unlockedZones = ['mudflats']; s.bossesDefeated = [];
      s.professionProgress.work.mining = 100;
      for (const metal of ['iron', 'mithril', 'adamant', 'star', 'void', 'world']) s.professionProgress.discoveries[`prospect_${metal}`] = true;
      s.account.bank = { copper_bar: 10, mithril_bar: 10, oak_plank: 5, rough_gem: 5 };
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
      for (const g of ACTIVE_GEMS.slice(0, 18)) s.account.gems.push(createSkillGem(s, g.id, 1 + Math.floor(rng.next() * 12)));
      for (const g of SUPPORT_GEMS.filter((x) => !x.signatureFor).slice(0, 24)) s.account.supportGems.push(createSupportGem(s, g.id));
      const bases = BASES.filter((b) => b.reqLevel <= 45 && !b.retired);
      const rarities = ['normal', 'magic', 'rare', 'rare'] as const;
      if (!s.account.stash.length) s.account.stash.push([]);
      for (let i = 0; i < 40; i++) {
        const item = createItem(s, bases[(i * 7) % bases.length].id, 20 + (i % 25), rarities[i % 4], rng);
        item.uid = s.account.nextUid++;
        s.account.stash[0].push(item);
      }
      for (let i = 0; i < 12; i++) s.inventory.push(createItem(s, bases[(i * 11) % bases.length].id, 40, rarities[(i + 1) % 4], rng));
      for (const c of CURRENCIES) s.account.bank[c.id] = 3 + Math.floor(rng.next() * 40);
      for (const m of MATERIALS.slice(0, 30)) s.account.bank[m.id] = Math.floor(rng.next() * 200);
      s.account.bank.gold = 25_000;
    },
  },
  /** signed in as far as the Player Market can tell, against a pretend server */
  market: {
    level: 30,
    prepare: (s) => {
      const rng = seeded(2);
      const bases = BASES.filter((b) => b.reqLevel <= 30);
      for (let i = 0; i < 6; i++) s.inventory.push(createItem(s, bases[i * 5].id, 30, 'rare', rng));
      s.account.bank.gold = 50_000;
      s.account.bank.chaos = 50;
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

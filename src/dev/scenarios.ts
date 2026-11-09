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
import { createItem } from '../engine/items';
import { seeded } from '../engine/rng';
import { MARKET_UNLOCK_BOSS } from '../engine/market';
import { game } from '../game';
import { setMarketStandIn } from '../platform/market';
import { fakeMarket } from './fakeMarket';
import { applySetup, PRESETS as SHARED, setupLevel, setupZone, type Setup } from './presets';

const PRESETS: Record<string, Setup> = {
  ...SHARED,
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

import { game } from '../game';
import type { scenario } from './scenarios';
import { MAPS_PREVIEW, startUniqueMap } from '../engine/maps';
import { prepareDefenceBuild, prepareGemcuttingSkiller, prepareReliquaryMapper, prepareRuneUniqueBuild, prepareRunecarverKit, prepareThiefKit, prepareWeaponBuild } from './overhaulBuilds';
import { professionProject } from '../data/professionProjects';
import { equip } from '../engine/equipment';
import { createUnique } from '../engine/items';
import { startCombat } from '../engine/combat';
import { xpForLevel } from '../engine/xp';

/** Disposable local-only controls for journeys that normally need hours of waiting. */
export function mountOverhaulPlaytest(load: typeof scenario) {
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;bottom:0;right:0;z-index:99999;background:#182129;padding:8px;max-width:680px;color:white';
  const errors: string[] = [];
  window.addEventListener('error', (e) => errors.push(e.message));
  window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason)));
  const info = document.createElement('pre');
  info.style.cssText = 'white-space:pre-wrap;max-height:180px;overflow:auto;font-size:12px';
  let weapon = 'woundmaker';
  async function workshop(id: string) {
    weapon = id;
    await load({ classId: id === 'winters_pyre' ? 'mage' : id === 'the_homecoming' ? 'ranger' : 'duelist', level: 80,
      prepare: (s) => { s.skills.smithing = xpForLevel(90); s.professionProgress.work.smithing = 100; s.account.hideout.forge = 3; s.storage.bank = { ...professionProject(id)!.inputs }; } });
    game.act((s, ctx) => prepareWeaponBuild(s, ctx, id));
  }
  for (const [label, fn] of [
    ['Workshop Woundmaker', () => workshop('woundmaker')],
    ['Workshop Pyre', () => workshop('winters_pyre')],
    ['Workshop Homecoming', () => workshop('the_homecoming')],
    ['Use crafted weapon', () => game.act((s, ctx) => {
      const item = s.inventory.find((i) => i.uniqueId === weapon);
      if (!item) { info.textContent = 'Complete the selected weapon project first'; return; }
      const reason = equip(s, ctx, item.uid, 'weapon');
      if (reason) { info.textContent = reason; return; }
      s.unlockedZones.push('shatteredthrone'); startCombat(s, ctx, 'shatteredthrone');
    })],
    ['Cartographer', async () => { MAPS_PREVIEW.enabled = false; await load({ classId: 'mage', level: 1, prepare: (s) => {
      s.skills.cartography = xpForLevel(50); s.professionProgress.work.cartography = 600;
      s.account.campaignDone = false; s.bossesDefeated = []; s.storage.bank = { chart_survey_fragment: 20, fine_vellum: 10, sepia_ink: 5, sextant_journeyman: 1 };
    } }); MAPS_PREVIEW.enabled = false; }],
    ['Eligible mapper', async () => { await load('maps'); game.act(prepareReliquaryMapper); }],
    ['Try Reliquary', () => game.act((s, ctx) => { const reason = startUniqueMap(s, ctx, 'umap_artisans_reliquary'); if (reason) info.textContent = reason; })],
    ['Restorer starter', () => load({ classId: 'warrior', level: 1, zone: 'mudflats', prepare: (s) => {
      s.skills.combat = 0; s.skills.archaeology = 0; s.unlockedZones = ['mudflats']; s.bossesDefeated = [];
      s.storage.bank = {}; s.inventory = []; s.action = null; s.combat = null;
    } })],
    ['Skiller missing support', async () => { await load({ classId: 'warrior', level: 25 }); game.act(prepareGemcuttingSkiller); }],
    ['Runic gear customization', async () => { await load({ classId: 'duelist', level: 50 }); game.act(prepareRunecarverKit); }],
    ['Thief Heist kit', async () => { await load({ classId: 'shadow', level: 75 }); game.act(prepareThiefKit); }],
    ['Defence: Grudge + Debt', () => game.act((s, ctx) => prepareDefenceBuild(s, ctx, 'combo_grudge_debt'))],
    ['Defence: Borrowed + Still Heart', () => game.act((s, ctx) => prepareDefenceBuild(s, ctx, 'combo_borrowed_still_heart'))],
    ['Defence: Pyre + Witchglass', () => game.act((s, ctx) => prepareDefenceBuild(s, ctx, 'combo_pyre_witchglass'))],
    ['Runic: Forgotten Choir', () => game.act((s, ctx) => prepareRuneUniqueBuild(s, ctx, 'hands_forgotten_choir'))],
    ['Runic: Hollow Circuit', () => game.act((s, ctx) => prepareRuneUniqueBuild(s, ctx, 'hollow_circuit'))],
    ['Runic: Choir + Circuit', () => game.act((s, ctx) => prepareRuneUniqueBuild(s, ctx, 'combo_choir_circuit'))],
    ['Pinnacle: Worldheart + Debt', () => game.act((s, ctx) => { prepareDefenceBuild(s, ctx, 'debt_of_stone'); s.equipment.belt = createUnique(s, 'worldheart', 90, ctx.rng); })],
    ['Pinnacle: Worldheart + Grudge', () => game.act((s, ctx) => { prepareDefenceBuild(s, ctx, 'the_buried_grudge'); s.equipment.belt = createUnique(s, 'worldheart', 90, ctx.rng); })],
    ['Pinnacle: Sum + Grudge', () => game.act((s, ctx) => { prepareDefenceBuild(s, ctx, 'the_buried_grudge'); s.equipment.amulet = createUnique(s, 'the_sum_of_all_things', 90, ctx.rng); })],
    ['Away 4 hours', () => game.simulateAway(14_400_000)],
    ['Away 20 minutes', () => game.simulateAway(1_200_000)],
    ['Away 1 minute', () => game.simulateAway(60_000)],
    ['Inspect journey', () => { const s = game.state; info.textContent = JSON.stringify({ bank: s.storage.bank, maps: s.maps.stock, run: s.maps.run, deaths: s.lifetime.deaths, dug: s.expedition.dug, discoveries: s.professionProgress.discoveries, counters: s.professionProgress.counters, inventory: s.inventory, weapon: s.equipment.weapon, monsters: s.combat?.monsters.map((m) => ({ uid: m.uid, life: m.life, dots: m.dots, chill: m.chillMs, frozen: m.frozenMs })), pending: s.combat?.pendingArrows?.length, errors }); }],
  ] as const) {
    const b = document.createElement('button'); b.textContent = label; b.onclick = () => { void fn(); }; panel.append(b);
  }
  panel.append(info); document.body.append(panel);
}

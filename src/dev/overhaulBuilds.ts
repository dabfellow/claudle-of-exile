import { PASSIVE_NODES } from '../data/passiveTree';
import { allocate, allocateReason } from '../engine/passives';
import { devKit } from '../engine/maps';
import type { Ctx } from '../engine/context';
import type { GameState } from '../engine/types';
import { createSkillGem, createSupportGem } from '../engine/gems';
import { createItem, addFixedMod } from '../engine/items';
import { baseDef } from '../data/bases';
import { xpForLevel } from '../engine/xp';

/** Ordinary rare kit and legally purchased nearby nodes, no altered combat stats. */
export function prepareReliquaryMapper(s: GameState, ctx: Ctx) {
  s.account.campaignDone = true;
  devKit(s, ctx, 92);
  buyNearbyPassives(s, ctx);
  s.flaskSlots[0]!.instill = 'lowLife'; s.flaskSlots[1]!.instill = 'lowMana';
  s.account.hideout.war_table = 5;
}

function buyNearbyPassives(s: GameState, ctx: Ctx) {
  const region = s.character.classId === 'mage' ? 'int' : s.character.classId === 'ranger' ? 'dex' : s.character.classId === 'warrior' ? 'str' : s.character.classId;
  for (let i = 0; i < 300; i++) {
    const candidates = PASSIVE_NODES.filter((n) => n.region === region && ['small', 'travel', 'notable', 'large'].includes(n.kind) && !allocateReason(s, n.id));
    const score = (n: typeof candidates[number]) => (n.stats.str ?? 0) + (n.stats.dex ?? 0) + (n.stats.int ?? 0) + (n.stats.allAttr ?? 0) * 2
      + (n.stats.lifePct ?? 0) * 2 + (n.stats.life ?? 0) / 3 + (n.stats.physPct ?? 0) + (n.stats.attackSpeedPct ?? 0) * 2;
    candidates.sort((a, b) => score(b) - score(a));
    if (!candidates.length) break;
    allocate(s, ctx, candidates[0].id);
  }
}

export function prepareWeaponBuild(s: GameState, ctx: Ctx, id: string) {
  devKit(s, ctx, 92);
  buyNearbyPassives(s, ctx);
  // Ordinary five-mod defensive rares: a realistic prepared build rather than random kit holes.
  for (const slot of ['helmet', 'body', 'gloves', 'boots'] as const) {
    const previous = s.equipment[slot]; if (!previous) continue;
    const base = baseDef(previous.baseId), item = createItem(s, base.id, 80, 'normal', ctx.rng);
    const str = base.tags.includes('str_armour'), dex = base.tags.includes('dex_armour'), int = base.tags.includes('int_armour');
    const defence = str && dex ? 'inc_armour_evasion' : str && int ? 'inc_armour_es' : dex && int ? 'inc_evasion_es' : str ? 'inc_armour' : dex ? 'inc_evasion' : 'inc_es';
    item.rarity = 'rare';
    for (const affix of ['flat_life', defence, 'fire_res', 'cold_res', 'light_res']) addFixedMod(item, affix, 8, ctx.rng);
    s.equipment[slot] = item;
  }
  s.skillBar.fill(null);
  const g = createSkillGem(s, id === 'woundmaker' ? 'rend' : id === 'winters_pyre' ? 'glacial_lance' : 'barrage');
  g.level = 20; g.rules = [{ when: 'always' }]; s.skillBar[0] = g;
  g.extraSlots = 1; g.supports = ['life_leech', 'mana_leech', id === 'winters_pyre' ? 'pierce' : 'faster_attacks'].map((support) => createSupportGem(s, support));
  const guard = createSkillGem(s, id === 'winters_pyre' ? 'frost_ward' : 'iron_guard');
  guard.rules = [{ when: 'enemyCasting' }]; s.skillBar[1] = guard;
  if (id === 'the_homecoming') s.settings.posture = 'kiter';
  if (id === 'winters_pyre') {
    const filler = createSkillGem(s, 'frost_needle'); filler.level = 20; filler.rules = [{ when: 'always' }];
    filler.extraSlots = 1; filler.supports = ['chain', 'mana_leech', 'life_leech'].map((support) => createSupportGem(s, support));
    s.skillBar[2] = filler;
    for (const slot of ['ring1', 'ring2'] as const) {
      const ring = createItem(s, 'ruby_ring', 80, 'normal', ctx.rng); ring.rarity = 'rare';
      for (const affix of ['flat_life', 'flat_mana', 'ignite_chance', 'intelligence']) addFixedMod(ring, affix, 8, ctx.rng);
      s.equipment[slot] = ring;
    }
  }
  s.flaskSlots[0]!.instill = 'lowLife'; s.flaskSlots[1]!.instill = 'lowMana';
  s.account.hideout.war_table = 5;
}

export function prepareGemcuttingSkiller(s: GameState, _ctx: Ctx) {
  s.skills.gemcutting = 10000;
  s.professionProgress.work.gemcutting = 30;
  s.account.bank.rough_gem = 50;
  s.account.bank.arcane_dust = 300;
  s.skillBar[0] = createSkillGem(s, 'heavy_strike');
  s.skillBar[0]!.rules = [{ when: 'always' }];
  s.skillBar[0]!.supports = [];
}

export function prepareRunecarverKit(s: GameState, ctx: Ctx) {
  s.skills.runecarving = 100000;
  s.professionProgress.counters['rune.stone.3'] = 10;
  s.professionProgress.counters['rune.storm.3'] = 10;
  s.account.bank.inscription_fragment = 50;
  s.account.bank.rune_stone_3 = 5;
  s.account.bank.rune_storm_3 = 5;
  s.account.bank.heartwood_fragment = 20;
  s.account.bank.exceptional_crystal = 5;
  s.account.bank.rune_keen_3 = 5;
  s.account.bank.rune_blood_3 = 5;
  s.account.bank.rune_stone_4 = 5;
  const weapon = createItem(s, 'corsair_cutlass', 50, 'rare', ctx.rng);
  const body = createItem(s, 'plate_vest', 50, 'rare', ctx.rng);
  const ring = createItem(s, 'iron_ring', 50, 'rare', ctx.rng);
  s.inventory.push(weapon, body, ring);
}

export function prepareThiefKit(s: GameState, _ctx: Ctx) {
  s.skills.thieving = xpForLevel(75);
  s.professionProgress.discoveries['heist_clean_cinder_toll'] = true;
  s.professionProgress.discoveries['heist_clean_salt_tithe'] = true;
  s.professionProgress.discoveries['heist_clean_last_wagon'] = true;
  s.professionProgress.discoveries['heist_clean_pyre_vault'] = true;
  s.professionProgress.discoveries['heist_clean_khans_tribute'] = true;
  s.account.bank.marker = 500;
  s.account.bank.treasury_fragment = 120;
  s.account.bank.oath_fragment = 5;
}

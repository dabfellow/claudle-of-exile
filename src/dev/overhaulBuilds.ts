import { PASSIVE_NODES } from '../data/passiveTree';
import { allocate, allocateReason } from '../engine/passives';
import { devKit } from '../engine/maps';
import type { Ctx } from '../engine/context';
import type { GameState } from '../engine/types';
import { createSkillGem, createSupportGem } from '../engine/gems';
import { createItem, addFixedMod, createUnique } from '../engine/items';
import { newFlask } from '../engine/flasks';
import { flaskDef } from '../data/flasks';
import { baseDef } from '../data/bases';
import { charXpForLevel, xpForLevel } from '../engine/xp';

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
  if (id === 'the_homecoming') s.settings.movement = 'flee';
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
  s.storage.bank.rough_gem = 50;
  s.storage.bank.arcane_dust = 300;
  s.skillBar[0] = createSkillGem(s, 'heavy_strike');
  s.skillBar[0]!.rules = [{ when: 'always' }];
  s.skillBar[0]!.supports = [];
}

export function prepareRunecarverKit(s: GameState, ctx: Ctx) {
  s.skills.runecarving = 100000;
  s.professionProgress.counters['rune.stone.3'] = 10;
  s.professionProgress.counters['rune.storm.3'] = 10;
  s.storage.bank.inscription_fragment = 50;
  s.storage.bank.rune_stone_3 = 5;
  s.storage.bank.rune_storm_3 = 5;
  s.storage.bank.heartwood_fragment = 20;
  s.storage.bank.exceptional_crystal = 5;
  s.storage.bank.rune_keen_3 = 5;
  s.storage.bank.rune_blood_3 = 5;
  s.storage.bank.rune_stone_4 = 5;
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
  s.storage.bank.marker = 500;
  s.storage.bank.treasury_fragment = 120;
  s.storage.bank.oath_fragment = 5;
}

export function prepareDefenceBuild(s: GameState, ctx: Ctx, id: string) {
  devKit(s, ctx, 92);
  buyNearbyPassives(s, ctx);
  for (const slot of ['helmet', 'body', 'gloves', 'boots', 'offhand', 'amulet'] as const) {
    const previous = s.equipment[slot]; if (!previous) continue;
    const base = baseDef(previous.baseId), item = createItem(s, base.id, 80, 'normal', ctx.rng);
    const str = base.tags.includes('str_armour'), dex = base.tags.includes('dex_armour'), int = base.tags.includes('int_armour');
    const defence = str && dex ? 'inc_armour_evasion' : str && int ? 'inc_armour_es' : dex && int ? 'inc_evasion_es' : str ? 'inc_armour' : dex ? 'inc_evasion' : 'inc_es';
    item.rarity = 'rare';
    for (const affix of ['flat_life', defence, 'fire_res', 'cold_res', 'light_res']) addFixedMod(item, affix, 8, ctx.rng);
    s.equipment[slot] = item;
  }
  s.skillBar.fill(null);
  const slamG = createSkillGem(s, 'ground_slam');
  slamG.level = 20; slamG.rules = [{ when: 'always' }]; s.skillBar[0] = slamG;
  slamG.extraSlots = 1; slamG.supports = ['life_leech', 'mana_leech', 'faster_attacks'].map((support) => createSupportGem(s, support));

  if (id === 'borrowed_tomorrow' || id === 'combo_borrowed_still_heart') {
    s.equipment.amulet = createUnique(s, 'borrowed_tomorrow', 80, ctx.rng);
  }
  if (id === 'the_buried_grudge' || id === 'combo_grudge_debt') {
    s.equipment.offhand = createUnique(s, 'the_buried_grudge', 80, ctx.rng);
  }
  if (id === 'debt_of_stone' || id === 'combo_grudge_debt') {
    s.equipment.body = createUnique(s, 'debt_of_stone', 80, ctx.rng);
  }
  if (id === 'witchglass' || id === 'combo_pyre_witchglass') {
    const wf = newFlask(s, 'u_flask_witchglass');
    wf.charges = flaskDef('u_flask_witchglass').maxCharges;
    s.flaskSlots[2] = wf;
  }
  if (id === 'the_still_heart' || id === 'combo_borrowed_still_heart') {
    const shf = newFlask(s, 'u_flask_still_heart');
    shf.charges = flaskDef('u_flask_still_heart').maxCharges;
    s.flaskSlots[0] = shf;
  }
  if (id === 'combo_pyre_witchglass') {
    s.equipment.weapon = createUnique(s, 'winters_pyre', 80, ctx.rng);
    const ice = createSkillGem(s, 'frost_needle');
    ice.level = 20; ice.rules = [{ when: 'always' }];
    ice.extraSlots = 1; ice.supports = ['chain', 'mana_leech', 'life_leech'].map((support) => createSupportGem(s, support));
    s.skillBar[0] = ice;
  }
  s.flaskSlots[0]!.instill = 'lowLife'; s.flaskSlots[1]!.instill = 'lowMana';
  s.account.hideout.war_table = 5;
}

export function prepareRuneUniqueBuild(s: GameState, ctx: Ctx, id: 'hands_forgotten_choir' | 'hollow_circuit' | 'combo_choir_circuit'): void {
  s.character.classId = 'templar';
  s.skills.combat = charXpForLevel(80);
  s.skills.runecarving = xpForLevel(80);
  s.account.hideout.rune_board = 1;
  const rng = ctx.rng;

  devKit(s, ctx, 80);
  buyNearbyPassives(s, ctx);

  s.equipment.body = createItem(s, 'seraph_raiment', 80, 'rare', rng);
  s.equipment.helmet = createItem(s, 'seraph_circlet', 80, 'rare', rng);
  s.equipment.boots = createItem(s, 'seraph_sandals', 80, 'rare', rng);
  s.equipment.gloves = createItem(s, 'seraph_gloves', 80, 'rare', rng);
  s.equipment.weapon = createItem(s, 'seraph_staff', 80, 'rare', rng);
  s.equipment.ring1 = createItem(s, 'diamond_ring', 80, 'rare', rng);
  s.equipment.ring2 = createItem(s, 'ruby_ring', 80, 'rare', rng);
  s.equipment.amulet = createItem(s, 'amber_amulet', 80, 'rare', rng);
  s.equipment.belt = createItem(s, 'heavy_belt', 80, 'rare', rng);

  addFixedMod(s.equipment.amulet, 'mana_regen_flat', 8, rng);

  s.skillBar.fill(null);
  const totemG = createSkillGem(s, 'flame_totem');
  totemG.level = 20; totemG.rules = [{ when: 'always' }];
  totemG.extraSlots = 1;
  totemG.supports = ['faster_casts', 'mana_leech'].map((support) => createSupportGem(s, support));
  s.skillBar[0] = totemG;

  const hitG = createSkillGem(s, 'heavy_strike');
  hitG.level = 20; hitG.rules = [{ when: 'always' }];
  hitG.extraSlots = 1;
  hitG.supports = ['faster_attacks'].map((support) => createSupportGem(s, support));
  s.skillBar[1] = hitG;

  if (id === 'hands_forgotten_choir' || id === 'combo_choir_circuit') {
    s.equipment.gloves = createUnique(s, 'hands_forgotten_choir', 80, rng);
  }
  if (id === 'hollow_circuit' || id === 'combo_choir_circuit') {
    s.equipment.ring1 = createUnique(s, 'hollow_circuit', 80, rng);
  }

  s.flaskSlots[0]!.instill = 'lowLife';
  s.flaskSlots[1]!.instill = 'lowMana';
  s.account.hideout.war_table = 5;
}

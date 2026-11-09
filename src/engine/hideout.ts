import { BASES, obtainable, type BaseDef } from '../data/bases';
import { ACTIVE_GEMS, activeGemDef, gemReqLevel, SUPPORT_GEMS, supportGemDef } from '../data/gems';
import {
  ALCH_DOUBLE,
  AUTO_SALVAGE_QUARTERMASTER_LEVEL,
  AUTO_CRAFT_BENCH_LEVEL,
  BENCH_BUILT_LEVEL,
  BENCH_CRAFTS,
  FORGE_ILVL,
  GEAR_SWITCH_BENCH_LEVEL,
  MAP_ILVL,
  MAP_RARITY,
  META_CRAFT_BENCH_LEVEL,
  PINNACLE_CRAFT_BENCH_LEVEL,
  SHOP_REFRESH_MIN,
  SHOP_SLOTS,
  STASH_START_PAGES,
  stationDef,
  type StationId,
} from '../data/hideout';
import type { RuleUnlock } from '../data/gems';
import { currencyDef } from '../data/materials';
import { actBossZone, actOpen, ZONES, type ZoneDef } from '../data/zones';
import { grantUnlocks } from './automation';
import { addBank, canAfford, payCost } from './bank';
import { hideoutCost } from './challenge';
import type { Ctx } from './context';
import { flaskName, flaskValue, rollFlask, stashFlask } from './flasks';
import { createSkillGem, createSupportGem } from './gems';
import { createItem, addRandomMod, itemName, modCount, sellValue } from './items';
import { topUpKingMaps } from './maps';
import { gemInShop, gemShopZone } from './progress';
import { pick, rInt, type Rng } from './rng';
import type { GameState, Item, Rarity, VendorOffer } from './types';
import { characterLevel } from './character';
import { bagFull, takeOwned } from './storage';

export function stationLevel(s: GameState, id: StationId): number {
  return s.account.hideout[id] ?? 1;
}

/** Maps come after the campaign, PoE-style: the Map Device wakes once the last act's boss is beaten. */
export const FINAL_ACT = 6;

/** Any character beating the last act counts for the account. A save carried over from a preview build counts for nothing while the act is closed. */
export function campaignComplete(s: GameState): boolean {
  if (!actOpen(FINAL_ACT)) return false;
  const z = actBossZone(FINAL_ACT);
  return !!s.account.campaignDone || (!!z && s.bossesDefeated.includes(z.id));
}

/** Finishing the campaign with any character wakes the Map Device and opens the Exile for the whole account. */
export function checkCampaignDone(s: GameState, ctx: Ctx): void {
  if (s.account.campaignDone || !campaignComplete(s)) return;
  s.account.campaignDone = true;
  // accounts from when Act 1 opened it already hold the Exile
  const exile = s.account.exileUnlocked ? '' : ', and the Exile can now be created';
  s.account.exileUnlocked = true;
  ctx.emit({ t: 'info', text: `Campaign complete: the Map Device wakes${exile}`, tone: 'good' });
  topUpKingMaps(s, ctx);
}

/** Why a station can't be used or upgraded yet, or null. */
export function stationLockReason(s: GameState, id: StationId): string | null {
  if (id === 'map_device' && !campaignComplete(s)) return `Unlocks once Act ${FINAL_ACT} is beaten`;
  return null;
}

export function nextUpgradeCost(s: GameState, id: StationId): Record<string, number> | null {
  const def = stationDef(id);
  const lvl = stationLevel(s, id);
  return lvl >= def.levels.length ? null : hideoutCost(s, def.levels[lvl].cost);
}

const RULE_NAMES: Record<RuleUnlock, string> = { vitals: 'Vitals', status: 'Status', ground: 'Ground', windups: 'Wind-up', aim: 'Aim' };
const FORGE_REACH = ['Smith bases up to level 9', 'Smith bases up to level 21', 'Smith every base'];
const ALCH_REACH = ['Brew recipes below Alchemy level 10', 'Brew recipes up to Alchemy level 19', 'Brew every recipe'];
const SHOP_PERKS = [[], ['Rare gear in shops'], ['Rare gear in shops', 'Rarer currency'], ['Rare gear in shops', 'Rarer currency', 'Better-rolled gear']];

/** Everything a station gives you right now, added up across the levels you've bought. */
export function stationPerks(s: GameState, id: StationId): string[] {
  const lvl = stationLevel(s, id);
  const i = lvl - 1;
  switch (id) {
    case 'map_device':
      if (!MAP_RARITY[i]) return ['Portals to unlocked zones'];
      return [
        `+${MAP_RARITY[i]}% Item Rarity`,
        ...(MAP_ILVL[i] ? [`+${MAP_ILVL[i]} item level on drops`] : []),
        ...(lvl >= 5 ? ['4th Sextant slot unlocked permanently'] : []),
        ...(lvl >= 6 ? ['Pinnacle Conduit: +15% Map Boss extra Map/Key drop, Sextant +2 base charges'] : []),
      ];
    case 'stash': {
      const pages = s.account.stash.length;
      const bought = Math.max(0, pages - (STASH_START_PAGES + i));
      return [
        `${pages} stash pages${bought ? ` (${bought} bought)` : ''}`,
        ...(lvl >= 5 ? ['Dedicated Map Storage Tab'] : []),
        ...(lvl >= 6 ? ['Currency & Fragment Overview Tab'] : []),
      ];
    }
    case 'forge':
      return [
        FORGE_REACH[Math.min(i, 2)],
        ...(FORGE_ILVL[i] ? [`Smithed bases +${FORGE_ILVL[i]} item level`] : []),
        ...(lvl >= 5 ? ['Pinnacle Metallurgy: 10% chance for Tier 1 modifier pre-installed'] : []),
      ];
    case 'alchemy_table':
      return [
        ALCH_REACH[Math.min(i, 2)],
        ...(ALCH_DOUBLE[i] ? [`${Math.round(ALCH_DOUBLE[i] * 100)}% chance of double output`] : []),
        ...(lvl >= 5 ? ['3:1 orb conversion at the alchemy table'] : []),
      ];
    case 'bench': {
      if (lvl < BENCH_BUILT_LEVEL) return ['Use orbs on your gear'];
      const open = BENCH_CRAFTS.filter((c) => c.benchLevel <= lvl);
      return [
        'Salvage gear',
        `${open.length} of ${BENCH_CRAFTS.length} bench recipes`,
        ...(lvl >= GEAR_SWITCH_BENCH_LEVEL ? ['Gear sets switch on their own'] : []),
        ...(lvl >= AUTO_CRAFT_BENCH_LEVEL ? ['Auto-crafting'] : []),
        ...(lvl >= META_CRAFT_BENCH_LEVEL ? ['Meta-crafting: lock prefixes/suffixes & multicraft'] : []),
        ...(lvl >= PINNACLE_CRAFT_BENCH_LEVEL ? ['Pinnacle Crafting: Doom Sigils, Cannot roll Attack/Caster Modifiers'] : []),
      ];
    }
    case 'vendor':
      return [`${SHOP_SLOTS[i]} wares per shop`, `Restock every ${SHOP_REFRESH_MIN[i]} min`, ...SHOP_PERKS[i]];
    case 'war_table': {
      const { rules, ruleSlots } = s.account.automation;
      return [
        `Rules: ${['Simple', ...rules.map((r) => RULE_NAMES[r])].join(', ')}`,
        `${ruleSlots} rule slot${ruleSlots > 1 ? 's' : ''} per skill`,
      ];
    }
    case 'quartermaster': {
      const salvage = Object.entries(AUTO_SALVAGE_QUARTERMASTER_LEVEL).filter(([, required]) => lvl >= required).map(([rarity]) => rarity[0].toUpperCase() + rarity.slice(1));
      return ['Layered loot presets', 'Category overrides', 'Ordered custom rules and share codes', ...(salvage.length ? [`Auto-salvage: ${salvage.join(', ')}`] : [])];
    }
    case 'watchtower':
      return [
        `Up to ${s.account.automation.offlineHours} hours offline`,
        ...(lvl >= 5 ? ['Autonomous Offline Mapping'] : []),
      ];
    case 'trophy_altar':
      return [
        'Displays boss trophies',
        '+3% Armour and Evasion realm-wide',
        ...(lvl >= 2 ? ['+5% increased Mana regeneration rate'] : []),
        ...(lvl >= 3 ? ['+4% all Elemental Resistances'] : []),
        ...(lvl >= 4 ? ['+10% Map Boss drop rates and high-tier modifier rolls'] : []),
      ];
  }
}

export function upgradeStation(s: GameState, ctx: Ctx, id: StationId): string | null {
  const locked = stationLockReason(s, id);
  if (locked) return locked;
  const cost = nextUpgradeCost(s, id);
  if (!cost) return 'Already at max level';
  if (!canAfford(s, cost)) return 'Not enough materials';
  payCost(s, cost);
  const lvl = stationLevel(s, id) + 1;
  s.account.hideout[id] = lvl;
  grantUnlocks(s, stationDef(id).levels[lvl - 1].grants);
  ctx.emit({ t: 'info', text: `${stationDef(id).name} upgraded to level ${lvl}`, tone: 'good' });
  ctx.emit({ t: 'stationUpgraded', id, level: lvl });
  if (id === 'vendor') refreshVendor(s, ctx.rng);
  if (id === 'stash') s.account.stash.push([]);
  return null;
}

// ---------- Town shops ----------

/** Caster weapons go to the Magic shop with the jewellery; every other weapon and all armour to the Weapon & Armour shop. */
const CASTER_FAMILIES = new Set(['wand', 'staff', 'sceptre']);
const JEWELLERY = new Set(['ring', 'amulet', 'belt']);

function magicBase(b: BaseDef): boolean {
  return JEWELLERY.has(b.slot) || (!!b.family && CASTER_FAMILIES.has(b.family));
}

/**
 * Shop gear is decent, crafted magic or rare gear at your level, priced well above its worth:
 * the easy way to gear up, never the cheap one.
 */
export function shopItemPrice(item: Item): number {
  const base = 60 + 8 * item.ilvl ** 1.5;
  return Math.round(base * (item.rarity === 'rare' ? 12 : 5));
}

function shopItem(s: GameState, rng: Rng, lvl: number, bases: BaseDef[], ilvl: number): VendorOffer['item'] {
  const base = pick(rng, bases);
  const rarity: Rarity = lvl >= 2 && rng.next() < 0.35 ? 'rare' : 'magic';
  const item = createItem(s, base.id, ilvl, rarity, rng);
  // magic shop gear is never a bare one-mod roll
  if (rarity === 'magic' && modCount(item) < 2) addRandomMod(item, rng);
  return item;
}

export function refreshVendor(s: GameState, rng: Rng): void {
  const lvl = stationLevel(s, 'vendor');
  const slots = SHOP_SLOTS[lvl - 1];
  const charLvl = characterLevel(s);
  // Town Market level 4 stocks a little above your level: better-rolled gear
  const ilvl = Math.max(2, charLvl + (lvl >= 4 ? 3 : 0));
  const usable = BASES.filter((b) => b.reqLevel <= Math.max(1, charLvl) && obtainable(b));
  const stock: VendorOffer[] = [];
  let id = 1;
  const add = (o: Omit<VendorOffer, 'id'>) => stock.push({ ...o, id: id++ } as VendorOffer);

  // Magic shop: caster weapons and jewellery, flasks, orbs
  const currencyPool = lvl >= 3 ? ['transmute', 'augment', 'alteration', 'alchemy', 'regal', 'chaos', 'scour', 'regret'] : ['transmute', 'augment', 'alteration', 'scour', 'regret'];
  for (let i = 0; i < slots; i++) {
    const roll = rng.next();
    if (roll < 0.45) {
      const item = shopItem(s, rng, lvl, usable.filter(magicBase), ilvl)!;
      add({ shop: 'magic', kind: 'item', item, price: shopItemPrice(item) });
    } else if (roll < 0.7) {
      const flask = rollFlask(s, ilvl, rng);
      add({ shop: 'magic', kind: 'flask', flask, price: flaskValue(flask) * 6 });
    } else {
      const c = currencyDef(pick(rng, currencyPool));
      const qty = c.value >= 30 ? 1 : rInt(rng, 2, 5);
      add({ shop: 'magic', kind: 'currency', currencyId: c.id, qty, price: Math.round(c.value * qty * 4) });
    }
  }
  // Weapon & Armour shop: every other weapon, shields and armour
  for (let i = 0; i < slots; i++) {
    const item = shopItem(s, rng, lvl, usable.filter((b) => !magicBase(b)), ilvl)!;
    add({ shop: 'armour', kind: 'item', item, price: shopItemPrice(item) });
  }
  // the Gem shop keeps a fixed shelf (gemShopOffers), so it never takes a restock slot
  s.vendor = { stock, refreshAt: s.clock + SHOP_REFRESH_MIN[lvl - 1] * 60_000 };
}

/**
 * The Gem shop's shelf: every skill and support gem whose area you've opened, never selling out, so each area
 * pushed puts a few more gems on it. Signature supports wait for Town Market level 2.
 */
export function gemShopOffers(s: GameState): VendorOffer[] {
  const market = stationLevel(s, 'vendor');
  const offers: VendorOffer[] = [];
  for (const g of ACTIVE_GEMS) {
    if (gemInShop(s, g.id)) offers.push({ id: offers.length + 1, shop: 'gems', kind: 'gem', gemId: g.id, price: 150 + gemReqLevel(g.id) * 60 });
  }
  for (const g of SUPPORT_GEMS) {
    if (gemInShop(s, g.id) && (!g.signatureFor || market >= 2)) {
      offers.push({ id: offers.length + 1, shop: 'gems', kind: 'support', supportId: g.id, price: (g.signatureFor ? 400 : 100) + gemReqLevel(g.id) * 50 });
    }
  }
  return offers.sort((a, b) => gemReqLevel(a.gemId ?? a.supportId!) - gemReqLevel(b.gemId ?? b.supportId!));
}

/** How many gems go on the Gem shop's shelf when this area opens. */
export function gemsArrivingAt(s: GameState, zoneId: string): number {
  const market = stationLevel(s, 'vendor');
  return ACTIVE_GEMS.filter((g) => gemShopZone(g.id)?.id === zoneId).length + SUPPORT_GEMS.filter((g) => gemShopZone(g.id)?.id === zoneId && (!g.signatureFor || market >= 2)).length;
}

/** The next area still to open that puts gems in the Gem shop, and how many. */
export function nextGemShopArea(s: GameState): { zone: ZoneDef; count: number } | null {
  for (const z of ZONES) {
    if (s.unlockedZones.includes(z.id) || !actOpen(z.act)) continue;
    const count = gemsArrivingAt(s, z.id);
    if (count) return { zone: z, count };
  }
  return null;
}

/** Buy a gem off the Gem shop's shelf; the shelf never sells out. */
export function buyGem(s: GameState, ctx: Ctx, gemId: string): string | null {
  const offer = gemShopOffers(s).find((o) => (o.gemId ?? o.supportId) === gemId);
  if (!offer) return 'Not on sale';
  if (gemReqLevel(gemId) > characterLevel(s)) return `Needs level ${gemReqLevel(gemId)}`;
  if (!canAfford(s, { gold: offer.price })) return 'Not enough gold';
  payCost(s, { gold: offer.price });
  if (offer.gemId) s.account.gems.push(createSkillGem(s, offer.gemId));
  else s.account.supportGems.push(createSupportGem(s, offer.supportId!));
  ctx.emit({ t: 'info', text: `Bought ${offerName(offer)}`, tone: 'good' });
  return null;
}

/** Gold to restock every shop early; doubles with each paid restock until the next free one. */
export function rerollCost(s: GameState): number {
  return (20 + characterLevel(s) * 6) * 2 ** (s.vendor.rerolls ?? 0);
}

/** A paid restock keeps the free-restock timer, so the price only resets when it comes round. */
export function rerollVendor(s: GameState, ctx: Ctx): string | null {
  const cost = rerollCost(s);
  if (!canAfford(s, { gold: cost })) return 'Not enough gold';
  payCost(s, { gold: cost });
  const { refreshAt, rerolls = 0 } = s.vendor;
  refreshVendor(s, ctx.rng);
  s.vendor.refreshAt = refreshAt;
  s.vendor.rerolls = rerolls + 1;
  return null;
}

export function vendorTick(s: GameState, rng: Rng, elapsed = 0, speed = 1): void {
  s.vendor.refreshAt -= elapsed * Math.max(0, speed - 1);
  if (s.clock >= s.vendor.refreshAt) refreshVendor(s, rng);
}

export function offerName(o: VendorOffer): string {
  if (o.item) return itemName(o.item);
  if (o.flask) return flaskName(o.flask);
  if (o.gemId) return activeGemDef(o.gemId).name;
  if (o.supportId) return supportGemDef(o.supportId).name;
  return `${o.qty ?? 1}× ${currencyDef(o.currencyId!).name}`;
}

export function buyOffer(s: GameState, ctx: Ctx, offerId: number): string | null {
  const offer = s.vendor.stock.find((o) => o.id === offerId);
  if (!offer) return 'Sold out';
  if (!canAfford(s, { gold: offer.price })) return 'Not enough gold';
  if (offer.kind === 'item' && bagFull(s)) return 'Inventory full';
  payCost(s, { gold: offer.price });
  if (offer.item) s.inventory.push(offer.item);
  else if (offer.flask) stashFlask(s, offer.flask);
  else if (offer.gemId) s.account.gems.push(createSkillGem(s, offer.gemId));
  else if (offer.supportId) s.account.supportGems.push(createSupportGem(s, offer.supportId));
  else if (offer.currencyId) addBank(s, offer.currencyId, offer.qty ?? 1);
  ctx.emit({ t: 'info', text: `Bought ${offerName(offer)}`, tone: 'good' });
  s.vendor.stock = s.vendor.stock.filter((o) => o.id !== offerId);
  return null;
}

export function sellItems(s: GameState, ctx: Ctx, uids: number[]): number {
  const sold = takeOwned(s, uids);
  const gold = sold.reduce((a, i) => a + sellValue(i), 0);
  const n = sold.length;
  if (gold) {
    addBank(s, 'gold', gold);
    ctx.emit({ t: 'info', text: `Sold ${n} item(s) for ${gold} gold`, tone: 'good' });
  }
  return gold;
}

export function sellMaterial(s: GameState, ctx: Ctx, id: string, qty: number, value: number): void {
  const n = Math.min(qty, s.account.bank[id] ?? 0);
  if (n <= 0) return;
  s.account.bank[id] -= n;
  addBank(s, 'gold', n * value);
  ctx.emit({ t: 'info', text: `Sold ${n} for ${n * value} gold`, tone: 'good' });
}

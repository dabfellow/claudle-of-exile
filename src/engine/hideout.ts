import { BASES } from '../data/bases';
import { ACTIVE_GEMS, activeGemDef, SUPPORT_GEMS, supportGemDef } from '../data/gems';
import { STASH_CAPACITY, stationDef, VENDOR_REFRESH_MS, VENDOR_SLOTS, type StationId } from '../data/hideout';
import { currencyDef } from '../data/materials';
import { addBank, canAfford, payCost } from './bank';
import type { Ctx } from './context';
import { flaskName, flaskValue, rollFlask } from './flasks';
import { createSkillGem, createSupportGem } from './gems';
import { createItem, itemName, sellValue } from './items';
import { pick, rInt, type Rng } from './rng';
import type { GameState, Rarity, VendorOffer } from './types';
import { characterLevel } from './character';
import { isCraftLocked } from './crafting';

export function stationLevel(s: GameState, id: StationId): number {
  return s.hideout[id] ?? 1;
}

export function inventoryCapacity(s: GameState): number {
  return STASH_CAPACITY[stationLevel(s, 'stash') - 1];
}

export function inventoryFull(s: GameState): boolean {
  return s.inventory.length >= inventoryCapacity(s);
}

export function nextUpgradeCost(s: GameState, id: StationId): Record<string, number> | null {
  const def = stationDef(id);
  const lvl = stationLevel(s, id);
  return lvl >= def.levels.length ? null : def.levels[lvl].cost;
}

export function upgradeStation(s: GameState, ctx: Ctx, id: StationId): string | null {
  const cost = nextUpgradeCost(s, id);
  if (!cost) return 'Already at max level';
  if (!canAfford(s, cost)) return 'Not enough materials';
  payCost(s, cost);
  s.hideout[id] = stationLevel(s, id) + 1;
  ctx.emit({ t: 'info', text: `${stationDef(id).name} upgraded to level ${s.hideout[id]}`, tone: 'good' });
  if (id === 'vendor') refreshVendor(s, ctx.rng);
  return null;
}

// ---------- vendor ----------

export function refreshVendor(s: GameState, rng: Rng): void {
  const lvl = stationLevel(s, 'vendor');
  const slots = VENDOR_SLOTS[lvl - 1];
  const ilvl = Math.max(2, characterLevel(s) + 2);
  const stock: VendorOffer[] = [];
  let id = 1;
  const currencyPool = lvl >= 4 ? ['transmute', 'augment', 'alteration', 'regal', 'chaos', 'scour', 'regret'] : ['transmute', 'augment', 'alteration', 'scour', 'regret'];
  for (let i = 0; i < slots; i++) {
    const roll = rng.next();
    if (roll < 0.45) {
      const base = pick(rng, BASES.filter((b) => b.reqLevel <= ilvl));
      let rarity: Rarity = 'normal';
      const r2 = rng.next();
      if (lvl >= 3 && r2 < 0.2) rarity = 'rare';
      else if (lvl >= 2 && r2 < 0.55) rarity = 'magic';
      const item = createItem(s, base.id, ilvl, rarity, rng);
      stock.push({ id: id++, kind: 'item', item, price: sellValue(item) * 4 });
    } else if (roll < 0.62) {
      const flask = rollFlask(s, ilvl, rng);
      stock.push({ id: id++, kind: 'flask', flask, price: flaskValue(flask) * 4 });
    } else if (roll < 0.72) {
      const gem = pick(rng, ACTIVE_GEMS);
      stock.push({ id: id++, kind: 'gem', gemId: gem.id, price: 120 + ilvl * 10 });
    } else if (roll < 0.82) {
      const sup = pick(rng, SUPPORT_GEMS.filter((g) => !g.signatureFor || lvl >= 3));
      stock.push({ id: id++, kind: 'support', supportId: sup.id, price: (sup.signatureFor ? 260 : 90) + ilvl * 8 });
    } else {
      const c = currencyDef(pick(rng, currencyPool));
      const qty = c.value >= 30 ? 1 : rInt(rng, 2, 5);
      stock.push({ id: id++, kind: 'currency', currencyId: c.id, qty, price: Math.round(c.value * qty * 3) });
    }
  }
  s.vendor = { stock, refreshAt: s.clock + VENDOR_REFRESH_MS };
}

/** Gold to restock the trader early. */
export function rerollCost(s: GameState): number {
  return 20 + characterLevel(s) * 6;
}

export function rerollVendor(s: GameState, ctx: Ctx): string | null {
  const cost = rerollCost(s);
  if (!canAfford(s, { gold: cost })) return 'Not enough gold';
  payCost(s, { gold: cost });
  refreshVendor(s, ctx.rng);
  return null;
}

export function vendorTick(s: GameState, rng: Rng): void {
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
  if (offer.kind === 'item' && inventoryFull(s)) return 'Inventory full';
  payCost(s, { gold: offer.price });
  if (offer.item) s.inventory.push(offer.item);
  else if (offer.flask) s.flaskStash.push(offer.flask);
  else if (offer.gemId) s.gems.push(createSkillGem(s, offer.gemId));
  else if (offer.supportId) s.supportGems.push(createSupportGem(s, offer.supportId));
  else if (offer.currencyId) addBank(s, offer.currencyId, offer.qty ?? 1);
  ctx.emit({ t: 'info', text: `Bought ${offerName(offer)}`, tone: 'good' });
  s.vendor.stock = s.vendor.stock.filter((o) => o.id !== offerId);
  return null;
}

export function sellItems(s: GameState, ctx: Ctx, uids: number[]): number {
  const set = new Set(uids);
  let gold = 0;
  let n = 0;
  s.inventory = s.inventory.filter((i) => {
    if (!set.has(i.uid) || isCraftLocked(s, i.uid)) return true;
    gold += sellValue(i);
    n++;
    return false;
  });
  if (gold) {
    addBank(s, 'gold', gold);
    ctx.emit({ t: 'info', text: `Sold ${n} item(s) for ${gold} gold`, tone: 'good' });
  }
  return gold;
}

export function sellMaterial(s: GameState, ctx: Ctx, id: string, qty: number, value: number): void {
  const n = Math.min(qty, s.bank[id] ?? 0);
  if (n <= 0) return;
  s.bank[id] -= n;
  addBank(s, 'gold', n * value);
  ctx.emit({ t: 'info', text: `Sold ${n} for ${n * value} gold`, tone: 'good' });
}

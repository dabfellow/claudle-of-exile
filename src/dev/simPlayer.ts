/** Shared heuristic player for the command-line and desktop balance simulators. */
import { baseDef } from '../data/bases';
import { classDef } from '../data/classes';
import { activeGemDef, type GemTag } from '../data/gems';
import { PLAYER_SPOT } from '../engine/battlefield';
import { type StationId } from '../data/hideout';
import { PASSIVE_NODES } from '../data/passiveTree';
import { actionsFor, type SkillAction } from '../data/skills';
import { BOSS_FROSTBITE_MAX, monsterDamage, ZONES, zoneDef, type ZoneDef } from '../data/zones';
import { characterLevel } from '../engine/character';
import { canSpendLife, equipFlask, flaskRecoveryAmount, lockTarget, queueSkill, skillArea, useFlask } from '../engine/combat';
import type { Ctx } from '../engine/context';
import { applyOrb, benchBuilt, orbReason, salvage } from '../engine/crafting';
import { equip, equipReason, slotsFor } from '../engine/equipment';
import { chainFalloff, gemChains, gemUseReason, placeOnBar, removeFromBar, skillNumbers, skillSummary, socketSupport, supportReason, syncSockets, unsocketSupport, type SkillNumbers } from '../engine/gems';
import { flaskDef } from '../data/flasks';
import { enchantFlask, flaskStats } from '../engine/flasks';
import { buyGem, buyOffer, gemShopOffers, nextUpgradeCost, rerollCost, rerollVendor, sellItems, stationLevel } from '../engine/hideout';
import { pickUp } from '../engine/storage';
import { allocate, allocateReason } from '../engine/passives';
import { CULTURES, SITES } from '../data/expedition';
import { HEIST_JOBS, ROGUES } from '../data/heist';
import { expeditionOpen, setOrder, shelvesFor, siteStratum } from '../engine/expedition';
import { cleanChance, jobBlocker, rankUpRogue, rogueReason, setJobExit, startHeist } from '../engine/heist';
import { MEALS } from '../data/cooking';
import { RUNES } from '../data/runes';
import { cookingOpen, eatMeal } from '../engine/cooking';
import { inscribeRune, itemRune, runeReason, runesOpen } from '../engine/runes';
import { actionBlocker, skillLevel, startSkillAction } from '../engine/skills';
import { aimLockReason, cleansesFrostbite, ruleLockReason, suggestedRule } from '../engine/automation';
import { manaFraction, manaPowerMore } from '../engine/mechanics';
import { monsterGround } from '../engine/battlefield';
import { armourReduction, deriveStats, evadeChance, hitChance, type Derived } from '../engine/stats';
import type { FlaskInstance, GameState, GroundKind, InstillCondition, Item, SkillGemInstance, SkillId } from '../engine/types';
let WEAPON_ONLY = false;
let CASUAL_GEAR = false;
let INSTILL = true;
export function setPlayerPolicy(policy: { weaponOnly?: boolean; casualGear?: boolean; instill?: boolean }) {
 WEAPON_ONLY = !!policy.weaponOnly; CASUAL_GEAR = !!policy.casualGear; INSTILL = policy.instill !== false;
}
const BOT_FROSTBITE_AT = 5;
export const UPGRADES: [StationId, number][] = [['war_table', 2], ['watchtower', 2], ['war_table', 3], ['war_table', 4], ['war_table', 5], ['watchtower', 3], ['war_table', 6], ['war_table', 7], ['watchtower', 4]];

export function bestSkillDps(s: GameState, d: Derived): number {
  const pack = packOf(s);
  return Math.max(
    d.dps,
    ...[...s.skillBar, ...s.account.gems].map((g) => {
      // a skill the weapon can't use is worth nothing (and the bot keeps to its class's weapon type, see offWeapon)
      if (!g || gemUseReason(d.combatLevel, d.attributes, g, d.weaponFamily)) return 0;
      return gemValue(d, g, pack, s);
    }),
  );
}

export function score(s: GameState, d: Derived): number {
  const skillDps = bestSkillDps(s, d);
  if (CASUAL_GEAR) {
    return skillDps * 3 + d.maxLife + d.maxEs * 0.8 + d.armour * 0.15 + d.evasion * 0.15
      + (d.res.fire + d.res.cold + d.res.light) * 1.5 + d.lifeRegen * 5;
  }
  const typical = monsterDamage(d.combatLevel);
  const physicalTaken = 1 - armourReduction(d.armour, typical);
  const elementalTaken = (3 - (d.res.fire + d.res.cold + d.res.light) / 100) / 3;
  const avoidance = 1 - evadeChance(d.evasion, d.combatLevel);
  const block = 1 - Math.min(75, d.raw.blockChance) / 125; // not every hit is blockable
  const effectivePool = (d.maxLife + d.maxEs) / (Math.max(0.1, (physicalTaken + elementalTaken * 3) / 4) * avoidance * block);
  return skillDps * 2 + effectivePool * 2 + d.lifeRegen * 20;
}

export const ignoredArmour = (item: Item) => WEAPON_ONLY && baseDef(item.baseId).slot !== 'weapon';

/** Weapons are the damage decision; other slots are where a maintained character builds its defences. */
export function itemScore(s: GameState, item: Item): number {
  const d = deriveStats(s, []);
  return baseDef(item.baseId).slot === 'weapon' ? bestSkillDps(s, d) * 100 + score(s, d) : score(s, d);
}

export function candidateItemScore(before: GameState, after: GameState, item: Item): number {
  if (baseDef(item.baseId).slot === 'weapon') return itemScore(after, item);
  const oldDamage = bestSkillDps(before, deriveStats(before, []));
  const next = deriveStats(after, []);
  // Defence is not an upgrade if it unequips the weapon, breaks the main skill, or costs a large chunk of damage.
  if (!CASUAL_GEAR && bestSkillDps(after, next) < oldDamage * 0.999) return -Infinity;
  return score(after, next);
}

/** The state with `item` worn in `slot`, the way equip() makes the swap: two-handers and off hands push each other out. */
export function wearing(s: GameState, item: Item, slot: ReturnType<typeof slotsFor>[number]): GameState {
  const equipment = { ...s.equipment, [slot]: item };
  if (slot === 'weapon' && baseDef(item.baseId).twoHanded) delete equipment.offhand;
  if (slot === 'offhand' && s.equipment.weapon && baseDef(s.equipment.weapon.baseId).twoHanded) delete equipment.weapon;
  return { ...s, equipment };
}

/** The Strength weapons: a class that starts on one wears whichever of them is best, as a player would. */
export const STR_WEAPONS = new Set(['sword', 'axe', 'mace']);

/**
 * A weapon the class doesn't fight with. A class should get by on its own weapons, so the bot never crosses over: a
 * Duelist that picks up a wand turns into a Mage, and the sim stops measuring Duelists. Strength classes may wear any
 * sword, axe or mace; the rest keep to the type they start with.
 */
export function offWeapon(s: GameState, item: Item): boolean {
  const start = classDef(s.character.classId).kit.weapon;
  const family = baseDef(item.baseId).family;
  if (!family || !start) return false;
  const home = baseDef(start).family!;
  return STR_WEAPONS.has(home) ? !STR_WEAPONS.has(family) : family !== home;
}

/** Score after putting `item` in its best slot. */
export function scoreWith(s: GameState, item: Item): number {
  return Math.max(...slotsFor(item).map((slot) => candidateItemScore(s, wearing(s, item, slot), item)));
}

/**
 * Spend gold in Town: any gem it doesn't own yet (gems rarely drop now), then, with the next upgrade's gold
 * set aside, any gear that's an upgrade; with spare gold and nothing worth buying, restock.
 */
export function shop(s: GameState, ctx: Ctx) {
  let bought = false;
  const spare = () => (s.account.bank.gold ?? 0) - (nextUpgrade(s)?.cost.gold ?? 0);
  const owned = new Set([...s.skillBar, ...s.account.gems].filter(Boolean).map((g) => g!.gemId));
  const ownedSupports = new Set(s.account.supportGems.map((g) => g.supportId));
  for (const offer of gemShopOffers(s)) {
    const newGem = (offer.gemId && !owned.has(offer.gemId)) || (offer.supportId && !ownedSupports.has(offer.supportId));
    if (newGem && offer.price * 2 <= (s.account.bank.gold ?? 0) && !buyGem(s, ctx, (offer.gemId ?? offer.supportId)!)) bought = true;
  }
  for (const offer of [...s.vendor.stock]) {
    if (offer.kind !== 'item' || !offer.item || ignoredArmour(offer.item) || offer.price > spare() || equipReason(s, offer.item) || offWeapon(s, offer.item)) continue;
    const base = itemScore(s, offer.item);
    // worth it if it beats what's worn by a clear margin (~1% of the current score)
    if (scoreWith(s, offer.item) - base > Math.max(5, base * 0.01) && !buyOffer(s, ctx, offer.id)) bought = true;
  }
  if (!bought && spare() > rerollCost(s) * 20) rerollVendor(s, ctx);
}

export const scoreOf = (s: GameState) => score(s, deriveStats(s, []));

export function upgradeGear(s: GameState, ctx: Ctx) {
  // an offline haul can outnumber the bag, so it gets sorted a bagful at a time
  do sortBag(s, ctx);
  while (s.offlineHaul.length);
}

export function sortBag(s: GameState, ctx: Ctx) {
  // the bot picks up everything; it salvages the bag down below
  pickUp(s, ctx, 'ground', s.ground.map((i: Item) => i.uid));
  pickUp(s, ctx, 'offlineHaul', s.offlineHaul.map((i: Item) => i.uid));
  for (const item of [...s.inventory]) {
    if (ignoredArmour(item) || equipReason(s, item) || offWeapon(s, item)) continue;
    const base = itemScore(s, item);
    let best: { slot: ReturnType<typeof slotsFor>[number]; gain: number } | null = null;
    for (const slot of slotsFor(item)) {
      const gain = candidateItemScore(s, wearing(s, item, slot), item) - base;
      if (gain > 1 && (!best || gain > best.gain)) best = { slot, gain };
    }
    if (best) equip(s, ctx, item.uid, best.slot);
  }
  // salvage needs a built Crafting Bench, which the bot never gathers for: it sells the spares in Town instead
  if (s.inventory.length > 25 || s.offlineHaul.length) {
    const uids = s.inventory.map((i: Item) => i.uid);
    if (benchBuilt(s)) salvage(s, ctx, uids);
    else sellItems(s, ctx, uids);
  }
}

/** A gem's damage per second as the bot judges it: attacks scaled by the chance to hit monsters of its level. */
export function gemDps(d: Derived, gem: SkillGemInstance, s?: GameState): number {
  const sum = skillSummary(d, gem);
  const { tags } = sum.nums.def;
  let dps = sum.perSecond * (tags.includes('attack') && !tags.includes('heavy') ? hitChance(d.accuracy, d.combatLevel) : 1);
  if (s && tags.includes('spell')) dps *= 1 + manaPowerMore(s, d, manaFraction(s, d)) / 100;
  return dps;
}

/**
 * About how many of a pack one use hits, by where it lands. Monsters crowd round you, so a wide nova catches most
 * of them; minions and storms count their own strikes in their damage already.
 */
export function enemiesHit(nums: SkillNumbers, pack: number): number {
  const e = nums.def.effect;
  if (e.minion) return 1;
  if (e.targets === 'chain') {
    // each hop deals less than the last, so count what the reachable enemies take, not how many there are
    const n = Math.floor(Math.min(pack, 1 + gemChains(nums.def, nums.level) + nums.mods.chains));
    return [...Array(n).keys()].reduce((sum, hop) => sum + chainFalloff(hop), 0);
  }
  const r = e.radius ?? 1;
  const reach = { target: 1, arc: 2, beam: 2, splash: r >= 2 ? 3.5 : 2.5, nova: r >= 2 ? pack * 0.8 : 2.5, field: pack }[skillArea(nums)];
  return Math.max(1, Math.min(pack, reach));
}

/** The average pack where the character fights: the area it's in, else the furthest one open. */
export function packOf(s: GameState, zoneId = s.combat?.zoneId ?? s.unlockedZones.at(-1)): number {
  const z = zoneId ? zoneDef(zoneId) : undefined;
  return z ? (z.packSize[0] + z.packSize[1]) / 2 : 3;
}

/** What a gem is worth to the bot: half for bosses (one target), half for clearing packs (everything it hits). */
export function gemValue(d: Derived, gem: SkillGemInstance, pack: number, s?: GameState): number {
  return (gemDps(d, gem, s) * (1 + enemiesHit(skillNumbers(d, gem), pack))) / 2;
}

export const DAMAGE_ROLES = new Set(['main', 'burst', 'area', 'summon']);

/** The ground this area's boss lays with Scorched earth, if it does. */
export function scorchGround(zoneId: string | undefined): GroundKind | undefined {
  const boss = zoneId ? zoneDef(zoneId).boss : undefined;
  return boss?.mechanics?.includes('scorch') ? monsterGround(boss, boss.novaType ?? boss.dmgType) : undefined;
}

/** A skill that stops a channel for certain, and any boss here that needs one. */
export function channelBreaker(all: SkillGemInstance[], zoneId: string | undefined): SkillGemInstance | undefined {
  return zoneId && zoneDef(zoneId).boss.mechanics?.includes('channel') ? all.find((g) => activeGemDef(g.gemId).effect.interrupts) : undefined;
}

export const frostbiteZone = (zoneId: string | undefined) => !!zoneId && !!zoneDef(zoneId).boss.mechanics?.includes('frostbite');

/**
 * Like a player who reads tooltips: a slot each for single target, clearing packs, defence, a buff and a curse, and
 * a sixth for what the fight needs (damage judged bare, so a fresh drop isn't blinded by the old gem's supports), each on its suggested rule;
 * a spare guard, once Ground rules are in, takes a free slot against Scorched earth, as the main one is kept for wind-ups;
 * once Aim rules are in, its damage skills go for martyrs; where a boss channels, its interrupt goes on a channel rule and
 * nothing else; then the strongest support in every socket, damage skills first.
 */
export function manageSkills(s: GameState, zoneId = s.combat?.zoneId) {
  const d = deriveStats(s, []);
  // the best copy of each gem it owns and meets the attribute for: highest level wins
  const owned = new Map<string, SkillGemInstance>();
  for (const g of [...s.skillBar.filter((x): x is SkillGemInstance => !!x), ...s.account.gems]) {
    if (gemUseReason(d.combatLevel, d.attributes, g, d.weaponFamily)) continue;
    const have = owned.get(g.gemId);
    if (!have || g.level > have.level) owned.set(g.gemId, g);
  }
  const all = [...owned.values()];
  const role = (g: SkillGemInstance) => activeGemDef(g.gemId).role;
  const pack = packOf(s, zoneId);
  const bare = (g: SkillGemInstance) => gemValue(d, { ...g, supports: g.supports.map(() => null) }, pack, s);
  const byLevel = (a: SkillGemInstance, b: SkillGemInstance) => b.level - a.level;
  const tagged = (g: SkillGemInstance, tag: GemTag) => activeGemDef(g.gemId).tags.includes(tag);
  const pick = (r: string) => all.filter((g) => role(g) === r).sort(byLevel)[0];
  const strongest = all.filter((g) => DAMAGE_ROLES.has(role(g)) && bare(g) > 0).sort((a, b) => bare(b) - bare(a));
  // one slot each for single target (bosses) and clearing packs (what it hits across a pack)
  const single = [...strongest].sort((a, b) => gemDps(d, { ...b, supports: [] }, s) - gemDps(d, { ...a, supports: [] }, s))[0];
  const clear = strongest.find((g) => g !== single && enemiesHit(skillNumbers(d, g), pack) >= 2);
  const damage = [single, clear].filter((g): g is SkillGemInstance => !!g);
  const mover = strongest.find((g) => tagged(g, 'movement'));
  // casters keep a mana skill when their damage costs mana (Transfusion is none: it comes for bleeders below)
  const caster = damage.some((g) => !tagged(g, 'attack'));
  const sustain = caster ? all.filter((g) => role(g) === 'sustain' && !activeGemDef(g.gemId).effect.consumeBleed).sort(byLevel)[0] : undefined;
  const bleeder = damage.some((g) => tagged(g, 'bleed'));
  const transfusion = bleeder ? all.find((g) => activeGemDef(g.gemId).effect.consumeBleed) : undefined;
  // a buff the build can use (spell buffs do nothing for attackers), and the curse that suits its damage
  const buff = all.filter((g) => role(g) === 'buff' && (caster || !tagged(g, 'spell'))).sort((a, b) => Number(tagged(b, 'spell')) - Number(tagged(a, 'spell')) || byLevel(a, b))[0];
  const curse = all.find((g) => g.gemId === (bleeder ? 'stigmata' : damage.some((x) => tagged(x, 'heavy')) ? 'burden' : caster ? 'elemental_weakness' : 'vulnerability')) ?? all.find((g) => g.gemId === (caster ? 'elemental_weakness' : 'vulnerability')) ?? pick('curse');
  const scorch = ruleLockReason(s, 'onGround') ? undefined : scorchGround(zoneId);
  const groundGuard = scorch && all.filter((g) => role(g) === 'guard').sort(byLevel)[1];
  // Frostbite's rule goes on a spare cleansing skill when there is one: a spare guard, or the mover if nothing else can
  const cleansers = all.filter((g) => cleansesFrostbite(activeGemDef(g.gemId)) && g !== pick('guard') && g !== groundGuard).sort(byLevel);
  const frostGuard = !ruleLockReason(s, 'frostbite') && frostbiteZone(zoneId) ? cleansers.find((g) => role(g) === 'guard') ?? cleansers.find((g) => g === mover) : undefined;
  const breaker = ruleLockReason(s, 'enemyChannels') ? undefined : channelBreaker(all, zoneId);
  // five slots by job: single target, clear, defence, buff, debuff, left empty while nothing fills the job (no curses
  // before Act 2). The sixth goes to what this fight needs (an interrupt, a cleanse, a spare guard or a way out of
  // Scorched earth), else mana or bleed sustain, else a fast cut that stacks up for the big blow, else more damage
  // Rending Cut is a debuff too, so it holds that slot until a curse comes along
  const rend = all.filter((g) => activeGemDef(g.gemId).effect.rend).sort(byLevel)[0];
  const core = [single, clear, pick('guard'), buff, curse ?? rend];
  const stacker = all.filter((g) => activeGemDef(g.gemId).effect.buff?.maxStacks || activeGemDef(g.gemId).effect.rend).sort(byLevel)[0];
  const flex = [breaker, frostGuard, groundGuard, scorch ? mover : undefined, sustain, transfusion, stacker, ...strongest].find((g) => g && !core.includes(g));
  const want = [...core, flex].slice(0, s.skillBar.length);

  // put the bar together: anything leaving takes no supports with it
  const keep = new Set(want.map((g) => g?.uid));
  s.skillBar.forEach((g, i) => {
    if (!g || keep.has(g.uid)) return;
    g.supports.forEach((_, k) => unsocketSupport(s, g.uid, k));
    removeFromBar(s, i);
  });
  want.forEach((g, i) => {
    if (g && s.skillBar[i]?.uid !== g.uid) placeOnBar(s, g.uid, i);
  });

  // re-socket from scratch: damage skills pick the support that adds the most, the rest take any that fits
  const bar = s.skillBar.filter((x): x is SkillGemInstance => !!x);
  for (const g of bar) {
    // one rule each: the suggested one, or Whenever ready until the War Table teaches it
    g.rules = [g === breaker ? { when: 'enemyChannels' } : g === groundGuard ? { when: 'onGround', ground: scorch } : g === frostGuard ? { when: 'frostbite', value: BOT_FROSTBITE_AT } : suggestedRule(s, activeGemDef(g.gemId))];
    if (DAMAGE_ROLES.has(role(g)) && role(g) !== 'summon' && !aimLockReason(s)) g.rules[0].aim = 'martyrs';
    syncSockets(g);
    g.supports.forEach((_, k) => unsocketSupport(s, g.uid, k));
  }
  const order = [...bar].sort((a, b) => Number(DAMAGE_ROLES.has(role(b))) - Number(DAMAGE_ROLES.has(role(a))));
  for (const g of order) {
    for (let k = 0; k < g.supports.length; k++) {
      const fits = s.account.supportGems.filter((x) => !supportReason(g, x.supportId));
      if (!fits.length) break;
      let best = fits[0];
      if (DAMAGE_ROLES.has(role(g))) {
        let bestDps = -Infinity;
        for (const sup of fits) {
          const trial = { ...g, supports: g.supports.map((x, j) => (j === k ? sup : x)) };
          const v = gemValue(d, trial, pack, s);
          if (v > bestDps) {
            bestDps = v;
            best = sup;
          }
        }
      }
      socketSupport(s, g.uid, best.uid, k);
    }
  }
}

/** Belt: the strongest life and mana flask in slots 1–2, then Granite, Ruby and Quicksilver (attackers) or Diamond. */
export function manageFlasks(s: GameState) {
  const d = deriveStats(s, []);
  const pool = () => [...s.flaskSlots.filter((f): f is FlaskInstance => !!f), ...s.account.flaskStash];
  const strongest = (kind: 'life' | 'mana') =>
    pool()
      .filter((f) => flaskDef(f.flaskId).kind === kind)
      .sort((a, b) => flaskRecoveryAmount(d, b) - flaskRecoveryAmount(d, a))[0];
  const attacker = s.skillBar.some((g) => g && DAMAGE_ROLES.has(activeGemDef(g.gemId).role) && activeGemDef(g.gemId).tags.includes('attack'));
  const utility = ['granite', 'ruby', attacker ? 'quicksilver' : 'diamond', 'quicksilver', 'diamond'];
  const want: (FlaskInstance | undefined)[] = [strongest('life'), strongest('mana')];
  for (const id of utility) {
    if (want.length >= s.flaskSlots.length) break;
    const f = pool().find((x) => x.flaskId === id && !want.includes(x));
    if (f && !want.some((w) => w?.flaskId === id)) want.push(f);
  }
  want.forEach((f, i) => {
    if (f && s.flaskSlots[i]?.uid !== f.uid && s.account.flaskStash.includes(f)) equipFlask(s, f.uid, i);
  });
}

/**
 * Spend orbs on worn gear the obvious way: Alchemy (or Transmutation) on normal items, Augmentation then
 * Regal on magic ones, Exalted on rares with a free affix. Good enough to stop the bot hoarding orbs.
 */
export function craftGear(s: GameState, ctx: Ctx) {
  for (const item of Object.values(s.equipment)) {
    if (!item || ignoredArmour(item)) continue;
    const plan =
      item.rarity === 'normal' ? ['alchemy', 'transmute'] : item.rarity === 'magic' ? ['augment', 'regal'] : item.rarity === 'rare' ? ['exalted'] : [];
    for (const orb of plan) {
      if (!orbReason(s, orb, item.uid)) {
        applyOrb(s, ctx, orb, item.uid);
        break;
      }
    }
  }
}

export function spendPassives(s: GameState, ctx: Ctx) {
  for (;;) {
    const base = scoreOf(s);
    let pick: string | null = null;
    let bestGain = -Infinity;
    for (const n of PASSIVE_NODES) {
      // keystones are build-defining trade-offs the simple scorer can't judge, so the bot skips them
      if (n.kind === 'keystone' || allocateReason(s, n.id)) continue;
      // masteries: the bot always takes the first option
      const masteries = n.kind === 'mastery' ? { ...s.masteries, [n.id]: 0 } : s.masteries;
      const gain = scoreOf({ ...s, passives: [...s.passives, n.id], masteries }) - base;
      if (gain > bestGain) {
        bestGain = gain;
        pick = n.id;
      }
    }
    if (!pick || bestGain < 0) return;
    if (allocate(s, ctx, pick, 0)) return;
  }
}

/** Instilling Orbs go on whatever is on the belt: life when hurt, utility on a boss wind-up (or Frostbite in its areas), mana when low. */
export const INSTILL_FOR: Record<string, InstillCondition> = { life: 'lowLife', utility: 'bossCast', mana: 'lowMana' };

export function instillFlasks(s: GameState, ctx: Ctx) {
  if (!INSTILL) return;
  for (const f of s.flaskSlots) {
    if (!f || !s.account.bank.instill) continue;
    const kind = flaskDef(f.flaskId).kind;
    const want = kind === 'utility' && frostbiteZone(s.combat?.zoneId) ? 'frostbite' : INSTILL_FOR[kind];
    if (!f.instill || (f.instill === 'bossCast' && want === 'frostbite')) enchantFlask(s, ctx, f.uid, want);
  }
}

/** The next automation upgrade in UPGRADES, with what's still short of it. */
export function nextUpgrade(s: GameState): { id: StationId; cost: Record<string, number>; short: [string, number][] } | null {
  const next = UPGRADES.find(([id, lvl]) => stationLevel(s, id) < lvl);
  if (!next) return null;
  const cost = nextUpgradeCost(s, next[0])!;
  const short = Object.entries(cost)
    .filter(([id, n]) => id !== 'gold' && (s.account.bank[id] ?? 0) < n)
    .map(([id, n]): [string, number] => [id, n - (s.account.bank[id] ?? 0)]);
  return { id: next[0], cost, short };
}

export const GATHER_SKILLS: SkillId[] = ['mining', 'woodcutting', 'harvesting'];
export const GATHERING = GATHER_SKILLS.flatMap((sk) => actionsFor(sk).filter((a) => !a.inputs));

/** Items per second a node gives of a material, as its main output or a lucky bonus. */
export function nodeRate(a: SkillAction, mat: string): number {
  const main = (a.outputs?.[mat] ?? 0) * (a.outputChance ?? 1);
  const bonus = (a.bonus ?? []).filter((b) => b.id === mat).reduce((sum, b) => sum + b.chance * b.qty, 0);
  return (main + bonus) / (a.intervalMs / 1000);
}

/** The best open node for a material, or if every node for it is locked, the best one that levels towards them. */
export function nodeFor(s: GameState, mat: string): SkillAction | undefined {
  const open = (a: SkillAction) => !actionBlocker(s, a);
  const yields = GATHERING.filter((a) => nodeRate(a, mat) > 0);
  const best = yields.filter(open).sort((a, b) => nodeRate(b, mat) - nodeRate(a, mat))[0];
  return best ?? GATHERING.filter((a) => a.skill === yields[0]?.skill && open(a)).at(-1);
}

/** What to gather: the material the next upgrade is shortest of, else the top node of the skill that lags. */
export function gatherJob(s: GameState): SkillAction | undefined {
  const short = [...(nextUpgrade(s)?.short ?? [])].sort((a, b) => b[1] - a[1]);
  for (const [mat] of short) {
    const node = nodeFor(s, mat);
    if (node) return node;
  }
  const lagging = [...GATHER_SKILLS].sort((a, b) => s.skills[a] - s.skills[b])[0];
  return GATHERING.filter((a) => a.skill === lagging && !actionBlocker(s, a)).at(-1);
}

/** The bot's job: the newest open one, walking out as deep as still comes off clean 40% of the time. */
export const HEIST_CLEAN = 0.4;
export function heistNight(s: GameState, ctx: Ctx): boolean {
  const open = HEIST_JOBS.filter((j) => !jobBlocker(s, j));
  const job = open.at(-1);
  if (!job) return false;
  for (const r of ROGUES) while (!rogueReason(s, r.id)) rankUpRogue(s, ctx, r.id);
  let exit = job.rooms;
  while (exit > 1 && cleanChance(s, job, exit) < HEIST_CLEAN) exit--;
  setJobExit(s, job.id, exit);
  return !startHeist(s, ctx, job.id);
}

/** Fill every empty rune slot, keeping to the family the bot wears most so Resonance builds up. */
export function fitRunes(s: GameState, ctx: Ctx): void {
  const worn = Object.values(s.equipment).filter((i): i is Item => !!i);
  const count = (family: string) => worn.filter((i) => itemRune(i)?.family.id === family).length;
  const best = [...RUNES].reverse().sort((a, b) => count(b.family.id) - count(a.family.id));
  for (const item of worn) {
    const rune = !item.rune && best.find((r) => !runeReason(s, r.id, item.uid));
    if (rune) inscribeRune(s, ctx, rune.id, item.uid);
  }
}

/** The night's carving: the best recipe it can pay for, or a node for what the best known recipe is short of. */
export function runeNight(s: GameState, ctx: Ctx): boolean {
  if (!runesOpen(s)) return false;
  fitRunes(s, ctx);
  return recipeNight(s, ctx, actionsFor('runecarving'));
}

/** Start the best of these recipes it can pay for, or a node for what the best known one is short of. */
export function recipeNight(s: GameState, ctx: Ctx, actions: SkillAction[]): boolean {
  const recipes = actions.filter((a) => skillLevel(s, a.skill) >= a.level);
  const ready = recipes.filter((a) => !actionBlocker(s, a)).at(-1);
  if (ready) return !startSkillAction(s, ctx, ready.id);
  const short = Object.entries(recipes.at(-1)!.inputs!).find(([id, n]) => (s.account.bank[id] ?? 0) < n);
  const node = short && nodeFor(s, short[0]);
  return !!node && !startSkillAction(s, ctx, node.id);
}

/** The night's dig: the shallowest open site, so standing keeps rising, with an order on each merchant's dearest open ware. */
export function expeditionNight(s: GameState, ctx: Ctx): boolean {
  if (!expeditionOpen(s)) return false;
  for (const c of CULTURES) {
    const best = shelvesFor(s, c.id).open.sort((a, b) => b.cost - a.cost)[0];
    if (best && s.expedition.orders[c.id] !== best.id) setOrder(s, best.id);
  }
  const open = SITES.filter((x) => skillLevel(s, 'archaeology') >= x.level);
  const site = [...open].reverse().sort((a, b) => siteStratum(s, a) - siteStratum(s, b))[0];
  return !!site && !startSkillAction(s, ctx, site.id);
}

/** The night's cooking: meals only, as the bot brews no flasks. It eats the best dish in the bank and keeps eating. */
export function cookNight(s: GameState, ctx: Ctx): boolean {
  if (!cookingOpen(s)) return false;
  const dish = MEALS.filter((m) => s.account.bank[m.id]).at(-1);
  if (dish) eatMeal(s, ctx, dish.id);
  return recipeNight(s, ctx, actionsFor('cooking').filter((a) => a.outputs && Object.keys(a.outputs)[0].startsWith('meal_')));
}

/** Areas open to the bot: unlocked, and within a level of its minimum. Unbeaten ones go last, so it pushes those and walks every branch. */
export function reachable(s: GameState): ZoneDef[] {
  const lvl = characterLevel(s);
  const open = ZONES.filter((z) => s.unlockedZones.includes(z.id) && (z === ZONES[0] || z.levelRange[0] <= lvl + 1));
  return [...open.filter((z) => s.bossesDefeated.includes(z.id)), ...open.filter((z) => !s.bossesDefeated.includes(z.id))];
}

/** What a player's hands add: clicking martyrs, drinking flasks when they're needed, pressing a guard as a boss winds up and an interrupt as it channels. */
export function hands(s: GameState, ctx: Ctx, d: Derived) {
  const alive = s.combat!.monsters.filter((m) => m.life > 0);
  const martyr = alive.find((m) => m.martyr);
  if (martyr && !alive.some((m) => m.martyr && m.uid === s.combat!.lockedUid)) lockTarget(s, martyr.uid);
  const costs = s.skillBar.filter((g) => g && DAMAGE_ROLES.has(activeGemDef(g.gemId).role)).map((g) => skillNumbers(d, g).manaCost);
  const casting = alive.some((m) => m.casting >= 0 && m.castKind !== 'channel');
  const channel = alive.some((m) => m.castKind === 'channel' && m.casting >= 0);
  const danger = casting || alive.some((m) => m.isBoss) || alive.length >= 4;
  s.flaskSlots.forEach((f, i) => {
    if (!f || s.combat?.buffs.some((b) => b.source === 'flask' && b.id === f.flaskId)) return;
    const kind = flaskDef(f.flaskId).kind;
    const low = (kind === 'life' && s.life < d.maxLife * 0.55) || (kind === 'mana' && (s.mana < d.maxMana * 0.35 || s.mana < Math.max(0, ...costs)));
    if (low || (kind === 'utility' && danger)) useFlask(s, ctx, i);
  });
  // step out of what's under you by hand, without waiting on a rule
  if (s.combat!.ground.some((g) => g.cell === PLAYER_SPOT)) {
    const step = s.skillBar.findIndex((g, i) => g && activeGemDef(g.gemId).tags.includes('movement') && !s.combat!.cooldowns[i]);
    if (step >= 0) queueSkill(s, step);
  }
  // shake off Frostbite before it freezes: a skill first, as flasks are for when they're needed
  if ((s.combat!.frostbite ?? 0) >= BOT_FROSTBITE_AT) {
    const shake = s.skillBar.findIndex((g, i) => g && cleansesFrostbite(activeGemDef(g.gemId)) && !s.combat!.cooldowns[i]);
    if (shake >= 0) queueSkill(s, shake);
    else if ((s.combat!.frostbite ?? 0) >= BOSS_FROSTBITE_MAX - 2) {
      const flask = s.flaskSlots.findIndex((f) => f && f.charges >= flaskStats(f).chargesPerUse);
      if (flask >= 0) useFlask(s, ctx, flask);
    }
  }
  if (channel) {
    const breaker = s.skillBar.findIndex((g, i) => g && activeGemDef(g.gemId).effect.interrupts && !s.combat!.cooldowns[i]);
    if (breaker >= 0) queueSkill(s, breaker);
  }
  if (casting) {
    // a hand on the button can spend past the reserve, but this one doesn't: a Blood Ward at low Life costs more than it saves
    const guard = s.skillBar.findIndex((g, i) => g && activeGemDef(g.gemId).role === 'guard' && !s.combat!.cooldowns[i] && canSpendLife(s, d, skillNumbers(d, g).lifeCost, false));
    if (guard >= 0) queueSkill(s, guard);
  }
}



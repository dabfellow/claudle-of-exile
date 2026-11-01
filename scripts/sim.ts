/**
 * Headless balance sim: a simple bot lives a dedicated player's days, visits and offline periods, earning the
 * War Table and Watchtower as it goes, and reports game time per milestone against docs/MILESTONES.md.
 *
 *   npm run sim                               # every class, seeds 1-3, push and mix, 30 days
 *   npm run sim -- --days 7 --class mage --seeds 1,2 --profile push --jobs 8
 *   npm run sim -- --nonstop --days 1         # never leaves the keyboard
 *   npm run sim -- --no-flee --no-instill     # auto-flee off, no Instilling Orbs spent
 *
 * The assumptions live at SCHEDULE and awayJob, and are written up in docs/design/BALANCE.md.
 */
import { spawn } from 'node:child_process';
import { baseDef } from '../src/data/bases';
import { CLASSES, type ClassId } from '../src/data/classes';
import { activeGemDef, type GemTag } from '../src/data/gems';
import { PLAYER_SPOT } from '../src/engine/battlefield';
import { stationDef, type StationId } from '../src/data/hideout';
import { PASSIVE_NODES } from '../src/data/passiveTree';
import { actionsFor, type SkillAction } from '../src/data/skills';
import { ACTS, actBossZone, actOpen, BOSS_FROSTBITE_MAX, ZONES, zoneDef, type ZoneDef } from '../src/data/zones';
import { characterLevel } from '../src/engine/character';
import { canSpendLife, equipFlask, flaskRecoveryAmount, lockTarget, queueSkill, startCombat, useFlask } from '../src/engine/combat';
import type { Ctx } from '../src/engine/context';
import { applyOrb, benchBuilt, orbReason, salvage } from '../src/engine/crafting';
import { equip, equipReason, slotsFor } from '../src/engine/equipment';
import { gemUseReason, placeOnBar, removeFromBar, skillNumbers, skillSummary, socketSupport, supportReason, syncSockets, unsocketSupport } from '../src/engine/gems';
import { flaskDef } from '../src/data/flasks';
import { enchantFlask, flaskStats } from '../src/engine/flasks';
import { buyOffer, nextUpgradeCost, rerollCost, rerollVendor, sellItems, stationLevel, upgradeStation } from '../src/engine/hideout';
import { simulateOffline } from '../src/engine/offline';
import { pickUp } from '../src/engine/storage';
import { allocate, allocateReason } from '../src/engine/passives';
import { seeded } from '../src/engine/rng';
import { HEIST_JOBS, ROGUES } from '../src/data/heist';
import { cleanChance, jobBlocker, rankUpRogue, rogueReason, setJobExit, startHeist } from '../src/engine/heist';
import { RUNES } from '../src/data/runes';
import { inscribeRune, itemRune, runeReason, runesOpen } from '../src/engine/runes';
import { actionBlocker, skillLevel, startSkillAction } from '../src/engine/skills';
import { aimLockReason, cleansesFrostbite, grantUnlocks, ruleLockReason, suggestedRule } from '../src/engine/automation';
import { groundFor } from '../src/engine/battlefield';
import { newGame, tick } from '../src/engine/state';
import { deriveStats, hitChance, type Derived } from '../src/engine/stats';
import type { FlaskInstance, GameEvent, GameState, GroundKind, InstillCondition, Item, SkillGemInstance, SkillId } from '../src/engine/types';
import { levelOf, xpToReach } from '../src/engine/xp';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const DAYS = Number(opt('days', '30'));
const IDLE = flag('idle');
const NONSTOP = flag('nonstop');
const FLEE = !flag('no-flee');
const INSTILL = !flag('no-instill');
const TRIALS = Number(opt('trials', '10'));
const ONLY = opt('class', '');
const SEEDS = opt('seeds', opt('seed', '1,2,3')).split(',').map(Number);
const PROFILES = opt('profile', 'push,mix').split(',') as Profile[];
const JOBS = Number(opt('jobs', '1'));
const TRACE = flag('trace');
const JSON_OUT = flag('json');

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * A dedicated player's day, in hours since their first login. Morning and lunch are the reset's typical visit
 * (check offline progress, sort loot, spend points, start something, dip), and the evening is a proper sit-down.
 * The very first login is a sit-down too, as it's a new game. That's 80 min a day, 2h10 on day 1.
 */
interface Play {
  atH: number;
  min: number;
}
const SCHEDULE = (day: number): Play[] =>
  NONSTOP ? [{ atH: 0, min: 24 * 60 }] : [{ atH: 0, min: day === 0 ? 60 : 10 }, { atH: 5, min: 10 }, { atH: 11, min: 60 }];

/**
 * Combat and skilling are one at a time, so each away period is a choice:
 * - push: combat, but the morning gap gathers while the next upgrade is short of materials.
 * - mix: the same, and every night gathers whether anything is short or not.
 * - heist: push, but every night from Act 2 on goes to Heist.
 * - runes: push, but every night from Act 3 on goes to Rune-carving, gathering whatever the best recipe is short of.
 */
type Profile = 'push' | 'mix' | 'heist' | 'runes';
const gathersAway = (profile: Profile, period: number, short: boolean) => (period === 0 && short) || (period === 2 && profile === 'mix');

/** The order the bot buys automation in: rules before hours, as rules are what bosses are locked behind. */
const UPGRADES: [StationId, number][] = [
  ['war_table', 2], ['watchtower', 2], ['war_table', 3], ['war_table', 4], ['war_table', 5], ['watchtower', 3], ['war_table', 6], ['war_table', 7], ['watchtower', 4],
];
const CHECKPOINTS: [string, number][] = [['day 1', 1], ['week 1', 7], ['month 1', 30], ['month 3', 90]];
/** bosses tested for idling, one per drop tier band: each right after the bot first beats it */
const TRIAL_ZONES = ['brinecaves', 'blackreed', 'shipgrave', 'sanctum', 'cinderroad', 'kurgans', 'pyretemple', 'burningthrone', 'inquisition', 'highaltar', 'howlingfells', 'giantsthrone'];

/** the bot answers Frostbite at this many stacks, by rule or by hand */
const BOT_FROSTBITE_AT = 5;

const fmt = (ms: number | undefined) => {
  if (ms === undefined || !Number.isFinite(ms)) return '—';
  const m = Math.round(ms / MIN);
  if (m >= 48 * 60) return `${Math.floor(m / 1440)}d${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}h`;
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};

/**
 * How much the bot values a character's stats: its best damage skill's output (attacks scaled by the
 * chance to hit monsters of its level), life, energy shield and defences.
 */
function score(s: GameState, d: Derived): number {
  const hit = hitChance(d.accuracy, d.combatLevel);
  const skillDps = Math.max(
    d.dps,
    ...s.skillBar.map((g) => {
      // a skill the weapon can't use is worth nothing, so the bot won't swap to a weapon that turns its bar off
      if (!g || gemUseReason(d.combatLevel, d.attributes, g, d.weaponFamily)) return 0;
      const sum = skillSummary(d, g);
      return sum.perSecond * (sum.nums.def.tags.includes('attack') ? hit : 1);
    }),
  );
  return (
    skillDps * 3 + d.maxLife + d.maxEs * 0.8 + d.armour * 0.15 + d.evasion * 0.15 + (d.res.fire + d.res.cold + d.res.light) * 1.5 + d.lifeRegen * 5
  );
}

/** The state with `item` worn in `slot`, the way equip() makes the swap: two-handers and off hands push each other out. */
function wearing(s: GameState, item: Item, slot: ReturnType<typeof slotsFor>[number]): GameState {
  const equipment = { ...s.equipment, [slot]: item };
  if (slot === 'weapon' && baseDef(item.baseId).twoHanded) delete equipment.offhand;
  if (slot === 'offhand' && s.equipment.weapon && baseDef(s.equipment.weapon.baseId).twoHanded) delete equipment.weapon;
  return { ...s, equipment };
}

/** Score after putting `item` in its best slot. */
function scoreWith(s: GameState, item: Item): number {
  return Math.max(...slotsFor(item).map((slot) => scoreOf(wearing(s, item, slot))));
}

/**
 * Spend gold in Town: any gem it doesn't own yet (gems rarely drop now), then, with the next upgrade's gold
 * set aside, any gear that's an upgrade; with spare gold and nothing worth buying, restock.
 */
function shop(s: GameState, ctx: Ctx) {
  const base = scoreOf(s);
  let bought = false;
  const spare = () => (s.bank.gold ?? 0) - (nextUpgrade(s)?.cost.gold ?? 0);
  const owned = new Set([...s.skillBar, ...s.gems].filter(Boolean).map((g) => g!.gemId));
  const ownedSupports = new Set(s.supportGems.map((g) => g.supportId));
  for (const offer of [...s.vendor.stock]) {
    const newGem = (offer.gemId && !owned.has(offer.gemId)) || (offer.supportId && !ownedSupports.has(offer.supportId));
    if (newGem && offer.price * 2 <= (s.bank.gold ?? 0) && !buyOffer(s, ctx, offer.id)) bought = true;
  }
  for (const offer of [...s.vendor.stock]) {
    if (offer.kind !== 'item' || !offer.item || offer.price > spare() || equipReason(s, offer.item)) continue;
    // worth it if it beats what's worn by a clear margin (~1% of the current score)
    if (scoreWith(s, offer.item) - base > Math.max(5, base * 0.01) && !buyOffer(s, ctx, offer.id)) bought = true;
  }
  if (!bought && spare() > rerollCost(s) * 20) rerollVendor(s, ctx);
}

const scoreOf = (s: GameState) => score(s, deriveStats(s, []));

function upgradeGear(s: GameState, ctx: Ctx) {
  // an offline haul can outnumber the bag, so it gets sorted a bagful at a time
  do sortBag(s, ctx);
  while (s.offlineHaul.length);
}

function sortBag(s: GameState, ctx: Ctx) {
  // the bot picks up everything; it salvages the bag down below
  pickUp(s, ctx, 'ground', s.ground.map((i: Item) => i.uid));
  pickUp(s, ctx, 'offlineHaul', s.offlineHaul.map((i: Item) => i.uid));
  for (const item of [...s.inventory]) {
    if (equipReason(s, item)) continue;
    const base = scoreOf(s);
    let best: { slot: ReturnType<typeof slotsFor>[number]; gain: number } | null = null;
    for (const slot of slotsFor(item)) {
      const gain = scoreOf(wearing(s, item, slot)) - base;
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
function gemDps(d: Derived, gem: SkillGemInstance): number {
  const sum = skillSummary(d, gem);
  const { tags } = sum.nums.def;
  return sum.perSecond * (tags.includes('attack') && !tags.includes('heavy') ? hitChance(d.accuracy, d.combatLevel) : 1);
}

const DAMAGE_ROLES = new Set(['main', 'burst', 'area']);

/** The ground this area's boss lays with Scorched earth, if it does. */
function scorchGround(zoneId: string | undefined): GroundKind | undefined {
  const boss = zoneId ? zoneDef(zoneId).boss : undefined;
  return boss?.mechanics?.includes('scorch') ? groundFor(boss.novaType ?? boss.dmgType, boss.rime) : undefined;
}

const frostbiteZone = (zoneId: string | undefined) => !!zoneId && !!zoneDef(zoneId).boss.mechanics?.includes('frostbite');

/**
 * Like a player who reads tooltips: the best guard and buff it owns, then its three strongest damage
 * skills (judged bare, so a fresh drop isn't blinded by the old gem's supports) and a curse, each on its suggested rule;
 * a spare guard, once Ground rules are in, takes a free slot against Scorched earth, as the main one is kept for wind-ups;
 * once Aim rules are in, its damage skills go for martyrs; then the strongest support in every socket, damage skills first.
 */
function manageSkills(s: GameState, zoneId = s.combat?.zoneId) {
  const d = deriveStats(s, []);
  // the best copy of each gem it owns and meets the attribute for: highest level wins
  const owned = new Map<string, SkillGemInstance>();
  for (const g of [...s.skillBar.filter((x): x is SkillGemInstance => !!x), ...s.gems]) {
    if (gemUseReason(d.combatLevel, d.attributes, g, d.weaponFamily)) continue;
    const have = owned.get(g.gemId);
    if (!have || g.level > have.level) owned.set(g.gemId, g);
  }
  const all = [...owned.values()];
  const role = (g: SkillGemInstance) => activeGemDef(g.gemId).role;
  const bare = (g: SkillGemInstance) => gemDps(d, { ...g, supports: g.supports.map(() => null) });
  const byLevel = (a: SkillGemInstance, b: SkillGemInstance) => b.level - a.level;
  const tagged = (g: SkillGemInstance, tag: GemTag) => activeGemDef(g.gemId).tags.includes(tag);
  const pick = (r: string) => all.filter((g) => role(g) === r).sort(byLevel)[0];
  const strongest = all.filter((g) => DAMAGE_ROLES.has(role(g)) && bare(g) > 0).sort((a, b) => bare(b) - bare(a));
  // the strongest movement skill always comes along: it's the way out of Scorched earth
  const mover = strongest.find((g) => tagged(g, 'movement'));
  const damage = [...new Set([...(mover ? [mover] : []), ...strongest])].slice(0, 3);
  // casters keep a mana skill when their damage costs mana (Transfusion is none: it comes for bleeders below)
  const caster = damage.some((g) => !tagged(g, 'attack'));
  const sustain = caster ? all.filter((g) => role(g) === 'sustain' && !activeGemDef(g.gemId).effect.consumeBleed).sort(byLevel)[0] : undefined;
  const bleeder = damage.some((g) => tagged(g, 'bleed'));
  const transfusion = bleeder ? all.find((g) => activeGemDef(g.gemId).effect.consumeBleed) : undefined;
  // a buff the build can use (spell buffs do nothing for attackers), and the curse that suits its damage
  const buff = all.filter((g) => role(g) === 'buff' && (caster || !tagged(g, 'spell'))).sort((a, b) => Number(tagged(b, 'spell')) - Number(tagged(a, 'spell')) || byLevel(a, b))[0];
  const curse = all.find((g) => g.gemId === (bleeder ? 'stigmata' : damage.some((x) => tagged(x, 'heavy')) ? 'burden' : caster ? 'elemental_weakness' : 'vulnerability')) ?? all.find((g) => g.gemId === (caster ? 'elemental_weakness' : 'vulnerability')) ?? pick('curse');
  // instant damage skills don't use up the turn, so any free slot gets the strongest of them on top
  const instant = all
    .filter((g) => DAMAGE_ROLES.has(role(g)) && activeGemDef(g.gemId).timeMs === 0 && !damage.includes(g) && bare(g) > 0)
    .sort((a, b) => bare(b) - bare(a));
  const scorch = ruleLockReason(s, 'onGround') ? undefined : scorchGround(zoneId);
  const groundGuard = scorch && all.filter((g) => role(g) === 'guard').sort(byLevel)[1];
  // Frostbite's rule goes on a spare cleansing skill when there is one: a spare guard, or the mover if nothing else can
  const cleansers = all.filter((g) => cleansesFrostbite(activeGemDef(g.gemId)) && g !== pick('guard') && g !== groundGuard).sort(byLevel);
  const frostGuard = !ruleLockReason(s, 'frostbite') && frostbiteZone(zoneId) ? cleansers.find((g) => role(g) === 'guard') ?? cleansers.find((g) => g === mover) : undefined;
  const want = [pick('guard'), buff, sustain, ...damage, transfusion, curse, groundGuard, frostGuard, ...instant].filter((g): g is SkillGemInstance => !!g).slice(0, s.skillBar.length);

  // put the bar together: anything leaving takes no supports with it
  const keep = new Set(want.map((g) => g.uid));
  s.skillBar.forEach((g, i) => {
    if (!g || keep.has(g.uid)) return;
    g.supports.forEach((_, k) => unsocketSupport(s, g.uid, k));
    removeFromBar(s, i);
  });
  want.forEach((g, i) => {
    if (s.skillBar[i]?.uid !== g.uid) placeOnBar(s, g.uid, i);
  });

  // re-socket from scratch: damage skills pick the support that adds the most, the rest take any that fits
  const bar = s.skillBar.filter((x): x is SkillGemInstance => !!x);
  for (const g of bar) {
    // one rule each: the suggested one, or Whenever ready until the War Table teaches it
    g.rules = [g === groundGuard ? { when: 'onGround', ground: scorch } : g === frostGuard ? { when: 'frostbite', value: BOT_FROSTBITE_AT } : suggestedRule(s, activeGemDef(g.gemId))];
    if (DAMAGE_ROLES.has(role(g)) && !aimLockReason(s)) g.rules[0].aim = 'martyrs';
    syncSockets(g);
    g.supports.forEach((_, k) => unsocketSupport(s, g.uid, k));
  }
  const order = [...bar].sort((a, b) => Number(DAMAGE_ROLES.has(role(b))) - Number(DAMAGE_ROLES.has(role(a))));
  for (const g of order) {
    for (let k = 0; k < g.supports.length; k++) {
      const fits = s.supportGems.filter((x) => !supportReason(g, x.supportId));
      if (!fits.length) break;
      let best = fits[0];
      if (DAMAGE_ROLES.has(role(g))) {
        let bestDps = -Infinity;
        for (const sup of fits) {
          const trial = { ...g, supports: g.supports.map((x, j) => (j === k ? sup : x)) };
          const v = gemDps(d, trial);
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
function manageFlasks(s: GameState) {
  const d = deriveStats(s, []);
  const pool = () => [...s.flaskSlots.filter((f): f is FlaskInstance => !!f), ...s.flaskStash];
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
    if (f && s.flaskSlots[i]?.uid !== f.uid && s.flaskStash.includes(f)) equipFlask(s, f.uid, i);
  });
}

/**
 * Spend orbs on worn gear the obvious way: Alchemy (or Transmutation) on normal items, Augmentation then
 * Regal on magic ones, Exalted on rares with a free affix. Good enough to stop the bot hoarding orbs.
 */
function craftGear(s: GameState, ctx: Ctx) {
  for (const item of Object.values(s.equipment)) {
    if (!item) continue;
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

function spendPassives(s: GameState, ctx: Ctx) {
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

/** Instilling Orbs go on whatever is on the belt: life when hurt, utility on a boss wind-up (or Frostbite in its areas), mana when full. */
const INSTILL_FOR: Record<string, InstillCondition> = { life: 'lowLife', utility: 'bossCast', mana: 'fullCharges' };

function instillFlasks(s: GameState, ctx: Ctx) {
  if (!INSTILL) return;
  for (const f of s.flaskSlots) {
    if (!f || !s.bank.instill) continue;
    const kind = flaskDef(f.flaskId).kind;
    const want = kind === 'utility' && frostbiteZone(s.combat?.zoneId) ? 'frostbite' : INSTILL_FOR[kind];
    if (!f.instill || (f.instill === 'bossCast' && want === 'frostbite')) enchantFlask(s, ctx, f.uid, want);
  }
}

/** The next automation upgrade in UPGRADES, with what's still short of it. */
function nextUpgrade(s: GameState): { id: StationId; cost: Record<string, number>; short: [string, number][] } | null {
  const next = UPGRADES.find(([id, lvl]) => stationLevel(s, id) < lvl);
  if (!next) return null;
  const cost = nextUpgradeCost(s, next[0])!;
  const short = Object.entries(cost)
    .filter(([id, n]) => id !== 'gold' && (s.bank[id] ?? 0) < n)
    .map(([id, n]): [string, number] => [id, n - (s.bank[id] ?? 0)]);
  return { id: next[0], cost, short };
}

const GATHER_SKILLS: SkillId[] = ['mining', 'woodcutting', 'harvesting'];
const GATHERING = GATHER_SKILLS.flatMap((sk) => actionsFor(sk).filter((a) => !a.inputs));

/** Items per second a node gives of a material, as its main output or a lucky bonus. */
function nodeRate(a: SkillAction, mat: string): number {
  const main = (a.outputs?.[mat] ?? 0) * (a.outputChance ?? 1);
  const bonus = (a.bonus ?? []).filter((b) => b.id === mat).reduce((sum, b) => sum + b.chance * b.qty, 0);
  return (main + bonus) / (a.intervalMs / 1000);
}

/** The best open node for a material, or if every node for it is locked, the best one that levels towards them. */
function nodeFor(s: GameState, mat: string): SkillAction | undefined {
  const open = (a: SkillAction) => !actionBlocker(s, a);
  const yields = GATHERING.filter((a) => nodeRate(a, mat) > 0);
  const best = yields.filter(open).sort((a, b) => nodeRate(b, mat) - nodeRate(a, mat))[0];
  return best ?? GATHERING.filter((a) => a.skill === yields[0]?.skill && open(a)).at(-1);
}

/** What to gather: the material the next upgrade is shortest of, else the top node of the skill that lags. */
function gatherJob(s: GameState): SkillAction | undefined {
  const short = [...(nextUpgrade(s)?.short ?? [])].sort((a, b) => b[1] - a[1]);
  for (const [mat] of short) {
    const node = nodeFor(s, mat);
    if (node) return node;
  }
  const lagging = [...GATHER_SKILLS].sort((a, b) => s.skills[a] - s.skills[b])[0];
  return GATHERING.filter((a) => a.skill === lagging && !actionBlocker(s, a)).at(-1);
}

/** The bot's job: the newest open one, walking out as deep as still comes off clean 40% of the time. */
const HEIST_CLEAN = 0.4;
function heistNight(s: GameState, ctx: Ctx): boolean {
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
function fitRunes(s: GameState, ctx: Ctx): void {
  const worn = Object.values(s.equipment).filter((i): i is Item => !!i);
  const count = (family: string) => worn.filter((i) => itemRune(i)?.family.id === family).length;
  const best = [...RUNES].reverse().sort((a, b) => count(b.family.id) - count(a.family.id));
  for (const item of worn) {
    const rune = !item.rune && best.find((r) => !runeReason(s, r.id, item.uid));
    if (rune) inscribeRune(s, ctx, rune.id, item.uid);
  }
}

/** The night's carving: the best recipe it can pay for, or a node for what the best known recipe is short of. */
function runeNight(s: GameState, ctx: Ctx): boolean {
  if (!runesOpen(s)) return false;
  fitRunes(s, ctx);
  const recipes = actionsFor('runecarving').filter((a) => skillLevel(s, 'runecarving') >= a.level);
  const ready = recipes.filter((a) => !actionBlocker(s, a)).at(-1);
  if (ready) return !startSkillAction(s, ctx, ready.id);
  const short = Object.entries(recipes.at(-1)!.inputs!).find(([id, n]) => (s.bank[id] ?? 0) < n);
  const node = short && nodeFor(s, short[0]);
  return !!node && !startSkillAction(s, ctx, node.id);
}

/** Areas open to the bot: unlocked, and within a level of its minimum. */
function reachable(s: GameState): ZoneDef[] {
  const lvl = characterLevel(s);
  return ZONES.filter((z) => s.unlockedZones.includes(z.id) && (z === ZONES[0] || z.levelRange[0] <= lvl + 1));
}

/** What a player's hands add: clicking martyrs, drinking flasks when they're needed, and pressing a guard as a boss winds up. */
function hands(s: GameState, ctx: Ctx, d: Derived) {
  const alive = s.combat!.monsters.filter((m) => m.life > 0);
  const martyr = alive.find((m) => m.martyr);
  if (martyr && !alive.some((m) => m.martyr && m.uid === s.combat!.lockedUid)) lockTarget(s, martyr.uid);
  const costs = s.skillBar.filter((g) => g && DAMAGE_ROLES.has(activeGemDef(g.gemId).role)).map((g) => skillNumbers(d, g).manaCost);
  const casting = alive.some((m) => m.casting >= 0);
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
  if (casting) {
    // a hand on the button can spend past the reserve, but this one doesn't: a Blood Ward at low Life costs more than it saves
    const guard = s.skillBar.findIndex((g, i) => g && activeGemDef(g.gemId).role === 'guard' && !s.combat!.cooldowns[i] && canSpendLife(s, d, skillNumbers(d, g).lifeCost, false));
    if (guard >= 0) queueSkill(s, guard);
  }
}

interface Snapshot {
  level: number;
  stages: number;
  zone: string;
  /** gear worn: rare + unique / magic / normal */
  gear: string;
  dps: number;
  life: number;
  warTable: number;
  watchtower: number;
}

type Outcome = { win: number; lose: number; timeout: number };
const VARIANTS = [
  { id: 'rules only', flee: false, instill: false, byHand: false },
  { id: 'ground rule', flee: false, instill: false, byHand: false, ground: true },
  { id: 'auto-flee', flee: true, instill: false, byHand: false },
  { id: 'instilled', flee: false, instill: true, byHand: false },
  { id: 'both', flee: true, instill: true, byHand: false },
  { id: 'by hand', flee: true, instill: false, byHand: true },
];

interface Result {
  classId: ClassId;
  seed: number;
  profile: Profile;
  levels: Record<number, number>;
  bosses: Record<string, number>;
  /** character level when each boss first fell */
  bossLevels: Record<string, number>;
  upgrades: Record<string, number>;
  checkpoints: Record<string, Snapshot>;
  /** per boss zone, per variant */
  trials: Record<string, Record<string, Outcome>>;
  deaths: number;
  offlineDeaths: number;
  kills: number;
  /** ms played by hand, spent fighting away, gathering away, and lost: to the offline cap or stopped dead */
  activeMs: number;
  awayCombatMs: number;
  awayGatherMs: number;
  cappedMs: number;
  stoppedMs: number;
  finalLevel: number;
  bank: Record<string, number>;
  bestDps: number;
  bestLife: number;
  skills: Record<string, number>;
  bar: string;
  orbsUsed: number;
  /** nights spent on Heist, and what came of them */
  heists: number;
  heistAlarms: number;
  runesWorn: number;
}

function snapshot(s: GameState): Snapshot {
  const d = deriveStats(s, []);
  const worn = Object.values(s.equipment).filter((i): i is Item => !!i);
  const count = (...r: string[]) => worn.filter((i) => r.includes(i.rarity)).length;
  const last = s.bossesDefeated.at(-1);
  return {
    level: characterLevel(s),
    stages: s.bossesDefeated.length,
    zone: last ? zoneDef(last).name : '-',
    gear: `${count('rare', 'unique')}/${count('magic')}/${count('normal')}`,
    dps: Math.round(d.dps),
    life: d.maxLife,
    warTable: stationLevel(s, 'war_table'),
    watchtower: stationLevel(s, 'watchtower'),
  };
}

/** Can this character leave this boss to its rules? Every variant fights it from full, flasks charged. */
function bossTrial(snap: GameState, zoneId: string, seed: number): Record<string, Outcome> {
  const out: Record<string, Outcome> = {};
  for (const v of VARIANTS) {
    const tally = (out[v.id] = { win: 0, lose: 0, timeout: 0 });
    for (let n = 0; n < TRIALS; n++) {
      const s = structuredClone(snap);
      if (!v.byHand) {
        grantUnlocks(s, { rules: ['vitals', 'status', 'windups', 'aim'] });
        s.account.automation.rules = s.account.automation.rules.filter((r) => r !== 'ground');
        if (v.ground) grantUnlocks(s, { rules: ['ground'] });
      }
      manageSkills(s, zoneId);
      s.settings.autoFlee = v.flee;
      s.settings.autoBoss = true;
      for (const f of s.flaskSlots) {
        if (!f) continue;
        f.instill = v.instill ? INSTILL_FOR[flaskDef(f.flaskId).kind] : null;
        f.charges = flaskStats(f).maxCharges;
      }
      const d0 = deriveStats(s, []);
      s.life = d0.maxLife;
      s.mana = d0.maxMana;
      s.es = d0.maxEs;
      s.zoneKills[zoneId] = zoneDef(zoneId).bossEvery;
      let done: keyof Outcome | null = null;
      const ctx: Ctx = {
        rng: seeded(seed * 1000 + n),
        now: 0,
        offline: !v.byHand,
        emit(e: GameEvent) {
          if (e.t === 'kill' && e.boss) done = 'win';
          if (e.t === 'death') done = 'lose';
        },
      };
      startCombat(s, ctx, zoneId);
      for (let t = 0; t < 600 && !done; t++) {
        if (v.byHand && s.combat) hands(s, ctx, deriveStats(s));
        tick(s, ctx, 1000);
      }
      tally[done ?? 'timeout']++;
    }
  }
  return out;
}

function runClass(classId: ClassId, seed: number, profile: Profile): Result {
  const s = newGame(seed, { name: 'Bot', classId });
  s.tutorial.done = true;
  s.settings.autoFlee = FLEE;
  s.settings.autoBoss = true;
  let now = 0;
  const res: Result = {
    classId, seed, profile, levels: {}, bosses: {}, bossLevels: {}, upgrades: {}, checkpoints: {}, trials: {}, deaths: 0, offlineDeaths: 0, kills: 0,
    activeMs: 0, awayCombatMs: 0, awayGatherMs: 0, cappedMs: 0, stoppedMs: 0, finalLevel: 1, bank: {}, bestDps: 0, bestLife: 0, skills: {}, bar: '', orbsUsed: 0, heists: 0, heistAlarms: 0, runesWorn: 0,
  };
  const deathStreak: Record<string, number> = {};
  const tally: Record<string, number> = {};
  let retreatUntil = 0;
  // a death away drops the bot an area for offline combat, until it has gained a couple of levels
  let awayBack = 0;
  let awayBackLevel = 0;
  const ctx: Ctx = {
    rng: seeded(seed * 31 + classId.length),
    now: 0,
    emit(e: GameEvent) {
      if (TRACE) {
        const key = e.t === 'hit' ? `hit-${e.target}` : e.t === 'death' ? `death${s.combat?.monsters.some((m) => m.isBoss && m.life > 0) ? '-boss' : ''}` : e.t;
        tally[key] = (tally[key] ?? 0) + 1;
      }
      if (e.t === 'levelup' && e.skill === 'combat') res.levels[e.level] ??= now;
      if (e.t === 'kill') {
        res.kills++;
        const zone = s.combat?.zoneId;
        // only beating the boss counts as getting past a wall: a boss fight's adds dying doesn't
        if (zone && e.boss) deathStreak[zone] = 0;
        if (e.boss && zone && res.bosses[zone] === undefined) {
          res.bosses[zone] = now;
          res.bossLevels[zone] = characterLevel(s);
        }
      }
      if (e.t === 'death') {
        res.deaths++;
        const zone = s.combat?.zoneId ?? '';
        deathStreak[zone] = (deathStreak[zone] ?? 0) + 1;
        if (deathStreak[zone] >= 3) {
          retreatUntil = now + 20 * MIN;
          deathStreak[zone] = 0;
        }
      }
    },
  };

  /** Bosses that fell away from the keyboard only show up as a list that got longer. */
  const noteAwayProgress = () => {
    const lvl = characterLevel(s);
    for (const z of s.bossesDefeated) {
      if (res.bosses[z] === undefined) {
        res.bosses[z] = now;
        res.bossLevels[z] = lvl;
      }
    }
    for (let l = 2; l <= lvl; l++) res.levels[l] ??= now;
  };

  const runTrials = () => {
    if (!TRIALS) return;
    for (const z of TRIAL_ZONES) {
      if (s.bossesDefeated.includes(z) && !res.trials[z]) res.trials[z] = bossTrial(s, z, seed);
    }
  };

  const buyUpgrades = () => {
    for (let next = nextUpgrade(s); next && !upgradeStation(s, ctx, next.id); next = nextUpgrade(s)) {
      res.upgrades[`${stationDef(next.id).name} ${stationLevel(s, next.id)}`] = now;
    }
  };

  /** A visit's chores, in the order a player does them. */
  const chores = (town: boolean) => {
    upgradeGear(s, ctx);
    buyUpgrades();
    if (town) {
      shop(s, ctx);
      craftGear(s, ctx);
    }
    spendPassives(s, ctx);
    manageSkills(s);
    manageFlasks(s);
    instillFlasks(s, ctx);
  };

  const play = (ms: number) => {
    const end = now + ms;
    for (let t = 0; now < end; now += 1000, t += 1000) {
      if (t % MIN === 0) chores(t % (10 * MIN) === 0);
      // like a sensible player: push the furthest unlocked zone you're roughly levelled for;
      // after 3 deaths without beating the zone's boss, farm the one below for 20 minutes
      const open = reachable(s);
      const top = open[open.length - 1];
      const target = now < retreatUntil && open.length > 1 ? open[open.length - 2] : top;
      if (s.action?.kind !== 'combat' || (s.combat && s.combat.zoneId !== target.id && !s.combat.monsters.length)) startCombat(s, ctx, target.id);
      if (s.combat && !IDLE) hands(s, ctx, deriveStats(s));
      tick(s, ctx, 1000);
      runTrials();
      if (TRACE && now % HOUR === 0 && now) {
        console.log('   ', Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v)}`).join(' · '));
        for (const k in tally) delete tally[k];
      }
    }
    res.activeMs += ms;
    // the last chores of the visit, before setting something going and leaving
    chores(true);
  };

  /** Leave something running for `ms`. */
  const away = (ms: number, period: number) => {
    const heisting = profile === 'heist' && period === 2 && heistNight(s, ctx);
    const carving = profile === 'runes' && period === 2 && runeNight(s, ctx);
    const job = !heisting && !carving && gathersAway(profile, period, !!nextUpgrade(s)?.short.length) ? gatherJob(s) : undefined;
    if (job) startSkillAction(s, ctx, job.id);
    else if (!heisting && !carving) {
      if (awayBack && characterLevel(s) >= awayBackLevel + 2) awayBack--;
      const open = reachable(s);
      const zone = open[Math.max(0, open.length - 1 - awayBack)];
      if (s.combat?.zoneId !== zone.id) startCombat(s, ctx, zone.id);
    }
    const sum = simulateOffline(s, ctx, ms);
    now += ms;
    s.clock += ms - sum.ms;
    res.kills += sum.kills;
    res.cappedMs += ms - sum.ms;
    if (job || heisting || carving) res.awayGatherMs += sum.ms;
    else if (sum.diedAfterMs === null) res.awayCombatMs += sum.ms;
    else {
      res.awayCombatMs += sum.diedAfterMs;
      res.stoppedMs += sum.ms - sum.diedAfterMs;
      res.deaths++;
      res.offlineDeaths++;
      awayBack = Math.min(awayBack + 1, 3);
      awayBackLevel = characterLevel(s);
    }
    noteAwayProgress();
    runTrials();
  };

  for (let day = 0; day < DAYS; day++) {
    const plays = SCHEDULE(day);
    plays.forEach((p, i) => {
      const at = day * DAY + p.atH * HOUR;
      if (at > now) away(at - now, i === 0 ? 2 : i - 1);
      for (const [name, days] of CHECKPOINTS) {
        if (now >= days * DAY && !res.checkpoints[name]) {
          chores(true);
          res.checkpoints[name] = snapshot(s);
        }
      }
      play(p.min * MIN);
    });
  }
  // the last night, up to the DAYS mark
  if (DAYS * DAY > now) away(DAYS * DAY - now, 2);
  for (const [name, days] of CHECKPOINTS) if (DAYS === days && !res.checkpoints[name]) res.checkpoints[name] = snapshot(s);

  const d = deriveStats(s, []);
  if (flag('debug')) {
    console.log(`  [${classId}] passives:`, s.passives.join(', '));
    console.log(`  [${classId}] bar:`, s.skillBar.map((g) => g && `${g.gemId}:${g.level}[${g.supports.filter(Boolean).map((x) => x!.supportId).join('+')}]`).join(' | '));
    console.log(`  [${classId}] gear:`, Object.entries(s.equipment).map(([k, i]) => `${k}=${i?.baseId}:${i?.rarity}`).join(' '));
    console.log(`  [${classId}] life ${d.maxLife} armour ${d.armour} res ${JSON.stringify(d.res)} dps ${d.dps.toFixed(0)}`);
  }
  res.finalLevel = characterLevel(s);
  res.bank = s.bank;
  res.bestDps = d.dps;
  res.bestLife = d.maxLife;
  res.skills = Object.fromEntries([...GATHER_SKILLS, 'thieving' as const, 'runecarving' as const].map((sk) => [sk, levelOf(sk, s.skills[sk])]));
  res.heists = s.heist.tally.jobs;
  res.heistAlarms = s.heist.tally.alarms;
  res.runesWorn = Object.values(s.equipment).filter((i) => i && itemRune(i)).length;
  res.bar = s.skillBar.map((g) => g && `${activeGemDef(g.gemId).name} ${g.level}`).filter(Boolean).join(', ');
  res.orbsUsed = s.lifetime.orbsUsed;
  return res;
}

/** Hours to reach skill levels if you always train the best unlocked node. */
function skillPace(skill: SkillId, targets: number[]): Record<number, number> {
  const actions = actionsFor(skill).filter((a) => !a.inputs);
  const out: Record<number, number> = {};
  let xp = 0;
  let t = 0;
  for (const target of targets) {
    while (levelOf(skill, xp) < target) {
      const lvl = levelOf(skill, xp);
      const a = actions.filter((x) => x.level <= lvl).at(-1)!;
      const nextBreak = Math.min(xpToReach(skill, target), xpToReach(skill, lvl + 1));
      const perSec = a.xp / (a.intervalMs / 1000);
      t += ((nextBreak - xp) / perSec) * 1000;
      xp = nextBreak;
    }
    out[target] = t;
  }
  return out;
}

// ---------- report ----------

const classes = CLASSES.filter((c) => !ONLY || c.id === ONLY);

/** Each run in its own process, so a full sweep can use every core. */
function runElsewhere(classId: ClassId, seed: number, profile: Profile): Promise<Result> {
  const pass = args.filter((a, i) => !['--jobs', '--class', '--seeds', '--seed', '--profile'].includes(a) && !['--jobs', '--class', '--seeds', '--seed', '--profile'].includes(args[i - 1]));
  const cmd = [process.argv[1], 'scripts/sim.ts', ...pass, '--json', '--class', classId, '--seeds', String(seed), '--profile', profile];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, cmd, { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (b) => (out += b));
    child.on('close', () => {
      const line = out.split('\n').find((l) => l.startsWith('{'));
      if (line) resolve(JSON.parse(line));
      else reject(new Error(`${classId} seed ${seed} ${profile} gave no result`));
    });
  });
}

async function sweep(): Promise<Result[]> {
  const queue = PROFILES.flatMap((p) => classes.flatMap((c) => SEEDS.map((seed) => ({ classId: c.id, seed, profile: p }))));
  if (JOBS <= 1) return queue.map((q) => runClass(q.classId, q.seed, q.profile));
  const results: Result[] = [];
  const worker = async () => {
    for (let q = queue.shift(); q; q = queue.shift()) {
      const started = Date.now();
      results.push(await runElsewhere(q.classId, q.seed, q.profile));
      console.error(`  ${q.profile} ${q.classId} seed ${q.seed} in ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
  };
  await Promise.all(Array.from({ length: JOBS }, worker));
  return results;
}

const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
};
const pad = (s: string, n = 11) => s.padEnd(n);

function report(results: Result[]) {
  for (const profile of PROFILES) {
    const byClass = classes.map((c) => results.filter((r) => r.profile === profile && r.classId === c.id));
    const header = (label: string, w: number) => console.log(pad(label, w) + classes.map((c) => pad(c.id)).join(''));
    /** the median seed, or — when most seeds never got there */
    const med = (runs: Result[], f: (r: Result) => number | undefined) => fmt(median(runs.map((r) => f(r) ?? Infinity)));

    console.log(`\n===== ${profile.toUpperCase()} (median of ${SEEDS.length} seed${SEEDS.length > 1 ? 's' : ''}) =====`);
    console.log('\nThe journey: stages cleared / level / gear worn as rare-magic-normal');
    header('', 10);
    for (const [name] of CHECKPOINTS) {
      if (!results.some((r) => r.checkpoints[name])) continue;
      const cell = (runs: Result[]) => {
        const snaps = runs.map((r) => r.checkpoints[name]).filter(Boolean).sort((a, b) => a.stages - b.stages || a.level - b.level);
        const m = snaps[Math.floor((snaps.length - 1) / 2)];
        const range = `${snaps[0].stages}-${snaps.at(-1)!.stages}`;
        return `${range}/${m.level}/${m.gear.split('/').join('-')}`;
      };
      console.log(pad(name, 10) + byClass.map((runs) => pad(cell(runs))).join(''));
    }

    console.log('\nTime to first boss kill');
    header('', 28);
    for (const z of ZONES) {
      if (!actOpen(z.act) || !results.some((r) => r.bosses[z.id] !== undefined)) continue;
      console.log(pad(`${z.act}. ${z.name}`, 28) + byClass.map((runs) => pad(med(runs, (r) => r.bosses[z.id]))).join(''));
    }

    console.log('\nTime to character level');
    header('', 10);
    for (const l of [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]) {
      if (results.some((r) => r.levels[l] !== undefined)) console.log(pad(String(l), 10) + byClass.map((runs) => pad(med(runs, (r) => r.levels[l]))).join(''));
    }

    console.log('\nTime to each upgrade');
    header('', 18);
    for (const [id, lvl] of UPGRADES) {
      const key = `${stationDef(id).name} ${lvl}`;
      console.log(pad(key, 18) + byClass.map((runs) => pad(med(runs, (r) => r.upgrades[key]))).join(''));
    }

    console.log(`\nAfter ${DAYS} days`);
    const row = (label: string, f: (r: Result) => number) => console.log(pad(label, 22) + byClass.map((runs) => pad(String(Math.round(median(runs.map(f)))))).join(''));
    const share = (label: string, f: (r: Result) => number) => row(`${label} %`, (r) => (100 * f(r)) / (DAYS * DAY));
    header('', 22);
    row('level', (r) => r.finalLevel);
    row('deaths', (r) => r.deaths);
    row('deaths offline', (r) => r.offlineDeaths);
    row('dps', (r) => r.bestDps);
    row('life', (r) => r.bestLife);
    row('kk gold', (r) => (r.bank.gold ?? 0) / 1000);
    row('chaos', (r) => r.bank.chaos ?? 0);
    row('orbs used', (r) => r.orbsUsed);
    if (profile === 'heist') {
      row('thieving', (r) => r.skills.thieving);
      row('heists', (r) => r.heists);
      row('alarms', (r) => r.heistAlarms);
      row('markers', (r) => r.bank.rogues_marker ?? 0);
      row('seals', (r) => r.bank.forgers_seal ?? 0);
      row('wax', (r) => r.bank.locksmiths_wax ?? 0);
    }
    if (profile === 'runes') {
      row('rune-carving', (r) => r.skills.runecarving);
      row('runes worn', (r) => r.runesWorn);
    }
    share('played', (r) => r.activeMs);
    share('away fighting', (r) => r.awayCombatMs);
    share('away gathering', (r) => r.awayGatherMs);
    share('lost to the cap', (r) => r.cappedMs);
    share('lost to dying', (r) => r.stoppedMs);

    const trials = results.filter((r) => r.profile === profile);
    if (Object.keys(trials[0]?.trials ?? {}).length || trials.some((r) => Object.keys(r.trials).length)) {
      console.log('\nLeaving a boss to its rules, just after first beating it: % won · lost · timed out, all classes');
      console.log(pad('', 24) + VARIANTS.map((v) => pad(v.id, 14)).join(''));
      for (const z of TRIAL_ZONES) {
        const cells = VARIANTS.map((v) => {
          const all = trials.flatMap((r) => (r.trials[z] ? [r.trials[z][v.id]] : []));
          const n = all.reduce((a, o) => a + o.win + o.lose + o.timeout, 0);
          const pct = (k: keyof Outcome) => (n ? Math.round((100 * all.reduce((a, o) => a + o[k], 0)) / n) : 0);
          return n ? `${pct('win')}·${pct('lose')}·${pct('timeout')}` : '—';
        });
        console.log(pad(zoneDef(z).name, 24) + cells.map((c) => pad(c, 14)).join(''));
      }
    }
    if (SEEDS.length === 1) {
      console.log('\nSkill bar at the end');
      for (const runs of byClass) for (const r of runs) console.log(`  ${pad(r.classId, 10)} ${r.bar}`);
    }
  }

  console.log('\nGathering pace (best node, no gear bonuses)');
  const SKILL_TARGETS = [15, 30, 45, 60, 75, 99];
  const PACED: SkillId[] = [...GATHER_SKILLS, 'thieving'];
  console.log(pad('level', 8) + PACED.map((x) => pad(x, 14)).join(''));
  const paces = PACED.map((sk) => skillPace(sk, SKILL_TARGETS));
  for (const l of SKILL_TARGETS) console.log(pad(String(l), 8) + paces.map((p) => pad(fmt(p[l]), 14)).join(''));
  console.log('');
  for (const act of ACTS.filter((a) => actOpen(a.n))) {
    const z = actBossZone(act.n);
    if (z) console.log(`Act ${act.n} complete (${z.boss.name}): ` + PROFILES.map((p) => `${p} ${fmt(median(results.filter((r) => r.profile === p).map((r) => r.bosses[z.id] ?? Infinity)))}`).join(' · '));
  }
  console.log('Targets (MILESTONES.md): day 1 a couple of Act 1 stages at most some blue gear; week 1 partway through Act 3; month 1 Act 6 done pushing, starting it on a mix.\n');
}

if (JSON_OUT) console.log(JSON.stringify(runClass(classes[0].id, SEEDS[0], PROFILES[0])));
else {
  const mode = NONSTOP ? 'nonstop' : 'dedicated schedule';
  console.log(`\nPath of Idle balance sim — ${DAYS} days, ${mode}, ${IDLE ? 'no hands' : 'hands on while playing'}, auto-flee ${FLEE ? 'on' : 'off'}, instilling ${INSTILL ? 'on' : 'off'}, seeds ${SEEDS.join(',')}`);
  report(await sweep());
}

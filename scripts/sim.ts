/**
 * Headless balance sim: a simple bot plays each class for a simulated day and reports
 * how long milestones take, so pacing can be tuned against the GDD targets.
 *
 *   npm run sim                  # all classes, 24h, active-flask bot
 *   npm run sim -- --hours 8 --idle --class mage
 */
import { baseDef } from '../src/data/bases';
import { CLASSES, type ClassId } from '../src/data/classes';
import { activeGemDef } from '../src/data/gems';
import { PASSIVE_NODES } from '../src/data/passiveTree';
import { actionsFor } from '../src/data/skills';
import { ACTS, actBossZone, actOpen, ZONES } from '../src/data/zones';
import { characterLevel } from '../src/engine/character';
import { equipFlask, flaskRecoveryAmount, startCombat, useFlask } from '../src/engine/combat';
import type { Ctx } from '../src/engine/context';
import { applyOrb, benchBuilt, orbReason, salvage } from '../src/engine/crafting';
import { equip, equipReason, slotsFor } from '../src/engine/equipment';
import { gemUseReason, placeOnBar, removeFromBar, skillNumbers, skillSummary, socketSupport, supportReason, syncSockets, unsocketSupport } from '../src/engine/gems';
import { flaskDef } from '../src/data/flasks';
import { buyOffer, rerollCost, rerollVendor, sellItems } from '../src/engine/hideout';
import { pickUp } from '../src/engine/storage';
import { allocate, allocateReason } from '../src/engine/passives';
import { seeded } from '../src/engine/rng';
import { newGame, tick } from '../src/engine/state';
import { deriveStats, hitChance, type Derived } from '../src/engine/stats';
import type { FlaskInstance, GameEvent, GameState, Item, SkillGemInstance, SkillId } from '../src/engine/types';
import { levelOf, xpToReach } from '../src/engine/xp';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const HOURS = Number(opt('hours', '24'));
const IDLE = flag('idle');
const ONLY = opt('class', '');
const SEED = Number(opt('seed', '7'));
const TRACE = flag('trace');

const fmt = (ms: number | undefined) => {
  if (ms === undefined) return '—';
  const m = Math.round(ms / 60000);
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
 * Spend gold in Town: any gem it doesn't own yet (gems rarely drop now), and any gear that's an upgrade;
 * with spare gold and nothing worth buying, restock.
 */
function shop(s: GameState, ctx: Ctx) {
  const base = scoreOf(s);
  let bought = false;
  const owned = new Set([...s.skillBar, ...s.gems].filter(Boolean).map((g) => g!.gemId));
  const ownedSupports = new Set(s.supportGems.map((g) => g.supportId));
  for (const offer of [...s.vendor.stock]) {
    const newGem = (offer.gemId && !owned.has(offer.gemId)) || (offer.supportId && !ownedSupports.has(offer.supportId));
    if (newGem && offer.price * 2 <= (s.bank.gold ?? 0) && !buyOffer(s, ctx, offer.id)) bought = true;
  }
  for (const offer of [...s.vendor.stock]) {
    if (offer.kind !== 'item' || !offer.item || offer.price > (s.bank.gold ?? 0) || equipReason(s, offer.item)) continue;
    // worth it if it beats what's worn by a clear margin (~1% of the current score)
    if (scoreWith(s, offer.item) - base > Math.max(5, base * 0.01) && !buyOffer(s, ctx, offer.id)) bought = true;
  }
  if (!bought && (s.bank.gold ?? 0) > rerollCost(s) * 20) rerollVendor(s, ctx);
}

const scoreOf = (s: GameState) => score(s, deriveStats(s, []));

function upgradeGear(s: GameState, ctx: Ctx) {
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
  if (s.inventory.length > 25) {
    const uids = s.inventory.map((i: Item) => i.uid);
    if (benchBuilt(s)) salvage(s, ctx, uids);
    else sellItems(s, ctx, uids);
  }
}

/** A gem's damage per second as the bot judges it: attacks scaled by the chance to hit monsters of its level. */
function gemDps(d: Derived, gem: SkillGemInstance): number {
  const sum = skillSummary(d, gem);
  return sum.perSecond * (sum.nums.def.tags.includes('attack') ? hitChance(d.accuracy, d.combatLevel) : 1);
}

const DAMAGE_ROLES = new Set(['main', 'burst', 'area']);

/**
 * Like a player who reads tooltips: the best guard and buff it owns, then its three strongest damage
 * skills (judged bare, so a fresh drop isn't blinded by the old gem's supports), each on its suggested rule;
 * then the strongest support in every socket, damage skills first.
 */
function manageSkills(s: GameState) {
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
  const pick = (r: string) => all.filter((g) => role(g) === r).sort(byLevel)[0];
  const damage = all.filter((g) => DAMAGE_ROLES.has(role(g)) && bare(g) > 0).sort((a, b) => bare(b) - bare(a)).slice(0, 3);
  // casters keep a mana skill when their damage costs mana
  const sustain = damage.some((g) => !activeGemDef(g.gemId).tags.includes('attack')) ? pick('sustain') : undefined;
  // instant damage skills don't use up the turn, so any free slot gets the strongest of them on top
  const instant = all
    .filter((g) => DAMAGE_ROLES.has(role(g)) && activeGemDef(g.gemId).timeMs === 0 && !damage.includes(g) && bare(g) > 0)
    .sort((a, b) => bare(b) - bare(a));
  const want = [pick('guard'), pick('buff'), sustain, ...damage, ...instant].filter((g): g is SkillGemInstance => !!g).slice(0, s.skillBar.length);

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
    if (g.rule.when === 'manual') g.rule = { ...activeGemDef(g.gemId).defaultRule };
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

interface Result {
  classId: ClassId;
  levels: Record<number, number>;
  bosses: Record<string, number>;
  /** character level when each boss first fell */
  bossLevels: Record<string, number>;
  deaths: number;
  kills: number;
  finalLevel: number;
  bank: Record<string, number>;
  bestDps: number;
  bestLife: number;
  /** seconds fighting with damage skills on the bar, and how many of them it couldn't afford any */
  fightSecs: number;
  starvedSecs: number;
  bar: string;
  orbsUsed: number;
}

function runClass(classId: ClassId): Result {
  const s = newGame(SEED, { name: 'Bot', classId });
  s.tutorial.done = true;
  let now = 0;
  const res: Result = { classId, levels: {}, bosses: {}, bossLevels: {}, deaths: 0, kills: 0, finalLevel: 1, bank: {}, bestDps: 0, bestLife: 0, fightSecs: 0, starvedSecs: 0, bar: '', orbsUsed: 0 };
  const deathStreak: Record<string, number> = {};
  const tally: Record<string, number> = {};
  let retreatUntil = 0;
  const ctx: Ctx = {
    rng: seeded(SEED * 31 + classId.length),
    now: 0,
    emit(e: GameEvent) {
      if (TRACE) {
        const key = e.t === 'hit' ? `hit-${e.target}` : e.t === 'death' ? `death${s.combat?.monsters.some((m) => m.isBoss && m.life > 0) ? '-boss' : ''}` : e.t;
        tally[key] = (tally[key] ?? 0) + 1;
        if (e.t === 'hit' && e.target === 'player' && !e.evaded && !e.blocked) {
          const src = e.monsterUid !== undefined ? s.combat?.monsters.find((m) => m.uid === e.monsterUid) : undefined;
          const k = `taken ${src ? src.name : '?'}`;
          tally[k] = (tally[k] ?? 0) + e.amount;
        }
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
          retreatUntil = now + 20 * 60_000;
          deathStreak[zone] = 0;
        }
      }
    },
  };

  const end = HOURS * 3600_000;
  for (now = 0; now < end; now += 1000) {
    if (now % 60_000 === 0) {
      if (now % 600_000 === 0) shop(s, ctx);
      upgradeGear(s, ctx);
      if (now % 600_000 === 0) craftGear(s, ctx);
      spendPassives(s, ctx);
      manageSkills(s);
      manageFlasks(s);
    }
    // like a sensible player: push the furthest unlocked zone you're roughly levelled for;
    // after 3 deaths without beating the zone's boss, farm the one below for 20 minutes
    const lvl = characterLevel(s);
    const unlocked = ZONES.filter((z) => s.unlockedZones.includes(z.id) && (z === ZONES[0] || z.levelRange[0] <= lvl + 1));
    const top = unlocked[unlocked.length - 1];
    const target = now < retreatUntil && unlocked.length > 1 ? unlocked[unlocked.length - 2] : top;
    if (!s.action || (s.combat && s.combat.zoneId !== target.id && !s.combat.monsters.length)) startCombat(s, ctx, target.id);
    if (s.combat) {
      const d = deriveStats(s);
      const alive = s.combat.monsters.filter((m) => m.life > 0);
      // out of mana: fighting, and short of every damage skill's cost
      const costs = s.skillBar.filter((g) => g && DAMAGE_ROLES.has(activeGemDef(g.gemId).role)).map((g) => skillNumbers(d, g).manaCost);
      if (alive.length && costs.length) {
        res.fightSecs++;
        if (s.mana < Math.min(...costs)) res.starvedSecs++;
      }
      if (!IDLE) {
        const casting = alive.some((m) => m.casting >= 0);
        const danger = casting || alive.some((m) => m.isBoss) || alive.length >= 4;
        s.flaskSlots.forEach((f, i) => {
          if (!f || s.combat?.buffs.some((b) => b.source === 'flask' && b.id === f.flaskId)) return;
          const kind = flaskDef(f.flaskId).kind;
          const low = (kind === 'life' && s.life < d.maxLife * 0.55) || (kind === 'mana' && (s.mana < d.maxMana * 0.35 || s.mana < Math.max(0, ...costs)));
          if (low || (kind === 'utility' && danger)) useFlask(s, ctx, i);
        });
      }
    }
    tick(s, ctx, 1000);
    if (TRACE && now % 3600_000 === 0 && now) {
      console.log('   ', Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v)}`).join(' · '));
      for (const k in tally) delete tally[k];
    }
    if (TRACE && now % 600_000 === 0) {
      const c = s.combat;
      console.log(`  ${fmt(now)} L${characterLevel(s)} ${c?.zoneId ?? '-'} kills ${res.kills} deaths ${res.deaths} gold ${s.bank.gold ?? 0} life ${Math.round(s.life)} mons ${c?.monsters.filter((m) => m.life > 0).map((m) => `${m.cell}`).join(',') ?? ''}`);
    }
  }
  const d = deriveStats(s, []);
  if (flag('debug')) {
    console.log(`  [${classId}] passives:`, s.passives.join(', '));
    console.log(`  [${classId}] masteries:`, JSON.stringify(s.masteries));
    console.log(`  [${classId}] bar:`, s.skillBar.map((g) => g && `${g.gemId}:${g.level}[${g.supports.filter(Boolean).map((x) => x!.supportId).join('+')}]`).join(' | '));
    console.log(`  [${classId}] gear:`, Object.entries(s.equipment).map(([k, i]) => `${k}=${i?.baseId}`).join(' '));
    console.log(`  [${classId}] attributes ${JSON.stringify(d.attributes)}`);
    console.log(`  [${classId}] skills:`, s.skillBar.map((g) => g && `${g.gemId} ${skillSummary(d, g).perSecond.toFixed(1)}/s`).filter(Boolean).join(' | '), `hit ${hitChance(d.accuracy, d.combatLevel).toFixed(2)} acc ${d.accuracy} evasion ${d.evasion} block ${d.blockChance}`);
    console.log(`  [${classId}] life ${d.maxLife} armour ${d.armour} res ${JSON.stringify(d.res)} dps ${d.dps.toFixed(0)}`);
  }
  res.finalLevel = characterLevel(s);
  res.bank = s.bank;
  res.bestDps = d.dps;
  res.bestLife = d.maxLife;
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

console.log(`\nPath of Idle balance sim — ${HOURS}h per class, ${IDLE ? 'IDLE (no manual flasks)' : 'ACTIVE (bot drinks flasks)'}, seed ${SEED}\n`);
const classes = CLASSES.filter((c) => !ONLY || c.id === ONLY);
const results = classes.map((c) => {
  const started = Date.now();
  const r = runClass(c.id);
  console.log(`  simulated ${c.name} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return r;
});

const LEVELS = [2, 5, 10, 15, 20, 22, 25, 28, 30];
const pad = (s: string, n = 12) => s.padEnd(n);
console.log('\nTime to character level');
console.log(pad('level', 8) + results.map((r) => pad(r.classId)).join(''));
for (const l of LEVELS) console.log(pad(String(l), 8) + results.map((r) => pad(fmt(r.levels[l]))).join(''));

console.log('\nTime to first boss kill (character level then)');
console.log(pad('zone', 30) + results.map((r) => pad(r.classId)).join(''));
for (const z of ZONES) {
  if (!actOpen(z.act)) continue;
  console.log(pad(`${z.name} (${z.boss.level})`, 30) + results.map((r) => pad(r.bosses[z.id] === undefined ? '—' : `${fmt(r.bosses[z.id])} L${r.bossLevels[z.id]}`)).join(''));
}

console.log('\nAfter the run');
const row = (label: string, f: (r: Result) => string) => console.log(pad(label, 22) + results.map((r) => pad(f(r))).join(''));
row('level', (r) => String(r.finalLevel));
row('kills', (r) => String(r.kills));
row('deaths', (r) => String(r.deaths));
row('dps / life', (r) => `${r.bestDps.toFixed(0)}/${r.bestLife}`);
row('gold', (r) => String(r.bank.gold ?? 0));
row('chaos / exalted', (r) => `${r.bank.chaos ?? 0}/${r.bank.exalted ?? 0}`);
row('transmute / alch', (r) => `${r.bank.transmute ?? 0}/${r.bank.alchemy ?? 0}`);
row('orbs used', (r) => String(r.orbsUsed));
row('out of mana', (r) => (r.fightSecs ? `${Math.round((r.starvedSecs / r.fightSecs) * 100)}%` : '—'));
console.log('\nSkill bar at the end');
for (const r of results) console.log(`  ${pad(r.classId, 10)} ${r.bar}`);

console.log('\nGathering pace (best node, no gear bonuses)');
const SKILL_TARGETS = [15, 30, 45, 60, 75, 99];
console.log(pad('level', 8) + ['mining', 'woodcutting', 'harvesting'].map((x) => pad(x, 14)).join(''));
const paces = (['mining', 'woodcutting', 'harvesting'] as SkillId[]).map((sk) => skillPace(sk, SKILL_TARGETS));
for (const l of SKILL_TARGETS) console.log(pad(String(l), 8) + paces.map((p) => pad(fmt(p[l]), 14)).join(''));

console.log('');
for (const act of ACTS.filter((a) => actOpen(a.n))) {
  const z = actBossZone(act.n);
  if (!z) continue;
  const at = (r: Result) => (r.bosses[z.id] === undefined ? '—' : `${fmt(r.bosses[z.id])} (L${r.bossLevels[z.id]})`);
  console.log(`Act ${act.n} complete (${z.boss.name}): ` + results.map((r) => `${r.classId} ${at(r)}`).join(' · '));
}
console.log('GDD targets: Act 1 done in ~1 day (6–10h active), each later act 3–7 days; level 100 and 99 skills in months.\n');

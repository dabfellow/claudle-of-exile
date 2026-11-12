/**
 * Headless balance sim: a simple bot lives a dedicated player's days, visits and offline periods, earning the
 * War Table and Watchtower as it goes, and reports game time per milestone against docs/MILESTONES.md.
 *
 *   npm run sim                               # every class, seeds 1-3, push and mix, 30 days
 *   npm run sim -- --days 7 --class mage --seeds 1,2 --profile push --jobs 8
 *   npm run sim -- --nonstop --days 1         # never leaves the keyboard
 *   npm run sim -- --no-flee --no-instill     # auto-flee off, no Instilling Orbs spent
 *   npm run sim -- --scenario act3Boss,midAct1 --minutes 30   # every class in a playtest scenario, side by side
 *
 * The assumptions live at SCHEDULE and awayJob, and are written up in docs/DEVELOPMENT.md.
 */
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { baseDef } from '../src/data/bases';
import { CLASSES, type ClassId } from '../src/data/classes';
import { ACTIVE_GEMS, activeGemDef, gemReqLevel, MAX_GEM_LEVEL, SUPPORT_GEMS, supportGemDef } from '../src/data/gems';
import { applySetup, PRESETS, setupZone } from '../src/dev/presets';
import { gemArrived } from '../src/engine/progress';

import { stationDef, type StationId } from '../src/data/hideout';

import { actionsFor } from '../src/data/skills';
import { ACTS, actBossZone, actOpen, ZONES, zoneDef } from '../src/data/zones';
import { characterLevel } from '../src/engine/character';
import { CLOSE_IN_MS, startCombat } from '../src/engine/combat';
import type { Ctx } from '../src/engine/context';

import { createSkillGem, createSupportGem, gemUseReason, gemXpForLevel } from '../src/engine/gems';
import { flaskDef } from '../src/data/flasks';
import { flaskStats } from '../src/engine/flasks';
import { stationLevel, upgradeStation } from '../src/engine/hideout';
import { simulateOffline } from '../src/engine/offline';


import { seeded } from '../src/engine/rng';







import { itemRune } from '../src/engine/runes';
import { startSkillAction } from '../src/engine/skills';
import { grantUnlocks } from '../src/engine/automation';


import { newGame, tick } from '../src/engine/state';
import { deriveStats } from '../src/engine/stats';
import type { GameEvent, GameState, Item, SkillGemInstance, SkillId } from '../src/engine/types';
import { charXpForLevel, levelOf, xpToReach } from '../src/engine/xp';

import { bestSkillDps, shop, upgradeGear, gemDps, DAMAGE_ROLES, manageSkills, manageFlasks, craftGear, spendPassives, INSTILL_FOR, instillFlasks, nextUpgrade, GATHER_SKILLS, gatherJob, heistNight, runeNight, expeditionNight, cookNight, reachable, hands, setPlayerPolicy } from '../src/dev/simPlayer';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const DAYS = Number(opt('days', '30'));
const IDLE = flag('idle');
const HANDS_EVERY = Math.max(1, Number(opt('hands-every', '1')));
/** Low-maintenance comparison: replace and craft weapons, but leave the starting armour and jewellery alone. */
const WEAPON_ONLY = flag('weapon-only');
/** Casual comparison: equip everything, but use the old damage-first valuation instead of building effective health. */
const CASUAL_GEAR = flag('casual-gear');
const NONSTOP = flag('nonstop');
const FLEE = !flag('no-flee');
const INSTILL = !flag('no-instill');
setPlayerPolicy({ weaponOnly: WEAPON_ONLY, casualGear: CASUAL_GEAR, instill: INSTILL });
const TRIALS = Number(opt('trials', '10'));
const ONLY = opt('class', '');
const SEEDS = opt('seeds', opt('seed', '1,2,3')).split(',').map(Number);
const PROFILES = opt('profile', 'push,mix').split(',') as Profile[];
const JOBS = Number(opt('jobs', '1'));
const TRACE = flag('trace');
const JSON_OUT = flag('json');
const SCENARIOS = opt('scenario', '');
const SCENARIO_MIN = Number(opt('minutes', '30'));

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
 * - expedition: push, but every night from Act 4 on digs, with a standing order on each merchant's dearest open ware.
 * - cooking: push, but every night from Act 5 on goes to Cooking, the same way, eating the best dish it has.
 */
type Profile = 'push' | 'mix' | 'heist' | 'runes' | 'expedition' | 'cooking';
const gathersAway = (profile: Profile, period: number, short: boolean) => (period === 0 && short) || (period === 2 && profile === 'mix');

/** The order the bot buys automation in: rules before hours, as rules are what bosses are locked behind. */
const UPGRADES: [StationId, number][] = [
  ['war_table', 2], ['watchtower', 2], ['war_table', 3], ['war_table', 4], ['war_table', 5], ['watchtower', 3], ['war_table', 6], ['war_table', 7], ['watchtower', 4],
];
const CHECKPOINTS: [string, number][] = [['day 1', 1], ['week 1', 7], ['month 1', 30], ['month 3', 90]];
/** bosses tested for idling, one per drop tier band: each right after the bot first beats it */
const TRIAL_ZONES = ['brinecaves', 'blackreed', 'shipgrave', 'sanctum', 'cinderroad', 'kurgans', 'pyretemple', 'burningthrone', 'inquisition', 'highaltar', 'howlingfells', 'giantsthrone', 'hollowreef', 'maelstrom'];


const fmt = (ms: number | undefined) => {
  if (ms === undefined || !Number.isFinite(ms)) return '—';
  const m = Math.round(ms / MIN);
  if (m >= 48 * 60) return `${Math.floor(m / 1440)}d${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}h`;
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};

/**
 * How much the bot values a character's stats: the best damage skill it owns (attacks scaled by the chance to
 * hit monsters of its level, area skills by how much of a pack they hit), life, energy shield and defences.
 */
// Player decisions are shared with the desktop simulator.
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
  /** Logbook finds and purchases on standing orders */
  finds: number;
  traded: number;
  mealsEaten: number;
  /** deaths in each zone while playing by hand */
  deathsByZone: Record<string, number>;
  /** how many times the 3-death streak triggered a retreat from each zone */
  retreatsByZone: Record<string, number>;
  /** game-time when the bot first entered each boss zone while playing */
  bossFirstAttempt: Record<string, number>;
  /** DPS and life at the moment each boss first fell */
  bossStats: Record<string, { dps: number; life: number }>;
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
    activeMs: 0, awayCombatMs: 0, awayGatherMs: 0, cappedMs: 0, stoppedMs: 0, finalLevel: 1, bank: {}, bestDps: 0, bestLife: 0, skills: {}, bar: '', orbsUsed: 0, heists: 0, heistAlarms: 0, runesWorn: 0, finds: 0, traded: 0, mealsEaten: 0,
    deathsByZone: {}, retreatsByZone: {}, bossFirstAttempt: {}, bossStats: {},
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
          const d = deriveStats(s, []);
          res.bossStats[zone] = { dps: Math.round(bestSkillDps(s, d)), life: d.maxLife };
        }
      }
      if (e.t === 'death') {
        res.deaths++;
        const zone = s.combat?.zoneId ?? '';
        deathStreak[zone] = (deathStreak[zone] ?? 0) + 1;
        res.deathsByZone[zone] = (res.deathsByZone[zone] ?? 0) + 1;
        if (deathStreak[zone] >= 3) {
          retreatUntil = now + 20 * MIN;
          deathStreak[zone] = 0;
          res.retreatsByZone[zone] = (res.retreatsByZone[zone] ?? 0) + 1;
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
      if (s.action?.kind !== 'combat' || (s.combat && s.combat.zoneId !== target.id && !s.combat.monsters.length)) {
        if (!s.bossesDefeated.includes(target.id) && res.bossFirstAttempt[target.id] === undefined) res.bossFirstAttempt[target.id] = now;
        startCombat(s, ctx, target.id);
      }
      if (s.combat && !IDLE && t % (HANDS_EVERY * 1000) === 0) hands(s, ctx, deriveStats(s));
      tick(s, ctx, 1000);
      runTrials();
      if (TRACE && now % HOUR === 0 && now) {
        const d = deriveStats(s, []);
        const w = s.equipment.weapon;
        const main = s.skillBar.find((g) => g && DAMAGE_ROLES.has(activeGemDef(g.gemId).role));
        const at = s.combat?.zoneId ? zoneDef(s.combat.zoneId) : undefined;
        console.log(`  ${fmt(now)} L${characterLevel(s)} ${at ? `act ${at.act} ${at.name} (L${at.levelRange[0]}-${at.levelRange[1]})` : '-'} · ${w ? `${baseDef(w.baseId).name} i${w.ilvl} ${w.rarity}` : 'no weapon'} · ${main ? `${activeGemDef(main.gemId).name} ${main.level}` : '-'} · skill dps ${Math.round(main ? gemDps(d, main, s) : 0)} · life ${d.maxLife}`);
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
    const carving = (profile === 'runes' && period === 2 && runeNight(s, ctx)) || (profile === 'cooking' && period === 2 && cookNight(s, ctx));
    const digging = profile === 'expedition' && period === 2 && expeditionNight(s, ctx);
    const job = !heisting && !carving && !digging && gathersAway(profile, period, !!nextUpgrade(s)?.short.length) ? gatherJob(s) : undefined;
    if (job) startSkillAction(s, ctx, job.id);
    else if (!heisting && !carving && !digging) {
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
    if (job || heisting || carving || digging) res.awayGatherMs += sum.ms;
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
    console.log(`  [${classId}] life ${d.maxLife} armour ${d.armour} res ${JSON.stringify(d.res)} dps ${bestSkillDps(s, d).toFixed(0)}`);
  }
  res.finalLevel = characterLevel(s);
  res.bank = s.account.bank;
  res.bestDps = bestSkillDps(s, d);
  res.bestLife = d.maxLife;
  res.skills = Object.fromEntries([...GATHER_SKILLS, 'thieving' as const, 'archaeology' as const, 'runecarving' as const, 'cooking' as const].map((sk) => [sk, levelOf(sk, s.skills[sk])]));
  res.heists = s.heist.tally.jobs;
  res.finds = s.expedition.tally.finds;
  res.traded = s.expedition.tally.traded;
  res.heistAlarms = s.heist.tally.alarms;
  res.mealsEaten = s.lifetime.mealsEaten;
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

// challenge classes (the Exile) aren't balanced around, so they only run when asked for by name
const classes = CLASSES.filter((c) => (ONLY ? c.id === ONLY : !c.challenge));

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

    console.log('\nCharacter level when each boss fell');
    header('', 28);
    for (const z of ZONES) {
      if (!actOpen(z.act) || !results.some((r) => r.bossLevels[z.id] !== undefined)) continue;
      console.log(pad(`${z.act}. ${z.name}`, 28) + byClass.map((runs) => {
        const vals = runs.map((r) => r.bossLevels[z.id]).filter((x): x is number => x !== undefined);
        return pad(vals.length ? `L${Math.round(median(vals))}` : '—');
      }).join(''));
    }

    console.log('\nDPS / life when each act boss fell');
    header('', 28);
    for (const act of ACTS.filter((a) => actOpen(a.n))) {
      const z = actBossZone(act.n);
      if (!z || !results.some((r) => r.bossStats[z.id])) continue;
      console.log(pad(`Act ${act.n} (${z.boss.name.split(',')[0]})`, 28) + byClass.map((runs) => {
        const dps = runs.map((r) => r.bossStats[z.id]?.dps).filter((x): x is number => x !== undefined);
        const life = runs.map((r) => r.bossStats[z.id]?.life).filter((x): x is number => x !== undefined);
        return pad(dps.length ? `${Math.round(median(dps))}/${Math.round(median(life))}` : '—');
      }).join(''));
    }

    console.log('\nBoss walls: time from first try to kill · deaths in zone');
    header('', 28);
    for (const z of ZONES) {
      if (!actOpen(z.act)) continue;
      const cells = byClass.map((runs) => {
        const walls = runs.map((r) => r.bosses[z.id] !== undefined && r.bossFirstAttempt[z.id] !== undefined
          ? r.bosses[z.id] - r.bossFirstAttempt[z.id]
          : undefined
        ).filter((x): x is number => x !== undefined);
        const deaths = median(runs.map((r) => r.deathsByZone[z.id] ?? 0));
        if (!walls.length && deaths === 0) return null;
        return `${walls.length ? fmt(median(walls)) : '—'}·${Math.round(deaths)}`;
      });
      if (!cells.some((c) => c && c !== '0m·0')) continue;
      console.log(pad(`${z.act}. ${z.name}`, 28) + cells.map((c) => pad(c ?? '—')).join(''));
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
    if (profile === 'expedition') {
      row('archaeology', (r) => r.skills.archaeology);
      row('finds', (r) => r.finds);
      row('traded', (r) => r.traded);
    }
    if (profile === 'runes') {
      row('rune-carving', (r) => r.skills.runecarving);
      row('runes worn', (r) => r.runesWorn);
    }
    if (profile === 'cooking') {
      row('cooking', (r) => r.skills.cooking);
      row('meals eaten', (r) => r.mealsEaten);
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
  console.log('Target (MILESTONES.md): a hard nonstop day 1 (--nonstop --days 1) ends around the end of Act 6, like Maps on day 1 in PoE.\n');
}

// ---------- scenarios ----------

interface ScenarioResult {
  classId: ClassId;
  level: number;
  dps: number;
  life: number;
  es: number;
  /** what the bot's best damage skill hits for per second, and its tags */
  skillDps: number;
  skill: string;
  kills: number;
  xp: number;
  deaths: number;
  bossMs?: number;
  bar: string;
  /** steps run toward a target out of reach, seconds with nothing alive to fight, and hits taken */
  steps: number;
  emptyS: number;
  hitsTaken: number;
}

/** Every gem the Gem shop could stock here, at the highest level the character's level and attributes allow, and three of each support. */
function stockGems(s: GameState) {
  const lvl = characterLevel(s);
  const { attributes } = deriveStats(s, []);
  const findable = (id: string) => gemReqLevel(id) <= lvl && gemArrived(s, id);
  const usable = (id: string) =>
    [...Array(MAX_GEM_LEVEL).keys()].map((i) => i + 1).filter((l) => !gemUseReason(lvl, attributes, { ...createSkillGem(s, id, l) })).at(-1) ?? 1;
  for (const g of s.skillBar) if (g) Object.assign(g, { level: usable(g.gemId), xp: gemXpForLevel(usable(g.gemId)) });
  const have = new Set(s.skillBar.filter(Boolean).map((g) => g!.gemId));
  for (const g of ACTIVE_GEMS) if (findable(g.id) && !have.has(g.id)) s.account.gems.push(createSkillGem(s, g.id, usable(g.id)));
  for (const g of SUPPORT_GEMS) if (findable(g.id)) for (let n = 0; n < 3; n++) s.account.supportGems.push(createSupportGem(s, g.id));
}

/**
 * One class dropped into a playtest scenario: the scenario's plain rares, every gem the shop could stock, passives
 * spent, then SCENARIO_MIN minutes fighting that area by hand, never moving on, so classes compare on equal footing.
 */
function runScenario(name: string, classId: ClassId, seed: number): ScenarioResult {
  const setup = { ...PRESETS[name], classId };
  const s = newGame(seed, { name: 'Bot', classId });
  s.settings.autoFlee = FLEE;
  s.settings.autoBoss = true;
  let now = 0;
  const res: ScenarioResult = { classId, level: 0, dps: 0, life: 0, es: 0, skillDps: 0, skill: '', kills: 0, xp: 0, deaths: 0, bar: '', steps: 0, emptyS: 0, hitsTaken: 0 };
  const ctx: Ctx = {
    rng: seeded(seed * 31 + classId.length),
    now: 0,
    emit(e: GameEvent) {
      if (e.t === 'kill') {
        res.kills++;
        if (e.boss) res.bossMs ??= now;
      }
      if (e.t === 'death') res.deaths++;
      if (e.t === 'closeIn') res.steps++;
      if (e.t === 'hit' && e.target === 'player') res.hitsTaken++;
    },
  };
  applySetup(s, ctx, setup);
  const zone = setupZone(setup)!;
  // passives first, as they raise the attributes that decide how far each gem can level
  spendPassives(s, ctx);
  stockGems(s);
  manageSkills(s, zone.id);
  manageFlasks(s);
  const d = deriveStats(s, []);
  Object.assign(s, { life: d.maxLife, mana: d.maxMana, es: d.maxEs });
  const best = s.skillBar.filter((g): g is SkillGemInstance => !!g && DAMAGE_ROLES.has(activeGemDef(g.gemId).role)).sort((a, b) => gemDps(d, b, s) - gemDps(d, a, s))[0];
  Object.assign(res, {
    level: characterLevel(s),
    dps: Math.round(bestSkillDps(s, d)),
    life: d.maxLife,
    es: d.maxEs,
    skillDps: best ? Math.round(gemDps(d, best, s)) : 0,
    skill: best ? `${activeGemDef(best.gemId).name} (${activeGemDef(best.gemId).tags.join(' ')})` : '-',
    bar: s.skillBar.map((g) => (g ? `${activeGemDef(g.gemId).name}[${g.supports.filter(Boolean).map((x) => supportGemDef(x!.supportId).name).join('+')}]` : '-')).join(' '),
  });
  const xp0 = s.skills.combat;
  for (; now < SCENARIO_MIN * MIN; now += 1000) {
    if (s.action?.kind !== 'combat') startCombat(s, ctx, zone.id);
    if (s.combat) hands(s, ctx, deriveStats(s));
    if (s.combat && !s.combat.monsters.some((m) => m.life > 0)) res.emptyS++;
    tick(s, ctx, 1000);
  }
  res.xp = s.skills.combat - xp0;
  return res;
}

function scenarioReport() {
  const names = SCENARIOS.split(',');
  for (const name of names) {
    if (!PRESETS[name]?.zone) {
      console.log(`\n${name}: not a fighting scenario (try ${Object.keys(PRESETS).filter((k) => PRESETS[k].zone && !PRESETS[k].challenge).join(', ')})`);
      continue;
    }
    const zone = setupZone(PRESETS[name])!;
    const runs = classes.map((c) => SEEDS.map((seed) => runScenario(name, c.id, seed)));
    const per = (f: (r: ScenarioResult) => number) => runs.map((rs) => median(rs.map(f)));
    const row = (label: string, xs: (number | string)[]) => console.log(pad(label, 22) + xs.map((x) => pad(String(x), 12)).join(''));
    const lvl = runs[0][0].level;
    const xpPerLevel = charXpForLevel(lvl + 1) - charXpForLevel(lvl);
    console.log(`\n===== ${name}: ${zone.name}, level ${lvl}, ${SCENARIO_MIN} min each (median of ${SEEDS.length} seed${SEEDS.length > 1 ? 's' : ''}) =====`);
    row('', classes.map((c) => c.id));
    row('sheet dps', per((r) => r.dps));
    row('best skill dps', per((r) => r.skillDps));
    row('life', per((r) => r.life));
    row('energy shield', per((r) => r.es));
    row('kills / min', per((r) => r.kills / SCENARIO_MIN).map((x) => x.toFixed(1)));
    row('levels / hour', per((r) => (r.xp / xpPerLevel) * (60 / SCENARIO_MIN)).map((x) => x.toFixed(2)));
    row('deaths', per((r) => r.deaths));
    // where the time goes: running at targets out of reach (CLOSE_IN_MS a step, before movement speed), and empty field
    row('% time walking', per((r) => (100 * r.steps * CLOSE_IN_MS) / (SCENARIO_MIN * MIN)).map((x) => x.toFixed(0)));
    row('% time no enemies', per((r) => (100 * r.emptyS * 1000) / (SCENARIO_MIN * MIN)).map((x) => x.toFixed(0)));
    row('hits taken / min', per((r) => r.hitsTaken / SCENARIO_MIN).map((x) => x.toFixed(0)));
    if (PRESETS[name].boss) row('first boss kill', per((r) => r.bossMs ?? Infinity).map(fmt));
    console.log('\nBest damage skill and bar (seed ' + SEEDS[0] + ')');
    for (const rs of runs) console.log(`  ${pad(rs[0].classId, 9)} ${rs[0].skill}\n  ${pad('', 9)} ${rs[0].bar}`);
  }
}

if (SCENARIOS) scenarioReport();
else if (JSON_OUT) console.log(JSON.stringify(runClass(classes[0].id, SEEDS[0], PROFILES[0])));
else {
  const results = await sweep();

  const ts = new Date().toISOString().slice(0, 16).replace('T', '-').replace(/:/g, '-');
  const outDir = join(process.cwd(), 'tmp', 'sim-runs');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `sim-${ts}.txt`);
  const file = createWriteStream(outPath, { encoding: 'utf8' });
  const origLog = console.log;
  console.log = (...args: unknown[]) => {
    const line = args.map(String).join(' ');
    origLog(line);
    file.write(line + '\n');
  };

  const mode = NONSTOP ? 'nonstop' : 'dedicated schedule';
  const gearing = WEAPON_ONLY ? 'weapon upgrades only' : CASUAL_GEAR ? 'casual damage-first gear' : 'defensive gear maintained';
  const attention = IDLE ? 'no hands' : HANDS_EVERY === 1 ? 'hands on while playing' : `checks every ${HANDS_EVERY}s`;
  console.log(`\nPath of Idle balance sim — ${DAYS} days, ${mode}, ${attention}, ${gearing}, auto-flee ${FLEE ? 'on' : 'off'}, instilling ${INSTILL ? 'on' : 'off'}, seeds ${SEEDS.join(',')}`);
  report(results);

  console.log = origLog;
  await new Promise<void>((resolve) => file.end(resolve));
  console.log(`\nSaved: ${outPath}`);
}

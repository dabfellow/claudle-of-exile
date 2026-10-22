/**
 * Headless balance sim: a simple bot plays each class for a simulated day and reports
 * how long milestones take, so pacing can be tuned against the GDD targets.
 *
 *   npm run sim                  # all classes, 24h, active-flask bot
 *   npm run sim -- --hours 8 --idle --class mage
 */
import { CLASSES, type ClassId } from '../src/data/classes';
import { PASSIVE_NODES } from '../src/data/passiveTree';
import { actionsFor } from '../src/data/skills';
import { ZONES, zoneDef } from '../src/data/zones';
import { characterLevel } from '../src/engine/character';
import { startCombat, useFlask } from '../src/engine/combat';
import type { Ctx } from '../src/engine/context';
import { salvage } from '../src/engine/crafting';
import { equip, equipReason, slotsFor } from '../src/engine/equipment';
import { socketSupport, supportReason, syncSockets } from '../src/engine/gems';
import { allocate, allocateReason } from '../src/engine/passives';
import { seeded } from '../src/engine/rng';
import { newGame, tick } from '../src/engine/state';
import { deriveStats, type Derived } from '../src/engine/stats';
import type { GameEvent, GameState, Item, SkillId } from '../src/engine/types';
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

const fmt = (ms: number | undefined) => {
  if (ms === undefined) return '—';
  const m = Math.round(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};

/** How much the bot values a character's stats. */
function score(d: Derived): number {
  return d.dps * 3 + d.maxLife + d.armour * 0.15 + d.evasion * 0.15 + (d.res.fire + d.res.cold + d.res.light) * 1.5 + d.lifeRegen * 5;
}

function upgradeGear(s: GameState, ctx: Ctx) {
  for (const item of [...s.inventory]) {
    if (equipReason(s, item)) continue;
    const base = score(deriveStats(s, []));
    let best: { slot: ReturnType<typeof slotsFor>[number]; gain: number } | null = null;
    for (const slot of slotsFor(item)) {
      const gain = score(deriveStats({ ...s, equipment: { ...s.equipment, [slot]: item } }, [])) - base;
      if (gain > 1 && (!best || gain > best.gain)) best = { slot, gain };
    }
    if (best) equip(s, ctx, item.uid, best.slot);
  }
  if (s.inventory.length > 25) salvage(s, ctx, s.inventory.map((i: Item) => i.uid));
}

/** Fill empty support sockets with any loose support that fits. */
function socketGems(s: GameState) {
  for (const gem of s.skillBar) {
    if (!gem) continue;
    syncSockets(gem);
    gem.supports.forEach((sup, i) => {
      if (sup) return;
      const fit = s.supportGems.find((x) => !supportReason(gem, x.supportId));
      if (fit) socketSupport(s, gem.uid, fit.uid, i);
    });
  }
}

function spendPassives(s: GameState, ctx: Ctx) {
  for (;;) {
    const base = score(deriveStats(s, []));
    let pick: string | null = null;
    let bestGain = -Infinity;
    for (const n of PASSIVE_NODES) {
      // keystones are build-defining trade-offs the simple scorer can't judge, so the bot skips them
      if (n.kind === 'keystone' || allocateReason(s, n.id)) continue;
      // masteries: the bot always takes the first option
      const masteries = n.kind === 'mastery' ? { ...s.masteries, [n.id]: 0 } : s.masteries;
      const gain = score(deriveStats({ ...s, passives: [...s.passives, n.id], masteries }, [])) - base;
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
  deaths: number;
  kills: number;
  finalLevel: number;
  bank: Record<string, number>;
  bestDps: number;
  bestLife: number;
}

function runClass(classId: ClassId): Result {
  const s = newGame(SEED, { name: 'Bot', classId });
  s.tutorial.done = true;
  let now = 0;
  const res: Result = { classId, levels: {}, bosses: {}, deaths: 0, kills: 0, finalLevel: 1, bank: {}, bestDps: 0, bestLife: 0 };
  const deathStreak: Record<string, number> = {};
  let retreatUntil = 0;
  const ctx: Ctx = {
    rng: seeded(SEED * 31 + classId.length),
    now: 0,
    emit(e: GameEvent) {
      if (e.t === 'levelup' && e.skill === 'combat') res.levels[e.level] ??= now;
      if (e.t === 'kill') {
        res.kills++;
        const zone = s.combat?.zoneId;
        if (zone) deathStreak[zone] = 0;
        if (e.boss && zone && res.bosses[zone] === undefined) res.bosses[zone] = now;
      }
      if (e.t === 'death') {
        res.deaths++;
        const zone = s.combat?.zoneId ?? '';
        deathStreak[zone] = (deathStreak[zone] ?? 0) + 1;
        if (deathStreak[zone] >= 3) retreatUntil = now + 20 * 60_000;
      }
    },
  };

  const end = HOURS * 3600_000;
  for (now = 0; now < end; now += 1000) {
    if (now % 60_000 === 0) {
      upgradeGear(s, ctx);
      spendPassives(s, ctx);
      socketGems(s);
    }
    // like a sensible player: push the furthest unlocked zone you're roughly levelled for;
    // after 3 deaths in a row, farm the one below for 20 minutes
    const lvl = characterLevel(s);
    const unlocked = ZONES.filter((z) => s.unlockedZones.includes(z.id) && (z.tier === 1 || z.levelRange[0] <= lvl + 1));
    const top = unlocked[unlocked.length - 1];
    const target = now < retreatUntil && unlocked.length > 1 ? unlocked[unlocked.length - 2] : top;
    if (!s.action || (s.combat && s.combat.zoneId !== target.id && !s.combat.monsters.length)) startCombat(s, ctx, target.id);
    if (!IDLE && s.combat) {
      const d = deriveStats(s);
      const casting = s.combat.monsters.some((m) => m.casting >= 0 && m.life > 0);
      s.flaskSlots.forEach((f, i) => {
        if (!f || s.combat?.buffs.some((b) => b.source === 'flask' && b.id === f.flaskId)) return;
        const lifeFlask = f.flaskId.startsWith('life');
        if ((lifeFlask && s.life < d.maxLife * 0.55) || (!lifeFlask && casting)) useFlask(s, ctx, i);
      });
    }
    tick(s, ctx, 1000);
  }
  const d = deriveStats(s, []);
  if (flag('debug')) {
    console.log(`  [${classId}] passives:`, s.passives.join(', '));
    console.log(`  [${classId}] masteries:`, JSON.stringify(s.masteries));
    console.log(`  [${classId}] bar:`, s.skillBar.map((g) => g && `${g.gemId}:${g.level}[${g.supports.filter(Boolean).map((x) => x!.supportId).join('+')}]`).join(' | '));
    console.log(`  [${classId}] life ${d.maxLife} armour ${d.armour} res ${JSON.stringify(d.res)} dps ${d.dps.toFixed(0)}`);
  }
  res.finalLevel = characterLevel(s);
  res.bank = s.bank;
  res.bestDps = d.dps;
  res.bestLife = d.maxLife;
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

console.log(`\nClaudle of Exile balance sim — ${HOURS}h per class, ${IDLE ? 'IDLE (no manual flasks)' : 'ACTIVE (bot drinks flasks)'}, seed ${SEED}\n`);
const classes = CLASSES.filter((c) => !ONLY || c.id === ONLY);
const results = classes.map((c) => {
  const started = Date.now();
  const r = runClass(c.id);
  console.log(`  simulated ${c.name} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return r;
});

const LEVELS = [2, 5, 10, 15, 20, 25, 30, 35, 40];
const pad = (s: string, n = 12) => s.padEnd(n);
console.log('\nTime to character level');
console.log(pad('level', 8) + results.map((r) => pad(r.classId)).join(''));
for (const l of LEVELS) console.log(pad(String(l), 8) + results.map((r) => pad(fmt(r.levels[l]))).join(''));

console.log('\nTime to first boss kill');
console.log(pad('zone', 22) + results.map((r) => pad(r.classId)).join(''));
for (const z of ZONES) console.log(pad(`${z.name} (${zoneDef(z.id).boss.level})`, 22) + results.map((r) => pad(fmt(r.bosses[z.id]))).join(''));

console.log('\nAfter the run');
const row = (label: string, f: (r: Result) => string) => console.log(pad(label, 22) + results.map((r) => pad(f(r))).join(''));
row('level', (r) => String(r.finalLevel));
row('kills', (r) => String(r.kills));
row('deaths', (r) => String(r.deaths));
row('dps / life', (r) => `${r.bestDps.toFixed(0)}/${r.bestLife}`);
row('gold', (r) => String(r.bank.gold ?? 0));
row('chaos / exalted', (r) => `${r.bank.chaos ?? 0}/${r.bank.exalted ?? 0}`);
row('transmute / alch', (r) => `${r.bank.transmute ?? 0}/${r.bank.alchemy ?? 0}`);

console.log('\nGathering pace (best node, no gear bonuses)');
const SKILL_TARGETS = [15, 30, 45, 60, 75, 99];
console.log(pad('level', 8) + ['mining', 'woodcutting', 'harvesting'].map((x) => pad(x, 14)).join(''));
const paces = (['mining', 'woodcutting', 'harvesting'] as SkillId[]).map((sk) => skillPace(sk, SKILL_TARGETS));
for (const l of SKILL_TARGETS) console.log(pad(String(l), 8) + paces.map((p) => pad(fmt(p[l]), 14)).join(''));

console.log('\nGDD targets: Act 1 done in ~1 day (6–10h active), level 100 and 99 skills in months.\n');

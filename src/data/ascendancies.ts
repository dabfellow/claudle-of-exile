import type { StatKey } from '../engine/types';
import type { ClassId } from './classes';

/**
 * Ascendancies (docs/GAME.md): two for each main class, none for the Exile. Each is one small tree on
 * its own tab. Three paths specialise the chosen ascendancy and three paths specialise the base class mechanic.
 * Every notable costs two points and either capstone costs three; all paths are available after the first trial:
 *
 *   Ascendancy paths (3) ─┐       ┌─ Class-mechanic paths (3)
 *                         Gate
 *                    small   small
 *                      │       │
 *                    small   small
 *                      │       │
 *                 Capstone   Mechanic capstone
 *
 * The gate is free. Gates, notables and capstones are rules, built in engine/combat.ts and engine/mechanics.ts, which
 * look a node up by its id. Smalls and some notables are plain stats.
 */
export type AscendancyId =
  | 'ravager' | 'anvil'
  | 'longshot' | 'falconer'
  | 'wellspring' | 'alchemist'
  | 'matador' | 'vanguard'
  | 'flagellant' | 'lightkeeper'
  | 'headsman' | 'plaguewright';

export type AscendancyNodeKind = 'gate' | 'small' | 'notable' | 'capstone';

type StatMap = Partial<Record<StatKey, number>>;

export interface AscendancyNode {
  id: string;
  name: string;
  kind: AscendancyNodeKind;
  x: number;
  y: number;
  links: string[];
  stats: StatMap;
  desc?: string;
}

export interface AscendancyDef {
  id: AscendancyId;
  name: string;
  classId: ClassId;
  quote: string;
  /** one line for the choice screen */
  line: string;
  plays: string;
  gate: AscendancyNode;
  signatureNotables: AscendancyNode[];
  mechanicNotables: AscendancyNode[];
  notables: AscendancyNode[];
  capstone: AscendancyNode;
  capstones: AscendancyNode[];
  nodes: AscendancyNode[];
}

interface Rule {
  key: string;
  name: string;
  desc: string;
  stats?: StatMap;
}

interface Branch extends Omit<Rule, 'stats'> {
  stats?: StatMap;
  small: { name: string; stats: StatMap };
}

interface Spec {
  id: AscendancyId;
  name: string;
  classId: ClassId;
  quote: string;
  line: string;
  plays: string;
  gate: string;
  /** what the gate grants on top of its rule */
  gateStats?: StatMap;
  branches: [Branch, Branch, Branch];
  bridge: { name: string; stats: StatMap };
  capstone: Rule;
}

interface MechanicSpec {
  branches: [Branch, Branch, Branch];
  bridge: { name: string; stats: StatMap };
  capstone: Rule;
}

/** The old class-only character-tree choices now live with both ascendancies for that class. */
const CLASS_MECHANICS: Record<Exclude<ClassId, 'exile'>, MechanicSpec> = {
  warrior: {
    branches: [
      { key: 'seething', name: 'Seething', desc: '+5 to maximum Rage and 10% increased Physical Damage.', stats: { rageMax: 5, physPct: 10 }, small: { name: 'Fury', stats: { rageEffect: 5, physPct: 4 } } },
      { key: 'blood_boil', name: 'Blood Boil', desc: 'Regenerate 0.1% of Life per second per Rage.', stats: { rageRegen: 0.1, life: 15 }, small: { name: 'Wrath', stats: { rageEffect: 6, life: 5 } } },
      { key: 'unquenched', name: 'Unquenched', desc: 'Rage decays 50% slower.', stats: { rageDecay: 50, armourPct: 15 }, small: { name: 'Anger', stats: { rageMax: 2, armourPct: 5 } } },
    ],
    bridge: { name: 'Unending', stats: { rageEffect: 5 } },
    capstone: { key: 'endless_fury', name: 'Endless Fury', desc: 'Rage no longer decays. Maximum Rage is halved.', stats: { endlessFury: 1 } },
  },
  duelist: {
    branches: [
      { key: 'counterpoint', name: 'Counterpoint', desc: '30% increased Riposte damage and +2% chance to Block.', stats: { ripostePct: 30, blockChance: 2 }, small: { name: 'Retort', stats: { ripostePct: 8, accuracy: 15 } } },
      { key: 'parry_and_thrust', name: 'Parry and Thrust', desc: 'Riposte recovers 25% faster.', stats: { riposteCooldown: 25, evasionPct: 10 }, small: { name: 'Poise', stats: { ripostePct: 8, evasionPct: 4 } } },
      { key: 'bloody_answer', name: 'Bloody Answer', desc: 'Ripostes always cause Bleeding.', stats: { riposteBleed: 1, bleedPct: 15 }, small: { name: 'Measured Reply', stats: { riposteHeal: 1, armourPct: 5 } } },
    ],
    bridge: { name: 'Perfect Timing', stats: { ripostePct: 10 } },
    capstone: { key: 'perfect_form', name: 'Perfect Form', desc: 'Riposte has no cooldown. Ripostes deal 50% less damage.', stats: { perfectForm: 1 } },
  },
  ranger: {
    branches: [
      { key: 'second_wind', name: 'Second Wind', desc: '+3 to maximum Momentum.', stats: { momentumMax: 3, evasionPct: 10 }, small: { name: 'Motion', stats: { momentumEffect: 5, attackSpeedPct: 1 } } },
      { key: 'sure_footed', name: 'Sure-Footed', desc: 'Taking a hit removes 1 less Momentum (minimum 1).', stats: { momentumRetain: 1, accuracy: 30 }, small: { name: 'Slipstream', stats: { momentumEffect: 6, evasionPct: 4 } } },
      { key: 'gathering_storm', name: 'Gathering Storm', desc: '20% increased effect of Momentum.', stats: { momentumEffect: 20, critChancePct: 10 }, small: { name: 'Tailwind', stats: { momentumMax: 1, attackSpeedPct: 2 } } },
    ],
    bridge: { name: 'Always Moving', stats: { momentumEffect: 5 } },
    capstone: { key: 'perpetual_motion', name: 'Perpetual Motion', desc: "Taking a hit doesn't halve Momentum. Momentum decays by 1 per second instead.", stats: { perpetualMotion: 1 } },
  },
  shadow: {
    branches: [
      { key: 'patience', name: 'Patience', desc: 'The Malice meter is 3 smaller.', stats: { maliceMax: -3, evasionPct: 10 }, small: { name: 'Ill Intent', stats: { coupPct: 6, ailmentPct: 4 } } },
      { key: 'twist_the_knife', name: 'Twist the Knife', desc: '40% increased Coup de Grâce damage.', stats: { coupPct: 40, critMulti: 5 }, small: { name: 'Cold Purpose', stats: { coupPct: 8, poisonPct: 4 } } },
      { key: 'spite', name: 'Spite', desc: 'Critical strikes leave 5 Malice instead of emptying the meter.', stats: { maliceCritKeep: 5, critChancePct: 10 }, small: { name: 'Grudge', stats: { maliceOnHitTaken: 1, evasionPct: 4 } } },
    ],
    bridge: { name: 'A Thousand Plans', stats: { coupPct: 8 } },
    capstone: { key: 'thousand_cuts', name: 'Thousand Cuts', desc: 'Critical strikes also add Malice. Coup de Grâce deals 200% damage instead of 400%.', stats: { thousandCuts: 1 } },
  },
  mage: {
    branches: [
      { key: 'arcane_wellspring', name: 'Arcane Wellspring', desc: '+5% to the Mana is Power bonus.', stats: { manaPower: 5, manaPct: 15 }, small: { name: 'Reservoir', stats: { manaPower: 2, mana: 8 } } },
      { key: 'brimming', name: 'Brimming', desc: 'Recent Mana spending counts 10% more toward Mana is Power.', stats: { manaPowerFull: 10, manaRegenPct: 10 }, small: { name: 'Deep Reserves', stats: { mana: 10, manaRegenPct: 6 } } },
      { key: 'soul_battery', name: 'Soul Battery', desc: 'Mana is Power has +10% maximum bonus; 15% increased Energy Shield.', stats: { manaPowerEs: 1, energyShieldPct: 15 }, small: { name: 'Overflow', stats: { manaPower: 3, manaRegenPct: 15 } } },
    ],
    bridge: { name: 'Full to Bursting', stats: { manaPower: 3 } },
    capstone: { key: 'all_or_nothing', name: 'All or Nothing', desc: 'Mana is Power doubles its current bonus and maximum.', stats: { allOrNothing: 1 } },
  },
  templar: {
    branches: [
      { key: 'devotion', name: 'Devotion', desc: '15% increased Fervor gain.', stats: { fervorPct: 15, allRes: 5 }, small: { name: 'Penitence', stats: { novaPct: 8.8, life: 4 } } },
      { key: 'holy_light', name: 'Holy Light', desc: 'Holy novas heal 10% more.', stats: { novaHeal: 11, lifeRegen: 1.1 }, small: { name: 'Penance', stats: { fervorPct: 5.5, armourPct: 4.4 } } },
      { key: 'divine_wrath', name: 'Divine Wrath', desc: '40% increased holy nova damage.', stats: { novaPct: 44, elemPct: 5.5 }, small: { name: 'Radiance', stats: { novaEs: 10, energyShieldPct: 5.5 } } },
    ],
    bridge: { name: 'Consecration', stats: { fervorPct: 5.5 } },
    capstone: { key: 'saints_sacrifice', name: "Saint's Sacrifice", desc: 'Fervor fills twice as fast. The holy nova no longer heals you.', stats: { saintsSacrifice: 1 } },
  },
};

const SIGNATURE_COLUMNS = [-520, -310, -100];
const MECHANIC_COLUMNS = [100, 310, 520];
const ROWS = { gate: 350, first: 200, second: 60, notable: -80, bridge: -210, capstone: -350 };
const halfStats = (stats: StatMap): StatMap => Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, (value ?? 0) / 2]));

function build(a: Spec): AscendancyDef {
  const nodes: Record<string, AscendancyNode> = {};
  const add = (id: string, name: string, kind: AscendancyNodeKind, x: number, y: number, stats: StatMap = {}, desc?: string) =>
    (nodes[id] = { id, name, kind, x, y, stats, desc, links: [] });
  const link = (x: string, y: string) => {
    nodes[x].links.push(y);
    nodes[y].links.push(x);
  };
  const gate = add(`${a.id}_gate`, a.name, 'gate', 0, ROWS.gate, a.gateStats, a.gate);
  const branch = (b: Branch, x: number) => {
    const first = add(`${a.id}_${b.key}_1`, b.small.name, 'small', x * 0.72, ROWS.second, b.small.stats);
    const notable = add(`${a.id}_${b.key}`, b.name, 'notable', x, ROWS.notable, b.stats, b.desc);
    link(gate.id, first.id);
    link(first.id, notable.id);
    return notable;
  };
  const signatureNotables = a.branches.map((b, i) => branch(b, SIGNATURE_COLUMNS[i]));
  const mechanic = CLASS_MECHANICS[a.classId as Exclude<ClassId, 'exile'>];
  const mechanicNotables = mechanic.branches.map((b, i) => branch(b, MECHANIC_COLUMNS[i]));
  const bridge = add(`${a.id}_bridge`, a.bridge.name, 'small', -240, ROWS.bridge, halfStats(a.bridge.stats));
  const bridge2 = add(`${a.id}_bridge_2`, a.bridge.name, 'small', -240, (ROWS.bridge + ROWS.capstone) / 2, halfStats(a.bridge.stats));
  const capstone = add(`${a.id}_${a.capstone.key}`, a.capstone.name, 'capstone', -240, ROWS.capstone, a.capstone.stats, a.capstone.desc);
  link(gate.id, bridge.id);
  link(bridge.id, bridge2.id);
  link(bridge2.id, capstone.id);
  const mechanicBridge = add(`${a.id}_mechanic_bridge`, mechanic.bridge.name, 'small', 240, ROWS.bridge, halfStats(mechanic.bridge.stats));
  const mechanicBridge2 = add(`${a.id}_mechanic_bridge_2`, mechanic.bridge.name, 'small', 240, (ROWS.bridge + ROWS.capstone) / 2, halfStats(mechanic.bridge.stats));
  const mechanicCapstone = add(`${a.id}_${mechanic.capstone.key}`, mechanic.capstone.name, 'capstone', 240, ROWS.capstone, mechanic.capstone.stats, mechanic.capstone.desc);
  link(gate.id, mechanicBridge.id);
  link(mechanicBridge.id, mechanicBridge2.id);
  link(mechanicBridge2.id, mechanicCapstone.id);
  const notables = [...signatureNotables, ...mechanicNotables];
  const capstones = [capstone, mechanicCapstone];
  return {
    id: a.id, name: a.name, classId: a.classId, quote: a.quote, line: a.line, plays: a.plays,
    gate, signatureNotables, mechanicNotables, notables, capstone, capstones, nodes: Object.values(nodes),
  };
}

export const ASCENDANCIES: AscendancyDef[] = ([
  {
    id: 'ravager', name: 'Ravager', classId: 'warrior', quote: 'Let it build, then let it out.',
    line: 'Rage builds to a rampage that hits everything next to you.',
    plays: 'Surges instead of a steady ramp: quiet until the meter fills, then the whole front line goes down. Best in the swarm, and the class meter tactic lines Berserk up with it.',
    gate: 'At full Rage you Rampage for 6s: melee hits strike all of ring 1 while Rage drains to 0.',
    branches: [
      { key: 'bloodlust', name: 'Bloodlust', desc: 'Kills add 1s to a Rampage.', small: { name: 'Savagery', stats: { physPct: 8 } } },
      { key: 'trample', name: 'Trample', desc: 'A Rampage reaches ring 2.', small: { name: 'Brawn', stats: { life: 12, str: 4 } } },
      { key: 'red_haze', name: 'Red Haze', desc: '30% increased Attack Speed during a Rampage.', small: { name: 'Fervid', stats: { rageEffect: 5 } } },
    ],
    bridge: { name: 'Bloodied', stats: { rageMax: 2, physPct: 6 } },
    capstone: { key: 'no_mercy', name: 'No Mercy', desc: 'Rage stops draining during a Rampage for 2s after each kill.' },
  },
  {
    id: 'anvil', name: 'Anvil', classId: 'warrior', quote: 'They break on you.',
    line: 'Rage comes from being hit, and enemies break on your Armour.',
    plays: 'Your damage comes from being hit, so Armour is your damage stat and attack speed barely matters. It wants ring 1 full, idles the easiest, and is slow when few enemies come at you.',
    gate: 'You gain Rage from hits you take instead of hits you deal, and attackers take damage based on your Armour and Rage.',
    branches: [
      { key: 'hold_the_line', name: 'Hold the Line', desc: 'Hits you take grant more Rage for each enemy in ring 1.', small: { name: 'Stone Skin', stats: { armourPct: 10 } } },
      { key: 'shatter', name: 'Shatter', desc: 'Surviving a boss wind-up fills your Rage.', small: { name: 'Hardened', stats: { life: 12, slamReduction: 2 } } },
      { key: 'temper', name: 'Temper', desc: 'Blocked hits still grant Rage and hurt the attacker.', small: { name: 'Plated', stats: { armour: 25, armourPct: 4 } } },
    ],
    bridge: { name: 'Bedrock', stats: { armourPct: 8, rageEffect: 4 } },
    capstone: { key: 'unmoved', name: 'Unmoved', desc: 'Enemies that hit you at full Rage are stunned.' },
  },
  {
    id: 'longshot', name: 'Longshot', classId: 'ranger', quote: 'One arrow, well placed.',
    line: 'Momentum becomes damage, so you fire slow shots that kill at range.',
    plays: 'Slow, heavy shots that kill things before they arrive, using Farthest targeting. Weak for the first few shots of a fight, and in trouble if the swarm reaches you.',
    gate: 'Momentum grants 3% more attack damage per stack instead of attack speed, doubled against enemies in rings 3–4.',
    branches: [
      { key: 'head_start', name: 'Head Start', desc: 'Begin each fight with 4 Momentum.', small: { name: 'Patient Draw', stats: { momentumEffect: 5 } } },
      { key: 'pin', name: 'Pin', desc: 'Your hits slow enemies walking in.', small: { name: 'Far Sight', stats: { projectilePct: 8 } } },
      { key: 'steady_aim', name: 'Steady Aim', desc: 'Taking a hit removes 1 less Momentum (minimum 1).', stats: { momentumRetain: 1 }, small: { name: 'Composed', stats: { accuracy: 25, evasionPct: 5 } } },
    ],
    bridge: { name: 'Windage', stats: { momentumMax: 1, projectilePct: 6 } },
    capstone: { key: 'last_arrow', name: 'Last Arrow', desc: 'At full Momentum your next attack spends it all on a guaranteed crit that hits the whole line to the target.' },
  },
  {
    id: 'falconer', name: 'Falconer', classId: 'ranger', quote: 'Never hunts alone.',
    line: 'Momentum drives a hawk that hits what you can’t reach.',
    plays: 'Two attackers. The hawk ignores blocked paths, so casters behind the front line stop being a problem, and you pick its target priority separately from your own.',
    gate: 'A hawk attacks alongside you for half your weapon damage, and each Momentum makes it attack faster.',
    branches: [
      { key: 'talons', name: 'Talons', desc: 'Your hawk’s hits cause Bleeding.', small: { name: 'Sharp Eyes', stats: { critChancePct: 8 } } },
      { key: 'hooded', name: 'Hooded', desc: 'Your hawk goes for ranged enemies first.', small: { name: 'Falconry', stats: { accuracy: 25, physPct: 4 } } },
      { key: 'bond', name: 'Bond', desc: 'Your hawk’s hits count as attacks for Momentum.', small: { name: 'Keen Bond', stats: { momentumEffect: 5 } } },
    ],
    bridge: { name: 'Wingbeat', stats: { momentumMax: 1, attackSpeedPct: 3 } },
    capstone: { key: 'stoop', name: 'Stoop', desc: 'At full Momentum your hawk spends it all on a dive for a huge hit that stuns.' },
  },
  {
    id: 'wellspring', name: 'Wellspring', classId: 'mage', quote: 'Never run dry.',
    line: 'Mana you’d waste at full fills Overflow, and a full meter powers up your next spell.',
    plays: 'A spend-and-recover caster. Linked spells ramp Mana is Power, while regeneration refills the pool and excess recovery becomes a Surge.',
    gate: 'Regenerate 2 Mana per second. Mana gained while full fills Overflow, and at 25% of your max Mana your next damaging spell is free and deals 100% more damage.',
    gateStats: { manaRegenFlat: 2 },
    branches: [
      { key: 'riptide', name: 'Riptide', desc: 'A Surge gives its spell +1 area or +1 chain, or casts it a second time at 80% damage if it can have neither.', small: { name: 'Swell', stats: { spellPct: 6 } } },
      { key: 'wake', name: 'Wake', desc: 'A Surge always applies its element’s ailment: fire burns, cold chills, lightning shocks and chaos poisons.', small: { name: 'Trickle', stats: { manaRegenPct: 15 } } },
      { key: 'springward', name: 'Springward', desc: 'A Surge restores Energy Shield equal to 10% of your max Mana.', small: { name: 'Tributary', stats: { mana: 12, manaRegenPct: 6 } } },
    ],
    bridge: { name: 'Torrent', stats: { spellPct: 8, manaCostReduction: 4 } },
    capstone: { key: 'deluge', name: 'Deluge', desc: 'Every Surge is a Mega Crit.' },
  },
  {
    id: 'alchemist', name: 'Alchemist', classId: 'mage', quote: 'The brew is the spell.',
    line: 'Spent flask charges ramp Mana is Power, and every flask you drink explodes.',
    plays: 'Flasks are your main weapon. Drinking them counts as recent Mana spending, so kills refill both charges and your damage ramp while Flask Effect strengthens the burst.',
    gate: 'Each flask charge spent counts as 3 Mana spent for Mana is Power, and every flask you drink bursts on your target for fire damage.',
    branches: [
      { key: 'volatile_mix', name: 'Volatile Mix', desc: 'Flask bursts also hit enemies next to your target.', small: { name: 'Measured Dose', stats: { flaskEffect: 5 } } },
      { key: 'deep_cellar', name: 'Deep Cellar', desc: 'Flasks hold 50% more charges.', small: { name: 'Well Stocked', stats: { flaskCharges: 8 } } },
      { key: 'tonic', name: 'Tonic', desc: 'Drinking a flask restores 10% of your Mana.', small: { name: 'Steeped', stats: { mana: 12, manaRegenPct: 6 } } },
    ],
    bridge: { name: 'Fine Vintage', stats: { flaskEffect: 8, firePct: 6 } },
    capstone: { key: 'philosophers_draught', name: 'Philosopher’s Draught', desc: 'Each active flask adds 6% more damage, and they stack.' },
  },
  {
    id: 'matador', name: 'Matador', classId: 'duelist', quote: 'Let it miss by an inch.',
    line: 'Only evades Riposte, and a streak of them grows huge.',
    plays: 'Pure Evasion with no block. Damage climbs through a long fight, and one clean hit on you throws the streak away, so it’s a high wire compared to steady Riposte.',
    gate: 'Only evades trigger Riposte, and each Riposte in a row adds 15% more damage to the next (up to 10), until you’re hit.',
    branches: [
      { key: 'veronica', name: 'Veronica', desc: 'Your streak can reach 15.', small: { name: 'Footwork', stats: { evasionPct: 8 } } },
      { key: 'close_call', name: 'Close Call', desc: 'Being hit halves your streak instead of ending it.', small: { name: 'Light Blade', stats: { ripostePct: 8 } } },
      { key: 'crowds_roar', name: 'Crowd’s Roar', desc: '2% increased Attack Speed per streak.', small: { name: 'Showman', stats: { attackSpeedPct: 2 } } },
    ],
    bridge: { name: 'Olé', stats: { evasionPct: 6, ripostePct: 8 } },
    capstone: { key: 'moment_of_truth', name: 'Moment of Truth', desc: 'At a streak of 10 your next Riposte is a Mega Crit, and the streak starts over.' },
  },
  {
    id: 'vanguard', name: 'Vanguard', classId: 'duelist', quote: 'Hold the line.',
    line: 'Only blocks Riposte, and each one hits everything next to you.',
    plays: 'Shield and Armour. Block chance becomes area damage, and guard skills like Iron Guard and Parry turn into your pack clear. Slower on one target, excellent in the swarm.',
    gate: 'Only blocks trigger Riposte, and each one also hits all of ring 1.',
    branches: [
      { key: 'raised_shield', name: 'Raised Shield', desc: '8% chance to Block hits.', stats: { blockChance: 8 }, small: { name: 'Shield Drill', stats: { blockChance: 1 } } },
      { key: 'press_forward', name: 'Press Forward', desc: 'Ripostes reach ring 2.', small: { name: 'Advance', stats: { ripostePct: 8 } } },
      { key: 'stand_fast', name: 'Stand Fast', desc: 'Each block grants 30% increased Armour for 3s.', small: { name: 'Bulwark', stats: { armourPct: 8 } } },
    ],
    bridge: { name: 'Shoulder to Shoulder', stats: { armourPct: 6, ripostePct: 8 } },
    capstone: { key: 'phalanx', name: 'Phalanx', desc: 'Blocking a boss wind-up triggers a Riposte for triple damage.' },
  },
  {
    id: 'flagellant', name: 'Flagellant', classId: 'templar', quote: 'Pain on demand.',
    line: 'You hurt yourself to fill Fervor, so novas fire on trash too.',
    plays: 'A hurt and heal loop. Templar normally barely fills Fervor on trash, but this fills it everywhere. It needs Life regen to stay safe, and a bad setup can kill itself offline.',
    gate: 'Using a skill costs 3% of your Life, and that Life fills Fervor three times as fast as a hit.',
    branches: [
      { key: 'scourge', name: 'Scourge', desc: 'Fervor from self-harm counts for 50% more nova damage.', small: { name: 'Lash', stats: { novaPct: 8.8 } } },
      { key: 'mortify', name: 'Mortify', desc: '25% more damage while below half Life.', small: { name: 'Vigil', stats: { lifeRegen: 2.2 } } },
      { key: 'absolution', name: 'Absolution', desc: '33% increased holy nova healing.', stats: { novaHeal: 33 }, small: { name: 'Mercy', stats: { life: 13, novaHeal: 3.3 } } },
    ],
    bridge: { name: 'Hair Shirt', stats: { lifeRegenPct: 0.22, fervorPct: 5.5 } },
    capstone: { key: 'ecstasy', name: 'Ecstasy', desc: 'While below half Life your skills are 15% faster and cost no Mana.' },
  },
  {
    id: 'lightkeeper', name: 'Lightkeeper', classId: 'templar', quote: 'Hold the light until it’s needed.',
    line: 'You store novas and release them when it counts.',
    plays: 'The hands-on Templar. Save novas through a fight, then spend them on a boss wind-up as a burst and a heal. Left alone it releases at full, and reactive rules let it hold for the right moment on idle.',
    gate: 'Fervor stores up to 3 novas, released when full unless your release setting or a click says otherwise.',
    branches: [
      { key: 'reserve', name: 'Reserve', desc: 'Novas released together deal 20% more damage for each one after the first.', small: { name: 'Banked Light', stats: { novaPct: 8.8 } } },
      { key: 'vespers', name: 'Vespers', desc: 'A nova also grants a shield of 15% of your Life.', small: { name: 'Evensong', stats: { shieldEffect: 6.6 } } },
      { key: 'beacon', name: 'Beacon', desc: 'A nova breaks the armour of everything on every ring for 4s.', small: { name: 'Lantern', stats: { allRes: 2.2, fervorPct: 3.3 } } },
    ],
    bridge: { name: 'Patience', stats: { fervorPct: 6.6, novaPct: 8.8 } },
    capstone: { key: 'dawn', name: 'Dawn', desc: 'Releasing all 3 at once stuns everything and absorbs the next boss wind-up.' },
  },
  {
    id: 'headsman', name: 'Headsman', classId: 'shadow', quote: 'One cut per neck.',
    line: 'A killing Coup de Grâce refunds Malice and chains through packs.',
    plays: 'The low-crit path made into a pack killer. Lowest Life targeting and a cheap meter let one Coup chain into the next, so it clears in streaks, with long gaps when a boss won’t die to one.',
    gate: 'A Coup de Grâce that kills refunds half the Malice meter.',
    branches: [
      { key: 'sharp_axe', name: 'Sharp Axe', desc: '50% more Coup de Grâce damage to enemies below half Life.', small: { name: 'Honed', stats: { coupPct: 8 } } },
      { key: 'marked', name: 'Marked', desc: 'A Coup de Grâce that doesn’t kill breaks the target’s armour for 6s.', small: { name: 'Measured Swing', stats: { accuracy: 25, physPct: 4 } } },
      { key: 'next', name: 'Next', desc: 'Malice carries into your next fight.', small: { name: 'Cold Eye', stats: { evasionPct: 8 } } },
    ],
    bridge: { name: 'The Long Walk', stats: { maliceMax: -1, coupPct: 8 } },
    capstone: { key: 'the_block', name: 'The Block', desc: 'A Coup de Grâce kills any non-boss below 30% Life outright.' },
  },
  {
    id: 'plaguewright', name: 'Plaguewright', classId: 'shadow', quote: 'Let it spread.',
    line: 'Ailments fill Malice, and Coup de Grâce bursts them.',
    plays: 'Hit once and wait. You rely on ailments rather than hits, spreading them across the field with Ailing targeting. Poison Dart and Ignite builds get a big finish they don’t have today.',
    gate: 'Ailments ticking on enemies fill Malice, and a Coup de Grâce bursts every ailment on its target for all the damage it had left.',
    branches: [
      { key: 'incubation', name: 'Incubation', desc: '30% longer Bleed, Poison and Ignite.', stats: { ailmentDuration: 30 }, small: { name: 'Slow Rot', stats: { ailmentDuration: 4 } } },
      { key: 'bloom', name: 'Bloom', desc: '25% more burst damage per ailment type on the target.', small: { name: 'Virulent', stats: { ailmentPct: 8 } } },
      { key: 'contagion', name: 'Contagion', desc: 'Kills spread their ailments to the nearest enemy.', small: { name: 'Carrier', stats: { poisonPct: 5, ignitePct: 5 } } },
    ],
    bridge: { name: 'Miasma', stats: { ailmentPct: 10, coupPct: 6 } },
    capstone: { key: 'pandemic', name: 'Pandemic', desc: 'The burst copies its ailments to enemies within 1 ring.' },
  },
] satisfies Spec[]).map(build);

export const ASCENDANCY_BY_ID = Object.fromEntries(ASCENDANCIES.map((a) => [a.id, a])) as Record<AscendancyId, AscendancyDef>;
export const ASCENDANCY_NODE_BY_ID: Record<string, AscendancyNode> = Object.fromEntries(ASCENDANCIES.flatMap((a) => a.nodes).map((n) => [n.id, n]));

export function ascendanciesOf(classId: ClassId): AscendancyDef[] {
  return ASCENDANCIES.filter((a) => a.classId === classId);
}

export interface TrialDef {
  n: 1 | 2 | 3 | 4;
  zoneId?: string;
  mapTier?: number;
  name: string;
  place: string;
  points: number;
  /** player-facing result after the points are awarded */
  result: string;
}

/** What each trial grants, the first time it's passed: the only source of ascendancy points. Nodes never have act locks. */
export const TRIALS: TrialDef[] = [
  { n: 1, zoneId: 'pilgrimgate', name: 'The Pilgrim Gate', place: 'Act 3', points: 2, result: 'Choose your ascendancy; its entire tree is visible and you can afford one notable.' },
  { n: 2, zoneId: 'giantsthrone', name: "The Giants' Throne", place: 'Act 4', points: 2, result: 'You can now afford two notables.' },
  { n: 3, zoneId: 'exilesgate', name: "The Exiles' Gate", place: 'Act 6', points: 3, result: 'With two notables, you can now reach either capstone.' },
  { n: 4, mapTier: 5, name: 'Tier 5 Maps', place: 'Maps', points: 2, result: 'The normal nine-point budget now supports three notables and one capstone.' },
];

/** Nine points buy exactly three complete notable paths and one capstone path. */
export const ASCENDANCY_MAX_POINTS = 9;

/** Switching costs this many of the rare material, plus an Orb of Regret per node. */
export const SWITCH_MATERIAL = 'divine';
export const SWITCH_MATERIAL_COST = 1;

export interface UnwrittenNotableEntry {
  index: number;
  ascendancyId: AscendancyId;
  ascendancyName: string;
  classId: ClassId;
  node: AscendancyNode;
}

/** All 36 signature Ascendancy notables (1-based index 1..36) for The Unwritten unique body armour. */
export const UNWRITTEN_NOTABLES: UnwrittenNotableEntry[] = ASCENDANCIES.flatMap((a) =>
  a.signatureNotables.map((node) => ({
    index: 0,
    ascendancyId: a.id,
    ascendancyName: a.name,
    classId: a.classId,
    node,
  })),
).map((entry, idx) => ({ ...entry, index: idx + 1 }));

export function unwrittenNotableByIndex(idx: number): UnwrittenNotableEntry {
  const clamped = Math.max(1, Math.min(UNWRITTEN_NOTABLES.length, Math.round(idx || 1)));
  return UNWRITTEN_NOTABLES[clamped - 1];
}

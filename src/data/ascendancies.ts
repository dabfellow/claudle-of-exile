import type { StatKey } from '../engine/types';
import type { ClassId } from './classes';

/**
 * Ascendancies (docs/design/ASCENDANCIES.md): two for each main class, none for the Exile. Each is one small tree on
 * its own tab, laid out the same way:
 *
 *   Gate ─ small ─ small ─ Notable ─┐
 *     ├─── small ─ small ─ Notable ─┼─ small ─ Capstone
 *     └─── small ─ small ─ Notable ─┘
 *
 * The gate is free. Gates, notables and capstones are rules, built in engine/combat.ts and engine/mechanics.ts, which
 * look a node up by its id. Smalls and some notables are plain stats.
 */
export type AscendancyId =
  | 'ravager' | 'anvil'
  | 'longshot' | 'falconer'
  | 'wildcaster' | 'alchemist'
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
  /** how many trials must be passed before this node can be taken */
  trial: 1 | 2 | 3;
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
  notables: AscendancyNode[];
  capstone: AscendancyNode;
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
  branches: [Branch, Branch, Branch];
  bridge: { name: string; stats: StatMap };
  capstone: Rule;
}

/** where each branch sits, and the rows of the section from the gate up */
const COLUMNS = [-230, 0, 230];
const ROWS = { gate: 340, first: 200, second: 70, notable: -70, bridge: -200, capstone: -340 };

function build(a: Spec): AscendancyDef {
  const nodes: Record<string, AscendancyNode> = {};
  const add = (id: string, name: string, kind: AscendancyNodeKind, x: number, y: number, trial: 1 | 2 | 3, stats: StatMap = {}, desc?: string) =>
    (nodes[id] = { id, name, kind, x, y, trial, stats, desc, links: [] });
  const link = (x: string, y: string) => {
    nodes[x].links.push(y);
    nodes[y].links.push(x);
  };
  const gate = add(`${a.id}_gate`, a.name, 'gate', 0, ROWS.gate, 1, {}, a.gate);
  const bridge = add(`${a.id}_bridge`, a.bridge.name, 'small', 0, ROWS.bridge, 2, a.bridge.stats);
  const capstone = add(`${a.id}_${a.capstone.key}`, a.capstone.name, 'capstone', 0, ROWS.capstone, 3, a.capstone.stats, a.capstone.desc);
  link(bridge.id, capstone.id);
  const notables = a.branches.map((b, i) => {
    const x = COLUMNS[i];
    const first = add(`${a.id}_${b.key}_1`, b.small.name, 'small', x * 0.75, ROWS.first, 1, b.small.stats);
    const second = add(`${a.id}_${b.key}_2`, b.small.name, 'small', x, ROWS.second, 1, b.small.stats);
    const notable = add(`${a.id}_${b.key}`, b.name, 'notable', x, ROWS.notable, 2, b.stats, b.desc);
    link(gate.id, first.id);
    link(first.id, second.id);
    link(second.id, notable.id);
    link(notable.id, bridge.id);
    return notable;
  });
  return {
    id: a.id, name: a.name, classId: a.classId, quote: a.quote, line: a.line, plays: a.plays,
    gate, notables, capstone, nodes: Object.values(nodes),
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
      { key: 'steady_aim', name: 'Steady Aim', desc: 'Taking a hit removes 40% less Momentum.', stats: { momentumRetain: 40 }, small: { name: 'Composed', stats: { accuracy: 25, evasionPct: 5 } } },
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
    id: 'wildcaster', name: 'Wildcaster', classId: 'mage', quote: 'Spend it all.',
    line: 'Mana is Power flipped: the emptier you are, the harder you hit.',
    plays: 'The opposite of careful mana use. You burn the tank on cheap spells, peak near empty, then wait out a dry spell. Max mana stops being damage and mana regen becomes pacing, so gear choices flip.',
    gate: 'Mana is Power is reversed: 30% more spell damage at empty mana, 0% at full.',
    branches: [
      { key: 'ragged_edge', name: 'Ragged Edge', desc: '+15% to the Mana is Power bonus below 25% Mana.', small: { name: 'Reckless', stats: { spellPct: 6 } } },
      { key: 'feedback', name: 'Feedback', desc: 'Kills restore 2% of your Mana.', small: { name: 'Quickening', stats: { manaRegenPct: 15 } } },
      { key: 'backdraft', name: 'Backdraft', desc: 'Spells cost 30% less while you’re below half Mana.', small: { name: 'Haste', stats: { castSpeedPct: 3 } } },
    ],
    bridge: { name: 'Torrent', stats: { spellPct: 8, manaCostReduction: 4 } },
    capstone: { key: 'burnout', name: 'Burnout', desc: 'Running dry makes your next 3 spells free at the full bonus. It rearms above half Mana.' },
  },
  {
    id: 'alchemist', name: 'Alchemist', classId: 'mage', quote: 'The brew is the spell.',
    line: 'Flask charges count as mana, and every flask you drink explodes.',
    plays: 'Flasks are your main weapon. Kills refill charges and charges fuel spells, so fast clearing feeds itself, and it pairs with Instilling Orb auto-flasks for idling. Flask Effect becomes a damage stat.',
    gate: 'Each flask charge counts as 3 Mana for Mana is Power, and every flask you drink bursts on your target for fire damage.',
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
      { key: 'scourge', name: 'Scourge', desc: 'Fervor from self-harm counts for 50% more nova damage.', small: { name: 'Lash', stats: { novaPct: 8 } } },
      { key: 'mortify', name: 'Mortify', desc: '25% more damage while below half Life.', small: { name: 'Vigil', stats: { lifeRegen: 2 } } },
      { key: 'absolution', name: 'Absolution', desc: '30% increased holy nova healing.', stats: { novaHeal: 30 }, small: { name: 'Mercy', stats: { life: 12, novaHeal: 3 } } },
    ],
    bridge: { name: 'Hair Shirt', stats: { lifeRegenPct: 0.2, fervorPct: 5 } },
    capstone: { key: 'ecstasy', name: 'Ecstasy', desc: 'While below half Life your skills are 15% faster and cost no Mana.' },
  },
  {
    id: 'lightkeeper', name: 'Lightkeeper', classId: 'templar', quote: 'Hold the light until it’s needed.',
    line: 'You store novas and release them when it counts.',
    plays: 'The hands-on Templar. Save novas through a fight, then spend them on a boss wind-up as a burst and a heal. Left alone it releases at full, and reactive rules let it hold for the right moment on idle.',
    gate: 'Fervor stores up to 3 novas, released when full unless your release setting or a click says otherwise.',
    branches: [
      { key: 'reserve', name: 'Reserve', desc: 'Novas released together deal 20% more damage for each one after the first.', small: { name: 'Banked Light', stats: { novaPct: 8 } } },
      { key: 'vespers', name: 'Vespers', desc: 'A nova also grants a shield of 15% of your Life.', small: { name: 'Evensong', stats: { shieldEffect: 6 } } },
      { key: 'beacon', name: 'Beacon', desc: 'A nova breaks the armour of everything on every ring for 4s.', small: { name: 'Lantern', stats: { allRes: 2, fervorPct: 3 } } },
    ],
    bridge: { name: 'Patience', stats: { fervorPct: 6, novaPct: 8 } },
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

/** What each trial grants. Trial 3 stands at the first stage of Act 6 and opens the capstones. */
export const TRIALS: { n: 1 | 2 | 3; zoneId: string; points: number }[] = [
  { n: 1, zoneId: 'pilgrimgate', points: 2 },
  { n: 2, zoneId: 'giantsthrone', points: 2 },
  { n: 3, zoneId: 'exilesgate', points: 2 },
];

/** The trial that opens a node, in words. */
export const TRIAL_SEAL: Record<1 | 2 | 3, string> = {
  1: 'Opens with the first trial',
  2: 'Sealed until the trial at the Giants’ Throne, at the end of Act 4',
  3: 'Sealed until the trial at the Exiles’ Gate, at the start of Act 6',
};

/** Everything past the free gate: earned points stop here. */
export const ASCENDANCY_MAX_POINTS = 11;

/** Bosses of these acts give an ascendancy point the first time they fall. */
export const ASCENDANCY_BOSS_ACTS = [3, 4, 5, 6];

/** Switching costs this many of the rare material, plus an Orb of Regret per node. */
export const SWITCH_MATERIAL = 'divine';
export const SWITCH_MATERIAL_COST = 1;

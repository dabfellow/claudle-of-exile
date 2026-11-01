import { benchBuilt, findItem } from '../engine/crafting';
import type { GameEvent, GameState } from '../engine/types';
import { baseDef } from './bases';
import { flaskDef } from './flasks';
import { BENCH_BUILT_LEVEL, stationDef } from './hideout';

const drank = (e: GameEvent, kind: 'life' | 'mana') => (e.t === 'flask' && !e.auto && flaskDef(e.flaskId).kind === kind ? 1 : 0);
const isWeapon = (baseId: string) => baseDef(baseId).slot === 'weapon';
const wieldsBlue = (s: GameState) => (s.equipment.weapon?.rarity ?? 'normal') !== 'normal';

export interface TutorialStep {
  id: string;
  title: string;
  /** what the guide says */
  npc: string;
  objective: string;
  target: number;
  /** page that satisfies a "visit" step */
  visitPage?: string;
  /** data-tut ids to pulse while this step is active */
  highlight: string[];
  /** how much progress an event is worth (0 = ignore) */
  match?: (e: GameEvent, s: GameState) => number;
  /** already settled, so the step passes by unpaid: a blue weapon in hand, or a bench the account built on another character */
  done?: (s: GameState) => boolean;
  reward: Record<string, number>;
  rewardText: string;
}

export const GUIDE_NAME = 'Old Brannoc';

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'visit_combat',
    title: 'Washed Ashore',
    npc: "Still breathing? Good. The tide spits out more corpses than exiles. Let's see if you can swing that thing — open the Campaign.",
    objective: 'Open the Campaign tab',
    target: 1,
    visitPage: 'campaign',
    highlight: ['nav-campaign'],
    reward: {},
    rewardText: '',
  },
  {
    id: 'enter_zone',
    title: 'Into the Shallows',
    npc: 'The Mud Flats are crawling with drowned things. Weak ones. Mostly. Travel there.',
    objective: 'Enter The Mud Flats',
    target: 1,
    highlight: ['zone-mudflats'],
    match: (e) => (e.t === 'combatStart' && e.zoneId === 'mudflats' ? 1 : 0),
    reward: {},
    rewardText: '',
  },
  {
    id: 'slay',
    title: 'Blood in the Water',
    npc: "Your Default Attack swings on its own. Your skills wait for you: click one or press Q–Y, or give it a rule on the Skills page and it'll fire by itself. Kill a few.",
    objective: 'Slay monsters',
    target: 3,
    highlight: [],
    match: (e) => (e.t === 'kill' ? 1 : 0),
    reward: { gold: 20 },
    rewardText: '20 gold',
  },
  {
    id: 'flask',
    title: 'Drink Up',
    npc: 'Hurt? The red flask on your belt is Life, and it refills as you kill. Click it — or press 1 — before you need it, not after.',
    objective: 'Drink your Life Flask during combat',
    target: 1,
    highlight: ['flask-0', 'nav-combat'],
    match: (e) => drank(e, 'life'),
    reward: { transmute: 1 },
    rewardText: 'Orb of Transmutation',
  },
  {
    id: 'mana_flask',
    title: 'Mind the Well',
    npc: "Nobody gets mana back in a fight. Your skills drink it, and the blue flask pours it back. Use a skill, then drink — or press 2.",
    objective: 'Drink your Mana Flask during combat',
    target: 1,
    highlight: ['flask-1', 'nav-combat'],
    match: (e) => drank(e, 'mana'),
    reward: { gold: 30 },
    rewardText: '30 gold',
  },
  {
    id: 'mine',
    title: 'Honest Work',
    npc: "Fighting's not the only way to get strong. There's copper in the cliffs, and the anvil is hungry. Bring me fifteen ore — I'll throw in the wood.",
    objective: 'Mine Copper Ore',
    target: 15,
    highlight: ['nav-mining', 'action-mine_copper'],
    match: (e) => (e.t === 'produce' && e.skill === 'mining' ? (e.outputs.copper_ore ?? 0) : 0),
    reward: { ash_log: 6 },
    rewardText: '6 Ash Logs',
  },
  {
    id: 'smith',
    title: 'Forge a Weapon',
    npc: "Ore and wood make gear. Open the Weapons tab on the Smithing page and hammer out the same kind you're holding — 15 ore, 6 logs, about ten seconds at the anvil. The better your Smithing, the better the item level.",
    objective: 'Smith a weapon',
    target: 1,
    highlight: ['nav-smithing', 'smith-tab-weapon'],
    match: (e) => (e.t === 'produce' && e.baseId && isWeapon(e.baseId) ? 1 : 0),
    reward: { transmute: 1 },
    rewardText: 'Orb of Transmutation',
  },
  {
    id: 'transmute',
    title: 'A Touch of Magic',
    npc: "Plain steel is boring. At the Crafting Bench, pick your new weapon from the bag and rub a Transmutation orb on it. It comes out blue, with a modifier or two. Don't ask me how that works.",
    objective: 'Transmute a weapon',
    target: 1,
    highlight: ['nav-bench', 'orb-transmute'],
    match: (e, s) => {
      if (e.t !== 'craft' || e.orbId !== 'transmute') return 0;
      const item = findItem(s, e.uid);
      return item && isWeapon(item.baseId) ? 1 : 0;
    },
    done: wieldsBlue,
    reward: { augment: 2 },
    rewardText: '2 Orbs of Augmentation',
  },
  {
    id: 'equip',
    title: 'Dress for the Grave',
    npc: 'Now put that blue blade in your hand: click it in your bag on the Equipment page. Those Augmentation orbs can add another modifier first, if it has room.',
    objective: 'Equip your blue weapon',
    target: 1,
    highlight: ['nav-equipment'],
    match: (e, s) => (e.t === 'equip' && wieldsBlue(s) ? 1 : 0),
    done: wieldsBlue,
    reward: { gold: 50 },
    rewardText: '50 gold',
  },
  {
    id: 'hideout',
    title: 'A Proper Workshop',
    npc: "Orbs work anywhere, but that bench of yours is barely a plank. Come back to your Hideout. I've left you what it takes to build it properly.",
    objective: 'Open your Hideout',
    target: 1,
    visitPage: 'hideout',
    highlight: ['nav-hideout'],
    done: benchBuilt,
    reward: stationDef('bench').levels[BENCH_BUILT_LEVEL - 1].cost,
    rewardText: '1,500 gold, 200 Ash Logs, 200 Copper Ore',
  },
  {
    id: 'build_bench',
    title: 'Raise the Bench',
    npc: 'Gold, logs, ore: all there. Scroll down to your stations and upgrade the Crafting Bench, and you can break down gear you no longer need.',
    objective: 'Build the Crafting Bench',
    target: 1,
    highlight: ['upgrade-bench'],
    match: (e) => (e.t === 'stationUpgraded' && e.id === 'bench' && e.level >= BENCH_BUILT_LEVEL ? 1 : 0),
    done: benchBuilt,
    reward: {},
    rewardText: '',
  },
  {
    id: 'salvage',
    title: 'Nothing Wasted',
    npc: "Your old weapon's still in your bag, and it's no use to anyone in one piece. Pick it at the Crafting Bench and salvage it. Arcane Dust is what orbs are made of — Alchemy turns one into the other.",
    objective: 'Salvage an item',
    target: 1,
    highlight: ['nav-bench', 'salvage-item'],
    match: (e) => (e.t === 'salvage' ? 1 : 0),
    reward: { arcane_dust: 12 },
    rewardText: '12 Arcane Dust',
  },
  {
    id: 'passive',
    title: 'Grow Stronger',
    npc: 'Every fight teaches you something. Spend what you learned on the passive tree — start next to your class.',
    objective: 'Allocate a passive point',
    target: 1,
    highlight: ['nav-tree', 'tree-start'],
    match: (e) => (e.t === 'allocate' ? 1 : 0),
    reward: { regret: 1 },
    rewardText: 'Orb of Regret',
  },
  {
    id: 'boss',
    title: 'The Bloated Gorger',
    npc: "Something big lurks in the flats. Kill enough of its brood, then challenge it from the top of the Combat page. When it winds up, your guard skill should answer — or drink.",
    objective: 'Defeat the Bloated Gorger',
    target: 1,
    highlight: ['nav-campaign', 'zone-mudflats'],
    match: (e) => (e.t === 'kill' && e.boss ? 1 : 0),
    reward: { regal: 1, gold: 150 },
    rewardText: 'Regal Orb + 150 gold',
  },
];

import type { GameEvent } from '../engine/types';
import { flaskDef } from './flasks';

const drank = (e: GameEvent, kind: 'life' | 'mana') => (e.t === 'flask' && !e.auto && flaskDef(e.flaskId).kind === kind ? 1 : 0);

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
  match?: (e: GameEvent) => number;
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
    npc: "Fighting's not the only way to get strong. There's copper in the cliffs, and the anvil is hungry. Bring me nine ore — I'll throw in the wood.",
    objective: 'Mine Copper Ore',
    target: 9,
    highlight: ['nav-mining', 'action-mine_copper'],
    match: (e) => (e.t === 'produce' && e.skill === 'mining' ? (e.outputs.copper_ore ?? 0) : 0),
    reward: { ash_log: 6 },
    rewardText: '6 Ash Logs',
  },
  {
    id: 'smith',
    title: 'Forge Something',
    npc: 'Ore and wood make gear. Gloves or boots are cheapest — 9 ore, 3 logs, about ten seconds at the anvil. The better your Smithing, the better the item level.',
    objective: 'Smith any item',
    target: 1,
    highlight: ['nav-smithing'],
    match: (e) => (e.t === 'produce' && e.skill === 'smithing' ? 1 : 0),
    reward: { transmute: 1 },
    rewardText: 'Orb of Transmutation',
  },
  {
    id: 'transmute',
    title: 'A Touch of Magic',
    npc: "Plain gear is boring. At the Crafting Bench, pick it from your bag and rub a Transmutation orb on it. Don't ask me how that works.",
    objective: 'Use an Orb of Transmutation',
    target: 1,
    highlight: ['nav-bench', 'orb-transmute'],
    match: (e) => (e.t === 'craft' && e.orbId === 'transmute' ? 1 : 0),
    reward: { augment: 2 },
    rewardText: '2 Orbs of Augmentation',
  },
  {
    id: 'equip',
    title: 'Dress for the Grave',
    npc: 'Now put something on. The ▲ marks anything better than what you wear.',
    objective: 'Equip an item',
    target: 1,
    highlight: ['nav-equipment'],
    match: (e) => (e.t === 'equip' ? 1 : 0),
    reward: { gold: 50 },
    rewardText: '50 gold',
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
    npc: "Something big lurks in the flats. Kill enough of its brood and it'll come for you. When it winds up, your guard skill should answer — or drink.",
    objective: 'Defeat the Bloated Gorger',
    target: 1,
    highlight: ['nav-campaign', 'zone-mudflats'],
    match: (e) => (e.t === 'kill' && e.boss ? 1 : 0),
    reward: { regal: 1, gold: 150 },
    rewardText: 'Regal Orb + 150 gold',
  },
];

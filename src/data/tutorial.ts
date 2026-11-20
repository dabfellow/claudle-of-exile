import { isClassic } from '../engine/challenge';
import type { GameEvent, GameState } from '../engine/types';
import { flaskDef } from './flasks';

const drank = (e: GameEvent, kind: 'life' | 'mana') => (e.t === 'flask' && !e.auto && flaskDef(e.flaskId).kind === kind ? 1 : 0);
/** a skill on the bar that fires by a rule rather than waiting for a click */
const automated = (s: GameState) => s.skillBar.some((g) => g && g.rules[0] && g.rules[0].when !== 'manual');

export interface TutorialStep {
  id: string;
  title: string;
  /** what the guide says */
  npc: string;
  /** said instead to a Classic character, where that character's game differs */
  classicNpc?: string;
  objective: string;
  target: number;
  /** page that satisfies a "visit" step */
  visitPage?: string;
  /** data-tut ids to pulse while this step is active */
  highlight: string[];
  /** how much progress an event is worth (0 = ignore) */
  match?: (e: GameEvent, s: GameState) => number;
  /** already settled, so the step passes by unpaid */
  done?: (s: GameState) => boolean;
  /** finished by how things stand rather than by an event (a skill given a rule, say): paid as usual */
  met?: (s: GameState) => boolean;
  reward: Record<string, number>;
  rewardText: string;
  /** the same, where a Classic character is paid in gold instead */
  classicRewardText?: string;
}

export const rewardText = (s: GameState, step: TutorialStep): string => (isClassic(s) && step.classicRewardText) || step.rewardText;

export const GUIDE_NAME = 'Old Brannoc';

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'visit_combat',
    title: 'Washed Ashore',
    npc: "Still breathing? Good. The tide spits out more corpses than exiles. Let's see if you can swing that thing — open the World Map.",
    objective: 'Open the World Map tab',
    target: 1,
    visitPage: 'campaign',
    highlight: ['nav-campaign'],
    reward: {},
    rewardText: '',
  },
  {
    id: 'enter_zone',
    title: 'Into the Shallows',
    npc: 'Brinewick Shore is crawling with drowned things. Weak ones. Mostly. Open Act 1 on the map and travel there.',
    objective: 'Enter Brinewick Shore',
    target: 1,
    highlight: ['zone-mudflats', 'act-1'],
    match: (e) => (e.t === 'combatStart' && e.zoneId === 'mudflats' ? 1 : 0),
    reward: {},
    rewardText: '',
  },
  {
    id: 'slay',
    title: 'Blood in the Water',
    npc: "See that? Your Default Attack swings by itself, so you can stand there and let it work. Kill a few.",
    objective: 'Slay monsters',
    target: 3,
    highlight: [],
    match: (e) => (e.t === 'kill' ? 1 : 0),
    reward: { gold: 20 },
    rewardText: '20 gold',
  },
  {
    id: 'use_skill',
    title: 'Steel and Sorcery',
    npc: "Your skills don't fire on their own yet. They sit on the bar under the fight, waiting for you. Click one, or press Q.",
    objective: 'Use a skill from your skill bar',
    target: 1,
    highlight: ['skill-0', 'nav-combat'],
    match: (e) => (e.t === 'skill' && e.slot >= 0 ? 1 : 0),
    reward: { transmute: 1 },
    rewardText: 'Orb of Transmutation',
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
    id: 'automate',
    title: 'Let It Fight',
    npc: "Clicking every swing gets old. On the Skills page, click a skill and give it a rule, and it fires by itself whenever the rule says. The suggested rule is a fine start.",
    objective: 'Give a skill an automatic rule',
    target: 1,
    highlight: ['nav-skills', 'suggested-rule'],
    met: automated,
    reward: { augment: 2 },
    rewardText: '2 Orbs of Augmentation',
  },
  {
    id: 'pickup',
    title: 'Spoils of the Shore',
    npc: "The drowned drop what they carried, and it lies on the ground under the fight until you pick it up. Die once and it's at risk; die again and the tide takes it.",
    objective: 'Pick up an item from the ground',
    target: 1,
    highlight: ['nav-combat', 'pick-up'],
    met: (s) => s.inventory.length > 0,
    reward: {},
    rewardText: '',
  },
  {
    id: 'equip',
    title: 'Dress for the Grave',
    npc: "Now wear it. Open the Equipment page, click the item in your bag and choose Equip. Hover over it first to compare it with what you have on.",
    objective: 'Equip an item you found',
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
    npc: "Something big lurks on the shore. Kill enough of its brood, then challenge it from the top of the Combat page. When it winds up, your guard skill should answer — or drink.",
    objective: 'Defeat the Bloated Gorger',
    target: 1,
    highlight: ['nav-campaign', 'zone-mudflats'],
    match: (e) => (e.t === 'kill' && e.boss ? 1 : 0),
    reward: { regal: 1, gold: 150 },
    rewardText: 'Regal Orb + 150 gold',
  },
];

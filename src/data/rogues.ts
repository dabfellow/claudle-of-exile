
export interface TalentNode {
  id: number;
  name: string;
  effect: string;
  tier: number;
}

export interface Rogue {
  id: string;
  name: string;
  class: string;
  primary: string;
  secondary: string[];
  level: number;
  xp: number;
  talents: number[]; // Unlocked node IDs
  talentTree: TalentNode[];
}

export const ROGUES: Rogue[] = [
  { id: 'infiltrator', name: 'Kael', class: 'Infiltrator', primary: 'Alarm Suppression', secondary: ['Move speed', 'Trap Bypass'], level: 1, xp: 0, talents: [], talentTree: [] },
  { id: 'locksmith', name: 'Zara', class: 'Locksmith', primary: 'Vault Access', secondary: ['Loot Quantity', 'Crit Hit Boost'], level: 1, xp: 0, talents: [], talentTree: [] },
  { id: 'lookout', name: 'Finn', class: 'Lookout', primary: 'Threat Reveal', secondary: ['Alarm Gain Red.', 'Ambush Detection'], level: 1, xp: 0, talents: [], talentTree: [] },
  { id: 'saboteur', name: 'Jax', class: 'Saboteur', primary: 'Trap Sabotage', secondary: ['Alarm Gain Red.', 'Loot Quality'], level: 1, xp: 0, talents: [], talentTree: [] },
  { id: 'grifter', name: 'Mira', class: 'Grifter', primary: 'Market Manipulation', secondary: ['Loot Quantity', 'Alarm Suppression'], level: 1, xp: 0, talents: [], talentTree: [] },
  { id: 'bruiser', name: 'Torin', class: 'Bruiser', primary: 'Guard Distraction', secondary: ['Ambush Detection', 'Move Speed'], level: 1, xp: 0, talents: [], talentTree: [] },
  { id: 'shadow', name: 'Vex', class: 'Shadow', primary: 'Stealth Movement', secondary: ['Trap Bypass', 'Crit Hit Boost'], level: 1, xp: 0, talents: [], talentTree: [] },
  { id: 'tracker', name: 'Elara', class: 'Tracker', primary: 'Pathfinding', secondary: ['Threat Reveal', 'Loot Quality'], level: 1, xp: 0, talents: [], talentTree: [] },
  { id: 'pickpocket', name: 'Pip', class: 'Pickpocket', primary: 'Loot Enhancement', secondary: ['Market Manipulation', 'Crit Hit Boost'], level: 1, xp: 0, talents: [], talentTree: [] },
  { id: 'hacker', name: 'Echo', class: 'Hacker', primary: 'System Override', secondary: ['Vault Access', 'Alarm Suppression'], level: 1, xp: 0, talents: [], talentTree: [] },
  { id: 'acrobat', name: 'Sia', class: 'Acrobat', primary: 'Obstacle Evasion', secondary: ['Move Speed', 'Trap Bypass'], level: 1, xp: 0, talents: [], talentTree: [] },
  { id: 'vigilante', name: 'Krix', class: 'Vigilante', primary: 'Guard Takedown', secondary: ['Ambush Detection', 'Guard Distraction'], level: 1, xp: 0, talents: [], talentTree: [] }
];

export const SPECIALTIES = ROGUES.map((r) => r.primary);
const SIGNATURES = ['Silent Entry', 'Master Key', 'Omni-Reveal', 'Dead Circuit', 'Golden Deal', 'Decoy Crew', 'Ghost Walk', 'Hidden Route', 'Perfect Lift', 'Root Access', 'Impossible Leap', 'Silent Justice'];
for (const [index, rogue] of ROGUES.entries()) {
  rogue.talentTree = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: i < 4 ? `${rogue.class} Expertise ${i + 1}` : i < 9 ? `Lucky Pockets ${i - 3}` : SIGNATURES[index],
    tier: i < 4 ? 1 : i < 9 ? 2 : 3,
    effect: i < 4 ? `+5% success chance in ${rogue.primary} rooms.` : i < 9 ? '+10% gold from Greed bonus loot.' : index === 2 ? 'All room threats are revealed without scouting.' : `Free bypass of ${rogue.primary} rooms without spending an ability.`,
  }));
}

/** Character-owned progress; definitions above are never mutated by gameplay. */
export interface RogueProgress {
  level: number;
  xp: number;
  talents: number[];
  mastered: string[];
  training?: { specialty: string; remaining: number };
}
export const newRoster = (): Record<string, RogueProgress> => Object.fromEntries(ROGUES.map((r) => [r.id, { level: 1, xp: 0, talents: [], mastered: [] }]));
export const rogueLevelXp = (level: number) => level * 100;
export const talentPoints = (r: RogueProgress) => Math.min(10, Math.max(0, Math.floor((r.level - 10) / 5))) - r.talents.length;

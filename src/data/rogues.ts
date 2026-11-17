
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
  { id: 'infiltrator', name: 'Kael', class: 'Infiltrator', primary: 'Alarm Suppression', secondary: ['Move speed', 'Trap bypass'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'Quiet Step', effect: '+5% Alarm Suppression', tier: 1}] },
  { id: 'locksmith', name: 'Zara', class: 'Locksmith', primary: 'Vault Access', secondary: ['Loot quantity', 'Crit hit boost'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'Precision Picks', effect: '+5% Vault Access', tier: 1}] },
  { id: 'lookout', name: 'Finn', class: 'Lookout', primary: 'Threat Reveal', secondary: ['Alarm gain reduction', 'Ambush detection'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'Eagle Eye', effect: '+5% Threat Reveal', tier: 1}] },
  { id: 'saboteur', name: 'Jax', class: 'Saboteur', primary: 'Trap Sabotage', secondary: ['Alarm gain reduction', 'Loot quality'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'Blast Proof', effect: '+5% Trap Sabotage', tier: 1}] },
  { id: 'grifter', name: 'Mira', class: 'Grifter', primary: 'Market Manipulation', secondary: ['Loot quantity', 'Alarm suppression'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'Silver Tongue', effect: '+5% Market Manipulation', tier: 1}] },
  { id: 'bruiser', name: 'Torin', class: 'Bruiser', primary: 'Guard Distraction', secondary: ['Ambush detection', 'Move speed'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'Heavy Hitter', effect: '+5% Guard Distraction', tier: 1}] },
  { id: 'shadow', name: 'Vex', class: 'Shadow', primary: 'Stealth Movement', secondary: ['Trap bypass', 'Crit hit boost'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'Vanishing Act', effect: '+5% Stealth Movement', tier: 1}] },
  { id: 'tracker', name: 'Elara', class: 'Tracker', primary: 'Pathfinding', secondary: ['Threat reveal', 'Loot quality'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'True North', effect: '+5% Pathfinding', tier: 1}] },
  { id: 'pickpocket', name: 'Pip', class: 'Pickpocket', primary: 'Loot Enhancement', secondary: ['Market manipulation', 'Crit hit boost'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'Fast Fingers', effect: '+5% Loot Enhancement', tier: 1}] },
  { id: 'hacker', name: 'Echo', class: 'Hacker', primary: 'System Override', secondary: ['Vault access', 'Alarm suppression'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'Root Access', effect: '+5% System Override', tier: 1}] },
  { id: 'acrobat', name: 'Sia', class: 'Acrobat', primary: 'Obstacle Evasion', secondary: ['Move speed', 'Trap bypass'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'Graceful Leap', effect: '+5% Obstacle Evasion', tier: 1}] },
  { id: 'vigilante', name: 'Krix', class: 'Vigilante', primary: 'Guard Takedown', secondary: ['Ambush detection', 'Guard distraction'], level: 1, xp: 0, talents: [], talentTree: [{id: 1, name: 'Swift Justice', effect: '+5% Guard Takedown', tier: 1}] }
];

/** Recent changes, shown on the title screen, newest first. Written for players, and added to with each release. */
export interface NewsEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const NEWS: NewsEntry[] = [
  {
    version: '0.2.19',
    date: '31 Oct 2026',
    title: 'Gear sets and skill loadouts',
    items: [
      'Save what you wear as a gear set on the Equipment page, and put it back on with one click, from your bag or your stash.',
      'Save your skill bar as a loadout on the Skills page, with its supports, rules and priorities, so one skill can be set up for bosses and again for packs.',
      'Crafting Bench level 3 lets gear sets go on by themselves when you start fighting, chopping or anything else you pick.',
    ],
  },
  {
    version: '0.2.18',
    date: '31 Oct 2026',
    title: 'Mini-games for every skill',
    items: [
      'Thieving, Smithing, Alchemy, Gemcutting and Rune-carving now have mini-games of their own, so all your skills can build Focus.',
      'The Thieving game works during Heists too: Focus speeds up the rooms, and it carries over when a job repeats.',
    ],
  },
  {
    version: '0.2.17',
    date: '31 Oct 2026',
    title: 'A steadier combat screen',
    items: [
      'Skills and flasks now sit right under the battlefield, so you can use them without scrolling away from the fight.',
      'The Matchup panel stays one size and scrolls on its own, so the screen no longer jumps around during a fight.',
      "The area boss's abilities are always listed in Matchup, before you fight it and whoever you're targeting.",
    ],
  },
  {
    version: '0.2.16',
    date: '31 Oct 2026',
    title: 'Duelists answer every blow',
    items: [
      'Riposte now answers hits that land too, at half damage, so it fires about five times as often for a new Duelist.',
      'Ripostes are labelled on the battlefield in the Duelist colour.',
      'Matador and Vanguard keep their own triggers: evades only and blocks only.',
    ],
  },
  {
    version: '0.2.15',
    date: '31 Oct 2026',
    title: 'Faster levelling, stronger Focus',
    items: [
      "Levelling is much faster: a new level curve, and Act 1's XP slowdown is gone. You keep your level and progress.",
      "Being above an area's level range now costs XP: 10%, 20%, 40%, 50% and 80% for one to five levels over, then 1% more per level.",
      "Being below the range pays up to 20% more. Campaign and Combat show what you're getting.",
      'Focus now gives up to 45% speed, and an overflow bar keeps it going for a few seconds after you stop.',
      'Mining and Woodcutting swings no longer have a wait between them.',
    ],
  },
  {
    version: '0.2.14',
    date: '31 Oct 2026',
    title: 'Gather by hand',
    items: ['Mining, Woodcutting and Foraging now have mini-games. Play them to build Focus and gather up to 30% faster, or leave them running at the normal rate.'],
  },
  {
    version: '0.2.13',
    date: '31 Oct 2026',
    title: 'Holiday events',
    items: ['Big holidays and Double XP weekends can now run on a schedule. Look for the banner in game.'],
  },
  {
    version: '0.2.12',
    date: '31 Oct 2026',
    title: 'Limited-time events',
    items: ['Events like double XP and double loot can now run for a limited time. Look for the banner in game.'],
  },
  {
    version: '0.2.11',
    date: '31 Oct 2026',
    title: 'A steadier DPS meter',
    items: ['DPS in combat now shows your average over the last 2 seconds and holds it until the next update.'],
  },
  {
    version: '0.2.10',
    date: '31 Oct 2026',
    title: 'A DPS number you can trust',
    items: [
      'DPS in combat now shows the damage you actually dealt over the last 10 seconds: skills, ailments, ground effects and all.',
      'Gear sells for 50% more gold in Town.',
      'News now shows on the character screen too, so signed-in players see it.',
    ],
  },
  {
    version: '0.2.9',
    date: '31 Oct 2026',
    title: 'Salvage by rarity',
    items: ['The ground, offline finds and stash pages can now salvage gear by rarity, like the bag.'],
  },
  {
    version: '0.2.8',
    date: '31 Oct 2026',
    title: 'Smith without stopping',
    items: [
      'Smithing can now salvage new bases when your bag is full, instead of stopping.',
      'Just levelling up? Tick Salvage everything I smith. Both toggles need the Crafting Bench.',
      'The ground has a Salvage all button too.',
    ],
  },
  {
    version: '0.2.6',
    date: '31 Oct 2026',
    title: 'The City of Saints',
    items: [
      'Act 3 is open: 10 new areas, new bosses and 6 new uniques.',
      'Ascendancies: pass the first trial at the Pilgrim Gate to choose one of two paths for your class. Exile has none.',
      'Martyr bosses can\'t be hurt while their martyrs live. Skills can now be told what to aim at.',
      'New skills: Zealots and blood, built on bleeding and spending Life.',
      'New trainable skill: Rune-carving, for runes that enchant your gear.',
    ],
  },
  {
    version: '0.2.4',
    date: '31 Oct 2026',
    title: 'The Burning Steppe, rebuilt',
    items: [
      'Riders and raiders: charges, leaps, buffs and real curses.',
      'New trainable skill: Thieving, which feeds Heist runs.',
      'Ground rules at the War Table let a skill react to what you\'re standing on.',
      'A Challenge boss button lets you keep farming an area while its boss waits.',
      'Background music, with a volume control in Settings, and new item art.',
    ],
  },
  {
    version: '0.2.4',
    date: '31 Oct 2026',
    title: 'Offline play and accounts: please read',
    items: [
      'Offline time now starts at 8 hours. Upgrade the Watchtower to raise it toward 24.',
      'Offline boss fights and wind-up rules are now earned at the War Table.',
      'Offline combat stops when you die.',
      'Your hideout, gear stash and rule unlocks are now shared across your characters.',
      'Act 1 takes longer than it did.',
    ],
  },
];

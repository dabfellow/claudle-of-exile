/** Recent changes, shown on the title screen, newest first. Written for players, and added to with each release. */
export interface NewsEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const NEWS: NewsEntry[] = [
  {
    version: '0.2.38',
    date: '1 Nov 2026',
    title: 'The Wellspring',
    items: [
      'The Mage’s Wildcaster is gone, because it punished you for keeping your mana full. The Wellspring takes its place.',
      'Mana you would waste at full now fills Overflow. A full meter makes your next damaging spell free, with 100% more damage.',
      'Wildcasters become Wellsprings automatically, and get their ascendancy points back to spend.',
    ],
  },
  {
    version: '0.2.37',
    date: '1 Nov 2026',
    title: 'A new tutorial',
    items: [
      'New characters now learn by crafting: smith a weapon, turn it blue with a Transmutation orb and wield it.',
      'Old Brannoc then pays for your Crafting Bench, and you salvage your old weapon on it.',
      'If you are partway through the tutorial, you stay on your step. Later characters pass steps they have already settled, without the reward.',
    ],
  },
  {
    version: '0.2.36',
    date: '1 Nov 2026',
    title: 'The roads fork',
    items: [
      'Acts 3 to 6 are no longer a straight line. Roads split and rejoin, and side areas branch off them, so you choose your way through each act.',
      "Each of these act bosses now waits until you've beaten most of its act's bosses: 7 of 9 in Act 3, 8 of 11 in Act 4, 10 of 13 in Act 5 and 14 of 17 in Act 6. Skip what you like within that.",
      'Every area and every boss is still there, and side areas keep their bosses, ascendancy points and drops.',
      'Your progress is safe: everything you had open stays open, and some areas may open early.',
      'The act maps are bigger, and area names no longer overlap.',
    ],
  },
  {
    version: '0.2.35',
    date: '1 Nov 2026',
    title: 'War Table reshuffled',
    items: [
      'Wind-up rules now come with Vitals rules at War Table level 2, so offline boss fights arrive much sooner.',
      'The 2nd rule slot moved to level 5. Nobody loses anything: if you already have the 2nd slot, you keep it, and your War Table moves up to level 5 with everything below it unlocked.',
    ],
  },
  {
    version: '0.2.33',
    date: '1 Nov 2026',
    title: 'The whole campaign is open',
    items: [
      'Acts 4, 5 and 6 are open: The Hollow Peaks, The Sunless Sea and The Shattered Throne, with 44 new areas and new uniques.',
      "New boss mechanics: Frostbite slows you until you freeze, Channels must be broken in time, and Act 6's Echoes bring back old mechanics two at a time.",
      'New skills in every act: Giants and weight, Tides and summons, and The last empire, the strongest skills in the game.',
      'New trainable skills: Archaeology, Cooking and Cartography.',
      'The last two ascendancy trials are here, at the end of Act 4 and the start of Act 6.',
      'Beating Act 6 opens the Map Device and unlocks the Exile. Maps are still being built, so expect that page to be bare for now.',
    ],
  },
  {
    version: '0.2.32',
    date: '1 Nov 2026',
    title: 'Clearer Hideout upgrades',
    items: [
      'Each Hideout station now has its own card: what it gives you right now, every tier with the ones you own ticked off, and the next upgrade with its cost. Hover a later tier to see what it will cost.',
      'The Next level and cost details no longer vanish on narrower windows.',
    ],
  },
  {
    version: '0.2.31',
    date: '1 Nov 2026',
    title: 'One stash for all your characters',
    items: [
      'Every Stash tab is now shared: gold, currency, materials, spare gems and spare flasks join your gear pages. What each of your characters was holding has been added together.',
      'Your skill bar and flask belt still belong to each character. If you end up with more than 10 of one spare flask, the worst are sold for gold, as usual.',
    ],
  },
  {
    version: '0.2.30',
    date: '1 Nov 2026',
    title: 'Compare gear, and new ailments',
    items: [
      "Hover over an item to compare it with what you're wearing: its base damage, speed, crit and defences, each skill's damage per second, and what changes on your character.",
      'The green upgrade arrows are gone, along with the Upgrade sort and Pick up upgrades, because they hid the reasoning behind one score.',
      'Skill tooltips now count spell damage, ailment modifiers and accuracy, so their damage numbers will change.',
      "Ailments rebuilt: fire burns, cold chills and lightning shocks, each on a chance from skills and gear. Burn builds to Ignite, chill builds to Freeze, and shock grows stronger, all against the target's life, so big enemies take longer.",
      'Chaos damage arrives on gear, and Poison Dart now deals half of its damage as chaos.',
    ],
  },
  {
    version: '0.2.27',
    date: '1 Nov 2026',
    title: 'Getting ready for what comes next',
    items: [
      'The skilling tree has grown, with new branches for skills still to come, and everyone gets a few more points to spend in it.',
      'The rest of the campaign is on its way behind the scenes. Nothing changes in your game yet.',
    ],
  },
  {
    version: '0.2.21',
    date: '31 Oct 2026',
    title: 'Boss farming',
    items: [
      "Once you've beaten an area's boss, Boss farm on its Campaign card or the Combat page brings it back 5 seconds after each kill, with no other monsters in between.",
      'Bosses can now drop a small amount of ore, logs and herbs for their level.',
    ],
  },
  {
    version: '0.2.20',
    date: '31 Oct 2026',
    title: 'Gear sets and skill loadouts',
    items: [
      'Save what you wear as a gear set on the Equipment page, and put it back on with one click, from your bag or your stash.',
      'Save your skill bar as a loadout on the Skills page, with its supports, rules and priorities, so one skill can be set up for bosses and again for packs.',
      'Crafting Bench level 3 lets gear sets go on by themselves when you start fighting, chopping or anything else you pick.',
    ],
  },
  {
    version: '0.2.19',
    date: '31 Oct 2026',
    title: 'A tidier sidebar',
    items: [
      'The sidebar is sorted into Adventure, Character, Gathering, Crafting and Progress, so pages are easier to find.',
      'The Crafting Bench now sits with Smithing, Alchemy and the other crafts.',
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

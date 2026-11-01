/** Recent changes, shown on the title screen, newest first. Written for players, and added to with each release. */
export interface NewsEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export const NEWS: NewsEntry[] = [
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

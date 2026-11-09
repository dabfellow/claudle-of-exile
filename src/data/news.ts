/** Recent changes, shown on the title screen, newest first. Written for players, and added to with each release. */
export interface NewsEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

/**
 * Changes made since the last release, one plain line each for players. Not shown in game.
 * Each change that players will notice adds a line here. A release moves them into a new NEWS entry and empties this.
 */
export const UPCOMING: string[] = [
  'Holiday events now start and end by themselves each year: New Year, Valentine\'s Day, Easter, Summer, Halloween, Thanksgiving and Christmas.',
  'Events that run at the same time now add their bonuses together: two Double XP events give triple XP.',
  'The Hideout has an Events card showing what\'s on now and what\'s coming next, and the event banner shows how long is left.',
  'A heads-up line appears at the top of the screen when an event starts within 3 days.',
  'Some events can now run every weekend, Friday evening to Monday morning (UTC).',
];

export const NEWS: NewsEntry[] = [
  {
    version: '0.4.22',
    date: '9 Nov 2026',
    title: 'Every Screen, Looked Over',
    items: [
      'The tutorial quest no longer covers the button it asks you to press on phones, and a "Show me" button scrolls to it.',
      'Creating a character is now two steps: choose your class, then pick a name and challenge modes.',
      'On phones, Combat keeps your target\'s life, your Life/ES/Mana, skills and flasks in one strip at the bottom of the screen.',
      'On phones, tapping a skill or flask just uses it; press and hold to see its tooltip.',
      'On desktop, tooltips appear beside what you\'re hovering instead of on top of it.',
      'The target panel no longer squeezes a boss\'s abilities into a narrow column.',
      'Pop-up messages sit out of the way in a corner (the top on phones), and you can click one to dismiss it.',
      'The top bar no longer shows a fixed currency list: pin up to 5 currencies (gold included) from the Stash\'s Currency tab.',
      'Coming back after a long time away no longer freezes the game: a progress screen shows while your time away is played out, and it\'s about twice as fast.',
      'The game version now shows at the end of the menu bar on phones.',
      'The Hideout banner now shows your Life, Mana, Energy Shield, Armour, Evasion and resistances at a glance.',
      'On phones, every Hideout section can be folded away, and it stays the way you left it.',
      'Your life skills, and whatever one is running right now, now sit beside your stats and gear in the Hideout.',
      'Hideout shortcuts now live in a bar pinned along the bottom of the page.',
      'Each Hideout station now leads with its next upgrade, what it costs and whether you can afford it; the full ladder folds away.',
      'The Campaign now opens on a map of the whole continent; pick an act to see its areas up close along winding roads.',
      'The Map Device is now a portal you load maps into, with an opening animation, painted map cards and Sextant orbs around the device.',
      'The Cartography map case now shows your maps as tier tiles.',
      'The Skills page is tidier: one gem bag with Skill and Support tabs, gems grouped by type, and each support shows which skills on your bar it fits.',
      'Setting up a skill now lists every support you own that fits it, one click to socket.',
      'The belt slot on the Equipment page is bigger and its art no longer pokes out.',
      'The Crafting Bench shows what you own of every crafting material, where more comes from, and have/need on bench costs.',
      'Fixed the Crafting Bench\'s Special Materials tab turning the screen black.',
      'Stash gear can be searched by name and modifier, filtered by slot and rarity, and searched across every page at once; materials can be searched and filtered too.',
      'Town shops show what you\'re wearing in that slot, whether you can use an item, how much gold you\'re short, and how many of a gem you already have; offers fit phones better.',
      'Settings is split into tabs along the top: Game, Loot filters, Display, Sound, Account and Feedback.',
      'Trackpad pinch zooms the passive tree smoothly, and two-finger pinch now works on phones.',
      'Cooking, Cartography and other locked life skills always show in the sidebar, with a page saying how to unlock them.',
      'If a page ever crashes, it now shows what went wrong with a way back instead of a black screen.',
      'The Player Market is closed for 1.0. If you still have listings or items waiting, a "Market (closing)" page lets you collect them and cancel listings.',
    ],
  },
  {
    version: '0.4.21',
    date: '8 Nov 2026',
    title: 'Plan Before You Commit',
    items: [
      'Passive tree nodes now open a persistent preview before spending or refunding anything, with a separate confirmation button that works safely on touchscreens.',
      'Character levels now grant 1 Passive Point instead of 3, while keeping 2 Travel Points so routes remain usable and major upgrades require real choices.',
      'Cold, Fire, Lightning, Chaos, Bleed, Poison, and Projectile clusters are now spread across distant parts of the passive tree instead of being packed into one class wedge.',
    ],
  },
  {
    version: '0.4.20',
    date: '8 Nov 2026',
    title: 'Sharper Passive Choices',
    items: [
      'The passive tree now sits on a painted backdrop: a dim arcane circle tinted in each class\'s colour, with a star marking each Forbidden keystone.',
      'Each class now has its own general-purpose starting passives, tailored to its natural offence, defence and resource; the Mage reaches Mana regeneration immediately instead of finding Life regeneration first.',
      'Character levels now grant 2 Travel Points and 3 Passive Points instead of 3 Travel and 2 Passive, so reaching clusters and taking their useful buffs stay in balance.',
      'Doomed Gates now demand far harsher permanent sacrifices, but every notable in the twelve wheels behind them is substantially stronger.',
    ],
  },
  {
    version: '0.4.19',
    date: '8 Nov 2026',
    title: 'A New Passive Tree',
    items: [
      'The passive tree has a new, tighter map: no more long strips of travel nodes. Clusters link straight into their neighbours, across class borders too, in wheels, pokeballs, spirals, tridents and branching lines. Small nodes now carry the attribute bonuses travel nodes used to and are bought with travel points; notables and keystones still use passive points. Masteries now sit on the big three-notable clusters only. The twelve Forbidden keystones ring the edge evenly, and you can take only one of them. Every notable and keystone is unchanged. If your allocated path no longer joins up, your points are refunded in full when you load.',
      'Every class region now has its own notables instead of the same set six times: each leans into its class (armour and Warcries, Bleed and block, projectiles and Marks, Poison, Curses and Minions, Storms and Doom, Totems and resistances), the borders between classes mix both, and Curses, Totems, Minions, Marks, Warcries, Exertion, Storms and Doom all have clusters to build around. 18 new rule-changing notables, such as Crimson Flood (Bleeds stack twice), Twin Hexes, Ricochet and Beyond the Veil, wait deep in each region. Notables you already hold keep their place but may do something new, and so may mastery picks.',
    ],
  },
  {
    version: '0.4.18',
    date: '8 Nov 2026',
    title: 'Gateway Visual Fix and Organic Tree Shapes',
    items: [
      'Fixed Cosmic Gateway detection so only the 6 intended portals render as gateways instead of all approach roads.',
      'Replaced the passive skill tree background with a solid slate tone and removed looping SVG animations to eliminate pan and zoom stutter.',
      'Added organic cluster layouts including Pokeballs, Tridents, Winding Trails, and Spirals to bring structural variety and texture to passive clusters.',
    ],
  },
  {
    version: '0.4.17',
    date: '8 Nov 2026',
    title: 'Safer Saves, Working Supports and New Guides',
    items: [
      'Cloud saves are safer: a full browser storage no longer stops your progress reaching the cloud, and a device left open on an older save can no longer overwrite newer progress from another device.',
      'Maps support gems: 53 supports that did nothing beyond their numbers now work as described, including Hair Trigger, War Drum, Venom Totem and Endless Dread. Some descriptions were rewritten to say exactly what they do.',
      'Exertion skills now really fire their Exerted version when Exertion is full: more damage, and extra targets where the skill says so.',
      'Totems now apply their poison, and Ancestral Call’s Ancestors now deal the 50% weapon damage they promise.',
      'Hard Boss trophies now have uses: new high-tier Crafting Bench recipes, and the top hideout upgrades (Map Device, Forge, Alchemy Table, Crafting Bench, Watchtower, Trophy Altar) take a few of them.',
      'Melee skills like Twin Strike can no longer be used with a bow, and always reach one ring.',
      'Bars that go past their maximum, like Overflow Mana and stacking buffs, now show an overfill strip and a ×count instead of just looking full.',
      'New player guide pages: passive tree, runes, flasks, side systems, meals, Greenhouse, loadouts, challenge realms, Player Market, and Maps and the Atlas.',
    ],
  },
  {
    version: '0.4.16',
    date: '8 Nov 2026',
    title: 'Passive Tree Travel Nodes and Ring Reconstruction',
    items: [
      'Rebuilt the passive skill tree travel lanes and rings with clean spacing (666 travel nodes across the tree) and rebalanced travel node attributes (+4 primary attribute or +2/+2 hybrid) to match the 3-travel-points-per-level economy.',
    ],
  },
  {
    version: '0.4.15',
    date: '8 Nov 2026',
    title: 'Connecting Rings and Proximity Links',
    items: [
      'Passive tree now features three clean main concentric connecting rings (inner, mid, and outer) and connects visually close neighboring clusters directly.',
    ],
  },
  {
    version: '0.4.14',
    date: '8 Nov 2026',
    title: 'Passive Tree Pan and Zoom Performance',
    items: [
      'Passive tree dragging and wheel zooming are now buttery smooth using high-performance hardware-accelerated transforms and frame batching.',
    ],
  },
  {
    version: '0.4.13',
    date: '8 Nov 2026',
    title: 'Arterial Highways and Orbital Rings',
    items: [
      'Passive tree travel paths drastically shortened with direct arterial highways: no cluster is more than 6 travel steps away.',
      'Added two intermediate concentric orbital highway rings (Mid-Inner at r=1700 and Mid-Outer at r=2950) connecting all six class sectors.',
      'Cut total travel nodes across the tree by over 80% to eliminate tedious travel routing.',
    ],
  },
  {
    version: '0.4.12',
    date: '7 Nov 2026',
    title: 'Passive Tree Reset and Allocation Fix',
    items: [
      'Reset all character passive allocations across all three tree profiles so old builds start fresh on the new 5x tree layout with all points refunded.',
      'Fixed node click interaction so clicking reachable passive nodes and mastery sockets allocates them immediately.',
    ],
  },
  {
    version: '0.4.11',
    date: '7 Nov 2026',
    title: 'Clean Passive Tree Canvas',
    items: [
      'Removed node name text clutter from the passive tree canvas for a clean view; hover tooltips provide full details on demand.',
    ],
  },
  {
    version: '0.4.10',
    date: '7 Nov 2026',
    title: 'Passive Tree Zoom and Pan Restoration',
    items: [
      'Fixed an issue that froze the passive tree in place; full mouse-wheel zoom, button controls, and click-and-drag panning are completely restored.',
    ],
  },
  {
    version: '0.4.9',
    date: '7 Nov 2026',
    title: 'Passive Tree Readability and Deep Zoom',
    items: [
      'Passive tree node names and sector headers are now crisp and easily readable with dynamic zoom-scaled typography.',
      'Expanded maximum tree zoom from 7.5x to 24x for deep cluster inspection with smooth mouse wheel navigation.',
    ],
  },
  {
    version: '0.4.8',
    date: '7 Nov 2026',
    title: 'Passive Tree Controls and Zoom Fix',
    items: [
      'Fixed passive tree panning, zoom buttons, and mouse wheel zoom interactions across all devices.',
    ],
  },
  {
    version: '0.4.7',
    date: '7 Nov 2026',
    title: 'Passive Tree Fluidity and Fullscreen',
    items: [
      'The passive skill tree now features a Fullscreen view toggle, butter-smooth 60fps panning and zooming, and optimized SVG rendering.',
    ],
  },
  {
    version: '0.4.6',
    date: '7 Nov 2026',
    title: 'The Fuck Avery Update',
    items: [
      'The character tree now uses separate Travel, Passive, and Mastery points, with costly node tiers and Cosmic Gateways that bridge distant parts of the tree.',
      'Passive, Atlas, and Life Skills trees now support 3 saveable loadout profiles with equipment and tree cross-linking, unlocked in Act 5 and Tier 5 maps.',
      'The passive tree UI has been overhauled with smooth 12,000px zooming, profile management with gear and Atlas cross-linking, triple currency point counters, and dedicated visual rendering for Cosmic Gateways, Doomed Gates, and Celestial Keystones.',
      'The character passive skill tree is expanded to over 3,200 nodes with a central neutral concourse, fanned sector webs, 12 Celestial Forbidden Keystones, 6 high-stakes Doomed Gates, and deep puzzle wheels for defensive and offensive archetypes.',
    ],
  },
  {
    version: '0.4.5',
    date: '7 Nov 2026',
    title: 'Loot Filters and Journey Polish',
    items: [
      'Screen layouts and menus across the game have been polished for mobile and desktop, adding stash tab affinity controls, missing currency and trophy tabs, responsive Hideout stacking, and priority boss targeting on narrow screens.',
      'Every non-combat action now builds character-specific mastery, gradually gaining speed plus modest ordinary yields or ingredient savings, with progress shown on action and Heist cards.',
      'Expanded and reworked Unique Items with signature mechanics across campaign, boss, and pinnacle uniques, plus 12 Ascendancy best-in-slot uniques, 22 profession uniques, a 6-piece Master Artisan set, a 6-piece Wanderer leveling set, 3 Gold-find uniques, 5 Unique Flasks, and 5 Unique Maps.',
      'Belts now feature dedicated 4-slot loadouts (1 Life, 1 Mana, 2 Utility), and Instilling Orbs drop starting in Act 2 for early flask automation.',
      'Bosses now drop refined crafting bars, planks, dust, and gems so combat-focused players can upgrade Hideout stations without mandatory gathering.',
      'Introduced Tiered Loot (T1 to T5) across campaign and map tiers with higher roll ranges, affix tier weighting, and natural fractured mods or special bases like Simplex Amulets and Annointed Belts at Tier 5.',
      'Added a Filter Off-Class Loot option in Settings to automatically salvage dropped equipment that does not match your class defences or weapon types.',
      'Smoothed out early campaign progression with Momentum damage mitigation and extra starting survivability for Ranger and Mage.',
      'Custom Loot Filters: You can now create, edit, save, and switch between custom loot filter profiles with rule criteria for item tiers, defence types, weapon families, rarities, slots, and class affinity.',
    ],
  },
  {
    version: '0.4.4',
    date: '6 Nov 2026',
    title: 'Pinnacle of Ruin',
    items: [
      'Unique items now roll variable stat ranges that can be rerolled with Divine Orbs, class-defining trait uniques drop in mid-to-late campaign zones and maps, campaign unique drop pools scale progressively starting with a single unique in the Mud Flats, and select uniques feature thematic downsides.',
      'The Skilling tree is now a 36-point specialisation: Gemcutting replaces the unusable Fishing branch, and existing Skilling trees receive a free refund.',
      'Life-skill speed events now accelerate Heists, and Overtime now accelerates Greenhouse growth while offline.',
      'Active map modifiers (Tier hazards, Doomed mechanics, rolled affixes and Sextants) are now displayed in a banner on the Combat screen during map runs.',
      'The Atlas now offers 70 points: first clears of each Doomed Map tier grant 2, each Hard Boss grants 3, and each Uber Boss grants 5.',
      'The Doomed Maps tab and Map Device now feature Auto-run and an Avoided Modifiers safety filter, automatically spending Chaos Orbs to reroll deadly affixes during bulk map farming.',
      'The Atlas is now a connected 100-node skill tree with branching paths, node details, and clear visual links between every choice.',
      'The wiki\'s starter builds are up to date: the Ranger now uses a bow, the Mage and Duelist plans match their starting skills, and the Exile has a plan of its own.',
      'Monster packs in maps now scale from 10 packs in Tier 1 normal maps up to 100 packs in Tier 5 Doomed maps.',
      'Fractured Orbs can now drop in Doomed Maps, permanently locking a random modifier on rare gear with at least four modifiers.',
      "The Crafting Bench can now reach Level 6, unlocking meta-crafts to protect prefixes or suffixes, craft multiple modifiers, strip crafted mods, and assign Forger's Seals during auto-crafting.",
      'Hideout stations now expand into post-campaign tiers: Map Device unlocks a 4th Sextant slot and Pinnacle Conduit, Stash features dedicated tab affinities and a Map storage tab, the Forge gains Pinnacle Metallurgy up to item level 84, Alchemy Table unlocks distillation and 3:1 orb conversions, the Watchtower extends to 36-hour offline mapping, and the Trophy Altar grants realm-wide bonuses.',
      'Pinnacle crafting and Doom Sigils are now live: defeat the three Uber Bosses to earn Exile\'s Doom Sigils (elevate to Tier 0 Doom tier), Architect\'s Doom Sigils (imbue Doom Implicits), and Void Sigils (unlock a 7th modifier slot), alongside Bench Level 7 attack and caster isolation crafts.',
      'The Crafting Bench UI has been revamped with a live item affix capacity monitor, categorized tabs for bench recipes (with quick filters for Defences, Offense, Attributes, and Meta crafts), dedicated Special Materials management for Doom Sigils, Contraband, Runes, and Essences, and a quick-action Scour button to strip crafted modifiers.',
      'Bug reports now include build snapshots and recent combat logs, and signed-in players can receive developer replies and compensation in Settings.',
      'Live events now support custom bonuses and announcements, with clearer schedules and bonuses applied only during their recorded offline time windows.',
      'Market requests now reject invalid payments and duplicate pending trades, with additional server safeguards against malformed requests and transaction bursts.',
      'The XP penalty for easier enemies now grows more sharply each level, from 10% at three levels over the area to the 70% cap at ten.',
      'Combat XP now has a two-level grace band, up to 20% bonus in harder areas, and a maximum 70% penalty in easier areas.',
      'Monsters now have distinct Armour, Evasion, Energy Shield, block and elemental identities, from slow ice golems to fast poison spiders, balanced around their existing effective pools and damage budgets.',
      'Wiki guidance now reflects current survival rules, Mana is Power, Momentum and currency sources, and lists both capstones for every ascendancy.',
      'Life and Mana flasks no longer trigger automatically by default; automatic flask use once again requires an Instilling Orb enchantment.',
      'Momentum-keeping effects now save one whole stack each when you are hit (a hit always costs at least one), so they always make a difference. Lookout\'s Hood, Stormrider Greaves, The Pilgrim\'s Road, Deckwalkers, Sure-Footed, Steady Aim and the passive tree node all work this way.',
      'Wellspring, Heart of Winter and The Last Decree now describe what they actually do: recent Mana spending counts more toward Mana is Power.',
      'Magic packs and rare monsters now roll dangerous modifiers and pay extra experience and loot; the item modifier pool is much larger and more strictly tied to the right gear slots.',
      'Magic, rare and unique monsters now display their rarity colours, badges and modifiers in the active target screen and on the battlefield.',
      'Shadow now moves 25% faster, matching the other melee classes and keeping poison and Coup de Grâce attacks flowing.',
      'Armour, Evasion and Energy Shield are much stronger, while monster damage ramps after Act 1 so maintaining defensive gear matters throughout the campaign.',
      'Five Hard Bosses (Ossuar, Mother Vael, The Undertow, the Twin Regents and The Crownless) and three Uber Bosses (The First Exile, The Architect of Ruin and The Void Sovereign) can now be challenged from the Map Device using keys, with reactive Weak Point and Choir skill aims, boss trophy crafting materials, Doom Sigils and eleven exclusive unique items.',
    ],
  },
  {
    version: '0.4.3',
    date: '6 Nov 2026',
    title: 'Uncharted Realms',
    items: [
      'Maps have been rebuilt: run Tiers 1–10 from a shared realm map pool with tier-group modifiers and exclusive drops, roll Apprentice, Journeyman and Master Sextants on the Map Device, spend up to 30 Atlas Tree points across four branches, scribe all 10 map tiers and Sextants through Cartography, and unlock Doomed Maps I–V beyond Tier 10.',
    ],
  },
  {
    version: '0.4.2',
    date: '5 Nov 2026',
    title: 'Smarter Foundations',
    items: [
      'Mana is Power now rewards Mana spent recently, Momentum grants Evasion and loses flat stacks to landed hits, low-level gear can be tinkered with Arcane Dust, combat has automatic range postures, and filler skills reserve Mana for higher-priority cooldowns.',
      'Vitals, wind-up and ground rules now start unlocked with two conditions per skill, while Life and Mana flasks automatically trigger at low resources; later War Table tiers focus on advanced targeting, a third condition and loot auto-salvage.',
      'Hideout upgrades now use bars, planks and Boss Trophies with much smoother costs instead of demanding thousands of raw logs and ore at once.',
      'The whole interface now scales up more clearly on phones and 720p/1280p/1440p screens, with larger text and mobile navigation labels visible instead of icon-only tabs.',
    ],
  },
  {
    version: '0.4.1',
    date: '4 Nov 2026',
    title: 'Flexible Gems',
    items: [
      'Skill-gem attribute requirements are much less punishing: ordinary gems now reach 155 at level 20 and the most demanding gems reach 178, while off-attribute skills still require passive-tree or gear investment.',
    ],
  },
  {
    version: '0.4.0',
    date: '4 Nov 2026',
    title: 'Trees Reborn',
    items: [
      'The passive tree now uses much shorter attribute roads and more compact clusters, putting notables, masteries and branching choices closer together while preserving attributes for skill and equipment requirements.',
      'The character tree now has build-neutral outer paths instead of class-only mechanic nodes; ascendancies offer six notable paths and two capstones with no Act locks, while four trials ending at Tier 5 Maps provide nine points for a normal three-notable, one-capstone build without a hard node-count limit.',
    ],
  },
  {
    version: '0.3.20',
    date: '2 Nov 2026',
    title: 'Truly Unbroken',
    items: [
      'Unbroken now asks for more: complete all six acts without ever dying on the character, not just Act 6. Characters that already did it get the achievement and The Unbroken Temper when they log in.',
    ],
  },
  {
    version: '0.3.19',
    date: '2 Nov 2026',
    title: 'Unbroken',
    items: [
      'New achievement, Unbroken: complete Act 6 without dying once in it to earn The Unbroken Temper, a Templar unique amulet that never drops.',
    ],
  },
  {
    version: '0.3.18',
    date: '2 Nov 2026',
    title: 'Map tiers 1 to 10',
    items: [
      'Maps now run Tier 1 to Tier 10, from monster level 66 up to 84, with better loot each tier. Maps you already hold keep their tier at the new level.',
      'Maps only drop in level 60 areas and up, and the Map Device lists just the maps you hold.',
    ],
  },
  {
    version: '0.3.17',
    date: '2 Nov 2026',
    title: 'Exile centre start',
    items: [
      "Exiles can start in the middle of the passive tree, and other classes' starting spots no longer block an Exile, so it can path into any class's area.",
    ],
  },
  {
    version: '0.3.16',
    date: '2 Nov 2026',
    title: 'Uniques tab',
    items: [
      'New Uniques tab in the Stash: every unique has its own spot there, with no limit on room. Uniques you stash go there by themselves, including ones already on your gear pages. Ones you have not found show greyed out, with where they drop.',
    ],
  },
  {
    version: '0.3.15',
    date: '2 Nov 2026',
    title: 'Flasks refill at the Hideout',
    items: [
      'Retreating to the Hideout now refills all your flask charges.',
    ],
  },
  {
    version: '0.3.14',
    date: '2 Nov 2026',
    title: 'Flask enchantments and Amethyst Flask',
    items: [
      'New Instilling Orb enchantments: Low Mana, Savage Hit (a hit of 20% or more of your Life), Elemental Hit and Chaos Hit.',
      'New Amethyst Flask: +35% to Chaos Resistance for 4.5s. Drops from level 18 monsters, and Alchemy can brew it at level 30.',
    ],
  },
  {
    version: '0.3.13',
    date: '2 Nov 2026',
    title: 'Full Gem shop',
    items: [
      'The Gem shop is now a fixed shelf that never sells out: every gem from the areas you have opened, with a few more added as each new area opens.',
    ],
  },
  {
    version: '0.3.12',
    date: '2 Nov 2026',
    title: 'Gem shop and drops',
    items: [
      'Instilling Orbs now drop only from Act 4 on, starting in the Hollow Pass.',
      'Monsters no longer drop skill or support gems. Buy them at the Gem shop.',
      'The Gems tab in the Stash has a Clear all Lv 1 button for spare level 1 skill gems.',
      'The Gem shop has Skill gems and Support gems tabs, with search, attribute and skill-type filters like the Skills page.',
    ],
  },
  {
    version: '0.3.11',
    date: '2 Nov 2026',
    title: 'Class balance',
    items: [
      'Every skill now takes time to cast. Spells used to fire for free on top of your attacks, which made the Mage far stronger than everyone else early on. Spark and Frost Needle lose their cooldowns to make up for it, and Faster Casts now fits any spell that deals damage.',
      'Area attacks no longer have cooldowns: Ground Slam, Rain of Arrows, Scourge, Riptide, Flensing Fan, Rockslide Volley and Horse Archer\'s Arc can be used back to back. Heavy slams like Avalanche keep theirs. Area skills still go before your other attacks when they can fire.',
      'Ground Slam now works with swords.',
      'Bone Wands and Quartz Wands no longer drop or sell. Any you already have keep working.',
      'New weapon bases: Bronze Shortsword (level 4), Bastard Sword (29), Iron Cudgel (6) and Studded Mace (16).',
      'Warriors, Duelists and Templars move 25% faster.',
      'Physical damage mods hit harder: "Adds # to # Physical Damage" is up 50% on every tier, and "% increased Physical Damage" is up about 50% on the low tiers and 20% on the top ones. Items you already have keep their rolls.',
      'Frost Needle\'s three needles now share your added spell damage (a third each) instead of each getting all of it, so it no longer outgrows every later spell.',
      'Poison Dart can no longer be thrown with a wand, staff or sceptre.',
      'Chains lose damage as they go: each hop deals 15% less than the one before, never under 20% of the full hit. Spark reaching 5 enemies now deals about 3.5 hits\' worth between them, not 5.',
      'Spells grow less with gem level: 12% a level at first, tapering to 8% by level 20 (about 2.9x at level 20, down from 4x).',
      'The top tiers of caster mods are weaker: "% increased Spell Damage" and "Adds # to # Fire, Cold or Lightning Damage to Spells" lose about 10% at item level 45, rising to about 35% at item level 80. Items you already have keep their rolls.',
      'Hulking monsters now turn up from Act 3 on: big, slow brutes that hit hard and give five times the experience. Area, chain and piercing hits do 60% less to them, so bring a heavy single-target skill.',
      'Intelligence damage spells from Act 2 on deal 40% less damage: Fireball, Glacial Lance, Ember Dash, Blood Lance, Burnt Offering, Meteor, Tidecallers, Thunderhead, Whirlpool, Call the Leviathan, Royal Decree and Drowning Bolt.',
      'Barrage, Rain of Arrows and Ice Shot deal 20% less damage.',
      'Spark deals about 40% less damage, Frost Needle about 10% less, and Shock Nova about 20% less. Spark now chains further as the gem levels: 2 enemies, 3 from gem level 7, 4 from 13 and 5 from 19.',
      'Act 1 attacks hit 40% harder: Heavy Strike, Ground Slam, Pummel, Infernal Blow, Twin Strike, Poison Dart, Barrage, Rain of Arrows, Rain of Daggers, Feint, Ice Shot, Quick Slash and Rending Cut.',
      'Every class now starts with a single target skill and an area skill. New characters: Warrior, Duelist and Templar get Ground Slam, Mage gets Frost Needle, and Shadow gets the new Rain of Daggers.',
      'The Ranger now starts with a Short Bow, Ice Shot and Rain of Arrows.',
      'New skill: Rain of Daggers, poisoned knives that rain on a group. Dexterity, daggers only.',
      'Horse Archer\'s Arc now needs a bow.',
      'Heavy Strike is faster (3.3s, from 3.9s) and hits about twice as hard (392% weapon damage, from 185%).',
      'Strength attacks hit much harder, so each new one is an upgrade when it arrives: Pummel 147% x3 (from 55%), Infernal Blow 448% (from 120%), Judgement Hammer 644% (from 250%), Flagellate 588% (from 230%), Titan\'s Blow 1064% (from 430%), Shield Crush 840% (from 190%).',
      'Backstab deals 165% weapon damage, down from 240%.',
      'New Strength skills for swords and axes: Quick Slash and Rending Cut, fast 1.5s cuts that build Rage. Quick Slash stacks up to 25% more damage on you, Rending Cut stacks up to 30% increased physical damage taken on the target. At full stacks they wait until the stacks are about to run out, so your big hit goes in between. Rending Cut is set to bosses only by default.',
    ],
  },
  {
    version: '0.3.10',
    date: '1 Nov 2026',
    title: 'Wiki tools',
    items: [
      'The wiki now has an item comparison, drop calculator, crafting planner and XP planner.',
      'Try out rules with the rule builder, and plan a skill bar with the build planner, which gives you a link to share.',
    ],
  },
  {
    version: '0.3.9',
    date: '1 Nov 2026',
    title: "The Exile's Codex",
    items: [
      'The wiki has a new look, a left-hand menu and much better search.',
      'Every skill, support, item, unique, currency, area and monster now has its own page, with hover cards linking them together.',
      'Wiki tables can be sorted and filtered, and the Support gems page can show what fits any skill.',
      'New guides cover automation, offline play, gathering, farming, bosses and the campaign, with starter builds, drop rates and a glossary.',
    ],
  },
  {
    version: '0.3.8',
    date: '1 Nov 2026',
    title: 'A wand for the Exile',
    items: [
      "New Exiles on the Mage's start get a Driftwood Wand instead of the Rusted Sword, so they can use Spark and Frost Ward.",
    ],
  },
  {
    version: '0.3.7',
    date: '1 Nov 2026',
    title: 'Spells need a caster weapon',
    items: [
      "Spells now need a wand, staff or sceptre in your main hand, and can't be used with anything else. Curses still work with any weapon.",
      'The 20% more spell damage from a caster weapon is gone.',
      'Daggers no longer roll caster mods on new drops. Daggers you already own keep theirs.',
      'New Shadows start with Twin Strike instead of Spark, and new Templars with Iron Guard instead of Frost Ward.',
    ],
  },
  {
    version: '0.3.5',
    date: '1 Nov 2026',
    title: 'Stash sorting',
    items: [
      'The Stash screen has a new sort dropdown for your bag and gear pages: Item level, Can equip, Weapon DPS and Defence join Recent, Rarity and Slot.',
      'Sorting by Weapon DPS or Defence shows that number on each item.',
    ],
  },
  {
    version: '0.3.4',
    date: '1 Nov 2026',
    title: 'Challenge modes',
    items: [
      'New characters can take on Hardcore, Solo Self-Found and Classic, in any mix. Each mode starts with a fresh stash and hideout.',
      'Hardcore: one death deletes the character and everything it carries, even while you are away.',
      'Solo Self-Found: no Player Market, and every character has a stash and hideout of its own.',
      'Classic: combat only, with no gathering or crafting skills. The Crafting Bench still works, and hideout upgrades cost gold instead.',
    ],
  },
  {
    version: '0.3.3',
    date: '1 Nov 2026',
    title: 'Skill gem reform',
    items: [
      'Every act now has area, single target, guard and leech options for Strength, Dexterity and Intelligence: 31 new skills and 12 new supports.',
      "Some gems moved: Parry and Fireball to Act 2, Glacial Lance to Act 4, Shield Crush and Arcane Siphon to Act 5, Siege Shot to Act 6. You keep them, but they can't be used until their new level.",
      'Arcane Siphon now drains life only, and Life Leech and Mana Leech cost much more mana.',
      'Characters made before this update get The Old Covenant, a ring with life and mana leech. It can be found in your bag and can\'t be traded.',
    ],
  },
  {
    version: '0.3.0',
    date: '1 Nov 2026',
    title: 'The Market',
    items: [
      'The Player Market is open: trade gear with other players, under Adventure.',
      'Sell for gold or orbs, at a fixed price or by 24-hour auction. The market keeps 10% of each sale.',
      'You need an account and an Act 1 clear to trade. Anyone can look around.',
      'Money from sales waits for you and arrives when you log in or open the market.',
    ],
  },
  {
    version: '0.2.43',
    date: '1 Nov 2026',
    title: 'Choose your ascendancy nodes',
    items: [
      "Trials now give 3 ascendancy points each, 9 in all, so you can't fill the tree.",
      'That buys three of the four big nodes: all three notables, or two notables and the capstone.',
      'If your tree no longer fits, its nodes are refunded so you can choose again.',
    ],
  },
  {
    version: '0.2.42',
    date: '1 Nov 2026',
    title: 'Mages choose again',
    items: [
      'Now that the Wellspring is here, every Mage who had picked an ascendancy gets to pick again, for free.',
      'Your ascendancy tree is cleared and all your points come back to spend.',
    ],
  },
  {
    version: '0.2.41',
    date: '1 Nov 2026',
    title: 'The Wellspring',
    items: [
      'The Mage’s Wildcaster is gone, because it punished you for keeping your mana full. The Wellspring takes its place.',
      'Mana you would waste at full now fills Overflow. A full meter makes your next damaging spell free, with 100% more damage.',
      'Wildcasters become Wellsprings automatically, and get their ascendancy points back to spend.',
    ],
  },
  {
    version: '0.2.40',
    date: '1 Nov 2026',
    title: 'Trials give the points',
    items: [
      'Ascendancy points now come only from passing a trial for the first time: 4, 4 and 3. Bosses no longer give them.',
      'Points you held from bosses are gone. If your tree no longer fits, its nodes are refunded so you can choose again.',
      'Area cards and the Ascendancy tab now say what each trial gives and opens.',
    ],
  },
  {
    version: '0.2.39',
    date: '1 Nov 2026',
    title: 'Martyrs loosen their grip',
    items: [
      'Area and chain skills now go for Chained Martyrs by themselves, and catch them when they land nearby. No click or rule needed.',
      'Single-target skills still need a click or an Aim rule.',
      "A chained boss now says so: a notice over the field tells you why it can't be hurt and how to free it, and your hits show as chained rather than 0.",
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

# Roadmap and decisions

Last updated 2026-11-24. Current implementation: [GAME.md](GAME.md). Engineering and verification: [DEVELOPMENT.md](DEVELOPMENT.md). Historical releases: `src/data/news.ts` and git history.

## Next steps

**0.6.7, Workshop Upgrades and Loot**, went live on 2026-11-24. It includes the Woodcutter's Lodge and Trophy Wall, Mining layer mastery, Anvil and Forging progression updates, One Long Curl and equipment stat previews, the greenhouse harvest badge, saved loot filters, ground-first gear drops, crafted gear routing, and Valor Orbs. All 2,055 tests and the production build passed. Browser checks covered the greenhouse badge, map-gated Boss Keys, Forging stages, Woodcrafting's pattern rack and carving surface, and the Trophy Wall purchase. Deployment confirmed the live version and login configuration.

**0.6.6, Foraging Audio, News and Astrology**, went live on 2026-11-24. It removes the Foraging wind sound, keeps rain opt-in, groups News by beta version, corrects the Skilling Revamp numbering to 0.6.x, and makes Astrology slots and labels smaller. All 2,030 tests passed. Browser checks covered News on the title and character screens, Astrology at desktop and phone widths, and Foraging audio. The deploy confirmed the live version and login configuration.

Weapon-family mastery and master-alloy signatures are live in **0.6.4**. Early recipes build practice for late-game Master Forms in the same family. Existing weapon recipe practice carries over.

Furnace and Forge scenes (Smelting and Forging screen overhaul) are live in **0.6.5**.

Master volume, rarity-based flask charges and Archaeology sifting with Delve Rubble are live in **0.6.2**.

The sidebar Report update is live in **0.6.1**. It keeps drafts and captures the screen where you opened the report.

The 12-skill Skilling Revamp is live in **0.6.0**. The next skilling changes will follow the owner's review of the live menus. See the [UI pass notes](SKILLING_UI_PASS_NOTES.md).

The Delve, Woodcutting Forest pass, and Foraging look-and-feel pass share the local preview (2026-11-22). Mining includes trait filters, separate Focus and installation unlocks earned through security at the chosen depth. Foraging adds a CC0 farmstead backdrop, always-present click-to-start Focus soil beds, all nine wild patches visible up front, a clearer Herbarium pressed-plant journal, a lush CC0 Glasshouse conservatory with raised planter beds, a tactile visual Potting Bench & Seed Satchel (zero dropdowns), procedural Web Audio rain-on-glass & droplet soundscapes with planting/harvesting SFX, seed finds routed straight to the Activity sidebar, Normal/Magic/Rare/Unique/Legendary mutation and seed rarities, and a redesigned Seeds tab separating Plantable Seeds from Grown Herbs with direct `Plant in Glasshouse` links. The Masterworks visual pass is still open.

The 12 skill reworks, retirement of Agility, Cooking and Rune-carving, rebuilt skilling passive tree, and UI and minigame polish shipped together in **0.6.0**:
- Added `<SkillIntro>`, `<HelpTip>`, locked high-level tabs, consistent `Masterworks` tab placement, modern `SawmillView`/`RestorationView`/Forging `High Crucible`/Woodcrafting `Recipes`, CC0 tree artwork across all 7 Woodcutting species, bar-based Mining pick upgrades, zero-start Rogue recruitment via Street Marks, spam-click Pickpocket / 4×3 Brush / Square Optical Scope / 3×3 Garden Bed / Forgiving Cartography Sighting minigames, `Bellows` needle starting left, one-click Alchemy `Brew now`, fixed `The Still Heart` crash, and on-the-fly Gemcutting facets.
- **Owner review needed:** See [SKILLING_UI_PASS_NOTES.md](SKILLING_UI_PASS_NOTES.md) for full UI polish recommendations, tutorial blueprint, and the 4 former Rune-carving Masterworks (`The Second Heresy`, `The Sum of All Things` using `5× Gilded Stardust`, `Hands of the Forgotten Choir`, `Hollow Circuit`) relocated onto Cartography (with `The Still Heart` updated from deleted `Emberroot Reduction` to `30× Emberroot`).

Act-map readability, quest highlighting and the Quests sidebar page are live in **0.5.10**.

Combat pace controls, entry countdowns, matchup and dimmed terrain art are live in **0.5.10**.

Illustrated terrain backdrops and the zone terminology update are live across the seven-act campaign in **0.5.10**.

The level 1–99 profession design pass has an initial audit of all 15 main-game skills. Mastery rewards now have an agreed profession-level schedule. The scope of global buffs and the individual profession designs are next. See [Skilling Progression](SKILLING_PROGRESSION.md). Mining's redesign as [the Delve](MINING_DELVE.md) Woodcutting's as [Felling giants](WOODCUTTING_GIANTS.md) and Foraging's as [Wild variants and cross-breeding](FORAGING_BREEDING.md), Thieving's [casing](THIEVING_CASING.md), Archaeology's [Deciphering the lost peoples](ARCHAEOLOGY_DECIPHERING.md) and Astrology's [Chart your own constellation](ASTROLOGY_CONSTELLATIONS.md) are settled and ready to build. Agility is being scrapped (2026-11-21). Every production design is settled: Smelting, Forging, Woodcrafting, Gemcutting, Alchemy (your own flasks) and Cartography (special maps from scraps); Cooking and Rune-carving are being scrapped. The per-skill review and the skilling tree revamp design are finished (2026-11-21); everything is ready to build. Every design doc has an Implementation spec; builders start with [the skilling build guide](SKILLING_BUILD_GUIDE.md). Design docs pushed 2026-11-21 alongside live 0.5.11 (no game change). The skilling passive tree revamp comes after.

Panel frames, Hideout layout fixes and the stacked Inventory layout are live in **0.5.10**.

Saltmere’s five-water prototype is implemented locally behind a closed gate. The next Fishing milestone is the standalone RPG described in [Fishing RPG Design](FISHING_RPG.md).

Character inventories went live in **0.5.9**. The dedicated Guild Stash page, Inventory transfers and shared Uniques and maps shortcuts are live in **0.5.10**. A signed-in transfer in the live game remains to be checked.

The first batch of eleven build-specific gear modifiers is live in **0.5.10**. The new rolls start at item level 30 and compete across overlapping gear slots.

The seven-act zone naming and gear-check pack passes are live in **0.5.10**. The next campaign content step is to give the remaining regular enemy groups signature behaviors and judge the harder packs in full campaign play.

Veyrath campaign is live in **0.5.5** (2026-11-19): 70 zones across seven fuller chapters, revised level bands, matching rewards/gem access, saved journal, world/regional paintings, territory navigation, readable banners, character-specific unlock fog and the harsh surrounding ocean. All 113 test files / 1,795 tests, typecheck and production build pass. Earlier desktop/390px campaign navigation checks passed 2026-11-18; the latest artwork/fog was inspected through native previews because the local browser stayed blank, so live hover/desktop acceptance remains open. Full journey pacing remains a separate audit. Narrative and working geography are in [STORY.md](STORY.md), [VEYRATH-MAP.md](VEYRATH-MAP.md) and [Veyrath-zone-conversion.md](Veyrath-zone-conversion.md).

Previous release: **0.6.2, Master Volume, Flask Charges and Rubble Sifting**, deployed 2026-11-23. All 2,027 tests passed, including the flask charge endpoints for every rarity. A browser check verified the volume default, chime gain and mute, mined Rubble and sifted it into an artifact, and confirmed inventory overflow onto the ground. The deploy confirmed the live version and login configuration.

Previous release: **0.6.1, Report from Anywhere**, deployed 2026-11-23. All 2,023 tests passed, and desktop and phone browser checks verified draft persistence, the original screen details and submission against a test endpoint. The deploy confirmed the live version and login configuration.

Previous release: **0.6.0, Skilling Revamp**, deployed 2026-11-23. It includes all 12 reworked skills and the new skilling passive tree. All 2,023 tests passed across 133 files, and the production build passed. A local browser check opened all 12 menus, started a dig from the Scholar’s Desk and opened The Sovereign’s Vault. The deploy confirmed the live version and login configuration.

Previous release: **0.5.11, Polish and Story Catch-up**, deployed 2026-11-20. Steadier combat DPS readouts, readable World Map act captions without the Act 2/3 banner overlap, a Hideout Stash link that lands on the stash, clearer Guild Stash withdrawal messages, and story catch-up for characters from before the journal. All 1,894 tests passed; fixes were checked in the local game on desktop. The deploy confirmed the live version and login configuration.

Previous release: **0.5.10, Illustrated Battlefields and Easier Stashes**, deployed 2026-11-20. Includes illustrated and dimmed combat scenery, combat pace and matchup, clearer act maps and quests, campaign gear checks, build-specific modifiers, Inventory and Hideout refinements, and direct Guild Stash shortcuts. All 1,893 tests, typecheck and production build passed. Local browser checks covered the combat backdrop, Inventory shortcuts and the Map Device link. The deploy confirmed the live version and login configuration.

Previous release: **0.5.9, Personal Supplies and the Guild Stash**, deployed 2026-11-20. Characters gather and craft from personal supplies, and old shared holdings are available through manual Guild Stash transfers. All 1,865 tests and the production build passed. The database update succeeded and the deploy confirmed the live version and login configuration. Previous release: **0.5.8, Class Portraits**, deployed 2026-11-20: painted Craftpix portraits for all seven classes. Preceded by **0.5.7, New Item Art and Menu Frames**, deployed 2026-11-20: unified pixel item art, orb/rune/fossil/essence pictures, quiet Dark Ages UI frames. 1,861 tests and production build pass; deploy confirmed live version and login. Before it: **0.5.5, Veyrath World Map**, deployed 2026-11-19. Seven-act campaign and regional maps, saved act selection, readable navigation banners, territory highlighting, exploration fog and dark ocean artwork. All 1,795 tests and production build pass; deploy confirmed the live version and login configuration at https://dabfellow.party/path-of-idle/. Preserved preceding releases **0.5.4, Astrology**, **0.5.3, Agility**, **0.5.2, Heist Dossiers**, and **0.5.1, One Tree, One Currency** (including Rogue Roster). Latest live UI interaction check remains outstanding as described above.

Skilling overhaul Phases 00–14 are live in 0.4.39 (2026-11-15).

Intro tutorial reworked to combat basics only (2026-11-19, unreleased). Tests and typecheck pass. Open question for the owner: the old Hideout step gave the materials to build the Crafting Bench (1,500 gold, 200 Ash Logs, 200 Copper Ore), and that gift is gone for now.

1. Finish the remaining Launch Guide Round 2 builds. Per-task mastery, mini-games, events and layered loot filters are released; the other Build items remain below.
2. Pre-1.0 cleanup (2026-11-08, three parallel sessions). Part 1 fixed both known save-rollback paths (unreleased) and tidied this file. Owner service checks are confirmed done.
3. Finish the Maps skill batch: all support effects now run (2026-11-08, unreleased); boss, offline and whole-build checks remain (see that section).
4. Pacing audit: whole-journey simulations expose large Ranger seed variance and a repeatable Mage Act 4 stall, so pacing is not ready to lock.
5. Plan the 1.0 wipe and the Legacy area (see Decisions).
6. Fill the player-guide gaps listed in GAME; each should be source-backed and built with the wiki.
7. Skilling overhaul Phases 00–18 are complete (2026-11-15). Phase 18 whole-overhaul acceptance verified all 11 professions, 7 tools, 2 signatures, 2 feasts, Artisans' Reliquary, all 13 exclusive uniques, ingredient source graph, 8h live/offline parity, old-save migration, Classic/market rules, desktop/phone browser playtests (including Pinnacle + Defence/Rune pairings), and updated GAME/wiki docs.
8. Skilling Mastery Thematic Overhaul: completed (2026-11-15); implemented milestone-based thematic mastery across all 11 professions with Lv 25/50/75/100 thresholds, sub-category recipe personalities, animated live proc callouts, offline summary breakdowns, and hybrid completionist synergies. All 105 test files / 1,733 tests and typecheck pass.
9. Skilling Action Access: completed (2026-11-15); removed double-gating from ordinary skilling actions. Mining veins/deposits, Woodcutting trees/stands, Foraging blooms, and Gemcutting exact cuts unlock directly at their required skill level, removing redundant cycle counts and prospecting/survey gates. All tests and typecheck pass.
10. Masterwork Workbench Interactivity: completed (2026-11-15); made required material rows directly clickable with inline source skill navigation, and eliminated redundant unique item mod and ilvl repetitions from project descriptions. All tests pass.
11. Action Card Blurb Cleanup: completed (2026-11-16); stripped generic, static supply/usage tutorial blurbs from gathering and crafting action cards (Mining, Woodcutting, Foraging, Cartography, Smithing) while keeping dynamic cycle progress counters, discovery trackers, and input coverage cleanly visible. All tests pass.
12. Mastery Tooltip Redesign: completed (2026-11-16); converted the skilling mastery tooltip from a single run-on sentence into a rich, structured layout featuring level progress, baseline speed/yield/conservation scaling, and individual milestone cards (Lv 25/50/75/100) with unlock status, scope tags, and descriptions. All tests pass.
13. Inactive Minigame Callout Removal: completed (2026-11-16); removed the static "Start an activity and play it by hand..." prompt box from skill pages when that skill is inactive, keeping the UI clean until an activity with manual focus is running. All tests pass.
14. Skilling Minigame Mastery Bonus: completed (2026-11-16); added +0.01% permanent maximum Focus speed bonus to skilling minigames for each mastery level earned across all things in that skill, with UI tooltips reflecting the increased maximum. All tests pass.

15. Mastery Batches: released in 0.4.48 across suitable ordinary production. 5× crafts unlock at recipe mastery 15 in 2× time; 50× crafts unlock at mastery 90 in 10× time (5× production speed). Both share the single craft's mastery rate per second.
16. Percentage Drops on Gathering Nodes: released in 0.4.48; replaced deterministic cycle counters ("1 in X completions") and countdown text across Woodcutting (resins, fragments), Mining (fossils, rough gems, fragments), and Foraging (essences, rare blooms) with native percentage chances rendered directly on the action cards.
17. Ashen Codex world map: artwork integrated and released in 0.4.47; route network correction following the owner's annotated roads, forks and 50% opacity land/sea lanes released in 0.4.48. Desktop/phone visual playtests pass.
18. Dedicated Masterworks Tab: released in 0.4.48; moved profession masterworks (ProjectBoard) from the bottom of every skilling page into their own dedicated "Masterworks" tab on each profession screen, keeping standard activities clean and unbloated while providing direct access and an active project indicator. All 106 test files / 1,746 tests pass.
19. Archaeology Dig Buttons and Restoration Tab: completed (2026-11-16); added Dig/Stop action buttons and real-time dig progress bars directly to excavation site cards in the Archaeology Logbook, and added a dedicated Restoration & Sifting tab with full action cards for sifting artifacts and restoring historical relics (Surveyor's Guard, Taboo Tablet, Convergence Relic). All tests pass.
20. Thematic UI Dropdowns & Selectors: completed (2026-11-16); styled standard select menus across the entire game with dark fantasy styling, slate stone gradients, and glowing gold chevrons; moved Skill Combat Rules out of native dropdowns into categorized trigger pickers, tactile ailment chips, ground chips, and stepper controls; replaced Combat page targeting dropdowns with a compact interactive targeting popover; and redesigned the Greenhouse in Foraging into an interactive conservatory plot and crop cards with live cycle progress, seed discovery states, and direct planting buttons. All tests pass.
21. In-line Mastery Batches: completed (2026-11-16); kept 5× and 50× mastery batch crafts directly in line with ordinary activities and hidden until unlocked by their required mastery level, removing the separate bottom card and ensuring Cartography production activities remain accessible. All tests and typecheck pass.
22. Production Skill Separation (Smelting, Forging, Woodcrafting): completed (2026-11-16); split the monolithic Smithing discipline into three dedicated 1–100 production disciplines: Smelting (bars & alloys at the Smelter), Forging (martial weapons, shields, plate armour, jewellery at the Forge), and Woodcrafting (staves, wands, bows, bucklers, robes, leather armour at the Woodcrafting Bench). Updated refining pipelines with bars and planks, added dedicated Lv 15 profession tools (Smelter's Tongs, Wayfarer's Hammer, Carver's Drawknife) and a Lv 60 Master Artisan hybrid upgrade, integrated distinct hideout stations, established mastery milestones, and implemented full backward-compatible save migration parity. All 106 test files / 1,748 tests pass.
23. Archaeology Overhaul (Regional Trail, Layers of History, Relic Forge): built 2026-11-17, unreleased. One ordered trail of seven sites with Clue Fragments and Expedition Passports, hazard 1–7 and cave-ins; Surface/Buried/Bedrock layers chosen per site with Commitment feeding Ancient Data; new Relic Site (The Sealed Reliquary, Lv 80) with Sealed Relics; Relic Forge tab to program seven legendary relic forms. Old saves keep every site they could dig. Tests, build and a desktop/phone playtest pass. Rules in [GAME.md](GAME.md) Archaeology row.

23. Rogue Roster Overhaul: completed, unreleased (2026-11-17); 12 specialists, three-person crew, room XP, 10-point talent trees, 5,000-gold/two-heist mentor training, vault profiles and scouting/Bypass/Greed choices. Old rogue ranks migrate to Field Mastery; repeat/offline jobs remain supported. All 107 test files / 1,763 tests, typecheck and production build pass; desktop browser verified roster, talents, paid training, scouting, Bypass and Greed with no console errors. Phone layout not playtested.

24. Thieving ledger and dossier: released in 0.4.49 (2026-11-17); approved dark target ledger beside a parchment dossier, using existing portraits and CSS materials. Connected target browsing/start/stop, level locks, reward chances, live XP/progress, mastery, guaranteed Markers and Focus; retained Heists, crew and Masterworks. Starter/veteran desktop and 390px phone browser checks pass, including a successful Focus sequence, live rewards and no horizontal overflow.

25. Profession redesign batch: released in 0.4.49 (2026-11-17). Every implemented profession has its own restrained workspace; Woodcutting includes the approved stand selector, timber station, plain Focus marker/Swing button and separate Planks tab. Existing recipes, batches, access rules and specialist systems retained. All 106 release-source test files / 1,748 tests, typecheck, build and desktop/phone checks pass.

## Milestones

Ashen Codex world-map illustration and general campaign route integrated 2026-11-16; desktop/phone visual verification remains pending (see Other open items).

| # | Milestone | Current status |
|---|---|---|
| 1 | Automation/offline | Released; survival rules and two conditions baseline; flask-default removal verified (strictly requires Instilling) |
| 2 | Pacing | Live-source desktop simulator/API released in 0.4.34; pacing audit remains open. Whole-journey audit on 0.4.4 found large Ranger seed variance and a common Mage Act 4 stall |
| 3 | Account layer | Personal supplies and Guild Stash live in 0.5.9. Dedicated Guild Stash page, Inventory transfers and shared stock shortcuts live in 0.5.10 (2026-11-20). Signed-in live transfer verification remains open |
| 4 | Act 2 and content recipe | Released; cold-check/art follow-ups remain parked |
| 5 | Released Maps system | T1–T10, levels 66–84, Map Device and auto-run released in 0.3.18. Act 7 sidebar lock, personal Maps tab and Guild Maps shortcut live in 0.5.10 |
| 6 | Act 3 / ascendancies | Released; four trials and 2/2/3/2 points replace original structure |
| 7 | Campaign expansion / seven-act Veyrath integration | Seven-act story, atlas, journal and 70-zone campaign live since 0.5.5. Illustrated backdrops, zone terminology, brighter act-map labels, quest destination markers and local gear checks live in 0.5.10. Full campaign pacing remains open |
| 8 | Additional Maps expansion | Released in 0.4.3: plain/shared maps T1–T10, permanent tier mechanics, Sextants, 100-node Atlas with up to 70 allocated points, Doomed Maps I–V and Cartography T1–T10/Sextants |
| 9 | Hard bosses / Uber layer | Released in 0.4.4: five Hard Bosses (`ossuar`, `mother_vael`, `undertow`, `twin_regents`, `crownless`) and three Uber Bosses (`uber_first_exile`, `uber_architect_ruin`, `uber_void_sovereign`) with keyed Map Device arenas, reactive `weakPoint` and `choir` aims, boss trophies, Doom Sigils, key crafting recipes, and 11 exclusive uniques |
| 10 | Top-end crafting/hideout | Released in 0.4.4: Fractured items/orbs (10A), Bench L6 meta-crafts with Forger's Seal auto-crafting (10B), Station expansions L5–6 with Stash affinities (10C), Uber Bosses with Doom Sigil crafting (10D), and Crafting Bench UI overhaul with affix capacity tracker and categorized navigation |
| 11 | Long tail | Challenge modes, Unique discovery and per-task life-skill mastery implemented. The 12-skill rework, skill retirements, new skilling passive tree, and menu and minigame polish are live in 0.6.0. The Lodge, layer mastery and crafting workshop updates are live in 0.6.7. |
| 1.0 | Launch designation | Fresh wipe decided 2026-11-08; old saves move to a Legacy area (see Decisions); needs a clear announcement |

## Decisions

- Woodcutting Lodge (2026-11-24). Make the workshop stations themselves the entry points for upgrades. Show the Trophy Wall in the lodge after players buy it as an upgrade. The wall keeps its first-legend and 100-plank requirements.

- Forging value decision (2026-11-23). Weapon crafting trains a shared track for the weapon's family across recipes and bases. At family mastery 75, Master Forms roll one of two extra signatures from the chosen alloy. See [Forging](FORGING_STAGES.md#weapon-family-mastery-and-signatures-decided-2026-11-23).

- Delve installation unlocks (2026-11-22): Layer security unlocks the Pump Station at 30, Ventilation Shaft at 45 and Rock Bolts at 60. Costs and coverage still apply. Existing installations can be upgraded.

- Delve supplies (2026-11-22): Spend rubble on demand for braces and use any existing supports first. Mining keeps rubble in stock for other uses, and the pick's brace discounts still apply.

- Mining follow-up (2026-11-22): Keep the timed Brace game and use color and icons to match the hazard to its response. Hold each successful brace's Focus for 65 seconds so it can stack across warnings, and give two rubble per mining swing. Move pick and station upgrades and recent activity into collapsible panels.

- Combat pace (2026-11-20): Walking allows ordinary enemies to occupy half the field, Sprinting allows the whole field, and Fleeing allows three. Pace affects arrivals and existing enemies stay on the field when pace changes. The separate Emergency flee automation keeps its recovery behavior.

- Campaign Unique pacing (2026-11-20): Aim for about ten Uniques by the end of a rushed campaign. Over several hours of ordinary campaign farming, aim for one or two finds. Over a similar stretch of dedicated campaign boss farming, aim for three or four. Count randomly dropped Unique gear and flasks toward these targets. Tune first clears and repeat farming separately so a boss that respawns quickly can still be rewarding to beat for the first time.

- Zone scenery (2026-11-20): Use “zone” for combat destinations. Each zone can share a terrain backdrop and optionally choose a variant, such as a night forest or a cave with crystal spiders. Maps inherit the borrowed campaign zone’s scenery. Use existing illustrated backdrops licensed for free use in the game and record their sources in the asset credits. Generate art only when the owner explicitly asks for it.

- Profession progression (2026-11-20): Give every skill varied content across levels 1–99, a reward earned through sustained work, a separate rare drop chase, and a distinct reason to train it. Each skilling zone gets exactly one hidden collectible with no gameplay effect. Gathering professions are self-contained. Early production uses outputs from one or two other professions. Late production ramps up to recipes that can draw on as many as five other professions or crafting outputs. Space meaningful unlocks out. The owner chose profession level for mastery rewards, so any eligible activity advances them. Levels 10, 30, 50, 70 and 90 grant global buffs. Levels 20, 40, 60 and 80 grant buffs to that profession. Level 99 grants a large global buff. See [Skilling Progression](SKILLING_PROGRESSION.md) for the audit and open decisions.
- Mining twist (2026-11-20): Mining becomes **the Delve**, one mine dug ever deeper, with permanent depth, layered finds and hazards when pushing down. Design settled in [Mining: the Delve](MINING_DELVE.md).
- Woodcutting twist (2026-11-21): Woodcutting becomes **Felling giants**, where each tree is one big individual with parts (crown, limbs, trunk, heart) the player chooses to work. Design settled in [Woodcutting: Felling giants](WOODCUTTING_GIANTS.md).
- Foraging twist (2026-11-21): Foraging becomes **Wild variants and cross-breeding**, finding plant variants with traits in the wild and breeding new strains in the Greenhouse. Design settled in [Foraging: Wild variants and cross-breeding](FORAGING_BREEDING.md). Skill twists ignore overlap with Fishing, which stands on its own; other skills should stay unique from each other.
- Thieving twist (2026-11-21): keep the existing Heist and crew rework; Street Marks become **casing for Heists**, giving job-specific prep (keys, ledgers, patrol times). Settled in [Thieving: Casing the job](THIEVING_CASING.md).
- Agility (2026-11-21): **scrapped.** Owner: "agility was kind of a meme add, I think we can scrap it." Its courses, levels and page go. Its shortcut bonuses are dropped, not moved: fights close in and Heist rooms run at normal speed (owner chose A, 2026-11-21); hidden gathering spots go with the Mining, Woodcutting and Foraging rebuilds.
- Archaeology twist (2026-11-21): Archaeology becomes **Deciphering the lost peoples**: finds carry glyphs, cracking each culture's script translates inscriptions that lead to new sites, hidden chambers and relic recipes. Layers and cave-ins retire (they belong to the Delve). Settled in [Archaeology: Deciphering the lost peoples](ARCHAEOLOGY_DECIPHERING.md).
- Astrology twist (2026-11-21): Astrology becomes **chart your own constellation**: research sky regions to unlock stars with different effects, watch stars to rank them up, and chart one constellation from them for a small global buff; progression is star slots, new stars and star ranks. Settled in [Astrology: Chart your own constellation](ASTROLOGY_CONSTELLATIONS.md).
- Smelting twist (2026-11-21, my picks, approved by owner 2026-11-21): **running the furnace**, bars come out Crude/Refined/Pure/Flawless; fuel and flux set purity odds, purer bars give better Forging and Smithing rolls, master alloys at 80–99. Owner asked for picks to be presented as a full set for the production skills. See [Smelting: Running the furnace](SMELTING_FURNACE.md).
- Production skill twists (2026-11-21, my picks approved by the owner; they asked for the full set to be presented at once): Forging **shapes gear stage by stage** ([FORGING_STAGES.md](FORGING_STAGES.md)); Woodcrafting **tunes pieces to the wielder** with trade-off dials ([WOODCRAFTING_TUNING.md](WOODCRAFTING_TUNING.md)); Gemcutting cuts **facet by facet** by carat ([GEMCUTTING_FACETS.md](GEMCUTTING_FACETS.md)). After three written-up alternatives each (2026-11-21), owner chose Alchemy **your own flasks** with infusions ([ALCHEMY.md](ALCHEMY.md)) and Cartography **special maps from scraps**, making boss, vault and pinnacle maps as the endgame map source ([CARTOGRAPHY.md](CARTOGRAPHY.md)).
- Cooking (2026-11-21): **scrapped.** Owner: "cooking is the worst one I've seen yet, no redo, just scrap it, it's a weird inclusion." Decided on the owner's behalf: meal buffs are dropped, and Sacred/Sulphur flasks brew straight from herbs.
- Rune-carving (2026-11-21): **scrapped.** Owner turned down my first pick and all three alternatives ([RUNECARVING.md](RUNECARVING.md)): "nothing, scrap rune carving." Rune slots on gear are removed completely and socketed runes disappear (owner chose A, 2026-11-21). Decided on the owner's behalf: the Return Inscription weapon project takes its Inscription Fragments from Cartography's special boss maps instead.
- Skilling tree revamp (2026-11-21): each branch bends its skill's new twist (no plain speed nodes; keystones are rule changes), with bridge keystones between neighbours on a ring of partners; each branch forks into two directions; small core of general perks; one shared pool of about 118 points. Node list approved 2026-11-21; see [Skilling tree revamp](SKILLING_TREE_REVAMP.md).

- Panel frames (2026-11-20): Use a thin gray border for ordinary panels. Illustrated frames are reserved for a surface they fit, such as timber around the Woodcutting workbench.

- Character materials and Guild Stash (2026-11-20): Owner saw players run three or four characters as a production line, for example one mining, one chopping wood and another crafting daggers continuously from the shared supply. Owner chose to let alts work in parallel with manual transfers. Each character gathers into their own inventory, crafts from their own stock and has a personal Stash. Players can move spare gear, gems, flasks, currency and materials between characters through a separate Guild Stash, with manual bulk deposits and withdrawals for materials. Owner chose to keep gathering for XP and rare drops at the cap, discarding extra units of whichever material is full. Apply the same rule while online and offline. Use 5,000 per material type per character as the starting cap so ordinary skilling can run for extended stretches. On upgrade, carry each realm's existing shared contents into its Guild Stash so every character that previously had access can still withdraw them.

- Build-specific gear affixes (2026-11-19): Owner wants good gear to take longer to craft by adding ordinary modifiers worth chasing for particular builds or situations. A useful modifier should still have weak rolls for the build that wants it. Owner chose A, "Spread across relevant slots," so multiple specialties compete on the same bases. The first batch covers Rage, Riposte, Momentum, Mana is Power, Fervor, Coup de Grâce and combat conditions involving bleeding, stun, poison and low-Life enemies. Owner removed the elemental hit modifier for staying above 80% Life and set the minimum item level to 30. Five tiers unlock at item levels 30, 35, 45, 68 and 80 so the weakest rolls can still appear on endgame gear. Maximum Rage rolls +1 to +10, with +7 to +10 at T1. On an unmodified item-level-80 Coral Amulet, the new mods make up about 13% of the first prefix roll and 13% of the first suffix roll.
- Campaign enemy families (2026-11-19): Owner chose "mostly local enemies, with a few recognizable families returning where their presence tells part of the story." Draw each area's roster from its wildlife, inhabitants, work and exposure to the Creep. Where a family returns, keep a recognizable trait and give its local group a different way to fight. The Kroten expedition was the example discussed.

- Campaign zone names (2026-11-19): Owner chose "A for most places, with B where a disaster became part of local memory." Most zones should have names locals would recognize from the place's geography, trade, history or everyday use. Use names that describe a disaster where the event plausibly became part of what locals call the place. The example names discussed are drafts.

- Campaign zone and enemy design pass (2026-11-19): Review the names of all 70 zones across all seven acts against local geography and Veyrath lore. Give each recurring enemy group a distinct way to fight that fits its role and surroundings. Spread a handful of tougher packs through each act, using varied pressures such as critical hits, poison, ignite and elemental damage or resistance. The ice caster was an example of a coherent enemy identity. Owner chose "A for most packs, with one B-style encounter late in each act": most dangerous packs have several viable answers, including gear, flask or skill setup, and target priority where it fits. Each act has one late encounter on the main route where a typical underprepared character is likely to need better gear or flask setup.
- Combat-only tutorial (2026-11-19): owner asked for the intro tutorial to teach only combat basics, since skilling is being overhauled and new systems need explaining. Eleven steps: World Map, Brinewick Shore, slay, use a skill, Life Flask, Mana Flask, give a skill an automatic rule, pick up loot from the ground, equip it, passive point, Bloated Gorger. Orb and gold rewards kept on combat steps. The skilling materials (6 Ash Logs, 12 Arcane Dust) and the Crafting Bench kit went with their steps.

- Veyrath's surrounding ocean (2026-11-19): owner wants harsh, threatening water instead of pale cloud-like seas, with a restrained visual hint of an offshore force. Ordinary escape attempts fail; ships can disappear, while some crews may turn home under compulsion and lose or revise their memory of wanting to leave. Exceptional ships cross and return, consistent with Kroten's concealed devices. Precise memory effects, range, missing-crew fates and the boundary's response to the finale remain open. Preserve the approved land, navigation, fog and act banners; no sailing mechanic or campaign rebalance requested.

- World Map exploration (2026-11-19): owner requested noticeable readable act banners, subtle region hover highlights, unlock-driven fog of war, and a map that fills the desktop center. Banners remain visible over fog; unknown acts cannot be entered until reached. Use character area unlocks/boss defeats, including the legacy finale, as saved exploration. Account-wide completion does not reveal fresh characters. Prior requests for extremely small act banners are superseded; place lettering remains unchanged.

- Place names versus act navigation (2026-11-18): Owner clarified that actual place names should be "small blend in almost non noticable till you look", while the act labels should stay out of the way but show players which area is Act 1 and so on. Kept act-title ribbons as readable regional navigation, softened their parchment/edges and moved Act 4 away from city artwork. Actual place captions use fine muted ink with no glow, backing or shadow; only a tiny amount of nearby terrain detail is cleared. Current painting: `veyrath-world-subtle.webp`; earlier versions retained.

- Thin ribbons and written map names (2026-11-18): Owner asked for city/settlement names to look written onto the map, one-line thin act banners, and a better name for the research act. Chose **Cairnwatch Institute**, matching the established place name without changing its story or progression. World-map place lettering was edited with the built-in image tool; original artwork retained. Selectable act-map names now use sepia italic ink styling. All seven parchment ribbons keep the "Act X" tab above a single-line name and remain directly clickable.

- Enclosed territorial borders (2026-11-18): Owner requested that the territorial claims enclose their areas. Complete the sepia borders along the coastline and join all inland endpoints; retain shared boundaries and no colored fills. The First Seal receives a small engraved enclosure around its existing underground entrance symbol.

- Territorial atlas treatment (2026-11-18): Owner rejected the colored geometric act outlines as looking unlike a real map. Replace them with shared sepia ink frontiers following the landscape; use the painted coastline as the outside border, with no colored territorial fills or closed polygon strokes. The First Seal is below Caer Veyr and uses the painting's existing underground callout, not a rectangular sea claim. Keep direct territory selection and remembered act/area navigation.

- Seven-act redistribution (2026-11-18): Owner selected "Redistribute zones across seven fuller acts" over keeping the uneven chapter groups. Reuse all 70 stable IDs, with 8/8/8/10/12/12/12 zones and area bands 1–10 / 10–19 / 19–28 / 28–38 / 38–47 / 47–57 / 57–65, followed by the level-66 First Exile. Eight areas move into the road/Greyford investigation; retain seven story finales and the six existing passive awards. Level-based reward calibration and gem chapter availability follow the new bands; skill power/requirements, XP curve and endgame tiers stay intact. Relocated bosses lose late-game Echoes/channels and teach early mechanics. Instilling remains available from Act 2. Detailed mapping and tuning reasons: [Veyrath-zone-conversion.md](Veyrath-zone-conversion.md). No release requested.

- Act-map placeholders accepted (2026-11-18): Owner stopped the Wreck Coast pilot and approved the earlier seven-image batch as placeholder act maps. Verified all seven WebP assets exist and are connected through `ACT_MAPS` to the Campaign act close-ups. Kept the structural redraw experiment separate from runtime assets; no further image generation or release requested.

- Veyrath art rejection/research (2026-11-18): Owner finds the generated maps visibly AI-made, with fused structures and nonsensical geometry. Studied primary cartographer tutorials and map-symbol guidance; recorded a construction-first, staged layout/architecture/terrain workflow and close-detail acceptance requirements in `docs/VEYRATH-MAP.md`. Style adjectives, paper texture and passing code tests are not art acceptance. Existing paintings remain rejected for structural quality; no further image generation or runtime replacement performed in this research pass.

- Seven-act implementation authorization (2026-11-18): Owner requested removing map arrows, integrating the atlas with act regions, rearranging/renaming zones, considering quests and creating individual-act art. When asked about progression, owner explicitly chose "Redesign progression for the seven-act story". Implemented seven chapter groups across all 70 stable area IDs, rethemed names/descriptions, a new Wayfarer's Post chapter checkpoint and campaign First Exile finale. Campaign ends at level 66 with ordinary Maps following; existing earned milestones and area clears are retained, Maps gems are separated from campaign Act 7, and the new story journal uses save version 48 with explicit saved interactions. Full route and mechanics tests cover the changed chapter references. No release requested in this chat.
- Inventory, stash and crafting merge, design pass (2026-11-19). Owner: stash, inventory and Bench are "some of my least favorite screens"; players should be the loot filter; "the fact that all of our crafting is locked to the crafting bench sucks".
  - Decided for the owner: the Equipment page is renamed **Inventory**. Inventory holds 100 slots + 20 per Stash level (260 at Stash 9). The loot filter gains a **Send to stash** action; anything not caught by a rule goes to the inventory, never the stash. A **Run filter on inventory** button applies salvage/stash rules to carried items. Uniques are still never auto-salvaged.
  - Q1 loot destination: owner chose A. Drops that pass the filter go straight into the inventory; the ground pile is no longer the normal place for loot, and time-away loot also goes to the inventory.
  - Q1 full inventory: owner chose A. Extra drops spill onto a small ground pile that works like today's (a death marks it, a second death loses it).
  - Q2 layout: owner wants the current Inventory, Stash and Bench screens scrapped and **one new combined screen built from scratch** that shows everything: "go to their inventory, do crafting if they want, move stuff to their stash, and not have to click through 3 different side menus". Read as A for both parts: worn gear, inventory and stash side by side (stash stacks below on phones), and clicking any item opens a side panel with its details and all crafting and salvage. Stash and Bench pages leave the sidebar.
  - Q3 Bench: owner chose A. The Crafting Bench stays a Hideout upgrade you never visit; its unlocks appear in the item's crafting panel, and locked tools show greyed out with "Needs Bench N".
  - Q3 gates: owner chose B. Salvage still needs Bench 2, and auto-salvage by rarity still needs War Table 5/6/7.
  - Loot filter hide (owner, replaces the 2026-11-09 "hidden drops remain in the pile" call): hidden items are simply not shown and don't count toward the ground limit, so players can "pre-filter out" junk, but hidden items give no salvage. Auto-salvage stays behind its upgrades. The filter should become a full filter (bases, item level, which mods a rare must show, etc.). The ground-items display "also needs a whole rework" later.

- Capital prosperity/map revision (2026-11-17): Owner wants Caer Veyr grander and more lavish, noting people live relatively well there. Created and visually inspected `output/imagegen/veyrath-detailed-story-map-v7-capital.png` with a compact citadel, intact city walls, prosperous districts, formal grounds and modest gold accents. Relative capital prosperity does not remove compulsory field labour or outlying deprivation. Exact built-in edit prompt saved alongside; no runtime changes.

- Veyrath scale and material touchups (2026-11-17): Owner requested reading the Interconnectd article on the "plastic AI look" and touching up the map, then added that towns should fit the map's scale. Read the article and adapted its physical-material/imperfection suggestions to cartography. Generated and visually inspected `output/imagegen/veyrath-detailed-story-map-v6-atlas.png`: substantially smaller settlement/harbor drawings, retained geographic detail and labels, varied ink/watercolor/paper treatment. Exact built-in edit prompt and source link saved alongside. Illustrative cartography, not measured street-scale geography; no runtime changes.

- Full Veyrath atlas style revision (2026-11-17): Owner liked the fullness of the ink map but requested the older style. Generated and visually inspected `output/imagegen/veyrath-detailed-story-map-v5-atlas.png`, combining the populated ink composition and corrected Harrowgate with the earlier muted atlas palette, clean border and finer lines. Exact built-in edit prompt saved alongside; no runtime changes.

- Harrowgate map architecture correction (2026-11-17): Owner circled buildings merging into terrain. Created and visually inspected `output/imagegen/veyrath-detailed-story-map-v4-ink.png`, separating the ruined structures and gate from the ground and removing the annotation. Exact built-in edit prompt saved alongside. Artwork-only correction.

- Veyrath ink-and-quill redraw (2026-11-17): Owner rejected the simplified cities and supplied a raw ink-and-quill template: rough mountain cross-hatching, jagged coasts, aged torn-edge parchment with physical grain and small ink splatters, crowded slightly chaotic composition and no smooth digital shading. Generated and visually inspected `output/imagegen/veyrath-detailed-story-map-v3-ink.png`, using the original detailed v1 as reference and restoring characterful settlement drawings while retaining the field-pattern correction. Exact prompt saved alongside; no runtime changes.

- Detailed map simplification (2026-11-17): Owner requested simpler cities/towns and reconsideration of crop fields, finding v1 too artificial. Created and visually inspected `output/imagegen/veyrath-detailed-story-map-v2.png`: small overhead settlement footprints replace oversized scenic cities, repeated crop grids are removed in favour of sparse irregular remnants and open country, and named locations/roads are retained. Exact built-in edit prompt saved alongside. No runtime changes.

- Detailed Veyrath story atlas (2026-11-17): Owner requested towns, notable story locations and peripheral places outside the campaign. Created and visually inspected `output/imagegen/veyrath-detailed-story-map-v1.png`. Working main locations: Brinewick / Winnie's Refuge on the Wreck Coast, Wayfarer's Post, Greyford, overgrown Harrowgate, Eastmere, Cairnwatch Institute, Caer Veyr / Ration Fields and The First Seal beneath the capital. Peripheral locations and geographic notes are in [VEYRATH-MAP.md](VEYRATH-MAP.md). Names and placements are proposals; no runtime locations or game changes. Exact built-in generation prompt saved alongside artwork.

- Standalone Veyrath clarification (2026-11-17): Owner clarified the preceding request meant an image of just Veyrath, not enlargement of its territory in the regional view. Created and visually inspected `output/imagegen/veyrath-standalone-atlas-v1.png`, framing the exile landmass and immediate offshore islands alone in the atlas style. The preceding v4 regional enlargement is not an approved geographic size change. Exact built-in generation prompt saved alongside; no game integration.

- Veyrath map enlargement (2026-11-17): Owner requested enlarging Veyrath within the circled southwestern area while retaining the regional zoom. Generated and visually inspected `output/imagegen/orvessa-continental-overview-v4.png`: enlarged the recognizable exile landmass, removed annotations and retained the expanded Kroten territory and full regional framing. Exact built-in edit prompt saved alongside. Artwork only; no runtime changes.

- Kroten territorial correction (2026-11-17): Owner clarified that Kroten is already a large kingdom and marked its intended extent across the broad southwestern/south-central mainland, incorporating the existing southern peninsula. This replaces the small coastal-territory depiction in earlier drafts. Generated and visually inspected `output/imagegen/orvessa-continental-overview-v3.png` with a continuous expanded frontier, centered Kroten label, subtle territorial wash and no red annotations. Geography outside the territorial edit retained; full built-in edit prompt saved alongside. Artwork only, no runtime changes.

- Orvessa map scale revision (2026-11-17): Owner supplied a US-wide geographic map as the desired zoom reference. Created `output/imagegen/orvessa-continental-overview-v2.png`, reducing local detail and settlement depiction, using broader terrain/forest regions and a smaller Veyrath within the larger regional composition. Retained the antique atlas style and only the Orvessa, Kroten and Veyrath labels. Reference is for scale, not Earth's geography or modern UI. Exact built-in generation prompt saved alongside; no runtime changes.

- Orvessa continental overview artwork (2026-11-17): Owner requested updating the world map to a continental overview of the region. Generated `output/imagegen/orvessa-continental-overview-v1.png` using the approved Veyrath atlas as a reference, preserving its recognizable coastline at reduced scale and placing it offshore southwest of a larger mainland with Kroten on the facing southern coast. Named labels are Orvessa, Veyrath and Kroten; Dabtopia and Jojo Land are outside this view. Mainland terrain, relative placements and faint boundaries are visual proposals, not finalized political geography. Full built-in image-generation prompt saved alongside. Artwork only; runtime campaign map and navigation remain unchanged.

- Campaign act breakdown proposal (2026-11-17): At the owner's request, `docs/STORY.md` now proposes seven narrative acts: The Wreck Coast; The Broken Roads; In the Capital's Wake; The City That Stayed; The Mountain Research Facility; The Capital's Promise; The Guardian Beneath. Mapping follows as The Unfinished Maps. This is a proposed structure independent of the existing six implemented acts; no content relocation, levels, bosses or gameplay changes are authorized by the outline itself. Act count and titles await the owner's review.

- Main storyline direction (2026-11-17, owner's outline): The player washes ashore, joins a community, helps people, clears paths and establishes outposts. Diverted supplies prompt pursuit of a capital-connected official/delegation through a larger town, arriving just too late. Local work yields gear, gold and Creep clues. Carrying something onward requires crossing a much larger established city overtaken by the Creep, still occupied by survivors and people refusing to leave. Evidence leads through a mountain research facility to the capital, where experiments are escaping control and Kroten's dealings become clear. Beneath the city the player finds the First Exile alive through intense infestation and defeats them. The Creep stops growing in Veyrath but does not retreat. Ongoing mapping charts other lands and fights entrenched infestation indefinitely as an ultimately unwinnable eradication effort. Narrative treatment and unresolved continuity are in [STORY.md](STORY.md). No gameplay changes requested. This supplies the main arc instead of choosing either earlier Topic 60 proposal.

- Kingdom lore Topic 59 (2026-11-17): Owner chose A for the rival salvage crew's claim: they secured ropes, cleared access to the wreck and lost equipment doing it, so they consider their recovery work grounds for ownership despite Winnie's purchase. Resolution remains open. Owner clarified that these opening-job details are low priority: the lore interview should now focus on establishing the main storyline rather than individual quest logistics.

- Kingdom lore Topic 58 (2026-11-17): Owner chose A for the danger in the player's first salvage job: another salvage crew has already reached the wreck and does not recognize Winnie's purchased claim. The encounter introduces competing coastal rules about ownership of washed-up cargo. The crew's identity, specific ownership customs and resolution remain undecided.

- Kingdom lore Topic 57 (2026-11-17): Owner chose A for Winnie's first job for the player: recover a cache from a wreck. Winnie has bought a claim to cargo not yet brought ashore, and the player must reach it before the tide or another salvage crew. The cache's contents, wreck location and other claimants remain undecided. This is an opening-story plan, not an implemented quest.

- Kingdom lore Topic 56 (2026-11-17, revised after owner's correction): Owner chose B for how Winnie discusses the cellar business: need-to-know. The player receives instructions for particular deliveries, while Winnie keeps clients and arrangements private until more trust is earned. Owner rejected the assumption that the player would call Winnie out over stolen goods; recognition does not establish objection, demands for restitution or a moral confrontation. Neither response proposed in the discarded version of Topic 56 is established. Winnie is referred to as he/him by the owner.

- Kingdom lore Topic 55 (2026-11-17): Owner chose A for the bargain helping supply Winnie's refuge: Winnie stores stolen goods without asking questions, and smugglers pay in food to use the former inn's cellars. Players may recognize possessions belonging to people they have helped elsewhere. Specific smugglers, goods and incidents remain undecided. This supplements the refuge's reliance on district food deliveries rather than establishing that cellar payments cover every need.

- Kingdom lore Topic 54 (2026-11-17): Owner chose B for Winnie's defining commitment: "Everyone under this roof gets fed." Winnie will steal, threaten or strike ugly bargains to keep the refuge's kitchen running. This earns residents' loyalty while pushing costs onto people outside the refuge. Unconditional refusal to surrender residents, proposed in option A, is not established. Particular bargains and victims remain undecided.

- Thieving screen direction (2026-11-17): Owner chose the dark target ledger with a parchment selected-target dossier and an inset lockpicking Focus panel. Keep the existing restrained dark game shell; use small existing portraits, icons and CSS materials instead of large AI-painted scenes. This implementation changes presentation and action access, with existing gameplay balance retained.

- Kingdom lore Topic 53 (2026-11-17): Owner chose A for Winnie's refuge: a crowded former inn with shared rooms, patched roofs and a common kitchen surrounding a courtyard where deals are struck. The player gets to know regular residents and notices when familiar faces disappear. The refuge's name, specific residents and reasons for any disappearances remain undecided.

- Kingdom lore Topic 52 (2026-11-17): Owner chose B for the player's sponsor: **Winnie**, the refuge keeper. Winnie needs someone to retrieve supplies and settle obligations beyond the refuge's walls. The player receives a bed under Winnie's protection alongside people with debts and secrets of their own. This confirms Winnie's refuge-keeper role from the provisional friend roster; specific opening jobs and the refuge's name remain undecided.

- Kingdom lore Topic 51 (2026-11-17): Owner chose B for why the player's sponsor vouches for them: the sponsor needs someone willing to take risks. The player receives shelter and protection in exchange for help with dangerous work. Affection and loyalty may develop, but the relationship begins as a practical bargain. The sponsor's identity and the initial work remain undecided.

- Kingdom lore Topic 50 (2026-11-17): Owner chose A for accepting new arrivals: a resident must vouch for a newcomer, offering shelter and answering for their early conduct. The player can learn who took that risk for them and why others refuse to sponsor arrivals. The player's sponsor, their motive and the limits of a sponsor's responsibility remain undecided.

- Kingdom lore Topic 49 (2026-11-17): Owner chose A for the settlements' usual punishment: restitution and obligation. Offenders repay losses through goods, labour or dangerous work for the community. People may carry old debts for years, and others may exploit what they owe. Limits on obligations and treatment of unpayable debts remain undecided; no player debt mechanic is established.

- Kingdom lore Topic 48 (2026-11-17): Owner chose A for how settlements enforce their local codes: those involved bring cases before residents, witnesses speak, debts are weighed and respected locals settle disputes publicly. This is rough justice shaped by reputation, grudges and willingness to testify. Specific hearing customs, penalties and individual adjudicators remain undecided.

- Kingdom lore Topic 47 (2026-11-17): Owner chose A as the common settlement arrangement, with patron-controlled settlements as exceptions. Most settlements hold together through negotiated local codes covering food, shelter, debts and violence; enforcement can be harsh, and residents depend on neighbours respecting the rules despite mutual distrust. Exceptional settlements depend on powerful patrons for protection and supplies. Particular codes, enforcement practices and patrons remain undecided.

- Kingdom lore Topic 46 (2026-11-17): Owner chose B for the friend-inspired characters' connections: they have separate lives across Veyrath and belong to their own communities. Some know one another through work or reputation, allowing the player to encounter a wider cross-section of the kingdom. They are not established as a single former crew. Particular relationships and community placements remain undecided; the earlier draft roles remain provisional.

- Kingdom lore Topic 45 (2026-11-17): Owner chose B for the supply clerk's code: "You honour the deal." The clerk knowingly processes bribes and crooked shipments, but the settlement fulfilled its obligations and was owed its food. Breaking that agreement motivates the clerk to share evidence. No friend character has yet been assigned this clerk's identity.

- Friend-character roster expansion (2026-11-17): Owner requested all readable people in the supplied group-list screenshot be added as characters alongside Sir Broden. Covered names are not identifiable and remain unassigned. The following are assistant-authored draft lore roles, not implemented NPCs, quests or final character histories. Display handles are preserved; titles are provisional. These characters should have individual codes and genuine faults, following the owner's exile morality direction:
  - **Premedicated**: an apothecary who treats anyone who reaches the table, but buys stolen medicine and charges wealthy patients extortionate prices.
  - **Primerfalls**: a former siege engineer who repairs district waterworks, finances the work through sabotage contracts, and refuses to destroy a working well.
  - **SinShadows299**: a burglar and information broker who sells stolen secrets but never reveals the location of someone who sheltered them.
  - **TheRageDread**: a feared mercenary captain who collects debts through violence but honours a surrender once accepted.
  - **whaaaaleeee**: a wreck-diver who claims valuable cargo before others can reach it, but gives drinking water found aboard to the shore settlement.
  - **JoJoBiggens**: a dockside prizefighter and enforcer who takes crooked work but refuses to fix a fight once spectators have placed their bets.
  - **Winnie**: a keeper of an illicit refuge who profits from stolen goods but forbids violence against anyone admitted under its roof.
  - **Widdow**: a contract killer who refuses a second payment to betray an existing client, even when the client deserves it.
  - **BrenBren**: a forger of ration papers and travel permits who charges heavily but honours every document personally guaranteed.
  - **extremelygnar**: a dangerous cliff-route guide and contraband runner who takes reckless routes but never abandons a paying traveller.
  - **avreyc**: a fence dealing in stolen heirlooms who returns identifiable burial keepsakes to surviving families.
  - **ATD**: a quartermaster running a protection racket who keeps a protected district's emergency stores intact even when selling them would be lucrative.
  - **フェニックス** (Phoenix): a fire-setter hired to clear Creep growth and destroy property who always leaves an escape route for occupants.
  - **JoshO**: a smuggler who bribes officials and carries illicit cargo but refuses to sell passage out of Veyrath when unable to deliver it.
  - **G4RR.**: a former road bandit who now escorts caravans for payment and considers taking a client's cargo an unforgivable betrayal.
  - These are fictional characters inspired by friends' handles, not claims about the real people. Individual exile reasons, appearances, affiliations and gameplay roles remain open.

- Exile character morality (2026-11-17, owner's direction): Do not portray the exiles collectively as innocent or good people. Those sentenced to exile were sent away for a reason; whether that reason was justified is open. The owner's comparison is One Piece pirates: people who may steal, loot and commit real wrongs while maintaining personal morals, loyalties and codes. Kindness to the player does not erase wrongdoing, and opposition to Kroten does not establish virtue. Apply this to characterization rather than copying characters or lore from that series. This does not establish that locally born descendants were personally sentenced to exile.

- Kingdom lore Topic 44 (2026-11-17): Owner chose B for the player's help tracing the diverted shipment: a district supply clerk noticed deliveries disappearing from the books and quietly kept records. Sharing the evidence risks the clerk's position and household rations. The clerk's identity, history and personal code remain undecided. Broden is not assigned the shipment-investigation role proposed in option A.

- Kingdom lore Topic 43 (2026-11-17): Owner chose B for the missing food delivery: an official redirected it to a Kroten research expedition under orders disguised as an ordinary delay. Following the shipment gives the player their first evidence of the secret arrangement. The official, expedition location and specific evidence remain undecided; the discovery does not establish that the player immediately learns Kroten's true research objectives.

- Kingdom lore Topic 42 (2026-11-17): Owner chose A for the first threat to the settlement that shelters the player: its food delivery never arrives and reserves are running out. The player follows the supply road to learn why, encountering people dependent on the delivery and those deciding where supplies go. The reason for the missing delivery remains undecided.

- Rogue roster implementation details (2026-11-17): all twelve rogues available with three crew slots; 25 XP per completed room, next level costs current level × 100 XP, level cap 100. Field success caps at +20 percentage points at Lv 10. Talent points begin at Lv 15 then every five levels, capped at ten; four specialty passives, five Greed gold talents, then signature. One spent ability per rogue per heist; primary signature bypasses are free, Lookout signature reveals rooms. Mentor training teaches an additional primary specialty after two finished jobs (alarms count, abandon does not), with 5,000 gold charged on enrollment. These fill unspecified tuning in the requested overhaul and do not change unrelated professions or campaign systems.

- Kingdom lore Topic 41 (2026-11-17): Owner chose A for the player's initial motivation beyond survival: a settlement takes the player in, then is threatened by a failed food delivery or dangerous outbreak. Helping the people who helped them leads toward the kingdom's larger secrets. The settlement, its inhabitants and which specific threat starts the investigation remain undecided; no campaign or quest implementation is requested in this lore pass.

- Kingdom lore Topic 40 (2026-11-17): Owner chose B for Kroten's understanding of concentration-based spread: its researchers have not recognized the pattern. Early successes appear convincing because effects take time to emerge. The player can connect evidence that Kroten still treats as isolated failures. This does not establish an outbreak outside Veyrath or change Topic 38; specific incidents and research locations remain undecided.

- Kingdom lore Topic 39 (2026-11-17): Owner chose B for how the Creep establishes itself somewhere new: it needs a sustained concentration. Individual samples remain contained, but stockpiles of affected resources eventually change surrounding ground and water. Research stores and supply depots can therefore become dangerous. Concentration thresholds, timing and specific handling methods remain undesigned; this is lore, not an inventory, stash or resource gameplay mechanic.

- Kingdom lore Topic 38 (2026-11-17): Owner chose A for the Creep's extent within Orvessa: Veyrath is its only established foothold. Elsewhere in Orvessa, people regard it as a distant exile problem. Kroten's shipments could carry it beyond Veyrath; no outbreak elsewhere in Orvessa is established. Jojo Land's separate infestation remains author-level background lore with no confirmed contact or transmission history.

- Kingdom lore Topic 37 (2026-11-17): Owner chose A for why Dabtopia is unaffected: the Creep has never reached it, and distance has protected it so far. Trade creates a possible route for arrival, whether or not anyone recognizes the danger. No natural immunity or protective ward is established. Actual transmission methods and any future spread remain undecided; this is background lore only.

- Kingdom lore Topic 36 (2026-11-17): Owner chose A for contact with Dabtopia: limited but established contact with Orvessa through long voyages, occasional trade and visitors. People know Dabtopia is free of the Creep, though reaching it is difficult. This does not establish a safe route out of Veyrath or change its sea confinement. Why Dabtopia is unaffected and its political relationships remain undecided.

- Kingdom lore Topic 35 (2026-11-17, owner's option C): Orvessa has not made contact with Jojo Land because the distance is too vast for current technology. Jojo Land being completely overrun by the Creep is author-level world lore, not a confirmed report available to Orvessa. Do not establish refugees, expeditions, earlier contact, lost communications or secret Kroten reports from Jojo Land. Whether Orvessa knows the region exists at all remains undecided.

- Kingdom lore Topic 34 (2026-11-17, owner's clarification): Kroten wants to exploit the Creep's overgrown resources to amass a major army and rule surrounding nations. It is only the fifth-largest kingdom in the world; the measure of size is unspecified. This is the agreed objective rather than a requirement to adopt every experiment proposed in options A and B. Particular military applications remain undecided.

- Wider world geography (2026-11-17): The world has three regions. **Orvessa** is the working name supplied for the region containing Kroten and Veyrath. **Dabtopia** is entirely free of the Creep. **Jojo Land** has been completely overrun by it. These are background lore only, with no impact on gameplay, playable geography, balance or existing game content. The world's own name, regional borders and how the Creep reached Jojo Land remain undecided.

- Exile kingdom working name (2026-11-17): **Veyrath**, supplied at the owner's request for a WIP name. Provisional naming for lore discussion; no game labels or existing place names changed, and no in-world etymology established.

- Kingdom lore Topic 33 (2026-11-17): Owner chose A for what Veyrath's rulers believe they are allowing: research toward a cure. Kroten promises to restore farmland and make the seas safe. The rulers conceal the arrangement because admitting dependence on their former enemy would threaten their authority. Players uncover how far Kroten's actual work departs from those promises. What individual rulers later learn, ignore or conceal remains undecided.

- Kingdom lore Topic 32 (2026-11-17): Owner chose B for Kroten's purpose in its secret dealings: access to the Creep. Kroten seeks affected materials, specimens and research, hoping to use the power while containing its dangers. Players discover that some apparently humanitarian deliveries support research expeditions. The experiments, researchers and extent of the exile rulers' knowledge remain undecided.

- Kingdom lore Topic 31 (2026-11-17): Owner chose B for the exile rulers' knowledge of safe passage: Kroten conceals the mechanism from them. They know Kroten's ships cross safely but accept its conditions without understanding why. The player can uncover knowledge denied even to the capital's leaders. This distinguishes their knowledge of the damaged containment from knowledge of Kroten's shipboard devices.

- Kingdom lore Topic 30 (2026-11-17): Owner chose A for the safe-passage mechanism: Kroten's ships carry devices built from the stolen plans that reproduce a small part of the containment, holding the sea's influence away from each vessel. Players can discover a device concealed below deck and recognize its construction from inland ruins. The devices' materials, limits and operation remain undecided; no player crafting or travel mechanic is established.

- Kingdom lore Topic 29 (2026-11-17): Owner chose B for how Kroten acquired the old knowledge: during its infiltration, agents discovered surviving accounts of the containment and secretly sent the records home. Players trace the theft through council archives and descendants of those involved. How those records survived locally, why their importance was overlooked and the precise safe-passage method remain undecided.

- Kingdom lore Topic 28 (2026-11-17): Owner chose A for Kroten's safe passage: Kroten secretly preserved old knowledge, and its ships carry something that allows passage through the containment's influence. Players can uncover how Kroten acquired that knowledge and why the exile kingdom lost it. The carried object or material, how it works and Kroten's source of knowledge remain undecided; a bargain with a power beneath the continent is not established.

- Kingdom lore Topic 27 (2026-11-17): Owner chose A for the First Exile's role in the original catastrophe: already changing under the power's influence, they helped contain it and chose to seal themselves beneath the land to protect the home they had founded. The guardian stories preserve a genuine sacrifice, while their purpose continued twisting during confinement. Their exact present reach and connection to the sea remain undecided.

- Kingdom lore Topic 26 (2026-11-17): Owner chose B for the containment's builders: the early exiles encountered the older power, suffered its effects and contained it. Later generations preserved comforting founding stories while the structures' purpose was forgotten; the founding legends omit a catastrophe. This clarifies Topic 2: the power predates the exile kingdom, but its containment was built by the early exiles, not an established separate ancient civilization. Who rewrote the history, whether the omission was deliberate and the First Exile's exact role in the containment remain undecided.

- Kingdom lore Topic 25 (2026-11-17): Owner chose B for the Void Sovereign's original purpose: ending the suffering caused by the Creep's relentless growth and transformation. Under the power's influence, that purpose became erasing everything capable of suffering, leaving perfect stillness. Players find places where the Creep has stopped and nothing else lives. The Sovereign's identity, methods and exact relationship with the other Ubers remain undecided.

- Kingdom lore Topic 24 (2026-11-17): Owner chose B for the Architect of Ruin's original purpose: repairing the ancient containment after understanding the wartime damage. Under the power's influence, restoring the original design became an obsession pursued at any cost, including tearing apart communities built from salvaged containment pieces. Players uncover a genuine rescue effort that became monstrous. The Architect's identity, methods and how much restoration is genuinely necessary remain undecided.

- Kingdom lore Topic 23 (2026-11-17): Owner chose B for how people remember the First Exile: a guardian believed to remain beneath the land. People leave offerings and credit them with protecting the kingdom. Some communities remain devoted even as that "protection" becomes frightening. Specific rituals, the extent of this belief and what worshippers know about the transformation remain undecided.

- Kingdom lore Topic 22 (2026-11-17): Owner chose A for the First Exile's original purpose: giving the rejected a home where nobody could be cast out again. Under the power's influence, belonging became possession: everyone who reaches the land belongs to it forever. Players discover how that founding promise became terrifying. Whether the First Exile causes the sea's imprisonment, why Kroten's ships pass freely and the timing of the First Exile's transformation remain undecided.

- Kingdom lore Topic 21 (2026-11-17): Owner chose B for how the Creep changes those drawing on its power: their purpose gradually consumes them, and original intentions harden into monstrous obsessions. A protector preventing anyone from leaving and a healer sustaining people through horrific changes are illustrative examples, not assigned identities or a fixed roster. Players uncover the personal intentions behind these transformations, informing the histories of the Ubers. Specific histories and physical manifestations remain undecided.

- Kingdom lore Topic 20 (2026-11-17): Owner chose A for the capital's field workers: people are bound to work for their rations. Families receive food and shelter in exchange for compulsory shifts, and leaving means losing the household's allowance. Workers may depend on the arrangement, resent it or both. District labour quotas are not established.

- Kingdom lore Topic 19 (2026-11-17): Owner chose A for the capital's remaining food production: constant labour holds the Creep back. Workers clear roots, dredge channels and burn affected growth under guard, requiring enormous effort to keep even a small area productive. The workers' recruitment, conditions and ability to leave remain undecided; no protective ward or special immunity is established.

- Kingdom lore Topic 18 (2026-11-17): Owner chose B for why abundance has not ended the famine: the Creep destroys reliable farming. Fields briefly produce enormous harvests, then roots choke waterways and aggressive growth overwhelms surrounding land. Communities receive short-lived windfalls while losing the farms they depended on. Harmful food or changes caused by eating it are not established by this decision.

- Kingdom lore Topic 17 (2026-11-17): Owner chose A for recognizable signs of the Creep: life grows strangely abundant, crops ripen out of season, wounds close unusually quickly and animals grow larger. Later the growth becomes distorted and difficult to stop. These initially useful effects explain why starving communities welcome it. This establishes lore and visual direction, not new crop, healing or animal gameplay mechanics.

- Kingdom lore Topic 16 (2026-11-17): Owner chose **The Creep** as the everyday name for the spreading supernatural changes. Farmers, sailors and guards use it for effects on both land and sea, connecting those dangers before the player learns their cause; example usage: "The Creep's reached the wells." Its specific recognizable signs remain undecided.

- Kingdom lore Topic 15 (2026-11-17): Owner chose B for public understanding of the supernatural changes: everyone knows something is spreading, people share a common name for it and recognize its signs, but disagree about its origin. Communities already take precautions, some useful and others desperate superstition. The common name, recognizable signs and specific precautions remain undecided.

- Kingdom lore Topic 14 (2026-11-17): Owner chose A for the official explanation of Kroten's safe passage: port authorities claim Kroten alone has superior vessels, charts and experienced crews capable of surviving the crossing. Players can gradually find evidence that seamanship does not explain the difference. The true reason for safe passage remains undecided.

- Kingdom lore Topic 13 (2026-11-17, owner's clarification): Owner chose B: ships attempting to leave go out and do not come back. Passage is sold with the danger reflected in its cost; departure is unsafe. People doubt the missing ships made it out, but desperation drives attempts and some believe escape works. The guards have stopped sending men on the return boats. The public has no confirmed account of the missing ships' fate; do not establish survivors, returning wreckage or a specific attack without a further decision. The port controllers' knowledge from Topic 12 remains distinct from public uncertainty.

- Kingdom lore Topic 12 (2026-11-17, owner's answer): On land, people believe escape is possible if they can afford passage, but this is a scam run by those controlling the few active ports. The port controllers know the forces affecting the land have crept into the sea, where unknown forces prevent ships from leaving. Ships belonging to the larger kingdom can nevertheless move freely between the lands. The larger kingdom is provisionally named **Kroten**. Why its ships can pass, how the sea prevents other departures and what happens to attempted escapees remain undecided; do not assume Kroten controls the force.

- Kingdom lore Topic 11 (2026-11-16): Owner chose A for resistance at the player's arrival: small local groups pursue different aims, including protecting food deliveries, exposing officials or seeking revenge. Thirty years of betrayal have left them distrustful of one another. The player builds relationships across these groups and encounters conflicting methods. Individual groups, their names and any gameplay choice system remain undesigned.

- Kingdom lore Topic 10 (2026-11-16): Owner chose B for the larger kingdom's present role: it quietly deals with the former rebel rulers. Secret arrangements provide selected elites with supplies or protection while restoring the larger kingdom's influence. Some shortages and safe shipping routes are deliberate, creating evidence for the player to investigate. The participants, exact terms and extent of these arrangements remain open.

- Kingdom lore Topic 9 (2026-11-16): Owner chose A for the power's first appearance in communities: it initially seems useful, such as restoring a failing crop, healing an injured worker or empowering a village defender. Harmful consequences emerge later, leaving some communities dependent on benefits they know are dangerous. These examples establish the pattern, not a fixed list of effects or new gameplay mechanics.

- Kingdom lore Topic 8 (2026-11-16): Owner chose B for the imprisoned power: the containment held a power once used to gain extraordinary abilities, which changes those who use it. Those most deeply transformed became the beings encountered as Ubers. The player can discover each being's history, motives, what they gained and what it cost them, and why the power was sealed away. The power's identity, the timing of individual transformations and each existing Uber's precise connection remain open.

- Kingdom lore Topic 7 (2026-11-16): Owner chose A for the rulers' knowledge: reports eventually revealed what had been dismantled, and the rulers suppressed the evidence because admitting responsibility could destroy their remaining authority. The player encounters silenced witnesses, altered records and guarded ruins. How much the rulers understand about the ancient power itself remains open.

- Kingdom lore Topic 6 (2026-11-16): Owner chose A for the containment's damage: ancient structures whose purpose had been forgotten were dismantled for stone and metal to supply wartime fortifications and weapons. People understood the damage only when strange events began around the dismantled sites. Reused pieces are scattered across the kingdom, letting the player gradually recognize their origin in familiar structures and objects. Individual sites and affected items remain undecided.

- Kingdom lore Topic 5 (2026-11-16): Owner chose B for everyday rule: the rulers' control fades beyond the capital. Districts receive irregular food deliveries, while outlying villages largely fend for themselves. Local captains, bandits and surviving community leaders determine what happens, so council decrees carry different weight from settlement to settlement.

- Kingdom lore Topic 4 (2026-11-16): Owner chose B for new arrivals: exile has become a disguised death sentence. The larger kingdom knows the exile kingdom has collapsed and abandons people offshore or on its most dangerous beaches. The player survives a landing intended to kill them. The player's individual offence or reason for exile remains open.

- Kingdom lore Topic 3 (2026-11-16): Owner chose B for the capital's rulers: the rebellion expelled the foreign agents, but its leaders became the new rulers and kept emergency powers for thirty years. Some believe rationing and force are holding the kingdom together; others have grown wealthy from the arrangement. Older inhabitants remember these rulers as heroes, creating divided loyalties. Their individual identities and the larger kingdom's current actions remain open.

- Friends as lore characters (2026-11-16): Owner wants friends represented as characters in the kingdom's lore. Sir Broden, also known as "keyzersoze", "johney depp", and "lemmestun uponyou", is a coastal knight who escorts food wagons between the wreck shores and starving districts. His armour is repaired with ship steel and he carries a heavy hammer, hence "Lemmestun Uponyou". Different settlements know him by different names. His knightly order collapsed during the war, but he still keeps its oath. Owner accepted this background and requested a future NPC quest chain awarding a unique item; quest details and the unique remain undecided.

- Kingdom lore Topic 2 (2026-11-16): Owner chose B: the exiles unknowingly built their kingdom over an older power. During the conflict thirty years before the player's arrival, war damaged the places keeping that power contained, and supernatural effects have slowly spread outward since. This is the smaller supernatural thread leading toward the Uber bosses; the power's identity and individual boss connections remain open.

- Kingdom lore Topic 1 (2026-11-16): Owner chose war, neglect and hunger as the foundation of the kingdom's devastation, "with a bit of B to lead into the ubers": a smaller supernatural element leads into the Uber bosses. The supernatural cause, who unleashed it, and its connection to individual bosses remain undecided.

- Kingdom lore foundation (2026-11-16, owner's premise): People cast out by their original society built a noteworthy kingdom on the exile continent over hundreds of years. The larger kingdom refuses to recognize it and sent people to infiltrate the High Council so a select elite would rule the exiles. The exiles discovered this and planned to attack back; this was thirty years before the player's arrival. By the player's arrival, commerce and trade have broken down, a small amount of food is produced in the capital and distributed to districts, and poorer inhabitants depend mainly on cargo washed ashore by rough seas and offshore whirlpools, unless roaming bandits take it. What happened during the intervening thirty years, and the precise cause of the landscape's devastation, remain open. Landscape proposals are under discussion, not approved changes to game geography or artwork.

- Production Skill Separation Topic 3 (2026-11-16): Stations, Tools, and Save Migration.
  - 3a: Dedicated stations for each discipline: Smelter / Furnace (Smelting), Forge / Anvil (Forging), and Woodcrafting Bench (Woodcrafting), each with independent non-combat upgrade paths (Levels 1–3).
  - 3b: Dedicated tools early at Lv 15 (Smelter's Tongs, Wayfarer's Hammer, Carver's Drawknife each +8% speed to their skill), with higher-tier masterwork project tools combining speeds across production skills (e.g. Master Artisan's Multi-Tool).
  - 3c: Full grandfathering for existing player saves: existing Smithing level/XP maps to Smelting, Forging, and Woodcrafting, preserving player progression and recipe access without loss.

- Production Skill Separation Topic 2 (2026-11-16): Skill Names, Gear Scope, and Input Flow. Decided Option A across all three questions:
  - 2a: Skill names are **Smelting** (bars & alloys), **Forging** (metal gear & jewellery), and **Woodcrafting** (staves, wands, bows, organic gear).
  - 2b: True refining pipeline: Forging requires smelted metal bars and components; Woodcrafting requires harvested logs and refined planks.
  - 2c: Split equipment by material/archetype: Heavy plate armour and metal weapons (swords, axes, maces, daggers) stay in Forging along with jewellery (bars + gems); cloth robes, leather/evasion armours, staves, wands, and bows move to Woodcrafting.

- Production Skill Separation Topic 1 (2026-11-16): Smelting, Forging, and Woodcrafting Separation. Decided Option A across all three questions:
  - 1a: Split into full standalone 1–100 professions on the sidebar with their own level, XP, masteries, and tool slots.
  - 1b: Dedicated Woodcrafting skill for wooden equipment (staves, wands, bows).
  - 1c: Dedicated Smelting skill for refining ores into metal bars and casting alloys, separating metallurgical refining from finished equipment forging.

- Grounded world-atlas revision (2026-11-16): Owner approved rebuilding connected geology and drainage before surface detail; locate cities at useful harbours/crossings, vary coastal complexity, reduce oversized special landmarks, leave ordinary open country, and use thinner selective ink with much less artificial paper distress. Revised art saved as `output/imagegen/ashen-codex-world-atlas-1800s-v2.png`; game integration and overlay alignment pending.

- World-map scale and style (2026-11-16): Owner wants the world view much farther zoomed out and less detailed, like an 1800s geographic atlas. Preserve the six regions' geographic arrangement, use small settlement footprints and restrained terrain marks; local scenic detail belongs in act close-ups. First artwork draft saved as `output/imagegen/ashen-codex-world-atlas-1800s-v1.png`; replacing the game asset and aligning overlays remains pending.

- Mastery Batches (2026-11-16, expanded after initial Copper-only implementation): All suitable ordinary production recipes get a separate Mastery Batches category. Matching recipe mastery 15 unlocks 5× inputs/output/XP in 2× time; mastery 90 unlocks 50× inputs/output/XP in 10× time (5× production speed, as clarified by the user). Mastery practice scales with nominal batch duration, preserving the single craft's mastery rate per second. Equipment, maps, keys, protected rare components and multi-profession Masterworks keep existing pacing. Legacy discounted Alchemy ×10 recipes and already paid Copper Supply project runs are preserved.

- Skilling Minigame Mastery Bonus (2026-11-16): Added +0.01% (+0.0001) permanent maximum Focus speed bonus to each skilling minigame for every mastery level earned across all tasks/recipes in that skill, raising the max Focus speed cap beyond the baseline 45%. The minigame UI displays the updated live Focus speed and provides a tooltip showing the exact permanent max cap.

- Inactive Minigame Callout Removal (2026-11-16): Removed the static callout box ("Start an activity and play it by hand to work up to 45% faster than leaving it to idle") shown below skill actions when no activity in that skill is currently running. The manual focus minigame card renders only while an action in that skill is actively executing.

- Mastery Tooltip Redesign (2026-11-16): Replaced the unformatted single-sentence native tooltip on skilling mastery bars with a rich, structured `MasteryTip` layout. Features a header with task name, current level, and practice progress; a baseline bonus summary (+% action speed, ordinary yield/conservation, eligible ingredients); and dedicated milestone cards for Lv 25, 50, 75, and 100 with unlock badges, Task vs Global scope labels, and effect descriptions.

- Action Card Blurb Cleanup (2026-11-16): Removed legacy static flavor/tutorial blurbs (such as "Ore supplies current Smithing bases...", "Logs supply Smithing bases...", "Choose each use in Alchemy, Cooking or Rune-carving yourself", and craft component disclaimers) across Mining, Woodcutting, Foraging, Cartography, and Smithing action cards. Action card body text is reserved for actionable dynamic mechanics (fragment/fossil/seed counters, extraction/heartwood modes, and input requirements).

- Masterwork Workbench Interactivity and Description Cleanliness (2026-11-15): Required material rows on profession workbenches now link directly to their source skills with interactive hover and inline skill chips (and missing base alerts link to crafting skills), removing the separate redundant sources footer bar. Project description banners suppress redundant item affix and item level text already displayed on the live Crafted Outcome preview card.

- Skilling Action Access (2026-11-15): Removed double-gating from ordinary skilling actions. Mining veins/deposits, Woodcutting trees/stands, Foraging blooms, and Gemcutting exact cuts now unlock directly upon reaching their required skill level, removing redundant cycle counters (Prospecting, Woodcutting Surveys, and work_100/work_30 accomplishment gates).

- Skilling Mastery Overhaul Topic 3 (2026-11-15): Recipe Personalities and Feedback. Decided B for 3a (Sub-category recipe personalities tailored to item roles: e.g. Life/Mana flasks gain extra charge capacity, utility flasks gain duration, currency brewing gains elevation/discount chances; standard ores gain vein strikes while rare cosmic ores gain geodes and crystal fragments). Decided A for 3b (Milestone badges 25/50/75/100 on action cards, lively proc callouts in active skilling, and detailed proc tallies in offline return summaries).

- Skilling Mastery Overhaul Topic 2 (2026-11-15): Scope and Mechanics Style. Decided B for 2a (Hybrid Milestone Synergy: Lv 25/50 provide task-specific perks; Lv 75/100 grant small permanent profession-wide traits to reward completionism). Decided the split model for 2b: Gathering & Thieving adopt dynamic proc-based and jackpot mechanics (Vein Strikes / instant multi-swings, geode/fossil discoveries, lucky pockets, heist alert dips), while Production & Crafting adopt systemic quality and rule enhancements (higher minimum affix tiers on gear, bonus flask charges/durations, extended meal buff timers, catalyst potency, free batch conservations).

- Skilling Mastery Overhaul Topic 1 (2026-11-15): Thematic Milestone Overhaul. Decided A for both 1a and 1b. Mastery retains its 1–100 progression per task with modest baseline scaling (action speed and ordinary yield/conservation capped lower as a background chassis, e.g. 10%), while crossing key milestone thresholds (Lv 25, 50, 75, 100) unlocks distinct, flavorful mechanical perks unique to that profession (e.g. vein strikes, extra charges, alarm suppression, extended feast buffs).

- Masterwork Project UI Overhaul (2026-11-15): redesigned the profession project panels (ProjectBoard) from walls of dense text into interactive, video-game style workbenches. Added visual item art and category badges, distinct level/station/accomplishment requirement badges, split inputs-to-outcome recipe grid with stock indicators and missing-materials highlights, rich reward cards previewing exact unique affixes/mods, base item picker with clear missing-base alerts, material source chips with direct skill navigation, run stepper with quick 1/5/10/Max preset buttons, and an Active Undertaking workbench banner with animated progress and escrowed item display.

- Skilling Mastery Scope (2026-11-15): removed mastery tracking and speed scaling from profession masterwork projects (undertakings) and archaeology excavation sites. Projects and excavation sites are milestone and limited-completion progression paths (few completions / stratum discoveries), rather than repetitive actions meant to be farmed to mastery level 100 (120 hours).

- Skilling UI and Profession Undertakings (2026-11-15): repositioned profession projects to the bottom of each skill page below primary activities, and renamed them with on-theme craft titles and action verbs (Smithing: Forge Masterworks / Begin masterwork, Mining: Mining Prospects, Woodcutting: Timberworks, Foraging: Cultivations, Alchemy: Great Works, Cooking: Feasts & Banquets, Gemcutting: Lapidary Works, Cartography: Survey Expeditions, Rune-carving: Runic Inscriptions, Thieving: Underworld Schemes, Archaeology: Relic Restorations). Reorganized crowded profession views into dedicated category tabs modeled on Woodcutting: Thieving now features Street Marks (sectioned into Street Targets Lv 1–16, Civic & Wealthy Lv 24–40, and Underworld Figures Lv 48+), Heist Operations (with active run tracker and casing notes), and Rogue Crew (crew capacity, ranks, and toggles); Archaeology cleanly separates Excavation Sites from Culture Merchants and removes duplicate generic activity cards; Alchemy, Cooking, Gemcutting, and Rune-carving add category filter chips; Harvesting separates Wild Foraging from the Greenhouse.

- Skilling overhaul Phase 18, Whole-overhaul acceptance (2026-11-15): audited all 11 professions, 7 tools, 2 signature inscriptions, 2 feasts, Artisans' Reliquary, and all 13 exclusive uniques (`tests/overhaulAcceptance.test.ts`). Verified full ingredient source-graph reachability, market/trading ID validity, idempotent pre-overhaul save migration, Classic mode blocks, all 13 unique acquisition routes, and 8-hour live/offline parity across all 11 professions. Fixed `?overhaulPlaytest` query-param stripping in `src/main.tsx` and added Pinnacle pairing buttons to `src/dev/overhaulPlaytest.ts`; browser-playtested desktop (1280×800) & phone (390×844) flows, Worldheart + Debt/Grudge and Sum + Grudge pairings, and 4h offline return summary with 0 JS errors. Updated `docs/GAME.md` and `docs/wiki/` pages to reflect live overhaul behavior.

- Skilling overhaul Phase 16, Rune-carved uniques (2026-11-15): delivered Hands of the Forgotten Choir and Hollow Circuit via Rune-carving 70 / Rune Board 1 crafted-item inscription projects (`hands_forgotten_choir`, `hollow_circuit`). Project base escrow and transformation: projects require crafted non-unique bases (`hierophant_gloves` or `seraph_gloves` for Choir; `diamond_ring` ilvl >= 45 for Circuit) which are escrowed on start, returned with full attributes on cancel, and transformed on completion into the unique with a fresh UID while preserving base item type. Hands of the Forgotten Choir (`hands_forgotten_choir`): places 2 totems at once on a single cast (`spawns = 2`); expands active totem capacity by +2 (`raw.totemMax += 2`); wearer direct damage is suppressed (emits hit amount 0), along with all personal ailments (bleed, poison, ignite, chill, freeze, shock), culls, flare, cataclysm, leech, reflection/triggers (Anvil thorns, briar thorns, iron reflexes, flagellant martyr, barbed ward, radiance, payback, execute, soul tether, anvil retaliate) and Buried Grudge shockwaves; totems and minions retain their own damage ownership and offensive scaling; curses, marks, buffs, and guard skills remain usable without personal damage; unequipping immediately prunes excess totems via `totemEnds`. Hollow Circuit (`hollow_circuit`): converts 100% of would-be mana regeneration into continuous ES recovery (`esRecovery = raw.hollowCircuit && maxEs > 0 ? Math.max(0, wouldBeManaRegen) : 0`); mana regeneration and natural ES recharge are set to 0 (`manaRegen = 0`, `esRecharge = 0`); recovery operates continuously every tick in combat without recharge delay or start triggers; negative mana regeneration remains mana degeneration without draining ES; alternative mana recovery (flasks, mana leech, recoup) remains functional; Debt of Stone zeroes max ES so conversion cannot create ES and does not fallback to mana; unequipping immediately restores normal mana regen and natural recharge without residual snapshots. Regenerated `docs/UNIQUES.md`; 26 tests in `tests/runeUniques.test.ts` passing; 1,689 tests in 102 test files passing; no release.

- Skilling overhaul Phase 15, Defence and recovery uniques (2026-11-15): delivered all five defence and recovery uniques with exclusive skilling routes and non-overlapping identity contracts. Borrowed Tomorrow (Thieving project `borrowed_tomorrow`): instant leech capped at 10% max life per hit and 20% max life rolling 1s cap via `s.clock` and `CombatRuntime.instantLeechLog`; life regen and flask life recovery set to 0; mana leech, recoup, and life-on-kill remain functional. The Buried Grudge (Smithing project `the_buried_grudge`, base `sunforged_bulwark`): takes 50% post-mitigation blocked damage (65% with Glancing Blows), stores the prevented 50% (35% with Glancing Blows) in `s.buriedGrudgeCharge` up to 300% max life (cleared on unequip/death); next slam skill snapshots and clears charge, discharging 100% of stored charge as a physical shockwave split equally across valid enemies, mitigated once by enemy armour without crits, leech, or ailments. Witchglass (Alchemy project `witchglass`, unique flask `u_flask_witchglass`): converts 100% of player elemental damage to chaos damage while active; forbids inflicting elemental ailments (ignite, chill, freeze, shock), while poison remains eligible. The Still Heart (Alchemy project `the_still_heart`, unique flask `u_flask_still_heart`): recovers 1,800 life over 6s continuing at full life; while active, life leech and life regen are forbidden; reusing resets duration and recovery amount without stacking. Debt of Stone (Smithing project `debt_of_stone`, base `sunforged_plate`): defers 50% of incoming hit damage evenly over 4s into `s.debtQueue`; sets max/current ES to 0; tranches tick proportionally in combat and town via `tickDebt` as direct unmitigated life loss; persists across combat exit, town, save/load, and unequip; cleared on death. Verified all item pairings: Borrowed Tomorrow + The Still Heart (instant leech/recoup work; flask life heal active, life regen 0); Winter's Pyre + Witchglass (cold converts to chaos, ignite forbidden); The Buried Grudge + Debt of Stone (100 post-mitigation blocked hit -> 50 stored in grudge, 25 taken now, 25 deferred over 4s without double mitigation). Exclusive projects use existing high-tier skilling materials (`stone_alloy`, `heartwood_frame`, `prepared_glass`, `moon_distillate`, `star_distillate`, `treasury_fragment`) with non-combat discovery and profession requirements. Regenerated `docs/UNIQUES.md`; 34 tests in `tests/defenceUniques.test.ts` passing; no release.

- Skilling overhaul Phase 11, Thieving and Heist (2026-11-15): removed campaign area entry gates for independent level-1 Thieving access. All 10 existing marks become level-only, paying gold and random Markers/Seals/Wax plus 1 deterministic Marker every 10 mark completions via shared persisted counter `professionProgress.counters['thieving.markers']` independent of manual doubles (4-minute funding bound for 8 Markers). Milestone-based job progression: Cinder Toll (level 1), Salt Tithe and Forger's Den (clean Cinder Toll exit `heist_clean_cinder_toll`), Last Wagon and Barrow Cache (clean Salt Tithe exit `heist_clean_salt_tithe`), Remounts and Pyre Vault (clean Last Wagon exit `heist_clean_last_wagon`), Khan's Tribute (clean Pyre Vault exit `heist_clean_pyre_vault`), and Occult Treasury (level 65 + clean Khan's Tribute exit `heist_clean_khans_tribute`). Clean chosen early exit counts toward progression milestone; vault alarms never gate progression; legacy saves with unlocked campaign zones grandfather access via `legacyAccess['heist.' + job.id]`. Equipment targeting before Last Wagon, Remounts, and Khan's Tribute allows selecting category (`all`, `weapon`, `armour`, `jewellery`), filtering droppable rare bases with equal weight without guaranteed affixes; gear ilvl capped by `min(job.ilvl, Thieving level + 10)` rather than campaign progress. Added Occult Treasury (`occult_treasury`): level 65, 6 rooms × 60s, 80 Markers, alert 8, 75 final XP per completed room (450 total), gold 250 × room, Marker 10% × room (cap 1), Arcane Dust 25% × room (cap 5), vault 2000 gold + 50 dust. Every completed room (including alarm rooms) awards 1 `treasury_fragment` on settlement; clean vault awards +4 extra fragments and 1 `oath_fragment`; every 12 completed rooms awards 1 `oath_fragment` (`thieving.treasury_rooms` counter); clean vault rolls 0.5% Borrowed Tomorrow jackpot with protected output delivered into overflow if bag is full. Added profession projects: `borrowed_tomorrow` (Thieving 65, 120 treasury fragments, 60s / 120 XP -> Borrowed Tomorrow amulet on statless `overhaul_treasury_amulet` base, ilvl 80, combat level 60, one rune slot) and `assemble_oath` (Thieving 75, 5 oath fragments, 60s / 150 XP -> `stolen_oath_seal` P 1). `HeistBoard.tsx` removes Act 2 entry blocker and shows clean exit badges, clean probability, alarm keeps share, Marker costs, equipment target category selector with base count and ilvl cap, and treasury/oath fragment counters; `mountOverhaulPlaytest` adds Thief Heist kit scenario; evidence in specification §23; no release.

- Skilling overhaul Phase 10, Rune-carving (2026-11-15): removed campaign area entry gates for independent level-1 Rune-carving access. Accomplishment-based grade progression: 6 families (ember, rime, storm, stone, blood, keen) and 4 grades unlocking at grade base level + family index * 2; Grade 2 requires 10 Grade 1 carves of that family (`rune_<family>_grade_1_practice`), Grade 3 requires 10 Grade 2 carves (`rune_<family>_grade_2_practice`), and Grade 4 requires 10 Grade 3 carves (`rune_<family>_grade_3_practice`). Completed crafts are tracked in `professionProgress.counters['rune.<family>.<grade>']` once per nominal completion cycle, never multiplied by bonus copies or Second Stroke. Existing access grandfathered via `settleProfessionProgress` / `carryRuneAccess`. Grade 2+ ordinary rune carves generate 1 protected `inscription_fragment` every 20 completed cycles (+1% extra chance). Added future inscription components: `prepare_return_inscription` (L65, 60s / 36 XP, 10 inscription fragments + 1 Keen grade 3 rune -> `return_inscription` P 1), `prepare_choir_inscription` (L70, 60s / 45 XP, 10 inscription fragments + 1 Blood grade 3 rune -> `choir_inscription` P 1), `prepare_circuit_inscription` (L70, 60s / 45 XP, 10 inscription fragments + 1 Storm grade 3 rune -> `circuit_inscription` P 1), and `inscribe_convergence` (L90, 120s / 90 XP, 5 inscription fragments + 1 Stone grade 4 rune -> `convergence_inscription` P 1), all with protected full-cost outputs. Added signature projects: `signature_wayfarer` (L55, 10 Deep Stone carves, 30 min / 360 XP, 10 inscription fragments + 1 Stone grade 3 rune + 5 heartwood fragments -> `rune_signature_wayfarer` P 1; Weapon +6% gathering speed, Armour +4% all elemental resistances, Jewellery +6% max Mana; Stone resonance scales values; ilvl 45) and `signature_channel` (L65, 10 Deep Storm carves, 30 min / 480 XP, 10 inscription fragments + 1 Storm grade 3 rune + 1 exceptional crystal -> `rune_signature_channel` P 1; Weapon +8% cast speed, Armour +8% energy shield, Jewellery +10% mana regen; Storm resonance scales values; ilvl 45). Preserved single rune slot per item: inscripting replaces and destroys existing rune while preserving item base, UID, rarity, and affixes; rejects items below required ilvl; project base consumption previewed explicitly. `SkillPage.tsx` categorized into 5 tiers with practice counters and inscription fragment countdowns; `BenchPage.tsx` previews slot effects, ilvl checks, replacement status, and resonance before inscription; `mountOverhaulPlaytest` adds Runic gear customization scenario; evidence in specification §22; no release.

- Skilling overhaul Phase 09, Gemcutting (2026-11-15): independent level-1 Gemcutting. Implemented five targeted family pools (attack, elemental spells, summoning, 17 explicit defensive supports, and damage supports) at level 15 (30s / 36 XP, 6 rough gems + 50 arcane dust) awarding uniformly from reachable gems; exact gem recipes `cut_exact_<gemId>` for all active/support/signature gems at level `max(20, gemReqLevel + (signature ? 5 : 0))` (60s / 60 XP, 12 rough gems + 100 arcane dust) gated by 30 completed foreground Gemcutting cycles (`gemcutting_work_30`) with explicit unmet equip requirement previews in UI; legacy `cut_signature` empty-pool fallback removed to block before payment when no gems qualify; safe gem recycling `recycle_gem` (5s / 0 XP) consumes 1 explicitly selected unequipped/unlocked gem UID from inventory/gem bag for 5 Arcane Dust and rejects equipped/socketed/locked gems; minimum net cut cost floor of 1 rough gem and 6 arcane dust enforced on all cut actions (`a.gem`) even under 100% input save / maximum discounts, ensuring recycling cannot fund self-sustaining crafting loops; Exceptional Crystal (L60, 60s / 120 XP, 10 crystal shards + 5 rough gems -> 1 exceptional crystal P) and Convergence Crystal (L85, 120s / 240 XP, 1 exceptional crystal + 50 arcane dust -> 1 convergence crystal P) protected components; Lapidary's Chisel tool project (`tool_gemcutting`) crafts at L30 with `gemcutting_work_100` (20 min / 360 XP) giving +8% Gemcutting speed on `profession_hammer`; UI categorized into 5 tiers with family probabilities, requirement checks, and unequipped gem picker; playtest missing support acquisition and socketing verified; evidence in specification §21; no release.

- Skilling overhaul Phase 08, Cooking (2026-11-14): removed campaign area gate for independent level-1 Cooking entry. Updated ordinary dishes with affordable herb/log costs and removed random essence requirements. Added purpose groupings: Survival, Resources, Damage, Gathering, Production, and Reagents. Added limited skilling meals: Gatherer's Ration (+5% Gathering/Thieving speed) and Artisan's Lunch (+5% Production speed) for 30 minutes of relevant active work. Added signature dishes (Moonfall Consommé for Mana/cast speed, Starlight Banquet for Life/resistances), non-edible project material Binding Stock, and 5-batch feast projects (Grand Artisan's Feast, Wayfarer's Feast). Single active meal invariant; combat meal clocks tick only while in combat; skilling meal clocks tick only while performing relevant foreground work; both pause while idling. Switching meals replaces remaining duration with the new dish's full duration. Opt-in re-eating via `keepEating` consumes 1 meal on expiry carrying fractional overrun time, and stops cleanly on empty bank without switching actions. Previews and PantryBoard display supply-supported duration and stop-on-empty notes. Hearth Spoon crafts and equips at combat level 1 with +8% Cooking speed on `profession_hammer`. Evidence in specification §20; no release.

- Skilling overhaul Phase 07, Alchemy (2026-11-14): flasks and currencies retain existing IDs and effects while campaign gates are removed. Added missing middle mana brewing route `brew_mana_medium` (level 15, Table 2, 5s / 10.5 final XP, 6 frostleaf + 3 oak logs) filling into `account.flaskStash`. Added dependable special reagents (`prepare_glass` at L40, `distill_moon` at L50, `distill_star` at L65, all Table 3) requiring full inputs without tree input conservation or manual doubles and awarding 1:1 protected bank outputs. Cooking-made flask ingredients retained. Action categorization into Life, Mana, Defence, Utility, Special Reagents, and Currency with readable previews for recovery, duration, charges, automation notes, intended currency uses, batch input discounts, and elevation/refund chances. Noncombat Station 2/3 hideout profession routes (`alchemy_work_20`, `alchemy_work_60`). Distiller's Stirrer crafts and equips at combat level 1 giving +8% Alchemy speed on `profession_hammer`. Evidence in specification §19; no release.

- Skilling overhaul Phase 06, Foraging and Greenhouse (2026-11-14): herbs maintain distinct uses; added Abundant Patches (2 herbs, 1.5× time) and Concentrated Patches (1 herb, 2× time, guaranteed rotating essences every 12 completions). Emberbloom Bed adds deterministic Storm I and Embers I alternating every 12 completions. Moon Bloom and Star Bloom provide protected blooms every 60 cycles (+ 1% extra) with 100 Foraging work requirement. Discovered seeds (100 completions or 1% foreground chance) enable explicit plant selection in Greenhouse once its tree keystone is allocated without combat or station requirements. Greenhouse runs at 20% background rate, pauses during active Foraging without resetting partial cycle progress, and advances bloom counters at 20% rate without early seed rolls or manual doubles. Grown and foraged blooms share material IDs and bank storage. Seedkeeper's Sickle project crafts and equips at combat level 1, giving +8% Foraging speed on `profession_hammer`. Evidence in specification §18; no release.

- Skilling overhaul Phase 00, design-pass topic 1 (2026-11-13): owner said “sum of all is the only divinable thing here”. The Sum of All Things permits ordinary Divine rerolls of its uniform integer1–200 effect; other twelve new uniques have fixed effects. This supersedes the reference's assistant-proposed full-recipe-only reroll restriction. A whole new craft remains possible. [Specification](SKILLING_OVERHAUL_SPEC.md) distinguishes the owner's selected concepts/constraints from assistant-authored recipes, numeric tuning and the three pinnacle effects; no gameplay implementation.

- Pinnacle chase uniques (2026-11-12): owner requested three additional uniques, each with one powerful stat or rule bend and a recipe combining at least three endgame mechanics. One must roll from weak to exceptional and use a little from everything. Drafted The Second Heresy (+1 Forbidden keystone allowance), Worldheart (30% less Damage taken), and The Sum of All Things (1–200% more Damage), with source baskets and proposed full-recipe reforging in SKILLING_OVERHAUL.md. These three have no added drawbacks; the original ten retain theirs. Names, effects and numerical tuning are assistant-authored designs; no gameplay implementation.

- Skilling overhaul (2026-11-12): owner wants an optional path to cool gear as well as campaign upgrades for struggling builds. Chosen: known crafting projects plus surprises, one task per visit rather than automatic production chains, and skill-based progression independent of personally advancing through combat. Full profession proposal accepted as a reference in [SKILLING_OVERHAUL.md](SKILLING_OVERHAUL.md); exact content and tuning remain to specify. No implementation or release yet. Existing mastery remains bonus-only; proposed profession access supersedes campaign gating only when built.

- Unique drops rework (design, 2026-11-10): ordinary uniques use one low-weight global pool and can drop once the monster's item level reaches its base item's requirement. They no longer belong to hand-picked area or Map-tier pools. Achievement rewards and Hard Boss, Uber Boss, and Unique Map trophy uniques remain exclusive to their earned or encounter source.

- Campaign Totem leveling unlock (2026-11-09): To allow players to use the totem passive nodes during campaign leveling, scaled down and moved 3 totem skills and their signature supports into the campaign: Flame Totem (Act 1, level 6, base 4–7 fire damage), War Totem (Act 3, level 32, 80% weapon physical damage), and Siege Totem (Act 6, level 58, base 16–24 physical damage). Their signature supports (Pyre Totem, Battle Totem, Long Siege) unlock alongside them at reqLevel + 6. The other 5 totems and all group totem supports remain endgame Maps unlocks.

- Passive tree handcrafted layout (2026-11-08): the formula layout is gone. Every cluster centre, junction, keystone, gate and road lives as fixed coordinates in `src/data/passiveTreeLayout.ts`; `passiveTree.ts` only says what each node is. Each class has two thoroughfares and a centre spine of chained clusters (hub → … → Cosmic Gateway → keystones → apex keystone → Outer Rim → Doomed Gate). Borderland Roads run along all six class borders, and each class's edge clusters bridge onto them at six depths, so the hybrid space between classes is filled. Mid Concourse (r≈2560) and Outer Rim (r≈4690) ring roads circle the whole tree. Shapes are wheel/pokeball (7 nodes), fork/loop/diamond (5) and line (3); a slot keeps its size, so every cluster, notable, mastery, keystone, gate and Forbidden id and stat is unchanged (only road ids changed). Travel costs to each destination stay within 5 points of 0.4.18 (average 0.3 cheaper). Second pass (user: "still completely symmetrical"): each class has its own silhouette (Warrior anvil, Duelist rapier, Ranger bow, Shadow maze, Mage orbit, Templar spire), with a bending centre road, one side lifted, rows rippling and snaking in its own rhythm, per-cluster nudges, wandering border roads and a different set of bridges on each border; the start area stays regular. Keystones zigzag down the centre road ~800 apart instead of side by side. Forbidden keystones sit one short road past the Outer Rim (r ≈ 4900–5250), no long spokes. Third pass (user: "too many straight lines"): every road is a curve (cubic control points baked per road in `ROADS`; travel nodes sit evenly along the curve and each link draws its piece of it). Thoroughfares and rings flow smoothly through their junctions and swing a little either way at each one (Shadow and Mage most); side roads peel off along the thoroughfare's flow and arrive straight into a cluster's entry; the Exile's spokes swirl like a pinwheel; the centre chain clusters and the keystone road zigzag. Travel counts on the keystone road are measured as if it ran straight, so no cost changed. Layout checked to have no crossing roads and no node on another road's line, with curves sampled. Fourth pass (user: "hate these branching off, every cluster should feel integrated", "halve total nodes, trim the fat starting with travel nodes, paths of just chained clusters, bring back the shapes", points kept the same): the thoroughfares, ring roads and Borderland Roads are gone. Clusters link straight into their natural neighbours (a neighbourhood graph over all cluster centres, so links never jump over another cluster), inside a class and across borders; keystones, Gateways, Doomed Gates and Forbidden keystones hang straight off the nearest cluster. Each cluster is turned so its ports face its links. Shapes are back: wheel, pokeball, spiral and branched line (7 nodes), trident, fork, loop and diamond (5), triangle (3). Only three-notable clusters carry a mastery. The whole tree is drawn 20% tighter. 1,573 nodes (was 2,208; 18 travel nodes). Economy follow-ons: small nodes now carry their class's travel attributes and cost travel points; notables and keystones still cost passive points. A design script checks every curve for crossings, cutting through a cluster, or brushing a landmark, and leaves out optional links that clash. Fifth pass (user: "fantastic... we do want it tidy and uniform"): clusters are spread evenly over a round disc (radius 3,650 round a clear start area) so spacing and link lengths are the same everywhere, each still tethered near its hand-placed spot so classes keep their own arrangement; the Gateway and two inner keystones hold their own spots inside; Doomed Gates (with their wheels fanned either side), apex keystones and Forbidden keystones sit a set distance straight out from a rim cluster, forming a ring just outside; every link leaves and arrives at most 40° off straight, so curves are all the same gentle bend. Forbidden keystones (user: "more spread out", "max of 1 through the passive tree"): the twelve sit evenly round the rim, one every 30°, between the class centre lines; the tree allows only one at a time (`allocateReason`), and a save holding two is refunded on load. Other sources of Forbidden effects are not limited by this. On every load, an allocation or saved profile that names a missing node or no longer connects is refunded in full (`settleTreeLayout`), so future layout edits are safe too. 2,233 nodes (522 road nodes, down from 666).

- Notable pass (design, 2026-11-08). Full draft list: [PASSIVE_NOTABLES.md](PASSIVE_NOTABLES.md). Found: all six regions held the identical 96 notables. Decided with the user:
  - Q1, regional identity: **B**. About a quarter of each region is a shared basics set (life, resistances, attack/cast speed, crit) so any class reaches staples nearby; the rest is unique to the region, and border clusters mix both neighbours' themes. Leanings: Warrior armour/melee/physical; Duelist block/bleed/fast attacks; Ranger projectiles/evasion/accuracy; Shadow poison/chaos/crit/curses; Mage elemental spells/ES/mana; Templar elemental attacks/resistances/totems.
  - Q2, archetype coverage: **A, all of them.** Each archetype gets its own cluster or two in the region that suits it (minions and curses with Shadow, totems with Templar, warcries and exertion with Warrior, marks with Ranger, storms and Doom with Mage), and chaos damage over time sits on the Shadow–Mage border. "Any skill you slot has somewhere on the tree to grow from." Needs new scaling stats for curses, totems, marks, warcries/exertion, storms and Doom (minion and chaos stats already exist).
  - Q3, rule-changing notables: **A, a few as landmarks.** About 2 per class region plus 1 on each border, 18 in total (~3% of notables), each deep in its region as the payoff for committing to that archetype; "rare enough that every one feels like a find". They are pure upside (user skipped the catch question; my default, keystones keep the trade-offs).
  - Decided for the user: each region's notables split roughly evenly between offence and defence/recovery, with utility (flasks, speed, crafting) on top, so every start has both nearby. Notables favour archetype-conditional stats (damage with bleeds, totem life, curse effect) over flat generic power. Existing ids, cluster sizes and masteries stay, so saves keep working; only names and stats change.
  - Starting areas correction (2026-11-08): the innermost 13 notables are no longer one template copied into all six regions. Each class gets broad but tailored offence, defence, recovery and resource choices: Warrior Life/Armour, Duelist balanced Armour/Evasion, Ranger Evasion/accuracy, Shadow Evasion/ES/Criticals, Mage Mana/ES/spells, and Templar Life/Mana/Armour/ES/resistances. These are affinities, not locked build lanes. Mage Mana regeneration now begins in its first wheel and its starting area has no Life regeneration.
  - Decided for the user: "more" multipliers only on rule-changing notables, the Doomed outer wheels and keystones (~5% of notables), so power comes from building into an archetype rather than single nodes. Class-mechanic notables: at most one plain one per region (~1%, well under the 5% cap); mechanic rule-bending stays in ascendancies.

- Passive Tree Zero-Lag Zoom (2026-11-08): Fixed the wheel zoom lag by throttling wheel transforms via requestAnimationFrame, applying `.is-zooming` to suppress pointer hit-testing during scroll gestures, batching inactive links into a single SVG path element, and removing style transitions and filters on node elements.

- Round 2 design pass (2026-11-09), from the owner's screen review in the Launch Guide:
  - Hideout tiers: **milestone tiers**. Each station gets about 3 more tiers, and every one unlocks something new (owner's examples: a Map Device tier unlocks the Atlas tree; Stash tabs 10% cheaper each rank and ground-loot storage; Forge better gear-tier chance) plus a stat bump. "Every upgrade is an event you save up for." The new top tiers are **endgame gated**: Hard Boss and Uber materials plus large gold, so finishing the hideout is a months-long goal.
  - War Table split (owner: "one for battlefield and skills and another for the rest"): the **War Table** keeps skill rules and battlefield automation; a new **Quartermaster** takes auto-salvage and loot handling. Both use milestone tiers. Auto flee, auto challenge and the new auto next zone sit behind War Table upgrades.
    - Auto next zone: **when the area is done**. Once the area's boss is down and the next area is open, it travels there; auto flee pulls the character back if it gets too hot.
    - Auto flee: **first and cheap**, the War Table's first upgrade at Act 1 materials, so new and Hardcore players have it within the first hour.
  - Mastery goes **per task**, not per band: every action and recipe has its own track (bulk versions share their single recipe's). Owner: "max mastery should take days to hit, on something like 5 days of grinding it." Set to 120 hours of unbuffed work per task (was 10 hours per band). This supersedes the 100-identity limit in the band-mastery design below. Decided for the owner: max-level bonuses rise to match the longer grind; mastery still never gates content.
    - Build small calls: stable tracks use the authored action/recipe id, and each Heist job is its own task. Max mastery grants 20% action speed and 15% ordinary yield or eligible ingredient conservation. Version 41 saves copy each old band's completion percentage to every replacement task that band benefited (10-hour practice is multiplied by 12 for the 120-hour cap), preserving every old level and bonus; old band counters remain inert for forward compatibility.
  - Achievements: 100+ (from 43). Rewards **change play**: achievement-only uniques, an extra passive or Atlas point, an extra stash tab, permanent small bonuses (+2% rarity, +1 offline hour). "Chasing achievements becomes part of getting stronger." Earned **per character**: Hardcore and SSF characters prove it again. Decided for the owner: the stash is shared per realm, so a stash-tab reward is added once, the first time any character in that realm earns it.
  - Loot filters: **both, layered**. Players first see strictness presets (Off, Soft, Strict, Very strict, Uber) that scale with level, plus per-category overrides ("always show rings with life", "hide normal gear", "highlight T1 mods"). A "custom rules" tab underneath holds a full ordered rule list: conditions (slot, rarity, item level, specific mods, mod tiers, sockets, value) → show, hide, highlight colour, sound or auto-salvage, shareable as a code.
    - Build calls (2026-11-09): custom rules are first-match, top-to-bottom, and sit above overrides and the preset. Presets only hide; salvage remains an explicit action. Uniques can be highlighted or sounded but never hidden or auto-salvaged. Hidden drops remain in their ground/time-away pile and reappear when the filter is loosened. "Sockets" means the gear's filled rune socket in the current one-socket item system. Filter sounds play for online drops, not a backlog of time-away finds. Share codes contain only the ordered custom rules, replace that list only after strict validation, and are capped at 100 rules / 50,000 characters. Existing War Table salvage levels 5–7 become Quartermaster levels 2–4, and old active profile filters keep their matching order and prior salvage access.
  - Decided for the owner: Crafting Bench recipes no longer need achievements (owner's note "no achievements required"); the Bench level alone unlocks them.
  - Decided for the owner: every mini-game gets a small inner double zone that doubles that action's output; Alchemy's mini-game turns horizontal; Foraging and Gemcutting get wider zones and slower markers.
    - Built 2026-11-09, small calls made in the build: gold marks the double zone everywhere. Bar games (Mining, Woodcutting, Cooking, Alchemy) use the middle third of the bright zone; Alchemy needs at least half of its 1.25 s hold in the gold. Smithing: within 45 ms of the beat. Rune-carving: two thirds of the stroke within 6 units of the line. Foraging: a bloom window, 30–55% of a herb's life, when it glows gold. Lock, gem and dig (the sequence games, Heist's lock included): finish within the first 40% of the timer, shown as a gold end on a draining bar. Cartography: find it within 3 soundings.
    - A double is one waiting flag on the running action (more doubles don't stack) and is used up on the next finish; offline finishes never double. It doubles every output of that finish (bonus drops, flasks, maps, a second smithed base with its own catalysts, a second cut gem), not XP or inputs. Heist: that room's gold and drop rolls come twice.
    - Foraging: herbs 44 → 58 px, life 2.2 → 3.4 s, one every 1.3 s. Gemcutting: facets 46 → 62 px, stone settles in 5.2 s (was 3.5).
    - No save migration: the flag is a new optional field, so old saves load without it (tested).
  - Decided for the owner: holiday dates are computed in code (no outside calendar service) and switch on automatically, each can be turned off in Admin; Admin can stack events, schedule weekend events and set any start/end; overlapping bonuses add.
- Achievements build (2026-11-09), small calls made while building the Round 2 design:
  - 129 achievements in eight sections: Campaign, Combat, Bosses, Maps, Crafting & loot, Life skills, Character, Challenge modes. All 43 old ids kept; some moved section (acts to Campaign, flasks to Combat/Life skills, Exile ones to Challenge).
  - Reward budget across all of them: +8 Passive points (act conquerors 2/4/6, Unbroken, all four Trials, level 90, all Uber Bosses, Hardcore SSF campaign), +4 offline hours, about +19% Item Rarity in total plus small Gold find, Experience, Life, resistance, life-skill and flask bonuses, 7 achievement-only uniques (Unbroken Temper plus six new), +4 Atlas points and +3 stash tabs for the realm.
  - Atlas points are realm rewards like stash tabs, since the Atlas is shared: added once per realm. They go past the usual 70-point cap, so they still matter at the top.
  - Bonuses are worked out from the earned list each time (not stored), so changing a reward later fixes itself on every save. The realm keeps a list of achievements whose realm reward it already has (`achievementRewards`), and achievement tabs never raise the price of the next bought page.
  - On load, any achievement a character already meets is granted quietly, with one summary toast. Map counters (highest Doomed tier, Unique Maps) are filled from bosses the character has already beaten; rare kills start at zero.
  - Challenge-mode achievements only count on that kind of character. Classic still doesn't see Life skill achievements.
- Events calendar build (2026-11-09):
    - Events calendar build calls (2026-11-09), all in `src/data/events.ts`. Holidays run midnight to midnight **UTC**, the same moment for every player: New Year 31 Dec–2 Jan, Valentine's 13–15 Feb, Easter Good Friday–Easter Monday, Summer 20–26 Jun (solstice week), Halloween 29 Oct–1 Nov, Thanksgiving (US, fourth Thursday of November) Thursday–Sunday, Christmas 23–26 Dec. All keep the existing double XP and double loot.
    - Stacking adds the bonus parts (+100% and +100% = ×3). A narrow bonus includes the broad one running beside it (Christmas ×2 XP plus a ×2 combat-XP event = ×3 combat XP). Crafting-cost savings add too, but never past half off (the engine's existing floor).
    - Weekend events run **Friday 18:00 to Monday 06:00 UTC**, so Europe gets Friday evening and the Americas get Sunday evening. A "Weekends only" event repeats every weekend between its start and end; no end means every weekend.
    - Switching a holiday off is lasting (it skips every year until switched back on). Stopping a holiday while it's running also switches it off, or it would start straight back up. A switched-off holiday can still be started by hand.
    - Players see "On now" and the next 4 events on a Hideout Events card. The top banner shows how long is left, plus a one-line heads-up when an event starts within 3 days, so the top of the screen isn't permanently taken up.
    - Two new `live_events` columns (`holiday_off`, `weekends`) in `docs/ops/events.sql`. Before it runs, holidays still work. Only the two new Admin switches report that the update is needed.
- Player Market removed for 1.0 (2026-11-09): the server can't tell an earned item from an edited save, and making it cheat-proof would mean moving inventories onto the server. The Market is hidden; pending deliveries stay collectable. It can return if inventories ever move server-side.
- 1.0 is a fresh wipe (2026-11-08): everyone starts new characters at 1.0. Existing saves are not deleted. They move to a Legacy area, reached from character select, which runs at 1.0 rates. No new Legacy characters can be made. Legacy has no trading: the Market is hidden there, and nothing crosses between Legacy and 1.0 in either direction (recorded in the Launch Guide).
- Cloud character saves only replace the version they grew from (2026-11-08). The server's own `updated_at` stamp is the version, so device clocks don't matter. When two devices have both played on from one save, the cloud copy wins, and the losing local copy is kept in that browser (`coe-<account>-conflict-<id>`) and reported. A failed browser-storage write no longer stops the cloud upload.
- Passive Tree Travel Node Architecture & Attribute Rebalance (2026-11-08): Replaced the single centerline spine (which cut over `a = 0°` clusters `I, I1, D, D1, G, G1`) and the `<= 140px` brute-force proximity linker (which drew 7-pointed heptagrams inside every wheel cluster) with twin radial arterial highways per sector (`a = ±8°..15°`), clean `path()` cluster approaches, and smooth circular highway rings at `r = 260`, `r = 2310`, and `r = 4300` (666 total travel/highway nodes across the 2,377-node tree, with >50px minimum clearance between every link segment and unlinked node). Rebalanced travel/highway node attributes from `+10` (`+5/+5`) down to `+4` primary attribute (`+2/+2` hybrid, `+2 allAttr` on central/orbital junctions) to match the 3-travel-points-per-level budget and level 80 gear/gem attribute requirements, and rendered `highway` nodes at travel node size (`r = 8`).
- Passive Tree Pan/Zoom Performance Overhaul (2026-11-08): Decoupled continuous dragging and wheel zooming from React component re-renders using direct SVG transform updates batched via requestAnimationFrame with debounced state synchronization. Optimized CSS rendering by isolating the canvas with CSS containment, adding will-change transform hints, pausing animations and transitions during drag, making passive links non-interactive for hit-testing, and replacing software raster blur on node halos with vector stroke outlines.
- Passive Tree Arterial Highways & Orbital Ring Layers (2026-11-08): Replaced linear cluster daisy chains with radial arterial spine junctions per sector and direct cluster links, guaranteeing no cluster is more than 3–6 travel steps from its class start. Added two concentric intermediate orbital highway rings (Mid-Inner at r=1700 and Mid-Outer at r=2950) connecting all six class sectors across the tree alongside the existing Inner Crossing (r=260) and Outer Rim (r=4300). Cut total travel nodes across the tree by over 80% (from 1,578 down to 192 nodes), completely eliminating travel fatigue while preserving all notable names, stats, masteries, keystones, and doomed debuffs.
- Character Passive Tree 5x Overhaul (2026-11-08): Expanded the passive tree to 3,295 nodes arranged across concentric rings, radiating from a 3-tier hexagonal neutral concourse at the Exile's start (0,0) outward through 6 class sectors (-90°, -30°, 30°, 90°, 150°, 210°). Features 3 paired PoE-style Cosmic Gateways (Solar/Lunar, Astral/Void, Primal/Divine) bridging opposing sides of the tree for 3 travel points, 6 high-stakes Doomed Gates (5 passive points + permanent debuff gating god-tier wheels), 12 Celestial Forbidden Keystones spaced evenly at radius 5,400, and diverse defensive/puzzle archetype wheels (Cryo-shatter, Glacial ward, Fortify, Recoup, Spell Suppression, Low-life defiance, Gear/Crafting scaling). Introduced separate Travel, Passive, and Mastery point economies and 3 saveable, cross-linkable tree profile loadouts.
- Builds fight by their rules; manual play can improve results. Combat and skilling compete for one activity. Offline uses the same engine. No pay-to-win; cosmetic monetisation is a later idea.
- Class starts provide affinities, not exclusive build lanes. Character trees use compact clusters and useful attribute travel. Class mechanic specialisation belongs in ascendancies.
- Character-tree level awards (2026-11-08): the compact cluster graph keeps five ordinary points per level but splits them into **2 Travel and 3 Passive**, replacing 3/2. An audit of shortest home-region paths found median costs of 18–22 Travel and 9–13 Passive before taking nearby optional buffs; ordinary clusters use about 47% as many Travel as Passive points (44% across the whole priced tree). The 2/3 split funds the route while leaving Passive points for its useful notables. Act-boss and Mastery awards are unchanged. Existing characters are recounted without losing valid allocations.
- Passive-point correction (2026-11-08, released in 0.4.21): playtesting showed that 3 Passive Points per level erased meaningful choices by funding a full notable every level. Level rewards are now **2 Travel and 1 Passive**; Act-boss and Mastery awards are unchanged. Existing allocations remain, while surplus unspent points are recounted at the lower rate.
- Passive-theme distribution (2026-11-08, released in 0.4.21): starting packages and inner class identities stay intact, but selected outer and border clusters trade places so Cold, Fire, Lightning, Chaos, Bleed, Poison and Projectile each appear in at least four class regions, with no region holding more than 60% of any family. A structural test enforces both limits.
- Doomed Gate risk/reward (2026-11-08): all six permanent penalties became severe commitments—40% less Life, 35% more Physical Damage taken, zero Armour/ES, no Flask use, 150% increased Mana costs, or −50% Elemental/Chaos Resistances. In return, all 36 notables and the small nodes in the twelve gated wheels were strengthened; their twelve archetype multipliers are now 35–55% more, with the supporting offence, defence and recovery raised alongside them.
- Every ascendancy has six notable choices and two capstones; the 2/2/3/2 trial budget supports any three notables and either capstone. No node-specific milestone gates or hard node-count ceiling. Chase items may eventually grant extra nodes/capstones.
- Vitals/Wind-up/Ground and two rule conditions are baseline. War Table grants advanced rules, a third condition and rarity-based auto-salvage. The latest requested behavior makes flasks manual unless Instilled.
- Hideout upgrades use refined planks/bars and Boss Trophies rather than thousands of raw materials. Classic converts applicable material costs to Gold.
- Mana is Power uses four-second spending; Momentum grants Evasion and protected flat losses; Field Tinkering supports low-level gear; postures automate spacing; eligible higher-priority skills reserve Mana 1.5 seconds ahead.
- Momentum keeping is flat (2026-11-06): each source (uniques, Sure-Footed, Steady Aim, tree node) saves 1 stack per landed hit, minimum loss 1. Old % values on already-found uniques are read as 1. The "Mana within X% of full" unique text was stale; it now says what the code already did (recent spending counts X% more).
- The whole character curve, including levels 1–80 and the campaign, is 3.4 times longer than the former curve. Level 100 should take roughly two to three months for a dedicated player fighting about 20 hours a day, and 99 remains halfway in XP. Exact class parity is not a substitute for meaningful builds.
- Combat XP has a two-level grace band outside an area's level range. Harder enemies give +5% at three levels and +20% at five, interpolating between. Easier enemies use a rounded quadratic penalty of 10/11/15/21/30/41/54/70% at three through ten levels, with increasing losses each level. Hold both caps thereafter. This supersedes both the old falloff to zero and the initial piecewise penalty milestones.
- Fishing opens a secret RPG at Saltmere (2026-11-20). One character earns entry for their realm by completing a hidden achievement aimed at nearly maxed characters. The requirement is open. Owner direction for the full game includes ponds, lakes and ocean waters, a logbook of 500-plus catchable species, low-rate specials, equipable gear, boatbuilding and crew, offline traps that catch fish, and multi-day voyages beyond a boundary that turns early vessels back. Harbor growth, tournaments and mysteries extend that progression. See [Fishing RPG Design](FISHING_RPG.md).
- The skilling tree represents specialisation (2026-11-06): one point per ten total levels, capped at 36. It must never become fully completable through ordinary levels. Saltmere has its own progression and Fishing adds no tree points.
- Non-combat mastery is a bonus-only, character-owned progression track (2026-11-06; implemented 2026-11-07; superseded per task 2026-11-09). Every timed action, recipe and Heist job now has its own track, with bulk recipes sharing their single version. It never unlocks or blocks recipes, resources, stations, areas, items or other content; existing skill-level, campaign and station requirements remain responsible for access.
- Player Market remains browser-simulated with server-validated transactions, not a server-authoritative economy. Keep validation uploads and item/Gold recovery protocols.
- Offline-earned items/currency remain tradable by explicit owner choice (2026-11-05). Harden market inputs, request limits and permissions, and document residual forging/rollback risks. Do not replace offline trading or claim item provenance from client-owned saves. Public-source review does not authorize destructive history rewrites or branch-policy changes.
- Internal docs have one home each: GAME for current behavior, DEVELOPMENT for engineering, this file for plans. Published wiki, generated UNIQUES, operations SQL and asset credits remain distinct.
- Admin diagnostics/actions use database-enforced privileges and audit records; recovery creates a separate character so live uploads cannot overwrite it. Reproductions use a memory-only sandbox with trading disabled. Feedback snapshots are bounded game state, not auth/browser storage; account email and character ownership are resolved server-side. Anonymous demo counters remain approximate, opt out via Do Not Track and never authorize rewards.
- Monster identities redistribute existing reference effective pools and expected raw basic DPS into player-style defences, damage types, attack speeds, criticals and ailments. Individual build matchups may differ; pack counts, rewards and boss telegraph damage remain intact. Monster ES recharge is a separate stat, with no extra boss heal loop. Exact calibration lives in GAME and the engine.
- Post-campaign crafting and hideout decisions (2026-11-06, [POST_CAMPAIGN_CRAFTING_AND_HIDEOUT.md](POST_CAMPAIGN_CRAFTING_AND_HIDEOUT.md)): Fractured Orbs randomly pick an affix (no seal steering); the three Uber Bosses each grant one piece of the Doom Sigil crafting trinity (The First Exile elevates T1 to T0, The Architect of Ruin grants Doom implicits, The Void Sovereign opens a 7th modifier slot); Stash Affinities are a baseline Act 1 convenience; offline map auto-running is supported and enhanced by Watchtower upgrades.
- Unique items rework (2026-11-06): Campaign unique drop pools scale progressively by zone depth, starting with exactly one unique (`castaways_kerchief`) in the Mud Flats; class-defining trait uniques (Rage, Malice, Fervor, Riposte, Momentum, Mana is Power) drop in mid-to-late campaign zones and maps rather than early Act 1; flat numerical modifiers on uniques feature roll ranges that can be rerolled using Divine Orbs (items with purely fixed mechanics cannot be Divined); and select powerful uniques carry thematic downsides to prevent them from crowding out end-game crafted rares.
- Comprehensive UI and responsive pass (2026-11-07): Stash tab affinities UI selector and tab badge indicators, Currency tab Fractured Orb display, Materials tab Refined components (bars/planks) and Boss trophies/Sigils groupings, mobile character switching in sidebar and Settings, compact topbar mobile currency indicator, mobile Hideout stacking, mobile Combat direct strike buttons for Weak Points and Choir adds, and safe viewport boundary clamping for item menus and tooltips.
- Flask policy, early pacing, boss crafting materials, Tiered Loot (T1–T5) and Class Loot Filter (2026-11-07):
  - Belts enforce a 4-slot layout (1 Life, 1 Mana, 2 Utility). Instilling Orbs drop starting in Act 2 (tier 5+) to unlock early automated flask triggers before burst damage frustrates idle players.
  - Boss kills and boss farming reliably award refined construction materials (copper/iron/mithril bars, ash/oak/yew planks, rough gems, arcane dust) so combat progression alone can advance Hideout stations without mandatory gathering skilling.
  - Tiered Loot (T1–T5) scales across acts and maps: higher tiers increase mod value floors and bias affix tier rolls; Tier 5 loot introduces a 35% chance for natural Fractured modifiers and rolls on special bases (Simplex Amulet, Annointed Belt, Astral Plate) with tooltips and cells displaying visible tier badges.
  - In-game Settings feature an optional "Filter Off-Class Loot" toggle as well as full Custom Loot Filter profiles (create, edit, delete, and switch between saved filters) with rule matching on item tiers (T1–T5), item levels, slots, rarities, defence types, weapon families, and class affinity. Filtered non-unique equipment is automatically salvaged on drop into Arcane Dust.
  - Ranger and Mage progression smoothed with early survivability adjustments (Momentum damage mitigation, Mage starting Energy Shield and Cold Resistance) ensuring consistent, low-death 2-hour completion through Acts 1–6.
- 3-Profile Tree Loadouts with cross-linking (2026-11-07): Character Passive Tree, Atlas Tree, and Life Skills Tree each support 3 saveable loadout profiles. Profile 1 is available from the start; Profile 2 unlocks upon reaching Act 5 (`s.campaign.act >= 5`); Profile 3 unlocks upon clearing a Tier 5 Normal Map (`s.maps.highestTier >= 5` or Atlas Tier 5 clear). Switching profiles is allowed in Town or Hideout (prohibited in active combat) and automatically triggers linked equipment loadout, Atlas profile, or Life Skills profile swaps.
- Passive Tree 5x expansion UI overhaul (2026-11-07): Tree canvas enlarged to 12000x12000 with 7.5x max zoom and hardware-accelerated pointer panning. Top bar features 3 profile manager tabs with lock icons (unlocked at Start, Act 5, and T5 Maps), active linked loadout badges, and a profile settings modal. Multi-currency point tracker chips for Travel (Cyan), Passive (Gold), Mastery (Purple), alongside Regret orb counter and Refund mode toggle. Visual node rendering includes Cosmic Gateways (pulsing cyan circular portals with pairing tooltip and conduit activation prompt), Doomed Gates (crimson diamond/skull glyphs with permanent debuff warning badges), Celestial Keystones (radiant pink star glyphs), and PoE-style central cluster Mastery Sockets with search bar luminous glow highlighting and non-matching node dimming.

### Additional Maps expansion

The T1–T10 Maps update shipped in **0.3.18 on 2026-11-02**. The redesign below replaces themed maps with plain shared maps, permanent tier mechanics, Sextants, the Atlas tree, Doomed Maps I–V, and full Cartography support; Uber bosses remain separate design/implementation work.

- [x] Replace themed maps with plain maps and a shared realm supply; migrate held themed maps by tier. Random campaign act visuals/mechanics provide variation. Keep T1–T10 at levels 66–84. — done 2026-11-06
- [x] Ensure first-map/top-up sources and real Map Device navigation support progression. Do not call all ten existing tiers unimplemented. — done 2026-11-06
- [x] Give tier groups permanent danger/reward identities: — done 2026-11-06

| Tiers | Planned danger | Planned reward emphasis |
|---|---|---|
| 1–2 | Baseline | General drops |
| 3–4 | Two elite packs: 4× Life, 1.5× Damage, 3× XP, 60% more drops | Reliable Chaos |
| 5–6 | Twin boss lieutenant at 60% stats with shared Life | First tier-specific unique pool |
| 7–8 | Dangerous boss ground | Second unique pool and Regal emphasis |
| 9 | Permanent enrage: 30% speed, 40% damage | Exalted emphasis |
| 10 | Elite packs, twin boss and enrage | T10 uniques and strong Divine rates |

These rewards describe the intended redesign, not the current earliest drop location of each currency.

- [x] Sextants: three strengths, one Map Device slot growing to three plus an Atlas slot; rerollable danger/reward/hunting mods with limited run charges (six base). Hunting mods provide hard-boss keys. Auto-run consumes charges offline. Include danger/reward and incompatible-mechanic warnings. — done 2026-11-06
- [x] Atlas: a connected 100-node radial skill tree with branching Sustain, Bounty, Surveying and Peril paths; up to 70 realm-shared points (30 from normal maps, 2 for each Doomed tier first clear, 3 for each Hard Boss first clear, and 5 for each Uber first clear); free whole-tree and connected leaf respecs. A 20-point unlock (Doomed Horizon) enables Doomed Map drops. — done 2026-11-06
- [x] Cartography: plain-map recipes, Sextant recipes, continued folios and 3:1 upgrades, extending across T1–T10. Existing map-upgrade tree effects survive the rework. — done 2026-11-06
- [x] Doomed Maps I–V: monster levels 86/88/90/92/94, packs 65/70/80/90/100 (scaled from 10 at T1 up to 100 at T5 Doomed), with 2 / 2–3 / 3 / 3–4 / 4 mods. Rare T8–T10 drops after the Atlas unlock. Mods: preassembled adds, revenants reviving at 30% Life, unfilled flask belts, permanent low-Life enrage, Hulking packs, four-second burning aftermath, and a six-second ward at 60% boss Life. — done 2026-11-06
- [x] Doomed rewards: 3.5× T10 Exalted/Divine rates, Fractured Orbs, and Uber Keys at 10/15/20/25/35% per boss by Doomed tier. Three key types are equally weighted; keys are consumed on fight entry. — done 2026-11-06
- [x] Map modifier safety & bulk farming revamp: Auto-run enabled for Doomed Maps (I–V), per-map modifier rolling, avoidable modifier blacklist with automatic Chaos Orb rerolls during auto-run, normal map affix toggle, and monster pack scaling from 10 at T1 to 100 at Doomed V. — done 2026-11-06
- [x] Uber bosses: The First Exile (~90, mirrors/adapts to builds), The Architect of Ruin (~93, escalating act-boss cycles), The Void Sovereign (~96, chaos and buildup vulnerability windows). Each has exclusive build-changing uniques and Doom Sigils for future crafting. — done 2026-11-06

### Hard bosses: implemented locally (2026-11-06)

- [x] Five separate keyed fights (`ossuar`, `mother_vael`, `undertow`, `twin_regents`, `crownless`) run from the Map Device, with keys from Sextant hunting and life-skill crafting, reactive `weakPoint` and `choir` skill aims, manual focus bonuses, five-minute escalating enrage, boss trophy drops, and five exclusive uniques. — done 2026-11-06

| Boss | Encounter proposal | Key / reward proposal |
|---|---|---|
| Ossuar (~72) | Physical stone plating; hit a six-second weak point to break plating for ten seconds | Marrow Key; Marrow Shards; Faultline mace |
| Mother Vael (~75) | Lightning choir adds granting defence, haste or healing; choose the priority add | Bell Key; Choir Glass; Last Hymn amulet |
| The Undertow (~78) | Cold tide stacks; interrupt or burst through Deep Call | Abyssal Key; Black Pearl; Riptide boots |
| Twin Regents (~82) | Fire/cold paired bosses; balance Life and switch off guarded targets | Joined Regent key; Throne Ash; Twinned Crown |
| The Crownless (~86) | Elemental phases combining previous moments with physical slams | Combine other keys; Crownless Sigil; The Unwritten grants another ascendancy's notable |

Roster levels, crafting recipes, moments and unique effects are proposals, not content tables. Acceptance: suitable endgame builds can idle safely, inadequate rules/gear fail, manual answers help earlier, and offline/live behavior agrees. No unrequested balance implementation follows from this document.

### Post-campaign crafting and hideout: implemented

Milestone 10 planning and specifications live in [POST_CAMPAIGN_CRAFTING_AND_HIDEOUT.md](POST_CAMPAIGN_CRAFTING_AND_HIDEOUT.md).
- [x] Fractured Orbs and natural fractured drops in Doomed Maps I–V: engine support, random affix locking, scouring down to 1-mod magic base, annulment immunity, whetstone protection, impression restore, Bench page integration and gold tooltips. — done 2026-11-06
- [x] Doom Sigils from Uber Bosses for past-the-limit modifier crafting (The First Exile = T0 elevated mod, The Architect of Ruin = Doom implicits, The Void Sovereign = 7th modifier slot) — done 2026-11-06
- [x] Hard-boss materials drop from their bosses and craft the Crownless Key (Smithing 70) — done 2026-11-06
- [x] Hard-boss materials in high-tier bench crafts and station upgrades: seven Bench 6–7 crafts (one or two per trophy's theme, tiers 4–5) and the top level of Map Device, Forge, Alchemy Table, Crafting Bench, Watchtower and Trophy Altar now take them; `tests/bossMaterials.test.ts`. Unreleased. — done 2026-11-08
- [x] Crafting Bench level 6–7: meta-crafts (prefix/suffix locks, multi-craft), seal-integrated auto-crafting, Bench 7 pinnacle crafts — done 2026-11-06
- [x] Hideout expansion: Map Device level 5–6, Bench 6–7, Forge 5, Alchemy Table 5, Stash affinities (baseline Act 1), Watchtower 5, and Trophy Altar — done 2026-11-06

### Non-combat action masteries: implemented

**Written 2026-11-06; implemented and verified 2026-11-07.** This is the canonical design and implementation record for the feature, kept here to avoid another standalone game document. It is separate from the existing passive-tree mastery choices.

#### Purpose and fixed requirements

Repeatedly using a non-combat task should make that exact work more efficient. Mining Copper and mining a special Copper seam have separate tracks; smelting Copper has another. Overall Mining/Smithing levels still determine access to higher actions through the existing requirements.

The owner has fixed two requirements:

- **Non-combat only.** Fighting, kills, weapon use, combat gems, minions, boss clears and ascendancies do not earn action mastery or receive direct mastery bonuses.
- **No mastery-gated unlocks.** No recipe, resource, area, station, item, skill, action mode or reward requires a mastery level. Bonuses grow automatically; there are no locked perk branches, mastery point purchases, prestige requirements or new mastery-threshold rewards.

An action with zero mastery keeps its current baseline behavior. Mastery is not permission to nerf the baseline and sell the old effectiveness back through grinding. Training every obsolete action must not become necessary for access or a global completion bonus.

The implemented settings below are deliberately modest and bounded; future economy reviews may tune them without turning mastery into an access requirement.

#### Scope and identity

Use explicitly authored, stable task identities. Every eligible action, timed recipe and Heist job supplies a `masteryId`; bulk versions resolve to the same id as their single recipe. Do not infer identity from display text or a level calculation, and renaming a label must not reset progression. The former 100-identity limit and broad work bands are superseded.

The old band inventory below is historical; each listed action and recipe now has its own track:

| Activity | Mastery band | What remains controlled by existing systems |
|---|---|---|
| Mining, Woodcutting, Foraging | Resource bands: Copper/Iron/Mithril, Ash/Oak/Yew and each herb tier. Special nodes feed their ordinary material's band | Resource access, skill levels and area requirements |
| Ordinary Thieving | A small set of target/difficulty bands, authored across the campaign rather than one bar per mark | Target availability, material rules and Heist access |
| Archaeology | Culture/site-family bands; changing strata does not create a fresh track | Depth, standing, special finds and Expedition unlocks |
| Smithing | Three material bands crossed with broad equipment families (weapons, off-hands, armour and jewellery); smelting and boss-key work use a few separate bands | Exact base access, item level, Forge level and generated base identity |
| Alchemy | Authored flask and orb bands; single/batch versions share a band | Recipe access, flask type and orb output |
| Gemcutting | Skill, support, signature and special-cut bands | Gem availability, level restrictions and special outputs |
| Rune-carving | One band per rune family across its grades | Grade access, rune strength and materials |
| Cooking | Meal/ingredient bands grouped by tier and purpose | Recipe access, exact meal effect and Alchemy ingredients |
| Cartography | Materials, Sextant grades and map-tier pairs (T1–2 through T9–10) | Available tiers, campaign access, map supply and required map inputs |
| Heists | A small set of job/difficulty bands; every resolved room feeds its job's band | Crew, room access, alarm rules and admission costs |

Greenhouse completions use the task track assigned to the underlying action. Repeating and automatic actions use the same identity as their manual equivalents. Future real professions can opt into this model when implemented; mastery does not implement Fletching or activate Fishing placeholders.

Instant item-modification clicks—spending Orbs, applying Essences, taking/restoring impressions, inscriptions and bench modifier clicks—are outside the system. Timed production recipes are included; an unlimited-speed clicking loop is not a source of practice. Task mastery does not spend skilling-tree points or alter the player's chosen specialisations.

#### Earning practice

Mastery uses its own **practice** counter rather than normal skill XP. Grant practice only when the engine actually resolves a completed action:

`practice gained = the completed action's unmodified base duration in seconds`

For an ordinary action this is `SkillAction.intervalMs / 1000`; for a resolved Heist room it is `HeistJob.roomMs / 1000`. Credit a room once when it resolves, including an alarm outcome after the work was performed; ending the job or collecting the payout grants no second credit. An interrupted or abandoned action that never resolves grants none.

A completed gathering attempt still earns practice if its normal yield roll produces nothing. The work was performed; the mastery system must not add another failure roll. Blocked recipes, missing inputs, full-storage stops and failed starts do not grant completions or practice.

Important invariants:

- Output quantity, double-production procs, rare finds, item value, normal XP and materials conserved do not multiply practice.
- A batch grants its own nominal duration once, into the base recipe's track. Do not multiply that duration by the batch size again. Compare progress by nominal work, not raw output counts.
- Gear, Focus, Overtime, speed events and mastery speed can produce more completions per hour and therefore more practice. They do not multiply the practice award again.
- Normal XP events/bonuses do not directly multiply mastery practice. Explain this distinction in the tooltip; do not advertise it as another normal skill-XP track.
- Greenhouse only earns practice on actual background completions, at its effective production rate, through the same completion hook. No extra practice-per-second timer.
- No daily cap, login streak, real-world waiting period, time-of-day requirement or manual-only mastery bonus.

#### Progression curve

The displayed mastery cap is **100**, with **432,000 practice** needed to cap a task. One practice represents one second of nominal work, so this is 120 hours of base-duration work, not a real-time lock. Effective speed changes the actual time required.

Let `P` be stored practice and `C = 432,000`:

```text
progress = sqrt(clamp(P / C, 0, 1))
displayed level = min(100, 1 + floor(99 * progress))
practice threshold for displayed level L = C * ((L - 1) / 99)^2
```

| Displayed mastery | Approximate cumulative nominal work |
|---|---|
| 1 | Fresh action, no practice |
| 10 | 1 hour |
| 25 | 7 hours 3 minutes |
| 50 | 29 hours 24 minutes |
| 75 | 67 hours 3 minutes |
| 100 | 120 hours |

Bonuses use the continuous `progress` value, not milestone unlocks or the rounded displayed level. The first completion contributes immediately. After the cap, the action keeps working normally; extra practice is not banked for other actions, future caps or prestige purchases.

#### Automatic bonuses

All bonus channels are visible from the beginning and grow continuously. There are no rewards revealed or made usable only at levels 25/50/100.

| Action profile | Maximum bonuses | Restrictions |
|---|---|---|
| Ordinary gathering | +20 percentage points increased action speed; +15% expected ordinary primary yield | Explicit primary-output allowlist; no extra rare-drop rolls |
| Timed production | +20 percentage points increased action speed; up to 15% expected conservation of eligible ordinary ingredients | No extra equipment/gem/flask/map copies or stronger outputs |
| Heist jobs | +20 percentage points increased room speed | Does not lower alarms, unlock rooms or conserve entry currency |

At a given action's progress, multiply the listed cap by `progress`. Speed joins the existing increased skill-speed category rather than becoming an additional uncapped more multiplier. Apply only the active action's own mastery. Copper mastery must not improve Mithril mining, smelting, combat or an entire profession.

Use explicit per-action data to identify eligible ordinary outputs and ingredients. Do not infer eligibility merely from a suffix or from an item having a price. Suggested gathering candidates are the primary ore/log/herb, ordinary Artifact quantities and ordinary stolen Gold. Ordinary production inputs can include ores, logs, herbs, bars, planks, rough gems, ink and vellum where the recipe permits them.

Protected quantities include rare bonus finds, Uniques, fossils, Essences, Orbs, Seals/Wax, Boss Trophies, keys, Rogue's Markers used for admission, map inputs, Doom Sigils and future chase components. Mastery does not add rolls for these, conserve their required costs, change a drop pool or improve generated affixes, quality, item level or gem requirements. A recipe with no eligible ordinary input receives speed only.

The gathering yield bonus applies to the ordinary base quantity after a successful base-yield roll. It does not duplicate the complete result after Motherlode, extra-production procs, rare secondary rolls or other multipliers.

For integer resources, use stochastic rounding: an extra expected quantity of `0.15` means a 15% chance of one additional eligible unit. For ingredient conservation, calculate the expected saving from the eligible cost remaining after existing rules, round it stochastically, and clamp it between zero and that actual cost. Check affordability through the existing action rules; potential future savings cannot finance a start. Refund mechanics may return only resources actually paid, never mint an extra ingredient from a free/conserved use.

This tuning gives an unmodified gathering action at most 38% additional ordinary throughput at cap (1.20 speed × 1.15 yield). Existing increased-speed investment lowers the relative speed gain. Revalidate alongside the skilling tree, events, double-production effects and salvage; this estimate is not permission to raise every resource's output blindly.

#### Ownership, persistence and recovery

Mastery is **character-owned**, matching existing non-combat skill levels. Shared realm bank/stash resources do not share mastery. No realm-wide mastery pool, point spending, transfer to another action or reward for maxing the whole catalogue.

Character state:

```ts
skillingMastery: Record<string, number>; // stable mastery-task id -> accumulated practice
```

Missing entries mean zero. A migration supplies an empty record and preserves all current progression, access and resources. Do not estimate past action practice from overall skill XP or lifetime production totals: they do not identify what was actually trained. Keep stable ids and explicit rename mappings; treat unknown stored ids as inactive data rather than granting a different action a bonus.

Persist the counter with the character and use the existing character save/conflict rules. Do not sum two device snapshots of the same counter on load, import or reconciliation. Restores restore the character's recorded mastery; sandbox copies remain memory-only. A Hardcore character loses its mastery with its other character progression on death. SSF uses its own character's counters. Classic has no eligible non-combat actions and receives no mastery benefits.

This remains client-simulated progression with the game's existing trust limitations. A mastery counter is not server proof that an item or currency was legitimately earned.

#### Live, offline and interface behavior

Live play, offline catch-up, background Greenhouse and auto-repeat must call the same completion/award logic. The same completed work earns the same practice in each route. Offline caps and material/storage stops remain unchanged. Clamp practice at the cap and validate finite, non-negative values; do not loop once per second merely to award practice.

On an action/recipe card, show its mastery level, a compact next-level bar and its current bonuses separately from profession XP. A tooltip explains the identity, what counts as work, all possible bonus channels and any protected inputs/outputs. Bulk variants show the same underlying mastery and explain how practice is credited. Locked recipes may show their ordinary access requirements; never display a mastery requirement.

Avoid a toast for every mastery level during long idle runs. Aggregate meaningful changes into offline summaries and an optional activity-log entry. A capped action remains runnable and productive. Existing profession pages should host this information; a new tree, currency shop or mandatory management screen is unnecessary.

#### Implementation work and acceptance criteria — completed 2026-11-07

- [x] Inventory eligible non-combat actions/jobs; assign explicit stable band ids, batch aliases and bonus profiles/allowlists; the shipped inventory contains 67 identities.
- [x] Add pure progression/bonus calculations, a character save migration and completion-hook practice awards.
- [x] Integrate action-specific speed, ordinary yield and ingredient conservation without changing baseline access or item-generation rules.
- [x] Integrate Heist rooms, Greenhouse, auto-repeat, offline summaries, save/import/recovery and sandbox behavior.
- [x] Add compact action-card UI and explanatory tooltips; update the current reference when the mechanic is implemented.
- [x] Verify no content-access check reads mastery; zero-mastery characters retain today's baseline and existing unlock paths.
- [x] Verify combat/gem/weapon/kill paths never grant mastery or read its bonuses.
- [x] Verify every eligible action has exactly one valid band, generated Smithing bases cannot create new tracks, single/batch aliases share bands, and resolved Heist rooms, empty-yield gathering, cancellation, resource/storage stops and double-production cannot duplicate credit.
- [x] Verify equal completed work online/offline, protected inputs/outputs, integer rounding, refund safety, caps, malformed saves and non-additive device reconciliation.
- [x] Measure initial resource inflation, production economics and progression: an unmodified Ash loop produces 1,252 logs in its first hour (+4.3%) and 10,818 over eight hours (+12.7%), remaining below the roughly 21% capped ordinary-throughput ceiling. Eight-hour Copper and Mithril smelting runs each gain 7.3% output while consuming about 4.75 rather than 5 ore per bar; both reach about 30,915 of 36,000 practice.

The implementation passes the full 1,261-test suite and production typecheck. No mastery-gated content should be added in future expansions.

### Maps skill batch: local implementation in progress

- [ ] Verify all 40 active gems, signatures, 40 supports, Maps gating and UI/shop availability against `src/data/gems.ts` and engine behavior.
- [ ] Finish Marks, Warcry scaling, Totems, Doom, Exertion, chaos bypass/poison and their supports/rules; mere presence of fields/data is insufficient.
- [x] Implement every Maps support `special` in the engine: all 135 are now read (53 were missing). Supporting fixes: Exertion skills now actually fire their Exerted version (more damage and extra targets were computed but never used); totems now apply their gem's poison; Ancestral Call's Ancestors now deal the 50% weapon damage their description promised. Where a description named something that didn't exist (Payback's "retaliation", Carnage's "explosion", Soul Siphon's "drain"), it now says what the support does. 41 tests in `tests/mapsupports.test.ts`. Unreleased. — done 2026-11-08
- [ ] Verify every support's stated effect and formula, targeting, expiry, cooldown/cost rules, minion/totem distinction, boss interactions and offline behavior.
  - Remaining after 2026-11-08: the effects above are tested one at a time in small fights. Boss interactions, offline runs and a whole-build playtest are still unchecked.
- [ ] Resolve failing Maps-skill tests and update art/wiki before release. Do not mark this complete using ordinary combat tests alone.

The consolidated batch specification is retained below as a proposal. Its initial 1.3× attribute wording is superseded by the 0.4.1 attribute rebalance (demanding gems use 1.15×); use code for actual requirements. Its suggested `'maps'` gating/API names are design intent, not existing API contracts. Definitions that conflict with current data require review rather than silently changing gameplay.

## Other open items


- [ ] Players follow their reports: Settings → Feedback lists each signed-in player's reports with status (Open / Working on it / Resolved) and the developer's replies; Admin gains a "Working on it" status.
  - Built 2026-11-23, tests pass, live in 0.6.3. Owner to run `docs/ops/feedback-tracking.sql` once in the Supabase SQL Editor; until then the list stays hidden and "Working on it" is refused. Not yet checked with a signed-in account.

- [x] 0.5.10 polish sweep: desktop and 390px playtest of combat, act maps, Quests, Inventory, Hideout and Guild Stash; fixed the flickering DPS readout, unreadable World Map act captions, the Act 2/3 banner overlap, the Hideout Stash link and the withdraw message — done 2026-11-20 (live in 0.5.11).
  - Open owner calls from the sweep are under Ideas / later.
- [x] Story journal catch-up: every story step before the furthest objective a character has cleared counts as done, so characters from before the journal resume where they are; the next conversation still waits for the player and nothing is written to the save — done 2026-11-20 (live in 0.5.11). Owner chose this over keeping Act 1 as the starting point.

- [x] Rework combat pacing, entry countdowns, controls and matchup — done 2026-11-20.

- [ ] Rebalance campaign Unique drops around the agreed completion and farming targets.
  - Baseline from the current campaign zone tables: about 2,539 monster kills and 70 boss kills for one clear of every zone. The base rolls average about 25 Unique gear drops from ordinary monsters and 10 from bosses, before Item Rarity, extra kills, or Unique flasks. Measure actual rush routes and repeat kills per hour before setting the rates.

- [x] Improve act-map labels and quest highlighting, move the journal below the map, and add objectives and rewards to a Quests page — done 2026-11-20.

- [ ] Finish the level 1–99 profession design pass and build the approved progression, chases, zone collectibles and mastery perks.
  - Initial audit covers all 15 trainable main-game skills and records Saltmere's separate progression. Global buff scope, zone list, and per-skill designs are open in [Skilling Progression](SKILLING_PROGRESSION.md).
  - Mining design settled 2026-11-21 as [the Delve](MINING_DELVE.md). Woodcutting settled 2026-11-21 as [Felling giants](WOODCUTTING_GIANTS.md). Foraging settled 2026-11-21 as [Wild variants and cross-breeding](FORAGING_BREEDING.md). Thieving reviewed 2026-11-21 as [Casing the job](THIEVING_CASING.md). Archaeology settled 2026-11-21 as [Deciphering the lost peoples](ARCHAEOLOGY_DECIPHERING.md). Astrology settled 2026-11-21 as [Chart your own constellation](ASTROLOGY_CONSTELLATIONS.md). Agility is being scrapped (2026-11-21). Smelting settled 2026-11-21 as [Running the furnace](SMELTING_FURNACE.md); Forging, Woodcrafting and Gemcutting settled 2026-11-21; Alchemy settled as [your own flasks](ALCHEMY.md) and Cartography as [special maps from scraps](CARTOGRAPHY.md); Cooking and Rune-carving are being scrapped. The per-skill review and the skilling tree revamp design are finished (2026-11-21); everything is ready to build. Every design doc has an Implementation spec; builders start with [the skilling build guide](SKILLING_BUILD_GUIDE.md). Design docs pushed 2026-11-21 alongside live 0.5.11 (no game change).

- [x] Build Mining as the Delve, from [Mining: the Delve](MINING_DELVE.md) — done 2026-11-21.
  - Mine engine: permanent depth, rolled layer traits, every reached layer workable, no bottom, landmark near level 99, level limits on depth.
  - Supports from rubble, push/work modes, the three hazards with their own effects, caverns from Unstable layers.
  - Brace minigame (matched fixes on push; rarer creaks on worked layers) and slow layer securing.
  - Pump Station, Ventilation Shaft and Rock Bolts with coverage ranges and upgrades.
  - Pick tiers with Delve perks, Motherlode trait, Heartstone, lost miner's lantern.
  - Shaft side-view screen with elevator/jump buttons, and the descent replay (with skip) plus shaft log on return.
  - Move existing saves, ore, fossils, fragments and the current pick onto the Delve without losses; keep offline and live results matching.

- [ ] Build Woodcutting as Felling giants, from [Woodcutting: Felling giants](WOODCUTTING_GIANTS.md).
  - Giant engine: parts (crown, limbs, trunk, heart), falling when the trunk is cut through, splinters, heart after the fall.
  - Scouting with quirks, forest regions by level, standing order for time away.
  - Log-splitting minigame with weird-shaped logs (double within 3%, hit to ~7%, weak to 15%, miss beyond).
  - Legendary giants and the felled legends record.
  - Woodcutter's lodge buildings (scout tower, drying shed, sawmill, trophy wall) and the World Tree seed.
  - Giant-up-close screen with tabs, and felling cards on return.
  - Move existing saves, logs, resin, planks, heartwood progress and the hatchet over without losses; keep offline and live results matching.
  - Where it stands (2026-11-21): everything above is built on a worktree branch (engine, data, GiantView with tabs, split-the-log game, lodge, World Tree, felling cards, migration 51 to 52, tests) along with the shared hidden collectibles system (`data/collectibles.ts`, `engine/collectibles.ts`, Collection tab on Skills). `npm test` and `npm run build` pass. Not yet checked in the running game with the playtest skill at desktop and phone width, so left unchecked.
  - Small calls made in the build: ash, oak and yew planks stay open to everyone (early hideout upgrades need them; only Ironwood and deeper planks and heartwood refining need the Sawmill). Giant cutting actions are one per region (`giant_<wood>`), not a single `giant_cut`. Scouts follow the highest unlocked region by default, so an overnight run moves up the woods as levels come.
  - [x] Look-and-feel pass on the Woodcutting page, from the owner's review — done 2026-11-22. Scouting and the standing order removed: pick a woods and cut there, part-cut giants wait in their woods, special giants get more common with each giant felled in a woods, Scout Tower became the Lookout Tower. Planks and heartwood refining moved to Woodcrafting's new Sawmill tab; the Lodge Sawmill is gone. Part-order toggle removed. Forest tab redrawn as one full screen (woods picker, big giant with parts pinned on it, chopping block and tally). Splitting game redrawn as an axe coming down on a round standing on a stump. Decisions in [Woodcutting: Felling giants](WOODCUTTING_GIANTS.md#look-and-feel-pass-2026-11-22). Checked in the running game at desktop and phone width; tests and typecheck pass.

- [ ] Build Foraging as Wild variants and cross-breeding, from [Foraging: Wild variants and cross-breeding](FORAGING_BREEDING.md).
  - Strains with up to three weighted mutations (common, rare, giga rare), found in the wild including offline.
  - Real-time Greenhouse plots for crossing two parents, offspring inheritance and new mutations; more plots by level.
  - New base species at milestone levels; hidden hybrid pairings with their own rare mutations.
  - Whack-a-mole fertilizing minigame.
  - Stabilising strains and the herbarium with their perks; pressed-flower collectibles per patch.
  - Greenhouse bench screen with tabs, and seed packets to open on return.
  - Move existing herbs, essences, blooms, seeds and the remembered Greenhouse crop over without losses; keep offline and live results matching.

- [ ] Build Thieving casing, from [Thieving: Casing the job](THIEVING_CASING.md).
  - Built and playtested 2026-11-21 (prep drops, board, planned-job auto-run, job start using prep, lift scoring, phone width, no console errors; 1,922 tests pass). Not shipped yet. Marker conversion on a real old save was covered by tests only. Open owner call: rogue hire and rank costs became gold-only (15 gold per old Marker).
  - Prep board per Heist (three to five named items from specific marks), minimum prep to start, extra prep effects.
  - Remove Markers as entry cost and convert existing Markers fairly.
  - The lift minigame on marks; Heist rooms keep the lockpick.
- [ ] Remove Agility (decided 2026-11-21). Steps for all three removals are in section 9 of [the skilling build guide](SKILLING_BUILD_GUIDE.md).
  - Remove courses, the Agility page, its mastery entries and project; existing saves drop Agility XP without errors.
  - Hidden gathering spots go with the Mining, Woodcutting and Foraging rebuilds, which replace those spots anyway.
  - Drop the close-in and Heist room speed bonuses entirely (owner chose A, 2026-11-21).
- [ ] Build Archaeology as Deciphering the lost peoples, from [Archaeology: Deciphering the lost peoples](ARCHAEOLOGY_DECIPHERING.md).
  - Built 2026-11-21 on a worktree branch, unreleased: tests and build pass, but it has not been playtested at desktop and phone width yet. The hidden collectible per dig site waits on the shared collectibles system (`// TODO collectibles` in `digDone`). Left to check: the desk on a realistic mid-game save, and the pace of inscriptions (4% a dig) against the 4/5/6/7 translations a chapter needs.
  - Glyph scripts per culture, inscriptions with picture hints, the matching puzzle and auto-reveal from piled-up evidence.
  - Story chapters with set rewards replacing Clue Fragments and Passports; full translation opens the culture's relic.
  - Brushing minigame for digs; retire layers, Commitment and cave-ins without losing save progress.
  - The First Script at the Sealed Reliquary (80–99), Rosetta stones rare drop, codex perks, one hidden collectible per site.
  - Scholar's desk screen and the stack-of-rubbings return view.
- [ ] Build Astrology as Chart your own constellation, from [Astrology: Chart your own constellation](ASTROLOGY_CONSTELLATIONS.md).
  - Stars with individual effects; research sky regions to unlock them, watch them to rank up.
  - One charted constellation with slots and links that feed each other; recharting costs Stardust.
  - Focus-the-telescope minigame; deep-sky wonders and the Great Chart for 80–99; fallen stars and Gilded Stardust rank push.
  - Night-sky screen, observation-log return, one hidden collectible per region; count Astrology toward total level, achievements and a skilling-tree branch.
- [x] Build Smelting as Running the furnace, from [Smelting: Running the furnace](SMELTING_FURNACE.md) — done 2026-11-21.
  - Purity grades, fuel and flux loadout, bellows minigame, furnace parts, master alloys, living metal, ingot-rack return.
- [ ] Build the remaining production twists (all approved by the owner 2026-11-21):
  - [x] Forging: stage-by-stage shaping, rhythm hammer, saved patterns, master forms, pattern book, singing blades ([FORGING_STAGES.md](FORGING_STAGES.md)) — done 2026-11-21.
  - [x] Woodcrafting: tuning dials per wood, follow-the-curve, saved tunings, living woods, jigs, perfectly balanced pieces ([WOODCRAFTING_TUNING.md](WOODCRAFTING_TUNING.md)) — done 2026-11-21.
  - Gemcutting: carat-based facets, line-up-the-angle, saved cut plans, named cuts, cut catalogue, star stones ([GEMCUTTING_FACETS.md](GEMCUTTING_FACETS.md)).
  - Alchemy (owner chose 2026-11-21): your own flasks with two infusions, pour-to-the-line, infusion ranks, grand flasks, giga-rare infusions ([ALCHEMY.md](ALCHEMY.md)).
  - Cartography (owner chose 2026-11-21): special maps from scraps (boss, vault, guardian and pinnacle maps), sighting minigame, atlas of special maps, lost charts; plain maps come from drops ([CARTOGRAPHY.md](CARTOGRAPHY.md)).
- [ ] Remove Cooking (decided 2026-11-21): meals, the Cooking page, its mastery, projects and achievements; saves drop Cooking XP and items without errors. Meal buffs are dropped; Sacred/Sulphur flasks brew from herbs.
- [ ] Remove Rune-carving (decided 2026-11-21): the carving page, recipes, mastery and projects; saves drop Rune-carving XP without errors. Remove rune slots and socketed runes from all gear, plus resonance and rune stats (owner chose A); Return Inscription's fragments move to Cartography boss-map drops; existing fragment progress carries over.
- [ ] Revamp the skilling passive tree (owner asked 2026-11-21) from [Skilling tree revamp](SKILLING_TREE_REVAMP.md): ring of 12 forked branches, 12 bridge keystones, small core, shared point pool, full refund at launch. Design and node list approved 2026-11-21; ready to build.

- [ ] Build the Saltmere Fishing RPG from [Fishing RPG Design](FISHING_RPG.md).
  - First milestone is a playable shore and harbor with real gear, a logbook and working traps. Nearshore boats and crew, the boundary and offshore voyages, and the full 500-plus-species catalog follow.
- [ ] Choose and wire the hidden achievement that opens Saltmere. Playtest the real unlock after deciding its requirements. Until then, Fishing keeps its existing “coming soon” page in the live game.

- [x] Move Guild Stash to its own page and add send actions to Inventory — done 2026-11-20.

- [ ] Verify a signed-in Guild Stash transfer in the live game.
  - The database update succeeded on 2026-11-20. The live endpoint rejects anonymous requests. Local browser and throwaway database transfer tests passed.

- [x] Free painted portraits for all 7 classes (character creator, character list, combat and hideout crest) — done 2026-11-20.
  - Craftpix *Free RPG Fantasy Avatars* (owner wants free art only): Warrior 19, Ranger 28, Mage 23, Duelist 20, Templar 50, Shadow 21, Exile 32. The title and creator backdrop was already GegX's forest at night. Checked on desktop and 390px; tests and typecheck pass.
- [x] Consistent item art: replaced the ~14-pack mix of item icons with one 32×32 pixel style — done 2026-11-19.
  - Owner picked Anvil's RPG Icons with 7Soul's 496 RPG Icons filling gaps (7Soul given Anvil's outline), plus a Shikashi belt. 604 files in `src/assets/items/pixel/`, mapped in `src/ui/itemArt.ts`; every armour tier wears one Anvil set, recoloured per tier. Licences in `src/assets/CREDITS.md`.
  - Orb follow-up (same day): currency, runes, fossils, essences, resins, shards, contraband and artifacts now have pictures, shown everywhere `MatIcon` is used plus currency pins, the Trader and Market prices.
- [x] Themed menu frames: Hypnobius' Dark Ages UI 9-slice frames in `src/ui/theme-frames.css` — done 2026-11-19.
  - Owner found the ornate frame everywhere too gaudy and too samey: ornate only on the login panel and account windows (`.title-card`; news, character and class cards plain); in game, plain dark frames at 1x on panels, a second dark frame on tooltips and toasts, nested panels plain. Small elements (buttons, tabs, item slots, skill tiles) keep their original slim borders; the pack's small grey frames looked like thick grey bands.

- [x] Manual skill gem upgrades: no auto level-up, an Upgrade button on the Skills page, greyed out with the reason when the new level's character level or attribute isn't met — done 2026-11-19.
  - XP banks as before (capped at the next level only while that level is out of reach), one press per level. The sim player presses Upgrade itself. Playtested with a level 20 Warrior.
- [ ] Design and build the seven-act zone naming and enemy identity pass.
  - Design direction settled 2026-11-19. Zone names and 21 dangerous packs are complete locally. The remaining regular enemy roster is pending.
  - [ ] Give each remaining regular group a signature behavior tied to its origin. Make it readable from enemy names, actions and combat feedback. Check campaign enemy changes for unintended effects on Maps or summons that borrow the same definitions.
  - [ ] Judge overall difficulty across builds in full campaign play. The targeted pack tests cover spawning, saving, offline cadence and the suggested defenses for all seven late checks. The Act 3 warning and inflicted Ignite were verified in the running game.

- [x] Hand-trace sensible shared route links for Acts 2–7, matching the Act 1 cleanup — done 2026-11-19.
  - Authored each road/passage section and each journey itinerary in `campaignRoutes.ts`; no curve fitting or automatic route choice. Includes previous-act entrances. Existing area positions, unlocks, branches and boss gates retained; shared sections draw once. Inspected native previews, with all journey connectivity, duplicate-stroke and strict-crossing checks plus typecheck passing. Live browser interaction remains unverified because the local preview is unavailable. Evidence: `output/playtest/act2-routes-preview.png` through `act7-routes-preview.png` and `acts-2-to-7-routes-preview.jpg`. Unreleased.

- [x] Clean up Act 1 map links by tracing plausible paths in the painting by hand — done 2026-11-19.
  - Retained area positions/progression. Replaced interpolated crossing links with explicit hand-placed paths along the coastal shelf, village approach, stone bridge, woodland road and ridge climb. Return journeys reuse shared sections drawn once; the cave approach skirts the harbour. Six map checks, including connectivity for every Act 1 journey, and typecheck pass. Native route preview inspected at `output/playtest/act1-routes-preview.png`; live browser interaction remains unverified because the local browser preview is unavailable. Temporary preview script removed. Unreleased.

- [x] Replace the World Map's cloudy sea with a harsh ocean and a subtle offshore-boundary motif — done 2026-11-19.
  - Integrated `veyrath-world-bound-sea.webp`, preserving prior artwork and the map's 1536×1024 registration. Deep slate water, engraved waves, returning currents and sparse ship wakes suggest confinement. Psychological compulsion, uncertain memory effects, missing ships and exceptional crossings recorded in STORY. Existing banners, regions, hover and unlock fog retained. Native previews inspected; live browser acceptance remains outstanding. No release.

- [x] Expand the desktop World Map, improve act banners, and reveal territories through campaign fog — done 2026-11-19.
  - Full-width desktop atlas, larger parchment titles, shared banner/territory hover and keyboard-focus highlight, textured region fog with unlock fade/reduced-motion support, and locked navigation. Eight focused checks and typecheck pass. Save roundtrip and character-specific legacy progress covered; no account-wide exploration leak. Native fogged/explored previews inspected under `output/playtest/world-map-{fog,explored}-preview.png`. Browser preview remained blank with no logged errors, so live hover/navigation/desktop acceptance remains open below. Temporary preview generator removed. No release.

- [ ] Visually confirm the latest World Map halo removal and act-label layout (2026-11-19).
  - Removed the cream `frontier-paper` under-stroke entirely and disabled text shadows/filters. Latest labels use 28px-high banner artwork, single-line 12px act names, and plain 10px "Act X" text underneath with no backing/border/glow. Five map checks passed for halo removal; current label change passes typecheck. The in-app browser remained blank before the game rendered, including a fresh plain Vite preview on port 4183, so no visual acceptance is claimed for these latest changes. No release.

- [x] Make map place names plain, subtle ink with no bloom/backing and a tiny clearing in the terrain immediately around the lettering. — done 2026-11-18
  - Owner clarified the visual hierarchy: actual places blend in until examined; act labels remain readable regional navigation away from settlements. Integrated `veyrath-world-subtle.webp`, reduced native place-label weight/size and removed shadows, filters and backgrounds. Softened act ribbons and moved Act 4 into clear southern terrain. Desktop and 390px phone checks, Act 4 navigation, five map tests, typecheck/wiki generation and production build pass. Earlier paintings retained. No release.

- [x] Rename Campaign navigation to World Map, simplify the overview to the full clickable atlas, and remember the viewed act/area per character. — done 2026-11-18
  - Updated sidebar, hideout shortcut, tutorial and referring buttons. First visit opens the full atlas with clickable act pins; duplicate act cards/overview journal removed. Viewed act/area persist per character in browser storage; returning explicitly to the atlas remembers that overview. Typecheck and 19 campaign checks pass. Fresh-character browser verification confirmed atlas-first entry, Act 2/Roadwatch Fort selection, restoration after visiting Skills, return to the full atlas, and no console errors. Screenshot: `output/playtest/world-map-navigation.png`. No release.

- [x] Redistribute the 70 existing zones into seven substantial Veyrath chapters and retune the campaign level ranges. — done 2026-11-18
  - Owner-approved redistribution implemented: 8/8/8/10/12/12/12 areas, seven level bands, eight rethemed relocated areas, revised roads and late-chapter boss gates, matching enemy/reward levels, gem chapter access and four new journal steps. Stable IDs, clears, earned rewards and the level-66 finale/Maps handoff retained. All 109 test files / 1,780 tests pass cleanly with two workers, plus typecheck, production build and browser acceptance. Default-worker run passed every assertion but reported a worker RPC timeout, so it was rerun with bounded concurrency. No version change or deployment.

- [x] Finish browser acceptance for the integrated Veyrath campaign atlas and journal. — done 2026-11-18
  - In-app browser reached the local game. Fresh level-1 Ranger accepted Winnie's offer and entered real coastal combat, earning XP and level-appropriate loot. A disposable level-70 campaign veteran opened the world atlas, selected the expanded Act 2/3 locations and navigated every chapter through the First Seal. At 390×844, the final-act map scrolls horizontally inside its container and the document remains 390px wide. No browser console errors. Evidence: `output/playtest/seven-act-world-desktop.png`, `seven-act-roads-desktop.png`, `seven-act-finale-phone.png`. This checks navigation/presentation and opening combat, not a full journey pacing audit.
- [x] Inventory, stash and crafting merge (design pass 2026-11-19, see Decisions "Inventory, stash and crafting merge"). Unreleased. — done 2026-11-19
  - [x] Full loot filter: base types, item/required level, tier, "must have" mod groups (any/all/at least N, min tier), mod counts, fractured/crafted/Doom flags, plain-words rule summaries; hidden drops are thrown away (no pile space, no dust). `tests/lootFilterConditions.test.ts`. — done 2026-11-19
  - [x] Loot routing: kept drops go straight into the inventory (time-away loot too); new **Send to stash** filter action; **Run filter** button on the inventory; full inventory spills onto the ground/time-away pile. `src/engine/lootRouting.ts`, `tests/inventoryMerge.test.ts`. — done 2026-11-19
  - [x] Inventory size 100 + 20 per Stash level (replaces the 60-slot bag; no save change needed, it only grows). — done 2026-11-19
  - [x] New combined Inventory screen (replaces Equipment, Stash and Crafting Bench pages): inventory and stash side by side, worn gear and the item panel on the right (a bottom sheet on phones), all crafting and salvage in the panel, locked Bench tools greyed with "Needs Bench N". Browser-checked at desktop and phone sizes. — done 2026-11-19
  - [ ] Later: rework how ground items are displayed.

- [x] Agility profession: courses for xp; levels open shortcuts (Heist rooms up to 20% faster, close-in up to 50% faster in fights, four hidden gathering spots). Owner chose "shortcut unlocks" over stat perks (2026-11-19). Data in `src/data/agility.ts`. — done 2026-11-19 (live in 0.5.3)
  - Left out of skilling-tree points, total-level achievements and the skilling passive tree for now, so nothing else shifts; owner call whether to add them.

- [x] Implement and ship the approved Woodcutting design and the remaining profession redesigns. — done 2026-11-17
  - Existing recipes, locks, mastery, Focus, batches, secondary systems and Masterworks connected; desktop and phone checks pass. Live in 0.4.49.

- [x] Build the approved Thieving dark ledger and parchment dossier screen. — done 2026-11-17
  - Targets, live rewards/progress, mastery, guaranteed Markers and Focus connected; Heists, crew and Masterworks retained. Starter/veteran desktop and phone browser checks verified.

- [x] Implement Thieving Overhaul (Rogue Classes, Progression, Talent Trees, Tactical Loop). — done 2026-11-17

- [x] Restyle Thieving Heist Operations and Rogue Crew as ledger + dossier like Street Marks; Focus only on the running mark or heist dossier, none on Crew or Masterworks. — done 2026-11-18
  - Masterworks keeps its current look; a separate Masterworks minigame is planned later.

- [ ] Add Sir Broden as an NPC with a quest chain awarding a unique item (requested 2026-11-16).
  - Accepted background and aliases are in Decisions. Design the quest chain and unique reward before implementation; current request is to record the future work.

- [ ] Develop the exile kingdom's landscape and founding lore from the owner's premise (2026-11-16).
  - Main campaign and mapping arc supplied by owner and developed into `docs/STORY.md` (2026-11-17). Proposed connective narrative awaits review; existing act alignment, overseas access and campaign/Uber First Exile continuity remain open.
  - Foundation recorded in Decisions; discussing how the thirty years of collapse appear in the landscape. No artwork or game changes yet.

- [ ] Separate Production Skills into Smelting, Forging, and Woodcrafting:
  - [ ] 1. Core Data & Types: add `smelting` and `woodcrafting` to `SkillId`, register skill definitions, metadata, colors, and navigation icons.
  - [ ] 2. Activity & Recipe Split: move bar/alloy smelting to Smelting; move staves, wands, bows, robes, and leather/hybrid armours to Woodcrafting; keep metal weapons, plate armour, and jewellery in Forging; update equipment recipes to consume refined metal bars and wooden planks.
  - [ ] 3. Hideout Stations: expand hideout stations to feature the Smelter / Furnace (Smelting), Forge / Anvil (Forging), and Woodcrafting Bench (Woodcrafting) with independent Lv 1–3 non-combat progression.
  - [ ] 4. Profession Tools: add Lv 15 craftable tools (Smelter's Tongs, Wayfarer's Hammer, Carver's Drawknife each +8% speed) and high-tier hybrid tools that combine speeds across production skills.
  - [ ] 5. Save Migration & Verification: grandfather existing player saves with full Smithing parity across Smelting, Forging, and Woodcrafting; update mastery tracks, UI tabs, and test suites.

- [x] Give masterworks their own tab on each profession screen instead of bloating the bottom of every page. — done 2026-11-16
  - Added a dedicated "Masterworks" tab to each profession screen that has projects, showing the number of unlocked undertakings and an active running indicator. Hidden the ProjectBoard from default activity views and hidden ordinary activity/batch sections while on the Masterworks tab. Typecheck and test suite verified. Unreleased.

- [ ] Produce detailed Ashen Codex act-map illustrations, beginning with Act 1's eight-zone Drowned Coast (2026-11-16).
  - Act 1 first artwork produced and visually inspected: `output/imagegen/ashen-codex-act-1-drowned-coast-v1.png`, with full prompt alongside. Portrait 1024×1536, all eight zone environments, continuous coastal terrain and physical paths, matching the approved world atlas. Labels, markers and dotted routes excluded. Further acts and game integration pending; no release.

- [x] Replace the world-map journey line with a connected road network traced against the owner's annotated route. — done 2026-11-16
  - Original-image pixel traces, shared forks, no duplicated return lane or improvised sea loops. Typecheck and five campaign-map tests pass. Played the real Campaign page with a campaign-complete demo character at desktop 1440×1200 and phone 390×844: reviewed the network, opened Act 4, returned to the world, scrolled to the eastern regions on phone; no console errors. Screenshots: `output/playtest/world-roads-desktop.jpg`, `output/playtest/world-roads-phone.jpg`. No release/version change.

- [x] Playtest the integrated Ashen Codex world map on desktop and phone. — done 2026-11-16
  - Verified with the revised road network on a campaign-complete demo character: desktop 1440×1200, phone 390×844, act navigation, horizontal phone scrolling and empty error console. Preview ran from a clean dependency install in the isolated release checkout; test-only scenario hook removed and server stopped. Existing act close-ups and progression are unchanged. Evidence in `output/playtest/world-roads-desktop.jpg` and `output/playtest/world-roads-phone.jpg`.

- [x] Expand Mastery Batches across suitable ordinary production recipes: 5× at mastery 15 in 2× time; 50× at mastery 90 in 10× time (5× production speed). Share the single craft’s mastery rate per second. — done 2026-11-16
  - Typecheck and all 106 test files verified (1,745 tests passed in the full run; the final batch test fixture was corrected and all 9 batch tests passed on rerun). Protected rare components, maps, keys, equipment and masterworks remain excluded. Browser navigation timed out; visual playtest remains unverified.

- [x] Separate 5× mastery batches from masterworks and require matching craft mastery 15. — done 2026-11-16
  - Implemented for Copper Supply, with its mastery reward shown in the matching craft tooltip. Typecheck and profession tests pass; full suite had one admin timeout that passed on targeted rerun. Browser preview was unreachable, so visual playtest remains unverified.

- [x] Skilling Mastery Thematic Overhaul: overhaul task mastery with 25/50/75/100 milestone perks, sub-category recipe personalities, animated proc callouts, and hybrid synergy. — done 2026-11-15
  - Topic 1 decided 2026-11-15: 1–100 progression kept with 25/50/75/100 milestone perks and modest background speed/yield baseline.
  - Topic 2 decided 2026-11-15: Hybrid synergy (Lv 25/50 task perks, Lv 75/100 global profession traits). Gathering/Thieving focus on dynamic procs/jackpot moments; Crafting/Production focus on systemic quality, charges, and rule enhancements.
  - Topic 3 decided 2026-11-15: Sub-category recipe personalities (charges/recovery for Life/Mana flasks, duration for Utility, elevation/discount for currency, vein strikes for metals, geodes for cosmic ores) with visual milestone badges, live proc callouts, and offline summary tallies.

- [ ] Build the skilling overhaul from [SKILLING_OVERHAUL.md](SKILLING_OVERHAUL.md): specify recipes/unlocks/rewards, establish independent access and equipment crafting, then deepen each profession.
  - Reference saved 2026-11-12; agreed direction and all eleven profession proposals recorded. Phases 00–08 and requested 12–14 complete locally/unreleased (2026-11-15); broader 09–11 and 15–18 remain pending.
  - [x] Plan the overhaul as bounded fresh-agent phases with dependencies, acceptance checks, starting prompts and durable handoffs in [SKILLING_OVERHAUL_PLAN.md](SKILLING_OVERHAUL_PLAN.md). — done 2026-11-13
  - [x] Execute Phase 00: audit current code and write [SKILLING_OVERHAUL_SPEC.md](SKILLING_OVERHAUL_SPEC.md) for all eleven professions, shared systems, migrations and thirteen uniques, with dependable source routes, timing and measurable phase checks. Documentation/source-data verification passed; no gameplay implementation. — done 2026-11-13
  - [x] Execute Phase 01: independent ordinary access and necessary station alternatives; persisted projects/discoveries, exact escrow/refunds, safe single delivery, work/accomplishments and separate return summaries. All 1,473 tests and typecheck pass; fresh/noncombat and busy pre-overhaul fixture playtests passed. No release or later profession content. — done 2026-11-13
  - [x] Execute Phase 02 Mining only: tiered deposits/prospecting, dependable fragments and Mining tool; every noncombat tier, live/offline8h parity, reload/manual bounds, old full-bag and actual mined-fossil Rune-carving use verified. Production build/typecheck and real-SQL tool validation pass; evidence in specification §14. No release. — done 2026-11-14
  - [x] Execute Phase 03 Woodcutting only: advanced timber, resin stands, protected heartwood/refinement and Heartwood Hatchet. Independent access, eight-hour live/offline parity, migrated full bag, resin use in actual Smithing and fragment refinement verified. Tests/typecheck/build pass; specification §15 and handoff updated. No release. — done 2026-11-14
  - [x] Execute Phase 04 Smithing only: preserve cheap bases; add guaranteed-purpose equipment, protected alloys/frames, advanced bars and Wayfarer's Hammer. Verify realistic upgrades/noncombat strength, guarantees/costs/storage/offline/old saves and actual tool SQL validity. Tracking and required handoff updated; no release. — done 2026-11-14
  - [x] Execute Phase 12: independent Archaeology sites/discoveries, full ordinary shield restoration, duplicate fragment/artifact exchange and protected later components; factions/standing/merchants preserved. Live/offline costs, repeat discoveries, legacy access and the full noncombat browser journey verified. — done 2026-11-14
  - [x] Execute Phase 13: independent Cartography manufacture, plain-map/Sextant previews, exclusive Reliquary chart/finished encounter and protected chart/reliquary components; encounter gates, allocated Atlas points and old trophy exclusivity preserved. Noncombat lock and full eligible victory verified. — done 2026-11-14
  - [x] Execute Phase 14: exclusive Woundmaker, Winter's Pyre and The Homecoming recipes, previews and collection sources; bleed/ignite/return contracts, full-bag delivery, exact live/offline costs and realistic crafted builds verified; UNIQUES regenerated. — done 2026-11-15
  - [ ] Execute remaining Phases 09–11 and 15–18; individual checkboxes and current handoff live in the build plan. Phase 09 is next. Phase 14's minimal crystal/inscription routes must be reused by those broader profession expansions.
  - [x] Design an initial endgame unique concept roster for crafting, Heist and related profession rewards, with defining powers, drawbacks and broad acquisition routes. — done 2026-11-12
    - Questions 1–8 decided: mostly build-defining treasures, with some powerful specialists; exceptional powers come with meaningful drawbacks to build around. Ten accepted concepts: Woundmaker, Winter's Pyre, Borrowed Tomorrow, The Buried Grudge, Witchglass, The Still Heart, The Homecoming, Debt of Stone, Hands of the Forgotten Choir and Hollow Circuit. The Tyrant's Seal and Crown of the Last Servant were not selected. Full concepts saved in SKILLING_OVERHAUL.md; no gameplay changes.
  - [x] Specify the ten accepted uniques' exact fixed effects, equip requirements, profession/station unlocks, ingredients, project costs, rates and interactions in SKILLING_OVERHAUL_SPEC.md; implementation/realistic checks remain below. — done 2026-11-13
  - [x] Add three single-effect pinnacle chase unique designs with recipes spanning at least three endgame mechanics, including one broad-range project using a little from everything. The Second Heresy, Worldheart and The Sum of All Things recorded with draft effects and source baskets. — done 2026-11-12
  - [x] Specify and build the three pinnacle chase recipes and effects: dependable source components, final quantities/unlocks, wide-roll reforging and currency interactions, Forbidden allocation settlement and correct damage/recovery interactions. Verify completion and costs in live/offline play; regenerate UNIQUES when game data is added. — done 2026-11-15
    - Phase 17 built and verified by automated tests (spec §24): all three recipes, one explicit effect each, Doomed/Uber/drought supply hooks, Sum-only one-Divine rerolls, Forbidden settlement and once-only multipliers. Browser playtest not run; Debt of Stone/Buried Grudge pairings wait for Phase 15.
  - [ ] Build the accepted unique items and their exclusive crafting, Heist and restoration routes alongside the required skilling systems; add player-facing collection/source information and verify realistic builds, live/offline rewards and preserved existing sources.

- [x] Fix mobile zone-map scroll trapping and let the navigation and health/mana header scroll out of view. — done 2026-11-12
  - Reproduced the original trapped swipe using a campaign-complete level-80 character in Act 3. Touch gestures now scroll through the map to the page, sideways map movement still works, and travelling resets combat to the top. Checked 390×844 and 360×640 phone layouts and the unchanged desktop scrolling layout. All 1,453 tests and typecheck pass. Standard Vite preview timed out; browser checks used an isolated bundle of the real game with fallback art and no music. Live in 0.4.37 on 2026-11-12.
- [x] Fix phones being unable to scroll the character select, title and new-character screens (regression from 0.4.37's page lock). — done 2026-11-12
  - Live in 0.4.38 on 2026-11-12.

- [x] Fix wiki-listed Maps gems missing from the Gem shop after campaign completion. — done 2026-11-12
  - Restored 37 skill gems and 77 supports to the post-campaign shelf. Reproduced through a saved level-90 campaign-complete character; every wiki-listed gem can be purchased, with campaign, level and signature-support upgrade restrictions preserved. All 1,453 tests, typecheck and wiki generation pass. Browser preview could not connect, so an on-screen playtest remains unverified. Live in 0.4.36 on 2026-11-12.

- [x] Publish the simulator API and verify the installed desktop runner against the live release. — done 2026-11-12, live in 0.4.34
  - The deployed game, all six release artifacts and five current event rows verified successfully. The updated installed runner shows LIVE GAME 0.4.34; the user's saved setup was restored and completed old runs exported to Downloads/poi-sim-comparison.json. The unfinished 600-hour old-source run was stopped for installation. All 1,450 tests passed; no long post-update run was performed. HTML is transported as verified plain text to prevent hosting script injection, then rendered locally in the sandboxed app.

- [x] Rework ordinary unique drops into a low-weight, level-gated global pool; preserve achievement and encounter-exclusive uniques. Every ordinary unique joins at its base requirement, and the collection shows that level instead of zone lists. — done 2026-11-10, live in 0.4.35 on 2026-11-12

- [x] Passive tree notable pass (design settled and list approved 2026-11-08, see Decisions "Notable pass"). Unreleased; not yet checked in a browser. — done 2026-11-08
  - Contents live in `src/data/passiveNotables.ts`; [PASSIVE_NOTABLES.md](PASSIVE_NOTABLES.md) is generated from it (player text). ~70 new stats in `src/engine/types.ts` (archetype scaling, conditional damage, Doomed-wheel "more", 18 rule flags), wired through `gems.ts` skillNumbers, `combat.ts` and `stats.ts`; new masteries for warcry, exertion, curse, minion, totem, mark, storm, Doom and chaos.
  - Build adjustments to the approved draft: Warlord's Call became "Warcries last until the pack falls" (warcries already counted every enemy); Twin Hexes merges the earlier curse's effect into the new one; Perfect Rhythm gives 1% increased crit chance per 100 Accuracy once you can't miss; Grave Pact is once per pack. A few novel draft effects without an engine stat were mapped to the closest real stat (see the generated doc).
  - Wither is new (no earlier code applied it, despite Abyssal Pact's text); Abyssal Pact still doesn't apply it.
  - Budget: 18 rule-changers, 6 class-mechanic notables (1%), ~5% "more"-style notables; 576 regional notables, with 13 tailored starting notables and 10 shared basics in each region. Tests in `tests/notables.test.ts` and `tests/trees.test.ts`.
- [x] Write and review the non-combat band-mastery design, with no mastery-gated unlocks, no more than 100 authored identities, proposed progression/bonuses, persistence/offline behavior and acceptance criteria. The later implementation is recorded separately below. — done 2026-11-06
- [x] Implement non-combat band mastery across timed life skills, Heists, Greenhouse, offline progress, persistence and action-card UI with 67 stable bands and bounded ordinary bonuses; full suite passes. — done 2026-11-07
- [x] Massive unique items, flasks, and maps pass: reworked stat-stick uniques (`barnacle_band`, `khans_tithe`, `pyre_heart`, `starforged_edge`, `unblinking_tome`, `fishermans_knot`, `the_unwritten`, `architects_compass`, `sovereigns_grasp`, `faultline`, and boss/cycle uniques) with signature mechanics; added 12 Ascendancy BIS uniques, 22 Life-Skill uniques (2 per profession), 6-piece Master Artisan set, 6-piece Wanderer's Heirloom leveling set, 3 Gold-Find uniques, 5 Unique Flasks (`u_flask_karui`, `u_flask_lavianga`, `u_flask_lions_roar`, `u_flask_bottled_faith`, `u_flask_dying_sun`) with `enemyRanged`/`packStart` Instill conditions, and 5 Unique Maps (`umap_vaults`, `umap_cowards_trial`, `umap_olmecs`, `umap_maelstrom`, `umap_grandmasters`). — done 2026-11-07
- [x] Overhaul Admin with campaign/demo/death diagnostics, searchable player inspection and audited recovery/compensation, feedback snapshots/replies/filtering/sandbox, and configurable live events/broadcasts. Database migration and frontend verified locally; service installation/deployment remain separate. — done 2026-11-06
- [x] Apply updated market/admin SQL in Supabase. Owner confirmed both ran; live Admin overview/player/feedback RPCs and backup/mail/audit tables refuse anonymous requests. — done 2026-11-06
- [x] Upload current validation rules and verify real-account Admin inspection, backup restore, mail/compensation and scheduled events against the updated frontend. Owner confirmed the Admin page works. — done 2026-11-08
- [x] Confirm Google OAuth secret revocation for GitHub alert 2 (historical `docs/AUTH_SETUP.md`, commit `4ba2852afe62`). Owner confirmed. — done 2026-11-08
- [x] Confirm the separate `is_admin` / `admin_stats` lookup-path ALTER statements in SETUP were applied; perform signed-in cross-account/admin isolation and fresh provider login checks. Owner confirmed the admin SQL and signed-in checks. — done 2026-11-08
- [x] Audit public source/history and available Actions exposure; enable GitHub secret scanning/push protection and implement offline-compatible market/build hardening. Findings and rotation playbook live in DEVELOPMENT/SETUP; pending service actions remain unchecked above. — done 2026-11-05
- [x] Rebalance area-level combat XP with a two-level grace band and capped bonus/penalty milestones; update labels, calculator and tests. — done 2026-11-05
- [x] Give monsters distinct player-style damage/defence archetypes while preserving reference effective hit pools and damage budgets; verify campaign, map, rarity and save behavior. Unreleased; remaining combined-worktree failures are recorded below. — done 2026-11-05
- [x] Consolidate and audit game documentation; replace 40 internal/reference documents with five, preserve published wiki URLs and validate links/generated pages. — done 2026-11-05
- [ ] Player report: roughly two hours of one signed-in character's progress disappeared. Audit local saves, uploads and merge/transfer reconciliation before changing save behavior.
  - Static audit and all 1,250 tests pass on 0.4.4. Two credible rollback paths remain: a browser-storage write failure currently prevents that cloud save attempt from starting, and simultaneous devices can unconditionally replace the same character row with a stale progression snapshot carrying a newer client timestamp. Neither identifies the reported incident without affected-account save/backup timestamps and two-device reproduction.
  - [x] Both rollback paths fixed in `src/platform/saves.ts` and `supabaseTable.ts`: a failed browser write still uploads, and an upload only replaces the cloud version it grew from (see Decisions). Seven new two-device and storage-full tests; 1,301 tests and typecheck pass. Unreleased. — done 2026-11-08
  - [x] A refused device now stops: it returns to character select with a message that stays until dismissed, and a Hardcore death on it leaves the cloud character alone. Deliveries (Admin gifts, returned market items) that arrive during a time-away catch-up now wait for it instead of being dropped. `tests/gameStore.test.ts`. Unreleased. — done 2026-11-09
  - Remaining: a live two-device check after release. The copy a refused device keeps in the browser (`coe-<account>-conflict-<id>`) still has no button to restore it.
  - Code review 2026-11-09 found nine more problems; four are fixed and five remain (see Ideas / later).
- [x] Player report: Templar appears to encounter fewer enemies. Pack/arrival logic is class-independent; 10-seed fixed-area simulations showed comparable incoming hit flow, while kill rates varied with build damage. Templar completed Act 6 in 16h43 in the integrated whole-journey seed. — done 2026-11-06
- [ ] Player report: Twin Strike hits from four tiles away. Audit melee range and closing-in; evaluate melee-only/approach tactics request.
- [ ] Verify Mana is Power display with Overflow after the spending-window change.
- [ ] Recheck Warrior/Templar weapon progression, class pacing, high-level Poison Dart scaling and defensive gearing on current code. Old simulations disagree because systems and bots changed.
  - 0.4.4 audit: Warrior/Duelist/Templar/Shadow finished Act 6 in 15h13–19h16 in the all-class seed. Across three Ranger seeds, the median reached late Act 6 but the day-one stage range was 5–70, with Act 1 taking a median 12h54. Across three Mage seeds, the median stalled at level 43 in Act 4 with 195 deaths; the stage range was 29–70. Do not tune from the single successful seeds or lock new progression features until the bot/loadout failures and seed spread are isolated.
- [ ] Real accounts: email sign-up/reset/confirmation, guest carryover, two-device save/realm behavior and Player Market buy/bid/delivery recovery. Verify current Admin → Market rules upload after content changes; no assumption that an old checklist proves current service state.
- [ ] Player wiki references/guides for trees, runes, flasks, side systems, meals, greenhouse, loadouts, challenge realms, market recovery and Maps. Generated tables currently cover only part of these topics.
- [ ] Deeper recovery runbooks for cloud conflicts, duplicate-tab transfers, market holds and deliveries. Verify code and actual service behavior.
- [ ] Art: proper area landscapes, weak stand-ins, reused gem icons and outstanding weapon artwork. Inspect current manifest before quoting old missing-art counts.
- [ ] Owner checks: guide tone, Town prices/readability, campaign/Map Device UX. Keep Act 1 cold-check/scorch changes parked until requested; the prior decision did not authorise an unsolicited rebalance.
- [ ] Launch Guide Round 2 (owner's screen review, 2026-11-09). Full list and notes: Launch Guide "Round 2 plan". Three parallel sessions started 2026-11-09:
  - [x] Session 1, first hour and combat: tutorial pop-up on phones, class-first character create, phone combat layout, tooltips, toasts, top bar pins, offline catch-up sliced and ~2x faster. Checked in headless Chromium at phone and desktop sizes; Account screen not checked (needs cloud sign-in). — done 2026-11-09
  - [x] Session 2, big page reworks: Hideout, Campaign world/act maps, Map Device portal. Campaign maps are drawn in SVG (no map art in the packs); editable path data and a one-line image swap in `src/data/campaignMap.ts`. — done 2026-11-09
  - [x] Session 3, page polish and Admin: gems, belt, bench materials (and a Special Materials black-screen crash), stash filters, Trader, Settings tabs, tree trackpad/touch pinch, locked life skills listed, page crash guard, Player Market closed (`MARKET_OPEN` in `src/platform/market.ts`). — done 2026-11-09
    - Admin black screen: Admin was lazy-loaded, so opening it after a newer release fetched a file that no longer existed. Now bundled. Compensation items were refused because the live item checker predates `itemTier`; the client now strips it.
    - Owner to check with real data: Admin Overview/Players/Inspect, and send a compensation item from a normal base and a unique. Optional SQL: re-run `docs/ops/market.sql`, then `docs/ops/admin.sql` (new Overview figures), then Admin → Market → "Upload from this build".
  - [x] Design pass: hideout station tiers, War Table split and auto unlocks, per-task mastery, mini-game changes, 100+ achievements, loot filters, events calendar (see Decisions "Round 2 design pass"). — done 2026-11-09
  - [x] Build: hideout milestone tiers (~3 more per station, each a new unlock plus a stat bump, endgame-gated top tiers; Map Device → Atlas tree, Stash cheaper tabs and ground-loot storage, Forge gear-tier chance). New Rune Board station; Atlas needs Map Device 2 (players already using it are lifted to 2). Not browser-playtested. — done 2026-11-09
  - [x] Build: War Table / Quartermaster split; auto flee (level 2, cheap Act 1 materials), auto challenge (level 4) and auto next zone (level 6) behind War Table upgrades. Players from before keep flee and challenge (account flag); old table levels realign by the unlocks they hold (status 3, aim 5, 3rd slot 7). Quartermaster keeps its four tiers as they were. Not browser-playtested. — done 2026-11-09
  - [x] Build: per-task mastery, 120 unbuffed hours to max, with save migration from bands and bigger max bonuses. — done 2026-11-09
  - [x] Build: mini-games (inner double zone on all, horizontal Alchemy, easier Foraging and Gemcutting); Bench recipes drop achievement requirements. Played at phone and desktop sizes in headless Chromium. — done 2026-11-09
  - [x] Build: 100+ per-character achievements with play-changing rewards. 129 achievements, 6 new achievement-only uniques; checked in headless Chromium at phone and desktop sizes. See Decisions "Achievements build". — done 2026-11-09
  - [x] Build: layered loot filters (presets + overrides, custom rules tab, share codes). Tested at phone and desktop sizes; old filter saves migrate and time-away loot uses the same evaluator. — done 2026-11-09
  - [x] Build: events calendar (computed holidays, Admin toggles, stacking, weekend and custom windows). Calls under Decisions "Round 2 design pass". — done 2026-11-09
    - Owner to do once: run `docs/ops/events.sql` in Supabase (SQL Editor → New query → paste → Run). Until then holidays still run; only Admin's holiday on/off switch and "Weekends only" box ask for it.

- [x] Review fixes (2026-11-09): passive tree profiles now run on one engine copy (`src/engine/treeProfiles.ts`; the Tree page's private copy in settings is folded in on load) and switching keeps the character's total points; old tab refuses a save from a newer version (`NewerSaveError`); keyboard use of the passive tree (Tab to the tree, arrows, Enter, +/-, Home); feedback cap in `docs/ops/admin.sql`. — done 2026-11-09, live in 0.4.27 on 2026-11-10
  - [x] Feedback cap applied to Supabase (10 an hour per player, 30 an hour for guests, 20,000 total) and Confirm email checked on by the owner. — done 2026-11-10
  - Profile switching now follows the engine's rule: not during a fight (Town or Hideout only). The old page let you switch anytime.

- [x] Passive tree route planning: clicking a node lines up the shortest route to it (`passiveRoute` in `src/engine/passives.ts`), shown in blue with its cost and stat changes; more clicks extend it, clicking a planned node cuts it back, Confirm buys it all and Cancel drops it. Routes never pass through keystones, masteries or Doomed Gates. Masteries, refunds and owned nodes keep the single-node preview. Skilling tree unchanged. — done 2026-11-11, live in 0.4.32 on 2026-11-11

## Ideas / later

- Give Masterworks distinct visuals across professions in a dedicated design pass (requested 2026-11-22).

- 0.5.10 polish sweep follow-ups (2026-11-20), owner calls:
  - The Delegation Chambers (end of Act 3, level 27–28) killed a level 34 Mage and a level 45 Ranger in scenario gear within about 20 seconds (16 enemies on the field). Belongs to the open "judge difficulty in full campaign play" item; not changed.
  - Phone: several achievement toasts at once cover the top tabs until they fade.

- Astrology follow-ups (2026-11-19), owner call: whether it should count toward Skilling tree points, get a "level 50" achievement, a Skilling tree branch, a profession tool or Masterworks. All left out so nothing else moved.
- Inventory merge follow-ups (2026-11-19): 107 campaign/act tests (act2–act6, actRoads, cartography, a few "Act 6" wording checks) already fail on the last commit, before this work; they look like they expect six acts while the game now has seven. `docs/GAME.md` line 53 still says auto-salvage needs War Table 5/6/7; the game uses Quartermaster 2/3/4. Gear hidden under the old filter rules that is still on the ground will show again once (nothing is deleted).

- Agility follow-ups (2026-11-19): world-map travel has no travel time, so there was no "faster travel" for Agility to shorten; Agility is not counted toward total skill level (skilling-tree points, achievements) and has no level-50 achievement or skilling-tree branch yet.

- Archaeology overhaul follow-ups (2026-11-17): the six Archaeology skill-tree nodes predate layers and could add hazard or Commitment effects; relic forms could gain one signature implicit each; achievements for Passports, the Reliquary and restored relics; a wiki guide for the trail, layers and forge. Buried components and Surface's +25% Artifacts an hour slightly raise Expedition income, so watch merchant pacing.
- Offline summary wording follow-up (noticed in Phase03 playtest, 2026-11-14): the generic Items Found tile says equipment is waiting on Combat even when a completed profession tool has safely arrived in the inventory. Consider destination-aware wording in a later shared UI pass; reward delivery itself was verified.
- Code review follow-ups (2026-11-09), confirmed but not acted on:
  - Fixed 2026-11-09, unreleased (`tests/endgameLootFixes.test.ts`): Doomed Maps now drop the `fractured` orb the Bench spends (old `fractured_orb` stock converts on load); natural fractured tier 5 drops lock the modifier and only come with the drop; Map Device 6's bonus map goes to the map supply and the loot feed can't blank the screen; a Divine Orb keeps a Doom Sigil's raised values. Items already Divined after a Sigil keep their lowered values: the save can't tell them from a low roll.
  - Passive tree profiles (`TreePage.tsx` `switchProfile`) never recount points: switching, refunding and switching back gives the points twice; levels spent on one profile are missing on the other. The page also allows switching in a fight, and the tested engine version in `treeProfiles.ts` is unused.
  - Feedback accepts unlimited 256 KB rows from signed-out visitors (`admin.sql`); cap anonymous size and add a rate limit and retention.
  - A save from a newer build loads on an old tab and is stamped with the older version (`save.ts` `deserialize`); refuse it and ask for a refresh.
  - "Confirm email" off (SETUP) lets someone register another player's address before they sign in with Google or Discord; check the dashboard.
  - Passive tree nodes can't be reached from a keyboard.

- Tree web follow-ups (2026-11-08): the tree is 1,573 nodes (71% of 2,208); the 50% target would mean cutting about 30 clusters and their notables, which needs a call on which. Paths now run through clusters, so keystones sit 26–49 nodes from a class start (was 14–20) and some routes must take a notable on the way; check if that feels too slow. The two point pools were audited and changed to 2 Travel / 3 Passive per level; playtest whether the calculated split feels right.
- Notable pass follow-ups (2026-11-08): the Abyssal Pact keystone says it applies Wither but never did; it could now use the Wither from Withering Touch. Eight rule-changers have tests in a fight; Steel Tempest, Ricochet, Venom Volley, Hunter's Brand, Grave Pact, Holy Retort, Unbroken and Perfect Rhythm are wired but only type-checked, so they deserve a playtest. Doom can now be fractional (Doom-rate stats); check the Doom meter display rounds it.
- Ascendancy-granting chase gear and other items that bend tree connections; no hard node-count cap.
- More life-skill bands/recipes, Gemcutting force materials and Fletching. Authored band mastery now has the bounded design above rather than remaining an unspecified idea.
- Improved auto-crafting/Seals integration, richer loot/sell filters and later crafting beyond current modifier limits.
- Expanded Unique collection organization, achievements presentation, side-feed revisit and clearer player ailment overlays.
- Per-gem setup/priority workflow, meaningful specialized support restrictions and more contextual tactics.
- Wiki pages for individual materials/modifiers, tooltip deep links and entry-specific history if useful.
- Audit follow-ups (2026-11-06), not acted on: Hair Trigger as specced (crit refills Exertion) plus a guaranteed Exerted crit would loop forever; the code currently has no guaranteed crit and Hair Trigger is description-only, so fix the spec before building it. Also consider: 8s base Mark duration; Act 5 channel bosses' auto timeouts (Hollow Reef, Maelstrom's Eye), possibly by reserving a stun skill's cooldown for its Wind-up rule; Mage Act 1 stall and slow Warrior campaign; an emergency-only floor for unenchanted flasks.
- Reassess legacy partial stock/cross-device issues, storage-full UI handling, Hardcore resurrection from old copies and loadout partial failures before claiming them fixed.
- Endless post-Maps content and cosmetic shop remain ideas, not scheduled features.
- Save follow-ups (2026-11-08), not acted on: the shared account row (stash, hideout) still uses a plain write, merged by `rev` and unlocks. A character deleted on one device (including a Hardcore death) stays playable locally on another, whose uploads are now refused instead of bringing it back.
- Unmerged work saved from removed worktrees (2026-11-08), kept as local commits on their old branches:
  - `claude/combat-reload-bug-48a5da`: reloading mid-fight puts you back in the area rested with the field cleared, instead of mid-hit (`freshField`, player report from 2026-10-31). Not on main; worth porting.
  - `claude/player-stats-admin-panel-6aaef2`: Admin → Players tab with per-character lifetime tracking (time per activity, XP per skill, damage, gem uses, deaths by zone) and `docs/ops/stats.sql`. Not on main; it predates the Admin overhaul, so it needs rebuilding rather than merging.
  - `claude/cooking-sidebar-removal-705430`: show Cooking in the sidebar from the start. Small; owner call.
  - The other salvage commits are superseded (old trash-monster damage tuning, the gem shelf already on main) or are early-November playtest notes.

## Done

- [x] Released Workshop Upgrades and Loot as 0.6.7. The production build and all 2,055 tests passed, and deployment confirmed the version and login configuration. — done 2026-11-24

- [x] Replaced Woodcutter's Lodge upgrade cards with clickable workshop stations, including the purchasable Trophy Wall. Verified upgrade arrows, purchases, trophy mounts and World Tree planting in desktop and phone-width playtests. All 41 Woodcutting tests passed. — done 2026-11-24
- [x] Replaced the Lodge's drawn station shapes and Trophy Wall icon with credited itch.io props and signage. Verified the sign, purchase and nameplates on desktop and phone. — done 2026-11-24

- [x] Group title and character screen News by beta version and shrink Astrology constellation slots and labels — done 2026-11-24, live in 0.6.6.

- [x] Remove the wind sound when opening Foraging — done 2026-11-23. The browser playtest confirmed that Rain & Glass starts only when enabled, background music continues, and harvesting still plays its sound.

- [x] Smelting Furnace screen overhaul: full-width hearth on a hand-painted stone wall (CC0), animated flames when lit, Heat & Purity with Fuel/Flux slots beside the furnace, and a Fuel & flux tab that names each craft's product and splits Fuel from Flux. Checked on desktop and phone in the local game. (Done 2026-11-23, live in 0.6.5.)
- [x] Forging Anvil screen pass to match: forge scene on the same stone wall with a pixel anvil (CC0) and forge fire, Forge panel (have/need costs, Forge once, Save pattern, rhythm hammer) beside it, numbered steps below, blue-steel High Crucible variant. Checked on desktop and phone in the local game. (Done 2026-11-23, live in 0.6.5.)
- [x] Implement weapon-family mastery and master-alloy signatures. Verified recipe-practice migration, saved patterns, and crafting a basic wand before unlocking a Moonsilver Master Form. (Done 2026-11-23.)

- [x] Ship the 15% master volume default and loot-filter volume control, kill-based flask charge ranges by rarity, and a one-Rubble material cost for Archaeology sifting. — done 2026-11-23

- [x] Ship the sidebar Report popup in 0.6.1. Drafts survive navigation and reopening, and reports keep the screen details captured when opened. — done 2026-11-23

- [x] Ship Skilling Revamp 0.6.0 with all 12 reworked skills and the new skilling passive tree. Included the Woodcutting Lodge and giant-heart pass, Archaeology’s Scholar’s Desk and tabs, Astrology’s chart and telescope polish, and Thieving’s new high-level marks, heists and ledger. — done 2026-11-23

- [x] Finished the Mining layout with full-width Focus below the shaft and worksite, a Mine Upgrades tab, actual payout popups, and mine history and replays in the Activity bar. Verified the payout, depth selection, and breakthrough history in the local preview. — done 2026-11-22

- [x] Combined the Woodcutting and Mining preview. Added depth trait filters, separate Focus and clearer descent and gas status. Verified a brace unlocking the Pump Station at Depth 23, and opened the Forest and Sawmill in the same preview. All 2,012 tests and typecheck pass. — done 2026-11-22

- [x] Woodcutting look-and-feel pass — done 2026-11-22. No more scouting: choose a woods and cut there, with special giants more common the more you fell in it. Planks moved to Woodcrafting's Sawmill tab. The page is one full Forest screen, and the chopping block is now an axe splitting a standing log.

- [x] Removed the Delve support crafting step. Descents spend rubble directly and use saved supports first. Verified mixed payments, the pick discount, and offline progress. — done 2026-11-22

- [x] Redesigned the Delve around the illustrated shaft, clear depth controls and compact supplies. Doubled rubble per mining swing and gave successful braces a 65-second Focus hold. Verified the starting mine, support crafting, descent and return to a reached depth, and the phone layout. All 2,010 tests and typecheck pass. — done 2026-11-22

- [x] Build Woodcrafting — done 2026-11-21. Verified a jig upgrade, a saved bow tuning, drawknife doubles and tuned gear on the return rack at desktop and phone widths. Save migration 58→59 starts with neutral tuning and preserves the active recipe. Living growth, retuning, balanced gear and purpose guarantees have targeted tests.

- [x] Build Mining, Smelting and Forging — done 2026-11-21. Desktop and phone checks covered Delve navigation and replay, furnace supplies and the ingot rack, and saved forge patterns and the weapon rack. Save migrations 55→58 carry existing Mining mastery and Forging presets forward and preserve Refined bars. Delve rough sizes can still be used in existing rough-gem recipes. Forged jewellery quality improves its rolled modifiers. The changes are local.

- [x] Tidy the Inventory layout — done 2026-11-20. The Stash sits under Inventory and keeps the same height across tabs. Gear sets live with worn gear, and item actions open below gear.

- [x] Make shared Uniques and maps easier to find — done 2026-11-20. Inventory links to the corresponding Guild Stash lists, the personal Stash has a Maps tab, and the Map Device points to maps held by the Guild Stash. The session tested withdrawals from legacy shared stock and added regression coverage.

- [x] Dedicated Guild Stash page with click-to-send actions in Inventory — done 2026-11-20. Desktop and phone browser checks covered local transfers, including withdrawals on a second demo character.

- [x] Update combat pacing, spawn countdown and matchup — done 2026-11-20. Walking, Sprinting and Fleeing change pack arrival speed and crowd size. Entry countdowns are on the hexes. Targeting is by skills, automation is by flasks, and the matchup shows current Life and measured DPS. Verified on desktop and phone.

- [x] Improve act-map labels and quest highlighting, move the journal below the map, and add objectives and rewards to a Quests page — done 2026-11-20. Verified Wreck Claims highlighting from both entry points, zone label hover and phone-width navigation in the local game. All 29 focused campaign and map tests pass.

- [x] Restore combat backgrounds using reusable terrain and variants, and call combat destinations zones — done 2026-11-20. Added sourced backgrounds to all 70 campaign zones and their World Map cards, including variants for the Salvage Caves, Charred Copse and Cold Vault. Verified desktop zone changes, the Cold Vault at phone width, and a Map borrowing the Charred Copse backdrop. The isolated build and 41 focused tests pass.

- [x] Replace all 16 terrain images with existing illustrations, paintings and prints under CC0 or in the public domain — done 2026-11-20. Sources are recorded in the asset credits.

- [x] Hideout layout: distinct frames, compact Character and Equipment panels, gear contained at narrow widths, framed station upgrades, phone-only shortcuts, and a top bar that scrolls away. Verified from 320px through 1920px, including an upgrade purchase and mobile navigation. — done 2026-11-20

- [x] Removed the shared picture frame from game panels, dialogs, tooltips and notifications. Added a timber border to the Woodcutting and Planks workbench. Retested the compact Hideout equipment layout, framed Upgrades, mobile-only shortcuts and scrolling top bar on the current release source. — done 2026-11-20

- [x] Build character material inventories, personal Stashes and the Guild Stash — done 2026-11-20.
  - Checked live copper gathering and manual cross-character transfer in the desktop browser. Automated checks cover a miner and woodcutter supplying a dagger crafter, offline crafting stopping when personal inputs run out, a full material stack, old shared balances and cloud transfer save conflicts.

- [x] Build Saltmere behind a closed achievement gate — done 2026-11-20. Landed all five legends with both desktop keyboard and 390px touch controls. Checked the feast and combat flask, including the flask's charge recovery in a fight. Automated checks cover haul loss, workshop jobs, fight resumption, realm access and duplicate docking. The hidden achievement is tracked separately above.

- [x] Expand the ordinary gear affix pool with eleven tiered, build-specific modifiers — done 2026-11-19.
  - Desktop playtest verified +1 and T1 +7 maximum Rage on item-level-80 amulets, an equipped Rage cap increase from 24 to 31 in combat, and a T5 Rage decay roll on an item-level-30 amulet via a Chaos Orb. Tests cover the item-level cutoff, weak and strong Rage rolls, conditional Bleed hit damage, and existing crafting rules. Unreleased.

- [x] Verify the gear and skill counters for the campaign packs and add a dangerous-pack skill trigger — done 2026-11-19.
  - Every pack lists two or three available counters, and each of the 14 general checks has both a gear mod and a skill-rule option. Tests verify eligible gear bases and item levels, flask drop levels, Gem Shop unlocks and ground triggers. The new trigger is available from Act 1. Desktop playtest selected it for Iron Guard on a level 4 Warrior and verified it cast automatically against the Cinder-Keeper. Existing drop weights support the counters. Unreleased.

- [x] Add two dangerous packs and one stronger late gear check per act — done 2026-11-19.
  - Added 21 local pack leaders with warnings in the World Map and combat details. The stronger checks pressure Bleed at Brinewick Lookout, critical strikes at Wayfarer's Post, Ignite at the Expedition Depot, Poison at the Forum That Bloomed, cold spells at the Laboratory Stair, Shock at the Ward Breach, and chaos damage at the Ninth Descent. Named variants appear on the first pack and every third pack thereafter through the shared live/offline combat path. Base enemies are shared with Maps and summons as before. Unreleased.

- [x] Review all 70 campaign zone names against Veyrath's lore and geography — done 2026-11-19.
  - Renamed 32 areas and updated the journal and area guide. Stable IDs, routes, encounters and rewards were preserved. All 1,861 tests and the production build passed. Desktop playtest checked all 70 map labels, selected the Cloth Courts and travelled into the Warden Galleries. Screenshot: `output/playtest/zone-names-harrowgate.png`. Unreleased.
- Manual skill gem upgrades with a greyed-out button when an upgrade would disable the skill — done 2026-11-19.
- Cleanup (2026-11-19): removed every finished working folder and branch (local and GitHub), the scrapped skilling-polish and sim-rates work, playtest screenshots, old generated map drafts and five unused world-map images. Kept the full-size originals of the in-game map art in `output/imagegen/` (seven act maps and the bound-sea world map) for future edits. Older entries here and in VEYRATH-MAP.md that point at deleted drafts are history only.
- Shipped **0.5.6** live 2026-11-19 (deploy confirmed version and login). Release 0.5.6 gathered every session's unshipped work (2026-11-19): skill upgrades, hand-traced act map routes, combat-only tutorial, one Inventory screen and loot filter rework, the Archaeology overhaul, and the security review fixes (single Fractured Orb, second-device lockout, Hardcore and gift fixes). Left out as superseded: the 17 Nov skilling-area visual polish (the live 19 Nov skill page redesign replaced it) and the 10 Nov sim-rates tooling (the simulator and pacing targets changed since). Both are still on their own branches.
- Extended the Act 1 route cleanup to all six remaining acts — done 2026-11-19. Hand-traced shared roads, streets, switchbacks and underground passages with authored journey itineraries and sensible entrances. Native previews inspected; automated checks verify all links, no crossing strokes and no duplicate sections. Progression and positions unchanged; live-browser interaction remains unverified. Unreleased.

- Replaced Act 1's crisscrossing map links with hand-traced shared road sections — done 2026-11-19. Preserved progression, area coordinates and all other acts. Six map checks and typecheck pass; native preview inspected, live-browser acceptance outstanding. Unreleased.

- Removed the World Map overview's page title, duplicate Veyrath heading and exploration instruction — done 2026-11-19. Overview now starts directly with the atlas; act close-up headers remain unchanged. Existing map view check passes; live browser visual acceptance remains unavailable. Unreleased.
- Reworked the intro tutorial to combat basics only — done 2026-11-19. Removed the mining, smithing, transmute, Hideout, bench and salvage steps. Added Use a Skill, Let It Fight (automate a skill) and Spoils of the Shore (pick up ground loot). Equip now accepts any found gear. Tutorial text uses the Veyrath name Brinewick Shore, and "Show me" now points at the Act 1 banner. Saves mid-tutorial move to the matching step (save version 50).

- Shipped **0.5.5, Veyrath World Map** — done 2026-11-19. Committed this session's campaign/map work, merged and preserved releases through 0.5.4, regenerated UNIQUES, passed all 113 files / 1,795 tests, and deployed with the guarded project command. Live version and login configuration confirmed. Latest ocean/fog native previews inspected; live UI hover acceptance remains outstanding. No additional version bump for this release record.

- Replaced the World Map's pale seas with a harsh dark ocean and returning-current/ship-wake motifs — done 2026-11-19. Updated runtime artwork and native previews; recorded the owner's psychological escape-boundary lore without fixing unresolved memory effects or adding sailing mechanics. Prior paintings retained. No release.

- Added readable act banners, regional hover/focus highlights, character-specific unlock fog and a full-width desktop World Map — done 2026-11-19. Eight focused checks and typecheck pass; native previews inspected. Live browser acceptance remains outstanding because the local page stayed blank. No version change or release.

- Removed the remaining baked-in pale clearings beneath World Map place names — done 2026-11-19. Integrated `veyrath-world-flat-ink.webp`, retained prior paintings, and refreshed the native preview with existing act banners and territory borders. Terrain now continues beneath lettering; the earlier tiny-clearing direction is superseded. Native preview inspected; live-browser visual acceptance remains open. No release.

- [x] Prepared a direct visual preview of the current World Map after the live browser preview stalled. Generated a self-contained HTML render from the actual WorldMap component and a local SVG/PNG presentation using the same artwork, territory paths, label positions and current thin-banner/plain-number styling. Temporary render harness removed. This is a visual export, not a successful live-browser playtest. Files: `output/playtest/world-map-current-preview.html`, `.svg`, `.png`. — done 2026-11-19

- [x] Made World Map act-name banners smaller and thinner, moving the act number underneath as simple unbacked text. Preserved direct act selection, subdued place captions and no-halo styling. Typecheck passes; visual acceptance remains pending above because the browser preview stayed blank. Unreleased. — done 2026-11-19

- [x] Removed the pale under-stroke behind World Map borders and explicitly disabled label shadows/filters. Five map checks pass; visual confirmation is pending above because the local browser preview did not render. Unreleased. — done 2026-11-19

- [x] Subdued actual place captions into small, fine, muted map ink with minimal terrain clearing and no bloom/backing. Kept act navigation distinct, quieter and away from settlements. Desktop/phone browser checks found no errors or page-width overflow; Act 4 selection and native place-label styling verified. Five map checks and production build pass. Screenshots: `output/playtest/world-map-subtle-names-desktop.jpg`, `world-map-subtle-names-phone.jpg`. Source/prompt retained under `output/imagegen/veyrath-world-subtle-lettering*`. Unreleased. — done 2026-11-18

- [x] Made all seven act ribbons thin and single-line, renamed Act 5 to Cairnwatch Institute, and gave map place names an ink-lettered appearance. Integrated `veyrath-world-lettered.webp` from the built-in lettering edit, retaining the original painting and exact edit prompt/source. Selectable act-map labels now use sepia italic styling. Desktop and 390×844 phone checks confirm seven non-overlapping, single-line ribbons, no page-width overflow, renamed-act keyboard navigation and no console errors. Typecheck, 19 campaign checks, wiki generation and production build pass. Screenshots: `output/playtest/world-map-thin-ribbons-desktop.jpg`, `world-map-thin-ribbons-phone.jpg`, `cairnwatch-ink-labels.jpg`. Unreleased. — done 2026-11-18

- [x] Added subtle parchment title ribbons to all seven World Map territories, with "Act X" above the full act name, folded tails, sepia lettering and gently irregular ink outlines. Ribbons and territories both remain clickable; keyboard activation works. Adjusted coastal placement to preserve settlement labels and widened the mountain title to fit on phones. Desktop and 390×844 browser checks found seven non-overlapping ribbons, no page-width overflow and no console errors. Screenshots: `output/playtest/world-map-ribbons-desktop.jpg`, `world-map-ribbons-phone.jpg`. Unreleased. — done 2026-11-18

- [x] Closed the World Map territorial borders with detailed coastal traces joined to the inland frontiers, enclosing all six surface chapters and the underground entrance callout. Retained sepia ink, clear artwork and shared internal boundaries. Typecheck and five map tests pass; visually checked the enclosed territories in the running game and verified Act 1 selection with no console errors. Screenshot: `output/playtest/world-map-enclosed-territories.jpg`. Unreleased. — done 2026-11-18

- [x] Reworked World Map act regions after the owner rejected the colored geometric outlines. Geographic hit areas now sit invisibly over the painting; shared sepia dash-dot ink borders follow inland terrain and the coastline defines the outside edges. Removed the Act 7 sea box and use the painted First Seal callout. Hover/focus strengthens ink without tinting territory. Visually inspected in the real game; mouse selection opened Acts 1 and 7, keyboard selection opened Act 2, with no console errors. Typecheck and five map checks pass. Screenshot: `output/playtest/world-map-territory-borders.jpg`. Unreleased. — done 2026-11-18

- [x] Replaced numbered World Map act pins with bold, solid geographic boundaries that select their act when clicked. Hover/focus highlights the region; tooltips name it, with Enter/Space keyboard activation. Removed the outline-hide switch because regions are now the navigation targets. Typecheck, five map checks and real-browser mouse/keyboard selection pass with no console errors. Screenshot: `output/playtest/world-map-region-outlines.png`. Unreleased. — done 2026-11-18

- [x] Renamed Campaign to World Map, reduced the overview to the clickable full atlas and remembered act/area selection per character in this browser. Updated related navigation/tutorial wording; typecheck, 19 campaign checks and real-browser navigation/restoration checks pass. Unreleased. — done 2026-11-18

- [x] Redistributed the 70-zone Veyrath campaign into seven fuller acts; integrated world/regional markers, new investigation stops, level-appropriate encounters/rewards and gem availability. All 1,780 tests, typecheck and production build pass; fresh/veteran desktop and 390px phone navigation/playtests pass with no console errors. Pacing over the complete journey remains a separate audit. Unreleased. — done 2026-11-18

- [x] Implemented the seven-act Veyrath campaign structure, saved narrative quest interactions, arrow-free world atlas and individual act paintings. Stable zone IDs and earned progress retained, country/region map markers realigned, and combat/save/quest compatibility checks updated. Production build passes; browser acceptance remains open above. Artwork generated with the built-in image tool; source PNGs/prompts under `output/imagegen/`. — done 2026-11-18
- [x] Astrology profession: 14 constellation studies for Stardust, a Star Chart of 5 stars each (profession speed + small combat stat per star), mastery and a shooting-star Focus game. Left out of Skilling tree points, achievements and The Sum of All Things on purpose. — done 2026-11-19 (live in 0.5.4)
- [x] One Inventory screen replaces Equipment, Stash and Crafting Bench; loot goes straight to the inventory (100 + 20 per Stash level), Send to stash and Run filter, full item loot filter. — done 2026-11-19 (unreleased)

- [x] Agility profession: 10 courses, 13 shortcuts (Heist rooms, close-in, four hidden gathering spots). — done 2026-11-19 (live in 0.5.3)
- [x] Thieving Heist and Rogue Crew tabs redone as ledger + dossier; Focus moved onto the running mark/heist card. — done 2026-11-18 (live in 0.5.2)

- [x] Merged Travel Points into Passive Points (2 per level) and set every ordinary tree node to cost 1; Gateways (4), Doomed Gates (5) and Forbidden keystones (15) unchanged. Save migration 48 recounts existing characters without removing allocations. — done 2026-11-18 (live in 0.5.1)

- All profession workspaces implemented, browser-verified on desktop/phone and deployed as 0.4.49 with live login confirmation. — done 2026-11-17

- [x] Created and visually inspected a detailed Veyrath atlas with the main-story settlements, physical road network, mountain research facility, capital/underground containment callout and peripheral places. Saved artwork, exact generation prompt and a working location gazetteer in `docs/VEYRATH-MAP.md`. Artwork only. — done 2026-11-17

- [x] Created and visually inspected the Orvessa continental overview, showing Veyrath and Kroten in a wider nineteenth-century atlas composition. Saved artwork and exact prompt under `output/imagegen/orvessa-continental-overview-v1*`. Labels and Veyrath's silhouette checked; game integration not part of this artwork pass. — done 2026-11-17

- Thieving ledger and parchment dossier implemented and verified on desktop and phone, with existing targets, mastery, Focus and Heist systems connected. — done 2026-11-17 (live in 0.4.49)

- [x] Implemented the 12-rogue roster and three-person tactical crew, Field Mastery and talent progression, mentor training, vault profiles, scouting, Bypass and Greed, plus old-save migration and player/wiki guidance. All 1,763 tests and production build pass; desktop browser verified actual controls and state, no console errors. Screenshot: `output/playtest/rogue-roster.png`. Unreleased. — done 2026-11-17

- [x] Created and integrated the Ashen Codex world-map painting, refined through the owner's annotated art revisions, with general paths across all six campaign regions and readable clickable act labels. Source images/prompts saved under `output/imagegen/`; runtime asset in `src/assets/maps/`. Typecheck, four campaign-map tests and client build pass; visual playtest pending above. — done 2026-11-16

- [x] Produced the grounded world-atlas revision: a dominant connected northern mountain system, broad lowlands, clearer drainage, small settlement plans at estuaries/crossings, quieter mixed coastline, understated islands and lighter paper treatment. Image and full built-in generation prompt saved under `output/imagegen/ashen-codex-world-atlas-1800s-v2*`; artwork only, no release. — done 2026-11-16

- [x] Produced a new distant nineteenth-century world-atlas art draft following the owner's revised direction. Image and full built-in generation prompt saved under `output/imagegen/ashen-codex-world-atlas-1800s-v1*`; no game integration or release. — done 2026-11-16

- [x] Produced the first detailed Drowned Coast act-map artwork, covering the eight Act 1 zone environments in the Ashen Codex atlas style. Image and full generation prompt saved under `output/imagegen/ashen-codex-act-1-drowned-coast-v1*`. Artwork only; game integration pending. — done 2026-11-16

- [x] Set the entire world-map trail overlay (land roads, sailing lanes, outlines and sea destination dots) to 50% opacity as requested. — done 2026-11-16

- [x] Added dotted Sunless Sea sailing lanes from the harbour/coastal approach to destination dots at the Drowned Fleet, Brimstone Isle, Leviathan's Rib and maelstrom. Typecheck, five map-network tests and in-game campaign-complete visual check pass with no console errors. Evidence: `output/playtest/world-map-sailing.jpg`. Unreleased. — done 2026-11-16

- [x] Replaced the world map's continuous itinerary with a connected road network traced from the owner's annotation, using shared fork coordinates and direct pixel interpolation to avoid curves cutting across terrain. Desktop/phone in-game checks and typecheck/five map tests pass. — done 2026-11-16

- [x] Integrated the finished Ashen Codex painting into the campaign world map and aligned the general journey across all six regions, with readable act labels and a separate route overlay. Typecheck, four campaign-map tests and client build pass; visual playtest pending above. No release or version change. — done 2026-11-16

- [x] Applied ten owner-annotated map edits: open plains, forest, fewer western sea rocks, fishing hut, lavish gold district, clearer glacier, bandit hideout, poor village, ominous mine and active lava/vents scorching the forest edge. Saved `output/imagegen/ashen-codex-world-map-v5.png` and full prompt; no game integration or release. — done 2026-11-16

- [x] Revised world-map terrain to remove repetitive zigzag/corrugated ridges and blanket texture, using broader organic hills, open plains, softer marsh transitions and selective hatching while retaining cities and landmarks. Saved `output/imagegen/ashen-codex-world-map-v4.png` and full prompt; no game integration or release. — done 2026-11-16

- [x] Applied six owner-annotated world-map revisions: grand northeastern capital, fuller southeastern city, engineered summit stair and temple, varied central terrain, removal of the marked volcanic island and submerged structure. Saved `output/imagegen/ashen-codex-world-map-v3.png` and full prompt; no game integration or release. — done 2026-11-16

- [x] Revised the Ashen Codex world-map art against the owner's current campaign layout: City of Saints in the southeast, connected terrain, additional campaign landmarks and sparse irregular fields replacing the repetitive farm grid. Route-free image and full prompt saved as `output/imagegen/ashen-codex-world-map-v2*`; no game integration or release. — done 2026-11-16

- [x] Expanded ordinary production mastery batches to materials, plank refining, meals, runes, flasks and gem cuts. Mastery 15: 5× output/costs/XP in 2× time; mastery 90: 50× in 10× time. Shared single-craft mastery rate, safe per-gem cost floors, save/load and live/offline parity verified; existing discounted Alchemy batches and paid Copper Supply runs preserved. Typecheck and all test files verified; visual preview unavailable. — done 2026-11-16

- [x] Moved Copper Supply into Mastery Batches, unlocked by Smelt Copper Bars mastery 15; retained costs, output, duration and XP, and reserved Masterworks for multi-profession crafts. Typecheck and relevant tests pass; browser preview unavailable. — done 2026-11-16

- [x] Generated an Ashen Codex world-map illustration covering all six campaign acts, grounded in the act geography; saved the image and generation prompt under `output/imagegen/` for review. Labels and gameplay markers are left out; no game integration or release. — done 2026-11-16

- [x] Completed skilling overhaul Phase 17 (2026-11-15): The Second Heresy (second Forbidden keystone with latest-first refund on removal, load and profile change), Worldheart (30% less damage taken, once) and The Sum of All Things (uniform 1–200% more damage, multiplied once for hits, ailments, minions and totems; one-Divine rerolls; Seal refused) with full multi-mechanic recipes. Doomed bosses give World Core and Doom Key Fragments; ten fragments forge a chosen Uber Key; Fractured Orb and Doomed Map drought guarantees. Also fixed project-made amulets (Borrowed Tomorrow) equipping into the weapon slot. 1,658 tests, typecheck and build pass; UNIQUES regenerated. Browser playtest not run.

- [x] Merged Phases 15–16 with Phase 17 (2026-11-15): Worldheart reduces a hit once before The Buried Grudge stores prevented damage and before Debt of Stone splits it (deferred ticks are not reduced again); The Sum of All Things multiplies the Grudge shockwave once through the shared damage path; Hands of the Forgotten Choir zeroes sheet DPS before the Sum multiplier.
- [x] Completed skilling overhaul Phase 16: Rune-carved uniques (Hands of the Forgotten Choir, Hollow Circuit). Delivered through crafted-item inscriptions (`hierophant_gloves`/`seraph_gloves` and `diamond_ring` ilvl >= 45) with base escrow and transformation. Verified totem placement (+2 totems at once, +2 maximum capacity), totem damage ownership/scaling, wearer damage/ailment/thorns/shockwave suppression, would-be mana regen conversion to continuous ES recovery with mana regen and natural ES recharge zeroed, negative mana regen preservation, Debt of Stone interaction, loadout swaps, and live/offline parity. 26 tests in `tests/runeUniques.test.ts` passing; UNIQUES regenerated. Local/unreleased; no version bump or shipping. — done 2026-11-15

- [x] Completed skilling overhaul Phase 15: defence and recovery uniques (Borrowed Tomorrow, The Buried Grudge, Witchglass, The Still Heart, Debt of Stone). Delivered complete exclusive routes, verified recovery prohibitions, prevented-block storage and slam shockwave, 100% elemental-to-chaos conversion with elemental ailment prohibitions, persistent flask recovery without stacking, once-mitigated delayed debt damage across combat and town, and unique pairings. Realistic live/offline playtests and 34 new tests passing; UNIQUES regenerated. Local/unreleased; no version bump or shipping. — done 2026-11-15

- [x] Completed skilling overhaul Phase 14: all three exclusive weapon projects, source/collection previews and fixed unique effects. Verified realistic crafted builds in live/offline combat, storage-safe delivery, bleed application/cap/no crits, cold ignite scaling/prohibitions and one-arrow independent return timing; UNIQUES regenerated. Local/unreleased; no version bump or shipping. — done 2026-11-15

- [x] Completed skilling overhaul Phase 13: independent chart manufacture and the exclusive Artisans' Reliquary encounter, clear map/Sextant supplies, protected chart/reliquary components and preserved combat locks/Atlas allocations/trophy exclusivity. Full live/offline victory and noncombat restriction checked. Local/unreleased. — done 2026-11-14

- [x] Completed skilling overhaul Phase 12: independent discovery/site progression, guaranteed fragments and sifting, ordinary resistance shield restoration, duplicate exchanges and later components. Full noncombat restoration and live/offline/reload costs/discoveries verified; factions, standing and merchants preserved. Local/unreleased. — done 2026-11-14

- [x] Completed skilling overhaul Phase 04 Smithing: physical/protection/elemental-resistance/resource rares with two explicit minimum guarantees and one-item safe delivery, advanced bar smelting, protected alloys/frames and Wayfarer's Hammer. Cheap bases/catalysts/equip rules preserved. Full tests, typecheck, realistic melee/bow/caster upgrades, noncombat Hammer/ilvl90 base and cost/storage/old-save checks verified; evidence and Phase05 handoff recorded. Local/unreleased; no package bump, commit, push or deploy. — done 2026-11-14

- [x] Completed skilling overhaul Phase 03 Woodcutting: advanced wood surveys, timber refinement, guaranteed resin stands, protected heartwood progress/refinement and fixed Heartwood Hatchet. Verified noncombat tier access, zero-luck bounds, actual eight-hour live/offline equality, migrated full-bag gathering/refinement, and gathered resin consumed into a higher-item-level Smithing base. Tracking/handoff updated; no final gear assembly, version bump, commit or deployment. — done 2026-11-14

- [x] Completed skilling overhaul Phase 02 Mining: advanced metal ladder, specialized rich/crystal/fossil deposits,100-cycle prospecting, deterministic rotating fossils/protected project fragments, source/use previews and Prospector's Pick. Noncombat entry, actual live/offline8h parity, old60/60bag save and using a mined fossil in an existing rune were verified; tests/typecheck/build and actual tool SQL validation pass. Tracking/handoff updated, later recipes unavailable, no package bump/commit/deployment. — done 2026-11-14

- [x] Completed skilling overhaul Phase 01 shared foundations: all eleven ordinary profession paths open independently, essential Forge/Table alternatives and default Rune Board work without combat, protected projects reserve/refund/deliver safely and save discoveries/work once. Preserved ordinary mastery/Greenhouse/Heist/ownership and old activity state; verified live/offline parity, interrupted/ready/returned/delivered saves, duplicate/manual protection, exhausted inputs/full storage, busy version46 fixtures and actual browser flows. All 1,473 tests and typecheck pass; Phase02 handoff recorded. Local/unreleased, no package bump or shipping. — done 2026-11-13

- [x] Completed skilling overhaul Phase 00: audited current access/stations/navigation/rewards/mastery/manual/offline/save paths and wrote the implementation contract for eleven professions, thirteen uniques, migrations, guaranteed supplies and timing. Resolved the Divine decision through design-pass; source-data/documentation checks passed. Phase01 is next; no gameplay/version/news changes and no shipping. — done 2026-11-13

- [x] Planned the full skilling overhaul across all eleven professions and thirteen unique concepts in nineteen phases, with a fresh-agent starting prompt per phase, an early equipment-path checkpoint and persistent handoff rules. [Build plan](SKILLING_OVERHAUL_PLAN.md); no gameplay or release changes. — done 2026-11-13

- [x] Added three requested pinnacle chase designs to the skilling reference: The Second Heresy, Worldheart and The Sum of All Things. Each has one effect and a multi-mechanic recipe; the amulet has a draft 1–200% more Damage roll and contributions from all major endgame mechanics and professions. Design only. — done 2026-11-12

- [x] Designed and saved ten endgame unique concepts for the skilling overhaul, including the owner's chosen powers, drawbacks and broad profession sources. Exact recipes, tuning and implementation remain open. — done 2026-11-12

- [x] Save the skilling overhaul reference, including agreed direction, proposals for all eleven professions, research links, boundaries and acceptance checks. — done 2026-11-12

- [x] Mobile navigation and health/mana header scroll out of view; campaign-map swipes can continue onto the page. Verified touch scrolling and zone travel at two phone sizes, desktop layout, all 1,453 tests and typecheck. Production build and live version/login checks passed. — done 2026-11-12, live in 0.4.37

- [x] Fixed the missing Maps Gem shop shelf (37 skills and 77 supports); wiki entries now identify Maps instead of Act 7. Full test suite, typecheck and wiki generation pass; browser preview unavailable. — done 2026-11-12, live in 0.4.36

- [x] Released all pending checkout changes as 0.4.35: global level-gated ordinary unique drops, longer levelling with existing character progress preserved, damaged-save loading and Trophy Altar fixes. Retained all live 0.4.34 simulator and earlier game changes. All 1,449 tests and production build passed; live game version, login configuration and simulator API version confirmed. — done 2026-11-12

- [x] Released ordinary unique drops rework: low-weight global pool gated by base item requirements, with achievement rewards and encounter trophies kept exclusive. — done 2026-11-12, live in 0.4.35

- [x] Extended the full character XP curve by 3.4× so the measured 440-hour trip to level 100 becomes roughly 1,500 fighting hours (about 75 days at 20 hours per day), including a real slowdown from levels 1–80 while preserving the 99-halfway rule and existing characters' level/progress. — done 2026-11-10

- [x] Released Live Simulator API 0.4.34 and updated the installed desktop runner. Published engine/catalog/app files and current event settings verified; live version display and saved-loadout restoration checked in the actual Windows app. — done 2026-11-12

- [x] Built the standalone Windows Balance Lab and simulator API. The updated client downloads only the published engine/data, verifies the game and artifacts, and refreshes event settings before runs. Release verification remains tracked above. — done 2026-11-12

- [x] Chained bosses made idle-friendly: every skill and minion auto-targets martyrs, and martyrs take all damage (ailments, ground, novas). — done 2026-11-11, live in 0.4.33 on 2026-11-11
- [x] Passive tree route planning with Confirm / Cancel. — done 2026-11-11
- [x] Mobile follow-up: removed the current activity strip, bounded every tree at its outer nodes, and passes vertical dragging beyond a tree edge into page scrolling. — done 2026-11-10

- [x] Player report: clicking a passive tree node did nothing since 0.4.30. The canvas took hold of the pointer on press, so the click never reached the node; it now takes hold only once a drag starts. Checked in the browser with a mouse (click, allocate, drag from a node); not checked on a real phone. The type check now uses the ES2022 library (`tsconfig.json`), since tests and sims call `.at()` and a fresh copy would not build. — done 2026-11-11, live in 0.4.31
- [x] Player report: on phones, the game stays within the viewport so the navigation remains at the top while the page and passive tree scroll in their own panel. — done 2026-11-10

- [x] Player reports: executions now keep twin bosses' shared Life synchronized; Exerted bonuses apply only to the player skill that spent the charges; and Soul Tether respects protected bosses. — done 2026-11-10

- [x] Player report: The Crownless no longer runs its Cracked Fault and Choir mechanics twice per tick; Faults stay open for 6 seconds, and the Choir starts only at 66% life. — done 2026-11-10

- [x] Player reports: an unreadable old character no longer stops a signed-in account opening while pending handovers run; Trophy Altar level 4 now grants its stated 10% extra Map-Boss item drop chance and 10% rare Map-item high-tier modifier-roll chance, rather than Item Rarity. — done 2026-11-10

- [x] Built layered Quartermaster loot filters with level-scaled presets, category overrides, ordered conditions/actions, stash and ground highlights, safe share codes, time-away handling and old-save migration. Released in 0.4.24. — done 2026-11-09

- [x] Achievements expanded from 43 to 129 per-character achievements with play-changing rewards: Passive and Atlas points, realm stash tabs, offline hours, permanent bonuses and six new achievement-only uniques. Old saves migrate (save version 43) and get what they already meet on load. — done 2026-11-09

- [x] Mini-game rework: a gold double zone on every life-skill mini-game and Heist, horizontal Alchemy, easier Foraging and Gemcutting; Crafting Bench recipes need only the Bench level. — done 2026-11-09

- [x] Events calendar: holidays (incl. Easter and Thanksgiving) worked out in code and switched on by themselves, Admin holiday switches, weekend events, bonuses that add when events overlap, and a Hideout Events card with on now / coming up. Checked in headless Chromium at phone and desktop sizes. — done 2026-11-09

- [x] Replaced life-skill mastery bands with one 120-hour track per action, recipe and Heist job (bulk recipes share their single version), raised max bonuses to 20% speed and 15% ordinary yield/conservation, and migrated old band progress without lowering any task's old mastery percentage. — done 2026-11-09

- [x] Spread the seven major offensive families across distant passive-tree regions while preserving class starts, every authored cluster, cluster shapes and total node counts; added a concentration regression test. Released in 0.4.21. — done 2026-11-08

- [x] Reduced level-up Passive Points from 3 to 1 while retaining 2 Travel Points, preserving existing allocations and recounting only surplus unspent points for existing characters. Released in 0.4.21. — done 2026-11-08

- [x] Added a persistent passive-node preview with separate Allocate and Refund confirmation buttons, so touchscreens can inspect safely and desktop players can compare choices before committing. Released in 0.4.21. — done 2026-11-08

- [x] Made every Doomed Gate penalty harsher and substantially strengthened all twelve reward wheels behind them, including a minimum 35% more multiplier on each wheel's landmark notable. Tests cover all six penalties and the reward floor. Released in 0.4.20. — done 2026-11-08

- [x] Recalculated character-tree level awards against the compact graph and changed the split from 3 Travel / 2 Passive to 2 Travel / 3 Passive, preserving five ordinary points per level. Existing saves recount both pools without losing allocations. Released in 0.4.20. — done 2026-11-08

- [x] Replaced the copied passive-tree starting area with six general-purpose class-tailored sets; Mage Mana regeneration is now in its first wheel and Life regeneration is outside its starting package. Focused tree/notable tests pass. Released in 0.4.20. — done 2026-11-08

- [x] Passive tree handcrafted rebuild: fixed-coordinate layout file, Borderland Roads and bridging clusters on every class border, two ring roads, clean cluster shapes; all cluster/notable/keystone ids and stats kept; broken allocations refunded on load. Tests and build pass; not yet checked in a browser. Unreleased. — done 2026-11-08
- [x] Save-rollback fixes: a failed browser save no longer skips the cloud save, and a stale device can no longer overwrite newer cloud progress, whatever its clock says. Unreleased. — done 2026-11-08
- [x] Owner service checks confirmed: OAuth secret revoked, admin SQL applied, signed-in checks and Admin page verified. — done 2026-11-08
- [x] Removed 19 old worktrees in `.claude/worktrees`; their uncommitted changes are kept as local commits on their branches (see Ideas / later). — done 2026-11-08

- [x] Split the character passive tree into Travel, Passive, and Mastery point economies, including tiered allocation/refund costs, PoE-style mastery prerequisites and uniqueness, Act-boss awards, and Cosmic Gateway bridge activation. — done 2026-11-07

- [x] Massive unique items, flasks, and maps pass implemented: reworked existing stat-stick uniques (`barnacle_band`, `khans_tithe` bank-gold crit scaling, `pyre_heart` slow-burn spreading ignites, `starforged_edge` physical shock & no elemental damage, `unblinking_tome` burning spell flare & cannot evade, `fishermans_knot` utility flask pull/snare & `enemyRanged`/`packStart` Instilling conditions, `the_unwritten` off-class Ascendancy notable rolling & Divine Orb rerolling, `architects_compass` every 4th spell double repeat at 0 mana, `sovereigns_grasp` extra Chaos vs Ailing & Wither, `faultline` Slam armour crack & 30% physical mitigation bypass, plus enhanced boss/act-cycle uniques); added 12 Ascendancy BIS uniques, 22 Life-Skill uniques (2 per profession integrated with `skillTreeStats`), a 6-piece Master Artisan set, a 6-piece Wanderer's Heirloom leveling set (reqLevel 1), 3 Gold-Find uniques (`gulls_eye`, `merchants_signet`, `greeds_vault`), 5 Unique Flasks (`u_flask_karui`, `u_flask_lavianga`, `u_flask_lions_roar`, `u_flask_bottled_faith`, `u_flask_dying_sun`), and 5 Unique Maps (`umap_vaults`, `umap_cowards_trial`, `umap_olmecs`, `umap_maelstrom`, `umap_grandmasters`) in the Map Case and Map Device; `docs/UNIQUES.md` regenerated and unit tests verified. — done 2026-11-07
- [x] Non-combat action mastery implemented: 67 stable character-owned work bands, nominal-duration practice to level 100, bounded speed/ordinary-yield/input-conservation bonuses, shared live/offline/Greenhouse/Heist completion hooks, save migration, offline summary and compact action-card UI. Protected rare/chase resources and all existing access rules remain unchanged; 1,261 tests and typecheck pass. — done 2026-11-07
- [x] Unique items overhaul implemented: campaign unique drop pools scaled by zone depth, starting with exactly 1 unique (`castaways_kerchief`) in the Mud Flats; class-specific trait uniques (Rage, Malice, Fervor, Riposte, Momentum, Mana is Power) moved to mid-to-late campaign zones and maps; flat numerical modifiers feature roll ranges that can be rerolled using Divine Orbs (with items having only fixed mods blocked from Divine use); `last_breath` adds 1–4 extra Malice per hit; thematic downsides added to select powerful uniques (`bloodthirst`, `emberheart`, `alchemists_band`, `tavern_brawler`, `starforged_edge`, `titans_girth`, `stormhide`, `thornquill`, `wellspring`, `rebuttal`, `ninth_psalm`, `oathbreaker`, etc.); Alt inspection shows roll ranges; PostgreSQL market validator updated for unique roll ranges; `docs/UNIQUES.md` regenerated; unit and security tests pass. — done 2026-11-06
- [x] Skilling-tree specialisation pass: cap the tree at 36 points earned per ten total life-skill levels, replace the unusable Fishing branch with Gemcutting, refund existing allocations safely, apply life-skill speed events to Heists and Overtime to offline Greenhouse growth, and cover the new invariants with focused tests. — done 2026-11-06
- [x] Non-combat band-mastery design documented in this roadmap: bonus-only, no mastery-gated content, no more than 100 explicitly authored bands, proposed practice curve and modest automatic rewards, exclusions, offline/save/UI behavior and implementation acceptance criteria. This records the 2026-11-06 design milestone; implementation followed on 2026-11-07. — done 2026-11-06
- [x] Maps redesign implemented (Milestone 8): plain shared maps T1–T10 (`s.account.maps` synced with `s.maps.stock`, migrating legacy themed maps by tier) borrowing random campaign area visuals and boss mechanics; Act 6 level 60+ campaign map drops and Last King 5-map top-up; permanent tier-group danger and reward identities (T3–4 elite packs, T5–6 twin boss with shared Life, T7–8 boss ground hazards, T9 permanent enrage, T10 pinnacle combining all three, plus tier-specific unique pools and currency emphasis); Apprentice/Journeyman/Master Sextants with up to 4 Astrolabe slots and 6-charge Danger/Reward/Both/Hunting modifiers; realm-shared 100-node connected Atlas Tree with up to 70 allocated points across Sustain, Bounty, Surveying and Peril wings, including Unbroken Path and Doomed Horizon keystones; Doomed Maps I–V (levels 86–94, 7 Doomed modifiers, Fractured Orb and Uber Key drops); Cartography T1–T10 map and Sextant recipes; and a dedicated Map Device page (`src/ui/pages/MapDevicePage.tsx`). Atlas and Maps tests pass; `docs/UNIQUES.md` regenerated. Unreleased. — done 2026-11-06
- [x] Fractured items and Fractured Orbs implemented (Milestone 10A): Fractured Orbs lock one random modifier permanently on rare items with 4+ modifiers; scoured fractured items reduce to a 1-mod Magic item retaining the fractured affix; Annulment cannot remove fractured modifiers; Chaos and Alteration rerolls preserve fractured modifiers; Ancient Whetstones cannot hone fractured modifiers; Locksmith's Wax snapshots and restores fractured status; golden styling in tooltips and Bench page integration. All 9 focused fractured crafting tests pass. — done 2026-11-06
- [x] Bench Level 6 and meta-crafting implemented (Milestone 10B): Bench station Level 6 upgrade added with meta-crafting perks; "Prefixes Cannot Be Changed" (suffix craft, 2 Divine + 500 Arcane Dust), "Suffixes Cannot Be Changed" (prefix craft, 2 Divine + 500 Arcane Dust), and "Multicraft" (suffix craft, 2 Exalted + 400 Arcane Dust); Scour, Chaos, Annul, Divine, and Alteration operations preserve locked affix pools; Multicraft allows up to 3 crafted modifiers; "Remove crafted" action (1 Scour) strips all crafted modifiers; Forger's Seal auto-crafting support (sealed parameter in CraftMethod); all unit tests pass. — done 2026-11-06
- [x] Post-campaign station expansions and Stash affinities implemented (Milestone 10C): Map Device Level 5 (+50% Rarity, +2 ilvl, 4th Sextant slot) and Level 6 (Pinnacle Conduit: +2 base Sextant charges, +15% map/key boss bonus); Stash Level 5 (Dedicated Map Storage Tab) and Level 6 (+2 free pages, 8 total); Forge Level 5 (Pinnacle Metallurgy: ilvl 84 cap, +8 ilvl bonus, 10% T1 affix roll); Alchemy Table Level 5 (30% double brew chance, 3:1 orb conversions); Watchtower Level 5 (Autonomous Offline Mapping, 36h cap); Trophy Altar station (Levels 1–4, account-wide Armour/Evasion, Mana regen, all Res, and item Rarity); baseline Act 1 Stash Affinities routing maps, gear, flasks, gems, and currency to designated tabs. — done 2026-11-06
- [x] Pinnacle crafting, Uber Bosses, and Doom Sigils implemented (Milestone 10D): The First Exile (L90, Crucible) dropping Exile's Doom Sigil (elevates 1 random Tier 1 affix to Tier 0 Doom tier with +30% values); The Architect of Ruin (L93, Ruined Sanctum) dropping Architect's Doom Sigil (imbues 1 Doom Implicit); The Void Sovereign (L96, Void Throne) dropping Void Sigil (unlocks 7th modifier slot on 6-mod rare items); Bench Level 7 Pinnacle Crafts ("Cannot roll Attack Modifiers", "Cannot roll Caster Modifiers"); full lock and impression preservation. All 45 focused crafting, hideout, and pinnacle tests pass. — done 2026-11-06

- [x] Owner confirmed market/admin SQL applied to Supabase; anonymous requests are denied for new Admin overview/player/feedback functions and backup/mail/audit tables. Frontend remains unreleased; signed-in checks and current rules upload remain pending. — done 2026-11-06
- [x] Admin overhaul implemented: normalized class counts/contiguous levels, campaign funnel/death/demo diagnostics, paginated search including retained deleted characters, server receipt timestamps, raw save inspection, ten restore points and audited idempotent recovery to new characters; feedback snapshots with verified account links, version/type filters and bulk resolve; private replies/compensation inbox (including no-trade Unique replacements); temporary memory-only sandbox; custom modifier events, broadcasts/status/countdowns and offline schedule boundaries. All 88 focused Admin/event/market checks and mocked desktop/mobile browser flows pass; Vite production bundle and wiki generation pass. Full suite: 1,180 pass / eight known failures from other work; typecheck retains only the existing `Derived.moveSpeed` test error. SQL is prepared, not applied live; unreleased. — done 2026-11-06
- [x] Public repository security pass: GitHub scanning/push protection enabled; local default scan augmented to detect the confirmed historical Google OAuth secret; working-tree and available Actions-log scans found no additional secrets. Market rejects null/invalid payments and duplicate local holds, limits successful paid operations, explicitly restricts database grants and pins privileged lookup paths. Vite rejects unreviewed/privileged browser configuration. All 67 focused security/market tests pass; full suite 1,152 pass / eight existing failures; typecheck retains only the existing `Derived.moveSpeed` test error. Live anonymous probes expose no private rows. Offline trading preserved; secret revocation, SQL application and signed-in live checks remain pending. Unreleased. — done 2026-11-05
- [x] Area XP now stays neutral within two levels, rewards harder enemies up to +20% and penalizes easier enemies no further than −70%. The penalty was refined to a rounded quadratic curve, with increasingly harsh losses from three to ten levels. Updated player labels, farming guide and bounded wiki calculator sampling/fallback so capped XP cannot hang generation or become zero in the calculator. Four band/label tests and 50 engine/Act 1 tests pass; wiki generation and calculator syntax pass. Unreleased. — done 2026-11-05
- [x] Monster identities implemented across campaign and Maps: creature profiles, Armour/Evasion/block, Life/ES, elemental/chaos attacks, crits, ailments and varied basic attack intervals. Reference EHP and raw DPS conservation cover every monster, boss, packed copy and combined rarity modifiers. Eleven profile tests and campaign/Maps/offline checks pass; wiki generated. Full suite: 1,140 pass, eight pre-existing failures (Act 2 gem gating/shop, Deathblow timing, Act 5 channel comparison, Primal Roar cooldown metadata, Void Pact hit tag, Mark expiry and gem counts). Typecheck still fails at the pre-existing `tests/mechanics.test.ts:57` movement-stat assertion. Skill-isolation dummies explicitly omit defences; Frostbite integration compares freeze rate per exposure and aggregate survival. Unreleased. — done 2026-11-05
- [x] Documentation consolidated into GAME, DEVELOPMENT, MILESTONES, SETUP and generated UNIQUES; stale act/pacing/preview claims removed, future specifications/provenance retained, player-wiki factual errors corrected and remaining guide gaps recorded. Internal links and wiki generation pass; art/unique checks pass. Full typecheck remains blocked by the pre-existing `Derived.moveSpeed` test error. Unreleased. — done 2026-11-05
- [x] Default flask automation removed locally; unenchanted flasks require manual use and automatic use requires Instilling. Relevant tests pass; unreleased. — done 2026-11-05
- [x] 0.4.2 Smarter Foundations live: baseline survival rules, refined-component station costs, recent-spending Mana, Momentum losses/Evasion, Field Tinkering, postures, Mana reservation and UI scaling. — done 2026-11-05
- [x] Doc/balance audit fixes: flat Momentum keeping (1 stack per source, min 1; old uniques safe), Mana is Power unique text corrected, Doom 4s decay grace, warcries weight rarer enemies/bosses (1/2/3/5), Brand of Ruin cost typo, The Old Covenant source noted in GAME. New tests pass; UNIQUES regenerated. Full suite still shows the same eight pre-existing failures and `moveSpeed` typecheck error. Unreleased. — done 2026-11-06
- [x] 0.4.1 gem attribute requirements relaxed; 0.4.0 character and ascendancy trees rebuilt, compact travel, four trials and no milestone-specific node locks. — done 2026-11-04
- [x] Six acts and branching roads, themed T1–T10 Maps, side skills, runes, meals, loadouts, challenge modes, Player Market, account stash and generated wiki implemented. Earlier release-by-release detail lives in NEWS/git, not a second changelog.

## Retained Maps skill design

This section preserves the unreleased batch's detailed design while eliminating its standalone document. Read the status/corrections above before implementation.



**Design pass: 2026-11-04.** 40 skill gems + 40 support gems, all unlocking when Maps open (after Act 6 clear). Five
new mechanics, each with 8 skills and 5 dedicated supports, plus 15 general supports. 15 of the 40 skills deal
chaos damage.

**Chaos damage rules (new):** bypasses energy shield (hits life directly), resisted by chaos resistance, has a
chance to poison on hit. These properties require engine work: combat.ts must skip ES when the hit's type is `chaos`,
and the poison chance must hook into the ailment system.

**Gem levels:** 66 / 70 / 74 / 78, four tiers. Demanding gems use the current 1.15× attribute multiplier; the original 1.3× proposal is retired.

**GEM_ACTS key:** `'maps'` — gate is any Map zone open (`mapOpen(s)` or similar; check `s.maps` stash).

---

### Group 1: Marks

A Mark is attached to one target by a Mark skill. All subsequent hits on that target add 1 Mark stack regardless of
skill used (max 5). When stacks hit 5, the Mark detonates automatically for the Mark's specific burst effect and
clears. Mark duration: 6s, refreshed on each stack. A target holds one Mark at a time; applying a new one replaces the
old regardless of its stacks.

New mechanic needed:
- `markKind` on `ActiveGemDef.effect` — the type of mark applied. Using such a skill sets `s.combat.monsters[i].mark`.
- Each hit on a marked monster increments `mark.stacks`; at `mark.maxStacks` (default 5) the detonation fires.
- Detonation is handled in `combat.ts` using the Mark's stored burst parameters.

| Skill | Attr | Role | Lvl | Chaos? | Does | Signature (+6) |
|---|---|---|---|---|---|---|
| **Brand of Ruin** | int | main | 66 | ✓ | 15 mana · 0CD · 3000ms · apply Brand of Ruin mark (5 stacks, bursts for 80–120 chaos, poisons) | **Corrosion:** burst strips 20% chaos resistance for 4s |
| **Scorched Brand** | int | burst | 68 | | 18 mana · 4s CD · 3000ms · apply Scorched Brand (5 stacks, bursts for 100–150 fire in radius 1) | **Flash Point:** burst ignites for 5s |
| **Sunder Mark** | str | main | 66 | | 16 mana · 0CD · 3600ms · 160% weapon + apply Sunder Mark (5 stacks, bursts for 200% weapon to all neighbours) | **Exposed:** burst breaks armour |
| **Void Brand** | int | area | 70 | ✓ | 24 mana · 5s CD · 2400ms · apply Void Brand (5 stacks, bursts for 60–90 chaos to all enemies) | **Nihil:** targets hit have −15% chaos res for 6s |
| **Fracture** | dex | main | 66 | | 8 mana · 0CD · 2400ms · 100% weapon + apply Fracture Mark (5 stacks, bursts for 80% to all in radius 1) | **Shatter:** burst stuns all hit for 1s |
| **Marked for Death** | dex | curse | 68 | | 12 mana · 10s CD · 1500ms · curse; enemies take 25% more damage from all sources and Marks on them burst at 4 stacks | **Execute:** marked+cursed enemies burst at 3 stacks |
| **Shadow Mark** | dex | main | 70 | ✓ | 10 mana · 0CD · 2700ms · 90% weapon, converts 50% to chaos + apply Shadow Mark (5 stacks, bursts for 40–60 chaos, poisons) | **Venom Brand:** burst poison lasts 4s longer |
| **Martyrdom Brand** | str | guard | 74 | | 15 mana · 10s CD · 1500ms · shield of 35% life for 5s; every hit you receive adds 1 stack to attacker's Mark; at 5 stacks the shield retaliates for 300% the damage absorbed | **Payback:** retaliation hits the whole pack |

---

### Group 2: Warcries

Warcries have a proposed 1500ms cast time, cost 0 mana, have their own cooldown (5–10s), and
empower the caster based on the number of enemies in combat. No new engine mechanic: "enemies in combat" is
`s.combat.monsters.filter(m => m.life > 0).length`, readable at cast time. Effects go into the existing buff system.

No new engine type needed beyond reading enemy count at cast. The `warcryPower` = clamped enemy count (1–5 or 1–8
depending on the skill). Implemented as a weighted count (`WARCRY_WEIGHT` in `combat.ts`): normal 1, magic 2, rare 3,
unique/boss 5, so a lone boss still fills most of a warcry.

| Skill | Attr | Role | Lvl | Chaos? | Does | Signature (+6) |
|---|---|---|---|---|---|---|
| **Battle Cry** | str | buff | 66 | | 0 mana · 6s CD · 1500ms · 4s buff: 25% more damage per nearby enemy (max 5 enemies = +125% more) | **War Drum:** also grants 8 Rage per enemy nearby |
| **Rallying Cry** | str | sustain | 68 | | 0 mana · 8s CD · 1500ms · recover 5% life per nearby enemy (up to 5 = 25% life instantly) | **Second Wind:** also recovers 10% mana per enemy |
| **Hunter's Call** | dex | buff | 66 | | 0 mana · 5s CD · 1500ms · 4s buff: 8% attack speed per nearby enemy, max 5 (max +40%), grants Momentum equal to enemies nearby | **Pack Rush:** also grants 20% increased evasion |
| **Intimidate** | str | curse | 70 | | 0 mana · 8s CD · 1500ms · for 6s, all combat enemies take 15% more damage and have 10% less attack speed | **Dread Shout:** effect scales: +3% more damage per enemy in combat |
| **Ancestral Call** | str | summon | 72 | | 0 mana · 10s CD · 1500ms · summon 1 Ancestor spirit per 2 enemies nearby (max 3) for 8s; each deals 50% of your weapon damage | **Forebears:** Ancestors also deal 20% of their damage as fire |
| **Dark Howl** | int | buff | 70 | ✓ | 0 mana · 8s CD · 1500ms · for 6s: spells have a 15% chance per nearby enemy (max 5×15%=75%) to deal their damage as chaos instead (bypasses ES, same total damage) | **Void Voice:** chance to poison when chaos conversion triggers |
| **Death Rattle** | dex | area | 74 | | 0 mana · 6s CD · 1500ms · for 4s, your next kill causes the corpse to explode for 20% of its max life as physical to all; scales with enemies nearby (×enemy count, max 5×) | **Carnage:** the explosion chains once to the nearest enemy |
| **Primal Roar** | str | area | 74 | | 0 mana · 10s CD · 1500ms · deal 100% weapon damage to all enemies and stun them for 0.5s per enemy nearby (max 2.5s), gives 10 Stagger on bosses | **Primal Force:** stun also applies −20% damage for its duration |

---

### Group 3: Totems

A Totem is placed at the player's position (front ring of the battlefield), fights autonomously with its own attack,
has its own life pool, and lasts 20s or until destroyed. One totem active at a time by default. Auto-rule: "When totem
count is below 1, place it" (similar to minions).

New engine needs:
- Totems live in a `s.combat.totems[]` array (like `s.combat.minions[]`).
- Each has `life`, `maxLife`, `gemId`, `attackMs`, and fires its own attack tick.
- Totem attacks use the player's spell/attack damage stats scaled by a `totemEfficiency` multiplier (0.6 by default).
- When a Totem dies, `s.combat.totems` shrinks; the bot places a new one when rules allow.
- `totemCount` rule condition for automation.

| Skill | Attr | Role | Lvl | Chaos? | Does | Signature (+6) |
|---|---|---|---|---|---|---|
| **Flame Totem** | int | summon | 66 | | 15 mana · 12s CD · 1500ms · place Flame Totem (20s, fires 12–18 fire every 1.5s at nearest enemy) | **Pyre Totem:** totem also causes burning ground, 2 fire/s to all enemies |
| **Ice Totem** | int | summon | 68 | | 15 mana · 12s CD · 1500ms · place Ice Totem (20s, fires 10–16 cold at 1.5s, chills) | **Blizzard Totem:** on death or expiry, explodes for 60–90 cold in radius 2 |
| **Storm Totem** | int | summon | 70 | | 15 mana · 12s CD · 1500ms · place Storm Totem (20s, calls 6–24 lightning to random enemy every 1s, chains once) | **Tempest Totem:** chain hits a second enemy for 50% |
| **War Totem** | str | summon | 68 | | 18 mana · 12s CD · 1500ms · place War Totem (20s, attacks for 100% physical at 2.5s, single) | **Battle Totem:** each kill by this totem grants you 1 Rage |
| **Shadow Totem** | dex | summon | 70 | | 15 mana · 12s CD · 1500ms · place Shadow Totem (20s, attacks for 70% at 1.8s, alternates between nearest two enemies, poisons each hit) | **Venom Totem:** poison stacks twice as fast (applies 2 poison on each hit) |
| **Siege Totem** | str | summon | 72 | | 20 mana · 15s CD · 1500ms · place Siege Totem (25s, fires for 160% physical at 4s, 50% stun, hits in a line through the target) | **Long Siege:** line extends one more ring, hits one additional enemy |
| **Chaos Totem** | int | summon | 74 | ✓ | 18 mana · 12s CD · 1500ms · place Chaos Totem (20s, fires 10–18 chaos at 1.5s, 20% poison chance; totem attacks bypass ES) | **Corruptor:** totem applies −15% chaos resistance to enemies it hits for 4s |
| **Void Totem** | int | summon | 76 | ✓ | 22 mana · 12s CD · 1500ms · place Void Totem (20s, fires 15–25 chaos at 2s, 30% poison chance; on each attack has 20% chance to drain 5% life from target as chaos and restore it to you) | **Soul Siphon:** drain chance rises to 40%, restores mana too |

---

### Group 4: Doom

Doom is a stacking debuff on each enemy. Every hit adds 1 Doom (max 20). When Doom reaches 20, it detonates
automatically, dealing a large chaos burst and clearing the meter. Doom holds for 4 seconds after a Doom hit, then decays at 1 per second when not receiving
new hits from the player. Specific Doom skills add more Doom per hit or read the meter for scaled damage.

New engine needs:
- `doom` counter on each `CombatMonster` (0–20).
- Every hit increments `doom` by 1 (or by the skill's `doomPerHit` override).
- At 20: fire a doom burst (chaos damage, bypasses ES, based on `DOOM_BURST_BASE` scaling with monster level).
- Decay: Doom holds for 4 seconds after the last Doom hit (`DOOM_GRACE_MS`), then `doom -= 1` each second. The grace lets 2.4–3.6s casts like Entropy and Doom Bolt build to 20 on one target.
- `doomLevel` rule condition (e.g. "when doom above 10").

| Skill | Attr | Role | Lvl | Chaos? | Does | Signature (+6) |
|---|---|---|---|---|---|---|
| **Doom Bolt** | int | main | 66 | ✓ | 15 mana · 0CD · 3000ms · 20–35 chaos, single; adds 2 Doom (double rate) | **Accelerant:** target with 10+ Doom takes 20% more from this skill |
| **Void Blast** | int | area | 70 | ✓ | 28 mana · 5s CD · 2400ms · 50–80 chaos, all enemies; adds 3 Doom to all | **Cascade:** if any target had max Doom, its burst propagates 2 Doom to all neighbours |
| **Doom Strike** | str | main | 68 | ✓ | 10 mana · 0CD · 3600ms · 150% weapon, 50% converted to chaos; adds 2 Doom | **Cursed Blow:** physical portion also adds 1 Doom |
| **Entropy** | int | main | 66 | ✓ | 12 mana · 0CD · 2400ms · 15–25 chaos, single; adds 1 Doom. Fast spam skill | **Accelerate:** Doom decays 50% slower while this is on the bar |
| **Doomsday** | int | burst | 76 | ✓ | 40 mana · 10s CD · 3000ms · instantly triggers Doom burst on current target regardless of meter level; burst is 50% more powerful per 5 Doom the target had | **Last Rites:** enemies above 15 Doom receive 150% more from the burst |
| **Cursed Arrow** | dex | main | 68 | ✓ | 8 mana · 0CD · 2700ms · 90% bow attack, 40% converted to chaos; adds 2 Doom; 20% poison chance | **Marked Arrow:** at 10+ Doom, the hit poisons for double duration |
| **Shadow Pact** | dex | buff | 72 | | 15 mana · 10s CD · 1500ms · for 6s: you gain 2% more damage for each point of Doom on current target (max 40%) | **Dark Communion:** also gain 1% chaos resistance per Doom point for the duration |
| **Void Pact** | int | sustain | 74 | ✓ | 0 mana · 12s CD · 1500ms · consume all Doom on current target; heal 2% life per point consumed; if target had max Doom, also recover 20% mana | **Leech Dark:** also gain 1% ES recharge per Doom consumed |

---

### Group 5: Exertion

Exertion is a player-side charge counter (0–5). Every hit the player lands adds 1 Exertion. At 5 stacks, the
character is Exerted. The next time you use an Exertion-tagged skill while Exerted, it fires its powered version
and clears the stacks. Exertion decays at 1 per second when out of combat.

New engine needs:
- `s.combat.exertion` counter (0–5), cleared out of combat.
- Every hit increments it by 1 (or by skill's `exertionPerHit` override).
- Exertion skills check `s.combat.exertion >= 5` and branch to their powered version.
- `exertionFull` rule condition for automation (like `maliceFull`).
- Exerted skills reset `s.combat.exertion = 0` on use.

| Skill | Attr | Role | Lvl | Chaos? | Does | Signature (+6) |
|---|---|---|---|---|---|---|
| **Gut Punch** | str | main | 66 | | 8 mana · 0CD · 2700ms · 110% weapon, single; adds 2 Exertion. Exerted: 200% weapon + hits nearest other enemy for 50% | **Follow-Through:** exerted hit also stuns the second target for 1s |
| **Quickdraw** | dex | burst | 68 | | 12 mana · 5s CD · 2400ms · 200% bow/projectile. Exerted: 350%, guaranteed crit | **Hair Trigger:** any crit resets Exertion to 0 and immediately counts it as 5 again (ready instantly) |
| **Charged Strike** | str | main | 70 | | 10 mana · 0CD · 3300ms · 130% physical, 25% stun. Exerted: also stuns all nearby enemies for 1s, 10 Stagger | **Overexertion:** exerted version carries 2 stacks over (resets to 2, not 0) |
| **Void Surge** | int | main | 70 | ✓ | 18 mana · 0CD · 3000ms · 20–30 chaos, single; bypasses ES. Exerted: 150% more chaos damage + poisons | **Dark Surge:** exerted Void Surge also fires at the nearest second enemy for 50% |
| **Rend** | dex | main | 68 | | 8 mana · 0CD · 2400ms · 90% weapon, bleeds; adds 1 Exertion. Exerted: bleed lasts 3× longer and spreads to all enemies | **Hemorrhage:** exerted Rend also applies a fresh bleed to all nearby |
| **Void Wave** | int | area | 72 | ✓ | 16 mana · 3s CD · 3000ms · 20–30 chaos, all enemies. Exerted: fires twice in immediate succession | **Chain Doom:** exerted hits add 2 Doom to all enemies hit |
| **Soul Rip** | int | burst | 74 | ✓ | 22 mana · 5s CD · 2400ms · 30–45 chaos, single; bypasses ES. Exerted: fires at 3 targets for the same damage | **Soul Drain:** exerted Soul Rip heals 8% life |
| **Deathblow** | str | main | 72 | | 15 mana · 0CD · 4200ms · 220% physical, single. Exerted: 400% weapon + always crits | **Executioner:** kills with exerted Deathblow instantly grant 5 Exertion (ready again) |

---

### Support gems (40)

#### Mark supports (5)

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Rapid Marks** | 66 | mark | Marks burst at 4 stacks instead of 5; apply rate is 30% faster |
| **Volatile Marks** | 68 | mark | Mark bursts deal 60% more damage; burst triggers when the target dies rather than at max stacks (you can still reach max for instant burst) |
| **Spreading Brand** | 70 | mark | When a Mark bursts, the nearest unmarked enemy inherits 2 stacks of the same Mark |
| **Persistent Mark** | 68 | mark | Mark duration is 4s longer; stacks do not decay until the mark fully expires |
| **Cursed Brand** | 72 | mark | Marked targets take 10% more damage from all sources; applying a Mark applies a 2s elemental weakness too |

#### Warcry supports (5)

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Powerful Voice** | 66 | warcry | Warcry effects count twice as many enemies (effectively doubled for scaling) |
| **War Drummer** | 68 | warcry | Warcry cooldowns reduced by 30% |
| **Lingering Shout** | 70 | warcry | Warcry empowerment buffs last 3s longer |
| **Rally the Fallen** | 68 | warcry | Healing warcries also grant 1% life per corpse in the arena (up to 10%) |
| **Resounding Cry** | 72 | warcry | Warcry empowerment also applies to Totems if one is active |

#### Totem supports (5)

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Twin Totems** | 68 | totem | You can have 2 totems active simultaneously; each deals 25% less damage |
| **Totem Fortify** | 70 | totem | Totem has 100% more life and lasts 10s longer |
| **Ancestral Bond** | 68 | totem | While a totem is active you deal 20% more damage |
| **Totem Vanguard** | 72 | totem | Totem taunts enemies for the first 4s of its life (enemies target it first) |
| **Cascading Totems** | 74 | totem | When a totem dies, it immediately summons a replacement at half life for free |

#### Doom supports (5)

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Doom Accelerant** | 66 | doom | Hits add 2 Doom instead of 1; Doom decays 50% slower |
| **Mass Doom** | 70 | doom | Hits add 1 Doom to all enemies in combat (not just the target) |
| **Doom Echo** | 68 | doom | When a Doom burst triggers, it deals 30% of its damage to all other enemies |
| **Endless Dread** | 74 | doom | Doom maximum raised to 30; burst is 50% more powerful per extra point above 20 |
| **Void Hunger** | 72 | doom | Doom bursts have a 30% chance not to clear the meter (keeps stacks, can burst again) |

#### Exertion supports (5)

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Hasty Exertion** | 66 | exertion | Hits add 2 Exertion instead of 1 |
| **Overexertion** | 70 | exertion | Exerted version deals 50% more; Exertion resets to 2 (not 0) so you stay semi-ready |
| **Cascading Force** | 68 | exertion | Exerted kills give 2 Exertion instantly (can chain into another exerted use quickly) |
| **Exerted Momentum** | 72 | exertion | Exerted uses grant 3 Momentum and 2 Rage |
| **Violent Release** | 74 | exertion | Exerted uses also deal 50% of their damage to all other enemies |

#### General supports (15, includes rule-benders)

**Rule-bending (5):**

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Chaos Infusion** | 66 | any damage skill | 40% of this skill's damage is dealt as chaos (bypasses ES); 60% remains as the original type. Total damage unchanged |
| **Opportunism** | 68 | any hit, not heavy/totem | Changes the trigger: fires when YOU are hit instead of on its rule; 2s internal cooldown |
| **Chain Reaction** | 70 | any hit, not heavy/totem | On kill, fires once more immediately for free |
| **Blind Fury** | 70 | any attack or spell | Skill fires 50% faster but only while you are below 50% life (cooldown and attack time both reduced) |
| **Void Touch** | 72 | any spell | While mana is above 80%, converts the spell to chaos damage (bypasses ES, 15% poison chance); below 80% it fires as normal |

**Amplifiers (10):**

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Chaos Mastery** | 66 | any chaos skill | 40% more chaos damage |
| **Vile Efficiency** | 68 | any chaos skill | Chaos skills cost 20% less mana; 15% chance to poison on hit |
| **Elemental Confluence** | 70 | any spell or elemental attack | If the hit deals fire, cold, and lightning, each is 15% stronger |
| **Cruel Intent** | 70 | any hit | 35% more damage against enemies below 30% life |
| **Slaughter** | 72 | any hit | Kills grant 2% more damage for 3s, stacking to 10 times (20% total) |
| **War-Scarred** | 72 | any attack or spell | 30% more damage while your life is above 85% |
| **Siege Breaker** | 74 | any hit | 50% more damage against bosses, 20% less against non-bosses |
| **Void Ward** | 68 | guard or shield | 20% of chaos damage you take is absorbed by the shield before it reaches life |
| **Momentum Surge** | 70 | any hit | Kills grant 3% increased attack and cast speed for 4s, stacking up to 15 times |
| **Deep Reserves** | 74 | any skill | 40% more damage if you used this skill in the last 3s (rewards staying on one skill) |

---

### Small calls

- **Totems use player stats** at 60% efficiency (`totemEfficiency = 0.6`). They don't scale with their own gem level beyond the base damage listed.
- **Warcry timing:** warcries can be queued by automation like any other skill. Their proposed 1500ms action still consumes time; cost is 0 Mana. Default rule: "Whenever ready."
- **Doom bursts are chaos damage** and bypass ES. Base burst = `50 + monster level × 3` chaos damage.
- **Exertion rule:** default rule for exertion finishers is "When exertion is full", a new rule condition like `maliceFull`. Builders still use "always" or their own condition.
- **Marks don't have a default rule** for the mark skill itself (always makes sense); the finisher skills that *benefit from* a mark have `targetHasEffect: 'mark'` as their suggested rule.
- **No signature for supports.** Same as every act.
- **Art:** totems, warcries and mark effects need icons. Doom skills share void/purple palette. Exertion uses a yellow-charge visual. All listed in `artManifest.ts → GEM_SYMBOL` when built.

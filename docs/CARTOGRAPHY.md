# Cartography: three alternatives

Design pass 2026-11-21. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md). Cartography today: vellum and ink, plain T1 maps, folios, 3:1 upgrades through T10 (2:1 specialised), Sextants, survey fragments and the Artisans' Reliquary chart.

**Status:** owner turned down my first pick, drawing features onto a map grid (2026-11-21): "it's really just meant as a source of maps to farm in the end game." Three alternatives built around that. Waiting on the owner's choice.

All three use the same active play, taking a sighting: two lines sweep across a landmark, and you tap as each one crosses it. Both dead on is a double, close is a hit, off is weak, and way off is a miss.

## Option A — Chart your favourites

Every map you clear leaves survey notes for that particular map. Cartography turns notes into fresh copies of it, so you can farm the maps you like best instead of whatever drops. The more you've surveyed a map, the better its copies get: a well-charted map gets more monsters, more loot or a better boss. Upgrades to higher tiers stay.

- **Idle and offline:** standing orders keep a stock of chosen maps topped up.
- **Steady chase:** each map's chart level, raised by running and copying it.
- **Levels 80–99:** master charts of the top tier, whose copies roll a bonus.
- **Rare chase:** a cartographer's masterpiece, a copy with its top bonus doubled.
- **Main screen:** a shelf of your charted maps, each with its chart level, plus the stock you're keeping.
- **Coming back:** new copies in the map stock.
- **What it's for:** steady, chosen farming. You never run dry on the map you want.

## Option B — The map bench

Cartography is where maps get rolled for farming. Plain maps come off the drawing table, and the bench adds and rerolls their modifiers: more pack size, more currency, more rare monsters, with harder monster mods as the cost. Cartography's own inks and seals replace general crafting currency for maps. Sextants and folios fold into the bench.

- **Idle and offline:** batch-roll maps toward a saved target, such as "at least 30% quantity".
- **Steady chase:** new inks and seals unlocked by level, each with ranks.
- **Levels 80–99:** master seals that lock one mod while rerolling the rest.
- **Rare chase:** a gilded ink that adds a seventh modifier.
- **Main screen:** the map on the bench with its modifiers, and the inks and seals tray.
- **Coming back:** rolled maps stacked by how well they hit the target.
- **What it's for:** making every map you run worth more.

## Option C — Special maps from scraps

Plain maps come from monsters. Cartography makes the maps you can't get any other way: boss maps, vault maps, guardian maps and the pinnacle maps. Map bosses and rare monsters drop scraps and rumours, and the cartographer pieces them together into special maps.

- **Idle and offline:** piecing together runs from saved recipes.
- **Steady chase:** the atlas of special maps, with perks for each new kind made.
- **Levels 80–99:** pinnacle maps for the hardest bosses.
- **Rare chase:** a lost chart, a one-off map to a unique place with its own boss.
- **Main screen:** the scraps tray and a board of the special maps you can make.
- **Coming back:** finished special maps.
- **What it's for:** making the exciting endgame content. Cartography is the key maker.

## My pick

**A — Chart your favourites.** It does exactly what you described: a dependable source of the maps you want to farm, with a steady chase built in. B overlaps the item crafting you already have, and C is a good fit for map drops without needing a skill.

## Owner's choice

**Option C — Special maps from scraps (2026-11-21).** Built as written above. Options A and B are kept here as the record.

## Decided on the owner's behalf

- Plain maps come from monster drops; Cartography stops drawing plain T1 maps. 3:1 upgrades, Sextants and the Artisans' Reliquary chart stay, so spare plain maps still have a use.
- Map bosses and rare monsters drop the scraps and rumours; survey fragments carry over into scraps.
- One hidden collectible at the drafting table, such as a mapmaker's doodle in an old chart's margin.
- Existing maps, vellum, ink and folios keep working; the map device, Atlas and Maps rules are unchanged.
- Which special maps exist, scrap recipes and lost-chart odds are tuning, set at build time.

## Implementation spec (Option C)

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Numbers are starting values. Files: `src/data/cartography.ts`, `src/engine/cartography.ts`, `src/data/maps.ts`, `src/engine/maps.ts`, and Cartography recipes in `src/data/skills.ts`.

### What changes and what stays

- **Removed:** the recipes that draw plain T1 maps. Plain maps now come only from monster drops, as they already do in Maps.
- **Kept:**
  - Vellum and ink recipes, used as inputs below.
  - 3:1 and 2:1 upgrades.
  - Folios and Sextants.
  - The Complete Atlas Chart, and the Artisans' Reliquary project, whose survey progress now comes from crafting special maps.

### Scraps and rumours (new materials, drop in Maps)

| Item | Source |
|---|---|
| `boss_scrap` | every map boss drops 1–2; rare monsters in maps 3% |
| `vault_scrap` | rare monsters in maps 2%; vault-map chests 1–3 |
| `guardian_scrap` | bosses of Boss maps at T8 or higher, 30% |
| `guardian_trophy` | each Guardian map boss drops 1 |
| `lost_chart` | Boss map bosses, 1 in 500 |

### Special maps

Each special map uses a plain map of the chosen tier as its base, so spare plain maps keep a use.

| Map | Level | Recipe (interval) | What it plays like |
|---|---|---|---|
| Boss map (T1–T10) | 40 | 1 plain map of tier T + 3 `boss_scrap` + 2 ink (60 s) | 10 packs, then the tier's map boss at ×1.5 life with ×3 loot rolls; 25% chance of an `inscription_fragment` at T5+ |
| Vault map (T1–T10) | 55 | 1 plain map + 3 `vault_scrap` + 2 ink (60 s) | half the packs, twice the rare monsters, and an end chest with ×10 rolls on the tier's currency table |
| Guardian map (T10) | 70 | 1 T10 map + 5 `guardian_scrap` + 5 ink (120 s) | one of four guardian bosses (stronger variants of existing T10 bosses); drops a `guardian_trophy` and a roll from the T9+ unique map pool |
| Pinnacle map (T10) | 85 | 1 T10 map + 4 `guardian_trophy` (300 s) | one pinnacle boss (×3 life, ×1.5 damage over T10); drops one Atlas Survey Record or one Reliquary Fragment, plus a T10 unique map roll at 50% |
| Lost chart | 75 | 1 `lost_chart` (180 s) | one run of a unique place, rolled from five (for example the Drowned Library or the Ember Throne Vault), each with its own boss; drops 2 unique-map uniques and 1 Atlas Survey Record |

- Special maps are stored with the realm's map supply as `{ uid, kind, tier, lostId? }` and picked on the Map Device like plain maps.
- Monster levels, Atlas bonuses and map modifiers apply as usual.
- **Return Inscription:** once this ships, the Return Inscription project takes its fragments from Boss maps (above) instead of the temporary Heist source in the build guide.

### Steady chase: the atlas of special maps

- Records each (kind, tier) made.
- Perks:

  | Entries | Perk |
  |---|---|
  | 5 | boss scrap drops +20% |
  | 15 | vault chest rolls +25% |
  | 25 | guardian scrap +20% |
  | 35 | lost chart chance ×1.5 |

### Focus minigame: take a sighting

- A vertical line sweeps left and right across a small landscape. Tap when it crosses the landmark.
- Then a horizontal line sweeps up and down. Tap again when it crosses.
- The score uses the larger of the two errors, as a fraction of the panel size:
  - Up to 0.02 is a **double**.
  - Up to 0.06 is a **hit**.
  - Up to 0.12 is **weak**.
  - More is a **miss**.
- Scoring function: `sightingResult(errX: number, errY: number)`. It replaces the survey-grid game and its constants.

### State

- `GameState.cartography.atlas: string[]` (keys `kind:tier`).
- Special maps go in the existing realm map store, extended with `kind` and `lostId`.

### Screen

- **Board** tab:
  - A tray of owned scraps, trophies and lost charts.
  - A board of special maps, each showing its recipe, what's missing, and a **Make** button with a tier picker.
  - The sighting game beside it.
- Other tabs: **Upgrades** (3:1 and 2:1), **Sextants & folios** and **Atlas**.

### Coming back

A list of special maps finished while away, grouped by kind and tier.

### Migration

- Plain T1 map recipes are removed. Owned maps, vellum, ink, folios, Sextants and survey fragments stay.
- Existing survey fragments convert to `boss_scrap` at 1:1.
- Plain-map recipe task mastery converts to the Boss map track at the same level.

### Tests

- Each recipe's inputs and gates.
- Each special map's run rules (packs, boss scaling, chest rolls).
- Scrap drop rates.
- Guardian trophy to pinnacle map.
- Lost chart one-off run.
- Atlas perks.
- Return Inscription fragment source switch.
- `sightingResult` boundaries.
- Migration.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build the remaining production twists".

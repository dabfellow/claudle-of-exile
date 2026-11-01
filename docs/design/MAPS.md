# Maps

Plan for Milestone 8, drafted 2026-11-01 from your answers. Nothing here is built yet. It replaces the "fixed theme" design
in the old notes: a map is just a tier, and everything else comes from what you add to it. Only the dev preview exists so
far (`src/data/maps.ts`, `src/engine/maps.ts`).

## The loop

1. Monsters start dropping maps in level 60 areas, so you finish the campaign with 5 to 10 to start farming on.
2. At the Map Device you pick a tier, and slot Sextants to add mods.
3. A run is a set number of packs, then a map boss. The map is used up, win or lose.
4. Auto-run keeps going until that tier's maps run out, online or offline.
5. First clears earn Atlas points, which bend how Maps work.

## Maps

A map is **Map Tier 1** to **Map Tier 10**, nothing more. Maps stack in one shared supply, so auto-run needs no filters.

| Tier | Monster level | Packs |
|---|---|---|
| 1 | 66 | 6 |
| 2 | 68 | 7 |
| 3 | 70 | 8 |
| 4 | 72 | 8 |
| 5 | 74 | 9 |
| 6 | 76 | 9 |
| 7 | 78 | 10 |
| 8 | 80 | 10 |
| 9 | 82 | 11 |
| 10 | 84 | 12 |

### Getting your first maps

Maps start dropping in level 60 areas, before the Map Device opens, and only as Tier 1. They wait in your supply until then.
The aim is 5 to 10 by the end of the campaign. The last 13 areas of Act 6 are level 60 or higher, so:

- **Area bosses:** the first kill of each has a 50% chance of a map, about 6 or 7 across the 13.
- **Other monsters:** a small chance per kill, worth a map or two at normal pace, so lingering pays a little but doesn't
  flood you.
- **The Last King:** beating him tops you up to 5 maps if you have fewer, so nobody starts with too few.

Past that, maps found in the campaign stay rare, and running maps is the main way to find more.

### Tier scaling

Tier 1 follows on from Act 6's last boss at about level 66. Life and damage scales get set when it's built, and the current
numbers are placeholders from the preview.

Each run borrows a random campaign act's monsters, art and boss mechanics, so runs still look different. That's only
looks and danger, not loot.

## Loot

There are no themed loot pools. Maps use the same general drop tables as everywhere else, weighted by level: low areas drop
mostly white and magic items with basic orbs, and high ones drop mostly rares, some chaos, the odd divine, and plenty of
other currency. `DROP_TABLES` already works this way, by tier, so Maps add tiers 18 and up on the same curve.

Two things to settle while building:
- **Uniques:** areas list their own today, and map runs list none. Maps get a general pool by level, so any unique can drop.
- **Gear:** Act 6's boss already reaches level 80 bases, so map tiers can't rely on new bases. Their gain has to come from
  rarity, more drops and the top affix tiers.

## Sextants

Based on Path of Exile's old Sextants, which I think is the system you mean. Each one is an orb that rolls a mod.

- **Slots:** the Map Device has 1 slot, growing to 3 with its upgrades. An Atlas notable can add a fourth.
- **Using one:** a Sextant rolls a random mod into a slot, and that mod lasts for a number of map runs (say 6). Using another
  on the slot replaces it, so you reroll until you like it.
- **Effect:** every map you run has the slotted mods, whatever its tier. When the runs are used up the slot goes empty.
- **Tiers:** Apprentice, Journeyman and Master Sextants roll stronger mods and need higher tier maps to work.
- **Getting them:** they drop in maps, and Cartography can make them.

Mods trade danger for reward, so a stronger slot asks more of the build:

| Kind | Examples |
|---|---|
| Danger | Monsters have 40% more life; bosses bring an Echoes pair; unholy ground in every pack |
| Reward | 30% more currency; 1 extra pack; bosses drop an extra rare |
| Both | 50% more monster damage and 40% more item rarity |
| Hunting | Map bosses can drop a hard boss key; monsters drop fossils; a chance of a Maps-only unique |

Hunting mods take over what themes were for, and only on the runs you choose. That's the way to aim at a drop.

## The Atlas tree

Its own tree on the Map Device page.

- **Points:** one for the first clear of each tier, one for clearing it with all slots filled, and one for clearing it
  without dying in the run (30 in all). A shared pool, so it holds for the whole account.
- **Wings:**
  - **Sustain:** more maps found, tier-up chance.
  - **Bounty:** more currency, more rarity, and better map bosses.
  - **Surveying:** stronger Sextants, more runs per Sextant, and more slots.
  - **Peril:** more danger for more reward, plus keystones that change the rules, like "maps can't be lost on death, but
    monsters deal 30% more damage".
- **Respec:** free for now, and the choice of where to put points can tighten once it's tuned.

## Offline

Auto-run works offline and uses up Sextant runs as it goes. Dying ends the run and stops auto-run, as offline combat does
now, and the map is lost. Before starting, the device warns if your build can't answer a slotted boss mechanic, using the same
check as `bossLeftToRules`.

## Who holds what

Maps, Sextants, Atlas points and the device's slots all belong to the account, shared by a realm's characters, like the
stash. That resolves the `s.maps` note in [MILESTONES.md](../MILESTONES.md).

## What this changes

- **Cartography:** draws plain maps, so all per-theme recipes go, and it gains Sextants. Upgrade 3 into 1 stays, tiers run to
  10, and Folios stay for the long grind. See [CARTOGRAPHY.md](CARTOGRAPHY.md).
- **Hard mode bosses:** keys come from hunting mods, not themed maps. Each key gets its own mod. See [HARD_BOSSES.md](HARD_BOSSES.md).
- **Collection log:** it can list map tiers and mods in place of themes.
- **Saves:** any themed maps a player already holds fold into plain maps of the same tier, with a save migration.

## Build order

1. **Plain tiers.** Ten tiers, themes removed, random act look per run, shared supply, map drops from level 60, the Last King's top-up, save migration, and drop tables 18 and up.
2. **Device page.** The real Map Device page replaces the preview, and the preview flag goes.
3. **Sextants.** Slots, mods, tiers, and offline use.
4. **Atlas tree.** Points, the four wings, and the page.
5. **Cartography rework.** Plain maps and Sextant recipes.
6. **Key and unique hunting.** Mods only, as the keys arrive with Milestone 9.

Steps 1 and 2 go first because they fix what players reach today. Steps 3, 4 and 5 can then run side by side.

**Done:** a character can farm from Tier 1 to Tier 10, with Sextants and the Atlas, with auto-run working offline.

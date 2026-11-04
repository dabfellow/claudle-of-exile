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

### Tier identity

Each tier group has a permanent mod baked into every map of that group, and exclusive loot that doesn't appear below it.
No artificial gates: a strong-enough build can always run a higher tier, but the permanent mod is a genuine gear check.

| Tier group | Permanent mod | First exclusive |
|---|---|---|
| T1–2 | None | General loot only |
| T3–4 | **Elite packs** — 2 of the run's packs are elite (4× life, 1.5× damage, 3× XP, 60% more drops) | First place Chaos Orbs reliably drop |
| T5–6 | **Twin boss** — the boss spawns a lieutenant at 60% stats; they share a life pool | First tier-locked unique pool (T5–6 uniques) |
| T7–8 | **Dangerous ground** — unholy, burning or frozen ground covers part of the arena during the boss fight | Second tier-locked unique pool (T7–8 uniques); first place Regal Orbs drop |
| T9 | **Enraged** — all monsters start enraged (30% faster, 40% more damage, can't be un-enraged) | First place Exalted Orbs drop |
| T10 | **Pinnacle** — elite packs + twin boss + enraged, all three at once | Best Divine Orb rates outside Doomed Maps; T10-exclusive unique pool; Doomed Maps can drop here (once the Atlas unlock is active) |

Tier-locked uniques only drop in that tier group and above. Their identities are settled when the pools are built.

## Loot

Maps use the same general drop tables as everywhere else, weighted by level: low areas drop mostly white and magic items
with basic orbs, and high ones drop mostly rares, some chaos, the odd divine, and plenty of other currency. `DROP_TABLES`
already works this way, by tier, so Maps add tiers 18 and up on the same curve.

- **Uniques:** maps get a general pool by level, so any campaign unique can drop, plus the tier-locked unique pools defined in
  Tier identity above. Identities for those pools are settled when the pools are built.
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

## Doomed Maps

Five map items beyond the regular tiers, each substantially harder than the last. They drop rarely from Tier 8–10 runs, but
only once the Atlas tree unlock is active (~20 Atlas points). They have their own supply, separate from regular maps.

| Map | Monster level | Packs | Mods rolled |
|---|---|---|---|
| Doomed I | 86 | 14 | 2 |
| Doomed II | 88 | 15 | 2–3 |
| Doomed III | 90 | 15 | 3 |
| Doomed IV | 92 | 16 | 3–4 |
| Doomed V | 94 | 16 | 4 |

### The Doomed mod pool

Doomed mods use new mechanics that don't exist in the Sextant pool — they change how the run works, not just the numbers:

| Mod | Effect |
|---|---|
| Pre-assembled adds | The area boss arrives with 3 adds already summoned |
| Revenant packs | Monsters in every third pack revive once at 30% life when killed |
| Drained belts | Flasks are not refilled at the start of the run |
| Unending enrage | The boss enrages permanently at 75% life (normally enrage is temporary) |
| Hulking surge | Every fourth pack is a Hulking pack |
| Searing aftermath | The arena floor ignites for 4 seconds after each pack is cleared |
| Warded threshold | The boss gains a 6-second damage immunity ward when it first drops below 60% life |

### Doomed Map rewards

- **The best source of top-end currency.** Doomed Maps have 3–4× the Divine Orb and Exalted Orb drop rate of T10. Running them is how players fund top crafts.
- **Fractured Orbs.** A new currency that only drops in Doomed Maps. Its exact use is settled in Milestone 10 (placeholder: locks one mod on a rare item while the rest are rerolled). Players stockpile them for when crafting needs them.
- **Uber Boss keys.** On boss kill: a chance to drop one of three Uber Keys. Higher Doomed tiers have a better chance.

| Doomed tier | Key drop chance |
|---|---|
| Doomed I | 10% |
| Doomed II | 15% |
| Doomed III | 20% |
| Doomed IV | 25% |
| Doomed V | 35% |

Each key run drops one of the three Uber Keys (Uber Key I, II, or III) at random, weighted equally.

## Uber Bosses

Three bosses above the Milestone 9 hard mode bosses. Keys drop from any Doomed Map boss; run from the Map Device. A key
is consumed when the fight starts, win or lose. Full mechanics are designed when they're built; what's settled here is their
identity, level and reward type.

| Boss | Level | Identity |
|---|---|---|
| The First Exile | ~90 | Mirrors your build — uses the same skill types and adapts to your rule patterns. No fixed moment to exploit; reading the fight is the skill |
| The Architect of Ruin | ~93 | The force behind all six acts' disasters. Cycles through each act boss's mechanic in sequence, each phase harder than the original |
| The Void Sovereign | ~96 | Introduces chaos as an active damage type. Immune to hits unless a buildup mechanic is triggered, then briefly vulnerable for a burst window |

### Chase gear

Each Uber Boss drops:
- **1–2 build-defining uniques** that don't drop anywhere else. Their effects are designed alongside the bosses.
- **Doom Sigils** — a crafting material used in Milestone 10 top-end crafting for past-the-limit mods.

## Build order

1. **Plain tiers with identity.** Ten tiers, themes removed, random act look per run, shared supply, permanent mod per tier group, map drops from level 60, the Last King's top-up, save migration, and drop tables 18 and up.
2. **Device page.** The real Map Device page replaces the preview, and the preview flag goes.
3. **Sextants.** Slots, mods, tiers, and offline use.
4. **Atlas tree.** Points, the four wings, the Doomed Maps unlock node, and the page.
5. **Tier-exclusive drops.** Chaos/Regal/Exalt/Divine scaling by tier, and the tier-locked unique pools.
6. **Doomed Maps.** Five item types, Doomed mod pool, Fractured Orb drops, key drops from bosses, offline support.
7. **Cartography rework.** Plain maps and Sextant recipes.
8. **Uber Bosses.** Three bosses, three key types, chase uniques and Doom Sigils.

Steps 1 and 2 go first because they fix what players reach today. Steps 3–5 can run side by side. Steps 6–8 are Milestone 9+.

**Done:** a character can farm from Tier 1 to Tier 10, through Doomed Maps to Uber Bosses, with Sextants and the Atlas, and auto-run working offline.

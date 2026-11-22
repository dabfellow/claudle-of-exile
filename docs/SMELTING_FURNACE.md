# Smelting: Running the furnace

Design pass 2026-11-21. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md), following the gathering skills ([Mining](MINING_DELVE.md), [Woodcutting](WOODCUTTING_GIANTS.md), [Foraging](FORAGING_BREEDING.md), [Thieving](THIEVING_CASING.md), [Archaeology](ARCHAEOLOGY_DECIPHERING.md), [Astrology](ASTROLOGY_CONSTELLATIONS.md)). Smelting today: five ore into one bar for each metal (copper to world metal), plus three protected alloys (Tempered, Wound, Stone) for unique and project recipes, and the Smelter's Tongs tool project.

**How this pass was run:** owner asked (2026-11-21) that for the production skills I answer each question with my own pick and present the full set for approval, instead of asking one at a time. Every answer below is my pick; the owner approved the full set on 2026-11-21 and asked for the remaining production skills to be done the same way.

## Decisions (my picks, approved 2026-11-21)

- **Question 1, core twist: B — Running the furnace.** Smelting is about keeping one furnace going well. Every bar comes out at a **purity grade**, and the long game is turning out purer metal. Chosen over A (mixing metals in ratios to discover alloys) because combining ingredients for traits is already Foraging's breeding and Astrology's star linking.
- **Question 2a, purity: A — Four grades.** Crude, Refined, Pure and Flawless. Grades stack separately in the inventory. Chosen over a purity percentage on every stack, which clutters the bag.
- **Question 2b, what purity does: A — Purer bars make better gear.** Every recipe accepts any grade; purer bars give Forging and Smithing results a better roll (higher mod tiers or extra quality). Top alloys need Flawless bars. Chosen over B (purer bars count as more bars), which is just efficiency.
- **Question 3a, active play: A — Work the bellows.** Hold to pump, release to ease; keep the heat needle inside the current metal's band. Staying in the gold centre of the band is a double, inside the band a hit, at its edge weak, out of it a miss. Chosen over B (tap slag floating to the surface), which is too close to Foraging's whack-a-mole.
- **Question 3b, what sets purity: A — Fuel and flux.** Purity odds come from what you load, so it works the same offline: the fuel (wood charcoal, coke, then rarer fuels) and a flux (crushed stone, bone ash, then rarer fluxes), plus furnace upgrades and level. Active play keeps to the usual rule: it adds speed and doubles, not purity. Chosen over B (furnace upgrades only), which leaves nothing to choose day to day.
- **Question 4a, levels 80–99: B — Master alloys.** Famous named alloys (for example Dragonsteel, Moonsilver, Kingsbronze), each needing Flawless bars of several metals and a top furnace. Each gives gear a signature property when Forged. Chosen over A (new legendary metals), since new metals are Mining's job.
- **Question 4b, steady chase: A — Furnace parts.** Upgrade the furnace piece by piece: firebrick lining (hotter bands), bellows (steadier heat), crucible (bigger batches), flue (better purity odds), each in tiers. Chosen over B (a mastery-style purity record per metal), which overlaps the mastery buffs.
- **Question 4c, rare chase: A — Living metal.** A very rare melt comes out as a single ingot of living metal, above Flawless. Used in a Master alloy, it gives that alloy's gear an extra signature property. Chosen over B (a rare "perfect melt" that just doubles the batch).
- **Question 5a, main view: A — The furnace up close.** A cutaway furnace with the heat needle, fuel and flux slots, and the bars in the queue; the bellows sit beside it. Recipes, furnace parts and master alloys are tabs.
- **Question 5b, coming back: A — The ingot rack.** Bars smelted while away lined up on a rack by grade, with Flawless and living metal standing out.

## Decided on the owner's behalf

- Fuel comes from other skills' leftovers: Woodcutting's splinters burn into charcoal, so the giants' waste has a use. Gathering skills stay self-contained; this only adds a use for their by-products.
- One hidden collectible at the furnace, such as an old smith's maker's mark found in the firebrick. No gameplay effect.
- Existing bars and alloys become Refined grade so every current recipe, unique and project keeps working. Smelter's Tongs stays as the profession tool.
- Mastery buffs (10–90 and 99) are unchanged.
- Grade odds, fuel and flux tiers, heat bands, part costs and the master alloy list are tuning, set at build time on how they play.

## Implementation spec

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Numbers are starting values. Files: `src/data/skills.ts` and `src/data/smithing.ts` (`smelt_*`, alloys), `src/engine/skills.ts`, and a new `src/engine/smelting.ts`.

### Bars and grades

- Smelting stays 5 ore → 1 bar at today's interval and XP per metal.
- Each finished bar rolls a grade. Item ids:
  - `<metal>_bar_crude`
  - `<metal>_bar`, which stays as the id for **Refined** so every existing recipe and stack keeps working
  - `<metal>_bar_pure`
  - `<metal>_bar_flawless`
- Recipes ask for "<metal> bar" and accept any grade. Each recipe screen has a **Use grade** picker that defaults to lowest first. A recipe that names Flawless (master alloys) accepts only Flawless.
- **Purity score `P`** = fuel tier + flux tier + Flue tier + `floor(Smelting level / 20)`. The range is 0–14. Grade odds:
  - Crude: `max(5, 40 − 5P)%`
  - Pure: `min(40, 3P)%`
  - Flawless: `min(15, P² / 12)%`
  - Refined: the rest
- **Grade effect on Forging and Woodcrafting**, averaged over the bars a craft uses: Crude −1, Refined 0, Pure +1, Flawless +2.
  - Each +1 gives every rolled mod a 10% chance to land one tier better and the item +5% quality.
  - Each −1 gives a 10% chance to land one tier worse.
  - Put this in a shared `barPurityBonus(inputsUsed)` helper that Forging and Woodcrafting call.

### Fuel and flux

The furnace has a fuel slot and a flux slot, set on the Furnace tab and kept until changed. While smelting, every 5 bars use 1 fuel and 1 flux. An empty slot counts as tier 0. Preparation is ordinary Smelting actions:

| Item | Tier | Recipe | Level |
|---|---|---|---|
| `charcoal` (fuel) | 1 | 10 `splinters`, or 5 logs of any wood | 1 |
| `coke` (fuel) | 2 | 4 charcoal + 2 `rubble` | 30 |
| `starcoal` (fuel) | 3 | 5 coke + 1 star_ore | 60 |
| `crushed_stone` (flux) | 1 | 5 `rubble` | 1 |
| `bone_ash` (flux) | 2 | 1 fossil of any kind → 5 bone ash | 30 |
| `crystal_flux` (flux) | 3 | 1 `crystal_shard` → 5 crystal flux | 60 |

### Furnace parts (steady chase)

Four parts with four tiers each, built on the Furnace parts tab:

- **Tier costs:** 50 iron, mithril, adamant and star bars for tiers 1–4.
- **Level gates:** 15, 35, 55 and 75.

| Part | Per tier |
|---|---|
| Firebrick | bar interval −8% |
| Bellows | minigame heat band +10% wider |
| Crucible | each completion makes +1 bar from +5 ore, with interval ×1.5 per extra bar |
| Flue | +1 to `P` |

### Master alloys (levels 80–99)

Each needs the listed Flawless bars and at least two furnace parts at tier 4. Each takes 10 minutes and gives 1 alloy. The signature is a fixed implicit given to a Forging master-form item made from it.

| Alloy | Level | Inputs | Signature |
|---|---|---|---|
| Kingsbronze | 80 | 10 Flawless copper, 5 Flawless iron, 1 Flawless world | +20% item rarity, and the item can take one extra crafted mod |
| Moonsilver | 85 | 5 Flawless mithril, 5 Flawless star | +8% maximum energy shield and +8% maximum mana |
| Dragonsteel | 90 | 5 Flawless adamant, 5 Flawless star, 2 Flawless void | 12% of physical damage added as fire |
| Voidglass | 95 | 5 Flawless void, 5 Flawless world | +15% chaos resistance and 10% of damage added as chaos |

### Rare chase: living metal

- Each completion with `P` of 8 or more has a 1 in 2,000 chance of 1 `living_metal`.
- A master alloy craft can take 1 living metal as an optional extra input. The alloy comes out **Living**, and gear forged from it gets a second signature, rolled from the other three alloys.

### Focus minigame: work the bellows

- Hold to pump: the heat needle rises while held and falls when released, with a little inertia.
- The target band's width depends on the metal: copper 0.25 of the gauge, falling evenly to world at 0.12, then multiplied by the Bellows tier. Its centre third is gold.
- Each attempt is 3 s. Results:
  - Needle in gold for at least 50% of the time is a **double**.
  - In the band for at least 60% is a **hit**.
  - In the band for at least 30% is **weak**.
  - Anything less is a **miss**.
- Scoring function: `bellowsResult(goldShare: number, bandShare: number)`.

### State

`GameState.smelting`:

- `fuel: string | null`
- `flux: string | null`
- `parts: { firebrick: number; bellows: number; crucible: number; flue: number }`
- `stats: { flawless: number; living: number }`

### Screen

- **Furnace** tab: a simple cutaway furnace showing the fire, the heat needle, the fuel and flux slots (tap to choose from owned), the current recipe with its count, and the live grade odds from `P`. The bellows game sits beside it.
- Other tabs: **Recipes**, **Fuel & flux**, **Furnace parts** and **Master alloys**.

### Coming back: the ingot rack

- A rack shows the bars made while away, as one row per metal with counts per grade.
- Flawless bars glow. Living metal gets its own slot with a shine.

### Migration

- Existing `<metal>_bar` stacks are Refined. Alloys keep their ids.
- Smelting task mastery tracks keep their ids.
- Smelter's Tongs is unchanged.
- Players start with empty fuel and flux slots and a one-time hint to load them.

### Tests

- The grade odds formula across `P` values.
- Fuel and flux used per 5 bars.
- Any-grade recipe matching and the grade picker order.
- Flawless-only inputs.
- Each part's effect.
- Master alloy gates.
- The living metal roll and how a Living alloy carries over to Forging.
- `bellowsResult` boundaries.
- Migration.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build Smelting as Running the furnace".

# Foraging: Wild variants and cross-breeding

Design pass started 2026-11-21. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md), following [Mining: the Delve](MINING_DELVE.md) and [Woodcutting: Felling giants](WOODCUTTING_GIANTS.md). Goal: give every skill its own twist instead of "pick a node, wait, collect."

Owner rule for this review (2026-11-21): never weigh crossover with Fishing; it lives on its own, so repeating its themes is fine. All other skills should be as unique from each other as possible.

## Decisions

- **Question 1, core twist (2026-11-21): A — Wild variants and cross-breeding.** Wild plants come in variants (a red-veined Sunpetal, a frost-tipped Emberroot, a rare twin-headed Voidbloom), each with a small trait such as higher yield, a stronger essence or a special recipe use. Foraging finds new variants in the wild; the Greenhouse crosses them to breed new strains that combine traits. The seed collection is the player's pride; the long game is breeding the perfect strain. The Greenhouse becomes the heart of the skill.
- **Question 2a, finding variants (2026-11-21): A — They turn up while you forage**, including offline; deeper patches hide rarer variants and stranger traits. Owner: "mutations are weighted and there are rare mutations and more common ones, and they should work in a way where multiple mutations can stack, maybe up to 2, for a big chase goal."
  - Read as: every mutation has a weight, from common to rare. This applies to wild finds and to bred offspring alike.
  - **Revised 2026-11-21:** owner: "do 3; some of the rare mutations should be giga rare, so having 3 would be massive." A plant can carry up to **three** mutations. Mutation weights run common → rare → giga rare.
- **Question 2b, breeding (2026-11-21): A — Cross two parents.** Plant two strains side by side in the Greenhouse; offspring inherit a mix of both parents' traits with a chance of a new (weighted) mutation. Takes real time; keep the best seeds and cross again.
- **Question 3a, active play (2026-11-21): B, as whack-a-mole.** Owner: "B but whack a mole style, so you have a plot and a plant lights up to be fertilized." A plot of plants; one lights up at a time and you tap it to fertilize it before it fades.
  - Decided on the owner's behalf: tapping a lit plant in time is a hit and fills Focus; a very quick tap is a double; letting it fade is a miss. Deeper patches light plants up faster and sometimes two at once.
- **Question 3b, Greenhouse running (2026-11-21): A — Always grows in real time.** Plots grow and breed on their own clocks whatever the character is doing, including offline. Higher Foraging levels unlock more plots. Wild foraging is the main activity for finding variants; breeding runs in the background.
- **Question 4a, new plants (2026-11-21): owner's mix.** Owner: "new base species unlock at milestone levels, and it's up to you to breed new plants with those new base plants." New wild base species arrive at milestone Foraging levels; new bred plants come from crossing them.
- **Question 4b, levels 80–99 (2026-11-21): A — Hidden hybrids, "along with rare mutations of them."** Certain species pairs cross into secret hybrids (for example Moon Bloom × Star Bloom → Eclipse Bloom) with the strongest uses; pairings aren't listed. Hybrids have their own rare mutations.
- **Rare drop** (decided on the owner's behalf, from their Question 2 note): the big chase is a plant carrying three mutations, with giga-rare ones making it massive; best of all a hidden hybrid with three top mutations.
- **Question 5, steady chase (2026-11-21): Both.** **Stabilising strains:** breed a strain true for enough generations and it becomes stable, always passing its traits on and plantable on demand; stabilising strains unlocks Foraging perks. **The herbarium:** every new strain bred or found (species × mutation combination) is pressed into the herbarium; filling pages unlocks perks such as more plots, better mutation inheritance, faster growth and hints toward undiscovered hybrid pairings.
- **Hidden collectibles** (decided on the owner's behalf): each wild base-species patch is a skilling zone with one hidden find, such as a pressed flower tucked in an old field guide. No gameplay effect.

- **Question 6a, main view (2026-11-21): A — The Greenhouse bench.** A row of plots, each showing what's growing, its parents and a countdown; tap a plot to plant a cross or harvest offspring. Wild foraging (with the whack-a-mole plot), the seed collection and the herbarium are tabs alongside.
- **Question 6b, coming back (2026-11-21): A — Seed packets to open.** Each new seed from the wild or the Greenhouse arrives as a sealed packet; tap to reveal the strain and its mutations, with bigger reveals for rare and giga-rare ones. An "open all" button handles big hauls.

## Decided on the owner's behalf

- Whack-a-mole timing: tap in time is a hit, a very quick tap is a double, a faded plant is a miss; deeper patches are faster and sometimes light two plants.
- Rare chase is the three-mutation plant (giga-rare mutations make it massive), best as a hidden hybrid.
- Each wild base-species patch is a skilling zone with one hidden find, such as a pressed flower.
- Existing saves move over without losses: Sunpetal, Frostleaf, Emberroot and Voidbloom become the first base species; Moon and Star Blooms stay as base species; existing herbs, essences, blooms and discovered seeds keep their IDs and become unmutated strains; the current remembered Greenhouse crop becomes the first plot. Abundant and Concentrated patches become mutations rather than separate patches.
- Exact milestone levels for new base species, plot counts, growth times, mutation weights and perk values are tuning, set at build time on how they play.

## Implementation spec

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Save id stays `harvesting`. Numbers are starting values.

### Base species and wild patches

Each base species has one wild patch action, `forage_<species>`, and each patch is a collectible zone.

| Species | Level | Interval | XP (raw) | Grow time | Herb item | Essences (2% per completion, split) |
|---|---|---|---|---|---|---|
| Sunpetal | 1 | 3.0 s | 7 | 30 min | sunpetal | vitality 1 |
| Frostleaf | 12 | 3.5 s | 16 | 45 min | frostleaf | frost 2, vitality 2 |
| Emberroot | 25 | 4.0 s | 32 | 1 h | emberroot | embers 2, storm 2 |
| Voidbloom | 40 | 5.0 s | 55 | 1.5 h | voidbloom | haste 2 |
| Moon Bloom | 45 | 6.0 s | 60 | 2 h | moon_bloom | — |
| Thornvine (new) | 52 | 6.5 s | 70 | 3 h | thornvine | embers 2 |
| Star Bloom | 60 | 7.0 s | 80 | 3 h | star_bloom | — |
| Glimmermoss (new) | 68 | 7.5 s | 95 | 4 h | glimmermoss | storm 2 |
| Wraithlily (new) | 84 | 8.0 s | 115 | 6 h | wraithlily | haste 2 |

- Each wild completion gives 1 herb of the species.
- It also has a 1% chance of a **plain seed** of that species. The first seed of a species is still guaranteed by 100 completions, using the existing discovery counter.
- It has a **2% chance of a variant seed**: a seed of that species carrying mutations.

### Mutations

- A plant carries 0–3 mutations. A **strain** is a species plus its sorted set of mutations, stored as the key `species|mutA|mutB`.
- The mutation catalogue is shared by all species:

| Tier (weight) | Mutation | Effect |
|---|---|---|
| Common (100) | Bountiful | +1 herb per Greenhouse harvest |
| Common | Vivid | +10% infusion strength in Alchemy |
| Common | Quickroot | grows 20% faster |
| Common | Hardy | +10 points to inheritance chance |
| Common | Fragrant | essence chance +25% when this strain is harvested |
| Rare (10) | Overflowing | +3 herbs per harvest |
| Rare | Radiant | +30% infusion strength |
| Rare | Twin-headed | +1 seed per harvest |
| Rare | Deep-rooted | stabilises in 2 fewer generations |
| Rare | Lucent | essence chance +50%, and essences come one grade higher |
| Giga rare (1) | Celestial | +75% infusion strength |
| Giga rare | Everbloom | the plot replants itself after harvest at no seed cost |
| Giga rare | Prismatic | counts as any species for Alchemy infusion recipes |

- Each hidden hybrid also has one unique mutation at rare weight that only it can roll (for example Eclipse Bloom: Umbral, +50% infusion duration).
- **Wild variant roll:**
  - Mutation count is 1 at 90%, 2 at 9%, 3 at 1%.
  - Each mutation is drawn by weight without repeats.
  - Rare and giga-rare weights are multiplied by `1 + 0.25 × speciesIndex` (Sunpetal is index 0), so deeper patches give stranger finds.

### Greenhouse

- Unlocks at Foraging level 5 with 2 plots. One more plot comes at levels 20, 35, 50, 65, 80 and 95, and two more from herbarium perks, for up to 10.
- Plots run on real time whatever the character is doing, offline included (it no longer needs a tree keystone).
- **Grow a strain** (uses 1 seed):
  - Takes the species' grow time.
  - Harvest gives `10 + yield mutations` herbs of that strain and 1 seed of the same strain.
  - Plain strains' herbs go into the normal item of that species. Mutated strains' herbs go into strain herb stock.
- **Cross two parents** (uses 1 seed of each). Takes 1.5 × the slower parent's grow time, and harvest gives 3 offspring seeds:
  - **Species:** same as the parents if both are one species. A hidden hybrid if the pair is in the hybrid table and Foraging is level 80 or higher. Otherwise one parent's species, 50/50.
  - **Inheritance:** each mutation on either parent passes on at 50%, plus Hardy bonuses. If more than 3 pass, keep the rarest 3.
  - **New mutation:** 10% chance per offspring of one new weighted mutation. Hybrids can roll their unique mutation.
- **Stabilising:**
  - Crossing a strain with itself and getting the same strain back adds 1 generation. At 5 generations (3 with Deep-rooted) the strain is **Stable**: it always passes all its mutations when self-crossed, and planting it no longer uses up seeds.
  - Stable strains give stabilisation points, with perks at 1, 3, 6, 10, 15 and 25 points: +5% new mutation chance, grow speed +10%, +1 offspring seed, inheritance +10, grow speed +10%, and +1 mutation slot roll on crosses.
- **Herbarium:**
  - Every strain ever obtained gets an entry, with pages per species.
  - Perks at 10, 25, 50, 100 and 200 entries: +1 plot, inheritance +5, grow speed +10%, +1 plot, and grow speed +10%.
  - Every 25 entries also reveals the name of one undiscovered hybrid pairing as a hint.

### Hidden hybrids

All form only at Foraging level 80 or higher:

| Parents | Hybrid | Unique mutation |
|---|---|---|
| Moon Bloom × Star Bloom | Eclipse Bloom | Umbral (+50% infusion duration) |
| Sunpetal × Emberroot | Sunfire Lily | Blazing (infusions also deal fire on use) |
| Frostleaf × Voidbloom | Rimeshade | Stillwater (+1 flask charge from infusions) |
| Emberroot × Thornvine | Cinderthorn | Barbed (infusions add a thorns effect) |
| Glimmermoss × Star Bloom | Starmoss | Starlit (infusions scale with Astrology level) |
| Wraithlily × Eclipse Bloom | Soulflower | Undying (one infusion effect persists after the flask ends) |

Pairings are not shown in the UI until discovered or hinted.

### Rare chase

A strain with three mutations. The Seeds tab marks three-mutation strains, and the herbarium gives a special frame to any strain holding a giga-rare mutation.

### Focus minigame: whack-a-mole fertilising

- A 3×3 grid of small plants. One lights up at a time.
- The lit window is `1.6 s − 0.1 s × speciesIndex` (minimum 0.9 s). From Star Bloom onward, 20% of the time two plants light at once, and each is scored separately.
- Results:
  - Tapping the lit plant within the first 30% of its window is a **double**.
  - Tapping within the window is a **hit**.
  - Tapping it within 0.3 s after it fades is **weak**.
  - Letting it fade, or tapping an unlit plant, is a **miss**.
- The next plant lights 0.4 s after a result.
- Scoring function: `fertiliseResult(tapMs: number | null, windowMs: number, wrongPlant: boolean)`. This game's double rule replaces the guide's middle-third rule.

### State

`GameState.foraging`:

- `seeds: Record<strainKey, number>`
- `strainHerbs: Record<strainKey, number>`
- `strains: Record<strainKey, { generation: number; stable: boolean; firstSeen: number }>`
- `plots: ({ parents: [string] | [string, string]; plantedAt: number; readyAt: number } | null)[]`
- `packets: string[]` (unopened strain keys)

`GameState.greenhouse` is removed.

### Screen

- Tabs: **Greenhouse** (default), **Wild**, **Seeds**, **Herbarium**.
- **Greenhouse:** a row of plot cards, each showing the plant drawn simply, its parents, mutations and a countdown. Tapping an empty plot opens **Plant**: pick one seed to grow or two to cross, with an offspring preview showing species odds and inheritance odds. Ready plots show **Harvest**.
- **Wild:** the patch list, with the whack-a-mole grid while a patch runs.
- **Seeds:** strains grouped by species, filterable by mutation.

### Coming back: seed packets

- Every new seed, wild or from the Greenhouse, is added to `packets`.
- On return, a packet stack shows. Tapping one opens it to reveal the strain.
  - A rare mutation gets a gold glow.
  - A giga-rare mutation gets a full-width burst.
  - A three-mutation strain gets a special banner.
- An **Open all** button lists everything at once.

### Migration

- Abundant and Concentrated patch actions are retired. Their task mastery and the ordinary patches' tracks convert to `forage_<species>` at the highest level among them.
- Each discovered seed (`seed_<plant>` in discoveries) becomes 5 plain seeds.
- The remembered Greenhouse crop (`s.greenhouse`) becomes plot 1 growing that species, ready immediately.
- Herb, essence and bloom items keep their ids.
- The hidden Agility spot `herb_ledge` is removed.
- The Greenhouse keystone's points are refunded with the skilling tree revamp.

### Tests

- Variant roll counts and weights.
- Inheritance cap of 3 keeping the rarest.
- Hybrid formation gated at level 80.
- Stabilising at 5 and 3 generations.
- Stable seeds not used up.
- Plot unlock levels.
- Real-time growth offline.
- `fertiliseResult` boundaries.
- Herbarium perk thresholds.
- Migration.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build Foraging as Wild variants and cross-breeding".

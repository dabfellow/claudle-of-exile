# Alchemy: three alternatives

Design pass 2026-11-21. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md). Alchemy today: brews life, mana and utility flasks from herbs and logs, and transmutes dust into currency orbs (batch recipes, the Still Heart and Witchglass projects).

**Status:** owner turned down my first pick, a four-element balance chart that brews were steered across (2026-11-21), and asked for three alternatives written up in full. Waiting on the owner's choice.

## Option A — Your own flasks

Alchemy becomes making the five flasks on your belt your own. A flask is no longer a consumable you rebrew. It is a lasting item you work on. Each one has a base (life, mana, granite, quicksilver and so on) and up to two **infusions** brewed into it: "removes bleeding on use", "grants Onslaught", "refills a charge on crit", "instant but smaller". Infusions come from herb strains, and Foraging's rarer mutations give stronger ones. Re-infusing replaces an infusion.

- **Active play: pour to the line.** Hold to pour the infusion and let go at the marked line. On the line is a double, just over or under is a hit, well off is weak, and spilling is a miss.
- **Idle and offline:** brewing charges and refills keeps flasks stocked. Infusions are queued and finish while you're away.
- **Steady chase:** the infusion book. Each infusion has ranks that grow as you brew it.
- **Levels 80–99:** grand flasks with a third infusion slot and infusions that change how a flask works, such as one that triggers itself at low life.
- **Rare chase:** an infusion from a giga-rare mutation that no recipe gives.
- **Main screen:** your five flasks in a row, with the infusion bench beside them.
- **Coming back:** flasks topped up, and finished infusions waiting to be poured in.
- **What it's for:** combat feel. Your flasks fit your build the way your gear does.

## Option B — The Great Work

Alchemy becomes the currency maker. Transmutations are long processes that go through the four classic stages of alchemy: blackening, whitening, yellowing and reddening. Dust and lesser orbs go in, and each finished stage turns the batch into the next orb up the ladder. A batch left to run longer gives more, but each stage has a window: pull it too late and it falls back a stage. Up to three crucibles run side by side.

- **Active play: catch the colour.** The batch cycles through colours, and you tap on the target colour. Exactly on is a double, a shade off is a hit, two shades off is weak, and the wrong colour is a miss.
- **Idle and offline:** crucibles run on real time. A setting can pull each stage automatically, at the cost of a little yield.
- **Steady chase:** more crucibles and longer safe windows, unlocked by finishing stages.
- **Levels 80–99:** reddening batches that make the top orbs.
- **Rare chase:** the Philosopher's Stone, a very rare result of a perfectly timed reddening. Kept, it makes every crucible a stage faster.
- **Main screen:** three crucibles, each with its colour and stage timer.
- **Coming back:** each crucible shows where it got to and what it made.
- **What it's for:** the economy. Alchemy is where your crafting currency comes from.

## Option C — The homunculus

Alchemy becomes raising an alchemical companion. You brew a small homunculus in a flask, and it follows your character. You grow it by feeding it brews: an ember brew makes it spit fire at enemies, an iron brew makes it shield you, a quick brew makes it fetch loot. Each brew pushes it toward a trait, and each trait has levels. Flasks are still brewed as now.

- **Active play: sort the reagents.** Reagents fall from the shelf, and you swipe each one into its jar. All sorted is a double, a few wrong is a hit, many wrong is weak, and smashing one is a miss.
- **Idle and offline:** brews made while away are fed to the homunculus from a saved feeding plan.
- **Steady chase:** the homunculus's traits and levels.
- **Levels 80–99:** a second form. At high level it can be rebrewed into a greater homunculus, keeping some traits and gaining new ones.
- **Rare chase:** a rare brew that gives it a unique trait, such as copying your last skill.
- **Main screen:** the homunculus in its jar with its traits around it, and the brewing bench beside it.
- **Coming back:** the homunculus has grown, with new trait levels shown.
- **What it's for:** a companion. Alchemy gives you a little helper in fights.

## My pick

**A — Your own flasks.** Flasks are something every player uses in every fight, and making them your own is the clearest reason to level Alchemy. It also gives Foraging's mutations a direct, visible payoff. B is a strong second if you'd rather Alchemy be the currency engine.

## Owner's choice

**Option A — Your own flasks (2026-11-21).** Built as written above. Options B and C are kept here as the record.

## Decided on the owner's behalf

- With Cooking scrapped (2026-11-21), Sacred and Sulphur flasks brew straight from herbs, and meal buffs are dropped rather than moved into infusions.
- Currency-orb transmutation stays a plain recipe list alongside the flasks.
- One hidden collectible at the alchemy bench, such as a cracked vial with an old alchemist's label.
- Existing flasks become flasks with no infusions; existing recipes, orbs and projects keep working.
- Infusion list, ranks, pour targets and mutation strengths are tuning, set at build time.

## Implementation spec (Option A)

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Numbers are starting values. Files: Alchemy recipes in `src/data/skills.ts`, `src/data/flasks.ts`, `src/engine/alchemy.ts`, `src/engine/flasks.ts`, and `FlaskInstance` in `src/engine/types.ts`.

### Flasks and infusions

- Flasks stay items, a `FlaskInstance` with its base, rarity and mods. Today's flask brewing recipes keep making flask bases.
- `FlaskInstance` gains:
  - `infusions?: { id: string; strength: number; strain: string }[]`, up to 2, or 3 on a grand flask.
  - `grand?: boolean`.
- An infusion's effect applies whenever the flask is used, along with its normal effect. Strength multiplies the listed value.

| Infusion | Herb | Effect at strength 1 |
|---|---|---|
| Cleansing | Sunpetal | removes bleeding and poison on use, and grants 2 s immunity |
| Instant | Sunpetal | life and mana recovery is instant but 30% smaller (life and mana flasks only) |
| Frostguard | Frostleaf | +10% cold resistance and no freeze during the effect |
| Onslaught | Emberroot | +8% attack, cast and movement speed during the effect |
| Kindled | Emberroot | +1 flask charge per 10 crits |
| Phasing | Voidbloom | +10% evasion during the effect |
| Clarity | Moon Bloom | +20% mana regeneration during the effect |
| Barbed | Thornvine | reflects 10% of physical damage taken during the effect |
| Starlit | Star Bloom | +6% damage during the effect |
| Lingering | Glimmermoss | +20% effect duration |

- **Strength:** `rank multiplier × (1 + potency)`.
  - Rank multiplier is `1 + 0.1 × (rank − 1)`.
  - Potency comes from the strain's mutations: Vivid +0.10, Radiant +0.30, Celestial +0.75.
  - A Prismatic strain can brew any infusion.
- Hybrid unique mutations (Foraging spec) add their extra effect to the infusion they brew.

### Brewing an infusion

- **Brew infusion** is an Alchemy action:
  - Choose the infusion and a herb source: the plain herb item or a mutated strain's herb stock.
  - It takes 10 minutes and 20 herbs, and gives 200 raw XP.
  - Unlock levels follow the herb: Sunpetal 1, Frostleaf 12, Emberroot 25, Voidbloom 40, Moon Bloom 45, Thornvine 52, Star Bloom 60, Glimmermoss 68.
- A finished brew becomes a **ready vial** in `alchemy.vials`.
- **Pouring** a vial into a flask fills its first empty slot. Replacing an infusion takes a deliberate click on that slot and a second click to confirm (2026-11-25; before this, the belt kept "Slot 1" selected and every pour overwrote it).
- **Queue:** a list of brews (infusion and herb source) that runs in order while idle and offline. When it's empty, the action stops.

### Ranks (steady chase)

- Each infusion has a rank from 1 to 10.
- Reaching rank `r` needs `3 × r` brews of that infusion after rank `r − 1`, 165 brews in total to rank 10.

### Grand flasks (levels 80–99)

- At level 80 each flask base gets a **Grand** recipe: 3 × the normal inputs plus 10 Flawless bars of any metal. It makes the same flask with `grand: true` and 3 infusion slots.
- Grand flasks can also take grand-only infusions (need level 85):

  | Infusion | Herb | Effect |
  |---|---|---|
  | Last Breath | Wraithlily | uses itself when life falls below 35% |
  | Overflow | Wraithlily | recovery past full becomes a shield worth 20% of it |
  | Echo | Star Bloom | using it also triggers your next flask's effect at 30% |

### Rare chase: giga-rare infusions

Brewing from a strain carrying a giga-rare mutation also unlocks that mutation's unique infusion, which nothing else gives. It has its own rank track.

| Mutation | Infusion | Effect |
|---|---|---|
| Celestial | Starfall | +10% damage and +10% all resistances during the effect |
| Everbloom | Evergreen | the flask regains 1 charge every 5 s in combat |
| Prismatic | Prism | also gives the infusions of your other equipped flasks at 25% |

### Cooking removal

- Sacred and Sulphur flask recipes use herbs instead of Cooking's ingredients: 3 Frostleaf per Frostleaf Extract, 3 Emberroot per Emberroot Reduction, 3 Voidbloom per Voidbloom Distillate.

### Focus minigame: pour to the line

- Hold to pour. The liquid rises at a steady speed, with a slight wobble at higher levels. A target line sits at a random height between 50% and 85%.
- Release to stop. The score is the error from the line, as a fraction of vial height:
  - Up to 0.02 is a **double**.
  - Up to 0.06 is a **hit**.
  - Up to 0.12 is **weak**.
  - More, or over the brim, is a **miss**.
- Scoring function: `pourResult(error: number, spilled: boolean)`.

### State

`GameState.alchemy`:

- `queue: { infusion: string; source: string }[]`
- `vials: { infusion: string; strength: number; strain: string }[]`
- `ranks: Record<infusionId, { rank: number; brews: number }>`

### Screen

One **Laboratory** page (rebuilt 2026-11-25), plus the shared Masterworks tab. Top to bottom:

- **Cauldron**: a pixel cauldron over a fire in front of Teniers' *The Alchemist*. The liquid and glow take the colour of what's brewing; it shows time left, Stop, and the **Up next** line-up of queued infusions as bubbling tubes.
- **Focus** pour game.
- **Flask belt**: a shelf of ready vials, then each equipped flask with its slots. Pick up a vial, then click a flask (first empty slot) or a filled slot (replace, with a confirm). Flasks the vial can't go in are dimmed with the reason.
- **Recipe book**: chips for Infusions, Life, Mana, Defence, Utility, Grand, Reagents, Orbs (no dropdown). A list on the left, the chosen recipe's page on the right. Infusion pages explain rank in words, show herb sources as chips, the vial strength as a percentage, and Brew now / Add to line-up. Flask and orb pages show recipe mastery and the mastery batch buttons.

### Coming back

- A card lists the vials brewed while away and any rank-ups, and points to the Alchemy page to pour them.
- Flask charges work as they do today.

### Migration

- Existing flasks get `infusions: []`.
- Flask and orb recipes and task mastery are unchanged.
- Cooking's ingredients convert to herbs as described in the build guide.

### Tests

- Strength math with rank and mutations.
- Each infusion effect in combat stats.
- Two-slot and three-slot limits.
- Pouring fills the first empty slot; replacing needs an explicit slot.
- Queue running offline.
- Rank thresholds.
- Grand recipe gate and grand-only infusions.
- Giga-rare infusion unlock.
- Sacred and Sulphur herb recipes.
- `pourResult` boundaries.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build the remaining production twists".

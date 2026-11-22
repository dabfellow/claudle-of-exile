# Astrology: Chart your own constellation

Design pass started 2026-11-21. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md), following [Mining](MINING_DELVE.md), [Woodcutting](WOODCUTTING_GIANTS.md), [Foraging](FORAGING_BREEDING.md), [Thieving](THIEVING_CASING.md) and [Archaeology](ARCHAEOLOGY_DECIPHERING.md). Astrology today: 14 constellation studies for Stardust (and a Gilded Stardust chance), a Star Chart of five stars each where every lit star gives +2% speed to a linked profession and a small combat stat, and a shooting-star Focus game. See the Astrology row in [GAME.md](GAME.md).

## Decisions

- **Question 1, core twist (2026-11-21): B, in the owner's version — chart your own constellation.** Owner: "a bunch of different stars that all have different effects, and you combine them into a small global buff. You can research parts of the sky to unlock more stars and watch certain stars to level up their bonus. Then chart your final constellation for the buff. Progression can include number of star slots on the constellation, unlocking new stars, and ranking up their effects."
  - Read as: each star is its own small effect (for example more ore, faster crafting, more boss loot, more life). **Researching** a region of the sky unlocks new stars; **watching** a star ranks up its effect. The player charts one constellation from the stars they have, and it gives a small global buff made of those stars' effects.
  - Three progression tracks: more star slots in the constellation, more stars unlocked, and higher star ranks.
- **Question 2a, how many constellations (2026-11-21): A — One charted constellation.** A single constellation; recharting costs a little Stardust, so choosing stars is a real commitment.
- **Question 2b, lines between stars (2026-11-21): B — Linked stars feed each other.** Stars joined by a line strengthen each other (two linked Mining stars are stronger together), and some stars only work next to a certain kind of star. Charting is a small layout puzzle.
- **Question 3a, active play (2026-11-21): A — Focus the telescope.** The watched star starts blurry; turn a focus ring and stop where it's sharpest. Spot on is a double, close a hit, a bit soft weak, a smudge a miss. Calm, no timer. Replaces the shooting-star tap.
- **Question 3b, levels 80–99 (2026-11-21): Both.** **Deep-sky wonders:** the furthest sky regions hold rare rule-bending stars (a nova, a binary pair, a black star), such as one that boosts every star linked to it or one that fills two slots. **The Great Chart:** at high levels the constellation expands into a much larger chart with many more slots to fill.
- **Question 3c, rare chase (2026-11-21): Both.** **Fallen stars:** a very rare meteorite falls while watching and becomes a one-of-a-kind star with a unique, slightly rolled effect that research can't give. **Gilded Stardust** stays as a rare currency that pushes star ranks past their normal maximum.
- **Steady chase** (decided on the owner's behalf, from their Question 1 answer): the three tracks themselves: more slots, more stars and higher ranks.
- **Hidden collectibles** (decided on the owner's behalf): each sky region is a skilling zone with one hidden find, such as an old astronomer's note tucked in the margins of the star atlas. No gameplay effect.
- **Question 4a, main view (2026-11-21): A — Your night sky.** The constellation is drawn across a dark sky in the centre, lines and lit stars; unlocked stars sit in a tray to place into slots, showing how links change the buff. Research, watching and the telescope are tabs alongside.
- **Question 4b, coming back (2026-11-21): B — An observation log.** A plain written list of what happened while away: regions researched, stars ranked up, new stars and any fallen star.
- **Question 4c, total skill level (2026-11-21): A — Count it.** Astrology becomes a full skill: it counts toward total skill level and skilling-tree points, and gets achievements and a skilling-tree branch.

## Decided on the owner's behalf

- Researching and watching are the two idle activities, replacing constellation studies. Both run offline.
- Existing saves move over without losses: studied constellations become researched sky regions, and lit Star Chart stars become unlocked stars at a matching rank. Stardust and Gilded Stardust balances carry over. The old permanent +2% profession speeds are replaced by the charted constellation's buff.
- Each sky region is a skilling zone with one hidden collectible.
- Which stars exist, their effects and link rules, slot counts by level, recharting cost, ranks and fallen-star rolls are tuning, set at build time on how they play.

## Implementation spec

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Numbers are starting values. Files: `src/data/astrology.ts`, `src/engine/astrology.ts`, `src/ui/components/StarChart.tsx` (replaced).

### Sky regions (research)

- Seven regions replace the 14 constellation studies. Each takes two of the old constellations' names and art.
- A region unlocks at its level: 1, 15, 30, 45, 60, 75 and 90.
- **Research region** is an action. It uses the interval, XP, Stardust and 1.5% Gilded Stardust chance of the older of its two old studies.
- Each completion adds 1 research point to the region. Its four stars unlock at 25, 100, 250 and 500 points.
- Three **deep-sky regions** hold one wonder each and unlock at levels 80, 88 and 95. Each needs 1,000 research points.
- Each region, deep-sky ones included, is a collectible zone.

### Stars

- Each region has four stars, 28 in all. Each star has a **family**, an effect and a value at rank 1.
- A star's effect is `value × rank`. Ranks run 1–10, or up to 15 with Gilded Stardust.

| Family | Stars (effect at rank 1) |
|---|---|
| One per skill (12 stars) | "+0.5% <skill> yield" for gathering skills, "+0.5% <skill> speed" for production skills |
| Combat (6) | +0.5% maximum life · +0.4% all resistances · +0.4% damage · +0.3% attack and cast speed · +0.5% armour and evasion · +0.2% movement speed |
| Wealth (4) | +0.5% gold found · +0.4% item rarity · +0.3% currency drops · +0.3% map drops |
| Skilling (3) | +0.5% skill XP · +1% offline skilling speed · +2% collectible chance |
| Conditional (3) | **Forgefire:** +1% Smelting purity odds, works only if linked to a Smelting or Forging star · **Greenroot:** +1% Foraging mutation chance, needs a Foraging star · **Wardlight:** +1% all resistances, needs two Combat stars |

- Spread the families so every region mixes skills: each region gets 1–2 skill stars, 1 combat star and 1 other.
- **Watch star** is an action, one star at a time. Each completion takes 6 s and gives 1 star XP.
  - Rank `r` needs `20 × r²` star XP after rank `r − 1`, so rank 10 takes about 13 hours per star.
  - Ranks 11–15 also need 1 Gilded Stardust each.
- Old Stardust costs move to: recharting (below), and 50 Stardust per rank-up to start the next rank.

### The constellation (one chart)

- **Slots:** 3 at level 1, +1 at 20, 35, 50, 65 and 80, for 8 total. At level 85 the **Great Chart** opens with 12 slots, and at level 95 with 14.
- Slot positions and their possible lines are a fixed layout per size, stored in data. A line is active when both of its slots are filled.
- **Effects:**
  - Each placed star gives its effect.
  - Each active line between two stars of the same family gives both +25% (summed per line).
  - A conditional star only works when its condition is met through active lines.
- **Recharting:** moving, removing or swapping a star costs 200 Stardust per slot changed. Filling an empty slot is free.
- The constellation's total buff applies everywhere: combat, skilling, loot.

### Deep-sky wonders (levels 80–99)

Each unlocks with its deep-sky region:

| Wonder | Effect |
|---|---|
| Nova | every star linked to it gets +50% effect |
| Binary Pair | fills two adjacent slots, counts as one star of each neighbour's family for lines, and gives +1% skill XP per rank |
| Black Star | every other star −10%, but each active line gives +50% instead of +25% |

Wonders rank like other stars.

### Rare chase

- **Fallen stars:** each watch completion has a 1 in 4,000 chance of a fallen star. It's a unique star instance with an effect from the fallen table, rolled at 80–120% of its listed value.
  - Fallen table: +1% to every gathering skill's yield; +1% to every production skill's speed; +1% to all damage and life; +2% to item rarity and gold; and +3% to skill XP.
  - A fallen star has no family. It counts as matching any family for lines, and it doesn't rank up.
- **Gilded Stardust:** pushes ranks past 10, as above.

### Focus minigame: focus the telescope

- The star shows as a blurred disc. The player drags (or holds the arrow buttons) to turn a focus ring from 0 to 1, and releases to lock it.
- The blur radius is proportional to `|position − f*|`, where `f*` is a hidden target rolled each attempt.
- Results by offset:
  - Up to 0.03 is a **double**.
  - Up to 0.09 is a **hit**.
  - Up to 0.15 is **weak**.
  - More than that is a **miss**.
- This matches the middle-third rule. Scoring function: `focusResult(offset: number)`.
- The telescope shows while Research or Watch is running.

### Counting it as a full skill

- Astrology counts toward total skill level, skilling-tree points and Skills achievements.
- Add level 50 and 99 Astrology achievements, matching other skills' pattern.
- It gets a branch in the new skilling tree.

### State

`GameState.astrology`:

- `regions: Record<regionId, { research: number }>`
- `stars: Record<starId, { rank: number; xp: number }>` (unlocked stars only)
- `fallen: { uid: string; effect: string; value: number }[]`
- `chart: { slots: (string | null)[] }`. Entries are star ids or fallen uids, and the slot count comes from level.
- `log: string[]` (last 200)

The old `stars: Record<constellationId, number>` is removed.

### Screen

- **Chart** (default tab):
  - A dark sky with the slot layout, filled slots shown as glowing stars and active lines drawn between them.
  - A tray of unlocked stars below, each showing its rank and effect. Tap a star, then a slot, to place it; the Stardust cost shows before confirming.
  - A summary panel lists the total buff line by line.
- Other tabs: **Research** (region list with progress to the next star), **Watch** (star list with rank bars) and **Fallen** (fallen stars owned).
- The telescope sits beside the running action.

### Coming back: observation log

A plain list:

- research points and stars unlocked per region
- rank-ups
- Stardust and Gilded Stardust found
- any fallen star (in bold)

### Migration

- Each old constellation maps to its region. A region's research starts at the points needed for as many stars as the old constellation pair had lit in total, up to 4.
- Those stars start at rank `2 × average stars lit` (maximum 10).
- Stardust and Gilded Stardust carry over.
- The old per-star profession speed and combat stats are removed.
- The constellation starts empty. A one-time notice tells the player to chart it, and the first fill is free.
- Old study task-mastery tracks convert to `research_<region>`, taking the highest of the pair.

### Tests

- Region star unlock thresholds.
- Rank XP curve and Gilded ranks.
- Slot counts by level, including the Great Chart.
- Line bonus math.
- Conditional stars.
- The three wonders.
- Recharting cost.
- Fallen star roll and how it matches families.
- `focusResult` boundaries.
- Total level now including Astrology.
- Migration.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build Astrology as Chart your own constellation".

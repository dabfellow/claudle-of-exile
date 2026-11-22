# Gemcutting: Facet by facet

Design pass 2026-11-21. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md). Gemcutting today: cuts rough gems into active and support gems from reachable pools, with family cuts, exact cuts and recycling.

**How this pass was run:** owner asked (2026-11-21) that for the remaining production skills I answer every question with my own pick and present the full set for review.

## Decisions (my picks, approved by the owner 2026-11-21)

- **Question 1, core twist: A — Facet by facet.** A rough gem has a size (carats). Every carat is room for one facet, and each facet you cut adds a property to the finished gem: extra quality, an extra level, a stronger alternate quality, lower mana cost, a wider area. Bigger rough means more facets. The craft is choosing which facets go on this gem. Chosen over B (cut around hidden flaws inside the stone), which is too close to Archaeology's brushing around fragile cracks.
- **Question 2a, facet choices: A — Gem-type facets.** Each gem family (fire spells, projectile attacks, auras, supports) has its own facet list, with a few shared facets. Chosen over B (one shared facet list), which makes every gem the same.
- **Question 2b, where size comes from: A — From the rough.** Rough gems drop at different sizes; Mining's Crystal-bearing layers give bigger rough. Re-cutting a gem removes its facets and gives back a smaller rough (folding in today's recycling). Chosen over B (size from Gemcutting level only).
- **Question 3a, active play: A — Line up the angle.** The gem turns on the dop stick; tap when the facet line lines up with the guide. Exactly aligned is a double, close a hit, off weak, way off a miss. Chosen over B (grind at the right pressure), which is close to Smelting's bellows.
- **Question 3b, idle and offline: A — Saved cut plans.** Save a facet plan per gem; idle and offline cutting applies the plan to each rough that fits it. Chosen over B (only plain cuts offline).
- **Question 4a, levels 80–99: A — Named cuts.** Legendary cut patterns (the Heart Cut, the Crown Cut, the Starburst) each unlock a facet no ordinary cut can take, such as a support gem that supports two skills. Chosen over B (more facets per carat).
- **Question 4b, steady chase: A — The cut catalogue.** Every new gem and facet combination cut is recorded; filling families unlocks Gemcutting perks such as an extra facet on small rough. Chosen over B (cutting wheel upgrades), which repeats the equipment chases.
- **Question 4c, rare chase: A — A star stone.** A very rare rough with a star inside; cut well, it takes one extra facet of any family's list. Chosen over B (a rare doubled gem).
- **Question 5a, main view: A — The loupe.** The gem large in the centre, its facets drawn on it as you add them, with the facet list beside it and the dop stick below. Catalogue and recipes are tabs.
- **Question 5b, coming back: A — The gem tray.** Gems cut while away laid out in a velvet tray with their facets listed; star stones shine.

## Decided on the owner's behalf

- Family cuts and exact cuts stay as ways to choose which gem the rough becomes; facets add to that.
- One hidden collectible at the cutting wheel, such as a jeweller's lost loupe.
- Existing gems keep their stats as gems with no facets; existing rough keeps its tier and gets a size.
- Facet lists, carat ranges and star stone odds are tuning, set at build time.

## Implementation spec

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Numbers are starting values. Files: `src/data/gemcutting.ts`, `src/engine/gemcutting.ts`, `cutGem` in `src/engine/skills.ts`, gem instances in `src/engine/types.ts`.

### Rough sizes (carats)

| Item id | Carats | Normal drop share |
|---|---|---|
| `rough_gem_small` | 1 | 30% |
| `rough_gem` (stays the standard id) | 2 | 50% |
| `rough_gem_large` | 3 | 18% |
| `rough_gem_huge` | 4 | 2% |
| `rough_gem_giant` | 5 | caverns and Lapidary only |

- Anything that drops `rough_gem` today now rolls a size from this table.
- Rough from a Crystal-bearing Delve layer, or from Heists with the Fence's Eye bridge, rolls one size larger. Motherlode layers roll two sizes larger.
- **Star stones** are `rough_gem_star`: 3 carats plus one wild facet slot. Any rough gem roll has a 1 in 1,000 chance to be one.
- Recipes that use rough gems ask for N rough of one chosen size, using the same counts as today. The finished gem's **facet slots equal the carats** of that size.

### Facets

- `SkillGemInstance` and `SupportGemInstance` gain `facets: string[]`. Facets are picked before cutting, from the gem family's list plus the shared list.
- A facet can be taken up to twice, except Clarity, which is once only.

| List | Facets (effect each time) |
|---|---|
| Shared | Clarity (+1 gem level, once) · Polish (+10% gem XP gain) · Economy (−8% mana cost) |
| Attack | Edge (+8% attack damage) · Swift (+5% attack speed) · Pierce (+10% projectile speed) |
| Elemental | Brilliance (+8% spell damage) · Conduit (+4% elemental penetration) · Wide (+12% area) |
| Summon | Kinship (+10% minion life) · Fury (+8% minion damage) · Pace (+5% minion speed) |
| Defence | Bulwark (+8% effect) · Lasting (+15% duration) · Quickcast (+8% cast speed) |
| Damage support | Keen (+5% to the support's damage effect) · Steady (−5% mana multiplier) · Twin (+4% damage to the supported skill) |

- **Recut:** removing a gem's facets gives back one rough a size smaller (size 1 gives nothing).
- Today's recycling recipes stay.

### Named cuts (levels 80–99)

- A named cut is a cutting option that needs 12 rough of 4 carats or more. It adds one extra slot that only takes its special facet:
  - **Heart Cut (80):** Heartfire, +15% damage and +10% mana cost.
  - **Crown Cut (88):** Sovereign, +25% support effect. Support gems only.
  - **Starburst (95):** Radiant, +2 gem levels.

### Saved cut plans (idle and offline)

- A plan is `{ id, kind, facets: string[] }`. Idle cutting applies the active plan for that gem kind and takes as many facets from the front of its list as the rough's carats allow.
- 3 plan slots, plus catalogue perks.

### Focus minigame: line up the angle

- The gem turns on the dop stick at a steady speed: one turn per 2.4 s, falling evenly to 1.6 s at level 99. A fixed guide line sits beside it.
- Tap when the facet line on the gem lines up with the guide. The score is the angle error:
  - Up to 3° is a **double**.
  - Up to 9° is a **hit**.
  - Up to 18° is **weak**.
  - More is a **miss**.
- Scoring function: `angleResult(errorDeg: number)`.

### Steady chase: the cut catalogue

- Records each distinct (gem id, sorted facets) combination cut.
- Perks:

  | Entries | Perk |
  |---|---|
  | 10 | +1 plan slot |
  | 25 | size-1 rough counts as 2 carats |
  | 50 | Arcane Dust cost −10% |
  | 100 | star stone chance ×1.5 |
  | 200 | cutting speed +10% |

### What stays

Random, family and exact cuts stay as ways of choosing which gem the rough becomes. Facets are added on top.

### State

`GameState.gemcutting`:

- `plans: CutPlan[]`
- `active: Record<kind, string | null>`
- `catalogue: string[]`

### Screen

- **Loupe** tab:
  - The gem drawn large, with filled facets shown as cut faces.
  - The facet list beside it, with tap to add or remove and the effect text.
  - A rough size picker that shows how many slots it gives.
  - The dop-stick game below.
- Other tabs: **Recipes**, **Plans** and **Catalogue**.

### Coming back: the gem tray

- A velvet tray of the gems cut while away, each with its facets listed.
- Star-stone gems shine.

### Migration

- The existing `rough_gem` stack stays as 2-carat standard rough.
- Existing gems get `facets: []`.
- Recipes and task mastery are unchanged.

### Tests

- Size roll shares and the Crystal and Motherlode shift.
- Facet slots equal carats, and star stones get the wild slot.
- Facet caps (Clarity once, others twice).
- Each facet effect applied in stats.
- Recut returning a smaller size.
- Named cut gates.
- The plan applied offline with too few slots.
- `angleResult` boundaries.
- Catalogue perks.
- Migration.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build the remaining production twists".

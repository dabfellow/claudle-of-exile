# Woodcrafting: Tuned to the wielder

Design pass 2026-11-21. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md). Woodcrafting today: carves logs and planks into staves, wands, bows, cloth robes and leather gear (cheap bases and purpose gear), plus Heartwood and Convergence Frames for unique projects; the drawknife tool.

**How this pass was run:** owner asked (2026-11-21) that for the remaining production skills I answer every question with my own pick and present the full set for review.

## Decisions (my picks, approved by the owner 2026-11-21)

- **Question 1, core twist: A — Tuned to the wielder.** Every bow, staff, wand and robe has tuning dials that trade one thing for another: a bow's draw weight (harder hitting or faster shooting), a staff's balance (spell power or cast speed), a robe's cut (more energy shield or more evasion). You set the dials before carving, and the piece comes out tuned that way. Higher levels widen how far each dial can go. Chosen over B (reading the grain to cut the best piece from each log), which is too close to Woodcutting's log splitting.
- **Question 2a, how dials work: A — Trade-offs, not free power.** Turning one way gains as much as it costs the other; the skill is fitting the piece to your build. Chosen over B (dials only add), which makes the max setting the only answer.
- **Question 2b, where the dials come from: A — The wood decides the dials.** Each wood offers its own dials: yew gives draw weight and flex, ironwood gives balance and heft, legendary woods from Woodcutting's giants add a rare third dial. Leather and cloth offer cut and padding. Chosen over B (same dials on every wood).
- **Question 3a, active play: A — Follow the curve.** Draw the drawknife along a marked curve (bow limb, staff taper); stay on the line. Close the whole way is a double, mostly on a hit, wobbly weak, off the line a miss. Chosen over B (steam-bend to a target angle), which feels like Smelting's bellows and Astrology's telescope.
- **Question 3b, idle and offline: A — Saved tunings.** Save a set of dial positions as a tuning; idle and offline carving uses it. Chosen over B (neutral tuning offline).
- **Question 4a, levels 80–99: A — Living woods.** Wood from Woodcutting's legendary giants and the World Tree carves pieces whose dials keep shifting slightly as you use them, settling over time into a shape that suits how you play. Chosen over B (wider dials only).
- **Question 4b, steady chase: A — Jigs.** Build workshop jigs, one per item family (bow jig, staff lathe, robe form), each in tiers: wider dial range, a second dial, saved tunings. Chosen over B (a record of every tuning made).
- **Question 4c, rare chase: A — A perfectly balanced piece.** Very rarely a piece comes out perfectly balanced: one of its dials gives its gain without its cost. Chosen over B (a rare extra mod).
- **Question 5a, main view: A — The workbench.** The piece in the middle with its dials beneath it showing how each setting changes its stats; the drawknife curve sits beside it. Jigs and recipes are tabs.
- **Question 5b, coming back: A — Finished pieces on the bench.** Each piece made while away laid out with its tuning noted, perfectly balanced ones marked.

## Decided on the owner's behalf

- Purpose gear's guaranteed stats stay; dials sit on top of them.
- One hidden collectible at the workbench, such as a carved toy left in the shavings.
- Existing items, frames, drawknife and projects are unchanged; current recipes start at neutral tuning.
- Dial ranges, which woods give which dials and perfect-balance odds are tuning, set at build time.

## Implementation spec

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Numbers are starting values. Files: Woodcrafting recipes in `src/data/skills.ts` and `src/data/smithing.ts` (frames, purpose recipes), and a new `src/engine/woodcrafting.ts`.

### Dials

- Every Woodcrafting craft that makes an item has 1–3 dials. Each dial has two sides (A and B) and a position from −max to +max in whole steps. 0 is neutral.
- At position `p`, the item gets an implicit of `+4% × |p|` on the chosen side and `−4% × |p|` on the other. That side's mod group also rolls with weight `×(1 + 0.5 × |p|)`.

| Family | Dial 1 (level 1) | Dial 2 (tier-2+ material) | Dial 3 (legendary wood only) |
|---|---|---|---|
| Bows | Draw weight: physical damage ↔ attack speed | Flex: crit chance ↔ accuracy | Fletching: elemental damage ↔ projectile speed |
| Staves | Balance: spell damage ↔ cast speed | Heft: block chance ↔ energy shield | Channel: mana regeneration ↔ maximum mana |
| Wands | Balance: spell damage ↔ cast speed | Spark: crit chance ↔ crit multiplier | Channel: mana regeneration ↔ maximum mana |
| Cloth (robes, gloves, boots, helmets) | Cut: energy shield ↔ evasion | Padding: life ↔ mana | Weave: resistances ↔ movement speed |
| Leather | Cut: evasion ↔ armour | Padding: life ↔ mana | Stitching: life regeneration ↔ maximum life |

- **Material tier:** ash and the lowest cloth and leather are tier 1. Oak and up are tier 2+.
- A legendary wood (`legend_heartwood` as an extra input) adds dial 3.
- **Range:**
  - Maximum `|p|` is 2 at level 1 and 3 at level 40.
  - Each jig tier adds +1 for its family (see below).
  - The cap is 6.

### Saved tunings (idle and offline)

- A tuning is `{ id, family, dials: number[] }`. Each family has one active tuning. Without one, idle crafting uses neutral (0).
- You can save 2 tunings per family, plus jig tier 2.

### Focus minigame: follow the curve

- A curve is drawn across a piece of wood: a bow limb, a staff taper or a robe seam. The player drags from the start to the end marker within 4 s.
- The score is the average distance from the line, as a fraction of the curve box's height:
  - Up to 0.03 is a **double**.
  - Up to 0.09 is a **hit**.
  - Up to 0.15 is **weak**.
  - More than that, lifting early or running out of time is a **miss**.
- Scoring function: `curveResult(avgDeviation: number, completed: boolean)`.

### Jigs (steady chase)

Three jigs, each with three tiers, built from planks:

- **Families:** the Bow jig covers bows, the Staff lathe covers staves and wands, and the Robe form covers cloth and leather.
- **Tiers:**

  | Tier | Level | Cost | Effect |
  |---|---|---|---|
  | 1 | 20 | 100 oak planks | +1 dial range |
  | 2 | 50 | 200 ironwood planks | +1 saved tuning, and dial 2 range +1 |
  | 3 | 75 | 300 spirit planks | +1 dial range |

### Living woods (levels 80–99)

- From level 80, any craft can add 1 `legend_heartwood` (from Woodcutting's legends). The item becomes **Living**:
  - It gets dial 3.
  - It grows 1 **growth** per hour equipped while fighting, up to 10.
  - Each growth adds +5% to the dial implicits on the sides it's set to.
- Re-tuning a Living item at the bench is free but halves its growth.
- Until Woodcutting ships, living woods stay locked.

### Rare chase: perfectly balanced

- Each craft has a 1 in 400 chance to come out perfectly balanced. One random non-neutral dial keeps its gain and loses its cost.
- The item is marked "Perfectly balanced".

### What stays

- Purpose recipes keep their two guaranteed stats, with dials on top. Bar purity applies through `barPurityBonus`.
- Heartwood and Convergence Frames, the drawknife and projects are unchanged.

### State

`GameState.woodcrafting`:

- `tunings: Tuning[]`
- `active: Record<family, string | null>`
- `jigs: { bow: number; lathe: number; form: number }`
- `stats: { balanced: number }`

Item instances gain `dials?: number[]`, `living?: { growth: number }` and `balanced?: number`. The last is the index of the cost-free dial.

### Screen

- **Workbench** tab:
  - The piece in the middle, drawn simply.
  - Its dials below as labelled sliders, side A on the left and side B on the right, with the stat change shown live as you move them.
  - **Save tuning** and a tuning dropdown.
  - The curve game beside the piece.
- Other tabs: **Recipes**, **Jigs** and **Tunings**.

### Coming back

- A list of the pieces made while away, each with its tuning.
- Perfectly balanced pieces are marked.

### Migration

- Existing items have no dials (counted as neutral).
- Recipes and task mastery are unchanged.
- Each player starts with neutral tunings.

### Tests

- Dial implicit math, including the trade-off symmetry.
- Range by level and jig.
- Which dials are available by material and legendary wood.
- Tuning repetition offline.
- `curveResult` boundaries.
- Living growth and re-tune halving.
- Perfectly balanced removing only the cost.
- Purpose guarantees surviving.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build the remaining production twists".

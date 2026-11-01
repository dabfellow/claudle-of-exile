# Skilling Rework — life skills as the crafting economy

Goes with [GDD.md](GDD.md) §5 and [TREES.md](TREES.md) §2. **The Lv 1–20 band is built**; later bands are placeholders.

**Design reset (2026-10-30), not built yet:** skill levels are per character, and skilling stays one activity at a time
but always runs offline at full speed. Skill 99 stays around 53 days of nonstop training on the best node. High level
passive nodes give rare crafting materials, which also drop rarely from monsters and map themes. Those materials can
force an exact mod at a high price, or roll past normal limits with a risk of damaging or destroying the item.

Right now every life skill works the same way: pick the highest node or recipe you've unlocked, wait. Gathering
gives one plain material, Smithing makes plain normal bases, Alchemy makes a few low orbs. Nothing you gather
changes *what* you can craft. It's one-dimensional.

The rework gives skilling a clear job: **combat finds things, skilling makes things on purpose.**

| Loop | What it's for |
|---|---|
| **Combat** | Chase drops: uniques, rare orbs (Chaos, Exalted, Divine, Annulment, Expansion), items on random bases. |
| **Skilling** | The exact base you want, materials that **steer** or **force** mods, and low/mid currency **in bulk** so you can spam crafts. |

A finished item usually takes both: smith the base, steer it with skilling materials, finish it with a combat orb.

Rules this keeps:
- **Idle by default, faster by hand.** Depth comes from *what* you gather and *what* you target. Nothing needs clicking mid-action and offline is worth the same as idling online; playing a mini-game only adds on top (§9).
- **Light crossover.** Each loop can progress through a band on its own. Some things move both ways, but neither *needs* the other.
- **Built in bands.** What exists now is the Lv 1–20 baseline. Everything below is a template that repeats each band; this doc fills in Lv 1–20 only.

---

## Overview

| Skill | Today | After the rework |
|---|---|---|
| Mining | Ore + Rough Gem chance | Ore + **Fossils** (bias which mods roll) |
| Woodcutting | Logs | Logs + **Resin** (raise item level of smithed bases) + a bit of Arcane Dust |
| Harvesting | Herbs | Herbs + **Essences** (force one specific mod) |
| Smithing | Pick a base, get it at your ilvl | Same, plus a **catalyst slot** for a Fossil or Resin |
| Alchemy | Flasks + 6 low orbs | Flasks + **bulk orbs**: batch recipes, shard fusing |
| Gemcutting | Random gems | Unchanged for now (see Open questions) |
| *Crafting Bench* | Apply orbs one click at a time | New idle activity: **Craft until…** |

Every gathering skill gets **alternate nodes**: same base material, different secondary drop. You pick a node for
what you want to craft, not just because it's the highest level.

---

## 1. Gathering → crafting materials

Secondary drops use the existing `bonus` field on `SkillAction` (`src/data/skills.ts`), so the "chance" columns
below are per action. Alternate nodes give **less** base material (shown as yield) in exchange for a much higher
secondary rate.

### Mining → Fossils (bias)

A Fossil is spent alongside an orb, or in a Smithing catalyst slot. For that one roll it multiplies affix spawn
weights by group. It hooks into `spawnWeight()` in `src/engine/items.ts`, which already reads `AffixDef.weights`.

| Fossil | More likely (×) | Never rolls (×0) |
|---|---|---|
| Scorched | `added_fire`, `fire_res` ×5 | `added_cold`, `cold_res` |
| Frigid | `added_cold`, `cold_res` ×5 | `added_fire`, `fire_res` |
| Metallic | `added_light`, `light_res` ×5 | `added_phys`, `inc_phys` |
| Dense | `flat_armour`, `inc_armour`, `flat_evasion`, `inc_evasion`, `flat_es`, `inc_es` ×4 | `added_phys`, `added_fire`, `added_cold`, `added_light` |
| Serrated | `added_phys`, `inc_phys`, `attack_speed`, `crit_chance`, `crit_multi` ×3 | all defence groups |

| Node | Lv | Area | Time | Yield | Secondary |
|---|---|---|---|---|---|
| Copper Vein *(exists)* | 1 | — | 3.0s | 1 Copper Ore | 2% Rough Gem |
| Scorched Seam | 5 | — | 3.5s | ½ Copper Ore (50% chance) | 8% Scorched Fossil |
| Frigid Seam | 9 | — | 3.5s | ½ Copper Ore | 8% Frigid Fossil |
| Iron Vein *(exists)* | 15 | Ashwood | 3.5s | 1 Iron Ore | 3% Rough Gem, 3% Dense Fossil |
| Storm-struck Vein | 17 | Ashwood | 4.0s | ½ Iron Ore | 8% Metallic Fossil |
| Jagged Vein | 19 | Ashwood | 4.0s | ½ Iron Ore | 8% Serrated Fossil |

### Harvesting → Essences (force)

An Essence is applied at the bench (or in Craft until…). It turns a **normal** item into a **magic** item with one
**guaranteed** mod at a fixed tier; the other affix slot rolls randomly. On a magic item it rerolls like an
Alteration but keeps the forced mod. Essence tier follows herb tier.

| Essence | Forced mod | Lesser tier (Sunpetal band) | Greater tier (Frostleaf band) |
|---|---|---|---|
| Vitality | `flat_life` | ilvl-1 tier | ilvl-8 tier |
| Embers | `fire_res` | ilvl-1 tier | ilvl-8 tier |
| Frost | `cold_res` | ilvl-1 tier | ilvl-8 tier |
| Storm | `light_res` | ilvl-1 tier | ilvl-8 tier |
| Haste | `attack_speed` | — | ilvl-8 tier |

| Node | Lv | Area | Time | Yield | Secondary |
|---|---|---|---|---|---|
| Sunpetal Patch *(exists)* | 1 | — | 3.0s | 1 Sunpetal | 6% Lesser Essence of Vitality |
| Emberbloom Bed | 6 | — | 3.5s | ½ Sunpetal | 6% Lesser Essence of Embers, 6% Lesser Storm |
| Frostleaf Thicket *(exists)* | 12 | Ashwood | 3.5s | 1 Frostleaf | 5% Greater Frost, 2% Greater Vitality |
| Windreed Marsh | 16 | Ashwood | 4.0s | ½ Frostleaf | 5% Greater Embers, 5% Greater Storm, 2% Greater Haste |

### Woodcutting → Resin (item level) and Dust

Resin goes in a Smithing catalyst slot and raises the smithed base's item level. It **can't** go past the
campaign cap in `smithIlvlCap()` (`src/engine/skills.ts`), so it's a way to hit the cap earlier, not to break it.

| Node | Lv | Area | Time | Yield | Secondary |
|---|---|---|---|---|---|
| Ash Tree *(exists)* | 1 | — | 3.0s | 1 Ash Log | 3% Ash Resin (+2 ilvl) |
| Ley-touched Ash | 8 | — | 3.5s | ½ Ash Log | 1 Arcane Dust every chop, 4% Ash Resin |
| Oak Tree *(exists)* | 15 | Ashwood | 3.5s | 1 Oak Log | 3% Oak Resin (+4 ilvl) |
| Weeping Oak | 18 | Ashwood | 4.0s | ½ Oak Log | 10% Oak Resin |

Ley-touched Ash is the skilling-only route to Arcane Dust. Salvage stays the faster source; that's the crossover.

### Orb shards (all gathering)

Every gathering action has a **2%** chance to drop a shard. Alchemy fuses **20 shards → 1 orb** (1.0s, no other
inputs). At ~1,100 actions an hour, that's about one free orb an hour on top of everything else.

| Skill | Shard |
|---|---|
| Mining | Augmentation Shard |
| Woodcutting | Transmutation Shard |
| Harvesting | Alteration Shard |

---

## 2. Smithing → force the base

Smithing already lets you pick any base up to your level. What's missing is control over what rolls on it.

- **Catalyst slot.** Each smith action takes up to one Fossil **and** one Resin. The Resin raises the base's ilvl (capped). The Fossil applies to the roll if the base comes out magic, through the existing Masterwork / Grandmaster Smith chance.
- **Repeat until.** With a Fossil loaded, a smith action can be told to keep going until a magic base rolls a mod from the Fossil's list. Anything else goes to the inventory as normal (or straight to salvage, if you tick that).

Example: a level-17 player wants a fire-res ring. They smith a ring with Scorched Fossil + Oak Resin, at Masterwork's
10% magic chance. Out comes an ilvl-cap ring where fire res is far more likely and cold res can't roll.

---

## 3. Alchemy → currency for mass crafting

Alchemy becomes the bulk orb maker.

- **Batch recipes.** Every orb recipe gets a ×10 version: **8.5×** the inputs, **10×** the time, gives 10 orbs. That's 15% cheaper, for players who queue a long idle session.
- **Shard fusing** (see §1).
- **Combat-only line.** Exalted, Divine, Annulment and Expansion never come from Alchemy. Later bands add Chaos and Regal recipes at a high material cost, so skilling can *supplement* them, never replace drops.

Lv 1–20 orb recipes (existing ones plus batch versions):

| Recipe | Lv | Inputs (×1) | Batch ×10 inputs |
|---|---|---|---|
| Orb of Transmutation | 1 | 3 Dust, 2 Sunpetal | 26 Dust, 17 Sunpetal |
| Orb of Augmentation | 6 | 4 Dust, 3 Sunpetal | 34 Dust, 26 Sunpetal |
| Orb of Alteration | 10 | 5 Dust, 2 Frostleaf | 43 Dust, 17 Frostleaf |
| Orb of Scouring | 18 | 10 Dust, 3 Frostleaf | 85 Dust, 26 Frostleaf |
| Shard fusing | 1 | 20 shards | — |

---

## 4. Craft until… (the payoff)

A new idle activity at the Crafting Bench. It's where bulk skilling currency gets spent, and it's all decisions.

1. Pick an item from the inventory (it's locked while the craft runs).
2. Pick a method: **Alteration**, **Alteration + Fossil**, **Essence**, or later **Chaos** / **Chaos + Fossil**.
3. Pick a stop rule:
   - has mod X
   - has mod X at tier ≥ N
   - has 2 of a chosen set of mods
4. It runs on a timer like a skilling action (**1.5s per step**), spends one orb (and Fossil, if used) per step, and stops when the rule matches or the materials run out.

It runs offline like any other activity. It replaces the current activity (same as starting a skill), and it
reuses `applyOrb()` / `orbReason()` from `src/engine/crafting.ts` for each step.

Why it matters: 300 Alterations from an idle night are worthless one click at a time. With Craft until… they turn into
"wake up to a ring with T-high fire res and life", which is the whole point of making currency in bulk.

---

## 5. Light crossover

| Direction | What moves |
|---|---|
| Combat → skilling | Salvage → Arcane Dust *(exists)*. Act bosses drop 1–2 Fossils/Essences of their element. |
| Skilling → combat | Crafted gear, flasks *(exists)*, steered rares. |
| Neither | Clearing a band never needs the other loop. Combat-only players craft with drops; skilling-only players get a slower trickle of Dust. |

---

## 6. Band template

Each future band (Lv 20–40 for Act 2, and so on) adds one row of each. Lv 1–20 is the baseline above.

| Per band | Lv 1–20 (this doc) | Lv 20–40 (placeholder) |
|---|---|---|
| Ore / log / herb tier | Copper, Iron · Ash, Oak · Sunpetal, Frostleaf | Mithril · Yew · Emberroot |
| Alternate nodes per gathering skill | 2 per tier | 2 per tier |
| Fossils | Scorched, Frigid, Metallic, Dense, Serrated | e.g. Aberrant (chaos), Pristine (life), Shuddering (speed) |
| Essence tier | Lesser, Greater | Screaming (ilvl-25 tier), new mods |
| Resin tier | Ash (+2), Oak (+4) | Yew (+6) |
| Alchemy orbs | Trans, Aug, Alt, Scour + batches | Regret, Alch, Regal, Chaos (expensive) + batches |
| Craft until… methods | Alteration, Alt + Fossil, Essence | Chaos, Chaos + Fossil |
| Skilling tree | 1 notable per skill aimed at its material | 1 more per skill |

---

## 7. Skilling tree changes ([TREES.md](TREES.md) §2)

Swap one notable per branch for one that works with the new materials. Speed smalls and keystones stay.

| Branch | Replaces | New notable | Effect |
|---|---|---|---|
| Mining | Rich Veins | **Fossil Hunter** | +50% Fossil chance |
| Woodcutting | Clean Cuts | **Sap Tapper** | +50% Resin chance; Resin gives +1 extra ilvl |
| Harvesting | Bountiful | **Distiller** | Essences have a 10% chance to drop one tier higher |
| Smithing | Fine Steel | **Steady Temper** | 20% chance the catalyst isn't consumed |
| Alchemy | Dust Saver | **Bulk Brewer** | Batch recipes cost 25% less instead of 15% |
| Core | Overtime | **Patient Crafter** | Craft until… has a 10% chance per step not to use the orb |

Overtime's offline speed moves onto the core ring as a small instead of being cut.

---

## 8. Pass 2 (2026-10-25)

- **Harvesting is shown as Foraging** (you pick herbs off the ground; nothing is farmed). The internal id stays `harvesting`, so saves, tree nodes and the Greenhouse are untouched.
- **Smithing is a slow, costly way to target a base**, not a base printer: ore and logs ×3 (`SMITH_COST_MULT`), 10 s + 0.1 s per required level, XP ×2 per action. A weapon is ~45 s of gathering plus a 10 s forge.
- **Gemcutting picks from the whole pool**: one Skill Gem recipe (any of the active gems) and one Support Gem recipe (any general support) instead of three per attribute. 20–30 s each, 3–6 Rough Gems and 30–60 Dust. A save mid-cut on a removed recipe loads with the action stopped.
- **One Skilling group** in the sidebar, gathering above a thin line, production below. Skill pages say "Skilling" instead of "Gathering skill" / "Production skill".
- **Compact activity cards** (Melvor-style): a row with art, name, level · time · XP and a start button; click to expand drops and costs. "Expand all" on each page.
- **Fishing: coming soon, forever.** A real skill id with five spots, catches (Soggy Boot, Message in a Bottle, Tasalio's Scale…) and a skilling-tree branch whose stats are summed and read by nothing. Every spot is blocked with "Coming soon"; its level never counts toward tree points.

### More skills: candidates from Melvor
Not built. One new skill arrives with each act from Act 2 on, and more arrive around or after Act 6. Each feeds its own
game system and also produces materials for the crafting economy (reset, 2026-10-30):
- **Thieving → Heist.** Built: see [HEIST.md](HEIST.md).
- **Archaeology → Expedition.** Dig sites per area for Artifacts that trade for currency or logbook-style rewards.
- **Cartography → Maps.** Maps drop from monsters; Cartography is an optional second route that crafts them, for something like a huge offline map grind.
- **Fletching → Quivers.** Shafts from logs into quivers (quivers don't exist yet).
- **Runecrafting → Rune-carving.** Built: see [RUNES.md](RUNES.md).
- Skipped: Cooking, Firemaking, Farming, Summoning, Agility, Astrology, Township (no PoE hook, or overlap with flasks and the trees).

## 9. Mini-games (2026-10-31)

Manual is always better than idle, and idle is unchanged. Playing fills **Focus** (0–100%), worth up to **+45%** speed on
top of everything else, so materials, drops and XP all rise together. It's in `src/engine/minigame.ts`.

- Focus past full goes into an overflow bar (up to 50%, about 5 s of drain). It adds no speed, but holds you at +45% for a bit.
- Hit +25%, weak hit +5%, miss -10%, drain 10% a second. Misses can't push speed below idle; a missed target that just
  fades costs nothing beyond the drain. Offline ignores Focus and clears it.
- **Mining:** hold to charge, release in a band that shifts each swing. Early is a weak hit, late is a miss.
- **Woodcutting:** swing while a sweeping marker is in the band.
- **Foraging:** click herbs before they wilt.
- Thieving and production aren't built. The plan is a timing bar shared by production, reskinned per skill, and a
  tumbler game for Thieving.

## Open questions

- **Mastery per action** (Melvor-style). Planned for the long tail ([MILESTONES.md](../MILESTONES.md) milestone 11).
- **Gemcutting.** Left as is for now. One option: Gemcutting cuts Rough Gems into **Prisms** that pick a gem's attribute and support/skill type when cutting, so it gets a "force" material like the others.
- **Stash space.** Five fossils, ten essences and three resins add 18 bank ids. They're bank stacks, not inventory items, so no new slots are needed, but the Stash page will need a materials tab.

---

## Engine work

- `src/data/materials.ts`: new `MaterialKind`s `fossil`, `essence`, `resin`, `shard`, with defs for the 1–20 band.
- `src/data/skills.ts`: alternate nodes, secondary drops via `bonus`, fractional yields, batch recipes, shard fusing, a `catalyst` option on smith actions.
- `src/engine/items.ts`: a weight-multiplier map passed into the roll (Fossils); a forced-affix roll (Essences).
- `src/engine/skills.ts`: catalyst handling and "repeat until" in `complete()`; Resin ilvl in `smithIlvl()` (still capped by `smithIlvlCap()`).
- `src/engine/crafting.ts`: Essence and Fossil application; new `{ kind: 'craft' }` action on `s.action`, stepped like `skillStep()`; offline in `src/engine/offline.ts`.
- `src/engine/types.ts` + `src/engine/save.ts`: new action kind, item lock flag, save migration.
- `src/engine/loot.ts`: boss Fossil/Essence drops.
- `src/data/skillTree.ts`: the six notable swaps.
- UI: secondary drops and catalyst picker on `ActionCard` in `src/ui/pages/SkillPage.tsx`; Craft until… panel in `src/ui/pages/BenchPage.tsx`; materials tab in `src/ui/pages/StashPage.tsx`.
- Tests: Fossil weights (×0 really blocks), Essence always forces its mod, Craft until… stop rules and offline, Resin respects the cap, save migration.

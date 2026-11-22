# Skilling rework: build guide

**Read this first** before building any skill from the 2026-11-21 per-skill review. Each skill has its own design doc with an **Implementation spec** section. This guide holds the rules every one of them shares, so the skill docs don't repeat them. If a skill doc and this guide disagree, the skill doc wins for that skill.

Design docs: [Mining](MINING_DELVE.md), [Woodcutting](WOODCUTTING_GIANTS.md), [Foraging](FORAGING_BREEDING.md), [Thieving](THIEVING_CASING.md), [Archaeology](ARCHAEOLOGY_DECIPHERING.md), [Astrology](ASTROLOGY_CONSTELLATIONS.md), [Smelting](SMELTING_FURNACE.md), [Forging](FORGING_STAGES.md), [Woodcrafting](WOODCRAFTING_TUNING.md), [Gemcutting](GEMCUTTING_FACETS.md), [Alchemy](ALCHEMY.md), [Cartography](CARTOGRAPHY.md), [Skilling tree](SKILLING_TREE_REVAMP.md). Removals: Agility, Cooking and Rune-carving (section 9 below).

## 1. Ground rules

- Change only what the skill doc describes. Anything that would move another skill's numbers, combat balance or an unrelated screen goes under `## Ideas / later` in [MILESTONES.md](MILESTONES.md) instead.
- **All numbers in the specs are starting values.** Use them as written. Adjust only if a test or a playtest shows something broken (for example a level band with nothing to do), and note the change in the skill doc.
- Keep simulations minimal. Unit tests, `npm test` and `npm run build` are the checks. Run a sim only if a spec asks for it.
- Never delete an item id that may be in a save. Retired items stay defined (they can be marked legacy and hidden from recipes) or get converted by a save migration.
- Code layout stays as it is: data in `src/data/<skill>.ts`, rules in `src/engine/<skill>.ts`, screen pieces in `src/ui/components/`, the skill page in `src/ui/pages/SkillPage.tsx` (a skill may get its own page component if the doc's screen needs it), tests in `tests/<skill>*.test.ts`.
- Save ids that differ from display names: Foraging is `harvesting`, Forging is `smithing`. Keep the ids.

## 2. The running action and idle time

- One task per visit: the character runs one action at a time (`GameState.action`, see `src/engine/types.ts`). A skill whose design has background clocks (Foraging's Greenhouse, Alchemy's infusions, Astrology's nothing) runs those on their own clocks; the doc says which.
- Everything idle must work offline through the same step functions (`ctx.offline` is true). Offline never gets Focus, doubles or minigame results.
- "Saved plan" features (saved patterns, tunings, cut plans, standing orders, feeding plans) are the only way choices get made while idle. If no plan is saved, idle work uses the doc's stated default.

## 3. Focus minigames

Every skill gets a new minigame that replaces its current one. The engine contract in `src/engine/minigame.ts` stays:

- A game reports one `SwingResult` per attempt: `'double' | 'hit' | 'weak' | 'miss'`, through `minigameSwing(s, result)`.
- Hit and double add 0.25 Focus, weak 0.05, miss takes 0.1. Focus only adds speed (up to `maxFocusSpeed`), drains while here, and is zero offline.
- A double also sets one waiting double on the action (`takeDouble`), so its next finish pays out twice. Doubles don't stack.
- **The double zone is the middle third of the "hit" band** (`DOUBLE_SHARE`, `inDoubleZone`). Every game below defines a hit band; its middle third is the double.

For each new game:

1. Put a pure scoring function and its constants in `src/engine/minigame.ts` (like `strikeResult`, `chargeResult`), taking the measured value and returning a `SwingResult`.
2. Unit-test the boundaries of every result in `tests/minigame.test.ts`.
3. Build the component in `src/ui/components/minigames.tsx` and wire it in `SkillGame`. Remove the old game for that skill.
4. Games are touch and mouse friendly, playable at phone width, readable without colour alone (shape or label too), and show the last result as a word ("Double!", "Hit", "Weak", "Miss").
5. One attempt should take about 1–4 seconds so Focus stays fed with steady play.

The specific games are listed in each skill doc. All are different from each other on purpose; don't reuse one skill's game for another.

## 4. Mastery and chases

- The profession mastery schedule is already decided ([Skilling Progression](SKILLING_PROGRESSION.md)): levels 10, 30, 50, 70 and 90 each give a global buff; 20, 40, 60 and 80 give a buff to that profession; 99 gives a large global buff. The reworks don't change it. Where a skill doc names "perks", those are separate from mastery and come from the skill's steady chase.
- Task mastery (the separate 1–100 track per action with perks at 25/50/75/100, `src/data/skillingMastery.ts`) keeps working for any action that still exists. When an action is replaced, its mastery track id is kept on the replacement where the doc says so; otherwise the old track's levels are converted into the new track at the same level.
- Every skill has a **steady chase** (slow progression you always move along) and a **rare chase** (a very rare find). Each doc names both.

## 5. Hidden collectibles (shared system, build once)

Every skilling zone has exactly one hidden collectible with no gameplay effect.

- Data: `src/data/collectibles.ts`, entries `{ id, skill, zone, name, flavour }`. The `zone` key is whatever the skill doc calls a zone (a Delve depth band, a forest region, a base-species patch, a dig site, a sky region, a heist, a workstation).
- State: `GameState.collectibles: string[]` (found ids). Add with a save migration defaulting to `[]`.
- Roll: each completed action in that zone has a 1 in 2,000 chance to find it if not yet found, including offline. The skilling tree's Curious core node multiplies this chance.
- Finding one shows a toast and a log line, and records it in a new **Collection** tab on the Skills overview, grouped by skill, with unfound entries shown as "???" plus the zone name.
- Production skills have one zone each: their workstation.

The first skill built adds the system; the rest only add data rows.

## 6. Save migrations

- `SAVE_VERSION` lives in `src/engine/state.ts` (51 at the time of writing). Each skill rebuild bumps it once and adds `MIGRATIONS[n]` in `src/engine/save.ts`.
- Every doc lists what converts to what. Rules: nobody loses levels, XP, items they own, unlocks, currencies or progress counters. Where an old thing has no new home, convert it into the closest resource at a fair rate and show a one-time notice listing what changed.
- Add a migration test in `tests/` that loads a save from before the change with representative state and checks the converted result.

## 7. Cross-skill links and fallbacks

Several designs feed each other. Every skill must work on its own even if its partner hasn't been rebuilt yet, so each link has a fallback:

| Link | Needs | Fallback until the partner is rebuilt |
|---|---|---|
| Woodcutting splinters → Smelting charcoal | splinters item | Charcoal can also be burnt from any 5 logs |
| Foraging mutations → Alchemy infusions | mutated strains | Plain herbs give the base infusion at rank 1 strength |
| Mining Crystal layers → Gemcutting rough size | rough with a size | Existing rough gets a random size (section 3 of the Gemcutting spec) |
| Smelting purity → Forging and Woodcrafting rolls | graded bars | Ungraded bars count as Refined |
| Smelting master alloys → Forging master forms | master alloys | Master forms stay locked until alloys exist |
| Woodcutting legendary woods → Woodcrafting living woods | legendary logs | Living woods stay locked |
| Cartography boss maps → Return Inscription fragments | special boss maps | Keep the current fragment source until Cartography ships |

## 8. Done means

For each skill:

- Everything in its Implementation spec built, including the screen, the return view and migration.
- New unit tests for the rules and the minigame scoring; `npm test` and `npm run build` pass.
- Checked in the running game with the `playtest` skill on a realistic mid-game save, at desktop and phone width.
- `docs/GAME.md` skill row rewritten to the new rules, one plain line per player-visible change in `UPCOMING` in `src/data/news.ts`, `npm run uniques` if any drop pool changed, and the item checked off in [MILESTONES.md](MILESTONES.md).

## 9. Removing Agility, Cooking and Rune-carving

Decided 2026-11-21. Remove each skill fully from play:

- Delete its data, engine, page, minigame, mastery entries, projects, achievements, UI references and wiki entries. Remove its `SkillId` from `SKILLS`, but keep the id accepted by the save loader so old saves load; the migration deletes its XP, task mastery and state.
- Its items: keep the item ids defined as legacy (sellable, no use) so old stash entries don't break, or convert them as listed below.
- Total skill level, achievements and the skilling tree point count recalculate without it. The skilling tree revamp refunds all points anyway.

**Agility** (`src/data/agility.ts`, `agilityCut` in `src/engine/combat.ts` and `src/engine/heist.ts`): remove the close-in and Heist room speed bonuses entirely (`agilityCut` returns nothing; delete it). Hidden gathering spots that need Agility (`agility?:` on `SkillAction`) are removed with the Mining, Woodcutting and Foraging rebuilds; until then, drop the Agility requirement so those spots open by skill level alone.

**Cooking** (`src/data/cooking.ts`, `src/engine/cooking.ts`): meals and the active-meal buff are removed outright (no replacement buff). Sacred and Sulphur flask recipes in Alchemy stop needing Frostleaf Extract, Emberroot Reduction and Voidbloom Distillate and use herbs instead at 3 herbs per old ingredient (Frostleaf, Emberroot, Voidbloom respectively). Existing meals and ingredients become legacy items; owned ingredients convert to herbs at the same rate. The two feast projects are removed; any materials already invested are refunded. Gathering-speed and production-speed meals disappear with no replacement.

**Rune-carving** (`src/data/runes.ts`, `src/engine/runes.ts`, `RuneBoard.tsx`): remove the rune slot from every item, along with socketed runes, resonance and rune stats (`src/engine/stats.ts`). Socketed and stored runes are deleted with the one-time notice. Inscription Fragment progress (`professionProgress.counters['runes.inscription']` and owned `inscription_fragment`) carries over; until Cartography ships, the Return Inscription project (`src/engine/weaponProjects.ts`) takes fragments from Heist vaults at 1 per clean vault exit; after Cartography ships, from special boss maps (see the Cartography spec). Its step needing a "separately carved Keen grade 3 rune" is replaced by 5 Flawless bars of any metal.

## 10. Suggested build order

Removals first (they simplify everything else), then skills in any order, then the skilling tree last because its nodes point at every skill's new systems. The collectibles system comes with whichever skill is built first.

# Roadmap

Written 2026-10-30 from [DESIGN_RESET.md](DESIGN_RESET.md), which holds the decisions behind each milestone. Work goes
live as each milestone lands, and 1.0 is called on vibes. **Done** is what has to be true before moving on.

The order is by dependency: pacing rules first, because every act is tuned against them.

## 1. Automation and offline rules
- Rule overhaul: per-skill rules with better priority controls and rule slots that unlock.
- Simple rules free, reactive rules unlocked through the hideout.
- Offline combat stops on death; offline cap starts at 8 h and upgrades toward 24 h.
- **Done:** a fresh character can't idle bosses until it has earned reactive rules, and all of this plays on the live site.

## 2. Measure the pacing
- Teach the sim the rule locks, offline stops and a combat/skilling split.
- Run it against your timeline, then fix only the gap left in Act 1.
- **Done:** the sim reports game time per milestone, and day 1 lands at a couple of Act 1 stages.

## 3. Account layer
- Hideout, rule unlocks and offline cap shared by the account; skill levels per character; shared stash.
- Exile unlocked by finishing the campaign.
- **Done:** a second character starts with the account's unlocks, its own skills and access to the shared stash.

## 4. Act recipe and Act 2
- Write the recipe as a checklist: stages, boss mechanic, resistance check, skill batch, new skill
  ([ACT_RECIPE.md](design/ACT_RECIPE.md), with the Act 1 and Act 2 audits).
- Rebuild Act 2 from it, with its first new skill and monster art, and open it.
- Update Act 1 where the recipe needs it.
- **Done:** Act 2 is live and the first week lands partway through Act 3's level range in the sim.

## 5. Maps preview
- A small dev-only slice: Map Device, one tier, a couple of themes, clear and boss runs, consumed per run, auto-run.
- It tests the endgame loop early, while it's cheap to change.
- **Done:** you've played it and said whether the loop is fun.

## 6. Act 3 and ascendancies
- Act 3 from the recipe, with larger stage counts starting to grow.
- Ascendancies unlock here: 14 in total, each a new section of the main tree.
- Tree extended for the extra levels.
- **Done:** every class can pick either ascendancy and play it through Act 3.

## 7. Acts 4–6
- Each from the recipe, growing to 10–20 stages, ending around level 65.
- Gear base tiers extended to about level 80.
- **Done:** Act 6 can be finished at around month 1 when pushing combat hard, and is just starting on a mix, in the sim.

## 8. Maps
- Full tiers and themes, map drops, Cartography as the optional crafting route.
- **Done:** a character can farm from the first tier to the last, with auto-run working offline.

## 9. Hard mode bosses
- New bosses, boss keys from drops and skilling, boss moments for manual play and a reactive-rule answer for idle.
- **Done:** a top-end character clears them on idle without dying, and the sim can test that.

## 10. Top-end crafting and hideout
- High level passive nodes, rare materials from skilling and from drops.
- Forced-mod and past-the-limit crafts.
- Late hideout upgrades.
- **Done:** month 6 play works as you described: farming nodes to min-max gear for hard mode bosses.

## 11. Long tail
- Collection log, masteries, build-defining uniques, the skills arriving around or after Act 6.
- Hardcore and Classic, each with their own stash, hideout and unlocks.
- **Done:** your call.

## 1.0
You call it. On the day: wipe saves with a clear message.

## After Maps
Endless content. Not designed yet, and nothing above depends on it.

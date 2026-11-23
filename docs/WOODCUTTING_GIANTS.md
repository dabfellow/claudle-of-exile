# Woodcutting: Felling giants

Design pass started 2026-11-21. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md), following [Mining: the Delve](MINING_DELVE.md). Goal: give every skill its own twist instead of "pick a node, wait, collect."

## Decisions

- **Question 1, core twist (2026-11-21): A — Felling giants.** Every tree is one big individual that takes many cuts to bring down, like a slow boss fight against a tree. A giant has parts: the crown gives resin and twigs, the limbs give ordinary logs, the trunk gives the most timber, and the heart at the centre gives heartwood. The player chooses which part to work. A big Ancient tree might take hours; coming back means news like "the crown came down: 40 resin, trunk 60% cut." Bringing down a giant is a moment, and each next giant has its own shape, size and quirks. Chosen over a grown grove because Foraging's Greenhouse already covers growing.
- **Question 2a, order of parts (2026-11-21): B — The tree falls when the trunk goes.** Crown and limbs can be taken whenever; once the trunk is cut through the giant falls, and anything still attached shatters into low-value splinters. The heart is only reachable after the fall. Choose between clearing crown and limbs first for full value, or rushing the trunk to reach the heart sooner.
- **Question 2b, finding the next giant (2026-11-21): A — Choose from scouted giants.** The surrounding forest gets scouted while felling. When a giant falls, pick the next from two or three options, each with its own wood, size and quirks such as Resin-weeping, Hollow heart, Lightning-struck or Twisted grain.
- **Question 3a, active play (2026-11-21): Log splitting, the owner's own idea.** Owner wants active Woodcutting to feel **relaxing** (earlier ideas rejected: keep the swing and aim the fall, tap knots for burls, the giant fights back, climb the giant, stack the woodpile, the forest around you). Owner's words: like those games where you try to cut an item in half perfectly, "but it's like you're splitting logs, so you could have different weird shaped logs with like a branch coming off of them, and you have to split it down the middle best you can." Split 50/50 within 3% is a perfect double strike; up to 6–7% off is a normal strike; more than 15% off is a miss.
  - Decided on the owner's behalf: you tap where along the log the axe lands; there is no timer, so it stays relaxing. The split is judged on the two halves' actual size, so a branch counts toward its side. Between 7% and 15% off is a weak strike, matching the other minigames' four results. Logs come from whichever part of the giant is being worked: plain trunk rounds, knobbly limbs with branches, and oddly shaped heart pieces. This replaces the timing swing.
- **Question 4a, wood types (2026-11-21): A — Deeper woods as you level.** The forest is split into regions (Ash woods, Oak woods … Worldwood grove). Levelling lets you scout further in. Scouted giants come from whichever unlocked region the scouts are sent to, so you can go back to the Oak woods for oak.
- **Question 4b, levels 80–99 (2026-11-21): A — Legendary giants.** Named, rare trees (an ancient Worldwood, a Spirit tree older than the kingdom) sometimes appear in scouting. Each takes a day or more to fell, has unusual parts only it gives, and is remembered in a "felled legends" record.
- **Question 5a, steady chase (2026-11-21): B — The woodcutter's lodge.** Build a camp at the forest's edge from timber from your own giants. Each building adds to Woodcutting: a scout tower gives one more scouted option, a drying shed makes neat splits season wood better, a sawmill handles planks, a trophy wall shows felled legends. Bigger buildings need wood from deeper regions.
- **Question 5b, rare drop (2026-11-21): B — A World Tree seed.** Very rare drop from legendary giants. Planted at the lodge, it grows over months into your own ancient tree; fully grown, it becomes a personal legendary giant to fell, with the best parts in the game.
- **Hidden collectibles** (decided on the owner's behalf): each forest region is its own skilling zone with one hidden find, such as old initials carved into a giant. No gameplay effect.
- **Question 3b, a giant falls while away (2026-11-21): A — Standing order.** Set a preference (most resin, biggest heart, fastest, a particular wood) and the next scouted giant is chosen automatically; felling continues overnight and the return log shows which giants were picked.

- **Question 6a, main view (2026-11-21): A — The giant up close.** The current giant fills the screen, drawn simply from the side, with crown, limbs, trunk and heart outlined and each showing its own progress; tap a part to work it. The splitting block sits beside it. Scouted giants, the lodge and forest regions are in tabs alongside.
- **Question 6b, coming back (2026-11-21): A — Felling cards.** One card per giant that came down while away, with its picture, quirks and what each part gave ("Resin-weeping Yew: crown 52 resin, trunk 140 logs, heart 3 heartwood"). New legends get a special card.

### Look-and-feel pass (2026-11-22)

The owner reviewed the built page and changed these. They replace Questions 2b, 3b and parts of 5a and 6a above.

- **No scouting (replaces 2b and 3b).** Owner: "Why can't we just unlock a region and then choose to cut wood from that region?" You pick a woods on the Forest tab and cut there. When a giant is done, the next one stands in the same woods straight away. Moving to another woods leaves your part-cut giant waiting there for when you come back. There is no standing order and no Scouting tab.
- **Special giants come from familiarity.** Quirks (Resin-weeping, Burled and so on) are the "random bonuses" the owner asked for. Each giant felled in a woods makes its special giants and legends 2% more common there, up to double after 50 giants.
- **The Scout Tower becomes the Lookout Tower.** Tier 1 makes special giants 1.5 times as common; tier 2 still makes legends 1.5 times as common. Same costs and levels.
- **Planks move to Woodcrafting (owner's choice).** Sawing planks and refining Ancient Heartwood are Woodcrafting recipes on the bench's new Sawmill tab, give Woodcrafting XP and need only Woodcrafting level. The Lodge's Sawmill building is gone, and with it the free Sawmill on migration.
- **No part-order toggle.** "Crown to heart" and "Rush the heart" confused the owner. Work always moves crown, limbs, trunk, heart; to rush, tap the Trunk.
- **The chopping block is an axe and a log (replaces the 3a drawing).** Owner: "you're swinging an axe down onto a log and you're splitting the log." A round stands on end on a stump, seen from the front; you aim the axe across it, it swings down, and the halves fall apart. The scoring is unchanged: the log's mass across its width, branches included, judged by `splitResult`.
- **First look.** The Forest tab is the whole screen: the woods to pick from along the top, the giant large in its clearing with each part pinned where it grows, and the chopping block with a tally of this giant's drops beside it. Tabs are Forest, Lodge, Trophies and Masterworks.

### Second look-and-feel pass (2026-11-22)

- **The chopping block uses real art.** Owner: "Find some artwork for the logs. Stop trying to make logs." The log is "Wood log" by EyAxeMan (CC0), lying on the block with its branch, mirrored, sometimes upside down (branch underneath) and trimmed at the ends so each log balances somewhere new. Twisted grain trims harder. The axe is the game's own axe icon. Each pixel column of the picture weighs what is solid in it (`columnProfile`, `logWindow` in `minigame.ts`), so the split is judged on exactly what you see.
- **The Forest tab shows the cut in progress** (which part, a bar and seconds left). The chopping block no longer has a Start felling button.
- **The lodge has six buildings with levels**, and the Trophy Wall is built from the Trophies tab instead. New, decided on the owner's behalf: Whetstone (cuts 3/6/9% faster, from level 1), Sap Buckets (crown resin chance +10/20/30%), Log Rack (trunk cuts 5/10/15% chance of an extra log) and Heart Chisel (heartwood fragments 10/20/30% more often). Costs are logs from rising woods.
- **Woods mastery is shown and has Woodcutting perks.** Each woods has its own track (`task.giant_<wood>`), shown on the Forest tab with its level and perks. The level itself gives up to 10% cut speed and up to a 10% chance of an extra log (the extra log was never applied to giants before). Perks: 25 Heavy Felling (8% extra log), 50 Sap Sense (crown resin +25% there), 75 Lumberjack's Rhythm (+2% Woodcutting speed everywhere), 100 Old Friend (special giants 25% more common there).
- **A felled giant leaves its heart.** Owner asked for art instead of the "Timber! The heart is open" text, then for "what a tree would have for a heart" rather than a stump (an oak stump looked wrong under a yew) or a heart shape. The tree's heart is a gnarled, rooted knot of wood (Anvil icon 275, already in the item art), tinted to that woods' wood colour, with a glowing ember core in its cut end. It lies where the tree stood, beside the felled tree, and the glow goes out once the Heart is chopped out.

## Decided on the owner's behalf

- Log splitting: tap where the axe lands, no timer; judged on the two halves' actual size; 7–15% off is a weak strike; log shapes come from the part being worked; replaces the timing swing.
- Each forest region is a skilling zone with one hidden collectible (for example carved initials).
- Planks move into the lodge's sawmill. Existing resin stands and the Ancient Heartwood Survey become giant parts and quirks (Resin-weeping giants for resin, heart work for heartwood) rather than separate actions.
- Existing saves move over without losses: wood tiers and level requirements become the forest regions, log, resin, plank and heartwood items keep their IDs, heartwood fragment progress carries over, and the current Heartwood Hatchet stays usable.
- Exact giant sizes, part yields, splinter losses, scouting counts, lodge costs and World Tree growth time are tuning, set at build time on how they play.

## Implementation spec

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Numbers are starting values.

### Regions

These replace the wood tiers in `src/data/woodcutting.ts`:

| Region | Level | Wood | Cut interval | XP per cut (raw) |
|---|---|---|---|---|
| Ash woods | 1 | ash | 3.0 s | 7 |
| Oak woods | 15 | oak | 3.5 s | 18 |
| Yew woods | 30 | yew | 4.0 s | 38 |
| Ironwood | 45 | ironwood | 5.0 s | 60 |
| Ancient woods | 60 | ancient | 6.0 s | 80 |
| Spirit woods | 75 | spirit | 7.0 s | 100 |
| Worldwood grove | 90 | worldwood | 8.0 s | 120 |

Each region is a collectible zone (carved initials). Scouts are sent to one chosen unlocked region, set in the Scouting tab. The default is the highest unlocked region.

### A giant

- Four parts, each with hit points (HP). A **cut** is one action completion on the chosen part and takes 1 HP off it.
- Base HP at Small size: crown 10, limbs 20, trunk 20, heart 5.
- Size multiplies every part's HP and yield: Small ×3, Medium ×8, Large ×20, Legendary ×200. As a guide, a Large Ancient giant is about 1.8 hours and a legend about a day.
- Yield per cut:
  - **Crown:** `<wood>_resin` at 30% and 1 log at 30%.
  - **Limbs:** 1 log.
  - **Trunk:** 1 log plus a 50% chance of another.
  - **Heart:** 1 log plus `heartwood_fragment` at 25%.
- Crown and limbs can be worked any time. When the trunk reaches 0 HP the giant **falls**: every HP left on the crown and limbs becomes 1 `splinters` each, and the heart becomes workable.
- The giant is complete when the heart is done, or when the player presses **Move on** after the fall.
- When the current part runs out, work moves to the next part in the **part order**. The default order is crown → limbs → trunk → heart; the alternative is trunk → heart, which rushes the heart.
- XP: the region's XP per cut, plus 10 × that on a fall (100 × for a legend).
- `splinters` is a new material, used by Smelting as charcoal fuel.

### Scouting and quirks

- When a giant is complete, offer 2 scouted giants (3 with the Scout Tower) from the target region.
- Size weights: Small 40, Medium 40, Large 20.
- Each giant rolls 0–2 quirks, each at 15%:

| Quirk | Effect |
|---|---|
| Resin-weeping | crown resin chance ×3 |
| Hollow heart | trunk HP ×0.7, heart HP ×0.5 |
| Lightning-struck | no crown; trunk yields +25% |
| Twisted grain | limb yield ×1.5; split logs get extra knobs |
| Towering | all HP, yields and XP ×1.5 |
| Burled | heart HP ×2, heartwood fragment chance ×2 |

- **Legendary giants:** from level 80, in the Ancient, Spirit or Worldwood regions, each scouted option has a 2% chance to be a named legend from `LEGENDS`. Start with four: Grandmother Oak (Ancient), the Elder Spirit-Willow (Spirit), the Worldwood Sentinel (Worldwood) and the Stormcrowned Yew (Ancient).
  - A legend's heart gives 3–5 `legend_heartwood`, a new material used for Woodcrafting's living woods.
  - Each legend is recorded once in `legends` and shown on the Trophy Wall.
- **Standing order:** used whenever a giant completes while idle or offline, and on demand with an **Auto-pick** button. Preferences:
  - most resin (Resin-weeping or Large first)
  - biggest heart (Burled, then Large)
  - fastest (Small, Hollow heart)
  - a specific region
  - **Always take a legend** is a separate toggle, default on.

### Focus minigame: split the log

- A log is drawn sideways on a block. Its shape is a mass profile along its length:
  - **Trunk** logs: a plain round with a slight taper.
  - **Limb** logs: one branch knob at a random spot.
  - **Heart** logs: two irregular knobs.
  - Twisted grain adds one more knob.
- The player taps where the axe lands. There's no timer.
- The score is `offset = |left mass share − 50|` in percentage points. Branches count toward the side they're on.
  - Up to 3 is a **double**.
  - Up to 7 is a **hit**.
  - Up to 15 is **weak**.
  - Over 15 is a **miss**.
- The two halves fall apart showing each half's percentage, then a new log appears after 0.6 s.
- Scoring function: `splitResult(leftShare: number)` in `minigame.ts`. This game's double band replaces the guide's middle-third rule, as the owner set it.

### The lodge (steady chase)

Built in the Lodge tab from the player's own logs and planks.

| Building | Unlock | Tier 1 cost | Effect |
|---|---|---|---|
| Scout Tower | level 20 | 200 oak logs | +1 scouted option; tier 2 (level 70, 500 ancient logs) multiplies legend chance ×1.5 |
| Drying Shed | level 30 | 300 yew logs | a double split also gives +1 log; tier 2 (level 60) gives it on hits at 25% too |
| Sawmill | level 45 | 400 ironwood logs | unlocks plank sawing: today's `mill_*` recipes (5 logs → 1 plank) and Refine Ancient Heartwood (20 fragments → `ancient_heartwood`) move here as separate actions |
| Trophy Wall | first legend felled | 100 planks of that wood | displays felled legends with date and yields |

### Rare chase: the World Tree seed

- Each legend completed has a 1% chance to drop `world_tree_seed`. Plant it at the lodge (needs the Trophy Wall).
- It grows for 120 real days, offline included, and the Lodge shows its progress.
- Grown, it becomes a personal legend with ×400 HP. Its heart gives 10 `legend_heartwood` and 1 `world_tree_heart` (a material held for future uniques).
- After it's felled, another seed can be planted.

### State

`GameState.giant`:

- `current`: a giant (see below), or null.
- `options`: the scouted giants on offer.
- `order: { pref, partOrder, region, alwaysLegend }`
- `lodge: { scoutTower, dryingShed, sawmill, trophyWall }`, each a tier number.
- `legends: string[]`
- `worldTree?: { plantedAt: number }`
- `pendingCards`: felling cards generated offline.

Each giant is `{ id, region, size, quirks, legendId?, parts: Record<'crown' | 'limbs' | 'trunk' | 'heart', { hp, max }>, fallen, yields: Record<part, Record<itemId, number>> }`.

The running action is `giant_cut` with the part stored on the action, or a sawmill action.

### Screen

- `GiantView` replaces the action list. The current giant is drawn simply from the side as an SVG with the four parts outlined; each part is tappable and shows an HP bar. The worked part is highlighted. After the fall, the giant lies down with the heart exposed.
- The splitting block sits beside the giant (below it on phones).
- Tabs: **Giant**, **Scouting** (options, target region, standing order), **Lodge**, **Regions**, **Trophies**.

### Coming back: felling cards

One card per giant completed while away, showing:

- picture, size and quirks
- what each part gave, for example "Resin-weeping Yew: crown 52 resin, trunk 140 logs, heart 3 heartwood"
- splinters made

Legends get a gold card. There's a **Continue** button.

### Migration

- All `cut_*`, `cut_resin_*` and `cut_heartwood` actions are retired.
- Task mastery converts into one track per region (id `giant_<wood>`), taking the highest of that wood's old tracks. Plank mastery tracks keep their ids.
- Players at level 45 or above get the Sawmill built for free.
- Log, resin, plank, heartwood fragment and `ancient_heartwood` items keep their ids. The heartwood fragment counter carries over, and the Heartwood Hatchet stays.
- The hidden Agility spot `cut_crag_oak` is removed.
- Each player starts with a fresh Medium giant in their highest region.

### Tests

- Fall turning leftover HP into splinters.
- Heart locked before the fall.
- Size and quirk multipliers.
- Standing order choices.
- Legend gating by level and region.
- Lodge effects.
- `splitResult` boundaries.
- Mass share with a branch.
- An offline run producing cards.
- World Tree growth time.
- Migration.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build Woodcutting as Felling giants".

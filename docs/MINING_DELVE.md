# Mining: the Delve

Design pass started 2026-11-20. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md). Goal: give every skill its own twist, because the gathering skills currently all play as "pick a node, wait, collect."

## Decisions

- **Question 1, core twist (2026-11-20): A — The Delve.** The player has one mine and digs it deeper over time. Depth is permanent progress. Each layer has its own mix of ores, gems and fossils. Each visit, choose between working a known layer (steady) or pushing deeper (slower, with hazards such as cave-ins, flooding and gas, and the best finds). Mining is about a dangerous working mine (hazards, shoring up, breaking through), kept distinct from Archaeology's careful single-site excavation. The rock-face reading idea may come back as the Focus minigame inside the Delve.
- **Question 2a, what limits pushing (2026-11-20): B — Supports.** Working a layer gives ore plus rubble; rubble is turned into props and braces, all made within Mining so it stays self-contained. Pushing deeper uses supports up, and each hazard eats extra. When supports run out, the push stops and you dig in place. Rhythm: work a rich layer for a few visits to stock ore and supports, then spend them on a big push.
- **Question 2b, passed layers (2026-11-20): A — The whole shaft stays open.** Any layer reached can be worked again, so old layers become farming spots for specific materials ("layer 40 is my fossil bed"). Pushing deeper never takes anything away.
- **Question 3a, layer makeup (2026-11-20): B — Your mine is rolled as you dig.** Metals follow depth (Copper near the top, World ore near the bottom) and Mining level limits how deep you can push. Each new layer rolls its own traits on breakthrough, such as Rich, Crystal-bearing, Fossil bed, Flooded or Unstable. These traits replace today's separate Rich, Crystal and Fossil deposits. Every breakthrough is a reveal; each player's mine differs.
- **Question 3b, bottom (2026-11-20): B — No bottom.** Past the World ore band the mine keeps going: finds get rarer and stranger, hazards get worse, and deepest depth is a record to keep beating. A named landmark around level 99 gives a "you made it" moment.
- **Question 4a, active play (2026-11-21): B — Brace the shaft.** When pushing, hazard warnings pop up (creaking timbers, dripping water, a gas hiss). Reacting in time places a support exactly where needed, so the hazard costs no extra supports and builds Focus. Active play is about protecting the push, not mining harder. The rock-face reading minigame was not chosen. Owner: "interview me further about these specifically" (see Question 5).
- **Question 4b, hazards while away (2026-11-21): B — Each hazard has its own effect.** Cave-in costs supports. Flooding slows that layer until pumped out. Gas forces the dig back to the last safe layer for a while. An Unstable layer has a small chance to collapse into a hidden cavern full of finds. Hazards never destroy items or close a layer. Owner: "we'll need automated ways to get around these that unlock at some point or purchase/craft" (see Question 5).
- **Question 5a, reacting to a warning (2026-11-21): A — Match the fix to the hazard.** A warning card with a short timer; choose prop for creaking, pump for water, vent for gas. Right choice on time stops it cleanly and fills Focus; the wrong choice uses that support for nothing. Works well on phone.
- **Question 5b, active play while working a layer (2026-11-21): B — A lighter version.** Worked layers occasionally creak too, much more rarely, so bracing still earns some Focus while farming. Owner: "but enough hazard fixes in the layer will secure it sloooowly over time."
  - Decided on the owner's behalf: a secured layer stops producing hazards and gets a small permanent yield bonus, so securing a favourite farming layer is a slow reward for active play there.
- **Question 5c, hazard automation (2026-11-21): A — Installations built in the mine.** At set Mining levels unlock a Pump Station, Ventilation Shaft and Rock Bolts, made from your own ore and rubble. Each handles one hazard type automatically and covers a stretch of layers below where it's built (a pump at 200 covers to about 250); deeper pushes need a new one. Building a station is part of planning a push; stations can be upgraded to cover more layers.
- **Question 6a, steady chase (2026-11-21): A — The pick grows with your depth record.** The Prospector's Pick gains tiers forged from ore found only past certain depths (Iron Pick, Mithril Pick … World Pick and beyond). Each tier adds a perk that changes how the Delve plays: supports last longer, see a layer's traits before breaking through, more hazard warning time, and so on.
- **Question 6b, rare drop (2026-11-21): Both.** **Motherlode** is a very rare layer trait rolled on breakthrough: that layer is extraordinary forever (heavy fragments, extra gems, its own glow on the shaft map), a jackpot spot to farm for months. **Heartstone** is a rare ore found only in caverns from collapsing Unstable layers, the special ingredient for the best crafted uniques such as the metals behind Woundmaker and Debt of Stone.
- **Hidden collectible** (decided on the owner's behalf): the mine counts as one skilling zone; its collectible is a lost miner's lantern that can turn up in a cavern. No gameplay effect.

- **Question 7a, main view (2026-11-21): A — A side view of the shaft**, in a simple, understated style: layers as coloured rock bands with trait icons, installations at their depths, a glowing dig face at the bottom. Owner: "no click drag screen, make the layer changes buttons or something like an elevator." So moving between layers is done with buttons (an elevator), not dragging or scrolling the picture.
- **Question 7b, coming back (2026-11-21): B — A replay of the descent.** The shaft scrolls down from where you left it to where you are now; new layers reveal one by one, and hazards and caverns pop up as they happened. The shaft log ("Broke through to 212 (Crystal-bearing). Gas at 214, fell back to 210. Cavern at 211: 3 Heartstone.") is available afterwards. A skip button is included.

## Decided on the owner's behalf

- Secured layers stop producing hazards and get a small permanent yield bonus.
- The mine is one skilling zone; its hidden collectible is a lost miner's lantern found in a cavern.
- Existing saves move over without losses: current metal tiers and level requirements become the depth bands, existing ore, fossil and fragment items keep their IDs, guaranteed fragment and fossil counters carry over as layer-trait rewards, and the current Prospector's Pick becomes the first pick tier.
- Exact depth per band, supports per push, hazard rates, station coverage ranges and pick-tier perks are tuning, set at build time on how they play.

## Implementation spec

Read [the build guide](SKILLING_BUILD_GUIDE.md) first for shared rules (Focus, collectibles, migrations, done criteria). Numbers are starting values.

### Depth, bands and level

- Layers are numbered from 1 with no maximum. Metal follows depth:

  | Band | Layers | Metal | Work interval | Work XP (raw) |
  |---|---|---|---|---|
  | Copper | 1–44 | copper_ore | 3.0 s | 7 |
  | Iron | 45–89 | iron_ore | 3.5 s | 18 |
  | Mithril | 90–134 | mithril_ore | 4.0 s | 38 |
  | Adamant | 135–179 | adamant_ore | 5.0 s | 60 |
  | Star | 180–224 | star_ore | 6.0 s | 80 |
  | Void | 225–269 | void_ore | 7.0 s | 100 |
  | World | 270–299 | world_ore | 8.0 s | 120 |
  | Beyond | 300+ | world_ore | 9.0 s | 130 |

  Raw XP goes through the existing single 0.3 scale, like today's actions.
- **Depth cap:** you can push to layer `3 × Mining level`. At level 99 the cap is removed.
- **Landmark:** layer 300 is the **Worldroot Chamber**. Breaking through shows a full-screen moment, grants an achievement, and puts a marker on the shaft.
- Past 300, every 50 layers add +5 percentage points to hazard chance and +5% to Heartstone chance in caverns.

### Two activities (one runs at a time)

- **Mine at Depth N** (any reached layer). Each completion gives 1 ore of the layer's band, 2 `rubble`, and the layer's trait effects. Fragments as today: `mineral_fragment` 2.5% from the Mithril band down, `stone_fragment` 2.5% from the Adamant band down.
- **Push** (at the dig face). Each completion breaks through one new layer. Push time per layer is `40 s × (1 + layer / 100)`. A push completion uses `1 + floor(layer / 50)` braces and gives 3× that band's work XP. If supplies run short, the push stops and the character works the deepest layer.
- **Paying for braces.** Descent and hazards spend any existing `mine_support` first, then 5 rubble per remaining brace (4 with the Iron Pick or better). Mining banks rubble directly.

### Layer traits

Rolled once at breakthrough and stored. Each roll is independent, and a layer keeps at most 2 traits (drop the rarest extras):

| Trait | Chance | Effect when working the layer |
|---|---|---|
| Rich | 20% | ore output ×2 |
| Crystal-bearing | 12% | 25% chance of `rough_gem` per completion, plus `crystal_shard` 4% |
| Fossil bed | 12% | each of the 5 fossils at 1.67% per completion; ore output only 50% of the time |
| Flooded | 10% | flood hazards only; working is 20% slower unless a Pump covers it |
| Unstable | 10% | cave-in chance ×2; 5% chance per push through it of opening a cavern |
| Motherlode | 0.2% (layer 20+) | ore ×3, fragment chances ×4, `rough_gem` 10%; glows on the shaft |

Rough gems from Crystal-bearing layers get a size for Gemcutting (see the Gemcutting spec). Base size there is +1 for gems from Crystal-bearing layers.

### Hazards

- **When pushing:** each push completion rolls a hazard at `25% + 0.1% × layer` (cap 60%). The type comes from the layer's trait (Flooded gives flood, Unstable doubles the cave-in weight); otherwise the weights are cave-in 50, flood 25, gas 25.
  - **Cave-in:** costs an extra `2 + floor(layer / 50)` supports. If they run out, the push stops.
  - **Flood:** that layer is flooded for 30 minutes. Working it is 50% slower and the push is 50% slower while the dig face is flooded.
  - **Gas:** the push pauses for 10 minutes and the character works layer `deepest − 2` meanwhile, then resumes pushing automatically.
  - **Cavern** (Unstable only): one-time bonus of 3–8 band ore, 1–3 `rough_gem`, and a `heartstone` at 10% (Adamant band and deeper). It also rolls the mine's collectible.
- **When working a layer:** the hazard chance is 2% per completion, using the same types and effects. Secured layers roll none.
- Hazards never destroy items or close a layer.
- **Installations** (built at a reached depth once that layer has enough security):

  | Installation | Layer security | Handles | Tier 1 cost |
  |---|---|---|---|
  | Pump Station | 30 | flood | 200 rubble + 100 band ore |
  | Ventilation Shaft | 45 | gas | 200 rubble + 100 band ore |
  | Rock Bolts | 60 | cave-in | 200 rubble + 100 band ore |

  Each covers from its layer down 50 layers at tier 1, and +25 more per tier, up to 4 tiers. Each tier costs double the last. You can build any number of each. In a covered layer, its hazard type still shows as a warning but costs nothing when idle.
  Existing installations retain their coverage and can still be upgraded.

### Focus minigame: brace the shaft

- While pushing (foreground), a warning card appears every 8–15 s. While working a layer, one appears every 30–60 s. The card shows the hazard by icon and word ("Creaking", "Dripping", "Hiss") and three buttons: Prop, Pump, Vent.
- The timer is 3.0 s; pick tiers add time.
  - The correct button in the first third of the timer is a **double**.
  - The correct button before time runs out is a **hit**.
  - The correct button within 1 s after time runs out is **weak**.
  - The wrong button or no answer is a **miss**.
- A correct answer during a push cancels the hazard roll on the next push completion. A wrong answer uses 1 support.
- A hit or double holds the current Focus level for 65 seconds before normal decay. Successive braces still add Focus, so players working a layer can reach full Focus across four hits even at the longest warning intervals. Ignoring a warning leaves the hazard roll in place and lets earned Focus run down on its usual timer. Focus resets when starting another action or going offline.
- A correct answer while working a layer adds 1 point of **security** to that layer. At 200 points the layer is **Secured**: it has no hazards and gives +10% ore yield, permanently.
- Scoring function: `braceResult(correct: boolean, answeredMs: number, timerMs: number)` in `minigame.ts`.

### The pick (steady chase)

Tiers are forged from the Delve screen. Each needs its depth reached plus 50 ore of that band, and the Heartstone tier needs 5 `heartstone`. The current Prospector's Pick becomes the Copper tier.

| Tier | Needs depth | Perk |
|---|---|---|
| Iron | 45 | rubble → support at 4:1 |
| Mithril | 90 | +1 s warning time |
| Adamant | 135 | see the next layer's traits before breaking through |
| Star | 180 | pushes use 1 fewer support (minimum 1) |
| Void | 225 | hazard chance −20% (relative) |
| World | 270 | cavern chance ×2 |
| Heartstone | 300 | push time −25% |

### Rare chase

- **Motherlode** (trait above). The shaft shows a count of Motherlodes found.
- **Heartstone:** a new material from caverns. The Wound Alloy and Stone Alloy recipes (`src/data/smithing.ts`) each need 1 Heartstone in addition to their current inputs. Alloys players already own are unaffected.

### State

`GameState.delve`:

- `deepest`, `pickTier`
- `layers: Record<number, { traits: string[]; secure: number; floodedUntil?: number }>`
- `installations: { type: 'pump' | 'vent' | 'bolts'; layer: number; tier: number }[]`
- `gasUntil?: number`
- `log: string[]` (last 200 events)
- `stats: { caverns: number; motherlodes: number }`

The running action is a skill action with ids `delve_work` (plus a target layer stored on the action) and `delve_push`.

### Screen

- A `DelveView` component replaces the Mining action list.
- It shows a vertical stack of 9 layer rows centred on the selected layer. Each row shows the layer number, band colour, trait icons, a security bar and any installation icon. The dig face is drawn glowing at the bottom.
- **Elevator buttons** (no dragging or scrolling the picture): ▲/▼ move one layer, ⏫/⏬ move ten, plus **Top**, **Dig face** and **Go to layer…** (a number input).
- The worksite shows **Mine** and **Dig to Depth**. The latter shows the exact rubble and any existing supports the next breakthrough uses, alongside the hazard odds.
- A compact strip shows rubble and any remaining supports. The shaft can filter reached depths by trait. Focus spans the width below the shaft and worksite. Each payout briefly shows the actual materials gained near the mining progress bar.
- The **Mine Upgrades** tab holds pick forging and installations for the depth selected on the Shaft tab. Mine history and descent replays are available from the right-hand **Activity** bar, and the time-away summary also shows new replays.

### Coming back: descent replay

- If Mining events happened offline, open `DelveReplay`: the shaft scrolls from the old deepest layer to the new one, revealing one event every 0.4 s (breakthroughs with traits, hazards, caverns). It has a **Skip** button.
- Afterwards the **Shaft log** tab lists the stored log.

### Migration

- `deepest` = the first layer of the highest band the player's Mining level can reach today. Layers from 1 to `deepest` get their traits rolled at migration from a fixed seed per character.
- All `mine_*` actions are retired. Their task mastery converts into one track per band (id `delve_<metal>`), taking the highest level among that metal's ordinary, rich, crystal and fossil tracks.
- Ore, fossil, fragment and gem items keep their ids, and the existing fragment counters stay.
- The hidden Agility spots `mine_cliffside` and `mine_grotto` are removed.

### Tests

- Depth cap by level, and no cap at 99.
- Push cost and time formulas.
- Trait roll limits.
- Each hazard's idle effect, with and without installation cover.
- Security reaching Secured.
- `braceResult` boundaries.
- Pick tier gates.
- Offline push producing log events.
- Migration from a level-62 save.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build Mining as the Delve".

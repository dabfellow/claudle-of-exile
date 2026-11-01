# Archaeology and Expedition

Act 4's new skill, from [ACT_RECIPE.md](ACT_RECIPE.md) and [ACTS_4_6.md](ACTS_4_6.md): one trainable skill that feeds its
own game system. Data is in `src/data/expedition.ts`, the digs in `src/data/skills.ts`, the rules in
`src/engine/expedition.ts`, the page in `src/ui/components/ExpeditionBoard.tsx`, and the Whetstone is on the Crafting Bench.

## The loop

**Archaeology** is the skill. **Expedition** is the system it feeds.

1. **Dig.** A site is an ordinary skilling action with no inputs. It turns up Artifacts of the people who left it. It
   can't run out and nothing can go wrong.
2. **Work it deeper.** Every dig is counted against that site for good. Each site has four strata with a find at the
   bottom of each of the first three, and each find makes the site pay 25% more. Moving to another site loses nothing.
3. **Earn standing.** Each find goes in the Logbook and raises your standing with that people. Standing opens their
   merchant's better shelves.
4. **Trade.** Merchants take Artifacts for currency. Shelves are small, fill back up by the clock and get dearer as they
   empty, so a pile of Artifacts is best spread over a few wares and over time.
5. **Leave a standing order.** Each merchant keeps one order: buy this ware whenever the Artifacts and the shelf allow.
   Orders run all the time, whatever you're doing, so a night's Artifacts are already spent when you wake.

The fiction: the Hollow Peaks are full of what other people left. Giants buried their dead here, the Empire's Survey came to
price the mountains and never finished, and the Rimebound traded with the ice. Three strangers up here will pay for it.

## Why this isn't Heist again

| | Heist | Expedition |
|---|---|---|
| **Getting in** | Costs Markers, so you farm first | Costs nothing |
| **The risk** | An alarm can cut the run short | None |
| **The decision** | How deep to go, before each run | Which site to work and what to put on order |
| **What repeats** | Short runs that start over | One long dig that never resets |
| **Staying longer** | Each run is the same as the last | The site itself gets richer, for good |
| **Goal** | The vault, every run | The bottom of each site, about 2 days of digging |
| **Spending** | Rogues, once | A market that pushes back |

Heist is a gamble you repeat. Expedition is patient work that pays for being left alone, so it suits a long night better
than anything else in the game, and it has no ticket to buy.

## What it makes, and why that isn't the same thing again

| Material | Does | Comes from |
|---|---|---|
| **Fossils** | Bias which mods roll | Mining |
| **Essences** | Force one mod | Foraging |
| **Resin** | Raise item level | Woodcutting |
| **Shards** | Fuse into low orbs | All gathering |
| **Contraband** | Protects what's on the item | Thieving and Heist |
| **Runes** | A fixed effect in its own slot | Rune-carving |
| **Ancient Whetstone** | **Raises one mod you pick by one tier** | **Archaeology and Expedition** |

- **Ancient Whetstone:** the first craft that makes a mod better without rolling for it. It can't go past what the item
  level allows, so an old item with room to grow is what it wants. The new tier's values still roll, and they replace the
  old ones. An item holds one honed mod, and a new one can go on only once that mod has left the item, so it finishes an item
  without becoming a riskless road to a perfect one. It doesn't work on uniques or bench crafts. It drops rarely from Act 4 monsters and bosses, so nothing here
  needs the skill.
- **Choosing your currency:** every other source gives you what it gives you. Artifacts are a stored choice, spent on the
  exact orb or material you're short of. That covers any Fossil, the Greater Essences that Deep and Sainted runes want,
  Seals and Wax, and the first Chaos Orbs outside combat.
- **Combat-only line:** Exalted, Divine and Annulment are still never sold.

## Sites

Three peoples with two sites each, so you pick a site for what its merchant sells, as you pick alternate gathering nodes.
All of them open at `hollowpass`, and their levels stagger.

| Site | Level | People | Dig | Artifacts an hour, top stratum |
|---|---|---|---|---|
| Giant's Cairn | 1 | Giants | 3 s | 300 |
| Surveyors' Cutting | 12 | Surveyors | 3.5 s | 350 |
| Rime Barrow | 24 | Rimebound | 4 s | 400 |
| The Fallen Colossus | 40 | Giants | 4.5 s | 500 |
| The Imperial Adit | 55 | Surveyors | 5 s | 600 |
| The Hollow Heart | 70 | Rimebound | 5 s | 700 |

Finds come at 4, 16 and 48 hours of digging at a site's base speed, whatever that speed is. The strata read Topsoil, Packed
Scree, Old Ice and Bedrock. At Bedrock a site pays 75% more than at the top. Working out all six is about 12 days of digging.

## Merchants

Cost is for a full shelf. The price climbs with what's gone, to double for the last one: `cost × (1 + sold ÷ shelf)`.

| Merchant | Ware | Standing | Cost | Shelf | Restocks one in |
|---|---|---|---|---|---|
| **Sigrun Bone-reader** (Tally-bones) | Alteration ×10 | 0 | 60 | 10 | 1 h |
| | Regal Orb | 0 | 40 | 24 | 20 min |
| | Orb of Alchemy | 1 | 55 | 12 | 1 h |
| | Chaos Orb | 2 | 120 | 12 | 2 h |
| | Instilling Orb | 4 | 600 | 2 | 24 h |
| | Orb of Expansion | 5 | 750 | 2 | 24 h |
| **Cassia, Last of the Survey** (Brass) | Scorched, Frigid, Metallic Fossil | 0 | 40 | 10 | 1 h |
| | Dense, Serrated Fossil | 1 | 40 | 10 | 1 h |
| | Greater Essence of Vitality, Frost, Haste | 2 | 50 | 10 | 1 h |
| | Forger's Seal | 3 | 180 | 8 | 3 h |
| | Locksmith's Wax | 4 | 270 | 6 | 4 h |
| **The Keeper in the Ice** (Idols) | Scouring ×5 | 0 | 120 | 8 | 2 h |
| | Regret ×3 | 0 | 90 | 8 | 2 h |
| | Rough Gem ×5 | 1 | 200 | 8 | 2 h |
| | Ancient Whetstone | 1 | 450 | 4 | 6 h |

A shelf holds about a day or two of restock, so missing a day costs nothing but a long break does. At the Chaos shelf's pace
that's 12 a day at most, which supplements drops without replacing them. Priced at a third of an orb's vendor value per
Artifact, a night on the Fallen Colossus at Bedrock is worth about 2,300, near what Heist pays at that stage.

## The numbers

- **XP:** the top site pays about 3.1 XP a second, so Archaeology 99 stays around the reset's 53 days.
- **Mini-game:** drag to brush a plot of soil clear without touching the cracked stones. A whole plot is two hits, as a whole
  lock is. A cracked stone is a miss.

## Skilling tree

The branch sits at -60°, between Mining and Woodcutting: Trowelwork (5% faster), Keen Eye (25% more Artifacts), Silver Tongue
(15% lower prices), and the keystone Deep Survey (each dig counts twice towards a find, Archaeology 25% slower). Archaeology's
level counts towards tree points.

## Rules kept

- **Unlock:** every dig has a `gate` on the area id `hollowpass`, Act 4's first stage. The page is always there, shows what
  opens it and trades nothing until then.
- **One activity at a time:** a dig is a plain `skill` action. Only standing orders keep working while you do something else.
- **Offline** runs the same code at the same speed, Overtime included. Shelves refill by `s.clock`, which always runs.
- **Depth, standing, orders and Artifacts are per character.**
- **Saves:** v26 adds `skills.archaeology` and `expedition`. A shelf with no entry is full. An order for a ware the game no
  longer knows is dropped on load.

## Later

- Each new act could add a people, or a band of sites, as the band template in [SKILLING_REWORK.md](SKILLING_REWORK.md) §6 does.
- A Gwennen-style ware could sell a sealed gamble on a unique.
- Artifacts and the Whetstone have no art of their own yet: they show as coloured orbs, as Fossils do.
- The sim's `--profile expedition` digs every night from Act 4, working the shallowest open site, with an order on each
  merchant's dearest open ware. It hasn't run: nothing reaches Act 4 on this branch.

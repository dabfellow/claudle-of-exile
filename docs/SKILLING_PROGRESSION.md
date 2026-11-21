# Skilling progression, levels 1–99

Initial audit and design pass, 20 November 2026. Current behavior comes from [skill actions](../src/data/skills.ts), [masterworks](../src/data/professionProjects.ts), [Heists](../src/data/heist.ts), and [the skill XP curve](../src/engine/xp.ts).

## Decisions

- Each profession should have varied content through 99 and a mechanic or payoff that gives players a distinct reason to train it.
- Each profession gets a chase earned through steady work and a separate random-drop chase. Each skilling zone gets exactly one hidden collectible with no gameplay effect. Treat these as three separate rewards.
- Gathering is self-contained. Early production draws on one or two other professions, with advanced recipes ramping up to as many as five outside profession or crafting sources. Space meaningful unlocks so each one has room to matter.
- Mastery awards follow profession level. Levels 10, 30, 50, 70 and 90 each grant a global buff. Levels 20, 40, 60 and 80 each grant a buff to that profession. Level 99 grants a large global buff. XP from any eligible activity in the profession advances the same rewards.

## Current progression

Every main-game profession already caps at 99. The existing task mastery is a separate 1–100 track with thematic perks at 25, 50, 75 and 100. Some recipe batches also use task mastery thresholds.

| Levels | XP required in band | Share of total XP |
| --- | ---: | ---: |
| 1–30 | 13,363 | 0.1% |
| 30–65 | 436,065 | 3.3% |
| 65–80 | 1,536,640 | 11.8% |
| 80–90 | 3,360,264 | 25.8% |
| 90–99 | 7,688,099 | 59.0% |

Foraging, Thieving, Alchemy and Cooking have the longest stretches without regular unlocks. Forging, Woodcrafting and Gemcutting already have dense recipe lists. Their existing recipes can support progression between larger unlocks that change what a player can do. Mining, Woodcutting, Agility and Astrology already reach 90, so their late bands need reasons to choose among activities as well as a finish at 99.

The baseline hours below use each skill's fastest listed ordinary action available by 90, repeated through 99 at its base XP and interval. They exclude boss keys, mastery batches, Focus, buffs, material preparation, access gates and specialist activities such as Heists. They are a comparison of listed rates. Full journey timings need to measure how people can actually train.

| Profession | Latest listed ordinary action | Other late content or dependency | Base hours 90–99 | First design direction, for review |
| --- | ---: | --- | ---: | --- |
| Mining | 90 | Pick project needs bars and planks. Agility gates two optional deposits. | 475 | Use metal, crystal and fossil deposits for different goals. Earn a pick from core Mining work and chase an exceptional seam find. |
| Woodcutting | 90 | Hatchet project needs bars. Agility gates an optional stand. Planks already use the skill's own logs. | 475 | Give timber, resin and heartwood distinct late uses. Earn a hatchet through work across stands and chase rare living heartwood. |
| Foraging | 60 | Greenhouse supplies a parallel growing loop. Sickle project needs other professions. | 623 | Add late habitats and greenhouse crops with different growing patterns. Earn a seedkeeper upgrade through cultivation and chase a wild rare seed. |
| Thieving | 52 | Heists and projects reach 75. Thieving supplies its own entry markers. Agility can speed up rooms. | 774 | Extend high-risk marks and vaults. Count completed thefts or heist rooms toward a trophy, with a separate jackpot in eligible vaults. |
| Agility | 90 | Shortcut unlocks reach 85. Courses are available independently of the skills that benefit. | 402 | Give courses distinct route choices and times to beat. Earn a route reward from course records and chase a rare course find. |
| Archaeology | 85 | Seven sites, bedrock layers and the Relic Forge form the current route. The Buried Grudge project draws on Smelting. | 684 | Extend depth and restoration choices. Reassemble a relic through dig and sift work, with a separate intact relic drop. |
| Astrology | 90 | Fourteen studies and a Star Chart use locally earned Stardust. Gilded Stardust already provides a random find. | 427 | Use the Star Chart for the steady chase and review whether the existing rare currency funds a distinct reward worth pursuing. |
| Smelting | 90 | Copper and iron start with Mining. Some late bars already supply capstone projects. | 678 | Make furnace recipes specialize across different alloys. Earn a crucible upgrade through refining and chase a rare master-alloy find. |
| Forging | 80 | Worldheart is a level-90 project. Early weapons use Smelting and Woodcutting. | 254 | Use major unlocks for ways to shape martial gear. Reuse a suitable existing masterwork for the steady chase and evaluate a rare forge pattern. |
| Woodcrafting | 85 | Dedicated recipes and drawknife exist. Early bows and wands use Woodcutting and Smelting. | 254 | Give bows, caster frames and soft armour different late craft choices. Add a signature Woodcrafting project and a rare grain pattern. |
| Alchemy | 65 | Early flasks use Foraging and Woodcutting. The Still Heart and Witchglass unlock by 65. | 293 | Give late distillation and transmutation different goals. Use a signature flask project for the steady chase and a rare formula for the drop. |
| Gemcutting | 87 | Early support cuts draw from Mining, Woodcutting and Foraging. Family cuts, exact cuts and recycling already exist. | 854 | Bring early support cuts down to two source professions. Use late precision cuts and a lapidary project for steady progress, with a rare cut result of its own. |
| Rune-carving | 90 | Several starter families draw on three gathering skills. Inscriptions and pinnacle equipment already provide advanced targets. | 712 | Keep early families on one or two suppliers. Build around the existing inscription chase and evaluate a distinct rare engraving. |
| Cooking | 65 | Early meals use Foraging. The two advanced feast projects both unlock at 60. | 419 | Add distinct late meal and feast options. Use a feast project for steady progress and a rare recipe for the drop. |
| Cartography | 85 | Vellum and ink are crafted locally but the early map chain can draw on Woodcutting, Foraging and Mining. Artisans' Reliquary is a level-50 project. | 253 | Simplify the first map chain. Use late survey and chart choices to build toward a signature atlas project, with a separate rare chart find. |

Fishing has a separately gated progression in [Saltmere](FISHING_RPG.md), with gear, logbook goals, legendary catches and voyages. Review its hidden collectible coverage by water while preserving that RPG's established design. Fletching is a planned placeholder for quivers. Apply the agreed profession framework when it gets its own content pass.

## Proposed design checks

- Measure hands-off and active time across the full journey, accounting for unlocked actions, tool and mastery bonuses, preparation, travel or station gates, and offline play. Give the bands from 80 to 90 and 90 to 99 distinct goals and choices. Use actual time between rewards to judge spacing.
- For gathering, prove that a fresh character can reach the top activities and earn both chases using that profession's own loop. Audit cross-profession tools, station upgrades, shortcuts and material gates against that route. Identify any existing reward that would move or change in strength before proposing the change.
- For production, trace materials through intermediates so a locally made input cannot hide three separate early suppliers. Keep common recipes affordable as specialist projects introduce extra suppliers. Check for circular dependencies and rare materials required to reach the next useful tier.
- Specify each chase's eligible actions, visible progress or drop odds, usable reward and offline behavior. Reuse suitable existing rewards where they fit. For each skilling zone, record one stable collectible ID, its discovery, and its display location. Collection progress grants no XP, stats, materials, currency, access or other gameplay effect.
- Check existing saves, projects, task mastery, offline completions and capped levels before moving any perk or recipe.

## Open design topics

2. Where do global profession mastery buffs apply? Specify their reach and how level 99 rewards stack.
3. What counts as one skilling zone, and how does a player find its hidden collectible? Inventory named places across the gathering activities, courses, vaults, digs, workshops and Saltmere waters before assigning one per zone.
4. Review gathering one skill at a time. Lock the unlock ladder, independent supply, and two chase rewards.
5. Review production one skill at a time. Lock the recipes that change how each skill plays, the supplier ramp and two chase rewards.

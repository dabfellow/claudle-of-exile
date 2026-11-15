# Skilling overhaul reference

Date: 2026-11-12. Status: proposed direction accepted by the owner for reference; not implemented. Exact recipes, item effects, unlock requirements, costs and reward rates still need implementation specifications. Examples below illustrate the intended experience rather than final item designs.

## Purpose and agreed direction

Make skilling a second way to build a powerful character: useful when the campaign gets difficult, and deep enough that someone can spend most of their time skilling because they enjoy it.

Owner's intent: skilling originally supplemented a struggling build by letting players craft their next upgrade rather than farm it. It should also become a whole optional path for cool gear, including crafting-exclusive uniques and possible random unique rewards.

The owner explicitly chose:

- **Projects and surprises:** known unique crafting projects alongside unexpected finds.
- **One task per visit:** choose one activity, leave it running, return to inspect the haul and choose the next task. No automatic gathering/refining/crafting chain switching.
- **Independent skilling progression:** a dedicated skiller can advance to the best skilling projects without personally progressing through combat. Equipment retains appropriate equip requirements.

The full profession proposal below was reviewed positively by the owner and requested as a reference document. Saving it does not authorize a release or claim any proposed feature is live.

## Endgame unique design decisions

- Question 1, item identity (2026-11-12): **Mostly A, with some B.** Most new endgame uniques should be build-defining treasures that change how a character plays, alongside a smaller selection of powerful specialists that improve an existing build. The example shield, curse ring, bleed weapon and recovery flask are illustrations, not approved item designs. Exact items, effects and acquisition details remain open.
- Question 2, price of exceptional power (2026-11-12): **A — Build around a drawback.** The biggest powers should come with meaningful restrictions or sacrifices that shape the build. Conditional activation is not the chosen defining direction. The example spell-repeat staff is illustrative, not an approved item.
- Question 3, first crafted weapons (2026-11-12): **Both.** Woundmaker and Winter's Pyre accepted as item concepts below. Exact numbers, bases, requirements and recipes remain to specify; these items are not implemented.
- Question 4, Heist treasures (2026-11-12): **B only — Borrowed Tomorrow.** Instant life leech in exchange for no life regeneration or life recovery from flasks; stolen from an occult treasury. The Tyrant's Seal (stronger curses reflected onto the wearer) was not selected and is excluded from the roster.
- Question 5, Archaeology relics (2026-11-12): **B only — The Buried Grudge.** Restore a shield that stores damage prevented by blocking and releases it through the next slam as an additional physical shockwave; blocked hits still deal half their damage. Crown of the Last Servant (one empowered minion) was not selected and is excluded from the roster.
- Question 6, Alchemy-exclusive flasks (2026-11-12): **Both.** Witchglass and The Still Heart accepted as item concepts below. This adds a build-changing utility flask and a specialist life flask; exact effects, durations, charges and recipes remain to specify.
- Question 7, bow and body armour (2026-11-12): **Both.** The Homecoming and Debt of Stone accepted as item concepts below. Exact numbers and recipes remain to specify.
- Question 8, Rune-carving projects (2026-11-12): **Both.** Hands of the Forgotten Choir and Hollow Circuit accepted as item concepts below; both are made by inscribing crafted equipment.

The initial concept roster now contains ten accepted uniques. The owner selected their defining powers, drawbacks and broad acquisition routes. Exact tuning and implementation specifications remain open; no new effects, profession systems or rewards have been implemented by this design pass.

### Accepted endgame unique concepts

| Item | Defining power | Drawback | Exclusive acquisition route |
|---|---|---|---|
| **Woundmaker**, two-handed axe | Your bleeds can stack on the same enemy, rewarding sustained attacks against bosses. | Your hits deal much less damage, and you cannot critically strike. | Smithing project using a special Mining alloy. |
| **Winter's Pyre**, staff | Your cold damage can ignite, and your ignites deal much more damage. | You cannot chill or freeze, and deal no fire or lightning damage. | Crafted using ancient heartwood and an exceptional Gemcutting crystal. |
| **Borrowed Tomorrow**, amulet | Life leech restores life instantly. | You cannot regenerate life or recover life from flasks. | Heist-exclusive treasure stolen from an occult treasury. |
| **The Buried Grudge**, shield | Damage prevented by blocking builds up; your next slam releases it as an additional physical shockwave. | Blocked hits still deal half their damage. | Archaeology-exclusive relic restoration project. |
| **Witchglass**, utility flask | While active, your elemental damage becomes chaos damage. | You cannot inflict elemental ailments while active. | Alchemy-exclusive flask recipe. |
| **The Still Heart**, life flask | Powerful life recovery that continues even when you reach full life. | You cannot leech or regenerate life during its effect. | Alchemy-exclusive flask recipe. |
| **The Homecoming**, bow | Your arrows return after travelling out, hitting enemies again on the way back. | You can fire only one arrow per attack, regardless of additional-projectile bonuses. | Crafted from ancient heartwood with Rune-carving inscriptions. |
| **Debt of Stone**, body armour | A large portion of damage from incoming hits is taken gradually over several seconds, giving recovery time to work. | You cannot gain Energy Shield. | Smithing project using a special stone-metal alloy. |
| **Hands of the Forgotten Choir**, gloves | Your totem skills summon two totems at once and allow more active totems. | You cannot deal damage yourself. | Rune-carving project inscribing crafted gloves. |
| **Hollow Circuit**, ring | Your mana regeneration restores Energy Shield instead of mana. | You lose mana regeneration, and your Energy Shield cannot recharge naturally. | Rune-carving project inscribing a crafted ring. |

Implementation specifications still need to define Woundmaker's stack limit and application rules, Winter's Pyre's cold-sourced ignite damage and scaling so its fire-damage restriction does not disable its defining burn, and Borrowed Tomorrow's instant-leech limits and interactions. Required project ingredients retain dependable sources under the agreed project rules. Borrowed Tomorrow's exact Heist job and jackpot/progress acquisition details remain open.

The Buried Grudge still needs storage limits, shockwave scaling and consumption rules, and the order of block/mitigation calculations specified. Its charge is based on damage actually prevented; the shield's half-damage drawback must be included when calculating that amount. Exact restoration ingredients and site remain open.

Witchglass still needs conversion/scaling and existing damage-over-time interactions specified, including its interaction with Winter's Pyre's cold-sourced ignite. The Still Heart still needs recovery, duration, charge and refresh rules specified. Reaching full life does not end its recovery effect. Borrowed Tomorrow's prohibition on life recovery from flasks still applies when The Still Heart is equipped; the flask does not bypass it. Exact Alchemy project ingredients remain open.

The Homecoming still needs outward/return hit rules, travel and targeting behavior, and interactions with projectile supports specified. Its one-arrow restriction overrides additional-projectile bonuses. Debt of Stone still needs its delayed fraction, duration and mitigation order specified, including interactions with blocking and The Buried Grudge. Damage is delayed, not erased; mitigation must not apply a second time to the delayed portion.

Hands of the Forgotten Choir still needs its active-totem allowance, placement rules and damage-ownership interactions specified so its totems retain their damage while the wearer cannot deal damage personally. Hollow Circuit still needs its regeneration conversion calculation and interactions specified; the intended outcome is continuous Energy Shield recovery calculated from the mana regeneration the character would otherwise have, while mana must come from other sources such as flasks or leech. Exact inscription ingredients and unlocks remain open.

### Three pinnacle chase uniques

Added 2026-11-12 at the owner's request, bringing the design roster to thirteen. These three have big upsides and exactly **one explicit modifier or rule bend each**, with no extra affix package or added drawback. This is a specific exception to the earlier drawback-led direction, which still applies to the original ten. Each is assembled from at least three distinct endgame mechanics; crafting professions finish the project rather than counting as substitutes for those mechanics.

The owner specified these constraints. The names, slots, effects and draft recipe baskets below are assistant-authored design choices within that request; quantities, unlocks and implementation remain future work.

| Item | Its sole modifier | Multi-mechanic crafting project |
|---|---|---|
| **The Second Heresy**, ring | You may allocate **one additional Forbidden keystone**. | Crownless Sigils from **Hard Bosses**, a proposed stolen oath seal from **deep Heist vaults**, and a proposed restored taboo tablet from **Archaeology/Expedition**. Rune-carving inscribes the finished ring. |
| **Worldheart**, belt | **30% less Damage taken.** | A proposed world-core fragment from **Doomed Maps**, a proposed reliquary clasp from **Unique Maps**, and an Architect's Doom Sigil from an **Uber Boss**. Smithing assembles the belt. |
| **The Sum of All Things**, amulet | **(1–200)% more Damage.** | Small contributions from **every major endgame mechanic and all eleven professions**, listed below. The broad recipe is required for each craft. |

**Why these effects:** The Second Heresy opens normally incompatible passive combinations; Worldheart offers a single exceptional defensive multiplier; The Sum of All Things ranges from barely useful for an endgame amulet slot at 1% to triple damage at 200%. The latter is the strongest high-roll chase project. These effects do not also grant life, resistances, attributes, speed or other explicit modifiers.

**The Sum of All Things — a little from everything:**

- **Maps/Atlas and Cartography:** a proposed completed endgame atlas chart, prepared with high-tier mapmaking supplies and a Master Sextant. No allocated Atlas points are consumed.
- **Unique Maps:** a proposed reliquary fragment from their encounters.
- **Doomed Maps:** one Fractured Orb.
- **Hard Bosses:** a small trophy contribution from each of the five fights: Marrow Shards, Choir Glass, Black Pearl, Throne Ash and Crownless Sigil.
- **Uber Bosses:** one each of Exile's Doom Sigil, Architect's Doom Sigil and Void Sigil.
- **Thieving/Heist:** a proposed deep-vault treasure component, with Markers used normally to fund the job.
- **Archaeology/Expedition:** a proposed restored relic component using excavation finds and faction artifacts.
- **Mining, Woodcutting and Smithing:** a small special-alloy frame incorporating ancient heartwood.
- **Foraging/Greenhouse, Alchemy and Cooking:** a rare-bloom distillate and a prepared binding stock; these are project ingredients, not additional equipment bonuses. A Greenhouse-grown bloom or the same Foraging bloom is acceptable, preserving the existing background exception without requiring simultaneous production.
- **Gemcutting and Rune-carving:** a cut exceptional crystal and a final convergence inscription.

New component names and reward hooks above are proposals, not existing live drops. Each required component must have visible, dependable progress under the overhaul's existing project rules; uncertainty belongs primarily in the final amulet roll rather than a hidden impossible ingredient. Small contributions mean breadth across endgame activities, not enormous quantities from every activity. Exact counts beyond the explicitly listed one-each currencies remain to tune.

**Draft completion and reroll rules:** Every completed recipe grants its item. The Second Heresy and Worldheart have fixed effects. The Sum of All Things rolls one integer uniformly from 1 to 200; a low roll still completes the craft and consumes its inputs. Proposed reforging consumes another complete cross-mechanic recipe so chasing a better roll continues to use a little from everything; ordinary Divine/Seal/Wax handling must be specified so it cannot bypass that project cost. Existing uniques' reroll rules are unchanged. This is a crafting rule, not a second modifier on the amulet.

**Remaining interaction specifications:** The Second Heresy's extra allowance should apply once even with two copies, leave the tree's default one-Forbidden limit unchanged without the item, and settle an excess allocation safely if unequipped. Worldheart's one multiplier covers hits and damage over time; it must not mitigate Debt of Stone's already-mitigated delayed damage twice. The Sum of All Things applies its one multiplier to the wearer's damage, including their ailments, minions and totems, exactly once. Crafted chase items do not enter the ordinary world-drop pool. These combat-sourced pinnacle recipes are an additional endgame route, not requirements for progressing the independent profession projects above.

## Lessons from other games

- **Melvor Idle:** individual professions feed one another; effort in one skill helps another. Distinct mechanics and long-term progression give players reasons to plan their next session. [Official game description](https://store.steampowered.com/app/1267910/Melvor_Idle/).
- **RuneScape:** levels unlock meaningful equipment, activities and locations. Gathering supports multiple professions rather than one isolated output. [Official skills guide](https://www.runescape.com/game-guide/skills).
- **IdleOn:** production chains contribute to larger goals, including preparing a character to overcome a challenge and unlock more content. [Official overview](https://www.legendsofidleon.com/).

Application to Path of Idle: **choose something you want → gather or produce one part → return with useful progress and possibly a surprise → choose the next task.** These are design lessons, not a claim that the games use identical systems.

## Changes shared by every skilling group

### Independent access

Replace campaign requirements on ordinary skilling activities with skill levels and profession accomplishments. Stations required for those activities also need a route that a skiller can complete. Advanced Smithing should not require killing an unrelated campaign boss.

This unlocks crafting, not combat areas. Equipment retains character-level and attribute requirements. Existing boss-exclusive items stay tied to their bosses. Cartography can manufacture content without granting access to fight in it.

### Practical rewards and long projects

- **Practical work:** a reasonably predictable route to something useful: equipment, a resistance fix, a desired gem or supplies. Campaign upgrades must be achievable while they are still relevant.
- **Long projects:** known recipes for distinctive equipment, supported by uncommon materials, discoveries and occasional surprise rewards.

A known unique project must not secretly require one impossibly rare ingredient. Required materials have dependable sources; rare finds can accelerate the project or enable optional variations. An unsuccessful jackpot session still produces ordinary value and understandable progress.

### Rewards that suit the profession

Mining uncovers unusual minerals; Woodcutting uncovers heartwood; Archaeology recovers broken relics. Most finished weapons and armour come from making or restoring them. Complete random uniques fit Heist vaults better than ordinary herb patches. Each profession needs worthwhile rewards, but not every profession needs to produce armour.

### Existing progression and active play

Keep the existing per-task mastery model and roughly five-day base-work target. Mastery grants automatic efficiency bonuses for doing that task and never gates recipes or discoveries. Interesting unlocks belong to profession progression, separate from task mastery. Preserve the existing skilling tree's specialisation purpose; this proposal does not replace its point economy.

Mini-games remain optional ways to improve ordinary production. Exclusive discoveries and project completion must be fully achievable offline. Define reward rules explicitly so manual doubles cannot accidentally duplicate one-time project unlocks; exact treatment of new reward categories remains to be specified.

Combat and ordinary skilling continue competing for one activity slot. The Greenhouse remains an existing background exception; this is not a proposal for simultaneous production across all professions.

### Player information

Every task explains its outputs, what those materials are used for and what the player is progressing toward. Return summaries distinguish ordinary output, discoveries and project progress. Show costs, supply limits and stopping conditions before a task starts.

## 1. Mining — choosing what to uncover

**Existing foundation:** ore, rough gems and fossils.

**Proposed changes:**

- Extend useful ore progression beyond the current small set of basic metals.
- Give material tiers dependable ore sources and specialised deposits: rich ore, crystal-bearing rock and fossil-heavy seams.
- Make trade-offs visible: a fossil seam sacrifices some ordinary ore for better fossil prospects.
- Unlock deeper deposits through Mining levels and prospecting accomplishments instead of campaign areas.
- Keep lower materials useful in selected alloys and projects without requiring every late recipe to consume every earlier tier.

**Useful upgrades:** supply metals for targeted equipment and fossils for existing crafting. A player seeking physical protection can identify the deposit that helps that goal.

**Long projects and surprises:** collect rare mineral fragments for special alloys used in crafting-exclusive equipment and profession tools. Example: Mining supplies a defining metal for a shield that rewards blocking; Smithing makes the shield. The shield effect is illustrative.

**Reason to leave it running:** “I need metal for my next armour piece, and this deposit can also give me fragments for a special shield.”

## 2. Woodcutting — distinctive equipment materials

**Existing foundation:** logs, resins and secondary materials.

**Proposed changes:**

- Give wood families distinct uses in bows, staves, shields and selected equipment components.
- Offer ordinary timber stands, resin-rich trees and slower ancient trees with better heartwood prospects.
- Develop resins as deliberate crafting choices, clearly explaining what each helps produce.
- Keep basic timber refinement within Woodcutting and final equipment assembly in the existing equipment-crafting system.
- Do not make an unimplemented Fletching skill a prerequisite for Woodcutting becoming worthwhile.

**Useful upgrades:** provide a clear material route to replacement caster and bow weapons, plus defensive equipment.

**Long projects and surprises:** heartwood pieces become special weapon frames; ancient knots and unusual resins provide optional ingredients. An ancient staff frame used in a unique about alternating elemental spells is an example, not a final item effect.

**Reason to leave it running:** “This wood gets me closer to my next staff, and the heartwood is building toward something special.”

## 3. Foraging and Greenhouse — supplying valuable professions

**Proposed changes:**

- Give herb families clear recovery, protection, damage-preparation and skilling-supply purposes.
- Offer abundant patches for ordinary production and slower patches for concentrated ingredients.
- Connect seed discoveries from Foraging to the existing Greenhouse.
- Let discovered plants expand Greenhouse choices through Foraging progression.
- Keep the Greenhouse as a background system without extending simultaneous background production to every profession.

**Useful upgrades:** gather toward better recovery, a suitable meal or ingredients for defensive crafting.

**Long projects and surprises:** rare blooms support special flasks, powerful meals and nature-themed crafting projects. Give them identifiable sources rather than equal chances from every patch. Discoveries create lasting value by expanding the Greenhouse's useful herb supply.

**Reason to leave it running:** “I'm stocking what my build needs while looking for a plant that improves what my Greenhouse can grow.”

## 4. Smithing — turning materials into desirable gear

**Existing foundation:** normal or magic equipment bases for further crafting. This is the most important equipment change: Smithing should deliver “I worked toward my next upgrade.”

**Three forms of work:**

- **Base crafting:** retain inexpensive bases for players using the full crafting system.
- **Targeted equipment:** select a piece and broad purpose, such as physical damage, life and armour, elemental protection, or mana and energy shield.
- **Unique projects:** assemble known crafting-exclusive items from substantial material requirements.

Targeted equipment guarantees a useful foundation while leaving room for rolls and further improvement. An hours-long project should not finish with an item unrelated to the selected purpose.

**Independent progression:** replace the campaign cap on crafted item strength with Smithing progression and suitable station requirements. Keep normal equip requirements.

**Long projects and surprises:** prepare an alloy or frame, make components and assemble the item as separate player-selected tasks. Ordinary crafting can occasionally award project fragments or optional ingredients. Essential blueprints come from visible profession milestones rather than pure luck.

**Reason to leave it running:** “My weapon is holding my build back. I can work toward a replacement, and eventually a weapon I can only make through crafting.”

## 5. Alchemy — recovery and specialised flasks

**Proposed changes:**

- Make flask progression readable: stronger recovery, solutions to resource problems and specialised combat benefits.
- Offer targeted brewing so players can pursue a useful flask instead of repeatedly producing unsuitable results.
- Add a separate family of crafting-exclusive unique flasks.
- Retain currency production, organised around what the player wants to accomplish.

**Useful upgrades:** clear answers to running out of mana or recovery falling behind incoming damage.

**Long projects and surprises:** special distillates and prepared reagents contribute to unique flask recipes. Ordinary brewing can produce unusual project reagents. Existing unique flasks retain their current sources; new crafting-exclusive flasks have their own identities.

**Reason to leave it running:** “This improves my recovery now, and the special reagents progress toward a flask built for my character.”

## 6. Gemcutting — pursuing the gem a build needs

**Existing foundation:** gems produced from reachable pools.

**Proposed changes:**

- Select a meaningful family or function when cutting, such as elemental spells, physical attacks, summons or defensive supports.
- Add more expensive exact-gem recipes at relevant Gemcutting milestones.
- Give unwanted gems a useful recycling route into cutting materials.
- Allow skill-based recipe access independently of campaign progress while retaining gem equip requirements.

**Useful upgrades:** pursue a missing support or build-defining skill without depending entirely on random drops.

**Long projects and surprises:** exceptional crystals contribute to crafting-exclusive caster weapons or jewellery using existing equipment slots. Do not introduce a superior gem rarity as part of this overhaul; targeted access already gives the profession a substantial purpose.

**Reason to leave it running:** “I'm working toward the support my build needs, and unsuccessful cuts still help fund the next attempt.”

## 7. Rune-carving — deliberate equipment customisation

**Existing foundation:** six rune families, grades, slot-specific effects and resonance.

**Proposed changes:**

- Give families clear progression from simple utility to specialised build support.
- Make family, grade, equipment-slot effect and resonance easy to compare before crafting.
- Earn advanced inscriptions through Rune-carving accomplishments.
- Keep the existing one-rune-slot structure.

**Useful upgrades:** predictably improve a weakness without replacing an otherwise good item.

**Long projects and surprises:** rare inscription fragments contribute to a small selection of signature runes that alter play. Show their strengths and limitations before materials are committed. A longer project can combine an ordinary crafted piece with a special inscription to produce a crafting-exclusive unique.

**Reason to leave it running:** “My equipment is good enough to keep. I'm making the inscription that helps it fit my build.”

## 8. Thieving and Heist — choosing treasure to pursue

**Existing foundation:** depth, crew, alarms and targeted job rewards. Strengthen these choices rather than replacing the loop.

**Proposed changes:**

- Unlock jobs through Thieving progression and successful jobs instead of campaign areas.
- Clearly identify jobs for equipment, crafting currency, project components or gold.
- Preserve crew selection and planned exit depth before the run.
- Offer safer dependable income and deeper attempts with greater reward uncertainty.
- Show likely Marker consumption and conditions that stop or change the activity. Retain existing repeat/fallback behavior where applicable; do not add automatic production chains.

**Useful upgrades:** equipment jobs target broad equipment categories; material jobs support other crafting professions.

**Long projects and surprises:** vaults can contain complete Heist-exclusive uniques and fragments for known treasures to assemble or restore. Missing a jackpot still yields ordinary valuables and progress toward a known reward.

**Reason to leave it running:** “I've prepared a job for the treasure I want. The haul is useful even if the vault's rare item does not appear.”

## 9. Archaeology and Expedition — restoring discoveries

**Existing foundation:** sites, strata, finds, standing and merchants; a strong foundation for long projects.

**Proposed changes:**

- Replace the Act 4 entry requirement with an introductory Archaeology route.
- Let site discoveries unlock restoration recipes and further excavation opportunities.
- Preserve faction identity through different restoration projects and merchant specialities.
- Present discoveries and restoration progress together.
- Keep ordinary artifacts and merchant purchases useful throughout the pursuit.

**Useful upgrades:** merchants continue supplying crafting materials; early restorations offer equipment useful to campaign characters.

**Long projects and surprises:** recover broken relics and restore them through known recipes. Selected projects use supporting Smithing, Gemcutting or Rune-carving work. Duplicate fragments retain exchange or restoration value.

**Reason to leave it running:** “I'm uncovering the next layer, earning useful supplies and restoring something that belonged to the people buried here.”

## 10. Cooking — preparing for the next problem

**Proposed changes:**

- Provide skill-based entry instead of waiting until Act 5.
- Organise meals by survival, resources, damage, gathering and production.
- Add a limited set of meals supporting skilling itself.
- Keep one active meal, with clear duration and automatic re-eating information.
- Keep ordinary recipes affordable enough to use regularly.

**Useful upgrades:** defensive meals help fragile builds; resource meals support demanding skill setups. Each dish explains why someone would cook it.

**Long projects and surprises:** rare ingredients support signature dishes and feast projects. Exclusive rewards focus on consumables rather than making Cooking produce armour. A small profession-tool project may improve Cooking, but equipment remains secondary to excellent food.

**Reason to leave it running:** “I'm preparing supplies for the next stretch of combat, or for a long session in another profession.”

## 11. Cartography — supplying chosen adventures

**Proposed changes:**

- Unlock mapmaking through Cartography progression instead of Act 6 alone.
- Separate manufacture from combat access and Map Device requirements.
- Strengthen choices around themes, map upgrades and Sextants.
- Show the materials and tasks contributing to the desired map product.
- Preserve useful ordinary production alongside rare projects.

**Useful upgrades:** prepare the Maps a player wants to run instead of relying entirely on drops.

**Long projects and surprises:** unusual chart fragments assemble into crafting-exclusive Unique Maps with distinctive encounters or rewards. Completing the chart is a skilling accomplishment; entering still requires combat access, and encounter rewards are earned inside.

**Reason to leave it running:** “I'm supplying my next Maps while assembling a chart to somewhere unusual.”

## How the groups work together

Professions support one another without requiring all eleven for every desirable recipe.

| Player goal | Main route | Supporting professions |
|---|---|---|
| Replace a weak melee weapon | Smithing | Mining |
| Make a bow or caster weapon | Smithing | Woodcutting, sometimes Gemcutting |
| Fix recovery problems | Alchemy | Foraging |
| Improve an otherwise good item | Rune-carving | Relevant material suppliers |
| Obtain a missing build gem | Gemcutting | Mining |
| Restore an unusual unique | Archaeology | One or two relevant production skills |
| Prepare for a difficult encounter | Cooking or Alchemy | Foraging |
| Pursue treasure directly | Heist | Its own preparation and crew |
| Supply chosen endgame content | Cartography | Selected gathering and production skills |

## Recommended build order and acceptance checks

Start with independent access, Mining, Woodcutting and Smithing: together they prove the equipment path. Follow with Foraging, Alchemy and Cooking, then deepen the specialist professions. This is a proposed order, not a release schedule.

Verify these journeys before expanding the whole overhaul:

- A struggling campaign character can identify and craft a useful upgrade before it becomes obsolete.
- A character avoiding combat can progress through skilling and complete a desirable exclusive project.
- An overnight task returns ordinary value, understandable progress and an appropriate chance of a surprise.
- Live and offline completion use the same project and discovery rules, with correct inputs and no duplicate one-time rewards.
- Exhausted inputs or full storage stop work clearly without granting unfinished project rewards.
- Existing skill XP, task mastery, discoveries and materials carry forward.

## Boundaries and details still to specify

- Existing world-drop, achievement and boss-exclusive uniques retain their sources. New profession rewards are additions; moving existing rewards requires a separate decision.
- Fishing stays a permanent placeholder/joke. Fletching and other new professions are outside this overhaul.
- Do not change combat balance or the skilling tree point economy incidentally.
- Preserve existing character/realm ownership and trading rules unless a separate change is agreed.
- Before implementation, specify exact skill/station unlocks, targeted-craft guarantees, project recipes, reward pools, rates, costs and new unique effects. Do not treat the illustrative shield or staff as final designs.
- The reference records future design. Current player behavior remains documented in [GAME.md](GAME.md); implementation work is tracked in [MILESTONES.md](MILESTONES.md).

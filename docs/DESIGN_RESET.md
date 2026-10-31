# Design reset

Settled 2026-10-30. The built game is the skeleton, and this doc is the record of what you decided, in your words. The
result is written up in [GDD.md](design/GDD.md), which is now the current design, and the work is in
[ROADMAP.md](ROADMAP.md).

## Fixed (you, 2026-10-30)

- **End state:** months of play to build a top-end character that easily clears all content.
- **Maps are essential.** They're the endgame and they stay.
- **The long tail:** "years" comes from a broad mix of reasons to keep playing. Rare drops, expensive crafts and multiple
  characters are three examples out of many, not the full list.
- **Art:** asset packs, and they're the real art, not placeholders. No AI art.
- **Pacing:** needs an overhaul. The current targets don't carry over.

## Skeleton (kept whatever the design becomes)

This is infrastructure. It doesn't depend on the numbers or the content in it.

| Piece | Where |
|---|---|
| Game loop, state, offline progress | `src/game.ts`, `engine/state.ts`, `engine/offline.ts` |
| Save system and migrations, cloud saves, accounts | `engine/save.ts`, `platform/` |
| Headless sim and bot | `scripts/sim.ts` |
| Data-driven content (zones, gems, bases, affixes, drops, trees) | `src/data/` |
| Stat, item, crafting and combat engines | `src/engine/` |
| UI shell, design system, art import | `src/ui/`, [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md), `npm run art` |
| Hosting, Sentry, Admin page, feedback | [LAUNCH.md](ops/LAUNCH.md) |

The engines stay as code, but what they do is reopened below. Combat's rules can change without rewriting the loop
around them.

## Reopened, in the order to settle them

Each decision depends on the ones above it. Numbers tuned before step 2 would just get thrown away.

### 1. The finished game

**A dedicated player's journey (you, 2026-10-30):**
- **Day 1:** equip your character with at most some blue crafted gear, that's okay; get through a couple of Act 1 stages.
- **Week 1:** farm combat or mats to craft or find a good set of rare equipment; partially through Act 3.
- **Month 1:** finished Act 6 if pushing combat hard, or just starting it if you've done a mix.
- **Month 3:** farming Maps to get gear and levels for hard mode bosses, for uniques and other rare drops.
- **Month 6 and beyond:** farming high level passive nodes for rare crafting materials, to min-max crafted gear to
  easily farm hard mode bosses and endless content.

**Settled:**
- **Endless content:** a post-Maps thing. Not designed yet, and that's fine for now.
- **Hard mode bosses:** new bosses. Boss keys drop from monsters or are crafted through skilling.
- **High level passive nodes:** resource nodes from passive skilling.
- **Maps:**
  - **Getting them:** they drop from monsters. Cartography is an optional second route, for crafting them if you want
    to do something like a huge offline map grind.
  - **Running one:** a set number of monster packs, then a map boss.
  - **What makes one better:** tiers set the difficulty; each map has a fixed theme that favours a certain drop (fossils,
    a unique, boss keys).
  - **Using them up:** consumed per run, so keeping a supply going is part of the game.
  - **Idling:** auto-run. Pick a tier and theme, and the device keeps using matching maps from your stash until none
    are left.
- **Top-end character:** clears hard mode bosses and top-tier maps on idle without dying. The sim can test this.
- **Long-term engagement so far:** rare drops, expensive crafts, multiple characters, collection log (uniques, bosses,
  map themes, with rewards), Melvor-style masteries, ascendancies, build-defining uniques, shared stash. More can be
  added. Competing is out: no leaderboards, no seasons.

### 2. The pacing model
Work backwards from the end state, not forwards from Act 1.

**Settled:**
- **Daily play:** a mix. Players may need manual inputs for a hard boss or to push maps and zones, especially early on,
  so they benefit from active play. No check-ins every couple of hours that last 20–40 minutes.
- **Offline combat:** the game is already influenced a lot by the player being there. Automation can be locked behind
  hideout upgrades, which limits how good offline combat is.
- **Offline skilling:** always full speed.
- **Offline cap:** starts at 8 hours; a hideout upgrade raises it to 24 over time.
- **Automation unlocks:** by type of rule. Simple rules like "on cooldown" are free; reactive ones like "when a boss
  winds up" or "when life is below 40%" unlock later, so bosses stay hard to idle until the smart rules are earned.
- **Dying offline:** combat stops until you return.
- **New bosses offline:** once a player has earned the reactive rules, a strong enough build can beat new bosses offline.
- **Character levels:** around 65 at the end of Act 6. Top-end needs maybe level 90; level 100 is a long chase and a rare
  goal well beyond that.
- **Combat and skilling:** one at a time, as today. Each offline period is a real choice, which is what separates
  pushing combat hard from doing a mix.
- **Skill 99:** keep about the same, ~53 days of nonstop training on the best node.
- **Slowing the campaign:** measure first. Add rule locks, offline stops and a combat/skilling split to the sim, then fix
  only the gap left against the timeline.
- **A typical visit:** you get on to check your offline progress, sort through some loot or start a new skilling
  thing, spend skill points, check for upgrades, start up something passive and dip.

**Still to settle:**
- Exact hours for each milestone, set from the sim once rule locks, offline stops and the combat/skilling split are in.
- Current numbers to replace: Act 1 6–10 h, "3–7 days" per act (never defined in hours), Maps at ~1 month. Level 100
  and skill 99 curves are also in scope; gathering 99 is ~53 days of continuous training
  ([BALANCE.md](design/BALANCE.md)).

### 3. The core systems

**Settled:**
- **Battlefield:** keep it. It feels awesome. Positioning, ranges and closing in stay the core of combat; tuning fixes
  the rough edges.
- **Manual play:** both. Better decisions (casting skills and drinking flasks at the right moment) and boss moments on
  hard bosses that only a player can do well at first, like clicking a weak point or picking which add to kill.
  Reactive rules need a way to handle these for idle clears.
- **Rules:** per skill, as now, with better priority controls and more rule slots as they unlock.
- **New skills:** batches by act. Each act brings a themed set of skills and supports, as part of the act recipe.
- **Classes:** six normal classes. Exile becomes a hard mode, unlocked by finishing the campaign with another character.
- **Ascendancies:** two per class, 14 in total, unlocked around Act 3. Picking one unlocks a new section of the main tree.
- **Gear:** extend base tiers to about level 80, so new Maps tiers keep bringing visibly better gear.
- **Character tree:** keep the current tree and add enough nodes for the extra levels.
- **Top crafts:** both. Rare materials can force exactly the mod you want at a high price, and can roll past normal limits
  with a risk of damaging or destroying the item.
- **New skills:** both timings. One arrives with each act from Act 2 on, and more arrive around or after Act 6.
- **What new skills do:** each feeds its own game system (Heist or Expedition-style activities) and also produces
  materials for the crafting economy.
- **Across characters:**
  - **Hideout and rule unlocks:** shared by the account. Stations, reactive rules and the offline cap stay unlocked for
    every character.
  - **Skill levels:** per character.
  - **Campaign:** true to PoE: every character plays through it.
  - **Challenge modes:** each has its own separate stash, hideout and unlocks, so it's a true fresh start.
    - **Hardcore:** when the character dies it's gone for good, with its gear.
    - **Classic:** no skilling, combat only.
    - **Exile:** stays an unlockable class in the normal game, and can also be taken into challenge modes.
    - **Hardcore offline:** your risk. Offline combat works normally, so a setup that fails overnight loses the character.
- **Rare crafting materials:** rare drops from monsters and map themes in every mode, including Classic. Skilling is the
  min-max, faster way to get them, but the time investment might edge it out; players should figure that out.
- **Late-game hideout:** long-term upgrades. High-level stations cost rare materials and give lasting bonuses like better
  automation, the 24-hour offline cap and more map options.
- **Balance:** the game doesn't need to be perfectly balanced. If it were, choices wouldn't matter.

**Where each system stood going in (design settled above; numbers come from the sim):**

| System | Today | Question | Doc |
|---|---|---|---|
| Combat | Hex half-ring, action times, 6 skills with rules | Is this the game? Does idle vs manual match the pillars? | [BATTLEFIELD.md](design/BATTLEFIELD.md) |
| Skills and supports | Actives and supports, attribute gates, gem levels to 20 | How many, unlocking when; skill bar overhaul | [SKILLS_AND_UNIQUES.md](design/SKILLS_AND_UNIQUES.md) |
| Classes | 7, each with a mechanic, plus ascendancies planned | Are 7 right for replaying? Do ascendancies exist? | [CLASSES.md](design/CLASSES.md) |
| Trees | Character tree and skilling tree | Do they survive the new pacing? | [TREES.md](design/TREES.md) |
| Gear and affixes | 315 bases to level 60, 9 affix tiers | Does the ladder match the new level range? Numbers were never simmed | [GEAR.md](design/GEAR.md) |
| Crafting | Orbs, bench, fossils, essences, auto-crafting | Where do "super rare crafts" come from? | [SKILLING_REWORK.md](design/SKILLING_REWORK.md) |
| Skilling | 5 planned skills on top of the current set | How many does the game need? | [SKILLING_REWORK.md](design/SKILLING_REWORK.md) |
| Economy and drops | Tiered tables, sim-tuned for Act 1 | Rebuild from the pacing model | [BALANCE.md](design/BALANCE.md) |
| Town and hideout | Stations, shops, upgrades | What do they do in the late game? | [TOWN.md](design/TOWN.md) |

### 4. Content plan
**The act recipe:**
- **Size:** acts grow. Early acts stay at about 8 stages and later ones reach 10–20, so the campaign feels like it's
  getting bigger.
- **Identity:** a new boss mechanic and resistance check, like Act 2's Scorched earth and fire damage.
- **Each act also brings:** a themed batch of skills and supports, and from Act 2 on, a new skill.
- **Levels:** Acts 3–6 cover about 33 to 65.

**Act 2 as built:** rebuild from the recipe. Use it as a starting point, and redo anything that doesn't fit. Its 40
monsters show a skull icon today and need pack art. Finding assets is quick, so it doesn't limit act size.

### 5. Live game and transition
- **Saves:** wiped at the 1.0 launch, with a clear message. Everyone starts fresh.
- **Live site:** updated as we go. Changes go live in stages, so real players test them early.
- **1.0:** the game is already live on your site. You decide when to call 1.0, based solely on vibes.

### 6. Roadmap
Written 2026-10-30: [ROADMAP.md](ROADMAP.md).

## Paused until the matching step is done

Tuning that the reset would overwrite. These stay in [TODO.md](TODO.md) and restart at their milestone in
[ROADMAP.md](ROADMAP.md).
- All balance and sim reruns (step 2).
- Act 2 release (steps 2 and 4).
- New skills, skill bar overhaul, mana rework (step 3).

Your setup jobs aren't paused, especially rotating the OAuth secrets.

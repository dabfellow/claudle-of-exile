# Path of Idle — Game Design (v0.3)

> Status: **the design the game is building toward**, from the 2026-10-30 reset. Decisions and their wording are recorded in [MILESTONES.md](../MILESTONES.md); the order of work is in [MILESTONES.md](../MILESTONES.md). The live game doesn't match all of this yet. The other docs in this folder describe what's built, each with a note on what the reset changes.

## 1. Vision

A browser idle ARPG people play for **weeks, months, years**. Melvor-style skilling and offline progress, Path of Exile-style loot and crafting, and combat that is **automated by your setup**, with hard fights rewarding a good setup, good gear and being there. Idling is always an option, never the optimal way to push.

It takes **months to build a top-end character** that easily clears all content. The years come from a broad mix of reasons to keep playing (§9), not from an open-ended grind.

### Pillars
1. **Your build fights for you.** Skills, supports, tactics rules and flasks decide fights. You can step in manually, and on hard content it pays to.
2. **Loot is exciting, crafting is precise.** Monster drops give the big random wins; crafting is how you get *exactly* the item you want.
3. **Skilling supports, it doesn't replace.** Gathering and production make you stronger and richer. Combat and skilling are both valid ways to spend your time, and players work out which pays off.
4. **Every screen reads at a glance.** Clean, consistent, animated.
5. **Choices should matter.** The game doesn't need to be perfectly balanced. If it were, none of your choices would matter.

### What we keep
- Combat juice: name card shake, crit flashes, floating damage, visible attack timers.
- Hideout you build up over time.
- Sell-all buttons. Crafting bench concept. The tutorial flow.

---

## 2. Progression & pacing

**Dropped 2026-10-31:** the journey below was too slow for players, so it no longer sets XP. Players set the pace through acts. The level curve is set by play time: 1–20 about 3 h, 20–40 3 h, 40–65 6 h, 65–80 12 h, 80–95 20 h, 95–99 20 h, and 99 is halfway to 100 in XP. Area level ranges cap levelling: above an area's range XP falls to −80% at 5 levels over and to nothing at 25 over, and below it pays up to 20% more ([BALANCE.md](BALANCE.md) → Knobs).

### A dedicated player's journey
| When | What they're doing |
|---|---|
| **Day 1** | At most some blue crafted gear, and that's okay; through a couple of Act 1 stages |
| **Week 1** | Farming combat or mats to craft or find a good set of rare equipment; partially through Act 3 |
| **Month 1** | Finished Act 6 if pushing combat hard, or just starting it on a mix |
| **Month 3** | Farming Maps for gear and levels, for hard mode bosses, for uniques and other rare drops |
| **Month 6+** | Farming high level passive nodes for rare crafting materials, to min-max crafted gear and easily farm hard mode bosses and endless content |

**Top-end character:** clears hard mode bosses and top-tier maps on idle without dying. The sim can test this.

### Levels
- Around 65 at the end of Act 6.
- Top-end needs maybe level 90. Level 100 is a long chase and a rare goal well beyond that.
- Skill 99 stays around 53 days of nonstop training on the best node.

### Daily play
- **A typical visit:** check your offline progress, sort through some loot or start a new skilling thing, spend skill points, check for upgrades, start up something passive and dip.
- Manual input helps with a hard boss or pushing maps and zones, especially early on. No check-ins every couple of hours that last 20–40 minutes.

### Offline
- A character does one thing at a time: combat, a skill or auto-crafting. Each offline period is a real choice.
- **Skilling** always runs at full speed. Mini-games add up to 45% on top while you play ([SKILLING_REWORK.md](SKILLING_REWORK.md) §9).
- **Combat** is limited by automation, not by a speed penalty. Better rules are earned (§4).
- **Dying offline** stops combat until you return.
- **New bosses** can be beaten offline by a strong enough build; the essential reactive rules are baseline.
- **Offline cap:** starts at 8 hours; a hideout upgrade raises it to 24 over time.
- **As built (Milestone 1):** the Watchtower sets the cap (8, 12, 16, 24 h). Until Wind-up rules are earned no boss spawns offline, new or already beaten, and one on the field when you leave goes back into hiding. A greenhouse keeps growing after combat stops.

### Hitting the timeline
Measure first: put rule locks, offline stops and a combat/skilling split in the sim, then fix only the gap left. Exact hours per milestone come from that. Replaces the old targets (Act 1 at 6–10 h, 3–7 days per act).

---

## 3. Character

### Attributes
- **Strength** → +life, +melee physical damage. **Dexterity** → +accuracy, +evasion. **Intelligence** → +mana, +energy shield.
- Gear and skill gems have **attribute requirements**, so builds have to plan for them.
- Attributes come mainly from the character tree and gear.

### Resources
- **Life** and **Mana**. Skills cost mana.
- Flasks: life, mana and utility. Charges refill on kills.

### Classes
- **Six normal classes**, each with its own mechanic: Warrior, Ranger, Mage, Duelist, Templar, Shadow ([CLASSES.md](CLASSES.md)).
- **Exile** is a hard mode class, unlocked by finishing the campaign with another character.
- **Ascendancies:** two per main class, 12 in total, with four trials from Act 3 through Tier 5 Maps. Exile has none. Each has its
  own tree and its own points ([ASCENDANCIES.md](ASCENDANCIES.md)).

---

## 4. Skills, supports & tactics

- **Skill gems** go into a **skill bar of 6 fixed slots**. Each has its own **support sockets**.
- Gems **level up with use** and have attribute requirements.
- **New skills arrive in batches by act:** each act brings a themed set of skills and supports.
- **As built:** each gem is tied to an act, which decides when it can drop, be cut or be sold. Character level still applies, and gems you own always stay usable ([SKILLS_AND_UNIQUES.md](SKILLS_AND_UNIQUES.md#act-batches)).
- Skill roles: Main, Burst, Area, Guard, Buff/Curse, Sustain. Current gems are in [SKILLS_AND_UNIQUES.md](SKILLS_AND_UNIQUES.md).

### Tactics rules (the idle core)
- Rules stay **per skill**, with better priority controls and more rule slots as they unlock.
- **Simple rules** like "on cooldown" are free.
- **Reactive rules** like "when a boss winds up" or "when life is below 40%" unlock later, so bosses stay hard to idle until the smart rules are earned.
- You can always cast manually.
- **As built (overhauled 2026-11-05):** every skill has High, Normal or Low priority and starts with 2 condition slots; all conditions must pass. Vitals, Wind-up and Ground rules are baseline, as are automatic low-Life and low-Mana recovery flasks. The War Table teaches Status rules (level 2), Aim rules (level 3), the 3rd condition (level 4), then Normal/Magic/Rare auto-salvage (levels 5–7). Unlocks are one-way and shared by the account.

---

## 5. Two skill trees

| Tree | Points from | Changes |
|---|---|---|
| **Character tree** | Character levels + quest rewards | Attributes, life/mana, damage, defences, flasks, keystones |
| **Skilling tree** | Total skill levels | Gathering and production speed, double outputs, crafted item quality |

Keeping them separate means skilling never costs combat power and vice versa.

The character tree stays and gains enough nodes for the extra levels. Ascendancies add sections to it ([TREES.md](TREES.md)). Life skills are the crafting economy ([SKILLING_REWORK.md](SKILLING_REWORK.md)).

---

## 6. Combat

- **The hex half-ring battlefield is the core of combat.** Positioning, ranges and closing in stay; tuning fixes the rough edges ([BATTLEFIELD.md](BATTLEFIELD.md)).
- **Manual play adds two things:** better decisions (casting skills and drinking flasks at the right moment), and boss moments on hard bosses that only a player can do well at first, like clicking a weak point or picking which add to kill. Reactive rules need a way to handle these for idle clears.
- Packs of monsters, with bosses bringing adds.
- **Death:** sent back to the hideout and lose **5% of the XP toward your next character level** (never de-levels). Hardcore is different (§11).

---

## 7. Items & crafting

- Gear base tiers extend to about **level 80**, so new Maps tiers keep bringing visibly better gear ([GEAR.md](GEAR.md)).
- **Top crafts** use rare materials in two ways: forcing exactly the mod you want at a high price, and rolling past normal limits with a risk of damaging or destroying the item.
- **Rare materials** come from high level passive nodes, and drop rarely from monsters and map themes. Skilling is the min-max, faster way to get them, but the time investment might edge it out. Players should figure that out.
- **Build-defining uniques** change how a skill or class works, so finding one can inspire a new character.
- Smithing item level stays capped by campaign progress.
- **Later:** loot and sell filter rules.

---

## 8. Stash, town & hideout

- A **shared stash** lets characters pass items to each other. Challenge modes keep their own.
- **Hideout:** stations unlock things, and high-level stations cost rare materials and give lasting bonuses like better automation, the 24-hour offline cap and more map options, so there's something to work on for months ([TOWN.md](TOWN.md)).
- **Town:** shops sell decent crafted gear at high prices, never the best way to gear up.

---

## 9. Economy & long-term goals

- **Monsters** drop most good gear, all high-tier currency and unique items.
- **Achievements** unlock bench recipes.
- Drop tables get rebuilt from the pacing model.

**What keeps people playing:** rare drops, expensive crafts, multiple characters, a collection log (uniques, bosses and map themes, with rewards), Melvor-style masteries, ascendancies, build-defining uniques and the shared stash. This list can grow. **Not planned:** leaderboards or seasons.

**Monetisation:** cosmetics and supporter packs only, never pay-to-win.

---

## 10. Acts & endgame

### The act recipe
Six acts, all built the same way:
- **Size:** early acts have about 8 stages, later ones reach 10–20.
- **Identity:** a new boss mechanic and resistance check, like Act 2's Scorched earth and fire damage.
- **Each act also brings** a themed batch of skills and supports, and from Act 2 on, a new skill.
- **Levels:** Acts 3–6 cover about 33 to 65.
- **New skills** feed their own game system and produce crafting materials. More arrive around or after Act 6.

Act 1 is *The Drowned Coast* and ends with Ysolde. Act 2 is *The Burning Steppe*, which gets rebuilt from this recipe ([ACT2.md](ACT2.md)). **Story** is the very last thing added.

### Maps
The endgame, unlocked after Act 6.
- **Getting them:** they drop from monsters. Cartography is an optional second route, for crafting them if you want to do something like a huge offline map grind.
- **Running one:** a set number of monster packs, then a map boss.
- **What makes one better:** a map is just a tier, Map Tier 1 to 10. Sextants slotted in the Map Device add mods that raise the danger and the reward ([MAPS.md](MAPS.md)).
- **Using them up:** consumed per run, so keeping a supply going is part of the game.
- **Idling:** auto-run. Pick a tier, and the device keeps using those maps until none are left.

### Hard mode bosses
New bosses. Boss keys drop from monsters or are crafted through skilling.

### Endless content
Comes after Maps. Not designed yet.

---

## 11. Accounts, characters & modes

Supabase login with cloud saves; see [SETUP.md](../ops/SETUP.md).

| Across characters | |
|---|---|
| Hideout, rule unlocks, offline cap | Shared by the account |
| Stash | Shared |
| Skill levels | Per character |
| Campaign | True to PoE: every character plays through it |

**Challenge modes** are three toggles picked when a character is made, in any mix, and fixed from then on. Each mix has its own separate stash, hideout and unlocks, so it's a true fresh start. Exile can be taken into them, and finishing the campaign in any mode unlocks it for the whole account.
- **Hardcore:** when the character dies it's deleted for good, with its bag and gear. Hardcore characters share a stash with each other, and that stays. Offline combat works normally, so a setup that fails overnight loses the character.
- **Solo Self-Found:** no Player Market. Every SSF character is alone: its stash, hideout and unlocks are its own, and go when it does. NPC shops still work.
- **Classic:** no gathering, crafting or Heist, combat only. The Crafting Bench and orbs still work. Hideout upgrades swap gathered materials for gold at 5 times their sale value, the Forge and Alchemy Table are hidden, and the bench recipes tied to skilling achievements are open from the start.
- Hardcore, Classic and Hardcore Classic each have their own Player Market.

---

## 12. Art

Asset packs, and they're the real art, not placeholders. No AI art. Mapping: [ASSET_MAPPING.md](ASSET_MAPPING.md).

---

## 13. Build order

See [MILESTONES.md](../MILESTONES.md). The live site updates in stages, so real players test changes early.

---

## 14. Launch

The game is already live on [dabfellow.party](https://dabfellow.party/path-of-idle/). You decide when to call 1.0, based on vibes. Saves are wiped at 1.0, with a clear message, and everyone starts fresh.

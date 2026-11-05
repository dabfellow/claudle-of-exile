# Milestone Guideline

The one place for what's next, what's planned, what's been decided and what's been done. **[You]** means it needs you,
not Claude. **Done** on a milestone is what has to be true before moving on. The order is by dependency: pacing rules
first, because every act is tuned against them.

Last updated 2026-11-05.

**On this page:** [Next steps](#next-steps) · [Milestones](#milestones) · [Decisions](#decisions) ·
[Other open items](#other-open-items) · [Ideas / later](#ideas--later) · [Done](#done)

## Next steps

**Where we are:** Milestones 1, 2, 3 and 7, music, all six acts, the Player Market and challenge modes are live as 0.3.20 (deployed 2026-11-02: Unbroken now asks for all six acts without ever dying, and credits characters that already did it; 0.3.19 the same day brought the Unbroken achievement and The Unbroken Temper; 0.3.18 the same day brought map tiers 1 to 10 at monster level 66 to 84; 0.3.17 the same day brought the Exile's centre start, with other classes' starts no longer blocking an Exile; 0.3.16 the same day brought the Stash's Uniques tab; 0.3.15 the same day made retreating to the Hideout refill flasks, and 0.3.14 brought Low Mana, Savage Hit, Elemental Hit and Chaos Hit flask enchantments and the Amethyst Flask; 0.3.13 the same day made the Gem shop a fixed shelf of every gem from the areas you've opened; 0.3.12 brought Instilling Orbs from Act 4, no gem drops, Clear all Lv 1 gems and Gem shop tabs and filters), with the rebuilt player wiki, The Exile's Codex, at /path-of-idle/wiki/, with forked roads in Acts 3–6 and the crafting tutorial. Acts 4–6 went out unsimmed and unplayed. The real-account test is done; the player heads-up is still to
send. Act 1's cold check and Scorched earth's danger stay as they are, with no playtest planned, until
you say otherwise.

**Latest release:** 0.4.1, Flexible Gems, deployed 2026-11-04. Ordinary skill gems now reach 155 attributes at level
20 instead of 245, and the most demanding gems reach 178 instead of 318, preserving meaningful off-attribute
investment without consuming an entire build.

**In order:**

1. **Claude:** build the real Maps (Milestone 8) from [MAPS.md](design/MAPS.md). Beating Act 6 opens the bare Maps preview page, and drawn maps can't be spent yet.
2. **[You]** Post a heads-up. Live players went from 12 h to 8 h offline, lost offline boss fights and wind-up rules until
   they earn them, and Act 1 got slower. Also say that six gems moved in 0.3.3 and can lock until their new level.
3. **[You]** Find a hand-made landscape pack. GegX is AI-generated and is used for the area banners and the title and
   hideout scenes ([ASSET_MAPPING.md](design/ASSET_MAPPING.md)).
4. **[You]** Play the Maps preview whenever you like, and say whether the loop is fun. Maps stay post-Act 6 in the real
   game; the preview is dev and admin only. Try it with `npm run dev`, then Map Device → Dev tools.

## Milestones

| # | Milestone | Status | Waiting on |
|---|---|---|---|
| 1 | Automation and offline rules | **Done**, live | – |
| 2 | Measure the pacing | **Done**, live | – |
| 3 | Account layer | **Done**, live | – |
| 4 | Act recipe and Act 2 | **In progress**: pieces merged | Act 1 cold check |
| 5 | Maps preview | Built, dev only | You playing it |
| 6 | Act 3 and ascendancies | **Done**, live; not simmed or played through | – |
| 7 | Acts 4–6 | **Done**, live; not simmed or played through | – |
| 8 | Maps | **Next**: players reach a bare page after Act 6 | Your go |
| 9 | Hard mode bosses | Answered: 5 bosses, post-Act 6 | Milestone 8 |
| 10 | Top-end crafting and hideout | Not started | Milestone 9 |
| 11 | Long tail | Not started | Milestone 10 |
| 1.0 | You call it | – | Vibes |

### 1. Automation and offline rules
- [x] Rule overhaul: per-skill rules, High/Normal/Low priority, and rule slots that unlock.
- [x] Simple and survival rules are free; the War Table unlocks advanced targeting, a third condition and loot automation.
- [x] Offline combat stops on death; offline cap starts at 8 h, and the Watchtower raises it toward 24 h.
- [x] Deploy — done 2026-10-31
- **Done:** a fresh character has the rules needed to idle bosses safely; death still stops offline combat.
- Merged 2026-10-30, save v20.

### 2. Measure the pacing
- [x] Sim knows the rule locks, offline stops and a combat/skilling split.
- [x] Run against your timeline; Act 1 gap fixed through XP, early drops and late station costs.
- **Done:** the sim reports game time per milestone, and day 1 lands at a couple of Act 1 stages.
- Measured: day 1 is 2–4 stages; Act 1 finishes in 2–5.5 days and Act 2 in 2.5–6.5 days. Full results in
  [BALANCE.md](design/BALANCE.md).

### 3. Account layer
- [x] Hideout, rule unlocks and offline cap shared by the account; skill levels per character; shared gear stash.
- [x] Exile unlocked by finishing the campaign.
- [x] Deploy — done 2026-10-31
- [x] Every Stash tab shared across the realm, not just gear — done 2026-11-01
- [x] Test on a real account.
- [x] Leave the reserved `account` rows out of the Admin stats query ([SETUP.md](ops/SETUP.md)).
- **Done:** a second character starts with the account's unlocks, its own skills and access to the shared stash.
- Merged 2026-10-31, save v21.

### 4. Act recipe and Act 2
- [x] Recipe written as a checklist ([ACT_RECIPE.md](design/ACT_RECIPE.md)), with Act 1 and Act 2 audits and picks.
- [x] Pack art for Act 2's 40 monsters and 6 uniques.
- [x] Riders and raiders skill batch, Thieving and Heist, and ground rules — done 2026-10-31
- Slower Act 2 pacing dropped 2026-10-31 with the pacing targets. The sim showed no gain from ground rules on Azhar, so
  those fights still need to bite.
- [x] Split the skill pool and tie gems to acts, keeping existing characters' skills — done 2026-10-31
- [ ] Act 1 cold resistance check.
- [ ] Art for the 8 areas (waits on a hand-made landscape pack), and the 13 Act 2 monsters still on loose matches.
- **Done:** Act 2 is live.
- Act 2 is already open to players, so changed area ids need handling in saves.

### 5. Maps preview
- [x] Dev-only slice: Map Device, one tier, two themes, clear and boss runs, consumed per run, auto-run.
- [ ] **[You]** Play it.
- **Done:** you've played it and said whether the loop is fun.

### 6. Act 3 and ascendancies
- [x] Act 3 from the recipe: 10 stages, Martyrs, aim rules, Zealots and blood, Rune-carving ([RUNES.md](design/RUNES.md)) — done 2026-10-31
- [x] First ascendancy trial at the start of Act 3: 12 ascendancies, each with its own tree tab and points. Exile has
  none ([ASCENDANCIES.md](design/ASCENDANCIES.md)) — done 2026-10-31
- [x] Trials 2 and 3 built with Acts 4 and 6, — done 2026-11-01
- [x] Open Act 3 to players and deploy — done 2026-10-31. Pacing and balance haven't been simmed.
- [x] Ascendancy points only from a trial's first pass (4, 4, 3), bosses give none, and trials say what they open — done 2026-11-01
- Tree extended for the extra levels.
- **Done:** every main class can pick either ascendancy and play it through Act 3.

### 7. Acts 4–6
- Each from the recipe, growing to 10–20 stages, ending around level 65. Picks are in [ACTS_4_6.md](design/ACTS_4_6.md).
- [x] Gear base tiers extended to about level 80 (428 bases).
- [x] Act 4 built: 12 stages, Frostbite, Giants and weight, Archaeology ([ACT4.md](design/ACT4.md)) — done 2026-11-01. Not simmed or played through.
- [x] Act 5 built: 14 stages, Channels, Tides and summons, Cooking ([ACT5.md](design/ACT5.md)) — done 2026-11-01. Not simmed or played through.
- [x] Act 6 built: 18 stages, Echoes, Unholy ground, Trial 3 and the ending ([ACT6.md](design/ACT6.md)), The last empire ([ACT6_SKILLS.md](design/ACT6_SKILLS.md)), Cartography ([CARTOGRAPHY.md](design/CARTOGRAPHY.md)) — done 2026-11-01. Not simmed or played through.
- [x] Open Acts 4–6 to players and deploy, ahead of the real Maps — done 2026-11-01
- [x] Non-linear roads for Acts 3–6: forks, side areas and an act boss gate ([ACT_RECIPE.md](design/ACT_RECIPE.md) → Roads) — done 2026-11-01. Not simmed; not deployed.
- **Done:** Acts 4–6 are live and playable through.

### 8. Maps
- Planned in [MAPS.md](design/MAPS.md): 10 tiers with identity (permanent mod per group + tier-exclusive drops), Sextants, an Atlas tree, Cartography reworked, and Doomed Maps + Uber Bosses as the endgame layer beyond T10.
- [ ] Plain tiers with identity and the real Map Device page
  - Levels done and live in 0.3.18, 2026-11-02: 10 tiers at monster level 66–84, drop tables 18–27, item level bonus 14, map drops from level 60 areas. Themes, the shared supply, the area boss and Last King map drops, the save migration, the real page, and the permanent mods + exclusive drops per tier are still to do. Cartography still draws only Tiers 1–3.
- [x] Fourth ascendancy trial: the first Tier 5 map boss grants the final 2 points; it unlocks no nodes. — done 2026-11-04
- [ ] Sextants
- [ ] Atlas tree (including the ~20-point Doomed Maps unlock node)
- [ ] Tier-exclusive drops: Chaos/Regal/Exalt/Divine scaling by tier, and tier-locked unique pools
- [ ] Cartography rework
- [ ] Doomed Maps: five item types (Doomed I–V, monster level 86–94), the Doomed mod pool, Fractured Orb drops, Uber Key drops from bosses, offline support
- [ ] Uber Bosses: The First Exile (~90), The Architect of Ruin (~93), The Void Sovereign (~96); three key types; chase uniques and Doom Sigils; designed when built
- **Done:** a character can farm from Tier 1 to Tier 10, through Doomed Maps to Uber Bosses, with Sextants and the Atlas, and auto-run working offline.

### 9. Hard mode bosses
- Five bosses: Ossuar, Mother Vael, The Undertow, The Twin Regents, The Crownless. Keys from Sextant hunting mods.
  ([HARD_BOSSES.md](design/HARD_BOSSES.md)).
- Rules need to be able to aim, and to tell a slam from a channel.
- **Done:** a top-end character clears them on idle without dying, and the sim can test that.

### 10. Top-end crafting and hideout
- High level passive nodes, rare materials from skilling and from drops.
- Forced-mod and past-the-limit crafts.
- Late hideout upgrades.
- **Done:** month 6 play works as you described: farming nodes to min-max gear for hard mode bosses.

### 11. Long tail
- Collection log, masteries, build-defining uniques, the skills arriving around or after Act 6.
- [x] Challenge modes: Hardcore, Solo Self-Found and Classic as toggles in any mix ([GDD.md](design/GDD.md) §11) — done 2026-11-01. Live in 0.3.4.
- **Done:** your call.

### 1.0
You call it. On the day: wipe saves with a clear message.

### After Maps
Endless content. Not designed yet, and nothing above depends on it.

## Decisions

What you settled in the 2026-10-30 reset, in your words. The result is written up in [GDD.md](design/GDD.md). Later
picks are in [ACT_RECIPE.md](design/ACT_RECIPE.md).

Fishing is never being added; the menu's "Soon" entry is a Path of Exile joke and stays.

**Pacing (you, 2026-10-31):** players find the XP rates too slow, so ignore the timeline and pacing targets below,
including the journey and Milestone 2's numbers. Players feel the level number more than the zones, so levels get
target times and players set the acts' pace: 1–20 about 3 h, 20–40 about 3 h, 40–65 6 h, 65–80 12 h, 80–95 20 h,
95–99 20 h, and 99 is halfway to 100 in XP. Area level ranges cap levelling, PoE-style, so a long offline run can't
outlevel the campaign ([BALANCE.md](design/BALANCE.md) → Knobs).

**Day 1 benchmark (you, 2026-11-02):** a hard nonstop day 1 should end around the end of Act 6, like reaching Maps on day 1 in PoE. The sim's `--nonstop --days 1` run checks it. The old day 1 / week 1 targets came from sim bots that didn't use the tree or upgrade weapons.

**Maps rework (design pass, 2026-11-03):** maps were too bland and easy. The new design, in [MAPS.md](design/MAPS.md):
- **Tier identity (you):** each tier group has a permanent baked-in mod and tier-exclusive drops. No artificial gates — a strong build can always try a higher tier, but the mod is a real gear check. T1–2 baseline; T3–4 elite packs; T5–6 twin boss; T7–8 dangerous ground; T9 enraged; T10 all three. Tier-locked unique pools and escalating currency from Chaos through Divines by tier group.
- **Doomed Maps (you):** five separate map items (Doomed I–V, monster level 86–94) that drop from T8–10 once an Atlas tree node (~20 points) is active. Each rolls a random number of mods (2–4, more on higher tiers) from a pool of new mechanics — pre-assembled boss adds, revenant packs, drained belts, searing aftermath, etc. — that don't exist in the Sextant pool. Best source of Divine and Exalted Orbs. Also drop Fractured Orbs (a new Doomed-exclusive currency; exact use settled in Milestone 10). Boss kills have a 10–35% chance of an Uber Key.
- **Uber Bosses (you):** two separate tiers of bosses. The five hard mode bosses (Milestone 9, Sextant keys) stay. Three Uber Bosses above them reached via Uber Keys from Doomed Map bosses: The First Exile (~90), The Architect of Ruin (~93), The Void Sovereign (~96). Three key types; keys drop from any Doomed Map boss, higher tier better chance. Chase loot: 1–2 build-defining uniques per boss (don't drop anywhere else) plus Doom Sigils (Milestone 10 past-the-limit crafting material). Full mechanics designed when built.

**Every skill takes time (you, 2026-11-02):** like PoE, no skill is instant. Spells that were instant fired on top of the turn for free, which is why the Mage was so far ahead. Spark and Frost Needle are now spammable main skills with no cooldown, like Twin Strike, and Faster Casts fits any spell that deals damage.

**Skill gem reform (you, 2026-11-01):** every act and attribute gets AoE, single target, guard, and a life and a mana source, with leech very weak until Acts 3–4. Drain skills return life or mana, never both, and supports can fill the other half. Arcane Siphon moved to Act 5, the leech supports cost 1.8 times the mana, no new signature supports, and existing gems were sorted where they fit. Existing characters get one The Old Covenant ring; new ones don't ([SKILL_REFORM.md](design/SKILL_REFORM.md)).

**Challenge modes (you, 2026-11-01):** Hardcore deletes the character, Solo Self-Found can't use the Player Market and each one has its own stash, and Classic has no idle skilling but keeps the Crafting Bench. They're toggles, in any mix.
- Decided for you: an SSF character's hideout and unlocks are its own too, and are deleted with it. Hardcore characters share a stash that outlives them, and each non-SSF mix has its own market. Modes can't be changed after creation. NPC shops stay open to SSF. Heist counts as skilling. Classic pays gold (5 times sale value) for gathered materials in hideout upgrades, since nothing else supplies them in bulk, and skips the Forge, the Alchemy Table, the skilling tree and the tutorial's mining and smithing steps. The two bench recipe achievements that need skilling are waived for Classic. The Exile unlock carries from any mode to the whole account.

**Wiki (design pass, 2026-11-01):**
- Spoilers: B. The wiki is fully public with no login. Boss mechanics, unique drop sources and later acts sit behind click-to-reveal "Spoiler" boxes.
- Next content: A. Reference pages first (passive notables, life skills and recipes, hideout upgrades, runes and flasks, boss glossary). Guides (automation, formulas) come after.
- Linking: A. Sidebar and title screen link to the wiki home, and the wiki has its own search. Deep links from item/gem/boss tooltips are later, once the reference pages exist.
- Decided for you: spoiler boxes cover boss mechanics, unique drop sources and anything from Acts 4–6; the generator marks them automatically from the data, so new content is covered by default. Pages stay in the existing style and generator.

**Player Market (design pass, started 2026-11-01):**
- Access: signed-in accounts only. Guests can see it but can't list or buy, enforced on the server.
- What trades: A. Gear only. Materials and currency can't be listed.
- Prices: both. A seller can price in gold or in currency orbs. Orbs move only as payment; they still can't be listed for sale.
- Cheating: A. Sanity checks. The server refuses impossible items (real base, mods in legal ranges) when they're listed, and you get admin tools to remove listings and ban players from the market. Believable fakes and edited gold can still get through; the server doesn't run the game.
- Buying: both, the seller determines which. Each listing is either buy now or an auction.
- Unlock: A. After Act 1 is cleared.
- Decided for you (auctions and limits): a listing is one or the other, never both. Auctions run 24 hours; a bid is held in the bidder's wallet and returned if they're outbid; a bid in the last 5 minutes adds 5 minutes, so last-second sniping doesn't win. Buy now listings last 7 days, then the item returns to the seller. 20 active listings per player, so nobody floods the market. One market per realm, so a future challenge mode trades separately.
- Decided for you: each listing has one price in one thing (gold or a single orb type), so listings compare cleanly and search stays simple. The market takes 10% of each sale, rounded down, and that cut disappears, so prices don't run away. A listed item leaves the player's stash and is held on the server until it sells or is cancelled. Each player has a market wallet on the server: sale money, refunds and items land in it, and the game collects it at login and on opening the market. Buying takes the price straight from the player. The browser owns the save, so the server can't safely change a player's gold directly ([MARKET.md](design/MARKET.md)).
- Decided for you: the next bid must be at least 5% higher. A rebalance that makes an older item fail the sanity check means it can't be listed; saves are wiped at 1.0 anyway.

### Fixed (you, 2026-10-30)

- **End state:** months of play to build a top-end character that easily clears all content.
- **Maps are essential.** They're the endgame and they stay.
- **The long tail:** "years" comes from a broad mix of reasons to keep playing. Rare drops, expensive crafts and multiple
  characters are three examples out of many, not the full list.
- **Art:** asset packs, and they're the real art, not placeholders. No AI art.
- **Pacing:** needs an overhaul. The current targets don't carry over.

### Skeleton (kept whatever the design becomes)

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

### Reopened, in the order to settle them

Each decision depends on the ones above it. Numbers tuned before step 2 would just get thrown away.

#### 1. The finished game

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
  - **What makes one better:** a map is just a tier. Sextants in the Map Device add danger and reward. Themes were
    dropped 2026-11-01 ([MAPS.md](design/MAPS.md)).
  - **Using them up:** consumed per run, so keeping a supply going is part of the game.
  - **Idling:** auto-run. Pick a tier, and the device keeps using those maps until none are left.
- **Top-end character:** clears hard mode bosses and top-tier maps on idle without dying. The sim can test this.
- **Long-term engagement so far:** rare drops, expensive crafts, multiple characters, collection log (uniques, bosses,
  map themes, with rewards), Melvor-style masteries, ascendancies, build-defining uniques, shared stash. More can be
  added. Competing is out: no leaderboards, no seasons.

#### 2. The pacing model
Work backwards from the end state, not forwards from Act 1.

**Settled:**
- **Daily play:** a mix. Players may need manual inputs for a hard boss or to push maps and zones, especially early on,
  so they benefit from active play. No check-ins every couple of hours that last 20–40 minutes.
- **Offline combat:** the game is already influenced a lot by the player being there. Automation can be locked behind
  hideout upgrades, which limits how good offline combat is.
- **Offline skilling:** always full speed.
- **Manual skilling (you, 2026-10-31):** always better than idle. Idle stays as it is; mini-games add up to 45% on top
  ([SKILLING_REWORK.md](design/SKILLING_REWORK.md) §9).
- **Offline cap:** starts at 8 hours; a hideout upgrade raises it to 24 over time.
- **Automation unlocks:** by type of rule. Simple rules like "on cooldown" are free; reactive ones like "when a boss
  winds up" or "when life is below 40%" unlock later, so bosses stay hard to idle until the smart rules are earned.
- **Dying offline:** combat stops until you return.
- **New bosses offline:** baseline wind-up rules let a strong enough build beat new bosses offline.
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

#### 3. The core systems

**Settled:**
- **Battlefield:** keep it. It feels awesome. Positioning, ranges and closing in stay the core of combat; tuning fixes
  the rough edges.
- **Manual play:** both. Better decisions (casting skills and drinking flasks at the right moment) and boss moments on
  hard bosses that only a player can do well at first, like clicking a weak point or picking which add to kill.
  Reactive rules need a way to handle these for idle clears.
- **Rules:** per skill, as now, with better priority controls and more rule slots as they unlock.
- **New skills:** batches by act. Each act brings a themed set of skills and supports, as part of the act recipe.
- **Classes:** six normal classes. Exile becomes a hard mode, unlocked by finishing the campaign with another character.
- **Ascendancies:** two per main class, 12 in total, with three trials from Act 3 to Act 6, their own tree tab and
  points. Exile has none ([ASCENDANCIES.md](design/ASCENDANCIES.md)).
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
  - **Stash (you, 2026-11-01):** every tab is shared by all characters on an account in the same challenge league. That
    includes gold; skill bars and flask belts stay with the character.
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
| Gear and affixes | 315 bases to level 60 (428 to level 80 since), 9 affix tiers | Does the ladder match the new level range? Numbers were never simmed | [GEAR.md](design/GEAR.md) |
| Crafting | Orbs, bench, fossils, essences, auto-crafting | Where do "super rare crafts" come from? | [SKILLING_REWORK.md](design/SKILLING_REWORK.md) |
| Skilling | 5 planned skills on top of the current set | How many does the game need? | [SKILLING_REWORK.md](design/SKILLING_REWORK.md) |
| Economy and drops | Tiered tables, sim-tuned for Act 1 | Rebuild from the pacing model | [BALANCE.md](design/BALANCE.md) |
| Town and hideout | Stations, shops, upgrades | What do they do in the late game? | [TOWN.md](design/TOWN.md) |

#### 4. Content plan
**The act recipe:**
- **Size:** acts grow. Early acts stay at about 8 stages and later ones reach 10–20, so the campaign feels like it's
  getting bigger.
- **Identity:** a new boss mechanic and resistance check, like Act 2's Scorched earth and fire damage.
- **Each act also brings:** a themed batch of skills and supports, and from Act 2 on, a new skill.
- **Levels:** Acts 3–6 cover about 33 to 65.

**Act 2 as built:** rebuild from the recipe. Use it as a starting point, and redo anything that doesn't fit. Its 40
monsters show a skull icon today and need pack art. Finding assets is quick, so it doesn't limit act size.

#### 5. Live game and transition
- **Saves:** wiped at the 1.0 launch, with a clear message. Everyone starts fresh.
- **Live site:** updated as we go. Changes go live in stages, so real players test them early.
- **1.0:** the game is already live on your site. You decide when to call 1.0, based solely on vibes.

## Other open items

- [x] Refine class combat flow and idle decision-making: make Mana is Power reward recent spending, make Momentum grant Evasion and lose flat stacks only to meaningful landed hits, let low-level gear consume Arcane Dust instead of basic orbs, replace manual movement pacing with automatic range postures, and reserve Mana for higher-priority skills nearing readiness. — done 2026-11-05

- [x] Rework War Table gating so an idle character has essential survival automation from Act 1 instead of needing manual boss micro. — done 2026-11-05
  - Baseline kit: Vitals, Wind-up and Ground rules, automatic Life/Mana flask thresholds and two condition slots for each of the six skill-bar positions.
  - Later War Table rewards: Status and Aim rules, a third condition, then Normal/Magic/Rare auto-salvage.
  - This supersedes Milestone 1's original decision to gate reactive boss rules.

- [x] Smooth hideout upgrade costs so mid- and late-tier stations do not stop combat progression for multi-day raw-material grinds. — done 2026-11-05
  - Six recipes refine five logs or ore into planks or bars; first boss kills guarantee a Boss Trophy and repeats have a 25% chance.
  - War Table level 7 fell from 80,000 Gold, 4,000 Yew Logs, 4,000 Mithril Ore and 100 Rough Gems to 30,000 Gold, 150 Yew Planks, 150 Mithril Bars, 20 Rough Gems and 8 Boss Trophies; every station received the same smoothing pass.

- [x] Recalculate skill-gem attribute requirements so off-attribute gems still demand travel or gear without ordinary level-20 gems requiring 245 attributes. — done 2026-11-04

- [x] Rebuild the character passive tree around compact clusters: keep attributes on shorter travel roads, remove filler inside clusters, put meaningful choices every few points and document the tree's design rules. — done 2026-11-04

- [x] Overhaul the character and ascendancy trees: remove class-only mechanic beelines from the character tree; give each ascendancy six notable paths and two capstones with a normal nine-point three-notable/one-capstone build but no hard node-count limit; remove Act locks; add the fourth trial at Tier 5 Maps. — done 2026-11-04

- [x] Make defences and gear progression matter: PoE-style magic/rare monsters and monster modifiers, with more rewards; a much larger, slot-specific item affix pool so Chaos Orbs are less deterministic. — done 2026-11-03

- [ ] Mage is far ahead early: players report level 60 in a day while other classes take days to reach Act 3. Sims agree: Mage clears Act 1 in about 2h nonstop against 5-17h for the rest. The cause: Spark, Frost Needle and Shock Nova took no time to cast, so all three fired every turn on top of everything else.
  - [x] Every skill takes time (see Decisions). Mage's Act 1 lead drops from about 4x to under 1.5x in the scenario sim. — done 2026-11-02
  - [x] Sim bot fills its six slots by job (single target, clear, guard, buff, curse, one for the fight), weighs skills by how much of a pack they hit, and switches weapons for a skill it owns. Exile only runs when named. — done 2026-11-02
  - [x] Plain area attacks lost their cooldowns (heavy slams keep theirs) and go before other attacks in the cast order; Ground Slam fits swords; Spark and Shock Nova about 20% less damage. Classes now clear about evenly from Act 3 on. — done 2026-11-02
  - [x] Every class starts with a single target and an area skill; Ranger starts with a Short Bow; new Rain of Daggers (poison, daggers) for the Shadow; Horse Archer's Arc needs a bow; Spark chains 2-5 with gem level. — done 2026-11-02 (only Warrior simmed since)
  - [ ] Warrior still slowest: Act 1 takes 10h nonstop (Duelist and Templar about 5h), Act 5 by 21h, 19 deaths a day. Early on Heavy Strike is slow (3.9 s), and in the mid game the bot drifts to Backstab and Lacerate, which its Dexterity can't level past 8-9. Backstab deals about 80% weapon damage a second against 45-50% for the other basic attacks.
    - Backstab 240% → 165% weapon damage; Heavy Strike 3.9 s → 3.3 s and 185% → 280%.
    - Later Strength single-target attacks raised so each beats a levelled Heavy Strike when it arrives: Pummel, Infernal Blow, Judgement Hammer, Flagellate, Titan's Blow, Shield Crush (you: "I want Warrior one-shotting things").
    - Warrior now: Act 1 in about 9h nonstop, Act 4 by 22h, 15 deaths a day (Heavy Strike at 370% had Act 1 in 6h). Act 1 is still where it loses the most time.
    - New Quick Slash (stacking more damage on you) and Rending Cut (stacking physical damage taken on the target), fast sword and axe cuts that build Rage. Warrior: Act 1 in 8h26, Act 5 by 23h. Rending Cut slows Act 1 packs down, as it restacks on every new monster.
    - Rending Cut set to bosses only, and stacking skills wait at full stacks. All-class nonstop day (bot on its own weapon type): Act 6 done by Mage 6h24, Ranger 15h24, Shadow 19h01; Duelist and Templar reach Act 5, Warrior Act 4. Mage still clears 2-3x faster in Act 1, helped by starting with Frost Needle.
    - Spark and Frost Needle -40%, Act 1 attacks +40%, later Strength attacks +40% to stay ahead of Heavy Strike. Nonstop day, Act 6 done: Ranger 7h12, Shadow 13h48, Mage 15h50, Duelist 21h32; Templar and Warrior reach Act 5. Mage now stalls in Act 1 (12h, 36 deaths), then flies through Acts 2-6 in 4h. Ranger is the new outlier.
    - Ranger bow skills -20% (Barrage, Rain of Arrows, Ice Shot). Frost Needle 3-6 per hit: the Mage has about 30% less life, so it needs to kill about 30% faster than the median class at level 1 (8.0 dps against a median of 5.9).
    - [ ] Why the Strength classes lag: still open. Traces show them on old weapons for long stretches (the Templar keeps a level 19 mace from character level 17 to 39, the Warrior a level 8 sword from 20 to 39), while the Ranger's bow keeps pace. It isn't the base ladder (swords and maces have 12 bases each, like bows; an earlier count was wrong), nor walking (5-8% of the time), nor damage on paper (melee has the highest skill dps in every scenario). Letting the bot wear any sword, axe or mace barely moved it. Next: log which weapons the Warrior sees and why it keeps the old one.
    - Bone Wand and Quartz Wand retired (no longer drop or sell; owned ones still work), to slow the early Mage: its Act 1 went from 5h35 to 6h59 nonstop.
    - New bases Bronze Shortsword (4), Bastard Sword (29), Iron Cudgel (6), Studded Mace (16), on spare pack art; Warrior, Duelist and Templar +25% movement speed; Act 2+ Intelligence damage spells -40%. Not simmed yet.
    - [ ] Plan to bring every class within 1-2 hours of each other per act. Shadow is right (Act 6 at about 14h nonstop, you, 2026-11-02); Mage at 10-11h and Ranger at 12h are too fast. Time per act goes roughly with 1 / clear speed, plus downtime from deaths (each 3 deaths in an area also costs a 20 minute retreat).
      - Strength classes need about 2x in Acts 2-6: weapons pull their weight through stronger physical damage mods (added 50% on every tier; increased about 50% at the bottom and 20% at the top).
      - Mage and Ranger clear too fast in the later acts: Hulking monsters from Act 3 on (1 pack in 5 has one: 5x life, 2x damage, half speed, 5x xp, 60% less damage from area, chain and piercing hits) favour heavy single hits over screen clears.
      - Warrior deaths (18 a day against 6 for the Duelist): more armour from the class bonus, or a little life regeneration. Not done.
      - Not doing (you): a guaranteed class weapon in the Town Market; there's enough loot already.
      - Result (nonstop day, Act 6 done): Mage 6h37, Ranger 11h28, Shadow 12h33, Duelist 17h27, Templar 20h13, Warrior 20h16. The Strength classes now finish Act 6. Mage and Ranger ride an Act 1 single-target skill all game (Frost Needle to about 200k dps, Poison Dart likewise), which Hulking monsters don't slow and the later-spell cut doesn't touch.
      - Frost Needle's three hits each got all of the flat added spell damage from gear; now each gets a third. Poison Dart can't be used with a wand, staff or sceptre (otherwise unchanged, you). Act 6 now: Ranger 11h28, Mage 12h10, Shadow 12h33, Duelist 17h27, Templar 20h13, Warrior 20h16. Mage and Shadow are where you want them; the Strength classes are 5-8h behind.
      - The Mage still flies through Acts 4-6 on Spark (chains to 5 at full damage) and late wands. Top-tier caster mods trimmed (about -10% at item level 45 to -35% at 80), and spells now grow 12% a gem level tapering to 8% (x2.9 at 20, from x4). Chain hops now deal 15% less each, down to 20% of the full hit (you). Mage after all three: Act 6 at 20h28, but Act 1 takes 11h with 21 deaths, as its only early skills got weaker too. Open: Spark and Frost Needle base damage up about 30% to fix its Act 1. Shipped as is (you).
    - Spotted in passing: the Ranger's Poison Dart reaches about 200k dps by the end of a nonstop day, far past everything else.
    - After the Ranger and Frost Needle changes, nonstop day, Act 6 done: Mage 10h50 (Act 1 in 5h35, 11 deaths), Ranger 12h29, Shadow 13h48, Duelist 21h32; Templar and Warrior reach Act 5. The Strength classes are next, once the weapon ladder is settled.
  - [x] The sim bot keeps each class on its own weapon type. — done 2026-11-02
  - [x] `npm run sim -- --scenario <preset>` runs every class through a playtest scenario side by side (presets now in `src/dev/presets.ts`). — done 2026-11-02

- [ ] Player Market (live trading between players; named "Player Market" so it isn't confused with the Town Market shop station). Design pass finished 2026-11-01; see Decisions → Player Market and [MARKET.md](design/MARKET.md).
  - [x] Server: listings, bids and wallet tables, with signed-in-only rules and all-or-nothing buy, bid, cancel and collect actions. — done 2026-11-01
  - [x] Server: sanity check on listed items (real base, mods in legal ranges). — done 2026-11-01
  - [x] Auctions: closing at 24 hours, last-minute extension, refunds; buy now expiry at 7 days. — done 2026-11-01
  - [x] Game: list from the stash, browse and search, buy, bid, my listings, collect from the wallet; unlocks after Act 1, sign-in prompt for guests. — done 2026-11-01
  - [x] Admin tools: remove a listing, ban a player from the market. — done 2026-11-01
  - [x] Run `docs/ops/market.sql` in Supabase and ship: live as 0.3.0 "The Market". — done 2026-11-01
  - [ ] **[You]** Press Upload on Admin → Market, then try a real trade between two accounts. Nothing can be listed until the upload.
- [x] Player wiki at `/path-of-idle/wiki/`, generated from the game's data by `npm run wiki` on every build: acts and areas, skill and support gems, item bases, uniques, modifiers, currency and materials, classes and ascendancies, plus a hand-written Getting started page (`docs/wiki/`). Linked from the sidebar. 0.2.34 — done 2026-11-01
- [ ] Wiki rebuild from your spec ([WIKI_SPEC.txt](design/WIKI_SPEC.txt)). Phases are in that file. It says Netlify, but the wiki stays on Cloudflare.
  - [x] Phase 1: look, home page, sidebar and phone menu, full search, filterable and sortable tables, section links. — done 2026-11-01
  - [x] Phase 2: a page for each gem, item, unique, currency, area and monster, with game art, cross-links, hover cards, spoiler boxes, a support finder and a link check in the build. The spec's other menu pages are in as placeholders; a file in `docs/wiki/` named for one fills it. — done 2026-11-01
    - [ ] Later: materials and modifiers have rows with direct links, not pages of their own.
  - [x] Phase 3: Getting started, checklist, FAQ, glossary, automation guide and rule reference, offline, gathering, farming, walkthrough, boss preparation, loot tables, unlocks, starter builds, patch notes, data version, and reporting through the game's Feedback card. Guides live in `docs/wiki/`, with `{{data:…}}` tables and `{{skill:…}}` links filled from the game. Starter builds aren't playtested. — done 2026-11-01
    - [ ] **[You]** Read the guides for tone and anything that doesn't match how you see the game.
  - [x] Phase 4: item comparison, drop calculator, crafting planner, XP and farming planner, rule builder and build planner with share links. Numbers are worked out by the game's own code at build time. Patch history per entry and community features are left out. — done 2026-11-01- [ ] Wiki next, decided in the 2026-11-01 design pass (see Decisions → Wiki), in this order:
  - [x] Spoiler boxes: click-to-reveal for boss mechanics, unique drop sources and Acts 4–6, applied by the generator. — done 2026-11-01
  - [ ] Reference pages: passive tree notables, life skills and recipes, hideout upgrades, runes and flasks, boss mechanics glossary.
  - [ ] A link from the title screen to the wiki home.
  - [x] Formulas page: Damage and ailments, with its numbers read from the game's code. — done 2026-11-01
  - [x] Then guides: automation rules guide. — done 2026-11-01
  - [ ] Later: deep links from in-game tooltips to wiki pages.
  - [ ] Deploy the wiki (first version is built but not live).
- [x] Gear sets and skill loadouts, with auto-switching behind the Crafting Bench — done 2026-10-31
- [x] Art and music sent 2026-10-31 merged: 112 item slots and 4 music tracks. All free itch.io files; you said to assume
  free public use while the game isn't sold, so recheck if that changes — done 2026-10-31
- [x] Third unique art sheet: 13 icons on existing uniques, plus 2 new uniques, The Briar Key and The Unblinking Tome (first-pass mods, not balanced). The green potion icon is unused (the belt unique was dropped) — done 2026-11-01
- [x] Arcane Siphon leech cut: life 25% → 15%, mana 40% → 25% — done 2026-11-01
- [x] Skill gem reform: 31 new skills, 12 new leech supports, 6 gems moved, and The Old Covenant for existing characters ([SKILL_REFORM.md](design/SKILL_REFORM.md)). Live as 0.3.3. Not simmed — done 2026-11-01
  - [ ] **[You]** Press Upload on Admin → Market again, so the server also refuses the ring.
- [ ] Art for the 34 weapon bases that still have none.
- [ ] Use the Void pack, SBS skies and `MediavelFree.png` UI once something needs them. Originals are in Downloads.

- [x] Ailment rework and chaos damage ([DAMAGE.md](design/DAMAGE.md)): fire burns, cold chills, lightning shocks, chaos poisons; each has a % chance, base 0, from skills and gear; buildup against 40% of the target's life. Burn builds to Ignite, chill to Freeze, shock scales. Poison stays as it is. Chaos is offence only. Not simmed. 0.2.30 — done 2026-11-01
- [x] Hideout upgrade cards: each station shows what you have now, every tier as a ladder, and the next upgrade with its cost. 0.2.32 — done 2026-11-01

Not tied to a milestone yet. Older balance, Act 2 and skill items restart at their milestone.

### Login
- [ ] Demo mode and email login: new players get an unsaved demo, email + password joins Google and Discord, and browsers with guest characters keep them ([SETUP.md](ops/SETUP.md)).
  - Live since 2026-10-30. Email provider is on; Confirm email is still on, so sign-ups need a link and the built-in mailer's hourly limit applies.
  - **[You]** Test on the live site: sign up, log in, password reset, and demo carryover through email, Google and Discord.

### Town feedback (your walkthrough, 2026-10-25)
- [ ] More skills to train (Hideout skill list feels thin).
  - Later: Thieving (Heist), Archaeology (Expedition), Cartography, Fletching, Rune-carving ([SKILLING_REWORK.md](design/SKILLING_REWORK.md) §8). You like all of them; they're listed on the in-game Coming soon page for now.
- [ ] Side feed (Activity / Combat log / Loot): you're lukewarm on it; revisit later.
- [ ] Achievements page look: later pass.
- Art (parked with the other art): trader portrait is too cartoony; materials need more icons.
- [ ] Skill masteries on the Hideout skill tiles (you: coming later; the skills themselves are with the gathering session).

### Character feedback (your walkthrough, 2026-10-25)
- [ ] Campaign art pass: you like the continent-map style; it needs real art. The area card is still a poor way to show the info and needs its own art pass.
- [ ] **[You]** Gem artwork: gems now show plain silhouettes (`GEM_GLYPHS` in `src/ui/assets.ts`); pick which you like or what to replace.
- [ ] Skill bar auto setup (rules and priority) needs a big overhaul. Needs design with you: more priority control, maybe more.
- [ ] Support gems limited to some skill types (e.g. only Warcries): not built yet, beyond the current attack/spell/melee fits.
- [ ] Attack mana costs: with a mana flask the bot is short of mana 0–5% of fight time (Exile 10%), so costs look fine; only matters if you play without a mana flask.
- [ ] Auto-crafting needs real design work later (you: "way later").
- Inventory look is with the other session; the Equipment and Bench bag views should improve with it.

### Skill pool (your review, 2026-10-27)
- [ ] New skill gems for character levels 20–40: nothing unlocks between 16 and Lacerate's 35 (you: paused for now).
- [ ] Next round of skills and supports: more Dexterity and Intelligence buffs (both buffs today are Strength), and real curses (the old "curse" role on Poison Dart was removed).
- [x] Str/Dex mana: they should stay mana-hungry, but need a mana leech option (passive tree or support), costs paid with life, or uniques/mana regen to stack, on top of flasks. Mana leech supports and Dexterity drains in the skill gem reform — done 2026-11-01
- [ ] Ailment overlays on the player while you're taking them: poison a green overlay, bleed a darker red, shock little blue lightning bolts, freeze a ~20% light blue tint over the whole thing.
- [ ] Battlefield follow-ups ([BATTLEFIELD.md](design/BATTLEFIELD.md) → As built):
  - Sim rerun on the new field; expect melee to need a buff (closing-in time and movement speed are the first knobs).
    - 2026-10-28: first run was skewed by sim-bot bugs (now fixed: unusable-skill scoring, never retreating from a walled boss). Clean rerun (new vs old code, seeds 1–2, 14h) still to do; early signs: Mage/Templar faster, a sword-only Duelist's Twin Strike ~⅓ of dual-wield.
  - Zone side weighting for the gates (`spawnSides`).
  - You played it: it feels awesome (2026-10-30).
- [ ] Re-run the sim after the gem scaling and skill buffs below; multi-hit attackers (Barrage, Twin Strike, Pummel) lost damage at high gem levels.

### UI feedback (your walkthrough #2, 2026-10-25) — you test at 1440p and 4K
- [ ] **[You]** Check the Town: shop prices (~5k magic / ~12k rare at level 24), gem levels (`GEM_LEVELS` in `src/data/gems.ts`), shopkeeper names (Ilsa, Varro, the Gemwright).
- **[You]** Icons: gathering nodes (Copper Vein, Scorched Seam …) and currency need art; you'll go through icons yourself.
- Campaign: needs real area art (already above). Map Device: work in progress.

## Ideas / later
- Ascendancy chase items: grant a specific notable or capstone without spending trial points, allowing a fourth notable or both capstones. These item-granted nodes must bypass the normal point budget rather than relying on a hard node-count exception.
- Uniques tab: copies of the same unique share one spot, which shows the first copy and a count; the next copy appears once that one is taken out. Uniques found before the tab existed only show as found once they're in the stash, bag or worn.
- No monster deals chaos damage yet, so the Amethyst Flask and the Chaos Hit enchantment do nothing until some do. The character sheet doesn't show Chaos Resistance either.
- Offline, a Warrior in starting gear dies to the Mud Flats boss on most seeds even at level 40, and about half at level 60 (seen 2026-11-02, same before and after that day's changes). Worth finding out what kills them: an overlevelled character farming Act 1 offline shouldn't die there.
- Melee characters with spells on their bar lost them in 0.3.7 until they equip a caster weapon; worth a line in the player heads-up.
- Any error while drawing a page blanks the whole game: there's no error screen to catch it. A tab still on an older version also goes blank if a gem it has never heard of reaches the shared account from a newer tab or device, until it's refreshed. Nothing tells an open tab that a new version is out.
- When browser storage is full, a save throws an error instead of the "keep playing" handling meant for it. The game carries on, but the page can miss a refresh after buying a gem.
- Hardcore on two devices: a second device still holding a local copy of a dead character can bring it back. Deleted characters would need a cloud marker to stop that.
- Skill reform: a The Old Covenant moved to the shared stash can be worn by a new character on that account. Life Leech's 1.8 multiplier also raises Life-spending skills' Life cost, and drains cost no mana, so leech supports are free on them. The 31 new skills use reused icons, and none has its own art.
- War Table survival rules are now baseline, superseding Milestone 1's old offline-boss gate. The pacing impact is not simmed.
- The sim's `reachable` now pushes unbeaten areas so it walks every branch, but hasn't been run since the roads forked, and its pacing numbers for Acts 3–6 predate them.
- `TRIAL_ZONES` in `scripts/sim.ts` has `hollowreef`, now one side of a fork; the bot still clears it.
- Hideout later-tier costs only show on hover, so phones can't see them.
- Chaos is offence only: no monsters deal it, no player chaos resistance, no chaos skills past Poison Dart, and flat chaos doesn't reach spells ([DAMAGE.md](design/DAMAGE.md)).
- Ailment numbers (40% threshold, 25% skill chance, ignite 50%, shock 40%) are first guesses, not simmed. Bosses may be near immune to Ignite and Freeze at these thresholds.
- The game doesn't explain buildup or ailment scaling in-game yet; the wiki's Damage and ailments page does.
- The reference pages the 2026-11-01 design pass asked for still to come: passive tree notables, life skill recipes, runes and flasks.
- [DAMAGE.md](design/DAMAGE.md) is out of date: it still lists the ×1.2 caster weapon bonus, says bleed is 40–60%/s (Sanguine Blow is 30%) and says shock raises all damage (it raises hits only, not running damage over time).
- The wiki's Acts page could collapse by act, as the spec suggests.
- The Equipment page's DPS is still the Default Attack, not your skills.
- Act 6 leftovers: `TRIAL_ZONES` in `scripts/sim.ts` has no Act 6 area, the Long Fracture's Frozen ground may slow too hard, the six signature supports use the fallback icon, and vellum and inks use stand-in art.

- Boss farm has no cost or cap, so a strong build gets boss XP (×10), rare-weighted gear and the repeat guaranteed orbs every few seconds, online and offline with wind-up rules (2026-10-31).
- Loadouts: flasks in gear sets, a quick swap on the combat page, and a boss trigger for auto-switching.
- Melee starts slow: Warrior, Ranger, Duelist and Templar deal 4–6 DPS in the mudflats against 13–16 for Shadow and Mage (2026-10-31).
- Riposte heals (Measured Reply, The Second Guess) now fire on landed hits too, so watch whether Duelist sustain gets too strong.
- Matador and Vanguard lose landed-hit Ripostes on picking, so ascending may feel like a step down until the tree fills in.
- Level ceiling: XP is at −80% or worse from 46 and gone at 66 until Act 4 arrives (the High Altar tops out at 41), gem XP goes with it, and the bot's area choice doesn't know about either.
- Level times: the sim's bot reaches 20 at 4h15–7h31, not 3 h; bosses hold it back, not XP, and it doesn't smith or bench-craft. Everything past about 46 is calculated, not measured, and assumes 3,300 kills an hour.
- "Salvage the rest" on the offline haul works without the Crafting Bench, unlike every other salvage. Left as it was.
- Add each release to `src/data/news.ts`, which feeds the title screen's News panel.
- Music: older Safari can't play Ogg, and iPhones ignore page volume, so the slider may act as on/off there (mute still works). Neither tested. Act 3+ and maps past Act 2 reuse the Act 2 track. If this repo ever goes public, ask AlkaKrab first (`src/assets/CREDITS.md`).
- Endless content: a post-Maps thing, not designed yet.
- Sim pacing gaps: week 1 onward can't be tested until Act 3 exists; week 1 and month 1 predate the last drop cut; month 3 is two classes on one seed. Smithing, brewing, the bench and second rule slots aren't modelled ([BALANCE.md](design/BALANCE.md)).
- Two devices at once: the account is now pulled every 30 seconds and merged, but there's no locking, so a few seconds of one device's gold and materials, or an item moved in that window, can be lost or doubled. Tabs in one browser merge exactly (unlocks are always kept).
- Shared bank: each new or reset character adds its small starting kit (25 gold, a few orbs) to the shared tabs, and gold and materials now help a second character from the start. Not simmed (2026-11-01).
- Maps preview: map bosses count for boss achievements and give the Tier 7 first-kill reward; `s.maps` stays per character for now, and may belong in the shared stash.
- Bosses in an open tab: a fresh character can still fight them on simple rules, and auto-flee and instilled flasks react for free. Look again once Milestone 2 measures them.
- Hard bosses need rules that can aim, and a rule that tells a slam from a channel ([HARD_BOSSES.md](design/HARD_BOSSES.md) → Fit with today's game).
- Level 80 gear: 41 new weapons and shields use placeholder icons, no level 80 item has been equipped in-game, and Smithing lists 113 more locked actions with the same mithril gap ([GEAR.md](design/GEAR.md)).
- Stale docs: `ACT2.md` says Act 2 is unreleased, `TREES.md` says ~900 nodes (it's 1,140), the `zones.ts` comment on leave levels matches nothing, and `CLASSES.md` says Exile gets no gameplay rewards.
- Custom SMTP for Supabase, so Confirm email can go back on and password resets aren't held to the built-in mailer's few emails an hour.
- Affix pool numbers are a vibe pass, not simmed: 30% leech, ~200% rarity per item, ~294% elemental at item level 80. Re-run the sim and look at sustain and drop rates ([GEAR.md](design/GEAR.md) → Affix pool).
- Attack speed and crit chance on weapons are still global (PoE has them local); base implicits like a mace's % physical are global too.
- Uniques with % defence mods (e.g. 40% increased Evasion on boots) became local, so they're weaker than before.
- Gear above level 34 can't drop until Act 3+; smithing uses mithril for everything from level 22 up; new weapons and shields have placeholder icons ([GEAR.md](design/GEAR.md) → Known gaps).
- Spells look weak against attacks: Mage and Templar take low-level Lacerate/Backstab over Spark, Fireball and Glacial Lance (sim, 2026-10-26).
- Cooldowns for attacks so the best one isn't just spammed (you: later).
- At 1440p/4K pages stop at 1280px wide (`.page` max-width), leaving wide empty margins; consider a wider cap on big screens (your call).
- The sim (`scripts/sim.ts`) doesn't smith or cut gems, so the Smithing/Gemcutting cost change isn't reflected in balance runs.
- Campaign screen: move things around and give it art (you: "doesn't look terrible", 2026-10-27; art item is under Character feedback).
- Bench orb bar: you want more things in the banner clickable later; fossils/essences live under Equipment for now.
- Quivers don't exist yet; when added they go in the off hand (bows are two-handed today, so that needs a rule).
- Uniques with "% increased Mana Regeneration" (Wellspring, …) now only scale flat mana regen; give them some flat regen if they feel dead.
Parked 2026-10-24 until more of the game is built: testing, sim balancing and art.
- Class balance doesn't need to be exact. Sim notes in [BALANCE.md](design/BALANCE.md) for when it's picked back up:
  - Warrior missed Act 1 in 14 h on 2 of 3 seeds (33–54 DPS vs 50–100 for others).
  - Ranger and Duelist ran 10–13 h on some seeds.
  - Bot now crafts worn gear with basic orbs but still ends with 200–350k gold and 300–460 Chaos.
- Art comes from asset packs: a final visual pass (area cards, combat screen, phone widths), swapping any loose matches in [ASSET_MAPPING.md](design/ASSET_MAPPING.md) as better pieces turn up.
- Skilling band Lv 20–40 for Act 2 (Mithril / Yew / Emberroot) isn't built; gathering nodes stop at the Storm Cliffs.
- Chill now always slows attacks 15% (was 0% without `chillOnHit`); watch whether chilled ground is too strong.
- Clarity cuts every skill's mana cost, not just spells; split out a spell-only stat if that matters.
- Skilling bands above Lv 20 (Act 2+), including Chaos / Regal recipes — [SKILLING_REWORK.md](design/SKILLING_REWORK.md).
- Gemcutting "Prisms" as its force material.
- Mastery per action (Melvor-style), once higher skilling bands exist.
- Loot / sell filter rules (post-launch, GDD §7).
- Cosmetics shop (never pay-to-win).

## Done
- [x] Combat-flow pass: spend-based Mana is Power, Evasion-linked Momentum with flat protected losses, Arcane Dust Field Tinkering for campaign gear, Brawler/Kiter/Cautious range postures, and 1.5-second higher-priority Mana reservation. — done 2026-11-05
- [x] Automation and hideout-cost overhaul: Vitals, Wind-up and Ground rules plus two condition slots are baseline; recovery flasks self-trigger; later War Table levels grant Status, Aim, a third slot and rarity-by-rarity auto-salvage. Six refining recipes turn logs and ore into planks and bars, bosses award trophies, and every station now has a much smoother component-based cost curve. — done 2026-11-05

- [x] Gem attribute requirements now scale from 8 to 155 instead of 245; demanding gems use ×1.15 and reach 178 instead of ×1.3 and 318. Off-attribute gems still require passive-tree or gear investment. — done 2026-11-04
- [x] Compact passive-tree pass: travel nodes fell from 423 to 249 while retaining their attribute role; lines, forks and wheels lost repeated small passives but kept all 198 notables, 90 masteries and 21 keystones. The new design contract records regional overlaps, route-package balancing and future item-based tree bending. Save v36 refunds the changed character tree. — done 2026-11-04
- [x] Skill tree overhaul: the outer character-tree paths are build-neutral; class-mechanic choices moved into both of their class's ascendancies; each ascendancy has six notable paths and two capstones, all visible after Trial 1. Four trials award 2/2/3/2 points, ending at Tier 5 Maps with nine points for a normal three-notable/one-capstone build and no hard node-count ceiling. Save v35 refunds both trees for clean respecs. — done 2026-11-04
- [x] Magic packs and rare monsters: rarity-scaled life, damage, XP and loot; 12 visible monster mods including regeneration, leech, resistances, anti-AoE and elemental threats. Added 21 rollable gear affixes, including boots-only movement speed, Chaos resistance and focused melee, projectile, minion, sustain, guard and flask pools. — done 2026-11-03
- [x] Rule files for other AI assistants: `AGENTS.md` (GPT, Codex and most others), `GEMINI.md` and `.github/copilot-instructions.md`, so they stop bumping the version on every change and add changelog lines to `UPCOMING`. — done 2026-11-03
- [x] Unbroken achievement: complete all six acts without ever dying on the character (was Act 6 only in 0.3.19), rewards The Unbroken Temper, a no-trade Templar unique amulet (Fervor and holy nova healing) that never drops. Achievements can now hand over a unique (`unique` on the def). Characters already past Act 6 with no deaths earn it on load. — done 2026-11-02
- [x] Exile centre start: an Exile can start at a new node in the middle of the Crossing (`EXILE_START`, the default pick, with the Rusted Sword and Warrior gems), and can take other classes' start nodes like any other node to path into their areas. Every other class is still blocked by them, the centre one included. 0.3.17 — done 2026-11-02
- [x] Uniques tab in the Stash: a fixed spot for every unique, by the act that first drops it, with unlimited room (`account.uniqueStash`); stashed uniques file there by themselves, old ones move off gear pages on load, and unfound ones show greyed with their drop areas (`account.uniquesSeen`). A copy saved by an older version (an old tab or device) can't empty the tab when merged. — done 2026-11-02
- [x] Retreating to the Hideout (or abandoning a map) refills every flask on the belt. Dying doesn't. — done 2026-11-02
- [x] New Instilling enchantments: Low Mana (below 30%), Savage Hit (one hit of 20%+ of max Life), Elemental Hit, Chaos Hit. New Amethyst Flask (+35% Chaos Resistance, drops from level 18, brewed at Alchemy 30 in the Ship Graveyard); players gain a `chaosRes` stat for it. — done 2026-11-02
- [x] Gem shop has Skill gems / Support gems tabs and the Skills page's filters (search, attribute, skill type, Fits my skills); the filters live in `ui/components/GemFilters.tsx`. — done 2026-11-02
- [x] Monsters and bosses no longer drop skill or support gems; the Gem shop is the source. The Stash's Gems tab has a Clear all Lv 1 button (skips gems with Expansion sockets or in a saved skill set, and returns socketed supports). — done 2026-11-02
- [x] Instilling Orbs drop only from Act 4 on, starting in the Hollow Pass (`areaCurrency` in `data/drops.ts`). The Expedition giant and the Iron Stomach achievement still give them earlier. — done 2026-11-02
- [x] Class balance pass: cast times for every skill, single-target and area starter skills for every class, a bow for the Ranger, Rain of Daggers, Quick Slash and Rending Cut, faster melee, stronger Strength attacks and physical mods, new sword and mace bases, Hulking monsters, chain falloff, slower spell growth and weaker top caster mods; scenario mode for the sim. Mage Act 1 is still too slow (see Other open items). 0.3.11 — done 2026-11-02
- [x] Gem shop is a fixed shelf instead of a random few: each act's gems spread over its first areas in level order (never before the area at their level), go on sale as those areas open, and never sell out. Gems above your level show but can't be bought yet; signature supports still need Town Market 2. The gear shops keep their restocks ([TOWN.md](design/TOWN.md)). — done 2026-11-02
- [x] Versions go up once per release, not every change. Changes collect in `UPCOMING` in `src/data/news.ts` and become that release's news post. `/ship` holds off going live while other sessions are working, and saves the work for the next release. — done 2026-11-02
- [x] Exiles on the Mage start get a Driftwood Wand instead of the Rusted Sword. 0.3.8 — done 2026-11-01
- [x] Spells need a wand, staff or sceptre, curses work with anything, the 20% caster bonus is gone, daggers roll no caster mods ([BATTLEFIELD.md](design/BATTLEFIELD.md) §7). Shadow starts with Twin Strike, Templar with Iron Guard. 0.3.7 — done 2026-11-01
- [x] Gem shop crash fixed: hovering a summon or storm gem blanked the game, and every shop gem's tooltip showed Default Attack's numbers. 0.3.6 — done 2026-11-01
- [x] Stash screen sorting: the bag and gear pages sort by Recent, Rarity, Slot, Item level, Can equip, Weapon DPS or Defence from a dropdown; DPS and Defence show their number on the tile. Other screens keep their three tabs. 0.3.5, went live with the 0.3.6 deploy — done 2026-11-01
- [x] Challenge modes: Hardcore, Solo Self-Found and Classic toggles at character creation, in any mix. 0.3.4 — done 2026-11-01
- [x] Skill gem reform: every act and attribute has AoE, single target, guard and leech ([SKILL_REFORM.md](design/SKILL_REFORM.md)). Save v33 gives existing characters The Old Covenant. 0.3.3 — done 2026-11-01
- [x] Kills before each area boss now ramp evenly from 10 (Mud Flats) to 80 (Shattered Throne) instead of 15–25; the starter drops moved to kills 1–9 so they finish before the first boss. 0.2.35 — done 2026-11-01
- [x] Wiki restyled as The Exile's Codex from your ChatGPT prototype: dark stone and gold look, left sidebar, new home page with game art. Content and generation unchanged. Every table sorts by clicking a column heading. Collapsible acts not included. — done 2026-11-01
- [x] Wiki Damage and ailments page: damage types, how attacks, spells and crits work out, every ailment formula, and defences. — done 2026-11-01
- [x] Player wiki at `/path-of-idle/wiki/` in a Fandom-style look (dark bar, orange banner, contents sidebar). 0.2.47 — done 2026-11-01
- [x] `/playtest`, `/build-act` and `/design-pass` skills, plus saved test scenarios in dev builds (`src/dev/scenarios.ts`). — done 2026-11-01
- [x] Guarded release flow: a `/ship` skill, and `npm run deploy` now refuses uncommitted work, a stale branch or missing login settings, and confirms the live site afterwards. — done 2026-11-01
- [x] Ascendancy tree can't be filled: trials give 3 each, 9 of 11, so at most three of the four big nodes. Save v32 cuts points back and refunds trees that no longer fit ([ASCENDANCIES.md](design/ASCENDANCIES.md)). 0.2.43 — done 2026-11-01
- [x] Wellspring replaces Wildcaster: full mana no longer costs damage, and wasted mana fills Overflow into a free Surge ([ASCENDANCIES.md](design/ASCENDANCIES.md)). Tested, not simmed or played. Save v31 resets every Mage who had picked, Alchemists included, to choose again with their points back. 0.2.41, reset 0.2.42 — done 2026-11-01
- [x] Ascendancy points only from a trial's first pass (4, 4, 3 to fill the 11), bosses give none, and the area card, Tree page and toast say what each trial gives and opens. Save v29 cuts held points to what passed trials give, and refunds a tree that no longer fits ([ASCENDANCIES.md](design/ASCENDANCIES.md)). 0.2.40 — done 2026-11-01
- [x] Martyrs eased: area and chain skills go for them with no click or rule and count for offline bosses (a spread from a support doesn't count offline yet), and a chained boss shows a notice over the field and "chained" instead of 0 ([ACT3.md](design/ACT3.md)). 0.2.39 — done 2026-11-01
- [x] Running list of uniques: [UNIQUES.md](UNIQUES.md), generated from the game data by `npm run uniques`, and a test fails if it's stale — done 2026-11-01
- [x] Tutorial redone around crafting: smith a weapon, Transmute it blue, wield it, then Old Brannoc pays for the Crafting Bench (1,500 gold, 200 logs, 200 ore) and you build it and salvage your old weapon. 14 steps, save v28; steps already settled are passed unpaid, so a second character can't collect the bench kit. In [DESIGN.md](design/DESIGN.md) 0.2.37 — done 2026-11-01
- [x] Acts 3–6 branch: forks that rejoin, side areas, act bosses that need about 75% of their act, and redrawn act maps with no overlapping labels. 0.2.36 — done 2026-11-01
- [x] Acts 4, 5 and 6 opened to players. 0.2.33 — done 2026-11-01
- [x] Hideout upgrade cards replace the station table: a "You have" total, every tier ticked or dimmed, the next upgrade with cost, later costs on hover. 0.2.32 — done 2026-11-01
- [x] Every Stash tab shared: gold, currency, materials, spare gems and spare flasks moved to the account, per realm, so a challenge league will have its own. Save v27 adds up what each character held; tabs and devices playing at once merge their changes ([TOWN.md](design/TOWN.md)). 0.2.31 — done 2026-11-01
- [x] Damage written up ([DAMAGE.md](design/DAMAGE.md)). Green upgrade arrows, the Upgrade sort and Pick up upgrades removed; hovering compares an item with what's worn: the items' base numbers, each bar skill's damage per second (with a warning if it would stop working) and character totals, with armour and evasion also as % against your level. Skill damage estimates now count spell gear, ailment modifiers and accuracy, and bleed and ignite don't stack in them, which also feeds the sim bot's skill choices. Not simmed. 0.2.30 — done 2026-11-01
- [x] One tab per character: opening a character sends any other tab of this browser holding it back to the select screen, after it saves. 0.2.29 — done 2026-11-01
- [x] Crafting Bench moved to the sidebar's Character group, after Stash. 0.2.28 — done 2026-11-01
- [x] Act 6 merged to main, closed to players: stages, Echoes, Unholy ground, Trial 3, the ending, The last empire and Cartography. 0.2.26 — done 2026-11-01
- [x] Acts 4 and 5 merged to main, closed to players: stages, skills, Archaeology and Cooking. 0.2.24 — done 2026-11-01
- [x] Boss farm: once an area's boss is beaten, Boss farm on its Campaign card or the Combat header brings it back alone 5 seconds after each kill, with its adds and no trash. Fleeing holds the timer, and offline without wind-up rules it stays in hiding and trash comes instead. Bosses have a 50% chance of 1–3 of one gathering material for their level, listed on the Campaign card. Not simmed. 0.2.21 — done 2026-10-31
- [x] Gear sets and skill loadouts, with gear auto-switching at Crafting Bench level 3 ([TOWN.md](design/TOWN.md#gear-sets-and-skill-loadouts)) — done 2026-10-31
- [x] Sidebar sorted by purpose: Hideout, then Adventure (Combat, Campaign, Map Device, Town), Character (Equipment, Stash, Skills, Passive Tree), Gathering, Crafting (Crafting Bench and the production skills) and Progress (Achievements, Coming soon). 0.2.19 — done 2026-10-31
- [x] Mini-games for Thieving (marks and Heists), Smithing, Alchemy, Gemcutting and Rune-carving, a different game each ([SKILLING_REWORK.md](design/SKILLING_REWORK.md) §9). 0.2.18 — done 2026-10-31
- [x] Combat screen layout (player report): skills and flasks moved into the arena under the field, which shrinks on short screens so they stay in view; Matchup is a fixed size that scrolls on its own, always lists the area boss's abilities, and keeps its rows with no target; status text and the Challenge button no longer reflow the field. The "Target" label is gone from the bar to fit one row. 0.2.17 — done 2026-10-31
- [x] Duelist feel: Riposte also answers hits that land, at 50% damage, and shows a labelled floater. A starter's ripostes went from 6.7 to 30.7 a minute and DPS from 4.3 to 5.7 (mudflats, 5 seeds). Matador and Vanguard keep their triggers ([CLASSES.md](design/CLASSES.md)). 0.2.16 — done 2026-10-31
- [x] Area level XP: your level against the area's range sets kill and gem XP (−10, −20, −40, −50, −80%, then 1% more per level to none at 25 over; +10%, then +20% at most below), shown on Campaign and Combat. Replaces the monster level falloff; Act 1's `xpScale` removed. New level curve set by play time; save v25 keeps everyone's level and progress. 0.2.15 — done 2026-10-31
- [x] Focus raised to 45% with an overflow bar that holds it about 5 seconds; no wait between Mining or Woodcutting swings; weak hits +5%. 0.2.15 — done 2026-10-31
- [x] Skilling mini-games for Mining, Woodcutting and Foraging: playing builds Focus for up to 30% more speed; idle and offline unchanged. 0.2.14 — done 2026-10-31
- [x] Event schedules: holidays plus a Double XP event in `src/data/events.ts`; Admin → Events runs each by hand or between two times, and overlapping events use the best bonus of each kind. Replaces `live_event` with `live_events`: run the SQL in [SETUP.md](ops/SETUP.md). 0.2.13 — done 2026-10-31
- [x] XP per hour readouts update every 2 seconds, still measured over the last 10 minutes. 0.2.12 — done 2026-10-31
- [x] Limited-time events: Admin → Events turns Halloween (2x XP including gems, every monster's drops rolled twice) on or off with no deploy; needs the `live_event` SQL in [SETUP.md](ops/SETUP.md) run once. 0.2.12 — done 2026-10-31
- [x] DPS meter shows a 2 second average, held until the next one, instead of a live 10 second figure; The Block's execute now counts. 0.2.11 — done 2026-10-31
- [x] Gear sell prices up 50% (flasks and materials unchanged; shop prices unaffected). Not simmed. 0.2.10 — done 2026-10-31
- [x] Combat DPS is now measured (player report): every point of damage dealt to monsters over the last 10 seconds, overkill included. Default Attack DPS stays on Equipment, labelled as such; save v24. 0.2.10 — done 2026-10-31
- [x] News panel on character select too, since signed-in players skip the title screen. 0.2.10 — done 2026-10-31
- [x] Salvage by rarity on the ground, offline haul, stash gear pages and stash overflow, matching the bag card. Skips runed gear; uniques ask twice. 0.2.9 — done 2026-10-31
- [x] Smithing salvage toggles (player report): on the Catalyst panel, "when the bag is full" and "everything I smith" turn new bases into Arcane Dust so smithing doesn't stop at a full bag. Both need the Crafting Bench; a repeat-until hit is kept, on the ground if the bag is full. Salvage all on the ground pile, also bench-only; uniques ask once more. 0.2.8 — done 2026-10-31
- [x] Before the balance pass: Challenge boss button (a ready boss waits so an area can be farmed; Auto-challenge beside Auto-flee sends it in on its own, online and, with wind-up rules, offline); version number in the sidebar from 0.2.3; more gear on every tier (6–7.5% → 15–18% per kill), basic orbs doubled on tiers 1–2, starter drops (5 bases, 2 Transmutes, 2 Alterations over a new character's first 14 kills); the ground no longer clears on leaving an area or on one death: a second death loses what the first left unclaimed ([TOWN.md](design/TOWN.md)). Sim not rerun. Merged, not deployed — done 2026-10-31
- [x] Milestone 2: the sim reports game time per milestone; day 1 lands at 2–4 Act 1 stages on both play styles after tuning Act 1 XP, early drops and late station costs ([BALANCE.md](design/BALANCE.md)). Merged, not deployed — done 2026-10-31
- [x] Gear bases extended to level 80: 113 new, 428 total ([GEAR.md](design/GEAR.md)). Not simmed — done 2026-10-30
- [x] Act 2 art: all 40 monsters and 6 uniques have pack art, and a test fails if a monster has none ([ASSET_MAPPING.md](design/ASSET_MAPPING.md)) — done 2026-10-30
- [x] Act recipe written with Act 1 and Act 2 gap tables ([ACT_RECIPE.md](design/ACT_RECIPE.md)) — done 2026-10-30
- [x] Drafted the 14 ascendancies and 5 hard mode bosses for your calls ([ASCENDANCIES.md](design/ASCENDANCIES.md), [HARD_BOSSES.md](design/HARD_BOSSES.md)) — done 2026-10-30
- [x] Background music: 10 Medieval Tracks by AlkaKrab, one track each for Act 1, Act 2, hideout and bosses, 9.1 MB in all, streamed on first use; crossfades, starts after the first input, pauses in hidden tabs; volume and mute in Settings, saved per device — done 2026-10-31
- [x] Docs updated for the reset: GDD rewritten as the current design, built-system docs note what changes, art notes corrected — done 2026-10-30
- [x] Design reset settled: finished game, pacing, core systems, act recipe, live game, roadmap ([Decisions](#decisions)) — done 2026-10-30
- [x] Retired docs deleted (AI art prompts, the superseded new content pass) and `npm run art -- --docs` removed — done 2026-10-30
- [x] Docs condensed: `design/` and `ops/` folders; merged setup, town + stash, and skills + uniques docs; links and code comments updated — done 2026-10-30
- [x] Support mail tested: mail to support@dabfellow.party lands in Gmail (you) — done 2026-10-30
- [x] Admin setup: SQL from [SETUP.md](ops/SETUP.md) run, you're in `admins`, Admin page checked with real data (you) — done 2026-10-30
- [x] Rotated the Google and Discord OAuth client secrets (the old ones in git history are dead); both logins tested on the live site, old Google secret deleted (you) — done 2026-10-30
- [x] Battlefield redesign ([BATTLEFIELD.md](design/BATTLEFIELD.md)): 34-hex half-ring with you on the bottom edge, 4 rings; every edge hex is a spawn gate; monsters slide between hexes and walk in from past the edge; casters stop at ring 3; skill ranges (melee 1, Lacerate 2, Poison Dart 3, bows/spells whole field) with closing in on monsters out of reach (faster with movement speed; Quicksilver gives 40%); arc / beam / nova area shapes; targeting setting (priority + order) and click-to-target; weapon restrictions on attack skills, spells 20% stronger with a caster weapon; phone-width summary; save v19 restarts fights in progress. Not simmed — done 2026-10-27
- [x] UI pass 4 (your walkthrough, 2026-10-27): Hideout gear click opens the item menu (take off, to stash, salvage); Combat out of a fight shows only "Pick an area" and life/DPS; "Armour shop" renamed Weapon & Armour shop (it always sold swords, axes, bows); Crafting Bench: orb bar pinned on top, selected item pinned on the left while you scroll, Equipment top right with Auto-crafting and Special crafting (fossils, essences) under it, Bench Crafts beside; Skills page shows the bar like combat (#1–#6 priority), click a skill for a popup with priority, trigger, supports, swap and remove; Smithing split into slot tabs (Weapons … Jewellery) with collapsible tiers, newest tier open — done 2026-10-27
- [x] Affix pool pass: 9 tiers to item level 80 (top 5 roll); attack/caster weapon tags; local defences and weapon physical, global versions on jewellery only; caster mods (spell damage, flat spell damage at full effectiveness, cast speed, spell crit, element %, mana cost, mana as ES, spell block); hybrid defence mods; ailment mods on jewellery; physical/elemental leech 5–30%; PoE-style attributes; Item Rarity a prefix at 4×; character XP replaces skill XP; life regen halved; % elemental tripled; resistances less dominant on armour; shields only roll their own defences ([GEAR.md](design/GEAR.md) → Affix pool). Not tested, by request — done 2026-10-27
- [x] Skill pool pass: attack gems scale the whole skill per level (+6% of base each), not each hit; skills tagged `hit` (deals damage) and `cast` (has a cast time), so damage supports don't fit Frost Ward or Meditate, Faster Casts only fits Fireball and Glacial Lance, Lingering no longer fits Parry; gem level needs character level up to 80 at gem level 20 (attributes 8 → 245; Lacerate and Backstab ×1.3); loaded saves drop over-levelled gems back (xp kept) and unsocket supports that no longer fit; Judgement Hammer, Glacial Lance, Frost Needle, Barrage, Pummel, Feint and Ice Shot buffed; Poison Dart is a Main skill ([BALANCE.md](design/BALANCE.md)) — done 2026-10-27
- [x] Gear dump, part 2: hybrid armour, first hybrid shields, and swords/axes/daggers/sceptres to level 60 (107 new, 315 total), bonus implicits on 40+, matching gear-set art ([GEAR.md](design/GEAR.md)) — done 2026-10-26
- [x] Gear dump, part 1: pure str/dex/int bases to level 60 (113 new, 208 total): armour, shields, maces, bows, wands, staves, with progressively better base stats and a bonus implicit on everything 40+; new armour tiers use matching gear-set art ([GEAR.md](design/GEAR.md)) — done 2026-10-26
- [x] Stash tabs no longer jump: every tab shares one panel as tall as the tallest (the Gear pages), so switching keeps the page height and scroll — done 2026-10-26
- [x] Flasks equip without the Crafting Bench (player report): click a flask slot on the Equipment page to pick a spare or take one off; click a spare in Stash → Flasks to put it on your belt; Lacerate needs level 35; Hideout gear card is the Equipment paper doll — done 2026-10-26
- [x] Hideout layout B (stats, equipment, quick buttons; land here on load); Town with Magic, Armour and Gem shops; station upgrades unlock tiers with steep costs (Forge, Alchemy Table tiers; Stash pages; Bench built for salvage, auto-crafting last; Town Market stock/restock); Map Device locked until Act 6; gem level requirements and rare level-appropriate drops; save v17 ([TOWN.md](design/TOWN.md), [BALANCE.md](design/BALANCE.md)) — done 2026-10-26
- [x] Act 1 called balanced (you, 2026-10-26): monsters life ×1.4 / damage ×1.15; most classes 3h40–6h, Warrior ~12h; class balance isn't a goal, finding what works is ([BALANCE.md](design/BALANCE.md)) — done 2026-10-26
- [x] Skill gems need their own attribute (8 at gem level 1, 44 at 5, 89 at 10, 116 at 13): short of it a gem stops levelling, can't go on the bar, and stops firing; tooltip shows it. Attack gems gain +8% weapon damage per level (was 3%) so a capped off-class attack falls behind. Bot respects requirements and slots instant spells into spare slots — done 2026-10-26
- [x] Cloud save sync between two browsers on the live site (you: works fine) — done 2026-10-26
- [x] Smarter sim bot: rebuilds its skill bar from owned gems, best supports, flask belt, mana/utility flask use, crafts worn gear; reports orbs used, out-of-mana time and the final bar. Re-ran all 7 classes (12 h, seed 1) against the old bot ([BALANCE.md](design/BALANCE.md)) — done 2026-10-26
- [x] Cleanup: off-hand picker compares against the off hand; duplicate `.page.wide` rule removed; offline-boss tests get a 20 s timeout; two dead exports removed; sim gear-swap logic shared — done 2026-10-26
- [x] Tutorial: skills-are-manual wording, Life Flask then a new Mana Flask step, Mine 9 ore so the cheapest smith (gloves/boots) is reachable, bench wording; save v16 keeps mid-tutorial players on their step. Combat: "Next area" buttons once the area's boss is down. Skill rules: while target is / isn't affected by Bleed, Poison, Ignite, Stun, Freeze, Chill, Shock or Broken armour. Sidebar: Hideout alone on top; Combat, Stash, Campaign, Trader, Equipment, Bench, Skills, Passive Tree; Achievements in its own Progress group at the bottom — done 2026-10-26
- [x] Hard 0.1 s minimum on every cooldown (`MIN_COOLDOWN_MS`), including Overclock (now "cooldowns drop to the 0.1 s minimum") — done 2026-10-25
- [x] Most spells are instant with their cooldown as the only limit (Spark, Frost Needle, Frost Ward, Arcane Siphon, Meditate, Shock Nova, Consecrate); Fireball and Glacial Lance keep their wind-up. Mage 6 h sim, seed 7: level 16 and 4,686 kills (was 14 and 3,375) — done 2026-10-25
- [x] Skill gems start on Manual only (nothing auto-casts by default); the rule editor offers each gem's suggested rule as one click; the sim bot and tests apply the suggested rules; existing saves keep their rules — done 2026-10-25
- [x] UI pass 3 (your walkthrough #2): Hideout "where to get it" flies out beside the cost panel; belt art fits the belt strip; bag is 2 fixed pages of 30 (Stash, Equipment, Bench) and stash pages are a fixed 80-slot grid, so nothing grows; combat has ringed monster tiles, Matchup in place of Active target, one skills + flasks bar with ground loot under it; Bench and Stash flasks in Life / Mana / Granite / Quicksilver / Diamond / Ruby tabs; Skills page gem lists full width with search, Str/Dex/Int, type and sort filters (supports: "Fits my skills"); Trader's Stall as a shop (awning, shelves by kind, price tags); skilling activities split into tiers (gathering by ore/log/herb, production by 10-level bands); new Coming soon screen — done 2026-10-25
- [x] Town pass 2: Character banner moved into the Hideout hero; station upgrade cost hidden behind a hover chip (have/need per material, right-click to lock, hover or right-click a material for where to get it, click a source to go there); next unlock shown on each Hideout skill tile; bars with numbers are tall enough to read (top bar, combat, resistances); bag salvage has All normal/magic/rare/unique (click once to select, again to salvage; uniques ask a third time); currency pills no longer slide under the character plate on narrower screens — done 2026-10-25
- [x] Single-target attacks lost their cooldowns (mana is their limit, PoE-style); guards, buffs, spells and area skills keep theirs and act before attacks on the bar — done 2026-10-25
- [x] Skilling pass 2: Smithing ×3 materials and 10 s+ per base; Gemcutting is one Skill Gem and one Support Gem recipe from the whole pool, 20–30 s and pricier; Harvesting shown as Foraging; one Skilling sidebar group with a gathering/production line; compact click-to-expand activity cards; Fishing added as a permanent "coming soon" skill with catches and a skilling-tree branch that does nothing; Coming soon page for the five planned skills ([SKILLING_REWORK.md](design/SKILLING_REWORK.md) §8) — done 2026-10-25
- [x] Character pass 2: zones can wait for a number of this act's bosses (`requires: { after, bosses }`); flat bordered currency/crafting orbs everywhere (pack art dropped); thinner gem rims; taller body armour slot; dual wield swings at the main hand's speed; attack/cast speed shown as ×multipliers; tree rim circle gone, rim nodes glow in class colour and give 1.5× stats; tinted game-icons necklaces and rings for every amulet/ring; click any item (bag, stash, ground, worn) for Equip / To bag / To stash / Salvage; Stash shows your equipment — done 2026-10-25
- [x] Character pass 1: Campaign is a continent map (one region per act, areas as linked points; a boss can open several areas via `unlocks`); Maps is its own sidebar section with the Map Device page; skill gems are flat bordered tall hexagons, supports 12-sided, with plain silhouettes; clicking an empty socket lists the supports that fit; no natural life/mana regen in fights (flee breather once the field is clear) and you start with a life and a mana flask; main hand + off hand with dual wielding (averaged weapons, 10% more attack speed), shields off hand only, 4 ring slots, new doll layout, flask recovery shown on flasks; Offence panel grouped with dividers; class-mechanic clusters moved to an outer rim of the tree (generic clusters in their old spots, save keeps connected allocations); bench orbs show their art, fossils/essences/resins/shards got icons; Craft until… renamed Auto-crafting and locked behind a new Crafting Bench level 5 — done 2026-10-25
- [x] Ground loot (50, FIFO, Combat page), bag (60), stash pages (3×80, more for gold, Stash station discounts), offline haul (200), item tiles everywhere, trader "show stash too", bench picks from bag + stash, save migration ([TOWN.md](design/TOWN.md)) — done 2026-10-25
- [x] Town pass 1: top bar has a centred character plate (crest, name, level, class, life/ES/mana) and a smaller activity box; Hideout title centred as "Hideout", life/DPS chips gone; station cards show the current effect, one "next level" line and cost + Upgrade (description moved to hover); Character level is its own banner above the trade skills; trader quote removed, gold shown with the coin; paid restock doubles in price until the free restock; spare flasks capped at 10 per kind (worst sold, also trimmed on load) — done 2026-10-25
- [x] Act 2 framework: 8 areas, Scorched earth boss mechanic, drop tiers 6–7, 6 new uniques, preview gating, unlock-on-load for old saves ([ACT2.md](design/ACT2.md)) — done 2026-10-25
- [x] Zones for Last Breath, The Old Grudge, Brawler's Buckle and Starforged Edge (Act 2) — done 2026-10-25
- [x] Re-ran the sim since every skill got a cooldown (36 h, seeds 1–2; BALANCE.md) — done 2026-10-25
- [x] Code tightening: burning ground now kills on the tick the last monster dies; save errors reach Sentry; dead exports removed; "Conqueror of the Coast" no longer counts later acts — done 2026-10-25
- [x] Fix: "faster Cooldowns", guard cooldown and Arcane Recursion now shorten cooldowns in fights (combat used the base value) — done 2026-10-25
- [x] Every skill has a cooldown: main 2–3 s, area 4–5 s, Poison Dart 4 s; damage not rebalanced (your call) — done 2026-10-24
- [x] Combat screen pass: soft ground spots replace the stretched hex tiles, compact field tokens, one labelled "Active target" card, ES/mana/mechanic bars tall enough for their labels — done 2026-10-24
- [x] Hideout layout pass: stations capped at 3 columns (3×2), two-column skill cards with icon, level, XP bar and exact-XP tooltip — done 2026-10-24
- [x] SPF record fixed (`v=spf1 include:_spf.mx.cloudflare.net ~all`); Email Routing status is "ready" — done 2026-10-24
- [x] Sentry project `path-of-idle` (errors only), DSN in `.env.local`, deployed; test error PATH-OF-IDLE-1 received — done 2026-10-24
- [x] Admin page (stats, feedback inbox, reviews, Sentry errors link), Settings feedback + star review, Sentry wiring — done 2026-10-24
- [x] Support contact: support@dabfellow.party (Cloudflare Email Routing → Gmail) in the privacy note — done 2026-10-24
- [x] Art pack licences: all art was bought, no further checking needed (you) — done 2026-10-24
- [x] Play one character of each class through Act 1 by hand (you: it's fine) — done 2026-10-24
- [x] Supabase setup and live-domain URLs (you) — done 2026-10-24
- [x] Build the 15 new actives and their signature supports ([SKILLS_AND_UNIQUES.md](design/SKILLS_AND_UNIQUES.md)): `convert`, `moreVsAiling`, `chillMs`, `restoreManaPct`, `manaBelow` rule, Momentum per hit — done 2026-10-24
- [x] "Skill modifier" mods and the ★ tweaks on uniques; tooltips grey out other classes' mechanic mods — done 2026-10-24
- [x] Check every class-mechanic stat on uniques is read (`coupAilment` wasn't; now is) — done 2026-10-24
- [x] Sim all 7 classes on seeds 1–3 (also covers the action-time recheck) — done 2026-10-24
- [x] Portrait prompts for Duelist, Templar, Shadow and Exile in `ART_PROMPTS.md` — done 2026-10-24
- [x] Starter kits for the hybrid classes: checked, current kits kept (hybrid bases start at lvl 8) — done 2026-10-24
- [x] Improve bot gear scoring: ES and hit chance counted, buys trader upgrades — done 2026-10-24

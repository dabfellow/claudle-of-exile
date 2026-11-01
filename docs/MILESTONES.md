# Milestone Guideline

The one place for what's next, what's planned, what's been decided and what's been done. **[You]** means it needs you,
not Claude. **Done** on a milestone is what has to be true before moving on. The order is by dependency: pacing rules
first, because every act is tuned against them.

Last updated 2026-11-01.

**On this page:** [Next steps](#next-steps) · [Milestones](#milestones) · [Decisions](#decisions) ·
[Other open items](#other-open-items) · [Ideas / later](#ideas--later) · [Done](#done)

## Next steps

**Where we are:** Milestones 1, 2, 3 and 7, music, and all six acts are live as 0.2.39 (deployed 2026-11-01), with forked roads in Acts 3–6 and the crafting tutorial. Acts 4–6 went out unsimmed and unplayed. The real-account
test and player heads-up were skipped, so do both now. Act 1's cold check and Scorched earth's danger
stay as they are, with no playtest planned, until you say otherwise.

**In order:**

1. **Claude:** build the real Maps (Milestone 8). Beating Act 6 opens the bare Maps preview page, and drawn maps can't be spent yet.
2. **[You]** Test on a real account: sign up, log in, password reset, and demo carryover through email, Google and
   Discord. Moving guests to an account and demo adoption have only had unit tests.
3. **[You]** Post a heads-up. Live players went from 12 h to 8 h offline, lost offline boss fights and wind-up rules until
   they earn them, and Act 1 got slower.
4. **[You]** Find a hand-made landscape pack. GegX is AI-generated and is used for the area banners and the title and
   hideout scenes ([ASSET_MAPPING.md](design/ASSET_MAPPING.md)).
5. **[You]** Play the Maps preview whenever you like, and say whether the loop is fun. Maps stay post-Act 6 in the real
   game; the preview is dev and admin only. Try it with `npm run dev`, then Map Device → Dev tools.

## Milestones

| # | Milestone | Status | Waiting on |
|---|---|---|---|
| 1 | Automation and offline rules | **Done**, live | – |
| 2 | Measure the pacing | **Done**, live | – |
| 3 | Account layer | Live, not tested on real accounts | Real-account test |
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
- [x] Simple rules free, reactive rules unlocked through the War Table.
- [x] Offline combat stops on death; offline cap starts at 8 h, and the Watchtower raises it toward 24 h.
- [x] Deploy — done 2026-10-31
- **Done:** a fresh character can't idle bosses until it has earned reactive rules, and all of this plays on the live
  site.
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
- [ ] Test on a real account.
- [ ] Leave the reserved `account` rows out of the Admin stats query ([SETUP.md](ops/SETUP.md)).
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
- Full tiers and themes, map drops, Cartography as the optional crafting route.
- **Done:** a character can farm from the first tier to the last, with auto-run working offline.

### 9. Hard mode bosses
- New bosses, boss keys from drops and skilling, boss moments for manual play and a reactive-rule answer for idle
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
- Hardcore and Classic, each with their own stash, hideout and unlocks.
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
  - **What makes one better:** tiers set the difficulty; each map has a fixed theme that favours a certain drop (fossils,
    a unique, boss keys).
  - **Using them up:** consumed per run, so keeping a supply going is part of the game.
  - **Idling:** auto-run. Pick a tier and theme, and the device keeps using matching maps from your stash until none
    are left.
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

- [x] Gear sets and skill loadouts, with auto-switching behind the Crafting Bench — done 2026-10-31
- [x] Art and music sent 2026-10-31 merged: 112 item slots and 4 music tracks. All free itch.io files; you said to assume
  free public use while the game isn't sold, so recheck if that changes — done 2026-10-31
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
- [ ] Str/Dex mana: they should stay mana-hungry, but need a mana leech option (passive tree or support), costs paid with life, or uniques/mana regen to stack, on top of flasks.
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
- War Table: Wind-up rules are now level 2, about 15 minutes of gathering, so offline bosses come far earlier than Milestone 1's pacing assumed. Not simmed.
- The sim's `reachable` now pushes unbeaten areas so it walks every branch, but hasn't been run since the roads forked, and its pacing numbers for Acts 3–6 predate them.
- `TRIAL_ZONES` in `scripts/sim.ts` has `hollowreef`, now one side of a fork; the bot still clears it.
- Hideout later-tier costs only show on hover, so phones can't see them.
- Chaos is offence only: no monsters deal it, no player chaos resistance, no chaos skills past Poison Dart, and flat chaos doesn't reach spells ([DAMAGE.md](design/DAMAGE.md)).
- Ailment numbers (40% threshold, 25% skill chance, ignite 50%, shock 40%) are first guesses, not simmed. Bosses may be near immune to Ignite and Freeze at these thresholds.
- The game doesn't explain buildup or ailment scaling anywhere yet; players have to read [DAMAGE.md](design/DAMAGE.md).
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
- Revisit Sanctum chaos farming (85–155 per 14 h) when Act 2 lands.
- Art comes from asset packs: a final visual pass (area cards, combat screen, phone widths), swapping any loose matches in [ASSET_MAPPING.md](design/ASSET_MAPPING.md) as better pieces turn up.
- Bot only enters an area within a level of its minimum, so the sim can't tell whether players could push Act 2 earlier.
- Skilling band Lv 20–40 for Act 2 (Mithril / Yew / Emberroot) isn't built; gathering nodes stop at the Storm Cliffs.
- Chill now always slows attacks 15% (was 0% without `chillOnHit`); watch whether chilled ground is too strong.
- Clarity cuts every skill's mana cost, not just spells; split out a spell-only stat if that matters.
- Ascendancy classes — and decide whether they twist the class mechanic or add something separate.
- Skilling bands above Lv 20 (Act 2+), including Chaos / Regal recipes — [SKILLING_REWORK.md](design/SKILLING_REWORK.md).
- Gemcutting "Prisms" as its force material.
- Mastery per action (Melvor-style), once higher skilling bands exist.
- Loot / sell filter rules (post-launch, GDD §7).
- Cosmetics shop (never pay-to-win).
- Acts 3–6 and Maps.

## Done
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

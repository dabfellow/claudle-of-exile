# Roadmap and decisions

Last updated 2026-11-08. Current implementation: [GAME.md](GAME.md). Engineering and verification: [DEVELOPMENT.md](DEVELOPMENT.md). Historical releases: `src/data/news.ts` and git history.

## Next steps

Latest confirmed live release: **0.4.14, Passive Tree Pan and Zoom Performance**, deployed 2026-11-08. Decoupled dragging and wheel zooming from React re-renders using direct SVG transform updates batched with requestAnimationFrame, added canvas layout containment and GPU transform hints, paused transitions and animations during drag, and made passive tree links non-interactive for hit-testing.

1. Security prerequisite: confirm revocation of the historical Google OAuth client secret, confirm the separate account-helper lookup-path changes and perform signed-in isolation/login checks; see SETUP.
   Owner reports market/admin SQL applied on 2026-11-06; live anonymous Admin access checks pass. Current validation upload and real-account inspection/recovery/mail/event checks remain before next release.
2. Finish the save-loss and pacing audit before speculative fixes. Local persistence/merge tests pass, but live evidence is still needed to distinguish a storage failure from a cross-device overwrite. Current whole-journey simulations expose large Ranger seed variance and a repeatable Mage Act 4 stall, so pacing is not ready to lock.
3. Fill the player-guide gaps listed in GAME; each should be source-backed and built with the wiki.

## Milestones

| # | Milestone | Current status |
|---|---|---|
| 1 | Automation/offline | Released; survival rules and two conditions baseline; flask-default removal verified (strictly requires Instilling) |
| 2 | Pacing | Whole-journey audit run on 0.4.4; four classes finish Act 6 in a nonstop day, while Ranger has large seed variance and Mage commonly stalls in Act 4 |
| 3 | Account layer | Released; local Admin inspection/recovery/mail overhaul verified; service migration and real-account checks remain |
| 4 | Act 2 and content recipe | Released; cold-check/art follow-ups remain parked |
| 5 | Released Maps system | T1–T10, levels 66–84, Map Device and auto-run released in 0.3.18 |
| 6 | Act 3 / ascendancies | Released; four trials and 2/2/3/2 points replace original structure |
| 7 | Acts 4–6 | Released with branching roads and side skills |
| 8 | Additional Maps expansion | Released in 0.4.3: plain/shared maps T1–T10, permanent tier mechanics, Sextants, 100-node Atlas with up to 70 allocated points, Doomed Maps I–V and Cartography T1–T10/Sextants |
| 9 | Hard bosses / Uber layer | Released in 0.4.4: five Hard Bosses (`ossuar`, `mother_vael`, `undertow`, `twin_regents`, `crownless`) and three Uber Bosses (`uber_first_exile`, `uber_architect_ruin`, `uber_void_sovereign`) with keyed Map Device arenas, reactive `weakPoint` and `choir` aims, boss trophies, Doom Sigils, key crafting recipes, and 11 exclusive uniques |
| 10 | Top-end crafting/hideout | Released in 0.4.4: Fractured items/orbs (10A), Bench L6 meta-crafts with Forger's Seal auto-crafting (10B), Station expansions L5–6 with Stash affinities (10C), Uber Bosses with Doom Sigil crafting (10D), and Crafting Bench UI overhaul with affix capacity tracker and categorized navigation |
| 11 | Long tail | Challenge modes, Unique discovery and non-combat action mastery implemented; collection expansion planned |
| 1.0 | Launch designation | Owner decides; any save wipe requires a clear announcement |

## Decisions

- Passive Tree Pan/Zoom Performance Overhaul (2026-11-08): Decoupled continuous dragging and wheel zooming from React component re-renders using direct SVG transform updates batched via requestAnimationFrame with debounced state synchronization. Optimized CSS rendering by isolating the canvas with CSS containment, adding will-change transform hints, pausing animations and transitions during drag, making passive links non-interactive for hit-testing, and replacing software raster blur on node halos with vector stroke outlines.
- Passive Tree Arterial Highways & Orbital Ring Layers (2026-11-08): Replaced linear cluster daisy chains with radial arterial spine junctions per sector and direct cluster links, guaranteeing no cluster is more than 3–6 travel steps from its class start. Added two concentric intermediate orbital highway rings (Mid-Inner at r=1700 and Mid-Outer at r=2950) connecting all six class sectors across the tree alongside the existing Inner Crossing (r=260) and Outer Rim (r=4300). Cut total travel nodes across the tree by over 80% (from 1,578 down to 192 nodes), completely eliminating travel fatigue while preserving all notable names, stats, masteries, keystones, and doomed debuffs.
- Character Passive Tree 5x Overhaul (2026-11-08): Expanded the passive tree to 3,295 nodes arranged across concentric rings, radiating from a 3-tier hexagonal neutral concourse at the Exile's start (0,0) outward through 6 class sectors (-90°, -30°, 30°, 90°, 150°, 210°). Features 3 paired PoE-style Cosmic Gateways (Solar/Lunar, Astral/Void, Primal/Divine) bridging opposing sides of the tree for 3 travel points, 6 high-stakes Doomed Gates (5 passive points + permanent debuff gating god-tier wheels), 12 Celestial Forbidden Keystones spaced evenly at radius 5,400, and diverse defensive/puzzle archetype wheels (Cryo-shatter, Glacial ward, Fortify, Recoup, Spell Suppression, Low-life defiance, Gear/Crafting scaling). Introduced separate Travel, Passive, and Mastery point economies and 3 saveable, cross-linkable tree profile loadouts.
- Builds fight by their rules; manual play can improve results. Combat and skilling compete for one activity. Offline uses the same engine. No pay-to-win; cosmetic monetisation is a later idea.
- Class starts provide affinities, not exclusive build lanes. Character trees use compact clusters and useful attribute travel. Class mechanic specialisation belongs in ascendancies.
- Every ascendancy has six notable choices and two capstones; the 2/2/3/2 trial budget supports any three notables and either capstone. No node-specific milestone gates or hard node-count ceiling. Chase items may eventually grant extra nodes/capstones.
- Vitals/Wind-up/Ground and two rule conditions are baseline. War Table grants advanced rules, a third condition and rarity-based auto-salvage. The latest requested behavior makes flasks manual unless Instilled.
- Hideout upgrades use refined planks/bars and Boss Trophies rather than thousands of raw materials. Classic converts applicable material costs to Gold.
- Mana is Power uses four-second spending; Momentum grants Evasion and protected flat losses; Field Tinkering supports low-level gear; postures automate spacing; eligible higher-priority skills reserve Mana 1.5 seconds ahead.
- Momentum keeping is flat (2026-11-06): each source (uniques, Sure-Footed, Steady Aim, tree node) saves 1 stack per landed hit, minimum loss 1. Old % values on already-found uniques are read as 1. The "Mana within X% of full" unique text was stale; it now says what the code already did (recent spending counts X% more).
- A dedicated first day should plausibly reach the end of Act 6. Old week/month pacing tables are retired. Level 100 is a long chase; 99 is halfway in XP. Exact class parity is not a substitute for meaningful builds.
- Combat XP has a two-level grace band outside an area's level range. Harder enemies give +5% at three levels and +20% at five, interpolating between. Easier enemies use a rounded quadratic penalty of 10/11/15/21/30/41/54/70% at three through ten levels, with increasing losses each level. Hold both caps thereafter. This supersedes both the old falloff to zero and the initial piecewise penalty milestones.
- Fishing is a permanent placeholder/joke. It is not scheduled work.
- The skilling tree represents specialisation (2026-11-06): one point per ten total levels, capped at 36. It must never become fully completable through ordinary levels; Fishing has no spendable branch, and every implemented life skill has one.
- Non-combat band mastery is a bonus-only, character-owned progression track (2026-11-06; implemented 2026-11-07). Its 67 explicitly authored identities never expand per generated item. It never unlocks or blocks recipes, resources, stations, areas, items or other content; existing skill-level, campaign and station requirements remain responsible for access.
- Player Market remains browser-simulated with server-validated transactions, not a server-authoritative economy. Keep validation uploads and item/Gold recovery protocols.
- Offline-earned items/currency remain tradable by explicit owner choice (2026-11-05). Harden market inputs, request limits and permissions, and document residual forging/rollback risks. Do not replace offline trading or claim item provenance from client-owned saves. Public-source review does not authorize destructive history rewrites or branch-policy changes.
- Internal docs have one home each: GAME for current behavior, DEVELOPMENT for engineering, this file for plans. Published wiki, generated UNIQUES, operations SQL and asset credits remain distinct.
- Admin diagnostics/actions use database-enforced privileges and audit records; recovery creates a separate character so live uploads cannot overwrite it. Reproductions use a memory-only sandbox with trading disabled. Feedback snapshots are bounded game state, not auth/browser storage; account email and character ownership are resolved server-side. Anonymous demo counters remain approximate, opt out via Do Not Track and never authorize rewards.
- Monster identities redistribute existing reference effective pools and expected raw basic DPS into player-style defences, damage types, attack speeds, criticals and ailments. Individual build matchups may differ; pack counts, rewards and boss telegraph damage remain intact. Monster ES recharge is a separate stat, with no extra boss heal loop. Exact calibration lives in GAME and the engine.
- Post-campaign crafting and hideout decisions (2026-11-06, [POST_CAMPAIGN_CRAFTING_AND_HIDEOUT.md](POST_CAMPAIGN_CRAFTING_AND_HIDEOUT.md)): Fractured Orbs randomly pick an affix (no seal steering); the three Uber Bosses each grant one piece of the Doom Sigil crafting trinity (The First Exile elevates T1 to T0, The Architect of Ruin grants Doom implicits, The Void Sovereign opens a 7th modifier slot); Stash Affinities are a baseline Act 1 convenience; offline map auto-running is supported and enhanced by Watchtower upgrades.
- Unique items rework (2026-11-06): Campaign unique drop pools scale progressively by zone depth, starting with exactly one unique (`castaways_kerchief`) in the Mud Flats; class-defining trait uniques (Rage, Malice, Fervor, Riposte, Momentum, Mana is Power) drop in mid-to-late campaign zones and maps rather than early Act 1; flat numerical modifiers on uniques feature roll ranges that can be rerolled using Divine Orbs (items with purely fixed mechanics cannot be Divined); and select powerful uniques carry thematic downsides to prevent them from crowding out end-game crafted rares.
- Comprehensive UI and responsive pass (2026-11-07): Stash tab affinities UI selector and tab badge indicators, Currency tab Fractured Orb display, Materials tab Refined components (bars/planks) and Boss trophies/Sigils groupings, mobile character switching in sidebar and Settings, compact topbar mobile currency indicator, mobile Hideout stacking, mobile Combat direct strike buttons for Weak Points and Choir adds, and safe viewport boundary clamping for item menus and tooltips.
- Flask policy, early pacing, boss crafting materials, Tiered Loot (T1–T5) and Class Loot Filter (2026-11-07):
  - Belts enforce a 4-slot layout (1 Life, 1 Mana, 2 Utility). Instilling Orbs drop starting in Act 2 (tier 5+) to unlock early automated flask triggers before burst damage frustrates idle players.
  - Boss kills and boss farming reliably award refined construction materials (copper/iron/mithril bars, ash/oak/yew planks, rough gems, arcane dust) so combat progression alone can advance Hideout stations without mandatory gathering skilling.
  - Tiered Loot (T1–T5) scales across acts and maps: higher tiers increase mod value floors and bias affix tier rolls; Tier 5 loot introduces a 35% chance for natural Fractured modifiers and rolls on special bases (Simplex Amulet, Annointed Belt, Astral Plate) with tooltips and cells displaying visible tier badges.
  - In-game Settings feature an optional "Filter Off-Class Loot" toggle as well as full Custom Loot Filter profiles (create, edit, delete, and switch between saved filters) with rule matching on item tiers (T1–T5), item levels, slots, rarities, defence types, weapon families, and class affinity. Filtered non-unique equipment is automatically salvaged on drop into Arcane Dust.
  - Ranger and Mage progression smoothed with early survivability adjustments (Momentum damage mitigation, Mage starting Energy Shield and Cold Resistance) ensuring consistent, low-death 2-hour completion through Acts 1–6.
- 3-Profile Tree Loadouts with cross-linking (2026-11-07): Character Passive Tree, Atlas Tree, and Life Skills Tree each support 3 saveable loadout profiles. Profile 1 is available from the start; Profile 2 unlocks upon reaching Act 5 (`s.campaign.act >= 5`); Profile 3 unlocks upon clearing a Tier 5 Normal Map (`s.maps.highestTier >= 5` or Atlas Tier 5 clear). Switching profiles is allowed in Town or Hideout (prohibited in active combat) and automatically triggers linked equipment loadout, Atlas profile, or Life Skills profile swaps.
- Passive Tree 5x expansion UI overhaul (2026-11-07): Tree canvas enlarged to 12000x12000 with 7.5x max zoom and hardware-accelerated pointer panning. Top bar features 3 profile manager tabs with lock icons (unlocked at Start, Act 5, and T5 Maps), active linked loadout badges, and a profile settings modal. Multi-currency point tracker chips for Travel (Cyan), Passive (Gold), Mastery (Purple), alongside Regret orb counter and Refund mode toggle. Visual node rendering includes Cosmic Gateways (pulsing cyan circular portals with pairing tooltip and conduit activation prompt), Doomed Gates (crimson diamond/skull glyphs with permanent debuff warning badges), Celestial Keystones (radiant pink star glyphs), and PoE-style central cluster Mastery Sockets with search bar luminous glow highlighting and non-matching node dimming.

### Additional Maps expansion

The T1–T10 Maps update shipped in **0.3.18 on 2026-11-02**. The redesign below replaces themed maps with plain shared maps, permanent tier mechanics, Sextants, the Atlas tree, Doomed Maps I–V, and full Cartography support; Uber bosses remain separate design/implementation work.

- [x] Replace themed maps with plain maps and a shared realm supply; migrate held themed maps by tier. Random campaign act visuals/mechanics provide variation. Keep T1–T10 at levels 66–84. — done 2026-11-06
- [x] Ensure first-map/top-up sources and real Map Device navigation support progression. Do not call all ten existing tiers unimplemented. — done 2026-11-06
- [x] Give tier groups permanent danger/reward identities: — done 2026-11-06

| Tiers | Planned danger | Planned reward emphasis |
|---|---|---|
| 1–2 | Baseline | General drops |
| 3–4 | Two elite packs: 4× Life, 1.5× Damage, 3× XP, 60% more drops | Reliable Chaos |
| 5–6 | Twin boss lieutenant at 60% stats with shared Life | First tier-specific unique pool |
| 7–8 | Dangerous boss ground | Second unique pool and Regal emphasis |
| 9 | Permanent enrage: 30% speed, 40% damage | Exalted emphasis |
| 10 | Elite packs, twin boss and enrage | T10 uniques and strong Divine rates |

These rewards describe the intended redesign, not the current earliest drop location of each currency.

- [x] Sextants: three strengths, one Map Device slot growing to three plus an Atlas slot; rerollable danger/reward/hunting mods with limited run charges (six base). Hunting mods provide hard-boss keys. Auto-run consumes charges offline. Include danger/reward and incompatible-mechanic warnings. — done 2026-11-06
- [x] Atlas: a connected 100-node radial skill tree with branching Sustain, Bounty, Surveying and Peril paths; up to 70 realm-shared points (30 from normal maps, 2 for each Doomed tier first clear, 3 for each Hard Boss first clear, and 5 for each Uber first clear); free whole-tree and connected leaf respecs. A 20-point unlock (Doomed Horizon) enables Doomed Map drops. — done 2026-11-06
- [x] Cartography: plain-map recipes, Sextant recipes, continued folios and 3:1 upgrades, extending across T1–T10. Existing map-upgrade tree effects survive the rework. — done 2026-11-06
- [x] Doomed Maps I–V: monster levels 86/88/90/92/94, packs 65/70/80/90/100 (scaled from 10 at T1 up to 100 at T5 Doomed), with 2 / 2–3 / 3 / 3–4 / 4 mods. Rare T8–T10 drops after the Atlas unlock. Mods: preassembled adds, revenants reviving at 30% Life, unfilled flask belts, permanent low-Life enrage, Hulking packs, four-second burning aftermath, and a six-second ward at 60% boss Life. — done 2026-11-06
- [x] Doomed rewards: 3.5× T10 Exalted/Divine rates, Fractured Orbs, and Uber Keys at 10/15/20/25/35% per boss by Doomed tier. Three key types are equally weighted; keys are consumed on fight entry. — done 2026-11-06
- [x] Map modifier safety & bulk farming revamp: Auto-run enabled for Doomed Maps (I–V), per-map modifier rolling, avoidable modifier blacklist with automatic Chaos Orb rerolls during auto-run, normal map affix toggle, and monster pack scaling from 10 at T1 to 100 at Doomed V. — done 2026-11-06
- [x] Uber bosses: The First Exile (~90, mirrors/adapts to builds), The Architect of Ruin (~93, escalating act-boss cycles), The Void Sovereign (~96, chaos and buildup vulnerability windows). Each has exclusive build-changing uniques and Doom Sigils for future crafting. — done 2026-11-06

### Hard bosses: implemented locally (2026-11-06)

- [x] Five separate keyed fights (`ossuar`, `mother_vael`, `undertow`, `twin_regents`, `crownless`) run from the Map Device, with keys from Sextant hunting and life-skill crafting, reactive `weakPoint` and `choir` skill aims, manual focus bonuses, five-minute escalating enrage, boss trophy drops, and five exclusive uniques. — done 2026-11-06

| Boss | Encounter proposal | Key / reward proposal |
|---|---|---|
| Ossuar (~72) | Physical stone plating; hit a six-second weak point to break plating for ten seconds | Marrow Key; Marrow Shards; Faultline mace |
| Mother Vael (~75) | Lightning choir adds granting defence, haste or healing; choose the priority add | Bell Key; Choir Glass; Last Hymn amulet |
| The Undertow (~78) | Cold tide stacks; interrupt or burst through Deep Call | Abyssal Key; Black Pearl; Riptide boots |
| Twin Regents (~82) | Fire/cold paired bosses; balance Life and switch off guarded targets | Joined Regent key; Throne Ash; Twinned Crown |
| The Crownless (~86) | Elemental phases combining previous moments with physical slams | Combine other keys; Crownless Sigil; The Unwritten grants another ascendancy's notable |

Roster levels, crafting recipes, moments and unique effects are proposals, not content tables. Acceptance: suitable endgame builds can idle safely, inadequate rules/gear fail, manual answers help earlier, and offline/live behavior agrees. No unrequested balance implementation follows from this document.

### Post-campaign crafting and hideout: design in progress

Milestone 10 planning and specifications live in [POST_CAMPAIGN_CRAFTING_AND_HIDEOUT.md](POST_CAMPAIGN_CRAFTING_AND_HIDEOUT.md).
- [x] Fractured Orbs and natural fractured drops in Doomed Maps I–V: engine support, random affix locking, scouring down to 1-mod magic base, annulment immunity, whetstone protection, impression restore, Bench page integration and gold tooltips. — done 2026-11-06
- [ ] Doom Sigils from Uber Bosses for past-the-limit modifier crafting (The First Exile = T0 elevated mod, The Architect of Ruin = Doom implicits, The Void Sovereign = 7th modifier slot)
- [ ] Hard-boss material utility (Marrow Shards, Choir Glass, Black Pearl, Throne Ash, Crownless Sigil) for keys, high-tier bench crafts and station upgrades
- [ ] Crafting Bench level 6–7: meta-crafts (prefix/suffix locks, multi-craft), seal-integrated auto-crafting
- [ ] Hideout expansion: Map Device level 5–6, Bench 6–7, Forge 5, Alchemy Table 5, Stash affinities (baseline Act 1), Watchtower 5, and Trophy Altar

### Non-combat action masteries: implemented

**Written 2026-11-06; implemented and verified 2026-11-07.** This is the canonical design and implementation record for the feature, kept here to avoid another standalone game document. It is separate from the existing passive-tree mastery choices.

#### Purpose and fixed requirements

Repeatedly using related non-combat actions should make that practical band of work more efficient. Mining Copper or a special Copper seam improves Copper Mining mastery; smelting Copper improves Copper Smelting mastery. Overall Mining/Smithing levels still determine access to higher actions through the existing requirements.

The owner has fixed two requirements:

- **Non-combat only.** Fighting, kills, weapon use, combat gems, minions, boss clears and ascendancies do not earn action mastery or receive direct mastery bonuses.
- **No mastery-gated unlocks.** No recipe, resource, area, station, item, skill, action mode or reward requires a mastery level. Bonuses grow automatically; there are no locked perk branches, mastery point purchases, prestige requirements or new mastery-threshold rewards.

An action with zero mastery keeps its current baseline behavior. Mastery is not permission to nerf the baseline and sell the old effectiveness back through grinding. Training every obsolete action must not become necessary for access or a global completion bonus.

The implemented settings below are deliberately modest and bounded; future economy reviews may tune them without turning mastery into an access requirement.

#### Scope and identity

Use explicitly authored, stable mastery-band identities: narrower than a whole profession, but never one track per generated item. Every eligible action/job supplies a `masteryId`; bulk versions resolve to the same id as their single recipe. Do not infer identity from display text or a level calculation, and renaming a label must not reset progression.

The first version must contain no more than **100 total mastery identities**, including Heists. The inventory and UI review must happen before implementation; adding hundreds of generated Smithing bars is not acceptable. Bands should describe work a player can recognise and deliberately practise:

| Activity | Mastery band | What remains controlled by existing systems |
|---|---|---|
| Mining, Woodcutting, Foraging | Resource bands: Copper/Iron/Mithril, Ash/Oak/Yew and each herb tier. Special nodes feed their ordinary material's band | Resource access, skill levels and area requirements |
| Ordinary Thieving | A small set of target/difficulty bands, authored across the campaign rather than one bar per mark | Target availability, material rules and Heist access |
| Archaeology | Culture/site-family bands; changing strata does not create a fresh track | Depth, standing, special finds and Expedition unlocks |
| Smithing | Three material bands crossed with broad equipment families (weapons, off-hands, armour and jewellery); smelting and boss-key work use a few separate bands | Exact base access, item level, Forge level and generated base identity |
| Alchemy | Authored flask and orb bands; single/batch versions share a band | Recipe access, flask type and orb output |
| Gemcutting | Skill, support, signature and special-cut bands | Gem availability, level restrictions and special outputs |
| Rune-carving | One band per rune family across its grades | Grade access, rune strength and materials |
| Cooking | Meal/ingredient bands grouped by tier and purpose | Recipe access, exact meal effect and Alchemy ingredients |
| Cartography | Materials, Sextant grades and map-tier pairs (T1–2 through T9–10) | Available tiers, campaign access, map supply and required map inputs |
| Heists | A small set of job/difficulty bands; every resolved room feeds its job's band | Crew, room access, alarm rules and admission costs |

Greenhouse completions use the Foraging band assigned to the underlying action. Repeating and automatic actions use the same identity as their manual equivalents. Future real professions can opt into this model when implemented; mastery does not implement Fletching or activate Fishing placeholders.

Instant item-modification clicks—spending Orbs, applying Essences, taking/restoring impressions, inscriptions and bench modifier clicks—are outside the first version. Timed production recipes are included; an unlimited-speed clicking loop is not a source of practice. Band mastery does not spend skilling-tree points or alter the player's chosen specialisations.

#### Earning practice

Mastery uses its own **practice** counter rather than normal skill XP. Grant practice only when the engine actually resolves a completed action:

`practice gained = the completed action's unmodified base duration in seconds`

For an ordinary action this is `SkillAction.intervalMs / 1000`; for a resolved Heist room it is `HeistJob.roomMs / 1000`. Credit a room once when it resolves, including an alarm outcome after the work was performed; ending the job or collecting the payout grants no second credit. An interrupted or abandoned action that never resolves grants none.

A completed gathering attempt still earns practice if its normal yield roll produces nothing. The work was performed; the mastery system must not add another failure roll. Blocked recipes, missing inputs, full-storage stops and failed starts do not grant completions or practice.

Important invariants:

- Output quantity, double-production procs, rare finds, item value, normal XP and materials conserved do not multiply practice.
- A batch grants its own nominal duration once, into the base recipe's track. Do not multiply that duration by the batch size again. Compare progress by nominal work, not raw output counts.
- Gear, Focus, Overtime, speed events and mastery speed can produce more completions per hour and therefore more practice. They do not multiply the practice award again.
- Normal XP events/bonuses do not directly multiply mastery practice. Explain this distinction in the tooltip; do not advertise it as another normal skill-XP track.
- Greenhouse only earns practice on actual background completions, at its effective production rate, through the same completion hook. No extra practice-per-second timer.
- No daily cap, login streak, real-world waiting period, time-of-day requirement or manual-only mastery bonus.

#### Progression curve

The displayed mastery cap is **100**, with **36,000 practice** needed to cap an action. One practice represents one second of nominal work, so this is ten hours of base-duration work, not a ten-hour real-time lock. Effective speed changes the actual time required.

Let `P` be stored practice and `C = 36,000`:

```text
progress = sqrt(clamp(P / C, 0, 1))
displayed level = min(100, 1 + floor(99 * progress))
practice threshold for displayed level L = C * ((L - 1) / 99)^2
```

| Displayed mastery | Approximate cumulative nominal work |
|---|---|
| 1 | Fresh action, no practice |
| 10 | 5 minutes |
| 25 | 35 minutes |
| 50 | 2 hours 27 minutes |
| 75 | 5 hours 35 minutes |
| 100 | 10 hours |

Bonuses use the continuous `progress` value, not milestone unlocks or the rounded displayed level. The first completion contributes immediately. After the cap, the action keeps working normally; extra practice is not banked for other actions, future caps or prestige purchases.

#### Automatic bonuses

All bonus channels are visible from the beginning and grow continuously. There are no rewards revealed or made usable only at levels 25/50/100.

| Action profile | Maximum bonuses | Restrictions |
|---|---|---|
| Ordinary gathering | +12 percentage points increased action speed; +8% expected ordinary primary yield | Explicit primary-output allowlist; no extra rare-drop rolls |
| Timed production | +12 percentage points increased action speed; up to 8% expected conservation of eligible ordinary ingredients | No extra equipment/gem/flask/map copies or stronger outputs |
| Heist jobs | +12 percentage points increased room speed | Does not lower alarms, unlock rooms or conserve entry currency |

At a given action's progress, multiply the listed cap by `progress`. Speed joins the existing increased skill-speed category rather than becoming an additional uncapped more multiplier. Apply only the active action's own mastery. Copper mastery must not improve Mithril mining, smelting, combat or an entire profession.

Use explicit per-action data to identify eligible ordinary outputs and ingredients. Do not infer eligibility merely from a suffix or from an item having a price. Suggested gathering candidates are the primary ore/log/herb, ordinary Artifact quantities and ordinary stolen Gold. Ordinary production inputs can include ores, logs, herbs, bars, planks, rough gems, ink and vellum where the recipe permits them.

Protected quantities include rare bonus finds, Uniques, fossils, Essences, Orbs, Seals/Wax, Boss Trophies, keys, Rogue's Markers used for admission, map inputs, Doom Sigils and future chase components. Mastery does not add rolls for these, conserve their required costs, change a drop pool or improve generated affixes, quality, item level or gem requirements. A recipe with no eligible ordinary input receives speed only.

The gathering yield bonus applies to the ordinary base quantity after a successful base-yield roll. It does not duplicate the complete result after Motherlode, extra-production procs, rare secondary rolls or other multipliers.

For integer resources, use stochastic rounding: an extra expected quantity of `0.08` means an 8% chance of one additional eligible unit. For ingredient conservation, calculate the expected saving from the eligible cost remaining after existing rules, round it stochastically, and clamp it between zero and that actual cost. Check affordability through the existing action rules; potential future savings cannot finance a start. Refund mechanics may return only resources actually paid, never mint an extra ingredient from a free/conserved use.

This initial tuning gives an unmodified gathering action at most about 21% additional ordinary throughput at cap (1.12 speed × 1.08 yield). Existing increased-speed investment lowers the relative speed gain. Revalidate alongside the skilling tree, events, double-production effects, salvage and market prices; this estimate is not permission to raise every resource's output blindly.

#### Ownership, persistence and recovery

Mastery is **character-owned**, matching existing non-combat skill levels. Shared realm bank/stash resources do not share mastery. No realm-wide mastery pool, point spending, transfer to another action or reward for maxing the whole catalogue.

Character state:

```ts
skillingMastery: Record<string, number>; // stable mastery-band id -> accumulated practice
```

Missing entries mean zero. A migration supplies an empty record and preserves all current progression, access and resources. Do not estimate past action practice from overall skill XP or lifetime production totals: they do not identify what was actually trained. Keep stable ids and explicit rename mappings; treat unknown stored ids as inactive data rather than granting a different action a bonus.

Persist the counter with the character and use the existing character save/conflict rules. Do not sum two device snapshots of the same counter on load, import or reconciliation. Restores restore the character's recorded mastery; sandbox copies remain memory-only. A Hardcore character loses its mastery with its other character progression on death. SSF uses its own character's counters. Classic has no eligible non-combat actions and receives no mastery benefits.

This remains client-simulated progression with the game's existing trust limitations. A mastery counter is not server proof that an item or currency was legitimately earned.

#### Live, offline and interface behavior

Live play, offline catch-up, background Greenhouse and auto-repeat must call the same completion/award logic. The same completed work earns the same practice in each route. Offline caps and material/storage stops remain unchanged. Clamp practice at the cap and validate finite, non-negative values; do not loop once per second merely to award practice.

On an action/recipe card, show its mastery level, a compact next-level bar and its current bonuses separately from profession XP. A tooltip explains the identity, what counts as work, all possible bonus channels and any protected inputs/outputs. Bulk variants show the same underlying mastery and explain how practice is credited. Locked recipes may show their ordinary access requirements; never display a mastery requirement.

Avoid a toast for every mastery level during long idle runs. Aggregate meaningful changes into offline summaries and an optional activity-log entry. A capped action remains runnable and productive. Existing profession pages should host this information; a new tree, currency shop or mandatory management screen is unnecessary.

#### Implementation work and acceptance criteria — completed 2026-11-07

- [x] Inventory eligible non-combat actions/jobs; assign explicit stable band ids, batch aliases and bonus profiles/allowlists; the shipped inventory contains 67 identities.
- [x] Add pure progression/bonus calculations, a character save migration and completion-hook practice awards.
- [x] Integrate action-specific speed, ordinary yield and ingredient conservation without changing baseline access or item-generation rules.
- [x] Integrate Heist rooms, Greenhouse, auto-repeat, offline summaries, save/import/recovery and sandbox behavior.
- [x] Add compact action-card UI and explanatory tooltips; update the current reference when the mechanic is implemented.
- [x] Verify no content-access check reads mastery; zero-mastery characters retain today's baseline and existing unlock paths.
- [x] Verify combat/gem/weapon/kill paths never grant mastery or read its bonuses.
- [x] Verify every eligible action has exactly one valid band, generated Smithing bases cannot create new tracks, single/batch aliases share bands, and resolved Heist rooms, empty-yield gathering, cancellation, resource/storage stops and double-production cannot duplicate credit.
- [x] Verify equal completed work online/offline, protected inputs/outputs, integer rounding, refund safety, caps, malformed saves and non-additive device reconciliation.
- [x] Measure initial resource inflation, production economics and progression: an unmodified Ash loop produces 1,252 logs in its first hour (+4.3%) and 10,818 over eight hours (+12.7%), remaining below the roughly 21% capped ordinary-throughput ceiling. Eight-hour Copper and Mithril smelting runs each gain 7.3% output while consuming about 4.75 rather than 5 ore per bar; both reach about 30,915 of 36,000 practice.

The implementation passes the full 1,261-test suite and production typecheck. No mastery-gated content should be added in future expansions.

### Maps skill batch: local implementation in progress

- [ ] Verify all 40 active gems, signatures, 40 supports, Maps gating and UI/shop availability against `src/data/gems.ts` and engine behavior.
- [ ] Finish Marks, Warcry scaling, Totems, Doom, Exertion, chaos bypass/poison and their supports/rules; mere presence of fields/data is insufficient.
- [ ] Verify every support's stated effect and formula, targeting, expiry, cooldown/cost rules, minion/totem distinction, boss interactions and offline behavior.
- [ ] Resolve failing Maps-skill tests and update art/wiki before release. Do not mark this complete using ordinary combat tests alone.

The consolidated batch specification is retained below as a proposal. Its initial 1.3× attribute wording is superseded by the 0.4.1 attribute rebalance (demanding gems use 1.15×); use code for actual requirements. Its suggested `'maps'` gating/API names are design intent, not existing API contracts. Definitions that conflict with current data require review rather than silently changing gameplay.

## Other open items

- [x] Write and review the non-combat band-mastery design, with no mastery-gated unlocks, no more than 100 authored identities, proposed progression/bonuses, persistence/offline behavior and acceptance criteria. The later implementation is recorded separately below. — done 2026-11-06
- [x] Implement non-combat band mastery across timed life skills, Heists, Greenhouse, offline progress, persistence and action-card UI with 67 stable bands and bounded ordinary bonuses; full suite passes. — done 2026-11-07
- [x] Massive unique items, flasks, and maps pass: reworked stat-stick uniques (`barnacle_band`, `khans_tithe`, `pyre_heart`, `starforged_edge`, `unblinking_tome`, `fishermans_knot`, `the_unwritten`, `architects_compass`, `sovereigns_grasp`, `faultline`, and boss/cycle uniques) with signature mechanics; added 12 Ascendancy BIS uniques, 22 Life-Skill uniques (2 per profession), 6-piece Master Artisan set, 6-piece Wanderer's Heirloom leveling set, 3 Gold-Find uniques, 5 Unique Flasks (`u_flask_karui`, `u_flask_lavianga`, `u_flask_lions_roar`, `u_flask_bottled_faith`, `u_flask_dying_sun`) with `enemyRanged`/`packStart` Instill conditions, and 5 Unique Maps (`umap_vaults`, `umap_cowards_trial`, `umap_olmecs`, `umap_maelstrom`, `umap_grandmasters`). — done 2026-11-07
- [x] Overhaul Admin with campaign/demo/death diagnostics, searchable player inspection and audited recovery/compensation, feedback snapshots/replies/filtering/sandbox, and configurable live events/broadcasts. Database migration and frontend verified locally; service installation/deployment remain separate. — done 2026-11-06
- [x] Apply updated market/admin SQL in Supabase. Owner confirmed both ran; live Admin overview/player/feedback RPCs and backup/mail/audit tables refuse anonymous requests. — done 2026-11-06
- [ ] Upload current validation rules and verify real-account Admin inspection, backup restore, mail/compensation and scheduled events against the updated frontend. Backups/snapshots are not retroactive; frontend deployment remains pending.
- [ ] Confirm Google OAuth secret revocation for GitHub alert 2 (historical `docs/AUTH_SETUP.md`, commit `4ba2852afe62`); rotation status unknown. Follow SETUP without placing credentials in git/chat.
- [ ] Confirm the separate `is_admin` / `admin_stats` lookup-path ALTER statements in SETUP were applied; perform signed-in cross-account/admin isolation and fresh provider login checks. Market/admin file execution is confirmed; local and anonymous tests do not replace signed-in verification.
- [x] Audit public source/history and available Actions exposure; enable GitHub secret scanning/push protection and implement offline-compatible market/build hardening. Findings and rotation playbook live in DEVELOPMENT/SETUP; pending service actions remain unchecked above. — done 2026-11-05
- [x] Rebalance area-level combat XP with a two-level grace band and capped bonus/penalty milestones; update labels, calculator and tests. — done 2026-11-05
- [x] Give monsters distinct player-style damage/defence archetypes while preserving reference effective hit pools and damage budgets; verify campaign, map, rarity and save behavior. Unreleased; remaining combined-worktree failures are recorded below. — done 2026-11-05
- [x] Consolidate and audit game documentation; replace 40 internal/reference documents with five, preserve published wiki URLs and validate links/generated pages. — done 2026-11-05
- [ ] Player report: roughly two hours of one signed-in character's progress disappeared. Audit local saves, uploads and merge/transfer reconciliation before changing save behavior.
  - Static audit and all 1,250 tests pass on 0.4.4. Two credible rollback paths remain: a browser-storage write failure currently prevents that cloud save attempt from starting, and simultaneous devices can unconditionally replace the same character row with a stale progression snapshot carrying a newer client timestamp. Neither identifies the reported incident without affected-account save/backup timestamps and two-device reproduction.
- [x] Player report: Templar appears to encounter fewer enemies. Pack/arrival logic is class-independent; 10-seed fixed-area simulations showed comparable incoming hit flow, while kill rates varied with build damage. Templar completed Act 6 in 16h43 in the integrated whole-journey seed. — done 2026-11-06
- [ ] Player report: Twin Strike hits from four tiles away. Audit melee range and closing-in; evaluate melee-only/approach tactics request.
- [ ] Verify Mana is Power display with Overflow after the spending-window change.
- [ ] Recheck Warrior/Templar weapon progression, class pacing, high-level Poison Dart scaling and defensive gearing on current code. Old simulations disagree because systems and bots changed.
  - 0.4.4 audit: Warrior/Duelist/Templar/Shadow finished Act 6 in 15h13–19h16 in the all-class seed. Across three Ranger seeds, the median reached late Act 6 but the day-one stage range was 5–70, with Act 1 taking a median 12h54. Across three Mage seeds, the median stalled at level 43 in Act 4 with 195 deaths; the stage range was 29–70. Do not tune from the single successful seeds or lock new progression features until the bot/loadout failures and seed spread are isolated.
- [ ] Real accounts: email sign-up/reset/confirmation, guest carryover, two-device save/realm behavior and Player Market buy/bid/delivery recovery. Verify current Admin → Market rules upload after content changes; no assumption that an old checklist proves current service state.
- [ ] Player wiki references/guides for trees, runes, flasks, side systems, meals, greenhouse, loadouts, challenge realms, market recovery and Maps. Generated tables currently cover only part of these topics.
- [ ] Deeper recovery runbooks for cloud conflicts, duplicate-tab transfers, market holds and deliveries. Verify code and actual service behavior.
- [ ] Art: proper area landscapes, weak stand-ins, reused gem icons and outstanding weapon artwork. Inspect current manifest before quoting old missing-art counts.
- [ ] Owner checks: guide tone, Town prices/readability, campaign/Map Device UX. Keep Act 1 cold-check/scorch changes parked until requested; the prior decision did not authorise an unsolicited rebalance.

## Ideas / later

- Ascendancy-granting chase gear and other items that bend tree connections; no hard node-count cap.
- More life-skill bands/recipes, Gemcutting force materials and Fletching. Authored band mastery now has the bounded design above rather than remaining an unspecified idea.
- Improved auto-crafting/Seals integration, richer loot/sell filters and later crafting beyond current modifier limits.
- Expanded Unique collection organization, achievements presentation, side-feed revisit and clearer player ailment overlays.
- Per-gem setup/priority workflow, meaningful specialized support restrictions and more contextual tactics.
- Wiki pages for individual materials/modifiers, tooltip deep links and entry-specific history if useful.
- Audit follow-ups (2026-11-06), not acted on: Hair Trigger as specced (crit refills Exertion) plus a guaranteed Exerted crit would loop forever; the code currently has no guaranteed crit and Hair Trigger is description-only, so fix the spec before building it. Also consider: 8s base Mark duration; Act 5 channel bosses' auto timeouts (Hollow Reef, Maelstrom's Eye), possibly by reserving a stun skill's cooldown for its Wind-up rule; Mage Act 1 stall and slow Warrior campaign; an emergency-only floor for unenchanted flasks.
- Reassess legacy partial stock/cross-device issues, storage-full UI handling, Hardcore resurrection from old copies and loadout partial failures before claiming them fixed.
- Endless post-Maps content and cosmetic shop remain ideas, not scheduled features.

## Done

- [x] Split the character passive tree into Travel, Passive, and Mastery point economies, including tiered allocation/refund costs, PoE-style mastery prerequisites and uniqueness, Act-boss awards, and Cosmic Gateway bridge activation. — done 2026-11-07

- [x] Massive unique items, flasks, and maps pass implemented: reworked existing stat-stick uniques (`barnacle_band`, `khans_tithe` bank-gold crit scaling, `pyre_heart` slow-burn spreading ignites, `starforged_edge` physical shock & no elemental damage, `unblinking_tome` burning spell flare & cannot evade, `fishermans_knot` utility flask pull/snare & `enemyRanged`/`packStart` Instilling conditions, `the_unwritten` off-class Ascendancy notable rolling & Divine Orb rerolling, `architects_compass` every 4th spell double repeat at 0 mana, `sovereigns_grasp` extra Chaos vs Ailing & Wither, `faultline` Slam armour crack & 30% physical mitigation bypass, plus enhanced boss/act-cycle uniques); added 12 Ascendancy BIS uniques, 22 Life-Skill uniques (2 per profession integrated with `skillTreeStats`), a 6-piece Master Artisan set, a 6-piece Wanderer's Heirloom leveling set (reqLevel 1), 3 Gold-Find uniques (`gulls_eye`, `merchants_signet`, `greeds_vault`), 5 Unique Flasks (`u_flask_karui`, `u_flask_lavianga`, `u_flask_lions_roar`, `u_flask_bottled_faith`, `u_flask_dying_sun`), and 5 Unique Maps (`umap_vaults`, `umap_cowards_trial`, `umap_olmecs`, `umap_maelstrom`, `umap_grandmasters`) in the Map Case and Map Device; `docs/UNIQUES.md` regenerated and unit tests verified. — done 2026-11-07
- [x] Non-combat action mastery implemented: 67 stable character-owned work bands, nominal-duration practice to level 100, bounded speed/ordinary-yield/input-conservation bonuses, shared live/offline/Greenhouse/Heist completion hooks, save migration, offline summary and compact action-card UI. Protected rare/chase resources and all existing access rules remain unchanged; 1,261 tests and typecheck pass. — done 2026-11-07
- [x] Unique items overhaul implemented: campaign unique drop pools scaled by zone depth, starting with exactly 1 unique (`castaways_kerchief`) in the Mud Flats; class-specific trait uniques (Rage, Malice, Fervor, Riposte, Momentum, Mana is Power) moved to mid-to-late campaign zones and maps; flat numerical modifiers feature roll ranges that can be rerolled using Divine Orbs (with items having only fixed mods blocked from Divine use); `last_breath` adds 1–4 extra Malice per hit; thematic downsides added to select powerful uniques (`bloodthirst`, `emberheart`, `alchemists_band`, `tavern_brawler`, `starforged_edge`, `titans_girth`, `stormhide`, `thornquill`, `wellspring`, `rebuttal`, `ninth_psalm`, `oathbreaker`, etc.); Alt inspection shows roll ranges; PostgreSQL market validator updated for unique roll ranges; `docs/UNIQUES.md` regenerated; unit and security tests pass. — done 2026-11-06
- [x] Skilling-tree specialisation pass: cap the tree at 36 points earned per ten total life-skill levels, replace the unusable Fishing branch with Gemcutting, refund existing allocations safely, apply life-skill speed events to Heists and Overtime to offline Greenhouse growth, and cover the new invariants with focused tests. — done 2026-11-06
- [x] Non-combat band-mastery design documented in this roadmap: bonus-only, no mastery-gated content, no more than 100 explicitly authored bands, proposed practice curve and modest automatic rewards, exclusions, offline/save/UI behavior and implementation acceptance criteria. This records the 2026-11-06 design milestone; implementation followed on 2026-11-07. — done 2026-11-06
- [x] Maps redesign implemented (Milestone 8): plain shared maps T1–T10 (`s.account.maps` synced with `s.maps.stock`, migrating legacy themed maps by tier) borrowing random campaign area visuals and boss mechanics; Act 6 level 60+ campaign map drops and Last King 5-map top-up; permanent tier-group danger and reward identities (T3–4 elite packs, T5–6 twin boss with shared Life, T7–8 boss ground hazards, T9 permanent enrage, T10 pinnacle combining all three, plus tier-specific unique pools and currency emphasis); Apprentice/Journeyman/Master Sextants with up to 4 Astrolabe slots and 6-charge Danger/Reward/Both/Hunting modifiers; realm-shared 100-node connected Atlas Tree with up to 70 allocated points across Sustain, Bounty, Surveying and Peril wings, including Unbroken Path and Doomed Horizon keystones; Doomed Maps I–V (levels 86–94, 7 Doomed modifiers, Fractured Orb and Uber Key drops); Cartography T1–T10 map and Sextant recipes; and a dedicated Map Device page (`src/ui/pages/MapDevicePage.tsx`). Atlas and Maps tests pass; `docs/UNIQUES.md` regenerated. Unreleased. — done 2026-11-06
- [x] Fractured items and Fractured Orbs implemented (Milestone 10A): Fractured Orbs lock one random modifier permanently on rare items with 4+ modifiers; scoured fractured items reduce to a 1-mod Magic item retaining the fractured affix; Annulment cannot remove fractured modifiers; Chaos and Alteration rerolls preserve fractured modifiers; Ancient Whetstones cannot hone fractured modifiers; Locksmith's Wax snapshots and restores fractured status; golden styling in tooltips and Bench page integration. All 9 focused fractured crafting tests pass. — done 2026-11-06
- [x] Bench Level 6 and meta-crafting implemented (Milestone 10B): Bench station Level 6 upgrade added with meta-crafting perks; "Prefixes Cannot Be Changed" (suffix craft, 2 Divine + 500 Arcane Dust), "Suffixes Cannot Be Changed" (prefix craft, 2 Divine + 500 Arcane Dust), and "Multicraft" (suffix craft, 2 Exalted + 400 Arcane Dust); Scour, Chaos, Annul, Divine, and Alteration operations preserve locked affix pools; Multicraft allows up to 3 crafted modifiers; "Remove crafted" action (1 Scour) strips all crafted modifiers; Forger's Seal auto-crafting support (sealed parameter in CraftMethod); all unit tests pass. — done 2026-11-06
- [x] Post-campaign station expansions and Stash affinities implemented (Milestone 10C): Map Device Level 5 (+50% Rarity, +2 ilvl, 4th Sextant slot) and Level 6 (Pinnacle Conduit: +2 base Sextant charges, +15% map/key boss bonus); Stash Level 5 (Dedicated Map Storage Tab) and Level 6 (+2 free pages, 8 total); Forge Level 5 (Pinnacle Metallurgy: ilvl 84 cap, +8 ilvl bonus, 10% T1 affix roll); Alchemy Table Level 5 (30% double brew chance, 3:1 orb conversions); Watchtower Level 5 (Autonomous Offline Mapping, 36h cap); Trophy Altar station (Levels 1–4, account-wide Armour/Evasion, Mana regen, all Res, and item Rarity); baseline Act 1 Stash Affinities routing maps, gear, flasks, gems, and currency to designated tabs. — done 2026-11-06
- [x] Pinnacle crafting, Uber Bosses, and Doom Sigils implemented (Milestone 10D): The First Exile (L90, Crucible) dropping Exile's Doom Sigil (elevates 1 random Tier 1 affix to Tier 0 Doom tier with +30% values); The Architect of Ruin (L93, Ruined Sanctum) dropping Architect's Doom Sigil (imbues 1 Doom Implicit); The Void Sovereign (L96, Void Throne) dropping Void Sigil (unlocks 7th modifier slot on 6-mod rare items); Bench Level 7 Pinnacle Crafts ("Cannot roll Attack Modifiers", "Cannot roll Caster Modifiers"); full lock and impression preservation. All 45 focused crafting, hideout, and pinnacle tests pass. — done 2026-11-06

- [x] Owner confirmed market/admin SQL applied to Supabase; anonymous requests are denied for new Admin overview/player/feedback functions and backup/mail/audit tables. Frontend remains unreleased; signed-in checks and current rules upload remain pending. — done 2026-11-06
- [x] Admin overhaul implemented: normalized class counts/contiguous levels, campaign funnel/death/demo diagnostics, paginated search including retained deleted characters, server receipt timestamps, raw save inspection, ten restore points and audited idempotent recovery to new characters; feedback snapshots with verified account links, version/type filters and bulk resolve; private replies/compensation inbox (including no-trade Unique replacements); temporary memory-only sandbox; custom modifier events, broadcasts/status/countdowns and offline schedule boundaries. All 88 focused Admin/event/market checks and mocked desktop/mobile browser flows pass; Vite production bundle and wiki generation pass. Full suite: 1,180 pass / eight known failures from other work; typecheck retains only the existing `Derived.moveSpeed` test error. SQL is prepared, not applied live; unreleased. — done 2026-11-06
- [x] Public repository security pass: GitHub scanning/push protection enabled; local default scan augmented to detect the confirmed historical Google OAuth secret; working-tree and available Actions-log scans found no additional secrets. Market rejects null/invalid payments and duplicate local holds, limits successful paid operations, explicitly restricts database grants and pins privileged lookup paths. Vite rejects unreviewed/privileged browser configuration. All 67 focused security/market tests pass; full suite 1,152 pass / eight existing failures; typecheck retains only the existing `Derived.moveSpeed` test error. Live anonymous probes expose no private rows. Offline trading preserved; secret revocation, SQL application and signed-in live checks remain pending. Unreleased. — done 2026-11-05
- [x] Area XP now stays neutral within two levels, rewards harder enemies up to +20% and penalizes easier enemies no further than −70%. The penalty was refined to a rounded quadratic curve, with increasingly harsh losses from three to ten levels. Updated player labels, farming guide and bounded wiki calculator sampling/fallback so capped XP cannot hang generation or become zero in the calculator. Four band/label tests and 50 engine/Act 1 tests pass; wiki generation and calculator syntax pass. Unreleased. — done 2026-11-05
- [x] Monster identities implemented across campaign and Maps: creature profiles, Armour/Evasion/block, Life/ES, elemental/chaos attacks, crits, ailments and varied basic attack intervals. Reference EHP and raw DPS conservation cover every monster, boss, packed copy and combined rarity modifiers. Eleven profile tests and campaign/Maps/offline checks pass; wiki generated. Full suite: 1,140 pass, eight pre-existing failures (Act 2 gem gating/shop, Deathblow timing, Act 5 channel comparison, Primal Roar cooldown metadata, Void Pact hit tag, Mark expiry and gem counts). Typecheck still fails at the pre-existing `tests/mechanics.test.ts:57` movement-stat assertion. Skill-isolation dummies explicitly omit defences; Frostbite integration compares freeze rate per exposure and aggregate survival. Unreleased. — done 2026-11-05
- [x] Documentation consolidated into GAME, DEVELOPMENT, MILESTONES, SETUP and generated UNIQUES; stale act/pacing/preview claims removed, future specifications/provenance retained, player-wiki factual errors corrected and remaining guide gaps recorded. Internal links and wiki generation pass; art/unique checks pass. Full typecheck remains blocked by the pre-existing `Derived.moveSpeed` test error. Unreleased. — done 2026-11-05
- [x] Default flask automation removed locally; unenchanted flasks require manual use and automatic use requires Instilling. Relevant tests pass; unreleased. — done 2026-11-05
- [x] 0.4.2 Smarter Foundations live: baseline survival rules, refined-component station costs, recent-spending Mana, Momentum losses/Evasion, Field Tinkering, postures, Mana reservation and UI scaling. — done 2026-11-05
- [x] Doc/balance audit fixes: flat Momentum keeping (1 stack per source, min 1; old uniques safe), Mana is Power unique text corrected, Doom 4s decay grace, warcries weight rarer enemies/bosses (1/2/3/5), Brand of Ruin cost typo, The Old Covenant source noted in GAME. New tests pass; UNIQUES regenerated. Full suite still shows the same eight pre-existing failures and `moveSpeed` typecheck error. Unreleased. — done 2026-11-06
- [x] 0.4.1 gem attribute requirements relaxed; 0.4.0 character and ascendancy trees rebuilt, compact travel, four trials and no milestone-specific node locks. — done 2026-11-04
- [x] Six acts and branching roads, themed T1–T10 Maps, side skills, runes, meals, loadouts, challenge modes, Player Market, account stash and generated wiki implemented. Earlier release-by-release detail lives in NEWS/git, not a second changelog.

## Retained Maps skill design

This section preserves the unreleased batch's detailed design while eliminating its standalone document. Read the status/corrections above before implementation.



**Design pass: 2026-11-04.** 40 skill gems + 40 support gems, all unlocking when Maps open (after Act 6 clear). Five
new mechanics, each with 8 skills and 5 dedicated supports, plus 15 general supports. 15 of the 40 skills deal
chaos damage.

**Chaos damage rules (new):** bypasses energy shield (hits life directly), resisted by chaos resistance, has a
chance to poison on hit. These properties require engine work: combat.ts must skip ES when the hit's type is `chaos`,
and the poison chance must hook into the ailment system.

**Gem levels:** 66 / 70 / 74 / 78, four tiers. Demanding gems use the current 1.15× attribute multiplier; the original 1.3× proposal is retired.

**GEM_ACTS key:** `'maps'` — gate is any Map zone open (`mapOpen(s)` or similar; check `s.maps` stash).

---

### Group 1: Marks

A Mark is attached to one target by a Mark skill. All subsequent hits on that target add 1 Mark stack regardless of
skill used (max 5). When stacks hit 5, the Mark detonates automatically for the Mark's specific burst effect and
clears. Mark duration: 6s, refreshed on each stack. A target holds one Mark at a time; applying a new one replaces the
old regardless of its stacks.

New mechanic needed:
- `markKind` on `ActiveGemDef.effect` — the type of mark applied. Using such a skill sets `s.combat.monsters[i].mark`.
- Each hit on a marked monster increments `mark.stacks`; at `mark.maxStacks` (default 5) the detonation fires.
- Detonation is handled in `combat.ts` using the Mark's stored burst parameters.

| Skill | Attr | Role | Lvl | Chaos? | Does | Signature (+6) |
|---|---|---|---|---|---|---|
| **Brand of Ruin** | int | main | 66 | ✓ | 15 mana · 0CD · 3000ms · apply Brand of Ruin mark (5 stacks, bursts for 80–120 chaos, poisons) | **Corrosion:** burst strips 20% chaos resistance for 4s |
| **Scorched Brand** | int | burst | 68 | | 18 mana · 4s CD · 3000ms · apply Scorched Brand (5 stacks, bursts for 100–150 fire in radius 1) | **Flash Point:** burst ignites for 5s |
| **Sunder Mark** | str | main | 66 | | 16 mana · 0CD · 3600ms · 160% weapon + apply Sunder Mark (5 stacks, bursts for 200% weapon to all neighbours) | **Exposed:** burst breaks armour |
| **Void Brand** | int | area | 70 | ✓ | 24 mana · 5s CD · 2400ms · apply Void Brand (5 stacks, bursts for 60–90 chaos to all enemies) | **Nihil:** targets hit have −15% chaos res for 6s |
| **Fracture** | dex | main | 66 | | 8 mana · 0CD · 2400ms · 100% weapon + apply Fracture Mark (5 stacks, bursts for 80% to all in radius 1) | **Shatter:** burst stuns all hit for 1s |
| **Marked for Death** | dex | curse | 68 | | 12 mana · 10s CD · 1500ms · curse; enemies take 25% more damage from all sources and Marks on them burst at 4 stacks | **Execute:** marked+cursed enemies burst at 3 stacks |
| **Shadow Mark** | dex | main | 70 | ✓ | 10 mana · 0CD · 2700ms · 90% weapon, converts 50% to chaos + apply Shadow Mark (5 stacks, bursts for 40–60 chaos, poisons) | **Venom Brand:** burst poison lasts 4s longer |
| **Martyrdom Brand** | str | guard | 74 | | 15 mana · 10s CD · 1500ms · shield of 35% life for 5s; every hit you receive adds 1 stack to attacker's Mark; at 5 stacks the shield retaliates for 300% the damage absorbed | **Payback:** retaliation hits the whole pack |

---

### Group 2: Warcries

Warcries have a proposed 1500ms cast time, cost 0 mana, have their own cooldown (5–10s), and
empower the caster based on the number of enemies in combat. No new engine mechanic: "enemies in combat" is
`s.combat.monsters.filter(m => m.life > 0).length`, readable at cast time. Effects go into the existing buff system.

No new engine type needed beyond reading enemy count at cast. The `warcryPower` = clamped enemy count (1–5 or 1–8
depending on the skill). Implemented as a weighted count (`WARCRY_WEIGHT` in `combat.ts`): normal 1, magic 2, rare 3,
unique/boss 5, so a lone boss still fills most of a warcry.

| Skill | Attr | Role | Lvl | Chaos? | Does | Signature (+6) |
|---|---|---|---|---|---|---|
| **Battle Cry** | str | buff | 66 | | 0 mana · 6s CD · 1500ms · 4s buff: 25% more damage per nearby enemy (max 5 enemies = +125% more) | **War Drum:** also grants 8 Rage per enemy nearby |
| **Rallying Cry** | str | sustain | 68 | | 0 mana · 8s CD · 1500ms · recover 5% life per nearby enemy (up to 5 = 25% life instantly) | **Second Wind:** also recovers 10% mana per enemy |
| **Hunter's Call** | dex | buff | 66 | | 0 mana · 5s CD · 1500ms · 4s buff: 8% attack speed per nearby enemy, max 5 (max +40%), grants Momentum equal to enemies nearby | **Pack Rush:** also grants 20% increased evasion |
| **Intimidate** | str | curse | 70 | | 0 mana · 8s CD · 1500ms · for 6s, all combat enemies take 15% more damage and have 10% less attack speed | **Dread Shout:** effect scales: +3% more damage per enemy in combat |
| **Ancestral Call** | str | summon | 72 | | 0 mana · 10s CD · 1500ms · summon 1 Ancestor spirit per 2 enemies nearby (max 3) for 8s; each deals 50% of your weapon damage | **Forebears:** Ancestors also deal 20% of their damage as fire |
| **Dark Howl** | int | buff | 70 | ✓ | 0 mana · 8s CD · 1500ms · for 6s: spells have a 15% chance per nearby enemy (max 5×15%=75%) to deal their damage as chaos instead (bypasses ES, same total damage) | **Void Voice:** chance to poison when chaos conversion triggers |
| **Death Rattle** | dex | area | 74 | | 0 mana · 6s CD · 1500ms · for 4s, your next kill causes the corpse to explode for 20% of its max life as physical to all; scales with enemies nearby (×enemy count, max 5×) | **Carnage:** the explosion chains once to the nearest enemy |
| **Primal Roar** | str | area | 74 | | 0 mana · 10s CD · 1500ms · deal 100% weapon damage to all enemies and stun them for 0.5s per enemy nearby (max 2.5s), gives 10 Stagger on bosses | **Primal Force:** stun also applies −20% damage for its duration |

---

### Group 3: Totems

A Totem is placed at the player's position (front ring of the battlefield), fights autonomously with its own attack,
has its own life pool, and lasts 20s or until destroyed. One totem active at a time by default. Auto-rule: "When totem
count is below 1, place it" (similar to minions).

New engine needs:
- Totems live in a `s.combat.totems[]` array (like `s.combat.minions[]`).
- Each has `life`, `maxLife`, `gemId`, `attackMs`, and fires its own attack tick.
- Totem attacks use the player's spell/attack damage stats scaled by a `totemEfficiency` multiplier (0.6 by default).
- When a Totem dies, `s.combat.totems` shrinks; the bot places a new one when rules allow.
- `totemCount` rule condition for automation.

| Skill | Attr | Role | Lvl | Chaos? | Does | Signature (+6) |
|---|---|---|---|---|---|---|
| **Flame Totem** | int | summon | 66 | | 15 mana · 12s CD · 1500ms · place Flame Totem (20s, fires 12–18 fire every 1.5s at nearest enemy) | **Pyre Totem:** totem also causes burning ground, 2 fire/s to all enemies |
| **Ice Totem** | int | summon | 68 | | 15 mana · 12s CD · 1500ms · place Ice Totem (20s, fires 10–16 cold at 1.5s, chills) | **Blizzard Totem:** on death or expiry, explodes for 60–90 cold in radius 2 |
| **Storm Totem** | int | summon | 70 | | 15 mana · 12s CD · 1500ms · place Storm Totem (20s, calls 6–24 lightning to random enemy every 1s, chains once) | **Tempest Totem:** chain hits a second enemy for 50% |
| **War Totem** | str | summon | 68 | | 18 mana · 12s CD · 1500ms · place War Totem (20s, attacks for 100% physical at 2.5s, single) | **Battle Totem:** each kill by this totem grants you 1 Rage |
| **Shadow Totem** | dex | summon | 70 | | 15 mana · 12s CD · 1500ms · place Shadow Totem (20s, attacks for 70% at 1.8s, alternates between nearest two enemies, poisons each hit) | **Venom Totem:** poison stacks twice as fast (applies 2 poison on each hit) |
| **Siege Totem** | str | summon | 72 | | 20 mana · 15s CD · 1500ms · place Siege Totem (25s, fires for 160% physical at 4s, 50% stun, hits in a line through the target) | **Long Siege:** line extends one more ring, hits one additional enemy |
| **Chaos Totem** | int | summon | 74 | ✓ | 18 mana · 12s CD · 1500ms · place Chaos Totem (20s, fires 10–18 chaos at 1.5s, 20% poison chance; totem attacks bypass ES) | **Corruptor:** totem applies −15% chaos resistance to enemies it hits for 4s |
| **Void Totem** | int | summon | 76 | ✓ | 22 mana · 12s CD · 1500ms · place Void Totem (20s, fires 15–25 chaos at 2s, 30% poison chance; on each attack has 20% chance to drain 5% life from target as chaos and restore it to you) | **Soul Siphon:** drain chance rises to 40%, restores mana too |

---

### Group 4: Doom

Doom is a stacking debuff on each enemy. Every hit adds 1 Doom (max 20). When Doom reaches 20, it detonates
automatically, dealing a large chaos burst and clearing the meter. Doom holds for 4 seconds after a Doom hit, then decays at 1 per second when not receiving
new hits from the player. Specific Doom skills add more Doom per hit or read the meter for scaled damage.

New engine needs:
- `doom` counter on each `CombatMonster` (0–20).
- Every hit increments `doom` by 1 (or by the skill's `doomPerHit` override).
- At 20: fire a doom burst (chaos damage, bypasses ES, based on `DOOM_BURST_BASE` scaling with monster level).
- Decay: Doom holds for 4 seconds after the last Doom hit (`DOOM_GRACE_MS`), then `doom -= 1` each second. The grace lets 2.4–3.6s casts like Entropy and Doom Bolt build to 20 on one target.
- `doomLevel` rule condition (e.g. "when doom above 10").

| Skill | Attr | Role | Lvl | Chaos? | Does | Signature (+6) |
|---|---|---|---|---|---|---|
| **Doom Bolt** | int | main | 66 | ✓ | 15 mana · 0CD · 3000ms · 20–35 chaos, single; adds 2 Doom (double rate) | **Accelerant:** target with 10+ Doom takes 20% more from this skill |
| **Void Blast** | int | area | 70 | ✓ | 28 mana · 5s CD · 2400ms · 50–80 chaos, all enemies; adds 3 Doom to all | **Cascade:** if any target had max Doom, its burst propagates 2 Doom to all neighbours |
| **Doom Strike** | str | main | 68 | ✓ | 10 mana · 0CD · 3600ms · 150% weapon, 50% converted to chaos; adds 2 Doom | **Cursed Blow:** physical portion also adds 1 Doom |
| **Entropy** | int | main | 66 | ✓ | 12 mana · 0CD · 2400ms · 15–25 chaos, single; adds 1 Doom. Fast spam skill | **Accelerate:** Doom decays 50% slower while this is on the bar |
| **Doomsday** | int | burst | 76 | ✓ | 40 mana · 10s CD · 3000ms · instantly triggers Doom burst on current target regardless of meter level; burst is 50% more powerful per 5 Doom the target had | **Last Rites:** enemies above 15 Doom receive 150% more from the burst |
| **Cursed Arrow** | dex | main | 68 | ✓ | 8 mana · 0CD · 2700ms · 90% bow attack, 40% converted to chaos; adds 2 Doom; 20% poison chance | **Marked Arrow:** at 10+ Doom, the hit poisons for double duration |
| **Shadow Pact** | dex | buff | 72 | | 15 mana · 10s CD · 1500ms · for 6s: you gain 2% more damage for each point of Doom on current target (max 40%) | **Dark Communion:** also gain 1% chaos resistance per Doom point for the duration |
| **Void Pact** | int | sustain | 74 | ✓ | 0 mana · 12s CD · 1500ms · consume all Doom on current target; heal 2% life per point consumed; if target had max Doom, also recover 20% mana | **Leech Dark:** also gain 1% ES recharge per Doom consumed |

---

### Group 5: Exertion

Exertion is a player-side charge counter (0–5). Every hit the player lands adds 1 Exertion. At 5 stacks, the
character is Exerted. The next time you use an Exertion-tagged skill while Exerted, it fires its powered version
and clears the stacks. Exertion decays at 1 per second when out of combat.

New engine needs:
- `s.combat.exertion` counter (0–5), cleared out of combat.
- Every hit increments it by 1 (or by skill's `exertionPerHit` override).
- Exertion skills check `s.combat.exertion >= 5` and branch to their powered version.
- `exertionFull` rule condition for automation (like `maliceFull`).
- Exerted skills reset `s.combat.exertion = 0` on use.

| Skill | Attr | Role | Lvl | Chaos? | Does | Signature (+6) |
|---|---|---|---|---|---|---|
| **Gut Punch** | str | main | 66 | | 8 mana · 0CD · 2700ms · 110% weapon, single; adds 2 Exertion. Exerted: 200% weapon + hits nearest other enemy for 50% | **Follow-Through:** exerted hit also stuns the second target for 1s |
| **Quickdraw** | dex | burst | 68 | | 12 mana · 5s CD · 2400ms · 200% bow/projectile. Exerted: 350%, guaranteed crit | **Hair Trigger:** any crit resets Exertion to 0 and immediately counts it as 5 again (ready instantly) |
| **Charged Strike** | str | main | 70 | | 10 mana · 0CD · 3300ms · 130% physical, 25% stun. Exerted: also stuns all nearby enemies for 1s, 10 Stagger | **Overexertion:** exerted version carries 2 stacks over (resets to 2, not 0) |
| **Void Surge** | int | main | 70 | ✓ | 18 mana · 0CD · 3000ms · 20–30 chaos, single; bypasses ES. Exerted: 150% more chaos damage + poisons | **Dark Surge:** exerted Void Surge also fires at the nearest second enemy for 50% |
| **Rend** | dex | main | 68 | | 8 mana · 0CD · 2400ms · 90% weapon, bleeds; adds 1 Exertion. Exerted: bleed lasts 3× longer and spreads to all enemies | **Hemorrhage:** exerted Rend also applies a fresh bleed to all nearby |
| **Void Wave** | int | area | 72 | ✓ | 16 mana · 3s CD · 3000ms · 20–30 chaos, all enemies. Exerted: fires twice in immediate succession | **Chain Doom:** exerted hits add 2 Doom to all enemies hit |
| **Soul Rip** | int | burst | 74 | ✓ | 22 mana · 5s CD · 2400ms · 30–45 chaos, single; bypasses ES. Exerted: fires at 3 targets for the same damage | **Soul Drain:** exerted Soul Rip heals 8% life |
| **Deathblow** | str | main | 72 | | 15 mana · 0CD · 4200ms · 220% physical, single. Exerted: 400% weapon + always crits | **Executioner:** kills with exerted Deathblow instantly grant 5 Exertion (ready again) |

---

### Support gems (40)

#### Mark supports (5)

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Rapid Marks** | 66 | mark | Marks burst at 4 stacks instead of 5; apply rate is 30% faster |
| **Volatile Marks** | 68 | mark | Mark bursts deal 60% more damage; burst triggers when the target dies rather than at max stacks (you can still reach max for instant burst) |
| **Spreading Brand** | 70 | mark | When a Mark bursts, the nearest unmarked enemy inherits 2 stacks of the same Mark |
| **Persistent Mark** | 68 | mark | Mark duration is 4s longer; stacks do not decay until the mark fully expires |
| **Cursed Brand** | 72 | mark | Marked targets take 10% more damage from all sources; applying a Mark applies a 2s elemental weakness too |

#### Warcry supports (5)

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Powerful Voice** | 66 | warcry | Warcry effects count twice as many enemies (effectively doubled for scaling) |
| **War Drummer** | 68 | warcry | Warcry cooldowns reduced by 30% |
| **Lingering Shout** | 70 | warcry | Warcry empowerment buffs last 3s longer |
| **Rally the Fallen** | 68 | warcry | Healing warcries also grant 1% life per corpse in the arena (up to 10%) |
| **Resounding Cry** | 72 | warcry | Warcry empowerment also applies to Totems if one is active |

#### Totem supports (5)

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Twin Totems** | 68 | totem | You can have 2 totems active simultaneously; each deals 25% less damage |
| **Totem Fortify** | 70 | totem | Totem has 100% more life and lasts 10s longer |
| **Ancestral Bond** | 68 | totem | While a totem is active you deal 20% more damage |
| **Totem Vanguard** | 72 | totem | Totem taunts enemies for the first 4s of its life (enemies target it first) |
| **Cascading Totems** | 74 | totem | When a totem dies, it immediately summons a replacement at half life for free |

#### Doom supports (5)

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Doom Accelerant** | 66 | doom | Hits add 2 Doom instead of 1; Doom decays 50% slower |
| **Mass Doom** | 70 | doom | Hits add 1 Doom to all enemies in combat (not just the target) |
| **Doom Echo** | 68 | doom | When a Doom burst triggers, it deals 30% of its damage to all other enemies |
| **Endless Dread** | 74 | doom | Doom maximum raised to 30; burst is 50% more powerful per extra point above 20 |
| **Void Hunger** | 72 | doom | Doom bursts have a 30% chance not to clear the meter (keeps stacks, can burst again) |

#### Exertion supports (5)

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Hasty Exertion** | 66 | exertion | Hits add 2 Exertion instead of 1 |
| **Overexertion** | 70 | exertion | Exerted version deals 50% more; Exertion resets to 2 (not 0) so you stay semi-ready |
| **Cascading Force** | 68 | exertion | Exerted kills give 2 Exertion instantly (can chain into another exerted use quickly) |
| **Exerted Momentum** | 72 | exertion | Exerted uses grant 3 Momentum and 2 Rage |
| **Violent Release** | 74 | exertion | Exerted uses also deal 50% of their damage to all other enemies |

#### General supports (15, includes rule-benders)

**Rule-bending (5):**

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Chaos Infusion** | 66 | any damage skill | 40% of this skill's damage is dealt as chaos (bypasses ES); 60% remains as the original type. Total damage unchanged |
| **Opportunism** | 68 | any hit, not heavy/totem | Changes the trigger: fires when YOU are hit instead of on its rule; 2s internal cooldown |
| **Chain Reaction** | 70 | any hit, not heavy/totem | On kill, fires once more immediately for free |
| **Blind Fury** | 70 | any attack or spell | Skill fires 50% faster but only while you are below 50% life (cooldown and attack time both reduced) |
| **Void Touch** | 72 | any spell | While mana is above 80%, converts the spell to chaos damage (bypasses ES, 15% poison chance); below 80% it fires as normal |

**Amplifiers (10):**

| Support | Lvl | Fits | Effect |
|---|---|---|---|
| **Chaos Mastery** | 66 | any chaos skill | 40% more chaos damage |
| **Vile Efficiency** | 68 | any chaos skill | Chaos skills cost 20% less mana; 15% chance to poison on hit |
| **Elemental Confluence** | 70 | any spell or elemental attack | If the hit deals fire, cold, and lightning, each is 15% stronger |
| **Cruel Intent** | 70 | any hit | 35% more damage against enemies below 30% life |
| **Slaughter** | 72 | any hit | Kills grant 2% more damage for 3s, stacking to 10 times (20% total) |
| **War-Scarred** | 72 | any attack or spell | 30% more damage while your life is above 85% |
| **Siege Breaker** | 74 | any hit | 50% more damage against bosses, 20% less against non-bosses |
| **Void Ward** | 68 | guard or shield | 20% of chaos damage you take is absorbed by the shield before it reaches life |
| **Momentum Surge** | 70 | any hit | Kills grant 3% increased attack and cast speed for 4s, stacking up to 15 times |
| **Deep Reserves** | 74 | any skill | 40% more damage if you used this skill in the last 3s (rewards staying on one skill) |

---

### Small calls

- **Totems use player stats** at 60% efficiency (`totemEfficiency = 0.6`). They don't scale with their own gem level beyond the base damage listed.
- **Warcry timing:** warcries can be queued by automation like any other skill. Their proposed 1500ms action still consumes time; cost is 0 Mana. Default rule: "Whenever ready."
- **Doom bursts are chaos damage** and bypass ES. Base burst = `50 + monster level × 3` chaos damage.
- **Exertion rule:** default rule for exertion finishers is "When exertion is full", a new rule condition like `maliceFull`. Builders still use "always" or their own condition.
- **Marks don't have a default rule** for the mark skill itself (always makes sense); the finisher skills that *benefit from* a mark have `targetHasEffect: 'mark'` as their suggested rule.
- **No signature for supports.** Same as every act.
- **Art:** totems, warcries and mark effects need icons. Doom skills share void/purple palette. Exertion uses a yellow-charge visual. All listed in `artManifest.ts → GEM_SYMBOL` when built.

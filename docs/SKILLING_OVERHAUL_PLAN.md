# Skilling overhaul: phased build plan

Written 2026-11-15. **Phases 00–14 are live in 0.4.39 and Phase 17 in 0.4.40; Phases 15–16 are live in 0.4.41. Phase 18 (whole-overhaul acceptance) is next.** Implementation contract: [SKILLING_OVERHAUL_SPEC.md](SKILLING_OVERHAUL_SPEC.md).

Design: [SKILLING_OVERHAUL.md](SKILLING_OVERHAUL.md). Tracking: [MILESTONES.md](MILESTONES.md). Current behavior: [GAME.md](GAME.md). This plan organizes the reference; illustrative examples and draft recipes remain distinct from owner decisions.

## Running the plan with fresh agents

Use **one new agent/chat per numbered phase, in order**. Paste its starting prompt. Each prompt directs the agent here, so the common rules travel with every task without copying the entire previous conversation. This request creates the plan only.

Nineteen bounded phases establish shared rules, prove the equipment path, expand all eleven professions, then finish all thirteen uniques and verify the whole journey. Phase completion does not mean release. The order below is a safe work order, not a requirement for players to level every profession before using another.

### Common rules for every implementation agent

1. Read `AGENTS.md`, this plan and its current handoff, relevant `MILESTONES.md` entries, and the relevant reference/specification sections. Inspect current code using focused `rg` searches. Avoid loading unrelated history or the whole repository.
2. Inspect existing working changes and preserve unrelated work. Edit through Edit/apply_patch. Work only on the selected phase. Do not commit, push, deploy or change package versions without a separate owner request to ship.
3. Follow the Phase 00 specification. Choose routine tuning/technical details with a brief reason. Use design-pass for major unresolved player-experience choices, and settle those before dependent implementation. Do not reopen settled decisions or attribute assistant proposals to the owner.
4. One ordinary activity runs at a time. Players choose each gathering/refining/assembly task themselves. Preserve Heist repeat/fallback and the Greenhouse background exception. No automatic production chains.
5. Ordinary profession progression and its required stations must be possible without combat progression. Equipment requirements and encounter access remain. Existing boss/achievement/world-drop sources remain; combat-sourced pinnacle projects never gate the independent profession path.
6. Preserve bonus-only per-task mastery, its roughly five-day base-work target, skilling-tree point economy, character/realm ownership and trading rules. No incidental combat rebalance, Fishing implementation, Fletching or new professions.
7. Preserve XP, mastery, discoveries, materials, existing items and valid activity state across save/load. Migrations and one-time claims must be repeat-safe. Live/offline rewards agree; manual doubles cannot duplicate discoveries or one-time claims.
8. Required materials need visible dependable progress; optional rare finds can accelerate it. Show costs, output uses, unlocks, supply/storage limits and stop reasons. Completion honors advertised guarantees, with safe input payment and reward delivery.
9. Add one plain player-facing `UPCOMING` line for noticeable changes, retaining existing lines. Update current-behavior docs/wiki as needed. Run `npm run uniques` when unique definitions or drop pools change. Never describe planned work as live.
10. Run meaningful affected-behavior tests and typecheck for code changes. Apply the playtest skill to visible changes using realistic characters/old saves as well as fresh skillers. Record blocked or unverified checks honestly; do not mark unfinished phases done.
11. Update this phase's checkbox and milestone tracking when implemented and verified, including the milestone date, Next steps and status table. Finish with the compact handoff below and stop at the phase boundary.

### Durable handoff

Replace the current handoff after each phase. Keep lasting decisions in the specification and completion history in `MILESTONES.md`.

- Phase/status and next phase that can start.
- Changed files and stable IDs/interfaces the next task needs.
- Decisions saved and compatibility requirements.
- Tests and actual in-game checks performed, with results.
- Incomplete work/blockers and exact commands or reproduction steps.

**Current handoff (2026-11-15, Phases 15–17 merged):**

- **Phase/status:** Phases 15 (GPT) and 16 (Gemini) existed only as uncommitted work in the main checkout; they were merged onto Phase 17 and are live in 0.4.41. Phases 00–17 are complete. Phase 18 can start.
- **Merge decisions:** in `onBlock`, Worldheart reduces the post-mitigation hit once before The Buried Grudge stores prevented damage and before Debt of Stone splits the remainder; in `takeHit` Worldheart applies before the Debt split; Debt's deferred tranches (`tickDebt`) are never reduced again. The Grudge shockwave goes through `damageMonster`, so Sum multiplies it once (the shown number is scaled to match). Sheet DPS applies Choir's zero before Sum. Glancing Blows now scales post-mitigation damage (Phase 15 change kept).
- **Checks:** see the release entry in `MILESTONES.md`. Browser playtest of the merged build not run.
- **Incomplete/blockers:** none for the merge. Phase 18 should playtest the Worldheart + Debt of Stone, Worldheart + Buried Grudge and Sum + Grudge pairings in a realistic build.

**Previous handoff (Phase 17):**

- **Phase/status:** Phase 17 (pinnacle chase projects) complete with automated verification, released live in 0.4.40 (2026-11-15) at the owner's request. It was built out of order, before Phases 15 and 16 were merged.
- **Changed files:** new `src/engine/pinnacles.ts`, `tests/pinnacleProjects.test.ts`; modified `src/engine/passives.ts`, `src/engine/equipment.ts`, `src/engine/state.ts`, `src/engine/save.ts`, `src/engine/treeProfiles.ts`, `src/engine/combat.ts`, `src/engine/stats.ts`, `src/engine/crafting.ts`, `src/engine/maps.ts`, `src/engine/types.ts`, `src/data/affixes.ts`, `src/data/bases.ts`, `src/data/statText.ts`, `src/data/professionProjects.ts`, `src/data/skills.ts`, `src/data/cartography.ts`, `src/data/skillingMastery.ts`, `src/data/news.ts`, `tests/trees.test.ts`, `tests/cartography.test.ts`, `docs/UNIQUES.md`, `docs/GAME.md`, this plan, the specification (§24) and `docs/MILESTONES.md`.
- **Stable interfaces:** unique/project IDs `the_second_heresy`, `worldheart`, `the_sum_of_all_things`; bases `overhaul_plain_ring|belt|amulet`; stats `secondHeresy`, `worldheart`, `sumOfAllMore`; `forbiddenAllowance`, `settleForbiddenAllowance`, `forbiddenTaken`, `sumOfAllMultiplier`, `WORLDHEART_TAKEN`; `damageMonster(..., prescaled)`; materials `world_core_fragment`, `doom_key_fragment`; actions `forge_uber_key_1|2|3`; counters `maps.doomedSinceOrb`, `maps.eligibleSinceDoomed`.
- **Compatibility for Phase 15:** Debt of Stone's split must take the post-Worldheart hit in `takeHit` and its deferred tranches must skip Worldheart. A Buried Grudge shockwave dealt through `damageMonster` gets Sum's multiplier once automatically; do not scale it again. Borrowed Tomorrow now equips as an amulet (`slotsFor` fix).
- **Checks:** 1,658 tests / 101 files, `npx tsc --noEmit`, `npm run build`, `npm run uniques` and `git diff --check` all pass. Browser playtest not run.
- **Incomplete/blockers:** browser playtest of the three acquisitions; Debt/Grudge pairings once Phase 15 exists.

**Earlier handoff (Phase 16):**

- **Phase/status:** Phase 16 (Rune-carved uniques) complete locally/unreleased. Earlier Phase 00–15 work preserved. Phases 17–18 remain open; Phase 17 (Pinnacle chase projects) is next. Package 0.4.39, save 47 and profession schema 1 unchanged. No ship authorized.
- **Changed files:** modified `src/engine/types.ts`, `src/data/affixes.ts`, `src/data/bases.ts`, `src/data/materials.ts`, `src/data/professionProjects.ts`, `src/data/statText.ts`, `src/engine/combat.ts`, `src/engine/professions.ts`, `src/engine/stats.ts`, `src/ui/components/ProjectBoard.tsx`, `src/dev/overhaulBuilds.ts`, `src/dev/overhaulPlaytest.ts`, `src/data/news.ts`, `docs/UNIQUES.md`, `docs/SKILLING_OVERHAUL_SPEC.md`, `docs/SKILLING_OVERHAUL_PLAN.md`, `docs/MILESTONES.md`, new `tests/runeUniques.test.ts`. Lasting details/evidence are under specification §28.
- **Stable interfaces:** `hands_forgotten_choir` (Rune-carving 70 / Rune Board 1 project inscribing crafted `hierophant_gloves` or `seraph_gloves`; places 2 totems at once; +2 max active totems; suppresses personal damage, ailments, thorns/reflection, and Grudge shockwaves; excess pruned on unequip), `hollow_circuit` (Rune-carving 70 / Rune Board 1 project inscribing crafted `diamond_ring` ilvl >= 45; 100% would-be mana regen converted to continuous ES recovery; mana regen = 0; natural ES recharge = 0; negative mana regen remains degeneration; alternative mana recovery permitted; Debt of Stone maxEs = 0 zeroes ES recovery without falling back to mana).
- **Compatibility:** Crafted-item inscription projects escrow base on start, return on cancel, and consume into unique UID on completion. Totem damage ownership and offensive scaling preserved while wearer direct/thorns/shockwave damage is suppressed.
- **Dependency hooks for Phase 17:** Phase 17 will implement The Second Heresy, Worldheart, and The Sum of All Things with exactly one explicit modifier each, multi-mechanic recipes, and all eleven professions for the amulet.
- **Checks:** All 1,689 automated tests pass (102 test files); `npx tsc --noEmit` passes with 0 errors; `npm run build` passes; `git diff --check` passes with 0 errors. Playtest scenarios 'Runic: Forgotten Choir', 'Runic: Hollow Circuit', 'Runic: Choir + Circuit' verified.
- **Incomplete/blockers:** No blockers in Phase 16. Phase 17 (Pinnacle chase projects) can start immediately. No commit, version bump, push, or deployment.

## Phase overview

| Phase | Result | Prerequisite |
|---|---|---|
| 00-------------------- | Current-code audit and implementation specification | Reference |
| 01--------------------- | Shared access, station, project and reward rules | 00 |
| 02 | Mining | 01 |
| 03 | Woodcutting | 02 |
| 04 | Smithing and an early exclusive project | 03 |
| 05 | Equipment-path acceptance checkpoint | 04 |
| 06 | Foraging and Greenhouse | 05 |
| 07 | Alchemy | 06 |
| 08 | Cooking | 07 |
| 09 | Gemcutting | 08 |
| 10 | Rune-carving | 09 |
| 11 | Thieving and Heist | 10 |
| 12 | Archaeology and Expedition | 11 |
| 13 | Cartography and exclusive Unique Map charts | 12 |
| 14 | Three crafted weapon uniques | 13 |
| 15 | Five defence/recovery uniques | 14 |
| 16 | Two Rune-carving uniques | 15 |
| 17 | Three pinnacle chase projects | 16 |
| 18 | Whole-overhaul verification and player guidance | 17 |

## Phase 00 — Audit and specify

- [x] Complete and verify Phase 00. — done 2026-11-13; [implementation specification](SKILLING_OVERHAUL_SPEC.md), source/data and documentation checks recorded there. No gameplay changes.

Create `docs/SKILLING_OVERHAUL_SPEC.md` as the implementation contract. Audit gates, station costs/access, navigation, ownership, rewards, manual doubles, offline processing and save migration. Starting points: `src/data/skills.ts`, `src/engine/skills.ts`, `src/ui/pages/SkillPage.tsx`, `src/ui/skillLock.ts`, `src/data/hideout.ts`, `src/engine/hideout.ts`, `src/engine/save.ts`, `src/engine/offline.ts`. Foraging's saved ID is `harvesting`; preserve it. Smithing currently has a campaign-derived item-level cap and actions have `area`/`gate` restrictions: removing page locks alone is insufficient.

Specify all eleven professions: stable action/material/project IDs, levels/accomplishments/stations, inputs/outputs, intervals, XP, costs, guarantees, discovery rules, pools and rates. Trace every mandatory ingredient and station upgrade to a source without hidden combat gates or circular requirements. Include the proposed profession tools, signature runes, signature dishes/feasts and exclusive Unique Map projects. Current Maps use plain shared tiers; resolve the reference's theme wording compatibly rather than restoring obsolete themed maps.

Specify all thirteen uniques, exact interactions, acquisition and currency/reroll rules. Distinguish the original ten accepted concepts from the three draft pinnacle designs. Define an early noncombat exclusive profession-tool project for Phase 05; it supplements rather than replaces the accepted uniques. Record expected time-to-upgrade, overnight yields and project times at representative levels, including dependable progress bounds and a short reason for tuning. Do not invent a new global XP curve.

**Done when:** every later phase has an implementable contract and measurable checks, and major unresolved choices are settled before building their dependencies.

**Starting prompt**

```text
Execute Phase 00 only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, that plan/common rules/current handoff, the reference and relevant MILESTONES entries. Audit current code and write docs/SKILLING_OVERHAUL_SPEC.md covering all eleven professions, shared systems, migrations and thirteen uniques. Distinguish your tuning from owner decisions; use design-pass for major unresolved choices. Make no gameplay changes. Update tracking and leave the required compact handoff. Do not ship.
```

## Phase 01 — Shared foundations

- [x] Complete and verify Phase 01. — done 2026-11-13; shared foundation, save compatibility, safe rewards and playtest evidence in specification §13. Local/unreleased.

Build reusable skill/accomplishment unlocks, necessary noncombat station routes, persisted projects/discoveries, reward categories, repeat-safe claims and return-summary data. Separate manufacturing from combat access. Establish atomic payment/completion, cancellation, batches, conservation and storage/input stopping rules. Prove interfaces with minimal real actions; later profession phases own their content and recipe-specific gates.

**Done when:** existing saves/unlocks survive, a noncombat save reaches shared systems, and tests cover live/offline/save-load parity, interrupted work, input exhaustion, full storage, repeated claims and manual doubles.

**Starting prompt**

```text
Implement Phase 01 only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff, relevant reference sections and Phase 01's specification. Build shared independent access, necessary stations, project/discovery persistence, safe reward completion and summaries. Preserve activity/mastery/save rules. Test live/offline/interrupted work and duplicate-claim protection; use playtest for visible changes. Update tracking and the required handoff. Do not fill later profession content or ship.
```

## Phase 02 — Mining

- [x] Complete and verify Phase 02. — done 2026-11-14; specialized deposits/prospecting/protected materials and Mining tool, noncombat/live/offline/old-save/output-use evidence in specification §14. Local/unreleased.

Extend metals; add ordinary/rich/crystal/fossil deposits, prospecting unlocks and dependable special-mineral/alloy ingredients. Explain tradeoffs and downstream uses. Earlier ore retains selected uses. Supply future project materials without exposing unfinished unique recipes.

**Done when:** early and advanced noncombat miners reach deposits and receive the specified ordinary, overnight and project progress.

**Starting prompt**

```text
Implement Phase 02 (Mining) only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and relevant reference/specification sections. Build tiered specialised deposits, prospecting access, clear tradeoffs and dependable project materials. Test noncombat access and live/offline rewards; playtest output uses. Update tracking and the required handoff. Do not build later professions or ship.
```

## Phase 03 — Woodcutting

- [x] Complete and verify Phase 03. — done 2026-11-14; advanced timber/resin choices, protected heartwood refinement, Hatchet and noncombat/live/offline/old-save/output-use evidence in specification §15. Local/unreleased.

Build distinct woods, timber/resin/ancient-tree choices, basic timber refinement and dependable heartwood progress. Supply bow/staff/defensive frames. Equipment assembly stays in Smithing; Fletching is not required.

**Done when:** materials have specified consumers, resin choices are understandable, and heartwood is achievable without combat or a jackpot.

**Starting prompt**

```text
Implement Phase 03 (Woodcutting) only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and relevant reference/specification sections. Build timber, resin, ancient-heartwood choices and refinement with dependable progress. Keep final gear assembly in Smithing. Test independent access and live/offline output; playtest material choices/uses. Update tracking and the required handoff. Do not ship.
```

## Phase 04 — Smithing

- [x] Complete and verify Phase 04. — done 2026-11-14; guaranteed-purpose gear, protected components, advanced bars, early Hammer and noncombat/upgrade/storage/cost evidence in specification §16. Local/unreleased.

Keep cheap bases; add purpose-targeted equipment with explicit guarantees, profession/station-based item strength and individually selected alloy/frame/component/assembly tasks. Support melee, bow/caster and defensive upgrades. Deliver the specified early exclusive profession-tool project. Keep equip requirements and existing crafting systems. Later uniques remain unavailable until their effects work.

**Done when:** realistic campaign builds can craft useful replacements within target times and noncombat progression reaches advanced crafting strength.

**Starting prompt**

```text
Implement Phase 04 (Smithing) only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and relevant reference/specification sections. Keep cheap bases, add guaranteed-purpose gear, replace campaign crafting-strength caps with agreed profession/station progression and deliver the early exclusive tool project. Preserve equip requirements. Test guarantees/costs/storage and playtest realistic upgrades plus noncombat access. Update tracking and the required handoff. Do not ship.
```

## Phase 05 — Equipment checkpoint

- [x] Complete and verify Phase 05. — done 2026-11-14; equipment checkpoint verified with realistic campaign journeys, Wayfarer's Hammer noncombat path, overnight hauls, old-save preservation and storage/input edge cases in specification §17. Local/unreleased.

Use realistic struggling melee and bow/caster saves plus a character avoiding combat. Measure choosing, gathering, crafting and equipping an upgrade. Complete the independent tool project and inspect an overnight gathering haul. Check old saves, mastery, summaries, exhausted inputs and full storage. Fix only defects in Phases 01–04; record unrelated findings under Ideas / later.

**Done when:** upgrades arrive while relevant, a noncombat exclusive project completes, and live/offline rewards/stops agree. Expansion waits if these journeys fail.

**Starting prompt**

```text
Execute Phase 05 only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and specification acceptance targets. Use playtest for realistic melee, bow/caster and noncombat equipment journeys, an exclusive tool project, overnight returns and old-save/storage/input edge cases. Measure time-to-upgrade. Fix only Phases 01–04 defects; leave expansion blocked until required checks pass. Update tracking and the required handoff. Do not ship.
```

## Phase 06 — Foraging and Greenhouse

- [x] Complete and verify Phase 06. — done 2026-11-14; useful herb patches, dependable rotating essences, Moon/Star blooms, seed discoveries, Greenhouse explicit planting and Seedkeeper's Sickle verified locally/unreleased in specification §18.

Give herbs clear uses; add abundant/concentrated patches, source-specific rare blooms and seed discoveries expanding Greenhouse planting. Include necessary noncombat Greenhouse access. Preserve `harvesting` IDs, existing plants and background behavior.

**Done when:** skillers discover/grow useful plants, offline discoveries occur safely, and equivalent grown/foraged project ingredients work.

**Starting prompt**

```text
Implement Phase 06 only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and relevant reference/specification sections. Build useful herb patches, dependable blooms and seed-based Greenhouse unlocks with noncombat access. Preserve harvesting IDs and background behavior. Test offline discoveries and grown/foraged equivalence; playtest planting/output uses. Update tracking and the required handoff. Do not ship.
```

## Phase 07 — Alchemy

- [x] Complete and verify Phase 07. — done 2026-11-14; targeted useful flasks including Medium Mana Flask, readable currency, dependable special reagents, Distiller's Stirrer and Table 2/3 noncombat upgrades verified locally/unreleased in specification §19.

Deliver targeted recovery/resource/utility brewing, readable currency production and special distillates/reagents. Preserve existing unique-flask sources, belt/automation rules and requirements. New unique-flask effects and final recipes belong to Phase 15.

**Done when:** players can brew toward a specific recovery/mana need while accumulating dependable special-reagent progress.

**Starting prompt**

```text
Implement Phase 07 (Alchemy) only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and relevant reference/specification sections. Build targeted useful flasks, clear currency production and special reagents. Preserve existing sources/automation and defer new unique effects to Phase 15. Test targeted outcomes/costs/live-offline rewards; playtest realistic recovery needs. Update tracking and the required handoff. Do not ship.
```

## Phase 08 — Cooking

- [x] Complete and verify Phase 08. — done 2026-11-14; independent entry, affordable purpose meals, skilling food, signature dishes, feast projects, Hearth Spoon, and live/offline meal clock parity verified in specification §20.

Replace Act 5 entry with skill progression. Group affordable meals by survival/resources/damage/gathering/production. Add limited skilling meals, signature dishes, feast projects and binding stock. Preserve one active meal; show duration, re-eating costs and stops. Cooking focuses on consumables.

**Done when:** meals are practical to use, buffs agree online/offline, and food cannot multiply one-time unlocks/claims.

**Starting prompt**

```text
Implement Phase 08 (Cooking) only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and relevant reference/specification sections. Build independent entry, affordable purpose-grouped meals, limited skilling food, signature/feast projects and project stock. Keep one active meal with clear re-eating behavior. Test buffs/costs/offline use/reward safety; playtest selection. Update tracking and the required handoff. Do not ship.
```

## Phase 09 — Gemcutting

- [x] Complete and verify Phase 09. — done 2026-11-15; targeted family cuts, exact gem recipes with work_30 gating, safe unequipped recycling for 5 Arcane Dust with minimum net cut floor (1 rough / 6 dust), Exceptional and Convergence crystals, Lapidary’s Chisel, and 8-hour live/offline parity verified in specification §21.

Implement family/function targeting, costlier exact-gem recipes, unwanted-gem recycling and exceptional crystals. Recipe access follows profession progress; gem equip/signature requirements remain. No higher gem rarity. Prevent resource-creating recycling loops.

**Done when:** a build can pursue a named missing support, unwanted cuts retain value, and crystals have dependable sources.

**Starting prompt**

```text
Implement Phase 09 (Gemcutting) only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and relevant reference/specification sections. Build family/exact-gem targeting, safe recycling and exceptional-crystal progress independent of combat. Preserve gem equip/signature rules and rarities. Test pool eligibility/output/costs/offline rewards; playtest obtaining a missing support. Update tracking and the required handoff. Do not ship.
```

## Phase 10 — Rune-carving

- [x] Complete and verify Phase 10. — done 2026-11-15; accomplishment-based progression across 6 families and 4 grades, inscription fragment generation on grade 2+ carves, future inscription components, signature Wayfarer and Channeler projects, slot/resonance previews, and 8-hour live/offline parity verified in specification §22.

Progress six families through grades/accomplishments; preview slot effects and resonance before payment. Deliver signature-rune projects and prepared components for later uniques. Preserve one rune slot and existing equipment. Keep unfinished unique recipes unavailable.

**Done when:** players can deliberately improve kept gear and complete signature inscriptions offline with safe costs/claims.

**Starting prompt**

```text
Implement Phase 10 (Rune-carving) only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and relevant reference/specification sections. Build accomplishment-based family/grade progression, slot/resonance previews, signature projects and future inscription components. Keep one rune slot. Test compatibility/costs/offline claims; playtest customising kept equipment. Update tracking and the required handoff. Do not ship.
```

## Phase 11 — Thieving and Heist

- [x] Complete and verify Phase 11. — done 2026-11-15; level-only mark actions, deterministic 1 Marker every 10 mark completions, clean exit milestone job progression, equipment category targeting with ilvl capped by min(job.ilvl, Thieving level + 10), Occult Treasury job with Treasury Fragments per room and clean vault/12-room Oath Fragments, Borrowed Tomorrow jackpot with safe delivery, Claim Borrowed Tomorrow and Assemble Stolen Oath projects, readable UI previews, and 8-hour live/offline parity verified in specification §23.

Replace campaign job gates with Thieving/success milestones. Explain job categories, targeted equipment, crew, exit depth, risk, Marker consumption and repeat/fallback/stops. Add dependable known-treasure progress alongside ordinary value/surprises. Prepare occult-treasury and pinnacle components; no unfinished uniques or moved existing exclusives.

**Done when:** safer/deeper jobs have understandable differences, missed jackpots still yield value/progress, and offline alarms/costs/fallback agree with live play.

**Starting prompt**

```text
Implement Phase 11 (Thieving/Heist) only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and relevant reference/specification sections. Build independent jobs, readable targeting/risk/Marker costs and dependable treasure components. Preserve crew/exits/repeat/fallback. Prepare later sources without granting unfinished uniques. Test realistic live/offline jobs; playtest planning/returns. Update tracking and the required handoff. Do not ship.
```

## Phase 12 — Archaeology and Expedition

- [x] Complete and verify Phase 12. — done 2026-11-14; independent restoration, discoveries, fragments/exchanges and component routes verified locally/unreleased. Evidence under specification “Phase 12 verification”. Continue to Phase 13 as requested; no ship.

Replace Act 4 entry with introductory profession progression. Connect sites/strata/discoveries to further digs and restoration. Preserve factions, standing, merchants and artifact value. Add early restored equipment, duplicate-fragment uses and Buried Grudge/pinnacle components.

**Done when:** noncombat excavation reaches a full ordinary restoration and repeat discoveries/duplicates remain useful and safe.

**Starting prompt**

```text
Implement Phase 12 (Archaeology/Expedition) only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and relevant reference/specification sections. Build independent entry/sites, discoveries, early restorations and duplicate-fragment uses, preserving factions/merchants. Prepare later components without unfinished uniques. Test live/offline discoveries/costs; playtest an entire ordinary restoration. Update tracking and the required handoff. Do not ship.
```

## Phase 13 — Cartography

- [x] Complete and verify Phase 13. — done 2026-11-14; independent chart manufacture, entry locks, full Reliquary live/offline victory and protected rewards verified locally/unreleased. Evidence under specification “Phase 13 verification”. Continue to Phase14 as requested; no ship.

Separate independently accessible manufacture from Map Device/encounter access. Improve plain-tier map, upgrade, folio and Sextant choices and material routes. Complete the specified exclusive Unique Map chart project with its bounded encounter/rewards. Supply agreed chart/reliquary components without consuming allocated Atlas points. Preserve current Maps identities and existing Unique Map trophy exclusivity.

**Done when:** skillers manufacture charts without bypassing combat locks, and eligible combat characters run the finished encounter and earn its rewards.

**Starting prompt**

```text
Implement Phase 13 (Cartography) only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and relevant reference/specification sections. Separate manufacturing/combat access, improve plain-map/Sextant supply and complete the specified exclusive chart/Unique Map project and component hooks. Preserve Atlas points and encounter exclusivity. Test entry restrictions/rewards; playtest eligible and noncombat characters. Update tracking and the required handoff. Do not ship.
```

## Phase 14 — Crafted weapon uniques

- [x] Complete and verify Phase 14. — done 2026-11-15; all three exclusive projects, collection/previews, bleed/ignite/return contracts and realistic live/offline builds verified locally/unreleased; UNIQUES regenerated. Evidence under specification “Phase 14 verification”. Stop after requested range; no ship.

Deliver **Woundmaker, Winter's Pyre and The Homecoming** with actual exclusive recipes, previews and collection/source information. Verify bleed stack/application limits and no crits; cold-sourced ignite scaling despite the fire/lightning prohibition; outward/return targeting and timing with the overriding one-arrow limit. Preserve ordinary weapon behavior.

**Done when:** all three are obtainable and their powers/drawbacks work in realistic live/offline builds. Regenerate UNIQUES.

**Starting prompt**

```text
Implement Phase 14 only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and exact unique specifications/reference. Deliver Woundmaker, Winter's Pyre and The Homecoming with complete exclusive routes and source information. Test bleed limits/no crits, cold-sourced ignite and one-arrow return hits. Playtest realistic live/offline builds, regenerate UNIQUES and update tracking and the required handoff. Do not ship.
```

## Phase 15 — Defence and recovery uniques

- [x] Complete and verify Phase 15. — done 2026-11-15; Borrowed Tomorrow, The Buried Grudge, Witchglass, The Still Heart, and Debt of Stone implemented with complete exclusive routes, contracts, tests, pairings, and live/offline build simulations. Evidence under specification "Phase 15 verification". Continue to Phase 16 as requested; no ship.

Deliver **Borrowed Tomorrow, The Buried Grudge, Witchglass, The Still Heart and Debt of Stone**, including their acquisition routes. Implement instant-leech limits/exclusions, actual prevented-block storage, shockwave consumption, conversion/ailment rules, recovery persisting at full life and once-mitigated delayed damage. Specifically check Borrowed Tomorrow + The Still Heart, Winter's Pyre + Witchglass, and blocking/Buried Grudge + Debt of Stone.

**Done when:** every route works and combinations honor drawbacks without deleting or double-mitigating damage. Regenerate UNIQUES.

**Starting prompt**

```text
Implement Phase 15 only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and exact unique specifications/reference. Deliver Borrowed Tomorrow, The Buried Grudge, Witchglass, The Still Heart and Debt of Stone with complete exclusive routes. Test recovery prohibitions, prevented-block storage, conversion/ignite, persistent flask recovery and once-mitigated delayed damage, including the listed item pairings. Playtest realistic live/offline builds, regenerate UNIQUES and update tracking/handoff. Do not ship.
```

## Phase 16 — Rune-carved uniques

- [x] Complete and verify Phase 16. — done 2026-11-15; Hands of the Forgotten Choir and Hollow Circuit delivered through crafted-item inscriptions, with complete exclusive routes, contracts, tests, and live/offline build simulations. Evidence under specification "Phase 16 verification". Continue to Phase 17 as requested; no ship.

Deliver **Hands of the Forgotten Choir and Hollow Circuit** by inscribing crafted gear. Totems keep damage ownership/scaling while personal damage is forbidden; verify simultaneous placement, limits and supports. Convert would-be mana regeneration into continuous ES recovery, disabling mana regeneration and natural ES recharge while preserving permitted alternative mana sources. Test loadout swaps/unequipping.

**Done when:** both can be completed and played through save/load and offline processing. Regenerate UNIQUES.

**Starting prompt**

```text
Implement Phase 16 only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and exact unique specifications/reference. Deliver Hands of the Forgotten Choir and Hollow Circuit through crafted-item inscriptions. Test totem placement/limits/ownership and would-be mana-regen conversion, disabled natural recharge and alternative mana recovery. Playtest realistic live/offline builds and loadout changes, regenerate UNIQUES and update tracking/handoff. Do not ship.
```

## Phase 17 — Pinnacle chase projects

- [x] Complete and verify Phase 17. — done 2026-11-15 (automated verification; browser playtest not run; Debt of Stone/Buried Grudge pairings wired when Phases 15–16 were merged)

Deliver **The Second Heresy, Worldheart and The Sum of All Things**. Exactly one specified explicit modifier each, no extra affix package or drawback. Finish dependable component hooks spanning at least three actual endgame mechanics per project. The amulet takes small contributions from all eleven professions and every listed endgame mechanic, including each named Hard/Uber Boss currency. Follow the Phase00 owner decision: **only The Sum of All Things is Divinable**; ordinary Divine rerolls do not require another whole recipe. The other twelve are fixed. Follow the specification's Seal/Wax rules; the reference's full-recipe-only reroll draft is superseded.

Verify the additional Forbidden allowance applies once, including two copies, and safely settles excess allocations on removal/profile changes. Worldheart covers hits/DoT without mitigating Debt of Stone twice. The amulet rolls an integer uniformly from 1–200 and multiplies personal, ailment, minion and totem damage once. Exercise endpoint rolls deterministically. Preserve ordinary unique pools and independent profession access.

**Done when:** each recipe grants its item, sources work, low rolls consume inputs and complete, Sum Divine rerolls cost one Divine and use the specified uniform range, and fixed uniques/Seal/Wax obey the specification. Regenerate UNIQUES.

**Starting prompt**

```text
Implement Phase 17 only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff and pinnacle reference/specification. Complete The Second Heresy, Worldheart and The Sum of All Things: one explicit effect each, dependable multi-mechanic recipes and all eleven professions for the amulet. Honor the Phase00 owner decision: only Sum is Divinable, with ordinary one-Divine rerolls rather than mandatory full-recipe reforging. Test currency rules, Forbidden removal/profile settlement and once-only damage multipliers. Playtest acquisitions/live-offline builds, regenerate UNIQUES and update tracking/handoff. Do not ship.
```

## Phase 18 — Whole-overhaul acceptance

- [ ] Complete and verify Phase 18.

Audit the reference against delivered content: no profession, tool/signature/feast/chart project or accepted unique silently disappears. Run complete noncombat/campaign-upgrade journeys, representative overnight tasks across all eleven professions and all thirteen acquisition routes. Trace each required ingredient to an actual source. Verify new IDs under existing trading rules without changing ownership/market policy. Exercise realistic old saves with progressed mastery, discoveries, crew/factions, stations and partial work; respect affected Classic/challenge restrictions.

Check desktop/phone selection, previews, costs, return summaries and stop messages. Verify input exhaustion, full storage, cancellation, batching/manual bonuses, save/reload, item combinations and offline parity. Measure upgrade/project timing against Phase 00; tune overhaul values only. Preserve existing unique sources.

Run full `npm test`, `npx tsc --noEmit` and `npm run build`; run `npm run uniques` if definitions/pools changed and confirm generated docs are current. Align GAME/wiki and milestone status with verified behavior. Record blocked checks honestly. Shipping remains a separate owner request using ship.

**Done when:** every acceptance journey passes with recorded evidence and no required work hidden as a later follow-up.

**Starting prompt**

```text
Execute Phase 18 only from docs/SKILLING_OVERHAUL_PLAN.md. Read AGENTS.md, the plan/common rules/current handoff, reference and specification. Audit all eleven professions/thirteen uniques. Use playtest for realistic old saves, independent progression, campaign upgrades, overnight rewards, acquisitions, interactions and phone/desktop flows. Fix only overhaul defects. Verify costs/stops/save-load/trading validity/live-offline parity; run full tests/typecheck/build and generated-doc checks. Update current docs/milestones and leave an evidence-based handoff. Do not ship.
```

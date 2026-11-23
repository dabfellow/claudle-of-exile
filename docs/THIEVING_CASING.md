# Thieving: Casing the job

Design review started 2026-11-21. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md), following [Mining](MINING_DELVE.md), [Woodcutting](WOODCUTTING_GIANTS.md) and [Foraging](FORAGING_BREEDING.md). Thieving was already reworked (ledger and dossier screen, Heists with rooms and alarms, the 12-rogue crew with talents, scouting, Bypass and Greed; see `## Decisions` in [MILESTONES.md](MILESTONES.md)). This review keeps that and looks for anything new. The part still shaped like "pick a node, wait, collect" is Street Marks, which mainly produce Rogue's Markers.

## Decisions

- **Question 1, marks and Heists (2026-11-21): A — Marks become casing for Heists.** Each Heist needs prep obtained from specific marks: pickpocketing the Guard Captain might give a key that opens a vault room for free, lifting a clerk's ledger might reveal a hidden room, shadowing a courier might give patrol times that lower alarms. A running mark works toward the next planned job, not just Markers.

- **Question 2a, prep (2026-11-21): A — A prep board for each job.** Each Heist lists three to five named prep items (vault key, clerk's ledger, patrol schedule, guard's uniform), each from a specific mark shown on the board. Each piece makes the job easier or richer and is used up when the job runs.
- **Question 2b, entry cost (2026-11-21): B — Prep replaces Markers.** Each job needs a minimum amount of prep to start (for example any two items from its board); extra prep makes it better. Rogue's Markers stop being an entry cost. Existing Markers convert into something useful so nobody loses out.

- **Question 3, active play (2026-11-21): A — The lift.** While a mark runs, watch the target's attention sweep (looking at you, away, glancing back) and tap to lift while their back is turned. Mid-window lift is a double, a lift as they turn is weak, getting caught is a miss. Replaces the lockpicking sequence on marks, which was shared with Gemcutting and Archaeology's sequence games.

## Decided on the owner's behalf

- Heist rooms keep the lockpicking minigame, since the lift covers marks only. Gemcutting and Archaeology get their own minigames when reviewed.
- Marks still pay gold and their ordinary loot alongside prep, so they keep working as income.
- Existing Rogue's Markers convert into prep or gold at a fair rate; Heist unlocks, clean-exit progress, crew, talents and Treasury/Oath fragment counters are unchanged.
- Which mark gives which prep item, minimum prep per job and each item's effect are tuning, set at build time on how they play.

## Implementation spec

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Numbers are starting values. Files: marks in `src/data/skills.ts` (`THIEVING`), jobs in `src/data/heist.ts`, rules in `src/engine/heist.ts`.

### Prep items

Five kinds, each with a fixed effect when held at job start. A job uses one of each listed item and consumes them:

| Kind | Effect on the job |
|---|---|
| Key | the vault room takes no time and can't raise an alarm |
| Ledger | adds one hidden room before the vault: normal room time, alarm roll and take, plus a 50% roll on the vault table |
| Patrol schedule | alarm chance −40% in every room |
| Uniform | room time −30% |
| Floor plan | take +25% |

- Prep item ids are `prep_<jobId>_<kind>`. They're held in `GameState.heist.prep: Record<prepId, number>`, up to 3 of each.
- Prep is not sellable or tradeable.

### Prep boards

Each entry is the item and the mark it comes from:

| Job (level) | Board | Minimum to start |
|---|---|---|
| Cinder Toll (1) | Key: Road Peddler · Patrol: Salt Hauler · Floor plan: Road Peddler | 2 |
| Salt Tithe (8) | Ledger: Salt Hauler · Uniform: Fence's Runner · Key: Khanate Outrider | 2 |
| Forger's Den (14) | Ledger: Fence's Runner · Patrol: Khanate Outrider · Key: Caravan Factor · Floor plan: Salt Hauler | 2 |
| Last Wagon (20) | Patrol: Caravan Factor · Key: Khanate Quartermaster · Uniform: Khanate Outrider · Ledger: Caravan Factor | 2 |
| Barrow Cache (28) | Key: Barrow Warden · Floor plan: Khanate Quartermaster · Patrol: Barrow Warden · Ledger: Tax Collector | 2 |
| Khan's Remounts (36) | Key: Khanate Quartermaster · Patrol: Tax Collector · Uniform: Barrow Warden · Ledger: Tax Collector | 2 |
| Pyre Vault (45) | Uniform: Pyre Acolyte · Key: Pyre Acolyte · Patrol: Tax Collector · Ledger: Khan's Steward · Floor plan: Barrow Warden | 3 |
| Khan's Tribute (55) | Key: Khan's Steward · Patrol: Pyre Acolyte · Ledger: Khan's Steward · Floor plan: Tax Collector · Uniform: Pyre Acolyte | 3 |
| Occult Treasury (65) | Key: Khan's Steward · Patrol: Pyre Acolyte · Ledger: Khan's Steward · Uniform: Pyre Acolyte · Floor plan: Tax Collector | 3 |
| The Gilded Mint (75) | Key: Imperial Mintmaster · Patrol: Royal Assayer · Ledger: Shadow Broker · Uniform: Royal Assayer · Floor plan: Imperial Mintmaster | 3 |
| The Sovereign's Vault (90) | Key: Grand Vaultkeeper · Patrol: High Chamberlain · Ledger: Grand Vaultkeeper · Uniform: High Chamberlain · Floor plan: Shadow Broker | 3 |

- **Drop rule:** each mark completion rolls 5% (plus `thieving.prepChance` and crew/mark bonuses) for every prep item that mark supplies, for jobs whose level the player meets. The item is skipped if already held at 3. Offline included.
- **High-level marks (Lv 60–90):** 15 Street Marks span Lv 1 (`Road Peddler`) through Lv 90 (`Grand Vaultkeeper`: `mark_assayer` Lv 60, `mark_broker` Lv 68, `mark_mintmaster` Lv 75, `mark_chamberlain` Lv 82, `mark_archivist` Lv 90).
- **Hidden keepsakes & Skill Tree:** Four Stolen Keepsakes hide across Street, Civic, Underworld, and High Court mark bands (`thieving.street`..`thieving.highcourt`). All seven `thieving.*` tree stats (`prepChance`, `thoroughCasing`, `insideKnowledge`, `perfectPlan`, `quickLift`, `deepPockets`, `opportunist`) and bridge keystones (`bridge.inside_job` on Vault Atlas maps, `bridge.fences_eye` on heist takes & vaults) are active.
- The job's existing `cost` (Markers) is removed. Starting a job needs its minimum number of different board items held. Every board item held is used.

### Marks and Markers

- Marks keep their gold, seals and wax as now (while high-tier Heists pay Regals, Chaos, and Exalteds). Their Rogue's Marker chance is removed.
- Fence's Runner, Khanate Quartermaster, and Shadow Broker keep `outputChance` and instead get double prep chance (10%).
- Heist `drops` entries for `rogues_marker` are replaced with gold at 15 gold per expected Marker.
- Talents and perks that gave Markers now give prep:
  - Ilke the Cutpurse: "+10% prep chance per rank".
  - The `smuggled_stash` mastery perk: "extra prep chance".
- **Planned job and auto-run:** `heist.planned` replaces the old meaning of `heist.auto`. With auto on:
  - Run the planned job whenever its minimum prep is held.
  - Between runs, work the mark that supplies the board item you're missing, choosing the cheapest missing item first.

### Focus minigame: the lift (marks only)

- The target starts turned away in the Lantern Alley and sweeps: back turned (`away`) → glancing back (`glancing`) → watching you (`watching`).
- Base windows give ~2.1–2.8 s turned away (`+800 ms` per distraction window, shorter high-level drop-off) and briefer `0.9–1.3 s` watches.
- Results:
  - 6+ taps in one `away` window earn a **double** (×2 next completion); 4–5 taps earn a **hit** (+25% Focus); 2–3 taps as they glance away award a partial **weak** (+5% Focus) instead of zeroing progress; clicking while `watching` is a **miss** (-10% Focus).
- Thieving holds up to `+1.0` Focus overflow at `0.035/s` drain (~28.6 s at peak Focus speed, ~57 s total before idle) so players can wait out watches without losing buff uptime.
- Heist room actions keep today's lockpick game (`ThievingGame`). `SkillGame` shows the lift for mark actions and the lockpick for heists.

### Screen

- The ledger and dossier screen stays. Each job's dossier gets a **Prep board** panel:
  - each item with its effect, source mark and held count (0–3)
  - a **Work this mark** button per item
  - a **Planned job** toggle
- The **Start job** button is disabled with the reason "Needs 2 of these" until the minimum is held.
- The marks list shows a small badge for each prep item a mark can give for the planned job.

### Migration

- For every 10 `rogues_marker` owned, give one prep item for the player's highest unlocked job, filling its board items in order up to 3 each. Any Markers left over become 15 gold each. Afterwards, `rogues_marker` becomes a legacy item.
- One-time notice: "Rogue's Markers are retired. Your N Markers became X prep and Y gold."
- Heist unlocks, clean exits, crew, talents, scouting and the Treasury and Oath fragment counters are unchanged.

### Tests

- The prep drop roll and cap.
- The minimum-to-start check.
- Each prep effect inside a job run.
- Prep being consumed.
- Auto-run picking the missing mark.
- `liftResult` boundaries.
- Marker conversion math.
- Heists no longer reading Marker cost.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build Thieving casing".

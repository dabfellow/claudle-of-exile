# Development guide

Last checked 2026-11-06. [GAME.md](GAME.md) describes implementation and ownership; [MILESTONES.md](MILESTONES.md) holds remaining work and future design. [ops/SETUP.md](ops/SETUP.md) holds deployment-service configuration. Follow root `AGENTS.md` for changes and releases.

## Architecture and source map

The engine is TypeScript over JSON-serializable state. It does not import React. Content lives in `src/data`; engine functions mutate state and emit typed events through a context. UI actions call `game.act`; returned strings become user-facing errors. `src/game.ts` owns the store, live loop, rendering notifications, platform coordination and offline catch-up. Tutorial event wrapping works in live/offline paths.

| Work | Entry points |
|---|---|
| State, simulation, migrations | `src/engine/types.ts`, `state.ts`, `save.ts`, `offline.ts` |
| Combat and formula changes | `combat.ts`, `mechanics.ts`, `stats.ts`, `gems.ts`, `battlefield.ts` |
| Monster identities and reference budgets | `src/data/monsterProfiles.ts`, `src/engine/monsters.ts`, `tests/monsterProfiles.test.ts` |
| Content | `src/data/zones.ts`, `gems.ts`, `bases.ts`, `affixes.ts`, `drops.ts` |
| Trees | `src/data/passiveTree.ts`, `skillTree.ts`, `ascendancies.ts`; matching engine modules |
| Account ownership and transfers | `src/engine/account.ts`, `challenge.ts`, `src/platform`, `src/game.ts` |
| Inventory, items and crafting | `storage.ts`, `itemActions.ts`, `items.ts`, `crafting.ts`, `craftUntil.ts`, `runes.ts` |
| Skills and side systems | `skills.ts`, `heist.ts`, `expedition.ts`, `cooking.ts`, `cartography.ts` |
| Market | `src/engine/market.ts`, `src/platform/market.ts`, `src/data/marketRules.ts`, `ops/market.sql` |
| Admin, feedback snapshots, demo counters and mail | `src/platform/admin.ts`, `feedback.ts`, `src/ui/components/Admin*`, `docs/ops/admin.sql` |
| UI | `src/ui/pages`, `src/ui/components`, `src/styles.css` |
| Assets and sound | `src/ui/assets.ts`, `src/data/artManifest.ts`, `src/assets/CREDITS.md`, `src/data/music.ts` |
| Wiki | `scripts/wiki.ts`, `docs/wiki/*.html`, `scripts/wiki-assets` |

Live ticking and catch-up reuse fixed engine steps. Preserve the invariant that equivalent elapsed time and RNG produce equivalent outcomes; offline context deliberately changes manual inputs, reporting and loot destination. Character schemas are versioned; account pools also need backward-compatible field filling. Do not bypass transfer/reconciliation protocols with raw inventory or cloud mutations.

## Commands and verification

```sh
npm ci --no-audit --no-fund
npm run dev
npm test
npm run build
npm run wiki
npm run uniques
npm run sim -- --nonstop --days 1
npm run sim -- --class warrior --seeds 3 --days 2 --profile push
```

Node 20+ is required. `build` generates the wiki, typechecks and builds with Vite/Cloudflare; inspect `vite.config.ts` for output paths instead of assuming `dist/`. Dev exposes `window.game`. Supabase/Sentry configuration is in SETUP. Use `npm run deploy` for a requested release: it builds, deploys and checks the live game/login configuration. Never bypass the release wrapper.

Select tests by the affected behavior, then run required release checks. `tests/marketServer.test.ts` executes the real SQL against a throwaway PGlite database. `tests/uniques.test.ts` catches stale generated unique documentation. Wiki generation checks links, guide placeholders and starter-build compatibility. Successful compilation does not certify real-account/cloud reconciliation, actual player balance or server configuration.

## Security boundary and publication review

The repository is already public (`dabfellow/claudle-of-exile`, verified 2026-11-05). Browser code, public Supabase URLs/keys, Sentry DSNs and client-side game rules are not secrets. Database permissions and server RPCs enforce account isolation and admin rights. Client-owned inventory, bank balances and progression are not proof of legitimate acquisition. Offline trading remains supported; market legality checks, replay protection, transactional locking and request caps are safeguards, not a trusted economy.

Vite validates its browser environment before development/tests/builds. Only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN` and `VITE_SENTRY_ISSUES_URL` are reviewed public variables. Privileged Supabase keys, Google OAuth secrets and private keys must never be browser values. Extend the allowlist only after reviewing a new variable. `.gitignore` excludes environment variants and private-key files; ignore rules do not remove tracked content or history.

Audit evidence (2026-11-05): Gitleaks 8.30.1, downloaded from its official release and verified against the release checksum, scanned all 346 locally available commits; the working-tree scan covered 340 text files and the only available Actions run's 155,031-byte log. No findings in the working-tree snapshot or Actions log. GitHub had two open alerts for one historical Google OAuth client id/secret pair; the default local scanner missed the secret. `.gitleaks.toml` adds its `GOCSPX-` pattern and the rerun confirms the secret at `docs/AUTH_SETUP.md:41`, commit `4ba2852afe62`. This is not a clean-history certificate. Rotation status is unknown; follow SETUP. Scans cannot guarantee detection of every secret or personal record. Commit author metadata is public too.

GitHub secret scanning and push protection were enabled during this review. The repo had no release assets and no artifacts for the one available Actions run. Workflow tokens default to read access with PR approval disabled; main has no branch protection, and allowed Actions remain unrestricted. No branch/release workflow changes were made. Before adding workflows, require review for untrusted contributions, pin third-party Actions, and keep deployment credentials out of forked PR jobs.

Live checks used only the configured publishable key: anonymous reads exposed zero rows in characters/admins/feedback/reviews/market inbox/operations, `is_admin` returned false, `admin_stats` returned null and the market admin RPC refused access. This does not verify signed-in cross-account behavior, all grants, provider settings, or the pending SQL migration. `tests/accountSecurity.test.ts` executes the actual setup SQL against a throwaway database as separate roles; market tests execute the operational SQL twice to verify reruns, null rejection, rate-limit rollback/recovery, private helpers and temporary-table substitution. Real-account isolation/login checks remain necessary.

Run `gitleaks git . --log-opts=--all --redact` after installing Gitleaks; the known historical secret should keep being flagged until its incident is resolved. Never copy unredacted scan reports into git or chat. Do not suppress its alert merely to get a green scan. Revoking exposed credentials comes before any optional, separately coordinated history rewrite. Rotation/applying SQL require service-admin access and are not achieved by deploying the frontend.

Admin changes must be tested as both normal and admin roles against the actual setup/market/admin SQL, including migration reapplication. `tests/adminServer.test.ts` covers isolation, restore-point retention/deletion, numeric version handling, snapshot size/ownership, message/grant idempotency and event audit/validation. `adminModels.test.ts` checks snapshots and the real GameStore's memory-only sandbox; `feedbackTransport.test.ts` checks compatibility fallback without retrying ambiguous failures. Custom event tests cover fractional loot, XP overlap, speed/cost effects and offline window boundaries. Admin/browser previews may mock backend requests but must never send real test messages or gifts. A successful frontend bundle does not mean the operational SQL has been installed. Keep the owner-visible migration/runbook in SETUP and the current behavior in GAME.

## Balance and simulations

The standalone Windows **Path of Idle Balance Lab** is built with `npm run simulator:package`; install it and create desktop/Start menu shortcuts with `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/desktop/install.ps1`. The installed client reads only the live game's simulator API. It does not compile the checkout or use bundled rules as a fallback. A missing API, unavailable events, a mismatched game file or a corrupt download blocks startup/runs with an explanation. The API and updated Windows runner are released in 0.4.34 (2026-11-12). Live artifact integrity, current event reads, desktop connection/version display and preserved-loadout restoration were verified. The existing long run was stopped for installation; completed results were exported to Downloads.

The read-only v1 API starts at `/path-of-idle/api/simulator/v1/manifest.json`. The manifest contains `schemaVersion`, `gameVersion`, `releaseId`, an immutable `basePath`, `entry`, `runtime`, `catalog`, SHA-256/byte counts for every artifact, the published game entry/hash, and the already-public event feed URL/key. Its release files include `catalog.json` (class, gear, affix, skill, flask, zone, tree, ascendancy, hideout, drop, map, event and XP editor data), `runtime.js` (the executable formulas and simulation API), and the desktop renderer/worker. Functions are intentionally omitted from JSON; consumers use the runtime to calculate behavior rather than duplicating formulas. `runtime.js` exports `gameVersion`, `schemaVersion`, `catalog`, `defaultConfig`, `prepareCharacter`, `applyRates`, `createSimulation`, `deriveStats`, `characterLevel`, and event-calendar helpers. Run independent experiments in separate workers because rate overrides mutate each worker's private drop tables.

`scripts/simulatorApi.ts` generates this API during the normal game build, from the exact same source and version. `node scripts/checkSimulatorApi.mjs` verifies the completed build's game hash, every artifact, matching catalog/runtime versions and executable combat for all seven classes. The desktop client verifies the live HTML and game-file hash, verifies every downloaded artifact, and reads public server event rows. Before each run it checks again for a new release and refreshes event rows; if the game changed, File → Refresh from live game downloads that release. The manifest is served without caching; immutable release assets permit long caching. A run records the release id and verification time, and evaluates published event schedules as its simulated clock advances. No account login or player save is read.

`src/dev/simPlayer.ts` shares player decisions with `scripts/sim.ts`; `src/simulator` supplies loadouts, the passive-tree and gear editors, rate controls, run history and JSON exports. This is uninterrupted active campaign play, not scheduled offline simulation. Higher-level/area starts supply scenario rares; equipped overrides obey equipment requirements. Relative blue/rare weights and world-unique chances change only the worker's tables. XP uses context multipliers; a private optional simulation context scales orb quantities without changing ordinary gameplay. Exclusive unique rewards and starter drops retain their rules. Simulator/client tests cover classes, fixed gear, seeded repeatability, rate validation, corrupt downloads, unavailable APIs and deployment mismatches. Heuristic competence does not establish optimal builds or correct balance.

The sim is a heuristic player, not a balance oracle. Read `scripts/sim.ts` option parsing, schedule, gear scoring, skill choice and profile logic before interpreting a run. `src/dev/presets.ts` supplies scenarios. Nonstop runs and scheduled login/offline profiles measure different behavior; report which one was used. Explicitly name Exile when testing the challenge class.

Useful knobs are `src/engine/xp.ts` (curves), `character.ts` (area XP and deaths), `combat.ts` (kill XP and encounters), `stats.ts` (defences), `gems.ts` (scaling/action limits), `src/data/zones.ts` (monster life/damage/timing), `drops.ts` (loot), `skills.ts` (production) and `hideout.ts` (costs/unlocks). Compare whole build routes, usable gem levels, maintained equipment and defensive choices rather than isolated DPS.

The accepted aspiration is a dedicated first day reaching the end of Act 6; level 100 remains a long chase and 99 is halfway in XP. Old week/month deadlines and results from the two-act build are obsolete. Do not tune against those tables. Current local defence/bot edits invalidate prior comparisons until rerun. Options such as `--casual-gear`, `--weapon-only`, `--hands-every` and side-system profiles are calibration tools; verify supported arguments in the script.

Record future results with date, commit, dirty-worktree status, command, seeds, classes, profile, elapsed time, deaths and gear/skill policy. The historical benchmark retained below lacks full provenance and is not a verified measurement of the current release.

## UI, assets and content workflow

The Ashen Codex presentation uses dark flat surfaces, quiet borders and a warm gold accent. Inter serves body text/numbers; Cinzel serves display headings. Use semantic CSS tokens, tabular numbers, shared cards/tabs/buttons/tooltips and visible focus states. Read current tokens and breakpoints from `src/styles.css` instead of copying an old pixel-size table. Preserve phone navigation labels, readable density, reduced-motion behavior, and distinct locked/unavailable/running/completed states.

Content additions must cover data, engine behavior, requirements/gates, save compatibility, art fallback, tooltip/stat text and relevant tests. For a campaign area, update roads/prerequisites, boss answers, skill/recipe unlocks, drops and wiki output. Do not reintroduce manual-only survival requirements into idle encounters inadvertently. A feature is not released merely because its data table exists.

`src/data/artManifest.ts` declares requested art; `src/ui/assets.ts` maps fallback pack files. Custom files in `src/assets/art` override fallbacks. `npm run art` imports/resizes PNG/JPG/WebP and supported sprite sheets; it can replace/remove imported raw inputs, so review what is being imported first. Attribution and licence evidence belong in `src/assets/CREDITS.md` and bundled licences. Existing recolour provenance is preserved there. The old 187-slot coverage report was stale; use current manifest/mappings and art tests. Real campaign landscapes, reused skill icons and weak monster stand-ins remain art work, not undocumented mechanics.

## Documentation rules

Keep three manually maintained internal game documents: GAME, DEVELOPMENT and MILESTONES. Setup is a separate operations runbook; UNIQUES is generated. `docs/wiki/*.html` is published website content with stable URLs, not duplicate internal design documents. Do not merge/delete those files solely to reduce a document count. Preserve attribution/licence material and executable SQL.

Document rules and ownership here; generate exhaustive item/recipe/node tables from code. Distinguish released behavior, local implementation and plans. New decisions/open items go in MILESTONES; release history is already in `src/data/news.ts` and git. Update both internal explanation and any affected published guide when mechanics change. Regenerate the wiki to verify placeholder/link integrity. Avoid a separate document for every act, skill batch or historical balance run.


## Historical benchmark (unverified provenance)

Imported from the previous standalone BENCHMARK.md. No commit/date/complete seed provenance was recorded. These tables are preserved as historical results, not claims about the current build.


Simulation: `--nonstop --days 1`, all six classes, one run each.  
Target: finish Act 6 within a single hard day-1 session (matching "Maps on day 1 in PoE").

---

### Act-completion times (push, fastest class)

| Act | Final boss | Time |
|-----|-----------|------|
| 1 | Ysolde, the Drowned Queen | **4h 09m** |
| 2 | Azhar, the Fallen Sun | **6h 45m** |
| 3 | Hierarch Solenne, Voice of Heaven | **9h 33m** |
| 4 | Ymir Vane, the Hollow King | **12h 39m** |
| 5 | Thalass, the Caller Below | **15h 20m** |
| 6 | Oswin Aurelane, the Last King | **17h 28m** |

---

### Time to first boss kill — by class

Times are cumulative from session start.

#### Act 1

| Zone | Warrior | Ranger | Mage | Duelist | Templar | Shadow |
|------|---------|--------|------|---------|---------|--------|
| The Mud Flats | 2m | 8m | 1m | 6m | 2m | 2m |
| The Brine Caves | 35m | 28m | 32m | 32m | **5m** | 27m |
| Ashen Woods | 1h07 | 35m | 37m | 33m | **16m** | 34m |
| Blackreed Marsh | 2h08 | 1h03 | 4h04 | **41m** | 41m | 1h17 |
| The Sunken Crypt | 2h13 | 1h42 | 5h25 | **1h21** | 1h21 | 1h27 |
| The Ship Graveyard | 3h55 | 2h29 | 6h17 | 2h33 | **2h08** | 2h11 |
| The Storm Cliffs | 4h48 | 3h16 | 7h38 | 3h20 | **2h54** | 2h54 |
| The Drowned Sanctum | 5h57 | 3h40 | 8h42 | 4h09 | 3h56 | **3h46** |

#### Act 2

| Zone | Warrior | Ranger | Mage | Duelist | Templar | Shadow |
|------|---------|--------|------|---------|---------|--------|
| The Cinder Road | 6h34 | 4h01 | 9h33 | 4h44 | 4h45 | **4h19** |
| The Saltpan Flats | 6h49 | 4h08 | 9h44 | 4h58 | 5h00 | **4h30** |
| The Blackgrass Sea | 7h17 | 4h17 | 9h58 | 5h16 | 5h23 | **4h44** |
| Caravan's End | 7h35 | 4h25 | 10h12 | 5h31 | 5h41 | **4h55** |
| The Kurgan Fields | 7h53 | 4h32 | 10h21 | 5h48 | 5h59 | **5h06** |
| The Thunder Plateau | 8h20 | 4h39 | 10h33 | 6h08 | 6h24 | **5h19** |
| The Pyre Temple | 8h38 | 4h47 | 10h42 | 6h24 | 6h43 | **5h30** |
| The Burning Throne | 8h57 | 4h56 | 10h52 | 6h42 | 7h01 | **5h40** |

#### Act 3

| Zone | Warrior | Ranger | Mage | Duelist | Templar | Shadow |
|------|---------|--------|------|---------|---------|--------|
| The Pilgrim Gate | 9h41 | 5h12 | 11h08 | 7h26 | 7h46 | **6h00** |
| The Alms Quarter | 9h43 | 5h12 | 11h08 | 7h28 | 7h48 | **6h01** |
| The Scourging Yard | 10h00 | 5h20 | 11h16 | 7h45 | 8h06 | **6h11** |
| The Reliquary Vaults | 10h19 | 5h31 | 11h26 | 8h03 | 8h23 | **6h24** |
| The Bell Foundry | 10h42 | 5h42 | 11h35 | 8h24 | 8h39 | **6h34** |
| The Hall of Inquisition | 10h44 | 5h43 | 11h36 | 8h27 | 8h41 | **6h35** |
| The Stair of Penitents | 11h07 | 5h52 | 11h43 | 8h43 | 8h59 | **6h45** |
| The Choir Loft | 11h32 | 6h05 | 11h52 | 9h01 | 9h17 | **6h56** |
| The Saints' Walk | 12h01 | 6h26 | 12h01 | 9h17 | 9h34 | **7h07** |
| The High Altar | 12h28 | 6h45 | 12h10 | 9h33 | 9h51 | **7h19** |

#### Act 4

| Zone | Warrior | Ranger | Mage | Duelist | Templar | Shadow |
|------|---------|--------|------|---------|---------|--------|
| The Hollow Pass | 12h50 | 7h01 | 12h21 | 9h49 | 10h06 | **7h32** |
| The Scree Fields | 12h52 | 7h02 | 12h25 | 9h51 | 10h08 | **7h34** |
| The Howling Fells | 13h16 | 7h18 | 13h08 | 10h09 | 10h25 | **8h02** |
| The Glass Lake | 13h45 | 7h37 | 13h36 | 10h35 | 10h48 | **8h33** |
| The Bone Quarry | 13h42 | 7h35 | 13h33 | 10h33 | 10h46 | **8h30** |
| The Blue Vault | 14h07 | 7h52 | 14h02 | 10h58 | 11h13 | **9h02** |
| The Mammoth Road | 14h04 | 7h51 | 13h59 | 10h55 | 11h10 | **8h59** |
| The Hanging Glacier | 14h26 | 8h05 | 14h26 | 11h18 | 11h31 | **9h30** |
| The Stone Steading | 14h46 | 8h16 | 14h45 | 11h39 | 11h54 | **9h59** |
| The Long Hall | 15h08 | 8h46 | 15h05 | 12h08 | 12h16 | **10h28** |
| The King's Stair | 15h33 | 9h14 | 15h27 | 12h36 | 12h43 | **10h56** |
| The Giants' Throne | 15h36 | 9h17 | 15h29 | 12h39 | 12h46 | **11h00** |

#### Act 5

| Zone | Warrior | Ranger | Mage | Duelist | Templar | Shadow |
|------|---------|--------|------|---------|---------|--------|
| The Black Harbour | 16h00 | 9h42 | 15h51 | 13h02 | 13h09 | **11h21** |
| The Wreck Line | 16h02 | 9h43 | 15h51 | 13h03 | 13h11 | **11h22** |
| Cinder Key | 16h27 | 10h00 | 15h58 | 13h18 | 13h37 | **11h33** |
| The Squall Banks | 16h55 | 10h19 | 16h06 | 13h32 | 14h04 | **11h43** |
| The Gulf of Lamps | 16h57 | 10h22 | 16h07 | 13h33 | 14h07 | **11h44** |
| The Drowned Fleet | 17h23 | 10h40 | 16h11 | 13h50 | 14h26 | **11h52** |
| Brimstone Isle | 17h26 | 10h42 | 16h12 | 13h52 | 14h26 | **11h53** |
| The Hollow Reef | 17h46 | 11h02 | 16h16 | 14h12 | 14h41 | **12h02** |
| The Thunderhead | 18h13 | 11h19 | 16h19 | 14h35 | 15h09 | **12h10** |
| Leviathan's Rib | 18h15 | 11h20 | 16h20 | 14h37 | 15h12 | **12h11** |
| The Black Current | 18h35 | 11h36 | 16h27 | 14h57 | 15h34 | **12h18** |
| The Trench of Voices | 18h39 | 11h37 | 16h27 | 14h59 | 15h36 | **12h18** |
| The Lightless Deep | 19h07 | 11h53 | 16h35 | 15h22 | 16h01 | **12h26** |
| The Maelstrom's Eye | 19h04 | 11h52 | 16h34 | 15h20 | 15h58 | **12h26** |

#### Act 6

| Zone | Warrior | Ranger | Mage | Duelist | Templar | Shadow |
|------|---------|--------|------|---------|---------|--------|
| The Exiles' Gate | 19h30 | 12h08 | 16h43 | 15h44 | 16h13 | **12h34** |
| The King's Road | 19h32 | 12h09 | 16h43 | 15h46 | 16h14 | **12h35** |
| The Tithe Fields | 19h47 | 12h23 | 16h50 | 16h03 | 16h22 | **12h42** |
| Fort Obedience | 20h15 | 12h38 | 16h58 | 16h28 | 16h33 | **12h50** |
| The Field of Banners | 20h12 | 12h37 | 16h57 | 16h26 | 16h32 | **12h49** |
| The Assizes | 20h48 | 12h54 | 17h07 | 16h51 | 16h49 | **12h58** |
| The Lower City | 20h37 | 12h50 | 17h05 | 16h46 | 16h43 | **12h56** |
| The Dry Aqueducts | 20h42 | 12h51 | 17h06 | 16h48 | 16h44 | **12h57** |
| The King's Mint | 21h15 | 13h05 | 17h13 | 17h10 | 17h14 | **13h04** |
| The Hanging Gardens | 21h12 | 13h04 | 17h12 | 17h07 | 17h11 | **13h04** |
| The Burned Archive | 21h44 | 13h18 | 17h19 | 17h31 | 17h43 | **13h12** |
| The Long Fracture | 21h41 | 13h16 | 17h19 | 17h29 | 17h40 | **13h11** |
| The Drifting Quarter | 22h31 | 13h33 | 17h26 | 17h55 | 18h17 | **13h19** |
| The King's Reach | 22h27 | 13h32 | 17h25 | 17h53 | 18h13 | **13h18** |
| The Sundered Hall | 22h52 | 13h43 | 17h32 | 18h13 | 18h39 | **13h25** |
| The Hall of Crowns | 23h05 | 13h47 | 17h34 | 18h20 | 18h50 | **13h28** |
| The Ninth Stair | 22h56 | 13h44 | 17h32 | 18h15 | 18h43 | **13h26** |
| The Shattered Throne | 23h00 | 13h45 | 17h33 | 18h18 | 18h47 | **13h27** |

---

### Time to reach character level

| Level | Warrior | Ranger | Mage | Duelist | Templar | Shadow |
|-------|---------|--------|------|---------|---------|--------|
| 5 | 20m | 14m | 23m | 14m | **8m** | 18m |
| 10 | 1h30 | 1h04 | 3h03 | 48m | 49m | **1h05** |
| 15 | 3h52 | 2h26 | 6h12 | 2h31 | **2h06** | 2h10 |
| 20 | 5h30 | 3h30 | 8h21 | 3h51 | 3h28 | **3h26** |
| 25 | 7h16 | **4h16** | 9h56 | 5h15 | 5h21 | 4h43 |
| 30 | 8h54 | **4h55** | 10h51 | 6h40 | 7h00 | 5h39 |
| 35 | 10h40 | **5h41** | 11h34 | 8h22 | 8h38 | 6h33 |
| 40 | 12h46 | **6h59** | 12h17 | 9h46 | 10h04 | 7h29 |
| 45 | 14h44 | 8h15 | 14h43 | 11h37 | 11h52 | **9h56** |
| 50 | 16h52 | 10h18 | 16h05 | 13h31 | 14h02 | **11h42** |

---

### End-of-day snapshot (after 24h nonstop)

| Stat | Warrior | Ranger | Mage | Duelist | Templar | Shadow |
|------|---------|--------|------|---------|---------|--------|
| Level | 65 | 72 | 70 | 68 | 67 | **72** |
| Deaths | 14 | 14 | **27** | 12 | **2** | 10 |
| DPS | 949 | 2078 | 734 | 1088 | 1855 | **2710** |
| Life | 1495 | 1283 | 1249 | **1623** | 1145 | 1189 |
| Gold (k) | 605 | 3928 | 2808 | 1320 | 1026 | **4707** |
| Chaos orbs | 363 | 1234 | 990 | 564 | 495 | **1525** |
| Currency orbs used | 114 | 128 | **144** | 121 | 123 | 141 |

> Gear worn (rare · magic · normal): roughly 12 · 0 · 0 for all classes.  
> Played %, away fighting %, away gathering %, gold/xp lost: all 0 — full nonstop session.

---

### Boss win rates — just after first kill, left on auto

Each boss fought repeatedly immediately after it's first cleared, using six automation settings. Format: **won · lost · timed out**.

| Boss | Rules only | Ground rule | Auto-flee | Instilled | Both | By hand |
|------|-----------|-------------|-----------|-----------|------|---------|
| The Brine Caves | 39·61·0 | 39·61·0 | 76·21·4 | 83·17·0 | 97·2·2 | **99·1·0** |
| Blackreed Marsh | 41·59·0 | 41·59·0 | 64·36·0 | 86·14·0 | 96·4·0 | **100·0·0** |
| The Ship Graveyard | 91·9·0 | 91·9·0 | 94·6·0 | **100·0·0** | **100·0·0** | **100·0·0** |
| The Drowned Sanctum | 98·2·0 | 98·2·0 | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** |
| The Cinder Road | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** |
| The Kurgan Fields | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** |
| The Pyre Temple | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** |
| The Burning Throne | **100·0·0** | 99·1·0 | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** |
| The Hall of Inquisition | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** |
| The High Altar | 94·6·0 | 93·7·0 | 96·4·0 | **100·0·0** | **100·0·0** | **100·0·0** |
| The Howling Fells | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** | **100·0·0** |
| The Giants' Throne | 97·3·0 | 97·3·0 | 99·1·0 | **100·0·0** | **100·0·0** | **100·0·0** |
| The Hollow Reef | 83·4·13 | 83·4·13 | 83·0·17 | 83·1·16 | 83·0·17 | **100·0·0** |
| The Maelstrom's Eye | 61·6·33 | 61·6·33 | 61·6·33 | 61·0·39 | 61·0·39 | **100·0·0** |

> **The Hollow Reef** and **The Maelstrom's Eye** have a ~39 % and ~39 % timeout floor on auto — only "by hand" reaches 100 %. These are the two problem bosses.

---

### Gathering pace — best node, no gear bonuses

Time to fill the node once at each level milestone.

| Level | Mining | Woodcutting | Harvesting | Thieving |
|-------|--------|-------------|------------|----------|
| 15 | 47m | 50m | 45m | **41m** |
| 30 | 2h33 | 2h47 | 2h27 | **2h26** |
| 45 | 7h14 | 7h28 | **7h16** | 8h16 |
| 60 | 27h55 | 28h09 | **25h08** | 30h23 |
| 75 | 4d23h | 4d23h | **4d07h** | 5d04h |
| 99 | 52d23h | 52d23h | **45d19h** | 54d18h |

> Harvesting is fastest at high levels; Thieving starts fast but falls behind mid-game.

# Skilling Overhaul — UX Polish, Bug Fixes & UI Pass Notes

*Written 2026-11-22 across all 12 reworked skilling professions (plus Fishing placeholder).*

---

## 1. Sweeping Patterns Found & Fixed Across All 12 Skills

Playtesting every skill as a first-time Level 1 player exposed six recurring UX patterns that made the reworked professions feel overwhelming before players even clicked their first action:

1. **Unclear first step on arrival (`<SkillIntro>`)**
   - Opening a skill often dropped players straight onto dense stat panels, empty end-game screens, or walls of numbers without saying what to click first.
   - **Fix:** Added a shared `<SkillIntro step="...">` banner (`src/ui/components/SkillHelp.tsx`) across tabs in every profession explaining in one sentence what to do here and why. Default tabs were corrected where needed so new characters land on actionable starter screens (`Foraging` defaults to `Wild`; `Astrology` defaults to `Research` when 0 stars are unlocked).

2. **Jargon & unexplained systems (`<HelpTip>`)**
   - Mechanics like *Rubble*, *Supports*, *Security*, *Hazards*, *Carats*, *Purity Odds*, *Jigs*, *Tunings*, and *Part Order* assumed prior design-doc knowledge.
   - **Fix:** Built a shared `?` tooltip component (`<HelpTip>`) and wired plain-English explanations directly beside unfamiliar labels across Mining, Woodcutting, Thieving, Smelting, Forging, Woodcrafting, Gemcutting, and Cartography.

3. **Too much locked / end-game UI exposed at Level 1 (`<LockedBadge>`)**
   - Unreached Lv 45–90 systems (`Master alloys`, `Master forms`, `Named cuts`, `Installations`, `Greenhouse`, long unreached tier lists) sat wide open at Lv 1, making screens look cluttered and intimidating.
   - **Fix:** Added native `locked?: string` tab support (`src/ui/components/common.tsx`) and `<LockedBadge>` pills. High-level tabs (`Master alloys` at Lv 80, `Master forms` at Lv 80, `Greenhouse` at Lv 5, `Patterns` below Lv 10 when empty) now lock with their unlock level, while long tier lists in Mining (`DelveView`), Woodcutting (`GiantView`), Woodcrafting (`WoodBench`), Foraging (`ForagingBench`), and Cartography (`CartographyBoard`) show unlocked options + the next 1–2 upcoming tiers behind a `"Show locked"` toggle.

4. **Inconsistent `Masterworks` tab placement & broken references**
   - Mining kept `Masterworks` buried in a bottom collapsible `<details>`, Archaeology stacked `Culture Merchants` inside `Masterworks` and kept `Sites` in a separate tab away from the Desk, and Alchemy's `Masterworks` crashed with `Unknown unique the_still_heart`.
   - **Fix:** Moved `Masterworks` into a dedicated top-level tab in Mining, eliminated the duplicate Archaeology `Merchants` leak from `Masterworks` and folded the full Expedition Trail directly under `Desk`, fixed flask unique descriptions in `src/ui/components/projectHelpers.ts`, and relocated 4 orphaned Rune-carving/Cooking Masterworks onto active skills.

5. **Legacy plain action boxes lingering next to redesigned screens**
   - Woodcutting `Sawmill`, Archaeology `Restoration & Sifting`, Gemcutting `Recycling`, Forging `Master forms`, and Woodcrafting `Recipes` still rendered bare fallback lists or flat `<select>` dropdowns.
   - **Fix:** Replaced each with modern themed views matching its parent screen (`SawmillView`, `RestorationView`, Forging's obsidian-gold `The High Crucible`, Forging Category Filter Pills + visual blank cards, Woodcrafting family pills + clean recipe cards, Gemcutting visual gem cards).

6. **Minigame readability & input pacing**
   - Players struggled with slow/fiddly interactions: Thieving's timed snatch felt passive, Archaeology's `5×4` board was oversized and slow to clear cleanly, Astrology's circle gauge lacked a telescope feel, Smelting's bellows marker started awkwardly at mid-bar, and Cartography's focus zone was too unforgiving.
   - **Fix:** Reworked all five minigames in `src/engine/minigame.ts` and `src/ui/components/minigames.tsx` (`minigames-overhaul.css`) and hid Cartography's empty `Take a sighting` card whenever idle.

---

## 2. Per-Skill Fix Audit & Next-Wave UI Polish Recommendations

### Mining (`DelveView.tsx`, `delve.css`, `delve.ts`)
- **Fixed now:**
  - Pick upgrades (`delvePickCost`) now spend metal **bars** (`iron_bar` .. `world_bar`, plus `5× Heartstone` on the top pick) instead of raw ore.
  - Added vertical mine-shaft framing (timber side beams, depth ruler ticks, active layer lantern glow) and progressive layer disclosure (reached + next 2 unreached strata + `Show deeper strata`).
  - Added `<SkillIntro>` + `<HelpTip>` on *Work Layer*, *Rubble*, *Supports*, *Hazards*, *Security*, *Installations* (with `Lv 30/45/60` `<LockedBadge>`), and *Picks*.
  - Moved `Masterworks` to a top-level tab; renamed `Shaft log` to `Mine Log` with a plain subtitle.
- **Next-wave UI polish notes:**
  - Add an ambient rock-stratum color shift down the shaft ruler (copper rust → slate iron → teal mithril → star gold → void purple).
  - Highlight the `Brace!` Focus button with a subtle amber pulse when a cave hazard approaches so players notice Focus plays while working a deep layer.

### Woodcutting (`GiantView.tsx`, `giants.css`, `src/assets/trees/*.png`)
- **Fixed now:**
  - Replaced the crude SVG tree with 7 verified CC0 pixel tree sprites in `.giant-clearing` (`ash.png`, `oak.png`, `yew.png`, `ironwood.png`, `ancient.png`, `spirit.png`, `worldwood.png`).
  - Added explicit **Drop** and **Purpose** text directly inside the Crown, Limbs, Trunk, and Heart cards.
  - Built modern `SawmillView` on the `Sawmill` tab (fixing legacy raw action cards) and added `<SkillIntro>` + `<LockedBadge>` across `Scouting`, `Lodge`, `Regions`, and `Trophies`.
  - Fixed desktop `.giant-clearing` right-edge clipping on `Limbs` / `Heart` (`min-width: 0`, flex-wrap headers).
- **Next-wave UI polish notes:**
  - Add a tiny axe-swing floating chip (`+Logs`, `+Resin`, `+Splinters`) inside `.giant-clearing` on completions and distinguish Legendary Giants with an ornate vignette frame.
  - Show a short 1-line flavor note under `Trophies` explaining where trophies go (Lodge perks / prestige milestones).

### Foraging (`ForagingBench.tsx`, `foraging-bench.css`)
- **Fixed now:**
  - Default tab opens on `Wild` when Greenhouse is locked or empty; `Greenhouse` tab shows `<LockedBadge>` below Lv 5.
  - Fixed compact card clipping (`minmax(250px, 1fr)`, `min-width: 0`, clean text wrapping).
  - Added `<SkillIntro>` across `Wild`, `Greenhouse`, `Seeds`, `Herbarium`, and `Masterworks`, plus `"Show locked"` toggle for far-off flora.
  - Upgraded the `Fertilise` Focus minigame into a 3×3 garden soil-bed grid with animated sprouts, gold double-bloom pulses, and bottom countdown bar.
- **Next-wave UI polish notes:**
  - Add visual mutation tier badges (`Common` / `Rare` / `Giga`) directly on Herbarium strain cards and preview offspring traits before cross-breeding two parents.

### Thieving (`ThievingLedger.tsx`, `HeistBoard.tsx`, `rogues.ts`, `save.ts`)
- **Fixed now:**
  - New saves now start with `0` active crew and `0` unlocked rogues (`SAVE_VERSION = 66` migration preserves veteran saves while letting new thieves discover recruits naturally via Street Marks with early pity guarantees at marks 3, 7, and 12).
  - Replaced the sluggish pickpocket timing bar with a spam-click `Lift!` minigame featuring randomized guard attention states (`AWAY` / `GLANCING` / `WATCHING`), `4` clicks for Hit, `8` for Double, floating `+1` pips, and warning pauses.
  - Defaulted marks view to unlocked + next 1 upcoming target with `<SkillIntro>` and `<HelpTip>` on Street Marks, Heist Ops, and Rogue Crew.
- **Next-wave UI polish notes:**
  - Surface a subtle "Recruit Chance!" spark badge on the `Rogue Crew` tab whenever you unlock a new contact from Street Marks.
  - Simplify Heist Prep Board visually by showing a 3-dot progress pip row (`●●○ Ready`) per job before expanding room-by-room details.

### Archaeology (`ScholarsDesk.tsx`, `ExpeditionBoard.tsx`, `archaeology.css`, `SkillPage.tsx`)
- **Fixed now:**
  - Removed the cramped `DigPanel` selector from Desk, removed the separate `Sites` tab, and embedded the full `Expedition Trail` directly underneath `Scholar's Desk`.
  - Fixed `SkillPage.tsx` tab filtering so `Culture Merchants` no longer leaks into `Masterworks`.
  - Built modern `RestorationView` for `Restoration & Sifting`, added `<SkillIntro>` on Desk / Codex / Chapters / Relic Forge / Merchants, and displayed Relic base item + implicits clearly on Relic Form cards.
  - Reworked `Brush` Focus minigame from `5×4` down to a snappy `4×3` grid (`3–4` find squares, `2–3` fragile cracks, `75%` faint hints, faster reset, clean-round Focus award).
- **Next-wave UI polish notes:**
  - Add a clickable jump pill on a newly cracked glyph in Codex to highlight all untranslated inscriptions in your satchel that use that glyph.

### Astrology (`StarChart.tsx`, `star-chart.css`, `SkillMinigame.tsx`)
- **Fixed now:**
  - Fresh saves with `0` stars and `0` fallen stars now open directly on the `Research` tab with `<SkillIntro>` guidance (Constellation view also shows an empty-sky CTA button jumping straight to Research).
  - Rebuilt the `Focus` minigame (`TelescopeGame`) as a `220×220` square optical eyepiece with a centered diffraction-spiked star, crosshair reticle, two draggable brass focus rings (pointer-angle drag, wheel, fine buttons), and a **Lock Focus** trigger.
- **Next-wave UI polish notes:**
  - Animate faint star twinkling inside the eyepiece once rings are within `±12°` of focus so alignment gives tactile visual feedback even without reading numbers.

### Smelting (`FurnaceView.tsx`, `furnace.css`, `minigames.tsx`)
- **Fixed now:**
  - Added `<SkillIntro>` + inline `QuickSmeltGrid` right on the idle landing state.
  - Tucked `Purity Odds` into a collapsible `"Heat & Purity"` section with `<HelpTip>` and hid early Fuel/Flux clutter until unlocked or owned.
  - Locked `Master alloys` tab below Lv 80 and tucked far-off metal tiers behind `"Show locked"`.
  - Changed the `Bellows` minigame (`BellowsGame`) so the heat indicator starts and resets at `0` (all the way left) rather than mid-bar.
- **Next-wave UI polish notes:**
  - Display a small live bar-grade bar preview badge next to the active furnace cycle showing current Crude / Refined / Pure / Flawless odds.

### Forging (`AnvilView.tsx`, `anvil-view.css`)
- **Fixed now:**
  - Replaced the flat blank `<select>` list with **Category Filter Pills** (`All`, `Weapons`, `Shields`, `Armour`, `Jewellery`) + visual blank cards (showing unlocked + next 1 upcoming blank).
  - Locked `Master forms` below Lv 80 (and `Patterns` below Lv 10 when empty).
  - Redesigned `Master forms` as **The High Crucible** (`.master-crucible` dark obsidian/gold aesthetic with Alloy Showcase cards detailing signature modifiers and current alloy stock instead of cloning the standard Anvil view).
- **Next-wave UI polish notes:**
  - Add a compact sticky "Forging Plan Summary" pill strip on mobile so Stage 1–4 weight biases remain readable without scrolling back up.

### Woodcrafting (`WoodBench.tsx`, `wood-bench.css`)
- **Fixed now:**
  - Fixed `Recipes` tab leaking unrelated Smithing purpose recipes (`!a.purpose` filter removes `"Fire Res Buckler"` / `"Cold Res Hood"` completely).
  - Replaced legacy recipe list with Category/Family filter pills (`All`, `Bows`, `Staves`, `Wands`, `Cloth`, `Leather`, `Frames`, `Workbench`) and full visual cards (`<Art>`, `<Costs>`, `<LockedBadge>`, `"Show locked"`).
  - Added `<SkillIntro>` and `<HelpTip>` explanations across Dials, Implicits, Jigs, and Tunings.
- **Next-wave UI polish notes:**
  - Let clicking any card on the `Recipes` tab auto-select it in the Carving Workbench and switch back to the main Workbench tab seamlessly.

### Alchemy (`AlchemyBench.tsx`, `alchemy-bench.css`, `projectHelpers.ts`, `professionProjects.ts`)
- **Fixed now:**
  - Fixed crash `Unknown unique the_still_heart` when opening Alchemy `Masterworks` (`cleanProjectDesc` now handles `'flask'` rewards via `flaskDef`); added a test verifying every `PROFESSION_PROJECTS` entry resolves without throwing.
  - Replaced the deleted `ember_reduction` input on `The Still Heart` with `30× Emberroot` (matching the 3:1 herb migration).
  - Added 1-click **Brew now** button (calling `prependInfusion`) right beside `+ Queue` on `Infusions`, plus a live `ActiveBrewBanner` and top-level `<SkillMinigame skill="alchemy" />` placement.
  - Clearly displayed `Grand Flask` (`Lv 80`) Flawless bar requirements alongside herb costs on Recipes cards.
- **Next-wave UI polish notes:**
  - On the Flask Belt panel, highlight open infusion slots with a subtle glow when holding an unpoured vial in your satchel.

### Gemcutting (`LapidaryBench.tsx`, `lapidary.css`, `gemFacets.ts`)
- **Fixed now:**
  - Removed the `Plans` tab, `Active plan` dropdown, and `Plan name` save form — facets are now toggled directly on-the-fly (`quickFacets` persisted automatically per rough carat budget).
  - Added `<HelpTip>` explaining how `Rough size` carats map 1:1 to facet slots (including Wild slots on Star Stones).
  - Locked `Named cuts` behind `<LockedBadge level={80} />` and modernized `Recipes` (category pills) and `Recycling` (visual `<GemIcon>` cards with facet chips, recut preview, and Recut/Recycle buttons).
- **Next-wave UI polish notes:**
  - Show a subtle live tag tooltip next to selected facets indicating which equipped skills on your Skill Bar can benefit from that gem family.

### Cartography (`CartographyBoard.tsx`, `cartography-board.css`, `minigame.ts`, `weaponProjects.ts`)
- **Fixed now:**
  - Added explicit `<Cost>` rows AND `Plain T* Map (owned)` requirement chips on all Special Map, Upgrade, and Sextant/Folio cards.
  - Widened `Take a sighting` target tolerances (`double <= 0.06`, `hit <= 0.14`, `weak <= 0.24`), slowed the crosshair sweep (`740` divisor), added clear `28%`/`12%` visual target rings, kept the locked X-axis line visible during Y alignment, and guaranteed a clean-sighting `'hit'` Focus reward.
  - Hid the empty `Take a sighting` box when idle and moved it to the top of `CartographyBoard` while any Cartography craft runs.
  - Relocated the 3 remaining former Rune-carving inscription components (`prepare_choir_inscription`, `prepare_circuit_inscription`, `inscribe_convergence`) alongside `prepare_return_inscription` in Cartography's `Sextants & folios` tab.
- **Next-wave UI polish notes:**
  - Show a quick shortcut link to `Map Device` when holding finished Special Maps so players immediately know where to run them.

### Fishing (Placeholder)
- Remains intentionally "Coming soon" in normal play until Saltmere's standalone RPG mode is unlocked (`docs/FISHING_RPG.md`).

---

## 3. Interactive Intro Tutorial Blueprint (Next Phase)

When ready to wire interactive skilling tutorials after locking UI layouts:

1. **Per-skill first-visit checklist (`s.skillIntrosShown: Record<SkillId, boolean>`):**
   - Triggered automatically the very first time a player opens a skill tab (with an instant **Skip** button and a **Replay tips** `?` icon next to `<SkillIntro>`).
   - Walks through 3 micro-steps taking ~30–60 seconds using real in-game state rather than modal walls of text:
     1. *Start your first task* (highlights the Lv 1 action button and auto-advances on click).
     2. *Score 1 Focus play* (highlights the active `<SkillMinigame>` container and completes on first `weak`/`hit`/`double` result).
     3. *Check what outputs do* (highlights the secondary tab or Masterwork/Forge/Lodge destination for those drops).
2. **Reuse existing primitives:** Spotlight pulses can reuse the `.quest-highlight` / `.skill-intro-banner` visual language from the campaign Quest Journal without adding a separate tutorial framework.

---

## 4. Owner Review Items

### A. Relocated Masterwork Projects & Retired Material Swaps
Commit `14d877d` retired Agility, Cooking, and Rune-carving and moved `prepare_return_inscription` to `cartography` (`5 copper_bar_flawless`), leaving four endgame Masterworks on deleted skills. Rather than leave broken crafting screens or uncraftable projects, this pass aligned them with active skills:
- **`The Second Heresy`** (`Lv 85` ring): Moved from `runecarving` to **`cartography`** (`cartography_work_100`, no `rune_board` required). Uses existing `crownless_sigil`, `stolen_oath_seal`, `restored_taboo_tablet`, and `5× Inscription Fragment` (drops from T5+ Boss maps).
- **`The Sum of All Things`** (`Lv 90` amulet): Moved from `runecarving` to **`cartography`** (`cartography_work_100`). Replaced retired Cooking `binding_stock: 1` with **`gilded_stardust: 5`** (Astrology) so every active profession contributes; `Inscribe Convergence` (`5× Inscription Fragment` + `5× Flawless Star Bar`) crafts under `cartography` Lv 90.
- **`Hands of the Forgotten Choir`** (`Lv 70` gloves) & **`Hollow Circuit`** (`Lv 70` ring): Moved from `runecarving` to **`cartography`** (`cartography_work_100`). Added `prepare_choir_inscription` (`iron_bar_flawless: 5`) and `prepare_circuit_inscription` (`mithril_bar_flawless: 5`) under `cartography` Lv 70.
- **`The Still Heart`** (`Lv 60` flask): Swapped retired Cooking `ember_reduction: 10` for **`emberroot: 30`** (matching the 3:1 herb conversion in `src/engine/save.ts`).
- Removed uncraftable retired-skill projects `tool_cooking`, `signature_wayfarer`, and `signature_channel` from `PROFESSION_PROJECTS`.

### B. Woodcutting CC0 Tree Sprites (`src/assets/CREDITS.md`)
All 7 tree species use verified CC0 OpenGameArt sprites (with clean transparency and palette-tinted variants for high tiers):
- `ash.png`, `oak.png`, `ancient.png`, `worldwood.png` — Croomfolk ([Pixelled Trees](https://opengameart.org/content/pixelled-trees), CC0; `worldwood` emerald-tinted)
- `yew.png` — stealthyshiroean ([Pixel Pine Tree Assets 10-pack](https://opengameart.org/content/pixel-pine-tree-assets-10-pack), CC0)
- `ironwood.png` — cemkalyoncu ([Haunted Forest Trees](https://opengameart.org/content/haunted-forest-trees), CC0; iron-slate tinted)
- `spirit.png` — Snabisch ([Some Pixel Trees](https://opengameart.org/content/some-pixel-trees), CC0; background keyed out, moonlight-blue tinted)

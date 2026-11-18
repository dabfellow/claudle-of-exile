# Profession workspaces

Approved and implemented 2026-11-17. The owner wants minimalist, readable, game-like screens with a different identity for each profession. Thieving and Woodcutting are the visual references. Small existing assets and CSS materials replace large scene illustrations; no new recipe, drop, unlock, timing or balance rules are introduced.

| Profession | Workspace |
|---|---|
| Thieving | Dark target ledger, parchment dossier and brass lock Focus |
| Woodcutting | Grouped tree stand, timber header, cut-grain emblem and plain timing marker; separate Planks tab |
| Mining | Mineral seam catalogue and a stratified working face |
| Foraging | Herbarium specimens and a gathering tray; existing Greenhouse tab |
| Smelting | Charge manifest above a wide crucible, with recipe and heat control side by side |
| Forging | Steel pattern catalogue and a ruled anvil work surface |
| Woodcrafting | Template rack and a clamped, ruled carving mat |
| Alchemy | Formula index and a book-spined mixing bench |
| Gemcutting | Compartmented specimen tray and faceted cutting jig |
| Rune-carving | Tablet selector above an inset carving slate |
| Cooking | Menu-style recipe book and a broad hearth |
| Cartography | Chart index above a survey-grid drafting surface |
| Archaeology | Paper site index beside a single excavation tray, with restoration workbench and merchants retained |

## Connected controls

Browsing activities does not start them. The selected action uses the existing action card, engine start/stop functions, live intervals, output/drop rows, input coverage, access requirements, mastery tooltip and batch recipes. Unlocked-only filtering follows skill/access requirements rather than hiding recipes simply because their ingredients are missing. Focus is the existing playable minigame. A label identifies an active activity from another category.

All Masterworks remain in their existing tabs. Catalyst and salvage settings, pantry/meal controls, rune resonance reference and map/Sextant supplies are available in collapsible panels. Greenhouse, gem recycling and culture merchants retain their controls. Fishing remains coming soon.

## Verification

- Disposable starter and stocked veteran characters; no real saves used.
- Started normal activities across all implemented professions; checked live status and Focus panels.
- Successful Woodcutting timing hit increased Focus speed; plain marker and Swing control work.
- Woodcutting Planks and unlocked 5×/50× batches remain selectable and start correctly.
- Excavation Dig/Stop and Restoration & Sifting checked in the fieldbook.
- Inspected Greenhouse, pantry/meal settings, rune reference, map case and Masterworks.
- Checked every redesigned profession at 390px phone width with no horizontal overflow.
- Full release-source test suite: 106 files, 1,748 tests pass; TypeScript passes.

Main implementation: `src/ui/components/ProfessionWorkbench.tsx`, `profession-workbench.css`, `ThievingLedger.tsx`, `thieving-ledger.css`, `src/ui/pages/SkillPage.tsx` and `src/ui/components/ExpeditionBoard.tsx`. Reusable local browser controls: `?professionPlaytest` in development builds.

# Cartography

Act 6's skill, planned in [ACTS_4_6.md](ACTS_4_6.md). Built 2026-11-01. Maps drop from monsters, and Cartography is the
optional second route: you **draw** a map of the theme you pick, **upgrade** it to a higher tier, and bind **folios** for
a long offline grind. It's trained during Act 6, so it's ready when the Map Device opens.

## What it adds over drops

A dropped map is a random theme. A drawn one is the theme you want, which is what auto-run asks for: it uses one kind until
none are left. So a night of Cartography, then a night of auto-run on that stack, is the loop. Nothing needs it: a run still
finds a bit under one map, and maps found in a run are sometimes one tier higher (15%, `MAP_DROPS.tierUp`), so every tier
can be reached by drops alone.

## Plugged into Maps

There is no second kind of map. A finished recipe adds to `s.maps.stock`, under the same ids drops use, through `addMaps`.
Upgrades take from that stock too, including maps you found. Recipes are built from `MAP_THEMES` and `CHART_TIERS`, so a new
theme gets its recipes by adding its `drawWith` in `src/data/maps.ts`. A new tier needs one line in `CHART_TIERS`, and a test
fails until it has it.

## Unlock

Every recipe has `gate: CARTOGRAPHY_GATE` (`src/data/cartography.ts`), which names the first area of Act 6 by looking it up,
so the Act 6 stages need no line changed here. The sidebar row and the hideout dial only show once that area is unlocked. The
Coming soon page keeps the skill listed until then, and its achievements are `act: 6`.

The maps you draw before the device wakes wait in the Map case on the skill's page.

## Recipes

Logs and plants become vellum and ink, and both become maps. On top, each theme costs something of its own: Bone Barrows a
Dense Fossil, Storm Vault a Greater Essence of Storm. Everything comes from gathering, or from the Bench's salvage for dust.

| Lv | Recipe | Time | Inputs | Makes |
|---|---|---|---|---|
| 1 | Vellum | 3.5s | 4 Ash Logs | 1 Vellum |
| 4 | Gall Ink | 4s | 3 Sunpetal, 1 Iron Ore | 1 Gall Ink |
| 10, 13 | Draw T1 | 12s | 4 Vellum, 2 Gall Ink, theme item | 1 T1 map |
| 15 | Fine Vellum | 5s | 5 Oak Logs, 2 Vellum | 1 Fine Vellum |
| 20 | Sepia Ink | 5.5s | 3 Emberroot, 1 Gall Ink, 4 Arcane Dust | 1 Sepia Ink |
| 25, 28 | Upgrade to T2 | 16s | 3 T1 maps, 3 Fine Vellum, 2 Gall Ink, theme item | 1 T2 map |
| 32, 35 | Folio | 60s | 4× a T1 drawing | 5 T1 maps |
| 40, 43 | Upgrade to T3 | 20s | 3 T2 maps, 6 Fine Vellum, 3 Sepia Ink, theme item | 1 T3 map |

Two levels means one recipe per theme, in `MAP_THEMES` order.

## Map tiers

The preview had one tier, and "upgrade" needs somewhere to go, so tiers 2 and 3 were added to `MAP_TIERS` with the same kind
of placeholder numbers as tier 1. Milestone 8 sets the real tiers: the recipes follow.

## Skilling tree

A branch at 0°, between Woodcutting and Foraging.

| Node | Effect |
|---|---|
| Steady Line (small ×3) | 5% faster Cartography |
| Second Copy (Lv 15) | 15% chance to draw two for one |
| Surveyor's Eye (Lv 30) | Monsters drop maps 25% more often |
| Master Cartographer (keystone, Lv 50) | Upgrading a map uses 2 lower maps instead of 3. Cartography is 25% slower |

Surveyor's Eye helps the drop route on purpose, so the branch isn't wasted on someone who only runs maps. Steady Hands also
saves the lower maps of an upgrade.

## Mini-game

A survey. A landmark is hidden on a 7 by 4 grid of fog. Click a tile to sound it, and it shows how many steps off the
landmark is. Find it within 4 for a clean find, worth two swings like a cleared Archaeology plot, on the 5th for a weak hit,
and it's a miss if the 5th isn't it. It's the one skill game that's about working something out: two soundings from corners
nearly pin it down, so three is the skilled line. It's in `src/ui/components/minigames.tsx`, and the scoring is in
`src/engine/minigame.ts`.

## Saves

No version bump. `skills` and `lifetime` are in `MERGE_KEYS`, and maps already live in `s.maps`, so old saves load at level 1
with nothing drawn. `tests/cartography.test.ts` covers this.

## Art

`vellum`, `fine_vellum`, `gall_ink` and `sepia_ink` are pack stand-ins from Kibyra's consumables, because the pack has no
paper. The skill uses the Map Device's map icon.

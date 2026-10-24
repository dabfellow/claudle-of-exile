# Asset-pack mapping report

Asset packs mapped against the 187-slot art registry (`src/data/artManifest.ts`). What is wired in lives in `src/ui/assets.ts`, and this report is generated from it. Generated art dropped into `src/assets/art` always wins over pack art, slot by slot.

**Coverage: 187/187 slots have art (100.0%). 0 have none.**

Confidence: exact 2, close 79, placeholder 106, none 0. The placeholders come from a deliberately loose first pass: every remaining slot got the most appropriate art on hand, even when it only roughly fits. They are the slots to replace first when better art arrives (the "Weakest stand-ins" list below).

## Usable artwork per pack

| Pack (source) | Files | Unique usable artworks | Excluded |
|---|---|---|---|
| Dark fantasy Asset Pack 2 (Catalone) | 297 | 293 (149 weapons, 144 shields) | 4 composite sheets that duplicate the split icons |
| Fantasy Pixel Icons: Skills (SanguineNite) | 73 | 24 | 32px and 128px copies, manifest.json |
| Fantasy Pixel Icons: Elements (SanguineNite) | 73 | 24 | 32px and 128px copies, manifest.json |
| Woshi pixel item icons | 61 | 30 | 32px originals (64px is a 2× upscale; 64px used), README |
| rpg-items-all (CodeSpree) | 154 | 154 | none (no byte-identical files) |
| rpg-beings-all (CodeSpree) | 84 | 84 | none |
| Character avatar icons (Craftpix) | 87 | 42 | copies with a baked background, icons.psd, readme/licence |
| free_sample | 27 | 27 | none; JPG, no transparency |
| Softline RPG Icons FREE 100 (The Cooked Works) | 806 | 100 | Line/Fill alternates, 3 PNG sizes + SVG each, previews, licence |
| Painterly Backgrounds free (GegX) | 27 | 3 (forest, tavern, forest parallax set) | night/fog mood versions, 1280×720 copies, previews, docs |
| 32 Medieval Crafting Icons free | 161 | 32 | 32/128/256/512px copies, RPG Maker sheet |
| Grounded Medieval Remedies (Eldrion Team) | 89 | 16 | 128/256/512/1024px copies, 5 atlases, docs |

Total: 829 unique artworks out of 1,939 files. The first pass also reused unused Kibyra and gear-set art that was already in the repo.

## How the art is used

- **Weapons, shields, armour:** Catalone and the gear sets (dark 64px pixel art). A few Kibyra pieces (dagger, wooden shield) and one CodeSpree stick fill the gaps.
- **Materials:** Woshi for copper ore, mithril ore, gem and gold; CodeSpree for iron ore (hematite), logs, dust and the four herbs; one Remedies bundle for frostleaf.
- **Currency:** mostly SanguineNite round icons, plus a Remedies bottle (alchemy), a crafting stone (scour) and shell (annul), and a CodeSpree disc (chaos).
- **Skill gems:** all 39 use SanguineNite icons, drawn inside the attribute-coloured gem so str/dex/int still shows.
- **Flasks:** Woshi, Kibyra, CodeSpree and Remedies bottles. `FlaskIcon` overlays a live charge meter on any flask art.
- **Monsters and portraits:** CodeSpree beings, Craftpix avatars and free_sample paintings. Pixel sprites scale with hard edges in big frames and smoothly in the small combat frames.
- **Stations:** Kibyra framed icons, shown in each station card's icon badge. The large station banner stays reserved for generated art.
- **Zones and scenes:** the only painted landscapes on hand are GegX's forest and tavern (day, night, fog, parallax), reused as mood backdrops. None of them shows the actual place.

## Earlier audit findings

- **Catalone Part 1** (jewellery, amulets, potions, relics) is not on disk; only Part 2 (weapons and shields) was downloaded. The 9 rings and amulets use loose gems and trinkets until it is.
- **Softline** glyphs are flat white UI symbols; only the plain ring is used (iron ring).
- **Missing licences:** Catalone, CodeSpree, SanguineNite and free_sample came without licence files (see `src/assets/CREDITS.md`).

## Weakest stand-ins (106), replace first

- **portraits** (3): trader, brannoc, class_mage
- **scenes** (2): title, hideout
- **stations** (2): alchemy_table, bench
- **zones** (8): mudflats, brinecaves, ashwood, blackreed, crypt, shipgrave, stormcliffs, sanctum
- **monsters** (29): zombie, wisp, crawler, sailor, siren, harrow, cinderhound, harpy, emberkin, pyre, lurker, stalker, fenwitch, sedge, ghoul, frostwraith, lich, tidecaller, gunner, wreckshaman, vosk, rockback, stormcaller, skarra, zealot, eel, coralgolem, priest, ysolde
- **currency** (10): transmute, augment, alteration, regal, chaos, annul, exalted, divine, expansion, instill
- **materials** (4): sunpetal, frostleaf, emberroot, voidbloom
- **flasks** (3): life_grand, diamond, ruby
- **items** (13): rusted_sword, driftwood_wand, plank_shield, kite_shield, tower_shield, coral_amulet, amber_amulet, jade_amulet, onyx_amulet, iron_ring, ruby_ring, sapphire_ring, topaz_ring
- **uniques** (6): miners_lament, windstep, alchemists_band, iron_bulwark, starforged_edge, titans_girth
- **gems** (26): heavy_strike, iron_guard, twin_strike, poison_dart, lacerate, shattering_blow, aftershock, retaliation, rallying_roar, flurry, virulence, ambush, hemorrhage, overload, inferno, soul_tap, brutality, faster_attacks, faster_casts, efficiency, critical_strikes, mana_leech, multistrike, spell_echo, chain, lingering

Custom art wanted most: the 8 area banners and 2 scenes (no fitting landscapes exist in any pack), the 9 rings and amulets (Catalone Part 1), and the four herbs: sunpetal, frostleaf, emberroot, voidbloom.

## Mapping (all 187 slots)

| Game asset ID | Source file | Confidence | Final destination | Notes |
|---|---|---|---|---|
| `portraits/trader` | `Craftpix avatars Transperent/con33.png` | placeholder | `src/assets/portraits/craftpix-con33.png` | first-pass stand-in |
| `portraits/brannoc` | `free_sample/a32.jpg` | placeholder | `src/assets/portraits/freesample-a32.jpg` | first-pass stand-in |
| `portraits/class_warrior` | `Craftpix avatars Transperent/con1.png` | close | `src/assets/portraits/craftpix-con1.png` | approved after review |
| `portraits/class_ranger` | `Craftpix avatars Transperent/con6.png` | close | `src/assets/portraits/craftpix-con6.png` | approved after review |
| `portraits/class_mage` | `Craftpix avatars Transperent/con12.png` | placeholder | `src/assets/portraits/craftpix-con12.png` | first-pass stand-in |
| `scenes/title` | `GegX painterly backgrounds: forest-night (1600px webp)` | placeholder | `src/assets/zones/gegx-forest-night.webp` | moonlit forest, not a coast |
| `scenes/hideout` | `GegX painterly backgrounds: tavern-night (1600px webp)` | placeholder | `src/assets/scenes/gegx-tavern-night.webp` | tavern interior at night, not a sea cave |
| `stations/map_device` | `Kibyra UI pack (already in repo): icons/navigation/portal.png` | close | `src/assets/icons/navigation/portal.png` | Kibyra portal |
| `stations/stash` | `Kibyra UI pack (already in repo): icons/navigation/chest-open.png` | close | `src/assets/icons/navigation/chest-open.png` | Kibyra open chest |
| `stations/forge` | `Kibyra UI pack (already in repo): icons/navigation/smithy.png` | close | `src/assets/icons/navigation/smithy.png` | Kibyra smithy |
| `stations/alchemy_table` | `Kibyra UI pack (already in repo): items/consumables/potion-green-shelf.png` | placeholder | `src/assets/items/consumables/potion-green-shelf.png` | Kibyra potion on a stand |
| `stations/bench` | `Kibyra UI pack (already in repo): ui/decorations/sign-hammer.png` | placeholder | `src/assets/ui/decorations/sign-hammer.png` | Kibyra hammer sign |
| `stations/vendor` | `Kibyra UI pack (already in repo): icons/navigation/market.png` | close | `src/assets/icons/navigation/market.png` | Kibyra market stall |
| `zones/mudflats` | `GegX painterly backgrounds: forest-day (1600px webp)` | placeholder | `src/assets/zones/gegx-forest-day.webp` | GegX forest/tavern mood piece; does not show this place |
| `zones/brinecaves` | `GegX painterly backgrounds: tavern-night (1600px webp)` | placeholder | `src/assets/scenes/gegx-tavern-night.webp` | GegX forest/tavern mood piece; does not show this place |
| `zones/ashwood` | `GegX painterly backgrounds: forest-fog (1600px webp)` | placeholder | `src/assets/zones/gegx-forest-fog.webp` | GegX forest/tavern mood piece; does not show this place |
| `zones/blackreed` | `GegX painterly backgrounds: forest-night (1600px webp)` | placeholder | `src/assets/zones/gegx-forest-night.webp` | GegX forest/tavern mood piece; does not show this place |
| `zones/crypt` | `GegX painterly backgrounds: tavern-fog (1600px webp)` | placeholder | `src/assets/zones/gegx-tavern-fog.webp` | GegX forest/tavern mood piece; does not show this place |
| `zones/shipgrave` | `GegX painterly backgrounds: forest-parallax (1600px webp)` | placeholder | `src/assets/zones/gegx-forest-parallax.webp` | GegX forest/tavern mood piece; does not show this place |
| `zones/stormcliffs` | `GegX painterly backgrounds: forest-fog (1600px webp)` | placeholder | `src/assets/zones/gegx-forest-fog.webp` | GegX forest/tavern mood piece; does not show this place |
| `zones/sanctum` | `GegX painterly backgrounds: tavern-day (1600px webp)` | placeholder | `src/assets/zones/gegx-tavern-day.webp` | GegX forest/tavern mood piece; does not show this place |
| `monsters/rat` | `CodeSpree rpg-beings-all/mouse.png` | close | `src/assets/monsters/codespree-mouse.png` | approved after review |
| `monsters/crab` | `CodeSpree rpg-beings-all/crab.png` | close | `src/assets/monsters/codespree-crab.png` | approved after review |
| `monsters/zombie` | `free_sample/op53.jpg` | placeholder | `src/assets/monsters/freesample-op53.jpg` | first-pass stand-in |
| `monsters/wisp` | `CodeSpree rpg-beings-all/rhunst.png` | placeholder | `src/assets/monsters/codespree-rhunst.png` | first-pass stand-in |
| `monsters/gorger` | `CodeSpree rpg-beings-all/toad.png` | close | `src/assets/monsters/codespree-toad.png` | giant toad |
| `monsters/crawler` | `CodeSpree rpg-beings-all/white cave spider.png` | placeholder | `src/assets/monsters/codespree-white-cave-spider.png` | first-pass stand-in |
| `monsters/brinebat` | `CodeSpree rpg-beings-all/bat.png` | close | `src/assets/monsters/codespree-bat.png` | approved after review |
| `monsters/sailor` | `free_sample/a10.jpg` | placeholder | `src/assets/monsters/freesample-a10.jpg` | first-pass stand-in |
| `monsters/siren` | `Craftpix avatars Transperent/con41.png` | placeholder | `src/assets/monsters/craftpix-con41.png` | first-pass stand-in |
| `monsters/harrow` | `free_sample/ik52.jpg` | placeholder | `src/assets/monsters/freesample-ik52.jpg` | first-pass stand-in |
| `monsters/cinderhound` | `Craftpix avatars Transperent/con21.png` | placeholder | `src/assets/monsters/craftpix-con21.png` | first-pass stand-in |
| `monsters/treant` | `Craftpix avatars Transperent/con15.png` | close | `src/assets/monsters/craftpix-con15.png` | approved after review |
| `monsters/harpy` | `Craftpix avatars Transperent/con32.png` | placeholder | `src/assets/monsters/craftpix-con32.png` | first-pass stand-in |
| `monsters/emberkin` | `Craftpix avatars Transperent/con10.png` | placeholder | `src/assets/monsters/craftpix-con10.png` | first-pass stand-in |
| `monsters/pyre` | `Craftpix avatars Transperent/con25.png` | placeholder | `src/assets/monsters/craftpix-con25.png` | first-pass stand-in |
| `monsters/lurker` | `CodeSpree rpg-beings-all/sasquatch.png` | placeholder | `src/assets/monsters/codespree-sasquatch.png` | first-pass stand-in |
| `monsters/stalker` | `Craftpix avatars Transperent/con11.png` | placeholder | `src/assets/monsters/craftpix-con11.png` | first-pass stand-in |
| `monsters/toad` | `CodeSpree rpg-beings-all/niptoad.png` | close | `src/assets/monsters/codespree-niptoad.png` | approved after review |
| `monsters/fenwitch` | `Craftpix avatars Transperent/con2.png` | placeholder | `src/assets/monsters/craftpix-con2.png` | first-pass stand-in |
| `monsters/sedge` | `Craftpix avatars Transperent/con16.png` | placeholder | `src/assets/monsters/craftpix-con16.png` | first-pass stand-in |
| `monsters/ghoul` | `free_sample/a61.jpg` | placeholder | `src/assets/monsters/freesample-a61.jpg` | first-pass stand-in |
| `monsters/frostwraith` | `free_sample/op36.jpg` | placeholder | `src/assets/monsters/freesample-op36.jpg` | first-pass stand-in |
| `monsters/skeleton` | `free_sample/mobiszon999.jpg` | close | `src/assets/monsters/freesample-mobiszon999.jpg` | approved after review |
| `monsters/lich` | `free_sample/kociotrup.jpg` | placeholder | `src/assets/monsters/freesample-kociotrup.jpg` | first-pass stand-in |
| `monsters/tidecaller` | `free_sample/moooob27.jpg` | placeholder | `src/assets/monsters/freesample-moooob27.jpg` | first-pass stand-in |
| `monsters/brute` | `free_sample/a43.jpg` | close | `src/assets/monsters/freesample-a43.jpg` | ogre |
| `monsters/gunner` | `Craftpix avatars Transperent/con9.png` | placeholder | `src/assets/monsters/craftpix-con9.png` | first-pass stand-in |
| `monsters/gulls` | `CodeSpree rpg-beings-all/gull.png` | close | `src/assets/monsters/codespree-gull.png` | approved after review |
| `monsters/wreckshaman` | `Craftpix avatars Transperent/con19.png` | placeholder | `src/assets/monsters/craftpix-con19.png` | first-pass stand-in |
| `monsters/vosk` | `Craftpix avatars Transperent/con4.png` | placeholder | `src/assets/monsters/craftpix-con4.png` | first-pass stand-in |
| `monsters/ravager` | `free_sample/p19.jpg` | close | `src/assets/monsters/freesample-p19.jpg` | approved after review |
| `monsters/galeborn` | `CodeSpree rpg-beings-all/gust.png` | close | `src/assets/monsters/codespree-gust.png` | approved after review |
| `monsters/rockback` | `CodeSpree rpg-beings-all/geograb.png` | placeholder | `src/assets/monsters/codespree-geograb.png` | first-pass stand-in |
| `monsters/stormcaller` | `Craftpix avatars Transperent/con3.png` | placeholder | `src/assets/monsters/craftpix-con3.png` | first-pass stand-in |
| `monsters/skarra` | `CodeSpree rpg-beings-all/gray parrot.png` | placeholder | `src/assets/monsters/codespree-gray-parrot.png` | first-pass stand-in |
| `monsters/zealot` | `free_sample/mobeK1S.jpg` | placeholder | `src/assets/monsters/freesample-mobeK1S.jpg` | first-pass stand-in |
| `monsters/eel` | `CodeSpree rpg-beings-all/electric eel.png` | placeholder | `src/assets/monsters/codespree-electric-eel.png` | first-pass stand-in |
| `monsters/coralgolem` | `Craftpix avatars Transperent/con13.png` | placeholder | `src/assets/monsters/craftpix-con13.png` | first-pass stand-in |
| `monsters/priest` | `Craftpix avatars Transperent/con39.png` | placeholder | `src/assets/monsters/craftpix-con39.png` | first-pass stand-in |
| `monsters/ysolde` | `free_sample/a66.jpg` | placeholder | `src/assets/monsters/freesample-a66.jpg` | first-pass stand-in |
| `currency/transmute` | `SanguineNite 64/aether-comet.png` | placeholder | `src/assets/items/currency/sn-aether-comet.png` | first-pass stand-in |
| `currency/augment` | `SanguineNite 64/light-beam.png` | placeholder | `src/assets/items/currency/sn-light-beam.png` | first-pass stand-in |
| `currency/alteration` | `SanguineNite 64/tornado.png` | placeholder | `src/assets/items/currency/sn-tornado.png` | first-pass stand-in |
| `currency/regal` | `SanguineNite 64/revival.png` | placeholder | `src/assets/items/currency/sn-revival.png` | first-pass stand-in |
| `currency/alchemy` | `Grounded Medieval Remedies 64x64/honey_vinegar_tonic.png` | close | `src/assets/items/currency/remedies-honey-vinegar-tonic.png` | round glass, golden liquid |
| `currency/scour` | `32 Medieval Crafting Icons 64x64/stone_01.png` | close | `src/assets/items/currency/craft32-stone.png` | rough grey stone |
| `currency/chaos` | `CodeSpree rpg-items-all/copper disk.png` | placeholder | `src/assets/items/currency/codespree-copper-disk.png` | orange disc |
| `currency/annul` | `32 Medieval Crafting Icons 64x64/shell_01.png` | placeholder | `src/assets/items/currency/craft32-shell.png` | pearly shell |
| `currency/exalted` | `SanguineNite 64/blessed-orb.png` | placeholder | `src/assets/items/currency/sn-blessed-orb.png` | first-pass stand-in |
| `currency/divine` | `SanguineNite 64/holy-flare.png` | placeholder | `src/assets/items/currency/sn-holy-flare.png` | first-pass stand-in |
| `currency/regret` | `SanguineNite 64/verdant-cycle.png` | close | `src/assets/items/currency/sn-verdant-cycle.png` | green spiral |
| `currency/expansion` | `SanguineNite 64/void-lance.png` | placeholder | `src/assets/items/currency/sn-void-lance.png` | first-pass stand-in |
| `currency/instill` | `SanguineNite 64/fire-barrier.png` | placeholder | `src/assets/items/currency/sn-fire-barrier.png` | first-pass stand-in |
| `materials/gold` | `Woshi 64/gold_coin.png` | close | `src/assets/items/materials/woshi-gold_coin.png` | one coin rather than a stack |
| `materials/copper_ore` | `Woshi 64/copper_ore.png` | exact | `src/assets/items/materials/woshi-copper_ore.png` |  |
| `materials/iron_ore` | `CodeSpree rpg-items-all/hematite.png` | close | `src/assets/items/materials/codespree-hematite.png` | hematite: rusty red-grey ore, matches the description better than Woshi |
| `materials/mithril_ore` | `Woshi 64/iron_ore.png` | close | `src/assets/items/materials/woshi-iron_ore.png` | Woshi's iron ore: grey rock with silver flecks |
| `materials/rough_gem` | `Woshi 64/gem.png` | close | `src/assets/items/materials/woshi-gem.png` | purple gem, but cut rather than rough |
| `materials/ash_log` | `CodeSpree rpg-items-all/willow log.png` | close | `src/assets/items/materials/codespree-willow-log.png` | pale grey-olive bark, cream end |
| `materials/oak_log` | `CodeSpree rpg-items-all/cedar log.png` | close | `src/assets/items/materials/codespree-cedar-log.png` | dark brown bark, ringed end |
| `materials/yew_log` | `CodeSpree rpg-items-all/red pine log.png` | close | `src/assets/items/materials/codespree-red-pine-log.png` | reddish bark; cut end is pale |
| `materials/sunpetal` | `CodeSpree rpg-items-all/fritillaria.png` | placeholder | `src/assets/items/materials/codespree-fritillaria.png` | orange flowering plant, not a single yellow flower |
| `materials/frostleaf` | `Grounded Medieval Remedies 64x64/sage_bundle.png` | placeholder | `src/assets/items/materials/remedies-sage-bundle.png` | bundle of pale sage leaves |
| `materials/emberroot` | `CodeSpree rpg-items-all/heartroot.png` | placeholder | `src/assets/items/materials/codespree-heartroot.png` | red bulbous root; no glow |
| `materials/voidbloom` | `CodeSpree rpg-items-all/rose.png` | placeholder | `src/assets/items/materials/codespree-rose.png` | dark red roses, not purple |
| `materials/arcane_dust` | `CodeSpree rpg-items-all/character powder.png` | close | `src/assets/items/materials/codespree-character-powder.png` | pink-purple powder heap |
| `flasks/life_small` | `Woshi 64/potion_health.png` | close | `src/assets/items/flasks/woshi-potion_health.png` | charge meter overlaid |
| `flasks/life_medium` | `Kibyra UI pack (already in repo): items/consumables/potion-red.png` | close | `src/assets/items/consumables/potion-red.png` | Kibyra red potion |
| `flasks/life_grand` | `Kibyra UI pack (already in repo): items/consumables/potion-red-shelf.png` | placeholder | `src/assets/items/consumables/potion-red-shelf.png` | Kibyra red potion on a stand |
| `flasks/mana_small` | `Woshi 64/potion_mana.png` | close | `src/assets/items/flasks/woshi-potion_mana.png` | charge meter overlaid |
| `flasks/mana_medium` | `Kibyra UI pack (already in repo): items/consumables/potion-blue.png` | close | `src/assets/items/consumables/potion-blue.png` | Kibyra blue potion |
| `flasks/granite` | `Kibyra UI pack (already in repo): ui/decorations/bottle-grey.png` | close | `src/assets/ui/decorations/bottle-grey.png` | Kibyra grey bottle |
| `flasks/quicksilver` | `CodeSpree rpg-items-all/vial mercury.png` | close | `src/assets/items/flasks/codespree-vial-mercury.png` | glass vial of mercury |
| `flasks/diamond` | `CodeSpree rpg-items-all/glass vial.png` | placeholder | `src/assets/items/flasks/codespree-glass-vial.png` | plain clear vial |
| `flasks/ruby` | `Grounded Medieval Remedies 64x64/willow_bark_decoction.png` | placeholder | `src/assets/items/flasks/remedies-willow-bark-decoction.png` | dark red round bottle, photoreal |
| `items/rusted_sword` | `Catalone weapon_split/4_part_002.png` | placeholder | `src/assets/items/weapons/catalone-w4-002.png` | worn jagged dark blade; not rusty |
| `items/whittled_dagger` | `Kibyra UI pack (already in repo): items/weapons/dagger.png` | close | `src/assets/items/weapons/dagger.png` | Kibyra dagger: iron blade, wooden grip; brighter style |
| `items/driftwood_wand` | `CodeSpree rpg-items-all/stick.png` | placeholder | `src/assets/items/weapons/codespree-stick.png` | wooden stick |
| `items/iron_blade` | `Catalone weapon_split/7_part_014.png` | close | `src/assets/items/weapons/catalone-w7-014.png` | plain straight longsword; dark blade, gold guard |
| `items/glinting_dagger` | `Catalone weapon_split/5_part_004.png` | close | `src/assets/items/weapons/catalone-w5-004.png` | small steel dagger; small red gem in guard |
| `items/war_axe` | `Catalone weapon_split/3_part_015.png` | close | `src/assets/items/weapons/catalone-w3-015.png` | one-handed axe, dark iron head, wooden haft |
| `items/steel_broadsword` | `Catalone weapon_split/1_part_002.png` | close | `src/assets/items/weapons/catalone-w1-002.png` | wide straight blade, brass cross guard |
| `items/mithril_sabre` | `Catalone weapon_split/3_part_007.png` | close | `src/assets/items/weapons/catalone-w3-007.png` | curved pale blue-teal sabre |
| `items/plank_shield` | `Kibyra UI pack (already in repo): ui/decorations/shield-round-wood.png` | placeholder | `src/assets/ui/decorations/shield-round-wood.png` | Kibyra round wooden shield; round, not planks |
| `items/buckler` | `Catalone shield_split/10_part_004.png` | close | `src/assets/items/armor/catalone-s10-004.png` | small round wood shield, iron rim and boss |
| `items/kite_shield` | `Catalone shield_split/4_part_009.png` | placeholder | `src/assets/items/armor/catalone-s4-009.png` | kite with an emblem |
| `items/tower_shield` | `Catalone shield_split/8_part_005.png` | placeholder | `src/assets/items/armor/catalone-s8-005.png` | silver heater with a gem; not rectangular |
| `items/iron_hat` | `gear sets/set-85-helmet.png` | close | `src/assets/items/armor/set-85-helmet.png` | gear set, integrated before these packs |
| `items/leather_cap` | `gear sets/set-64-helmet.png` | close | `src/assets/items/armor/set-64-helmet.png` | gear set, integrated before these packs |
| `items/soldier_helm` | `gear sets/set-44-helmet.png` | close | `src/assets/items/armor/set-44-helmet.png` | gear set, integrated before these packs |
| `items/hunter_hood` | `gear sets/set-62-helmet.png` | close | `src/assets/items/armor/set-62-helmet.png` | gear set, integrated before these packs |
| `items/great_helm` | `gear sets/set-56-helmet.png` | close | `src/assets/items/armor/set-56-helmet.png` | gear set, integrated before these packs |
| `items/shadow_mask` | `gear sets/set-35-helmet.png` | close | `src/assets/items/armor/set-35-helmet.png` | gear set, integrated before these packs |
| `items/plate_vest` | `gear sets/set-85-body.png` | close | `src/assets/items/armor/set-85-body.png` | gear set, integrated before these packs |
| `items/shabby_jerkin` | `gear sets/set-08-body.png` | close | `src/assets/items/armor/set-08-body.png` | gear set, integrated before these packs |
| `items/chainmail` | `gear sets/set-28-body.png` | close | `src/assets/items/armor/set-28-body.png` | gear set, integrated before these packs |
| `items/scale_leather` | `gear sets/set-67-body.png` | close | `src/assets/items/armor/set-67-body.png` | gear set, integrated before these packs |
| `items/mithril_plate` | `gear sets/set-56-body.png` | close | `src/assets/items/armor/set-56-body.png` | gear set, integrated before these packs |
| `items/assassin_garb` | `gear sets/set-35-body.png` | close | `src/assets/items/armor/set-35-body.png` | gear set, integrated before these packs |
| `items/iron_gauntlets` | `gear sets/set-85-gloves.png` | close | `src/assets/items/armor/set-85-gloves.png` | gear set, integrated before these packs |
| `items/rawhide_gloves` | `gear sets/set-64-gloves.png` | close | `src/assets/items/armor/set-64-gloves.png` | gear set, integrated before these packs |
| `items/steel_gauntlets` | `gear sets/set-43-gloves.png` | close | `src/assets/items/armor/set-43-gloves.png` | gear set, integrated before these packs |
| `items/stealth_gloves` | `gear sets/set-83-gloves.png` | close | `src/assets/items/armor/set-83-gloves.png` | gear set, integrated before these packs |
| `items/iron_greaves` | `gear sets/set-09-legs.png` | close | `src/assets/items/armor/set-09-legs.png` | gear set, integrated before these packs |
| `items/leather_boots` | `gear sets/set-39-legs.png` | close | `src/assets/items/armor/set-39-legs.png` | gear set, integrated before these packs |
| `items/steel_greaves` | `gear sets/set-43-legs.png` | close | `src/assets/items/armor/set-43-legs.png` | gear set, integrated before these packs |
| `items/shagreen_boots` | `gear sets/set-67-legs.png` | close | `src/assets/items/armor/set-67-legs.png` | gear set, integrated before these packs |
| `items/chain_belt` | `gear sets/set-07-belt.png` | close | `src/assets/items/armor/set-07-belt.png` | gear set, integrated before these packs |
| `items/leather_belt` | `gear sets/set-75-helmet.png` | close | `src/assets/items/armor/set-75-helmet.png` | gear set 75's 'helmet' file is a leather belt with a gold buckle |
| `items/heavy_belt` | `gear sets/set-63-belt.png` | close | `src/assets/items/armor/set-63-belt.png` | gear set, integrated before these packs |
| `items/coral_amulet` | `CodeSpree rpg-items-all/carrageen moss.png` | placeholder | `src/assets/items/jewelry/codespree-carrageen-moss.png` | red coral-like seaweed; no cord |
| `items/amber_amulet` | `32 Medieval Crafting Icons 64x64/glue_01.png` | placeholder | `src/assets/items/jewelry/craft32-glue.png` | amber-coloured block; no chain |
| `items/jade_amulet` | `Kibyra UI pack (already in repo): items/currency/gem-green.png` | placeholder | `src/assets/items/currency/gem-green.png` | loose green gem |
| `items/onyx_amulet` | `CodeSpree rpg-items-all/thorn dragon egg.png` | placeholder | `src/assets/items/jewelry/codespree-thorn-dragon-egg.png` | dark egg-shaped stone |
| `items/iron_ring` | `Kibyra UI pack (already in repo): items/jewelry/softline-ring.png` | placeholder | `src/assets/items/jewelry/softline-ring.png` | flat white ring glyph |
| `items/ruby_ring` | `Kibyra UI pack (already in repo): items/currency/gem-red.png` | placeholder | `src/assets/items/currency/gem-red.png` | loose red gem |
| `items/sapphire_ring` | `Woshi 64/crystal.png` | placeholder | `src/assets/items/jewelry/woshi-crystal.png` | loose blue crystal |
| `items/topaz_ring` | `CodeSpree rpg-items-all/badge.png` | placeholder | `src/assets/items/jewelry/codespree-badge.png` | loose orange-red gem |
| `items/diamond_ring` | `Kibyra UI pack (already in repo): items/jewelry/ring.png` | close | `src/assets/items/jewelry/ring.png` | Kibyra gold ring with a clear stone |
| `uniques/miners_lament` | `gear sets/set-55-helmet.png` | placeholder | `src/assets/items/armor/set-55-helmet.png` | plain iron helmet; no lantern |
| `uniques/bloodthirst` | `Catalone weapon_split/2_part_008.png` | close | `src/assets/items/weapons/catalone-w2-008.png` | short sword with a red streak down the blade |
| `uniques/emberheart` | `gear sets/set-10-body.png` | close | `src/assets/items/armor/set-10-body.png` | gold breastplate with an orange stone in the chest |
| `uniques/windstep` | `gear sets/set-04-legs.png` | placeholder | `src/assets/items/armor/set-04-legs.png` | brown fur-trimmed boots; no feathers |
| `uniques/alchemists_band` | `CodeSpree rpg-items-all/vial slug gel.png` | placeholder | `src/assets/items/jewelry/codespree-vial-slug-gel.png` | vial of green gel; no ring |
| `uniques/iron_bulwark` | `Catalone shield_split/9_part_005.png` | placeholder | `src/assets/items/armor/catalone-s9-005.png` | studded iron kite with red gem |
| `uniques/starforged_edge` | `Catalone weapon_split/9_part_010.png` | placeholder | `src/assets/items/weapons/catalone-w9-010.png` | dark straight blade with violet vein |
| `uniques/titans_girth` | `gear sets/set-63-belt.png` | placeholder | `src/assets/items/armor/set-63-belt.png` | same art as its Heavy Belt base |
| `gems/heavy_strike` | `SanguineNite 64/dragons-might.png` | placeholder | `src/assets/icons/gems/sn-dragons-might.png` | first-pass stand-in |
| `gems/ground_slam` | `SanguineNite 64/earth-spike.png` | close | `src/assets/icons/gems/sn-earth-spike.png` | ground eruption |
| `gems/iron_guard` | `SanguineNite 64/cyclone-ward.png` | placeholder | `src/assets/icons/gems/sn-cyclone-ward.png` | first-pass stand-in |
| `gems/war_cry` | `SanguineNite 64/berserk.png` | close | `src/assets/icons/gems/sn-berserk.png` | roaring head |
| `gems/twin_strike` | `SanguineNite 64/lancer.png` | placeholder | `src/assets/icons/gems/sn-lancer.png` | first-pass stand-in |
| `gems/poison_dart` | `SanguineNite 64/blight-smite.png` | placeholder | `src/assets/icons/gems/sn-blight-smite.png` | first-pass stand-in |
| `gems/smoke_step` | `SanguineNite 64/jade-dash.png` | close | `src/assets/icons/gems/sn-jade-dash.png` | green evasive dash |
| `gems/lacerate` | `SanguineNite 64/crimson-vortex.png` | placeholder | `src/assets/icons/gems/sn-crimson-vortex.png` | first-pass stand-in |
| `gems/spark` | `SanguineNite 64/shock-ball.png` | close | `src/assets/icons/gems/sn-shock-ball.png` | lightning ball |
| `gems/fireball` | `SanguineNite 64/firebolt.png` | exact | `src/assets/icons/gems/sn-firebolt.png` |  |
| `gems/frost_ward` | `SanguineNite 64/frozen.png` | close | `src/assets/icons/gems/sn-frozen.png` | figure encased in ice |
| `gems/arcane_siphon` | `SanguineNite 64/consuming-dark.png` | close | `src/assets/icons/gems/sn-consuming-dark.png` | dark draining figure |
| `gems/shattering_blow` | `SanguineNite 64/harbinger.png` | placeholder | `src/assets/icons/gems/sn-harbinger.png` | first-pass stand-in |
| `gems/aftershock` | `SanguineNite 64/meteor-collide.png` | placeholder | `src/assets/icons/gems/sn-meteor-collide.png` | first-pass stand-in |
| `gems/retaliation` | `SanguineNite 64/crimson-bind.png` | placeholder | `src/assets/icons/gems/sn-crimson-bind.png` | first-pass stand-in |
| `gems/rallying_roar` | `SanguineNite 64/lycan-fury.png` | placeholder | `src/assets/icons/gems/sn-lycan-fury.png` | first-pass stand-in |
| `gems/flurry` | `SanguineNite 64/gale-force.png` | placeholder | `src/assets/icons/gems/sn-gale-force.png` | first-pass stand-in |
| `gems/virulence` | `SanguineNite 64/nature-heal.png` | placeholder | `src/assets/icons/gems/sn-nature-heal.png` | first-pass stand-in |
| `gems/ambush` | `SanguineNite 64/dead-facade.png` | placeholder | `src/assets/icons/gems/sn-dead-facade.png` | first-pass stand-in |
| `gems/hemorrhage` | `SanguineNite 64/burning-blood.png` | placeholder | `src/assets/icons/gems/sn-burning-blood.png` | first-pass stand-in |
| `gems/overload` | `SanguineNite 64/dark-bolt.png` | placeholder | `src/assets/icons/gems/sn-dark-bolt.png` | first-pass stand-in |
| `gems/inferno` | `SanguineNite 64/infernal-vision.png` | placeholder | `src/assets/icons/gems/sn-infernal-vision.png` | first-pass stand-in |
| `gems/glacial_shell` | `SanguineNite 64/glacial-eruption.png` | close | `src/assets/icons/gems/sn-glacial-eruption.png` | looks similar to Added Cold |
| `gems/soul_tap` | `SanguineNite 64/arcane-renewal.png` | placeholder | `src/assets/icons/gems/sn-arcane-renewal.png` | first-pass stand-in |
| `gems/added_fire` | `SanguineNite 64/ember-might.png` | close | `src/assets/icons/gems/sn-ember-might.png` |  |
| `gems/added_cold` | `SanguineNite 64/ice-spikes.png` | close | `src/assets/icons/gems/sn-ice-spikes.png` |  |
| `gems/added_lightning` | `SanguineNite 64/electrify.png` | close | `src/assets/icons/gems/sn-electrify.png` |  |
| `gems/brutality` | `SanguineNite 64/conjure-demon.png` | placeholder | `src/assets/icons/gems/sn-conjure-demon.png` | first-pass stand-in |
| `gems/elemental_focus` | `SanguineNite 64/frostflame-confluence.png` | close | `src/assets/icons/gems/sn-frostflame-confluence.png` | fire and ice merged |
| `gems/faster_attacks` | `SanguineNite 64/arcane-arrows.png` | placeholder | `src/assets/icons/gems/sn-arcane-arrows.png` | first-pass stand-in |
| `gems/faster_casts` | `SanguineNite 64/shooting-stars.png` | placeholder | `src/assets/icons/gems/sn-shooting-stars.png` | first-pass stand-in |
| `gems/efficiency` | `SanguineNite 64/verdant-meditation.png` | placeholder | `src/assets/icons/gems/sn-verdant-meditation.png` | first-pass stand-in |
| `gems/critical_strikes` | `SanguineNite 64/woodland-archer.png` | placeholder | `src/assets/icons/gems/sn-woodland-archer.png` | first-pass stand-in |
| `gems/life_leech` | `SanguineNite 64/crimson-pulse.png` | close | `src/assets/icons/gems/sn-crimson-pulse.png` | blood-red vortex |
| `gems/mana_leech` | `SanguineNite 64/aether-spring.png` | placeholder | `src/assets/icons/gems/sn-aether-spring.png` | first-pass stand-in |
| `gems/multistrike` | `SanguineNite 64/dualstar.png` | placeholder | `src/assets/icons/gems/sn-dualstar.png` | first-pass stand-in |
| `gems/spell_echo` | `SanguineNite 64/warp.png` | placeholder | `src/assets/icons/gems/sn-warp.png` | first-pass stand-in |
| `gems/chain` | `SanguineNite 64/skeletal-lightning.png` | placeholder | `src/assets/icons/gems/sn-skeletal-lightning.png` | first-pass stand-in |
| `gems/lingering` | `SanguineNite 64/phantom-aura.png` | placeholder | `src/assets/icons/gems/sn-phantom-aura.png` | first-pass stand-in |

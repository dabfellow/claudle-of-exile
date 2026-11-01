# Asset-pack mapping report

Asset packs mapped against the 187-slot art registry (`src/data/artManifest.ts`). What is wired in lives in `src/ui/assets.ts`, and this report is generated from it. Asset packs are the game's real art. No AI art is generated for the game, though the GegX landscapes are AI-generated pack art (see "Act 2" below). Art dropped into `src/assets/art` wins over wired pack art, slot by slot.

**Coverage: 187/187 slots have art (100.0%). 0 have none.** Act 2's 46 monsters and uniques are listed in their own section below.

Confidence: exact 2, close 96, loose 89, none 0. The loose matches come from a deliberately broad first pass: every remaining slot got the most appropriate art on hand, even when it only roughly fits. They're the slots to swap first if a better pack piece turns up (the "Weakest stand-ins" list below).

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
| SnoopethDuckDuck shields, packs 1 to 3 | 223 PNGs | 80 | 0px and 2px outline copies, sheets, sources |
| RPG Weapons (quintino_pixels) | 1 Aseprite file | about 40 | Cards, Descriptions and credit layers |
| Pasted weapon sheet (source not recorded) | 1 | 30 | none |
| 32 icons (source not recorded) | 32 | 32 | none |
| Grounded Medieval Remedies (Eldrion Team) | 89 | 16 | 128/256/512/1024px copies, 5 atlases, docs |

Total: 829 unique artworks out of 1,939 files. The first pass also reused unused Kibyra and gear-set art that was already in the repo.

## How the art is used

- **Weapons, shields, armour:** Catalone and the gear sets (dark 64px pixel art), plus the 2026-10-31 weapon and shield packs (see "Item art added 2026-10-31"). A few Kibyra pieces (dagger, wooden shield) fill the gaps.
- **Materials:** Woshi for copper ore, mithril ore, gem and gold; CodeSpree for iron ore (hematite), logs, dust and the four herbs; one Remedies bundle for frostleaf.
- **Currency:** mostly SanguineNite round icons, plus a Remedies bottle (alchemy), a crafting stone (scour) and shell (annul), and a CodeSpree disc (chaos).
- **Skill gems:** all 39 use SanguineNite icons, drawn inside the attribute-coloured gem so str/dex/int still shows.
- **Flasks:** Woshi, Kibyra, CodeSpree and Remedies bottles. `FlaskIcon` overlays a live charge meter on any flask art.
- **Monsters and portraits:** CodeSpree beings, Craftpix avatars and free_sample paintings. Pixel sprites scale with hard edges in big frames and smoothly in the small combat frames.
- **Stations:** Kibyra framed icons, shown in each station card's icon badge. The large station banner stays reserved for generated art.
- **Zones and scenes:** the only painted landscapes on hand are GegX's forest and tavern (day, night, fog, parallax), reused as mood backdrops. None of them shows the actual place.

## Earlier audit findings

- **Catalone Part 1** (jewellery, amulets, potions, relics) is not on disk; only Part 2 (weapons and shields) was downloaded. The 9 rings and amulets now use tinted game-icons.net necklaces and rings (2026-10-25).
- **Softline** glyphs are flat white UI symbols; only the plain ring is used (iron ring).
- **Missing licences:** Catalone, CodeSpree, SanguineNite and free_sample came without licence files (see `src/assets/CREDITS.md`).

## Weakest stand-ins (93), replace first

- **portraits** (3): trader, brannoc, class_mage
- **scenes** (2): title, hideout
- **stations** (2): alchemy_table, bench
- **zones** (8): mudflats, brinecaves, ashwood, blackreed, crypt, shipgrave, stormcliffs, sanctum
- **monsters** (29): zombie, wisp, crawler, sailor, siren, harrow, cinderhound, harpy, emberkin, pyre, lurker, stalker, fenwitch, sedge, ghoul, frostwraith, lich, tidecaller, gunner, wreckshaman, vosk, rockback, stormcaller, skarra, zealot, eel, coralgolem, priest, ysolde
- **currency** (9): transmute, augment, alteration, regal, chaos, annul, exalted, divine, expansion
- **materials** (3): sunpetal, emberroot, voidbloom
- **items** (7): rusted_sword, plank_shield, kite_shield, coral_amulet, amber_amulet, jade_amulet, onyx_amulet
- **uniques** (4): miners_lament, windstep, iron_bulwark, titans_girth
- **gems** (26): heavy_strike, iron_guard, twin_strike, poison_dart, lacerate, shattering_blow, aftershock, retaliation, rallying_roar, flurry, virulence, ambush, hemorrhage, overload, inferno, soul_tap, brutality, faster_attacks, faster_casts, efficiency, critical_strikes, mana_leech, multistrike, spell_echo, chain, lingering

Custom art wanted most: the 8 area banners and 2 scenes (no fitting landscapes exist in any pack), the 4 amulets (Catalone Part 1), and three herbs: sunpetal, emberroot, voidbloom.

## Act 4 (added 2026-11-01)

All 60 Act 4 monsters and bosses have their own picture: 50 close, 10 loose. The raw packs aren't on this machine, so every one is a `tint-<id>` recolour of a pack sprite that was already in `src/assets`, a few of them recolours of earlier recolours. The packs have no giants as such, so giants use the biggest heads on hand (`freesample-a43`, `a10`, `mobeK1S`) and the mammoth is the boar-like `rhino` sprite. Five uniques use unused gear-set and Woshi pieces; `giants_knuckle` is a pale recolour of `quintino-q18.png`, as no unused hammer was left.

**Areas:** the 12 banners reuse GegX landscapes in `ZONE_ART` until the landscape pack arrives. Nothing new comes from GegX. Full briefs for them are in `ZONE_DESC` in `src/data/artManifest.ts`.

| Game asset ID | Source file | Confidence | Final destination | Notes |
|---|---|---|---|---|
| `monsters/snowwolf` | `src/assets/monsters/freesample-p19.jpg` | close | `src/assets/monsters/tint-snowwolf.jpg` | pale grey wolf. Recolour: saturation 0.4, brightness 1.1, tint 210,225,240 |
| `monsters/hillgiant` | `src/assets/monsters/freesample-a43.jpg` | close | `src/assets/monsters/tint-hillgiant.jpg` | heavy-browed brute, dusty; head only, no club. Recolour: tint 190,170,140 |
| `monsters/passtroll` | `src/assets/monsters/craftpix-con16.png` | close | `src/assets/monsters/tint-passtroll.png` | squat green-grey troll face. Recolour: tint 150,190,170 |
| `monsters/rimecaller` | `src/assets/portraits/craftpix-con12.png` | close | `src/assets/monsters/tint-rimecaller.png` | hooded caster in ice blue. Recolour: tint 170,210,240 |
| `monsters/hrolf` | `src/assets/monsters/freesample-a10.jpg` | close | `src/assets/monsters/tint-hrolf.jpg` | broad man in a stone wash; no beam. Recolour: tint 200,190,170 |
| `monsters/screegolem` | `src/assets/monsters/codespree-geograb.png` | close | `src/assets/monsters/tint-screegolem.png` | rock creature, grey. Recolour: saturation 0.3, tint 190,190,185 |
| `monsters/stonehawk` | `src/assets/monsters/craftpix-con32.png` | close | `src/assets/monsters/tint-stonehawk.png` | dark hawk head, stone grey. Recolour: tint 175,180,185 |
| `monsters/boulderthrower` | `src/assets/monsters/craftpix-con20.png` | placeholder | `src/assets/monsters/tint-boulderthrower.png` | padded hood, too small for a giant; no boulder. Recolour: tint 175,165,150 |
| `monsters/frostshrike` | `src/assets/monsters/codespree-gray-parrot.png` | close | `src/assets/monsters/tint-frostshrike.png` | perched bird in ice blue. Recolour: tint 170,210,240 |
| `monsters/asa` | `src/assets/monsters/freesample-a66.jpg` | placeholder | `src/assets/monsters/tint-asa.jpg` | stern woman, grey; no boulder. Recolour: saturation 0.3, tint 190,190,200 |
| `monsters/direwolf` | `src/assets/monsters/freesample-p19.jpg` | close | `src/assets/monsters/tint-direwolf.jpg` | snarling wolf in frost blue. Recolour: saturation 0.5, tint 140,190,230 |
| `monsters/fellbear` | `src/assets/monsters/craftpix-con27.png` | close | `src/assets/monsters/tint-fellbear.png` | heavy-jawed brown beast. Recolour: tint 160,130,110 |
| `monsters/windwraith` | `src/assets/monsters/codespree-gust.png` | close | `src/assets/monsters/tint-windwraith.png` | living whirlwind, ice blue. Recolour: tint 180,220,240 |
| `monsters/wolfshaman` | `src/assets/portraits/craftpix-con33.png` | close | `src/assets/monsters/tint-wolfshaman.png` | bearded hooded man, cold light. Recolour: tint 170,200,225 |
| `monsters/fenrik` | `src/assets/monsters/freesample-p19.jpg` | close | `src/assets/monsters/tint-fenrik.jpg` | huge dark grey wolf. Recolour: saturation 0.2, brightness 0.7 |
| `monsters/icefisher` | `src/assets/monsters/craftpix-con7.png` | close | `src/assets/monsters/tint-icefisher.png` | scale hood in lake blue; no harpoon. Recolour: tint 170,200,210 |
| `monsters/frostshell` | `src/assets/monsters/codespree-crab.png` | close | `src/assets/monsters/tint-frostshell.png` | crab, rimed pale. Recolour: saturation 0.2, tint 190,225,240 |
| `monsters/skater` | `src/assets/monsters/codespree-white-cave-spider.png` | close | `src/assets/monsters/tint-skater.png` | long-legged pale spider. Recolour: tint 170,210,235 |
| `monsters/undertow` | `src/assets/monsters/tint-mirage.png` | close | `src/assets/monsters/tint-undertow.png` | pale eyeless thing, drawn from the Act 2 mirage. Recolour: tint 170,210,225 |
| `monsters/mirrawen` | `src/assets/monsters/tint-glass.jpg` | close | `src/assets/monsters/tint-mirrawen.jpg` | silvered woman in ice blue. Recolour: tint 190,225,245 |
| `monsters/quarrygiant` | `src/assets/monsters/freesample-a43.jpg` | close | `src/assets/monsters/tint-quarrygiant.jpg` | brute, quarry grey. Recolour: saturation 0.5, brightness 0.9, tint 170,160,150 |
| `monsters/bonecutter` | `src/assets/monsters/craftpix-con21.png` | close | `src/assets/monsters/tint-bonecutter.png` | bone-masked creature. Recolour: tint 210,200,170 |
| `monsters/marrowhound` | `src/assets/monsters/craftpix-con27.png` | placeholder | `src/assets/monsters/tint-marrowhound.png` | long-jawed beast, bone white. Recolour: saturation 0.2, tint 200,210,225 |
| `monsters/gravethane` | `src/assets/monsters/freesample-mobiszon999.jpg` | close | `src/assets/monsters/tint-gravethane.jpg` | dead lord, frost-lit. Recolour: tint 170,200,225 |
| `monsters/ulfhild` | `src/assets/monsters/freesample-op53.jpg` | placeholder | `src/assets/monsters/tint-ulfhild.jpg` | scarred pale head; no hammer. Recolour: tint 200,190,170 |
| `monsters/vaultyeti` | `src/assets/monsters/codespree-sasquatch.png` | close | `src/assets/monsters/tint-vaultyeti.png` | shaggy upright beast, lightened. Recolour: saturation 0.4, brightness 3, tint 190,225,245 |
| `monsters/icespider` | `src/assets/monsters/codespree-white-cave-spider.png` | close | `src/assets/monsters/tint-icespider.png` | spider, deep blue. Recolour: saturation 0, tint 110,170,230 |
| `monsters/frostmite` | `src/assets/monsters/codespree-geograb.png` | placeholder | `src/assets/monsters/tint-frostmite.png` | rock creature in blue; not much of a mite. Recolour: saturation 0.6, tint 130,190,230 |
| `monsters/hoarfrost` | `src/assets/monsters/freesample-op36.jpg` | close | `src/assets/monsters/tint-hoarfrost.jpg` | hooded gaunt face. Recolour: tint 170,210,240 |
| `monsters/skaldi` | `src/assets/monsters/freesample-moooob27.jpg` | close | `src/assets/monsters/tint-skaldi.jpg` | blue-skinned bald head. Recolour: tint 180,215,240 |
| `monsters/mammoth` | `src/assets/monsters/tint-rhino.png` | close | `src/assets/monsters/tint-mammoth.png` | heavy tusked beast, shaggy brown; a boar more than a mammoth. Recolour: brightness 1.2, tint 190,150,115 |
| `monsters/herdsman` | `src/assets/monsters/craftpix-con20.png` | close | `src/assets/monsters/tint-herdsman.png` | padded hood, slate; no goad. Recolour: tint 150,165,190 |
| `monsters/snowlynx` | `src/assets/monsters/tint-grasscat.png` | close | `src/assets/monsters/tint-snowlynx.png` | crouching cat, white. Recolour: saturation 0, brightness 2, tint 225,230,240 |
| `monsters/tuskseer` | `src/assets/monsters/craftpix-con39.png` | placeholder | `src/assets/monsters/tint-tuskseer.png` | turbaned figure, cold. Recolour: tint 190,205,220 |
| `monsters/oldtusk` | `src/assets/monsters/tint-rhino.png` | close | `src/assets/monsters/tint-oldtusk.png` | the same beast, old and pale. Recolour: brightness 0.8, tint 200,180,160 |
| `monsters/glacierogre` | `src/assets/monsters/freesample-a43.jpg` | close | `src/assets/monsters/tint-glacierogre.jpg` | brute in glacier blue. Recolour: tint 150,190,220 |
| `monsters/crevasse` | `src/assets/monsters/craftpix-con11.png` | close | `src/assets/monsters/tint-crevasse.png` | dark beast with lit eyes. Recolour: tint 120,170,210 |
| `monsters/ropecutter` | `src/assets/monsters/craftpix-con9.png` | close | `src/assets/monsters/tint-ropecutter.png` | headband and mask, cold; no axe. Recolour: tint 170,190,215 |
| `monsters/avalanchepriest` | `src/assets/monsters/freesample-a61.jpg` | placeholder | `src/assets/monsters/tint-avalanchepriest.jpg` | bald gaunt figure, snow-lit. Recolour: hue 190, saturation 0.6, brightness 1.2 |
| `monsters/sigrun` | `src/assets/monsters/tint-qara.jpg` | close | `src/assets/monsters/tint-sigrun.jpg` | blue-haired woman, pale. Recolour: tint 200,235,245 |
| `monsters/steadgiant` | `src/assets/monsters/freesample-a43.jpg` | close | `src/assets/monsters/tint-steadgiant.jpg` | brute, weathered. Recolour: hue 20, saturation 0.7, brightness 1.1 |
| `monsters/frostgiant` | `src/assets/monsters/freesample-mobeK1S.jpg` | close | `src/assets/monsters/tint-frostgiant.jpg` | iron-faced giant in blue steel; no greataxe. Recolour: tint 150,190,235 |
| `monsters/wardog` | `src/assets/monsters/freesample-p19.jpg` | close | `src/assets/monsters/tint-wardog.jpg` | snarling brown hound. Recolour: hue 20, saturation 0.8, brightness 0.85 |
| `monsters/hearthwitch` | `src/assets/monsters/tint-saltwitch.png` | close | `src/assets/monsters/tint-hearthwitch.png` | hooded witch, cold grey. Recolour: tint 200,205,230 |
| `monsters/borghild` | `src/assets/monsters/freesample-a66.jpg` | placeholder | `src/assets/monsters/tint-borghild.jpg` | stern woman, weathered; no knife. Recolour: saturation 0.5, brightness 0.85, tint 210,190,170 |
| `monsters/hallgiant` | `src/assets/monsters/freesample-a10.jpg` | close | `src/assets/monsters/tint-hallgiant.jpg` | broad bare-shouldered man, ruddy. Recolour: hue 340, tint 200,170,140 |
| `monsters/jarl` | `src/assets/monsters/craftpix-con19.png` | close | `src/assets/monsters/tint-jarl.png` | winged helm, cold steel. Recolour: tint 170,200,235 |
| `monsters/skald` | `src/assets/monsters/craftpix-con4.png` | placeholder | `src/assets/monsters/tint-skald.png` | bearded smith; a cheerful face for a giant. Recolour: tint 190,210,225 |
| `monsters/meadwitch` | `src/assets/monsters/craftpix-con41.png` | placeholder | `src/assets/monsters/tint-meadwitch.png` | serpent-haired woman in honey gold; no cup. Recolour: tint 210,190,120 |
| `monsters/gunnvor` | `src/assets/monsters/freesample-a24.jpg` | close | `src/assets/monsters/tint-gunnvor.jpg` | horned face, turned blue. Recolour: hue 180 |
| `monsters/stairguard` | `src/assets/portraits/craftpix-con1.png` | close | `src/assets/monsters/tint-stairguard.png` | helmed guard; no maul. Recolour: tint 170,190,210 |
| `monsters/stormgiant` | `src/assets/monsters/tint-sunguard.jpg` | close | `src/assets/monsters/tint-stormgiant.jpg` | great armoured head, ice blue. Recolour: tint 170,215,235 |
| `monsters/stairwolf` | `src/assets/monsters/craftpix-con27.png` | close | `src/assets/monsters/tint-stairwolf.png` | long-jawed beast, blue. Recolour: hue 180, saturation 0.7 |
| `monsters/kingsrime` | `src/assets/portraits/craftpix-con6.png` | close | `src/assets/monsters/tint-kingsrime.png` | hooded herald, ice blue. Recolour: tint 190,225,240 |
| `monsters/hallvard` | `src/assets/monsters/freesample-mobeK1S.jpg` | close | `src/assets/monsters/tint-hallvard.jpg` | iron-faced captain, frosted. Recolour: saturation 0.3, brightness 1.2, tint 205,215,230 |
| `monsters/thronegiant` | `src/assets/monsters/tint-sunpriest.jpg` | close | `src/assets/monsters/tint-thronegiant.jpg` | huge smooth face, ice blue. Recolour: tint 170,210,235 |
| `monsters/hollowthane` | `src/assets/monsters/freesample-kociotrup.jpg` | close | `src/assets/monsters/tint-hollowthane.jpg` | bare skull, frost-lit. Recolour: tint 180,215,240 |
| `monsters/frozenhusk` | `src/assets/monsters/freesample-spalenie.jpg` | close | `src/assets/monsters/tint-frozenhusk.jpg` | dark skull, turned cold. Recolour: hue 200 |
| `monsters/wintervoice` | `src/assets/monsters/tint-barrowwight.png` | close | `src/assets/monsters/tint-wintervoice.png` | hooded wight, white. Recolour: tint 200,230,245 |
| `monsters/hollowking` | `src/assets/monsters/freesample-mobiszon999.jpg` | close | `src/assets/monsters/tint-hollowking.jpg` | dead king, hollow-eyed and pale; no sceptre. Recolour: saturation 0.4, brightness 1.1, tint 190,225,250 |
## Act 6 (added 2026-11-01)

All 90 Act 6 monsters and bosses have their own picture, and no two share one. All are `tint-<id>` recolours of owned CodeSpree, Craftpix and free_sample pieces, some of them new tints of pieces used in earlier acts, so nothing here is AI-generated and nothing new comes from GegX. The banners reuse the GegX scenes until a landscape pack arrives. Same tool as Act 5: sharp's `modulate` and `tint`, pixel art kept as PNG and painted art as JPG.

| Slot | Source | Confidence | File | Notes |
|---|---|---|---|---|
| `monsters/gatesentry` | `Craftpix con1` | close | `src/assets/monsters/tint-gatesentry.png` | helmed sentry, rimed. Recolour: saturation .3, tint 180,200,225 |
| `monsters/banishedhound` | `rpg-beings Blue dog` | close | `src/assets/monsters/tint-banishedhound.png` | hound, ember red. Recolour: hue 170, saturation .9, brightness .85 |
| `monsters/sealclerk` | `Craftpix con12` | close | `src/assets/monsters/tint-sealclerk.png` | hooded clerk, blue-lit. Recolour: hue 200, tint 190,200,240 |
| `monsters/gatecantor` | `Craftpix con22` | close | `src/assets/monsters/tint-gatecantor.png` | hooded cantor, void violet. Recolour: saturation .2, tint 170,160,220 |
| `monsters/corvane` | `free_sample mobeK1S` | placeholder | `src/assets/monsters/tint-corvane.jpg` | old helmed warden in tarnished steel; no keys. Recolour: hue 250, saturation .5, brightness .95 |
| `monsters/milestonewalker` | `rpg-beings Geograb` | placeholder | `src/assets/monsters/tint-milestonewalker.png` | walking stone in road-white, warm cracks. Recolour: saturation .4, lightness 20, tint 230,200,160 |
| `monsters/roadcrow` | `rpg-beings Pigeon` | close | `src/assets/monsters/tint-roadcrow.png` | dark crow, storm-lit. Recolour: saturation .2, brightness .5, tint 150,170,240 |
| `monsters/wagonghast` | `rpg-beings Rhunst` | close | `src/assets/monsters/tint-wagonghast.png` | frosted roadside ghost. Recolour: saturation .4, brightness .85, tint 170,200,240 |
| `monsters/roadreeve` | `Craftpix con33` | close | `src/assets/monsters/tint-roadreeve.png` | bearded road officer, dust-grey. Recolour: saturation .5, brightness .8, tint 195,185,165 |
| `monsters/haldane` | `free_sample a32` | placeholder | `src/assets/monsters/tint-haldane.jpg` | tired grey-faced official; no hook. Recolour: hue 30, saturation .7, brightness .9 |
| `monsters/tithereaper` | `Craftpix con21` | close | `src/assets/monsters/tint-tithereaper.png` | bone skull reaper, frost-blue. Recolour: tint 170,200,235 |
| `monsters/blackrook` | `rpg-beings Gray parrot` | close | `src/assets/monsters/tint-blackrook.png` | black bird, ember edges. Recolour: saturation .1, brightness .45, tint 235,140,80 |
| `monsters/scarecrowlord` | `Craftpix con15` | placeholder | `src/assets/monsters/tint-scarecrowlord.png` | bark-faced scarecrow, straw-yellow, lightning-lit. Recolour: saturation .4, tint 220,205,120 |
| `monsters/grainwitch` | `Craftpix con12` | close | `src/assets/monsters/tint-grainwitch.png` | hooded witch, burnt violet. Recolour: hue 300, saturation .7, brightness .75 |
| `monsters/lastreaper` | `free_sample kociotrup` | placeholder | `src/assets/monsters/tint-lastreaper.jpg` | pale skull, cold straw light; no scythe. Recolour: hue 170, saturation .35, brightness .9 |
| `monsters/garrisonman` | `Craftpix con9` | close | `src/assets/monsters/tint-garrisonman.png` | bandaged soldier, field-grey. Recolour: saturation .25, brightness .8, tint 170,175,185 |
| `monsters/wallarcher` | `Craftpix con6` | close | `src/assets/monsters/tint-wallarcher.png` | green hood gone storm-grey. Recolour: saturation .4, tint 165,185,235 |
| `monsters/fortmastiff` | `rpg-beings Hyena` | close | `src/assets/monsters/tint-fortmastiff.png` | spotted war dog, burnt. Recolour: saturation .5, brightness .7, tint 235,130,80 |
| `monsters/fortchaplain` | `Craftpix con24` | close | `src/assets/monsters/tint-fortchaplain.png` | pale high-collared chaplain, cold light. Recolour: saturation .3, tint 170,195,235 |
| `monsters/brandt` | `free_sample moooob28` | placeholder | `src/assets/monsters/tint-brandt.jpg` | orc-jawed officer, steel-blue. Recolour: hue 180, saturation .6, brightness .9 |
| `monsters/bannerman` | `Craftpix con19` | close | `src/assets/monsters/tint-bannerman.png` | winged helm, banner red. Recolour: saturation .6, tint 235,150,100 |
| `monsters/siegehusk` | `rpg-beings Sasquatch` | placeholder | `src/assets/monsters/tint-siegehusk.png` | huge shaggy husk, frozen over. Recolour: saturation .2, brightness .9, tint 170,195,235 |
| `monsters/warhawk` | `rpg-beings Thorn dragon` | placeholder | `src/assets/monsters/tint-warhawk.png` | black thorned bird of prey, storm-edged. Recolour: saturation .3, brightness .8, tint 170,190,245 |
| `monsters/fieldsurgeon` | `Craftpix con23` | close | `src/assets/monsters/tint-fieldsurgeon.png` | bone surgeon, violet-lit. Recolour: tint 200,180,235 |
| `monsters/ivarra` | `free_sample a66` | placeholder | `src/assets/monsters/tint-ivarra.jpg` | red-haired marshal; no baton. Recolour: hue 20, saturation .8, brightness .85 |
| `monsters/bailiff` | `Craftpix con3` | close | `src/assets/monsters/tint-bailiff.png` | hooded bailiff, cold blue. Recolour: saturation .3, tint 160,190,225 |
| `monsters/oathwitness` | `Craftpix con18` | close | `src/assets/monsters/tint-oathwitness.png` | blank dark mask, pale blue. Recolour: tint 190,200,250 |
| `monsters/pettifogger` | `rpg-beings Gossip` | placeholder | `src/assets/monsters/tint-pettifogger.png` | all mouth, burning. Recolour: saturation .8, tint 235,150,90 |
| `monsters/juror` | `Craftpix con11` | close | `src/assets/monsters/tint-juror.png` | black mask, cold red eyes. Recolour: tint 150,190,235 |
| `monsters/morrow` | `free_sample op53` | placeholder | `src/assets/monsters/tint-morrow.jpg` | stone-faced judge, lightning-pale. Recolour: hue 200, saturation .6, brightness .95 |
| `monsters/queuer` | `Craftpix con7` | close | `src/assets/monsters/tint-queuer.png` | patient dead, colour gone. Recolour: saturation .15, brightness .75 |
| `monsters/gutterrat` | `rpg-beings Mouse` | close | `src/assets/monsters/tint-gutterrat.png` | sewer rat, smouldering. Recolour: saturation .5, brightness .6, tint 240,150,80 |
| `monsters/lamplighter` | `Craftpix con39` | placeholder | `src/assets/monsters/tint-lamplighter.png` | turbaned figure, lamp-orange. Recolour: hue 180, saturation .6, tint 240,190,120 |
| `monsters/sewerpriest` | `Craftpix con34` | close | `src/assets/monsters/tint-sewerpriest.png` | wet one-eyed priest, storm-teal. Recolour: hue 200, saturation .8, tint 180,210,235 |
| `monsters/sarn` | `free_sample mobiszon997` | placeholder | `src/assets/monsters/tint-sarn.jpg` | huge roaring merchant, cold blue; no purse. Recolour: hue 210, saturation .5, brightness .95 |
| `monsters/sluicekeeper` | `Craftpix con20` | close | `src/assets/monsters/tint-sluicekeeper.png` | hooded keeper, wet blue. Recolour: saturation .4, tint 165,195,230 |
| `monsters/frostmoth` | `rpg-beings Common blue` | close | `src/assets/monsters/tint-frostmoth.png` | pale blue moth. Recolour: saturation .5, lightness 30 |
| `monsters/archgolem` | `rpg-beings Icewalker` | placeholder | `src/assets/monsters/tint-archgolem.png` | stone golem, hot at the joints. Recolour: saturation .3, tint 235,160,100 |
| `monsters/hangingdrop` | `rpg-beings Jellyfish` | placeholder | `src/assets/monsters/tint-hangingdrop.png` | hanging water, lightning in it. Recolour: saturation .8, tint 170,200,250 |
| `monsters/vossa` | `free_sample a10` | placeholder | `src/assets/monsters/tint-vossa.jpg` | heavy engineer, rust-green; no bob. Recolour: hue 120, saturation .6, brightness .9 |
| `monsters/coinstriker` | `Craftpix con4` | close | `src/assets/monsters/tint-coinstriker.png` | bearded smith, gold-dusted. Recolour: saturation .4, tint 235,205,120 |
| `monsters/goldbeetle` | `rpg-beings Lady beetle` | close | `src/assets/monsters/tint-goldbeetle.png` | gilded beetle. Recolour: saturation .3, tint 245,200,90 |
| `monsters/assayer` | `Craftpix con32` | placeholder | `src/assets/monsters/tint-assayer.png` | black bird mask, cold light. Recolour: saturation .2, tint 170,200,240 |
| `monsters/coinghost` | `Craftpix con35` | close | `src/assets/monsters/tint-coinghost.png` | white ghost, tarnished gold. Recolour: tint 240,220,140 |
| `monsters/mintmaster` | `free_sample mobilizacja` | placeholder | `src/assets/monsters/tint-mintmaster.jpg` | gold winged sign; a seal, not a person. Recolour: tint 245,210,120 |
| `monsters/thorngroom` | `Craftpix con15` | close | `src/assets/monsters/tint-thorngroom.png` | living bark, cold green. Recolour: hue 60, saturation 1.1, brightness .9 |
| `monsters/gardenwasp` | `rpg-beings Bee` | close | `src/assets/monsters/tint-gardenwasp.png` | wasp, charged blue. Recolour: saturation .7, tint 180,210,250 |
| `monsters/oldhedge` | `rpg-beings Spicatus` | placeholder | `src/assets/monsters/tint-oldhedge.png` | bristling hedge, smouldering. Recolour: saturation .9, tint 230,150,80 |
| `monsters/bloomwife` | `Craftpix con41` | close | `src/assets/monsters/tint-bloomwife.png` | snake-haired woman, leaf green. Recolour: saturation .8, brightness 1.05 |
| `monsters/queensgardener` | `free_sample a24` | placeholder | `src/assets/monsters/tint-queensgardener.jpg` | green-skinned horned gardener; no knife. Recolour: hue 120, saturation .7, brightness .9 |
| `monsters/scriptorghast` | `Craftpix con30` | close | `src/assets/monsters/tint-scriptorghast.png` | burning skull, ink-red. Recolour: hue 330, brightness .85 |
| `monsters/pagebat` | `rpg-beings Aurora bat` | close | `src/assets/monsters/tint-pagebat.png` | paper-white bat. Recolour: saturation .15, lightness 30, tint 220,225,250 |
| `monsters/indexer` | `Craftpix con10` | close | `src/assets/monsters/tint-indexer.png` | horned skull mask, shelf dust and cold. Recolour: saturation .4, tint 170,190,225 |
| `monsters/redactor` | `Craftpix con17` | close | `src/assets/monsters/tint-redactor.png` | crested mask, blotted violet. Recolour: saturation .2, tint 190,170,230 |
| `monsters/lastarchivist` | `free_sample p7` | placeholder | `src/assets/monsters/tint-lastarchivist.jpg` | long-haired old man, ink-dark. Recolour: hue 260, saturation .6, brightness .85 |
| `monsters/riftclimber` | `Craftpix con28` | close | `src/assets/monsters/tint-riftclimber.png` | dark finned climber, cold blue. Recolour: hue 190, brightness .8 |
| `monsters/edgeskater` | `rpg-beings Stabbycrab` | placeholder | `src/assets/monsters/tint-edgeskater.png` | long-legged skater, fire-edged. Recolour: hue 120, saturation .9 |
| `monsters/voidlight` | `rpg-beings Starflake` | close | `src/assets/monsters/tint-voidlight.png` | star of wrong light, violet. Recolour: hue 80, saturation 1.2, brightness .9 |
| `monsters/fracturepriest` | `Craftpix con36` | placeholder | `src/assets/monsters/tint-fracturepriest.png` | hooded serpent priest, abyss blue. Recolour: hue 110, saturation .7, brightness .8 |
| `monsters/riftwarden` | `free_sample szary kleszcz` | placeholder | `src/assets/monsters/tint-riftwarden.jpg` | pincered horror, void violet. Recolour: hue 230, saturation .6, brightness .9 |
| `monsters/footman` | `Craftpix con2` | placeholder | `src/assets/monsters/tint-footman.png` | grey-faced servant. Recolour: saturation .1, brightness .7 |
| `monsters/skywisp` | `rpg-beings Electrogust` | placeholder | `src/assets/monsters/tint-skywisp.png` | small sky storm, blue. Recolour: hue 170, saturation .7, brightness 1.1 |
| `monsters/dowager` | `Craftpix con38` | placeholder | `src/assets/monsters/tint-dowager.png` | plated dowager, candle-lit. Recolour: saturation .6, tint 240,170,110 |
| `monsters/noherald` | `Craftpix con40` | close | `src/assets/monsters/tint-noherald.png` | smiling yellow mask gone cold. Recolour: saturation .3, tint 170,190,240 |
| `monsters/vanterre` | `free_sample op36` | placeholder | `src/assets/monsters/tint-vanterre.jpg` | hooded noblewoman, wine-red. Recolour: hue 330, saturation .9, brightness .85 |
| `monsters/towermason` | `Craftpix con26` | placeholder | `src/assets/monsters/tint-towermason.png` | horned mason, hot-faced. Recolour: saturation .6, brightness .8, tint 235,170,120 |
| `monsters/stairgargoyle` | `Craftpix con42` | close | `src/assets/monsters/tint-stairgargoyle.png` | horned stone beast, rimed. Recolour: saturation .3, tint 165,195,235 |
| `monsters/stairspark` | `rpg-beings Stellectric` | close | `src/assets/monsters/tint-stairspark.png` | running spark, violet-white. Recolour: hue 200, brightness .9 |
| `monsters/stargazer` | `Craftpix con13` | close | `src/assets/monsters/tint-stargazer.png` | one great eye, storm-lit. Recolour: saturation .4, tint 190,195,250 |
| `monsters/astrologer` | `free_sample op36` | placeholder | `src/assets/monsters/tint-astrologer.jpg` | hooded stargazer, star-violet. Recolour: hue 250, saturation .8, brightness .9 |
| `monsters/courtier` | `Craftpix con8` | placeholder | `src/assets/monsters/tint-courtier.png` | smiling courtier, ghost-blue. Recolour: saturation .35, brightness .85, tint 180,190,240 |
| `monsters/splitguard` | `Craftpix con19` | close | `src/assets/monsters/tint-splitguard.png` | winged helm, split cold. Recolour: saturation .15, brightness .8, tint 165,185,220 |
| `monsters/kingsfool` | `rpg-beings Kuku` | placeholder | `src/assets/monsters/tint-kingsfool.png` | grinning fool, fire-orange. Recolour: hue 120, saturation 1, tint 240,170,110 |
| `monsters/royalconfessor` | `Craftpix con37` | close | `src/assets/monsters/tint-royalconfessor.png` | horned confessor, unholy violet. Recolour: saturation .5, brightness .7, tint 200,120,200 |
| `monsters/chamberlain` | `free_sample a61` | placeholder | `src/assets/monsters/tint-chamberlain.jpg` | bald cold-eyed courtier; no staff. Recolour: hue 200, saturation .6, brightness .9 |
| `monsters/oldking` | `Craftpix con21` | close | `src/assets/monsters/tint-oldking.png` | long bone skull, cold crown-light. Recolour: saturation .3, tint 190,205,240 |
| `monsters/tombguardian` | `rpg-beings Coral monster` | placeholder | `src/assets/monsters/tint-tombguardian.png` | many-armed tomb thing, molten. Recolour: saturation .2, lightness 15, tint 235,160,90 |
| `monsters/crownmite` | `rpg-beings Spicatus` | placeholder | `src/assets/monsters/tint-crownmite.png` | spiked crown-mite, gold and spark. Recolour: saturation .4, tint 245,225,140 |
| `monsters/linekeeper` | `Craftpix con24` | close | `src/assets/monsters/tint-linekeeper.png` | high-collared keeper, grave blue. Recolour: saturation .2, tint 190,205,235 |
| `monsters/crownbearer` | `free_sample mobiszon999` | placeholder | `src/assets/monsters/tint-crownbearer.jpg` | helmed skull, old gold; no cushion. Recolour: hue 30, saturation .8, brightness .95 |
| `monsters/stairknight` | `Craftpix con1` | close | `src/assets/monsters/tint-stairknight.png` | dark helmed knight, oath blue. Recolour: saturation .35, brightness .7, tint 165,185,235 |
| `monsters/kingshound` | `rpg-beings Wolf` | close | `src/assets/monsters/tint-kingshound.png` | black hound, coals in its throat. Recolour: saturation .5, brightness .6, tint 240,140,80 |
| `monsters/lastpage` | `Craftpix con5` | placeholder | `src/assets/monsters/tint-lastpage.png` | red-haired page, drained to blue. Recolour: saturation .2, tint 170,195,245 |
| `monsters/kingsvoice` | `Craftpix con11` | close | `src/assets/monsters/tint-kingsvoice.png` | black mask, unholy violet. Recolour: saturation .3, tint 200,170,245 |
| `monsters/ninthguard` | `free_sample moooob27` | placeholder | `src/assets/monsters/tint-ninthguard.jpg` | blue-faced guard, steel; the last loyal one. Recolour: hue 60, saturation .6, brightness .9 |
| `monsters/thronewatcher` | `Craftpix con13` | close | `src/assets/monsters/tint-thronewatcher.png` | one watching eye, cold. Recolour: saturation .3, brightness .7, tint 170,185,235 |
| `monsters/skysliver` | `rpg-beings Starfish` | placeholder | `src/assets/monsters/tint-skysliver.png` | a falling sliver of sky. Recolour: saturation .2, lightness 20, tint 200,215,255 |
| `monsters/ashofcourt` | `Craftpix con22` | close | `src/assets/monsters/tint-ashofcourt.png` | hooded ash, fire within. Recolour: saturation .1, tint 235,170,120 |
| `monsters/unanointed` | `Craftpix con30` | close | `src/assets/monsters/tint-unanointed.png` | burning skull, unholy violet fire. Recolour: hue 280, saturation .9, brightness .9 |
| `monsters/aurelane` | `free_sample ik52` | placeholder | `src/assets/monsters/tint-aurelane.jpg` | pale ruined face, violet-lit; no crown. Recolour: hue 290, saturation .6, brightness .8 |
| `uniques/oathbreaker` | `Kibyra mace.png` | close | `src/assets/items/weapons/tint-oathbreaker.png` | two-handed mace, void violet. Recolour: saturation .3, brightness .9, tint 200,150,235 |
| `uniques/kingsmarch` | `gear sets/set-10-legs.png` | close | `src/assets/items/armor/tint-kingsmarch.png` | gold boots, dulled. Recolour: saturation .4, tint 240,210,130 |
| `uniques/last_decree` | `pasted sheet 1, cell 26` | close | `src/assets/items/weapons/tint-last_decree.png` | wand, sealing-wax gold. Recolour: saturation .6, tint 240,210,130 |
| `uniques/crownbreaker_mask` | `gear sets/set-35-helmet.png` | close | `src/assets/items/armor/tint-crownbreaker_mask.png` | dark mask, violet. Recolour: saturation .4, tint 200,170,240 |
| `uniques/hand_of_the_regent` | `gear sets/set-85-gloves.png` | close | `src/assets/items/armor/tint-hand_of_the_regent.png` | plated gauntlets, old gold. Recolour: saturation .4, tint 245,205,120 |
| `uniques/regents_mantle` | `gear sets/set-56-body.png` | close | `src/assets/items/armor/tint-regents_mantle.png` | heavy plate, ceremonial gold. Recolour: saturation .5, tint 235,215,160 |

## Act 5 (added 2026-11-01)

All 70 Act 5 monsters and bosses have their own picture, and no two share one. All are `tint-<id>` recolours of owned CodeSpree, Craftpix and free_sample pieces, which brings many unused sea creatures into the game. Nothing here is AI-generated and nothing new comes from GegX. The banners reuse the GegX scenes until a landscape pack arrives.

| Slot | Source | Confidence | File | Notes |
|---|---|---|---|---|
| `monsters/pressganger` | `Craftpix con33` | close | `src/assets/monsters/tint-pressganger.png` | bearded hooded docker, sea-grey. Recolour: saturation .5, brightness .8, tint 150,165,175 |
| `monsters/dockrat` | `rpg-beings Mouse` | close | `src/assets/monsters/tint-dockrat.png` | tar-black rat, ember tint. Recolour: saturation .4, brightness .55, tint 215,130,70 |
| `monsters/harbourwatch` | `Craftpix con1` | close | `src/assets/monsters/tint-harbourwatch.png` | helmed watchman, harbour teal. Recolour: tint 150,190,200 |
| `monsters/saltcaulker` | `Craftpix con4` | close | `src/assets/monsters/tint-saltcaulker.png` | bearded workman, stained with pitch. Recolour: saturation .5, brightness .7, tint 200,150,110 |
| `monsters/creel` | `free_sample a10` | placeholder | `src/assets/monsters/tint-creel.jpg` | big man in harbour teal; no hook. Recolour: hue 170, saturation .6, brightness .85 |
| `monsters/hullbreaker` | `rpg-beings Angry crab` | close | `src/assets/monsters/tint-hullbreaker.png` | dark barnacled crab. Recolour: saturation .3, brightness .6, tint 170,150,130 |
| `monsters/flotsam` | `rpg-beings Tumbleweed` | placeholder | `src/assets/monsters/tint-flotsam.png` | a tangle of burning wrack. Recolour: tint 240,130,60 |
| `monsters/wreckgunner` | `Craftpix con3` | close | `src/assets/monsters/tint-wreckgunner.png` | hooded gunner, soot and fire. Recolour: saturation .6, tint 215,150,110 |
| `monsters/stormrigger` | `Craftpix con9` | close | `src/assets/monsters/tint-stormrigger.png` | bandana sailor, storm blue. Recolour: tint 130,170,230 |
| `monsters/gall` | `free_sample a43` | placeholder | `src/assets/monsters/tint-gall.jpg` | ogreish bosun, sea-green; no rope. Recolour: hue 90, saturation .8, brightness .9 |
| `monsters/tarwalker` | `rpg-beings Slime slug` | close | `src/assets/monsters/tint-tarwalker.png` | black tar thing, lit orange. Recolour: saturation .3, brightness .5, tint 220,120,60 |
| `monsters/steamkin` | `rpg-beings Gust` | close | `src/assets/monsters/tint-steamkin.png` | pale steam whirl with a face. Recolour: saturation .2, lightness 30, tint 225,225,215 |
| `monsters/obsidiancrab` | `rpg-beings Crab` | close | `src/assets/monsters/tint-obsidiancrab.png` | glass-black crab. Recolour: saturation .1, brightness .4, tint 150,130,190 |
| `monsters/keyshaman` | `Craftpix con28` | close | `src/assets/monsters/tint-keyshaman.png` | dark finned shaman, lava-lit. Recolour: tint 230,110,80 |
| `monsters/tarry` | `free_sample a66` | placeholder | `src/assets/monsters/tint-tarry.jpg` | dark-stained woman; no tar. Recolour: hue 340, saturation .7, brightness .75 |
| `monsters/stormgull` | `rpg-beings Gull` | close | `src/assets/monsters/tint-stormgull.png` | gull in storm blue. Recolour: tint 120,150,220 |
| `monsters/shoalstalker` | `Craftpix con34` | close | `src/assets/monsters/tint-shoalstalker.png` | one-eyed fish man, blue-green. Recolour: hue 150 |
| `monsters/sandback` | `rpg-beings Roman snail` | close | `src/assets/monsters/tint-sandback.png` | huge sand-coloured shell. Recolour: tint 200,185,140 |
| `monsters/squallwife` | `Craftpix con41` | close | `src/assets/monsters/tint-squallwife.png` | snake-haired woman, storm blue. Recolour: hue 110 |
| `monsters/aune` | `free_sample op36` | close | `src/assets/monsters/tint-aune.jpg` | hooded woman, storm-lit. Recolour: hue 150, saturation 1.1 |
| `monsters/lampfish` | `rpg-beings Cave fish` | close | `src/assets/monsters/tint-lampfish.png` | pale deep fish, lit yellow. Recolour: tint 240,225,120 |
| `monsters/deepeel` | `rpg-beings Electric eel` | close | `src/assets/monsters/tint-deepeel.png` | violet eel. Recolour: hue 240, saturation 1.5, brightness .8 |
| `monsters/lureman` | `Craftpix con7` | close | `src/assets/monsters/tint-lureman.png` | scaled hood, drowned green-blue. Recolour: hue 120, brightness .8 |
| `monsters/anglerpriest` | `rpg-beings Jiong` | close | `src/assets/monsters/tint-anglerpriest.png` | tentacled mouth-thing, flame coloured. Recolour: tint 240,170,100 |
| `monsters/lanternmaw` | `free_sample wezwanie krokodyla` | placeholder | `src/assets/monsters/tint-lanternmaw.jpg` | huge toothed jaws, deep-sea teal; no lure. Recolour: hue 160, saturation .8, brightness .85 |
| `monsters/fleetmarine` | `Craftpix con23` | close | `src/assets/monsters/tint-fleetmarine.png` | skeleton, weed-green. Recolour: tint 140,190,175 |
| `monsters/powdermonkey` | `Craftpix con20` | close | `src/assets/monsters/tint-powdermonkey.png` | small hooded figure, gunpowder orange. Recolour: tint 230,140,80 |
| `monsters/fleetgunner` | `Craftpix con22` | close | `src/assets/monsters/tint-fleetgunner.png` | hooded skeleton, fire-lit. Recolour: tint 220,150,90 |
| `monsters/signalman` | `Craftpix con19` | close | `src/assets/monsters/tint-signalman.png` | winged helm, signal blue. Recolour: saturation .5, tint 150,185,235 |
| `monsters/hask` | `free_sample mobiszon999` | placeholder | `src/assets/monsters/tint-hask.jpg` | helmed skull, drowned green; no uniform. Recolour: hue 110, saturation .7, brightness .9 |
| `monsters/sulphurman` | `Craftpix con16` | close | `src/assets/monsters/tint-sulphurman.png` | goblin, sulphur yellow. Recolour: tint 230,215,90 |
| `monsters/ashgull` | `rpg-beings Puffin` | close | `src/assets/monsters/tint-ashgull.png` | ash-grey seabird, ember tint. Recolour: saturation .2, brightness .7, tint 225,140,80 |
| `monsters/brimstonehulk` | `Craftpix con25` | close | `src/assets/monsters/tint-brimstonehulk.png` | armoured flame man, yellow fire. Recolour: tint 240,200,110 |
| `monsters/stokerpriest` | `Craftpix con37` | close | `src/assets/monsters/tint-stokerpriest.png` | horned figure, brimstone orange. Recolour: tint 240,190,120 |
| `monsters/brimstonekeeper` | `free_sample spalenie` | close | `src/assets/monsters/tint-brimstonekeeper.jpg` | burning skull, sulphur yellow. Recolour: tint 245,205,120 |
| `monsters/coralbrute` | `rpg-beings Coral monster` | close | `src/assets/monsters/tint-coralbrute.png` | many-armed coral thing, pink. Recolour: lightness 25, tint 240,130,140 |
| `monsters/reefdart` | `rpg-beings Seahorse` | close | `src/assets/monsters/tint-reefdart.png` | sea horse, shock blue. Recolour: hue 200 |
| `monsters/polypmother` | `rpg-beings Twentacle` | close | `src/assets/monsters/tint-polypmother.png` | jelly-capped polyp, sickly yellow. Recolour: hue 120, saturation .8 |
| `monsters/reefspeaker` | `rpg-beings Staruss` | placeholder | `src/assets/monsters/tint-reefspeaker.png` | star with a face, lightning-blue. Recolour: hue 240, tint 170,190,240 |
| `monsters/reefmother` | `rpg-beings Octopus` | close | `src/assets/monsters/tint-reefmother.png` | great coral-red octopus. Recolour: saturation 1.5, brightness 1.05, tint 240,150,150 |
| `monsters/spoutrider` | `rpg-beings Hydrogust` | close | `src/assets/monsters/tint-spoutrider.png` | waterspout with teeth. Recolour: lightness 8 |
| `monsters/rainwraith` | `Craftpix con35` | close | `src/assets/monsters/tint-rainwraith.png` | white wraith, rain blue. Recolour: tint 170,190,240 |
| `monsters/emberpetrel` | `rpg-beings Swan` | placeholder | `src/assets/monsters/tint-emberpetrel.png` | long-necked seabird on fire. Recolour: saturation 1, brightness .75, tint 240,130,60 |
| `monsters/tempestkeeper` | `rpg-beings Stellectric` | placeholder | `src/assets/monsters/tint-tempestkeeper.png` | a living burst of lightning. Recolour: tint 220,235,255 |
| `monsters/vane` | `free_sample mobeK1S` | close | `src/assets/monsters/tint-vane.jpg` | helmed captain, storm blue. Recolour: hue 200, saturation .9 |
| `monsters/flenser` | `free_sample a32` | placeholder | `src/assets/monsters/tint-flenser.jpg` | grey-faced worker in blubber-grey. Recolour: saturation .35, brightness .85 |
| `monsters/ribcrawler` | `rpg-beings Scorpion` | close | `src/assets/monsters/tint-ribcrawler.png` | bone-pale scorpion. Recolour: saturation .1, lightness 45, tint 225,215,190 |
| `monsters/oilbat` | `rpg-beings Bat` | close | `src/assets/monsters/tint-oilbat.png` | oil-black bat, burning at the edges. Recolour: saturation .3, brightness .5, tint 225,130,70 |
| `monsters/tryworker` | `Craftpix con38` | close | `src/assets/monsters/tint-tryworker.png` | plated figure, oil-fire orange. Recolour: tint 235,170,110 |
| `monsters/flensemaster` | `free_sample mobiszon997` | placeholder | `src/assets/monsters/tint-flensemaster.jpg` | huge roaring brute, oil-stained; no spade. Recolour: hue 60, saturation .9, brightness .85 |
| `monsters/currentshade` | `rpg-beings Whalkst` | close | `src/assets/monsters/tint-currentshade.png` | grinning ghost, cold dark blue. Recolour: brightness .6, tint 130,160,220 |
| `monsters/blackeel` | `rpg-beings Salmon` | close | `src/assets/monsters/tint-blackeel.png` | black fish, blue glints. Recolour: saturation .15, brightness .45, tint 140,170,240 |
| `monsters/helmsman` | `Craftpix con21` | close | `src/assets/monsters/tint-helmsman.png` | long bone skull, sea grey. Recolour: saturation .3, tint 150,175,190 |
| `monsters/currentcaller` | `rpg-beings Ling` | close | `src/assets/monsters/tint-currentcaller.png` | long-mouthed wisp, storm blue. Recolour: hue 280, brightness .9 |
| `monsters/steersman` | `free_sample p7` | close | `src/assets/monsters/tint-steersman.jpg` | dark long-haired man, cold blue. Recolour: hue 190, saturation .8, brightness .9 |
| `monsters/namelessone` | `rpg-beings Rhunst` | close | `src/assets/monsters/tint-namelessone.png` | faceless ghost, grey-violet. Recolour: brightness .65, tint 150,150,190 |
| `monsters/whisperer` | `Craftpix con18` | placeholder | `src/assets/monsters/tint-whisperer.png` | dark mask, blue. Recolour: tint 130,160,240 |
| `monsters/trenchburner` | `Craftpix con30` | close | `src/assets/monsters/tint-trenchburner.png` | burning skull, violet fire. Recolour: hue 310 |
| `monsters/trenchhorror` | `rpg-beings Thorn dragon` | close | `src/assets/monsters/tint-trenchhorror.png` | black thorned horror, fire edged. Recolour: tint 240,120,70 |
| `monsters/choirdeep` | `free_sample kociotrup` | placeholder | `src/assets/monsters/tint-choirdeep.jpg` | skull in deep violet; one voice, not a choir. Recolour: hue 240, saturation 1, brightness .8 |
| `monsters/deepthing` | `Craftpix con13` | close | `src/assets/monsters/tint-deepthing.png` | one great eye in pale flesh. Recolour: saturation .4, brightness .7, tint 160,190,190 |
| `monsters/blindhunter` | `rpg-beings Shark` | close | `src/assets/monsters/tint-blindhunter.png` | pale blind shark. Recolour: saturation .2, lightness 25, tint 200,215,230 |
| `monsters/dimfire` | `Craftpix con29` | close | `src/assets/monsters/tint-dimfire.png` | fire-mawed serpent, dim blue flame. Recolour: hue 250, brightness .8 |
| `monsters/abyssherald` | `Craftpix con17` | close | `src/assets/monsters/tint-abyssherald.png` | crested mask, deep blue. Recolour: hue 230, brightness .85 |
| `monsters/firstdrowned` | `free_sample ik52` | close | `src/assets/monsters/tint-firstdrowned.jpg` | pale undead face, drowned blue. Recolour: hue 20, saturation .8, brightness .9 |
| `monsters/crewless` | `Craftpix con11` | close | `src/assets/monsters/tint-crewless.png` | black mask, red eyes, deep-sea violet. Recolour: tint 170,170,210 |
| `monsters/maelstromkin` | `rpg-beings Orca` | close | `src/assets/monsters/tint-maelstromkin.png` | orca, storm-lit. Recolour: tint 150,175,240 |
| `monsters/eyepriest` | `Craftpix con24` | close | `src/assets/monsters/tint-eyepriest.png` | pale high-collared priest, fire-lit. Recolour: tint 235,160,120 |
| `monsters/eyestorm` | `Craftpix con10` | close | `src/assets/monsters/tint-eyestorm.png` | horned skull mask, storm blue. Recolour: hue 200, tint 170,190,240 |
| `monsters/caller` | `free_sample szary kleszcz` | placeholder | `src/assets/monsters/tint-caller.jpg` | pincered grey horror in abyssal blue; the nearest thing to something vast. Recolour: hue 150, saturation 1, brightness .75 |
| `uniques/leviathan_hide` | `gear sets/set-59-body.png` | close | `src/assets/items/armor/set-59-body.png` | the last unused gear set |
| `uniques/deckwalkers` | `gear sets/set-59-legs.png` | close | `src/assets/items/armor/set-59-legs.png` | |
| `uniques/tide_crown` | `gear sets/set-59-helmet.png` | close | `src/assets/items/armor/set-59-helmet.png` | |
| `uniques/harpoons_answer` | `gear sets/set-59-gloves.png` | close | `src/assets/items/armor/set-59-gloves.png` | |
| `uniques/corposant` | `gear sets/set-30-helmet.png` | close | `src/assets/items/armor/tint-corposant.png` | Recolour: tint 150,200,245 |
| `uniques/bosuns_oath` | `CodeSpree rpg-items-all badge` | placeholder | `src/assets/items/jewelry/codespree-badge.png` | a badge, not an amulet |

## Act 3 (added 2026-10-31)

All 50 Act 3 monsters and bosses and the Chained Martyr have their own picture: 36 close, 15 loose. Every one is a `tint-<id>` recolour of a Craftpix or free_sample person, since the act is nearly all human and the packs hold few people. Craftpix's cartoon faces take a one-colour wash (`tint`), because a hue turn gives them green or purple skin; free_sample paintings can take a hue turn. The six uniques use unused gear-set pieces, and `gi-shard-necklace.svg` is a pale blue copy of `gi-gem-pendant.svg`.

**Areas:** the 10 banners reuse GegX landscapes in `ZONE_ART` until the landscape pack arrives. Full briefs for them are in `ZONE_DESC` in `src/data/artManifest.ts`.

| Game asset ID | Source file | Confidence | Final destination | Notes |
|---|---|---|---|---|
| `monsters/martyr` | `free_sample/a61.jpg` | close | `src/assets/monsters/tint-martyr.jpg` | gaunt bald figure, bleached; no chains in frame. Recolour: saturation 0.15, brightness 0.95 |
| `monsters/gatewarden` | `Craftpix avatars Transperent/con1.png` | close | `src/assets/monsters/tint-gatewarden.png` | helmeted guard in pale gold; no halberd. Recolour: saturation 0.8, tint 215,205,170 |
| `monsters/pilgrimzealot` | `Craftpix avatars Transperent/con3.png` | close | `src/assets/monsters/tint-pilgrimzealot.png` | hooded, wrapped face in dusty cloth. Recolour: tint 205,190,160 |
| `monsters/lampbearer` | `Craftpix avatars Transperent/con6.png` | placeholder | `src/assets/monsters/tint-lampbearer.png` | yellow hood; no lamp. Recolour: tint 225,200,110 |
| `monsters/tollinquisitor` | `Craftpix avatars Transperent/con12.png` | close | `src/assets/monsters/tint-tollinquisitor.png` | blue hood and face wrap. Recolour: tint 140,160,215 |
| `monsters/ansel` | `free_sample/mobeK1S.jpg` | close | `src/assets/monsters/tint-ansel.jpg` | iron-faced captain in gold wash. Recolour: saturation 0.4, tint 220,200,150 |
| `monsters/almscollector` | `Craftpix avatars Transperent/con20.png` | close | `src/assets/monsters/tint-almscollector.png` | padded hood, grey-tan; no purse. Recolour: tint 190,175,150 |
| `monsters/streetzealot` | `Craftpix avatars Transperent/con9.png` | close | `src/assets/monsters/tint-streetzealot.png` | headband and mask, blue. Recolour: tint 150,170,225 |
| `monsters/lanternsister` | `Craftpix avatars Transperent/con2.png` | close | `src/assets/monsters/tint-lanternsister.png` | hooded young woman, pale; no lantern. Recolour: saturation 0.5, brightness 1.1, tint 235,225,190 |
| `monsters/hedgepreacher` | `free_sample/a32.jpg` | close | `src/assets/monsters/tint-hedgepreacher.jpg` | plain older man; no pulpit. Recolour: hue -20 |
| `monsters/ilse` | `free_sample/a66.jpg` | close | `src/assets/monsters/tint-ilse.jpg` | pale stern woman; same face as the other saints. Recolour: saturation 0.3, brightness 1.1 |
| `monsters/flagellant` | `free_sample/a10.jpg` | close | `src/assets/monsters/tint-flagellant.jpg` | bare-shouldered heavy man; no scourge. Recolour: hue 340, saturation 1.3 |
| `monsters/yardmaster` | `free_sample/op53.jpg` | placeholder | `src/assets/monsters/tint-yardmaster.jpg` | scarred pale head. Recolour: hue 330, saturation 0.6 |
| `monsters/penitentbrute` | `free_sample/a43.jpg` | placeholder | `src/assets/monsters/tint-penitentbrute.jpg` | heavy-browed brute, greyed; no stone. Recolour: saturation 0.5 |
| `monsters/lashpriest` | `Craftpix avatars Transperent/con24.png` | close | `src/assets/monsters/tint-lashpriest.png` | high-collared pale priest, blue cloth. Recolour: tint 150,175,225 |
| `monsters/cato` | `free_sample/ik52.jpg` | placeholder | `src/assets/monsters/tint-cato.jpg` | grey-skinned man reddened; no wounds. Recolour: hue 150, saturation 1.5 |
| `monsters/relichunter` | `Craftpix avatars Transperent/con7.png` | close | `src/assets/monsters/tint-relichunter.png` | scale hood; no pick. Recolour: saturation 0.6, brightness 0.95 |
| `monsters/vaultthief` | `Craftpix avatars Transperent/con3.png` | close | `src/assets/monsters/tint-vaultthief.png` | dark hood and wrapped face. Recolour: saturation 0.3, brightness 0.7 |
| `monsters/vaultwarden` | `Craftpix avatars Transperent/con1.png` | close | `src/assets/monsters/tint-vaultwarden.png` | helmed guard, blue-green steel. Recolour: tint 150,190,190 |
| `monsters/bonecantor` | `free_sample/op36.jpg` | close | `src/assets/monsters/tint-bonecantor.jpg` | hooded gaunt face, cold light. Recolour: hue 30, saturation 0.8 |
| `monsters/odile` | `Craftpix avatars Transperent/con12.png` | placeholder | `src/assets/monsters/tint-odile.png` | hooded woman, dusty; no pickaxe. Recolour: tint 195,175,135 |
| `monsters/bellcaster` | `Craftpix avatars Transperent/con4.png` | close | `src/assets/monsters/tint-bellcaster.png` | bearded smith in bronze tones. Recolour: tint 200,150,90 |
| `monsters/clapperboy` | `Craftpix avatars Transperent/con9.png` | placeholder | `src/assets/monsters/tint-clapperboy.png` | masked youth, faded; no hammer. Recolour: tint 200,180,140 |
| `monsters/bronzeguard` | `Craftpix avatars Transperent/con1.png` | close | `src/assets/monsters/tint-bronzeguard.png` | bronze helmet. Recolour: tint 205,150,80 |
| `monsters/tollmaster` | `Craftpix avatars Transperent/con33.png` | close | `src/assets/monsters/tint-tollmaster.png` | bearded hooded man, blue cast. Recolour: tint 130,160,215 |
| `monsters/harl` | `free_sample/a43.jpg` | placeholder | `src/assets/monsters/tint-harl.jpg` | huge brow in bronze wash; no bell. Recolour: tint 205,150,80 |
| `monsters/inquisitor` | `Craftpix avatars Transperent/con24.png` | close | `src/assets/monsters/tint-inquisitor.png` | high collar, pale cruel face. Recolour: tint 170,165,185 |
| `monsters/hallguard` | `Craftpix avatars Transperent/con7.png` | close | `src/assets/monsters/tint-hallguard.png` | scale hood, slate. Recolour: tint 150,165,190 |
| `monsters/informant` | `Craftpix avatars Transperent/con3.png` | close | `src/assets/monsters/tint-informant.png` | hood and wrap, dark. Recolour: brightness 0.85, tint 120,120,145 |
| `monsters/confessor` | `free_sample/op36.jpg` | close | `src/assets/monsters/tint-confessor.jpg` | hooded figure, blue-lit. Recolour: hue 180 |
| `monsters/maren` | `free_sample/a66.jpg` | close | `src/assets/monsters/tint-maren.jpg` | stern woman in violet shade. Recolour: hue 240, saturation 0.7, brightness 0.9 |
| `monsters/stairrunner` | `Craftpix avatars Transperent/con20.png` | close | `src/assets/monsters/tint-stairrunner.png` | padded hood, blue-grey. Recolour: tint 130,160,205 |
| `monsters/kneelingknight` | `Craftpix avatars Transperent/con19.png` | close | `src/assets/monsters/tint-kneelingknight.png` | winged helm, steel-blue. Recolour: saturation 0.7, tint 190,200,230 |
| `monsters/railpriest` | `Craftpix avatars Transperent/con39.png` | placeholder | `src/assets/monsters/tint-railpriest.png` | turbaned figure recoloured. Recolour: tint 150,185,215 |
| `monsters/sineater` | `free_sample/op53.jpg` | placeholder | `src/assets/monsters/tint-sineater.jpg` | scarred head, cold tint. Recolour: hue 170, saturation 0.7 |
| `monsters/unshriven` | `free_sample/moooob27.jpg` | placeholder | `src/assets/monsters/tint-unshriven.jpg` | grey face; no armour in frame. Recolour: saturation 0.2, brightness 0.8 |
| `monsters/chorister` | `Craftpix avatars Transperent/con2.png` | close | `src/assets/monsters/tint-chorister.png` | young singer, blue. Recolour: tint 170,190,235 |
| `monsters/censerboy` | `Craftpix avatars Transperent/con6.png` | placeholder | `src/assets/monsters/tint-censerboy.png` | red-orange hood; no censer. Recolour: tint 215,130,90 |
| `monsters/loftguard` | `Craftpix avatars Transperent/con1.png` | close | `src/assets/monsters/tint-loftguard.png` | helmeted guard, violet-grey. Recolour: tint 170,160,200 |
| `monsters/precentor` | `free_sample/a32.jpg` | close | `src/assets/monsters/tint-precentor.jpg` | older man in storm-blue light. Recolour: hue 200, saturation 1.2, brightness 1.1 |
| `monsters/liselle` | `free_sample/a66.jpg` | close | `src/assets/monsters/tint-liselle.jpg` | stern woman with blue hair. Recolour: hue 180 |
| `monsters/templeguard` | `Craftpix avatars Transperent/con7.png` | close | `src/assets/monsters/tint-templeguard.png` | gilded scale hood. Recolour: tint 235,205,120 |
| `monsters/crusader` | `Craftpix avatars Transperent/con19.png` | close | `src/assets/monsters/tint-crusader.png` | pale gold winged helm. Recolour: tint 240,225,170 |
| `monsters/gildedknight` | `free_sample/a10.jpg` | placeholder | `src/assets/monsters/tint-gildedknight.jpg` | broad man in gold wash, not a statue. Recolour: tint 230,190,90 |
| `monsters/lightbringer` | `Craftpix avatars Transperent/con39.png` | placeholder | `src/assets/monsters/tint-lightbringer.png` | gold turbaned figure. Recolour: tint 235,215,130 |
| `monsters/oren` | `free_sample/a32.jpg` | placeholder | `src/assets/monsters/tint-oren.jpg` | older man in gold wash. Recolour: tint 235,205,120 |
| `monsters/altarguard` | `Craftpix avatars Transperent/con1.png` | close | `src/assets/monsters/tint-altarguard.png` | pale blue helm. Recolour: tint 170,190,240 |
| `monsters/ascendedzealot` | `Craftpix avatars Transperent/con19.png` | close | `src/assets/monsters/tint-ascendedzealot.png` | bright winged helm. Recolour: brightness 1.3, tint 240,235,215 |
| `monsters/hierophant` | `free_sample/a61.jpg` | placeholder | `src/assets/monsters/tint-hierophant.jpg` | bald head in blue light. Recolour: hue 190, saturation 2 |
| `monsters/sacristan` | `Craftpix avatars Transperent/con33.png` | close | `src/assets/monsters/tint-sacristan.png` | grey-bearded hooded man. Recolour: saturation 0.3, brightness 0.9 |
| `monsters/solenne` | `free_sample/a66.jpg` | close | `src/assets/monsters/tint-solenne.jpg` | pale gold woman; no crozier. Recolour: brightness 1.15, tint 230,215,160 |

## Act 2 (added 2026-10-30)

All 40 Act 2 monsters and bosses now have their own picture, and no two share one. The six new uniques have their own art too. 27 of the monsters are close and 13 are loose, after a second pass on 2026-10-31 that looked through every creature and character sprite in the owned packs and replaced 11 of the original 21 loose matches. The table further down covers the first 187 slots; these are on top of it.

**To swap a monster:** change its line in `MONSTER_ART` in `src/ui/assets.ts`, which is keyed by monster id. `tests/art.test.ts` fails if any monster or boss has no art, so a renamed or new monster can't fall back to the skull unnoticed. Recolours are named `tint-<id>`; rename the file if the id changes. A few Act 2 monsters reuse art from Act 1 or a portrait, always recoloured (for example `khorun` is the trader's sprite and `tamsin` is `gunner`'s).

**Recolours:** the packs have too few fitting pieces, so `tint-<id>` files are recoloured pack art, made with sharp's `modulate` (hue, saturation, brightness, lightness) and `tint` (RGB). Pixel art stays PNG and painted art stays JPG, so `packArtIsPixel` scales each one correctly.

**Loose matches, replace first (13):**

- `outrider`: padded brown hood and face wrap; no horse or lance. CodeSpree's Equestion is the only horse in the packs, and it looks too comic for a rider
- `glass`: silvered woman's portrait, no cracked mirror glass. Same face as `qara`
- `grassseer`: red-faced horned figure; no grass coat
- `lancer`: scale hood, no pointed helmet or lance
- `bonecamel`: animal skull, not a camel
- `moundguard`: bronze-stained skeleton, no armour or axe
- `moundpriest`: undead in a tall helm; no charms
- `horselord`: large bronze-green skull; no crown or horse
- `rhino`: no rhino in any pack: grey boar
- `stormrider`: blue armoured rider's head; no horse or lance
- `qara`: stern blue-haired woman; no horse or glaive
- `ashseer`: grey hooded figure, mouth wrapped rather than eyes
- `sunpriest`: gold wash over a stern face; no sun disc

**Areas are unchanged.** No owned pack has hand-made art for these places, so the 8 Act 2 areas keep their reused GegX banners from `ZONE_ART`, and none shows its actual place. GegX's licence file says it is AI-generated, which conflicts with the no-AI-art rule, so these go when the replacement landscape pack arrives, along with Act 1's banners and the two scenes.

Checked on 2026-10-31: the only other backgrounds on disk are Screaming Brain's Seamless Sky Backgrounds (CC0 tiling sky textures with no ground, not in the repo) and Foozle's Void pack (space). Neither shows a place. The skies could sit behind a transparent landscape layer if the replacement pack needs one.

What each area needs from the replacement pack (1200×686 banner, no people or creatures; full briefs are in `ZONE_DESC` in `src/data/artManifest.ts`):

| Area id | Needs | Current GegX banner |
|---|---|---|
| `cinderroad` | dirt road over burned yellow grass hills, smoke, orange haze | forest day |
| `saltflats` | flat white cracked salt plain, pale hot sky | forest fog |
| `blackgrass` | very tall black grass, red dusk sky, a line of fire | forest night |
| `caravan` | walled mud-brick caravanserai, arched gate, carts, dry well | tavern day |
| `kurgans` | grey-green steppe with round burial mounds, stone doorway, overcast | forest parallax |
| `plateau` | bare brown flat-topped plateau, storm clouds, lightning | forest fog |
| `pyretemple` | red stone temple interior, square pillars, large fire bowl | tavern fog |
| `burningthrone` | bare hilltop at night, huge glowing orb in a crater | forest night |

`caravan` and `pyretemple` need man-made places, so a nature-only pack won't cover all eight.

| Game asset ID | Source file | Confidence | Final destination | Notes |
|---|---|---|---|---|
| `monsters/ashjackal` | `CodeSpree rpg-beings-all/Hyena.png` | close | `src/assets/monsters/codespree-hyena.png` | hyena, grey-brown and mangy; no burns |
| `monsters/outrider` | `Craftpix avatars Transperent/con20.png` | placeholder | `src/assets/monsters/craftpix-con20.png` | padded brown hood and face wrap; no horse or lance |
| `monsters/vulture` | `Craftpix avatars Transperent/con32.png` | close | `src/assets/monsters/tint-vulture.png` | black crow head, not bald. Recolour: hue 30, saturation 1.6, brightness 1.15 |
| `monsters/firesprite` | `Craftpix avatars Transperent/con26.png` | close | `src/assets/monsters/craftpix-con26.png` | small red imp, no grass |
| `monsters/khorun` | `Craftpix avatars Transperent/con33.png` | close | `src/assets/monsters/tint-khorun.png` | scowling red-bearded nomad in a fur hood; no horse or banner. Recolour: hue 330, saturation 0.75, brightness 0.6 |
| `monsters/saltcrawler` | `CodeSpree rpg-beings-all/Angry crab.png` | close | `src/assets/monsters/tint-saltcrawler.png` | pale crab. Recolour: lightness 34, tint 235,225,200 |
| `monsters/mirage` | `Craftpix avatars Transperent/con40.png` | close | `src/assets/monsters/tint-mirage.png` | pale see-through humanoid; eyes are faint, not bright. Recolour: saturation 0.1, brightness 1.4, 75% opacity |
| `monsters/dustdevil` | `CodeSpree rpg-beings-all/Electrogust.png` | close | `src/assets/monsters/tint-dustdevil.png` | sandy whirlwind with a face. Recolour: saturation 0.55, brightness 0.95 |
| `monsters/saltwitch` | `Craftpix avatars Transperent/con12.png` | close | `src/assets/monsters/tint-saltwitch.png` | bleached hood, white hair and face wrap, same base as the mage portrait; no frost. Recolour: saturation 0.1, brightness 1.25 |
| `monsters/glass` | `free_sample/a66.jpg` | placeholder | `src/assets/monsters/tint-glass.jpg` | silvered woman's portrait; no cracked glass, same face as `qara`. Recolour: saturation 0.1, brightness 1.15, linear 1.5/-50, tint 200,235,255 |
| `monsters/grasscat` | `CodeSpree rpg-beings-all/Purple cat.png` | close | `src/assets/monsters/tint-grasscat.png` | small dark cat, not a big cat. Recolour: saturation 0.15, lightness -1 |
| `monsters/firebrand` | `Craftpix avatars Transperent/con27.png` | close | `src/assets/monsters/craftpix-con27.png` | orange horned hound, no brand |
| `monsters/burnwalker` | `free_sample/spalenie.jpg` | close | `src/assets/monsters/freesample-spalenie.jpg` | charred skull in flames; head only |
| `monsters/grassseer` | `free_sample/a24.jpg` | placeholder | `src/assets/monsters/freesample-a24.jpg` | red-faced horned figure; no grass coat |
| `monsters/ashmane` | `Craftpix avatars Transperent/con31.png` | close | `src/assets/monsters/tint-ashmane.png` | golden-orange lion-like head; mane is fur, not fire. Recolour: hue 15, saturation 1.9, brightness 1.35 |
| `monsters/raider` | `Craftpix avatars Transperent/con3.png` | close | `src/assets/monsters/tint-raider.png` | tan hood and face wrap; no scimitar. Recolour: brightness 1.25, tint 205,165,105 |
| `monsters/lancer` | `Craftpix avatars Transperent/con7.png` | placeholder | `src/assets/monsters/craftpix-con7.png` | scale hood, no pointed helmet or lance |
| `monsters/bonecamel` | `Craftpix avatars Transperent/con21.png` | placeholder | `src/assets/monsters/tint-bonecamel.png` | animal skull, not a camel. Recolour: hue 10, saturation 1.5, brightness 0.85 |
| `monsters/hexmerchant` | `Craftpix avatars Transperent/con39.png` | close | `src/assets/monsters/tint-hexmerchant.png` | turbaned pale man with a moustache; no coins. Recolour: hue 40, saturation 0.5, brightness 1.2 |
| `monsters/tamsin` | `Craftpix avatars Transperent/con9.png` | close | `src/assets/monsters/tint-tamsin.png` | bandit in a red headband and face mask, same base as `gunner`; no coat or helmet. Recolour: saturation 1.7, brightness 0.75 |
| `monsters/barrowwight` | `Craftpix avatars Transperent/con22.png` | close | `src/assets/monsters/tint-barrowwight.png` | hooded blue ghost; no bronze helmet. Recolour: hue 180, saturation 3, brightness 1.3 |
| `monsters/horseskel` | `CodeSpree rpg-beings-all/Equestion.png` | close | `src/assets/monsters/tint-horseskel.png` | whole horse with rib-like markings, pale blue; no barding. Recolour: hue 170, saturation 0.7, lightness 30 |
| `monsters/moundguard` | `Craftpix avatars Transperent/con23.png` | placeholder | `src/assets/monsters/tint-moundguard.png` | bronze-stained skeleton, no armour or axe. Recolour: tint 205,150,80 |
| `monsters/moundpriest` | `free_sample/mobiszon999.jpg` | placeholder | `src/assets/monsters/tint-moundpriest.jpg` | undead in a tall helm; no charms. Recolour: hue 160, saturation 0.9, brightness 0.95 |
| `monsters/horselord` | `free_sample/kociotrup.jpg` | placeholder | `src/assets/monsters/tint-horselord.jpg` | large bronze-green skull; no crown or horse. Recolour: hue -250, saturation 1.6, brightness 0.95 |
| `monsters/thunderhawk` | `CodeSpree rpg-beings-all/Pigeon.png` | close | `src/assets/monsters/tint-thunderhawk.png` | blue bird, but a pigeon shape. Recolour: lightness 6, tint 80,120,210 |
| `monsters/rhino` | `CodeSpree rpg-beings-all/Wild boar.png` | placeholder | `src/assets/monsters/tint-rhino.png` | no rhino in any pack: grey boar. Recolour: saturation 0.25, lightness 32 |
| `monsters/stormrider` | `Craftpix avatars Transperent/con20.png` | placeholder | `src/assets/monsters/tint-stormrider.png` | blue-grey rider's head, same base as `outrider`; no horse or lance. Recolour: saturation 0.15, brightness 0.9, tint 150,175,235 |
| `monsters/skyshaman` | `Craftpix avatars Transperent/con19.png` | close | `src/assets/monsters/tint-skyshaman.png` | blue winged helm with a lightning slash; no drum. Recolour: hue 190, saturation 1.2, brightness 1.05 |
| `monsters/qara` | `free_sample/a66.jpg` | placeholder | `src/assets/monsters/tint-qara.jpg` | stern blue-haired woman; no horse or glaive. Recolour: hue 180, saturation 0.9, brightness 1.05 |
| `monsters/ashmonk` | `free_sample/a61.jpg` | close | `src/assets/monsters/tint-ashmonk.jpg` | bald, ash-pale, stern; no robe in frame. Recolour: saturation 0.25, brightness 1.05 |
| `monsters/dervish` | `CodeSpree rpg-beings-all/Pyrogust.png` | close | `src/assets/monsters/codespree-pyrogust.png` | spinning fire with teeth; no dancer or blades |
| `monsters/pyregolem` | `Craftpix avatars Transperent/con25.png` | close | `src/assets/monsters/tint-pyregolem.png` | molten rock head in flames. Recolour: hue -15, saturation 1.3, brightness 0.9 |
| `monsters/acolyte` | `Craftpix avatars Transperent/con37.png` | close | `src/assets/monsters/craftpix-con37.png` | orange horned mask-like face |
| `monsters/ozar` | `Craftpix avatars Transperent/con10.png` | close | `src/assets/monsters/tint-ozar.png` | tall pale mask with red-gold flames around it, same base as `emberkin`; no staff. Recolour: hue -30, saturation 2, brightness 0.95 |
| `monsters/sunguard` | `free_sample/mobeK1S.jpg` | close | `src/assets/monsters/tint-sunguard.jpg` | bronze-gold helmed guard. Recolour: hue -170, saturation 1.5, brightness 1.15 |
| `monsters/wyrmling` | `Craftpix avatars Transperent/con29.png` | close | `src/assets/monsters/craftpix-con29.png` | red fire-breathing dragon, not black |
| `monsters/ashseer` | `free_sample/op36.jpg` | placeholder | `src/assets/monsters/tint-ashseer.jpg` | grey hooded figure, mouth wrapped rather than eyes. Recolour: saturation 0.25, brightness 1.15 |
| `monsters/sunpriest` | `free_sample/moooob27.jpg` | placeholder | `src/assets/monsters/tint-sunpriest.jpg` | gold wash over a stern face; no sun disc. Recolour: tint 235,175,60 |
| `monsters/azhar` | `Craftpix avatars Transperent/con32.png` | close | `src/assets/monsters/tint-azhar.png` | fiery orange raptor's head; no full wings, same base as `vulture`. Recolour: linear 1.6/50, saturation 1.1, tint 255,120,30 |
| `uniques/sunmane_pelt` | `gear sets/set-52-body.png` | close | `src/assets/items/armor/set-52-body.png` | fur-trimmed gold-brown coat; fur is not orange |
| `uniques/mirage_veil` | `gear sets/set-45-helmet.png` | close | `src/assets/items/armor/set-45-helmet.png` | dark hood with a cloth across the face |
| `uniques/khans_tithe` | `game-icons.net diamond-ring.svg` | close | `src/assets/items/jewelry/gi-diamond-ring.svg` | silhouette tinted gold |
| `uniques/kurgan_crown` | `gear sets/set-58-helmet.png` | close | `src/assets/items/armor/set-58-helmet.png` | bronze circlet with cowl; no horse heads |
| `uniques/stormrider_greaves` | `gear sets/set-37-legs.png` | close | `src/assets/items/armor/set-37-legs.png` | dark boots with violet trim; no feathers |
| `uniques/pyre_heart` | `game-icons.net heart-necklace.svg` | close | `src/assets/items/jewelry/gi-heart-necklace.svg` | heart pendant tinted ember orange; no flame |

## Item art added 2026-10-31

The owner's new packs fill most of the weapon and shield bases, which had no art before. 112 slots use them: 16 replace older art and 96 are new to this report. Pixel art is enlarged by whole numbers only (32px icons ×2, shields ×3), so it stays sharp in 64px item slots. Recolours follow the `tint-<id>` rule.

**Sources:** the RPG Weapons art comes from the Aseprite file's `Itens` layer. Its other layers hold the card backgrounds, stat glyphs and the credit text, so none of those reach the game. `RPG_Weapons.png` (pasted image 2) has that credit in its bottom-left cell: "RPG Weapons by quintino_pixels", in near-white on white. Each piece is named after its place on the sheet (`q1` to `q40`, left to right, top to bottom; `q5` to `q8` are single daggers from the first two pairs).

**Bases still with no art (34):**

- axes (5): felling_axe, butcher_axe, ravager_axe, dragonbone_axe, slayer_axe
- maces (6): flanged_mace, morning_star, champion_flail, sunforged_hammer, colossus_maul, titan_flail
- bows (5): composite_bow, bonehunter_bow, gryphon_longbow, stagheart_bow, wildlord_greatbow
- sceptres (9): iron_sceptre, inquisitor_sceptre, paladin_sceptre, zealot_sceptre, hallowed_sceptre, archon_sceptre, exarch_sceptre, sanctum_sceptre, empyrean_sceptre
- wands (9): bone_wand, quartz_wand, stargazer_wand, raven_wand, hierophant_wand, seraph_wand, oracle_wand, astral_wand, celestial_wand

Catalone's unused weapons are the first place to look for these.

**Not used:** the keys, map scroll, quill and curios in the 32-icon set have no slot outside Heist and Thieving. The four RPG Weapons spears have no weapon family. The other 16 cells of the pasted sheet have no empty sword or dagger slot left, so they suit future uniques.

| Game asset ID | Source file | Confidence | Final destination | Notes |
|---|---|---|---|---|
| `items/steel_longsword` | `RPG_Weapons.aseprite, Itens layer, q1` | close | `src/assets/items/weapons/quintino-q1.png` | plain steel longsword |
| `items/gladiator_sword` | `RPG_Weapons.aseprite, Itens layer, q2` | close | `src/assets/items/weapons/quintino-q2.png` | broad blade, gem in the guard |
| `items/warbringer_sword` | `RPG_Weapons.aseprite, Itens layer, q3` | close | `src/assets/items/weapons/quintino-q3.png` | heavy notched cleaver |
| `items/skinning_knife` | `RPG_Weapons.aseprite, Itens layer, q5` | close | `src/assets/items/weapons/quintino-q5.png` | short plain blade |
| `items/stiletto` | `RPG_Weapons.aseprite, Itens layer, q6` | close | `src/assets/items/weapons/quintino-q6.png` | narrow steel blade |
| `items/eclipse_dirk` | `RPG_Weapons.aseprite, Itens layer, q7` | close | `src/assets/items/weapons/quintino-q7.png` | pale blade, gold and green guard |
| `items/wraith_blade` | `RPG_Weapons.aseprite, Itens layer, q8` | close | `src/assets/items/weapons/quintino-q8.png` | pale steel dirk |
| `items/hunting_bow` | `RPG_Weapons.aseprite, Itens layer, q12` | close | `src/assets/items/weapons/quintino-q12.png` | plain curved bow |
| `items/hawkfeather_bow` | `RPG_Weapons.aseprite, Itens layer, q13` | close | `src/assets/items/weapons/quintino-q13.png` | bow with feathers at the tip |
| `items/thornwarden_longbow` | `RPG_Weapons.aseprite, Itens layer, q14` | close | `src/assets/items/weapons/quintino-q14.png` | dark bow with green leaves |
| `items/manticore_greatbow` | `RPG_Weapons.aseprite, Itens layer, q15` | close | `src/assets/items/weapons/quintino-q15.png` | gold bow with burning tips |
| `items/war_hammer` | `RPG_Weapons.aseprite, Itens layer, q16` | close | `src/assets/items/weapons/quintino-q16.png` | square iron hammer head |
| `items/warlord_mace` | `RPG_Weapons.aseprite, Itens layer, q17` | close | `src/assets/items/weapons/quintino-q17.png` | steel hammer with a blue gem |
| `items/dreadsteel_hammer` | `RPG_Weapons.aseprite, Itens layer, q18` | close | `src/assets/items/weapons/quintino-q18.png` | dark banded hammer with a spike |
| `items/godforged_hammer` | `RPG_Weapons.aseprite, Itens layer, q19` | close | `src/assets/items/weapons/quintino-q19.png` | green crystal hammer in gold |
| `items/banded_shield` | `RPG_Weapons.aseprite, Itens layer, q20` | close | `src/assets/items/armor/quintino-q20.png` | round wood shield with iron bands |
| `items/wyrmscale_shield` | `RPG_Weapons.aseprite, Itens layer, q21` | close | `src/assets/items/armor/quintino-q21.png` | red shield with a dragon emblem |
| `items/templar_kite_shield` | `RPG_Weapons.aseprite, Itens layer, q22` | close | `src/assets/items/armor/quintino-q22.png` | blue kite with a sword emblem |
| `items/godforged_tower_shield` | `RPG_Weapons.aseprite, Itens layer, q23` | close | `src/assets/items/armor/quintino-q23.png` | tall steel and orange tower shield with gems |
| `items/oak_quarterstaff` | `RPG_Weapons.aseprite, Itens layer, q28` | close | `src/assets/items/weapons/quintino-q28.png` | crook staff with a blue grip |
| `items/gnarled_staff` | `RPG_Weapons.aseprite, Itens layer, q29` | close | `src/assets/items/weapons/quintino-q29.png` | twisted brown staff |
| `items/astral_staff` | `RPG_Weapons.aseprite, Itens layer, q30` | close | `src/assets/items/weapons/quintino-q30.png` | pale staff with green sparks |
| `items/raven_staff` | `RPG_Weapons.aseprite, Itens layer, q32` | close | `src/assets/items/weapons/quintino-q32.png` | black and crimson staff |
| `items/seraph_staff` | `RPG_Weapons.aseprite, Itens layer, q33` | close | `src/assets/items/weapons/quintino-q33.png` | winged staff with an orb |
| `items/storm_staff` | `RPG_Weapons.aseprite, Itens layer, q34` | close | `src/assets/items/weapons/quintino-q34.png` | blue twisted staff with ice-like crest |
| `items/stargazer_staff` | `RPG_Weapons.aseprite, Itens layer, q35` | close | `src/assets/items/weapons/quintino-q35.png` | thin staff with a green star |
| `items/celestial_staff` | `RPG_Weapons.aseprite, Itens layer, q36` | close | `src/assets/items/weapons/quintino-q36.png` | green vine staff |
| `items/double_axe` | `RPG_Weapons.aseprite, Itens layer, q37` | close | `src/assets/items/weapons/quintino-q37.png` | plain double-headed axe |
| `items/headsman_axe` | `RPG_Weapons.aseprite, Itens layer, q38` | close | `src/assets/items/weapons/quintino-q38.png` | dark broad axe |
| `items/warbringer_axe` | `RPG_Weapons.aseprite, Itens layer, q39` | close | `src/assets/items/weapons/quintino-q39.png` | gold and orange double axe |
| `items/wyrmlord_greataxe` | `RPG_Weapons.aseprite, Itens layer, q40` | close | `src/assets/items/weapons/quintino-q40.png` | red flame-edged axe |
| `items/corsair_cutlass` | `pasted sheet 1, cell 29` | close | `src/assets/items/weapons/weapons30-29.png` | plain curved cutlass |
| `items/bladedancer_sabre` | `pasted sheet 1, cell 23` | close | `src/assets/items/weapons/weapons30-23.png` | slim sabre with a gold guard |
| `items/dragonfang_sword` | `pasted sheet 1, cell 1` | close | `src/assets/items/weapons/weapons30-1.png` | curved blade in flames |
| `items/slayer_sabre` | `pasted sheet 1, cell 24` | close | `src/assets/items/weapons/weapons30-24.png` | dark curved blade with molten lines |
| `items/wyrmlord_sword` | `pasted sheet 1, cell 5` | close | `src/assets/items/weapons/weapons30-5.png` | burning blade with embers |
| `items/nightshade_dirk` | `pasted sheet 1, cell 10` | close | `src/assets/items/weapons/weapons30-10.png` | thin blade with a thorn vine |
| `items/umbral_dagger` | `pasted sheet 1, cell 14` | close | `src/assets/items/weapons/weapons30-14.png` | thin dark blade |
| `items/voidfang_dagger` | `pasted sheet 1, cell 16` | close | `src/assets/items/weapons/weapons30-16.png` | dark blade with purple sparks |
| `items/oblivion_fang` | `pasted sheet 1, cell 30` | close | `src/assets/items/weapons/weapons30-30.png` | black blade with gold marks |
| `items/abyssal_kris` | `pasted sheet 1, cell 27` | close | `src/assets/items/weapons/weapons30-27.png` | two thin blades with red shards |
| `uniques/rebuttal` | `pasted sheet 1, cell 4` | close | `src/assets/items/weapons/weapons30-4.png` | two crossed blades with glints |
| `items/heater_shield` | `SnoopethDuckDuck Pack 3/1px/5.png` | close | `src/assets/items/armor/snoopeth-p3-5.png` | grey and bronze heater |
| `items/warlord_pavise` | `SnoopethDuckDuck Pack 1/1px/1.png` | close | `src/assets/items/armor/snoopeth-p1-1.png` | tall blue and gold shield |
| `items/dreadsteel_tower` | `SnoopethDuckDuck Pack 1/1px/18.png` | close | `src/assets/items/armor/snoopeth-p1-18.png` | grey steel shield |
| `items/champion_aegis` | `SnoopethDuckDuck Pack 1/1px/25.png` | close | `src/assets/items/armor/snoopeth-p1-25.png` | radiant gold crest |
| `items/sunforged_bulwark` | `SnoopethDuckDuck Pack 1/1px/32b.png` | close | `src/assets/items/armor/snoopeth-p1-32b.png` | gold and orange shield |
| `items/colossus_bulwark` | `SnoopethDuckDuck Pack 2/1px/24.png` | close | `src/assets/items/armor/snoopeth-p2-24.png` | heavy bronze shield |
| `items/titan_aegis` | `SnoopethDuckDuck Pack 2/1px/21.png` | close | `src/assets/items/armor/snoopeth-p2-21.png` | bronze shield with a raised rib |
| `items/hide_targe` | `SnoopethDuckDuck Pack 3/1px/2.png` | close | `src/assets/items/armor/snoopeth-p3-2.png` | tan and orange frame |
| `items/wolfpelt_targe` | `SnoopethDuckDuck Pack 2/1px/22.png` | close | `src/assets/items/armor/snoopeth-p2-22.png` | brown ribbed targe with green trim |
| `items/spiked_buckler` | `SnoopethDuckDuck Pack 1/1px/24.png` | close | `src/assets/items/armor/snoopeth-p1-24.png` | spiky silver crest |
| `items/bonehunter_buckler` | `SnoopethDuckDuck Pack 2/1px/29.png` | close | `src/assets/items/armor/snoopeth-p2-29.png` | grey-white ring of bones |
| `items/hawkfeather_buckler` | `SnoopethDuckDuck Pack 1/1px/17.png` | close | `src/assets/items/armor/snoopeth-p1-17.png` | gold winged crest |
| `items/thornwarden_targe` | `SnoopethDuckDuck Pack 2/1px/14.png` | close | `src/assets/items/armor/snoopeth-p2-14.png` | green vine lattice |
| `items/manticore_buckler` | `SnoopethDuckDuck Pack 1/1px/23.png` | close | `src/assets/items/armor/snoopeth-p1-23.png` | spiked orange crest |
| `items/gryphon_targe` | `SnoopethDuckDuck Pack 2/1px/10.png` | close | `src/assets/items/armor/snoopeth-p2-10.png` | gold and violet winged crest |
| `items/stagheart_buckler` | `SnoopethDuckDuck Pack 2/1px/17.png` | close | `src/assets/items/armor/snoopeth-p2-17.png` | brown crest with antlers |
| `items/wildlord_targe` | `SnoopethDuckDuck Pack 1/1px/22.png` | close | `src/assets/items/armor/snoopeth-p1-22.png` | green and white crest |
| `items/slayer_buckler` | `SnoopethDuckDuck Pack 1/1px/31.png` | close | `src/assets/items/armor/snoopeth-p1-31.png` | crimson spiked crest |
| `items/wayfarer_buckler` | `SnoopethDuckDuck Pack 2/1px/31.png` | close | `src/assets/items/armor/snoopeth-p2-31.png` | round green buckler |
| `items/gladiator_buckler` | `SnoopethDuckDuck Pack 1/1px/10.png` | close | `src/assets/items/armor/snoopeth-p1-10.png` | orange round buckler |
| `items/bone_spirit_shield` | `SnoopethDuckDuck Pack 2/1px/27.png` | close | `src/assets/items/armor/snoopeth-p2-27.png` | white orb in a pale frame |
| `items/magus_ward` | `SnoopethDuckDuck Pack 1/1px/2.png` | close | `src/assets/items/armor/snoopeth-p1-2.png` | blue round ward |
| `items/stargazer_ward` | `SnoopethDuckDuck Pack 1/1px/21.png` | close | `src/assets/items/armor/snoopeth-p1-21.png` | blue lattice orb |
| `items/raven_spirit_shield` | `SnoopethDuckDuck Pack 2/1px/8.png` | close | `src/assets/items/armor/snoopeth-p2-8.png` | dark crimson ward |
| `items/hierophant_ward` | `SnoopethDuckDuck Pack 1/1px/26.png` | close | `src/assets/items/armor/snoopeth-p1-26.png` | blue and white ward |
| `items/seraph_ward` | `SnoopethDuckDuck Pack 1/1px/30.png` | close | `src/assets/items/armor/snoopeth-p1-30.png` | white and blue winged ward |
| `items/oracle_ward` | `SnoopethDuckDuck Pack 2/1px/15.png` | close | `src/assets/items/armor/snoopeth-p2-15.png` | blue lattice |
| `items/astral_spirit_shield` | `SnoopethDuckDuck Pack 2/1px/6.png` | close | `src/assets/items/armor/snoopeth-p2-6.png` | blue grid ward |
| `items/celestial_ward` | `SnoopethDuckDuck Pack 2/1px/5.png` | close | `src/assets/items/armor/snoopeth-p2-5.png` | gold and blue gem crest |
| `items/studded_round_shield` | `SnoopethDuckDuck Pack 2/1px/4.png` | close | `src/assets/items/armor/snoopeth-p2-4.png` | gold rings on orange |
| `items/corsair_shield` | `SnoopethDuckDuck Pack 2/1px/30.png` | close | `src/assets/items/armor/snoopeth-p2-30.png` | grey and green round shield |
| `items/bladedancer_shield` | `SnoopethDuckDuck Pack 1/1px/20.png` | close | `src/assets/items/armor/snoopeth-p1-20.png` | crossed blades crest |
| `items/dragonscale_shield` | `SnoopethDuckDuck Pack 1/1px/15.png` | close | `src/assets/items/armor/snoopeth-p1-15.png` | red and gold shield |
| `items/warbringer_shield` | `SnoopethDuckDuck Pack 3/1px/14.png` | close | `src/assets/items/armor/snoopeth-p3-14.png` | red and bronze shield |
| `items/chaplain_shield` | `SnoopethDuckDuck Pack 1/1px/8.png` | close | `src/assets/items/armor/snoopeth-p1-8.png` | silver and blue diamond |
| `items/paladin_shield` | `SnoopethDuckDuck Pack 2/1px/20.png` | close | `src/assets/items/armor/snoopeth-p2-20.png` | gold cross on blue |
| `items/zealot_aegis` | `SnoopethDuckDuck Pack 1/1px/27.png` | close | `src/assets/items/armor/snoopeth-p1-27.png` | gold wings on dark |
| `items/hallowed_shield` | `SnoopethDuckDuck Pack 2/1px/23.png` | close | `src/assets/items/armor/snoopeth-p2-23.png` | gold ring lattice |
| `items/archon_aegis` | `SnoopethDuckDuck Pack 1/1px/29.png` | close | `src/assets/items/armor/snoopeth-p1-29.png` | blue and bronze tall shield |
| `items/exarch_aegis` | `SnoopethDuckDuck Pack 1/1px/7.png` | close | `src/assets/items/armor/snoopeth-p1-7.png` | blue and gold round crest |
| `items/sanctum_shield` | `SnoopethDuckDuck Pack 3/1px/9.png` | close | `src/assets/items/armor/snoopeth-p3-9.png` | blue and gold tall shield |
| `items/empyrean_aegis` | `SnoopethDuckDuck Pack 2/1px/3.png` | close | `src/assets/items/armor/snoopeth-p2-3.png` | crimson and gold crest |
| `items/duskweave_ward` | `SnoopethDuckDuck Pack 2/1px/13.png` | close | `src/assets/items/armor/snoopeth-p2-13.png` | purple heart-shaped ward |
| `items/nightshade_ward` | `SnoopethDuckDuck Pack 1/1px/19.png` | close | `src/assets/items/armor/snoopeth-p1-19.png` | violet thorned crest |
| `items/wraith_shield` | `SnoopethDuckDuck Pack 2/1px/19.png` | close | `src/assets/items/armor/snoopeth-p2-19.png` | grey ward with a pale gem |
| `items/umbral_ward` | `SnoopethDuckDuck Pack 2/1px/2.png` | close | `src/assets/items/armor/snoopeth-p2-2.png` | dim blue ward |
| `items/voidwalker_ward` | `SnoopethDuckDuck Pack 1/1px/28.png` | close | `src/assets/items/armor/snoopeth-p1-28.png` | violet and gold crest |
| `items/eclipse_ward` | `SnoopethDuckDuck Pack 2/1px/32.png` | close | `src/assets/items/armor/snoopeth-p2-32.png` | dark ring with red arcs |
| `items/abyssal_shield` | `SnoopethDuckDuck Pack 3/1px/13.png` | close | `src/assets/items/armor/snoopeth-p3-13.png` | dark blue and violet shield |
| `items/oblivion_ward` | `SnoopethDuckDuck Pack 2/1px/12.png` | close | `src/assets/items/armor/snoopeth-p2-12.png` | black and white crest |
| `uniques/gulls_eye` | `32 icons pack/icon29.png` | close | `src/assets/items/jewelry/icons32-29.png` | single orange eye |
| `materials/message_bottle` | `32 icons pack/icon16.png` | close | `src/assets/items/materials/icons32-16.png` | small corked bottle |
| `materials/tasalio_scale` | `32 icons pack/icon30.png` | close | `src/assets/items/materials/icons32-30.png` | teal shell plate |
| `items/wyrmlord_shield` | `SnoopethDuckDuck Pack 2/1px/1.png` | close | `src/assets/items/armor/snoopeth-p2-1.png` | orange-red crest shaped like a beast |

## Mapping (first 187 slots)

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
| `currency/instill` | `32 icons pack/icon20.png` | close | `src/assets/items/currency/icons32-20.png` | orange orb with a glint |
| `materials/gold` | `Woshi 64/gold_coin.png` | close | `src/assets/items/materials/woshi-gold_coin.png` | one coin rather than a stack |
| `materials/copper_ore` | `Woshi 64/copper_ore.png` | exact | `src/assets/items/materials/woshi-copper_ore.png` |  |
| `materials/iron_ore` | `CodeSpree rpg-items-all/hematite.png` | close | `src/assets/items/materials/codespree-hematite.png` | hematite: rusty red-grey ore, matches the description better than Woshi |
| `materials/mithril_ore` | `Woshi 64/iron_ore.png` | close | `src/assets/items/materials/woshi-iron_ore.png` | Woshi's iron ore: grey rock with silver flecks |
| `materials/rough_gem` | `Woshi 64/gem.png` | close | `src/assets/items/materials/woshi-gem.png` | purple gem, but cut rather than rough |
| `materials/ash_log` | `CodeSpree rpg-items-all/willow log.png` | close | `src/assets/items/materials/codespree-willow-log.png` | pale grey-olive bark, cream end |
| `materials/oak_log` | `CodeSpree rpg-items-all/cedar log.png` | close | `src/assets/items/materials/codespree-cedar-log.png` | dark brown bark, ringed end |
| `materials/yew_log` | `CodeSpree rpg-items-all/red pine log.png` | close | `src/assets/items/materials/codespree-red-pine-log.png` | reddish bark; cut end is pale |
| `materials/sunpetal` | `CodeSpree rpg-items-all/fritillaria.png` | placeholder | `src/assets/items/materials/codespree-fritillaria.png` | orange flowering plant, not a single yellow flower |
| `materials/frostleaf` | `32 icons pack/icon21.png` | close | `src/assets/items/materials/tint-frostleaf.png` | pale blue leaf. Recolour: hue 80, saturation 0.6, brightness 1.15 |
| `materials/emberroot` | `CodeSpree rpg-items-all/heartroot.png` | placeholder | `src/assets/items/materials/codespree-heartroot.png` | red bulbous root; no glow |
| `materials/voidbloom` | `CodeSpree rpg-items-all/rose.png` | placeholder | `src/assets/items/materials/codespree-rose.png` | dark red roses, not purple |
| `materials/arcane_dust` | `CodeSpree rpg-items-all/character powder.png` | close | `src/assets/items/materials/codespree-character-powder.png` | pink-purple powder heap |
| `flasks/life_small` | `Woshi 64/potion_health.png` | close | `src/assets/items/flasks/woshi-potion_health.png` | charge meter overlaid |
| `flasks/life_medium` | `32 icons pack/icon1.png` | close | `src/assets/items/flasks/tint-life_medium.png` | round red flask with a cork. Recolour: hue 15 |
| `flasks/life_grand` | `32 icons pack/icon2.png` | close | `src/assets/items/flasks/tint-life_grand.png` | large red jar, not tall. Recolour: hue 15 |
| `flasks/mana_small` | `Woshi 64/potion_mana.png` | close | `src/assets/items/flasks/woshi-potion_mana.png` | charge meter overlaid |
| `flasks/mana_medium` | `Kibyra UI pack (already in repo): items/consumables/potion-blue.png` | close | `src/assets/items/consumables/potion-blue.png` | Kibyra blue potion |
| `flasks/granite` | `Kibyra UI pack (already in repo): ui/decorations/bottle-grey.png` | close | `src/assets/ui/decorations/bottle-grey.png` | Kibyra grey bottle |
| `flasks/quicksilver` | `CodeSpree rpg-items-all/vial mercury.png` | close | `src/assets/items/flasks/codespree-vial-mercury.png` | glass vial of mercury |
| `flasks/diamond` | `32 icons pack/icon6.png` | close | `src/assets/items/flasks/tint-diamond.png` | clear faceted crystal bottle. Recolour: saturation 0.08, brightness 1.35 |
| `flasks/ruby` | `32 icons pack/icon6.png` | close | `src/assets/items/flasks/tint-ruby.png` | red faceted crystal bottle. Recolour: hue 40, saturation 1 |
| `items/rusted_sword` | `pasted sheet 1, cell 18` | placeholder | `src/assets/items/weapons/weapons30-18.png` | dull mossy blade with a wrapped grip; closer to worn than rusty |
| `items/whittled_dagger` | `Kibyra UI pack (already in repo): items/weapons/dagger.png` | close | `src/assets/items/weapons/dagger.png` | Kibyra dagger: iron blade, wooden grip; brighter style |
| `items/driftwood_wand` | `pasted sheet 1, cell 26` | close | `src/assets/items/weapons/weapons30-26.png` | tapered brown wood with a pink tuft |
| `items/iron_blade` | `Catalone weapon_split/7_part_014.png` | close | `src/assets/items/weapons/catalone-w7-014.png` | plain straight longsword; dark blade, gold guard |
| `items/glinting_dagger` | `Catalone weapon_split/5_part_004.png` | close | `src/assets/items/weapons/catalone-w5-004.png` | small steel dagger; small red gem in guard |
| `items/war_axe` | `Catalone weapon_split/3_part_015.png` | close | `src/assets/items/weapons/catalone-w3-015.png` | one-handed axe, dark iron head, wooden haft |
| `items/steel_broadsword` | `Catalone weapon_split/1_part_002.png` | close | `src/assets/items/weapons/catalone-w1-002.png` | wide straight blade, brass cross guard |
| `items/mithril_sabre` | `Catalone weapon_split/3_part_007.png` | close | `src/assets/items/weapons/catalone-w3-007.png` | curved pale blue-teal sabre |
| `items/plank_shield` | `Kibyra UI pack (already in repo): ui/decorations/shield-round-wood.png` | placeholder | `src/assets/ui/decorations/shield-round-wood.png` | Kibyra round wooden shield; round, not planks |
| `items/buckler` | `Catalone shield_split/10_part_004.png` | close | `src/assets/items/armor/catalone-s10-004.png` | small round wood shield, iron rim and boss |
| `items/kite_shield` | `Catalone shield_split/4_part_009.png` | placeholder | `src/assets/items/armor/catalone-s4-009.png` | kite with an emblem |
| `items/tower_shield` | `RPG_Weapons.aseprite, Itens layer, q23` | close | `src/assets/items/armor/tint-tower-shield.png` | tall silver-blue tower shield. Recolour: hue 180, saturation 0.7 |
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
| `items/coral_amulet` | `game-icons.net gem-pendant.svg` | close | `src/assets/items/jewelry/gi-gem-pendant.svg` | silhouette tinted coral |
| `items/amber_amulet` | `game-icons.net intricate-necklace.svg` | close | `src/assets/items/jewelry/gi-intricate-necklace.svg` | silhouette tinted amber |
| `items/jade_amulet` | `game-icons.net emerald-necklace.svg` | close | `src/assets/items/jewelry/gi-emerald-necklace.svg` | silhouette tinted jade green |
| `items/onyx_amulet` | `game-icons.net gem-necklace.svg` | close | `src/assets/items/jewelry/gi-gem-necklace.svg` | silhouette tinted onyx grey-violet |
| `items/iron_ring` | `32 icons pack/icon27.png` | close | `src/assets/items/jewelry/tint-iron_ring.png` | plain dark band with a dull stone. Recolour: saturation 0.2 |
| `items/ruby_ring` | `32 icons pack/icon26.png` | close | `src/assets/items/jewelry/tint-ruby_ring.png` | dark band, red stone. Recolour: hue 15, saturation 1.1 |
| `items/sapphire_ring` | `32 icons pack/icon26.png` | close | `src/assets/items/jewelry/tint-sapphire_ring.png` | dark band, blue stone. Recolour: hue 240, saturation 1 |
| `items/topaz_ring` | `32 icons pack/icon26.png` | close | `src/assets/items/jewelry/tint-topaz_ring.png` | dark band, yellow stone. Recolour: hue 70, saturation 1 |
| `items/diamond_ring` | `32 icons pack/icon26.png` | close | `src/assets/items/jewelry/tint-diamond_ring.png` | pale band and clear stone. Recolour: saturation 0.08, brightness 1.35 |
| `uniques/miners_lament` | `gear sets/set-55-helmet.png` | placeholder | `src/assets/items/armor/set-55-helmet.png` | plain iron helmet; no lantern |
| `uniques/bloodthirst` | `Catalone weapon_split/2_part_008.png` | close | `src/assets/items/weapons/catalone-w2-008.png` | short sword with a red streak down the blade |
| `uniques/emberheart` | `gear sets/set-10-body.png` | close | `src/assets/items/armor/set-10-body.png` | gold breastplate with an orange stone in the chest |
| `uniques/windstep` | `gear sets/set-04-legs.png` | placeholder | `src/assets/items/armor/set-04-legs.png` | brown fur-trimmed boots; no feathers |
| `uniques/alchemists_band` | `32 icons pack/icon25.png` | close | `src/assets/items/jewelry/icons32-25.png` | ring with a green stone; not a vial |
| `uniques/iron_bulwark` | `Catalone shield_split/9_part_005.png` | placeholder | `src/assets/items/armor/catalone-s9-005.png` | studded iron kite with red gem |
| `uniques/starforged_edge` | `pasted sheet 1, cell 6` | close | `src/assets/items/weapons/weapons30-6.png` | dark curved blade with blue star glints |
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

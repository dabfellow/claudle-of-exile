# Asset credits

Files are named after their pack: `catalone-`, `woshi-`, `codespree-`, `sn-`, `craftpix-`, `freesample-`, `craft32-`, `remedies-`, `softline-`, `gegx-`, `set-NN-`, `snoopeth-pN-`, `quintino-`, `weapons30-`, `icons32-`. Unprefixed PNGs are Kibyra.

- **icons/\*\*.svg**: [game-icons.net](https://game-icons.net), CC BY 3.0 (a few CC0). Attribution required; authors are listed in `icons/LICENSE-game-icons.txt`. White on transparent, renamed to match game ids (`skills/mining.svg` was lorc's `mining.svg`).
- **Unprefixed PNGs in icons/, ui/ and items/** (for example `items/weapons/dagger.png`, `items/currency/gem-red.png`): Free Medieval Fantasy UI Pack by Kibyra. Free for personal and commercial use; credit appreciated. The pack itself may not be redistributed or resold as-is.
- **items/armor/set-NN-\*.png**: "gear sets" pack (89 four-piece sets, 64×64). Source and license not recorded yet. Slots are helmet, gloves, body and legs (sets 07 and 63 have a belt in place of a helmet; set 75's "helmet" file is also a belt).
- **items/\*/tint-\*.png**: recoloured copies of pack pieces, made in-repo as stand-ins until real art exists. Same licence as their source: `mace.png` (also the oak club), `bow.png`, `spear.png` (Kibyra), `codespree-stick.png` (CodeSpree), `catalone-s10-004.png` and `catalone-s9-005.png` (Catalone). `items/weapons/rusty-hatchet.png` is a copy of Kibyra's `ui/decorations/axe.png`.
- **monsters/tint-\***: recoloured Act 2, Act 3, Act 5 and Act 6 copies of CodeSpree, Craftpix and free_sample pieces, same licence as their source (the recolour provenance table below lists the recorded sources).
- **catalone-\*.png**: Dark fantasy Asset Pack 2 (weapons and shields) by Catalone, 64×64. No licence file in the download; check the store page before release. Named after the split file (`catalone-w3-015` = `weapon_split/3_part_015.png`, `s` = `shield_split`).
- **woshi-\*.png**: Woshi Studio, Free 30 Pixel Item Icons (64px set). Personal and commercial use, may be modified, not resold as an icon pack.
- **codespree-\*.png**: rpg-items-all and rpg-beings-all (attributed to CodeSpree), 64×64. No licence file in the download; check before release.
- **craftpix-\*.png**: Free Fantasy Character Avatar Icons (Pixel Art), Craftpix. Craftpix file licence (https://craftpix.net/file-licenses/).
- **freesample-\*.jpg**: free_sample pack, painted 64/128px portraits. Author and licence not recorded; check before release.
- **sn-\*.png**: Fantasy Pixel Icons, Skills (v002) and Elements (v004) free tiers, attributed to SanguineNite. No licence file in the download; check before release.
- **craft32-\*.png**: 32 Medieval Crafting Icons (free). No licence file in the download; check before release.
- **remedies-\*.png**: Grounded Medieval Remedies by Eldrion Team. Free for personal and commercial products; not to be redistributed as an asset pack. Credit appreciated: "Eldrion Team".
- **softline-\*.png**: Softline RPG Icons FREE 100 by The Cooked Works (see the pack's LICENSE.pdf).
- **zones/gegx-\*.webp, scenes/gegx-\*.webp**: Painterly Backgrounds free sample by GegX (gegx.itch.io), AI-generated and hand-curated, resized to 1600px webp. Free for commercial and non-commercial projects; may not be redistributed as an asset pack or used to train image models.
- **Packs added 2026-10-31:** the owner says all four below were free itch.io files, and to assume free public use is allowed while the game isn't sold. That assumption applies for now; recheck each one before any paid release.
- **armor/snoopeth-p1-\*.png, snoopeth-p2-\*.png**: shield packs 1 and 2 by SnoopethDuckDuck (snoopethduckduck.itch.io). CC0, per the licence file in each pack.
- **armor/snoopeth-p3-\*.png**: shield pack 3 by SnoopethDuckDuck (snoopethduckduck.itch.io). CC BY 4.0, per the pack's licence file. Credit required: by SnoopethDuckDuck. The pieces are enlarged 3×.
- **quintino-\*.png**: RPG Weapons by quintino_pixels, exported from `RPG_Weapons.aseprite`. Free itch.io file, under the owner's assumption above; no licence file in the download. `armor/tint-tower-shield.png` is a recolour of `quintino-q23.png`.
- **weapons30-\*.png**: a pasted 30-sword sheet, enlarged 2×. Free itch.io file, under the owner's assumption above; pack name and author not recorded.
- **icons32-\*.png** and the ring, flask and frostleaf `tint-*.png` recolours made from them: a set of 32 pixel icons, enlarged 2×. Free itch.io file, under the owner's assumption above; pack name and author not recorded.
- **music/\*.ogg**: 10 Medieval Tracks by AlkaKrab (itch.io), free pack, the looping versions of Silverbrook, Emberlight, Elven Dawn and Throne of Storms, re-encoded to 96 kbps Opus. Assumed free for public use while the game isn't sold. The pack's licence PDF goes further: royalty-free, commercial use allowed, credit appreciated, edits for timing, volume or EQ allowed. The files may not be redistributed as-is, and open-source games need the author's permission (alkakrab04@gmail.com), so ask before making this repo public.

Current game-id mappings are in `src/ui/assets.ts`; custom overrides are in `src/assets/art`. Historical recolour recipes are retained below; they are provenance, not a current art coverage report.


## Recorded recolour provenance

Consolidated from the retired asset mapping report. Confirm current usage against `src/ui/assets.ts`. Original columns include historical confidence/destination notes. These source and transformation records are retained for attribution and reproducibility.

| Game asset ID | Source file | Historical confidence | Destination | Transformation / notes |
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
| `uniques/corposant` | `gear sets/set-30-helmet.png` | close | `src/assets/items/armor/tint-corposant.png` | Recolour: tint 150,200,245 |
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
| `monsters/vulture` | `Craftpix avatars Transperent/con32.png` | close | `src/assets/monsters/tint-vulture.png` | black crow head, not bald. Recolour: hue 30, saturation 1.6, brightness 1.15 |
| `monsters/khorun` | `Craftpix avatars Transperent/con33.png` | close | `src/assets/monsters/tint-khorun.png` | scowling red-bearded nomad in a fur hood; no horse or banner. Recolour: hue 330, saturation 0.75, brightness 0.6 |
| `monsters/saltcrawler` | `CodeSpree rpg-beings-all/Angry crab.png` | close | `src/assets/monsters/tint-saltcrawler.png` | pale crab. Recolour: lightness 34, tint 235,225,200 |
| `monsters/mirage` | `Craftpix avatars Transperent/con40.png` | close | `src/assets/monsters/tint-mirage.png` | pale see-through humanoid; eyes are faint, not bright. Recolour: saturation 0.1, brightness 1.4, 75% opacity |
| `monsters/dustdevil` | `CodeSpree rpg-beings-all/Electrogust.png` | close | `src/assets/monsters/tint-dustdevil.png` | sandy whirlwind with a face. Recolour: saturation 0.55, brightness 0.95 |
| `monsters/saltwitch` | `Craftpix avatars Transperent/con12.png` | close | `src/assets/monsters/tint-saltwitch.png` | bleached hood, white hair and face wrap, same base as the mage portrait; no frost. Recolour: saturation 0.1, brightness 1.25 |
| `monsters/glass` | `free_sample/a66.jpg` | placeholder | `src/assets/monsters/tint-glass.jpg` | silvered woman's portrait; no cracked glass, same face as `qara`. Recolour: saturation 0.1, brightness 1.15, linear 1.5/-50, tint 200,235,255 |
| `monsters/grasscat` | `CodeSpree rpg-beings-all/Purple cat.png` | close | `src/assets/monsters/tint-grasscat.png` | small dark cat, not a big cat. Recolour: saturation 0.15, lightness -1 |
| `monsters/ashmane` | `Craftpix avatars Transperent/con31.png` | close | `src/assets/monsters/tint-ashmane.png` | golden-orange lion-like head; mane is fur, not fire. Recolour: hue 15, saturation 1.9, brightness 1.35 |
| `monsters/raider` | `Craftpix avatars Transperent/con3.png` | close | `src/assets/monsters/tint-raider.png` | tan hood and face wrap; no scimitar. Recolour: brightness 1.25, tint 205,165,105 |
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
| `monsters/pyregolem` | `Craftpix avatars Transperent/con25.png` | close | `src/assets/monsters/tint-pyregolem.png` | molten rock head in flames. Recolour: hue -15, saturation 1.3, brightness 0.9 |
| `monsters/ozar` | `Craftpix avatars Transperent/con10.png` | close | `src/assets/monsters/tint-ozar.png` | tall pale mask with red-gold flames around it, same base as `emberkin`; no staff. Recolour: hue -30, saturation 2, brightness 0.95 |
| `monsters/sunguard` | `free_sample/mobeK1S.jpg` | close | `src/assets/monsters/tint-sunguard.jpg` | bronze-gold helmed guard. Recolour: hue -170, saturation 1.5, brightness 1.15 |
| `monsters/ashseer` | `free_sample/op36.jpg` | placeholder | `src/assets/monsters/tint-ashseer.jpg` | grey hooded figure, mouth wrapped rather than eyes. Recolour: saturation 0.25, brightness 1.15 |
| `monsters/sunpriest` | `free_sample/moooob27.jpg` | placeholder | `src/assets/monsters/tint-sunpriest.jpg` | gold wash over a stern face; no sun disc. Recolour: tint 235,175,60 |
| `monsters/azhar` | `Craftpix avatars Transperent/con32.png` | close | `src/assets/monsters/tint-azhar.png` | fiery orange raptor's head; no full wings, same base as `vulture`. Recolour: linear 1.6/50, saturation 1.1, tint 255,120,30 |
| `materials/frostleaf` | `32 icons pack/icon21.png` | close | `src/assets/items/materials/tint-frostleaf.png` | pale blue leaf. Recolour: hue 80, saturation 0.6, brightness 1.15 |
| `flasks/life_medium` | `32 icons pack/icon1.png` | close | `src/assets/items/flasks/tint-life_medium.png` | round red flask with a cork. Recolour: hue 15 |
| `flasks/life_grand` | `32 icons pack/icon2.png` | close | `src/assets/items/flasks/tint-life_grand.png` | large red jar, not tall. Recolour: hue 15 |
| `flasks/diamond` | `32 icons pack/icon6.png` | close | `src/assets/items/flasks/tint-diamond.png` | clear faceted crystal bottle. Recolour: saturation 0.08, brightness 1.35 |
| `flasks/ruby` | `32 icons pack/icon6.png` | close | `src/assets/items/flasks/tint-ruby.png` | red faceted crystal bottle. Recolour: hue 40, saturation 1 |
| `items/tower_shield` | `RPG_Weapons.aseprite, Itens layer, q23` | close | `src/assets/items/armor/tint-tower-shield.png` | tall silver-blue tower shield. Recolour: hue 180, saturation 0.7 |
| `items/iron_ring` | `32 icons pack/icon27.png` | close | `src/assets/items/jewelry/tint-iron_ring.png` | plain dark band with a dull stone. Recolour: saturation 0.2 |
| `items/ruby_ring` | `32 icons pack/icon26.png` | close | `src/assets/items/jewelry/tint-ruby_ring.png` | dark band, red stone. Recolour: hue 15, saturation 1.1 |
| `items/sapphire_ring` | `32 icons pack/icon26.png` | close | `src/assets/items/jewelry/tint-sapphire_ring.png` | dark band, blue stone. Recolour: hue 240, saturation 1 |
| `items/topaz_ring` | `32 icons pack/icon26.png` | close | `src/assets/items/jewelry/tint-topaz_ring.png` | dark band, yellow stone. Recolour: hue 70, saturation 1 |
| `items/diamond_ring` | `32 icons pack/icon26.png` | close | `src/assets/items/jewelry/tint-diamond_ring.png` | pale band and clear stone. Recolour: saturation 0.08, brightness 1.35 |

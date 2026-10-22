# Art prompt pack (ChatGPT image generation)

> Generated from `src/data/artManifest.ts` by `npm run art -- --docs`. Edit prompts there, not here.

## Workflow

1. Start **one ChatGPT conversation per section** below and paste the **style block** first, then ask for one image per message.
2. Save each image with the **exact file name** listed (e.g. `chaos.png`). Drop it into `src/assets/art/<folder>/`, or loose into `src/assets/art/` if the name is unique.
3. Run `npm run art`. It resizes and compresses every new image to `.webp`, deletes the original, and prints what is still missing.
4. Refresh the game — art appears automatically; anything missing keeps its placeholder.

Tips: if a picture drifts in style, reply *"same style as the first image, but …"*. Icons need a **transparent background** — if you get a solid one, say *"make the background transparent"*. Check the current OpenAI terms on image usage before a commercial release.

### Style block — paste at the start of every conversation

```
Art style for a dark-fantasy browser game called "Claudle of Exile" (inspired by Path of Exile and Diablo):
painterly digital illustration, grim and moody, desaturated earthy palette with warm candle/ember highlights
(gold #d2a659 accents), strong rim lighting, high detail but readable at small sizes, no text, no logos,
no watermarks, no UI frames. Keep this exact style for every image I ask for in this conversation.
```

---

## Priority 1 — Portraits — trader, guide, classes (5)

Folder: `src/assets/art/portraits/` — 1024×1024 square, chest-up portrait, dark vignette background.

| File | Prompt (after the style block) |
|---|---|
| `trader.png` | A wandering merchant in his fifties, weathered face, sly half-smile, hooded travel cloak covered in pouches, a lantern hanging beside him, coins and trinkets on a crate in front of him, cave hideout in the background. |
| `brannoc.png` | "Old Brannoc", a hunched elderly survivor with a scarred face and a grey braided beard, wrapped in a patched fur cloak, sitting by a small fire in a seaside cliff cave, kind but tired eyes. |
| `class_warrior.png` | A battle-worn warrior in dented iron plate, rusted sword over the shoulder, red cloth tabard, determined stare, stormy shoreline behind. |
| `class_ranger.png` | A lean ranger in dark leather armour and a green hood, twin daggers, alert and poised, misty marsh reeds behind. |
| `class_mage.png` | A young mage in a worn blue robe holding a crooked driftwood wand crackling with blue lightning, intense eyes lit by the spark, ruined stone archway behind. |

---

## Priority 1 — Scenes — title screen and hideout backdrop (2)

Folder: `src/assets/art/scenes/` — Wide landscape 1792×1024, environment only, no characters, darker towards the bottom so text stays readable.

| File | Prompt (after the style block) |
|---|---|
| `title.png` | A grim storm-lashed coastline at night, a lone figure-sized gap of firelight in a cliff cave above the tide, shipwrecks in the surf, distant ruined towers, rain and embers in the air. |
| `hideout.png` | Inside a large seaside cliff cave turned into a camp: rough stone walls, a central fire pit, hanging lanterns, crates and furs, a glimpse of the night sea through the cave mouth. |

---

## Priority 2 — Hideout stations (6)

Folder: `src/assets/art/stations/` — 1024×1024, single object on a dark cave-floor background, three-quarter view.

| File | Prompt (after the style block) |
|---|---|
| `map_device.png` | An ancient stone ring device with glowing purple runes and a swirling portal in its centre, set into a cave floor. |
| `stash.png` | A heavy iron-banded wooden chest overflowing with gold coins, glowing orbs and gear, padlock hanging open. |
| `forge.png` | A dwarven stone forge with glowing coals, an anvil, hammer and tongs, sparks flying. |
| `alchemy_table.png` | A cluttered alchemy table with bubbling glass flasks in red, blue and purple, herbs drying overhead, a small brazier underneath. |
| `bench.png` | A sturdy crafting workbench with clamps, a jeweller's loupe, scattered gemstones and a few glowing currency orbs. |
| `vendor.png` | A small merchant stall made of crates and a patched canvas awning, lanterns, goods hanging from hooks. |

---

## Priority 2 — Area banners (8)

Folder: `src/assets/art/zones/` — Wide landscape 1792×1024, environment only, no characters.

| File | Prompt (after the style block) |
|---|---|
| `mudflats.png` | Grey tidal mud flats at dusk, broken shipwreck ribs, pools of dark water, drowned corpses half-buried, distant cliffs. |
| `brinecaves.png` | Dripping sea caves lit by pale green bioluminescence, tide pools, salt crusted rock, a wrecked rowing boat. |
| `ashwood.png` | A burned forest still smouldering, black trunks, glowing embers in the undergrowth, orange haze. |
| `blackreed.png` | A dark marsh of towering black reeds, still green water, fog, a crooked hut on stilts in the distance. |
| `crypt.png` | A flooded underground crypt, ankle-deep cold water, stone sarcophagi, pale blue light through cracks. |
| `shipgrave.png` | A grey bay choked with rotting shipwrecks piled on each other, broken masts, gulls, a stormy sky. |
| `stormcliffs.png` | Sheer black sea cliffs in a violent storm, lightning striking the rocks, crashing waves far below. |
| `sanctum.png` | A sunken cathedral underwater, broken stained glass, coral growing over pews, a throne of shells at the far end, shafts of blue light. |

---

## Priority 3 — Monsters (40)

Folder: `src/assets/art/monsters/` — 1024×1024, creature portrait, head and shoulders, dark background.

| File | Prompt (after the style block) |
|---|---|
| `rat.png` | a drowned rat, bloated and dripping, glowing pale eyes |
| `crab.png` | a large mud-caked crab with a cracked shell and one oversized claw |
| `zombie.png` | a waterlogged corpse rising from the mud, seaweed in its hair |
| `wisp.png` | a crackling yellow bog wisp, a ball of lightning with a faint face |
| `gorger.png` | BOSS — a huge bloated swamp creature with a gaping toothy maw and barnacled skin |
| `crawler.png` | a pale eyeless cave crawler, a many-legged insect with slick wet plates |
| `brinebat.png` | a salt-encrusted bat with torn wings and needle teeth |
| `sailor.png` | a drowned sailor in a rotting striped shirt, rope still around his neck |
| `siren.png` | a gaunt salt siren with grey scaled skin and frost on her lips, mouth open in a song |
| `harrow.png` | BOSS — "Captain Harrow", a drowned ship captain in a ragged tricorn and greatcoat, a lantern of green fire on his belt |
| `cinderhound.png` | a skeletal hound wreathed in embers, smoke pouring from its jaws |
| `treant.png` | a charred walking tree, cracks in its bark glowing orange |
| `harpy.png` | a ragged harpy with ash-grey feathers and burning eyes |
| `emberkin.png` | a small hunched fire shaman with a bone mask and a smoking staff |
| `pyre.png` | BOSS — "Pyre-Mother Ulva", a towering witch of living flame crowned with burning antlers |
| `lurker.png` | a hulking bog lurker covered in moss and mud, only its yellow eyes and jaws visible |
| `stalker.png` | a thin reed stalker, a lanky humanoid woven from black reeds with a bone spear |
| `toad.png` | a huge sickly plague toad with frost-blue boils and a dripping tongue |
| `fenwitch.png` | a fen witch with a crown of reeds and crackling lightning in her hands |
| `sedge.png` | BOSS — "Old Mother Sedge", an ancient hag grown into the marsh, roots for legs, lightning in her eyes |
| `ghoul.png` | a gaunt crypt ghoul with long claws, pale wet skin |
| `frostwraith.png` | a hooded frost wraith, icy mist trailing from its empty robes |
| `skeleton.png` | a skeletal warden in rusted tomb armour holding a halberd |
| `lich.png` | a drowned lich in waterlogged robes, a glowing blue phylactery at its chest |
| `tidecaller.png` | BOSS — "Tidecaller Morvane", a corrupted sea priestess with a coral crown, water swirling around her |
| `brute.png` | a hulking barnacle-covered brute with an anchor for a weapon |
| `gunner.png` | a drowned ship gunner holding a smoking hand cannon, burning fuse in his teeth |
| `gulls.png` | a screaming swarm of scraggy black-eyed gulls |
| `wreckshaman.png` | a wreck shaman wearing a ship figurehead as a mask, lightning arcing from a driftwood staff |
| `vosk.png` | BOSS — "Admiral Vosk", a bloated drowned admiral in a waterlogged naval coat covered in medals, flintlock and cutlass |
| `ravager.png` | a cliff ravager, a lean grey beast with hooked claws for climbing rock |
| `galeborn.png` | a galeborn spirit, a humanoid made of whirling wind and lightning |
| `rockback.png` | a giant crab with a boulder grown into its shell |
| `stormcaller.png` | a storm caller in a soaked hooded robe, holding a staff that crackles with lightning |
| `skarra.png` | BOSS — "Skarra, Queen of Gales", a huge harpy queen with storm-grey wings and a crown of lightning |
| `zealot.png` | a tidebound zealot in a drowned monk habit, chains and frost around his fists |
| `eel.png` | an abyssal eel, long and black with glowing blue electric markings |
| `coralgolem.png` | a coral golem, a lumbering figure of pink and white coral with a glowing core |
| `priest.png` | a sanctum priest with a cracked mitre and a frozen censer |
| `ysolde.png` | BOSS — "Ysolde, the Drowned Queen", a regal drowned queen with pale blue skin, a crown of shells and pearls, hair floating as if underwater, lightning in her hands |

---

## Priority 3 — Currency orbs (13)

Folder: `src/assets/art/currency/` — 1024×1024, transparent background, one object centred like an inventory icon.

| File | Prompt (after the style block) |
|---|---|
| `transmute.png` | An inventory icon of a small pale-blue glass orb with a swirling inner light, centred, transparent background. |
| `augment.png` | An inventory icon of a deep blue orb with a silver plus-shaped rune, centred, transparent background. |
| `alteration.png` | An inventory icon of a light-blue orb wrapped in a thin bronze spiral, centred, transparent background. |
| `regal.png` | An inventory icon of a gold orb with a tiny crown etched on it, centred, transparent background. |
| `alchemy.png` | An inventory icon of a golden orb filled with bubbling liquid, centred, transparent background. |
| `scour.png` | An inventory icon of a matte white-grey stone orb with a hole through the middle, centred, transparent background. |
| `chaos.png` | An inventory icon of a dark gold orb with a chaotic swirling sigil, centred, transparent background. |
| `annul.png` | An inventory icon of a cracked pure-white orb leaking faint light, centred, transparent background. |
| `exalted.png` | An inventory icon of a radiant pale-gold orb with small wings, centred, transparent background. |
| `divine.png` | An inventory icon of a cream-white orb glowing with holy light rays, centred, transparent background. |
| `regret.png` | An inventory icon of a muted green orb with a faint backwards-spiral rune, centred, transparent background. |
| `expansion.png` | An inventory icon of a violet orb with three small sockets around its rim, centred, transparent background. |
| `instill.png` | An inventory icon of a glowing orange orb with liquid fire swirling inside, centred, transparent background. |

---

## Priority 4 — Materials (13)

Folder: `src/assets/art/materials/` — 1024×1024, transparent background, inventory icon.

| File | Prompt (after the style block) |
|---|---|
| `gold.png` | An inventory icon of a small stack of old gold coins, centred, transparent background. |
| `copper_ore.png` | An inventory icon of a chunk of raw copper ore, centred, transparent background. |
| `iron_ore.png` | An inventory icon of a chunk of dark grey iron ore, centred, transparent background. |
| `mithril_ore.png` | An inventory icon of a chunk of pale cyan metallic mithril ore, centred, transparent background. |
| `rough_gem.png` | An inventory icon of an uncut magenta gemstone, centred, transparent background. |
| `ash_log.png` | An inventory icon of a pale ash wood log, centred, transparent background. |
| `oak_log.png` | An inventory icon of a sturdy brown oak log, centred, transparent background. |
| `yew_log.png` | An inventory icon of a dark red-brown yew log, centred, transparent background. |
| `sunpetal.png` | An inventory icon of a bright yellow sunpetal flower, centred, transparent background. |
| `frostleaf.png` | An inventory icon of an icy blue frosted leaf, centred, transparent background. |
| `emberroot.png` | An inventory icon of a gnarled root glowing orange at the tips, centred, transparent background. |
| `voidbloom.png` | An inventory icon of a purple flower with a black void-like centre, centred, transparent background. |
| `arcane_dust.png` | An inventory icon of a small pile of glittering lavender dust, centred, transparent background. |

---

## Priority 4 — Flasks (9)

Folder: `src/assets/art/flasks/` — 1024×1024, transparent background, a single glass flask, upright.

| File | Prompt (after the style block) |
|---|---|
| `life_small.png` | An inventory icon of a small round flask of glowing red liquid, upright, centred, transparent background. |
| `life_medium.png` | An inventory icon of a larger round flask of glowing red liquid, upright, centred, transparent background. |
| `life_grand.png` | An inventory icon of a tall ornate flask of glowing red liquid with brass fittings, upright, centred, transparent background. |
| `mana_small.png` | An inventory icon of a small flask of glowing blue liquid, upright, centred, transparent background. |
| `mana_medium.png` | An inventory icon of a larger flask of glowing blue liquid, upright, centred, transparent background. |
| `granite.png` | An inventory icon of a stone-grey flask with a rock texture, upright, centred, transparent background. |
| `quicksilver.png` | An inventory icon of a flask of swirling liquid silver, upright, centred, transparent background. |
| `diamond.png` | An inventory icon of a crystal-clear flask full of sparkles, upright, centred, transparent background. |
| `ruby.png` | An inventory icon of a deep-red faceted gem-like flask, upright, centred, transparent background. |

---

## Priority 5 — Item bases (44)

Folder: `src/assets/art/items/` — 1024×1024, transparent background, a single item laid flat or upright like a Diablo inventory icon.

| File | Prompt (after the style block) |
|---|---|
| `rusted_sword.png` | An inventory icon of a rusted, notched short sword, centred, transparent background. |
| `whittled_dagger.png` | An inventory icon of a crude whittled wooden-handled dagger, centred, transparent background. |
| `driftwood_wand.png` | An inventory icon of a crooked driftwood wand with a sparking tip, centred, transparent background. |
| `iron_blade.png` | An inventory icon of a plain iron longsword, centred, transparent background. |
| `glinting_dagger.png` | An inventory icon of a polished steel dagger that glints, centred, transparent background. |
| `war_axe.png` | An inventory icon of a heavy bearded war axe, centred, transparent background. |
| `steel_broadsword.png` | An inventory icon of a broad steel sword with a leather grip, centred, transparent background. |
| `mithril_sabre.png` | An inventory icon of a curved pale-blue mithril sabre, centred, transparent background. |
| `plank_shield.png` | An inventory icon of a splintered wooden plank shield, centred, transparent background. |
| `buckler.png` | An inventory icon of a small round goathide buckler, centred, transparent background. |
| `kite_shield.png` | An inventory icon of an iron kite shield, centred, transparent background. |
| `tower_shield.png` | An inventory icon of a tall pale-blue mithril tower shield, centred, transparent background. |
| `iron_hat.png` | An inventory icon of a simple dented iron cap, centred, transparent background. |
| `leather_cap.png` | An inventory icon of a worn leather cap, centred, transparent background. |
| `soldier_helm.png` | An inventory icon of a steel soldier helmet with a nose guard, centred, transparent background. |
| `hunter_hood.png` | An inventory icon of a dark green hunter hood, centred, transparent background. |
| `great_helm.png` | An inventory icon of a heavy mithril great helm with a visor, centred, transparent background. |
| `shadow_mask.png` | An inventory icon of a black cloth mask with silver trim, centred, transparent background. |
| `plate_vest.png` | An inventory icon of a battered iron plate vest, centred, transparent background. |
| `shabby_jerkin.png` | An inventory icon of a shabby patched leather jerkin, centred, transparent background. |
| `chainmail.png` | An inventory icon of a chainmail hauberk, centred, transparent background. |
| `scale_leather.png` | An inventory icon of scale-reinforced leather armour, centred, transparent background. |
| `mithril_plate.png` | An inventory icon of a gleaming mithril breastplate, centred, transparent background. |
| `assassin_garb.png` | An inventory icon of a sleek black assassin's coat, centred, transparent background. |
| `iron_gauntlets.png` | An inventory icon of a pair of iron gauntlets, centred, transparent background. |
| `rawhide_gloves.png` | An inventory icon of a pair of rawhide gloves, centred, transparent background. |
| `steel_gauntlets.png` | An inventory icon of a pair of polished steel gauntlets, centred, transparent background. |
| `stealth_gloves.png` | An inventory icon of a pair of thin black leather gloves, centred, transparent background. |
| `iron_greaves.png` | An inventory icon of a pair of iron greaves, centred, transparent background. |
| `leather_boots.png` | An inventory icon of a pair of worn leather boots, centred, transparent background. |
| `steel_greaves.png` | An inventory icon of a pair of steel greaves, centred, transparent background. |
| `shagreen_boots.png` | An inventory icon of a pair of supple grey shagreen boots, centred, transparent background. |
| `chain_belt.png` | An inventory icon of a belt made of iron chain links, centred, transparent background. |
| `leather_belt.png` | An inventory icon of a plain leather belt with a brass buckle, centred, transparent background. |
| `heavy_belt.png` | An inventory icon of a thick heavy belt with iron studs, centred, transparent background. |
| `coral_amulet.png` | An inventory icon of an amulet with a red coral pendant, centred, transparent background. |
| `amber_amulet.png` | An inventory icon of an amulet with an amber pendant, centred, transparent background. |
| `jade_amulet.png` | An inventory icon of an amulet with a jade pendant, centred, transparent background. |
| `onyx_amulet.png` | An inventory icon of an amulet with a black onyx pendant, centred, transparent background. |
| `iron_ring.png` | An inventory icon of a plain iron ring, centred, transparent background. |
| `ruby_ring.png` | An inventory icon of a gold ring set with a ruby, centred, transparent background. |
| `sapphire_ring.png` | An inventory icon of a silver ring set with a sapphire, centred, transparent background. |
| `topaz_ring.png` | An inventory icon of a gold ring set with a yellow topaz, centred, transparent background. |
| `diamond_ring.png` | An inventory icon of a platinum ring set with a diamond, centred, transparent background. |

---

## Priority 5 — Unique items (8)

Folder: `src/assets/art/uniques/` — 1024×1024, transparent background, an ornate legendary version of the item with a faint orange glow.

| File | Prompt (after the style block) |
|---|---|
| `miners_lament.png` | An inventory icon of a legendary iron miner's helmet with a cracked lantern, called Miner's Lament, faint orange magical glow, centred, transparent background. |
| `bloodthirst.png` | An inventory icon of a legendary rusted sword dripping blood, called Bloodthirst, faint orange magical glow, centred, transparent background. |
| `emberheart.png` | An inventory icon of a legendary iron breastplate with a glowing ember set in the chest, called Emberheart, faint orange magical glow, centred, transparent background. |
| `windstep.png` | An inventory icon of a legendary pair of leather boots with swirling wind around them, called Windstep, faint orange magical glow, centred, transparent background. |
| `alchemists_band.png` | An inventory icon of a legendary iron ring set with a tiny bubbling vial, called Alchemist's Band, faint orange magical glow, centred, transparent background. |
| `iron_bulwark.png` | An inventory icon of a legendary massive riveted iron kite shield, called The Iron Bulwark, faint orange magical glow, centred, transparent background. |
| `starforged_edge.png` | An inventory icon of a legendary mithril sabre with stars glittering in the blade, called Starforged Edge, faint orange magical glow, centred, transparent background. |
| `titans_girth.png` | An inventory icon of a legendary enormous studded belt with a giant's skull buckle, called Titan's Girth, faint orange magical glow, centred, transparent background. |

---

## Priority 6 — Skill gems (39)

Folder: `src/assets/art/gems/` — 1024×1024, transparent background, a cut gemstone with a glowing symbol inside it.

| File | Prompt (after the style block) |
|---|---|
| `heavy_strike.png` | An inventory icon of a faceted red ruby gem with a hammer glowing inside, centred, transparent background. |
| `ground_slam.png` | An inventory icon of a faceted red ruby gem with a cracked ground shockwave glowing inside, centred, transparent background. |
| `iron_guard.png` | An inventory icon of a faceted red ruby gem with a shield glowing inside, centred, transparent background. |
| `war_cry.png` | An inventory icon of a faceted red ruby gem with a roaring mouth glowing inside, centred, transparent background. |
| `twin_strike.png` | An inventory icon of a faceted green emerald gem with two crossed blades glowing inside, centred, transparent background. |
| `poison_dart.png` | An inventory icon of a faceted green emerald gem with a green dart glowing inside, centred, transparent background. |
| `smoke_step.png` | An inventory icon of a faceted green emerald gem with a puff of smoke glowing inside, centred, transparent background. |
| `lacerate.png` | An inventory icon of a faceted green emerald gem with claw slashes glowing inside, centred, transparent background. |
| `spark.png` | An inventory icon of a faceted blue sapphire gem with a lightning spark glowing inside, centred, transparent background. |
| `fireball.png` | An inventory icon of a faceted blue sapphire gem with a fireball glowing inside, centred, transparent background. |
| `frost_ward.png` | An inventory icon of a faceted blue sapphire gem with a snowflake glowing inside, centred, transparent background. |
| `arcane_siphon.png` | An inventory icon of a faceted blue sapphire gem with a swirling vortex glowing inside, centred, transparent background. |
| `shattering_blow.png` | An inventory icon of a faceted small red ruby support gem, hexagonal cut, with a faint glowing rune for "Shattering Blow" inside, centred, transparent background. |
| `aftershock.png` | An inventory icon of a faceted small red ruby support gem, hexagonal cut, with a faint glowing rune for "Aftershock" inside, centred, transparent background. |
| `retaliation.png` | An inventory icon of a faceted small red ruby support gem, hexagonal cut, with a faint glowing rune for "Retaliation" inside, centred, transparent background. |
| `rallying_roar.png` | An inventory icon of a faceted small red ruby support gem, hexagonal cut, with a faint glowing rune for "Rallying Roar" inside, centred, transparent background. |
| `flurry.png` | An inventory icon of a faceted small green emerald support gem, hexagonal cut, with a faint glowing rune for "Flurry" inside, centred, transparent background. |
| `virulence.png` | An inventory icon of a faceted small green emerald support gem, hexagonal cut, with a faint glowing rune for "Virulence" inside, centred, transparent background. |
| `ambush.png` | An inventory icon of a faceted small green emerald support gem, hexagonal cut, with a faint glowing rune for "Ambush" inside, centred, transparent background. |
| `hemorrhage.png` | An inventory icon of a faceted small green emerald support gem, hexagonal cut, with a faint glowing rune for "Hemorrhage" inside, centred, transparent background. |
| `overload.png` | An inventory icon of a faceted small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Overload" inside, centred, transparent background. |
| `inferno.png` | An inventory icon of a faceted small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Inferno" inside, centred, transparent background. |
| `glacial_shell.png` | An inventory icon of a faceted small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Glacial Shell" inside, centred, transparent background. |
| `soul_tap.png` | An inventory icon of a faceted small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Soul Tap" inside, centred, transparent background. |
| `added_fire.png` | An inventory icon of a faceted small red ruby support gem, hexagonal cut, with a faint glowing rune for "Added Fire" inside, centred, transparent background. |
| `added_cold.png` | An inventory icon of a faceted small green emerald support gem, hexagonal cut, with a faint glowing rune for "Added Cold" inside, centred, transparent background. |
| `added_lightning.png` | An inventory icon of a faceted small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Added Lightning" inside, centred, transparent background. |
| `brutality.png` | An inventory icon of a faceted small red ruby support gem, hexagonal cut, with a faint glowing rune for "Brutality" inside, centred, transparent background. |
| `elemental_focus.png` | An inventory icon of a faceted small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Elemental Focus" inside, centred, transparent background. |
| `faster_attacks.png` | An inventory icon of a faceted small green emerald support gem, hexagonal cut, with a faint glowing rune for "Faster Attacks" inside, centred, transparent background. |
| `faster_casts.png` | An inventory icon of a faceted small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Faster Casts" inside, centred, transparent background. |
| `efficiency.png` | An inventory icon of a faceted small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Efficiency" inside, centred, transparent background. |
| `critical_strikes.png` | An inventory icon of a faceted small green emerald support gem, hexagonal cut, with a faint glowing rune for "Critical Strikes" inside, centred, transparent background. |
| `life_leech.png` | An inventory icon of a faceted small red ruby support gem, hexagonal cut, with a faint glowing rune for "Life Leech" inside, centred, transparent background. |
| `mana_leech.png` | An inventory icon of a faceted small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Mana Leech" inside, centred, transparent background. |
| `multistrike.png` | An inventory icon of a faceted small red ruby support gem, hexagonal cut, with a faint glowing rune for "Multistrike" inside, centred, transparent background. |
| `spell_echo.png` | An inventory icon of a faceted small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Spell Echo" inside, centred, transparent background. |
| `chain.png` | An inventory icon of a faceted small green emerald support gem, hexagonal cut, with a faint glowing rune for "Chain" inside, centred, transparent background. |
| `lingering.png` | An inventory icon of a faceted small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Lingering" inside, centred, transparent background. |

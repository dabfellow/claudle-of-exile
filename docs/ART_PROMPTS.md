# Art prompt pack (ChatGPT image generation)

> Generated from `src/data/artManifest.ts` by `npm run art -- --docs`. Edit prompts there, not here.
> 13/187 images in the game when this was generated. Sections marked ✅ are done.

## How to use

1. Each grey box is one complete prompt with the style built in. Copy the whole box, paste it into ChatGPT and send. One box = one image.
2. Save the image with the **file name in the heading** (e.g. `trader.png`) and drop it into `src/assets/art/` (any folder there works).
3. Small icons come as **sprite sheets**: one image holds 9 icons in a 3×3 grid. Save it as the sheet name (e.g. `currency_1.png`) and `npm run art` cuts it into 9 icons.
4. Run `npm run art`. It resizes everything to `.webp`, deletes the originals and tells you what is next.

Tips: generating several images in the same ChatGPT conversation keeps the style consistent. If a sheet comes back with icons touching or crossing the cells, ask *"same sheet, but with more space around each icon"*. If the background isn't transparent, ask *"make the background transparent"*. You can still make any icon on its own: name it after the item (e.g. `chaos.png`) and it imports like any other image. Check the current OpenAI terms on image usage before a commercial release.

---

## Priority 1 — Portraits — trader, guide, classes (5) ✅

### `trader.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024 square, chest-up portrait, dark vignette background.

Subject: A wandering merchant in his fifties, weathered face, sly half-smile, hooded travel cloak covered in pouches, a lantern hanging beside him, coins and trinkets on a crate in front of him, cave hideout in the background.
```

### `brannoc.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024 square, chest-up portrait, dark vignette background.

Subject: "Old Brannoc", a hunched elderly survivor with a scarred face and a grey braided beard, wrapped in a patched fur cloak, sitting by a small fire in a seaside cliff cave, kind but tired eyes.
```

### `class_warrior.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024 square, chest-up portrait, dark vignette background.

Subject: A battle-worn warrior in dented iron plate, rusted sword over the shoulder, red cloth tabard, determined stare, stormy shoreline behind.
```

### `class_ranger.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024 square, chest-up portrait, dark vignette background.

Subject: A lean ranger in dark leather armour and a green hood, twin daggers, alert and poised, misty marsh reeds behind.
```

### `class_mage.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024 square, chest-up portrait, dark vignette background.

Subject: A young mage in a worn blue robe holding a crooked driftwood wand crackling with blue lightning, intense eyes lit by the spark, ruined stone archway behind.
```

---

## Priority 1 — Scenes — title screen and hideout backdrop (2) ✅

### `title.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: Wide landscape 1792×1024, environment only, no characters, darker towards the bottom so text stays readable.

Subject: A grim storm-lashed coastline at night, a lone figure-sized gap of firelight in a cliff cave above the tide, shipwrecks in the surf, distant ruined towers, rain and embers in the air.
```

### `hideout.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: Wide landscape 1792×1024, environment only, no characters, darker towards the bottom so text stays readable.

Subject: Inside a large seaside cliff cave turned into a camp: rough stone walls, a central fire pit, hanging lanterns, crates and furs, a glimpse of the night sea through the cave mouth.
```

---

## Priority 2 — Hideout stations (6) ✅

### `map_device.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, single object on a dark cave-floor background, three-quarter view.

Subject: An ancient stone ring device with glowing purple runes and a swirling portal in its centre, set into a cave floor.
```

### `stash.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, single object on a dark cave-floor background, three-quarter view.

Subject: A heavy iron-banded wooden chest overflowing with gold coins, glowing orbs and gear, padlock hanging open.
```

### `forge.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, single object on a dark cave-floor background, three-quarter view.

Subject: A dwarven stone forge with glowing coals, an anvil, hammer and tongs, sparks flying.
```

### `alchemy_table.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, single object on a dark cave-floor background, three-quarter view.

Subject: A cluttered alchemy table with bubbling glass flasks in red, blue and purple, herbs drying overhead, a small brazier underneath.
```

### `bench.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, single object on a dark cave-floor background, three-quarter view.

Subject: A sturdy crafting workbench with clamps, a jeweller's loupe, scattered gemstones and a few glowing currency orbs.
```

### `vendor.png` ✅

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, single object on a dark cave-floor background, three-quarter view.

Subject: A small merchant stall made of crates and a patched canvas awning, lanterns, goods hanging from hooks.
```

---

## Priority 2 — Area banners (8)

### `mudflats.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: Wide landscape 1792×1024, environment only, no characters.

Subject: Grey tidal mud flats at dusk, broken shipwreck ribs, pools of dark water, drowned corpses half-buried, distant cliffs.
```

### `brinecaves.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: Wide landscape 1792×1024, environment only, no characters.

Subject: Dripping sea caves lit by pale green bioluminescence, tide pools, salt crusted rock, a wrecked rowing boat.
```

### `ashwood.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: Wide landscape 1792×1024, environment only, no characters.

Subject: A burned forest still smouldering, black trunks, glowing embers in the undergrowth, orange haze.
```

### `blackreed.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: Wide landscape 1792×1024, environment only, no characters.

Subject: A dark marsh of towering black reeds, still green water, fog, a crooked hut on stilts in the distance.
```

### `crypt.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: Wide landscape 1792×1024, environment only, no characters.

Subject: A flooded underground crypt, ankle-deep cold water, stone sarcophagi, pale blue light through cracks.
```

### `shipgrave.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: Wide landscape 1792×1024, environment only, no characters.

Subject: A grey bay choked with rotting shipwrecks piled on each other, broken masts, gulls, a stormy sky.
```

### `stormcliffs.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: Wide landscape 1792×1024, environment only, no characters.

Subject: Sheer black sea cliffs in a violent storm, lightning striking the rocks, crashing waves far below.
```

### `sanctum.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: Wide landscape 1792×1024, environment only, no characters.

Subject: A sunken cathedral underwater, broken stained glass, coral growing over pews, a throne of shells at the far end, shafts of blue light.
```

---

## Priority 3 — Monsters (40)

### `rat.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a drowned rat, bloated and dripping, glowing pale eyes
```

### `crab.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a large mud-caked crab with a cracked shell and one oversized claw
```

### `zombie.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a waterlogged corpse rising from the mud, seaweed in its hair
```

### `wisp.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a crackling yellow bog wisp, a ball of lightning with a faint face
```

### `gorger.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: BOSS — a huge bloated swamp creature with a gaping toothy maw and barnacled skin
```

### `crawler.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a pale eyeless cave crawler, a many-legged insect with slick wet plates
```

### `brinebat.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a salt-encrusted bat with torn wings and needle teeth
```

### `sailor.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a drowned sailor in a rotting striped shirt, rope still around his neck
```

### `siren.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a gaunt salt siren with grey scaled skin and frost on her lips, mouth open in a song
```

### `harrow.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: BOSS — "Captain Harrow", a drowned ship captain in a ragged tricorn and greatcoat, a lantern of green fire on his belt
```

### `cinderhound.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a skeletal hound wreathed in embers, smoke pouring from its jaws
```

### `treant.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a charred walking tree, cracks in its bark glowing orange
```

### `harpy.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a ragged harpy with ash-grey feathers and burning eyes
```

### `emberkin.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a small hunched fire shaman with a bone mask and a smoking staff
```

### `pyre.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: BOSS — "Pyre-Mother Ulva", a towering witch of living flame crowned with burning antlers
```

### `lurker.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a hulking bog lurker covered in moss and mud, only its yellow eyes and jaws visible
```

### `stalker.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a thin reed stalker, a lanky humanoid woven from black reeds with a bone spear
```

### `toad.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a huge sickly plague toad with frost-blue boils and a dripping tongue
```

### `fenwitch.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a fen witch with a crown of reeds and crackling lightning in her hands
```

### `sedge.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: BOSS — "Old Mother Sedge", an ancient hag grown into the marsh, roots for legs, lightning in her eyes
```

### `ghoul.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a gaunt crypt ghoul with long claws, pale wet skin
```

### `frostwraith.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a hooded frost wraith, icy mist trailing from its empty robes
```

### `skeleton.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a skeletal warden in rusted tomb armour holding a halberd
```

### `lich.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a drowned lich in waterlogged robes, a glowing blue phylactery at its chest
```

### `tidecaller.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: BOSS — "Tidecaller Morvane", a corrupted sea priestess with a coral crown, water swirling around her
```

### `brute.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a hulking barnacle-covered brute with an anchor for a weapon
```

### `gunner.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a drowned ship gunner holding a smoking hand cannon, burning fuse in his teeth
```

### `gulls.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a screaming swarm of scraggy black-eyed gulls
```

### `wreckshaman.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a wreck shaman wearing a ship figurehead as a mask, lightning arcing from a driftwood staff
```

### `vosk.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: BOSS — "Admiral Vosk", a bloated drowned admiral in a waterlogged naval coat covered in medals, flintlock and cutlass
```

### `ravager.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a cliff ravager, a lean grey beast with hooked claws for climbing rock
```

### `galeborn.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a galeborn spirit, a humanoid made of whirling wind and lightning
```

### `rockback.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a giant crab with a boulder grown into its shell
```

### `stormcaller.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a storm caller in a soaked hooded robe, holding a staff that crackles with lightning
```

### `skarra.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: BOSS — "Skarra, Queen of Gales", a huge harpy queen with storm-grey wings and a crown of lightning
```

### `zealot.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a tidebound zealot in a drowned monk habit, chains and frost around his fists
```

### `eel.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: an abyssal eel, long and black with glowing blue electric markings
```

### `coralgolem.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a coral golem, a lumbering figure of pink and white coral with a glowing core
```

### `priest.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: a sanctum priest with a cracked mitre and a frozen censer
```

### `ysolde.png`

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: 1024×1024, creature portrait, head and shoulders, dark background.

Subject: BOSS — "Ysolde, the Drowned Queen", a regal drowned queen with pale blue skin, a crown of shells and pearls, hair floating as if underwater, lightning in her hands
```

---

## Priority 3 — Currency orbs (13 icons on 2 sheets)

### `currency_1.png`

Contains: Orb of Transmutation, Orb of Augmentation, Orb of Alteration, Regal Orb, Orb of Alchemy, Orb of Scouring, Chaos Orb, Orb of Annulment, Exalted Orb

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single glowing currency orb.

Fill the cells left to right, top to bottom:
1. a small pale-blue glass orb with a swirling inner light
2. a deep blue orb with a silver plus-shaped rune
3. a light-blue orb wrapped in a thin bronze spiral
4. a gold orb with a tiny crown etched on it
5. a golden orb filled with bubbling liquid
6. a matte white-grey stone orb with a hole through the middle
7. a dark gold orb with a chaotic swirling sigil
8. a cracked pure-white orb leaking faint light
9. a radiant pale-gold orb with small wings
```

### `currency_2.png`

Contains: Divine Orb, Orb of Regret, Orb of Expansion, Instilling Orb

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single glowing currency orb.

Fill the cells left to right, top to bottom:
1. a cream-white orb glowing with holy light rays
2. a muted green orb with a faint backwards-spiral rune
3. a violet orb with three small sockets around its rim
4. a glowing orange orb with liquid fire swirling inside
Leave cells 5–9 completely empty.
```

---

## Priority 4 — Materials (13 icons on 2 sheets)

### `materials_1.png`

Contains: Gold, Copper Ore, Iron Ore, Mithril Ore, Rough Gem, Ash Log, Oak Log, Yew Log, Sunpetal

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single crafting material.

Fill the cells left to right, top to bottom:
1. a small stack of old gold coins
2. a chunk of raw copper ore
3. a chunk of dark grey iron ore
4. a chunk of pale cyan metallic mithril ore
5. an uncut magenta gemstone
6. a pale ash wood log
7. a sturdy brown oak log
8. a dark red-brown yew log
9. a bright yellow sunpetal flower
```

### `materials_2.png`

Contains: Frostleaf, Emberroot, Voidbloom, Arcane Dust

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single crafting material.

Fill the cells left to right, top to bottom:
1. an icy blue frosted leaf
2. a gnarled root glowing orange at the tips
3. a purple flower with a black void-like centre
4. a small pile of glittering lavender dust
Leave cells 5–9 completely empty.
```

---

## Priority 4 — Flasks (9 icons on 1 sheet)

### `flasks_1.png`

Contains: Small Life Flask, Medium Life Flask, Grand Life Flask, Small Mana Flask, Medium Mana Flask, Granite Flask, Quicksilver Flask, Diamond Flask, Ruby Flask

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single glass flask, standing upright.

Fill the cells left to right, top to bottom:
1. a small round flask of glowing red liquid
2. a larger round flask of glowing red liquid
3. a tall ornate flask of glowing red liquid with brass fittings
4. a small flask of glowing blue liquid
5. a larger flask of glowing blue liquid
6. a stone-grey flask with a rock texture
7. a flask of swirling liquid silver
8. a crystal-clear flask full of sparkles
9. a deep-red faceted gem-like flask
```

---

## Priority 5 — Item bases (44 icons on 5 sheets)

### `items_1.png`

Contains: Rusted Sword, Whittled Dagger, Driftwood Wand, Iron Blade, Glinting Dagger, Bearded War Axe, Steel Broadsword, Mithril Sabre, Splintered Shield

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, laid flat or upright like a Diablo inventory icon.

Fill the cells left to right, top to bottom:
1. a rusted, notched short sword
2. a crude whittled wooden-handled dagger
3. a crooked driftwood wand with a sparking tip
4. a plain iron longsword
5. a polished steel dagger that glints
6. a heavy bearded war axe
7. a broad steel sword with a leather grip
8. a curved pale-blue mithril sabre
9. a splintered wooden plank shield
```

### `items_2.png`

Contains: Goathide Buckler, Iron Kite Shield, Mithril Tower Shield, Iron Hat, Leather Cap, Soldier Helmet, Hunter Hood, Mithril Great Helm, Shadow Mask

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, laid flat or upright like a Diablo inventory icon.

Fill the cells left to right, top to bottom:
1. a small round goathide buckler
2. an iron kite shield
3. a tall pale-blue mithril tower shield
4. a simple dented iron cap
5. a worn leather cap
6. a steel soldier helmet with a nose guard
7. a dark green hunter hood
8. a heavy mithril great helm with a visor
9. a black cloth mask with silver trim
```

### `items_3.png`

Contains: Plate Vest, Shabby Jerkin, Chainmail Hauberk, Scale Leather, Mithril Plate, Assassin's Garb, Iron Gauntlets, Rawhide Gloves, Steel Gauntlets

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, laid flat or upright like a Diablo inventory icon.

Fill the cells left to right, top to bottom:
1. a battered iron plate vest
2. a shabby patched leather jerkin
3. a chainmail hauberk
4. scale-reinforced leather armour
5. a gleaming mithril breastplate
6. a sleek black assassin's coat
7. a pair of iron gauntlets
8. a pair of rawhide gloves
9. a pair of polished steel gauntlets
```

### `items_4.png`

Contains: Stealth Gloves, Iron Greaves, Leather Boots, Steel Greaves, Shagreen Boots, Chain Belt, Leather Belt, Heavy Belt, Coral Amulet

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, laid flat or upright like a Diablo inventory icon.

Fill the cells left to right, top to bottom:
1. a pair of thin black leather gloves
2. a pair of iron greaves
3. a pair of worn leather boots
4. a pair of steel greaves
5. a pair of supple grey shagreen boots
6. a belt made of iron chain links
7. a plain leather belt with a brass buckle
8. a thick heavy belt with iron studs
9. an amulet with a red coral pendant
```

### `items_5.png`

Contains: Amber Amulet, Jade Amulet, Onyx Amulet, Iron Ring, Ruby Ring, Sapphire Ring, Topaz Ring, Diamond Ring

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, laid flat or upright like a Diablo inventory icon.

Fill the cells left to right, top to bottom:
1. an amulet with an amber pendant
2. an amulet with a jade pendant
3. an amulet with a black onyx pendant
4. a plain iron ring
5. a gold ring set with a ruby
6. a silver ring set with a sapphire
7. a gold ring set with a yellow topaz
8. a platinum ring set with a diamond
Leave cell 9 completely empty.
```

---

## Priority 5 — Unique items (8 icons on 1 sheet)

### `uniques_1.png`

Contains: Miner's Lament, Bloodthirst, Emberheart, Windstep, Alchemist's Band, The Iron Bulwark, Starforged Edge, Titan's Girth

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is an ornate legendary version of the item with a faint orange magical glow.

Fill the cells left to right, top to bottom:
1. iron miner's helmet with a cracked lantern, called Miner's Lament
2. rusted sword dripping blood, called Bloodthirst
3. iron breastplate with a glowing ember set in the chest, called Emberheart
4. pair of leather boots with swirling wind around them, called Windstep
5. iron ring set with a tiny bubbling vial, called Alchemist's Band
6. massive riveted iron kite shield, called The Iron Bulwark
7. mithril sabre with stars glittering in the blade, called Starforged Edge
8. enormous studded belt with a giant's skull buckle, called Titan's Girth
Leave cell 9 completely empty.
```

---

## Priority 6 — Skill gems (39 icons on 5 sheets)

### `gems_1.png`

Contains: Heavy Strike, Ground Slam, Iron Guard, War Cry, Twin Strike, Poison Dart, Smoke Step, Lacerate, Spark

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a faceted cut gemstone with a glowing symbol inside it.

Fill the cells left to right, top to bottom:
1. red ruby gem with a hammer glowing inside
2. red ruby gem with a cracked ground shockwave glowing inside
3. red ruby gem with a shield glowing inside
4. red ruby gem with a roaring mouth glowing inside
5. green emerald gem with two crossed blades glowing inside
6. green emerald gem with a green dart glowing inside
7. green emerald gem with a puff of smoke glowing inside
8. green emerald gem with claw slashes glowing inside
9. blue sapphire gem with a lightning spark glowing inside
```

### `gems_2.png`

Contains: Fireball, Frost Ward, Arcane Siphon, Shattering Blow (support), Aftershock (support), Retaliation (support), Rallying Roar (support), Flurry (support), Virulence (support)

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a faceted cut gemstone with a glowing symbol inside it.

Fill the cells left to right, top to bottom:
1. blue sapphire gem with a fireball glowing inside
2. blue sapphire gem with a snowflake glowing inside
3. blue sapphire gem with a swirling vortex glowing inside
4. small red ruby support gem, hexagonal cut, with a faint glowing rune for "Shattering Blow" inside
5. small red ruby support gem, hexagonal cut, with a faint glowing rune for "Aftershock" inside
6. small red ruby support gem, hexagonal cut, with a faint glowing rune for "Retaliation" inside
7. small red ruby support gem, hexagonal cut, with a faint glowing rune for "Rallying Roar" inside
8. small green emerald support gem, hexagonal cut, with a faint glowing rune for "Flurry" inside
9. small green emerald support gem, hexagonal cut, with a faint glowing rune for "Virulence" inside
```

### `gems_3.png`

Contains: Ambush (support), Hemorrhage (support), Overload (support), Inferno (support), Glacial Shell (support), Soul Tap (support), Added Fire (support), Added Cold (support), Added Lightning (support)

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a faceted cut gemstone with a glowing symbol inside it.

Fill the cells left to right, top to bottom:
1. small green emerald support gem, hexagonal cut, with a faint glowing rune for "Ambush" inside
2. small green emerald support gem, hexagonal cut, with a faint glowing rune for "Hemorrhage" inside
3. small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Overload" inside
4. small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Inferno" inside
5. small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Glacial Shell" inside
6. small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Soul Tap" inside
7. small red ruby support gem, hexagonal cut, with a faint glowing rune for "Added Fire" inside
8. small green emerald support gem, hexagonal cut, with a faint glowing rune for "Added Cold" inside
9. small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Added Lightning" inside
```

### `gems_4.png`

Contains: Brutality (support), Elemental Focus (support), Faster Attacks (support), Faster Casts (support), Efficiency (support), Critical Strikes (support), Life Leech (support), Mana Leech (support), Multistrike (support)

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a faceted cut gemstone with a glowing symbol inside it.

Fill the cells left to right, top to bottom:
1. small red ruby support gem, hexagonal cut, with a faint glowing rune for "Brutality" inside
2. small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Elemental Focus" inside
3. small green emerald support gem, hexagonal cut, with a faint glowing rune for "Faster Attacks" inside
4. small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Faster Casts" inside
5. small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Efficiency" inside
6. small green emerald support gem, hexagonal cut, with a faint glowing rune for "Critical Strikes" inside
7. small red ruby support gem, hexagonal cut, with a faint glowing rune for "Life Leech" inside
8. small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Mana Leech" inside
9. small red ruby support gem, hexagonal cut, with a faint glowing rune for "Multistrike" inside
```

### `gems_5.png`

Contains: Spell Echo (support), Chain (support), Lingering (support)

```text
Dark-fantasy game art for a browser game called "Path of Idle" (inspired by Path of Exile and Diablo): painterly digital illustration, grim and moody, desaturated earthy palette with warm candle and ember highlights and gold #d2a659 accents, strong rim lighting, high detail but readable at small sizes. No text, no letters, no logos, no watermarks, no UI frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a faceted cut gemstone with a glowing symbol inside it.

Fill the cells left to right, top to bottom:
1. small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Spell Echo" inside
2. small green emerald support gem, hexagonal cut, with a faint glowing rune for "Chain" inside
3. small blue sapphire support gem, hexagonal cut, with a faint glowing rune for "Lingering" inside
Leave cells 4–9 completely empty.
```

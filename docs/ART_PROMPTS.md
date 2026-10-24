# Art prompt pack (ChatGPT image generation)

> Generated from `src/data/artManifest.ts` by `npm run art -- --docs`. Edit prompts there, not here.
> 0/187 images in the game when this was generated. Sections marked ✅ are done.

## How to use

1. Each grey box is one complete prompt with the style built in. Copy the whole box, paste it into ChatGPT and send. One box = one image.
2. Save the image with the **file name in the heading** (e.g. `trader.png`) and drop it into `src/assets/art/` (any folder there works).
3. Small icons come as **sprite sheets**: one image holds 9 icons in a 3×3 grid. Save it as the sheet name (e.g. `currency_1.png`) and `npm run art` cuts it into 9 icons.
4. Run `npm run art`. It resizes everything to `.webp`, deletes the originals and tells you what is next.

Tips: generating several images in the same ChatGPT conversation keeps the style consistent. If a sheet comes back with icons touching or crossing the cells, ask *"same sheet, but with more space around each icon"*. If the background isn't transparent, ask *"make the background transparent"*. If it comes back busy, shiny or glowing, reply *"simpler: same subject, remove the extra objects, glow and effects, softer lighting"*. You can still make any icon on its own: name it after the item (e.g. `chaos.png`) and it imports like any other image. Check the current OpenAI terms on image usage before a commercial release.

---

## Priority 1 — Portraits — trader, guide, classes (5)

### `trader.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One person, chest-up, facing slightly to the side, centred. Plain dark grey-brown background with no objects or scenery.

Subject: A merchant in his fifties with a short grey beard, a lined, tanned face and a small knowing smile. He wears a hooded brown wool travel cloak, hood down, with two leather pouches on a strap across his chest. One hand holds up a single gold coin.
```

### `brannoc.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One person, chest-up, facing slightly to the side, centred. Plain dark grey-brown background with no objects or scenery.

Subject: An old man in his seventies with a long grey beard in one braid, a pale scar across his left cheek and tired, kind eyes. He wears a patched grey fur cloak over a plain brown tunic. His shoulders are hunched.
```

### `class_warrior.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One person, chest-up, facing slightly to the side, centred. Plain dark grey-brown background with no objects or scenery.

Subject: A broad-shouldered warrior in his thirties with short dark hair and a stubbled jaw. He wears dented grey iron plate armour over a faded red cloth tabard. A plain rusted sword rests on his right shoulder. Serious, steady expression.
```

### `class_ranger.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One person, chest-up, facing slightly to the side, centred. Plain dark grey-brown background with no objects or scenery.

Subject: A lean ranger in her twenties with a narrow face and sharp eyes, a dark green cloth hood up over her hair. She wears close-fitting dark brown leather armour. One short dagger is held low in her right hand.
```

### `class_mage.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One person, chest-up, facing slightly to the side, centred. Plain dark grey-brown background with no objects or scenery.

Subject: A young mage in his early twenties with messy black hair and a thin face. He wears a worn, faded blue wool robe with a rope belt. In his right hand he holds a short crooked wand of pale driftwood, with a single small blue spark at its tip.
```

---

## Priority 1 — Scenes — title screen and hideout backdrop (2)

### `title.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: Wide landscape 1792×1024. Environment only, no people. A few large, simple shapes with plenty of empty space. The bottom third is dark and plain so text can sit on it.

Subject: A rocky coastline at night under heavy dark clouds. Tall black cliffs on the right; one small cave opening in the cliff face shows warm orange firelight. Two broken shipwrecks lie in grey surf in the middle distance. Cold blue moonlight on the water. Light rain.
```

### `hideout.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: Wide landscape 1792×1024. Environment only, no people. A few large, simple shapes with plenty of empty space. The bottom third is dark and plain so text can sit on it.

Subject: Inside a large sea cave used as a camp. Rough grey stone walls and a sandy floor. One stone-ringed fire pit in the centre gives warm light. A few wooden crates and rolled furs against the left wall. The cave mouth on the right opens onto a dark night sea.
```

---

## Priority 2 — Hideout stations (6)

### `map_device.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One object, three-quarter view from slightly above, centred, filling about two thirds of the frame. Plain dark stone floor and a plain dark background. No other furniture or props.

Subject: A waist-high ring of rough grey standing stones, about three metres across, set in a circle. Simple carved lines on the stones. In the middle, a flat stone disc with a faint purple light rising from it.
```

### `stash.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One object, three-quarter view from slightly above, centred, filling about two thirds of the frame. Plain dark stone floor and a plain dark background. No other furniture or props.

Subject: A large wooden chest with dark iron bands and corner plates. The lid is open, showing a heap of gold coins inside. An open iron padlock hangs from the latch.
```

### `forge.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One object, three-quarter view from slightly above, centred, filling about two thirds of the frame. Plain dark stone floor and a plain dark background. No other furniture or props.

Subject: A blacksmith forge of rough grey stone bricks with a chimney hood above. Orange coals in the hearth. An iron anvil on a tree-stump block stands in front, with a hammer resting on it.
```

### `alchemy_table.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One object, three-quarter view from slightly above, centred, filling about two thirds of the frame. Plain dark stone floor and a plain dark background. No other furniture or props.

Subject: A heavy wooden table with three glass flasks on it: one red, one blue, one green, each half full. A brass mortar and pestle and a small stack of old books sit beside them.
```

### `bench.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One object, three-quarter view from slightly above, centred, filling about two thirds of the frame. Plain dark stone floor and a plain dark background. No other furniture or props.

Subject: A sturdy wooden workbench with an iron vice bolted to one end. On top: a few hand tools, a small brass magnifying loupe, and three uncut gemstones.
```

### `vendor.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One object, three-quarter view from slightly above, centred, filling about two thirds of the frame. Plain dark stone floor and a plain dark background. No other furniture or props.

Subject: A small market stall built from wooden crates, with a patched tan canvas awning on two poles. One lantern hangs from the front pole. A few cloth bags and a coiled rope sit on the counter.
```

---

## Priority 2 — Area banners (8)

### `mudflats.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: Wide landscape 1792×1024. Environment only, no people or creatures. A clear foreground, middle ground and background, with a few large simple shapes.

Subject: Flat grey tidal mud at dusk stretching to the horizon. The curved black wooden ribs of one old shipwreck stick up from the mud in the foreground. Shallow pools reflect a dull orange sky. Dark cliffs far away on the left.
```

### `brinecaves.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: Wide landscape 1792×1024. Environment only, no people or creatures. A clear foreground, middle ground and background, with a few large simple shapes.

Subject: A wide sea cave with wet dark rock walls. Shallow tide pools on the floor with a soft green light coming from algae in the water. One broken wooden rowing boat lies on its side near the front.
```

### `ashwood.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: Wide landscape 1792×1024. Environment only, no people or creatures. A clear foreground, middle ground and background, with a few large simple shapes.

Subject: A burned forest. Straight black tree trunks with no leaves stand in grey ash. A few patches of orange embers glow on the ground. Hazy brown-orange sky behind.
```

### `blackreed.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: Wide landscape 1792×1024. Environment only, no people or creatures. A clear foreground, middle ground and background, with a few large simple shapes.

Subject: A marsh of tall dark reeds, taller than a person, around still green water. Low mist over the water. One small wooden hut on stilts stands in the distance.
```

### `crypt.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: Wide landscape 1792×1024. Environment only, no people or creatures. A clear foreground, middle ground and background, with a few large simple shapes.

Subject: An underground stone crypt with a low arched ceiling. Shallow still water covers the floor. Two rows of plain stone coffins line the walls. Pale blue light comes through a crack in the ceiling at the far end.
```

### `shipgrave.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: Wide landscape 1792×1024. Environment only, no people or creatures. A clear foreground, middle ground and background, with a few large simple shapes.

Subject: A grey bay full of old wrecked wooden ships lying on their sides, broken masts leaning at angles. Low grey storm clouds. Calm grey water.
```

### `stormcliffs.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: Wide landscape 1792×1024. Environment only, no people or creatures. A clear foreground, middle ground and background, with a few large simple shapes.

Subject: Tall black sea cliffs seen from the side, with white waves breaking at their base far below. Dark storm clouds; one thin bolt of lightning in the distance.
```

### `sanctum.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: Wide landscape 1792×1024. Environment only, no people or creatures. A clear foreground, middle ground and background, with a few large simple shapes.

Subject: The inside of a sunken stone cathedral underwater. Tall pillars, rows of broken wooden pews with pink coral growing on them. A plain stone throne at the far end. Rays of blue light come down from above.
```

---

## Priority 3 — Monsters (40)

### `rat.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a large wet grey rat with matted fur, bare pink tail, small pale milky eyes
```

### `crab.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a big brown crab covered in dried grey mud, a crack across its shell, one claw much bigger than the other
```

### `zombie.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a drowned man with grey-green swollen skin, wet tangled hair with strands of seaweed, torn grey shirt, blank white eyes
```

### `wisp.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a floating ball of pale yellow light the size of a head, with two dark hollow eyes and a small open mouth
```

### `gorger.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a boss: a huge fat swamp creature like a giant toad, grey-green skin with patches of barnacles, a very wide mouth full of uneven teeth
```

### `crawler.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a pale white cave insect the size of a dog, no eyes, a long body made of shiny wet plates, many thin legs
```

### `brinebat.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a large grey bat with white salt crust on its fur, ragged holes in its wings, small sharp teeth
```

### `sailor.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a drowned sailor with grey skin, a faded red-and-white striped shirt, a frayed rope tied around his neck
```

### `siren.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a thin woman with grey scaly skin on her cheeks and neck, long wet dark hair, white frost on her lips, mouth open as if singing
```

### `harrow.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a boss: "Captain Harrow", a drowned ship captain with grey skin, a torn black tricorn hat, a long tattered navy greatcoat, and a small lantern of green flame hanging from his belt
```

### `cinderhound.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a skeletal dog with black scorched bones, small orange embers in its eye sockets, grey smoke rising from its jaws
```

### `treant.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a walking burned tree with a rough face in its trunk, black bark with orange-lit cracks
```

### `harpy.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a thin woman-bird creature with ash-grey feathers, bare grey arms ending in claws, bright orange eyes
```

### `emberkin.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a small hunched goblin-like figure in a white animal-skull mask, holding a wooden staff with smoke drifting from its tip
```

### `pyre.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a boss: "Pyre-Mother Ulva", a tall gaunt witch with ash-grey skin and long black hair, wearing burnt deer antlers on her head with small flames at their tips
```

### `lurker.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a huge hunched beast covered in thick green moss and dripping mud, only its yellow eyes and big jaw showing clearly
```

### `stalker.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a tall thin humanoid made of bundled black reeds, a long face with no features except two pale eye-holes
```

### `toad.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a huge fat toad with sickly yellow-green skin, pale blue lumps on its back, a long tongue hanging out
```

### `fenwitch.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: an old woman with a crown of dry reeds and a muddy green shawl, a small blue spark between her raised fingers
```

### `sedge.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a boss: "Old Mother Sedge", a very old wrinkled woman whose lower body is a mass of tree roots, long grey hair, eyes glowing pale blue
```

### `ghoul.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a hairless grey humanoid with pale wet skin, sunken black eyes, long thin fingers with dark claws
```

### `frostwraith.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: an empty hooded grey robe floating in the air, with white frost on the cloth and only darkness inside the hood
```

### `skeleton.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a skeleton in rusted iron armour and a dented helmet, holding a long halberd upright
```

### `lich.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a skeletal figure in soaked dark robes, with a small glowing blue crystal hanging on a chain at its chest
```

### `tidecaller.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a boss: "Tidecaller Morvane", a pale woman in sea-green robes with a crown of white and red coral, a ring of water circling around her
```

### `brute.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a huge muscular man with grey skin covered in barnacles, carrying a rusty ship anchor over one shoulder
```

### `gunner.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a drowned sailor with grey skin and a wet bandana, holding a short black hand cannon, a lit fuse between his teeth
```

### `gulls.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a tight group of five scruffy grey-and-black seagulls, beaks open, screaming
```

### `wreckshaman.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a figure wearing a carved wooden ship figurehead as a mask, holding a crooked driftwood staff with a small blue spark at the top
```

### `vosk.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a boss: "Admiral Vosk", a fat drowned admiral with grey skin, a wet dark blue naval coat with tarnished gold buttons and medals, holding a cutlass
```

### `ravager.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a lean grey wolf-like beast with long hooked front claws and a flat head, built for climbing rock
```

### `galeborn.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a humanoid figure made of pale grey swirling wind, with two small bright blue eyes
```

### `rockback.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a giant crab with a large grey boulder growing out of its shell
```

### `stormcaller.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a man in a soaked dark grey hooded robe holding a tall wooden staff, a small blue spark at its tip
```

### `skarra.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a boss: "Skarra, Queen of Gales", a large harpy queen with storm-grey wings, a fierce face, and a simple crown of jagged iron
```

### `zealot.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a bald monk in a wet brown robe, iron chains wrapped around his fists, white frost on the chains
```

### `eel.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a long black eel with a wide mouth of small teeth and thin bright blue stripes along its body
```

### `coralgolem.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a big slow giant built of pink and white coral, a round glowing pale blue stone in the middle of its chest
```

### `priest.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a pale old priest in faded white robes, a cracked tall mitre hat, holding a metal censer covered in frost
```

### `ysolde.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One creature, head and shoulders, facing the viewer, centred. Plain dark background with no scenery.

Subject: a boss: "Ysolde, the Drowned Queen", a tall regal woman with pale blue skin, long dark hair floating as if underwater, a crown of white shells and pearls, a calm cold expression
```

---

## Priority 3 — Currency orbs (13 icons on 2 sheets)

### `currency_1.png`

Contains: Orb of Transmutation, Orb of Augmentation, Orb of Alteration, Regal Orb, Orb of Alchemy, Orb of Scouring, Chaos Orb, Orb of Annulment, Exalted Orb

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single small orb, about the size of a plum.

Fill the cells left to right, top to bottom:
1. a small smooth pale-blue glass marble with a lighter blue centre
2. a smooth deep-blue glass orb with a small silver cross shape set into its front
3. a light-blue glass orb with a thin copper wire wrapped around it in a spiral
4. a polished gold metal orb with a small crown engraved on its front
5. a clear glass orb half filled with golden liquid
6. a rough matte grey stone ball with a round hole straight through the middle
7. a dark gold metal orb with a jagged, irregular pattern engraved over its surface
8. a smooth white porcelain orb with a single thin crack across it
9. a pale gold metal orb with two small metal wings on its sides
```

### `currency_2.png`

Contains: Divine Orb, Orb of Regret, Orb of Expansion, Instilling Orb

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single small orb, about the size of a plum.

Fill the cells left to right, top to bottom:
1. a cream-white stone orb with a simple four-pointed star engraved on its front
2. a dull green glass orb with a dark green spiral line on its surface
3. a violet glass orb with three small round empty metal sockets set around its middle
4. a clear glass orb filled with swirling orange liquid
Leave cells 5–9 completely empty.
```

---

## Priority 4 — Materials (13 icons on 2 sheets)

### `materials_1.png`

Contains: Gold, Copper Ore, Iron Ore, Mithril Ore, Rough Gem, Ash Log, Oak Log, Yew Log, Sunpetal

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single crafting material.

Fill the cells left to right, top to bottom:
1. a small stack of five worn gold coins
2. a fist-sized lump of grey rock with bright orange-copper streaks
3. a fist-sized lump of dark grey rock with rusty red-brown streaks
4. a fist-sized lump of grey rock with pale silver-blue metallic streaks
5. a rough, uncut pink-purple crystal, cloudy and uneven
6. a short cut log with pale grey bark and a light cream cut end showing tree rings
7. a short cut log with rough dark brown bark and a tan cut end showing tree rings
8. a short cut log with thin reddish bark and a deep red-orange cut end showing tree rings
9. a single yellow flower with five wide petals and a short green stem
```

### `materials_2.png`

Contains: Frostleaf, Emberroot, Voidbloom, Arcane Dust

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single crafting material.

Fill the cells left to right, top to bottom:
1. a single pale blue leaf with white frost along its edges
2. a short twisted brown root, its broken ends glowing orange like coals
3. a single dark purple flower with a black centre and a short dark stem
4. a small heap of fine lavender-coloured powder
Leave cells 5–9 completely empty.
```

---

## Priority 4 — Flasks (9 icons on 1 sheet)

### `flasks_1.png`

Contains: Small Life Flask, Medium Life Flask, Grand Life Flask, Small Mana Flask, Medium Mana Flask, Granite Flask, Quicksilver Flask, Diamond Flask, Ruby Flask

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single bottle, standing upright, seen from the front.

Fill the cells left to right, top to bottom:
1. a small round glass bottle with a cork, full of red liquid
2. a medium round glass bottle with a cork, full of red liquid
3. a tall glass bottle with a brass neck and cork, full of red liquid
4. a small round glass bottle with a cork, full of blue liquid
5. a medium round glass bottle with a cork, full of blue liquid
6. a squat bottle carved from grey stone, with a stone stopper
7. a slim glass bottle with a cork, full of shiny liquid silver
8. a clear cut-glass bottle with flat faces like a gem, with a glass stopper
9. a bottle of dark red cut glass with flat faces like a gem, with a gold stopper
```

---

## Priority 5 — Item bases (44 icons on 5 sheets)

### `items_1.png`

Contains: Rusted Sword, Whittled Dagger, Driftwood Wand, Iron Blade, Glinting Dagger, Bearded War Axe, Steel Broadsword, Mithril Sabre, Splintered Shield

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a short sword with a rusty brown blade, small nicks along the edge, and a plain leather-wrapped grip
2. a short iron dagger with a rough hand-carved wooden handle
3. a short crooked wand of pale grey driftwood, with a small blue spark at its tip
4. a plain straight iron longsword with a simple cross guard and a leather grip
5. a polished steel dagger with a bright blade and a black leather grip
6. a one-handed war axe with a dark iron head shaped like a beard and a wooden handle
7. a wide straight steel sword with a brass cross guard and a brown leather grip
8. a curved sabre with a pale silver-blue blade and a simple silver hand guard
9. a square shield made of four rough wooden planks held together with iron nails, one corner split
```

### `items_2.png`

Contains: Goathide Buckler, Iron Kite Shield, Mithril Tower Shield, Iron Hat, Leather Cap, Soldier Helmet, Hunter Hood, Mithril Great Helm, Shadow Mask

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a small round wooden shield covered in tan hide, with an iron rim
2. a tall grey iron shield, rounded at the top and pointed at the bottom, plain with no emblem
3. a tall rectangular shield of pale silver-blue metal with a raised rim
4. a simple round iron cap with a few dents
5. a worn brown leather cap with stitched seams
6. a steel helmet with a straight nose guard
7. a dark green cloth hood with a short cape
8. a full closed helmet of pale silver-blue metal with a narrow eye slit
9. a black cloth face mask covering the lower face, with a thin silver edge
```

### `items_3.png`

Contains: Plate Vest, Shabby Jerkin, Chainmail Hauberk, Scale Leather, Mithril Plate, Assassin's Garb, Iron Gauntlets, Rawhide Gloves, Steel Gauntlets

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a dented grey iron breastplate with leather straps
2. a sleeveless brown leather vest with patches and uneven stitching
3. a long-sleeved shirt of grey iron chain links
4. a brown leather vest covered in small overlapping iron scales
5. a clean breastplate of pale silver-blue metal
6. a fitted black leather coat with a high collar and plain silver buckles
7. a pair of grey iron gauntlets with jointed fingers
8. a pair of rough tan rawhide gloves
9. a pair of polished steel gauntlets with jointed fingers
```

### `items_4.png`

Contains: Stealth Gloves, Iron Greaves, Leather Boots, Steel Greaves, Shagreen Boots, Chain Belt, Leather Belt, Heavy Belt, Coral Amulet

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a pair of thin, close-fitting black leather gloves
2. a pair of grey iron armoured boots
3. a pair of worn brown leather boots
4. a pair of polished steel armoured boots
5. a pair of soft grey leather boots with a fine pebbled texture
6. a belt made of grey iron chain links with a simple hook clasp
7. a plain brown leather belt with a brass buckle
8. a thick dark leather belt with rows of iron studs and an iron buckle
9. a necklace on a thin cord with a small polished red coral pendant
```

### `items_5.png`

Contains: Amber Amulet, Jade Amulet, Onyx Amulet, Iron Ring, Ruby Ring, Sapphire Ring, Topaz Ring, Diamond Ring

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a necklace on a thin gold chain with a small oval amber pendant
2. a necklace on a thin cord with a small carved green jade pendant
3. a necklace on a thin silver chain with a small black onyx pendant
4. a plain dark iron ring
5. a gold ring with one small red ruby
6. a silver ring with one small blue sapphire
7. a gold ring with one small yellow topaz
8. a white-gold ring with one small clear diamond
Leave cell 9 completely empty.
```

---

## Priority 5 — Unique items (8 icons on 1 sheet)

### `uniques_1.png`

Contains: Miner's Lament, Bloodthirst, Emberheart, Windstep, Alchemist's Band, The Iron Bulwark, Starforged Edge, Titan's Girth

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single rare item: well made and distinctive, but not overdecorated.

Fill the cells left to right, top to bottom:
1. an old iron miner's helmet with a small brass lantern on the front, its glass cracked
2. a rusty short sword with dark red blood running down the blade, a red cloth wrapped around the grip
3. a grey iron breastplate with one round orange glowing coal set in the centre of the chest
4. a pair of light brown leather boots with small white feathers tied at the ankles
5. a thick iron ring with a tiny glass vial of green liquid set into it in place of a stone
6. a very large, thick iron kite shield covered in rows of big rivets, scratched and dented from use
7. a curved sabre with a dark blue-black blade speckled with tiny white dots like stars, and a silver guard
8. a huge thick leather belt with iron studs and a buckle made from a small horned skull
Leave cell 9 completely empty.
```

---

## Priority 6 — Skill gems (39 icons on 5 sheets)

### `gems_1.png`

Contains: Heavy Strike, Ground Slam, Iron Guard, War Cry, Twin Strike, Poison Dart, Smoke Step, Lacerate, Spark

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a rounded red gemstone with a simple pale symbol of a hammer inside
2. a rounded red gemstone with a simple pale symbol of a cracked line inside
3. a rounded red gemstone with a simple pale symbol of a shield inside
4. a rounded red gemstone with a simple pale symbol of an open mouth inside
5. a rounded green gemstone with a simple pale symbol of two crossed blades inside
6. a rounded green gemstone with a simple pale symbol of a dart inside
7. a rounded green gemstone with a simple pale symbol of a puff cloud inside
8. a rounded green gemstone with a simple pale symbol of three claw marks inside
9. a rounded blue gemstone with a simple pale symbol of a zigzag lightning bolt inside
```

### `gems_2.png`

Contains: Fireball, Frost Ward, Arcane Siphon, Shattering Blow (support), Aftershock (support), Retaliation (support), Rallying Roar (support), Flurry (support), Virulence (support)

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a rounded blue gemstone with a simple pale symbol of a flame inside
2. a rounded blue gemstone with a simple pale symbol of a snowflake inside
3. a rounded blue gemstone with a simple pale symbol of a spiral inside
4. a small flat hexagonal red gemstone with a plain pale dot in the centre
5. a small flat hexagonal red gemstone with a plain pale dot in the centre
6. a small flat hexagonal red gemstone with a plain pale dot in the centre
7. a small flat hexagonal red gemstone with a plain pale dot in the centre
8. a small flat hexagonal green gemstone with a plain pale dot in the centre
9. a small flat hexagonal green gemstone with a plain pale dot in the centre
```

### `gems_3.png`

Contains: Ambush (support), Hemorrhage (support), Overload (support), Inferno (support), Glacial Shell (support), Soul Tap (support), Added Fire (support), Added Cold (support), Added Lightning (support)

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a small flat hexagonal green gemstone with a plain pale dot in the centre
2. a small flat hexagonal green gemstone with a plain pale dot in the centre
3. a small flat hexagonal blue gemstone with a plain pale dot in the centre
4. a small flat hexagonal blue gemstone with a plain pale dot in the centre
5. a small flat hexagonal blue gemstone with a plain pale dot in the centre
6. a small flat hexagonal blue gemstone with a plain pale dot in the centre
7. a small flat hexagonal red gemstone with a plain pale dot in the centre
8. a small flat hexagonal green gemstone with a plain pale dot in the centre
9. a small flat hexagonal blue gemstone with a plain pale dot in the centre
```

### `gems_4.png`

Contains: Brutality (support), Elemental Focus (support), Faster Attacks (support), Faster Casts (support), Efficiency (support), Critical Strikes (support), Life Leech (support), Mana Leech (support), Multistrike (support)

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a small flat hexagonal red gemstone with a plain pale dot in the centre
2. a small flat hexagonal blue gemstone with a plain pale dot in the centre
3. a small flat hexagonal green gemstone with a plain pale dot in the centre
4. a small flat hexagonal blue gemstone with a plain pale dot in the centre
5. a small flat hexagonal blue gemstone with a plain pale dot in the centre
6. a small flat hexagonal green gemstone with a plain pale dot in the centre
7. a small flat hexagonal red gemstone with a plain pale dot in the centre
8. a small flat hexagonal blue gemstone with a plain pale dot in the centre
9. a small flat hexagonal red gemstone with a plain pale dot in the centre
```

### `gems_5.png`

Contains: Spell Echo (support), Chain (support), Lingering (support)

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a small flat hexagonal blue gemstone with a plain pale dot in the centre
2. a small flat hexagonal green gemstone with a plain pale dot in the centre
3. a small flat hexagonal blue gemstone with a plain pale dot in the centre
Leave cells 4–9 completely empty.
```

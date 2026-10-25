# Art prompt pack (ChatGPT image generation)

> Generated from `src/data/artManifest.ts` by `npm run art -- --docs`. Edit prompts there, not here.
> 0/322 images in the game when this was generated. Sections marked ✅ are done.

## How to use

1. Each grey box is one complete prompt with the style built in. Copy the whole box, paste it into ChatGPT and send. One box = one image.
2. Save the image with the **file name in the heading** (e.g. `trader.png`) and drop it into `src/assets/art/` (any folder there works).
3. Small icons come as **sprite sheets**: one image holds 9 icons in a 3×3 grid. Save it as the sheet name (e.g. `currency_1.png`) and `npm run art` cuts it into 9 icons.
4. Run `npm run art`. It resizes everything to `.webp`, deletes the originals and tells you what is next.

Tips: generating several images in the same ChatGPT conversation keeps the style consistent. If a sheet comes back with icons touching or crossing the cells, ask *"same sheet, but with more space around each icon"*. If the background isn't transparent, ask *"make the background transparent"*. If it comes back busy, shiny or glowing, reply *"simpler: same subject, remove the extra objects, glow and effects, softer lighting"*. You can still make any icon on its own: name it after the item (e.g. `chaos.png`) and it imports like any other image. Check the current OpenAI terms on image usage before a commercial release.

---

## Priority 1 — Portraits — trader, guide, classes (9)

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

### `class_duelist.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One person, chest-up, facing slightly to the side, centred. Plain dark grey-brown background with no objects or scenery.

Subject: A confident duelist in his late twenties with short brown hair tied back and a thin moustache. He wears a brown leather jerkin with a single dented iron pauldron on his left shoulder. A plain straight sword is held point-down in front of him, both hands on the hilt. A slight, challenging smile.
```

### `class_templar.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One person, chest-up, facing slightly to the side, centred. Plain dark grey-brown background with no objects or scenery.

Subject: A stern templar in her forties with close-cropped grey hair and a strong jaw. She wears grey iron plate armour under a cream linen surcoat with a plain dark red stripe down the middle. A heavy wooden club with an iron-banded head rests against her shoulder. Calm, unflinching expression.
```

### `class_shadow.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One person, chest-up, facing slightly to the side, centred. Plain dark grey-brown background with no objects or scenery.

Subject: A quiet shadow in his twenties with a pale, narrow face and dark hair half-hidden under a black cloth hood. A dark grey scarf covers his mouth and nose; only his watchful eyes show. He wears close-fitting dark leather. A slim curved dagger is held low in his left hand.
```

### `class_exile.png`

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: 1024×1024 square. One person, chest-up, facing slightly to the side, centred. Plain dark grey-brown background with no objects or scenery.

Subject: A castaway of unclear age, soaked and sunburnt, with tangled salt-crusted hair and a short rough beard. Torn, faded grey linen shirt, bare forearms, a length of frayed rope tied around the waist as a belt. He grips a short rusted sword. Tired but determined eyes.
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

## Priority 4 — Materials (32 icons on 4 sheets)

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

Contains: Frostleaf, Emberroot, Voidbloom, Arcane Dust, Scorched Fossil, Frigid Fossil, Metallic Fossil, Dense Fossil, Serrated Fossil

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single crafting material.

Fill the cells left to right, top to bottom:
1. a single pale blue leaf with white frost along its edges
2. a short twisted brown root, its broken ends glowing orange like coals
3. a single dark purple flower with a black centre and a short dark stem
4. a small heap of fine lavender-coloured powder
5. Scorched Fossil
6. Frigid Fossil
7. Metallic Fossil
8. Dense Fossil
9. Serrated Fossil
```

### `materials_3.png`

Contains: Lesser Essence of Vitality, Lesser Essence of Embers, Lesser Essence of Frost, Lesser Essence of Storm, Greater Essence of Vitality, Greater Essence of Embers, Greater Essence of Frost, Greater Essence of Storm, Greater Essence of Haste

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single crafting material.

Fill the cells left to right, top to bottom:
1. Lesser Essence of Vitality
2. Lesser Essence of Embers
3. Lesser Essence of Frost
4. Lesser Essence of Storm
5. Greater Essence of Vitality
6. Greater Essence of Embers
7. Greater Essence of Frost
8. Greater Essence of Storm
9. Greater Essence of Haste
```

### `materials_4.png`

Contains: Ash Resin, Oak Resin, Augmentation Shard, Transmutation Shard, Alteration Shard

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single crafting material.

Fill the cells left to right, top to bottom:
1. Ash Resin
2. Oak Resin
3. Augmentation Shard
4. Transmutation Shard
5. Alteration Shard
Leave cells 6–9 completely empty.
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

## Priority 5 — Item bases (95 icons on 11 sheets)

### `items_1.png`

Contains: Rusted Sword, Iron Blade, Steel Broadsword, Mithril Sabre, Whittled Dagger, Glinting Dagger, Shadow Kris, Rusty Hatchet, Bearded War Axe

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a short sword with a rusty brown blade, small nicks along the edge, and a plain leather-wrapped grip
2. a plain straight iron longsword with a simple cross guard and a leather grip
3. a wide straight steel sword with a brass cross guard and a brown leather grip
4. a curved sabre with a pale silver-blue blade and a simple silver hand guard
5. a short iron dagger with a rough hand-carved wooden handle
6. a polished steel dagger with a bright blade and a black leather grip
7. a dagger with a wavy black steel blade and a purple-wrapped grip
8. a small one-handed hatchet with a rusty iron head and a short wooden handle
9. a one-handed war axe with a dark iron head shaped like a beard and a wooden handle
```

### `items_2.png`

Contains: Reaver Axe, Oak Club, Spiked Mace, Iron War Hammer, Short Bow, Ash Longbow, Yew Recurve, Bone Sceptre, Crystal Sceptre

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a large one-handed axe with a crescent dark steel blade and a red-wrapped handle
2. a thick knobbly oak club, wider at the striking end, with a leather thong at the grip
3. an iron mace with a round flanged head studded with short spikes
4. a heavy iron war hammer with a square head and a long iron-banded handle
5. a small curved wooden bow with a plain string and a leather grip
6. a tall pale ash longbow with a cloth-wrapped grip
7. a dark yew recurve bow with curled tips and a brass-capped grip
8. a short sceptre carved from pale bone, topped with a small skull
9. a silver sceptre topped with a glowing pale blue crystal
```

### `items_3.png`

Contains: Driftwood Wand, Coral Wand, Void Wand, Gnarled Staff, Storm Staff, Splintered Shield, Goathide Buckler, Iron Kite Shield, Mithril Tower Shield

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a short crooked wand of pale grey driftwood, with a small blue spark at its tip
2. a short wand of branching pink coral with a pearl at its tip
3. a black wand of twisted metal with a swirling purple light at its tip
4. a tall gnarled wooden staff with a knot of roots at the top
5. a tall dark iron staff topped with a cage holding a crackling blue spark
6. a square shield made of four rough wooden planks held together with iron nails, one corner split
7. a small round wooden shield covered in tan hide, with an iron rim
8. a tall grey iron shield, rounded at the top and pointed at the bottom, plain with no emblem
9. a tall rectangular shield of pale silver-blue metal with a raised rim
```

### `items_4.png`

Contains: Driftwood Spirit Shield, Runic Ward, Iron Hat, Leather Cap, Soldier Helmet, Hunter Hood, Mithril Great Helm, Shadow Mask, Riveted Coif

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a small round shield of grey bleached driftwood with a pale blue spiral painted on its face
2. a narrow kite shield of dark blue-black wood inlaid with thin glowing blue runes along the rim
3. a simple round iron cap with a few dents
4. a worn brown leather cap with stitched seams
5. a steel helmet with a straight nose guard
6. a dark green cloth hood with a short cape
7. a full closed helmet of pale silver-blue metal with a narrow eye slit
8. a black cloth face mask covering the lower face, with a thin silver edge
9. a brown leather hood reinforced with rows of small iron rivets
```

### `items_5.png`

Contains: Wyrmscale Helm, Linen Hood, Conjurer Hat, Arcanist's Cowl, Chaplain's Helm, Templar Crown, Wayfarer's Hood, Duskweave Cowl, Plate Vest

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a dark iron helmet covered in overlapping red-edged scales
2. a plain off-white linen hood
3. a tall pointed dark blue cloth hat with a wide brim
4. a deep purple hood trimmed with gold thread, a small violet gem at the brow
5. a rounded gold-trimmed helmet with a white cloth veil at the back
6. a gilded closed helmet with small golden wings at the sides
7. a dark green travelling hood with a leather brim
8. a deep purple cowl with a dark metal face guard
9. a dented grey iron breastplate with leather straps
```

### `items_6.png`

Contains: Shabby Jerkin, Chainmail Hauberk, Scale Leather, Mithril Plate, Assassin's Garb, Studded Brigandine, Wyrmscale Hauberk, Simple Robe, Silken Vestment

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a sleeveless brown leather vest with patches and uneven stitching
2. a long-sleeved shirt of grey iron chain links
3. a brown leather vest covered in small overlapping iron scales
4. a clean breastplate of pale silver-blue metal
5. a fitted black leather coat with a high collar and plain silver buckles
6. a brown leather coat studded with iron rivets, with small iron shoulder plates
7. a dark coat of overlapping iron scales with red cloth showing at the seams
8. a plain undyed cloth robe tied with a rope belt
9. a long dark blue silk robe with a gold-trimmed collar
```

### `items_7.png`

Contains: Arcanist's Robe, Chaplain's Tabard, Templar Plate, Wayfarer's Coat, Duskweave Raiment, Iron Gauntlets, Rawhide Gloves, Steel Gauntlets, Stealth Gloves

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a long deep purple robe with gold embroidery and a violet gem clasp
2. a white cloth tabard with gold trim worn over light mail
3. an ornate gilded breastplate with a white sun emblem
4. a dark leather travelling coat with a green cloth mantle
5. a fitted purple and black coat embroidered with faint violet runes
6. a pair of grey iron gauntlets with jointed fingers
7. a pair of rough tan rawhide gloves
8. a pair of polished steel gauntlets with jointed fingers
9. a pair of thin, close-fitting black leather gloves
```

### `items_8.png`

Contains: Studded Bracers, Wyrmscale Gauntlets, Wool Gloves, Silk Gloves, Chaplain's Gloves, Templar Gauntlets, Wayfarer's Wraps, Duskweave Gloves, Iron Greaves

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a pair of brown leather gloves with iron-studded cuffs
2. a pair of dark scaled gauntlets with red leather lining
3. a pair of plain brown wool gloves
4. a pair of long purple silk gloves with gold cuffs
5. a pair of white cloth gloves with gold-plated knuckles
6. a pair of gilded gauntlets with jointed fingers
7. a pair of dark leather hand wraps with green cloth bands
8. a pair of slim purple gloves with dark metal cuffs
9. a pair of grey iron armoured boots
```

### `items_9.png`

Contains: Leather Boots, Steel Greaves, Shagreen Boots, Studded Boots, Wyrmscale Boots, Wool Shoes, Silk Slippers, Chaplain's Boots, Templar Sabatons

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a pair of worn brown leather boots
2. a pair of polished steel armoured boots
3. a pair of soft grey leather boots with a fine pebbled texture
4. a pair of brown leather boots with iron studs over the shins
5. a pair of dark scaled boots with red leather trim
6. a pair of soft undyed wool shoes
7. a pair of dark blue silk slippers with gold stitching
8. a pair of white cloth boots with gold-plated shins
9. a pair of gilded armoured boots
```

### `items_10.png`

Contains: Wayfarer's Boots, Duskweave Boots, Chain Belt, Leather Belt, Heavy Belt, Coral Amulet, Amber Amulet, Jade Amulet, Onyx Amulet

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a pair of worn dark leather travelling boots
2. a pair of soft purple boots with dark metal trim
3. a belt made of grey iron chain links with a simple hook clasp
4. a plain brown leather belt with a brass buckle
5. a thick dark leather belt with rows of iron studs and an iron buckle
6. a necklace on a thin cord with a small polished red coral pendant
7. a necklace on a thin gold chain with a small oval amber pendant
8. a necklace on a thin cord with a small carved green jade pendant
9. a necklace on a thin silver chain with a small black onyx pendant
```

### `items_11.png`

Contains: Iron Ring, Ruby Ring, Sapphire Ring, Topaz Ring, Diamond Ring

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single item, upright or on a diagonal, like a classic RPG inventory icon.

Fill the cells left to right, top to bottom:
1. a plain dark iron ring
2. a gold ring with one small red ruby
3. a silver ring with one small blue sapphire
4. a gold ring with one small yellow topaz
5. a white-gold ring with one small clear diamond
Leave cells 6–9 completely empty.
```

---

## Priority 5 — Unique items (38 icons on 5 sheets)

### `uniques_1.png`

Contains: Miner's Lament, Bloodthirst, Emberheart, Windstep, Alchemist's Band, The Iron Bulwark, Starforged Edge, Titan's Girth, Tavern Brawler

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
9. Tavern Brawler
```

### `uniques_2.png`

Contains: Thornquill, Wellspring, Rebuttal, The Ninth Psalm, Last Breath, The Second Guess, Bellwether, The Old Grudge, Castaway's Kerchief

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single rare item: well made and distinctive, but not overdecorated.

Fill the cells left to right, top to bottom:
1. Thornquill
2. Wellspring
3. Rebuttal
4. The Ninth Psalm
5. Last Breath
6. The Second Guess
7. Bellwether
8. The Old Grudge
9. Castaway's Kerchief
```

### `uniques_3.png`

Contains: Lookout's Hood, Mask of the Patient, Stormhide, Robe of Still Waters, Penitent's Plate, Quickfingers, Needleworker's Wraps, Knuckledusters, Slippers of the Tide

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single rare item: well made and distinctive, but not overdecorated.

Fill the cells left to right, top to bottom:
1. Lookout's Hood
2. Mask of the Patient
3. Stormhide
4. Robe of Still Waters
5. Penitent's Plate
6. Quickfingers
7. Needleworker's Wraps
8. Knuckledusters
9. Slippers of the Tide
```

### `uniques_4.png`

Contains: Sidestep, Windchaser, Fisherman's Knot, Herbalist's Sash, Brawler's Buckle, Ember of Faith, Gull's Eye, The Hollow Locket, Barnacle Band

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single rare item: well made and distinctive, but not overdecorated.

Fill the cells left to right, top to bottom:
1. Sidestep
2. Windchaser
3. Fisherman's Knot
4. Herbalist's Sash
5. Brawler's Buckle
6. Ember of Faith
7. Gull's Eye
8. The Hollow Locket
9. Barnacle Band
```

### `uniques_5.png`

Contains: Brimming Band, Twin Oaths

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single rare item: well made and distinctive, but not overdecorated.

Fill the cells left to right, top to bottom:
1. Brimming Band
2. Twin Oaths
Leave cells 3–9 completely empty.
```

---

## Priority 6 — Skill gems (70 icons on 8 sheets)

### `gems_1.png`

Contains: Heavy Strike, Ground Slam, Iron Guard, War Cry, Pummel, Berserk, Parry, Judgement Hammer, Infernal Blow

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a rounded red gemstone with a simple pale symbol of a hammer inside
2. a rounded red gemstone with a simple pale symbol of a cracked line inside
3. a rounded red gemstone with a simple pale symbol of a shield inside
4. a rounded red gemstone with a simple pale symbol of an open mouth inside
5. a rounded red gemstone with a simple pale symbol of a clenched fist inside
6. a rounded red gemstone with a simple pale symbol of a pair of crossed axes inside
7. a rounded red gemstone with a simple pale symbol of a sword held sideways inside
8. a rounded red gemstone with a simple pale symbol of a hammer with a lightning bolt inside
9. a rounded red gemstone with a simple pale symbol of a fist inside a flame inside
```

### `gems_2.png`

Contains: Twin Strike, Poison Dart, Smoke Step, Lacerate, Barrage, Rain of Arrows, Feint, Backstab, Ice Shot

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a rounded green gemstone with a simple pale symbol of two crossed blades inside
2. a rounded green gemstone with a simple pale symbol of a dart inside
3. a rounded green gemstone with a simple pale symbol of a puff cloud inside
4. a rounded green gemstone with a simple pale symbol of three claw marks inside
5. a rounded green gemstone with a simple pale symbol of three parallel arrows inside
6. a rounded green gemstone with a simple pale symbol of arrows pointing down inside
7. a rounded green gemstone with a simple pale symbol of a curved arrow turning back inside
8. a rounded green gemstone with a simple pale symbol of a dagger pointing down inside
9. a rounded green gemstone with a simple pale symbol of an arrow with a snowflake tip inside
```

### `gems_3.png`

Contains: Spark, Fireball, Frost Ward, Arcane Siphon, Glacial Lance, Meditate, Shock Nova, Consecrate, Frost Needle

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a rounded blue gemstone with a simple pale symbol of a zigzag lightning bolt inside
2. a rounded blue gemstone with a simple pale symbol of a flame inside
3. a rounded blue gemstone with a simple pale symbol of a snowflake inside
4. a rounded blue gemstone with a simple pale symbol of a spiral inside
5. a rounded blue gemstone with a simple pale symbol of a long ice spear inside
6. a rounded blue gemstone with a simple pale symbol of a closed eye inside
7. a rounded blue gemstone with a simple pale symbol of a ring of short lightning bolts inside
8. a rounded blue gemstone with a simple pale symbol of a sun over a flat line inside
9. a rounded blue gemstone with a simple pale symbol of three thin needles inside
```

### `gems_4.png`

Contains: Shattering Blow (support), Aftershock (support), Retaliation (support), Rallying Roar (support), Flurry (support), Virulence (support), Ambush (support), Hemorrhage (support), Overload (support)

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a small flat hexagonal red gemstone with a plain pale dot in the centre
2. a small flat hexagonal red gemstone with a plain pale dot in the centre
3. a small flat hexagonal red gemstone with a plain pale dot in the centre
4. a small flat hexagonal red gemstone with a plain pale dot in the centre
5. a small flat hexagonal green gemstone with a plain pale dot in the centre
6. a small flat hexagonal green gemstone with a plain pale dot in the centre
7. a small flat hexagonal green gemstone with a plain pale dot in the centre
8. a small flat hexagonal green gemstone with a plain pale dot in the centre
9. a small flat hexagonal blue gemstone with a plain pale dot in the centre
```

### `gems_5.png`

Contains: Inferno (support), Glacial Shell (support), Soul Tap (support), Tenderise (support), Blood Frenzy (support), Counterweight (support), Verdict (support), Pyre (support), Volley Fire (support)

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a small flat hexagonal blue gemstone with a plain pale dot in the centre
2. a small flat hexagonal blue gemstone with a plain pale dot in the centre
3. a small flat hexagonal blue gemstone with a plain pale dot in the centre
4. a small flat hexagonal red gemstone with a plain pale dot in the centre
5. a small flat hexagonal red gemstone with a plain pale dot in the centre
6. a small flat hexagonal red gemstone with a plain pale dot in the centre
7. a small flat hexagonal red gemstone with a plain pale dot in the centre
8. a small flat hexagonal red gemstone with a plain pale dot in the centre
9. a small flat hexagonal green gemstone with a plain pale dot in the centre
```

### `gems_6.png`

Contains: Hailstorm (support), Misdirection (support), Twist the Knife (support), Splinter (support), Permafrost (support), Clarity (support), Static Field (support), Holy Ground (support), Shatterpoint (support)

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a small flat hexagonal green gemstone with a plain pale dot in the centre
2. a small flat hexagonal green gemstone with a plain pale dot in the centre
3. a small flat hexagonal green gemstone with a plain pale dot in the centre
4. a small flat hexagonal green gemstone with a plain pale dot in the centre
5. a small flat hexagonal blue gemstone with a plain pale dot in the centre
6. a small flat hexagonal blue gemstone with a plain pale dot in the centre
7. a small flat hexagonal blue gemstone with a plain pale dot in the centre
8. a small flat hexagonal blue gemstone with a plain pale dot in the centre
9. a small flat hexagonal blue gemstone with a plain pale dot in the centre
```

### `gems_7.png`

Contains: Added Fire (support), Added Cold (support), Added Lightning (support), Brutality (support), Elemental Focus (support), Faster Attacks (support), Faster Casts (support), Efficiency (support), Critical Strikes (support)

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a small flat hexagonal red gemstone with a plain pale dot in the centre
2. a small flat hexagonal green gemstone with a plain pale dot in the centre
3. a small flat hexagonal blue gemstone with a plain pale dot in the centre
4. a small flat hexagonal red gemstone with a plain pale dot in the centre
5. a small flat hexagonal blue gemstone with a plain pale dot in the centre
6. a small flat hexagonal green gemstone with a plain pale dot in the centre
7. a small flat hexagonal blue gemstone with a plain pale dot in the centre
8. a small flat hexagonal blue gemstone with a plain pale dot in the centre
9. a small flat hexagonal green gemstone with a plain pale dot in the centre
```

### `gems_8.png`

Contains: Life Leech (support), Mana Leech (support), Multistrike (support), Spell Echo (support), Pierce (support), Chain (support), Lingering (support)

```text
Style: hand-painted fantasy game art, like the art in a classic early-2000s PC role-playing game. Simple, solid shapes with a clear silhouette. Soft, even light from the upper left, with gentle shadows. Muted, natural colours: browns, greys, dull greens and blues, with a few warmer accents. Matte surfaces, visible brush strokes, moderate detail. Show only what is described below, nothing extra.

Avoid, unless the subject below asks for it: extra props or clutter, candles, glowing runes or symbols, magic effects, sparks, embers, floating particles, smoke, fog, lens flare, glow or bloom, HDR, heavy contrast, over-sharpening, ornate filigree, text, letters, logos, watermarks, borders or frames.

Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible 3×3 grid of equal square cells. Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. No grid lines, borders, numbers or labels. All icons share the same lighting and style. Each icon is a single cut gemstone, seen from the front, with a simple flat symbol inside it.

Fill the cells left to right, top to bottom:
1. a small flat hexagonal red gemstone with a plain pale dot in the centre
2. a small flat hexagonal blue gemstone with a plain pale dot in the centre
3. a small flat hexagonal red gemstone with a plain pale dot in the centre
4. a small flat hexagonal blue gemstone with a plain pale dot in the centre
5. a small flat hexagonal green gemstone with a plain pale dot in the centre
6. a small flat hexagonal green gemstone with a plain pale dot in the centre
7. a small flat hexagonal blue gemstone with a plain pale dot in the centre
Leave cells 8–9 completely empty.
```

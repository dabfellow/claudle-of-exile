# Art prompt pack (ChatGPT image generation)

Generate these in ChatGPT, download the PNGs, and drop them into the folders listed under **`src/assets/art/`** (e.g. `src/assets/art/portraits/trader.png`). Use the exact file names so I can wire them up without guessing. Start with **Priority 1**; the rest can come later.

## How to keep everything consistent

1. Start **one ChatGPT conversation per category** (portraits, stations, icons…) and paste the **style block** first. Then ask for one image per message.
2. If an image drifts in style, reply *"same style as the first image, but …"*.
3. Icons: ask for a **transparent background**. If you get a solid background anyway, say *"make the background transparent"*.
4. Square images at 1024×1024 are fine — I'll resize them for the game.
5. Before using generated images in a commercial release, check the current OpenAI terms for image ownership/usage.

### Style block — paste at the start of every conversation

```
Art style for a dark-fantasy browser game called "Claudle of Exile" (inspired by Path of Exile and Diablo):
painterly digital illustration, grim and moody, desaturated earthy palette with warm candle/ember highlights
(gold #d2a659 accents), strong rim lighting, high detail but readable at small sizes, no text, no logos,
no watermarks, no UI frames. Keep this exact style for every image I ask for in this conversation.
```

---

## Priority 1 — Trader, guide, classes

Folder: `src/assets/art/portraits/` — 1024×1024, square portrait, chest-up, dark vignette background.

| File | Prompt (after the style block) |
|---|---|
| `trader.png` | A wandering merchant in his fifties, weathered face, sly half-smile, hooded travel cloak covered in pouches, a lantern hanging beside him, coins and trinkets on a crate in front of him, cave hideout in the background. |
| `brannoc.png` | "Old Brannoc", a hunched elderly survivor with a scarred face and a grey braided beard, wrapped in a patched fur cloak, sitting by a small fire in a seaside cliff cave, kind but tired eyes. |
| `class_warrior.png` | A battle-worn male or female warrior in dented iron plate, rusted sword over the shoulder, red cloth tabard, determined stare, stormy shoreline behind. |
| `class_ranger.png` | A lean ranger in dark leather armour and a green hood, twin daggers, alert and poised, misty marsh reeds behind. |
| `class_mage.png` | A young mage in a worn blue robe holding a crooked driftwood wand crackling with blue lightning, intense eyes lit by the spark, ruined stone archway behind. |

## Priority 2 — Hideout stations

Folder: `src/assets/art/stations/` — 1024×1024, object illustration on a dark cave-floor background, three-quarter view.

| File | Prompt |
|---|---|
| `map_device.png` | An ancient stone ring device with glowing purple runes and a swirling portal in its centre, set into a cave floor. |
| `stash.png` | A heavy iron-banded wooden chest overflowing with gold coins, glowing orbs and gear, padlock hanging open. |
| `forge.png` | A dwarven stone forge with glowing coals, an anvil, hammer and tongs, sparks flying. |
| `alchemy_table.png` | A cluttered alchemy table with bubbling glass flasks in red, blue and purple, herbs drying overhead, a small brazier underneath. |
| `bench.png` | A sturdy crafting workbench with clamps, a jeweller's loupe, scattered gemstones and a few glowing currency orbs. |
| `vendor.png` | A small merchant stall made of crates and a patched canvas awning, lanterns, goods hanging from hooks. |

## Priority 3 — Act 1 zone banners

Folder: `src/assets/art/zones/` — **wide 1792×1024** (ask for landscape), environment only, no characters.

| File | Prompt |
|---|---|
| `mudflats.png` | Grey tidal mud flats at dusk, broken shipwreck ribs, pools of dark water, drowned corpses half-buried, distant cliffs. |
| `ashwood.png` | A burned forest still smouldering, black trunks, glowing embers in the undergrowth, orange haze. |
| `crypt.png` | A flooded underground crypt, ankle-deep cold water, stone sarcophagi, pale blue light through cracks. |
| `forge.png` | A vast abandoned dwarven forge hall, rivers of molten metal, giant broken machinery. |
| `spire.png` | A tower of pale stone rising into a starry purple void, floating rubble, eerie light. |

## Priority 4 — Currency orbs

Folder: `src/assets/art/currency/` — 1024×1024, **transparent background**, a single glowing orb/object centred, like an inventory icon.

Ask for each as: *"An inventory icon of {description}, centred, transparent background."*

| File | Description |
|---|---|
| `transmute.png` | a small pale-blue glass orb with a swirling inner light |
| `augment.png` | a deep blue orb with a silver plus-shaped rune |
| `alteration.png` | a light-blue orb wrapped in a thin bronze spiral |
| `regal.png` | a gold orb with a tiny crown etched on it |
| `alchemy.png` | a golden orb filled with bubbling liquid |
| `scour.png` | a matte white-grey stone orb with a hole through the middle |
| `chaos.png` | a dark gold orb with a chaotic swirling sigil |
| `annul.png` | a cracked pure-white orb leaking faint light |
| `exalted.png` | a radiant pale-gold orb with small wings |
| `divine.png` | a cream-white orb glowing with holy light rays |
| `regret.png` | a muted green orb with a faint backwards-spiral rune |
| `instill.png` | a glowing orange orb with liquid fire swirling inside |

## Priority 5 — Materials

Folder: `src/assets/art/materials/` — same icon style, transparent background.

`copper_ore.png` (chunk of copper ore), `iron_ore.png`, `mithril_ore.png` (pale cyan metallic ore), `rough_gem.png` (uncut magenta gem), `ash_log.png`, `oak_log.png`, `yew_log.png` (dark red-brown log), `sunpetal.png` (yellow flower), `frostleaf.png` (icy blue leaf), `emberroot.png` (glowing orange root), `voidbloom.png` (purple flower with dark core), `arcane_dust.png` (small pile of glittering lavender dust), `gold.png` (small stack of gold coins).

## Priority 5b — Flasks

Folder: `src/assets/art/flasks/` — same icon style, transparent background, a single glass flask.

`life_small.png` small round flask of glowing red liquid · `life_medium.png` larger red flask · `life_grand.png` tall ornate red flask · `mana_small.png` small flask of glowing blue liquid · `mana_medium.png` larger blue flask · `granite.png` stone-grey flask with rock texture · `quicksilver.png` flask of swirling liquid silver · `diamond.png` crystal-clear flask with sparkles · `ruby.png` deep-red gem-like flask.

## Priority 6 — Monsters (Act 1)

Folder: `src/assets/art/monsters/` — 1024×1024, creature portrait, dark background.

`rat.png` drowned rat, bloated and dripping · `crab.png` large mud-caked crab · `zombie.png` waterlogged corpse rising from mud · `wisp.png` crackling yellow bog wisp · `gorger.png` **boss**: huge bloated swamp creature with a gaping maw.

---

## Later (no need yet)
- Item base icons (one per weapon/armour base) — we'll do these once the base list is final.
- Skill gem icons — after the skill list is decided.
- Title screen key art (wide), hideout background.

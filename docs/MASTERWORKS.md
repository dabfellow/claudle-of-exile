# Masterworks

Masterworks have their own page, **Masterworks**, under a **Mastery** heading in the sidebar after Production. It replaced every per-skill Masterworks tab on 2026-11-25. Sources: `src/data/professionProjects.ts`, `src/engine/professions.ts`, `src/ui/pages/MasteryPage.tsx`.

## Unlock

The page is sealed until **five life skills reach level 25**. Life skills are every trainable skill except Character level: not Fishing (coming soon), and not the removed Agility, Cooking and Rune-carving. While sealed, the page shows a door with five sockets that light up as skills reach 25, your top skills with progress bars, and dark outlines of the ten masterworks.

## What a masterwork is

Each one makes a rare item on its own **masterwork base**. Masterwork bases never drop, sell or appear as bench recipes.

- **Every modifier is Tier 1.** Any modifier that rolls on a masterwork base is its affix's top tier. Rares on it always roll six.
- **Orbs work as usual**, and it stays a masterwork. A Chaos Orb rerolls it into six new Tier 1 modifiers, an Exalted Orb adds a Tier 1 modifier, and so on. Its name stays the same through rerolls.
- **Signature built-in mods.** Each base is slightly stronger than the best level 80 base of its kind, and carries one or two extra built-in mods.
- Item level 86, level 80 to equip. Repeatable, with full costs each time.

## Ranks

| Rank | Reward | Work | XP |
| --- | --- | --- | --- |
| Adept | Six Tier 1 modifiers | 2 h | 2,500 |
| Master | Six Tier 1 modifiers and one endgame mark: a Doom Implicit or one modifier at Doom Tier (T0, 30% above Tier 1) | 4 h | 5,000 |
| Grandmaster | A Void Slot (seven Tier 1 modifiers) and one endgame mark | 8 h | 10,000 |

The marks are the same ones the Uber sigils give, so every other system treats them alike.

## The ten

Every recipe needs at least three level 60+ gathering finds from different gathering skills, at least one production good, and a rare drop. All listed skill levels are required; XP goes to the assembling craft.

| Masterwork | Rank | Slot | Signature | Skills | Materials |
| --- | --- | --- | --- | --- | --- |
| Starforged Blade | Adept | Sword | +25% crit multiplier | Mining 60, Woodcutting 60, Foraging 60, Forging 60 | 600 Star Ore, 500 Ancient Log, 120 Star Bloom, 60 Star Bar, 10 Boss Trophy |
| Glimmerweave Raiment | Adept | Body (int) | 20% spell damage | Foraging 68, Astrology 60, Thieving 65, Tailoring 60 | 150 Glimmermoss, 25 Gilded Stardust, 150 Treasury Fragment, 12 Moon Distillate, 10 Prepared Glass, 2 Guardian Trophy |
| Ancientwood Longbow | Adept | Bow | 10% attack speed | Woodcutting 65, Foraging 60, Mining 60, Sawmilling 60, Woodcrafting 60 | 600 Ancient Log, 40 Ancient Resin, 100 Star Bloom, 300 Star Ore, 80 Ancient Plank, 3 Heartwood Frame, 2 Divine Orb |
| Rimebound Crown | Master (Doom Tier) | Helmet (str/int) | +12% all res | Astrology 70, Archaeology 70, Mining 75, Gemcutting 70 | 40 Gilded Stardust, 60 Rimebound Relic Fragment, 150 Rime Idol, 800 Void Ore, 4 Exceptional Crystal, 1 Choir Glass |
| Bulwark of the Colossus | Master (Doom Implicit) | Shield (str) | 6% block | Mining 75, Woodcutting 75, Archaeology 80, Forging 75 | 900 Void Ore, 700 Spirit Log, 1 Sealed Relic, 60 Giants Relic Fragment, 6 Stone Alloy, 1 Marrow Shard |
| Wraithstep Boots | Master (Doom Tier) | Boots (dex/int) | 20% movement speed | Foraging 84, Thieving 75, Woodcutting 75, Tailoring 75 | 150 Wraithlily, 12 Oath Fragment, 50 Spirit Resin, 15 Moon Distillate, 3 Star Distillate, 1 Black Pearl |
| Twin Forge Gauntlets | Master (Doom Implicit) | Gloves (str/dex) | 20% physical damage | Mining 75, Woodcutting 70, Foraging 68, Smelting 80 | 8 Heartstone, 2 Legend Heartwood, 150 Glimmermoss, 2 Kingsbronze, 4 Wound Alloy, 1 Throne Ash |
| Ring of Converging Stars | Grandmaster (Void Slot, Doom Implicit) | Ring | +15% all res, +15 all attributes | Astrology 85, Mining 90, Foraging 84, Gemcutting 85 | 80 Gilded Stardust, 1,200 World Ore, 200 Wraithlily, 1 Convergence Crystal, 1 Void Sigil |
| Heart of the World Tree | Grandmaster (Void Slot, Doom Tier) | Amulet | 10% life, +20 all attributes | Woodcutting 90, Archaeology 85, Foraging 84, Thieving 75, Sawmilling 90, Woodcrafting 85 | 1,200 Worldwood Log, 4 Legend Heartwood, 1 Convergence Relic, 150 Wraithlily, 20 Oath Fragment, 60 Worldwood Plank, 6 Star Distillate, 1 Exile's Doom Sigil |
| The Wanderer's Staff | Grandmaster (Void Slot, Doom Implicit) | Staff | 10% cast speed | Astrology 90, Archaeology 75, Mining 75, Cartography 85, Smelting 85 | 100 Gilded Stardust, 1 Restored Taboo Tablet, 1,000 Void Ore, 2 Moonsilver, 1 Convergence Inscription, 1 Crownless Sigil, 1 Architect's Doom Sigil |

## The page

A gallery of display cases grouped by rank, beside a workbench for the one you pick. Each case has a ring that fills as you stock its materials, and says Ready, Crafting or Skills needed. The workbench shows the item (base stats, signature mods, perks), the required skill levels, and each material with have/need, a bar and a link to the skill that makes it. Recipes with bars show the "spend this bar quality first" choice. Any project underway, including an unfinished one from a retired recipe, shows at the top with Resume and Cancel.

## The old masterworks (retired 2026-11-25)

All earlier profession projects were removed: the nine profession tools (Prospector's Pick and the rest), Chart Artisans' Reliquary, Assemble Stolen Oath, and the eleven unique and two unique flask projects (Woundmaker, Winter's Pyre, The Homecoming, Borrowed Tomorrow, The Second Heresy, Worldheart, The Sum of All Things, The Buried Grudge, Debt of Stone, Hands of the Forgotten Choir, Hollow Circuit, Witchglass, The Still Heart). Copper Supply stays only so old paid runs can finish.

- Items already made keep working. Those uniques now have no source and are listed as retired in [UNIQUES.md](UNIQUES.md).
- An unfinished old project can't resume, but Cancel returns everything it reserved.

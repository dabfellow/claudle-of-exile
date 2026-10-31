# Rune-carving and runes

Act 3's new skill, from [ACT_RECIPE.md](ACT_RECIPE.md) and [ACT3.md](ACT3.md): one trainable skill that feeds its own game
system. Data is in `src/data/runes.ts`, the recipes in `src/data/skills.ts`, the rules in `src/engine/runes.ts`, the panel
in `src/ui/components/RuneBoard.tsx`, and inscribing is on the Crafting Bench.

## The loop

**Rune-carving** is the skill. **The rune slot** is the system it feeds.

1. **Carve.** A recipe turns gathered materials into a rune that stacks in the bank, like an orb. It's an ordinary
   production action, so it runs offline at full speed and stops when the materials run out.
2. **Inscribe.** At the Crafting Bench, pick an item and spend a rune. It goes in that item's one rune slot, which
   works on bag, stash and equipped gear alike. Inscribing is free and instant.
3. **Build a set.** The same rune means something different on each kind of gear, and runes of one family strengthen
   each other. So you plan across your whole loadout, not item by item.
4. **Replace.** A new rune destroys the old one. Rare gear changes less often than rune grades, so this stays a small
   cost that only asks you to wait for the right grade.

The fiction: the City of Saints keeps the old rite of carving. You arrive as an exile and take their holy script for
yourself, cutting it into gear with the ore, wood and herbs you've carried since the coast.

## Why this isn't the same thing again

| Material | Does | Touches mods? | Luck? |
|---|---|---|---|
| **Fossils** | Bias which mods roll | Rerolls them | Yes |
| **Essences** | Force one mod | Wipes the item first | The rest of the item |
| **Contraband** | Protects a mod or the item | Keeps them | The orb still rolls |
| **Affixes** | Random mods on gear | They are the mods | Yes |
| **Runes** | **A fixed effect in a slot of its own** | **Never** | **None** |

- **It adds to a finished item.** Everything else in the economy spends the item's mods to get better ones. A rune goes
  on top and costs nothing that's already there. It's the first thing you can do to a rare you've stopped crafting.
- **It works on uniques.** Nothing else can touch a unique. A rune doesn't change its mods, so a unique can take one.
- **No orb reaches it.** The rune isn't a mod: it takes no affix room, Chaos, Annulment, Scouring and Divine leave it
  alone, and Locksmith's Wax neither records it nor rolls it back.
- **It reads by slot.** An affix means the same thing wherever it rolls. Every rune has three readings.
- **It works across items.** Resonance is the only effect in the game that cares what's on your other gear.
- **Its jewellery readings aren't affixes at all.** They're effects that until now only the passive tree gave, such as
  Physical gained as Lightning. Stone's and Keen's armour readings are the same.

## Runes

Six families, four grades. Values are the Scratched, Carved, Deep and Sainted grades.

| Family | Weapon | Armour and shields | Jewellery |
|---|---|---|---|
| **Ember** | 8 / 12 / 18 / 26% increased Fire Damage | +5 / 8 / 12 / 16% Fire Resistance | 5 / 8 / 12 / 16% increased Elemental Damage above 80% Life |
| **Rime** | 8 / 12 / 18 / 26% increased Cold Damage | +5 / 8 / 12 / 16% Cold Resistance | Cold hits slow enemy attacks by 3 / 5 / 7 / 10% |
| **Storm** | 8 / 12 / 18 / 26% increased Lightning Damage | +5 / 8 / 12 / 16% Lightning Resistance | 2 / 3 / 4 / 6% of Physical gained as Lightning |
| **Stone** | +3 / 5 / 7 / 10% chance to Stun | 2 / 3 / 4 / 6% less damage from boss wind-ups | Armour applies to 2 / 3 / 5 / 7% of elemental damage |
| **Blood** | Overkill heals for 1 / 2 / 3 / 5% of it | +8 / 14 / 22 / 32 maximum Life | Regenerate 0.1 / 0.15 / 0.2 / 0.3% of Life a second |
| **Keen** | 4 / 6 / 9 / 14% more damage below 30% Life | Evading restores 0.3 / 0.5 / 0.7 / 1% of Life | 6 / 10 / 14 / 20% more crit damage on full-Life enemies |

An off-hand weapon reads as a weapon. A shield reads as armour.

**Resonance:** each other equipped piece with a rune of the same family makes that family's runes 5% stronger. Grades
can mix. With every slot on one family that's about +45% to +55%, depending on rings. A single family gives up the
other families' answers, so spreading out stays a real choice.

**Item level:** Scratched needs 1, Carved 20, Deep 32, Sainted 45.

## Recipes

Each grade has a shared base, plus one old material of the family's nature. The first two grades use the family's low
material, the last two its high one. Later families in a grade open two levels apart.

| Grade | Levels | Time | XP (scaled) | Base | Nature |
|---|---|---|---|---|---|
| Scratched | 1–11 | 15 s | 9 | 20 Copper Ore, 10 Ash Log | ×1 low |
| Carved | 15–25 | 20 s | 27 | 20 Iron Ore, 10 Oak Log, 10 Sunpetal | ×1 low |
| Deep | 30–40 | 25 s | 54 | 20 Mithril Ore, 10 Emberroot, 2 Rough Gem | ×2 high |
| Sainted | 45–55 | 30 s | 90 | 40 Mithril Ore, 20 Yew Log, 10 Voidbloom, 4 Rough Gem | ×3 high |

| Family | Low | High |
|---|---|---|
| Ember | Lesser Essence of Embers | Scorched Fossil |
| Rime | Frigid Fossil | Greater Essence of Frost |
| Storm | Lesser Essence of Storm | Metallic Fossil |
| Stone | Ash Resin | Dense Fossil |
| Blood | Lesser Essence of Vitality | Greater Essence of Vitality |
| Keen | Oak Resin | Serrated Fossil |

Copper, ash and sunpetal stop mattering by Act 2. This is what makes them worth having again. Only Fishing's catches
stay out, because nothing can catch them.

The top recipe pays about 3 XP a second, the same as Thieving, so Rune-carving 99 stays around the reset's 53 days.

## Skilling tree

The branch sits at 120°, between Fishing and Smithing, and Steady Hands moved to 105° to make room: Steady Chisel (5%
faster), Second Stroke (15% chance of two runes for one), Deep Cuts (runes on your gear are 10% stronger), and the keystone
Living Script (Resonance doubled, Rune-carving 25% slower). Rune-carving's level counts towards tree points.

## Rules kept

- **Unlock:** every recipe has a `gate` on the area id `pilgrimgate`, Act 3's first stage. A gate names its area by id and
  doesn't need the zone's data, unlike `area`. The skill's page is always there and shows what opens it.
- **Crossover:** Scratched and Carved runes drop rarely from monsters and bosses from Act 3 on, so nothing here needs the
  skill. Deep and Sainted are carved only.
- **Stash:** a rune is a field on the item, so it travels with the item through the shared stash, between characters and
  through exports. Runes not yet inscribed are bank stacks, which are per character, like Fossils.
- **Selling and salvage:** a rune goes with the item. Salvaging by rarity skips gear with a rune; salvaging that item by
  hand still works.
- **Saves:** v23 adds `skills.runecarving`. `Item.rune` is optional, so old gear loads with an empty slot, and a rune id the
  game no longer knows is ignored.
- Offline runs the same code at the same speed, Overtime included.
- Skill levels and uninscribed runes are per character.

## Later

- Each new act can add a family or a grade, as the band template in [SKILLING_REWORK.md](SKILLING_REWORK.md) §6 does.
- Runes have no art of their own yet: they show as coloured orbs, as Fossils do.
- The sim's `--profile runes` carves every night from Act 3 and fills empty slots, keeping to the family it wears most.

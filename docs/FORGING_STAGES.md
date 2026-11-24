# Forging: Shaping a weapon stage by stage

Design pass 2026-11-21. Part of the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md), following [Smelting: Running the furnace](SMELTING_FURNACE.md). Forging (save id `smithing`) today: cheap bases, or purpose gear with two guaranteed stats (physical, protection, a resistance, resource), from bars and wood; the Wayfarer's Hammer tool.

**How this pass was run:** the owner approved the Smelting set and asked (2026-11-21) for the rest of the production skills to be done the same way: I answer every question with my own pick and present the full set for review.

## Decisions (my picks, approved by the owner 2026-11-21)

- **Question 1, core twist: A — Shape it stage by stage.** A forged piece goes through stages: blank, shape, temper, edge (or rim for shields and plate), finish. Each stage offers two or three choices (heavy, light or balanced head; deep or quick temper; keen or sturdy edge), and each choice pushes the piece's stats a different way. You design gear on the anvil instead of picking a recipe. Chosen over B (commissions from customers with requirements), which is close to Thieving's prep boards.
- **Question 2a, how choices work: A — Choices steer the rolls.** Each choice raises the odds or tier of certain mods (heavy head: physical damage; balanced: attack speed). The current two guaranteed "purpose" stats become what the shape and edge stages lock in. Chosen over B (each choice adds a fixed stat), which makes every copy identical.
- **Question 2b, unlocking stages and choices: A — By level.** New choices open at milestone Forging levels, and the finish stage opens mid-game. Chosen over B (choices found as rare drops), since Forging's rare chase is below.
- **Question 3a, active play: A — Hammer on the beat.** A steady ring sets a rhythm; tap to strike on the beat. On the beat is a double, slightly off a hit, well off weak, a missed beat a miss. The rhythm speeds up for harder metals. Chosen over B (strike where the metal glows), which is close to Foraging's whack-a-mole.
- **Question 3b, idle and offline: A — Saved patterns.** Once you've chosen a full path, save it as a pattern; idle and offline forging repeats saved patterns. Chosen over B (default choices only offline).
- **Question 4a, levels 80–99: A — Master forms.** Late weapon and armour forms (a greatsword of Dragonsteel, Moonsilver plate) that only take Smelting's master alloys and add an extra stage with their own choices. Chosen over B (more of the same stages at higher numbers).
- **Question 4b, steady chase: A — The pattern book.** Every distinct full path you finish is recorded; filling chapters (all one-handed swords, all shields) unlocks Forging perks. Chosen over B (anvil upgrades), since Smelting already has furnace parts.
- **Question 4c, rare chase: A — A blade that sings.** Very rarely a finished piece comes out "singing": it gains a bonus stage you'd never otherwise reach, with a choice of rare effects. Chosen over B (a rare extra mod roll).
- **Question 5a, main view: A — The anvil.** The piece on the anvil, drawn simply, with the stage track across the top and the current stage's choices as cards; the rhythm hammer sits beside it. Pattern book and recipes are tabs.
- **Question 5b, coming back: A — The weapon rack.** Pieces forged while away hang on a rack, with any singing blades lit up.

## Decided on the owner's behalf

- Smelting's purer bars give better rolls at every stage, as agreed in the Smelting set.
- One hidden collectible at the forge, such as a master smith's broken hammerhead behind the quench barrel.
- Existing purpose recipes become ready-made saved patterns, so nothing a player could make is lost. Existing items, Wayfarer's Hammer and masterwork projects are unchanged.
- Number of choices per stage, how hard each pushes the rolls and singing odds are tuning, set at build time.

## Implementation spec

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Save id stays `smithing`. Numbers are starting values. Files: `src/data/smithing.ts` (`purposeRecipes`), `src/engine/skills.ts` (`smithBase`, `rollForgeItemTier`), and a new `src/engine/forging.ts`.

### What stays

- Cheap base recipes stay as quick recipes with no stages.
- The catalyst slot (Fossil or Resin), forge station levels and `rollForgeItemTier` keep working.
- Wayfarer's Hammer and masterwork projects are unchanged.

### Stage paths

- A **staged forge** takes one base (any base a cheap recipe can make) and runs its stages in a single action.
- The interval is the purpose-recipe interval, `60 s + 2 s × base required level`, with inputs ×2 the cheap recipe, as purpose recipes cost today.
- The result is **Rare**, like today's purpose gear.
- Each choice multiplies the roll weights of certain mod groups for that craft.

**Weapons**

| Stage | Choice (level): effect |
|---|---|
| Shape | Heavy (1): physical damage mods ×3 · Light (1): attack speed and crit mods ×3 · Balanced (20): accuracy mods ×2, all others ×1.3 |
| Temper | Deep (10): every mod rolls with a tier floor of 1 better · Quick (10): interval −30% · Oil quench (40): elemental damage mods ×3 |
| Edge | Keen (15): crit mods ×3 · Serrated (15): physical and bleed mods ×2 · Sturdy (30): life and leech mods ×2 |
| Finish (opens at level 50) | Etched (50): +10% quality · Gilded (60): +1 extra mod · Blued (70): resistance mods ×2 |

**Armour and shields**

| Stage | Choice (level): effect |
|---|---|
| Shape | Plated (1): armour mods ×3 · Light (1): evasion mods ×3 · Scaled (20): armour+evasion hybrid mods ×2 |
| Temper | the same three as weapons; Oil quench affects resistance mods instead |
| Rim | Reinforced (15): life mods ×3 · Smooth (15): block mods ×3 (shields), otherwise ×2 to life regen · Spiked (30): thorns and reflect mods ×3 |
| Finish | the same as weapons |

**Jewellery**

| Stage | Choice (level): effect |
|---|---|
| Shape | Band (1): life and mana mods ×3 · Signet (1): attribute mods ×3 · Twisted (20): resistance mods ×3 |
| Temper | the same as armour |
| Setting | Closed (15): resistance mods ×2 · Clawed (15): crit mods ×2 · Open (30): rarity and gold mods ×3 |
| Finish | the same as weapons |

**Purpose guarantees.** Some paths lock in today's two guaranteed purpose stats:

- **Physical:** Heavy + Serrated.
- **Protection:** Plated (or Light) + Reinforced.
- **Resistance (element picked at Oil quench):** Oil quench + Reinforced or Closed.
- **Resource:** Band + Closed.

The guarantees use the same `SmithPurpose` rules (both mods must be able to roll on the base).

**Bar purity** adds its bonus through `barPurityBonus` from the Smelting spec.

Quality increases a weapon's local physical damage or an armour piece's local defences. On jewellery it increases rolled modifier values and leaves crafted modifiers and alloy signatures fixed.

### Saved patterns (idle and offline)

- A pattern is `{ id, name, baseId, choices }`. You can save 3 patterns at level 1, +1 at levels 25, 50 and 75, and +1 per pattern-book perk.
- Idle and offline forging repeats the **active** pattern. Starting a staged forge by hand also lets you pick choices once without saving.

### Focus minigame: hammer on the beat

- Keep today's `SmithingGame` and `strikeResult` (45, 120 and 260 ms windows).
- The beat interval follows the bar metal: copper 900 ms, falling evenly to world at 550 ms.
- Show the beat as a pulsing ring with a click sound, and tap to strike.

### Master forms (levels 80–99)

- A master form is a staged forge with a master alloy (from Smelting) as an extra input.
- Unlocks: one-handed weapons at 80, two-handed at 85, armour at 88 and jewellery at 92.
- It adds a final **Signature** stage:
  - Amplified: alloy signature values ×1.5.
  - Twin-forged: +1 extra mod.
  - Ancestral: item level +2 over the cap.
- A Living alloy gives its second signature as described in the Smelting spec.

### Steady chase: the pattern book

- The book records every distinct (item class, full choice path) finished. Chapters are item classes: one-handed swords, axes, maces, two-handed weapons, shields, helmets, body armour, gloves, boots, rings, amulets and belts.
- A chapter completes at 10 distinct paths in that class. Each completed chapter gives one perk, in this order: +5% Forging speed, +1 pattern slot, singing chance ×1.25, +5% Forging speed, then +1 pattern slot, repeating.

### Rare chase: a blade that sings

- Each staged forge has a 1 in 500 chance to sing. The item gains a **Singing** stage that offers three rare effects to pick one from:
  - +1 tier on every mod
  - one extra mod
  - +30% quality
- Offline or idle singing items wait in `pendingSinging` until the player picks.

### State

`GameState.forging`:

- `patterns: Pattern[]`
- `active: string | null`
- `book: Record<classId, string[]>` (path keys)
- `pendingSinging: number[]` (item uids)

### Screen

- **Anvil** tab:
  - The piece drawn simply on an anvil.
  - The stage track across the top (Blank, Shape, Temper, Edge/Rim/Setting, Finish, and Signature for master forms).
  - The current stage's choices as cards, each showing its effect in words.
  - A **Save pattern** button and a pattern dropdown.
  - The rhythm hammer beside the anvil, below it on phones.
- Other tabs: **Patterns**, **Pattern book**, **Quick recipes** (cheap bases) and **Master forms**.

### Coming back: the weapon rack

- A rack lists the items forged while away, each as a small item card.
- Singing items glow, with a **Choose its song** button.

### Migration

- Each existing purpose recipe becomes a saved pattern with the guarantee path above.
  - If a player has used more purpose recipes than they have pattern slots, convert the ten most-used, ranked by task mastery level.
  - Every purpose path stays available to pick by hand anyway.
- Purpose task mastery tracks carry over to the staged forge of that base.

### Tests

- Each choice's weight effect.
- Staged forges always come out Rare.
- Purpose guarantees from the mapped paths.
- Choice unlock levels.
- Pattern repetition offline.
- Pattern slot counts.
- Master form gates and signatures.
- Pattern book chapters and perks.
- Singing roll and pending choice.
- Beat interval by metal.
- Migration.

## Weapon-family mastery and signatures (decided 2026-11-23)

The owner chose to replace individual weapon recipe mastery with mastery shared across a weapon family. Early crafts build practice that carries into higher-tier bases in the same family. A starter sword and a late-game sword are examples of the relationship, with no decision on specific recipes or bases.

High family mastery unlocks exclusive crafted signatures. The material used determines which signature outcomes can roll, as Foraging strains influence Alchemy. Combat drops still supply useful bases and rolled gear. Forge batches offer effects that require both practice in the family and acquiring the right input. Players can save the recipe and come back to the completed batch.

The game uses eight existing families: axes, bows, daggers, maces, sceptres, staves, swords, and wands. One- and two-handed versions share their family. Quick recipes, purpose recipes, and staged crafts contribute to the same track. Bows, wands, and staves build practice through their existing Woodcrafting recipes and can use alloys in Forging's endgame Master Forms.

At family mastery 75, every Master Form rolls one additional signature, chosen evenly from the selected alloy's pair. This keeps a batch worth checking without making a scarce alloy come up empty. The existing alloy effect and the Living alloy bonus still apply. Kingsbronze rolls critical chance or critical multiplier, Moonsilver rolls cast speed or mana regeneration, Dragonsteel rolls fire or bleed damage, and Voidglass rolls chaos or poison damage. These signatures are inherent to crafted weapons.

Existing weapon practice carries across into its family, capped at mastery 100. Migration removes the overlap when an old purpose track was copied into a staged recipe. Saved patterns and active plans are kept. Basic speed and conservation progress and global bonuses count once per family.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Build the remaining production twists".

# Cooking

Act 5's skill, planned in [ACTS_4_6.md](ACTS_4_6.md). Built 2026-11-01. Gathered plants become two things: **flask
ingredients** for Alchemy's strongest brews, and **meals** you eat for a long fight buff. It's the smaller skill the plan
asked for: a production skill with one extra state field, not a system of its own. Fishing is never being added, so no
recipe uses fish.

## Unlock

Every recipe has `gate: COOKING_GATE` (`src/data/cooking.ts`), which names `blackharbor`, Act 5's first area. The sidebar
row only shows once that area is unlocked, so nothing is reachable while Act 5 is closed. The three new Alchemy recipes
share the gate. They show as locked "Reach Act 5" entries on the Alchemy page, like Rune-carving's did before Act 3.

## Recipes

Plants in, one thing out. The chain is Foraging → Cooking → (eat it, or Alchemy → flask). Logs are the fuel. Essences, which
Foraging already drops, are the seasoning in the expensive recipes, so they stay worth keeping.

| Lv | Recipe | Time | Inputs | Makes |
|---|---|---|---|---|
| 1 | Sunpetal Porridge | 4s | 6 Sunpetal, 1 Ash Log | 8% increased maximum Life |
| 6 | Frostleaf Broth | 4s | 4 Frostleaf, 4 Sunpetal | 12% increased maximum Mana |
| 10 | Forager's Hash | 4.5s | 6 Frostleaf, 6 Sunpetal, 1 Oak Log | 15% increased Item Rarity |
| 15 | Frostleaf Extract | 5s | 12 Frostleaf, 1 Greater Essence of Frost | Ingredient: Sacred Mana Flask |
| 20 | Emberroot Chilli | 5s | 6 Emberroot, 3 Frostleaf | 12% increased Physical and Elemental Damage |
| 26 | Stormwatch Chowder | 5.5s | 8 Emberroot, 1 Greater Essence of Storm | +14% Fire and Lightning Resistance |
| 30 | Emberroot Reduction | 6s | 14 Emberroot, 1 Greater Essence of Vitality | Ingredient: Sacred Life Flask |
| 35 | Slow Root Roast | 6s | 10 Emberroot, 2 Yew Logs | Regenerate 0.6% of Life per second |
| 40 | Voidbloom Curry | 7s | 6 Voidbloom, 4 Emberroot | 8% increased Attack and Cast Speed |
| 45 | Voidbloom Distillate | 8s | 12 Voidbloom, 1 Greater Essence of Haste | Ingredient: Sulphur Flask |
| 50 | Captain's Table | 10s | 10 Voidbloom, 6 Emberroot, 1 Greater Essence of Vitality, 2 Yew Logs | 8% Life, +8% all Res, 8% Physical and Elemental Damage |

Meals are side-grades, not a ladder. Stormwatch Chowder is the Act 5 dish, because the act's check is fire and lightning
together. The Hash is for farming. Only Captain's Table is the "best at everything" pick, and it costs Essences.

## Flask ingredients

Each ingredient has one Alchemy recipe, and these flasks can't drop: `dropLevel` is `Infinity`.

| Alchemy Lv | Flask | Inputs | Does |
|---|---|---|---|
| 42 | Sacred Mana Flask | 3 Frostleaf Extract, 2 Yew Logs | Recovers 400 Mana over 3s |
| 46 | Sacred Life Flask | 3 Emberroot Reduction, 3 Yew Logs | Recovers 900 Life over 1.2s |
| 50 | Sulphur Flask | 3 Voidbloom Distillate, 3 Rough Gems | 40% increased Physical and Elemental Damage for 4.5s |

New flask bases rather than a quality system, because a recipe is data and a quality system is a system.

## Food

- **What it does:** a meal gives its stats for as long as it lasts. Stats are existing `StatKey`s added in `rawStats`, so
  every tooltip and the character sheet already show them.
- **One meal at a time.** `s.meal` is one slot. A different dish replaces what's left of the last, and the same dish is
  refused, so you can't waste one by mistake.
- **30 minutes, and only fighting counts.** The clock runs inside `s.combat` and nowhere else. The reason is that skilling
  and combat are one at a time here: a clock that always ran would punish you for gathering, and for sleeping on a
  skilling job. A meal waits for you the rest of the time. It also survives death.
- **Offline:** the same tick runs the same clock, so offline is worth what online is (the rule in
  [SKILLING_REWORK.md](SKILLING_REWORK.md)).
- **Keep eating** (on by default): when a meal runs out and you have another of that dish, it's eaten at once, with no time
  lost. Without this, a 12-hour night would be fed for its first half hour, and food would reward logging in to re-eat.
  With it, your stack of a dish is simply hours of fighting. Running out posts a plain message, and doesn't count as a
  stopped job in the offline summary.
- **The trade:** cooking uses your one activity. A top meal costs a minute or two of skilling, and more with its Essence,
  for 30 minutes of fighting, so being fed is a real but small share of your time.
- **Combat only.** No skilling-speed meals: they'd need a clock that also runs while skilling, and would stack multiplicatively
  with everything skilling already has. A meal doesn't count as a flask, so Flask Effect doesn't scale it and Philosopher's
  Draught doesn't count it.

## Skilling tree

A branch at 60°, between Foraging and Fishing.

| Node | Effect |
|---|---|
| Line Cook (small ×3) | 5% faster Cooking |
| Second Helping (Lv 15) | 15% chance to cook two for one |
| Slow Simmer (Lv 30) | Meals last 25% longer |
| Head Chef (keystone, Lv 50) | Meals are 30% stronger. Cooking is 25% slower |

## Mini-game

Three pots heat at their own pace. Stir each one in the bright band. Early is a weak hit, late is a miss, and very early
does nothing, using the same scoring as Mining's charge. A pot left alone boils over and starts again, which costs nothing
beyond the drain, like a herb that wilts. It's in `src/ui/components/minigames.tsx`.

## Saves

No version bump. `skills` and `lifetime` are in `MERGE_KEYS` and `meal` and `keepEating` are filled from `newGame`, so old
saves load unfed at level 1. `tests/cooking.test.ts` covers this.

## Art

Everything is a pack stand-in from Kibyra's consumables. `items/consumables/fish.png` is deliberately unused. Medicine jar
stands in for all three ingredients, and some dishes are bottles or a barrel. Sulphur and the Sacred flasks use plain
potions.

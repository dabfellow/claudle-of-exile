# Gear bases

All bases live in `src/data/bases.ts`: 428 in all. Every attribute type, pure and hybrid, has a ladder to level 80 (level 60 added 2026-10-26, level 80 added 2026-10-30), so new Maps tiers keep bringing visibly better gear. Belts, amulets and rings are not part of the ladders; they stop at level 26.

## Tier ladders (pure str / dex / int)

| Slot | Levels |
|---|---|
| Helmet, body armour | 1, 8, 16, 24, 32, 40, 47, 54, 60, 67, 74, 80 |
| Gloves, boots | 1, 8, 20, 28, 36, 44, 52, 60, 64, 72, 80 (staggered, so some slot upgrades every few levels) |
| Shields | str 1, 8, 16, 24, 32, 40, 47, 54, 60, 67, 74, 80 · dex 8, 16, 24, 32, 40, 47, 54, 60, 67, 74, 80 · int 6, 14, 22, 32, 40, 47, 54, 60, 67, 74, 80 |
| Mace (str) | 1, 12, 19, 26, 33, 40, 47, 54, 60, 67, 74, 80 |
| Bow (dex) | 1, 8, 16, 23, 30, 37, 44, 52, 60, 68, 74, 80 |
| Wand (int) | 1, 7, 14, 22, 30, 37, 44, 52, 60, 68, 74, 80 |
| Staff (int) | 4, 16, 28, 38, 48, 60, 70, 80 |

Each new armour tier is a named set with matching art (one whole gear set from the pack per tier):

| | 8 | 24 / 28 | 40 / 36 | 47 / 44 | 54 / 52 | 60 | 67 / 64 | 74 / 72 | 80 |
|---|---|---|---|---|---|---|---|---|---|
| Str | Blackened | Knight | Warlord | Dreadsteel | Champion | Sunforged | Colossus | Titan | Godforged |
| Dex | Woodsman | Wolfpelt | Bonehunter | Hawkfeather | Thornwarden | Manticore | Gryphon | Stagheart | Wildlord |
| Int | Acolyte | Magus | Stargazer | Raven | Hierophant | Seraph | Oracle | Astral | Celestial |

## Tier ladders (hybrids)

| Slot | Levels |
|---|---|
| Helmet, body armour | 8, 16, 24, 32, 40, 47, 54, 60, 67, 74, 80 |
| Gloves, boots | 12, 20, 30, 37, 44, 52, 60, 64, 72, 80 |
| Shields | 12, 24, 36, 44, 52, 60, 64, 72, 80 |
| Sword (str/dex) | 1, 8, 16, 24, 34, 41, 48, 54, 60, 66, 73, 80 |
| Axe (str/dex) | 1, 10, 18, 25, 32, 39, 46, 53, 60, 67, 74, 80 |
| Dagger (dex/int) | 1, 7, 14, 21, 28, 35, 43, 51, 60, 68, 74, 80 |
| Sceptre (str/int) | 6, 15, 24, 32, 40, 47, 54, 60, 66, 73, 80 |

| | 8 / 12 | 16 / 20 | 24 / 30 | 32 | 40 / 37 | 47 / 44 | 54 / 52 | 60 | 67 / 64 | 74 / 72 | 80 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Str/Dex | Studded | Ringmail | Wyrmscale | Lamellar | Gladiator | Corsair | Bladedancer | Dragonscale | Warbringer | Slayer | Wyrmlord |
| Str/Int | Chaplain | Crusader | Templar | Inquisitor | Paladin | Zealot | Hallowed | Archon | Exarch | Sanctum | Empyrean |
| Dex/Int | Wayfarer | Shade | Duskweave | Phantom | Nightshade | Wraith | Umbral | Voidwalker | Eclipse | Abyssal | Oblivion |

(Level 32 sets are helmet and body only.) A hybrid carries 60% of a pure base's value in each of its two defences. When one of them is energy shield, the ES is half that value, as before.

## Base stats

- Armour, evasion and energy shield follow `k × (level + 6)^1.4`. `k` is set per slot so the old level-32 (or level-20 gloves/boots) bases sit on the curve. A level-60 piece has about 2.2× the level-32 value, and a level-80 piece about 1.45× the level-60 value.
- Weapon average damage grows as `(level + 10)^1.15` from each family's old top base. The family's min:max spread stays the same. A level-80 weapon has about 1.33× the level-60 average.
- Numbers are hardcoded per base. The curve is only where they came from. The level 64+ numbers follow the curve and have not been through a sim.

## Bonus implicits (level 40+)

Every base of level 40+ gets one built-in mod. Hybrid values are a bit lower than pure ones. It scales from its level-40 value to its level-60 value (`ARMOUR_BONUS` and `bonus` on `WEAPON_FAMILIES`), then keeps climbing at the same rate, so a level-80 base carries `2 × level-60 value − level-40 value`. The table shows the level 40–60 range. Weapons keep their family implicit and add this one on top.

| | Helmet | Body | Gloves | Boots | Shield |
|---|---|---|---|---|---|
| Str | +25–45 Life | 5–9% inc Life | 8–16% inc Phys | 3–7 Life regen/s | +4–8% all res |
| Dex | +80–160 Accuracy | 10–20% inc Evasion | 4–8% Attack Speed | +10–20 Dex | 10–20% inc Crit Chance |
| Int | +20–40 Mana | 10–20% inc ES | 4–8% Cast Speed | 15–30% Mana regen | 8–16% inc Spell Damage |
| Str/Dex | +20–35 Life | 4–7% inc Life | 3–6% Attack Speed | +60–120 Accuracy | 2–4% Block |
| Str/Int | +15–30 Mana | +6–10% all res | 8–14% inc Elemental | 2–5 Life regen/s | 6–12% inc Spell Damage |
| Dex/Int | 8–15% inc Crit Chance | 8–15% inc ES | +8–15% Crit Multi | 10–20% Mana regen | 3–6% Cast Speed |

| Mace | Bow | Wand | Staff | Sword | Axe | Dagger | Sceptre |
|---|---|---|---|---|---|---|---|
| 10–20% inc Phys | +10–20% Crit Multi | 5–10% Cast Speed | +30–60 Mana | 4–8% Attack Speed | 15–30% inc Bleed | +10–20% Crit Multi | 10–20% inc Spell Damage |

## Affix pool (2026-10-27)

All rollable mods are in `src/data/affixes.ts`. Each has 9 tiers, unlocking at item levels 1, 8, 16, 25, 35, 45, 55, 68 and 80 (`ILVLS`). Only the top 5 tiers an item's level allows can roll (`TIER_WINDOW` in `items.ts`). Each step up is still ~70% as likely as the one below.

**Tags decide the pool.** Weapons carry `attack_weapon` (mace, axe, sword, bow), `caster_weapon` (wand, staff) or both (dagger, sceptre), plus `str_weapon` / `dex_weapon` / `int_weapon`. Hybrid armour also carries its pair tag (`str_dex_armour` …).

**Local vs global.**
- On armour and shields, flat and % defence mods are local: they change only that piece's armour, evasion or energy shield (`itemDefences` in `stats.ts`). The tooltip shows the result in magic blue.
- On weapons, flat and % physical damage are local (`weaponPhys`).
- The "global" % defence and % physical mods roll only on rings, amulets and belts. Flat mods there (life, flat armour on belts, added damage on rings) are global too.
- Base implicits (e.g. a mace's % physical) are still global.

**Groups.**
- Attack: local % physical, added physical/fire/cold/lightning, % elemental (3× the old numbers), attack speed, crit, accuracy.
- Caster: % spell damage, "Adds X to Y Damage to Spells" (full effectiveness, unlike normal added damage's 70%), % fire/cold/lightning, cast speed, spell crit chance and multiplier, reduced mana cost, % mana, energy shield + mana, mana as extra energy shield, spell block, mana regen.
- Defence: local and global armour/evasion/energy shield; hybrid % and flat mods (weight 150 on their hybrid bases, vs 100 for a single defence); resistances (weight 40 on armour, 80 on jewellery); reduced elemental damage taken (body, shield); life regen (half the old numbers, weight 60).
- Leech: physical and elemental leech, 5% to 30% of that damage type, for attacks and spells.
- Ailments (rings, amulets, belts only): % bleed/poison/ignite damage, % ailment damage, ailment duration, chance to bleed (attacks), poison (any hit) or ignite (hits with fire damage).
- Attributes: armour and weapons roll only their own attribute, at weight 25. Jewellery rolls any.
- Utility: Item Rarity is a prefix now, at 4× the old numbers. "% increased Experience gained" (character XP) replaced Skill Experience; the old `skill_xp` mod no longer rolls but still works on existing items and the Miner's Lament unique.

## Known gaps

- Monsters stop at level 33, so bases above 34 can't drop until Act 3+ exists. Smithing (level = base level) and the Town Market (character level) can't reach them either.
- Smithing uses mithril for everything from level 22 up. A level-80 base costs the same as a level-24 one.
- Weapons and shields above about level 34 have no pack art yet, and show the slot's placeholder icon. That includes all 41 weapons and shields added for levels 61–80. New asset packs can cover them. All armour tiers to level 80 have gear-set art; of the 89 sets only 59 is still unused.

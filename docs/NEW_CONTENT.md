# New Content Pass — Classes, Skills, Uniques

> **Superseded (2026-10-24):** the class list below is replaced by [CLASSES.md](CLASSES.md),
> the skills by [NEW_SKILLS.md](NEW_SKILLS.md), and the uniques by [NEW_UNIQUES.md](NEW_UNIQUES.md).
> Nothing below is current.

Draft design list. Everything is written against what's already in the code:
stat keys from `engine/types.ts`, bases from `data/bases.ts`, affix ids from `data/affixes.ts`.
Anything marked **NEW** needs to be added; everything else already exists.

---

## 1. Classes (5)

The current three are pure single-attribute. The new five fill in the hybrids plus two "lifestyle" classes.
Hybrid classes need a start node on the passive tree between two regions (`class_strdex`, etc.) — **NEW** tree work.

| Class | Attr | Start attrs (S/D/I) | Bonus | Starter kit | Starter gems |
|---|---|---|---|---|---|
| **Reaver** | Str/Dex | 17 / 17 / 8 | `bleedPct` 20, `attackSpeedPct` 4 | rusted_sword, plate_vest, rawhide_gloves | Rend, Blood Rush |
| **Warden** | Str/Int | 17 / 8 / 17 | `shieldEffect` 15, `allRes` 8 | rusted_sword, plank_shield, iron_hat | Judgement Hammer, Sanctified Wall |
| **Nightblade** | Dex/Int | 8 / 17 / 17 | `spellCritPct` 25, `poisonPct` 15 | whittled_dagger, shabby_jerkin, leather_cap | Frost Needle, Shade Step |
| **Brewmaster** | Int (crafting) | 12 / 12 / 18 | `flaskCharges` 20, `skillSpeed` 5 | driftwood_wand, shabby_jerkin, chain_belt | Firebomb, Quaff |
| **Wanderer** | Balanced | 14 / 14 / 14 | `allAttr` 4, `itemRarity` 10 | rusted_sword, shabby_jerkin, iron_ring | Arc Blade, Second Wind |

**Taglines / desc**
- **Reaver** — *"Every cut keeps bleeding."* A raider who opens wounds and outpaces the damage coming back. Leech and bleed carry the sustain.
- **Warden** — *"Hold the line, then end it."* Shield-bearer who channels the storm through a hammer. Tankiest elemental defence of any start.
- **Nightblade** — *"Unseen, then fatal."* Fragile caster-assassin: cold needles, poison and crits. Highest skill ceiling.
- **Brewmaster** — *"Every problem has a recipe."* Bombs and tonics in combat, faster gathering and crafting out of it. The idle-economy class.
- **Wanderer** — *"A little of everything, a lot of loot."* Flexible jack-of-all-trades; best for players who want to pivot builds later.

---

## 2. New Skills (15 active + 5 signature supports)

Three actives per class (the two starters + one unlock). Numbers are at gem level 1, same format as `ACTIVE_GEMS`.

### Reaver
| Gem | Attr | Role | Tags | Cost / CD | Effect | Default rule |
|---|---|---|---|---|---|---|
| **Rend** | dex | main | attack, melee, dot, duration | 5 / 0 | `weaponPct` 80, single, bleed 25%/s for 4s | always |
| **Blood Rush** | str | buff | buff, duration | 12 / 10s | 6s buff: `attackSpeedPct` 25, `lifeLeech` 2 | notActive |
| **Cleave** | str | area | attack, melee, area | 7 / 0, speedMult 1.1 | `weaponPct` 75, all | enemiesAtLeast 2 |

Signature — **Exsanguinate** (Rend): bleeding enemies take 15% more attack damage; a kill on a bleeding enemy refunds 4 mana.

### Warden
| Gem | Attr | Role | Tags | Cost / CD | Effect | Default rule |
|---|---|---|---|---|---|---|
| **Judgement Hammer** | str | main | attack, melee | 6 / 0, speedMult 1.25 | `weaponPct` 140, single, `stunChance` 0.2, 40% of phys converted to lightning (**NEW** `convert` field) | always |
| **Sanctified Wall** | int | guard | spell, guard, duration | 12 / 9s, cast 300 | `shieldPct` 18 + `blocks` 1 | enemyCasting |
| **Consecrate** | int | sustain | spell, area, duration | 10 / 6s, cast 500 | `base` [4, 8] fire, all; 4s buff `lifeRegenPct` 2 | lifeBelow 70 |

Signature — **Verdict** (Judgement Hammer): hits on stunned enemies arc lightning to 2 other enemies for 50% damage.

### Nightblade
| Gem | Attr | Role | Tags | Cost / CD | Effect | Default rule |
|---|---|---|---|---|---|---|
| **Frost Needle** | int | main | spell, projectile | 5 / 0, cast 700 | `base` [2, 5] cold, `hits` 3, single, `crit` 8 | always |
| **Shade Step** | dex | guard | guard, duration | 10 / 8s, cast 250 | `evadeMs` 1500; 3s buff `critChancePct` 60 | enemyCasting |
| **Withering Hex** | int | curse | spell, duration | 8 / 6s, cast 400 | target takes 20% increased damage for 6s (**NEW** enemy `debuff` field) | bossOnly |

Signature — **Shatterpoint** (Frost Needle): every 4th cast is a guaranteed critical strike; crits chill.

### Brewmaster
| Gem | Attr | Role | Tags | Cost / CD | Effect | Default rule |
|---|---|---|---|---|---|---|
| **Firebomb** | int | area | spell, area, dot, duration | 9 / 0, cast 900 | `base` [5, 10] fire, all, ignite 20%/s for 3s | enemiesAtLeast 2 |
| **Quaff** | str | sustain | buff | 6 / 15s, cast 200 | +1 charge to every flask (**NEW** `flaskCharge` field) | lifeBelow 50 |
| **Acid Splash** | dex | burst | attack, projectile, area, dot, duration | 8 / 3s | `weaponPct` 60, all, poison 35%/s for 3s | enemiesAtLeast 3 |

Signature — **Volatile Mix** (Firebomb): hitting an ignited enemy detonates the ignite for 60% of its remaining damage.

### Wanderer
| Gem | Attr | Role | Tags | Cost / CD | Effect | Default rule |
|---|---|---|---|---|---|---|
| **Arc Blade** | dex | main | attack, melee, chain | 5 / 0 | `weaponPct` 70, chain, `chains` 1 | always |
| **Second Wind** | str | sustain | buff, duration | 10 / 14s, cast 300 | 4s buff `regenPct` 6 (≈24% life) | lifeBelow 40 |
| **Pathfinder's Mark** | dex | buff | buff, duration | 12 / 10s, cast 300 | 8s buff: `moreDamage` 10, `accuracy` 100, `itemRarity` 20 | notActive |

Signature — **The Long Road** (Second Wind): also restores 20% mana and takes 2s off every other cooldown.

---

## 3. Uniques (30)

All on existing bases (highest base is level 34, so everything is ≤ 50). Slot split:
weapon 4 · offhand 3 · helmet 3 · body 4 · gloves 3 · boots 3 · belt 3 · amulet 3 · ring 4.

Mods use existing affix ids where possible. `u_*` affixes marked **NEW** are unique-only affixes that point at a stat key that **already exists** in `STAT_KEYS` — they only need an entry in `affixes.ts`.

### Weapons
| # | Name | Base (lvl) | Mods | Flavour | Fits |
|---|---|---|---|---|---|
| 1 | **Tidecaller** | driftwood_wand (1) | `added_light` 2–14, `u_extra_chains` 1 **NEW**→`extraChains`, `flat_mana` 20 | *The sea answers in thunder.* | Mage / Spark |
| 2 | **Gravewhistle** | iron_blade (8) | `added_cold` 4–9, `u_chill_on_hit` 20 **NEW**→`chillOnHit`, `crit_chance` 25 | *Its song is the last thing they hear.* | Wanderer |
| 3 | **Saltbiter** | glinting_dagger (14) | `added_phys` 4–10, `u_poison_pct` 30 **NEW**→`poisonPct`, `attack_speed` 10 | *Brine in every wound.* | Nightblade / Ranger |
| 4 | **The Butcher's Bill** | war_axe (18) | `inc_phys` 60, `u_bleed_pct` 40 **NEW**→`bleedPct`, `life_leech` 3 | *Paid in full, in red.* | Reaver |

### Offhands
| # | Name | Base (lvl) | Mods | Flavour | Fits |
|---|---|---|---|---|---|
| 5 | **Driftwood Aegis** | plank_shield (1) | `flat_life` 20, `cold_res` 25, `u_block_heal` 10 **NEW**→`blockHeal` | *It floated. So did I.* | Warrior / Warden |
| 6 | **The Quiet Buckler** | buckler (8) | `inc_evasion` 50, `dexterity` 15, `u_evade_heal` 5 **NEW**→`evadeHeal` | *Make no sound; take no blow.* | Ranger |
| 7 | **Saintwall** | tower_shield (32) | `u_shield_effect` 30 **NEW**→`shieldEffect`, `u_extra_blocks` 1 **NEW**→`extraBlocks`, `all_res` 18 | *The faithful do not kneel twice.* | Warden |

### Helmets
| # | Name | Base (lvl) | Mods | Flavour | Fits |
|---|---|---|---|---|---|
| 8 | **Crown of Brine** | leather_cap (1) | `flat_mana` 25, `mana_regen` 30, `cold_res` 20 | *Salt-crusted, still regal.* | any caster |
| 9 | **Bellringer** | soldier_helm (16) | `inc_armour` 50, `flat_life` 40, `u_stun_chance` 15 **NEW**→`stunChance` | *Your skull is the bell.* | Warrior / Warden |
| 10 | **Veil of the Unseen** | shadow_mask (32) | `inc_evasion` 70, `crit_chance` 50, `u_crit_full_life` 40 **NEW**→`critFullLife` | *No face, no mercy.* | Nightblade |

### Body Armour
| # | Name | Base (lvl) | Mods | Flavour | Fits |
|---|---|---|---|---|---|
| 11 | **Kelp-Woven Wrap** | shabby_jerkin (1) | `flat_life` 25, `life_regen` 3, `item_rarity` 15 | *Smells of low tide; fits like luck.* | Wanderer / any |
| 12 | **Hide of the Marsh King** | scale_leather (16) | `inc_evasion` 80, `u_poison_pct` 25 **NEW**→`poisonPct`, `cold_res` 30 | *He ruled the reeds until he didn't.* | Nightblade / Ranger |
| 13 | **Pilgrim's Mail** | chainmail (16) | `flat_life` 50, `all_res` 12, `u_cdr` 15 **NEW**→`cooldownRecovery` | *Each link a mile walked.* | Warden / Wanderer |
| 14 | **The Lantern Vigil** | mithril_plate (32) | `u_life_more` 10, `fire_res` 40, `u_armour_vs_elem` 20 **NEW**→`armourVsElem` | *Keep the light. Keep the line.* | Warrior / Warden |

### Gloves
| # | Name | Base (lvl) | Mods | Flavour | Fits |
|---|---|---|---|---|---|
| 15 | **Gutting Hooks** | rawhide_gloves (1) | `added_phys` 2–5, `attack_speed` 8, `u_bleed_pct` 20 **NEW**→`bleedPct` | *Fishermen's tools, butchers' habits.* | Reaver |
| 16 | **Forgehand** | iron_gauntlets (1) | `flat_armour` 30, `strength` 15, `skill_speed` 15 | *The anvil knows its master.* | Brewmaster / skillers |
| 17 | **Sparkfingers** | stealth_gloves (20) | `added_light` 3–18, `u_cast_speed` 15 **NEW**→`castSpeedPct`, `u_phys_as_light` 25 **NEW**→`physAsLight` | *Every touch a small storm.* | Warden / Mage |

### Boots
| # | Name | Base (lvl) | Mods | Flavour | Fits |
|---|---|---|---|---|---|
| 18 | **Mudstriders** | iron_greaves (1) | `flat_life` 20, `fire_res` 20, `u_slam_reduction` 15 **NEW**→`slamReduction` | *Sunk to the knee, never to the ground.* | Warrior early |
| 19 | **Ironroot Greaves** | steel_greaves (20) | `flat_armour` 100, `flat_life` 40, `skill_xp` 12 | *Planted like the old oaks.* | Warden / skillers |
| 20 | **Gale Treads** | shagreen_boots (20) | `inc_evasion` 60, `light_res` 30, `u_evade_speed` 10 **NEW**→`evadeSpeed` | *Ride the gust, not the blade.* | Ranger / Nightblade |

### Belts
| # | Name | Base (lvl) | Mods | Flavour | Fits |
|---|---|---|---|---|---|
| 21 | **Fisherman's Knot** | chain_belt (1) | `flat_life` 15, `flask_charges` 25, `item_rarity` 10 | *Tied tight against the tide.* | any |
| 22 | **Herbalist's Sash** | leather_belt (12) | `u_life_flask_recovery` 30 **NEW**→`lifeFlaskRecovery`, `u_utility_flask_duration` 20 **NEW**→`utilityFlaskDuration`, `skill_xp` 10 | *Pockets full of tomorrow's cures.* | Brewmaster |
| 23 | **The Undertaker's Cinch** | heavy_belt (26) | `flat_life` 60, `strength` 25, `u_overkill_heal` 10 **NEW**→`overkillHeal` | *Measured every corpse for size.* | Reaver |

### Amulets
| # | Name | Base (lvl) | Mods | Flavour | Fits |
|---|---|---|---|---|---|
| 24 | **Gull's Eye** | coral_amulet (1) | `accuracy` 60, `crit_chance` 20, `item_rarity` 15 | *It sees the glint from miles away.* | Wanderer / Ranger |
| 25 | **Ember Locket** | amber_amulet (10) | `added_fire` 3–7, `fire_res` 25, `u_ignite_pct` 30 **NEW**→`ignitePct` | *A spark kept close to the heart.* | Brewmaster |
| 26 | **The Penitent's Chain** | onyx_amulet (24) | `all_attributes` 12, `u_mana_cost_reduction` 15 **NEW**→`manaCostReduction`, `u_guard_duration` 25 **NEW**→`guardDuration` | *Wear your sins; they make you strong.* | Warden / Wanderer |

### Rings
| # | Name | Base (lvl) | Mods | Flavour | Fits |
|---|---|---|---|---|---|
| 27 | **Barnacle Band** | iron_ring (1) | `flat_armour` 25, `life_regen` 2, `cold_res` 15 | *It clung on. So will you.* | any early |
| 28 | **Whisperwind Loop** | topaz_ring (8) | `added_light` 1–12, `intelligence` 15, `u_light_crit` 30 **NEW**→`lightCrit` | *A voice in the static.* | Mage / Nightblade |
| 29 | **The Ruby Covenant** | ruby_ring (8) | `flat_life` 30, `u_low_life_damage` 30 **NEW**→`lowLifeDamage`, `u_blood_pact` 1 **NEW**→`bloodPact` (skills cost life) | *Signed in the only ink that matters.* | Reaver (build-around) |
| 30 | **Twinned Fate** | diamond_ring (24) | `dexterity` 20, `crit_multi` 30, `u_crit_leech` 2 **NEW**→`critLeech` | *Two paths, one ending.* | Nightblade / Ranger |

---

## 4. Implementation checklist

- [ ] `ClassId` union + 5 entries in `CLASSES`; hybrid start nodes in `passiveTree.ts`.
- [ ] 15 actives + 5 signatures in `gems.ts`. New effect fields: `convert` (Judgement Hammer), enemy `debuff` (Withering Hex), `flaskCharge` (Quaff).
- [ ] 20 unique-only affixes (`u_*`) in `affixes.ts` — all map to existing stat keys. Confirm each stat is actually read by `combat.ts` / `stats.ts` (several were added for passives).
- [ ] 30 entries in `UNIQUES`; icons in `assets.ts` / `artManifest.ts`.
- [ ] Gemcutting can already roll per-attribute gems, so the new actives drop into the existing str/dex/int pools.

# New Uniques (30)

Goes with [CLASSES.md](CLASSES.md) and [NEW_SKILLS.md](NEW_SKILLS.md). Built on the bases now in
`data/bases.ts` (weapon families, hybrid armour, ES) and the class-mechanic stat keys in `STAT_KEYS`.
These are **added to** the existing 8 uniques (38 total).

**Status (2026-10-24):** implemented in `data/bases.ts` (`UNIQUES`), `data/affixes.ts` (`U(...)` unique-only
affixes) and zone drop lists in `data/zones.ts`, **including the ★ skill tweaks**. Last Breath, The Old Grudge
and Brawler's Buckle (lvl 26+) have no zone yet, like Starforged Edge; they wait for Act 2.
- The ★ "skill modifier" mods are stat keys that only one skill reads (`pummelHits`, `barrageArrows`,
  `parryBlocks`, `hammerConvert`, `meditateEs`, `infernalSpread`), each with a `u_*` affix.
- Every class-mechanic stat on these uniques is now read by `combat.ts` / `mechanics.ts`. `coupAilment`
  (Needleworker's Wraps) was the one that did nothing; Coup de Grâce now poisons (30%/s, 4s) and ignites (40%/s, 3s).
- Item tooltips grey out mechanic mods on other classes ("Rage — Warrior only"), using `STAT_MECHANIC` in `mechanics.ts`.

**Rules used**
- All low level: highest is 32 (bases top out at 34), most are 1–24.
- **Slots:** weapon 6 · offhand 3 · helmet 3 · body 3 · gloves 3 · boots 3 · belt 3 · amulet 3 · ring 3.
  Weapons get 3 extra because there are 8 weapon families to cover.
- **Classes:** 4 each for Warrior, Ranger, Mage, Templar, Shadow; 5 for Duelist; 5 generic (good for anyone, incl. Exile).
- Every unique is wearable by anyone. Each has normal stats plus **one hook**: a class mechanic knob
  or a new-skill tweak. Mechanic stats do nothing on other classes — the tooltip should grey them out
  (e.g. "Rage — Warrior only").
- 3–4 mods each, matching the existing uniques.

**Mod key:** existing affixes are written by id (`flat_life 40`). New unique-only affixes are
written as the stat they set (`→ rageMax +5`); all of those stats already exist except the
**skill tweaks** (marked ★), which need a small new "skill modifier" mod type.

---

## Overview

| # | Unique | Slot | Base (lvl) | For | Hook |
|---|---|---|---|---|---|
| 1 | Tavern Brawler | Weapon | Oak Club (1) | Warrior | ★ Pummel hits 4 times |
| 2 | Thornquill | Weapon | Ash Longbow (16) | Ranger | ★ Barrage +1 arrow, +4 max Momentum |
| 3 | Wellspring | Weapon | Gnarled Staff (4) | Mage | Mana counts as full above 90% |
| 4 | Rebuttal | Weapon | Iron Blade (8) | Duelist | ★ Parry blocks 3 hits, stronger Ripostes |
| 5 | The Ninth Psalm | Weapon | Crystal Sceptre (24) | Templar | ★ Judgement Hammer is all lightning |
| 6 | Last Breath | Weapon | Shadow Kris (28) | Shadow | Smaller Malice meter, bigger Coup |
| 7 | The Second Guess | Offhand | Goathide Buckler (8) | Duelist | Block chance, Ripostes heal |
| 8 | Bellwether | Offhand | Iron Kite Shield (16) | Templar | Faster Fervor |
| 9 | The Old Grudge | Offhand | Mithril Tower Shield (32) | Warrior | Rage on being hit, regen per Rage |
| 10 | Castaway's Kerchief | Helmet | Linen Hood (1) | Generic | All attributes, rarity |
| 11 | Lookout's Hood | Helmet | Hunter Hood (16) | Ranger | Keep Momentum when hit |
| 12 | Mask of the Patient | Helmet | Duskweave Cowl (24) | Shadow | Less crit, Malice when hit |
| 13 | Stormhide | Body | Studded Brigandine (8) | Duelist | Ripostes always bleed |
| 14 | Robe of Still Waters | Body | Silken Vestment (16) | Mage | ★ Meditate also restores ES |
| 15 | Penitent's Plate | Body | Templar Plate (24) | Templar | Nova restores ES |
| 16 | Quickfingers | Gloves | Rawhide Gloves (1) | Ranger | Stronger Momentum |
| 17 | Needleworker's Wraps | Gloves | Wayfarer's Wraps (12) | Shadow | Coup poisons and ignites |
| 18 | Knuckledusters | Gloves | Steel Gauntlets (20) | Warrior | Stronger Rage |
| 19 | Slippers of the Tide | Boots | Wool Shoes (1) | Mage | Mana is Power +5% |
| 20 | Sidestep | Boots | Studded Boots (12) | Duelist | Riposte crits |
| 21 | Windchaser | Boots | Shagreen Boots (20) | Ranger | +3 max Momentum, evasion per Momentum |
| 22 | Fisherman's Knot | Belt | Chain Belt (1) | Generic | Flask charges, rarity |
| 23 | Herbalist's Sash | Belt | Leather Belt (12) | Generic | Flask recovery, skilling |
| 24 | Brawler's Buckle | Belt | Heavy Belt (26) | Warrior | Slower Rage decay |
| 25 | Ember of Faith | Amulet | Amber Amulet (10) | Templar | ★ Infernal Blow ignites spread; nova heals more |
| 26 | Gull's Eye | Amulet | Jade Amulet (10) | Generic | Accuracy, crit, rarity |
| 27 | The Hollow Locket | Amulet | Onyx Amulet (24) | Shadow | Crits keep some Malice |
| 28 | Barnacle Band | Ring | Iron Ring (1) | Generic | Early armour + regen |
| 29 | Brimming Band | Ring | Sapphire Ring (8) | Mage | Mana is Power +5%, mana regen |
| 30 | Twin Oaths | Ring | Diamond Ring (24) | Duelist | Faster, stronger Ripostes |

---

## Weapons

**1. Tavern Brawler** — Oak Club (Mace, lvl 1) · *Warrior*
- `added_phys` 3–7
- `attack_speed` 8
- `→ rageMax` +5
- ★ Pummel strikes 4 times instead of 3
> *Last one standing buys the round.*

**2. Thornquill** — Ash Longbow (Bow, lvl 16) · *Ranger*
- `added_phys` 6–15
- `attack_speed` 12
- `→ momentumMax` +4
- ★ Barrage fires 1 additional arrow
> *Plucked from something that didn't want to give it up.*

**3. Wellspring** — Gnarled Staff (Staff, lvl 4) · *Mage*
- `flat_mana` 40
- `mana_regen` 40
- `→ manaPowerFull` 10 (mana above 90% counts as full)
> *Draw deep; the well remembers.*

**4. Rebuttal** — Iron Blade (Sword, lvl 8) · *Duelist*
- `added_phys` 4–9
- `→ ripostePct` 40
- `→ riposteCooldown` 25
- ★ Parry blocks 3 hits instead of 2
> *Every argument has an answer.*

**5. The Ninth Psalm** — Crystal Sceptre (Sceptre, lvl 24) · *Templar*
- `added_light` 4–22
- `→ novaPct` 50
- `→ fervorPct` 20
- ★ Judgement Hammer converts 100% of physical to lightning (instead of 40%)
> *The eight before it were mercy.*

**6. Last Breath** — Shadow Kris (Dagger, lvl 28) · *Shadow*
- `added_phys` 8–20
- `→ maliceMax` −3 (meter of 12)
- `→ coupPct` 60
> *Spend it wisely.*

## Offhands

**7. The Second Guess** — Goathide Buckler (lvl 8) · *Duelist*
- `inc_evasion` 40
- `→ blockChance` 8
- `→ riposteHeal` 2 (Ripostes restore 2% of life)
> *Doubt is a shield, if you hold it right.*

**8. Bellwether** — Iron Kite Shield (lvl 16) · *Templar*
- `flat_life` 50
- `all_res` 10
- `→ blockChance` 8
- `→ fervorPct` 25
> *It rings before the storm, and after.*

**9. The Old Grudge** — Mithril Tower Shield (lvl 32) · *Warrior*
- `u_armour_more` 25
- `flat_life` 70
- `→ rageOnHitTaken` 2
- `→ rageRegen` 0.1 (≈ 2% life/s at full Rage)
> *Forgive nothing. Forget nothing.*

## Helmets

**10. Castaway's Kerchief** — Linen Hood (lvl 1) · *Generic*
- `all_attributes` 8
- `item_rarity` 15
- `life_regen` 2
> *All you came ashore with.*

**11. Lookout's Hood** — Hunter Hood (lvl 16) · *Ranger*
- `flat_life` 40
- `accuracy` 120
- `light_res` 25
- `→ momentumRetain` 30 (hits remove 30% less Momentum)
> *First to see it, first to move.*

**12. Mask of the Patient** — Duskweave Cowl (lvl 24) · *Shadow*
- `→ energyShieldPct` 40
- `inc_evasion` 40
- `→ critChancePct` −50
- `→ maliceOnHitTaken` 2
> *It does not blink. It waits.*

Deliberately pushes the low-crit Malice path: fewer crits = the meter fills more often.

## Body Armour

**13. Stormhide** — Studded Brigandine (lvl 8) · *Duelist*
- `flat_life` 35
- `inc_armour` 40
- `inc_evasion` 40
- `→ riposteBleed` (Ripostes always cause Bleeding)
> *Tanned from something that bit back.*

Pairs with axes (bleed implicit) and Lacerate.

**14. Robe of Still Waters** — Silken Vestment (lvl 16) · *Mage*
- `→ energyShieldPct` 50
- `mana_regen` 30
- `→ esRechargePct` 30
- ★ Meditate also restores 20% of Energy Shield
> *Calm water runs the deepest.*

**15. Penitent's Plate** — Templar Plate (lvl 24) · *Templar*
- `flat_life` 50
- `→ energyShieldPct` 40
- `all_res` 12
- `→ novaEs` 10 (holy nova restores 10% ES)
> *Every dent a confession.*

## Gloves

**16. Quickfingers** — Rawhide Gloves (lvl 1) · *Ranger*
- `added_phys` 1–4
- `attack_speed` 10
- `dexterity` 10
- `→ momentumEffect` 20
> *Faster than the eye, faster than the knife.*

**17. Needleworker's Wraps** — Wayfarer's Wraps (lvl 12) · *Shadow*
- `→ castSpeedPct` 10
- `→ poisonPct` 20
- `→ coupAilment` (Coup de Grâce also Poisons and Ignites)
> *A thousand stitches, one cut.*

**18. Knuckledusters** — Steel Gauntlets (lvl 20) · *Warrior*
- `flat_armour` 60
- `attack_speed` 10
- `→ rageEffect` 25
> *The knuckles do the talking.*

## Boots

**19. Slippers of the Tide** — Wool Shoes (lvl 1) · *Mage*
- `flat_mana` 25
- `→ energyShieldPct` 30
- `cold_res` 20
- `→ manaPower` 5 (Mana is Power up to 35%)
> *Soft steps, full tides.*

**20. Sidestep** — Studded Boots (lvl 12) · *Duelist*
- `flat_life` 30
- `inc_evasion` 40
- `→ blockChance` 5
- `→ riposteCrit` 50
> *Not there. Then right there.*

**21. Windchaser** — Shagreen Boots (lvl 20) · *Ranger*
- `inc_evasion` 60
- `light_res` 30
- `→ momentumMax` +3
- `→ momentumEvasion` 3 (3% increased evasion per Momentum)
> *The wind doesn't stop to fight.*

## Belts

**22. Fisherman's Knot** — Chain Belt (lvl 1) · *Generic*
- `flat_life` 15
- `flask_charges` 25
- `item_rarity` 10
> *Tied tight against the tide.*

**23. Herbalist's Sash** — Leather Belt (lvl 12) · *Generic (skilling)*
- `→ lifeFlaskRecovery` 30
- `skill_speed` 10
- `skill_xp` 10
> *Pockets full of tomorrow's cures.*

**24. Brawler's Buckle** — Heavy Belt (lvl 26) · *Warrior*
- `flat_life` 60
- `strength` 20
- `→ rageDecay` 50 (Rage decays 50% slower between packs)
> *Still swinging at closing time.*

## Amulets

**25. Ember of Faith** — Amber Amulet (lvl 10) · *Templar*
- `added_fire` 3–7
- `fire_res` 25
- `→ novaHeal` 30
- ★ Infernal Blow's ignites spread to 1 other enemy
> *A spark kept close to the heart.*

**26. Gull's Eye** — Jade Amulet (lvl 10) · *Generic*
- `accuracy` 80
- `crit_chance` 20
- `item_rarity` 15
> *It sees the glint from miles away.*

**27. The Hollow Locket** — Onyx Amulet (lvl 24) · *Shadow*
- `crit_multi` 25
- `dexterity` 15
- `→ maliceCritKeep` 5 (crits leave 5 Malice instead of emptying it)
> *Something was kept in here. Something hungry.*

The high-crit Shadow's answer: crits no longer fully reset the meter.

## Rings

**28. Barnacle Band** — Iron Ring (lvl 1) · *Generic*
- `flat_armour` 25
- `life_regen` 2
- `cold_res` 15
> *It clung on. So will you.*

**29. Brimming Band** — Sapphire Ring (lvl 8) · *Mage*
- `flat_mana` 30
- `mana_regen` 25
- `→ manaPower` 5
> *Full to the brim, never spilling.*

**30. Twin Oaths** — Diamond Ring (lvl 24) · *Duelist*
- `dexterity` 15
- `→ ripostePct` 25
- `→ riposteCooldown` 30
> *Sworn twice, broken never.*

---

## Build-arounds this creates

- **Warrior "never stops"** — Tavern Brawler + Knuckledusters + Brawler's Buckle: Pummel at 4 hits, Rage barely decays.
- **Ranger "untouchable volley"** — Thornquill + Windchaser + Lookout's Hood: 17 max Momentum, huge evasion, keeps it when hit.
- **Mage "full tank"** — Wellspring + Brimming Band + Slippers: Mana is Power at 40% and "full" at 90%.
- **Duelist "bleeding counter"** — Stormhide + an axe + Twin Oaths: fast Ripostes that always bleed.
- **Templar "storm saint"** — Ninth Psalm + Bellwether + Penitent's Plate: all-lightning hammer, frequent nova that refills ES.
- **Shadow, two ways** — *patient*: Mask of the Patient + Last Breath (rare crits, 12-meter Coup); *gambler*: Hollow Locket + crit gear.

## Engine work

- ~25 unique-only affixes in `affixes.ts`, all pointing at existing stat keys (`rageMax`, `ripostePct`,
  `momentumMax`, `maliceMax`, `manaPower`, `fervorPct`, `energyShieldPct`, `blockChance`, …).
- New **skill-modifier** mod type for the 6 ★ mods (Pummel hits, Barrage arrows, Parry blocks,
  Judgement Hammer conversion, Meditate ES, Infernal Blow spread). Depends on those skills existing.
- Tooltip: grey out mechanic stats when the wearer's class doesn't have that mechanic.
- 30 entries in `UNIQUES`; icons in `assets.ts` / `artManifest.ts`.

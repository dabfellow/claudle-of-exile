# Skills and uniques

**Design reset (2026-10-30):** new skills and supports now arrive in themed batches, one per act, instead of by level.
Build-defining uniques are planned for the long tail.

## Act batches

**Status (2026-10-31): built.** Each gem belongs to an act (`GEM_ACTS` in `data/gems.ts`; a signature follows its skill).
It can't drop, be cut or be sold until the character has an area open in that act, and character level still applies on
top. The act only decides what can turn up: nothing about a gem you own checks it, so old characters keep everything and
no save migration was needed. The Gem shop stocks your furthest act's gems at 3× weight and restocks when you reach a new act.

| Act | Skills | Supports |
|---|---|---|
| 1 | Everything up to level 12 | Everything up to level 18, plus those skills' signatures |
| 2 | Riders and raiders (below), plus Judgement Hammer, Backstab and Glacial Lance | Below, plus those three skills' signatures |
| 3 | Lacerate (level 35) | Hemorrhage |

### Act 2: Riders and raiders

Movement skills step out of Scorched earth: a skill with `stepOut` removes every hazard under you, because the player
stays put on the field. They have a cooldown, so they default to Whenever ready.

| Skill | Attr | Role | Lvl | Does | Signature (lvl +6) |
|---|---|---|---|---|---|
| Cavalry Charge | str | area | 20 | 135% down the line, any range, drags the target to melee, 7s | Run Down: stuns the line |
| Raiding Leap | dex | main | 20 | 170% at any range, drags the target to melee, 6s | Hit and Fade: evade 1.5s |
| Parting Shot | dex (bow) | burst | 20 | 130%, shoves melee back a ring, 6s | Feigned Retreat: next attack 40% more |
| Ember Dash | int | area | 20 | 16–26 fire down the line, leaves it burning, instant, 7s | Ember Trail: double burn |
| Tailwind | dex | buff | 22 | 8s: attack speed, evasion, movement; hazards under you burn out twice as fast | Gale Rider: 25% cooldown recovery |
| Arcane Surge | int | buff | 22 | 8s: 30% spell damage, 15% cast speed | Overflow: 25% less mana cost |
| Vulnerability | str | curse | 24 | 30% increased physical damage taken | Cracked Hide: breaks armour too |
| Hobble | dex | curse | 24 | 25% slower attacks, wind-ups and walking | Snare: stops them dead briefly |
| Elemental Weakness | int | curse | 26 | 30 less of every elemental resistance | Contagion: jumps on death |
| Enfeeble | int | curse | 26 | Hits deal 25% less | Wither Will: kills heal 4% life |

**Curses** are instant, last 8s on a 10s cooldown and land on the target and its neighbours. An enemy carries one, a new
one replaces the old, bosses take half the effect, and gem level adds 2% effect per level. Rules can read them through the
Status rule **Curse** and the free **When its effect is not active**.

**General supports:** Surefoot (22, ground does nothing for 3s after you move), Fresh Horses (24, 25% shorter cooldown),
Trample (24, 30% more damage), Wide Hex (26, curse lands on the whole field), Deep Hex (28, 30% more curse effect).

## New Skills — built around the class mechanics

Goes with [CLASSES.md](CLASSES.md). Gems stay **shared**: nothing here is class-locked and no skill
text mentions a class mechanic. Each skill does something generically useful that one mechanic
happens to love — so a Warrior *can* run Frost Needle, it just won't fill Rage like Pummel does.

**Status (2026-10-24): built.** All 15 actives and signatures are in `data/gems.ts`, with the effects in
`engine/combat.ts` and tests in `tests/newskills.test.ts`. Where the build differs from the text below:
- **Clarity** lowers the mana cost of *every* skill for 4s (it reuses `manaCostReduction`), not only spells.
- **Permafrost** freezes bosses for 0.6s instead of 1.5s, like stuns are shorter on bosses.
- **Chill** now always slows monster attacks by 15% (plus any `chillOnHit` from passives, capped at 60%).
  Before this, chill only slowed attacks if you had `chillOnHit`, so chilled ground did nothing to attack speed.
- **Momentum** counts attack hits (each enemy struck), like Rage. Twin Strike still gives 2.
- **Gem icons** come from asset packs; gems without one show their initials.

**15 new actives, 5 per attribute** (the pool goes from 4 → 9 per attribute), each with a
signature support, matching the existing pattern. Numbers are at gem level 1, in the current
`ActiveGemDef` format (`timeMs` = attack time for attacks, cast time for spells).

Reference points: Heavy Strike 185% / 3900ms · Twin Strike 2×62% / 2700ms · Ground Slam 95% all / 3600ms ·
Spark 4–16 light, 2 chains / 2400ms · Fireball 12–20 fire + ignite / 3600ms, 4s CD.

#### One engine rule the mechanics need

**Rage, Momentum and Malice count hits, not uses.** A 3-hit skill gives 3 Rage / 3 Momentum / 3 Malice.
That's what makes the multi-hit skills below the "fillers" for those mechanics.

---

### Overview

| Skill | Attr | Role | Built for | Why anyone else takes it |
|---|---|---|---|---|
| Pummel | str | main | Rage | Steady single-target melee |
| Berserk | str | buff | Rage | Big attack-speed steroid for bosses |
| Parry | str | guard | Riposte | Cheapest, fastest guard in the game |
| Judgement Hammer | str | main | Martyr | Str attack that scales lightning |
| Infernal Blow | str | main | Martyr / Templar | Str's first fire attack, ignites |
| Barrage | dex | main | Momentum | Fast multi-hit projectile attack |
| Rain of Arrows | dex | area | Momentum | Dex's first pack-clear attack |
| Feint | dex | main | Riposte | Attack that buffs your evasion |
| Backstab | dex | burst | Malice | Huge hit vs. ailing enemies |
| Ice Shot | dex | main | Shadow (cold attack) | Dex's first cold attack, chills |
| Glacial Lance | int | burst | Mana is Power | Biggest single spell hit |
| Meditate | int | sustain | Mana is Power | Fixes mana for any caster |
| Shock Nova | int | area | Mage | Int's first true area spell |
| Consecrate | int | sustain | Martyr | Area damage + regen while you tank |
| Frost Needle | int | main | Malice | Fast 3-hit spell |

---

### Strength

#### Pummel — *Rage*
| | |
|---|---|
| Role / tags | main · attack, melee |
| Cost / CD / time | 5 mana · 0 · 3300ms |
| Effect | `weaponPct` 50, `hits` 3, single |
| Default rule | always |
| Desc | Three quick blows to the same target. |

3 hits per use = 3 Rage. Total 150% per use, a touch below Heavy Strike's raw damage — it pays you back in Rage.
**Signature — Tenderise:** each hit on the same target deals 10% more than the last (resets on a new target).

#### Berserk — *Rage*
| | |
|---|---|
| Role / tags | buff · buff, duration |
| Cost / CD / time | 10 mana · 12s · 600ms |
| Effect | 6s buff: `attackSpeedPct` 30, lose 1% of max life per second |
| Default rule | bossOnly |
| Desc | Fight faster and bleed for it. |

More attacks = Rage fills twice as fast on a boss. The life drain is the price.
**Signature — Blood Frenzy:** kills during Berserk extend it by 1s (max 12s).

#### Parry — *Riposte*
| | |
|---|---|
| Role / tags | guard · guard, duration |
| Cost / CD / time | 6 mana · 6s · 600ms |
| Effect | `blocks` 2 within 3s |
| Default rule | enemyCasting |
| Desc | Turn aside the next two hits. |

Shorter cooldown and more blocks than Iron Guard, but no Armour buff. Two blocks = two Ripostes.
**Signature — Counterweight:** each blocked hit grants 15% more damage on your next attack (stacks to 30%).

#### Judgement Hammer — *Martyr*
| | |
|---|---|
| Role / tags | main · attack, melee |
| Cost / CD / time | 6 mana · 0 · 3900ms |
| Effect | `weaponPct` 150, single, `stunChance` 0.2, 40% of physical converted to lightning (**NEW** `convert`) |
| Default rule | always |
| Desc | A crushing blow that crackles with storm. |

Lightning stats now scale both your hammer and the Martyr nova (which deals lightning).
**Signature — Verdict:** hits on stunned enemies arc to 2 other enemies for 50% damage.

#### Infernal Blow — *Templar / any fire build*
| | |
|---|---|
| Role / tags | main · attack, melee, dot, duration |
| Cost / CD / time | 6 mana · 0 · 3600ms |
| Effect | `weaponPct` 120, single, ignite 25%/s for 3s |
| Default rule | always |
| Desc | A burning strike that sets the target alight. |

Fills the gap of "Str has no elemental attack." Pairs with Added Fire and the Zealot cluster.
**Signature — Pyre:** when an ignited enemy dies, it explodes for 10% of its max life as fire to the pack.

---

### Dexterity

#### Barrage — *Momentum*
| | |
|---|---|
| Role / tags | main · attack, projectile |
| Cost / CD / time | 5 mana · 0 · 2700ms |
| Effect | `weaponPct` 30, `hits` 4, single |
| Default rule | always |
| Desc | Loose a rapid volley at one target. |

4 hits per use = 4 Momentum. 120% total, in line with Twin Strike. Best with bows when weapon families land.
**Signature — Volley Fire:** adds a 5th projectile; the last projectile of each volley is a guaranteed hit.

#### Rain of Arrows — *Momentum*
| | |
|---|---|
| Role / tags | area · attack, projectile, area |
| Cost / CD / time | 8 mana · 0 · 3300ms |
| Effect | `weaponPct` 70, all |
| Default rule | enemiesAtLeast 3 |
| Desc | Arrows fall across the whole pack. |

Dex's first pack-clear. Each enemy struck counts as a hit — a 5-pack is 5 Momentum.
**Signature — Hailstorm:** 30% chance to rain a second volley.

#### Feint — *Riposte*
| | |
|---|---|
| Role / tags | main · attack, melee, duration |
| Cost / CD / time | 5 mana · 0 · 2400ms |
| Effect | `weaponPct` 90, single; 3s buff `evasionPct` 40 |
| Default rule | always |
| Desc | A false strike that leaves you hard to hit. |

Low damage, permanent evasion while it's your main skill = more evades = more Ripostes.
**Signature — Misdirection:** after you evade a hit, your next Feint deals 100% more damage.

#### Backstab — *Malice*
| | |
|---|---|
| Role / tags | burst · attack, melee |
| Cost / CD / time | 10 mana · 5s · 3000ms |
| Effect | `weaponPct` 240, single; 50% more damage against enemies with an ailment (**NEW** `moreVsAiling`) |
| Default rule | targetLifeAbove 30 |
| Desc | A brutal strike, deadliest on a weakened foe. |

The skill a Shadow saves for a full Malice meter (new "Only with Malice full" rule from CLASSES.md).
**Signature — Twist the Knife:** Backstab refreshes the duration of every ailment on the target.

#### Ice Shot — *Shadow / any cold build*
| | |
|---|---|
| Role / tags | main · attack, projectile |
| Cost / CD / time | 5 mana · 0 · 2700ms |
| Effect | `weaponPct` 100, single, 50% of physical converted to cold (**NEW** `convert`), chills |
| Default rule | always |
| Desc | A frozen arrow that chills the target. |

Fills "Dex has no elemental attack." Chill counts as an ailment for Backstab.
**Signature — Splinter:** chilled enemies hit by Ice Shot shatter shards into 2 others for 40% damage.

---

### Intelligence

#### Glacial Lance — *Mana is Power*
| | |
|---|---|
| Role / tags | burst · spell, projectile |
| Cost / CD / time | 22 mana · 3s · 3600ms |
| Effect | `base` [24, 38] cold, single, `crit` 6, chills |
| Default rule | manaAbove 80 |
| Desc | A spear of ice. Expensive, devastating. |

Huge cost by design: at full mana a Mage gets the full 30% on the biggest hit in the pool, then has to rebuild.
**Signature — Permafrost:** if the target is already chilled, it's frozen for 1.5s.

#### Meditate — *Mana is Power*
| | |
|---|---|
| Role / tags | sustain · spell, sustain |
| Cost / CD / time | 0 mana · 15s · 1500ms |
| Effect | restore 30% of max mana (**NEW** `restoreManaPct`) |
| Default rule | manaBelow 30 (**NEW** `RuleCondition`) |
| Desc | Still the mind; refill the well. |

Any caster's mana fix; for a Mage it's also a damage button (refilling mana refills the bonus).
**Signature — Clarity:** for 4s after Meditate, spells cost 30% less mana.

#### Shock Nova — *Mage*
| | |
|---|---|
| Role / tags | area · spell, area |
| Cost / CD / time | 9 mana · 0 · 3000ms |
| Effect | `base` [5, 11] lightning, all, `crit` 5 |
| Default rule | enemiesAtLeast 3 |
| Desc | A burst of lightning around you. |

Int currently has no true area spell (Spark chains, Fireball's area is a signature). Cheap enough to spam on packs.
**Signature — Static Field:** enemies hit take 10% increased lightning damage for 4s.

#### Consecrate — *Martyr*
| | |
|---|---|
| Role / tags | sustain · spell, area, duration |
| Cost / CD / time | 10 mana · 6s · 1500ms |
| Effect | `base` [5, 9] fire, all; 4s buff `lifeRegenPct` 2 |
| Default rule | lifeBelow 70 |
| Desc | Hallow the ground: burn the pack, mend yourself. |

Keeps a Templar standing while Fervor fills; any melee build can use it as sustain.
**Signature — Holy Ground:** the regen also restores 1% of max ES per second.

#### Frost Needle — *Malice*
| | |
|---|---|
| Role / tags | main · spell, projectile |
| Cost / CD / time | 5 mana · 0 · 2400ms |
| Effect | `base` [2, 5] cold, `hits` 3, single, `crit` 4 |
| Default rule | always |
| Desc | Three needles of ice in quick succession. |

Low base crit + 3 hits = the fastest Malice filler for a spell Shadow. Similar DPS to Spark on a single target.
**Signature — Shatterpoint:** crits with Frost Needle chill; hits against chilled enemies deal 15% more damage.

---

### Mechanic fit at a glance

| Mechanic | Fills / feeds it | Pays it off |
|---|---|---|
| Rage | Pummel, Barrage, Rain of Arrows (multi-hit) | Berserk (more attacks at full Rage) |
| Momentum | Barrage, Rain of Arrows, Feint (evasion) | — (it *is* the payoff) |
| Mana is Power | Meditate, Mana Leech | Glacial Lance, Fireball |
| Riposte | Parry, Feint, Smoke Step, Iron Guard | Counterweight signature |
| Martyr | Consecrate (survive), Judgement Hammer (lightning scaling) | the nova itself |
| Malice | Frost Needle, Pummel, Barrage (non-crit multi-hit) | Backstab, Glacial Lance |

### Engine work (new bits only)

- `convert` effect field — Judgement Hammer, Ice Shot (phys → element %).
- `moreVsAiling` effect field — Backstab.
- `restoreManaPct` effect field — Meditate.
- Chill as a skill effect (currently only the `chillOnHit` stat) — Ice Shot, Glacial Lance.
- `manaBelow` tactics rule — Meditate. (`maliceFull` rule is already listed in CLASSES.md.)
- Buffs that drain life (`lifeRegenPct` negative) — Berserk.
- Multi-hit skills count each hit for Rage / Momentum / Malice.
- 15 signature specials in `combat.ts`.
- Gem icons for 15 actives.


## New Uniques (30)

Goes with [CLASSES.md](CLASSES.md) and [SKILLS_AND_UNIQUES.md](SKILLS_AND_UNIQUES.md). Built on the bases now in
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

### Overview

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

### Weapons

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

### Offhands

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

### Helmets

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

### Body Armour

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

### Gloves

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

### Boots

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

### Belts

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

### Amulets

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

### Rings

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

### Build-arounds this creates

- **Warrior "never stops"** — Tavern Brawler + Knuckledusters + Brawler's Buckle: Pummel at 4 hits, Rage barely decays.
- **Ranger "untouchable volley"** — Thornquill + Windchaser + Lookout's Hood: 17 max Momentum, huge evasion, keeps it when hit.
- **Mage "full tank"** — Wellspring + Brimming Band + Slippers: Mana is Power at 40% and "full" at 90%.
- **Duelist "bleeding counter"** — Stormhide + an axe + Twin Oaths: fast Ripostes that always bleed.
- **Templar "storm saint"** — Ninth Psalm + Bellwether + Penitent's Plate: all-lightning hammer, frequent nova that refills ES.
- **Shadow, two ways** — *patient*: Mask of the Patient + Last Breath (rare crits, 12-meter Coup); *gambler*: Hollow Locket + crit gear.

### Engine work

- ~25 unique-only affixes in `affixes.ts`, all pointing at existing stat keys (`rageMax`, `ripostePct`,
  `momentumMax`, `maliceMax`, `manaPower`, `fervorPct`, `energyShieldPct`, `blockChance`, …).
- New **skill-modifier** mod type for the 6 ★ mods (Pummel hits, Barrage arrows, Parry blocks,
  Judgement Hammer conversion, Meditate ES, Infernal Blow spread). Depends on those skills existing.
- Tooltip: grey out mechanic stats when the wearer's class doesn't have that mechanic.
- 30 entries in `UNIQUES`; icons in `assets.ts` / `artManifest.ts`.

# New Skills — built around the class mechanics

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
- **Gem icons** are prompts in `ART_PROMPTS.md`; until they're drawn the gems show their initials.

**15 new actives, 5 per attribute** (the pool goes from 4 → 9 per attribute), each with a
signature support, matching the existing pattern. Numbers are at gem level 1, in the current
`ActiveGemDef` format (`timeMs` = attack time for attacks, cast time for spells).

Reference points: Heavy Strike 185% / 3900ms · Twin Strike 2×62% / 2700ms · Ground Slam 95% all / 3600ms ·
Spark 4–16 light, 2 chains / 2400ms · Fireball 12–20 fire + ignite / 3600ms, 4s CD.

### One engine rule the mechanics need

**Rage, Momentum and Malice count hits, not uses.** A 3-hit skill gives 3 Rage / 3 Momentum / 3 Malice.
That's what makes the multi-hit skills below the "fillers" for those mechanics.

---

## Overview

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

## Strength

### Pummel — *Rage*
| | |
|---|---|
| Role / tags | main · attack, melee |
| Cost / CD / time | 5 mana · 0 · 3300ms |
| Effect | `weaponPct` 50, `hits` 3, single |
| Default rule | always |
| Desc | Three quick blows to the same target. |

3 hits per use = 3 Rage. Total 150% per use, a touch below Heavy Strike's raw damage — it pays you back in Rage.
**Signature — Tenderise:** each hit on the same target deals 10% more than the last (resets on a new target).

### Berserk — *Rage*
| | |
|---|---|
| Role / tags | buff · buff, duration |
| Cost / CD / time | 10 mana · 12s · 600ms |
| Effect | 6s buff: `attackSpeedPct` 30, lose 1% of max life per second |
| Default rule | bossOnly |
| Desc | Fight faster and bleed for it. |

More attacks = Rage fills twice as fast on a boss. The life drain is the price.
**Signature — Blood Frenzy:** kills during Berserk extend it by 1s (max 12s).

### Parry — *Riposte*
| | |
|---|---|
| Role / tags | guard · guard, duration |
| Cost / CD / time | 6 mana · 6s · 600ms |
| Effect | `blocks` 2 within 3s |
| Default rule | enemyCasting |
| Desc | Turn aside the next two hits. |

Shorter cooldown and more blocks than Iron Guard, but no Armour buff. Two blocks = two Ripostes.
**Signature — Counterweight:** each blocked hit grants 15% more damage on your next attack (stacks to 30%).

### Judgement Hammer — *Martyr*
| | |
|---|---|
| Role / tags | main · attack, melee |
| Cost / CD / time | 6 mana · 0 · 3900ms |
| Effect | `weaponPct` 150, single, `stunChance` 0.2, 40% of physical converted to lightning (**NEW** `convert`) |
| Default rule | always |
| Desc | A crushing blow that crackles with storm. |

Lightning stats now scale both your hammer and the Martyr nova (which deals lightning).
**Signature — Verdict:** hits on stunned enemies arc to 2 other enemies for 50% damage.

### Infernal Blow — *Templar / any fire build*
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

## Dexterity

### Barrage — *Momentum*
| | |
|---|---|
| Role / tags | main · attack, projectile |
| Cost / CD / time | 5 mana · 0 · 2700ms |
| Effect | `weaponPct` 30, `hits` 4, single |
| Default rule | always |
| Desc | Loose a rapid volley at one target. |

4 hits per use = 4 Momentum. 120% total, in line with Twin Strike. Best with bows when weapon families land.
**Signature — Volley Fire:** adds a 5th projectile; the last projectile of each volley is a guaranteed hit.

### Rain of Arrows — *Momentum*
| | |
|---|---|
| Role / tags | area · attack, projectile, area |
| Cost / CD / time | 8 mana · 0 · 3300ms |
| Effect | `weaponPct` 70, all |
| Default rule | enemiesAtLeast 3 |
| Desc | Arrows fall across the whole pack. |

Dex's first pack-clear. Each enemy struck counts as a hit — a 5-pack is 5 Momentum.
**Signature — Hailstorm:** 30% chance to rain a second volley.

### Feint — *Riposte*
| | |
|---|---|
| Role / tags | main · attack, melee, duration |
| Cost / CD / time | 5 mana · 0 · 2400ms |
| Effect | `weaponPct` 90, single; 3s buff `evasionPct` 40 |
| Default rule | always |
| Desc | A false strike that leaves you hard to hit. |

Low damage, permanent evasion while it's your main skill = more evades = more Ripostes.
**Signature — Misdirection:** after you evade a hit, your next Feint deals 100% more damage.

### Backstab — *Malice*
| | |
|---|---|
| Role / tags | burst · attack, melee |
| Cost / CD / time | 10 mana · 5s · 3000ms |
| Effect | `weaponPct` 240, single; 50% more damage against enemies with an ailment (**NEW** `moreVsAiling`) |
| Default rule | targetLifeAbove 30 |
| Desc | A brutal strike, deadliest on a weakened foe. |

The skill a Shadow saves for a full Malice meter (new "Only with Malice full" rule from CLASSES.md).
**Signature — Twist the Knife:** Backstab refreshes the duration of every ailment on the target.

### Ice Shot — *Shadow / any cold build*
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

## Intelligence

### Glacial Lance — *Mana is Power*
| | |
|---|---|
| Role / tags | burst · spell, projectile |
| Cost / CD / time | 22 mana · 3s · 3600ms |
| Effect | `base` [24, 38] cold, single, `crit` 6, chills |
| Default rule | manaAbove 80 |
| Desc | A spear of ice. Expensive, devastating. |

Huge cost by design: at full mana a Mage gets the full 30% on the biggest hit in the pool, then has to rebuild.
**Signature — Permafrost:** if the target is already chilled, it's frozen for 1.5s.

### Meditate — *Mana is Power*
| | |
|---|---|
| Role / tags | sustain · spell, sustain |
| Cost / CD / time | 0 mana · 15s · 1500ms |
| Effect | restore 30% of max mana (**NEW** `restoreManaPct`) |
| Default rule | manaBelow 30 (**NEW** `RuleCondition`) |
| Desc | Still the mind; refill the well. |

Any caster's mana fix; for a Mage it's also a damage button (refilling mana refills the bonus).
**Signature — Clarity:** for 4s after Meditate, spells cost 30% less mana.

### Shock Nova — *Mage*
| | |
|---|---|
| Role / tags | area · spell, area |
| Cost / CD / time | 9 mana · 0 · 3000ms |
| Effect | `base` [5, 11] lightning, all, `crit` 5 |
| Default rule | enemiesAtLeast 3 |
| Desc | A burst of lightning around you. |

Int currently has no true area spell (Spark chains, Fireball's area is a signature). Cheap enough to spam on packs.
**Signature — Static Field:** enemies hit take 10% increased lightning damage for 4s.

### Consecrate — *Martyr*
| | |
|---|---|
| Role / tags | sustain · spell, area, duration |
| Cost / CD / time | 10 mana · 6s · 1500ms |
| Effect | `base` [5, 9] fire, all; 4s buff `lifeRegenPct` 2 |
| Default rule | lifeBelow 70 |
| Desc | Hallow the ground: burn the pack, mend yourself. |

Keeps a Templar standing while Fervor fills; any melee build can use it as sustain.
**Signature — Holy Ground:** the regen also restores 1% of max ES per second.

### Frost Needle — *Malice*
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

## Mechanic fit at a glance

| Mechanic | Fills / feeds it | Pays it off |
|---|---|---|
| Rage | Pummel, Barrage, Rain of Arrows (multi-hit) | Berserk (more attacks at full Rage) |
| Momentum | Barrage, Rain of Arrows, Feint (evasion) | — (it *is* the payoff) |
| Mana is Power | Meditate, Mana Leech | Glacial Lance, Fireball |
| Riposte | Parry, Feint, Smoke Step, Iron Guard | Counterweight signature |
| Martyr | Consecrate (survive), Judgement Hammer (lightning scaling) | the nova itself |
| Malice | Frost Needle, Pummel, Barrage (non-crit multi-hit) | Backstab, Glacial Lance |

## Engine work (new bits only)

- `convert` effect field — Judgement Hammer, Ice Shot (phys → element %).
- `moreVsAiling` effect field — Backstab.
- `restoreManaPct` effect field — Meditate.
- Chill as a skill effect (currently only the `chillOnHit` stat) — Ice Shot, Glacial Lance.
- `manaBelow` tactics rule — Meditate. (`maliceFull` rule is already listed in CLASSES.md.)
- Buffs that drain life (`lifeRegenPct` negative) — Berserk.
- Multi-hit skills count each hit for Rage / Momentum / Malice.
- 15 signature specials in `combat.ts`.
- Gem icons for 15 actives.

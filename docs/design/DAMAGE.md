# How damage works

What the code does today. Sources: `rollHit` and `hitMonster` in `src/engine/combat.ts`, `deriveStats` in
`src/engine/stats.ts`, and `skillSummary` in `src/engine/gems.ts`.

## An attack

1. **Base damage:** weapon physical plus flat physical, and flat fire, cold and lightning from anywhere. Dual wielding
   averages the two weapons.
2. **Increased, by type:** physical gets % physical and Strength; each element gets % elemental, its own % and
   Intelligence.
3. **The gem:** multiply by the skill's weapon damage %, which grows 6% of its base per gem level.
4. **Conversion:** moved physical stops using % physical and uses the new type's increases.
5. **Skill type:** % melee (physical only), % projectile.
6. **More multipliers:** supports, buffs, Rage and the rest, each multiplying separately.
7. **Crit:** chance is the weapon's base crit × (1 + % crit), multiplier 150% plus bonuses. Crits multiply the whole hit.
8. **Accuracy:** attacks can miss, 60–95%.
9. **The monster:** its resistance cuts each element; physical isn't reduced. Vulnerabilities apply last.

The result is `dealt`, the number on screen.

Attack speed sets how often this happens. Only the main hand's speed counts, and each skill has its own base time.

## A spell

The weapon's physical damage, attack speed and crit do **nothing** for a spell. Spell damage is:

- the gem's own base damage, which grows 16% per level, × the increases for its type
- plus flat elemental damage from gear at 70%
- plus "Adds X to Y to Spells" at 100%
- × % spell damage, supports and buffs
- × 1.2 with a wand, staff, dagger or sceptre

Crit comes from the gem's own base crit, with % crit and % spell crit.

## Damage over time

**Fire burns, cold chills, lightning shocks, chaos poisons.** Bleed and poison work from the finished hit, as below.
Burn, chill and shock work from only their own damage type, after resistance.

### Chance

Every hit rolls for each element in it. The chance is 0 unless something raises it, and 100 means every hit. It's the
skill's `ailmentChance` plus gear (`burnChance`, `chillChance`, `shockChance`). Most fire, cold and lightning skills have
25%. Fireball and Infernal Blow always burn, chilling skills always chill, and Static Field and Charged Air always
shock. Having a "Cold hits slow" stat always chills too.

### Buildup

A landed ailment adds its damage to that target's buildup, against a **threshold of 40% of the target's maximum life**,
so big enemies take far longer. Buildup fades by 10% of the threshold per second.

| | When it lands | At the threshold |
|---|---|---|
| **Burn** | Burns for 25% of the fire damage over 4 s; burns pool into one | **Ignite:** 50% of the buildup over 6 s, then buildup resets. Only the strongest ignite runs |
| **Chill** | Attacks 15% slower for 3 s, up to 60% with "Cold hits slow" | **Freeze:** 1.5 s (0.6 s on bosses), then buildup resets |
| **Shock** | Takes more of all damage for 4 s: 5% at no buildup, up to 40% at the threshold | No pop: it stays at 40%. Buildup only fades once shock ends |

Burn and Ignite share the same damage and duration stats. Permafrost and Black Ice still freeze an already-chilled target
straight away, as a shortcut.

### Poison and bleed

```
per second = dealt × skill's % per second × (1 + % this ailment + % all ailments)
```

- **Anything that makes the hit bigger makes these bigger**, whatever its type, including crits.
- **Poison** stacks. Poison Dart: 30%/s for 4 s; gear: 20%/s for 4 s. "Chance to Poison" works on any hit.
- **Bleed** doesn't stack: the strongest runs. 40–60%/s for 4 s from skills, 20%/s from "chance to Bleed".

## Chaos

Chaos is a fifth damage type, offence only for now. "Adds X to Y Chaos Damage to Attacks" and % chaos affixes roll on gear,
and Poison Dart converts half of its damage to chaos. Monsters have a chaos resistance, 0 unless they deal chaos. Nothing
deals chaos to you, so there's no player chaos resistance yet. Flat chaos doesn't add to spells.

## Comparing gear

Hovering over an item you aren't wearing compares it with what's in its slot (`src/engine/compare.ts`):

- **The two items:** weapon damage, attacks per second, base crit and weapon DPS, or armour, evasion, energy shield and
  block. The same numbers as the top of the tooltip, so they ignore your character.
- **Your skills:** each damage skill on your bar, per second, before and after. This is the line to trust on a weapon. It
  says when an item would stop a skill working. It uses `skillSummary`, so it counts an ailment, against an unresisted
  target of your level, and leaves out fight-only modifiers like Rage.
- **Your character:** totals that change. Armour and evasion also show what they do against monsters of your level.

There's deliberately no single score: how much armour is worth against energy shield depends on the build.

# Classes — Identity Rework

**Decided (2026-10-24):** 7 classes — 3 pure, 3 hybrid, 1 all-rounder. Identity comes from an
**exclusive class mechanic**; every gem, base and unique stays shared (PoE-style).
Energy Shield, weapon families and hybrid armour bases are being built separately — this doc
only says which of those each class leans on.

Every class is one chain:

**Attribute → Defence → Weapon lean → Mechanic → How it idles**

| Class | Attr | Defence | Weapon lean | Mechanic |
|---|---|---|---|---|
| Warrior | Str | Armour | Mace, Axe | **Rage** |
| Ranger | Dex | Evasion | Bow, Dagger | **Momentum** |
| Mage | Int | Energy Shield | Wand, Staff | **Arcane Charges** |
| Duelist | Str/Dex | Armour/Evasion | Sword, Axe | **Riposte** |
| Templar | Str/Int | Armour/ES | Sceptre, Mace | **Zeal** |
| Shadow | Dex/Int | Evasion/ES | Dagger, Wand | **Exploit** |
| Exile | All | Any | Any | **Versatility** |

---

## Design rules for mechanics

1. **It works while idling.** The mechanic must run off things combat already does (hits, casts,
   evades, mana spent, ailments) — no manual input needed. Tactics rules can make it better, not
   make it work.
2. **One sentence to explain.** If the tooltip needs two lines, cut it.
3. **Visible.** Each mechanic gets a small meter/pip row on the combat page next to life/mana.
4. **Bendable.** Each one has obvious knobs (max stacks, decay, effect per stack) so passives,
   keystones and uniques can twist it later ("Rage no longer decays", "Momentum isn't lost on block").
5. **Worth ~15–20% power at full** — enough to feel, not so much that off-class gear is a trap.

---

## Warrior — Rage
*"Outlast everything."* Start 20 / 12 / 10.

**Rage:** gain 1 Rage per hit you deal (max 20). Each Rage grants **1% more attack damage** and
**2% increased Armour**. Lose 2 Rage per second while no enemies are alive (between packs).

- Idles well: ramps every pack, best on long fights and bosses — exactly where Warrior should shine.
- Hooks: War Cry grants +10 Rage. Heavy Strike stuns at full Rage get +1s duration.
- Class bonus: +20 Life, +10% Armour (unchanged).
- Bend later: "Rage doesn't decay", "Rage also grants life regen", "max Rage +10, lose it all when hit by a slam".

## Ranger — Momentum
*"Strike first, never get hit."* Start 12 / 20 / 10.

**Momentum:** each attack grants 1 Momentum (max 10), **3% increased attack speed** each.
**Taking a hit halves it**; evaded hits don't count.

- Directly rewards Evasion — the defence and the damage feed each other.
- Hooks: Smoke Step keeps Momentum topped (evade everything for 2s). Twin Strike counts as 2 attacks.
- Class bonus: +6% Attack Speed, +10% Evasion (unchanged).
- Bend later: "Momentum isn't lost on hit, decays instead", "at 10 Momentum your attacks are crits".

## Mage — Arcane Charges
*"Bend the elements and the brew."* Start 10 / 12 / 20.

**Arcane Charges:** each spell cast grants 1 charge (max 5). At 5, your **next spell costs no mana
and deals 50% more damage**, consuming all charges.

- Every 6th cast is a big one — good rhythm, solves early mana pain.
- Hooks: tactics rule "Only at full charges" (**NEW** `RuleCondition`) lets Fireball be saved for the empowered cast.
- Class bonus: +15% Elemental Damage, +10% Flask Effect (unchanged).
- Bend later: "max charges +2", "empowered spells also restore 10% ES".

## Duelist — Riposte
*"Answer every blow."* Start 17 / 17 / 8. Starts in the Duelist zone (Str/Dex).

**Riposte:** when you **block or evade** a hit, counter-attack for **100% weapon damage**
(at most once per 0.5s).

- Turns both halves of an Armour/Evasion hybrid into damage. Tanky-ish, steady, idle-friendly.
- Hooks: Iron Guard blocks and Smoke Step evades both trigger it — guard skills become damage skills.
  Retaliation (signature) stacks with it.
- Class bonus: +10% Evasion, +5% chance to Block attacks (**NEW** `blockChance` stat, small passive block).
- Starter gems: Twin Strike, Iron Guard.

## Templar — Zeal
*"Faith is a shield."* Start 17 / 8 / 17. Starts in the Templar zone (Int/Str).

**Zeal:** **25% of mana you spend is restored as Energy Shield** (as Life if you have no ES).

- Casting more = more defence. Makes the Armour/ES hybrid self-sustaining; pairs with Zealot cluster.
- Hooks: big-cost skills (War Cry, Fireball) become defensive; Efficiency is a trade-off, not a free pick.
- Class bonus: +15% Elemental Damage, +8% all Resistances.
- Starter gems: Heavy Strike, Frost Ward.

## Shadow — Exploit
*"Find the crack, then the heart."* Start 8 / 17 / 17. Starts in the Shadow zone (Dex/Int).

**Exploit:** you deal **8% more damage for each different ailment or debuff** on the target
(bleed, poison, ignite, chill, stun, broken armour) — max 5 (40%).

- Rewards mixing skills and elements instead of spamming one — fragile but highest ceiling.
- Hooks: Poison Dart + Fireball + Spark already cover poison/ignite/chill. Lacerate adds bleed.
- Class bonus: +20% Ailment Damage, +15% Critical Strike Chance.
- Starter gems: Poison Dart, Spark.

## Exile — Versatility
*"Washed ashore with nothing. Can become anything."* Start 14 / 14 / 14. Starts at the **tree centre**,
with short paths into all three regions.

**Versatility:** using a **different skill than your last one** grants 1 stack (max 5, lasts 6s):
**4% more damage and 3% increased skill speed** each. Using the same skill twice in a row loses 1.

- Rewards filling the whole 6-slot bar with a real rotation — ties the class to the tactics system.
- Weakest start (no defence lean), strongest late: free to path anywhere on the tree.
- Class bonus: +5 to all Attributes, +10% Item Rarity.
- Starter gems: Default Attack-style pick — player chooses 1 main + 1 guard from any attribute at creation (**NEW** UI).
- Unlock: available from the start, or unlocked by beating Act 1 (open question).

---

## Engine work

- `ClassDef` gains `mechanic: 'rage' | 'momentum' | 'charges' | 'riposte' | 'zeal' | 'exploit' | 'versatility'`.
- `CombatRuntime` gains a `classResource: { stacks: number; max: number; expiresAt?: number }`.
- One hook per mechanic in `combat.ts`: on hit dealt (Rage), on attack/on hit taken (Momentum), on
  spell cast (Charges), on block/evade (Riposte), on mana spent (Zeal), damage calc (Exploit), on skill use (Versatility).
- Stat keys for the knobs (`rageMax`, `rageDecay`, `momentumMax`, …) so passives and uniques can tune them.
- New start nodes: `class_strdex`, `class_strint`, `class_dexint`, `class_centre` in `passiveTree.ts`.
- `npm run sim -- --class <id>` for all 7; Act 1 target stays 6–10h per class.
- Class portraits/crests for the 4 new classes (`ART_PROMPTS.md`).

## Open questions

- Exile: free from the start, or an Act 1 unlock?
- Do mechanics carry into ascendancies (each ascendancy twists its class mechanic), or do
  ascendancies add something separate?
- Starter kits for the hybrids wait on the weapon-family and hybrid-armour work.

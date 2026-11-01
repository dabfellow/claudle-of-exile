# Classes — Identity Rework

**Design reset (2026-10-30):** six normal classes, plus Exile as an unlockable hard mode class that can also be taken
into challenge modes. Each main class gets two ascendancies (12 in total, none for Exile), starting at Act 3; picking one opens its own tree,
on a new tab in the passive tree. Class balance doesn't need to be exact. See [GDD.md](GDD.md) §3.

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
| Mage | Int | Energy Shield | Wand, Staff | **Mana is Power** |
| Duelist | Str/Dex | Armour/Evasion | Sword, Axe | **Riposte** |
| Templar | Str/Int | Armour/ES | Sceptre, Mace | **Martyr** |
| Shadow | Dex/Int | Evasion/ES | Dagger, Wand | **Malice** |
| Exile | — | — | — | *Challenge class: none* |

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

## Mage — Mana is Power
*"Bend the elements and the brew."* Start 10 / 12 / 20.

**Mana is Power:** spells deal **up to 30% more damage the fuller your mana** — 30% at full,
0% at empty, linear in between (checked before the cast's cost is paid).

- The core tension is spend vs. save: cheap spam drains the bonus, a full tank hits hard.
- Makes mana stats (max mana, regen, mana flasks, Mana Leech, Efficiency) count as damage stats.
- Hooks: existing `manaAbove` tactics rule becomes a real choice ("only cast Fireball above 80% mana").
  Mind over Flesh (keystone) is a deliberate trade — taking hits on mana lowers your damage.
- Class bonus: +15% Elemental Damage, +10% Flask Effect (unchanged).
- Bend later: "bonus is 50% but caps at 90% mana", "bonus also applies to ES recharge", "counts ES instead of mana".

## Duelist — Riposte
*"Answer every blow."* Start 17 / 17 / 8. Starts in the Duelist zone (Str/Dex).

**Riposte:** when you **block or evade** a hit, counter-attack for **100% weapon damage**, or **50%** if the hit lands
(at most once per 0.5s). Matador and Vanguard give up the landed-hit answer for their own triggers.

Landed hits were added on 2026-10-31: 85% of hits on a starter land, so Riposte only fired about every 9 s.

- Turns both halves of an Armour/Evasion hybrid into damage. Tanky-ish, steady, idle-friendly.
- Hooks: Iron Guard blocks and Smoke Step evades both trigger it — guard skills become damage skills.
  Retaliation (signature) stacks with it.
- Class bonus: +10% Evasion, +5% chance to Block attacks (**NEW** `blockChance` stat, small passive block).
- Starter gems: Twin Strike, Iron Guard.

## Templar — Martyr
*"Every wound is a prayer."* Start 17 / 8 / 17. Starts in the Templar zone (Int/Str).

**Martyr:** hits you take fill **Fervor** (full at damage equal to 60% of your max Life + ES).
When full it releases a **holy nova**: heals 20% of max Life and deals lightning damage to every enemy
equal to 50% of the damage that filled it.

- Fervor fills from incoming damage **before mitigation**, so Armour/ES keep you alive without
  slowing the nova — the tank hybrid gets to stack defence with no penalty.
- Harder fights fire it more often; trash you outgear barely fills it. Bosses are where it shines.
- Hooks: Iron Guard's blocked hit still counts toward Fervor. Ground Slam packs fill it fast.
- Class bonus: +15% Elemental Damage, +8% all Resistances.
- Starter gems: Heavy Strike, Frost Ward.
- Bend later: "nova also applies Frost Ward", "Fervor full at 40%", "nova damage scales with Armour".

## Shadow — Malice
*"Patience, then the knife."* Start 8 / 17 / 17. Starts in the Shadow zone (Dex/Int).

**Malice:** every **non-critical** hit adds 1 Malice (meter of 15). At full, your next hit is a
**Coup de Grâce: a guaranteed crit for 400% damage**, and the meter empties.
A **normal crit empties the meter immediately**.

- Two real build paths, and that's the point:
  - **Low crit** → the meter fills reliably → a Coup de Grâce every ~15 hits.
  - **High crit** → constant normal crits, meter rarely fills → steady damage, no spikes.
  - The awkward middle (crits often enough to keep resetting) is the trap the player learns to avoid.
- Multi-hit skills (Twin Strike, Frost Needle-style) fill it fastest; Steady Hand (no crits) +
  Malice is a natural keystone combo — every hit fills it.
- Meter shows on the combat page; tactics rule "Only with Malice full" (**NEW** `RuleCondition`) lets a
  big skill like Fireball be saved for the Coup de Grâce.
- Class bonus: +20% Ailment Damage, +10% Evasion.
- Starter gems: Poison Dart, Spark.
- Bend later: "crits remove only 5 Malice", "Coup de Grâce also spreads ailments", "meter of 10, Coup de Grâce 250%".

## Exile — Challenge class
*"Washed ashore with nothing."* Start **10 / 10 / 10**.

**No mechanic. No class bonus. No defence lean.** At creation you **pick any of the six class start
nodes** and begin there.

- Starts with a Rusted Sword and the two starter gems of whichever start node you chose — nothing else.
- Purely a challenge: every bit of power comes from the tree, gear and gems.
- Rewards: an Exile crest/badge on the character, a few achievements (e.g. "Clear Act 1 as an Exile",
  "Kill Ysolde as an Exile with no unique equipped"). No gameplay rewards, so it stays a flex.
- Unlock: after any character finishes the campaign (reset, 2026-10-30; the build still unlocks it at Act 1).

---

## Engine work

**Built (2026-10-24):** Duelist, Templar and Shadow are playable; all six mechanics run in combat (`src/engine/mechanics.ts` + hooks in `combat.ts`), with a meter on the combat page and a "When your class meter is full" tactic. Coup de Grâce is a Mega Crit (flat 400%, ignores crit multiplier).

**Exile built (2026-10-24):** `classId: 'exile'`, `mechanic: null`, no bonus, 10/10/10, Rusted Sword only. The creation screen picks one of the six tree starts (`character.startNode`); the Exile gets that class's two starter gems (`startClass()` in `classes.ts`). Locked until a character on the account finishes the campaign (`AccountState.exileUnlocked`). Accounts that had already cleared Act 1, or had an Exile, when the account layer arrived keep the unlock. Achievements: *Nothing to Lose* (clear Act 1 as an Exile) and *Nothing But Will* (beat Ysolde as an Exile with no unique equipped). No crest art yet; the card shows the icon.


- `ClassDef` gains `mechanic: 'rage' | 'momentum' | 'manaPower' | 'riposte' | 'martyr' | 'malice' | null` (Exile is `null`).
- `CombatRuntime` gains a `classResource: { stacks: number; max: number; expiresAt?: number }` (Rage, Momentum, Fervor, Malice).
- One hook per mechanic in `combat.ts`: on hit dealt (Rage), on attack/on hit taken (Momentum), spell
  damage calc (Mana is Power), on block/evade (Riposte), on hit taken (Martyr), on hit dealt/crit roll (Malice).
- Stat keys for the knobs (`rageMax`, `rageDecay`, `momentumMax`, `maliceMax`, `fervorPct`, …) so passives and uniques can tune them.
- New start nodes: `class_strdex`, `class_strint`, `class_dexint` in `passiveTree.ts`. Exile reuses any of the six.
- Exile creation UI: start-node picker; unlock flag on the account after a campaign clear.
- `npm run sim -- --class <id>` for all 7; pacing targets are in [GDD.md](GDD.md) §2.
- Class portraits/crests for the 4 new classes.

## Open questions

- Do mechanics carry into ascendancies (each ascendancy twists its class mechanic), or do
  ascendancies add something separate?
- ~~Starter kits for the hybrids wait on the weapon-family and hybrid-armour work.~~ Checked 2026-10-24:
  hybrid armour bases start at level 8, so a level-1 kit can't use them. Each hybrid kit already has a weapon
  from its family and one level-1 piece for each half of its defence (Duelist: iron hat + jerkin; Templar:
  plate vest + linen hood; Shadow: jerkin + linen hood), so they stay as they are.

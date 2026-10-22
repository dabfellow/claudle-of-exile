# Skill trees — v2 (built)

Two separate trees with separate points (GDD §5):

| Tree | Points from | Purpose |
|---|---|---|
| **Character tree** | 1 per character level + quest rewards | Combat power: attributes, life/mana, damage, defences, skills, flasks, keystones |
| **Skilling tree** | 1 per 5 total gathering/production levels | Gathering & production speed, extra output, crafted item quality |

**Decided (2026-10-21):** keep all 9 keystones · respec with Orbs of Regret per node only · shared skilling point pool · add **mastery picks**. Numbers are still open for tuning.

---

## 1. Character tree

### Shape
```
                    [STRENGTH]  ← Warrior starts here
                   /          \
      Templar zone              Duelist zone
      (Int/Str)                  (Str/Dex)
                 \            /
     [INTELLIGENCE] ———————— [DEXTERITY]
     ← Mage                  Ranger →
                 Shadow zone (Dex/Int)
```
- Three **attribute regions**, each with a class start, **6 themed clusters** and **2 keystones** on the outer edge.
- Three **hybrid zones** between regions, each with **2 clusters** and **1 keystone** — this is how builds cross over (a Warrior can path to Dexterity through the Duelist zone).
- **Travel nodes** (+10 to an attribute) link clusters, so attributes come naturally while pathing.
- **Cluster pattern:** 3 small nodes → 1 notable. Smalls are a little of the theme; the notable is the payoff.
- **Masteries:** every cluster has a **mastery** next to its notable. Allocating it costs 1 point and you **pick 1 of 3** bonuses. You can allocate a mastery once you own that cluster's notable.
- **Target size:** ~150 nodes (3 starts, ~85 smalls/travel, 27 notables, 27 masteries, 9 keystones).

### Strength region (Warrior)
| Cluster | Small nodes (×3) | Notable |
|---|---|---|
| Start | +10 Strength | — |
| **Iron Skin** (armour) | 12% increased Armour | **Iron Skin** — 30% increased Armour, +40 Armour |
| **Heart of Stone** (life) | +8 maximum Life | **Bloodline** — 8% increased maximum Life, Regenerate 1.5 Life/s |
| **Brute Force** (physical) | 8% increased Physical Damage | **Brute Force** — 25% increased Physical Damage, +10% stun chance |
| **Bulwark** (guards) | 6% increased Armour, +4 Life | **Unyielding** — Guard skills block 1 additional hit |
| **Warlord** (buffs) | 6% increased Skill Effect Duration | **Warlord** — 30% increased Skill Effect Duration, 10% faster Cooldowns |
| **Butcher** (bleed) | 10% increased Bleed Damage | **Butcher** — 30% increased Bleed Damage, Bleeds last 20% longer |

**Keystones**
- **Unbreakable** — 60% more Armour. 15% less Attack Speed.
- **Blood Pact** — Skills cost Life instead of Mana. You have no Mana.

### Dexterity region (Ranger)
| Cluster | Small nodes (×3) | Notable |
|---|---|---|
| Start | +10 Dexterity | — |
| **Fleetfoot** (evasion) | 12% increased Evasion | **Fleetfoot** — 30% increased Evasion, 5% increased Attack Speed |
| **Precision** (crit chance / accuracy) | 10% increased Crit Chance, +20 Accuracy | **Precision** — 30% increased Crit Chance, +60 Accuracy |
| **Executioner** (crit multiplier) | +8% Crit Multiplier | **Executioner** — +25% Crit Multiplier |
| **Blade Dancer** (attack speed) | 3% increased Attack Speed | **Blade Dancer** — 8% increased Attack Speed |
| **Toxicologist** (poison) | 10% increased Poison Damage | **Toxicologist** — 30% increased Poison Damage, Poisons last 20% longer |
| **Phantom** (guards / cooldowns) | 4% faster Cooldowns | **Phantom** — Guard skills last 30% longer, 10% faster Cooldowns |

**Keystones**
- **Glass Edge** — +80% Crit Multiplier. 25% less maximum Life.
- **Wind Dancer** — Evasion can dodge boss wind-ups. 40% less Armour.

### Intelligence region (Mage)
| Cluster | Small nodes (×3) | Notable |
|---|---|---|
| Start | +10 Intelligence | — |
| **Pyromancer** (fire) | 10% increased Fire Damage | **Pyromancer** — 25% increased Fire Damage, 20% increased Ignite Damage |
| **Frostweaver** (cold) | 10% increased Cold Damage | **Frostweaver** — 25% increased Cold Damage, 20% stronger shields |
| **Stormcaller** (lightning) | 10% increased Lightning Damage | **Stormcaller** — 25% increased Lightning Damage, chains hit 1 extra enemy |
| **Arcane Flow** (mana) | +12 Mana, 10% increased Mana Regen | **Arcane Flow** — 40% increased Mana Regen, 10% reduced Mana Costs |
| **Spellweaver** (cast speed) | 3% increased Cast Speed | **Spellweaver** — 8% increased Cast Speed, 20% increased Spell Crit Chance |
| **Distiller** (flasks) | 5% increased Flask Effect | **Master Distiller** — 15% increased Flask Effect, 20% increased Flask Charges |

**Keystones**
- **Alchemist's Covenant** — 50% increased Flask Effect and Charges gained. 10% less maximum Life.
- **Mind over Flesh** — 30% of damage is taken from Mana before Life.

### Hybrid zones
| Zone | Cluster | Small nodes | Notable |
|---|---|---|---|
| **Duelist** (Str/Dex) | Duelist's Edge | +5 Str, +5 Dex | **Swordmaster** — 20% increased Physical Damage, 5% increased Attack Speed |
| | Bloodletting | 0.3% Life Leech | **Bloodthirst** — 1% Life Leech, 10% increased maximum Life |
| **Shadow** (Dex/Int) | Saboteur | +5 Dex, +5 Int | **Saboteur** — 20% increased Poison and Ignite Damage |
| | Spellblade | 6% increased Elemental Damage | **Spellblade** — 20% increased Elemental Damage, 4% increased Attack Speed |
| **Templar** (Int/Str) | Zealot | +5 Int, +5 Str | **Zealot** — Regenerate 3 Life/s, 15% increased Elemental Damage |
| | Warding | +4% all Resistances | **Elemental Warding** — +12% all Resistances, +20 Life |

**Hybrid keystones**
- **Steady Hand** (Duelist) — Your hits always land. You can't deal critical strikes.
- **Arcane Recursion** (Shadow) — Cooldowns recover 40% faster. Skills cost 50% more Mana.
- **Bastion** (Templar) — Your Evasion Rating is converted to Armour.

### New mechanics this needs
Stat keys: per-element damage (fire/cold/lightning %), bleed/poison/ignite damage %, ailment duration %, skill effect duration %, cooldown recovery %, mana cost reduction %, cast speed % (exists), stun chance %, shield effect %, extra chains, extra guard blocks, spell crit chance %.
Keystone flags: life-instead-of-mana, evasion dodges slams, damage from mana first, always hit / no crits, evasion → armour.

### Respec
Each refunded node costs 1 Orb of Regret. Changing a mastery's chosen bonus also costs 1 Orb of Regret. No gold reset — choices matter.

### Masteries (pick 1 of 3)
| Cluster | Option A | Option B | Option C |
|---|---|---|---|
| Iron Skin | +15% Armour | Armour also applies to 10% of elemental hits | 10% reduced damage from boss wind-ups |
| Heart of Stone | +5% maximum Life | Regenerate 0.5% Life/s | +20% Life Flask recovery |
| Brute Force | +10% Physical Damage | +15% stun duration | Stunned enemies take 10% more damage |
| Bulwark | Guards also grant 20% Armour for 3s | Guard cooldowns 15% faster | Blocking a hit restores 3% Life |
| Warlord | Buffs grant +5% more damage | War Cry also heals 5% Life | Buffs last 2s longer |
| Butcher | Bleeds deal 15% more to bosses | Bleeding enemies take 5% more damage | +1s Bleed duration |
| Fleetfoot | +15% Evasion | Evading a hit grants 2% Life | 5% increased Attack Speed after an evade (4s) |
| Precision | +10% Crit Chance | +50 Accuracy | Crits against full-life enemies deal 30% more |
| Executioner | +10% Crit Multiplier | +20% damage vs enemies below 30% Life | Crits leech 1% Life |
| Blade Dancer | +3% Attack Speed | +5% Attack Speed with Twin Strike/Lacerate | Repeats (Multistrike, Spell Echo) deal 10% more |
| Toxicologist | Poison stacks deal 10% more | +1s Poison duration | Poisoned enemies deal 5% less damage |
| Phantom | Smoke Step lasts 0.5s longer | 8% faster Cooldowns | After using a guard skill, next hit deals 20% more |
| Pyromancer | +10% Fire Damage | Ignites spread to 1 nearby enemy on death | +15% Ignite duration |
| Frostweaver | +10% Cold Damage | Shields absorb 15% more | Cold hits slow enemy attacks by 10% |
| Stormcaller | +10% Lightning Damage | Chains deal 10% more per chain | +10% crit chance with Lightning skills |
| Arcane Flow | +15% Mana Regen | 8% reduced Mana Costs | Mana Flasks recover 25% more |
| Spellweaver | +4% Cast Speed | Repeats (Spell Echo, Multistrike) deal 10% more | +15% Spell Crit Multiplier |
| Distiller | +10% Flask Effect | +15% Flask Charges gained | Utility flasks last 20% longer |
| Duelist's Edge | +5 Strength and Dexterity | +10% Physical Damage with melee | +100 Accuracy |
| Bloodletting | +0.5% Life Leech | +0.3% Life Leech and 2 Life/s regen *(swapped: no leech-speed mechanic)* | Overkill damage heals 5% of it |
| Saboteur | +10% ailment damage | Ailments last 15% longer | Enemies with 2+ ailments take 10% more damage |
| Spellblade | +10% Elemental Damage | Attacks gain 5% of Physical as Lightning | +8% Elemental Resistances |
| Zealot | +5 Strength and Intelligence | Regenerate 1 Mana/s | +10% Elemental Damage while above 80% Life |
| Warding | +5% all Resistances | 5% reduced elemental damage taken | Regenerate 2 Life/s *(swapped: no player curses yet)* |
| *(region starts have no mastery)* | | | |

> A few mastery effects need small new mechanics (e.g. "overkill heals", "slow enemy attacks"). If any turn out costly to build, I'll swap them for a simpler stat of similar strength and note it here.

---

## 2. Skilling tree

### Shape
A smaller tree: a shared **core** in the middle with **5 branches**, one per skill. Some nodes need a minimum skill level. Each branch ends in a **keystone** that changes how the skill works.

### Core (shared)
| Node | Effect |
|---|---|
| Industrious (×3) | 3% faster gathering and production |
| Studious (×3) | 3% increased skill XP |
| **Steady Hands** (notable) | 5% chance for production not to consume inputs |
| **Overtime** (notable) | Offline skilling 10% faster |

### Mining
| Node | Effect | Requires |
|---|---|---|
| Prospector (×3) | 5% faster Mining | — |
| **Gem Finder** | Rough Gem chance doubled | Mining 15 |
| **Rich Veins** | 10% chance for double ore | Mining 30 |
| **Motherlode** (keystone) | Ore drops are doubled. Mining is 30% slower | Mining 50 |

### Woodcutting
| Node | Effect | Requires |
|---|---|---|
| Lumberjack (×3) | 5% faster Woodcutting | — |
| **Bird's Nest** | 3% chance to find a random herb | Woodcutting 15 |
| **Clean Cuts** | 10% chance for double logs | Woodcutting 30 |
| **Heartwood** (keystone) | Logs also yield Arcane Dust. Woodcutting XP −20% | Woodcutting 50 |

### Harvesting
| Node | Effect | Requires |
|---|---|---|
| Green Thumb (×3) | 5% faster Harvesting | — |
| **Bountiful** | 10% chance for double herbs | Harvesting 15 |
| **Rare Blooms** | Small chance for a higher-tier herb | Harvesting 30 |
| **Greenhouse** (keystone) | Harvesting keeps ticking at 20% speed while you do another skill or fight | Harvesting 50 |

### Smithing
| Node | Effect | Requires |
|---|---|---|
| Hammerhand (×3) | 5% faster Smithing | — |
| **Fine Steel** | +2 item level on smithed bases (still capped by campaign progress) | Smithing 15 |
| **Masterwork** | 10% chance a smithed base comes out Magic | Smithing 30 |
| **Grandmaster Smith** (keystone) | Smithed bases are always Magic. Smithing is 25% slower | Smithing 50 |

### Alchemy
| Node | Effect | Requires |
|---|---|---|
| Distillation (×3) | 5% faster Alchemy | — |
| **Dust Saver** | 10% chance to use no Arcane Dust | Alchemy 15 |
| **Quality Brews** | Brewed flasks have a 25% chance to be Magic | Alchemy 30 |
| **Transmuter** (keystone) | Orbs you craft have a 10% chance to come out one tier higher. Alchemy is 20% slower | Alchemy 50 |

**Size:** ~35 nodes. At 1 point per 5 total skill levels, a player with every skill at 99 has 99 points — enough to fill the tree, but mid-game you choose a focus.

---

## 3. Decisions
| Question | Decision |
|---|---|
| Keystones | Keep all 9 |
| Respec | Orb of Regret per node (and per mastery change) only |
| Skilling points | Shared pool: 1 per 5 total gathering/production levels |
| Extras at launch | Mastery picks (1 of 3 per cluster). No jewel sockets yet |

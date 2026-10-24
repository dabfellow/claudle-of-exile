# Skill trees — v3 (built)

Two separate trees with separate points (GDD §5):

| Tree | Points from | Purpose |
|---|---|---|
| **Character tree** | 1 per character level + quest rewards | Combat power: attributes, life/mana, damage, defences, skills, flasks, keystones |
| **Skilling tree** | 1 per 5 total gathering/production levels | Gathering & production speed, extra output, crafted item quality |

**Decided (2026-10-21):** keep all 9 keystones (2026-10-24: tree rebuilt for six classes, now 18) · respec with Orbs of Regret per node only · shared skilling point pool · add **mastery picks**. Numbers are still open for tuning.

---

## 1. Character tree

### Shape (v3, 2026-10-24: six class sectors)
```
                 Warrior (Str)
     Templar (Str/Int)      Duelist (Str/Dex)
                 [CROSSING]
     Mage (Int)             Ranger (Dex)
                 Shadow (Dex/Int)
```
- **~900 nodes**: 6 class starts, 342 smalls, 168 notables, 78 masteries, 18 keystones, ~290 travel nodes.
- Each class owns a **60° sector**. Every sector uses the same slot layout, rotated (`SLOTS` in `passiveTree.ts`):
  - **Mechanic wheel** right outside the start (5 smalls, 3 notables, mastery) and a **deep mechanic fork** further out, ending in a **mechanic keystone** on the rim. ⚙ in the tables below.
  - **11 themed clusters** in three bands: two short *lines* (3 smalls → notable) by the start, *wheels* (5 smalls, 3 notables around a mastery) and *forks* (entry → two arms, 2 notables) further out.
  - **3 keystones** on the rim: two general, one mechanic.
- **Travel nodes** (+10 to the class attribute, +5/+5 in hybrid sectors) fill every path, roughly one per 80 units.
- **Bridges** link each sector to its neighbours at three radii, so any class can path anywhere.
- **Exile's Crossing**: a ring at the centre (+3 all attributes, 6 all-round notables) that every start reaches in ~7 points.
- **Forbidden keystones** (crimson, 3 of them, equally spaced past the rim on the Duelist/Ranger, Shadow/Mage and Templar/Warrior borders, each at the end of a long road): a mechanical upside (no "% more") with a side effect that only hurts the player. **Overclock**: skills have no cooldowns and cost nothing; every 8s of fighting you overheat and can't act for 2s. **Knife's Edge**: your hits can't be evaded and are always Mega Crits; max Life is 1 (Energy Shield builds only). **Eternal Hunger**: you can't die while your Hunger is fed (each kill feeds it for 5s); if it starves in a fight, you die.
- **Mega Crits**: a flat 400% hit that ignores critical strike multiplier. Separate from crits and only granted by specific sources: Knife's Edge, the Ambush support, and the Shadow's Coup de Grâce.
- **Mechanic nodes** only do something for the class with that mechanic (tooltip says so). Their stats always carry a small generic bonus too, so Exiles starting there aren't wasting points. The mechanic stat keys (`rageMax`, `ripostePct`, `momentumMax`, `maliceMax`, `manaPower`, `fervorPct`, …) exist but **do nothing until the class mechanics are built** (CLASSES.md).
- **Masteries** are shared by theme like PoE (armour, life, bleed, rage, …): every cluster of that theme offers the same 3 picks.
- Start node ids: `class_str`, `class_strdex`, `class_dex`, `class_dexint`, `class_int`, `class_strint`.

### Warrior sector
| Cluster | Small node | Notables |
|---|---|---|
| rage ⚙ | Fury: 5% increased effect of Rage, 4% increased Physical Damage | **Seething** — +5 to maximum Rage, 10% increased Physical Damage<br>**Blood Boil** — Regenerate 0.1% of Life per second per Rage, +15 to maximum Life<br>**Unquenched** — 50% slower Rage decay, 15% increased Armour |
| iron_skin | Toughened Hide: 12% increased Armour | **Iron Skin** — 30% increased Armour, +40 to Armour |
| heart_of_stone | Vitality: +8 to maximum Life | **Bloodline** — 8% increased maximum Life, Regenerate 1.5 Life per second |
| brute_force | Might: 8% increased Physical Damage | **Brute Force** — 25% increased Physical Damage, +10% chance to Stun on hit<br>**Crushing Blows** — 30% longer Stuns, 10% more damage against Stunned enemies<br>**Heavy Hands** — +2 to minimum Physical Damage with attacks, +4 to maximum Physical Damage with attacks |
| warlord | Command: 6% increased Skill Effect Duration | **Warlord** — 30% increased Skill Effect Duration, 10% faster Cooldowns<br>**Battle Cry** — 5% more damage while a buff skill is active, War Cry restores 5% of Life |
| bulwark | Bulwark: 6% increased Armour, +4 to maximum Life | **Unyielding** — Guard skills block 1 additional hit<br>**Shield Wall** — 4% chance to Block hits, +60 to Armour<br>**Stalwart** — 20% longer Guard skills, Blocking a hit restores 2% of Life |
| butcher | Laceration: 10% increased Bleed Damage | **Butcher** — 30% increased Bleed Damage, 20% longer Bleeds<br>**Rend** — Attacks have 15% chance to cause Bleeding, 5% more damage against Bleeding enemies |
| wrath ⚙ | Wrath: 6% increased effect of Rage, +5 to maximum Life | **Bloodrage** — Gain 1 Rage when you are hit, 6% increased maximum Life<br>**Berserker's Toll** — +10 to maximum Rage, 10% increased effect of Rage |
| juggernaut | Juggernaut: +6 to maximum Life, Regenerate 0.5 Life per second | **Juggernaut** — 10% increased maximum Life, 8% less damage taken from boss wind-ups<br>**Unstoppable** — Regenerate 0.4% of Life per second, +5% chance to Stun on hit |
| titan | Titan's Grip: 8% increased Physical Damage with melee skills | **Titan's Grip** — 25% increased Physical Damage with melee skills, +3 to maximum Physical Damage with attacks |
| endurance | Endurance: +3% to all Elemental Resistances | **Iron Will** — +10% to all Elemental Resistances, Armour also applies to 5% of elemental damage |
| colossus | Brawn: +6 to Strength | **Colossus** — +20 to Strength, 5% increased maximum Life<br>**Might of the Mountain** — 20% increased Armour, 10% increased Physical Damage<br>**Earthshaker** — +10% chance to Stun on hit, 15% increased Physical Damage with melee skills |
| bloodsoaked | Thirst: 0.2% of damage leeched as Life | **Bloodsoaked** — 0.8% of damage leeched as Life, +20 to maximum Life<br>**Gorge** — Overkill damage heals you for 5% of it, 4% increased maximum Life<br>**Crimson Tide** — 20% increased Bleed Damage, 0.3% of damage leeched as Life |

**Keystones:** **Unbreakable** — 60% more Armour. 15% less Attack Speed. · **Blood Pact** — Skills cost Life instead of Mana. You have no Mana. · **Endless Fury** ⚙ — Rage no longer decays. Maximum Rage is halved.

### Duelist sector
| Cluster | Small node | Notables |
|---|---|---|
| riposte ⚙ | Riposte: 8% increased Riposte damage, +15 to Accuracy Rating | **Counterpoint** — 30% increased Riposte damage, 2% chance to Block hits<br>**Parry and Thrust** — 25% faster Riposte recovery, 10% increased Evasion Rating<br>**Measured Reply** — Ripostes restore 2% of Life, 10% increased Armour |
| duelists_edge | Duelist's Edge: +5 to Strength, +5 to Dexterity | **Swordmaster** — 20% increased Physical Damage, 5% increased Attack Speed |
| bloodletting | Bloodletting: 0.3% of damage leeched as Life | **Bloodthirst** — 1% of damage leeched as Life, 10% increased maximum Life |
| gladiator | Shield Arm: 1% chance to Block hits | **Gladiator** — 5% chance to Block hits, Blocking a hit restores 2% of Life<br>**Arena Veteran** — 15% increased Armour, 15% increased Evasion Rating<br>**Crowd Pleaser** — Overkill damage heals you for 3% of it, 4% increased Attack Speed |
| swordplay | Swordplay: 2% increased Attack Speed, +15 to Accuracy Rating | **Flurry** — 8% increased Attack Speed, 5% more damage with repeats (Multistrike, Spell Echo)<br>**Precise Cuts** — +80 to Accuracy Rating, 15% increased Critical Strike Chance |
| cutthroat | Cutthroat: 6% increased Physical Damage | **Lacerator** — Attacks have 15% chance to cause Bleeding, 20% increased Bleed Damage<br>**Reaver** — 20% increased Physical Damage, 10% more damage against enemies below 30% Life<br>**Exsanguinate** — 5% more damage against Bleeding enemies, 10% more Bleed damage against bosses |
| brawler | Scrapper: 6% increased Armour, 6% increased Evasion Rating | **Scrapper** — 20% increased Armour, 20% increased Evasion Rating<br>**Dirty Fighting** — +10% chance to Stun on hit, 15% more damage on your next hit after using a guard skill |
| retort ⚙ | Retort: 10% increased Riposte damage, +4 to maximum Life | **Fencer's Instinct** — 30% increased Critical Strike Chance with Ripostes, +10% to Critical Strike Multiplier<br>**Bloody Answer** — Ripostes always cause Bleeding, 15% increased Bleed Damage |
| showman | Showmanship: 8% increased Critical Strike Chance | **Flourish** — 25% increased Critical Strike Chance, +10% to Critical Strike Multiplier<br>**Grand Finale** — 25% more critical damage against full-Life enemies, +15% to Critical Strike Multiplier |
| steel_nerves | Composure: +3% to all Elemental Resistances | **Steel Nerves** — +10% to all Elemental Resistances, +15 to maximum Life |
| agility | Agility: +8 to Dexterity | **Light on Feet** — 20% increased Evasion Rating, 5% increased Attack Speed for 4s after you evade |
| warmonger | Warmonger: 6% increased Physical Damage with melee skills | **Warmonger** — 20% increased Physical Damage with melee skills, +20 to maximum Life<br>**Weapon Master** — +2 to minimum Physical Damage with attacks, +5 to maximum Physical Damage with attacks<br>**Relentless** — 6% increased Attack Speed, 0.3% of damage leeched as Life |
| guarded_stance | Guarded Stance: 6% longer Guard skills | **Guarded Stance** — 25% longer Guard skills, Guard skills also grant 10% increased Armour for 3s<br>**Read the Blade** — 15% faster Guard skill Cooldowns, Evading a hit restores 2% of Life<br>**Shield Bash** — 3% chance to Block hits, +8% chance to Stun on hit |

**Keystones:** **Steady Hand** — Your hits always land. You can't deal critical strikes. · **Blade Waltz** — 15% more Attack Speed. 30% less Armour. · **Perfect Form** ⚙ — Riposte has no cooldown. Ripostes deal 50% less damage.

### Ranger sector
| Cluster | Small node | Notables |
|---|---|---|
| momentum ⚙ | Momentum: 5% increased effect of Momentum, 1% increased Attack Speed | **Second Wind** — +3 to maximum Momentum, 10% increased Evasion Rating<br>**Sure-Footed** — Taking a hit removes 25% less Momentum, +30 to Accuracy Rating<br>**Gathering Storm** — 20% increased effect of Momentum, 10% increased Critical Strike Chance |
| fleetfoot | Evasion: 12% increased Evasion Rating | **Fleetfoot** — 30% increased Evasion Rating, 5% increased Attack Speed |
| precision | Keen Eye: 10% increased Critical Strike Chance, +20 to Accuracy Rating | **Precision** — 30% increased Critical Strike Chance, +60 to Accuracy Rating |
| executioner | Lethality: +8% to Critical Strike Multiplier | **Executioner** — +25% to Critical Strike Multiplier<br>**Killing Blow** — 15% more damage against enemies below 30% Life, +10% to Critical Strike Multiplier<br>**Mercy Stroke** — Critical strikes leech 1% of damage as Life, 15% increased Critical Strike Chance |
| blade_dancer | Swiftness: 3% increased Attack Speed | **Blade Dancer** — 8% increased Attack Speed<br>**Twin Fangs** — 6% increased Attack Speed with Twin Strike and Lacerate, 6% more damage with repeats (Multistrike, Spell Echo) |
| toxicologist | Venom: 10% increased Poison Damage | **Toxicologist** — 30% increased Poison Damage, 20% longer Poisons<br>**Virulence** — Poisons last 1s longer, 10% increased damage with Bleed, Poison and Ignite<br>**Paralytic** — Poisoned enemies deal 5% less damage, 10% increased Evasion Rating |
| phantom | Quickness: 4% faster Cooldowns | **Phantom** — 30% longer Guard skills, 10% faster Cooldowns<br>**Vanishing Act** — Smoke Step lasts 0.5s longer, 15% more damage on your next hit after using a guard skill |
| slipstream ⚙ | Slipstream: 6% increased effect of Momentum, 4% increased Evasion Rating | **Wind at Your Back** — +5 to maximum Momentum, 3% increased Attack Speed<br>**Untouchable** — 2% increased Evasion Rating per Momentum, 10% increased Evasion Rating |
| marksman | Marksman: 8% increased Projectile Damage | **Marksman** — 25% increased Projectile Damage, +50 to Accuracy Rating<br>**Far Shot** — 15% increased Projectile Damage, 15% increased Critical Strike Chance |
| hunter | Hunter: +25 to Accuracy Rating | **Eagle Eye** — +100 to Accuracy Rating, +8% to Critical Strike Multiplier |
| wanderer | Wanderer: 5% increased Evasion Rating, +2% to all Elemental Resistances | **Weathered** — +10% to all Elemental Resistances, 15% increased Evasion Rating |
| acrobat | Acrobatics: 8% increased Evasion Rating | **Acrobatics** — +60 to Evasion Rating, 25% increased Evasion Rating<br>**Light Step** — Evading a hit restores 2% of Life, 5% increased Attack Speed for 4s after you evade<br>**Blur** — 5% increased Attack Speed, 10% increased Evasion Rating |
| trickster | Nimble: +6 to Dexterity | **Nimble** — +20 to Dexterity, 3% increased Attack Speed<br>**Hawk's Talon** — 20% increased Critical Strike Chance, +40 to Accuracy Rating<br>**Fleet Arrows** — 15% increased Projectile Damage, 4% increased Attack Speed |

**Keystones:** **Glass Edge** — +80% Critical Strike Multiplier. 25% less maximum Life. · **Wind Dancer** — Evasion can dodge boss wind-ups. 40% less Armour. · **Perpetual Motion** ⚙ — Taking a hit doesn't halve Momentum. Momentum decays by 1 per second instead.

### Shadow sector
| Cluster | Small node | Notables |
|---|---|---|
| malice ⚙ | Malice: 6% increased Coup de Grâce damage, 4% increased damage with Bleed, Poison and Ignite | **Patience** — Malice meter is 3 smaller, 10% increased Evasion Rating<br>**Twist the Knife** — 40% increased Coup de Grâce damage, +5% to Critical Strike Multiplier<br>**Spite** — Critical strikes leave 5 Malice instead of emptying the meter, 10% increased Critical Strike Chance |
| saboteur | Saboteur: +5 to Dexterity, +5 to Intelligence | **Saboteur** — 20% increased Poison Damage, 20% increased Ignite Damage |
| spellblade | Spellblade: 6% increased Elemental Damage | **Spellblade** — 20% increased Elemental Damage, 4% increased Attack Speed |
| assassin | Assassin: 8% increased Critical Strike Chance | **Assassinate** — +20% to Critical Strike Multiplier, 10% more damage against enemies below 30% Life<br>**Backstab** — 25% more critical damage against full-Life enemies, 15% increased Critical Strike Chance<br>**Shadowstep** — 15% increased Evasion Rating, 10% more damage on your next hit after using a guard skill |
| plaguebearer | Plague: 8% increased Poison Damage | **Plaguebearer** — 25% increased Poison Damage, 5% more damage against enemies with 2+ ailments<br>**Festering** — Poisons last 1s longer, Poisoned enemies deal 5% less damage |
| hexblade | Hexblade: 6% increased Elemental Damage | **Storm Blade** — Gain 5% of Physical damage as extra Lightning, 15% increased Lightning Damage<br>**Frozen Edge** — 20% increased Cold Damage, Cold hits slow enemy attacks by 8% for 3s<br>**Burning Edge** — 20% increased Fire Damage, 15% increased Ignite Damage |
| trickery | Trickery: 5% increased Evasion Rating, 5% increased Energy Shield | **Shadow Veil** — 20% increased Evasion Rating, 20% increased Energy Shield<br>**Mirage** — 25% faster Energy Shield Recharge, Evading a hit restores 1% of Life |
| ill_intent ⚙ | Ill Intent: 8% increased Coup de Grâce damage, 4% increased Poison Damage | **Opportunist** — Coup de Grâce also Poisons and Ignites, 10% increased Poison Damage<br>**Grudge** — Gain 1 Malice when you are hit, 10% increased Evasion Rating |
| infuser | Cruelty: 8% increased damage with Bleed, Poison and Ignite | **Cruel Methods** — 25% increased damage with Bleed, Poison and Ignite<br>**Slow Death** — 20% longer Bleed, Poison and Ignite, 5% more damage against enemies with 2+ ailments |
| nightstalker | Nightstalker: +4 to Dexterity, +4 to Intelligence | **Nightstalker** — 20% increased Critical Strike Chance, 4% increased Cast Speed |
| ignition | Ignition: 10% increased Ignite Damage | **Immolate** — 30% increased Ignite Damage, 15% longer Ignites |
| cutpurse | Cutpurse: 4% increased Item Rarity | **Cutpurse** — 15% increased Item Rarity, +10 to Dexterity<br>**Fence** — 10% increased Item Rarity, +10 to Intelligence<br>**Treasure Hunter** — 20% increased Item Rarity |
| hexer | Hexcraft: 8% increased Critical Strike Chance with Spells | **Hex Master** — 25% increased Critical Strike Chance with Spells, +10% to Critical Strike Multiplier with Spells<br>**Dark Pact** — 15% increased Spell Damage, 0.3% of damage leeched as Life<br>**Malevolence** — 5% increased Cast Speed, 10% increased Spell Damage |

**Keystones:** **Arcane Recursion** — Cooldowns recover 40% faster. Skills cost 50% more Mana. · **Venomous Soul** — 60% increased damage with ailments. 15% less maximum Life. · **Thousand Cuts** ⚙ — Critical strikes also add Malice instead of emptying it. Coup de Grâce deals 200% damage instead of 400%.

### Mage sector
| Cluster | Small node | Notables |
|---|---|---|
| mana_is_power ⚙ | Reservoir: +2% to the Mana is Power bonus, +8 to maximum Mana | **Wellspring** — +5% to the Mana is Power bonus, 15% increased maximum Mana<br>**Brimming** — Mana above 90% counts as full for Mana is Power, 10% increased Mana Regeneration<br>**Overflow** — +3% to the Mana is Power bonus, 30% increased Mana Regeneration |
| pyromancer | Kindling: 10% increased Fire Damage | **Pyromancer** — 25% increased Fire Damage, 20% increased Ignite Damage |
| frostweaver | Rime: 10% increased Cold Damage | **Frostweaver** — 25% increased Cold Damage, 20% stronger absorb Shields |
| stormcaller | Static: 10% increased Lightning Damage | **Stormcaller** — 25% increased Lightning Damage, Chaining skills hit 1 additional enemy<br>**Overcharge** — 8% more damage per chain, 15% increased Critical Strike Chance with Lightning skills<br>**Static Field** — 15% increased Lightning Damage, 3% increased Cast Speed |
| arcane_flow | Arcane Flow: +12 to maximum Mana, 10% increased Mana Regeneration | **Arcane Flow** — 40% increased Mana Regeneration, 10% reduced Mana Costs<br>**Clarity** — Regenerate 1.5 Mana per second, +20 to maximum Mana |
| spellweaver | Incantation: 3% increased Cast Speed | **Spellweaver** — 8% increased Cast Speed, 20% increased Critical Strike Chance with Spells<br>**Echoes** — 10% more damage with repeats (Multistrike, Spell Echo), 10% increased Spell Damage<br>**Arcane Focus** — 20% increased Spell Damage, +15 to maximum Mana |
| distiller | Distillation: 5% increased Flask Effect | **Master Distiller** — 15% increased Flask Effect, 20% increased Flask Charges gained<br>**Potent Brews** — 20% increased Life Flask recovery, 20% increased Mana Flask recovery |
| deep_reserves ⚙ | Deep Reserves: +10 to maximum Mana, 6% increased Mana Regeneration | **Font of Power** — +8% to the Mana is Power bonus, +20 to maximum Mana<br>**Soul Battery** — Energy Shield counts as Mana for Mana is Power, 15% increased Energy Shield |
| eldritch | Eldritch Ward: 8% increased Energy Shield | **Arcane Barrier** — 25% increased Energy Shield, +20 to maximum Energy Shield<br>**Quick Recovery** — 30% faster Energy Shield Recharge, 10% increased Energy Shield |
| elementalist | Elementalist: 8% increased Elemental Damage | **Elementalist** — 25% increased Elemental Damage, +5% to all Elemental Resistances |
| sage | Sage: +8 to Intelligence | **Sage** — +25 to Intelligence, +10 to maximum Mana |
| conjurer | Conjuration: 6% stronger absorb Shields | **Ice Ward** — 20% stronger absorb Shields, 10% increased Cold Damage<br>**Arcane Shell** — 10% of damage is taken from Mana before Life, +15 to maximum Mana<br>**Resilient Wards** — 15% stronger absorb Shields, +25 to maximum Energy Shield |
| pyre | Pyre: 6% increased Fire Damage | **Inferno** — 20% increased Fire Damage, 15% increased Ignite Damage<br>**Spreading Flames** — Ignites spread to another enemy when the target dies, 10% longer Ignites<br>**Cinders** — 25% increased Ignite Damage |

**Keystones:** **Alchemist's Covenant** — 50% increased Flask Effect and Charges gained. 10% less maximum Life. · **Mind over Flesh** — 30% of damage is taken from Mana before Life. · **All or Nothing** ⚙ — Mana is Power gives 60% more damage at full Mana, but nothing below 80% Mana.

### Templar sector
| Cluster | Small node | Notables |
|---|---|---|
| martyr ⚙ | Penitence: 8% increased holy nova damage, +4 to maximum Life | **Devotion** — 15% faster Fervor, +5% to all Elemental Resistances<br>**Holy Light** — 10% increased holy nova healing, Regenerate 1 Life per second<br>**Divine Wrath** — 40% increased holy nova damage, 5% increased Elemental Damage |
| zealot | Zeal: +5 to Intelligence, +5 to Strength | **Zealot** — Regenerate 3 Life per second, 15% increased Elemental Damage |
| warding | Warding: +4% to all Elemental Resistances | **Elemental Warding** — +12% to all Elemental Resistances, +20 to maximum Life |
| inquisitor | Inquisition: 5% increased Elemental Damage, 5% increased Critical Strike Chance | **Inquisition** — 15% increased Elemental Damage, 15% increased Critical Strike Chance<br>**Righteous Fire** — 20% increased Fire Damage, Regenerate 1 Life per second<br>**Judgement** — 15% more damage against enemies below 30% Life, +10% to Critical Strike Multiplier |
| guardian | Sacred Plate: 6% increased Armour, 6% increased Energy Shield | **Sacred Bastion** — 20% increased Armour, 20% increased Energy Shield<br>**Unwavering Faith** — 8% less damage taken from boss wind-ups, 4% reduced elemental damage taken |
| hierophant | Sermon: 6% increased Spell Damage | **Sermon** — 20% increased Spell Damage, 15% increased Mana Regeneration<br>**Litany** — 5% increased Cast Speed, 6% reduced Mana Costs<br>**Sacred Words** — +25 to maximum Mana, 10% increased Elemental Damage |
| crusader | Crusade: 5% increased Physical Damage with melee skills, 4% increased Elemental Damage | **Crusader** — Gain 6% of Physical damage as extra Lightning, 15% increased Physical Damage with melee skills<br>**Hammer of Faith** — +10% chance to Stun on hit, 8% more damage against Stunned enemies |
| penance ⚙ | Penance: 5% faster Fervor, 4% increased Armour | **Sanctified Wounds** — 15% faster Fervor, 15% increased Armour<br>**Radiance** — The holy nova restores 20% of Energy Shield, 10% increased Energy Shield |
| purity | Purity: +3% to all Elemental Resistances | **Purity of Flesh** — +10% to all Elemental Resistances, 3% reduced elemental damage taken<br>**Cleansing Light** — Regenerate 0.3% of Life per second, +5% to all Elemental Resistances |
| consecrated | Consecration: Regenerate 1 Life per second | **Consecrated Ground** — Regenerate 4 Life per second, 5% increased maximum Life |
| oathkeeper | Oath: +4 to Strength, +4 to Intelligence | **Oathkeeper** — +25 to maximum Life, +25 to maximum Mana |
| benediction | Blessing: 5% increased Skill Effect Duration | **Benediction** — 5% more damage while a buff skill is active, 15% increased Skill Effect Duration<br>**Blessed Ward** — 20% stronger absorb Shields, 10% longer Guard skills<br>**Prayer of Haste** — 10% faster Cooldowns, 3% increased Cast Speed |
| stormfaith | Stormfaith: 6% increased Lightning Damage | **Storm of Judgement** — 20% increased Lightning Damage, Chaining skills hit 1 additional enemy<br>**Thunderous Faith** — 15% increased Critical Strike Chance with Lightning skills, 10% increased Lightning Damage<br>**Sky's Wrath** — 6% more damage per chain, 10% increased Elemental Damage |

**Keystones:** **Bastion** — Your Evasion Rating is converted to Armour. · **Sacred Oath** — +15% to all Elemental Resistances. 10% less Attack Speed. · **Saint's Sacrifice** ⚙ — Fervor fills twice as fast. The holy nova no longer heals you.

### Respec
Each refunded node costs 1 Orb of Regret. Changing a mastery's chosen bonus also costs 1 Orb of Regret. No gold reset — choices matter.

### Masteries (pick 1 of 3)
Shared by theme — see `MASTERIES` in `src/data/passiveTree.ts` for the 37 themes and their options.


---

## 2. Skilling tree

> Six notables were swapped to work with the crafting materials from [SKILLING_REWORK.md](SKILLING_REWORK.md) §7.

### Shape
A smaller tree: a shared **core** in the middle with **5 branches**, one per skill. Some nodes need a minimum skill level. Each branch ends in a **keystone** that changes how the skill works.

### Core (shared)
| Node | Effect |
|---|---|
| Industrious (×3) | 3% faster gathering and production |
| Studious (×2) | 3% increased skill XP |
| Overtime | Offline skilling 10% faster |
| **Steady Hands** (notable) | 5% chance for production not to consume inputs |
| **Patient Crafter** (notable) | Craft until… has a 10% chance each step not to use the orb |

### Mining
| Node | Effect | Requires |
|---|---|---|
| Prospector (×3) | 5% faster Mining | — |
| **Gem Finder** | Rough Gem chance doubled | Mining 15 |
| **Fossil Hunter** | 50% increased chance to find Fossils | Mining 30 |
| **Motherlode** (keystone) | Ore drops are doubled. Mining is 30% slower | Mining 50 |

### Woodcutting
| Node | Effect | Requires |
|---|---|---|
| Lumberjack (×3) | 5% faster Woodcutting | — |
| **Bird's Nest** | 3% chance to find a random herb | Woodcutting 15 |
| **Sap Tapper** | 50% increased chance to find Resin; Resin gives +1 extra item level | Woodcutting 30 |
| **Heartwood** (keystone) | Logs also yield Arcane Dust. Woodcutting XP −20% | Woodcutting 50 |

### Harvesting
| Node | Effect | Requires |
|---|---|---|
| Green Thumb (×3) | 5% faster Harvesting | — |
| **Distiller** | Lesser Essences you find have a 10% chance to be Greater | Harvesting 15 |
| **Rare Blooms** | Small chance for a higher-tier herb | Harvesting 30 |
| **Greenhouse** (keystone) | Harvesting keeps ticking at 20% speed while you do another skill or fight | Harvesting 50 |

### Smithing
| Node | Effect | Requires |
|---|---|---|
| Hammerhand (×3) | 5% faster Smithing | — |
| **Steady Temper** | 20% chance a smithing Fossil is not consumed | Smithing 15 |
| **Masterwork** | 10% chance a smithed base comes out Magic | Smithing 30 |
| **Grandmaster Smith** (keystone) | Smithed bases are always Magic. Smithing is 25% slower | Smithing 50 |

### Alchemy
| Node | Effect | Requires |
|---|---|---|
| Distillation (×3) | 5% faster Alchemy | — |
| **Bulk Brewer** | Batch recipes cost 25% less per orb instead of 15% | Alchemy 15 |
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

# Passive tree notables

What every notable on the character tree does, generated from `src/data/passiveNotables.ts` (the text is what players see in game). Design and decisions: MILESTONES, Decisions, "Notable pass" (approved 2026-11-08).

**Markers:** ★ rule-changer (18, pure upside) · ◆ a "more" multiplier (the Doomed wheels) · ⚙ a class mechanic (one per region).
**Where:** *inner* is next to the class start, *middle* is around the class name, *outer* is past the Cosmic Gateway, *rim* is near the Outer Rim ring, *Doomed* is behind the Doomed Gate.
**Each region** has 96 notables: 23 shared basics, 47 home notables and 26 on its two borders. Wheels hold 3 notables, forks/loops/diamonds 2, lines 1.

## The 18 rule-changers

| Where | Notable | Effect |
|---|---|---|
| Warrior, outer | Unbroken | Unbroken: Armour also reduces Damage over Time you take |
| Warrior–Duelist border | Rupture | Rupture: Stunning a Bleeding enemy makes its Bleed deal its remaining damage at once |
| Warrior, rim | Warlord's Call | Warlord's Call: Your Warcries last until the pack falls |
| Duelist, outer | Crimson Flood | Crimson Flood: Your Bleeds can stack twice on an enemy |
| Duelist–Ranger border | Perfect Rhythm | Perfect Rhythm: Every 100 Accuracy grants 1% increased Critical Strike Chance once you can no longer miss |
| Duelist, rim | Steel Tempest | Steel Tempest: Every 5th attack also hits every other enemy in reach |
| Ranger, outer | Ricochet | Ricochet: Projectiles that kill their target carry on to the next enemy |
| Ranger–Shadow border | Venom Volley | Venom Volley: Projectiles always Poison, and Poisons spread when the target dies |
| Ranger, rim | Hunter's Brand | Hunter's Brand: Marks never expire, and a bursting Mark leaves 2 stacks on the nearest enemy |
| Shadow, outer | Twin Hexes | Twin Hexes: A new Curse keeps the effect of the one already on the enemy |
| Shadow–Mage border | Withering Touch | Withering Touch: Your Chaos Damage over Time Withers enemies (5% increased Chaos Damage taken per stack, up to 10) |
| Shadow, rim | Grave Pact | Grave Pact: Minions that die rise again 3s later, once per pack |
| Mage, outer | Eye of the Tempest | Eye of the Tempest: +1 Storm of each kind |
| Mage–Templar border | Unbroken Ward | Unbroken Ward: Energy Shield Recharge is never interrupted; it slows to half while you are hit |
| Mage, rim | Inevitable | Inevitable: Doom drops to half after a burst instead of emptying |
| Templar, outer | Ancestral Bond | +1 to maximum number of Totems, Ancestral Bond: Your Totems taunt enemies in their reach |
| Templar–Warrior border | Holy Retort | Holy Retort: After you block, your next attack adds the blocked damage as Fire Damage |
| Templar, rim | Beyond the Veil | Beyond the Veil: Every 5% Elemental Resistance over the cap raises that maximum by 1% (up to +5%) |

## Shared basics (the same in every region)

| Slot | Where | Cluster | Notables |
|---|---|---|---|
| I | inner | Combat Stance | **Hardy Constitution**: +30 to maximum Life, 6% increased maximum Life<br>**Weathered**: +10% to all Elemental Resistances<br>**Second Wind**: 20% increased Life Flask recovery, 10% increased Flask Charges gained |
| A | inner | Toughness | **Thick Skin**: 20% increased Armour, 20% increased Evasion Rating, 20% increased Energy Shield |
| B | inner | Tempo | **Quick Hands**: 6% increased Attack Speed, 6% increased Cast Speed |
| A1 | inner | Precision | **Keen Eye**: 20% increased Critical Strike Chance, +60 to Accuracy Rating<br>**Killer Instinct**: +15% to Critical Strike Multiplier |
| B1 | inner | Wards | **Purity**: +8% to all Elemental Resistances, +10% to Chaos Resistance<br>**Mending**: Regenerate 1% of Life per second |
| I1 | inner | Focus | **Clear Mind**: 20% increased Mana Regeneration, 8% reduced Mana Costs<br>**Fleet**: 5% increased Movement Speed, 4% increased Attack Speed |
| D | inner | Drive | **Battle Hardened**: 12% increased Physical Damage, 12% increased Elemental Damage, +15 to maximum Life<br>**Deep Breath**: +20 to maximum Mana, 10% increased Mana Regeneration |
| G | middle | Endurance | **Stout Heart**: 8% increased maximum Life<br>**Hold the Line**: +6% to all Elemental Resistances, 15% increased Armour, 15% increased Evasion Rating |
| J | outer | Versatility | **Well Rounded**: +10 to all Attributes |
| K | outer | Provisions | **Deep Pockets**: 15% increased Flask Charges gained, 15% longer Utility Flasks |
| J1 | outer | Lethality | **Finishing Blow**: 15% more damage against enemies below 30% Life<br>**Steady Aim**: +100 to Accuracy Rating, 10% increased Critical Strike Chance |
| K1 | outer | Grit | **Second Skin**: 10% of Damage taken from hits is Recouped as Life over 4 seconds<br>**Brace**: 8% less damage taken from boss wind-ups |
| R2 | outer | Guard | **Shieldbearer**: 4% chance to Block hits<br>**Lasting Guard**: 20% longer Guard skills, 10% faster Guard skill Cooldowns |

## Warrior (home)

| Slot | Where | Cluster | Notables |
|---|---|---|---|
| C | inner | Iron | **Iron Hide**: 30% increased Armour<br>**Bedrock**: +150 to Armour, 6% less damage taken from boss wind-ups<br>⚙ **Simmering Fury**: +3 to maximum Rage |
| E | inner | Heavy Hands | **Bone Crusher**: 25% increased Physical Damage with melee skills<br>**Weighty Blows**: +3 to minimum Physical Damage with attacks, +6 to maximum Physical Damage with attacks<br>**Concussive**: +10% chance to Stun on hit, 25% longer Stuns |
| D1 | middle | War Cries | **Booming Voice**: 30% increased Warcry Effect<br>**Rallying Shout**: 20% faster Warcry Cooldown Recovery, War Cry restores 5% of Life<br>**Intimidate**: 15% increased Damage while a Warcry is active |
| G1 | middle | Exertion | **Pent-Up Force**: 30% increased Damage with Exerted skills<br>**Tireless**: 25% increased Exertion gained<br>**Follow-Through**: Kills with Exerted skills grant 1 Exertion |
| F | middle | Stagger | **Earthshaker**: +10% chance to Stun on hit, 20% longer Stuns<br>**Easy Prey**: 15% more damage against Stunned enemies |
| H | middle | Vitality | **Juggernaut**: 10% increased maximum Life, 6% less damage taken from boss wind-ups<br>**Iron Lungs**: Regenerate 1.5% of Life per second |
| L1 | outer | Two-Handed | **Titan's Grip**: 25% increased Damage with Two-Handed Weapons<br>**Heft**: 10% increased Damage with Two-Handed Weapons, +8% chance to Stun on hit |
| M1 | outer | Shockwave | **Aftershock**: 20% increased Area Damage, 10% increased Physical Damage with melee skills<br>**Rumble**: 15% increased Area Damage, +5% chance to Stun on hit |
| R3 | outer | Blood and Sinew | **Thick Blood**: +40 to maximum Life, 20% increased Life Flask recovery<br>**Stalwart**: 10% reduced Damage taken while above 80% Life |
| R4 | outer | Brawler | **Knuckles**: 20% increased Damage with One-Handed Weapons<br>**Haymaker**: 10% more damage against Stunned enemies, 0.5% of damage leeched as Life |
| R1 | outer | Unbreakable | ★ **Unbroken**: Unbroken: Armour also reduces Damage over Time you take<br>**Plated**: 20% increased Armour<br>**Absorb the Blow**: +100 to Armour, Regenerate 1% of Life per second |
| P2 | rim | Last Stand | **Defiance**: Defiance: 1% more Damage and +30% Armour & Evasion while below 50% Life<br>**Grim Resolve**: 12% of Damage taken from hits is Recouped as Life over 4 seconds, Regenerate 0.5% of Life per second |
| P3 | rim | Bloodied Steel | **Overpower**: 20% increased Physical Damage, 10% increased Physical Damage with melee skills<br>**Crushing Finish**: 20% more damage against Stunned enemies |
| S1 | rim | Warlord | ★ **Warlord's Call**: Warlord's Call: Your Warcries last until the pack falls<br>**Commanding Presence**: 20% increased Warcry Effect<br>**Iron Throat**: 25% faster Warcry Cooldown Recovery |
| S2 | rim | Colossus | **Colossus**: +20 to Strength, 8% increased maximum Life<br>**Mountain's Root**: 10% less damage taken from boss wind-ups, 15% increased Armour<br>**Titan Blood**: Regenerate 1% of Life per second, +30 to maximum Life |
| S3 | rim | Unyielding Exertion | **Overexert**: 40% increased Damage with Exerted skills<br>**Pressure**: 20% increased Exertion gained, 5% increased Attack Speed |
| S4 | rim | Earthbreaker | **Cataclysmic Strike**: 35% increased Physical Damage with melee skills, +15% chance to Stun on hit<br>**Shatter Ground**: 20% increased Area Damage, 10% more damage against Stunned enemies |
| DG1 | Doomed | God-Tier Power | ◆ **Apotheosis of Strength**: 30% more Melee Damage<br>**Immovable Object**: 50% increased Armour, 20% less damage taken from boss wind-ups<br>**Earth Shatterer**: +25% chance to Stun on hit, 25% more damage against Stunned enemies |
| DG2 | Doomed | Warlord Ascendant | ◆ **Thunderous Command**: 20% more Damage while a Warcry is active<br>**Endless Exertion**: 40% increased Exertion gained, Kills with Exerted skills grant 1 Exertion<br>**Bloodsworn**: +60 to maximum Life, 15% increased maximum Life |

## Duelist (home)

| Slot | Where | Cluster | Notables |
|---|---|---|---|
| C | inner | Bladework | **Swordplay**: 20% increased Damage with One-Handed Weapons<br>**Flurry**: 8% increased Attack Speed<br>⚙ **Counterpoint**: 20% increased Riposte damage |
| E | inner | Shieldwork | **Gladiator Wall**: 5% chance to Block hits, Blocking a hit restores 3% of Life<br>**Shield Bash**: +60 to Armour, 10% increased Damage while holding a Shield<br>**Steady Arm**: 3% chance to Block hits, 15% longer Guard skills |
| D1 | middle | Bloodletting | **Butcher**: 30% increased Bleed Damage<br>**Deep Cuts**: Attacks have 15% chance to cause Bleeding<br>**Open Veins**: 8% more damage against Bleeding enemies |
| G1 | middle | Guard Skills | **Raised Guard**: 20% faster Guard skill Cooldowns<br>**Counterguard**: 30% more damage on your next hit after using a guard skill<br>**Reinforced**: Guard skills also grant 25% increased Armour for 3s |
| F | middle | Dual Wield | **Twin Blades**: 15% increased Attack Speed while Dual Wielding<br>**Off-Hand Flick**: 4% chance to Block hits |
| H | middle | Footwork | **Light Feet**: 15% increased Evasion Rating, 4% increased Movement Speed<br>**Sidestep**: Evading a hit restores 2% of Life |
| L1 | outer | Showman | **Crowd Pleaser**: 15% increased Area Damage, 4% increased Attack Speed<br>**Flourish**: Overkill damage heals you for 5% of it, 5% increased Attack Speed |
| M1 | outer | Tempo | **Quickstep**: 8% increased Attack Speed, 4% increased Movement Speed<br>**Measured Pace**: 10% reduced Mana Costs |
| R3 | outer | Parry | **Parry**: 4% chance to Block hits, Guard skills block 1 additional hit<br>**Turn Aside**: Blocking a hit restores 3% of Life, 15% increased Mana Regeneration |
| R4 | outer | Lacerate | **Serrated Edge**: 25% longer Bleeds<br>**Exsanguinate**: 6% more damage against Bleeding enemies, 10% increased Physical Damage |
| R1 | outer | Crimson Dance | ★ **Crimson Flood**: Crimson Flood: Your Bleeds can stack twice on an enemy<br>**Haemorrhage**: 25% increased Bleed Damage<br>**Bloodied Path**: Overkill damage heals you for 5% of it, Attacks have 10% chance to cause Bleeding |
| P2 | rim | Duellist's Code | **Single Combat**: 20% increased Damage against bosses and rare enemies<br>**Read the Opponent**: 10% reduced Damage taken from bosses and rare enemies |
| P3 | rim | Riposte Stance | **Iron Wrist**: 3% chance to Block hits, +60 to Armour<br>**Second Guard**: 15% faster Guard skill Cooldowns, Blocking a hit restores 2% of Life |
| S1 | rim | Blade Storm | ★ **Steel Tempest**: Steel Tempest: Every 5th attack also hits every other enemy in reach<br>**Whirling Steel**: 10% increased Attack Speed<br>**Sharpened**: +2 to minimum Physical Damage with attacks, +5 to maximum Physical Damage with attacks |
| S2 | rim | Fortress | **Shield Master**: 5% chance to Block hits, +80 to Armour<br>**Unshakable**: 2% chance to Block hits, Guard skills block 1 additional hit<br>**Bastion of Steel**: 10% increased Damage while holding a Shield, 20% increased Armour |
| S3 | rim | Arena | **Bloodsport**: 10% more damage against Bleeding enemies<br>**Pit Fighter**: +50 to maximum Life, 10% increased Bleed Damage |
| S4 | rim | Gladiator | **Heavy Shield**: 4% chance to Block hits, Blocking a hit restores 2% of Life<br>**Shield Charge**: 20% more damage on your next hit after using a guard skill, Guard skills also grant 20% increased Armour for 3s |
| DG1 | Doomed | God-Tier Steel | ◆ **Thousand Cuts**: 25% more Attack Speed<br>**Bleed Them Dry**: 40% increased Bleed Damage, 15% increased Damage against bosses and rare enemies<br>**Edge Dancer**: 6% chance to Block hits, 20% increased Evasion Rating |
| DG2 | Doomed | Iron Gladiator | ◆ **Unbreakable Guard**: 20% more Armour, Blocking a hit restores 5% of Life<br>**Shieldbreaker**: 30% more damage against Stunned enemies<br>**Arena Champion**: 15% increased Physical Damage, 15% increased Elemental Damage, 15% increased Armour |

## Ranger (home)

| Slot | Where | Cluster | Notables |
|---|---|---|---|
| C | inner | Fletching | **Barbed Arrows**: 20% increased Projectile Damage<br>**True Flight**: +100 to Accuracy Rating<br>⚙ **Fleet Stride**: +2 to maximum Momentum |
| E | inner | Evasion | **Phantom**: 30% increased Evasion Rating<br>**Fade**: Evading a hit restores 3% of Life<br>**Slippery**: 6% increased Movement Speed |
| D1 | middle | Marks | **Hunter's Mark**: 30% increased Mark burst Damage<br>**Tracker**: 40% increased Mark Duration<br>**Prey**: 8% increased Damage against Marked enemies |
| G1 | middle | Archery | **Draw Weight**: 20% increased Damage with Two-Handed Weapons<br>**Quick Nock**: 10% increased Attack Speed<br>**Deadeye**: +20% to Critical Strike Multiplier |
| F | middle | Survivalist | **Field Dressing**: 20% increased Life Flask recovery<br>**Forager**: 20% increased Flask Charges gained |
| H | middle | Wind Runner | **Tailwind**: 8% increased Movement Speed<br>**Fleet Footed**: 15% increased Evasion Rating, 6% increased Attack Speed for 4s after you evade |
| L1 | outer | Volley | **Split Shot**: Chaining skills hit 1 additional enemy<br>**Barrage**: 15% increased Area Damage, 8% increased Projectile Damage |
| M1 | outer | Hunter | **Big Game**: 20% increased Damage against bosses and rare enemies<br>**Patience**: 30% more critical damage against full-Life enemies |
| R3 | outer | Far Shot | **Long Range**: 20% increased Projectile Damage<br>**Sniper Nest**: +18% to Critical Strike Multiplier |
| R4 | outer | Mirage | **Ghost Dance**: Ghost Dance: Evading a hit restores Energy Shield equal to 3% of your Evasion Rating, 15% increased Evasion Rating<br>**Blur**: 20% increased Evasion Rating, 4% increased Attack Speed |
| R1 | outer | Ricochet | ★ **Ricochet**: Ricochet: Projectiles that kill their target carry on to the next enemy<br>**Piercing Volley**: 25% increased Projectile Damage<br>**Rapid Fire**: 8% increased Attack Speed |
| P2 | rim | Trapper's Kit | **Hobbling Shot**: Cold hits slow enemy attacks by 15% for 3s<br>**Snare**: 10% increased Damage against Chilled or Frozen enemies |
| P3 | rim | Eagle Eye | **Eagle Sight**: +120 to Accuracy Rating, 20% increased Critical Strike Chance<br>**Sure Aim**: +15% to Critical Strike Multiplier |
| S1 | rim | Marksman | ★ **Hunter's Brand**: Hunter's Brand: Marks never expire, and a bursting Mark leaves 2 stacks on the nearest enemy<br>**Branding Iron**: 50% increased Mark Duration<br>**Hunt Them Down**: 10% increased Damage against Marked enemies |
| S2 | rim | Wanderer | **Wanderlust**: 10% increased Movement Speed, +20 to Dexterity<br>**Long Road**: 30% longer Utility Flasks<br>**Trail Rations**: Regenerate 1% of Life per second |
| S3 | rim | Quiver | **Heavy Quiver**: +4 to minimum Physical Damage with attacks, +8 to maximum Physical Damage with attacks<br>**Arrow Rain**: 20% increased Area Damage |
| S4 | rim | Acrobat | **Tumble**: 8% less damage taken from boss wind-ups, 10% increased Evasion Rating<br>**Catlike**: 10% increased Attack Speed for 4s after you evade |
| DG1 | Doomed | God-Tier Aim | ◆ **Spectral Volley**: 25% more Projectile Damage<br>**Unseen**: 40% increased Evasion Rating<br>**Mirror Step**: Evading a hit restores 5% of Life, 10% increased Attack Speed for 4s after you evade |
| DG2 | Doomed | Apex Predator | ◆ **Killing Mark**: 40% more Mark burst Damage<br>**Relentless Hunt**: Overkill damage heals you for 5% of it, 10% increased Movement Speed<br>**Predator's Instinct**: 15% increased Damage against Marked enemies, 25% increased Critical Strike Chance |

## Shadow (home)

| Slot | Where | Cluster | Notables |
|---|---|---|---|
| C | inner | Venom | **Toxic Vector**: 25% increased Poison Damage<br>**Lingering**: 20% longer Poisons<br>⚙ **Patient Knife**: Malice meter is 1 smaller |
| E | inner | Assassin | **Fatal Impact**: 25% increased Critical Strike Chance<br>**Merciless**: +20% to Critical Strike Multiplier<br>**Backstab**: 30% more critical damage against full-Life enemies |
| D1 | middle | Curses | **Hexmaster**: 20% increased Effect of your Curses<br>**Spreading Hex**: 30% increased Curse Duration, 5% increased Damage against Cursed enemies<br>**Lingering Malice**: 30% increased Curse Duration |
| G1 | middle | Minions | **Dark Pact**: 25% increased Minion Damage<br>**Bone Armour**: 30% increased Minion Life<br>**Restless Dead**: 10% increased Minion Attack Speed |
| F | middle | Shadow Step | **Elusive**: 15% increased Evasion Rating, 5% increased Movement Speed<br>**Smoke Screen**: Smoke Step lasts 1s longer, 8% increased Evasion Rating |
| H | middle | Cutthroat | **Throat Slit**: 20% increased Damage with One-Handed Weapons<br>**Ambush**: 25% more critical damage against full-Life enemies |
| L1 | outer | Hex Weaver | **Doom Whisper**: 6% increased Damage against Cursed enemies, 6% increased Effect of your Curses<br>**Malediction**: 25% increased Curse Duration, 5% reduced Mana Costs |
| M1 | outer | Necromancy | **Command the Dead**: Minions take 15% less Damage<br>**Corpse Feast**: Overkill damage heals you for 5% of it, 10% increased Minion Damage |
| R3 | outer | Plaguebearer | **Festering Wound**: Poisoned enemies deal 8% less damage<br>**Virulence**: Hits have 15% chance to Poison |
| R4 | outer | Nightstalker | **Vanish**: 20% increased Evasion Rating, 5% reduced Damage taken while above 80% Life<br>**Shadow Dance**: 10% increased Critical Strike Chance, 4% increased Movement Speed |
| R1 | outer | Hexblade | ★ **Twin Hexes**: Twin Hexes: A new Curse keeps the effect of the one already on the enemy<br>**Profane Edge**: 15% increased Damage against Cursed enemies<br>**Withering Hex**: 10% increased Effect of your Curses, 10% increased Chaos Damage |
| P2 | rim | Saboteur | **Dirty Tricks**: 15% increased Damage against Chilled or Frozen enemies<br>**Caltrops**: Smoke Step lasts 1s longer, Hits have 10% chance to Poison |
| P3 | rim | Deathblow | **Execution**: 25% more damage against enemies below 30% Life<br>**Coup Instinct**: +20% to Critical Strike Multiplier |
| S1 | rim | Lord of the Dead | ★ **Grave Pact**: Grave Pact: Minions that die rise again 3s later, once per pack<br>**Legion**: +1 to maximum number of Minions<br>**Unholy Might**: 15% increased Minion Damage, 15% increased Minion Life |
| S2 | rim | Toxicologist | **Toxic Strength**: 20% increased Poison Damage<br>**Paralysing Venom**: Poisoned enemies deal 8% less damage<br>**Septic**: 15% increased Poison Damage, 10% increased Damage against bosses and rare enemies |
| S3 | rim | Spellblade | **Arcane Edge**: 15% increased Spell Damage, 15% increased Physical Damage<br>**Swift Casting**: 6% increased Cast Speed |
| S4 | rim | Puppeteer | **Bound Servants**: 25% increased Minion Life<br>**Sacrificial Lamb**: Minions take 10% less Damage, Overkill damage heals you for 3% of it |
| DG1 | Doomed | Toxic Apotheosis | ◆ **Plague Incarnate**: 30% more Poison Damage<br>**Venom Bloom**: Poisons spread to an adjacent enemy when the target dies<br>**Noxious Aura**: 20% increased Chaos Damage, 10% increased Chaos Damage over Time |
| DG2 | Doomed | Grave Lord | ◆ **Army of One**: 25% more Minion Damage<br>**Bone Throne**: Minions take 20% less Damage, +30 to maximum Life<br>**Malevolence**: 25% increased Effect of your Curses |

## Mage (home)

| Slot | Where | Cluster | Notables |
|---|---|---|---|
| C | inner | Pyromancy | **Kindled**: 20% increased Fire Damage<br>**Searing Heat**: 30% increased Burn and Ignite Damage<br>⚙ **Overflow**: +5% to the Mana is Power bonus |
| E | inner | Frost | **Permafrost**: 25% increased Cold Damage, Cold hits slow enemy attacks by 10% for 3s<br>**Glacial Bulwark**: Glacial Bulwark: Take 15% less Physical and Cold Damage while Chilled or fighting Chilled/Frozen enemies, 20% stronger absorb Shields<br>**Shatter**: 8% increased Damage against Chilled or Frozen enemies |
| D1 | middle | Storms | **Gathering Clouds**: 25% increased Storm Damage<br>**Long Squall**: 30% increased Storm Duration<br>**Wide Front**: 15% faster Storm strikes |
| G1 | middle | Doom | **Dread**: 30% increased Doom burst Damage<br>**Mounting Fear**: 25% increased Doom built<br>**Hollowing**: 15% increased Chaos Damage |
| F | middle | Arcane Battery | **Deep Reserves**: 15% increased maximum Mana<br>**Battery**: 25% increased Mana Regeneration |
| H | middle | Energy Shield | **Soul Barrier**: 25% increased Energy Shield<br>**Quick Recharge**: 25% faster Energy Shield Recharge |
| L1 | outer | Lightning | **Supercharge**: 25% increased Lightning Damage<br>**Arcing Storm**: Chaining skills hit 1 additional enemy, 15% increased Critical Strike Chance with Lightning skills |
| M1 | outer | Sorcery | **Spellwright**: 25% increased Spell Damage<br>**Arcane Precision**: +20% to Critical Strike Multiplier with Spells |
| R3 | outer | Conflux | **Elemental Harmony**: 15% increased Elemental Damage, +5% to all Elemental Resistances<br>**Overcharge**: Gain 8% of Physical damage as extra Lightning |
| R4 | outer | Mana Flow | **Efficiency**: 10% reduced Mana Costs, 10% faster Cooldowns<br>**Wellspring**: 30% increased Mana Flask recovery |
| R1 | outer | Tempest | ★ **Eye of the Tempest**: Eye of the Tempest: +1 Storm of each kind<br>**Thunderhead**: 15% faster Storm strikes<br>**Storm Ward**: 8% reduced Damage taken while you have a Storm |
| P2 | rim | Spellweaver | ◆ **Spell Echo**: 15% more damage with repeats (Multistrike, Spell Echo)<br>**Quick Incantation**: 8% increased Cast Speed |
| P3 | rim | Scholar | **Archmage**: 20% increased Spell Damage, 10% increased maximum Mana<br>**Studied**: +20 to Intelligence |
| S1 | rim | Harbinger | ★ **Inevitable**: Inevitable: Doom drops to half after a burst instead of emptying<br>**Dark Omen**: 15% increased Doom built, 5% reduced Mana Costs<br>**Final Toll**: 25% increased Doom burst Damage |
| S2 | rim | Elementalist | **Apotheosis of Elements**: 25% increased Elemental Damage<br>**Thermal Shock**: 25% longer Bleed, Poison and Ignite<br>**Elemental Aegis**: 5% reduced elemental damage taken |
| S3 | rim | Arcane Ward | **Aegis Ward**: Aegis Ward: Blocking a hit restores Energy Shield equal to 2% of your Armour, +35 to maximum Energy Shield<br>**Mind Shield**: Gain 10% of maximum Mana as extra maximum Energy Shield |
| S4 | rim | Cataclysm | **Spell Cataclysm**: +25% to Critical Strike Multiplier with Spells<br>**Overload**: 20% increased Area Damage |
| DG1 | Doomed | Absolute Zero | ◆ **Deep Freeze**: 30% more Cold Damage<br>**Frozen Heart**: 30% stronger absorb Shields<br>**Hypothermia**: 15% increased Damage against Chilled or Frozen enemies |
| DG2 | Doomed | Stormbringer | ◆ **Living Storm**: 30% more Storm Damage<br>**Endless Doom**: 30% increased Doom built<br>**Eye of Ruin**: +20% to Critical Strike Multiplier with Spells, 20% increased Critical Strike Chance |

## Templar (home)

| Slot | Where | Cluster | Notables |
|---|---|---|---|
| C | inner | Devotion | **Faith**: +12% to all Elemental Resistances<br>**Righteous Fire**: 20% increased Elemental Damage with Attacks<br>⚙ **Zeal**: 10% faster Fervor |
| E | inner | Totems | **Ancestral Might**: 25% increased Totem Damage<br>**Sturdy Totems**: 30% increased Totem Life<br>**Quick Placement**: 20% increased Totem Duration, 5% increased Totem Attack and Cast Speed |
| D1 | middle | Holy Arms | **Consecrated Blade**: 20% increased Elemental Damage with Attacks<br>**Smite**: Gain 6% of Physical damage as extra Lightning<br>**Inquisitor**: 10% increased Elemental Damage with Attacks, +15% to Critical Strike Multiplier |
| G1 | middle | Sanctuary | **Holy Ward**: 20% stronger absorb Shields<br>**Mending Light**: Regenerate 1.5% of Life per second<br>**Sacred Ground**: 10% reduced Damage taken while you have a Totem |
| F | middle | Purity | **Purity of Elements**: +8% to all Elemental Resistances, 5% reduced elemental damage taken<br>**Cleansing**: +10% to Fire Resistance, +10% to Cold Resistance, +10% to Lightning Resistance |
| H | middle | Crusader | **Crusade**: 15% increased Physical Damage, 10% increased Elemental Damage with Attacks, 4% chance to Block hits<br>**Shield of Faith**: 3% chance to Block hits, +6% to all Elemental Resistances |
| L1 | outer | Oathkeeper | **Iron Will**: +10% to all Elemental Resistances<br>**Steadfast**: +2% to maximum Elemental Resistances |
| M1 | outer | Ancestors | **Spirit Guard**: 25% increased Totem Life<br>**Shared Strength**: 10% increased Damage while you have a Totem |
| R3 | outer | Benediction | **Blessing**: 15% increased Life Flask recovery, Regenerate 0.5% of Life per second<br>**Absolution**: 20% increased Life Flask recovery |
| R4 | outer | Stormfaith | **Thunderous Faith**: 15% increased Lightning Damage, 10% increased Elemental Damage with Attacks<br>**Static Blessing**: 6% increased Damage against Shocked enemies |
| R1 | outer | Totem Lord | ★ **Ancestral Bond**: +1 to maximum number of Totems, Ancestral Bond: Your Totems taunt enemies in their reach<br>**Ancestral Fury**: 15% increased Totem Attack and Cast Speed<br>**Warding Totems**: 30% increased Totem Life |
| P2 | rim | Hierophant | **Divine Flesh**: Divine Flesh: 50% of Elemental Damage taken is taken as Chaos Damage, +8% to all Elemental Resistances<br>**Consecration**: 6% increased Damage while you have a Totem |
| P3 | rim | Judgement | **Verdict**: 20% increased Damage against bosses and rare enemies<br>**Sentence**: 15% increased Damage against Shocked enemies |
| S1 | rim | Transcendence | ★ **Beyond the Veil**: Beyond the Veil: Every 5% Elemental Resistance over the cap raises that maximum by 1% (up to +5%)<br>**Hallowed**: +12% to all Elemental Resistances<br>**Sanctified Body**: +20% to Chaos Resistance |
| S2 | rim | Bulwark of Faith | **Divine Bulwark**: 25% stronger absorb Shields<br>**Unshaken**: 10% reduced Damage taken while above 80% Life<br>**Radiance**: Blocking a hit restores 4% of Life |
| S3 | rim | Martyrdom | **Martyr's Resolve**: Defiance: 1% more Damage and +30% Armour & Evasion while below 50% Life<br>**Sacrifice**: 20% of Damage taken from hits is Recouped as Life over 4 seconds |
| S4 | rim | Pyre of Faith | **Holy Flame**: 15% increased Fire Damage, 10% increased Elemental Damage with Attacks<br>**Purging Fire**: 20% increased Burn and Ignite Damage |
| DG1 | Doomed | Divine Bastion | ◆ **Aegis of Heaven**: 20% more absorb Shield strength<br>**Perfect Faith**: +3% to maximum Elemental Resistances<br>**Sanctum**: Regenerate 2% of Life per second |
| DG2 | Doomed | Ancestral Host | ◆ **Spirit Army**: 30% more Totem Damage<br>**Eternal Totems**: 50% increased Totem Duration<br>**Ancestral Blessing**: 15% increased Damage while you have a Totem |

## Borders

Each border holds 10 clusters: five on each side, coloured as their own region but themed for both.

### Warrior–Duelist

| Side | Slot | Where | Cluster | Notables |
|---|---|---|---|---|
| Warrior  E1 | middle | Rending Blows | **Rend**: Attacks have 15% chance to cause Bleeding<br>**Brutal Wounds**: 15% increased Bleed Damage, +5% chance to Stun on hit |
| Warrior  H1 | middle | Armoured Guard | **Plated Shield**: 3% chance to Block hits, 15% increased Armour<br>**Heavy Guard**: Guard skills also grant 25% increased Armour for 3s |
| Warrior  M | outer | Butcher's Yard | **Cleaver**: 10% increased Damage with One-Handed Weapons, 10% increased Damage with Two-Handed Weapons<br>**Gore**: 6% more damage against Bleeding enemies<br>**Hacking Blows**: Attacks have 10% chance to cause Bleeding, 15% longer Bleeds |
| Warrior  R6 | outer | Rupture | ★ **Rupture**: Rupture: Stunning a Bleeding enemy makes its Bleed deal its remaining damage at once<br>**Bone and Blood**: 20% increased Bleed Damage, +8% chance to Stun on hit<br>**Red Haze**: 6% more damage against Bleeding enemies, 6% increased Physical Damage with melee skills |
| Warrior  P4 | rim | Shield and Axe | **Iron Bulwark**: 4% chance to Block hits, +80 to Armour<br>**Retaliate**: Attacks have 10% chance to cause Bleeding, 2% chance to Block hits<br>**Bloodied Shield**: Blocking a hit restores 3% of Life |
| Duelist  C1 | middle | Shield Wall | **Shield Wall**: 4% chance to Block hits, +60 to Armour<br>**Hold Fast**: 8% less damage taken from boss wind-ups, 10% increased Armour |
| Duelist  F1 | middle | Lacerations | **Laceration**: 20% increased Bleed Damage<br>**Crimson Tide**: 10% increased Bleed Damage, 0.3% of damage leeched as Life |
| Duelist  L | outer | Warmonger | **Warmonger**: 15% increased Physical Damage with melee skills, +30 to maximum Life<br>**Bloodlust**: 6% more damage against Bleeding enemies<br>**Grit Teeth**: +6% chance to Stun on hit, 3% chance to Block hits |
| Duelist  R5 | outer | Iron Duellist | **Iron Duel**: 15% increased Armour, 3% chance to Block hits<br>**Cut and Hold**: 20% longer Bleeds, 8% increased Armour<br>**Weighted Steel**: +2 to minimum Physical Damage with attacks, +5 to maximum Physical Damage with attacks |
| Duelist  P1 | rim | Vanguard | **Front Line**: +40 to maximum Life, 10% increased Armour<br>**Shield Rush**: 15% more damage on your next hit after using a guard skill<br>**Scarred**: 3% chance to Block hits, Defiance: 1% more Damage and +30% Armour & Evasion while below 50% Life |

### Duelist–Ranger

| Side | Slot | Where | Cluster | Notables |
|---|---|---|---|---|
| Duelist  E1 | middle | Lunge | **Lunge**: 6% increased Attack Speed, 6% increased Movement Speed<br>**Thrust**: +80 to Accuracy Rating, 8% increased Damage with One-Handed Weapons |
| Duelist  H1 | middle | Blade Dancer | **Blade Dance**: 15% increased Evasion Rating, 2% chance to Block hits<br>**Counter Step**: 6% increased Attack Speed for 4s after you evade |
| Duelist  M | outer | Tempo Strike | **Rapid Strikes**: 10% increased Attack Speed<br>**Precise Cuts**: +100 to Accuracy Rating, 10% increased Critical Strike Chance<br>**Rhythm**: 4% increased Attack Speed, +10% to Critical Strike Multiplier |
| Duelist  R6 | outer | Perfect Rhythm | ★ **Perfect Rhythm**: Perfect Rhythm: Every 100 Accuracy grants 1% increased Critical Strike Chance once you can no longer miss<br>**Swift Hands**: 8% increased Attack Speed<br>**Sure Strike**: +120 to Accuracy Rating |
| Duelist  P4 | rim | Fencer | **Fencer**: 10% increased Damage with One-Handed Weapons, 10% increased Projectile Damage<br>**Flowing Form**: 10% increased Evasion Rating, 5% increased Attack Speed<br>**En Garde**: 3% chance to Block hits, 10% increased Evasion Rating |
| Ranger  C1 | middle | Quickdraw | **Quickdraw**: 8% increased Attack Speed<br>**Fast Hands**: 25% increased Damage with Exerted skills |
| Ranger  F1 | middle | Agility | **Agility**: +20 to Dexterity, 10% increased Evasion Rating<br>**Nimble**: 5% increased Movement Speed |
| Ranger  L | outer | Skirmisher | **Skirmish**: 10% increased Attack Speed<br>**Hit and Run**: Overkill damage heals you for 3% of it, 5% increased Movement Speed<br>**Lightning Reflexes**: 8% increased Attack Speed, 4% increased Movement Speed |
| Ranger  R5 | outer | True Aim | **True Strike**: +120 to Accuracy Rating, 20% increased Critical Strike Chance<br>**Deadly Range**: +20% to Critical Strike Multiplier<br>**Hawk Eye**: +100 to Accuracy Rating, 15% increased Critical Strike Chance |
| Ranger  P1 | rim | Duellist Archer | **Point Blank**: 20% increased Projectile Damage<br>**Steady Draw**: 8% less damage taken from boss wind-ups<br>**Snap Shot**: 10% increased Attack Speed |

### Ranger–Shadow

| Side | Slot | Where | Cluster | Notables |
|---|---|---|---|---|
| Ranger  E1 | middle | Barbed Tips | **Barbed Tips**: Hits have 15% chance to Poison<br>**Envenomed Fletching**: 15% increased Poison Damage, 5% increased Projectile Damage |
| Ranger  H1 | middle | Evasive Killer | **Evasive Killer**: 15% increased Critical Strike Chance, 5% increased Evasion Rating<br>**Duck and Weave**: 15% increased Evasion Rating |
| Ranger  M | outer | Toxic Arrows | **Toxic Arrows**: 20% increased Poison Damage, 5% increased Projectile Damage<br>**Lingering Shafts**: 25% longer Poisons<br>**Weakening Venom**: Poisoned enemies deal 5% less damage |
| Ranger  R6 | outer | Venom Volley | ★ **Venom Volley**: Venom Volley: Projectiles always Poison, and Poisons spread when the target dies<br>**Pinpoint**: +20% to Critical Strike Multiplier<br>**Bitter Draught**: 8% increased Damage against Marked enemies, 10% increased Poison Damage |
| Ranger  P4 | rim | Shade Hunter | **Shade**: 20% increased Evasion Rating<br>**Silent Shot**: 25% more critical damage against full-Life enemies<br>**Night Hunter**: 10% increased Damage against bosses and rare enemies |
| Shadow  C1 | middle | Trickery | **Trickery**: 10% increased Evasion Rating, 10% increased Critical Strike Chance<br>**Misdirection**: 12% increased Evasion Rating |
| Shadow  F1 | middle | Envenom | **Envenom**: Hits have 10% chance to Poison<br>**Venomous Touch**: 15% increased Poison Damage |
| Shadow  L | outer | Cutpurse | **Cutpurse**: 10% increased Item Rarity<br>**Pickpocket**: 10% increased Gold found from Monsters<br>**Quick Fingers**: 6% increased Attack Speed |
| Shadow  R5 | outer | Poisoned Blades | **Poisoned Edge**: 15% increased Poison Damage<br>**Lethal Dose**: +15% to Critical Strike Multiplier, 5% increased Poison Damage<br>**Slow Burn**: 15% longer Poisons |
| Shadow  P1 | rim | Phantom Assassin | **Unseen Blade**: 25% increased Critical Strike Chance<br>**Vapour**: 15% increased Evasion Rating<br>**Killing Spree**: Overkill damage heals you for 3% of it, 5% increased Movement Speed |

### Shadow–Mage

| Side | Slot | Where | Cluster | Notables |
|---|---|---|---|---|
| Shadow  E1 | middle | Blight | **Blight**: 20% increased Chaos Damage<br>**Corrosion**: 20% longer Poisons, 5% increased Chaos Damage over Time |
| Shadow  H1 | middle | Occultist | **Occult Ward**: +40 to maximum Energy Shield<br>**Profane Bloom**: 6% increased Damage against Cursed enemies, 6% increased Chaos Damage |
| Shadow  M | outer | Rot | **Rot**: 25% increased Chaos Damage over Time<br>**Entropy**: 10% increased Doom built, Hits have 5% chance to Poison<br>**Decay**: Poisoned enemies deal 6% less damage |
| Shadow  R6 | outer | Withering | ★ **Withering Touch**: Withering Touch: Your Chaos Damage over Time Withers enemies (5% increased Chaos Damage taken per stack, up to 10)<br>**Creeping Death**: 15% increased Chaos Damage<br>**Pestilence**: Poisons spread to an adjacent enemy when the target dies |
| Shadow  P4 | rim | Void Touched | **Void Touched**: +15% to Chaos Resistance, 10% increased Chaos Damage<br>**Siphon**: 0.3% of damage leeched as Life, 5% increased Chaos Damage over Time<br>**Hollow Eyes**: 10% increased Critical Strike Chance, +10% to Critical Strike Multiplier with Spells |
| Mage  C1 | middle | Dark Arts | **Dark Arts**: 20% increased Chaos Damage<br>**Profane Focus**: 6% increased Cast Speed |
| Mage  F1 | middle | Eldritch | **Eldritch Battery**: +40 to maximum Energy Shield, 10% increased maximum Mana<br>**Abyssal Lore**: +10% to Chaos Resistance |
| Mage  L | outer | Conjurer | **Conjurer**: 20% increased Spell Damage<br>◆ **Void Echo**: 10% more damage with repeats (Multistrike, Spell Echo), 5% increased Chaos Damage<br>**Unholy Focus**: 8% increased Cast Speed |
| Mage  R5 | outer | Doomsayer | **Doomsayer**: 20% increased Doom burst Damage<br>**Creeping Doom**: 15% increased Doom built<br>**Black Omen**: +15% to Chaos Resistance |
| Mage  P1 | rim | Plague Mage | **Plague Mage**: 20% increased Chaos Damage over Time<br>**Withered Mind**: 8% reduced Mana Costs<br>**Cold Void**: 6% increased Damage against Chilled or Frozen enemies, 6% increased Chaos Damage |

### Mage–Templar

| Side | Slot | Where | Cluster | Notables |
|---|---|---|---|---|
| Mage  E1 | middle | Prismatic Ward | **Prismatic Ward**: +40 to maximum Energy Shield, +5% to all Elemental Resistances<br>**Spark**: 15% increased Elemental Damage |
| Mage  H1 | middle | Insulation | **Insulation**: 20% increased Energy Shield<br>**Grounding**: 5% reduced elemental damage taken |
| Mage  M | outer | Runic Ward | **Runic Conductor**: Runic Conductor: +2% increased Elemental Damage per socketed Rune across equipped gear, +6% to all Elemental Resistances<br>**Glyph Shield**: 15% increased Energy Shield<br>**Aegis Script**: 15% stronger absorb Shields |
| Mage  R6 | outer | Unbroken Ward | ★ **Unbroken Ward**: Unbroken Ward: Energy Shield Recharge is never interrupted; it slows to half while you are hit<br>**Shimmer**: 25% increased Energy Shield<br>**Reflective Ward**: 5% reduced elemental damage taken |
| Mage  P4 | rim | Elemental Focus | **Conflux**: 20% increased Elemental Damage, +5% to all Elemental Resistances<br>**Arcane Shell**: +50 to maximum Energy Shield<br>**Attunement**: 20% faster Energy Shield Recharge |
| Templar  C1 | middle | Warding | **Warding**: +12% to all Elemental Resistances<br>**Elemental Aegis**: 5% reduced elemental damage taken |
| Templar  F1 | middle | Hallowed Shield | **Hallowed Shield**: +30 to maximum Energy Shield, 4% chance to Block hits<br>**Sacred Ward**: 15% stronger absorb Shields |
| Templar  L | outer | Spirit Weave | **Spirit Weave**: 15% increased Energy Shield, 5% increased maximum Life<br>**Elemental Faith**: 15% increased Elemental Damage<br>**Blessed Recharge**: 20% faster Energy Shield Recharge |
| Templar  R5 | outer | Radiant Ward | **Radiant Ward**: 20% increased Energy Shield<br>**Prism**: +8% to all Elemental Resistances<br>**Lightbound**: 10% increased Elemental Damage, 10% increased Elemental Damage while above 80% Life |
| Templar  P1 | rim | Spellward | **Spellward**: 10% increased Energy Shield, 10% increased Spell Damage<br>**Totem Ward**: 20% increased Totem Life, 5% reduced Damage taken while you have a Totem<br>**Glacial Faith**: Glacial Bulwark: Take 15% less Physical and Cold Damage while Chilled or fighting Chilled/Frozen enemies, 10% stronger absorb Shields |

### Templar–Warrior

| Side | Slot | Where | Cluster | Notables |
|---|---|---|---|---|
| Templar  E1 | middle | Zealot | **Zealot**: 15% increased Elemental Damage with Attacks<br>**Holy Shield**: 3% chance to Block hits |
| Templar  H1 | middle | Consecrated | **Consecrated Ground**: Regenerate 1% of Life per second, +6% to all Elemental Resistances<br>**Bless the Blade**: Gain 5% of Physical Damage as extra Fire Damage |
| Templar  M | outer | Inquisition | **Inquisitor**: 20% increased Elemental Damage with Attacks<br>**Righteous Shield**: 4% chance to Block hits, +40 to Armour<br>**Brand of Faith**: 10% increased Damage against Cursed enemies |
| Templar  R6 | outer | Holy Retort | ★ **Holy Retort**: Holy Retort: After you block, your next attack adds the blocked damage as Fire Damage<br>**Blessed Bulwark**: 4% chance to Block hits, 10% increased Armour<br>**Searing Strikes**: 15% increased Fire Damage, 5% increased Elemental Damage with Attacks |
| Templar  P4 | rim | Crusader's Oath | **Crusader's Oath**: 15% increased Damage while holding a Shield<br>**Holy Armour**: Armour also applies to 10% of elemental damage<br>**Faithful**: +8% to all Elemental Resistances |
| Warrior  C1 | middle | Smithing | **Master Artisan**: Master Artisan: +25% increased effect of Crafted Modifiers on equipped items, +20 to maximum Life<br>**Heavy Armorer**: Heavy Armorer: +50% increased base Defences and Implicits from equipped Body Armour |
| Warrior  F1 | middle | Forge Fire | **Forgefire**: Gain 6% of Physical Damage as extra Fire Damage<br>**Tempered**: +6% to Fire Resistance, 10% increased Armour |
| Warrior  L | outer | Battle Priest | **Battle Priest**: 15% increased Elemental Damage with Attacks<br>**Iron Faith**: +6% to all Elemental Resistances, 10% increased Armour<br>**Rally**: 10% increased Warcry Effect, 5% increased Elemental Damage with Attacks |
| Warrior  R5 | outer | Templar's Guard | **Templar's Guard**: 3% chance to Block hits, +60 to Armour<br>**Vow**: 8% less damage taken from boss wind-ups<br>**Penance**: 10% more damage on your next hit after using a guard skill, Blocking a hit restores 2% of Life |
| Warrior  P1 | rim | Anvil | **Anvil**: 20% increased Armour, 3% chance to Block hits<br>**Hammerfall**: 15% increased Damage with One-Handed Weapons<br>**Tempered Will**: +10% to all Elemental Resistances |

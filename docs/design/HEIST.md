# Thieving and Heist

Act 2's new skill, from [ACT_RECIPE.md](ACT_RECIPE.md): one trainable skill that feeds its own game system and produces
crafting materials. Data is in `src/data/heist.ts` and `src/data/skills.ts`, the rules in `src/engine/heist.ts`, the page
in `src/ui/components/HeistBoard.tsx`.

## The loop

**Thieving** is the skill. **Heist** is the system it feeds.

1. **Lift purses.** Marks are gathering-style nodes with no inputs, one or two per Act 2 area. They pay gold and
   Rogue's Markers. The Cinder Road opens the skill, so any Act 2 character can start at once.
2. **Set up a job.** A job costs Markers and runs as a set of timed rooms. Each room is richer than the last, each has a
   higher chance of an alarm, and the vault is in the last room.
3. **Choose how deep to go.** Before the run you set the room to walk out after. That's the whole decision: nothing needs
   clicking mid-job.
4. **Repeat.** A job runs on repeat. When Markers run out it goes back to lifting purses on the mark that fills them
   fastest ("casing the job"), then starts the next run by itself. That's why a night away never stops.
5. **Spend the take.** Contraband goes to the Crafting Bench. Spare Markers and gold train the crew, which makes the next
   run safer, faster or more forgiving.

The fiction: the Khanate raiders stripped the west, and Caravan's End is where it all got left. You're robbing the robbers:
their toll houses, tally tents, grave caches, stables and, last, the tribute under the Burning Throne.

## What it makes, and why that isn't the same thing again

| Material | Does | Comes from |
|---|---|---|
| **Fossils** | Bias which mods roll | Mining |
| **Essences** | Force one mod | Foraging |
| **Resin** | Raise item level | Woodcutting |
| **Shards** | Fuse into low orbs | All gathering |
| **Contraband** | **Protects** what's already on the item | Thieving and Heist |

Every other material helps you hit a mod. Contraband stops you losing one. It's the first skilling material that matters
on a rare, which until now was all combat orbs.

- **Forger's Seal:** spent with an Alteration, Chaos, Annulment or Divine. One mod you pick is left alone: it survives the
  reroll or removal with its values, and on a Divine it keeps its roll. Works alongside a Fossil. The Seal is used up
  every time, so a steady hand on a rare costs a Seal and a Chaos per try.
- **Locksmith's Wax:** takes an impression of an item, which travels with the item. Restoring puts its rarity, name and
  mods back exactly and uses up the impression. Orbs spent in between stay spent. It turns an Exalted slam from a gamble
  on the item into a gamble on the orb.
- **Rogue's Marker:** Thieving's own money. It buys jobs and rogues, and does nothing else.

Heist also pays what no skill has before: finished **rare gear** at the job's level, capped by campaign progress as smithed
gear is, and **Regal Orbs** from the later jobs. Chaos, Exalted, Divine and Annulment stay combat-only.

Marks are where the gold is. Heists pay less gold over a night than the best plain mark, and more of everything else.

**Crossover:** Seals and Wax also drop rarely from monsters and bosses from Act 2 on, so nothing here needs the skill.
Marks from Thieving 19 up have a very small chance at them too.

## Jobs

| Job | Thieving | Area | Rooms | Markers | Favours |
|---|---|---|---|---|---|
| The Cinder Toll | 1 | Cinder Road | 3 | 8 | Gold |
| The Salt Tithe | 8 | Saltpan Flats | 4 | 16 | Rogue's Markers |
| The Forger's Den | 14 | Blackgrass Sea | 4 | 24 | Forger's Seals |
| The Last Wagon | 20 | Caravan's End | 5 | 30 | Stolen rare gear |
| The Barrow Cache | 28 | Kurgan Fields | 5 | 38 | Locksmith's Wax |
| The Khan's Remounts | 36 | Thunder Plateau | 5 | 46 | Regal Orbs |
| The Pyre Vault | 45 | Pyre Temple | 6 | 56 | Seals and Wax |
| The Khan's Tribute | 55 | Burning Throne | 7 | 70 | A bit of everything |

A later job isn't simply better: the top jobs pay far fewer Seals a night than the Forger's Den, so you pick by what you
want next, as you do with alternate gathering nodes.

## The numbers

- **Alarm:** room *n* has `alert × n`% chance, times stealth, the Lookout and Inside Man. Stealth takes 1.5% off per
  Thieving level above the job, down to 35%. An old job gets safe enough to take to the vault every time.
- **An alarm** ends the job. You keep half the take, rounded by chance so a lone Seal is a coin flip. The XP for every room
  is kept, and the repeat carries on. The Markers are gone.
- **XP:** a repeating job trains about 1.1–1.5× as fast as lifting the best plain mark, measured over 8 h offline. At the
  top that's about 2.7–3 XP a second, so Thieving 99 stays around the reset's 53 days.
- **Yield:** about 28 Seals a night on the Forger's Den at Thieving 17, 12 Wax on the Barrow Cache at 31, 30 rares on the
  Last Wagon at 23, all with an empty crew and going to the vault.

## Crew

Rogues cost Markers and gold (`25 × rank²` and `1000 × rank²`, to rank 5) and only help while on the crew, which holds one
at first, two at Thieving 30 and three at 60. So the crew is a choice as well as a sink.

| Rogue | From | Per rank |
|---|---|---|
| Yusra, Lookout | 1 | 7% lower alarm chance |
| Old Temur, Locksmith | 5 | 6% faster rooms |
| Bayan, Fence | 10 | 8% more of the take kept on an alarm |
| Ilke, Cutpurse | 20 | 10% more Rogue's Markers lifted |

Lifting a plain mark without a job running is how you save Markers for them.

## Skilling tree

The branch sits at 180°, between Smithing and Alchemy: Quick Hands (5% faster), Light Fingers (50% more Markers), Inside Man
(20% lower alarm chance), and the keystone Clean Getaway (an alarm costs none of the take, jobs cost 50% more Markers).
Thieving's level counts towards tree points.

## Rules kept

- One activity at a time: a job is an `action`, so starting anything else ends it, and the take with it.
- Offline runs the same code at the same speed, Overtime included. An alarm is not a stop and doesn't show as one.
- Skill levels, crew and job settings are per character.
- Save v22 adds `heist` and `skills.thieving`. An impression is an optional field on the item.

## Later

- Each new act can add a job and a band of marks, as the band template in [SKILLING_REWORK.md](SKILLING_REWORK.md) §6 does.
- Auto-crafting doesn't take a Seal yet: "Chaos, keeping this mod, until that mod" would be the natural next method.
- The sim's `--profile heist` runs Heist every night from Act 2. Its exit rule is a flat 40% clean chance.

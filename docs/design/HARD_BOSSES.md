# Hard mode bosses

Draft, 2026-10-30, for you to make the calls early. Built in [ROADMAP.md](../ROADMAP.md) milestone 9. Levels, names and
unique effects are starting suggestions. Rule types are described loosely, because Milestone 1 is finalising them now.

## Settled

- New bosses. Keys drop from monsters or are crafted through skilling.
- Boss moments only a player can do well at first, like clicking a weak point or picking which add to kill.
- Reactive rules give a way to handle those moments for idle clears.
- A top-end character clears them on idle without dying, and the sim can test that.

## How a fight works

- **Base kit:** each boss uses today's mechanics (slam, nova, summon, enrage, ward, scorch), at much higher numbers.
- **One moment:** each boss adds one new moment that comes round every 30–45 seconds. Something happens on the field, you
  have a few seconds to answer it, and the fight gets better or worse depending on what you did.
- **Three ways through:**

| Player | What happens at a moment |
|---|---|
| Fresh to the boss, no rule set | Misses it. Survivable for a while, but it snowballs |
| Playing by hand | Answers it well. Can beat the boss before the gear would allow it on idle |
| Right rule and a strong build | Answers it every time. Safe to leave running offline |

## Roster

### 1. Ossuar, the Hollow Mountain (about level 72)
- **Theme:** a mountain that learned to walk. Physical damage, slow and huge.
- **Core mechanic:** stone plating. Ossuar takes greatly reduced damage until the plating cracks.
- **Boss moment: weak point.** A cracked hex opens beside the boss for 6 seconds. Hit it and the plating is off for 10
  seconds. Miss it and the plating thickens.
- **Reactive rule:** "when a weak point opens, aim at it", on a skill that can reach it.
- **Stat check:** physical. Armour and slam reduction, plus reach, since melee has to close in past the adds.
- **Key:** Marrow Key. Drops from mountain-themed maps. Smithing crafts it.
- **Drops:** Marrow Shards (armour and physical forced mods). Unique: *Faultline*, a mace whose slams also hit ring 2.

### 2. Mother Vael, the Last Choir (about level 75)
- **Theme:** a saint who won't stop singing. Lightning damage.
- **Core mechanic:** three choir adds walk in, one each from the left, top and right. Each gives the boss a different
  blessing: Wall (takes less damage), Haste (acts faster) or Mending (heals).
- **Boss moment: pick the add.** You only have time to kill one before the choir refills. The best pick depends on the
  moment: Mending when her life is low, Haste when you're being overrun.
- **Reactive rule:** "when a choir add appears, aim at it", with a set order such as Mending, then Wall, then Haste. A rule
  always picks the same way; a player reads the fight.
- **Stat check:** lightning resistance, plus area or fast single-target damage to kill an add in time.
- **Key:** Bell Key. Drops from city-themed maps. Gemcutting crafts it.
- **Drops:** Choir Glass (resistance and spell forced mods). Unique: *Last Hymn*, an amulet that casts your Area skill
  whenever a Guard skill blocks a hit.

### 3. The Undertow (about level 78)
- **Theme:** something vast under the Sunless Sea. Cold damage, freezes and chills.
- **Core mechanic:** the tide rises. Each wave leaves more chilled ground under you and adds a stack that slows your skills.
- **Boss moment: break the channel.** The Undertow channels Deep Call for 5 seconds. Deal a set amount of damage in that
  time, or it lands and adds several tide stacks at once. Saving Burst skills for it is the skill.
- **Reactive rule:** "hold this Burst skill until the boss channels". The rule costs you damage between channels, which is
  the trade.
- **Stat check:** cold resistance, chill and freeze defence, and burst damage.
- **Key:** Abyssal Key. Drops from sea-themed maps. Alchemy crafts it.
- **Drops:** Black Pearl (speed and ailment forced mods). Unique: *Riptide*, boots that pull chilled monsters one ring
  closer, which is a real prize for melee.

### 4. The Twin Regents (about level 82)
- **Theme:** two rulers of the Shattered Throne, one fire and one cold. Two bosses on the field at once.
- **Core mechanic:** bonded life. If one Regent falls too far behind the other, the healthier one drains it back up. If one
  dies, the other takes on its powers, so they should die close together.
- **Boss moment: keep them even.** Every so often a Regent raises a guard and takes no damage, forcing you to switch target
  at the right time. Click-locking one the whole fight loses it.
- **Reactive rule:** a "highest life" aim, and "switch when my target is guarded". The bar's targeting setting already has
  Highest life, so this is the closest to existing behaviour.
- **Stat check:** fire and cold resistance together, and single-target damage on a skill that can reach both.
- **Key:** Regent's Key, in two halves. Each half drops from throne-themed maps; Smithing joins them.
- **Drops:** Throne Ash (forced mods of your choice, very rare). Unique: *Twinned Crown*, a helmet that makes every second
  skill cast repeat at reduced damage.

### 5. The Crownless (about level 86)
- **Theme:** what sat on the throne before the acts began. Changes damage type between phases.
- **Core mechanic:** three phases, one each for fire, cold and lightning, with a physical slam throughout.
- **Boss moment: all of them.** Weak point, pick the add, then break the channel, one per phase, closer together.
- **Reactive rule:** no new rule. It tests whether your full setup holds with every moment in one fight, so it needs the
  most rule slots.
- **Stat check:** all three resistances at cap, plus armour or block.
- **Key:** Crownless Key. Smithing combines one key from each of the other four. Very rarely drops from top-tier maps.
- **Drops:** Crownless Sigil (needed for the highest past-the-limit crafts). Unique: *The Unwritten*, a body armour that
  gives one notable from your class's other ascendancy.

**Every boss** also gets a collection log entry, and its material ties it to [Milestone 10](../ROADMAP.md) crafting, so
each boss has a reason to be farmed for a particular build. Classic mode gets keys from drops only, which the map drops
already cover.

## Open questions

Each has about two ideas, with my pick first.

### 1. How many bosses?
- **A. Five, as above.** Each one has its own moment, and more can be added later. (My pick.)
- **B. Seven.** One for each of Acts 1–6 with a twist on that act's mechanic, then The Crownless. Stronger link to the
  campaign, but moments start to repeat.

### 2. How do bosses tier up?
- **A. Three tiers per boss.** Each tier has its own key and the same moment, with shorter windows, more damage and better
  drops. Month 3 is first kills on tier 1; month 6 is farming tier 3. (My pick.)
- **B. One version of each boss, with modded keys.** Craft a key like a map to add danger and drops, such as "+30% boss life,
  +50% unique chance". More crafting depth, but harder for the sim to test every mix.

### 3. What does a key cost you?
- **A. Used when the fight starts, win or lose.** Simple, and it matches maps being consumed per run. (My pick.)
- **B. Used only on a kill.** Friendlier for hand-played attempts, but it removes all the risk of a failed fight.

### 4. How common are keys?
- **A. A supply.** One map farming session gives enough keys for a long offline boss run, and uniques stay the rare part.
  Fits "keeping a supply going" and "easily farm". (My pick.)
- **B. An event.** A handful a day, with better drops per kill. Each fight feels bigger, but offline boss farming mostly
  disappears.

### 5. How good is a rule compared to a player?
- **A. A rule makes you safe, a player does better.** A rule always stops the bad result. A well-timed manual answer also
  gives a bonus, such as a longer plating break. Keeps being there worthwhile, as the vision says. (My pick.)
- **B. A rule is as good as a player.** Once set up, there's no reason to watch. Simpler, and it fits the idle fantasy.

### 6. How do rules choose a target?
Rules today decide whether a skill fires, not what it aims at. Moments need that. See [Fit with today's game](#fit-with-todays-game).
- **A. An aim option on each skill's rule.** Keeps rules per skill, as settled. (My pick.)
- **B. One plan per boss.** A small panel listing that boss's moments, each with a chosen answer. Easier to read, but it's a
  second place to set up automation.

### 7. Where do players start a fight?
- **A. The Map Device.** Keys sit beside maps, and auto-run works the same way, with no new screen. (My pick.)
- **B. A new hideout station.** A Boss Altar with its own upgrades, like more attempts queued. More to build toward, but a
  second auto-run to build.

### 8. What stops a fight running forever?
A weak build on idle could get stuck against a boss that heals through its moments.
- **A. A hard enrage.** After about five minutes the boss's damage climbs until the fight ends. Clear for players, and the
  sim gets a firm result. (My pick.)
- **B. Moments snowball instead.** No timer; each missed moment makes the boss stronger until the fight ends by itself. More
  natural, but fight length is harder to predict.

## Fit with today's game

What needs building, from reading `src/engine/combat.ts`, `src/engine/mechanics.ts` and `src/data/zones.ts`:

- **Already there:** wind-ups, the `bossCast` event, ward, adds, and click-to-target. Instilled flasks already trigger on a
  boss cast.
- **Rule aim, the one ask of Milestone 1:** rules only allow or block a skill. Aim comes from one bar-wide setting or a
  clicked lock. Question 6 needs rules to leave room for an aim. The current "enemy casting" check is also a plain yes or
  no, so a rule can't yet tell a slam from a channel.
- **Weak points as field objects:** making one a monster with no attack means clicking, targeting, range and closing in all
  work as they do today.
- **Offline:** `bossCanSpawn` keeps never-beaten bosses from appearing offline. Hard bosses need to skip this, since a strong
  build with reactive rules is allowed to beat a new boss offline.
- **Damage types:** the game has physical, fire, cold and lightning only, so the stat checks above use just those.
- **Two bosses:** the Regents need a fight with two bosses. Today one boss spawns and the fight's rules assume that.
- **No zone:** hard bosses don't belong to a zone, and combat runs on a zone id, so each needs a small arena entry.

## Sim tests

Moments must live in the engine, not the UI, so the sim and offline progress run the same fight a player sees.

| Test | Character | Pass |
|---|---|---|
| Top-end idle | Top-end build of each class, rules only, tier 3 | 100 kills of each boss, no deaths |
| Rules matter | Same character, simple rules only | Can't clear reliably |
| Gear matters | Month 3 character, rules only | Can't clear tier 1 reliably |
| Manual pays off | Month 3 character, bot answers moments with a human delay | Clears tier 1 |
| Offline | Top-end idle, run through offline progress | Same result as online |

The first test is the Milestone 9 **Done** line. The other four prove the bosses are hard in the way you asked for.

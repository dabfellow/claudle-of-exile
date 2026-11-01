# Minions and storms

Act 5's skill batch, Tides and summons (see [ACTS_4_6.md](ACTS_4_6.md)). Built 2026-11-01 on `claude/act5-skills`. The code
is in the minions section of `src/engine/combat.ts`, the end of `src/engine/battlefield.ts`, and `effect.minion` /
`effect.storm` in `src/data/gems.ts`.

## How a minion works

- **It takes a hex.** Melee monsters are held by bodies, so a summoner plays by holding a line out on the field while
  the player stands behind it. A minion that shared a hex would just be a damage-over-time skill with a picture.
- **It never blocks you.** When you close in or drag something, a minion in the way trades places with it.
- **It stays off the gates.** Minions walk no further than ring 3, so arrivals keep coming.
- **Monsters fight it.** Anything but a boss stops walking once it's beside a minion. A monster hits a taunter in reach
  first, then a minion beside it, then you. A melee monster already on you stays on you, and bosses' slams always go for
  you. A boss's nova hits every minion, so a long fight wears the crew down.
- **It shares your Armour and resistances**, so defence gear works for a summoner. It can't evade or block.
- **It keeps going between packs.** It walks back to ring 2 and recovers 10% of its life per second once the field is
  clear. It goes when you leave the area or die, or when its gem leaves the bar.
- **Who it hits:** your clicked target if it can reach it, otherwise the nearest. Minions leave martyrs alone, because
  martyrs only take aimed blows and the boss mechanic would otherwise solve itself.

## Caps

- **Each gem** keeps up its own number: 3 thralls, 2 boarders, 2 Tidecallers, 1 Brute, 1 Leviathan. Full Muster adds 1.
- **The field** holds 6 at once from every gem together. That's a Walk pace's monster cap, so a crew can match a pack but
  not smother it. A summon past the cap calls nobody and never pushes out what's there, so two gems can't fight over room.
- There's no mana reservation: you pay on the cast. What holds a crew in check is that it dies and has to be replaced.

## Scaling

- A minion's hit **is the skill's hit**, rolled through the same code as your own. Attack minions use your weapon and
  attack stats, spell minions use your spell stats. So existing gear and passives work, and every class can summon.
- Gem level raises the damage as it does for any skill, and life by 3% a level. Life starts as a % of your maximum life,
  so it keeps pace with you.
- Three new stats sit on top: `minionPct`, `minionLifePct` and `minionSpeedPct`. Today only Drowned Bell gives them.
- Their hits count as yours, so they fill Rage, Malice and Momentum, leech and apply ailments. They can't spend anything
  saved for your own next attack (Ambush, Counterweight, guaranteed crits).
- All supports read the gem live. Damage, crit, leech, Multistrike, Spell Echo, Chain and Pierce all work on minions.

## Staying up by rule

"When its effect is not active" is true when a gem has fewer minions than it can keep up, or fewer storms. So a summon
tops itself up with a free rule and no new condition. It's each summon's and most storms' default.

## Storms

A storm sits on the cells where it landed, and strikes everything standing there every so often until it blows out. It
can't miss, and it runs its course with nothing on the field. Monsters don't path around it as they do hazards, because
the point is that they walk through it. It uses the same hit code, so ailments, crit and supports work. Lingering stretches
it. A gem keeps 1 up, and a new one blows out the oldest (Stormfront makes that 2).

- **Squall** (dex) is attack-based and wanders after the nearest enemy.
- **Thunderhead** (int) stays put and strikes hard.
- **Whirlpool** (int) is wide, chills, and draws what's in it toward its centre.

## The batch

| Skill | Attr | Does | Signature |
|---|---|---|---|
| Drowned Thralls | Str | 3 melee minions | Press Gang: kills heal the crew |
| Barnacle Brute | Str | 1 taunting tank | Crusted Hide: 40% less damage |
| Riptide | Str | Sweep that drags a ring in | Drag Under: stuns what it drags |
| Drowned Bell | Str | Minion damage and speed buff | Deep Toll: heals the crew |
| Boarding Party | Dex | 2 ranged minions | Broadside: shots chain |
| Harpoon | Dex | Single target that drags | Reel In: drags to melee range |
| Squall | Dex | Wandering storm | Flensing Wind: breaks armour |
| Tidecallers | Int | 2 caster minions that chill | Deep Chill: more damage to chilled |
| Thunderhead | Int | Lightning storm | Charged Air: lightning vulnerability |
| Whirlpool | Int | Wide cold storm that pulls | Black Ice: freezes the chilled |
| Call the Leviathan | Int | Big temporary minion | Abyssal Hunger: kills extend it |

General supports: Savage Crew, Hardened Crew and Full Muster for minions, Gale Force and Stormfront for storms.

Levels run 50–56 and signatures 6 higher, as usual. Saves need no version bump: both lists are optional, and old fights
start them empty.

## Art gaps

Minions wear existing monster art, and no art was generated:

| Minion | Wears | Gap |
|---|---|---|
| Drowned Thrall | `ghoul` | Fine |
| Barnacle Brute | `coralgolem` | Fine |
| Boarder | `gunner` | Fine |
| Tidecaller | `tidecaller` | Fine, and the same as the Act 1 monster |
| Leviathan | `wyrmling` | No sea beast in the packs: this is the biggest gap |

Gem icons use initials, as there are no glyphs for the batch yet. Storms are drawn with CSS on the hex.

## Not built

Nothing on gear or the passive tree gives minion stats yet, so a summoner has no build-defining nodes.

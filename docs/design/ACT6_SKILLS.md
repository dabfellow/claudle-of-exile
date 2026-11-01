# Act 6 skills: The last empire

The strongest skills in the game, decided in [ACTS_4_6.md](ACTS_4_6.md): two signature skills per attribute, and supports that
bend rules rather than add numbers. Each skill changes what a build wants to do. All six ask 1.3 times the usual attribute
(`GEM_ATTR_MULTS`), and they need levels 58–62, inside Act 6's monster levels of 57–65.

## Skills

| Skill | Attr | Level | Tags it uses | What changes | Signature (level + 6) |
|---|---|---|---|---|---|
| **Worldbreaker** | Str | 58 | heavy | You want to be hit: damage taken in the wind-up joins the blow at 300%, shields included | **Unmoved:** 25% less from hits in the wind-up, and the blow still counts all of it |
| **The Last Legion** | Str | 60 | minion | Minions become a defence: one legionary takes 30% of each hit on you, before shield and energy shield | **Dying Oath:** a fallen legionary leaves a shield worth half its life |
| **Death Warrant** | Dex | 60 | curse | Burst windows: 50% of everything the target takes lands again when the curse ends. A death passes the debt to the nearest enemy | **Collective Guilt:** enemies next to the target pay half as well |
| **Gale of Knives** | Dex | 58 | storm | Attack speed feeds a storm: it stays around you, and every attack you use makes it strike | **Reaping Wind:** each kill keeps it 1s longer |
| **Royal Decree** | Int | 62 | cast | The bar becomes one combo: every other ready damage spell fires free and instantly at 60%, heavy ones with no wind-up | **Absolute Power:** spells on cooldown fire too |
| **Eye of the Storm** | Int | 58 | shield, storm | Defence is offence: the guard's shield carries a storm, each strike adds 10% of the shield left, and it ends with the shield | **Eyewall:** each enemy struck gives back 2% of the shield |

## Supports

| Support | Fits | Rule it bends |
|---|---|---|
| **Reprisal** | Any hit, not heavy, minion or storm | Changes the trigger: fires when a hit lands on you, in no time, instead of by rule |
| **Succession** | Any hit, not heavy, minion or storm | Changes the trigger: fires when you kill, in no time, instead of by rule |
| **Imperial Reach** | Any hit, not minion or storm | Changes the target: hits the whole field, whatever the shape, for 55% less damage and double cost |
| **Goaded** | Heavy | Each hit on you cuts 15% off the wind-up |
| **Eternal Ward** | Shield | The shield has no timer and stays between packs, at 20% less shield |
| **Funeral Rites** | Minion | A minion that falls strikes its neighbours for 3 times its hit |
| **Crowned Storm** | Storm | Any storm stays around you, over at least 2 rings, instead of on the target |

## Small calls

- **Triggered skills ignore their rules.** A skill with Reprisal or Succession never fires in the turn order, but can still be
  pressed. It pays its cost and cooldown, can't close in, and has a 1s minimum between firings (`TRIGGER_COOLDOWN_MS`), because
  single-target attacks have no cooldown of their own. Triggers still keep the Life reserve that rules keep.
- **Heavy, minion and storm skills can't be triggered.** A heavy blow with no wind-up would undo what heavy means. Royal Decree is
  the one exception, and it's limited by its 24s cooldown.
- **Royal Decree calls damage spells only**, so it can't refresh buffs, curses or plain guards. Eye of the Storm deals a hit, so
  it counts.
- **Stormfront doesn't fit Eye of the Storm:** there's one shield at a time, so a second storm would add only cost.
- **A debt is collected early if the curse is replaced**, so recasting Death Warrant never wastes what's been counted. Bosses
  take half its effect, like every curse.
- **Worldbreaker counts damage after your defences but before shields**, so a shield adds to the blow while keeping you alive.

## Rules

Each skill suggests a rule (`defaultRule`), and no new rule condition is needed: Worldbreaker at 2 enemies; The Last Legion, Death
Warrant and Gale of Knives on `notActive`; Royal Decree above 50% mana; Eye of the Storm on `enemyCasting`, like other guards.

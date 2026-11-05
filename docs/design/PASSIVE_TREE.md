# Character passive tree design

Decided and built 2026-11-04. This is the design contract for the character passive tree. The broader division between
character, ascendancy and skilling trees remains in [TREES.md](TREES.md).

## The tree's job

The character tree creates builds. It does not deliver class mechanics; Rage, Momentum, Riposte, Malice, Mana is
Power and Fervor belong to ascendancies. A starting position makes nearby ideas cheaper, but no class owns a region
and every character can cross the whole tree.

The tree should repeatedly ask useful questions:

- Which offence am I scaling, and under what condition?
- Which defence am I trusting?
- Do I deepen this cluster, take its mastery, or travel toward a second theme?
- Is a distant synergy worth its attribute road?

## Attributes are the price and the reward of travel

Travel nodes are necessary because skill gems and equipment have Strength, Dexterity and Intelligence requirements.
They are not empty tax nodes. Pure sectors give +10 to their attribute, hybrid sectors give +5/+5, the centre gives
all attributes, and the roads themselves let an off-attribute build keep levelling its chosen skills.

Travel should still be scarce. The old tree placed a node about every 80 layout units and produced 423 travel nodes.
Roads now place one at most every 160 units and produce 249. Long journeys retain a real cost, while nearby clusters
are no longer separated by several nearly identical clicks.

## Topology

The tree has six 60-degree regions around Exile's Crossing, with three bridges between every neighbouring pair. Each
class start has nearby clusters, a route inward and multiple routes outward. Crossing another class's start is never
required.

The built tree has 847 nodes:

| Kind | Count | Purpose |
|---|---:|---|
| Starts | 7 | Six class positions and the Exile |
| Attribute travel | 249 | Requirements and geographic opportunity cost |
| Cluster smalls | 282 | Focused scaling on the way to a choice |
| Notables | 198 | Strong packages, conditions and build synergies |
| Masteries | 90 | One chosen effect shared by clusters of a theme |
| Keystones | 21 | Rules to build around, with a cost or constraint |

Notables plus masteries must continue to outnumber travel nodes. Adding distance is not an acceptable substitute for
balancing a powerful destination.

## Cluster grammar

Clusters are compact and recognisable:

- **Line:** two small passives, one notable and its mastery. A direct, early investment.
- **Fork:** one entry passive, then one small and one notable on either arm. The first decision is immediate; taking
  both arms rewards commitment without paying the entry twice.
- **Wheel:** four small approaches around three notables, with a mastery in the centre. A character can pass through,
  take the nearest payoff or circle around for several related effects.

There should normally be a meaningful destination within two or three allocated points. Small passives say what is
being scaled. Notables say how the build uses it. Masteries provide a situational choice. Keystones change a rule.

## Regions are affinities, not class lanes

| Region | Nearby strengths |
|---|---|
| Warrior | Heavy physical hits, stuns, Armour, guarding and blocking |
| Duelist | Fast attacks, crit finishers, Bleed and shields |
| Ranger | Projectiles, Accuracy, Evasion and attack speed |
| Shadow | Critical strikes, Poison and ailments |
| Mage | Spell damage, Mana, Energy Shield and recharge |
| Templar | Elemental damage, resistances and hybrid defences |

The borders are as important as the centres. Warrior/Duelist supports blocking and Bleed; Duelist/Ranger supports fast
accurate attacks; Ranger/Shadow supports projectile ailments; Shadow/Mage supports critical and chaos spells;
Mage/Templar supports elemental spells and hybrid Energy Shield; Templar/Warrior supports shields, Armour and
elemental attacks. Bridges should lead into these overlaps instead of merely shortening the route between classes.

## Balance rules

Balance routes as packages, not isolated nodes. Compare what a build receives after 5, 10, 20 and 30 points from each
start. A small node can be modest when it advances toward a strong notable, but no road should win solely because its
filler is overtuned.

Every supported build should have:

1. Two plausible early routes rather than one mandatory beeline.
2. A nearby offensive cluster and a nearby defensive or recovery choice.
3. At least one useful neighbouring-region synergy.
4. A reason to stop investing locally and a reason to keep investing deeply.
5. A late build-changing destination whose cost comes from geography or a real downside, not a milestone lock.

When balance is tested, record the shortest route cost, total attributes, offence, defence and number of meaningful
choices for representative builds. If most characters of a class take the same first ten nodes, change the topology or
the choices before changing raw numbers.

## Items and future expansion

Items may bend the tree rather than simply add more passive points: grant a notable, transform nearby passives, create
a shortcut or attach a new cluster at the rim. These effects should enable unusual combinations, but the base tree must
remain understandable and useful without them.

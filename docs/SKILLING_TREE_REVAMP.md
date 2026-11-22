# Skilling tree revamp

Design pass started 2026-11-21, after the per-skill review in [Skilling Progression](SKILLING_PROGRESSION.md) finished. Today's tree (`src/data/skillTree.ts`): 1 point per 10 total skill levels up to 36; a small core of general nodes; one branch per skill with "+5% speed" smalls, two notables (skill level 15 and 30) and a keystone at 50. Many nodes point at retired mechanics, and the new mastery buffs already give each skill steady power.

The tree covers 12 skills. Gathering: Mining, Woodcutting, Foraging, Thieving, Archaeology, Astrology. Production: Smelting, Forging, Woodcrafting, Gemcutting, Alchemy, Cartography. Agility, Cooking and Rune-carving are being removed.

## Decisions

- **Question 1, what the tree is for (2026-11-21): Both.** The owner pasted both options, read as both, matching my pick.
  - **Branches that bend each skill's twist.** Each branch works on its skill's new system, with no plain "+5% speed" nodes: Delve nodes make hazards rarer, giant nodes cut splinter losses, breeding nodes raise mutation chances, constellation nodes add a link, Forging nodes add a stage choice. Keystones are big rule changes.
  - **Bridges between skills.** Nodes between two branches tie those skills together (Woodcutting–Smelting: splinters burn hotter for better purity; Foraging–Alchemy: mutations give stronger infusions; Mining–Gemcutting: Crystal layers give bigger rough).
- **Question 2a, layout (2026-11-21): A — A ring of partners.** The 12 branches sit in a circle around the core, each next to the skills it naturally works with. Bridges sit in the gaps between neighbours, so a skill's place decides who it can bridge with.
  - Ring order (decided on the owner's behalf): Mining – Smelting – Forging – Woodcrafting – Woodcutting – Foraging – Alchemy – Astrology – Archaeology – Cartography – Thieving – Gemcutting – back to Mining. Bridges: Mining–Smelting, Smelting–Forging, Forging–Woodcrafting, Woodcrafting–Woodcutting, Woodcutting–Foraging, Foraging–Alchemy, Alchemy–Astrology, Astrology–Archaeology, Archaeology–Cartography, Cartography–Thieving, Thieving–Gemcutting, Gemcutting–Mining. (The Woodcutting–Smelting example from Question 1 isn't a neighbour pair, so it lives as a Smelting branch node instead.)
- **Question 2b, points (2026-11-21): A — One shared pool.** Points from total skill level, about 1 per 10 levels: roughly 118 at the very top against a tree of roughly 160 nodes, so nobody takes everything and the spend is the specialisation. Fills over months.
- **Question 3a, branch shape (2026-11-21): B — Each branch forks.** Partway out, each branch splits into two directions with their own notables and keystone.
- **Question 3b, bridges (2026-11-21): B — Bridge keystones.** Each bridge is a single big rule change tying the two skills together, with a cost.
- **Question 3c, core (2026-11-21): A — A small core of general perks:** offline speed, a stronger Focus double zone, better collectible odds.

## Node list (my picks, approved by the owner 2026-11-21)

Each fork has two notables and a keystone. Keystones and bridges always carry a cost. Numbers are placeholders for build-time tuning.

**Core:** Overtime (offline skilling faster), Sharp Focus (wider gold double zone in every minigame), Curious (hidden collectibles easier to find), Studious (more skill XP), Steady Hands (production sometimes keeps its inputs), Patient Crafter (auto-crafting sometimes skips a step's cost).

| Skill | Fork 1: notables → keystone | Fork 2: notables → keystone |
|---|---|---|
| Mining | **Deep Diver:** Sure Footing (hazards rarer in your deepest layers), Long Rope (pushes cost fewer supports) → **Into the Dark:** each push goes two layers; hazards come twice as often | **Prospector:** Nose for Ore (Rich traits more common), Fossil Eye (Fossil beds more common) → **Motherlode Hunter:** Motherlode layers three times as common; other layers yield less |
| Woodcutting | **Feller:** Clean Cuts (fewer splinters), Timber! (trunk cuts faster) → **Topple:** the giant falls when the trunk is half cut; the heart gives less | **Scout:** Far Sight (+1 scouted giant), Old Growth (legendary giants more common) → **Legend Seeker:** legends twice as common; one fewer scouted option |
| Foraging | **Wildcrafter:** Keen Eye (more wild variants), Rare Sightings (rarer wild mutations) → **Wild Heart:** wild finds can carry three mutations; Greenhouse grows slower | **Breeder:** Steady Lines (strains stabilise faster), Hybrid Vigour (hidden hybrids more likely) → **Unstable Genes:** offspring mutation chance doubled; parents' traits sometimes don't pass on |
| Thieving | **Planner:** Thorough Casing (prep items stronger), Inside Knowledge (one prep item per job is free) → **Perfect Plan:** fully prepped jobs never raise an alarm; jobs need a full board to start | **Cutpurse:** Quick Lift (marks faster), Deep Pockets (marks pay more gold) → **Opportunist:** any mark can give prep for any job; prep is weaker |
| Archaeology | **Linguist:** Context Clues (more hints per inscription), Mother Tongue (auto-reveal sooner) → **Polyglot:** a glyph cracked in one culture gives hints in all; chapters need one more inscription | **Excavator:** Light Touch (fewer fragile cracks), Deep Trench (more finds) → **Bulk Dig:** digs bring two inscriptions; each has half the hints |
| Astrology | **Charter:** Tight Lines (links stronger), Extra Point (+1 slot) → **Grand Design:** links count double; one fewer slot | **Stargazer:** Patient Watch (stars rank faster), Wide Field (research faster) → **Falling Sky:** fallen stars three times as common; watching ranks slower |
| Smelting | **Refiner:** Clean Flux (better purity odds), Hot Coals (charcoal from splinters burns hotter) → **Flawless or Nothing:** no Crude or Refined bars, more Pure and Flawless; far fewer bars | **Founder:** Big Crucible (bigger batches), Alloy Lore (master alloys cheaper) → **Master Founder:** master alloys need one fewer Flawless metal; they take twice as long |
| Forging | **Weaponsmith:** Keen Edges (edge choices stronger), Balanced Heads (shape choices stronger) → **Signature Style:** one chosen pattern gains a bonus stage; other patterns forge slower | **Armourer:** Thick Plate (temper choices stronger on armour), Sound Rims (rim choices stronger) → **Bulwark:** armour gains an extra defence roll; weapons forge slower |
| Woodcrafting | **Bowyer:** Strong Draw (bow dials go further), Fletcher's Eye (better bow rolls) → **Hair Trigger:** bow dials go much further; staves and wands can't go past neutral | **Staffwright:** Steady Balance (staff dials go further), Spell Grain (better caster rolls) → **Living Staff:** living woods settle twice as fast; bow dials narrower |
| Gemcutting | **Brilliant Cutter:** Extra Facet (+1 facet on small rough), Clear Lines (facets slightly stronger) → **Overcut:** gems take two extra facets; recutting gives nothing back | **Lapidary:** Bigger Stones (rough comes larger), Star Gazer (star stones more common) → **Cabochon:** every gem gets a free family facet; one fewer facet slot |
| Alchemy | **Infuser:** Strong Pour (infusions stronger), Deep Infusion (infusions rank faster) → **Overcharged:** infusions 50% stronger; flasks hold one fewer charge | **Brewer:** Full Belt (flasks refill faster), Lasting Draught (flask effects last longer) → **Bottomless:** flasks slowly refill during fights; infusions weaker |
| Cartography | **Boss Hunter:** Boss Rumours (boss map scraps more common), Guardian Lore (guardian maps cheaper) → **Trophy Hunter:** boss maps twice as common from scraps; vault maps can't be made | **Vault Cracker:** Treasure Rumours (vault scraps more common), Lockbreaker (vault maps cheaper) → **Strongroom:** vault maps hold double loot; their monsters are much tougher |

**Bridge keystones** (need both neighbouring branches reached):

| Bridge | Keystone: effect; cost |
|---|---|
| Mining–Smelting | **Ore to Ingot:** some mined ore comes out as Refined bars; Mining slower |
| Smelting–Forging | **Hot from the Furnace:** Pure and Flawless bars push Forging rolls further; Forging uses more bars |
| Forging–Woodcrafting | **Fitted Hafts:** hafted weapons gain one tuning dial; Woodcrafting slower |
| Woodcrafting–Woodcutting | **Chosen Timber:** scouts favour the wood your saved tunings use; giants yield a little less |
| Woodcutting–Foraging | **Forest Floor:** felled giants drop a seed variant; Greenhouse grows slower |
| Foraging–Alchemy | **Living Infusions:** mutated herbs give much stronger infusions; unmutated herbs can't infuse |
| Alchemy–Astrology | **Starlit Draughts:** your constellation's strongest star also boosts flask effects; recharting costs double |
| Astrology–Archaeology | **Ancient Skies:** sky inscriptions give star research progress; digs slower |
| Archaeology–Cartography | **Lost Routes:** finished story chapters can reveal a lost chart; Archaeology slower |
| Cartography–Thieving | **Inside Job:** vault maps can drop Heist prep; marks pay less gold |
| Thieving–Gemcutting | **Fence's Eye:** Heists drop larger rough gems; Heists pay less gold |
| Gemcutting–Mining | **Crystal Sense:** Crystal-bearing layers twice as common; other traits rarer |

## Decided on the owner's behalf

- Speed and steady power come from mastery, so the tree doesn't repeat them.
- Ring order as listed under Question 2a.
- Refunds keep today's rule (they must leave the tree connected).
- The tree screen stays a zoomable ring view, like today's.
- Branch requirements by skill level stay: the fork at skill level 30, keystones at 50. Bridge keystones need a node from both neighbouring branches.
- At launch every player's skilling points are fully refunded to spend on the new tree.
- Exact node values and the final node count are tuning, set at build time.

## Implementation spec

Read [the build guide](SKILLING_BUILD_GUIDE.md) first. Build this after the skills whose nodes it changes. A node whose skill hasn't been rebuilt yet stays hidden until that skill ships. Numbers are starting values. Files: `src/data/skillTree.ts` (rewrite), `src/engine/skillTree.ts`, and the skilling tree screen.

### Points

- Points are `floor(total level / 10)` across the 12 skills. Astrology now counts, and Agility, Cooking and Rune-carving don't. The maximum is 118.
- Refunds keep today's rules: one node at a time, and the tree must stay connected.

### Shape

- **Core:** at the centre, the six core nodes from the list above, joined in a small ring. The start node is Craftsman, as today.
- **Branches:** each sits at `30° × index` in the ring order from Question 2a, with Mining at the top. Each branch has:
  - **Trunk:** 2 small nodes going out from the core.
  - **Fork point:** the branch splits into two forks at ±8°. Each fork has 3 smalls, then notable 1, notable 2, then the keystone, 6 nodes per fork.
- **Bridges:** each bridge keystone sits halfway between two neighbouring branches, at the radius of the fork notables. It links to the first notable of the nearer fork on each side.
- **Total:** 6 core + 12 × (2 + 12) branch nodes + 12 bridges = 186 nodes.

### Requirements

- Trunk smalls have no level requirement.
- Fork nodes need the skill at level 30. Keystones need it at level 50.
- A bridge keystone needs at least one fork node taken in each neighbouring branch. It counts as connected from either side.

### Node values

**Core nodes:**

| Node | Effect |
|---|---|
| Overtime | offline skilling +10% |
| Sharp Focus | double zones in every minigame +15% wider (relative) |
| Curious | collectible chance ×2 |
| Studious | skill XP +3% |
| Steady Hands | production has a 5% chance not to use its inputs |
| Patient Crafter | auto-crafting steps have a 10% chance to cost nothing |

**Trunk smalls**, one effect per skill, used for both trunk nodes:

| Skill | Trunk small |
|---|---|
| Mining | rubble +5% |
| Woodcutting | crown and limb yield +3% |
| Foraging | variant seed chance +3% (relative) |
| Thieving | prep chance +3% (relative) |
| Archaeology | inscription chance +3% (relative) |
| Astrology | research points +3% |
| Smelting | fuel and flux use −3% |
| Forging | staged-forge bar cost −3% |
| Woodcrafting | dial implicits +3% (relative) |
| Gemcutting | Arcane Dust cost −3% |
| Alchemy | infusion herb cost −3% |
| Cartography | scrap drops +3% |

**Fork smalls** each give a quarter of their fork's first notable value.

**Notables and keystones** are as named in the node list above. Values:

- A notable described as "more", "rarer", "faster", "stronger" or "cheaper" is **15%** (relative).
- "+1" notables are as written.
- Keystone and bridge numbers are as written (twice, three times, half, one fewer and so on). Where a keystone says only "slower", "less" or "weaker", the cost is **25%**.

### Engine wiring

- Every node's effect is a key in `skillTreeStats` named `<skill>.<effect>`, for example `mining.hazardRarer` or `alchemy.infusionStrength`. The bridges use `bridge.<id>`.
- Each skill's engine reads its keys at the point its spec describes. A key whose skill hasn't been rebuilt does nothing, and its nodes are hidden.
- Remove the old node stat keys (`miningSpeed`, `motherlode`, `greenhouse`, `markerChance`, `deepSurvey`, `livingScript`, `headChef` and so on) and every place that reads them.

### Screen

- Keep the existing zoomable ring screen and its profiles.
- Node tooltips show the effect, the skill level needed and, for bridges, both neighbours.
- Each branch is coloured in its skill's colour, and bridge nodes are drawn in a blend of both.

### Migration

- On first load after the revamp, clear `skillPassives` and every skilling profile.
- Show a one-time notice: "The skilling tree has been rebuilt. All your points are back to spend."

### Tests

- Point formula including Astrology and excluding removed skills.
- Node count and layout angles.
- Level requirements.
- Bridge connectivity from either side.
- Refunds keeping the tree connected.
- A few node effects per skill, read through `skillTreeStats`.
- Hidden nodes for skills not yet rebuilt.
- Migration clearing allocations.

## Build work

Tracked in [MILESTONES.md](MILESTONES.md) under "Revamp the skilling passive tree".

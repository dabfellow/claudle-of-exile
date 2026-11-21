# Veyrath zone conversion

Last updated 2026-11-19. The owner chose to redistribute and retheme the existing 70 zones into seven substantial chapters. `src/data/campaignLayout.ts` authors their travel order and level bands; `zones.ts` supplies their encounter templates. Stable zone/monster IDs and earned progress survive. Enemy levels, reward tiers, item-level bonuses and boss appearance counts follow the new progression. The original six passive reward milestones remain separate to avoid adding or removing permanent points. The display names below include the subsequent zone naming pass.

## Campaign grouping

| New act | Story | Area count | Area level band | Chapter boss zone ID |
|---|---|---:|---|---|
| 1 | The Wreck Coast | 8 | 1–10 | `sanctum` |
| 2 | The Broken Roads | 8 | 10–19 | `caravan` |
| 3 | In the Capital's Wake | 8 | 19–28 | `burningthrone` |
| 4 | The City That Stayed | 10 | 28–38 | `highaltar` |
| 5 | Cairnwatch Institute | 12 | 38–47 | `giantsthrone` |
| 6 | The Capital's Promise | 12 | 47–57 | `maelstrom` |
| 7 | The Guardian Beneath | 12 | 57–65 | `shatteredthrone` |

The final boss remains level 66; ordinary Maps still begin at level 66. Adjacent area bands overlap to avoid abrupt difficulty jumps. Eight late-game zones move into the supply-road and Greyford chapters, making those investigations full chapters and shortening the underground finale. More zones in the later acts support branching roads; equal counts are unnecessary.

Tuning choices: spread the first three chapters over roughly nine levels each so the coast no longer consumes the first 25 levels. Retain the established reward curve by level, preventing relocated zones from giving late-game gear/currency. Relocated bosses teach two mechanics in Act 2 and three in Act 3, without underground Echoes or channels. Campaign gem power, requirements and ownership stay intact; chapter availability follows each gem's required level, with signatures following their skill and Maps gems staying behind campaign completion. Instilling Orbs remain available from the start of Act 2. No XP-curve, class, equipment-power or endgame encounter changes.

## Stable IDs and new display names

### Act 1: The Wreck Coast

| Stable zone ID | Display name |
|---|---|
| `mudflats` | Brinewick Shore |
| `brinecaves` | The Salvage Caves |
| `ashwood` | The Charred Copse |
| `blackreed` | Blackfen Reaches |
| `crypt` | The Tidebound Vault |
| `shipgrave` | The Wreck Claims |
| `stormcliffs` | Brinewick Lookout |
| `sanctum` | The Drowned Storehouse |

### Act 2: The Broken Roads

| Stable zone ID | Display name |
|---|---|
| `cinderroad` | The Ration Road |
| `saltflats` | The Saltpan Crossing |
| `tithefields` | The Commons Allotments |
| `fortobedience` | The Roadwatch Fort |
| `blackgrass` | Blackgrass Verge |
| `bannerfield` | Muster Green |
| `assizes` | The Tollhouse Court |
| `caravan` | Wayfarer's Post |

### Act 3: In the Capital's Wake

| Stable zone ID | Display name |
|---|---|
| `kurgans` | Greyford Burial Fields |
| `lowercity` | Greyford Market Quarter |
| `dryaqueduct` | Greyford Millrace |
| `plateau` | Greyford Heights |
| `wreckline` | Greyford Bonded Stores |
| `cinderkey` | The Greyford Kilns |
| `pyretemple` | The Expedition Depot |
| `burningthrone` | The Delegation Chambers |

### Act 4: The City That Stayed

| Stable zone ID | Display name |
|---|---|
| `pilgrimgate` | Harrowgate Gates |
| `almsquarter` | The Alms Ward |
| `scourgeyard` | The Cloth Courts |
| `reliquary` | The Civic Vaults |
| `bellfoundry` | The Bell Foundry |
| `inquisition` | Harrowgate Registry |
| `penitentstair` | The Upper Steps |
| `choirloft` | Eastmere Landing |
| `saintswalk` | Monument Walk |
| `highaltar` | The Forum That Bloomed |

### Act 5: Cairnwatch Institute

| Stable zone ID | Display name |
|---|---|
| `hollowpass` | Cairnwatch Road |
| `screefields` | The Scree Workings |
| `howlingfells` | The Howling Fells |
| `glasslake` | The Glass Reservoir |
| `bonequarry` | Sealstone Quarry |
| `icevault` | The Cold Vault |
| `mammothroad` | The Haul Road |
| `hangingglacier` | The Hanging Glacier |
| `steading` | Cairnwatch Service Yard |
| `longhall` | The Specimen Hall |
| `kingsstair` | The Laboratory Stair |
| `giantsthrone` | The Containment Laboratory |

### Act 6: The Capital's Promise

| Stable zone ID | Display name |
|---|---|
| `blackharbor` | Customs Quay |
| `squallbanks` | The Harbour Locks |
| `lampgulf` | The Lantern Canal |
| `drownedfleet` | The Kroten Anchorage |
| `brimstone` | The Refinery Workshops |
| `hollowreef` | The Lower Waterworks |
| `thunderhead` | Citadel Causeway |
| `leviathanrib` | The Great Conservatory |
| `blackcurrent` | The Processional Canal |
| `voicetrench` | The Council Hearing Hall |
| `lightless` | The Sealed Research Ward |
| `maelstrom` | The Ward Breach |

### Act 7: The Guardian Beneath

| Stable zone ID | Display name |
|---|---|
| `exilesgate` | The Underworks Gate |
| `kingsroad` | The Founders’ Processional |
| `kingsmint` | The Seal Foundry |
| `hanginggardens` | The First Garden |
| `burnedarchive` | The Founding Archive |
| `longfracture` | The Sundering |
| `driftingquarter` | The Old Refuge |
| `kingsreach` | The Warden Galleries |
| `sunderedhall` | The Hall of Sacrifice |
| `hallofcrowns` | The Founders’ Tombs |
| `ninthstair` | The Ninth Descent |
| `shatteredthrone` | The First Seal |

## Story anchors and compatibility

- `caravan` records the supply-road chapter conclusion; Tamsin is now the Keeper of the Post. `burningthrone` is the Greyford delegation/expedition finale, with Azhar rethemed as the expedition's altered lion.
- `choirloft` is **Eastmere Landing**, the onward delivery destination reached after `penitentstair` (The Upper Steps). It is an Act 4 branch through/beyond Harrowgate. This does not move the zone in the level sequence or change its combat.
- `highaltar` is **The Forum That Bloomed**, providing the mountain research lead.
- `giantsthrone` is **The Containment Laboratory**, with Director Ymir Vane as its altered custodian.
- `maelstrom` is **The Ward Breach**, beneath the capital's failing research ward; it opens `exilesgate` (The Underworks Gate).
- `shatteredthrone` is **The First Seal**, with **The First Exile** replacing the Last King's display identity. The stable boss ID `aurelane` is retained for compatibility; combat mechanics are unchanged.
- Acts 1–3 run linearly; the later chapters retain branching routes. Caer Veyr goes directly from Customs Quay to the Harbour Locks, and the underworks proceed from the Founders’ Processional to the Seal Foundry. Both shortened late chapters require eight prior boss clears for their finale. All seven story finale IDs remain stable.
- Monster profile inference depends on display text as well as IDs. All 350 monster/boss definitions were compared against the original inference rules; names were adjusted to preserve original inferred archetypes. Existing explicit profile overrides are unchanged.
- Existing art keys are stable zone IDs. Old scene artwork can therefore remain technically loadable while new act artwork is integrated. This conversion does not generate new monster portraits or promise that old art matches every renamed location.
- Unique-item IDs and their world-drop level rules are unchanged. Enemy levels, loot tiers and item-level bonuses follow campaign depth. Moved zones also receive appropriate pack pacing and simplified boss mechanics. Other encounters retain their authored damage types, attack intervals and mechanics. Some legacy attack names retain their mechanical/flavour identities.
- The campaign First Exile and existing Uber First Exile still need a final authored continuity treatment. This conversion does not establish repeated resurrection.

## Related implementation ownership

Zone conversion owns `src/data/zones.ts`. World/act map points and artwork are coordinated separately. Progression compatibility updates address numeric-act gates, gem shop/sentinel handling, campaign completion, achievements, profiles and reward milestones. Campaign quest state/interactions are implemented separately. Preserve current saves' `unlockedZones`, `bossesDefeated` and active zone IDs; do not translate display-name changes into new IDs.


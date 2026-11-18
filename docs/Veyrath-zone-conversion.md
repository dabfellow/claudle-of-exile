# Veyrath zone conversion

Last updated 2026-11-17. Implemented data conversion for the seven-act story. Internal zone and monster IDs, drop pools, tiers, combat numbers and level ranges are retained; display names, descriptions, story act grouping and chapter outros change. The added chapter checkpoint is `caravan` (Act 2). The progression worker retains the original six passive reward milestones separately.

## Campaign grouping

| New act | Story | Area count | Existing area level band | Chapter boss zone ID |
|---|---|---:|---|---|
| 1 | The Wreck Coast | 8 | 1–24 | `sanctum` |
| 2 | The Broken Roads | 4 | 24–29 | `caravan` |
| 3 | In the Capital's Wake | 4 | 28–32 | `burningthrone` |
| 4 | The City That Stayed | 10 | 33–41 | `highaltar` |
| 5 | The Mountain Research Facility | 12 | 41–49 | `giantsthrone` |
| 6 | The Capital's Promise | 14 | 49–57 | `maelstrom` |
| 7 | The Guardian Beneath | 18 | 57–65 | `shatteredthrone` |

The final boss remains level 66; ordinary Maps still begin at level 66. Overlapping adjacent area bands are retained deliberately. These chapters preserve the existing 70-area progression order; they are not forced to have equal area counts.

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
| `stormcliffs` | The Lookout Cliffs |
| `sanctum` | The Drowned Storehouse |

### Act 2: The Broken Roads

| Stable zone ID | Display name |
|---|---|
| `cinderroad` | The Broken Supply Road |
| `saltflats` | The Saltpan Crossing |
| `blackgrass` | The Rootbound Verge |
| `caravan` | Wayfarer's Post |

### Act 3: In the Capital's Wake

| Stable zone ID | Display name |
|---|---|
| `kurgans` | Greyford Burial Fields |
| `plateau` | Greyford Heights |
| `pyretemple` | The Expedition Depot |
| `burningthrone` | The Delegation Chambers |

### Act 4: The City That Stayed

| Stable zone ID | Display name |
|---|---|
| `pilgrimgate` | Harrowgate Gates |
| `almsquarter` | The Shelter Quarter |
| `scourgeyard` | The Rootbound Courtyards |
| `reliquary` | The Civic Vaults |
| `bellfoundry` | The Bell Foundry |
| `inquisition` | The Records Hall |
| `penitentstair` | The Rootbound Steps |
| `choirloft` | Eastmere Landing |
| `saintswalk` | The Old Processional |
| `highaltar` | The Overgrown Forum |

### Act 5: The Mountain Research Facility

| Stable zone ID | Display name |
|---|---|
| `hollowpass` | The Cairnwatch Approach |
| `screefields` | The Scree Workings |
| `howlingfells` | The Howling Fells |
| `glasslake` | The Glass Reservoir |
| `bonequarry` | The Containment Quarry |
| `icevault` | The Cold Specimen Vault |
| `mammothroad` | The Heavy Haul Road |
| `hangingglacier` | The Hanging Glacier |
| `steading` | Cairnwatch Service Yard |
| `longhall` | The Specimen Hall |
| `kingsstair` | The Institute Ascent |
| `giantsthrone` | The Containment Laboratory |

### Act 6: The Capital's Promise

| Stable zone ID | Display name |
|---|---|
| `blackharbor` | The Restricted Quays |
| `wreckline` | The Bonded Warehouses |
| `cinderkey` | The Furnace Ward |
| `squallbanks` | The Canal Locks |
| `lampgulf` | The Lantern Canal |
| `drownedfleet` | The Kroten Anchorage |
| `brimstone` | The Refining Annex |
| `hollowreef` | The Submerged Works |
| `thunderhead` | The Guarded Causeway |
| `leviathanrib` | The Great Conservatory |
| `blackcurrent` | The Processional Canal |
| `voicetrench` | The Research Hearings |
| `lightless` | The Sealed Research Ward |
| `maelstrom` | The Failing Containment |

### Act 7: The Guardian Beneath

| Stable zone ID | Display name |
|---|---|
| `exilesgate` | The Sealed Underworks |
| `kingsroad` | The Buried Processional |
| `tithefields` | The Root Cellars |
| `fortobedience` | The Buried Garrison |
| `bannerfield` | The Muster Vault |
| `assizes` | The Oath Tribunal |
| `lowercity` | The Buried Quarter |
| `dryaqueduct` | The Buried Aqueduct |
| `kingsmint` | The Seal Foundry |
| `hanginggardens` | The Unchecked Garden |
| `burnedarchive` | The Founding Archive |
| `longfracture` | The Broken Seal |
| `driftingquarter` | The Preserved Refuge |
| `kingsreach` | The Guardian's Reach |
| `sunderedhall` | The Hall of Sacrifice |
| `hallofcrowns` | The Founders Tombs |
| `ninthstair` | The Ninth Descent |
| `shatteredthrone` | The First Seal |

## Story anchors and compatibility

- `caravan` records the supply-road chapter conclusion; Tamsin is now the Keeper of the Post. `burningthrone` is the Greyford delegation/expedition finale, with Azhar rethemed as the expedition's altered lion.
- `choirloft` is **Eastmere Landing**, the onward delivery destination reached after `penitentstair` (The Rootbound Steps). It is an Act 4 branch through/beyond Harrowgate. This does not move the zone in the level sequence or change its combat.
- `highaltar` is **The Overgrown Forum**, providing the mountain research lead.
- `giantsthrone` is **The Containment Laboratory**, with Director Ymir Vane as its altered custodian.
- `maelstrom` is **The Failing Containment**, beneath the capital's failing research ward; it opens `exilesgate` (The Sealed Underworks).
- `shatteredthrone` is **The First Seal**, with **The First Exile** replacing the Last King's display identity. The stable boss ID `aurelane` is retained for compatibility; combat mechanics are unchanged.
- Original explicit road edges and boss-count gates remain reachable because whole branching acts retain their zones. Splitting the old linear Act 2 introduces only the new `caravan` chapter marker.
- Monster profile inference depends on display text as well as IDs. All 350 monster/boss definitions were compared against the original inference rules; names were adjusted to preserve original inferred archetypes. Existing explicit profile overrides are unchanged.
- Existing art keys are stable zone IDs. Old scene artwork can therefore remain technically loadable while new act artwork is integrated. This conversion does not generate new monster portraits or promise that old art matches every renamed location.
- Unique-item IDs, area drop pools and all combat damage types, intervals, mechanics, multipliers, spawn rates and item-level bonuses are unchanged. Some legacy attack names retain their mechanical/flavour identities; rethemed names do not alter effects.
- The campaign First Exile and existing Uber First Exile still need a final authored continuity treatment. This conversion does not establish repeated resurrection.

## Related implementation ownership

Zone conversion owns `src/data/zones.ts`. World/act map points and artwork are coordinated separately. Progression compatibility updates address numeric-act gates, gem shop/sentinel handling, campaign completion, achievements, profiles and reward milestones. Campaign quest state/interactions are implemented separately. Preserve current saves' `unlockedZones`, `bossesDefeated` and active zone IDs; do not translate display-name changes into new IDs.


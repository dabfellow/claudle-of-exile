# Act 6: The Shattered Throne

Planned in [ACTS_4_6.md](ACTS_4_6.md), the last act of the campaign. Built 2026-11-01, behind `preview: true`.

What's left of the empire that exiled you, torn apart when its last king reached for something he shouldn't have. It adds no new boss mechanic: the end of the campaign tests everything that came before, so its bosses bring old mechanics back in pairs, and all three resistances are the check.

## Stages

18 areas, monster levels 57–65, tiers 15 to 17. Items roll 14 levels above the monster (`ilvlBonus`), so the first area reaches about level 71 and the act boss 80, the top of the bases. That finishes the climb from Act 3's 45 through Act 4's 57 and Act 5's 68.

| # | Area | Levels | Tier | Boss (level) | Echoes | New uniques |
|---|---|---|---|---|---|---|
| 1 | The Exiles' Gate | 57–58 | 15 | Warden Corvane (58) | scorch, martyrs | Oathbreaker |
| 2 | The King's Road | 57–59 | 15 | Reeve Haldane (59) | ward, scorch | The King's March |
| 3 | The Tithe Fields | 58–60 | 15 | The Last Reaper (60) | summon, frostbite | The Regent's Mantle |
| 4 | Fort Obedience | 59–61 | 15 | Castellan Brandt (61) | martyrs, ward | The Last Decree |
| 5 | The Field of Banners | 59–61 | 15 | Marshal Ivarra (61) | channel, enrage | Oathbreaker |
| 6 | The Assizes | 60–62 | 15 | High Justice Morrow (62) | martyrs, frostbite | Crownbreaker's Mask |
| 7 | The Lower City | 60–62 | 16 | Guildmaster Sarn (62) | scorch, channel | The King's March |
| 8 | The Dry Aqueducts | 60–62 | 16 | Engineer Vossa (62) | frostbite, channel | Hand of the Regent |
| 9 | The King's Mint | 61–63 | 16 | The Mintmaster (63) | summon, martyrs | The Last Decree |
| 10 | The Hanging Gardens | 61–63 | 16 | The Queen's Gardener (63) | ward, summon | Crownbreaker's Mask |
| 11 | The Burned Archive | 62–64 | 16 | The Last Archivist (64) | martyrs, channel | Last Decree, Hand |
| 12 | The Long Fracture | 62–64 | 16 | Warden of the Rift (64) | scorch, frostbite | Oathbreaker |
| 13 | The Drifting Quarter | 63–65 | 17 | Duchess Vanterre (65) | enrage, scorch | March, Mask |
| 14 | The King's Reach | 63–65 | 17 | Court Astrologer Ilse (65) | channel, frostbite | The Regent's Mantle |
| 15 | The Sundered Hall | 64–65 | 17 | The Lord Chamberlain (65) | martyrs, scorch | Oathbreaker, March, Hand |
| 16 | The Hall of Crowns | 64–65 | 17 | The Crownbearer (65) | frostbite, martyrs | Mask, Decree |
| 17 | The Ninth Stair | 64–65 | 17 | The Ninth Guard (65) | channel, scorch | Mantle, March |
| 18 | The Shattered Throne | 64–65 | 17 | Oswin Aurelane, the Last King (66, act boss) | three pairs, in turn | all six |

Every boss also has a slam and a nova, and some have summon or enrage of their own. The first boss has no plain warm-up as Acts 4 and 5 did, because it's the trial, and the player has met all of this already. The Hanging Gardens is the breather: its pairing needs no rule at all.

The road in is one entry: `exilesgate` has `requires: { after: ['maelstrom'] }`. The Act 6 block must stay after Act 5's in `ZONES`.

**All three resistances:** each boss hits and channels in one element, slams in a second and blasts in the third, so no boss is two-coloured. `slamType` on `MonsterDef` is new for this, and Matchup prints it. On trash the three run about level, with a few physical monsters. Unholy ground, below, punishes whichever one you left out. Every new unique carries all three and feeds one class's meter.

## Roads

Forked on 2026-11-01. The act boss needs 14 of the 17 other bosses. Gate → King's Road → Tithe Fields or Fort Obedience → Field of Banners → Lower City → Dry Aqueducts or King's Mint → Hanging Gardens → Long Fracture → Drifting Quarter or King's Reach → Sundered Hall → Ninth Stair → Shattered Throne. Side areas: the Assizes (off the Banners), Burned Archive (off the Gardens), Hall of Crowns (off the Sundered Hall). See [ACT_RECIPE.md](ACT_RECIPE.md) → Roads.

## Echoes (`echoes`)

Bosses bring old mechanics back two at a time, for example scorching the ground while its martyrs stand. There's no new mechanic and no new rule: the answers are the ones already learned, and the test is holding two at once.

`echoes` on `MonsterDef` lists the pairs, and `boss()` adds them to `mechanics`, so everything that reads `mechanics` (the Campaign chips, Matchup, `bossLeftToRules`, the sim bot) works unchanged. All six pairings of scorch, martyrs, frostbite and channel appear, mixed with the older ward, summon and enrage.

**The last king runs three pairs**, one per third of his life: scorch and martyrs, frostbite and channel, then martyrs and channel. Only the pair at hand is in force (`echoMechanics`), so it's still two at a time. His chains come back at the third phase, as their 50% wave has been waiting. The list always shows everything he can bring, so bossLeftToRules asks for all of it. Summon, enrage and ward stay out of the rotation, as a ward dropped mid-phase would have nothing left to run its timer.

**What a pairing changes:**

- **Martyrs and channel:** a chained boss takes no hit, so a stun can't land, and only an interrupt breaks the channel. `rulesBreakChannels` takes a `chained` flag for this, and `bossLeftToRules` sets it. Without it, a skill with a stun chance would have passed and the channel would have snowballed offline. This already applied to Thalass in Act 5.
- **Frostbite and channel:** frozen solid, you can't press anything, so the cleanse has to come first.
- **Martyrs and frostbite:** stacks keep building while you hit the chains.
- **Frostbite and scorch:** `rime` makes the scorch Frozen ground, so stacks build twice as fast. A guard on the Frostbite rule also steps you out of it, which is the answer.
- **Scorch and channel:** Sarn's is storm-tossed water, which can leave your interrupt on cooldown as the channel comes.

Matchup shows the pairs, and the three that change an answer get a "Together" note (`ECHO_TIPS`). Campaign chips mark an echo.

**Offline:** nothing new. `bossLeftToRules` already asks for an answer to each mechanic, so a boss comes out only when both are answered. Scorch, ward, summon and enrage need no rule, as before.

## Unholy ground (`unholy`)

New ground, laid with `groundKind: 'unholy'` through `monsterGround`, like storm-tossed water. It's the act's own: it hurts in whichever of fire, cold and lightning you resist least (`groundElement` in `combat.ts`), read as you stand there, and it halves flask healing and Life regeneration (`UNHOLY_RECOVERY`). So it's the resistance check made personal, and it asks you to step out rather than drink through it. Mana flasks and leech are untouched.

`GROUND.unholy.type` is only a stand-in for that table, as the real element depends on you. It works with the Ground rule like any other kind, and a guard steps out of it at once. Casters use the `unholy()` wrapper. Bosses with a scorch or nova lay it unless a pairing wants old ground instead.

## Third trial

The first kill of Warden Corvane passes trial 3: it gives its 2 points and opens the capstones. `TRIALS` names `exilesgate`. The other 17 bosses give 1 point each, up to the cap of 11.

## The ending

Beating the Last King opens the Map Device and unlocks the Exile for the account. `checkCampaignDone` (it was `checkExileUnlock`) sets both on the tick after the kill.

- **New account field `campaignDone`:** the Map Device is account-wide, like the Exile, so a second character keeps it. `exileUnlocked` couldn't do the job, because the old-save migration in `save.ts` gives it to anyone who beat Act 1. `campaignDone` is optional, so there's no save version bump, and it's folded in by `absorbAccount` and passed in `AccountTransfer`.
- **Closed means closed:** `campaignComplete` returns false while `actOpen(6)` is false, whatever the save or the account says. A preview save carried into a production build opens nothing, and `checkCampaignDone` doesn't run its effects. Tests cover this.
- **The Map Device opens:** `mapsOpen(s)` is the preview flag or a complete campaign. It lets the Map Device page and campaign map drops through. A player who gets in by beating the act sees the same page without its dev tools and badge. Maps themselves are still the Milestone 5 preview, so what the campaign opens is the one tier built so far.
- **Words:** the act outro leaves something that never wore a crown on the throne, for The Crownless, and hums the Map Device. The Campaign page and the feed say the campaign is over rather than promising Act 7.

## Rewards

- Six uniques, above, on bases of level 60 so they can be worn when found. Drop tables and boss tables for tiers 15–17.
- Achievements: The King Is Dead (the act) and Long Live No One (every boss).
- **Bases:** none needed, as they're written up to 80 already.

## Art

All 90 monsters and bosses and the 6 uniques have their own picture, listed in [ASSET_MAPPING.md](ASSET_MAPPING.md). Banners reuse GegX landscapes until a landscape pack arrives.

## How to reach it

`preview: true`, `open: false`, the same gate as Acts 4 and 5: it plays in dev builds, tests and the sim, never in `npm run build`. To jump there in a dev build, from the browser console:

```js
game.act((s) => { s.bossesDefeated.push('maelstrom'); s.unlockedZones.push('exilesgate'); });
```

To release it: set `open: true`, once stages, The last empire skills and Cartography are all merged. That also makes the ending reachable, so Maps should be ready to be opened at the same time.

No save migration: every new field is optional, so `SAVE_VERSION` stays as it was.

## Hooks for other sessions

- First area `exilesgate`, last area `shatteredthrone` (boss id `aurelane`).
- `checkExileUnlock` is now `checkCampaignDone`. `campaignComplete` is false while Act 6 is closed.
- `mapsOpen(s)` in `engine/maps.ts` replaces reading `MAPS_PREVIEW.enabled` for "can this character use maps?". `MAPS_PREVIEW` still gates the dev tools.
- `GroundKind` gained `unholy`, so a `Record<GroundKind, ...>` needs the key.
- `MonsterDef` and `MonsterInstance` gained `slamType` and `echoes`, and the instance `echoPhase`. An echo boss's instance `mechanics` holds the phase in force. Read the def for the whole list.
- `rulesBreakChannels(s, chained)`.
- The sim bot needs no change, but `TRIAL_ZONES` in `scripts/sim.ts` has no Act 6 area yet.

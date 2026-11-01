# Act 5: The Sunless Sea

Planned in [ACTS_4_6.md](ACTS_4_6.md). Built 2026-11-01, behind `preview: true`.

## Stages

14 areas, monster levels 49–57, tiers 12 to 14. Items roll 10 levels above the monster (`ilvlBonus`), so the first area reaches about level 59 and the act boss 68, on the way from Act 3's 45 to Act 6's 80. Tiers 10 and 11 are left for Act 4.

| # | Area | Levels | Tier | Boss (level) | Mechanics | New uniques |
|---|---|---|---|---|---|---|
| 1 | The Black Harbour | 49–50 | 12 | Harbourmaster Creel (50) | slam, nova, summon | The Bosun's Oath |
| 2 | The Wreck Line | 49–51 | 12 | Bosun Gall (51) | slam, channel | Leviathan Hide |
| 3 | Cinder Key | 50–52 | 12 | Mother Tarry (52) | slam, scorch, channel | Corposant |
| 4 | The Squall Banks | 51–53 | 12 | Aune, the Stormwife (53) | slam, nova, scorch, channel | Deckwalkers |
| 5 | The Gulf of Lamps | 51–53 | 13 | The Lantern Maw (53) | nova, summon, channel | Corposant |
| 6 | The Drowned Fleet | 52–54 | 13 | Commodore Hask (54) | slam, summon, enrage, channel | The Harpoon's Answer |
| 7 | Brimstone Isle | 52–54 | 13 | The Name-Burner (54) | slam, nova, scorch | Leviathan Hide |
| 8 | The Hollow Reef | 53–55 | 13 | The Reef Mother (55) | slam, summon, ward, channel | Crown of the Slack Tide |
| 9 | The Thunderhead | 54–56 | 14 | Captain Vane, Eye of the Storm (56) | slam, nova, enrage, scorch, channel | Deckwalkers |
| 10 | Leviathan's Rib | 54–56 | 14 | Master Flenser Oake (56) | slam, summon, ward, channel | The Harpoon's Answer |
| 11 | The Black Current | 55–57 | 14 | The Steersman (57) | slam, nova, enrage, channel | Crown of the Slack Tide |
| 12 | The Trench of Voices | 55–57 | 14 | The Choir Below (57) | nova, summon, scorch, channel | The Bosun's Oath |
| 13 | The Lightless Deep | 56–57 | 14 | The First Drowned (57) | slam, nova, summon, enrage, channel | Crown, Hide, Answer |
| 14 | The Maelstrom's Eye | 56–57 | 14 | Thalass, the Caller Below (58, act boss) | all eight | all six |

The Black Harbour's boss stays plain and Channels start at stage 2, so the rule is taught on a simple boss, Bosun Gall. Brimstone Isle has no channel, as a breather before the Reef.

The road in is one entry: `blackharbor` has `requires: { after: ['giantsthrone'] }`. Until Act 4 lands, nothing opens it, and it follows on by itself once `giantsthrone` exists. The Act 5 block must stay after Act 4's in `ZONES`.

**Fire and lightning together:** a boss hits in one and blasts in the other, so a nova or scorch is always the opposite element to its channel and slam. On trash the two run level, each well ahead of physical, with a few cold monsters. Every new unique carries both resistances and feeds one class's meter.

## Channels (`channel`)

- Every 20 s the boss stops and channels for 5–6.5 s (`channel` on its `MonsterDef`). It does nothing else meanwhile, but its adds and timers carry on.
- **It grows:** a pulse each second, from 0.15× to 0.75× the boss's hit, unblockable, so a late break still costs you.
- **If it lands:** 3.5× the boss's hit, and the boss does 20% more damage for the rest of the fight, stacking. It snowballs, as [HARD_BOSSES.md](HARD_BOSSES.md) asks of a missed moment.
- **Breaking it:** any interrupt, stun or freeze, whatever it came from, so a mace's own stun chance counts. The boss staggers for 1.5 s and the channel's timer restarts. Knobs: `BOSS_CHANNEL_*` in `zones.ts`.

**By hand:** press War Cry, or land a stun. **By rule:** a skill on the new rule When an enemy channels. War Cry is a Strength gem, but a level 1 gem needs only 8, so every class can carry one.

**A channel isn't a wind-up.** `enemyCasting` now means a slam or nova, and `enemyChannels` means a channel, each false on the other. A War Cry left on its suggested wind-up rule spends itself on slams and misses the channel, which is the lesson. The rule sits in the Wind-up rules group, so the War Table is unchanged. Hard mode bosses can read the same split, and `MonsterInstance.castKind` carries it. The `bossCast` event and instilled flasks fire on a channel too.

**Offline:** `bossLeftToRules` keeps a channelling boss in hiding unless a skill on the channel rule can break it (`rulesBreakChannels`: an interrupt, or a skill with a stun chance). A landed channel would snowball until you died. The sim bot puts an interrupt on the rule where the boss needs one, and its hands press one too.

## Storm-tossed water

New ground, `stormwater`: lightning damage over time, and your cooldowns run 40% slower while you stand in it, which can leave your interrupt down when the channel comes. A `groundKind` on a monster overrides what its element lays. Storm casters (`stormy`) and several bosses use it, and it works with the Ground rule like any other kind. A guard steps out of it at once.

## Rewards

- Six uniques, above. Drop tables and boss tables for tiers 12–14.
- Achievements: Slack Water (the act) and Master of the Sunless Sea (every boss).
- No save migration: every new field is optional, and old fights never read them.

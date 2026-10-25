# Path of Idle

A browser idle ARPG: Melvor Idle-style skilling and offline progress, crossed with Path of Exile-style loot, random affixes and orb crafting.

Gather ore, wood and herbs → smith item bases and brew flasks → fight through zones → loot items and currency → craft better gear → push deeper.

## Running it

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine unit tests (vitest)
npm run build    # typecheck + production build into dist/
npm run sim      # headless balance sim (see docs/BALANCE.md)
```

In dev builds the store is exposed as `window.game` for poking at state from the browser console.

Online accounts (Google/Discord + cloud saves) need a `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — see [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md). Without it the game runs guest-only.

## What's in the game

- **Act 1, The Drowned Coast**: 8 areas (levels 1–25) ending in the act boss, Ysolde, the Drowned Queen. Bosses stack mechanics as the act goes on: slam, nova, summon, enrage, ward. Acts 3–6 and Maps are shown as coming soon.
- **Act 2, The Burning Steppe** (preview: dev builds only, see [docs/ACT2.md](docs/ACT2.md)): 8 areas (levels 24–33) ending in Azhar, the Fallen Sun, and a sixth boss mechanic, Scorched earth.
- **Characters**: guest play or Google/Discord sign-in with cloud saves, several characters per account, Warrior / Ranger / Mage, a guided 10-step tutorial.
- **Combat**: 12 skill gems plus signature and general supports on a 6-slot bar, tactics rules that cast for you, packs of 1–5, flasks with their own affixes and enchantments.
- **Trees**: a character tree with masteries and keystones, and a separate skilling tree.
- **Skills**: Mining, Woodcutting, Harvesting (better nodes unlock with areas), Smithing (item level capped by campaign progress), Alchemy (flasks and orbs).
- **Items & crafting**: normal / magic / rare / unique, item-level-gated affix tiers, Alt for advanced tooltips, click to pin; orbs, salvage and bench crafts unlocked by achievements.
- **Hideout** stations with upgrades, a trader, PoE-style stash tabs, 27 achievements, offline catch-up (up to 12 h; bosses you haven't beaten wait for you), export/import saves.

## Project layout

```
src/
  engine/    pure game logic, no React (state, tick, combat, items, crafting, tutorial, saves)
  data/      content tables (skills, bases, affixes, zones, passive tree, classes, tutorial)
  platform/  accounts and save storage (guest + localStorage today)
  ui/        React screens, pages and shared components
  game.ts    store: game loop, screens, events → UI
tests/       vitest specs for the engine and platform layer
docs/        design notes
```

## Docs

- [docs/GDD.md](docs/GDD.md) — game design direction and roadmap for the polish pass
- [docs/DESIGN.md](docs/DESIGN.md) — how the code fits together
- [docs/BALANCE.md](docs/BALANCE.md) — pacing knobs, the balance sim, and baseline results
- [docs/ACT2.md](docs/ACT2.md) — Act 2 areas, bosses, uniques, and how a preview act is released
- [docs/LAUNCH.md](docs/LAUNCH.md) — what is left before launch
- [docs/TREES.md](docs/TREES.md) — the character and skilling trees, masteries and keystones
- [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md) — setting up Google/Discord login with Supabase
- [docs/ART_PROMPTS.md](docs/ART_PROMPTS.md) — prompts for generating the game's art

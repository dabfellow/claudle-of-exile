# Claudle of Exile

A browser idle ARPG: Melvor Idle-style skilling and offline progress, crossed with Path of Exile-style loot, random affixes and orb crafting.

Gather ore, wood and herbs → smith item bases and brew flasks → fight through zones → loot items and currency → craft better gear → push deeper.

## Running it

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine unit tests (vitest)
npm run build    # typecheck + production build into dist/
```

In dev builds the store is exposed as `window.game` for poking at state from the browser console.

## What's in the game

- **Characters**: guest accounts, multiple characters per account, Warrior / Ranger / Mage classes, a guided 10-step tutorial.
- **Skills**: Mining, Woodcutting, Harvesting, Smithing (item level scales with skill), Alchemy (flasks and orbs).
- **Items**: normal / magic / rare / unique, ~30 affixes with item-level-gated tiers, PoE-style tooltips (hold Alt for tiers).
- **Crafting bench**: 10 orbs, salvage, and one crafted modifier per item.
- **Combat**: automatic attacks, manual flasks (keys 1–5), boss wind-ups, Instilling Orbs to automate flasks later.
- **Passive tree**, **hideout** stations with upgrades, **vendor**, offline catch-up (up to 12h), export/import saves.

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

See [docs/DESIGN.md](docs/DESIGN.md) for how the pieces fit together.

# Design notes

## Principles

- **Engine is pure TypeScript.** Everything in `src/engine` works on a plain, JSON-serializable `GameState` and never imports React. That keeps it unit-testable and lets offline progress reuse the exact same code as live play.
- **Content is data.** New skills actions, bases, affixes, zones, passives, classes and tutorial steps are added in `src/data` without touching engine logic.
- **The UI reads, the engine writes.** Components call `game.act((state, ctx) => engineFn(state, ctx, ...))`. A returned string is treated as an error and shown as a toast.

## Game loop

- `game.ts` runs a 50 ms `setInterval` (it keeps ticking, throttled, in background tabs) and calls `tick(state, ctx, dt)`.
- `tick` advances in fixed 50 ms sub-steps, so many small ticks and one big catch-up give the same result.
- Gaps over 5 minutes (sleep, hidden tab) and time since the last save are run through `simulateOffline`, which collects a "While you were away" summary instead of live events.
- The UI re-renders about 10×/second; progress bars use CSS transitions to look smooth.

## Events

The engine never talks to the UI directly. It calls `ctx.emit(event)` (`GameEvent` in `engine/types.ts`): hits, kills, loot, level-ups, crafts, equips, and so on. The store turns events into the activity feed, toasts and combat effects. `withTutorial` wraps the ctx so every event also drives tutorial progress, live and offline.

## Items and crafting

- An item is a base (`data/bases.ts`) plus rolled prefixes/suffixes. Magic items hold up to 1+1, rares up to 3+3.
- Each affix has a mod group (no duplicates per item), per-tag spawn weights, and tiers gated by item level. Higher tiers are rarer (each step ~70% as likely).
- Orbs live in `engine/crafting.ts` as `canApply` / `apply` pairs. The bench adds one crafted mod per item.

## Combat

- Player stats come from one function, `deriveStats` (gear + passives + class bonus + hideout + active flask buffs).
- Armour reduces physical hits (PoE formula, capped at 90%); evasion gives a chance to avoid hits; resistances cap at 75%.
- Flasks are manual by design and refill on kills. Instilling Orbs let a flask fire on a condition, which is how full automation is earned.
- Bosses spawn after a kill count and telegraph a heavy hit. Dying to a boss resets its counter so a zone can't soft-lock.

## Characters, accounts and saves

- `platform/accounts.ts` defines `AccountProvider`; only `LocalAccounts` (guest) exists today. Google/Discord sign-in (via Supabase or Firebase) should implement the same interface.
- `platform/saves.ts` defines an async `SaveStore`; `LocalSaveStore` keeps an index of character summaries plus one key per character. A cloud store would implement the same interface.
- Saves are versioned (`SAVE_VERSION`) with a migration per version in `engine/save.ts`. The pre-character single save is imported automatically as a Warrior named "Exile".

## Tutorial

`data/tutorial.ts` lists steps with an NPC line, objective, target count, reward and the `data-tut` ids to highlight. The quest tracker adds a pulsing `tut-hint` class to matching elements, so pages only need a `data-tut` attribute.

## Planned next

- Polish each page tab by tab.
- Ascendancy classes.
- Real sign-in and cloud saves behind the existing platform interfaces.

---
name: playtest
description: Check a Path of Idle change in the running game with a ready-made character and game state. Use after changing anything players see, when reproducing a player bug, or when asked to playtest, test in-game or see if something works.
---

# Playtest

Check the real game, not just the tests. If the change can't show up in the browser, skip this and say so.

1. **Start the game.** Run `preview_start` with `dev`, or `dev-alt` if that's taken. If it says no slots are free, call `preview_list` and stop servers this session started. If a slot is still needed, stop the oldest one and say which. Other sessions may be using the rest, so don't stop more than you need.
2. **Load a scenario.** Run this with `javascript_tool`:
   ```js
   await scenario('act3Boss')
   ```
   `await scenario()` lists the presets. For anything else, pass your own setup:
   ```js
   await scenario({ classId: 'mage', level: 60, zone: 'crypt', boss: true })
   ```
   Scenarios use a throwaway demo character, so nothing touches a real save. The game stays on the current page, so click through to Combat or wherever you need to be. Add new presets to `src/dev/scenarios.ts` when a state is worth reusing, rather than rebuilding it by hand. `window.game` and `window.passTrial` are also available for small tweaks.
3. **Do what a player would do.** Click through the change with real input. Let combat run for real. For a player's bug report, match their class, area and gear as closely as you can before judging it.
4. **Check for problems.** Run `read_console_messages` with errors only. Then check that the numbers on screen match what's happening in the game.
5. **Clean up.** Stop any server you started, with `preview_stop`, so other sessions have a free slot.
6. **Report** in plain language what you tried, what happened and what you couldn't cover, with a screenshot for anything visual. "Not tested" is a fine answer; a guess isn't.

Don't run sims as part of this. A playtest checks that something works, not whether it's balanced.

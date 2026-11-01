---
name: build-act
description: Plan and build a large Path of Idle content batch (an act, Maps, or endgame content) as parallel sessions, then merge them. Use when asked to build an act, the next act, Maps or another multi-part content milestone.
---

# Build an act

You coordinate from this session. The building happens in separate sessions that each own one part.

1. **Read first:** `docs/MILESTONES.md`, `docs/design/ACT_RECIPE.md`, and the design doc for this act or milestone (`ACTS_4_6.md`, `ACT5.md`, `MAPS.md` and so on). If the picks for it aren't written down, run `/design-pass` first.
2. **Split the work by file** so no two sessions edit the same files. For an act, the usual three are:
   - **Stages:** areas, monsters, bosses, the new boss mechanic, the resistance check, roads and art.
   - **Skills:** the act's batch of skill gems and supports.
   - **Life skill:** the act's new trainable skill. Follow how Archaeology (`src/data/expedition.ts`, `src/engine/expedition.ts`) and Cooking were added: skill list, state, save migration, skilling tree, achievements, mini-game, page and sidebar.
3. **Tell the user the split in one or two lines, then start the sessions.** Use `start_session` with one session per part, each in its own worktree. Each brief names its files, what done looks like, and this block word for word:

   > Rules: do not edit `docs/MILESTONES.md` or `src/data/news.ts`; the coordinating session does that. Do not deploy, push or merge. Do not add sims or run long ones; tests and the build are fine. Don't pin things in tests that other branches of this act will change. Keep the act closed to players (`preview: true`) until it's released. Bump the patch version in commits that change the game. If you take a new save version, add its migration in `src/engine/save.ts` and report it.
   >
   > Done looks like: committed on your branch, with `npx tsc --noEmit -p .`, `npx vitest run` and the build passing. End with a report: what was built, save version changes, and anything left unfinished.

4. **While they run,** make small design calls yourself and answer their questions. Bring the user only big, taste-driven choices.
5. **When all have reported,** check each branch's diff rather than trusting the report. Save versions are the likely clash: if two branches took the same number, renumber one and keep both migrations.
6. **Ask the user before merging,** naming each branch. Once they agree, merge into one branch and run tests and the build.
7. **Check it and finish:** run `/playtest` on the new boss and life skill, tick the recipe's checklist, and update `docs/MILESTONES.md` and `src/data/news.ts`. Report what wasn't simmed or played. Run `/ship` when the user asks.

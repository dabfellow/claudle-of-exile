# Instructions for AI coding assistants

These rules apply to every assistant working in this project (GPT, Codex, Gemini, Copilot, Claude and others). `CLAUDE.md` holds the same rules for Claude.

## The most important rule: version numbers

**Do not change the version in `package.json` or `package-lock.json` during ordinary work.** Not for a bug fix, not for a feature, not for a small change, not when you commit.

The version goes up **only** when the user asks to ship, release, deploy or send it live, and then only **once** for the whole release, however many changes it holds. See "Releasing" below.

## Changelog: add to `UPCOMING`, not a new news entry

Each change that players will notice adds **one plain line** to the `UPCOMING` list in `src/data/news.ts`, written for players. For example:

```ts
export const UPCOMING: string[] = [
  'Stash tabs can now be sorted by item type.',
];
```

- Do **not** add a new entry to `NEWS` for ordinary work. `NEWS` entries are made only during a release.
- Keep every line already in `UPCOMING`. Add yours, never replace or remove others.
- Changes players won't notice (refactors, tests, tooling) need no line.

## Unique items list

`docs/UNIQUES.md` is generated. After adding or changing a unique item or a drop pool, run `npm run uniques` and commit the result. A test fails if it's stale.

## Milestones and to-do tracking

The plan, decisions, task list and history live in `docs/MILESTONES.md`.

- Before starting work, read it to see what's next.
- Keep `## Next steps` and the milestone status table current when work lands, and update the "Last updated" date.
- New requests bigger than a quick edit become a `- [ ]` item under their milestone, or under `## Other open items`.
- Finished and verified items get checked off (`- [x]`), dated (`— done YYYY-MM-DD`), and added to `## Done`.
- Unfinished work stays unchecked with an indented note on where it stands.
- New design decisions go under `## Decisions`. Follow-ups you notice go under `## Ideas / later` rather than being acted on unasked.

## Working with the user

- Change only what was asked. If it would move or rebalance anything else, ask first.
- The user isn't technical about git, hosting or tooling. Explain things plainly, by what they do for the players.
- The user often dictates, so odd words are probably transcription errors. Work out what was meant, or ask.
- Commit, push and deploy are one step to the user. If asked for any of them, do the whole release below.

## Releasing (only when asked to ship, release, commit, push or deploy)

1. **Look.** Run `git status` and `git diff --stat`. Release only the work from this task; leave unrelated changes out and say so.
2. **Docs.** Keep `docs/MILESTONES.md` current. Run `npm run uniques` if uniques or drop pools changed. Make sure `UPCOMING` has a line for anything players will notice.
3. **Commit** the work with a plain one-line message. No version change in this commit.
4. **Merge.** Run `git fetch origin`, then merge `origin/main` (and local `main`, if on another branch) into the current branch. On a conflict in `UPCOMING`, keep every line from both sides.
5. **Version and release notes, once.** Take the next patch number after the highest version in `package.json` (e.g. `0.3.20` → `0.3.21`). Set it in `package.json` and `package-lock.json`. Move every line of `UPCOMING` into a new entry at the top of `NEWS` with that version, today's date (like `2 Nov 2026`) and a short title, then leave `UPCOMING` empty. Commit with the title and version, like `Stash sorting, 0.3.21`. If `UPCOMING` is empty and nothing in the game changed, skip this step and don't bump.
6. **Test.** Run `npm ci --no-audit --no-fund` if `node_modules` is missing, then `npm test`. Fix failures caused by this work.
7. **Push** with `git push origin HEAD:main`. If it's rejected, go back to step 4.
8. **Deploy** with `npm run deploy`. Never bypass it with `npx cf deploy`. If it stops, fix what it names and run it again.
9. **Record it.** Note the version as live in `docs/MILESTONES.md`, commit, and push again. No second version bump.
10. **Report** in one or two plain lines: the version that's live and what changed for players.

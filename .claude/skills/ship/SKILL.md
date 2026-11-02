---
name: ship
description: Commit, push and deploy Path of Idle to dabfellow.party. Use whenever the user says ship it, send it live, commit, push, deploy, cpd, or any one of those; they all mean the whole release.
---

# Ship

Any one of commit, push or deploy means all of them, in this order. Don't stop to offer them separately. Other sessions ship in parallel, so follow the order exactly.

1. **Look.** Run `git status` and `git diff --stat`. Ship only this session's work. If unrelated changes are mixed in, leave them out and say so.
2. **Update the docs.** Per `CLAUDE.md`: keep `docs/MILESTONES.md` current. If a unique or drop pool changed, run `npm run uniques`. If players will notice this work, make sure `UPCOMING` in `src/data/news.ts` has a plain line for it.
3. **Commit** the work with a plain one-line message.
4. **Merge.** Run `git fetch origin`, then merge `origin/main` and the local `main` into this branch. Local `main` can hold live releases that aren't on GitHub. On a conflict, keep both sides' intent; in `UPCOMING`, keep every line from both sides. Ask the user only if the two changes truly can't both stand.
5. **Check for working sessions.** Load `mcp__ccd_session_mgmt__list_sessions` with ToolSearch, then call it with `limit: 50`. Count the sessions with `isRunning: true` whose `cwd` is in this project (the path contains `Claudle of exile`). Idle sessions don't count. Skip this step if the user said to ship now or ship anyway.
   - **If any are working, hold off the release.** Run step 7 (test), then `git push origin HEAD:main` (if it's rejected, go back to step 4). Don't bump the version or deploy. Report in plain words: the work is saved and goes live with the next release, and name the sessions still working. Stop here.
   - **If none are working,** carry on.
6. **Release notes and version.** Take the patch number after the highest in `package.json` on this branch, `origin/main` and `main`. Set it in `package.json` and `package-lock.json`. Move every line of `UPCOMING` into a new entry at the top of `NEWS`, with that version, today's date (like `2 Nov 2026`) and a short title, and leave `UPCOMING` empty. Commit with the title and version, like `Stash sorting and wiki tools, 0.3.11`. If `UPCOMING` is empty and nothing in the game changed, skip this step.
7. **Test.** Run `npm ci --no-audit --no-fund` if `node_modules` is missing, then `npm test`. Fix failures caused by this work. Don't run sims.
8. **Push to main.** Run `git push origin HEAD:main`. If it's rejected, another session got there first, so go back to step 4. If their release already published some of the `UPCOMING` lines, drop those from your entry and give it the next version.
9. **Deploy.** Run `npm run deploy` as its own command. It refuses to run on uncommitted changes, a stale branch or missing login settings, handles `.env.local` itself, and confirms the live site afterwards. Never bypass it with `npx cf deploy`. If it stops, fix what it names and run it again.
10. **Record it.** Note the version as live in `docs/MILESTONES.md`, commit, and `git push origin HEAD:main`. This needs no version bump or second deploy.
11. **Report** in one or two plain lines: the version that's live and what changed for players, including work other sessions held back for this release. Say what wasn't tested. No git terms.

If a step can't be finished, say exactly how far it got and whether the live game changed.

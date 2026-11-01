---
name: ship
description: Commit, push and deploy Path of Idle to dabfellow.party. Use whenever the user says ship it, send it live, commit, push, deploy, cpd, or any one of those; they all mean the whole release.
---

# Ship

Any one of commit, push or deploy means all of them, in this order. Don't stop to offer them separately. Other sessions ship in parallel, so follow the order exactly.

1. **Look.** Run `git status` and `git diff --stat`. Ship only this session's work. If unrelated changes are mixed in, leave them out and say so.
2. **Update the docs.** Per `CLAUDE.md`: keep `docs/MILESTONES.md` current. If a unique or drop pool changed, run `npm run uniques`.
3. **Commit** the work with a plain one-line message.
4. **Merge.** Run `git fetch origin`, then merge `origin/main` and the local `main` into this branch. Local `main` can hold live releases that aren't on GitHub. On a conflict, keep both sides' intent. Ask the user only if the two changes truly can't both stand.
5. **Bump the version.** Take the patch number after the highest in `package.json` on this branch, `origin/main` and `main`. Set it in `package.json` and `package-lock.json`, and put it at the end of the commit message, like `Cap ascendancy points, 0.2.44`. Skip this if nothing in the game changed.
6. **Test.** Run `npm ci --no-audit --no-fund` if `node_modules` is missing, then `npm test`. Fix failures caused by this work. Don't run sims.
7. **Push to main.** Run `git push origin HEAD:main`. If it's rejected, another session got there first, so go back to step 4.
8. **Deploy.** Run `npm run deploy` as its own command. It refuses to run on uncommitted changes, a stale branch or missing login settings, handles `.env.local` itself, and confirms the live site afterwards. Never bypass it with `npx cf deploy`. If it stops, fix what it names and run it again.
9. **Record it.** Note the version as live in `docs/MILESTONES.md`, commit, and `git push origin HEAD:main`. This needs no version bump or second deploy.
10. **Report** in one or two plain lines: the version that's live and what changed for players. Say what wasn't tested. No git terms.

If a step can't be finished, say exactly how far it got and whether the live game changed.

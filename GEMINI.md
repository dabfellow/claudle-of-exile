# Instructions for Gemini

Read and follow `AGENTS.md` in this folder. It holds all the project rules.

The two rules that matter most:

- **Never change the version in `package.json` or `package-lock.json` during ordinary work.** It goes up once per release, only when the user asks to ship, release or deploy.
- **For each change players will notice, add one plain line to `UPCOMING` in `src/data/news.ts`.** Don't add a new `NEWS` entry; a release does that.

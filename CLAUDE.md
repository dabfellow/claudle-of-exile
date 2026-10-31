# Project instructions

## Version number

The version in `package.json` shows under the title in the game's sidebar, so you can tell a refresh picked up the latest build. Bump the patch number (0.2.3 → 0.2.4, and in `package-lock.json`) in every commit that changes the game, and before every push or deploy.

## To-do tracking

The running task list lives in [docs/TODO.md](docs/TODO.md).

- **Before starting work**, read `docs/TODO.md` to see what's open and whether the request matches an existing item.
- **When the user asks for something new** that will take more than a quick edit, add it under `## Open` as a `- [ ]` item (one line, plus indented sub-items if it has distinct parts).
- **When an item is finished and verified**, check it off (`- [x]`), add the date (`— done YYYY-MM-DD`), and move it to `## Done`.
- **If something is started but not finished** by the end of a session, leave it unchecked and add an indented note saying where it stands.
- **Follow-ups you notice** (bugs spotted in passing, balance concerns, TODO comments) go under `## Ideas / later` rather than being acted on unasked.
- Keep entries short; details belong in the relevant design doc in `docs/`, linked from the item.

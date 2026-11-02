# Project instructions

## Version number

The version in `package.json` shows under the title in the game's sidebar, so you can tell a refresh picked up the latest build. It goes up once per release, in the `/ship` skill's release step. Don't bump it in ordinary commits.

## Changelog

Each change that players will notice adds one plain line to `UPCOMING` in [src/data/news.ts](src/data/news.ts). A release moves those lines into a new news entry with the new version, and empties `UPCOMING`. `/ship` holds off the release while other sessions are still working, and pushes the work so the next release includes it.

## Unique items list

[docs/UNIQUES.md](docs/UNIQUES.md) is the running list of every unique: mods, base and where it drops. It's generated, so run `npm run uniques` after adding or changing a unique or a drop pool, and commit the result. A test fails if it's stale.

## Milestones and to-do tracking

The plan, decisions, task list and history all live in [docs/MILESTONES.md](docs/MILESTONES.md).

- **Before starting work**, read `docs/MILESTONES.md` to see what's next and whether the request matches an existing item.
- **Keep `## Next steps` and the milestone status table current** whenever work lands, and update the "Last updated" date.
- **When the user asks for something new** that will take more than a quick edit, add it as a `- [ ]` item under its milestone, or under `## Other open items` if none fits (one line, plus indented sub-items if it has distinct parts).
- **When an item is finished and verified**, check it off (`- [x]`), add the date (`— done YYYY-MM-DD`), and add it to `## Done`.
- **If something is started but not finished** by the end of a session, leave it unchecked and add an indented note saying where it stands.
- **New design decisions** go under `## Decisions`, or in the relevant design doc linked from there.
- **Follow-ups you notice** (bugs spotted in passing, balance concerns, TODO comments) go under `## Ideas / later` rather than being acted on unasked.
- Keep entries short; details belong in the relevant design doc in `docs/`, linked from the item.

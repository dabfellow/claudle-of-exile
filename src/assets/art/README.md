# Game art

1. Save the image with the file name its slot expects (`trader.png`, `currency_1.png`, …) and drop it anywhere in this folder.
2. Run `npm run art`: it resizes/compresses each one to `.webp`, cuts sprite sheets into their 9 icons, deletes the originals and tells you what's next.

Anything missing falls back to the built-in placeholder. Pack art is wired in `src/ui/assets.ts`.

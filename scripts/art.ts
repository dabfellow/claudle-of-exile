/**
 * Art pipeline.
 *   npm run art          import new PNG/JPGs dropped into src/assets/art, resize them to .webp, report what's missing
 *   npm run art -- --docs  regenerate docs/ART_PROMPTS.md from src/data/artManifest.ts
 *
 * Drop files either in their folder (`src/assets/art/currency/chaos.png`) or loose in
 * `src/assets/art/` when the name is unambiguous (`chaos.png`). ChatGPT's "ChatGPT Image …" names
 * won't match — rename them to the file name in the prompt list first.
 *
 * Sprite sheets (`currency_1.png`, see artSheets) can go in `src/assets/art/sheets/` or loose; each
 * 3×3 cell is cut out, trimmed and imported as its own icon.
 */
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import sharp from 'sharp';
import { ART_GROUPS, ART_STYLE, artManifest, artSheets, SHEET_GRID, SHEET_GROUPS, type ArtEntry, type ArtGroup, type ArtSheet } from '../src/data/artManifest';

const ROOT = join(__dirname, '..', 'src', 'assets', 'art');
const RAW = new Set(['.png', '.jpg', '.jpeg']); // .webp drop-ins are handled in run()
/** icons keep their transparency and are fitted inside the square; pictures are cropped to fill */
const ICON_GROUPS = new Set<ArtGroup>(['currency', 'materials', 'flasks', 'items', 'uniques', 'gems']);
/** shave this much off each sheet cell's edges so a neighbour's stray pixels don't come along */
const CELL_INSET = 0.03;
/** transparent margin added around each sliced icon, as a fraction of its size */
const ICON_PADDING = 0.06;

const manifest = artManifest();
const byKey = new Map(manifest.map((e) => [e.key, e]));
const sheets = artSheets(manifest);

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const keyOf = (file: string) => relative(ROOT, file).replace(/\\/g, '/').replace(/\.[a-z]+$/i, '');
const bareName = (file: string) => basename(keyOf(file)).toLowerCase().replace(/[\s-]+/g, '_').replace(/^sheet_/, '');

/** Match a dropped file to a manifest entry: exact path first, then a unique bare name. */
function resolve(file: string): ArtEntry | string {
  const key = keyOf(file);
  if (byKey.has(key)) return byKey.get(key)!;
  const name = bareName(file);
  const hits = manifest.filter((e) => e.key.endsWith(`/${name}`) || e.key.replace('/', '_') === name);
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) return `ambiguous — put it in one of: ${hits.map((h) => h.group + '/').join(', ')}`;
  return 'no matching name in the art list';
}

async function writeIcon(input: Buffer, e: ArtEntry): Promise<void> {
  const [w, h] = ART_GROUPS[e.group].size;
  const out = join(ROOT, `${e.key}.webp`);
  mkdirSync(dirname(out), { recursive: true });
  const icon = ICON_GROUPS.has(e.group);
  const buf = await sharp(input)
    .resize(w, h, icon ? { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } } : { fit: 'cover', position: 'attention' })
    .webp({ quality: icon ? 90 : 82, alphaQuality: 100 })
    .toBuffer();
  writeFileSync(out, buf);
}

async function importFile(file: string, e: ArtEntry): Promise<void> {
  const input = readFileSync(file); // read first: the output may overwrite the input in place
  await writeIcon(input, e);
  if (file !== join(ROOT, `${e.key}.webp`)) unlinkSync(file);
  const [w, h] = ART_GROUPS[e.group].size;
  console.log(`  ✓ ${relative(ROOT, file)} → ${e.key}.webp (${w}×${h})`);
}

/** Cut a 3×3 sprite sheet into its icons: each cell is inset, trimmed to its content, then imported. */
async function importSheet(file: string, sheet: ArtSheet): Promise<void> {
  const input = readFileSync(file);
  const { width = 0, height = 0 } = await sharp(input).metadata();
  const cw = width / SHEET_GRID;
  const ch = height / SHEET_GRID;
  for (let i = 0; i < sheet.entries.length; i++) {
    const col = i % SHEET_GRID;
    const row = Math.floor(i / SHEET_GRID);
    const cell = await sharp(input)
      .extract({
        left: Math.round(col * cw + cw * CELL_INSET),
        top: Math.round(row * ch + ch * CELL_INSET),
        width: Math.round(cw * (1 - 2 * CELL_INSET)),
        height: Math.round(ch * (1 - 2 * CELL_INSET)),
      })
      .toBuffer();
    let trimmed = cell;
    try {
      // trim to the icon, then pad it back out a little so it doesn't touch the slot's edges
      const t = await sharp(cell).trim({ threshold: 12 }).toBuffer({ resolveWithObject: true });
      const pad = Math.round(Math.max(t.info.width, t.info.height) * ICON_PADDING);
      const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
      trimmed = await sharp(t.data).extend({ top: pad, bottom: pad, left: pad, right: pad, background: transparent }).toBuffer();
    } catch {
      // a cell that is all background can't be trimmed; keep it whole
    }
    await writeIcon(trimmed, sheet.entries[i]);
  }
  unlinkSync(file);
  console.log(`  ✓ ${relative(ROOT, file)} → ${sheet.entries.length} ${sheet.group} icons (${sheet.entries.map((e) => basename(e.key)).join(', ')})`);
}

function present(): Set<string> {
  return new Set(walk(ROOT).filter((f) => extname(f) === '.webp' || RAW.has(extname(f).toLowerCase())).map(keyOf));
}

async function run() {
  const raw = walk(ROOT).filter((f) => RAW.has(extname(f).toLowerCase()));
  // a dropped-in .webp counts as raw unless it's already an imported file at its target size
  for (const f of walk(ROOT).filter((x) => extname(x).toLowerCase() === '.webp')) {
    const e = byKey.get(keyOf(f));
    const meta = await sharp(readFileSync(f)).metadata();
    if (!e || meta.width !== ART_GROUPS[e.group].size[0] || meta.height !== ART_GROUPS[e.group].size[1]) raw.push(f);
  }
  if (raw.length) console.log(`Importing ${raw.length} file(s):`);
  for (const f of raw) {
    const sheet = sheets.find((x) => x.id === bareName(f));
    if (sheet) {
      await importSheet(f, sheet);
      continue;
    }
    const e = resolve(f);
    if (typeof e === 'string') console.log(`  ✗ ${relative(ROOT, f)}: ${e}`);
    else await importFile(f, e);
  }

  const have = present();
  console.log('\nArt coverage');
  const groups = Object.entries(ART_GROUPS).sort((a, b) => a[1].priority - b[1].priority) as [ArtGroup, (typeof ART_GROUPS)[ArtGroup]][];
  for (const [g, def] of groups) {
    const list = manifest.filter((e) => e.group === g);
    const n = list.filter((e) => have.has(e.key)).length;
    console.log(`  P${def.priority} ${g.padEnd(10)} ${String(n).padStart(3)}/${list.length}${n === list.length ? '  ✓' : ''}`);
  }
  const missing = manifest.filter((e) => !have.has(e.key));
  if (!missing.length) return console.log('\nAll art is in. 🎉');
  const next = missing.sort((a, b) => ART_GROUPS[a.group].priority - ART_GROUPS[b.group].priority)[0];
  const sheet = sheets.find((x) => x.entries.includes(next));
  console.log(`\nNext up in docs/ART_PROMPTS.md: ${sheet ? `sheet ${sheet.id}.png` : `${basename(next.key)}.png`} (${ART_GROUPS[next.group].title})`);
}

// ---------- docs/ART_PROMPTS.md ----------

function singlePrompt(e: ArtEntry): string {
  return `${ART_STYLE}\n\nFormat: ${ART_GROUPS[e.group].format}\n\nSubject: ${e.prompt}`;
}

function sheetPrompt(sheet: ArtSheet): string {
  const cells = SHEET_GRID * SHEET_GRID;
  const list = sheet.entries.map((e, i) => `${i + 1}. ${e.desc}`).join('\n');
  const empty = sheet.entries.length < cells ? `\nLeave cell${cells - sheet.entries.length > 1 ? 's' : ''} ${sheet.entries.length + 1}${cells - sheet.entries.length > 1 ? `–${cells}` : ''} completely empty.` : '';
  return (
    `${ART_STYLE}\n\n` +
    `Format: one square 1024×1024 sprite sheet with a transparent background, divided into an invisible ${SHEET_GRID}×${SHEET_GRID} grid of equal square cells. ` +
    `Put exactly one inventory icon in each cell, centred, with clear empty space around it — nothing touches or crosses a cell edge. ` +
    `No grid lines, borders, numbers or labels. All icons share the same lighting and style. ${SHEET_GROUPS[sheet.group]}\n\n` +
    `Fill the cells left to right, top to bottom:\n${list}${empty}`
  );
}

function docs() {
  const have = present();
  const done = (keys: ArtEntry[]) => keys.every((e) => have.has(e.key));
  const lines: string[] = [];
  const total = manifest.length;
  const count = manifest.filter((e) => have.has(e.key)).length;
  lines.push('# Art prompt pack (ChatGPT image generation)');
  lines.push('');
  lines.push('> Generated from `src/data/artManifest.ts` by `npm run art -- --docs`. Edit prompts there, not here.');
  lines.push(`> ${count}/${total} images in the game when this was generated. Sections marked ✅ are done.`);
  lines.push('');
  lines.push('## How to use');
  lines.push('');
  lines.push('1. Each grey box is one complete prompt with the style built in. Copy the whole box, paste it into ChatGPT and send. One box = one image.');
  lines.push('2. Save the image with the **file name in the heading** (e.g. `trader.png`) and drop it into `src/assets/art/` (any folder there works).');
  lines.push('3. Small icons come as **sprite sheets**: one image holds 9 icons in a 3×3 grid. Save it as the sheet name (e.g. `currency_1.png`) and `npm run art` cuts it into 9 icons.');
  lines.push('4. Run `npm run art`. It resizes everything to `.webp`, deletes the originals and tells you what is next.');
  lines.push('');
  lines.push('Tips: generating several images in the same ChatGPT conversation keeps the style consistent. If a sheet comes back with icons touching or crossing the cells, ask *"same sheet, but with more space around each icon"*. If the background isn\'t transparent, ask *"make the background transparent"*. If it comes back busy, shiny or glowing, reply *"simpler: same subject, remove the extra objects, glow and effects, softer lighting"*. You can still make any icon on its own: name it after the item (e.g. `chaos.png`) and it imports like any other image. Check the current OpenAI terms on image usage before a commercial release.');

  const groups = Object.entries(ART_GROUPS).sort((a, b) => a[1].priority - b[1].priority) as [ArtGroup, (typeof ART_GROUPS)[ArtGroup]][];
  for (const [g, def] of groups) {
    const list = manifest.filter((e) => e.group === g);
    const groupSheets = sheets.filter((x) => x.group === g);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`## Priority ${def.priority} — ${def.title} (${list.length}${groupSheets.length ? ` icons on ${groupSheets.length} sheet${groupSheets.length > 1 ? 's' : ''}` : ''})${done(list) ? ' ✅' : ''}`);
    if (groupSheets.length) {
      for (const sh of groupSheets) {
        lines.push('');
        lines.push(`### \`${sh.id}.png\`${done(sh.entries) ? ' ✅' : ''}`);
        lines.push('');
        lines.push(`Contains: ${sh.entries.map((e) => e.name).join(', ')}`);
        lines.push('');
        lines.push('```text');
        lines.push(sheetPrompt(sh));
        lines.push('```');
      }
    } else {
      for (const e of list) {
        lines.push('');
        lines.push(`### \`${basename(e.key)}.png\`${have.has(e.key) ? ' ✅' : ''}`);
        lines.push('');
        lines.push('```text');
        lines.push(singlePrompt(e));
        lines.push('```');
      }
    }
  }
  lines.push('');
  writeFileSync(join(__dirname, '..', 'docs', 'ART_PROMPTS.md'), lines.join('\n'));
  console.log(`docs/ART_PROMPTS.md written (${total} images: ${manifest.length - sheets.reduce((a, s) => a + s.entries.length, 0)} single prompts + ${sheets.length} sprite sheets).`);
}

if (process.argv.includes('--docs')) docs();
else void run();

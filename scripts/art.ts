/**
 * Art pipeline.
 *   npm run art          import new PNG/JPGs dropped into src/assets/art, resize them to .webp, report what's missing
 *   npm run art -- --docs  regenerate docs/ART_PROMPTS.md from src/data/artManifest.ts
 *
 * Drop files either in their folder (`src/assets/art/currency/chaos.png`) or loose in
 * `src/assets/art/` when the name is unambiguous (`chaos.png`). ChatGPT's "ChatGPT Image …" names
 * won't match — rename them to the file name in the prompt list first.
 */
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import sharp from 'sharp';
import { ART_GROUPS, artManifest, type ArtEntry, type ArtGroup } from '../src/data/artManifest';

const ROOT = join(__dirname, '..', 'src', 'assets', 'art');
const RAW = new Set(['.png', '.jpg', '.jpeg']); // .webp drop-ins are handled in run()
/** icons keep their transparency and are fitted inside the square; pictures are cropped to fill */
const ICON_GROUPS = new Set<ArtGroup>(['currency', 'materials', 'flasks', 'items', 'uniques', 'gems']);

const manifest = artManifest();
const byKey = new Map(manifest.map((e) => [e.key, e]));

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const keyOf = (file: string) => relative(ROOT, file).replace(/\\/g, '/').replace(/\.[a-z]+$/i, '');

/** Match a dropped file to a manifest entry: exact path first, then a unique bare name. */
function resolve(file: string): ArtEntry | string {
  const key = keyOf(file);
  if (byKey.has(key)) return byKey.get(key)!;
  const name = basename(key).toLowerCase().replace(/[\s-]+/g, '_');
  const hits = manifest.filter((e) => e.key.endsWith(`/${name}`) || e.key.replace('/', '_') === name);
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) return `ambiguous — put it in one of: ${hits.map((h) => h.group + '/').join(', ')}`;
  return 'no matching name in the art list';
}

async function importFile(file: string, e: ArtEntry): Promise<void> {
  const [w, h] = ART_GROUPS[e.group].size;
  const out = join(ROOT, `${e.key}.webp`);
  mkdirSync(dirname(out), { recursive: true });
  const icon = ICON_GROUPS.has(e.group);
  const input = readFileSync(file); // read first: the output may overwrite the input in place
  const buf = await sharp(input)
    .resize(w, h, icon ? { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } } : { fit: 'cover', position: 'attention' })
    .webp({ quality: icon ? 90 : 82, alphaQuality: 100 })
    .toBuffer();
  writeFileSync(out, buf);
  if (file !== out) unlinkSync(file);
  console.log(`  ✓ ${relative(ROOT, file)} → ${e.key}.webp (${w}×${h})`);
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
  const next = groups.map(([g]) => manifest.filter((e) => e.group === g && !have.has(e.key))).find((l) => l.length);
  if (next) {
    console.log(`\nNext up (${ART_GROUPS[next[0].group].title}):`);
    for (const e of next.slice(0, 8)) console.log(`  ${e.key}.png — ${e.prompt}`);
  } else console.log('\nAll art is in. 🎉');
}

function docs() {
  const lines: string[] = [];
  lines.push('# Art prompt pack (ChatGPT image generation)');
  lines.push('');
  lines.push('> Generated from `src/data/artManifest.ts` by `npm run art -- --docs`. Edit prompts there, not here.');
  lines.push('');
  lines.push('## Workflow');
  lines.push('');
  lines.push('1. Start **one ChatGPT conversation per section** below and paste the **style block** first, then ask for one image per message.');
  lines.push('2. Save each image with the **exact file name** listed (e.g. `chaos.png`). Drop it into `src/assets/art/<folder>/`, or loose into `src/assets/art/` if the name is unique.');
  lines.push('3. Run `npm run art`. It resizes and compresses every new image to `.webp`, deletes the original, and prints what is still missing.');
  lines.push('4. Refresh the game — art appears automatically; anything missing keeps its placeholder.');
  lines.push('');
  lines.push('Tips: if a picture drifts in style, reply *"same style as the first image, but …"*. Icons need a **transparent background** — if you get a solid one, say *"make the background transparent"*. Check the current OpenAI terms on image usage before a commercial release.');
  lines.push('');
  lines.push('### Style block — paste at the start of every conversation');
  lines.push('');
  lines.push('```');
  lines.push('Art style for a dark-fantasy browser game called "Claudle of Exile" (inspired by Path of Exile and Diablo):');
  lines.push('painterly digital illustration, grim and moody, desaturated earthy palette with warm candle/ember highlights');
  lines.push('(gold #d2a659 accents), strong rim lighting, high detail but readable at small sizes, no text, no logos,');
  lines.push('no watermarks, no UI frames. Keep this exact style for every image I ask for in this conversation.');
  lines.push('```');
  const groups = Object.entries(ART_GROUPS).sort((a, b) => a[1].priority - b[1].priority) as [ArtGroup, (typeof ART_GROUPS)[ArtGroup]][];
  for (const [g, def] of groups) {
    const list = manifest.filter((e) => e.group === g);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`## Priority ${def.priority} — ${def.title} (${list.length})`);
    lines.push('');
    lines.push(`Folder: \`src/assets/art/${g}/\` — ${def.format}`);
    lines.push('');
    lines.push('| File | Prompt (after the style block) |');
    lines.push('|---|---|');
    for (const e of list) lines.push(`| \`${basename(e.key)}.png\` | ${e.prompt.replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
  writeFileSync(join(__dirname, '..', 'docs', 'ART_PROMPTS.md'), lines.join('\n'));
  console.log(`docs/ART_PROMPTS.md written (${manifest.length} images).`);
}

if (process.argv.includes('--docs')) docs();
else void run();

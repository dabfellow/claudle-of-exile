import { packager } from '@electron/packager';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const staging = join(repo, 'tmp/desktop-api-staging');
const game = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8'));
await mkdir(staging, { recursive: true });
for (const name of ['main.cjs', 'preload.cjs', 'live-api.cjs']) await cp(join(repo, 'scripts/desktop', name), join(staging, name));
await writeFile(join(staging, 'package.json'), JSON.stringify({ name: 'path-of-idle-balance-lab', productName: 'Path of Idle Balance Lab', version: game.version, main: 'main.cjs' }, null, 2));
const paths = await packager({
  dir: staging, out: join(repo, 'tmp/desktop'), name: 'Path of Idle Balance Lab', executableName: 'Path of Idle Balance Lab',
  platform: 'win32', arch: 'x64', overwrite: true, asar: true,
  electronVersion: JSON.parse(readFileSync(join(repo, 'node_modules/electron/package.json'), 'utf8')).version,
  win32metadata: { CompanyName: 'Path of Idle', FileDescription: 'Path of Idle Balance Lab', ProductName: 'Path of Idle Balance Lab' },
});
console.log(`Desktop app: ${paths[0]}`);

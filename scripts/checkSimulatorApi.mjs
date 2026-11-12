import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const { validateManifest, hash } = createRequire(import.meta.url)('./desktop/live-api.cjs');
const root = resolve('.cloudflare/output/v0/workers/default/assets');
const manifest = validateManifest(JSON.parse(await readFile(resolve(root, 'path-of-idle/api/simulator/v1/manifest.json'), 'utf8')));
if (hash(await readFile(resolve(root, '.' + manifest.game.entry))) !== manifest.game.sha256) throw new Error('API manifest does not match the built game entry');
for (const artifact of manifest.artifacts) {
  const bytes = await readFile(resolve(root, '.' + manifest.basePath, artifact.path));
  if (bytes.length !== artifact.bytes || hash(bytes) !== artifact.sha256) throw new Error(`Incorrect artifact: ${artifact.path}`);
}
const runtime = await import(pathToFileURL(resolve(root, '.' + manifest.basePath, manifest.runtime)).href);
const catalog = JSON.parse(await readFile(resolve(root, '.' + manifest.basePath, manifest.catalog), 'utf8'));
if (runtime.gameVersion !== manifest.gameVersion || catalog.gameVersion !== manifest.gameVersion) throw new Error('Catalog/runtime versions differ from the game');
for (const cls of catalog.classes.CLASSES) {
  const sim = runtime.createSimulation({ ...runtime.defaultConfig(), classId: cls.id, autoTree: false }, manifest.gameVersion);
  for (let second = 0; second < 180; second++) sim.step();
  if (sim.report.kills <= 0) throw new Error(`Published runtime did not fight as ${cls.id}`);
}
console.log(`Simulator API ${manifest.gameVersion}: game hash, ${manifest.artifacts.length} artifacts, catalog and all seven classes verified.`);

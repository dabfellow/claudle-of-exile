import { build as viteBuild, loadEnv, type Plugin } from 'vite';
import { build as esbuild } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertPublicEnv } from './publicEnv';

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
export const SIM_API = 'path-of-idle/api/simulator/v1';

/** Generate an immutable runtime/catalog/app release and a small current-release pointer. */
export async function generateSimulatorApi(version: string, game: { entry: string; sha256: string }, mode = 'production') {
  const rendered = await viteBuild({ configFile: resolve('scripts/simulator.vite.ts'), mode, logLevel: 'error', build: { write: false } });
  const outputs = Array.isArray(rendered) ? rendered : [rendered];
  const files: Record<string, Uint8Array> = {};
  for (const output of outputs) {
    if (!('output' in output)) throw new Error('Simulator renderer did not produce a bundle');
    for (const file of output.output) files[file.fileName] = file.type === 'chunk' ? Buffer.from(file.code) : typeof file.source === 'string' ? Buffer.from(file.source) : file.source;
  }
  const runtime = await esbuild({ entryPoints: ['src/simulator/runtime.ts'], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
    define: { __APP_VERSION__: JSON.stringify(version), 'import.meta.env': JSON.stringify({ DEV: false, PROD: true }) },
  });
  files['runtime.js'] = runtime.outputFiles[0].contents;
  // Evaluate only our generated, pure game/runtime module, never remote code in the build process.
  const engine = await import(`data:text/javascript;base64,${Buffer.from(files['runtime.js']).toString('base64')}`);
  files['catalog.json'] = Buffer.from(JSON.stringify(engine.catalog()));
  const artifacts = Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([path, data]) => ({ path, sha256: sha256(data), bytes: data.length }));
  const releaseId = `${version}-${sha256(JSON.stringify({ game, artifacts })).slice(0, 20)}`;
  const basePath = `/${SIM_API}/releases/${releaseId}/`;
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('VITE_'))) };
  assertPublicEnv(env);
  const eventFeed = env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY ? { url: `${env.VITE_SUPABASE_URL.replace(/\/$/, '')}/rest/v1/live_events?select=*`, publicKey: env.VITE_SUPABASE_ANON_KEY } : null;
  const manifest = { schemaVersion: 1, gameVersion: version, releaseId, basePath, entry: 'simulator.html', runtime: 'runtime.js', catalog: 'catalog.json', game, artifacts, eventFeed };
  const published: Record<string, Uint8Array> = { [`${SIM_API}/manifest.json`]: Buffer.from(JSON.stringify(manifest)) };
  for (const [path, data] of Object.entries(files)) published[`${basePath.slice(1)}${path}`] = data;
  return { manifest, files: published };
}

export function simulatorApiPlugin(version: string): Plugin {
  return { name: 'path-of-idle-simulator-api', apply: 'build', enforce: 'post', async writeBundle(options, bundle) {
    // Cloudflare also builds a server environment. Only the player's client publishes this API.
    if (this.environment.name !== 'client') return;
    const entry = Object.values(bundle).find(file => file.type === 'chunk' && file.isEntry && /(?:src[\\/]main\.tsx|[\\/]index\.html)$/.test(file.facadeModuleId ?? ''));
    if (!entry || entry.type !== 'chunk') throw new Error('Cannot bind the simulator API to the game entry bundle');
    if (!options.dir) throw new Error('Simulator API requires a game output directory');
    const gameCode = await readFile(resolve(options.dir, entry.fileName));
    const api = await generateSimulatorApi(version, { entry: `/${entry.fileName}`, sha256: sha256(gameCode) });
    for (const [fileName, source] of Object.entries(api.files)) {
      const target = resolve(options.dir, fileName);
      await mkdir(resolve(target, '..'), { recursive: true });
      await writeFile(target, source);
    }
  } };
}

export async function writeSimulatorApi(directory: string, version: string) {
  const api = await generateSimulatorApi(version, { entry: '/development-game.js', sha256: sha256('development') }, 'development');
  for (const [path, data] of Object.entries(api.files)) { const target = resolve(directory, path); await mkdir(resolve(target, '..'), { recursive: true }); await writeFile(target, data); }
  return api.manifest;
}

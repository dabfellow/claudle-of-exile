const { createHash } = require('node:crypto');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve, dirname } = require('node:path');
const LIVE_ORIGIN = 'https://dabfellow.party';
const MANIFEST_URL = `${LIVE_ORIGIN}/path-of-idle/api/simulator/v1/manifest.json`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const safePath = path => typeof path === 'string' && /^[\w./-]+$/.test(path) && !path.startsWith('/') && !path.split('/').some(p => p === '..' || p === '.' || !p);

function validateManifest(m) {
  if (m?.schemaVersion !== 1 || !/^\d+\.\d+\.\d+$/.test(m.gameVersion) || !/^[\w.-]+$/.test(m.releaseId)) throw new Error('The live game returned an unsupported simulator API.');
  if (m.basePath !== `/path-of-idle/api/simulator/v1/releases/${m.releaseId}/`) throw new Error('Invalid live simulator release path.');
  if (!Array.isArray(m.artifacts) || m.artifacts.length < 3 || m.artifacts.length > 100) throw new Error('The live API has no complete simulator release.');
  const seen = new Set();
  for (const artifact of m.artifacts) {
    if (!safePath(artifact.path) || seen.has(artifact.path) || !/^[a-f0-9]{64}$/.test(artifact.sha256) || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 0 || artifact.bytes > 20_000_000) throw new Error('Invalid simulator artifact.');
    seen.add(artifact.path);
  }
  if (![m.entry, m.runtime, m.catalog].every(path => seen.has(path))) throw new Error('The live API is missing its app, engine or catalog.');
  if (!/^\/path-of-idle\/assets\/[\w.-]+\.js$/.test(m.game?.entry) || !/^[a-f0-9]{64}$/.test(m.game?.sha256)) throw new Error('The API does not identify its published game bundle.');
  if (!m.eventFeed || !/^https:\/\/[a-z0-9]+\.supabase\.co\/rest\/v1\/live_events\?select=\*$/.test(m.eventFeed.url) || typeof m.eventFeed.publicKey !== 'string') throw new Error('The live API is missing its public event feed.');
  return m;
}
async function read(url, fetcher = fetch, headers = {}) {
  const response = await fetcher(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache', ...headers }, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`The live game API could not be read (HTTP ${response.status}).`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > 20_000_000) throw new Error('The live game returned an unexpectedly large API response.');
  return data;
}
async function liveManifest(fetcher = fetch) {
  let manifest;
  try { manifest = validateManifest(JSON.parse((await read(MANIFEST_URL, fetcher)).toString('utf8'))); }
  catch (error) { throw new Error(`The simulator API is not available on the live game yet, or could not be verified. Publish the game with the simulator API first. No local values were loaded.\n\n${error.message}`); }
  const html = (await read(`${LIVE_ORIGIN}/path-of-idle/`, fetcher)).toString('utf8');
  if (!html.includes(`src="${manifest.game.entry}"`) && !html.includes(`src='${manifest.game.entry}'`)) throw new Error('The simulator API and the live game are different releases. Try again after deployment finishes.');
  if (hash(await read(new URL(manifest.game.entry, LIVE_ORIGIN), fetcher)) !== manifest.game.sha256) throw new Error('The simulator API does not match the published game engine. No simulation will run.');
  return manifest;
}
async function readEvents(manifest, fetcher = fetch) {
  const rows = JSON.parse((await read(manifest.eventFeed.url, fetcher, { apikey: manifest.eventFeed.publicKey, Authorization: `Bearer ${manifest.eventFeed.publicKey}` })).toString('utf8'));
  if (!Array.isArray(rows)) throw new Error('The current live event settings could not be read.');
  return rows;
}
async function downloadRelease(directory, fetcher = fetch) {
  const manifest = await liveManifest(fetcher);
  const destination = resolve(directory, manifest.releaseId);
  for (const artifact of manifest.artifacts) {
    const bytes = await read(new URL(manifest.basePath + artifact.path, LIVE_ORIGIN), fetcher);
    if (bytes.length !== artifact.bytes || hash(bytes) !== artifact.sha256) throw new Error(`Live simulator download failed integrity verification: ${artifact.path}`);
    const path = resolve(destination, artifact.path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }
  const eventRows = await readEvents(manifest, fetcher);
  return { renderer: destination, manifest, source: { gameVersion: manifest.gameVersion, releaseId: manifest.releaseId, checkedAt: new Date().toISOString(), origin: LIVE_ORIGIN, eventRows } };
}
module.exports = { LIVE_ORIGIN, MANIFEST_URL, validateManifest, liveManifest, readEvents, downloadRelease, hash };

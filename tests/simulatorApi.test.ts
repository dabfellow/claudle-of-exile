import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { validateManifest, liveManifest, downloadRelease, hash, MANIFEST_URL, LIVE_ORIGIN } = createRequire(import.meta.url)('../scripts/desktop/live-api.cjs');

function fixture() {
  const game = Buffer.from('published game 0.4.33');
  const files = { 'simulator.html': Buffer.from('<html>Live simulator</html>'), 'runtime.js': Buffer.from('export const gameVersion="0.4.33";'), 'catalog.json': Buffer.from('{"gameVersion":"0.4.33"}') };
  const manifest = { schemaVersion: 1, gameVersion: '0.4.33', releaseId: '0.4.33-test', basePath: '/path-of-idle/api/simulator/v1/releases/0.4.33-test/', entry: 'simulator.html', runtime: 'runtime.js', catalog: 'catalog.json', game: { entry: '/path-of-idle/assets/index-test.js', sha256: hash(game) }, artifacts: Object.entries(files).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: hash(bytes) })), eventFeed: { url: 'https://example.supabase.co/rest/v1/live_events?select=*', publicKey: 'public-test-key' } };
  const responses = new Map<string, string | Buffer>([
    [MANIFEST_URL, JSON.stringify(manifest)], [`${LIVE_ORIGIN}/path-of-idle/`, `<script type="module" src="${manifest.game.entry}"></script>`],
    [`${LIVE_ORIGIN}${manifest.game.entry}`, game], [manifest.eventFeed.url, '[{"id":"double_xp","enabled":true,"starts_at":null,"ends_at":null}]'],
    ...Object.entries(files).map(([path, bytes]): [string, Buffer] => [`${LIVE_ORIGIN}${manifest.basePath}${path}`, bytes]),
  ]);
  const fetcher = vi.fn(async (url: string | URL) => { const value = responses.get(String(url)); return value === undefined ? new Response('missing', { status: 404 }) : new Response(value); });
  return { manifest, responses, fetcher, files };
}

describe('live simulator API client', () => {
  it('loads the published release, verifies every byte, and includes current server events', async () => {
    const f = fixture(), directory = await mkdtemp(join(tmpdir(), 'poi-api-test-'));
    try {
      const result = await downloadRelease(directory, f.fetcher);
      expect(result.source.gameVersion).toBe('0.4.33');
      expect(result.source.eventRows[0].id).toBe('double_xp');
      expect(await readFile(join(result.renderer, 'runtime.js'))).toEqual(f.files['runtime.js']);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  it('rejects a manifest from a different deployed game instead of trusting its version label', async () => {
    const f = fixture(); f.responses.set(`${LIVE_ORIGIN}${f.manifest.game.entry}`, 'different game bytes');
    await expect(liveManifest(f.fetcher)).rejects.toThrow('does not match');
  });
  it('rejects a stale API when the live HTML points to a newer game', async () => {
    const f = fixture(); f.responses.set(`${LIVE_ORIGIN}/path-of-idle/`, '<script src="/path-of-idle/assets/newer.js"></script>');
    await expect(liveManifest(f.fetcher)).rejects.toThrow('different releases');
  });
  it('blocks a missing API without loading a local fallback', async () => {
    const f = fixture(); f.responses.delete(MANIFEST_URL);
    await expect(liveManifest(f.fetcher)).rejects.toThrow('No local values were loaded');
    expect(f.fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects tampered simulator code before returning a runnable release', async () => {
    const f = fixture(), directory = await mkdtemp(join(tmpdir(), 'poi-api-test-'));
    f.responses.set(`${LIVE_ORIGIN}${f.manifest.basePath}runtime.js`, 'tampered');
    try { await expect(downloadRelease(directory, f.fetcher)).rejects.toThrow('integrity'); }
    finally { await rm(directory, { recursive: true, force: true }); }
  });
  it('rejects paths outside the release folder and incompatible schemas', () => {
    const f = fixture();
    expect(() => validateManifest({ ...f.manifest, schemaVersion: 2 })).toThrow();
    expect(() => validateManifest({ ...f.manifest, artifacts: [...f.manifest.artifacts, { path: '../escape.js', sha256: hash('x'), bytes: 1 }] })).toThrow();
  });
});

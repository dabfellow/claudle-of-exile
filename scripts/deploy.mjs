/**
 * Guarded deploy to dabfellow.party/path-of-idle.
 *   npm run deploy               check, build, deploy, then confirm the live site
 *   npm run deploy -- --dry-run  everything except the deploy and the live check
 *
 * A build without .env.local succeeds but ships with no login or Sentry (0.2.21 did), and parallel
 * sessions deploy too, so a stale branch can overwrite their work. Either one stops the deploy here.
 * Plain Node, not vite-node, so it can run in a fresh worktree before node_modules exists.
 */
import { execFileSync, execSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';

const LIVE_URL = 'https://dabfellow.party/path-of-idle/';
const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SENTRY_DSN'];
const BUILD_DIR = '.cloudflare/output';
const LIVE_TRIES = 12;
const LIVE_WAIT_MS = 5000;

const dryRun = process.argv.includes('--dry-run');
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;

const fail = (why) => {
  throw new Error(why);
};
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const run = (command) => execSync(command, { stdio: 'inherit' });

function checkGit() {
  if (git('status', '--porcelain')) fail('Uncommitted changes. Commit them first, so the live game matches git.');
  git('fetch', 'origin');
  for (const ref of ['origin/main', 'main']) {
    const behind = Number(git('rev-list', '--count', `HEAD..${ref}`));
    if (behind) fail(`${ref} has ${behind} commit(s) this branch doesn't. Merge it first, or this deploy overwrites them.`);
  }
}

/** Copies .env.local in from the main checkout when needed. `copied` means it needs removing afterwards. */
function prepareEnv() {
  let copied = false;
  if (!existsSync('.env.local')) {
    const source = join(dirname(git('rev-parse', '--path-format=absolute', '--git-common-dir')), '.env.local');
    if (!existsSync(source)) fail(`No .env.local here or at ${source}.`);
    copyFileSync(source, '.env.local');
    copied = true;
  }
  const env = readFileSync('.env.local', 'utf8');
  const missing = REQUIRED_ENV.filter((key) => !new RegExp(`^${key}=.+`, 'm').test(env));
  if (missing.length) {
    if (copied) rmSync('.env.local');
    fail(`.env.local is missing ${missing.join(', ')}.`);
  }
  // the real address, since the Supabase library's own chunk mentions supabase.co even in a broken build
  const loginUrl = env.match(/^VITE_SUPABASE_URL=["']?([^"'\s]+)/m)[1];
  return { copied, loginUrl };
}

function* jsFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* jsFiles(path);
    else if (entry.name.endsWith('.js')) yield path;
  }
}

function checkBundle(loginUrl) {
  for (const file of jsFiles(BUILD_DIR)) if (readFileSync(file, 'utf8').includes(loginUrl)) return;
  fail('The build has no Supabase address, so login would be broken. Not deploying.');
}

async function liveCheck(loginUrl) {
  const fetchText = async (url) => (await fetch(url, { cache: 'no-store' })).text();
  const scripts = [...new Set((await fetchText(LIVE_URL)).match(/\/path-of-idle\/assets\/[^"']+\.js/g) ?? [])];
  const code = await Promise.all(scripts.map((path) => fetchText(new URL(path, LIVE_URL))));
  return { login: code.some((text) => text.includes(loginUrl)), version: code.some((text) => text.includes(version)) };
}

async function confirmLive(loginUrl) {
  let last = { login: false, version: false };
  for (let i = 0; i < LIVE_TRIES; i++) {
    last = await liveCheck(loginUrl).catch(() => last);
    if (last.login && last.version) return;
    await new Promise((resolve) => setTimeout(resolve, LIVE_WAIT_MS));
  }
  fail(`Deployed, but the live site looks wrong: version ${version} ${last.version ? 'found' : 'NOT found'}, login ${last.login ? 'found' : 'NOT found'}.`);
}

async function main() {
  checkGit();
  if (!existsSync('node_modules')) run('npm ci --no-audit --no-fund');
  const { copied, loginUrl } = prepareEnv();
  try {
    run('npm run build');
    checkBundle(loginUrl);
    if (dryRun) {
      console.log(`Dry run passed for ${version}. Nothing was deployed.`);
      return;
    }
    run('npx cf deploy');
  } finally {
    if (copied) rmSync('.env.local');
  }
  await confirmLive(loginUrl);
  console.log(`${version} is live with login working at ${LIVE_URL}`);
}

main().catch((error) => {
  console.error(`\nDEPLOY STOPPED: ${error.message}`);
  process.exit(1);
});

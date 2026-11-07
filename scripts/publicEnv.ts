/** VITE_ values are shipped to every browser. Never include their contents in an error. */
export function assertPublicEnv(env: Record<string, string | undefined>): void {
  const allowed = new Set(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SENTRY_DSN', 'VITE_SENTRY_ISSUES_URL']);
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_') || !value) continue;
    if (!allowed.has(name)) throw new Error(`Unreviewed browser environment variable: ${name}`);
    if (/sb_secret_|GOCSPX-|-----BEGIN .*PRIVATE KEY-----/.test(value)) throw new Error(`Privileged credential in browser environment: ${name}`);
    let role: unknown;
    try { role = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString('utf8')).role; } catch { /* not a legacy Supabase JWT */ }
    if (role === 'service_role') throw new Error(`Privileged credential in browser environment: ${name}`);
    if (name === 'VITE_SUPABASE_ANON_KEY') {
      if (value.startsWith('sb_publishable_')) continue;
      if (role !== 'anon') throw new Error('VITE_SUPABASE_ANON_KEY must be a public publishable or anon key');
    }
  }
}

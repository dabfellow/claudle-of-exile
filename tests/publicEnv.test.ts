import { describe, expect, it } from 'vitest';
import { assertPublicEnv } from '../scripts/publicEnv';

const jwt = (role: string) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;

describe('browser credential boundary', () => {
  it('accepts guest-only builds and both supported public Supabase key formats', () => {
    expect(() => assertPublicEnv({})).not.toThrow();
    for (const key of ['sb_publishable_example', jwt('anon')]) {
      expect(() => assertPublicEnv({ VITE_SUPABASE_ANON_KEY: key })).not.toThrow();
    }
  });

  it('rejects privileged keys and unreviewed public variables without echoing credentials', () => {
    for (const key of ['sb_secret_example', jwt('service_role'), 'not-a-valid-public-key']) {
      try { assertPublicEnv({ VITE_SUPABASE_ANON_KEY: key }); throw new Error('Expected rejection'); }
      catch (error) {
        expect(String(error)).toMatch(/Privileged credential|must be a public/);
        expect(String(error)).not.toContain(key);
      }
    }
    expect(() => assertPublicEnv({ VITE_DEPLOY_TOKEN: 'private-value' })).toThrow('Unreviewed browser environment variable');
    expect(() => assertPublicEnv({ VITE_SENTRY_DSN: jwt('service_role') })).toThrow('Privileged credential');
  });
});

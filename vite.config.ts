import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import { readFileSync } from 'node:fs';
import { assertPublicEnv } from './scripts/publicEnv';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig(({ mode }) => {
  assertPublicEnv({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('VITE_'))) });
  return ({
  // the Cloudflare plugin builds for Workers; tests run plain Node, so leave it out there
  plugins: [react(), ...(mode === 'test' ? [] : [cloudflare()])],
  // shown on feedback notes and crash reports, so you know which build a player was on
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    // the game lives at dabfellow.party/path-of-idle/ (the site root is the project hub), so its
    // files sit in that folder; unknown paths like /path-of-idle/ fall back to index.html
    assetsDir: 'path-of-idle/assets',
    // asset-pack images stay separate files fetched on first use, never base64 inside the JS
    // the game code is one ~500 kB chunk (~180 kB gzipped) by design; warn only if it grows well past that
    chunkSizeWarningLimit: 600,
    assetsInlineLimit: (file: string) => (/src[\\/]assets[\\/](items|icons|ui)[\\/]/.test(file) ? false : undefined),
    rollupOptions: {
      output: {
        // libraries change rarely: separate files stay cached across game updates and load in parallel
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}) as never;
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(({ mode }) => ({
  // the Cloudflare plugin builds for Workers; tests run plain Node, so leave it out there
  plugins: [react(), ...(mode === 'test' ? [] : [cloudflare()])],
  build: {
    // the game lives at dabfellow.party/path-of-idle/ (the site root is the project hub), so its
    // files sit in that folder; unknown paths like /path-of-idle/ fall back to index.html
    assetsDir: 'path-of-idle/assets',
    // asset-pack images stay separate files fetched on first use, never base64 inside the JS
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
}) as never);

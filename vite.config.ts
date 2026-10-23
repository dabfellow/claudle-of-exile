import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(({ mode }) => ({
  // the Cloudflare plugin builds for Workers; tests run plain Node, so leave it out there
  plugins: [react(), ...(mode === 'test' ? [] : [cloudflare()])],
  build: {
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

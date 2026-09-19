/**
 * Preview build — mirrors the main vite config's CSS + React pipeline so the
 * preview renders the real components under the real token layer.
 *
 * Differences from vite.config.mjs, and why:
 *   - root is .preview/ so the entry is main.tsx, not the library index
 *   - everything is inlined into one chunk: the artifact runtime has no import
 *     map, and the CDN allowlist does not cover the 14 Radix packages
 *   - the hds-manifest virtual module is stubbed rather than loaded; the
 *     preview imports components per-file and never reaches command-palette
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const VIRTUAL = 'virtual:hds-manifest';
const RESOLVED = `\0${VIRTUAL}`;

export default defineConfig({
  root: here,
  // Artifact-published files are referenced relatively, with no leading slash.
  base: './',
  plugins: [
    {
      name: 'hds-manifest-stub',
      resolveId: (id) => (id === VIRTUAL ? RESOLVED : null),
      load: (id) => (id === RESOLVED ? 'export default {};' : null),
    },
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: path.resolve(here, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
});

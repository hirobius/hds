/**
 * Vitest configuration — mirrors the app's Vite setup, but keeps the plugin
 * list focused on JSX transform so Node.js script tests are not run through
 * browser-only build hooks.
 */
import { defineConfig } from 'vitest/config';
import path from 'path';
import { readFileSync } from 'fs';
import react from '@vitejs/plugin-react';

// Mirror the app/lib `virtual:hds-manifest` plugin so components that import the
// manifest (e.g. CommandPalette) resolve it under vitest — including the
// story-render smoke gate that renders every story.
const hdsManifestModuleId = 'virtual:hds-manifest';
const resolvedHdsManifestModuleId = `\0${hdsManifestModuleId}`;

export default defineConfig({
  plugins: [
    {
      name: 'hds-manifest-virtual-module',
      resolveId(id: string) {
        return id === hdsManifestModuleId ? resolvedHdsManifestModuleId : null;
      },
      load(id: string) {
        if (id !== resolvedHdsManifestModuleId) return null;
        const manifest = readFileSync(path.resolve(__dirname, 'public/hds-manifest.json'), 'utf8');
        return `export default ${manifest};`;
      },
    },
    // React plugin for JSX transform in component tests
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    // Keep `pnpm test` focused on repo-owned unit tests. (Playwright specs live
    // under /tests and are run via `pnpm test:*`.)
    include: [
      'scripts/__tests__/**/*.{test,spec}.mjs',
      'src/**/*.{test,spec}.{ts,tsx,js,jsx}',
      // Contract tests (tests/primitive-contracts/*.contract.test.tsx) are vitest +
      // React Testing Library, so collect .tsx here. Playwright (testMatch '**/*.spec.ts')
      // deliberately does NOT pick these up.
      'tests/**/*.test.{ts,tsx}',
    ],
    environmentMatchPatterns: [
      // Run scripts tests in Node environment (they use fs, path, url builtins)
      [/scripts\//, 'node'],
    ],
    server: {
      deps: {
        // Prevent Vite from bundling Node.js built-ins — pass them through as
        // externals so the node environment can resolve them natively at runtime.
        external: ['fs', 'path', 'url', 'node:fs', 'node:path', 'node:url'],
      },
    },
    coverage: {
      // Use v8 (native Node.js) instrumentation — fastest, no Babel transform needed.
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      // Output directory — gitignored except for the json-summary snapshot.
      reportsDirectory: './coverage',
      // Scope coverage to owned source only; exclude test files, dist, and generated scripts.
      exclude: [
        'coverage/**',
        'dist/**',
        'scripts/**',
        '**/*.{test,spec}.{ts,tsx,js,jsx,mjs}',
        '**/__tests__/**',
        '**/node_modules/**',
        '**/tests/**',
        'src/app/data/**',
        'src/assets/**',
        'vite.config.*',
        'vitest.config.*',
        'postcss.config.*',
        'playwright.config.*',
        'knip.config.*',
      ],
      // Baseline thresholds measured on 2026-05-03 (src/ only, scripts excluded).
      // Set at floor of actual measured values — gate catches regressions, not
      // failing on first run. Ratchet these up as coverage improves.
      thresholds: {
        statements: 50,
        branches: 24,
        functions: 50,
        lines: 54,
      },
    },
  },
});

import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hdsManifestModuleId = 'virtual:hds-manifest';
const resolvedHdsManifestModuleId = `\0${hdsManifestModuleId}`;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      __FIGMA_FILE_ID__: JSON.stringify(env.FIGMA_FILE_ID ?? ''),
    },
    plugins: [
      {
        name: 'hds-manifest-virtual-module',
        resolveId(id) {
          return id === hdsManifestModuleId ? resolvedHdsManifestModuleId : null;
        },
        load(id) {
          if (id !== resolvedHdsManifestModuleId) return null;
          const manifest = readFileSync(
            path.resolve(__dirname, 'public/hds-manifest.json'),
            'utf8',
          );
          return `export default ${manifest};`;
        },
      },
      react(),
      tailwindcss(),
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      // Force all packages to use the project's React 18.
      dedupe: ['react', 'react-dom'],
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
    build: {
      // 750kB uncompressed ≈ 250kB gzip. The vendor-three chunk is expected to
      // exceed this (three.js is ~984kB) — it loads lazily via the 3D canvas route.
      // All app/vendor-react chunks must stay under this limit.
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router/') ||
              id.includes('node_modules/scheduler/')
            ) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/motion/') || id.includes('node_modules/framer-motion/')) {
              return 'vendor-motion';
            }
            if (
              id.includes('node_modules/recharts/') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-')
            ) {
              return 'vendor-charts';
            }
            if (id.includes('node_modules/@radix-ui/')) {
              return 'vendor-radix';
            }
            // three.js stack — pulled eagerly by HdsMobiusLogo via @react-three/fiber.
            // Kept in a dedicated chunk so it doesn't block the main entry parse.
            if (
              id.includes('node_modules/three/') ||
              id.includes('node_modules/@react-three/') ||
              id.includes('node_modules/postprocessing/') ||
              id.includes('node_modules/troika-') ||
              id.includes('node_modules/meshline/')
            ) {
              return 'vendor-three';
            }
            // Lucide icons — many routes import individual icons; isolating avoids
            // repeated tree-shake work and makes the chunk cacheable.
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            // Virtual hds-manifest — inline JSON export; split so the main entry
            // stays under budget and the manifest chunk is independently cacheable.
            // resolvedHdsManifestModuleId starts with \0 so we match the raw string.
            if (id === resolvedHdsManifestModuleId || id.includes('virtual:hds-manifest')) {
              return '_virtual_hds-manifest';
            }
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
    },
  };
});

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
      // 750kB uncompressed ≈ 250kB gzip. All app/vendor chunks must stay under
      // this limit. (The former vendor-three chunk was removed with the 3D
      // Möbius visual; three.js is no longer in the app graph.)
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

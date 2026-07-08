/**
 * Vite library build for @hirobius/design-system.
 *
 * Public API surface (consumers see only these subpaths via package.json#exports):
 *
 *   import { Button, Card, Dialog, Input } from '@hirobius/design-system';
 *   import '@hirobius/design-system/tokens.css';
 *   import { hds, tokens } from '@hirobius/design-system/tokens';
 *   import { cn } from '@hirobius/design-system/cn';
 *   import manifest from '@hirobius/design-system/manifest';
 *
 * Output is ESM-only (no CJS dual emit) — modern, smaller footprint, matches
 * shadcn/Radix/cva-style packaging conventions. Consumers must use a bundler
 * (Vite, Next.js, Remix, Webpack 5+) or a Node ≥ 20 ESM runtime.
 *
 * Subpath map (vite.lib entries → dist files):
 *   src/index.ts       → dist/hirobius-ui.js              (main barrel)
 *   src/lib/utils.ts   → dist/cn.js                       (cn helper)
 *   tokens-bridge      → dist/tokens.js                   (TS token constants)
 *   tokens-virtual     → dist/manifest.js                 (manifest JSON ESM)
 *   src/styles/index.css → dist/hirobius-ui.css           (CSS bundle, aliased
 *                                                         to /tokens.css)
 *
 * Type subpaths point at the source `.ts`/`.tsx` files (consumers using TS
 * + a bundler resolve them transparently). This keeps the build hermetic
 * with zero new dependencies.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const hdsManifestModuleId = 'virtual:hds-manifest';
const resolvedHdsManifestModuleId = `\0${hdsManifestModuleId}`;

/**
 * @internal Vite plugin: maps `import x from 'virtual:hds-manifest'` to the
 * runtime-loaded `public/hds-manifest.json`. Mirrors the same plugin in
 * vite.config.mjs (app build) so primitives like HdsSpecimenBlock that
 * consume the manifest at runtime resolve cleanly in the library bundle.
 */
const hdsManifestVirtualPlugin = {
  name: 'hds-manifest-virtual-module',
  resolveId(id: string) {
    return id === hdsManifestModuleId ? resolvedHdsManifestModuleId : null;
  },
  load(id: string) {
    if (id !== resolvedHdsManifestModuleId) return null;
    const manifest = readFileSync(path.resolve(__dirname, 'public/hds-manifest.json'), 'utf8');
    return `export default ${manifest};`;
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), hdsManifestVirtualPlugin],
  // Do NOT copy the `public/` directory into the library output. The app build
  // (vite.config.mjs) serves portfolio assets, fonts, and manifests from
  // public/, but the published package must not carry ~47MB of portfolio PNGs
  // and JSON. fonts.css references fonts by absolute `/fonts/...` URLs (served
  // from public/ by the app, identical to before — no app render/CLS change).
  // Those URLs don't resolve here (publicDir is off), so Vite leaves them as-is;
  // the `scripts/embed-fonts.mjs` post-build step then base64-inlines the three
  // woff2 into dist/tokens.css so a consumer importing
  // `@hirobius/design-system/tokens.css` gets self-contained fonts with ZERO
  // setup (P0.3, option a). Trade-off: a larger tokens.css (~111KB gzip);
  // woff2 is already compressed so gzip recovers most of the base64 overhead.
  publicDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: {
        // Main barrel — every primitive, pattern, and template re-exported.
        'hirobius-ui': path.resolve(__dirname, 'src/index.ts'),
        // Subpath: cn() helper. Tiny dedicated entry so consumers can
        // tree-shake the rest of the library when all they need is class merge.
        cn: path.resolve(__dirname, 'src/lib/utils.ts'),
        // Subpath: token bridge (TS constants → CSS variables).
        tokens: path.resolve(__dirname, 'src/app/design-system/tokens.ts'),
        // Subpath: full hds-manifest.json as a JSON-as-ESM module.
        manifest: path.resolve(__dirname, 'src/lib/manifest-entry.ts'),
        // Subpath: app-shell context providers (theme/language/tenant/font)
        // shared with consuming apps like the ops dashboard.
        contexts: path.resolve(__dirname, 'src/app/context/index.ts'),
        // Subpath: optional React Hook Form + Zod adapter. RHF/zod/resolvers are
        // optional peer deps externalized below, so this entry is empty of them
        // and the main barrel never pulls them in.
        form: path.resolve(__dirname, 'src/form/index.ts'),
        // Subpath: optional Material UI theme preset. Maps HDS tokens to an MUI
        // palette; imports no MUI code (structural return type), so it's inert
        // unless a consumer imports it.
        mui: path.resolve(__dirname, 'src/mui/index.ts'),
        // Subpath: palette → HDS-semantic overlay bridge. Framework-free (no
        // React/Node), so a static Astro build or edge runtime can theme itself
        // from a brand palette while inheriting HDS semantics. See #64.
        brand: path.resolve(__dirname, 'src/brand/index.ts'),
      },
      // ESM-only — no UMD/CJS dual emit (modern, simpler, matches shadcn).
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-router',
        // Externalize ALL `motion` subpaths (`motion`, `motion/react`, …). An
        // exact-string 'motion' did NOT match the `motion/react` specifier our
        // components import, so Vite bundled motion/react's wrapper — which
        // re-exports from `framer-motion`. `framer-motion` was then emitted as a
        // bare import even though it is NOT a dependency (only `motion` is),
        // breaking resolution for every consumer using a motion-based component.
        // The regex keeps motion/react external so it resolves against the
        // installed `motion` peer dependency.
        /^motion(\/.*)?$/,
        /^framer-motion(\/.*)?$/,
        // Node-style externals for ESM peer deps.
        /^@radix-ui\//,
        /^@phosphor-icons\//,
        /^lucide-react/,
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        // Optional peer deps for the ./form subpath — never bundled; resolved
        // against the consumer's install when they import that entry.
        'react-hook-form',
        'zod',
        /^@hookform\//,
      ],
      output: {
        // Stable chunk names for shared internal helpers between entries.
        chunkFileNames: 'chunks/[name]-[hash].js',
        // Pin the CSS bundle name. (Vite otherwise derives from the package
        // name `@hirobius/design-system` and emits `design-system.css`,
        // which would not match the size-limit + package.json#exports paths.)
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'tokens.css';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    // Consumers don't need (and shouldn't pay for) library sourcemaps — they
    // bloat the tarball (the 3D scene map alone was ~5.8MB) and leak internal
    // source layout. Debugging happens against this repo, not the package.
    sourcemap: false,
    minify: 'esbuild',
  },
});

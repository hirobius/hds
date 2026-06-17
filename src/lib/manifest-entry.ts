/**
 * Subpath entry for `@hirobius/design-system/manifest`.
 *
 * Re-exports the contents of `public/hds-manifest.json` as the default export
 * so downstream consumers can do:
 *
 *     import manifest from '@hirobius/design-system/manifest';
 *
 * The library build (vite.config.lib.ts) inlines the JSON via the
 * `virtual:hds-manifest` plugin so this module produces a zero-runtime-fetch
 * ESM bundle. In dev (TypeScript path resolution), the import resolves to
 * the JSON file directly via `resolveJsonModule`.
 */
import manifest from '../../public/hds-manifest.json';
export default manifest;

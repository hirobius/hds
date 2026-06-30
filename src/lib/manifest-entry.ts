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
import manifestJson from '../../public/hds-manifest.json';
import type { SystemManifest } from '../app/data/manifest-types';

// Typed as SystemManifest so the emitted .d.ts exports a clean named type
// instead of importing the raw JSON path (which doesn't exist under dist/types
// in the published package — attw InternalResolutionError). Runtime is
// unchanged: vite inlines the JSON into dist/manifest.js at build time.
const manifest = manifestJson as unknown as SystemManifest;
export default manifest;

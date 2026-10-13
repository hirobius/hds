/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scan-roots — kept as the import path the original four gates use.
 * The implementation lives in source-scan.mjs (hds#643), which also owns the
 * directory walk that sits on top of it.
 */
export { resolveScanRoots } from './source-scan.mjs';

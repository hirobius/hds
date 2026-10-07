/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scan-roots — a configured scan root that does not exist is a failure, not an
 * empty directory.
 *
 * A gate whose scan root was removed reports the same thing for "scanned and
 * found nothing" and "there was nothing to scan". A missing root throws; a root
 * that is legitimately conditional says `{ path, optional: true }` in code.
 *
 * Usage:
 *   const SCAN_DIRS = resolveScanRoots(
 *     ['src/app/components', { path: 'src/app/lab', optional: true }],
 *     { root: ROOT, gate: 'check-focus-states' },
 *   );
 */

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Resolve scan roots to absolute paths, failing on anything missing.
 *
 * @param {Array<string | {path: string, optional?: boolean}>} roots
 * @param {{root: string, gate: string}} options  repo root, and the gate name for errors
 * @returns {string[]} absolute paths, in the order given
 */
export function resolveScanRoots(roots, { root, gate }) {
  if (!Array.isArray(roots) || roots.length === 0) {
    throw new Error(
      `${gate}: no scan roots configured. A gate that scans nothing cannot report success.`,
    );
  }

  const resolved = [];
  const missing = [];

  for (const entry of roots) {
    const spec = typeof entry === 'string' ? { path: entry, optional: false } : entry;
    const abs = path.resolve(root, spec.path);

    if (!existsSync(abs)) {
      if (!spec.optional) missing.push(spec.path);
      continue;
    }
    if (!statSync(abs).isDirectory()) {
      throw new Error(`${gate}: scan root '${spec.path}' is not a directory.`);
    }
    resolved.push(abs);
  }

  if (missing.length > 0) {
    throw new Error(
      `${gate}: ${missing.length} configured scan root(s) do not exist:\n` +
        missing.map((m) => `  ${m}`).join('\n') +
        `\n\nThe gate would scan less than it claims and still report success. Remove the root, ` +
        `repoint it, or mark it { optional: true } if its absence is genuinely expected.`,
    );
  }

  if (resolved.length === 0) {
    throw new Error(
      `${gate}: every configured scan root resolved to nothing, so this run would be vacuous.`,
    );
  }

  return resolved;
}

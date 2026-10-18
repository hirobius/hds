/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The committed src/app/design-system/token-usage-map.json (pnpm tokens:index,
 * scripts/build-token-index.mjs) must not list files that are gone. hds#389 R1a
 * review: the map still listed the components 0.20.0 deleted. Rerun
 * `pnpm tokens:index` after deleting or renaming a file under src/.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(import.meta.url), '../../..');

describe('src/app/design-system/token-usage-map.json', () => {
  it('lists only files that exist (pnpm tokens:index after a delete)', () => {
    const map = JSON.parse(
      readFileSync(join(REPO, 'src/app/design-system/token-usage-map.json'), 'utf8'),
    );
    const listed = new Set([
      ...Object.values(map.byToken).flat(),
      ...Object.keys(map.byFile),
      ...map.auditOkComments.map((c) => c.file),
    ]);
    expect([...listed].filter((f) => !existsSync(join(REPO, f))).sort()).toEqual([]);
  });
});

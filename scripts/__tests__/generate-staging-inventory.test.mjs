/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/**
 * The staging promotion checklist is rendered from figma/staging-inventory.json.
 * It must state the live verification when the data carries one, and read the
 * coverage figures from figma/disposition.json rather than hard-coding them.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const md = () => readFileSync(join(ROOT, 'figma/STAGING-INVENTORY.md'), 'utf8');
const data = JSON.parse(readFileSync(join(ROOT, 'figma/staging-inventory.json'), 'utf8'));
const disposition = JSON.parse(readFileSync(join(ROOT, 'figma/disposition.json'), 'utf8'));

describe('figma/STAGING-INVENTORY.md', () => {
  it('is current with its data (--check exits 0)', () => {
    expect(() =>
      execFileSync('node', ['scripts/generate-staging-inventory.mjs', '--check'], { cwd: ROOT }),
    ).not.toThrow();
  });

  it('states the live verification instead of claiming nothing can be verified', () => {
    expect(data.verification?.on).toBeTruthy();
    const text = md();
    expect(text).toContain(`## Verified live ${data.verification.on}`);
    expect(text).toContain(`${data.verification.present} of ${data.verification.recorded}`);
    expect(text).not.toMatch(/Nothing here can currently self-verify/);
  });

  it('reads the coverage figures from the disposition', () => {
    const { libraryLinked, byClass } = disposition.summary;
    expect(md()).toContain(`${libraryLinked}/${byClass.library}`);
  });
});

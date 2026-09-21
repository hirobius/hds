/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/lib/write-generated.mjs.
 *
 * The property that matters: formatting a generated file is idempotent against
 * what lint-staged will do to it on commit. If it is not, the generator and the
 * repo disagree about the file's bytes forever, and check-token-rebake-needed
 * goes permanently red — which is how three separate generated files ended up
 * with the same bug.
 */

import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { formatGenerated } from '../lib/write-generated.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('formatGenerated', () => {
  it('produces what Prettier would produce for that path', async () => {
    // This is the whole contract: the generator's output must already be what
    // the pre-commit hook would rewrite it to.
    const filePath = path.join(ROOT, 'src/styles/generated.css');
    const raw = ':root{--a:1px;--b:   2px}';
    const config = await resolveConfig(filePath);

    expect(await formatGenerated(filePath, raw)).toBe(
      await format(raw, { ...config, filepath: filePath }),
    );
  });

  it('is idempotent — formatting formatted output changes nothing', async () => {
    const filePath = path.join(ROOT, 'src/styles/generated.css');
    const once = await formatGenerated(filePath, ':root{--a:1px}');
    expect(await formatGenerated(filePath, once)).toBe(once);
  });

  it('handles every generated file type the repo writes', async () => {
    // css, md and cjs are the three that had the bug. json is included because
    // the manifest is written the same way.
    for (const name of ['t.css', 't.md', 't.cjs', 't.json']) {
      const out = await formatGenerated(path.join(ROOT, name), pickSource(name));
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
    }
  });

  it('returns content unchanged when Prettier has no parser for the path', async () => {
    // A generator must not fail the build because its output is not a language
    // Prettier knows. The rebake gate reports the consequence if there is one.
    const raw = 'binary-ish payload\x00\x01';
    expect(await formatGenerated(path.join(ROOT, 'artifact.bin'), raw)).toBe(raw);
  });

  it('returns content unchanged rather than throwing on unparseable input', async () => {
    const raw = ':root{ this is not css ][';
    await expect(formatGenerated(path.join(ROOT, 'broken.css'), raw)).resolves.toBe(raw);
  });
});

function pickSource(name) {
  if (name.endsWith('.css')) return ':root{--a:1px}';
  if (name.endsWith('.md')) return '# Title\n\ntext\n';
  if (name.endsWith('.json')) return '{"a":1}';
  return 'module.exports = { a: 1 };';
}

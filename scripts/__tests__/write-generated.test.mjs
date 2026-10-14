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
import { formatCommitted, formatGenerated } from '../lib/write-generated.mjs';

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

describe('formatCommitted', () => {
  // The bytes the repo commits for a path: lint-staged runs `prettier --write`
  // with this repo's config, and Prettier's CLI skips what .gitignore and
  // .prettierignore list. A generator writing anything else is red forever.
  it("formats a path with this repo's Prettier config, whatever root the generator writes under", async () => {
    const raw = '{"a":[1,2],"b":{"c":\'x\'}}';
    const config = await resolveConfig(path.join(ROOT, 'docs/x.json'));
    expect(await formatCommitted('docs/x.json', raw)).toBe(
      await format(raw, { ...config, filepath: path.join(ROOT, 'docs/x.json') }),
    );
    expect(await formatCommitted('docs/x.json', raw)).toBe('{ "a": [1, 2], "b": { "c": "x" } }\n');
  });

  it('leaves a path .prettierignore hands to its generator byte for byte', async () => {
    // skills/hds-consumer/SKILL.md is listed: generate-consumer-skill owns its layout.
    const raw = '# Title\n\n\n\n*   item\n';
    expect(await formatCommitted('skills/hds-consumer/SKILL.md', raw)).toBe(raw);
  });

  it('leaves a gitignored path (build output, never committed) byte for byte', async () => {
    const raw = '{"a":1}';
    expect(await formatCommitted('dist/css-contract.json', raw)).toBe(raw);
  });

  it('returns content unchanged when Prettier has no parser for the path', async () => {
    expect(await formatCommitted('figma/blob.bin', 'x\x00')).toBe('x\x00');
  });
});

function pickSource(name) {
  if (name.endsWith('.css')) return ':root{--a:1px}';
  if (name.endsWith('.md')) return '# Title\n\ntext\n';
  if (name.endsWith('.json')) return '{"a":1}';
  return 'module.exports = { a: 1 };';
}

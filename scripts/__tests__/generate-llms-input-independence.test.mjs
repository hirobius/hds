/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
// hds#716: `generate-llms-txt --check` (pretest, so pre-push) must depend only
// on the committed tree. src/app/data/component-api.json is gitignored output of
// generate-component-api.mjs; after a branch switch it describes the other
// branch. The check must derive the prop data itself and never read that file.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GITIGNORED_INPUT = 'component-api.json';

// Make the gitignored file unreadable (absent or corrupt), as after a branch switch.
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal();
  const readFileSync = (p, ...rest) => {
    if (String(p).endsWith('component-api.json')) {
      return globalThis.__corruptComponentApi
        ? '{"corrupt": true'
        : actual.readFileSync(p, ...rest);
    }
    return actual.readFileSync(p, ...rest);
  };
  return { ...actual, default: { ...actual, readFileSync }, readFileSync };
});

const normalize = (t) => t.replace(/\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?/g, '<date>');

describe('generateLlmsTxt({ write: false }) input independence (hds#716)', () => {
  it('matches the committed files even when the gitignored component-api.json is corrupt', async () => {
    globalThis.__corruptComponentApi = true;
    try {
      const { generateLlmsTxt } = await import('../generate-llms-txt.mjs');
      const outputs = generateLlmsTxt({ write: false });
      const stale = Object.entries(outputs)
        .filter(
          ([rel, text]) => normalize(readFileSync(join(ROOT, rel), 'utf8')) !== normalize(text),
        )
        .map(([rel]) => rel);
      expect(stale, `run pnpm llms:generate (${GITIGNORED_INPUT} must not be an input)`).toEqual(
        [],
      );
    } finally {
      delete globalThis.__corruptComponentApi;
    }
  }, 60_000);
});

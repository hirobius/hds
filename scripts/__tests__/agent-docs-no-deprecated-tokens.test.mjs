/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * The agent-facing docs never name a deprecated token. An agent copies what
 * llms.txt and the consumer skill show it, so a deprecated token there is a
 * deprecated token in the next app. The lint (hds/no-deprecated-token) and the
 * codemod own the old names; these docs teach only the live ones.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectDeprecations } from '../lib/token-deprecations.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tokens = JSON.parse(readFileSync(join(ROOT, 'hirobius.tokens.json'), 'utf8'));
const deprecated = collectDeprecations(tokens);

const DOCS = [
  'llms.txt',
  'public/llms.txt',
  'public/llms-full.txt',
  ...readdirSync(join(ROOT, 'public/llms')).map((f) => `public/llms/${f}`),
  'skills/hds-consumer/SKILL.md',
].filter((f) => existsSync(join(ROOT, f)));

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');

/** Every spelling of a deprecated token found in `text`. */
function leaks(text) {
  const found = [];
  for (const d of deprecated) {
    for (const name of [d.path, d.cssVar]) {
      if (new RegExp(`(?<![\\w-])${esc(name)}(?![\\w-])`).test(text)) found.push(name);
    }
  }
  return found;
}

describe('agent docs name no deprecated token', () => {
  it('finds the docs it guards', () => {
    expect(DOCS).toEqual(
      expect.arrayContaining(['public/llms.txt', 'skills/hds-consumer/SKILL.md']),
    );
  });

  it('catches a planted leak (the guard is live)', () => {
    expect(leaks('pad with `var(--semantic-space-layout-tight)`')).toEqual([
      '--semantic-space-layout-tight',
    ]);
    expect(leaks('`semantic.space.layout.tightish`')).toEqual([]);
  });

  it.each(DOCS)('%s', (file) => {
    expect(leaks(readFileSync(join(ROOT, file), 'utf8'))).toEqual([]);
  });
});

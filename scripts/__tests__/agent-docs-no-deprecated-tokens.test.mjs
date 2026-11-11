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

/**
 * The text an agent copies from: everything but the generated "## Upgrading"
 * section (scripts/lib/upgrade-digest.mjs, from the upgrade ledgers). That
 * section's job is to name each removed or deprecated name next to its
 * replacement, so it may name one; nothing else may.
 */
function scannable(text) {
  return text.replace(/^## Upgrading\n[\s\S]*?(?=^#{1,2} |(?![\s\S]))/m, '');
}

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
    expect(leaks('pad with `var(--semantic-space-section-heroMax)`')).toEqual([
      '--semantic-space-section-heroMax',
    ]);
    expect(leaks('`semantic.space.section.heroMaxish`')).toEqual([]);
  });

  it('the generated Upgrading section may name a deprecated token, nothing else may', () => {
    const doc = (upgrading) =>
      `# Doc\n\n## Tokens\n\nUse caption.\n\n## Upgrading\n\n| \`${upgrading}\` | use semantic.typography.caption |\n\n## Key Files\n\n- x\n`;
    expect(leaks(scannable(doc('semantic.typography.eyebrow')))).toEqual([]);
    const outside = doc('x').replace('Use caption.', 'Use semantic.typography.eyebrow.');
    expect(leaks(scannable(outside))).toEqual(['semantic.typography.eyebrow']);
    // A slice that ends inside the section (public/llms/upgrade.txt) is covered too.
    expect(leaks(scannable('# Slice\n\n## Upgrading\n\n`semantic.typography.eyebrow`\n'))).toEqual(
      [],
    );
  });

  it.each(DOCS)('%s', (file) => {
    expect(leaks(scannable(readFileSync(join(ROOT, file), 'utf8')))).toEqual([]);
  });
});

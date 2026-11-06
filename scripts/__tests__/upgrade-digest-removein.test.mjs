/**
 * The agent docs' "on the way out" list (public/llms/upgrade.txt,
 * llms-full.txt, skills/hds-consumer/SKILL.md) names each deprecation's
 * removal version. It came from the released ledger (upgrade/index.json), so
 * when #1348 moved the root hds/tokens removal from 0.35.0 to 0.36.0 the docs
 * kept saying 0.35.0. The current removeIn is deprecations.json's; the
 * released record keeps its history.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { deprecatedRows } from '../lib/upgrade-digest.mjs';

const ROOT = join(__dirname, '..', '..');
const deprecations = JSON.parse(readFileSync(join(ROOT, 'deprecations.json'), 'utf8'));
const removeInOf = (name) => deprecations.exports.find((e) => e.name === name)?.removeIn;

describe('deprecatedRows', () => {
  const rows = deprecatedRows(ROOT);

  it.each(['hds', 'tokens'])('takes %s removeIn from deprecations.json', (name) => {
    expect(removeInOf(name)).toBe('0.36.0');
    expect(rows.find((r) => r.name === name)?.removeIn).toBe('0.36.0');
  });

  it('maps a deprecated prop (Blockquote.size) to its deprecations.json entry', () => {
    const prop = deprecations.props.find((p) => p.owner === 'BlockquoteProps' && p.name === 'size');
    expect(rows.find((r) => r.name === 'Blockquote.size')?.removeIn).toBe(prop.removeIn);
  });

  it('leaves the released ledger untouched', () => {
    const index = JSON.parse(readFileSync(join(ROOT, 'upgrade/index.json'), 'utf8'));
    expect(index.deprecated.find((d) => d.name === 'hds').removeIn).toBe('0.35.0');
  });
});

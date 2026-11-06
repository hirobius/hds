/**
 * The agent docs' "on the way out" list (public/llms/upgrade.txt,
 * llms-full.txt, skills/hds-consumer/SKILL.md) names each deprecation's
 * removal version. It came from the released ledger (upgrade/index.json), so
 * when #1348 moved the root hds/tokens removal from 0.35.0 to 0.36.0 the docs
 * kept saying 0.35.0. The current removeIn is deprecations.json's; the
 * released record keeps its history.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

  // Whatever the record says (0.34.0's ledger says 0.35.0; the Version PR's
  // compiled index may say 0.36.0), the digest reads removeIn from
  // deprecations.json, not from upgrade/index.json.
  it('takes removeIn from deprecations.json, not from upgrade/index.json', () => {
    const root = mkdtempSync(join(tmpdir(), 'hds-digest-'));
    try {
      cpSync(join(ROOT, 'upgrade'), join(root, 'upgrade'), { recursive: true });
      const moved = structuredClone(deprecations);
      moved.exports.find((e) => e.name === 'hds').removeIn = '9.9.9';
      writeFileSync(join(root, 'deprecations.json'), JSON.stringify(moved));
      const index = JSON.parse(readFileSync(join(root, 'upgrade/index.json'), 'utf8'));
      expect(index.deprecated.find((d) => d.name === 'hds').removeIn).not.toBe('9.9.9');
      expect(deprecatedRows(root).find((r) => r.name === 'hds')?.removeIn).toBe('9.9.9');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

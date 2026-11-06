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

describe('deprecatedRows', () => {
  const rows = deprecatedRows(ROOT);
  // Exports deprecations.json and the digest both list; the root hds/tokens were
  // the first case (hds#1348) and left in 0.36.0 (hds#1347).
  const listed = deprecations.exports.filter((e) => rows.some((r) => r.name === e.name));

  it('takes each export removeIn from deprecations.json', () => {
    expect(listed.length).toBeGreaterThan(0);
    for (const { name, removeIn } of listed) {
      expect(rows.find((r) => r.name === name)?.removeIn).toBe(removeIn);
    }
  });

  it('maps a deprecated prop (Blockquote.size) to its deprecations.json entry', () => {
    const prop = deprecations.props.find((p) => p.owner === 'BlockquoteProps' && p.name === 'size');
    expect(rows.find((r) => r.name === 'Blockquote.size')?.removeIn).toBe(prop.removeIn);
  });

  // Whatever the released record says, the digest reads removeIn from
  // deprecations.json, not from upgrade/index.json.
  it('takes removeIn from deprecations.json, not from upgrade/index.json', () => {
    const { name } = listed[0];
    const root = mkdtempSync(join(tmpdir(), 'hds-digest-'));
    try {
      cpSync(join(ROOT, 'upgrade'), join(root, 'upgrade'), { recursive: true });
      const moved = structuredClone(deprecations);
      moved.exports.find((e) => e.name === name).removeIn = '9.9.9';
      writeFileSync(join(root, 'deprecations.json'), JSON.stringify(moved));
      const index = JSON.parse(readFileSync(join(root, 'upgrade/index.json'), 'utf8'));
      expect(index.deprecated.find((d) => d.name === name)?.removeIn).not.toBe('9.9.9');
      expect(deprecatedRows(root).find((r) => r.name === name)?.removeIn).toBe('9.9.9');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

/** @internal — not part of @hirobius/design-system public API surface. */
// @vitest-environment node
/** hds#483: the gate that keeps deprecated styles off library layers. Seam: runDeprecatedUsageCheck({ root }). */
import { describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runDeprecatedUsageCheck } from '../check-figma-deprecated-usage.mjs';
import { recordFromResult } from '../figma-deprecated-usage.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
function fixture(record) {
  const dir = mkdtempSync(join(tmpdir(), 'deprecated-usage-'));
  mkdirSync(join(dir, 'figma', 'reads'), { recursive: true });
  for (const f of [
    'hirobius.tokens.json',
    'figma/snapshot.json',
    'figma/links.json',
    'figma/reads/deprecated-usage.js',
  ])
    cpSync(join(ROOT, f), join(dir, f));
  if (record) writeFileSync(join(dir, 'figma', 'deprecated-usage.json'), JSON.stringify(record));
  return dir;
}
const STYLES = ['typography/eyebrow', 'typography/h1', 'typography/h2', 'typography/h3'];
const clean = { fileKey: '2VgBbVpKiDnu0aftJEVyBQ', styles: STYLES, hits: [] };

describe('check-figma-deprecated-usage', () => {
  it('passes the committed repo', () => {
    expect(runDeprecatedUsageCheck({ root: ROOT }).exitCode).toBe(0);
  });
  it('passes a clean record', () => {
    const r = runDeprecatedUsageCheck({ root: fixture(clean) });
    expect(r.output).toMatch(/✓/);
  });
  it('fails a recorded hit, naming node and replacement', () => {
    const hit = {
      page: 'AppShell',
      id: '2246:5',
      name: 'header',
      kind: 'textStyle',
      target: 'typography/eyebrow',
    };
    const r = runDeprecatedUsageCheck({ root: fixture({ ...clean, hits: [hit] }) });
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/2246:5.*typography\/eyebrow: apply typography\/caption/);
  });
  it('fails with no record', () => {
    expect(runDeprecatedUsageCheck({ root: fixture(null) }).output).toMatch(
      /no figma\/deprecated-usage.json/,
    );
  });
  it('fails a record that audited other styles', () => {
    const r = runDeprecatedUsageCheck({
      root: fixture({ ...clean, styles: ['typography/eyebrow'] }),
    });
    expect(r.exitCode).toBe(1);
  });
  it('fails a stale audit script', () => {
    const dir = fixture(clean);
    writeFileSync(join(dir, 'figma/reads/deprecated-usage.js'), '// edited');
    expect(runDeprecatedUsageCheck({ root: dir }).output).toMatch(/stale/);
    rmSync(dir, { recursive: true });
  });
  it('ingest refuses another file or another style set', () => {
    expect(() => recordFromResult(ROOT, { ...clean, fileKey: 'x' })).toThrow(/not the library/);
    expect(() => recordFromResult(ROOT, { ...clean, styles: [] })).toThrow(/regenerate/);
    expect(recordFromResult(ROOT, clean).hits).toEqual([]);
  });
});

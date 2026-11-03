/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for the helpers the binding-drift / source-canon gate family
 * shares (hds#1010): readBaselineSet in scripts/lib/source-scan.mjs, and
 * extractClassNames / extractJsxText / fileNearStructural in
 * validators/canon-rules.mjs.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readBaselineSet } from '../lib/source-scan.mjs';
import {
  extractClassNames,
  extractJsxText,
  fileNearStructural,
} from '../../validators/canon-rules.mjs';

describe('readBaselineSet', () => {
  it('keeps trimmed non-blank, non-comment lines, deduped', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'baseline-'));
    try {
      const file = path.join(dir, 'b.txt');
      writeFileSync(file, '# header\n\n  a:1  \nb:2\na:1\n#c\n');
      expect([...readBaselineSet(file)]).toEqual(['a:1', 'b:2']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('returns an empty set for a missing file', () => {
    expect(readBaselineSet('/nowhere/baseline.txt').size).toBe(0);
  });
});

describe('extractClassNames', () => {
  it('finds quoted and expression classNames with their index', () => {
    const src = `<a className="x y" /><b className='z' /><c className={c ? 'p' : \`q\`} />`;
    expect(extractClassNames(src)).toEqual([
      { value: 'x y', index: 3 },
      { value: 'z', index: 24 },
      { value: 'p', index: 47 },
      { value: 'q', index: 53 },
    ]);
  });
});

describe('extractJsxText', () => {
  it('keeps prose between tags and drops code-like captures', () => {
    const src = '<p>Hello there</p><i> </i><b>f(x);</b><s>Wait...</s>';
    expect(extractJsxText(src)).toEqual([
      { value: 'Hello there', index: 3 },
      { value: 'Wait...', index: 41 },
    ]);
  });
});

describe('fileNearStructural', () => {
  it('is true only when a structural component is rendered', () => {
    expect(fileNearStructural('<HdsCard />')).toBe(true);
    expect(fileNearStructural('<div />')).toBe(false);
  });
});

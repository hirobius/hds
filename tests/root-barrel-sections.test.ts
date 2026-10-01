// @vitest-environment node
/**
 * src/index.ts groups its `export * from` lines under `// ── name ──` headers,
 * some with a module count (`// ── primitives (38) ──`). Removals (hds#389 R1)
 * left a header with nothing under it and counts that no longer matched, so
 * this pins both: every header has exports under it, and a count in a header
 * is the number of `export * from` lines in its section.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INDEX = readFileSync(resolve(__dirname, '..', 'src/index.ts'), 'utf8');

function sections() {
  const out: { header: string; count: number | null; modules: number; exports: number }[] = [];
  for (const line of INDEX.split('\n')) {
    const h = /^\/\/ ── (.+?) ──$/.exec(line);
    if (h) {
      const n = /\((\d+)\)$/.exec(h[1]);
      out.push({ header: h[1], count: n ? Number(n[1]) : null, modules: 0, exports: 0 });
      continue;
    }
    const current = out[out.length - 1];
    if (!current || !/^export /.test(line)) continue;
    current.exports += 1;
    if (/^export \* from /.test(line)) current.modules += 1;
  }
  return out;
}

describe('src/index.ts section headers', () => {
  it('every header has at least one export under it', () => {
    expect(
      sections()
        .filter((s) => s.exports === 0)
        .map((s) => s.header),
    ).toEqual([]);
  });

  it('a module count in a header matches the export * lines in its section', () => {
    const wrong = sections()
      .filter((s) => s.count !== null && s.count !== s.modules)
      .map((s) => `${s.header}: ${s.modules} modules`);
    expect(wrong).toEqual([]);
  });
});

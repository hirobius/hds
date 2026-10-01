/**
 * codemods/patterns-subpath.mjs and the names 0.20.0 removed that DO have a
 * survivor (codemods/removed-0.20.json `replaced`: hds#394 wave 4b, such as
 * IconButton -> Button iconOnly).
 *
 * Such a name is gone like any other removed name, so `--check` still reports
 * it for a manual edit. But "no replacement" would be false for it: the report
 * names the survivor instead.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  findRemoved,
  loadRemovedNames,
  loadReplacements,
  runCodemod,
} from '../../codemods/patterns-subpath.mjs';

const ROOT = '@hirobius/design-system';
const SUB = '@hirobius/design-system/patterns';

const removed = new Set(['IconButton', 'ActivityFeed']);
const replacements = new Map([['IconButton', 'Button iconOnly']]);

describe('findRemoved with a replacement', () => {
  it('names the survivor of a replaced name and keeps "no replacement" for the rest', () => {
    const src = [
      `import { Button, IconButton as IB } from '${ROOT}';`,
      `import { ActivityFeed } from '${SUB}';`,
    ].join('\n');
    expect(findRemoved(src, removed, replacements)).toEqual([
      `IconButton from '${ROOT}' (removed in 0.20.0, use Button iconOnly)`,
      `ActivityFeed from '${SUB}' (removed in 0.20.0, no replacement)`,
    ]);
  });

  it('reports a type-only import of a replaced name', () => {
    const src = `import type { IconButton } from '${ROOT}';\n`;
    expect(findRemoved(src, removed, replacements)).toEqual([
      `IconButton from '${ROOT}' (removed in 0.20.0, use Button iconOnly)`,
    ]);
  });
});

describe('runCodemod with a replacement', () => {
  let dir;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hds-codemod-replaced-'));
    mkdirSync(join(dir, 'src'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('passes the replacement map to every file, like `removed`', () => {
    for (const f of ['a', 'b'])
      writeFileSync(join(dir, `src/${f}.tsx`), `import { IconButton } from '${ROOT}';\n`);
    const res = runCodemod({ root: dir, removed, replacements });
    expect(res.manual.map((m) => m.stmt)).toEqual(
      Array(2).fill(`IconButton from '${ROOT}' (removed in 0.20.0, use Button iconOnly)`),
    );
    expect(res.manual.every((m) => m.removed)).toBe(true);
  });
});

describe('codemods/removed-0.20.json `replaced`', () => {
  it('loads as a name -> survivor map, and every replaced name is a removed name', () => {
    const map = loadReplacements();
    expect(map).toBeInstanceOf(Map);
    const names = loadRemovedNames();
    for (const [name, use] of map) {
      expect(names.has(name), name).toBe(true);
      expect(use, name).toMatch(/\S/);
    }
  });
});

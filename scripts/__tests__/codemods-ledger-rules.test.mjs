/**
 * hds#956: the move-import, rename-import and fold codemods take their version
 * text from the upgrade ledger, run the unrewritable-import scan for every entry
 * their steps touch, and take their from/to entries and rules as data.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadRemovedNames,
  runCodemod as runSubpath,
  transformSource as moveImports,
} from '../../codemods/patterns-subpath.mjs';
import { transformSource as renameImports } from '../../codemods/hds-prefix.mjs';
import { foldComponent, foldRule, PATTERNS } from '../../codemods/jsx-fold.mjs';
import { RULE as NOT_FOUND } from '../../codemods/not-found-pattern.mjs';
import { removalsFor, removedIn } from '../../codemods/lib/removals.mjs';

const ROOT = '@hirobius/design-system';
const SUB = `${ROOT}/patterns`;
const CODEMODS = join(import.meta.dirname, '..', '..', 'codemods');
const ledger = (v) =>
  JSON.parse(readFileSync(join(CODEMODS, '..', 'upgrade', 'releases', `${v}.json`), 'utf8'));

let dir;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hds-956-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('the unrewritable scan covers every entry a step touches', () => {
  it('reports a namespace import of /patterns that reads a removed name', () => {
    writeFileSync(
      join(dir, 'a.tsx'),
      `import * as P from '${SUB}';\nexport const C = P.Calendar;\n`,
    );
    const res = runSubpath({ root: dir });
    expect(res.manual).toEqual([
      {
        file: 'a.tsx',
        stmt: `import * as P from '${SUB}' (uses Calendar: removed in 0.20.0, no replacement)`,
        removed: true,
      },
    ]);
  });

  it('names the survivor for a root namespace read of a folded name', () => {
    writeFileSync(join(dir, 'a.tsx'), `import * as H from '${ROOT}';\nH.IconButton;\n`);
    const [m] = runSubpath({ root: dir }).manual;
    expect(m.removed).toBe(true);
    expect(m.stmt).toMatch(/\(uses IconButton: removed in 0\.20\.0, use Button iconOnly/);
  });

  it('keeps a moved-name read as a move-by-hand entry', () => {
    writeFileSync(join(dir, 'a.tsx'), `import * as H from '${ROOT}';\nH.PageHeader;\n`);
    expect(runSubpath({ root: dir }).manual).toEqual([
      { file: 'a.tsx', stmt: `import * as H from '${ROOT}' (uses PageHeader)` },
    ]);
  });

  it('the entries come from the steps that name the codemod', () => {
    expect(removalsFor('hds-patterns-subpath').entries.sort()).toEqual([ROOT, SUB]);
  });
});

describe('version text comes from the ledger', () => {
  it('no codemod hard-codes a release version', () => {
    const files = readdirSync(CODEMODS).filter((f) => f.endsWith('.mjs'));
    const hits = files.filter((f) => /\b0\.20\.0\b/.test(readFileSync(join(CODEMODS, f), 'utf8')));
    expect(hits).toEqual([]);
  });

  it('a removal names the release whose step records it', () => {
    expect(removedIn('Calendar')).toBe('0.20.0');
    expect(removedIn('TileGrid')).toBe('0.20.0');
    expect(removedIn('Button')).toBeUndefined();
  });

  it('removed-0.20.json lists exactly the 0.20.0 ledger removals', () => {
    const data = JSON.parse(readFileSync(join(CODEMODS, 'removed-0.20.json'), 'utf8'));
    const fromLedger = ledger(data.release)
      .steps.filter((s) => s.kind === 'removed' || s.kind === 'folded')
      .flatMap((s) => s.detect.imports.flatMap((i) => i.names));
    expect([...loadRemovedNames()].sort()).toEqual([...new Set(fromLedger)].sort());
    expect(new Set(fromLedger)).toEqual(new Set(removalsFor('hds-patterns-subpath').names.keys()));
  });

  it('a fold rule reports a removed props type with its own release', () => {
    const rule = foldRule({
      ...NOT_FOUND,
      version: '9.9.9',
      types: { NotFoundProps: 'ErrorPatternProps' },
    });
    const out = foldComponent(`import type { NotFoundProps } from '${ROOT}';\n`, rule);
    expect(out.manual).toEqual([
      `NotFoundProps from '${ROOT}' (removed in 9.9.9, use ErrorPatternProps)`,
    ]);
  });
});

describe('move-import takes any from/to entry', () => {
  it('moves the listed names between the entries it is given', () => {
    const src = `import { A, B } from '${ROOT}/old';\n`;
    const out = moveImports(src, new Set(['A']), { from: `${ROOT}/old`, to: `${ROOT}/new` });
    expect(out.source).toBe(`import { B } from '${ROOT}/old';\nimport { A } from '${ROOT}/new';\n`);
  });

  it('defaults to the root -> /patterns move', () => {
    const out = moveImports(`import { Page } from '${ROOT}';\n`, new Set(['Page']));
    expect(out.source).toBe(`import { Page } from '${SUB}';\n`);
  });
});

describe('rename-import takes any map and entry', () => {
  it('renames from the entry it is given', () => {
    const src = `import { Old } from '${SUB}';\nimport { Old as X } from '${ROOT}';\n`;
    const out = renameImports(src, { Old: 'New' }, SUB);
    expect(out.source).toBe(
      `import { New as Old } from '${SUB}';\nimport { Old as X } from '${ROOT}';\n`,
    );
  });
});

describe('fold rules are declarative', () => {
  it('NotFoundPattern is a data rule with its ledger release', () => {
    expect(NOT_FOUND.version).toBe('0.20.0');
    expect(NOT_FOUND.set).toEqual({ displayText: '404', message: 'Page not found' });
  });

  it('a data rule renames, sets and forbids attributes', () => {
    const rule = foldRule({
      name: 'Old',
      survivor: 'New',
      survivorFrom: PATTERNS,
      version: '1.2.3',
      rename: { size: 'scale' },
      set: { tone: 'quiet' },
      forbid: ['tone'],
    });
    const out = foldComponent(`import { Old } from '${ROOT}';\n<Old size="2" />;\n`, rule);
    expect(out.source).toBe(
      `import { New } from '${PATTERNS}';\n<New tone="quiet" scale="2" />;\n`,
    );
    const bad = foldComponent(`import { Old } from '${ROOT}';\n<Old tone="x" />;\n`, rule);
    expect(bad.changed).toBe(false);
    expect(bad.manual).toEqual([
      '<Old> at line 2: Old ignored tone, New would render it; rewrite it by hand',
    ]);
  });
});

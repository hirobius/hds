/**
 * Tests for codemods/unrewritable.mjs, the detector hds-prefix.mjs and
 * patterns-subpath.mjs share (hds#389 R1a), against the gaps hds#434 found.
 * Seams: `maskSource` and `findUnrewritable`, both pure.
 */
import { describe, it, expect } from 'vitest';
import { findUnrewritable, maskSource } from '../../codemods/unrewritable.mjs';

const ROOT = '@hirobius/design-system';
const NAMES = new Set(['Page', 'PageProps']);
const find = (src) => findUnrewritable(src, ROOT, NAMES);
const BT = '`';

// hds#434: scripts/check-typography-discipline.mjs:63 is this shape. The `/` on
// the line after a `//` comment was read as a division, so the backtick in the
// regex's character class opened a template that blanked the rest of the file.
describe('maskSource: a regex literal that starts a line after a comment', () => {
  const regexLine =
    String.raw`  /fontFamily\s*[=:]\s*["'` +
    BT +
    String.raw`](?:Geist Mono|monospace)["'` +
    BT +
    ']/i,';

  it.each([
    ['a // comment', '  // fontFamily prop with a quoted raw font name (in style objects)'],
    ['a block comment that ends its line', '  /* fontFamily prop (in style objects) */'],
  ])('reads it as a regex after %s, so the code after it stays readable', (_label, comment) => {
    const src = [
      `import * as HDS from '${ROOT}';`,
      'const PATTERNS = [',
      comment,
      regexLine,
      '];',
      'export const P = HDS.Page;',
      '',
    ].join('\n');
    const { code, unterminated } = maskSource(src);
    expect(code).toContain('export const P = HDS.Page;');
    expect(unterminated).toBeNull();
    expect(find(src)).toEqual([`import * as HDS from '${ROOT}' (uses Page)`]);
  });

  it('still reads a `/` that continues an expression as a division when no comment precedes it', () => {
    const src = `const a = total\n  / count / 2;\nconst s = 'x';\n`;
    const { code } = maskSource(src);
    expect(code).toContain('/ count / 2;');
  });
});

// hds#434: masking that ends inside a block comment or a template cannot happen
// in valid code, but JSX text can cause it, and it blanked the rest of the file
// silently, so --check passed.
describe('maskSource and findUnrewritable: masking that never ends', () => {
  it.each([
    ['a lone backtick in JSX text', `<p>Wrap code in a ${BT} mark</p>`, 'template'],
    ['src/*.ts in JSX text', '<p>Matches src/*.ts files</p>', 'comment'],
  ])('lists a file that ends inside %s as unreadable instead of passing it', (_l, jsx, kind) => {
    const src = `import * as HDS from '${ROOT}';\nexport const A = () => ${jsx};\nexport const B = HDS.Page;\n`;
    expect(maskSource(src).unterminated).toMatchObject({ kind, line: 2 });
    const out = find(src);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatch(/^unreadable from line 2: /);
    expect(out[0]).toMatch(
      kind === 'template' ? /template literal never closes/ : /block comment never closes/,
    );
  });

  it('reports a template whose `${` never closes', () => {
    expect(maskSource(`const ok = 1;\nconst t = ${BT}a \${b;\n`).unterminated).toMatchObject({
      kind: 'template',
      line: 2,
    });
  });

  it('reports nothing for complete code, comments and templates included', () => {
    const src = `/* a */\n// b\nconst t = ${BT}x \${y} z${BT};\nconst r = /[${BT}]/;\n`;
    expect(maskSource(src).unterminated).toBeNull();
    expect(find(`import { Page } from '${ROOT}';\n${src}`)).toEqual([]);
  });

  it('does not list a file that never names the package', () => {
    expect(find(`export const A = () => <p>a ${BT} mark</p>;\n`)).toEqual([]);
  });
});

// hds#434: forms the detector did not see.
describe('findUnrewritable: type-only, generic and BOM forms', () => {
  it('flags a type-only namespace import that reads a removed name', () => {
    expect(find(`import type * as HDS from '${ROOT}';\ntype P = HDS.PageProps;\n`)).toEqual([
      `import type * as HDS from '${ROOT}' (uses PageProps)`,
    ]);
  });

  it('flags a type-only star re-export, whose importers are in other files', () => {
    expect(find(`export type * from '${ROOT}';\n`)).toEqual([`export type * from '${ROOT}'`]);
    expect(find(`export type * as HDS from '${ROOT}';\n`)).toEqual([
      `export type * as HDS from '${ROOT}'`,
    ]);
  });

  it.each([
    [
      'a nested generic',
      `const a = await vi.importActual<Record<string, unknown>>('${ROOT}');\na.Page;`,
    ],
    [
      'a typeof import() type argument',
      `const a = await vi.importActual<typeof import('${ROOT}')>('${ROOT}');\na.Page;`,
    ],
    [
      'an object type argument',
      `const a = vi.importActual<{ Page: unknown; x: 1 }>('${ROOT}');\na.Page;`,
    ],
  ])('flags vi.importActual with %s', (_label, body) => {
    expect(find(`${body}\n`)).toContain(`importActual('${ROOT}') (uses Page)`);
  });

  it('flags jest.requireActual with a type argument', () => {
    expect(find(`const { Page } = jest.requireActual<Mod>('${ROOT}');\n`)).toEqual([
      `requireActual('${ROOT}') (uses Page)`,
    ]);
  });

  it('flags a file that starts with a byte order mark', () => {
    expect(find(`﻿import * as HDS from '${ROOT}';\nHDS.Page;\n`)).toEqual([
      `import * as HDS from '${ROOT}' (uses Page)`,
    ]);
    expect(find(`﻿export * from '${ROOT}';\n`)).toEqual([`export * from '${ROOT}'`]);
    expect(maskSource('﻿const a = 1;').code).toBe(' const a = 1;');
  });
});

describe('maskSource: cost', () => {
  it('reads 10,000 lines of comments, line-start regexes, quotes and templates in under a second', () => {
    const lines = [`import * as HDS from '${ROOT}';`];
    for (let i = 0; i < 2500; i++) {
      lines.push(`  // note ${i} (in style objects)`);
      lines.push(`  /a'b${BT}${i}/i,`);
      lines.push(`  x${i}\n  / y${i} / 2,`);
      lines.push(`const t${i} = ${BT}a \${b${i}} c${BT};`);
    }
    lines.push('export const P = HDS.Page;');
    const src = `${lines.join('\n')}\n`;
    const t0 = performance.now();
    const out = find(src);
    const ms = performance.now() - t0;
    expect(out).toEqual([`import * as HDS from '${ROOT}' (uses Page)`]);
    expect(ms).toBeLessThan(1000);
  });
});

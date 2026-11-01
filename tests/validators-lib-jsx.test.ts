import { describe, expect, it } from 'vitest';
// @ts-expect-error — untyped .mjs helper
import { walkJsx, getElementName, parseOrError, loadManifest } from '../validators/lib/jsx.mjs';
// @ts-expect-error — untyped .mjs
import { parse } from '../validators/parse-jsx.mjs';

describe('validators/lib/jsx', () => {
  it('walkJsx visits every JSXElement, nested included', () => {
    const { ast } = parse('<HdsCard><HdsButton label="a" /><Foo.Bar /></HdsCard>');
    const names: string[] = [];
    walkJsx(ast, (el: unknown) => names.push(getElementName(el)));
    expect(names).toEqual(['HdsCard', 'HdsButton', 'Foo.Bar']);
  });

  it('parseOrError returns the AST, or a PARSE_ERROR result', () => {
    expect(parseOrError('<A />').ast).toBeTruthy();
    const bad = parseOrError('<A');
    expect(bad.result.ok).toBe(false);
    expect(bad.result.errors[0]).toMatchObject({
      path: '',
      code: 'PARSE_ERROR',
      suggestion: 'Fix JSX syntax',
    });
  });

  it('loadManifest reads public/hds-manifest.json', () => {
    expect(loadManifest().componentSpecs).toBeTypeOf('object');
  });
});

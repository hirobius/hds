import { describe, expect, it } from 'vitest';
// @ts-expect-error — untyped .mjs helper
import {
  walkJsx,
  getElementName,
  parseOrError,
  loadManifest,
  validateElements,
} from '../validators/lib/jsx.mjs';
// @ts-expect-error — untyped .mjs helper
import { readFixtureInput } from '../validators/lib/fixture-input.mjs';
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

  it('validateElements walks every element and collects errors', async () => {
    const seen: Array<string | null> = [];
    const res = await validateElements('<A x="1"><B /></A>', (_el: unknown, ctx: any) => {
      seen.push(ctx.tagName);
      if (ctx.attrs.length) ctx.errors.push({ path: ctx.tagName, code: 'X' });
    });
    expect(seen).toEqual(['A', 'B']);
    expect(res).toEqual({ ok: false, errors: [{ path: 'A', code: 'X' }] });
    expect(await validateElements('<A />', () => {})).toEqual({ ok: true, errors: [] });
    expect((await validateElements('<A', () => {})).errors[0].code).toBe('PARSE_ERROR');
  });
});

describe('validators/lib/fixture-input', () => {
  it('rejects a non-object as MALFORMED', () => {
    expect(readFixtureInput(null).result).toEqual({
      ok: false,
      code: 'MALFORMED',
      message: 'fixture input is not an object',
    });
  });

  it('reads scenario, id and type with defaults', () => {
    expect(readFixtureInput({ scenario: 's' })).toEqual({
      scenario: 's',
      id: '11111111-1111-4111-8111-111111111111',
      type: 'fixture.test',
    });
    expect(readFixtureInput({ id: 'i', type: 't' })).toMatchObject({ id: 'i', type: 't' });
  });
});

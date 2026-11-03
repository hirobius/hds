/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Unit tests for unwrap in scripts/lib/ts-ast.mjs (hds#1010): the shared
 * TypeScript-API unwrap of check-spacing-vocabulary and
 * check-layout-gap-vocabulary.
 */
import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import { unwrap } from '../lib/ts-ast.mjs';

/** The initializer of `const x = <expr>;` parsed as `kind`. */
function initializer(expr, kind = ts.ScriptKind.TS) {
  const source = ts.createSourceFile(
    'x.ts',
    `const x = ${expr};`,
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
  return source.statements[0].declarationList.declarations[0].initializer;
}

describe('unwrap', () => {
  it('returns a bare expression unchanged', () => {
    const node = initializer('{ p: 2 }');
    expect(unwrap(node)).toBe(node);
  });

  it('strips parentheses, as, satisfies and <T> assertions, nested', () => {
    const inner = unwrap(initializer('((<X>({ p: 2 } satisfies X)) as Y)'));
    expect(ts.isObjectLiteralExpression(inner)).toBe(true);
    expect(inner.getText()).toBe('{ p: 2 }');
  });

  it('works on TSX (no <T> form there)', () => {
    const inner = unwrap(initializer("('md' as string)", ts.ScriptKind.TSX));
    expect(ts.isStringLiteral(inner)).toBe(true);
  });

  it('leaves a non-null assertion in place', () => {
    const node = initializer('value!');
    expect(ts.isNonNullExpression(unwrap(node))).toBe(true);
  });

  it('passes null and undefined through', () => {
    expect(unwrap(undefined)).toBeUndefined();
    expect(unwrap(null)).toBeNull();
  });
});

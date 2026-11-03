/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * ts-ast — TypeScript-API helpers shared by the AST-parsing gates
 * (hds#1010).
 *
 *   unwrap(node)
 *     `(x)`, `x as T`, `x satisfies T` and `<T>x` down to the expression
 *     itself. A non-null assertion (`x!`) is left in place.
 *
 * Used by check-spacing-vocabulary and check-layout-gap-vocabulary, which
 * each carried a copy.
 */

import ts from 'typescript';

/** Unwraps `(x)`, `x as T`, `x satisfies T` and `<T>x` down to the expression itself. */
export function unwrap(node) {
  let n = node;
  while (
    n &&
    (ts.isParenthesizedExpression(n) ||
      ts.isAsExpression(n) ||
      ts.isSatisfiesExpression(n) ||
      ts.isTypeAssertionExpression(n))
  ) {
    n = n.expression;
  }
  return n;
}

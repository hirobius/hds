/**
 * Shared AST helpers for the HDS ESLint rules. Deliberately AST-based (not
 * regex-over-source-text like the repo's internal scripts/check-*.mjs
 * guardrails) because this plugin runs inside consumers' own ESLint configs
 * against arbitrary TSX, where a plain parser is already available and gives
 * us exact node types for free.
 */

/** Resolve a JSXAttribute's name, e.g. `style` / `className` / `sx`. */
export function attrName(node) {
  return node.name && node.name.type === 'JSXIdentifier' ? node.name.name : null;
}

/** Resolve an ObjectExpression Property key to a plain string, or null. */
export function propName(key) {
  if (!key) return null;
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  return null;
}

/**
 * Resolve a JSXAttribute's `{ ... }` expression to the ObjectExpression it
 * wraps, e.g. `style={{ margin: 0 }}` -> the `{ margin: 0 }` ObjectExpression.
 * Returns null for anything else (identifiers, spreads-only, conditional
 * expressions, etc.) — this plugin only understands literal object props.
 */
export function jsxObjectExpression(attrValueNode) {
  if (!attrValueNode || attrValueNode.type !== 'JSXExpressionContainer') return null;
  const expr = attrValueNode.expression;
  return expr && expr.type === 'ObjectExpression' ? expr : null;
}

/**
 * Resolve a plain string literal value from a node — covers `'x'`/`"x"` and
 * zero-interpolation template literals (`` `x` ``). Returns null for
 * anything computed (identifiers, member expressions, interpolated
 * templates) — this plugin only flags values it can prove are raw.
 */
export function stringLiteralValue(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked ?? '').join('');
  }
  return null;
}

/**
 * Resolve a numeric literal value from a node, including unary-minus
 * (`-8`), which the estree parser represents as UnaryExpression, not a
 * negative Literal. Returns null for anything else.
 */
export function numberLiteralValue(node) {
  if (!node) return null;
  if (node.type === 'Literal' && typeof node.value === 'number') return node.value;
  if (
    node.type === 'UnaryExpression' &&
    node.operator === '-' &&
    node.argument.type === 'Literal' &&
    typeof node.argument.value === 'number'
  ) {
    return -node.argument.value;
  }
  return null;
}

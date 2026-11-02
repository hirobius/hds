/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * validators/a11y-validator.mjs
 * Checks JSX AST for WCAG-grounded accessibility issues.
 * Reads a11yRules from componentSpecs in the manifest.
 */

import { walkJsx, parseOrError } from './lib/jsx.mjs';

const INTERACTIVE_COMPONENTS = new Set([
  'HdsButton',
  'HdsIconButton',
  'HdsInput',
  'HdsSelect',
  'HdsTag',
]);

function hasAccessibleName(attrs) {
  return attrs.some((attr) => {
    if (attr.type === 'JSXSpreadAttribute') return false;
    const name = attr.name?.name;
    return name === 'label' || name === 'aria-label' || name === 'aria-labelledby';
  });
}

/**
 * @param {string} jsxString
 * @returns {{ ok: boolean, errors: Array<{path, code, message, suggestion}> }}
 */
export default async function validate(jsxString) {
  const { ast, result } = parseOrError(jsxString);
  if (result) return result;

  const errors = [];

  walkJsx(ast, (element) => {
    const tagName = element.openingElement?.name?.name;
    if (!tagName) return;
    const attrs = element.openingElement?.attributes || [];

    if (INTERACTIVE_COMPONENTS.has(tagName)) {
      if (!hasAccessibleName(attrs)) {
        errors.push({
          path: tagName,
          code: 'MISSING_ACCESSIBLE_NAME',
          message: `${tagName} must have an accessible name`,
          suggestion: 'Add a label prop (label="...") or aria-label="..."',
        });
      }
    }
  });

  return { ok: errors.length === 0, errors };
}

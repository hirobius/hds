/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * validators/a11y-validator.mjs
 * Checks JSX AST for WCAG-grounded accessibility issues.
 * Reads a11yRules from componentSpecs in the manifest.
 */

import { validateElements } from './lib/jsx.mjs';

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
export default function validate(jsxString) {
  return validateElements(jsxString, (element, { tagName: name, attrs, errors }) => {
    const tagName = name;
    if (!tagName) return;

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
}

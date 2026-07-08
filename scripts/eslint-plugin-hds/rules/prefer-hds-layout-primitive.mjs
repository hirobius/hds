/**
 * hds/prefer-hds-layout-primitive
 *
 * Warns (never errors) on ad-hoc `display: 'flex' | 'grid'` inside an
 * inline `style={{ ... }}` object, where a named HDS layout primitive
 * (Stack for flex, Grid for grid — see src/app/components/box.tsx's
 * "reach for Stack/Grid/Container first" guidance) likely fits better than
 * a one-off flex/grid container. Intentionally a warning: ad-hoc flex is
 * sometimes the right call (e.g. deeply nested one-off alignment), so this
 * nudges rather than blocks.
 */
import { attrName, jsxObjectExpression, propName, stringLiteralValue } from './utils.mjs';

const FLEX_GRID_RE = /^(?:inline-)?(flex|grid)$/;

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn on ad-hoc display:flex/grid in inline style where a named HDS layout primitive (Stack/Grid) likely fits.',
      recommended: true,
      url: 'https://github.com/hirobius/hirobius-design-system/blob/main/scripts/eslint-plugin-hds/README.md#hdsprefer-hds-layout-primitive',
    },
    schema: [],
    messages: {
      preferPrimitive:
        'Ad-hoc "display: {{display}}" in inline style — consider the named HDS layout primitive (Stack for flex, Grid for grid) instead of a one-off flex/grid container.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (attrName(node) !== 'style') return;
        const obj = jsxObjectExpression(node.value);
        if (!obj) return;

        const displayProp = obj.properties.find(
          (p) => p.type === 'Property' && propName(p.key) === 'display',
        );
        if (!displayProp) return;

        const value = stringLiteralValue(displayProp.value);
        if (value != null && FLEX_GRID_RE.test(value)) {
          context.report({
            node: displayProp.value,
            messageId: 'preferPrimitive',
            data: { display: value },
          });
        }
      },
    };
  },
};

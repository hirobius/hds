/**
 * hds/no-raw-hex
 *
 * Disallows raw hex color literals (#rgb, #rrggbb, #rrggbbaa) in a JSX
 * `style={{ ... }}` object or a `className` string/template literal.
 * Mirrors the intent of the internal scripts/check-hardcoded-colors.mjs
 * gate, scoped down to the two contexts a consumer app actually authors:
 * inline style objects and Tailwind-style arbitrary-value classNames.
 */
import { attrName, jsxObjectExpression, propName, stringLiteralValue } from './utils.mjs';

const HEX_RE = /#[0-9a-fA-F]{3,4}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{8}\b/;

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw hex color literals in style or className — use an HDS color token instead.',
      recommended: true,
      url: 'https://github.com/hirobius/hirobius-design-system/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-raw-hex',
    },
    schema: [],
    messages: {
      rawHexStyle:
        'Raw hex color "{{value}}" in style prop "{{prop}}" bypasses HDS color tokens. Use a token reference — Box sx prop color: "content.primary", or var(--semantic-color-...).',
      rawHexClassName:
        'Raw hex color "{{value}}" in className bypasses HDS color tokens. Use a token-backed utility class or Box sx instead of an arbitrary hex value.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const name = attrName(node);
        if (name === 'style') {
          const obj = jsxObjectExpression(node.value);
          if (!obj) return;
          for (const prop of obj.properties) {
            if (prop.type !== 'Property') continue;
            const value = stringLiteralValue(prop.value);
            if (value != null && HEX_RE.test(value)) {
              context.report({
                node: prop.value,
                messageId: 'rawHexStyle',
                data: { value, prop: propName(prop.key) ?? '?' },
              });
            }
          }
          return;
        }

        if (name === 'className') {
          let value = null;
          if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
            value = node.value.value;
          } else if (node.value && node.value.type === 'JSXExpressionContainer') {
            value = stringLiteralValue(node.value.expression);
          }
          if (typeof value === 'string' && HEX_RE.test(value)) {
            context.report({
              node: node.value,
              messageId: 'rawHexClassName',
              data: { value: value.match(HEX_RE)[0] },
            });
          }
        }
      },
    };
  },
};

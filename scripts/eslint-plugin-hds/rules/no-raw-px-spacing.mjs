/**
 * hds/no-raw-px-spacing
 *
 * Disallows raw pixel strings (`'16px'`) or bare numeric literals (`16`) on
 * margin/padding/gap family properties inside a JSX `style={{ ... }}`
 * object. Zero is exempt (a reset has no scale to violate). Mirrors the
 * intent of scripts/check-hardcoded-spacing.mjs for consumer app code.
 */
import {
  attrName,
  jsxObjectExpression,
  numberLiteralValue,
  propName,
  stringLiteralValue,
} from './utils.mjs';

const SPACING_PROPS = new Set([
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginBlock',
  'marginInline',
  'marginBlockStart',
  'marginBlockEnd',
  'marginInlineStart',
  'marginInlineEnd',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingBlock',
  'paddingInline',
  'paddingBlockStart',
  'paddingBlockEnd',
  'paddingInlineStart',
  'paddingInlineEnd',
  'gap',
  'rowGap',
  'columnGap',
]);

const PX_STRING_RE = /^-?\d+(?:\.\d+)?px$/;

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw px strings or bare numbers on margin/padding/gap in inline style — use an HDS spacing token.',
      recommended: true,
      url: 'https://github.com/hirobius/hirobius-design-system/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-raw-px-spacing',
    },
    schema: [],
    messages: {
      rawPxSpacing:
        'Raw spacing value "{{value}}" on "{{prop}}" bypasses the HDS spacing scale. Use hds.space.*, hds.density.*, var(--semantic-space-...), or Box sx prop "{{prop}}" with a token key.',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (attrName(node) !== 'style') return;
        const obj = jsxObjectExpression(node.value);
        if (!obj) return;

        for (const prop of obj.properties) {
          if (prop.type !== 'Property') continue;
          const name = propName(prop.key);
          if (!name || !SPACING_PROPS.has(name)) continue;

          const strVal = stringLiteralValue(prop.value);
          if (strVal != null && PX_STRING_RE.test(strVal)) {
            context.report({
              node: prop.value,
              messageId: 'rawPxSpacing',
              data: { prop: name, value: strVal },
            });
            continue;
          }

          const numVal = numberLiteralValue(prop.value);
          if (numVal != null && numVal !== 0) {
            context.report({
              node: prop.value,
              messageId: 'rawPxSpacing',
              data: { prop: name, value: String(numVal) },
            });
          }
        }
      },
    };
  },
};

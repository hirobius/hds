/**
 * hds/no-raw-px-spacing
 *
 * Disallows raw pixel strings (`'16px'`) or bare numeric literals (`16`) on
 * margin/padding/gap family properties inside a JSX `style={{ ... }}`
 * object. Zero is exempt (a reset has no scale to violate). Mirrors the
 * intent of scripts/check-hardcoded-spacing.mjs for consumer app code.
 *
 * The fix it offers is the t-shirt scale token, and, where Box `sx` has a
 * key for the same CSS property, that key with a step name. Box `sx` resolves
 * step names on its spacing keys only (`mb: 'md'`); a long-hand key
 * (`marginBottom: 'md'`) passes through as invalid CSS and renders no
 * spacing, so the message names the shorthand, never the flagged prop.
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

// Long-hand style prop → the Box sx key that sets the same CSS property and
// resolves t-shirt steps (src/app/components/box-sx.ts SPACING_PROP_MAP).
// Logical props have none: sx `mx`/`my`/`px`/`py` set physical sides, which
// match `*Inline`/`*Block` only in horizontal writing modes.
const SX_SHORTHAND = {
  margin: 'm',
  marginTop: 'mt',
  marginBottom: 'mb',
  marginLeft: 'ml',
  marginRight: 'mr',
  padding: 'p',
  paddingTop: 'pt',
  paddingBottom: 'pb',
  paddingLeft: 'pl',
  paddingRight: 'pr',
  gap: 'gap',
  rowGap: 'rowGap',
  columnGap: 'columnGap',
};

const PX_STRING_RE = /^-?\d+(?:\.\d+)?px$/;

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw px strings or bare numbers on margin/padding/gap in inline style — use an HDS spacing token.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-raw-px-spacing',
    },
    schema: [],
    messages: {
      rawPxSpacing:
        'Raw spacing value "{{value}}" on "{{prop}}" bypasses the HDS spacing scale. Use hds.semantic.space.scale.* (var(--semantic-space-scale-*)), or Box sx prop "{{sxProp}}" with a t-shirt step such as "md".',
      rawPxSpacingNoSxShorthand:
        'Raw spacing value "{{value}}" on "{{prop}}" bypasses the HDS spacing scale. Use hds.semantic.space.scale.* (var(--semantic-space-scale-*)). Box sx has no shorthand for "{{prop}}", so its t-shirt steps do not apply.',
    },
  },
  create(context) {
    function report(node, prop, value) {
      const sxProp = Object.hasOwn(SX_SHORTHAND, prop) ? SX_SHORTHAND[prop] : undefined;
      context.report(
        sxProp
          ? { node, messageId: 'rawPxSpacing', data: { prop, value, sxProp } }
          : { node, messageId: 'rawPxSpacingNoSxShorthand', data: { prop, value } },
      );
    }

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
            report(prop.value, name, strVal);
            continue;
          }

          const numVal = numberLiteralValue(prop.value);
          if (numVal != null && numVal !== 0) {
            report(prop.value, name, String(numVal));
          }
        }
      },
    };
  },
};

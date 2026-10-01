/**
 * hds/sx-token-first
 *
 * Errors on raw hex colors or raw px strings inside a `sx={{ ... }}` prop
 * (Box's token-first layout engine — src/app/components/box.tsx). `sx` is
 * the sanctioned escape hatch specifically because it forces spacing/color
 * through HDS tokens. The spacing shorthands (`p`, `m`, `gap`, ...) take the
 * t-shirt scale by name ('xs' | 'sm' | 'md' | 'lg' | 'xl', hds#206), and the
 * fix this rule offers on them points there. No other key resolves those names
 * (`width: 'md'` is invalid CSS), so a px string anywhere else is pointed at a
 * token (`hds.space.*` or a `var(--...)`). Bare numbers still resolve off the
 * 4px space scale (`p: 4` is 16px), so this rule does NOT flag them — only
 * values that prove the author reached past the token system (hex strings,
 * explicit 'Npx' strings). Nested objects (responsive `{ xs, sm, ... }` and
 * `&`-selector blocks) are walked recursively since sx supports both; a value
 * in a responsive map is reported against the key the map sits on.
 */
import { attrName, jsxObjectExpression, propName, stringLiteralValue } from './utils.mjs';

const HEX_RE = /#[0-9a-fA-F]{3,4}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{8}\b/;
const PX_STRING_RE = /-?\d+(?:\.\d+)?px/;

// The Box sx keys whose values go through the spacing resolver, the only
// keys that take the t-shirt names (box-sx.ts SPACING_PROP_MAP).
const SPACING_KEYS = new Set([
  'm',
  'mt',
  'mr',
  'mb',
  'ml',
  'mx',
  'my',
  'p',
  'pt',
  'pr',
  'pb',
  'pl',
  'px',
  'py',
  'gap',
  'rowGap',
  'columnGap',
]);

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw hex/px string values inside Box sx — sx must resolve colors and spacing through HDS token keys.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdssx-token-first',
    },
    schema: [],
    messages: {
      rawHexInSx:
        'Raw hex color "{{value}}" in sx prop "{{prop}}" bypasses HDS color tokens. Use a dotted token key (e.g. "content.primary", "surface.raised", "accent").',
      rawPxInSx:
        'Raw px string "{{value}}" in sx prop "{{prop}}" bypasses the HDS spacing scale. Use a t-shirt step: "xs" | "sm" | "md" | "lg" | "xl" (8/16/24/32/48px at comfortable density; compact tightens them).',
      rawPxInSxNonSpacing:
        'Raw px string "{{value}}" in sx prop "{{prop}}" bypasses HDS tokens. Use a token: an hds.space.* value or a var(--...) such as "var(--primitive-space-4)". Spacing step names apply to the spacing props (p, m, gap, ...) only.',
    },
  },
  create(context) {
    /**
     * @param objExpr an sx object, an `&`-selector block, or a responsive map
     * @param mapKey the key a responsive map sits on (null for an sx object or
     *   an `&` block, whose keys are real sx keys)
     */
    function walk(objExpr, mapKey = null) {
      for (const prop of objExpr.properties) {
        if (prop.type !== 'Property') continue; // skip SpreadElement
        const name = propName(prop.key) ?? '?';

        if (prop.value.type === 'ObjectExpression') {
          // '&'-selector nesting holds sx keys again; anything else is a
          // responsive { xs, sm, ... } map on this key.
          walk(prop.value, name.startsWith('&') ? null : (mapKey ?? name));
          continue;
        }

        const value = stringLiteralValue(prop.value);
        if (value == null) continue;
        const key = mapKey ?? name;

        if (HEX_RE.test(value)) {
          context.report({
            node: prop.value,
            messageId: 'rawHexInSx',
            data: { value, prop: key },
          });
        } else if (PX_STRING_RE.test(value)) {
          context.report({
            node: prop.value,
            messageId: SPACING_KEYS.has(key) ? 'rawPxInSx' : 'rawPxInSxNonSpacing',
            data: { value, prop: key },
          });
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (attrName(node) !== 'sx') return;
        const obj = jsxObjectExpression(node.value);
        if (!obj) return;
        walk(obj);
      },
    };
  },
};

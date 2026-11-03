/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * validators/token-validator.mjs
 * Walks a JSX AST and flags raw color/dimension literals in attribute values.
 * All visual values must be token paths or var: shorthands.
 */

import { validateElements } from './lib/jsx.mjs';

const RAW_COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch\(|lab\()/;
const RAW_DIMENSION_RE = /^\d+(\.\d+)?(px|rem|em|ch|vh|vw)$/;
const RAW_FONT_RE = /^\d+(\.\d+)?(px|pt|em|rem)$/;

const VISUAL_PROPS = new Set([
  'fill',
  'color',
  'background',
  'backgroundColor',
  'borderColor',
  'stroke',
  'padding',
  'margin',
  'gap',
  'fontSize',
  'borderRadius',
  'width',
  'height',
  'paddingX',
  'paddingY',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
]);

function isRawValue(value, attrName) {
  if (typeof value !== 'string') return false;
  if (RAW_COLOR_RE.test(value))
    return { code: 'RAW_COLOR', message: `Raw color "${value}" — use a semantic token path` };
  if (attrName === 'fontSize' && RAW_FONT_RE.test(value))
    return { code: 'RAW_FONT', message: `Raw font value "${value}" — use a typography token` };
  if (RAW_DIMENSION_RE.test(value))
    return { code: 'RAW_DIMENSION', message: `Raw dimension "${value}" — use a token path` };
  return false;
}

/**
 * @param {string} jsxString
 * @returns {{ ok: boolean, errors: Array<{path, code, message, suggestion}> }}
 */
export default function validate(jsxString) {
  return validateElements(jsxString, (element, { tagName: name, attrs, errors }) => {
    const tagName = name || 'unknown';

    for (const attr of attrs) {
      if (attr.type === 'JSXSpreadAttribute') continue;
      const attrName = attr.name?.name;
      if (!attrName || !VISUAL_PROPS.has(attrName)) continue;

      const val = attr.value?.type === 'Literal' ? attr.value.value : null;
      if (val === null) continue;

      const issue = isRawValue(val, attrName);
      if (issue) {
        errors.push({
          path: `${tagName}.${attrName}`,
          code: issue.code,
          message: issue.message,
          suggestion:
            'Replace with a semantic token path like "semantic.color.surface.raised" or var: shorthand',
        });
      }
    }
  });
}

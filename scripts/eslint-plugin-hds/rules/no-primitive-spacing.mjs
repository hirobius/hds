/**
 * hds/no-primitive-spacing
 *
 * Components and consumers may only use SEMANTIC spacing
 * (`var(--semantic-space-*)`, `hds.semantic.space.*`, Tailwind semantic keys
 * such as `p-surface-padding` / `gap-scale-md`, Box `sx` t-shirt keys). The
 * primitive steps are the scale's raw material: using one bypasses density
 * and the scale. Four checks, one report per offending token:
 *
 *   primitiveVar      `--primitive-space-<step>` in any string / template quasi
 *   primitiveMember   `<x>.space.pxN` (but not `<x>.semantic.space.pxN`)
 *   primitiveTailwind numeric / pxN Tailwind spacing utilities in `className`
 *                     or `cn()` / `clsx()` / `cva()` arguments (option
 *                     `tailwind: false` turns this check, and only this one, off)
 *   deprecatedStep    px6 / px10 in any of the three forms: off the 4px grid,
 *                     removed in 0.28.0. Takes priority over the three above.
 *
 * Zero (`p-0`) and `p-px` are allowed: a reset and a hairline have no step.
 */
import { attrName } from './utils.mjs';

const DEPRECATED_STEPS = new Set(['px6', 'px10']);
const CLASS_CALLEES = new Set(['cn', 'clsx', 'cva']);
const PRIMITIVE_VAR_RE = /--primitive-space-([a-z0-9]+)/gi;
const PX_KEY_RE = /^px\d+$/;
const TAILWIND_SPACING_RE =
  /^(p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy])-(\d+(?:\.\d+)?|px\d+)$/;

/** `md:hover:[&>svg]:!-mt-4` -> `mt-4`. */
function stripVariantsAndModifiers(cls) {
  const bare = cls.slice(cls.lastIndexOf(':') + 1);
  return bare.replace(/^!/, '').replace(/^-/, '').replace(/!$/, '');
}

/** Text of every string-ish piece under a node that is class-name-shaped. */
function collectClassNodes(node, out) {
  if (!node) return;
  switch (node.type) {
    case 'Literal':
      if (typeof node.value === 'string') out.push({ node, text: node.value });
      break;
    case 'TemplateLiteral':
      for (const q of node.quasis) out.push({ node: q, text: q.value.cooked ?? '' });
      for (const e of node.expressions) collectClassNodes(e, out);
      break;
    case 'JSXExpressionContainer':
      collectClassNodes(node.expression, out);
      break;
    case 'ConditionalExpression':
      collectClassNodes(node.consequent, out);
      collectClassNodes(node.alternate, out);
      break;
    case 'LogicalExpression':
      collectClassNodes(node.left, out);
      collectClassNodes(node.right, out);
      break;
    case 'ArrayExpression':
      for (const el of node.elements) collectClassNodes(el, out);
      break;
    case 'ObjectExpression':
      for (const prop of node.properties) {
        if (prop.type === 'SpreadElement') continue;
        if (prop.computed) collectClassNodes(prop.key, out);
        else if (prop.key.type === 'Literal') collectClassNodes(prop.key, out);
        collectClassNodes(prop.value, out);
      }
      break;
    case 'CallExpression':
      for (const arg of node.arguments) collectClassNodes(arg, out);
      break;
    default:
      break;
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow primitive spacing steps (--primitive-space-*, hds.space.pxN, Tailwind p-4) — use a semantic spacing token.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-primitive-spacing',
    },
    schema: [
      {
        type: 'object',
        properties: { tailwind: { type: 'boolean' } },
        additionalProperties: false,
      },
    ],
    messages: {
      primitiveVar:
        '"--primitive-space-{{step}}" is a primitive spacing step; primitive steps bypass density and the scale. Use a semantic spacing token (var(--semantic-space-scale-*) / surface-padding / region-gutter, Tailwind `p-surface-padding`, `gap-scale-md`, or Box sx \'md\').',
      primitiveMember:
        '"{{text}}" is a primitive spacing step; primitive steps bypass density and the scale. Use a semantic spacing token (hds.semantic.space.scale.* / surface-padding / region-gutter, Tailwind `p-surface-padding`, `gap-scale-md`, or Box sx \'md\').',
      primitiveTailwind:
        'Tailwind class "{{cls}}" uses a primitive spacing step; primitive steps bypass density and the scale. Use a semantic spacing token (var(--semantic-space-scale-*) / surface-padding / region-gutter, Tailwind `p-surface-padding`, `gap-scale-md`, or Box sx \'md\').',
      deprecatedStep:
        '"{{text}}" uses a deprecated spacing step: px6 and px10 are off the 4px grid, deprecated and removed in 0.28.0. Run `npx @hirobius/design-system upgrade` (codemod hds-spacing-steps) or use a semantic spacing token.',
    },
  },
  create(context) {
    const tailwind = context.options[0]?.tailwind !== false;
    const classChecked = new WeakSet();

    function checkVars(node, text) {
      if (!text.includes('--primitive-space-')) return;
      const seen = new Set();
      for (const [full, step] of text.matchAll(PRIMITIVE_VAR_RE)) {
        if (seen.has(full)) continue;
        seen.add(full);
        if (DEPRECATED_STEPS.has(step.toLowerCase())) {
          context.report({ node, messageId: 'deprecatedStep', data: { text: full } });
        } else {
          context.report({ node, messageId: 'primitiveVar', data: { step } });
        }
      }
    }

    function checkClasses(root) {
      const pieces = [];
      collectClassNodes(root, pieces);
      for (const { node, text } of pieces) {
        if (classChecked.has(node)) continue;
        classChecked.add(node);
        const seen = new Set();
        for (const raw of text.split(/\s+/)) {
          if (!raw || seen.has(raw)) continue;
          const match = TAILWIND_SPACING_RE.exec(stripVariantsAndModifiers(raw));
          if (!match) continue;
          const step = match[2];
          if (!step.startsWith('px') && Number(step) === 0) continue;
          seen.add(raw);
          if (DEPRECATED_STEPS.has(step)) {
            context.report({ node, messageId: 'deprecatedStep', data: { text: raw } });
          } else {
            context.report({ node, messageId: 'primitiveTailwind', data: { cls: raw } });
          }
        }
      }
    }

    const propertyName = (member) =>
      !member.computed && member.property.type === 'Identifier' ? member.property.name : null;

    return {
      Literal(node) {
        if (typeof node.value === 'string') checkVars(node, node.value);
      },
      TemplateElement(node) {
        checkVars(node, node.value.cooked ?? '');
      },
      MemberExpression(node) {
        const step = propertyName(node);
        if (!step || !PX_KEY_RE.test(step)) return;
        const spaceObj = node.object;
        if (spaceObj.type !== 'MemberExpression' || propertyName(spaceObj) !== 'space') return;
        const root = spaceObj.object;
        if (root.type === 'MemberExpression' && propertyName(root) === 'semantic') return;
        const text = context.sourceCode.getText(node);
        context.report({
          node,
          messageId: DEPRECATED_STEPS.has(step) ? 'deprecatedStep' : 'primitiveMember',
          data: { text },
        });
      },
      JSXAttribute(node) {
        if (tailwind && attrName(node) === 'className') checkClasses(node.value);
      },
      CallExpression(node) {
        if (tailwind && node.callee.type === 'Identifier' && CLASS_CALLEES.has(node.callee.name)) {
          checkClasses(node);
        }
      },
    };
  },
};

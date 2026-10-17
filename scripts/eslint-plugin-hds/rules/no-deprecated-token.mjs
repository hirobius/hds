/**
 * hds/no-deprecated-token
 *
 * A `$deprecated` design token is an error wherever it is spelled, and the
 * message names its replacement. Reads deprecated-tokens.json, which
 * scripts/build-tokens.mjs writes from hirobius.tokens.json, so a newly
 * deprecated token is caught with no edit here. Three forms, one report each:
 *
 *   CSS var   `--semantic-space-layout-tight` in any string / template quasi
 *   member    `<x>.semantic.space.layout.tight` (also `.h1.fontSize` below it)
 *   Tailwind  `p-layout-tight`, `md:-mt-layout-inset`, `rounded-<key>` in
 *             `className` or `cn()` / `clsx()` / `cva()` arguments
 *
 * The primitive px6 / px10 steps stay with hds/no-primitive-spacing, which
 * already reports them, so one site is not reported twice.
 */
import { readFileSync } from 'node:fs';
import { attrName } from './utils.mjs';

const { tokens: ALL } = JSON.parse(
  readFileSync(new URL('./deprecated-tokens.json', import.meta.url), 'utf8'),
);
const DEPRECATED = ALL.filter((d) => !d.path.startsWith('primitive.space.'));

const SPACING_UTILS =
  'gap-x|gap-y|gap|space-x|space-y|px|py|pt|pr|pb|pl|ps|pe|p|mx|my|mt|mr|mb|ml|ms|me|m|inset-x|inset-y|inset|top|right|bottom|left';
const RADIUS_UTILS = 'rounded-(?:t|r|b|l|s|e|tl|tr|bl|br|ss|se|es|ee)|rounded';
const CLASS_CALLEES = new Set(['cn', 'clsx', 'cva']);

const byVar = new Map(DEPRECATED.map((d) => [d.cssVar, d]));
const byPath = new Map(DEPRECATED.map((d) => [d.path, d]));
const byTailwind = new Map(DEPRECATED.filter((d) => d.tailwind).map((d) => [d.tailwind, d]));
const VAR_RE = /--[A-Za-z0-9-]+/g;

/** `md:hover:!-mt-layout-tight` -> { util: 'mt', key: 'layout-tight', sign: '-' } */
function parseClass(cls) {
  const bare = cls.slice(cls.lastIndexOf(':') + 1).replace(/^!/, '');
  const m = new RegExp(`^(-?)(${SPACING_UTILS}|${RADIUS_UTILS})-(.+?)!?$`).exec(bare);
  return m ? { sign: m[1], util: m[2], key: m[3] } : null;
}

const isRadiusUtil = (util) => util.startsWith('rounded');

/** Text of every class-name-shaped string under a node. */
function collectStrings(node, out) {
  if (!node) return;
  switch (node.type) {
    case 'Literal':
      if (typeof node.value === 'string') out.push({ node, text: node.value });
      break;
    case 'TemplateLiteral':
      for (const q of node.quasis) out.push({ node: q, text: q.value.cooked ?? '' });
      for (const e of node.expressions) collectStrings(e, out);
      break;
    case 'JSXExpressionContainer':
      collectStrings(node.expression, out);
      break;
    case 'ConditionalExpression':
      collectStrings(node.consequent, out);
      collectStrings(node.alternate, out);
      break;
    case 'LogicalExpression':
      collectStrings(node.left, out);
      collectStrings(node.right, out);
      break;
    case 'ArrayExpression':
      for (const el of node.elements) collectStrings(el, out);
      break;
    case 'ObjectExpression':
      for (const prop of node.properties) {
        if (prop.type === 'SpreadElement') continue;
        if (prop.key.type === 'Literal') collectStrings(prop.key, out);
        collectStrings(prop.value, out);
      }
      break;
    case 'CallExpression':
      for (const arg of node.arguments) collectStrings(arg, out);
      break;
    default:
      break;
  }
}

/** `a.b.c` for a non-computed member chain, else null. */
function memberText(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type !== 'MemberExpression' || node.computed) return null;
  const obj = memberText(node.object);
  return obj && `${obj}.${node.property.name}`;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow deprecated design tokens (CSS var, hds.* member or Tailwind key) — the message names the replacement.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-deprecated-token',
    },
    schema: [],
    messages: {
      deprecated:
        '"{{text}}" is a deprecated token ({{note}}), removed in {{removeIn}}.{{fix}} `npx @hirobius/design-system upgrade` rewrites it.',
    },
  },
  create(context) {
    const classChecked = new WeakSet();

    function report(node, text, d, fix) {
      context.report({
        node,
        messageId: 'deprecated',
        data: { text, note: d.note, removeIn: d.removeIn, fix: fix ? ` Use ${fix}.` : '' },
      });
    }

    function checkVars(node, text) {
      if (!text.includes('--')) return;
      const seen = new Set();
      for (const [v] of text.matchAll(VAR_RE)) {
        const d = byVar.get(v);
        if (!d || seen.has(v)) continue;
        seen.add(v);
        report(node, v, d, d.replacementCssVar);
      }
    }

    function checkClasses(node, text) {
      for (const cls of text.split(/\s+/)) {
        const parsed = cls && parseClass(cls);
        const d = parsed && byTailwind.get(parsed.key);
        if (!d) continue;
        // A spacing key on a rounded-* utility (or the reverse) is not that token.
        if (isRadiusUtil(parsed.util) !== d.path.startsWith('semantic.radius.')) continue;
        const fix =
          d.replacementTailwind && `${parsed.sign}${parsed.util}-${d.replacementTailwind}`;
        report(node, `${parsed.sign}${parsed.util}-${parsed.key}`, d, fix);
      }
    }

    function checkClassValue(valueNode) {
      const out = [];
      collectStrings(valueNode, out);
      for (const { node, text } of out) {
        if (classChecked.has(node)) continue;
        classChecked.add(node);
        checkClasses(node, text);
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') checkVars(node, node.value);
      },
      TemplateElement(node) {
        checkVars(node, node.value.cooked ?? '');
      },
      MemberExpression(node) {
        // Report the longest chain once: skip a member that is itself an object.
        if (node.parent?.type === 'MemberExpression' && node.parent.object === node) return;
        const text = memberText(node);
        if (!text) return;
        const parts = text.split('.');
        for (let start = 1; start < parts.length; start++) {
          for (let end = parts.length; end > start; end--) {
            const d = byPath.get(parts.slice(start, end).join('.'));
            if (d) return report(node, text, d, d.replacement);
          }
        }
      },
      JSXAttribute(node) {
        if (!['className', 'class'].includes(attrName(node)) || !node.value) return;
        checkClassValue(node.value);
      },
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || !CLASS_CALLEES.has(node.callee.name)) return;
        for (const arg of node.arguments) checkClassValue(arg);
      },
    };
  },
};

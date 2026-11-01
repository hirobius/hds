/**
 * hds/no-deprecated-import (hds#469)
 *
 * Warns on an import of a `@deprecated` export of @hirobius/design-system
 * (any entry), naming the version that removes it. Reads
 * deprecated-exports.json, which scripts/build-deprecations.mjs writes from
 * the package's JSDoc, so the installed package's own data drives the rule.
 */
import { readFileSync } from 'node:fs';

const { exports: DEPRECATED } = JSON.parse(
  readFileSync(new URL('./deprecated-exports.json', import.meta.url), 'utf8'),
);
const byName = new Map(DEPRECATED.map((d) => [d.name, d]));
const isHds = (source) =>
  source === '@hirobius/design-system' || source.startsWith('@hirobius/design-system/');

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'Flag imports of deprecated @hirobius/design-system exports.' },
    schema: [],
    messages: {
      deprecated: '{{name}} is deprecated and is removed in {{removeIn}}: {{note}}{{instead}}',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== 'string' || !isHds(node.source.value)) return;
        for (const spec of node.specifiers) {
          if (spec.type !== 'ImportSpecifier') continue;
          const name =
            spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value;
          const d = byName.get(name);
          if (!d) continue;
          context.report({
            node: spec,
            messageId: 'deprecated',
            data: {
              name,
              removeIn: d.removeIn ?? 'a future version',
              note: d.note,
              instead: d.useInstead ? ` Use ${d.useInstead}.` : '',
            },
          });
        }
      },
    };
  },
};

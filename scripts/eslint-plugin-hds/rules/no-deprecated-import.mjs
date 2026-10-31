/**
 * hds/no-deprecated-import
 *
 * Importing a deprecated export of @hirobius/design-system is an error, and
 * the message says when it goes and what replaces it. Until hds#469 a
 * deprecation reached a consumer only as editor strikethrough; this rule is
 * the lint half of the shipped record. The deprecated names come from the
 * installed package's deprecations.json (rules/deprecations-data.mjs),
 * generated from the same `@deprecated` JSDoc check-deprecations gates, so
 * a newly deprecated export is caught with no edit here. Token-object keys
 * (`hds.typeStyles.h1`) are member paths, not import names — the record
 * lists them as dotted names, and this rule leaves them to the JSDoc.
 */
import { deprecationsData, isHdsSource } from './deprecations-data.mjs';

const byName = new Map(
  deprecationsData()
    .exports.filter((e) => !e.name.includes('.'))
    .map((e) => [e.name, e]),
);

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow importing a deprecated export of @hirobius/design-system — the message names its removal version and replacement.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-deprecated-import',
    },
    schema: [],
    messages: {
      deprecated:
        '"{{name}}" is deprecated in @hirobius/design-system ({{notice}}) and is removed in {{removeIn}}.{{fix}}',
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== 'string' || !isHdsSource(source)) return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') continue;
          const imported = specifier.imported.name ?? specifier.imported.value;
          const entry = byName.get(imported);
          if (!entry) continue;
          context.report({
            node: specifier,
            messageId: 'deprecated',
            data: {
              name: imported,
              notice: entry.notice,
              removeIn: entry.removeIn ?? 'a future release',
              fix: entry.useInstead ? ` Use ${entry.useInstead} instead.` : '',
            },
          });
        }
      },
    };
  },
};

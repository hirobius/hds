/**
 * hds/no-removed-import
 *
 * Importing a name a shipped release already removed from
 * @hirobius/design-system is an error: the import resolves to nothing, and
 * the message names the release that took it and the migration the upgrade
 * ledger recorded. The removed names come from the installed package's
 * deprecations.json (rules/deprecations-data.mjs), generated from the
 * upgrade ledgers' `detect.imports`, so a removal is caught with no edit
 * here. A name is only flagged at the entry point it was removed from —
 * a name that moved to `/patterns` still imports fine from there.
 */
import { deprecationsData, isHdsSource } from './deprecations-data.mjs';

const byKey = new Map(deprecationsData().removed.map((r) => [`${r.from} ${r.name}`, r]));

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow importing a name a shipped @hirobius/design-system release removed — the message names the release and the migration.',
      recommended: true,
      url: 'https://github.com/hirobius/hds/blob/main/scripts/eslint-plugin-hds/README.md#hdsno-removed-import',
    },
    schema: [],
    messages: {
      removed: '"{{name}}" was removed from {{from}} in {{removedIn}}. {{note}}',
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
          const entry = byKey.get(`${source} ${imported}`);
          if (!entry) continue;
          context.report({
            node: specifier,
            messageId: 'removed',
            data: {
              name: imported,
              from: entry.from,
              removedIn: entry.removedIn,
              note: entry.note,
            },
          });
        }
      },
    };
  },
};

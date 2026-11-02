/**
 * hds/no-removed-import (hds#469)
 *
 * Errors on an import of a @hirobius/design-system export whose `@removeIn`
 * version the installed package has reached: the export is gone (or about to
 * be), so the build would break. Below removeIn, hds/no-deprecated-import
 * warns instead. Reads deprecated-exports.json and the installed package's
 * own version (the package.json three levels up, where this file ships);
 * the `version` option overrides it.
 */
import { readFileSync } from 'node:fs';

const { exports: DEPRECATED } = JSON.parse(
  readFileSync(new URL('./deprecated-exports.json', import.meta.url), 'utf8'),
);
const byName = new Map(DEPRECATED.filter((d) => d.removeIn).map((d) => [d.name, d]));
const isHds = (source) =>
  source === '@hirobius/design-system' || source.startsWith('@hirobius/design-system/');

function installedVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
    return pkg.name === '@hirobius/design-system' ? pkg.version : null;
  } catch {
    return null;
  }
}
const INSTALLED = installedVersion();

/** True when `version` is at or past `removeIn` (a prerelease is before its core). */
export function isAtOrPast(version, removeIn) {
  const parse = (v) => {
    const [core, pre] = String(v).split('-');
    return { nums: core.split('.').map((n) => Number.parseInt(n, 10) || 0), pre: Boolean(pre) };
  };
  const a = parse(version);
  const b = parse(removeIn);
  for (let i = 0; i < 3; i++) {
    if ((a.nums[i] ?? 0) !== (b.nums[i] ?? 0)) return (a.nums[i] ?? 0) > (b.nums[i] ?? 0);
  }
  return !a.pre || b.pre;
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag imports of @hirobius/design-system exports removed in the installed version.',
    },
    schema: [
      {
        type: 'object',
        properties: { version: { type: 'string' } },
        additionalProperties: false,
      },
    ],
    messages: {
      removed:
        '{{name}} is removed in {{removeIn}} and @hirobius/design-system {{version}} is installed.{{instead}}',
    },
  },
  create(context) {
    const version = context.options[0]?.version ?? INSTALLED;
    if (!version) return {};
    return {
      ImportDeclaration(node) {
        if (typeof node.source.value !== 'string' || !isHds(node.source.value)) return;
        for (const spec of node.specifiers) {
          if (spec.type !== 'ImportSpecifier') continue;
          const name =
            spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value;
          const d = byName.get(name);
          if (!d || !isAtOrPast(version, d.removeIn)) continue;
          context.report({
            node: spec,
            messageId: 'removed',
            data: {
              name,
              removeIn: d.removeIn,
              version,
              instead: d.useInstead ? ` Use ${d.useInstead}.` : '',
            },
          });
        }
      },
    };
  },
};

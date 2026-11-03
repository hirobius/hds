/**
 * hds/no-removed-import (hds#469)
 *
 * Errors on an import of a @hirobius/design-system export whose `@removeIn`
 * version the installed package has reached: the export is gone (or about to
 * be), so the build would break. Below removeIn, hds/no-deprecated-import
 * warns instead. Reads deprecated-exports.json and the installed package's
 * own version (the package.json three levels up, where this file ships);
 * the `version` option overrides it.
 *
 * It also reads the shipped record at the package root (deprecations.json,
 * the `./deprecations.json` subpath): an import naming a name that record's
 * `removed` list took away at this entry point errors once the installed
 * version reaches the release that removed it (StatusDot, removed in
 * 0.21.0, is the fixture). An install too old to ship the record simply
 * gets the deprecated-exports half.
 */
import { readFileSync } from 'node:fs';

const { exports: DEPRECATED } = JSON.parse(
  readFileSync(new URL('./deprecated-exports.json', import.meta.url), 'utf8'),
);
const byName = new Map(DEPRECATED.filter((d) => d.removeIn).map((d) => [d.name, d]));

function shippedRemoved() {
  try {
    const { removed } = JSON.parse(
      readFileSync(new URL('../../../deprecations.json', import.meta.url), 'utf8'),
    );
    return Array.isArray(removed) ? removed : [];
  } catch {
    return [];
  }
}
const removedByKey = new Map(shippedRemoved().map((r) => [`${r.from} ${r.name}`, r]));
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
          if (d) {
            if (!isAtOrPast(version, d.removeIn)) continue;
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
            continue;
          }
          const r = removedByKey.get(`${node.source.value} ${name}`);
          if (!r || !isAtOrPast(version, r.removedIn)) continue;
          context.report({
            node: spec,
            messageId: 'removed',
            data: { name, removeIn: r.removedIn, version, instead: '' },
          });
        }
      },
    };
  },
};

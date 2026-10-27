/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * upgrade-digest.mjs — the upgrade text agents read (hds#463), projected from
 * the upgrade record (upgrade/releases/*.json and upgrade/index.json, hds#451):
 * the old name → replacement → release table and the deprecated names. Shared
 * by generate-llms-txt (the "Upgrading" section and public/llms/upgrade.txt)
 * and generate-consumer-skill.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PKG, UPGRADE_COMMAND } from './version-stamp.mjs';

const REMOVING = new Set(['removed', 'moved', 'renamed', 'folded']);

const cell = (s) => s.replace(/\|/g, '\\|');

/** The step's subject: `0.20.0/moved/AssetImg` → `AssetImg`. */
const subjectOf = (step) => step.id.split('/').slice(2).join('/');

/**
 * What to use instead, read from the step: the /patterns subpath for a moved
 * name, nothing for a name with no drop-in replacement, the `; use <x>` clause
 * of its sentence, else the sentence itself.
 */
export function replacementOf(step, name) {
  if (step.kind === 'moved') return `\`${name}\` from \`${PKG}/patterns\``;
  if (/no drop-in replacement/.test(step.plain)) return 'nothing: rewrite or delete the code';
  const m = /(?:^|[;,] )use (.+)$/.exec(step.plain);
  if (!m) return cell(step.plain);
  const use = m[1]
    .replace(/\.$/, '')
    .replace(/, the same component under its bare name$/, '')
    .replace(/ for the \w+ (?:lightest |darkest )?accent step$/, '')
    .replace(/ instead$/, '');
  return cell(use);
}

const byVersion = (a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
};

function ledgers(root) {
  const dir = join(root, 'upgrade/releases');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
    .sort((a, b) => byVersion(a.version, b.version));
}

/** [{ old, replacement, release }] for every name a release removed, moved, renamed or folded. */
export function removedNameRows(root) {
  const rows = [];
  for (const ledger of ledgers(root)) {
    const steps = ledger.steps.filter((s) => REMOVING.has(s.kind));
    for (const step of steps.sort((a, b) => (subjectOf(a) < subjectOf(b) ? -1 : 1))) {
      const old = subjectOf(step);
      rows.push({ old, replacement: replacementOf(step, old), release: ledger.version });
    }
  }
  return rows;
}

/**
 * A deprecated token, which agent docs never name (agent-docs-no-deprecated-tokens,
 * hidden-delight-tokens): an agent copies what it is shown. The lint owns them.
 */
const isToken = (d, step) => !!step?.detect?.cssVars || /^(?:primitive|semantic)[-.]/.test(d.name);

export const DEPRECATED_TOKENS_NOTE =
  'Deprecated design tokens are not listed: the `hds/no-deprecated-token` lint rule flags each use and names its replacement.';

/** [{ name, removeIn, plain }] for every deprecated name still shipped (upgrade/index.json), tokens aside. */
export function deprecatedRows(root) {
  const index = JSON.parse(readFileSync(join(root, 'upgrade/index.json'), 'utf8'));
  const steps = new Map(ledgers(root).flatMap((l) => l.steps.map((s) => [s.id, s])));
  return (index.deprecated ?? [])
    .filter((d) => !isToken(d, steps.get(d.step)))
    .map((d) => ({
      name: d.name,
      removeIn: d.removeIn,
      plain: steps.get(d.step)?.plain ?? '',
    }));
}

/** One line per deprecation; names that share a step sentence share a line. */
export function deprecatedLines(rows) {
  const groups = new Map();
  for (const d of rows) {
    const key = `${d.removeIn}\n${d.plain}`;
    if (!groups.has(key)) groups.set(key, { ...d, names: [] });
    groups.get(key).names.push(`\`${d.name}\``);
  }
  return [...groups.values()].map((g) =>
    `- ${g.names.join(', ')} (removed in ${g.removeIn}): ${g.plain}`.trimEnd(),
  );
}

/** The `## Upgrading` and `## Deprecated` sections of llms-full.txt and the upgrade slice. */
export function upgradeMarkdown(root, version) {
  const rows = removedNameRows(root);
  const deprecated = deprecatedRows(root);
  return `## Upgrading

This text describes ${PKG} ${version}. To move a project to the newest release, run \`${UPGRADE_COMMAND}\` from its root: it runs the codemods, bumps the dependency, installs, typechecks, and lists what is left to do by hand. \`${UPGRADE_COMMAND} --check\` changes nothing and exits 1 while work is left. It also refreshes the \`hds-consumer\` skill when the project has a \`.claude/skills/\` folder. The full guide is \`UPGRADING.md\`; the machine-readable record is \`upgrade/index.json\`.

Every name a release removed, moved or renamed, and what to use instead:

| Old name | Use instead | Release |
| --- | --- | --- |
${rows.map((r) => `| \`${r.old}\` | ${r.replacement} | ${r.release} |`).join('\n')}

## Deprecated: do not use in new code

Still exported, but on the way out: do not write new code with them.

${deprecatedLines(deprecated).join('\n')}

${DEPRECATED_TOKENS_NOTE}
`;
}

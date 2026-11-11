#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Fails when a layer in the HDS Figma library, outside the Archive and
 * Deprecated pages, uses a deprecated text style or variable (hds#483).
 *
 * PR #1463 applied typography/eyebrow (deprecated: use typography/caption) to
 * four AppShell texts. CI cannot read Figma, so this reads the committed record
 * figma/deprecated-usage.json, written by `pnpm figma:deprecated-usage --ingest`
 * from the read-only audit figma/reads/deprecated-usage.js. "Deprecated" comes
 * from the tokens' $deprecated notes (scripts/lib/figma-deprecated-styles.mjs).
 *
 * Fails on: a recorded hit; no record; a record that audited other styles than
 * code deprecates now (a new deprecation needs a fresh audit); an audit script
 * that is not what the inputs build now.
 *
 * Runs in pretest and in `pnpm release` after check:figma-release.
 * Exit 0 clean · 1 refused. Never talks to Figma.
 *
 * Usage: node scripts/check-figma-deprecated-usage.mjs
 */
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deprecatedTextStyles } from './lib/figma-deprecated-styles.mjs';
import { buildAuditScript, RECORD_PATH, SCRIPT_PATH } from './figma-deprecated-usage.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RERUN =
  'Fix: pnpm figma:deprecated-usage, run figma/reads/deprecated-usage.js with use_figma on the library, then pnpm figma:deprecated-usage --ingest <file> (runbook: figma/README.md, "Deprecated styles").';

/** @returns {{ exitCode: 0|1, output: string }} */
export function runDeprecatedUsageCheck({ root }) {
  const problems = [];
  const scriptPath = join(root, SCRIPT_PATH);
  // The TARGETS line, not the whole text: a test runner rewrites Function#toString.
  const targets = buildAuditScript(root)
    .split('\n')
    .find((l) => l.startsWith('const TARGETS = '));
  if (!existsSync(scriptPath) || !readFileSync(scriptPath, 'utf8').split('\n').includes(targets))
    problems.push(`${SCRIPT_PATH} is stale (the deprecations or snapshot ids changed).`);
  const recordPath = join(root, RECORD_PATH);
  if (!existsSync(recordPath)) {
    problems.push(`there is no ${RECORD_PATH}, so deprecated usage in Figma is unmeasured.`);
  } else {
    const record = JSON.parse(readFileSync(recordPath, 'utf8'));
    const tree = JSON.parse(readFileSync(join(root, 'hirobius.tokens.json'), 'utf8'));
    const deprecated = deprecatedTextStyles(tree);
    const want = deprecated.map((d) => d.style).sort();
    if (JSON.stringify(record.styles) !== JSON.stringify(want))
      problems.push(
        `${RECORD_PATH} audited ${JSON.stringify(record.styles)} but code deprecates ${JSON.stringify(want)}.`,
      );
    const use = new Map(deprecated.map((d) => [d.style, d.replacementStyle]));
    for (const h of record.hits ?? [])
      problems.push(
        `"${h.name}" (${h.id}) on page "${h.page}" uses deprecated ${h.kind === 'textStyle' ? 'text style' : 'variable'} ${h.target}${use.get(h.target) ? `: apply ${use.get(h.target)}` : ''}.`,
      );
  }
  if (!problems.length)
    return {
      exitCode: 0,
      output:
        '✓ check-figma-deprecated-usage — no library layer uses a deprecated style or variable',
    };
  return {
    exitCode: 1,
    output: `✗ check-figma-deprecated-usage:\n- ${problems.join('\n- ')}\n${RERUN}`,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { exitCode, output } = runDeprecatedUsageCheck({ root: ROOT });
  (exitCode === 0 ? console.log : console.error)(output);
  process.exit(exitCode);
}

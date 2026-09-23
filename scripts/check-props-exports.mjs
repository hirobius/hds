#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-props-exports — can a consumer name the props of every component we
 * publish?
 *
 * `src/index.ts` re-exports each public component module with `export *`, so a
 * props type ships iff its module exports it. 41 of them did not, which made
 * the single most ordinary thing a consumer writes,
 *
 *   const Wrapped = (props: AlertProps) => <Alert {...props} />;
 *
 * impossible without `React.ComponentProps<typeof Alert>` or a hand-restated
 * shape. Nothing in the build saw it: `tsc` is satisfied because the type is
 * in scope inside the module, the component renders fine, and every test here
 * imports from `src/`, where the barrel is irrelevant. Only a consumer's
 * editor showed it — which is the failure mode this gate exists to end.
 *
 * The rule is reachability, not the `Props` suffix: a locally declared type
 * must be exported iff it annotates the props of a component the module
 * exports (directly, via a trailing `export { … }`, or through an
 * `Object.assign` compound). That leaves the cva `VariantProps` aliases,
 * composition bases, union arms, cast targets, and private sub-components'
 * props alone — see scripts/lib/props-exports.mjs for why each one stays
 * private.
 *
 * Reads `src/`, so it is cheap and runs pre-commit alongside the other source
 * gates. No build required.
 *
 * Usage: node scripts/check-props-exports.mjs
 * Exit codes: 0 = every reachable props type is exported, 1 = at least one is not.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { violationsInRepo } from './lib/props-exports.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const { violations, unresolved, scanned } = violationsInRepo(ROOT);

  if (unresolved.length > 0) {
    console.error(
      `check-props-exports — ${unresolved.length} re-export in src/index.ts resolved to no file:\n` +
        unresolved.map((s) => `  ${s}`).join('\n') +
        '\n  The barrel points at something that is not there; fix that first.',
    );
    process.exit(1);
  }

  if (scanned === 0) {
    console.error(
      'check-props-exports: src/index.ts re-exported no modules — the barrel is empty or its\n' +
        '  shape changed. This gate would pass vacuously, so it fails instead.',
    );
    process.exit(1);
  }

  if (violations.length > 0) {
    console.error(
      `check-props-exports — ${violations.length} props type(s) a consumer cannot name.\n` +
        `Each one annotates an exported component, so it is already part of the API in\n` +
        `everything but the keyword. Add \`export\` to the declaration:\n` +
        violations.map((v) => `  ${v.file}:${v.line}  ${v.component} → ${v.type}`).join('\n'),
    );
    process.exit(1);
  }

  console.log(
    `check-props-exports — OK: every props type reachable from the public barrel is exported ` +
      `(${scanned} modules scanned)`,
  );
}

main();

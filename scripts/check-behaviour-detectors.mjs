#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Behaviour detectors (hds#468): runs, as one local gate, the DOM and accessibility baseline (roles, accessible names, states and data-* per docs demo against docs/baselines/dom-a11y.json), the SSR hydration-mismatch gate (renderToString then hydrateRoot, failing on recoverable errors and hydration warnings) and the console budget (any console.warn/error code not in docs/guardrails/baselines/console-allowlist.json fails), each with its fixture proof.
 *
 * The baselines are ratchets: they regenerate deterministically and a diff
 * needs an upgrade step (behavior step for DOM changes, ledger entry for a
 * new console code). Regenerate with `pnpm dom:baseline` or
 * HDS_UPDATE_CONSOLE_ALLOWLIST=1.
 *
 * Usage: pnpm check:behaviour
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const BEHAVIOUR_DETECTORS = [
  {
    id: 'dom-a11y',
    test: 'tests/dom-a11y-baseline.test.tsx',
    baseline: 'docs/baselines/dom-a11y.json',
  },
  { id: 'hydration-fixture', test: 'tests/hydration-gate.test.tsx' },
  { id: 'hydration-demos', test: 'tests/docs-site/demos-hydrate.test.tsx' },
  { id: 'console-fixture', test: 'tests/console-budget.test.tsx' },
  {
    id: 'console-demos',
    test: 'tests/docs-site/console-budget.test.tsx',
    baseline: 'docs/guardrails/baselines/console-allowlist.json',
  },
];

export function vitestArgs() {
  return ['exec', 'vitest', 'run', ...BEHAVIOUR_DETECTORS.map((d) => d.test)];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = spawnSync('pnpm', vitestArgs(), { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(
      '✗ check-behaviour-detectors — a DOM/a11y, hydration or console budget gate failed (see above).',
    );
    process.exit(r.status ?? 1);
  }
  console.log(
    '✓ check-behaviour-detectors — DOM/a11y baseline, hydration and console budget green.',
  );
}

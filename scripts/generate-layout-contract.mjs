#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Regenerates docs/guardrails/layout-contract.json from the manifest component
 * list plus the hand-set tables in scripts/lib/layout-contract.mjs. Edit the
 * tables, never the JSON. `--check` exits 1 when the file is stale; `--root
 * <dir>` reads and writes a copy of the tree instead (tests).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContract, validateContract } from './lib/layout-contract.mjs';
import { rootFromArgv, runGenerator } from './lib/generated-check.mjs';

const CONTRACT_PATH = 'docs/guardrails/layout-contract.json';

/** `{ path: text }` for the contract of `root`'s manifest, or the problems that block it. */
function buildLayoutContract(root) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'public/hds-manifest.json'), 'utf8'));
  const contract = buildContract(manifest.componentInventory);
  return {
    problems: validateContract(contract),
    outputs: { [CONTRACT_PATH]: JSON.stringify(contract, null, 2) + '\n' },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = rootFromArgv(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const { problems, outputs } = buildLayoutContract(root);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exitCode = 2;
  } else {
    await runGenerator({
      root,
      outputs,
      label: 'layout-contract',
      fix: 'pnpm layout-contract:generate',
    });
  }
}

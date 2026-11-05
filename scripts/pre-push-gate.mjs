#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * pre-push-gate.mjs — runs the tier of the pre-push gate this branch needs.
 * Tier rule: scripts/lib/gate-tier.mjs. Force the full gate and whole suite: HDS_FULL_GATE=1 git push.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { classifyGateTier, planGate } from './lib/gate-tier.mjs';

const git = (...a) =>
  execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

let files = null;
try {
  const base = git('merge-base', 'HEAD', 'origin/main').trim();
  files = git('diff', '--name-only', `${base}...HEAD`).split('\n').filter(Boolean);
} catch {
  /* unknown diff → full */
}

const { tier, reason } = classifyGateTier(files, process.env);
const cmds = planGate(
  tier,
  (files ?? []).filter((f) => existsSync(f)),
  process.env,
);
console.log(`pre-push gate: ${tier} tier (${reason})${cmds.length ? '' : ' — no tests to run'}`);
for (const cmd of cmds) {
  console.log(`$ ${cmd}`);
  const r = spawnSync('sh', ['-c', cmd], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

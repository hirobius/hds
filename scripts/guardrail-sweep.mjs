#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * guardrail-sweep.mjs — run every registered gate once and report what happens.
 *
 *   pnpm guardrail:sweep              human-readable table
 *   pnpm guardrail:sweep --json       machine-readable, for a dashboard
 *   pnpm guardrail:sweep --strict     also exit 1 on any FAIL or NO-DATA
 *   pnpm guardrail:sweep --channel manual   only gates on that channel
 *
 * WHY. 37 of 54 gates fire only when someone types the command, so "is this
 * gate green?" has no answer between the times somebody asks. The registry used
 * to claim an answer via `lastFiringAt`, which measured one gate and backfilled
 * the other 53 — it asserted health it had never observed and nearly justified
 * deleting eight working gates. ADR-027 removed it. This is the replacement:
 * no background collection, no stored claim, just run them and say what you saw.
 *
 * Two things only a full sweep can observe, both reported:
 *   - which gates REWRITE the working tree (they cannot go on pre-commit as-is)
 *   - which are too slow for a commit hook
 *
 * Exit code: 0 normally, even with violations — a sweep is a report, and 15 red
 * gates is the finding rather than an error in the measurement. 1 when a gate
 * could not run at all, or under --strict when anything is actionable.
 *
 * @module guardrail-sweep
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  classifyVerdict,
  summarize,
  exitCodeFor,
  gateArgv,
  ACTIONABLE,
} from './lib/guardrail-sweep.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = path.join(ROOT, 'docs/guardrails/registry.json');
const TIMEOUT_MS = 180_000;

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const strict = argv.includes('--strict');
const channel = argv.includes('--channel') ? argv[argv.indexOf('--channel') + 1] : null;

const git = (...args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
const treeStatus = () => git('status', '--porcelain').stdout.trim();

// A dirty tree before the sweep makes "did this gate dirty the tree?"
// unanswerable, and several gates regenerate tracked files. Refuse rather than
// misattribute — or worse, clean up changes that were the user's.
const before = treeStatus();
if (before) {
  console.error(
    '✗ guardrail:sweep — the working tree is dirty. This sweep reports which gates rewrite\n' +
      '  tracked files and restores the tree between gates, so it refuses to run over\n' +
      '  uncommitted work. Commit or stash first.\n\n' +
      before
        .split('\n')
        .slice(0, 10)
        .map((l) => `  ${l}`)
        .join('\n'),
  );
  process.exit(2);
}

const gates = JSON.parse(readFileSync(REGISTRY, 'utf8')).gates.filter(
  (g) => !channel || g.firingChannel === channel,
);

if (gates.length === 0) {
  console.error(`✗ guardrail:sweep — no gates on channel '${channel}'`);
  process.exit(2);
}

const results = [];

for (const [i, gate] of gates.entries()) {
  const started = Date.now();
  const run = spawnSync('node', gateArgv(gate), {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 32 * 1024 * 1024,
  });
  const durationMs = Date.now() - started;

  const dirty = Boolean(treeStatus());
  if (dirty) {
    // Restore so the next gate starts clean and the dirt is attributed to the
    // gate that caused it. Safe because the tree was verified clean at startup.
    git('checkout', '--', '.');
    git('clean', '-fdq');
  }

  const verdict = classifyVerdict(run);
  const output = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.trim();

  results.push({
    id: gate.id,
    channel: gate.firingChannel,
    severity: gate.severity,
    verdict,
    exitCode: run.status,
    durationMs,
    dirtiesTree: dirty,
    tail: output.split('\n').filter(Boolean).slice(-3).join(' | ').slice(0, 300),
  });

  if (!asJson) {
    process.stdout.write(
      `${String(i + 1).padStart(2)}/${gates.length}  ${verdict.padEnd(8)}` +
        `${gate.id.padEnd(36)}${String(durationMs).padStart(7)}ms` +
        `${dirty ? '  [rewrites tree]' : ''}\n`,
    );
  }
}

const summary = summarize(results);

if (asJson) {
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), summary, results }, null, 2));
  process.exit(exitCodeFor(summary, { strict }));
}

console.log(`\n${'─'.repeat(64)}`);
console.log(
  Object.entries(summary.byVerdict)
    .map(([k, v]) => `${k} ${v}`)
    .join(' · '),
);

const actionable = results.filter((r) => ACTIONABLE.includes(r.verdict));
if (actionable.length) {
  console.log(`\nNeeds a human (${actionable.length}):`);
  for (const r of actionable) {
    console.log(`  ${r.verdict.padEnd(8)} ${r.id.padEnd(34)} [${r.channel} · ${r.severity}]`);
    if (r.tail) console.log(`           ${r.tail.replace(/\s+/g, ' ').slice(0, 150)}`);
  }
}

if (summary.dirtiesTree.length) {
  console.log(
    `\nRewrites the working tree (cannot be wired to pre-commit as-is): ${summary.dirtiesTree.join(', ')}`,
  );
}
if (summary.slow.length) {
  console.log(`Too slow for a commit hook (>10s): ${summary.slow.join(', ')}`);
}

process.exit(exitCodeFor(summary, { strict }));

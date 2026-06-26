#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * scripts/loop/loop-cli.mjs — operator entry point for the HDS autonomous loop.
 *
 *   node scripts/loop/loop-cli.mjs validate [--json]   verifier-contract check (exit 1 on violation)
 *   node scripts/loop/loop-cli.mjs next [--json]        print the next dispatchable unit (or null)
 *   node scripts/loop/loop-cli.mjs status               status-count summary
 *   node scripts/loop/loop-cli.mjs claim <id>           backlog → claimed (bumps attempts)
 *   node scripts/loop/loop-cli.mjs done <id>            claimed → done
 *   node scripts/loop/loop-cli.mjs park <id> [reason]   claimed → parked
 *
 * `validate` is wired to `pnpm loop:validate` and is the gate the loop runner
 * (and any human) runs before dispatch. The mutating verbs are how an agent (or
 * the Workflow runner) records state transitions atomically.
 */

import {
  loadOrchestration,
  loadRegistryGateIds,
  saveOrchestration,
  validateContract,
  selectNextUnit,
  applyTransition,
  summarize,
} from './orchestration-lib.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const json = rest.includes('--json') || process.argv.includes('--json');
const positional = rest.filter((a) => !a.startsWith('--'));

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const gateIds = loadRegistryGateIds();
const orch = loadOrchestration();

switch (cmd) {
  case 'validate': {
    const { ok, violations } = validateContract(orch, gateIds);
    if (json) {
      console.log(JSON.stringify({ ok, violations }, null, 2));
    } else if (ok) {
      console.log(`✓ loop:validate — ${orch.units.length} unit(s), verifier contract satisfied.`);
    } else {
      console.error('✗ loop:validate — verifier-contract violation(s):');
      for (const v of violations) console.error(`  - ${v.id}: ${v.reason}`);
    }
    process.exit(ok ? 0 : 1);
    break;
  }
  case 'next': {
    const result = selectNextUnit(orch, gateIds);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
    break;
  }
  case 'status': {
    const { total, counts } = summarize(orch);
    if (json) {
      console.log(JSON.stringify({ total, counts }, null, 2));
    } else {
      console.log(`HDS loop backlog — ${total} unit(s):`);
      for (const [s, n] of Object.entries(counts)) if (n) console.log(`  ${s.padEnd(11)} ${n}`);
    }
    process.exit(0);
    break;
  }
  case 'claim': {
    const id = positional[0];
    if (!id) fail('claim: <id> required');
    const target = orch.units.find((u) => u.id === id);
    if (!target) fail(`claim: unknown unit '${id}'`);
    const next = applyTransition(orch, id, 'claimed', { attempts: (target.attempts ?? 0) + 1 });
    saveOrchestration(next);
    console.log(`✓ claimed ${id} (attempt ${(target.attempts ?? 0) + 1})`);
    break;
  }
  case 'done': {
    const id = positional[0];
    if (!id) fail('done: <id> required');
    saveOrchestration(applyTransition(orch, id, 'done', { lastResult: 'pass' }));
    console.log(`✓ done ${id}`);
    break;
  }
  case 'park': {
    const id = positional[0];
    if (!id) fail('park: <id> required');
    const reason = positional.slice(1).join(' ') || 'parked by loop';
    saveOrchestration(
      applyTransition(orch, id, 'parked', { lastResult: 'fail', lastNote: reason }),
    );
    console.log(`⏸ parked ${id} — ${reason}`);
    break;
  }
  default:
    console.error('usage: loop-cli.mjs <validate|next|status|claim|done|park> [id] [--json]');
    process.exit(2);
}

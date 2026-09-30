/** @internal — pure helpers for scripts/check-status-claims.mjs (hds#343). */
/**
 * Keeps the two hand-visible surfaces of the consistency figures (root
 * status.json `consistency` object and the README "Agent consistency" line)
 * from drifting away from the latest eval/consistency/ledger.json entry.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { consistencyFromEntry, latestEntry, readLedger, summaryLine } from './ledger.mjs';

/** @returns {{ok:boolean, drift:{field:string,status:unknown,ledger:unknown}[]}} */
export function compareStatus(status, entry) {
  const expected = consistencyFromEntry(entry);
  if (!status || typeof status !== 'object') {
    return {
      ok: false,
      drift: [{ field: 'consistency', status: status ?? null, ledger: expected }],
    };
  }
  const drift = Object.keys(expected)
    .filter((field) => status[field] !== expected[field])
    .map((field) => ({ field, status: status[field], ledger: expected[field] }));
  return { ok: drift.length === 0, drift };
}

/** @returns {{ok:boolean, problems:string[]}} */
export function checkSurfaces({ status, readme, ledger }) {
  const entry = latestEntry(ledger);
  if (!entry) return { ok: false, problems: ['ledger has no entries'] };
  const problems = [];
  for (const d of compareStatus(status, entry).drift) {
    problems.push(
      `status.json consistency.${d.field}: status.json has ${JSON.stringify(d.status)}, ledger has ${JSON.stringify(d.ledger)}`,
    );
  }
  const line = summaryLine(entry);
  if (!readme.split('\n').some((l) => l.trim() === line)) {
    problems.push(
      `README.md is missing the current "Agent consistency" line; expected exactly: ${line}`,
    );
  }
  return { ok: problems.length === 0, problems };
}

/** Read status.json, README.md and the ledger under `root` and check them. */
export function checkRepo(root) {
  const status = JSON.parse(readFileSync(path.join(root, 'status.json'), 'utf8')).consistency;
  const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
  const ledger = readLedger(path.join(root, 'eval/consistency/ledger.json'));
  return checkSurfaces({ status, readme, ledger });
}

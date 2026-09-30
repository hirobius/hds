#!/usr/bin/env node
/**
 * Caps the history arrays of status.json to their 10 newest entries.
 *
 * Only HISTORY_KEYS are capped. `next` is the live work queue and `blocked`
 * is the live blocker list, so they are never cut: an item that leaves them
 * is done or re-ticketed, not aged out. status.json lists newest first, so
 * "newest" means the head of each array. The fleet dashboard reads only the
 * top-level fields, so history beyond the cap lives in git.
 * Run: node scripts/cap-status-json.mjs [--keep N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_KEEP = 10;
export const HISTORY_KEYS = ['resolvedThisSession'];

export function capStatus(status, keep = DEFAULT_KEEP) {
  const out = {};
  for (const [key, value] of Object.entries(status)) {
    out[key] = HISTORY_KEYS.includes(key) && Array.isArray(value) ? value.slice(0, keep) : value;
  }
  return out;
}

function main() {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'status.json');
  const flag = process.argv.indexOf('--keep');
  const keep = flag > -1 ? Number(process.argv[flag + 1]) : DEFAULT_KEEP;
  if (!Number.isInteger(keep) || keep < 1) {
    console.error('cap-status-json: --keep needs a positive integer');
    process.exit(1);
  }
  const before = JSON.parse(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, JSON.stringify(capStatus(before, keep), null, 2) + '\n');
  console.log(`cap-status-json: kept up to ${keep} entries in ${HISTORY_KEYS.join(', ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

#!/usr/bin/env node
/** @internal — guardrail gate, channel: commit-msg. */
/**
 * scripts/check-learned-trailer.mjs (ops#612)
 *
 * Every fix:/revert: commit feeds the lessons ledger: it must carry a
 * `Learned: <one line>` trailer. `Learned: none` is allowed (and counted by
 * the harvester). feat: and every other type are untouched; merges skip.
 *
 * Wired from .husky/commit-msg as: node scripts/check-learned-trailer.mjs "$1"
 * Fixture mode: FIXTURE_FILE=<path> reads the message from that file.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REQUIRED = /^(fix|revert)(\([^)]*\))?!?:/i;

export function checkLearnedTrailer(message) {
  const lines = String(message)
    .split(/\r?\n/)
    .filter((l) => !l.startsWith('#'));
  const subject = (lines[0] || '').trim();
  if (/^Merge /.test(subject) || !REQUIRED.test(subject)) {
    return { ok: true, required: false, learned: null, none: false };
  }
  let learned = null;
  for (const l of lines.slice(1)) {
    const m = /^Learned:\s*(.*)$/i.exec(l.trim());
    if (m && m[1].trim()) learned = m[1].trim();
  }
  return { ok: learned !== null, required: true, learned, none: /^none\.?$/i.test(learned || '') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv.slice(2).find((a) => !a.startsWith('--')) || process.env.FIXTURE_FILE;
  if (!file) {
    console.error('usage: check-learned-trailer.mjs <commit-msg-file>');
    process.exit(2);
  }
  const r = checkLearnedTrailer(readFileSync(file, 'utf8'));
  if (!r.ok) {
    console.error(
      '✗ fix:/revert: commits need a "Learned: <one line>" trailer (ops#612).\n' +
        '  Add a last line like:  Learned: validate input at the API seam\n' +
        '  Nothing to learn? Use:  Learned: none',
    );
    process.exit(1);
  }
}

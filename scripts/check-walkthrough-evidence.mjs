#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * check-walkthrough-evidence.mjs
 *
 * hds#1148 — committed walkthrough media must have been recorded with every
 * gate green. The video's captions say Figma matches code and the release gate
 * passes, and its panels show that output live; a recording made with
 * `pnpm walkthrough:record --allow-red` (or with a gate red) would contradict
 * its own captions. scripts/walkthrough/record.mjs writes
 * docs-site/public/walkthrough/walkthrough.evidence.json beside the media:
 * { recordedAt, commit, allowRed, gates: { <name>: exitCode }, files: { <name>: sha256 } }.
 *
 * Fails when media exists and the evidence file is missing or not JSON, says
 * allowRed, lists a gate with a non-zero exit code, lists no gates, or its
 * hashes do not match the media files (a swapped or re-encoded file, or one it
 * does not list). No media folder passes. Reads files only: no build, no
 * network, no browser.
 *
 * Usage: node scripts/check-walkthrough-evidence.mjs [--json]
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EVIDENCE_FILE = 'walkthrough.evidence.json';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA_DIR = path.join(ROOT, 'docs-site', 'public', 'walkthrough');

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

/**
 * Write the evidence file for the media now in `dir` (record.mjs calls this
 * after encoding), so the format lives beside the check that reads it.
 * @param {string} dir
 * @param {{ commit: string, allowRed: boolean, gates: Record<string, number>, note?: string, recordedAt?: string }} facts
 */
export function writeWalkthroughEvidence(dir, { commit, allowRed, gates, note, recordedAt }) {
  const media = readdirSync(dir)
    .filter((f) => f !== EVIDENCE_FILE && !f.startsWith('.'))
    .sort();
  const evidence = {
    recordedAt: recordedAt ?? new Date().toISOString(),
    commit,
    allowRed,
    gates,
    files: Object.fromEntries(media.map((f) => [f, sha256(path.join(dir, f))])),
    ...(note ? { note } : {}),
  };
  writeFileSync(path.join(dir, EVIDENCE_FILE), `${JSON.stringify(evidence, null, 2)}\n`);
  return evidence;
}

/** Problems with the media in `dir`, as one line each; [] when it is clean. */
export function checkWalkthroughEvidence(dir = MEDIA_DIR) {
  if (!existsSync(dir)) return [];
  const media = readdirSync(dir).filter((f) => f !== EVIDENCE_FILE && !f.startsWith('.'));
  if (!media.length) return [];
  const evidencePath = path.join(dir, EVIDENCE_FILE);
  if (!existsSync(evidencePath)) {
    return [`media is committed with no ${EVIDENCE_FILE}: re-record with pnpm walkthrough:record`];
  }
  let ev;
  try {
    ev = JSON.parse(readFileSync(evidencePath, 'utf8'));
  } catch {
    return [`${EVIDENCE_FILE} is not valid JSON`];
  }
  const problems = [];
  if (ev.allowRed !== false) {
    problems.push('recorded with --allow-red: the panels may contradict the captions');
  }
  const gates = Object.entries(ev.gates ?? {});
  if (!gates.length) problems.push(`${EVIDENCE_FILE} lists no gates`);
  for (const [name, code] of gates) {
    if (code !== 0) problems.push(`recorded while ${name} exited ${code}`);
  }
  const listed = ev.files ?? {};
  for (const f of media) {
    if (!(f in listed)) problems.push(`${f} is not in ${EVIDENCE_FILE}`);
    else if (listed[f] !== sha256(path.join(dir, f))) {
      problems.push(`${f} does not match the hash in ${EVIDENCE_FILE} (changed after recording)`);
    }
  }
  for (const f of Object.keys(listed)) {
    if (!media.includes(f)) problems.push(`${f} is in ${EVIDENCE_FILE} but missing`);
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkWalkthroughEvidence();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ gate: 'check-walkthrough-evidence', problems }, null, 2));
  } else if (problems.length) {
    console.error(`✗ check-walkthrough-evidence — ${problems.length} problem(s) (hds#1148):`);
    for (const p of problems) console.error(`  ${p}`);
    console.error(
      '  Fix: re-record when both Figma gates are green (scripts/walkthrough/README.md).',
    );
  } else {
    console.log(
      '[ok] check-walkthrough-evidence — walkthrough media was recorded with every gate green',
    );
  }
  process.exit(problems.length ? 1 : 0);
}

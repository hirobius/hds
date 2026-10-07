#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * status-fold.mjs — `pnpm status:fold`: fold pending .status/*.md notes into
 * root status.json. PRs add a note (unique filename, never conflicts) instead
 * of bumping status.json; this runs once, serially, on main at session end:
 * it sets updatedAt to now, deletes the notes and prints their text so the
 * folder can update headline/next/blocked by hand if they changed.
 */
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { touchStatusText } from './status-touch.mjs';

export function foldStatus(statusText, notes, now = new Date()) {
  if (notes.length === 0) return { text: statusText, notes: [] };
  return { text: touchStatusText(statusText, now), notes: notes.map((n) => n.body.trim()) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dir = path.join(root, '.status');
  const files = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    : [];
  const notes = files.map((name) => ({ name, body: readFileSync(path.join(dir, name), 'utf8') }));
  const file = path.join(root, 'status.json');
  const out = foldStatus(readFileSync(file, 'utf8'), notes);
  if (notes.length === 0) {
    console.log('status:fold — no pending .status/ notes.');
  } else {
    JSON.parse(out.text);
    writeFileSync(file, out.text);
    for (const f of files) rmSync(path.join(dir, f));
    console.log(
      `✓ status.json updatedAt → ${JSON.parse(out.text).updatedAt}; folded ${files.length} note(s):`,
    );
    for (const n of out.notes) console.log(`  - ${n.split('\n')[0]}`);
  }
}

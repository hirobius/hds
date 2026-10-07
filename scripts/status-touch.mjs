#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * status-touch.mjs — `pnpm status:touch`: set root status.json `updatedAt` to
 * now (ISO, Z, seconds precision). Rewrites only that value in place, so the
 * rest of the file's formatting (indent, unicode, trailing newline) is untouched.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function touchStatusText(text, now = new Date()) {
  const stamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  const re = /("updatedAt"\s*:\s*")[^"]*(")/;
  if (!re.test(text)) throw new Error('status.json has no "updatedAt" string field');
  return text.replace(re, `$1${stamp}$2`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'status.json');
  const next = touchStatusText(readFileSync(file, 'utf8'));
  JSON.parse(next);
  writeFileSync(file, next);
  console.log(`✓ status.json updatedAt → ${JSON.parse(next).updatedAt}`);
}

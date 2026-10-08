/**
 * atomic-write — replace a file without ever leaving half of it (hds#452).
 * The text goes to a temp file next to it, which is then renamed over it, so
 * a full disk or a kill partway leaves the old file or the new one, never a
 * truncated one. The file keeps its mode. Node builtins only.
 */
import { chmodSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';

/**
 * @param {string} file
 * @param {string} text
 */
export function writeFileAtomic(file, text) {
  let mode;
  try {
    mode = statSync(file).mode & 0o7777;
  } catch {
    mode = undefined; // a new file: the default mode
  }
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, text);
    if (mode !== undefined) chmodSync(tmp, mode);
    renameSync(tmp, file);
  } finally {
    rmSync(tmp, { force: true });
  }
}

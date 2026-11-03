/**
 * Source-tree scanning shared by the shipped-code guards
 * (no-shipped-import-meta-env, runtime-dependencies), hds#1011.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Drop block and line comments so prose can name what a guard bans without
 * tripping it. Deliberately regex, not a parser: a string literal containing
 * `//` could over-strip, but that only hides a match inside a string, never
 * blocks a legitimate change.
 */
export const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

export interface SourceWalk {
  /** Paths are reported relative to this directory, with `/` separators. */
  root: string;
  /** File names to collect, e.g. /\.(ts|tsx)$/. */
  extensions: RegExp;
  /** Root-relative paths to leave out (tests, templates, ...). */
  isExempt: (rel: string) => boolean;
}

/** Every matching, non-exempt file under `dir`, root-relative, in readdir order. */
export function sourceFiles(dir: string, walk: SourceWalk, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, walk, acc);
      continue;
    }
    if (!walk.extensions.test(entry)) continue;
    const rel = relative(walk.root, full).replaceAll('\\', '/');
    if (!walk.isExempt(rel)) acc.push(rel);
  }
  return acc;
}

#!/usr/bin/env node
/**
 * not-found-pattern codemod (hds#395, hds#389's 2026-10-01 decision update)
 *
 * 0.20.0 removed NotFoundPattern from the package root. It took no props and
 * rendered `<ErrorPattern displayText="404" message="Page not found" />`, so
 * this writes that element in its place, with ErrorPattern imported from
 * `@hirobius/design-system/patterns`:
 *
 *   import { NotFoundPattern } from '@hirobius/design-system';
 *   <NotFoundPattern />
 *
 * becomes
 *
 *   import { ErrorPattern } from '@hirobius/design-system/patterns';
 *   <ErrorPattern displayText="404" message="Page not found" />
 *
 * Other root names stay on the root; ErrorPattern joins an existing `/patterns`
 * import, and a file that already imports ErrorPattern reuses it. An alias stays
 * the file's name (`NotFoundPattern as Missing` becomes `ErrorPattern as
 * Missing`), and so does `NotFoundPattern` when the file binds `ErrorPattern` to
 * something else. Attributes the element already has (`key`) are kept, and so
 * are comments and layout. A tag with a spread, or with a `displayText` or
 * `message` NotFoundPattern ignored, is left for a manual edit, as is any use
 * that is not a JSX tag (codemods/jsx-fold.mjs). Running it twice changes nothing.
 *
 *   node codemods/not-found-pattern.mjs [--root <dir>] [--check] [--dry-run]
 *
 *   --root <dir>  directory to scan (default: current directory)
 *   --check       write nothing; exit 1 while a rewrite is needed or a site needs
 *                 a manual edit (a namespace or dynamic import that reads the
 *                 name, or a file that cannot be read to its end, included)
 *   --dry-run     write nothing; print each changed line before (-) and after (+), exit 0
 */
import { PATTERNS, foldComponent, insertionPoint, isEntry, main, runFold } from './jsx-fold.mjs';

/** @type {import('./jsx-fold.mjs').FoldRule} */
export const RULE = Object.freeze({
  name: 'NotFoundPattern',
  survivor: 'ErrorPattern',
  survivorFrom: PATTERNS,
  rewrite(tag, source) {
    if (tag.attrs.some((a) => a.kind === 'spread'))
      return { manual: 'a spread could carry displayText or message; rewrite it by hand' };
    const set = tag.attrs.find((a) => a.name === 'displayText' || a.name === 'message');
    if (set)
      return {
        manual: `NotFoundPattern ignored ${set.name}, ErrorPattern would render it; rewrite it by hand`,
      };
    const { at, sep } = insertionPoint(source, tag, null);
    return {
      edits: [
        { start: at, end: at, text: `${sep}displayText="404"${sep}message="Page not found"` },
      ],
    };
  },
});

/** Pure transform of one file's source (codemods/jsx-fold.mjs `foldComponent`). */
export function transformSource(source) {
  return foldComponent(source, RULE);
}

/** Scan a directory. Writes only when `write` is true. */
export function runCodemod({ root, write = false }) {
  return runFold({ root, write, rule: RULE });
}

if (isEntry(import.meta.url)) {
  process.exit(main(process.argv.slice(2), { bin: 'hds-not-found-pattern', rule: RULE }));
}

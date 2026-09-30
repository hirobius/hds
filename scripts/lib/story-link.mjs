/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * story-link — joins a component to the stories that exercise it.
 *
 * The manifest is the declared source of truth for inventory, categories and
 * Figma links, and it could not answer "where is Button's story". The link was
 * derivable from source all along, which is worse than missing: 128 of 139
 * components had a story and no tool could say so, so nothing could gate it and
 * an agent looking for an editing target had to grep.
 *
 * Story ids are derived from source rather than read from storybook-static, so
 * this runs with no build and no browser. `deriveStoryId` reimplements
 * Storybook's `toId`, and a test asserts the derivation against the real
 * index.json for every story — if Storybook ever changes the algorithm, that
 * test fails rather than the manifest quietly filling with ids that resolve to
 * nothing.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Every `*.stories.tsx` under `src/`, as repo-relative POSIX paths, sorted.
 *
 * Deliberately NOT `fs.globSync`: that landed in Node 22, this package declares
 * `engines.node >= 20` and CI pins 20, so the first version of this threw
 * "globSync is not a function" in Actions while passing on a dev machine. Three
 * callers had copied the same glob, so the bug shipped three times; they share
 * this instead.
 */
export function findStoryFiles(root, dir = 'src') {
  const found = [];
  const walk = (rel) => {
    let entries;
    try {
      entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true });
    } catch {
      return; // an absent directory yields no stories, which is the honest answer
    }
    for (const entry of entries) {
      const next = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(next);
      else if (entry.name.endsWith('.stories.tsx')) found.push(next);
    }
  };
  walk(dir);
  return found.sort();
}

/** Storybook's `sanitize`: lowercase, non-alphanumerics to a single dash. */
export function sanitize(input) {
  return String(input)
    .toLowerCase()
    .replace(/[ ’'"–—]/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Storybook's `storyNameFromExport`: an export key becomes a display name, so
 * `AllSuccess` -> "All Success" -> `all-success`. Runs of capitals stay together
 * (`CTAPanel` -> "CTA Panel") because that is what startCase does.
 */
export function storyNameFromExport(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
    .trim();
}

export function deriveStoryId(title, exportKey) {
  return `${sanitize(title)}--${sanitize(storyNameFromExport(exportKey))}`;
}

/**
 * The meta title, which is the one at the top of the default-export object.
 * A story's own `args.title` is a different thing entirely and sits deeper in
 * the file, so anchor on the meta declaration rather than the first match.
 */
export function parseMetaTitle(source) {
  const metaStart = /(?:const\s+meta\b|export\s+default\s*\{)/.exec(source);
  if (!metaStart) return null;
  const after = source.slice(metaStart.index);
  const title = /\btitle:\s*['"`]([^'"`]+)['"`]/.exec(after);
  return title ? title[1] : null;
}

/** Export names CSF treats as configuration rather than as stories. */
const NOT_A_STORY = new Set(['default', 'meta', '__namedExportsOrder']);

/**
 * Named exports that are stories.
 *
 * Only exports declared AFTER `export default` count. CSF puts meta first and
 * stories after it, and a file may export a helper component above the meta to
 * use as sample content — code-block.stories.tsx exports StatusChip and
 * ComponentList that way. Storybook does not index those, and collecting them
 * produced two ids that resolve to nothing. The parity test against the real
 * index.json is what caught it.
 */
export function parseStoryExports(source) {
  const defaultExport = /^export\s+default\b/m.exec(source);
  if (!defaultExport) return [];
  const body = source.slice(defaultExport.index);
  const names = [];
  for (const m of body.matchAll(/^export\s+const\s+([A-Za-z_$][\w$]*)\s*[:=]/gm)) {
    if (!NOT_A_STORY.has(m[1])) names.push(m[1]);
  }
  for (const m of body.matchAll(/^export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) {
    if (!NOT_A_STORY.has(m[1])) names.push(m[1]);
  }
  return names;
}

/**
 * Offset of the opening brace of the CSF meta object, or -1. The object is
 * the literal after `export default`, or the `const` a bare `export default name`
 * references (any name, not only `meta`), or a `const meta` when nothing is
 * exported — the same region parseMetaTitle reads.
 */
function metaObjectStart(source) {
  const inline = /\bexport\s+default\s*\{/.exec(source);
  if (inline) return inline.index + inline[0].length - 1;
  const named = /\bexport\s+default\s+([A-Za-z_$][\w$]*)/.exec(source);
  const name = (named ? named[1] : 'meta').replace(/\$/g, '\\$');
  const decl = new RegExp(`\\bconst\\s+${name}\\b[^{;]*\\{`).exec(source);
  return decl ? decl.index + decl[0].length - 1 : -1;
}

/** Index of the closing quote of the string literal that opens at `i`. */
function skipString(source, i) {
  const quote = source[i];
  for (let j = i + 1; j < source.length; j += 1) {
    if (source[j] === '\\') j += 1;
    else if (source[j] === quote) return j;
  }
  return source.length;
}

/**
 * The identifier the CSF meta declares as its subject — `component: X` — read
 * off the top level of the meta object only, or null.
 *
 * A flat regex over the meta region is not enough: `parameters.docs.description`
 * has a `component` key too (prose, two objects deep, and type-specimen declares
 * only that one), and a polymorphic prop under `args` may be called `component` as
 * well. So walk the object literal, skipping strings and comments and tracking
 * depth, and take the key only where it is a top-level property.
 */
export function parseMetaComponent(source) {
  const start = metaObjectStart(source);
  if (start < 0) return null;
  let depth = 0;
  let atKey = false; // right after `{` or `,` at depth 1, where a property name begins
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    const pair = ch + (source[i + 1] ?? '');
    if (pair === '//') {
      const end = source.indexOf('\n', i);
      i = end < 0 ? source.length : end;
    } else if (pair === '/*') {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? source.length : end + 1;
    } else if (ch === "'" || ch === '"' || ch === '`') {
      i = skipString(source, i);
    } else if (ch === '{' || ch === '[' || ch === '(') {
      depth += 1;
      atKey = depth === 1;
    } else if (ch === '}' || ch === ']' || ch === ')') {
      depth -= 1;
      if (depth === 0) return null;
    } else if (depth === 1 && ch === ',') {
      atKey = true;
    } else if (depth === 1 && atKey && !/\s/.test(ch)) {
      const key = /^component\s*:\s*([A-Za-z_$][\w$]*)/.exec(source.slice(i, i + 200));
      if (key) return key[1];
      atKey = false;
    }
  }
  return null;
}

/**
 * One import statement: an optional `type`, the clause (default binding, named
 * braces, namespace, or default + braces), the module specifier.
 */
const IMPORT_STATEMENT =
  /\bimport\s+(type\s+)?((?:[A-Za-z_$][\w$]*\s*,\s*)?(?:\{[^}]*\}|\*\s+as\s+[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*))\s+from\s+['"]([^'"]+)['"]/g;

/**
 * Local binding -> module specifier for every value import, in source order.
 * `import { X as Y }` binds Y; `import X` binds X; type-only imports and inline
 * `type` entries are dropped because a `component:` value has to exist at runtime;
 * namespaces are dropped because `component: NS.X` is not an identifier.
 */
export function parseImportBindings(source) {
  const bindings = new Map();
  for (const [, typeOnly, clause, specifier] of source.matchAll(IMPORT_STATEMENT)) {
    if (typeOnly) continue;
    const brace = clause.indexOf('{');
    const head = (brace === -1 ? clause : clause.slice(0, brace)).replace(',', '').trim();
    if (head && !head.startsWith('*')) bindings.set(head, specifier);
    if (brace === -1) continue;
    for (const entry of clause.slice(brace + 1, clause.indexOf('}')).split(',')) {
      const name = entry.trim();
      if (!name || name.startsWith('type ')) continue;
      const [imported, local] = name.split(/\s+as\s+/);
      bindings.set((local ?? imported).trim(), specifier);
    }
  }
  return bindings;
}

/**
 * The component source a story file exercises.
 *
 * The CSF meta's `component:` field is the declared subject, so when it names an
 * import that resolves to a known component file, that file is the answer.
 * Import order used to decide instead, and it bit twice on 2026-09-30: a Badge
 * import placed above StatusTile made StatusTile read as story-less on main,
 * and the Client detail screen is credited to PageHeader because PageHeader is
 * imported first (hds#369).
 *
 * The first relative import that resolves to a known component file remains
 * the fallback: a meta with no `component:`, or one naming a helper composed in the
 * story file itself, or a module outside the manifest. Stories import helpers
 * and fixtures too, so "first match against the known set" beats "first
 * relative import".
 */
export function resolveStorySubject(storyFile, source, knownFilePaths) {
  const dir = path.posix.dirname(storyFile.split(path.sep).join('/'));
  const resolve = (spec) => {
    for (const suffix of ['.tsx', '.ts', '/index.tsx', '/index.ts', '']) {
      const resolved = path.posix.normalize(path.posix.join(dir, spec + suffix));
      if (knownFilePaths.has(resolved)) return resolved;
    }
    return null;
  };

  const declared = parseMetaComponent(source);
  const declaredFrom = declared ? parseImportBindings(source).get(declared) : undefined;
  if (declaredFrom?.startsWith('.')) {
    const subject = resolve(declaredFrom);
    if (subject) return subject;
  }

  for (const m of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
    const subject = resolve(m[1]);
    if (subject) return subject;
  }
  return null;
}

/**
 * Build filePath -> { storyFile, title, storyIds } for every story file that
 * resolves to a known component. `files` is [{ path, source }].
 */
export function buildStoryIndex(files, knownFilePaths) {
  const byFilePath = new Map();
  const unresolved = [];

  for (const { path: storyFile, source } of files) {
    const title = parseMetaTitle(source);
    const subject = resolveStorySubject(storyFile, source, knownFilePaths);
    if (!title || !subject) {
      unresolved.push({ storyFile, reason: !title ? 'no meta title' : 'no component import' });
      continue;
    }
    const storyIds = parseStoryExports(source).map((key) => deriveStoryId(title, key));
    const existing = byFilePath.get(subject);
    if (existing) {
      existing.storyFiles.push(storyFile);
      existing.storyIds.push(...storyIds);
    } else {
      byFilePath.set(subject, { storyFiles: [storyFile], title, storyIds });
    }
  }

  for (const entry of byFilePath.values()) {
    entry.storyFiles.sort();
    entry.storyIds = [...new Set(entry.storyIds)].sort();
  }
  return { byFilePath, unresolved };
}

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
 * The component source a story file exercises: the first relative import that
 * resolves to a known component file. Stories import helpers and fixtures too,
 * so "first match against the known set" beats "first relative import".
 */
export function resolveStorySubject(storyFile, source, knownFilePaths) {
  const dir = path.posix.dirname(storyFile.split(path.sep).join('/'));
  const candidates = [...source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map((m) => m[1]);
  for (const spec of candidates) {
    for (const suffix of ['.tsx', '.ts', '/index.tsx', '/index.ts', '']) {
      const resolved = path.posix.normalize(path.posix.join(dir, spec + suffix));
      if (knownFilePaths.has(resolved)) return resolved;
    }
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

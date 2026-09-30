/** @internal — the live half of scripts/eval-consistency.mjs (hds#344). Copies files only. */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const SKIP = new Set(['node_modules', 'dist']);
// The template owns these; a generated app cannot replace them.
const OWNED = new Set(['src/main.tsx']);

function listFiles(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP.has(name)) listFiles(full, base, out);
    } else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

/**
 * Build one app directory: a copy of the template with the generated app's
 * `src/` laid over it. The app replaces `src/` only, never `main.tsx`, so it
 * cannot change the `data-hds` / `data-theme` scope or the stylesheet import.
 * @returns {{ ignored: string[] }} app files the template kept its own copy of
 */
export function stageApp(templateDir, appDir, destDir) {
  const appSrc = path.join(appDir, 'src');
  if (!existsSync(path.join(appSrc, 'App.tsx'))) {
    throw new Error(`${path.basename(appDir)} has no src/App.tsx`);
  }
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  cpSync(templateDir, destDir, {
    recursive: true,
    filter: (src) => !SKIP.has(path.basename(src)),
  });
  const ignored = [];
  for (const rel of listFiles(appSrc)) {
    const target = `src/${rel}`;
    if (OWNED.has(target)) {
      ignored.push(target);
      continue;
    }
    const to = path.join(destDir, target);
    mkdirSync(path.dirname(to), { recursive: true });
    cpSync(path.join(appSrc, rel), to);
  }
  return { ignored };
}

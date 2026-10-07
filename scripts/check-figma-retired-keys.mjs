#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Rejects every reference to a retired Figma file (ADR-026, amended
 * 2026-10-07). Since 2026-10-07 there is one HDS library, `libraryFileKey` in
 * figma/links.json; the file it replaced is listed under `retiredFiles` and
 * must never be linked again. Node ids survived the switch, so re-pointing a
 * link is a file-key swap.
 *
 * ERROR on a retired key anywhere in:
 *   src/**                 @figma JSDoc tags, Code Connect templates, data
 *   public/** (json|txt|md) the manifest (Storybook's Design tab reads its figmaUrl), llms
 *   docs/** (json), docs/DESIGN_LINKS.md, docs/CONSUMING.md
 *                          generated data: sync-map, design links; the shipped guide
 *   figma/*.json|txt       disposition, inventory, Code Connect registry
 *   mcp/**, content/docs/** the MCP server the package ships, the docs site's pages
 *   README.md llms.txt DESIGN.md AGENTS.md CONSUMING.md
 *                          what the package ships from the repo root (package.json
 *                          `files`, plus README.md, which npm always packs); a
 *                          missing one is an error, like a missing scan root
 *
 * Not scanned: figma/links.json (it records the retired keys), prose history
 * (docs/adr, other docs Markdown and HTML, figma/*.md), and the generated,
 * gitignored folders under figma/ (push/, links/), which the next
 * `pnpm figma:push` or `pnpm figma:links` rewrites from links.json.
 *
 * Exit 1 on any finding, 0 otherwise.
 *
 * Run: node scripts/check-figma-retired-keys.mjs [--json]
 * Or:  pnpm check:figma-retired-keys
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveScanRoots } from './lib/scan-roots.mjs';

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GATE = 'check-figma-retired-keys';

/** Each scan root, whether it recurses, and which of its files (repo-relative, `/`) are data. */
const SCANS = [
  { dir: 'src', deep: true, take: () => true },
  { dir: 'public', deep: true, take: (rel) => /\.(json|txt|md)$/.test(rel) },
  {
    dir: 'docs',
    deep: true,
    take: (rel) =>
      rel.endsWith('.json') || rel === 'docs/DESIGN_LINKS.md' || rel === 'docs/CONSUMING.md',
  },
  {
    dir: 'figma',
    deep: false,
    take: (rel) => /\.(json|txt)$/.test(rel) && rel !== 'figma/links.json',
  },
  { dir: 'mcp', deep: true, take: () => true },
  { dir: 'content/docs', deep: true, take: () => true },
];

/** The files the package ships from the repo root: package.json `files`, plus README.md, which npm always packs. */
const ROOT_FILES = ['README.md', 'llms.txt', 'DESIGN.md', 'AGENTS.md', 'CONSUMING.md'];

/** The retired file keys figma/links.json lists, after checking the list is usable. */
export function retiredKeysFrom(links) {
  if (!Array.isArray(links.retiredFiles)) {
    throw new Error(
      'figma/links.json has no retiredFiles list, so there is no retired Figma file to scan for. ' +
        'Keep the list, empty if nothing is retired (ADR-026, amended 2026-10-07).',
    );
  }
  const keys = links.retiredFiles.map((file, i) => {
    if (!file || typeof file.fileKey !== 'string' || !file.fileKey) {
      throw new Error(`figma/links.json retiredFiles[${i}] has no fileKey.`);
    }
    return file.fileKey;
  });
  if (keys.includes(links.libraryFileKey)) {
    throw new Error(
      `figma/links.json lists libraryFileKey (${links.libraryFileKey}) under retiredFiles: the library cannot be retired from itself.`,
    );
  }
  return keys;
}

function walk(abs, rel, deep, out) {
  for (const name of readdirSync(abs).sort()) {
    const childAbs = path.join(abs, name);
    const childRel = `${rel}/${name}`;
    if (statSync(childAbs).isDirectory()) {
      if (deep && name !== 'node_modules') walk(childAbs, childRel, deep, out);
    } else {
      out.push(childRel);
    }
  }
  return out;
}

/** @returns {{ errors: Array<{file: string, line: number, key: string}>, retiredFileKeys: string[], scanned: number }} */
export function scanRetiredKeys({ root = DEFAULT_ROOT } = {}) {
  const linksFile = path.join(root, 'figma/links.json');
  const links = existsSync(linksFile) ? JSON.parse(readFileSync(linksFile, 'utf8')) : {};
  const keys = retiredKeysFrom(links);
  const dirs = resolveScanRoots(
    SCANS.map((s) => s.dir),
    { root, gate: GATE },
  );

  const missing = ROOT_FILES.filter((rel) => !existsSync(path.join(root, rel)));
  if (missing.length) {
    throw new Error(
      `${GATE}: ${missing.length} shipped root file(s) do not exist: ${missing.join(', ')}. ` +
        'The gate would scan less than it claims and still report success. Restore the file, or drop it from ROOT_FILES with the package.json `files` entry.',
    );
  }

  const files = SCANS.flatMap((scan, i) =>
    walk(dirs[i], scan.dir, scan.deep, []).filter((rel) => scan.take(rel)),
  ).concat(ROOT_FILES);
  const errors = [];
  for (const rel of files) {
    if (!keys.length) continue;
    const text = readFileSync(path.join(root, rel), 'utf8');
    if (!keys.some((key) => text.includes(key))) continue;
    text.split('\n').forEach((line, n) => {
      for (const key of keys) {
        if (line.includes(key)) errors.push({ file: rel, line: n + 1, key });
      }
    });
  }
  return { errors, retiredFileKeys: keys, scanned: files.length };
}

function main() {
  const json = process.argv.includes('--json');
  let r;
  try {
    r = scanRetiredKeys({});
  } catch (error) {
    console.error(`✗ ${GATE} — ${error.message}`);
    process.exit(1);
  }
  if (json) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    for (const e of r.errors) {
      console.error(`  error  ${e.file}:${e.line} links the retired Figma file ${e.key}`);
    }
    console.log(
      r.errors.length
        ? `✗ ${GATE} — ${r.errors.length} reference(s) to a retired Figma file. Swap the file key for libraryFileKey in figma/links.json (node ids did not change), then run pnpm manifest:generate && pnpm figma:links.`
        : `✓ ${GATE} — ${r.scanned} file(s), no reference to a retired Figma file (${r.retiredFileKeys.join(', ') || 'none retired'})`,
    );
  }
  process.exit(r.errors.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

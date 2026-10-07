#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Rejects every link from code to a Figma file that is not the library
 * (ADR-026, amended 2026-10-07). There is one HDS library, `libraryFileKey` in
 * figma/links.json. Two other files must never be linked:
 *   - a retired file (`retiredFiles`): the library before 2026-10-07. Node ids
 *     survived the switch, so re-pointing a link is a file-key swap;
 *   - HDS Staging (`stagingFileKey`, optional), the draft workbench (ADR-026,
 *     A4). A draft is redrawn in the library before it ships, so an @figma tag,
 *     a Code Connect template or a disposition link names its library node,
 *     never its staging draft, which an agent deletes after the ingest.
 *
 * ERROR on such a key anywhere in:
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
 * Not scanned: figma/links.json (it records the keys), prose (docs/adr, other
 * docs Markdown and HTML, figma/*.md, where the drawing recipe and the MCP
 * ledger name HDS Staging), and the generated, gitignored folders under figma/
 * (push/, links/), which the next `pnpm figma:push` or `pnpm figma:links`
 * rewrites from links.json.
 *
 * Exit 1 on any finding, 0 otherwise.
 *
 * Fixture mode: FIXTURE_DIR=<abs path to a mini-root> scans that root instead
 * of the repo (fixtures/check-figma-retired-keys, docs/guardrails/FIXTURE_DIR_HARNESS.md).
 *
 * Run: node scripts/check-figma-retired-keys.mjs [--json]
 * Or:  pnpm check:figma-retired-keys
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveScanRoots } from './lib/scan-roots.mjs';
import { stagingFrom } from './lib/figma-scripts.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_ROOT = process.env.FIXTURE_DIR ? path.resolve(process.env.FIXTURE_DIR) : REPO_ROOT;
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

/**
 * @returns {{ errors: Array<{file: string, line: number, key: string, kind: 'retired'|'staging'}>,
 *   retiredFileKeys: string[], stagingFileKey: string|null, scanned: number }}
 */
export function scanRetiredKeys({ root = DEFAULT_ROOT } = {}) {
  const linksFile = path.join(root, 'figma/links.json');
  const links = existsSync(linksFile) ? JSON.parse(readFileSync(linksFile, 'utf8')) : {};
  const retired = retiredKeysFrom(links);
  const staging = stagingFrom(
    links,
    " Set HDS Staging's own key and name in figma/links.json, or drop both (ADR-026, A4).",
  );
  const kinds = new Map(retired.map((key) => [key, 'retired']));
  if (staging) kinds.set(staging.fileKey, 'staging');
  const keys = [...kinds.keys()];
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
        if (line.includes(key)) errors.push({ file: rel, line: n + 1, key, kind: kinds.get(key) });
      }
    });
  }
  return {
    errors,
    retiredFileKeys: retired,
    stagingFileKey: staging ? staging.fileKey : null,
    scanned: files.length,
  };
}

/** One finding as the CLI prints it. */
function describe(e) {
  return e.kind === 'staging'
    ? `  error  ${e.file}:${e.line} links HDS Staging (${e.key}), the draft workbench`
    : `  error  ${e.file}:${e.line} links the retired Figma file ${e.key}`;
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
    for (const e of r.errors) console.error(describe(e));
    const fixes = [];
    if (r.errors.some((e) => e.kind === 'retired')) {
      fixes.push(
        'A retired file: swap its key for libraryFileKey in figma/links.json (node ids did not change), then run pnpm manifest:generate && pnpm figma:links.',
      );
    }
    if (r.errors.some((e) => e.kind === 'staging')) {
      fixes.push(
        'HDS Staging: ingest the draft first. Redraw it in the library (figma/COMPONENT-DRAWING-RECIPE.md, "Ingesting a draft into the library"), point the link at its library node, run pnpm manifest:generate && pnpm figma:links, then delete the draft in staging.',
      );
    }
    console.log(
      r.errors.length
        ? `✗ ${GATE} — ${r.errors.length} link(s) to a Figma file that is not the library. ${fixes.join(' ')}`
        : `✓ ${GATE} — ${r.scanned} file(s), no link to a retired Figma file (${r.retiredFileKeys.join(', ') || 'none retired'}) or to HDS Staging (${r.stagingFileKey || 'none named'})`,
    );
  }
  process.exit(r.errors.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

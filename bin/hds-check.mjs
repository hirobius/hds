#!/usr/bin/env node
/**
 * hds-check — HDS's visual rules for any repo's HTML, CSS and JS (hds#664).
 *
 *   npx -p @hirobius/design-system hds-check <paths…> [--json] [--rule <name>]…
 *
 * Scans .html, .css, .js, .mjs and .cjs files (CSS inside JS template strings
 * included) under each path, skipping node_modules, .git and build output.
 * Rules (bin/lib/visual-rules.mjs, the same core the HDS repo gates itself
 * with): no-uppercase, fonts, shadows, raw-colors. `--rule` runs only the named
 * ones. Exit 0 = clean, 1 = violations (file:line:col on stdout), 2 = usage.
 *
 * Reads only the files it is given and the tokens the package ships.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkText, RULES } from './lib/visual-rules.mjs';

const EXTENSIONS = new Set(['.html', '.css', '.js', '.mjs', '.cjs']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', 'coverage']);
const USAGE = `usage: hds-check <paths…> [--json] [--rule ${RULES.join('|')}]…`;

function* walk(path) {
  if (statSync(path).isFile()) {
    yield path;
    return;
  }
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(join(path, entry.name));
    } else if (EXTENSIONS.has(extname(entry.name)) && !entry.name.includes('.min.')) {
      yield join(path, entry.name);
    }
  }
}

function parseArgs(argv) {
  const args = { json: false, rules: [], paths: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--rule') args.rules.push(argv[++i]);
    else if (a.startsWith('--rule=')) args.rules.push(a.slice('--rule='.length));
    else if (a === '--help' || a === '-h') args.help = true;
    else args.paths.push(a);
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(USAGE);
    return 0;
  }
  const unknownRule = args.rules.find((r) => !RULES.includes(r));
  const missing = args.paths.find((p) => !existsSync(p));
  if (args.paths.length === 0 || unknownRule !== undefined || missing) {
    if (unknownRule !== undefined) console.error(`hds-check: unknown rule "${unknownRule}"`);
    if (missing) console.error(`hds-check: no such path "${missing}"`);
    console.error(USAGE);
    return 2;
  }

  const rules = args.rules.length ? args.rules : RULES;
  const violations = [];
  let files = 0;
  for (const p of args.paths) {
    for (const f of walk(p)) {
      files++;
      const rel = relative(process.cwd(), f).replace(/\\/g, '/') || f;
      violations.push(...checkText(readFileSync(f, 'utf8'), rel, { rules }));
    }
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          violations: violations.map((v) => ({
            file: v.file,
            line: v.line,
            col: v.col + 1,
            rule: v.rule,
            severity: 'error',
            message: v.message,
            sample: v.sample,
          })),
          summary: { files, total: violations.length },
          ok: violations.length === 0,
        },
        null,
        2,
      ),
    );
  } else if (violations.length === 0) {
    console.log(`[ok] hds-check: ${files} file${files === 1 ? '' : 's'} follow HDS`);
  } else {
    for (const v of violations) {
      console.log(`${v.file}:${v.line}:${v.col + 1}  [${v.rule}] ${v.message}\n    ${v.sample}`);
    }
    console.log(
      `\n✗ hds-check: ${violations.length} problem${violations.length === 1 ? '' : 's'}. ` +
        'Exempt a line with a reason: uppercase-ok, font-ok, shadow-ok or color-ok.',
    );
  }
  return violations.length === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exitCode = main(process.argv.slice(2));
}

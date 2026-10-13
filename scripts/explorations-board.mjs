#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * explorations-board — the board and index pages for the design explorations
 * (hirobius/hds#628, phase 0).
 *
 *   board  one screen's run directory -> ONE self-contained HTML file
 *   index  every screen's boards      -> links plus the ranked gap table
 *
 * Wiring only: the logic is in scripts/lib/explorations/board*.mjs. It never
 * calls a model, a browser or the network.
 */
import { readFileSync } from 'node:fs';
import { buildBoard, DEFAULT_BUDGET_BYTES } from './lib/explorations/board.mjs';
import { buildIndex } from './lib/explorations/board-index.mjs';
import { formatBytes } from './lib/explorations/board-chrome.mjs';

const HELP = `Usage: node scripts/explorations-board.mjs <command> [options]

Commands:
  board <runDir> <screen> --out <file>
        Build one screen's board from <runDir>/<screen>-<A|B|C>/ (a runs/<date>
        directory, or a runs/ root: the newest run of each direction is used).
        Each direction folder holds screenshots/{light,dark}-{1280,390}.png,
        rationale.md, refs.json, bend-log.json, gaps.json and review.json.
        Options:
          --title <text>      heading for the screen (default: the screen id, humanized)
          --budget-mb <n>     cap for the whole page in MB (default ${DEFAULT_BUDGET_BYTES / 1024 / 1024}, never above the 16 MB
                              Artifact limit); screenshots are downscaled, wide ones first, until it fits
  index <runDir...> --out <file>
        Build the index over every screen found under the run directories.
        Options:
          --links <file>      JSON { "<screen>": "<published board URL>" }
          --titles <file>     JSON { "<screen>": "<heading>" }

Options for both:
  --out <file>      where to write the HTML (required)
  --artifact        write the Artifact page form: <title> and <style> first, no
                    <!doctype>, <html>, <head> or <body> (the Artifact tool wraps it)
  --strict          exit 1 when anything is missing or malformed (a missing
                    screenshot, an unreadable file, an invalid gap log)
  --help            show this help

Hooks (no-ops until the orchestrator wires Artifact data storage):
  board  <script id="pick-hook">      recordPick(screen, pick)
  index  <script id="decision-hook">  recordGapDecision(gapKey, decision)

Exit codes:
  0  built (problems, if any, are listed on stderr and on the page)
  1  built, but --strict was given and there were problems
  2  usage or input error (nothing was written)
`;

function fail(message) {
  console.error(`explorations-board: ${message}\n\nRun with --help for usage.`);
  process.exit(2);
}

const VALUE_FLAGS = new Set(['--out', '--title', '--budget-mb', '--links', '--titles']);
const BOOL_FLAGS = new Set(['--artifact', '--strict', '--help']);

function parse(argv) {
  const args = argv.filter((a) => a !== '--');
  const opts = { positional: [], flags: {} };
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (VALUE_FLAGS.has(a)) {
      if (args[i + 1] === undefined || args[i + 1].startsWith('--')) fail(`${a} needs a value`);
      opts.flags[a] = args[i + 1];
      i += 1;
    } else if (BOOL_FLAGS.has(a)) opts.flags[a] = true;
    else if (a.startsWith('--')) fail(`unknown option ${a}`);
    else opts.positional.push(a);
  }
  return opts;
}

function readJsonFile(file, what) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    return fail(`could not read ${what} ${file}: ${err.message}`);
  }
}

function report(result, strict) {
  console.log(`${result.summary}${result.out ? ` -> ${result.out}` : ''}`);
  for (const d of result.downscaled ?? []) {
    console.log(
      `downscaled ${d.file} to ${Math.round(d.scale * 100)}% (${formatBytes(d.fromBytes)} -> ${formatBytes(d.toBytes)}) to fit the page budget`,
    );
  }
  for (const p of result.problems) console.error(`warn: ${p}`);
  if (strict && result.problems.length) {
    console.error(
      `explorations-board: ${result.problems.length} problem(s) and --strict was given`,
    );
    process.exit(1);
  }
}

const { positional, flags } = parse(process.argv.slice(2));
if (flags['--help'] || positional.length === 0) {
  console.log(HELP);
  process.exit(flags['--help'] ? 0 : 2);
}

const [command, ...rest] = positional;
const out = flags['--out'];
const form = flags['--artifact'] ? 'artifact' : 'document';

try {
  if (command === 'board') {
    if (rest.length !== 2) fail('board needs <runDir> and <screen>');
    if (!out) fail('board needs --out <file>');
    let budgetBytes;
    if (flags['--budget-mb'] !== undefined) {
      const mb = Number(flags['--budget-mb']);
      if (!Number.isFinite(mb) || mb <= 0) fail('--budget-mb must be a positive number');
      budgetBytes = Math.round(mb * 1024 * 1024);
    }
    const result = buildBoard({
      runDir: rest[0],
      screen: rest[1],
      out,
      title: flags['--title'],
      form,
      budgetBytes,
    });
    report(result, flags['--strict']);
  } else if (command === 'index') {
    if (rest.length === 0) fail('index needs at least one <runDir>');
    if (!out) fail('index needs --out <file>');
    const links = flags['--links'] ? readJsonFile(flags['--links'], 'links file') : {};
    const titles = flags['--titles'] ? readJsonFile(flags['--titles'], 'titles file') : {};
    const result = buildIndex({ runDirs: rest, links, titles, form, out });
    report(result, flags['--strict']);
  } else {
    fail(`unknown command "${command}" (expected board or index)`);
  }
} catch (err) {
  fail(err.message);
}

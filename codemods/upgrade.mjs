#!/usr/bin/env node
/**
 * upgrade — one command from the installed @hirobius/design-system to a newer
 * one (hds#452):
 *
 *   npx @hirobius/design-system@latest upgrade [flags]
 *
 * npx runs the bin named after the package, `design-system`, which takes the
 * subcommand; the `hds-upgrade` bin is the same file and runs it directly.
 *
 * The steps come from the upgrade record of the package this file ships in
 * (upgrade/index.json and upgrade/releases/<version>.json, hds#451), never
 * from the consumer's node_modules copy, so @latest always brings the newest
 * steps. For every importer that declares the package (the root and each
 * workspace package), it:
 *
 *   1. reads the installed version: the lockfile, then node_modules, then
 *      --from; when the lockfile already says the target, the lockfile at git
 *      HEAD, then at the merge-base with the default branch;
 *   2. refuses, changing nothing (exit 2), a version below the record's floor,
 *      a downgrade, or a target the record has no ledger for;
 *   3. applies the ledgers after the installed version up to the target,
 *      oldest first: runs their codemods, bumps the dependency range (keeping
 *      its operator), and adds back a dependency the package stopped
 *      installing that the code still imports;
 *   4. installs with the project's package manager and runs its typecheck
 *      script (or tsc --noEmit);
 *   5. prints four lists: Fixed for you, Looks different (only what the code
 *      uses), Coming next (deprecations, with the release that removes them)
 *      and Do by hand (what the code still uses and has not changed yet).
 *
 * Exit 0: done, nothing left by hand. 1: work left. 2: refused or error.
 * --json prints the report as JSON (upgrade/schema.json, $defs.upgradeReport);
 * --report <file> writes that JSON to a file as well. Node builtins only.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HDS_PACKAGE } from './lib/installed-version.mjs';
import {
  detectManager,
  findImporters,
  installedVersions,
  readRootLockfile,
} from './lib/project.mjs';
import { comingNextSteps, listOf, loadRecord } from './lib/record.mjs';
import { collectFiles, matchDetect } from './lib/scan.mjs';
import { bumpRange, compareVersions, isVersion } from './lib/semver.mjs';
import { hasCodemod, runCodemod } from './registry.mjs';

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const USAGE = `usage: npx ${HDS_PACKAGE}@latest upgrade [flags]

  --root <dir>       the project to upgrade (default: the current directory)
  --from <version>   the installed version, when no lockfile or node_modules says it
  --to <version>     the version to upgrade to (default: this package's version)
  --dry-run          change nothing; print what would change
  --check            change nothing; exit 1 while anything is left to do
  --json             print the report as JSON
  --report <file>    also write the JSON report to a file
  --no-install       do not run the package manager's install
  --no-typecheck     do not run the typecheck script (or tsc --noEmit)
  --help             print this

Exit 0: done. 1: work left. 2: refused (nothing was changed) or an error.`;

const LISTS = ['fixedForYou', 'looksDifferent', 'comingNext', 'doByHand'];
const HEADINGS = {
  fixedForYou: 'Fixed for you',
  looksDifferent: 'Looks different',
  comingNext: 'Coming next',
  doByHand: 'Do by hand',
};
const SEVERITY = ['none', 'additive', 'look', 'behavior', 'breaking'];
const REMOVING = new Set(['removed', 'moved', 'renamed', 'folded']);

/** Kinds whose fix leaves what `detect` matches in place: a value or a behavior to check. */
const CHECK_ONLY = new Set(['value-changed', 'behavior']);

/**
 * Whether a Do by hand step blocks until the code changes: it takes something
 * away, is a manual step, says how to tell it is done, or breaks in a way the
 * edit removes. A value or behavior change with no `done` detector is listed
 * to check and never blocks, even when breaking: the code that handles it
 * still matches its detect, so nothing could ever check it off.
 */
const blocks = (step) =>
  REMOVING.has(step.kind) ||
  step.kind === 'manual' ||
  !!step.done ||
  (step.impact === 'breaking' && !CHECK_ONLY.has(step.kind));
const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

/**
 * @param {string[]} argv
 * @returns {{ options?: any, help?: boolean, error?: string }}
 */
export function parseArgs(argv, invokedAs = '') {
  const args = [...argv];
  if (args[0] === 'upgrade') args.shift();
  else if (args[0] && !args[0].startsWith('-')) return { error: `unknown command: ${args[0]}` };
  else if (/^design-system(\.cmd)?$/.test(invokedAs) && !args.includes('--help')) {
    return { error: 'name the command: upgrade' };
  }
  const options = {
    root: process.cwd(),
    from: null,
    to: null,
    mode: 'apply',
    json: false,
    report: null,
    install: true,
    typecheck: true,
  };
  const value = (flag) => {
    const v = args.shift();
    if (v === undefined || v.startsWith('--')) throw new Error(`${flag} needs a value`);
    return v;
  };
  try {
    while (args.length > 0) {
      const flag = args.shift();
      if (flag === '--help' || flag === '-h') return { help: true };
      else if (flag === '--root') options.root = resolve(value(flag));
      else if (flag === '--from') options.from = value(flag);
      else if (flag === '--to') options.to = value(flag);
      else if (flag === '--dry-run') options.mode = options.mode === 'check' ? 'check' : 'dry-run';
      else if (flag === '--check') options.mode = 'check';
      else if (flag === '--json') options.json = true;
      else if (flag === '--report') options.report = resolve(value(flag));
      else if (flag === '--no-install') options.install = false;
      else if (flag === '--no-typecheck') options.typecheck = false;
      else return { error: `unknown argument: ${flag}` };
    }
  } catch (error) {
    return { error: error.message };
  }
  for (const key of ['from', 'to']) {
    if (options[key] !== null && !isVersion(options[key])) {
      return {
        error: `--${key} needs a version such as the one in package.json, got ${options[key]}`,
      };
    }
  }
  return { options };
}

// ── package.json edits ───────────────────────────────────────────────────────

/**
 * Rewrite a package.json through `mutate`, keeping its indent, line endings
 * and final newline. Written to a temp file and renamed over it, so a crash
 * never leaves half a package.json.
 */
function editPackageJson(file, mutate) {
  const text = readFileSync(file, 'utf8');
  const pkg = JSON.parse(text);
  mutate(pkg);
  const indent = /^[ \t]+(?=")/m.exec(text)?.[0] ?? '  ';
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const body = JSON.stringify(pkg, null, indent).replace(/\n/g, eol);
  const next = `${body}${/\r?\n$/.test(text) ? eol : ''}`;
  if (next === text) return false;
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    writeFileSync(tmp, next);
    renameSync(tmp, file);
  } finally {
    rmSync(tmp, { force: true });
  }
  return true;
}

/** Add `name: range` to an object, in place, keeping it sorted when it was. */
function addSorted(obj, name, range) {
  const keys = Object.keys(obj);
  const sorted = keys.every((k, i) => i === 0 || keys[i - 1] <= k);
  obj[name] = range;
  if (!sorted) return obj;
  const entries = Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const k of Object.keys(obj)) delete obj[k];
  for (const [k, v] of entries) obj[k] = v;
  return obj;
}

// ── report ───────────────────────────────────────────────────────────────────

function createReport(record, options) {
  return {
    package: HDS_PACKAGE,
    tool: record.version,
    mode: options.mode,
    target: options.to ?? record.version,
    floor: record.index.floor,
    packageManager: null,
    lockfile: null,
    importers: [],
    split: false,
    fixedForYou: [],
    looksDifferent: [],
    comingNext: [],
    doByHand: [],
    changedFiles: [],
    refused: null,
    exitCode: 0,
  };
}

/**
 * Items merge by id across importers; `severity` orders Do by hand. A Do by
 * hand item is blocking (it keeps the exit code at 1) while the code still
 * needs an edit; a behavior change with nothing to edit is listed to check
 * and does not block.
 */
function addItem(
  report,
  list,
  { id, plain, importer, files = [], removeIn, impact, blocking = true },
) {
  let item = report[list].find((i) => i.id === id);
  if (!item) {
    item = { id, plain, importers: [], files: [] };
    if (removeIn) item.removeIn = removeIn;
    if (list === 'doByHand') item.blocking = blocking;
    Object.defineProperty(item, 'severity', {
      value: SEVERITY.indexOf(impact ?? 'behavior'),
      enumerable: false,
    });
    report[list].push(item);
  }
  if (importer && !item.importers.includes(importer)) item.importers.push(importer);
  for (const f of files) if (!item.files.includes(f)) item.files.push(f);
}

const refuse = (report, message) => {
  report.refused = message;
  report.exitCode = 2;
  return report;
};

const under = (dir, rel) => (dir === '.' ? rel : `${dir}/${rel}`);

/** Enough for any install log: spawnSync kills a child that prints past it. */
const TOOL_MAX_BUFFER = 512 * 1024 * 1024;

/** Run a command, capturing its output; null status when it could not start. Never a shell. */
function runTool(cmd, args, cwd) {
  const res = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout: 15 * 60_000,
    maxBuffer: TOOL_MAX_BUFFER,
  });
  return {
    status: res.error ? null : res.status,
    missing: res.error?.code === 'ENOENT',
    output: `${res.stdout ?? ''}${res.stderr ?? ''}${res.error && res.error.code !== 'ENOENT' ? res.error.message : ''}`,
  };
}

/**
 * Run the package manager. On Windows it is a .cmd shim, which Node only
 * starts through cmd.exe, so the command line is built here from fixed words
 * (the manager's name and `install` / `run typecheck`): no path or user input
 * reaches the shell, and cwd is passed as an option.
 */
function runManager(pm, args, cwd) {
  if (process.platform !== 'win32') return runTool(pm, args, cwd);
  const res = spawnSync([pm, ...args].join(' '), {
    cwd,
    encoding: 'utf8',
    shell: true,
    timeout: 15 * 60_000,
    maxBuffer: TOOL_MAX_BUFFER,
  });
  return {
    status: res.error ? null : res.status,
    missing: res.status === 9009 || !!res.error,
    output: `${res.stdout ?? ''}${res.stderr ?? ''}`,
  };
}

/** The line of a tool's output that best says what failed. */
function firstError(output) {
  const lines = output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const line = lines.find((l) => /\bTS\d{4}\b|error/i.test(l)) ?? lines.at(-1) ?? 'no output';
  return line.length > 200 ? `${line.slice(0, 197)}...` : line;
}

/** The nearest node_modules/typescript/bin/tsc (a JS file node runs) from `dir` up to `root`, or null. */
function findTsc(dir, root) {
  for (let d = dir; ; d = dirname(d)) {
    const bin = join(d, 'node_modules', 'typescript', 'bin', 'tsc');
    if (existsSync(bin)) return bin;
    if (d === root || dirname(d) === d) return null;
  }
}

const WHY = {
  pnpm: `pnpm why ${HDS_PACKAGE}`,
  npm: `npm ls ${HDS_PACKAGE}`,
  yarn: `yarn why ${HDS_PACKAGE}`,
  bun: `bun pm ls`,
};

/**
 * Upgrade one project. Never throws for a consumer problem: a refusal is a
 * report with exitCode 2 and `refused` set, and nothing written.
 * @param {ReturnType<typeof parseArgs>['options']} options
 * @param {{ pkgDir?: string }} [env]
 */
export async function upgrade(options, { pkgDir = PKG_DIR } = {}) {
  const record = loadRecord(pkgDir);
  const report = createReport(record, options);
  const { target } = report;
  const apply = options.mode === 'apply';
  const root = options.root;

  // ── 1. what is installed, and refusals (nothing written before this ends)
  const known = record.ledgers.map((l) => l.version);
  if (!known.includes(target)) {
    return refuse(
      report,
      `No upgrade steps for ${target}: this copy of ${HDS_PACKAGE} (${record.version}) knows ${known.join(', ')}. Run npx ${HDS_PACKAGE}@latest upgrade, or pick one of those with --to.`,
    );
  }
  const rootPkgFile = join(root, 'package.json');
  if (!existsSync(rootPkgFile))
    return refuse(report, `No package.json in ${root}: pass --root <project dir>.`);
  let rootPkg;
  try {
    rootPkg = JSON.parse(readFileSync(rootPkgFile, 'utf8'));
  } catch (error) {
    return refuse(report, `${rootPkgFile} is not valid JSON (${error.message}).`);
  }
  const importers = findImporters(root);
  if (importers.length === 0) {
    return refuse(
      report,
      `No package.json under ${root} declares ${HDS_PACKAGE}, so there is nothing to upgrade.`,
    );
  }
  const { manager, lockfile } = detectManager(root, rootPkg);
  report.packageManager = manager;
  report.lockfile = lockfile;
  const lock = readRootLockfile(root, lockfile, importers);
  const versions = installedVersions({
    root,
    lockfile,
    lock,
    importers,
    target,
    from: options.from,
  });
  const problems = [];
  importers.forEach((importer, i) => {
    const { from } = versions[i];
    const where = importer.dir === '.' ? '' : ` in ${importer.dir}`;
    if (from === null) {
      problems.push(
        `Cannot tell which version of ${HDS_PACKAGE} is installed${where}: no lockfile entry and no node_modules copy. Pass --from <version>.`,
      );
    } else if (compareVersions(from, record.index.floor) < 0) {
      problems.push(
        `Installed ${from} is older than the oldest release this tool can upgrade from (${record.index.floor}). Follow MIGRATIONS.md by hand up to ${record.index.floor}, or ask in hirobius/hds.`,
      );
    } else if (compareVersions(from, target) > 0) {
      problems.push(
        `Installed ${from}${where} is newer than ${target}: this tool does not downgrade. Pass --to ${from} or newer.`,
      );
    }
  });
  report.importers = importers.map((importer, i) => ({
    dir: importer.dir,
    from: versions[i].from,
    source: versions[i].source,
    range: importer.range,
    newRange: null,
  }));
  if (problems.length > 0) return refuse(report, [...new Set(problems)].join('\n'));
  report.split = new Set(versions.map((v) => v.from)).size > 1;

  // ── 2. each importer: codemods, range, dependencies, lists
  const changed = new Set();
  for (const [i, importer] of importers.entries()) {
    const { from } = versions[i];
    const dir = importer.dir;
    const pkgFile = join(importer.abs, 'package.json');
    const pkgRel = under(dir, 'package.json');
    const scan = () => collectFiles(importer.abs, { skip: importer.nested });
    const before = scan();
    const rel = (files) => files.map((f) => under(dir, f));
    const steps = record.ledgers
      .filter(
        (l) => compareVersions(l.version, from) > 0 && compareVersions(l.version, target) <= 0,
      )
      .flatMap((l) => l.steps);

    if (versions[i].noHistory) {
      const where = versions[i].source === 'node_modules' ? 'node_modules' : 'the lockfile';
      addItem(report, 'doByHand', {
        id: 'tool/no-history',
        plain: `${HDS_PACKAGE} is already ${target} in ${where}, and no git history says which version it was upgraded from. Pass --from <old version> to list what is left, or --from ${target} to confirm the upgrade is done.`,
        importer: dir,
        files: [pkgRel],
      });
    }

    // Codemods, each once, in the order their steps come.
    const codemods = [
      ...new Set(
        steps.filter((s) => s.auto && hasCodemod(s.auto.codemod)).map((s) => s.auto.codemod),
      ),
    ];
    for (const name of codemods) {
      let res;
      try {
        res = await runCodemod(name, {
          root: importer.abs,
          write: apply,
          skip: importer.nested,
        });
      } catch (error) {
        addItem(report, 'doByHand', {
          id: `${name}/failed`,
          plain: `${name} stopped partway (${error.message.split('\n')[0]}), so fix that, then run this command again; files it already rewrote stay rewritten.`,
          importer: dir,
          files: [],
          impact: 'breaking',
        });
        continue;
      }
      if (apply) for (const f of res.files) changed.add(under(dir, f));
      for (const m of res.manual) {
        if (m.removed) continue; // the ledger's removed step says it, with the fix
        addItem(report, 'doByHand', {
          id: `${name}/manual`,
          plain: `${name} could not rewrite every use, so edit these by hand: ${m.stmt}.`.replace(
            /\.\.$/,
            '.',
          ),
          importer: dir,
          files: [under(dir, m.file)],
        });
      }
    }
    const now = apply && codemods.length > 0 ? scan() : before;

    for (const step of steps) {
      if (step.kind === 'deprecated') continue; // Coming next, below
      const done = step.done && matchDetect(step.done, now).length > 0;
      if (step.auto && hasCodemod(step.auto.codemod)) {
        const was = matchDetect(step.detect, before);
        const still = apply ? matchDetect(step.detect, now) : [];
        if (still.length > 0) {
          addItem(report, 'doByHand', {
            id: step.id,
            plain: step.plain,
            importer: dir,
            files: rel(still),
            impact: step.impact,
          });
        } else if (was.length > 0) {
          addItem(report, 'fixedForYou', {
            id: step.id,
            plain: step.plain,
            importer: dir,
            files: rel(was),
          });
        }
        continue;
      }
      const hits = step.detect ? matchDetect(step.detect, now) : null;
      if (step.kind === 'dependency' && step.range && step.detect) {
        const name = step.id.split('/').slice(2).join('/');
        if (!hits.length || DEP_FIELDS.some((f) => importer.pkg?.[f]?.[name] !== undefined))
          continue;
        if (apply) {
          editPackageJson(pkgFile, (pkg) => {
            pkg.dependencies = addSorted(pkg.dependencies ?? {}, name, step.range);
          });
          importer.pkg = JSON.parse(readFileSync(pkgFile, 'utf8'));
          changed.add(pkgRel);
        }
        addItem(report, 'fixedForYou', {
          id: step.id,
          plain: `Added ${name} ${step.range} to dependencies: ${HDS_PACKAGE} no longer installs it and your code imports it.`,
          importer: dir,
          files: rel(hits),
        });
        continue;
      }
      if (done || (hits !== null && hits.length === 0)) continue;
      const list = listOf(step) === 'looksDifferent' ? 'looksDifferent' : 'doByHand';
      if (list === 'looksDifferent' && hits === null) continue;
      addItem(report, list, {
        id: step.id,
        plain: step.plain,
        importer: dir,
        files: rel(hits ?? []),
        impact: step.impact,
        blocking: blocks(step),
      });
    }

    for (const step of comingNextSteps(record.ledgers, target)) {
      const hits = step.detect ? matchDetect(step.detect, now) : [];
      if (hits.length === 0) continue;
      if (step.done && matchDetect(step.done, now).length > 0) continue;
      addItem(report, 'comingNext', {
        id: step.id,
        plain: step.plain,
        importer: dir,
        files: rel(hits),
        removeIn: step.removeIn,
      });
    }

    // The range, with its operator kept, in every field that declares it.
    const entry = report.importers[i];
    const fields = DEP_FIELDS.filter((f) => typeof importer.pkg?.[f]?.[HDS_PACKAGE] === 'string');
    const bumps = fields.map((f) => [
      f,
      importer.pkg[f][HDS_PACKAGE],
      bumpRange(importer.pkg[f][HDS_PACKAGE], target),
    ]);
    const stuck = bumps.filter(([, , next]) => next === null);
    for (const [field, range] of stuck) {
      addItem(report, 'doByHand', {
        id: 'tool/range',
        plain: `Set ${HDS_PACKAGE} to ^${target} by hand: this tool does not rewrite a range like ${range} (${field}).`,
        importer: dir,
        files: [pkgRel],
      });
    }
    const moves = bumps.filter(([, range, next]) => next !== null && next !== range);
    entry.newRange = bumpRange(importer.range, target) ?? null;
    if (moves.length > 0) {
      if (apply) {
        editPackageJson(pkgFile, (pkg) => {
          for (const [field, , next] of moves) pkg[field][HDS_PACKAGE] = next;
        });
        changed.add(pkgRel);
      }
      addItem(report, 'fixedForYou', {
        id: 'range',
        plain: `Set ${HDS_PACKAGE} to ${target} in package.json, keeping each range's operator.`,
        importer: dir,
        files: [pkgRel],
      });
    }
  }

  // ── 3. a second copy of HDS the importers do not explain
  if (lock?.versions?.length > 1) {
    const moving = new Set(importers.map((imp) => lock.importers?.[imp.dir]).filter(Boolean));
    const extra = lock.versions.filter((v) => v !== target && !moving.has(v));
    if (extra.length > 0) {
      addItem(report, 'doByHand', {
        id: 'tool/two-copies',
        plain: `The lockfile holds two copies of HDS (${lock.versions.join(' and ')}): something other than your package.json pulls in ${extra.join(' and ')}, so find it with \`${WHY[manager] ?? WHY.npm}\` and update or dedupe it.`,
        files: [lockfile],
        impact: 'breaking',
      });
    }
  }

  // ── 4. install and typecheck
  if (apply && options.install) {
    const stale = importers.some((imp) => lock?.importers?.[imp.dir] !== target);
    if (changed.size > 0 || stale) {
      const pm = manager ?? 'npm';
      const res = runManager(pm, ['install'], root);
      if (res.status !== 0) {
        addItem(report, 'doByHand', {
          id: 'tool/install',
          plain: `Run \`${pm} install\`: it failed here (${res.missing ? `${pm} not found` : firstError(res.output)}).`,
          files: [],
        });
      }
    }
  }
  if (apply && options.typecheck) {
    for (const importer of importers) {
      const pm = manager ?? 'npm';
      let res = null;
      if (importer.pkg?.scripts?.typecheck) {
        res = runManager(pm, ['run', 'typecheck'], importer.abs);
      } else if (existsSync(join(importer.abs, 'tsconfig.json'))) {
        const tsc = findTsc(importer.abs, root);
        if (tsc) res = runTool(process.execPath, [tsc, '--noEmit'], importer.abs);
      }
      if (!res) continue;
      if (res.status !== 0) {
        addItem(report, 'doByHand', {
          id: 'tool/typecheck',
          plain: `Typecheck fails${importer.dir === '.' ? '' : ` in ${importer.dir}`} (${firstError(res.output)}), so fix what it reports, then run this command again.`,
          importer: importer.dir,
          files: [],
          impact: 'breaking',
        });
      }
    }
  }

  // ── 5. order and exit
  report.doByHand = report.doByHand
    .map((item, i) => [item, i])
    .sort(([a, i], [b, j]) => b.blocking - a.blocking || b.severity - a.severity || i - j)
    .map(([item]) => item);
  report.changedFiles = [...changed].sort();
  const pending = options.mode === 'apply' ? 0 : report.fixedForYou.length;
  const blocking = report.doByHand.filter((item) => item.blocking).length;
  report.exitCode = pending + blocking > 0 ? 1 : 0;
  return report;
}

// ── text output ─────────────────────────────────────────────────────────────

const MAX_FILES = 5;

export function formatReport(report) {
  if (report.refused) return report.refused;
  const out = [];
  const preview = report.mode !== 'apply';
  const how = [report.packageManager, report.lockfile].filter(Boolean).join(', ');
  out.push(`${HDS_PACKAGE} upgrade to ${report.target}${how ? ` (${how})` : ''}`);
  for (const imp of report.importers) {
    const where =
      {
        lockfile: report.lockfile,
        node_modules: 'node_modules',
        flag: '--from',
        'git-head': 'lockfile at git HEAD',
        'git-merge-base': 'lockfile at the merge-base',
        'git-log': 'lockfile in git history',
      }[imp.source] ?? imp.source;
    out.push(`  ${imp.dir}  ${imp.from} -> ${report.target}  (installed version from ${where})`);
  }
  if (report.split) {
    out.push(
      '  Workspace split: these importers start from different versions; each is upgraded from its own.',
    );
  }
  if (preview)
    out.push(
      report.mode === 'check'
        ? '  --check: nothing was written.'
        : '  --dry-run: nothing was written.',
    );
  for (const list of LISTS) {
    out.push(
      '',
      `${HEADINGS[list]}${preview && list === 'fixedForYou' ? ' (when run without --dry-run or --check)' : ''}`,
    );
    if (report[list].length === 0) out.push('  (none)');
    for (const item of report[list]) {
      const removal = item.removeIn ? ` Removed in ${item.removeIn}.` : '';
      const check = item.blocking === false ? 'Check: ' : '';
      out.push(`  - ${check}${item.plain}${removal}`);
      const shown = item.files.slice(0, MAX_FILES);
      if (shown.length > 0)
        out.push(
          `      ${shown.join(', ')}${item.files.length > MAX_FILES ? ` and ${item.files.length - MAX_FILES} more` : ''}`,
        );
    }
  }
  out.push('');
  const left = report.doByHand.filter((item) => item.blocking).length;
  const checks = report.doByHand.length - left;
  const toCheck =
    checks > 0 ? `; ${checks} behavior ${checks === 1 ? 'change' : 'changes'} above to check` : '';
  if (report.exitCode === 0) {
    out.push(
      preview
        ? `Nothing left to do${toCheck}.`
        : `Done: on ${report.target}, nothing left to do by hand${toCheck}.`,
    );
  } else if (preview) {
    const fix = report.fixedForYou.length;
    const parts = [
      fix > 0 ? `${fix} to fix (run without --check or --dry-run)` : null,
      left > 0 ? `${left} to do by hand` : null,
    ].filter(Boolean);
    out.push(`Work left: ${parts.join(', ')}.`);
  } else {
    out.push(
      `${left} ${left === 1 ? 'item' : 'items'} left to do by hand; run this command again to check them off.`,
    );
  }
  return out.join('\n');
}

// ── CLI ─────────────────────────────────────────────────────────────────────

export async function main(argv, invokedAs = '') {
  const parsed = parseArgs(argv, invokedAs);
  if (parsed.help) {
    console.log(USAGE);
    return 0;
  }
  if (parsed.error) {
    console.error(`${parsed.error}\n\n${USAGE}`);
    return 2;
  }
  const { options } = parsed;
  // Check --report's directory before anything is written, so a bad path
  // never fails after the upgrade has already changed files.
  if (options.report) {
    const dir = dirname(options.report);
    let ok = false;
    try {
      ok = statSync(dir).isDirectory();
    } catch {
      ok = false;
    }
    if (!ok) {
      console.error(
        `Cannot write --report ${options.report}: ${dir} is not a directory; pass a path in an existing directory.`,
      );
      return 2;
    }
  }
  let report;
  try {
    report = await upgrade(options);
  } catch (error) {
    const changed =
      options.mode === 'apply'
        ? ' Some files may already be changed: check `git status` before running it again.'
        : ' Nothing was written.';
    console.error(`upgrade failed: ${error.stack ?? error.message}${changed}`);
    return 2;
  }
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (options.report) {
    try {
      writeFileSync(options.report, json);
    } catch (error) {
      console.error(
        `Cannot write --report ${options.report}: ${error.message}; pass a path in an existing directory you can write to.`,
      );
      return 2;
    }
  }
  if (options.json) process.stdout.write(json);
  if (report.refused) console.error(report.refused);
  else if (!options.json) console.log(formatReport(report));
  return report.exitCode;
}

// Compare real paths: npm/yarn link the bin and pnpm links the package
// directory, so argv[1] is a symlink while import.meta.url is resolved.
const isEntry = (() => {
  try {
    return (
      !!process.argv[1] &&
      realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
})();
if (isEntry) {
  process.exitCode = await main(process.argv.slice(2), basename(process.argv[1] ?? ''));
}

/**
 * Fixture builders for the upgrade command tests (hds#452). Every project is
 * written to a fresh tmp dir at run time, so no lockfile ever sits in the repo
 * where a dependency bot could mistake it for a project. Names are neutral
 * (app-pnpm, site-npm): no real consumer is named.
 */
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const UPGRADE = join(REPO, 'codemods/upgrade.mjs');
export const PKG = '@hirobius/design-system';

/** Write `files` (relative path → text, or an object written as JSON) into a new tmp dir. */
export function makeProject(files) {
  const dir = mkdtempSync(join(tmpdir(), 'hds-upgrade-'));
  writeFiles(dir, files);
  return dir;
}

export function writeFiles(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const file = join(dir, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(
      file,
      typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`,
    );
  }
}

export const pkgJson = (name, deps = {}, extra = {}) => ({
  name,
  version: '0.0.0',
  private: true,
  ...extra,
  dependencies: deps,
});

/** A pnpm v9 lockfile: importer dir → HDS version, plus extra copies only another package pulls in. */
export function pnpmLock(importers, extra = []) {
  const lines = ["lockfileVersion: '9.0'", '', 'importers:', ''];
  for (const [dir, version] of Object.entries(importers)) {
    lines.push(
      `  ${dir}:`,
      '    dependencies:',
      `      '${PKG}':`,
      `        specifier: ^${version}`,
      `        version: ${version}(react@18.3.1)`,
      '',
    );
  }
  lines.push('packages:', '');
  for (const version of new Set([...Object.values(importers), ...extra])) {
    lines.push(`  '${PKG}@${version}':`, `    resolution: {integrity: sha512-x}`, '');
  }
  return `${lines.join('\n')}\n`;
}

/** A package-lock.json v3 for a single package at `version`. */
export function npmLock(version, range = `^${version}`) {
  return {
    name: 'fixture',
    lockfileVersion: 3,
    requires: true,
    packages: {
      '': { name: 'fixture', dependencies: { [PKG]: range } },
      [`node_modules/${PKG}`]: { version },
    },
  };
}

/** Every file under `dir` (skipping .git) with its text, to prove a run changed nothing. */
export function snapshotTree(dir) {
  const out = {};
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      if (entry === '.git') continue;
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else out[relative(dir, full)] = readFileSync(full, 'utf8');
    }
  };
  walk(dir);
  return out;
}

/** Run the command as a child, the way npx runs the bin. */
export function runCli(args, { cwd = REPO, env = process.env } = {}) {
  const res = spawnSync(process.execPath, [UPGRADE, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 60_000,
  });
  return { code: res.status, stdout: res.stdout, stderr: res.stderr };
}

/** git in a fixture, never the real repo: cwd is the fixture and GIT_* is already stripped. */
export function git(cwd, ...args) {
  const res = spawnSync(
    'git',
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.test',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'init.defaultBranch=main',
      ...args,
    ],
    { cwd, encoding: 'utf8' },
  );
  if (res.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${res.stderr}`);
  return res.stdout.trim();
}

/**
 * A tmp bin directory of fake package managers (pnpm, npm, yarn, bun) and the
 * env that puts it first on PATH. Each fake appends `<name> <args> in <cwd>`
 * to the log; `onInstall(name)` returns the files (relative to its cwd) the
 * fake writes on `install`, such as an updated lockfile, and `fail` makes
 * every call print an error and exit 1.
 */
export function fakeManagers({ installs = {}, fail = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'hds-fake-pm-'));
  const log = join(dir, 'calls.log');
  for (const name of ['pnpm', 'npm', 'yarn', 'bun']) {
    const writes = JSON.stringify(installs[name] ?? {});
    const file = join(dir, name);
    writeFileSync(
      file,
      [
        '#!/usr/bin/env node',
        "const fs = require('node:fs');",
        "const path = require('node:path');",
        `fs.appendFileSync(${JSON.stringify(log)}, ${JSON.stringify(name)} + ' ' + process.argv.slice(2).join(' ') + ' in ' + process.cwd() + '\\n');`,
        fail
          ? "console.error('ERR_FAKE install exploded'); process.exit(1);"
          : `if (process.argv[2] === 'install') for (const [rel, text] of Object.entries(${writes})) fs.writeFileSync(path.join(process.cwd(), rel), text);`,
        '',
      ].join('\n'),
      { mode: 0o755 },
    );
  }
  const env = { ...process.env, PATH: `${dir}${delimiter}${process.env.PATH ?? ''}` };
  const calls = () => {
    try {
      return readFileSync(log, 'utf8').split('\n').filter(Boolean);
    } catch {
      return [];
    }
  };
  return { env, calls };
}

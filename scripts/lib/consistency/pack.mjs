/** @internal — live stage for scripts/eval-consistency.mjs (hds#344). Builds, packs and installs; not imported by `pnpm test`. */
/**
 * The pack pin, following scripts/smoke-consumer.mjs: build the library, `npm
 * pack` it, and install THAT tarball (plus the declared peers) into a clean
 * copy of the template for each app, so a generated app is built against what
 * a consumer would get from the registry, not against the source tree.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { installFailureMessage, peerSpecs } from './live-plan.mjs';
import { stageApp } from './stage.mjs';

// npm, pnpm and npx are .cmd shims on Windows and cannot be spawned by bare name.
const shell = process.platform === 'win32';
const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell, ...opts });

function fail(what, r) {
  const tail = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-15).join('\n');
  throw new Error(`${what} failed (exit ${r.status}):\n${tail}`);
}

/**
 * @param {{ root:string, packDir:string, skipBuild:boolean }} o
 * @returns {{ tarball:string, sha256:string, version:string, pkg:object }}
 */
export function packLibrary({ root, packDir, skipBuild }) {
  mkdirSync(packDir, { recursive: true });
  if (skipBuild) {
    if (!readdirSync(packDir).some((f) => f.endsWith('.tgz'))) {
      throw new Error(
        `--skip-build found no tarball in ${path.relative(root, packDir)}. ` +
          'Run once without --skip-build to build and pack the library.',
      );
    }
  } else {
    for (const f of readdirSync(packDir)) if (f.endsWith('.tgz')) rmSync(path.join(packDir, f));
    const built = run('pnpm', ['build:lib'], { cwd: root });
    if (built.status !== 0) fail('pnpm build:lib', built);
    const packed = run('npm', ['pack', '--pack-destination', packDir, '--silent'], { cwd: root });
    if (packed.status !== 0) fail('npm pack', packed);
  }
  const files = readdirSync(packDir).filter((f) => f.endsWith('.tgz'));
  if (files.length !== 1) {
    throw new Error(`expected exactly one tarball in ${packDir}, found ${files.length}`);
  }
  const tarball = path.join(packDir, files[0]);
  const sha256 = createHash('sha256').update(readFileSync(tarball)).digest('hex');
  const manifest = run('tar', ['-xzOf', tarball, 'package/package.json']);
  if (manifest.status !== 0) fail('reading package.json from the tarball', manifest);
  const pkg = JSON.parse(manifest.stdout);
  return { tarball, sha256, version: pkg.version, pkg };
}

/** The scratch directory the per-app copies live in. */
export function makeScratch() {
  return mkdtempSync(path.join(tmpdir(), 'hds-consistency-'));
}

/** Copy the template, lay the app's src over it, and install the tarball and peers. */
export function prepareApp({ templateDir, scratch, app, packed }) {
  const dest = path.join(scratch, app.id);
  const { ignored } = stageApp(templateDir, app.dir, dest);
  const installed = run(
    'npm',
    [
      'install',
      packed.tarball,
      ...peerSpecs(packed.pkg),
      '--no-audit',
      '--no-fund',
      '--loglevel',
      'error',
    ],
    { cwd: dest },
  );
  if (installed.status !== 0) {
    throw new Error(installFailureMessage(`${installed.stdout}${installed.stderr}`));
  }
  return { dir: dest, ignored };
}

export function gitCommit(root) {
  const r = run('git', ['rev-parse', 'HEAD'], { cwd: root });
  if (r.status !== 0) fail('git rev-parse HEAD', r);
  return r.stdout.trim();
}

export function gitDirty(root) {
  const r = run('git', ['status', '--porcelain'], { cwd: root });
  return r.status === 0 && r.stdout.trim().length > 0;
}

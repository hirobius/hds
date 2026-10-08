/**
 * project — what a consumer repo looks like to the upgrade command (hds#452):
 * its package manager, its lockfile, every importer that declares
 * @hirobius/design-system, and the version each one has installed.
 *
 * Node builtins only. An importer is the root package or a workspace package
 * (pnpm-workspace.yaml, or package.json `workspaces` for npm, yarn and bun).
 * The installed version comes from, in order: the lockfile, the importer's
 * node_modules copy, `--from`. A lockfile at git HEAD or at the merge-base with
 * the default branch that holds an older version wins (the dependency was
 * bumped by hand and not yet committed or merged); when the lockfile already
 * says the target, the lockfile's own first-parent history is read too. An
 * explicit `--from` skips git. A version read from history below the floor
 * becomes the floor, with `belowFloor` set: only a version actually installed
 * is refused for it.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { HDS_PACKAGE, lockfileKind, pickLockfile, readLockfile } from './installed-version.mjs';
import { compareVersions, isVersion } from './semver.mjs';

const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const SKIP = new Set(['node_modules', '.git']);

function readJsonFile(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** The range an importer's package.json declares for HDS, from its first field that has one. */
export function declaredRange(pkg) {
  for (const field of DEP_FIELDS) {
    const range = pkg?.[field]?.[HDS_PACKAGE];
    if (typeof range === 'string') return range;
  }
  return null;
}

/** One YAML scalar: its trailing ` # comment` dropped, then unquoted. */
function yamlScalar(raw) {
  const text = raw.trim();
  const quoted = /^(['"])(.*?)\1/.exec(text);
  if (quoted) return quoted[2];
  return text.replace(/\s+#.*$/, '').trim();
}

/** `packages:` of pnpm-workspace.yaml, as a block list or a flow list (`[a, b]`), unquoted. */
function pnpmWorkspaceGlobs(text) {
  const globs = [];
  let inPackages = false;
  for (const line of text.split(/\r?\n/)) {
    const head = /^packages\s*:\s*(.*)$/.exec(line);
    if (head) {
      const rest = head[1].replace(/^#.*$/, '').trim();
      const flow = /^\[(.*)\]/.exec(rest);
      if (flow) {
        for (const item of flow[1].split(',')) {
          const glob = yamlScalar(item);
          if (glob) globs.push(glob);
        }
        return globs;
      }
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    if (/^[^\s#-]/.test(line)) break;
    const item = /^\s*-\s*(.+?)\s*$/.exec(line);
    if (item) {
      const glob = yamlScalar(item[1]);
      if (glob) globs.push(glob);
    }
  }
  return globs;
}

/** Directories (relative, posix) under `root` that a workspace glob names. */
function expandGlob(root, glob) {
  const segments = glob
    .replace(/\/+$/, '')
    .split('/')
    .filter((s) => s && s !== '.');
  const out = new Set();
  const subdirs = (dir) => {
    try {
      return readdirSync(join(root, dir), { withFileTypes: true })
        .filter((e) => e.isDirectory() && !SKIP.has(e.name))
        .map((e) => (dir ? `${dir}/${e.name}` : e.name));
    } catch {
      return [];
    }
  };
  const step = (dir, i) => {
    if (i === segments.length) {
      out.add(dir);
      return;
    }
    const seg = segments[i];
    if (seg === '**') {
      step(dir, i + 1);
      for (const sub of subdirs(dir)) step(sub, i);
      return;
    }
    if (!/[*?]/.test(seg)) {
      const next = dir ? `${dir}/${seg}` : seg;
      if (existsSync(join(root, next))) step(next, i + 1);
      return;
    }
    const re = new RegExp(
      `^${seg
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]')}$`,
    );
    for (const sub of subdirs(dir))
      if (re.test(sub.slice(sub.lastIndexOf('/') + 1))) step(sub, i + 1);
  };
  step('', 0);
  return [...out];
}

const hasPackageJson = (root, dir) => existsSync(join(root, ...dir.split('/'), 'package.json'));

/** The workspace globs a root declares, whichever manager wrote them. */
function workspaceGlobs(root, rootPkg) {
  const yaml = join(root, 'pnpm-workspace.yaml');
  if (existsSync(yaml)) return pnpmWorkspaceGlobs(readFileSync(yaml, 'utf8'));
  const ws = rootPkg?.workspaces;
  if (Array.isArray(ws)) return ws;
  if (Array.isArray(ws?.packages)) return ws.packages;
  return [];
}

/**
 * Every importer under `root` that declares HDS, root first, then by directory.
 * @returns {{ dir: string, abs: string, pkg: any, range: string, nested: string[] }[]}
 */
export function findImporters(root) {
  const rootPkg = readJsonFile(join(root, 'package.json'));
  const globs = workspaceGlobs(root, rootPkg);
  const include = new Set();
  const exclude = new Set();
  for (const glob of globs) {
    const negated = glob.startsWith('!');
    for (const dir of expandGlob(root, negated ? glob.slice(1) : glob)) {
      (negated ? exclude : include).add(dir);
    }
  }
  const dirs = [
    ...new Set([
      '.',
      ...[...include].filter((d) => d && !exclude.has(d) && hasPackageJson(root, d)).sort(),
    ]),
  ];
  const absOf = (dir) => (dir === '.' ? root : join(root, ...dir.split('/')));
  const out = [];
  for (const dir of dirs) {
    const abs = absOf(dir);
    const pkg = dir === '.' ? rootPkg : readJsonFile(join(abs, 'package.json'));
    const range = declaredRange(pkg);
    if (range === null) continue;
    // Workspace packages inside this one are importers of their own: never scan them twice.
    const nested = dirs
      .filter((d) => d !== dir && (dir === '.' || d.startsWith(`${dir}/`)))
      .map(absOf);
    out.push({ dir, abs, pkg, range, nested });
  }
  return out;
}

/**
 * The workspace that `root` is a package of, when a parent directory declares
 * one (pnpm-workspace.yaml, or package.json `workspaces`) whose globs name it:
 * `{ dir, rel }`, the workspace root and root's path in it (posix), or null.
 * Only the nearest parent that declares a workspace is asked.
 */
export function enclosingWorkspace(root) {
  const abs = resolve(root);
  for (let dir = dirname(abs); ; dir = dirname(dir)) {
    const pkg = readJsonFile(join(dir, 'package.json'));
    const globs = workspaceGlobs(dir, pkg);
    if (globs.length > 0 || existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      const rel = relative(dir, abs).split(sep).join('/');
      const names = (negated) =>
        new Set(
          globs
            .filter((g) => g.startsWith('!') === negated)
            .flatMap((g) => expandGlob(dir, negated ? g.slice(1) : g)),
        );
      return names(false).has(rel) && !names(true).has(rel) ? { dir, rel } : null;
    }
    if (dirname(dir) === dir) return null;
  }
}

/** The package manager and lockfile at a root (lockfile null when there is none to read). */
export function detectManager(root, rootPkg) {
  let names = [];
  try {
    names = readdirSync(root);
  } catch {
    // an unreadable root has no lockfile
  }
  const lockfile = pickLockfile(names, rootPkg?.packageManager);
  const declared = String(rootPkg?.packageManager ?? '').split('@')[0];
  const manager =
    (lockfile && lockfileKind(lockfile)) ||
    (['pnpm', 'npm', 'yarn', 'bun'].includes(declared) ? declared : null) ||
    (names.includes('bun.lockb') ? 'bun' : null);
  return { manager, lockfile };
}

/** Read the lockfile at a root, or null; `ranges` feeds yarn v1 (importer dir → declared range). */
export function readRootLockfile(root, lockfile, importers) {
  if (!lockfile) return null;
  try {
    const ranges = Object.fromEntries(importers.map((i) => [i.dir, i.range]));
    return readLockfile(lockfile, readFileSync(join(root, lockfile), 'utf8'), { ranges });
  } catch {
    return null;
  }
}

/** The version an importer's node_modules (or the hoisted root copy) holds, or null. */
export function nodeModulesVersion(root, importer) {
  for (const base of [importer.abs, root]) {
    const pkg = readJsonFile(join(base, 'node_modules', ...HDS_PACKAGE.split('/'), 'package.json'));
    if (isVersion(pkg?.version)) return pkg.version;
  }
  return null;
}

// ── git ──────────────────────────────────────────────────────────────────────

const GIT_MAX_BUFFER = 512 * 1024 * 1024;
/** How many commits that touched the lockfile to read back, newest first. */
const LOG_DEPTH = 200;

/** git with GIT_* stripped (a hook's GIT_DIR must not point it elsewhere) and cwd = root. */
function git(root, args) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  try {
    // A real lockfile is often several MiB: the default 1 MiB maxBuffer would
    // kill `git show` and lose the old version without a word.
    const res = spawnSync('git', args, {
      cwd: root,
      env,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: GIT_MAX_BUFFER,
    });
    if (res.error) return null;
    return res.status === 0 ? res.stdout : null;
  } catch {
    return null;
  }
}

/** The default branch to take a merge-base with: origin's HEAD, else main or master. */
function defaultBranch(root) {
  const head = git(root, ['symbolic-ref', '--quiet', 'refs/remotes/origin/HEAD']);
  if (head) return head.trim().replace(/^refs\/remotes\//, '');
  for (const name of ['origin/main', 'origin/master', 'main', 'master']) {
    if (git(root, ['rev-parse', '--verify', '--quiet', `${name}^{commit}`])) return name;
  }
  return null;
}

/**
 * The git revisions to recover an old lockfile from: HEAD, then the
 * merge-base with the default branch (when it differs). `null` when root is
 * not in a git work tree or has no commit.
 * @returns {{ rev: string, source: 'git-head' | 'git-merge-base' }[] | null}
 */
export function historyRevisions(root) {
  const head = git(root, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'])?.trim();
  if (!head) return null;
  const revs = [{ rev: head, source: 'git-head' }];
  const branch = defaultBranch(root);
  const base = branch ? git(root, ['merge-base', 'HEAD', branch])?.trim() : null;
  if (base && base !== head) revs.push({ rev: base, source: 'git-merge-base' });
  return revs;
}

/**
 * The commits that changed the lockfile, newest first along HEAD's first
 * parents: where the old version is when the bump is already committed on the
 * default branch, so HEAD and the merge-base both say the target.
 */
function lockfileCommits(root, lockfile) {
  const out = git(root, [
    'log',
    '--first-parent',
    `--max-count=${LOG_DEPTH}`,
    '--format=%H',
    'HEAD',
    '--',
    lockfile,
  ]);
  return out ? out.split('\n').filter(Boolean) : [];
}

/** An importer's HDS version in the lockfile as it was at `rev`, or null. */
export function versionAtRevision(root, rev, lockfile, importer) {
  const text = git(root, ['show', `${rev}:./${lockfile}`]);
  if (text === null) return null;
  let ranges = { [importer.dir]: importer.range };
  if (lockfile === 'yarn.lock') {
    const path = importer.dir === '.' ? 'package.json' : `${importer.dir}/package.json`;
    const old = git(root, ['show', `${rev}:./${path}`]);
    try {
      ranges = { [importer.dir]: declaredRange(JSON.parse(old)) };
    } catch {
      // keep today's range
    }
  }
  try {
    const v = readLockfile(lockfile, text, { ranges }).importers[importer.dir];
    return isVersion(v) ? v : null;
  } catch {
    return null;
  }
}

/**
 * The version each importer upgrades from, and where it was read.
 * `noHistory` is set when the version is already the target and nothing says
 * which one it was upgraded from: 'none' (no git, or nothing in it to read) or
 * 'at-target' (every commit of the lockfile says the target). `belowFloor`
 * holds a version read from history older than `floor`, which `from` replaces.
 * @param {{ root: string, lockfile: string|null, lock: any, importers: any[], target: string, floor?: string, from?: string }} ctx
 * @returns {{ from: string|null, source: string, noHistory?: 'none'|'at-target', belowFloor?: string }[]}
 */
export function installedVersions({ root, lockfile, lock, importers, target, floor, from }) {
  let revisions;
  let touched;
  const history = () =>
    revisions === undefined ? (revisions = historyRevisions(root)) : revisions;
  const commits = () =>
    touched === undefined ? (touched = lockfileCommits(root, lockfile)) : touched;
  const recovered = (old, source) =>
    floor && compareVersions(old, floor) < 0
      ? { from: floor, source, belowFloor: old }
      : { from: old, source };
  return importers.map((importer) => {
    const locked = lock?.importers?.[importer.dir];
    let found = null;
    if (isVersion(locked)) found = { from: locked, source: 'lockfile' };
    else {
      const nm = nodeModulesVersion(root, importer);
      if (nm) found = { from: nm, source: 'node_modules' };
    }
    if (!found)
      return isVersion(from) ? { from, source: 'flag' } : { from: null, source: 'unknown' };
    const atTarget = compareVersions(found.from, target) === 0;
    // An explicit --from beats anything inferred from history.
    if (isVersion(from)) return atTarget ? { from, source: 'flag' } : found;
    const revs = lockfile && found.source === 'lockfile' ? history() : null;
    if (revs) {
      // An older lockfile at HEAD or the merge-base: bumped by hand, not yet committed or merged.
      for (const { rev, source } of revs) {
        const old = versionAtRevision(root, rev, lockfile, importer);
        if (old && compareVersions(old, found.from) < 0) return recovered(old, source);
      }
      if (atTarget) {
        for (const rev of commits()) {
          const old = versionAtRevision(root, rev, lockfile, importer);
          if (old && compareVersions(old, target) < 0) return recovered(old, 'git-log');
        }
      }
    }
    if (!atTarget) return found;
    // No history below the target (or none readable): say so, never a silent from = target.
    const readable = revs !== null && revs !== undefined && commits().length > 0;
    return { ...found, noHistory: readable ? 'at-target' : 'none' };
  });
}

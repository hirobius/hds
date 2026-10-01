#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * consumers.mjs — find every HDS consumer from the GitHub API (hds#453).
 *
 * A consumer is a repo in the org, other than hirobius/hds, whose root
 * package.json or a workspace package.json lists @hirobius/design-system. The
 * rule is written down in upgrade/README.md ("Who is a consumer") so the ops
 * dashboard (hirobius/ops#444) applies the same one.
 *
 * Nothing is committed: hds is public and most consumers are private, so the
 * result stays in memory. `redact()` is the only shape that may reach a public
 * surface (PR comments, Actions logs): it names public repos and reduces each
 * private one to "private consumer N" with counts.
 *
 *   pnpm upgrade:consumers                 redacted summary
 *   pnpm upgrade:consumers --json          redacted JSON
 *   pnpm upgrade:consumers --out [path]    also write the FULL list to a
 *                                          gitignored file (default
 *                                          .upgrade-consumers.json)
 *   --org <org>                            default hirobius
 *
 * Token: HDS_FLEET_TOKEN (fine-grained: Contents read, Metadata read on the
 * org's repositories), falling back to GITHUB_TOKEN outside GitHub Actions.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  HDS_PACKAGE,
  lockfileKind,
  pickLockfile,
  readLockfile,
} from '../../codemods/lib/installed-version.mjs';

const API = 'https://api.github.com';
export const DEFAULT_ORG = 'hirobius';
export const SELF_REPO = 'hirobius/hds';
export const FROZEN_TOPIC = 'hds-frozen';

const RAW = 'application/vnd.github.raw';
const JSON_MEDIA = 'application/vnd.github+json';
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'];

// ── token ────────────────────────────────────────────────────────────────────

export const TOKEN_VAR = 'HDS_FLEET_TOKEN';
const PAT_URL = 'https://github.com/settings/personal-access-tokens';
const SECRETS_URL = 'https://github.com/hirobius/hds/settings/secrets/actions';

/**
 * The token to read the fleet with, and the variable it came from, or null.
 * GITHUB_TOKEN is a local fallback only: inside GitHub Actions it is the
 * workflow token, which sees hds alone and would miss every other repo.
 *
 * @param {Record<string, string|undefined>} [env]
 * @returns {{ name: string, value: string } | null}
 */
export function fleetToken(env = process.env) {
  const names = env.GITHUB_ACTIONS === 'true' ? [TOKEN_VAR] : [TOKEN_VAR, 'GITHUB_TOKEN'];
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return { name, value };
  }
  return null;
}

const TOKEN_FIX =
  `Create a fine-grained token at ${PAT_URL} (resource owner hirobius, all repositories, ` +
  'Contents: Read-only and Metadata: Read-only; add Issues: Read and write for release notices), ' +
  `then save it as the ${TOKEN_VAR} repository secret at ${SECRETS_URL}. ` +
  `Locally: ${TOKEN_VAR}=<token> pnpm upgrade:consumers`;

/** An error that ends the whole run: no repo can be read past it. */
class FatalError extends Error {}

function missingToken() {
  return new FatalError(
    `${TOKEN_VAR} is not set (GITHUB_TOKEN is accepted locally, outside GitHub Actions). ${TOKEN_FIX}`,
  );
}

/** 401/403/429 answers: a token to fix or a rate limit to wait out. Never retried. */
function fatalFor(res, tokenVar, org) {
  const remaining = res.headers.get('x-ratelimit-remaining');
  const retryAfter = res.headers.get('retry-after');
  if (res.status === 429 || (res.status === 403 && (remaining === '0' || retryAfter))) {
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    const when = retryAfter
      ? `in ${retryAfter} seconds`
      : Number.isFinite(reset) && reset > 0
        ? `at ${new Date(reset * 1000).toISOString()}`
        : 'within the hour';
    return new FatalError(
      `GitHub API rate limit reached for ${tokenVar}; it resets ${when}. ` +
        'Nothing was retried: run pnpm upgrade:consumers again after the reset.',
    );
  }
  if (res.status === 401) {
    return new FatalError(
      `${tokenVar} was rejected by GitHub (401: expired or revoked). ${TOKEN_FIX}`,
    );
  }
  if (res.status === 403) {
    return new FatalError(
      `${tokenVar} is not allowed to read the ${org} repositories (403). ${TOKEN_FIX}`,
    );
  }
  return null;
}

// ── GitHub requests ──────────────────────────────────────────────────────────

function client({ token, tokenVar, org, fetch }) {
  async function request(url, accept) {
    const res = await fetch(url, {
      headers: {
        Accept: accept,
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'hirobius-hds-upgrade-consumers',
      },
    });
    const fatal = fatalFor(res, tokenVar, org);
    if (fatal) throw fatal;
    return res;
  }

  /** Parsed JSON, or null on 404/409 (missing file, empty repository). */
  async function getJson(url) {
    const res = await request(url, JSON_MEDIA);
    if (res.status === 404 || res.status === 409) return null;
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    return { body: await res.json(), headers: res.headers };
  }

  /** A file's text through the raw media type (any size), or null when absent. */
  async function getRaw(fullName, filePath, ref) {
    const encoded = filePath.split('/').map(encodeURIComponent).join('/');
    const url = `${API}/repos/${fullName}/contents/${encoded}?ref=${encodeURIComponent(ref)}`;
    const res = await request(url, RAW);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${filePath}`);
    return res.text();
  }

  return { getJson, getRaw };
}

function nextLink(headers) {
  const link = headers.get('link') ?? '';
  return /<([^>]+)>;\s*rel="next"/.exec(link)?.[1] ?? null;
}

async function listPages(gh, firstUrl) {
  const items = [];
  let url = firstUrl;
  while (url) {
    const page = await gh.getJson(url);
    if (!page) return url === firstUrl ? null : items;
    items.push(...page.body);
    url = nextLink(page.headers);
  }
  return items;
}

/** The org's repositories; a user account answers 404 there, so list the token's own. */
async function listRepos(gh, org) {
  const orgRepos = await listPages(
    gh,
    `${API}/orgs/${encodeURIComponent(org)}/repos?per_page=100&type=all`,
  );
  if (orgRepos) return orgRepos;
  const mine = await listPages(
    gh,
    `${API}/user/repos?per_page=100&affiliation=owner,organization_member`,
  );
  return (mine ?? []).filter((r) => r.owner?.login?.toLowerCase() === org.toLowerCase());
}

// ── workspaces ───────────────────────────────────────────────────────────────

/** Workspace globs from package.json `workspaces` and pnpm-workspace.yaml `packages`. */
function workspaceGlobs(rootPkg, pnpmWorkspace) {
  const ws = rootPkg.workspaces;
  const globs = Array.isArray(ws) ? [...ws] : Array.isArray(ws?.packages) ? [...ws.packages] : [];
  if (pnpmWorkspace) {
    // `packages:` is a block list (indented or not) or a flow list.
    let inPackages = false;
    for (const line of pnpmWorkspace.split(/\r?\n/)) {
      if (/^\s*(#|$)/.test(line)) continue;
      const item = /^\s*-\s*(.+?)\s*$/.exec(line);
      if (item) {
        if (inPackages) globs.push(unquote(item[1]));
      } else if (/^\S/.test(line)) {
        inPackages = /^packages:/.test(line);
        const flow = /^packages:\s*\[(.*)\]/.exec(line);
        if (flow) globs.push(...flow[1].split(',').map(unquote).filter(Boolean));
      }
    }
  }
  return globs.map((g) => g.replace(/^\.\//, '').replace(/\/+$/, '')).filter(Boolean);
}

function unquote(value) {
  const v = value.replace(/\s+#.*$/, '').trim();
  return /^(['"]).*\1$/.test(v) ? v.slice(1, -1) : v;
}

/** `apps/*` → one segment, `**` → any depth; matched against a whole directory path. */
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === '*' && glob[i + 1] === '*') {
      re += '.*';
      i += 1;
      if (glob[i + 1] === '/') i += 1;
    } else if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else re += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

/** Directories holding a package.json that the workspace globs include. */
function matchWorkspaces(treePaths, globs) {
  const include = globs.filter((g) => !g.startsWith('!')).map(globToRegExp);
  const exclude = globs.filter((g) => g.startsWith('!')).map((g) => globToRegExp(g.slice(1)));
  return treePaths
    .filter((p) => p.endsWith('/package.json'))
    .map((p) => p.slice(0, -'/package.json'.length))
    .filter((dir) => !dir.split('/').includes('node_modules'))
    .filter((dir) => include.some((re) => re.test(dir)) && !exclude.some((re) => re.test(dir)))
    .sort();
}

// ── one repository ───────────────────────────────────────────────────────────

function hdsDependency(pkg) {
  for (const field of DEP_FIELDS) {
    const range = pkg?.[field]?.[HDS_PACKAGE];
    if (typeof range === 'string') return { field, range };
  }
  return null;
}

function parsePackageJson(text, where) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${where} is not valid JSON`);
  }
}

async function scanRepo(gh, repo) {
  const fullName = repo.full_name;
  const ref = repo.default_branch;
  const listing = await gh.getJson(
    `${API}/repos/${fullName}/contents?ref=${encodeURIComponent(ref)}`,
  );
  if (!listing || !Array.isArray(listing.body)) return null;
  const rootFiles = listing.body.filter((e) => e.type === 'file').map((e) => e.name);
  if (!rootFiles.includes('package.json')) return null;

  const rootText = await gh.getRaw(fullName, 'package.json', ref);
  if (rootText === null) return null;
  const rootPkg = parsePackageJson(rootText, 'package.json');
  const warnings = [];

  const pnpmWorkspace = rootFiles.includes('pnpm-workspace.yaml')
    ? await gh.getRaw(fullName, 'pnpm-workspace.yaml', ref)
    : null;
  const globs = workspaceGlobs(rootPkg, pnpmWorkspace);
  const dirs = ['.'];
  if (globs.length) {
    const tree = await gh.getJson(
      `${API}/repos/${fullName}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    );
    const paths = (tree?.body?.tree ?? []).filter((e) => e.type === 'blob').map((e) => e.path);
    if (tree?.body?.truncated) warnings.push('tree truncated: some workspaces may be missing');
    dirs.push(...matchWorkspaces(paths, globs));
  }

  const importers = [];
  for (const dir of dirs) {
    const pkg =
      dir === '.'
        ? rootPkg
        : await gh
            .getRaw(fullName, `${dir}/package.json`, ref)
            .then((text) => (text === null ? null : parsePackageJson(text, `${dir}/package.json`)));
    const dep = hdsDependency(pkg);
    if (dep) importers.push({ path: dir, name: pkg.name ?? null, ...dep, resolved: null });
  }
  if (importers.length === 0) return null;

  let lockfile = null;
  let versions = [];
  const lockName = pickLockfile(rootFiles, rootPkg.packageManager);
  const text = lockName ? await gh.getRaw(fullName, lockName, ref) : null;
  if (text !== null) {
    const ranges = Object.fromEntries(importers.map((i) => [i.path, i.range]));
    try {
      const lock = readLockfile(lockName, text, { ranges });
      lockfile = { path: lockName, kind: lock.kind, version: lock.version };
      versions = lock.versions;
      for (const importer of importers) importer.resolved = lock.importers[importer.path] ?? null;
    } catch {
      lockfile = { path: lockName, kind: lockfileKind(lockName), version: null };
      warnings.push(`${lockName} could not be parsed`);
    }
  }

  const frozen = (repo.topics ?? []).includes(FROZEN_TOPIC);
  const skip = [];
  if (repo.archived) skip.push('archived');
  if (repo.has_issues === false) skip.push('issues-disabled');
  if (frozen) skip.push(FROZEN_TOPIC);

  return {
    repo: fullName,
    private: Boolean(repo.private),
    archived: Boolean(repo.archived),
    hasIssues: repo.has_issues !== false,
    frozen,
    skip,
    defaultBranch: ref,
    lockfile,
    versions,
    importers,
    warnings,
  };
}

// ── redaction ────────────────────────────────────────────────────────────────

/**
 * The shape that may reach a public surface. Public repos are kept whole;
 * each private one is rebuilt from an allowlist of fields that carry no name
 * or path ("private consumer N", its flags, lockfile kind, versions, and per
 * importer only the field, range and resolved version). Public repos come
 * first so a private repo's position says nothing about its name.
 *
 * @param {Awaited<ReturnType<typeof discoverConsumers>>} result
 */
export function redact(result) {
  const publicOnes = result.consumers.filter((c) => !c.private);
  const privateOnes = result.consumers
    .filter((c) => c.private)
    .map((c, i) => ({
      repo: `private consumer ${i + 1}`,
      private: true,
      archived: c.archived,
      hasIssues: c.hasIssues,
      frozen: c.frozen,
      skip: [...c.skip],
      lockfile: c.lockfile && { kind: c.lockfile.kind, version: c.lockfile.version },
      versions: [...c.versions],
      importers: c.importers.map((imp) => ({
        field: imp.field,
        range: imp.range,
        resolved: imp.resolved,
      })),
    }));
  let privateErrors = 0;
  const errors = result.errors.map((e) =>
    e.private
      ? { repo: `private repo ${++privateErrors}`, private: true, message: 'could not be read' }
      : { ...e },
  );
  return {
    org: result.org,
    scanned: result.scanned,
    counts: {
      consumers: result.consumers.length,
      public: publicOnes.length,
      private: privateOnes.length,
      skipped: result.consumers.filter((c) => c.skip.length > 0).length,
      errors: errors.length,
    },
    consumers: [...publicOnes.map((c) => structuredClone(c)), ...privateOnes],
    errors,
  };
}

// ── discovery ────────────────────────────────────────────────────────────────

/**
 * Every repository in `org` the token can see that depends on HDS.
 *
 * Throws, naming the variable and the fix, when the token is missing, rejected
 * or rate-limited; a repo that fails otherwise is listed in `errors` and the
 * run goes on.
 *
 * @param {{ token?: string, tokenVar?: string, org?: string,
 *   fetch?: typeof globalThis.fetch }} options
 *   `tokenVar` is the variable the token came from, for messages.
 */
export async function discoverConsumers({
  token,
  tokenVar = TOKEN_VAR,
  org = DEFAULT_ORG,
  fetch = globalThis.fetch,
} = {}) {
  if (!token) throw missingToken();
  const gh = client({ token, tokenVar, org, fetch });
  const repos = (await listRepos(gh, org))
    .filter((r) => r.full_name.toLowerCase() !== SELF_REPO)
    .sort((a, b) => (a.full_name < b.full_name ? -1 : 1));
  const consumers = [];
  const errors = [];
  for (const repo of repos) {
    try {
      const found = await scanRepo(gh, repo);
      if (found) consumers.push(found);
    } catch (error) {
      if (error instanceof FatalError) throw error;
      errors.push({ repo: repo.full_name, private: Boolean(repo.private), message: error.message });
    }
  }
  return { org, scanned: repos.length, consumers, errors };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

/** Where `--out` writes the full, unredacted list by default (gitignored). */
export const DEFAULT_OUT = '.upgrade-consumers.json';
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function describeImporters(c) {
  return c.importers
    .map((imp) => {
      const where = imp.path ? `${imp.path} ` : '';
      return `${where}${imp.range} -> ${imp.resolved ?? '?'}`;
    })
    .join('; ');
}

/** One line per consumer, built from the redacted result only. */
function formatSummary(redacted) {
  const { counts } = redacted;
  const lines = [
    `HDS consumers in ${redacted.org}: ${counts.consumers} of ${redacted.scanned} repos ` +
      `(${counts.public} public, ${counts.private} private; ${counts.skipped} marked skip).`,
  ];
  for (const c of redacted.consumers) {
    const notes = [];
    if (c.skip.length) notes.push(`skip: ${c.skip.join(', ')}`);
    if (c.versions.length > 1) notes.push(`${c.versions.length} copies: ${c.versions.join(', ')}`);
    const lock = c.lockfile ? c.lockfile.kind : 'no lockfile';
    lines.push(
      `  ${c.repo}: ${describeImporters(c)} (${lock})${notes.length ? ` [${notes.join('; ')}]` : ''}`,
    );
  }
  for (const e of redacted.errors) lines.push(`  could not read ${e.repo}: ${e.message}`);
  return `${lines.join('\n')}\n`;
}

/** Whether a path inside this repo is gitignored; a path outside it always may be written. */
function mayHoldFullList(file) {
  const rel = path.relative(REPO_ROOT, path.resolve(file));
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return true;
  try {
    execFileSync('git', ['check-ignore', '-q', '--', rel], { cwd: REPO_ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const args = { org: DEFAULT_ORG, json: false, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--org') {
      args.org = argv[++i];
      if (!args.org || args.org.startsWith('--')) throw new Error('--org needs an org name');
    } else if (arg === '--out') {
      const next = argv[i + 1];
      args.out = next && !next.startsWith('--') ? argv[++i] : DEFAULT_OUT;
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

/**
 * @param {string[]} argv
 * @param {{ env?: Record<string, string|undefined>, fetch?: typeof globalThis.fetch,
 *   stdout?: { write(s: string): unknown }, stderr?: { write(s: string): unknown } }} [io]
 * @returns {Promise<number>} 0 found, 1 token/rate-limit failure or unreadable repos, 2 usage
 */
export async function main(argv, io = {}) {
  const {
    env = process.env,
    fetch = globalThis.fetch,
    stdout = process.stdout,
    stderr = process.stderr,
  } = io;
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 2;
  }
  if (args.out && !mayHoldFullList(args.out)) {
    stderr.write(
      `${args.out} is not gitignored, and the full list names private repos. ` +
        `Write it to ${DEFAULT_OUT} (gitignored) or outside the repo.\n`,
    );
    return 2;
  }
  const token = fleetToken(env);
  let result;
  try {
    result = await discoverConsumers({
      token: token?.value,
      tokenVar: token?.name,
      org: args.org,
      fetch,
    });
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 1;
  }
  if (args.out) writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`);
  const redacted = redact(result);
  stdout.write(args.json ? `${JSON.stringify(redacted, null, 2)}\n` : formatSummary(redacted));
  if (args.out) stdout.write(`Full list (private names included) written to ${args.out}.\n`);
  return result.errors.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}

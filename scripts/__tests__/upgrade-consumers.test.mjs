/**
 * Tests for scripts/upgrade/consumers.mjs (hds#453): every repo in the org
 * that depends on @hirobius/design-system is found from the GitHub API alone,
 * and the names of private repos never reach a public surface.
 *
 * GitHub is the in-memory fake in helpers/fake-github.mjs; nothing here
 * touches the network. Repo names other than ops, folio and hds are invented
 * (`example-*`) so this public file names no real consumer.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_OUT, discoverConsumers, fleetToken, main, redact } from '../upgrade/consumers.mjs';
import { fakeGitHub } from './helpers/fake-github.mjs';

const TOKEN = 'test-token';
const pkg = (body) => JSON.stringify(body, null, 2);

const OPS_LOCK = `lockfileVersion: '9.0'

importers:

  .:
    dependencies:
      '@hirobius/design-system':
        specifier: ^0.16.0
        version: 0.16.0(react@18.3.1)

packages:

  '@hirobius/design-system@0.16.0':
    resolution: {integrity: sha512-aaa}
`;

const OPS = {
  name: 'ops',
  files: {
    'package.json': pkg({
      name: '@hirobius/ops',
      dependencies: { '@hirobius/design-system': '^0.16.0' },
    }),
    'pnpm-lock.yaml': OPS_LOCK,
    'README.md': '# ops',
  },
};

const FOLIO = {
  name: 'folio',
  files: {
    'package.json': pkg({
      name: 'portfolio',
      dependencies: { '@hirobius/design-system': '^0.16.0' },
    }),
    'package-lock.json': pkg({
      name: 'portfolio',
      lockfileVersion: 3,
      packages: {
        '': { name: 'portfolio', dependencies: { '@hirobius/design-system': '^0.16.0' } },
        'node_modules/@hirobius/design-system': { version: '0.16.0' },
      },
    }),
  },
};

/** hds itself: it would read as a consumer through its own starter kit. */
const HDS = {
  name: 'hds',
  files: {
    'package.json': pkg({ name: '@hirobius/design-system', workspaces: ['starter-kit'] }),
    'starter-kit/package.json': pkg({ dependencies: { '@hirobius/design-system': 'workspace:*' } }),
  },
};

const PNPM_WORKSPACE = {
  name: 'example-pnpm-workspace',
  files: {
    'package.json': pkg({
      name: 'example-root',
      private: true,
      devDependencies: { '@hirobius/design-system': '^0.16.0' },
    }),
    'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n  - '!apps/sandbox'\n",
    'apps/site/package.json': pkg({
      name: 'site',
      dependencies: { '@hirobius/design-system': '^0.20.0' },
    }),
    'apps/sandbox/package.json': pkg({
      name: 'sandbox',
      dependencies: { '@hirobius/design-system': '^0.20.0' },
    }),
    'apps/docs/package.json': pkg({ name: 'docs', dependencies: { react: '^18.3.1' } }),
    'pnpm-lock.yaml': `lockfileVersion: '9.0'

importers:

  .:
    devDependencies:
      '@hirobius/design-system':
        specifier: ^0.16.0
        version: 0.16.0(react@18.3.1)

  apps/site:
    dependencies:
      '@hirobius/design-system':
        specifier: ^0.20.0
        version: 0.20.0(react@18.3.1)

packages:

  '@hirobius/design-system@0.16.0':
    resolution: {integrity: sha512-aaa}

  '@hirobius/design-system@0.20.0':
    resolution: {integrity: sha512-bbb}
`,
  },
};

const NPM_WORKSPACE = {
  name: 'example-npm-workspace',
  files: {
    'package.json': pkg({ name: 'example-npm', workspaces: { packages: ['packages/*'] } }),
    'packages/ui/package.json': pkg({
      name: 'ui',
      peerDependencies: { '@hirobius/design-system': '>=0.19.0' },
      devDependencies: { '@hirobius/design-system': '^0.19.0' },
    }),
    'packages/node_modules/package.json': pkg({
      dependencies: { '@hirobius/design-system': '^0.1.0' },
    }),
    'package-lock.json': pkg({
      name: 'example-npm',
      lockfileVersion: 3,
      packages: {
        '': { name: 'example-npm', workspaces: ['packages/*'] },
        'packages/ui': { name: 'ui', devDependencies: { '@hirobius/design-system': '^0.19.0' } },
        'packages/ui/node_modules/@hirobius/design-system': { version: '0.19.1' },
      },
    }),
  },
};

const NOT_NODE = { name: 'example-docs-only', files: { 'README.md': '# docs' } };
const NOT_A_CONSUMER = {
  name: 'example-other-app',
  files: { 'package.json': pkg({ name: 'other', dependencies: { react: '^18.3.1' } }) },
};
const EMPTY = { name: 'example-empty', files: {} };

describe('discoverConsumers', () => {
  it('finds root and workspace dependents with their range and installed version, and skips hds itself', async () => {
    const gh = fakeGitHub({
      repos: [HDS, OPS, FOLIO, PNPM_WORKSPACE, NPM_WORKSPACE, NOT_NODE, NOT_A_CONSUMER, EMPTY],
    });
    const result = await discoverConsumers({ token: TOKEN, org: 'hirobius', fetch: gh.fetch });

    expect(result.org).toBe('hirobius');
    expect(result.scanned).toBe(7);
    expect(result.errors).toEqual([]);
    expect(result.consumers.map((c) => c.repo)).toEqual([
      'hirobius/example-npm-workspace',
      'hirobius/example-pnpm-workspace',
      'hirobius/folio',
      'hirobius/ops',
    ]);
    expect(gh.requests.some((r) => r.path.startsWith('/repos/hirobius/hds/'))).toBe(false);

    const byRepo = Object.fromEntries(result.consumers.map((c) => [c.repo, c]));
    expect(byRepo['hirobius/ops']).toEqual({
      repo: 'hirobius/ops',
      private: false,
      archived: false,
      hasIssues: true,
      frozen: false,
      skip: [],
      defaultBranch: 'main',
      lockfile: { path: 'pnpm-lock.yaml', kind: 'pnpm', version: '9.0' },
      versions: ['0.16.0'],
      importers: [
        {
          path: '.',
          name: '@hirobius/ops',
          field: 'dependencies',
          range: '^0.16.0',
          resolved: '0.16.0',
        },
      ],
      warnings: [],
    });
    expect(byRepo['hirobius/folio'].lockfile).toEqual({
      path: 'package-lock.json',
      kind: 'npm',
      version: '3',
    });
    expect(byRepo['hirobius/folio'].importers[0].resolved).toBe('0.16.0');

    // pnpm workspace: a negated glob drops apps/sandbox; the root and one app
    // resolve two different copies.
    const pnpmWs = byRepo['hirobius/example-pnpm-workspace'];
    expect(pnpmWs.importers).toEqual([
      {
        path: '.',
        name: 'example-root',
        field: 'devDependencies',
        range: '^0.16.0',
        resolved: '0.16.0',
      },
      {
        path: 'apps/site',
        name: 'site',
        field: 'dependencies',
        range: '^0.20.0',
        resolved: '0.20.0',
      },
    ]);
    expect(pnpmWs.versions).toEqual(['0.16.0', '0.20.0']);

    // npm workspace (object form): a package under node_modules is never a workspace.
    const npmWs = byRepo['hirobius/example-npm-workspace'];
    expect(npmWs.importers).toEqual([
      {
        path: 'packages/ui',
        name: 'ui',
        field: 'devDependencies',
        range: '^0.19.0',
        resolved: '0.19.1',
      },
    ]);
  });
});

describe('discoverConsumers — skip reasons', () => {
  it('marks archived repos, repos with issues disabled and hds-frozen repos as skip', async () => {
    const consumer = (name, extra) => ({ ...OPS, name, ...extra });
    const gh = fakeGitHub({
      repos: [
        consumer('example-archived', { archived: true }),
        consumer('example-no-issues', { has_issues: false }),
        consumer('example-frozen', { topics: ['react', 'hds-frozen'] }),
        consumer('example-all-three', {
          archived: true,
          has_issues: false,
          topics: ['hds-frozen'],
        }),
        consumer('example-live', { topics: ['react'] }),
      ],
    });
    const { consumers } = await discoverConsumers({ token: TOKEN, fetch: gh.fetch });
    const flags = Object.fromEntries(
      consumers.map((c) => [
        c.repo.split('/')[1],
        { skip: c.skip, archived: c.archived, hasIssues: c.hasIssues, frozen: c.frozen },
      ]),
    );
    expect(flags).toEqual({
      'example-all-three': {
        skip: ['archived', 'issues-disabled', 'hds-frozen'],
        archived: true,
        hasIssues: false,
        frozen: true,
      },
      'example-archived': { skip: ['archived'], archived: true, hasIssues: true, frozen: false },
      'example-frozen': { skip: ['hds-frozen'], archived: false, hasIssues: true, frozen: true },
      'example-live': { skip: [], archived: false, hasIssues: true, frozen: false },
      'example-no-issues': {
        skip: ['issues-disabled'],
        archived: false,
        hasIssues: false,
        frozen: false,
      },
    });
  });
});

describe('discoverConsumers — reads', () => {
  it('reads a lockfile over 1 MB through the raw media type', async () => {
    // Pad the ops lockfile past the 1 MB the contents API will inline as JSON.
    const filler = Array.from(
      { length: 9000 },
      (_, i) =>
        `  filler-package-${i}@1.0.0:\n    resolution: {integrity: sha512-${'x'.repeat(88)}}\n`,
    ).join('\n');
    const bigLock = `${OPS_LOCK}\n${filler}`;
    expect(Buffer.byteLength(bigLock)).toBeGreaterThan(1024 * 1024);
    const gh = fakeGitHub({
      repos: [{ ...OPS, files: { ...OPS.files, 'pnpm-lock.yaml': bigLock } }],
    });

    const { consumers } = await discoverConsumers({ token: TOKEN, fetch: gh.fetch });

    expect(consumers[0].importers[0].resolved).toBe('0.16.0');
    const fileReads = gh.requests.filter((r) => /\/contents\/.+/.test(r.path));
    expect(fileReads.map((r) => r.path)).toEqual([
      '/repos/hirobius/ops/contents/package.json',
      '/repos/hirobius/ops/contents/pnpm-lock.yaml',
    ]);
    for (const read of fileReads) expect(read.accept).toBe('application/vnd.github.raw');
    for (const read of gh.requests) expect(read.authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('pages through the org and reads only at the default branch', async () => {
    const gh = fakeGitHub({
      pageSize: 2,
      repos: [
        { ...NOT_NODE, name: 'example-a' },
        { ...NOT_NODE, name: 'example-b' },
        { ...NOT_NODE, name: 'example-c' },
        { ...OPS, name: 'example-d', default_branch: 'trunk' },
      ],
    });
    const result = await discoverConsumers({ token: TOKEN, fetch: gh.fetch });
    expect(result.scanned).toBe(4);
    expect(result.consumers.map((c) => [c.repo, c.defaultBranch])).toEqual([
      ['hirobius/example-d', 'trunk'],
    ]);
    const listing = gh.requests.filter((r) => r.path === '/orgs/hirobius/repos');
    expect(listing).toHaveLength(2);
    expect(new URL(listing[0].url).searchParams.get('type')).toBe('all');
  });

  it('falls back to the repos the token can see when the org endpoint answers 404', async () => {
    const gh = fakeGitHub({
      orgIsUser: true,
      repos: [OPS, { ...FOLIO, owner: 'someone-else' }],
    });
    const result = await discoverConsumers({ token: TOKEN, fetch: gh.fetch });
    expect(result.consumers.map((c) => c.repo)).toEqual(['hirobius/ops']);
    const fallback = gh.requests.find((r) => r.path === '/user/repos');
    expect(new URL(fallback.url).searchParams.get('affiliation')).toBe('owner,organization_member');
  });
});

const PAT_LINK = 'https://github.com/settings/personal-access-tokens';
const SECRET_LINK = 'https://github.com/hirobius/hds/settings/secrets/actions';

describe('discoverConsumers — workspace and lockfile edge cases', () => {
  it('reads pnpm-workspace.yaml with unindented items, comments and a flow list', async () => {
    const site = pkg({ name: 'site', dependencies: { '@hirobius/design-system': '^0.20.0' } });
    const gh = fakeGitHub({
      repos: [
        {
          name: 'example-block',
          files: {
            'package.json': pkg({ name: 'block' }),
            'pnpm-workspace.yaml':
              '# workspaces\npackages:\n- apps/*\n# not shipped\n- "!apps/old"\n\ncatalog:\n  react: ^18.3.1\n',
            'apps/site/package.json': site,
            'apps/old/package.json': site,
          },
        },
        {
          name: 'example-flow',
          files: {
            'package.json': pkg({ name: 'flow' }),
            'pnpm-workspace.yaml': "packages: ['tools/**']\n",
            'tools/a/b/package.json': site,
          },
        },
      ],
    });
    const { consumers } = await discoverConsumers({ token: TOKEN, fetch: gh.fetch });
    expect(consumers.map((c) => [c.repo, c.importers.map((i) => i.path)])).toEqual([
      ['hirobius/example-block', ['apps/site']],
      ['hirobius/example-flow', ['tools/a/b']],
    ]);
  });

  it('keeps a consumer whose lockfile cannot be parsed, with the version unknown and a warning', async () => {
    const gh = fakeGitHub({
      repos: [{ ...FOLIO, files: { ...FOLIO.files, 'package-lock.json': '{ "truncated": ' } }],
    });
    const { consumers, errors } = await discoverConsumers({ token: TOKEN, fetch: gh.fetch });
    expect(errors).toEqual([]);
    expect(consumers[0].lockfile).toEqual({
      path: 'package-lock.json',
      kind: 'npm',
      version: null,
    });
    expect(consumers[0].importers[0]).toMatchObject({ range: '^0.16.0', resolved: null });
    expect(consumers[0].warnings).toEqual(['package-lock.json could not be parsed']);
  });
});

describe('discoverConsumers — token', () => {
  it('refuses to start without a token, naming the variable and both fix links', async () => {
    const gh = fakeGitHub({ repos: [OPS] });
    const failure = discoverConsumers({ token: undefined, fetch: gh.fetch });
    await expect(failure).rejects.toThrow('HDS_FLEET_TOKEN');
    await expect(failure).rejects.toThrow(PAT_LINK);
    await expect(failure).rejects.toThrow(SECRET_LINK);
    expect(gh.requests).toHaveLength(0);
  });

  it('names the variable that supplied a rejected (401) or under-scoped (403) token', async () => {
    for (const status of [401, 403]) {
      const fetch = async () => new Response('{"message":"Bad credentials"}', { status });
      const failure = discoverConsumers({ token: 'old', tokenVar: 'GITHUB_TOKEN', fetch });
      await expect(failure).rejects.toThrow(`GITHUB_TOKEN`);
      await expect(failure).rejects.toThrow(PAT_LINK);
      await expect(failure).rejects.toThrow(SECRET_LINK);
    }
  });

  it('stops on the rate limit with a clear message and does not retry', async () => {
    let calls = 0;
    const fetch = async () => {
      calls += 1;
      return new Response('{"message":"API rate limit exceeded"}', {
        status: 403,
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1790000000' },
      });
    };
    const failure = discoverConsumers({ token: TOKEN, fetch });
    await expect(failure).rejects.toThrow(/rate limit/i);
    await expect(failure).rejects.toThrow('2026-09-21T14:13:20.000Z');
    expect(calls).toBe(1);
  });

  it('records a repo it could not read and keeps going', async () => {
    const gh = fakeGitHub({ repos: [OPS, { ...OPS, name: 'example-broken' }] });
    const fetch = async (url, init) =>
      String(url).includes('/repos/hirobius/example-broken/')
        ? new Response('upstream error', { status: 502 })
        : gh.fetch(url, init);
    const result = await discoverConsumers({ token: TOKEN, fetch });
    expect(result.consumers.map((c) => c.repo)).toEqual(['hirobius/ops']);
    expect(result.errors).toEqual([
      { repo: 'hirobius/example-broken', private: false, message: 'GitHub answered 502' },
    ]);
  });
});

describe('fleetToken', () => {
  it('prefers HDS_FLEET_TOKEN and falls back to GITHUB_TOKEN only outside GitHub Actions', () => {
    expect(fleetToken({ HDS_FLEET_TOKEN: 'a', GITHUB_TOKEN: 'b' })).toEqual({
      name: 'HDS_FLEET_TOKEN',
      value: 'a',
    });
    expect(fleetToken({ GITHUB_TOKEN: 'b' })).toEqual({ name: 'GITHUB_TOKEN', value: 'b' });
    // The Actions token sees hds alone, so it would silently miss every other repo.
    expect(fleetToken({ GITHUB_TOKEN: 'b', GITHUB_ACTIONS: 'true' })).toBeNull();
    expect(fleetToken({ HDS_FLEET_TOKEN: '  ' })).toBeNull();
  });
});

describe('redact', () => {
  // Invented private names: the assertion below is a regex over everything
  // redact() returns, so any leak of a name, path or package name fails it.
  const SECRET = /secret|acme|example-private|apps\/|packages\//i;
  const privateRepos = [
    {
      ...PNPM_WORKSPACE,
      name: 'example-private-secret-portal',
      private: true,
      files: {
        ...PNPM_WORKSPACE.files,
        'package.json': pkg({
          name: '@hirobius/acme-portal',
          devDependencies: { '@hirobius/design-system': '^0.16.0' },
        }),
      },
    },
    { ...OPS, name: 'example-private-acme-tool', private: true, archived: true },
    {
      ...OPS,
      name: 'example-private-secret-broken',
      private: true,
      files: { ...OPS.files, 'package.json': '{ not json: acme' },
    },
  ];

  it('names public repos only; a private repo becomes "private consumer N" with no name or path', async () => {
    const gh = fakeGitHub({ repos: [OPS, FOLIO, ...privateRepos] });
    const full = await discoverConsumers({ token: TOKEN, fetch: gh.fetch });
    // The unredacted result does carry the private names (it is never committed).
    expect(JSON.stringify(full)).toMatch(SECRET);

    const out = redact(full);
    expect(JSON.stringify(out)).not.toMatch(SECRET);
    expect(out.counts).toEqual({ consumers: 4, public: 2, private: 2, skipped: 1, errors: 1 });
    // Public repos first, so a private repo's place in the list says nothing of its name.
    expect(out.consumers.map((c) => c.repo)).toEqual([
      'hirobius/folio',
      'hirobius/ops',
      'private consumer 1',
      'private consumer 2',
    ]);
    expect(out.consumers[2]).toEqual({
      repo: 'private consumer 1',
      private: true,
      archived: true,
      hasIssues: true,
      frozen: false,
      skip: ['archived'],
      lockfile: { kind: 'pnpm', version: '9.0' },
      versions: ['0.16.0'],
      importers: [{ field: 'dependencies', range: '^0.16.0', resolved: '0.16.0' }],
    });
    expect(out.consumers[3].importers).toEqual([
      { field: 'devDependencies', range: '^0.16.0', resolved: '0.16.0' },
      { field: 'dependencies', range: '^0.20.0', resolved: '0.20.0' },
    ]);
    // A public repo is reported in full.
    expect(out.consumers[1]).toEqual(full.consumers.find((c) => c.repo === 'hirobius/ops'));
    expect(out.errors).toEqual([
      { repo: 'private repo 1', private: true, message: 'could not be read' },
    ]);
  });
});

describe('pnpm upgrade:consumers (main)', () => {
  const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
  const PRIVATE = { ...OPS, name: 'example-private-secret-app', private: true };
  const run = async (argv, env, fetch) => {
    const out = [];
    const err = [];
    const code = await main(argv, {
      env,
      fetch,
      stdout: { write: (s) => out.push(s) },
      stderr: { write: (s) => err.push(s) },
    });
    return { code, out: out.join(''), err: err.join('') };
  };

  it('prints the missing-token message with the variable and both links, and exits 1', async () => {
    const gh = fakeGitHub({ repos: [OPS] });
    const { code, err } = await run([], {}, gh.fetch);
    expect(code).toBe(1);
    expect(err).toContain('HDS_FLEET_TOKEN');
    expect(err).toContain(PAT_LINK);
    expect(err).toContain(SECRET_LINK);
    expect(gh.requests).toHaveLength(0);
  });

  it('prints a redacted summary by default, and redacted JSON with --json', async () => {
    const gh = fakeGitHub({ repos: [OPS, PRIVATE] });
    const summary = await run([], { HDS_FLEET_TOKEN: TOKEN }, gh.fetch);
    expect(summary.code).toBe(0);
    expect(summary.out).toContain('hirobius/ops');
    expect(summary.out).toContain('^0.16.0 -> 0.16.0 (pnpm)');
    expect(summary.out).toContain('private consumer 1');
    expect(summary.out).not.toMatch(/secret/);

    const asJson = await run(['--json'], { HDS_FLEET_TOKEN: TOKEN }, gh.fetch);
    const parsed = JSON.parse(asJson.out);
    expect(parsed.counts).toMatchObject({ consumers: 2, public: 1, private: 1 });
    expect(asJson.out).not.toMatch(/secret/);
  });

  it('writes the full list only with --out, and only where git ignores it', async () => {
    // .gitignore covers the default output file, so the full list cannot be committed.
    expect(() =>
      execFileSync('git', ['check-ignore', '-q', DEFAULT_OUT], { cwd: REPO }),
    ).not.toThrow();

    const gh = fakeGitHub({ repos: [OPS, PRIVATE] });
    const tracked = await run(
      ['--out', join(REPO, 'status.json')],
      { HDS_FLEET_TOKEN: TOKEN },
      gh.fetch,
    );
    expect(tracked.code).toBe(2);
    expect(tracked.err).toContain('not gitignored');
    expect(gh.requests).toHaveLength(0);

    const dir = mkdtempSync(join(tmpdir(), 'hds-consumers-'));
    try {
      const file = join(dir, 'consumers.json');
      const written = await run(['--out', file], { HDS_FLEET_TOKEN: TOKEN }, gh.fetch);
      expect(written.code).toBe(0);
      const full = JSON.parse(readFileSync(file, 'utf8'));
      expect(full.consumers.map((c) => c.repo)).toEqual([
        'hirobius/example-private-secret-app',
        'hirobius/ops',
      ]);
      expect(written.out).not.toMatch(/secret/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

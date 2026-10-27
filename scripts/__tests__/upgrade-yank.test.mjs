/**
 * release:yank (hds#472): a bad release. The script prints the npm commands
 * only Adrian's login can run, edits the GitHub Release, posts to Discord and
 * moves every standing upgrade issue that targets the bad version back to the
 * last good one. Dry run is the default; every GitHub call here is mocked.
 */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lastGood, npmCommands, parseArgs, planIssue, targetOf, yank } from '../upgrade/yank.mjs';
import { readDeprecated } from '../../codemods/lib/deprecated.mjs';
import { rollbackLines } from '../upgrade/rollback.mjs';

const PUBLISHED = ['0.30.0', '0.31.0', '0.31.1', '0.32.0', '0.33.0'];
const MARKER = '<!-- hds-upgrade -->';

/** A fake GitHub + Discord: answers from `routes`, records every call. */
function fakeFetch(routes) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ method, url: String(url), body: init.body ? JSON.parse(init.body) : null });
    const key = `${method} ${String(url).replace(/\?.*$/, '')}`;
    const hit = routes[key];
    const [status, body] =
      typeof hit === 'function' ? hit() : (hit ?? [404, { message: 'Not Found' }]);
    return new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  };
  return { fetch, calls, writes: () => calls.filter((c) => c.method !== 'GET') };
}

const issue = (number, version, extra = {}) => ({
  number,
  title: `Upgrade @hirobius/design-system to ${version}`,
  body: `${MARKER}\nRun \`npx @hirobius/design-system@${version} upgrade --check\`.`,
  state: 'open',
  html_url: `https://github.com/hirobius/app/issues/${number}`,
  ...extra,
});

const consumer = (repo, resolved) => ({
  repo,
  private: true,
  skip: [],
  importers: [{ path: '.', range: `^${resolved}`, resolved }],
});

const API = 'https://api.github.com';

function routes({ issues = {}, release = true } = {}) {
  const r = {
    'GET https://api.github.com/repos/hirobius/hds/releases/tags/v0.33.0': release
      ? [200, { id: 7, name: 'v0.33.0', body: 'Notes.', html_url: 'https://github.com/r/7' }]
      : [404, {}],
    'PATCH https://api.github.com/repos/hirobius/hds/releases/7': [200, {}],
    'POST https://discord.test/hook': [204, {}],
  };
  for (const [repo, list] of Object.entries(issues)) {
    r[`GET ${API}/repos/${repo}/issues`] = [200, list];
    for (const i of list) {
      r[`PATCH ${API}/repos/${repo}/issues/${i.number}`] = [200, {}];
      r[`POST ${API}/repos/${repo}/issues/${i.number}/comments`] = [201, {}];
    }
  }
  return r;
}

const base = (over = {}) => ({
  version: '0.33.0',
  reason: 'Buttons render blank in Safari',
  good: null,
  apply: false,
  published: PUBLISHED,
  deprecated: new Map(),
  env: { HDS_FLEET_TOKEN: 't', DISCORD_WEBHOOK_URL: 'https://discord.test/hook' },
  log: () => {},
  ...over,
});

describe('arguments: dry run unless --apply', () => {
  it('needs a version and a reason, and defaults to a dry run', () => {
    expect(parseArgs(['0.33.0', 'broken']).options).toMatchObject({
      version: '0.33.0',
      reason: 'broken',
      apply: false,
    });
    expect(parseArgs(['0.33.0', 'broken', '--dry-run']).options.apply).toBe(false);
    expect(parseArgs(['0.33.0', 'broken', '--apply']).options.apply).toBe(true);
    expect(parseArgs(['0.33.0']).error).toMatch(/reason/);
    expect(parseArgs(['latest', 'x']).error).toMatch(/version/);
  });
});

describe('the last good version', () => {
  it('is the newest published version below the bad one that is not deprecated', () => {
    expect(lastGood('0.33.0', PUBLISHED, new Map())).toBe('0.32.0');
    expect(lastGood('0.33.0', PUBLISHED, new Map([['0.32.0', 'Broken']]))).toBe('0.31.1');
    expect(lastGood('0.30.0', PUBLISHED, new Map())).toBe(null);
  });
});

describe('the npm commands, printed, never run', () => {
  it('deprecates the bad version, moves latest back, and links the access page', () => {
    const text = npmCommands('0.33.0', '0.32.0', 'Buttons blank').join('\n');
    expect(text).toContain(
      'npm deprecate @hirobius/design-system@0.33.0 "Broken: use 0.32.0. Buttons blank"',
    );
    expect(text).toContain('npm dist-tag add @hirobius/design-system@0.32.0 latest');
    expect(text).toContain('https://www.npmjs.com/package/@hirobius/design-system/access');
  });
});

describe('standing issues', () => {
  it('reads the target from the title', () => {
    expect(targetOf(issue(1, '0.33.0'))).toBe('0.33.0');
    expect(targetOf({ title: 'Something else', body: '' })).toBe(null);
  });

  it('a consumer still below the good version: the issue is edited back to it', () => {
    const plan = planIssue(issue(4, '0.33.0'), consumer('hirobius/app', '0.31.0'), {
      version: '0.33.0',
      good: '0.32.0',
    });
    expect(plan.action).toBe('edit');
    expect(plan.title).toBe('Upgrade @hirobius/design-system to 0.32.0');
    expect(plan.body).toContain('@hirobius/design-system@0.32.0 upgrade --check');
    expect(plan.body).not.toContain('0.33.0 upgrade');
    expect(plan.comment).toContain('0.33.0 is deprecated');
  });

  it('a consumer already on the good version has nothing pending: the issue is closed', () => {
    const plan = planIssue(issue(4, '0.33.0'), consumer('hirobius/app', '0.32.0'), {
      version: '0.33.0',
      good: '0.32.0',
    });
    expect(plan.action).toBe('close');
  });

  it('a consumer that already took the bad version keeps it open, with the rollback steps', () => {
    const plan = planIssue(issue(4, '0.33.0'), consumer('hirobius/app', '0.33.0'), {
      version: '0.33.0',
      good: '0.32.0',
    });
    expect(plan.action).toBe('edit');
    for (const line of rollbackLines('0.32.0')) expect(plan.comment).toContain(line);
  });

  it('a consumer already past the bad version (on a fix) has nothing pending: closed', () => {
    const plan = planIssue(issue(4, '0.33.0'), consumer('hirobius/app', '0.34.0'), {
      version: '0.33.0',
      good: '0.32.0',
    });
    expect(plan.action).toBe('close');
  });

  it('retargets only the bad version, never a prerelease of it', () => {
    const plan = planIssue(
      { ...issue(4, '0.33.0'), body: `${MARKER}\n0.33.0, not 0.33.0-rc.1 or 10.33.0. Done.` },
      consumer('hirobius/app', '0.31.0'),
      { version: '0.33.0', good: '0.32.0' },
    );
    expect(plan.body).toBe(`${MARKER}\n0.32.0, not 0.33.0-rc.1 or 10.33.0. Done.`);
  });

  it('an issue that targets another version is left alone', () => {
    const plan = planIssue(issue(4, '0.32.0'), consumer('hirobius/app', '0.31.0'), {
      version: '0.33.0',
      good: '0.32.0',
    });
    expect(plan.action).toBe('skip');
  });
});

describe('yank', () => {
  const consumers = [consumer('hirobius/app', '0.31.0'), consumer('hirobius/done', '0.32.0')];
  const issues = {
    'hirobius/app': [issue(4, '0.33.0'), { ...issue(5, '0.33.0'), pull_request: {} }],
    'hirobius/done': [issue(9, '0.33.0')],
  };

  it('dry run: prints the commands and the issue edits, and writes nothing', async () => {
    const gh = fakeFetch(routes({ issues }));
    const out = [];
    const result = await yank(
      base({ fetch: gh.fetch, discover: async () => ({ consumers }), log: (l) => out.push(l) }),
    );
    const text = out.join('\n');
    expect(result.exitCode).toBe(0);
    expect(gh.writes()).toEqual([]);
    expect(text).toContain('npm deprecate @hirobius/design-system@0.33.0');
    expect(text).toContain('npm dist-tag add @hirobius/design-system@0.32.0 latest');
    expect(text).toMatch(/hirobius\/app#4: edit .*0\.32\.0/);
    expect(text).toMatch(/hirobius\/done#9: close/);
    expect(text).not.toContain('#5');
    expect(text).toMatch(/dry run/i);
  });

  it('--apply (mocked): edits the release, posts once to Discord, retargets and closes issues', async () => {
    const gh = fakeFetch(routes({ issues }));
    const result = await yank(
      base({ apply: true, fetch: gh.fetch, discover: async () => ({ consumers }) }),
    );
    expect(result.exitCode).toBe(0);
    const writes = gh.writes();
    const release = writes.find((w) => w.url.endsWith('/releases/7'));
    expect(release.body.name).toBe('v0.33.0 (yanked)');
    expect(release.body.body).toMatch(/^> \*\*Yanked\.\*\* Buttons render blank in Safari/);
    expect(writes.filter((w) => w.url === 'https://discord.test/hook')).toHaveLength(1);
    const edit = writes.find(
      (w) => w.method === 'PATCH' && w.url.endsWith('/hirobius/app/issues/4'),
    );
    expect(edit.body.title).toBe('Upgrade @hirobius/design-system to 0.32.0');
    expect(edit.body.body).toContain('@0.32.0 upgrade --check');
    const close = writes.find(
      (w) => w.method === 'PATCH' && w.url.endsWith('/hirobius/done/issues/9'),
    );
    expect(close.body).toMatchObject({ state: 'closed', state_reason: 'completed' });
    expect(writes.filter((w) => w.url.endsWith('/comments'))).toHaveLength(2);
  });

  it('without a fleet token, still prints the commands and says which variable to set', async () => {
    const gh = fakeFetch(routes());
    const out = [];
    const result = await yank(
      base({
        env: {},
        fetch: gh.fetch,
        discover: async () => ({ consumers }),
        log: (l) => out.push(l),
      }),
    );
    expect(result.exitCode).toBe(0);
    const text = out.join('\n');
    expect(text).toContain('npm deprecate');
    expect(text).toContain('HDS_FLEET_TOKEN');
    expect(text).toContain('DISCORD_WEBHOOK_URL');
  });

  it('pages through every open issue in a consumer repo', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ ...issue(100 + i, '0.31.0') }));
    let page = 0;
    const r = routes({ issues: { 'hirobius/app': [issue(4, '0.33.0')] } });
    r[`GET ${API}/repos/hirobius/app/issues`] = () =>
      page++ === 0 ? [200, page1] : [200, [issue(4, '0.33.0')]];
    const gh = fakeFetch(r);
    const out = [];
    await yank(
      base({
        fetch: gh.fetch,
        discover: async () => ({ consumers: [consumers[0]] }),
        log: (l) => out.push(l),
      }),
    );
    expect(out.join('\n')).toMatch(/hirobius\/app#4: edit/);
    expect(
      gh.calls.filter((c) => c.url.includes('/hirobius/app/issues?')).map((c) => c.url),
    ).toEqual([
      `${API}/repos/hirobius/app/issues?state=open&per_page=100&page=1`,
      `${API}/repos/hirobius/app/issues?state=open&per_page=100&page=2`,
    ]);
  });

  it('a write GitHub answers 404 to counts as failed', async () => {
    const r = routes({ issues: { 'hirobius/app': [issue(4, '0.33.0')] } });
    delete r[`PATCH ${API}/repos/hirobius/app/issues/4`];
    const gh = fakeFetch(r);
    const result = await yank(
      base({ apply: true, fetch: gh.fetch, discover: async () => ({ consumers: [consumers[0]] }) }),
    );
    expect(result.exitCode).toBe(1);
  });

  it('refuses a --good that npm marks deprecated', async () => {
    const gh = fakeFetch(routes());
    const result = await yank(
      base({ good: '0.32.0', deprecated: new Map([['0.32.0', 'Broken']]), fetch: gh.fetch }),
    );
    expect(result.exitCode).toBe(2);
  });

  it('refuses a version that was never published, or one with no good version before it', async () => {
    const gh = fakeFetch(routes());
    expect((await yank(base({ version: '9.9.9', fetch: gh.fetch }))).exitCode).toBe(2);
    expect((await yank(base({ version: '0.30.0', fetch: gh.fetch }))).exitCode).toBe(2);
    expect(gh.calls).toEqual([]);
  });
});

describe('readDeprecated: which versions npm marks deprecated', () => {
  const packument = {
    versions: { '0.32.0': {}, '0.33.0': { deprecated: 'Broken: use 0.32.0' } },
  };

  it('reads a packument file named by HDS_UPGRADE_REGISTRY', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hds-yank-'));
    const file = join(dir, 'packument.json');
    writeFileSync(file, JSON.stringify(packument));
    const map = await readDeprecated({ env: { HDS_UPGRADE_REGISTRY: file } });
    expect([...map]).toEqual([['0.33.0', 'Broken: use 0.32.0']]);
  });

  it('is empty when switched off, and when the registry cannot be reached', async () => {
    expect((await readDeprecated({ env: { HDS_UPGRADE_REGISTRY: 'off' } })).size).toBe(0);
    const down = async () => {
      throw new Error('offline');
    };
    expect((await readDeprecated({ env: {}, fetch: down })).size).toBe(0);
  });

  it('asks the npm registry by default', async () => {
    const seen = [];
    const fetch = async (url) => {
      seen.push(String(url));
      return new Response(JSON.stringify(packument), { status: 200 });
    };
    const map = await readDeprecated({ env: {}, fetch });
    expect(seen).toEqual(['https://registry.npmjs.org/@hirobius%2fdesign-system']);
    expect(map.get('0.33.0')).toBe('Broken: use 0.32.0');
  });
});

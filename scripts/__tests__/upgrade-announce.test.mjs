/**
 * release:announce (hds#456): after a publish, each behind consumer keeps ONE
 * standing upgrade issue and Discord gets five lines unless the release is
 * quiet. Every GitHub and Discord call here is mocked.
 */
import { describe, expect, it } from 'vitest';
import { fakeFetch } from './fake-fetch.mjs';
import {
  announce,
  discordLines,
  explain,
  issueBody,
  issueTitle,
  labelsFor,
  lockedFrom,
  main,
  parseArgs,
  pickStanding,
  rangeSummary,
} from '../upgrade/announce.mjs';
import { targetOf } from '../upgrade/standing.mjs';

const API = 'https://api.github.com';
const MARKER = '<!-- hds-upgrade -->';
const HOOK = 'https://discord.test/hook';

const LEDGERS = [
  { version: '0.32.0', summary: 'old', steps: [{ id: 'a', kind: 'added', impact: 'additive' }] },
  {
    version: '0.33.0',
    summary: '1 look, 1 by hand.',
    steps: [
      { id: '0.33.0/changed/x', kind: 'changed', impact: 'look' },
      { id: '0.33.0/removed/y', kind: 'removed', impact: 'breaking' },
    ],
  },
  {
    version: '0.33.1',
    summary: 'Nothing to do.',
    steps: [{ id: '0.33.1/added/z', kind: 'added', impact: 'additive' }],
  },
];
const PUBLISHED = ['0.32.0', '0.33.0', '0.33.1'];

const consumer = (repo, resolved, extra = {}) => ({
  repo,
  private: true,
  skip: [],
  importers: [{ path: '.', range: `^${resolved}`, resolved }],
  ...extra,
});

function routesFor(repo, { open = [], closed = [] } = {}) {
  const r = {
    [`GET ${API}/repos/${repo}/issues open`]: [200, open],
    [`GET ${API}/repos/${repo}/issues closed`]: [200, closed],
    [`POST ${API}/repos/${repo}/issues`]: [201, { number: 1 }],
    [`POST ${HOOK}`]: [204, {}],
  };
  for (const i of [...open, ...closed]) {
    r[`PATCH ${API}/repos/${repo}/issues/${i.number}`] = [200, {}];
    r[`POST ${API}/repos/${repo}/issues/${i.number}/labels`] = [200, []];
    r[`POST ${API}/repos/${repo}/issues/${i.number}/comments`] = [201, {}];
  }
  return r;
}

const base = (over = {}) => ({
  version: '0.33.0',
  apply: true,
  ledgers: LEDGERS,
  published: PUBLISHED,
  env: { HDS_FLEET_TOKEN: 't', DISCORD_WEBHOOK_URL: HOOK },
  discover: async () => ({ consumers: [consumer('hirobius/app', '0.32.0')] }),
  log: () => {},
  ...over,
});

describe('arguments: dry run unless --apply', () => {
  it('needs one version', () => {
    expect(parseArgs(['0.33.0']).options).toEqual({ version: '0.33.0', apply: false });
    expect(parseArgs(['0.33.0', '--apply']).options.apply).toBe(true);
    expect(parseArgs([]).error).toMatch(/version/);
    expect(parseArgs(['latest']).error).toMatch(/version/);
    expect(parseArgs(['0.33.0', '--force']).error).toMatch(/unknown/);
  });
});

describe('the published guard', () => {
  it('a version that was not published makes no API call and posts nothing', async () => {
    const f = fakeFetch({});
    let scanned = false;
    const r = await announce(
      base({
        version: '0.34.0',
        fetch: f.fetch,
        discover: async () => {
          scanned = true;
          return { consumers: [] };
        },
      }),
    );
    expect(f.calls).toEqual([]);
    expect(scanned).toBe(false);
    expect(r.exitCode).toBe(0);
  });
});

describe('one standing issue per consumer', () => {
  it('the first release files one issue; the second edits that same issue and never closes it', async () => {
    const repo = 'hirobius/app';
    const first = fakeFetch(routesFor(repo));
    await announce(base({ fetch: first.fetch }));
    const created = first.writes();
    expect(created).toHaveLength(2); // the issue + Discord
    expect(created[0]).toMatchObject({ method: 'POST', url: `${API}/repos/${repo}/issues` });
    expect(created[0].body.title).toBe('Upgrade @hirobius/design-system to 0.33.0');
    expect(created[0].body.body).toContain(MARKER);

    const filed = { number: 1, state: 'open', ...created[0].body };
    const second = fakeFetch(routesFor(repo, { open: [filed] }));
    const r = await announce(base({ version: '0.33.1', fetch: second.fetch }));
    expect(r).toMatchObject({ filed: 0, edited: 1 });
    const patch = second.writes().find((c) => c.method === 'PATCH');
    expect(patch.url).toBe(`${API}/repos/${repo}/issues/1`);
    expect(patch.body.title).toBe('Upgrade @hirobius/design-system to 0.33.1');
    expect(patch.body.state).toBeUndefined();
    expect(second.writes().some((c) => c.body?.state === 'closed')).toBe(false);
    expect(second.writes().some((c) => c.url === `${API}/repos/${repo}/issues`)).toBe(false);
  });

  it('adopts an open hand-filed "Upgrade @hirobius/design-system to 0.20.0" issue', async () => {
    const repo = 'hirobius/ops';
    const hand = {
      number: 442,
      state: 'open',
      title: 'Upgrade @hirobius/design-system to 0.20.0',
      body: 'by hand',
    };
    const f = fakeFetch(routesFor(repo, { open: [hand] }));
    await announce(
      base({ fetch: f.fetch, discover: async () => ({ consumers: [consumer(repo, '0.16.0')] }) }),
    );
    const writes = f.writes().filter((c) => c.url.includes(repo));
    expect(writes.map((c) => c.url)).toEqual([
      `${API}/repos/${repo}/issues/442`,
      `${API}/repos/${repo}/issues/442/labels`,
    ]);
    expect(writes[0].body.body).toContain(MARKER);
  });

  it('a closed standing issue in a repo still behind is reopened with a one-line comment', async () => {
    const repo = 'hirobius/app';
    const old = {
      number: 9,
      state: 'closed',
      title: 'Upgrade @hirobius/design-system to 0.32.0',
      body: MARKER,
    };
    const f = fakeFetch(routesFor(repo, { closed: [old] }));
    const r = await announce(base({ fetch: f.fetch }));
    expect(r.reopened).toBe(1);
    const patch = f.writes().find((c) => c.method === 'PATCH');
    expect(patch.body.state).toBe('open');
    const comment = f.writes().find((c) => c.url.endsWith('/comments'));
    expect(comment.body.body.split('\n')).toHaveLength(1);
  });

  it('skips archived, issues-disabled and hds-frozen repos, and repos already on the release', async () => {
    const f = fakeFetch({ [`POST ${HOOK}`]: [204, {}] });
    await announce(
      base({
        fetch: f.fetch,
        discover: async () => ({
          consumers: [
            consumer('hirobius/a', '0.32.0', { skip: ['archived'] }),
            consumer('hirobius/b', '0.32.0', { skip: ['issues-disabled'] }),
            consumer('hirobius/c', '0.32.0', { skip: ['hds-frozen'] }),
            consumer('hirobius/d', '0.33.0'),
          ],
        }),
      }),
    );
    expect(f.calls.filter((c) => c.url.startsWith(API))).toEqual([]);
  });

  it('a dry run reads but writes nothing', async () => {
    const f = fakeFetch(routesFor('hirobius/app'));
    await announce(base({ apply: false, fetch: f.fetch }));
    expect(f.writes()).toEqual([]);
  });
});

describe('labels and body', () => {
  it('a look item adds needs-adrian and the preview DoD item; never ralph-ready', () => {
    const look = rangeSummary(LEDGERS, '0.32.0', '0.33.0');
    expect(labelsFor(look)).toEqual(['backlog', 'needs-adrian']);
    const quiet = rangeSummary(LEDGERS, '0.33.0', '0.33.1');
    expect(labelsFor(quiet)).toEqual(['backlog']);
    expect([...labelsFor(look), ...labelsFor(quiet)]).not.toContain('ralph-ready');
    const body = issueBody({
      repo: 'hirobius/app',
      from: '0.32.0',
      version: '0.33.0',
      summary: look,
    });
    expect(body).toContain(
      'Adrian checked the Looks different list on the Vercel preview before merge',
    );
  });

  it('the ops body has a real DoD checklist ending in `bash ralph/gate.sh` green', () => {
    const summary = rangeSummary(LEDGERS, '0.32.0', '0.33.0');
    const body = issueBody({ repo: 'hirobius/ops', from: '0.32.0', version: '0.33.0', summary });
    const dod = body.split('## Definition of Done')[1].trim().split('\n');
    expect(dod.every((line) => /^- \[ \] /.test(line))).toBe(true);
    expect(dod[0]).toBe('- [ ] `npx @hirobius/design-system@0.33.0 upgrade --check` exits 0');
    expect(dod.at(-1)).toBe('- [ ] `bash ralph/gate.sh` green');
    expect(body).toContain('North star:** No — infrastructure or polish');
    const other = issueBody({ repo: 'hirobius/app', from: '0.32.0', version: '0.33.0', summary });
    expect(other).not.toContain('ralph/gate.sh');
    expect(other).not.toContain('North star');
  });

  it('counts every release in the range into the four lists', () => {
    expect(rangeSummary(LEDGERS, '0.32.0', '0.33.1')).toMatchObject({
      releases: ['0.33.0', '0.33.1'],
      counts: { fixedForYou: 0, looksDifferent: 1, comingNext: 0, doByHand: 2 },
      breaking: 1,
    });
    expect(rangeSummary(LEDGERS, null, '0.33.1').releases).toEqual(['0.33.1']);
  });

  it('the title is one yank.mjs can read back', () => {
    expect(targetOf({ title: issueTitle('0.33.1') })).toBe('0.33.1');
  });

  it('reads the oldest locked version', () => {
    const c = consumer('hirobius/app', '0.33.0');
    c.importers.push({ path: 'web', resolved: '0.31.0' }, { path: 'x', resolved: 'non-registry' });
    expect(lockedFrom(c)).toBe('0.31.0');
    expect(lockedFrom(consumer('hirobius/app', null))).toBe(null);
  });

  it('picks the open standing issue over a closed one', () => {
    const open = [
      { number: 2, title: 'Other', body: '' },
      { number: 3, title: 'x', body: MARKER },
    ];
    expect(pickStanding(open, [])).toMatchObject({ action: 'edit', issue: { number: 3 } });
    expect(
      pickStanding([], [{ number: 4, title: issueTitle('0.1.0'), body: 'no marker' }]),
    ).toEqual({
      action: 'create',
    });
  });
});

describe('Discord', () => {
  it('a release with only none or additive items stays quiet', async () => {
    const f = fakeFetch(routesFor('hirobius/app'));
    await announce(base({ version: '0.33.1', fetch: f.fetch }));
    expect(f.calls.some((c) => c.url === HOOK)).toBe(false);
  });

  it('anything else posts five lines with counts and no repo name', async () => {
    const f = fakeFetch(routesFor('hirobius/secret-client'));
    await announce(
      base({
        fetch: f.fetch,
        discover: async () => ({ consumers: [consumer('hirobius/secret-client', '0.32.0')] }),
      }),
    );
    const post = f.calls.find((c) => c.url === HOOK);
    const lines = post.body.content.split('\n');
    expect(lines).toHaveLength(5);
    expect(post.body.content).not.toContain('secret-client');
    expect(lines[2]).toBe('Consumer upgrade issues: 1 filed, 0 updated, 0 reopened.');
    expect(
      discordLines({ version: '0.33.0', ledger: LEDGERS[1], filed: 0, edited: 0, reopened: 0 }),
    ).toHaveLength(5);
  });
});

describe('failures never fail the release', () => {
  it('a rejected token is named, and the run still returns 0', async () => {
    const logs = [];
    const f = fakeFetch({
      [`GET ${API}/repos/hirobius/app/issues open`]: [401, {}],
      [`POST ${HOOK}`]: [204, {}],
    });
    const r = await announce(base({ fetch: f.fetch, log: (l) => logs.push(l) }));
    expect(r.exitCode).toBe(0);
    expect(r.failed).toBe(1);
    expect(logs.join('\n')).toMatch(/HDS_FLEET_TOKEN/);
  });

  it('an exception inside announce still exits 0 from main', async () => {
    const code = await main(['0.33.0', '--apply'], {
      published: PUBLISHED,
      ledgers: LEDGERS,
      env: { HDS_FLEET_TOKEN: 't' },
      log: () => {},
      discover: async () => {
        throw Object.assign(new Error('boom'), { status: 403 });
      },
    });
    expect(code).toBe(0);
    expect(explain(Object.assign(new Error('x answered 403'), { status: 403 }))).toMatch(
      /HDS_FLEET_TOKEN/,
    );
  });

  it('with no token it skips the issues and names the variable', async () => {
    const logs = [];
    const f = fakeFetch({});
    await announce(base({ env: {}, fetch: f.fetch, log: (l) => logs.push(l) }));
    expect(f.calls).toEqual([]);
    expect(logs.join('\n')).toMatch(/set HDS_FLEET_TOKEN/);
    expect(logs.join('\n')).toMatch(/set DISCORD_WEBHOOK_URL/);
  });
});

describe('rangeSummary and Good to know', () => {
  it('does not count an additive peer step', () => {
    const ledgers = [
      {
        version: '0.40.0',
        summary: 'x',
        steps: [{ id: '0.40.0/peer/x', kind: 'peer', impact: 'additive', plain: 'x.' }],
      },
    ];
    const { counts } = rangeSummary(ledgers, null, '0.40.0');
    expect(counts).toEqual({ fixedForYou: 0, looksDifferent: 0, comingNext: 0, doByHand: 0 });
  });
});

/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * An in-memory stand-in for the GitHub REST endpoints that
 * scripts/upgrade/consumers.mjs reads (hds#453), served through a `fetch`
 * function so no test touches the network.
 *
 * It keeps the API's rules the discovery depends on:
 *   - the org's repositories page through a `Link: <…>; rel="next"` header;
 *   - an org name that is really a user account answers 404 on /orgs/{org}/repos;
 *   - a file's JSON body carries no content above 1 MB (`encoding: "none"`),
 *     so only `Accept: application/vnd.github.raw` returns a large lockfile;
 *   - every repository path reads at the repository's default branch only;
 *   - an empty repository answers 404 on its root listing.
 *
 * Every request is appended to `requests` with its Accept and Authorization
 * headers, so tests can assert which media type each read used.
 */

const API = 'https://api.github.com';
const MB = 1024 * 1024;

const json = (body, init = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json; charset=utf-8', ...init.headers },
  });

const notFound = () => json({ message: 'Not Found' }, { status: 404 });

function repoRecord(org, repo) {
  return {
    name: repo.name,
    full_name: `${repo.owner ?? org}/${repo.name}`,
    owner: { login: repo.owner ?? org },
    private: repo.private ?? false,
    archived: repo.archived ?? false,
    has_issues: repo.has_issues ?? true,
    topics: repo.topics ?? [],
    default_branch: repo.default_branch ?? 'main',
  };
}

function page(list, url, pageSize) {
  const n = Number(url.searchParams.get('page') ?? '1');
  const items = list.slice((n - 1) * pageSize, n * pageSize);
  const headers = {};
  if (n * pageSize < list.length) {
    const next = new URL(url);
    next.searchParams.set('page', String(n + 1));
    headers.link = `<${next}>; rel="next"`;
  }
  return json(items, { headers });
}

/**
 * @param {{
 *   org?: string,
 *   repos?: Array<{ name: string, owner?: string, private?: boolean, archived?: boolean,
 *     has_issues?: boolean, topics?: string[], default_branch?: string,
 *     files?: Record<string, string> }>,
 *   orgIsUser?: boolean,
 *   pageSize?: number,
 * }} options
 */
export function fakeGitHub({
  org = 'hirobius',
  repos = [],
  orgIsUser = false,
  pageSize = 100,
} = {}) {
  const requests = [];
  const byFullName = new Map(repos.map((r) => [`${r.owner ?? org}/${r.name}`, r]));
  const records = repos.map((r) => repoRecord(org, r));

  async function fetch(input, init = {}) {
    const url = new URL(String(input));
    const headers = new Headers(init.headers);
    requests.push({
      url: url.toString(),
      path: url.pathname,
      accept: headers.get('accept'),
      authorization: headers.get('authorization'),
    });
    if (url.origin !== API) return notFound();

    if (url.pathname === `/orgs/${org}/repos`) {
      if (orgIsUser) return notFound();
      return page(
        records.filter((r) => r.owner.login === org),
        url,
        pageSize,
      );
    }
    if (url.pathname === '/user/repos') return page(records, url, pageSize);

    const m = /^\/repos\/([^/]+)\/([^/]+)\/(contents|git\/trees)(?:\/(.*))?$/.exec(url.pathname);
    const repo = m && byFullName.get(`${m[1]}/${m[2]}`);
    if (!repo) return notFound();
    const branch = repo.default_branch ?? 'main';
    const files = repo.files ?? {};
    const rest = m[4] ? decodeURIComponent(m[4]) : '';

    if (m[3] === 'git/trees') {
      if (rest !== branch || url.searchParams.get('recursive') !== '1') return notFound();
      const dirs = new Set();
      for (const file of Object.keys(files)) {
        const parts = file.split('/');
        for (let i = 1; i < parts.length; i += 1) dirs.add(parts.slice(0, i).join('/'));
      }
      const tree = [
        ...[...dirs].map((p) => ({ path: p, type: 'tree' })),
        ...Object.keys(files).map((p) => ({ path: p, type: 'blob', size: files[p].length })),
      ];
      return json({ sha: 'fake', truncated: false, tree });
    }

    if (url.searchParams.get('ref') !== branch) return notFound();
    if (!rest) {
      if (Object.keys(files).length === 0)
        return json({ message: 'This repository is empty.' }, { status: 404 });
      const top = new Map();
      for (const file of Object.keys(files)) {
        const [head, ...tail] = file.split('/');
        top.set(head, tail.length ? 'dir' : 'file');
      }
      return json([...top].map(([name, type]) => ({ name, path: name, type })));
    }
    if (!(rest in files)) return notFound();
    const body = files[rest];
    if ((headers.get('accept') ?? '').startsWith('application/vnd.github.raw')) {
      return new Response(body, {
        status: 200,
        headers: { 'content-type': 'application/vnd.github.raw; charset=utf-8' },
      });
    }
    const size = Buffer.byteLength(body);
    return json({
      type: 'file',
      path: rest,
      size,
      encoding: size > MB ? 'none' : 'base64',
      content: size > MB ? '' : Buffer.from(body).toString('base64'),
    });
  }

  return { fetch, requests };
}

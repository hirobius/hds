/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * standing.mjs — the one standing upgrade issue each consumer repo carries
 * (hds#456), shared by announce.mjs (files and retargets it after a publish)
 * and yank.mjs (moves it back after a bad release).
 *
 * An issue is the standing one when its body has MARKER, or, for one filed by
 * hand before the marker existed, its title starts with TITLE_PREFIX.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HDS_PACKAGE } from '../../codemods/lib/installed-version.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const API = 'https://api.github.com';
/** The hidden marker a standing upgrade issue carries. */
export const MARKER = '<!-- hds-upgrade -->';
export const TITLE_PREFIX = `Upgrade ${HDS_PACKAGE}`;

/** Whether an issue is a standing upgrade issue. */
export const isStanding = (issue) =>
  !issue.pull_request &&
  ((issue.body ?? '').includes(MARKER) || (issue.title ?? '').startsWith(TITLE_PREFIX));

/** The version a standing issue targets, from its title, or null. */
export function targetOf(issue) {
  if (!(issue.title ?? '').startsWith(TITLE_PREFIX)) return null;
  return /\bto v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\b/.exec(issue.title)?.[1] ?? null;
}

/**
 * A tiny GitHub REST client: `gh(method, url, body)`. A GET that answers 404
 * is null; any other non-2xx throws with the status.
 */
export function github(token, fetch, agent = 'hirobius-hds-upgrade') {
  return async (method, url, body) => {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': agent,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 404 && method === 'GET') return null;
    if (!res.ok) {
      const error = new Error(`${method} ${url} answered ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return res.status === 204 ? {} : res.json().catch(() => ({}));
  };
}

/** Every issue of `repo` in `state` (open or closed), newest first, at most `maxPages` pages. */
export async function listIssues(gh, repo, state, maxPages = 10) {
  const issues = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const batch =
      (await gh('GET', `${API}/repos/${repo}/issues?state=${state}&per_page=100&page=${page}`)) ??
      [];
    issues.push(...batch);
    if (batch.length < 100) break;
  }
  return issues;
}

/**
 * upgrade/published.json: every published version, plus the one the merged
 * Version PR publishes next (compile.mjs --release adds it there).
 */
export const readPublished = (root = REPO_ROOT) =>
  JSON.parse(readFileSync(path.join(root, 'upgrade/published.json'), 'utf8')).versions;

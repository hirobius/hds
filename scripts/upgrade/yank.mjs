#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * yank.mjs — `pnpm release:yank <version> <reason>`: take back a bad release
 * (hds#472, runbook in docs/RELEASING.md "If a release is bad").
 *
 *   pnpm release:yank 0.33.0 "Buttons render blank in Safari"           dry run
 *   pnpm release:yank 0.33.0 "..." --good 0.32.0                         pick the good version
 *   pnpm release:yank 0.33.0 "..." --apply                               do it
 *
 * It is a dry run unless --apply: it reads, prints what it would do, and
 * writes nothing. With --apply it:
 *
 *   1. prints the two npm commands to run by hand. Trusted Publishing grants
 *      publish rights only, so `npm deprecate` and `npm dist-tag` need
 *      Adrian's own npm login; this script never runs them;
 *   2. edits the GitHub Release v<version>: "(yanked)" in its name and the
 *      reason above its notes;
 *   3. posts five lines to Discord (DISCORD_WEBHOOK_URL);
 *   4. moves every open standing upgrade issue in a consumer repo that
 *      targets <version> back to the last good version, with a comment that
 *      carries the rollback steps (rollback.mjs), or closes it when that
 *      consumer has nothing left to do at the good version.
 *
 * The last good version is the newest published version below <version>
 * that npm does not mark deprecated (--good overrides it).
 *
 * Tokens: HDS_FLEET_TOKEN (consumers.mjs; Issues: Read and write on the
 * consumer repos) for the issues; GITHUB_TOKEN, else HDS_FLEET_TOKEN, with
 * Contents: Read and write on hirobius/hds for the Release. A missing token
 * or webhook skips that step and says which variable to set.
 *
 * Exit 0: done (or the dry run printed). 1: a step failed. 2: refused.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readDeprecated } from '../../codemods/lib/deprecated.mjs';
import { compareVersions, isVersion } from '../../codemods/lib/semver.mjs';
import { SELF_REPO, TOKEN_VAR, discoverConsumers, fleetToken } from './consumers.mjs';
import { NO_BACKPORTS, rollbackLines } from './rollback.mjs';

const PACKAGE = '@hirobius/design-system';
const API = 'https://api.github.com';
const ACCESS_URL = `https://www.npmjs.com/package/${PACKAGE}/access`;
const ROLLBACK_URL = 'https://github.com/hirobius/hds/blob/main/UPGRADING.md#if-a-release-is-bad';
/** The hidden marker a standing upgrade issue carries (hds#456). */
export const MARKER = '<!-- hds-upgrade -->';
const TITLE_PREFIX = `Upgrade ${PACKAGE}`;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const USAGE = `usage: pnpm release:yank <version> <reason> [--good <version>] [--apply]

  <version>        the bad release, such as 0.33.0
  <reason>         one line: what is broken
  --good <v>       the version to send people back to (default: the newest
                   published version below <version> that is not deprecated)
  --dry-run        the default: read and print, write nothing
  --apply          edit the Release, post to Discord, edit the issues`;

/** @returns {{ options?: any, help?: boolean, error?: string }} */
export function parseArgs(argv) {
  const options = { version: null, reason: null, good: null, apply: false };
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    else if (arg === '--apply') options.apply = true;
    else if (arg === '--dry-run') options.apply = false;
    else if (arg === '--good') {
      options.good = argv[++i] ?? null;
      if (!options.good || !isVersion(options.good)) return { error: '--good needs a version' };
    } else if (arg.startsWith('--')) return { error: `unknown argument: ${arg}` };
    else rest.push(arg);
  }
  [options.version, options.reason] = rest;
  if (!options.version || !isVersion(options.version)) {
    return { error: 'name the bad version, such as 0.33.0' };
  }
  if (!options.reason?.trim()) return { error: 'give a reason: one line on what is broken' };
  if (rest.length > 2) return { error: 'quote the reason: it is one argument' };
  return { options };
}

/** The newest published version below `version` that is not deprecated, or null. */
export function lastGood(version, published, deprecated) {
  return (
    published
      .filter((v) => compareVersions(v, version) < 0 && !deprecated.has(v))
      .sort(compareVersions)
      .at(-1) ?? null
  );
}

/** The commands only an npm owner can run, with where to check the result. */
export function npmCommands(version, good, reason) {
  const message = `Broken: use ${good}. ${reason}`.replace(/"/g, "'");
  return [
    `npm deprecate ${PACKAGE}@${version} "${message}"`,
    `npm dist-tag add ${PACKAGE}@${good} latest`,
    `Check: ${ACCESS_URL}`,
  ];
}

/** Whether an issue is a standing upgrade issue (hds#456). */
const isStanding = (issue) =>
  !issue.pull_request &&
  ((issue.body ?? '').includes(MARKER) || (issue.title ?? '').startsWith(TITLE_PREFIX));

/** The version a standing issue targets, from its title, or null. */
export function targetOf(issue) {
  if (!(issue.title ?? '').startsWith(TITLE_PREFIX)) return null;
  return /\bto v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\b/.exec(issue.title)?.[1] ?? null;
}

const versionPattern = (v) =>
  new RegExp(`(?<![\\d.])${v.replace(/[.+-]/g, (c) => `\\${c}`)}(?![\\d])`, 'g');

/**
 * What to do with one standing issue: `skip` (it targets another version),
 * `close` (every importer is already at the good version or past it, and none
 * took the bad one) or `edit` (retarget title and body to the good version).
 */
export function planIssue(issue, consumer, { version, good, reason = '' }) {
  if (!isStanding(issue) || issue.state === 'closed' || targetOf(issue) !== version) {
    return { action: 'skip' };
  }
  const resolved = consumer.importers.map((i) => i.resolved).filter(Boolean);
  const tookBad = resolved.some((v) => compareVersions(v, version) >= 0);
  const behind = resolved.length === 0 || resolved.some((v) => compareVersions(v, good) < 0);
  const why = `${PACKAGE} ${version} is deprecated${reason ? `: ${reason}` : ''}.`;
  if (!tookBad && !behind) {
    return {
      action: 'close',
      comment: `${why} This repo is already on ${good}, so there is nothing left to upgrade; closing. A fixed release will open a new upgrade issue.`,
    };
  }
  const retarget = (text) => (text ?? '').replace(versionPattern(version), good);
  const comment = [
    `${why} This issue now targets ${good}, the last good version.`,
    '',
    `If this repo already took ${version}, roll back:`,
    '',
    ...rollbackLines(good),
    '',
    NO_BACKPORTS,
  ].join('\n');
  return { action: 'edit', title: retarget(issue.title), body: retarget(issue.body), comment };
}

/** The five lines Discord gets. */
function discordLines({ version, good, reason, release, edited, closed }) {
  return [
    `**${PACKAGE} ${version} is yanked**: ${reason}`,
    `Use ${good}: npm \`latest\` moves back to it.`,
    `Release: ${release ?? `v${version}`}`,
    `Consumer issues: ${edited} moved back to ${good}, ${closed} closed.`,
    `Took ${version} already? Roll back: ${ROLLBACK_URL}`,
  ];
}

function github(token, fetch) {
  return async (method, url, body) => {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'hirobius-hds-release-yank',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${method} ${url} answered ${res.status}`);
    return res.status === 204 ? {} : res.json().catch(() => ({}));
  };
}

const readPublished = () =>
  JSON.parse(readFileSync(path.join(REPO_ROOT, 'upgrade/published.json'), 'utf8')).versions;

/**
 * @param {{ version: string, reason: string, good?: string|null, apply?: boolean,
 *   published?: string[], deprecated?: Map<string, string>,
 *   env?: Record<string, string|undefined>, fetch?: typeof globalThis.fetch,
 *   discover?: typeof discoverConsumers, log?: (line: string) => void }} options
 * @returns {Promise<{ exitCode: 0|1|2 }>}
 */
export async function yank({
  version,
  reason,
  good = null,
  apply = false,
  published,
  deprecated,
  env = process.env,
  fetch = globalThis.fetch,
  discover = discoverConsumers,
  log = console.log,
}) {
  published ??= readPublished();
  if (!published.includes(version)) {
    log(`${version} is not in upgrade/published.json, so it was never published: nothing to yank.`);
    return { exitCode: 2 };
  }
  deprecated ??= await readDeprecated({ env, fetch });
  good ??= lastGood(version, published, deprecated);
  if (!good || compareVersions(good, version) >= 0) {
    log(`No good version before ${version} to send people back to: pass --good <version>.`);
    return { exitCode: 2 };
  }
  const mode = apply ? '' : ' (dry run: nothing is written; pass --apply to do it)';
  let failed = 0;
  const step = async (label, fn) => {
    try {
      await fn();
    } catch (error) {
      failed += 1;
      log(`  ${label} failed: ${error.message}`);
    }
  };

  log(`Yank ${PACKAGE} ${version}, back to ${good}${mode}`);
  log('');
  log('1. Run these yourself, logged in to npm as an owner (Trusted Publishing cannot):');
  for (const line of npmCommands(version, good, reason)) log(`   ${line}`);

  log('');
  log(`2. GitHub Release v${version}`);
  let releaseUrl = null;
  const releaseToken = env.GITHUB_TOKEN?.trim() || env[TOKEN_VAR]?.trim();
  if (!releaseToken) {
    log(`   skipped: set GITHUB_TOKEN (Contents: Read and write on ${SELF_REPO}).`);
  } else {
    await step('the Release edit', async () => {
      const gh = github(releaseToken, fetch);
      const release = await gh('GET', `${API}/repos/${SELF_REPO}/releases/tags/v${version}`);
      if (!release) return log(`   no Release tagged v${version}: nothing to edit.`);
      releaseUrl = release.html_url;
      if ((release.name ?? '').endsWith('(yanked)')) return log('   already marked yanked.');
      const name = `${release.name || `v${version}`} (yanked)`;
      const body = `> **Yanked.** ${reason} Use ${good}.\n\n${release.body ?? ''}`;
      log(`   ${apply ? 'renamed' : 'would rename'} to "${name}" with the reason above its notes.`);
      if (apply)
        await gh('PATCH', `${API}/repos/${SELF_REPO}/releases/${release.id}`, { name, body });
    });
  }

  log('');
  log('3. Standing upgrade issues in consumer repos');
  let edited = 0;
  let closed = 0;
  const fleet = fleetToken(env);
  if (!fleet) {
    log(`   skipped: set ${TOKEN_VAR} (Issues: Read and write on the consumer repos).`);
  } else {
    await step('the issue scan', async () => {
      const gh = github(fleet.value, fetch);
      const { consumers } = await discover({ token: fleet.value, tokenVar: fleet.name, fetch });
      for (const consumer of consumers) {
        if (consumer.skip?.length) continue;
        const issues =
          (await gh('GET', `${API}/repos/${consumer.repo}/issues?state=open&per_page=100`)) ?? [];
        for (const issue of issues) {
          const plan = planIssue(issue, consumer, { version, good, reason });
          if (plan.action === 'skip') continue;
          const ref = `${consumer.repo}#${issue.number}`;
          const url = `${API}/repos/${consumer.repo}/issues/${issue.number}`;
          if (plan.action === 'close') {
            closed += 1;
            log(`   ${ref}: close (already on ${good})`);
            if (!apply) continue;
            await step(ref, async () => {
              await gh('POST', `${url}/comments`, { body: plan.comment });
              await gh('PATCH', url, { state: 'closed', state_reason: 'completed' });
            });
          } else {
            edited += 1;
            log(`   ${ref}: edit to "${plan.title}" and comment the rollback steps`);
            if (!apply) continue;
            await step(ref, async () => {
              await gh('PATCH', url, { title: plan.title, body: plan.body });
              await gh('POST', `${url}/comments`, { body: plan.comment });
            });
          }
        }
      }
      if (edited + closed === 0) log(`   none targets ${version}.`);
    });
  }

  log('');
  log('4. Discord');
  const lines = discordLines({ version, good, reason, release: releaseUrl, edited, closed });
  const hook = env.DISCORD_WEBHOOK_URL?.trim();
  if (!hook) log('   skipped: set DISCORD_WEBHOOK_URL.');
  else {
    for (const line of lines) log(`   ${apply ? '' : 'would post: '}${line}`);
    if (apply) {
      await step('the Discord post', async () => {
        const res = await fetch(hook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: lines.join('\n') }),
        });
        if (!res.ok) throw new Error(`Discord answered ${res.status}`);
      });
    }
  }
  return { exitCode: failed > 0 ? 1 : 0 };
}

export async function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    console.log(USAGE);
    return 0;
  }
  if (parsed.error) {
    console.error(`${parsed.error}\n\n${USAGE}`);
    return 2;
  }
  const { exitCode } = await yank(parsed.options);
  return exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}

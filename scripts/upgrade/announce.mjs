#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * announce.mjs — tell every consumer about a release (hds#456, epic hds#445).
 *
 *   pnpm release:announce 0.34.0            dry run: prints what it would do
 *   pnpm release:announce 0.34.0 --apply    files or edits the issues, posts to Discord
 *
 * `pnpm release:local --publish` runs it with --apply right after a publish
 * that put a new version on npm, and only then (the published guard: the
 * version was absent before `changeset publish` and present after). Run it by
 * hand to re-announce, for example after setting a token that was missing.
 *
 * For each consumer (consumers.mjs) that is behind the release and not
 * skipped (archived, issues disabled, `hds-frozen`), it keeps ONE standing
 * upgrade issue (standing.mjs):
 *   - an open one (marker or the "Upgrade @hirobius/design-system…" title) is
 *     retargeted: title, body, and labels added. It is never closed as
 *     superseded, so a PR already working on it stays attached;
 *   - else a closed one with the marker is reopened with a one-line comment;
 *   - else a new one is filed.
 * Labels: `backlog` only, never `ralph-ready` (Adrian queues the work), plus
 * `needs-adrian` when the range has look or behavior changes.
 *
 * A release whose own steps are all none or additive updates the issues
 * quietly. Anything else also posts five lines to Discord
 * (DISCORD_WEBHOOK_URL). Discord never gets a private repo name.
 *
 * The step counts come from the shipped ledgers (upgrade/releases), for the
 * range from the consumer's locked version to the release. Nothing of the
 * consumer is downloaded or run: its own `upgrade --dry-run` narrows the list
 * to what its code uses.
 *
 * Token: HDS_FLEET_TOKEN (Contents: Read and Issues: Read and write on the
 * consumer repos), else GITHUB_TOKEN. A missing token or webhook skips that
 * step and names the variable. It always exits 0: a release is done once npm
 * has it, and a failed notice must not read as a failed publish.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { HDS_PACKAGE } from '../../codemods/lib/installed-version.mjs';
import { listOf, loadRecord } from '../../codemods/lib/record.mjs';
import { compareVersions, isVersion } from '../../codemods/lib/semver.mjs';
import { TOKEN_VAR, discoverConsumers, fleetToken } from './consumers.mjs';
import { API, MARKER, TITLE_PREFIX, github, isStanding, listIssues } from './standing.mjs';

const PACKAGE = HDS_PACKAGE;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SITE = 'https://hirobius-hds-components.vercel.app';
const UPGRADING_URL = 'https://github.com/hirobius/hds/blob/main/UPGRADING.md';
/** The repo whose issues Ralph works: its body follows ops's Work template. */
export const OPS_REPO = 'hirobius/ops';
const AGENT = 'hirobius-hds-release-announce';

const HEADINGS = {
  fixedForYou: 'Fixed for you',
  looksDifferent: 'Looks different',
  comingNext: 'Coming next',
  doByHand: 'Do by hand',
};
/** UPGRADING.md's four lists, in its order (codemods/lib/record.mjs listOf). */
const LISTS = Object.keys(HEADINGS);

export const USAGE = `usage: pnpm release:announce <version> [--apply]

  <version>   the release just published, such as 0.34.0
  --dry-run   the default: read and print, write nothing
  --apply     file or edit the standing issues and post to Discord`;

/** @returns {{ options?: any, help?: boolean, error?: string }} */
export function parseArgs(argv) {
  const options = { version: null, apply: false };
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--apply') options.apply = true;
    else if (arg === '--dry-run') options.apply = false;
    else if (arg.startsWith('--')) return { error: `unknown argument: ${arg}` };
    else if (options.version) return { error: 'name one version' };
    else options.version = arg;
  }
  if (!options.version || !isVersion(options.version)) {
    return { error: 'name the published version, such as 0.34.0' };
  }
  return { options };
}

export const issueTitle = (version) => `${TITLE_PREFIX} to ${version}`;

/**
 * The oldest version the consumer's importers lock, or null when none is
 * known (no lockfile, or a non-registry spec).
 */
export function lockedFrom(consumer) {
  const resolved = consumer.importers.map((i) => i.resolved).filter((v) => v && isVersion(v));
  return resolved.sort(compareVersions)[0] ?? null;
}

/**
 * The steps between `from` (exclusive) and `to` (inclusive), counted per
 * UPGRADING.md list. With `from` null only the release's own steps count.
 */
export function rangeSummary(ledgers, from, to) {
  const inRange = ledgers.filter(
    (l) =>
      compareVersions(l.version, to) <= 0 &&
      (from ? compareVersions(l.version, from) > 0 : compareVersions(l.version, to) === 0),
  );
  const steps = inRange.flatMap((l) => l.steps);
  const counts = Object.fromEntries(LISTS.map((list) => [list, 0]));
  for (const step of steps) counts[listOf(step)] += 1;
  return {
    releases: inRange.map((l) => l.version),
    counts,
    breaking: steps.filter((s) => s.impact === 'breaking').length,
    needsEyes: steps.some((s) => s.impact === 'look' || s.impact === 'behavior'),
  };
}

/** Whether a release's own steps are all none or additive: then Discord stays quiet. */
export function isQuiet(ledger) {
  return (ledger?.steps ?? []).every((s) => s.impact === 'none' || s.impact === 'additive');
}

/** The standing issue's labels. Never `ralph-ready`: Adrian queues the work. */
export function labelsFor(summary) {
  return summary.needsEyes ? ['backlog', 'needs-adrian'] : ['backlog'];
}

/** The standing issue's body for `repo`, moving from `from` (or unknown) to `version`. */
export function issueBody({ repo, from, version, summary }) {
  const ops = repo.toLowerCase() === OPS_REPO;
  const command = `npx ${PACKAGE}@${version} upgrade`;
  const range = from ? `${from} to ${version}` : `to ${version}`;
  const lines = [
    MARKER,
    '## Why',
    '',
    from
      ? `${PACKAGE} ${version} is out. This repo locks ${from}.`
      : `${PACKAGE} ${version} is out. The locked version could not be read, so the counts below cover ${version} only.`,
    'HDS edits this one issue on every release; it is never closed as superseded.',
  ];
  if (ops) lines.push('', '**North star:** No — infrastructure or polish');
  lines.push(
    '',
    `## What changes (${range})`,
    '',
    ...LISTS.map((list) => `- ${HEADINGS[list]}: ${summary.counts[list]}`),
    '',
    `Release page: ${SITE}/upgrade/${version} · every release: ${UPGRADING_URL}`,
    '',
    '## How',
    '',
    `1. \`${command} --dry-run\` lists what this repo's code uses. It writes nothing.`,
    `2. \`${command}\` runs the codemods, bumps the range, installs and typechecks.`,
    '3. Do the "Do by hand" items it prints.',
    '',
    '## Definition of Done',
    '',
    `- [ ] \`${command} --check\` exits 0`,
  );
  if (summary.needsEyes) {
    lines.push('- [ ] Adrian checked the Looks different list on the Vercel preview before merge');
  }
  lines.push(
    ops ? '- [ ] `bash ralph/gate.sh` green' : "- [ ] the repo's typecheck and tests green",
  );
  return lines.join('\n');
}

/**
 * What to do in one repo, from its open and closed issues:
 * `{ action: 'edit' | 'reopen' | 'create', issue? }`.
 * Open standing issues win (newest first); a closed one is reused only when
 * it carries the marker.
 */
export function pickStanding(open, closed) {
  const live = open.filter(isStanding);
  if (live.length) return { action: 'edit', issue: live[0] };
  const old = closed.find((i) => !i.pull_request && (i.body ?? '').includes(MARKER));
  if (old) return { action: 'reopen', issue: old };
  return { action: 'create' };
}

/** The five lines Discord gets. Counts only: no private repo name. */
export function discordLines({ version, ledger, filed, edited, reopened }) {
  return [
    `**${PACKAGE} ${version} is out.**`,
    ledger?.summary ?? 'See the release page.',
    `Consumer upgrade issues: ${filed} filed, ${edited} updated, ${reopened} reopened.`,
    `Upgrade: \`npx ${PACKAGE}@latest upgrade\``,
    `Release page: ${SITE}/upgrade/${version}`,
  ];
}

const readPublished = () =>
  JSON.parse(readFileSync(path.join(REPO_ROOT, 'upgrade/published.json'), 'utf8')).versions;

/** An error message that names the token when the token is the cause. */
export function explain(error, tokenVar = TOKEN_VAR) {
  const status = error?.status ?? /answered (\d{3})/.exec(error?.message ?? '')?.[1];
  if (String(status) === '401' || String(status) === '403') {
    return `${error.message}. Check ${tokenVar}: it needs Issues: Read and write and Contents: Read on the consumer repos.`;
  }
  return error?.message ?? String(error);
}

/**
 * @param {{ version: string, apply?: boolean, ledgers?: any[], published?: string[],
 *   env?: Record<string, string|undefined>, fetch?: typeof globalThis.fetch,
 *   discover?: typeof discoverConsumers, log?: (line: string) => void }} options
 * @returns {Promise<{ exitCode: 0, filed: number, edited: number, reopened: number, failed: number }>}
 */
export async function announce({
  version,
  apply = false,
  ledgers,
  published,
  env = process.env,
  fetch = globalThis.fetch,
  discover = discoverConsumers,
  log = console.log,
}) {
  const result = { exitCode: 0, filed: 0, edited: 0, reopened: 0, failed: 0 };
  published ??= readPublished();
  if (!published.includes(version)) {
    log(
      `${version} is not in upgrade/published.json, so it was not published: nothing to announce.`,
    );
    return result;
  }
  ledgers ??= loadRecord(REPO_ROOT).ledgers;
  const ledger = ledgers.find((l) => l.version === version);
  const mode = apply ? '' : ' (dry run: nothing is written; pass --apply to do it)';
  log(`Announce ${PACKAGE} ${version}${mode}`);

  const fleet = fleetToken(env);
  log('');
  log('1. Standing upgrade issues in consumer repos');
  if (!fleet) {
    log(`   skipped: set ${TOKEN_VAR} (Issues: Read and write on the consumer repos).`);
  } else {
    try {
      const gh = github(fleet.value, fetch, AGENT);
      const { consumers } = await discover({ token: fleet.value, tokenVar: fleet.name, fetch });
      for (const consumer of consumers) {
        const name = consumer.repo;
        if (consumer.skip?.length) {
          log(`   ${name}: skipped (${consumer.skip.join(', ')})`);
          continue;
        }
        const from = lockedFrom(consumer);
        if (from && compareVersions(from, version) >= 0) {
          log(`   ${name}: already on ${from}`);
          continue;
        }
        try {
          const summary = rangeSummary(ledgers, from, version);
          const title = issueTitle(version);
          const body = issueBody({ repo: name, from, version, summary });
          const labels = labelsFor(summary);
          const open = await listIssues(gh, name, 'open');
          const closed = open.some(isStanding) ? [] : await listIssues(gh, name, 'closed', 3);
          const plan = pickStanding(open, closed);
          const url = (n) => `${API}/repos/${name}/issues${n ? `/${n}` : ''}`;
          if (plan.action === 'create') {
            result.filed += 1;
            log(`   ${name}: file "${title}" [${labels.join(', ')}]`);
            if (apply) await gh('POST', url(), { title, body, labels });
          } else {
            const n = plan.issue.number;
            if (plan.action === 'reopen') {
              result.reopened += 1;
              log(`   ${name}#${n}: reopen as "${title}" [${labels.join(', ')}]`);
            } else {
              result.edited += 1;
              log(`   ${name}#${n}: retarget to "${title}" [${labels.join(', ')}]`);
            }
            if (apply) {
              const patch = { title, body, ...(plan.action === 'reopen' ? { state: 'open' } : {}) };
              await gh('PATCH', url(n), patch);
              // Add, never set: setting would drop labels Adrian put on it.
              await gh('POST', `${url(n)}/labels`, { labels });
              if (plan.action === 'reopen') {
                await gh('POST', `${url(n)}/comments`, {
                  body: `Reopened: ${PACKAGE} ${version} is out and this repo is still behind.`,
                });
              }
            }
          }
        } catch (error) {
          result.failed += 1;
          log(`   ${name}: failed: ${explain(error, fleet.name)}`);
        }
      }
    } catch (error) {
      result.failed += 1;
      log(`   the consumer scan failed: ${explain(error, fleet.name)}`);
    }
  }

  log('');
  log('2. Discord');
  if (isQuiet(ledger)) {
    log('   quiet: every change in this release is none or additive.');
  } else {
    const lines = discordLines({ version, ledger, ...result });
    const hook = env.DISCORD_WEBHOOK_URL?.trim();
    if (!hook) log('   skipped: set DISCORD_WEBHOOK_URL.');
    else {
      for (const line of lines) log(`   ${apply ? '' : 'would post: '}${line}`);
      if (apply) {
        try {
          const res = await fetch(hook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: lines.join('\n') }),
          });
          if (!res.ok) throw new Error(`Discord answered ${res.status}`);
        } catch (error) {
          result.failed += 1;
          log(`   the Discord post failed: ${error.message}`);
        }
      }
    }
  }
  if (result.failed) {
    log('');
    log(
      `${result.failed} step(s) failed. Fix the cause, then run: pnpm release:announce ${version} --apply`,
    );
  }
  return result;
}

/** Always 0 (see the file comment); usage errors are 2. */
export async function main(argv, io = {}) {
  const parsed = parseArgs(argv);
  if (parsed.help) {
    console.log(USAGE);
    return 0;
  }
  if (parsed.error) {
    console.error(`${parsed.error}\n\n${USAGE}`);
    return 2;
  }
  try {
    await announce({ ...parsed.options, ...io });
  } catch (error) {
    console.error(`release:announce: ${explain(error)}`);
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}

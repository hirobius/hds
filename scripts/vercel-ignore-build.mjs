#!/usr/bin/env node
/**
 * vercel-ignore-build — Vercel's "Ignored Build Step" (vercel.json ignoreCommand).
 * Exit 0 skips the build, exit 1 builds. Build CPU minutes are most of the Vercel
 * bill, and most pushes never change what ships.
 *
 * - Preview: skipped. Put `[preview]` in the commit message to get one.
 * - Production: skipped when every changed file since the last deploy is a note,
 *   agent file or test (SKIP below). Anything else, or an unknown diff, builds.
 *
 * Used by both projects: Storybook (vercel.json) and the docs site
 * (docs-site/vercel.json). Storybook publishes DESIGN.md and CONSUMING.md
 * (scripts/copy-agent-context.mjs), so those always build.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ALWAYS_BUILD = new Set(['DESIGN.md', 'CONSUMING.md', 'docs/CONSUMING.md']);

const SKIP = [
  /\.md$/,
  /^\.changeset\//,
  /^upgrade\/pending\//,
  /^\.status\//,
  /^\.claude\//,
  /^\.husky\//,
  /^\.github\//,
  /^status\.json$/,
  /^tests\//,
  /(^|\/)__tests__\//,
  /\.test\.[cm]?[jt]sx?$/,
];

export function shouldBuild(env, changed) {
  if (env.VERCEL_ENV === 'preview') {
    return /\[preview\]/.test(env.VERCEL_GIT_COMMIT_MESSAGE ?? '')
      ? { build: true, why: 'preview requested by [preview] in the commit message' }
      : {
          build: false,
          why: 'preview builds are off; add [preview] to the commit message to get one',
        };
  }
  if (!changed) return { build: true, why: 'no previous deploy to diff against' };
  if (changed.length === 0) return { build: true, why: 'redeploy with no file changes' };
  const shipped = changed.filter((f) => ALWAYS_BUILD.has(f) || !SKIP.some((re) => re.test(f)));
  return shipped.length
    ? { build: true, why: `${shipped.length} shipped file(s) changed, e.g. ${shipped[0]}` }
    : { build: false, why: `only notes, agent files or tests changed (${changed.length})` };
}

function changedFiles(prev) {
  if (!prev) return null;
  try {
    const out = execFileSync('git', ['diff', '--name-only', prev, 'HEAD'], { encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return null; // previous SHA not in the shallow clone: build
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { build, why } = shouldBuild(
    process.env,
    changedFiles(process.env.VERCEL_GIT_PREVIOUS_SHA),
  );
  console.log(`vercel-ignore-build: ${build ? 'BUILD' : 'SKIP'} — ${why}`);
  process.exit(build ? 1 : 0);
}

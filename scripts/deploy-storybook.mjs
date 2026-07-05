#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * deploy-storybook.mjs
 *
 * Publishes the built Storybook (storybook-static/) to Vercel as an ISOLATED,
 * preview-only static site — a component gallery, NOT a package release and NOT
 * the production app.
 *
 * Safety: this NEVER touches the repo-root vercel.json (which builds the /ops
 * app -> dist). It deploys the `storybook-static` folder directly, so Vercel
 * serves it as prebuilt static files with no app build and no coupling to the
 * production project.
 *
 * Requires VERCEL_TOKEN in the environment (set it in the remote env config,
 * then start a fresh session so it loads). Usage:
 *
 *   pnpm storybook:deploy            # preview deployment (unique URL)
 *   pnpm storybook:deploy -- --prod  # promote to the project's production alias
 *
 * Any extra args after `--` are forwarded to `vercel deploy`.
 */

import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const token = process.env.VERCEL_TOKEN;
if (!token) {
  console.error(
    '✗ VERCEL_TOKEN is not set in this session.\n' +
      '  Set it in the environment config, then start a NEW session (env vars only\n' +
      '  load into a freshly-started container) and re-run `pnpm storybook:deploy`.',
  );
  process.exit(1);
}

// 1. Build Storybook (idempotent — safe to re-run).
console.log('▸ Building Storybook (pnpm build-storybook)…');
execFileSync('pnpm', ['build-storybook'], { cwd: ROOT, stdio: 'inherit' });

const outDir = path.join(ROOT, 'storybook-static');
if (!existsSync(path.join(outDir, 'index.html'))) {
  console.error('✗ storybook-static/index.html is missing after the build.');
  process.exit(1);
}

// 2. Deploy the static folder as its own Vercel project.
//    `vercel deploy <dir>` deploys ONLY that folder; the repo-root vercel.json is
//    not consulted, so the production app project is untouched. `--yes` accepts
//    project defaults (creates the project on first run). The token is passed as
//    a discrete argv item (no shell) so special characters can't break it.
const passthrough = process.argv.slice(2);
const args = [
  '--yes',
  'vercel',
  'deploy',
  'storybook-static',
  '--yes',
  '--token',
  token,
  ...passthrough,
];

console.log('▸ Deploying storybook-static to Vercel…');
const output = execFileSync('npx', args, { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(output);

// `vercel deploy` prints the deployment URL to stdout; the last non-empty line is it.
const url = output
  .trim()
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .pop();
console.log(`\n✓ Storybook deployed: ${url}`);
console.log(
  '  Note: a brand-new Vercel project may have Deployment Protection (Vercel\n' +
    '  Authentication) enabled — you can view it while signed in; to share it\n' +
    '  publicly, turn protection off in the project’s settings.',
);

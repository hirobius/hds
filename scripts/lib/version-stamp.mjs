/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * version-stamp.mjs — which package version the agent docs describe (hds#463).
 *
 * The committed files (and so the tarball) carry package.json's version:
 *   - llms.txt, public/llms.txt, public/llms-full.txt, public/llms/*.txt: a
 *     `Version: <v>` line;
 *   - skills/hds-consumer/SKILL.md: `metadata.hds-version` in the frontmatter;
 *   - public/hds-manifest.json: `packageVersion`.
 * package.json's version only moves in `pnpm changeset:version`, which
 * regenerates all of them, so on main they name the last release. The hosted
 * docs build from main, so their copy says `<last release>+main <short sha>`
 * (restamp, run by scripts/copy-agent-context.mjs). `stampDrift` is the pretest
 * gate (scripts/check-version-stamps.mjs).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const PKG = '@hirobius/design-system';
export const UPGRADE_COMMAND = `npx ${PKG}@latest upgrade`;

export const readPackageVersion = (root) =>
  JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

export const versionLine = (version) => `Version: ${version}`;

/** A file of the published package at exactly `version`. */
export const cdnUrl = (version, pkgPath) =>
  `https://cdn.jsdelivr.net/npm/${PKG}@${version}/${pkgPath}`;

export const hostedStamp = (version, sha) => `${version}+main ${String(sha).slice(0, 7)}`;

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Rewrite every `version` stamp in `text` (any of the three shapes) to `stamp`. */
export function restamp(text, version, stamp) {
  const v = escapeRegExp(version);
  return text
    .replace(new RegExp(`^Version: ${v}$`, 'gm'), `Version: ${stamp}`)
    .replace(new RegExp(`("packageVersion": )"${v}"`, 'g'), `$1"${stamp}"`)
    .replace(new RegExp(`^(\\s+hds-version: )"${v}"$`, 'gm'), `$1"${stamp}"`);
}

/** The stamp a file carries, or null when it has none. */
export function readStamp(rel, text) {
  if (rel.endsWith('.json')) return JSON.parse(text).packageVersion ?? null;
  if (rel.endsWith('SKILL.md')) return /^\s+hds-version: "([^"]+)"$/m.exec(text)?.[1] ?? null;
  return /^Version: (.+)$/m.exec(text)?.[1] ?? null;
}

/** Every committed file that must carry the package version. */
export function stampedFiles(root) {
  const slices = existsSync(join(root, 'public/llms'))
    ? readdirSync(join(root, 'public/llms'))
        .filter((f) => f.endsWith('.txt'))
        .sort()
        .map((f) => `public/llms/${f}`)
    : [];
  return [
    'llms.txt',
    'public/llms.txt',
    'public/llms-full.txt',
    ...slices,
    'skills/hds-consumer/SKILL.md',
    'public/hds-manifest.json',
  ];
}

/** [{ file, found, expected }] for every stamped file that does not say package.json's version. */
export function stampDrift(root) {
  const expected = readPackageVersion(root);
  const out = [];
  for (const file of stampedFiles(root)) {
    const abs = join(root, file);
    const found = existsSync(abs) ? readStamp(file, readFileSync(abs, 'utf8')) : null;
    if (found !== expected) out.push({ file, found, expected });
  }
  return out;
}

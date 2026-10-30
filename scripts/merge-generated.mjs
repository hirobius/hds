#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * merge-generated.mjs — the `hds-generated` git merge driver (hds#977).
 *
 * `.gitattributes` gives it every file scripts/regen.mjs rebuilds. It merges
 * the way git would (`git merge-file`), but where both sides changed the same
 * lines it keeps ours instead of writing conflict markers, so the merge never
 * stops on a generated file. It does not take one whole side: README.md and
 * DESIGN-HANDOFF.md are only partly generated, so their side's prose outside
 * the overlap still lands. A JSON file whose line merge does not parse keeps
 * our whole side, since the generators read some of them back. It then leaves
 * a marker in the git dir, and .husky/post-merge (`regen.mjs --after-merge`)
 * rebuilds the files from source.
 *
 * git reads drivers only from .git/config, never from the repo, so
 * scripts/setup-hooks.mjs (pnpm install's `prepare`) registers it with
 * installMergeDriver().
 *
 *   node scripts/merge-generated.mjs %O %A %B %P   # as git calls it: base, ours (rewritten in place), theirs, path
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { markerPath } from './regen.mjs';

export const DRIVER = 'hds-generated';

const SELF = fileURLToPath(import.meta.url);

/** Register the driver in `root`'s .git/config. `script` is the path git runs. */
export function installMergeDriver(root, script = 'scripts/merge-generated.mjs') {
  const set = (key, value) =>
    spawnSync('git', ['config', '--local', `merge.${DRIVER}.${key}`, value], { cwd: root });
  set('name', 'HDS generated file: merge, keep ours on overlap, then pnpm regen (hds#977)');
  return set('driver', `node ${script} %O %A %B %P`).status === 0;
}

/** The merged text, or our side when `path` is JSON and the merge does not parse. */
export function pickMerged(path, merged, ours) {
  if (!path.endsWith('.json')) return merged;
  try {
    JSON.parse(merged);
    return merged;
  } catch {
    return ours;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) {
  const [base, current, other, path = current] = process.argv.slice(2);
  const ours = readFileSync(current, 'utf8');
  const res = spawnSync('git', ['merge-file', '-p', '--ours', current, base, other], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  // merge-file exits with the conflict count (0 with --ours) or negative on error.
  const merged = res.status === 0 ? res.stdout : ours;
  writeFileSync(current, pickMerged(path, merged, ours));
  const marker = markerPath(process.cwd());
  if (marker) writeFileSync(marker, `${path}\n`, { flag: 'a' });
  process.exit(0);
}

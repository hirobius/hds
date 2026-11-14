/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Test helpers for a git root whose Figma was synced on a Version PR head and
 * then squash-merged (hds#1359, hds#1553): shared by check-figma-release and
 * check-figma-drift-synced tests.
 */
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { ingestSnapshot } from '../../figma-snapshot.mjs';
import { parseSnapshotFile, serializeSnapshotFile } from '../../lib/figma-snapshot.mjs';
import { hdsRunPush, hdsRunSnapshot } from '../../lib/figma-runtime.mjs';
import { buildPushPayload } from '../../lib/figma-scripts.mjs';
import { loadFigmaInputs } from '../../lib/figma-inputs.mjs';
import { newFixtureFile } from './figma-fixture.mjs';

const env = {
  ...process.env,
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@t',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@t',
};

export const git = (dir, ...args) =>
  execFileSync('git', args, { cwd: dir, env, encoding: 'utf8' }).trim();

/** Commits `paths` (default: the synced inputs that exist) and returns the new HEAD sha. */
export const commitAll = (
  dir,
  message,
  paths = ['hirobius.tokens.json', 'package.json', 'figma/disposition.json'],
) => {
  git(dir, 'add', '-A', '--', ...paths.filter((path) => existsSync(join(dir, path))));
  git(dir, 'commit', '-q', '-m', message);
  return git(dir, 'rev-parse', 'HEAD');
};

/** A commit with HEAD's tree and no parent: what a squash merge lands on main. */
export const squash = (dir) => {
  const sha = git(dir, 'commit-tree', 'HEAD^{tree}', '-m', 'squash');
  git(dir, 'reset', '-q', '--soft', sha);
  return sha;
};

export const snapshotFile = (dir) =>
  parseSnapshotFile(readFileSync(join(dir, 'figma', 'snapshot.json'), 'utf8'));

/** Pushes the model built from `dir` to a fake Figma, then ingests its snapshot into `dir`. */
export async function pushAndIngest(dir) {
  const { model } = loadFigmaInputs(dir);
  const figma = newFixtureFile();
  const { payload, checksum } = buildPushPayload(model);
  await hdsRunPush(figma, payload, checksum);
  ingestSnapshot({ root: dir, text: serializeSnapshotFile(await hdsRunSnapshot(figma)) });
}

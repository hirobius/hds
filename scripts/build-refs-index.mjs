#!/usr/bin/env node
/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * build-refs-index — writes eval/refs/INDEX.md, the design refs index build
 * agents read instead of the images (eval/refs/README.md). `--check` fails when
 * the committed file is stale; the nightly run regenerates it after every ref.
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rootFromArgv, runGenerator } from './lib/generated-check.mjs';
import { indexText } from './lib/refs/load.mjs';
import { PATHS } from './lib/refs/spec.mjs';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ROOT = rootFromArgv(join(dirname(fileURLToPath(import.meta.url)), '..'));
  await runGenerator({
    root: ROOT,
    outputs: { [PATHS.index]: indexText(ROOT) },
    label: 'build-refs-index',
    fix: 'pnpm refs:index',
  });
}

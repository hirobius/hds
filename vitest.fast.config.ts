/**
 * Vitest configuration — FAST LANE of the split test gate (hds#1090).
 *
 * This is the one mechanism behind `pnpm test:fast`: the base config
 * (vitest.config.ts) with the heavy list excluded. The heavy list is
 * scripts/__tests__/heavy-files.txt — one path per line, parsed exactly
 * like scripts/lib/test-lanes.mjs parses it (first token per non-comment
 * line). Heavy files are not skipped or weakened; they run in the full
 * suite (`pnpm test`), in the nightly full run, and whenever a diff
 * triggers their area (see scripts/lib/test-lanes.mjs).
 *
 * Everything else — plugins, aliases, include globs, timeouts, coverage —
 * is inherited from the base config via mergeConfig. Do not copy settings
 * here; change them in vitest.config.ts.
 */
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import { readFileSync } from 'fs';
import path from 'path';
import baseConfig from './vitest.config';

const heavyFiles = readFileSync(
  path.resolve(__dirname, 'scripts/__tests__/heavy-files.txt'),
  'utf8',
)
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'))
  .map((line) => line.split(/\s+/)[0]);

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      exclude: [...configDefaults.exclude, ...heavyFiles],
    },
  }),
);

/**
 * Vitest configuration for Stryker mutation runs (hds#1089) — the base
 * config with one change: `testTimeout` 20s -> 120s.
 *
 * Mutation runs execute the tests inside Stryker's sandbox with coverage
 * instrumentation, on top of whatever else the machine is doing. The repo's
 * child-process tests (the CLI suites) already needed 5s -> 20s for plain
 * load (see vitest.config.ts); in the sandbox they blow past 20s and fail
 * the dry run for speed, not correctness. Same tests, same assertions, more
 * room. Everything else is inherited unchanged.
 */
import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config';

export default mergeConfig(
  base,
  defineConfig({
    test: {
      testTimeout: 120_000,
    },
  }),
);

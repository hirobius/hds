// @vitest-environment node
/**
 * Behaviour and shape contract for `src/lib/env.ts`.
 *
 * `env.ts` exists because shipped library code cannot read `import.meta.env`
 * (see `tests/no-shipped-import-meta-env.test.ts`). Its replacement has its own
 * failure mode, and this file pins it.
 *
 * THE SHAPE MATTERS AS MUCH AS THE BEHAVIOUR. Every consumer bundler that
 * substitutes `process.env.NODE_ENV` substitutes that exact member expression
 * and nothing else — it does not reason about a `typeof process` guard wrapped
 * around it. Measured with esbuild 0.25.12, `platform: browser`,
 * `--define:process.env.NODE_ENV='"production"'`:
 *
 *   typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
 *     -> typeof process !== "undefined" && true
 *
 * The literal is replaced, the guard is not. In a browser bundle `process` is
 * genuinely absent at runtime, so the whole expression evaluates to `false` in
 * a PRODUCTION build — the guard inverts the answer in the single most common
 * consumer configuration. That is the same class of silently-wrong constant
 * `import.meta.env` produced, which is why it gets a test and not a comment.
 *
 * `try { process.env.NODE_ENV } catch {}` has no such problem: the member
 * expression is bare, so it is replaced; the try only catches the ReferenceError
 * in a runtime with no `process` at all (native ESM in a browser, no bundler).
 * Verified to survive `minify: true` in the same measurement.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect, afterEach } from 'vitest';

import { isProduction, isDevelopment } from './env';

const SOURCE = readFileSync(join(fileURLToPath(new URL('.', import.meta.url)), 'env.ts'), 'utf8');

/** Comment text may name the thing it warns against; code may not. */
const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const original = process.env.NODE_ENV;
afterEach(() => {
  if (original === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = original;
});

describe('isProduction / isDevelopment', () => {
  it('reads a production build as production', () => {
    process.env.NODE_ENV = 'production';
    expect(isProduction()).toBe(true);
    expect(isDevelopment()).toBe(false);
  });

  it('reads a development build as development', () => {
    process.env.NODE_ENV = 'development';
    expect(isProduction()).toBe(false);
    expect(isDevelopment()).toBe(true);
  });

  it('treats an unset NODE_ENV under Node as development, matching the ecosystem norm', () => {
    // `process.env.NODE_ENV !== 'production'` is how React and most of npm read
    // this. A script or test run with nothing set wants the warnings.
    delete process.env.NODE_ENV;
    expect(isProduction()).toBe(false);
    expect(isDevelopment()).toBe(true);
  });

  it('never reports both, whatever the environment says', () => {
    for (const value of ['production', 'development', 'test', 'staging', '']) {
      process.env.NODE_ENV = value;
      expect(isProduction()).not.toBe(isDevelopment());
    }
  });
});

describe('env.ts source shape — what makes the bundler substitution work', () => {
  it('reads the bare `process.env.NODE_ENV` member expression bundlers replace', () => {
    expect(code).toMatch(/process\s*\.\s*env\s*\.\s*NODE_ENV/);
  });

  it('never guards that read with `typeof process`, which survives substitution', () => {
    // The guard is not replaced, so it stays a runtime check that is false in
    // every browser bundle — inverting the answer in a production build. See
    // this file's docblock for the measured esbuild output.
    expect(code).not.toMatch(/typeof\s+process/);
  });

  it('catches the ReferenceError instead, for a runtime with no process at all', () => {
    expect(code).toMatch(/try\s*\{[^}]*process\s*\.\s*env\s*\.\s*NODE_ENV[\s\S]*?\}\s*catch/);
  });

  it('treats a missing `process` as production, so no consumer gets dev noise in prod', () => {
    // Unbundled native ESM in a browser is the only runtime that reaches the
    // catch, and it is always a real page, never a dev build. Defaulting it to
    // development would ship console warnings to end users — the exact outcome
    // the dead `import.meta.env` guards were hiding.
    expect(code).toMatch(/catch/);
    expect(code).toMatch(/ABSENT|MISSING|NO_PROCESS/);
  });
});

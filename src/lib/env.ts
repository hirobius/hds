/**
 * Build-environment checks that survive being published.
 *
 * Shipped library code must never read `import.meta.env`. Vite's library build
 * evaluates it at HDS's build time, not the consumer's, so `import.meta.env.DEV`
 * bakes to `false` and `.PROD` to `true` inside `dist/` — turning every guard
 * written against them into a constant for everyone who installs the package.
 *
 * `process.env.NODE_ENV` is the replacement because consumer bundlers
 * substitute that exact member expression at THEIR build time, which is the
 * moment that actually knows the answer. Vite, webpack, Next and esbuild all do
 * it by default; plain Rollup needs `@rollup/plugin-replace` configured, so this
 * is a convention rather than a guarantee, and the fallback below is what makes
 * it safe when nobody substituted anything.
 *
 * READ THE SHAPE BEFORE CHANGING IT. The substitution replaces the member
 * expression and nothing around it, so wrapping the read in `typeof process !==
 * 'undefined' && ...` leaves a runtime check that a browser bundle always fails,
 * inverting the answer in a production build. The bare read inside a `try` is
 * substituted cleanly and the `catch` covers the one runtime that has no
 * `process` at all: native ESM in a browser with no bundler. That runtime is
 * always a real page, never a dev build, so it resolves to production and gets
 * no warnings. Measured output and the reasoning live in `env.test.ts`, which
 * fails if this shape is undone.
 *
 * Guarded by `src/lib/env.test.ts` and `tests/no-shipped-import-meta-env.test.ts`.
 */

declare const process: { env: { NODE_ENV?: string } };

/** No `process` in this runtime at all — distinct from `NODE_ENV` being unset. */
const ABSENT = Symbol('hds.env.absent');

function readNodeEnv(): string | undefined | typeof ABSENT {
  try {
    return process.env.NODE_ENV;
  } catch {
    return ABSENT;
  }
}

/** True when the CONSUMER built for production, or when there is no build at all. */
export function isProduction(): boolean {
  const env = readNodeEnv();
  return env === 'production' || env === ABSENT;
}

/** True outside a consumer production build — the gate for dev-only warnings. */
export function isDevelopment(): boolean {
  return !isProduction();
}

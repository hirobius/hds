/**
 * Build-environment checks that survive being published.
 *
 * Shipped library code must never read `import.meta.env`. Vite's library build
 * evaluates it at HDS's build time, not the consumer's, so `import.meta.env.DEV`
 * bakes to `false` and `.PROD` to `true` inside `dist/` — turning every guard
 * written against them into a constant for everyone who installs the package.
 *
 * `process.env.NODE_ENV` is the library convention precisely because every
 * consumer bundler (Vite, webpack, Next, Rollup) statically replaces that exact
 * member expression at THEIR build time, which is the moment that actually
 * knows the answer. The `typeof` guard keeps this safe in a runtime where
 * `process` is genuinely absent (native ESM in a browser); bundlers still
 * replace the literal inside it, so dead-code elimination is unaffected.
 *
 * Guarded by `tests/no-shipped-import-meta-env.test.ts`.
 */

declare const process: { env: { NODE_ENV?: string } } | undefined;

/** True when the CONSUMER built for production. */
export function isProduction(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
}

/** True outside a consumer production build — the gate for dev-only warnings. */
export function isDevelopment(): boolean {
  return !isProduction();
}

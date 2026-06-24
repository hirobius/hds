/**
 * Dev-only deprecation warnings for the HDS runtime.
 *
 * Pairs with the `check-deprecations` gate (which enforces that every
 * `@deprecated` API carries a future `@removeIn` version) and the `codemods/`
 * migrations. Use this to surface a one-time console warning when a deprecated
 * prop is actually used, so consumers notice before the removal version lands.
 *
 * No-op in production builds. Each unique `code` warns at most once per session.
 */
const warned = new Set<string>();

/** Emit a deprecation warning once per unique `code` (dev only). */
export function warnOnce(code: string, message: string): void {
  if (import.meta.env?.PROD) return;
  if (warned.has(code)) return;
  warned.add(code);
  console.warn(`[HDS deprecation] ${message} (${code})`);
}

/** Test/Storybook helper to reset the once-per-session guard. */
export function __resetDeprecationWarnings(): void {
  warned.clear();
}

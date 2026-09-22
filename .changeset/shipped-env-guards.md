---
'@hirobius/design-system': minor
---

Three shipped guards were dead in every installed copy, baked by our own build.

Library code read `import.meta.env`, which Vite's library build evaluates at HDS's build
time rather than the consumer's. It baked to a constant inside `dist/`, so the guards had
never run for anyone who installed the package:

- `Icon` never warned about a missing `icon` prop (`import.meta.env.DEV` baked to `false`).
- `warnOnce` never emitted a deprecation warning (`import.meta.env.PROD` baked to `true`),
  so the whole deprecation channel was silent.
- `TenantProvider` never wrote `data-brand` / `data-tenant`, because `VITE_TENANT_SLUG` was
  read from HDS's environment and baked to `{}`. It was inert regardless of what a consumer
  set.

The first two now read `process.env.NODE_ENV`, which consumer bundlers substitute at the
build that actually knows the answer.

**Breaking:** `TenantProvider` takes the tenant as a `slug` prop instead of reading an
environment variable. A library component cannot read its consumer's environment, so there
is no backwards-compatible version of the old behaviour — but nothing depended on it
either, since it never worked once installed. Omitting `slug` writes no attribute, which is
what every existing call site already got.

```tsx
<TenantProvider slug={import.meta.env.VITE_TENANT_SLUG as TenantSlug}>
```

Two standing guards keep the class from returning: `tests/no-shipped-import-meta-env.test.ts`
fails on any `import.meta.env` reachable from shipped source, including via bracket access
or destructuring, and `src/lib/env.test.ts` pins the source shape that makes the bundler
substitution work.

/**
 * @hirobius/design-system/patterns
 *
 * The 22 `pattern`-tier components (hds#254 disposition table, ratified
 * 2026-09-26): composed, higher-level surfaces (nav shells, feeds, rails,
 * pickers) as opposed to the `core` primitives the main barrel is trending
 * toward. Split into their own subpath so a consumer that only needs
 * primitives doesn't pull in this tier's weight.
 *
 * Every one of these is STILL re-exported from the package root today —
 * hds#254 keeps the root re-export for one minor with a `@deprecated` /
 * `@removeIn` notice on each component (see the JSDoc in each module under
 * `src/app/components/`). Prefer importing from here; the root re-export is
 * scheduled for removal at the next major once ops has a codemod (hds#124).
 */
export * from './app/components/calendar';
export * from './app/components/file-input';
export * from './app/components/form';
export * from './app/components/app-shell';
export * from './app/components/overflow-list';
export * from './app/components/page';
export * from './app/components/activity-feed';
export * from './app/components/asset-img';
export * from './app/components/carousel';
export * from './app/components/code-block';
export * from './app/components/stacked-card-rail';
export * from './app/components/doc-link-card';
export * from './app/components/nav-item';
export * from './app/components/side-nav';
export * from './app/components/stepper';
export * from './app/components/top-nav';
export * from './app/components/tree-list';
export * from './app/components/error-pattern';
export * from './app/components/toolbar';
export * from './app/components/command-palette';
export * from './app/components/image-lightbox';
export * from './app/components/reveal';

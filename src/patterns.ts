/**
 * @hirobius/design-system/patterns
 *
 * The `pattern`-tier modules (hds#254 disposition table, ratified
 * 2026-09-26): composed, higher-level surfaces (page shells, forms, code
 * blocks, page sections) as opposed to the `core` primitives the main barrel
 * is trending toward. Split into their own subpath so a consumer that only needs
 * primitives doesn't pull in this tier's weight.
 *
 * This is the only entry that exports them. Until 0.20.0 the package root
 * also re-exported 21 of these modules behind `@deprecated` aliases (hds#254);
 * hds#389 R1 removed those root re-exports, and
 * `npx -p @hirobius/design-system@^0.20.0 hds-patterns-subpath`
 * (codemods/patterns-subpath.mjs) moves consumer imports here.
 *
 * The same release removed 16 of these modules outright (hds#394 wave 4a, no
 * survivor): ActivityFeed, AppShell, Calendar, Carousel, CommandPalette,
 * DocLinkCard, FileInput, Lightbox, NavItem, OverflowList, SideNav,
 * StackedCardRail, Stepper, Toolbar, TopNav and TreeList. The codemod reports
 * an import of any of them for a manual edit (codemods/removed-0.20.json).
 *
 * StatusTile joined this entry in the same release (hds#389 D5, hds#395): the
 * root stopped exporting it, and hds-patterns-subpath moves a root import of
 * StatusTile, StatusTileProps or StatusTileTone here.
 */
export * from './app/components/form';
export * from './app/components/page';
export * from './app/components/asset-img';
export * from './app/components/code-block';
export * from './app/components/error-pattern';
export * from './app/components/reveal';
export * from './app/components/page-header';
export * from './app/components/metric-tiles';
export * from './app/components/form-actions';
export * from './app/components/destructive-section';
export * from './app/components/data-table-section';
export * from './app/components/status-tile';

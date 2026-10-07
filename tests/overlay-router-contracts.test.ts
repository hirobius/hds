// @vitest-environment node
/**
 * hds#393 (prune B3 steps 5 and 6): Popover, Tooltip and HdsRouterProvider are
 * in the core set (step 7, scripts/lib/core-components.mjs), so each must carry the
 * contract an agent reads to pick it. These tests read the committed
 * public/hds-manifest.json, which `pnpm manifest:generate` builds from the
 * components' JSDoc, so they fail when a tag is missing or the regen is stale.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Spec {
  hidden?: boolean;
  deprecated?: string;
  usage?: {
    when?: string;
    whenNot?: string;
    useInstead?: Array<{ component: string; reason?: string }>;
  };
  keyboard?: Array<{ keys: string; effect: string }>;
}

const ROOT = resolve(__dirname, '..');
const specs: Record<string, Spec> = JSON.parse(
  readFileSync(resolve(ROOT, 'public/hds-manifest.json'), 'utf8'),
).componentSpecs;

/**
 * Names the prune removes (hds#389: R1, B4 waves 4a and 4b, B5). An alternative
 * that points at one of them sends people to a component that is about to go.
 */
const REMOVED_BY_PRUNE = new Set([
  // R1: already deprecated
  'CinematicLink',
  'ComponentInstanceMatrix',
  'FoundationSwatch',
  'Sketch',
  'Token',
  // B4 wave 4a
  'ActivityFeed',
  'AppShell',
  'ButtonGroup',
  'Calendar',
  'Carousel',
  'CaseStudyLayout',
  'CommandPalette',
  'ContextMenu',
  'DateInput',
  'DateRangeInput',
  'DateTimeInput',
  'DocLinkCard',
  'ErrorBoundary',
  'FileInput',
  'HdsDocsShell',
  'HdsSystemDocLayout',
  'HeadingStack',
  'HistoryCard',
  'HoverCard',
  'Lightbox',
  'NavGroup',
  'NavItem',
  'OverflowList',
  'SideNav',
  'StackedCardRail',
  'Stepper',
  'StepperField',
  'TextLockup',
  'Tokenizer',
  'Toolbar',
  'TopNav',
  'TreeList',
  // B4 wave 4b
  'AspectRatio',
  'Bleed',
  'Center',
  'CircularProgress',
  'Cluster',
  'Cover',
  'Frame',
  'IconButton',
  'InputGroup',
  'MultiSelector',
  'SelectableCard',
  'TimeInput',
  'ToggleButton',
  // B5
  'NotFoundPattern',
  'TileGrid',
]);

/** Minimum usage.when length, as scripts/check-contract-coverage.mjs enforces for core. */
const MIN_WHEN = 20;

describe.each(['Popover', 'Tooltip'])('%s contract', (name) => {
  const spec = () => specs[name];

  it('is a public spec', () => {
    expect(spec(), `${name} has no spec`).toBeDefined();
    expect(spec().hidden).toBe(false);
  });

  it('says when to use it', () => {
    expect(spec().usage?.when?.length ?? 0).toBeGreaterThanOrEqual(MIN_WHEN);
  });

  it('says when not to', () => {
    expect(spec().usage?.whenNot?.length ?? 0).toBeGreaterThanOrEqual(MIN_WHEN);
  });

  it('names alternatives that exist and survive the prune', () => {
    const instead = spec().usage?.useInstead ?? [];
    expect(instead.length).toBeGreaterThan(0);
    for (const { component, reason } of instead) {
      const target = component.split('.')[0];
      expect(specs[target], `${component} has no spec`).toBeDefined();
      expect(specs[target].deprecated, `${component} is deprecated`).toBeUndefined();
      expect(REMOVED_BY_PRUNE.has(target), `${component} is removed by the prune`).toBe(false);
      expect(reason, `${component} gives no reason`).toBeTruthy();
    }
  });
});

// The keys come from what tests/primitive-contracts/keyboard.contract.test.tsx
// drives with a real keyboard; docs/rules/REACT_COMPONENTS.md requires the
// tags to match it.
describe('keyboard contract tags', () => {
  it.each([
    ['Popover', ['Enter/Space', 'Escape', 'Tab']],
    ['Tooltip', ['Focus', 'Escape', 'Tab']],
  ])('%s declares the keys its keyboard contract test covers', (name, keys) => {
    const keyboard = specs[name].keyboard ?? [];
    expect(keyboard.map((entry) => entry.keys)).toEqual(keys);
    for (const entry of keyboard) expect(entry.effect.length).toBeGreaterThan(0);
  });
});

describe('Tooltip Figma link', () => {
  // Node 93:15 is the published Tooltip in the library file named by
  // figma/links.json libraryFileKey; check-figma-coverage reports it unmapped
  // until the component carries the @figma tag.
  it('points at node 93:15 in the published library', () => {
    expect(specs.Tooltip).toMatchObject({
      figmaUrl:
        'https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=93-15',
    });
  });
});

describe('HdsRouterProvider spec', () => {
  // A provider seam like HdsThemeProvider: no visual, no docs page, no Figma
  // node, but a public export an agent must find to wire routing.
  it('is a doc-exempt Theming primitive in the manifest', () => {
    expect(specs.HdsRouterProvider).toMatchObject({
      category: 'Theming',
      tier: 'primitive',
      docExempt: true,
      hidden: false,
      filePath: 'src/app/context/RouterContext.tsx',
    });
  });

  it('says when to use it', () => {
    expect(specs.HdsRouterProvider.usage?.when?.length ?? 0).toBeGreaterThanOrEqual(MIN_WHEN);
  });

  it('adds no spec for the hook or the types that share its module', () => {
    for (const name of ['useHdsRouter', 'HdsRouterAdapter', 'HdsLinkProps', 'HdsNavigateOptions']) {
      expect(specs[name], name).toBeUndefined();
    }
  });
});

/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/component-discovery.mjs: the JSDoc tags that feed
 * public/hds-manifest.json (category, tier, `@figma` node URL).
 *
 * The `@figma <node-url>` tag is how a Code Connect template gets its node URL
 * (tag → manifest figmaUrl → generated template), so a component whose tags
 * discovery cannot read can never be mapped.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverHdsComponents, readComponentTags } from '../component-discovery.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NODE_URL =
  'https://www.figma.com/design/2VgBbVpKiDnu0aftJEVyBQ/HDS-Tokens-Components?node-id=1-2';

describe('readComponentTags', () => {
  it('carries the contract tags and keeps their text out of the description', () => {
    const source = `/**\n * @category Actions\n */\n\n/**\n * Container.\n * @usage Group things.\n * @useInstead Card.Metric a KPI\n * @slot body The content.\n * @keyboard Escape Closes it.\n * @ai-rules sx colors MUST use token keys\n * not raw values.\n */\nexport const Box = () => null;\n`;
    const tags = readComponentTags(source, 'Box');
    expect(tags.description).toBe('Container.');
    expect(tags.usage).toEqual({
      when: 'Group things.',
      whenNot: null,
      useInstead: [{ component: 'Card.Metric', reason: 'a KPI' }],
    });
    expect(tags.slots).toEqual([{ name: 'body', description: 'The content.' }]);
    expect(tags.keyboard).toEqual([{ keys: 'Escape', effect: 'Closes it.' }]);
    expect(tags.aiRules).toBe('sx colors MUST use token keys not raw values.');
  });

  it('reads a file-level JSDoc at the top of the file', () => {
    const source = `/**\n * Badge.\n * @category Feedback\n * @tier primitive\n * @figma ${NODE_URL}\n */\n\nexport const Badge = () => null;\n`;
    expect(readComponentTags(source, 'Badge')).toMatchObject({
      category: 'Feedback',
      tier: 'primitive',
      figmaUrl: NODE_URL,
    });
  });

  it('reads a file-level JSDoc that follows leading line comments (button.tsx, input.tsx)', () => {
    const source = `// motion-ok: motion via Tailwind transitions\n// second note\n/**\n * @category Actions\n * @tier primitive\n * @figma Variant=Button/Variant\n * @figma ${NODE_URL}\n */\n\nimport * as React from 'react';\n\n/**\n * Triggers an action when activated.\n */\nexport const Button = () => null;\n`;
    expect(readComponentTags(source, 'Button')).toMatchObject({
      category: 'Actions',
      tier: 'primitive',
      figmaUrl: NODE_URL,
      description: 'Triggers an action when activated.',
    });
  });

  it('prefers an @figma tag on the export block over the file block', () => {
    const other = NODE_URL.replace('1-2', '3-4');
    const source = `/**\n * @category Actions\n * @figma ${NODE_URL}\n */\n\n/**\n * Button.\n * @figma ${other}\n */\nexport const Button = () => null;\n`;
    expect(readComponentTags(source, 'Button').figmaUrl).toBe(other);
  });

  it('does not treat a JSDoc that follows code as the file block', () => {
    const source = `import x from 'x';\n/**\n * @category Actions\n */\nconst y = x;\nexport const Button = () => y;\n`;
    expect(readComponentTags(source, 'Button').category).toBeNull();
  });

  it('ignores non-URL @figma values (property notes)', () => {
    const source = `/**\n * @category Actions\n * @figma Variant=Button/Variant\n */\nexport const Button = () => null;\n`;
    expect(readComponentTags(source, 'Button').figmaUrl).toBeNull();
  });

  it('reads a tag only at the start of a JSDoc line, not an @word inside prose (hds#390)', () => {
    // hds-tooltip.tsx says "the internal `ExpandTooltip` (an @internal
    // image-expand pill …)" in its description, and that prose hid the public
    // Tooltip from the manifest, SKILL.md and llms.txt.
    const prose = `/**\n * Tooltip.\n * @category Overlays\n * Unlike ExpandTooltip (an @internal pill), this one is public.\n */\nexport const Tooltip = () => null;\n`;
    expect(readComponentTags(prose, 'Tooltip')).toMatchObject({
      internal: false,
      category: 'Overlays',
    });
    const tagged = `/**\n * Pill.\n * @internal\n */\nexport const ExpandTooltip = () => null;\n`;
    expect(readComponentTags(tagged, 'ExpandTooltip').internal).toBe(true);
  });
});

describe('readComponentTags — deprecation (hds#390)', () => {
  it('reads @deprecated, @removeIn and @useInstead from the export block', () => {
    const source = `/**\n * @category Layout\n */\n\n/**\n * Row.\n * @deprecated Use Stack with wrap.\n * @removeIn 1.0.0\n * @useInstead Stack\n */\nexport const Cluster = () => null;\n`;
    expect(readComponentTags(source, 'Cluster').deprecation).toEqual({
      deprecated: 'Use Stack with wrap.',
      removeIn: '1.0.0',
      useInstead: 'Stack',
    });
  });

  it('falls back to the file block, and is null when neither block is deprecated', () => {
    const fileLevel = `/**\n * @category Layout\n * @deprecated The whole module goes.\n * @removeIn 1.0.0\n */\n\n/**\n * Row.\n */\nexport const Cluster = () => null;\n`;
    expect(readComponentTags(fileLevel, 'Cluster').deprecation).toEqual({
      deprecated: 'The whole module goes.',
      removeIn: '1.0.0',
    });
    const none = `/**\n * @category Layout\n */\n\n/**\n * Row.\n */\nexport const Cluster = () => null;\n`;
    expect(readComponentTags(none, 'Cluster').deprecation).toBeNull();
  });

  it('does not deprecate a component for a deprecated prop inside its props interface', () => {
    const source = `/**\n * @category Display\n */\n\nexport interface DividerProps {\n  /**\n   * @deprecated Use variant="strong".\n   */\n  strong?: boolean;\n}\n\n/**\n * Rule.\n */\nexport const Divider = () => null;\n`;
    expect(readComponentTags(source, 'Divider').deprecation).toBeNull();
  });
});

describe('discoverHdsComponents — deprecations (hds#390)', () => {
  it('finds no component deprecated once 0.21.0 removed StatusDot (hds#465)', () => {
    // Deprecated JSDoc on a type or prop (ActivityFeed's ActivityStatus) does
    // not deprecate a component, so the assertion scopes to components.
    // StatusDot was the last one: deprecated for Badge dot, removed in 0.21.0 (hds#465).
    const { components } = discoverHdsComponents();
    const deprecated = components
      .filter((c) => c.deprecation && c.filePath.startsWith('src/app/components/'))
      .map((c) => [c.name, c.deprecation.removeIn]);
    expect(deprecated).toEqual([]);
    const names = components.map((c) => c.name);
    for (const gone of [
      'CinematicLink',
      'ComponentInstanceMatrix',
      'FoundationSwatch',
      'Sketch',
      'Token',
    ])
      expect(names).not.toContain(gone);
  }, 60_000);
});

describe('discoverHdsComponents — Tooltip (hds#390)', () => {
  it('discovers the exported Tooltip as public', () => {
    const tooltip = discoverHdsComponents().components.find(
      (c) => c.name === 'Tooltip' && c.filePath === 'src/app/components/hds-tooltip.tsx',
    );
    expect(tooltip).toMatchObject({ hidden: false, category: 'Overlays', tagState: 'doc-exempt' });
  }, 60_000);
});

describe('readComponentTags — @screenPattern (hds#337)', () => {
  it('reads a bare @screenPattern tag on the export block', () => {
    const source = `/**\n * @category Layout\n * @tier pattern\n */\n\n/**\n * Header.\n * @screenPattern\n */\nexport const PageHeader = () => null;\n`;
    expect(readComponentTags(source, 'PageHeader').screenPattern).toBe(true);
  });

  it('is false when the tag is absent, and does not leak to a sibling export', () => {
    const source = `/**\n * @category Display\n */\n\n/**\n * Tile.\n */\nexport const MetricTile = () => null;\n\n/**\n * Row.\n * @screenPattern\n */\nexport const MetricTiles = () => null;\n`;
    expect(readComponentTags(source, 'MetricTile').screenPattern).toBe(false);
    expect(readComponentTags(source, 'MetricTiles').screenPattern).toBe(true);
  });
});

describe('discoverHdsComponents — screen patterns (hds#337)', () => {
  it('flags exactly the five screen-level compositions', () => {
    const tagged = discoverHdsComponents()
      .components.filter((c) => c.screenPattern)
      .map((c) => c.name)
      .sort();
    expect(tagged).toEqual([
      'DataTableSection',
      'DestructiveSection',
      'FormActions',
      'MetricTiles',
      'PageHeader',
    ]);
  }, 60_000);
});

describe('discoverHdsComponents — repository', () => {
  it('discovers every component that has a Code Connect template, so its @figma tag reaches the manifest', () => {
    const registry = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'figma', 'code-connect.json'), 'utf8'),
    );
    const discovered = new Set(
      discoverHdsComponents().components.map((c) => `${c.filePath}#${c.name}`),
    );
    const missing = Object.entries(registry.templates)
      .map(([name, entry]) => `${entry.source}#${entry.export ?? name}`)
      .filter((key) => !discovered.has(key));
    expect(missing).toEqual([]);
  }, 60_000);

  it('discovers a component exported through `export { X }`, not only `export const X`', () => {
    // The regression this pins: getExportedValueNames read function, class and
    // variable statements but not ExportDeclaration, so every compound
    // component built with Object.assign — which leaves the module as a plain
    // `const` and is exported at the bottom — was invisible to the manifest.
    // It had no tier, no category, no docs row and no Figma link, while
    // carrying @category and @tier in its JSDoc the whole time. Fixing it took
    // the manifest from 113 components to 132.
    const names = new Set(discoverHdsComponents().components.map((c) => c.name));
    expect(names).toContain('Popover'); // src/app/components/popover.tsx
    expect(names).toContain('Menu'); // src/app/components/menu.tsx
  }, 60_000);
});

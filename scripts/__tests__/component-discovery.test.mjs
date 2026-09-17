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
  'https://www.figma.com/design/c8MaVgwxOlxm4wr8wnH0Z4/HDS-Tokens-Components?node-id=1-2';

describe('readComponentTags', () => {
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
});

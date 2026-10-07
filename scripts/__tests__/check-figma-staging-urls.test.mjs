/** @internal — not part of @hirobius/design-system public API surface. */
/**
 * Tests for scripts/check-figma-staging-urls.mjs: a staging-file URL in
 * consumer-facing output is a WARN that names the component to re-point after
 * promotion, and an ERROR only in a Code Connect template (a publish would
 * ship the link).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scanStagingUrls } from '../check-figma-staging-urls.mjs';

const STAGING = 'STAGINGKEY000000000000';
const LIBRARY = 'LIBRARYKEY000000000000';
const url = (key, node) => `https://www.figma.com/design/${key}/HDS?node-id=${node}`;

const roots = [];
function fixture({ manifest = {}, links = '', templates = {}, registry = '{}' } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'staging-urls-'));
  roots.push(root);
  mkdirSync(path.join(root, 'figma'), { recursive: true });
  mkdirSync(path.join(root, 'public'), { recursive: true });
  mkdirSync(path.join(root, 'docs'), { recursive: true });
  mkdirSync(path.join(root, 'src/app/components'), { recursive: true });
  writeFileSync(
    path.join(root, 'figma/links.json'),
    JSON.stringify({ libraryFileKey: LIBRARY, stagingFileKey: STAGING }),
  );
  writeFileSync(path.join(root, 'figma/code-connect.json'), registry);
  writeFileSync(
    path.join(root, 'public/hds-manifest.json'),
    JSON.stringify({
      componentSpecs: Object.fromEntries(
        Object.entries(manifest).map(([name, figmaUrl]) => [name, { figmaUrl }]),
      ),
    }),
  );
  writeFileSync(path.join(root, 'docs/DESIGN_LINKS.md'), links);
  for (const [file, body] of Object.entries(templates)) {
    writeFileSync(path.join(root, 'src/app/components', file), body);
  }
  return root;
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

describe('scanStagingUrls', () => {
  it('is clean when every link points at the library', () => {
    const root = fixture({ manifest: { Badge: url(LIBRARY, '1-2') } });
    const r = scanStagingUrls({ root });
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.components).toEqual([]);
  });

  it('warns, naming the component, for a staging URL in the manifest', () => {
    const root = fixture({
      manifest: { Badge: url(LIBRARY, '1-2'), Kbd: url(STAGING, '2026-9') },
    });
    const r = scanStagingUrls({ root });
    expect(r.errors).toEqual([]);
    expect(r.components).toEqual(['Kbd']);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatchObject({ surface: 'manifest', component: 'Kbd' });
  });

  it('warns for a staging URL in DESIGN_LINKS.md, naming the row component', () => {
    const root = fixture({
      links: `| \`Kbd\` | [x](${url(STAGING, '2026-9')}) |\n| \`Badge\` | [y](${url(LIBRARY, '1-2')}) |\n`,
    });
    const r = scanStagingUrls({ root });
    expect(r.warnings.map((w) => `${w.surface}:${w.component}`)).toEqual(['design-links:Kbd']);
    expect(r.errors).toEqual([]);
  });

  it('errors for a staging URL in a Code Connect template', () => {
    const root = fixture({
      templates: { 'kbd.figma.ts': `figma.connect(Kbd, '${url(STAGING, '2026-9')}', {})` },
    });
    const r = scanStagingUrls({ root });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatchObject({ surface: 'code-connect', component: 'kbd' });
  });

  it('errors for a staging URL in the Code Connect registry', () => {
    const root = fixture({ registry: JSON.stringify({ x: url(STAGING, '1-1') }) });
    expect(scanStagingUrls({ root }).errors).toHaveLength(1);
  });

  it('does not mistake a library URL in a template for staging', () => {
    const root = fixture({
      templates: { 'badge.figma.ts': `figma.connect(Badge, '${url(LIBRARY, '31-15')}', {})` },
    });
    expect(scanStagingUrls({ root }).errors).toEqual([]);
  });

  it('lists each component once, sorted, across surfaces', () => {
    const root = fixture({
      manifest: { Text: url(STAGING, '1-1'), Kbd: url(STAGING, '2-2') },
      links: `| \`Kbd\` | ${url(STAGING, '2-2')} |\n`,
    });
    expect(scanStagingUrls({ root }).components).toEqual(['Kbd', 'Text']);
  });

  it('refuses to run without a stagingFileKey', () => {
    const root = fixture();
    writeFileSync(path.join(root, 'figma/links.json'), JSON.stringify({ stagingFileKey: null }));
    expect(() => scanStagingUrls({ root })).toThrow(/stagingFileKey/);
  });
});

describe('the real tree', () => {
  it('has no staging URL in a Code Connect template or registry', () => {
    const r = scanStagingUrls({});
    expect(r.errors).toEqual([]);
  });
});

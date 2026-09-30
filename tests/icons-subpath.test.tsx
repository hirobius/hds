/**
 * The ./icons subpath (hds#342): a curated Lucide re-export so a consumer can
 * get an `icon` for IconButton with nothing extra installed. The manifest
 * lists the names; build wiring must reference the entry in all places.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import * as icons from '../src/icons';
import { Ellipsis } from '../src/icons';
import { IconButton } from '../src/app/components/icon-button';

const ROOT = resolve(__dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8');
const exportNames = Object.keys(icons).sort();

describe('./icons subpath', () => {
  it('exports a curated set of at least 40 defined icon components', () => {
    expect(exportNames.length).toBeGreaterThanOrEqual(40);
    for (const name of exportNames) {
      const icon = icons[name as keyof typeof icons] as unknown as object;
      expect(typeof icon, name).toBe('object');
      expect(icon, name).toHaveProperty('$$typeof');
    }
  });

  it('exports the canonical names, not the legacy aliases', () => {
    for (const name of [
      'Ellipsis',
      'EllipsisVertical',
      'Trash2',
      'TriangleAlert',
      'House',
      'Funnel',
    ]) {
      expect(exportNames).toContain(name);
    }
    for (const legacy of ['MoreHorizontal', 'MoreVertical', 'AlertTriangle', 'Home', 'Filter']) {
      expect(exportNames).not.toContain(legacy);
    }
  });

  it('manifest iconSet.names equals the sorted export names', () => {
    const manifest = JSON.parse(read('public/hds-manifest.json'));
    expect(manifest.iconSet.subpath).toBe('@hirobius/design-system/icons');
    expect(manifest.iconSet.names).toEqual(exportNames);
  });

  it('is wired into package exports, the lib build and the d.ts build', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.exports['./icons']).toEqual({
      types: './dist/types/src/icons.d.ts',
      import: './dist/icons.js',
      default: './dist/icons.js',
    });
    expect(read('vite.config.lib.ts')).toContain('src/icons.ts');
    expect(JSON.parse(read('tsconfig.dts.json')).include).toContain('src/icons.ts');
    expect(read('scripts/smoke-consumer.mjs')).toContain("'./icons'");
  });

  it('IconButton renders an svg for an icon from the subpath', () => {
    const { container } = render(<IconButton icon={Ellipsis} label="Row actions" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('documents icon names that collide with HDS components', () => {
    const manifest = JSON.parse(read('public/hds-manifest.json'));
    const hds = new Set([
      ...(manifest.componentInventory ?? []),
      ...(manifest.patternInventory ?? []),
    ]);
    const collisions = exportNames.filter((n) => hds.has(n));
    expect(collisions).toEqual(expect.arrayContaining(['Calendar', 'Menu']));
    for (const file of ['public/llms.txt', 'docs/CONSUMING.md']) {
      const text = read(file);
      for (const name of collisions) {
        expect(text, `${file} ${name}`).toContain(`${name} as ${name}Icon`);
      }
    }
  });

  it('docs pin the same lucide-react version as package.json', () => {
    const pkg = JSON.parse(read('package.json'));
    const version = String(pkg.dependencies['lucide-react']).replace(/^[^\d]*/, '');
    for (const file of ['public/llms.txt', 'CONSUMING.md', 'docs/CONSUMING.md']) {
      expect(read(file), file).toContain(`lucide-react@${version}`);
    }
  });

  it('manifest does not list src/icons.ts as a component consumer', () => {
    const manifest = JSON.parse(read('public/hds-manifest.json'));
    expect(JSON.stringify(manifest)).not.toContain('"src/icons.ts"');
  });
});
